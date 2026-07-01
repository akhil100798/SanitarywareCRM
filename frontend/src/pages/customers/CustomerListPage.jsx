import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Mail, Phone, User } from 'lucide-react';
import customerService from '../../services/customerService';
import toast from 'react-hot-toast';

const CustomerListPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customerService.getAll({ size: 100 });
            setCustomers(response.data.content);
        } catch (error) {
            toast.error('Failed to fetch customers');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchCustomers();
            return;
        }
        try {
            setLoading(true);
            const response = await customerService.search(searchQuery, { size: 100 });
            setCustomers(response.data.content);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this customer?')) {
            try {
                await customerService.delete(id);
                toast.success('Customer deactivated');
                fetchCustomers();
            } catch (error) {
                toast.error('Failed to delete customer');
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
                    <p className="text-slate-500 text-sm">Manage store clients, wholesalers, trade associations, and credit files.</p>
                </div>
                <Link to="/customers/new" className="btn-primary text-sm">
                    <Plus size={16} />
                    <span>Add Customer</span>
                </Link>
            </div>

            {/* List Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100">
                    <form onSubmit={handleSearch} className="relative max-w-lg">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by customer name, email, or telephone..."
                            className="input-field pl-10 py-2.5 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Customer Details</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Business / Company</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                        <span>Fetching customer list...</span>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No customer records found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{customer.name}</div>
                                                    <div className="text-xxs text-slate-400 mt-0.5">{customer.city ? `${customer.city}, ${customer.state || ''}` : 'Location unconfigured'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            <div className="flex items-center text-xs text-slate-600 font-medium">
                                                <Mail size={12} className="mr-2 text-slate-400" />
                                                {customer.email || 'No email registered'}
                                            </div>
                                            <div className="flex items-center text-xs text-slate-600 font-medium">
                                                <Phone size={12} className="mr-2 text-slate-400" />
                                                {customer.phoneNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wider">
                                                {customer.customerType || 'RETAIL'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                            {customer.company || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={customer.isActive ? 'badge-paid' : 'badge-unpaid'}>
                                                {customer.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1.5">
                                                <Link
                                                    to={`/customers/edit/${customer.id}`}
                                                    className="p-2 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                    title="Edit Customer"
                                                >
                                                    <Edit size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(customer.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all"
                                                    title="Deactivate Customer"
                                                >
                                                    <Trash2 size={16} />
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

export default CustomerListPage;
