import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import distributorPaymentService from '../../services/distributorPaymentService';
import purchaseOrderService from '../../services/purchaseOrderService';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const DistributorPaymentFormPage = () => {
    const [searchParams] = useSearchParams();
    const poId = searchParams.get('poId');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [distributors, setDistributors] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [fetchingPos, setFetchingPos] = useState(false);
    const [formData, setFormData] = useState({
        purchaseOrderId: poId || '', distributorId: '', paymentDate: new Date().toISOString().split('T')[0],
        amount: 0, paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: ''
    });

    useEffect(() => {
        fetchInitialData();
        if (poId) fetchPurchaseOrder(poId);
    }, [poId]);

    const fetchInitialData = async () => {
        try { const distRes = await distributorService.getAllActiveDistributors(); setDistributors(distRes); }
        catch (error) { toast.error('Failed to load distributors'); }
    };

    const fetchPurchaseOrders = async (distId) => {
        try { setFetchingPos(true); const pos = await purchaseOrderService.getPurchaseOrdersByDistributor(distId); setPurchaseOrders(pos.filter(po => po.balanceAmount > 0)); }
        catch (error) { console.error('Failed to load POs', error); }
        finally { setFetchingPos(false); }
    };

    const fetchPurchaseOrder = async (id) => {
        try { setLoading(true); const res = await purchaseOrderService.getPurchaseOrderById(id); setPurchaseOrder(res); setFormData(prev => ({ ...prev, amount: res.balanceAmount, distributorId: res.distributorId })); }
        catch (error) { toast.error('Failed to load PO'); }
        finally { setLoading(false); }
    };

    const handleDistributorChange = (e) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, distributorId: id, purchaseOrderId: '' }));
        setPurchaseOrder(null); setPurchaseOrders([]);
        if (id) fetchPurchaseOrders(id);
    };

    const handlePoChange = async (e) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, purchaseOrderId: id }));
        if (id) {
            const selectedPo = purchaseOrders.find(po => po.id === parseInt(id));
            if (selectedPo) { setPurchaseOrder(selectedPo); setFormData(prev => ({ ...prev, amount: selectedPo.balanceAmount, distributorId: selectedPo.distributorId })); }
            else { fetchPurchaseOrder(id); }
        } else { setPurchaseOrder(null); setFormData(prev => ({ ...prev, amount: 0 })); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.amount <= 0) { toast.error('Amount must be > 0'); return; }
        if (!formData.purchaseOrderId && !formData.distributorId) { toast.error('Select a PO or distributor'); return; }
        if (purchaseOrder && formData.amount > purchaseOrder.balanceAmount) {
            toast.error(`Amount exceeds balance (₹${purchaseOrder.balanceAmount.toLocaleString('en-IN')})`); return;
        }
        try {
            setLoading(true);
            await distributorPaymentService.createPayment(formData);
            toast.success('Payment recorded');
            navigate(formData.purchaseOrderId ? `/purchase-orders/edit/${formData.purchaseOrderId}` : `/distributors/edit/${formData.distributorId}`);
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to record payment'); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => navigate(-1)} className="btn-ghost mb-6"><ArrowLeft size={16} /> Back</button>
            <h1 className="text-2xl font-bold mb-6">Record Distributor Payment</h1>

            <form onSubmit={handleSubmit} className="surface space-y-6">
                {purchaseOrder && (
                    <div className="financial-summary surface" style={{ padding: 16 }}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="record-meta">Purchase Order</p>
                                <p className="font-bold text-lg">{purchaseOrder.poNumber}</p>
                                <p className="text-sm">{purchaseOrder.distributorName}</p>
                                <p className="text-sm text-secondary">Total: ₹{(purchaseOrder.total || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-right">
                                <p className="record-meta">Balance Due</p>
                                <p className="text-xl font-bold" style={{ color: 'var(--danger)' }}>₹{(purchaseOrder.balanceAmount || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!purchaseOrder && (
                    <div className="space-y-4">
                        <Field label="Distributor" required={!formData.purchaseOrderId}>
                            <select className="input-field" value={formData.distributorId} onChange={handleDistributorChange}>
                                <option value="">Select Distributor...</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name} {d.outstandingBalance > 0 ? `(₹${d.outstandingBalance})` : ''}</option>)}
                            </select>
                        </Field>
                        {formData.distributorId && (
                            <Field label="Purchase Order (Optional)">
                                <select className="input-field" value={formData.purchaseOrderId} onChange={handlePoChange} disabled={fetchingPos}>
                                    <option value="">{fetchingPos ? 'Loading...' : 'Independent Payment (No PO)'}</option>
                                    {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNumber} (Bal: ₹{po.balanceAmount.toLocaleString('en-IN')})</option>)}
                                </select>
                            </Field>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Payment Amount" required>
                        <input type="number" step="0.01" required min="0.01" className="input-field" value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })} />
                    </Field>
                    <Field label="Payment Date" required>
                        <input type="date" required className="input-field" value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} />
                    </Field>
                    <Field label="Payment Method">
                        <select className="input-field" value={formData.paymentMethod}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="CASH">Cash</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="DEBIT_CARD">Debit Card</option>
                        </select>
                    </Field>
                    <Field label="Reference Number">
                        <input type="text" className="input-field" value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="Notes"><textarea className="input-field" rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea></Field>
                    </div>
                </div>

                <div className="form-actions">
                    <Button variant="secondary" onClick={() => navigate('/distributor-payments')}>Cancel</Button>
                    <Button type="submit" loading={loading}>{loading ? 'Processing...' : 'Record Payment'}</Button>
                </div>
            </form>
        </div>
    );
};

export default DistributorPaymentFormPage;