import { useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const PLAN_COLORS = {
  free:       'bg-white/10 text-white/60 border-white/10',
  pro:        'bg-[#e94560]/20 text-[#e94560] border-[#e94560]/30',
  enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};
const fmt     = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
function Skeleton({ h = '16px', w = '100%' }) {
  return <div className="bg-white/10 rounded animate-pulse" style={{ height: h, width: w }} />;
}
function StatCard({ icon, label, value, color = 'text-white' }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
      <div className="text-2xl mb-3">{icon}</div>
      <div className={`text-2xl font-black mb-0.5 ${color}`}>
        {value == null ? <Skeleton h="28px" w="80px" /> : value}
      </div>
      <div className="text-white/40 text-xs">{label}</div>
    </div>
  );
}

const NAV = [
  { to: '/superadmin',             icon: '⚡', label: 'Overview',      exact: true },
  { to: '/superadmin/restaurants', icon: '🏪', label: 'Restaurants'               },
  { to: '/superadmin/analytics',   icon: '📊', label: 'Platform Stats'            },
];

function Sidebar({ onClose }) {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  return (
    <aside className="flex flex-col h-full w-60 bg-[#111] border-r border-white/5">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">S</span>
          </div>
          <div>
            <div className="text-white font-black text-sm">MenuCloud</div>
            <div className="text-purple-400 text-xs font-semibold">Super Admin</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                         : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            <span>{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-purple-400 text-xs">super_admin</p>
          </div>
        </div>
        <button onClick={async () => { await useAuthStore.getState().logout(); navigate('/admin/login'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function SuperAdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="h-screen bg-[#0F0F0F] flex overflow-hidden text-white">
      <div className="hidden lg:flex flex-shrink-0"><Sidebar /></div>
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111]">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white text-lg">☰</button>
          <span className="text-white font-black">Super Admin</span>
          <div className="w-9" />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index              element={<Overview />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="analytics"   element={<PlatformAnalytics />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ── OVERVIEW ── */
function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ['sa-stats'],
    queryFn: () => api.get('/superadmin/stats').then(r => r.data.data),
    refetchInterval: 30000,
  });
  const d = data;
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-1">Platform Overview</h1>
        <p className="text-white/40 text-sm">All restaurants across MenuCloud</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon="🏪" label="Total restaurants"   value={isLoading ? null : d?.total_restaurants} />
        <StatCard icon="💳" label="Paid subscriptions"  value={isLoading ? null : d?.paid_restaurants}  color="text-[#e94560]" />
        <StatCard icon="📦" label="Today's orders"      value={isLoading ? null : d?.today_orders} />
        <StatCard icon="💰" label="Today's revenue"     value={isLoading ? null : fmt(d?.today_revenue)} color="text-green-400" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="📈" label="Total revenue"       value={isLoading ? null : fmt(d?.total_revenue)} color="text-green-400" />
        <StatCard icon="🧾" label="Total orders"        value={isLoading ? null : d?.total_orders} />
        <StatCard icon="🔴" label="Inactive restaurants" value={isLoading ? null : d?.inactive_restaurants} color="text-red-400" />
        <StatCard icon="👤" label="Restaurant admins"   value={isLoading ? null : d?.total_admins} />
      </div>
      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-bold mb-4">Subscription breakdown</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Free',       value: (d?.total_restaurants ?? 0) - (d?.paid_restaurants ?? 0), color: '#888',    cls: PLAN_COLORS.free       },
            { label: 'Pro',        value: d?.pro_restaurants        ?? 0,                           color: '#e94560', cls: PLAN_COLORS.pro        },
            { label: 'Enterprise', value: d?.enterprise_restaurants ?? 0,                           color: '#a855f7', cls: PLAN_COLORS.enterprise },
          ].map(({ label, value, color, cls }) => (
            <div key={label} className={`rounded-2xl border p-4 text-center ${cls}`}>
              <div className="text-3xl font-black mb-1" style={{ color }}>{isLoading ? '—' : value}</div>
              <div className="text-xs opacity-70">{label} plan</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-center">
        <p className="text-white/30 text-sm mb-3">Click any restaurant to view revenue, orders, items and manage their plan</p>
        <NavLink to="/superadmin/restaurants"
          className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          Manage all restaurants →
        </NavLink>
      </div>
    </div>
  );
}

/* ── RESTAURANTS ── */
function RestaurantsPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selected, setSelected]     = useState(null);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['sa-restaurants'],
    queryFn: () => api.get('/superadmin/restaurants').then(r => r.data.data),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['sa-restaurant-detail', selected?.id],
    queryFn: () => api.get(`/superadmin/restaurants/${selected.id}`).then(r => r.data.data),
    enabled: !!selected?.id,
  });

  const changePlan = useMutation({
    mutationFn: ({ id, plan_type }) => api.patch(`/superadmin/restaurants/${id}/plan`, { plan_type }),
    onSuccess: (_, v) => {
      qc.invalidateQueries(['sa-restaurants']);
      qc.invalidateQueries(['sa-restaurant-detail', v.id]);
      qc.invalidateQueries(['sa-stats']);
      toast.success(`Plan updated to ${v.plan_type}`);
      setSelected(r => r ? { ...r, plan_type: v.plan_type } : r);
    },
    onError: () => toast.error('Failed to update plan'),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/superadmin/restaurants/${id}/status`, { is_active }),
    onSuccess: (_, v) => {
      qc.invalidateQueries(['sa-restaurants']);
      qc.invalidateQueries(['sa-stats']);
      toast.success(`Restaurant ${v.is_active ? 'activated' : 'deactivated'}`);
      setSelected(r => r ? { ...r, is_active: v.is_active ? 1 : 0 } : r);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const filtered = restaurants.filter(r => {
    const q = search.toLowerCase();
    return (!search || [r.name, r.city, r.email, r.slug].some(v => v?.toLowerCase().includes(q)))
        && (!planFilter || r.plan_type === planFilter);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">All Restaurants</h1>
        <p className="text-white/40 text-sm">{restaurants.length} registered · click any row to drill into details</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, city, email, slug..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'free', 'pro', 'enterprise'].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${planFilter === p ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
              {p || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30"><div className="text-4xl mb-3">🔍</div><p>No restaurants found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <motion.div key={r.id} layout
              className={`bg-white/5 border rounded-2xl p-4 cursor-pointer hover:bg-white/8 transition-all ${!r.is_active ? 'border-red-500/20' : 'border-white/5'}`}
              onClick={() => setSelected(r)}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-white text-sm flex-shrink-0">
                  {r.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-white font-bold text-sm">{r.name}</span>
                    {!r.is_active && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white/40 text-xs">{r.email}</span>
                    {r.city && <span className="text-white/30 text-xs">📍 {r.city}{r.state ? `, ${r.state}` : ''}</span>}
                    <span className="text-white/25 text-xs">/{r.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-white font-bold text-sm">{r.total_orders ?? 0}</div>
                    <div className="text-white/30 text-xs">orders</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-green-400 font-bold text-sm">{fmt(r.total_revenue)}</div>
                    <div className="text-white/30 text-xs">revenue</div>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="text-white font-bold text-sm">{r.menu_item_count ?? 0}</div>
                    <div className="text-white/30 text-xs">items</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border uppercase ${PLAN_COLORS[r.plan_type]}`}>
                    {r.plan_type}
                  </span>
                  <span className="text-white/20">›</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Slide-in detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50" onClick={() => setSelected(null)} />
            <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 28 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#141414] border-l border-white/10 overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              <div className="sticky top-0 bg-[#141414] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-white">
                    {selected.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-white font-black leading-tight">{selected.name}</h2>
                    <p className="text-white/40 text-xs">/{selected.slug}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-xl w-8 h-8 flex items-center justify-center">✕</button>
              </div>

              <div className="p-6 space-y-5">
                {detailLoading ? (
                  <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
                ) : detail ? <>

                  {/* KPI grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total revenue',   value: fmt(detail.restaurant.total_revenue),   color: 'text-green-400'  },
                      { label: 'Total orders',    value: detail.restaurant.total_orders ?? 0,    color: 'text-white'      },
                      { label: 'Menu items',      value: detail.restaurant.menu_item_count ?? 0, color: 'text-white'      },
                      { label: 'Tables',          value: detail.restaurant.table_count ?? 0,     color: 'text-white'      },
                      { label: 'Staff',           value: detail.restaurant.staff_count ?? 0,     color: 'text-white'      },
                      { label: 'Avg rating',      value: detail.restaurant.avg_food_rating ? `${detail.restaurant.avg_food_rating}★` : '—', color: 'text-yellow-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white/5 rounded-xl p-3">
                        <div className={`text-lg font-black mb-0.5 ${color}`}>{value}</div>
                        <div className="text-white/40 text-xs">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Info */}
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-white font-bold text-sm mb-3">Restaurant info</h3>
                    {[
                      ['Email',       detail.restaurant.email || '—'],
                      ['Phone',       detail.restaurant.phone || '—'],
                      ['City',        detail.restaurant.city  || '—'],
                      ['State',       detail.restaurant.state || '—'],
                      ['Language',    (detail.restaurant.default_language || 'en').toUpperCase()],
                      ['Registered',  fmtDate(detail.restaurant.created_at)],
                      ['Last order',  fmtDate(detail.restaurant.last_order_at)],
                      ['Status',      detail.restaurant.is_active ? '🟢 Active' : '🔴 Inactive'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-white/40 text-xs">{label}</span>
                        <span className="text-white text-xs font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Revenue chart */}
                  {detail.revenueByDay?.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4">
                      <h3 className="text-white font-bold text-sm mb-4">Revenue — last 7 days</h3>
                      <MiniBarChart data={detail.revenueByDay} />
                    </div>
                  )}

                  {/* Top items */}
                  {detail.topItems?.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4">
                      <h3 className="text-white font-bold text-sm mb-3">Top selling items</h3>
                      <div className="space-y-2">
                        {detail.topItems.map((item, i) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <span className="text-white/30 text-xs w-4">#{i+1}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-white/80 font-semibold truncate">{item.name}</span>
                                <span className="text-white/50 flex-shrink-0 ml-2">{item.total_sold} sold · {fmt(item.revenue)}</span>
                              </div>
                              <div className="h-1 bg-white/10 rounded-full">
                                <div className="h-full bg-[#e94560] rounded-full"
                                  style={{ width: `${(item.total_sold / detail.topItems[0].total_sold) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent orders */}
                  {detail.recentOrders?.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4">
                      <h3 className="text-white font-bold text-sm mb-3">Recent orders</h3>
                      <div className="space-y-1.5">
                        {detail.recentOrders.map(o => (
                          <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                            <div>
                              <span className="text-white text-xs font-bold">#{o.id.slice(0,8).toUpperCase()}</span>
                              <span className="text-white/40 text-xs ml-2">{o.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-green-400 text-xs font-bold">{fmt(o.final_amount)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-lg border capitalize ${
                                o.status === 'delivered' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                o.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-white/10 text-white/50 border-white/10'}`}>{o.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff */}
                  {detail.staff?.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4">
                      <h3 className="text-white font-bold text-sm mb-3">Staff members</h3>
                      <div className="space-y-2">
                        {detail.staff.map(s => (
                          <div key={s.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-white text-xs font-semibold">{s.name}</p>
                              <p className="text-white/40 text-xs">{s.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-lg capitalize">{s.role}</span>
                              {!s.is_active && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-lg">Inactive</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Change plan */}
                  <div className="bg-white/5 rounded-2xl p-4">
                    <h3 className="text-white font-bold text-sm mb-3">Change subscription plan</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {['free', 'pro', 'enterprise'].map(plan => (
                        <button key={plan}
                          onClick={() => changePlan.mutate({ id: selected.id, plan_type: plan })}
                          disabled={changePlan.isPending || selected.plan_type === plan}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 capitalize ${
                            selected.plan_type === plan ? PLAN_COLORS[plan] + ' cursor-default' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                          }`}>
                          {selected.plan_type === plan ? '✓ ' : ''}{plan}
                        </button>
                      ))}
                    </div>
                    <div className="text-white/25 text-xs space-y-0.5">
                      <p>Free — 3 tables, 30 items, pay at counter only</p>
                      <p>Pro ₹999/mo — unlimited + UPI + analytics + AI</p>
                      <p>Enterprise ₹2999/mo — multi-branch + custom domain</p>
                    </div>
                  </div>

                  {/* Activate / Deactivate */}
                  <button
                    onClick={() => toggleStatus.mutate({ id: selected.id, is_active: !selected.is_active })}
                    disabled={toggleStatus.isPending}
                    className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 ${
                      selected.is_active
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                        : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                    }`}>
                    {toggleStatus.isPending ? 'Updating...' :
                      selected.is_active ? '🔴 Deactivate this restaurant' : '🟢 Activate this restaurant'}
                  </button>
                </> : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── mini bar chart ── */
function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => Number(d.revenue)), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-white/30 text-[9px] text-center leading-tight">{fmt(d.revenue)}</div>
          <div className="w-full bg-[#e94560] rounded-t-sm"
            style={{ height: `${Math.max((Number(d.revenue) / max) * 64, 3)}px` }} />
          <div className="text-white/30 text-[9px] text-center">
            {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── PLATFORM ANALYTICS ── */
function PlatformAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['sa-analytics'],
    queryFn: () => api.get('/superadmin/analytics').then(r => r.data.data),
  });
  const stats          = data?.stats;
  const topRestaurants = data?.topRestaurants ?? [];
  const revenueByDay   = data?.revenueByDay   ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Platform Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🏪" label="Total restaurants"  value={isLoading ? null : stats?.total_restaurants} />
        <StatCard icon="💳" label="Paid subscriptions" value={isLoading ? null : stats?.paid_restaurants}  color="text-[#e94560]" />
        <StatCard icon="📦" label="Today's orders"     value={isLoading ? null : stats?.today_orders} />
        <StatCard icon="💰" label="Today's revenue"    value={isLoading ? null : fmt(stats?.today_revenue)} color="text-green-400" />
      </div>

      {revenueByDay.length > 0 && (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-bold mb-5">Platform revenue — last 7 days</h2>
          <MiniBarChart data={revenueByDay} />
        </div>
      )}

      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-bold mb-5">Plan distribution</h2>
        <div className="space-y-4">
          {[
            { label: 'Free',       value: (stats?.total_restaurants ?? 0) - (stats?.paid_restaurants ?? 0), color: '#888'    },
            { label: 'Pro',        value: stats?.pro_restaurants        ?? 0,                               color: '#e94560' },
            { label: 'Enterprise', value: stats?.enterprise_restaurants ?? 0,                               color: '#a855f7' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/60">{label}</span>
                <span className="text-white font-bold">{value} restaurants</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats?.total_restaurants ? (value / stats.total_restaurants) * 100 : 0}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">Top restaurants by revenue</h2>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}</div>
        ) : topRestaurants.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No revenue data yet — orders will appear here once placed</p>
        ) : (
          <div className="space-y-3">
            {topRestaurants.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-white/30 text-sm font-bold w-5">#{i+1}</span>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                  {r.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-semibold truncate">{r.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border uppercase ${PLAN_COLORS[r.plan_type]}`}>{r.plan_type}</span>
                      <span className="text-green-400 text-xs font-bold">{fmt(r.total_revenue)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#e94560] rounded-full"
                      style={{ width: `${topRestaurants[0]?.total_revenue ? (r.total_revenue / topRestaurants[0].total_revenue) * 100 : 0}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-white/30 text-xs">{r.total_orders} orders</span>
                    {r.city && <span className="text-white/20 text-xs">📍 {r.city}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}