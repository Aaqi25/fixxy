# FIXXY — Module 3: Curriculum

> Build-ready specification for the Curriculum module of the FIXXY Adaptive AI/ML Tutor.

## 1. Project Context

FIXXY is an adaptive AI/ML tutor built around:

Student makes a mistake → misconception diagnosis → personalized teaching → retry → transfer → updated mastery.

Initial MVP concepts:

1. Overfitting
2. Bias vs Variance
3. Train / Validation / Test

Technology stack:

- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- AI service: Python + FastAPI
- Database: PostgreSQL + pgvector
- LLM + embeddings for future AI support

Project modules:

1. Authentication
2. Student Profile
3. Curriculum
4. Question Engine
5. Answer Submission
6. Retry / Transfer UI
7. Mastery Dashboard
8. API Orchestration
9. Database

Recommended build order:

```text
9 → 1 → 2 → 3 → 4 → 5 → 8 → 6 → 7
```

---

# 2. Module 3 Objective

The Curriculum module defines **what FIXXY teaches and how the learning content is organized**.

It provides:

- Concept catalog
- Concept details
- Learning objectives
- Difficulty
- Estimated learning time
- Prerequisites
- Misconception definitions
- Curated teaching content
- Configured learning order
- Learning-path foundation
- Student-facing curriculum UI

Later modules consume this data.

```text
Curriculum
    ↓
Question Engine
    ↓
Answer Submission
    ↓
API Orchestration
    ↓
Retry / Transfer
    ↓
Mastery
```

---

# 3. Responsibility Boundary

## Included

```text
✅ Concepts
✅ Concept details
✅ Learning objectives
✅ Difficulty
✅ Estimated duration
✅ Prerequisites
✅ Misconceptions
✅ Curated content
✅ Learning path
✅ Curriculum API
✅ Curriculum UI
✅ Concept detail UI
✅ Loading states
✅ Empty states
✅ Error states
✅ Responsive glass UI
✅ Database migrations
✅ Seed data
```

## Not included

```text
❌ Authentication
❌ Login/register/logout
❌ Student profile editing
❌ Question answering
❌ Answer checking
❌ Attempt scoring
❌ Retry evaluation
❌ Transfer evaluation
❌ Mastery calculation
❌ AI diagnosis
❌ LLM orchestration
```

---

# 4. Architecture

```text
                    STUDENT
                       │
                       ▼
              React Curriculum UI
                       │
                       ▼
              Node.js + Express
                       │
                       ▼
              Curriculum Controller
                       │
                       ▼
                Curriculum Service
                       │
                       ▼
              Curriculum Repository
                       │
                       ▼
                   PostgreSQL
```

The AI service does not need to be called directly by Module 3.

Future AI usage:

```text
Curriculum
    ↓
FastAPI / AI
    ↓
Diagnosis + Teaching
```

---

# 5. Core MVP Curriculum

The first curriculum must include exactly these initial MVP concepts:

```text
1. Overfitting
2. Bias vs Variance
3. Train / Validation / Test
```

These should be database-driven.

Do not hard-code the curriculum in React.

---

# 6. Concept Model

Create:

```text
concepts
```

Recommended fields:

```text
id
slug
title
short_description
description
difficulty_level
estimated_minutes
learning_objective
status
display_order
created_at
updated_at
```

### Field definitions

`id`
- UUID primary key.

`slug`
- Stable URL-safe identifier.
- Example: `overfitting`.

`title`
- Student-facing concept name.

`short_description`
- Short summary for the curriculum card.

`description`
- Detailed concept introduction.

`difficulty_level`
- Suggested:
  - BEGINNER
  - INTERMEDIATE
  - ADVANCED

`estimated_minutes`
- Approximate learning time.

`learning_objective`
- What a student should understand after studying the concept.

`status`
- Suggested:
  - ACTIVE
  - DRAFT
  - ARCHIVED

`display_order`
- Controls default curriculum ordering.

---

# 7. Initial Concept Data

## Overfitting

Suggested metadata:

```text
slug:
overfitting

title:
Overfitting

difficulty:
BEGINNER

estimated_minutes:
15
```

Learning objective:

```text
Recognize overfitting and explain why strong training performance
does not guarantee good performance on unseen data.
```

## Bias vs Variance

```text
slug:
bias-vs-variance

title:
Bias vs Variance

difficulty:
BEGINNER

estimated_minutes:
20
```

