
# FIXXY — Module 5: Answer Submission

> Build specification for the Answer Submission module of the FIXXY Adaptive AI/ML Tutor.

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

The initial MVP concepts are:

1. Overfitting
2. Bias vs Variance
3. Train / Validation / Test

Technology stack:

```text
Frontend: React + TypeScript + Tailwind CSS
Backend: Node.js + Express + TypeScript
Database: PostgreSQL + pgvector
AI Service: Python + FastAPI + LLM + embeddings
```

Project modules:

| Module | Name | Responsibility |
|---|---|---|
| 1 | Authentication | Register, login, logout, protected routes |
| 2 | Student Profile | Student profile and learning preferences |
| 3 | Curriculum | Concepts, prerequisites, explanations, misconceptions |
| 4 | Question Engine | Select and serve practice questions |
| 5 | Answer Submission | Validate, check, and record student answers |
| 6 | Retry / Transfer UI | Teaching, retry and transfer interaction |
| 7 | Mastery Dashboard | Mastery and progress |
| 8 | API Orchestration | Learning session and FastAPI communication |
| 9 | Database | Schema, migrations, seed data and persistence |

Recommended development order:

```text
9 → 1 → 2 → 3 → 4 → 5 → 8 → 6 → 7
```

---

## 2. Module 5 Objective

The Answer Submission module converts a student's selected answer into **trusted learning evidence**.

```text
Student selects answer
        ↓
React submits answer
        ↓
Node.js authenticates student
        ↓
Validate request
        ↓
Load authoritative question
        ↓
Validate selected option
        ↓
Check correctness on server
        ↓
Save attempt
        ↓
Return result
```

The browser must never be the authority for whether an answer is correct.

---

## 3. Responsibility Boundary

### Included

```text
✅ Receive answer
✅ Validate request
✅ Authenticate student
✅ Validate question
✅ Validate selected option
✅ Validate question/session relationship where applicable
✅ Determine correctness on server
✅ Record attempt
✅ Return correct/wrong result
✅ Handle invalid submissions
✅ Handle duplicate submissions
✅ Preserve attempt metadata
✅ Provide API error handling
```

### Not included

```text
❌ Question generation
❌ Question selection
❌ Curriculum management
❌ AI diagnosis
❌ Teaching response
❌ Retry decision logic
❌ Transfer decision logic
❌ Mastery calculation
❌ Dashboard calculation
```

---

## 4. Core Architecture Rule

The authoritative answer is stored on the server/database.

The client must NOT submit:

```json
{
  "correct": true
}
```

or:

```json
{
  "isCorrect": true
}
```

The client submits only the student's selection:

```json
{
  "questionId": "question-uuid",
  "selectedOptionId": "option-uuid"
}
```

Node.js determines correctness from the authoritative option record.

```text
selectedOptionId
       ↓
question_options
       ↓
is_correct
       ↓
server result
```

---

## 5. End-to-End Flow

```text
                  QUESTION ENGINE
                        │
                        ▼
                    Question
                        │
                        ▼
                     React
                        │
              Student selects option
                        │
                        ▼
             POST /api/attempts
                        │
                        ▼
              Authentication Middleware
                        │
                        ▼
                 authenticated
                   studentId
                        │
                        ▼
               Answer Validation
                        │
                        ▼
                Question Lookup
                        │
                        ▼
              Option Validation
                        │
                        ▼
              Server-side Check
                        │
              ┌─────────┴─────────┐
              │                   │
            Correct              Wrong
              │                   │
              └─────────┬─────────┘
                        ▼
                 Save Attempt
                        │
                        ▼
                  Return Result
                        │
                        ▼
             Future Orchestration
```

---

## 6. API

Base endpoint:

```text
/api/attempts
```

Main endpoint:

```http
POST /api/attempts
```

### Minimum request

```json
{
  "questionId": "uuid",
  "selectedOptionId": "uuid"
}
```

If Module 4 already uses a learning session, integrate the existing session identifier instead of creating a second session mechanism.

---

## 7. Authentication

Protect the endpoint using Module 1 authentication middleware.

