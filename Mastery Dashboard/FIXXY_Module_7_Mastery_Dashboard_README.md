# FIXXY — Module 7: Mastery Dashboard

> Build-ready specification for the Mastery Dashboard module of the FIXXY Adaptive AI/ML Tutor.

---

## 1. Project Context

FIXXY is an adaptive AI/ML tutor built around this learning loop:

```text
Student makes a mistake
        ↓
Misconception diagnosis
        ↓
Personalized teaching
        ↓
Retry
        ↓
Transfer question
        ↓
Updated mastery
```

Initial MVP concepts:

1. Overfitting
2. Bias vs Variance
3. Train / Validation / Test

Technology stack:

```text
Frontend
React + TypeScript + Tailwind CSS

Backend
Node.js + Express + TypeScript

Database
PostgreSQL + pgvector

AI Service
Python + FastAPI + LLM + embeddings
```

FIXXY modules:

| Module | Name | Responsibility |
|---|---|---|
| 1 | Authentication | Register, login, logout, protected routes |
| 2 | Student Profile | Student profile and learning preferences |
| 3 | Curriculum | Concepts, prerequisites, explanations, misconceptions |
| 4 | Question Engine | Select and serve questions |
| 5 | Answer Submission | Check answers and record attempts |
| 6 | Retry / Transfer UI | Teaching, retry, transfer interaction |
| 7 | Mastery Dashboard | Calculate and display mastery/progress |
| 8 | API Orchestration | Session control and FastAPI communication |
| 9 | Database | Schema, migrations, seed data and persistence |

Recommended development order:

```text
9 → 1 → 2 → 3 → 4 → 5 → 8 → 6 → 7
```

---

# 2. Module 7 Objective

The Mastery Dashboard shows the student's learning progress using **actual learning evidence**.

It should answer:

```text
What concepts have I practiced?
How am I progressing?
How strong is my understanding of each concept?
Where have I struggled?
What learning activity happened recently?
```

The most important architecture rule is:

> The backend calculates authoritative mastery. React only displays the verified result.

Do not calculate the official mastery score in the browser.

---

# 3. Responsibility Boundary

## Included

```text
✅ Mastery calculation
✅ Concept-level mastery
✅ Overall mastery summary
✅ Learning progress
✅ Attempt-based evidence
✅ Retry outcomes
✅ Transfer outcomes
✅ Recent activity
✅ Recent learning insights
✅ Mastery API
✅ Dashboard UI
✅ Loading state
✅ Empty state
✅ Error state
✅ Responsive FIXXY glass UI
✅ Accessibility
✅ Student-level authorization
```

## Not Included

```text
❌ Authentication implementation
❌ Login/register/logout
❌ Student profile management
❌ Curriculum management
❌ Question selection
❌ Answer checking
❌ AI diagnosis
❌ LLM calls
❌ Teaching generation
❌ Retry generation
❌ Transfer generation
```

Those belong to other modules.

---

# 4. Architecture

```text
                    LEARNING EVIDENCE
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
       Attempts         Sessions       Outcomes
          │                │                │
          └────────────────┼────────────────┘
                           ↓
                    Mastery Engine
                           ↓
                    student_mastery
                           ↓
                  Mastery Dashboard API
                           ↓
                     React Dashboard
```

The broader FIXXY flow is:

```text
Question Engine
      ↓
Answer Submission
      ↓
Attempt
      ↓
Retry / Transfer
      ↓
Learning Outcomes
      ↓
Mastery Calculation
      ↓
Mastery Dashboard
```

The dashboard must never become the source of truth.

---

# 5. Critical Mastery Rule

Do not implement the official score in React like:

```ts
const mastery = correctAnswers / totalAnswers * 100;
```

Instead:

```text
Attempts
   +
Retry results
   +
Transfer results
   +
Other approved evidence
        ↓
Node.js Mastery Calculator
        ↓
Mastery score
        ↓
student_mastery
        ↓
Dashboard API
        ↓
React
```

The scoring formula must be:

- deterministic
- explicit
- testable
- explainable
- backend-owned

The LLM must never determine mastery.

---

# 6. Mastery Data Model

Use/create:

```text
student_mastery
```

Recommended fields:

```text
id
student_id
concept_id
mastery_score
mastery_level
attempt_count
correct_count
retry_success_count
transfer_success_count
last_activity_at
updated_at
```

Suggested mastery levels:

