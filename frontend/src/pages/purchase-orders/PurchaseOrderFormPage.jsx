import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Truck, CreditCard, Download } from 'lucide-react';
import purchaseOrderService from '../../services/purchaseOrderService';
import distributorService from '../../services/distributorService';
import { productService } from '../../services/productService';
import fileUploadService from '../../services/fileUploadService';
import toast from 'react-hot-toast';

const PurchaseOrderFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [distributors, setDistributors] = useState([]);
    const [products, setProducts] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);

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

    const [totals, setTotals] = useState({
        subtotal: 0,
        taxAmount: 0,
        total: 0
    });

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchOrder();
    }, [id]);

    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.taxPercentage]);

    const fetchInitialData = async () => {
        try {
            const [distRes, prodRes] = await Promise.all([
                distributorService.getAllActiveDistributors(),
                productService.getAll({ size: 500 }) // Adjust size as needed
            ]);
            setDistributors(distRes);
            setProducts(prodRes.data.content);
        } catch (error) {
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

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
        const taxAmount = (subtotal * formData.taxPercentage) / 100;
        const total = subtotal + taxAmount;
        setTotals({ subtotal, taxAmount, total });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: '', quantity: 1, receivedQuantity: 0, unitCost: 0, lineTotal: 0, notes: '' }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };

        // Auto-fill price or line total on change
        if (field === 'productId') {
            const product = products.find(p => p.id === parseInt(value));
            if (product) {
                item.productName = product.name;
                item.productSku = product.sku;
                // Pre-fill unit cost with the existing purchase price or selling price
                item.unitCost = product.sellingPrice * 0.7; // Temporary placeholder logic until purchasePrice is added
            }
        }

        item.lineTotal = item.unitCost * item.quantity;

        // Auto-update received qty if just ordering
        if (field === 'quantity' && formData.status !== 'RECEIVED') {
            // item.receivedQuantity = value; // Optional: auto match received with order qty
        }

        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        if (isEditMode) {
            try {
                // If it's an existing order, update status via the specialized endpoint to trigger stock updates
                await purchaseOrderService.updateStatus(id, newStatus);
                toast.success('Status updated successfully');
                fetchOrder(); // Reload the order
            } catch (error) {
                toast.error('Failed to update status');
            }
        } else {
            setFormData({ ...formData, status: newStatus });
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Optional: PDF Validation
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed for invoices.');
            return;
        }

        try {
            setUploadingFile(true);
            const response = await fileUploadService.uploadFile(file, 'invoices');
            setFormData({ ...formData, invoicePdfPath: response.fileName });
            toast.success('Invoice uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload invoice');
        } finally {
            setUploadingFile(false);
            // Reset the input value so the same file could be uploaded again if needed
            e.target.value = null;
        }
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
                await purchaseOrderService.updatePurchaseOrder(id, dataToSave);
                toast.success('Purchase Order updated');
            } else {
                await purchaseOrderService.createPurchaseOrder(dataToSave);
                toast.success('Purchase Order created');
            }
            navigate('/purchase-orders');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/purchase-orders')} className="flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to List
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center text-gray-900">
                            <Truck size={24} className="mr-2 text-blue-600" />
                            {isEditMode ? `Edit Purchase Order ${formData.poNumber}` : 'New Purchase Order'}
                        </h2>

                        {isEditMode && (
                            <div className="flex items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                <label className="text-sm font-semibold text-gray-700 mr-3">Status:</label>
                                <select
                                    className="p-1 px-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                    value={formData.status}
                                    onChange={handleStatusChange}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="ORDERED">Ordered</option>
                                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                                    <option value="RECEIVED">Received</option>
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
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.distributorId}
                                onChange={(e) => setFormData({ ...formData, distributorId: e.target.value })}
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
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.orderDate}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Expected Delivery</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.expectedDeliveryDate || ''}
                                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                            />
                        </div>

                        {!isEditMode && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Initial Status</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                                {formData.invoicePdfPath && (
                                    <a
                                        href={fileUploadService.getFileUrl(formData.invoicePdfPath, 'invoices')}
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
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Order Items</h3>
                        <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium">
                            <Plus size={16} className="mr-1" /> Add Product
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 min-w-[200px]">Product / SKU</th>
                                    <th className="px-4 py-3 w-28">Order Qty</th>
                                    <th className="px-4 py-3 w-28">Received Qty</th>
                                    <th className="px-4 py-3 w-32">Unit Cost (₹)</th>
                                    <th className="px-4 py-3 w-32">Line Total</th>
                                    <th className="px-4 py-3 w-16 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {formData.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <select
                                                required
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            >
                                                <option value="">Select Product...</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="1"
                                                className="w-full p-2 text-sm border border-gray-300 rounded outline-none"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="0"
                                                className={`w-full p-2 text-sm border rounded outline-none ${item.receivedQuantity < item.quantity ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50'}`}
                                                value={item.receivedQuantity}
                                                onChange={(e) => handleItemChange(index, 'receivedQuantity', parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="0" step="0.01"
                                                className="w-full p-2 text-sm border border-gray-300 rounded outline-none"
                                                value={item.unitCost}
                                                onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">
                                            ₹{(item.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {formData.items.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                                            No items added yet. Click "Add Product" to begin.
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
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <span className="font-medium text-gray-700">₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {isEditMode && (
                            <div className="flex justify-between items-center text-sm text-gray-600 px-1 pt-2 border-t border-gray-200">
                                <span>Amount Paid</span>
                                <span className="text-green-600 font-medium">- ₹{(formData.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-800">Total Valid</span>
                            <span className="text-2xl font-bold text-blue-600">₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {isEditMode && formData.balanceAmount > 0 && (
                            <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                                <span className="font-semibold text-red-700">Outstanding Balance</span>
                                <span className="font-bold text-red-700">₹{formData.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full mt-6 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'} text-white font-bold py-3.5 rounded-lg flex justify-center items-center transition-all active:scale-[0.98]`}
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
