import React from 'react';
import type { LearningStage as LearningStageType, RetryTransferSessionData } from './retry-transfer.types';
import { computeStageSteps } from './retry-transfer.utils';

interface LearningStageProps {
  currentStage: LearningStageType;
  session?: RetryTransferSessionData | null;
}

export const LearningStage: React.FC<LearningStageProps> = ({ currentStage, session }) => {
  const steps = computeStageSteps(currentStage, session);

  return (
    <nav
      className="learning-stage-stepper"
      aria-label="Learning progression steps"
      id="fixxy-learning-stage"
    >
      <ol className="stage-step-list" role="list">
        {steps.map((s, idx) => {
          const isCompleted = s.status === 'completed';
          const isCurrent = s.status === 'current';

          return (
            <li
              key={s.id}
              className={`stage-step-item stage-step-${s.status}`}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="step-badge-wrapper">
                <div
                  className={`step-circle ${
                    isCompleted ? 'step-circle-completed' : isCurrent ? 'step-circle-current' : 'step-circle-upcoming'
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : s.step}
                </div>
                <div className="step-label-group">
                  <span className="step-label-name">{s.label}</span>
                  <span className="step-status-tag">
                    {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Next'}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`step-connector-line ${isCompleted ? 'connector-completed' : 'connector-upcoming'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
