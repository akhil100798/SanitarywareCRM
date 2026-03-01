import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import DashboardLayout from './DashboardLayout';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    );
};

export default ProtectedRoute;
