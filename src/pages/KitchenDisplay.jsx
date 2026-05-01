import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const NEXT = { placed:'confirmed', confirmed:'preparing', preparing:'ready', ready:'delivered' };
const COLS = [
  { key:'placed',    label:'New Orders',  emoji:'🆕', color:'yellow' },
  { key:'confirmed', label:'Confirmed',   emoji:'✅', color:'blue'   },
  { key:'preparing', label:'Cooking',     emoji:'👨‍🍳', color:'orange' },
  { key:'ready',     label:'Ready',       emoji:'🍽', color:'green'  },
];
const COLORS = {
  yellow: { card:'bg-yellow-500/8 border-yellow-500/20',  btn:'bg-yellow-500/15 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25', dot:'bg-yellow-400', text:'text-yellow-400' },
  blue:   { card:'bg-blue-500/8 border-blue-500/20',      btn:'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25',         dot:'bg-blue-400',   text:'text-blue-400'   },
  orange: { card:'bg-orange-500/8 border-orange-500/20',  btn:'bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25', dot:'bg-orange-400', text:'text-orange-400' },
  green:  { card:'bg-green-500/8 border-green-500/20',    btn:'bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/25',     dot:'bg-green-400',  text:'text-green-400'  },
};

function Timer({ createdAt }) {
  const [elapsed, setElapsed] = useState('');
  const [urgent,  setUrgent]  = useState(false);
  useEffect(() => {
    function tick() {
      const mins = dayjs().diff(dayjs(createdAt), 'minute');
      const secs = dayjs().diff(dayjs(createdAt), 'second') % 60;
      setElapsed(`${mins}:${String(secs).padStart(2,'0')}`);
      // Only urgent if order is from today
      const isToday = dayjs(createdAt).isAfter(dayjs().startOf('day'));
      setUrgent(isToday && mins >= 15);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return (
    <span className={`text-xs font-mono font-bold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white/35'}`}>
      ⏱ {elapsed}
    </span>
  );
}

export default function KitchenDisplay() {
  const { user, logout, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState(dayjs());
  const audioCtxRef = useRef(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setClock(dayjs()), 1000);
    return () => clearInterval(id);
  }, []);

  // Audio context unlock
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      } catch {}
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => { window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
  }, []);

  function beep() {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.2;
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.18);
      });
    } catch {}
  }

  // Socket connection
  useEffect(() => {
    const s = io('/', { auth: { token: accessToken } });
    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('new_order',  () => {
      qc.invalidateQueries(['kitchen-queue']);
      beep();
      toast('🔔 New order!', {
        duration: 5000,
        style: { background:'#1A1A1A', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', fontWeight:'bold' },
      });
    });
    s.on('order_updated', () => qc.invalidateQueries(['kitchen-queue']));
    return () => s.disconnect();
  }, [accessToken]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: () => api.get('/orders/kitchen-queue').then(r => r.data.data),
    refetchInterval: 20000,
  });

  async function updateStatus(orderId, status) {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      qc.invalidateQueries(['kitchen-queue']);
      toast.success(`Marked as ${status}`);
    } catch { toast.error('Failed to update'); }
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const grouped  = Object.fromEntries(COLS.map(c => [c.key, orders.filter(o => o.status === c.key)]));
  const active   = orders.filter(o => ['placed','confirmed','preparing'].includes(o.status)).length;
  const restaurantName = user?.restaurantName || 'Restaurant';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">

      {/* Header */}
      <div className="bg-[#111] border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#e94560] rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0">
            {restaurantName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-white font-black text-sm leading-tight">Kitchen Display</h1>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-white/40 text-xs">{connected ? 'Live' : 'Reconnecting...'} · {restaurantName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active orders count */}
          {active > 0 && (
            <div className="bg-[#e94560]/15 border border-[#e94560]/25 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-[#e94560] font-black text-sm">{active}</span>
              <span className="text-[#e94560]/70 text-xs">active</span>
            </div>
          )}

          <span className="text-white/30 text-sm font-mono hidden sm:block">
            {clock.format('HH:mm:ss')}
          </span>
          <span className="text-white/20 text-xs hidden sm:block">
            {clock.format('ddd, DD MMM')}
          </span>

          <button onClick={handleLogout}
            className="text-white/30 hover:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all flex items-center gap-1.5">
            🚪 <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-[#0D0D0D] border-b border-white/5 px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar flex-shrink-0">
        {COLS.map(({ key, emoji, label, color }) => (
          <div key={key} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm">{emoji}</span>
            <span className="text-white/30 text-xs">{label}:</span>
            <span className={`font-black text-sm ${grouped[key].length > 0 ? COLORS[color].text : 'text-white/20'}`}>
              {grouped[key].length}
            </span>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[calc(100vh-160px)]">
            {COLS.map(({ key, label, emoji, color }) => {
              const C = COLORS[color];
              return (
                <div key={key} className={`${C.card} border rounded-2xl p-4 flex flex-col`}>
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <h2 className="text-sm font-black text-white">{label}</h2>
                    </div>
                    {grouped[key].length > 0 && (
                      <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${C.btn} border`}>
                        {grouped[key].length}
                      </span>
                    )}
                  </div>

                  {/* Orders */}
                  <div className="space-y-3 flex-1">
                    {grouped[key].length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-white/15">
                        <span className="text-3xl mb-2 opacity-30">{emoji}</span>
                        <span className="text-xs">No orders</span>
                      </div>
                    )}

                    {grouped[key].map(order => {
                      const isToday = dayjs(order.created_at).isAfter(dayjs().startOf('day'));
                      const ageMin  = dayjs().diff(dayjs(order.created_at), 'minute');
                      const urgent  = isToday && ageMin >= 15;

                      return (
                        <div key={order.id} className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                          {urgent && (
                            <div className="bg-red-500/15 px-3 py-1.5 text-xs text-red-400 font-bold flex items-center gap-1.5">
                              <span className="animate-pulse">⚠</span>
                              Waiting {ageMin} min — urgent
                            </div>
                          )}

                          <div className="p-3">
                            {/* Order header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-black text-sm">#{order.id.slice(0,6).toUpperCase()}</span>
                                {order.table_number && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${C.btn} border`}>
                                    T{order.table_number}
                                  </span>
                                )}
                              </div>
                              <Timer createdAt={order.created_at} />
                            </div>

                            {/* Customer */}
                            {order.customer_name && order.customer_name !== 'Guest' && (
                              <p className="text-white/35 text-xs mb-2">{order.customer_name}</p>
                            )}

                            {/* Items */}
                            <div className="space-y-1.5 mb-3">
                              {order.items?.map((item, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className={`text-xs font-black min-w-6 h-5 rounded flex items-center justify-center flex-shrink-0 ${C.btn} border px-1`}>
                                    ×{item.quantity}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-white/85 text-sm leading-tight">{item.item_name_snapshot}</span>
                                    {item.customization_notes && (
                                      <div className="text-white/35 text-xs italic mt-0.5">{item.customization_notes}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Special instructions */}
                            {order.special_instructions && (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2.5 py-1.5 mb-3 flex gap-2">
                                <span className="text-yellow-400 text-xs flex-shrink-0">📝</span>
                                <span className="text-yellow-300 text-xs">{order.special_instructions}</span>
                              </div>
                            )}

                            {/* Action button */}
                            {NEXT[key] && (
                              <button onClick={() => updateStatus(order.id, NEXT[key])}
                                className={`w-full text-xs font-bold py-2 rounded-xl border transition-all ${C.btn}`}>
                                → Mark as {NEXT[key].charAt(0).toUpperCase() + NEXT[key].slice(1)}
                              </button>
                            )}

                            {key === 'ready' && (
                              <button onClick={() => updateStatus(order.id, 'delivered')}
                                className="w-full text-xs font-bold py-2 rounded-xl border transition-all bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/25 mt-1">
                                ✓ Delivered
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}