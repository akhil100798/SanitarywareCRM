import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, CreditCard, ArrowUpRight } from 'lucide-react';
import distributorPaymentService from '../../services/distributorPaymentService';
import purchaseOrderService from '../../services/purchaseOrderService';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';

const DistributorPaymentFormPage = () => {
    const [searchParams] = useSearchParams();
    const poId = searchParams.get('poId');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [distributors, setDistributors] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]); // Added for selection
    const [fetchingPos, setFetchingPos] = useState(false);
    const [formData, setFormData] = useState({
        purchaseOrderId: poId || '',
        distributorId: '', // Added for independent payments
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        notes: ''
    });

    useEffect(() => {
        fetchInitialData();
        if (poId) fetchPurchaseOrder(poId);
    }, [poId]);

    const fetchInitialData = async () => {
        try {
            const distRes = await distributorService.getAllActiveDistributors();
            setDistributors(distRes);
        } catch (error) {
            toast.error('Failed to load distributors');
        }
    };

    const fetchPurchaseOrders = async (distId) => {
        try {
            setFetchingPos(true);
            const pos = await purchaseOrderService.getPurchaseOrdersByDistributor(distId);
            // Filter for orders with balance
            setPurchaseOrders(pos.filter(po => po.balanceAmount > 0));
        } catch (error) {
            console.error('Failed to load POs', error);
        } finally {
            setFetchingPos(false);
        }
    };

    const fetchPurchaseOrder = async (id) => {
        try {
            setLoading(true);
            const res = await purchaseOrderService.getPurchaseOrderById(id);
            setPurchaseOrder(res);
            setFormData(prev => ({
                ...prev,
                amount: res.balanceAmount,
                distributorId: res.distributorId
            }));
        } catch (error) {
            toast.error('Failed to load purchase order details');
        } finally {
            setLoading(false);
        }
    };

    const handleDistributorChange = (e) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, distributorId: id, purchaseOrderId: '' }));
        setPurchaseOrder(null);
        setPurchaseOrders([]);
        if (id) {
            fetchPurchaseOrders(id);
        }
    };

    const handlePoChange = async (e) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, purchaseOrderId: id }));
        if (id) {
            const selectedPo = purchaseOrders.find(po => po.id === parseInt(id));
            if (selectedPo) {
                setPurchaseOrder(selectedPo);
                setFormData(prev => ({
                    ...prev,
                    amount: selectedPo.balanceAmount,
                    distributorId: selectedPo.distributorId
                }));
            } else {
                fetchPurchaseOrder(id);
            }
        } else {
            setPurchaseOrder(null);
            setFormData(prev => ({ ...prev, amount: 0 }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }

        if (!formData.purchaseOrderId && !formData.distributorId) {
            toast.error('Please select either a Purchase Order or a Distributor');
            return;
        }

        if (purchaseOrder && formData.amount > purchaseOrder.balanceAmount) {
            toast.error(`Amount cannot exceed the PO balance (₹${purchaseOrder.balanceAmount.toLocaleString('en-IN')})`);
            return;
        }

        try {
            setLoading(true);
            await distributorPaymentService.createPayment(formData);
            toast.success('Payment recorded successfully');

            if (formData.purchaseOrderId) {
                navigate(`/purchase-orders/edit/${formData.purchaseOrderId}`);
            } else {
                navigate(`/distributors/edit/${formData.distributorId}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 font-medium">
                <ArrowLeft size={20} className="mr-2" /> Back
            </button>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold flex items-center text-gray-800">
                        <ArrowUpRight size={24} className="mr-2 text-red-500 bg-red-50 p-1 rounded-md" />
                        Record Distributor Payment
                    </h2>
                </div>

                {purchaseOrder && (
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center text-sm">
                        <div className="space-y-1 mb-4 md:mb-0">
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Purchase Order</p>
                            <p className="text-slate-900 font-bold text-lg">{purchaseOrder.poNumber}</p>
                            <p className="text-slate-600 font-medium">{purchaseOrder.distributorName}</p>
                            <p className="text-slate-500">Total: ₹{(purchaseOrder.total || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="md:text-right bg-white p-3 rounded-lg border border-slate-200 shadow-sm min-w-[150px]">
                            <p className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Balance Due</p>
                            <p className="text-xl font-bold text-red-600">₹{(purchaseOrder.balanceAmount || 0).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                )}

                {!purchaseOrder && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Distributor *</label>
                            <select
                                required={!formData.purchaseOrderId}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                                value={formData.distributorId}
                                onChange={handleDistributorChange}
                            >
                                <option value="">Select Distributor...</option>
                                {distributors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} {d.outstandingBalance > 0 ? `(Owes ₹${d.outstandingBalance})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        {formData.distributorId && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Purchase Order (Optional)</label>
                                <select
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                                    value={formData.purchaseOrderId}
                                    onChange={handlePoChange}
                                    disabled={fetchingPos}
                                >
                                    <option value="">{fetchingPos ? 'Loading POs...' : 'Independent Payment (No PO)'}</option>
                                    {purchaseOrders.map(po => (
                                        <option key={po.id} value={po.id}>{po.poNumber} (Balance: ₹{po.balanceAmount.toLocaleString('en-IN')})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Input Fields */}
                <div className="space-y-5 pt-2">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                            Payment Amount <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                            <input
                                type="number" step="0.01" required min="0.01"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium text-lg placeholder:font-normal placeholder:text-gray-400"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Payment Date</label>
                            <input
                                type="date" required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Payment Method</label>
                            <select
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 font-medium bg-white"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                            >
                                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                <option value="UPI">UPI / GPay / PhonePe</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="CASH">Cash</option>
                                <option value="CREDIT_CARD">Credit Card</option>
                                <option value="DEBIT_CARD">Debit Card</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                            Reference Number
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                            placeholder="e.g. UTR Number, Cheque Number, TXN ID"
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Internal Notes</label>
                        <textarea
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg h-28 outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 resize-none"
                            placeholder="Add any additional details or remarks about this payment..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'} text-white font-bold py-3.5 rounded-lg flex justify-center items-center transition-all active:scale-[0.99]`}
                    >
                        {loading ? (
                            <span>Processing Payment...</span>
                        ) : (
                            <>
                                <ArrowUpRight size={20} className="mr-2" />
                                <span>Record Outward Payment</span>
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center">
                        <CreditCard size={12} className="mr-1" />
                        This will instantly update the distributor balance.
                    </p>
                </div>
            </form>
        </div>
    );
};

export default DistributorPaymentFormPage;
