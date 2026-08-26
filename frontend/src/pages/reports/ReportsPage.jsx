import React, { useState, useEffect } from 'react';
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
    AlertCircle,
    ArrowUpRight,
    Search,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import reportService from '../../services/reportService';

const tabs = [
    { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
    { id: 'customer-outstanding', label: 'Customer Outstanding', icon: Users },
    { id: 'distributor-outstanding', label: 'Distributor Outstanding', icon: Truck },
    { id: 'payments', label: 'Payment Summary', icon: CreditCard },
    { id: 'purchases', label: 'Purchase Summary', icon: DollarSign },
    { id: 'inventory', label: 'Inventory Summary', icon: Package }
];

export const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState('sales');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: ''
    });

    useEffect(() => {
        fetchReportData();
    }, [activeTab]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.status) params.status = filters.status;

            let res;
            if (activeTab === 'sales') {
                res = await reportService.getSalesSummary(params);
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
        setFilters({ startDate: '', endDate: '', status: '' });
        setTimeout(() => fetchReportData(), 0);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <BarChart3 className="text-teal" size={28} />
                        Financial & Operational Reports
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Authoritative business ledgers, customer receivables, supplier payables, and inventory valuations.
                    </p>
                </div>
                <button
                    onClick={fetchReportData}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all self-start md:self-auto"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
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
                            <Icon size={16} className={isActive ? 'text-teal' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filter Bar */}
            {(activeTab === 'sales' || activeTab === 'payments' || activeTab === 'purchases') && (
                <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Calendar size={16} className="text-slate-400" />
                        <span>Date Range:</span>
                    </div>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="input text-xs py-1.5 px-3 w-36 rounded-lg border-slate-200"
                        placeholder="Start Date"
                    />
                    <span className="text-slate-300 text-xs font-bold">to</span>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="input text-xs py-1.5 px-3 w-36 rounded-lg border-slate-200"
                        placeholder="End Date"
                    />
                    <button
                        type="submit"
                        className="btn btn-primary text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5"
                    >
                        <Filter size={14} /> Apply Filter
                    </button>
                    {(filters.startDate || filters.endDate) && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                        >
                            Clear
                        </button>
                    )}
                </form>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col justify-center items-center h-64 space-y-3">
                    <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium text-xs">Computing report metrics...</p>
                </div>
            ) : !data ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                    No report data available
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Render per tab */}
                    {activeTab === 'sales' && <SalesSummaryView data={data} />}
                    {activeTab === 'customer-outstanding' && <CustomerOutstandingView data={data} />}
                    {activeTab === 'distributor-outstanding' && <DistributorOutstandingView data={data} />}
                    {activeTab === 'payments' && <PaymentSummaryView data={data} />}
                    {activeTab === 'purchases' && <PurchaseSummaryView data={data} />}
                    {activeTab === 'inventory' && <InventorySummaryView data={data} />}
                </div>
            )}
        </div>
    );
};

/* --- TAB VIEWS --- */

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
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                                <td className="px-6 py-3.5 text-right font-extrabold text-rose-600">
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
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                                <td className="px-6 py-3.5 text-right font-extrabold text-amber-600">
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
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                                <td className="px-6 py-3.5 font-semibold text-teal">{p.orderNumber}</td>
                                <td className="px-6 py-3.5">{p.customerName}</td>
                                <td className="px-6 py-3.5 font-semibold">{p.paymentMethod}</td>
                                <td className="px-6 py-3.5 text-slate-400">{p.referenceNumber || '—'}</td>
                                <td className="px-6 py-3.5 text-right font-extrabold text-emerald-600">
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
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                                <td className="px-6 py-3.5 text-right text-emerald-600">₹{Number(po.paidAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-rose-600">₹{Number(po.balanceAmount || 0).toLocaleString('en-IN')}</td>
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
            <StatCard label="Total Catalog Value" value={`₹${Number(data.totalInventoryValue || 0).toLocaleString('en-IN')}`} color="teal" />
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
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
                                <td className={`px-6 py-3.5 text-right font-bold ${item.stockQuantity < 10 ? 'text-amber-600' : 'text-slate-900'}`}>
                                    {item.stockQuantity}
                                </td>
                                <td className="px-6 py-3.5 text-right">₹{Number(item.purchasePrice || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right">₹{Number(item.sellingPrice || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-3.5 text-right font-extrabold text-teal">
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
    teal: 'bg-teal/10 text-teal border-teal/20',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
};

const StatCard = ({ label, value, color = 'teal' }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
        <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{value}</span>
            <div className={`w-3 h-3 rounded-full ${colorMap[color] || colorMap.teal}`}></div>
        </div>
    </div>
);

export default ReportsPage;
