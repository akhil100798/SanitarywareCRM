import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard, Calendar, User, ShoppingBag } from 'lucide-react';
import paymentService from '../../services/paymentService';
import toast from 'react-hot-toast';

const PaymentListPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await paymentService.getAll();
            setPayments(response.data);
        } catch (error) {
            toast.error('Failed to fetch payments');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500">Track and manage customer payments and receipts.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by payment # or order..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Receipt #</th>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Received By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No payments found.</td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <CreditCard size={18} className="text-gray-400 mr-2" />
                                                <span className="font-medium text-gray-900">{p.paymentNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-blue-600">
                                                <ShoppingBag size={16} className="mr-1" />
                                                <span className="font-medium">{p.orderNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <Calendar size={14} className="mr-1" /> {p.paymentDate}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-green-600">
                                            ₹{p.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                                                {p.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <User size={14} className="mr-1" /> {p.receivedByName}
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

export default PaymentListPage;
