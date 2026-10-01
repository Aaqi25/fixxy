import React from 'react';

interface MasteryErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const MasteryErrorState: React.FC<MasteryErrorStateProps> = ({
  message = "Couldn't load your learning progress.",
  onRetry,
}) => {
  return (
    <div
      className="glass mastery-error-card"
      style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        borderRadius: '24px',
        margin: '2rem 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}
      data-testid="mastery-error-state"
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(198, 42, 71, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
        }}
      >
        ⚠️
      </div>

      <div style={{ maxWidth: '420px' }}>
        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.4rem',
          }}
        >
          {message}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Please verify your internet connection or try loading your progress again.
        </p>
      </div>

      <button
        onClick={onRetry}
        className="btn-primary"
        style={{
          padding: '0.7rem 1.5rem',
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        data-testid="mastery-retry-button"
        aria-label="Retry loading learning progress"
      >
        Try Again
      </button>
    </div>
  );
};
