import React from 'react';
import type { QuestionOption } from './answer-submission.types';

interface AnswerOptionProps {
  option: QuestionOption;
  isSelected: boolean;
  isSubmitted: boolean;
  isCorrect?: boolean | null;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  option,
  isSelected,
  isSubmitted,
  isCorrect,
  disabled,
  onSelect,
}) => {
  const letter = OPTION_LETTERS[option.position - 1] || `${option.position}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect(option.id);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onSelect(option.id);
    }
  };

  // Determine visual styling state
  let statusClass = 'answer-option-default';
  let badgeClass = 'option-badge-default';

  if (isSubmitted && isSelected) {
    if (isCorrect === true) {
      statusClass = 'answer-option-correct';
      badgeClass = 'option-badge-correct';
    } else if (isCorrect === false) {
      statusClass = 'answer-option-wrong';
      badgeClass = 'option-badge-wrong';
    }
  } else if (isSelected) {
    statusClass = 'answer-option-selected';
    badgeClass = 'option-badge-selected';
  }

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
      aria-label={`Option ${letter}: ${option.optionText}`}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      id={`answer-option-${option.id}`}
      className={`answer-option-card ${statusClass} ${disabled ? 'disabled' : ''}`}
    >
      <div className={`option-letter-badge ${badgeClass}`}>
        {isSubmitted && isSelected ? (
          isCorrect ? (
            <span aria-hidden="true">✓</span>
          ) : (
            <span aria-hidden="true">✗</span>
          )
        ) : (
          <span>{letter}</span>
        )}
      </div>

      <div className="option-text-content">
        <p className="option-text">{option.optionText}</p>
      </div>

      <div className="option-select-indicator" aria-hidden="true">
        <div className={`indicator-dot ${isSelected ? 'active' : ''}`} />
      </div>
    </div>
  );
};
