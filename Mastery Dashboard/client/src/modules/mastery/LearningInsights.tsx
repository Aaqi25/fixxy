import React from 'react';
import type { LearningInsightDto } from './mastery.types';
import { Link } from 'react-router-dom';

interface LearningInsightsProps {
  insights: LearningInsightDto[];
}

export const LearningInsights: React.FC<LearningInsightsProps> = ({ insights }) => {
  return (
    <div
      className="glass learning-insights-card"
      style={{
        padding: '1.75rem',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        height: '100%',
      }}
      data-testid="learning-insights-section"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Learning Insights
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Evidence-backed</span>
      </div>

      {insights.length === 0 ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
          }}
        >
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Complete practice and retry questions to generate personalized insights.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {insights.map((insight, idx) => {
            let borderColor = 'rgba(255, 255, 255, 0.7)';
            let statusBg = 'rgba(37, 99, 235, 0.1)';
            let statusColor = '#2563eb';
            let icon = '💡';

            if (insight.status === 'STRONG') {
              borderColor = 'rgba(22, 163, 74, 0.3)';
              statusBg = 'rgba(22, 163, 74, 0.1)';
              statusColor = '#16a34a';
              icon = '🌟';
            } else if (insight.status === 'NEEDS_REVIEW') {
              borderColor = 'rgba(217, 119, 6, 0.3)';
              statusBg = 'rgba(217, 119, 6, 0.1)';
              statusColor = '#d97706';
              icon = '🎯';
            } else if (insight.status === 'RECOMMENDED') {
              borderColor = 'rgba(147, 51, 234, 0.3)';
              statusBg = 'rgba(147, 51, 234, 0.1)';
              statusColor = '#9333ea';
              icon = '🚀';
            }

            return (
              <div
                key={idx}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start',
                }}
                data-testid={`insight-item-${insight.type.toLowerCase()}`}
              >
                <div style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '2px' }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.25rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {insight.title}
                    </span>
                    {insight.conceptSlug && (
                      <Link
                        to={`/curriculum/${insight.conceptSlug}`}
                        style={{
                          fontSize: '0.75rem',
                          color: statusColor,
                          backgroundColor: statusBg,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {insight.conceptTitle} →
                      </Link>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
