import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
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
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-semibold text-sm">Assembling product configuration...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center">
                <button
                    onClick={() => navigate('/products')}
                    className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
                >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Catalog
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {isEditMode ? 'Edit Catalog Item' : 'Add New Product'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Configure stock thresholds, branding, categories, and technical variables.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Product SKU *</label>
                                <input
                                    type="text"
                                    name="sku"
                                    required
                                    className="input-field text-sm"
                                    value={formData.sku}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Product Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="input-field text-sm"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Description</label>
                                <textarea
                                    name="description"
                                    rows="3"
                                    className="input-field text-sm resize-none"
                                    value={formData.description}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Category *</label>
                                <select
                                    name="categoryId"
                                    required
                                    className="input-field text-sm"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Brand *</label>
                                <select
                                    name="brandId"
                                    required
                                    className="input-field text-sm"
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
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing & Inventory</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">MRP *</label>
                                <input
                                    type="number"
                                    name="mrp"
                                    required
                                    className="input-field text-sm"
                                    value={formData.mrp}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Selling Price *</label>
                                <input
                                    type="number"
                                    name="sellingPrice"
                                    required
                                    className="input-field text-sm"
                                    value={formData.sellingPrice}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Unit</label>
                                <input
                                    type="text"
                                    name="unit"
                                    className="input-field text-sm"
                                    value={formData.unit}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Stock Quantity</label>
                                <input
                                    type="number"
                                    name="stockQuantity"
                                    className="input-field text-sm"
                                    value={formData.stockQuantity}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Reorder Level</label>
                                <input
                                    type="number"
                                    name="reorderLevel"
                                    className="input-field text-sm"
                                    value={formData.reorderLevel}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Attributes */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Attributes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Color</label>
                                <input
                                    type="text"
                                    name="color"
                                    className="input-field text-sm"
                                    value={formData.color}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Material</label>
                                <input
                                    type="text"
                                    name="material"
                                    className="input-field text-sm"
                                    value={formData.material}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">Size</label>
                                <input
                                    type="text"
                                    name="size"
                                    className="input-field text-sm"
                                    value={formData.size}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="flex items-center space-x-6 border-t border-slate-50 pt-6">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                name="isActive"
                                className="w-4 h-4 text-teal border-slate-300 rounded focus:ring-teal"
                                checked={formData.isActive}
                                onChange={handleChange}
                            />
                            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">Active</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isFeatured"
                                name="isFeatured"
                                className="w-4 h-4 text-teal border-slate-300 rounded focus:ring-teal"
                                checked={formData.isFeatured}
                                onChange={handleChange}
                            />
                            <label htmlFor="isFeatured" className="text-xs font-semibold text-slate-700">Featured</label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
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
                            <span>{loading ? 'Saving...' : 'Save Product'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFormPage;
