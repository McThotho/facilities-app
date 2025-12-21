import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { facilitiesAPI } from '../utils/api';
import {
  Home,
  Building2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight,
  Users
} from 'lucide-react';

export default function ModernLayout({ children }) {
  const [facilities, setFacilities] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      const response = await facilitiesAPI.getAll();
      setFacilities(response.data);
    } catch (error) {
      console.error('Failed to load facilities:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Modern Sidebar */}
      <div
        className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Building2 className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">FacilityHub</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {/* Dashboard Link (Admin only) */}
          {user?.role === 'Administrator' && (
            <Link
              to="/"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive('/')
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Home size={20} className={isActive('/') ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} />
              <span className="font-medium">Dashboard</span>
            </Link>
          )}

          {/* Staff Management Link (Admin only) */}
          {user?.role === 'Administrator' && (
            <Link
              to="/staff"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive('/staff')
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Users size={20} className={isActive('/staff') ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'} />
              <span className="font-medium">Staff</span>
            </Link>
          )}

          {/* Facilities Section */}
          <div className="pt-4">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Facilities
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {facilities.length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-96 overflow-y-auto scrollbar-thin">
              {facilities.map((facility) => (
                <Link
                  key={facility.id}
                  to={`/facility/${facility.id}`}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive(`/facility/${facility.id}`)
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Building2 size={18} className={isActive(`/facility/${facility.id}`) ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} />
                    <span className="truncate font-medium">{facility.name}</span>
                  </div>
                  {isActive(`/facility/${facility.id}`) && (
                    <ChevronRight size={16} className="text-white flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 w-64 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="p-3">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Top Bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {location.pathname === '/' ? 'Dashboard Overview' : 'Facility Management'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
