# FIXXY — Module 2: Student Profile

> Build specification for the Student Profile module of the FIXXY Adaptive AI/ML Tutor.

## 1. Project Context

FIXXY is an adaptive AI/ML tutor built around:

Student mistake → misconception diagnosis → personalized teaching → retry → transfer → updated mastery.

MVP concepts:
- Overfitting
- Bias vs Variance
- Train / Validation / Test

Technology:
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + pgvector
- AI service: Python + FastAPI + LLM + embeddings

Nine modules:
1. Authentication
2. Student Profile
3. Curriculum
4. Question Engine
5. Answer Submission
6. Retry / Transfer UI
7. Mastery Dashboard
8. API Orchestration
9. Database

Recommended development order:
9 → 1 → 2 → 3 → 4 → 5 → 8 → 6 → 7

---

## 2. Module 2 Goal

Student Profile is built on Module 1 Authentication.

```text
Authentication
      ↓
authenticated studentId
      ↓
Student Profile
```

Responsibilities:
- View profile
- Edit profile
- Store learning preferences
- Persist profile data
- Protect profile APIs
- Enforce student-level authorization
- Provide loading, success and error states
- Provide FIXXY glass UI

Not included:
- Login/register/logout
- Password management
- JWT generation
- Curriculum
- Questions
- Attempts
- AI diagnosis
- Retry/transfer
- Mastery

---

## 3. Features

### Profile
- Display name
- Bio
- Learning level
- Learning goal
- Preferred learning style
- Preferred language
- Optional avatar URL

### Profile actions
- View profile
- Edit profile
- Save changes
- Cancel editing
- Restore profile after refresh
- Persist changes in PostgreSQL

### UI states
- Loading
- Loaded
- Editing
- Saving
- Success
- Fetch error
- Save error
- Network error

### Security
- Authentication required
- Use `req.user.studentId`
- Never trust a browser-supplied student ID
- Prevent cross-student profile access
- Never expose password hashes or authentication secrets

---

## 4. Architecture

```text
React + TypeScript
       │
       │ GET / PUT /api/profile
       ▼
Node.js + Express
       │
       ▼
requireAuth
       │
       ▼
req.user.studentId
       │
       ▼
Profile Service
       │
       ▼
Profile Repository
       │
       ▼
PostgreSQL
```

Module 2 does not directly call FastAPI.

---

## 5. Database Design

Existing authentication table:

```text
students
--------------------------------
id
name
email
password_hash
created_at
updated_at
```

Module 2 table:

```text
student_profiles
--------------------------------
id
student_id
display_name
bio
learning_level
learning_goal
preferred_learning_style
preferred_language
avatar_url
created_at
updated_at
```

Relationship:

```text
students 1 ───────── 1 student_profiles
```

`student_id` must be unique and reference `students.id`.

Recommended migration:

```text
server/db/migrations/002_create_student_profiles.sql
```

Example schema:

```sql
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    learning_level VARCHAR(30),
    learning_goal TEXT,
    preferred_learning_style VARCHAR(30),
    preferred_language VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_student_profile_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
);
```

Do not duplicate `password_hash` or JWT data.

---

## 6. Profile Field Rules

### `display_name`
- Required
- Trim whitespace
- Cannot be blank
- Reasonable maximum length

### `bio`
- Optional
- Reasonable maximum length

### `learning_level`
Suggested allowed values:

```text
BEGINNER
INTERMEDIATE
ADVANCED
```

### `preferred_learning_style`
Suggested allowed values:

```text
TEXT
VISUAL
EXAMPLE_BASED
ANALOGY
PRACTICE
```

### `preferred_language`
Use supported application languages.

### `avatar_url`
Optional; validate URL format and reasonable length.

Backend validation is mandatory even if frontend validation exists.

---

## 7. Profile Creation

Every authenticated student should have a profile.

Preferred:

```text
Register
   ↓
Create student
   ↓
Create default student profile
```

Possible defaults:

