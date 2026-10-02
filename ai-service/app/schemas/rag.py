"""Pydantic models for RAG (Retrieval-Augmented Generation)."""

from pydantic import BaseModel, Field


class RAGRequest(BaseModel):
    """Request to retrieve relevant knowledge chunks."""

    concept: str = Field(..., description="ML concept to search for.")
    misconception_id: str = Field(
        default="",
        description="Optional misconception ID to refine search.",
    )
    query: str = Field(
        default="",
        description="Optional free-text query. If empty, concept + misconception are used.",
    )
    top_k: int = Field(default=3, ge=1, le=10, description="Number of chunks to return.")


class RAGChunk(BaseModel):
    """A single retrieved knowledge chunk."""

    content: str = Field(..., description="Text content of the chunk.")
    source: str = Field(..., description="Source identifier (filename, section).")
    score: float = Field(default=0.0, description="Similarity score.")


class RAGResponse(BaseModel):
    """Response from RAG retrieval."""

    chunks: list[RAGChunk] = Field(default_factory=list)
    total_found: int = Field(default=0)
