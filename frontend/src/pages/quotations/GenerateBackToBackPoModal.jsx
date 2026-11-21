import React, { useState, useEffect } from 'react';
import { X, Truck, Package, AlertTriangle, CheckCircle2, Calendar, FileText, ArrowRight, Loader2, Sparkles, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import quotationService from '../../services/quotationService';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';

const GenerateBackToBackPoModal = ({ isOpen, onClose, quotation, onOrdersCreated }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [distributors, setDistributors] = useState([]);
    const [orderMode, setOrderMode] = useState('DEFICIT'); // 'DEFICIT' or 'FULL'
    const [groupConfigs, setGroupConfigs] = useState({});
    const [createdPOs, setCreatedPOs] = useState(null);

    useEffect(() => {
        if (isOpen && quotation?.id) {
            loadInitialData();
        } else {
            setPreview(null);
            setCreatedPOs(null);
        }
    }, [isOpen, quotation?.id]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setCreatedPOs(null);
            const [previewRes, distRes] = await Promise.all([
                quotationService.getBackToBackPreview(quotation.id),
                distributorService.getAllActiveDistributors()
            ]);

            const previewData = previewRes.data;
            const distList = Array.isArray(distRes) ? distRes : (distRes?.content || []);

            setPreview(previewData);
            setDistributors(distList);

            // Initialize per-group configs
            const initialConfigs = {};
            const defaultDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            previewData.supplierGroups?.forEach((group, idx) => {
                const groupKey = group.brandName || `group-${idx}`;
                initialConfigs[groupKey] = {
                    distributorId: group.suggestedDistributorId || (distList[0]?.id || ''),
                    expectedDeliveryDate: defaultDelivery,
                    notes: `Back-to-back PO for Quotation ${previewData.quotationNumber} (${group.brandName})`,
                    items: group.items.map(item => ({
                        quotationItemId: item.quotationItemId,
                        productId: item.productId,
                        productSku: item.productSku,
                        productName: item.productName,
                        demandedQuantity: item.requestedQuantity,
                        currentStock: item.currentStock,
                        deficitQuantity: item.deficitQuantity,
                        selected: item.deficitQuantity > 0 || item.requestedQuantity > 0,
                        orderQuantity: item.deficitQuantity > 0 ? item.deficitQuantity : item.requestedQuantity,
                        unitCost: item.unitCost || 0,
                        gstRate: item.gstRate != null ? item.gstRate : 18,
                        hsnCode: item.hsnCode || '',
                        barcode: item.barcode || ''
                    }))
                };
            });

            setGroupConfigs(initialConfigs);
        } catch (error) {
            console.error('Failed to load back-to-back preview:', error);
            toast.error(error.response?.data?.message || 'Failed to prepare purchase order preview');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleModeSwitch = (mode) => {
        setOrderMode(mode);
        setGroupConfigs(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(groupKey => {
                next[groupKey].items = next[groupKey].items.map(it => {
                    const targetQty = mode === 'DEFICIT'
                        ? (it.deficitQuantity > 0 ? it.deficitQuantity : 0)
                        : it.demandedQuantity;
                    return {
                        ...it,
                        selected: targetQty > 0,
                        orderQuantity: targetQty > 0 ? targetQty : it.demandedQuantity
                    };
                });
            });
            return next;
        });
    };

    const handleGroupDistributorChange = (groupKey, distId) => {
        setGroupConfigs(prev => ({
            ...prev,
            [groupKey]: {
                ...prev[groupKey],
                distributorId: distId
            }
        }));
    };

    const handleGroupDeliveryDateChange = (groupKey, date) => {
        setGroupConfigs(prev => ({
            ...prev,
            [groupKey]: {
                ...prev[groupKey],
                expectedDeliveryDate: date
            }
        }));
    };

    const handleItemToggle = (groupKey, index) => {
        setGroupConfigs(prev => {
            const next = { ...prev };
            const items = [...next[groupKey].items];
            items[index] = { ...items[index], selected: !items[index].selected };
            next[groupKey] = { ...next[groupKey], items };
            return next;
        });
    };

    const handleItemQtyChange = (groupKey, index, qty) => {
        const val = Math.max(1, parseInt(qty, 10) || 1);
        setGroupConfigs(prev => {
            const next = { ...prev };
            const items = [...next[groupKey].items];
            items[index] = { ...items[index], orderQuantity: val };
            next[groupKey] = { ...next[groupKey], items };
            return next;
        });
    };

    const handleItemCostChange = (groupKey, index, cost) => {
        const val = Math.max(0, parseFloat(cost) || 0);
        setGroupConfigs(prev => {
            const next = { ...prev };
            const items = [...next[groupKey].items];
            items[index] = { ...items[index], unitCost: val };
            next[groupKey] = { ...next[groupKey], items };
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Assemble request payload
        const groupsToCreate = [];

        for (const [groupKey, config] of Object.entries(groupConfigs)) {
            const selectedItems = config.items.filter(it => it.selected && it.orderQuantity > 0);
            if (selectedItems.length === 0) continue;

            if (!config.distributorId) {
                toast.error(`Please select a distributor for ${groupKey}`);
                return;
            }

            groupsToCreate.push({
                distributorId: Number(config.distributorId),
                orderDate: new Date().toISOString().split('T')[0],
                expectedDeliveryDate: config.expectedDeliveryDate,
                notes: config.notes,
                status: 'DRAFT',
                items: selectedItems.map(it => ({
                    productId: it.productId,
                    quantity: it.orderQuantity,
                    unitCost: it.unitCost,
                    gstRate: it.gstRate,
                    hsnCode: it.hsnCode,
                    barcode: it.barcode,
                    notes: `Back-to-back: Quote #${preview?.quotationNumber}`
                }))
            });
        }

        if (groupsToCreate.length === 0) {
            toast.error('No items selected across supplier groups to order.');
            return;
        }

        try {
            setSubmitting(true);
            const response = await quotationService.generatePurchaseOrders(quotation.id, {
                groups: groupsToCreate
            });

            setCreatedPOs(response.data);
            toast.success(`Generated ${response.data.length} Back-to-Back Purchase Orders!`);
            if (onOrdersCreated) {
                onOrdersCreated(response.data);
            }
        } catch (error) {
            console.error('Failed to generate POs:', error);
            toast.error(error.response?.data?.message || 'Failed to generate purchase orders');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span>Generate Back-to-Back Purchase Orders</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">B2B Procurement</span>
                            </h2>
                            <p className="text-xs text-slate-500">
                                Quotation #{quotation?.quotationNumber} • Client: {quotation?.customerName || preview?.customerName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="py-20 text-center space-y-3">
                            <Loader2 size={36} className="animate-spin text-amber-600 mx-auto" />
                            <p className="text-sm font-semibold text-slate-600">Analyzing inventory levels & distributor assignments...</p>
                        </div>
                    ) : createdPOs ? (
                        /* Success View */
                        <div className="py-10 text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                                <CheckCircle2 size={36} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-gray-900">Purchase Orders Created Successfully!</h3>
                                <p className="text-sm text-slate-500">
                                    {createdPOs.length} purchase order(s) have been generated and dispatched to your procurement pipeline.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
                                {createdPOs.map((po) => (
                                    <div key={po.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-teal text-sm font-mono">{po.poNumber}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{po.status}</span>
                                        </div>
                                        <div className="text-xs text-slate-600">Supplier: <span className="font-semibold">{po.distributorName}</span></div>
                                        <div className="text-xs text-slate-600">Items: <span className="font-semibold">{po.items?.length || 0}</span> | Total: <span className="font-bold text-slate-900">₹{(po.total || 0).toLocaleString()}</span></div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-4">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                                <Link
                                    to="/purchase-orders"
                                    className="px-5 py-2.5 rounded-xl bg-teal text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1.5 shadow-sm"
                                >
                                    <span>View All Purchase Orders</span>
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Normal Configuration View */
                        <>
                            {/* Summary Metric Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-lg font-bold text-slate-800">{preview?.totalLineItems || 0}</div>
                                    <div className="text-[11px] text-slate-500 font-medium">Quote Line Items</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="text-lg font-bold text-amber-700">{preview?.totalDeficitItems || 0}</div>
                                    <div className="text-[11px] text-amber-800 font-medium">Items With Stock Deficit</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="text-lg font-bold text-blue-700">{preview?.supplierGroups?.length || 0}</div>
                                    <div className="text-[11px] text-blue-800 font-medium">Supplier Brands</div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="text-lg font-bold text-emerald-700">₹{(preview?.estimatedTotalProcurementCost || 0).toLocaleString()}</div>
                                    <div className="text-[11px] text-emerald-800 font-medium">Est. Procurement Cost</div>
                                </div>
                            </div>

                            {/* Mode Toggle Banner */}
                            <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-600 flex-shrink-0" />
                                    <span className="font-medium text-slate-700">Select order quantity strategy:</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleModeSwitch('DEFICIT')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${orderMode === 'DEFICIT' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                                    >
                                        Order Only Deficit Items
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleModeSwitch('FULL')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${orderMode === 'FULL' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                                    >
                                        Order Full Quotation Qty
                                    </button>
                                </div>
                            </div>

                            {/* Supplier Groups */}
                            <div className="space-y-6">
                                {Object.entries(groupConfigs).map(([groupKey, config]) => {
                                    const selectedCount = config.items.filter(it => it.selected).length;
                                    const groupTotal = config.items
                                        .filter(it => it.selected)
                                        .reduce((sum, it) => sum + (it.orderQuantity * it.unitCost), 0);

                                    return (
                                        <div key={groupKey} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                            {/* Group Header */}
                                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-2.5">
                                                    <Building2 size={18} className="text-slate-600" />
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{groupKey}</h4>
                                                        <p className="text-xxs text-slate-500 font-medium">{selectedCount} items selected for this supplier</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xxs font-bold text-slate-500 uppercase">Supplier:</span>
                                                        <select
                                                            value={config.distributorId}
                                                            onChange={(e) => handleGroupDistributorChange(groupKey, e.target.value)}
                                                            className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal"
                                                        >
                                                            <option value="">-- Choose Supplier --</option>
                                                            {distributors.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-slate-400" />
                                                        <input
                                                            type="date"
                                                            value={config.expectedDeliveryDate}
                                                            onChange={(e) => handleGroupDeliveryDateChange(groupKey, e.target.value)}
                                                            className="text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                                                        />
                                                    </div>

                                                    <div className="text-xs font-bold text-slate-900 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                        PO Est: ₹{groupTotal.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Group Items Table */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100/60 text-slate-600 text-xxs font-bold uppercase tracking-wider border-b border-slate-200">
                                                            <th className="p-3 w-10">Select</th>
                                                            <th className="p-3">Product Model / SKU</th>
                                                            <th className="p-3 w-20 text-center">Quote Qty</th>
                                                            <th className="p-3 w-24 text-center">Local Stock</th>
                                                            <th className="p-3 w-24 text-center">Deficit</th>
                                                            <th className="p-3 w-28">Order Qty</th>
                                                            <th className="p-3 w-28">Unit Cost (₹)</th>
                                                            <th className="p-3 w-28 text-right">PO Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {config.items.map((it, idx) => (
                                                            <tr key={it.productId || idx} className={`hover:bg-slate-50/60 transition-colors ${!it.selected ? 'opacity-40 bg-slate-50/20' : ''}`}>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={it.selected}
                                                                        onChange={() => handleItemToggle(groupKey, idx)}
                                                                        className="rounded border-slate-300 text-teal focus:ring-teal cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="font-bold text-slate-800">{it.productName}</div>
                                                                    <div className="text-xxs font-mono text-slate-400">SKU: {it.productSku}</div>
                                                                </td>
                                                                <td className="p-3 text-center font-bold text-slate-700">
                                                                    {it.demandedQuantity}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-xxs font-bold ${it.currentStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                                        {it.currentStock} in stock
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {it.deficitQuantity > 0 ? (
                                                                        <span className="inline-block px-2 py-0.5 rounded text-xxs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                                                            Need {it.deficitQuantity}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xxs font-medium text-emerald-600">Surplus</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={it.orderQuantity}
                                                                        disabled={!it.selected}
                                                                        onChange={(e) => handleItemQtyChange(groupKey, idx, e.target.value)}
                                                                        className="w-20 p-1 text-center border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal disabled:bg-slate-100"
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={it.unitCost}
                                                                        disabled={!it.selected}
                                                                        onChange={(e) => handleItemCostChange(groupKey, idx, e.target.value)}
                                                                        className="w-24 p-1 text-right border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal disabled:bg-slate-100"
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-right font-extrabold text-slate-900">
                                                                    ₹{(it.selected ? it.orderQuantity * it.unitCost : 0).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                {!createdPOs && !loading && (
                    <div className="p-5 border-t border-gray-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 font-medium">
                            Orders will be drafted under Purchase Orders with Back-to-Back links to this quotation.
                        </div>
                        <div className="flex items-center space-x-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="btn-primary py-2.5 px-6 text-xs flex items-center justify-center space-x-2 shadow-md bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Creating Purchase Orders...</span>
                                    </>
                                ) : (
                                    <>
                                        <Truck size={16} />
                                        <span>Generate Purchase Orders</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenerateBackToBackPoModal;
