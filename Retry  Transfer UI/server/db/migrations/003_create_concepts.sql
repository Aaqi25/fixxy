-- ============================================================
-- FIXXY Module 3: Curriculum Migration
-- 003_create_concepts.sql
-- Creates or adapts the concepts table for defining curriculum concepts
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    short_description TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    difficulty_level VARCHAR(30) NOT NULL DEFAULT 'BEGINNER',
    estimated_minutes INTEGER NOT NULL DEFAULT 15,
    learning_objective TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adapt existing table if it was created in a previous database foundation phase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'short_description'
    ) THEN
        ALTER TABLE concepts ADD COLUMN short_description TEXT NOT NULL DEFAULT '';
        -- Populate from summary if summary column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'concepts' AND column_name = 'summary'
        ) THEN
            ALTER TABLE concepts ALTER COLUMN summary DROP NOT NULL;
            UPDATE concepts SET short_description = summary WHERE short_description = '' AND summary IS NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'description'
    ) THEN
        ALTER TABLE concepts ADD COLUMN description TEXT NOT NULL DEFAULT '';
        UPDATE concepts SET description = short_description WHERE description = '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'difficulty_level'
    ) THEN
        ALTER TABLE concepts ADD COLUMN difficulty_level VARCHAR(30) NOT NULL DEFAULT 'BEGINNER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'estimated_minutes'
    ) THEN
        ALTER TABLE concepts ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 15;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'learning_objective'
    ) THEN
        ALTER TABLE concepts ADD COLUMN learning_objective TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'status'
    ) THEN
        ALTER TABLE concepts ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'concepts' AND column_name = 'is_active'
        ) THEN
            UPDATE concepts SET status = CASE WHEN is_active = false THEN 'ARCHIVED' ELSE 'ACTIVE' END;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'concepts' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE concepts ADD COLUMN display_order INTEGER NOT NULL DEFAULT 1;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'concepts' AND column_name = 'sort_order'
        ) THEN
            UPDATE concepts SET display_order = sort_order WHERE sort_order IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Ensure uniqueness and indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'concepts_slug_key'
    ) THEN
        BEGIN
            ALTER TABLE concepts ADD CONSTRAINT concepts_slug_key UNIQUE (slug);
        EXCEPTION WHEN duplicate_table OR duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_concepts_slug ON concepts(slug);
CREATE INDEX IF NOT EXISTS idx_concepts_display_order ON concepts(display_order);
CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
