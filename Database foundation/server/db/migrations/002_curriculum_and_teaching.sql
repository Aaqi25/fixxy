-- ============================================================
-- Migration 002: curriculum and teaching content
--   concepts, concept_prerequisites, misconceptions, teaching_plans
-- ============================================================

-- ── concepts ──────────────────────────────────────────────────────────────────
CREATE TABLE concepts (
    id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    slug       TEXT        NOT NULL,
    title      TEXT        NOT NULL,
    summary    TEXT        NOT NULL,
    sort_order INT         NOT NULL DEFAULT 0,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT concepts_pkey     PRIMARY KEY (id),
    CONSTRAINT concepts_slug_uidx UNIQUE (slug)
);

CREATE INDEX concepts_sort_idx ON concepts (sort_order);

-- ── concept_prerequisites ──────────────────────────────────────────────────────
CREATE TABLE concept_prerequisites (
    concept_id      UUID NOT NULL,
    prerequisite_id UUID NOT NULL,

    CONSTRAINT concept_prerequisites_pkey
        PRIMARY KEY (concept_id, prerequisite_id),
    CONSTRAINT concept_prerequisites_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE CASCADE,
    CONSTRAINT concept_prerequisites_fk_prereq
        FOREIGN KEY (prerequisite_id) REFERENCES concepts (id) ON DELETE CASCADE,
    -- A concept cannot be its own prerequisite.
    CONSTRAINT concept_prerequisites_no_self_ref
        CHECK (concept_id <> prerequisite_id)
);

-- ── misconceptions ─────────────────────────────────────────────────────────────
CREATE TABLE misconceptions (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    concept_id      UUID        NOT NULL,
    -- Stable human-readable code used in seeds and content references, e.g. OVERFIT_M1
    code            TEXT        NOT NULL,
    title           TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    -- Short statement of the correct understanding the student should reach.
    correct_concept TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT misconceptions_pkey     PRIMARY KEY (id),
    CONSTRAINT misconceptions_code_uidx UNIQUE (code),
    CONSTRAINT misconceptions_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT
);

CREATE INDEX misconceptions_concept_idx ON misconceptions (concept_id);

-- ── teaching_plans ─────────────────────────────────────────────────────────────
-- Stores educator-written explanations keyed to a misconception.
--
-- Fallback plans (for unknown/undiagnosed misconceptions) have:
--   misconception_id = NULL
--   concept_id       = the concept being taught  ← required even for fallbacks
--
-- This design avoids a silent mismatch: a plan always belongs to a known concept,
-- and when misconception_id is set the concept_id must match that misconception's
-- concept_id (enforced by the trigger below).
--
-- Strategy values: 'analogy', 'example', 'technical'
CREATE TABLE teaching_plans (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    misconception_id UUID,                      -- NULL = concept-level fallback
    concept_id       UUID        NOT NULL,      -- always set; required for fallbacks
    strategy         TEXT        NOT NULL,
    explanation      TEXT        NOT NULL,
    hint             TEXT        NOT NULL,
    example_text     TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT teaching_plans_pkey          PRIMARY KEY (id),
    CONSTRAINT teaching_plans_strategy_chk
        CHECK (strategy IN ('analogy', 'example', 'technical')),
    CONSTRAINT teaching_plans_fk_concept
        FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE RESTRICT,
    CONSTRAINT teaching_plans_fk_misconception
        FOREIGN KEY (misconception_id) REFERENCES misconceptions (id) ON DELETE RESTRICT
);

-- Prevent a teaching plan from silently referencing a misconception that belongs
-- to a different concept.  A function-based trigger is the clearest way to express
-- this cross-table rule in pure SQL without application code.
CREATE OR REPLACE FUNCTION check_teaching_plan_concept_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.misconception_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM misconceptions
            WHERE id = NEW.misconception_id AND concept_id = NEW.concept_id
        ) THEN
            RAISE EXCEPTION
                'teaching_plans.concept_id (%) does not match '
                'the concept of misconception % ',
                NEW.concept_id, NEW.misconception_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER teaching_plans_concept_match_trg
    BEFORE INSERT OR UPDATE ON teaching_plans
    FOR EACH ROW EXECUTE FUNCTION check_teaching_plan_concept_match();

CREATE INDEX teaching_plans_misconception_idx ON teaching_plans (misconception_id);
CREATE INDEX teaching_plans_concept_idx       ON teaching_plans (concept_id);
