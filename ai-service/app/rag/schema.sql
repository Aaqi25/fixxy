-- PostgreSQL + pgvector Schema for FIXXY Knowledge Base

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge chunks table for RAG storage
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id SERIAL PRIMARY KEY,
    doc_id VARCHAR(128) NOT NULL,
    chunk_index INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_doc_chunk UNIQUE (doc_id, chunk_index)
);

-- 3. HNSW index for fast vector cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw 
ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. B-tree index on doc_id for filtered retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_id 
ON knowledge_chunks (doc_id);
