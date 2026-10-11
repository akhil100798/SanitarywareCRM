import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, MapPin } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { PageSection } from '../../components/ui/Page';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const SettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '', address: '', city: '', state: '', pincode: '',
        phone: '', email: '', website: '', gstNumber: '', currencySymbol: '₹', logoUrl: ''
    });

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsService.get();
            const data = response.data;
            if (data) setFormData({
                companyName: data.companyName || '', address: data.address || '', city: data.city || '',
                state: data.state || '', pincode: data.pincode || '', phone: data.phone || '',
                email: data.email || '', website: data.website || '', gstNumber: data.gstNumber || '',
                currencySymbol: data.currencySymbol || '₹', logoUrl: data.logoUrl || ''
            });
        } catch (error) { toast.error('Failed to load settings'); }
        finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try { setSaving(true); await settingsService.update(formData); toast.success('Settings saved'); }
        catch (error) { toast.error('Failed to save settings'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center items-center h-96"><p className="text-slate-500 font-semibold">Loading settings...</p></div>;

    return (
        <div>
            <PageHeader title="System Settings" description="Manage company profile, contact details and address." />
            <form onSubmit={handleSubmit} className="space-y-6">
                <PageSection>
                    <div className="flex items-center gap-2 mb-4"><Building2 size={18} /> <h2 className="section-heading" style={{ margin: 0 }}>Company Profile</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Company Name" required><input type="text" name="companyName" required className="input-field" value={formData.companyName} onChange={handleChange} /></Field>
                        <Field label="GST / Tax Number"><input type="text" name="gstNumber" className="input-field" value={formData.gstNumber} onChange={handleChange} /></Field>
                        <Field label="Logo URL"><input type="text" name="logoUrl" className="input-field" value={formData.logoUrl} onChange={handleChange} /></Field>
                        <Field label="Currency Symbol"><input type="text" name="currencySymbol" className="input-field" value={formData.currencySymbol} onChange={handleChange} /></Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="flex items-center gap-2 mb-4"><Phone size={18} /> <h2 className="section-heading" style={{ margin: 0 }}>Contact & Website</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Email"><input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} /></Field>
                        <Field label="Phone"><input type="text" name="phone" className="input-field" value={formData.phone} onChange={handleChange} /></Field>
                        <Field label="Website"><input type="text" name="website" className="input-field" value={formData.website} onChange={handleChange} /></Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="flex items-center gap-2 mb-4"><MapPin size={18} /> <h2 className="section-heading" style={{ margin: 0 }}>Address</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Street Address"><input type="text" name="address" className="input-field" value={formData.address} onChange={handleChange} /></Field>
                        <Field label="City"><input type="text" name="city" className="input-field" value={formData.city} onChange={handleChange} /></Field>
                        <Field label="State"><input type="text" name="state" className="input-field" value={formData.state} onChange={handleChange} /></Field>
                        <Field label="Pincode"><input type="text" name="pincode" className="input-field" value={formData.pincode} onChange={handleChange} /></Field>
                    </div>
                </PageSection>

                <div className="form-actions"><Button type="submit" loading={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}</Button></div>
            </form>
        </div>
    );
};

export default SettingsPage;