import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function BranchesPage() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [switching, setSwitching] = useState(null);

  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn:  () => api.get('/billing/status').then(r => r.data.data),
    staleTime: 60 * 1000,
    retry: false,
  });

  const activePlan = billing?.planType || user?.planType || 'free';

  const { switchToBranch: storeSwitchBranch } = useAuthStore();

  async function switchToBranch(branch) {
    if (switching) return;
    setSwitching(branch.id);
    try {
      const { data } = await api.post('/restaurant/switch-branch', { branchId: branch.id });
      storeSwitchBranch(data.data.accessToken, data.data.refreshToken, data.data.user);
      qc.clear(); // clear all cached queries for fresh branch data
      toast.success(`Switched to ${data.data.user.restaurantName} 🏪`);
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to switch branch');
    } finally { setSwitching(null); }
  }

  // Only Enterprise plan can use multi-branch
  if (activePlan !== 'enterprise') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-20 bg-white/3 border border-purple-500/20 rounded-3xl px-8">
          <div className="w-20 h-20 rounded-3xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-4xl mx-auto mb-6">🏢</div>
          <h1 className="text-white font-black text-2xl mb-3">Multi-Branch Management</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-2 max-w-md mx-auto">
            Manage multiple restaurant locations from one dashboard. Each branch gets its own QR codes, menu, orders and analytics.
          </p>
          <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs font-bold px-4 py-2 rounded-full mt-2 mb-8">
            🔒 Enterprise Plan Only
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
            {[
              { icon: '🏪', title: 'Multiple Locations', desc: 'Add unlimited branches across cities' },
              { icon: '📊', title: 'Unified Analytics', desc: 'Revenue & orders across all branches' },
              { icon: '⚙️', title: 'Central Control', desc: 'Activate or pause any branch instantly' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-white font-bold text-sm mb-1">{title}</div>
                <div className="text-white/40 text-xs">{desc}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('/admin/upgrade')}
              className="bg-purple-500 hover:bg-purple-600 text-white font-black px-8 py-4 rounded-2xl text-sm transition-colors shadow-lg shadow-purple-500/30">
              Upgrade to Enterprise →
            </button>
            <button onClick={() => navigate('/admin')}
              className="bg-white/5 hover:bg-white/10 text-white/50 font-semibold px-6 py-4 rounded-2xl text-sm transition-colors">
              Back to Dashboard
            </button>
          </div>

          <p className="text-white/20 text-xs mt-6">
            Current plan: <span className="capitalize font-semibold text-white/40">{activePlan}</span>
            {activePlan === 'pro' && ' · Pro plan supports 1 restaurant location'}
          </p>
        </div>
      </div>
    );
  }
  const [showAdd,    setShowAdd]    = useState(false);
  const [selected,   setSelected]  = useState(null);
  const [form, setForm] = useState({ branch_name: '', branch_code: '', city: '', state: '', phone: '', address: '' });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn:  () => api.get('/restaurant/branches').then(r => r.data.data),
  });

  const addBranch = useMutation({
    mutationFn: () => api.post('/restaurant/branches', form),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['branches']);
      setShowAdd(false);
      setForm({ branch_name: '', branch_code: '', city: '', state: '', phone: '', address: '' });
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create branch'),
  });

  const toggleBranch = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/restaurant/branches/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries(['branches']),
    onError:   () => toast.error('Failed to update branch'),
  });

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-colors";

  const totalRevenue = branches.reduce((s, b) => s + Number(b.total_revenue || 0), 0);
  const totalOrders  = branches.reduce((s, b) => s + Number(b.total_orders  || 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Branch Management</h1>
          <p className="text-white/40 text-sm">Manage all your restaurant locations from one place</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-[#e94560] hover:bg-[#d63050] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
          + Add Branch
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Branches',  value: branches.length,                            icon: '🏪', color: 'text-white'     },
          { label: 'Active Branches', value: branches.filter(b => b.is_active).length,   icon: '✅', color: 'text-green-400' },
          { label: 'Total Orders',    value: totalOrders,                                icon: '📦', color: 'text-white'     },
          { label: 'Total Revenue',   value: `₹${Number(totalRevenue).toFixed(0)}`,      icon: '💰', color: 'text-green-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-2xl font-black mb-0.5 ${color}`}>{value}</div>
            <div className="text-white/35 text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Add branch form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 border border-[#e94560]/20 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              🏪 New Branch
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wider block mb-1.5">Branch Name *</label>
                <input className={inp} placeholder="e.g. Banjara Hills Branch"
                  value={form.branch_name} onChange={e => setForm(f => ({ ...f, branch_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wider block mb-1.5">Branch Code</label>
                <input className={inp} placeholder="e.g. BH-01"
                  value={form.branch_code} onChange={e => setForm(f => ({ ...f, branch_code: e.target.value }))} />
              </div>
              <div>
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wider block mb-1.5">City</label>
                <input className={inp} placeholder="Hyderabad"
                  value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wider block mb-1.5">State</label>
                <input className={inp} placeholder="Telangana"
                  value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div>
                <label className="text-white/40 text-xs font-semibold uppercase tracking-wider block mb-1.5">Phone</label>
                <input className={inp} placeholder="9876543210"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => addBranch.mutate()} disabled={!form.branch_name || addBranch.isPending}
                className="bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors flex items-center gap-2">
                {addBranch.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : 'Create Branch'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-3 bg-white/5 text-white/50 rounded-xl text-sm hover:bg-white/10 transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branches list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-20 bg-white/3 border border-white/5 rounded-2xl">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-white font-bold mb-2">No branches yet</h2>
          <p className="text-white/30 text-sm mb-5">Add your first branch to start managing multiple locations.</p>
          <button onClick={() => setShowAdd(true)} className="bg-[#e94560] text-white font-bold px-6 py-3 rounded-xl text-sm">
            + Add First Branch
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch, i) => (
            <motion.div key={branch.id} layout
              className={`bg-white/5 border rounded-2xl overflow-hidden cursor-pointer hover:bg-white/8 transition-all ${
                selected?.id === branch.id ? 'border-[#e94560]/40' : 'border-white/5'
              } ${!branch.is_active ? 'opacity-60' : ''}`}
              onClick={() => setSelected(s => s?.id === branch.id ? null : branch)}
            >
              <div className="p-5 flex items-center gap-4 flex-wrap">
                {/* Branch icon */}
                <div className="w-12 h-12 rounded-2xl bg-[#e94560]/15 border border-[#e94560]/20 flex items-center justify-center font-black text-[#e94560] text-lg flex-shrink-0">
                  {i === 0 ? '🏠' : '🏪'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-white font-bold">
                      {branch.branch_name || branch.name}
                    </span>
                    {i === 0 && <span className="text-xs bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/30 px-2 py-0.5 rounded-lg">Main</span>}
                    {branch.branch_code && <span className="text-xs bg-white/8 text-white/40 px-2 py-0.5 rounded-lg">{branch.branch_code}</span>}
                    {!branch.is_active && <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-lg">Inactive</span>}
                  </div>
                  <p className="text-white/35 text-xs">
                    {[branch.city, branch.state].filter(Boolean).join(', ') || 'Location not set'}
                    {branch.phone && ` · ${branch.phone}`}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-white font-bold text-sm">{branch.total_orders || 0}</div>
                    <div className="text-white/30 text-xs">orders</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-green-400 font-bold text-sm">₹{Number(branch.total_revenue || 0).toFixed(0)}</div>
                    <div className="text-white/30 text-xs">revenue</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-white font-bold text-sm">{branch.table_count || 0}</div>
                    <div className="text-white/30 text-xs">tables</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Manage button — switches admin context to this branch */}
                    <button
                      onClick={e => { e.stopPropagation(); switchToBranch(branch); }}
                      disabled={!branch.is_active || switching === branch.id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-[#e94560]/15 border-[#e94560]/30 text-[#e94560] hover:bg-[#e94560]/25 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                      {switching === branch.id
                        ? <><span className="w-3 h-3 border border-[#e94560]/40 border-t-[#e94560] rounded-full animate-spin" /> Switching...</>
                        : '⚡ Manage'
                      }
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); toggleBranch.mutate({ id: branch.id, is_active: !branch.is_active }); }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        branch.is_active
                          ? 'bg-white/5 border-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                          : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                      }`}>
                      {branch.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {selected?.id === branch.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/5">
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Branch Details</p>
                        <div className="space-y-2">
                          {[
                            ['Slug / URL', `localhost:3000/menu/${branch.slug}/table/1`],
                            ['Created',    dayjs(branch.created_at).format('DD MMM YYYY')],
                            ['Status',     branch.is_active ? '🟢 Active' : '🔴 Inactive'],
                          ].map(([k, v]) => (
                            <div key={k} className="flex gap-3 text-sm">
                              <span className="text-white/30 w-24 flex-shrink-0">{k}</span>
                              <span className="text-white/70 font-mono text-xs">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Quick Actions</p>
                        <div className="space-y-2">
                          <button className="w-full text-left text-xs font-semibold text-white/60 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                            onClick={() => window.open(`/menu/${branch.slug}/table/1`, '_blank')}>
                            🔗 View Menu →
                          </button>
                          <button className="w-full text-left text-xs font-semibold text-white/60 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
                            📊 View Analytics →
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-purple-500/8 border border-purple-500/20 rounded-2xl p-5">
        <p className="text-purple-400 text-xs font-bold mb-2">🏢 Enterprise Feature</p>
        <p className="text-white/40 text-sm leading-relaxed">
          Multi-branch management is available on the <span className="text-purple-400 font-semibold">Enterprise plan</span>.
          Each branch gets its own QR codes, menu, orders and analytics — all manageable from this single dashboard.
        </p>
      </div>
    </div>
  );
}