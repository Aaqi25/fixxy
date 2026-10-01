/**
 * src/db/types.ts
 *
 * Shared TypeScript row types that mirror the database schema.
 * These are plain data types — no ORM magic, just the shape of rows
 * as returned by the pg driver.
 *
 * Convention:
 *   - UUID columns are `string` in TypeScript.
 *   - timestamptz columns are `Date` (pg driver parses them automatically).
 *   - Nullable columns use `string | null`, `Date | null`, etc.
 */

// ─── Concepts ────────────────────────────────────────────────────────────────

export interface ConceptRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ConceptPrerequisiteRow {
  concept_id: string;
  prerequisite_id: string;
}

// ─── Misconceptions & Teaching Plans ─────────────────────────────────────────

export interface MisconceptionRow {
  id: string;
  concept_id: string;
  code: string;
  title: string;
  description: string;
  correct_concept: string;
  created_at: Date;
  updated_at: Date;
}

/** strategy values: 'analogy' | 'example' | 'technical' */
export type TeachingStrategy = 'analogy' | 'example' | 'technical';

export interface TeachingPlanRow {
  id: string;
  /** Null for concept-level fallback plans (misconception unknown). */
  misconception_id: string | null;
  /** Required for fallback plans: identifies which concept this covers. */
  concept_id: string;
  strategy: TeachingStrategy;
  explanation: string;
  hint: string;
  example_text: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Questions ────────────────────────────────────────────────────────────────

/** phase values: 'practice' | 'retry' | 'transfer' */
export type QuestionPhase = 'practice' | 'retry' | 'transfer';

export interface QuestionRow {
  id: string;
  concept_id: string;
  /** Stable unique code for idempotent seeds, e.g. 'OVERFIT_Q1'. */
  code: string;
  phase: QuestionPhase;
  prompt: string;
  /** Integer 1–5. */
  difficulty: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionOptionRow {
  id: string;
  question_id: string;
  position: number;
  option_text: string;
  is_correct: boolean;
  /** Null when the wrong answer's diagnosis is unknown, or for correct options. */
  misconception_id: string | null;
}

/**
 * Student-facing question DTO.
 * NEVER includes is_correct or misconception_id from question_options.
 */
export interface QuestionDto {
  id: string;
  conceptId: string;
  phase: QuestionPhase;
  prompt: string;
  difficulty: number;
  options: QuestionOptionDto[];
}

export interface QuestionOptionDto {
  id: string;
  position: number;
  optionText: string;
}

// ─── Students ─────────────────────────────────────────────────────────────────

export interface StudentRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudentProfileRow {
  student_id: string;
  display_name: string;
  learning_goal: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Sessions & Attempts ──────────────────────────────────────────────────────

export type SessionStatus =
  | 'practice'
  | 'teaching'
  | 'retry'
  | 'transfer'
  | 'reteaching'
  | 'complete';

export interface LearningSessionRow {
  id: string;
  student_id: string;
  concept_id: string;
  status: SessionStatus;
  started_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export type AttemptPhase = QuestionPhase;

export interface AttemptRow {
  id: string;
  session_id: string;
  question_id: string;
  selected_option_id: string;
  phase: AttemptPhase;
  /** Calculated by the server; never supplied by the client. */
  is_correct: boolean;
  submitted_at: Date;
}

// ─── Interventions ────────────────────────────────────────────────────────────

export type InterventionSource = 'curated' | 'ai_generated';

export interface InterventionRow {
  id: string;
  session_id: string;
  triggering_attempt_id: string;
  misconception_id: string | null;
  teaching_plan_id: string | null;
  strategy: TeachingStrategy;
  /** Exact text shown to the student — immutable audit record. */
  explanation_shown: string;
  hint_shown: string;
  source: InterventionSource;
  shown_at: Date;
}

// ─── Mastery ──────────────────────────────────────────────────────────────────

export interface StudentMasteryRow {
  student_id: string;
  concept_id: string;
  /** Integer 0–100. */
  score: number;
  evidence_count: number;
  updated_at: Date;
}

export interface ExplanationOutcomeRow {
  intervention_id: string;
  retry_succeeded: boolean | null;
  transfer_succeeded: boolean | null;
  measured_at: Date;
}

// ─── Schema migrations (internal) ─────────────────────────────────────────────

export interface SchemaMigrationRow {
  filename: string;
  applied_at: Date;
}
