import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { pool, closePool } from '../src/config/db';
import { seedCurriculum } from '../db/seeds/curriculum.seed';
import { seedQuestions } from '../db/seeds/questions.seed';
import { curriculumService } from '../src/modules/curriculum/curriculum.service';
import { attemptService } from '../src/modules/attempts/attempt.service';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, status: 'PASS', durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, status: 'FAIL', durationMs, error: err.message });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms): ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('FIXXY Module 1 — Automated Authentication Test Suite');
  console.log('='.repeat(60));

  const app = createApp();

  // Clean test students from database before running
  await pool.query("DELETE FROM students WHERE email LIKE '%@test-fixxy.edu'");

  const uniqueId = Date.now();
  const testEmail = `student_${uniqueId}@test-fixxy.edu`;
  const testPassword = 'Password123';
  const testName = 'Ada Lovelace';
  let registeredStudentId = '';
  let authCookie = '';

  console.log('\n--- 1. Health & Status Tests ---');
  await test('Health', 'GET /api/health returns 200 and healthy database', async () => {
    const res = await request(app).get('/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === 'healthy', `Expected healthy, got ${res.body.status}`);
    assert(res.body.database.ok === true, 'Expected database.ok to be true');
  });

  console.log('\n--- 2. Registration Tests ---');
  await test('Registration', 'Missing name returns 400 with validation error', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@test-fixxy.edu',
      password: 'Password123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.name !== undefined, 'Expected name validation error');
  });

  await test('Registration', 'Missing email returns 400 with validation error', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'No Email',
      password: 'Password123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.email !== undefined, 'Expected email validation error');
  });

  await test('Registration', 'Malformed email returns 400 with validation error', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'Password123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.email !== undefined, 'Expected email validation error');
  });

  await test('Registration', 'Weak password (<8 chars or no digits) returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short Password',
      email: 'shortpass@test-fixxy.edu',
      password: 'short',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.password !== undefined, 'Expected password validation error');
  });

  await test('Registration', 'Valid registration creates student, returns 201 with safe DTO', async () => {
    // Testing email normalization (mixed case input)
    const mixedEmail = `STUDENT_${uniqueId}@TEST-FIXXY.EDU`;
    const res = await request(app).post('/api/auth/register').send({
      name: `  ${testName}  `,
      email: mixedEmail,
      password: testPassword,
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.message === 'Registration successful', 'Expected success message');
    assert(res.body.student.id !== undefined, 'Expected student.id');
    assert(res.body.student.name === testName, `Expected trimmed name "${testName}", got "${res.body.student.name}"`);
    assert(res.body.student.email === testEmail, `Expected normalized email "${testEmail}", got "${res.body.student.email}"`);
    assert(res.body.student.password_hash === undefined, 'Security violation: password_hash leaked in response');

    registeredStudentId = res.body.student.id;
  });

  await test('Registration', 'Password is securely hashed with bcrypt in database', async () => {
    const dbRes = await pool.query('SELECT password_hash FROM students WHERE id = $1', [registeredStudentId]);
    assert(dbRes.rows.length === 1, 'Student row not found in database');
    const hash = dbRes.rows[0].password_hash;
    assert(hash !== testPassword, 'Security violation: password stored in plain text');
    assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Password hash is not a valid bcrypt hash');
    const matches = await bcrypt.compare(testPassword, hash);
    assert(matches === true, 'bcrypt.compare failed on stored password hash');
  });

  await test('Registration', 'Duplicate email registration returns 409 Conflict', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Student',
      email: testEmail.toUpperCase(),
      password: 'Password123',
    });
    assert(res.status === 409, `Expected 409, got ${res.status}`);
    assert(res.body.message === 'Email is already registered', `Unexpected message: ${res.body.message}`);
  });

  console.log('\n--- 3. Login Tests ---');
  await test('Login', 'Missing email or password returns 400', async () => {
    const res1 = await request(app).post('/api/auth/login').send({ password: 'Password123' });
    assert(res1.status === 400, `Expected 400 for missing email, got ${res1.status}`);

    const res2 = await request(app).post('/api/auth/login').send({ email: testEmail });
    assert(res2.status === 400, `Expected 400 for missing password, got ${res2.status}`);
  });

  await test('Login', 'Nonexistent email returns 401 with generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@test-fixxy.edu',
      password: 'Password123',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body.message === 'Invalid email or password', `Unexpected error message: ${res.body.message}`);
  });

  await test('Login', 'Wrong password returns 401 with generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: 'WrongPassword123',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body.message === 'Invalid email or password', `Unexpected error message: ${res.body.message}`);
  });

  await test('Login', 'Valid credentials return 200, safe DTO, and set HttpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail.toUpperCase(), // Testing case normalization
      password: testPassword,
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.student.id === registeredStudentId, 'Returned student ID mismatch');
    assert(res.body.student.password_hash === undefined, 'Security violation: password_hash leaked in login response');

    // Verify Set-Cookie header
    const cookies = res.headers['set-cookie'] as unknown as string[];
    assert(Array.isArray(cookies), 'Expected Set-Cookie header');
    const tokenCookie = cookies.find((c: string) => c.startsWith(`${env.cookieName}=`));
    assert(tokenCookie !== undefined, `Cookie ${env.cookieName} not found in headers`);
    assert(tokenCookie!.includes('HttpOnly'), 'Cookie missing HttpOnly flag');
    assert(tokenCookie!.includes('SameSite=Lax') || tokenCookie!.includes('samesite=lax'), 'Cookie missing SameSite=Lax flag');

    authCookie = tokenCookie!;
  });

  console.log('\n--- 4. Protected Route & /me Tests ---');
  await test('/me', 'Unauthenticated request to /api/auth/me returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body.message === 'Authentication required', `Unexpected message: ${res.body.message}`);
  });

  await test('/me', 'Authenticated request with HttpOnly cookie returns 200 and safe student DTO', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.student.id === registeredStudentId, 'Mismatched student id');
    assert(res.body.student.name === testName, 'Mismatched student name');
    assert(res.body.student.email === testEmail, 'Mismatched student email');
    assert(res.body.student.password_hash === undefined, 'Security violation: password_hash in /me response');
  });

  await test('/me', 'Malformed JWT token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${env.cookieName}=invalid.token.payload; Path=/;`);

    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body.message.includes('token') || res.body.message.includes('Authentication'), 'Expected token error message');
  });

  await test('/me', 'Expired JWT token returns 401', async () => {
    const expiredToken = jwt.sign(
      { studentId: registeredStudentId, email: testEmail, name: testName },
      env.jwtSecret,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${env.cookieName}=${expiredToken}; Path=/;`);

    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('Protected API', 'GET /api/protected/ping identifies correct req.user.studentId', async () => {
    const res = await request(app)
      .get('/api/protected/ping')
      .set('Cookie', authCookie);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.studentId === registeredStudentId, 'Protected API did not extract correct studentId');
    assert(res.body.studentEmail === testEmail, 'Protected API did not extract correct email');
  });

  console.log('\n--- 5. Logout Tests ---');
  await test('Logout', 'POST /api/auth/logout clears authentication cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.message === 'Logout successful', `Unexpected message: ${res.body.message}`);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    assert(Array.isArray(cookies), 'Expected Set-Cookie header on logout');
    const clearedCookie = cookies.find((c: string) => c.startsWith(`${env.cookieName}=`));
    assert(clearedCookie !== undefined, 'Logout did not send cookie header');
    // Cookie cleared check: empty value or expires in the past / Max-Age=0
    assert(
      clearedCookie!.includes('Max-Age=0') ||
      clearedCookie!.includes('expires=Thu, 01 Jan 1970') ||
      clearedCookie!.split(';')[0] === `${env.cookieName}=`,
      'Cookie was not properly cleared on logout'
    );
  });

  await test('Logout', 'Subsequent /api/auth/me request without cookie returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert(res.status === 401, `Expected 401 after logout, got ${res.status}`);
  });

  console.log('\n--- 6. Profile API & Authentication Protection Tests ---');
  await test('Profile API', 'Unauthenticated GET /api/profile returns 401', async () => {
    const res = await request(app).get('/api/profile');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('Profile API', 'Unauthenticated PUT /api/profile returns 401', async () => {
    const res = await request(app).put('/api/profile').send({ displayName: 'Hacker' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Login as test student
  const loginRes = await request(app).post('/api/auth/login').send({
    email: testEmail,
    password: testPassword,
  });
  const cookiesList = loginRes.headers['set-cookie'] as unknown as string[];
  const userCookie = cookiesList.find((c: string) => c.startsWith(`${env.cookieName}=`))!;

  await test('Profile API', 'Authenticated GET /api/profile returns 200 and profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', userCookie);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.profile !== undefined, 'Expected profile object in response');
    assert(res.body.profile.displayName === testName, `Expected displayName ${testName}, got ${res.body.profile.displayName}`);
    assert(res.body.profile.learningLevel === 'BEGINNER', 'Expected default level BEGINNER');
    assert(res.body.profile.preferredLearningStyle === 'TEXT', 'Expected default style TEXT');
    assert(res.body.profile.preferredLanguage === 'English', 'Expected default language English');
    assert(res.body.password === undefined, 'Password should never be returned');
    assert(res.body.password_hash === undefined, 'Password hash should never be returned');
    assert(res.body.profile.password_hash === undefined, 'Password hash should never be in profile');
  });

  console.log('\n--- 7. Profile Update & Validation Tests ---');
  await test('Profile Validation', 'Empty display name returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: '   ',
        learningLevel: 'BEGINNER',
        preferredLearningStyle: 'TEXT',
        preferredLanguage: 'English',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.displayName !== undefined, 'Expected displayName validation error');
  });

  await test('Profile Validation', 'Missing display name returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        learningLevel: 'BEGINNER',
        preferredLearningStyle: 'TEXT',
        preferredLanguage: 'English',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.displayName !== undefined, 'Expected displayName validation error');
  });

  await test('Profile Validation', 'Oversized display name (>100 chars) returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: 'A'.repeat(101),
        learningLevel: 'BEGINNER',
        preferredLearningStyle: 'TEXT',
        preferredLanguage: 'English',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.displayName !== undefined, 'Expected displayName validation error');
  });

  await test('Profile Validation', 'Invalid learning level returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: 'Valid Name',
        learningLevel: 'EXPERT_MASTER',
        preferredLearningStyle: 'TEXT',
        preferredLanguage: 'English',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.learningLevel !== undefined, 'Expected learningLevel validation error');
  });

  await test('Profile Validation', 'Invalid preferred learning style returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: 'Valid Name',
        learningLevel: 'INTERMEDIATE',
        preferredLearningStyle: 'TELEPATHY',
        preferredLanguage: 'English',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.preferredLearningStyle !== undefined, 'Expected preferredLearningStyle validation error');
  });

  await test('Profile Validation', 'Invalid preferred language returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: 'Valid Name',
        learningLevel: 'INTERMEDIATE',
        preferredLearningStyle: 'VISUAL',
        preferredLanguage: 'Klingon',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.preferredLanguage !== undefined, 'Expected preferredLanguage validation error');
  });

  await test('Profile Validation', 'Invalid avatar URL (not http/https) returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: 'Valid Name',
        learningLevel: 'INTERMEDIATE',
        preferredLearningStyle: 'VISUAL',
        preferredLanguage: 'English',
        avatarUrl: 'javascript:alert(1)',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.avatarUrl !== undefined, 'Expected avatarUrl validation error');
  });

  await test('Profile Validation', 'Oversized bio (>500 chars) returns 400', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send({
        displayName: 'Valid Name',
        bio: 'X'.repeat(501),
        learningLevel: 'INTERMEDIATE',
        preferredLearningStyle: 'VISUAL',
        preferredLanguage: 'English',
      });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.bio !== undefined, 'Expected bio validation error');
  });

  console.log('\n--- 8. Profile Persistence & Update Tests ---');
  await test('Profile Update', 'Valid PUT /api/profile updates and persists all fields', async () => {
    const updatePayload = {
      displayName: 'Ada Lovelace Updated',
      bio: 'Pioneer of computer programming and AI enthusiast.',
      learningLevel: 'ADVANCED',
      learningGoal: 'Master Deep Neural Networks and Transformers',
      preferredLearningStyle: 'EXAMPLE_BASED',
      preferredLanguage: 'French',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    };

    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', userCookie)
      .send(updatePayload);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.message === 'Profile updated successfully', 'Expected success message');
    assert(res.body.profile.displayName === updatePayload.displayName, 'displayName mismatch');
    assert(res.body.profile.bio === updatePayload.bio, 'bio mismatch');
    assert(res.body.profile.learningLevel === 'ADVANCED', 'learningLevel mismatch');
    assert(res.body.profile.learningGoal === updatePayload.learningGoal, 'learningGoal mismatch');
    assert(res.body.profile.preferredLearningStyle === 'EXAMPLE_BASED', 'learningStyle mismatch');
    assert(res.body.profile.preferredLanguage === 'French', 'preferredLanguage mismatch');
    assert(res.body.profile.avatarUrl === updatePayload.avatarUrl, 'avatarUrl mismatch');

    // Verify GET immediately afterwards reflects updated values (persistence)
    const getRes = await request(app)
      .get('/api/profile')
      .set('Cookie', userCookie);

    assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    assert(getRes.body.profile.displayName === updatePayload.displayName, 'Persisted displayName mismatch');
    assert(getRes.body.profile.bio === updatePayload.bio, 'Persisted bio mismatch');
    assert(getRes.body.profile.learningLevel === 'ADVANCED', 'Persisted learningLevel mismatch');
    assert(getRes.body.profile.learningGoal === updatePayload.learningGoal, 'Persisted learningGoal mismatch');
  });

  console.log('\n--- 9. Student Isolation & Security Tests ---');
  // Create Student A and Student B
  const studentAEmail = `student_a_${uniqueId}@test-fixxy.edu`;
  const studentBEmail = `student_b_${uniqueId}@test-fixxy.edu`;

  await request(app).post('/api/auth/register').send({
    name: 'Alice Turing',
    email: studentAEmail,
    password: 'Password123',
  });
  const resLoginA = await request(app).post('/api/auth/login').send({
    email: studentAEmail,
    password: 'Password123',
  });
  const cookieA = (resLoginA.headers['set-cookie'] as unknown as string[]).find((c: string) => c.startsWith(`${env.cookieName}=`))!;
  const studentAId = resLoginA.body.student.id;

  await request(app).post('/api/auth/register').send({
    name: 'Bob Shannon',
    email: studentBEmail,
    password: 'Password123',
  });
  const resLoginB = await request(app).post('/api/auth/login').send({
    email: studentBEmail,
    password: 'Password123',
  });
  const cookieB = (resLoginB.headers['set-cookie'] as unknown as string[]).find((c: string) => c.startsWith(`${env.cookieName}=`))!;
  const studentBId = resLoginB.body.student.id;

  // Set Student A's profile
  await request(app)
    .put('/api/profile')
    .set('Cookie', cookieA)
    .send({
      displayName: 'Alice Original',
      bio: 'Student A secret bio',
      learningLevel: 'ADVANCED',
      preferredLearningStyle: 'ANALOGY',
      preferredLanguage: 'English',
    });

  // Set Student B's profile
  await request(app)
    .put('/api/profile')
    .set('Cookie', cookieB)
    .send({
      displayName: 'Bob Original',
      bio: 'Student B bio',
      learningLevel: 'BEGINNER',
      preferredLearningStyle: 'PRACTICE',
      preferredLanguage: 'Spanish',
    });

  await test('Student Isolation', 'Student A receives Profile A and Student B receives Profile B', async () => {
    const resA = await request(app).get('/api/profile').set('Cookie', cookieA);
    const resB = await request(app).get('/api/profile').set('Cookie', cookieB);

    assert(resA.body.profile.displayName === 'Alice Original', 'Student A did not receive Profile A');
    assert(resB.body.profile.displayName === 'Bob Original', 'Student B did not receive Profile B');
    assert(resA.body.profile.bio === 'Student A secret bio', 'Student A bio mismatch');
    assert(resB.body.profile.bio === 'Student B bio', 'Student B bio mismatch');
  });

  await test('Student Isolation', 'Student B cannot update Student A profile via body studentId tampering', async () => {
    // Student B attempts IDOR attack by including Student A's studentId in PUT body
    const hackAttempt = await request(app)
      .put('/api/profile')
      .set('Cookie', cookieB)
      .send({
        studentId: studentAId, // Attempted hijack
        displayName: 'Hacked By Bob',
        bio: 'Overwritten bio',
        learningLevel: 'BEGINNER',
        preferredLearningStyle: 'TEXT',
        preferredLanguage: 'English',
      });

    assert(hackAttempt.status === 200, 'Student B request should succeed on their own profile');
    assert(hackAttempt.body.profile.displayName === 'Hacked By Bob', 'Student B profile was updated');

    // Verify Student A's profile is completely UNTOUCHED
    const checkA = await request(app).get('/api/profile').set('Cookie', cookieA);
    assert(checkA.body.profile.displayName === 'Alice Original', 'CRITICAL SECURITY FAILURE: Student A profile was modified by Student B!');
    assert(checkA.body.profile.bio === 'Student A secret bio', 'CRITICAL SECURITY FAILURE: Student A bio was modified by Student B!');
  });

  console.log('\n--- 10. Database Constraints & Cascade Behavior Tests ---');
  await test('Database', 'Deleting a student cascades and deletes their profile', async () => {
    // Delete student B
    await pool.query('DELETE FROM students WHERE id = $1', [studentBId]);

    // Check student_profiles table directly
    const profileCheck = await pool.query('SELECT * FROM student_profiles WHERE student_id = $1', [studentBId]);
    assert(profileCheck.rows.length === 0, 'Profile row was not deleted when student was deleted (Cascade failed)');
  });

  console.log('\n--- 11. Module 3: Curriculum Seed & Concepts Catalog Tests ---');
  await test('Curriculum Seed', 'Idempotent seedCurriculum() initializes 3 MVP concepts and relations', async () => {
    const res = await seedCurriculum();
    assert(res.conceptsCount === 3, `Expected 3 concepts, got ${res.conceptsCount}`);
    assert(res.prerequisitesCount >= 2, `Expected at least 2 prereqs, got ${res.prerequisitesCount}`);
    assert(res.misconceptionsCount >= 6, `Expected at least 6 misconceptions, got ${res.misconceptionsCount}`);
    assert(res.contentCount >= 18, `Expected at least 18 content items, got ${res.contentCount}`);
  });

  await test('Curriculum API', 'GET /api/curriculum/concepts returns 200 and ordered active concepts', async () => {
    const res = await request(app).get('/api/curriculum/concepts');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.concepts), 'Expected concepts array');
    assert(res.body.concepts.length === 3, `Expected 3 concepts, got ${res.body.concepts.length}`);

    // Verify ordering by displayOrder ascending
    const [c1, c2, c3] = res.body.concepts;
    assert(c1.slug === 'overfitting' && c1.displayOrder === 1, 'First concept should be Overfitting with displayOrder 1');
    assert(c1.difficultyLevel === 'BEGINNER', 'Difficulty should be BEGINNER');
    assert(c1.estimatedMinutes === 15, 'Estimated minutes should be 15');

    assert(c2.slug === 'bias-vs-variance' && c2.displayOrder === 2, 'Second concept should be Bias vs Variance with displayOrder 2');
    assert(c2.difficultyLevel === 'BEGINNER', 'Difficulty should be BEGINNER');
    assert(c2.estimatedMinutes === 20, 'Estimated minutes should be 20');

    assert(c3.slug === 'train-validation-test' && c3.displayOrder === 3, 'Third concept should be Train / Validation / Test with displayOrder 3');
    assert(c3.difficultyLevel === 'BEGINNER', 'Difficulty should be BEGINNER');
    assert(c3.estimatedMinutes === 15, 'Estimated minutes should be 15');
  });

  console.log('\n--- 12. Module 3: Concept Detail & Curated Content Tests ---');
  await test('Curriculum API', 'GET /api/curriculum/concepts/overfitting returns complete details, content, and misconceptions', async () => {
    const res = await request(app).get('/api/curriculum/concepts/overfitting');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const c = res.body.concept;
    assert(c.slug === 'overfitting', 'Expected slug overfitting');
    assert(c.title === 'Overfitting', 'Expected title Overfitting');
    assert(c.learningObjective.includes('Recognize overfitting'), 'Expected valid learning objective');
    assert(c.estimatedMinutes === 15, 'Expected 15 min');

    // Prerequisites
    assert(Array.isArray(c.prerequisites), 'Expected prerequisites array');
    assert(c.prerequisites.some((p: any) => p.slug === 'train-validation-test'), 'Overfitting should have train-validation-test as prerequisite');

    // Content sections
    assert(Array.isArray(c.content), 'Expected content array');
    const contentTypes = c.content.map((item: any) => item.contentType);
    assert(contentTypes.includes('OVERVIEW'), 'Missing OVERVIEW');
    assert(contentTypes.includes('KEY_IDEA'), 'Missing KEY_IDEA');
    assert(contentTypes.includes('ANALOGY'), 'Missing ANALOGY');
    assert(contentTypes.includes('EXAMPLE'), 'Missing EXAMPLE');
    assert(contentTypes.includes('COMMON_MISTAKE'), 'Missing COMMON_MISTAKE');
    assert(contentTypes.includes('SUMMARY'), 'Missing SUMMARY');

    // Misconceptions
    assert(Array.isArray(c.misconceptions), 'Expected misconceptions array');
    const codes = c.misconceptions.map((m: any) => m.code);
    assert(codes.includes('OVERFIT_M1'), 'Missing OVERFIT_M1');
    assert(codes.includes('OVERFIT_M2'), 'Missing OVERFIT_M2');
    assert(c.misconceptions[0].guidance && c.misconceptions[0].guidance.length > 0, 'Misconception must include guidance');
  });

  await test('Curriculum API', 'GET /api/curriculum/concepts/bias-vs-variance returns correct prerequisites and 20 min duration', async () => {
    const res = await request(app).get('/api/curriculum/concepts/bias-vs-variance');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const c = res.body.concept;
    assert(c.slug === 'bias-vs-variance', 'Expected slug bias-vs-variance');
    assert(c.estimatedMinutes === 20, 'Expected 20 min for bias-vs-variance');
    assert(c.prerequisites.some((p: any) => p.slug === 'overfitting'), 'Bias vs Variance should have overfitting as prerequisite');
    const codes = c.misconceptions.map((m: any) => m.code);
    assert(codes.includes('BIASVAR_M1'), 'Missing BIASVAR_M1');
  });

  await test('Curriculum API', 'GET /api/curriculum/concepts/train-validation-test returns entry concept with no prerequisites', async () => {
    const res = await request(app).get('/api/curriculum/concepts/train-validation-test');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const c = res.body.concept;
    assert(c.slug === 'train-validation-test', 'Expected slug train-validation-test');
    assert(c.prerequisites.length === 0, 'Entry concept should have 0 prerequisites');
    const codes = c.misconceptions.map((m: any) => m.code);
    assert(codes.includes('TVT_M1'), 'Missing TVT_M1');
  });

  await test('Curriculum API', 'GET /api/curriculum/concepts/unknown-slug returns 404 with Concept not found message', async () => {
    const res = await request(app).get('/api/curriculum/concepts/unknown-slug');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.message === 'Concept not found', 'Expected Concept not found message');
  });

  console.log('\n--- 13. Module 3: Learning Path & Prerequisite Graph Tests ---');
  await test('Learning Path API', 'GET /api/curriculum/path returns ordered sequence and prerequisite relationships', async () => {
    const res = await request(app).get('/api/curriculum/path');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.path), 'Expected path array');
    assert(res.body.path.length === 3, 'Expected 3 nodes in learning path');

    const node1 = res.body.path.find((n: any) => n.slug === 'overfitting');
    const node2 = res.body.path.find((n: any) => n.slug === 'bias-vs-variance');
    const node3 = res.body.path.find((n: any) => n.slug === 'train-validation-test');

    assert(node1 && node1.displayOrder === 1, 'Overfitting displayOrder 1');
    assert(node1.prerequisites.some((p: any) => p.slug === 'train-validation-test'), 'Overfitting requires train-validation-test');

    assert(node2 && node2.displayOrder === 2, 'Bias vs Variance displayOrder 2');
    assert(node2.prerequisites.some((p: any) => p.slug === 'overfitting'), 'Bias vs Variance requires overfitting');

    assert(node3 && node3.displayOrder === 3, 'Train / Validation / Test displayOrder 3');
    assert(node3.prerequisites.length === 0, 'Train / Validation / Test has 0 prerequisites');
  });

  console.log('\n--- 14. Module 3: Prerequisite Validation & DAG Cycle Detection Unit Tests ---');
  await test('Prerequisite Validation', 'Rejects self-prerequisite (concept requiring itself)', async () => {
    const result = curriculumService.validatePrerequisiteRelationship('node-A', 'node-A', []);
    assert(result.valid === false, 'Self-prerequisite must be rejected');
    assert(result.reason?.includes('itself') === true, 'Reason should mention itself');
  });

  await test('Prerequisite Validation', 'Rejects direct circular dependency (A -> B and proposed B -> A)', async () => {
    const existing: Array<[string, string]> = [['node-A', 'node-B']];
    const result = curriculumService.validatePrerequisiteRelationship('node-B', 'node-A', existing);
    assert(result.valid === false, 'Direct cycle must be rejected');
    assert(result.reason?.includes('circular') === true, 'Reason should mention circular dependency');
  });

  await test('Prerequisite Validation', 'Rejects multi-step circular dependency (A -> B, B -> C, proposed C -> A)', async () => {
    const existing: Array<[string, string]> = [
      ['node-A', 'node-B'],
      ['node-B', 'node-C'],
    ];
    const result = curriculumService.validatePrerequisiteRelationship('node-C', 'node-A', existing);
    assert(result.valid === false, 'Multi-step cycle must be rejected');
  });

  await test('Prerequisite Validation', 'Accepts valid directed acyclic prerequisite relationship', async () => {
    const existing: Array<[string, string]> = [
      ['node-A', 'node-B'],
      ['node-B', 'node-C'],
    ];
    const result = curriculumService.validatePrerequisiteRelationship('node-D', 'node-C', existing);
    assert(result.valid === true, 'Valid DAG edge must be accepted');
  });

  console.log('\n--- 15. Module 3: Database Constraints & Idempotency Tests ---');
  await test('Database Constraints', 'Database enforces UNIQUE constraint on concept slug', async () => {
    let duplicateRejected = false;
    try {
      await pool.query(`
        INSERT INTO concepts (
          slug, title, short_description, description, learning_objective
        ) VALUES ('overfitting', 'Duplicate Overfitting', 'desc', 'desc', 'obj');
      `);
    } catch (err: any) {
      if (err.code === '23505') {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Duplicate concept slug must be rejected with 23505');
  });

  await test('Database Constraints', 'Database enforces UNIQUE constraint on misconception code', async () => {
    let duplicateRejected = false;
    try {
      const conceptRes = await pool.query("SELECT id FROM concepts WHERE slug = 'overfitting' LIMIT 1");
      const cId = conceptRes.rows[0].id;
      await pool.query(`
        INSERT INTO misconceptions (
          concept_id, code, title, description, guidance
        ) VALUES ($1, 'OVERFIT_M1', 'Dup', 'Dup', 'Dup');
      `, [cId]);
    } catch (err: any) {
      if (err.code === '23505') {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Duplicate misconception code must be rejected with 23505');
  });

  await test('Database Constraints', 'Database enforces chk_no_self_prerequisite constraint', async () => {
    let selfPrereqRejected = false;
    try {
      const conceptRes = await pool.query("SELECT id FROM concepts WHERE slug = 'overfitting' LIMIT 1");
      const cId = conceptRes.rows[0].id;
      await pool.query(`
        INSERT INTO concept_prerequisites (concept_id, prerequisite_concept_id)
        VALUES ($1, $1);
      `, [cId]);
    } catch (err: any) {
      if (err.code === '23514') { // check_violation
        selfPrereqRejected = true;
      }
    }
    assert(selfPrereqRejected, 'Self prerequisite in database must be rejected by chk_no_self_prerequisite');
  });

  await test('Database Integrity', 'Re-running seedCurriculum() produces identical counts without duplicates', async () => {
    const res = await seedCurriculum();
    assert(res.conceptsCount === 3, 'Still exactly 3 concepts');
    assert(res.prerequisitesCount === 2, 'Still exactly 2 prerequisites');
    assert(res.misconceptionsCount === 6, 'Still exactly 6 misconceptions');
    assert(res.contentCount === 18, 'Still exactly 18 content items');
  });

  // ============================================================
  // MODULE 4 & 5: QUESTION ENGINE & ANSWER SUBMISSION TESTS
  // ============================================================
  console.log('\n--- 16. Module 4: Question Engine & Safe DTO Tests ---');
  await seedQuestions();

  let testQuestionId = '';
  let testCorrectOptionId = '';
  let testWrongOptionId = '';
  let secondQuestionId = '';
  let secondQuestionOptionId = '';

  await test('Question Engine', 'GET /api/questions/concept/overfitting returns active questions with answer key stripped', async () => {
    const res = await request(app).get('/api/questions/concept/overfitting');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.questions), 'Expected questions array');
    assert(res.body.questions.length >= 3, 'Expected at least 3 questions');

    const q1 = res.body.questions[0];
    assert(Boolean(q1.id), 'Question must have id');
    assert(Boolean(q1.prompt), 'Question must have prompt');
    assert(Array.isArray(q1.options), 'Question must have options');
    assert(q1.options.length === 4, 'Question must have 4 options');

    // CRITICAL: Ensure server-side answer key is NEVER leaked in student-facing DTO
    for (const opt of q1.options) {
      assert(opt.is_correct === undefined, 'is_correct MUST NOT be present in student-facing DTO');
      assert(opt.isCorrect === undefined, 'isCorrect MUST NOT be present in student-facing DTO');
      assert(opt.misconception_id === undefined, 'misconception_id MUST NOT be present in student-facing DTO');
    }

    testQuestionId = q1.id;
    secondQuestionId = res.body.questions[1].id;
    secondQuestionOptionId = res.body.questions[1].options[0].id;

    // Lookup authoritative correctness directly from database for our test verification
    const dbOptions = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1 ORDER BY position ASC',
      [testQuestionId]
    );
    const correctOpt = dbOptions.rows.find((o) => o.is_correct);
    const wrongOpt = dbOptions.rows.find((o) => !o.is_correct);

    assert(Boolean(correctOpt), 'Must have authoritative correct option in database');
    assert(Boolean(wrongOpt), 'Must have authoritative wrong option in database');

    testCorrectOptionId = correctOpt.id;
    testWrongOptionId = wrongOpt.id;
  });

  console.log('\n--- 17. Module 5: Answer Submission — Authentication & Validation Tests ---');

  await test('Answer Submission Validation', 'Unauthenticated POST /api/attempts returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .send({ questionId: testQuestionId, selectedOptionId: testCorrectOptionId });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body.message.includes('Authentication required') || res.body.message.includes('token'), 'Expected auth required error message');
  });

  await test('Answer Submission Validation', 'Missing questionId returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ selectedOptionId: testCorrectOptionId });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.questionId || res.body.message.includes('questionId'), 'Expected questionId validation error');
  });

  await test('Answer Submission Validation', 'Missing selectedOptionId returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.errors?.selectedOptionId || res.body.message.includes('selectedOptionId'), 'Expected selectedOptionId validation error');
  });

  await test('Answer Submission Validation', 'Malformed non-UUID questionId returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: 'not-a-valid-uuid', selectedOptionId: testCorrectOptionId });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Answer Submission Validation', 'Malformed non-UUID selectedOptionId returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: '12345' });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Answer Submission Validation', 'Non-existent question UUID returns 404 Not Found', async () => {
    const randomUuid = '00000000-0000-4000-8000-000000000001';
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: randomUuid, selectedOptionId: testCorrectOptionId });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.message.includes('Question'), 'Expected question not found message');
  });

  await test('Answer Submission Validation', 'Non-existent option UUID returns 404 Not Found', async () => {
    const randomUuid = '00000000-0000-4000-8000-000000000002';
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: randomUuid });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.message.includes('Option'), 'Expected option not found message');
  });

  await test('Answer Submission Validation', 'Option belonging to a different question returns 400 Bad Request', async () => {
    // Submit testQuestionId with an option that belongs to secondQuestionId
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: secondQuestionOptionId });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(
      res.body.message.includes('does not belong to the specified question'),
      'Expected mismatch rejection message'
    );
  });

  console.log('\n--- 18. Module 5: Answer Submission — Correctness & Database Persistence Tests ---');

  let savedAttemptId = '';

  await test('Answer Submission Core', 'Submit valid correct answer returns 201 Created and result.correct = true', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: testCorrectOptionId });

    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body.result?.correct === true, 'Expected result.correct to be true');
    assert(res.body.attempt?.isCorrect === true, 'Expected attempt.isCorrect to be true');
    assert(res.body.attempt?.questionId === testQuestionId, 'attempt.questionId must match');
    assert(res.body.attempt?.selectedOptionId === testCorrectOptionId, 'attempt.selectedOptionId must match');
    assert(res.body.attempt?.attemptNumber === 1, 'attempt.attemptNumber must be 1 for first attempt');
    assert(Boolean(res.body.attempt?.submittedAt), 'attempt must have submittedAt timestamp');

    savedAttemptId = res.body.attempt.id;

    // Database verification: confirm attempt was persisted accurately in PostgreSQL
    const dbRow = await pool.query('SELECT * FROM attempts WHERE id = $1', [savedAttemptId]);
    assert(dbRow.rows.length === 1, 'Attempt must exist in database');
    assert(dbRow.rows[0].student_id === registeredStudentId, 'Database student_id must match authenticated student');
    assert(dbRow.rows[0].is_correct === true, 'Database is_correct must be true');
    assert(dbRow.rows[0].attempt_number === 1, 'Database attempt_number must be 1');
  });

  await test('Answer Submission Core', 'Submit valid wrong answer returns 201 Created and result.correct = false', async () => {
    // Wait 2.1 seconds to avoid rapid duplicate window on secondQuestion
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const dbOptionsQ2 = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1 AND is_correct = FALSE LIMIT 1',
      [secondQuestionId]
    );
    const wrongOptQ2 = dbOptionsQ2.rows[0].id;

    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: secondQuestionId, selectedOptionId: wrongOptQ2 });

    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body.result?.correct === false, 'Expected result.correct to be false');
    assert(res.body.attempt?.isCorrect === false, 'Expected attempt.isCorrect to be false');

    const dbRow = await pool.query('SELECT * FROM attempts WHERE id = $1', [res.body.attempt.id]);
    assert(dbRow.rows.length === 1, 'Attempt must exist in database');
    assert(dbRow.rows[0].is_correct === false, 'Database is_correct must be false');
  });

  console.log('\n--- 19. Module 5: Security & Anti-Tampering Tests ---');

  await test('Security Anti-Tampering', 'Server overrides client-supplied isCorrect=true when option is wrong', async () => {
    // Wait 2.1s to avoid duplicate prevention window
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({
        questionId: testQuestionId,
        selectedOptionId: testWrongOptionId,
        // MALICIOUS ATTEMPT: client tries to claim answer is correct
        isCorrect: true,
        correct: true,
      });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(
      res.body.result.correct === false,
      'Server MUST determine correctness from database truth; client-supplied isCorrect=true must be rejected!'
    );
    assert(
      res.body.attempt.isCorrect === false,
      'attempt.isCorrect must be false'
    );

    // Database check: verify database recorded false
    const dbRow = await pool.query('SELECT is_correct FROM attempts WHERE id = $1', [res.body.attempt.id]);
    assert(dbRow.rows[0].is_correct === false, 'Database record MUST be false');
  });

  await test('Security Anti-Tampering', 'Server ignores client-supplied studentId tampering and uses authenticated identity', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const forgedStudentId = '00000000-0000-4000-8000-000000000999';
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({
        questionId: testQuestionId,
        selectedOptionId: testCorrectOptionId,
        studentId: forgedStudentId, // TAMPERED studentId in request body
      });

    assert(res.status === 201, `Expected 201, got ${res.status}`);

    const dbRow = await pool.query('SELECT student_id FROM attempts WHERE id = $1', [res.body.attempt.id]);
    assert(
      dbRow.rows[0].student_id === registeredStudentId,
      'Database student_id MUST match authenticated cookie student, NOT forged body studentId'
    );
    assert(
      dbRow.rows[0].student_id !== forgedStudentId,
      'Forged student ID must never be used'
    );
  });

  console.log('\n--- 20. Module 5: Session Integration & Student Isolation Tests ---');

  // Create Student B
  const studentB_email = `student_b_${uniqueId}@test-fixxy.edu`;
  const studentB_res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Grace Hopper', email: studentB_email, password: testPassword });
  assert(studentB_res.status === 201, 'Student B registered');
  const studentB_id = studentB_res.body.student.id;

  // Log in Student B to obtain valid session cookie
  const studentB_login = await request(app)
    .post('/api/auth/login')
    .send({ email: studentB_email, password: testPassword });
  assert(studentB_login.status === 200, 'Student B logged in');
  const studentB_cookies = studentB_login.headers['set-cookie'] as unknown as string[];
  const studentB_cookie = studentB_cookies.find((c) => c.startsWith(`${env.cookieName}=`))!;
  assert(Boolean(studentB_cookie), 'Student B cookie must be present');

  // Create a learning session for Student A on overfitting
  const conceptRes = await pool.query("SELECT id FROM concepts WHERE slug = 'overfitting'");
  const overfittingConceptId = conceptRes.rows[0].id;

  const sessionARes = await pool.query(
    `INSERT INTO learning_sessions (student_id, concept_id, status)
     VALUES ($1, $2, 'practice')
     RETURNING id`,
    [registeredStudentId, overfittingConceptId]
  );
  const sessionA_id = sessionARes.rows[0].id;

  await test('Session Integration', 'Valid submission with active session records session_id in attempt', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({
        questionId: testQuestionId,
        selectedOptionId: testCorrectOptionId,
        sessionId: sessionA_id,
      });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.attempt.sessionId === sessionA_id, 'attempt.sessionId must match');

    const dbRow = await pool.query('SELECT session_id FROM attempts WHERE id = $1', [res.body.attempt.id]);
    assert(dbRow.rows[0].session_id === sessionA_id, 'Database session_id must match');
  });

  await test('Session Security', 'Student B cannot submit an answer against Student A session (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [studentB_cookie])
      .send({
        questionId: testQuestionId,
        selectedOptionId: testCorrectOptionId,
        sessionId: sessionA_id, // Belongs to Student A!
      });

    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    assert(
      res.body.message.includes('Unauthorized') || res.body.message.includes('not belong to'),
      'Expected session ownership violation message'
    );
  });

  await test('Session Validation', 'Submission with non-existent sessionId returns 404 Not Found', async () => {
    const randomSessionId = '00000000-0000-4000-8000-000000000777';
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({
        questionId: testQuestionId,
        selectedOptionId: testCorrectOptionId,
        sessionId: randomSessionId,
      });

    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.message.includes('session'), 'Expected session not found message');
  });

  await test('Session Validation', 'Submission with question from different concept than session returns 400 Bad Request', async () => {
    // Get question for Bias vs Variance
    const bvQRes = await pool.query("SELECT id FROM questions WHERE code = 'BV_Q1' LIMIT 1");
    const bvQuestionId = bvQRes.rows[0].id;
    const bvOptRes = await pool.query("SELECT id FROM question_options WHERE question_id = $1 LIMIT 1", [bvQuestionId]);
    const bvOptionId = bvOptRes.rows[0].id;

    // sessionA_id is for Overfitting!
    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({
        questionId: bvQuestionId,
        selectedOptionId: bvOptionId,
        sessionId: sessionA_id,
      });

    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(
      res.body.message.includes('concept') || res.body.message.includes('session'),
      'Expected concept mismatch message'
    );
  });

  console.log('\n--- 21. Module 5: Duplicate Debounce & Legitimate Attempt Numbering Tests ---');

  await test('Duplicate Handling', 'Rapid duplicate submission within 2 seconds is rejected with 409 Conflict', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2100));

    // First submission
    const res1 = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: testCorrectOptionId });
    assert(res1.status === 201, 'First submission succeeds');

    // Immediate second submission (<2s)
    const res2 = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: testCorrectOptionId });
    assert(res2.status === 409, `Expected 409 Conflict for rapid duplicate, got ${res2.status}`);
    assert(res2.body.message.includes('Duplicate submission'), 'Expected duplicate submission warning');
  });

  await test('Attempt Numbering', 'Legitimate subsequent attempts increment attempt_number accurately', async () => {
    // Wait >2s for debouncing window to pass
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const currentCount = await pool.query(
      'SELECT COUNT(*) FROM attempts WHERE student_id = $1 AND question_id = $2',
      [registeredStudentId, testQuestionId]
    );
    const expectedAttemptNum = parseInt(currentCount.rows[0].count, 10) + 1;

    const res = await request(app)
      .post('/api/attempts')
      .set('Cookie', [authCookie])
      .send({ questionId: testQuestionId, selectedOptionId: testWrongOptionId });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(
      res.body.attempt.attemptNumber === expectedAttemptNum,
      `Expected attemptNumber ${expectedAttemptNum}, got ${res.body.attempt.attemptNumber}`
    );
  });

  console.log('\n--- 22. Module 5: Attempt History & Student Isolation Tests ---');

  await test('Attempt History', 'GET /api/attempts/history returns only the authenticated student attempts', async () => {
    const resA = await request(app)
      .get('/api/attempts/history')
      .set('Cookie', [authCookie]);

    assert(resA.status === 200, `Expected 200, got ${resA.status}`);
    assert(Array.isArray(resA.body.attempts), 'Expected attempts array');
    assert(resA.body.attempts.length > 0, 'Student A must have recorded attempts');

    for (const att of resA.body.attempts) {
      assert(att.studentId === registeredStudentId, 'Every attempt must belong to Student A');
    }

    // Check Student B history
    const resB = await request(app)
      .get('/api/attempts/history')
      .set('Cookie', [studentB_cookie]);

    assert(resB.status === 200, `Expected 200, got ${resB.status}`);
    assert(Array.isArray(resB.body.attempts), 'Expected attempts array');
    // Student B should have 0 attempts because they never submitted successfully
    assert(resB.body.attempts.length === 0, 'Student B must have 0 attempts; complete isolation!');
  });

  // ============================================================
  // MODULE 7: MASTERY DASHBOARD & PROGRESS VERIFICATION TESTS
  // ============================================================
  console.log('\n--- 23. Module 7: Mastery Dashboard & Progress Tests ---');

  await test('Mastery Dashboard', 'GET /api/mastery returns 200 with valid summary for authenticated student', async () => {
    const res = await request(app)
      .get('/api/mastery')
      .set('Cookie', [authCookie]);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.summary !== undefined, 'Expected summary object in body');
    assert(typeof res.body.summary.overallMastery === 'number', 'Expected overallMastery number');
    assert(typeof res.body.summary.masteryLevel === 'string', 'Expected masteryLevel string');
    assert(typeof res.body.summary.conceptsStarted === 'number', 'Expected conceptsStarted count');
  });

  await test('Mastery Dashboard', 'GET /api/mastery/concepts returns concept list with deterministic scores', async () => {
    const res = await request(app)
      .get('/api/mastery/concepts')
      .set('Cookie', [authCookie]);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.concepts), 'Expected concepts array');
    assert(res.body.concepts.length >= 3, 'Expected at least 3 active concepts');

    const overfit = res.body.concepts.find((c: any) => c.slug === 'overfitting');
    assert(Boolean(overfit), 'Overfitting concept exists in list');
    assert(typeof overfit.masteryScore === 'number', 'Mastery score is numeric');
    assert(overfit.masteryScore >= 0 && overfit.masteryScore <= 100, 'Score is clamped between 0 and 100');
  });

  await test('Mastery Dashboard', 'GET /api/mastery/activity returns recent learning events', async () => {
    const res = await request(app)
      .get('/api/mastery/activity')
      .set('Cookie', [authCookie]);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.activity), 'Expected activity array');
  });

  await test('Mastery Dashboard', 'GET /api/mastery/insights returns deterministic insights array', async () => {
    const res = await request(app)
      .get('/api/mastery/insights')
      .set('Cookie', [authCookie]);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.insights), 'Expected insights array');
  });

  await test('Mastery Dashboard', 'Student B receives 0 mastery and isolated empty history', async () => {
    const res = await request(app)
      .get('/api/mastery')
      .set('Cookie', [studentB_cookie]);

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.summary.overallMastery === 0, 'Student B overall mastery is 0');
    assert(res.body.summary.totalAttempts === 0, 'Student B total attempts is 0');
    assert(res.body.summary.masteryLevel === 'NOT_STARTED', 'Student B level is NOT_STARTED');
  });

  // Clean up Student B after tests
  await pool.query('DELETE FROM students WHERE id = $1', [studentB_id]);


  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('='.repeat(60));

  await closePool();

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(async (err) => {
  console.error('Test execution failed:', err);
  await closePool();
  process.exit(1);
});
