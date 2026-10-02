"""
PostgreSQL + pgvector Knowledge Repository for FIXXY RAG.
Includes an in-memory fallback for local environments without PostgreSQL.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import settings
from app.rag.chunker import DocumentChunk

_SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


@dataclass
class StoredChunk:
    doc_id: str
    chunk_index: int
    title: str
    content: str
    embedding: list[float]


class KnowledgeRepository:
    """Repository handling vector storage and similarity search via pgvector or in-memory fallback."""

    def __init__(self, db_url: str | None = None) -> None:
        self.db_url = db_url if db_url is not None else settings.database_url
        self._memory_chunks: list[StoredChunk] = []

    @property
    def is_postgres_configured(self) -> bool:
        return bool(self.db_url and ("postgres" in self.db_url or "postgresql" in self.db_url))

    async def init_db(self) -> bool:
        """Initialize pgvector extension and tables if PostgreSQL is available."""
        if not self.is_postgres_configured:
            return False

        try:
            import asyncpg
            conn = await asyncpg.connect(self.db_url)
            try:
                schema_sql = _SCHEMA_PATH.read_text(encoding="utf-8")
                # Split statements by semicolon
                statements = [s.strip() for s in schema_sql.split(";") if s.strip()]
                for stmt in statements:
                    await conn.execute(stmt)
                return True
            finally:
                await conn.close()
        except Exception:
            return False

    async def save_chunk(self, chunk: DocumentChunk, embedding: list[float]) -> None:
        """Upsert a document chunk and its embedding."""
        if self.is_postgres_configured:
            try:
                import asyncpg
                conn = await asyncpg.connect(self.db_url)
                try:
                    # Format vector as string '[0.1, 0.2, ...]' for asyncpg
                    vec_str = f"[{','.join(str(x) for x in embedding)}]"
                    query = """
                        INSERT INTO knowledge_chunks (doc_id, chunk_index, title, content, embedding)
                        VALUES ($1, $2, $3, $4, $5::vector)
                        ON CONFLICT (doc_id, chunk_index)
                        DO UPDATE SET
                            title = EXCLUDED.title,
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding;
                    """
                    await conn.execute(query, chunk.doc_id, chunk.chunk_index, chunk.title, chunk.content, vec_str)
                    return
                finally:
                    await conn.close()
            except Exception:
                pass

        # In-memory storage (fallback or test mode)
        for i, existing in enumerate(self._memory_chunks):
            if existing.doc_id == chunk.doc_id and existing.chunk_index == chunk.chunk_index:
                self._memory_chunks[i] = StoredChunk(
                    doc_id=chunk.doc_id,
                    chunk_index=chunk.chunk_index,
                    title=chunk.title,
                    content=chunk.content,
                    embedding=embedding,
                )
                return

        self._memory_chunks.append(
            StoredChunk(
                doc_id=chunk.doc_id,
                chunk_index=chunk.chunk_index,
                title=chunk.title,
                content=chunk.content,
                embedding=embedding,
            )
        )

    async def search_similar(
        self,
        query_embedding: list[float],
        top_k: int = 3,
        doc_id: str | None = None,
    ) -> list[tuple[str, float]]:
        """
        Find top_k most similar chunks using cosine similarity.
        Returns list of (content, similarity_score).
        """
        if self.is_postgres_configured:
            try:
                import asyncpg
                conn = await asyncpg.connect(self.db_url)
                try:
                    vec_str = f"[{','.join(str(x) for x in query_embedding)}]"
                    if doc_id:
                        query = """
                            SELECT content, 1 - (embedding <=> $1::vector) AS similarity
                            FROM knowledge_chunks
                            WHERE doc_id = $2
                            ORDER BY embedding <=> $1::vector
                            LIMIT $3;
                        """
                        rows = await conn.fetch(query, vec_str, doc_id, top_k)
                    else:
                        query = """
                            SELECT content, 1 - (embedding <=> $1::vector) AS similarity
                            FROM knowledge_chunks
                            ORDER BY embedding <=> $1::vector
                            LIMIT $2;
                        """
                        rows = await conn.fetch(query, vec_str, top_k)

                    return [(row["content"], float(row["similarity"])) for row in rows]
                finally:
                    await conn.close()
            except Exception:
                pass

        # In-memory cosine similarity fallback
        if not self._memory_chunks:
            return []

        candidates = (
            [c for c in self._memory_chunks if c.doc_id == doc_id]
            if doc_id
            else self._memory_chunks
        )

        def cosine_sim(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
            norm_b = math.sqrt(sum(x * x for x in b)) or 1.0
            return dot / (norm_a * norm_b)

        scored = [(c.content, cosine_sim(query_embedding, c.embedding)) for c in candidates]
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]

    async def count_chunks(self) -> int:
        """Return count of stored chunks."""
        if self.is_postgres_configured:
            try:
                import asyncpg
                conn = await asyncpg.connect(self.db_url)
                try:
                    val = await conn.fetchval("SELECT COUNT(*) FROM knowledge_chunks")
                    return int(val)
                finally:
                    await conn.close()
            except Exception:
                pass
        return len(self._memory_chunks)

    def clear_memory(self) -> None:
        """Clear memory cache (for tests)."""
        self._memory_chunks.clear()
