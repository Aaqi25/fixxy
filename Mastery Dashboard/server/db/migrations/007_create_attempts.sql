-- ============================================================
-- Migration 007: create_attempts.sql
-- Module 5: Answer Submission - Trusted Learning Evidence Layer
-- ============================================================

-- Ensure questions table exists
CREATE TABLE IF NOT EXISTS questions (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    concept_id UUID        NOT NULL,
    code       TEXT        NOT NULL,
    phase      TEXT        NOT NULL DEFAULT 'practice',
    prompt     TEXT        NOT NULL,
    difficulty INT         NOT NULL DEFAULT 1,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT questions_pkey         PRIMARY KEY (id),
    CONSTRAINT questions_code_uidx    UNIQUE (code),
    CONSTRAINT questions_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT
);

-- Ensure question_options table exists
CREATE TABLE IF NOT EXISTS question_options (
    id               UUID    NOT NULL DEFAULT gen_random_uuid(),
    question_id      UUID    NOT NULL,
    position         INT     NOT NULL,
    option_text      TEXT    NOT NULL,
    is_correct       BOOLEAN NOT NULL DEFAULT FALSE,
    misconception_id UUID,

    CONSTRAINT question_options_pkey PRIMARY KEY (id),
    CONSTRAINT question_options_pos_uidx UNIQUE (question_id, position),
    CONSTRAINT question_options_fk_question
        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);

-- Ensure learning_sessions table exists
CREATE TABLE IF NOT EXISTS learning_sessions (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    student_id   UUID        NOT NULL,
    concept_id   UUID        NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'practice',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT learning_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT learning_sessions_fk_student
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT learning_sessions_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT
);

-- Create or adapt attempts table
CREATE TABLE IF NOT EXISTS attempts (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    student_id         UUID        NOT NULL,
    question_id        UUID        NOT NULL,
    selected_option_id UUID        NOT NULL,
    session_id         UUID,
    is_correct         BOOLEAN     NOT NULL,
    attempt_number     INTEGER     NOT NULL DEFAULT 1,
    phase              TEXT        DEFAULT 'practice',
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT attempts_pkey PRIMARY KEY (id),
    CONSTRAINT fk_attempt_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_attempt_question
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attempt_option
        FOREIGN KEY (selected_option_id) REFERENCES question_options(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attempt_session
        FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL
);

-- Handle schema adaptation if table was created in an earlier partial migration
DO $$
BEGIN
    -- Add student_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attempts' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE attempts ADD COLUMN student_id UUID;
        
        -- If sessions exist, populate student_id from learning_sessions
        UPDATE attempts a
        SET student_id = s.student_id
        FROM learning_sessions s
        WHERE a.session_id = s.id AND a.student_id IS NULL;

        -- Clean up orphaned attempts if any
        DELETE FROM attempts WHERE student_id IS NULL;

        -- Apply NOT NULL and foreign key constraint
        ALTER TABLE attempts ALTER COLUMN student_id SET NOT NULL;
        ALTER TABLE attempts ADD CONSTRAINT fk_attempt_student 
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    -- Add attempt_number if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attempts' AND column_name = 'attempt_number'
    ) THEN
        ALTER TABLE attempts ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- Make session_id nullable if it was NOT NULL
    ALTER TABLE attempts ALTER COLUMN session_id DROP NOT NULL;

    -- Make phase optional if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attempts' AND column_name = 'phase'
    ) THEN
        ALTER TABLE attempts ALTER COLUMN phase DROP NOT NULL;
        ALTER TABLE attempts ALTER COLUMN phase SET DEFAULT 'practice';
    END IF;
END $$;

-- Indexes for optimal lookup and audit performance
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question_id ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_session_id ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted_at ON attempts(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_student_question ON attempts(student_id, question_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_student_session ON attempts(student_id, session_id);
