# FIXXY — Module 1: Authentication

> Build specification and architecture guide for the FIXXY Adaptive AI/ML Tutor

---

## 1. Project Overview

FIXXY is an adaptive AI/ML learning platform built around a learning loop:

**Student makes a mistake → misconception is diagnosed → personalized teaching → retry → transfer question → mastery is updated**

The main product is not a normal chatbot. The core learning experience is the complete:

```text
Diagnosis
   ↓
Teaching
   ↓
Retry
   ↓
Transfer Check
   ↓
Updated Learner Model
```

The initial MVP focuses on:

1. Overfitting
2. Bias vs Variance
3. Train / Validation / Test

The MVP should support:

- Controlled misconception categories
- Personalized explanations
- Hints
- Retry questions
- Transfer questions
- Concept mastery
- Explanation outcome tracking

Supporting product features planned for the wider system:

- Student account and learning history
- Initial assessment
- Prerequisite-based roadmap
- Curated learning content
- Progress display

Later extensions:

- Coding tutor
- Broader AI/ML curriculum
- Voice teaching
- Visual teaching
- Teacher analytics
- Other subjects

---

# 2. Overall Technology Stack

## Frontend

```text
React
TypeScript
Tailwind CSS
```

## Main Backend

```text
Node.js
Express
TypeScript
```

## AI Service

```text
Python
FastAPI
LLM
Embeddings
```

## Database

```text
PostgreSQL
pgvector
```

---

# 3. Overall FIXXY Architecture

```text
                         ┌─────────────────────┐
                         │       STUDENT       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ React + TypeScript  │
                         │    + Tailwind CSS   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Node.js + Express   │
                         │      Backend        │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
           Authentication      Curriculum       Question Engine
           Student Profile       Sessions        Answer Submission
                  │                 │                 │
                  └─────────────────┼─────────────────┘
                                    │
                                    ▼
                           API Orchestration
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    FastAPI AI       │
                         │ Diagnosis + Teaching│
                         └──────────┬──────────┘
                                    │
                                    ▼
                              Retry / Transfer
                                    │
                                    ▼
                             Mastery Engine
                                    │
                                    ▼
                           Mastery Dashboard

                         ┌─────────────────────┐
                         │ PostgreSQL + pgvector│
                         └─────────────────────┘
```

## Core responsibility boundary

### React

Responsible for:

- Student-facing UI
- Navigation
- Forms
- Question display
- Answer selection
- Teaching display
- Retry / transfer interaction
- Dashboard display
- Loading states
- Error states

### Node.js / Express

Responsible for:

- Authentication
- Business logic
- Session state
- Question selection
- Server-side answer checking
- Attempt storage
- Mastery calculation
- API orchestration
- Database writes

### FastAPI

Responsible for:

- Misconception diagnosis
- Teaching strategy selection
- Personalized explanation
- Hint generation
- AI-related response generation

### PostgreSQL

Responsible for:

- Persistent application data
- Student records
- Curriculum data
- Questions
- Attempts
- Sessions
- Mastery
- Interventions
- Explanation outcomes

### pgvector

Used for embedding/vector retrieval when semantic retrieval is required.

---

# 4. FIXXY Module Architecture

The project is divided into 9 modules:

| Module | Name | Responsibility |
|---|---|---|
| 1 | Authentication | Register, login, logout, protected routes, student identity |
| 2 | Student Profile | Student details and learning preferences |
| 3 | Curriculum | Concepts, prerequisites, explanations, misconceptions |
| 4 | Question Engine | Practice, retry, and transfer question selection |
| 5 | Answer Submission | Server-side answer checking and attempt recording |
| 6 | Retry / Transfer UI | Teaching, hints, retry, transfer interaction |
| 7 | Mastery Dashboard | Mastery, progress, learning history |
| 8 | API Orchestration | Learning session control and FastAPI communication |
| 9 | Database | Schema, migrations, seed data, data access |

---

# 5. Recommended Development Order

The module numbers are feature ownership numbers, not the required coding order.

Build in this order:

```text
MODULE 9 — Database Foundation
        ↓
MODULE 1 — Authentication
        ↓
MODULE 2 — Student Profile
        ↓
MODULE 3 — Curriculum
        ↓
MODULE 4 — Question Engine
        ↓
MODULE 5 — Answer Submission
        ↓
MODULE 8 — API Orchestration
        ↓
MODULE 6 — Retry / Transfer UI
        ↓
MODULE 7 — Mastery Dashboard
        ↓
FINAL INTEGRATION
```