```text
NOT_STARTED
BEGINNER
DEVELOPING
PROFICIENT
```

Use existing project naming if already defined.

---

# 7. Mastery Score Design

The original FIXXY architecture requires mastery to reflect learning evidence such as:

- correct answers
- hints
- failed retries
- successful retries
- successful transfer

The example:

```text
42% → 68%
```

is illustrative only and must not be treated as the final formula.

Define one explicit MVP scoring rule before implementation.

A simple architecture can combine:

```text
Practice evidence
+
Retry evidence
+
Transfer evidence
```

into one deterministic concept score.

Document the formula in:

```text
server/src/modules/mastery/mastery.calculator.ts
```

and in project documentation.

---

# 8. Recommended Evidence Flow

```text
Practice
   ↓
Initial evidence

Retry
   ↓
Recovery evidence

Transfer
   ↓
Application evidence

All evidence
   ↓
Mastery Calculator
   ↓
Concept mastery
```

Mastery should reflect learning improvement rather than simply counting raw questions.

---

# 9. Mastery Calculation Responsibilities

`mastery.calculator.ts` should:

1. Accept trusted learning evidence.
2. Apply the defined scoring formula.
3. Clamp the result to a valid range.
4. Determine mastery level.
5. Return a typed result.
6. Contain no HTTP/database code.

Example logical range:

```text
0–100
```

Example level mapping should be explicitly defined.

Do not hide thresholds in React.

---

# 10. Mastery Update Timing

Preferred flow:

```text
Learning event
      ↓
Attempt/outcome saved
      ↓
Mastery recalculated
      ↓
student_mastery updated
      ↓
Dashboard reads current mastery
```

Do not unnecessarily recalculate all mastery data every time the dashboard is opened if the architecture already supports persisted mastery.

Use one consistent approach.

---

# 11. Database Relationships

```text
students
    │
    ├───────────────┐
    │               │
    ▼               ▼
 attempts      student_mastery
    │               │
    ▼               ▼
 questions       concepts
    │
    ▼
learning outcomes
```

Potential relationships:

```text
student_mastery.student_id
    → students.id

student_mastery.concept_id
    → concepts.id
```

`student_id + concept_id` should normally be unique.

---

# 12. Database Migration

Use the next available migration number.

Conceptually:

```text
server/db/migrations/
    create_student_mastery.sql
```

Example:

```sql
CREATE TABLE IF NOT EXISTS student_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID NOT NULL,

    concept_id UUID NOT NULL,

    mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0,

    mastery_level VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',

    attempt_count INTEGER NOT NULL DEFAULT 0,

    correct_count INTEGER NOT NULL DEFAULT 0,

    retry_success_count INTEGER NOT NULL DEFAULT 0,

    transfer_success_count INTEGER NOT NULL DEFAULT 0,

    last_activity_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mastery_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mastery_concept
        FOREIGN KEY (concept_id)
        REFERENCES concepts(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_student_concept_mastery
        UNIQUE (student_id, concept_id),

    CONSTRAINT chk_mastery_score
        CHECK (mastery_score >= 0 AND mastery_score <= 100)
);
```

Adapt this to the existing schema.

---

# 13. Backend Folder Structure

Expected:

```text
server/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── curriculum/
│   │   ├── questions/
│   │   ├── attempts/
│   │   ├── orchestration/
│   │   ├── retry-transfer/
│   │   │
│   │   └── mastery/
│   │       ├── mastery.controller.ts
│   │       ├── mastery.routes.ts
│   │       ├── mastery.service.ts
│   │       ├── mastery.repository.ts
│   │       ├── mastery.calculator.ts
│   │       └── mastery.types.ts
│   │
│   ├── config/
│   ├── app.ts
│   └── server.ts
│
├── db/
│   ├── migrations/
│   └── seeds/
│
└── ...
```

Use the existing project conventions if they differ.

---

# 14. Backend Responsibilities

## `mastery.routes.ts`

Maps dashboard endpoints.

## `mastery.controller.ts`

Handles:

- HTTP requests
- status codes
- DTO responses
- errors

## `mastery.service.ts`

Coordinates:

- mastery retrieval
- mastery refresh/update
- summaries
- concept progress
- activity
- insights

## `mastery.repository.ts`

Handles PostgreSQL queries.

## `mastery.calculator.ts`

Contains the authoritative scoring formula.

## `mastery.types.ts`

Contains:

