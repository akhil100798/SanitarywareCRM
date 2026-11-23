import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Bell, AlertTriangle, Send, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import notificationService from '../services/notificationService';

export const NotificationDispatchModal = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [channelFilter, setChannelFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [retryingId, setRetryingId] = useState(null);
    const [triggeringType, setTriggeringType] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, size: 10 };
            if (channelFilter) params.channel = channelFilter;
            if (statusFilter) params.status = statusFilter;

            const res = await notificationService.getDispatchLogs(params);
            const data = res.data;
            setLogs(data.content || []);
            setTotalPages(data.totalPages || 1);
            setTotalElements(data.totalElements || 0);
        } catch (err) {
            console.error('Failed to load notification logs', err);
            toast.error('Failed to load dispatch logs');
        } finally {
            setLoading(false);
        }
    }, [page, channelFilter, statusFilter]);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, fetchLogs]);

    if (!isOpen) return null;

    const handleRetry = async (id) => {
        setRetryingId(id);
        try {
            const res = await notificationService.retryDispatch(id);
            toast.success(`Dispatched retry (${res.data?.deliveryStatus || 'COMPLETED'})`);
            fetchLogs();
        } catch (err) {
            console.error('Retry failed', err);
            toast.error(err.response?.data?.message || 'Failed to retry dispatch');
        } finally {
            setRetryingId(null);
        }
    };

    const handleTrigger = async (type) => {
        setTriggeringType(type);
        try {
            if (type === 'low-stock') {
                const res = await notificationService.triggerLowStock();
                toast.success(res.data?.message || 'Low stock check triggered');
            } else if (type === 'payment-due') {
                const res = await notificationService.triggerPaymentDue();
                toast.success(res.data?.message || 'Payment reminders triggered');
            }
            fetchLogs();
        } catch (err) {
            console.error('Trigger check failed', err);
            toast.error('Failed to execute notification check');
        } finally {
            setTriggeringType(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'SENT':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} /> Sent
                    </span>
                );
            case 'SIMULATED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                        <Clock size={11} /> Simulated
                    </span>
                );
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle size={11} /> Failed
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-slate-100 text-slate-700">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title"
        >
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
                            <Bell size={22} />
                        </div>
                        <div>
                            <h2 id="notification-modal-title" className="text-lg font-black text-slate-900 tracking-tight">
                                Automated Notification Dispatch Center
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Audit history, channel deliveries (Email & WhatsApp), and manual dispatch retries.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                        aria-label="Close dialog"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Quick actions & filters bar */}
                <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={channelFilter}
                            onChange={(e) => {
                                setChannelFilter(e.target.value);
                                setPage(0);
                            }}
                            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                            aria-label="Filter by notification channel"
                        >
                            <option value="">All Channels</option>
                            <option value="EMAIL">Email</option>
                            <option value="WHATSAPP">WhatsApp</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(0);
                            }}
                            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                            aria-label="Filter by delivery status"
                        >
                            <option value="">All Delivery Statuses</option>
                            <option value="SENT">Sent</option>
                            <option value="SIMULATED">Simulated (Mock/Fallback)</option>
                            <option value="FAILED">Failed</option>
                        </select>

                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleTrigger('low-stock')}
                            disabled={triggeringType !== null}
                            className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 transition-all disabled:opacity-50"
                        >
                            <AlertTriangle size={13} className={triggeringType === 'low-stock' ? 'animate-spin' : ''} />
                            Check Low Stock
                        </button>
                        <button
                            onClick={() => handleTrigger('payment-due')}
                            disabled={triggeringType !== null}
                            className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 transition-all disabled:opacity-50"
                        >
                            <Send size={13} className={triggeringType === 'payment-due' ? 'animate-spin' : ''} />
                            Send Due Reminders
                        </button>
                    </div>
                </div>

                {/* Table content */}
                <div className="flex-1 overflow-y-auto">
                    {loading && logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 space-y-2">
                            <div className="w-7 h-7 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-500 font-medium">Loading dispatch records...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 text-xs font-semibold">
                            No notification dispatch logs recorded yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs min-w-[680px]">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 sticky top-0">
                                <tr>
                                    <th className="px-5 py-3">Timestamp</th>
                                    <th className="px-4 py-3">Channel</th>
                                    <th className="px-4 py-3">Notification Type</th>
                                    <th className="px-5 py-3">Recipient</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-center">Attempts</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-xs">
                                            {log.dispatchedAt ? new Date(log.dispatchedAt).toLocaleString('en-IN') : '—'}
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-slate-800">
                                            {log.channel}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="font-semibold text-slate-900 block">{log.notificationType}</span>
                                            {log.subject && (
                                                <span className="text-xs text-slate-400 block truncate max-w-xs">{log.subject}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-slate-600 text-xs">
                                            {log.recipient}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {getStatusBadge(log.deliveryStatus)}
                                            {log.errorMessage && (
                                                <span className="text-xs text-rose-600 block mt-0.5 truncate max-w-xs" title={log.errorMessage}>
                                                    {log.errorMessage}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-bold text-slate-600">
                                            {log.retryCount || 1}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                onClick={() => handleRetry(log.id)}
                                                disabled={retryingId === log.id}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                                            >
                                                <RefreshCw size={11} className={retryingId === log.id ? 'animate-spin' : ''} />
                                                Retry
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer / Pagination */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">
                        Showing {logs.length} of {totalElements} dispatch logs
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0 || loading}
                            className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all"
                        >
                            Previous
                        </button>
                        <span className="font-bold text-slate-800">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1 || loading}
                            className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationDispatchModal;
