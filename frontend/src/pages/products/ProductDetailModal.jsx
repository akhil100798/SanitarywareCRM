import React, { useState, useEffect, useRef } from 'react';
import { Package, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';

const ProductDetailModal = ({ product, isOpen, onClose }) => {
    const user = useAuthStore((state) => state.user);
    const canViewPurchasePrice = ['ADMIN', 'MANAGER'].includes(user?.role);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [imageErrorMap, setImageErrorMap] = useState({});

    useEffect(() => {
        if (isOpen) { setSelectedImageIndex(0); setImageErrorMap({}); }
    }, [isOpen, product]);

    if (!product) return null;

    const images = product.images && product.images.length > 0
        ? product.images
        : (product.imageUrls && product.imageUrls.length > 0
            ? product.imageUrls.map((url, idx) => ({ id: idx, imageUrl: url, isPrimary: idx === 0 }))
            : []);
    const currentImage = images[selectedImageIndex] || images[0];
    const lowStock = Number(product.stockQuantity || 0) <= Number(product.reorderLevel || 0);
    const isCurrentImageBroken = currentImage ? !!imageErrorMap[currentImage.id || selectedImageIndex] : true;

    return (
        <Modal open={isOpen} onClose={onClose} title={product.name} wide>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="w-full h-56 rounded-lg bg-surface-muted flex items-center justify-center overflow-hidden relative">
                            {currentImage && !isCurrentImageBroken ? (
                                <img src={currentImage.imageUrl} alt={product.name} className="w-full h-full object-contain p-2"
                                    onError={() => setImageErrorMap(prev => ({ ...prev, [currentImage.id || selectedImageIndex]: true }))} />
                            ) : (
                                <div className="flex flex-col items-center text-muted"><ImageIcon size={48} strokeWidth={1.5} /><span className="text-xs mt-2">{currentImage ? 'Unavailable' : 'No image'}</span></div>
                            )}
                            {product.isFeatured && <span className="status-badge status-info" style={{ position: 'absolute', top: 8, left: 8 }}><Sparkles size={12} /> Featured</span>}
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {images.map((img, idx) => {
                                    const broken = !!imageErrorMap[img.id || idx];
                                    return (
                                        <button key={img.id || idx} type="button" onClick={() => setSelectedImageIndex(idx)}
                                            className={`w-12 h-12 rounded border p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0 ${selectedImageIndex === idx ? 'border-primary' : 'border-border'}`}>
                                            {!broken ? <img src={img.imageUrl} alt="" className="w-full h-full object-contain"
                                                onError={() => setImageErrorMap(prev => ({ ...prev, [img.id || idx]: true }))} />
                                            : <ImageIcon size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="surface" style={{ padding: 12 }}>
                                <span className="record-meta">Selling Price</span>
                                <div className="text-xl font-bold">₹{Number(product.sellingPrice || 0).toLocaleString()}</div>
                            </div>
                            <div className="surface" style={{ padding: 12 }}>
                                <span className="record-meta">MRP</span>
                                <div className="text-lg font-semibold text-muted" style={{ textDecoration: 'line-through' }}>₹{Number(product.mrp || 0).toLocaleString()}</div>
                            </div>
                            {canViewPurchasePrice && product.purchasePrice != null && (
                                <div className="surface" style={{ padding: 12 }}>
                                    <span className="record-meta">Purchase Price</span>
                                    <div className="text-base font-semibold">₹{Number(product.purchasePrice).toLocaleString()}</div>
                                </div>
                            )}
                            {product.gstRate != null && (
                                <div className="surface" style={{ padding: 12 }}>
                                    <span className="record-meta">GST Rate</span>
                                    <div className="text-base font-semibold">{product.gstRate}%</div>
                                </div>
                            )}
                        </div>
                        <div className="surface" style={{ padding: 16 }}>
                            <div className="flex justify-between text-sm"><span className="text-secondary">Inventory</span><span className={`font-semibold ${lowStock ? 'text-danger' : ''}`}>{product.stockQuantity} {product.unit || 'pcs'} {lowStock && <AlertCircle size={14} className="inline ml-1" />}</span></div>
                            <div className="flex justify-between text-sm mt-2"><span className="text-secondary">Reorder Level</span><span className="font-semibold">{product.reorderLevel}</span></div>
                            <div className="flex justify-between text-sm mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}><span className="text-secondary">Status</span><StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} /></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center p-3 surface" style={{ padding: '12px 16px' }}>
                        <span className="text-sm text-secondary">Barcode</span>
                        <span className="text-sm font-mono font-semibold">{product.barcode || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 surface" style={{ padding: '12px 16px' }}>
                        <span className="text-sm text-secondary">HSN Code</span>
                        <span className="text-sm font-mono font-semibold">{product.hsnCode || '—'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[{ label: 'Brand', value: product.brandName }, { label: 'Category', value: product.categoryName }, { label: 'Color', value: product.color }, { label: 'Material', value: product.material }, { label: 'Size', value: product.size }].map(spec => (
                        <div key={spec.label} className="surface" style={{ padding: '10px 12px' }}>
                            <span className="record-meta">{spec.label}</span>
                            <div className="text-sm font-semibold truncate">{spec.value || '—'}</div>
                        </div>
                    ))}
                </div>

                {product.description && (
                    <div className="surface">
                        <span className="section-heading" style={{ display: 'block', marginBottom: 8 }}>Description</span>
                        <p className="text-sm whitespace-pre-wrap" style={{ lineHeight: 1.6 }}>{product.description}</p>
                    </div>
                )}
                {product.specifications && (
                    <div className="surface">
                        <span className="section-heading" style={{ display: 'block', marginBottom: 8 }}>Specifications</span>
                        <p className="text-sm whitespace-pre-wrap" style={{ lineHeight: 1.6 }}>{product.specifications}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ProductDetailModal;