Trusted identity:

```ts
req.user.studentId
```

Do NOT trust:

```json
{
  "studentId": "another-student-id"
}
```

from the request body.

---

## 8. Validation

Validate all required fields and relationships.

### Required

```text
questionId
selectedOptionId
```

### Validate format

```text
questionId → valid UUID
selectedOptionId → valid UUID
```

### Validate existence

```text
question exists
selected option exists
```

### Validate relationship

The selected option must belong to the submitted question.

Example invalid submission:

```text
questionId = Question A
selectedOptionId = Option B1
```

Expected: reject the request.

---

## 9. Session Validation

If Module 4 provides learning sessions, verify:

1. session exists
2. session belongs to authenticated student
3. question belongs to that session
4. session is in a state where submission is allowed

Reject submissions against:

```text
another student's session
inactive session
completed session
invalid session
question not associated with session
```

Use the existing Question Engine/session rules.

---

## 10. Server-Side Correctness

The server must determine correctness.

Example:

```text
selectedOptionId
       ↓
question_options
       ↓
is_correct
       ↓
create attempt
```

Never accept a correctness flag from React.

Critical rule:

```text
Client says: isCorrect = true
Database says: selected option is wrong

Server result:
isCorrect = false
```

---

## 11. Attempt Entity

Store attempts in:

```text
attempts
```

Recommended fields:

```text
id
student_id
question_id
selected_option_id
is_correct
attempt_number
session_id
submitted_at
```

Optional future-compatible fields may include:

```text
time_spent_ms
hint_used
stage
metadata
```

Only add future fields when justified by the existing architecture.

---

## 12. Database Relationships

```text
students
   │
   └───────────────┐
                   ▼
                attempts
                   │
          ┌────────┼─────────┐
          │        │         │
          ▼        ▼         ▼
       question  option    session
```

Use foreign keys where appropriate.

Recommended indexes:

```text
attempts.student_id
attempts.question_id
attempts.session_id
attempts.submitted_at
```

---

## 13. Database Migration

Use the next migration number available in the project. Inspect existing migrations first.

Expected logical migration:

```text
create_attempts.sql
```

Example schema:

```sql
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    question_id UUID NOT NULL,
    selected_option_id UUID NOT NULL,
    session_id UUID,
    is_correct BOOLEAN NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_attempt_student
        FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT fk_attempt_question
        FOREIGN KEY (question_id) REFERENCES questions(id),
    CONSTRAINT fk_attempt_option
        FOREIGN KEY (selected_option_id) REFERENCES question_options(id)
);
```

Adapt this to the actual Module 4 schema. Do not create duplicate tables.

---

## 14. Backend Folder Structure

Expected:

```text
server/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── curriculum/
│   │   ├── questions/
│   │   └── attempts/
│   │       ├── attempt.controller.ts
│   │       ├── attempt.routes.ts
│   │       ├── attempt.service.ts
│   │       ├── attempt.repository.ts
│   │       └── attempt.types.ts
│   ├── app.ts
│   └── server.ts
├── db/
│   ├── migrations/
│   └── seeds/
└── ...
```

If the project calls this module `answer-submission`, use that existing convention while keeping the persistence concept as `attempts`.

---

## 15. Backend File Responsibilities

### `attempt.routes.ts`

Map:

```http
POST /api/attempts
```

Protect using the existing authentication middleware.

### `attempt.controller.ts`

Handle:

- request body
- validation result
- service call
- HTTP status
- response formatting

No SQL.

### `attempt.service.ts`

Handle:

- submission rules
- question/option validation
- correctness decision
- duplicate behavior
- session validation
- attempt creation

### `attempt.repository.ts`

Handle:

- question lookup
- option lookup
- session lookup
- attempt insert
- attempt history/count where required

### `attempt.types.ts`

Define request, attempt and response types.

---

## 16. API Response

Correct:

```json
{
  "attempt": {
    "id": "uuid",
    "questionId": "uuid",
    "selectedOptionId": "uuid",
    "isCorrect": true,
    "submittedAt": "..."
  },
  "result": {
    "correct": true
  }
}
```

