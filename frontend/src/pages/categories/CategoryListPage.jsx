import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { categoryService } from '../../services/productService';
import toast from 'react-hot-toast';
import CategoryFormModal from './CategoryFormModal';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/Page';
import { Table } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const CategoryListPage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const canManageCategories = ['ADMIN', 'MANAGER'].includes(user?.role);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const confirm = useConfirm();

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await categoryService.getAll();
            setCategories(response.data);
        } catch (error) {
            setError('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (category.parentName && category.parentName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleDelete = async (id, name) => {
        const ok = await confirm(`Deactivate category "${name}"?`, { confirmLabel: 'Deactivate', variant: 'danger' });
        if (!ok) return;
        try {
            await categoryService.delete(id);
            toast.success('Category deactivated');
            fetchCategories();
        } catch (error) {
            toast.error('Failed to deactivate category');
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
                title="Categories"
                description="Manage your product category tree."
                actions={canManageCategories && <Button onClick={() => { setSelectedCategory(null); setIsModalOpen(true); }}><Plus size={16} /> Add Category</Button>}
            />

            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput
                        label="Search categories"
                        placeholder="Search by name, description or parent..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </div>

                {error ? (
                    <ErrorState message={error} onRetry={fetchCategories} />
                ) : loading ? (
                    <LoadingSkeleton rows={5} />
                ) : !filteredCategories.length ? (
                    <EmptyState
                        title={searchQuery ? 'No matching categories' : 'No categories found'}
                        description={searchQuery ? 'Try a different search term.' : 'Add your first category to get started.'}
                    />
                ) : (
                    <Table caption="Product categories">
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th>Parent Category</th>
                                <th>Description</th>
                                <th>Status</th>
                                {canManageCategories && <th className="numeric">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map(c => (
                                <tr key={c.id}>
                                    <td><span className="record-name">{c.name}</span></td>
                                    <td>{c.parentName ? <StatusBadge status={c.parentName} label={c.parentName} /> : <span className="text-muted" style={{ fontSize: 13 }}>None (Root)</span>}</td>
                                    <td style={{ maxWidth: 240 }}><span className="truncate block">{c.description || '—'}</span></td>
                                    <td><StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                                    {canManageCategories && (
                                        <td className="numeric">
                                            <div className="flex justify-end gap-1">
                                                <IconButton label="Edit category" onClick={() => { setSelectedCategory(c); setIsModalOpen(true); }}><Edit size={16} /></IconButton>
                                                <IconButton label="Deactivate category" onClick={() => handleDelete(c.id, c.name)}><Trash2 size={16} /></IconButton>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </div>

            {canManageCategories && (
                <CategoryFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchCategories}
                    initialData={selectedCategory}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default CategoryListPage;