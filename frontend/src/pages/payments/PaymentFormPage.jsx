import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, CreditCard, DollarSign } from 'lucide-react';
import paymentService from '../../services/paymentService';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';

const PaymentFormPage = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [formData, setFormData] = useState({
        orderId: orderId || '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'CASH',
        referenceNumber: '',
        notes: ''
    });

    useEffect(() => {
        if (orderId) fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const res = await orderService.getById(orderId);
            setOrder(res.data);
            setFormData(prev => ({ ...prev, amount: res.data.balanceAmount }));
        } catch (error) {
            toast.error('Failed to load order details');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        try {
            setLoading(true);
            await paymentService.create(formData);
            toast.success('Payment recorded successfully');
            navigate(`/orders/edit/${formData.orderId}`);
        } catch (error) {
            toast.error('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} className="mr-2" /> Back
            </button>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center">
                    <CreditCard size={24} className="mr-2 text-blue-600" />
                    Record Payment
                </h2>

                {order && (
                    <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-sm">
                        <div>
                            <p className="text-blue-800 font-semibold">{order.orderNumber}</p>
                            <p className="text-blue-600">Total: ₹{order.total.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-800 font-semibold">Balance Due</p>
                            <p className="text-lg font-bold text-blue-900">₹{order.balanceAmount.toLocaleString()}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Amount *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                            <input
                                type="number" step="0.01" required
                                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Date</label>
                            <input
                                type="date" required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Method</label>
                            <select
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                            >
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="UPI">UPI / GPay / PhonePe</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="CREDIT_CARD">Credit Card</option>
                                <option value="DEBIT_CARD">Debit Card</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reference # (Check #, Transaction ID)</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. TXN123456"
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notes</label>
                        <textarea
                            className="w-full p-2 border rounded-lg h-24 outline-none"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center shadow-md transition-colors"
                >
                    <Save size={20} className="mr-2" />
                    {loading ? 'Processing...' : 'Record Receipt'}
                </button>
            </form>
        </div>
    );
};

export default PaymentFormPage;
