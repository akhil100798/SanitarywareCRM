import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, ArrowUpRight } from 'lucide-react';
import distributorPaymentService from '../../services/distributorPaymentService';
import toast from 'react-hot-toast';

const DistributorPaymentListPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await distributorPaymentService.getAllPayments(0, 100);
            setPayments(response.content);
        } catch (error) {
            toast.error('Failed to fetch distributor payments');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this payment? This will revert the distributor balance and purchase order paid amounts.')) {
            try {
                await distributorPaymentService.deletePayment(id);
                toast.success('Payment deleted successfully');
                fetchPayments();
            } catch (error) {
                toast.error('Failed to delete payment');
            }
        }
    };

    const getPaymentMethodBadgeClass = (method) => {
        switch (method) {
            case 'CASH': return 'bg-green-100 text-green-800';
            case 'BANK_TRANSFER': return 'bg-blue-100 text-blue-800';
            case 'UPI': return 'bg-purple-100 text-purple-800';
            case 'CHEQUE': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Very basic client-side filtering
    const filteredPayments = payments.filter(payment =>
        (payment.paymentNumber && payment.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (payment.distributorName && payment.distributorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (payment.referenceNumber && payment.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Distributor Payments</h1>
                    <p className="text-gray-500">Manage payments made to your suppliers.</p>
                </div>
                <Link
                    to="/distributor-payments/new"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    <span>Record Payment</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Payment #, Distributor, or Reference..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Payment Info</th>
                                <th className="px-6 py-4">Distributor & PO</th>
                                <th className="px-6 py-4">Method & Ref</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        Loading payments...
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No payments found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{payment.paymentNumber}</div>
                                            <div className="text-sm text-gray-500">{new Date(payment.paymentDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{payment.distributorName}</div>
                                            {payment.poNumber && (
                                                <div className="text-xs text-blue-600 font-medium">For PO: {payment.poNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="mb-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodBadgeClass(payment.paymentMethod)}`}>
                                                    {payment.paymentMethod.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">{payment.referenceNumber || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600 flex items-center">
                                            <ArrowUpRight size={14} className="mr-1" />
                                            ₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    to={`/distributor-payments/edit/${payment.id}`}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                                    title="View Detail"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                                                    title="Revert Payment"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DistributorPaymentListPage;
