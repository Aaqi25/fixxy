import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import * as curriculumApi from './api';
import type { ConceptSummary, LearningPathNode } from './curriculum.types';
import { ConceptCard } from './ConceptCard';
import { LearningPath } from './LearningPath';

export const CurriculumPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [concepts, setConcepts] = useState<ConceptSummary[]>([]);
  const [learningPath, setLearningPath] = useState<LearningPathNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurriculum = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [conceptsData, pathData] = await Promise.all([
        curriculumApi.getConcepts(),
        curriculumApi.getLearningPath().catch(() => [] as LearningPathNode[]),
      ]);
      setConcepts(conceptsData);
      setLearningPath(pathData);
    } catch (err: any) {
      setError(err.message || "Couldn't load the curriculum. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Map of prerequisites by concept slug for the cards
  const prereqMap = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of learningPath) {
      if (node.prerequisites && node.prerequisites.length > 0) {
        map.set(
          node.slug,
          node.prerequisites.map((p) => p.title)
        );
      }
    }
    return map;
  }, [learningPath]);

  return (
    <div className="fixxy-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Glass Navigation Bar */}
      <header className="dashboard-header" role="banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/"
            className="dashboard-nav-brand"
            style={{ textDecoration: 'none' }}
            aria-label="FIXXY Home"
          >
            FIXXY
          </Link>

          <nav aria-label="Main Navigation" style={{ display: 'flex', gap: '1rem' }}>
            <Link
              to="/"
              className="auth-link"
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className="auth-link"
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Profile
            </Link>
            <Link
              to="/curriculum"
              className="auth-link"
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-button-primary)',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '2px solid var(--color-button-primary)',
                paddingBottom: '2px',
              }}
              aria-current="page"
            >
              Curriculum
            </Link>
          </nav>
        </div>

        <button
          id="logout-button"
          type="button"
          className="logout-button"
          onClick={handleLogout}
          aria-label="Sign out of FIXXY"
        >
          ↩ Sign out
        </button>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1120px',
          width: '100%',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
        }}
      >
        {/* Page Hero Header */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom: '0.5rem',
            }}
          >
            Your Learning Path
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              lineHeight: 1.5,
            }}
          >
            Explore core machine learning concepts, understand common misconceptions, and build rock-solid foundational intuition.
          </p>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div
            id="curriculum-loading-state"
            className="glass"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
            }}
            role="status"
            aria-live="polite"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(25, 54, 80, 0.15)',
                borderTopColor: 'var(--color-button-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
              Loading your curriculum...
            </p>
          </div>
        )}

        {/* API Error State */}
        {!isLoading && error && (
          <div
            id="curriculum-error-state"
            className="glass"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              border: '1px solid rgba(198, 42, 71, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
            }}
            role="alert"
          >
            <div style={{ fontSize: '2.5rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>
              Couldn't load the curriculum.
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem', maxWidth: '480px' }}>
              {error}
            </p>
            <button
              id="retry-curriculum-button"
              type="button"
              onClick={loadCurriculum}
              className="primary-button"
              style={{
                marginTop: '0.5rem',
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && concepts.length === 0 && (
          <div
            id="curriculum-empty-state"
            className="glass"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
            role="status"
          >
            <div style={{ fontSize: '3rem' }}>📚</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              No learning content is available yet.
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem', maxWidth: '440px' }}>
              Check back soon as new concepts and learning paths are added.
            </p>
          </div>
        )}

        {/* Content Loaded */}
        {!isLoading && !error && concepts.length > 0 && (
          <>
            {/* Visual Learning Path */}
            {learningPath.length > 0 && <LearningPath nodes={learningPath} />}

            {/* Concepts Catalog Grid */}
            <section aria-labelledby="all-concepts-heading">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                }}
              >
                <h2
                  id="all-concepts-heading"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Core Concepts
                </h2>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {concepts.length} {concepts.length === 1 ? 'concept' : 'concepts'} available
                </span>
              </div>

              <div
                className="concepts-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {concepts.map((concept) => (
                  <ConceptCard
                    key={concept.id}
                    concept={concept}
                    prerequisiteNames={prereqMap.get(concept.slug)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