Learning objective:

```text
Explain bias, variance, underfitting, overfitting, and the
trade-off between model complexity and generalization.
```

## Train / Validation / Test

```text
slug:
train-validation-test

title:
Train / Validation / Test

difficulty:
BEGINNER

estimated_minutes:
15
```

Learning objective:

```text
Explain the different roles of training, validation, and test
datasets during model development and evaluation.
```

---

# 8. Prerequisite Model

Create:

```text
concept_prerequisites
```

Fields:

```text
concept_id
prerequisite_concept_id
```

Relationship:

```text
Concept B
    ↑
requires
    ↑
Concept A
```

Example:

```text
Concept A → prerequisite → Concept B
```

The database/service layer should prevent:

```text
A → A
```

and should detect invalid cyclic relationships such as:

```text
A → B
B → A
```

Do not rely on the frontend to enforce prerequisite validity.

---

# 9. Misconception Model

Curriculum owns educator-defined misconception categories.

Create:

```text
misconceptions
```

Recommended fields:

```text
id
concept_id
code
title
description
guidance
active
created_at
updated_at
```

The `code` must be stable.

Example:

```json
{
  "code": "OVERFIT_M1",
  "title": "Training accuracy means generalization",
  "description": "The student assumes high training accuracy guarantees strong unseen-data performance.",
  "guidance": "Contrast training performance with validation/test performance.",
  "active": true
}
```

Misconception codes will later be used by the Question Engine and FastAPI AI service.

---

# 10. Curated Content Model

Create:

```text
concept_content
```

Recommended fields:

```text
id
concept_id
content_type
title
body
display_order
active
created_at
updated_at
```

Suggested content types:

```text
OVERVIEW
KEY_IDEA
EXAMPLE
ANALOGY
COMMON_MISTAKE
SUMMARY
```

This lets FIXXY maintain curated teaching material independently of question data.

---

# 11. Database Migrations

Use the existing migration system.

Recommended migrations:

```text
003_create_concepts.sql
004_create_concept_prerequisites.sql
005_create_misconceptions.sql
006_create_concept_content.sql
```

Foreign-key relationships:

```text
concept_prerequisites.concept_id
    → concepts.id

concept_prerequisites.prerequisite_concept_id
    → concepts.id

misconceptions.concept_id
    → concepts.id

concept_content.concept_id
    → concepts.id
```

Add appropriate indexes for:

```text
concept.slug
concept.display_order
misconception.code
content.concept_id
```

Use uniqueness constraints where appropriate.

---

# 12. Seed Data

Create reproducible curriculum seed data.

Suggested:

```text
server/db/seeds/curriculum.seed.ts
```

Seed:

```text
3 concepts
relevant prerequisites
misconceptions
curated content
```

The seed must be idempotent.

Running it multiple times must not create uncontrolled duplicates.

Use stable identifiers:

```text
concept slugs
misconception codes
```

---

# 13. Backend Folder Structure

```text
server/
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── profile/
│   │   │
│   │   └── curriculum/
│   │       ├── curriculum.controller.ts
│   │       ├── curriculum.routes.ts
│   │       ├── curriculum.service.ts
│   │       ├── curriculum.repository.ts
│   │       └── curriculum.types.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── db/
│   ├── migrations/
│   │   ├── 001_create_students.sql
│   │   ├── 002_create_student_profiles.sql
│   │   ├── 003_create_concepts.sql
│   │   ├── 004_create_concept_prerequisites.sql
│   │   ├── 005_create_misconceptions.sql
│   │   └── 006_create_concept_content.sql
│   │
│   └── seeds/
│       └── curriculum.seed.ts
│
└── ...
```

Follow existing repository conventions if the project already has an established equivalent structure.

---

# 14. Backend Responsibilities

## `curriculum.routes.ts`

Map:

```text
GET /api/curriculum/concepts
GET /api/curriculum/concepts/:slug
GET /api/curriculum/path
```

## `curriculum.controller.ts`

Responsible for:

- request parsing
- HTTP status codes
- response shape
- error translation

No direct SQL.

## `curriculum.service.ts`

Responsible for:

- concept business logic
- prerequisite validation
- concept ordering
- assembling curriculum responses

## `curriculum.repository.ts`

Responsible for:

- SQL/database queries
- concept retrieval
- prerequisite retrieval
- misconception retrieval
- content retrieval

