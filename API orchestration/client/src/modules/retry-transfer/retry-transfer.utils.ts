import type { LearningStage, RetryTransferSessionData } from './retry-transfer.types';

export interface StageStepInfo {
  step: number;
  id: 'teaching' | 'retry' | 'transfer';
  label: string;
  status: 'upcoming' | 'current' | 'completed';
}

export function computeStageSteps(
  stage: LearningStage,
  session?: RetryTransferSessionData | null
): StageStepInfo[] {
  const isCompleted = stage === 'COMPLETED' || stage === 'TRANSFER_PASS' || session?.isCompleted;

  let currentStepIndex = 1;
  const completedSteps = new Set<number>();

  switch (stage) {
    case 'TEACHING':
    case 'RETEACHING':
      currentStepIndex = 1;
      break;

    case 'RETRY_LOADING':
    case 'RETRY_READY':
    case 'RETRY_SUBMITTING':
    case 'RETRY_WRONG':
      currentStepIndex = 2;
      completedSteps.add(1);
      break;

    case 'RETRY_CORRECT':
    case 'TRANSFER_LOADING':
    case 'TRANSFER_READY':
    case 'TRANSFER_SUBMITTING':
    case 'TRANSFER_FAIL':
      currentStepIndex = 3;
      completedSteps.add(1);
      completedSteps.add(2);
      break;

    case 'TRANSFER_PASS':
    case 'COMPLETED':
      currentStepIndex = 3;
      completedSteps.add(1);
      completedSteps.add(2);
      completedSteps.add(3);
      break;

    default:
      currentStepIndex = 1;
  }

  const steps: StageStepInfo[] = [
    {
      step: 1,
      id: 'teaching',
      label: stage === 'RETEACHING' ? 'Reteaching' : 'Teaching',
      status: completedSteps.has(1) ? 'completed' : currentStepIndex === 1 ? 'current' : 'upcoming',
    },
    {
      step: 2,
      id: 'retry',
      label: 'Retry',
      status: completedSteps.has(2) ? 'completed' : currentStepIndex === 2 ? 'current' : 'upcoming',
    },
    {
      step: 3,
      id: 'transfer',
      label: 'Transfer',
      status: isCompleted || completedSteps.has(3) ? 'completed' : currentStepIndex === 3 ? 'current' : 'upcoming',
    },
  ];

  return steps;
}

export function formatStrategyLabel(strategy?: string): string {
  if (!strategy) return 'Targeted Explanation';
  switch (strategy.toLowerCase()) {
    case 'analogy':
      return 'Conceptual Analogy';
    case 'counterexample':
      return 'Counterexample';
    case 'first-principles':
      return 'First Principles';
    case 'step-by-step':
      return 'Step-by-Step Analysis';
    default:
      return strategy.charAt(0).toUpperCase() + strategy.slice(1);
  }
}

export function formatDifficulty(diff: number): string {
  switch (diff) {
    case 1:
      return 'Foundational';
    case 2:
      return 'Intermediate';
    case 3:
      return 'Advanced Transfer';
    case 4:
    case 5:
      return 'Complex Scenario';
    default:
      return 'Concept Mastery';
  }
}