- Mastery
- MasteryLevel
- MasterySummary
- ConceptMastery
- Activity
- Insight
- API DTOs

---

# 15. Authentication and Authorization

All mastery endpoints must be protected by Module 1.

Use:

```ts
req.user.studentId
```

as the trusted student identity.

Never allow:

```text
studentId from query parameter
studentId from body
studentId from URL
```

to override the authenticated identity.

Example:

```text
Student A
   ↓
GET /api/mastery
   ↓
Only Student A data
```

---

# 16. Mastery API

Base:

```text
/api/mastery
```

Recommended endpoints:

```http
GET /api/mastery
GET /api/mastery/concepts
GET /api/mastery/activity
GET /api/mastery/insights
```

Reuse equivalent existing endpoints rather than creating duplicates.

---

# 17. GET `/api/mastery`

Return an overall learning summary.

Example:

```json
{
  "summary": {
    "overallMastery": 68,
    "conceptsStarted": 3,
    "conceptsCompleted": 1,
    "questionsAnswered": 12,
    "retrySuccesses": 4,
    "transferSuccesses": 2
  }
}
```

Every value must come from actual backend data.

Do not return fake metrics.

---

# 18. GET `/api/mastery/concepts`

Return concept-level mastery.

Example:

```json
{
  "concepts": [
    {
      "conceptId": "uuid",
      "slug": "overfitting",
      "title": "Overfitting",
      "masteryScore": 72,
      "masteryLevel": "PROFICIENT",
      "attemptCount": 5,
      "correctCount": 4,
      "retrySuccessCount": 1,
      "transferSuccessCount": 1,
      "lastActivityAt": "2026-10-01T10:00:00Z"
    }
  ]
}
```

---

# 19. GET `/api/mastery/activity`

Return recent real learning events.

Example:

```json
{
  "activity": [
    {
      "type": "TRANSFER_SUCCESS",
      "concept": "Overfitting",
      "timestamp": "2026-10-01T10:00:00Z"
    },
    {
      "type": "RETRY_SUCCESS",
      "concept": "Bias vs Variance",
      "timestamp": "2026-09-30T18:00:00Z"
    }
  ]
}
```

Use actual stored learning evidence.

---

# 20. GET `/api/mastery/insights`

Return recent learning insights based on actual evidence.

Example:

```json
{
  "insights": [
    {
      "concept": "Overfitting",
      "misconception": "Training accuracy means generalization",
      "status": "RECENT"
    }
  ]
}
```

The dashboard does not diagnose misconceptions.

It only displays stored evidence from previous learning interactions.

---

# 21. Frontend Folder Structure

Use:

```text
client/
└── src/
    └── modules/
        └── mastery/
            ├── api.ts
            ├── MasteryDashboard.tsx
            ├── OverallMasteryCard.tsx
            ├── ConceptMasteryCard.tsx
            ├── MasteryProgress.tsx
            ├── RecentActivity.tsx
            ├── LearningInsights.tsx
            ├── MasteryEmptyState.tsx
            ├── MasteryErrorState.tsx
            ├── mastery.types.ts
            └── mastery.utils.ts
```

Reuse existing dashboard/shared components where possible.

---

# 22. Dashboard Layout

Recommended desktop:

```text
┌──────────────────────────────────────────────────────────┐
│                   FIXXY NAVIGATION                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              Your Learning Progress                      │
│                                                          │
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │ Overall Mastery     │  │ Learning Summary          │ │
│  │                     │  │                           │ │
│  │       68%           │  │ 3 Concepts                │ │
│  │    Developing       │  │ 12 Questions              │ │
│  │                     │  │ 4 Retry Successes          │ │
│  └─────────────────────┘  └───────────────────────────┘ │
│                                                          │
│  Concept Progress                                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Overfitting                           72%          │  │
│  │ ████████████████░░░░                               │  │
│  │ Proficient                                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────┐  ┌─────────────────────────┐ │
│  │ Recent Activity       │  │ Learning Insights       │ │
│  │                       │  │                         │ │
│  │ Transfer completed    │  │ Overfitting             │ │
│  │ Retry successful      │  │ Recent misconception    │ │
│  └───────────────────────┘  └─────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

# 23. Overall Mastery Card

Display:

```text
Overall Mastery
68%

Developing

3 Concepts
12 Questions
6 Successful Follow-ups
```

Do not show a fake score when no evidence exists.

For a new student:

```text
Your learning journey starts here.

