import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import * as profileApi from './api';
import type { ProfileFormData, StudentProfile } from './profile.types';
import { ProfileCard } from './ProfileCard';
import { ProfileForm } from './ProfileForm';

export const ProfilePage: React.FC = () => {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFieldErrors, setSaveFieldErrors] = useState<Record<string, string> | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch Profile
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await profileApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      setFetchError(
        err.message || "Couldn't load your profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle Save
  const handleSave = async (formData: ProfileFormData) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveFieldErrors(undefined);
    setSuccessMessage(null);

    try {
      const res = await profileApi.updateProfile(formData);
      setProfile(res.profile);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully');

      // Clear success banner automatically after 4 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setSaveError(
        err.message || "Couldn't update your profile. Please try again."
      );
      if (err.errors) {
        setSaveFieldErrors(err.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixxy-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* FIXXY Navigation Header */}
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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
                color: 'var(--color-button-primary)',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '2px solid var(--color-button-primary)',
                paddingBottom: '2px',
              }}
              aria-current="page"
            >
              Profile
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
          maxWidth: '1120px',
          width: '100%',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
        }}
      >
        {/* Success Feedback Alert */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="alert alert-success"
            id="profile-success-alert"
            style={{ marginBottom: '1.5rem' }}
          >
            <span aria-hidden="true">✓</span>
            <span style={{ fontWeight: 600 }}>{successMessage}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
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
          >
            <div className="fixxy-spinner" aria-hidden="true" />
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
              }}
            >
              Loading your profile...
            </p>
          </div>
        )}

        {/* Fetch Error State */}
        {!isLoading && fetchError && (
          <div
            role="alert"
            aria-live="assertive"
            className="glass"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              maxWidth: '560px',
              margin: '2rem auto',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-error)',
                marginBottom: '0.5rem',
              }}
            >
              {fetchError}
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.5rem',
              }}
            >
              We encountered an issue communicating with the FIXXY server.
            </p>
            <button
              id="retry-fetch-btn"
              type="button"
              onClick={loadProfile}
              className="primary-button"
              style={{ maxWidth: '200px', margin: '0 auto' }}
            >
              🔄 Try Again
            </button>
          </div>
        )}

        {/* Loaded Profile Content */}
        {!isLoading && !fetchError && profile && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isEditing ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            {/* View Mode: Left Profile Card */}
            {!isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <ProfileCard
                  profile={profile}
                  studentEmail={student?.email}
                  onEdit={() => setIsEditing(true)}
                />

                {/* Account Details Glass Box */}
                <div
                  className="glass"
                  style={{
                    padding: '1.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--color-text-muted)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Identity & Security
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Student ID</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {student?.id ? `${student.id.slice(0, 8)}...${student.id.slice(-6)}` : 'Verified'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Session Security</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active (HttpOnly)</span>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: Right Learning Preferences & AI Tutor Section */}
            {!isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <section
                  aria-labelledby="learning-preferences-heading"
                  className="glass"
                  style={{ padding: '2.25rem 2rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h2
                        id="learning-preferences-heading"
                        style={{
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          color: 'var(--color-text-primary)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        Learning Preferences
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        How FIXXY customizes explanation depth, questions, and examples
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-button-primary)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      aria-label="Edit preferences"
                    >
                      Customize →
                    </button>
                  </div>

                  <div className="info-grid" style={{ marginTop: 0 }}>
                    {/* Learning Level Card */}
                    <div className="info-card">
                      <div className="info-card-icon">📊</div>
                      <div className="info-card-title">Learning Level</div>
                      <div className="info-card-value">
                        {profile.learningLevel === 'BEGINNER' && 'Beginner'}
                        {profile.learningLevel === 'INTERMEDIATE' && 'Intermediate'}
                        {profile.learningLevel === 'ADVANCED' && 'Advanced'}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        {profile.learningLevel === 'BEGINNER' && 'Focuses on intuitive concepts & foundational ML ideas.'}
                        {profile.learningLevel === 'INTERMEDIATE' && 'Bridges intuition with algorithms and code exercises.'}
                        {profile.learningLevel === 'ADVANCED' && 'In-depth mathematical proofs, gradients, and edge cases.'}
                      </p>
                    </div>

                    {/* Preferred Learning Style Card */}
                    <div className="info-card">
                      <div className="info-card-icon">🧠</div>
                      <div className="info-card-title">Preferred Style</div>
                      <div className="info-card-value">
                        {profile.preferredLearningStyle === 'TEXT' && 'Text & Concepts'}
                        {profile.preferredLearningStyle === 'VISUAL' && 'Visuals & Charts'}
                        {profile.preferredLearningStyle === 'EXAMPLE_BASED' && 'Real-World Examples'}
                        {profile.preferredLearningStyle === 'ANALOGY' && 'Intuitive Analogies'}
                        {profile.preferredLearningStyle === 'PRACTICE' && 'Hands-on Practice'}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        Adaptive explanations prioritize this presentation format.
                      </p>
                    </div>

                    {/* Language Card */}
                    <div className="info-card">
                      <div className="info-card-icon">🌍</div>
                      <div className="info-card-title">Language</div>
                      <div className="info-card-value">{profile.preferredLanguage}</div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        Teaching dialogues and prompts will be rendered in {profile.preferredLanguage}.
                      </p>
                    </div>

                    {/* Current Goal Card */}
                    <div className="info-card" style={{ gridColumn: '1 / -1' }}>
                      <div className="info-card-icon">🎯</div>
                      <div className="info-card-title">Learning Goal</div>
                      <div
                        className="info-card-value"
                        style={{
                          fontSize: '1rem',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          marginTop: '0.25rem',
                          color: profile.learningGoal ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                          fontStyle: profile.learningGoal ? 'normal' : 'italic',
                        }}
                      >
                        {profile.learningGoal || 'No learning goal set yet. Set a goal in Edit Profile!'}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Adaptive Tutor Integration Preview */}
                <div
                  className="glass"
                  style={{
                    padding: '1.75rem 2rem',
                    background: 'rgba(255, 255, 255, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(25, 54, 80, 0.1), rgba(61, 90, 122, 0.15))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      flexShrink: 0,
                    }}
                  >
                    ✨
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                      Adaptive AI Diagnosis Ready
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      When you answer questions in Module 4 & 5, FIXXY will calibrate misconceptions against your{' '}
                      <strong>{profile.learningLevel}</strong> level and formulate tutor responses using{' '}
                      <strong>{profile.preferredLearningStyle}</strong> mode.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mode: Form replaces or displays across */}
            {isEditing && (
              <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
                <ProfileForm
                  initialProfile={profile}
                  isSaving={isSaving}
                  serverError={saveError}
                  serverFieldErrors={saveFieldErrors}
                  onSave={handleSave}
                  onCancel={() => {
                    setIsEditing(false);
                    setSaveError(null);
                    setSaveFieldErrors(undefined);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
