# FIXXY — Module 8: API Orchestration

## 1. Module Overview

**Module Name:** API Orchestration  
**Module Number:** 8  
**Project:** FIXXY — Adaptive AI/ML Tutor

Module 8 is the integration layer that coordinates the existing FIXXY learning modules into one reliable learning flow.

Its primary responsibility is to make the complete learning loop work across the system without duplicating the business logic owned by Modules 1–7.

### Core FIXXY Learning Loop

```text
Student answers a question
        ↓
Answer is checked
        ↓
Correct? ─────────────── Yes ──→ Continue / Complete
   │
   No
   ↓
Misconception diagnosis
   ↓
Personalized teaching
   ↓
Retry question
   ↓
Retry result
   ↓
Transfer question
   ↓
Transfer result
   ↓
Mastery update
   ↓
Completion / Reteaching
```

Module 8 coordinates this flow. It does not replace the modules that perform the individual operations.

---

# 2. Module Objective

Module 8 must provide a consistent backend orchestration layer that coordinates:

- Authentication
- Curriculum
- Question Engine
- Answer Submission
- AI misconception diagnosis and teaching
- Retry / Transfer progression
- Learning session state
- Mastery updates
- Frontend learning-flow responses

The result should be a single, predictable learning experience for the student.

---

# 3. Responsibility Boundary

## Module 8 Owns

- Learning-flow orchestration
- Service-to-service coordination
- Learning session progression
- State transition coordination
- Orchestration request/response DTOs
- Consistent API error handling
- Session restoration coordination
- Duplicate-submission protection where required
- Data consistency across coordinated operations
- Integration between backend modules

## Module 8 Does NOT Own

### Module 1 — Authentication

Responsible for:

- Registration
- Login
- JWT/session handling
- Authentication middleware
- Logout

### Module 2 — Student Profile

Responsible for:

- Student profile
- Learning preferences
- Profile persistence

### Module 3 — Curriculum

Responsible for:

- Concepts
- Learning objectives
- Prerequisites
- Curated learning content
- Misconception definitions

### Module 4 — Question Engine

Responsible for:

- Question storage
- Question selection
- Practice questions
- Retry questions
- Transfer questions
- Question safety / answer-key protection

### Module 5 — Answer Submission

Responsible for:

- Answer validation
- Server-side correctness checking
- Attempt recording
- Duplicate answer handling

### Module 6 — Retry / Transfer UI

Responsible for:

- Teaching display
- Retry UI
- Transfer UI
- Reteaching UI
- Learning-state presentation
- Student interaction

### Module 7 — Mastery Dashboard

Responsible for:

- Mastery calculation
- Mastery persistence
- Mastery aggregation
- Mastery dashboard
- Learning insights

### Module 8 Principle

> **Module 8 coordinates these responsibilities; it must not duplicate them.**

---

# 4. Architecture

```text
┌───────────────────────────────┐
│        React Frontend         │
│      Module 6 / UI Layer      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     Module 8 Orchestration    │
│                               │
│  Learning Flow Coordinator    │
│  Session Progression          │
│  Response DTOs                │
│  Error Coordination           │
└───────┬───────┬───────┬──────┘
        │       │       │
        ▼       ▼       ▼
   Question   Answer   Mastery
    Engine    Engine   Service
     M4        M5        M7
        │       │
        └───┬───┘
            ▼
      AI Service
   Diagnosis/Teaching
            │
            ▼
       PostgreSQL
```

If Modules 1–7 already exist inside the same backend application, prefer direct service calls instead of unnecessary internal HTTP calls.

The FastAPI AI service should be called only when AI processing is actually required.

---

# 5. Core State Machine

The existing FIXXY learning state machine should be preserved and orchestrated consistently.

```text
                    ┌──────────────┐
                    │   PRACTICE   │
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
             Correct                Wrong
                │                     │
                ▼                     ▼
            COMPLETE             DIAGNOSING
                                      │
                                      ▼
                                   TEACHING
                                      │
                                      ▼
                                    RETRY
                                  /       \
                              Wrong       Correct
                                │            │
                                ▼            ▼
                          RETEACHING     TRANSFER
                                             /   \
                                         Fail     Pass
                                           │        │
                                           ▼        ▼
                                      RETEACHING COMPLETE
```

The exact state names must match the existing session implementation. Do not create conflicting duplicate state definitions.

---

# 6. Important State Rules

### PRACTICE

Student receives the initial practice question.

