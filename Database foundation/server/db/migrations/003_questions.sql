-- ============================================================
-- Migration 003: questions and question_options
-- ============================================================

-- ── questions ─────────────────────────────────────────────────────────────────
-- The `code` column is a stable unique identifier used by seeds for idempotent
-- upserts (e.g. 'OVERFIT_Q1_PRACTICE').  Do NOT change codes once published.
-- phase values: 'practice', 'retry', 'transfer'
-- difficulty: integer 1–5
CREATE TABLE questions (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    concept_id UUID        NOT NULL,
    code       TEXT        NOT NULL,
    phase      TEXT        NOT NULL,
    prompt     TEXT        NOT NULL,
    difficulty INT         NOT NULL DEFAULT 1,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT questions_pkey         PRIMARY KEY (id),
    CONSTRAINT questions_code_uidx    UNIQUE (code),
    CONSTRAINT questions_phase_chk
        CHECK (phase IN ('practice', 'retry', 'transfer')),
    CONSTRAINT questions_difficulty_chk
        CHECK (difficulty BETWEEN 1 AND 5),
    CONSTRAINT questions_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT
);

-- Primary lookup: serve questions filtered by concept, phase, and active state.
CREATE INDEX questions_concept_phase_active_idx
    ON questions (concept_id, phase, is_active);

-- ── question_options ──────────────────────────────────────────────────────────
CREATE TABLE question_options (
    id               UUID    NOT NULL DEFAULT gen_random_uuid(),
    question_id      UUID    NOT NULL,
    position         INT     NOT NULL,
    option_text      TEXT    NOT NULL,
    is_correct       BOOLEAN NOT NULL DEFAULT FALSE,
    -- NULL = no diagnosis / unknown misconception. Correct options must be NULL.
    misconception_id UUID,

    CONSTRAINT question_options_pkey PRIMARY KEY (id),
    -- Options within a question must have unique positions.
    CONSTRAINT question_options_pos_uidx UNIQUE (question_id, position),
    CONSTRAINT question_options_fk_question
        FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
    CONSTRAINT question_options_fk_misconception
        FOREIGN KEY (misconception_id) REFERENCES misconceptions (id)
        ON DELETE SET NULL,
    -- A correct option cannot carry a misconception mapping.
    CONSTRAINT question_options_correct_no_misconception
        CHECK (NOT (is_correct = TRUE AND misconception_id IS NOT NULL))
);

-- At most one correct option per question (partial unique index).
-- The seed runner and Question Engine must also verify AT LEAST ONE exists.
CREATE UNIQUE INDEX question_options_one_correct_uidx
    ON question_options (question_id)
    WHERE is_correct = TRUE;

-- Fast lookup for scoring a submitted option.
CREATE INDEX question_options_question_idx ON question_options (question_id);
