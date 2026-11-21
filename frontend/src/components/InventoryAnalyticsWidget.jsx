import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    AlertCircle, 
    AlertTriangle, 
    CheckCircle2, 
    RefreshCw, 
    ShoppingCart, 
    Sparkles, 
    Clock,
    Flame,
    DollarSign,
    Send,
    MessageCircle,
    Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import inventoryAnalyticsService from '../services/inventoryAnalyticsService';
import reminderAutomationService from '../services/reminderAutomationService';

export default function InventoryAnalyticsWidget() {
    const [summary, setSummary] = useState(null);
    const [deadStock, setDeadStock] = useState(null);
    const [reminderPreview, setReminderPreview] = useState(null);
    const [reminderHistory, setReminderHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reorder'); // 'reorder' | 'dead-stock' | 'reminders' | 'alerts'
    const [triggeringReminders, setTriggeringReminders] = useState(false);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const [sumRes, deadRes, remRes, histRes] = await Promise.all([
                inventoryAnalyticsService.getSummary(),
                inventoryAnalyticsService.getDeadStock(),
                reminderAutomationService.getPreview(),
                reminderAutomationService.getHistory()
            ]);

            setSummary(sumRes.data);
            setDeadStock(deadRes.data);
            setReminderPreview(remRes.data);
            setReminderHistory(histRes.data || []);
        } catch (error) {
            console.error('Failed to load inventory intelligence:', error);
            toast.error('Failed to load inventory intelligence');
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerAllReminders = async () => {
        setTriggeringReminders(true);
        const toastId = toast.loading('Executing automated WhatsApp reminder batch...');
        try {
            const res = await reminderAutomationService.triggerAllReminders();
            const data = res.data;
            toast.success(
                `Reminders processed: ${data.sentCount} sent, ${data.simulatedCount} simulated, ${data.skippedAlreadySentCount} skipped.`,
                { id: toastId, duration: 4000 }
            );
            // Refresh reminder data
            const [remRes, histRes] = await Promise.all([
                reminderAutomationService.getPreview(),
                reminderAutomationService.getHistory()
            ]);
            setReminderPreview(remRes.data);
            setReminderHistory(histRes.data || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to dispatch reminders', { id: toastId });
        } finally {
            setTriggeringReminders(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-base font-bold text-slate-800">Calculating AI Demand Forecasting & Stagnation Metrics...</h3>
                <p className="text-xs text-slate-400 mt-1">Analyzing 30-day order velocities, manufacturer lead times, and dead stock capital.</p>
            </div>
        );
    }

    if (!summary) return null;

    const {
        totalReorderEstimatedCost = 0,
        lowStockAlerts = [],
        reorderSuggestions = []
    } = summary;

    const deadStockSummary = deadStock || summary.deadStockSummary || {
        totalDeadStockSkus: 0,
        totalSlowMovingSkus: 0,
        totalCapitalLocked: 0,
        totalMonthlyCarryingCost: 0,
        items: []
    };

    const leadTimeAlerts = reorderSuggestions.filter(r => r.leadTimeUrgency === 'STOCKOUT_IMMINENT' || r.leadTimeUrgency === 'ORDER_THIS_WEEK');

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden mb-8">
            {/* Executive Dark Header */}
            <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
                                <Sparkles size={20} />
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                                AI Operations Engine
                            </span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">
                            Predictive Inventory Intelligence & Automated CRM
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                            Lead-time aware replenishment, dead-stock capital liquidation bundles, and automated WhatsApp follow-ups for expiring quotes & balance dues.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleTriggerAllReminders}
                            disabled={triggeringReminders}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                        >
                            <Send size={14} />
                            {triggeringReminders ? 'Dispatching...' : 'Run Auto WhatsApp Reminders'}
                        </button>
                        <button
                            type="button"
                            onClick={loadAllData}
                            className="p-2.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
                            title="Refresh Intelligence Data"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                        <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                            <span>Lead Time Alerts</span>
                            <Clock size={13} className="text-amber-400" />
                        </div>
                        <div className="text-xl font-black text-amber-400 mt-1.5">{leadTimeAlerts.length} SKUs</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Stockout risk during lead time</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                        <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                            <span>Dead Stock SKUs</span>
                            <Flame size={13} className="text-rose-400" />
                        </div>
                        <div className="text-xl font-black text-rose-400 mt-1.5">
                            {deadStockSummary.totalDeadStockSkus + deadStockSummary.totalSlowMovingSkus}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">&gt;60 days idle in warehouse</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                        <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                            <span>Locked Capital</span>
                            <DollarSign size={13} className="text-indigo-400" />
                        </div>
                        <div className="text-xl font-black text-indigo-300 mt-1.5">
                            ₹{Number(deadStockSummary.totalCapitalLocked || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Idle inventory investment</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                        <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                            <span>Est. Reorder Budget</span>
                            <ShoppingCart size={13} className="text-emerald-400" />
                        </div>
                        <div className="text-xl font-black text-emerald-400 mt-1.5">
                            ₹{Number(totalReorderEstimatedCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{reorderSuggestions.length} items suggested</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm col-span-2 lg:col-span-1">
                        <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                            <span>Pending Reminders</span>
                            <MessageCircle size={13} className="text-emerald-400" />
                        </div>
                        <div className="text-xl font-black text-emerald-300 mt-1.5">
                            {reminderPreview?.totalPendingReminders || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                            {reminderPreview?.quotationExpiryCount || 0} quotes, {reminderPreview?.paymentBalanceDueCount || 0} balances
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-2 pt-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('reorder')}
                    className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'reorder'
                            ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Clock size={15} />
                    Lead-Time Reorder Planner ({reorderSuggestions.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('dead-stock')}
                    className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'dead-stock'
                            ? 'border-rose-600 text-rose-600 bg-white shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Flame size={15} />
                    Dead Stock & Clearance Bundles ({deadStockSummary.items?.length || 0})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('reminders')}
                    className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'reminders'
                            ? 'border-emerald-600 text-emerald-600 bg-white shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <MessageCircle size={15} />
                    Automated Reminders Hub ({reminderPreview?.totalPendingReminders || 0})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'alerts'
                            ? 'border-amber-600 text-amber-600 bg-white shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <AlertTriangle size={15} />
                    Stock Depletion Alerts ({lowStockAlerts.length})
                </button>
            </div>

            {/* TAB 1: Lead-Time Reorder Planner */}
            {activeTab === 'reorder' && (
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                            Forecast calculated using 30-day sales velocity and manufacturer replenishment cycle (e.g. 21-day ceramic fixtures).
                        </span>
                        <span className="font-semibold text-slate-700">
                            {leadTimeAlerts.length} urgent replenishment orders needed
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                                <tr>
                                    <th className="py-3 px-4">Product / SKU</th>
                                    <th className="py-3 px-4">Stock & Velocity</th>
                                    <th className="py-3 px-4">Lead Time</th>
                                    <th className="py-3 px-4">Order Deadline</th>
                                    <th className="py-3 px-4">Suggested PO</th>
                                    <th className="py-3 px-4">Est. Cost</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reorderSuggestions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            All inventory SKUs are within safe replenishment limits.
                                        </td>
                                    </tr>
                                ) : (
                                    reorderSuggestions.map((item) => {
                                        const isUrgent = item.leadTimeUrgency === 'STOCKOUT_IMMINENT';
                                        const isWarning = item.leadTimeUrgency === 'ORDER_THIS_WEEK';

                                        return (
                                            <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900">{item.productName}</div>
                                                    <div className="text-[11px] text-slate-400">
                                                        SKU: {item.sku} | {item.brandName} • {item.categoryName}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-800">
                                                        {item.currentStock} units
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {item.dailySalesVelocity} units/day ({item.daysOfStockRemaining} days left)
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200/60">
                                                        <Clock size={11} />
                                                        {item.leadTimeDays || 14} Days
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4">
                                                    {isUrgent ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 animate-pulse">
                                                            <AlertCircle size={12} />
                                                            Order Immediately!
                                                        </span>
                                                    ) : isWarning ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                                                            <Clock size={12} />
                                                            Order in {item.daysUntilReorderDeadline}d
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 font-medium">
                                                            In {item.daysUntilReorderDeadline} days
                                                        </span>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 max-w-[200px]">
                                                        {item.reorderReason}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        +{item.suggestedReorderQuantity} units
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Safety Point: {item.reorderPoint}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 font-bold text-slate-800">
                                                    ₹{Number(item.estimatedTotalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <Link
                                                        to={`/purchase-orders/new?productId=${item.productId}&quantity=${item.suggestedReorderQuantity}&distributorId=${item.preferredDistributorId || ''}`}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
                                                    >
                                                        <ShoppingCart size={13} />
                                                        Generate PO
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: Dead Stock & Clearance Bundles */}
            {activeTab === 'dead-stock' && (
                <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/60 border border-rose-200 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <Flame size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-rose-900">
                                    Warehouse Stagnation & Idle Capital Analysis
                                </h4>
                                <p className="text-[11px] text-rose-700 mt-0.5">
                                    Identifies bulky sanitaryware sitting idle &gt;45 days with holding costs (~2% per month) to suggest clearance markdowns & high-velocity bundles.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs shrink-0 font-semibold text-rose-900">
                            <div>
                                Capital Locked: <span className="font-bold text-base">₹{Number(deadStockSummary.totalCapitalLocked || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="text-rose-600">
                                Carrying: ₹{Number(deadStockSummary.totalMonthlyCarryingCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                                <tr>
                                    <th className="py-3 px-4">Stagnant SKU</th>
                                    <th className="py-3 px-4">Idle Duration</th>
                                    <th className="py-3 px-4">Current Stock</th>
                                    <th className="py-3 px-4">Capital Locked</th>
                                    <th className="py-3 px-4">Monthly Cost</th>
                                    <th className="py-3 px-4">AI Liquidation Recommendation</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!deadStockSummary.items || deadStockSummary.items.length === 0) ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            No stagnant inventory found! All products have active sales movement within 45 days.
                                        </td>
                                    </tr>
                                ) : (
                                    deadStockSummary.items.map((item) => {
                                        const isDead = item.stagnationTier === 'DEAD_STOCK';
                                        const isSlow = item.stagnationTier === 'SLOW_MOVING';

                                        return (
                                            <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900">{item.productName}</div>
                                                    <div className="text-[11px] text-slate-400">
                                                        SKU: {item.sku} | {item.brandName} • Finish: {item.color}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] border ${
                                                        isDead ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                        isSlow ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                        'bg-yellow-50 text-yellow-800 border-yellow-200'
                                                    }`}>
                                                        <Clock size={11} />
                                                        {item.daysIdle} Days Idle
                                                    </span>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {item.lastSoldDate ? `Last sold: ${item.lastSoldDate}` : 'Never sold'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 font-bold text-slate-800">
                                                    {item.currentStock} units
                                                </td>

                                                <td className="py-3 px-4 font-bold text-slate-900">
                                                    ₹{Number(item.lockedCapital || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </td>

                                                <td className="py-3 px-4 text-rose-600 font-semibold">
                                                    ₹{Number(item.monthlyCarryingCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-snug">
                                                        <span className="font-bold text-indigo-600 mr-1">
                                                            {item.suggestedDiscountPercent}% Markdown:
                                                        </span>
                                                        {item.recommendedAction}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <Link
                                                        to={`/quotations/new?addDiscount=${item.suggestedDiscountPercent}&notes=Clearance+Liquidation`}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                                                    >
                                                        <Zap size={13} />
                                                        Draft Clearance Quote
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: Automated WhatsApp Reminders Hub */}
            {activeTab === 'reminders' && (
                <div className="p-6 space-y-6">
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/20">
                                <MessageCircle size={22} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Intelligent WhatsApp CRM & Automation Hub
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Scheduled cron triggers daily morning follow-ups at 9:00 AM. Run on-demand anytime below.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleTriggerAllReminders}
                                disabled={triggeringReminders}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                                <Send size={14} />
                                {triggeringReminders ? 'Sending Batch...' : 'Trigger All Pending Reminders'}
                            </button>
                        </div>
                    </div>

                    {/* Pending Reminders Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Column 1: Quotations Expiring in 3 Days */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                                    <Clock size={15} className="text-amber-600" />
                                    Expiring Quotations (Next 3 Days)
                                </div>
                                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                                    {reminderPreview?.quotationExpiryCount || 0}
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto p-2">
                                {(!reminderPreview?.quotationReminders || reminderPreview.quotationReminders.length === 0) ? (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                        No quotations currently expiring in the next 3 days.
                                    </div>
                                ) : (
                                    reminderPreview.quotationReminders.map((q) => (
                                        <div key={q.referenceId} className="p-3 hover:bg-slate-50 rounded-xl transition">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-900">{q.referenceNumber}</span>
                                                <span className="text-[11px] font-bold text-amber-600">
                                                    Expires: {q.dueDate} ({q.daysRemaining}d left)
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-600 mt-1">
                                                {q.customerName} • <span className="font-semibold">{q.customerPhone}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                                Total: ₹{Number(q.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                            {q.alreadySentToday && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1.5">
                                                    <CheckCircle2 size={11} /> Reminder sent today ({new Date(q.lastSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Column 2: Orders with Pending Balances */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                                    <DollarSign size={15} className="text-emerald-600" />
                                    Outstanding Order Balances Due
                                </div>
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                                    {reminderPreview?.paymentBalanceDueCount || 0}
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto p-2">
                                {(!reminderPreview?.paymentReminders || reminderPreview.paymentReminders.length === 0) ? (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                        No outstanding balance dues requiring reminders.
                                    </div>
                                ) : (
                                    reminderPreview.paymentReminders.map((o) => (
                                        <div key={o.referenceId} className="p-3 hover:bg-slate-50 rounded-xl transition">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-900">{o.referenceNumber}</span>
                                                <span className="text-xs font-bold text-rose-600">
                                                    Balance Due: ₹{Number(o.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-600 mt-1">
                                                {o.customerName} • <span className="font-semibold">{o.customerPhone}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                Order Date: {o.dueDate}
                                            </div>
                                            {o.alreadySentToday && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1.5">
                                                    <CheckCircle2 size={11} /> Reminder sent today
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dispatch History Audit Table */}
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            Recent Automated Reminder Audit Logs
                        </h4>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-3">Sent At</th>
                                        <th className="py-2.5 px-3">Type</th>
                                        <th className="py-2.5 px-3">Reference</th>
                                        <th className="py-2.5 px-3">Recipient</th>
                                        <th className="py-2.5 px-3">Delivery Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reminderHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-slate-400">
                                                No reminders dispatched yet. Click "Run Auto WhatsApp Reminders" above to send the first batch.
                                            </td>
                                        </tr>
                                    ) : (
                                        reminderHistory.map((h) => (
                                            <tr key={h.id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                                    {new Date(h.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {h.reminderType}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                                    {h.referenceNumber}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600">
                                                    {h.recipientName} ({h.recipientPhone})
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        h.deliveryStatus === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                                                        h.deliveryStatus === 'SIMULATED' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {h.deliveryStatus}
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
            )}

            {/* TAB 4: Stock Depletion Alerts */}
            {activeTab === 'alerts' && (
                <div className="p-6">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                                <tr>
                                    <th className="py-3 px-4">Urgency</th>
                                    <th className="py-3 px-4">Product / SKU</th>
                                    <th className="py-3 px-4">Current Stock</th>
                                    <th className="py-3 px-4">Reorder Level</th>
                                    <th className="py-3 px-4">Deficit</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lowStockAlerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            No critical low-stock alerts. All inventory levels are healthy!
                                        </td>
                                    </tr>
                                ) : (
                                    lowStockAlerts.map((alert) => (
                                        <tr key={alert.productId} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                                                    alert.urgency === 'OUT_OF_STOCK'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : alert.urgency === 'CRITICAL'
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {alert.urgency.replace(/_/g, ' ')}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900">{alert.productName}</div>
                                                <div className="text-[11px] text-slate-400">
                                                    SKU: {alert.sku} | {alert.brandName} • {alert.categoryName}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {alert.stockQuantity} units
                                            </td>

                                            <td className="py-3 px-4 text-slate-500 font-medium">
                                                {alert.reorderLevel} units
                                            </td>

                                            <td className="py-3 px-4 font-bold text-rose-600">
                                                -{alert.deficit} units
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <Link
                                                    to={`/purchase-orders/new?productId=${alert.productId}&quantity=${alert.deficit > 0 ? alert.deficit : 10}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
                                                >
                                                    <ShoppingCart size={13} />
                                                    Reorder
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