## `curriculum.types.ts`

Contains:

- domain types
- DTOs
- API response types
- controlled values

---

# 15. API

Base path:

```text
/api/curriculum
```

## Endpoint 1

```http
GET /api/curriculum/concepts
```

Purpose:

Return available curriculum concepts.

Requirements:

- ordered by `display_order`
- only appropriate published/active records
- no hard-coded data in the API
- database is the source of truth

Example:

```json
{
  "concepts": [
    {
      "id": "uuid",
      "slug": "overfitting",
      "title": "Overfitting",
      "shortDescription": "Understanding when a model learns training data too closely.",
      "difficultyLevel": "BEGINNER",
      "estimatedMinutes": 15,
      "displayOrder": 1
    }
  ]
}
```

---

# 16. Concept Detail API

```http
GET /api/curriculum/concepts/:slug
```

Example:

```text
/api/curriculum/concepts/overfitting
```

Return:

```text
Concept metadata
Learning objective
Prerequisites
Curated content
Misconception metadata where appropriate
```

Do not expose internal-only data unless it is intentionally part of the student API.

If misconception descriptions are needed later only by AI/question logic, keep an internal contract separate from the public student DTO.

---

# 17. Learning Path API

```http
GET /api/curriculum/path
```

Purpose:

Return the configured learning sequence and prerequisite relationships.

Example:

```json
{
  "path": [
    {
      "slug": "overfitting",
      "title": "Overfitting",
      "displayOrder": 1,
      "prerequisites": []
    },
    {
      "slug": "bias-vs-variance",
      "title": "Bias vs Variance",
      "displayOrder": 2,
      "prerequisites": []
    },
    {
      "slug": "train-validation-test",
      "title": "Train / Validation / Test",
      "displayOrder": 3,
      "prerequisites": []
    }
  ]
}
```

Do not claim a concept is completed/unlocked based on fake UI state.

Progress and mastery will come from later modules.

---

# 18. Frontend Folder Structure

```text
client/
└── src/
    ├── modules/
    │   ├── auth/
    │   ├── profile/
    │   │
    │   └── curriculum/
    │       ├── api.ts
    │       ├── CurriculumPage.tsx
    │       ├── ConceptCard.tsx
    │       ├── ConceptDetailPage.tsx
    │       ├── LearningPath.tsx
    │       ├── curriculum.types.ts
    │       └── curriculum.utils.ts
    │
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   └── shared/
    │
    ├── routes/
    ├── styles/
    ├── App.tsx
    └── main.tsx
```

Reuse existing global UI components.

---

# 19. Curriculum Page

Route:

```text
/curriculum
```

Display:

```text
FIXXY Navigation

Your Learning Path

┌──────────────────────────────────────────┐
│ 01  Overfitting                          │
│     Learn how models fail to generalize  │
│     Beginner · 15 min                    │
│                              [ Explore ] │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 02  Bias vs Variance                     │
│     Understand model complexity          │
│     Beginner · 20 min                   │
│                              [ Explore ] │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 03  Train / Validation / Test            │
│     Understand dataset roles             │
│     Beginner · 15 min                    │
│                              [ Explore ] │
└──────────────────────────────────────────┘
```

The actual cards must be generated from API data.

Do not hard-code concept cards into React.

---

# 20. Concept Card

Each card should show:

- number/order
- title
- short description
- difficulty
- estimated time
- prerequisite indicator where relevant
- Explore action

Do not overload cards with technical details.

---

# 21. Concept Detail Page

Route:

```text
/curriculum/:slug
```

Example:

```text
/curriculum/overfitting
```

Layout:

```text
Back to Curriculum

Overfitting

What you'll learn
[ learning objective ]

Overview
[ curated content ]

Key Idea
[ curated content ]

Example
[ curated content ]

Common Mistake
[ curated content ]

Prerequisites
[ prerequisite concepts ]

[ Start Learning ]
```

`Start Learning` should connect to the future learning/question flow.

Do not implement Question Engine logic inside Curriculum.

---

# 22. Learning Path UI

Visualize curriculum relationships clearly.

Basic:

```text
Overfitting
     ↓
Bias vs Variance
     ↓
Train / Validation / Test
```

If prerequisites exist:

```text
Prerequisite
     ↓
Concept
```

The UI must use actual API/database relationships.

Never display fake prerequisite status.

