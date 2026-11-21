import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, ToastBar, toast, useToasterStore } from 'react-hot-toast';
import { X } from 'lucide-react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import QuotationListPage from './pages/quotations/QuotationListPage';
import OrderListPage from './pages/orders/OrderListPage';
import PaymentListPage from './pages/payments/PaymentListPage';
import PaymentFormPage from './pages/payments/PaymentFormPage';
import BrandListPage from './pages/brands/BrandListPage';
import CategoryListPage from './pages/categories/CategoryListPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Distributor Module Imports
import DistributorListPage from './pages/distributors/DistributorListPage';
import DistributorFormPage from './pages/distributors/DistributorFormPage';
import PurchaseOrderListPage from './pages/purchase-orders/PurchaseOrderListPage';
import DistributorPaymentListPage from './pages/distributor-payments/DistributorPaymentListPage';
import DistributorPaymentFormPage from './pages/distributor-payments/DistributorPaymentFormPage';

import './index.css';

const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const ProductFormPage = lazy(() => import('./pages/products/ProductFormPage'));
const QuotationFormPage = lazy(() => import('./pages/quotations/QuotationFormPage'));
const OrderFormPage = lazy(() => import('./pages/orders/OrderFormPage'));
const PurchaseOrderFormPage = lazy(() => import('./pages/purchase-orders/PurchaseOrderFormPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage'));
const UserManagementPage = lazy(() => import('./pages/users/UserManagementPage'));
const CustomerPortalPage = lazy(() => import('./pages/portal/CustomerPortalPage'));

const managementRoles = ['ADMIN', 'MANAGER'];
const orderAccessRoles = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'];

const ToastLimiter = ({ limit = 3 }) => {
    const { toasts } = useToasterStore();
    React.useEffect(() => {
        toasts
            .filter((t) => t.visible)
            .filter((_, i) => i >= limit)
            .forEach((t) => toast.dismiss(t.id));
    }, [toasts, limit]);
    return null;
};

function App() {
    return (
        <>
            <Router>
                <Suspense fallback={<div role="status" className="p-8 text-center text-slate-500">Loading page...</div>}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/portal/quotations/:token" element={<CustomerPortalPage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <CustomerListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers/new"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <CustomerFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers/edit/:id"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <CustomerFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <ProtectedRoute allowedRoles={orderAccessRoles}>
                                <ProductListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/brands"
                        element={
                            <ProtectedRoute allowedRoles={managementRoles}>
                                <BrandListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products/new"
                        element={
                            <ProtectedRoute allowedRoles={managementRoles}>
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products/edit/:id"
                        element={
                            <ProtectedRoute allowedRoles={managementRoles}>
                                <ProductFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quotations"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <QuotationListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quotations/new"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <QuotationFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quotations/edit/:id"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <QuotationFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute allowedRoles={orderAccessRoles}>
                                <OrderListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders/new"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <OrderFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders/edit/:id"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <OrderFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/payments"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <PaymentListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/payments/new"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <PaymentFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute allowedRoles={managementRoles}>
                                <SettingsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/categories"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}>
                                <CategoryListPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Distributor Module Routes */}
                    <Route path="/distributors" element={<ProtectedRoute allowedRoles={managementRoles}><DistributorListPage /></ProtectedRoute>} />
                    <Route path="/distributors/new" element={<ProtectedRoute allowedRoles={managementRoles}><DistributorFormPage /></ProtectedRoute>} />
                    <Route path="/distributors/edit/:id" element={<ProtectedRoute allowedRoles={managementRoles}><DistributorFormPage /></ProtectedRoute>} />

                    <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={managementRoles}><PurchaseOrderListPage /></ProtectedRoute>} />
                    <Route path="/purchase-orders/new" element={<ProtectedRoute allowedRoles={managementRoles}><PurchaseOrderFormPage /></ProtectedRoute>} />
                    <Route path="/purchase-orders/edit/:id" element={<ProtectedRoute allowedRoles={managementRoles}><PurchaseOrderFormPage /></ProtectedRoute>} />

                    <Route path="/distributor-payments" element={<ProtectedRoute allowedRoles={managementRoles}><DistributorPaymentListPage /></ProtectedRoute>} />
                    <Route path="/distributor-payments/new" element={<ProtectedRoute allowedRoles={managementRoles}><DistributorPaymentFormPage /></ProtectedRoute>} />
                    <Route path="/distributor-payments/edit/:id" element={<ProtectedRoute allowedRoles={managementRoles}><DistributorPaymentFormPage /></ProtectedRoute>} />

                    <Route path="/reports" element={<ProtectedRoute allowedRoles={managementRoles}><ReportsPage /></ProtectedRoute>} />
                    <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={managementRoles}><AuditLogsPage /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute allowedRoles={managementRoles}><UserManagementPage /></ProtectedRoute>} />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </Suspense>
            </Router>
            <ToastLimiter limit={3} />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        borderRadius: '12px',
                        background: '#0f172a',
                        color: '#f8fafc',
                        fontSize: '13px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                        padding: '12px 16px',
                        maxWidth: '420px',
                    },
                }}
            >
                {(t) => (
                    <ToastBar toast={t}>
                        {({ icon, message }) => (
                            <div
                                className="flex items-center gap-2 cursor-pointer select-none w-full"
                                onClick={() => toast.dismiss(t.id)}
                                role="alert"
                            >
                                <span className="shrink-0">{icon}</span>
                                <div className="text-xs font-medium leading-snug flex-1">{message}</div>
                                {t.type !== 'loading' && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toast.dismiss(t.id);
                                        }}
                                        className="ml-2 p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
                                        aria-label="Dismiss toast"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </ToastBar>
                )}
            </Toaster>
        </>
    );
}

export default App;
