import React from 'react';

export type FeedbackType = 'correct' | 'wrong' | 'reteach' | 'transfer-pass' | 'transfer-fail' | 'complete' | 'error';

interface FeedbackPanelProps {
  type: FeedbackType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  type,
  title,
  message,
  actionLabel,
  onAction,
  isActionLoading = false,
}) => {
  const getDefaults = () => {
    switch (type) {
      case 'correct':
        return {
          icon: '✓',
          title: 'Correct',
          message: 'You applied the idea successfully.',
          badgeClass: 'correct',
          bannerClass: 'result-banner-correct',
        };
      case 'wrong':
        return {
          icon: '✗',
          title: 'Not quite.',
          message: "Let's look at this another way.",
          badgeClass: 'wrong',
          bannerClass: 'result-banner-wrong',
        };
      case 'reteach':
        return {
          icon: '💡',
          title: "Let's approach this from another angle.",
          message: 'Review the updated explanation and hint below before trying again.',
          badgeClass: 'reteach',
          bannerClass: 'result-banner-reteach',
        };
      case 'transfer-pass':
        return {
          icon: '★',
          title: 'Transfer Success',
          message: 'You successfully applied the concept to a new scenario.',
          badgeClass: 'correct',
          bannerClass: 'result-banner-correct',
        };
      case 'transfer-fail':
        return {
          icon: '↻',
          title: 'Not yet.',
          message: 'Transfer requires adapting to new conditions. Let us review the concept.',
          badgeClass: 'wrong',
          bannerClass: 'result-banner-wrong',
        };
      case 'complete':
        return {
          icon: '✓',
          title: 'Concept Complete',
          message: 'You successfully applied the concept to a new problem.',
          badgeClass: 'correct',
          bannerClass: 'result-banner-correct',
        };
      case 'error':
      default:
        return {
          icon: '!',
          title: 'Notice',
          message: 'Something went wrong. Please try again.',
          badgeClass: 'error',
          bannerClass: 'result-banner-error',
        };
    }
  };

  const defaults = getDefaults();
  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;

  return (
    <div
      className={`glass feedback-panel ${defaults.bannerClass}`}
      role="status"
      aria-live="polite"
      id={`feedback-panel-${type}`}
    >
      <div className={`feedback-icon-circle ${defaults.badgeClass}`} aria-hidden="true">
        {defaults.icon}
      </div>

      <div className="feedback-content-text">
        <h3 className="feedback-title">{displayTitle}</h3>
        <p className="feedback-message">{displayMessage}</p>
      </div>

      {actionLabel && onAction && (
        <div className="feedback-action-container">
          <button
            type="button"
            onClick={onAction}
            disabled={isActionLoading}
            className="primary-button feedback-action-button"
            id={`feedback-action-${type}`}
          >
            {isActionLoading ? (
              <span className="submit-spinner-container">
                <span className="submit-spinner" aria-hidden="true" />
                <span>Processing...</span>
              </span>
            ) : (
              actionLabel
            )}
          </button>
        </div>
      )}
    </div>
  );
};
