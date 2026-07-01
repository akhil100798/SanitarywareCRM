import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Droplet, Lock, User, Loader2 } from 'lucide-react';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            await login(username, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            const msg = error.response?.data?.message || 'Invalid username or password';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[45rem] h-[45rem] bg-teal/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-[35rem] h-[35rem] bg-blue-600/5 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="bg-slate-900 border border-slate-800 p-8.5 rounded-3xl shadow-2xl w-full max-w-md relative z-10 transition-all duration-300">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-teal p-3.5 rounded-2xl text-white shadow-xl shadow-teal/20 mb-4">
                        <Droplet size={28} className="fill-current" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">HydroSleek CRM</h1>
                    <p className="text-slate-400 text-sm mt-1.5">Sign in to manage sanitaryware records</p>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 text-red-300 rounded-2xl text-center text-xs font-semibold">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <User size={16} />
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-500 text-sm"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                <Lock size={16} />
                            </span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal bg-slate-950 text-slate-100 transition-all placeholder:text-slate-500 text-sm"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal text-white py-3 rounded-xl hover:bg-teal-800 transition-all font-semibold active:scale-[0.98] duration-150 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal/10"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-teal font-bold hover:text-teal-400 transition-colors">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