Complete your first practice question
to begin building mastery.

[ Explore Curriculum ]
```

---

# 24. Concept Mastery Card

Display:

```text
Overfitting
72%

██████████████░░░░░░

Proficient

5 Attempts
4 Correct
1 Retry Success
1 Transfer Success

[ Continue Learning ]
```

The data must come from the mastery API.

Do not calculate percentages in React.

---

# 25. Recent Activity

Display concise activity records:

```text
✓ Transfer completed
  Overfitting
  2 hours ago

✓ Retry successful
  Bias vs Variance
  Yesterday

• Practice completed
  Train / Validation / Test
  2 days ago
```

The timestamp should be formatted client-side, but the underlying event must come from the backend.

---

# 26. Learning Insights

Example:

```text
Recent Learning Insights

Overfitting
Training accuracy vs generalization
Recently observed

Bias vs Variance
Bias and variance distinction
Needs review
```

Do not use discouraging wording.

Do not make new diagnoses on the dashboard.

---

# 27. FIXXY Glass UI

The dashboard must use the existing FIXXY design system.

Style:

**iOS-inspired glass / glassmorphism**

Use:

- soft blue background
- frosted white cards
- translucent surfaces
- backdrop blur
- thin light borders
- gentle highlights
- soft shadows
- rounded corners
- dark readable text
- generous whitespace
- modern typography

The dashboard should feel like a learning product, not an enterprise analytics dashboard.

Reuse the same visual language as:

- Authentication
- Student Profile
- Curriculum
- Question Engine
- Retry / Transfer

---

# 28. Progress Visualization

Use simple, readable progress indicators.

Examples:

```text
██████████████░░░░░░ 72%
```

or an existing circular progress component.

Avoid excessive charts.

The dashboard's primary questions are:

```text
What am I learning?
How am I progressing?
Where should I focus?
```

---

# 29. UI States

## Loading

```text
Loading your learning progress...
```

Use skeleton cards where supported.

## Empty

```text
Your learning journey starts here.

Complete your first practice question
to begin building mastery.

[ Explore Curriculum ]
```

## Error

```text
Couldn't load your learning progress.

[ Try Again ]
```

## Network Error

```text
Couldn't connect to FIXXY.

[ Retry ]
```

Never show fake values while the API is unavailable.

---

# 30. Accessibility

Implement:

- semantic headings
- keyboard navigation
- visible focus states
- readable labels
- accessible buttons
- meaningful status messages
- sufficient contrast

Progress bars should expose numeric values to assistive technology.

Do not rely only on color.

---

# 31. Performance

Prefer:

```text
Database aggregate/store
       ↓
Node.js
       ↓
Compact dashboard response
       ↓
React
```

Avoid:

```text
Download every attempt
       ↓
Calculate mastery in React
```

Use indexed queries and stored mastery where appropriate.

Do not fetch unrelated learning data.

---

# 32. Student Isolation

Mandatory test:

```text
Student A
   ↓
learning activity
   ↓
Mastery A

Student B
   ↓
different/no activity
   ↓
Mastery B
```

Verify:

```text
Student A sees only A
Student B sees only B
```

Manipulating:

```text
?studentId=
/:studentId
body.studentId
```

must not expose another student's mastery.

---

# 33. Unit Tests — Mastery Calculator

Test the actual scoring formula.

Required cases:

```text
[ ] No evidence
[ ] One correct practice
[ ] One wrong practice
[ ] Retry success
[ ] Retry failure
[ ] Transfer success
[ ] Transfer failure
[ ] Multiple attempts
[ ] Multiple concepts
[ ] Minimum score boundary
[ ] Maximum score boundary
[ ] Mastery-level boundaries
```

All expected numeric results must be explicitly asserted.

---

# 34. Backend/API Tests

Test:

```text
[ ] GET /api/mastery
[ ] GET /api/mastery/concepts
[ ] GET /api/mastery/activity
[ ] GET /api/mastery/insights
[ ] Unauthenticated request rejected
[ ] Authenticated student sees own data
[ ] Another student's data inaccessible
[ ] Empty learning state works
[ ] Database error handled safely
[ ] Correct response shape
```

---

# 35. Database Tests

Verify:

```text
[ ] student_mastery table exists
[ ] student FK works
[ ] concept FK works
[ ] student+concept uniqueness works
[ ] score range constraint works
[ ] mastery persists
[ ] mastery updates persist
[ ] last_activity_at updates correctly
[ ] indexes exist
```

---

# 36. Frontend Tests

Verify:

```text
[ ] Dashboard renders
[ ] Overall mastery renders
[ ] Summary metrics render
[ ] Concept mastery cards render
[ ] Progress indicators render
[ ] Recent activity renders
[ ] Learning insights render
[ ] Empty state works
[ ] Loading state works
[ ] Error state works
[ ] Network state works
[ ] Navigation works
[ ] Glass UI works
[ ] Responsive UI works
[ ] Accessibility works
```

---

# 37. Data Integrity Test

The following chain must be consistent:

```text
Stored attempts
      ↓
