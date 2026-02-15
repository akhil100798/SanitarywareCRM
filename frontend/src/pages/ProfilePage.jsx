import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Save } from 'lucide-react';

const ProfilePage = () => {
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.fullName || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || ''
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            toast.error("New passwords don't match");
            return;
        }

        try {
            setLoading(true);
            const updateData = {
                fullName: formData.fullName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            };

            const response = await authService.updateProfile(updateData);

            // Update local state and storage
            const updatedUser = {
                ...user,
                fullName: response.data.fullName,
                email: response.data.email,
                phoneNumber: response.data.phoneNumber // Ensure we capture phone if returned
            };

            // Update store
            setUser(updatedUser);

            toast.success('Profile updated successfully');

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center space-x-4 bg-gray-50">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
                        <p className="text-gray-500">{user?.role}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <User size={16} /> Full Name
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Mail size={16} /> Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Phone size={16} /> Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                        <p className="text-sm text-gray-500">Leave blank if you don't want to change your password.</p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Lock size={16} /> Current Password
                            </label>
                            <input
                                type="password"
                                name="currentPassword"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                placeholder="Required only if changing password"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors disabled:opacity-50 font-medium"
                        >
                            <Save size={20} />
                            <span>{loading ? 'Updating Profile...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
