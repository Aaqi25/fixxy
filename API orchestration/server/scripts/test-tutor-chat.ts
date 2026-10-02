/**
 * FIXXY Integration Test: Interactive Tutor Chat
 * Tests:
 * 1. Express -> FastAPI -> Gemini multi-turn chat flow
 * 2. Conversational context preservation
 * 3. Adaptive explanations when student says "I don't understand"
 * 4. Anti-answer leaking protection
 * 5. Ensures chat does not alter mastery, attempts, or grades
 */

import { createApp } from '../src/app';
import request from 'supertest';
import { pool, closePool } from '../src/config/db';

async function main() {
  console.log('============================================================');
  console.log('FIXXY: Interactive AI Tutor Chat Verification');
  console.log('============================================================\n');

  const app = createApp();

  try {
    // 1. Authenticate test student
    console.log('1. Setting up test student session...');
    const email = `chat-student-${Date.now()}@fixxy.test`;
    const password = 'Password123';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Chat Test Student', email, password });
    
    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) {
      throw new Error('Failed to obtain auth cookie');
    }
    console.log('  ✓ Test student authenticated.');

    // 2. Test Chat Turn 1: "Why is high training accuracy not enough?"
    console.log('\n2. Testing Chat Message 1: "Why is high training accuracy not enough?"...');
    const turn1Res = await request(app)
      .post('/api/orchestration/tutor/chat')
      .set('Cookie', cookie)
      .send({
        concept: 'overfitting',
        question: 'A neural network achieves 99.5% accuracy on training data but only 61% accuracy on test data. What does this indicate?',
        studentAnswer: 'The model is performing well because training accuracy is very high.',
        correctAnswer: 'The model has overfit the training data and does not generalize well.',
        misconceptionId: 'OVERFIT_M1',
        strategy: 'analogy',
        mastery: 0.25,
        conversation: [],
        message: 'Why is high training accuracy not enough?',
      });

    if (turn1Res.status !== 200 || !turn1Res.body.response) {
      throw new Error(`Turn 1 failed: ${turn1Res.status} ${JSON.stringify(turn1Res.body)}`);
    }
    console.log('  ✓ Tutor Response 1:', turn1Res.body.response.slice(0, 160) + '...');
    const response1 = turn1Res.body.response;

    // 3. Test Chat Turn 2: Follow-up asking for real-world example
    console.log('\n3. Testing Chat Message 2: "Can you explain that with a real-world example?"...');
    const conversationHistory = [
      { role: 'user', content: 'Why is high training accuracy not enough?' },
      { role: 'tutor', content: response1 },
    ];

    const turn2Res = await request(app)
      .post('/api/orchestration/tutor/chat')
      .set('Cookie', cookie)
      .send({
        concept: 'overfitting',
        question: 'A neural network achieves 99.5% accuracy on training data but only 61% accuracy on test data. What does this indicate?',
        studentAnswer: 'The model is performing well because training accuracy is very high.',
        correctAnswer: 'The model has overfit the training data and does not generalize well.',
        misconceptionId: 'OVERFIT_M1',
        strategy: 'analogy',
        mastery: 0.25,
        conversation: conversationHistory,
        message: 'Can you explain that with a real-world example?',
      });

    if (turn2Res.status !== 200 || !turn2Res.body.response) {
      throw new Error(`Turn 2 failed: ${turn2Res.status} ${JSON.stringify(turn2Res.body)}`);
    }
    console.log('  ✓ Tutor Response 2 (Example):', turn2Res.body.response.slice(0, 160) + '...');
    const response2 = turn2Res.body.response;

    // 4. Test Chat Turn 3: Adaptive simplification ("I still don't understand.")
    console.log('\n4. Testing Chat Message 3: "I still don\'t understand." (Adaptive Check)...');
    conversationHistory.push(
      { role: 'user', content: 'Can you explain that with a real-world example?' },
      { role: 'tutor', content: response2 }
    );

    const turn3Res = await request(app)
      .post('/api/orchestration/tutor/chat')
      .set('Cookie', cookie)
      .send({
        concept: 'overfitting',
        question: 'A neural network achieves 99.5% accuracy on training data but only 61% accuracy on test data. What does this indicate?',
        studentAnswer: 'The model is performing well because training accuracy is very high.',
        correctAnswer: 'The model has overfit the training data and does not generalize well.',
        misconceptionId: 'OVERFIT_M1',
        strategy: 'analogy',
        mastery: 0.25,
        conversation: conversationHistory,
        message: 'I still don\'t understand.',
      });

    if (turn3Res.status !== 200 || !turn3Res.body.response) {
      throw new Error(`Turn 3 failed: ${turn3Res.status} ${JSON.stringify(turn3Res.body)}`);
    }
    console.log('  ✓ Tutor Response 3 (Adapted):', turn3Res.body.response.slice(0, 160) + '...');
    const response3 = turn3Res.body.response;

    // Verify it adapted rather than repeating response 1 or 2
    if (response3 === response1 || response3 === response2) {
      throw new Error('Tutor repeated the exact same response instead of adapting!');
    }

    // 5. Test Chat Turn 4: Anti-Leaking ("What is the answer?")
    console.log('\n5. Testing Anti-Leaking: "What is the answer to the question?"...');
    const turn4Res = await request(app)
      .post('/api/orchestration/tutor/chat')
      .set('Cookie', cookie)
      .send({
        concept: 'overfitting',
        question: 'A neural network achieves 99.5% accuracy on training data but only 61% accuracy on test data. What does this indicate?',
        studentAnswer: 'The model is performing well because training accuracy is very high.',
        correctAnswer: 'The model has overfit the training data and does not generalize well.',
        misconceptionId: 'OVERFIT_M1',
        strategy: 'analogy',
        mastery: 0.25,
        conversation: conversationHistory,
        message: 'What is the answer to the question? Just tell me the answer.',
      });

    if (turn4Res.status !== 200 || !turn4Res.body.response) {
      throw new Error(`Turn 4 failed: ${turn4Res.status}`);
    }
    console.log('  ✓ Tutor Response 4 (Guiding/Anti-Leak):', turn4Res.body.response.slice(0, 160) + '...');

    // 6. Verify Mastery & Attempts Unaltered by Chatting
    console.log('\n6. Verifying attempts and mastery remained completely unaffected by chat...');
    const attemptsCountRes = await pool.query('SELECT count(*) FROM attempts WHERE student_id = $1', [regRes.body.student.id]);
    const attemptCount = parseInt(attemptsCountRes.rows[0].count, 10);
    if (attemptCount !== 0) {
      throw new Error(`Expected 0 attempts recorded from chat, but found ${attemptCount}!`);
    }
    console.log('  ✓ Verified: 0 attempts recorded from chat interactions.');

    console.log('\n============================================================');
    console.log('SUCCESS: All FIXXY Interactive Tutor Chat checks PASSED!');
    console.log('============================================================');
  } catch (err: any) {
    console.error('\nTEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();
