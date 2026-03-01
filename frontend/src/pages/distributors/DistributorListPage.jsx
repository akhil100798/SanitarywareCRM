import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';

const DistributorListPage = () => {
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDistributors();
    }, []);

    const fetchDistributors = async (query = '') => {
        try {
            setLoading(true);
            const response = await distributorService.getAllDistributors(0, 100, query);
            setDistributors(response.content);
        } catch (error) {
            toast.error('Failed to fetch distributors');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchDistributors(searchQuery);
    };

    const handleToggleStatus = async (id) => {
        if (window.confirm('Are you sure you want to toggle the status of this distributor?')) {
            try {
                await distributorService.toggleActiveStatus(id);
                toast.success('Status updated successfully');
                fetchDistributors(searchQuery);
            } catch (error) {
                toast.error('Failed to update status');
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this distributor?')) {
            try {
                await distributorService.deleteDistributor(id);
                toast.success('Distributor deleted successfully');
                fetchDistributors(searchQuery);
            } catch (error) {
                toast.error('Failed to delete distributor');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Distributors</h1>
                    <p className="text-gray-500">Manage your suppliers and distributors.</p>
                </div>
                <Link
                    to="/distributors/new"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    <span>Add Distributor</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search distributors by name, phone..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={20} />
                        <span>Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Distributor</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Balance</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                        Loading distributors...
                                    </td>
                                </tr>
                            ) : distributors.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                        No distributors found.
                                    </td>
                                </tr>
                            ) : (
                                distributors.map((distributor) => (
                                    <tr key={distributor.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{distributor.name}</div>
                                            <div className="text-xs text-gray-500">Contact: {distributor.contactPerson || '-'}</div>
                                            {distributor.gstNumber && <div className="text-xs text-gray-400 mt-1">GST: {distributor.gstNumber}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {distributor.email && (
                                                <div className="flex items-center text-sm text-gray-600 mb-1">
                                                    <Mail size={14} className="mr-2 text-gray-400" />
                                                    {distributor.email}
                                                </div>
                                            )}
                                            <div className="flex items-center text-sm text-gray-600 mb-1">
                                                <Phone size={14} className="mr-2 text-gray-400" />
                                                {distributor.phoneNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-start">
                                                <MapPin size={14} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                                                <span>
                                                    {distributor.city ? `${distributor.city}, ` : ''}
                                                    {distributor.state || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-medium ${distributor.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹{distributor.outstandingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(distributor.id)}
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${distributor.isActive
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    } transition-colors`}
                                            >
                                                {distributor.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    to={`/distributors/edit/${distributor.id}`}
                                                    className="p-1 hover:text-blue-600 transition-colors rounded"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(distributor.id)}
                                                    className="p-1 hover:text-red-600 transition-colors rounded"
                                                    title="Delete"
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

export default DistributorListPage;
