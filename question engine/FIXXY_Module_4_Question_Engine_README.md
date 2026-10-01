# FIXXY — Module 4: Question Engine

> Build-ready specification for the Question Engine module of the FIXXY Adaptive AI/ML Tutor.

## 1. Project Context

FIXXY is an adaptive AI/ML tutor built around:

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

- Frontend: React + TypeScript + Tailwind CSS
- Main backend: Node.js + Express + TypeScript
- Database: PostgreSQL + pgvector
- AI service: Python + FastAPI + LLM + embeddings

Project modules:

| Module | Name |
|---|---|
| 1 | Authentication |
| 2 | Student Profile |
| 3 | Curriculum |
| 4 | Question Engine |
| 5 | Answer Submission |
| 6 | Retry / Transfer UI |
| 7 | Mastery Dashboard |
| 8 | API Orchestration |
| 9 | Database |

Recommended development order:

```text
9 → 1 → 2 → 3 → 4 → 5 → 8 → 6 → 7
```

## 2. Module 4 Objective

The Question Engine is responsible for selecting and serving the correct question for the current learning stage.

Its main flow is:

```text
Concept
   ↓
Learning Session
   ↓
Question Selection
   ↓
Student-safe Question
   ↓
React
   ↓
Module 5 — Answer Submission
```

It supports:

- Practice questions
- Retry questions
- Transfer questions
- Question options
- Concept/question relationship
- Session-aware delivery
- Question ordering/selection
- Repetition prevention
- Student/session authorization
- Correct-answer protection

The browser must never receive the authoritative answer.

## 3. Responsibility Boundary

### Included

```text
✅ Question data model
✅ Question options
✅ Practice selection
✅ Retry selection
✅ Transfer selection
✅ Concept/question relationship
✅ Session/question relationship
✅ Selection rules
✅ Student-safe question API
✅ Correct-answer protection
✅ Availability handling
✅ Loading/error states
✅ Question UI
✅ Responsive FIXXY glass UI
```

### Not included

```text
❌ Authentication logic
❌ Student profile management
❌ Curriculum management
❌ Answer correctness evaluation
❌ Attempt recording
❌ AI diagnosis
❌ Teaching generation
❌ Mastery calculation
❌ Retry/transfer feedback logic
```

## 4. Critical Security Rule

Student-facing responses must never expose:

```text
correctOptionId
isCorrect
is_correct
answer key
```

A safe response looks like:

```json
{
  "question": {
    "id": "uuid",
    "conceptId": "uuid",
    "stage": "PRACTICE",
    "text": "What is overfitting?",
    "options": [
      {"id": "uuid", "text": "Option A"},
      {"id": "uuid", "text": "Option B"},
      {"id": "uuid", "text": "Option C"},
      {"id": "uuid", "text": "Option D"}
    ]
  }
}
```

Correctness remains server-side and is handled by Module 5.

## 5. Question Types / Stages

The engine must support:

```text
PRACTICE
RETRY
TRANSFER
```

### Practice

Initial question used to measure the student's current understanding.

### Retry

A different question that tests the same concept after teaching.

### Transfer

A different question/scenario testing application of the same concept.

## 6. Question Separation Rules

Mandatory:

```text
practice question != retry question
retry question != transfer question
```

Prefer:

```text
practice question != transfer question
```

Retry should use different wording/surface details.

Transfer should use a meaningfully different scenario/application.

Do not simply repeat a question and call it a transfer test.

## 7. Question Data Model

Recommended entity:

```text
questions
```

Fields:

```text
id
concept_id
stage
question_type
question_text
explanation_reference
difficulty
active
display_order
created_at
updated_at
```

Use either `stage` or `question_type` according to the existing architecture; do not duplicate equivalent concepts without reason.

Recommended stage values:

```text
PRACTICE
RETRY
TRANSFER
```

Recommended difficulty:

```text
BEGINNER
INTERMEDIATE
ADVANCED
```

## 8. Question Options

Use:

```text
question_options
```

Recommended fields:

```text
id
question_id
option_text
misconception_id
is_correct
display_order
```

For MVP multiple-choice questions:

- 4 options per question
- exactly 1 correct option
- incorrect options may map to educator-defined misconception codes
- `is_correct` remains server-only

Example:

```text
Question
   │
   ├── Option A → correct
   ├── Option B → OVERFIT_M1
   ├── Option C → OVERFIT_M2
   └── Option D → OVERFIT_M3
```

## 9. Misconception Integration

Question options can reference the Curriculum module's misconception entity.

The Question Engine does not diagnose.

It only preserves the educator-defined mapping so later orchestration can use it:

