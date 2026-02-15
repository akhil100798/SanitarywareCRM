import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import customerService from '../../services/customerService';
import toast from 'react-hot-toast';

const CustomerFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        alternatePhone: '',
        company: '',
        gstNumber: '',
        customerType: 'RETAIL',
        billingAddress: '',
        shippingAddress: '',
        city: '',
        state: '',
        pincode: '',
        notes: '',
        isActive: true
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            fetchCustomer();
        }
    }, [id]);

    const fetchCustomer = async () => {
        try {
            setLoading(true);
            const response = await customerService.getById(id);
            setFormData(response.data);
        } catch (error) {
            toast.error('Failed to fetch customer details');
            navigate('/customers');
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
                await customerService.update(id, formData);
                toast.success('Customer updated successfully');
            } else {
                await customerService.create(formData);
                toast.success('Customer created successfully');
            }
            navigate('/customers');
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
                    onClick={() => navigate('/customers')}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to List
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Customer' : 'Add New Customer'}
                    </h2>
                    <p className="text-sm text-gray-500">Fill in the details below to {isEditMode ? 'update' : 'create'} the customer profile.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Full Name *</label>
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
                                <label className="text-sm font-medium text-gray-700">Customer Type</label>
                                <select
                                    name="customerType"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.customerType}
                                    onChange={handleChange}
                                >
                                    <option value="RETAIL">Retail</option>
                                    <option value="WHOLESALE">Wholesale</option>
                                    <option value="CONTRACTOR">Contractor</option>
                                    <option value="BUILDER">Builder</option>
                                </select>
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
                                <label className="text-sm font-medium text-gray-700">Company Name</label>
                                <input
                                    type="text"
                                    name="company"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.company}
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
                            <div className="flex items-center space-x-2 pt-8">
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
                        </div>
                    </section>

                    {/* Address Information */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Address Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Billing Address</label>
                                <textarea
                                    name="billingAddress"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={formData.billingAddress}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Shipping Address</label>
                                <textarea
                                    name="shippingAddress"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={formData.shippingAddress}
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

                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Additional Notes</h3>
                        <div className="space-y-2">
                            <textarea
                                name="notes"
                                rows="3"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                value={formData.notes}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                    </section>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate('/customers')}
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
                            <span>{loading ? 'Saving...' : 'Save Customer'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormPage;
