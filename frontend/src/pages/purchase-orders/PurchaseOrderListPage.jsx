import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, ShoppingCart, Truck } from 'lucide-react';
import purchaseOrderService from '../../services/purchaseOrderService';
import toast from 'react-hot-toast';

const PurchaseOrderListPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await purchaseOrderService.getAllPurchaseOrders(0, 100);
            setOrders(response.content);
        } catch (error) {
            toast.error('Failed to fetch purchase orders');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this purchase order?')) {
            try {
                await purchaseOrderService.deletePurchaseOrder(id);
                toast.success('Purchase order deleted successfully');
                fetchOrders();
            } catch (error) {
                toast.error('Failed to delete purchase order');
            }
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'ORDERED': return 'bg-blue-100 text-blue-800';
            case 'PARTIALLY_RECEIVED': return 'bg-yellow-100 text-yellow-800';
            case 'RECEIVED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentBadgeClass = (balanceAmount, totalAmount) => {
        if (totalAmount === 0 || balanceAmount > 0 && balanceAmount < totalAmount) {
            return 'bg-yellow-100 text-yellow-800'; // Partial
        } else if (balanceAmount === 0) {
            return 'bg-green-100 text-green-800'; // Paid
        } else {
            return 'bg-red-100 text-red-800'; // Unpaid
        }
    };

    const getPaymentStatusText = (balanceAmount, totalAmount) => {
        if (totalAmount === 0) return 'Unpaid';
        if (balanceAmount === 0) return 'Paid';
        if (balanceAmount > 0 && balanceAmount < totalAmount) return 'Partial';
        return 'Unpaid';
    };

    // Very basic client-side filtering
    const filteredOrders = orders.filter(order =>
        order.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.distributorName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500">Manage your orders to distributors.</p>
                </div>
                <Link
                    to="/purchase-orders/new"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    <span>Create Full PO</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by PO Number or Distributor..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">PO Details</th>
                                <th className="px-6 py-4">Distributor</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                        Loading purchase orders...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                        No purchase orders found.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{order.poNumber}</div>
                                            <div className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{order.distributorName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                                                {order.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(order.balanceAmount, order.total)}`}>
                                                {getPaymentStatusText(order.balanceAmount, order.total)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">₹{order.total?.toLocaleString('en-IN')}</div>
                                            {order.balanceAmount > 0 && (
                                                <div className="text-xs text-red-500">Bal: ₹{order.balanceAmount?.toLocaleString('en-IN')}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    to={`/purchase-orders/edit/${order.id}`}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                                    title="Edit / View"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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

export default PurchaseOrderListPage;
