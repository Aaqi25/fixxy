import React from 'react';
import type { RecentActivityItemDto } from './mastery.types';
import { formatRelativeTime } from './mastery.utils';
import { Link } from 'react-router-dom';

interface RecentActivityProps {
  activity: RecentActivityItemDto[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activity }) => {
  return (
    <div
      className="glass recent-activity-card"
      style={{
        padding: '1.75rem',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        height: '100%',
      }}
      data-testid="recent-activity-section"
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
          Recent Activity
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {activity.length} event{activity.length === 1 ? '' : 's'}
        </span>
      </div>

      {activity.length === 0 ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
          }}
        >
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No recent learning activity yet.</p>
          <Link
            to="/curriculum"
            style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}
          >
            Explore curriculum to start learning →
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {activity.map((item) => {
            const isCorrect = item.isCorrect;
            const icon = isCorrect ? '✓' : '•';
            const iconBg = isCorrect ? 'rgba(22, 163, 74, 0.15)' : 'rgba(217, 119, 6, 0.15)';
            const iconColor = isCorrect ? '#16a34a' : '#d97706';

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                }}
                data-testid={`activity-item-${item.id}`}
              >
                {/* Status Indicator Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: iconBg,
                    color: iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.conceptTitle}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                    {item.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
