import React, { useRef } from 'react';

interface SubmitAnswerButtonProps {
  onClick: () => void;
  disabled: boolean;
  isSubmitting: boolean;
  label?: string;
  submittingLabel?: string;
  id?: string;
}

export const SubmitAnswerButton: React.FC<SubmitAnswerButtonProps> = ({
  onClick,
  disabled,
  isSubmitting,
  label = 'Submit Answer',
  submittingLabel = 'Checking your answer...',
  id = 'submit-answer-button',
}) => {
  const lastClickRef = useRef<number>(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled || isSubmitting) return;

    // Frontend debounce to prevent rapid double-clicks
    const now = Date.now();
    if (now - lastClickRef.current < 600) {
      return;
    }
    lastClickRef.current = now;

    onClick();
  };

  return (
    <button
      id={id}
      type="button"
      onClick={handleClick}
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting}
      className={`submit-answer-button primary-button ${isSubmitting ? 'submitting' : ''}`}
    >
      {isSubmitting ? (
        <span className="submit-spinner-container">
          <svg
            className="submit-spinner"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          <span>{submittingLabel}</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};
