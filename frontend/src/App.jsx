import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { IoTProvider } from '@/context/IoTContext';
import AppLayout from '@/components/layout/AppLayout';

const Login          = lazy(() => import('@/pages/Login'));
const AuthCallback   = lazy(() => import('@/pages/AuthCallback'));
const Dashboard      = lazy(() => import('@/pages/Dashboard'));
const Gateways       = lazy(() => import('@/pages/Gateways'));
const Devices        = lazy(() => import('@/pages/Devices'));
const Analytics      = lazy(() => import('@/pages/Analytics'));
const DigitalTwin    = lazy(() => import('@/pages/DigitalTwin'));
const Maintenance    = lazy(() => import('@/pages/Maintenance'));
const ESGCarbon      = lazy(() => import('@/pages/ESGCarbon'));
const Reports        = lazy(() => import('@/pages/Reports'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const Settings       = lazy(() => import('@/pages/Settings'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={
          <ProtectedRoute>
            <IoTProvider>
              <AppLayout />
            </IoTProvider>
          </ProtectedRoute>
        }>
          <Route index               element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="gateways"     element={<Gateways />} />
          <Route path="devices"      element={<Devices />} />
          <Route path="analytics"    element={<Analytics />} />
          <Route path="digital-twin" element={<DigitalTwin />} />
          <Route path="maintenance"  element={<Maintenance />} />
          <Route path="esg"          element={<ESGCarbon />} />
          <Route path="reports"      element={<Reports />} />
          <Route path="users"        element={<UserManagement />} />
          <Route path="settings"     element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#16161f', color: '#e2e8f0', border: '1px solid #2a2a3a', fontSize: 13 },
            success: { iconTheme: { primary: '#22c55e', secondary: '#16161f' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#16161f' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
