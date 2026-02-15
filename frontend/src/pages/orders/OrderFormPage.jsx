import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Truck, CreditCard } from 'lucide-react';
import orderService from '../../services/orderService';
import quotationService from '../../services/quotationService';
import customerService from '../../services/customerService';
import { productService } from '../../services/productService';
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
                productService.getAll({ size: 200 })
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

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/orders')} className="flex items-center text-gray-600 hover:text-gray-900 font-medium">
                    <ArrowLeft size={20} className="mr-2" /> Back to List
                </button>
                <div className="flex space-x-2">
                    {isEditMode && formData.paymentStatus !== 'PAID' && (
                        <button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center shadow-md active:scale-95"
                            onClick={() => navigate(`/payments/new?orderId=${id}`)}
                        >
                            <CreditCard size={18} className="mr-2" />
                            Record Payment
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center">
                        <ShoppingCart size={24} className="mr-2 text-blue-600" />
                        {isEditMode ? 'Edit' : 'New'} Order
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Customer *</label>
                            <select
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.customerId}
                                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Order Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg outline-none"
                                value={formData.orderDate}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Expected Delivery</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg outline-none"
                                value={formData.deliveryDate || ''}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Order Status</label>
                            <select
                                className="w-full p-2 border rounded-lg outline-none"
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <CreditCard size={16} className="mr-1" /> Payment Status
                            </label>
                            <select
                                className="w-full p-2 border rounded-lg outline-none"
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
                            <tbody className="divide-y divide-gray-100">
                                {formData.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3">
                                            <select
                                                required
                                                className="w-full p-2 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            >
                                                <option value="">Select Product</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="1"
                                                className="w-full p-2 text-sm border rounded outline-none"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm">₹{item.unitPrice}</td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="0" max="100"
                                                className="w-full p-2 text-sm border rounded outline-none"
                                                value={item.discountPercentage}
                                                onChange={(e) => handleItemChange(index, 'discountPercentage', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-bold text-sm">₹{(item.lineTotal || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600">
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
                            <label className="text-sm font-medium flex items-center">
                                <Truck size={16} className="mr-1" /> Shipping Address
                            </label>
                            <textarea
                                className="w-full p-2 border rounded-lg h-24 outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Enter full delivery address..."
                                value={formData.shippingAddress}
                                onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Order Notes</label>
                            <textarea
                                className="w-full p-2 border rounded-lg h-24 outline-none"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 h-fit">
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center">
                                <span>Tax (GST %)</span>
                                <input
                                    type="number"
                                    className="w-16 p-1 border rounded ml-2 text-center"
                                    value={formData.taxPercentage}
                                    onChange={(e) => setFormData({ ...formData, taxPercentage: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <span>₹{totals.taxAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center text-blue-600 font-medium">
                                <Truck size={14} className="mr-1" /> Shipping Charge
                            </div>
                            <input
                                type="number"
                                className="w-32 p-1 border rounded text-right outline-none"
                                value={formData.shippingCharge}
                                onChange={(e) => setFormData({ ...formData, shippingCharge: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>Discount</span>
                            <input
                                type="number"
                                className="w-32 p-1 border rounded text-right text-red-600 outline-none"
                                value={formData.discount}
                                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-xl font-bold">Total Payable</span>
                            <span className="text-2xl font-bold text-blue-600">₹{totals.total.toLocaleString()}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-3 rounded-lg flex justify-center items-center transition-colors shadow-lg active:scale-[0.98]`}
                        >
                            <Save size={20} className="mr-2" />
                            {loading ? 'Processing...' : (isEditMode ? 'Update Order' : 'Place Order')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default OrderFormPage;
