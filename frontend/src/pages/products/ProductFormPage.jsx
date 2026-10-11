import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Image as ImageIcon, Star } from 'lucide-react';
import { productService, brandService, categoryService } from '../../services/productService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { PageSection } from '../../components/ui/Page';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ProductFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    const user = useAuthStore((state) => state.user);
    const canManageImages = ['ADMIN', 'MANAGER'].includes(user?.role);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        sku: '', barcode: '', name: '', description: '', categoryId: '', brandId: '',
        mrp: '', sellingPrice: '', purchasePrice: '', hsnCode: '', gstRate: '',
        stockQuantity: 0, reorderLevel: 10, unit: 'Piece', color: '', material: '', size: '',
        specifications: '', isActive: true, isFeatured: false
    });
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [images, setImages] = useState([]);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [isImagePrimary, setIsImagePrimary] = useState(false);
    const [imageDisplayOrder, setImageDisplayOrder] = useState(0);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deletingImageId, setDeletingImageId] = useState(null);

    useEffect(() => {
        fetchInitialData();
        if (isEditMode) fetchProduct();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                brandService.getActive().catch(() => brandService.getAll()),
                categoryService.getActive().catch(() => categoryService.getAll())
            ]);
            setBrands(brandsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) { toast.error('Failed to fetch brands or categories'); }
    };

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await productService.getById(id);
            const data = response.data;
            setFormData({
                sku: data.sku || '', barcode: data.barcode || '', name: data.name || '',
                description: data.description || '', categoryId: data.categoryId || '', brandId: data.brandId || '',
                mrp: data.mrp != null ? data.mrp : '', sellingPrice: data.sellingPrice != null ? data.sellingPrice : '',
                purchasePrice: data.purchasePrice != null ? data.purchasePrice : '', hsnCode: data.hsnCode || '',
                gstRate: data.gstRate != null ? data.gstRate : '', stockQuantity: data.stockQuantity ?? 0,
                reorderLevel: data.reorderLevel ?? 10, unit: data.unit || 'Piece', color: data.color || '',
                material: data.material || '', size: data.size || '', specifications: data.specifications || '',
                isActive: data.isActive ?? true, isFeatured: data.isFeatured ?? false
            });
            setImages(data.images || []);
        } catch (error) {
            toast.error(error.response?.status === 404 ? 'Product not found.' : 'Failed to fetch product');
            navigate('/products');
        } finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const validateForm = () => {
        if (!formData.sku.trim()) { toast.error('SKU is required'); return false; }
        if (!formData.name.trim()) { toast.error('Product name is required'); return false; }
        if (!formData.categoryId) { toast.error('Please select a category'); return false; }
        if (!formData.brandId) { toast.error('Please select a brand'); return false; }
        if (formData.barcode?.length > 100) { toast.error('Barcode too long'); return false; }
        if (formData.hsnCode?.length > 20) { toast.error('HSN code too long'); return false; }
        if (formData.gstRate !== '' && (Number(formData.gstRate) < 0 || Number(formData.gstRate) > 100)) { toast.error('GST must be 0-100%'); return false; }
        if (formData.sellingPrice === '' || isNaN(formData.sellingPrice) || Number(formData.sellingPrice) <= 0) { toast.error('Selling price must be > 0'); return false; }
        if (formData.mrp === '' || isNaN(formData.mrp) || Number(formData.mrp) <= 0) { toast.error('MRP must be > 0'); return false; }
        if (formData.purchasePrice !== '' && (isNaN(formData.purchasePrice) || Number(formData.purchasePrice) < 0)) { toast.error('Purchase price cannot be negative'); return false; }
        if (Number(formData.stockQuantity) < 0) { toast.error('Stock cannot be negative'); return false; }
        if (Number(formData.reorderLevel) < 0) { toast.error('Reorder level cannot be negative'); return false; }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            setSaving(true);
            const payload = {
                ...formData, sku: formData.sku.trim(), name: formData.name.trim(), description: formData.description.trim(),
                mrp: Number(formData.mrp), sellingPrice: Number(formData.sellingPrice),
                purchasePrice: formData.purchasePrice !== '' ? Number(formData.purchasePrice) : null,
                gstRate: formData.gstRate !== '' ? Number(formData.gstRate) : null,
                barcode: formData.barcode.trim() || null, hsnCode: formData.hsnCode.trim() || null,
                stockQuantity: Number(formData.stockQuantity || 0), reorderLevel: Number(formData.reorderLevel || 10)
            };
            if (isEditMode) {
                await productService.update(id, payload);
                toast.success('Product updated');
            } else {
                await productService.create(payload);
                toast.success('Product created');
            }
            navigate('/products');
        } catch (error) {
            if (!error.response) { toast.error('Unable to connect to the server.'); return; }
            const status = error.response.status;
            if (status === 409) toast.error(error.response.data?.message || 'Duplicate SKU or barcode');
            else if (status === 403) toast.error('Permission denied');
            else if (status === 400) toast.error(error.response.data?.message || 'Invalid data');
            else toast.error('Something went wrong');
        } finally { setSaving(false); }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error('Unsupported image format'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
        if (file.size > MAX_IMAGE_SIZE_BYTES) { toast.error('Image exceeds 10MB limit'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
        setSelectedImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    const handleUploadImage = async () => {
        if (!selectedImageFile || !id) return;
        try {
            setUploadingImage(true);
            await productService.uploadImage(id, selectedImageFile, isImagePrimary, Number(imageDisplayOrder || 0));
            toast.success('Image uploaded');
            setSelectedImageFile(null); setImagePreviewUrl(''); setIsImagePrimary(false); setImageDisplayOrder(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            const res = await productService.getImages(id);
            setImages(res.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally { setUploadingImage(false); }
    };

    const handleDeleteImage = async (imageId) => {
        if (!window.confirm('Delete this image?')) return;
        try {
            setDeletingImageId(imageId);
            await productService.deleteImage(id, imageId);
            toast.success('Image deleted');
            const res = await productService.getImages(id);
            setImages(res.data || []);
        } catch (error) {
            toast.error('Failed to delete image');
        } finally { setDeletingImageId(null); }
    };

    if (loading && isEditMode) {
        return <div className="flex justify-center items-center h-96"><p className="text-slate-500 font-semibold">Loading product...</p></div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate('/products')} className="btn-ghost mb-6"><ArrowLeft size={16} /> Back to Catalog</button>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>

            <form onSubmit={handleSubmit}>
                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Product SKU" required>
                            <input type="text" name="sku" required className="input-field" value={formData.sku} onChange={handleChange} />
                        </Field>
                        <Field label="Product Name" required>
                            <input type="text" name="name" required className="input-field" value={formData.name} onChange={handleChange} />
                        </Field>
                        <Field label="Description">
                            <textarea name="description" rows="3" className="input-field" value={formData.description} onChange={handleChange}></textarea>
                        </Field>
                        <Field label="Category" required>
                            <select name="categoryId" required className="input-field" value={formData.categoryId} onChange={handleChange}>
                                <option value="">Select Category</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Brand" required>
                            <select name="brandId" required className="input-field" value={formData.brandId} onChange={handleChange}>
                                <option value="">Select Brand</option>
                                {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                            </select>
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                        <Field label="MRP (₹)" required>
                            <input type="number" name="mrp" step="0.01" min="0.01" required className="input-field" value={formData.mrp} onChange={handleChange} />
                        </Field>
                        <Field label="Selling Price (₹)" required>
                            <input type="number" name="sellingPrice" step="0.01" min="0.01" required className="input-field" value={formData.sellingPrice} onChange={handleChange} />
                        </Field>
                        <Field label="Purchase Price (₹)">
                            <input type="number" name="purchasePrice" step="0.01" min="0" className="input-field" value={formData.purchasePrice} onChange={handleChange} />
                        </Field>
                        <Field label="GST Rate (%)">
                            <input type="number" name="gstRate" step="0.01" min="0" max="100" placeholder="e.g. 18" className="input-field" value={formData.gstRate} onChange={handleChange} />
                        </Field>
                        <Field label="Barcode">
                            <input type="text" name="barcode" maxLength={100} placeholder="Optional unique barcode" className="input-field" value={formData.barcode} onChange={handleChange} />
                        </Field>
                        <Field label="HSN Code">
                            <input type="text" name="hsnCode" maxLength={20} placeholder="e.g. 69101000" className="input-field" value={formData.hsnCode} onChange={handleChange} />
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Stock Quantity">
                            <input type="number" name="stockQuantity" min="0" className="input-field" value={formData.stockQuantity} onChange={handleChange} />
                        </Field>
                        <Field label="Reorder Alert Level">
                            <input type="number" name="reorderLevel" min="0" className="input-field" value={formData.reorderLevel} onChange={handleChange} />
                        </Field>
                        <Field label="Unit of Measure">
                            <input type="text" name="unit" placeholder="e.g. Piece, Set" className="input-field" value={formData.unit} onChange={handleChange} />
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Color">
                            <input type="text" name="color" className="input-field" value={formData.color} onChange={handleChange} />
                        </Field>
                        <Field label="Material">
                            <input type="text" name="material" className="input-field" value={formData.material} onChange={handleChange} />
                        </Field>
                        <Field label="Size / Dimensions">
                            <input type="text" name="size" className="input-field" value={formData.size} onChange={handleChange} />
                        </Field>
                        <Field label="Specifications">
                            <textarea name="specifications" rows="2" className="input-field" value={formData.specifications} onChange={handleChange}></textarea>
                        </Field>
                    </div>
                </PageSection>

                <PageSection>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm" style={{ minHeight: 40 }}>
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: 16, height: 16 }} />
                            Active in Catalog
                        </label>
                        <label className="flex items-center gap-2 text-sm" style={{ minHeight: 40 }}>
                            <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} style={{ width: 16, height: 16 }} />
                            Featured Product
                        </label>
                    </div>
                </PageSection>

                <div className="form-actions">
                    <Button variant="secondary" onClick={() => navigate('/products')}>Cancel</Button>
                    <Button type="submit" loading={saving}>{saving ? 'Saving...' : 'Save Product'}</Button>
                </div>
            </form>

            {isEditMode && canManageImages && (
                <PageSection className="mt-6">
                    <h2 className="section-heading">Product Images ({images.length})</h2>
                    {images.length === 0 ? (
                        <div className="state-panel"><ImageIcon size={32} aria-hidden="true" /><p>No images attached yet.</p></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {images.map(img => (
                                <div key={img.id} className="surface" style={{ padding: 8, position: 'relative' }}>
                                    <div style={{ height: 120, display: 'grid', placeItems: 'center' }}>
                                        <img src={img.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                            onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                    <div className="flex justify-between items-center mt-2 text-xs">
                                        {img.isPrimary ? <span className="status-badge status-info"><Star size={10} /> Primary</span> : <span className="text-muted">Order {img.displayOrder}</span>}
                                        <IconButton label="Delete image" onClick={() => handleDeleteImage(img.id)} disabled={deletingImageId === img.id}><Trash2 size={14} /></IconButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
                        <label className="btn-secondary cursor-pointer" style={{ margin: 0 }}>
                            <Upload size={14} /> {selectedImageFile ? 'Change File' : 'Choose Image'}
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={handleFileSelect} />
                        </label>
                        {selectedImageFile && (
                            <>
                                <span className="text-sm font-semibold truncate" style={{ maxWidth: 150 }}>{selectedImageFile.name}</span>
                                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={isImagePrimary} onChange={(e) => setIsImagePrimary(e.target.checked)} style={{ width: 16, height: 16 }} /> Primary</label>
                                <label className="flex items-center gap-1 text-sm">Order <input type="number" min="0" value={imageDisplayOrder} onChange={(e) => setImageDisplayOrder(e.target.value)} style={{ width: 56, height: 32, padding: '0 8px', border: '1px solid var(--border-strong)', borderRadius: 4 }} /></label>
                                <Button onClick={handleUploadImage} loading={uploadingImage}>Upload</Button>
                            </>
                        )}
                        {imagePreviewUrl && <div style={{ width: 80, height: 80, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}><img src={imagePreviewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
                    </div>
                </PageSection>
            )}
        </div>
    );
};

export default ProductFormPage;