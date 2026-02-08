import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ModernLayout from './components/ModernLayout';
import ModernLogin from './pages/ModernLogin';
import ModernDashboard from './pages/ModernDashboard';
import FacilityDetail from './pages/FacilityDetail';
import StaffManagement from './pages/StaffManagement';
import ChangePassword from './pages/ChangePassword';
import { facilitiesAPI } from './utils/api';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Force password change if required
  if (user?.must_change_password && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" />;
  }

  return children;
}

function RoleBasedHome() {
  const { user } = useAuth();
  const [loadingFacility, setLoadingFacility] = useState(user?.role === 'User');
  const [firstFacilityId, setFirstFacilityId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFirstFacility = async () => {
      if (user?.role !== 'User') {
        setFirstFacilityId(null);
        setLoadingFacility(false);
        return;
      }

      setLoadingFacility(true);
      setError('');
      try {
        const response = await facilitiesAPI.getAll();
        const firstFacility = response.data?.[0];
        setFirstFacilityId(firstFacility?.id || null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load assigned facilities');
      } finally {
        setLoadingFacility(false);
      }
    };

    loadFirstFacility();
  }, [user?.role]);

  if (user?.role === 'Administrator' || user?.role === 'Manager') {
    return (
      <ModernLayout>
        <ModernDashboard />
      </ModernLayout>
    );
  }

  if (loadingFacility) {
    return (
      <ModernLayout>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading assigned facility...</p>
        </div>
      </ModernLayout>
    );
  }

  if (firstFacilityId) {
    return <Navigate to={`/facility/${firstFacilityId}`} replace />;
  }

  return (
    <ModernLayout>
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No facility assigned</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {error || 'No facility assigned. Please contact your administrator.'}
        </p>
      </div>
    </ModernLayout>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <ModernLogin />}
      />
      <Route
        path="/change-password"
        element={
          <PrivateRoute>
            <ChangePassword />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <RoleBasedHome />
          </PrivateRoute>
        }
      />
      <Route
        path="/facility/:id"
        element={
          <PrivateRoute>
            <ModernLayout>
              <FacilityDetail />
            </ModernLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <PrivateRoute>
            <ModernLayout>
              <StaffManagement />
            </ModernLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
