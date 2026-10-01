-- ============================================================
-- FIXXY Module 3: Curriculum Migration
-- 004_create_concept_prerequisites.sql
-- Creates or adapts concept_prerequisites table linking dependent concepts
-- ============================================================

CREATE TABLE IF NOT EXISTS concept_prerequisites (
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    prerequisite_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (concept_id, prerequisite_concept_id),
    CONSTRAINT chk_no_self_prerequisite CHECK (concept_id <> prerequisite_concept_id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concept_prerequisites' AND column_name = 'prerequisite_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concept_prerequisites' AND column_name = 'prerequisite_concept_id'
    ) THEN
        ALTER TABLE concept_prerequisites RENAME COLUMN prerequisite_id TO prerequisite_concept_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concept_prerequisites' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE concept_prerequisites ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_prerequisite'
    ) THEN
        ALTER TABLE concept_prerequisites ADD CONSTRAINT chk_no_self_prerequisite CHECK (concept_id <> prerequisite_concept_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prereq_concept_id ON concept_prerequisites(concept_id);
CREATE INDEX IF NOT EXISTS idx_prereq_prerequisite_id ON concept_prerequisites(prerequisite_concept_id);
