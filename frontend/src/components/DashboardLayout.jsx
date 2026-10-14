import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
    LayoutDashboard, Users, Package, FolderTree, FileText,
    ShoppingCart, BarChart3, Settings, LogOut, Menu, X,
    Truck, CreditCard, ShieldCheck, ChevronDown, User, Droplet
} from 'lucide-react';

const groups = [
    { label: 'Overview', items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'] },
    ]},
    { label: 'Sales', roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'], items: [
        { icon: Users, label: 'Customers', path: '/customers', roles: ['ADMIN', 'MANAGER', 'SALES'] },
        { icon: FileText, label: 'Quotations', path: '/quotations', roles: ['ADMIN', 'MANAGER', 'SALES'] },
        { icon: ShoppingCart, label: 'Orders', path: '/orders', roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'] },
        { icon: CreditCard, label: 'Payments', path: '/payments', roles: ['ADMIN', 'MANAGER', 'SALES'] },
    ]},
    { label: 'Catalogue', roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'], items: [
        { icon: Package, label: 'Products', path: '/products', roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'] },
        { icon: FolderTree, label: 'Categories', path: '/categories', roles: ['ADMIN', 'MANAGER', 'SALES'] },
    ]},
    { label: 'Purchasing', roles: ['ADMIN', 'MANAGER'], items: [
        { icon: Truck, label: 'Distributors', path: '/distributors', roles: ['ADMIN', 'MANAGER'] },
        { icon: Package, label: 'Purchase Orders', path: '/purchase-orders', roles: ['ADMIN', 'MANAGER'] },
        { icon: CreditCard, label: 'Distributor Payments', path: '/distributor-payments', roles: ['ADMIN', 'MANAGER'] },
    ]},
    { label: 'Insights', roles: ['ADMIN', 'MANAGER'], items: [
        { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['ADMIN', 'MANAGER'] },
    ]},
    { label: 'Administration', roles: ['ADMIN', 'MANAGER'], items: [
        { icon: ShieldCheck, label: 'Audit Logs', path: '/audit-logs', roles: ['ADMIN', 'MANAGER'] },
        { icon: Settings, label: 'Settings', path: '/settings', roles: ['ADMIN', 'MANAGER'] },
    ]},
];

function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try { await logout(); } finally { navigate('/login'); }
    };

    const isActive = path => location.pathname === path ||
        (path !== '/dashboard' && location.pathname.startsWith(path));

    const sidebar = (
        <aside className="app-sidebar" role="navigation" aria-label="Main navigation">
            <div className="brand-lockup">
                <div className="brand-mark"><Droplet size={20} /></div>
                <div className="brand-copy">
                    <div className="brand-name">HydroSleek</div>
                    <div className="brand-caption">Sanitaryware CRM</div>
                </div>
            </div>

            <Link to="/profile" className="sidebar-user" tabIndex={0} data-testid="profile-navigation-link">
                <div className="account-avatar">{user?.fullName?.charAt(0) || 'U'}</div>
                <div className="nav-label">
                    <div className="text-sm font-semibold text-white truncate">{user?.fullName}</div>
                    <div className="text-xs text-slate-400">{user?.role}</div>
                </div>
            </Link>

            <nav className="sidebar-nav">
                {groups.map(group => {
                    const visible = group.items.filter(item =>
                        !item.roles || item.roles.includes(user?.role)
                    );
                    if (!visible.length) return null;
                    const groupRoles = group.roles;
                    if (groupRoles && !groupRoles.includes(user?.role)) return null;
                    return (
                        <div key={group.label} className="nav-group">
                            <button className="nav-group-toggle" aria-label={`${group.label} section`}>
                                <span>{group.label}</span>
                            </button>
                            {visible.map(item => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className="nav-link"
                                    data-testid={`nav-${item.path.slice(1).replace(/\//g, '-')}`}
                                    aria-current={isActive(item.path) ? 'page' : undefined}
                                    onClick={() => onMobileClose?.()}
                                >
                                    <item.icon size={18} aria-hidden="true" />
                                    <span className="nav-label">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button onClick={handleLogout} className="nav-link" aria-label="Sign out">
                    <LogOut size={18} />
                    <span className="nav-label">Sign out</span>
                </button>
            </div>
        </aside>
    );

    if (mobileOpen) {
        return (
            <>
                <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={onMobileClose} />
                <dialog open className="dialog-drawer" style={{ zIndex: 50 }} onClose={onMobileClose}>
                    {sidebar}
                </dialog>
            </>
        );
    }

    return sidebar;
}

function TopBar({ onMenuClick }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const breadcrumb = (() => {
        const path = location.pathname;
        if (path === '/dashboard') return 'Dashboard';
        const seg = path.split('/').filter(Boolean);
        const group = groups.find(g => g.items.some(i => i.path.startsWith('/' + seg[0])));
        if (group) {
            const item = group.items.find(i => i.path === '/' + seg[0] || (seg[1] && i.path === '/' + seg[0]));
            if (item) {
                const label = item.label;
                if (seg[1] === 'new') return <><strong>{label}</strong><span className="text-slate-300">/</span>New {label.slice(0, -1)}</>;
                if (seg[1] === 'edit' && seg[2]) return <><strong>{label}</strong><span className="text-slate-300">/</span>Edit {label.slice(0, -1)}</>;
                return <strong>{label}</strong>;
            }
        }
        return path.split('/').filter(Boolean).map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' / ');
    })();

    return (
        <header className="topbar">
            <div className="flex items-center gap-3 min-w-0">
                <button className="mobile-nav-button" onClick={onMenuClick} aria-label="Open navigation menu">
                    <Menu size={20} />
                </button>
                <div className="breadcrumbs">{breadcrumb}</div>
            </div>
            <details className="account-menu" ref={menuRef} open={undefined} onToggle={e => setMenuOpen(e.target.open)}>
                <summary className="account-summary" aria-label="Account menu">
                    <span className="account-name text-sm font-semibold text-slate-700">{user?.fullName}</span>
                    <div className="account-avatar">{user?.fullName?.charAt(0) || 'U'}</div>
                </summary>
                {menuOpen && (
                    <div className="account-popover">
                        <Link to="/profile" onClick={() => setMenuOpen(false)}>
                            <User size={16} /> Profile
                        </Link>
                        <button onClick={async () => { setMenuOpen(false); try { await logout(); } finally { navigate('/login'); } }}>
                            <LogOut size={16} /> Sign out
                        </button>
                    </div>
                )}
            </details>
        </header>
    );
}

export default function DashboardLayout({ children }) {
    const [mobileNav, setMobileNav] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <AppSidebar
                collapsed={collapsed}
                mobileOpen={mobileNav}
                onMobileClose={() => setMobileNav(false)}
            />
            <div className="app-workspace">
                <TopBar onMenuClick={() => setMobileNav(true)} />
                <main id="main-content" className="app-main">{children}</main>
            </div>
        </div>
    );
}
