import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { Droplet, Lock, User, Mail, Phone, Loader2 } from 'lucide-react';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authService.register(formData);
            toast.success('Registration successful! Please sign in.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
            {/* Background glowing elements */}
            <div className="absolute top-0 right-0 w-[45rem] h-[45rem] bg-teal/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-[35rem] h-[35rem] bg-blue-600/5 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 transition-all duration-300">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-teal p-3.5 rounded-2xl text-white shadow-xl shadow-teal/20 mb-4">
                        <Droplet size={28} className="fill-current" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Account</h1>
                    <p className="text-slate-400 text-sm mt-1.5">Join HydroSleek Sanitaryware CRM</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Full Name
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <User size={16} />
                            </span>
                            <input
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-600 text-sm"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <User size={16} />
                            </span>
                            <input
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-600 text-sm"
                                placeholder="johndoe"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Email Address
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <Mail size={16} />
                            </span>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-600 text-sm"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Phone Number
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <Phone size={16} />
                            </span>
                            <input
                                name="phoneNumber"
                                type="text"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-600 text-sm"
                                placeholder="9000000000"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <Lock size={16} />
                            </span>
                            <input
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-600 text-sm"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal text-white py-3 rounded-xl hover:bg-teal-800 transition-all font-semibold active:scale-[0.98] duration-150 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal/10 animate-fade-in"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            'Register'
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="text-teal font-bold hover:text-teal-400 transition-colors">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
