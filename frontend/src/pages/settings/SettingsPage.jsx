import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, MapPin } from 'lucide-react';
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
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold text-sm">Assembling configurations...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
                <p className="text-slate-500 text-sm">Manage invoice template details, GST parameters, and metadata preferences.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Company Information */}
                    <section className="space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                            <Building2 className="text-teal" size={20} />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Company Profile</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Company Name *</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    required
                                    className="input-field text-sm"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">GST / Tax Number</label>
                                <input
                                    type="text"
                                    name="gstNumber"
                                    className="input-field text-sm"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Logo Image Link URL</label>
                                <input
                                    type="text"
                                    name="logoUrl"
                                    placeholder="https://example.com/logo.png"
                                    className="input-field text-sm"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Currency Symbol</label>
                                <input
                                    type="text"
                                    name="currencySymbol"
                                    className="input-field text-sm font-medium"
                                    value={formData.currencySymbol}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Contact Information */}
                    <section className="space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                            <Phone className="text-teal" size={20} />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contact & Website</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                <label className="text-xs font-semibold text-slate-500">Phone Number</label>
                                <input
                                    type="text"
                                    name="phone"
                                    className="input-field text-sm"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-500">Website URL</label>
                                <input
                                    type="text"
                                    name="website"
                                    className="input-field text-sm"
                                    value={formData.website}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Address Information */}
                    <section className="space-y-4">
                        <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                            <MapPin className="text-teal" size={20} />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Address Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-semibold text-slate-500">Street Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    className="input-field text-sm"
                                    value={formData.address}
                                    onChange={handleChange}
                                />
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
                                <label className="text-xs font-semibold text-slate-500">State / Province</label>
                                <input
                                    type="text"
                                    name="state"
                                    className="input-field text-sm"
                                    value={formData.state}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Zip / Postal Code</label>
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

                    <div className="flex justify-end pt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary text-sm px-8"
                        >
                            <Save size={16} />
                            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
