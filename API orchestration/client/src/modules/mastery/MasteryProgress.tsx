import React from 'react';
import { getProgressGradient } from './mastery.utils';

interface MasteryProgressProps {
  score: number;
  label?: string;
  showLabel?: boolean;
  height?: number;
  className?: string;
}

export const MasteryProgress: React.FC<MasteryProgressProps> = ({
  score,
  label = 'Mastery Progress',
  showLabel = false,
  height = 10,
  className = '',
}) => {
  const safeScore = Math.min(100, Math.max(0, isNaN(score) ? 0 : score));
  const gradient = getProgressGradient(safeScore);

  return (
    <div className={`mastery-progress-container ${className}`} style={{ width: '100%' }}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.35rem',
            fontSize: '0.85rem',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{safeScore}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={safeScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: 'rgba(32, 70, 115, 0.08)',
          borderRadius: `${height / 2}px`,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            width: `${safeScore}%`,
            height: '100%',
            background: gradient,
            borderRadius: `${height / 2}px`,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};
