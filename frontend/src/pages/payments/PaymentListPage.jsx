import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard, Calendar, User, ShoppingBag, MessageCircle, X, Download, Printer } from 'lucide-react';
import paymentService from '../../services/paymentService';
import { filterPayments } from '../../utils/paymentSearch';
import toast from 'react-hot-toast';

const PaymentListPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [activeReceiptModal, setActiveReceiptModal] = useState(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await paymentService.getAll();
            setPayments(response.data);
        } catch (error) {
            toast.error('Failed to fetch payments');
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = async (id, paymentNumber) => {
        const toastId = toast.loading(`Sending WhatsApp receipt for ${paymentNumber}...`);
        try {
            const response = await paymentService.sendWhatsApp(id, {});
            if (response.data.status === 'SENT') {
                toast.success('Payment receipt dispatched via WhatsApp!', { id: toastId });
            } else if (response.data.status === 'SIMULATED') {
                toast.success('Sandbox mode: Receipt notification simulated successfully!', { id: toastId });
            } else {
                toast.error(response.data.detail || 'WhatsApp transmission failed', { id: toastId });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send WhatsApp receipt', { id: toastId });
        }
    };

    const searchedPayments = filterPayments(payments, searchQuery);
    const filteredPayments = searchedPayments.filter((p) => {
        if (methodFilter === 'ALL') return true;
        return p.paymentMethod?.toUpperCase() === methodFilter;
    });

    const handleExportCsv = () => {
        if (!filteredPayments || filteredPayments.length === 0) {
            toast.error('No payments to export');
            return;
        }

        const escapeCell = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const headers = ['Receipt Number', 'Order Number', 'Customer', 'Date', 'Amount', 'Payment Method', 'Reference Number', 'Received By', 'Notes'];
        const rows = filteredPayments.map((p) => [
            escapeCell(p.paymentNumber || `REC-${p.id}`), // BUG-133: Exports formatted receipt number
            escapeCell(p.orderNumber || ''),
            escapeCell(p.customerName || ''),
            escapeCell(p.paymentDate || ''),
            escapeCell(p.amount != null ? Number(p.amount).toFixed(2) : '0.00'),
            escapeCell(p.paymentMethod || ''),
            escapeCell(p.referenceNumber || ''),
            escapeCell(p.receivedByName || ''),
            escapeCell(p.notes || '')
        ]);

        const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredPayments.length} payment records`);
    };

    const handlePrintReceipt = (payment) => {
        setActiveReceiptModal(payment);
    };

    const getPaymentMethodBadge = (method) => {
        switch (method?.toUpperCase()) {
            case 'CASH':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'UPI':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'CARD':
            case 'CREDIT_CARD':
            case 'DEBIT_CARD':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'CHEQUE':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'NEFT':
            case 'RTGS':
            case 'BANK_TRANSFER':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                            {filteredPayments.length} {filteredPayments.length === 1 ? 'record' : 'records'}
                        </span>
                    </div>
                    <p className="text-gray-500">Track and manage customer payments and receipts.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
                        title="Export filtered payments to CSV"
                    >
                        <Download size={14} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by customer, payment #, order, notes..."
                            className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && searchQuery.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Method:</span>
                        <select
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Receipt #</th>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4">Received By</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-10 text-center text-gray-500">No payments found.</td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                             <div className="flex items-center">
                                                 <CreditCard size={18} className="text-gray-400 mr-2" />
                                                 <span className="font-medium text-gray-900">{p.paymentNumber}</span>
                                             </div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <div className="flex items-center text-blue-600">
                                                 <ShoppingBag size={16} className="mr-1" />
                                                 <span className="font-medium">{p.orderNumber}</span>
                                             </div>
                                         </td>
                                         <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                             {p.customerName || '—'}
                                         </td>
                                         <td className="px-6 py-4 text-sm text-gray-600">
                                             <div className="flex items-center">
                                                 <Calendar size={14} className="mr-1" /> {p.paymentDate}
                                             </div>
                                         </td>
                                         <td className="px-6 py-4 font-bold text-green-600">
                                             ₹{p.amount != null ? Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                         </td>
                                         <td className="px-6 py-4 text-sm">
                                             <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getPaymentMethodBadge(p.paymentMethod)}`}>
                                                 {p.paymentMethod}
                                             </span>
                                         </td>
                                         <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate" title={p.notes || ''}>
                                             {p.notes || '—'}
                                         </td>
                                         <td className="px-6 py-4 text-sm text-gray-600">
                                             <div className="flex items-center">
                                                 <User size={14} className="mr-1" /> {p.receivedByName || '—'}
                                             </div>
                                         </td>
                                         <td className="px-6 py-4 text-right">
                                             <div className="flex items-center justify-end gap-1.5">
                                                 <button
                                                     onClick={() => handlePrintReceipt(p)}
                                                     title="Print Payment Receipt"
                                                     className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                                                 >
                                                     <Printer size={13} />
                                                     Print
                                                 </button>
                                                 <button
                                                     onClick={() => handleSendWhatsApp(p.id, p.paymentNumber)}
                                                     title="Send WhatsApp Receipt"
                                                     className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                                                 >
                                                     <MessageCircle size={13} />
                                                     WhatsApp
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

            {/* Formal Payment Receipt Print Modal (BUG-130: Header includes Store GSTIN) */}
            {activeReceiptModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Payment Receipt</h3>
                            <button
                                type="button"
                                onClick={() => setActiveReceiptModal(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div id="payment-receipt-print-area" className="p-4 border border-dashed border-slate-200 rounded-xl space-y-3 bg-slate-50/50 text-xs">
                            <div className="text-center border-b border-slate-200 pb-2">
                                <h4 className="font-bold text-sm text-slate-900 uppercase">Sanitaryware Store CRM</h4>
                                <p className="text-slate-500">Main Commercial Hub, Industrial Area, Bangalore</p>
                                <p className="font-bold text-slate-700 mt-0.5">GSTIN: 29AABCU9603R1ZM</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-slate-700">
                                <div><span className="text-slate-400">Receipt #:</span> <strong>{activeReceiptModal.paymentNumber}</strong></div>
                                <div><span className="text-slate-400">Order #:</span> <strong>{activeReceiptModal.orderNumber}</strong></div>
                                <div><span className="text-slate-400">Date:</span> {activeReceiptModal.paymentDate}</div>
                                <div><span className="text-slate-400">Method:</span> {activeReceiptModal.paymentMethod}</div>
                                <div className="col-span-2"><span className="text-slate-400">Customer:</span> <strong>{activeReceiptModal.customerName || 'Direct Customer'}</strong></div>
                                {activeReceiptModal.referenceNumber && (
                                    <div className="col-span-2"><span className="text-slate-400">Ref / Txn #:</span> {activeReceiptModal.referenceNumber}</div>
                                )}
                                {activeReceiptModal.notes && (
                                    <div className="col-span-2"><span className="text-slate-400">Notes:</span> {activeReceiptModal.notes}</div>
                                )}
                            </div>
                            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm">
                                <span className="font-bold text-slate-900">Amount Received:</span>
                                <span className="font-extrabold text-emerald-700 text-base">₹{Number(activeReceiptModal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-right text-xxs text-slate-400 pt-1">
                                Received by: {activeReceiptModal.receivedByName || 'Authorized Cashier'}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveReceiptModal(null)}
                                className="btn-secondary text-xs px-4 py-2"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    window.print();
                                }}
                                className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                            >
                                <Printer size={14} />
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentListPage;
