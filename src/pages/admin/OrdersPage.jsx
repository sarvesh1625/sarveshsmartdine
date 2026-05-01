import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const STATUS_STYLES = {
  placed:    { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', label: 'New',       dot: 'bg-yellow-400' },
  confirmed: { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25',       label: 'Confirmed', dot: 'bg-blue-400'   },
  preparing: { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/25', label: 'Cooking',   dot: 'bg-orange-400' },
  ready:     { cls: 'bg-green-500/15 text-green-400 border-green-500/25',    label: 'Ready',     dot: 'bg-green-400'  },
  delivered: { cls: 'bg-white/8 text-white/40 border-white/10',              label: 'Delivered', dot: 'bg-white/30'   },
  cancelled: { cls: 'bg-red-500/15 text-red-400 border-red-500/25',          label: 'Cancelled', dot: 'bg-red-400'    },
};
const PAY_STYLES = {
  counter:  { cls: 'bg-white/8 text-white/40 border-white/10',              icon: '🏪', label: 'Pay at Counter' },
  upi:      { cls: 'bg-green-500/15 text-green-400 border-green-500/25',    icon: '📱', label: 'UPI'            },
  razorpay: { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25',       icon: '💳', label: 'Online'         },
  cash:     { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', icon: '💵', label: 'Cash'           },
  card:     { cls: 'bg-purple-500/15 text-purple-400 border-purple-500/25', icon: '💳', label: 'Card'           },
};

const PAY_STATUS = {
  paid:               { cls: 'text-green-400',  icon: '✓', label: 'Paid'               },
  pending:            { cls: 'text-yellow-400', icon: '⏳', label: 'Pending'            },
  customer_confirmed: { cls: 'text-blue-400',   icon: '📱', label: 'Customer Paid — Verify' },
  failed:             { cls: 'text-red-400',    icon: '✗', label: 'Failed'             },
};

const NEXT = {
  placed:    'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready:     'delivered',
};
const FILTERS = ['', 'placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [filter,       setFilter]       = useState('');
  const [selected,     setSelected]     = useState(null);
  const [connected,    setConnected]     = useState(false);
  const [upiAlert,     setUpiAlert]      = useState(null); // soundbox-style alert

  /* ── Live updates via Socket.io ── */
  useEffect(() => {
    const s = io('/', { auth: { token: accessToken } });
    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('new_order',  () => {
      qc.invalidateQueries(['admin-orders']);
      toast('🔔 New order received!', {
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        duration: 4000,
      });
    });
    s.on('order_updated', () => qc.invalidateQueries(['admin-orders']));

    // Customer says they paid via UPI — needs owner verification
    s.on('payment_customer_confirmed', ({ orderId, tableNumber, amount, message }) => {
      qc.setQueryData(['admin-orders', filter], (old) => {
        if (!old) return old;
        return old.map(o => o.id === orderId ? { ...o, payment_status: 'customer_confirmed' } : o);
      });
      toast(`📱 Table ${tableNumber} says paid ₹${amount} via UPI — tap Mark Paid to confirm`, {
        duration: 8000,
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(59,130,246,0.4)', maxWidth: '340px' },
      });
    });

    // Soundbox-style UPI payment notification
    s.on('upi_payment_received', ({ amount, payerName, txnId, orderId }) => {
      setUpiAlert({ amount, payerName, txnId, orderId, time: new Date() });
      // Auto-dismiss after 8 seconds
      setTimeout(() => setUpiAlert(null), 8000);
      // Play beep sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Success chime — 3 ascending notes
        [[880,0],[1100,0.15],[1320,0.3]].forEach(([freq, delay]) => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          const t = ctx.currentTime + delay;
          gain.gain.setValueAtTime(0.4, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.start(t); osc.stop(t + 0.3);
        });
      } catch {}
    });

    // Real-time payment status update
    s.on('payment_updated', ({ orderId, paymentStatus, paidAt }) => {
      qc.setQueryData(['admin-orders', filter], (old) => {
        if (!old) return old;
        return old.map(o => o.id === orderId ? { ...o, payment_status: paymentStatus, paid_at: paidAt } : o);
      });
      if (paymentStatus === 'paid') {
        toast.success('💰 Payment confirmed!', {
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(34,197,94,0.3)' },
          duration: 4000,
        });
      }
    });

    return () => s.disconnect();
  }, [accessToken]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn:  () => api.get(`/orders${filter ? `?status=${filter}` : ''}`).then(r => r.data.data),
    refetchInterval: 20000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['admin-orders']);
      toast.success(`Order marked as ${vars.status}`);
      setSelected(null);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (orderId) => api.patch(`/webhooks/manual-paid/${orderId}`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-orders']);
      toast.success('💰 Marked as Paid!', {
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(34,197,94,0.3)' },
      });
    },
    onError: () => toast.error('Failed to mark as paid'),
  });

  // Summary counts
  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});
  const activeCount = (counts.placed || 0) + (counts.confirmed || 0) + (counts.preparing || 0) + (counts.ready || 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white mb-0.5">Orders</h1>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-white/30 text-xs">{connected ? 'Live updates on' : 'Reconnecting...'}</span>
            {activeCount > 0 && (
              <span className="bg-[#e94560] text-white text-xs font-black px-2 py-0.5 rounded-full">{activeCount} active</span>
            )}
          </div>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map(f => {
          const st   = f ? STATUS_STYLES[f] : null;
          const cnt  = f ? counts[f] : orders.length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 border ${
                filter === f
                  ? 'bg-[#e94560] text-white border-[#e94560]'
                  : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
              }`}>
              {st && <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />}
              <span className="capitalize">{f || 'All'}</span>
              {cnt > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  filter === f ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                }`}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-bold">No {filter || ''} orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const st      = STATUS_STYLES[order.status] || STATUS_STYLES.placed;
            const isActive = NEXT[order.status];
            const ageMin  = dayjs().diff(dayjs(order.created_at), 'minute');
            const isToday  = dayjs(order.created_at).isAfter(dayjs().startOf('day'));
            const isUrgent = isActive && ageMin >= 15 && isToday;
            return (
              <motion.div key={order.id} layout
                className={`bg-white/5 border rounded-2xl overflow-hidden cursor-pointer hover:bg-white/8 transition-all ${
                  isUrgent ? 'border-red-500/30' : 'border-white/5'
                }`}
                onClick={() => setSelected(order)}
              >
                {isUrgent && (
                  <div className="bg-red-500/15 px-4 py-1.5 text-xs text-red-400 font-bold flex items-center gap-1.5">
                    <span className="animate-pulse">⚠</span> Waiting {ageMin} min — needs attention
                  </div>
                )}
                <div className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-white font-black">#{order.id.slice(0,8).toUpperCase()}</span>
                      {order.table_number && <span className="text-white/30 text-xs">Table {order.table_number}</span>}
                      <span className="text-white/25 text-xs">{dayjs(order.created_at).fromNow()}</span>
                    </div>
                    <p className="text-white/50 text-xs mb-1">{order.customer_name}</p>
                    <p className="text-white/35 text-xs line-clamp-1">
                      {order.items?.map(i => `${i.item_name_snapshot} ×${i.quantity}`).join(' · ')}
                    </p>

                    {/* Payment info — always visible */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {(() => {
                        const pm  = PAY_STYLES[order.payment_method] || PAY_STYLES.counter;
                        const ps  = PAY_STATUS[order.payment_status]  || PAY_STATUS.pending;
                        return (
                          <>
                            <span className={`text-xs px-2 py-0.5 rounded-lg border flex items-center gap-1 ${pm.cls}`}>
                              <span>{pm.icon}</span>
                              <span>{pm.label}</span>
                            </span>
                            <span className={`text-xs font-bold flex items-center gap-1 ${ps.cls}`}>
                              <span>{ps.icon}</span>
                              <span>{ps.label}</span>
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(order.payment_status === 'pending' || order.payment_status === 'customer_confirmed') && (
                      <button
                        onClick={e => { e.stopPropagation(); markPaidMutation.mutate(order.id); }}
                        disabled={markPaidMutation.isPending}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 flex-shrink-0 ${
                          order.payment_status === 'customer_confirmed'
                            ? 'bg-blue-500/20 border border-blue-500/35 text-blue-300 hover:bg-blue-500/30 animate-pulse'
                            : 'bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25'
                        }`}
                      >
                        {order.payment_status === 'customer_confirmed' ? '📱 Verify & Mark Paid' : '✓ Mark Paid'}
                      </button>
                    )}
                    <div className="text-right">
                      <div className="text-white font-bold">₹{order.final_amount}</div>
                      <div className="text-white/30 text-xs">{order.payment_method === 'counter' ? 'on delivery' : 'prepaid'}</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${st.cls}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${st.dot} ${isActive ? 'animate-pulse' : ''}`} />
                      {st.label}
                    </span>
                  </div>
                  {NEXT[order.status] && (
                    <button
                      onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: NEXT[order.status] }); }}
                      disabled={updateStatus.isPending}
                      className="text-xs font-bold px-3 py-2 bg-[#e94560]/15 text-[#e94560] border border-[#e94560]/25 rounded-xl hover:bg-[#e94560]/25 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      → {NEXT[order.status]}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Order detail bottom sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-50" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] border-t border-white/10 rounded-t-3xl max-h-[88vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="px-5 pb-8 pt-2">
                {/* Modal header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-white font-black text-lg">#{selected.id.slice(0,8).toUpperCase()}</h2>
                    <p className="text-white/40 text-sm">{selected.customer_name} · {dayjs(selected.created_at).fromNow()}</p>
                    {selected.table_number && (
                      <p className="text-white/30 text-xs mt-0.5">Table {selected.table_number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1.5 rounded-xl border capitalize ${STATUS_STYLES[selected.status]?.cls}`}>
                      {STATUS_STYLES[selected.status]?.label}
                    </span>
                    <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-xl w-8 h-8 flex items-center justify-center">✕</button>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-white/5 rounded-2xl p-4 mb-4">
                  <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Order items</h3>
                  <div className="space-y-3">
                    {selected.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-start">
                        <div>
                          <span className="text-white text-sm font-semibold">{item.item_name_snapshot}</span>
                          {item.is_veg !== undefined && (
                            <span className={`ml-2 text-xs ${item.is_veg ? 'text-green-400' : 'text-red-400'}`}>
                              {item.is_veg ? '🟢' : '🔴'}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="text-white/40 text-xs">×{item.quantity}</div>
                          <div className="text-white font-bold text-sm">₹{(item.unit_price * item.quantity).toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 mt-3 pt-3 space-y-1.5">
                    {selected.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Discount</span><span>−₹{selected.discount_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-white text-base">
                      <span>Total</span><span>₹{selected.final_amount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/30 items-center">
                      <span>Payment Method</span>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg border ${(PAY_STYLES[selected.payment_method] || PAY_STYLES.counter).cls}`}>
                        {(PAY_STYLES[selected.payment_method] || PAY_STYLES.counter).icon}
                        {(PAY_STYLES[selected.payment_method] || PAY_STYLES.counter).label}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-white/30 items-center">
                      <span>Payment Status</span>
                      <span className={`flex items-center gap-1 text-xs font-bold ${(PAY_STATUS[selected.payment_status] || PAY_STATUS.pending).cls}`}>
                        {(PAY_STATUS[selected.payment_status] || PAY_STATUS.pending).icon}
                        {(PAY_STATUS[selected.payment_status] || PAY_STATUS.pending).label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Special instructions */}
                {selected.special_instructions && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3 mb-4">
                    <p className="text-yellow-400 text-xs font-semibold mb-1">Special instructions</p>
                    <p className="text-yellow-300 text-sm">{selected.special_instructions}</p>
                  </div>
                )}

                {/* Status progression */}
                {NEXT[selected.status] && (
                  <button
                    onClick={() => updateStatus.mutate({ id: selected.id, status: NEXT[selected.status] })}
                    disabled={updateStatus.isPending}
                    className="w-full bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm transition-colors mb-3"
                  >
                    {updateStatus.isPending ? 'Updating...' : `Mark as ${NEXT[selected.status]} →`}
                  </button>
                )}

                {/* Cancel */}
                {['placed', 'confirmed'].includes(selected.status) && (
                  <button
                    onClick={() => updateStatus.mutate({ id: selected.id, status: 'cancelled' })}
                    disabled={updateStatus.isPending}
                    className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold py-3 rounded-2xl hover:bg-red-500/20 transition-colors text-sm"
                  >
                    Cancel this order
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