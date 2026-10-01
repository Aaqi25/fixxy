import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closePool } from '../src/config/db';
import { seedCurriculum } from '../db/seeds/curriculum.seed';
import { seedQuestions } from '../db/seeds/questions.seed';

async function runE2E() {
  console.log('='.repeat(65));
  console.log('FIXXY Module 4 — End-to-End (E2E) Flow & Security Verification');
  console.log('='.repeat(65));

  const app = createApp();

  // 1. Seed Curriculum and Questions
  console.log('\n[1/7] Ensuring database is seeded with Curriculum and Questions...');
  await seedCurriculum();
  await seedQuestions();
  console.log('  ✓ Seed data ready.');

  // 2. Authenticate Student A (Module 1 & 2)
  console.log('\n[2/7] Authenticating Student A...');
  const studentEmail = `e2e_student_${Date.now()}@fixxy.edu`;
  const studentPassword = 'Password123!';
  const registerRes = await request(app).post('/api/auth/register').send({
    name: 'Ada Lovelace',
    email: studentEmail,
    password: studentPassword,
  });
  if (registerRes.status !== 201) {
    throw new Error(`Registration failed with status ${registerRes.status}: ${JSON.stringify(registerRes.body)}`);
  }

  const loginRes = await request(app).post('/api/auth/login').send({
    email: studentEmail,
    password: studentPassword,
  });
  const cookieA = loginRes.headers['set-cookie']?.[0] || '';
  console.log('  ✓ Student A authenticated.');

  // 3. Open Curriculum & Select Overfitting (Module 3)
  console.log('\n[3/7] Accessing Curriculum and selecting Overfitting concept...');
  const curriculumRes = await request(app).get('/api/curriculum/concepts/overfitting').set('Cookie', cookieA);
  if (curriculumRes.status !== 200) {
    throw new Error(`Curriculum lookup failed: ${JSON.stringify(curriculumRes.body)}`);
  }
  console.log(`  ✓ Retrieved concept: "${curriculumRes.body.title}" (${curriculumRes.body.slug})`);

  // 4. Start Learning Session & Request Practice Question (Module 4)
  console.log('\n[4/7] Starting learning session & requesting PRACTICE question...');
  const practiceRes = await request(app).get('/api/questions/practice/overfitting').set('Cookie', cookieA);
  if (practiceRes.status !== 200) {
    throw new Error(`Practice question request failed: ${JSON.stringify(practiceRes.body)}`);
  }

  const practiceQ = practiceRes.body.question;
  const sessionId = practiceRes.body.session.id;
  console.log(`  ✓ Practice Question ID: ${practiceQ.id}`);
  console.log(`  ✓ Prompt: "${practiceQ.text}"`);
  console.log(`  ✓ Options: ${practiceQ.options.length} choices`);

  // Security Check: No correct answer fields leaked
  const rawPracticeJson = JSON.stringify(practiceRes.body);
  if (rawPracticeJson.includes('is_correct') || rawPracticeJson.includes('isCorrect') || rawPracticeJson.includes('correctOptionId')) {
    throw new Error('SECURITY VIOLATION: Correct answer metadata leaked to student!');
  }
  console.log('  ✓ Security Audit: Student-safe DTO confirmed (no answer leakage).');

  // 5. Request Retry Question & Validate Separation (Module 4)
  console.log('\n[5/7] Requesting RETRY question for session...');
  const retryRes = await request(app).get(`/api/questions/retry/${sessionId}`).set('Cookie', cookieA);
  if (retryRes.status !== 200) {
    throw new Error(`Retry question request failed: ${JSON.stringify(retryRes.body)}`);
  }

  const retryQ = retryRes.body.question;
  console.log(`  ✓ Retry Question ID: ${retryQ.id}`);
  console.log(`  ✓ Prompt: "${retryQ.text}"`);

  if (practiceQ.id === retryQ.id) {
    throw new Error(`SEPARATION VIOLATION: Retry question (${retryQ.id}) matches Practice question (${practiceQ.id})!`);
  }
  console.log('  ✓ Separation Rule Verified: Practice Question != Retry Question.');

  // 6. Request Transfer Question & Validate Separation (Module 4)
  console.log('\n[6/7] Requesting TRANSFER question for session...');
  const transferRes = await request(app).get(`/api/questions/transfer/${sessionId}`).set('Cookie', cookieA);
  if (transferRes.status !== 200) {
    throw new Error(`Transfer question request failed: ${JSON.stringify(transferRes.body)}`);
  }

  const transferQ = transferRes.body.question;
  console.log(`  ✓ Transfer Question ID: ${transferQ.id}`);
  console.log(`  ✓ Prompt: "${transferQ.text}"`);

  if (transferQ.id === practiceQ.id || transferQ.id === retryQ.id) {
    throw new Error('SEPARATION VIOLATION: Transfer question matches prior questions in session!');
  }
  console.log('  ✓ Separation Rule Verified: Practice != Retry != Transfer.');

  // 7. Student Isolation & Cross-Session Protection
  console.log('\n[7/7] Testing cross-student session isolation (Student B -> Session A)...');
  const studentB_Email = `e2e_student_b_${Date.now()}@fixxy.edu`;
  await request(app).post('/api/auth/register').send({
    name: 'Student B',
    email: studentB_Email,
    password: studentPassword,
  });
  const loginB = await request(app).post('/api/auth/login').send({
    email: studentB_Email,
    password: studentPassword,
  });
  const cookieB = loginB.headers['set-cookie']?.[0] || '';

  const unauthorizedRes = await request(app).get(`/api/questions/retry/${sessionId}`).set('Cookie', cookieB);
  if (unauthorizedRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-student access, got ${unauthorizedRes.status}`);
  }
  console.log('  ✓ Student Isolation Verified: Cross-student session access forbidden (403).');

  // Verify Session Restoration
  const sessionRestoreRes = await request(app).get(`/api/sessions/${sessionId}/questions/current`).set('Cookie', cookieA);
  if (sessionRestoreRes.status !== 200 || sessionRestoreRes.body.question.id !== transferQ.id) {
    throw new Error('Session restoration failed to return current active question.');
  }
  console.log('  ✓ Session State Restoration Verified.');

  console.log('\n' + '='.repeat(65));
  console.log('ALL MODULE 4 END-TO-END VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('='.repeat(65));

  await closePool();
}

runE2E().catch(async (err) => {
  console.error('\nE2E Verification Failed:', err);
  await closePool();
  process.exit(1);
});
