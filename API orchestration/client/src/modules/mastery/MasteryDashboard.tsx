import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getOverallMastery,
  getConceptMasteries,
  getRecentActivity,
  getLearningInsights,
} from './api';
import type {
  MasterySummaryDto,
  ConceptMasteryDto,
  RecentActivityItemDto,
  LearningInsightDto,
  DashboardStatus,
} from './mastery.types';
import { OverallMasteryCard } from './OverallMasteryCard';
import { ConceptMasteryCard } from './ConceptMasteryCard';
import { RecentActivity } from './RecentActivity';
import { LearningInsights } from './LearningInsights';
import { MasteryEmptyState } from './MasteryEmptyState';
import { MasteryErrorState } from './MasteryErrorState';

export const MasteryDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<DashboardStatus>('INITIAL_LOADING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [summary, setSummary] = useState<MasterySummaryDto | null>(null);
  const [concepts, setConcepts] = useState<ConceptMasteryDto[]>([]);
  const [activity, setActivity] = useState<RecentActivityItemDto[]>([]);
  const [insights, setInsights] = useState<LearningInsightDto[]>([]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const loadDashboardData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setStatus('REFRESHING');
    } else {
      setStatus('INITIAL_LOADING');
    }
    setErrorMessage('');

    try {
      const [summaryData, conceptsData, activityData, insightsData] = await Promise.all([
        getOverallMastery(),
        getConceptMasteries(),
        getRecentActivity(10),
        getLearningInsights(),
      ]);

      setSummary(summaryData);
      setConcepts(conceptsData);
      setActivity(activityData);
      setInsights(insightsData);

      // Check if student has zero activity
      if (summaryData.totalAttempts === 0 && summaryData.overallMastery === 0) {
        setStatus('EMPTY');
      } else {
        setStatus('LOADED');
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't load your learning progress.");
      setStatus('ERROR');
    }
  }, []);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  return (
    <div className="fixxy-page" style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      {/* Top navigation bar */}
      <header className="dashboard-header">
        <Link
          to="/mastery"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="dashboard-nav-brand"
        >
          FIXXY
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            to="/mastery"
            className="auth-link"
            style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-button-primary)' }}
          >
            Dashboard
          </Link>
          <Link to="/curriculum" className="auth-link" style={{ fontSize: '0.875rem' }}>
            Curriculum
          </Link>
          <Link to="/profile" className="auth-link" style={{ fontSize: '0.875rem' }}>
            Profile
          </Link>
          <button
            id="logout-button"
            className="logout-button"
            onClick={handleLogout}
            aria-label="Sign out of FIXXY"
          >
            ↩ Sign out
          </button>
        </nav>
      </header>

      {/* Main Dashboard Content */}
      <main
        className="dashboard-content"
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          width: '100%',
        }}
      >
        {/* Header Title & Refresh Action */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
              data-testid="mastery-dashboard-title"
            >
              Your Learning Progress
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Real-time concept mastery derived from practice, retry, and transfer evidence.
            </p>
          </div>

          <button
            onClick={() => loadDashboardData(true)}
            disabled={status === 'INITIAL_LOADING' || status === 'REFRESHING'}
            className="btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
            }}
            data-testid="refresh-dashboard-button"
            aria-label="Refresh learning progress"
          >
            🔄 {status === 'REFRESHING' ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        {/* Status: INITIAL LOADING SKELETON */}
        {status === 'INITIAL_LOADING' && (
          <div
            className="glass"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              borderRadius: '24px',
              margin: '2rem 0',
            }}
            data-testid="mastery-loading-state"
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid rgba(32, 70, 115, 0.1)',
                borderTopColor: 'var(--color-button-primary)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.25rem',
              }}
            />
            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Loading your learning progress...
            </p>
          </div>
        )}

        {/* Status: ERROR STATE */}
        {status === 'ERROR' && (
          <MasteryErrorState
            message={errorMessage}
            onRetry={() => loadDashboardData(false)}
          />
        )}

        {/* Status: EMPTY STATE */}
        {status === 'EMPTY' && <MasteryEmptyState />}

        {/* Status: LOADED / REFRESHING */}
        {(status === 'LOADED' || status === 'REFRESHING') && summary && (
          <div>
            {/* 1. Overall Mastery Card */}
            <OverallMasteryCard summary={summary} />

            {/* 2. Concept Mastery Cards Section */}
            <section style={{ marginBottom: '2.5rem' }} data-testid="concepts-section">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  Concept Mastery
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {concepts.length} Concept{concepts.length === 1 ? '' : 's'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {concepts.map((concept) => (
                  <ConceptMasteryCard key={concept.conceptId} concept={concept} />
                ))}
              </div>
            </section>

            {/* 3. Recent Activity & Learning Insights Section */}
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              <RecentActivity activity={activity} />
              <LearningInsights insights={insights} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
