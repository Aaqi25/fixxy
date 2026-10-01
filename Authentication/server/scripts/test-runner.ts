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
