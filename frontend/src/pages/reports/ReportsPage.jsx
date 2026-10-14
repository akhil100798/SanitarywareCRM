import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Users, Truck, CreditCard, DollarSign, Package, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import reportService from '../../services/reportService';
import { PageHeader, StatCard } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { formatReportMetric } from '../../utils/reportMetrics';

const tabs = [
    { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
    { id: 'customer-outstanding', label: 'Customer Outstanding', icon: Users },
    { id: 'distributor-outstanding', label: 'Distributor Outstanding', icon: Truck },
    { id: 'payments', label: 'Payment Summary', icon: CreditCard },
    { id: 'purchases', label: 'Purchase Summary', icon: DollarSign },
    { id: 'inventory', label: 'Inventory Summary', icon: Package }
];

const reportRows = {
    sales: ['orders'],
    'customer-outstanding': ['customers'],
    'distributor-outstanding': ['distributors'],
    payments: ['recentTransactions'],
    purchases: ['purchaseOrders'],
    inventory: ['items']
};

function normalizeReport(tabId, payload) {
    if (!payload) return null;
    const rowKey = reportRows[tabId];
    const labels = {
        totalSales: 'Total Sales Value',
        totalOutstanding: tabId === 'distributor-outstanding' ? 'Total Payables Outstanding' : 'Total Receivables Outstanding',
        totalInventoryValue: 'Total Catalog Value'
    };
    const metrics = Object.fromEntries(Object.entries(payload)
        .filter(([key, value]) => key !== rowKey && !Array.isArray(value) && typeof value !== 'object')
        .map(([key, value]) => [labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value]));
    const rows = rowKey ? payload[rowKey[0]] || [] : [];
    return { metrics, rows, headers: rows.length ? Object.keys(rows[0]) : [] };
}

export const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState('sales');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '' });
    const tabRefs = useRef({});
    const requestGeneration = useRef(0);

    useEffect(() => { fetchReportData(); }, [activeTab]);

    const fetchReportData = async (selectedFilters = filters) => {
        const generation = ++requestGeneration.current;
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (selectedFilters.startDate) params.startDate = selectedFilters.startDate;
            if (selectedFilters.endDate) params.endDate = selectedFilters.endDate;
            if (selectedFilters.status) params.status = selectedFilters.status;

            let res;
            if (activeTab === 'sales') res = await reportService.getSalesSummary(params);
            else if (activeTab === 'customer-outstanding') res = await reportService.getCustomerOutstanding(params);
            else if (activeTab === 'distributor-outstanding') res = await reportService.getDistributorOutstanding(params);
            else if (activeTab === 'payments') res = await reportService.getPaymentSummary(params);
            else if (activeTab === 'purchases') res = await reportService.getPurchaseSummary(params);
            else if (activeTab === 'inventory') res = await reportService.getInventorySummary(params);
            if (generation === requestGeneration.current) setData(normalizeReport(activeTab, res?.data));
        } catch (err) {
            if (generation === requestGeneration.current) setError('Failed to load report data');
        } finally { if (generation === requestGeneration.current) setLoading(false); }
    };

    const hasDateFilters = ['sales', 'payments', 'purchases'].includes(activeTab);

    const renderKPIs = (metrics) => {
        if (!metrics) return null;
        return (
            <div className="stat-grid">
                {Object.entries(metrics).map(([key, value]) => (
                    <StatCard key={key} label={key} value={formatReportMetric(key, value)} />
                ))}
            </div>
        );
    };

    const renderTable = (headers, rows) => {
        if (!rows?.length) return <EmptyState title="No data" description="No records match the current filters." />;
        return (
            <div className="table-scroll">
                <table className="data-table" style={{ minWidth: 600 }}>
                    <thead><tr>{headers.map(h => <th key={h} className="numeric">{h}</th>)}</tr></thead>
                    <tbody>{rows.map((row, i) => <tr key={i}>{headers.map(h => <td key={h} className="numeric">{row[h] ?? '—'}</td>)}</tr>)}</tbody>
                </table>
            </div>
        );
    };

    const tab = tabs.find(t => t.id === activeTab);

    return (
        <div>
            <PageHeader title="Financial & Operational Reports" description="View business analytics and summaries." />

            <div role="tablist" aria-label="Report types" className="filter-bar" style={{ justifyContent: 'flex-start', borderBottom: 0, gap: 4, padding: '8px 0', flexWrap: 'wrap' }}>
                {tabs.map((t, index) => (
                    <button key={t.id} ref={element => { tabRefs.current[t.id] = element; }} role="tab" id={`report-tab-${t.id}`}
                        data-testid={`report-tab-${t.id}`} aria-controls="report-panel" tabIndex={activeTab === t.id ? 0 : -1}
                        aria-selected={activeTab === t.id} onClick={() => setActiveTab(t.id)} onKeyDown={event => {
                            const offsets = { ArrowRight: 1, ArrowLeft: -1 };
                            let next;
                            if (event.key in offsets) next = (index + offsets[event.key] + tabs.length) % tabs.length;
                            else if (event.key === 'Home') next = 0;
                            else if (event.key === 'End') next = tabs.length - 1;
                            else return;
                            event.preventDefault();
                            setActiveTab(tabs[next].id);
                            tabRefs.current[tabs[next].id]?.focus();
                        }}
                        className={`btn-${activeTab === t.id ? 'primary' : 'ghost'} btn-sm`} style={{ fontSize: 13 }}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {hasDateFilters && (
                <form onSubmit={(e) => { e.preventDefault(); fetchReportData(); }} className="filter-bar" style={{ marginBottom: 16 }}>
                    <div className="field" style={{ minWidth: 160 }}>
                        <label htmlFor="report-start-date" className="field-label">Start Date</label>
                        <input id="report-start-date" type="date" className="input-field" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                    </div>
                    <div className="field" style={{ minWidth: 160 }}>
                        <label htmlFor="report-end-date" className="field-label">End Date</label>
                        <input id="report-end-date" type="date" className="input-field" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                    </div>
                    <Button type="submit"><Search size={16} /> Apply</Button>
                    <Button variant="ghost" onClick={() => { const empty = { startDate: '', endDate: '', status: '' }; setFilters(empty); fetchReportData(empty); }}>
                        <RefreshCw size={16} /> Clear
                    </Button>
                </form>
            )}

            <section id="report-panel" role="tabpanel" aria-labelledby={`report-tab-${activeTab}`} aria-busy={loading}>
            {error ? (<ErrorState message={error} onRetry={() => fetchReportData()} />)
            : loading ? (<LoadingSkeleton rows={6} />)
            : !data ? (<EmptyState title="Select a report" description="Choose a report tab above to view data." />)
            : (
                <div className="space-y-6">
                    <div className="surface">
                        <h2 className="section-heading">{tab?.label}</h2>
                        {data.metrics && (
                            <div className="surface" style={{ padding: 16, marginBottom: 16 }}>
                                {(() => {
                                    const metrics = data.metrics;
                                    return (
                                        <div className="stat-grid">
                                            {Object.entries(metrics).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => (
                                                <StatCard key={k} label={k}
                                                    value={formatReportMetric(k, v)} />
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    {data.rows && data.rows.length > 0 && (
                        <div className="table-panel">
                            <div className="table-scroll">
                                <table className="data-table" style={{ minWidth: 600 }}>
                                    <thead><tr>{data.headers?.map(h => <th key={h} className="numeric">{h}</th>)}</tr></thead>
                                    <tbody>{data.rows.map((row, i) => <tr key={i}>{data.headers.map(h => <td key={h} className="numeric">{row[h] ?? '—'}</td>)}</tr>)}</tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
            </section>
        </div>
    );
};

export default ReportsPage;