```text
display_name = registration name
learning_level = BEGINNER
preferred_learning_style = TEXT
preferred_language = English
bio = null
learning_goal = null
avatar_url = null
```

If Module 1 must remain untouched, safely create a default profile the first time `/api/profile` is requested.

Do not break existing Authentication behavior.

---

## 8. Backend File Structure

```text
server/
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.middleware.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   └── profile/
│   │       ├── profile.controller.ts
│   │       ├── profile.routes.ts
│   │       ├── profile.service.ts
│   │       ├── profile.repository.ts
│   │       └── profile.types.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── db/
│   ├── migrations/
│   │   ├── 001_create_students.sql
│   │   └── 002_create_student_profiles.sql
│   └── seeds/
│
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

Responsibilities:
- `routes`: endpoint mapping
- `controller`: HTTP request/response handling
- `service`: profile business rules
- `repository`: PostgreSQL queries
- `types`: request/response/domain types

---

## 9. Frontend File Structure

```text
client/
└── src/
    ├── modules/
    │   ├── auth/
    │   └── profile/
    │       ├── api.ts
    │       ├── ProfilePage.tsx
    │       ├── ProfileCard.tsx
    │       ├── ProfileForm.tsx
    │       ├── profile.types.ts
    │       └── profile.validation.ts
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

Responsibilities:
- `api.ts`: profile API calls
- `ProfilePage.tsx`: page state/layout
- `ProfileCard.tsx`: read view
- `ProfileForm.tsx`: editing
- `profile.types.ts`: TypeScript types
- `profile.validation.ts`: client-side validation

Reuse existing shared components and API client.

---

## 10. API Contract

Base path:

```text
/api/profile
```

### GET `/api/profile`

Protected.

Identity must come from:

```ts
req.user.studentId
```

Example response:

```json
{
  "profile": {
    "displayName": "Student Name",
    "bio": "Computer Science student.",
    "learningLevel": "BEGINNER",
    "learningGoal": "Learn AI and ML",
    "preferredLearningStyle": "VISUAL",
    "preferredLanguage": "English",
    "avatarUrl": null
  }
}
```

### PUT `/api/profile`

Protected.

Example request:

```json
{
  "displayName": "Student Name",
  "bio": "Computer Science student.",
  "learningLevel": "BEGINNER",
  "learningGoal": "Learn AI and ML",
  "preferredLearningStyle": "VISUAL",
  "preferredLanguage": "English",
  "avatarUrl": null
}
```

Example response:

```json
{
  "message": "Profile updated successfully",
  "profile": {
    "displayName": "Student Name",
    "bio": "Computer Science student.",
    "learningLevel": "BEGINNER",
    "learningGoal": "Learn AI and ML",
    "preferredLearningStyle": "VISUAL",
    "preferredLanguage": "English",
    "avatarUrl": null
  }
}
```

Recommended status codes:

```text
200 OK
400 Bad Request
401 Unauthorized
404 Not Found
500 Internal Server Error
```

---

## 11. Backend Flow

### Get

```text
Request
  ↓
requireAuth
  ↓
JWT verification
  ↓
studentId
  ↓
Profile Service
  ↓
Profile Repository
  ↓
PostgreSQL
  ↓
Profile response
```

### Update

```text
Request
  ↓
requireAuth
  ↓
studentId
  ↓
Validate data
  ↓
Profile Service
  ↓
Profile Repository
  ↓
PostgreSQL
  ↓
Updated profile
```

---

## 12. UI Design — FIXXY Glass

The profile page must match the FIXXY UI direction already established.

Style:

**iOS-inspired glass / glassmorphism**

Use:
- Soft blue background
- Frosted white glass cards
- Backdrop blur
- Thin light borders
- Gentle highlights
- Subtle shadows
- Rounded corners
- Dark readable text
- Generous spacing
- Clean typography
- Minimal visual noise

Do not make the profile page look like a generic admin dashboard.

Use the same design language as:
- Login
- Register
- Learning screen
- Tutor panel
- Mastery dashboard