Mastery calculator
      ↓
student_mastery
      ↓
Mastery API
      ↓
Dashboard
```

The same concept score must flow through every layer.

Do not allow:

```text
Backend = 68%
Frontend = 74%
```

because of duplicate client calculations.

There must be one authoritative score.

---

# 38. End-to-End Test

Run a real browser/database flow:

```text
1. Start PostgreSQL
2. Start backend
3. Start frontend
4. Authenticate as Student A
5. Complete a practice question
6. Complete retry/transfer as supported
7. Open Mastery Dashboard
8. Verify concept mastery reflects backend evidence
9. Verify recent activity
10. Verify learning insights when available
11. Refresh dashboard
12. Verify persisted values remain correct
13. Restart backend if practical
14. Verify values remain correct
```

---

# 39. New Student E2E Test

For a student with no learning evidence:

```text
Login
   ↓
Dashboard
```

Expected:

```text
No fake mastery
No fake completed concepts
No fake activity
No fake insights
```

Show the empty/start state.

---

# 40. Multi-Student E2E Test

Create:

```text
Student A
Student B
```

Generate learning activity for A.

Verify:

```text
Student A → A's mastery/activity
Student B → B's mastery/activity
```

Student B must not see A's data.

---

# 41. Learning Event Integration Test

Test:

```text
Practice answer
      ↓
Attempt saved
      ↓
Retry/Transfer outcome
      ↓
Mastery recalculated
      ↓
student_mastery updated
      ↓
Dashboard reflects change
```

This proves the dashboard is connected to the actual learning system.

---

# 42. Regression Testing

After Module 7, rerun all previous modules.

### Module 1 — Authentication

```text
[ ] Register
[ ] Login
[ ] /api/auth/me
[ ] Logout
[ ] Protected routes
```

### Module 2 — Profile

```text
[ ] Profile load
[ ] Profile update
[ ] Profile protection
[ ] Student isolation
```

### Module 3 — Curriculum

```text
[ ] Concept list
[ ] Concept detail
[ ] Learning path
```

### Module 4 — Question Engine

```text
[ ] Question selection
[ ] Practice/retry/transfer availability
```

### Module 5 — Answer Submission

```text
[ ] Correct answer
[ ] Wrong answer
[ ] Attempt persistence
[ ] Student isolation
```

### Module 6 — Retry / Transfer

```text
[ ] Teaching
[ ] Retry
[ ] Transfer
[ ] Reteaching
[ ] Completion
```

The Mastery module must not break the learning pipeline.

---

# 43. Build Verification

Run actual repository commands.

Frontend:

```text
[ ] TypeScript
[ ] Lint
[ ] Unit tests
[ ] Integration tests
[ ] Production build
```

Backend:

```text
[ ] TypeScript/build
[ ] Lint
[ ] Unit tests
[ ] API/integration tests
```

Database:

```text
[ ] Migrations
[ ] Schema verification
[ ] Mastery persistence
```

Full system:

```text
[ ] Security tests
[ ] E2E tests
[ ] Regression tests
```

Never claim a check passed unless it was actually run.

---

# 44. Development Strategy

Optimize development time by:

1. Reusing Module 1 authentication.
2. Reusing Module 3 concept data.
3. Reusing Module 5 attempts.
4. Reusing Module 6 retry/transfer outcomes.
5. Keeping the score formula in one calculator.
6. Reusing the existing database connection.
7. Reusing shared UI components.
8. Reusing the existing API client.
9. Avoiding duplicate dashboard calculations.
10. Avoiding unrelated refactors.

Preferred vertical slice:

```text
Inspect existing evidence
        ↓
Define scoring formula
        ↓
Implement calculator
        ↓
Test calculator
        ↓
Persist mastery
        ↓
Implement API
        ↓
