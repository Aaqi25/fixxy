-- ============================================================
-- FIXXY Module 3: Curriculum Migration
-- 005_create_misconceptions.sql
-- Creates or adapts educator-defined misconceptions with stable codes
-- ============================================================

CREATE TABLE IF NOT EXISTS misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    guidance TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'misconceptions' AND column_name = 'guidance'
    ) THEN
        ALTER TABLE misconceptions ADD COLUMN guidance TEXT NOT NULL DEFAULT '';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'misconceptions' AND column_name = 'correct_concept'
        ) THEN
            ALTER TABLE misconceptions ALTER COLUMN correct_concept DROP NOT NULL;
            UPDATE misconceptions SET guidance = correct_concept WHERE guidance = '' AND correct_concept IS NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'misconceptions' AND column_name = 'active'
    ) THEN
        ALTER TABLE misconceptions ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'misconceptions_code_key'
    ) THEN
        BEGIN
            ALTER TABLE misconceptions ADD CONSTRAINT misconceptions_code_key UNIQUE (code);
        EXCEPTION WHEN duplicate_table OR duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_misconceptions_concept_id ON misconceptions(concept_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_code ON misconceptions(code);
CREATE INDEX IF NOT EXISTS idx_misconceptions_active ON misconceptions(active);
