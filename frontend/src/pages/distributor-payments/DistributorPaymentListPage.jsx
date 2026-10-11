import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowUpRight } from 'lucide-react';
import distributorPaymentService from '../../services/distributorPaymentService';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const DistributorPaymentListPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const confirm = useConfirm();

    useEffect(() => { fetchPayments(); }, []);

    const fetchPayments = async () => {
        try { setLoading(true); setError(null); const response = await distributorPaymentService.getAllPayments(0, 100); setPayments(response.content); }
        catch (error) { setError('Failed to fetch payments'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm('Delete this payment? This will revert the distributor balance and PO amounts.', { confirmLabel: 'Delete', variant: 'danger' });
        if (!ok) return;
        try { await distributorPaymentService.deletePayment(id); toast.success('Payment deleted'); fetchPayments(); }
        catch (error) { toast.error('Failed to delete payment'); }
    };

    const filteredPayments = payments.filter(payment =>
        (payment.paymentNumber && payment.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (payment.distributorName && payment.distributorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (payment.referenceNumber && payment.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div>
            <PageHeader title="Distributor Payments" description="Manage payments made to your suppliers."
                actions={<Link to="/distributor-payments/new"><Button><Plus size={16} /> Record Payment</Button></Link>} />
            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput label="Search payments" placeholder="Search by receipt, distributor or reference..." value={searchQuery} onChange={setSearchQuery} />
                </div>
                {error ? (<ErrorState message={error} onRetry={fetchPayments} />)
                : loading ? (<LoadingSkeleton rows={5} />)
                : !filteredPayments.length ? (
                    <EmptyState title={searchQuery ? 'No matching payments' : 'No payments found'} description={searchQuery ? 'Try a different search term.' : 'Record your first supplier payment.'} />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th>Payment Info</th>
                                    <th>Distributor & PO</th>
                                    <th>Method & Ref</th>
                                    <th className="numeric">Amount</th>
                                    <th className="numeric">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(payment => (
                                    <tr key={payment.id}>
                                        <td>
                                            <div className="record-name">{payment.paymentNumber}</div>
                                            <div className="record-meta">{new Date(payment.paymentDate).toLocaleDateString()}</div>
                                        </td>
                                        <td>
                                            <div className="font-semibold">{payment.distributorName}</div>
                                            {payment.poNumber && <div className="record-meta">PO: {payment.poNumber}</div>}
                                        </td>
                                        <td>
                                            <StatusBadge status={payment.paymentMethod} />
                                            <div className="record-meta">{payment.referenceNumber || '—'}</div>
                                        </td>
                                        <td className="numeric"><span className="font-semibold" style={{ color: 'var(--danger)' }}>₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                                        <td className="numeric">
                                            <div className="flex justify-end gap-1">
                                                <Link to={`/distributor-payments/edit/${payment.id}`}><IconButton label="View payment"><Edit size={16} /></IconButton></Link>
                                                <IconButton label="Delete payment" onClick={() => handleDelete(payment.id)}><Trash2 size={16} /></IconButton>
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

export default DistributorPaymentListPage;