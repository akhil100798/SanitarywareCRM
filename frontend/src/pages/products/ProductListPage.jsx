import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Tag, Layers, AlertCircle, FileUp, RotateCcw, Eye, Search, Barcode, Hash, ChevronLeft, ChevronRight, Trash2 as TrashIcon, Edit } from 'lucide-react';
import { productService, brandService, categoryService } from '../../services/productService';
import toast from 'react-hot-toast';
import BulkUploadModal from './BulkUploadModal';
import ProductDetailModal from './ProductDetailModal';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const ProductListPage = () => {
    const user = useAuthStore((state) => state.user);
    const canManageProducts = ['ADMIN', 'MANAGER'].includes(user?.role);
    const confirm = useConfirm();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brokenImageIds, setBrokenImageIds] = useState({});

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [stockFilter, setStockFilter] = useState('ALL');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [barcodeFilter, setBarcodeFilter] = useState('');
    const [hsnFilter, setHsnFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const latestRequestId = useRef(0);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => { fetchMetadata(); }, []);

    const fetchMetadata = async () => {
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                brandService.getActive().catch(() => brandService.getAll()),
                categoryService.getActive().catch(() => categoryService.getAll())
            ]);
            setBrands(brandsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error('Failed to load filter metadata', error);
        }
    };

    const validatePriceRange = (min, max) => {
        const numMin = min !== '' ? Number(min) : null;
        const numMax = max !== '' ? Number(max) : null;
        if (numMin !== null && (isNaN(numMin) || numMin < 0)) { toast.error('Minimum price must be a non-negative number'); return false; }
        if (numMax !== null && (isNaN(numMax) || numMax < 0)) { toast.error('Maximum price must be a non-negative number'); return false; }
        if (numMin !== null && numMax !== null && numMin > numMax) { toast.error('Minimum price cannot be greater than maximum price'); return false; }
        return true;
    };

    const fetchProducts = useCallback(async (pageToFetch = currentPage, queryOverride) => {
        if (!validatePriceRange(minPrice, maxPrice)) return;
        const requestId = ++latestRequestId.current;
        try {
            setLoading(true);
            setError(null);
            const params = { page: pageToFetch, size: pageSize };
            const effectiveQuery = queryOverride !== undefined ? queryOverride : searchQuery;
            if (effectiveQuery && effectiveQuery.trim()) params.query = effectiveQuery.trim();
            if (selectedCategory) params.categoryId = selectedCategory;
            if (selectedBrand) params.brandId = selectedBrand;
            if (minPrice !== '' && !isNaN(minPrice)) params.minPrice = Number(minPrice);
            if (maxPrice !== '' && !isNaN(maxPrice)) params.maxPrice = Number(maxPrice);
            if (stockFilter === 'IN_STOCK') params.inStock = true;
            else if (stockFilter === 'OUT_OF_STOCK') params.inStock = false;
            else if (stockFilter === 'LOW_STOCK') params.lowStock = true;
            if (activeFilter === 'ACTIVE') params.isActive = true;
            else if (activeFilter === 'INACTIVE') params.isActive = false;
            if (barcodeFilter.trim()) params.barcode = barcodeFilter.trim();
            if (hsnFilter.trim()) params.hsnCode = hsnFilter.trim();

            const response = await productService.getAll(params);
            const data = response.data;
            if (requestId !== latestRequestId.current) return;
            if (data && data.content) {
                setProducts(data.content);
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);
                setCurrentPage(data.number || 0);
            } else if (Array.isArray(data)) {
                setProducts(data);
                setTotalPages(1);
                setTotalElements(data.length);
            } else {
                setProducts([]);
            }
        } catch (error) {
            if (requestId !== latestRequestId.current) return;
            setError(error.response?.data?.message || 'Failed to fetch products');
        } finally {
            if (requestId === latestRequestId.current) setLoading(false);
        }
    }, [currentPage, pageSize, searchQuery, selectedCategory, selectedBrand, minPrice, maxPrice, stockFilter, activeFilter, barcodeFilter, hsnFilter]);

    useEffect(() => { fetchProducts(0); }, [selectedCategory, selectedBrand, stockFilter, activeFilter, pageSize]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(0);
        const form = e.currentTarget;
        const input = form?.querySelector('input[type="text"]');
        const q = input ? input.value : searchQuery;
        setSearchQuery(q);
        fetchProducts(0, q);
    };

    const handlePriceBlur = () => {
        if (minPrice === '' && maxPrice === '') return;
        if (validatePriceRange(minPrice, maxPrice)) { setCurrentPage(0); fetchProducts(0); }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setSelectedBrand('');
        setMinPrice('');
        setMaxPrice('');
        setStockFilter('ALL');
        setActiveFilter('ALL');
        setBarcodeFilter('');
        setHsnFilter('');
        setCurrentPage(0);
        setLoading(true);
        productService.getAll({ page: 0, size: pageSize }).then(res => {
            setProducts(res.data.content || []);
            setTotalPages(res.data.totalPages || 0);
            setTotalElements(res.data.totalElements || 0);
        }).catch(() => toast.error('Failed to reset catalogue list'))
        .finally(() => setLoading(false));
    };

    const handleDelete = async (id, name) => {
        const ok = await confirm(`Deactivate product "${name}"?`, { confirmLabel: 'Deactivate', variant: 'danger' });
        if (!ok) return;
        try {
            await productService.delete(id);
            toast.success('Product deactivated');
            fetchProducts(currentPage);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to deactivate product');
        }
    };

    const handleClearAllProducts = async () => {
        const ok = await confirm('Delete ALL products from the database? This action cannot be undone.', { confirmLabel: 'Delete All', variant: 'danger' });
        if (!ok) return;
        try {
            setLoading(true);
            await productService.deleteAll();
            toast.success('All products deleted');
            fetchProducts(0);
        } catch (error) {
            toast.error('Failed to delete all products');
        } finally { setLoading(false); }
    };

    const openProductDetail = (product) => {
        setSelectedProductForDetail(product);
        setIsDetailModalOpen(true);
    };

    const hasActiveFilters = searchQuery || selectedCategory || selectedBrand ||
        minPrice || maxPrice || stockFilter !== 'ALL' || activeFilter !== 'ALL' || barcodeFilter || hsnFilter;

    return (
        <div>
            <PageHeader
                title="Product Catalog"
                description="Manage inventory stock, categories, brands and catalog items."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Link to="/brands"><Button variant="secondary"><Tag size={16} /> Brands</Button></Link>
                        <Link to="/categories"><Button variant="secondary"><Layers size={16} /> Categories</Button></Link>
                        {canManageProducts && (
                            <>
                                <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)}><FileUp size={16} /> Bulk Import</Button>
                                {user?.role === 'ADMIN' && products.length > 0 && (
                                    <Button variant="secondary" onClick={handleClearAllProducts}><TrashIcon size={16} /> Clear All</Button>
                                )}
                                <Link to="/products/new"><Button><Plus size={16} /> Add Product</Button></Link>
                            </>
                        )}
                    </div>
                }
            />

            <div className="table-panel" style={{ marginBottom: 24 }}>
                <form onSubmit={handleSearchSubmit} className="filter-bar">
                    <div className="search-field" style={{ maxWidth: 'none', flex: 2 }}>
                        <div className="search-control">
                            <input type="text" placeholder="Search by name, SKU, size, brand, barcode..." className="input-field" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search products" />
                            <Button type="submit"><Search size={16} /> Search</Button>
                            {hasActiveFilters && <Button variant="ghost" onClick={handleResetFilters}><RotateCcw size={16} /></Button>}
                        </div>
                    </div>
                </form>

                <div className="filter-bar" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="field" style={{ minWidth: 140 }}>
                        <label className="field-label">Category</label>
                        <select className="input-field" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} > ${c.name}` : c.name}</option>)}
                        </select>
                    </div>
                    <div className="field" style={{ minWidth: 130 }}>
                        <label className="field-label">Brand</label>
                        <select className="input-field" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                            <option value="">All Brands</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="field" style={{ minWidth: 120 }}>
                        <label className="field-label">Stock Status</label>
                        <select className="input-field" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
                            <option value="ALL">All Stock</option>
                            <option value="IN_STOCK">In Stock</option>
                            <option value="OUT_OF_STOCK">Out of Stock</option>
                            <option value="LOW_STOCK">Low Stock</option>
                        </select>
                    </div>
                    <div className="field" style={{ minWidth: 100 }}>
                        <label className="field-label">Status</label>
                        <select className="input-field" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                            <option value="ALL">All</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                    <div className="field" style={{ minWidth: 100 }}>
                        <label className="field-label">Min Price</label>
                        <input type="number" min="0" placeholder="Min ₹" className="input-field" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} onBlur={handlePriceBlur} />
                    </div>
                    <div className="field" style={{ minWidth: 100 }}>
                        <label className="field-label">Max Price</label>
                        <input type="number" min="0" placeholder="Max ₹" className="input-field" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} onBlur={handlePriceBlur} />
                    </div>
                    <div className="field" style={{ minWidth: 120 }}>
                        <label className="field-label">Barcode</label>
                        <input type="text" placeholder="Barcode..." className="input-field" value={barcodeFilter} onChange={(e) => setBarcodeFilter(e.target.value)} onBlur={() => { setCurrentPage(0); fetchProducts(0); }} />
                    </div>
                    <div className="field" style={{ minWidth: 100 }}>
                        <label className="field-label">HSN Code</label>
                        <input type="text" placeholder="HSN..." className="input-field" value={hsnFilter} onChange={(e) => setHsnFilter(e.target.value)} onBlur={() => { setCurrentPage(0); fetchProducts(0); }} />
                    </div>
                </div>
            </div>

            <div className="table-panel">
                {error ? (
                    <ErrorState message={error} onRetry={() => fetchProducts(currentPage)} />
                ) : loading ? (
                    <LoadingSkeleton rows={8} />
                ) : !products.length ? (
                    <EmptyState
                        title={hasActiveFilters ? 'No matching products' : 'No products found'}
                        description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first product to the catalog.'}
                        action={hasActiveFilters ? <Button variant="secondary" onClick={handleResetFilters}><RotateCcw size={16} /> Clear Filters</Button> : undefined}
                    />
                ) : (
                    <>
                        <div className="table-scroll">
                            <table className="data-table" style={{ minWidth: 960 }}>
                                <thead>
                                    <tr>
                                        <th>Product details</th>
                                        <th>Size</th>
                                        <th>Brand / Category</th>
                                        <th className="numeric">Pricing</th>
                                        <th className="numeric">Stock</th>
                                        <th>Tax / Codes</th>
                                        <th>Status</th>
                                        <th className="numeric">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => {
                                        const lowStock = Number(product.stockQuantity || 0) <= Number(product.reorderLevel || 0);
                                        const primaryImg = product.images?.find(img => img.isPrimary)?.imageUrl ||
                                            product.images?.[0]?.imageUrl || product.imageUrls?.[0];
                                        const isBroken = !!brokenImageIds[product.id];
                                        return (
                                            <tr key={product.id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded bg-surface-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {primaryImg && !isBroken ? (
                                                                <img src={primaryImg} alt="" className="w-full h-full object-contain p-1"
                                                                    onError={() => setBrokenImageIds(prev => ({ ...prev, [product.id]: true }))} />
                                                            ) : <Package size={16} />}
                                                        </div>
                                                        <div>
                                                            <button type="button" onClick={() => openProductDetail(product)} className="record-name hover:underline text-left">{product.name}</button>
                                                            <div className="record-meta">SKU: {product.sku}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{product.size ? <StatusBadge status={product.size} label={product.size} /> : '—'}</td>
                                                <td>
                                                    <div className="text-sm font-semibold">{product.brandName || '—'}</div>
                                                    <div className="record-meta">{product.categoryName || '—'}</div>
                                                </td>
                                                <td className="numeric">
                                                    <div className="font-semibold">₹{Number(product.sellingPrice || 0).toLocaleString()}</div>
                                                    <div className="record-meta">MRP: ₹{Number(product.mrp || 0).toLocaleString()}</div>
                                                </td>
                                                <td className="numeric">
                                                    <div className={`font-semibold ${lowStock ? 'text-danger' : ''}`}>
                                                        {product.stockQuantity} {product.unit || 'pcs'}
                                                        {lowStock && <AlertCircle size={14} className="inline ml-1 text-danger" aria-label="Low stock" />}
                                                    </div>
                                                    <div className="record-meta">Alert: {product.reorderLevel}</div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {product.barcode && <div>BAR: {product.barcode}</div>}
                                                    {product.hsnCode && <div className="record-meta">HSN: {product.hsnCode}</div>}
                                                    {product.gstRate != null && <StatusBadge status={`GST ${product.gstRate}%`} label={`GST ${product.gstRate}%`} />}
                                                    {!product.barcode && !product.hsnCode && product.gstRate == null && <span className="text-muted">—</span>}
                                                </td>
                                                <td><StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                                                <td className="numeric">
                                                    <div className="flex justify-end gap-1">
                                                        <IconButton label="View details" onClick={() => openProductDetail(product)}><Eye size={16} /></IconButton>
                                                        {canManageProducts && (
                                                            <>
                                                                <Link to={`/products/edit/${product.id}`}><IconButton label="Edit product"><Edit size={16} /></IconButton></Link>
                                                                <IconButton label="Deactivate product" onClick={() => handleDelete(product.id, product.name)}><TrashIcon size={16} /></IconButton>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="pagination">
                                <span>Page {currentPage + 1} of {totalPages} ({totalElements} products)</span>
                                <div className="pagination-controls">
                                    <Button variant="secondary" size="sm" disabled={currentPage === 0 || loading} onClick={() => fetchProducts(currentPage - 1)}><ChevronLeft size={14} /> Previous</Button>
                                    <Button variant="secondary" size="sm" disabled={currentPage >= totalPages - 1 || loading} onClick={() => fetchProducts(currentPage + 1)}>Next <ChevronRight size={14} /></Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ProductDetailModal product={selectedProductForDetail} isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setSelectedProductForDetail(null); }} />
            {canManageProducts && <BulkUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUploadSuccess={() => fetchProducts(0)} />}
        </div>
    );
};

export default ProductListPage;