import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, CheckCircle, Clock, AlertTriangle, Printer, Building2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import quotationService from '../../services/quotationService';

const CustomerPortalPage = () => {
    const { token } = useParams();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('No quotation token provided in URL.');
            setLoading(false);
            return;
        }
        fetchQuotation();
    }, [token]);

    const fetchQuotation = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await quotationService.getByShareToken(token);
            setQuotation(response.data);
        } catch (err) {
            console.error('Failed to load quotation from portal:', err);
            setError(err.response?.data?.message || 'Quotation not found or link has expired.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            const response = await quotationService.downloadPortalPdf(token);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `quotation-${quotation.quotationNumber || 'document'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Quotation PDF downloaded successfully');
        } catch (err) {
            console.error('Failed to download PDF:', err);
            toast.error('Failed to download PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const handleAcceptQuotation = async () => {
        if (!window.confirm('Are you sure you want to approve and accept this quotation?')) {
            return;
        }
        try {
            setAccepting(true);
            const response = await quotationService.acceptPortalQuotation(token);
            setQuotation(response.data);
            toast.success('Quotation accepted successfully! Our sales team has been notified.');
        } catch (err) {
            console.error('Failed to accept quotation:', err);
            toast.error(err.response?.data?.message || 'Failed to accept quotation.');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading your quotation...</p>
                </div>
            </div>
        );
    }

    if (error || !quotation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Quotation Unavailable</h2>
                    <p className="text-slate-600 mb-6">{error || 'Unable to access quotation details.'}</p>
                    <p className="text-xs text-slate-400">If you believe this is an error, please contact your sales representative.</p>
                </div>
            </div>
        );
    }

    const isAccepted = quotation.status === 'ACCEPTED' || quotation.status === 'CONVERTED';
    const isExpired = quotation.status === 'EXPIRED';

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Brand Bar */}
                <header className="bg-white rounded-t-2xl shadow-sm border border-slate-200 border-b-0 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sanitaryware Store</h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">Customer Self-Service Quotation Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={downloading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition"
                        >
                            <Download className="w-4 h-4" />
                            {downloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                    </div>
                </header>

                {/* Status Notice */}
                {isAccepted && (
                    <div className="bg-emerald-50 border-x border-emerald-200 p-4 flex items-center gap-3 text-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium">
                            This quotation was approved and accepted. Our fulfillment team is processing your order.
                        </span>
                    </div>
                )}
                {isExpired && (
                    <div className="bg-amber-50 border-x border-amber-200 p-4 flex items-center gap-3 text-amber-800">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="text-sm font-medium">
                            This quotation has reached its expiration date ({quotation.validUntil}). Please request a revised quote.
                        </span>
                    </div>
                )}

                {/* Main Card */}
                <main className="bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
                    {/* Quotation Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
                        <div>
                            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Quotation For</span>
                            <h2 className="text-lg font-bold text-slate-900 mt-1">{quotation.customerName || 'Valued Customer'}</h2>
                            <p className="text-sm text-slate-600 mt-0.5">Account ID: #{quotation.customerId}</p>
                        </div>
                        <div className="sm:text-right">
                            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Estimate Details</span>
                            <p className="text-xl font-extrabold text-indigo-600 mt-1">{quotation.quotationNumber}</p>
                            <p className="text-sm text-slate-600 mt-0.5">Date: {quotation.quotationDate}</p>
                            <p className="text-sm text-slate-600">Valid Until: {quotation.validUntil}</p>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Item & Description</th>
                                    <th className="py-3 px-4">SKU</th>
                                    <th className="py-3 px-4 text-center">Qty</th>
                                    <th className="py-3 px-4 text-right">Unit Price</th>
                                    <th className="py-3 px-4 text-right">Line Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800">
                                {quotation.items && quotation.items.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-900">{item.productName || 'Sanitaryware Product'}</p>
                                            {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{item.productSku || '-'}</td>
                                        <td className="py-3 px-4 text-center font-medium">{item.quantity}</td>
                                        <td className="py-3 px-4 text-right font-medium">Rs. {Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900">Rs. {Number(item.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="max-w-md">
                            {quotation.notes && (
                                <div className="mb-4">
                                    <span className="text-xs font-semibold uppercase text-slate-400">Notes</span>
                                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{quotation.notes}</p>
                                </div>
                            )}
                            {quotation.termsAndConditions && (
                                <div>
                                    <span className="text-xs font-semibold uppercase text-slate-400">Terms & Conditions</span>
                                    <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{quotation.termsAndConditions}</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full sm:w-72 bg-slate-50 rounded-xl p-5 border border-slate-200 text-sm space-y-2.5">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-medium">Rs. {Number(quotation.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {Number(quotation.discount || 0) > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>Discount</span>
                                    <span className="font-medium">- Rs. {Number(quotation.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-600">
                                <span>GST Tax ({quotation.taxPercentage || 0}%)</span>
                                <span className="font-medium">Rs. {Number(quotation.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-300 flex justify-between text-base font-extrabold text-slate-900">
                                <span>Grand Total</span>
                                <span className="text-indigo-600">Rs. {Number(quotation.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Online Action Footer */}
                    {!isAccepted && !isExpired && (
                        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                            <div>
                                <h3 className="font-bold text-slate-900">Ready to proceed?</h3>
                                <p className="text-xs text-slate-600 mt-0.5">Click below to approve this quotation and initiate order processing.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAcceptQuotation}
                                disabled={accepting}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-200 transition"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {accepting ? 'Accepting Quotation...' : 'Accept & Approve Quotation'}
                            </button>
                        </div>
                    )}
                </main>

                {/* Trust Footer */}
                <footer className="bg-slate-50 rounded-b-2xl border border-slate-200 border-t-0 p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Secure Tokenized Quotation • Sanitaryware CRM Enterprise</span>
                </footer>
            </div>
        </div>
    );
};

export default CustomerPortalPage;
