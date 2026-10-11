import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingBag, ChevronRight, Truck, Download } from 'lucide-react';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const OrderListPage = () => {
    const user = useAuthStore((state) => state.user);
    const canManageOrders = ['ADMIN', 'MANAGER', 'SALES'].includes(user?.role);
    const canUpdateFulfillment = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'].includes(user?.role);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await orderService.getAll({ size: 100 });
            setOrders(response.data.content);
        } catch (error) {
            setError('Failed to fetch orders');
        } finally { setLoading(false); }
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
            toast.success('Invoice downloaded', { id: toastId });
        } catch (error) {
            toast.error('Failed to download invoice', { id: toastId });
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            setUpdatingStatusId(id);
            await orderService.updateStatus(id, status);
            setOrders(current => current.map(o => o.id === id ? { ...o, status } : o));
            toast.success('Order status updated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update order status');
        } finally { setUpdatingStatusId(null); }
    };

    const filtered = orders.filter(o =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <PageHeader
                title="Customer Orders"
                description="Fulfill confirmed sales, record payments, and track shipments."
                actions={canManageOrders && <Link to="/orders/new"><Button><Plus size={16} /> New Order</Button></Link>}
            />
            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput label="Search orders" placeholder="Search by order # or customer..." value={searchQuery} onChange={setSearchQuery} />
                </div>
                {error ? (<ErrorState message={error} onRetry={fetchOrders} />)
                : loading ? (<LoadingSkeleton rows={5} />)
                : !filtered.length ? (
                    <EmptyState title={searchQuery ? 'No matching orders' : 'No orders found'} description={searchQuery ? 'Try a different search term.' : 'Create your first order.'} />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table" style={{ minWidth: 900 }}>
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Schedule</th>
                                    <th className="numeric">Financials</th>
                                    <th>Status</th>
                                    <th className="numeric">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(o => (
                                    <tr key={o.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag size={16} className="text-muted" />
                                                {canManageOrders
                                                    ? <Link to={`/orders/edit/${o.id}`} className="record-name hover:underline">{o.orderNumber}</Link>
                                                    : <span className="font-semibold">{o.orderNumber}</span>}
                                            </div>
                                            {o.quotationNumber && <div className="record-meta">Ref: {o.quotationNumber}</div>}
                                        </td>
                                        <td><span className="font-semibold">{o.customerName}</span></td>
                                        <td>
                                            <div className="flex items-center text-sm"><ChevronRight size={14} className="mr-1 text-muted" /> {o.orderDate}</div>
                                            <div className="flex items-center record-meta"><Truck size={12} className="mr-1" /> Ship: {o.deliveryDate || 'Unscheduled'}</div>
                                        </td>
                                        <td className="numeric">
                                            <div className="font-semibold">₹{o.total.toLocaleString()}</div>
                                            <div className="mt-1"><StatusBadge status={o.paymentStatus} /></div>
                                        </td>
                                        <td>
                                            <StatusBadge status={o.status} />
                                            {canUpdateFulfillment && o.status !== 'CANCELLED' && (
                                                <select
                                                    aria-label={`Update status for ${o.orderNumber}`}
                                                    className="input-field mt-2"
                                                    style={{ padding: '6px 8px', minHeight: 34, fontSize: 13 }}
                                                    value={o.status}
                                                    disabled={updatingStatusId === o.id}
                                                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                                                >
                                                    {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td className="numeric">
                                            <div className="flex justify-end gap-1">
                                                {canManageOrders && (
                                                    <>
                                                        <IconButton label="Download invoice" onClick={() => handleDownloadInvoice(o.id, o.orderNumber)}><Download size={16} /></IconButton>
                                                        <Link to={`/orders/edit/${o.id}`}><Button variant="secondary" size="sm">Manage</Button></Link>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderListPage;