import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
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
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold text-sm">Assembling customer record...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center">
                <button
                    onClick={() => navigate('/customers')}
                    className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
                >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Directory
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {isEditMode ? 'Edit Customer Profile' : 'Register New Customer'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Configure client details, business designations, GST metrics, and dispatch locations.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Information */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="input-field text-sm"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Customer Type</label>
                                <select
                                    name="customerType"
                                    className="input-field text-sm font-medium"
                                    value={formData.customerType}
                                    onChange={handleChange}
                                >
                                    <option value="RETAIL">Retail</option>
                                    <option value="WHOLESALE">Wholesale</option>
                                    <option value="CONTRACTOR">Contractor</option>
                                    <option value="BUILDER">Builder</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="input-field text-sm"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Phone Number *</label>
                                <input
                                    type="text"
                                    name="phoneNumber"
                                    required
                                    className="input-field text-sm"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Alternate Phone</label>
                                <input
                                    type="text"
                                    name="alternatePhone"
                                    className="input-field text-sm"
                                    value={formData.alternatePhone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Company Name</label>
                                <input
                                    type="text"
                                    name="company"
                                    className="input-field text-sm"
                                    value={formData.company}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">GST Number</label>
                                <input
                                    type="text"
                                    name="gstNumber"
                                    className="input-field text-sm"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    className="w-4 h-4 text-teal border-slate-300 rounded focus:ring-teal"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                />
                                <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">Active Account</label>
                            </div>
                        </div>
                    </section>

                    {/* Address Information */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Billing Address</label>
                                <textarea
                                    name="billingAddress"
                                    rows="2"
                                    className="input-field text-sm resize-none"
                                    value={formData.billingAddress}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Shipping Address</label>
                                <textarea
                                    name="shippingAddress"
                                    rows="2"
                                    className="input-field text-sm resize-none"
                                    value={formData.shippingAddress}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    className="input-field text-sm"
                                    value={formData.city}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">State</label>
                                <input
                                    type="text"
                                    name="state"
                                    className="input-field text-sm"
                                    value={formData.state}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Pincode</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    className="input-field text-sm"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Notes</h3>
                        <div className="space-y-1.5">
                            <textarea
                                name="notes"
                                rows="3"
                                className="input-field text-sm resize-none"
                                value={formData.notes}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                    </section>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => navigate('/customers')}
                            className="btn-secondary text-sm px-6"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary text-sm px-8"
                        >
                            <Save size={16} />
                            <span>{loading ? 'Saving...' : 'Save Customer'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormPage;
