import React, { useState } from 'react';
import type { SafeQuestion } from './retry-transfer.types';
import { AnswerOption } from '../answer-submission/AnswerOption';
import { FeedbackPanel } from './FeedbackPanel';

interface TransferPanelProps {
  question: SafeQuestion;
  onSubmit: (selectedOptionId: string) => Promise<void>;
  onComplete?: () => void;
  onContinueToReteach?: () => void;
  isSubmitting?: boolean;
  result?: { correct: boolean } | null;
  errorMessage?: string | null;
}

export const TransferPanel: React.FC<TransferPanelProps> = ({
  question,
  onSubmit,
  onComplete,
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
      className="glass question-card-surface transfer-card-surface"
      role="region"
      aria-label="Transfer Question"
      id="transfer-question-panel"
    >
      {/* Header with Phase & Difficulty Badge */}
      <div className="question-header">
        <div className="question-meta-tags">
          <span className="phase-pill-badge transfer-phase-badge">TRANSFER</span>
          <span className="question-counter-badge">Novel Scenario Application</span>
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
        <h2 className="question-prompt-text" id="transfer-question-prompt">
          {question.prompt}
        </h2>
      </div>

      {/* Options Radio Group */}
      <div
        className="answer-options-group"
        role="radiogroup"
        aria-labelledby="transfer-question-prompt"
        id="transfer-options-group"
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
        <div className="transfer-result-section">
          {isCorrect ? (
            <FeedbackPanel
              type="transfer-pass"
              title="Transfer Success"
              message="You successfully applied the concept to a new scenario."
              actionLabel="View Concept Completion →"
              onAction={onComplete}
            />
          ) : (
            <FeedbackPanel
              type="transfer-fail"
              title="Not yet."
              message="Transfer requires adapting to new conditions. Let us approach this another way."
              actionLabel="Review Concept & Try Again →"
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
            id="submit-transfer-button"
          >
            {isSubmitting ? (
              <span className="submit-spinner-container">
                <span className="submit-spinner" aria-hidden="true" />
                <span>Checking your answer...</span>
              </span>
            ) : (
              <span>Submit Transfer Answer</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
