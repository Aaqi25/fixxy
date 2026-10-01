import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closePool } from '../src/config/db';

async function runOrchestrationApiTests() {
  console.log('============================================================');
  console.log('FIXXY Module 8 — API Orchestration Integration Test Suite');
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
    // -------------------------------------------------------------
    // 1. Setup Test Students & Login Cookies
    // -------------------------------------------------------------
    const emailA = `test-m8-alpha-${Date.now()}@fixxy.test`;
    const emailB = `test-m8-beta-${Date.now()}@fixxy.test`;
    const emailG = `test-m8-gamma-${Date.now()}@fixxy.test`;
    const password = 'Password123';

    const regA = await request(app).post('/api/auth/register').send({ name: 'Student M8 Alpha', email: emailA, password });
    assert('Student Alpha registered', regA.status === 201);
    const studentAId = regA.body.student.id;

    const loginA = await request(app).post('/api/auth/login').send({ email: emailA, password });
    const cookieA = loginA.headers['set-cookie']?.[0]?.split(';')[0];
    assert('Student Alpha logged in with cookie', !!cookieA);

    const regB = await request(app).post('/api/auth/register').send({ name: 'Student M8 Beta', email: emailB, password });
    assert('Student Beta registered', regB.status === 201);
    const studentBId = regB.body.student.id;

    const loginB = await request(app).post('/api/auth/login').send({ email: emailB, password });
    const cookieB = loginB.headers['set-cookie']?.[0]?.split(';')[0];
    assert('Student Beta logged in with cookie', !!cookieB);

    const regG = await request(app).post('/api/auth/register').send({ name: 'Student M8 Gamma', email: emailG, password });
    assert('Student Gamma registered', regG.status === 201);
    const studentGId = regG.body.student.id;

    const loginG = await request(app).post('/api/auth/login').send({ email: emailG, password });
    const cookieG = loginG.headers['set-cookie']?.[0]?.split(';')[0];
    assert('Student Gamma logged in with cookie', !!cookieG);

    // -------------------------------------------------------------
    // 2. Security & Route Protection (Unauthenticated Access)
    // -------------------------------------------------------------
    console.log('\n--- 1. Authentication & Route Protection ---');
    const unauthPostSession = await request(app).post('/api/learning/sessions').send({ conceptSlug: 'overfitting' });
    assert('Unauthenticated POST /api/learning/sessions returns 401', unauthPostSession.status === 401);

    const unauthGetSession = await request(app).get('/api/learning/sessions/11111111-1111-1111-1111-111111111111');
    assert('Unauthenticated GET /api/learning/sessions/:sessionId returns 401', unauthGetSession.status === 401);

    const unauthAnswer = await request(app).post('/api/learning/answer').send({
      sessionId: '11111111-1111-1111-1111-111111111111',
      questionId: '11111111-1111-1111-1111-111111111111',
      selectedOptionId: '11111111-1111-1111-1111-111111111111',
    });
    assert('Unauthenticated POST /api/learning/answer returns 401', unauthAnswer.status === 401);

    // -------------------------------------------------------------
    // 3. Request Validation & Error Handling
    // -------------------------------------------------------------
    console.log('\n--- 2. Request Validation & Error Handling ---');
    const emptySessionReq = await request(app).post('/api/learning/sessions').set('Cookie', cookieA).send({});
    assert('POST /api/learning/sessions with empty body returns 400', emptySessionReq.status === 400);

    const notFoundSlugReq = await request(app).post('/api/learning/sessions').set('Cookie', cookieA).send({ conceptSlug: 'non-existent-concept' });
    assert('POST /api/learning/sessions with unknown slug returns 404', notFoundSlugReq.status === 404);

    const invalidUuidGet = await request(app).get('/api/learning/sessions/invalid-uuid').set('Cookie', cookieA);
    assert('GET /api/learning/sessions with non-UUID returns 400', invalidUuidGet.status === 400);

    const nonExistentSessionGet = await request(app).get('/api/learning/sessions/00000000-0000-0000-0000-000000000000').set('Cookie', cookieA);
    assert('GET /api/learning/sessions with non-existent session returns 404', nonExistentSessionGet.status === 404);

    const invalidAnswerPayload = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({ sessionId: 'invalid' });
    assert('POST /api/learning/answer with invalid UUIDs returns 400', invalidAnswerPayload.status === 400);

    // -------------------------------------------------------------
    // 4. Session Creation & Practice Stage
    // -------------------------------------------------------------
    console.log('\n--- 3. Session Creation & Initial Practice Question ---');
    const createRes = await request(app).post('/api/learning/sessions').set('Cookie', cookieA).send({ conceptSlug: 'overfitting' });
    assert('POST /api/learning/sessions returns 200', createRes.status === 200);
    const sessionA = createRes.body;
    assert('Response contains sessionId', !!sessionA.sessionId);
    assert('Initial state is PRACTICE', sessionA.state === 'PRACTICE');
    assert('Concept title is Overfitting', sessionA.concept.title === 'Overfitting');
    assert('Practice question returned', !!sessionA.question);
    assert('Practice question code is OVERFIT_Q1', sessionA.question.code === 'OVERFIT_Q1');
    assert('Question options do NOT expose answer keys', sessionA.question.options.every((opt: any) => opt.isCorrect === undefined));
    assert('Initial history is array', Array.isArray(sessionA.history));

    const practiceQ = sessionA.question;

    // Fetch options from DB to get wrong & right options
    const optRows = await pool.query(
      'SELECT id, is_correct, position FROM question_options WHERE question_id = $1 ORDER BY position ASC',
      [practiceQ.id]
    );
    const practiceWrongOption = optRows.rows.find((o) => !o.is_correct);
    const practiceCorrectOption = optRows.rows.find((o) => o.is_correct);

    // -------------------------------------------------------------
    // 5. Wrong Answer Orchestration Flow: Practice -> Teaching / Retry
    // -------------------------------------------------------------
    console.log('\n--- 4. Wrong Answer Flow (Practice -> Diagnosis -> Teaching -> Retry) ---');
    const wrongAnswerRes = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({
      sessionId: sessionA.sessionId,
      questionId: practiceQ.id,
      selectedOptionId: practiceWrongOption.id,
    });
    assert('Submitting wrong practice answer returns 200', wrongAnswerRes.status === 200);
    assert('Result confirms answer was wrong (isCorrect = false)', wrongAnswerRes.body.result.isCorrect === false);
    assert('State transitioned to RETRY', wrongAnswerRes.body.state === 'RETRY');
    assert('Teaching data returned with personalized explanation', !!wrongAnswerRes.body.teaching?.explanation);
    assert('Teaching strategy is provided', !!wrongAnswerRes.body.teaching?.strategy);
    assert('Teaching hint is provided', !!wrongAnswerRes.body.teaching?.hint);
    assert('Distinct nextQuestion is provided', !!wrongAnswerRes.body.nextQuestion);
    assert('Next question phase is retry', wrongAnswerRes.body.nextQuestion.phase === 'retry');
    assert('Next question code is OVERFIT_Q2', wrongAnswerRes.body.nextQuestion.code === 'OVERFIT_Q2');
    assert('Question separation: practiceId != retryId', practiceQ.id !== wrongAnswerRes.body.nextQuestion.id);
    assert('Retry options do NOT expose answer keys', wrongAnswerRes.body.nextQuestion.options.every((o: any) => o.isCorrect === undefined));

    const retryQ = wrongAnswerRes.body.nextQuestion;

    // -------------------------------------------------------------
    // 6. Session Restoration (Browser Refresh Recovery)
    // -------------------------------------------------------------
    console.log('\n--- 5. Session State Restoration (Browser Refresh) ---');
    const restoreRes = await request(app).get(`/api/learning/sessions/${sessionA.sessionId}`).set('Cookie', cookieA);
    assert('GET /api/learning/sessions/:sessionId returns 200', restoreRes.status === 200);
    assert('Restored state is RETRY', restoreRes.body.state === 'RETRY');
    assert('Restored active question is OVERFIT_Q2', restoreRes.body.question?.code === 'OVERFIT_Q2');
    assert('Restored originalQuestion is OVERFIT_Q1', restoreRes.body.originalQuestion?.code === 'OVERFIT_Q1');
    assert('Restored teaching content is intact', !!restoreRes.body.teaching?.explanation);
    assert('Restored history includes 1 practice attempt', restoreRes.body.history.length === 1);
    assert('Allowed actions includes SUBMIT_ANSWER', restoreRes.body.allowedActions.includes('SUBMIT_ANSWER'));

    // Fetch retry options from DB
    const retryOptRows = await pool.query(
      'SELECT id, is_correct, position FROM question_options WHERE question_id = $1 ORDER BY position ASC',
      [retryQ.id]
    );
    const retryWrongOption = retryOptRows.rows.find((o) => !o.is_correct);
    const retryCorrectOption = retryOptRows.rows.find((o) => o.is_correct);

    // -------------------------------------------------------------
    // 7. Retry Wrong Answer Flow (RETRY -> RETEACHING)
    // -------------------------------------------------------------
    console.log('\n--- 6. Retry Wrong Answer Flow (Retry -> Reteaching) ---');
    // Wait 2.1s to pass debounce window
    await new Promise((r) => setTimeout(r, 2100));

    const wrongRetryRes = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({
      sessionId: sessionA.sessionId,
      questionId: retryQ.id,
      selectedOptionId: retryWrongOption.id,
    });
    assert('Submitting wrong retry answer returns 200', wrongRetryRes.status === 200);
    assert('Result confirms answer was wrong', wrongRetryRes.body.result.isCorrect === false);
    assert('State transitioned to RETEACHING', wrongRetryRes.body.state === 'RETEACHING');
    assert('Reteaching explanation is returned', !!wrongRetryRes.body.teaching?.explanation);
    assert('Reteaching marked isReteach = true', wrongRetryRes.body.teaching?.isReteach === true);

    // -------------------------------------------------------------
    // 8. Stage Advancement (advance endpoint)
    // -------------------------------------------------------------
    console.log('\n--- 7. Advance Session Endpoint ---');
    const advanceRes = await request(app)
      .post(`/api/learning/sessions/${sessionA.sessionId}/advance`)
      .set('Cookie', cookieA)
      .send({ targetStage: 'RETRY' });
    assert('POST /api/learning/sessions/:sessionId/advance returns 200', advanceRes.status === 200);
    assert('Stage advanced to RETRY', advanceRes.body.state === 'RETRY');

    // -------------------------------------------------------------
    // 9. Retry Correct Answer Flow (RETRY -> TRANSFER)
    // -------------------------------------------------------------
    console.log('\n--- 8. Retry Correct Flow (Retry -> Transfer) ---');
    await new Promise((r) => setTimeout(r, 2100));

    const correctRetryRes = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({
      sessionId: sessionA.sessionId,
      questionId: retryQ.id,
      selectedOptionId: retryCorrectOption.id,
    });
    assert('Submitting correct retry answer returns 200', correctRetryRes.status === 200);
    assert('Result confirms answer was correct', correctRetryRes.body.result.isCorrect === true);
    assert('State transitioned to TRANSFER', correctRetryRes.body.state === 'TRANSFER');
    assert('Distinct nextQuestion is provided', !!correctRetryRes.body.nextQuestion);
    assert('Next question phase is transfer', correctRetryRes.body.nextQuestion.phase === 'transfer');
    assert('Next question code is OVERFIT_Q3', correctRetryRes.body.nextQuestion.code === 'OVERFIT_Q3');
    assert('Question separation: retryId != transferId', retryQ.id !== correctRetryRes.body.nextQuestion.id);
    assert('Question separation: practiceId != transferId', practiceQ.id !== correctRetryRes.body.nextQuestion.id);

    const transferQ = correctRetryRes.body.nextQuestion;

    // Fetch transfer options from DB
    const transferOptRows = await pool.query(
      'SELECT id, is_correct, position FROM question_options WHERE question_id = $1 ORDER BY position ASC',
      [transferQ.id]
    );
    const transferWrongOption = transferOptRows.rows.find((o) => !o.is_correct);
    const transferCorrectOption = transferOptRows.rows.find((o) => o.is_correct);

    // -------------------------------------------------------------
    // 10. Transfer Wrong Answer Flow (TRANSFER -> RETEACHING)
    // -------------------------------------------------------------
    console.log('\n--- 9. Transfer Wrong Answer Flow (Transfer Fail -> Reteaching) ---');
    await new Promise((r) => setTimeout(r, 2100));

    const wrongTransferRes = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({
      sessionId: sessionA.sessionId,
      questionId: transferQ.id,
      selectedOptionId: transferWrongOption.id,
    });
    assert('Submitting wrong transfer answer returns 200', wrongTransferRes.status === 200);
    assert('Result confirms answer was wrong', wrongTransferRes.body.result.isCorrect === false);
    assert('State transitioned to RETEACHING', wrongTransferRes.body.state === 'RETEACHING');
    assert('Reteaching content provided', !!wrongTransferRes.body.teaching?.explanation);

    // Advance back to TRANSFER
    await request(app)
      .post(`/api/learning/sessions/${sessionA.sessionId}/advance`)
      .set('Cookie', cookieA)
      .send({ targetStage: 'TRANSFER' });

    // -------------------------------------------------------------
    // 11. Transfer Correct Flow (TRANSFER -> COMPLETE + Mastery Update)
    // -------------------------------------------------------------
    console.log('\n--- 10. Transfer Pass Flow (Transfer Pass -> Complete + Mastery Update) ---');
    await new Promise((r) => setTimeout(r, 2100));

    const correctTransferRes = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({
      sessionId: sessionA.sessionId,
      questionId: transferQ.id,
      selectedOptionId: transferCorrectOption.id,
    });
    assert('Submitting correct transfer answer returns 200', correctTransferRes.status === 200);
    assert('Result confirms answer was correct', correctTransferRes.body.result.isCorrect === true);
    assert('State transitioned to COMPLETE', correctTransferRes.body.state === 'COMPLETE');
    assert('isCompleted flag is true', correctTransferRes.body.isCompleted === true);
    assert('nextQuestion is null after completion', correctTransferRes.body.nextQuestion === null);
    assert('Mastery was triggered', correctTransferRes.body.masteryUpdated === true);

    // Verify session persistence in DB
    const dbSessionCheck = await pool.query('SELECT status, stage FROM learning_sessions WHERE id = $1', [sessionA.sessionId]);
    assert('Database confirms session status = complete', dbSessionCheck.rows[0].status === 'complete');

    // -------------------------------------------------------------
    // 12. Direct Practice Correct Flow (Student Gamma: Practice -> Complete)
    // -------------------------------------------------------------
    console.log('\n--- 11. Direct Practice Correct Flow (Practice -> Complete) ---');
    const gammaSessionRes = await request(app)
      .post('/api/learning/sessions')
      .set('Cookie', cookieG)
      .send({ conceptSlug: 'train-validation-test' });
    assert('Student Gamma session created', gammaSessionRes.status === 200);
    const gammaPracticeQ = gammaSessionRes.body.question;

    const gammaOptRows = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1',
      [gammaPracticeQ.id]
    );
    const gammaCorrectOption = gammaOptRows.rows.find((o) => o.is_correct);

    const gammaAnsRes = await request(app).post('/api/learning/answer').set('Cookie', cookieG).send({
      sessionId: gammaSessionRes.body.sessionId,
      questionId: gammaPracticeQ.id,
      selectedOptionId: gammaCorrectOption.id,
    });
    assert('Direct correct practice answer returns 200', gammaAnsRes.status === 200);
    assert('Result isCorrect = true', gammaAnsRes.body.result.isCorrect === true);
    assert('Direct practice success transitions to COMPLETE', gammaAnsRes.body.state === 'COMPLETE');
    assert('isCompleted = true', gammaAnsRes.body.isCompleted === true);

    // -------------------------------------------------------------
    // 13. Module 7 Mastery Integration Verification
    // -------------------------------------------------------------
    console.log('\n--- 12. Module 7 Mastery Dashboard Integration ---');
    const masteryResA = await request(app).get('/api/mastery').set('Cookie', cookieA);
    assert('GET /api/mastery returns 200 for Student Alpha', masteryResA.status === 200);
    assert('Student Alpha overallMastery is > 0', masteryResA.body.summary.overallMastery > 0);
    assert('Student Alpha retrySuccesses >= 1', masteryResA.body.summary.retrySuccesses >= 1);
    assert('Student Alpha transferSuccesses >= 1', masteryResA.body.summary.transferSuccesses >= 1);

    const masteryResG = await request(app).get('/api/mastery').set('Cookie', cookieG);
    assert('Student Gamma overallMastery is > 0', masteryResG.body.summary.overallMastery > 0);

    // -------------------------------------------------------------
    // 14. Invalid Transitions & Post-Completion Protection
    // -------------------------------------------------------------
    console.log('\n--- 13. Invalid Transitions & Post-Completion Conflict ---');
    // Answering after complete
    const postCompleteAns = await request(app).post('/api/learning/answer').set('Cookie', cookieA).send({
      sessionId: sessionA.sessionId,
      questionId: transferQ.id,
      selectedOptionId: transferCorrectOption.id,
    });
    assert('Submitting answer to completed session returns 409 Conflict', postCompleteAns.status === 409);

    // Submitting wrong question stage
    const newSessionB = await request(app).post('/api/learning/sessions').set('Cookie', cookieB).send({ conceptSlug: 'overfitting' });
    const wrongStageAns = await request(app).post('/api/learning/answer').set('Cookie', cookieB).send({
      sessionId: newSessionB.body.sessionId,
      questionId: retryQ.id, // retry question during PRACTICE stage
      selectedOptionId: retryCorrectOption.id,
    });
    assert('Submitting RETRY question during PRACTICE stage returns 400', wrongStageAns.status === 400);

    // -------------------------------------------------------------
    // 15. Security & Student Isolation Tests
    // -------------------------------------------------------------
    console.log('\n--- 14. Security & Student Isolation ---');
    // Student B attempts to access Student A's session
    const forbiddenGet = await request(app)
      .get(`/api/learning/sessions/${sessionA.sessionId}`)
      .set('Cookie', cookieB);
    assert('Student B accessing Student A session returns 403 Forbidden', forbiddenGet.status === 403);

    // Student B attempts to answer in Student A's session
    const forbiddenAns = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieB)
      .send({
        sessionId: sessionA.sessionId,
        questionId: practiceQ.id,
        selectedOptionId: practiceCorrectOption.id,
      });
    assert('Student B submitting to Student A session returns 403 Forbidden', forbiddenAns.status === 403);

    // Client attempts to supply another studentId in body
    const bodyTamperAns = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieB)
      .send({
        sessionId: newSessionB.body.sessionId,
        questionId: practiceQ.id,
        selectedOptionId: practiceWrongOption.id,
        studentId: studentAId, // should be ignored!
      });
    assert('Body studentId tampering is ignored and submission uses authenticated identity', bodyTamperAns.status === 200);

    // Client attempts to send fake isCorrect = true
    await new Promise((r) => setTimeout(r, 2100));
    const fakeCorrectAns = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieB)
      .send({
        sessionId: newSessionB.body.sessionId,
        questionId: retryQ.id,
        selectedOptionId: retryWrongOption.id,
        isCorrect: true, // Client tampering!
      });
    assert('Client fake isCorrect: true is rejected/overridden by server', fakeCorrectAns.body.result.isCorrect === false);

    // Client attempts to send fake masteryScore
    await new Promise((r) => setTimeout(r, 2100));
    const fakeMasteryAns = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieB)
      .send({
        sessionId: newSessionB.body.sessionId,
        questionId: retryQ.id,
        selectedOptionId: retryCorrectOption.id,
        masteryScore: 100, // Client tampering!
      });
    assert('Client fake masteryScore is ignored', fakeMasteryAns.status === 200);

    // Client attempts to manually set state = COMPLETE
    const fakeStateAns = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieB)
      .send({
        sessionId: newSessionB.body.sessionId,
        questionId: transferQ.id,
        selectedOptionId: transferWrongOption.id,
        state: 'COMPLETE', // Client tampering!
      });
    assert('Client fake state: COMPLETE cannot override authoritative server state', fakeStateAns.body.state !== 'COMPLETE');

    // -------------------------------------------------------------
    // 16. Duplicate Debounce Protection (Rapid Submit)
    // -------------------------------------------------------------
    console.log('\n--- 15. Idempotency & Rapid Duplicate Debounce ---');
    // Immediate double submission with exact same answer
    const dupRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieB)
      .send({
        sessionId: newSessionB.body.sessionId,
        questionId: transferQ.id,
        selectedOptionId: transferWrongOption.id,
      });
    assert('Rapid duplicate submission within 2s returns 409 Conflict', dupRes.status === 409);

    // -------------------------------------------------------------
    // 17. AI Failure Resilience & Attempt Preservation Test
    // -------------------------------------------------------------
    console.log('\n--- 16. AI Failure Resilience & Recovery ---');
    // Create new session for Student Gamma on Bias vs Variance
    const bvSessionRes = await request(app)
      .post('/api/learning/sessions')
      .set('Cookie', cookieG)
      .send({ conceptSlug: 'bias-vs-variance' });
    assert('New session created for AI failure test', bvSessionRes.status === 200);

    const bvQ = bvSessionRes.body.question;
    const bvOptRows = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1',
      [bvQ.id]
    );
    const bvWrongOption = bvOptRows.rows.find((o) => !o.is_correct);

    // Submit with simulateAiFailure = true
    const aiFailRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookieG)
      .send({
        sessionId: bvSessionRes.body.sessionId,
        questionId: bvQ.id,
        selectedOptionId: bvWrongOption.id,
        simulateAiFailure: true,
      });

    assert('AI service failure returns controlled 503 error', aiFailRes.status === 503);
    assert('AI failure error code is AI_SERVICE_UNAVAILABLE', aiFailRes.body.code === 'AI_SERVICE_UNAVAILABLE');

    // Verify database evidence: attempt WAS safely persisted in PostgreSQL!
    const persistedAttemptCheck = await pool.query(
      'SELECT id, is_correct FROM attempts WHERE session_id = $1 AND student_id = $2',
      [bvSessionRes.body.sessionId, studentGId]
    );
    assert('Attempt was safely persisted in DB despite AI failure', persistedAttemptCheck.rows.length === 1);
    assert('Persisted attempt records is_correct = false', persistedAttemptCheck.rows[0].is_correct === false);

    // Verify session remains uncorrupted and recoverable
    const recoveredSession = await request(app)
      .get(`/api/learning/sessions/${bvSessionRes.body.sessionId}`)
      .set('Cookie', cookieG);
    assert('Session remains recoverable via GET after AI failure', recoveredSession.status === 200);
    assert('Session was not falsely marked complete', recoveredSession.body.isCompleted === false);

    // Verify no fake mastery was awarded
    const gammaMasteryCheck = await pool.query(
      'SELECT score FROM student_mastery WHERE student_id = $1 AND concept_id = $2',
      [studentGId, bvSessionRes.body.concept.id]
    );
    const score = gammaMasteryCheck.rows[0]?.score ?? 0;
    assert('No false mastery score was awarded on AI failure', score === 0);

  } catch (err: any) {
    console.error('Fatal error during test suite:', err);
    failed++;
  } finally {
    console.log('\n============================================================');
    console.log(`TOTAL ORCHESTRATION TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('============================================================');
    await closePool();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runOrchestrationApiTests();
