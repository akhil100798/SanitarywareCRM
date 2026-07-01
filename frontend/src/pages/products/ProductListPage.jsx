import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Package, Tag, Layers, AlertCircle, FileUp } from 'lucide-react';
import { productService } from '../../services/productService';
import toast from 'react-hot-toast';
import BulkUploadModal from './BulkUploadModal';

const ProductListPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productService.getAll({ size: 100 });
            setProducts(response.data.content);
        } catch (error) {
            toast.error('Failed to fetch products');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchProducts();
            return;
        }
        try {
            setLoading(true);
            const response = await productService.search(searchQuery, { size: 100 });
            setProducts(response.data.content);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to deactivate this product?')) {
            try {
                await productService.delete(id);
                toast.success('Product deactivated');
                fetchProducts();
            } catch (error) {
                toast.error('Failed to delete product');
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h1>
                    <p className="text-slate-500 text-sm">Manage inventory stock, categories, brands, and catalog items.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                    <Link to="/brands" className="btn-secondary text-sm">
                        <Tag size={16} />
                        <span>Brands</span>
                    </Link>
                    <Link to="/categories" className="btn-secondary text-sm">
                        <Layers size={16} />
                        <span>Categories</span>
                    </Link>
                    <button onClick={() => setIsUploadModalOpen(true)} className="btn-secondary text-sm">
                        <FileUp size={16} />
                        <span>Bulk Import</span>
                    </button>
                    <Link to="/products/new" className="btn-primary text-sm">
                        <Plus size={16} />
                        <span>Add Product</span>
                    </Link>
                </div>
            </div>

            {/* List Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100">
                    <form onSubmit={handleSearch} className="relative max-w-lg">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, or brand..."
                            className="input-field pl-10 py-2.5 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Product details</th>
                                <th className="px-6 py-4">Brand / Category</th>
                                <th className="px-6 py-4">Pricing</th>
                                <th className="px-6 py-4">Stock level</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                                        <span>Fetching catalog list...</span>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No products found in database.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => {
                                    const lowStock = product.stockQuantity <= product.reorderLevel;
                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3.5">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                                                        <Package size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{product.name}</div>
                                                        <div className="text-xxs text-slate-400 font-mono tracking-wider mt-0.5">{product.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-700">{product.brandName}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{product.categoryName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">₹{product.sellingPrice.toLocaleString()}</div>
                                                <div className="text-xxs text-slate-400 mt-0.5">MRP: ₹{product.mrp.toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-semibold flex items-center gap-1 ${lowStock ? 'text-red-600' : 'text-slate-700'}`}>
                                                    <span>{product.stockQuantity} {product.unit || 'pcs'}</span>
                                                    {lowStock && (
                                                        <AlertCircle size={14} className="text-red-500 animate-pulse" />
                                                    )}
                                                </div>
                                                <div className="text-xxs text-slate-400 mt-0.5">Alert Level: {product.reorderLevel}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={product.isActive ? 'badge-paid' : 'badge-unpaid'}>
                                                    {product.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    <Link
                                                        to={`/products/edit/${product.id}`}
                                                        className="p-2 text-slate-400 hover:text-teal hover:bg-slate-50 rounded-xl transition-all"
                                                        title="Edit Product"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-xl transition-all"
                                                        title="Deactivate Product"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <BulkUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={fetchProducts}
            />
        </div>
    );
};

export default ProductListPage;
