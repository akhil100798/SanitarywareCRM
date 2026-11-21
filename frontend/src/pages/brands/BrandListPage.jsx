import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, ArrowLeft, Tag, History, FileText, X } from 'lucide-react';
import { brandService } from '../../services/productService';
import toast from 'react-hot-toast';
import BrandFormModal from './BrandFormModal';
import BrandCatalogHistoryModal from './BrandCatalogHistoryModal';
import { useAuthStore } from '../../store/authStore';

const getSafeImageUrl = (url) => {
    if (!url) return null;
    const trimmed = String(url).trim();
    return /^(https?:\/\/|data:image\/)/i.test(trimmed) ? trimmed : null;
};

const BrandListPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canManageBrands = ['ADMIN', 'MANAGER'].includes(user?.role);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [historyBrand, setHistoryBrand] = useState(null);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await brandService.getAll();
            setBrands(response.data);
        } catch (error) {
            toast.error('Failed to fetch brands');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedBrand(null);
        setIsModalOpen(true);
    };

    const handleEdit = (brand) => {
        setSelectedBrand(brand);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this brand?')) {
            try {
                await brandService.delete(id);
                toast.success('Brand deleted successfully');
                fetchBrands();
            } catch (error) {
                toast.error('Failed to delete brand');
            }
        }
    };

    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (brand.description && brand.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/products')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
                        <p className="text-gray-500">Manage your product brands.</p>
                    </div>
                </div>
                {canManageBrands && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        <span>Add Brand</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search brands..."
                            className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && searchQuery.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Brand</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Catalog PDF</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        Loading brands...
                                    </td>
                                </tr>
                            ) : filteredBrands.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No brands found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBrands.map((brand) => (
                                    <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 mr-3 overflow-hidden">
                                                    {getSafeImageUrl(brand.logoUrl) ? (
                                                        <img src={getSafeImageUrl(brand.logoUrl)} alt={brand.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Tag size={20} />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900">{brand.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">
                                            {brand.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="truncate max-w-[180px]">{brand.catalogFileName || 'No catalog attached'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setHistoryBrand(brand)}
                                                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    <History size={12} />
                                                    <span>Versions & Rollback</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {brand.isActive ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {canManageBrands && (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => setHistoryBrand(brand)}
                                                        className="p-1 text-slate-500 hover:text-indigo-600 transition-colors rounded"
                                                        title="Catalog Version History"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(brand)}
                                                        className="p-1 hover:text-blue-600 transition-colors rounded"
                                                        title="Edit Brand"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(brand.id)}
                                                        className="p-1 hover:text-red-600 transition-colors rounded"
                                                        title="Delete Brand"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {canManageBrands && (
                <BrandFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchBrands}
                    initialData={selectedBrand}
                />
            )}

            <BrandCatalogHistoryModal
                isOpen={!!historyBrand}
                onClose={() => setHistoryBrand(null)}
                brand={historyBrand}
            />
        </div>
    );
};

export default BrandListPage;
