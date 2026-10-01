/**
 * Module 7: Frontend Mastery Types
 */

export type MasteryLevel = 'NOT_STARTED' | 'BEGINNER' | 'DEVELOPING' | 'PROFICIENT';

export interface MasterySummaryDto {
  overallMastery: number;
  masteryLevel: MasteryLevel;
  totalConcepts: number;
  conceptsStarted: number;
  conceptsCompleted: number;
  totalAttempts: number;
  questionsAnswered: number;
  correctAttempts: number;
  retrySuccesses: number;
  transferSuccesses: number;
}

export interface OverallMasteryResponse {
  summary: MasterySummaryDto;
}

export interface ConceptMasteryDto {
  conceptId: string;
  slug: string;
  title: string;
  masteryScore: number;
  masteryLevel: MasteryLevel;
  attemptCount: number;
  correctCount: number;
  retrySuccessCount: number;
  transferSuccessCount: number;
  lastActivityAt: string | null;
}

export interface ConceptsMasteryResponse {
  concepts: ConceptMasteryDto[];
}

export type ActivityType =
  | 'PRACTICE_CORRECT'
  | 'PRACTICE_WRONG'
  | 'PRACTICE_ATTEMPT'
  | 'RETRY_SUCCESS'
  | 'RETRY_WRONG'
  | 'RETRY_ATTEMPT'
  | 'TRANSFER_SUCCESS'
  | 'TRANSFER_WRONG'
  | 'TRANSFER_ATTEMPT';

export interface RecentActivityItemDto {
  id: string;
  type: ActivityType;
  conceptTitle: string;
  conceptSlug: string;
  phase: string;
  isCorrect: boolean;
  timestamp: string;
  description: string;
}

export interface RecentActivityResponse {
  activity: RecentActivityItemDto[];
}

export type InsightStatus = 'STRONG' | 'NEEDS_REVIEW' | 'IN_PROGRESS' | 'RECOMMENDED';

export interface LearningInsightDto {
  type: 'STRONGEST_CONCEPT' | 'NEEDS_PRACTICE' | 'RECENT_IMPROVEMENT' | 'NEXT_RECOMMENDED' | 'MISCONCEPTION_REVIEW';
  conceptTitle: string;
  conceptSlug: string;
  title: string;
  description: string;
  status: InsightStatus;
}

export interface LearningInsightsResponse {
  insights: LearningInsightDto[];
}

export type DashboardStatus = 'INITIAL_LOADING' | 'LOADED' | 'EMPTY' | 'ERROR' | 'REFRESHING';
