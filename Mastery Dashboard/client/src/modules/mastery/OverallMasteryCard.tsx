import React from 'react';
import type { MasterySummaryDto } from './mastery.types';
import { getLevelLabel, getLevelBadgeClass } from './mastery.utils';
import { MasteryProgress } from './MasteryProgress';

interface OverallMasteryCardProps {
  summary: MasterySummaryDto;
}

export const OverallMasteryCard: React.FC<OverallMasteryCardProps> = ({ summary }) => {
  const {
    overallMastery,
    masteryLevel,
    totalConcepts,
    conceptsStarted,
    conceptsCompleted,
    questionsAnswered,
    retrySuccesses,
    transferSuccesses,
  } = summary;

  const totalFollowUps = retrySuccesses + transferSuccesses;

  return (
    <div
      className="glass overall-mastery-card"
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        borderRadius: '24px',
        marginBottom: '2rem',
      }}
      data-testid="overall-mastery-card"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span
            style={{
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
            }}
          >
            Learning Summary
          </span>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: '0.25rem 0 0',
            }}
          >
            Overall Mastery
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            className={`badge ${getLevelBadgeClass(masteryLevel)}`}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
            data-testid="overall-mastery-level"
          >
            {getLevelLabel(masteryLevel)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center',
        }}
      >
        {/* Big percentage score display */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.25rem',
            }}
          >
            <span
              style={{
                fontSize: '3.5rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                lineHeight: 1,
              }}
              data-testid="overall-mastery-score"
            >
              {overallMastery}%
            </span>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <MasteryProgress score={overallMastery} height={12} label="Overall Mastery" />
          </div>
        </div>

        {/* Metrics summary list */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.7)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Concepts
            </div>
            <div
              style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
              data-testid="metric-concepts"
            >
              {conceptsStarted} / {totalConcepts}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              {conceptsCompleted} Proficient
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Questions
            </div>
            <div
              style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
              data-testid="metric-questions"
            >
              {questionsAnswered}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Answered</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Follow-ups
            </div>
            <div
              style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
              data-testid="metric-followups"
            >
              {totalFollowUps}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              {retrySuccesses} Retries, {transferSuccesses} Transfers
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
