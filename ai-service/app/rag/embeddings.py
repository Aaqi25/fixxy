"""
Embedding Service for FIXXY RAG using Gemini Embeddings and test mocks.
"""

from __future__ import annotations

import hashlib
import math
from typing import Protocol
from google import genai
from google.genai import types

from app.config import settings

EMBEDDING_DIMENSION = 768


class EmbeddingService(Protocol):
    """Protocol defining the embedding generator interface."""

    async def embed_text(self, text: str) -> list[float]:
        """Generate an embedding vector for a single text."""
        ...

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a list of texts."""
        ...


class GeminiEmbeddingService:
    """Gemini embedding generator using the official google-genai SDK."""

    def __init__(self, client: genai.Client | None = None, model: str | None = None) -> None:
        self.model = model or settings.gemini_embedding_model
        self._client = client

    def _get_client(self) -> genai.Client:
        if self._client is not None:
            return self._client
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is required to generate real embeddings.")
        return genai.Client(api_key=settings.gemini_api_key)

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding vector for a text query using Gemini."""
        client = self._get_client()
        result = await client.aio.models.embed_content(
            model=self.model,
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSION,
            ),
        )
        if hasattr(result, "embedding") and hasattr(result.embedding, "values"):
            return list(result.embedding.values)
        if hasattr(result, "embeddings") and result.embeddings:
            return list(result.embeddings[0].values)
        raise ValueError("Unexpected embedding response format from Gemini API.")

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts sequentially or concurrently."""
        embeddings: list[list[float]] = []
        for text in texts:
            vec = await self.embed_text(text)
            embeddings.append(vec)
        return embeddings


class MockEmbeddingService:
    """
    Deterministic mock embedding generator for testing without external API calls.
    Generates normalized 768-dimensional pseudo-embeddings based on sha256 text hash.
    """

    def __init__(self, dimension: int = EMBEDDING_DIMENSION) -> None:
        self.dimension = dimension

    async def embed_text(self, text: str) -> list[float]:
        """Generate a deterministic pseudo-random normalized embedding."""
        clean = text.lower().strip()
        seed = int(hashlib.sha256(clean.encode("utf-8")).hexdigest()[:8], 16)

        vector: list[float] = []
        for i in range(self.dimension):
            # Deterministic pseudo-random sequence
            val = math.sin(seed + i * 0.1)
            vector.append(val)

        # L2-normalize vector
        norm = math.sqrt(sum(x * x for x in vector)) or 1.0
        return [round(x / norm, 6) for x in vector]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [await self.embed_text(t) for t in texts]


def get_embedding_service(mock: bool = False, client: genai.Client | None = None) -> EmbeddingService:
    """Return an embedding service instance (Mock or Gemini)."""
    if mock or not settings.gemini_api_key:
        return MockEmbeddingService()
    return GeminiEmbeddingService(client=client)
