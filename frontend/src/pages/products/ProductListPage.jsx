import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Package, Tag, Layers, AlertCircle, FileUp } from 'lucide-react';
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500">Manage your product catalog, inventory, and brands.</p>
                </div>
                <div className="flex space-x-2">
                    <Link
                        to="/brands"
                        className="flex items-center justify-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        <Tag size={20} />
                        <span>Brands</span>
                    </Link>
                    <button className="flex items-center justify-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                        <Layers size={20} />
                        <span>Categories</span>
                    </button>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <FileUp size={20} />
                        <span>Bulk Import</span>
                    </button>
                    <Link
                        to="/products/new"
                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        <span>Add Product</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, or description..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={20} />
                        <span>Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Product Info</th>
                                <th className="px-6 py-4">Brand/Category</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                        Loading products...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 mr-3">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{product.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">{product.brandName}</div>
                                            <div className="text-xs text-gray-500">{product.categoryName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-semibold">₹{product.sellingPrice}</div>
                                            <div className="text-xs text-gray-400 line-through">MRP: ₹{product.mrp}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-sm font-medium flex items-center ${product.stockQuantity <= product.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                                                {product.stockQuantity} {product.unit}
                                                {product.stockQuantity <= product.reorderLevel && (
                                                    <AlertCircle size={14} className="ml-1" />
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">Min: {product.reorderLevel}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.isActive ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    to={`/products/edit/${product.id}`}
                                                    className="p-1 hover:text-blue-600 transition-colors rounded"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1 hover:text-red-600 transition-colors rounded"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
