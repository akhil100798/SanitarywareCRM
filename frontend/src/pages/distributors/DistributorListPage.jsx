import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Filter } from 'lucide-react';
import distributorService from '../../services/distributorService';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/ui/Page';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchInput } from '../../components/ui/Field';
import { Button, IconButton } from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';

const DistributorListPage = () => {
    const [distributors, setDistributors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const confirm = useConfirm();

    useEffect(() => { fetchDistributors(); }, []);

    const fetchDistributors = async (query = '') => {
        try { setLoading(true); setError(null); const response = await distributorService.getAllDistributors(0, 100, query); setDistributors(response.content); }
        catch (error) { setError('Failed to load distributors'); }
        finally { setLoading(false); }
    };

    const handleSearch = () => fetchDistributors(searchQuery);

    const handleToggleStatus = async (id, name) => {
        const ok = await confirm(`Toggle status for ${name}?`, { confirmLabel: 'Toggle', variant: 'warning' });
        if (!ok) return;
        try { await distributorService.toggleActiveStatus(id); toast.success('Status updated'); fetchDistributors(searchQuery); }
        catch (error) { toast.error('Failed to update status'); }
    };

    const handleDelete = async (id, name) => {
        const ok = await confirm(`Delete distributor "${name}"?`, { confirmLabel: 'Delete', variant: 'danger' });
        if (!ok) return;
        try { await distributorService.deleteDistributor(id); toast.success('Distributor deleted'); fetchDistributors(searchQuery); }
        catch (error) { toast.error('Failed to delete distributor'); }
    };

    return (
        <div>
            <PageHeader title="Distributors" description="Manage your suppliers and distributors."
                actions={<Button as={Link} to="/distributors/new"><Plus size={16} /> Add Distributor</Button>} />
            <div className="table-panel">
                <div className="filter-bar">
                    <SearchInput label="Search distributors" placeholder="Search by name or phone..." value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} onClear={() => { setSearchQuery(''); fetchDistributors(); }} />
                </div>
                {error ? (<ErrorState message={error} onRetry={() => fetchDistributors(searchQuery)} />)
                : loading ? (<LoadingSkeleton rows={5} />)
                : !distributors.length ? (
                    <EmptyState title={searchQuery ? 'No matching distributors' : 'No distributors found'} description={searchQuery ? 'Try a different search term.' : 'Add your first distributor.'} />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table" style={{ minWidth: 800 }}>
                            <thead>
                                <tr>
                                    <th>Distributor</th>
                                    <th>Contact</th>
                                    <th>Location</th>
                                    <th className="numeric">Balance</th>
                                    <th>Status</th>
                                    <th className="numeric">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distributors.map(d => (
                                    <tr key={d.id}>
                                        <td>
                                            <div className="record-name">{d.name}</div>
                                            <div className="record-meta">Contact: {d.contactPerson || '—'}</div>
                                            {d.gstNumber && <div className="record-meta">GST: {d.gstNumber}</div>}
                                        </td>
                                        <td>
                                            {d.email && <div className="flex items-center gap-1 text-sm"><Mail size={12} className="text-muted" /> {d.email}</div>}
                                            <div className="flex items-center gap-1 text-sm mt-1"><Phone size={12} className="text-muted" /> {d.phoneNumber}</div>
                                        </td>
                                        <td className="flex items-start gap-1 text-sm"><MapPin size={12} className="mt-1 text-muted" /> {d.city ? `${d.city}, ${d.state || ''}` : d.state || '—'}</td>
                                        <td className="numeric"><span className="font-semibold" style={{ color: d.outstandingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{(d.outstandingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                                        <td><StatusBadge status={d.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                                        <td className="numeric">
                                            <div className="flex justify-end gap-1">
                                                <IconButton as={Link} to={`/distributors/edit/${d.id}`} label="Edit distributor"><Edit size={16} /></IconButton>
                                                <IconButton label="Toggle status" onClick={() => handleToggleStatus(d.id, d.name)}>S</IconButton>
                                                <IconButton label="Delete distributor" onClick={() => handleDelete(d.id, d.name)}><Trash2 size={16} /></IconButton>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DistributorListPage;