Test API
        ↓
Build dashboard
        ↓
Test frontend
        ↓
E2E
        ↓
Security
        ↓
Regression
        ↓
Build
```

---

# 45. Failure Handling

When anything fails:

```text
FAIL
 ↓
Read actual error
 ↓
Identify root cause
 ↓
Fix root cause
 ↓
Rerun failed test
 ↓
Rerun related regression tests
```

Never:

```text
❌ Hard-code dashboard values
❌ Fake mastery
❌ Calculate official mastery only in React
❌ Delete failing tests
❌ Weaken assertions
❌ Hide failures
❌ Mark untested features as passed
```

---

# 46. Final Verification Matrix

| Feature | Implemented | Tested | Result |
|---|---|---|---|
| Mastery calculator | | | |
| Explicit score formula | | | |
| Mastery level | | | |
| Practice evidence | | | |
| Retry evidence | | | |
| Transfer evidence | | | |
| Concept mastery | | | |
| Overall mastery | | | |
| Summary metrics | | | |
| Recent activity | | | |
| Learning insights | | | |
| student_mastery persistence | | | |
| Mastery API | | | |
| Concept API | | | |
| Activity API | | | |
| Insights API | | | |
| Authentication protection | | | |
| Student isolation | | | |
| Loading state | | | |
| Empty state | | | |
| Error state | | | |
| Network state | | | |
| Glass UI | | | |
| Responsive UI | | | |
| Accessibility | | | |
| Database constraints | | | |
| Data integrity | | | |
| Module 1 regression | | | |
| Module 2 regression | | | |
| Module 3 regression | | | |
| Module 4 regression | | | |
| Module 5 regression | | | |
| Module 6 regression | | | |
| Backend tests | | | |
| Frontend tests | | | |
| API/integration tests | | | |
| E2E tests | | | |
| Security tests | | | |
| Frontend build | | | |
| Backend build | | | |

Every implemented feature must have an actual test result.

---

# 47. Final Project Structure

```text
fixxy/
├── client/
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── profile/
│       │   ├── curriculum/
│       │   ├── questions/
│       │   ├── answer-submission/
│       │   ├── retry-transfer/
│       │   │
│       │   └── mastery/
│       │       ├── api.ts
│       │       ├── MasteryDashboard.tsx
│       │       ├── OverallMasteryCard.tsx
│       │       ├── ConceptMasteryCard.tsx
│       │       ├── MasteryProgress.tsx
│       │       ├── RecentActivity.tsx
│       │       ├── LearningInsights.tsx
│       │       ├── MasteryEmptyState.tsx
│       │       ├── MasteryErrorState.tsx
│       │       ├── mastery.types.ts
│       │       └── mastery.utils.ts
│       │
│       ├── components/
│       ├── routes/
│       ├── styles/
│       ├── App.tsx
│       └── main.tsx
│
├── server/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── curriculum/
│   │   │   ├── questions/
│   │   │   ├── attempts/
│   │   │   ├── orchestration/
│   │   │   ├── retry-transfer/
│   │   │   │
│   │   │   └── mastery/
│   │   │       ├── mastery.controller.ts
│   │   │       ├── mastery.routes.ts
│   │   │       ├── mastery.service.ts
│   │   │       ├── mastery.repository.ts
│   │   │       ├── mastery.calculator.ts
│   │   │       └── mastery.types.ts
│   │   │
│   │   ├── config/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   └── ...
│
├── ai-service/
├── contracts/
├── docs/
├── .gitignore
└── README.md
```

Adapt the structure to the actual repository rather than blindly replacing it.

---

# 48. Definition of Done

Module 7 is complete only when:

```text
✅ Mastery formula is explicitly defined
✅ Mastery is calculated on the backend
✅ Mastery is deterministic
✅ Practice evidence works
✅ Retry evidence works
✅ Transfer evidence works
✅ Concept mastery works
✅ Overall summary works
✅ Recent activity works
✅ Learning insights work
✅ student_mastery persists
✅ Dashboard APIs work
✅ Dashboard displays actual backend values
✅ New students receive a proper empty state
✅ Authentication protects dashboard
✅ Student isolation works
✅ Loading works
✅ Empty state works
✅ Error state works
✅ Network state works
✅ FIXXY glass UI works
✅ Responsive UI works
✅ Accessibility works
✅ Database integrity works
✅ Security tests pass
✅ Module 1 regression passes
✅ Module 2 regression passes
✅ Module 3 regression passes
✅ Module 4 regression passes
✅ Module 5 regression passes
✅ Module 6 regression passes
✅ Backend tests pass
✅ Frontend tests pass
✅ API/integration tests pass
✅ E2E tests pass
✅ Frontend build passes
✅ Backend build passes
```

---

# 49. Final Architecture

```text
MODULE 4
Question Engine
       ↓
