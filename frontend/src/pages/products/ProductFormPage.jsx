import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { productService, brandService, categoryService } from '../../services/productService';
import toast from 'react-hot-toast';

const ProductFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        categoryId: '',
        brandId: '',
        mrp: '',
        sellingPrice: '',
        stockQuantity: 0,
        reorderLevel: 10,
        unit: 'Piece',
        color: '',
        material: '',
        size: '',
        specifications: '',
        isActive: true,
        isFeatured: false
    });

    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) {
            fetchProduct();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                brandService.getActive(),
                categoryService.getActive()
            ]);
            setBrands(brandsRes.data);
            setCategories(categoriesRes.data);
        } catch (error) {
            toast.error('Failed to fetch brands or categories');
        }
    };

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await productService.getById(id);
            setFormData(response.data);
        } catch (error) {
            toast.error('Failed to fetch product details');
            navigate('/products');
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
                await productService.update(id, formData);
                toast.success('Product updated successfully');
            } else {
                await productService.create(formData);
                toast.success('Product created successfully');
            }
            navigate('/products');
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
                    onClick={() => navigate('/products')}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to List
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <p className="text-sm text-gray-500">Fill in the product specifications and inventory details.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Info */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Product SKU *</label>
                                <input
                                    type="text"
                                    name="sku"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.sku}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Product Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    name="description"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={formData.description}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Category *</label>
                                <select
                                    name="categoryId"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Brand *</label>
                                <select
                                    name="brandId"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.brandId}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Brand</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Pricing & Inventory */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pricing & Inventory</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">MRP *</label>
                                <input
                                    type="number"
                                    name="mrp"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.mrp}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Selling Price *</label>
                                <input
                                    type="number"
                                    name="sellingPrice"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.sellingPrice}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Unit</label>
                                <input
                                    type="text"
                                    name="unit"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.unit}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                                <input
                                    type="number"
                                    name="stockQuantity"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.stockQuantity}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Reorder Level</label>
                                <input
                                    type="number"
                                    name="reorderLevel"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.reorderLevel}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Attributes */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Product Attributes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Color</label>
                                <input
                                    type="text"
                                    name="color"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.color}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Material</label>
                                <input
                                    type="text"
                                    name="material"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.material}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Size</label>
                                <input
                                    type="text"
                                    name="size"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.size}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                name="isActive"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={formData.isActive}
                                onChange={handleChange}
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isFeatured"
                                name="isFeatured"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={formData.isFeatured}
                                onChange={handleChange}
                            />
                            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">Featured</label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
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
                            <span>{loading ? 'Saving...' : 'Save Product'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFormPage;
