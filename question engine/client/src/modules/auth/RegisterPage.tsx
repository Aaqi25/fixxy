import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (error) clearError();
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const n = name.trim();
    const e = email.trim();
    if (!n) errors.name = 'Name is required';
    else if (n.length < 2) errors.name = 'Name must be at least 2 characters';
    if (!e) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      errors.password = 'Password must contain at least one letter and one number';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password, confirmPassword);
      navigate('/', { replace: true });
    } catch {
      // Error is displayed from AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const passwordStrength = (): { label: string; color: string } | null => {
    if (!password) return null;
    if (password.length < 8) return { label: 'Too short', color: '#c62a47' };
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return { label: 'Add a number and letter', color: '#d97706' };
    if (password.length >= 12 && /[!@#$%^&*]/.test(password))
      return { label: 'Strong', color: '#1a7245' };
    return { label: 'Good', color: '#2563eb' };
  };

  const strength = passwordStrength();

  return (
    <div className="fixxy-page auth-page">
      {/* Brand */}
      <div className="auth-brand">
        <h1 className="auth-brand-title">FIXXY</h1>
        <p className="auth-brand-tagline">Your adaptive AI/ML tutor</p>
      </div>

      {/* Card */}
      <div className="glass auth-card">
        <h2 className="auth-card-title">Create your account</h2>
        <p className="auth-card-subtitle">Start your personalized learning journey</p>

        {/* Server error banner */}
        {error && (
          <div className="alert alert-error" role="alert" aria-live="polite">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">Name</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              className={`form-input${fieldErrors.name ? ' input-error' : ''}`}
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
              disabled={submitting}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p id="name-error" className="form-field-error" role="alert">
                <span aria-hidden="true">↑</span> {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="register-email" className="form-label">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
              disabled={submitting}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p id="reg-email-error" className="form-field-error" role="alert">
                <span aria-hidden="true">↑</span> {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="register-password" className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-input${fieldErrors.password ? ' input-error' : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                disabled={submitting}
                style={{ paddingRight: '2.75rem' }}
                aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={submitting}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6b8ba4',
                  fontSize: '0.85rem', padding: '0.25rem', lineHeight: 1,
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            {strength && !fieldErrors.password && (
              <p id="password-hint" style={{ fontSize: '0.78rem', color: strength.color, marginTop: '0.35rem' }}>
                Password strength: {strength.label}
              </p>
            )}
            {fieldErrors.password && (
              <p id="password-error" className="form-field-error" role="alert">
                <span aria-hidden="true">↑</span> {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="register-confirm" className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="register-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`form-input${fieldErrors.confirmPassword ? ' input-error' : ''}`}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                disabled={submitting}
                style={{ paddingRight: '2.75rem' }}
                aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                disabled={submitting}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6b8ba4',
                  fontSize: '0.85rem', padding: '0.25rem', lineHeight: 1,
                }}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p id="confirm-error" className="form-field-error" role="alert">
                <span aria-hidden="true">↑</span> {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            className="primary-button"
            disabled={submitting}
            aria-label="Create your FIXXY account"
          >
            {submitting ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
