import React, { useState, useEffect } from 'react';
import { brandService } from '../../services/productService';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const BrandFormModal = ({ isOpen, onClose, onSuccess, initialData }) => {
    const isEditMode = !!initialData;
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', logoUrl: '', isActive: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                logoUrl: initialData.logoUrl || '',
                isActive: initialData.isActive !== undefined ? initialData.isActive : true
            });
        } else {
            setFormData({ name: '', description: '', logoUrl: '', isActive: true });
        }
    }, [initialData, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (isEditMode) {
                await brandService.update(initialData.id, formData);
                toast.success('Brand updated successfully');
            } else {
                await brandService.create(formData);
                toast.success('Brand created successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save brand');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose} title={isEditMode ? 'Edit Brand' : 'Add Brand'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <Field label="Brand Name" required>
                        <input type="text" name="name" required className="input-field" value={formData.name} onChange={handleChange} />
                    </Field>
                    <Field label="Description">
                        <textarea name="description" rows="3" className="input-field" value={formData.description} onChange={handleChange}></textarea>
                    </Field>
                    <Field label="Logo URL" help="Enter a URL for the brand logo image.">
                        <input type="text" name="logoUrl" className="input-field" value={formData.logoUrl} onChange={handleChange} placeholder="https://example.com/logo.png" />
                    </Field>
                    <Field label="Active">
                        <label className="flex items-center gap-2" style={{ minHeight: 40 }}>
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 16, height: 16 }} />
                            <span className="text-sm">Active</span>
                        </label>
                    </Field>
                </div>
                <div className="form-actions">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default BrandFormModal;