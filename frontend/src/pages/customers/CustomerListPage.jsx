import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Mail, Phone, User } from 'lucide-react';
import customerService from '../../services/customerService';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { Table } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const CustomerListPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const confirm = useConfirm();
    const requestGeneration = useRef(0);

    useEffect(() => {
        fetchCustomers();
        return () => { requestGeneration.current += 1; };
    }, []);

    const fetchCustomers = async (query) => {
        const generation = ++requestGeneration.current;
        try {
            setLoading(true);
            setError(null);
            const response = query
                ? await customerService.search(query, { size: 100 })
                : await customerService.getAll({ size: 100 });
            if (generation === requestGeneration.current) setCustomers(response.data.content);
        } catch (error) {
            if (generation === requestGeneration.current) setError('Failed to load customers');
        } finally {
            if (generation === requestGeneration.current) setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchCustomers(searchQuery.trim() || undefined);
    };

    const handleDelete = async (id, name) => {
        const ok = await confirm(`Deactivate customer "${name}"? This will hide them from active lists.`, { confirmLabel: 'Deactivate', variant: 'danger' });
        if (!ok) return;
        try {
            await customerService.delete(id);
            toast.success('Customer deactivated');
            fetchCustomers(searchQuery.trim() || undefined);
        } catch (error) {
            toast.error('Failed to deactivate customer');
        }
    };

    return (
        <div>
            <PageHeader
                title="Customer Directory"
                description="Manage store clients, wholesalers, trade associations and credit files."
                actions={
                        <Button as={Link} to="/customers/new" data-testid="add-customer-primary" aria-label="Add customer from page header">
                            <Plus size={16} /> Add Customer
                        </Button>
                }
            />

            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput
                        label="Search customers"
                        placeholder="Search by name, email or phone..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSearch={handleSearch}
                        onClear={() => { setSearchQuery(''); fetchCustomers(); }}
                    />
                </div>

                {error ? (
                    <ErrorState message={error} onRetry={() => fetchCustomers(searchQuery.trim() || undefined)} />
                ) : loading ? (
                    <LoadingSkeleton rows={5} />
                ) : !customers.length ? (
                    <EmptyState
                        title="No customers found"
                        description={searchQuery ? 'Try a different search term.' : 'Add your first customer to get started.'}
                        action={!searchQuery && (
                                <Button as={Link} to="/customers/new"
                                    variant="secondary"
                                    data-testid="add-customer-empty-state"
                                    aria-label="Add your first customer"
                                >
                                    <Plus size={16} /> Add Customer
                                </Button>
                        )}
                    />
                ) : (
                    <Table caption="Customer directory">
                        <thead>
                            <tr>
                                <th>Customer Details</th>
                                <th>Contact Info</th>
                                <th>Type</th>
                                <th>Company</th>
                                <th>Status</th>
                                <th className="numeric">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id}>
                                    <td>
                                        <div className="record-name">{customer.name}</div>
                                        <div className="record-meta">{customer.city ? `${customer.city}${customer.state ? `, ${customer.state}` : ''}` : '—'}</div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <Mail size={12} className="text-muted" aria-hidden="true" />
                                            {customer.email || '—'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs mt-1">
                                            <Phone size={12} className="text-muted" aria-hidden="true" />
                                            {customer.phoneNumber || '—'}
                                        </div>
                                    </td>
                                    <td><StatusBadge status={customer.customerType || 'RETAIL'} /></td>
                                    <td className="text-sm">{customer.company || '—'}</td>
                                    <td><StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                                    <td className="numeric">
                                        <div className="flex justify-end gap-1">
                                            <IconButton as={Link} to={`/customers/edit/${customer.id}`} label="Edit customer"><Edit size={16} /></IconButton>
                                            <IconButton label="Deactivate customer" onClick={() => handleDelete(customer.id, customer.name)}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </div>
        </div>
    );
};

export default CustomerListPage;
