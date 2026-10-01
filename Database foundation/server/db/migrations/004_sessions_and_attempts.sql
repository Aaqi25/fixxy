-- ============================================================
-- Migration 004: learning_sessions and attempts
-- ============================================================

-- ── learning_sessions ─────────────────────────────────────────────────────────
-- Records the student's current progress through the learning loop for a concept.
-- status values: 'practice', 'teaching', 'retry', 'transfer', 'reteaching', 'complete'
-- Module 8 (API Orchestration) enforces allowed status transitions; the DB stores state.
CREATE TABLE learning_sessions (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    student_id   UUID        NOT NULL,
    concept_id   UUID        NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'practice',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT learning_sessions_pkey   PRIMARY KEY (id),
    CONSTRAINT learning_sessions_status_chk
        CHECK (status IN ('practice','teaching','retry','transfer','reteaching','complete')),
    CONSTRAINT learning_sessions_fk_student
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT learning_sessions_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT
);

-- Common read: find active sessions for a student, or sessions by status.
CREATE INDEX learning_sessions_student_status_idx
    ON learning_sessions (student_id, status);

-- ── attempts ──────────────────────────────────────────────────────────────────
-- Each answer submission is an immutable attempt row.
-- is_correct is ALWAYS computed server-side by comparing selected_option_id
-- against question_options.is_correct — it must never be accepted from the client.
--
-- Composite foreign key rule (application-enforced):
--   The Answer Submission service (Module 5) MUST verify that
--   selected_option_id.question_id = question_id before inserting.
--   PostgreSQL does not support a composite FK across three columns where
--   one side is a derived value, so this is documented here as a service rule.
--   A partial CHECK can catch obvious mismatches at the DB level; see the
--   question_options FK below which at least ensures the option exists.
CREATE TABLE attempts (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id         UUID        NOT NULL,
    question_id        UUID        NOT NULL,
    selected_option_id UUID        NOT NULL,
    phase              TEXT        NOT NULL,
    -- Calculated by the server; never supplied by the client.
    is_correct         BOOLEAN     NOT NULL,
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT attempts_pkey     PRIMARY KEY (id),
    CONSTRAINT attempts_phase_chk
        CHECK (phase IN ('practice', 'retry', 'transfer')),
    CONSTRAINT attempts_fk_session
        FOREIGN KEY (session_id) REFERENCES learning_sessions (id) ON DELETE CASCADE,
    CONSTRAINT attempts_fk_question
        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE RESTRICT,
    CONSTRAINT attempts_fk_option
        FOREIGN KEY (selected_option_id) REFERENCES question_options (id)
        ON DELETE RESTRICT
    -- NOTE: The answer service MUST additionally verify that
    --   selected_option_id belongs to question_id before inserting.
);

-- Ordered attempt history within a session (also used for teaching plan lookup).
CREATE INDEX attempts_session_time_idx
    ON attempts (session_id, submitted_at DESC);

-- Useful for analytics: find all attempts on a specific question.
CREATE INDEX attempts_question_idx ON attempts (question_id);
