import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import LandingPage         from './pages/LandingPage';
import MenuPage            from './pages/MenuPage';
import AdminLogin          from './pages/admin/AdminLogin';
import AdminRegister       from './pages/admin/AdminRegister';
import AdminDashboard      from './pages/admin/AdminDashboard';
import UpgradePage         from './pages/admin/UpgradePage';
import KitchenDisplay      from './pages/KitchenDisplay';
import StaffDashboard      from './pages/StaffDashboard';
import OrderTrackingPage   from './pages/OrderTrackingPage';
import MyOrders            from './pages/MyOrders';
import BookingPage         from './pages/BookingPage';
import BookingTrackPage    from './pages/BookingTrackPage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
});

function PrivateRoute({ children, roles }) {
  const { user, accessToken } = useAuthStore();
  const authed = !!accessToken && !!user;
  if (!authed) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right"
          toastOptions={{ style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <Routes>
          {/* Customer */}
          <Route path="/book/:slug"               element={<BookingPage />} />
          <Route path="/booking/:bookingId"         element={<BookingTrackPage />} />
          <Route path="/menu/:slug/table/:tableId" element={<MenuPage />} />
          <Route path="/menu/:slug"                element={<MenuPage />} />
          <Route path="/order/:slug/:orderId"      element={<OrderTrackingPage />} />

          {/* Auth */}
          <Route path="/admin/login"    element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />

          {/* Super admin */}
          <Route path="/superadmin/*" element={
            <PrivateRoute roles={['super_admin']}>
              <SuperAdminDashboard />
            </PrivateRoute>
          } />

          {/* Restaurant admin */}
          <Route path="/admin/*" element={
            <PrivateRoute roles={['admin', 'super_admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />

          {/* Upgrade / billing page */}
          <Route path="/admin/upgrade" element={
            <PrivateRoute roles={['admin']}>
              <UpgradePage />
            </PrivateRoute>
          } />

          {/* Staff dashboard */}
          <Route path="/staff" element={
            <PrivateRoute roles={['staff']}>
              <StaffDashboard />
            </PrivateRoute>
          } />

          {/* Kitchen display */}
          <Route path="/kitchen" element={
            <PrivateRoute roles={['admin', 'staff', 'kitchen']}>
              <KitchenDisplay />
            </PrivateRoute>
          } />

          {/* Customer order history */}
          <Route path="/my-orders/:slug" element={<MyOrders />} />
          <Route path="/my-orders"       element={<MyOrders />} />

          {/* Landing */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<div className="flex items-center justify-center h-screen text-white/40 text-xl">404 — Page not found</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}