Suggested glass style:

```css
.fixxy-page {
  min-height: 100vh;
  color: #14243d;
  background:
    radial-gradient(circle at 20% 12%, #f7fcff 0, transparent 32%),
    radial-gradient(circle at 85% 35%, #d6eaff 0, transparent 38%),
    linear-gradient(135deg, #a9ccef, #dcecfb 55%, #a8c9ec);
}

.glass {
  background: rgba(255, 255, 255, 0.58);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  box-shadow:
    0 16px 40px rgba(32, 70, 115, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
```

Reuse the existing design tokens if already implemented.

---

## 13. Profile Page Layout

Desktop:

```text
┌──────────────────────────────────────────────────────────┐
│                   FIXXY NAVIGATION                       │
├─────────────────────────┬────────────────────────────────┤
│                         │                                │
│      PROFILE CARD       │    LEARNING PREFERENCES        │
│                         │                                │
│        ◯ Avatar         │  Learning Level               │
│                         │  [ Beginner ▼ ]               │
│      Student Name       │                                │
│                         │  Learning Goal                │
│      Bio                │  [________________________]   │
│                         │                                │
│      Level              │  Learning Style               │
│      Goal               │  [ Visual ▼ ]                 │
│                         │                                │
│  [ Edit Profile ]       │  Preferred Language            │
│                         │                                │
└─────────────────────────┴────────────────────────────────┘
```

Mobile:

```text
FIXXY navigation
       ↓
Profile card
       ↓
Learning preferences
       ↓
Edit controls
```

---

## 14. Profile Card

Display:

```text
Avatar
Display name
Bio
Learning level
Learning goal
Edit Profile
```

Example:

```text
┌─────────────────────────────────┐
│             ◯                   │
│                                 │
│       Student Name              │
│                                 │
│  Computer Science student.      │
│                                 │
│  Level     Beginner             │
│  Goal      Learn AI/ML          │
│                                 │
│      [ Edit Profile ]           │
└─────────────────────────────────┘
```

---

## 15. Edit Profile Form

Fields:

```text
Display Name
Bio
Learning Level
Learning Goal
Preferred Learning Style
Preferred Language
Avatar URL
```

Actions:

```text
[ Cancel ]    [ Save Changes ]
```

The primary button should use the FIXXY dark navy styling.

---

## 16. UX Behavior

On page load:

```text
Loading profile
      ↓
GET /api/profile
      ↓
Display profile
```

On edit:

```text
View
 ↓
Edit
 ↓
Modify fields
 ↓
Save
 ↓
Saving...
 ↓
Success
```

On cancel:

```text
Edit
 ↓
Cancel
 ↓
Original profile restored
```

Do not submit multiple requests while saving.

---

## 17. Error Handling

Profile fetch error:

```text
Couldn't load your profile.
Please try again.
```

Save error:

```text
Couldn't update your profile.
Please try again.
```

Network error:

```text
Couldn't connect to FIXXY.
```

Success:

```text
Profile updated successfully
```

Never expose server stack traces to the student.

---

## 18. Security Requirements

Mandatory:

```text
✅ Profile API requires authentication
✅ studentId comes from authenticated request
✅ Student A cannot access Student B profile
✅ Backend validates data
✅ Parameterized DB operations
✅ No password_hash in responses
✅ No JWT secret in frontend
✅ No database credentials exposed
✅ No internal stack traces in API responses
```

Student isolation test:

```text
Student A → Profile A
Student B → Profile B

Student B must never be able to modify Profile A.
```

---

## 19. Testing Plan

### Backend unit tests

```text
[ ] Create profile
[ ] Get profile
[ ] Update profile
[ ] Validate controlled values
[ ] Handle missing profile
[ ] Handle database failure
```

### API tests

```text
[ ] GET authenticated
[ ] GET unauthenticated → 401
[ ] PUT authenticated
[ ] PUT unauthenticated → 401
[ ] Invalid data → 400
[ ] Invalid learning level rejected
[ ] Invalid learning style rejected
[ ] Oversized input rejected
[ ] Correct profile returned
[ ] Password data never returned
```

