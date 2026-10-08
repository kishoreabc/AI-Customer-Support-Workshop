import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LoadingState } from './LoadingState.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'SUPPORT_AGENT' | 'CUSTOMER')[];
  adminPortal?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  adminPortal = false,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Authenticating session credentials..." />
      </div>
    );
  }

  if (!user) {
    // If attempting to access admin route, send to admin login, otherwise customer login
    const targetLogin = adminPortal ? '/admin/login' : '/login';
    return <Navigate to={targetLogin} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role mismatch: redirect appropriately
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/chat" replace />;
    } else {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};
