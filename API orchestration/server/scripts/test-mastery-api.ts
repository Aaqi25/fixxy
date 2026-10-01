/**
 * Module 7: Mastery API & Learning Flow Integration Test Suite
 * Tests all /api/mastery endpoints, student isolation, learning flow integration, and security.
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closePool } from '../src/config/db';

const app = createApp();

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    failCount++;
    throw new Error(message);
  } else {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  }
}

async function runMasteryApiTests() {
  console.log('============================================================');
  console.log('FIXXY Module 7 — Mastery Dashboard API Test Suite');
  console.log('============================================================\n');

  // Register Student A and Student B
  const uniqueA = Date.now();
  const studentAEmail = `mastery_a_${uniqueA}@fixxy.test`;
  const studentBEmail = `mastery_b_${uniqueA}@fixxy.test`;

  let cookieA = '';
  let cookieB = '';
  let studentAId = '';
  let studentBId = '';

  // 1. Setup Student A
  const regARes = await request(app).post('/api/auth/register').send({
    name: 'Student A Mastery',
    email: studentAEmail,
    password: 'Password123!',
  });
  assert(regARes.status === 201, 'Student A registered');
  studentAId = regARes.body.student.id;

  const loginResA = await request(app).post('/api/auth/login').send({
    email: studentAEmail,
    password: 'Password123!',
  });
  cookieA = loginResA.headers['set-cookie']?.[0]?.split(';')[0] || '';
  assert(Boolean(cookieA), 'Student A logged in with cookie');

  // 2. Setup Student B
  const regBRes = await request(app).post('/api/auth/register').send({
    name: 'Student B Mastery',
    email: studentBEmail,
    password: 'Password123!',
  });
  assert(regBRes.status === 201, 'Student B registered');
  studentBId = regBRes.body.student.id;

  const loginResB = await request(app).post('/api/auth/login').send({
    email: studentBEmail,
    password: 'Password123!',
  });
  cookieB = loginResB.headers['set-cookie']?.[0]?.split(';')[0] || '';
  assert(Boolean(cookieB), 'Student B logged in with cookie');

  // ============================================================
  // AUTHENTICATION & ACCESS CONTROL TESTS
  // ============================================================
  console.log('\n--- 1. Authentication & Route Protection ---');
  const unauthSummary = await request(app).get('/api/mastery');
  assert(unauthSummary.status === 401, 'Unauthenticated GET /api/mastery returns 401');

  const unauthConcepts = await request(app).get('/api/mastery/concepts');
  assert(unauthConcepts.status === 401, 'Unauthenticated GET /api/mastery/concepts returns 401');

  const unauthActivity = await request(app).get('/api/mastery/activity');
  assert(unauthActivity.status === 401, 'Unauthenticated GET /api/mastery/activity returns 401');

  const unauthInsights = await request(app).get('/api/mastery/insights');
  assert(unauthInsights.status === 401, 'Unauthenticated GET /api/mastery/insights returns 401');

  // ============================================================
  // EMPTY STATE / NEW STUDENT TESTS
  // ============================================================
  console.log('\n--- 2. New Student / Empty State Verification ---');
  const newStudentSummary = await request(app)
    .get('/api/mastery')
    .set('Cookie', cookieA);
  assert(newStudentSummary.status === 200, 'Authenticated GET /api/mastery returns 200');
  assert(newStudentSummary.body.summary.overallMastery === 0, 'New student overallMastery is 0');
  assert(newStudentSummary.body.summary.masteryLevel === 'NOT_STARTED', 'New student masteryLevel is NOT_STARTED');
  assert(newStudentSummary.body.summary.conceptsStarted === 0, 'New student conceptsStarted is 0');
  assert(newStudentSummary.body.summary.totalAttempts === 0, 'New student totalAttempts is 0');

  const newStudentConcepts = await request(app)
    .get('/api/mastery/concepts')
    .set('Cookie', cookieA);
  assert(newStudentConcepts.status === 200, 'Authenticated GET /api/mastery/concepts returns 200');
  assert(Array.isArray(newStudentConcepts.body.concepts), 'Concepts is an array');
  assert(newStudentConcepts.body.concepts.length >= 3, 'Returns all curriculum concepts');
  assert(
    newStudentConcepts.body.concepts.every((c: any) => c.masteryScore === 0 && c.masteryLevel === 'NOT_STARTED'),
    'All concepts initially have score 0 and NOT_STARTED level'
  );

  const newStudentActivity = await request(app)
    .get('/api/mastery/activity')
    .set('Cookie', cookieA);
  assert(newStudentActivity.status === 200, 'Authenticated GET /api/mastery/activity returns 200');
  assert(Array.isArray(newStudentActivity.body.activity) && newStudentActivity.body.activity.length === 0, 'New student activity is empty');

  const newStudentInsights = await request(app)
    .get('/api/mastery/insights')
    .set('Cookie', cookieA);
  assert(newStudentInsights.status === 200, 'Authenticated GET /api/mastery/insights returns 200');
  assert(Array.isArray(newStudentInsights.body.insights) && newStudentInsights.body.insights.length === 0, 'New student insights is empty');

  // ============================================================
  // LEARNING FLOW INTEGRATION & AUTOMATIC RECALCULATION
  // ============================================================
  console.log('\n--- 3. Learning Flow Integration & Evidence Aggregation ---');

  // Step 3a: Start session for Overfitting
  const sessionRes = await request(app)
    .get('/api/sessions/concept/overfitting')
    .set('Cookie', cookieA);
  assert(sessionRes.status === 200, 'Overfitting session started for Student A');
  const sessionId = sessionRes.body.session.id;

  const questionsRes = await request(app).get('/api/questions/concept/overfitting');
  const practiceQ = questionsRes.body.questions.find((q: any) => q.code === 'OVERFIT_Q1');
  assert(Boolean(practiceQ), 'Practice question OVERFIT_Q1 received');

  // Find a wrong option
  const optRes = await pool.query(
    'SELECT id, is_correct FROM question_options WHERE question_id = $1 ORDER BY position ASC',
    [practiceQ.id]
  );
  const wrongOption = optRes.rows.find((o) => !o.is_correct);
  const correctOption = optRes.rows.find((o) => o.is_correct);

  // Submit wrong answer
  const submitWrongRes = await request(app)
    .post('/api/attempts')
    .set('Cookie', cookieA)
    .send({
      questionId: practiceQ.id,
      selectedOptionId: wrongOption.id,
      sessionId,
    });
  assert(submitWrongRes.status === 201, 'Wrong answer submitted');

  // Verify mastery updated immediately for Overfitting
  const updatedConcepts1 = await request(app)
    .get('/api/mastery/concepts')
    .set('Cookie', cookieA);
  const overfit1 = updatedConcepts1.body.concepts.find((c: any) => c.slug === 'overfitting');
  assert(overfit1.attemptCount === 1, 'Attempt count updated to 1');
  assert(overfit1.correctCount === 0, 'Correct count is 0');
  assert(overfit1.masteryScore === 0, 'Mastery score is 0');
  assert(overfit1.masteryLevel === 'BEGINNER', 'Mastery level updated to BEGINNER');

  // Advance session to RETRY
  await request(app).post(`/api/sessions/${sessionId}/advance`).set('Cookie', cookieA);
  const retrySession = await request(app).get(`/api/sessions/${sessionId}`).set('Cookie', cookieA);
  assert(retrySession.body.session.stage === 'RETRY', 'Session advanced to RETRY');
  const retryQ = retrySession.body.session.question;
  assert(Boolean(retryQ), 'Retry question received');

  // Find correct retry option
  const retryOpts = await pool.query(
    'SELECT id, is_correct FROM question_options WHERE question_id = $1',
    [retryQ.id]
  );
  const correctRetryOpt = retryOpts.rows.find((o) => o.is_correct);

  // Submit correct retry answer
  const submitRetryRes = await request(app)
    .post('/api/attempts')
    .set('Cookie', cookieA)
    .send({
      questionId: retryQ.id,
      selectedOptionId: correctRetryOpt.id,
      sessionId,
    });
  assert(submitRetryRes.status === 201, 'Correct retry answer submitted');

  // Verify mastery after retry success
  const updatedConcepts2 = await request(app)
    .get('/api/mastery/concepts')
    .set('Cookie', cookieA);
  const overfit2 = updatedConcepts2.body.concepts.find((c: any) => c.slug === 'overfitting');
  assert(overfit2.attemptCount === 2, 'Attempt count updated to 2');
  assert(overfit2.correctCount === 1, 'Correct count is 1');
  assert(overfit2.retrySuccessCount === 1, 'Retry success count is 1');
  assert(overfit2.masteryScore === 30, 'Mastery score updated to 30 (0 practice + 30 retry)');
  assert(overfit2.masteryLevel === 'BEGINNER', 'Mastery level is BEGINNER');

  // Advance session to TRANSFER
  const transferSession = await request(app).get(`/api/sessions/${sessionId}`).set('Cookie', cookieA);
  assert(transferSession.body.session.stage === 'TRANSFER', 'Session advanced to TRANSFER');
  const transferQ = transferSession.body.session.question;
  assert(Boolean(transferQ), 'Transfer question received');

  // Find correct transfer option
  const transferOpts = await pool.query(
    'SELECT id, is_correct FROM question_options WHERE question_id = $1',
    [transferQ.id]
  );
  const correctTransferOpt = transferOpts.rows.find((o) => o.is_correct);

  // Submit correct transfer answer
  const submitTransferRes = await request(app)
    .post('/api/attempts')
    .set('Cookie', cookieA)
    .send({
      questionId: transferQ.id,
      selectedOptionId: correctTransferOpt.id,
      sessionId,
    });
  assert(submitTransferRes.status === 201, 'Correct transfer answer submitted');

  // Verify concept mastery after transfer success (Full Loop: 0 + 30 + 30 = 60)
  const updatedConcepts3 = await request(app)
    .get('/api/mastery/concepts')
    .set('Cookie', cookieA);
  const overfit3 = updatedConcepts3.body.concepts.find((c: any) => c.slug === 'overfitting');
  assert(overfit3.attemptCount === 3, 'Attempt count is 3');
  assert(overfit3.correctCount === 2, 'Correct count is 2');
  assert(overfit3.retrySuccessCount === 1, 'Retry success count is 1');
  assert(overfit3.transferSuccessCount === 1, 'Transfer success count is 1');
  assert(overfit3.masteryScore === 60, 'Mastery score is 60');
  assert(overfit3.masteryLevel === 'DEVELOPING', 'Mastery level is DEVELOPING');

  // Verify Overall Summary
  const summaryRes = await request(app).get('/api/mastery').set('Cookie', cookieA);
  assert(summaryRes.status === 200, 'GET /api/mastery returns 200');
  assert(summaryRes.body.summary.conceptsStarted === 1, 'Concepts started is 1');
  assert(summaryRes.body.summary.totalAttempts === 3, 'Total attempts is 3');
  assert(summaryRes.body.summary.correctAttempts === 2, 'Correct attempts is 2');
  assert(summaryRes.body.summary.retrySuccesses === 1, 'Retry successes is 1');
  assert(summaryRes.body.summary.transferSuccesses === 1, 'Transfer successes is 1');
  assert(summaryRes.body.summary.overallMastery === 20, 'Overall mastery is 60/3 = 20');

  // Verify Activity List
  const activityRes = await request(app).get('/api/mastery/activity').set('Cookie', cookieA);
  assert(activityRes.status === 200, 'GET /api/mastery/activity returns 200');
  assert(activityRes.body.activity.length === 3, 'Activity has 3 events');
  assert(activityRes.body.activity[0].type === 'TRANSFER_SUCCESS', 'Latest activity is TRANSFER_SUCCESS');
  assert(activityRes.body.activity[1].type === 'RETRY_SUCCESS', 'Second activity is RETRY_SUCCESS');
  assert(activityRes.body.activity[2].type === 'PRACTICE_WRONG', 'Third activity is PRACTICE_WRONG');

  // Verify Learning Insights
  const insightsRes = await request(app).get('/api/mastery/insights').set('Cookie', cookieA);
  assert(insightsRes.status === 200, 'GET /api/mastery/insights returns 200');
  assert(insightsRes.body.insights.length >= 1, 'Generates deterministic insights');
  assert(
    insightsRes.body.insights.some((i: any) => i.type === 'RECENT_IMPROVEMENT'),
    'Includes RECENT_IMPROVEMENT insight'
  );
  assert(
    insightsRes.body.insights.some((i: any) => i.type === 'NEXT_RECOMMENDED'),
    'Includes NEXT_RECOMMENDED insight for unstarted concepts'
  );

  // ============================================================
  // SECURITY & STUDENT ISOLATION TESTS
  // ============================================================
  console.log('\n--- 4. Security & Student Isolation Tests ---');

  // Student B should have 0 evidence and 0 mastery
  const studentBSummary = await request(app).get('/api/mastery').set('Cookie', cookieB);
  assert(studentBSummary.body.summary.overallMastery === 0, 'Student B overallMastery is 0');
  assert(studentBSummary.body.summary.totalAttempts === 0, 'Student B totalAttempts is 0');

  const studentBActivity = await request(app).get('/api/mastery/activity').set('Cookie', cookieB);
  assert(studentBActivity.body.activity.length === 0, 'Student B activity is empty');

  // Tampering attempt with query param studentId
  const tamperedRes = await request(app)
    .get(`/api/mastery?studentId=${studentAId}`)
    .set('Cookie', cookieB);
  assert(tamperedRes.body.summary.overallMastery === 0, 'Student B cannot access Student A data via query tampering');

  // ============================================================
  // DATABASE PERSISTENCE & RESTART INTEGRITY
  // ============================================================
  console.log('\n--- 5. Database Direct Row Verification ---');
  const dbRow = await pool.query(
    'SELECT * FROM student_mastery WHERE student_id = $1',
    [studentAId]
  );
  assert(dbRow.rows.length === 1, 'Persisted row exists in student_mastery table');
  assert(parseFloat(dbRow.rows[0].mastery_score) === 60, 'Persisted score matches 60');
  assert(dbRow.rows[0].mastery_level === 'DEVELOPING', 'Persisted level matches DEVELOPING');
  assert(dbRow.rows[0].retry_success_count === 1, 'Persisted retry_success_count matches 1');
  assert(dbRow.rows[0].transfer_success_count === 1, 'Persisted transfer_success_count matches 1');

  console.log('\n============================================================');
  console.log(`TOTAL MASTERY API TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runMasteryApiTests()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Fatal error in mastery api tests:', err);
    await closePool();
    process.exit(1);
  });
