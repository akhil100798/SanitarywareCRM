import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { categoryService } from '../../services/productService';
import toast from 'react-hot-toast';

const CategoryFormModal = ({ isOpen, onClose, onSuccess, initialData, categories }) => {
    const isEditMode = !!initialData;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: '',
        isActive: true
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
            setFormData({
                name: '',
                description: '',
                parentId: '',
                isActive: true
            });
        }
    }, [initialData, isOpen]);

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
            const payload = {
                ...formData,
                parentId: formData.parentId ? Number(formData.parentId) : null
            };
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
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter out the current category from the parent selection list to avoid self-referencing cycles
    const availableParents = categories.filter(c => !isEditMode || c.id !== initialData.id);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {isEditMode ? 'Edit Category' : 'Add New Category'}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                                <select
                                    name="parentId"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={formData.parentId}
                                    onChange={handleChange}
                                >
                                    <option value="">None (Root Category)</option>
                                    {availableParents.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={formData.description}
                                    onChange={handleChange}
                                ></textarea>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                />
                                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 font-medium">
                                    Active
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                >
                                    <Save size={16} className="mr-2" />
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryFormModal;
