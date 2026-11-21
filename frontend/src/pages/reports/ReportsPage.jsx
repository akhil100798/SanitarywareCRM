import { useState, useEffect } from 'react';
import { 
    BarChart3, 
    DollarSign, 
    Users, 
    Truck, 
    Package, 
    CreditCard, 
    Calendar, 
    Filter, 
    Download,
    TrendingUp,
    RefreshCw,
    Sparkles,
    FileSpreadsheet,
    Clock,
    AlertTriangle,
    Percent,
    Bell
} from 'lucide-react';
import toast from 'react-hot-toast';
import reportService from '../../services/reportService';
import InventoryAnalyticsWidget from '../../components/InventoryAnalyticsWidget';
import NotificationDispatchModal from '../../components/NotificationDispatchModal';

const tabs = [
    { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
    { id: 'gst', label: 'GST Tax Summary', icon: FileSpreadsheet },
    { id: 'aging', label: 'Payment Aging Buckets', icon: Clock },
    { id: 'dead-stock', label: 'Dead-Stock / Slow-Moving', icon: AlertTriangle },
    { id: 'brand-margins', label: 'Brand Gross Margins', icon: Percent },
    { id: 'customer-outstanding', label: 'Customer Outstanding', icon: Users },
    { id: 'distributor-outstanding', label: 'Distributor Outstanding', icon: Truck },
    { id: 'payments', label: 'Payment Summary', icon: CreditCard },
    { id: 'purchases', label: 'Purchase Summary', icon: DollarSign },
    { id: 'inventory', label: 'Inventory Summary', icon: Package },
    { id: 'inventory-intelligence', label: 'Predictive Intelligence', icon: Sparkles }
];

export const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState('sales');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState(null);
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        days: 90
    });

    useEffect(() => {
        fetchReportData();
    }, [activeTab]);

    const fetchReportData = async () => {
        if (activeTab === 'inventory-intelligence') {
            setData({});
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.status) params.status = filters.status;
            if (filters.days) params.days = filters.days;

            let res;
            if (activeTab === 'sales') {
                res = await reportService.getSalesSummary(params);
            } else if (activeTab === 'gst') {
                res = await reportService.getGstTaxSummary(params);
            } else if (activeTab === 'aging') {
                res = await reportService.getPaymentAging(params);
            } else if (activeTab === 'dead-stock') {
                res = await reportService.getDeadStock(params);
            } else if (activeTab === 'brand-margins') {
                res = await reportService.getBrandMargins(params);
            } else if (activeTab === 'customer-outstanding') {
                res = await reportService.getCustomerOutstanding(params);
            } else if (activeTab === 'distributor-outstanding') {
                res = await reportService.getDistributorOutstanding(params);
            } else if (activeTab === 'payments') {
                res = await reportService.getPaymentSummary(params);
            } else if (activeTab === 'purchases') {
                res = await reportService.getPurchaseSummary(params);
            } else if (activeTab === 'inventory') {
                res = await reportService.getInventorySummary(params);
            }
            setData(res?.data || null);
        } catch (err) {
            console.error('Failed to load report data', err);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchReportData();
    };

    const resetFilters = () => {
        setFilters({ startDate: '', endDate: '', status: '', days: 90 });
        setTimeout(() => fetchReportData(), 0);
    };

    const downloadBlob = (blobData, filename) => {
        const url = window.URL.createObjectURL(new Blob([blobData]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleServerExport = async (type, format) => {
        setExporting(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            let res;
            const safeTimestamp = new Date().toISOString().slice(0, 10);
            let filename = '';

            if (type === 'gst') {
                res = await reportService.exportGstTaxSummary(params, format);
                filename = `GST_Tax_Report_${safeTimestamp}.${format}`;
            } else if (type === 'aging') {
                res = await reportService.exportPaymentAging(params, format);
                filename = `Payment_Aging_Report_${safeTimestamp}.${format}`;
            }

            if (res?.data) {
                downloadBlob(res.data, filename);
                toast.success(`Exported ${filename}`);
            }
        } catch (err) {
            console.error('Server export failed', err);
            toast.error('Export generation failed');
        } finally {
            setExporting(false);
        }
    };

    const handleExportReport = () => {
        if (activeTab === 'gst') {
            handleServerExport('gst', 'xlsx');
            return;
        }
        if (activeTab === 'aging') {
            handleServerExport('aging', 'xlsx');
            return;
        }

        if (!data) {
            toast.error('No report data available to export');
            return;
        }
        try {
            const safeTimestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
            const filename = `Financial_Report_${activeTab}_${safeTimestamp}.csv`;

            let rows = [];
            if (activeTab === 'inventory' && data.items) {
                rows = [
                    ['Product Name', 'SKU', 'Brand', 'Category', 'Stock Qty', 'Cost Price', 'Selling Price', 'Total Valuation'],
                    ...data.items.map(item => [
                        `"${(item.productName || '').replace(/"/g, '""')}"`,
                        `"${item.sku || ''}"`,
                        `"${item.brandName || ''}"`,
                        `"${item.categoryName || ''}"`,
                        item.stockQuantity || 0,
                        item.purchasePrice || 0,
                        item.sellingPrice || 0,
                        item.totalValue || 0
                    ])
                ];
            } else if (activeTab === 'sales' && data.orders) {
                rows = [
                    ['Order Number', 'Order Date', 'Customer Name', 'Subtotal', 'Tax Amount', 'Discount', 'Total', 'Status', 'Payment Status'],
                    ...data.orders.map(o => [
                        `"${o.orderNumber || ''}"`,
                        o.orderDate || '',
                        `"${(o.customerName || '').replace(/"/g, '""')}"`,
                        o.subtotal || 0,
                        o.taxAmount || 0,
                        o.discount || 0,
                        o.total || 0,
                        o.status || '',
                        o.paymentStatus || ''
                    ])
                ];
            } else if (activeTab === 'dead-stock' && data.items) {
                rows = [
                    ['Product Name', 'SKU', 'Brand', 'Category', 'Stock Qty', 'Cost Price', 'Tied-Up Capital', 'Last Sale Date', 'Days Inactive'],
                    ...data.items.map(i => [
                        `"${(i.productName || '').replace(/"/g, '""')}"`,
                        `"${i.sku || ''}"`,
                        `"${i.brandName || ''}"`,
                        `"${i.categoryName || ''}"`,
                        i.stockQuantity || 0,
                        i.purchasePrice || 0,
                        i.tiedUpCapital || 0,
                        i.lastSaleDate || 'No Prior Sales',
                        i.daysSinceLastSale ?? 'N/A'
                    ])
                ];
            } else if (activeTab === 'brand-margins' && data.brands) {
                rows = [
                    ['Brand', 'Units Sold', 'Total Revenue', 'Total Cost', 'Gross Margin', 'Gross Margin %'],
                    ...data.brands.map(b => [
                        `"${(b.brandName || '').replace(/"/g, '""')}"`,
                        b.totalUnitsSold || 0,
                        b.totalRevenue || 0,
                        b.totalCost || 0,
                        b.grossMargin || 0,
                        `${b.grossMarginPercent || 0}%`
                    ])
                ];
            } else {
                const items = data.items || data.orders || data.customers || data.distributors || data.payments || data.purchaseOrders || [];
                if (items.length === 0) {
                    toast.error('No tabular records to export for this view');
                    return;
                }
                const headers = Object.keys(items[0]);
                rows = [
                    headers,
                    ...items.map(item => headers.map(h => typeof item[h] === 'string' ? `"${item[h].replace(/"/g, '""')}"` : (item[h] ?? '')))
                ];
            }

            const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Exported ${filename}`);
        } catch (err) {
            console.error('Export failed', err);
            toast.error('Failed to export report');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <BarChart3 className="text-teal-700" size={28} />
                        Financial & Operational Reports
                    </h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Authoritative business ledgers, GST tax compliance, aging receivables, brand gross margins, and inventory valuations.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                        onClick={() => setIsNotifModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                        title="Open Notification Dispatch Center"
                    >
                        <Bell size={15} />
                        Notification Center
                    </button>
                    <button
                        onClick={handleExportReport}
                        disabled={loading || exporting || !data}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm disabled:opacity-50"
                        title="Export Report"
                    >
                        <Download size={15} className={exporting ? 'animate-spin' : ''} />
                        {exporting ? 'Exporting...' : 'Export Report'}
                    </button>
                    <button
                        onClick={fetchReportData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-none">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setData(null);
                            }}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <Icon size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filter Bar */}
            {(activeTab === 'sales' || activeTab === 'gst' || activeTab === 'payments' || activeTab === 'purchases' || activeTab === 'dead-stock') && (
                <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                    {activeTab !== 'dead-stock' ? (
                        <>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <Calendar size={16} className="text-slate-400" />
                                <span>Date Range:</span>
                            </div>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="input text-xs py-1.5 px-3 w-36 rounded-lg border-slate-200 text-slate-700"
                                placeholder="Start Date"
                                aria-label="Start Date"
                            />
                            <span className="text-slate-600 text-xs font-bold">to</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="input text-xs py-1.5 px-3 w-36 rounded-lg border-slate-200 text-slate-700"
                                placeholder="End Date"
                                aria-label="End Date"
                            />
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600">Inactivity Threshold:</span>
                            <select
                                value={filters.days}
                                onChange={(e) => setFilters({ ...filters, days: Number(e.target.value) })}
                                className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 font-semibold"
                                aria-label="Dead stock inactivity days"
                            >
                                <option value={30}>30+ Days Inactive</option>
                                <option value={60}>60+ Days Inactive</option>
                                <option value={90}>90+ Days Inactive</option>
                                <option value={180}>180+ Days Inactive</option>
                            </select>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="btn btn-primary text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 font-bold"
                    >
                        <Filter size={14} /> Apply Filter
                    </button>
                    {(filters.startDate || filters.endDate || filters.days !== 90) && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                        >
                            Clear
                        </button>
                    )}
                </form>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col justify-center items-center h-64 space-y-3">
                    <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 font-semibold text-xs">Computing report metrics...</p>
                </div>
            ) : !data ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 font-medium">
                    No report data available
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Render per tab */}
                    {activeTab === 'sales' && <SalesSummaryView data={data} />}
                    {activeTab === 'gst' && <GstTaxSummaryView data={data} onExport={(fmt) => handleServerExport('gst', fmt)} exporting={exporting} />}
                    {activeTab === 'aging' && <PaymentAgingView data={data} onExport={(fmt) => handleServerExport('aging', fmt)} exporting={exporting} />}
                    {activeTab === 'dead-stock' && <DeadStockView data={data} />}
                    {activeTab === 'brand-margins' && <BrandMarginView data={data} />}
                    {activeTab === 'customer-outstanding' && <CustomerOutstandingView data={data} />}
                    {activeTab === 'distributor-outstanding' && <DistributorOutstandingView data={data} />}
                    {activeTab === 'payments' && <PaymentSummaryView data={data} />}
                    {activeTab === 'purchases' && <PurchaseSummaryView data={data} />}
                    {activeTab === 'inventory' && <InventorySummaryView data={data} />}
                    {activeTab === 'inventory-intelligence' && <InventoryAnalyticsWidget />}
                </div>
            )}

            {/* Notification Dispatch Modal */}
            <NotificationDispatchModal
                isOpen={isNotifModalOpen}
                onClose={() => setIsNotifModalOpen(false)}
            />
        </div>
    );
};

/* --- TAB VIEWS --- */

const GstTaxSummaryView = ({ data, onExport, exporting }) => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <span className="text-xs text-slate-600 font-bold">
                    Period: {data.startDate || 'Beginning'} &mdash; {data.endDate || 'Present'}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onExport('xlsx')}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                    <Download size={13} />
                    Download Excel (.xlsx)
                </button>
                <button
                    onClick={() => onExport('csv')}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                    <Download size={13} />
                    Download CSV
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Invoices" value={data.totalInvoices || 0} color="blue" />
            <StatCard label="Taxable Amount" value={`₹${Number(data.totalTaxableAmount || 0).toLocaleString('en-IN')}`} color="teal" />
            <StatCard label="CGST + SGST" value={`₹${(Number(data.totalCgst || 0) + Number(data.totalSgst || 0)).toLocaleString('en-IN')}`} color="purple" />
            <StatCard label="Total Tax (IGST+CGST+SGST)" value={`₹${Number(data.totalTaxAmount || 0).toLocaleString('en-IN')}`} color="amber" />
            <StatCard label="Gross Invoice Value" value={`₹${Number(data.totalInvoiceValue || 0).toLocaleString('en-IN')}`} color="emerald" />
        </div>

        {/* HSN Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                HSN Code Breakdown (GSTR-1 Table 12)
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">HSN Code</th>
                            <th className="px-6 py-3 text-right">Taxable Value</th>
                            <th className="px-6 py-3 text-right">CGST</th>
                            <th className="px-6 py-3 text-right">SGST</th>
                            <th className="px-6 py-3 text-right">IGST</th>
                            <th className="px-6 py-3 text-right">Total Tax</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.hsnBreakdown?.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-center text-slate-600 font-medium">No HSN entries for this period</td>
                            </tr>
                        ) : (
                            data.hsnBreakdown?.map((h) => (
                                <tr key={h.hsnCode} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{h.hsnCode}</td>
                                    <td className="px-6 py-3.5 text-right">₹{Number(h.taxableAmount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right">₹{Number(h.cgst || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right">₹{Number(h.sgst || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right">₹{Number(h.igst || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right font-extrabold text-teal-700">₹{Number(h.totalTax || 0).toLocaleString('en-IN')}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Invoice Itemized List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Invoice Breakdown ({data.invoices?.length || 0})
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3">Invoice #</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-5 py-3">Customer</th>
                            <th className="px-4 py-3">GSTIN</th>
                            <th className="px-4 py-3">POS</th>
                            <th className="px-4 py-3 text-right">Taxable</th>
                            <th className="px-4 py-3 text-right">CGST</th>
                            <th className="px-4 py-3 text-right">SGST</th>
                            <th className="px-4 py-3 text-right">IGST</th>
                            <th className="px-5 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.invoices?.map((inv) => (
                            <tr key={inv.invoiceNumber} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                                <td className="px-4 py-3.5 text-slate-600">{inv.invoiceDate}</td>
                                <td className="px-5 py-3.5 font-medium">{inv.customerName}</td>
                                <td className="px-4 py-3.5 font-mono text-xxs text-slate-600">{inv.customerGstin || 'URP'}</td>
                                <td className="px-4 py-3.5 text-slate-600">{inv.placeOfSupply || '—'}</td>
                                <td className="px-4 py-3.5 text-right">₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3.5 text-right">₹{Number(inv.cgst || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3.5 text-right">₹{Number(inv.sgst || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3.5 text-right">₹{Number(inv.igst || 0).toLocaleString('en-IN')}</td>
                                <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const PaymentAgingView = ({ data, onExport, exporting }) => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <span className="text-xs text-slate-600 font-bold">
                    As of: {data.asOfDate || new Date().toISOString().slice(0, 10)} &bull; {data.customerCount || 0} Customers with Outstanding
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onExport('xlsx')}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                    <Download size={13} />
                    Download Aging (.xlsx)
                </button>
                <button
                    onClick={() => onExport('csv')}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                    <Download size={13} />
                    Download CSV
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Outstanding" value={`₹${Number(data.totalOutstanding || 0).toLocaleString('en-IN')}`} color="rose" />
            <StatCard label="0-30 Days (Current)" value={`₹${Number(data.bucket0To30 || 0).toLocaleString('en-IN')}`} color="emerald" />
            <StatCard label="31-60 Days" value={`₹${Number(data.bucket31To60 || 0).toLocaleString('en-IN')}`} color="blue" />
            <StatCard label="61-90 Days" value={`₹${Number(data.bucket61To90 || 0).toLocaleString('en-IN')}`} color="amber" />
            <StatCard label="90+ Days (Critical)" value={`₹${Number(data.bucket90Plus || 0).toLocaleString('en-IN')}`} color="purple" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Customer Receivables Aging Schedule
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3">Customer</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3 text-right">Total Outstanding</th>
                            <th className="px-4 py-3 text-right">0-30 Days</th>
                            <th className="px-4 py-3 text-right">31-60 Days</th>
                            <th className="px-4 py-3 text-right">61-90 Days</th>
                            <th className="px-5 py-3 text-right font-extrabold text-rose-700">90+ Days</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.customers?.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-slate-600 font-medium">All customer receivables are cleared</td>
                            </tr>
                        ) : (
                            data.customers?.map((c) => (
                                <tr key={c.customerId} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <span className="font-bold text-slate-900 block">{c.customerName}</span>
                                        {c.company && <span className="text-xxs text-slate-500">{c.company}</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-600">{c.phoneNumber}</td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                                        ₹{Number(c.totalOutstanding || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-emerald-700 font-semibold">
                                        ₹{Number(c.bucket0To30 || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-blue-700 font-semibold">
                                        ₹{Number(c.bucket31To60 || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-amber-700 font-semibold">
                                        ₹{Number(c.bucket61To90 || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-extrabold text-rose-700">
                                        ₹{Number(c.bucket90Plus || 0).toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const DeadStockView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Inactivity Threshold" value={`${data.thresholdDays || 90} Days`} color="blue" />
            <StatCard label="Dormant SKUs" value={data.totalDeadStockItems || 0} color="amber" />
            <StatCard label="Tied-Up Working Capital" value={`₹${Number(data.totalTiedUpCapital || 0).toLocaleString('en-IN')}`} color="rose" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Slow-Moving & Dead-Stock SKUs ({data.items?.length || 0})
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3">Product Name</th>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Brand</th>
                            <th className="px-4 py-3 text-right">Units in Stock</th>
                            <th className="px-4 py-3 text-right">Unit Cost</th>
                            <th className="px-4 py-3 text-right">Tied-Up Capital</th>
                            <th className="px-4 py-3">Last Sale Date</th>
                            <th className="px-4 py-3 text-center">Days Inactive</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.items?.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-4 text-center text-slate-600 font-medium">No stagnant or dead-stock items detected!</td>
                            </tr>
                        ) : (
                            data.items?.map((item) => (
                                <tr key={item.productId} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3.5 font-bold text-slate-900">{item.productName}</td>
                                    <td className="px-4 py-3.5 font-mono text-slate-600">{item.sku}</td>
                                    <td className="px-4 py-3.5">{item.brandName || '—'}</td>
                                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{item.stockQuantity}</td>
                                    <td className="px-4 py-3.5 text-right">₹{Number(item.purchasePrice || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3.5 text-right font-extrabold text-rose-700">₹{Number(item.tiedUpCapital || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3.5 text-slate-600">{item.lastSaleDate || 'No Prior Sales'}</td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className="px-2.5 py-0.5 rounded-full text-xxs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                            {item.daysSinceLastSale != null ? `${item.daysSinceLastSale} days` : 'Permanent Dormant'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const BrandMarginView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={`₹${Number(data.totalRevenue || 0).toLocaleString('en-IN')}`} color="teal" />
            <StatCard label="Total COGS" value={`₹${Number(data.totalCost || 0).toLocaleString('en-IN')}`} color="blue" />
            <StatCard label="Gross Profit Margin" value={`₹${Number(data.totalGrossMargin || 0).toLocaleString('en-IN')}`} color="emerald" />
            <StatCard label="Overall Margin %" value={`${data.overallGrossMarginPercent || 0}%`} color="purple" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Brand-Wise Gross Margins & Profitability ({data.brands?.length || 0})
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">Brand Name</th>
                            <th className="px-6 py-3 text-center">Units Sold</th>
                            <th className="px-6 py-3 text-right">Revenue</th>
                            <th className="px-6 py-3 text-right">COGS (Cost)</th>
                            <th className="px-6 py-3 text-right">Gross Profit</th>
                            <th className="px-6 py-3 text-right">Gross Margin %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.brands?.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-center text-slate-600 font-medium">No brand sales recorded</td>
                            </tr>
                        ) : (
                            data.brands?.map((b) => (
                                <tr key={b.brandName} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-6 py-3.5 font-bold text-slate-900">{b.brandName}</td>
                                    <td className="px-6 py-3.5 text-center font-semibold text-slate-700">{b.totalUnitsSold}</td>
                                    <td className="px-6 py-3.5 text-right">₹{Number(b.totalRevenue || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right">₹{Number(b.totalCost || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right font-bold text-emerald-700">₹{Number(b.grossMargin || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-3.5 text-right font-extrabold text-purple-700">
                                        {b.grossMarginPercent}%
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const SalesSummaryView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Sales Value" value={`₹${Number(data.totalSales || 0).toLocaleString('en-IN')}`} color="teal" />
            <StatCard label="Total Orders" value={data.totalOrders || 0} color="blue" />
            <StatCard label="Total Tax Collected" value={`₹${Number(data.totalTaxCollected || 0).toLocaleString('en-IN')}`} color="purple" />
            <StatCard label="Average Order Value" value={`₹${Number(data.averageOrderValue || 0).toLocaleString('en-IN')}`} color="amber" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Orders Breakdown ({data.orders?.length || 0})
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">Order #</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3 text-right">Subtotal</th>
                            <th className="px-6 py-3 text-right">Tax</th>
                            <th className="px-6 py-3 text-right">Discount</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.orders?.map((o) => (
                            <tr key={o.orderId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">{o.orderNumber}</td>
                                <td className="px-6 py-3.5">{o.orderDate}</td>
                                <td className="px-6 py-3.5 font-medium">{o.customerName}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(o.subtotal || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(o.taxAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(o.discount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-slate-900">₹{Number(o.total || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-xxs font-extrabold uppercase bg-slate-100 text-slate-700">
                                        {o.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const CustomerOutstandingView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Total Receivables Outstanding" value={`₹${Number(data.totalOutstanding || 0).toLocaleString('en-IN')}`} color="emerald" />
            <StatCard label="Customers with Outstanding Balance" value={data.totalCustomersWithBalance || 0} color="amber" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Customer Balances
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3">Company</th>
                            <th className="px-6 py-3 text-center">Orders</th>
                            <th className="px-6 py-3 text-right">Total Billed</th>
                            <th className="px-6 py-3 text-right">Total Paid</th>
                            <th className="px-6 py-3 text-right">Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.customers?.map((c) => (
                            <tr key={c.customerId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">{c.customerName}</td>
                                <td className="px-6 py-3.5">{c.phoneNumber}</td>
                                <td className="px-6 py-3.5">{c.company || '—'}</td>
                                <td className="px-6 py-3.5 text-center font-semibold">{c.totalOrders}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(c.totalBilled || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(c.totalPaid || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-extrabold text-rose-700">
                                    ₹{Number(c.outstandingBalance || 0).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const DistributorOutstandingView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Total Payables Outstanding" value={`₹${Number(data.totalOutstanding || 0).toLocaleString('en-IN')}`} color="rose" />
            <StatCard label="Distributors with Balance Due" value={data.totalDistributorsWithBalance || 0} color="amber" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Distributor Balances
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">Distributor</th>
                            <th className="px-6 py-3">Contact Person</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3 text-center">POs</th>
                            <th className="px-6 py-3 text-right">Total Purchased</th>
                            <th className="px-6 py-3 text-right">Total Paid</th>
                            <th className="px-6 py-3 text-right">Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.distributors?.map((d) => (
                            <tr key={d.distributorId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">{d.distributorName}</td>
                                <td className="px-6 py-3.5">{d.contactPerson || '—'}</td>
                                <td className="px-6 py-3.5">{d.phoneNumber}</td>
                                <td className="px-6 py-3.5 text-center font-semibold">{d.totalPurchaseOrders}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(d.totalPurchased || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(d.totalPaid || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-extrabold text-amber-700">
                                    ₹{Number(d.outstandingBalance || 0).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const PaymentSummaryView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Payments Collected" value={`₹${Number(data.totalReceived || 0).toLocaleString('en-IN')}`} color="teal" />
            <StatCard label="Transactions Recorded" value={data.totalTransactions || 0} color="blue" />
            <StatCard label="CASH Volume" value={`₹${Number(data.paymentMethodBreakdown?.CASH || 0).toLocaleString('en-IN')}`} color="emerald" />
            <StatCard label="UPI / Bank Volume" value={`₹${Number((Number(data.paymentMethodBreakdown?.UPI || 0) + Number(data.paymentMethodBreakdown?.BANK_TRANSFER || 0))).toLocaleString('en-IN')}`} color="purple" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Payment Transactions ({data.recentTransactions?.length || 0})
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">Receipt #</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Order #</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Method</th>
                            <th className="px-6 py-3">Reference</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.recentTransactions?.map((p) => (
                            <tr key={p.paymentId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">{p.paymentNumber}</td>
                                <td className="px-6 py-3.5">{p.paymentDate}</td>
                                <td className="px-6 py-3.5 font-semibold text-teal-700">{p.orderNumber}</td>
                                <td className="px-6 py-3.5">{p.customerName}</td>
                                <td className="px-6 py-3.5 font-semibold">{p.paymentMethod}</td>
                                <td className="px-6 py-3.5 text-slate-500">{p.referenceNumber || '—'}</td>
                                <td className="px-6 py-3.5 text-right font-extrabold text-emerald-700">
                                    ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const PurchaseSummaryView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Purchases" value={`₹${Number(data.totalPurchases || 0).toLocaleString('en-IN')}`} color="teal" />
            <StatCard label="Total Purchase Orders" value={data.totalOrders || 0} color="blue" />
            <StatCard label="Total Paid" value={`₹${Number(data.totalPaid || 0).toLocaleString('en-IN')}`} color="emerald" />
            <StatCard label="Outstanding Payables" value={`₹${Number(data.totalPayables || 0).toLocaleString('en-IN')}`} color="rose" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Purchase Orders ({data.purchaseOrders?.length || 0})
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">PO #</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Distributor</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-right">Paid</th>
                            <th className="px-6 py-3 text-right">Balance</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.purchaseOrders?.map((po) => (
                            <tr key={po.poId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">{po.poNumber}</td>
                                <td className="px-6 py-3.5">{po.orderDate}</td>
                                <td className="px-6 py-3.5 font-medium">{po.distributorName}</td>
                                <td className="px-6 py-3.5 text-right font-semibold">₹{Number(po.total || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right text-emerald-700">₹{Number(po.paidAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-rose-700">₹{Number(po.balanceAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-xxs font-extrabold uppercase bg-slate-100 text-slate-700">
                                        {po.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const InventorySummaryView = ({ data }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Valuation (Cost Price)" value={`₹${Number(data.totalInventoryValue || 0).toLocaleString('en-IN')}`} color="teal" />
            <StatCard label="Total Units in Stock" value={data.totalStockQuantity || 0} color="blue" />
            <StatCard label="Low Stock Items (<10)" value={data.lowStockCount || 0} color="amber" />
            <StatCard label="Out of Stock Items" value={data.outOfStockCount || 0} color="rose" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                Stock Valuation Breakdown ({data.items?.length || 0} items)
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3">Product Name</th>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Brand</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 text-right">Units</th>
                            <th className="px-6 py-3 text-right">Cost Price</th>
                            <th className="px-6 py-3 text-right">Selling Price</th>
                            <th className="px-6 py-3 text-right">Total Valuation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.items?.map((item) => (
                            <tr key={item.productId} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-slate-900">{item.productName}</td>
                                <td className="px-6 py-3.5 font-mono text-slate-500">{item.sku}</td>
                                <td className="px-6 py-3.5">{item.brandName}</td>
                                <td className="px-6 py-3.5">{item.categoryName}</td>
                                <td className={`px-6 py-3.5 text-right font-bold ${item.stockQuantity < 10 ? 'text-amber-700' : 'text-slate-900'}`}>
                                    {item.stockQuantity}
                                </td>
                                <td className="px-6 py-3.5 text-right">₹{Number(item.purchasePrice || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(item.sellingPrice || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-extrabold text-teal-700">
                                    ₹{Number(item.totalValue || 0).toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const colorMap = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

const StatCard = ({ label, value, color = 'teal' }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">{label}</span>
        <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{value}</span>
            <div className={`w-3 h-3 rounded-full ${colorMap[color] || colorMap.teal}`}></div>
        </div>
    </div>
);

export default ReportsPage;
