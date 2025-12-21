import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ModernLayout from './components/ModernLayout';
import ModernLogin from './pages/ModernLogin';
import ModernDashboard from './pages/ModernDashboard';
import FacilityDetail from './pages/FacilityDetail';
import StaffManagement from './pages/StaffManagement';
import ChangePassword from './pages/ChangePassword';

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
            <ModernLayout>
              <ModernDashboard />
            </ModernLayout>
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
