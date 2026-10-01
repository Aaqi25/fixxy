/**
 * Module 7: Mastery Service
 * Coordinates learning evidence calculation, persistence, summaries, and deterministic insights.
 */

import { ValidationError, UnauthorizedError } from '../attempts/attempt.service';
import { MasteryRepository, masteryRepository } from './mastery.repository';
import {
  calculateConceptMastery,
  calculateOverallMastery,
} from './mastery.calculator';
import {
  MasterySummaryDto,
  ConceptMasteryDto,
  RecentActivityItemDto,
  LearningInsightDto,
} from './mastery.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MasteryService {
  constructor(private readonly repo: MasteryRepository = masteryRepository) {}

  isValidUuid(id: unknown): id is string {
    return typeof id === 'string' && UUID_REGEX.test(id.trim());
  }

  /**
   * Recalculate and persist mastery for a specific student and concept.
   * Invoked automatically whenever learning attempts or retry/transfer events occur.
   */
  async refreshConceptMastery(studentId: string, conceptId: string): Promise<void> {
    if (!this.isValidUuid(studentId) || !this.isValidUuid(conceptId)) {
      return;
    }

    const { evidence, lastActivityAt } = await this.repo.getEvidenceForConcept(studentId, conceptId);
    const result = calculateConceptMastery(evidence);

    await this.repo.upsertMastery({
      studentId,
      conceptId,
      masteryScore: result.score,
      masteryLevel: result.level,
      attemptCount: evidence.attemptCount,
      correctCount: evidence.correctCount,
      retrySuccessCount: evidence.retrySuccessCount,
      transferSuccessCount: evidence.transferSuccessCount,
      lastActivityAt,
    });
  }

  /**
   * Recalculate and persist mastery for a student given a question ID.
   */
  async refreshMasteryByQuestion(studentId: string, questionId: string): Promise<void> {
    if (!this.isValidUuid(studentId) || !this.isValidUuid(questionId)) {
      return;
    }
    const conceptId = await this.repo.getConceptIdByQuestionId(questionId);
    if (conceptId) {
      await this.refreshConceptMastery(studentId, conceptId);
    }
  }

  /**
   * Get overall mastery summary for the authenticated student.
   */
  async getOverallSummary(studentId: string | undefined): Promise<MasterySummaryDto> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    // 1. Fetch concepts with mastery
    const conceptRecords = await this.repo.getConceptsWithMastery(studentId);

    // 2. Fetch overall metrics from attempts
    const metrics = await this.repo.getOverallMetrics(studentId);

    // 3. Compute overall score and level
    const overall = calculateOverallMastery(
      conceptRecords.map((c) => ({
        score: c.masteryScore,
        attemptCount: c.attemptCount,
      }))
    );

    return {
      overallMastery: overall.overallScore,
      masteryLevel: overall.overallLevel,
      totalConcepts: conceptRecords.length,
      conceptsStarted: overall.conceptsStarted,
      conceptsCompleted: overall.conceptsCompleted,
      totalAttempts: metrics.totalAttempts,
      questionsAnswered: metrics.totalAttempts,
      correctAttempts: metrics.correctAttempts,
      retrySuccesses: metrics.retrySuccesses,
      transferSuccesses: metrics.transferSuccesses,
    };
  }

  /**
   * Get concept-level mastery records for the authenticated student.
   */
  async getConceptMasteries(studentId: string | undefined): Promise<ConceptMasteryDto[]> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    const records = await this.repo.getConceptsWithMastery(studentId);

    return records.map((r) => ({
      conceptId: r.conceptId,
      slug: r.conceptSlug,
      title: r.conceptTitle,
      masteryScore: r.masteryScore,
      masteryLevel: r.masteryLevel,
      attemptCount: r.attemptCount,
      correctCount: r.correctCount,
      retrySuccessCount: r.retrySuccessCount,
      transferSuccessCount: r.transferSuccessCount,
      lastActivityAt: r.lastActivityAt,
    }));
  }

  /**
   * Get recent learning activity for the authenticated student.
   */
  async getRecentActivity(studentId: string | undefined, limit = 10): Promise<RecentActivityItemDto[]> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    const safeLimit = Math.min(50, Math.max(1, limit));
    return this.repo.getRecentActivity(studentId, safeLimit);
  }

  /**
   * Generate deterministic evidence-based learning insights for the authenticated student.
   */
  async getLearningInsights(studentId: string | undefined): Promise<LearningInsightDto[]> {
    if (!studentId || !this.isValidUuid(studentId)) {
      throw new UnauthorizedError('Authentication required');
    }

    const concepts = await this.repo.getConceptsWithMastery(studentId);
    const metrics = await this.repo.getOverallMetrics(studentId);

    // If student has zero learning activity, return empty array
    if (metrics.totalAttempts === 0) {
      return [];
    }

    const insights: LearningInsightDto[] = [];
    const startedConcepts = concepts.filter((c) => c.attemptCount > 0);
    const unstartedConcepts = concepts.filter((c) => c.attemptCount === 0);

    // 1. Strongest Concept Insight
    if (startedConcepts.length > 0) {
      const strongest = [...startedConcepts].sort((a, b) => b.masteryScore - a.masteryScore)[0];
      if (strongest.masteryScore >= 70) {
        insights.push({
          type: 'STRONGEST_CONCEPT',
          conceptTitle: strongest.conceptTitle,
          conceptSlug: strongest.conceptSlug,
          title: `Strong Mastery in ${strongest.conceptTitle}`,
          description: `You have reached ${strongest.masteryScore}% mastery with solid accuracy and transfer competency.`,
          status: 'STRONG',
        });
      }
    }

    // 2. Focus Area / Needs Practice Insight
    if (startedConcepts.length > 0) {
      const needsFocus = [...startedConcepts].sort((a, b) => a.masteryScore - b.masteryScore)[0];
      if (needsFocus.masteryScore < 70) {
        insights.push({
          type: 'NEEDS_PRACTICE',
          conceptTitle: needsFocus.conceptTitle,
          conceptSlug: needsFocus.conceptSlug,
          title: `Focus Area: ${needsFocus.conceptTitle}`,
          description: `Current mastery is ${needsFocus.masteryScore}%. Completing further retry or transfer practice will solidify understanding.`,
          status: 'NEEDS_REVIEW',
        });
      }
    }

    // 3. Recent Improvement Insight
    if (metrics.retrySuccesses > 0 || metrics.transferSuccesses > 0) {
      const totalFollowUps = metrics.retrySuccesses + metrics.transferSuccesses;
      const latestConcept = startedConcepts.find((c) => c.lastActivityAt) || startedConcepts[0];
      insights.push({
        type: 'RECENT_IMPROVEMENT',
        conceptTitle: latestConcept?.conceptTitle || 'Curriculum',
        conceptSlug: latestConcept?.conceptSlug || '',
        title: 'Effective Remediation',
        description: `You have successfully completed ${totalFollowUps} adaptive follow-up challenges (${metrics.retrySuccesses} retries, ${metrics.transferSuccesses} transfers).`,
        status: 'IN_PROGRESS',
      });
    }

    // 4. Next Recommended Concept
    if (unstartedConcepts.length > 0) {
      const next = unstartedConcepts[0];
      insights.push({
        type: 'NEXT_RECOMMENDED',
        conceptTitle: next.conceptTitle,
        conceptSlug: next.conceptSlug,
        title: `Next Up: ${next.conceptTitle}`,
        description: `Ready to explore new topics. Start learning ${next.conceptTitle} to build overall curriculum mastery.`,
        status: 'RECOMMENDED',
      });
    }

    return insights;
  }
}

export const masteryService = new MasteryService();
