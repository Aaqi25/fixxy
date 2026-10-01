# FIXXY — Module 6: Retry / Transfer UI

> Build-ready specification for the Retry / Transfer UI module of the FIXXY Adaptive AI/ML Tutor.

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

- Overfitting
- Bias vs Variance
- Train / Validation / Test

Technology:

- Frontend: React + TypeScript + Tailwind CSS
- Main backend: Node.js + Express + TypeScript
- Database: PostgreSQL + pgvector
- AI service: Python + FastAPI + LLM + embeddings

FIXXY is divided into nine modules:

1. Authentication
2. Student Profile
3. Curriculum
4. Question Engine
5. Answer Submission
6. Retry / Transfer UI
7. Mastery Dashboard
8. API Orchestration
9. Database

The architecture separates student UI from the backend logic: Question Engine selects questions, Answer Submission checks and records answers, API Orchestration controls the learning session and AI communication, while this module presents the retry/transfer learning experience. fileciteturn1file1

---

## 2. Module Objective

Module 6 provides the student-facing experience after an incorrect answer:

```text
Wrong answer
     ↓
Teaching response
     ↓
Explanation + hint
     ↓
Retry question
     ↓
Retry result
     ↓
Transfer question
     ↓
Transfer result
     ↓
Complete / Reteach
```

The UI must render backend-controlled learning state. It must not decide correctness, mastery, or AI diagnosis.

---

## 3. Responsibility Boundary

### Included

```text
✅ Teaching response display
✅ Misconception display
✅ Explanation display
✅ Hint display
✅ Retry question UI
✅ Retry answer interaction
✅ Transfer question UI
✅ Transfer answer interaction
✅ Learning-stage indicator
✅ Feedback states
✅ Reteaching state
✅ Completion state
✅ Loading states
✅ Error states
✅ Session recovery UI
✅ Responsive FIXXY glass UI
✅ Accessibility
```

### Not included

```text
❌ Authentication
❌ Student Profile
❌ Curriculum management
❌ Question generation
❌ Question selection logic
❌ Server-side answer checking
❌ Attempt persistence
❌ Mastery calculation
❌ AI diagnosis implementation
❌ LLM calls
```

Those belong to other modules.

---

## 4. Architecture

```text
Question Engine
      ↓
Question
      ↓
Answer Submission
      ↓
Correct / Wrong
      ↓
API Orchestration
      ↓
FastAPI AI
      ↓
Teaching Response
      ↓
Retry / Transfer UI
      ↓
Answer Submission
      ↓
Retry / Transfer Result
      ↓
Mastery Dashboard
```

The browser is only the presentation/interaction layer.

---

## 5. Learning State Machine

Use the existing backend session state if already implemented. Do not create a second competing state machine.

```text
PRACTICE
   │
   ├── correct → COMPLETE
   │
   └── wrong → DIAGNOSING
                   ↓
                TEACHING
                   ↓
                 RETRY
                /     \
             wrong   correct
               │        │
               ↓        ↓
          RETEACHING  TRANSFER
                         /   \
                      fail   pass
                       │       │
                       ↓       ↓
                  RETEACHING COMPLETE
```

Suggested frontend states:

```text
TEACHING
RETRY_LOADING
RETRY_READY
RETRY_SUBMITTING
RETRY_CORRECT
RETRY_WRONG
TRANSFER_LOADING
TRANSFER_READY
TRANSFER_SUBMITTING
TRANSFER_PASS
TRANSFER_FAIL
RETEACHING
COMPLETED
ERROR
```

Backend/orchestration state is authoritative.

---

## 6. Teaching Panel

The teaching panel displays the response supplied by API Orchestration / FastAPI.

Possible response:

```json
{
  "misconceptionId": "OVERFIT_M1",
  "strategy": "analogy",
  "explanation": "A model can perform very well on training data while performing poorly on unseen data.",
  "hint": "Compare training performance with test performance.",
  "confidence": 0.86
}
```

Display:

- diagnosis/context
- explanation
- hint when provided
- teaching strategy when appropriate

Do not generate or modify AI content in the frontend.

---

## 7. Teaching UI

Recommended structure:

```text
┌─────────────────────────────────────────────┐
│              FIXXY TUTOR                    │
│                                             │
│  Let's understand what happened.            │
│                                             │
│  Explanation                                │
│  ┌───────────────────────────────────────┐  │
│  │ Personalized explanation              │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Hint                                       │
│  Compare training and test performance.     │
│                                             │
│              [ Try Again ]                  │
└─────────────────────────────────────────────┘
```

Keep the explanation prominent and easy to scan.

---

## 8. Retry Requirements

A retry question must be different from the original question.

```text
Original question
        ≠
Retry question
```

The retry should test the same concept using different wording/surface details.

Do not simply repeat the original question or show the explanation and immediately ask the same item.

The Question Engine supplies the retry question; Answer Submission evaluates it.

Module 6 only presents the interaction and renders the returned result.

---

## 9. Transfer Requirements

A transfer question checks whether the student can apply the concept to a different scenario.

```text
Original → concept understanding
Retry → immediate reapplication
Transfer → application in a different context
```

Requirements:

- different question from original
- different question from retry
- same underlying concept
- different context/surface details
- no answer revealed before submission

Example:

```text
Original:
What is overfitting?

Retry:
Which model behavior suggests overfitting?

Transfer:
A real-world scenario requires selecting the model that
will generalize best to unseen data. Apply the concept.
```

---

## 10. Question Separation

At minimum verify:

```text
originalQuestionId != retryQuestionId
retryQuestionId != transferQuestionId
originalQuestionId != transferQuestionId
```

Do not treat different wording of the same question as an acceptable transfer question.

---

## 11. Frontend Folder Structure

```text
client/
└── src/
    └── modules/
        └── retry-transfer/
            ├── api.ts
            ├── TeachingPanel.tsx
            ├── RetryPanel.tsx
            ├── TransferPanel.tsx
            ├── LearningStage.tsx
            ├── FeedbackPanel.tsx
            ├── RetryTransferPage.tsx
            ├── retry-transfer.types.ts
            └── retry-transfer.utils.ts
```

Reuse existing Question/Option components from Modules 4 and 5 when appropriate.

---

## 12. Component Responsibilities

### `TeachingPanel.tsx`

Displays:

- explanation
- hint
- misconception context
- teaching metadata where appropriate

### `RetryPanel.tsx`

Displays:

- retry question
- answer options
- submit action
- retry feedback

### `TransferPanel.tsx`

Displays:

- transfer question
- answer options
- submit action
- transfer feedback

### `LearningStage.tsx`

Displays:

```text
Teaching → Retry → Transfer
```

and clearly identifies the current stage.

### `FeedbackPanel.tsx`

Shows generic correct/wrong/reteaching/completion feedback without calculating mastery.

### `RetryTransferPage.tsx`

Coordinates the student-facing flow using the backend/orchestration state.

---

## 13. API Integration

Reuse the existing API contracts from Modules 5 and 8.

Typical flow:

```text
Wrong answer
     ↓
GET/current session or orchestration state
     ↓
Teaching response
     ↓
Retry question
     ↓
POST answer
     ↓
Retry result
     ↓
Transfer question
     ↓
POST answer
     ↓
Transfer result
```

Do not bypass the orchestration layer if the current project already provides this contract.

---

## 14. Student-Facing Data

A retry/transfer question response should expose only what the student needs:

```json
{
  "sessionId": "uuid",
  "stage": "RETRY",
  "question": {
    "id": "uuid",
    "text": "...",
    "options": [
      { "id": "uuid", "text": "..." },
      { "id": "uuid", "text": "..." },
      { "id": "uuid", "text": "..." }
    ]
  }
}
```

Never send the authoritative correct option before submission.

---

## 15. Correct / Wrong Feedback

### Correct

```text
Correct

You applied the idea successfully.
```

Do not say the concept is mastered unless a later backend/mastery module explicitly says so.

### Wrong

```text
Not quite.

Let's look at this another way.
```

Then render the next backend-controlled state.

---

## 16. Reteaching State

When retry/transfer fails according to the backend:

```text
RETEACHING
```

Example:

```text
Let's approach this from a different angle.

[ New explanation ]

[ New hint ]

[ Try Again ]
```

The new teaching content must come from the orchestration/AI layer. Module 6 must not invent AI explanations.

---

## 17. Completion State

When backend state is complete:

```text
┌────────────────────────────────────────┐
│                                        │
│                 ✓                      │
│                                        │
│          Concept Complete              │
│                                        │
│   You successfully applied the        │
│   concept to a new problem.            │
│                                        │
│       [ Continue Learning ]            │
│                                        │
└────────────────────────────────────────┘
```

Do not calculate a mastery score here.

---

## 18. Refresh / Recovery

Critical learning state must not live only in React.

If the student refreshes during:

```text
TEACHING
RETRY
TRANSFER
```

the frontend must retrieve the current session state and restore the correct stage.

Example:

```text
Student is in RETRY
       ↓
Refresh browser
       ↓
GET current session state
       ↓
Backend returns RETRY
       ↓
React restores RETRY
```

Do not reset the student to the original question unless the backend explicitly says to do so.

---

## 19. FIXXY Glass UI

Maintain the established FIXXY iOS-inspired glass design.

Use:

- soft blue background
- frosted white surfaces
- backdrop blur
- translucent panels
- thin light borders
- gentle highlights
- subtle shadows
- rounded corners
- dark readable text
- generous spacing
- modern typography

The question card should be more opaque when necessary for readability.

Use the same visual language as:

```text
Authentication
Student Profile
Curriculum
Learning screen
Tutor panel
Mastery Dashboard
```

Do not create a separate design system.

---

## 20. Main Layout

Desktop:

```text
┌────────────────────────────────────────────────────────┐
│                  FIXXY NAVIGATION                      │
├────────────────────────────┬───────────────────────────┤
│                            │                           │
│       LEARNING CARD        │       FIXXY TUTOR         │
│                            │                           │
│ Stage: Retry               │ Explanation               │
│                            │                           │
│ Question                   │ Hint                      │
│                            │                           │
│ ○ Option A                 │ Feedback                  │
│ ○ Option B                 │                           │
│ ○ Option C                 │                           │
│ ○ Option D                 │                           │
│                            │                           │
│     Submit Answer          │                           │
│                            │                           │
└────────────────────────────┴───────────────────────────┘
```

Mobile:

```text
Navigation
    ↓
Stage indicator
    ↓
Question
    ↓
Options
    ↓
Submit
    ↓
Tutor / feedback
```

---

## 21. Stage Indicator

Use:

```text
Teaching → Retry → Transfer
```

The current stage should be clearly visible.

Do not use the indicator to claim mastery or completion before the backend confirms it.

---

## 22. Interaction Rules

### Teaching

```text
[ Continue to Retry ]
```

### Retry

```text
Select answer
     ↓
Submit
     ↓
Checking...
```

### Retry correct

```text
Correct
     ↓
Continue
     ↓
Transfer
```

### Retry wrong

```text
Not quite
     ↓
Backend state
     ↓
Reteaching
```

### Transfer pass

```text
Success
     ↓
Complete
```

### Transfer fail

```text
Not yet
     ↓
Reteaching
```

---

## 23. Loading States

Implement contextual loading states:

```text
Loading explanation...
Loading retry question...
Checking your answer...
Loading transfer question...
Restoring your learning session...
```

Use existing FIXXY loading components when available.

Avoid blank pages during requests.

---

## 24. Error States

### Teaching failure

```text
Couldn't load your tutoring response.
Please try again.
```

### Retry question failure

```text
Couldn't load the retry question.
Please try again.
```

### Submission failure

```text
Couldn't submit your answer.
Please try again.
```

### Transfer failure

```text
Couldn't load the transfer question.
Please try again.
```

### Network failure

```text
Couldn't connect to FIXXY.
```

### Session restoration failure

```text
Your learning session could not be restored.

[ Return to Curriculum ]
```

Do not expose backend stack traces.

---

## 25. Accessibility

The complete flow must support:

- keyboard navigation
- semantic buttons
- accessible answer controls
- visible focus states
- clear selected state
- accessible feedback
- appropriate heading hierarchy
- readable loading/error messages

Do not rely only on color for current stage, selection, or correctness.

---

## 26. Responsive Requirements

Verify:

```text
Desktop
Laptop
Tablet
Mobile
```

Ensure:

```text
No horizontal scrolling
No clipped glass cards
No overflowing buttons
No overlapping tutor panel
Questions remain readable
Options remain usable
Primary actions remain visible
```

---

## 27. Performance / UX

Avoid unnecessary API calls.

Preferred behavior:

```text
Teaching response → fetch once per stage
Retry question → fetch once
Transfer question → fetch once
```

