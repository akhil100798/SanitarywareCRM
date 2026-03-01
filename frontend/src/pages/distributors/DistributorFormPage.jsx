import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';

const DistributorFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phoneNumber: '',
        alternatePhone: '',
        gstNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        bankName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        outstandingBalance: 0,
        isActive: true,
        notes: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            fetchDistributor();
        }
    }, [id]);

    const fetchDistributor = async () => {
        try {
            setLoading(true);
            const response = await distributorService.getDistributorById(id);
            setFormData(response);
        } catch (error) {
            toast.error('Failed to fetch distributor details');
            navigate('/distributors');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (isEditMode) {
                await distributorService.updateDistributor(id, formData);
                toast.success('Distributor updated successfully');
            } else {
                await distributorService.createDistributor(formData);
                toast.success('Distributor created successfully');
            }
            navigate('/distributors');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/distributors')}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to List
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Distributor' : 'Add New Distributor'}
                    </h2>
                    <p className="text-sm text-gray-500">Fill in the details below to {isEditMode ? 'update' : 'create'} the distributor profile.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Distributor Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Contact Person</label>
                                <input
                                    type="text"
                                    name="contactPerson"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                                <input
                                    type="text"
                                    name="phoneNumber"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Alternate Phone</label>
                                <input
                                    type="text"
                                    name="alternatePhone"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.alternatePhone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">GST Number</label>
                                <input
                                    type="text"
                                    name="gstNumber"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Address Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Address Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    name="address"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={formData.address}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.city}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">State</label>
                                <input
                                    type="text"
                                    name="state"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.state}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Pincode</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Bank Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bank Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Bank Name</label>
                                <input
                                    type="text"
                                    name="bankName"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Account Number</label>
                                <input
                                    type="text"
                                    name="bankAccountNumber"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.bankAccountNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">IFSC Code</label>
                                <input
                                    type="text"
                                    name="bankIfsc"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.bankIfsc}
                                    onChange={handleChange}
                                />
                            </div>
                            {!isEditMode && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Opening Balance (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="outstandingBalance"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.outstandingBalance}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-gray-500">Amount currently owed to this distributor</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Status & Notes */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Additional Notes</h3>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Account</label>
                            </div>
                            <div className="space-y-2">
                                <textarea
                                    name="notes"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={formData.notes}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate('/distributors')}
                            className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save size={20} />
                            <span>{loading ? 'Saving...' : 'Save Distributor'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DistributorFormPage;