### Correct Practice Answer

- Record the attempt through Module 5.
- Update the session using the existing rules.
- Complete the learning step where appropriate.
- Trigger mastery update when required.

### Wrong Practice Answer

- Record the attempt.
- Request misconception diagnosis.
- Request personalized teaching.
- Move session to retry.
- Request a distinct retry question.

### Wrong Retry Answer

- Record the retry attempt.
- Move into reteaching according to existing rules.
- Preserve the session and learning evidence.

### Correct Retry Answer

- Record the attempt.
- Move to transfer.
- Request a distinct transfer question.

### Failed Transfer

- Record the attempt.
- Move to reteaching.
- Continue the learning cycle according to existing rules.

### Passed Transfer

- Record the attempt.
- Complete the learning session.
- Trigger Module 7 mastery update.

---

# 7. Session Model

Module 8 should reuse the existing learning-session model whenever possible.

A session may contain or reference:

```text
id
student_id
concept_id
current_question_id
current_stage
state
created_at
updated_at
completed_at
```

The actual schema must follow the existing project database model.

### Important Rules

- Student identity comes from authenticated server context.
- The browser must not control the authoritative state.
- Browser refresh must not restart a learning session.
- A session belongs to exactly one student.
- Invalid state transitions must be rejected.
- Duplicate submissions must not cause duplicate progression.

---

# 8. Session Creation

Where an equivalent endpoint does not already exist, support a session-start operation such as:

```http
POST /api/learning/sessions
```

Example request:

```json
{
  "conceptId": "uuid"
}
```

Example response:

```json
{
  "sessionId": "uuid",
  "state": "PRACTICE",
  "concept": {
    "id": "uuid",
    "title": "Overfitting"
  },
  "question": {
    "id": "uuid",
    "questionText": "...",
    "options": []
  }
}
```

Do not expose answer keys.

---

# 9. Session Restoration

Support restoration through an endpoint such as:

```http
GET /api/learning/sessions/:sessionId
```

The response should represent persisted server state.

Example fields:

```json
{
  "sessionId": "uuid",
  "state": "RETRY",
  "conceptId": "uuid",
  "stage": "RETRY",
  "question": {
    "id": "uuid",
    "questionText": "...",
    "options": []
  },
  "teaching": {
    "misconceptionId": "uuid",
    "strategy": "EXAMPLE",
    "explanation": "...",
    "hint": "..."
  }
}
```

The actual DTO should be adapted to the existing session implementation.

---

# 10. Primary Answer-Orchestration API

Where appropriate, provide a unified endpoint such as:

```http
POST /api/learning/answer
```

Example request:

```json
{
  "sessionId": "uuid",
  "questionId": "uuid",
  "selectedOptionId": "uuid"
}
```

Module 8 should coordinate the full response.

A response can contain:

```json
{
  "sessionId": "uuid",
  "state": "RETRY",
  "result": {
    "isCorrect": false
  },
  "teaching": {
    "misconceptionId": "uuid",
    "strategy": "EXAMPLE",
    "explanation": "...",
    "hint": "...",
    "confidence": 0.91
  },
  "nextQuestion": {
    "id": "uuid",
    "questionText": "...",
    "options": []
  }
}
```

The actual response should follow the project's established API contract.

---

# 11. Answer Processing Flow

For every answer request:

```text
Request received
      ↓
Authentication
      ↓
Get authenticated studentId
      ↓
Validate session ownership
      ↓
Validate question/session relationship
      ↓
Module 5 checks answer
      ↓
Attempt persisted
      ↓
Module 8 determines next orchestration step
```

Module 8 must not independently calculate correctness.

The source of correctness is Module 5.

---

# 12. Wrong Answer Orchestration

```text
Wrong answer
     ↓
Attempt recorded
     ↓
Diagnosis requested
     ↓
Misconception identified
     ↓
Teaching generated
     ↓
Session → RETRY
     ↓
Retry question requested
     ↓
Retry returned to frontend
```

The Question Engine owns retry question selection.

The AI service owns diagnosis and teaching.

Module 8 coordinates both.

---

# 13. Retry Orchestration

```text
Retry answer submitted
        ↓
Module 5 validates/checks answer
        ↓
Attempt recorded
        ↓
Correct?
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ▼         ▼
TRANSFER  RETEACHING
```

For a correct retry:

- update session state
- obtain transfer question
- return transfer state

For an incorrect retry:

