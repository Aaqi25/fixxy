-- ============================================================
-- Migration 009: create_student_mastery.sql
-- Module 7: Mastery Dashboard & Learning Evidence Persistence
-- ============================================================

-- Create student_mastery table if not exists
CREATE TABLE IF NOT EXISTS student_mastery (
    id                     UUID          NOT NULL DEFAULT gen_random_uuid(),
    student_id             UUID          NOT NULL,
    concept_id             UUID          NOT NULL,
    mastery_score          NUMERIC(5,2)  NOT NULL DEFAULT 0.00,
    mastery_level          VARCHAR(30)   NOT NULL DEFAULT 'NOT_STARTED',
    attempt_count          INTEGER       NOT NULL DEFAULT 0,
    correct_count          INTEGER       NOT NULL DEFAULT 0,
    retry_success_count    INTEGER       NOT NULL DEFAULT 0,
    transfer_success_count INTEGER       NOT NULL DEFAULT 0,
    last_activity_at       TIMESTAMPTZ,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT student_mastery_pkey PRIMARY KEY (id),
    CONSTRAINT fk_mastery_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_mastery_concept
        FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
    CONSTRAINT uq_student_concept_mastery
        UNIQUE (student_id, concept_id),
    CONSTRAINT chk_mastery_score
        CHECK (mastery_score >= 0 AND mastery_score <= 100)
);

-- Handle schema adaptation if student_mastery existed in earlier partial state
DO $$
BEGIN
    -- Ensure id column exists with default UUID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'id'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();
        ALTER TABLE student_mastery DROP CONSTRAINT IF EXISTS student_mastery_pkey;
        ALTER TABLE student_mastery ADD CONSTRAINT student_mastery_pkey PRIMARY KEY (id);
    END IF;

    -- Ensure mastery_score column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'mastery_score'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0.00;
        -- If old score column existed, copy values
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'score'
        ) THEN
            UPDATE student_mastery SET mastery_score = score WHERE mastery_score = 0;
        END IF;
    END IF;

    -- Ensure mastery_level column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'mastery_level'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN mastery_level VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED';
    END IF;

    -- Ensure attempt_count column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'attempt_count'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'evidence_count'
        ) THEN
            UPDATE student_mastery SET attempt_count = evidence_count WHERE attempt_count = 0;
        END IF;
    END IF;

    -- Ensure correct_count column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'correct_count'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Ensure retry_success_count column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'retry_success_count'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN retry_success_count INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Ensure transfer_success_count column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'transfer_success_count'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN transfer_success_count INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Ensure last_activity_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN last_activity_at TIMESTAMPTZ;
    END IF;

    -- Ensure created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_mastery' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE student_mastery ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- Ensure unique constraint on (student_id, concept_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_concept_mastery'
    ) THEN
        ALTER TABLE student_mastery ADD CONSTRAINT uq_student_concept_mastery UNIQUE (student_id, concept_id);
    END IF;

    -- Ensure check constraint on mastery_score
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_mastery_score'
    ) THEN
        ALTER TABLE student_mastery ADD CONSTRAINT chk_mastery_score CHECK (mastery_score >= 0 AND mastery_score <= 100);
    END IF;

    -- Make questions table slug column nullable if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'slug'
    ) THEN
        ALTER TABLE questions ALTER COLUMN slug DROP NOT NULL;
    END IF;

    -- Make questions table difficulty column compatible if text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'difficulty' AND data_type = 'character varying'
    ) THEN
        ALTER TABLE questions ALTER COLUMN difficulty DROP DEFAULT;
        ALTER TABLE questions ALTER COLUMN difficulty TYPE INT USING (CASE WHEN difficulty ~ '^[0-9]+$' THEN difficulty::INT ELSE 1 END);
        ALTER TABLE questions ALTER COLUMN difficulty SET DEFAULT 1;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_mastery_student_id ON student_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_concept_id ON student_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_student_concept ON student_mastery(student_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_updated_at ON student_mastery(updated_at DESC);
