import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';

vi.mock('../components/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe('ProtectedRoute', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
    });

    it('redirects to /login when user is not authenticated', () => {
        useAuthStore.setState({ user: null, isAuthenticated: false });

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <div>Protected Content</div>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows Access Denied when user does not have required role', () => {
        useAuthStore.setState({
            user: { id: 1, username: 'warehouse_user', role: 'WAREHOUSE' },
            isAuthenticated: true,
        });

        render(
            <MemoryRouter initialEntries={['/admin-only']}>
                <Routes>
                    <Route
                        path="/admin-only"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                                <div>Admin Secret</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Access denied')).toBeInTheDocument();
        expect(screen.queryByText('Admin Secret')).not.toBeInTheDocument();
    });

    it('renders children within DashboardLayout when user has allowed role', () => {
        useAuthStore.setState({
            user: { id: 1, username: 'admin_user', role: 'ADMIN' },
            isAuthenticated: true,
        });

        render(
            <MemoryRouter initialEntries={['/admin-only']}>
                <Routes>
                    <Route
                        path="/admin-only"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                                <div>Admin Secret</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Admin Secret')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
    });

    it('renders children when no specific roles are required and user is authenticated', () => {
        useAuthStore.setState({
            user: { id: 2, username: 'sales_user', role: 'SALES' },
            isAuthenticated: true,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <div>Dashboard Content</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
});
