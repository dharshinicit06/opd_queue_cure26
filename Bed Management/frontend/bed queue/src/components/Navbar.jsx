import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { logout, user, role } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const username = user?.fullName || user?.username || "User";
  const userInitials = username.charAt(0).toUpperCase();

  const roleBadgeColors = {
    Admin: "#2563EB",
    Receptionist: "#059669",
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h2 className="navbar-title">OPD Queue Management System</h2>
      </div>

      <div className="navbar-right">
        <button className="navbar-notification" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        <div className="user-profile" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="user-avatar">{userInitials}</div>
          <span className="username">{username}</span>
          <span className="user-role-badge" style={{ backgroundColor: roleBadgeColors[role] || "#64748B" }}>{role}</span>
          <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-user">
                <span className="dropdown-user-name">{username}</span>
                <span className="dropdown-user-role">{role}</span>
              </div>
              <div className="dropdown-divider" />
              <button onClick={handleLogout} className="logout-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
