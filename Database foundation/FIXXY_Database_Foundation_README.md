# FIXXY — Database Foundation (Module 9)

> **Implementation status:** Complete. All files listed in this README exist and the TypeScript build passes. Live PostgreSQL verification requires a developer to create `server/.env` with real credentials and run the commands in §8.

---

## 1. Project overview

FIXXY ("Let's fix together!") is a personalized AI/ML tutor. Its learning loop is:

**Question → Mistake → Misconception guidance → Teaching → Retry → Transfer → Mastery update.**

The initial curriculum covers **Overfitting**, **Bias vs Variance**, and **Train / Validation / Test**. A wrong answer can reveal a specific misconception. FIXXY responds with a prepared explanation and checks understanding with retry and transfer questions before updating mastery.

The project builds in two phases:

1. **Phase 1 — Nine application modules:** Authentication, Student Profile, Curriculum, Question Engine, Answer Submission, Retry / Transfer UI, Mastery Dashboard, API Orchestration, and Database. This module is Phase 1 foundation.
2. **Phase 2 — AI integration:** FastAPI service, LLM-based diagnosis and explanation, retrieval, embeddings. AI does not block Module 9.

Stack: React + TypeScript + Tailwind CSS (frontend, later phases), Node.js + Express + TypeScript (backend), PostgreSQL (data).

---

## 2. Purpose and boundaries of Module 9

Module 9 provides:

- A PostgreSQL schema (13 tables + migration tracker) via versioned `.sql` migration files.
- A repeatable seed for the full Overfitting learning scenario.
- A TypeScript migration runner with advisory locking, per-migration transactions, and idempotent reruns.
- A shared connection pool, transaction helper, and health check.
- Typed repository functions for concepts and questions (the minimum needed to verify seeded data).
- A `db:check` script that verifies connectivity, tables, correct-option invariant, and DTO safety.
- An integration verification script (`db:verify`) exercising all acceptance-criteria constraints.

**Out of scope for Phase 1:** FastAPI, LLM calls, RAG, embeddings, pgvector, frontend pages, authentication routes, mastery business logic.

---

## 3. Architecture

```text
React UI
   │ HTTPS / JSON
   ▼
Express routes → application services → repositories → PostgreSQL pool → PostgreSQL
                                             ▲
                                     migrations and seeds
```

- **Routes** validate HTTP requests (later modules).
- **Services** implement rules: answer scoring, session progression, mastery calculation.
- **Repositories** contain parameterized SQL and return typed records.
- **Pool** manages server-side connections (`src/db/pool.ts`).
- **Migrations** evolve the schema; `schema_migrations` tracks applied files.
- **Seeds** insert educator-reviewed curriculum content.

React never connects to the database directly. The server checks answers and session state; the browser never receives correct-answer flags before submission.

---

## 4. File layout (actual, as implemented)

```
server/
├── db/
│   ├── migrations/
│   │   ├── 001_students.sql               students + student_profiles
│   │   ├── 002_curriculum_and_teaching.sql concepts, prerequisites, misconceptions, teaching_plans
│   │   ├── 003_questions.sql              questions + question_options
│   │   ├── 004_sessions_and_attempts.sql  learning_sessions + attempts
│   │   └── 005_interventions_and_mastery.sql interventions, student_mastery, explanation_outcomes
│   └── seeds/
│       ├── 001_mvp_concepts.sql           Three MVP concepts (upsert on slug)
│       └── 002_overfitting_demo.sql       Complete Overfitting scenario (PL/pgSQL DO block)
├── scripts/
│   ├── migrate.ts      Advisory-locked migration runner
│   ├── seed.ts         Repeatable seed runner + correct-option verifier
│   ├── check-db.ts     Connectivity, table, DTO safety checks
│   └── verify.ts       Integration constraint tests (all acceptance criteria)
├── src/
│   ├── config/
│   │   └── env.ts      Validates DATABASE_URL at startup
│   └── db/
│       ├── pool.ts     Singleton Pool, withClient helper, closePool
│       ├── transaction.ts  withTransaction(fn) BEGIN/COMMIT/ROLLBACK wrapper
│       ├── health.ts   checkDbHealth() — never throws, returns structured result
│       ├── types.ts    All TypeScript row types + QuestionDto (no answer key)
│       └── repositories/
│           ├── concept.repository.ts   findAllActiveConcepts, findBySlug, findById
│           └── question.repository.ts  findQuestionsWithAnswerKey, findOptionById,
│                                       findQuestionDtoByCode, findQuestionDtosByConceptAndPhase,
│                                       verifyCorrectOptionCounts
├── .env.example        Placeholder credentials (never real secrets)
├── .gitignore          Excludes .env, node_modules, dist
├── package.json        Scripts: build, db:migrate, db:seed, db:check, db:verify, dev
└── tsconfig.json       ES2020, strict, commonjs
```

