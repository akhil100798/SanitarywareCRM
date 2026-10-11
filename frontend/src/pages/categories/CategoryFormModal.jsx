import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/productService';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

const CategoryFormModal = ({ isOpen, onClose, onSuccess, initialData, categories }) => {
    const isEditMode = !!initialData;
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', parentId: '', isActive: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                parentId: initialData.parentId || '',
                isActive: initialData.isActive !== undefined ? initialData.isActive : true
            });
        } else {
            setFormData({ name: '', description: '', parentId: '', isActive: true });
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
            const payload = { ...formData, parentId: formData.parentId ? Number(formData.parentId) : null };
            if (isEditMode) {
                await categoryService.update(initialData.id, payload);
                toast.success('Category updated successfully');
            } else {
                await categoryService.create(payload);
                toast.success('Category created successfully');
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const availableParents = categories.filter(c => !isEditMode || c.id !== initialData.id);

    return (
        <Modal open={isOpen} onClose={onClose} title={isEditMode ? 'Edit Category' : 'Add Category'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <Field label="Category Name" required>
                        <input type="text" name="name" required className="input-field" value={formData.name} onChange={handleChange} />
                    </Field>
                    <Field label="Parent Category">
                        <select name="parentId" className="input-field" value={formData.parentId} onChange={handleChange}>
                            <option value="">None (Root Category)</option>
                            {availableParents.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Description">
                        <textarea name="description" rows="3" className="input-field" value={formData.description} onChange={handleChange}></textarea>
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

export default CategoryFormModal;