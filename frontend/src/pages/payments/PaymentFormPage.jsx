import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import paymentService from '../../services/paymentService';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const PaymentFormPage = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const amountEditedRef = useRef(false);
    const [formData, setFormData] = useState({
        orderId: orderId || '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'CASH',
        referenceNumber: '',
        notes: ''
    });

    useEffect(() => {
        amountEditedRef.current = false;
        if (orderId) fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const res = await orderService.getById(orderId);
            setOrder(res.data);
            if (!amountEditedRef.current) {
                setFormData(prev => ({ ...prev, amount: res.data.balanceAmount }));
            }
        } catch (error) {
            toast.error('Failed to load order details');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
        if (order && formData.amount > order.balanceAmount) {
            toast.error(`Amount cannot exceed the balance due (₹${order.balanceAmount.toLocaleString()})`);
            return;
        }
        try {
            setLoading(true);
            await paymentService.create(formData);
            toast.success('Payment recorded');
            navigate(`/orders/edit/${formData.orderId}`);
        } catch (error) {
            toast.error('Failed to record payment');
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => navigate(-1)} className="btn-ghost mb-6"><ArrowLeft size={16} /> Back</button>
            <h1 className="text-2xl font-bold mb-6">Record Payment</h1>

            {!orderId && !order && (
                <div className="surface" style={{ padding: 24 }}>
                    <p className="text-secondary mb-4">Select an order to record a payment against.</p>
                    <Button as={Link} to="/orders" variant="secondary">Choose an Order</Button>
                </div>
            )}

            {(orderId || order) && (
                <form onSubmit={handleSubmit} className="surface space-y-6">
                    {orderId && !order && !loading && (
                        <div className="error-panel"><p>Order details not found.</p></div>
                    )}
                    {loading && <p className="text-slate-500 py-8 text-center">Loading order...</p>}
                    {order && (
                        <div className="financial-summary surface" style={{ padding: 16 }}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{order.orderNumber}</p>
                                    <p className="text-sm text-secondary">Total: ₹{(order.total || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">Balance Due</p>
                                    <p className="text-xl font-bold">₹{(order.balanceAmount || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {order && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Payment Amount" required>
                                    <input type="number" step="0.01" min="0" required name="amount" className="input-field" value={formData.amount}
                                        onChange={(e) => {
                                            amountEditedRef.current = true;
                                            setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }));
                                        }} />
                                </Field>
                                <Field label="Payment Date" required>
                                    <input type="date" required className="input-field" value={formData.paymentDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))} />
                                </Field>
                                <Field label="Method" required>
                                    <select className="input-field" value={formData.paymentMethod}
                                        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="CREDIT_CARD">Credit Card</option>
                                        <option value="DEBIT_CARD">Debit Card</option>
                                    </select>
                                </Field>
                                <Field label="Reference #">
                                    <input type="text" className="input-field" value={formData.referenceNumber}
                                        onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))} />
                                </Field>
                                <Field label="Notes">
                                    <textarea className="input-field" rows="3" value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}></textarea>
                                </Field>
                            </div>
                            <div className="form-actions">
                                <Button variant="secondary" onClick={() => navigate('/payments')}>Cancel</Button>
                                <Button type="submit" loading={loading}>{loading ? 'Recording...' : 'Record Receipt'}</Button>
                            </div>
                        </>
                    )}
                </form>
            )}
        </div>
    );
};

export default PaymentFormPage;
