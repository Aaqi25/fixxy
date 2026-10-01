import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { pool, closePool } from '../src/config/db';

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
