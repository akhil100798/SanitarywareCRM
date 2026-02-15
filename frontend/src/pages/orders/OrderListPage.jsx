import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ShoppingBag, Truck, CreditCard, ChevronRight } from 'lucide-react';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';

const OrderListPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await orderService.getAll({ size: 100 });
            setOrders(response.data.content);
        } catch (error) {
            toast.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
            case 'PROCESSING': return 'bg-purple-100 text-purple-800';
            case 'SHIPPED': return 'bg-indigo-100 text-indigo-800';
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'UNPAID': return 'text-red-600';
            case 'PARTIAL': return 'text-orange-600';
            case 'PAID': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-500">Track and manage customer orders and deliveries.</p>
                </div>
                <Link
                    to="/orders/new"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    <span>New Order</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by order # or customer..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={20} />
                        <span>Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4">Financials</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No orders found.</td>
                                </tr>
                            ) : (
                                orders.map((o) => (
                                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <ShoppingBag size={20} className="text-gray-400 mr-3" />
                                                <div className="font-medium text-blue-600 hover:underline">
                                                    <Link to={`/orders/edit/${o.id}`}>{o.orderNumber}</Link>
                                                </div>
                                            </div>
                                            {o.quotationNumber && (
                                                <div className="text-xs text-gray-400 mt-1">Ref: {o.quotationNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{o.customerName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center"><ChevronRight size={12} className="mr-1" /> Order: {o.orderDate}</div>
                                            <div className="flex items-center text-gray-400 mt-1"><Truck size={14} className="mr-1" /> Delivery: {o.deliveryDate || 'TBD'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">₹{o.total.toLocaleString()}</div>
                                            <div className={`text-xs font-semibold flex items-center mt-1 ${getPaymentStatusColor(o.paymentStatus)}`}>
                                                <CreditCard size={12} className="mr-1" /> {o.paymentStatus}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(o.status)}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Manage</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrderListPage;
