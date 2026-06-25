import { Link } from "react-router-dom";
import "../styles/AccessDenied.css";

function AccessDenied() {
  return (
    <div className="access-denied-wrapper">
      <div className="access-denied-bg">
        <div className="access-denied-bg-overlay" />
      </div>
      <div className="access-denied-card">
        <div className="access-denied-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
          </svg>
        </div>
        <div className="access-denied-code">403</div>
        <h1 className="access-denied-title">Access Denied</h1>
        <p className="access-denied-message">You do not have permission to access this page.</p>
        <Link to="/" className="access-denied-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default AccessDenied;