"""
Legacy adapter for RAG engine.
"""

from __future__ import annotations

from app.schemas.rag import RAGRequest, RAGResponse, RAGChunk
from app.rag.service import get_rag_service


async def retrieve_context(request: RAGRequest) -> RAGResponse:
    """Retrieve context chunks for API endpoint."""
    service = get_rag_service()
    query_str = f"{request.concept} {request.misconception_id} {request.query}".strip()
    raw_chunks = await service.retrieve_context(query=query_str, top_k=request.top_k, doc_id=request.concept.lower())

    results = [
        RAGChunk(
            content=chunk,
            source=f"data/knowledge/ml/{request.concept}.md",
            score=1.0,
        )
        for chunk in raw_chunks
    ]
    return RAGResponse(chunks=results, total_found=len(results))
