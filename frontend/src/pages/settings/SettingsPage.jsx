import React, { useState, useEffect } from 'react';
import { Save, Building2, Globe, Phone, Mail, MapPin } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        website: '',
        gstNumber: '',
        currencySymbol: '₹',
        logoUrl: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsService.get();
            const data = response.data;
            if (data) {
                setFormData({
                    companyName: data.companyName || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    pincode: data.pincode || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    website: data.website || '',
                    gstNumber: data.gstNumber || '',
                    currencySymbol: data.currencySymbol || '₹',
                    logoUrl: data.logoUrl || ''
                });
            }
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await settingsService.update(formData);
            toast.success('Settings saved successfully');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-500">Manage your company profile and system preferences.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Company Information */}
                    <section>
                        <div className="flex items-center space-x-2 mb-6">
                            <Building2 className="text-blue-600" size={24} />
                            <h2 className="text-lg font-semibold text-gray-900">Company Profile</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Company Name *</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">GST / Tax Number</label>
                                <input
                                    type="text"
                                    name="gstNumber"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Logo URL</label>
                                <input
                                    type="text"
                                    name="logoUrl"
                                    placeholder="https://example.com/logo.png"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Currency Symbol</label>
                                <input
                                    type="text"
                                    name="currencySymbol"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.currencySymbol}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Contact Information */}
                    <section>
                        <div className="flex items-center space-x-2 mb-6">
                            <Phone className="text-blue-600" size={24} />
                            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                <input
                                    type="text"
                                    name="phone"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700">Website</label>
                                <input
                                    type="text"
                                    name="website"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.website}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Address Information */}
                    <section>
                        <div className="flex items-center space-x-2 mb-6">
                            <MapPin className="text-blue-600" size={24} />
                            <h2 className="text-lg font-semibold text-gray-900">Address</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700">Street Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.address}
                                    onChange={handleChange}
                                />
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
                                <label className="text-sm font-medium text-gray-700">State / Province</label>
                                <input
                                    type="text"
                                    name="state"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.state}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Zip / Postal Code</label>
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

                    <div className="flex justify-end pt-6 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save size={20} />
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
