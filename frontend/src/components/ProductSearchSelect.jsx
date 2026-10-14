import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, X, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';

const ProductSearchSelect = ({
    value,
    onChange,
    products = [],
    onProductsUpdate,
    disabled = false,
    placeholder = 'Select Product',
    filterQuery = '',
    priceField = 'sellingPrice',
    required = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Selected product lookup
    const selectedProduct = useMemo(() => {
        if (!value) return null;
        const numericId = typeof value === 'string' ? parseInt(value, 10) : value;
        return products.find(p => p.id === numericId) || null;
    }, [value, products]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    // Backend search when query is not matched locally
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed || trimmed.length < 2) return;

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await productService.getAll({ query: trimmed, isActive: true, size: 50 });
                const fetched = res.data?.content || res.data || [];
                if (fetched.length > 0 && onProductsUpdate) {
                    onProductsUpdate(fetched);
                }
            } catch (err) {
                // Silently handle search error
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, onProductsUpdate]);

    // Filter displayed products
    const displayedProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase() || filterQuery.trim().toLowerCase();
        
        // If no filter, return products
        if (!query) return products;

        return products.filter(p => {
            // Always keep selected item visible
            if (selectedProduct && p.id === selectedProduct.id) return true;
            return (
                p.name?.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query) ||
                p.barcode?.toLowerCase().includes(query) ||
                p.hsnCode?.toLowerCase().includes(query) ||
                p.categoryName?.toLowerCase().includes(query) ||
                p.brandName?.toLowerCase().includes(query)
            );
        });
    }, [products, searchQuery, filterQuery, selectedProduct]);

    const handleSelect = (product) => {
        if (product) {
            onChange(product.id, product);
        } else {
            onChange('', null);
        }
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(prev => !prev)}
                data-testid="product-search-trigger"
                className={`w-full text-left p-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-white font-medium flex items-center justify-between shadow-sm transition-all ${
                    disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
            >
                <span className={`truncate mr-2 ${selectedProduct ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                    {selectedProduct
                        ? `${selectedProduct.name} (${selectedProduct.sku})`
                        : placeholder}
                </span>
                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                    {selectedProduct && !disabled && (
                        <span
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(null);
                            }}
                            className="hover:text-red-500 p-0.5 rounded transition-colors"
                            title="Clear product"
                        >
                            <X size={14} />
                        </span>
                    )}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal' : ''}`} />
                </div>
            </button>

            {/* Hidden native input for form validation */}
            <input
                type="text"
                required={required}
                value={value || ''}
                onChange={() => {}}
                className="opacity-0 absolute inset-0 pointer-events-none -z-10 h-full w-full"
                tabIndex={-1}
            />

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search Bar inside dropdown */}
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            data-testid="product-search-input"
                            placeholder="Type to search name, SKU, barcode..."
                            className="w-full text-xs outline-none bg-transparent placeholder:text-slate-400 py-0.5 text-slate-800 font-medium"
                        />
                        {isSearching && <Loader2 size={13} className="animate-spin text-teal shrink-0" />}
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="text-slate-400 hover:text-slate-600 shrink-0"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Results list */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {displayedProducts.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-slate-400">
                                {isSearching ? 'Searching products...' : 'No matching products found'}
                            </div>
                        ) : (
                            displayedProducts.map((p) => {
                                const isSelected = selectedProduct && selectedProduct.id === p.id;
                                const price = p[priceField] !== undefined && p[priceField] !== null ? p[priceField] : p.sellingPrice;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelect(p)}
                                        data-testid={`product-search-result-${p.id}`}
                                        className={`px-3.5 py-2.5 text-xs cursor-pointer hover:bg-teal-50/50 flex items-center justify-between gap-3 transition-colors ${
                                            isSelected ? 'bg-teal-50 border-l-4 border-teal text-teal-950 font-medium' : 'text-slate-700'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.sku}</span>
                                                {p.size && (
                                                    <span className="font-semibold bg-teal/10 text-teal px-1.5 py-0.5 rounded">
                                                        Size: {p.size}
                                                    </span>
                                                )}
                                                {p.barcode && <span>BAR: {p.barcode}</span>}
                                                <span className={p.stockQuantity > 0 ? 'text-emerald-600' : 'text-amber-600'}>
                                                    Stock: {p.stockQuantity ?? 0}
                                                </span>
                                                {p.brandName && <span>Brand: {p.brandName}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-bold text-slate-900">₹{(price || 0).toLocaleString()}</div>
                                            {p.gstRate !== null && p.gstRate !== undefined && (
                                                <div className="text-[10px] text-teal-600 font-medium">GST: {p.gstRate}%</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductSearchSelect;
