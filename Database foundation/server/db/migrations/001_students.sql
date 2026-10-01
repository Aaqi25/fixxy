-- ============================================================
-- Migration 001: students and student_profiles
-- ============================================================
-- UUID generation strategy:
--   gen_random_uuid() is built-in from PostgreSQL 13+.
--   For PG 12 and older, enable pgcrypto and use gen_random_uuid()
--   from that extension, or use uuid_generate_v4() from uuid-ossp.
--   The application server may also generate UUIDs before INSERT.
-- ============================================================

-- Internal migration tracking (idempotent — safe to reference in all files)
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT        NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename)
);

-- ── students ──────────────────────────────────────────────────────────────────
CREATE TABLE students (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- Case-insensitive email uniqueness.
-- The Authentication module must also lower-case the email before INSERT/SELECT.
CREATE UNIQUE INDEX students_email_lower_uidx
    ON students (lower(email));

-- ── student_profiles ──────────────────────────────────────────────────────────
-- One-to-one with students: student_id IS the primary key.
CREATE TABLE student_profiles (
    student_id    UUID        NOT NULL,
    display_name  TEXT        NOT NULL,
    learning_goal TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT student_profiles_pkey    PRIMARY KEY (student_id),
    CONSTRAINT student_profiles_fk_student
        FOREIGN KEY (student_id) REFERENCES students (id)
        ON DELETE CASCADE
);
