import React from 'react';
import { Link } from 'react-router-dom';
import type { ConceptMasteryDto } from './mastery.types';
import { getLevelLabel, getLevelBadgeClass, formatRelativeTime } from './mastery.utils';
import { MasteryProgress } from './MasteryProgress';

interface ConceptMasteryCardProps {
  concept: ConceptMasteryDto;
}

export const ConceptMasteryCard: React.FC<ConceptMasteryCardProps> = ({ concept }) => {
  const {
    slug,
    title,
    masteryScore,
    masteryLevel,
    attemptCount,
    correctCount,
    retrySuccessCount,
    transferSuccessCount,
    lastActivityAt,
  } = concept;

  return (
    <div
      className="glass concept-mastery-card"
      style={{
        padding: '1.5rem',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '1.25rem',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      data-testid={`concept-card-${slug}`}
    >
      <div>
        {/* Card Header: Title & Level Badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {title}
          </h3>
          <span
            className={`badge ${getLevelBadgeClass(masteryLevel)}`}
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            data-testid={`concept-level-${slug}`}
          >
            {getLevelLabel(masteryLevel)}
          </span>
        </div>

        {/* Progress Bar & Numeric Score */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Mastery</span>
            <span
              style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}
              data-testid={`concept-score-${slug}`}
            >
              {masteryScore}%
            </span>
          </div>
          <MasteryProgress score={masteryScore} height={8} label={`${title} Mastery`} />
        </div>

        {/* Evidence Breakdown Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.6rem',
            padding: '0.75rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.78rem',
            marginBottom: '0.5rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Attempts: </span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{attemptCount}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Correct: </span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{correctCount}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Retry Success: </span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{retrySuccessCount}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Transfer Success: </span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{transferSuccessCount}</strong>
          </div>
        </div>

        {/* Last Activity */}
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          Last activity: {formatRelativeTime(lastActivityAt)}
        </div>
      </div>

      {/* Action CTA */}
      <div style={{ paddingTop: '0.5rem' }}>
        <Link
          to={`/curriculum/${slug}`}
          className="btn-primary"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.6rem 1rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          data-testid={`concept-cta-${slug}`}
        >
          {attemptCount > 0 ? 'Continue Learning' : 'Start Concept'}
        </Link>
      </div>
    </div>
  );
};