```text
Wrong Option
   ↓
Misconception tag
   ↓
Module 8
   ↓
FastAPI
   ↓
Diagnosis
```

## 10. Question Selection Rules

Input:

```text
studentId
conceptId
stage
sessionId
```

Selection flow:

```text
Verify student/session
        ↓
Find active questions for concept + stage
        ↓
Exclude questions already used in current session
        ↓
Apply ordering/selection rules
        ↓
Select one
        ↓
Build student-safe DTO
        ↓
Return question
```

Do not load the entire question bank into memory when a targeted database query can do the job.

For MVP, deterministic ordering is acceptable. Randomization can be added later.

## 11. Session Relationship

Use the existing `learning_sessions` model if present.

Conceptual relationship:

```text
Student
   ↓
Learning Session
   ↓
Concept
   ↓
Question
```

The Question Engine must verify that the question is valid for the current student's session.

Never allow a student to access another student's active learning question/session.

## 12. Learning Session Fields

If the project already has a session model, reuse it.

A suitable session representation is:

```text
session_id
student_id
concept_id
current_stage
status
current_question_id
created_at
updated_at
```

Suggested stages:

```text
PRACTICE
DIAGNOSING
TEACHING
RETRY
TRANSFER
RETEACHING
COMPLETE
```

Module 4 primarily selects the correct question for the current stage; Module 8 controls broader state transitions.

## 13. Backend Folder Structure

```text
server/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── curriculum/
│   │   ├── questions/
│   │   │   ├── question.controller.ts
│   │   │   ├── question.routes.ts
│   │   │   ├── question.service.ts
│   │   │   ├── question.repository.ts
│   │   │   └── question.types.ts
│   │   └── ...
│   │
│   ├── config/
│   ├── app.ts
│   └── server.ts
│
├── db/
│   ├── migrations/
│   └── seeds/
│       └── questions.seed.ts
│
└── ...
```

Adapt to existing naming conventions.

## 14. Backend Responsibilities

### `question.routes.ts`

Expose only the endpoints that fit the existing session architecture.

Potential endpoints:

```text
GET /api/questions/:id
GET /api/sessions/:sessionId/questions/current
```

If the project already has equivalent endpoints, reuse them.

### `question.controller.ts`

Handles HTTP parsing, validation results, status codes and response formatting.

### `question.service.ts`

Handles selection logic, stage rules, availability, repetition and session validation.

### `question.repository.ts`

Handles PostgreSQL queries for questions, options, sessions and usage history.

### `question.types.ts`

Defines question domain types and student-safe DTOs.

## 15. Student-Safe DTO

Use separate internal and public representations.

### Internal

May contain:

```text
correct option
misconception mapping
private metadata
```

### Student-facing

Contains only:

```text
question id
concept id if needed
stage
question text
options
safe metadata
```

Never serialize the internal database object directly to the frontend.

## 16. API Requirements

The API should be session-aware and student-aware.

A question request must verify:

```text
Authenticated student
Correct session
Correct concept
Correct stage
Question availability
```

Unknown concept/question/session should produce safe errors.

## 17. Question Availability

When no suitable question exists:

Do not silently choose an invalid question.

Return a clear response such as:

```json
{
  "message": "No retry question is currently available for this session."
}
```

Use the existing project's status conventions, e.g. 404 or 409 depending on the situation.

## 18. MVP Seed Data

Seed enough questions for the full demo.

For every MVP concept:

```text
Practice questions
Retry questions
Transfer questions
```

Each multiple-choice question must have:

```text
Question text
4 options
1 correct option
Optional misconception tags on incorrect options
Active status
Difficulty
Stage
Display order
```

Use real educational content for:

- Overfitting
- Bias vs Variance
- Train / Validation / Test

Do not use meaningless placeholders in the final seeded dataset.

Use stable identifiers and idempotent seed logic.

## 19. Frontend Folder Structure

```text
client/
└── src/
    └── modules/
        └── questions/
            ├── api.ts
            ├── QuestionCard.tsx
            ├── QuestionOptions.tsx
            ├── QuestionStage.tsx
            ├── LoadingQuestion.tsx
            ├── QuestionError.tsx
            ├── question.types.ts
            └── question.utils.ts
```

Reuse existing shared components instead of duplicating buttons, cards, option controls, loading UI and error UI.

## 20. Question UI

The question screen should display:

```text
Stage
Question
Options
Submit Answer
```

Example:

