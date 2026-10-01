import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import * as curriculumApi from './api';
import type { ConceptDetail } from './curriculum.types';
import {
  formatDifficulty,
  formatDisplayOrder,
  formatMinutes,
  getContentSectionMeta,
} from './curriculum.utils';

export const ConceptDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [concept, setConcept] = useState<ConceptDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [learningNotice, setLearningNotice] = useState<string | null>(null);

  const loadConcept = useCallback(async () => {
    if (!slug) {
      setIsNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setError(null);
    try {
      const data = await curriculumApi.getConceptBySlug(slug);
      setConcept(data);
    } catch (err: any) {
      if (err.status === 404) {
        setIsNotFound(true);
      } else {
        setError(err.message || "Couldn't load concept details. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadConcept();
  }, [loadConcept]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleStartLearning = () => {
    setLearningNotice(
      `You're ready to practice ${concept?.title}! The Question Engine & Adaptive Diagnosis flow connects here in Module 4.`
    );
    if (slug) {
      navigate(`/learn/${slug}`);
    }
  };

  // 404 Not Found State
  if (!isLoading && isNotFound) {
    return (
      <div className="fixxy-page not-found-page" style={{ minHeight: '100vh' }}>
        <div className="glass not-found-card" role="region" aria-label="Concept Not Found">
          <div className="not-found-code" aria-label="Error 404">
            404
          </div>
          <h1 className="not-found-title">Concept Not Found</h1>
          <p className="not-found-subtitle">
            The concept "{slug}" doesn't exist in the FIXXY curriculum catalog.
          </p>
          <Link
            to="/curriculum"
            id="back-to-curriculum-404"
            className="primary-button"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            ← Back to Curriculum
          </Link>
        </div>
      </div>
    );
  }

  const difficulty = concept ? formatDifficulty(concept.difficultyLevel) : null;

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

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          maxWidth: '860px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/curriculum"
            id="back-to-curriculum-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-button-primary)',
              textDecoration: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
            }}
          >
            ← Back to Curriculum
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            id="concept-detail-loading"
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
              Loading concept details...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            id="concept-detail-error"
            className="glass"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              border: '1px solid rgba(198, 42, 71, 0.3)',
            }}
            role="alert"
          >
            <div style={{ fontSize: '2.5rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>
              Couldn't load concept details.
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem' }}>{error}</p>
            <button
              id="retry-concept-detail-button"
              type="button"
              onClick={loadConcept}
              className="primary-button"
              style={{ marginTop: '0.5rem', padding: '0.625rem 1.5rem', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Concept Loaded */}
        {!isLoading && !error && concept && (
          <article aria-labelledby="concept-main-title">
            {/* Concept Hero Header Card */}
            <div
              className="glass"
              style={{
                padding: '2.25rem 2rem',
                marginBottom: '1.75rem',
                borderRadius: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--color-button-primary)',
                    padding: '0.2rem 0.6rem',
                    backgroundColor: 'rgba(25, 54, 80, 0.08)',
                    borderRadius: '8px',
                  }}
                >
                  Step {formatDisplayOrder(concept.displayOrder)}
                </span>
                {difficulty && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.65rem',
                      borderRadius: '8px',
                      ...difficulty.badgeStyle,
                    }}
                  >
                    {difficulty.label}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(32, 70, 115, 0.08)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  ⏱ {formatMinutes(concept.estimatedMinutes)}
                </span>
              </div>

              <h1
                id="concept-main-title"
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.025em',
                  marginBottom: '1rem',
                  lineHeight: 1.25,
                }}
              >
                {concept.title}
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {concept.description || concept.shortDescription}
              </p>
            </div>

            {/* "What you'll learn" Card */}
            <section
              aria-labelledby="learning-objective-heading"
              className="glass"
              style={{
                padding: '1.75rem 2rem',
                marginBottom: '1.75rem',
                borderRadius: '20px',
                borderLeft: '4px solid var(--color-button-primary)',
                background: 'rgba(255, 255, 255, 0.72)',
              }}
            >
              <h2
                id="learning-objective-heading"
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-button-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🎯</span> What you'll learn
              </h2>
              <p
                id="concept-learning-objective"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.5,
                }}
              >
                {concept.learningObjective}
              </p>
            </section>

            {/* Curated Content Sections */}
            <section aria-label="Curated Content Sections" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {concept.content.map((item) => {
                  const meta = getContentSectionMeta(item.contentType);
                  return (
                    <div
                      key={item.id}
                      className="glass"
                      style={{
                        padding: '1.75rem 2rem',
                        borderRadius: '20px',
                        background: meta.bgTint !== 'transparent' ? meta.bgTint : undefined,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
                        <h2
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: meta.accentColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {meta.label}
                        </h2>
                      </div>

                      <h3
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {item.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.95rem',
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.65,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {item.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Prerequisites Section */}
            <section
              aria-labelledby="prerequisites-heading"
              className="glass"
              style={{
                padding: '1.75rem 2rem',
                marginBottom: '2rem',
                borderRadius: '20px',
              }}
            >
              <h2
                id="prerequisites-heading"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🔗</span> Prerequisites
              </h2>

              {concept.prerequisites && concept.prerequisites.length > 0 ? (
                <ul
                  style={{
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {concept.prerequisites.map((p) => (
                    <li
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.9)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {p.title}
                      </span>
                      <Link
                        to={`/curriculum/${p.slug}`}
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: 'var(--color-button-primary)',
                          textDecoration: 'none',
                        }}
                      >
                        Review prerequisite →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: '#1a7245',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>✓</span> No prerequisites required — this is an introductory foundational concept!
                </div>
              )}
            </section>

            {/* Start Learning Action Card */}
            <div
              className="glass"
              style={{
                padding: '2rem',
                borderRadius: '20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Ready to practice {concept.title}?
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', maxWidth: '480px' }}>
                Test your understanding, identify common misconceptions, and build genuine mastery.
              </p>

              <button
                id="start-learning-button"
                type="button"
                onClick={handleStartLearning}
                className="primary-button"
                style={{
                  padding: '0.85rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px rgba(25, 54, 80, 0.2)',
                }}
              >
                Start Learning →
              </button>

              {learningNotice && (
                <div
                  id="learning-notice-banner"
                  role="status"
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(26, 114, 69, 0.1)',
                    border: '1px solid rgba(26, 114, 69, 0.3)',
                    color: '#1a7245',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    maxWidth: '560px',
                  }}
                >
                  {learningNotice}
                </div>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
};
