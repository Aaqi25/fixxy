-- ============================================================
-- FIXXY Module 1: Authentication Migration
-- 001_create_students.sql
-- Creates the students authentication table
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename)
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL DEFAULT 'Student',
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In case students table already existed from earlier schema without name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'name'
    ) THEN
        ALTER TABLE students ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'Student';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS students_email_lower_uidx
    ON students (lower(email));
