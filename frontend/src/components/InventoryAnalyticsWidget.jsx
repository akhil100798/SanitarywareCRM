import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, ShoppingCart, PackageX, Sparkles, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import inventoryAnalyticsService from '../services/inventoryAnalyticsService';

const InventoryAnalyticsWidget = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reorder'); // 'reorder' | 'alerts'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await inventoryAnalyticsService.getSummary();
            setSummary(response.data);
        } catch (error) {
            console.error('Failed to load inventory analytics:', error);
            toast.error('Failed to load inventory analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-medium text-slate-500">Calculating sales velocities and reorder levels...</p>
            </div>
        );
    }

    if (!summary) {
        return null;
    }

    const {
        totalProducts,
        healthyStockCount,
        lowStockCount,
        outOfStockCount,
        totalReorderEstimatedCost,
        lowStockAlerts = [],
        reorderSuggestions = []
    } = summary;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-extrabold tracking-tight">Smart Inventory Analytics & Predictive Reordering</h2>
                    </div>
                    <p className="text-xs text-slate-300">
                        Velocity-based forecasting using 30-day order trends and real-time safety thresholds.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg transition"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Intelligence
                    </button>
                </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50/70 border-b border-slate-100">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                        <span>Total SKUs</span>
                        <PackageX className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">{totalProducts}</div>
                    <div className="text-xxs text-slate-400 mt-1">{healthyStockCount} in safe stock range</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-rose-600 text-xs font-semibold">
                        <span>Out of Stock</span>
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 mt-2">{outOfStockCount}</div>
                    <div className="text-xxs text-rose-600/80 mt-1 font-medium">Needs immediate PO</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-amber-600 text-xs font-semibold">
                        <span>Low Stock Alerts</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-amber-600 mt-2">{lowStockCount}</div>
                    <div className="text-xxs text-amber-600/80 mt-1 font-medium">Below reorder threshold</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold">
                        <span>Est. Reorder Budget</span>
                        <ShoppingCart className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-black text-indigo-600 mt-2">
                        ₹{Number(totalReorderEstimatedCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xxs text-slate-400 mt-1">{reorderSuggestions.length} items suggested</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 pt-4 border-b border-slate-100 flex gap-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('reorder')}
                    className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
                        activeTab === 'reorder'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Predictive Reorder Suggestions ({reorderSuggestions.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
                        activeTab === 'alerts'
                            ? 'border-rose-600 text-rose-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4" />
                    Critical & Low Stock Alerts ({lowStockAlerts.length})
                </button>
            </div>

            {/* Tab 1: Predictive Reorder Suggestions */}
            {activeTab === 'reorder' && (
                <div className="overflow-x-auto">
                    {reorderSuggestions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="font-semibold text-slate-800">All inventory levels are fully healthy!</p>
                            <p className="text-xs text-slate-400 mt-0.5">No products require reordering based on current stock and sales velocity.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xxs tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-4">Product & SKU</th>
                                    <th className="py-3 px-4 text-center">Stock / Threshold</th>
                                    <th className="py-3 px-4 text-center">30d Velocity</th>
                                    <th className="py-3 px-4 text-center">Days Left</th>
                                    <th className="py-3 px-4 text-center">Suggested Qty</th>
                                    <th className="py-3 px-4 text-right">Est. Cost</th>
                                    <th className="py-3 px-4">Supplier</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {reorderSuggestions.map((item) => (
                                    <tr key={item.productId} className="hover:bg-slate-50/50">
                                        <td className="py-3.5 px-4">
                                            <p className="font-bold text-slate-900">{item.productName}</p>
                                            <div className="flex items-center gap-2 text-xxs text-slate-400 mt-0.5">
                                                <span className="font-mono bg-slate-100 px-1 rounded">{item.sku}</span>
                                                <span>•</span>
                                                <span>{item.brandName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`font-bold ${item.currentStock === 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                                {item.currentStock}
                                            </span>
                                            <span className="text-slate-400 text-xs"> / {item.reorderLevel}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-medium">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-xs">
                                                {item.dailySalesVelocity} u/d
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-semibold">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                                item.daysOfStockRemaining <= 3
                                                    ? 'bg-rose-50 text-rose-700'
                                                    : item.daysOfStockRemaining <= 10
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {item.daysOfStockRemaining >= 900 ? 'No sales' : `${item.daysOfStockRemaining}d`}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-extrabold text-indigo-700">
                                            +{item.suggestedReorderQuantity} units
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                            ₹{Number(item.estimatedTotalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[120px]">{item.preferredDistributorName || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <Link
                                                to={`/purchase-orders/new?productId=${item.productId}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                            >
                                                <ShoppingCart className="w-3 h-3" />
                                                Order
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Tab 2: Low Stock Alerts */}
            {activeTab === 'alerts' && (
                <div className="overflow-x-auto">
                    {lowStockAlerts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="font-semibold text-slate-800">No stock threshold alerts!</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xxs tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-4">Urgency</th>
                                    <th className="py-3 px-4">Product Name</th>
                                    <th className="py-3 px-4">SKU</th>
                                    <th className="py-3 px-4 text-center">Current Stock</th>
                                    <th className="py-3 px-4 text-center">Safety Level</th>
                                    <th className="py-3 px-4 text-center">Deficit</th>
                                    <th className="py-3 px-4">Category</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {lowStockAlerts.map((alert) => (
                                    <tr key={alert.productId} className="hover:bg-slate-50/50">
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-extrabold tracking-wider uppercase ${
                                                alert.urgency === 'OUT_OF_STOCK'
                                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                    : alert.urgency === 'CRITICAL'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                            }`}>
                                                {alert.urgency.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-slate-900">{alert.productName}</td>
                                        <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{alert.sku}</td>
                                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-900">{alert.stockQuantity}</td>
                                        <td className="py-3.5 px-4 text-center text-slate-500">{alert.reorderLevel}</td>
                                        <td className="py-3.5 px-4 text-center font-bold text-rose-600">-{alert.deficit}</td>
                                        <td className="py-3.5 px-4 text-xs text-slate-600">{alert.categoryName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryAnalyticsWidget;