MODULE 5
Answer Submission
       ↓
Attempts
       ↓
MODULE 6
Retry / Transfer
       ↓
Learning outcomes
       ↓
MODULE 7
Mastery Engine
       ↓
student_mastery
       ↓
Mastery Dashboard API
       ↓
React Dashboard
```

The dashboard is a presentation layer over authoritative backend learning data.

---

# 50. Core Principle

> **FIXXY measures mastery from real learning evidence in the backend, stores the authoritative result, and presents that verified progress to the student through the Mastery Dashboard.**

---

# 51. Module 7 Verification Matrix (Executed & Verified)

| Feature / Area | Implemented | Tested | Result | Evidence |
|---|---|---|---|---|
| Database Migration 009 (`student_mastery`) | ✅ YES | ✅ YES | **PASS** | Migration executed cleanly, schema constraints, indexes & unique constraints verified |
| Explicit Deterministic Mastery Formula | ✅ YES | ✅ YES | **PASS** | 51 unit tests passed in `test-unit-mastery.ts` |
| Mastery Levels Calculation | ✅ YES | ✅ YES | **PASS** | `NOT_STARTED`, `BEGINNER`, `DEVELOPING`, `PROFICIENT` boundaries verified |
| Practice Evidence Integration | ✅ YES | ✅ YES | **PASS** | Practice answer attempts update base performance (40%) |
| Retry Recovery Evidence | ✅ YES | ✅ YES | **PASS** | Remediation outcome updates recovery score (30%) |
| Transfer Application Evidence | ✅ YES | ✅ YES | **PASS** | Transfer question success updates application score (30%) |
| Overall Mastery Summary API (`GET /api/mastery`) | ✅ YES | ✅ YES | **PASS** | 70 integration tests in `test-mastery-api.ts` & 74 tests in `test-runner.ts` |
| Concept Mastery API (`GET /api/mastery/concepts`) | ✅ YES | ✅ YES | **PASS** | Returns active concepts with official backend score & level |
| Recent Activity API (`GET /api/mastery/activity`) | ✅ YES | ✅ YES | **PASS** | Real learning history formatted with timestamps & outcome |
| Learning Insights API (`GET /api/mastery/insights`) | ✅ YES | ✅ YES | **PASS** | Deterministic strongest/focus/improvement insights |
| Authentication & Student Isolation | ✅ YES | ✅ YES | **PASS** | Student A and Student B isolated; query/body tampering blocked |
| Glass UI & Mobile Responsive Dashboard | ✅ YES | ✅ YES | **PASS** | iOS-inspired glass cards with accessible progress bars & layout |
| UI States (Loading, Empty, Error, Loaded) | ✅ YES | ✅ YES | **PASS** | 15 tests in `MasteryDashboard.test.tsx` passed |
| Module 1 Regression (Authentication) | ✅ YES | ✅ YES | **PASS** | Register, login, cookie auth, logout verified |
| Module 2 Regression (Student Profile) | ✅ YES | ✅ YES | **PASS** | Profile retrieval, update, validation verified |
| Module 3 Regression (Curriculum) | ✅ YES | ✅ YES | **PASS** | Concept list, details, learning path verified |
| Module 4 Regression (Question Engine) | ✅ YES | ✅ YES | **PASS** | Active questions with safe options & stripped keys verified |
| Module 5 Regression (Answer Submission) | ✅ YES | ✅ YES | **PASS** | Answer checking, debounce, attempt history verified |
| Module 6 Regression (Retry / Transfer) | ✅ YES | ✅ YES | **PASS** | Complete session progression & teaching loop verified (47/47 tests) |
| Frontend Unit & Component Tests | ✅ YES | ✅ YES | **PASS** | 99/99 tests passed across 11 test suites |
| Backend Build (`tsc`) | ✅ YES | ✅ YES | **PASS** | TypeScript compilation passed with 0 errors |
| Frontend Build (`vite build`) | ✅ YES | ✅ YES | **PASS** | Client bundle built cleanly with 0 errors |

