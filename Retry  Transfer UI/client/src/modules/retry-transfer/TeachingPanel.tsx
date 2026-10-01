import React from 'react';
import type { TeachingResponse } from './retry-transfer.types';
import { formatStrategyLabel } from './retry-transfer.utils';

interface TeachingPanelProps {
  teaching: TeachingResponse;
  onContinueToRetry?: () => void;
  isContinuing?: boolean;
  isReteach?: boolean;
}

export const TeachingPanel: React.FC<TeachingPanelProps> = ({
  teaching,
  onContinueToRetry,
  isContinuing = false,
  isReteach = false,
}) => {
  const strategyFormatted = formatStrategyLabel(teaching.strategy);

  return (
    <div
      className="glass teaching-panel-card"
      role="region"
      aria-label="FIXXY Tutor Teaching Response"
      id="teaching-panel"
    >
      {/* Header with FIXXY Tutor Brand Badge */}
      <div className="teaching-header">
        <div className="tutor-badge-group">
          <div className="tutor-avatar-icon" aria-hidden="true">
            🤖
          </div>
          <div>
            <span className="tutor-brand-label">FIXXY TUTOR</span>
            <h2 className="teaching-heading">
              {isReteach ? "Let's approach this from another angle." : "Let's understand what happened."}
            </h2>
          </div>
        </div>

        {teaching.strategy && (
          <span className="strategy-tag-badge" aria-label={`Teaching Strategy: ${strategyFormatted}`}>
            {strategyFormatted}
          </span>
        )}
      </div>

      {/* Misconception Diagnosis Box */}
      {teaching.misconceptionTitle && (
        <div className="misconception-diagnosis-box" role="status">
          <div className="diagnosis-label-row">
            <span className="diagnosis-icon" aria-hidden="true">
              🎯
            </span>
            <span className="diagnosis-header-text">Diagnosed Misconception</span>
            {teaching.misconceptionCode && (
              <span className="misconception-code-pill">{teaching.misconceptionCode}</span>
            )}
          </div>
          <p className="diagnosis-title-text">{teaching.misconceptionTitle}</p>
        </div>
      )}

      {/* Personalized Explanation Box */}
      <div className="explanation-section">
        <span className="section-small-label">Personalized Explanation</span>
        <div className="explanation-box-surface">
          <p className="explanation-text">{teaching.explanation}</p>
        </div>
      </div>

      {/* Actionable Hint Box */}
      {teaching.hint && (
        <div className="hint-section" role="note" aria-label="Tutor Hint">
          <div className="hint-label-row">
            <span className="hint-icon" aria-hidden="true">
              💡
            </span>
            <span className="hint-header-text">Key Hint</span>
          </div>
          <p className="hint-text">{teaching.hint}</p>
        </div>
      )}

      {/* Continue Action */}
      {onContinueToRetry && (
        <div className="teaching-actions-footer">
          <button
            type="button"
            onClick={onContinueToRetry}
            disabled={isContinuing}
            id="continue-to-retry-btn"
            className="primary-button continue-to-retry-btn"
            aria-label="Continue to Retry Question"
          >
            {isContinuing ? (
              <span className="submit-spinner-container">
                <span className="submit-spinner" aria-hidden="true" />
                <span>Loading Retry Question...</span>
              </span>
            ) : (
              <span>Continue to Retry Question →</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
