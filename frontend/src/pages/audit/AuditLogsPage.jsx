import React, { useState, useEffect, useCallback } from 'react';
import auditLogService from '../../services/auditLogService';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  XCircle,
  FileText,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

const ENTITY_TYPES = [
  'QUOTATION',
  'ORDER',
  'PAYMENT',
  'PURCHASE_ORDER',
  'DISTRIBUTOR_PAYMENT',
  'PRODUCT',
  'CUSTOMER',
  'CATEGORY',
  'BRAND'
];

const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DEACTIVATE',
  'STATUS_CHANGE',
  'PAYMENT_STATUS_CHANGE',
  'RECORD_PAYMENT',
  'DELETE_PAYMENT',
  'CREATE_DISTRIBUTOR_PAYMENT',
  'DELETE_DISTRIBUTOR_PAYMENT',
  'RECEIVE_PO',
  'CONVERT_FROM_QUOTATION',
  'ADJUST_STOCK'
];

const getActionBadgeClass = (action) => {
  if (!action) return 'bg-slate-100 text-slate-700 border-slate-200';
  const act = action.toUpperCase();
  if (act.includes('CREATE') || act.includes('CONVERT')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (act.includes('RECEIVE')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (act.includes('DELETE') || act.includes('DEACTIVATE')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (act.includes('PAYMENT') || act.includes('FINANCIAL')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (act.includes('STATUS') || act.includes('ADJUST')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const getEntityBadgeClass = (entityType) => {
  if (!entityType) return 'bg-slate-100 text-slate-600';
  const type = entityType.toUpperCase();
  switch (type) {
    case 'ORDER':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'QUOTATION':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'PURCHASE_ORDER':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'PAYMENT':
    case 'DISTRIBUTOR_PAYMENT':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'PRODUCT':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'CUSTOMER':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return timestamp;
  }
};

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        sort: 'createdAt,desc',
        actor: actorFilter.trim() || undefined,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        entityId: entityIdFilter ? parseInt(entityIdFilter, 10) || undefined : undefined
      };

      const data = await auditLogService.getAuditLogs(params);
      setLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.response?.data?.message || 'Failed to retrieve audit log records. Please check connection and try again.');
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, size, actorFilter, actionFilter, entityTypeFilter, entityIdFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setActorFilter('');
    setActionFilter('');
    setEntityTypeFilter('');
    setEntityIdFilter('');
    setPage(0);
  };

  const hasActiveFilters = actorFilter || actionFilter || entityTypeFilter || entityIdFilter;

  return (
    <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="p-2 rounded-xl bg-teal/10 text-teal">
                <ShieldCheck size={26} className="text-teal" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trail & System Logs</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Immutable operational activity log tracking financial, inventory, and lifecycle transitions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-teal' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter size={18} className="text-slate-400" />
              <span>Filter Audit Events</span>
              {hasActiveFilters && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-teal/10 text-teal rounded-full">
                  Active
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <XCircle size={14} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Actor Search */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Actor Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. qaadmin..."
                  value={actorFilter}
                  onChange={(e) => {
                    setActorFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all"
                />
              </div>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity Type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all bg-white"
              >
                <option value="">All Entities</option>
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all bg-white"
              >
                <option value="">All Actions</option>
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity ID Search */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entity ID</label>
              <div className="relative">
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="e.g. 101"
                  value={entityIdFilter}
                  onChange={(e) => {
                    setEntityIdFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table / Card View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Error Alert */}
          {error && (
            <div className="m-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Error Loading Audit Trail</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                <button
                  onClick={() => fetchLogs()}
                  className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
                >
                  Retry request
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="p-6 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                  </div>
                  <div className="h-6 bg-slate-200 rounded w-20 ml-4" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && logs.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 border border-slate-100 text-slate-400 mb-3">
                <ShieldCheck size={36} />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No Audit Events Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                {hasActiveFilters
                  ? 'No events match your selected filters. Try clearing or broadening your criteria.'
                  : 'Operational events and transactions will automatically populate here as actions occur.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal bg-teal/10 hover:bg-teal/20 rounded-lg transition-colors"
                >
                  <XCircle size={14} />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          )}

          {/* Records Table */}
          {!loading && !error && logs.length > 0 && (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-5">Timestamp</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Target Entity</th>
                      <th className="py-3.5 px-5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap text-xs text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            <span>{formatTimestamp(log.createdAt)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                              {log.actorUsername ? log.actorUsername.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <span className="font-medium text-slate-800 text-xs">{log.actorUsername || 'system'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getEntityBadgeClass(
                                log.entityType
                              )}`}
                            >
                              {log.entityType}
                            </span>
                            {log.entityId && (
                              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                #{log.entityId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600 font-normal leading-relaxed">
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{formatTimestamp(log.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <User size={13} className="text-slate-400" />
                        <span>{log.actorUsername || 'system'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xxs font-medium border ${getEntityBadgeClass(
                            log.entityType
                          )}`}
                        >
                          {log.entityType}
                        </span>
                        {log.entityId && <span className="font-mono text-slate-500">#{log.entityId}</span>}
                      </div>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span>Showing {logs.length} of {totalElements} audit events</span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows:</span>
                    <select
                      value={size}
                      onChange={(e) => {
                        setSize(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 font-semibold text-slate-700">
                    Page {page + 1} of {Math.max(1, totalPages)}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
  );
};

export default AuditLogsPage;
