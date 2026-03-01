import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Package, ShoppingCart, TrendingUp, AlertCircle, ArrowRight, FileText, CreditCard } from 'lucide-react';
import dashboardService from '../services/dashboardService';
import toast from 'react-hot-toast';

const DashboardPage = () => {
    const navigate = useNavigate();
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

    const statCards = [
        {
            icon: Users,
            label: 'Total Customers',
            value: stats?.totalCustomers || '0',
            color: 'bg-blue-500',
            trend: '+12%',
            path: '/customers'
        },
        {
            icon: Package,
            label: 'Low Stock Items',
            value: stats?.lowStockProducts || '0',
            color: 'bg-red-500',
            trend: 'Alert',
            path: '/products'
        },
        {
            icon: ShoppingCart,
            label: 'Total Orders',
            value: stats?.totalOrders || '0',
            color: 'bg-purple-500',
            trend: stats?.pendingOrders + ' pending',
            path: '/orders'
        },
        {
            icon: TrendingUp,
            label: 'Total Revenue',
            value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`,
            color: 'bg-green-500',
            trend: 'This Month',
            path: '/payments'
        },
        {
            icon: CreditCard,
            label: 'Distributor Payments',
            value: `₹${(stats?.distributorPaymentsTotal || 0).toLocaleString()}`,
            color: 'bg-orange-500',
            trend: 'This Month',
            path: '/distributor-payments'
        },
    ];

    if (loading && !stats) {
        return <div className="flex justify-center items-center h-64">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Welcome message */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
                    <p className="text-blue-100 max-w-md">Here's what's happening with your business today. Check out the latest metrics and recent activities below.</p>
                </div>
                <FileText className="absolute right-[-20px] bottom-[-20px] text-blue-500 opacity-20 w-48 h-48" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {statCards.map((stat, index) => (
                    <Link
                        key={index}
                        to={stat.path}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:-translate-y-1 group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} p-3 rounded-lg text-white shadow-lg shadow-${stat.color.split('-')[1]}/20`}>
                                <stat.icon size={24} />
                            </div>
                            <span className={`text-sm font-semibold ${stat.label === 'Low Stock Items' ? 'text-red-500' : 'text-green-600'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Quick Actions</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => navigate('/customers/new')} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                            <span className="font-semibold text-gray-700">Add New Customer</span>
                            <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button onClick={() => navigate('/quotations/new')} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                            <span className="font-semibold text-gray-700">Create Quotation</span>
                            <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button onClick={() => navigate('/orders/new')} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                            <span className="font-semibold text-gray-700">Create Customer Order</span>
                            <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button onClick={() => navigate('/purchase-orders/new')} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                            <span className="font-semibold text-gray-700">Create Purchase Order</span>
                            <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button onClick={() => navigate('/distributor-payments/new')} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                            <span className="font-semibold text-gray-700">Record Distributor Payment</span>
                            <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600" />
                        </button>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                        <Link to="/orders" className="text-blue-600 hover:underline text-sm font-semibold">View All</Link>
                    </div>
                    <div className="space-y-4">
                        {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <AlertCircle size={40} className="mx-auto mb-2 opacity-20" />
                                <p>No recent orders found</p>
                            </div>
                        ) : (
                            stats.recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                            <ShoppingCart size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{order.orderNumber}</p>
                                            <p className="text-sm text-gray-500">{order.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">₹{order.total.toLocaleString()}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
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

            {/* Financial Overview section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Payables vs Receivables</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                            <div>
                                <p className="text-sm font-semibold text-red-600">To Pay (Payables)</p>
                                <p className="text-2xl font-bold text-red-700">₹{(stats?.totalPayables || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                            <div>
                                <p className="text-sm font-semibold text-green-600">To Receive (Receivables)</p>
                                <p className="text-2xl font-bold text-green-700">₹{(stats?.totalReceivables || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DashboardPage;
