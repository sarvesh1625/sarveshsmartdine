import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import OrdersPage       from './OrdersPage';
import MenuManager      from './MenuManager';
import TablesPage       from './TablesPage';
import AnalyticsPage    from './AnalyticsPage';
import SettingsPage     from './SettingsPage';
import BranchesPage      from './BranchesPage';
import BookingsAdminPage from './BookingsAdminPage';
import TrialBanner      from '../../components/admin/TrialBanner';
import TrialExpiredWall from '../../components/admin/TrialExpiredWall';

const NAV = [
  { to: '/admin',           icon: '⚡', label: 'Dashboard', exact: true },
  { to: '/admin/orders',    icon: '📋', label: 'Orders'   },
  { to: '/admin/menu',      icon: '🍽',  label: 'Menu'    },
  { to: '/admin/tables',    icon: '🪑', label: 'Tables'  },
  { to: '/admin/analytics', icon: '📊', label: 'Analytics'},
  { to: '/admin/settings',  icon: '⚙️',  label: 'Settings'},
  { to: '/admin/bookings',  icon: '📅',  label: 'Bookings'},

];

function Sidebar({ onClose }) {
  const { user, logout, refreshPlan } = useAuthStore();
  const { data: sidebarBilling } = useQuery({
    queryKey: ['billing-status'],
    queryFn:  () => api.get('/billing/status').then(r => r.data.data),
    staleTime: 60 * 1000,
  });
  const activePlan   = sidebarBilling?.planType || user?.planType || 'free';
  const isEnterprise = activePlan === 'enterprise';

  // Sync user planType on mount if stale
  useEffect(() => { refreshPlan?.(); }, []);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const { switchToBranch } = useAuthStore();

  async function switchToMain() {
    try {
      // Switch back to root restaurant
      const { data } = await api.post('/restaurant/switch-branch', { branchId: user?.restaurantId });
      switchToBranch(data.data.accessToken, data.data.refreshToken, data.data.user);
      navigate('/admin/branches');
      window.location.reload(); // force fresh state
    } catch { navigate('/admin/branches'); }
  }

  // Detect if currently in a branch (has parentRestaurantId or branch_name)
  const isInBranch = !!user?.branchName || user?.restaurantName?.includes(' - ');

  return (
    <aside className="flex flex-col h-full w-60 bg-[#111] border-r border-white/5">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#e94560] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">M</span>
          </div>
          <div>
            <div className="text-white font-black text-sm">MenuVia</div>
            <div className="text-white/30 text-xs truncate max-w-[120px]">{user?.restaurantName}</div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-white/5 space-y-2">
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
          activePlan === 'free'       ? 'bg-white/10 text-white/50' :
          activePlan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                                        'bg-[#e94560]/20 text-[#e94560]'
        }`}>
          {activePlan.toUpperCase()} PLAN
        </span>
        {isEnterprise && (
          <NavLink to="/admin/branches"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <span>🏪</span>
            <span>Switch Branch</span>
          </NavLink>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {[
          ...NAV,
          ...(isEnterprise ? [{ to: '/admin/branches', icon: '🏪', label: 'Branches' }] : []),
        ].map(({ to, icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#e94560]/15 text-[#e94560] border border-[#e94560]/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`
            }>
            <span>{icon}</span>{label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#e94560]/20 flex items-center justify-center text-[#e94560] font-black text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-white/30 text-xs">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn:  () => api.get('/billing/status').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Show trial expired wall if trial is over and not on paid plan
  if (billing && !billing.hasAccess) {
    return <TrialExpiredWall />;
  }

  return (
    <div className="h-screen bg-[#0F0F0F] flex overflow-hidden text-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111]">
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white text-lg">
            ☰
          </button>
          <span className="text-white font-black">MenuVia</span>
          <div className="w-9" />
        </div>

        {/* Trial banner — shows days remaining */}
        <TrialBanner />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index       element={<DashboardHome />} />
            <Route path="orders"    element={<OrdersPage />} />
            <Route path="menu/*"    element={<MenuManager />} />
            <Route path="tables"    element={<TablesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings"  element={<SettingsPage />} />
            <Route path="branches"  element={<BranchesPage />} />
            <Route path="bookings"  element={<BookingsAdminPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DashboardHome() {
  const { user } = useAuthStore();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn:  () => api.get('/analytics/summary').then(r => r.data.data),
    refetchInterval: 30000,
  });
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recent-orders'],
    queryFn:  () => api.get('/orders?limit=5').then(r => r.data.data),
    refetchInterval: 20000,
  });
  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn:  () => api.get('/billing/status').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const STATUS_COLORS = {
    placed:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    preparing: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    ready:     'bg-green-500/15 text-green-400 border-green-500/25',
    delivered: 'bg-white/8 text-white/40 border-white/10',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white mb-0.5">
            Good {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-white/40 text-sm">{user?.restaurantName}</p>
        </div>
        {billing && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-xl border capitalize ${
            billing.planType === 'free' ? 'bg-white/5 border-white/10 text-white/40' :
            billing.planType === 'pro'  ? 'bg-[#e94560]/15 border-[#e94560]/25 text-[#e94560]' :
                                          'bg-purple-500/15 border-purple-500/25 text-purple-400'
          }`}>
            {billing.planType} plan
            {billing.isTrialActive && ` · ${billing.trialDaysLeft}d trial`}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '💰', label: "Today's revenue",  value: `₹${Number(summary?.today_revenue||0).toFixed(0)}`, color: 'text-green-400' },
          { icon: '📦', label: "Today's orders",   value: summary?.today_orders  || 0, color: 'text-white' },
          { icon: '📈', label: 'Total revenue',     value: `₹${Number(summary?.total_revenue||0).toFixed(0)}`, color: 'text-green-400' },
          { icon: '✅', label: 'Total orders',      value: summary?.total_orders  || 0, color: 'text-white' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="text-xl mb-2">{icon}</div>
            <div className={`text-2xl font-black mb-0.5 ${color}`}>{value ?? '—'}</div>
            <div className="text-white/35 text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: '📋', label: 'Orders',      to: '/admin/orders'    },
          { icon: '🍽',  label: 'Menu',        to: '/admin/menu'      },
          { icon: '🪑', label: 'Tables & QR', to: '/admin/tables'    },
          { icon: '📊', label: 'Analytics',    to: '/admin/analytics' },
        ].map(({ icon, label, to }) => (
          <NavLink key={to} to={to}
            className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex items-center gap-3 transition-all group">
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-white/70 text-sm font-semibold">{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold">Recent orders</h2>
            <NavLink to="/admin/orders" className="text-[#e94560] text-xs font-semibold hover:text-[#ff6b80]">
              View all →
            </NavLink>
          </div>
          <div className="space-y-2">
            {recentOrders.slice(0,5).map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-white font-bold text-sm">#{order.id.slice(0,8).toUpperCase()}</span>
                  {order.table_number && <span className="text-white/30 text-xs ml-2">Table {order.table_number}</span>}
                  <div className="text-white/40 text-xs mt-0.5">{order.customer_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">₹{order.final_amount}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg border capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.placed}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentOrders.length === 0 && (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🍽</div>
          <p className="text-white/50 font-semibold mb-1">No orders yet</p>
          <p className="text-white/30 text-sm">
            Add items to{' '}
            <NavLink to="/admin/menu" className="text-[#e94560] font-semibold">Menu</NavLink>
            {' '}and set up{' '}
            <NavLink to="/admin/tables" className="text-[#e94560] font-semibold">Tables</NavLink>
            {' '}to get started!
          </p>
        </div>
      )}
    </div>
  );
}