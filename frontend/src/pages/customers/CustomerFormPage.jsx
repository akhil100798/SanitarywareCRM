import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import customerService from '../../services/customerService';
import toast from 'react-hot-toast';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { PageSection } from '../../components/ui/Page';

const emptyForm = {
    name: '', email: '', phoneNumber: '', alternatePhone: '', company: '',
    gstNumber: '', customerType: 'RETAIL', billingAddress: '', shippingAddress: '',
    city: '', state: '', pincode: '', notes: '', isActive: true,
};

const CustomerFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [emailError, setEmailError] = useState('');
    const requestGeneration = useRef(0);

    useEffect(() => {
        if (isEditMode) fetchCustomer();
        return () => { requestGeneration.current += 1; };
    }, [id]);

    const fetchCustomer = async () => {
        const generation = ++requestGeneration.current;
        try {
            setLoading(true);
            const response = await customerService.getById(id);
            if (generation === requestGeneration.current) setFormData(response.data);
        } catch (error) {
            if (generation === requestGeneration.current) {
                toast.error('Failed to fetch customer details');
                navigate('/customers');
            }
        } finally {
            if (generation === requestGeneration.current) setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (name === 'email') {
            if (value && !value.includes('@')) setEmailError('Invalid email format');
            else setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
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
            setSaving(false);
        }
    };

    if (loading && isEditMode) {
        return <div className="flex flex-col justify-center items-center h-96"><p className="text-slate-500 font-semibold">Loading customer...</p></div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate('/customers')} className="btn-ghost mb-6">
                <ArrowLeft size={16} /> Back to Directory
            </button>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edit Customer' : 'Add Customer'}</h1>

            <form onSubmit={handleSubmit}>
                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Full Name" required>
                            <input type="text" name="name" required className="input-field" value={formData.name} onChange={handleChange} />
                        </Field>
                        <Field label="Customer Type">
                            <select name="customerType" className="input-field" value={formData.customerType} onChange={handleChange}>
                                <option value="RETAIL">Retail</option>
                                <option value="WHOLESALE">Wholesale</option>
                                <option value="CONTRACTOR">Contractor</option>
                                <option value="BUILDER">Builder</option>
                            </select>
                        </Field>
                        <Field label="Email Address" error={emailError}>
                            <input type="text" name="email" className="input-field" value={formData.email} onChange={handleChange} />
                        </Field>
                        <Field label="Phone Number" required>
                            <input type="text" name="phoneNumber" required className="input-field" value={formData.phoneNumber} onChange={handleChange} />
                        </Field>
                        <Field label="Alternate Phone">
                            <input type="text" name="alternatePhone" className="input-field" value={formData.alternatePhone} onChange={handleChange} />
                        </Field>
                        <Field label="Company Name">
                            <input type="text" name="company" className="input-field" value={formData.company} onChange={handleChange} />
                        </Field>
                        <Field label="GST Number">
                            <input type="text" name="gstNumber" className="input-field" value={formData.gstNumber} onChange={handleChange} />
                        </Field>
                        <Field label="Active Account">
                            <label className="flex items-center gap-2 text-sm" style={{ minHeight: 40 }}>
                                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 16, height: 16 }} />
                                <span>Active</span>
                            </label>
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Billing Address">
                            <textarea name="billingAddress" rows="2" className="input-field" value={formData.billingAddress} onChange={handleChange}></textarea>
                        </Field>
                        <Field label="Shipping Address">
                            <textarea name="shippingAddress" rows="2" className="input-field" value={formData.shippingAddress} onChange={handleChange}></textarea>
                        </Field>
                        <Field label="City">
                            <input type="text" name="city" className="input-field" value={formData.city} onChange={handleChange} />
                        </Field>
                        <Field label="State">
                            <input type="text" name="state" className="input-field" value={formData.state} onChange={handleChange} />
                        </Field>
                        <Field label="Pincode">
                            <input type="text" name="pincode" className="input-field" value={formData.pincode} onChange={handleChange} />
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <Field label="Notes">
                        <textarea name="notes" rows="3" className="input-field" value={formData.notes} onChange={handleChange}></textarea>
                    </Field>
                </PageSection>

                <div className="form-actions">
                    <Button variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
                    <Button type="submit" loading={saving}>{saving ? 'Saving...' : 'Save Customer'}</Button>
                </div>
            </form>
        </div>
    );
};

export default CustomerFormPage;