The first major milestone is:

```text
Signed-in student
      ↓
Select Overfitting
      ↓
Answer a question
      ↓
Node.js verifies the answer
      ↓
Attempt is saved
```

---

# 6. Module 1 — Authentication

## Goal

Authentication must establish a reliable student identity for every protected request.

### Module 1 responsibilities

```text
Register
Login
Logout
Current authenticated student
JWT/session authentication
Protected routes
Authentication state in React
```

### Module 1 does NOT handle

```text
Student preferences
Curriculum
Questions
Attempts
Learning progress
Mastery
AI diagnosis
Teaching
Retry
Transfer
```

Those belong to later modules.

---

# 7. Authentication Architecture

Recommended first implementation:

```text
React
   │
   │ register/login request
   ▼
Node.js + Express
   │
   ├── Validate request
   ├── Hash/verify password
   ├── Create/verify JWT
   └── Return student data
   │
   ▼
PostgreSQL
   │
   └── students
```

For authenticated browser requests:

```text
Browser
   │
   │ HttpOnly authentication cookie
   ▼
Node.js middleware
   │
   ├── Verify token
   └── Extract studentId
   │
   ▼
req.user.studentId
```

The frontend should not be the authority for authentication.

The backend is the source of truth.

---

# 8. Module 1 Authentication Flow

## Registration

```text
Student enters:
name
email
password
       ↓
React
       ↓
POST /api/auth/register
       ↓
Validate input
       ↓
Check duplicate email
       ↓
Hash password
       ↓
Insert student
       ↓
Return safe student information
```

The plain-text password must never be stored.

---

## Login

```text
Student enters email + password
              ↓
React
              ↓
POST /api/auth/login
              ↓
Find student by email
              ↓
Verify password hash
              ↓
Create signed authentication token
              ↓
Set HttpOnly cookie
              ↓
Return student information
```

---

## Restore authentication after page refresh

```text
React application starts
        ↓
GET /api/auth/me
        ↓
Browser sends authentication cookie
        ↓
Node.js verifies token
        ↓
Retrieve student by studentId
        ↓
Return current student
        ↓
React stores authenticated user
```

---

## Logout

```text
POST /api/auth/logout
        ↓
Clear authentication cookie
        ↓
React clears current student
        ↓
Redirect to login
```

---

# 9. Authentication API Contract

Base URL:

```text
http://localhost:5000
```

Base API path:

```text
/api/auth
```

---

## 9.1 Register

### Request

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "Password123"
}
```

### Success

```http
201 Created
```

```json
{
  "message": "Registration successful",
  "student": {
    "id": "uuid",
    "name": "Student Name",
    "email": "student@example.com"
  }
}
```

### Possible errors

```text
400 — Missing/invalid input
409 — Email already exists
500 — Server/database failure
```

---

# 10. Login API

### Request

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "student@example.com",
  "password": "Password123"
}
```

### Success

```http
200 OK
```

```json
{
  "message": "Login successful",
  "student": {
    "id": "uuid",
    "name": "Student Name",
    "email": "student@example.com"
  }
}
```

The authentication token should be kept in an HttpOnly cookie.

### Possible errors

```text
400 — Missing input
401 — Invalid credentials
500 — Server failure
```

---

# 11. Current Student API

### Request

```http
GET /api/auth/me
```

This endpoint must be protected.

### Success

```http
200 OK
```

```json
{
  "student": {
    "id": "uuid",
    "name": "Student Name",
    "email": "student@example.com"
  }
}
```

### Unauthenticated

```http
401 Unauthorized
```

```json
{
  "message": "Authentication required"
}
```

---

# 12. Logout API

### Request

```http
POST /api/auth/logout
```

### Success

```http
200 OK
```

```json
{
  "message": "Logout successful"
}
```

---

# 13. Database — Authentication

The first authentication table is:

```text
students
```

## Proposed schema

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Data rules

```text
id              → generated UUID
name            → required
email           → required + unique
password_hash   → required
created_at      → generated automatically
updated_at      → updated when the record changes
```

Never expose `password_hash` to React.

---

# 14. Project Folder Structure

Use this architecture for the full project:

```text
fixxy/
│
├── client/
│   │
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── api.ts
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   │
│   │   │   ├── profile/
│   │   │   ├── curriculum/
│   │   │   ├── question-engine/
│   │   │   ├── answer-submission/
│   │   │   ├── retry-transfer/
│   │   │   ├── mastery-dashboard/
│   │   │   └── api-orchestration/
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   └── shared/
│   │   │
│   │   ├── routes/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── env.ts
│   │   │
│   │   ├── middleware/
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   ├── profile/
│   │   │   ├── curriculum/
│   │   │   ├── questions/
│   │   │   ├── attempts/
│   │   │   ├── sessions/
│   │   │   ├── mastery/
│   │   │   └── orchestration/
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── db/
│   │   ├── migrations/
│   │   │   └── 001_create_students.sql
│   │   └── seeds/
│   │
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/
│   │
│   ├── app/
│   │   ├── api/
│   │   ├── diagnosis/
│   │   ├── teaching/
│   │   ├── retrieval/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── ...
│
├── contracts/
│   ├── auth/
│   ├── questions/
│   ├── learning/
│   └── ai/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── database/
│
├── .gitignore
└── README.md
```

### Important structure rule

Keep authentication code inside the `auth` module.

Do not create a large generic file such as:

```text
server/src/authenticationEverything.ts
```

Keep controllers, services, routes, middleware, types, and database access separated.

---

# 15. Module 1 Frontend Structure

```text
client/src/modules/auth/
│
├── api.ts
├── AuthContext.tsx
├── LoginPage.tsx
├── RegisterPage.tsx
├── ProtectedRoute.tsx
└── auth.types.ts
```

## Responsibilities

### `api.ts`

Handles:

```text
register()
login()
getCurrentStudent()
logout()
```

### `AuthContext.tsx`

Stores:

```text
student
loading
authenticated state
refreshUser()
logout()
```

### `LoginPage.tsx`

Student login interface.

### `RegisterPage.tsx`

Student registration interface.

### `ProtectedRoute.tsx`

Prevents unauthenticated access to protected application pages.

---

# 16. FIXXY UI Design System

The UI must follow the design direction already selected for FIXXY.

## Visual style

Use an:

**iOS-inspired glass / glassmorphism learning interface**

The visual language should use:

- Soft blue background
- Frosted white surfaces
- Backdrop blur
- Gentle highlights
- Dark readable text
- Rounded corners
- Subtle shadows
- Spacious layout
- Minimal visual noise

The goal is a polished learning interface rather than a generic admin dashboard.

---

# 17. Glass UI Rules

## Page background

Use a layered soft-blue background with radial highlights.

Concept:

```css
.fixxy-page {
    min-height: 100vh;
    color: #14243d;

    background:
        radial-gradient(
            circle at 20% 12%,
            #f7fcff 0,
            transparent 32%
        ),
        radial-gradient(
            circle at 85% 35%,
            #d6eaff 0,
            transparent 38%
        ),
        linear-gradient(
            135deg,
            #a9ccef,
            #dcecfb 55%,
            #a8c9ec
        );
}
```

## Glass surface

```css
.glass {
    background: rgba(255, 255, 255, 0.58);

    -webkit-backdrop-filter:
        blur(22px) saturate(150%);

    backdrop-filter:
        blur(22px) saturate(150%);

    border:
        1px solid rgba(255, 255, 255, 0.8);

    border-radius: 24px;

    box-shadow:
        0 16px 40px rgba(32, 70, 115, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
```

## Main button

```css
.primary-button {
    color: white;
    background: #193650;
    border: 0;
    border-radius: 14px;
    padding: 12px 20px;
    box-shadow:
        0 8px 18px rgba(25, 54, 80, 0.18);
}

.primary-button:hover {
    background: #284d70;
}
```

---

# 18. Authentication Page UI

## Login Page

Recommended layout:

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    FIXXY                                │
│             Learn from every mistake                   │
│                                                         │
│       ┌─────────────────────────────────────┐           │
│       │                                     │           │
│       │   Welcome back                     │           │
│       │                                     │           │
│       │   Email                             │           │
│       │   ┌─────────────────────────────┐   │           │
│       │   │ student@example.com         │   │           │
│       │   └─────────────────────────────┘   │           │
│       │                                     │           │
│       │   Password                          │           │
│       │   ┌─────────────────────────────┐   │           │
│       │   │ ••••••••••••                │   │           │
│       │   └─────────────────────────────┘   │           │
│       │                                     │           │
│       │       [ Sign in to FIXXY ]          │           │
│       │                                     │           │
│       │   Don't have an account? Register   │           │
│       │                                     │           │
│       └─────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The login card should be a frosted glass card.

---

# 19. Register Page UI

