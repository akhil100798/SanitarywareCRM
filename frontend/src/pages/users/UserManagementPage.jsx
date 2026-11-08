import React, { useEffect, useState } from 'react';
import { UserPlus, Save, UserRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';

const allRoles = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'];

const UserManagementPage = () => {
    const { user } = useAuthStore();
    const availableRoles = user?.role === 'ADMIN' ? allRoles : ['SALES', 'WAREHOUSE'];
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        username: '', email: '', fullName: '', phoneNumber: '', password: '', role: availableRoles[0],
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setUsers(await userService.list());
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not load user accounts');
        } finally {
            setLoading(false);
        }
    };

    const createUser = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            await userService.create(form);
            setForm({ username: '', email: '', fullName: '', phoneNumber: '', password: '', role: availableRoles[0] });
            toast.success('User account created');
            await loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not create user account');
        } finally {
            setSaving(false);
        }
    };

    const updateDraft = (id, changes) => {
        setUsers((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes, dirty: true } : entry));
    };

    const saveAccess = async (entry) => {
        try {
            await userService.updateAccess(entry.id, { role: entry.role, active: entry.active });
            toast.success(`Access updated for ${entry.username}`);
            await loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update user access');
            await loadUsers();
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">User management</h1>
                <p className="mt-1 text-sm text-slate-500">Create accounts and control role access. Passwords are never displayed.</p>
            </header>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <UserPlus className="text-teal-700" size={20} />
                    <h2 className="text-lg font-semibold">Create account</h2>
                </div>
                <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        ['fullName', 'Full name', 'text'], ['username', 'Username', 'text'],
                        ['email', 'Email', 'email'], ['phoneNumber', 'Phone number', 'tel'],
                        ['password', 'Temporary password', 'password'],
                    ].map(([key, label, type]) => (
                        <label key={key} className="block text-sm font-medium text-slate-700">
                            {label}
                            <input
                                required={key !== 'phoneNumber'}
                                type={type}
                                minLength={key === 'password' ? 8 : undefined}
                                maxLength={key === 'phoneNumber' ? 15 : undefined}
                                autoComplete={key === 'password' ? 'new-password' : 'off'}
                                value={form[key]}
                                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                            />
                        </label>
                    ))}
                    <label className="block text-sm font-medium text-slate-700">
                        Role
                        <select
                            value={form.role}
                            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                        >
                            {availableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </label>
                    <div className="flex items-end">
                        <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                            <UserPlus size={17} />{saving ? 'Creating…' : 'Create user'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-200 p-5">
                    <ShieldCheck className="text-teal-700" size={20} />
                    <h2 className="text-lg font-semibold">Accounts and access</h2>
                </div>
                {loading ? <p className="p-6 text-sm text-slate-500">Loading accounts…</p> : users.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">No managed accounts found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last login</th><th className="px-5 py-3">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-5 py-3"><div className="flex items-center gap-2"><UserRound size={16} className="text-slate-400" /><span><strong className="block text-slate-800">{entry.fullName}</strong><span className="text-xs text-slate-500">{entry.username}</span></span></div></td>
                                        <td className="px-5 py-3 text-slate-600">{entry.email}</td>
                                        <td className="px-5 py-3">
                                            <select value={entry.role} onChange={(event) => updateDraft(entry.id, { role: event.target.value })} className="rounded-md border border-slate-300 px-2 py-1" aria-label={`Role for ${entry.username}`}>
                                                {[...new Set([...availableRoles, entry.role])].map((role) => <option key={role} value={role}>{role}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-5 py-3">
                                            <button type="button" onClick={() => updateDraft(entry.id, { active: !entry.active })} className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} aria-label={`${entry.active ? 'Deactivate' : 'Activate'} ${entry.username}`}>
                                                {entry.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">{entry.lastLogin ? new Date(entry.lastLogin).toLocaleString() : 'Never'}</td>
                                        <td className="px-5 py-3"><button type="button" disabled={!entry.dirty} onClick={() => saveAccess(entry)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-teal-800 disabled:cursor-not-allowed disabled:text-slate-300"><Save size={15} />Save</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default UserManagementPage;
