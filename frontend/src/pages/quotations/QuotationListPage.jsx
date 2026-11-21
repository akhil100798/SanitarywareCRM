import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText, Download, CheckCircle, XCircle, Share2, MessageCircle, Sparkles, Truck, X, RotateCcw, AlertCircle } from 'lucide-react';
import quotationService from '../../services/quotationService';
import toast from 'react-hot-toast';
import GenerateBackToBackPoModal from './GenerateBackToBackPoModal';
import ShareWhatsAppModal from './ShareWhatsAppModal';

const QuotationListPage = () => {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQuotationForPo, setSelectedQuotationForPo] = useState(null);
    const [selectedQuotationForWhatsApp, setSelectedQuotationForWhatsApp] = useState(null);

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await quotationService.getAll({ size: 100 });
            setQuotations(response.data.content);
        } catch (err) {
            setError(err);
            toast.error(!navigator.onLine ? 'Network disconnected' : 'Failed to fetch quotations');
        } finally {
            setLoading(false);
        }
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
            toast.success('PDF downloaded successfully', { id: toastId });
        } catch (error) {
            toast.error('Failed to download PDF', { id: toastId });
        }
    };

    const handleCopyShareLink = (shareToken) => {
        if (!shareToken) {
            toast.error('Quotation link is being prepared. Please refresh in a moment.');
            return;
        }
        const url = `${window.location.origin}/portal/quotations/${shareToken}`;
        navigator.clipboard.writeText(url).then(
            () => toast.success('Customer portal link copied to clipboard!'),
            () => toast.error('Failed to copy link')
        );
    };

    const handleSendWhatsApp = async (id, customerName) => {
        const toastId = toast.loading(`Sending WhatsApp notification to ${customerName || 'customer'}...`);
        try {
            const response = await quotationService.sendWhatsApp(id, {});
            if (response.data.status === 'SENT') {
                toast.success('Quotation dispatched via WhatsApp!', { id: toastId });
            } else if (response.data.status === 'SIMULATED') {
                toast.success('Sandbox mode: WhatsApp notification simulated successfully!', { id: toastId });
            } else {
                toast.error(response.data.detail || 'WhatsApp transmission failed', { id: toastId });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send WhatsApp message', { id: toastId });
        }
    };

    const handleStatusUpdate = async (id, status) => {
        let reason = null;
        if (status === 'REJECTED') {
            reason = window.prompt('Please enter the reason for rejecting this quotation (e.g. Competitor chosen, Price too high, Project delayed):');
            if (reason === null) return; // User cancelled prompt
        }
        try {
            await quotationService.updateStatus(id, status, reason);
            toast.success(`Quotation marked as ${status.toLowerCase()}`);
            fetchQuotations();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-50 text-slate-600 border-slate-200';
            case 'SENT': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'ACCEPTED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'EXPIRED': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'CONVERTED': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Quotations</h1>
                    <p className="text-slate-500 text-sm">Issue commercial estimates, track client approvals, and print PDF quotations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/quotations/new?importBoq=true"
                        className="px-4 py-2.5 rounded-xl border border-teal/30 bg-teal/5 text-teal hover:bg-teal/15 flex items-center gap-2 text-sm font-semibold transition-all shadow-sm"
                    >
                        <Sparkles size={16} className="text-teal" />
                        <span>Import BOQ / Excel</span>
                    </Link>
                    <Link to="/quotations/new" className="btn-primary text-sm">
                        <Plus size={16} />
                        <span>New Quotation</span>
                    </Link>
                </div>
            </div>

            {/* List Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100">
                    <form onSubmit={(e) => e.preventDefault()} className="relative max-w-lg">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by quote #, customer name, or phone number..."
                            className="input-field pl-10 pr-9 py-2.5 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && searchQuery.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Quote Number</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Timeline</th>
                                <th className="px-6 py-4">Total Amount</th>
                                <th className="px-6 py-4">Approval Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                        <span>Fetching quotations...</span>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <AlertCircle className="w-8 h-8 text-amber-500" />
                                            <div className="text-sm font-semibold text-slate-700">
                                                {!navigator.onLine ? 'Network disconnected. Please check your internet connection.' : 'Failed to fetch quotations.'}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchQuotations}
                                                className="btn-primary text-xs px-4 py-2"
                                            >
                                                <RotateCcw size={14} /> Retry
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : quotations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No quotation entries located.
                                    </td>
                                </tr>
                            ) : (
                                quotations
                                    .filter(q => {
                                        const cleanSearch = searchQuery.trim().toLowerCase();
                                        if (!cleanSearch) return true;
                                        if (q.quotationNumber && q.quotationNumber.toLowerCase().includes(cleanSearch)) return true;
                                        if (q.customerName && q.customerName.toLowerCase().includes(cleanSearch)) return true;
                                        const phone = q.customerPhone || q.customer?.phoneNumber || '';
                                        if (phone) {
                                            if (phone.toLowerCase().includes(cleanSearch)) return true;
                                            const phoneDigits = phone.replace(/\D/g, '');
                                            const searchDigits = cleanSearch.replace(/\D/g, '');
                                            if (searchDigits && phoneDigits && (phoneDigits.includes(searchDigits) || searchDigits.includes(phoneDigits))) return true;
                                        }
                                        return false;
                                    })
                                    .map((q) => (
                                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                <div className="flex items-center space-x-3.5">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div>
                                                        <Link to={`/quotations/edit/${q.id}`} className="text-teal hover:underline font-extrabold">{q.quotationNumber}</Link>
                                                        <div className="text-xxs text-slate-600 font-medium tracking-wide mt-0.5">ID: {q.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700">{q.customerName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-slate-700 font-medium">Issued: {q.quotationDate}</div>
                                                <div className="text-xxs text-slate-600 mt-0.5">Expires: {q.validUntil}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-slate-900">₹{q.total.toLocaleString()}</div>
                                                <div className="text-xxs text-slate-600 mt-0.5">Excl. Tax: ₹{q.subtotal.toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(q.status)}`}>
                                                    {q.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    <button
                                                        onClick={() => setSelectedQuotationForWhatsApp(q)}
                                                        title="Share Quotation & Portal Link"
                                                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedQuotationForWhatsApp(q)}
                                                        title="Share via WhatsApp & Dynamic QR"
                                                        className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPdf(q.id, q.quotationNumber)}
                                                        title="Download PDF"
                                                        className="p-2 text-slate-600 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedQuotationForPo(q)}
                                                        title="Generate Back-to-Back Purchase Orders"
                                                        className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                    >
                                                        <Truck size={16} />
                                                    </button>
                                                    {(q.status === 'DRAFT' || q.status === 'SENT') && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}
                                                            title="Mark Accepted"
                                                            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    {q.status !== 'CONVERTED' && q.status !== 'REJECTED' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(q.id, 'REJECTED')}
                                                            title="Mark Rejected"
                                                            className="p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-all"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedQuotationForPo && (
                <GenerateBackToBackPoModal
                    isOpen={!!selectedQuotationForPo}
                    onClose={() => setSelectedQuotationForPo(null)}
                    quotation={selectedQuotationForPo}
                    onOrdersCreated={() => {
                        fetchQuotations();
                    }}
                />
            )}

            {selectedQuotationForWhatsApp && (
                <ShareWhatsAppModal
                    isOpen={!!selectedQuotationForWhatsApp}
                    onClose={() => setSelectedQuotationForWhatsApp(null)}
                    quotation={selectedQuotationForWhatsApp}
                    onSuccess={() => {
                        fetchQuotations();
                    }}
                />
            )}
        </div>
    );
};

export default QuotationListPage;
