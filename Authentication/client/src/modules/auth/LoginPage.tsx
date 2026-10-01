import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  // Clear server errors when user types
  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (error) clearError();
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
  };
  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (error) clearError();
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch {
      // Error is set in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixxy-page auth-page">
      {/* Brand */}
      <div className="auth-brand">
        <h1 className="auth-brand-title">FIXXY</h1>
        <p className="auth-brand-tagline">Learn from every mistake</p>
      </div>

      {/* Card */}
      <div className="glass auth-card">
        <h2 className="auth-card-title">Welcome back</h2>
        <p className="auth-card-subtitle">Sign in to continue your learning journey</p>

        {/* Server error banner */}
        {error && (
          <div className="alert alert-error" role="alert" aria-live="polite">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
              placeholder="student@example.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={submitting}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p id="email-error" className="form-field-error" role="alert">
                <span aria-hidden="true">↑</span> {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`form-input${fieldErrors.password ? ' input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={submitting}
                style={{ paddingRight: '2.75rem' }}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
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
            {fieldErrors.password && (
              <p id="password-error" className="form-field-error" role="alert">
                <span aria-hidden="true">↑</span> {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="primary-button"
            disabled={submitting}
            aria-label="Sign in to FIXXY"
          >
            {submitting ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in to FIXXY'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
