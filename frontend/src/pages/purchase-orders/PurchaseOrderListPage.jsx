import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Truck, CheckCircle2, X } from 'lucide-react';
import purchaseOrderService from '../../services/purchaseOrderService';
import toast from 'react-hot-toast';

const PurchaseOrderListPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [receivingOrder, setReceivingOrder] = useState(null);
    const [isReceiving, setIsReceiving] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await purchaseOrderService.getAllPurchaseOrders(0, 100);
            setOrders(response.content || response || []);
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

    const handleOpenReceiveModal = (order) => {
        setReceivingOrder(order);
    };

    const handleConfirmReceive = async () => {
        if (!receivingOrder) return;
        try {
            setIsReceiving(true);
            await purchaseOrderService.receivePurchaseOrder(receivingOrder.id);
            toast.success(`Purchase Order ${receivingOrder.poNumber} received and inventory updated successfully!`);
            setReceivingOrder(null);
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to receive purchase order');
        } finally {
            setIsReceiving(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800 border border-gray-200';
            case 'ORDERED': return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'PARTIALLY_RECEIVED': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'RECEIVED': return 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentBadgeClass = (balanceAmount, totalAmount) => {
        if (totalAmount === 0 || (balanceAmount > 0 && balanceAmount < totalAmount)) {
            return 'bg-yellow-100 text-yellow-800';
        } else if (balanceAmount === 0) {
            return 'bg-green-100 text-green-800';
        } else {
            return 'bg-red-100 text-red-800';
        }
    };

    const getPaymentStatusText = (balanceAmount, totalAmount) => {
        if (totalAmount === 0) return 'Unpaid';
        if (balanceAmount === 0) return 'Paid';
        if (balanceAmount > 0 && balanceAmount < totalAmount) return 'Partial';
        return 'Unpaid';
    };

    const filteredOrders = orders.filter(order =>
        (order.poNumber && order.poNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.distributorName && order.distributorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500">Manage your orders to distributors and inventory receiving.</p>
                </div>
                <Link
                    to="/purchase-orders/new"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
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
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-xs font-medium uppercase tracking-wider">
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
                                filteredOrders.map((order) => {
                                    const isReceived = order.status === 'RECEIVED';
                                    const isCancelled = order.status === 'CANCELLED';

                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{order.poNumber}</div>
                                                <div className="text-sm text-gray-500">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{order.distributorName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                                                    {isReceived && <CheckCircle2 size={12} className="mr-1 text-emerald-600" />}
                                                    {order.status ? order.status.replace('_', ' ') : 'DRAFT'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(order.balanceAmount, order.total)}`}>
                                                    {getPaymentStatusText(order.balanceAmount, order.total)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">₹{(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                {order.balanceAmount > 0 && (
                                                    <div className="text-xs text-red-500">Bal: ₹{(order.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {!isReceived && !isCancelled && (
                                                        <button
                                                            onClick={() => handleOpenReceiveModal(order)}
                                                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 shadow-sm"
                                                            title="Receive Purchase Order and update inventory"
                                                            aria-label="Receive Purchase Order"
                                                        >
                                                            <Truck size={14} />
                                                            <span>Receive</span>
                                                        </button>
                                                    )}
                                                    <Link
                                                        to={`/purchase-orders/edit/${order.id}`}
                                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                                        title="Edit / View"
                                                        aria-label="Edit Purchase Order"
                                                    >
                                                        <Edit size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                                                        title="Delete"
                                                        aria-label="Delete Purchase Order"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receive Confirmation Modal */}
            {receivingOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Receive Purchase Order</h3>
                                    <p className="text-xs text-gray-500">{receivingOrder.poNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReceivingOrder(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-2.5 text-sm border border-gray-100">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Distributor:</span>
                                <span className="font-semibold text-gray-800">{receivingOrder.distributorName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Total PO Amount:</span>
                                <span className="font-semibold text-gray-800">₹{(receivingOrder.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Items Count:</span>
                                <span className="font-semibold text-gray-800">{receivingOrder.items?.length || 0} line items</span>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 text-xs mt-2">
                                <strong>Inventory Impact:</strong> All line item quantities will be atomically added to product stock in the catalogue, and distributor balance will be updated.
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setReceivingOrder(null)}
                                disabled={isReceiving}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReceive}
                                disabled={isReceiving}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
                            >
                                <Truck size={16} />
                                {isReceiving ? 'Processing Stock Intake...' : 'Confirm & Receive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderListPage;
