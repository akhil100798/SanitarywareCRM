import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import purchaseOrderService from '../../services/purchaseOrderService';
import distributorService from '../../services/distributorService';
import { productService } from '../../services/productService';
import fileUploadService from '../../services/fileUploadService';
import { useFilePreview } from '../../hooks/useFilePreview';
import toast from 'react-hot-toast';
import { calculateDocumentTotals } from '../../utils/documentTotals';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { PageSection } from '../../components/ui/Page';

const PurchaseOrderFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [distributors, setDistributors] = useState([]);
    const [products, setProducts] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        distributorId: '', orderDate: new Date().toISOString().split('T')[0], expectedDeliveryDate: '',
        status: 'DRAFT', taxPercentage: 18, notes: '', invoicePdfPath: '', items: []
    });
    const [localAttachment, setLocalAttachment] = useState(null);
    const attachment = useFilePreview(formData.invoicePdfPath, 'invoices', localAttachment);
    const totals = calculateDocumentTotals(formData);

    useEffect(() => { fetchInitialData(); if (isEditMode) fetchOrder(); }, [id]);

    useEffect(() => {
        if (!productSearchQuery.trim()) return;
        const timer = setTimeout(async () => {
            try {
                const res = await productService.getAll({ query: productSearchQuery.trim(), isActive: true, size: 50 });
                const newProds = res.data?.content || res.data || [];
                setProducts(prev => { const map = new Map(); prev.forEach(p => map.set(p.id, p)); newProds.forEach(p => map.set(p.id, p)); return Array.from(map.values()); });
            } catch { toast.error('Product search failed'); }
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearchQuery]);

    const fetchInitialData = async () => {
        try {
            const [distRes, prodRes] = await Promise.all([
                distributorService.getAllDistributors(0, 50).catch(() => distributorService.getAllActiveDistributors()),
                productService.getAll({ isActive: true, size: 50 })
            ]);
            const distList = distRes?.content || distRes?.data?.content || distRes || [];
            setDistributors(Array.isArray(distList) ? distList : []);
            setProducts(prodRes.data?.content || prodRes.data || []);
        } catch { toast.error('Failed to load data'); }
    };

    const fetchOrder = async () => {
        try { setLoading(true); const res = await purchaseOrderService.getPurchaseOrderById(id); setFormData(res); }
        catch (error) { toast.error('Failed to load PO'); navigate('/purchase-orders'); }
        finally { setLoading(false); }
    };

    const filteredProducts = products.filter(p => {
        if (!productSearchQuery.trim()) return true;
        const q = productSearchQuery.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.hsnCode?.toLowerCase().includes(q);
    });

    const addItem = (selectedProduct = null) => {
        let newItem = { productId: '', productName: '', productSku: '', barcode: '', hsnCode: '', gstRate: 0, quantity: 1, receivedQuantity: 0, unitCost: 0, lineTotal: 0, notes: '' };
        if (selectedProduct) {
            const defaultCost = (selectedProduct.purchasePrice != null) ? Number(selectedProduct.purchasePrice) : Number(selectedProduct.sellingPrice || 0);
            newItem = { ...newItem, productId: selectedProduct.id, productName: selectedProduct.name, productSku: selectedProduct.sku, barcode: selectedProduct.barcode || '', hsnCode: selectedProduct.hsnCode || '', gstRate: selectedProduct.gstRate || 0, unitCost: defaultCost, lineTotal: defaultCost * 1 };
        }
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const removeItem = (index) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };
        if (field === 'productId') {
            const product = products.find(p => p.id === parseInt(value, 10));
            if (product) {
                item.productName = product.name; item.productSku = product.sku; item.barcode = product.barcode || '';
                item.hsnCode = product.hsnCode || ''; item.gstRate = product.gstRate || 0;
                item.unitCost = (product.purchasePrice != null) ? Number(product.purchasePrice) : Number(product.sellingPrice || 0);
            }
        }
        item.lineTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        newItems[index] = item;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        if (isEditMode) {
            try { await purchaseOrderService.updateStatus(id, newStatus); toast.success('Status updated'); fetchOrder(); }
            catch (error) { toast.error('Failed to update status'); }
        } else { setFormData(prev => ({ ...prev, status: newStatus })); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { toast.error('Only PDF files allowed'); return; }
        try {
            setUploadingFile(true);
            const response = await fileUploadService.uploadFile(file, 'invoices');
            setLocalAttachment(file);
            setFormData(prev => ({ ...prev, invoicePdfPath: response.fileName }));
            toast.success('Invoice uploaded');
        } catch (error) { toast.error('Upload failed'); }
        finally { setUploadingFile(false); e.target.value = null; }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.distributorId) { toast.error('Select a distributor'); return; }
        if (formData.items.length === 0) { toast.error('Add at least one item'); return; }
        for (const item of formData.items) {
            if (!item.productId) { toast.error('All items need a product'); return; }
            if (Number(item.quantity) <= 0) { toast.error('Quantity must be > 0'); return; }
            if (Number(item.unitCost) < 0) { toast.error('Unit cost cannot be negative'); return; }
        }
        try {
            setSaving(true);
            const dataToSave = {
                ...formData, ...totals, distributorId: Number(formData.distributorId),
                items: formData.items.map(item => ({ ...item, productId: Number(item.productId), quantity: Number(item.quantity), receivedQuantity: Number(item.receivedQuantity) || 0, unitCost: Number(item.unitCost), lineTotal: Number(item.unitCost) * Number(item.quantity) }))
            };
            if (isEditMode) { await purchaseOrderService.updatePurchaseOrder(id, dataToSave); toast.success('PO updated'); }
            else { await purchaseOrderService.createPurchaseOrder(dataToSave); toast.success('PO created'); }
            navigate('/purchase-orders');
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to save PO'); }
        finally { setSaving(false); }
    };

    const isReceived = formData.status === 'RECEIVED';

    if (loading && isEditMode) return <div className="flex justify-center items-center h-96"><p className="text-slate-500 font-semibold">Loading PO...</p></div>;

    return (
        <div className="max-w-6xl mx-auto">
            <button onClick={() => navigate('/purchase-orders')} className="btn-ghost mb-6"><ArrowLeft size={16} /> Back to List</button>
            <h1 className="text-2xl font-bold mb-6">{isEditMode ? `Edit PO ${formData.poNumber || ''}` : 'New Purchase Order'}</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <PageSection>
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-5">
                        {isEditMode && (
                            <div className="flex items-center gap-3">
                                <label className="field-label">Status:</label>
                                <select className="input-field" style={{ width: 'auto' }} value={formData.status} onChange={handleStatusChange} disabled={isReceived}>
                                    <option value="DRAFT">Draft</option>
                                    <option value="ORDERED">Ordered</option>
                                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                                    <option value="RECEIVED">Received</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Distributor" required>
                            <select required className="input-field" value={formData.distributorId}
                                onChange={(e) => setFormData(prev => ({ ...prev, distributorId: e.target.value }))}>
                                <option value="">Select Distributor</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Order Date">
                            <input type="date" required className="input-field" value={formData.orderDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))} />
                        </Field>
                        <Field label="Expected Delivery">
                            <input type="date" className="input-field" value={formData.expectedDeliveryDate || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))} />
                        </Field>
                        {!isEditMode && (
                            <Field label="Initial Status">
                                <select className="input-field" value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}>
                                    <option value="DRAFT">Draft</option>
                                    <option value="ORDERED">Ordered</option>
                                    <option value="RECEIVED">Received</option>
                                </select>
                            </Field>
                        )}
                        <Field label="Invoice (PDF)">
                            <div className="flex items-center gap-2">
                                <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex' }}>
                                    {uploadingFile ? 'Uploading...' : 'Choose File'}
                                    <input type="file" accept="application/pdf" className="sr-only" onChange={handleFileUpload} disabled={uploadingFile} />
                                </label>
                                {formData.invoicePdfPath && !attachment.url && <span className="text-sm text-slate-500">{attachment.error || 'Loading...'}</span>}
                                {attachment.url && <a href={attachment.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }} className="text-sm">View</a>}
                            </div>
                            {formData.invoicePdfPath && <p className="record-meta">{formData.invoicePdfPath.split('/').pop()}</p>}
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="section-heading" style={{ margin: 0 }}>Order Items</h2>
                            <div className="search-control" style={{ maxWidth: 200, position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: 'var(--text-muted)' }} />
                                <input type="text" placeholder="Filter products..." className="input-field" style={{ paddingLeft: 28, minHeight: 34, fontSize: 13 }}
                                    value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} disabled={isReceived} />
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => addItem()} disabled={isReceived}><Plus size={16} /> Add Product</Button>
                    </div>
                    <div className="table-scroll">
                        <table className="data-table line-items" style={{ minWidth: 700 }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: 240 }}>Product / SKU</th>
                                    <th style={{ width: 150 }}>Barcode / HSN</th>
                                    <th className="numeric" style={{ width: 80 }}>Qty</th>
                                    <th className="numeric" style={{ width: 90 }}>Received</th>
                                    <th className="numeric" style={{ width: 110 }}>Unit Cost</th>
                                    <th className="numeric" style={{ width: 110 }}>Total</th>
                                    <th className="numeric" style={{ width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.length === 0 ? (
                                    <tr><td colSpan="7" className="state-panel">No items added yet.</td></tr>
                                ) : formData.items.map((item, index) => {
                                    const selectedProd = products.find(p => p.id === parseInt(item.productId, 10));
                                    return (
                                        <tr key={index}>
                                            <td>
                                                <select required disabled={isReceived} className="input-field" style={{ minHeight: 36, fontSize: 13 }}
                                                    value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)}>
                                                    <option value="">Select Product...</option>
                                                    {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) {p.purchasePrice != null ? `[₹${p.purchasePrice}]` : `[₹${p.sellingPrice || 0}]`}</option>)}
                                                </select>
                                                {selectedProd && (
                                                    <div className="record-meta flex flex-wrap gap-2 mt-1">
                                                        <span>Stock: {selectedProd.stockQuantity ?? 0}</span>
                                                        {selectedProd.purchasePrice != null
                                                            ? <span>Purchase: ₹{selectedProd.purchasePrice}</span>
                                                            : <span>Fallback: ₹{selectedProd.sellingPrice || 0}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                <div>{item.barcode || selectedProd?.barcode || '—'}</div>
                                                <div className="record-meta">HSN: {item.hsnCode || selectedProd?.hsnCode || '—'}</div>
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="1" disabled={isReceived} className="input-field" style={{ width: 70, textAlign: 'center', padding: '6px', minHeight: 36 }}
                                                    value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 0)} />
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="0" disabled={isReceived} className="input-field"
                                                    style={{ width: 70, textAlign: 'center', padding: '6px', minHeight: 36, borderColor: Number(item.receivedQuantity) < Number(item.quantity) ? 'var(--warning)' : 'var(--success)' }}
                                                    value={item.receivedQuantity} onChange={(e) => handleItemChange(index, 'receivedQuantity', parseInt(e.target.value, 10) || 0)} />
                                            </td>
                                            <td className="numeric">
                                                <input type="number" min="0" step="0.01" disabled={isReceived} className="input-field" style={{ width: 90, textAlign: 'right', padding: '6px', minHeight: 36 }}
                                                    value={item.unitCost} onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)} />
                                            </td>
                                            <td className="numeric font-semibold">₹{(Number(item.lineTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="numeric">
                                                <button type="button" disabled={isReceived} onClick={() => removeItem(index)} className="btn-ghost" style={{ minHeight: 32, width: 32, padding: 0, opacity: isReceived ? 0.5 : 1 }}><Trash2 size={14} /></button>
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
                        <Field label="Notes"><textarea className="input-field" rows="5" value={formData.notes || ''} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}></textarea></Field>
                    </PageSection>

                    <PageSection>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-secondary font-semibold">Subtotal</span><span className="font-semibold">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2"><span className="text-secondary font-semibold">Tax (%)</span>
                                    <input type="number" className="input-field" style={{ width: 60, padding: '4px 8px', minHeight: 32 }}
                                        value={formData.taxPercentage} onChange={(e) => setFormData(prev => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <span className="font-semibold">₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {isEditMode && Number(formData.paidAmount) > 0 && (
                                <div className="flex justify-between text-sm"><span className="text-secondary">Paid</span><span className="text-success font-medium">- ₹{Number(formData.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            )}
                            <div className="financial-summary pt-3 flex justify-between items-center">
                                <span className="text-base font-bold">Total</span>
                                <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {isEditMode && Number(formData.balanceAmount) > 0 && (
                                <div className="flex justify-between text-sm font-semibold" style={{ color: 'var(--danger)', background: 'var(--danger-soft)', padding: '8px 12px', borderRadius: 6 }}>
                                    <span>Outstanding Balance</span>
                                    <span>₹{Number(formData.balanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <Button type="submit" loading={saving} disabled={isReceived} style={{ width: '100%' }}>
                                {saving ? 'Saving...' : (isEditMode ? 'Update PO' : 'Create PO')}
                            </Button>
                        </div>
                    </PageSection>
                </div>
            </form>
        </div>
    );
};

export default PurchaseOrderFormPage;