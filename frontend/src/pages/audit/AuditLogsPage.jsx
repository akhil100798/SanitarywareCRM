import React, { useState, useEffect, useCallback } from 'react';
import auditLogService from '../../services/auditLogService';
import { ShieldCheck, Search, Filter, RefreshCw, Clock, User, Activity, AlertCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { Button, IconButton } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const ENTITY_TYPES = ['QUOTATION', 'ORDER', 'PAYMENT', 'PURCHASE_ORDER', 'DISTRIBUTOR', 'DISTRIBUTOR_PAYMENT', 'PRODUCT', 'CUSTOMER', 'CATEGORY', 'BRAND', 'SYSTEM_SETTINGS', 'USER'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'TOGGLE_STATUS', 'STATUS_CHANGE', 'PAYMENT_STATUS_CHANGE', 'RECORD_PAYMENT', 'DELETE_PAYMENT', 'CREATE_DISTRIBUTOR_PAYMENT', 'DELETE_DISTRIBUTOR_PAYMENT', 'RECEIVE_PO', 'CONVERT_FROM_QUOTATION', 'ADJUST_STOCK', 'REGISTER_USER', 'UPDATE_PROFILE', 'UPDATE_SETTINGS'];

const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try { return new Date(timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); }
    catch { return timestamp; }
};

const AuditLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [actorFilter, setActorFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [entityIdFilter, setEntityIdFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params = { page, size, sort: 'createdAt,desc',
                actor: actorFilter.trim() || undefined, action: actionFilter || undefined,
                entityType: entityTypeFilter || undefined, entityId: entityIdFilter ? parseInt(entityIdFilter, 10) || undefined : undefined,
                startDate: startDateFilter ? `${startDateFilter}T00:00:00` : undefined,
                endDate: endDateFilter ? `${endDateFilter}T23:59:59` : undefined };
            const data = await auditLogService.getAuditLogs(params);
            setLogs(data.content || []); setTotalPages(data.totalPages || 0); setTotalElements(data.totalElements || 0);
        } catch (err) { setError(err.response?.data?.message || 'Failed to load audit logs'); toast.error('Failed to load audit logs'); }
        finally { setLoading(false); }
    }, [page, size, actorFilter, actionFilter, entityTypeFilter, entityIdFilter, startDateFilter, endDateFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleResetFilters = () => {
        setActorFilter(''); setActionFilter(''); setEntityTypeFilter(''); setEntityIdFilter(''); setStartDateFilter(''); setEndDateFilter(''); setPage(0);
    };

    const hasActiveFilters = actorFilter || actionFilter || entityTypeFilter || entityIdFilter || startDateFilter || endDateFilter;

    return (
        <div>
            <PageHeader title="Audit Trail & System Logs" description="Immutable operational activity log tracking financial, inventory and lifecycle transitions."
                actions={<Button data-testid="audit-refresh" variant="secondary" onClick={() => fetchLogs()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</Button>} />

            <div className="surface" style={{ marginBottom: 24 }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Filter size={16} className="text-muted" /> Filter Audit Events{hasActiveFilters && <span className="status-badge status-info">Active</span>}
                    </div>
                    {hasActiveFilters && <button data-testid="audit-reset-filters" onClick={handleResetFilters} className="btn-ghost" style={{ fontSize: 13 }}><XCircle size={14} /> Reset</button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <Field label="Actor"><input type="text" placeholder="e.g. qaadmin..." className="input-field" value={actorFilter} onChange={(e) => { setActorFilter(e.target.value); setPage(0); }} /></Field>
                    <Field label="Entity Type"><select className="input-field" value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(0); }}><option value="">All Entities</option>{ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                    <Field label="Action"><select className="input-field" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}><option value="">All Actions</option>{ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
                    <Field label="Entity ID"><input type="number" placeholder="e.g. 101" className="input-field" value={entityIdFilter} onChange={(e) => { setEntityIdFilter(e.target.value); setPage(0); }} /></Field>
                    <Field label="From Date"><input type="date" className="input-field" value={startDateFilter} onChange={(e) => { setStartDateFilter(e.target.value); setPage(0); }} /></Field>
                    <Field label="To Date"><input type="date" className="input-field" value={endDateFilter} onChange={(e) => { setEndDateFilter(e.target.value); setPage(0); }} /></Field>
                </div>
            </div>

            {error ? (<ErrorState message={error} onRetry={fetchLogs} />)
            : loading ? (<LoadingSkeleton rows={5} />)
            : !logs.length ? (
                <EmptyState title="No Audit Events" description={hasActiveFilters ? 'No events match your filters. Try clearing them.' : 'Operational events will populate here as actions occur.'}
                    action={hasActiveFilters ? <Button variant="secondary" onClick={handleResetFilters}><XCircle size={14} /> Clear Filters</Button> : undefined} />
            ) : (
                <div className="table-panel">
                    <div className="hidden md:block table-scroll">
                        <table className="data-table" style={{ minWidth: 700 }}>
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Actor</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td><div className="flex items-center gap-1 text-sm" style={{ whiteSpace: 'nowrap' }}><Clock size={14} className="text-muted" /> {formatTimestamp(log.createdAt)}</div></td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="account-avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{log.actorUsername?.charAt(0).toUpperCase() || 'S'}</div>
                                                <span className="font-medium text-xs">{log.actorUsername || 'system'}</span>
                                            </div>
                                        </td>
                                        <td><StatusBadge status={log.action} /></td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <StatusBadge status={log.entityType} />
                                                {log.entityId && <span className="text-xs font-mono text-muted">#{log.entityId}</span>}
                                            </div>
                                        </td>
                                        <td className="text-sm" style={{ maxWidth: 300 }}>{log.details || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden divide-y">
                        {logs.map(log => (
                            <div key={log.id} className="p-4 space-y-2">
                                <div className="flex justify-between"><StatusBadge status={log.action} /><span className="text-xs text-muted">{formatTimestamp(log.createdAt)}</span></div>
                                <div className="flex justify-between text-xs"><span className="font-medium">{log.actorUsername || 'system'}</span><span><StatusBadge status={log.entityType} /> {log.entityId && `#${log.entityId}`}</span></div>
                                {log.details && <p className="text-xs p-2 surface-muted rounded" style={{ background: 'var(--surface-muted)' }}>{log.details}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="pagination">
                        <div className="flex items-center gap-2">
                            <span>{logs.length} of {totalElements} events</span>
                            <select className="input-field" style={{ width: 'auto', minHeight: 32, fontSize: 12, padding: '4px 8px' }} value={size} onChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="pagination-controls">
                            <IconButton label="Previous page" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}><ChevronLeft size={16} /></IconButton>
                            <span>Page {page + 1} of {Math.max(1, totalPages)}</span>
                            <IconButton label="Next page" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}><ChevronRight size={16} /></IconButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogsPage;
