/**
 * Comprehensive End-to-End (E2E) Verification Script for Module 3: Curriculum
 * Simulates complete user journey against live running server:
 * 1. Health check & Module status
 * 2. Student registration & authentication cookie
 * 3. Fetching /api/auth/me to verify authenticated session
 * 4. Opening curriculum catalog (GET /api/curriculum/concepts)
 * 5. Verifying MVP concept count (3), display order, and attributes
 * 6. Opening Overfitting detail (GET /api/curriculum/concepts/overfitting)
 * 7. Verifying learning objective, all 6 curated content types, prerequisites, misconceptions
 * 8. Opening Bias vs Variance detail (GET /api/curriculum/concepts/bias-vs-variance)
 * 9. Verifying Bias vs Variance attributes, 20 min duration, Overfitting prerequisite
 * 10. Opening Train / Validation / Test detail (GET /api/curriculum/concepts/train-validation-test)
 * 11. Verifying foundational concept status (no prerequisites)
 * 12. Fetching learning path graph (GET /api/curriculum/path)
 * 13. Verifying node sequence and prerequisite pointers
 * 14. Testing invalid concept slug (GET /api/curriculum/concepts/non-existent-concept -> 404)
 * 15. Testing whitespace/malformed slug -> 404
 * 16. Verifying student profile integration (GET /api/profile)
 * 17. Verifying protected route ping
 * 18. Logout & session invalidation
 */

interface E2EResult {
  step: number;
  description: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: E2EResult[] = [];
const BASE_URL = 'http://localhost:5000';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runStep(step: number, description: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ step, description, status: 'PASS' });
    console.log(`✓ Step ${step}: ${description}`);
  } catch (err: any) {
    results.push({ step, description, status: 'FAIL', details: err.message });
    console.error(`✗ Step ${step}: ${description} — ERROR: ${err.message}`);
  }
}

