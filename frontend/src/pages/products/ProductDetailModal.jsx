import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Sparkles, Image as ImageIcon, CheckCircle, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ProductDetailModal = ({ product, isOpen, onClose }) => {
    const user = useAuthStore((state) => state.user);
    const canViewPurchasePrice = ['ADMIN', 'MANAGER'].includes(user?.role);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [imageErrorMap, setImageErrorMap] = useState({});

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            setSelectedImageIndex(0);
            setImageErrorMap({});
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !product) return null;

    const images = product.images && product.images.length > 0
        ? product.images
        : (product.imageUrls && product.imageUrls.length > 0
            ? product.imageUrls.map((url, idx) => ({ id: idx, imageUrl: url, isPrimary: idx === 0 }))
            : []);

    const currentImage = images[selectedImageIndex] || images[0];
    const lowStock = Number(product.stockQuantity || 0) <= Number(product.reorderLevel || 0);
    const isCurrentImageBroken = currentImage ? !!imageErrorMap[currentImage.id || selectedImageIndex] : true;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
        >
            <div
                className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">
                            <Package size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="product-detail-title" className="text-lg font-bold text-slate-900 leading-snug truncate">
                                {product.name}
                            </h2>
                            <p className="text-xs text-slate-500 font-mono truncate">SKU: {product.sku}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all shrink-0"
                        aria-label="Close product details modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                    {/* Media & Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gallery */}
                        <div className="space-y-3">
                            <div className="w-full h-56 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative group">
                                {currentImage && !isCurrentImageBroken ? (
                                    <img
                                        src={currentImage.imageUrl}
                                        alt={product.name || 'Product Image'}
                                        className="w-full h-full object-contain p-2"
                                        onError={() => {
                                            setImageErrorMap(prev => ({ ...prev, [currentImage.id || selectedImageIndex]: true }));
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-300">
                                        <ImageIcon size={48} strokeWidth={1.5} />
                                        <span className="text-xs text-slate-400 mt-2 font-medium">
                                            {currentImage ? 'Image unavailable' : 'No image attached'}
                                        </span>
                                    </div>
                                )}
                                {product.isFeatured && (
                                    <span className="absolute top-3 left-3 bg-amber-500 text-white text-xxs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                        <Sparkles size={12} /> Featured
                                    </span>
                                )}
                            </div>

                            {/* Thumbnail Row */}
                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product image thumbnails">
                                    {images.map((img, idx) => {
                                        const isBroken = !!imageErrorMap[img.id || idx];
                                        return (
                                            <button
                                                key={img.id || idx}
                                                type="button"
                                                onClick={() => setSelectedImageIndex(idx)}
                                                aria-label={`View image ${idx + 1}`}
                                                className={`w-14 h-14 rounded-xl border p-1 shrink-0 overflow-hidden transition-all flex items-center justify-center ${
                                                    selectedImageIndex === idx
                                                        ? 'border-teal ring-2 ring-teal/20 bg-teal/5'
                                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                                }`}
                                            >
                                                {!isBroken ? (
                                                    <img
                                                        src={img.imageUrl}
                                                        alt={`Thumbnail ${idx + 1}`}
                                                        className="w-full h-full object-contain"
                                                        onError={() => setImageErrorMap(prev => ({ ...prev, [img.id || idx]: true }))}
                                                    />
                                                ) : (
                                                    <ImageIcon size={16} className="text-slate-300" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Pricing & Stock Cards */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <span className="text-xxs text-slate-400 uppercase font-bold tracking-wider">Selling Price</span>
                                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                                        ₹{Number(product.sellingPrice || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <span className="text-xxs text-slate-400 uppercase font-bold tracking-wider">MRP</span>
                                    <div className="text-lg font-semibold text-slate-600 mt-0.5 line-through decoration-slate-300">
                                        ₹{Number(product.mrp || 0).toLocaleString()}
                                    </div>
                                </div>
                                {canViewPurchasePrice && product.purchasePrice !== null && product.purchasePrice !== undefined && (
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <span className="text-xxs text-slate-400 uppercase font-bold tracking-wider">Purchase Price</span>
                                        <div className="text-base font-semibold text-slate-700 mt-0.5">
                                            ₹{Number(product.purchasePrice).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {product.gstRate !== null && product.gstRate !== undefined && (
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <span className="text-xxs text-slate-400 uppercase font-bold tracking-wider">GST Rate</span>
                                        <div className="text-base font-semibold text-slate-800 mt-0.5">
                                            {product.gstRate}%
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stock & Status Box */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">Inventory Stock:</span>
                                    <span className={`text-sm font-bold flex items-center gap-1 ${lowStock ? 'text-red-600' : 'text-slate-800'}`}>
                                        {product.stockQuantity} {product.unit || 'Piece'}
                                        {lowStock && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Reorder Alert Level:</span>
                                    <span className="font-semibold text-slate-700">{product.reorderLevel} {product.unit || 'Piece'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                                    <span>Catalogue Status:</span>
                                    <span className={product.isActive ? 'badge-paid' : 'badge-unpaid'}>
                                        {product.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tax & Compliance */}
                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tax & Barcode Compliance</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                                <span className="text-xs font-medium text-slate-500">Barcode</span>
                                <span className="text-xs font-mono font-bold text-slate-800">
                                    {product.barcode || '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                                <span className="text-xs font-medium text-slate-500">HSN Code</span>
                                <span className="text-xs font-mono font-bold text-slate-800">
                                    {product.hsnCode || '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Specifications */}
                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Product Specifications</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Brand</span>
                                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.brandName || '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Category</span>
                                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.categoryName || '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Color</span>
                                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.color || '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Material</span>
                                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.material || '—'}</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Size</span>
                                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.size || '—'}</div>
                            </div>
                        </div>
                        {product.description && (
                            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Description</span>
                                <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{product.description}</p>
                            </div>
                        )}
                        {product.specifications && (
                            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xxs text-slate-400 uppercase font-bold">Technical Specifications</span>
                                <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{product.specifications}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary text-xs px-5 py-2"
                        aria-label="Close details"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;
