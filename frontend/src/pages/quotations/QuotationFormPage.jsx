import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Search, Calculator, ShoppingCart } from 'lucide-react';
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

    const fetchInitialData = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                customerService.getActive(),
                productService.getAll({ size: 200 })
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
        const taxAmount = (subtotal * formData.taxPercentage) / 100;
        const total = subtotal + taxAmount - formData.discount;
        setTotals({ subtotal, taxAmount, total });
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
            const product = products.find(p => p.id === parseInt(value));
            if (product) {
                item.unitPrice = product.sellingPrice;
                item.productName = product.name;
                item.productSku = product.sku;
            }
        }

        const sub = item.unitPrice * item.quantity;
        item.lineTotal = sub - (sub * item.discountPercentage) / 100;
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        try {
            setLoading(true);
            const dataToSave = { ...formData, ...totals };
            if (isEditMode) {
                await quotationService.update(id, dataToSave);
                toast.success('Quotation updated');
            } else {
                await quotationService.create(dataToSave);
                toast.success('Quotation created');
            }
            navigate('/quotations');
        } catch (error) {
            toast.error('Failed to save quotation');
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

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/quotations')} className="flex items-center text-gray-600 hover:text-gray-900">
                    <ArrowLeft size={20} className="mr-2" /> Back to List
                </button>
                <div className="flex space-x-2">
                    {isEditMode && formData.status !== 'CONVERTED' && (
                        <button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center shadow-md active:scale-95"
                            onClick={handleConvertToOrder}
                            disabled={loading}
                        >
                            <ShoppingCart size={18} className="mr-2" />
                            {loading ? 'Converting...' : 'Convert to Order'}
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-6">{isEditMode ? 'Edit' : 'New'} Quotation</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Customer *</label>
                            <select
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg"
                                value={formData.quotationDate}
                                onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Valid Until</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg"
                                value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Items</h3>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium"
                        >
                            <Plus size={16} className="mr-1" /> Add Item
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 min-w-[250px]">Product</th>
                                    <th className="px-4 py-3 w-24">Qty</th>
                                    <th className="px-4 py-3 w-32">Unit Price</th>
                                    <th className="px-4 py-3 w-24">Disc %</th>
                                    <th className="px-4 py-3 w-32">Total</th>
                                    <th className="px-4 py-3 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {formData.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3">
                                            <select
                                                required
                                                className="w-full p-2 text-sm border rounded"
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            >
                                                <option value="">Select Product</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full p-2 text-sm border rounded"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm">
                                            ₹{item.unitPrice}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0" max="100"
                                                className="w-full p-2 text-sm border rounded"
                                                value={item.discountPercentage}
                                                onChange={(e) => handleItemChange(index, 'discountPercentage', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-bold text-sm">
                                            ₹{(item.lineTotal || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes</label>
                            <textarea
                                className="w-full p-2 border rounded-lg h-24"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Terms & Conditions</label>
                            <textarea
                                className="w-full p-2 border rounded-lg h-32"
                                value={formData.termsAndConditions}
                                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 h-fit">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <span>Tax (%)</span>
                                <input
                                    type="number"
                                    className="w-16 p-1 border rounded ml-2 text-sm"
                                    value={formData.taxPercentage}
                                    onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <span>₹{totals.taxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Total Discount</span>
                            <input
                                type="number"
                                className="w-32 p-1 border rounded text-right"
                                value={formData.discount}
                                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xl font-bold">Total Amount</span>
                            <span className="text-2xl font-bold text-blue-600">₹{totals.total.toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center"
                        >
                            <Save size={20} className="mr-2" />
                            {loading ? 'Saving...' : 'Save Quotation'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default QuotationFormPage;
