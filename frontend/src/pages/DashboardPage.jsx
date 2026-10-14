import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Package, ShoppingCart, TrendingUp, AlertCircle, ArrowRight, FileText, CreditCard, User, CheckCircle2 } from 'lucide-react';
import dashboardService from '../services/dashboardService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { StatCard } from '../components/ui/Page';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSkeleton } from '../components/ui/Feedback';

const fallbackName = {
    ADMIN: 'Administrator', MANAGER: 'Manager', SALES: 'Sales Staff', WAREHOUSE: 'Warehouse Staff'
};

const DashboardPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canManageSales = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);
    const canManageSuppliers = ['ADMIN', 'MANAGER'].includes(user?.role);
    const displayName = user?.fullName?.trim() || user?.name?.trim() || fallbackName[user?.role] || 'User';
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => { fetchDashboardStats(); }, []);

    const fetchDashboardStats = async () => {
        try { setLoading(true); const res = await dashboardService.getStats(); setStats(res.data); setLoadError(false); }
        catch (error) { setLoadError(true); toast.error('Failed to load dashboard statistics'); }
        finally { setLoading(false); }
    };

    if (loading && !stats) {
        return <div className="flex justify-center items-center h-96"><LoadingSkeleton rows={6} /></div>;
    }
    if (!stats && loadError) {
        return <div className="state-panel" role="alert">
            <p>Dashboard data could not be loaded.</p>
            <Button onClick={fetchDashboardStats} disabled={loading}>Try again</Button>
        </div>;
    }

    const lowStockAlert = stats?.lowStockProducts > 0;
    const hasQuickActions = canManageSales || canManageSuppliers;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" data-testid="dashboard-heading">Hello, {displayName}</h1>
                    <p className="text-secondary text-sm mt-1">Dashboard · Monitor catalog changes, track orders, and manage your business.</p>
                </div>
                {lowStockAlert && (
                    <div className="error-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', maxWidth: 320 }}>
                        <AlertCircle size={20} aria-hidden="true" />
                        <div><p className="font-semibold text-sm">Low Stock Alert!</p><p className="text-xs">{stats?.lowStockProducts} items below reorder levels.</p></div>
                    </div>
                )}
            </div>

            <div className="stat-grid card-container" data-testid="dashboard-metrics">
                {canManageSales && (
                    <Link to="/customers" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
                        <StatCard label="Total Customers" value={(stats?.totalCustomers || 0).toLocaleString()} note="View Directory" />
                    </Link>
                )}
                <Link to="/orders" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
                    <StatCard label="Total Orders" value={(stats?.totalOrders || 0).toLocaleString()} note={`${stats?.pendingOrders || 0} pending deliveries`} />
                </Link>
                {canManageSuppliers && (
                    <Link to="/payments" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
                        <StatCard label="Gross Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} note="Recorded Payments" />
                    </Link>
                )}
                {canManageSuppliers && (
                    <Link to="/distributor-payments" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
                        <StatCard label="Supplier Payments" value={`₹${(stats?.distributorPaymentsTotal || 0).toLocaleString('en-IN')}`} note={`To pay: ₹${(stats?.totalPayables || 0).toLocaleString('en-IN')}`} />
                    </Link>
                )}
            </div>

            {canManageSuppliers && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="surface">
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm"><span className="text-secondary font-semibold">Receivables</span><span className="font-semibold">₹{(stats?.totalReceivables || 0).toLocaleString('en-IN')}</span></div>
                        <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(stats?.totalReceivables || 0) + (stats?.totalPayables || 0) > 0 ? ((stats?.totalReceivables || 0) / (Math.max(stats?.totalReceivables || 0, stats?.totalPayables || 0) || 1)) * 100 : 50}%` }} />
                        </div>
                        <div className="flex justify-between text-sm"><span className="text-secondary font-semibold">Payables</span><span className="font-semibold">₹{(stats?.totalPayables || 0).toLocaleString('en-IN')}</span></div>
                        <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ background: 'var(--danger)', width: `${(stats?.totalReceivables || 0) + (stats?.totalPayables || 0) > 0 ? ((stats?.totalPayables || 0) / (Math.max(stats?.totalReceivables || 0, stats?.totalPayables || 0) || 1)) * 100 : 50}%` }} />
                        </div>
                        <div className="pt-3 border-t flex justify-between text-sm font-semibold">
                            <span className="text-secondary">Net Balance</span>
                            <span style={{ color: ((stats?.totalReceivables || 0) - (stats?.totalPayables || 0)) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                ₹{((stats?.totalReceivables || 0) - (stats?.totalPayables || 0)).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="surface lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="section-heading" style={{ margin: 0 }}>Revenue Analytics</h2>
                            <p className="record-meta">Monthly recorded turnover</p>
                        </div>
                    </div>
                    <div className="flex items-end justify-between h-40 pt-4 gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        {!stats?.monthlyRevenue || Object.keys(stats.monthlyRevenue).length === 0 ? (
                            <div className="w-full text-center text-muted py-12">No data available</div>
                        ) : (
                            Object.entries(stats.monthlyRevenue).map(([month, val]) => {
                                const maxVal = Math.max(...Object.values(stats.monthlyRevenue).map(v => Number(v)), 1000);
                                const pct = (Number(val) / maxVal) * 100;
                                return (
                                    <div key={month} className="flex flex-col items-center flex-1 text-center" title={`${month}: ₹${Number(val).toLocaleString()}`}>
                                        <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 4)}%`, background: 'var(--primary)', minHeight: 4, borderRadius: '4px 4px 0 0' }} />
                                        <span className="text-xs text-muted mt-2">{month.slice(0, 3)}</span>
                                        <span className="text-xs font-semibold">₹{Number(val).toLocaleString()}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>}

            <div className={`grid grid-cols-1 ${hasQuickActions ? 'lg:grid-cols-3' : ''} gap-6`}>
                {hasQuickActions && <div className="surface">
                    <h2 className="section-heading">Quick Actions</h2>
                    <div className="space-y-2">
                        {canManageSales && <Button variant="ghost" onClick={() => navigate('/customers/new')} style={{ width: '100%', justifyContent: 'flex-start' }}><User size={16} /> Add Customer</Button>}
                        {canManageSales && <Button variant="ghost" onClick={() => navigate('/quotations/new')} style={{ width: '100%', justifyContent: 'flex-start' }}><FileText size={16} /> Create Quotation</Button>}
                        {canManageSales && <Button variant="ghost" onClick={() => navigate('/orders/new')} style={{ width: '100%', justifyContent: 'flex-start' }}><ShoppingCart size={16} /> Create Order</Button>}
                        {canManageSuppliers && <Button variant="ghost" onClick={() => navigate('/purchase-orders/new')} style={{ width: '100%', justifyContent: 'flex-start' }}><Package size={16} /> Create PO</Button>}
                    </div>
                </div>}

                <div className={`surface ${hasQuickActions ? 'lg:col-span-2' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="section-heading" style={{ margin: 0 }}>Recent Orders</h2>
                            <p className="record-meta">Latest transactions</p>
                        </div>
                        <Button as={Link} to="/orders" variant="ghost" size="sm">View All <ArrowRight size={14} /></Button>
                    </div>
                    {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                        <div className="state-panel"><CheckCircle2 size={28} aria-hidden="true" /><p>No recent orders</p></div>
                    ) : (
                        <div className="space-y-2">
                            {stats.recentOrders.slice(0, 4).map(order => (
                                <div key={order.id} className="surface" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={() => navigate(canManageSales ? `/orders/edit/${order.id}` : '/orders')}>
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart size={16} className="text-muted" />
                                        <div>
                                            <span className="record-name">{order.orderNumber}</span>
                                            <div className="record-meta">{order.customerName}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {order.total != null && <span className="font-semibold">₹{Number(order.total).toLocaleString('en-IN')}</span>}
                                        <div><StatusBadge status={order.status} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {canManageSuppliers && stats?.topProducts?.length > 0 && (
                <div className="surface">
                    <h2 className="section-heading">Top Products</h2>
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead><tr><th>Product</th><th className="numeric">Sold</th><th className="numeric">Revenue</th></tr></thead>
                            <tbody>{stats.topProducts.map((prod, i) => (
                                <tr key={i}><td className="record-name">{prod.productName}</td><td className="numeric">{prod.quantitySold}</td><td className="numeric">₹{prod.totalRevenue.toLocaleString()}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
