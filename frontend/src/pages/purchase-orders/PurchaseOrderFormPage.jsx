import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Truck, Download, Search } from 'lucide-react';
import purchaseOrderService from '../../services/purchaseOrderService';
import distributorService from '../../services/distributorService';
import { productService } from '../../services/productService';
import fileUploadService from '../../services/fileUploadService';
import { useFilePreview } from '../../hooks/useFilePreview';
import toast from 'react-hot-toast';
import { calculateDocumentTotals } from '../../utils/documentTotals';

const PurchaseOrderFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [distributors, setDistributors] = useState([]);
    const [products, setProducts] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        distributorId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        status: 'DRAFT',
        taxPercentage: 18,
        notes: '',
        invoicePdfPath: '',
        items: []
    });

    const [localAttachment, setLocalAttachment] = useState(null);
    const attachment = useFilePreview(formData.invoicePdfPath, 'invoices', localAttachment);
    const totals = calculateDocumentTotals(formData);

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchOrder();
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
            } catch {
                toast.error('Product search failed. Please try again.');
            }
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
        } catch (error) {
            console.error('Failed to load distributors or products', error);
            toast.error('Failed to load distributors or products');
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await purchaseOrderService.getPurchaseOrderById(id);
            setFormData(res);
        } catch (error) {
            toast.error('Failed to load purchase order');
            navigate('/purchase-orders');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!productSearchQuery.trim()) return products;
        const query = productSearchQuery.toLowerCase();
        return products.filter(p =>
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.sku && p.sku.toLowerCase().includes(query)) ||
            (p.barcode && p.barcode.toLowerCase().includes(query)) ||
            (p.hsnCode && p.hsnCode.toLowerCase().includes(query))
        );
    }, [products, productSearchQuery]);

    const addItem = (selectedProduct = null) => {
        let newItem = {
            productId: '',
            productName: '',
            productSku: '',
            barcode: '',
            hsnCode: '',
            gstRate: 0,
            quantity: 1,
            receivedQuantity: 0,
            unitCost: 0,
            lineTotal: 0,
            notes: ''
        };

        if (selectedProduct) {
            const defaultCost = (selectedProduct.purchasePrice !== null && selectedProduct.purchasePrice !== undefined)
                ? Number(selectedProduct.purchasePrice)
                : Number(selectedProduct.sellingPrice || 0);

            newItem = {
                ...newItem,
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                productSku: selectedProduct.sku,
                barcode: selectedProduct.barcode || '',
                hsnCode: selectedProduct.hsnCode || '',
                gstRate: selectedProduct.gstRate || 0,
                unitCost: defaultCost,
                lineTotal: defaultCost * 1
            };
        }

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };

        if (field === 'productId') {
            const product = products.find(p => p.id === parseInt(value, 10));
            if (product) {
                item.productName = product.name;
                item.productSku = product.sku;
                item.barcode = product.barcode || '';
                item.hsnCode = product.hsnCode || '';
                item.gstRate = product.gstRate || 0;
                const defaultCost = (product.purchasePrice !== null && product.purchasePrice !== undefined)
                    ? Number(product.purchasePrice)
                    : Number(product.sellingPrice || 0);
                item.unitCost = defaultCost;
            }
        }

        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unitCost) || 0;
        item.lineTotal = cost * qty;

        newItems[index] = item;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        if (isEditMode) {
            try {
                await purchaseOrderService.updateStatus(id, newStatus);
                toast.success('Status updated successfully');
                fetchOrder();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to update status');
            }
        } else {
            setFormData(prev => ({ ...prev, status: newStatus }));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed for invoices.');
            return;
        }

        try {
            setUploadingFile(true);
            const response = await fileUploadService.uploadFile(file, 'invoices');
            setLocalAttachment(file);
            setFormData(prev => ({ ...prev, invoicePdfPath: response.fileName }));
            toast.success('Invoice uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload invoice');
        } finally {
            setUploadingFile(false);
            e.target.value = null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.distributorId) {
            toast.error('Please select a distributor');
            return;
        }
        if (formData.items.length === 0) {
            toast.error('Please add at least one product item');
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
            if (Number(item.unitCost) < 0) {
                toast.error('Unit cost cannot be negative');
                return;
            }
        }

        try {
            setLoading(true);
            const dataToSave = {
                ...formData,
                ...totals,
                distributorId: Number(formData.distributorId),
                items: formData.items.map(item => ({
                    ...item,
                    productId: Number(item.productId),
                    quantity: Number(item.quantity),
                    receivedQuantity: Number(item.receivedQuantity) || 0,
                    unitCost: Number(item.unitCost),
                    lineTotal: Number(item.unitCost) * Number(item.quantity)
                }))
            };

            if (isEditMode) {
                await purchaseOrderService.updatePurchaseOrder(id, dataToSave);
                toast.success('Purchase Order updated successfully');
            } else {
                await purchaseOrderService.createPurchaseOrder(dataToSave);
                toast.success('Purchase Order created successfully');
            }
            navigate('/purchase-orders');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save purchase order');
        } finally {
            setLoading(false);
        }
    };

    const isReceived = formData.status === 'RECEIVED';

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/purchase-orders')}
                    className="flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" /> Back to List
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <h2 className="text-xl font-bold flex items-center text-gray-900">
                            <Truck size={24} className="mr-2 text-blue-600" />
                            {isEditMode ? `Edit Purchase Order ${formData.poNumber || ''}` : 'New Purchase Order'}
                        </h2>

                        {isEditMode && (
                            <div className="flex items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                <label className="text-sm font-semibold text-gray-700 mr-3">Status:</label>
                                <select
                                    className="p-1 px-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                    value={formData.status}
                                    onChange={handleStatusChange}
                                    disabled={isReceived}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="ORDERED">Ordered</option>
                                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                                    <option value="RECEIVED">Received (Direct Stock Entry)</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Distributor *</label>
                            <select
                                required
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={formData.distributorId}
                                onChange={(e) => setFormData(prev => ({ ...prev, distributorId: e.target.value }))}
                            >
                                <option value="">Select Distributor</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Order Date</label>
                            <input
                                type="date"
                                required
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={formData.orderDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Expected Delivery</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={formData.expectedDeliveryDate || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                            />
                        </div>

                        {!isEditMode && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Initial Status</label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="ORDERED">Ordered</option>
                                    <option value="RECEIVED">Received (Direct Stock Entry)</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Invoice (PDF)</label>
                            <div className="flex items-center space-x-2">
                                <label className={`flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="text-sm text-gray-600 mr-2 flex items-center">
                                        <Download size={16} className="mr-1" />
                                        {uploadingFile ? 'Uploading...' : 'Choose File'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                    />
                                </label>
                            {formData.invoicePdfPath && !attachment.url && (
                                <p role="status" className="text-sm text-slate-500">{attachment.error || 'Loading attachment...'}</p>
                            )}
                                {attachment.url && (
                                    <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded border border-blue-200"
                                        title="View Invoice"
                                    >
                                        <Download size={20} />
                                    </a>
                                )}
                            </div>
                            {formData.invoicePdfPath && <p className="text-xs text-green-600 truncate">File attached: {formData.invoicePdfPath.split('/').pop()}</p>}
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-700">Order Items</h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter products..."
                                    className="pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none w-44"
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => addItem()}
                            disabled={isReceived}
                            className={`text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium ${isReceived ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Plus size={16} className="mr-1" /> Add Product
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 min-w-[240px]">Product / SKU</th>
                                    <th className="px-3 py-3 w-28">Barcode / HSN</th>
                                    <th className="px-3 py-3 w-24">Order Qty</th>
                                    <th className="px-3 py-3 w-24">Received Qty</th>
                                    <th className="px-3 py-3 w-32">Unit Cost (₹)</th>
                                    <th className="px-4 py-3 w-32">Line Total</th>
                                    <th className="px-3 py-3 w-16 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {formData.items.map((item, index) => {
                                    const selectedProd = products.find(p => p.id === parseInt(item.productId, 10));
                                    const hasPurchasePrice = selectedProd && selectedProd.purchasePrice !== null && selectedProd.purchasePrice !== undefined;

                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <select
                                                    required
                                                    disabled={isReceived}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                    value={item.productId}
                                                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                                >
                                                    <option value="">Select Product...</option>
                                                    {filteredProducts.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.sku}) {p.purchasePrice ? `[₹${p.purchasePrice}]` : `[₹${p.sellingPrice || 0}]`}
                                                        </option>
                                                    ))}
                                                </select>
                                                {selectedProd && (
                                                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                                                        <span>Stock: {selectedProd.stockQuantity ?? 0}</span>
                                                        {hasPurchasePrice ? (
                                                            <span className="text-teal-700 font-medium bg-teal-50 px-1.5 py-0.5 rounded">
                                                                Catalogue Purchase Price: ₹{selectedProd.purchasePrice}
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                Fallback Selling Price: ₹{selectedProd.sellingPrice || 0}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-600">
                                                <div>{item.barcode || selectedProd?.barcode || '—'}</div>
                                                <div className="text-[11px] text-gray-400">HSN: {item.hsnCode || selectedProd?.hsnCode || '—'}</div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    disabled={isReceived}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 0)}
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    disabled={isReceived}
                                                    className={`w-full p-2 text-sm border rounded outline-none ${Number(item.receivedQuantity) < Number(item.quantity) ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50'}`}
                                                    value={item.receivedQuantity}
                                                    onChange={(e) => handleItemChange(index, 'receivedQuantity', parseInt(e.target.value, 10) || 0)}
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    disabled={isReceived}
                                                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none"
                                                    value={item.unitCost}
                                                    onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-800">
                                                ₹{(Number(item.lineTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    type="button"
                                                    disabled={isReceived}
                                                    onClick={() => removeItem(index)}
                                                    className={`text-red-400 hover:text-red-600 transition-colors ${isReceived ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    title="Remove"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {formData.items.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500 text-sm">
                                            No items added yet. Click "Add Product" to begin adding products to this purchase order.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                Notes / Terms
                            </label>
                            <textarea
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg h-32 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                placeholder="Enter any notes or terms for this purchase order..."
                                value={formData.notes || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 p-6 space-y-5 h-fit">
                        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-3">Order Summary</h3>

                        <div className="flex justify-between text-gray-600 font-medium">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center text-sm font-medium text-gray-700">
                                Tax (GST %)
                                <input
                                    type="number"
                                    className="w-16 p-1 border border-gray-300 rounded ml-3 text-center focus:ring-1 outline-none"
                                    value={formData.taxPercentage}
                                    onChange={(e) => setFormData(prev => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <span className="font-medium text-gray-700">₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {isEditMode && (
                            <div className="flex justify-between items-center text-sm text-gray-600 px-1 pt-2 border-t border-gray-200">
                                <span>Amount Paid</span>
                                <span className="text-green-600 font-medium">- ₹{(Number(formData.paidAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-800">Total</span>
                            <span className="text-2xl font-bold text-blue-600">₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {isEditMode && Number(formData.balanceAmount) > 0 && (
                            <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                                <span className="font-semibold text-red-700">Outstanding Balance</span>
                                <span className="font-bold text-red-700">₹{Number(formData.balanceAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || isReceived}
                            className={`w-full mt-6 ${loading || isReceived ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'} text-white font-bold py-3.5 rounded-lg flex justify-center items-center transition-all active:scale-[0.98]`}
                        >
                            <Save size={20} className="mr-2" />
                            {loading ? 'Saving...' : (isEditMode ? 'Update Purchase Order' : 'Save Purchase Order')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PurchaseOrderFormPage;
