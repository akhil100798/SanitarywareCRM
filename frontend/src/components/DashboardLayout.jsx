import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
    LayoutDashboard,
    Users,
    Package,
    FileText,
    ShoppingCart,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Truck,
    ShoppingCart as ShoppingCartIcon, // Alias to avoid conflict if needed, used ShoppingCart earlier.
    CreditCard
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: Package, label: 'Products', path: '/products' },
        { icon: Truck, label: 'Distributors', path: '/distributors' },
        { icon: ShoppingCartIcon, label: 'Purchase Orders', path: '/purchase-orders' },
        { icon: CreditCard, label: 'Distributor Payments', path: '/distributor-payments' },
        { icon: FileText, label: 'Quotations', path: '/quotations' },
        { icon: ShoppingCart, label: 'Orders', path: '/orders' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-blue-700">
                        <h1 className="text-xl font-bold">CRM System</h1>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden p-1 rounded hover:bg-blue-700"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* User info */}
                    <Link to="/profile" className="block p-6 border-b border-blue-700 hover:bg-blue-800 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-lg font-semibold">
                                    {user?.fullName?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div>
                                <p className="font-medium">{user?.fullName}</p>
                                <p className="text-xs text-blue-300">{user?.role}</p>
                            </div>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 overflow-y-auto">
                        <ul className="space-y-2">
                            {menuItems.map((item) => (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <item.icon size={20} />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-blue-700">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-600 transition-colors w-full"
                        >
                            <LogOut size={20} />
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Main content */}
            <div className="lg:ml-64">
                {/* Top bar */}
                <header className="bg-white shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-semibold text-gray-800">Welcome to CRM</h2>
                        <div></div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
