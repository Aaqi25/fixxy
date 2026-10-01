import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closePool } from '../src/config/db';

async function runSessionApiTests() {
  console.log('============================================================');
  console.log('FIXXY Module 6 — Retry / Transfer & Session API Test Suite');
  console.log('============================================================');

  const app = createApp();
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail: string = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Setup two test students and login to get cookies
    const emailA = `test-m6-a-${Date.now()}@fixxy.test`;
    const emailB = `test-m6-b-${Date.now()}@fixxy.test`;
    const password = 'Password123';

    const regResA = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Student M6 Alpha', email: emailA, password });
    assert('Student A registered', regResA.status === 201);
    const studentAId = regResA.body.student.id;

    const loginResA = await request(app)
      .post('/api/auth/login')
      .send({ email: emailA, password });
    const cookieA = loginResA.headers['set-cookie']?.[0]?.split(';')[0];
    assert('Student A logged in with cookie', !!cookieA);

    const regResB = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Student M6 Beta', email: emailB, password });
    assert('Student B registered', regResB.status === 201);
    const studentBId = regResB.body.student.id;

    const loginResB = await request(app)
      .post('/api/auth/login')
      .send({ email: emailB, password });
    const cookieB = loginResB.headers['set-cookie']?.[0]?.split(';')[0];
    assert('Student B logged in with cookie', !!cookieB);

    // 2. Unauthenticated request rejected
    const unauthRes = await request(app).get('/api/sessions/concept/overfitting');
    assert('Unauthenticated GET /api/sessions/concept/overfitting returns 401', unauthRes.status === 401);

    // 3. Start or get session for 'overfitting'
    const sessionRes = await request(app)
      .get('/api/sessions/concept/overfitting')
      .set('Cookie', cookieA);
    assert('GET /api/sessions/concept/overfitting returns 200 with session', sessionRes.status === 200);
    const session = sessionRes.body.session;
    assert('Session created with stage PRACTICE', session.stage === 'PRACTICE' || session.stage === 'practice');
    const sessionId = session.id;

    // 4. Retrieve practice question for overfitting
    const questionsRes = await request(app).get('/api/questions/concept/overfitting');
    const questions = questionsRes.body.questions;
    const practiceQ = questions.find((q: any) => q.code === 'OVERFIT_Q1');
    assert('Practice question OVERFIT_Q1 found', !!practiceQ);

    // Verify option safety: NO is_correct or misconception_id exposed
    const optHasAnswerKey = practiceQ.options.some((o: any) => 'isCorrect' in o || 'is_correct' in o);
    assert('Question options do NOT expose answer keys', !optHasAnswerKey);

    // 5. Submit intentionally WRONG answer on practice question
    // Find wrong option (pos 2: OVERFIT_M1)
    const optRes = await pool.query(
      `SELECT id, is_correct, position FROM question_options WHERE question_id = $1 ORDER BY position`,
      [practiceQ.id]
    );
    const wrongOpt = optRes.rows.find((o) => !o.is_correct);
    const correctOpt = optRes.rows.find((o) => o.is_correct);

    const submitPracticeWrong = await request(app)
      .post('/api/attempts')
      .set('Cookie', cookieA)
      .send({
        questionId: practiceQ.id,
        selectedOptionId: wrongOpt.id,
        sessionId: sessionId,
      });

    assert('Submitting wrong practice answer returns 201', submitPracticeWrong.status === 201);
    assert('Result confirms answer was wrong', submitPracticeWrong.body.result.correct === false);
    assert('Session stage transitioned to TEACHING', submitPracticeWrong.body.session?.stage === 'TEACHING');

    // 6. Refresh recovery: GET /api/sessions/:id restores TEACHING stage
    const refreshTeachingRes = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Cookie', cookieA);
    assert('GET /api/sessions/:id returns 200', refreshTeachingRes.status === 200);
    const restoredSession = refreshTeachingRes.body.session;
    assert('Restored session stage is TEACHING', restoredSession.stage === 'TEACHING');
    assert('Restored session contains teaching diagnosis and explanation', !!restoredSession.teaching?.explanation);
    assert('Teaching includes misconception title', !!restoredSession.teaching?.misconceptionTitle);
    assert('Teaching includes hint', !!restoredSession.teaching?.hint);
    assert('Teaching includes strategy', !!restoredSession.teaching?.strategy);

    // 7. Advance session from TEACHING to RETRY
    const advanceRes = await request(app)
      .post(`/api/sessions/${sessionId}/advance`)
      .set('Cookie', cookieA)
      .send({});

    assert('POST /api/sessions/:id/advance returns 200', advanceRes.status === 200);
    const retrySession = advanceRes.body.session;
    assert('Advanced stage is RETRY', retrySession.stage === 'RETRY');
    const retryQ = retrySession.question;
    assert('Retry question is provided', !!retryQ);
    assert('Retry question code is OVERFIT_Q2', retryQ.code === 'OVERFIT_Q2');

    // 8. Question Separation verification
    assert('Original question ID != Retry question ID', practiceQ.id !== retryQ.id);

    // Verify retry options do NOT expose answer key
    const retryOptHasKey = retryQ.options.some((o: any) => 'isCorrect' in o || 'is_correct' in o);
    assert('Retry options do NOT expose correct answer', !retryOptHasKey);

    // 9. Submit WRONG answer on Retry question -> leads to RETEACHING
    const retryOptsInDb = await pool.query(
      `SELECT id, is_correct FROM question_options WHERE question_id = $1`,
      [retryQ.id]
    );
    const retryWrongOpt = retryOptsInDb.rows.find((o) => !o.is_correct);
    const retryCorrectOpt = retryOptsInDb.rows.find((o) => o.is_correct);

    const submitRetryWrong = await request(app)
      .post('/api/attempts')
      .set('Cookie', cookieA)
      .send({
        questionId: retryQ.id,
        selectedOptionId: retryWrongOpt.id,
        sessionId: sessionId,
      });

    assert('Submit wrong retry answer returns 201', submitRetryWrong.status === 201);
    assert('Retry wrong result is false', submitRetryWrong.body.result.correct === false);
    assert('Session stage transitioned to RETEACHING', submitRetryWrong.body.session?.stage === 'RETEACHING');

    // 10. Refresh during RETEACHING restores RETEACHING stage
    const reteachStateRes = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Cookie', cookieA);
    assert('Restored session stage is RETEACHING', reteachStateRes.body.session.stage === 'RETEACHING');
    assert('Teaching is marked as isReteach = true', reteachStateRes.body.session.teaching?.isReteach === true);

    // 11. Advance from RETEACHING back to RETRY
    const advanceRetryAgain = await request(app)
      .post(`/api/sessions/${sessionId}/advance`)
      .set('Cookie', cookieA)
      .send({ targetStage: 'RETRY' });
    assert('Advance from RETEACHING returns to RETRY', advanceRetryAgain.body.session.stage === 'RETRY');

    // 12. Submit CORRECT answer on Retry question -> leads to TRANSFER
    const submitRetryCorrect = await request(app)
      .post('/api/attempts')
      .set('Cookie', cookieA)
      .send({
        questionId: retryQ.id,
        selectedOptionId: retryCorrectOpt.id,
        sessionId: sessionId,
      });

    assert('Submit correct retry answer returns 201', submitRetryCorrect.status === 201);
    assert('Retry correct result is true', submitRetryCorrect.body.result.correct === true);
    assert('Session stage transitioned to TRANSFER', submitRetryCorrect.body.session?.stage === 'TRANSFER');

    // 13. Refresh during TRANSFER restores TRANSFER stage
    const transferStateRes = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Cookie', cookieA);
    assert('Restored session stage is TRANSFER', transferStateRes.body.session.stage === 'TRANSFER');
    const transferQ = transferStateRes.body.session.question;
    assert('Transfer question is provided', !!transferQ);
    assert('Transfer question code is OVERFIT_Q3', transferQ.code === 'OVERFIT_Q3');

    // 14. Full Question Separation verification
    assert('Original ID != Transfer ID', practiceQ.id !== transferQ.id);
    assert('Retry ID != Transfer ID', retryQ.id !== transferQ.id);

    // 15. Submit CORRECT answer on Transfer question -> leads to COMPLETED
    const transferOptsInDb = await pool.query(
      `SELECT id, is_correct FROM question_options WHERE question_id = $1`,
      [transferQ.id]
    );
    const transferCorrectOpt = transferOptsInDb.rows.find((o) => o.is_correct);

    const submitTransferCorrect = await request(app)
      .post('/api/attempts')
      .set('Cookie', cookieA)
      .send({
        questionId: transferQ.id,
        selectedOptionId: transferCorrectOpt.id,
        sessionId: sessionId,
      });

    assert('Submit correct transfer answer returns 201', submitTransferCorrect.status === 201);
    assert('Transfer correct result is true', submitTransferCorrect.body.result.correct === true);
    assert('Session stage transitioned to COMPLETED', submitTransferCorrect.body.session?.stage === 'COMPLETED');

    // 16. Refresh during COMPLETED restores COMPLETED stage
    const completedStateRes = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Cookie', cookieA);
    assert('Session marked as completed', completedStateRes.body.session.isCompleted === true);
    assert('Stage is COMPLETED', completedStateRes.body.session.stage === 'COMPLETED');

    // 17. Security & Student Isolation
    const crossStudentRes = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Cookie', cookieB);
    assert('Student B cannot access Student A session (403 Forbidden)', crossStudentRes.status === 403);

    const crossStudentAdvance = await request(app)
      .post(`/api/sessions/${sessionId}/advance`)
      .set('Cookie', cookieB)
      .send({});
    assert('Student B cannot advance Student A session (403 Forbidden)', crossStudentAdvance.status === 403);

    // 18. Invalid session ID format rejection
    const invalidIdRes = await request(app)
      .get('/api/sessions/not-a-valid-uuid')
      .set('Cookie', cookieA);
    assert('Invalid UUID session returns 400 Bad Request', invalidIdRes.status === 400);

    // 19. Nonexistent session UUID returns 404
    const nonExistentRes = await request(app)
      .get('/api/sessions/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookieA);
    assert('Non-existent session UUID returns 404 Not Found', nonExistentRes.status === 404);

    console.log('============================================================');
    console.log(`TOTAL SESSION API TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runSessionApiTests();
