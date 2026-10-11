import React, { useState, useEffect } from 'react';
import { CreditCard, User } from 'lucide-react';
import paymentService from '../../services/paymentService';
import { filterPayments } from '../../utils/paymentSearch';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const PaymentListPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchPayments(); }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await paymentService.getAll();
            setPayments(response.data);
        } catch (error) {
            setError('Failed to fetch payments');
        } finally { setLoading(false); }
    };

    const filteredPayments = filterPayments(payments, searchQuery);

    return (
        <div>
            <PageHeader title="Payments" description="Track and manage customer payments and receipts." />
            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput label="Search payments" placeholder="Search by payment # or order..." value={searchQuery} onChange={setSearchQuery} />
                </div>
                {error ? (<ErrorState message={error} onRetry={fetchPayments} />)
                : loading ? (<LoadingSkeleton rows={5} />)
                : !filteredPayments.length ? (
                    <EmptyState title={searchQuery ? 'No matching payments' : 'No payments found'} description={searchQuery ? 'Try a different search term.' : 'No payments recorded yet.'} />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th>Receipt #</th>
                                    <th>Order #</th>
                                    <th>Date</th>
                                    <th className="numeric">Amount</th>
                                    <th>Method</th>
                                    <th>Received By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(p => (
                                    <tr key={p.id}>
                                        <td><span className="font-semibold">{p.receiptNumber || p.id}</span></td>
                                        <td><span className="flex items-center gap-1 text-sm"><CreditCard size={14} className="text-muted" /> {p.orderNumber}</span></td>
                                        <td><span className="text-sm">{p.paymentDate}</span></td>
                                        <td className="numeric"><span className="font-semibold">₹{p.amount.toLocaleString()}</span></td>
                                        <td><StatusBadge status={p.paymentMethod} /></td>
                                        <td><span className="flex items-center gap-1 text-sm"><User size={14} className="text-muted" /> {p.receivedByName}</span></td>
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

export default PaymentListPage;