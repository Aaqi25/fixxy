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

  console.log('\n' + '='.repeat(65));
  console.log('ALL MODULE 5 LIVE E2E CHECKS PASSED SUCCESSFULLY!');
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
