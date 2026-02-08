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
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadFacilities();
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => {
      setIsMobile(event.matches);
      setSidebarOpen(!event.matches);
    };
    handleViewportChange(mediaQuery);
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
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
  const activeFacility = facilities.find((facility) => isActive(`/facility/${facility.id}`));

  const handleNavClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard Overview';
    if (location.pathname === '/staff') return 'Staff Management';
    if (activeFacility?.name) return activeFacility.name;
    if (location.pathname.startsWith('/facility/')) return 'Facility Details';
    return 'Facility Management';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu backdrop"
        />
      )}

      {/* Modern Sidebar */}
      <div
        className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col overflow-hidden ${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-72 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${sidebarOpen ? 'w-64' : 'w-0'} relative`
        }`}
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
        <nav className="p-2 md:p-3 space-y-1 flex-1 overflow-y-auto">
          {/* Dashboard Link (Admin and Manager) */}
          {(user?.role === 'Administrator' || user?.role === 'Manager') && (
            <Link
              to="/"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive('/')
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              } min-h-[44px]`}
            >
              <Home size={20} className={isActive('/') ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} />
              <span className="font-medium">Dashboard</span>
            </Link>
          )}

          {/* Staff Management Link (Admin only) */}
          {user?.role === 'Administrator' && (
            <Link
              to="/staff"
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive('/staff')
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              } min-h-[44px]`}
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
                  onClick={handleNavClick}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive(`/facility/${facility.id}`)
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  } min-h-[44px]`}
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

        {/* User Section - flex-shrink-0 keeps it at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="p-3">
            <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
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
                className="p-2.5 min-h-[44px] min-w-[44px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
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
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div>
                <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {getPageTitle()}
                </h1>
                {isMobile && activeFacility?.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[55vw]">
                    {activeFacility.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-3 md:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
