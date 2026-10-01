-- ============================================================
-- FIXXY Module 2: Student Profile Migration
-- 002_create_student_profiles.sql
-- Creates or updates the student_profiles table with 1-to-1 relationship to students
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    learning_level VARCHAR(30) NOT NULL DEFAULT 'BEGINNER',
    learning_goal TEXT,
    preferred_learning_style VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    preferred_language VARCHAR(50) NOT NULL DEFAULT 'English',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_student_profile_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
);

-- Ensure all required columns exist even if table was created previously with a partial schema
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' AND column_name = 'id'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN id UUID DEFAULT gen_random_uuid();
        UPDATE student_profiles SET id = gen_random_uuid() WHERE id IS NULL;
        ALTER TABLE student_profiles ALTER COLUMN id SET NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN bio TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' AND column_name = 'learning_level'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN learning_level VARCHAR(30) NOT NULL DEFAULT 'BEGINNER';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' AND column_name = 'preferred_learning_style'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN preferred_learning_style VARCHAR(30) NOT NULL DEFAULT 'TEXT';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN preferred_language VARCHAR(50) NOT NULL DEFAULT 'English';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE student_profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id
    ON student_profiles(student_id);
