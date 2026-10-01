/**
 * Module 7: Mastery Calculator
 * Authoritative, deterministic backend scoring engine for FIXXY learning evidence.
 *
 * FORMULA SPECIFICATION:
 * Total Concept Mastery Score = Practice Score (40%) + Retry Recovery Score (30%) + Transfer Application Score (30%)
 *
 * 1. Base Practice Component (0 to 40 points):
 *    - practiceAccuracy = practiceAttempts > 0 ? (practiceCorrect / practiceAttempts) : 0
 *    - practiceScore = practiceAccuracy * 40
 *
 * 2. Retry Recovery Component (0 to 30 points):
 *    - If retry attempts exist:
 *        retryScore = (retrySuccessCount / retryAttemptCount) * 30
 *    - If no retry was needed because student answered practice directly correct on 1st attempt:
 *        retryScore = 30 (awarded full direct mastery credit)
 *    - If practice was failed and no retry passed yet:
 *        retryScore = 0
 *
 * 3. Transfer Application Component (0 to 30 points):
 *    - If transfer attempts exist:
 *        transferScore = (transferSuccessCount / transferAttemptCount) * 30
 *    - If transfer not yet attempted:
 *        transferScore = 0
 *
 * Clamping: Score is clamped to [0, 100] and rounded to 1 decimal place.
 *
 * Mastery Level Thresholds:
 * - NOT_STARTED: attemptCount === 0 (Score: 0)
 * - BEGINNER: attemptCount > 0 and score < 40
 * - DEVELOPING: score >= 40 and score < 70
 * - PROFICIENT: score >= 70 and score <= 100
 */

import { MasteryLevel } from './mastery.types';

export const MASTERY_THRESHOLDS = {
  NOT_STARTED_MAX: 0,
  BEGINNER_MAX: 39.99,
  DEVELOPING_MIN: 40,
  DEVELOPING_MAX: 69.99,
  PROFICIENT_MIN: 70,
  MAX_SCORE: 100,
} as const;

export interface ConceptEvidenceData {
  attemptCount: number;
  correctCount: number;
  practiceAttemptCount: number;
  practiceCorrectCount: number;
  retryAttemptCount: number;
  retrySuccessCount: number;
  transferAttemptCount: number;
  transferSuccessCount: number;
}

export interface CalculationResult {
  score: number;
  level: MasteryLevel;
  components: {
    practiceScore: number;
    retryScore: number;
    transferScore: number;
  };
}

/**
 * Determine mastery level from score and attempt count.
 */
export function calculateMasteryLevel(score: number, attemptCount: number): MasteryLevel {
  if (attemptCount === 0) {
    return 'NOT_STARTED';
  }
  if (score < MASTERY_THRESHOLDS.DEVELOPING_MIN) {
    return 'BEGINNER';
  }
  if (score < MASTERY_THRESHOLDS.PROFICIENT_MIN) {
    return 'DEVELOPING';
  }
  return 'PROFICIENT';
}

/**
 * Calculate authoritative concept mastery score from learning evidence.
 */
export function calculateConceptMastery(evidence: ConceptEvidenceData): CalculationResult {
  const {
    attemptCount,
    practiceAttemptCount,
    practiceCorrectCount,
    retryAttemptCount,
    retrySuccessCount,
    transferAttemptCount,
    transferSuccessCount,
  } = evidence;

  // 1. Zero evidence case
  if (attemptCount <= 0) {
    return {
      score: 0,
      level: 'NOT_STARTED',
      components: {
        practiceScore: 0,
        retryScore: 0,
        transferScore: 0,
      },
    };
  }

  // 2. Practice component (0 to 40)
  let practiceScore = 0;
  if (practiceAttemptCount > 0) {
    const practiceRate = Math.min(1, Math.max(0, practiceCorrectCount / practiceAttemptCount));
    practiceScore = practiceRate * 40;
  } else if (attemptCount > 0) {
    const genericRate = Math.min(1, Math.max(0, evidence.correctCount / attemptCount));
    practiceScore = genericRate * 40;
  }

  // 3. Retry component (0 to 30)
  let retryScore = 0;
  if (retryAttemptCount > 0) {
    const retryRate = Math.min(1, Math.max(0, retrySuccessCount / retryAttemptCount));
    retryScore = retryRate * 30;
  } else if (practiceCorrectCount > 0 && practiceAttemptCount > 0) {
    // Student succeeded on practice directly without needing remediation
    retryScore = 30;
  }

  // 4. Transfer component (0 to 30)
  let transferScore = 0;
  if (transferAttemptCount > 0) {
    const transferRate = Math.min(1, Math.max(0, transferSuccessCount / transferAttemptCount));
    transferScore = transferRate * 30;
  }

  // 5. Total score, clamped to [0, 100] and rounded
  const rawScore = practiceScore + retryScore + transferScore;
  const clampedScore = Math.min(100, Math.max(0, rawScore));
  const roundedScore = Math.round(clampedScore * 10) / 10;

  const level = calculateMasteryLevel(roundedScore, attemptCount);

  return {
    score: roundedScore,
    level,
    components: {
      practiceScore: Math.round(practiceScore * 10) / 10,
      retryScore: Math.round(retryScore * 10) / 10,
      transferScore: Math.round(transferScore * 10) / 10,
    },
  };
}

/**
 * Calculate overall summary mastery from an array of concept scores.
 */
export function calculateOverallMastery(conceptScores: { score: number; attemptCount: number }[]): {
  overallScore: number;
  overallLevel: MasteryLevel;
  conceptsStarted: number;
  conceptsCompleted: number;
} {
  if (conceptScores.length === 0) {
    return {
      overallScore: 0,
      overallLevel: 'NOT_STARTED',
      conceptsStarted: 0,
      conceptsCompleted: 0,
    };
  }

  const totalScoreSum = conceptScores.reduce((sum, c) => sum + c.score, 0);
  const totalAttempts = conceptScores.reduce((sum, c) => sum + c.attemptCount, 0);
  const conceptsStarted = conceptScores.filter((c) => c.attemptCount > 0).length;
  const conceptsCompleted = conceptScores.filter((c) => c.score >= MASTERY_THRESHOLDS.PROFICIENT_MIN).length;

  const averageScore = Math.round((totalScoreSum / conceptScores.length) * 10) / 10;
  const overallLevel = calculateMasteryLevel(averageScore, totalAttempts);

  return {
    overallScore: averageScore,
    overallLevel,
    conceptsStarted,
    conceptsCompleted,
  };
}
