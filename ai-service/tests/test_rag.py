"""Unit tests for FIXXY RAG layer."""

import pytest
from pathlib import Path

from app.rag.chunker import chunk_markdown, load_markdown_file, load_and_chunk_all, DocumentChunk
from app.rag.embeddings import MockEmbeddingService, GeminiEmbeddingService, EMBEDDING_DIMENSION
from app.rag.repository import KnowledgeRepository
from app.rag.retriever import VectorRetriever
from app.rag.service import RAGService, retrieve_context


_KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "data" / "knowledge" / "ml"


class TestMarkdownChunking:
    """Test loading and deterministic chunking of markdown knowledge files."""

    def test_load_overfitting_markdown(self):
        file_path = _KNOWLEDGE_DIR / "overfitting.md"
        doc_id, title, raw = load_markdown_file(file_path)
        assert doc_id == "overfitting"
        assert "Overfitting" in title
        assert len(raw) > 500

    def test_chunk_markdown_deterministic(self):
        sample_markdown = """# Test Document

## Section One
This is the first section explaining a basic concept in machine learning.

## Section Two
This is the second section with detailed explanations and examples.
"""
        chunks = chunk_markdown("test_doc", sample_markdown, "Test Title", target_chunk_size=200)
        assert len(chunks) >= 2
        assert all(isinstance(c, DocumentChunk) for c in chunks)
        assert chunks[0].doc_id == "test_doc"
        assert "Section One" in chunks[0].content

    def test_load_and_chunk_all_documents(self):
        chunks = load_and_chunk_all(_KNOWLEDGE_DIR)
        assert len(chunks) >= 10
        doc_ids = {c.doc_id for c in chunks}
        assert "overfitting" in doc_ids
        assert "bias_variance" in doc_ids
        assert "train_validation_test" in doc_ids


class TestEmbeddingService:
    """Test embedding service interface and mock embedding generator."""

    @pytest.mark.asyncio
    async def test_mock_embedding_dimensions_and_normalization(self):
        service = MockEmbeddingService(dimension=EMBEDDING_DIMENSION)
        vec = await service.embed_text("What is overfitting?")
        assert len(vec) == EMBEDDING_DIMENSION
        # Check normalization (magnitude close to 1.0)
        magnitude = sum(x * x for x in vec)
        assert abs(magnitude - 1.0) < 0.01

    @pytest.mark.asyncio
    async def test_mock_embedding_is_deterministic(self):
        service = MockEmbeddingService()
        vec1 = await service.embed_text("generalization error")
        vec2 = await service.embed_text("generalization error")
        assert vec1 == vec2

    @pytest.mark.asyncio
    async def test_mock_embedding_batch(self):
        service = MockEmbeddingService()
        texts = ["Text A", "Text B", "Text C"]
        results = await service.embed_batch(texts)
        assert len(results) == 3
        assert len(results[0]) == EMBEDDING_DIMENSION


class TestVectorRetriever:
    """Test knowledge repository and vector retriever."""

    @pytest.mark.asyncio
    async def test_repository_save_and_search_in_memory(self):
        repo = KnowledgeRepository(db_url="")
        repo.clear_memory()
        embedder = MockEmbeddingService()

        chunk1 = DocumentChunk(
            doc_id="overfitting",
            chunk_index=0,
            title="Overview",
            content="Overfitting happens when training accuracy is high but validation error rises.",
        )
        vec1 = await embedder.embed_text(chunk1.content)
        await repo.save_chunk(chunk1, vec1)

        chunk2 = DocumentChunk(
            doc_id="bias_variance",
            chunk_index=0,
            title="Bias Variance",
            content="High bias causes underfitting and high variance causes overfitting.",
        )
        vec2 = await embedder.embed_text(chunk2.content)
        await repo.save_chunk(chunk2, vec2)

        retriever = VectorRetriever(repository=repo, embedding_service=embedder)
        results = await retriever.retrieve("How to detect overfitting?", top_k=2)

        assert len(results) == 2
        assert isinstance(results[0], str)

    @pytest.mark.asyncio
    async def test_high_level_retrieve_context(self):
        """Test the high-level retrieve_context(query, top_k=3) -> list[str] interface."""
        rag_service = RAGService(
            repository=KnowledgeRepository(db_url=""),
            embedding_service=MockEmbeddingService(),
        )
        await rag_service.seed_knowledge(_KNOWLEDGE_DIR)

        results = await rag_service.retrieve_context("validation loss early stopping", top_k=3)
        assert len(results) == 3
        assert any("validation" in r.lower() or "overfitting" in r.lower() for r in results)