- preserve attempt
- enter reteaching
- request/reuse appropriate teaching
- continue session safely

---

# 14. Transfer Orchestration

```text
Transfer answer submitted
        ↓
Module 5 checks answer
        ↓
Attempt recorded
        ↓
Passed?
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ▼         ▼
COMPLETE  RETEACHING
   │
   ▼
Mastery update
```

Module 8 must not calculate the mastery score.

Module 7 remains the source of truth for official mastery.

---

# 15. AI Service Integration

The AI service is responsible for tasks such as:

- misconception diagnosis
- explanation generation
- teaching strategy
- hint generation

Module 8 coordinates these calls but does not duplicate AI logic.

### AI Failure Behavior

If the AI service fails:

- preserve the submitted answer
- preserve the attempt record
- preserve the session
- do not create duplicate attempts
- do not falsely mark mastery
- return a controlled recoverable error
- allow the user to retry/recover according to the existing UX

The core learning evidence must not be lost simply because the AI service is temporarily unavailable.

---

# 16. Mastery Integration

Module 8 should trigger Module 7 after relevant learning events.

Examples:

- successful practice completion
- successful retry
- successful transfer
- other learning events defined by Module 7

Module 8 should call the mastery service or existing mastery update mechanism.

It must NOT contain the official mastery formula.

### Responsibility

```text
Module 8 → tells Module 7 that learning evidence changed
Module 7 → calculates and persists mastery
```

---

# 17. Security Rules

Every orchestration endpoint must require authentication.

### Student Identity

Always use:

```ts
req.user.studentId
```

Never trust:

```json
{
  "studentId": "..."
}
```

sent by the browser.

### Session Ownership

A student may access only their own learning sessions.

### State Protection

The client must not be able to submit:

```json
{
  "state": "COMPLETE"
}
```

and force completion.

### Correctness Protection

The client must not be able to submit:

```json
{
  "isCorrect": true
}
```

and override server-side correctness.

### Mastery Protection

The client must not be able to submit:

```json
{
  "masteryScore": 100
}
```

and manipulate official mastery.

---

# 18. API Error Model

Reuse the project's existing global error format. Where no standard exists, use a consistent structure such as:

```json
{
  "error": {
    "code": "SESSION_INVALID",
    "message": "Learning session is no longer valid."
  }
}
```

Potential error codes:

- AUTH_REQUIRED
- FORBIDDEN
- SESSION_NOT_FOUND
- SESSION_INVALID
- INVALID_STATE_TRANSITION
- QUESTION_NOT_IN_SESSION
- INVALID_OPTION
- DUPLICATE_SUBMISSION
- AI_SERVICE_UNAVAILABLE
- MASTERY_UPDATE_FAILED
- INTERNAL_ERROR

Do not expose stack traces or internal infrastructure details.

---

# 19. HTTP Statuses

Use status codes consistent with the existing project.

Typical mappings:

| Status | Use |
|---|---|
| 400 | Invalid request |
| 401 | Authentication required/invalid |
| 403 | Student/session authorization failure |
| 404 | Session/question not found |
| 409 | Duplicate/conflicting submission or state |
| 422 | Validation failure where supported |
| 500 | Internal server error |
| 503 | Temporarily unavailable dependency such as AI service |

---

# 20. Idempotency and Duplicate Submissions

Students may double-click submit or resend a request because of network issues.

The orchestration layer must prevent duplicate progression.

A duplicate request must not cause:

- duplicate attempt records
- multiple retry questions
- multiple transfer questions
- multiple completion events
- multiple mastery increments

Reuse Module 5 duplicate-submission rules where possible.

Use database constraints or idempotency logic when required by the existing architecture.

---

# 21. Concurrency

Handle simultaneous requests safely.

Example:

```text
Two identical answer requests arrive at the same time
                    ↓
              Same session
                    ↓
       Only one state transition
                    ↓
       No duplicate progression
```

Use the project's existing transaction and database-locking strategies where appropriate.

Do not introduce a new concurrency framework unless necessary.

---

# 22. Frontend Contract

Module 8 should simplify communication between the frontend and backend.

The frontend should not need to know which internal service performed each operation.

React should:

- send the student's action
- display the returned state
- render teaching/retry/transfer content
- show loading state
- show errors
- recover when possible

React must not decide:

- correctness
- mastery
- official session state
- transfer success
- completion

---

# 23. Recommended Backend Structure

Follow the existing server structure. If a new orchestration module is required, a structure such as this is appropriate:

```text
server/src/modules/orchestration/
├── orchestration.controller.ts
├── orchestration.service.ts
├── orchestration.routes.ts
├── orchestration.types.ts
├── orchestration.schemas.ts
└── orchestration.errors.ts
```

Use existing shared folders for authentication, database, middleware, and API utilities.

Do not duplicate infrastructure already present elsewhere.

---

# 24. Recommended Contract Structure

If the project already has a shared contracts folder:

```text
contracts/
├── learning-session.ts
├── learning-state.ts
├── answer.ts
├── teaching.ts
├── question.ts
└── orchestration.ts
```

Adapt to the actual repository instead of duplicating contracts unnecessarily.

---

# 25. Development Strategy

To reduce development time without removing features, implement Module 8 as focused vertical slices.

## Slice 1 — Core Answer Flow

```text
Session
→ Practice Question
→ Answer
→ Correct/Wrong
→ Persist Session State
```

## Slice 2 — Wrong Answer

```text
Wrong
→ Diagnosis
→ Teaching
→ Retry
```

## Slice 3 — Retry

```text
Retry
→ Correct
→ Transfer
```

and:

```text
Retry
→ Wrong
→ Reteaching
```

## Slice 4 — Transfer

```text
Transfer
→ Pass
→ Complete
→ Mastery Update
```

and:

```text
Transfer
→ Fail
→ Reteaching
```

## Slice 5 — Reliability

Add:

- refresh recovery
- duplicate submission protection
- concurrency handling
- API errors
- AI failure recovery
- security isolation

## Slice 6 — Full Regression

Run all Module 1–7 tests and the complete learning E2E flow.

---

# 26. Performance Guidelines

Avoid unnecessary calls.

Do not:

- call the same service twice for the same event without reason
- request the same question repeatedly
- call AI unnecessarily
- recalculate mastery multiple times for one learning event
- create duplicate attempts
- poll the backend unnecessarily

Reuse information already available during the orchestration request.

---

# 27. Observability and Logging

Reuse the existing logging framework.

Useful orchestration events include:

- session started
- answer received
- answer evaluated
- state transition
- AI diagnosis requested
- teaching generated
- retry created/selected
- transfer created/selected
- session completed
- mastery update requested
- orchestration error

Never log:

- passwords
- JWT secrets
- private tokens
- database credentials
- unnecessary sensitive data

---

# 28. Testing Strategy

Module 8 must be tested at multiple levels.

```text
Unit Tests
    ↓
Service / Integration Tests
    ↓
API Tests
    ↓
Security Tests
    ↓
Database Tests
    ↓
Frontend Integration Tests
    ↓
E2E Browser Tests
    ↓
Modules 1–7 Regression
```

Do not consider the module complete only because individual unit tests pass.

---

# 29. Unit Tests

Test:

- session creation
- correct practice answer
- incorrect practice answer
- diagnosis transition
- teaching transition
- retry transition
- correct retry
- incorrect retry
- transfer transition
- successful transfer
- failed transfer
- reteaching
- completion
- invalid transitions
- duplicate submissions
- deterministic orchestration behavior

---

# 30. API Integration Tests

Test all implemented endpoints.

For example:

```http
POST /api/learning/sessions
GET /api/learning/sessions/:sessionId
POST /api/learning/answer
```

Verify:

- authentication
- request validation
- response schema
- state transitions
- persisted state
- attempt persistence
- retry selection
- transfer selection
- mastery integration
- error behavior

---

# 31. Security Tests

### Student Isolation

Student A must not be able to:

- retrieve Student B's session
- submit answers to Student B's session
- force Student B's session state
- read Student B's learning data

### Client Tampering

Attempt to submit:

```json
{
  "studentId": "another-student-id"
}
```

```json
{
  "isCorrect": true
}
```

```json
{
  "masteryScore": 100
}
```

```json
{
  "state": "COMPLETE"
}
```

These values must never override authoritative backend logic.

---

# 32. State Machine Tests

Every valid transition must be tested.

```text
PRACTICE → COMPLETE

PRACTICE → DIAGNOSING → TEACHING → RETRY

RETRY → RETEACHING

RETRY → TRANSFER

TRANSFER → RETEACHING

TRANSFER → COMPLETE
```

Invalid transitions must also be rejected.

---

# 33. Question Separation Tests

Verify that the Question Engine provides distinct questions where required:

```text
Practice Question
      ≠
Retry Question
      ≠
Transfer Question
```