Do not reload the same state on every render.

Disable mutation actions while requests are in progress.

Keep transitions subtle and purposeful.

---

## 28. Security / Data Exposure

The student-facing response must never contain sensitive internal data such as:

```text
correctOptionId before submission
mastery internals
LLM API keys
database credentials
internal stack traces
private AI prompts
```

Module 6 must trust the backend state and result.

---

## 29. Component Testing

Test:

```text
[ ] TeachingPanel renders explanation
[ ] Hint renders when supplied
[ ] RetryPanel renders question
[ ] Options can be selected
[ ] Submit disabled without selection
[ ] Submit disabled during submission
[ ] Retry correct feedback works
[ ] Retry wrong feedback works
[ ] TransferPanel renders
[ ] Transfer feedback works
[ ] Reteaching state works
[ ] Completion state works
[ ] Loading states work
[ ] Error states work
```

---

## 30. API / Integration Testing

Test the real contracts used by the module:

```text
[ ] Teaching state loads
[ ] Retry question loads
[ ] Retry result loads
[ ] Transfer question loads
[ ] Transfer result loads
[ ] Invalid session handled
[ ] Expired/invalid session handled
[ ] Unauthorized request rejected
[ ] Session restoration works
```

Use mocks only where appropriate for isolated component/unit tests. Do not make mocked success the final integration behavior.

---

## 31. Functional Tests

Mandatory checks:

### Retry separation

```text
originalQuestionId != retryQuestionId
```

### Transfer separation

```text
retryQuestionId != transferQuestionId
```

### No client-side mastery

Manipulating React state must not be sufficient to claim:

```text
transfer passed
mastery increased
```

The backend must determine those outcomes.

---

## 32. End-to-End Test

Run a real browser flow:

```text
1. Authenticate
2. Open Curriculum
3. Start learning session
4. Submit an intentionally incorrect answer
5. Verify teaching state
6. Verify explanation
7. Verify hint when supplied
8. Continue to Retry
9. Verify retry question is different from original
10. Submit retry
11. Verify backend result
12. If correct, verify Transfer appears
13. Verify transfer question differs from retry
14. Submit transfer
15. Verify backend result
16. Verify completion or reteaching according to backend state
17. Refresh during a learning stage
18. Verify session restores correctly
```

---

## 33. Session Recovery Test

Explicitly test refresh at each stage:

```text
TEACHING → refresh → same valid stage
RETRY → refresh → same valid stage
TRANSFER → refresh → same valid stage
```

Do not lose the student's current session.

---

## 34. Regression Testing

After Module 6, rerun all prior module tests.

### Module 1

```text
[ ] Register
[ ] Login
[ ] /api/auth/me
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
[ ] Get question
[ ] Correct answer stays server-side
```

### Module 5

```text
[ ] Correct answer submission
[ ] Wrong answer submission
[ ] Attempt persistence
[ ] Student isolation
```

---

## 35. Build Verification

Run the project's existing commands.

Frontend:

```text
[ ] TypeScript check
[ ] Lint
[ ] Component tests
[ ] Integration tests
[ ] Production build
```

Backend:

```text
[ ] TypeScript/build
[ ] Lint
[ ] API tests
[ ] Integration tests
```

Full system:

```text
[ ] E2E tests
[ ] Regression tests
```

Do not claim a check passed unless it was actually executed.

---

## 36. Development Order

To reduce development time:

```text
1. Inspect Module 8 session/orchestration contract
2. Inspect Module 5 answer submission contract
3. Inspect existing learning/question components
4. Define stage types
5. Implement TeachingPanel
6. Implement RetryPanel
7. Integrate Module 5 submission
8. Implement TransferPanel
9. Integrate session restoration
10. Implement feedback/reteaching/completion states
11. Apply existing FIXXY glass UI
12. Run component tests
13. Run integration tests
14. Run E2E
15. Run regression
16. Build
```

Reuse existing:

- question components
- option controls
- API client
- authentication
- session contracts
- glass design system
- loading components
- error components

Do not refactor unrelated modules.

---

## 37. Failure Loop

