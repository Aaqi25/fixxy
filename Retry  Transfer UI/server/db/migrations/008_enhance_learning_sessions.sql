-- ============================================================
-- Migration 008: enhance_learning_sessions.sql
-- Module 6: Retry / Transfer UI & Learning State Management
-- ============================================================

DO $$
BEGIN
    -- Add stage column to learning_sessions if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'learning_sessions' AND column_name = 'stage'
    ) THEN
        ALTER TABLE learning_sessions ADD COLUMN stage TEXT NOT NULL DEFAULT 'practice';
    END IF;

    -- Add current_question_id column to learning_sessions if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'learning_sessions' AND column_name = 'current_question_id'
    ) THEN
        ALTER TABLE learning_sessions ADD COLUMN current_question_id UUID REFERENCES questions(id) ON DELETE SET NULL;
    END IF;

    -- Add metadata JSONB column for teaching details and strategy state
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'learning_sessions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE learning_sessions ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_student_concept ON learning_sessions(student_id, concept_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_stage ON learning_sessions(stage);