### Student isolation

```text
[ ] Student A sees Profile A
[ ] Student B sees Profile B
[ ] Student B cannot update Profile A
[ ] Manipulated student ID does not bypass authorization
```

### Database tests

```text
[ ] Profile row created
[ ] Foreign key works
[ ] student_id unique
[ ] Updates persist
[ ] Profile survives restart
[ ] Cascade behavior works as designed
```

### Frontend tests

```text
[ ] Profile route renders
[ ] ProtectedRoute works
[ ] Profile loads
[ ] Loading state works
[ ] Profile displays
[ ] Edit mode works
[ ] Validation works
[ ] Save works
[ ] Saving state works
[ ] Success state works
[ ] Error state works
[ ] Cancel works
[ ] Updated values display
[ ] Refresh retains values
[ ] Responsive design works
[ ] Glass UI works
```

---

## 20. End-to-End Test

Perform the complete flow:

```text
1. Start PostgreSQL
2. Start backend
3. Start frontend
4. Login as Student A
5. Open /profile
6. Verify Profile A
7. Click Edit Profile
8. Change several fields
9. Save
10. Verify success feedback
11. Refresh browser
12. Verify changes persist
13. Logout
14. Open /profile
15. Verify protected route redirects/login requirement
16. Login as Student B
17. Verify only Profile B is accessible
18. Verify Student B cannot modify Profile A
```

---

## 21. Regression Testing

After Module 2, rerun Module 1:

```text
[ ] Register
[ ] Login
[ ] GET /api/auth/me
[ ] Logout
[ ] Protected route
[ ] Authentication survives refresh
```

Module 2 must not break Authentication.

---

## 22. Build Verification

Run all existing project checks.

Frontend:

```text
[ ] TypeScript check
[ ] Lint
[ ] Tests
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
[ ] Migration succeeds
[ ] Schema verified
[ ] Foreign key verified
[ ] Unique constraint verified
```

Fix failures and rerun affected tests.

Do not declare completion because the project only compiles.

---

## 23. Final Project Structure

```text
fixxy/
├── client/
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   └── profile/
│       │       ├── api.ts
│       │       ├── ProfilePage.tsx
│       │       ├── ProfileCard.tsx
│       │       ├── ProfileForm.tsx
│       │       ├── profile.types.ts
│       │       └── profile.validation.ts
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
│   │   │   └── profile/
│   │   │       ├── profile.controller.ts
│   │   │       ├── profile.routes.ts
│   │   │       ├── profile.service.ts
│   │   │       ├── profile.repository.ts
│   │   │       └── profile.types.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_students.sql
│   │   │   └── 002_create_student_profiles.sql
│   │   └── seeds/
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

## 24. Definition of Done

Module 2 is complete only when:

```text
✅ Authenticated student can open profile
✅ Correct profile is returned
✅ Student can edit profile
✅ Changes persist to PostgreSQL
✅ Changes survive refresh
✅ Changes survive backend restart
✅ Unauthenticated users are blocked
✅ Cross-student access is blocked
✅ Backend validation works
✅ Frontend validation works
✅ Loading state works
✅ Saving state works
✅ Error state works
✅ Success state works
✅ Responsive UI works
✅ FIXXY glass UI works
✅ Database migration succeeds
✅ Backend tests pass
✅ Frontend tests pass
✅ End-to-end tests pass
✅ Module 1 regression tests pass
✅ Frontend build passes
✅ Backend build passes
```

---

## 25. Module Boundary

```text
MODULE 1 — AUTHENTICATION
            ↓
        studentId
            ↓
MODULE 2 — STUDENT PROFILE
            ↓
  profile + learning preferences
            ↓
MODULE 3 — CURRICULUM
```

Core principle:

> Authentication establishes who the student is. Student Profile stores who the student is as a learner.
