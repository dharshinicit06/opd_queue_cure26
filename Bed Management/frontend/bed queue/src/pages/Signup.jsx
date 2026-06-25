import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/api";
import "../styles/Signup.css";
import CryptoJS from "crypto-js";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "", username: "", email: "", password: "", confirmPassword: "", role: "Receptionist",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setFieldErrors({ ...fieldErrors, [e.target.name]: "" });
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required";
    if (!formData.username.trim()) errs.username = "Username is required";
    else if (formData.username.length < 3) errs.username = "Username must be at least 3 characters";
    if (!formData.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Invalid email format";
    if (!formData.password) errs.password = "Password is required";
    else if (formData.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");

    try {
      const hashedPassword = CryptoJS.SHA256(formData.password).toString();
      await API.post("/auth/signup", {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: hashedPassword,
        role: formData.role,
      });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-bg">
        <div className="signup-bg-overlay" />
      </div>
      <div className="signup-card">
        <div className="signup-header">
          <div className="signup-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Register a new staff account</p>
        </div>

        <form className="signup-form" onSubmit={handleSignup}>
          {error && (
            <div className="signup-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="signup-field">
            <label className="signup-label">Full Name</label>
            <div className="signup-input-wrap">
              <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <input className={`signup-input ${fieldErrors.fullName ? "s-error" : ""}`} type="text" name="fullName" placeholder="John Doe" value={formData.fullName} onChange={handleChange} />
            </div>
            {fieldErrors.fullName && <span className="signup-field-err">{fieldErrors.fullName}</span>}
          </div>

          <div className="signup-row">
            <div className="signup-field">
              <label className="signup-label">Username</label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input className={`signup-input ${fieldErrors.username ? "s-error" : ""}`} type="text" name="username" placeholder="johndoe" value={formData.username} onChange={handleChange} />
              </div>
              {fieldErrors.username && <span className="signup-field-err">{fieldErrors.username}</span>}
            </div>
            <div className="signup-field">
              <label className="signup-label">Email</label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                <input className={`signup-input ${fieldErrors.email ? "s-error" : ""}`} type="email" name="email" placeholder="john@hospital.com" value={formData.email} onChange={handleChange} />
              </div>
              {fieldErrors.email && <span className="signup-field-err">{fieldErrors.email}</span>}
            </div>
          </div>

          <div className="signup-row">
            <div className="signup-field">
              <label className="signup-label">Password</label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input className={`signup-input ${fieldErrors.password ? "s-error" : ""}`} type={showPassword ? "text" : "password"} name="password" placeholder="Min 8 characters" value={formData.password} onChange={handleChange} />
                <button type="button" className="signup-toggle-pw" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <span className="signup-field-err">{fieldErrors.password}</span>}
            </div>
            <div className="signup-field">
              <label className="signup-label">Confirm Password</label>
              <div className="signup-input-wrap">
                <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input className={`signup-input ${fieldErrors.confirmPassword ? "s-error" : ""}`} type={showConfirm ? "text" : "password"} name="confirmPassword" placeholder="Re-enter password" value={formData.confirmPassword} onChange={handleChange} />
                <button type="button" className="signup-toggle-pw" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className="signup-field-err">{fieldErrors.confirmPassword}</span>}
            </div>
          </div>

          <div className="signup-field">
            <label className="signup-label">Role</label>
            <div className="signup-input-wrap">
              <svg className="signup-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <select className="signup-input signup-select" name="role" value={formData.role} onChange={handleChange}>
                <option value="Receptionist">Receptionist</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <button className="signup-submit" type="submit" disabled={loading}>
            {loading ? <span className="signup-spinner" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            )}
            <span>{loading ? "Creating Account..." : "Create Account"}</span>
          </button>
        </form>

        <div className="signup-footer">
          <span>Already have an account?</span>
          <Link to="/" className="signup-login-link">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