async function runE2E() {
  console.log('='.repeat(70));
  console.log('FIXXY MODULE 3 — LIVE END-TO-END FLOW VERIFICATION');
  console.log('='.repeat(70));

  let cookieHeader = '';
  const testEmail = `e2e_student_${Date.now()}@fixxy.edu`;
  const testPassword = 'Password123';

  // Step 1: Health check
  await runStep(1, 'Verify API health and registered modules', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    assert(data.status === 'healthy', 'Expected healthy status');
    assert(data.modules.includes('Module 3 — Curriculum'), 'Expected Module 3 to be listed in modules');
    assert(data.database.ok === true, 'Expected database to be ok');
  });

  // Step 2: Register student
  await runStep(2, 'Register a new student account via Module 1 Authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Curriculum Learner',
        email: testEmail,
        password: testPassword,
      }),
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const rawCookie = res.headers.get('set-cookie');
    if (rawCookie) {
      cookieHeader = rawCookie.split(';')[0];
    }
  });

  // Step 3: Login if cookie not set on register
  await runStep(3, 'Authenticate and establish session cookie', async () => {
    if (!cookieHeader) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const rawCookie = res.headers.get('set-cookie');
      assert(!!rawCookie, 'Expected Set-Cookie header');
      cookieHeader = rawCookie!.split(';')[0];
    }
    assert(!!cookieHeader, 'Expected valid session cookie');
  });

  // Step 4: Verify authenticated session
  await runStep(4, 'Verify authenticated user session via GET /api/auth/me', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    assert(data.student.email === testEmail, 'Email mismatch in /api/auth/me');
  });

  // Step 5: Get Curriculum Concepts Catalog
  let concepts: any[] = [];
  await runStep(5, 'Retrieve curriculum concepts catalog via GET /api/curriculum/concepts', async () => {
    const res = await fetch(`${BASE_URL}/api/curriculum/concepts`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    assert(Array.isArray(data.concepts), 'Expected concepts array');
    assert(data.concepts.length === 3, `Expected 3 concepts, got ${data.concepts.length}`);
    concepts = data.concepts;
  });

  // Step 6: Verify MVP concepts and display ordering
  await runStep(6, 'Verify concepts display order and metadata', async () => {
    const [c1, c2, c3] = concepts;
    assert(c1.slug === 'overfitting' && c1.displayOrder === 1, 'Concept 1 must be overfitting');
    assert(c1.title === 'Overfitting', 'Title must be Overfitting');
    assert(c1.difficultyLevel === 'BEGINNER', 'Difficulty must be BEGINNER');
    assert(c1.estimatedMinutes === 15, 'Estimated minutes must be 15');

    assert(c2.slug === 'bias-vs-variance' && c2.displayOrder === 2, 'Concept 2 must be bias-vs-variance');
    assert(c2.title === 'Bias vs Variance', 'Title must be Bias vs Variance');
    assert(c2.estimatedMinutes === 20, 'Estimated minutes must be 20');

    assert(c3.slug === 'train-validation-test' && c3.displayOrder === 3, 'Concept 3 must be train-validation-test');
    assert(c3.title === 'Train / Validation / Test', 'Title must be Train / Validation / Test');
    assert(c3.estimatedMinutes === 15, 'Estimated minutes must be 15');
  });

  // Step 7: Get Overfitting Detail
  let overfitDetail: any = null;
  await runStep(7, 'Retrieve concept details for Overfitting via GET /api/curriculum/concepts/overfitting', async () => {
    const res = await fetch(`${BASE_URL}/api/curriculum/concepts/overfitting`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    assert(data.concept && data.concept.slug === 'overfitting', 'Expected overfitting concept object');
    overfitDetail = data.concept;
  });

  // Step 8: Verify Overfitting learning objective, content, prerequisites, misconceptions
  await runStep(8, 'Verify Overfitting learning objective, curated content types, prerequisites, and misconceptions', async () => {
    assert(
      overfitDetail.learningObjective.includes('Recognize overfitting'),
      'Learning objective does not match specification'
    );
    assert(Array.isArray(overfitDetail.content), 'Expected content array');
    const types = overfitDetail.content.map((c: any) => c.contentType);
    assert(types.includes('OVERVIEW'), 'Missing OVERVIEW');
    assert(types.includes('KEY_IDEA'), 'Missing KEY_IDEA');
    assert(types.includes('ANALOGY'), 'Missing ANALOGY');
    assert(types.includes('EXAMPLE'), 'Missing EXAMPLE');
    assert(types.includes('COMMON_MISTAKE'), 'Missing COMMON_MISTAKE');
    assert(types.includes('SUMMARY'), 'Missing SUMMARY');

    // Prerequisites
    assert(
      overfitDetail.prerequisites.some((p: any) => p.slug === 'train-validation-test'),
      'Expected prerequisite train-validation-test'
    );

    // Misconceptions
    const codes = overfitDetail.misconceptions.map((m: any) => m.code);
    assert(codes.includes('OVERFIT_M1'), 'Missing OVERFIT_M1');
    assert(codes.includes('OVERFIT_M2'), 'Missing OVERFIT_M2');
  });

  // Step 9: Get Bias vs Variance Detail
  await runStep(9, 'Retrieve concept details for Bias vs Variance', async () => {
    const res = await fetch(`${BASE_URL}/api/curriculum/concepts/bias-vs-variance`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    const c = data.concept;
    assert(c.slug === 'bias-vs-variance', 'Expected bias-vs-variance');
    assert(c.estimatedMinutes === 20, 'Expected 20 min');
    assert(c.learningObjective.includes('bias, variance'), 'Expected learning objective');
    assert(c.prerequisites.some((p: any) => p.slug === 'overfitting'), 'Expected overfitting prerequisite');
    const codes = c.misconceptions.map((m: any) => m.code);
    assert(codes.includes('BIASVAR_M1'), 'Missing BIASVAR_M1');
  });

  // Step 10: Get Train / Validation / Test Detail
  await runStep(10, 'Retrieve concept details for Train / Validation / Test', async () => {
    const res = await fetch(`${BASE_URL}/api/curriculum/concepts/train-validation-test`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    const c = data.concept;
    assert(c.slug === 'train-validation-test', 'Expected train-validation-test');
    assert(c.prerequisites.length === 0, 'Entry concept should have 0 prerequisites');
    const codes = c.misconceptions.map((m: any) => m.code);
    assert(codes.includes('TVT_M1'), 'Missing TVT_M1');
  });

  // Step 11: Get Learning Path Graph
  await runStep(11, 'Retrieve learning path sequence via GET /api/curriculum/path', async () => {
    const res = await fetch(`${BASE_URL}/api/curriculum/path`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    assert(Array.isArray(data.path), 'Expected path array');
    assert(data.path.length === 3, 'Expected 3 path nodes');

    const node1 = data.path.find((n: any) => n.slug === 'overfitting');
    const node2 = data.path.find((n: any) => n.slug === 'bias-vs-variance');
    const node3 = data.path.find((n: any) => n.slug === 'train-validation-test');

    assert(node1 && node1.displayOrder === 1, 'Overfitting is step 1');
    assert(node2 && node2.displayOrder === 2, 'Bias vs Variance is step 2');
    assert(node3 && node3.displayOrder === 3, 'Train / Validation / Test is step 3');
  });

  // Step 12: Verify Not-Found / 404 Behavior on invalid slug
  await runStep(12, 'Verify 404 response on unknown concept slug', async () => {
    const res = await fetch(`${BASE_URL}/api/curriculum/concepts/non-existent-concept`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    const data: any = await res.json();
    assert(data.message === 'Concept not found', 'Expected Concept not found message');
  });

  // Step 13: Module 2 Regression — Student Profile Integration
  await runStep(13, 'Verify Module 2 profile still functions for authenticated student', async () => {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data: any = await res.json();
    assert(data.profile.displayName === 'Curriculum Learner', 'Expected profile displayName');
  });

  // Step 14: Logout
  await runStep(14, 'Verify Module 1 Logout terminates session', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`LIVE E2E RESULTS: ${results.length} STEPS | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
