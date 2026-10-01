-- ============================================================
-- FIXXY Module 3: Curriculum Migration
-- 006_create_concept_content.sql
-- Creates curated concept content (OVERVIEW, KEY_IDEA, EXAMPLE, ANALOGY, COMMON_MISTAKE, SUMMARY)
-- ============================================================

CREATE TABLE IF NOT EXISTS concept_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_concept_content_identity UNIQUE (concept_id, content_type, display_order)
);

CREATE INDEX IF NOT EXISTS idx_concept_content_concept_id ON concept_content(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_content_type ON concept_content(content_type);
CREATE INDEX IF NOT EXISTS idx_concept_content_display_order ON concept_content(display_order);
CREATE INDEX IF NOT EXISTS idx_concept_content_active ON concept_content(active);
