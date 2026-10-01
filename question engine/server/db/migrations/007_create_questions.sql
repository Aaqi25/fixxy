-- ============================================================
-- FIXXY Module 4: Question Engine Migration
-- 007_create_questions.sql
-- Creates or adapts questions, question_options, learning_sessions, and session_question_history
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    stage VARCHAR(30) NOT NULL DEFAULT 'PRACTICE',
    question_text TEXT NOT NULL DEFAULT '',
    difficulty VARCHAR(30) NOT NULL DEFAULT 'BEGINNER',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1,
    explanation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adapt existing questions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'question_text'
    ) THEN
        ALTER TABLE questions ADD COLUMN question_text TEXT NOT NULL DEFAULT '';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'questions' AND column_name = 'prompt'
        ) THEN
            UPDATE questions SET question_text = prompt WHERE question_text = '' AND prompt IS NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'slug'
    ) THEN
        ALTER TABLE questions ADD COLUMN slug VARCHAR(100);
        UPDATE questions SET slug = 'q-' || id::text WHERE slug IS NULL;
        ALTER TABLE questions ALTER COLUMN slug SET NOT NULL;
        BEGIN
            ALTER TABLE questions ADD CONSTRAINT questions_slug_key UNIQUE (slug);
        EXCEPTION WHEN duplicate_table OR duplicate_object THEN
            NULL;
        END;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'stage'
    ) THEN
        ALTER TABLE questions ADD COLUMN stage VARCHAR(30) NOT NULL DEFAULT 'PRACTICE';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'questions' AND column_name = 'phase'
        ) THEN
            UPDATE questions SET stage = UPPER(phase) WHERE phase IS NOT NULL;
        END IF;
    END IF;

    -- Drop legacy constraints if they exist
    EXECUTE 'ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_difficulty_chk';
    EXECUTE 'ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_phase_chk';

    -- Make legacy columns nullable if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'code') THEN
        ALTER TABLE questions ALTER COLUMN code DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'phase') THEN
        ALTER TABLE questions ALTER COLUMN phase DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'prompt') THEN
        ALTER TABLE questions ALTER COLUMN prompt DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'is_active') THEN
        ALTER TABLE questions ALTER COLUMN is_active DROP NOT NULL;
    END IF;

    -- If difficulty is not varchar/text, alter to varchar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'difficulty' AND data_type NOT IN ('character varying', 'varchar', 'text')
    ) THEN
        EXECUTE 'ALTER TABLE questions ALTER COLUMN difficulty TYPE VARCHAR(30) USING (
            CASE 
                WHEN difficulty::text = ''1'' OR difficulty::text ILIKE ''begin%'' THEN ''BEGINNER''
                WHEN difficulty::text = ''2'' OR difficulty::text ILIKE ''inter%'' THEN ''INTERMEDIATE''
                WHEN difficulty::text = ''3'' OR difficulty::text ILIKE ''adv%'' THEN ''ADVANCED''
                ELSE ''BEGINNER''
            END
        )';
        EXECUTE 'ALTER TABLE questions ALTER COLUMN difficulty SET DEFAULT ''BEGINNER''';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'active'
    ) THEN
        ALTER TABLE questions ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'questions' AND column_name = 'is_active'
        ) THEN
            UPDATE questions SET active = is_active;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE questions ADD COLUMN display_order INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'explanation'
    ) THEN
        ALTER TABLE questions ADD COLUMN explanation TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- 2. Question Options table
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    misconception_id UUID NULL REFERENCES misconceptions(id) ON DELETE SET NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adapt existing question_options table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_options' AND column_name = 'position'
    ) THEN
        ALTER TABLE question_options ALTER COLUMN position DROP NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_options' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE question_options ADD COLUMN display_order INTEGER NOT NULL DEFAULT 1;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'question_options' AND column_name = 'position'
        ) THEN
            UPDATE question_options SET display_order = position WHERE position IS NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_options' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE question_options ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_options' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE question_options ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- 3. Learning Sessions table
CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    current_stage VARCHAR(30) NOT NULL DEFAULT 'PRACTICE',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    current_question_id UUID NULL REFERENCES questions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adapt existing learning_sessions table
DO $$
BEGIN
    -- Drop legacy status check constraint
    EXECUTE 'ALTER TABLE learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_status_chk';

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'learning_sessions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE learning_sessions ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'learning_sessions' AND column_name = 'stage'
    ) THEN
        ALTER TABLE learning_sessions ALTER COLUMN stage SET DEFAULT 'PRACTICE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'learning_sessions' AND column_name = 'current_stage'
    ) THEN
        ALTER TABLE learning_sessions ADD COLUMN current_stage VARCHAR(30) NOT NULL DEFAULT 'PRACTICE';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'learning_sessions' AND column_name = 'stage'
        ) THEN
            UPDATE learning_sessions SET current_stage = UPPER(stage) WHERE stage IS NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'learning_sessions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE learning_sessions ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'learning_sessions' AND column_name = 'started_at'
        ) THEN
            UPDATE learning_sessions SET created_at = started_at WHERE started_at IS NOT NULL;
        END IF;
    END IF;
END $$;

-- 4. Session Question History
CREATE TABLE IF NOT EXISTS session_question_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL,
    served_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_session_question UNIQUE (session_id, question_id)
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_questions_concept_stage ON questions(concept_id, stage, active);
CREATE INDEX IF NOT EXISTS idx_questions_stage ON questions(stage);
CREATE INDEX IF NOT EXISTS idx_questions_slug ON questions(slug);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(active);
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_misconception_id ON question_options(misconception_id);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_concept ON learning_sessions(student_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_status ON learning_sessions(status);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_session_question_history_session ON session_question_history(session_id);
