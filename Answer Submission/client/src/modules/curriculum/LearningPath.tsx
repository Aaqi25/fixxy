import React from 'react';
import { Link } from 'react-router-dom';
import type { LearningPathNode } from './curriculum.types';
import { formatDifficulty, formatDisplayOrder, formatMinutes } from './curriculum.utils';

interface LearningPathProps {
  nodes: LearningPathNode[];
}

export const LearningPath: React.FC<LearningPathProps> = ({ nodes }) => {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recommended Curriculum Learning Path"
      className="glass"
      style={{
        padding: '2rem 1.75rem',
        marginBottom: '2.5rem',
        borderRadius: '24px',
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🗺️</span> Recommended Learning Path
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Curriculum sequence and prerequisite relationships configured by the educational foundation.
        </p>
      </div>

      <div
        className="learning-path-flow"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          position: 'relative',
        }}
      >
        {nodes.map((node, index) => {
          const difficulty = formatDifficulty(node.difficultyLevel);
          const hasPrereqs = node.prerequisites && node.prerequisites.length > 0;

          return (
            <div
              key={node.id}
              className="learning-path-node-wrapper"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxShadow: '0 4px 16px rgba(32, 70, 115, 0.06)',
                  position: 'relative',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-button-primary)',
                        padding: '0.15rem 0.5rem',
                        backgroundColor: 'rgba(25, 54, 80, 0.08)',
                        borderRadius: '8px',
                      }}
                    >
                      Step {formatDisplayOrder(node.displayOrder)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '8px',
                        ...difficulty.badgeStyle,
                      }}
                    >
                      {difficulty.label}
                    </span>
                  </div>

                  <h4
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      marginBottom: '0.5rem',
                      lineHeight: 1.3,
                    }}
                  >
                    <Link
                      to={`/curriculum/${node.slug}`}
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      {node.title}
                    </Link>
                  </h4>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    ⏱ {formatMinutes(node.estimatedMinutes)}
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(32, 70, 115, 0.08)',
                    fontSize: '0.75rem',
                  }}
                >
                  {hasPrereqs ? (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Prerequisite: </span>
                      <strong style={{ color: 'var(--color-text-secondary)' }}>
                        {node.prerequisites.map((p) => p.title).join(', ')}
                      </strong>
                    </div>
                  ) : (
                    <div style={{ color: '#1a7245', fontWeight: 500 }}>
                      ✓ Foundation (Start here)
                    </div>
                  )}
                </div>
              </div>

              {index < nodes.length - 1 && (
                <div
                  className="learning-path-connector"
                  aria-hidden="true"
                  style={{
                    display: 'none', // Styled via CSS media query or flex arrow
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
