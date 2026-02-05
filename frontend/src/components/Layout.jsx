import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { facilitiesAPI } from '../utils/api';
import {
  Home,
  Building2,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

export default function Layout({ children }) {
  const [facilities, setFacilities] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold">FacilityHub</h2>
          <p className="text-sm text-gray-400 mt-1">{user?.role}</p>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {/* Dashboard Link */}
          <Link
            to="/"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
              isActive('/')
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800'
            }`}
          >
            <Home size={20} />
            <span>Dashboard</span>
          </Link>

          {/* Facilities Section */}
          <div className="pt-4">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
              Facilities
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {facilities.map((facility) => (
                <Link
                  key={facility.id}
                  to={`/facility/${facility.id}`}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    isActive(`/facility/${facility.id}`)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <Building2 size={18} />
                  <span className="truncate">{facility.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-800 rounded-lg transition flex-shrink-0"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <h1 className="text-xl font-semibold text-gray-800">
            {location.pathname === '/' ? 'Overview' : ''}
          </h1>

          <div className="w-10" /> {/* Spacer for alignment */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