Wrong:

```json
{
  "attempt": {
    "id": "uuid",
    "questionId": "uuid",
    "selectedOptionId": "uuid",
    "isCorrect": false,
    "submittedAt": "..."
  },
  "result": {
    "correct": false
  }
}
```

Do not expose the correct option unless the current learning flow explicitly requires it.

---

## 17. HTTP Status Codes

Recommended:

```text
201 Created
    Answer successfully recorded

400 Bad Request
    Invalid request data

401 Unauthorized
    Authentication required/invalid

403 Forbidden
    Student cannot submit for this session/question

404 Not Found
    Question/session/option not found

409 Conflict
    Duplicate submission when prohibited

500 Internal Server Error
    Unexpected server/database error
```

Do not expose internal stack traces.

---

## 18. Duplicate Submission Rules

Prevent accidental duplicate attempts.

Frontend:

```text
Submit
   ↓
Submitting...
   ↓
button disabled
```

Backend must still protect against duplicate HTTP requests.

Use the existing Question Engine/session semantics to decide whether:

```text
one submission per question
```

or:

```text
multiple legitimate attempts
```

are allowed.

If multiple attempts are valid, increment `attempt_number` correctly.

If only one is allowed, reject a duplicate with the project's chosen 409/400 behavior.

Document the chosen behavior.

---

## 19. Frontend Integration

Expected module structure, if needed:

```text
client/src/modules/answer-submission/
├── api.ts
├── AnswerOption.tsx
├── SubmitAnswerButton.tsx
└── answer-submission.types.ts
```

If Module 4 already owns answer controls, do not duplicate them.

Use:

```text
Question Engine
       ↓
selected option
       ↓
Answer Submission API
       ↓
server result
```

---

## 20. Question UI Behavior

```text
Question
 ↓
Options
 ↓
Student selects one
 ↓
Submit Answer
 ↓
Checking your answer...
 ↓
Server result
 ↓
Correct / Wrong
```

Submit button requirements:

- no selection → disabled
- selected → enabled
- request in progress → disabled
- no accidental double submit

Do not calculate correctness in React.

---

## 21. Result UI

### Correct

```text
Correct

Great work.
```

### Wrong

```text
Not quite.

Let's understand why.
```

Module 5 must not generate the AI explanation. Future API Orchestration handles that transition.

### Error

```text
Couldn't submit your answer.
Please try again.
```

### Network error

```text
Couldn't connect to FIXXY.
Please try again.
```

---

## 22. FIXXY Glass UI

Maintain the existing FIXXY UI direction:

**iOS-inspired glass / glassmorphism**

Use:

- soft blue background
- frosted white cards
- translucent surfaces
- backdrop blur
- subtle light borders
- gentle highlights
- soft shadows
- rounded corners
- dark readable text
- generous spacing
- clean typography

Keep the question surface somewhat more opaque for readability.

Use the existing dark FIXXY primary button style.

Do not create a separate design system.

---

## 23. Accessibility

Answer controls must support:

- keyboard navigation
- semantic controls
- visible focus states
- accessible labels
- clear selected state
- clear disabled state
- accessible result feedback

Do not rely only on color.

---

## 24. Security Requirements

Mandatory:

```text
✅ Endpoint authenticated
✅ studentId from auth middleware
✅ Server calculates correctness
✅ Question exists check
✅ Option exists check
✅ Option-question relationship check
✅ Session ownership/state check when applicable
✅ Client cannot specify correctness
✅ Client cannot impersonate another student
✅ Safe database queries
✅ Internal errors hidden
```

---

## 25. Unit Tests

Test service logic:

```text
[ ] Valid correct answer
[ ] Valid wrong answer
[ ] Missing question
[ ] Missing option
[ ] Option belongs to another question
[ ] Invalid question ID
[ ] Invalid option ID
[ ] Missing auth identity
[ ] Invalid session
[ ] Wrong session owner
[ ] Inactive/completed session
[ ] Duplicate submission
[ ] Database error
```

---

## 26. API Integration Tests

Test `POST /api/attempts`:

```text
[ ] Correct answer returns success
[ ] Wrong answer returns success with correct=false
[ ] Missing questionId → 400
[ ] Missing selectedOptionId → 400
[ ] Invalid questionId → 400
[ ] Invalid optionId → 400
[ ] Unknown question → 404
[ ] Unknown option → 404
[ ] Option from another question → 400
[ ] No authentication → 401
[ ] Invalid authentication → 401
[ ] Invalid session handled
[ ] Wrong session owner rejected
[ ] Duplicate behavior follows defined rule
[ ] Attempt is persisted
[ ] Result matches database truth
```

---

## 27. Database Testing

Verify each attempt:

```text
student_id
question_id
selected_option_id
is_correct
attempt_number
session_id
submitted_at
```

Verify:

```text
[ ] Correct student stored
[ ] Correct question stored
[ ] Correct selected option stored
[ ] Correct is_correct value
[ ] Foreign keys work
[ ] Required fields enforced
[ ] Indexes exist
[ ] Duplicate behavior works
```

Critical security test:

```text
Client says: isCorrect = true
Database says: option is incorrect
Expected: is_correct = false
```

---

## 28. Frontend Tests

Verify:

```text
[ ] Question renders
[ ] Options render
[ ] Selection works
[ ] Submit disabled until selection
[ ] Submit enabled after selection
[ ] Submit disabled while processing
[ ] Loading state appears
[ ] Correct state appears
[ ] Wrong state appears
[ ] API error appears
[ ] Network error appears
[ ] Double-click does not create accidental duplicates
[ ] Result integrates with learning state
[ ] Glass UI works
[ ] Mobile layout works
[ ] Keyboard interaction works
```

---

## 29. End-to-End Test

Run a real browser/database flow:

```text
1. Start PostgreSQL
2. Start backend
3. Start frontend
4. Authenticate as Student A
5. Open Curriculum
6. Start a Question Engine session
7. Receive a question
8. Select an option
9. Submit answer
10. Verify API response
11. Verify attempt in PostgreSQL
12. Verify correct/wrong UI
13. Submit a wrong answer on another test question
14. Verify wrong branch
15. Verify attempt history
16. Verify session/attempt consistency
```

---

## 30. Multi-Student Authorization Test

Create:

```text
Student A
Student B
```

Test:

```text
Student A
   ↓
Session A
   ↓
Question A
   ↓
Submit
   ↓
PASS
```

Then:

```text
Student B
   ↓
Attempt Question A / Session A
   ↓
REJECT
```

Also test manipulated request fields such as `studentId` and `isCorrect`.

Expected: server ignores/rejects untrusted values and uses authenticated identity plus authoritative database correctness.

---

## 31. Regression Testing

After Module 5, rerun previous modules.

### Module 1

```text
[ ] Register
[ ] Login
[ ] GET /api/auth/me
[ ] Logout
[ ] Protected route
```

### Module 2

```text
[ ] Profile load
[ ] Profile update
[ ] Profile protection
[ ] Student isolation
```

### Module 3

```text
[ ] Curriculum list
[ ] Concept detail
[ ] Learning path
```

### Module 4

```text
[ ] Start session
[ ] Retrieve question
[ ] Correct answer remains server-side
[ ] Question/session ownership
```

---

## 32. Build Verification

Run actual repository commands.

### Frontend

```text
[ ] TypeScript check
[ ] Lint
[ ] Unit tests
[ ] Integration tests where applicable
[ ] Production build
```

### Backend

```text
[ ] TypeScript/build
[ ] Lint
[ ] Unit tests
[ ] API/integration tests
```

### Database

```text
[ ] Migrations
[ ] Schema verification
[ ] Attempt persistence
[ ] Constraint verification
```

---

## 33. Optimized Development Order

Use a vertical slice to reduce development time:

```text
1. Inspect Module 4
2. Inspect question/session schema
3. Add/adapt attempts migration
4. Implement repository
5. Implement service
6. Implement API
7. Run API tests immediately
8. Integrate frontend submission
9. Run frontend tests
10. Run E2E
11. Run security tests
12. Run full regression
13. Build production bundles
```

