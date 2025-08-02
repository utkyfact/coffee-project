import React from 'react';
import { Navigate, useLocation } from 'react-router';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const location = useLocation();
  
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (user?.role !== requiredRole) {
        return <Navigate to="/" replace />;
      }
    } catch (error) {
      console.warn('User data parse error:', error);
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute; 