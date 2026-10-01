import React, { useState } from 'react';
import type {
  LearningLevel,
  LearningStyle,
  ProfileFormData,
  ProfileFormErrors,
  StudentProfile,
} from './profile.types';
import { validateProfileForm } from './profile.validation';

interface ProfileFormProps {
  initialProfile: StudentProfile;
  isSaving: boolean;
  serverError: string | null;
  serverFieldErrors?: Record<string, string>;
  onSave: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialProfile,
  isSaving,
  serverError,
  serverFieldErrors,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: initialProfile.displayName || '',
    bio: initialProfile.bio || '',
    learningLevel: initialProfile.learningLevel || 'BEGINNER',
    learningGoal: initialProfile.learningGoal || '',
    preferredLearningStyle: initialProfile.preferredLearningStyle || 'TEXT',
    preferredLanguage: initialProfile.preferredLanguage || 'English',
    avatarUrl: initialProfile.avatarUrl || '',
  });

  const [clientErrors, setClientErrors] = useState<ProfileFormErrors>({});

  const handleChange = (
    field: keyof ProfileFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field errors as user types
    if (clientErrors[field]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Validate client-side
    const errors = validateProfileForm(formData);
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors({});
    await onSave(formData);
  };

  // Combine client and server errors for field display
  const getFieldError = (field: keyof ProfileFormData): string | undefined => {
    return clientErrors[field] || serverFieldErrors?.[field];
  };

  return (
    <form
      id="profile-form"
      onSubmit={handleSubmit}
      noValidate
      className="glass"
      style={{
        padding: '2.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ marginBottom: '0.5rem' }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: '0.25rem',
          }}
        >
          Edit Student Profile
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Update your public profile and AI tutoring preferences.
        </p>
      </div>

      {/* Global Server Error Banner */}
      {serverError && (
        <div
          role="alert"
          aria-live="polite"
          className="alert alert-error"
          id="profile-form-error"
        >
          <span>⚠️</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* 1. Display Name */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="displayName" className="form-label">
          Display Name <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          maxLength={100}
          value={formData.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          placeholder="e.g. Ada Lovelace"
          className={`form-input ${getFieldError('displayName') ? 'input-error' : ''}`}
          disabled={isSaving}
          aria-invalid={!!getFieldError('displayName')}
          aria-describedby={getFieldError('displayName') ? 'displayName-error' : undefined}
        />
        {getFieldError('displayName') && (
          <p id="displayName-error" className="form-field-error" role="alert">
            {getFieldError('displayName')}
          </p>
        )}
      </div>

      {/* 2. Bio */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="bio" className="form-label">
            Bio
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formData.bio.length}/500
          </span>
        </div>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Tell FIXXY about your background and interests..."
          className={`form-input ${getFieldError('bio') ? 'input-error' : ''}`}
          disabled={isSaving}
          style={{ resize: 'vertical', minHeight: '75px' }}
          aria-invalid={!!getFieldError('bio')}
          aria-describedby={getFieldError('bio') ? 'bio-error' : undefined}
        />
        {getFieldError('bio') && (
          <p id="bio-error" className="form-field-error" role="alert">
            {getFieldError('bio')}
          </p>
        )}
      </div>

      {/* 3 & 4: Learning Level and Preferred Learning Style in a responsive 2-column row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Learning Level */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="learningLevel" className="form-label">
            Learning Level <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            id="learningLevel"
            name="learningLevel"
            value={formData.learningLevel}
            onChange={(e) => handleChange('learningLevel', e.target.value as LearningLevel)}
            className={`form-input ${getFieldError('learningLevel') ? 'input-error' : ''}`}
            disabled={isSaving}
            aria-invalid={!!getFieldError('learningLevel')}
            aria-describedby={getFieldError('learningLevel') ? 'learningLevel-error' : undefined}
          >
            <option value="BEGINNER">Beginner (Foundations & Core Intuition)</option>
            <option value="INTERMEDIATE">Intermediate (Practical Application)</option>
            <option value="ADVANCED">Advanced (Mathematical Rigor & Architecture)</option>
          </select>
          {getFieldError('learningLevel') && (
            <p id="learningLevel-error" className="form-field-error" role="alert">
              {getFieldError('learningLevel')}
            </p>
          )}
        </div>

        {/* Preferred Learning Style */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="preferredLearningStyle" className="form-label">
            Preferred Learning Style <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            id="preferredLearningStyle"
            name="preferredLearningStyle"
            value={formData.preferredLearningStyle}
            onChange={(e) => handleChange('preferredLearningStyle', e.target.value as LearningStyle)}
            className={`form-input ${getFieldError('preferredLearningStyle') ? 'input-error' : ''}`}
            disabled={isSaving}
            aria-invalid={!!getFieldError('preferredLearningStyle')}
            aria-describedby={getFieldError('preferredLearningStyle') ? 'preferredLearningStyle-error' : undefined}
          >
            <option value="TEXT">Text & Conceptual Descriptions</option>
            <option value="VISUAL">Visual & Diagrams</option>
            <option value="EXAMPLE_BASED">Real-world Examples</option>
            <option value="ANALOGY">Everyday Analogies</option>
            <option value="PRACTICE">Hands-on Practice & Exercises</option>
          </select>
          {getFieldError('preferredLearningStyle') && (
            <p id="preferredLearningStyle-error" className="form-field-error" role="alert">
              {getFieldError('preferredLearningStyle')}
            </p>
          )}
        </div>
      </div>

      {/* 5. Learning Goal */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="learningGoal" className="form-label">
            Learning Goal
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formData.learningGoal.length}/500
          </span>
        </div>
        <input
          id="learningGoal"
          name="learningGoal"
          type="text"
          maxLength={500}
          value={formData.learningGoal}
          onChange={(e) => handleChange('learningGoal', e.target.value)}
          placeholder="e.g. Master Bias-Variance tradeoff and prepare for ML engineer interviews"
          className={`form-input ${getFieldError('learningGoal') ? 'input-error' : ''}`}
          disabled={isSaving}
          aria-invalid={!!getFieldError('learningGoal')}
          aria-describedby={getFieldError('learningGoal') ? 'learningGoal-error' : undefined}
        />
        {getFieldError('learningGoal') && (
          <p id="learningGoal-error" className="form-field-error" role="alert">
            {getFieldError('learningGoal')}
          </p>
        )}
      </div>

      {/* 6 & 7: Preferred Language & Avatar URL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Preferred Language */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="preferredLanguage" className="form-label">
            Preferred Language <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            id="preferredLanguage"
            name="preferredLanguage"
            value={formData.preferredLanguage}
            onChange={(e) => handleChange('preferredLanguage', e.target.value)}
            className={`form-input ${getFieldError('preferredLanguage') ? 'input-error' : ''}`}
            disabled={isSaving}
            aria-invalid={!!getFieldError('preferredLanguage')}
            aria-describedby={getFieldError('preferredLanguage') ? 'preferredLanguage-error' : undefined}
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish (Español)</option>
            <option value="French">French (Français)</option>
            <option value="German">German (Deutsch)</option>
            <option value="Hindi">Hindi (हिन्दी)</option>
            <option value="Mandarin">Mandarin (中文)</option>
            <option value="Japanese">Japanese (日本語)</option>
            <option value="Portuguese">Portuguese (Português)</option>
          </select>
          {getFieldError('preferredLanguage') && (
            <p id="preferredLanguage-error" className="form-field-error" role="alert">
              {getFieldError('preferredLanguage')}
            </p>
          )}
        </div>

        {/* Avatar URL */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="avatarUrl" className="form-label">
            Avatar URL (Optional)
          </label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            maxLength={2048}
            value={formData.avatarUrl}
            onChange={(e) => handleChange('avatarUrl', e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className={`form-input ${getFieldError('avatarUrl') ? 'input-error' : ''}`}
            disabled={isSaving}
            aria-invalid={!!getFieldError('avatarUrl')}
            aria-describedby={getFieldError('avatarUrl') ? 'avatarUrl-error' : undefined}
          />
          {getFieldError('avatarUrl') && (
            <p id="avatarUrl-error" className="form-field-error" role="alert">
              {getFieldError('avatarUrl')}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '1rem',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(32, 70, 115, 0.1)',
        }}
      >
        <button
          id="cancel-profile-btn"
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(25, 54, 80, 0.08)',
            border: '1px solid rgba(25, 54, 80, 0.15)',
            borderRadius: '12px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            fontFamily: 'inherit',
            color: 'var(--color-text-primary)',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
          aria-label="Cancel editing profile"
        >
          Cancel
        </button>

        <button
          id="save-profile-btn"
          type="submit"
          disabled={isSaving}
          className="primary-button"
          style={{
            width: 'auto',
            minWidth: '160px',
            margin: 0,
          }}
          aria-label="Save changes to profile"
        >
          {isSaving ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              <span>Saving changes...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </form>
  );
};
