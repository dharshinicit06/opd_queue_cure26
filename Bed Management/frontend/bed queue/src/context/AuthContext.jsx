import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isTokenExpired } from '../utils/jwt';
import { setAuthStore } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => localStorage.getItem('role'));
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    setToken(null);
    setRole(null);
    setUser(null);
  }, []);

  const checkTokenExpiry = useCallback(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken && isTokenExpired(currentToken)) {
      clearAuth();
      setSessionExpired(true);
      navigate('/login', { replace: true, state: { message: 'Session expired. Please login again.' } });
      return true;
    }
    return false;
  }, [clearAuth, navigate]);

  useEffect(() => {
    setAuthStore({
      clearAuth,
      setSessionExpired,
      navigate,
    });
    checkTokenExpiry();
  }, [checkTokenExpiry, clearAuth, navigate]);

  useEffect(() => {
    if (location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/access-denied') {
      checkTokenExpiry();
    }
  }, [location.pathname, checkTokenExpiry]);

  const login = useCallback((newToken, newRole, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    }
    setToken(newToken);
    setRole(newRole);
    setUser(newUser);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  const value = {
    token,
    role,
    user,
    sessionExpired,
    login,
    logout,
    isAuthenticated: !!token && !isTokenExpired(token),
    checkTokenExpiry,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children, allowedRoles }) {
  const { token, role, isAuthenticated, sessionExpired } = useAuth();

  if (sessionExpired) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ message: 'Session expired. Please login again.' }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}