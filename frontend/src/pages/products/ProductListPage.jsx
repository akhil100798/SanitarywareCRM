import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Plus, Search, Edit, Trash2, Package, Tag, Layers,
    AlertCircle, FileUp, RotateCcw, Eye, ChevronLeft, ChevronRight,
    Barcode, Hash, LayoutGrid, List, Sparkles, X
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
    const latestRequestId = useRef(0);

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Option B: Multi-variant matrix view
    const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'MATRIX'
    const [activeVariants, setActiveVariants] = useState({});

    const formatPrice = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const groupedProductFamilies = React.useMemo(() => {
        const map = new Map();
        products.forEach((prod) => {
            const brandName = prod.brand?.name || 'Generic';
            const cleanName = (prod.name || 'Unnamed').trim();
            const groupKey = `${brandName}:::${cleanName.toLowerCase()}`;
            if (!map.has(groupKey)) {
                map.set(groupKey, {
                    groupKey,
                    brand: prod.brand,
                    category: prod.category,
                    baseName: cleanName,
                    variants: []
                });
            }
            map.get(groupKey).variants.push(prod);
        });
        return Array.from(map.values());
    }, [products]);

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

        const requestId = ++latestRequestId.current;
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
            toast.error(error.response?.data?.message || 'Failed to fetch products');
            console.error(error);
        } finally {
            if (requestId === latestRequestId.current) setLoading(false);
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

    const isFirstSearchMount = useRef(true);
    useEffect(() => {
        if (isFirstSearchMount.current) {
            isFirstSearchMount.current = false;
            return;
        }
        const timer = setTimeout(() => {
            setCurrentPage(0);
            fetchProducts(0, searchQuery);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await productService.delete(id);
                toast.success('Product deleted successfully');
                fetchProducts(currentPage);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to delete product');
            }
        }
    };

    const handleClearAllProducts = async () => {
        if (window.confirm('Are you sure you want to delete ALL products from the database? This action cannot be undone.')) {
            try {
                setLoading(true);
                await productService.deleteAll();
                toast.success('All products deleted successfully');
                fetchProducts(0);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to delete all products');
            } finally {
                setLoading(false);
            }
        }
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

    const handleAvailabilityChange = async (product) => {
        try {
            await productService.updateAvailability(product.id, !product.isAvailable);
            toast.success(product.isAvailable ? 'Product marked unavailable' : 'Product marked available');
            fetchProducts(currentPage);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update product availability');
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
                            {user?.role === 'ADMIN' && products.length > 0 && (
                                <button
                                    onClick={handleClearAllProducts}
                                    className="btn-secondary text-sm text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
                                    aria-label="Clear All Products"
                                    title="Delete all products in catalogue"
                                >
                                    <Trash2 size={16} />
                                    <span>Clear All</span>
                                </button>
                            )}
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
                            placeholder="Search by name, SKU, size, brand, barcode..."
                            aria-label="Search by name, SKU, size, brand, barcode"
                            className="input-field pl-10 pr-9 py-2.5 text-sm w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && searchQuery.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    fetchProducts(0, '');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
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
                        <label className="block text-xxs font-bold text-slate-600 uppercase tracking-wider mb-1">Category</label>
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
                        <label className="block text-xxs font-bold text-slate-600 uppercase tracking-wider mb-1">Brand</label>
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
                        <label className="block text-xxs font-bold text-slate-600 uppercase tracking-wider mb-1">Stock Status</label>
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
                        <label className="block text-xxs font-bold text-slate-600 uppercase tracking-wider mb-1">Status</label>
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
                        <label className="block text-xxs font-bold text-slate-600 uppercase tracking-wider mb-1">Min Price (₹)</label>
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
                        <label className="block text-xxs font-bold text-slate-600 uppercase tracking-wider mb-1">Max Price (₹)</label>
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

            {/* View Mode Toggle & Total Count */}
            <div className="flex items-center justify-between px-1">
                <div className="text-xs text-slate-700 font-medium">
                    Showing <strong>{totalElements}</strong> products ({groupedProductFamilies.length} product families)
                </div>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setViewMode('TABLE')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-900'
                            }`}
                    >
                        <List size={14} />
                        <span>Table View</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('MATRIX')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${viewMode === 'MATRIX' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-700 hover:text-slate-900'
                            }`}
                    >
                        <LayoutGrid size={14} />
                        <span>Variant Matrix View</span>
                    </button>
                </div>
            </div>

            {/* List Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {viewMode === 'MATRIX' ? (
                    <div className="p-6">
                        {loading ? (
                            <div className="py-16 text-center text-slate-400">
                                <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                <span>Fetching catalog list...</span>
                            </div>
                        ) : groupedProductFamilies.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <div className="max-w-xs mx-auto space-y-2">
                                    <Package size={40} className="mx-auto text-slate-300 mb-2" />
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
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupedProductFamilies.map((family) => {
                                    const selectedId = activeVariants[family.groupKey] || family.variants[0]?.id;
                                    const activeProduct = family.variants.find(v => v.id === selectedId) || family.variants[0];
                                    const primaryImg = activeProduct.images?.find(img => img.isPrimary)?.imageUrl ||
                                        activeProduct.images?.[0]?.imageUrl || activeProduct.imageUrls?.[0];
                                    const isBroken = !!brokenImageIds[activeProduct.id];

                                    return (
                                        <div key={family.groupKey} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col">
                                            {/* Card Image Area */}
                                            <div className="relative h-48 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4">
                                                {primaryImg && !isBroken ? (
                                                    <img
                                                        src={primaryImg}
                                                        alt={activeProduct.name}
                                                        onError={() => setBrokenImageIds(prev => ({ ...prev, [activeProduct.id]: true }))}
                                                        className="h-full w-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                                        <Package size={40} />
                                                        <span className="text-[10px] mt-1 text-slate-400 font-medium">No Image</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-700 shadow-2xs border border-slate-200/60">
                                                        {family.brand?.name || 'Brand'}
                                                    </span>
                                                </div>
                                                <div className="absolute top-3 right-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeProduct.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                                                        {activeProduct.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2" title={family.baseName || activeProduct.name}>
                                                        {family.baseName}
                                                    </h3>
                                                    <p className="text-[11px] font-mono text-slate-600 mt-0.5" title={activeProduct.sku}>
                                                        SKU: <strong className="text-slate-700">{activeProduct.sku}</strong>
                                                    </p>
                                                </div>

                                                {/* Variant Chips (Sizes & Finishes) */}
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                                                        <span>Select Variant ({family.variants.length})</span>
                                                        {activeProduct.size && activeProduct.size !== '--' && (
                                                            <span className="text-blue-600 font-bold font-sans">{activeProduct.size}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                                        {family.variants.map((v) => {
                                                            const isSelected = v.id === activeProduct.id;
                                                            const chipLabel = (v.size && v.size !== '--' ? v.size : '') ||
                                                                (v.color && v.color !== '--' ? v.color : '') ||
                                                                v.sku;
                                                            return (
                                                                <button
                                                                    key={v.id}
                                                                    type="button"
                                                                    onClick={() => setActiveVariants(prev => ({ ...prev, [family.groupKey]: v.id }))}
                                                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all border ${isSelected
                                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                        }`}
                                                                >
                                                                    {chipLabel} · ₹{formatPrice(v.sellingPrice || v.mrp)}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Price & Actions */}
                                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <div className="text-base font-black text-slate-900">
                                                            ₹{formatPrice(activeProduct.sellingPrice || activeProduct.mrp)}
                                                        </div>
                                                        <div className="text-[10px] text-slate-600">
                                                            MRP: ₹{formatPrice(activeProduct.mrp)}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openProductDetail(activeProduct)}
                                                            className="p-1.5 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {canManageProducts && (
                                                            <Link
                                                                to={`/products/edit/${activeProduct.id}`}
                                                                className="p-1.5 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Product details</th>
                                    <th className="px-6 py-4">Size</th>
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
                                        <td colSpan="8" className="px-6 py-12 text-center text-slate-400 text-sm">
                                            <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                            <span>Fetching catalog list...</span>
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-slate-400 text-sm">
                                            <div className="max-w-xs mx-auto space-y-2">
                                                <Package size={40} className="mx-auto text-slate-300 mb-2" />
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
                                        const primaryImg = product.images?.find(img => img.isPrimary)?.imageUrl ||
                                            product.images?.[0]?.imageUrl ||
                                            product.imageUrls?.[0];
                                        const isBroken = !!brokenImageIds[product.id];
                                        const stockQty = Number(product.stockQuantity || 0);
                                        const reorder = Number(product.reorderLevel || 0);

                                        return (
                                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3.5">
                                                        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 overflow-hidden shrink-0">
                                                            {primaryImg && !isBroken ? (
                                                                <img
                                                                    src={primaryImg}
                                                                    alt={product.name || 'Product thumbnail'}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-contain p-1"
                                                                    onError={() => {
                                                                        setBrokenImageIds(prev => ({ ...prev, [product.id]: true }));
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Package size={18} />
                                                            )}
                                                        </div>
                                                        <div className={`min-w-0 rounded-md px-2 py-1 ${product.isAvailable === false ? 'bg-black text-white' : ''}`}>
                                                            {product.isAvailable === false && (
                                                                <span className="mb-1 inline-block rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                                                                    Unavailable
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => openProductDetail(product)}
                                                                className={`font-bold text-left transition-colors truncate max-w-xs block ${product.isAvailable === false ? 'text-white line-through hover:text-gray-200' : 'text-slate-900 hover:text-teal'}`}
                                                                title={product.name}
                                                            >
                                                                {product.name}
                                                            </button>
                                                            <div className={`text-xxs font-mono tracking-wider mt-0.5 ${product.isAvailable === false ? 'text-gray-300' : 'text-slate-600'}`}>
                                                                SKU: {product.sku}
                                                            </div>
                                                            {product.description && product.description !== '--' && product.description !== 'null' && (
                                                                <div className={`text-[11px] truncate max-w-xs mt-0.5 ${product.isAvailable === false ? 'text-gray-200' : 'text-slate-600'}`} title={product.description}>
                                                                    {product.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {product.size ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/60">
                                                            {product.size}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-700">{product.brandName || '—'}</div>
                                                    <div className="text-xs text-slate-600 mt-0.5">{product.categoryName || '—'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">₹{formatPrice(product.sellingPrice)}</div>
                                                    <div className="text-xxs text-slate-600 mt-0.5">MRP: ₹{formatPrice(product.mrp)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {stockQty <= 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                            Out of Stock
                                                        </span>
                                                    ) : stockQty <= reorder ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <AlertCircle size={13} className="shrink-0" />
                                                            Low Stock ({stockQty} {product.unit || 'pcs'})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            In Stock ({stockQty} {product.unit || 'pcs'})
                                                        </span>
                                                    )}
                                                    <div className="text-xxs text-slate-600 mt-1">Alert: {product.reorderLevel ?? 0}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono">
                                                    {product.barcode && (
                                                        <div className="text-slate-700 font-medium">BAR: {product.barcode}</div>
                                                    )}
                                                    {product.hsnCode && (
                                                        <div className="text-slate-600 text-xxs">HSN: {product.hsnCode}</div>
                                                    )}
                                                    {product.materialCode && (
                                                        <div className="text-slate-600 text-xxs">Material: {product.materialCode}</div>
                                                    )}
                                                    {product.itemCode && (
                                                        <div className="text-slate-600 text-xxs">Item: {product.itemCode}</div>
                                                    )}
                                                    {product.gstRate !== null && product.gstRate !== undefined && (
                                                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xxs font-sans font-semibold">
                                                            GST: {product.gstRate}%
                                                        </span>
                                                    )}
                                                    {!product.barcode && !product.hsnCode && product.gstRate === null && (
                                                        <span className="text-slate-600 font-sans">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={product.isActive ? 'badge-paid' : 'badge-unpaid'}>
                                                        {product.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                    {product.isAvailable === false && (
                                                        <span className="ml-1 inline-flex rounded bg-black px-2 py-1 text-xs font-semibold text-white">
                                                            Unavailable
                                                        </span>
                                                    )}
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
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAvailabilityChange(product)}
                                                                    className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                                                    aria-label={`${product.isAvailable === false ? 'Mark available' : 'Mark unavailable'}: ${product.name}`}
                                                                >
                                                                    {product.isAvailable === false ? 'Mark available' : 'Mark unavailable'}
                                                                </button>
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
                )}

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
                onRefresh={fetchProducts}
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
