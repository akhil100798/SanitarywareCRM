import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { PageSection } from '../../components/ui/Page';

const DistributorFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '', contactPerson: '', email: '', phoneNumber: '', alternatePhone: '',
        gstNumber: '', address: '', city: '', state: '', pincode: '',
        bankName: '', bankAccountNumber: '', bankIfsc: '', outstandingBalance: 0,
        isActive: true, notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (isEditMode) fetchDistributor(); }, [id]);

    const fetchDistributor = async () => {
        try { setLoading(true); const response = await distributorService.getDistributorById(id); setFormData(response); }
        catch (error) { toast.error('Failed to load distributor'); navigate('/distributors'); }
        finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (isEditMode) { await distributorService.updateDistributor(id, formData); toast.success('Distributor updated'); }
            else { await distributorService.createDistributor(formData); toast.success('Distributor created'); }
            navigate('/distributors');
        } catch (error) { toast.error(error.response?.data?.message || 'Something went wrong'); }
        finally { setSaving(false); }
    };

    if (loading && isEditMode) return <div className="flex justify-center items-center h-64"><p className="text-slate-500 font-semibold">Loading...</p></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate('/distributors')} className="btn-ghost mb-6"><ArrowLeft size={16} /> Back to List</button>
            <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Distributor' : 'Add Distributor'}</h1>

            <form onSubmit={handleSubmit}>
                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Distributor Name" required><input type="text" name="name" required className="input-field" value={formData.name} onChange={handleChange} /></Field>
                        <Field label="Contact Person"><input type="text" name="contactPerson" className="input-field" value={formData.contactPerson} onChange={handleChange} /></Field>
                        <Field label="Phone Number" required><input type="text" name="phoneNumber" required className="input-field" value={formData.phoneNumber} onChange={handleChange} /></Field>
                        <Field label="Alternate Phone"><input type="text" name="alternatePhone" className="input-field" value={formData.alternatePhone} onChange={handleChange} /></Field>
                        <Field label="Email"><input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} /></Field>
                        <Field label="GST Number"><input type="text" name="gstNumber" className="input-field" value={formData.gstNumber} onChange={handleChange} /></Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Address"><textarea name="address" rows="3" className="input-field" value={formData.address} onChange={handleChange}></textarea></Field>
                        <Field label="City"><input type="text" name="city" className="input-field" value={formData.city} onChange={handleChange} /></Field>
                        <Field label="State"><input type="text" name="state" className="input-field" value={formData.state} onChange={handleChange} /></Field>
                        <Field label="Pincode"><input type="text" name="pincode" className="input-field" value={formData.pincode} onChange={handleChange} /></Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Bank Name"><input type="text" name="bankName" className="input-field" value={formData.bankName} onChange={handleChange} /></Field>
                        <Field label="Account Number"><input type="text" name="bankAccountNumber" className="input-field" value={formData.bankAccountNumber} onChange={handleChange} /></Field>
                        <Field label="IFSC Code"><input type="text" name="bankIfsc" className="input-field" value={formData.bankIfsc} onChange={handleChange} /></Field>
                        {!isEditMode && (
                            <Field label="Opening Balance (₹)" help="Amount currently owed to this distributor">
                                <input type="number" step="0.01" name="outstandingBalance" className="input-field" value={formData.outstandingBalance} onChange={handleChange} />
                            </Field>
                        )}
                    </div>
                </PageSection>

                <PageSection>
                    <div className="space-y-4">
                        <Field label="Active">
                            <label className="flex items-center gap-2 text-sm" style={{ minHeight: 40 }}>
                                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 16, height: 16 }} />
                                Active Account
                            </label>
                        </Field>
                        <Field label="Notes"><textarea name="notes" rows="3" className="input-field" value={formData.notes} onChange={handleChange}></textarea></Field>
                    </div>
                </PageSection>

                <div className="form-actions">
                    <Button variant="secondary" onClick={() => navigate('/distributors')}>Cancel</Button>
                    <Button type="submit" loading={saving}>{saving ? 'Saving...' : 'Save Distributor'}</Button>
                </div>
            </form>
        </div>
    );
};

export default DistributorFormPage;