Reuse existing:

- authentication middleware
- database connection
- API client
- question components
- shared UI
- error handling
- test utilities

Do not refactor unrelated modules.

---

## 34. Failure Handling Loop

For every failure:

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
 ↓
Continue
```

Never:

```text
❌ Delete failing tests
❌ Weaken assertions
❌ Suppress failures
❌ Mark untested features as passed
❌ Return fake success
❌ Hide database errors
❌ Use mocked answer results in the final flow
```

---

## 35. Final Verification Matrix

| Feature | Implemented | Tested | Result |
|---|---|---|---|
| Submit correct answer | | | |
| Submit wrong answer | | | |
| Authentication protection | | | |
| Server-side correctness | | | |
| Question validation | | | |
| Option validation | | | |
| Option-question relationship | | | |
| Session validation | | | |
| Attempt persistence | | | |
| Attempt numbering | | | |
| Duplicate handling | | | |
| Correct result UI | | | |
| Wrong result UI | | | |
| Loading state | | | |
| API error | | | |
| Network error | | | |
| Glass UI | | | |
| Responsive UI | | | |
| Accessibility | | | |
| Student isolation | | | |
| Database integrity | | | |
| Module 1 regression | | | |
| Module 2 regression | | | |
| Module 3 regression | | | |
| Module 4 regression | | | |
| Backend tests | | | |
| Frontend tests | | | |
| Integration tests | | | |
| E2E tests | | | |
| Security tests | | | |
| Frontend build | | | |
| Backend build | | | |

Every implemented feature must have an actual test result.

---

## 36. Final Report

Provide:

### Files created
List every new file.

### Files modified
List every modified existing file.

### Database
Report migrations, tables, indexes and constraints.

### API
Report endpoint, request, response and status codes.

### Frontend
Report components, state handling and integration.

### Security
Report authentication, server-side correctness, authorization and student isolation.

### Testing
Report actual:

```text
Unit tests:
API tests:
Frontend tests:
E2E tests:
Security tests:
Regression tests:
```

### Build
Report actual frontend/backend build results.

### Failures fixed
List important failures and their fixes.

### Remaining issues
List only real unresolved issues.

Final status:

```text
MODULE 5 VERIFICATION: PASS
```

only when all required checks pass.

Otherwise:

```text
MODULE 5 VERIFICATION: FAIL
```

---

## 37. Definition of Done

Module 5 is complete only when:

```text
✅ Student can submit an answer
✅ Endpoint requires authentication
✅ Server identifies correct student
✅ Question is validated
✅ Selected option is validated
✅ Option-question relationship is validated
✅ Session is validated where applicable
✅ Correctness is calculated server-side
✅ Attempt is persisted
✅ Correct response works
✅ Wrong response works
✅ Duplicate behavior is defined and tested
✅ Invalid submissions are rejected
✅ Cross-student submissions are rejected
✅ Frontend loading works
✅ Frontend correct state works
✅ Frontend wrong state works
✅ API error state works
✅ Network error state works
✅ Glass UI works
✅ Responsive UI works
✅ Accessibility works
✅ Database constraints work
✅ Module 1 regression passes
✅ Module 2 regression passes
✅ Module 3 regression passes
✅ Module 4 regression passes
✅ Backend tests pass
✅ Frontend tests pass
✅ Integration tests pass
✅ E2E tests pass
✅ Security tests pass
✅ Frontend build passes
✅ Backend build passes
```

---

## 38. Final Module Boundary

```text
MODULE 4 — QUESTION ENGINE
          ↓
      Question
          ↓
MODULE 5 — ANSWER SUBMISSION
          ↓
     Authenticate
          ↓
       Validate
          ↓
   Check correctness
          ↓
      Save attempt
          ↓
      Correct/Wrong
          ↓
MODULE 8 — API ORCHESTRATION
          ↓
FastAPI diagnosis/teaching
```

Module 5 must remain a reliable, server-authoritative evidence layer for the rest of FIXXY.

> **The student chooses the answer in the browser, but the server decides what that answer means.**