Module 8 should never expose a repeated question simply because orchestration logic accidentally requested the wrong stage.

---

# 34. AI Failure Tests

Mock or test FastAPI failure.

Verify:

```text
Student answer
→ Answer persisted
→ AI request fails
→ Controlled recoverable error
→ Session preserved
```

There must not be:

- lost attempt
- duplicate attempt
- fake mastery increase
- invalid session completion

---

# 35. Mastery Integration Tests

Test the full path:

```text
Practice
→ Wrong
→ Retry Correct
→ Transfer Correct
→ Complete
→ Mastery Update
→ Module 7 Dashboard
```

Verify the mastery dashboard reflects the persisted learning evidence.

Module 8 should trigger the update; Module 7 should calculate the official score.

---

# 36. Browser / E2E Test

Run a real browser-level flow where browser testing infrastructure exists.

Required flow:

```text
Login
  ↓
Curriculum
  ↓
Start Concept
  ↓
Practice Question
  ↓
Submit Wrong Answer
  ↓
Teaching
  ↓
Retry
  ↓
Retry Correct
  ↓
Transfer
  ↓
Transfer Correct
  ↓
Complete
  ↓
Mastery Updated
  ↓
Mastery Dashboard
```

Also test:

- wrong retry
- failed transfer
- browser refresh during a session
- duplicate submit
- network/API failure
- AI failure handling
- logout/login recovery

---

# 37. Regression Testing

Module 8 must not break existing modules.

Run regression tests for:

### Module 1
Authentication

### Module 2
Student Profile

### Module 3
Curriculum

### Module 4
Question Engine

### Module 5
Answer Submission

### Module 6
Retry / Transfer UI

### Module 7
Mastery Dashboard

Also verify the complete learning flow after regression testing.

---

# 38. Build Verification

Run the project's existing commands for:

- backend build
- frontend build
- TypeScript type checking
- linting where configured
- unit tests
- integration/API tests
- E2E tests

Do not weaken the build or test configuration to make the module appear successful.

---

# 39. Failure-Recovery Rules

When an operation fails:

1. Preserve valid data.
2. Return a controlled error.
3. Keep the session recoverable.
4. Prevent duplicate state transitions.
5. Do not fabricate results.
6. Allow retry when safe.

Example:

```text
Answer recorded
      ↓
AI unavailable
      ↓
Session remains valid
      ↓
User can retry the orchestration step
```

---

# 40. Documentation Requirements

Module 8 documentation should include:

- purpose
- architecture
- service responsibilities
- state machine
- session model
- API endpoints
- request/response contracts
- authentication requirements
- security rules
- error handling
- idempotency
- concurrency considerations
- AI failure behavior
- mastery integration
- testing strategy

---

# 41. Verification Matrix

At the end of implementation, record real results in a matrix like this:

