/**
 * FIXXY Module 8 — Full End-to-End Learning Flow Verification
 * Tests the complete loop:
 * Register/Login -> Curriculum -> Start Concept Session -> Practice Question ->
 * Submit Wrong Answer -> AI Teaching & Diagnosis -> Retry Question ->
 * Submit Retry Correctly -> Transfer Question -> Submit Transfer Correctly ->
 * Session Complete -> Mastery Updated -> Mastery Dashboard Display
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closePool } from '../src/config/db';

async function runE2EOrchestrationFlow() {
  console.log('======================================================================');
  console.log('FIXXY Module 8 — End-to-End Orchestrated Learning Loop Verification');
  console.log('======================================================================');

  const app = createApp();
  let passed = 0;
  let failed = 0;

  function assert(step: string, condition: boolean, detail: string = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${step}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${step} ${detail}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------------
    // Step 1: Student Registration & Authentication (Module 1)
    // ---------------------------------------------------------------
    console.log('\n[Step 1] Student Authentication...');
    const email = `e2e.student.${Date.now()}@fixxy.test`;
    const password = 'SecurePassword123';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alex Student', email, password });
    assert('Student registration returns 201', regRes.status === 201);
    const studentId = regRes.body.student.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    assert('Student login returns 200 with HttpOnly session cookie', loginRes.status === 200 && !!cookie);

    // ---------------------------------------------------------------
    // Step 2: Curriculum Exploration (Module 3)
    // ---------------------------------------------------------------
    console.log('\n[Step 2] Curriculum Concepts...');
    const currRes = await request(app).get('/api/curriculum/concepts').set('Cookie', cookie);
    assert('Curriculum concepts catalog loaded successfully (200)', currRes.status === 200);
    const overfittingConcept = currRes.body.concepts.find((c: any) => c.slug === 'overfitting');
    assert('Concept "overfitting" found in curriculum', !!overfittingConcept);

    // ---------------------------------------------------------------
    // Step 3: Start Learning Session via Module 8 Orchestrator
    // ---------------------------------------------------------------
    console.log('\n[Step 3] Session Orchestration (Start Session)...');
    const startRes = await request(app)
      .post('/api/learning/sessions')
      .set('Cookie', cookie)
      .send({ conceptSlug: 'overfitting' });
    assert('Start session returns 200', startRes.status === 200);
    const sessionId = startRes.body.sessionId;
    assert('Initial orchestration state is PRACTICE', startRes.body.state === 'PRACTICE');
    assert('Practice question OVERFIT_Q1 delivered', startRes.body.question?.code === 'OVERFIT_Q1');
    const practiceQ = startRes.body.question;

    // Get options for practice question
    const pOpts = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1 ORDER BY position ASC',
      [practiceQ.id]
    );
    const pWrongOpt = pOpts.rows.find((o) => !o.is_correct);

    // ---------------------------------------------------------------
    // Step 4: Submit Wrong Answer -> AI Diagnosis & Personalized Teaching
    // ---------------------------------------------------------------
    console.log('\n[Step 4] Answering Practice Incorrectly -> Diagnosis & Teaching...');
    const wrongAnsRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookie)
      .send({
        sessionId,
        questionId: practiceQ.id,
        selectedOptionId: pWrongOpt.id,
      });
    assert('Wrong answer evaluation returns 200', wrongAnsRes.status === 200);
    assert('Server marked isCorrect = false', wrongAnsRes.body.result.isCorrect === false);
    assert('Learning state transitioned to RETRY', wrongAnsRes.body.state === 'RETRY');
    assert('Teaching explanation generated', !!wrongAnsRes.body.teaching?.explanation);
    assert('Teaching strategy is pedagogically defined', !!wrongAnsRes.body.teaching?.strategy);
    assert('Retry question OVERFIT_Q2 provided', wrongAnsRes.body.nextQuestion?.code === 'OVERFIT_Q2');
    const retryQ = wrongAnsRes.body.nextQuestion;

    // ---------------------------------------------------------------
    // Step 5: Session State Restoration after simulated page reload
    // ---------------------------------------------------------------
    console.log('\n[Step 5] Simulating Browser Refresh (Session Restoration)...');
    const restored = await request(app)
      .get(`/api/learning/sessions/${sessionId}`)
      .set('Cookie', cookie);
    assert('Session restored cleanly on refresh (200)', restored.status === 200);
    assert('Restored state is RETRY', restored.body.state === 'RETRY');
    assert('Active question is retry question OVERFIT_Q2', restored.body.question?.code === 'OVERFIT_Q2');
    assert('Persisted teaching content is available', !!restored.body.teaching?.explanation);

    // ---------------------------------------------------------------
    // Step 6: Submit Retry Question Correctly -> Transition to Transfer
    // ---------------------------------------------------------------
    console.log('\n[Step 6] Submitting Correct Retry Answer -> Transition to Transfer...');
    await new Promise((r) => setTimeout(r, 2100)); // debounce window

    const rOpts = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1',
      [retryQ.id]
    );
    const rCorrectOpt = rOpts.rows.find((o) => o.is_correct);

    const retryAnsRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookie)
      .send({
        sessionId,
        questionId: retryQ.id,
        selectedOptionId: rCorrectOpt.id,
      });
    assert('Retry submission returns 200', retryAnsRes.status === 200);
    assert('Server confirmed retry correct', retryAnsRes.body.result.isCorrect === true);
    assert('Learning state transitioned to TRANSFER', retryAnsRes.body.state === 'TRANSFER');
    assert('Transfer question OVERFIT_Q3 delivered', retryAnsRes.body.nextQuestion?.code === 'OVERFIT_Q3');
    const transferQ = retryAnsRes.body.nextQuestion;

    // ---------------------------------------------------------------
    // Step 7: Submit Transfer Question Correctly -> Completion & Mastery Update
    // ---------------------------------------------------------------
    console.log('\n[Step 7] Submitting Correct Transfer Answer -> Completion...');
    await new Promise((r) => setTimeout(r, 2100)); // debounce window

    const tOpts = await pool.query(
      'SELECT id, is_correct FROM question_options WHERE question_id = $1',
      [transferQ.id]
    );
    const tCorrectOpt = tOpts.rows.find((o) => o.is_correct);

    const transferAnsRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookie)
      .send({
        sessionId,
        questionId: transferQ.id,
        selectedOptionId: tCorrectOpt.id,
      });
    assert('Transfer submission returns 200', transferAnsRes.status === 200);
    assert('Server confirmed transfer isCorrect = true', transferAnsRes.body.result.isCorrect === true);
    assert('Learning loop state reached COMPLETE', transferAnsRes.body.state === 'COMPLETE');
    assert('Session isCompleted flag is true', transferAnsRes.body.isCompleted === true);
    assert('No next question remains in complete state', transferAnsRes.body.nextQuestion === null);
    assert('Mastery update was triggered', transferAnsRes.body.masteryUpdated === true);

    // ---------------------------------------------------------------
    // Step 8: Verify Mastery Dashboard (Module 7) Displays Updated Result
    // ---------------------------------------------------------------
    console.log('\n[Step 8] Verifying Mastery Dashboard Reflected Progress...');
    const masteryRes = await request(app).get('/api/mastery').set('Cookie', cookie);
    assert('GET /api/mastery returns 200', masteryRes.status === 200);
    assert('Overall mastery is non-zero', masteryRes.body.summary.overallMastery > 0);
    assert('Concepts started count is 1', masteryRes.body.summary.conceptsStarted === 1);
    assert('Retry successes recorded: 1', masteryRes.body.summary.retrySuccesses === 1);
    assert('Transfer successes recorded: 1', masteryRes.body.summary.transferSuccesses === 1);

    const conceptsMasteryRes = await request(app).get('/api/mastery/concepts').set('Cookie', cookie);
    assert('GET /api/mastery/concepts returns 200', conceptsMasteryRes.status === 200);
    const overfitMastery = conceptsMasteryRes.body.concepts.find((c: any) => c.slug === 'overfitting');
    assert('Overfitting mastery score is 60 (30 retry + 30 transfer)', overfitMastery?.masteryScore === 60);
    assert('Overfitting mastery level is DEVELOPING', overfitMastery?.masteryLevel === 'DEVELOPING');

    // ---------------------------------------------------------------
    // Step 9: Verify Recent Activity Log in Mastery Dashboard
    // ---------------------------------------------------------------
    console.log('\n[Step 9] Verifying Mastery Activity Log...');
    const actRes = await request(app).get('/api/mastery/activity').set('Cookie', cookie);
    assert('GET /api/mastery/activity returns 200', actRes.status === 200);
    assert('Activity log contains 3 attempts', actRes.body.activity.length === 3);
    assert('Latest activity is TRANSFER_SUCCESS', actRes.body.activity[0].type === 'TRANSFER_SUCCESS');

  } catch (err: any) {
    console.error('Fatal error during E2E flow:', err);
    failed++;
  } finally {
    console.log('\n======================================================================');
    console.log(`E2E FLOW TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================================');
    await closePool();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runE2EOrchestrationFlow();
