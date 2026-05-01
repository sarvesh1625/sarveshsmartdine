import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

/* ── constants ── */
const STATUS_COLORS = {
  placed:    { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400',  label: 'New'       },
  confirmed: { bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   text: 'text-blue-400',    label: 'Confirmed' },
  preparing: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400',  label: 'Cooking'   },
  ready:     { bg: 'bg-green-500/15',  border: 'border-green-500/30',  text: 'text-green-400',   label: 'Ready'     },
  delivered: { bg: 'bg-white/10',      border: 'border-white/10',      text: 'text-white/40',    label: 'Delivered' },
  cancelled: { bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400',     label: 'Cancelled' },
};
const NEXT_STATUS = { placed: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered' };
const TABS = [
  { key: 'overview',  icon: '⚡', label: 'Overview'      },
  { key: 'orders',    icon: '📋', label: 'Orders'        },
  { key: 'kitchen',   icon: '🍳', label: 'Kitchen Queue' },
];

/* ── elapsed timer ── */
function Timer({ createdAt }) {
  const [elapsed, setElapsed] = useState('');
  const [urgent,  setUrgent]  = useState(false);
  useEffect(() => {
    function tick() {
      const mins = dayjs().diff(dayjs(createdAt), 'minute');
      const secs = dayjs().diff(dayjs(createdAt), 'second') % 60;
      setElapsed(`${mins}:${String(secs).padStart(2,'0')}`);
      setUrgent(mins >= 15);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return (
    <span className={`text-xs font-mono font-bold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white/40'}`}>
      ⏱ {elapsed}
    </span>
  );
}

export default function StaffDashboard() {
  const { user, logout, accessToken } = useAuthStore();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const [tab,        setTab]        = useState('overview');
  const [connected,  setConnected]  = useState(false);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clock, setClock] = useState(dayjs());

  /* clock */
  useEffect(() => {
    const id = setInterval(() => setClock(dayjs()), 1000);
    return () => clearInterval(id);
  }, []);

  /* socket */
  useEffect(() => {
    const s = io('/', { auth: { token: accessToken } });
    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('new_order',  () => {
      qc.invalidateQueries(['staff-orders']);
      qc.invalidateQueries(['staff-kitchen']);
      beep(880, 2);
      toast('🔔 New order!', { style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }, duration: 4000 });
    });
    s.on('order_updated', () => {
      qc.invalidateQueries(['staff-orders']);
      qc.invalidateQueries(['staff-kitchen']);
    });
    s.on('waiter_call', data => {
      waiterBeep();
      setWaiterCalls(p => [{ ...data, id: Date.now(), time: new Date() }, ...p].slice(0, 5));
      toast(`${data.type === 'water' ? '💧' : data.type === 'bill' ? '🧾' : '🔔'} Table ${data.tableNumber} — ${data.type === 'water' ? 'Water' : data.type === 'bill' ? 'Bill' : 'Waiter'}`, {
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(234,179,8,0.3)' }, duration: 6000,
      });
    });
    return () => s.disconnect();
  }, [accessToken]);

  // Shared AudioContext — unlocked on first user interaction
  const audioCtxRef = useRef(null);

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  // Unlock audio on first click anywhere on page
  useEffect(() => {
    const unlock = () => { try { getAudioCtx(); } catch {} };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  function beep(freq, times) {
    try {
      const ctx = getAudioCtx();
      for (let i = 0; i < times; i++) {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.3;
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.25);
      }
    } catch {}
  }

  function waiterBeep() {
    try {
      const ctx = getAudioCtx();
      // 3 urgent ding sounds
      [880, 1100, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.22;
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
      });
    } catch {}
  }

  /* data */
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['staff-orders', statusFilter],
    queryFn:  () => api.get(`/orders${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data.data),
    refetchInterval: 20000,
  });

  const { data: kitchenQueue = [], isLoading: kitchenLoading } = useQuery({
    queryKey: ['staff-kitchen'],
    queryFn:  () => api.get('/orders/kitchen-queue').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['staff-orders']);
      qc.invalidateQueries(['staff-kitchen']);
      toast.success('Status updated');
      setSelectedOrder(null);
    },
    onError: () => toast.error('Failed to update status'),
  });

  /* derived stats */
  const activeOrders   = orders.filter(o => !['delivered','cancelled'].includes(o.status));
  const newOrders      = orders.filter(o => o.status === 'placed');
  const readyOrders    = orders.filter(o => o.status === 'ready');
  const todayRevenue   = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.final_amount), 0);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">

      {/* Waiter call FULL SCREEN alert — unmissable */}
      <AnimatePresence>
        {waiterCalls.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, y: 40 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-sm mx-4"
            >
              {/* Pulsing icon */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-400 animate-pulse text-5xl mb-3">
                  {waiterCalls[0].type === 'water' ? '💧' : waiterCalls[0].type === 'bill' ? '🧾' : '🔔'}
                </div>
                <div className="text-yellow-400 font-black text-3xl">
                  {waiterCalls[0].type === 'water' ? 'WATER' : waiterCalls[0].type === 'bill' ? 'BILL' : 'WAITER CALL'}
                </div>
                <div className="text-white text-xl font-bold mt-1">
                  Table {waiterCalls[0].tableNumber}
                </div>
                <div className="text-white/40 text-sm mt-1">{dayjs(waiterCalls[0].time).fromNow()}</div>
              </div>

              {/* If multiple calls queued */}
              {waiterCalls.length > 1 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 mb-4 text-center">
                  <span className="text-yellow-400 text-sm font-bold">+{waiterCalls.length - 1} more call{waiterCalls.length > 2 ? 's' : ''} waiting</span>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={() => setWaiterCalls(p => p.slice(1))}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black text-lg py-4 rounded-2xl transition-colors shadow-lg shadow-yellow-500/30"
              >
                ✓ Got it — On my way
              </button>

              {waiterCalls.length > 1 && (
                <button
                  onClick={() => setWaiterCalls([])}
                  className="w-full mt-2 text-white/30 text-sm py-2 hover:text-white/60 transition-colors"
                >
                  Dismiss all {waiterCalls.length} calls
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-[#111] border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center font-black text-blue-400 text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">{user?.name}</div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/30 text-xs">{connected ? 'Live' : 'Reconnecting...'} · {user?.restaurantName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Waiter call badge */}
          {waiterCalls.length > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-1.5 animate-pulse">
              <span className="text-yellow-400 text-xs font-bold">🔔 {waiterCalls.length} call{waiterCalls.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <span className="text-white/30 text-sm font-mono hidden sm:block">{clock.format('HH:mm:ss')}</span>
          <button onClick={handleLogout}
            className="text-white/30 hover:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all">
            Sign out
          </button>
        </div>
      </div>

      {/* Waiter call strip */}
      <AnimatePresence>
        {waiterCalls.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="bg-yellow-500/10 border-b border-yellow-500/20 overflow-hidden flex-shrink-0">
            <div className="px-4 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="text-yellow-400 text-xs font-black flex-shrink-0 animate-pulse">🔔 ATTENTION:</span>
              {waiterCalls.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-1.5 flex-shrink-0">
                  <span className="text-yellow-300 text-xs font-bold">T{c.tableNumber} — {c.type === 'water' ? '💧 Water' : c.type === 'bill' ? '🧾 Bill' : '🙋 Waiter'}</span>
                  <button onClick={() => setWaiterCalls(p => p.filter(x => x.id !== c.id))} className="text-yellow-500/50 hover:text-yellow-300 text-xs">✕</button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="bg-[#111] border-b border-white/5 px-4 flex gap-1 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              tab === t.key
                ? 'border-[#e94560] text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.key === 'orders' && newOrders.length > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-black px-1.5 py-0.5 rounded-full">{newOrders.length}</span>
            )}
            {t.key === 'kitchen' && readyOrders.length > 0 && (
              <span className="bg-green-500 text-black text-xs font-black px-1.5 py-0.5 rounded-full">{readyOrders.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-4 max-w-3xl mx-auto">

              <div className="mb-6">
                <h1 className="text-xl font-black text-white mb-0.5">
                  Good {dayjs().hour() < 12 ? 'morning' : dayjs().hour() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p className="text-white/40 text-sm">{user?.restaurantName} · Staff Dashboard</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Active orders',   value: activeOrders.length,                       color: 'text-white',        icon: '📦' },
                  { label: 'New / Waiting',   value: newOrders.length,                          color: 'text-yellow-400',   icon: '🆕' },
                  { label: 'Ready to serve',  value: readyOrders.length,                        color: 'text-green-400',    icon: '🍽' },
                  { label: "Today's served",  value: orders.filter(o=>o.status==='delivered').length, color: 'text-blue-400', icon: '✅' },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className={`text-2xl font-black mb-0.5 ${color}`}>{value}</div>
                    <div className="text-white/35 text-xs">{label}</div>
                  </div>
                ))}
              </div>

              {/* Ready to serve — urgent list */}
              {readyOrders.length > 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 mb-4">
                  <h3 className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="animate-pulse">🍽</span> Ready to serve — deliver these now!
                  </h3>
                  <div className="space-y-2">
                    {readyOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                        <div>
                          <span className="text-white font-bold text-sm">#{order.id.slice(0,6).toUpperCase()}</span>
                          {order.table_number && <span className="text-green-400 text-xs ml-2 font-bold">Table {order.table_number}</span>}
                          <div className="text-white/50 text-xs mt-0.5">{order.items?.map(i=>`${i.item_name_snapshot} ×${i.quantity}`).join(' · ')}</div>
                        </div>
                        <button onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
                          disabled={updateStatus.isPending}
                          className="bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 flex-shrink-0">
                          Mark Delivered ✓
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New orders — need confirmation */}
              {newOrders.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 mb-4">
                  <h3 className="text-yellow-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="animate-pulse">🆕</span> New orders — confirm these!
                  </h3>
                  <div className="space-y-2">
                    {newOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                        <div>
                          <span className="text-white font-bold text-sm">#{order.id.slice(0,6).toUpperCase()}</span>
                          {order.table_number && <span className="text-yellow-400 text-xs ml-2 font-bold">Table {order.table_number}</span>}
                          <div className="text-white/50 text-xs mt-0.5">{order.items?.map(i=>`${i.item_name_snapshot} ×${i.quantity}`).join(' · ')}</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => updateStatus.mutate({ id: order.id, status: 'confirmed' })}
                            disabled={updateStatus.isPending}
                            className="bg-yellow-500 text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50">
                            Confirm ✓
                          </button>
                          <button onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                            disabled={updateStatus.isPending}
                            className="bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All quiet */}
              {activeOrders.length === 0 && (
                <div className="text-center py-16 text-white/20">
                  <div className="text-5xl mb-3">✨</div>
                  <p className="font-bold text-lg mb-1">All caught up!</p>
                  <p className="text-sm">No active orders right now</p>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => setTab('orders')} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left hover:bg-white/8 transition-all">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-white font-bold text-sm">All Orders</div>
                  <div className="text-white/40 text-xs mt-0.5">View & manage</div>
                </button>
                <button onClick={() => setTab('kitchen')} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left hover:bg-white/8 transition-all">
                  <div className="text-2xl mb-2">🍳</div>
                  <div className="text-white font-bold text-sm">Kitchen Queue</div>
                  <div className="text-white/40 text-xs mt-0.5">{kitchenQueue.length} active</div>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── ORDERS TAB ── */}
          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-4 max-w-3xl mx-auto">

              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-black text-white">Orders</h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {['','placed','confirmed','preparing','ready','delivered'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 capitalize ${
                        statusFilter === s ? 'bg-[#e94560] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}>
                      {s || 'All'}
                    </button>
                  ))}
                </div>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse"/>)}</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20 text-white/30"><div className="text-4xl mb-3">📭</div><p>No orders</p></div>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => {
                    const sc = STATUS_COLORS[order.status] || STATUS_COLORS.placed;
                    return (
                      <motion.div key={order.id} layout
                        className="bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/8 transition-all"
                        onClick={() => setSelectedOrder(order)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-white font-black text-sm">#{order.id.slice(0,8).toUpperCase()}</span>
                              {order.table_number && <span className="text-white/40 text-xs">Table {order.table_number}</span>}
                              <span className="text-white/30 text-xs">{dayjs(order.created_at).fromNow()}</span>
                            </div>
                            <p className="text-white/50 text-xs mb-1">{order.customer_name}</p>
                            <p className="text-white/40 text-xs line-clamp-1">{order.items?.map(i=>`${i.item_name_snapshot} ×${i.quantity}`).join(' · ')}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${sc.bg} ${sc.border} ${sc.text}`}>
                              {sc.label}
                            </span>
                            <span className="text-white font-bold text-sm">₹{order.final_amount}</span>
                          </div>
                        </div>
                        {NEXT_STATUS[order.status] && (
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: NEXT_STATUS[order.status] }); }}
                            disabled={updateStatus.isPending}
                            className="mt-3 text-xs font-bold px-3 py-2 bg-[#e94560]/15 text-[#e94560] border border-[#e94560]/30 rounded-xl hover:bg-[#e94560]/25 transition-colors disabled:opacity-50">
                            Mark as {NEXT_STATUS[order.status]} →
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── KITCHEN TAB ── */}
          {tab === 'kitchen' && (
            <motion.div key="kitchen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-4">

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white">Kitchen Queue</h2>
                <span className="text-white/30 text-sm">{kitchenQueue.length} active orders</span>
              </div>

              {kitchenLoading ? (
                <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i=><div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse"/>)}</div>
              ) : kitchenQueue.length === 0 ? (
                <div className="text-center py-20 text-white/20"><div className="text-5xl mb-3">🍽</div><p className="font-bold">Kitchen is quiet</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kitchenQueue.map(order => {
                    const sc = STATUS_COLORS[order.status];
                    const urgent = dayjs().diff(dayjs(order.created_at), 'minute') >= 15;
                    return (
                      <div key={order.id} className={`bg-[#111] border rounded-2xl overflow-hidden ${urgent ? 'border-red-500/40' : sc.border}`}>
                        {urgent && (
                          <div className="bg-red-500/15 px-3 py-1.5 text-xs text-red-400 font-bold flex items-center gap-1.5">
                            <span className="animate-pulse">⚠</span> Waiting {dayjs().diff(dayjs(order.created_at), 'minute')} min
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <span className="text-white font-black">#{order.id.slice(0,6).toUpperCase()}</span>
                              {order.table_number && <span className={`text-xs font-bold ml-2 px-2 py-0.5 rounded-lg border ${sc.bg} ${sc.border} ${sc.text}`}>T{order.table_number}</span>}
                            </div>
                            <Timer createdAt={order.created_at} />
                          </div>

                          <div className="space-y-1.5 mb-3">
                            {order.items?.map((item,i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className={`text-xs font-black min-w-6 h-6 rounded-lg flex items-center justify-center px-1 flex-shrink-0 ${sc.bg} ${sc.border} ${sc.text} border`}>
                                  ×{item.quantity}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white/90 text-sm font-semibold leading-tight">{item.item_name_snapshot}</div>
                                  {item.customization_notes && <div className="text-white/40 text-xs italic mt-0.5">{item.customization_notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>

                          {order.special_instructions && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 mb-3 flex gap-2">
                              <span className="text-yellow-400 flex-shrink-0 text-xs">📝</span>
                              <span className="text-yellow-300 text-xs">{order.special_instructions}</span>
                            </div>
                          )}

                          {NEXT_STATUS[order.status] && (
                            <button onClick={() => updateStatus.mutate({ id: order.id, status: NEXT_STATUS[order.status] })}
                              disabled={updateStatus.isPending}
                              className={`w-full py-2.5 rounded-xl text-xs font-black border transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${sc.bg} ${sc.border} ${sc.text} hover:opacity-80`}>
                              {updateStatus.isPending
                                ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                : <>→ Mark as {NEXT_STATUS[order.status]}</>
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Order detail modal */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="px-5 pb-8">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-white font-black text-lg">#{selectedOrder.id.slice(0,8).toUpperCase()}</h3>
                    <p className="text-white/40 text-sm">{selectedOrder.customer_name} · {dayjs(selectedOrder.created_at).fromNow()}</p>
                  </div>
                  <div className={`text-xs font-bold px-3 py-1.5 rounded-xl border capitalize ${STATUS_COLORS[selectedOrder.status]?.bg} ${STATUS_COLORS[selectedOrder.status]?.border} ${STATUS_COLORS[selectedOrder.status]?.text}`}>
                    {STATUS_COLORS[selectedOrder.status]?.label}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-white/5 rounded-2xl p-4 mb-4">
                  <h4 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Order items</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item,i) => (
                      <div key={i} className="flex justify-between items-start">
                        <div>
                          <span className="text-white text-sm font-semibold">{item.item_name_snapshot}</span>
                          {item.customization_notes && <div className="text-white/40 text-xs italic mt-0.5">{item.customization_notes}</div>}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="text-white/50 text-xs">×{item.quantity}</div>
                          <div className="text-white font-bold text-sm">₹{(item.unit_price * item.quantity).toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
                    <span className="text-white font-black">Total</span>
                    <span className="text-white font-black">₹{selectedOrder.final_amount}</span>
                  </div>
                </div>

                {selectedOrder.special_instructions && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3 mb-4">
                    <p className="text-yellow-400 text-sm">📝 {selectedOrder.special_instructions}</p>
                  </div>
                )}

                {/* Table info */}
                {selectedOrder.table_number && (
                  <div className="bg-white/5 rounded-2xl px-4 py-3 mb-4 flex justify-between">
                    <span className="text-white/40 text-sm">Table</span>
                    <span className="text-white font-bold text-sm">Table {selectedOrder.table_number}</span>
                  </div>
                )}

                {/* Status actions */}
                {NEXT_STATUS[selectedOrder.status] && (
                  <button onClick={() => updateStatus.mutate({ id: selectedOrder.id, status: NEXT_STATUS[selectedOrder.status] })}
                    disabled={updateStatus.isPending}
                    className="w-full bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors mb-3">
                    {updateStatus.isPending ? 'Updating...' : `Mark as ${NEXT_STATUS[selectedOrder.status]} →`}
                  </button>
                )}

                {/* Cancel option */}
                {['placed','confirmed'].includes(selectedOrder.status) && (
                  <button onClick={() => updateStatus.mutate({ id: selectedOrder.id, status: 'cancelled' })}
                    disabled={updateStatus.isPending}
                    className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold py-3 rounded-2xl hover:bg-red-500/20 transition-colors">
                    Cancel order
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}