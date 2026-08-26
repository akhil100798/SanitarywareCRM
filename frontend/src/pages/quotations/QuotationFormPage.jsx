import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Search } from 'lucide-react';
import quotationService from '../../services/quotationService';
import orderService from '../../services/orderService';
import customerService from '../../services/customerService';
import { productService } from '../../services/productService';
import toast from 'react-hot-toast';

const QuotationFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        customerId: '',
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        taxPercentage: 18,
        discount: 0,
        notes: '',
        termsAndConditions: '1. Quotation valid for 7 days.\n2. 50% advance for orders.\n3. Delivery within 3-5 days of order confirmation.',
        items: []
    });

    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [totals, setTotals] = useState({
        subtotal: 0,
        taxAmount: 0,
        total: 0
    });

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchQuotation();
    }, [id]);

    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.taxPercentage, formData.discount]);

    const filteredProducts = products.filter(p => {
        if (!productSearchQuery.trim()) return true;
        const q = productSearchQuery.toLowerCase();
        return (
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q) ||
            p.hsnCode?.toLowerCase().includes(q)
        );
    });

    const fetchInitialData = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                customerService.getActive(),
                productService.getAll({ size: 100 })
            ]);
            setCustomers(custRes.data);
            setProducts(prodRes.data.content);
        } catch (error) {
            toast.error('Failed to load customers or products');
        }
    };

    const fetchQuotation = async () => {
        try {
            setLoading(true);
            const res = await quotationService.getById(id);
            setFormData(res.data);
        } catch (error) {
            toast.error('Failed to load quotation');
            navigate('/quotations');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
        const taxAmount = (subtotal * (Number(formData.taxPercentage) || 0)) / 100;
        const total = subtotal + taxAmount - (Number(formData.discount) || 0);
        setTotals({ subtotal, taxAmount, total: Math.max(0, total) });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0, discountPercentage: 0, lineTotal: 0 }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };

        if (field === 'productId') {
            const product = products.find(p => p.id === parseInt(value, 10));
            if (product) {
                item.unitPrice = product.sellingPrice || 0;
                item.productName = product.name;
                item.productSku = product.sku;
                item.barcode = product.barcode;
                item.hsnCode = product.hsnCode;
                item.gstRate = product.gstRate;
            }
        }

        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discountPercentage) || 0;
        const sub = price * qty;
        item.lineTotal = sub - (sub * disc) / 100;
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerId) {
            toast.error('Please select a customer');
            return;
        }
        if (formData.items.length === 0) {
            toast.error('Please add at least one line item');
            return;
        }

        for (const item of formData.items) {
            if (!item.productId) {
                toast.error('All line items must have a selected product');
                return;
            }
            if (Number(item.quantity) <= 0) {
                toast.error('Quantity must be greater than 0');
                return;
            }
            if (Number(item.unitPrice) < 0) {
                toast.error('Unit price cannot be negative');
                return;
            }
            if (Number(item.discountPercentage) < 0 || Number(item.discountPercentage) > 100) {
                toast.error('Discount percentage must be between 0 and 100');
                return;
            }
        }

        try {
            setLoading(true);
            const dataToSave = {
                ...formData,
                ...totals,
                customerId: Number(formData.customerId),
                taxPercentage: Number(formData.taxPercentage) || 0,
                discount: Number(formData.discount) || 0,
                items: formData.items.map(item => ({
                    ...item,
                    productId: Number(item.productId),
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    discountPercentage: Number(item.discountPercentage) || 0,
                    lineTotal: Number(item.lineTotal) || 0
                }))
            };
            if (isEditMode) {
                await quotationService.update(id, dataToSave);
                toast.success('Quotation updated');
            } else {
                await quotationService.create(dataToSave);
                toast.success('Quotation created');
            }
            navigate('/quotations');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save quotation');
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToOrder = async () => {
        if (window.confirm('Convert this quotation to an order? This will create a pending order and mark this quotation as converted.')) {
            try {
                setLoading(true);
                const res = await orderService.createFromQuotation(id);
                toast.success('Converted to Order successfully!');
                navigate(`/orders/edit/${res.data.id}`);
            } catch (error) {
                toast.error('Failed to convert to order');
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && isEditMode) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold text-sm">Assembling quotation parameters...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/quotations')}
                    className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
                >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Quotations
                </button>
                <div className="flex space-x-2">
                    {isEditMode && formData.status !== 'CONVERTED' && (
                        <button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center shadow-md active:scale-95 duration-150"
                            onClick={handleConvertToOrder}
                            disabled={loading}
                        >
                            <ShoppingCart size={16} className="mr-2" />
                            {loading ? 'Converting...' : 'Convert to Order'}
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Meta details */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-5">
                        {isEditMode ? 'Edit Sales Quotation' : 'Create Sales Quotation'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Customer *</label>
                            <select
                                required
                                name="customerId"
                                className="input-field text-sm font-medium"
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Quotation Date</label>
                            <input
                                type="date"
                                className="input-field text-sm"
                                value={formData.quotationDate}
                                onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Valid Until</label>
                            <input
                                type="date"
                                className="input-field text-sm"
                                value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Items Canvas */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-slate-700">Estimate Items Line</h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter products..."
                                    className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal w-44"
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-teal hover:text-teal-800 flex items-center text-xs font-bold transition-colors"
                        >
                            <Plus size={16} className="mr-1" /> Add Line Item
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3 min-w-[280px]">Product SKU / Name</th>
                                    <th className="px-4 py-3 w-28">Quantity</th>
                                    <th className="px-4 py-3 w-36">Unit Price</th>
                                    <th className="px-4 py-3 w-28">Discount %</th>
                                    <th className="px-4 py-3 w-36">Line Total</th>
                                    <th className="px-4 py-3 w-16 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.items.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
                                            No line items added yet. Click 'Add Line Item' above.
                                        </td>
                                    </tr>
                                ) : (
                                    formData.items.map((item, index) => {
                                        const selectedProd = products.find(p => p.id === parseInt(item.productId, 10));

                                        return (
                                            <tr key={index} className="text-sm hover:bg-slate-50/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <select
                                                        required
                                                        name="productId"
                                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-white font-medium text-slate-700"
                                                        value={item.productId}
                                                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                                    >
                                                        <option value="">Select Product</option>
                                                        {filteredProducts.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} ({p.sku}) [₹{p.sellingPrice || 0}]
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {selectedProd && (
                                                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                                            <span>Stock: {selectedProd.stockQuantity ?? 0}</span>
                                                            {selectedProd.barcode && (
                                                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                                                    BAR: {selectedProd.barcode}
                                                                </span>
                                                            )}
                                                            {selectedProd.hsnCode && (
                                                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                                                    HSN: {selectedProd.hsnCode}
                                                                </span>
                                                            )}
                                                            {selectedProd.gstRate !== null && selectedProd.gstRate !== undefined && (
                                                                <span className="bg-teal-50 text-teal-700 font-medium px-1.5 py-0.5 rounded">
                                                                    GST: {selectedProd.gstRate}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        name="quantity"
                                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal text-center"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-800">
                                                    ₹{(item.unitPrice || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0" max="100"
                                                        name="discountPercentage"
                                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal text-center"
                                                        value={item.discountPercentage}
                                                        onChange={(e) => handleItemChange(index, 'discountPercentage', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-extrabold text-slate-900">
                                                    ₹{(item.lineTotal || 0).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Terms and Invoice Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Internal Memo Notes</label>
                            <textarea
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal h-24 text-sm resize-none"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Terms & Conditions</label>
                            <textarea
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal h-28 text-sm resize-none"
                                value={formData.termsAndConditions}
                                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 h-fit">
                        <div className="flex justify-between text-slate-500 font-semibold text-sm">
                            <span>Subtotal</span>
                            <span className="text-slate-900">₹{totals.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center text-slate-500 font-semibold text-sm">
                                <span>Tax (%)</span>
                                <input
                                    type="number"
                                    className="w-16 p-1.5 border border-slate-200 rounded-lg ml-2 text-center text-xs"
                                    value={formData.taxPercentage}
                                    onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="text-slate-900 font-semibold text-sm">₹{totals.taxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold text-sm">
                            <span>Manual Deduction Discount</span>
                            <input
                                type="number"
                                className="w-32 p-1.5 border border-slate-200 rounded-lg text-right text-xs"
                                value={formData.discount}
                                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-base font-bold text-slate-900">Net Estimated Amount</span>
                            <span className="text-2xl font-extrabold text-teal">₹{totals.total.toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3.5 mt-2"
                        >
                            <Save size={18} />
                            <span>{loading ? 'Saving...' : 'Save Sales Quotation'}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default QuotationFormPage;
