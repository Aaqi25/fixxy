import React, { useState } from 'react';
import type { PracticeQuestion, AttemptResult } from './answer-submission.types';
import { submitAnswer, type AnswerSubmissionApiError } from './api';
import { AnswerOption } from './AnswerOption';
import { SubmitAnswerButton } from './SubmitAnswerButton';

interface QuestionCardProps {
  question: PracticeQuestion;
  sessionId?: string;
  questionNumber?: number;
  totalQuestions?: number;
  onAnswerSubmitted?: (result: AttemptResult) => void;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  sessionId,
  questionNumber,
  totalQuestions,
  onAnswerSubmitted,
  onNextQuestion,
  hasNextQuestion = false,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<AttemptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectOption = (optionId: string) => {
    if (isSubmitting || submissionResult !== null) return;
    setSelectedOptionId(optionId);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!selectedOptionId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitAnswer({
        questionId: question.id,
        selectedOptionId,
        sessionId,
      });

      setSubmissionResult(res);
      if (onAnswerSubmitted) {
        onAnswerSubmitted(res);
      }
    } catch (err: any) {
      const apiErr = err as AnswerSubmissionApiError;
      setErrorMessage(apiErr.message || "Couldn't submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryQuestion = () => {
    setSubmissionResult(null);
    setSelectedOptionId(null);
    setErrorMessage(null);
  };

  const isSubmitted = submissionResult !== null;
  const isCorrect = submissionResult ? submissionResult.result.correct : null;

  return (
    <div
      className="glass question-card-surface"
      role="region"
      aria-label={`Practice question ${questionNumber || ''}`}
      id={`question-card-${question.id}`}
    >
      {/* Header with Phase & Difficulty Badge */}
      <div className="question-header">
        <div className="question-meta-tags">
          <span className="phase-pill-badge">{question.phase.toUpperCase()}</span>
          {questionNumber !== undefined && totalQuestions !== undefined && (
            <span className="question-counter-badge">
              Question {questionNumber} of {totalQuestions}
            </span>
          )}
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
        <h2 className="question-prompt-text">{question.prompt}</h2>
      </div>

      {/* Answer Options Radio Group */}
      <div
        className="answer-options-group"
        role="radiogroup"
        aria-label="Answer options"
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

      {/* Error Feedback Banner */}
      {errorMessage && (
        <div className="result-banner result-banner-error" role="alert" aria-live="assertive">
          <div className="banner-icon-circle error">!</div>
          <div className="banner-text">
            <h3 className="banner-title">Submission Error</h3>
            <p className="banner-subtitle">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Server Result Feedback Banners */}
      {isSubmitted && (
        <div
          className={`result-banner ${isCorrect ? 'result-banner-correct' : 'result-banner-wrong'}`}
          role="status"
          aria-live="polite"
        >
          <div className={`banner-icon-circle ${isCorrect ? 'correct' : 'wrong'}`} aria-hidden="true">
            {isCorrect ? '✓' : '✗'}
          </div>
          <div className="banner-text">
            <h3 className="banner-title">{isCorrect ? 'Correct' : 'Not quite.'}</h3>
            <p className="banner-subtitle">
              {isCorrect ? 'Great work.' : "Let's understand why."}
            </p>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="question-actions-footer">
        {!isSubmitted ? (
          <SubmitAnswerButton
            onClick={handleSubmit}
            disabled={!selectedOptionId || isSubmitting}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="post-submission-actions">
            {!isCorrect ? (
              <div className="wrong-answer-actions" style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  id="try-again-button"
                  onClick={handleRetryQuestion}
                  className="secondary-button"
                  style={{ flex: '1 1 120px' }}
                >
                  Try Again
                </button>
                {question.conceptSlug && (
                  <a
                    href={`/curriculum/${question.conceptSlug}/retry-transfer${sessionId ? `?session=${sessionId}` : ''}`}
                    id="goto-tutor-retry-button"
                    className="primary-button"
                    style={{ flex: '2 1 200px', textDecoration: 'none', justifyContent: 'center' }}
                  >
                    Understand & Retry with Tutor →
                  </a>
                )}
              </div>
            ) : hasNextQuestion && onNextQuestion ? (
              <button
                type="button"
                id="next-question-button"
                onClick={onNextQuestion}
                className="primary-button"
              >
                Next Question →
              </button>
            ) : (
              <button
                type="button"
                id="practice-again-button"
                onClick={handleRetryQuestion}
                className="secondary-button"
              >
                Practice Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
