import { Navigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

/**
 * Placeholder profile page for Module 2.
 * Shown as a protected route during Module 1 testing.
 */
export function ProfilePage() {
  const { student } = useAuth();
  return (
    <div className="fixxy-page" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Student Profile</h1>
        <div className="info-grid">
          <div className="info-card"><div className="info-card-title">Name</div><div className="info-card-value">{student?.name}</div></div>
          <div className="info-card"><div className="info-card-title">Email</div><div className="info-card-value">{student?.email}</div></div>
          <div className="info-card"><div className="info-card-title">ID</div><div className="info-card-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{student?.id}</div></div>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b8ba4' }}>
          Your profile details and learning preferences can be configured here.
        </p>
      </div>
    </div>
  );
}
