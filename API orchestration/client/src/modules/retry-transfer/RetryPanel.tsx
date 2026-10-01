import React, { useState } from 'react';
import type { SafeQuestion } from './retry-transfer.types';
import { AnswerOption } from '../answer-submission/AnswerOption';
import { FeedbackPanel } from './FeedbackPanel';

interface RetryPanelProps {
  question: SafeQuestion;
  onSubmit: (selectedOptionId: string) => Promise<void>;
  onContinueToTransfer?: () => void;
  onContinueToReteach?: () => void;
  isSubmitting?: boolean;
  result?: { correct: boolean } | null;
  errorMessage?: string | null;
}

export const RetryPanel: React.FC<RetryPanelProps> = ({
  question,
  onSubmit,
  onContinueToTransfer,
  onContinueToReteach,
  isSubmitting = false,
  result = null,
  errorMessage = null,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSelectOption = (optionId: string) => {
    if (isSubmitting || result !== null) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmit = async () => {
    if (!selectedOptionId || isSubmitting || result !== null) return;
    await onSubmit(selectedOptionId);
  };

  const isSubmitted = result !== null;
  const isCorrect = result ? result.correct : null;

  return (
    <div
      className="glass question-card-surface retry-card-surface"
      role="region"
      aria-label="Retry Question"
      id="retry-question-panel"
    >
      {/* Header with Phase & Difficulty Badge */}
      <div className="question-header">
        <div className="question-meta-tags">
          <span className="phase-pill-badge retry-phase-badge">RETRY</span>
          <span className="question-counter-badge">Reapplication Question</span>
        </div>
        <div className="difficulty-indicator" aria-label={`Difficulty ${question.difficulty} of 5`}>
          <span className="difficulty-label">Difficulty</span>
          <span className="difficulty-stars" aria-hidden="true">
            {'★'.repeat(question.difficulty)}
            {'☆'.repeat(Math.max(0, 5 - question.difficulty))}
          </span>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="question-prompt-box">
        <h2 className="question-prompt-text" id="retry-question-prompt">
          {question.prompt}
        </h2>
      </div>

      {/* Options Radio Group */}
      <div
        className="answer-options-group"
        role="radiogroup"
        aria-labelledby="retry-question-prompt"
        id="retry-options-group"
      >
        {question.options.map((opt) => (
          <AnswerOption
            key={opt.id}
            option={opt}
            isSelected={selectedOptionId === opt.id}
            isSubmitted={isSubmitted}
            isCorrect={selectedOptionId === opt.id ? isCorrect : null}
            disabled={isSubmitting || isSubmitted}
            onSelect={handleSelectOption}
          />
        ))}
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div className="result-banner result-banner-error" role="alert" aria-live="assertive">
          <div className="banner-icon-circle error">!</div>
          <div className="banner-text">
            <h3 className="banner-title">Submission Error</h3>
            <p className="banner-subtitle">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Result Feedback & Actions */}
      {isSubmitted && (
        <div className="retry-result-section">
          {isCorrect ? (
            <FeedbackPanel
              type="correct"
              title="Correct"
              message="You applied the idea successfully."
              actionLabel="Continue to Transfer Question →"
              onAction={onContinueToTransfer}
            />
          ) : (
            <FeedbackPanel
              type="wrong"
              title="Not quite."
              message="Let's look at this another way."
              actionLabel="Review Explanation & Approach Again →"
              onAction={onContinueToReteach}
            />
          )}
        </div>
      )}

      {/* Initial Submission Button */}
      {!isSubmitted && (
        <div className="question-actions-footer">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedOptionId || isSubmitting}
            className="primary-button submit-answer-button"
            id="submit-retry-button"
          >
            {isSubmitting ? (
              <span className="submit-spinner-container">
                <span className="submit-spinner" aria-hidden="true" />
                <span>Checking your answer...</span>
              </span>
            ) : (
              <span>Submit Retry Answer</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
