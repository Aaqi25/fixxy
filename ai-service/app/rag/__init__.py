"""FIXXY RAG module."""

from app.rag.chunker import DocumentChunk, chunk_markdown, load_markdown_file, load_and_chunk_all
from app.rag.embeddings import EmbeddingService, GeminiEmbeddingService, MockEmbeddingService, get_embedding_service
from app.rag.repository import KnowledgeRepository
from app.rag.retriever import VectorRetriever
from app.rag.service import RAGService, get_rag_service, retrieve_context

__all__ = [
    "DocumentChunk",
    "chunk_markdown",
    "load_markdown_file",
    "load_and_chunk_all",
    "EmbeddingService",
    "GeminiEmbeddingService",
    "MockEmbeddingService",
    "get_embedding_service",
    "KnowledgeRepository",
    "VectorRetriever",
    "RAGService",
    "get_rag_service",
    "retrieve_context",
]