Repositories for student, session, attempt, intervention, and mastery are **not** created as empty placeholders — they will be added by their respective application modules.

---

## 5. Schema design

### UUID generation

All UUID primary keys use `gen_random_uuid()` (built-in from **PostgreSQL 13+**). PostgreSQL 18 (installed) fully supports this. The application server may also generate UUIDs before `INSERT` — the default is a convenience.

### Tables

| Table | Primary key | Key rules |
|---|---|---|
| `schema_migrations` | `filename` | Internal; unique filename + applied timestamp |
| `students` | `id UUID` | `UNIQUE INDEX ON lower(email)` for case-insensitive uniqueness |
| `student_profiles` | `student_id UUID` | One-to-one FK to `students`; `CASCADE DELETE` |
| `concepts` | `id UUID` | `UNIQUE(slug)`; sorted by `sort_order` |
| `concept_prerequisites` | `(concept_id, prerequisite_id)` | Self-ref check: `concept_id <> prerequisite_id` |
| `misconceptions` | `id UUID` | `UNIQUE(code)` for stable content references |
| `teaching_plans` | `id UUID` | `strategy IN ('analogy','example','technical')`; trigger ensures concept/misconception match |
| `questions` | `id UUID` | `UNIQUE(code)`; `phase IN ('practice','retry','transfer')`; `difficulty BETWEEN 1 AND 5` |
| `question_options` | `id UUID` | `UNIQUE(question_id, position)`; partial `UNIQUE INDEX` on `(question_id) WHERE is_correct=TRUE`; `CHECK(NOT(is_correct AND misconception_id IS NOT NULL))` |
| `learning_sessions` | `id UUID` | `status IN ('practice','teaching','retry','transfer','reteaching','complete')` |
| `attempts` | `id UUID` | `is_correct` is server-computed; service must verify option belongs to question |
| `interventions` | `id UUID` | `explanation_shown` / `hint_shown` are immutable audit records |
| `student_mastery` | `(student_id, concept_id)` | `score BETWEEN 0 AND 100`; `evidence_count >= 0` |
| `explanation_outcomes` | `intervention_id` | One row per intervention |

### Key integrity decisions

**At-most-one correct option per question** is enforced by a partial unique index:
```sql
CREATE UNIQUE INDEX question_options_one_correct_uidx
    ON question_options (question_id) WHERE is_correct = TRUE;
```
**At-least-one** is not enforceable by an index and is checked by `verifyCorrectOptionCounts()` in the seed runner and `db:check`.

**Teaching plan concept/misconception match** is enforced by a `BEFORE INSERT OR UPDATE` trigger (`check_teaching_plan_concept_match`) so a plan cannot silently reference a misconception from a different concept.

**Fallback teaching plans** (misconception unknown) have `misconception_id = NULL` and a required `concept_id`. The Answer Submission service selects a plan by `misconception_id` first and falls back to `WHERE misconception_id IS NULL AND concept_id = $concept_id`.

**Answer option/question mismatch** — PostgreSQL cannot express a composite FK where one column is derived. The Answer Submission service (Module 5) **must** verify that `selected_option_id.question_id = question_id` before inserting into `attempts`. This rule is documented in the migration SQL comment.

**Historical attempts** are preserved: `questions` uses `ON DELETE RESTRICT` so active curriculum rows with attempt history cannot be accidentally dropped. Retire content by setting `is_active = FALSE`.

### Indexes

| Index | Purpose |
|---|---|
| `students_email_lower_uidx` | Case-insensitive email uniqueness |
| `concepts_sort_idx` | Ordered concept listing |
| `misconceptions_concept_idx` | Misconceptions by concept |
| `teaching_plans_misconception_idx` | Plan lookup by misconception |
| `teaching_plans_concept_idx` | Fallback plan lookup by concept |
| `questions_concept_phase_active_idx` | Primary question-serve query |
| `question_options_one_correct_uidx` | At-most-one correct option |
| `question_options_question_idx` | Score submitted answer |
| `learning_sessions_student_status_idx` | Active sessions by student |
| `attempts_session_time_idx` | Ordered attempt history |
| `attempts_question_idx` | Analytics / question history |
| `interventions_session_idx` | Interventions by session |
| `interventions_attempt_idx` | Intervention by triggering attempt |
| `student_mastery_student_idx` | Mastery by student |

---

## 6. Seed content

### Seed 001 — MVP concepts (`001_mvp_concepts.sql`)
Upserts three concepts on stable slug:
- `overfitting` (sort_order 1)
- `bias-vs-variance` (sort_order 2)
- `train-validation-test` (sort_order 3)

