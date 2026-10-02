"""
Vector Retriever for semantic search over knowledge chunks.
"""

from __future__ import annotations

from app.rag.embeddings import EmbeddingService, get_embedding_service
from app.rag.repository import KnowledgeRepository


class VectorRetriever:
    """Combines embedding generation with knowledge repository similarity search."""

    def __init__(
        self,
        repository: KnowledgeRepository | None = None,
        embedding_service: EmbeddingService | None = None,
    ) -> None:
        self.repository = repository or KnowledgeRepository()
        self.embedding_service = embedding_service or get_embedding_service()

    async def retrieve(
        self,
        query: str,
        top_k: int = 3,
        doc_id: str | None = None,
    ) -> list[str]:
        """
        Embed the input query and retrieve top_k most relevant text chunks.
        """
        if not query or not query.strip():
            return []

        query_vec = await self.embedding_service.embed_text(query)
        results = await self.repository.search_similar(
            query_embedding=query_vec,
            top_k=top_k,
            doc_id=doc_id,
        )
        return [content for content, _ in results]
