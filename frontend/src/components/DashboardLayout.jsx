import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
    LayoutDashboard,
    Users,
    Package,
    FolderTree,
    FileText,
    ShoppingCart,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Truck,
    ShoppingCart as ShoppingCartIcon,
    CreditCard,
    Droplet
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: Package, label: 'Products', path: '/products' },
        { icon: FolderTree, label: 'Categories', path: '/categories' },
        { icon: Truck, label: 'Distributors', path: '/distributors' },
        { icon: ShoppingCartIcon, label: 'Purchase Orders', path: '/purchase-orders' },
        { icon: CreditCard, label: 'Distributor Payments', path: '/distributor-payments' },
        { icon: FileText, label: 'Quotations', path: '/quotations' },
        { icon: ShoppingCart, label: 'Orders', path: '/orders' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-slate-100 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                        <Link to="/dashboard" className="flex items-center space-x-2.5">
                            <div className="bg-teal p-2 rounded-xl text-white shadow-lg shadow-teal/20">
                                <Droplet size={20} className="fill-current" />
                            </div>
                            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                                HydroSleek CRM
                            </span>
                        </Link>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* User info */}
                    <Link to="/profile" className="block p-5 border-b border-slate-800 hover:bg-slate-800/40 transition-all cursor-pointer">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal to-teal-400 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                {user?.fullName?.charAt(0) || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-slate-200 truncate text-sm">{user?.fullName}</p>
                                <span className="inline-block mt-0.5 text-xxs font-extrabold tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md uppercase">
                                    {user?.role}
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 overflow-y-auto space-y-1">
                        <ul className="space-y-1">
                            {menuItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group ${isActive
                                                    ? 'bg-teal text-white shadow-md shadow-teal/10'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                                }`}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950/20">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold text-sm transition-all w-full active:scale-[0.98]"
                        >
                            <LogOut size={18} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

const DashboardLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const location = useLocation();

    // Map pathname to friendly header title
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/dashboard') return 'Dashboard Overview';
        if (path.startsWith('/customers')) return 'Customer Directory';
        if (path.startsWith('/products')) return 'Product Catalog';
        if (path.startsWith('/categories')) return 'Inventory Categories';
        if (path.startsWith('/brands')) return 'Brand Management';
        if (path.startsWith('/distributors')) return 'Supplier Directory';
        if (path.startsWith('/purchase-orders')) return 'Purchase Orders';
        if (path.startsWith('/distributor-payments')) return 'Supplier Payments';
        if (path.startsWith('/quotations')) return 'Sales Quotations';
        if (path.startsWith('/orders')) return 'Customer Orders';
        if (path.startsWith('/settings')) return 'System Settings';
        if (path.startsWith('/profile')) return 'My Account';
        return 'CRM Panel';
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Main content */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                {/* Top bar - Glassmorphic */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
                    <div className="flex items-center justify-between px-6 py-4.5">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all active:scale-95"
                            >
                                <Menu size={20} />
                            </button>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{getPageTitle()}</h2>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-semibold text-slate-500">Live Database Connection</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6 flex-1 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