### Seed 002 — Overfitting demo (`002_overfitting_demo.sql`)
A PL/pgSQL `DO $$` block that resolves IDs by stable slug/code and upserts all rows:

| Item | Code / Slug | Notes |
|---|---|---|
| Misconception | `OVERFIT_M1` | "High training accuracy guarantees generalization" |
| Teaching plan | analogy | Student memorizing exam answers |
| Teaching plan | example | 100% train / 58% test decision tree with fix |
| Fallback plan | — (`misconception_id IS NULL`) | For unknown misconceptions |
| Practice Q | `OVERFIT_Q1` | 99.5% train / 61% test neural network; wrong opt 2 → `OVERFIT_M1` |
| Retry Q | `OVERFIT_Q2` | 100% train / 55% validation decision tree |
| Transfer Q | `OVERFIT_Q3` | 97% train / 54% production sentiment classifier (domain shift) |

Each question has exactly 4 options, one correct, three wrong. Two wrong options per question map to `OVERFIT_M1`; the other two have no mapped misconception.

**Educational accuracy note:** In every question the correct answer explains that a large gap between training and test/production accuracy is the hallmark of overfitting — the model has memorized the training set rather than learning generalizable patterns.

---

## 7. Migration runner

`scripts/migrate.ts` provides:

1. **Advisory lock** — `pg_try_advisory_lock(7654321)` prevents concurrent runs.
2. **Per-migration transactions** — each `filename.sql` + `INSERT INTO schema_migrations` runs in `BEGIN/COMMIT`. Failure triggers `ROLLBACK`; the file is NOT recorded as applied.
3. **Idempotent reruns** — already-applied filenames are skipped; a second run with no pending migrations prints "Nothing to do".
4. **Ordered application** — files are sorted lexicographically (zero-padded names = numeric order).
5. **`schema_migrations` bootstrap** — created with `CREATE TABLE IF NOT EXISTS` before the advisory lock query, so it exists on a completely fresh database.

> **Rule:** Never modify an already-applied migration. Add a new numbered file for schema changes.

---

## 8. Local setup

### Prerequisites

