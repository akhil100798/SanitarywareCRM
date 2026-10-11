import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, CreditCard } from 'lucide-react';
import orderService from '../../services/orderService';
import quotationService from '../../services/quotationService';
import customerService from '../../services/customerService';
import { productService } from '../../services/productService';
import fileUploadService from '../../services/fileUploadService';
import toast from 'react-hot-toast';
import { calculateDocumentTotals } from '../../utils/documentTotals';
import ProductSearchSelect from '../../components/ProductSearchSelect';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { PageSection } from '../../components/ui/Page';

const OrderFormPage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const quotationId = searchParams.get('fromQuotation');
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [formData, setFormData] = useState({
        customerId: '',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        taxPercentage: 18,
        discount: 0,
        shippingCharge: 0,
        shippingAddress: '',
        notes: '',
        billPadImageUrl: '',
        items: []
    });

    const totals = calculateDocumentTotals(formData);

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchOrder();
        else if (quotationId) fetchFromQuotation();
    }, [id, quotationId]);

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
            } catch {}
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

    const fetchOrder = async () => {
        try { setLoading(true); const res = await orderService.getById(id); setFormData(res.data); }
        catch (error) { toast.error('Failed to load order'); navigate('/orders'); }
        finally { setLoading(false); }
    };

    const fetchFromQuotation = async () => {
        try {
            setLoading(true);
            const res = await quotationService.getById(quotationId);
            const qData = res.data;
            setFormData({
                ...formData,
                customerId: qData.customerId, taxPercentage: qData.taxPercentage, discount: qData.discount,
                notes: 'Created from Quotation: ' + qData.quotationNumber,
                items: qData.items.map(item => ({
                    productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice,
                    discountPercentage: item.discountPercentage, lineTotal: item.lineTotal,
                    productName: item.productName, productSku: item.productSku
                }))
            });
            toast.success('Loaded from quotation');
        } catch (error) { toast.error('Failed to load quotation'); }
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
            item.unitPrice = prod.sellingPrice || 0; item.productName = prod.name; item.productSku = prod.sku;
            item.barcode = prod.barcode; item.hsnCode = prod.hsnCode; item.gstRate = prod.gstRate; item.discountPercentage = 0;
        } else if (!productId) {
            item.unitPrice = 0; item.productName = ''; item.productSku = '';
            item.barcode = ''; item.hsnCode = ''; item.gstRate = 0; item.discountPercentage = 0;
        }
        const qty = Number(item.quantity) || 0; const price = Number(item.unitPrice) || 0;
        const discPct = Number(item.discountPercentage) || 0;
        item.lineTotal = price * qty * (1 - discPct / 100);
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };
        if (field === 'productId') {
            const product = products.find(p => p.id === parseInt(value, 10));
            if (product) {
                item.unitPrice = product.sellingPrice || 0; item.productName = product.name; item.productSku = product.sku;
                item.barcode = product.barcode; item.hsnCode = product.hsnCode; item.gstRate = product.gstRate;
                item.discountPercentage = 0;
            }
        }
        const qty = Number(item.quantity) || 0; const price = Number(item.unitPrice) || 0;
        const discPct = Number(item.discountPercentage) || 0;
        item.lineTotal = price * qty * (1 - discPct / 100);
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Only image files allowed'); return; }
        try {
            setUploadingFile(true);
            const response = await fileUploadService.uploadFile(file, 'billpads');
            setFormData({ ...formData, billPadImageUrl: response.fileName });
            toast.success('Bill pad uploaded');
        } catch (error) { toast.error('Upload failed'); }
        finally { setUploadingFile(false); e.target.value = null; }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerId) { toast.error('Select a customer'); return; }
        if (formData.items.length === 0) { toast.error('Add at least one item'); return; }
        for (const item of formData.items) {
            if (!item.productId) { toast.error('All items need a product'); return; }
            if (Number(item.quantity) <= 0) { toast.error('Quantity must be > 0'); return; }
            if (Number(item.unitPrice) < 0) { toast.error('Unit price cannot be negative'); return; }
            if (Number(item.discountPercentage) < 0 || Number(item.discountPercentage) > 100) { toast.error('Discount must be 0-100'); return; }
        }
        try {
            setLoading(true);
            const dataToSave = {
                ...formData, ...totals, customerId: Number(formData.customerId),
                taxPercentage: Number(formData.taxPercentage) || 0, discount: Number(formData.discount) || 0,
                shippingCharge: Number(formData.shippingCharge) || 0,
                items: formData.items.map(item => ({ ...item, productId: Number(item.productId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discountPercentage: Number(item.discountPercentage) || 0, lineTotal: Number(item.lineTotal) || 0 }))
            };
            if (isEditMode) { await orderService.update(id, dataToSave); toast.success('Order updated'); }
            else { await orderService.create(dataToSave); toast.success('Order created'); }
            navigate('/orders');
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to save order'); }
        finally { setLoading(false); }
    };

    if (loading && isEditMode) {
        return <div className="flex justify-center items-center h-96"><p className="text-slate-500 font-semibold">Loading order...</p></div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/orders')} className="btn-ghost"><ArrowLeft size={16} /> Back to Orders</button>
                <div className="flex gap-2">
                    {isEditMode && formData.paymentStatus !== 'PAID' && (
                        <Button variant="secondary" onClick={() => navigate(`/payments/new?orderId=${id}`)}>
                            <CreditCard size={16} /> Record Payment
                        </Button>
                    )}
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Order' : 'Create Order'}</h1>

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
                        <Field label="Order Date">
                            <input type="date" className="input-field" value={formData.orderDate}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} />
                        </Field>
                        <Field label="Expected Delivery">
                            <input type="date" className="input-field" value={formData.deliveryDate}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })} />
                        </Field>
                        <Field label="Order Status">
                            <select className="input-field" value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="READY_TO_SHIP">Ready To Ship</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </Field>
                        <Field label="Payment Status">
                            <select className="input-field" value={formData.paymentStatus}
                                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}>
                                <option value="UNPAID">Unpaid</option>
                                <option value="PARTIAL">Partial</option>
                                <option value="PAID">Paid</option>
                            </select>
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="section-heading" style={{ margin: 0 }}>Order Items</h2>
                            <div className="search-control" style={{ maxWidth: 200, position: 'relative' }}>
                                <Search size={14} className="text-muted" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                                <input type="text" placeholder="Filter products..." className="input-field" style={{ paddingLeft: 28, minHeight: 34, fontSize: 13 }}
                                    value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <Button variant="ghost" onClick={addItem}><Plus size={16} /> Add Product Item</Button>
                    </div>
                    <div className="table-scroll">
                        <table className="data-table line-items" style={{ minWidth: 700 }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 260 }}>Product SKU / Name</th>
                                    <th className="numeric" style={{ width: 100 }}>Qty</th>
                                    <th className="numeric" style={{ width: 120 }}>Selling Price</th>
                                    <th className="numeric" style={{ width: 100 }}>Discount %</th>
                                    <th className="numeric" style={{ width: 120 }}>Total</th>
                                    <th className="numeric" style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.length === 0 ? (
                                    <tr><td colSpan="6" className="state-panel">No items added yet.</td></tr>
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
                                                        <span>BAR: {selectedProd.barcode}</span>
                                                        <span>HSN: {selectedProd.hsnCode}</span>
                                                        <span>GST: {selectedProd.gstRate}%</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="1" className="input-field" style={{ width: 80, textAlign: 'center', padding: '6px 8px', minHeight: 36 }}
                                                    value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 0)} />
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="0" step="0.01" className="input-field" style={{ width: 100, textAlign: 'right', padding: '6px 8px', minHeight: 36 }}
                                                    value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="0" max="100" step="0.01" className="input-field" style={{ width: 80, textAlign: 'center', padding: '6px 8px', minHeight: 36 }}
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
                            <Field label="Shipping Address"><textarea className="input-field" rows="3" value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} /></Field>
                            <Field label="Notes"><textarea className="input-field" rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></Field>
                            <Field label="Bill Pad Image">
                                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                                    {uploadingFile ? 'Uploading...' : 'Upload Image'}
                                    <input type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} disabled={uploadingFile} />
                                </label>
                                {formData.billPadImageUrl && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <img src={fileUploadService.getFileUrl(formData.billPadImageUrl, 'billpads')} alt="Bill pad" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                                        <a href={fileUploadService.getFileUrl(formData.billPadImageUrl, 'billpads')} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--primary)' }}>View</a>
                                    </div>
                                )}
                            </Field>
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
                                <span className="text-secondary font-semibold">Shipping</span>
                                <input type="number" className="input-field" style={{ width: 100, textAlign: 'right', padding: '4px 8px', minHeight: 32 }}
                                    value={formData.shippingCharge} onChange={(e) => setFormData({ ...formData, shippingCharge: parseFloat(e.target.value) || 0 })} />
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
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>
                                {loading ? 'Saving...' : (isEditMode ? 'Update Order' : 'Create Order')}
                            </Button>
                        </div>
                    </PageSection>
                </div>
            </form>
        </div>
    );
};

export default OrderFormPage;