Recommended layout:

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    FIXXY                                │
│                                                         │
│       ┌─────────────────────────────────────┐           │
│       │                                     │           │
│       │       Create your account           │           │
│       │                                     │           │
│       │       Name                          │           │
│       │       Email                         │           │
│       │       Password                      │           │
│       │       Confirm Password              │           │
│       │                                     │           │
│       │       [ Create account ]             │           │
│       │                                     │           │
│       │       Already have an account?       │           │
│       │       Sign in                       │           │
│       │                                     │           │
│       └─────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 20. Authentication UI Behavior

The UI should clearly show these states:

```text
IDLE
 ↓
SUBMITTING
 ↓
SUCCESS
```

or:

```text
IDLE
 ↓
SUBMITTING
 ↓
ERROR
```

Do not silently fail.

Examples:

```text
Invalid email or password
Email is already registered
Password must meet the required length
Unable to connect to FIXXY
Something went wrong. Please try again.
```

---

# 21. Loading State

While authentication is being restored:

```text
Loading FIXXY...
```

Do not immediately redirect to `/login` before `/api/auth/me` finishes.

Recommended flow:

```text
App starts
    ↓
AuthContext loading = true
    ↓
GET /api/auth/me
    ↓
Resolve student
    ↓
loading = false
    ↓
Render application
```

---

# 22. Error Handling

FIXXY should have consistent error states.

## 404

Use the same glass visual language:

```text
404

Looks like this page took a wrong turn.

Let's get you back on your learning path.

[ Back to FIXXY ]
```

React Router fallback:

```tsx
<Route
    path="*"
    element={<NotFoundPage />}
/>
```

The 404 route must be separate from authentication failures.

---

## Network Failure

Example:

```text
Couldn't connect to FIXXY

Check your connection and try again.

[ Retry ]
```

---

## Server Failure

Example:

```text
Something went wrong

FIXXY couldn't complete that request.

[ Try Again ]
```

---

## AI Service Failure

Later, during learning:

```text
FIXXY couldn't generate the tutoring response.

Your answer is still saved.

[ Retry ]
```

The learning session must not be destroyed by an AI-service error.

---

# 23. Protected Route Architecture

React route structure:

```text
Public
├── /login
└── /register

Protected
├── /
├── /profile
├── /curriculum
└── /learn/:conceptId

Fallback
└── *
```

Conceptually:

```tsx
<Routes>

    <Route
        path="/login"
        element={<LoginPage />}
    />

    <Route
        path="/register"
        element={<RegisterPage />}
    />

    <Route element={<ProtectedRoute />}>

        <Route
            path="/"
            element={<HomePage />}
        />

        <Route
            path="/profile"
            element={<ProfilePage />}
        />

        <Route
            path="/curriculum"
            element={<CurriculumPage />}
        />

        <Route
            path="/learn/:conceptId"
            element={<LearningPage />}
        />

    </Route>

    <Route
        path="*"
        element={<NotFoundPage />}
    />

</Routes>
```

---

# 24. Security Requirements

Authentication must follow these rules:

## Password

```text
Never store plain-text passwords.
Always store password hashes.
```

## Authentication token

Use an HttpOnly cookie for browser authentication.

Recommended cookie characteristics:

```text
httpOnly = true
secure = true in production
sameSite = lax
```

## Backend authority

The browser must never decide:

```text
"This student is authenticated."
```

The backend decides this by validating the authentication token.

## Student identity

Protected requests must use:

```text
req.user.studentId
```

rather than accepting a student ID supplied by the browser for authorization decisions.

## Secrets

Never commit:

```text
JWT_SECRET
DATABASE_URL
production credentials
API keys
LLM keys
```

to Git.

Use environment variables.

---

# 25. Environment Configuration

Create:

```text
server/.env
```

Example:

```env
PORT=5000

DATABASE_URL=postgresql://postgres:password@localhost:5432/fixxy

JWT_SECRET=replace_with_a_long_random_secret

CLIENT_URL=http://localhost:5173

NODE_ENV=development
```

Create:

```text
server/.env.example
```

```env
PORT=5000

DATABASE_URL=postgresql://postgres:password@localhost:5432/fixxy

JWT_SECRET=

CLIENT_URL=http://localhost:5173

NODE_ENV=development
```

---

# 26. Backend Authentication Files

```text
server/src/modules/auth/
│
├── auth.controller.ts
├── auth.middleware.ts
├── auth.routes.ts
├── auth.service.ts
├── auth.repository.ts
└── auth.types.ts
```

