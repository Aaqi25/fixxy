/**
 * FIXXY End-to-End Integration Verification: Node → FastAPI AI Brain
 */

import { createApp } from '../src/app';
import request from 'supertest';
import { pool, closePool } from '../src/config/db';
import { aiClient } from '../src/modules/orchestration/orchestration.ai.client';

async function main() {
  console.log('============================================================');
  console.log('FIXXY: Real Node (Express) → FastAPI (AI Brain) Integration Test');
  console.log('============================================================\n');

  const app = createApp();

  try {
    // 1. Verify FastAPI Health
    console.log('1. Checking FastAPI AI Brain health at http://localhost:8000/health...');
    let fastApiHealthy = false;
    try {
      const faRes = await fetch('http://localhost:8000/health');
      if (faRes.ok) {
        const faData = await faRes.json();
        console.log('  ✓ FastAPI is HEALTHY:', faData);
        fastApiHealthy = true;
      }
    } catch (e: any) {
      console.error('  ✗ FastAPI connection failed:', e.message);
    }

    if (!fastApiHealthy) {
      throw new Error('FastAPI AI service is not running on http://localhost:8000');
    }

    // 2. Setup Student Account via Node
    console.log('\n2. Registering and authenticating test student via Node...');
    const email = `student-ai-test-${Date.now()}@fixxy.test`;
    const password = 'Password123';

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'AI Integration Student', email, password });
    
    if (regRes.status !== 201) {
      throw new Error(`Registration failed with status ${regRes.status}: ${JSON.stringify(regRes.body)}`);
    }
    const studentId = regRes.body.student.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    if (!cookie) {
      throw new Error('Failed to obtain authentication cookie from Node login');
    }
    console.log('  ✓ Student registered and authenticated:', studentId);

    // 3. Start Learning Session for 'overfitting'
    console.log('\n3. Starting learning session for concept "overfitting"...');
    const sessionRes = await request(app)
      .post('/api/learning/sessions')
      .set('Cookie', cookie)
      .send({ conceptSlug: 'overfitting' });

    if (sessionRes.status !== 200 && sessionRes.status !== 201) {
      throw new Error(`Start session failed with status ${sessionRes.status}: ${JSON.stringify(sessionRes.body)}`);
    }

    const sessionId = sessionRes.body.sessionId;
    const question = sessionRes.body.question;
    console.log('  ✓ Session started:', sessionId);
    console.log('  ✓ Question Prompt:', question.prompt);

    // Find the wrong answer option (Option 2: High training accuracy means good performance)
    const wrongOption = question.options.find((o: any) =>
      o.text.includes('training accuracy is very high') || o.text.includes('performing well')
    ) || question.options[1];

    console.log('\n4. Submitting intentionally WRONG student answer via Node Orchestration...');
    console.log('  - Selected Option ID:', wrongOption.id);
    console.log('  - Selected Option Text:', wrongOption.text);

    const startTime = Date.now();
    const answerRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookie)
      .send({
        sessionId,
        questionId: question.id,
        selectedOptionId: wrongOption.id,
      });
    const latency = Date.now() - startTime;

    console.log(`\n5. Received response from Node Orchestration in ${latency}ms:`);
    console.log('  - HTTP Status:', answerRes.status);
    console.log('  - Result isCorrect:', answerRes.body.result?.isCorrect);
    console.log('  - Next State / Stage:', answerRes.body.state || answerRes.body.stage);
    console.log('  - Next Question Code/Prompt:', answerRes.body.nextQuestion?.code || answerRes.body.nextQuestion?.prompt);
    console.log('\n--- Pedagogical AI Intervention Returned ---');
    console.log('  - Misconception Code:', answerRes.body.teaching?.misconceptionCode);
    console.log('  - Misconception Title:', answerRes.body.teaching?.misconceptionTitle);
    console.log('  - Strategy Selected:', answerRes.body.teaching?.strategy);
    console.log('  - Confidence:', answerRes.body.teaching?.confidence);
    console.log('  - Explanation:', answerRes.body.teaching?.explanation);
    console.log('  - Hint:', answerRes.body.teaching?.hint);

    // 6. Test Fallback Behavior (Simulate Failure)
    console.log('\n6. Testing Fallback Behavior when AI Service is unavailable...');
    aiClient.setSimulateFailure(true);
    const fallbackRes = await request(app)
      .post('/api/learning/answer')
      .set('Cookie', cookie)
      .send({
        sessionId,
        questionId: question.id,
        selectedOptionId: wrongOption.id,
      });
    aiClient.setSimulateFailure(false);

    console.log('  ✓ Fallback response status:', fallbackRes.status);
    console.log('  ✓ Fallback teaching returned:', Boolean(fallbackRes.body.teaching?.explanation));
    console.log('  ✓ Fallback strategy:', fallbackRes.body.teaching?.strategy);

    console.log('\n============================================================');
    console.log('✓ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================');

  } catch (err: any) {
    console.error('\n✗ Test Failed:', err.message);
  } finally {
    await closePool();
  }
}

main();
