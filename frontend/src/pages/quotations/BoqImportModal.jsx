import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, Loader2, Package, Sparkles } from 'lucide-react';
import quotationService from '../../services/quotationService';
import toast from 'react-hot-toast';

const BoqImportModal = ({ isOpen, onClose, onImportItems }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [items, setItems] = useState([]);
    const [appendMode, setAppendMode] = useState(true);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setResult(null);
            setItems([]);
        }
    };

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error('Please select an Excel, PDF, or CSV file');
            return;
        }

        try {
            setLoading(true);
            const response = await quotationService.importBoq(file);
            setResult(response.data);
            setItems(response.data.items.map((item) => ({
                ...item,
                selected: item.matchStatus !== 'UNMATCHED',
                currentQty: item.requestedQuantity || 1,
                currentPrice: item.unitPrice || 0
            })));
            toast.success(`Detected ${response.data.totalRows} items with ${response.data.matchedCount} exact matches!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to analyze requirement sheet');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyItems = () => {
        const selectedItems = items.filter((i) => i.selected && i.matchedProductId);
        if (selectedItems.length === 0) {
            toast.error('Select at least one matched product row to populate.');
            return;
        }

        const quotationItems = selectedItems.map((item) => {
            const qty = Number(item.currentQty) || 1;
            const price = Number(item.currentPrice) || 0;
            return {
                productId: item.matchedProductId,
                productName: item.matchedProductName,
                productSku: item.matchedProductSku,
                quantity: qty,
                unitPrice: price,
                discountPercentage: 0,
                lineTotal: qty * price,
                barcode: item.barcode || '',
                hsnCode: item.hsnCode || '',
                gstRate: item.gstRate != null ? Number(item.gstRate) : 18,
                notes: item.requestedDescription !== item.matchedProductName ? `BOQ Req: ${item.requestedDescription}` : ''
            };
        });

        onImportItems(quotationItems, appendMode);
        toast.success(`Added ${quotationItems.length} items to quotation!`);
        onClose();
    };

    const handleCandidateSelect = (index, candidateId) => {
        setItems((prev) => {
            const next = [...prev];
            const row = { ...next[index] };
            const candidate = row.candidateOptions?.find((c) => String(c.id) === String(candidateId));
            if (candidate) {
                row.matchedProductId = candidate.id;
                row.matchedProductName = candidate.name;
                row.matchedProductSku = candidate.sku;
                row.brandName = candidate.brandName;
                row.currentPrice = candidate.sellingPrice || candidate.mrp || 0;
                row.unitPrice = candidate.sellingPrice || candidate.mrp || 0;
                row.stockQuantity = candidate.stockQuantity;
                row.primaryImageUrl = candidate.primaryImageUrl;
                row.matchStatus = 'EXACT_MATCH';
                row.selected = true;
            }
            next[index] = row;
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${result ? 'max-w-5xl' : 'max-w-xl'} overflow-hidden transition-all duration-200 animate-in fade-in zoom-in`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-2">
                        <FileText className="text-teal" size={24} />
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Import Quotation Items from Customer BOQ</h2>
                            <p className="text-xs text-slate-500">Auto-match contractor PDFs, Excel sheets, and CSV requirements</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {!result ? (
                        <form onSubmit={handleAnalyze} className="space-y-6">
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-teal transition-all cursor-pointer relative bg-slate-50/50">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.webp,image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={loading}
                                />
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-teal/10 text-teal rounded-full flex items-center justify-center mx-auto">
                                        <Upload size={24} />
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {file ? (
                                            <span className="font-bold text-teal underline">{file.name}</span>
                                        ) : (
                                            <>
                                                <span className="font-bold text-teal underline">Click to upload</span> or drag and drop requirement file
                                            </>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">Supported: Excel (.xlsx, .xls), PDF (.pdf), CSV, Camera Photos / OCR (.jpg, .png, .webp) (Max 50 MB)</div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-4 flex items-start space-x-3 text-xs text-blue-900">
                                <Sparkles size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold mb-0.5">Intelligent Catalog Matcher & OCR:</p>
                                    <p>The parser scans line items, extracts model codes & quantities, and performs exact and semantic matching. Built-in OCR extracts text from mobile photos and contractor slips.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="w-full bg-teal hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Analyzing document & matching SKUs...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>Analyze Requirement Sheet</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-5">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <div className="text-xl font-bold text-slate-800">{result.totalRows}</div>
                                    <div className="text-[11px] text-slate-500 font-medium">Total Lines</div>
                                </div>
                                <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                                    <div className="text-xl font-bold text-emerald-700">{result.matchedCount}</div>
                                    <div className="text-[11px] text-emerald-800 font-medium">Exact Matches</div>
                                </div>
                                <div className="rounded-xl bg-amber-50 p-3 border border-amber-100">
                                    <div className="text-xl font-bold text-amber-700">{result.fuzzyCount}</div>
                                    <div className="text-[11px] text-amber-800 font-medium">Fuzzy Suggestions</div>
                                </div>
                                <div className="rounded-xl bg-rose-50 p-3 border border-rose-100">
                                    <div className="text-xl font-bold text-rose-700">{result.unmatchedCount}</div>
                                    <div className="text-[11px] text-rose-800 font-medium">Unmatched</div>
                                </div>
                                <div className="rounded-xl bg-blue-50 p-3 border border-blue-100">
                                    <div className="text-xl font-bold text-blue-700">₹{Number(result.estimatedSubtotal || 0).toLocaleString()}</div>
                                    <div className="text-[11px] text-blue-800 font-medium">Est. Subtotal</div>
                                </div>
                            </div>

                            {/* Table of Matched Items */}
                            <div className="max-h-96 overflow-auto rounded-xl border border-gray-200">
                                <table className="min-w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold shadow-xs">
                                        <tr>
                                            <th className="p-2.5 w-10">Select</th>
                                            <th className="p-2.5">Document Line / SKU</th>
                                            <th className="p-2.5">Matched Catalog Product</th>
                                            <th className="p-2.5 w-20">Qty</th>
                                            <th className="p-2.5">Unit Price (₹)</th>
                                            <th className="p-2.5">Line Total</th>
                                            <th className="p-2.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((row, idx) => (
                                            <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${!row.selected ? 'opacity-50' : ''}`}>
                                                <td className="p-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.selected}
                                                        disabled={!row.matchedProductId}
                                                        onChange={(e) => {
                                                            setItems((prev) => {
                                                                const next = [...prev];
                                                                next[idx] = { ...next[idx], selected: e.target.checked };
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2.5 max-w-xs">
                                                    <div className="font-semibold text-slate-900">{row.requestedDescription || row.rawText}</div>
                                                    {row.requestedSku && (
                                                        <span className="font-mono text-[10px] text-slate-400 block">Req SKU: {row.requestedSku}</span>
                                                    )}
                                                </td>
                                                <td className="p-2.5 max-w-xs">
                                                    {row.matchedProductId ? (
                                                        <div>
                                                            <div className="font-bold text-slate-800">{row.matchedProductName}</div>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                                <span className="font-mono font-semibold">{row.matchedProductSku}</span>
                                                                <span>· {row.brandName}</span>
                                                                <span className={row.stockQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                                    ({row.stockQuantity ?? 0} in stock)
                                                                </span>
                                                            </div>
                                                            {/* Alternative candidates dropdown if fuzzy matched */}
                                                            {row.candidateOptions?.length > 1 && (
                                                                <select
                                                                    className="mt-1 text-[11px] p-1 border rounded bg-slate-50 text-slate-700 w-full"
                                                                    value={row.matchedProductId}
                                                                    onChange={(e) => handleCandidateSelect(idx, e.target.value)}
                                                                >
                                                                    {row.candidateOptions.map((c) => (
                                                                        <option key={c.id} value={c.id}>
                                                                            {c.sku} - {c.name} (₹{c.sellingPrice})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No matching catalog product found</span>
                                                    )}
                                                </td>
                                                <td className="p-2.5">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={row.currentQty}
                                                        onChange={(e) => {
                                                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                            setItems((prev) => {
                                                                const next = [...prev];
                                                                next[idx] = { ...next[idx], currentQty: val };
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-16 px-2 py-1 text-xs border rounded text-center font-bold"
                                                    />
                                                </td>
                                                <td className="p-2.5 font-bold text-slate-800">
                                                    ₹{Number(row.currentPrice || 0).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 font-bold text-teal">
                                                    ₹{(Number(row.currentPrice || 0) * Number(row.currentQty || 1)).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 whitespace-nowrap">
                                                    {row.matchStatus === 'EXACT_MATCH' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                            Exact Match
                                                        </span>
                                                    )}
                                                    {row.matchStatus === 'FUZZY_MATCH' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                            Fuzzy Match
                                                        </span>
                                                    )}
                                                    {row.matchStatus === 'UNMATCHED' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                                            Unmatched
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mode & Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={appendMode}
                                        onChange={(e) => setAppendMode(e.target.checked)}
                                    />
                                    <span>Append to existing items in quotation (uncheck to replace all)</span>
                                </label>

                                <div className="flex space-x-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => { setResult(null); setFile(null); }}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                                    >
                                        Choose Another File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyItems}
                                        className="px-5 py-2 text-xs font-bold text-white bg-teal hover:bg-teal-700 rounded-xl shadow-md flex items-center space-x-1.5"
                                    >
                                        <CheckCircle2 size={16} />
                                        <span>Populate Quotation ({items.filter((i) => i.selected && i.matchedProductId).length} items)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BoqImportModal;