## Controller

HTTP request/response handling.

```text
register
login
me
logout
```

## Middleware

Authentication verification.

```text
requireAuth
```

## Routes

Maps URLs to controllers.

```text
POST /register
POST /login
GET  /me
POST /logout
```

## Service

Business logic.

```text
registerStudent
loginStudent
getStudentById
```

## Repository

Database access.

Keep SQL/database operations here as the project grows.

## Types

Shared authentication request/response types.

---

# 27. Authentication Responsibility Flow

```text
                      AUTHENTICATION MODULE

React
 │
 ├──────── POST /register ────────┐
 │                                │
 ├──────── POST /login ───────────┤
 │                                ▼
 ├──────── GET /me ─────────► Controller
 │                                │
 └──────── POST /logout ─────┬────┘
                             │
                             ▼
                          Service
                             │
                             ▼
                         Repository
                             │
                             ▼
                         PostgreSQL
                             │
                             ▼
                         Student ID
```

---

# 28. How Module 1 Connects to Module 2

Module 1 ends at:

```text
Authenticated student
        ↓
studentId
```

Module 2 can then use:

```text
studentId
    ↓
student_profiles
```

For example:

```text
GET /api/profile
       ↓
requireAuth
       ↓
req.user.studentId
       ↓
student_profiles
```

Module 1 should not contain profile logic.

---

# 29. How Module 1 Connects to the Rest of FIXXY

Authentication becomes the identity foundation:

```text
                      Authentication
                            │
                            ▼
                       studentId
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
     Student Profile    Curriculum        Learning
                                              │
                                              ▼
                                        Learning Session
                                              │
                         ┌────────────────────┼─────────────────┐
                         ▼                    ▼                 ▼
                     Questions            Attempts          Mastery
                         │                    │                 │
                         └────────────────────┼─────────────────┘
                                              ▼
                                      API Orchestration
                                              │
                                              ▼
                                        FastAPI AI
```

---

# 30. Learning Session States

The complete learning system should eventually use one backend-managed learning session:

```text
PRACTICE
   │
   ├── correct ──► COMPLETE
   │
   └── wrong
          ↓
     DIAGNOSING
          ↓
       TEACHING
          ↓
        RETRY
       /     \
    wrong   correct
      │        │
      ▼        ▼
RETEACHING  TRANSFER
              /   \
           fail   pass
            │       │
            ▼       ▼
       RETEACHING COMPLETE
```

The current state belongs on the backend.

React resumes the correct state after a refresh.

---

# 31. AI Service Contract

When Module 8 is implemented, Node.js sends FastAPI:

```json
{
  "question": "...",
  "selectedAnswer": "...",
  "allowedMisconceptionIds": [
    "OVERFIT_M1",
    "OVERFIT_M2"
  ],
  "studentHistory": {}
}
```

FastAPI returns structured data similar to:

```json
{
  "misconceptionId": "OVERFIT_M1",
  "strategy": "analogy",
  "explanation": "High training accuracy does not guarantee performance on unseen data.",
  "hint": "Compare training and test performance.",
  "confidence": 0.86
}
```

For Module 1, this is only a future integration boundary.

Do not put AI diagnosis inside the authentication module.

---

# 32. Database Entities for the Full Project

The wider FIXXY system requires these entities:

```text
students
student_profiles
concepts
concept_prerequisites
misconceptions
questions
question_options
learning_sessions
attempts
interventions
student_mastery
explanation_outcomes
```

Module 1 only requires the initial `students` foundation.

---

# 33. Development Phases for Module 1

## Phase 1 — Backend foundation

```text
[ ] Create Node.js + Express + TypeScript server
[ ] Configure environment variables
[ ] Connect PostgreSQL
[ ] Create students table
```

## Phase 2 — Registration

```text
[ ] Register route
[ ] Validate input
[ ] Normalize email
[ ] Check duplicate email
[ ] Hash password
[ ] Store student
[ ] Return safe student data
```

## Phase 3 — Login

```text
[ ] Login route
[ ] Find student
[ ] Verify password
[ ] Create authentication token
[ ] Set HttpOnly cookie
[ ] Return student
```

## Phase 4 — Middleware

```text
[ ] Read authentication cookie
[ ] Verify token
[ ] Extract studentId
[ ] Attach req.user
[ ] Reject invalid/expired authentication
```

## Phase 5 — Current user

```text
[ ] GET /api/auth/me
[ ] Verify authentication
[ ] Retrieve student
[ ] Return safe student data
```

