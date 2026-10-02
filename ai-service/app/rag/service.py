"""
High-level RAG Service interface for FIXXY.
"""

from __future__ import annotations

from pathlib import Path
from functools import lru_cache

from app.rag.chunker import load_and_chunk_all
from app.rag.embeddings import get_embedding_service, EmbeddingService
from app.rag.repository import KnowledgeRepository
from app.rag.retriever import VectorRetriever

_DEFAULT_KNOWLEDGE_DIR = (
    Path(__file__).resolve().parent.parent.parent / "data" / "knowledge" / "ml"
)


class RAGService:
    """Manages knowledge ingestion, embedding generation, and vector retrieval."""

    def __init__(
        self,
        repository: KnowledgeRepository | None = None,
        embedding_service: EmbeddingService | None = None,
    ) -> None:
        self.repository = repository or KnowledgeRepository()
        self.embedding_service = embedding_service or get_embedding_service()
        self.retriever = VectorRetriever(
            repository=self.repository,
            embedding_service=self.embedding_service,
        )

    async def initialize(self) -> None:
        """Initialize database schema if PostgreSQL is available and seed initial knowledge."""
        await self.repository.init_db()
        # Seed knowledge documents if repository is empty
        count = await self.repository.count_chunks()
        if count == 0:
            await self.seed_knowledge()

    async def seed_knowledge(self, knowledge_dir: Path | str | None = None) -> int:
        """Parse, chunk, embed, and store all markdown knowledge files."""
        dir_path = Path(knowledge_dir) if knowledge_dir else _DEFAULT_KNOWLEDGE_DIR
        chunks = load_and_chunk_all(dir_path)
        if not chunks:
            return 0

        for chunk in chunks:
            vec = await self.embedding_service.embed_text(chunk.content)
            await self.repository.save_chunk(chunk, vec)

        return len(chunks)

    async def retrieve_context(self, query: str, top_k: int = 3, doc_id: str | None = None) -> list[str]:
        """
        Clean interface: retrieve top_k relevant markdown context chunks for a query.
        """
        # Ensure knowledge is seeded if memory is empty
        if await self.repository.count_chunks() == 0:
            await self.seed_knowledge()

        return await self.retriever.retrieve(query=query, top_k=top_k, doc_id=doc_id)


_global_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """Return a singleton instance of RAGService."""
    global _global_rag_service
    if _global_rag_service is None:
        _global_rag_service = RAGService()
    return _global_rag_service


async def retrieve_context(query: str, top_k: int = 3) -> list[str]:
    """
    Standard interface requested:
    retrieve_context(query: str, top_k: int = 3) -> list[str]
    """
    service = get_rag_service()
    return await service.retrieve_context(query=query, top_k=top_k)