---

# 23. FIXXY Glass UI

Module 3 must use the same design system as Authentication and Student Profile.

Style:

**iOS-inspired glass / glassmorphism**

Use:

- soft blue background
- frosted white glass surfaces
- backdrop blur
- translucent cards
- thin white/light borders
- subtle highlights
- soft shadows
- rounded corners
- dark readable text
- generous spacing
- modern typography
- restrained visual noise

Do not turn the curriculum into a generic LMS/admin dashboard.

Recommended hierarchy:

```text
Soft blue background
       ↓
Glass navigation
       ↓
Glass learning-path cards
       ↓
Glass concept detail sections
       ↓
Dark primary action
```

Reuse existing FIXXY tokens/components rather than duplicating styles.

---

# 24. UI States

## Loading

```text
Loading your curriculum...
```

## Loaded

Display concepts/path.

## Empty

```text
No learning content is available yet.
```

## API error

```text
Couldn't load the curriculum.
Please try again.
```

## Concept not found

Use the existing FIXXY 404/not-found experience.

Do not show misleading empty content when an API failure occurred.

---

# 25. Responsive Requirements

Verify:

```text
Desktop
Laptop
Tablet
Mobile
```

Requirements:

- no horizontal scrolling
- no clipped cards
- no overflow
- no overlapping text
- readable concept descriptions
- accessible buttons
- understandable learning path on mobile

---

# 26. Accessibility

Implement:

- semantic heading hierarchy
- accessible links/buttons
- visible keyboard focus
- descriptive labels
- readable status messages
- meaningful button labels
- usable keyboard navigation
- sufficient contrast

Do not use color alone for prerequisite or state communication.

---

# 27. Error Handling

Recommended backend responses:

```text
200 OK
400 Bad Request
404 Not Found
500 Internal Server Error
```

Example concept-not-found response:

```json
{
  "message": "Concept not found"
}
```

Unexpected server errors should be logged server-side but should not expose stack traces.

---

# 28. Data Integrity

The curriculum must be authoritative and database-driven.

Do not:

```text
Hard-code concepts in React
Hard-code ordering in React
Duplicate prerequisite rules in the UI
Allow invalid misconception codes
Allow duplicate concept slugs
Allow duplicate misconception codes
```

Prefer:

```text
PostgreSQL
   ↓
Repository
   ↓
Service
   ↓
API
   ↓
React
```

---

# 29. Seed Content Requirements

At minimum, create useful curated content for each MVP concept.

Each concept should have:

```text
1 OVERVIEW
1 KEY_IDEA
1 EXAMPLE
1 COMMON_MISTAKE
1 SUMMARY
```

Add ANALOGY where useful.

Content should be concise enough for student UI but substantial enough to support later teaching flows.

---

# 30. Testing Strategy

Use:

```text
Unit tests
+
API/integration tests
+
Database tests
+
Frontend tests
+
End-to-end tests
```

## Backend unit tests

```text
[ ] List concepts
[ ] Sort concepts
[ ] Get concept by slug
[ ] Get prerequisites
[ ] Get misconceptions
[ ] Get content
[ ] Assemble concept detail
[ ] Detect missing concept
[ ] Validate prerequisite relationships
[ ] Handle repository/database errors
```

## API tests

```text
[ ] GET /api/curriculum/concepts
[ ] GET /api/curriculum/concepts/:slug
[ ] GET /api/curriculum/path
[ ] Correct ordering
[ ] Correct concept detail
[ ] Prerequisites returned
[ ] Curated content returned
[ ] Invalid slug → 404
[ ] Empty result handled
[ ] Database failure → 500-safe response
```

## Database tests

```text
[ ] Migrations execute
[ ] Concepts exist
[ ] Slugs are unique
[ ] Prerequisite foreign keys work
[ ] Misconception foreign keys work
[ ] Content foreign keys work
[ ] Misconception codes are unique as designed
[ ] Seed is idempotent
[ ] Invalid prerequisite relationship rejected
```

## Frontend tests

```text
[ ] Curriculum page renders
[ ] API data displays
[ ] Concept cards render
[ ] Explore link works
[ ] Concept detail renders
[ ] Learning objective renders
[ ] Curated content renders
[ ] Prerequisites render
[ ] Loading state works
[ ] Empty state works
[ ] API error state works
[ ] Not-found state works
[ ] Responsive layout works
[ ] Glass UI works
[ ] Keyboard navigation works
```

