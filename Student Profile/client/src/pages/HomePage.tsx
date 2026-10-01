import { useAuth } from '../modules/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * HomePage — Protected dashboard displayed after login.
 * This is a placeholder that will be replaced by later modules.
 */
export function HomePage() {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const memberSince = student
    ? 'Module 1 — Authentication'
    : '';

  return (
    <div className="fixxy-page" style={{ minHeight: '100vh' }}>
      {/* Top navigation bar */}
      <header className="dashboard-header">
        <span className="dashboard-nav-brand">FIXXY</span>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

      {/* Dashboard content */}
      <main className="dashboard-content">
        {/* Welcome card */}
        <div className="glass welcome-card">
          <h1 className="welcome-greeting">
            Welcome back, {student?.name?.split(' ')[0] ?? 'Student'} 👋
          </h1>
          <p className="welcome-subtitle">
            FIXXY is your adaptive AI/ML tutor. Let's fix misconceptions together.
          </p>

          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-icon">🎓</div>
              <div className="info-card-title">Student ID</div>
              <div className="info-card-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {student?.id}
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">✉️</div>
              <div className="info-card-title">Email</div>
              <div className="info-card-value">{student?.email}</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">✅</div>
              <div className="info-card-title">Status</div>
              <div className="info-card-value" style={{ color: '#1a7245' }}>Authenticated</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">📦</div>
              <div className="info-card-title">Module</div>
              <div className="info-card-value">{memberSince}</div>
            </div>
          </div>
        </div>

        {/* Future modules notice */}
        <div className="glass" style={{ padding: '1.5rem 2rem', opacity: 0.7 }}>
          <p style={{ fontSize: '0.875rem', color: '#3d5a7a', textAlign: 'center' }}>
            🔒 Module 2 — Student Profile | Module 3 — Curriculum | Module 4 — Question Engine
            <br />
            <span style={{ fontSize: '0.8rem', color: '#6b8ba4' }}>Coming in later modules</span>
          </p>
        </div>
      </main>
    </div>
  );
}