| Area | Result | Evidence |
|---|---|---|
| Session creation | PASS | `scripts/test-orchestration-api.ts` & `test-e2e-orchestration.ts` Step 3 |
| Session restoration | PASS | `scripts/test-orchestration-api.ts` Step 5 (Refresh) & `test-e2e-orchestration.ts` |
| Practice flow | PASS | `scripts/test-orchestration-api.ts` Step 4 & `test-e2e-orchestration.ts` Step 4 |
| Wrong-answer flow | PASS | `scripts/test-orchestration-api.ts` Step 4 (Transitions to RETRY with Diagnosis) |
| Diagnosis integration | PASS | `scripts/test-orchestration-api.ts` & `orchestration.ai.client.ts` |
| Teaching flow | PASS | `scripts/test-orchestration-api.ts` (Strategy, Explanation, Hint returned) |
| Retry flow | PASS | `scripts/test-orchestration-api.ts` Steps 6-8 & `test-e2e-orchestration.ts` Step 6 |
| Transfer flow | PASS | `scripts/test-orchestration-api.ts` Steps 9-10 & `test-e2e-orchestration.ts` Step 7 |
| Reteaching | PASS | `scripts/test-orchestration-api.ts` Step 6 (Retry wrong -> Reteaching) |
| Completion | PASS | `scripts/test-orchestration-api.ts` Step 10 & `test-e2e-orchestration.ts` Step 7 |
| Mastery integration | PASS | `scripts/test-orchestration-api.ts` Step 12 & `test-e2e-orchestration.ts` Step 8 |
| AI failure recovery | PASS | `scripts/test-orchestration-api.ts` Step 16 (Attempt saved in DB, 503 returned) |
| Duplicate submission protection | PASS | `scripts/test-orchestration-api.ts` Step 15 (409 Conflict within 2s) |
| Concurrency handling | PASS | `scripts/test-orchestration-api.ts` (Atomic session progression) |
| Student isolation | PASS | `scripts/test-orchestration-api.ts` Step 14 (403 Forbidden for Student B) |
| Client tampering protection | PASS | `scripts/test-orchestration-api.ts` Step 14 (Ignored client isCorrect/mastery/studentId) |
| Database consistency | PASS | PostgreSQL row checks in `test-orchestration-api.ts` and `test-e2e-orchestration.ts` |
| Frontend integration | PASS | `client/src/test/Orchestration.test.tsx` (8/8) & 107/107 Client Tests Passed |
| Module 1 regression | PASS | `scripts/test-runner.ts` (Authentication tests passed) |
| Module 2 regression | PASS | `scripts/test-runner.ts` (Profile tests passed) |
| Module 3 regression | PASS | `scripts/test-runner.ts` (Curriculum tests passed) |
| Module 4 regression | PASS | `scripts/test-runner.ts` (Question Engine tests passed) |
| Module 5 regression | PASS | `scripts/test-unit-attempt.ts` & `test-runner.ts` (Attempt tests passed) |
| Module 6 regression | PASS | `scripts/test-session-api.ts` (47/47 tests passed) |
| Module 7 regression | PASS | `scripts/test-mastery-api.ts` (70/70) & `test-unit-mastery.ts` passed |
| Backend build | PASS | `npm run build` (tsc --project tsconfig.json exited 0) |
| Frontend build | PASS | `npm run build` (tsc -b && vite build exited 0) |

Only mark **PASS** after actual execution.

---

# 42. Definition of Done

Module 8 is complete only when:

- Authentication integration works
- Session creation works
- Session restoration works
- Practice orchestration works
- Wrong-answer orchestration works
- AI diagnosis integration works
- Personalized teaching integration works
- Retry orchestration works
- Reteaching flow works
- Transfer orchestration works
- Completion works
- Mastery update integration works
- API errors are handled correctly
- AI failure is recoverable
- Duplicate submission is protected
- Concurrent requests are handled safely
- Student data is isolated
- Client tampering cannot override backend decisions
- Frontend integration works
- Unit tests pass
- API/integration tests pass
- Security tests pass
- Database tests pass
- E2E/browser tests pass
- Modules 1–7 regression tests pass
- Frontend build passes
- Backend build passes
- Verification matrix is completed

---

# 43. Development-Time Optimization Rules

The implementation should be fast because it reuses the existing FIXXY architecture.

### Reuse

Reuse existing:

- authentication middleware
- database connection
- repositories
- services
- session model
- API client
- DTOs/contracts
- error handlers
- logging
- test utilities
- frontend UI components

### Avoid

- duplicate business logic
- unnecessary libraries
- duplicate API clients
- duplicate state machines
- duplicate database tables
- broad refactors
- unrelated UI redesigns
- changes to working Modules 1–7 unless integration requires them

### Efficient Build Pattern

```text
Inspect
  ↓
Reuse
  ↓
Build one vertical slice
  ↓
Test immediately
  ↓
Expand flow
  ↓
Test again
  ↓
Add reliability/security
  ↓
Full regression
```

This reduces debugging time while preserving the complete feature set.

---

# 44. Final Architecture Principle

FIXXY should remain modular.

```text
Module 1 → Who is the student?
Module 2 → What are the student's preferences?
Module 3 → What should the student learn?
Module 4 → Which question should the student receive?
Module 5 → Is the answer correct?
Module 6 → How is the learning experience displayed?
Module 7 → How much has the student mastered?
Module 8 → How do all these modules work together?
```

Therefore:

> **Module 8 is the conductor, not the owner of every instrument.**

It should coordinate the complete FIXXY learning loop while keeping each existing module responsible for its own domain.

---

# 45. Final Success Condition

The complete FIXXY flow must work reliably from:

```text
Login
→ Curriculum
→ Start Learning
→ Practice
→ Answer
→ Diagnosis
→ Teaching
→ Retry
→ Transfer
→ Completion
→ Mastery Update
→ Mastery Dashboard
```

with secure student isolation, persisted session state, controlled failures, consistent APIs, and verified automated/browser tests.
