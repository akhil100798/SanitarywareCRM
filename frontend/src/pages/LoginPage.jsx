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
        <div className="auth-layout">
            <div className="auth-intro">
                <div>
                    <div className="brand-mark" style={{ width: 48, height: 48, borderRadius: 12 }}>
                        <Droplet size={26} />
                    </div>
                    <h2>Enterprise Sanitaryware Management</h2>
                    <p>Centralised CRM for inventory, sales, purchasing and financial tracking across your sanitaryware business.</p>
                </div>
                <div>
                    <p style={{ fontSize: 13, color: '#aebfce' }}>
                        HydroSleek CRM v2.0 &mdash; Secure enterprise platform
                    </p>
                </div>
            </div>
            <div className="auth-content">
                <div className="auth-form">
                    <h1>Sign in</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Access your CRM dashboard</p>

                    {errorMsg && (
                        <div className="error-panel" style={{ marginTop: 20 }} role="alert">
                            <p>{errorMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="field">
                            <label className="field-label" htmlFor="username">Username</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} aria-hidden="true" />
                                <input
                                    id="username"
                                    type="text"
                                    name="username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: 36 }}
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} aria-hidden="true" />
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field"
                                    style={{ paddingLeft: 36 }}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary btn-lg">
                            {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Don't have an account?{' '}
                        <Link to="/register">Create account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;