For every failure:

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
Rerun related regression tests
```

Never:

```text
❌ delete failing tests
❌ weaken assertions
❌ suppress failures
❌ mark untested features as PASS
❌ use fake mastery state
❌ hard-code success
```

---

## 38. Final Project Structure

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
│       │   └── retry-transfer/
│       │       ├── api.ts
│       │       ├── TeachingPanel.tsx
│       │       ├── RetryPanel.tsx
│       │       ├── TransferPanel.tsx
│       │       ├── LearningStage.tsx
│       │       ├── FeedbackPanel.tsx
│       │       ├── RetryTransferPage.tsx
│       │       ├── retry-transfer.types.ts
│       │       └── retry-transfer.utils.ts
│       ├── components/
│       ├── routes/
│       ├── styles/
│       ├── App.tsx
│       └── main.tsx
│
├── server/
│   └── src/
│       └── modules/
│           ├── auth/
│           ├── profile/
│           ├── curriculum/
│           ├── questions/
│           ├── attempts/
│           └── orchestration/
│
├── ai-service/
├── contracts/
├── docs/
├── .gitignore
└── README.md
```

---

## 39. Definition of Done

Module 6 is complete only when:

```text
✅ Teaching state works
✅ Explanation displays correctly
✅ Hint displays correctly when supplied
✅ Retry question displays
✅ Retry submission uses Module 5
✅ Retry result displays correctly
✅ Wrong retry follows backend state
✅ Transfer question displays
✅ Transfer submission uses Module 5
✅ Transfer result displays correctly
✅ Retry and transfer are different questions
✅ No answer is leaked before submission
✅ No client-side mastery decision exists
✅ Session survives supported refreshes
✅ Reteaching works
✅ Completion works
✅ Loading states work
✅ Error states work
✅ Network failure handling works
✅ Glass UI works
✅ Responsive UI works
✅ Accessibility works
✅ Component tests pass
✅ API/integration tests pass
✅ E2E tests pass
✅ Module 1 regression passes
✅ Module 2 regression passes
✅ Module 3 regression passes
✅ Module 4 regression passes
✅ Module 5 regression passes
✅ Frontend build passes
✅ Backend build passes
```

---

## 40. Final Verification Matrix

| Feature | Implemented | Tested | Result |
|---|---|---|---|
| Teaching state | | | |
| Explanation | | | |
| Hint | | | |
| Retry UI | | | |
| Retry submission | | | |
| Retry result | | | |
| Transfer UI | | | |
| Transfer submission | | | |
| Transfer result | | | |
| Retry/transfer separation | | | |
| Reteaching | | | |
| Completion | | | |
| Session restoration | | | |
| Loading states | | | |
| Error states | | | |
| Network errors | | | |
| Glass UI | | | |
| Responsive UI | | | |
| Accessibility | | | |
| Security/data exposure | | | |
| Module 1 regression | | | |
| Module 2 regression | | | |
| Module 3 regression | | | |
| Module 4 regression | | | |
| Module 5 regression | | | |
| Component tests | | | |
| API/integration tests | | | |
| E2E tests | | | |
| Frontend build | | | |
| Backend build | | | |

Every implemented feature must have an actual test result.

---

## 41. Final Report Requirements

After implementation, report:

### Files Created
List every new file.

### Files Modified
List every modified existing file.

### API Integration
List the contracts/endpoints used.

### Frontend
List components, routes, and state changes.

### UI
Confirm the FIXXY glass design implementation.

### Testing
Report actual:

```text
Component tests:
API/integration tests:
E2E tests:
Regression tests:
```

### Build
Report actual frontend/backend build results.

### Failures Fixed
List meaningful failures and their fixes.

### Remaining Issues
List only real unresolved issues.

Final status:

```text
MODULE 6 VERIFICATION: PASS
```

only when all required checks pass.

Otherwise:

```text
MODULE 6 VERIFICATION: FAIL
```

---

## 42. Core Principle

> **Module 6 controls what the student sees and interacts with; the backend controls what the student's interaction means.**

Final responsibility boundary:

```text
Module 4 — Question Engine
          ↓
       Question
          ↓
Module 5 — Answer Submission
          ↓
    Correct / Wrong
          ↓
Module 8 — API Orchestration
          ↓
Teaching / Session State
          ↓
Module 6 — Retry / Transfer UI
          ↓
Retry → Transfer → Complete/Reteach
          ↓
Module 7 — Mastery Dashboard
```

Keep Module 6 focused on the learning experience and ready for integration with the remaining FIXXY modules.
