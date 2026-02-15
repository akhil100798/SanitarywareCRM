import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Download, CheckCircle, XCircle, Share2 } from 'lucide-react';
import quotationService from '../../services/quotationService';
import toast from 'react-hot-toast';

const QuotationListPage = () => {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const response = await quotationService.getAll({ size: 100 });
            setQuotations(response.data.content);
        } catch (error) {
            toast.error('Failed to fetch quotations');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'SENT': return 'bg-blue-100 text-blue-800';
            case 'ACCEPTED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            case 'EXPIRED': return 'bg-orange-100 text-orange-800';
            case 'CONVERTED': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
                    <p className="text-gray-500">Create and manage sales quotes for your customers.</p>
                </div>
                <Link
                    to="/quotations/new"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    <span>New Quotation</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by quote # or customer..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={20} />
                        <span>Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Quote Details</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : quotations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No quotations found.</td>
                                </tr>
                            ) : (
                                quotations.map((q) => (
                                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <FileText size={20} className="text-gray-400 mr-3" />
                                                <div className="font-medium text-blue-600 hover:underline">
                                                    <Link to={`/quotations/edit/${q.id}`}>{q.quotationNumber}</Link>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{q.customerName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {q.quotationDate}
                                            <div className="text-xs text-gray-400">Expires: {q.validUntil}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">₹{q.total.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">Excl. Tax: ₹{q.subtotal.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(q.status)}`}>
                                                {q.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button title="Download PDF" className="p-1 hover:text-blue-600"><Download size={18} /></button>
                                                {q.status === 'SENT' && (
                                                    <button title="Accept" className="p-1 hover:text-green-600"><CheckCircle size={18} /></button>
                                                )}
                                                {q.status !== 'CONVERTED' && q.status !== 'REJECTED' && (
                                                    <button title="Reject" className="p-1 hover:text-red-600"><XCircle size={18} /></button>
                                                )}
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

export default QuotationListPage;
