import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Truck, CreditCard } from 'lucide-react';
import orderService from '../../services/orderService';
import quotationService from '../../services/quotationService';
import customerService from '../../services/customerService';
import { productService } from '../../services/productService';
import fileUploadService from '../../services/fileUploadService';
import toast from 'react-hot-toast';

const OrderFormPage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const quotationId = searchParams.get('fromQuotation');
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
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

    const [totals, setTotals] = useState({
        subtotal: 0,
        taxAmount: 0,
        total: 0
    });

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchOrder();
        else if (quotationId) fetchFromQuotation();
    }, [id, quotationId]);

    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.taxPercentage, formData.discount, formData.shippingCharge]);

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

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await orderService.getById(id);
            setFormData(res.data);
        } catch (error) {
            toast.error('Failed to load order');
            navigate('/orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchFromQuotation = async () => {
        try {
            setLoading(true);
            const res = await quotationService.getById(quotationId);
            const qData = res.data;
            setFormData({
                ...formData,
                customerId: qData.customerId,
                taxPercentage: qData.taxPercentage,
                discount: qData.discount,
                notes: 'Created from Quotation: ' + qData.quotationNumber,
                items: qData.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercentage: item.discountPercentage,
                    lineTotal: item.lineTotal,
                    productName: item.productName,
                    productSku: item.productSku
                }))
            });
            toast.success('Loaded data from quotation');
        } catch (error) {
            toast.error('Failed to load quotation data');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
        const taxAmount = (subtotal * formData.taxPercentage) / 100;
        const total = subtotal + taxAmount + (parseFloat(formData.shippingCharge) || 0) - formData.discount;
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
                item.mrp = product.mrp;
            }
        }

        if (field === 'unitPrice' || field === 'productId') {
            const mrp = item.mrp || 0;
            const currentPrice = field === 'unitPrice' ? parseFloat(value) || 0 : item.unitPrice;

            if (mrp > 0 && currentPrice <= mrp) {
                item.discountPercentage = parseFloat(((mrp - currentPrice) * 100 / mrp).toFixed(2));
            } else {
                item.discountPercentage = 0;
            }
        }

        if (field === 'discountPercentage') {
            const mrp = item.mrp || 0;
            const disc = parseFloat(value) || 0;
            if (mrp > 0) {
                item.unitPrice = parseFloat((mrp - (mrp * disc / 100)).toFixed(2));
            }
        }

        item.lineTotal = (item.unitPrice || 0) * (item.quantity || 0);
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are allowed for bill pads.');
            return;
        }

        try {
            setUploadingFile(true);
            const response = await fileUploadService.uploadFile(file, 'billpads');
            setFormData({ ...formData, billPadImageUrl: response.fileName });
            toast.success('Bill Pad uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setUploadingFile(false);
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
                await orderService.update(id, dataToSave);
                toast.success('Order updated');
            } else {
                await orderService.create(dataToSave);
                toast.success('Order created');
            }
            navigate('/orders');
        } catch (error) {
            toast.error('Failed to save order');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold text-sm">Assembling customer order parameters...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/orders')}
                    className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
                >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Orders
                </button>
                <div className="flex space-x-2">
                    {isEditMode && formData.paymentStatus !== 'PAID' && (
                        <button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center shadow-md active:scale-95 duration-150"
                            onClick={() => navigate(`/payments/new?orderId=${id}`)}
                        >
                            <CreditCard size={16} className="mr-2" />
                            Record Payment
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
                {/* Meta Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-5 flex items-center">
                        <ShoppingCart size={22} className="mr-2 text-teal" />
                        {isEditMode ? 'Edit Customer Order' : 'New Customer Order'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-500">Customer *</label>
                            <select
                                required
                                className="input-field text-sm font-medium"
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Order Date</label>
                            <input
                                type="date"
                                className="input-field text-sm"
                                value={formData.orderDate}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Expected Delivery</label>
                            <input
                                type="date"
                                className="input-field text-sm"
                                value={formData.deliveryDate || ''}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Order Status</label>
                            <select
                                className="input-field text-sm font-medium animate-fade-in"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex items-center">
                                <CreditCard size={14} className="mr-1" /> Payment Status
                            </label>
                            <select
                                className="input-field text-sm font-medium"
                                value={formData.paymentStatus}
                                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                            >
                                <option value="UNPAID">Unpaid</option>
                                <option value="PARTIAL">Partially Paid</option>
                                <option value="PAID">Fully Paid</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items Container */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-700">Order Items</h3>
                        <button
                            type="button"
                            onClick={addItem}
                            className="text-teal hover:text-teal-800 flex items-center text-xs font-bold transition-colors"
                        >
                            <Plus size={16} className="mr-1" /> Add Product Item
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3 min-w-[280px]">Product SKU / Name</th>
                                    <th className="px-4 py-3 w-28">Quantity</th>
                                    <th className="px-4 py-3 w-36">Selling Price</th>
                                    <th className="px-4 py-3 w-28">Calculated Disc %</th>
                                    <th className="px-4 py-3 w-36">Line Total</th>
                                    <th className="px-4 py-3 w-16 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {formData.items.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
                                            No products added yet. Click 'Add Product Item' above.
                                        </td>
                                    </tr>
                                ) : (
                                    formData.items.map((item, index) => (
                                        <tr key={index} className="text-sm hover:bg-slate-50/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <select
                                                    required
                                                    className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-white font-medium text-slate-700"
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
                                                    className="w-full p-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex bg-slate-50 border border-slate-200 rounded-xl items-center px-2">
                                                    <span className="text-slate-400 text-xs font-semibold">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-full py-2 bg-transparent outline-none pl-1 text-sm text-slate-800 font-bold"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                {item.mrp > 0 && (
                                                    <div className="text-[10px] text-slate-400 font-medium mt-1 pl-1">MRP: ₹{item.mrp.toLocaleString()}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex bg-slate-100 border border-slate-200 rounded-xl items-center px-2">
                                                    <input
                                                        type="number"
                                                        className="w-full py-2 bg-transparent text-slate-500 outline-none text-center text-xs font-semibold"
                                                        value={item.discountPercentage}
                                                        readOnly
                                                        disabled
                                                        title="Auto-calculated from MRP"
                                                    />
                                                    <span className="text-slate-400 text-xs font-semibold">%</span>
                                                </div>
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Shipping and Totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 flex items-center">
                                <Truck size={14} className="mr-1" /> Shipping Address
                            </label>
                            <textarea
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal h-24 text-sm resize-none"
                                placeholder="Enter full delivery dispatch details..."
                                value={formData.shippingAddress}
                                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Order Internal Notes</label>
                            <textarea
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal h-24 text-sm resize-none"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500">Physical Bill Pad Reference Image</label>
                            <div className="flex items-center space-x-2">
                                <label className={`flex-1 flex justify-center items-center px-4 py-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <span className="text-xs text-slate-600 font-semibold flex items-center">
                                        <Plus size={16} className="mr-1 text-slate-400" />
                                        {uploadingFile ? 'Uploading file...' : 'Upload Reference Image'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                    />
                                </label>
                            </div>
                            {formData.billPadImageUrl && (
                                <div className="mt-3 flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <img
                                        src={fileUploadService.getFileUrl(formData.billPadImageUrl, 'billpads')}
                                        alt="Bill Pad"
                                        className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                                    />
                                    <div>
                                        <a
                                            href={fileUploadService.getFileUrl(formData.billPadImageUrl, 'billpads')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-teal hover:underline font-extrabold"
                                        >
                                            View uploaded reference pad
                                        </a>
                                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{formData.billPadImageUrl}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 h-fit">
                        <div className="flex justify-between text-slate-500 font-semibold text-sm">
                            <span>Subtotal</span>
                            <span className="text-slate-900">₹{totals.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center text-slate-500 font-semibold text-sm">
                                <span>Tax (GST %)</span>
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
                            <div className="flex items-center text-teal">
                                <Truck size={14} className="mr-1" /> Shipping Charges
                            </div>
                            <input
                                type="number"
                                className="w-32 p-1.5 border border-slate-200 rounded-lg text-right text-xs"
                                value={formData.shippingCharge}
                                onChange={(e) => setFormData({ ...formData, shippingCharge: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold text-sm">
                            <span>Extra Discount</span>
                            <input
                                type="number"
                                className="w-32 p-1.5 border border-slate-200 rounded-lg text-right text-xs text-rose-600 font-bold"
                                value={formData.discount}
                                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-base font-bold text-slate-900">Total Net Value</span>
                            <span className="text-2xl font-extrabold text-teal">₹{totals.total.toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3.5 mt-2"
                        >
                            <Save size={18} />
                            <span>{loading ? 'Processing...' : (isEditMode ? 'Update Order' : 'Place Order')}</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default OrderFormPage;
