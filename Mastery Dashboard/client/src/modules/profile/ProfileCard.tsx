import React from 'react';
import type { StudentProfile } from './profile.types';

interface ProfileCardProps {
  profile: StudentProfile;
  studentEmail?: string;
  onEdit: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const STYLE_LABELS: Record<string, string> = {
  TEXT: 'Text / Reading',
  VISUAL: 'Visual & Diagrams',
  EXAMPLE_BASED: 'Example-Based',
  ANALOGY: 'Intuitive Analogies',
  PRACTICE: 'Hands-on Practice',
};

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  studentEmail,
  onEdit,
}) => {
  // Generate initials for avatar fallback
  const initials = profile.displayName
    ? profile.displayName
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'S';

  return (
    <section
      aria-labelledby="profile-card-heading"
      className="glass"
      style={{
        padding: '2.25rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glass glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(169, 204, 239, 0.4) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Avatar Container */}
      <div
        style={{
          width: '104px',
          height: '104px',
          borderRadius: '50%',
          padding: '4px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(169, 204, 239, 0.5))',
          boxShadow: '0 8px 24px rgba(32, 70, 115, 0.15)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={`${profile.displayName}'s avatar`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Gracefully fallback to initials on broken image URL
              (e.currentTarget as HTMLElement).style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'avatar-fallback';
                fallback.innerText = initials;
                fallback.style.cssText =
                  'width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#193650,#3d5a7a);color:white;font-weight:700;font-size:2rem;letter-spacing:-0.02em;';
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div
            aria-label={`${profile.displayName}'s avatar initials`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #193650 0%, #3d5a7a 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '2.1rem',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Display Name */}
      <h2
        id="profile-card-heading"
        style={{
          fontSize: '1.625rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '0.25rem',
          wordBreak: 'break-word',
        }}
      >
        {profile.displayName}
      </h2>

      {/* Student Email */}
      {studentEmail && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            marginBottom: '1rem',
          }}
        >
          {studentEmail}
        </p>
      )}

      {/* Bio */}
      <div
        style={{
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          color: profile.bio ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
          fontStyle: profile.bio ? 'normal' : 'italic',
          marginBottom: '1.5rem',
          padding: '0 0.5rem',
          maxWidth: '360px',
        }}
      >
        {profile.bio || 'No bio provided yet. Click edit to tell us about your ML journey!'}
      </div>

      {/* Badges / Quick stats */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
          marginBottom: '1.75rem',
          width: '100%',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: 'rgba(25, 54, 80, 0.08)',
            color: 'var(--color-button-primary)',
            border: '1px solid rgba(25, 54, 80, 0.12)',
          }}
        >
          🎯 {LEVEL_LABELS[profile.learningLevel] ?? profile.learningLevel}
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: 'rgba(26, 114, 69, 0.08)',
            color: 'var(--color-success)',
            border: '1px solid rgba(26, 114, 69, 0.15)',
          }}
        >
          💡 {STYLE_LABELS[profile.preferredLearningStyle] ?? profile.preferredLearningStyle}
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: 'rgba(61, 90, 122, 0.08)',
            color: 'var(--color-text-secondary)',
            border: '1px solid rgba(61, 90, 122, 0.15)',
          }}
        >
          🌐 {profile.preferredLanguage}
        </span>
      </div>

      {/* Edit Profile Action Button */}
      <button
        id="edit-profile-btn"
        type="button"
        onClick={onEdit}
        className="primary-button"
        style={{
          width: '100%',
          maxWidth: '260px',
          margin: '0 auto',
        }}
        aria-label="Edit student profile"
      >
        ✏️ Edit Profile
      </button>
    </section>
  );
};
