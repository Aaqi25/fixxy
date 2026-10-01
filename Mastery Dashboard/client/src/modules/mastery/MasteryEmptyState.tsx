import React from 'react';
import { Link } from 'react-router-dom';

export const MasteryEmptyState: React.FC = () => {
  return (
    <div
      className="glass mastery-empty-card"
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
      data-testid="mastery-empty-state"
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
        }}
      >
        🌱
      </div>

      <div style={{ maxWidth: '440px' }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
          }}
        >
          Your learning journey starts here.
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          Complete your first practice question to begin building mastery and unlock personalized insights.
        </p>
      </div>

      <Link
        to="/curriculum"
        className="btn-primary"
        style={{
          padding: '0.75rem 1.75rem',
          borderRadius: '14px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(25, 54, 80, 0.2)',
        }}
        data-testid="empty-explore-curriculum-button"
      >
        Explore Curriculum
      </Link>
    </div>
  );
};
