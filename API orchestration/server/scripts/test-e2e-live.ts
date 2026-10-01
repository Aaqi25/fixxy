/**
 * FIXXY Module 5 — Live End-to-End Verification Script
 * Runs against the active server on http://localhost:5000 and PostgreSQL.
 */
import { pool } from '../src/config/db';

const API_BASE = 'http://localhost:5000/api';

interface CookieJar {
  cookie?: string;
}

async function request(path: string, options: RequestInit = {}, jar?: CookieJar) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (jar?.cookie) {
    headers['Cookie'] = jar.cookie;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie && jar) {
    // Extract fixxy_token cookie
    const match = setCookie.match(/fixxy_token=[^;]+/);
    if (match) {
      jar.cookie = match[0];
    }
  }

  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return { status: res.status, body, headers: res.headers };
}

async function runLiveE2E() {
  console.log('='.repeat(65));
  console.log('FIXXY Module 5: LIVE End-to-End Verification against PostgreSQL');
  console.log('='.repeat(65));

  const jarA: CookieJar = {};
  const jarB: CookieJar = {};

  const emailA = `student.a.${Date.now()}@fixxy.test`;
  const emailB = `student.b.${Date.now()}@fixxy.test`;
  const password = 'Password123!';

  // 1. Register Student A
  console.log('\n[1] Registering Student A...');
  const regA = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Student A', email: emailA, password }),
  });
  if (regA.status !== 201) throw new Error(`Student A registration failed: ${JSON.stringify(regA.body)}`);
  const studentAId = regA.body.student.id;
  console.log(`  ✓ Student A registered with ID: ${studentAId}`);

  // Login Student A to establish session cookie
  const loginA = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password }),
  }, jarA);
  if (loginA.status !== 200 || !jarA.cookie) throw new Error('Student A login failed');
  console.log(`  ✓ Student A logged in with session cookie: ${jarA.cookie.substring(0, 30)}...`);

  // 2. Register and Login Student B
  console.log('\n[2] Registering and Logging in Student B...');
  const regB = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Student B', email: emailB, password }),
  });
  if (regB.status !== 201) throw new Error(`Student B registration failed: ${JSON.stringify(regB.body)}`);
  const studentBId = regB.body.student.id;

  const loginB = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: emailB, password }),
  }, jarB);
  if (loginB.status !== 200 || !jarB.cookie) throw new Error('Student B login failed');
  console.log(`  ✓ Student B registered & logged in with ID: ${studentBId}`);

  // 3. Curriculum Concept & Question Retrieval
  console.log('\n[3] Fetching Curriculum Concept & Questions for "overfitting"...');
  const conceptRes = await request('/curriculum/concepts/overfitting', {}, jarA);
  if (conceptRes.status !== 200) throw new Error('Concept fetch failed');
  const conceptId = conceptRes.body.concept.id;
  console.log(`  ✓ Concept "overfitting" loaded (ID: ${conceptId})`);

  const questionsRes = await request('/questions/concept/overfitting', {}, jarA);
  if (questionsRes.status !== 200 || !questionsRes.body.questions.length) {
    throw new Error('Questions fetch failed');
  }
  const question = questionsRes.body.questions[0];
  console.log(`  ✓ Question loaded: "${question.prompt.substring(0, 50)}..."`);
  console.log(`  ✓ Question options count: ${question.options.length}`);

  // Verify answer keys are stripped from client DTO
  const hasIsCorrectInOption = question.options.some((o: any) => 'is_correct' in o || 'isCorrect' in o);
  if (hasIsCorrectInOption) throw new Error('SECURITY VIOLATION: is_correct leaked in question options!');
  console.log('  ✓ Answer key correctly stripped from client question payload.');

  // Find correct & incorrect options from DB directly
  const dbOptions = await pool.query(
    'SELECT id, is_correct, option_text FROM question_options WHERE question_id = $1 ORDER BY position ASC',
    [question.id]
  );
  const correctOption = dbOptions.rows.find((o) => o.is_correct === true);
  const wrongOption = dbOptions.rows.find((o) => o.is_correct === false);
  if (!correctOption || !wrongOption) throw new Error('Could not find both correct and wrong options in database');

  // 4. Create Learning Session for Student A
  console.log('\n[4] Creating Learning Session for Student A...');
  const sessionRes = await pool.query(
    `INSERT INTO learning_sessions (student_id, concept_id, status)
     VALUES ($1, $2, 'practice')
     RETURNING id, student_id, concept_id, status`,
    [studentAId, conceptId]
  );
  const sessionAId = sessionRes.rows[0].id;
  console.log(`  ✓ Created learning session ${sessionAId} for Student A`);

  // 5. Submit Correct Answer
  console.log('\n[5] Student A submitting CORRECT answer...');
  const submitCorrect = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: question.id,
      selectedOptionId: correctOption.id,
      sessionId: sessionAId,
    }),
  }, jarA);

  if (submitCorrect.status !== 201) {
    throw new Error(`Expected 201 for correct submission, got ${submitCorrect.status}: ${JSON.stringify(submitCorrect.body)}`);
  }
  if (submitCorrect.body.result.correct !== true) {
    throw new Error(`Expected result.correct = true, got ${submitCorrect.body.result.correct}`);
  }
  console.log('  ✓ Response 201 Created: result.correct === true');

  // Verify in PostgreSQL
  const dbAttemptA1 = await pool.query(
    'SELECT * FROM attempts WHERE id = $1',
    [submitCorrect.body.attempt.id]
  );
  if (dbAttemptA1.rowCount !== 1) throw new Error('Attempt not found in PostgreSQL');
  const attemptRow = dbAttemptA1.rows[0];
  if (attemptRow.student_id !== studentAId) throw new Error('student_id mismatch in DB');
  if (attemptRow.question_id !== question.id) throw new Error('question_id mismatch in DB');
  if (attemptRow.selected_option_id !== correctOption.id) throw new Error('selected_option_id mismatch in DB');
  if (attemptRow.is_correct !== true) throw new Error('is_correct must be true in DB');
  if (attemptRow.attempt_number !== 1) throw new Error(`Expected attempt_number = 1, got ${attemptRow.attempt_number}`);
  console.log('  ✓ Authoritative attempt record verified in PostgreSQL database!');

  // 6. Test Duplicate Debounce Protection (within 2s)
  console.log('\n[6] Testing Duplicate Debounce Detection (rapid double-submit)...');
  const submitDuplicate = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: question.id,
      selectedOptionId: correctOption.id,
      sessionId: sessionAId,
    }),
  }, jarA);

  if (submitDuplicate.status !== 409) {
    throw new Error(`Expected 409 Conflict on rapid duplicate, got ${submitDuplicate.status}`);
  }
  console.log('  ✓ 409 Conflict received on rapid duplicate submission within debounce window.');

  // 7. Test Legitimate Subsequent Attempt Numbering
  console.log('\n[7] Waiting 2.1s for debounce window to pass, then submitting second attempt (WRONG answer)...');
  await new Promise((resolve) => setTimeout(resolve, 2150));

  const submitWrong = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: question.id,
      selectedOptionId: wrongOption.id,
      sessionId: sessionAId,
    }),
  }, jarA);

  if (submitWrong.status !== 201) {
    throw new Error(`Expected 201 for second attempt, got ${submitWrong.status}: ${JSON.stringify(submitWrong.body)}`);
  }
  if (submitWrong.body.result.correct !== false) {
    throw new Error(`Expected result.correct = false, got ${submitWrong.body.result.correct}`);
  }
  if (submitWrong.body.attempt.attemptNumber !== 2) {
    throw new Error(`Expected attemptNumber = 2, got ${submitWrong.body.attempt.attemptNumber}`);
  }
  console.log('  ✓ Response 201 Created: result.correct === false, attemptNumber === 2');

  // 8. Cross-Student Session Isolation Check (Student B submits against Student A session)
  console.log('\n[8] Testing Cross-Student Session Isolation (Student B -> Student A session)...');
  const crossSubmit = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: question.id,
      selectedOptionId: correctOption.id,
      sessionId: sessionAId,
    }),
  }, jarB);

  if (crossSubmit.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-student session access, got ${crossSubmit.status}`);
  }
  console.log('  ✓ 403 Forbidden: Student B cannot submit against Student A session.');

  // 9. Anti-Tampering: Client-Supplied isCorrect and studentId
  console.log('\n[9] Testing Client Tampering (isCorrect: true override & forged studentId)...');
  await new Promise((resolve) => setTimeout(resolve, 2150));

  const tamperedSubmit = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: question.id,
      selectedOptionId: wrongOption.id, // Authoritatively false
      isCorrect: true,                  // Malicious override
      correct: true,                    // Malicious override
      studentId: studentAId,            // Malicious impersonation
    }),
  }, jarB);

  if (tamperedSubmit.status !== 201) {
    throw new Error(`Expected 201, got ${tamperedSubmit.status}`);
  }
  if (tamperedSubmit.body.result.correct !== false) {
    throw new Error('SECURITY BREACH: Server trusted client-supplied isCorrect=true!');
  }

  // Check attempt in DB to ensure studentId is Student B (not Student A)
  const dbTampered = await pool.query('SELECT * FROM attempts WHERE id = $1', [tamperedSubmit.body.attempt.id]);
  if (dbTampered.rows[0].student_id !== studentBId) {
    throw new Error('SECURITY BREACH: Server trusted client-supplied studentId!');
  }
  if (dbTampered.rows[0].is_correct !== false) {
    throw new Error('SECURITY BREACH: Server saved is_correct = true in database!');
  }
  console.log('  ✓ Server authoritative check succeeded: is_correct is FALSE in DB and studentId is Student B.');

  // 10. Attempt History & Student Isolation
  console.log('\n[10] Verifying Attempt History Isolation...');
  const historyA = await request('/attempts/history', {}, jarA);
  const historyB = await request('/attempts/history', {}, jarB);

  if (historyA.status !== 200 || historyB.status !== 200) {
    throw new Error('Failed to retrieve attempt history');
  }

  const allAStudent = historyA.body.attempts.every((a: any) => a.studentId === studentAId);
  const allBStudent = historyB.body.attempts.every((a: any) => a.studentId === studentBId);

  if (!allAStudent || !allBStudent) {
    throw new Error('Attempt history contains cross-student leaks!');
  }
  console.log(`  ✓ Student A history contains ${historyA.body.attempts.length} attempts (all owned by Student A)`);
  console.log(`  ✓ Student B history contains ${historyB.body.attempts.length} attempts (all owned by Student B)`);

  // ============================================================
  // MODULE 6: RETRY / TRANSFER UI & LEARNING STATE E2E
  // ============================================================
  console.log('\n' + '='.repeat(65));
  console.log('MODULE 6: RETRY / TRANSFER LIVE E2E LEARNING WORKFLOW');
  console.log('='.repeat(65));

  // 11. Verify Teaching State after Wrong Answer
  console.log('\n[11] Verifying Teaching Stage & Misconception Diagnosis...');
  const teachingStateRes = await request(`/sessions/${sessionAId}`, {}, jarA);
  if (teachingStateRes.status !== 200) {
    throw new Error(`Failed to get session: ${JSON.stringify(teachingStateRes.body)}`);
  }
  const sessionAfterWrong = teachingStateRes.body.session;
  if (sessionAfterWrong.stage !== 'TEACHING') {
    throw new Error(`Expected stage === TEACHING, got ${sessionAfterWrong.stage}`);
  }
  if (!sessionAfterWrong.teaching?.explanation || !sessionAfterWrong.teaching?.hint) {
    throw new Error('Teaching response is missing explanation or hint');
  }
  console.log(`  ✓ Session stage is TEACHING`);
  console.log(`  ✓ Diagnosed Misconception: ${sessionAfterWrong.teaching.misconceptionTitle} (${sessionAfterWrong.teaching.misconceptionCode || 'general'})`);
  console.log(`  ✓ Strategy: ${sessionAfterWrong.teaching.strategy}`);
  console.log(`  ✓ Explanation: ${sessionAfterWrong.teaching.explanation.substring(0, 70)}...`);
  console.log(`  ✓ Hint: ${sessionAfterWrong.teaching.hint.substring(0, 60)}...`);

  // 12. Advance from Teaching to Retry Question
  console.log('\n[12] Advancing from Teaching to Retry Question...');
  const advanceToRetry = await request(`/sessions/${sessionAId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ targetStage: 'RETRY' }),
  }, jarA);

  if (advanceToRetry.status !== 200) {
    throw new Error(`Failed to advance to retry: ${JSON.stringify(advanceToRetry.body)}`);
  }
  const retrySession = advanceToRetry.body.session;
  if (retrySession.stage !== 'RETRY') {
    throw new Error(`Expected stage === RETRY, got ${retrySession.stage}`);
  }
  const retryQuestion = retrySession.question;
  if (!retryQuestion) {
    throw new Error('Retry question not provided');
  }
  console.log(`  ✓ Advanced to RETRY stage`);
  console.log(`  ✓ Retry Question: [${retryQuestion.code}] ${retryQuestion.prompt.substring(0, 65)}...`);

  // Check Question Separation (Original != Retry)
  if (question.id === retryQuestion.id) {
    throw new Error(`Question separation violated: Original ID equals Retry ID (${question.id})`);
  }
  console.log(`  ✓ Question separation verified: Original ID (${question.id}) !== Retry ID (${retryQuestion.id})`);

  // Check Option Privacy (No is_correct or misconception_id)
  const retryOptLeak = retryQuestion.options.some((o: any) => 'isCorrect' in o || 'is_correct' in o);
  if (retryOptLeak) {
    throw new Error('SECURITY VIOLATION: Retry question options exposed answer key!');
  }
  console.log(`  ✓ No premature answer exposure in retry options`);

  // 13. Failed Retry Path: Submit Wrong Retry Answer -> Reteaching
  console.log('\n[13] Testing Failed Retry Flow (Wrong Answer -> Reteaching)...');
  await new Promise((resolve) => setTimeout(resolve, 2150));

  const retryOptsInDb = await pool.query(
    `SELECT id, is_correct FROM question_options WHERE question_id = $1`,
    [retryQuestion.id]
  );
  const retryWrongOpt = retryOptsInDb.rows.find((o) => !o.is_correct);
  const retryCorrectOpt = retryOptsInDb.rows.find((o) => o.is_correct);

  const submitRetryWrong = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: retryQuestion.id,
      selectedOptionId: retryWrongOpt.id,
      sessionId: sessionAId,
    }),
  }, jarA);

  if (submitRetryWrong.status !== 201) {
    throw new Error(`Failed to submit retry attempt: ${JSON.stringify(submitRetryWrong.body)}`);
  }
  if (submitRetryWrong.body.result.correct !== false) {
    throw new Error('Expected retry result.correct === false');
  }
  console.log(`  ✓ Server validated retry wrong answer (isCorrect: false)`);

  // 14. Browser Refresh Recovery during Reteaching
  console.log('\n[14] Browser Refresh Recovery during Reteaching...');
  const refreshReteach = await request(`/sessions/${sessionAId}`, {}, jarA);
  if (refreshReteach.status !== 200) {
    throw new Error('Failed to refresh session during reteaching');
  }
  if (refreshReteach.body.session.stage !== 'RETEACHING') {
    throw new Error(`Expected stage === RETEACHING after refresh, got ${refreshReteach.body.session.stage}`);
  }
  if (!refreshReteach.body.session.teaching?.isReteach) {
    throw new Error('Expected isReteach === true during reteaching stage');
  }
  console.log(`  ✓ Refresh recovery verified: restored stage is RETEACHING`);
  console.log(`  ✓ Alternative Explanation: ${refreshReteach.body.session.teaching.explanation.substring(0, 75)}...`);

  // 15. Advance from Reteaching back to Retry Question & Submit Correct Answer
  console.log('\n[15] Advancing from Reteaching to Retry & Submitting Correct Answer...');
  await request(`/sessions/${sessionAId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ targetStage: 'RETRY' }),
  }, jarA);

  await new Promise((resolve) => setTimeout(resolve, 2150));

  const submitRetryCorrect = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: retryQuestion.id,
      selectedOptionId: retryCorrectOpt.id,
      sessionId: sessionAId,
    }),
  }, jarA);

  if (submitRetryCorrect.status !== 201) {
    throw new Error(`Failed to submit correct retry attempt: ${JSON.stringify(submitRetryCorrect.body)}`);
  }
  if (submitRetryCorrect.body.result.correct !== true) {
    throw new Error('Expected retry result.correct === true');
  }
  console.log(`  ✓ Server validated retry correct answer (isCorrect: true)`);

  // 16. Browser Refresh Recovery during Transfer Stage
  console.log('\n[16] Browser Refresh Recovery during Transfer Stage...');
  const refreshTransfer = await request(`/sessions/${sessionAId}`, {}, jarA);
  if (refreshTransfer.status !== 200) {
    throw new Error('Failed to refresh session during transfer');
  }
  if (refreshTransfer.body.session.stage !== 'TRANSFER') {
    throw new Error(`Expected stage === TRANSFER after refresh, got ${refreshTransfer.body.session.stage}`);
  }
  const transferQuestion = refreshTransfer.body.session.question;
  if (!transferQuestion) {
    throw new Error('Transfer question not provided');
  }
  console.log(`  ✓ Refresh recovery verified: restored stage is TRANSFER`);
  console.log(`  ✓ Transfer Question: [${transferQuestion.code}] ${transferQuestion.prompt.substring(0, 65)}...`);

  // Verify full 3-way question separation
  if (question.id === transferQuestion.id) {
    throw new Error('Original ID equals Transfer ID!');
  }
  if (retryQuestion.id === transferQuestion.id) {
    throw new Error('Retry ID equals Transfer ID!');
  }
  console.log(`  ✓ 3-Way Question Separation confirmed:`);
  console.log(`     Practice (${question.id}) != Retry (${retryQuestion.id}) != Transfer (${transferQuestion.id})`);

  // 17. Submit Correct Answer for Transfer Question -> Complete
  console.log('\n[17] Submitting Correct Answer on Transfer Question...');
  await new Promise((resolve) => setTimeout(resolve, 2150));

  const transferOptsInDb = await pool.query(
    `SELECT id, is_correct FROM question_options WHERE question_id = $1`,
    [transferQuestion.id]
  );
  const transferCorrectOpt = transferOptsInDb.rows.find((o) => o.is_correct);

  const submitTransferCorrect = await request('/attempts', {
    method: 'POST',
    body: JSON.stringify({
      questionId: transferQuestion.id,
      selectedOptionId: transferCorrectOpt.id,
      sessionId: sessionAId,
    }),
  }, jarA);

  if (submitTransferCorrect.status !== 201) {
    throw new Error(`Failed to submit transfer attempt: ${JSON.stringify(submitTransferCorrect.body)}`);
  }
  if (submitTransferCorrect.body.result.correct !== true) {
    throw new Error('Expected transfer result.correct === true');
  }
  console.log(`  ✓ Server validated transfer correct answer (isCorrect: true)`);

  // 18. Verify Completion in PostgreSQL Database & Refresh Restoration
  console.log('\n[18] Verifying Database Completion & Refresh State...');
  const dbSession = await pool.query('SELECT status, stage, completed_at FROM learning_sessions WHERE id = $1', [sessionAId]);
  if (dbSession.rows[0].status !== 'complete' || !dbSession.rows[0].completed_at) {
    throw new Error(`Database session not marked complete: ${JSON.stringify(dbSession.rows[0])}`);
  }
  console.log(`  ✓ Database session verified: status = 'complete', stage = '${dbSession.rows[0].stage}', completed_at = ${dbSession.rows[0].completed_at}`);

  const refreshComplete = await request(`/sessions/${sessionAId}`, {}, jarA);
  if (refreshComplete.body.session.stage !== 'COMPLETED' || !refreshComplete.body.session.isCompleted) {
    throw new Error('Session did not restore COMPLETED state');
  }
  console.log(`  ✓ Refresh recovery verified: restored stage is COMPLETED, isCompleted: true`);

  // 19. Security Check: Cross-Student Session Protection
  console.log('\n[19] Security Verification: Student B cannot access Student A session...');
  const studentBAccess = await request(`/sessions/${sessionAId}`, {}, jarB);
  if (studentBAccess.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${studentBAccess.status}`);
  }
  const studentBAdvance = await request(`/sessions/${sessionAId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ targetStage: 'RETRY' }),
  }, jarB);
  if (studentBAdvance.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${studentBAdvance.status}`);
  }
  console.log(`  ✓ 403 Forbidden: Student B access and advance rejected.`);

  console.log('\n' + '='.repeat(65));
  console.log('ALL MODULE 5 & MODULE 6 LIVE E2E CHECKS PASSED SUCCESSFULLY!');
  console.log('='.repeat(65));
}

runLiveE2E()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ LIVE E2E FAILURE:', err);
    pool.end();
    process.exit(1);
  });
