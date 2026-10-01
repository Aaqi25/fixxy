import React from 'react';
import { Link } from 'react-router-dom';
import type { ConceptSummary } from './curriculum.types';
import { formatDifficulty, formatDisplayOrder, formatMinutes } from './curriculum.utils';

interface ConceptCardProps {
  concept: ConceptSummary;
  prerequisiteNames?: string[];
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  concept,
  prerequisiteNames = [],
}) => {
  const difficulty = formatDifficulty(concept.difficultyLevel);
  const formattedOrder = formatDisplayOrder(concept.displayOrder);
  const formattedTime = formatMinutes(concept.estimatedMinutes);

  return (
    <article
      id={`concept-card-${concept.slug}`}
      className="glass concept-card-container"
      style={{
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-labelledby={`concept-title-${concept.slug}`}
    >
      {/* Top row: Order Number and Badges */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--color-button-primary)',
              opacity: 0.8,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formattedOrder}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                ...difficulty.badgeStyle,
              }}
            >
              {difficulty.label}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(32, 70, 115, 0.08)',
                color: 'var(--color-text-secondary)',
                border: '1px solid rgba(32, 70, 115, 0.15)',
              }}
            >
              ⏱ {formattedTime}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          id={`concept-title-${concept.slug}`}
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.625rem',
            lineHeight: 1.3,
          }}
        >
          {concept.title}
        </h3>

        {/* Short description */}
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.55,
            marginBottom: '1.25rem',
          }}
        >
          {concept.shortDescription}
        </p>
      </div>

      {/* Footer: Prerequisite Notice & Explore CTA */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(32, 70, 115, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
          {prerequisiteNames.length > 0 ? (
            <span>
              Requires:{' '}
              <strong style={{ color: 'var(--color-text-secondary)' }}>
                {prerequisiteNames.join(', ')}
              </strong>
            </span>
          ) : (
            <span style={{ color: '#1a7245', fontWeight: 500 }}>
              ✓ Foundational concept
            </span>
          )}
        </div>

        <Link
          to={`/curriculum/${concept.slug}`}
          id={`explore-concept-${concept.slug}`}
          className="explore-button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: 'var(--color-button-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            textDecoration: 'none',
            transition: 'background-color 0.18s ease, transform 0.18s ease',
            boxShadow: '0 2px 8px rgba(25, 54, 80, 0.15)',
          }}
          aria-label={`Explore ${concept.title}`}
        >
          Explore
          <span aria-hidden="true" style={{ fontSize: '1rem' }}>
            →
          </span>
        </Link>
      </div>
    </article>
  );
};
