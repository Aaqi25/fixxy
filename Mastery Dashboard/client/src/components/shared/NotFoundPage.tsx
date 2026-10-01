import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="fixxy-page not-found-page">
      <div className="glass not-found-card">
        <div className="not-found-code" aria-label="Error 404">404</div>
        <h1 className="not-found-title">Looks like this page took a wrong turn.</h1>
        <p className="not-found-subtitle">
          Let's get you back on your learning path.
        </p>
        <Link to="/" id="not-found-back" className="primary-button" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          Back to FIXXY
        </Link>
      </div>
    </div>
  );
}
