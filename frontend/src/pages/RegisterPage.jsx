import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { Droplet, Lock, User, Mail, Phone, Loader2 } from 'lucide-react';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', fullName: '', phoneNumber: '', role: 'SALES',
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const iconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' };

    return (
        <div className="auth-layout">
            <div className="auth-intro">
                <div>
                    <div className="brand-mark" style={{ width: 48, height: 48, borderRadius: 12 }}>
                        <Droplet size={26} />
                    </div>
                    <h2>Create your account</h2>
                    <p>Register to start managing customers, inventory, quotations and orders for your sanitaryware business.</p>
                </div>
                <div>
                    <p style={{ fontSize: 13, color: '#aebfce' }}>
                        First account is granted administrator access.
                    </p>
                </div>
            </div>
            <div className="auth-content">
                <div className="auth-form">
                    <h1>Create Account</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Join HydroSleek Sanitaryware CRM</p>

                    <form onSubmit={handleSubmit}>
                        <div className="field">
                            <label className="field-label" htmlFor="fullName">Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={iconStyle} aria-hidden="true" />
                                <input id="fullName" name="fullName" type="text" autoComplete="name" value={formData.fullName} onChange={handleChange} className="input-field" style={{ paddingLeft: 36 }} placeholder="John Doe" required />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="username">Username</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={iconStyle} aria-hidden="true" />
                                <input id="username" name="username" type="text" autoComplete="username" value={formData.username} onChange={handleChange} className="input-field" style={{ paddingLeft: 36 }} placeholder="johndoe" required />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="email">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={iconStyle} aria-hidden="true" />
                                <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} className="input-field" style={{ paddingLeft: 36 }} placeholder="john@example.com" required />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="phoneNumber">Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={iconStyle} aria-hidden="true" />
                                <input id="phoneNumber" name="phoneNumber" type="text" autoComplete="tel" value={formData.phoneNumber} onChange={handleChange} className="input-field" style={{ paddingLeft: 36 }} placeholder="9000000000" />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={iconStyle} aria-hidden="true" />
                                <input id="password" name="password" type="password" autoComplete="new-password" value={formData.password} onChange={handleChange} className="input-field" style={{ paddingLeft: 36 }} placeholder="••••••••" required minLength={6} />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="role">Role</label>
                            <select id="role" name="role" value={formData.role} onChange={handleChange} className="input-field">
                                <option value="SALES">Sales</option>
                                <option value="WAREHOUSE">Warehouse</option>
                                <option value="MANAGER">Manager</option>
                                <option value="ADMIN">Administrator</option>
                            </select>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary btn-lg">
                            {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                            {loading ? 'Creating Account...' : 'Register'}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Already have an account?{' '}
                        <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
