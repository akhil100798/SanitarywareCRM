import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock } from 'lucide-react';
import { PageHeader } from '../components/ui/Page';
import { PageSection } from '../components/ui/Page';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';

const ProfilePage = () => {
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', email: '', phoneNumber: '', currentPassword: '', newPassword: '', confirmPassword: ''
    });

    useEffect(() => {
        if (user) setFormData(prev => ({ ...prev, fullName: user.fullName || '', email: user.email || '', phoneNumber: user.phoneNumber || '' }));
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) { toast.error("Passwords don't match"); return; }
        try {
            setLoading(true);
            const updateData = {
                fullName: formData.fullName, email: formData.email, phoneNumber: formData.phoneNumber,
                currentPassword: formData.currentPassword, newPassword: formData.newPassword
            };
            const response = await authService.updateProfile(updateData);
            setUser({ ...user, fullName: response.data.fullName, email: response.data.email, phoneNumber: response.data.phoneNumber });
            toast.success('Profile updated');
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to update profile'); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <PageHeader title="My Profile" />
            <PageSection>
                <div className="flex items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="account-avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{user?.fullName?.charAt(0) || 'U'}</div>
                    <div>
                        <h2 className="font-bold text-lg">{user?.fullName}</h2>
                        <p className="text-secondary text-sm">{user?.role}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <h3 className="section-heading">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Full Name"><input type="text" name="fullName" required className="input-field" value={formData.fullName} onChange={handleChange} /></Field>
                            <Field label="Email"><input type="email" name="email" required className="input-field" value={formData.email} onChange={handleChange} /></Field>
                            <Field label="Phone"><input type="tel" name="phoneNumber" className="input-field" value={formData.phoneNumber} onChange={handleChange} /></Field>
                        </div>
                    </div>

                    <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <h3 className="section-heading">Change Password</h3>
                        <p className="text-sm text-secondary mb-4">Leave blank to keep current password.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Current Password"><input type="password" name="currentPassword" autoComplete="current-password" className="input-field" value={formData.currentPassword} onChange={handleChange} /></Field>
                            <Field label="New Password"><input type="password" name="newPassword" autoComplete="new-password" className="input-field" value={formData.newPassword} onChange={handleChange} /></Field>
                            <Field label="Confirm New Password"><input type="password" name="confirmPassword" autoComplete="new-password" className="input-field" value={formData.confirmPassword} onChange={handleChange} /></Field>
                        </div>
                    </div>

                    <div className="form-actions"><Button type="submit" loading={loading}>{loading ? 'Updating...' : 'Save Changes'}</Button></div>
                </form>
            </PageSection>
        </div>
    );
};

export default ProfilePage;