- PostgreSQL 13+ (PostgreSQL 18 detected on this machine at `C:\Program Files\PostgreSQL\18\bin\`)
- Node.js ≥ 18
- The `server/` directory in this repository

### Step 1 — Create the database and user

Open **pgAdmin** or a `psql` shell as the `postgres` superuser:

```sql
CREATE USER fixxy_user WITH PASSWORD 'choose_a_strong_password';
CREATE DATABASE fixxy_dev OWNER fixxy_user;
```

For a separate test database used by `db:verify`:
```sql
CREATE DATABASE fixxy_test OWNER fixxy_user;
```

### Step 2 — Create `server/.env`

```dotenv
DATABASE_URL=postgresql://fixxy_user:your_password@localhost:5432/fixxy_dev
DB_POOL_MAX=10
NODE_ENV=development
```

Never commit `.env`. It is listed in `.gitignore`.

### Step 3 — Install and run

**Windows PowerShell:**
```powershell
cd "C:\Users\akash\OneDrive\Desktop\Database foundation\server"
npm install
$env:DATABASE_URL = "postgresql://fixxy_user:your_password@localhost:5432/fixxy_dev"
npm run db:migrate
npm run db:seed
npm run db:check
npm run db:verify   # integration constraint tests
```

**Unix / macOS shell:**
```bash
cd /path/to/server
npm install
export DATABASE_URL="postgresql://fixxy_user:your_password@localhost:5432/fixxy_dev"
npm run db:migrate
npm run db:seed
npm run db:check
npm run db:verify
```

### What each script does

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` (exit 0 = no type errors) |
| `npm run db:migrate` | Apply unapplied migrations; safe to rerun |
| `npm run db:seed` | Upsert curriculum content + verify correct-option counts |
| `npm run db:check` | Verify connectivity, all 14 tables, migrations, DTO safety |
| `npm run db:verify` | Run 7 integration constraint tests |

### Expected second-run output

```
[db:migrate] Starting …
  Nothing to do — all migrations already applied.
[db:migrate] Done.

[db:seed] Starting …
  ✓ Done: 001_mvp_concepts.sql
  ✓ Done: 002_overfitting_demo.sql
  ✓ All active questions have exactly one correct option.
[db:seed] Done.
```

---

## 9. `db:check` failure modes

| Cause | Error message |
|---|---|
| `DATABASE_URL` not set | `Missing required environment variable: DATABASE_URL` |
| Wrong host / port | `Database unreachable: connect ECONNREFUSED …` |
| Wrong credentials | `Database unreachable: password authentication failed …` |
| Migrations not run | `Missing tables: concepts, questions … Run: npm run db:migrate` |
| Seeds not run | `⚠  Overfitting concept not found — run db:seed first` |
| DTO leaks answer key | `Student-facing QuestionDto leaks answer key fields!` |

---

## 10. Repository API (Module 9 scope)

### `concept.repository.ts`

```typescript
findAllActiveConcepts(client?)      → Promise<ConceptRow[]>
findConceptBySlug(slug, client?)    → Promise<ConceptRow | null>
findConceptById(id, client?)        → Promise<ConceptRow | null>
```

### `question.repository.ts`

```typescript
// Internal (server-side, includes is_correct + misconception_id)
findQuestionsWithAnswerKey(conceptId, phase, client?)
  → Promise<Array<{ question: QuestionRow; options: QuestionOptionRow[] }>>
findOptionById(optionId, client?)
  → Promise<QuestionOptionRow | null>

// Student-facing (strips is_correct + misconception_id)
findQuestionDtoByCode(code, client?)
  → Promise<QuestionDto | null>
findQuestionDtosByConceptAndPhase(conceptId, phase, client?)
  → Promise<QuestionDto[]>

// Integrity check
verifyCorrectOptionCounts(client?)
  → Promise<Array<{ code: string; correct_count: number }>>
```

All functions accept an optional `client: Pool | PoolClient` parameter. Pass a checked-out `PoolClient` (from `withTransaction`) when the query must participate in a transaction.

### Transaction pattern

```typescript
import { withTransaction } from './db/transaction';

const result = await withTransaction(async (client) => {
  const attempt  = await attemptRepo.insert(client, ...);
  await interventionRepo.insert(client, ...);
  await sessionRepo.updateStatus(client, ...);
  return attempt;
});
// All three writes commit together, or all roll back on error.
```

---

## 11. Relationship to the other eight modules

| Module | Database dependency |
|---|---|
| 1 Authentication | `students` table + `lower(email)` unique index; password hashing happens before `INSERT` |
| 2 Student Profile | `student_profiles` |
| 3 Curriculum | `concepts`, `concept_prerequisites`, `misconceptions`, `teaching_plans` |
| 4 Question Engine | `questions`, `question_options`; `verifyCorrectOptionCounts` before publishing |
| 5 Answer Submission | `learning_sessions`, `attempts`; must verify option belongs to question before inserting |
| 6 Retry / Transfer UI | Reads session status, question phase, interventions via Express APIs |
| 7 Mastery Dashboard | `student_mastery`, `explanation_outcomes`, attempt history |
| 8 API Orchestration | `withTransaction` to atomically update attempts + interventions + session status |

**Build order: 9 → 1 → 2 → 3 → 4 → 5 → 8 → 6 → 7**

---

## 12. Verification results

| Check | Result |
|---|---|
| TypeScript build (`npm run build`) | ✓ Exit 0, zero errors |
| npm install (82 packages) | ✓ 0 vulnerabilities |
| Live PostgreSQL (migration, seed, check, verify) | ⏳ Pending — requires developer to create `.env` and run commands (PostgreSQL 18 service is running; credentials needed) |

**Static checks confirmed:** The TypeScript compiler enforces that `QuestionDto` never exposes `is_correct` or `misconception_id` — these fields simply do not exist on the DTO types in `types.ts`.

---

## 13. Later AI integration (Phase 2)

Once the nine modules work, add AI via new migrations — do not edit existing ones:

```sql
-- Example: new_migration_N_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE misconceptions ADD COLUMN embedding vector(1536);
ALTER TABLE teaching_plans ADD COLUMN embedding vector(1536);
```

Historical `interventions` rows retain `source = 'curated'` and the exact text shown. AI-generated explanations set `source = 'ai_generated'`. The Express server continues to own session scoring and mastery; the AI service provides explanations that the orchestration module inserts into `interventions`.

---

## 14. Design decisions vs blueprint README

| Topic | Blueprint said | Implemented as | Reason |
|---|---|---|---|
| `questions.code` | Not explicitly named | Added as `code TEXT UNIQUE NOT NULL` | Stable key for idempotent seeds (as required by prompt); README §6 referenced stable slugs/codes |
| `teaching_plans` fallback | "nullable misconception with required concept_id is acceptable" | Implemented exactly that, plus a trigger for mismatch prevention | Trigger adds safety the nullable FK alone cannot provide |
| Repository scope | All repo files listed | Only concept + question repos created | Prompt: "Do not create empty repository placeholders" |
| `verifyCorrectOptionCounts` | Mentioned as "seed verifier or validation function" | Implemented in question.repository.ts, called from seed.ts and check-db.ts | Reusable across scripts |
