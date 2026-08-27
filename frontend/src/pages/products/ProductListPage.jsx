import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus, Search, Edit, Trash2, Package, Tag, Layers,
    AlertCircle, FileUp, RotateCcw, Eye, ChevronLeft, ChevronRight,
    Barcode, Hash
} from 'lucide-react';
import { productService, brandService, categoryService } from '../../services/productService';
import toast from 'react-hot-toast';
import BulkUploadModal from './BulkUploadModal';
import ProductDetailModal from './ProductDetailModal';
import { useAuthStore } from '../../store/authStore';

const ProductListPage = () => {
    const user = useAuthStore((state) => state.user);
    const canManageProducts = ['ADMIN', 'MANAGER'].includes(user?.role);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brokenImageIds, setBrokenImageIds] = useState({});

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [stockFilter, setStockFilter] = useState('ALL'); // ALL, IN_STOCK, OUT_OF_STOCK, LOW_STOCK
    const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
    const [barcodeFilter, setBarcodeFilter] = useState('');
    const [hsnFilter, setHsnFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        fetchMetadata();
    }, []);

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

        if (numMin !== null && (isNaN(numMin) || numMin < 0)) {
            toast.error('Minimum price must be a non-negative number');
            return false;
        }
        if (numMax !== null && (isNaN(numMax) || numMax < 0)) {
            toast.error('Maximum price must be a non-negative number');
            return false;
        }
        if (numMin !== null && numMax !== null && numMin > numMax) {
            toast.error('Minimum price cannot be greater than maximum price');
            return false;
        }
        return true;
    };

    const fetchProducts = useCallback(async (pageToFetch = currentPage, queryOverride) => {
        if (!validatePriceRange(minPrice, maxPrice)) {
            return;
        }

        try {
            setLoading(true);
            const params = {
                page: pageToFetch,
                size: pageSize
            };

            const effectiveQuery = queryOverride !== undefined ? queryOverride : searchQuery;
            if (effectiveQuery && effectiveQuery.trim()) params.query = effectiveQuery.trim();
            if (selectedCategory) params.categoryId = selectedCategory;
            if (selectedBrand) params.brandId = selectedBrand;
            if (minPrice !== '' && !isNaN(minPrice)) params.minPrice = Number(minPrice);
            if (maxPrice !== '' && !isNaN(maxPrice)) params.maxPrice = Number(maxPrice);

            if (stockFilter === 'IN_STOCK') {
                params.inStock = true;
            } else if (stockFilter === 'OUT_OF_STOCK') {
                params.inStock = false;
            } else if (stockFilter === 'LOW_STOCK') {
                params.lowStock = true;
            }

            if (activeFilter === 'ACTIVE') {
                params.isActive = true;
            } else if (activeFilter === 'INACTIVE') {
                params.isActive = false;
            }

            if (barcodeFilter.trim()) params.barcode = barcodeFilter.trim();
            if (hsnFilter.trim()) params.hsnCode = hsnFilter.trim();

            const response = await productService.getAll(params);
            const data = response.data;

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
            toast.error(error.response?.data?.message || 'Failed to fetch products');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [
        currentPage, pageSize, searchQuery, selectedCategory, selectedBrand,
        minPrice, maxPrice, stockFilter, activeFilter, barcodeFilter, hsnFilter
    ]);

    useEffect(() => {
        fetchProducts(0);
    }, [
        selectedCategory, selectedBrand, stockFilter, activeFilter, pageSize
    ]);

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
        if (validatePriceRange(minPrice, maxPrice)) {
            setCurrentPage(0);
            fetchProducts(0);
        }
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
        }).catch(err => {
            toast.error('Failed to reset catalogue list');
        }).finally(() => {
            setLoading(false);
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this product?')) {
            try {
                await productService.delete(id);
                toast.success('Product deactivated successfully');
                fetchProducts(currentPage);
            } catch (error) {
                const msg = error.response?.status === 403
                    ? 'You do not have permission to perform this action.'
                    : (error.response?.data?.message || 'Failed to deactivate product');
                toast.error(msg);
            }
        }
    };

    const openProductDetail = (product) => {
        setSelectedProductForDetail(product);
        setIsDetailModalOpen(true);
    };

    const hasActiveFilters = searchQuery || selectedCategory || selectedBrand ||
        minPrice || maxPrice || stockFilter !== 'ALL' || activeFilter !== 'ALL' ||
        barcodeFilter || hsnFilter;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
                    <p className="text-slate-500 text-sm">Manage inventory stock, categories, brands, and catalog items.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                    <Link to="/brands" className="btn-secondary text-sm" aria-label="Manage Brands">
                        <Tag size={16} />
                        <span>Brands</span>
                    </Link>
                    <Link to="/categories" className="btn-secondary text-sm" aria-label="Manage Categories">
                        <Layers size={16} />
                        <span>Categories</span>
                    </Link>
                    {canManageProducts && (
                        <>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="btn-secondary text-sm"
                                aria-label="Bulk Import"
                            >
                                <FileUp size={16} />
                                <span>Bulk Import</span>
                            </button>
                            <Link to="/products/new" className="btn-primary text-sm" aria-label="Add Product">
                                <Plus size={16} />
                                <span>Add Product</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Multi-faceted Search & Filter Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
                {/* Search Bar Row */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, or brand, barcode, description..."
                            aria-label="Search by name, SKU, or brand, barcode, description"
                            className="input-field pl-10 py-2.5 text-sm w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary text-sm px-6 py-2.5"
                        aria-label="Search products"
                    >
                        <Search size={16} />
                        <span>Search</span>
                    </button>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="btn-secondary text-sm px-4 py-2.5 text-slate-600 hover:text-slate-900"
                            aria-label="Reset all filters"
                        >
                            <RotateCcw size={16} />
                            <span>Reset</span>
                        </button>
                    )}
                </form>

                {/* Filter Controls Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100 text-xs">
                    {/* Category Filter */}
                    <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                        <select
                            className="input-field text-xs py-2"
                            aria-label="Filter by Category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.parentName ? `${c.parentName} > ${c.name}` : c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Brand Filter */}
                    <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Brand</label>
                        <select
                            className="input-field text-xs py-2"
                            aria-label="Filter by Brand"
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                        >
                            <option value="">All Brands</option>
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stock Status Filter */}
                    <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Stock Status</label>
                        <select
                            className="input-field text-xs py-2"
                            aria-label="Filter by Stock Status"
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                        >
                            <option value="ALL">All Stock</option>
                            <option value="IN_STOCK">In Stock (&gt;0)</option>
                            <option value="OUT_OF_STOCK">Out of Stock (=0)</option>
                            <option value="LOW_STOCK">Low Stock (≤ Alert)</option>
                        </select>
                    </div>

                    {/* Active Status Filter */}
                    <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                        <select
                            className="input-field text-xs py-2"
                            aria-label="Filter by Status"
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active Only</option>
                            <option value="INACTIVE">Inactive Only</option>
                        </select>
                    </div>

                    {/* Price Range: Min & Max */}
                    <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Min Price (₹)</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Min ₹"
                            aria-label="Minimum price in rupees"
                            className="input-field text-xs py-2"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            onBlur={handlePriceBlur}
                        />
                    </div>

                    <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Max Price (₹)</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Max ₹"
                            aria-label="Maximum price in rupees"
                            className="input-field text-xs py-2"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            onBlur={handlePriceBlur}
                        />
                    </div>
                </div>

                {/* Additional Spec Filters (Barcode & HSN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
                    <div className="relative">
                        <Barcode size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by barcode..."
                            aria-label="Filter by barcode"
                            className="input-field pl-8 text-xs py-1.5 font-mono"
                            value={barcodeFilter}
                            onChange={(e) => setBarcodeFilter(e.target.value)}
                            onBlur={() => { setCurrentPage(0); fetchProducts(0); }}
                        />
                    </div>
                    <div className="relative">
                        <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by HSN code..."
                            aria-label="Filter by HSN code"
                            className="input-field pl-8 text-xs py-1.5 font-mono"
                            value={hsnFilter}
                            onChange={(e) => setHsnFilter(e.target.value)}
                            onBlur={() => { setCurrentPage(0); fetchProducts(0); }}
                        />
                    </div>
                </div>
            </div>

            {/* List Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Product details</th>
                                <th className="px-6 py-4">Brand / Category</th>
                                <th className="px-6 py-4">Pricing</th>
                                <th className="px-6 py-4">Stock level</th>
                                <th className="px-6 py-4">Tax / Codes</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                        <span>Fetching catalog list...</span>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="max-w-xs mx-auto space-y-2">
                                            <p className="font-semibold text-slate-700">No products found</p>
                                            <p className="text-xs text-slate-400">No catalogue items match your current filters or query parameters.</p>
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="btn-secondary text-xs px-3 py-1.5 mt-2 inline-flex items-center gap-1.5"
                                                    aria-label="Clear all filters"
                                                >
                                                    <RotateCcw size={14} />
                                                    <span>Clear all filters</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => {
                                    const lowStock = Number(product.stockQuantity || 0) <= Number(product.reorderLevel || 0);
                                    const primaryImg = product.images?.find(img => img.isPrimary)?.imageUrl ||
                                        product.images?.[0]?.imageUrl ||
                                        product.imageUrls?.[0];
                                    const isBroken = !!brokenImageIds[product.id];

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3.5">
                                                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 overflow-hidden shrink-0">
                                                        {primaryImg && !isBroken ? (
                                                            <img
                                                                src={primaryImg}
                                                                alt={product.name || 'Product thumbnail'}
                                                                className="w-full h-full object-contain p-1"
                                                                onError={() => {
                                                                    setBrokenImageIds(prev => ({ ...prev, [product.id]: true }));
                                                                }}
                                                            />
                                                        ) : (
                                                            <Package size={18} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => openProductDetail(product)}
                                                            className="font-bold text-slate-900 hover:text-teal text-left transition-colors truncate max-w-xs block"
                                                            title={product.name}
                                                        >
                                                            {product.name}
                                                        </button>
                                                        <div className="text-xxs text-slate-400 font-mono tracking-wider mt-0.5">
                                                            SKU: {product.sku}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-700">{product.brandName || '—'}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{product.categoryName || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">₹{Number(product.sellingPrice || 0).toLocaleString()}</div>
                                                <div className="text-xxs text-slate-400 mt-0.5">MRP: ₹{Number(product.mrp || 0).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-semibold flex items-center gap-1 ${lowStock ? 'text-red-600' : 'text-slate-700'}`}>
                                                    <span>{product.stockQuantity} {product.unit || 'pcs'}</span>
                                                    {lowStock && (
                                                        <AlertCircle size={14} className="text-red-500 shrink-0" title="Low Stock Warning" />
                                                    )}
                                                </div>
                                                <div className="text-xxs text-slate-400 mt-0.5">Alert: {product.reorderLevel}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono">
                                                {product.barcode && (
                                                    <div className="text-slate-700 font-medium">BAR: {product.barcode}</div>
                                                )}
                                                {product.hsnCode && (
                                                    <div className="text-slate-400 text-xxs">HSN: {product.hsnCode}</div>
                                                )}
                                                {product.gstRate !== null && product.gstRate !== undefined && (
                                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xxs font-sans font-semibold">
                                                        GST: {product.gstRate}%
                                                    </span>
                                                )}
                                                {!product.barcode && !product.hsnCode && product.gstRate === null && (
                                                    <span className="text-slate-400 font-sans">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={product.isActive ? 'badge-paid' : 'badge-unpaid'}>
                                                    {product.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openProductDetail(product)}
                                                        className="p-2 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                        title="View Details"
                                                        aria-label={`View details for ${product.name}`}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {canManageProducts && (
                                                        <>
                                                            <Link
                                                                to={`/products/edit/${product.id}`}
                                                                className="p-2 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                                title="Edit Product"
                                                                aria-label={`Edit ${product.name}`}
                                                            >
                                                                <Edit size={16} />
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(product.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all"
                                                                title="Deactivate Product"
                                                                aria-label={`Deactivate ${product.name}`}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                        <div>
                            Showing page <span className="font-bold text-slate-700">{currentPage + 1}</span> of{' '}
                            <span className="font-bold text-slate-700">{totalPages}</span> ({totalElements} total products)
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => fetchProducts(currentPage - 1)}
                                disabled={currentPage === 0 || loading}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={14} />
                                <span>Previous</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchProducts(currentPage + 1)}
                                disabled={currentPage >= totalPages - 1 || loading}
                                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                <span>Next</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail View Modal */}
            <ProductDetailModal
                product={selectedProductForDetail}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedProductForDetail(null);
                }}
            />

            {/* Bulk Upload Modal */}
            {canManageProducts && (
                <BulkUploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUploadSuccess={() => fetchProducts(0)}
                />
            )}
        </div>
    );
};

export default ProductListPage;
