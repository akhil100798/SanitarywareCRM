import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Download, CheckCircle, XCircle } from 'lucide-react';
import quotationService from '../../services/quotationService';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const QuotationListPage = () => {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchQuotations(); }, []);

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await quotationService.getAll({ size: 100, sort: 'createdAt,desc' });
            setQuotations(response.data.content);
        } catch (error) {
            setError('Failed to fetch quotations');
        } finally { setLoading(false); }
    };

    const handleDownloadPdf = async (id, quotationNumber) => {
        const toastId = toast.loading('Generating PDF...');
        try {
            const response = await quotationService.downloadPdf(id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `quotation-${quotationNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded', { id: toastId });
        } catch (error) {
            toast.error('Failed to download PDF', { id: toastId });
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await quotationService.updateStatus(id, status);
            toast.success(`Quotation marked as ${status.toLowerCase()}`);
            fetchQuotations();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const filtered = quotations.filter(q =>
        q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <PageHeader
                title="Sales Quotations"
                description="Issue estimates, track approvals, and print PDF quotations."
                actions={<Button as={Link} to="/quotations/new"><Plus size={16} /> New Quotation</Button>}
            />
            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput
                        label="Search quotations"
                        placeholder="Search by quote # or customer..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </div>
                {error ? (<ErrorState message={error} onRetry={fetchQuotations} />)
                : loading ? (<LoadingSkeleton rows={5} />)
                : !filtered.length ? (
                    <EmptyState title={searchQuery ? 'No matching quotations' : 'No quotations found'} description={searchQuery ? 'Try a different search term.' : 'Create your first quotation.'} />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th>Quote Number</th>
                                    <th>Customer</th>
                                    <th>Timeline</th>
                                    <th className="numeric">Total</th>
                                    <th>Status</th>
                                    <th className="numeric">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(q => (
                                    <tr key={q.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-muted" />
                                                <Link to={`/quotations/edit/${q.id}`} className="record-name hover:underline" data-testid={`quotation-edit-${q.id}`}>{q.quotationNumber}</Link>
                                            </div>
                                        </td>
                                        <td><span className="font-semibold">{q.customerName}</span></td>
                                        <td>
                                            <div className="text-sm">Issued: {q.quotationDate}</div>
                                            <div className="record-meta">Expires: {q.validUntil}</div>
                                        </td>
                                        <td className="numeric">
                                            <div className="font-semibold">₹{q.total.toLocaleString()}</div>
                                            <div className="record-meta">Subtotal: ₹{q.subtotal.toLocaleString()}</div>
                                        </td>
                                        <td><StatusBadge status={q.status} /></td>
                                        <td className="numeric">
                                            <div className="flex justify-end gap-1">
                                                <IconButton label="Download PDF" onClick={() => handleDownloadPdf(q.id, q.quotationNumber)}><Download size={16} /></IconButton>
                                                {(q.status === 'DRAFT' || q.status === 'SENT') && (
                                                    <IconButton label="Mark Accepted" onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}><CheckCircle size={16} /></IconButton>
                                                )}
                                                {q.status !== 'CONVERTED' && q.status !== 'REJECTED' && (
                                                    <IconButton label="Mark Rejected" onClick={() => handleStatusUpdate(q.id, 'REJECTED')}><XCircle size={16} /></IconButton>
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

export default QuotationListPage;
