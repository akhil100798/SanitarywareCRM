import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { brandService } from '../../services/productService';
import toast from 'react-hot-toast';
import BrandFormModal from './BrandFormModal';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/Page';
import { Table } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const BrandListPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canManageBrands = ['ADMIN', 'MANAGER'].includes(user?.role);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const confirm = useConfirm();

    useEffect(() => { fetchBrands(); }, []);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await brandService.getAll();
            setBrands(response.data);
        } catch (error) {
            setError('Failed to load brands');
        } finally {
            setLoading(false);
        }
    };

    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (brand.description && brand.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleDelete = async (id, name) => {
        const ok = await confirm(`Delete brand "${name}"? This action cannot be undone.`, { confirmLabel: 'Delete', variant: 'danger' });
        if (!ok) return;
        try {
            await brandService.delete(id);
            toast.success('Brand deleted');
            fetchBrands();
        } catch (error) {
            toast.error('Failed to delete brand');
        }
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" onClick={() => navigate('/products')}>
                    <ArrowLeft size={18} /> Back to Products
                </Button>
            </div>

            <PageHeader
                title="Brands"
                description="Manage your product brands."
                actions={canManageBrands && <Button onClick={() => { setSelectedBrand(null); setIsModalOpen(true); }}><Plus size={16} /> Add Brand</Button>}
            />

            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput
                        label="Search brands"
                        placeholder="Search by name or description..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </div>

                {error ? (
                    <ErrorState message={error} onRetry={fetchBrands} />
                ) : loading ? (
                    <LoadingSkeleton rows={5} />
                ) : !filteredBrands.length ? (
                    <EmptyState
                        title={searchQuery ? 'No matching brands' : 'No brands found'}
                        description={searchQuery ? 'Try a different search term.' : 'Add your first brand to get started.'}
                    />
                ) : (
                    <Table caption="Product brands">
                        <thead>
                            <tr>
                                <th>Brand</th>
                                <th>Description</th>
                                <th>Status</th>
                                {canManageBrands && <th className="numeric">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBrands.map(brand => (
                                <tr key={brand.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded bg-surface-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {brand.logoUrl ? (
                                                    <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>B</span>
                                                )}
                                            </div>
                                            <span className="record-name">{brand.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: 240 }}><span className="truncate block">{brand.description || '—'}</span></td>
                                    <td><StatusBadge status={brand.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                                    {canManageBrands && (
                                        <td className="numeric">
                                            <div className="flex justify-end gap-1">
                                                <IconButton label="Edit brand" onClick={() => { setSelectedBrand(brand); setIsModalOpen(true); }}><Edit size={16} /></IconButton>
                                                <IconButton label="Delete brand" onClick={() => handleDelete(brand.id, brand.name)}><Trash2 size={16} /></IconButton>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </div>

            {canManageBrands && (
                <BrandFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchBrands}
                    initialData={selectedBrand}
                />
            )}
        </div>
    );
};

export default BrandListPage;