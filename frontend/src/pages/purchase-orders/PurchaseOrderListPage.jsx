import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Truck, CheckCircle2, X } from 'lucide-react';
import purchaseOrderService from '../../services/purchaseOrderService';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import Modal from '../../components/ui/Modal';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const PurchaseOrderListPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [receivingOrder, setReceivingOrder] = useState(null);
    const [isReceiving, setIsReceiving] = useState(false);
    const confirm = useConfirm();

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try { setLoading(true); setError(null); const response = await purchaseOrderService.getAllPurchaseOrders(0, 100); setOrders(response.content || response || []); }
        catch (error) { setError('Failed to fetch purchase orders'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm('Delete this purchase order?', { confirmLabel: 'Delete', variant: 'danger' });
        if (!ok) return;
        try { await purchaseOrderService.deletePurchaseOrder(id); toast.success('Purchase order deleted'); fetchOrders(); }
        catch (error) { toast.error('Failed to delete'); }
    };

    const handleConfirmReceive = async () => {
        if (!receivingOrder) return;
        try { setIsReceiving(true); await purchaseOrderService.receivePurchaseOrder(receivingOrder.id); toast.success(`PO ${receivingOrder.poNumber} received!`); setReceivingOrder(null); fetchOrders(); }
        catch (error) { toast.error(error.response?.data?.message || 'Failed to receive'); }
        finally { setIsReceiving(false); }
    };

    const getPaymentStatus = (balance, total) => {
        if (!total) return 'UNPAID';
        if (balance === 0) return 'PAID';
        if (balance > 0 && balance < total) return 'PARTIAL';
        return 'UNPAID';
    };

    const filteredOrders = orders.filter(order =>
        (order.poNumber && order.poNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.distributorName && order.distributorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div>
            <PageHeader title="Purchase Orders" description="Manage orders to distributors and inventory receiving."
                actions={<Link to="/purchase-orders/new"><Button><Plus size={16} /> Create PO</Button></Link>} />
            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput label="Search purchase orders" placeholder="Search by PO # or distributor..." value={searchQuery} onChange={setSearchQuery} />
                </div>
                {error ? (<ErrorState message={error} onRetry={fetchOrders} />)
                : loading ? (<LoadingSkeleton rows={5} />)
                : !filteredOrders.length ? (
                    <EmptyState title={searchQuery ? 'No matching orders' : 'No purchase orders found'} description={searchQuery ? 'Try a different search term.' : 'Create your first purchase order.'} />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th>PO Details</th>
                                    <th>Distributor</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th className="numeric">Amount</th>
                                    <th className="numeric">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const isReceived = order.status === 'RECEIVED';
                                    const isCancelled = order.status === 'CANCELLED';
                                    return (
                                        <tr key={order.id}>
                                            <td>
                                                <div className="record-name">{order.poNumber}</div>
                                                <div className="record-meta">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}</div>
                                            </td>
                                            <td><span className="font-semibold">{order.distributorName}</span></td>
                                            <td><StatusBadge status={order.status} /></td>
                                            <td><StatusBadge status={getPaymentStatus(order.balanceAmount, order.total)} /></td>
                                            <td className="numeric">
                                                <div className="font-semibold">₹{(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                {order.balanceAmount > 0 && <div className="record-meta" style={{ color: 'var(--danger)' }}>Bal: ₹{(order.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
                                            </td>
                                            <td className="numeric">
                                                <div className="flex justify-end gap-1">
                                                    {!isReceived && !isCancelled && (
                                                        <Button variant="secondary" size="sm" onClick={() => setReceivingOrder(order)}>
                                                            <Truck size={14} /> Receive
                                                        </Button>
                                                    )}
                                                    <Link to={`/purchase-orders/edit/${order.id}`}><IconButton label="Edit PO"><Edit size={16} /></IconButton></Link>
                                                    <IconButton label="Delete PO" onClick={() => handleDelete(order.id)}><Trash2 size={16} /></IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal open={!!receivingOrder} onClose={() => setReceivingOrder(null)} title="Receive Purchase Order">
                {receivingOrder && (
                    <div className="space-y-4">
                        <div className="surface">
                            <div className="flex justify-between text-sm"><span className="text-secondary">Distributor:</span><span className="font-semibold">{receivingOrder.distributorName}</span></div>
                            <div className="flex justify-between text-sm mt-2"><span className="text-secondary">PO Amount:</span><span className="font-semibold">₹{(receivingOrder.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-sm mt-2"><span className="text-secondary">Items:</span><span className="font-semibold">{receivingOrder.items?.length || 0} line items</span></div>
                        </div>
                        <div className="error-panel" style={{ background: 'var(--success-soft)', borderColor: 'var(--success)', color: 'var(--success)' }}>
                            <strong>Inventory Impact:</strong> All line item quantities will be added to product stock.
                        </div>
                        <div className="form-actions">
                            <Button variant="secondary" onClick={() => setReceivingOrder(null)} disabled={isReceiving}>Cancel</Button>
                            <Button onClick={handleConfirmReceive} loading={isReceiving}>{isReceiving ? 'Receiving...' : 'Confirm & Receive'}</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PurchaseOrderListPage;