import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Trash2, Image as ImageIcon, Star } from 'lucide-react';
import { productService, brandService, categoryService } from '../../services/productService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ProductFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    const user = useAuthStore((state) => state.user);
    const canManageImages = ['ADMIN', 'MANAGER'].includes(user?.role);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        categoryId: '',
        brandId: '',
        mrp: '',
        sellingPrice: '',
        purchasePrice: '',
        hsnCode: '',
        gstRate: '',
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
    const [saving, setSaving] = useState(false);

    // Image state for edit mode
    const [images, setImages] = useState([]);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [isImagePrimary, setIsImagePrimary] = useState(false);
    const [imageDisplayOrder, setImageDisplayOrder] = useState(0);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deletingImageId, setDeletingImageId] = useState(null);

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) {
            fetchProduct();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                brandService.getActive().catch(() => brandService.getAll()),
                categoryService.getActive().catch(() => categoryService.getAll())
            ]);
            setBrands(brandsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            toast.error('Failed to fetch brands or categories');
        }
    };

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await productService.getById(id);
            const data = response.data;
            setFormData({
                sku: data.sku || '',
                barcode: data.barcode || '',
                name: data.name || '',
                description: data.description || '',
                categoryId: data.categoryId || '',
                brandId: data.brandId || '',
                mrp: data.mrp !== undefined && data.mrp !== null ? data.mrp : '',
                sellingPrice: data.sellingPrice !== undefined && data.sellingPrice !== null ? data.sellingPrice : '',
                purchasePrice: data.purchasePrice !== undefined && data.purchasePrice !== null ? data.purchasePrice : '',
                hsnCode: data.hsnCode || '',
                gstRate: data.gstRate !== undefined && data.gstRate !== null ? data.gstRate : '',
                stockQuantity: data.stockQuantity !== undefined ? data.stockQuantity : 0,
                reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : 10,
                unit: data.unit || 'Piece',
                color: data.color || '',
                material: data.material || '',
                size: data.size || '',
                specifications: data.specifications || '',
                isActive: data.isActive !== undefined ? data.isActive : true,
                isFeatured: data.isFeatured !== undefined ? data.isFeatured : false
            });
            if (data.images) {
                setImages(data.images);
            } else {
                fetchImages(id);
            }
        } catch (error) {
            const msg = error.response?.status === 404
                ? 'Product could not be found.'
                : 'Failed to fetch product details';
            toast.error(msg);
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    const fetchImages = async (productId) => {
        try {
            const response = await productService.getImages(productId);
            setImages(response.data || []);
        } catch (error) {
            console.error('Failed to fetch images', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = () => {
        if (!formData.sku.trim()) {
            toast.error('Product SKU is required');
            return false;
        }
        if (!formData.name.trim()) {
            toast.error('Product Name is required');
            return false;
        }
        if (!formData.categoryId) {
            toast.error('Please select a Category');
            return false;
        }
        if (!formData.brandId) {
            toast.error('Please select a Brand');
            return false;
        }
        if (formData.barcode && formData.barcode.length > 100) {
            toast.error('Barcode cannot exceed 100 characters');
            return false;
        }
        if (formData.hsnCode && formData.hsnCode.length > 20) {
            toast.error('HSN code cannot exceed 20 characters');
            return false;
        }
        if (formData.gstRate !== '' && (Number(formData.gstRate) < 0 || Number(formData.gstRate) > 100)) {
            toast.error('GST rate must be between 0% and 100%');
            return false;
        }
        if (formData.sellingPrice === '' || isNaN(formData.sellingPrice) || Number(formData.sellingPrice) <= 0) {
            toast.error('Selling price must be greater than 0');
            return false;
        }
        if (formData.mrp === '' || isNaN(formData.mrp) || Number(formData.mrp) <= 0) {
            toast.error('MRP must be greater than 0');
            return false;
        }
        if (formData.purchasePrice !== '' && (isNaN(formData.purchasePrice) || Number(formData.purchasePrice) < 0)) {
            toast.error('Purchase price cannot be negative');
            return false;
        }
        if (Number(formData.stockQuantity) < 0) {
            toast.error('Stock quantity cannot be negative');
            return false;
        }
        if (Number(formData.reorderLevel) < 0) {
            toast.error('Reorder level cannot be negative');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSaving(true);
            const payload = {
                ...formData,
                sku: formData.sku.trim(),
                name: formData.name.trim(),
                description: formData.description.trim(),
                mrp: Number(formData.mrp),
                sellingPrice: Number(formData.sellingPrice),
                purchasePrice: formData.purchasePrice !== '' ? Number(formData.purchasePrice) : null,
                gstRate: formData.gstRate !== '' ? Number(formData.gstRate) : null,
                barcode: formData.barcode.trim() || null,
                hsnCode: formData.hsnCode.trim() || null,
                stockQuantity: Number(formData.stockQuantity || 0),
                reorderLevel: Number(formData.reorderLevel || 10)
            };

            if (isEditMode) {
                await productService.update(id, payload);
                toast.success('Product updated successfully');
            } else {
                await productService.create(payload);
                toast.success('Product created successfully');
            }
            navigate('/products');
        } catch (error) {
            if (!error.response) {
                toast.error('Unable to connect to the server. Please try again.');
                return;
            }

            const status = error.response.status;
            if (status === 409) {
                const msg = error.response.data?.message || '';
                if (msg.toLowerCase().includes('barcode')) {
                    toast.error('Barcode already exists. Please use a unique barcode.');
                } else if (msg.toLowerCase().includes('sku')) {
                    toast.error('Product SKU already exists. Please use a unique SKU.');
                } else {
                    toast.error(msg || 'Conflict: duplicate unique field detected.');
                }
            } else if (status === 403) {
                toast.error('You do not have permission to perform this action.');
            } else if (status === 400) {
                const validationMap = error.response.data?.validationErrors;
                if (validationMap && typeof validationMap === 'object') {
                    toast.error(`Validation failed: ${Object.values(validationMap).join(', ')}`);
                } else {
                    toast.error(error.response.data?.message || 'Invalid product data submitted.');
                }
            } else {
                toast.error(error.response.data?.message || 'Something went wrong while saving product.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Image Upload Handlers
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            toast.error('Unsupported image format. Please select a JPEG, PNG, WEBP, GIF, or SVG image.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            toast.error('Image size exceeds 10MB limit. Please choose a smaller file.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleUploadImage = async () => {
        if (!selectedImageFile || !id) return;
        try {
            setUploadingImage(true);
            await productService.uploadImage(id, selectedImageFile, isImagePrimary, Number(imageDisplayOrder || 0));
            toast.success('Image uploaded successfully');
            setSelectedImageFile(null);
            setImagePreviewUrl('');
            setIsImagePrimary(false);
            setImageDisplayOrder(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchImages(id);
        } catch (error) {
            const status = error.response?.status;
            if (status === 403) {
                toast.error('You do not have permission to perform this action.');
            } else if (status === 413) {
                toast.error('Image file is too large for server upload.');
            } else {
                toast.error(error.response?.data?.message || 'Failed to upload image');
            }
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteImage = async (imageId) => {
        if (!window.confirm('Are you sure you want to delete this product image?')) return;
        try {
            setDeletingImageId(imageId);
            await productService.deleteImage(id, imageId);
            toast.success('Image deleted successfully');
            fetchImages(id);
        } catch (error) {
            const status = error.response?.status;
            if (status === 403) {
                toast.error('You do not have permission to perform this action.');
            } else {
                toast.error(error.response?.data?.message || 'Failed to delete image');
            }
        } finally {
            setDeletingImageId(null);
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
                    type="button"
                    onClick={() => navigate('/products')}
                    className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
                    aria-label="Back to Product Catalog"
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
                    <p className="text-xs text-slate-500 mt-1">Configure stock thresholds, branding, categories, tax compliance, and product images.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label htmlFor="sku" className="text-xs font-semibold text-slate-500">Product SKU *</label>
                                <input
                                    id="sku"
                                    type="text"
                                    name="sku"
                                    required
                                    className="input-field text-sm font-mono"
                                    value={formData.sku}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="text-xs font-semibold text-slate-500">Product Name *</label>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    required
                                    className="input-field text-sm"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label htmlFor="description" className="text-xs font-semibold text-slate-500">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows="3"
                                    className="input-field text-sm resize-none"
                                    value={formData.description}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="categoryId" className="text-xs font-semibold text-slate-500">Category *</label>
                                <select
                                    id="categoryId"
                                    name="categoryId"
                                    required
                                    className="input-field text-sm"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="brandId" className="text-xs font-semibold text-slate-500">Brand *</label>
                                <select
                                    id="brandId"
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

                    {/* Pricing & Tax Compliance */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pricing & Tax Compliance</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                            <div className="space-y-1.5">
                                <label htmlFor="mrp" className="text-xs font-semibold text-slate-500">MRP (₹) *</label>
                                <input
                                    id="mrp"
                                    type="number"
                                    name="mrp"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    className="input-field text-sm"
                                    value={formData.mrp}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="sellingPrice" className="text-xs font-semibold text-slate-500">Selling Price (₹) *</label>
                                <input
                                    id="sellingPrice"
                                    type="number"
                                    name="sellingPrice"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    className="input-field text-sm"
                                    value={formData.sellingPrice}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="purchasePrice" className="text-xs font-semibold text-slate-500">Purchase Price (₹)</label>
                                <input
                                    id="purchasePrice"
                                    type="number"
                                    name="purchasePrice"
                                    step="0.01"
                                    min="0"
                                    className="input-field text-sm"
                                    value={formData.purchasePrice}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="gstRate" className="text-xs font-semibold text-slate-500">GST Rate (%)</label>
                                <input
                                    id="gstRate"
                                    type="number"
                                    name="gstRate"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder="e.g. 18.00"
                                    className="input-field text-sm"
                                    value={formData.gstRate}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Barcode and HSN */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                            <div className="space-y-1.5">
                                <label htmlFor="barcode" className="text-xs font-semibold text-slate-500">Barcode (UPC / EAN)</label>
                                <input
                                    id="barcode"
                                    type="text"
                                    name="barcode"
                                    maxLength={100}
                                    placeholder="Optional unique barcode"
                                    className="input-field text-sm font-mono"
                                    value={formData.barcode}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="hsnCode" className="text-xs font-semibold text-slate-500">HSN Code</label>
                                <input
                                    id="hsnCode"
                                    type="text"
                                    name="hsnCode"
                                    maxLength={20}
                                    placeholder="e.g. 69101000"
                                    className="input-field text-sm font-mono"
                                    value={formData.hsnCode}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Inventory */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Tracking</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <label htmlFor="stockQuantity" className="text-xs font-semibold text-slate-500">Stock Quantity</label>
                                <input
                                    id="stockQuantity"
                                    type="number"
                                    name="stockQuantity"
                                    min="0"
                                    className="input-field text-sm"
                                    value={formData.stockQuantity}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="reorderLevel" className="text-xs font-semibold text-slate-500">Reorder Alert Level</label>
                                <input
                                    id="reorderLevel"
                                    type="number"
                                    name="reorderLevel"
                                    min="0"
                                    className="input-field text-sm"
                                    value={formData.reorderLevel}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="unit" className="text-xs font-semibold text-slate-500">Unit of Measure</label>
                                <input
                                    id="unit"
                                    type="text"
                                    name="unit"
                                    placeholder="e.g. Piece, Set, Meter"
                                    className="input-field text-sm"
                                    value={formData.unit}
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
                                <label htmlFor="color" className="text-xs font-semibold text-slate-500">Color</label>
                                <input
                                    id="color"
                                    type="text"
                                    name="color"
                                    className="input-field text-sm"
                                    value={formData.color}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="material" className="text-xs font-semibold text-slate-500">Material</label>
                                <input
                                    id="material"
                                    type="text"
                                    name="material"
                                    className="input-field text-sm"
                                    value={formData.material}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="size" className="text-xs font-semibold text-slate-500">Size / Dimensions</label>
                                <input
                                    id="size"
                                    type="text"
                                    name="size"
                                    className="input-field text-sm"
                                    value={formData.size}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="md:col-span-3 space-y-1.5">
                                <label htmlFor="specifications" className="text-xs font-semibold text-slate-500">Technical Specifications</label>
                                <textarea
                                    id="specifications"
                                    name="specifications"
                                    rows="2"
                                    className="input-field text-sm resize-none"
                                    value={formData.specifications}
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                        </div>
                    </section>

                    {/* Flags */}
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
                            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">Active in Catalog</label>
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
                            <label htmlFor="isFeatured" className="text-xs font-semibold text-slate-700">Featured Product</label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
                            className="btn-secondary text-sm px-6"
                            aria-label="Cancel editing"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary text-sm px-8 disabled:opacity-50"
                            aria-label="Save Product"
                        >
                            <Save size={16} />
                            <span>{saving ? 'Saving...' : 'Save Product'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Product Image Gallery Management Section (Edit Mode) */}
            {isEditMode && canManageImages && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Product Images Gallery</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Upload photos, set primary visual, and organize catalog gallery.</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{images.length} uploaded</span>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Gallery Grid */}
                        {images.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                                <ImageIcon size={36} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-xs font-medium text-slate-500">No images attached to this product yet.</p>
                                <p className="text-xxs text-slate-400 mt-0.5">Select an image file below to upload.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {images.map((img) => (
                                    <div
                                        key={img.id}
                                        className={`group relative rounded-2xl border bg-slate-50 overflow-hidden transition-all ${
                                            img.isPrimary ? 'border-teal ring-2 ring-teal/20' : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="w-full h-36 flex items-center justify-center p-2 bg-white">
                                            <img
                                                src={img.imageUrl}
                                                alt="Product thumbnail"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.target.src = '';
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                                            {img.isPrimary ? (
                                                <span className="inline-flex items-center gap-1 text-teal font-bold text-xxs uppercase tracking-wider bg-teal/10 px-2 py-0.5 rounded-md">
                                                    <Star size={10} fill="currentColor" /> Primary
                                                </span>
                                            ) : (
                                                <span className="text-xxs text-slate-400">Order: {img.displayOrder}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteImage(img.id)}
                                                disabled={deletingImageId === img.id}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                                                title="Delete image"
                                                aria-label={`Delete image with order ${img.displayOrder}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Form */}
                        <div className="border-t border-slate-100 pt-5 space-y-4">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload New Image</h4>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <label className="btn-secondary text-xs cursor-pointer">
                                    <Upload size={14} />
                                    <span>{selectedImageFile ? 'Change File' : 'Choose Image File'}</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        aria-label="Select product image file to upload"
                                    />
                                </label>
                                {selectedImageFile && (
                                    <div className="flex flex-wrap items-center gap-4 text-xs">
                                        <span className="font-semibold text-slate-700 truncate max-w-xs">{selectedImageFile.name}</span>
                                        <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isImagePrimary}
                                                onChange={(e) => setIsImagePrimary(e.target.checked)}
                                                className="w-4 h-4 text-teal rounded focus:ring-teal"
                                                aria-label="Set as primary product image"
                                            />
                                            <span>Set as Primary</span>
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-500">Order:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={imageDisplayOrder}
                                                onChange={(e) => setImageDisplayOrder(e.target.value)}
                                                className="w-16 input-field py-1 text-xs"
                                                aria-label="Image display order"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUploadImage}
                                            disabled={uploadingImage}
                                            className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                                            aria-label="Confirm image upload"
                                        >
                                            {uploadingImage ? 'Uploading...' : 'Confirm Upload'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {imagePreviewUrl && (
                                <div className="w-24 h-24 rounded-xl border border-slate-200 p-1 bg-white overflow-hidden mt-2">
                                    <img src={imagePreviewUrl} alt="Upload preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductFormPage;
