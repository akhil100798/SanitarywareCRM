import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import DashboardLayout from './DashboardLayout';
import UnauthorizedPage from '../pages/UnauthorizedPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return (
            <DashboardLayout>
                <UnauthorizedPage />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <React.Suspense fallback={<div role="status" className="p-8 text-center text-slate-500">Loading page...</div>}>
                {children}
            </React.Suspense>
        </DashboardLayout>
    );
};

export default ProtectedRoute;