---

# 31. End-to-End Test

Run:

```text
1. Start PostgreSQL
2. Start backend
3. Start frontend
4. Authenticate using existing Module 1
5. Open /curriculum
6. Verify all three MVP concepts appear
7. Verify ordering
8. Open Overfitting
9. Verify concept detail
10. Verify learning objective
11. Verify curated content
12. Verify prerequisite section
13. Return to curriculum
14. Open Bias vs Variance
15. Open Train / Validation / Test
16. Refresh pages
17. Verify data still loads
18. Simulate API failure
19. Verify error state
20. Open invalid concept slug
21. Verify 404/not-found experience
```

---

# 32. Regression Testing

After Module 3, rerun:

## Module 1

```text
[ ] Register
[ ] Login
[ ] GET /api/auth/me
[ ] Logout
[ ] Protected route
[ ] Authentication survives refresh
```

## Module 2

```text
[ ] Profile load
[ ] Profile update
[ ] Authentication protection
[ ] Student isolation
```

Module 3 must not break previous modules.

---

# 33. Build Verification

Frontend:

```text
[ ] TypeScript check
[ ] Lint
[ ] Unit tests
[ ] Production build
```

Backend:

```text
[ ] TypeScript/build
[ ] Lint
[ ] Unit tests
[ ] Integration/API tests
```

Database:

```text
[ ] All migrations pass
[ ] Seed passes
[ ] Seed is idempotent
[ ] Constraints verified
```

Fix meaningful failures and rerun affected tests.

---

# 34. Final Folder Structure

```text
fixxy/
├── client/
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── profile/
│       │   └── curriculum/
│       │       ├── api.ts
│       │       ├── CurriculumPage.tsx
│       │       ├── ConceptCard.tsx
│       │       ├── ConceptDetailPage.tsx
│       │       ├── LearningPath.tsx
│       │       ├── curriculum.types.ts
│       │       └── curriculum.utils.ts
│       ├── components/
│       │   ├── ui/
│       │   ├── layout/
│       │   └── shared/
│       ├── routes/
│       ├── styles/
│       ├── App.tsx
│       └── main.tsx
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   └── curriculum/
│   │   │       ├── curriculum.controller.ts
│   │   │       ├── curriculum.routes.ts
│   │   │       ├── curriculum.service.ts
│   │   │       ├── curriculum.repository.ts
│   │   │       └── curriculum.types.ts
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_students.sql
│   │   │   ├── 002_create_student_profiles.sql
│   │   │   ├── 003_create_concepts.sql
│   │   │   ├── 004_create_concept_prerequisites.sql
│   │   │   ├── 005_create_misconceptions.sql
│   │   │   └── 006_create_concept_content.sql
│   │   └── seeds/
│   │       └── curriculum.seed.ts
│   │
│   └── ...
│
├── ai-service/
├── contracts/
├── docs/
├── .gitignore
└── README.md
```

---

# 35. Definition of Done

Module 3 is complete only when:

```text
✅ Concepts are database-driven
✅ Three MVP concepts are seeded
✅ Concept details work
✅ Learning objectives work
✅ Difficulty works
✅ Estimated duration works
✅ Prerequisites work
✅ Misconceptions work
✅ Curated content works
✅ Learning path works
✅ Curriculum API works
✅ Concept detail API works
✅ Frontend dynamically loads curriculum
✅ Loading state works
✅ Empty state works
✅ Error state works
✅ 404/not-found state works
✅ Glass UI matches FIXXY
✅ Responsive UI works
✅ Accessibility works
✅ Seed is idempotent
✅ Database constraints work
✅ Backend tests pass
✅ Frontend tests pass
✅ API/integration tests pass
✅ End-to-end tests pass
✅ Module 1 regression tests pass
✅ Module 2 regression tests pass
✅ Frontend build passes
✅ Backend build passes
```

---

# 36. Module 3 Boundary

```text
MODULE 1
Authentication
     ↓
studentId
     ↓
MODULE 2
Student Profile
     ↓
learner information
     ↓
MODULE 3
Curriculum
     ↓
concepts + prerequisites + content + misconceptions
     ↓
MODULE 4
Question Engine
```

Core principle:

> Curriculum defines what FIXXY teaches and how concepts relate. It does not decide whether a student has mastered them.
