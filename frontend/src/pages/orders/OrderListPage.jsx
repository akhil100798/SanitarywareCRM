import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ShoppingBag, Truck, CreditCard, ChevronRight, Download } from 'lucide-react';
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

    const handleDownloadInvoice = async (id, orderNumber) => {
        const toastId = toast.loading('Generating invoice PDF...');
        try {
            const response = await orderService.downloadInvoicePdf(id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${orderNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Invoice downloaded successfully', { id: toastId });
        } catch (error) {
            toast.error('Failed to download invoice', { id: toastId });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'PROCESSING': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'SHIPPED': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
            case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'UNPAID': return 'badge-unpaid';
            case 'PARTIAL': return 'badge-pending';
            case 'PAID': return 'badge-paid';
            default: return 'badge-neutral';
        }
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Orders</h1>
                    <p className="text-slate-500 text-sm">Fulfill confirmed client sales, record invoice payments, and track shipments.</p>
                </div>
                <Link to="/orders/new" className="btn-primary text-sm">
                    <Plus size={16} />
                    <span>New Order</span>
                </Link>
            </div>

            {/* List Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100">
                    <form onSubmit={(e) => e.preventDefault()} className="relative max-w-lg">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by order # or customer name..."
                            className="input-field pl-10 py-2.5 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Order Details</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Fulfillment Schedule</th>
                                <th className="px-6 py-4">Order Financials</th>
                                <th className="px-6 py-4">Delivery status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                        <span>Fetching order directory...</span>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No order files matching filters.
                                    </td>
                                </tr>
                            ) : (
                                orders
                                    .filter(o => o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) || o.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                <div className="flex items-center space-x-3.5">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                                                        <ShoppingBag size={18} />
                                                    </div>
                                                    <div>
                                                        <Link to={`/orders/edit/${o.id}`} className="text-teal hover:underline font-extrabold">{o.orderNumber}</Link>
                                                        {o.quotationNumber && (
                                                            <div className="text-xxs text-slate-400 font-mono tracking-wider mt-0.5">Ref: {o.quotationNumber}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {o.customerName}
                                            </td>
                                            <td className="px-6 py-4 space-y-1">
                                                <div className="flex items-center text-xs text-slate-600 font-medium">
                                                    <ChevronRight size={12} className="mr-1 text-slate-400" />
                                                    Ordered: {o.orderDate}
                                                </div>
                                                <div className="flex items-center text-xxs text-slate-400">
                                                    <Truck size={12} className="mr-1.5" />
                                                    Ship: {o.deliveryDate || 'Unscheduled'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-slate-950">₹{o.total.toLocaleString()}</div>
                                                <div className="inline-block mt-1">
                                                    <span className={`inline-flex items-center gap-1 font-bold ${getPaymentStatusColor(o.paymentStatus)}`}>
                                                        <CreditCard size={10} />
                                                        <span>{o.paymentStatus}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(o.status)}`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    <button
                                                        onClick={() => handleDownloadInvoice(o.id, o.orderNumber)}
                                                        title="Download Invoice PDF"
                                                        className="p-2 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <Link
                                                        to={`/orders/edit/${o.id}`}
                                                        className="btn-secondary text-xs px-3.5 py-1.5 hover:text-teal rounded-xl transition-all font-semibold"
                                                    >
                                                        Manage
                                                    </Link>
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

export default OrderListPage;
