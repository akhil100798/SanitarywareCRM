import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus, Search, Edit, Trash2, Mail, Phone, User, MessageCircle,
    X, RotateCcw, AlertCircle, FileDown, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import customerService from '../../services/customerService';
import toast from 'react-hot-toast';

const CustomerListPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination (BUG-059)
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Detail Modal (BUG-064)
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        fetchCustomers(0);
    }, []);

    const fetchCustomers = async (pageToFetch = currentPage, queryOverride) => {
        try {
            setLoading(true);
            setError(null);
            const effectiveQuery = queryOverride !== undefined ? queryOverride : searchQuery;
            let response;
            if (effectiveQuery && effectiveQuery.trim()) {
                response = await customerService.search(effectiveQuery.trim(), { page: pageToFetch, size: pageSize });
            } else {
                response = await customerService.getAll({ page: pageToFetch, size: pageSize });
            }

            const data = response.data;
            if (data && data.content) {
                setCustomers(data.content);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
                setCurrentPage(data.number || 0);
            } else if (Array.isArray(data)) {
                setCustomers(data);
                setTotalPages(1);
                setTotalElements(data.length);
                setCurrentPage(0);
            } else {
                setCustomers([]);
            }
        } catch (err) {
            setError(err);
            toast.error(!navigator.onLine ? 'Network disconnected' : 'Failed to fetch customers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setCurrentPage(0);
        fetchCustomers(0, searchQuery);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this customer?')) {
            try {
                await customerService.delete(id);
                toast.success('Customer deactivated');
                fetchCustomers(currentPage); // Preserve current page (BUG-059)
            } catch (error) {
                toast.error('Failed to delete customer');
            }
        }
    };

    // RFC 4180 Compliant CSV Export (BUG-063)
    const escapeCsvCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const handleExportCsv = () => {
        if (!customers || customers.length === 0) {
            toast.error('No customer records to export');
            return;
        }

        const headers = [
            'ID', 'Name', 'Customer Type', 'Company', 'Phone', 'Email',
            'GST Number', 'Billing Address', 'Shipping Address', 'City',
            'State', 'Pincode', 'Credit Limit', 'Status'
        ];

        const rows = customers.map(c => [
            escapeCsvCell(c.id),
            escapeCsvCell(c.name),
            escapeCsvCell(c.customerType || 'RETAIL'),
            escapeCsvCell(c.company || ''),
            escapeCsvCell(c.phoneNumber || ''),
            escapeCsvCell(c.email || ''),
            escapeCsvCell(c.gstNumber || ''),
            escapeCsvCell(c.billingAddress || ''),
            escapeCsvCell(c.shippingAddress || ''),
            escapeCsvCell(c.city || ''),
            escapeCsvCell(c.state || ''),
            escapeCsvCell(c.pincode || ''),
            // BUG-064: Safe credit limit fallback
            escapeCsvCell(c.creditLimit != null && !isNaN(Number(c.creditLimit)) ? Number(c.creditLimit).toFixed(2) : '0.00'),
            escapeCsvCell(c.isActive ? 'Active' : 'Inactive')
        ]);

        const csvContent = [headers.map(escapeCsvCell).join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.setAttribute('download', `Customers_${safeTimestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Customer CSV exported successfully');
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
                    <p className="text-slate-500 text-sm">Manage store clients, wholesalers, trade associations, and credit files.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="btn-secondary text-sm inline-flex items-center gap-1.5"
                        title="Export Customers as CSV"
                        aria-label="Export CSV"
                    >
                        <FileDown size={16} />
                        <span>Export CSV</span>
                    </button>
                    <Link to="/customers/new" className="btn-primary text-sm inline-flex items-center gap-1.5">
                        <Plus size={16} />
                        <span>Add Customer</span>
                    </Link>
                </div>
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
                            className="input-field pl-10 pr-9 py-2.5 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && searchQuery.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    fetchCustomers(0, '');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
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
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <AlertCircle className="w-8 h-8 text-amber-500" />
                                            <div className="text-sm font-semibold text-slate-700">
                                                {!navigator.onLine ? 'Network disconnected. Please check your internet connection.' : 'Failed to fetch customer data.'}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fetchCustomers(currentPage)}
                                                className="btn-primary text-xs px-4 py-2"
                                            >
                                                <RotateCcw size={14} /> Retry
                                            </button>
                                        </div>
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
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCustomer(customer)}
                                                        className="font-bold text-slate-900 hover:text-teal transition-colors text-left"
                                                        title="View Customer Profile"
                                                    >
                                                        {customer.name}
                                                    </button>
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
                                                <span>{customer.phoneNumber}</span>
                                                {customer.phoneNumber && (
                                                    <a
                                                        href={`https://wa.me/91${customer.phoneNumber.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                                                        title="Message on WhatsApp"
                                                    >
                                                        <MessageCircle size={13} />
                                                    </a>
                                                )}
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
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className="p-2 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                    title="View Details"
                                                    aria-label="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
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

                {/* Pagination Footer (BUG-059) */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                        <div>
                            Showing page <span className="font-bold text-slate-700">{currentPage + 1}</span> of{' '}
                            <span className="font-bold text-slate-700">{totalPages}</span> ({totalElements} total customers)
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => fetchCustomers(currentPage - 1)}
                                disabled={currentPage === 0 || loading}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={14} />
                                <span>Previous</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchCustomers(currentPage + 1)}
                                disabled={currentPage >= totalPages - 1 || loading}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                <span>Next</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Customer Detail Drawer Modal (BUG-064) */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center font-bold">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{selectedCustomer.name}</h3>
                                    <span className="inline-block mt-0.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                        {selectedCustomer.customerType || 'RETAIL'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCustomer(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-sm">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                                    <span className="font-semibold text-slate-800">{selectedCustomer.phoneNumber || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                                    <span className="font-semibold text-slate-800 truncate block">{selectedCustomer.email || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Company</span>
                                    <span className="font-semibold text-slate-800">{selectedCustomer.company || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">GSTIN</span>
                                    <span className="font-mono text-xs font-semibold text-slate-800">{selectedCustomer.gstNumber || '—'}</span>
                                </div>
                            </div>

                            {/* Credit Limit & Account Status (BUG-064: Never render NaN) */}
                            <div className="grid grid-cols-2 gap-3 bg-teal/5 border border-teal/20 p-3.5 rounded-xl">
                                <div>
                                    <span className="text-xxs font-bold text-teal-700 uppercase tracking-wider block">Credit Limit</span>
                                    <span className="font-black text-slate-900 text-base">
                                        {selectedCustomer.creditLimit != null && !isNaN(Number(selectedCustomer.creditLimit))
                                            ? `₹${Number(selectedCustomer.creditLimit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : 'No limit set'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xxs font-bold text-teal-700 uppercase tracking-wider block">Account Status</span>
                                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedCustomer.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                                        {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Billing Address</span>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {selectedCustomer.billingAddress || 'No billing address provided'}
                                </p>
                            </div>

                            <div>
                                <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">Shipping Address</span>
                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {selectedCustomer.shippingAddress || 'No shipping address provided'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <Link
                                to={`/customers/edit/${selectedCustomer.id}`}
                                className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                            >
                                <Edit size={14} />
                                <span>Edit Profile</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setSelectedCustomer(null)}
                                className="btn-secondary text-xs px-4 py-2"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerListPage;
