import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShoppingCart, Search } from 'lucide-react';
import quotationService from '../../services/quotationService';
import orderService from '../../services/orderService';
import customerService from '../../services/customerService';
import { productService } from '../../services/productService';
import toast from 'react-hot-toast';
import { calculateDocumentTotals } from '../../utils/documentTotals';
import ProductSearchSelect from '../../components/ProductSearchSelect';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { PageSection } from '../../components/ui/Page';

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
    const totals = calculateDocumentTotals(formData);

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchQuotation();
    }, [id]);

    useEffect(() => {
        if (!productSearchQuery.trim()) return;
        const timer = setTimeout(async () => {
            try {
                const res = await productService.getAll({ query: productSearchQuery.trim(), isActive: true, size: 50 });
                const newProds = res.data?.content || res.data || [];
                setProducts(prev => {
                    const map = new Map();
                    prev.forEach(p => map.set(p.id, p));
                    newProds.forEach(p => map.set(p.id, p));
                    return Array.from(map.values());
                });
            } catch { toast.error('Product search failed'); }
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearchQuery]);

    const filteredProducts = products.filter(p => {
        if (!productSearchQuery.trim()) return true;
        const q = productSearchQuery.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q) || p.hsnCode?.toLowerCase().includes(q);
    });

    const handleProductsUpdate = (newProds) => {
        setProducts(prev => {
            const map = new Map();
            prev.forEach(p => map.set(p.id, p));
            newProds.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
        });
    };

    const fetchInitialData = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                customerService.getActive(),
                productService.getAll({ isActive: true, size: 100 })
            ]);
            setCustomers(custRes.data);
            setProducts(prodRes.data?.content || prodRes.data || []);
        } catch (error) { toast.error('Failed to load customers or products'); }
    };

    const fetchQuotation = async () => {
        try {
            setLoading(true);
            const res = await quotationService.getById(id);
            setFormData(res.data);
        } catch (error) { toast.error('Failed to load quotation'); navigate('/quotations'); }
        finally { setLoading(false); }
    };

    const addItem = () => {
        setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0, discountPercentage: 0, lineTotal: 0 }] });
    };

    const removeItem = (index) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleProductChange = (index, productId, product) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], productId: productId || '' };
        const prod = product || products.find(p => p.id === parseInt(productId, 10));
        if (prod) {
            item.unitPrice = prod.sellingPrice || 0;
            item.productName = prod.name; item.productSku = prod.sku;
            item.barcode = prod.barcode; item.hsnCode = prod.hsnCode; item.gstRate = prod.gstRate;
        } else if (!productId) {
            item.unitPrice = 0; item.productName = ''; item.productSku = '';
            item.barcode = ''; item.hsnCode = ''; item.gstRate = 0;
        }
        const qty = Number(item.quantity) || 0; const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discountPercentage) || 0;
        item.lineTotal = price * qty - (price * qty * disc) / 100;
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };
        const qty = Number(item.quantity) || 0; const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discountPercentage) || 0;
        const sub = price * qty;
        item.lineTotal = sub - (sub * disc) / 100;
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerId) { toast.error('Please select a customer'); return; }
        if (formData.items.length === 0) { toast.error('Please add at least one line item'); return; }
        for (const item of formData.items) {
            if (!item.productId) { toast.error('All items must have a product'); return; }
            if (Number(item.quantity) <= 0) { toast.error('Quantity must be > 0'); return; }
            if (Number(item.unitPrice) < 0) { toast.error('Unit price cannot be negative'); return; }
            if (Number(item.discountPercentage) < 0 || Number(item.discountPercentage) > 100) { toast.error('Discount must be 0-100'); return; }
        }
        try {
            setLoading(true);
            const dataToSave = {
                ...formData, ...totals, customerId: Number(formData.customerId),
                taxPercentage: Number(formData.taxPercentage) || 0, discount: Number(formData.discount) || 0,
                items: formData.items.map(item => ({ ...item, productId: Number(item.productId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discountPercentage: Number(item.discountPercentage) || 0, lineTotal: Number(item.lineTotal) || 0 }))
            };
            if (isEditMode) { await quotationService.update(id, dataToSave); toast.success('Quotation updated'); }
            else { await quotationService.create(dataToSave); toast.success('Quotation created'); }
            navigate('/quotations');
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to save'); }
        finally { setLoading(false); }
    };

    const handleConvertToOrder = async () => {
        if (!window.confirm('Convert this quotation to an order?')) return;
        try {
            setLoading(true);
            const res = await orderService.createFromQuotation(id);
            toast.success('Converted to Order');
            navigate(`/orders/edit/${res.data.id}`);
        } catch (error) { toast.error('Failed to convert'); }
        finally { setLoading(false); }
    };

    if (loading && isEditMode) {
        return <div className="flex justify-center items-center h-96"><p className="text-slate-500 font-semibold">Loading quotation...</p></div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/quotations')} className="btn-ghost"><ArrowLeft size={16} /> Back to Quotations</button>
                <div className="flex gap-2">
                    {isEditMode && formData.status !== 'CONVERTED' && (
                        <Button variant="secondary" onClick={handleConvertToOrder} loading={loading}>
                            <ShoppingCart size={16} /> {loading ? 'Converting...' : 'Convert to Order'}
                        </Button>
                    )}
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Quotation' : 'Create Quotation'}</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Customer" required>
                            <select required name="customerId" className="input-field" value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}>
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Quotation Date">
                            <input type="date" className="input-field" value={formData.quotationDate}
                                onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })} />
                        </Field>
                        <Field label="Valid Until">
                            <input type="date" className="input-field" value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} />
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="section-heading" style={{ margin: 0 }}>Estimate Items</h2>
                            <div className="search-control" style={{ maxWidth: 200 }}>
                                <Search size={14} className="text-muted" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="text" placeholder="Filter products..." className="input-field" style={{ paddingLeft: 28, minHeight: 34, fontSize: 13 }}
                                    value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <Button variant="ghost" onClick={addItem}><Plus size={16} /> Add Line Item</Button>
                    </div>
                    <div className="table-scroll">
                        <table className="data-table line-items" style={{ minWidth: 700 }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 260 }}>Product SKU / Name</th>
                                    <th className="numeric" style={{ width: 100 }}>Qty</th>
                                    <th className="numeric" style={{ width: 120 }}>Unit Price</th>
                                    <th className="numeric" style={{ width: 100 }}>Discount %</th>
                                    <th className="numeric" style={{ width: 120 }}>Total</th>
                                    <th className="numeric" style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.length === 0 ? (
                                    <tr><td colSpan="6" className="state-panel">No line items added yet.</td></tr>
                                ) : formData.items.map((item, index) => {
                                    const selectedProd = products.find(p => p.id === parseInt(item.productId, 10));
                                    return (
                                        <tr key={index}>
                                            <td>
                                                <ProductSearchSelect value={item.productId} onChange={(prodId, prod) => handleProductChange(index, prodId, prod)}
                                                    products={products} onProductsUpdate={handleProductsUpdate} filterQuery={productSearchQuery} placeholder="Select Product" priceField="sellingPrice" />
                                                {selectedProd && (
                                                    <div className="record-meta flex flex-wrap gap-2 mt-1">
                                                        <span>Stock: {selectedProd.stockQuantity ?? 0}</span>
                                                        {selectedProd.barcode && <span>BAR: {selectedProd.barcode}</span>}
                                                        {selectedProd.hsnCode && <span>HSN: {selectedProd.hsnCode}</span>}
                                                        {selectedProd.gstRate != null && <span>GST: {selectedProd.gstRate}%</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="1" className="input-field" style={{ width: 80, textAlign: 'center', padding: '6px 8px', minHeight: 36 }}
                                                    value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 0)} />
                                            </td>
                                            <td className="numeric font-semibold">₹{(item.unitPrice || 0).toLocaleString()}</td>
                                            <td className="numeric">
                                                <input type="number" min="0" max="100" className="input-field" style={{ width: 80, textAlign: 'center', padding: '6px 8px', minHeight: 36 }}
                                                    value={item.discountPercentage} onChange={(e) => handleItemChange(index, 'discountPercentage', parseFloat(e.target.value) || 0)} />
                                            </td>
                                            <td className="numeric font-bold">₹{(item.lineTotal || 0).toLocaleString()}</td>
                                            <td className="numeric">
                                                <button type="button" onClick={() => removeItem(index)} className="btn-ghost" style={{ minHeight: 32, width: 32, padding: 0 }}><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </PageSection>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PageSection>
                        <div className="space-y-4">
                            <Field label="Notes"><textarea className="input-field" rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea></Field>
                            <Field label="Terms & Conditions"><textarea className="input-field" rows="4" value={formData.termsAndConditions} onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}></textarea></Field>
                        </div>
                    </PageSection>

                    <PageSection>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-secondary font-semibold">Subtotal</span><span className="font-semibold">₹{totals.subtotal.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2"><span className="text-secondary font-semibold">Tax (%)</span>
                                    <input type="number" className="input-field" style={{ width: 60, padding: '4px 8px', minHeight: 32 }}
                                        value={formData.taxPercentage} onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <span className="font-semibold">₹{totals.taxAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-secondary font-semibold">Discount</span>
                                <input type="number" className="input-field" style={{ width: 100, textAlign: 'right', padding: '4px 8px', minHeight: 32 }}
                                    value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="financial-summary pt-3 flex justify-between items-center">
                                <span className="text-base font-bold">Net Total</span>
                                <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>₹{totals.total.toLocaleString()}</span>
                            </div>
                            <Button type="submit" loading={loading} className="btn-primary" style={{ width: '100%' }}>
                                {loading ? 'Saving...' : 'Save Quotation'}
                            </Button>
                        </div>
                    </PageSection>
                </div>
            </form>
        </div>
    );
};

export default QuotationFormPage;