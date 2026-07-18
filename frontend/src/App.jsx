import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import ProductListPage from './pages/products/ProductListPage';
import ProductFormPage from './pages/products/ProductFormPage';
import QuotationListPage from './pages/quotations/QuotationListPage';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import OrderListPage from './pages/orders/OrderListPage';
import OrderFormPage from './pages/orders/OrderFormPage';
import PaymentListPage from './pages/payments/PaymentListPage';
import PaymentFormPage from './pages/payments/PaymentFormPage';
import BrandListPage from './pages/brands/BrandListPage';
import CategoryListPage from './pages/categories/CategoryListPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/ProfilePage';

// Distributor Module Imports
import DistributorListPage from './pages/distributors/DistributorListPage';
import DistributorFormPage from './pages/distributors/DistributorFormPage';
import PurchaseOrderListPage from './pages/purchase-orders/PurchaseOrderListPage';
import PurchaseOrderFormPage from './pages/purchase-orders/PurchaseOrderFormPage';
import DistributorPaymentListPage from './pages/distributor-payments/DistributorPaymentListPage';
import DistributorPaymentFormPage from './pages/distributor-payments/DistributorPaymentFormPage';

import './index.css';

const managementRoles = ['ADMIN', 'MANAGER'];

function App() {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
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
                            <ProtectedRoute>
                                <CustomerListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers/new"
                        element={
                            <ProtectedRoute>
                                <CustomerFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers/edit/:id"
                        element={
                            <ProtectedRoute>
                                <CustomerFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <ProtectedRoute>
                                <ProductListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/brands"
                        element={
                            <ProtectedRoute>
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
                            <ProtectedRoute>
                                <QuotationListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quotations/new"
                        element={
                            <ProtectedRoute>
                                <QuotationFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quotations/edit/:id"
                        element={
                            <ProtectedRoute>
                                <QuotationFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <OrderListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders/new"
                        element={
                            <ProtectedRoute>
                                <OrderFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders/edit/:id"
                        element={
                            <ProtectedRoute>
                                <OrderFormPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/payments"
                        element={
                            <ProtectedRoute>
                                <PaymentListPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/payments/new"
                        element={
                            <ProtectedRoute>
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
                            <ProtectedRoute>
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

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Router>
            <Toaster position="top-right" />
        </>
    );
}

export default App;