```text
┌───────────────────────────────────────────────────┐
│ PRACTICE                                           │
│                                                   │
│ What is overfitting?                              │
│                                                   │
│ ○ Option A                                        │
│ ○ Option B                                        │
│ ○ Option C                                        │
│ ○ Option D                                        │
│                                                   │
│              [ Submit Answer ]                    │
└───────────────────────────────────────────────────┘
```

Answer submission belongs to Module 5. Integrate with it rather than implementing a second submission system.

## 21. FIXXY Glass UI

Maintain the FIXXY visual system:

**iOS-inspired glass / glassmorphism**

Use:

- soft blue page background
- frosted white question cards
- translucent supporting surfaces
- backdrop blur
- light borders
- gentle highlights
- soft shadows
- rounded corners
- dark readable text
- generous spacing
- modern typography

The main question surface should be slightly more opaque when needed for readability.

Reuse the existing FIXXY design tokens and components.

Do not create a new visual system.

## 22. Responsive Layout

Desktop:

```text
FIXXY navigation
       ↓
Stage
       ↓
Centered question card
       ↓
Options
       ↓
Submit
```

Mobile:

```text
Navigation
   ↓
Stage
   ↓
Question
   ↓
Options
   ↓
Submit
```

No horizontal scrolling or clipped controls.

## 23. UI States

### Loading

```text
Loading question...
```

### Ready

Display question/options.

### No question

```text
No question is currently available.
```

### Error

```text
Couldn't load the question.
Please try again.
```

### Invalid session

```text
Your learning session is no longer available.

[ Return to Curriculum ]
```

### Unauthorized

Reuse existing authentication handling.

## 24. Accessibility

Implement:

- semantic question controls
- keyboard navigation
- visible focus states
- accessible labels
- clear selected state
- useful error/status messages
- sufficient contrast

Do not rely only on color for selected/current states.

## 25. Performance

Keep question retrieval efficient.

Use indexes for common filters such as:

```text
concept_id
stage
active
display_order
```

Avoid unnecessary API calls.

Do not call the LLM from Module 4.

Do not perform vector retrieval unless it is actually required by the existing architecture.

## 26. Testing Strategy

Use the existing test framework.

Test at:

```text
Unit
API/integration
Database
Frontend/component
Security
End-to-end
Regression
```

## 27. Backend Unit Tests

Test:

```text
[ ] Practice selection
[ ] Retry selection
[ ] Transfer selection
[ ] Concept filtering
[ ] Stage filtering
[ ] Active filtering
[ ] Already-used exclusion
[ ] No available question
[ ] Invalid session
[ ] Session ownership
[ ] Student-safe DTO
```

## 28. API Tests

Test:

```text
[ ] Practice question retrieval
[ ] Retry question retrieval
[ ] Transfer question retrieval
[ ] Unauthenticated request
[ ] Invalid session
[ ] Wrong student/session
[ ] Unknown concept
[ ] No available question
[ ] Correct response shape
[ ] Correct answer not returned
[ ] Internal misconception/answer data not leaked
```

## 29. Database Tests

Verify:

```text
[ ] Questions table
[ ] Question options table
[ ] Concept relationship
[ ] Misconception relationship
[ ] Session relationship where applicable
[ ] Foreign keys
[ ] Unique/stable fields
[ ] Indexes
[ ] Seed data
[ ] Seed idempotency
[ ] Exactly one correct option per MVP MCQ
```

## 30. Frontend Tests

Verify:

```text
[ ] QuestionCard renders
[ ] Question text renders
[ ] Options render
[ ] Stage renders
[ ] Option selection works
[ ] Loading state works
[ ] Empty state works
[ ] Error state works
[ ] Session error works
[ ] Navigation works
[ ] Glass UI works
[ ] Responsive layout works
[ ] Keyboard navigation works
```

## 31. Security Tests

### Correct-answer leakage

Fetch a question and inspect the full browser/API response.

Expected:

```text
No correct answer information exposed to the student client.
```

### Session isolation

```text
Student A
   ↓
Session A
   ↓
Question A

Student B
   ↓
Attempts Session A
   ↓
REJECT
```

### Identity manipulation

Attempt student ID manipulation in URL/query/body while authenticated as another student.

The authenticated identity must remain authoritative.

## 32. End-to-End Test

Run:

```text
1. Start PostgreSQL
2. Start backend
3. Start frontend
4. Authenticate
5. Open Curriculum
6. Select a concept
7. Start a learning session
8. Request practice question
9. Verify question renders
10. Verify options render
11. Inspect network response for answer leakage
12. Select an option
13. Submit through Module 5
14. Verify result
15. Trigger wrong-answer flow
16. Request retry question
17. Verify retry differs from practice
18. Submit retry
19. Request transfer
20. Verify transfer differs from retry
21. Submit transfer
22. Verify session state remains consistent
```

