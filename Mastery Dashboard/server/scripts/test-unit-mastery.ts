/**
 * Module 7: Unit Tests — Mastery Calculator & Formula
 * Tests deterministic scoring, boundary conditions, edge cases, and mastery level calculations.
 */

import {
  calculateConceptMastery,
  calculateOverallMastery,
  calculateMasteryLevel,
  MASTERY_THRESHOLDS,
  ConceptEvidenceData,
} from '../src/modules/mastery/mastery.calculator';

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

async function runUnitTests() {
  console.log('============================================================');
  console.log('FIXXY Module 7 — Mastery Calculator Unit Tests');
  console.log('============================================================\n');

  // 1. Zero evidence case
  console.log('--- 1. Zero Evidence & Unstarted Concepts ---');
  const zeroEvidence: ConceptEvidenceData = {
    attemptCount: 0,
    correctCount: 0,
    practiceAttemptCount: 0,
    practiceCorrectCount: 0,
    retryAttemptCount: 0,
    retrySuccessCount: 0,
    transferAttemptCount: 0,
    transferSuccessCount: 0,
  };
  const zeroResult = calculateConceptMastery(zeroEvidence);
  assert(zeroResult.score === 0, 'Zero evidence produces score = 0');
  assert(zeroResult.level === 'NOT_STARTED', 'Zero evidence produces level = NOT_STARTED');
  assert(zeroResult.components.practiceScore === 0, 'Practice score is 0');
  assert(zeroResult.components.retryScore === 0, 'Retry score is 0');
  assert(zeroResult.components.transferScore === 0, 'Transfer score is 0');

  // 2. Single wrong practice attempt
  console.log('\n--- 2. Single Wrong Practice Attempt ---');
  const wrongPractice: ConceptEvidenceData = {
    attemptCount: 1,
    correctCount: 0,
    practiceAttemptCount: 1,
    practiceCorrectCount: 0,
    retryAttemptCount: 0,
    retrySuccessCount: 0,
    transferAttemptCount: 0,
    transferSuccessCount: 0,
  };
  const wrongResult = calculateConceptMastery(wrongPractice);
  assert(wrongResult.score === 0, '1 wrong practice produces score = 0');
  assert(wrongResult.level === 'BEGINNER', '1 wrong practice produces level = BEGINNER');
  assert(wrongResult.components.practiceScore === 0, 'Practice score is 0');
  assert(wrongResult.components.retryScore === 0, 'Retry score is 0 (needs remediation)');
  assert(wrongResult.components.transferScore === 0, 'Transfer score is 0');

  // 3. Single correct practice attempt (direct mastery without remediation)
  console.log('\n--- 3. Single Correct Practice Attempt ---');
  const correctPractice: ConceptEvidenceData = {
    attemptCount: 1,
    correctCount: 1,
    practiceAttemptCount: 1,
    practiceCorrectCount: 1,
    retryAttemptCount: 0,
    retrySuccessCount: 0,
    transferAttemptCount: 0,
    transferSuccessCount: 0,
  };
  const correctResult = calculateConceptMastery(correctPractice);
  assert(correctResult.components.practiceScore === 40, 'Direct correct practice earns 40 base practice points');
  assert(correctResult.components.retryScore === 30, 'Direct correct practice earns 30 full retry credit');
  assert(correctResult.components.transferScore === 0, 'Transfer score is 0 before transfer attempted');
  assert(correctResult.score === 70, 'Direct correct practice produces total score = 70');
  assert(correctResult.level === 'PROFICIENT', 'Score 70 maps to PROFICIENT');

  // 4. Remediation flow: Wrong practice + Successful retry
  console.log('\n--- 4. Remediation: 1 Wrong Practice + 1 Retry Success ---');
  const retryPassed: ConceptEvidenceData = {
    attemptCount: 2,
    correctCount: 1,
    practiceAttemptCount: 1,
    practiceCorrectCount: 0,
    retryAttemptCount: 1,
    retrySuccessCount: 1,
    transferAttemptCount: 0,
    transferSuccessCount: 0,
  };
  const retryPassedResult = calculateConceptMastery(retryPassed);
  assert(retryPassedResult.components.practiceScore === 0, 'Failed practice earns 0 practice points');
  assert(retryPassedResult.components.retryScore === 30, 'Cleared retry earns 30 recovery points');
  assert(retryPassedResult.components.transferScore === 0, 'Transfer score is 0');
  assert(retryPassedResult.score === 30, 'Total score is 30');
  assert(retryPassedResult.level === 'BEGINNER', 'Score 30 maps to BEGINNER');

  // 5. Complete Learning Loop: 1 Wrong Practice + 1 Retry Success + 1 Transfer Success
  console.log('\n--- 5. Full Loop: Wrong Practice + Retry Success + Transfer Success ---');
  const fullLoop: ConceptEvidenceData = {
    attemptCount: 3,
    correctCount: 2,
    practiceAttemptCount: 1,
    practiceCorrectCount: 0,
    retryAttemptCount: 1,
    retrySuccessCount: 1,
    transferAttemptCount: 1,
    transferSuccessCount: 1,
  };
  const fullLoopResult = calculateConceptMastery(fullLoop);
  assert(fullLoopResult.components.practiceScore === 0, 'Practice score is 0');
  assert(fullLoopResult.components.retryScore === 30, 'Retry score is 30');
  assert(fullLoopResult.components.transferScore === 30, 'Transfer score is 30');
  assert(fullLoopResult.score === 60, 'Total score is 60 (remediated + transfer application)');
  assert(fullLoopResult.level === 'DEVELOPING', 'Score 60 maps to DEVELOPING');

  // 6. Perfect Mastery: Correct Practice + Transfer Success
  console.log('\n--- 6. Perfect Mastery: Correct Practice + Transfer Success ---');
  const perfectEvidence: ConceptEvidenceData = {
    attemptCount: 2,
    correctCount: 2,
    practiceAttemptCount: 1,
    practiceCorrectCount: 1,
    retryAttemptCount: 0,
    retrySuccessCount: 0,
    transferAttemptCount: 1,
    transferSuccessCount: 1,
  };
  const perfectResult = calculateConceptMastery(perfectEvidence);
  assert(perfectResult.components.practiceScore === 40, 'Practice score is 40');
  assert(perfectResult.components.retryScore === 30, 'Direct retry score is 30');
  assert(perfectResult.components.transferScore === 30, 'Transfer score is 30');
  assert(perfectResult.score === 100, 'Total score is 100');
  assert(perfectResult.level === 'PROFICIENT', 'Score 100 maps to PROFICIENT');

  // 7. Repeated attempts & Mixed evidence
  console.log('\n--- 7. Mixed Evidence: 2 practice (1 correct), 2 retries (1 correct), 1 transfer (1 correct) ---');
  const mixedEvidence: ConceptEvidenceData = {
    attemptCount: 5,
    correctCount: 3,
    practiceAttemptCount: 2,
    practiceCorrectCount: 1,
    retryAttemptCount: 2,
    retrySuccessCount: 1,
    transferAttemptCount: 1,
    transferSuccessCount: 1,
  };
  const mixedResult = calculateConceptMastery(mixedEvidence);
  assert(mixedResult.components.practiceScore === 20, 'Practice score is (1/2)*40 = 20');
  assert(mixedResult.components.retryScore === 15, 'Retry score is (1/2)*30 = 15');
  assert(mixedResult.components.transferScore === 30, 'Transfer score is (1/1)*30 = 30');
  assert(mixedResult.score === 65, 'Total score is 20 + 15 + 30 = 65');
  assert(mixedResult.level === 'DEVELOPING', 'Score 65 maps to DEVELOPING');

  // 8. Clamping & Boundary checks
  console.log('\n--- 8. Clamping & Boundary Constraints ---');
  assert(calculateMasteryLevel(0, 0) === 'NOT_STARTED', '0 score with 0 attempts is NOT_STARTED');
  assert(calculateMasteryLevel(0, 1) === 'BEGINNER', '0 score with 1 attempt is BEGINNER');
  assert(calculateMasteryLevel(39.9, 2) === 'BEGINNER', '39.9 is BEGINNER');
  assert(calculateMasteryLevel(40, 2) === 'DEVELOPING', '40 is DEVELOPING');
  assert(calculateMasteryLevel(69.9, 2) === 'DEVELOPING', '69.9 is DEVELOPING');
  assert(calculateMasteryLevel(70, 2) === 'PROFICIENT', '70 is PROFICIENT');
  assert(calculateMasteryLevel(100, 2) === 'PROFICIENT', '100 is PROFICIENT');

  // Score clamping never below 0 or above 100
  const negativeEvidence: ConceptEvidenceData = {
    attemptCount: 1,
    correctCount: -5,
    practiceAttemptCount: 1,
    practiceCorrectCount: -5,
    retryAttemptCount: 0,
    retrySuccessCount: 0,
    transferAttemptCount: 0,
    transferSuccessCount: 0,
  };
  const minClamped = calculateConceptMastery(negativeEvidence);
  assert(minClamped.score >= 0, 'Score is never negative (clamped >= 0)');

  const overflowEvidence: ConceptEvidenceData = {
    attemptCount: 10,
    correctCount: 50,
    practiceAttemptCount: 10,
    practiceCorrectCount: 50,
    retryAttemptCount: 10,
    retrySuccessCount: 50,
    transferAttemptCount: 10,
    transferSuccessCount: 50,
  };
  const maxClamped = calculateConceptMastery(overflowEvidence);
  assert(maxClamped.score <= 100, 'Score never exceeds 100 (clamped <= 100)');

  // 9. Determinism test
  console.log('\n--- 9. Determinism Test (100 repeated executions) ---');
  let deterministic = true;
  for (let i = 0; i < 100; i++) {
    const res = calculateConceptMastery(mixedEvidence);
    if (res.score !== 65 || res.level !== 'DEVELOPING') {
      deterministic = false;
      break;
    }
  }
  assert(deterministic, 'Repeated executions always yield identical score and level');

  // 10. Overall Mastery Aggregation
  console.log('\n--- 10. Overall Mastery Aggregation ---');
  const emptyOverall = calculateOverallMastery([]);
  assert(emptyOverall.overallScore === 0, 'Empty concepts overall score is 0');
  assert(emptyOverall.overallLevel === 'NOT_STARTED', 'Empty concepts overall level is NOT_STARTED');

  const multiConceptScores = [
    { score: 100, attemptCount: 2 },
    { score: 65, attemptCount: 5 },
    { score: 0, attemptCount: 0 },
  ];
  const overallRes = calculateOverallMastery(multiConceptScores);
  assert(overallRes.overallScore === 55, 'Average score is (100+65+0)/3 = 55');
  assert(overallRes.overallLevel === 'DEVELOPING', 'Overall level is DEVELOPING');
  assert(overallRes.conceptsStarted === 2, 'Concepts started count is 2');
  assert(overallRes.conceptsCompleted === 1, 'Concepts completed (proficient) count is 1');

  console.log('\n============================================================');
  console.log(`TOTAL UNIT TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error('Fatal error in unit tests:', err);
  process.exit(1);
});
