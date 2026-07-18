import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Users, 
    Package, 
    ShoppingCart, 
    TrendingUp, 
    AlertCircle, 
    ArrowRight, 
    FileText, 
    CreditCard,
    DollarSign,
    Percent,
    ArrowUpRight,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import dashboardService from '../services/dashboardService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const fallbackName = {
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    SALES: 'Sales Staff'
};

const DashboardPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const displayName = user?.fullName?.trim()
        || user?.name?.trim()
        || fallbackName[user?.role]
        || 'User';
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const res = await dashboardService.getStats();
            setStats(res.data);
        } catch (error) {
            toast.error('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold text-sm animate-pulse">Assembling business analytics...</p>
            </div>
        );
    }

    const lowStockAlert = stats?.lowStockProducts > 0;

    return (
        <div className="space-y-8">
            {/* Top Banner Hero */}
            <div className="relative bg-slate-900 rounded-3xl p-8 overflow-hidden shadow-md border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full text-xs font-bold text-teal border border-slate-700">
                            <Sparkles size={12} />
                            <span>System Status: Healthy</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">Hello, {displayName}</h1>
                        <p className="text-slate-400 text-sm max-w-lg">
                            Monitor catalog changes, track purchase orders, analyze customer conversions, and record payments in real-time.
                        </p>
                    </div>
                    {lowStockAlert && (
                        <div className="flex items-center gap-4 bg-red-950/30 border border-red-900/50 rounded-2xl p-4.5 max-w-sm md:self-center">
                            <div className="p-2.5 bg-red-900/30 text-red-400 rounded-xl">
                                <AlertCircle size={22} className="animate-bounce" />
                            </div>
                            <div>
                                <h4 className="font-bold text-red-200 text-sm">Low Stock Alert!</h4>
                                <p className="text-red-300 text-xs mt-0.5">
                                    There are <span className="font-extrabold">{stats?.lowStockProducts}</span> items below reorder levels.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Customers */}
                <Link to="/customers" className="card-container flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Customers</span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{(stats?.totalCustomers || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1 text-xs text-blue-600 font-semibold">
                        <span>View Directory</span>
                        <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                {/* Orders */}
                <Link to="/orders" className="card-container flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Orders</span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{(stats?.totalOrders || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-purple-50 text-purple-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <ShoppingCart size={20} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-50 text-slate-500 text-xs font-medium">
                        <span className="text-purple-600 font-bold">{stats?.pendingOrders}</span> pending deliveries
                    </div>
                </Link>

                {/* Revenue */}
                <Link to="/payments" className="card-container flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                        <span>Recorded Payments</span>
                        <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                {/* Payables */}
                <Link to="/distributor-payments" className="card-container flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Supplier Payments</span>
                            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">₹{(stats?.distributorPaymentsTotal || 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <CreditCard size={20} />
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-50 text-slate-500 text-xs font-medium">
                        To pay: <span className="text-amber-600 font-bold">₹{(stats?.totalPayables || 0).toLocaleString('en-IN')}</span>
                    </div>
                </Link>
            </div>

            {/* Financial Overview & Interactive charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payables vs Receivables */}
                <div className="card-container flex flex-col justify-between space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Financial Ledger</h3>
                        <p className="text-slate-400 text-xs">Outstanding credit summary</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                                <span>Receivables (Customers)</span>
                                <span className="text-slate-900 font-extrabold">₹{(stats?.totalReceivables || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${(stats?.totalReceivables || 0) + (stats?.totalPayables || 0) > 0 ? ((stats?.totalReceivables || 0) / ((stats?.totalReceivables || 0) + (stats?.totalPayables || 0))) * 100 : 50}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                                <span>Payables (Distributors)</span>
                                <span className="text-slate-900 font-extrabold">₹{(stats?.totalPayables || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-rose-500 h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${(stats?.totalReceivables || 0) + (stats?.totalPayables || 0) > 0 ? ((stats?.totalPayables || 0) / ((stats?.totalReceivables || 0) + (stats?.totalPayables || 0))) * 100 : 50}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Net Working Bal.</span>
                        <span className={`font-bold ${((stats?.totalReceivables || 0) - (stats?.totalPayables || 0)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{((stats?.totalReceivables || 0) - (stats?.totalPayables || 0)).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                {/* Monthly Revenue Chart */}
                <div className="card-container lg:col-span-2 flex flex-col justify-between space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Revenue Analytics</h3>
                            <p className="text-slate-400 text-xs">Monthly recorded turnover comparison</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg">Turnover</span>
                    </div>
                    
                    {/* Visual Bar Chart */}
                    <div className="flex items-end justify-between h-40 pt-4 border-b border-slate-100 px-4">
                        {!stats?.monthlyRevenue || Object.keys(stats.monthlyRevenue).length === 0 ? (
                            <div className="w-full text-center text-slate-300 text-sm py-12">No monthly breakdown available</div>
                        ) : (
                            (() => {
                                const entries = Object.entries(stats.monthlyRevenue);
                                const maxVal = Math.max(...entries.map(([_, v]) => Number(v)), 1000);
                                return entries.map(([month, val]) => {
                                    const pct = (Number(val) / maxVal) * 100;
                                    return (
                                        <div key={month} className="flex flex-col items-center flex-1 group relative">
                                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-xxs font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                ₹{Number(val).toLocaleString()}
                                            </div>
                                            <div 
                                                className="w-8 bg-gradient-to-t from-teal/60 to-teal rounded-t-lg transition-all duration-1000 hover:from-teal hover:to-teal-400 cursor-pointer"
                                                style={{ height: `${Math.max(pct, 5)}%` }}
                                            ></div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">{month.slice(0, 3)}</span>
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions Hub & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick actions Panel */}
                <div className="card-container flex flex-col justify-between space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                        <p className="text-slate-400 text-xs">Instantly initialize CRM transactions</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 flex-1">
                        <button 
                            onClick={() => navigate('/customers/new')} 
                            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200/50 rounded-xl transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white text-slate-700 rounded-lg border border-slate-100 group-hover:text-teal group-hover:border-teal/20 transition-colors">
                                    <Users size={16} />
                                </div>
                                <span className="font-semibold text-slate-700 text-sm">Add New Customer</span>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-teal transition-colors" />
                        </button>
                        <button 
                            onClick={() => navigate('/quotations/new')} 
                            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200/50 rounded-xl transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white text-slate-700 rounded-lg border border-slate-100 group-hover:text-teal group-hover:border-teal/20 transition-colors">
                                    <FileText size={16} />
                                </div>
                                <span className="font-semibold text-slate-700 text-sm">Create Quotation</span>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-teal transition-colors" />
                        </button>
                        <button 
                            onClick={() => navigate('/orders/new')} 
                            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200/50 rounded-xl transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white text-slate-700 rounded-lg border border-slate-100 group-hover:text-teal group-hover:border-teal/20 transition-colors">
                                    <ShoppingCart size={16} />
                                </div>
                                <span className="font-semibold text-slate-700 text-sm">Create Customer Order</span>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-teal transition-colors" />
                        </button>
                        <button 
                            onClick={() => navigate('/purchase-orders/new')} 
                            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-200/50 rounded-xl transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white text-slate-700 rounded-lg border border-slate-100 group-hover:text-teal group-hover:border-teal/20 transition-colors">
                                    <Package size={16} />
                                </div>
                                <span className="font-semibold text-slate-700 text-sm">Create Purchase Order</span>
                            </div>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-teal transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Recent Orders List Table */}
                <div className="card-container lg:col-span-2 flex flex-col justify-between space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Recent Customer Orders</h3>
                            <p className="text-slate-400 text-xs">Latest transactions pipeline status</p>
                        </div>
                        <Link to="/orders" className="text-teal hover:text-teal-800 text-xs font-bold flex items-center gap-1">
                            <span>View All</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="space-y-3.5 flex-1">
                        {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                            <div className="text-center py-12 text-slate-300 flex flex-col items-center">
                                <CheckCircle2 size={36} className="opacity-20 mb-2" />
                                <p className="text-xs font-semibold">No recent orders placed</p>
                            </div>
                        ) : (
                            stats.recentOrders.slice(0, 4).map((order) => (
                                <div 
                                    key={order.id} 
                                    className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/orders/edit/${order.id}`)}
                                >
                                    <div className="flex items-center space-x-3.5">
                                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-700">
                                            <ShoppingCart size={16} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-slate-900 text-sm">{order.orderNumber}</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[120px]">{order.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-extrabold text-slate-900 text-sm">₹{order.total.toLocaleString()}</p>
                                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                            order.status === 'DELIVERED' 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : order.status === 'CONFIRMED'
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Top Selling Products */}
            {stats?.topProducts && stats.topProducts.length > 0 && (
                <div className="card-container space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Product Sales Leaderboard</h3>
                        <p className="text-slate-400 text-xs">Top performing products by revenue</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-xxs font-bold uppercase tracking-wider">
                                    <th className="py-3 font-semibold">Product Name</th>
                                    <th className="py-3 font-semibold text-right">Units Sold</th>
                                    <th className="py-3 font-semibold text-right">Total Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topProducts.map((prod, index) => (
                                    <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors text-sm">
                                        <td className="py-3.5 font-semibold text-slate-950">{prod.productName}</td>
                                        <td className="py-3.5 text-right font-bold text-slate-600">{prod.quantitySold}</td>
                                        <td className="py-3.5 text-right font-extrabold text-slate-950">₹{prod.totalRevenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