## Phase 6 — Logout

```text
[ ] POST /api/auth/logout
[ ] Clear authentication cookie
[ ] Return success
```

## Phase 7 — React

```text
[ ] AuthContext
[ ] Login page
[ ] Register page
[ ] ProtectedRoute
[ ] Authentication restore
[ ] Logout
```

## Phase 8 — UI polish

```text
[ ] Glass login card
[ ] Glass registration card
[ ] Soft blue background
[ ] Loading state
[ ] Form validation
[ ] Error messages
[ ] Responsive design
[ ] 404 page
```

## Phase 9 — Testing

```text
[ ] Register valid student
[ ] Reject duplicate email
[ ] Login valid credentials
[ ] Reject invalid credentials
[ ] Access /me while authenticated
[ ] Reject /me while unauthenticated
[ ] Logout
[ ] Verify /me fails after logout
[ ] Refresh browser and retain login state
[ ] Verify protected frontend route
[ ] Verify mobile layout
[ ] Verify error states
```

---

# 34. Definition of Done — Module 1

Module 1 is complete only when this entire flow works:

```text
Open FIXXY
     ↓
Register
     ↓
Student saved in PostgreSQL
     ↓
Login
     ↓
Authentication cookie established
     ↓
Dashboard opens
     ↓
Refresh browser
     ↓
User remains authenticated
     ↓
Open protected page
     ↓
Backend identifies studentId
     ↓
Logout
     ↓
Authentication removed
     ↓
Protected page redirects to login
```

---

# 35. Important Architecture Rules

## Rule 1

The frontend is never the authority for authentication.

## Rule 2

Passwords are never stored as plain text.

## Rule 3

Correct answers and learning evaluation must remain server-side.

## Rule 4

Authentication provides the student identity; later modules use that identity.

## Rule 5

Keep AI logic inside FastAPI, not inside authentication.

## Rule 6

Keep database access separated from HTTP controllers.

## Rule 7

Keep the learning session state in the backend.

## Rule 8

The UI should use one consistent FIXXY glass design system.

## Rule 9

The 404 page is a global fallback, not an authentication page.

## Rule 10

Build a working module before adding unnecessary features.

---

# 36. Module 1 Final Folder Snapshot

After completing Module 1, the repository should approximately look like:

```text
fixxy/
│
├── client/
│   └── src/
│       ├── modules/
│       │   └── auth/
│       │       ├── api.ts
│       │       ├── AuthContext.tsx
│       │       ├── LoginPage.tsx
│       │       ├── RegisterPage.tsx
│       │       ├── ProtectedRoute.tsx
│       │       └── auth.types.ts
│       │
│       ├── components/
│       │   └── shared/
│       │
│       ├── routes/
│       ├── styles/
│       ├── App.tsx
│       └── main.tsx
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   └── env.ts
│   │   │
│   │   ├── modules/
│   │   │   └── auth/
│   │   │       ├── auth.controller.ts
│   │   │       ├── auth.middleware.ts
│   │   │       ├── auth.routes.ts
│   │   │       ├── auth.service.ts
│   │   │       ├── auth.repository.ts
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── db/
│   │   └── migrations/
│   │       └── 001_create_students.sql
│   │
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/
├── contracts/
├── docs/
├── .gitignore
└── README.md
```

---

# 37. Module 1 Success Criteria

The module is considered successful when:

```text
Authentication
      │
      ├── Register       ✅
      ├── Login          ✅
      ├── Logout         ✅
      ├── /me            ✅
      ├── JWT/session    ✅
      ├── Protected API  ✅
      ├── Protected UI   ✅
      └── Glass UI       ✅
```

And the system can reliably produce:

```text
Authenticated Student
        ↓
      studentId
        ↓
Ready for Module 2 — Student Profile
```

---

# 38. Next Module Boundary

After Module 1 is stable, Module 2 should begin.

### Module 2 — Student Profile

Input from Module 1:

```text
studentId
```

Module 2 then handles:

```text
Student name/profile details
Learning preferences
Account/profile information
```

Do not add those responsibilities into Module 1.

---

## FIXXY Architecture Principle

```text
AUTHENTICATION
      ↓
IDENTITY
      ↓
PROFILE
      ↓
CURRICULUM
      ↓
QUESTIONS
      ↓
ANSWERS
      ↓
AI TEACHING
      ↓
RETRY
      ↓
TRANSFER
      ↓
MASTERY
```

This sequence keeps the project modular and makes each feature independently testable.
