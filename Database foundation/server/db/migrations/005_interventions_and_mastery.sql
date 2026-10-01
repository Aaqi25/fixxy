-- ============================================================
-- Migration 005: interventions, student_mastery, explanation_outcomes
-- ============================================================

-- ── interventions ─────────────────────────────────────────────────────────────
-- Records exactly what was shown to a student after a wrong answer.
-- This row is immutable: even if a teaching plan is later edited, the
-- explanation_shown and hint_shown fields preserve the original text.
-- In Phase 2, source can be 'ai_generated' for LLM-produced explanations.
CREATE TABLE interventions (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id            UUID        NOT NULL,
    triggering_attempt_id UUID        NOT NULL,
    misconception_id      UUID,           -- NULL if misconception was unknown
    teaching_plan_id      UUID,           -- NULL if AI-generated or plan deleted
    strategy              TEXT        NOT NULL,
    -- Verbatim text displayed to the student (audit record).
    explanation_shown     TEXT        NOT NULL,
    hint_shown            TEXT        NOT NULL,
    -- 'curated' in Phase 1; 'ai_generated' after AI integration.
    source                TEXT        NOT NULL DEFAULT 'curated',
    shown_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT interventions_pkey   PRIMARY KEY (id),
    CONSTRAINT interventions_strategy_chk
        CHECK (strategy IN ('analogy', 'example', 'technical')),
    CONSTRAINT interventions_source_chk
        CHECK (source IN ('curated', 'ai_generated')),
    CONSTRAINT interventions_fk_session
        FOREIGN KEY (session_id) REFERENCES learning_sessions (id) ON DELETE CASCADE,
    CONSTRAINT interventions_fk_attempt
        FOREIGN KEY (triggering_attempt_id) REFERENCES attempts (id)
        ON DELETE RESTRICT,
    CONSTRAINT interventions_fk_misconception
        FOREIGN KEY (misconception_id) REFERENCES misconceptions (id)
        ON DELETE SET NULL,
    CONSTRAINT interventions_fk_teaching_plan
        FOREIGN KEY (teaching_plan_id) REFERENCES teaching_plans (id)
        ON DELETE SET NULL
);

CREATE INDEX interventions_session_idx ON interventions (session_id);
CREATE INDEX interventions_attempt_idx ON interventions (triggering_attempt_id);

-- ── student_mastery ───────────────────────────────────────────────────────────
-- One row per (student, concept) pair.
-- The Mastery Dashboard module (Module 7) owns the update formula.
-- evidence_count: number of scored attempts that influenced this score.
CREATE TABLE student_mastery (
    student_id     UUID        NOT NULL,
    concept_id     UUID        NOT NULL,
    score          INT         NOT NULL DEFAULT 0,
    evidence_count INT         NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT student_mastery_pkey PRIMARY KEY (student_id, concept_id),
    CONSTRAINT student_mastery_fk_student
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT student_mastery_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT,
    CONSTRAINT student_mastery_score_range
        CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT student_mastery_evidence_nonneg
        CHECK (evidence_count >= 0)
);

CREATE INDEX student_mastery_student_idx ON student_mastery (student_id);

-- ── explanation_outcomes ──────────────────────────────────────────────────────
-- One row per intervention, written once retry and transfer results are known.
-- Provides data to evaluate teaching strategy effectiveness over time.
CREATE TABLE explanation_outcomes (
    intervention_id   UUID        NOT NULL,
    retry_succeeded   BOOLEAN,           -- NULL until the retry attempt is made
    transfer_succeeded BOOLEAN,          -- NULL until the transfer attempt is made
    measured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT explanation_outcomes_pkey PRIMARY KEY (intervention_id),
    CONSTRAINT explanation_outcomes_fk_intervention
        FOREIGN KEY (intervention_id) REFERENCES interventions (id)
        ON DELETE CASCADE
);
