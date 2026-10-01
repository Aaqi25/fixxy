import type { QuestionStage, QuestionDifficulty } from './question.types';

export function getStageLabel(stage: QuestionStage | string): string {
  switch (stage?.toUpperCase()) {
    case 'PRACTICE':
      return 'Practice Question';
    case 'RETRY':
      return 'Targeted Retry';
    case 'TRANSFER':
      return 'Transfer Scenario';
    default:
      return stage || 'Question';
  }
}

export function getStageDescription(stage: QuestionStage | string): string {
  switch (stage?.toUpperCase()) {
    case 'PRACTICE':
      return 'Initial diagnostic to assess your foundational understanding.';
    case 'RETRY':
      return 'Focused assessment after misconception guidance to test the same core principle.';
    case 'TRANSFER':
      return 'Application test in a new practical scenario to demonstrate deep conceptual transfer.';
    default:
      return 'Adaptive question stage.';
  }
}

export function getStageColorClasses(stage: QuestionStage | string): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  accentGradient: string;
} {
  switch (stage?.toUpperCase()) {
    case 'PRACTICE':
      return {
        badgeBg: 'rgba(59, 130, 246, 0.12)',
        badgeText: '#1d4ed8',
        badgeBorder: 'rgba(59, 130, 246, 0.28)',
        dotColor: '#3b82f6',
        accentGradient: 'from-blue-500 to-indigo-600',
      };
    case 'RETRY':
      return {
        badgeBg: 'rgba(245, 158, 11, 0.14)',
        badgeText: '#b45309',
        badgeBorder: 'rgba(245, 158, 11, 0.32)',
        dotColor: '#f59e0b',
        accentGradient: 'from-amber-500 to-orange-600',
      };
    case 'TRANSFER':
      return {
        badgeBg: 'rgba(16, 185, 129, 0.14)',
        badgeText: '#047857',
        badgeBorder: 'rgba(16, 185, 129, 0.32)',
        dotColor: '#10b981',
        accentGradient: 'from-emerald-500 to-teal-600',
      };
    default:
      return {
        badgeBg: 'rgba(100, 116, 139, 0.12)',
        badgeText: '#334155',
        badgeBorder: 'rgba(100, 116, 139, 0.25)',
        dotColor: '#64748b',
        accentGradient: 'from-slate-500 to-slate-700',
      };
  }
}

export function getDifficultyBadge(diff: QuestionDifficulty | string): string {
  switch (diff?.toUpperCase()) {
    case 'BEGINNER':
      return 'Beginner';
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    default:
      return 'Standard';
  }
}