## 33. Regression Testing

After Module 4, rerun:

### Module 1

```text
[ ] Register
[ ] Login
[ ] /api/auth/me
[ ] Logout
[ ] Protected routes
```

### Module 2

```text
[ ] Profile load
[ ] Profile update
[ ] Protection
[ ] Student isolation
```

### Module 3

```text
[ ] Curriculum list
[ ] Concept detail
[ ] Learning path
```

Question Engine must integrate with these modules without breaking them.

## 34. Build Verification

Run the repository's actual commands for:

Frontend:

```text
[ ] TypeScript
[ ] Lint
[ ] Component tests
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
[ ] Seed
[ ] Schema verification
```

Full system:

```text
[ ] E2E
[ ] Security
[ ] Regression
```

Do not claim a check passed unless it was actually executed.

## 35. Development Strategy

Use a vertical slice to reduce development time:

```text
1. Inspect Modules 3 and 5 and current session infrastructure
2. Inspect existing questions schema
3. Create/adapt question and option storage
4. Seed all MVP question types
5. Implement repository
6. Implement service
7. Implement API
8. Run API tests immediately
9. Integrate existing learning UI
10. Run frontend tests
11. Run answer-leakage security tests
12. Run E2E
13. Run regression
14. Build
```

Reuse:

```text
authentication
student profile
curriculum
session infrastructure
existing API client
shared question UI
shared glass UI
existing test utilities
```

Do not refactor unrelated modules.

## 36. Failure Handling

For any failure:

```text
FAIL
 ↓
Read actual error
 ↓
Find root cause
 ↓
Fix root cause
 ↓
Rerun failed test
 ↓
Rerun affected regression tests
```

Never:

```text
❌ Delete failing tests
❌ Weaken assertions
❌ Hide answer leakage
❌ Return fake production question data
❌ Ignore authorization failures
❌ Mark untested features as working
```

## 37. Final Verification Matrix

| Feature | Implemented | Tested | Result |
|---|---|---|---|
| Question model | | | |
| Question options | | | |
| Practice selection | | | |
| Retry selection | | | |
| Transfer selection | | | |
| Question ordering | | | |
| Repetition prevention | | | |
| Session integration | | | |
| Concept integration | | | |
| Misconception tags | | | |
| Student-safe DTO | | | |
| Correct-answer protection | | | |
| Practice API | | | |
| Retry API | | | |
| Transfer API | | | |
| Loading state | | | |
| Empty state | | | |
| Error state | | | |
| Session error state | | | |
| Glass UI | | | |
| Responsive UI | | | |
| Accessibility | | | |
| Security tests | | | |
| Database migration | | | |
| Seed data | | | |
| Seed idempotency | | | |
| Module 1 regression | | | |
| Module 2 regression | | | |
| Module 3 regression | | | |
| Backend tests | | | |
| Frontend tests | | | |
| API tests | | | |
| E2E tests | | | |
| Frontend build | | | |
| Backend build | | | |

Every implemented feature must have an actual test result.

## 38. Definition of Done

Module 4 is complete only when:

```text
✅ Practice questions work
✅ Retry questions work
✅ Transfer questions work
✅ Selection is stage-aware
✅ Selection is concept-aware
✅ Selection is session-aware
✅ Repetition is handled correctly
✅ Question options work
✅ Misconception tags are stored
✅ Correct answers remain server-side
✅ Student-safe DTO works
✅ Curriculum integration works
✅ API works
✅ Loading state works
✅ Empty state works
✅ Error state works
✅ Session error works
✅ Glass UI works
✅ Responsive UI works
✅ Accessibility works
✅ Database migration works
✅ Seed data works
✅ Seed is idempotent
✅ Answer leakage tests pass
✅ Student isolation tests pass
✅ Module 1 regression passes
✅ Module 2 regression passes
✅ Module 3 regression passes
✅ Backend tests pass
✅ Frontend tests pass
✅ Integration tests pass
✅ E2E tests pass
✅ Frontend build passes
✅ Backend build passes
```

## 39. Final Architecture Boundary

```text
MODULE 3 — CURRICULUM
        ↓
      Concept
        ↓
MODULE 4 — QUESTION ENGINE
        ↓
Practice / Retry / Transfer Question
        ↓
MODULE 5 — ANSWER SUBMISSION
        ↓
Server-side correctness + attempt
        ↓
MODULE 8 — API ORCHESTRATION
```

Core principle:

> **The Question Engine decides which question the student should receive; it never decides whether the student's answer is correct.**
