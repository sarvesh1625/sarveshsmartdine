import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const STATUS_STYLES = {
  pending_payment: { cls: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400', label: 'Awaiting Payment' },
  confirmed:       { cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400',       label: 'Confirmed'        },
  arrived:         { cls: 'bg-purple-500/15 border-purple-500/30 text-purple-400', label: 'Arrived'          },
  completed:       { cls: 'bg-green-500/15 border-green-500/30 text-green-400',    label: 'Completed'        },
  cancelled:       { cls: 'bg-red-500/15 border-red-500/30 text-red-400',          label: 'Cancelled'        },
  no_show:         { cls: 'bg-white/8 border-white/10 text-white/30',              label: 'No Show'          },
};
const NEXT_STATUS = { confirmed:'arrived', arrived:'completed' };

export default function BookingsAdminPage() {
  const qc = useQueryClient();
  const { accessToken } = useAuthStore();
  const [dateFilter,   setDateFilter]   = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState('');
  const [selected,     setSelected]     = useState(null);
  const [upiAlert,     setUpiAlert]     = useState(null);

  useEffect(() => {
    const s = io('/', { auth: { token: accessToken } });
    s.on('upi_payment_received', ({ amount, payerName, bookingId }) => {
      if (!bookingId) return; // only handle booking payments here
      setUpiAlert({ amount, payerName, bookingId, time: new Date() });
      setTimeout(() => setUpiAlert(null), 8000);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

    s.on('new_booking', (data) => {
      qc.invalidateQueries(['admin-bookings']);
      toast(`New booking: ${data.customerName} · ${data.partySize} people · ${data.bookingDate} ${data.bookingTime}`, {
        duration: 8000,
        style: { background:'#1A1A1A', color:'#fff', border:'1px solid rgba(234,179,8,0.3)' },
      });
    });
    s.on('booking_confirmed', (data) => {
      qc.invalidateQueries(['admin-bookings']);
      toast.success(`Advance paid! ${data.customerName} — Rs.${data.advanceAmount} received.`, { duration: 6000 });
    });
    return () => s.disconnect();
  }, [accessToken]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-bookings', dateFilter, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (dateFilter)   p.set('date',   dateFilter);
      if (statusFilter) p.set('status', statusFilter);
      return api.get(`/bookings/admin/list?${p.toString()}`).then(r => r.data.data);
    },
    refetchInterval: 30000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/bookings/admin/${id}/status`, { status }),
    onSuccess: (_, v) => { qc.invalidateQueries(['admin-bookings']); toast.success(`Marked as ${v.status}`); setSelected(null); },
    onError: () => toast.error('Failed'),
  });

  const totalAdvance   = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + Number(b.advance_amount), 0);
  const pendingPayment = bookings.filter(b => b.status === 'pending_payment').length;
  const confirmed      = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <>
    {upiAlert && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
        <div className="bg-green-500 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-4"
          style={{ boxShadow:'0 8px 32px rgba(34,197,94,0.5)' }}>
          <div className="text-4xl flex-shrink-0">💰</div>
          <div className="flex-1">
            <p className="font-black text-lg">Advance Received!</p>
            <p className="text-green-100 text-sm font-bold">Rs.{upiAlert.amount} via UPI</p>
            {upiAlert.payerName && <p className="text-green-200 text-xs">from {upiAlert.payerName}</p>}
          </div>
          <button onClick={() => setUpiAlert(null)} className="text-green-200 hover:text-white text-xl">✕</button>
        </div>
      </div>
    )}
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white mb-0.5">Advance Bookings</h1>
          <p className="text-white/40 text-sm">Customers who paid advance to reserve a table</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Total Bookings', value: bookings.length,          color:'text-white',      icon:'📅' },
          { label:'Confirmed',      value: confirmed,                 color:'text-blue-400',   icon:'✅' },
          { label:'Awaiting Pay',   value: pendingPayment,            color:'text-yellow-400', icon:'⏳' },
          { label:'Advance Earned', value:`Rs.${totalAdvance.toFixed(0)}`, color:'text-green-400', icon:'💰' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-xl font-black mb-0.5 ${s.color}`}>{s.value}</div>
            <div className="text-white/30 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#e94560]/60" />
        <button onClick={() => setDateFilter('')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold ${!dateFilter ? 'bg-[#e94560] text-white' : 'bg-white/5 text-white/50'}`}>
          All Dates
        </button>
        {['', 'pending_payment', 'confirmed', 'arrived', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize ${statusFilter===s?'bg-purple-500 text-white':'bg-white/5 text-white/50'}`}>
            {s ? STATUS_STYLES[s]?.label : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse"/>)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white/3 border border-white/5 rounded-2xl">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-white/50 font-semibold">No bookings yet</p>
          <p className="text-white/25 text-sm mt-1">Share your booking link: /book/your-slug</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b, i) => {
            const st = STATUS_STYLES[b.status] || STATUS_STYLES.pending_payment;
            const nextSt = NEXT_STATUS[b.status];
            const isPaid = b.payment_status === 'paid';
            return (
              <motion.div key={b.id} layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/8 transition-all"
                onClick={() => setSelected(s => s?.id === b.id ? null : b)}>
                {isPaid && <div className="h-0.5 bg-green-500" />}
                <div className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-[#e94560]/15 flex items-center justify-center font-black text-[#e94560] flex-shrink-0">
                    {b.customer_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-white font-bold text-sm">{b.customer_name}</span>
                      <span className="text-white/30 text-xs">x{b.party_size}</span>
                      {isPaid && <span className="text-xs bg-green-500/15 border border-green-500/25 text-green-400 px-2 py-0.5 rounded-lg">Paid</span>}
                    </div>
                    <p className="text-white/40 text-xs">{b.booking_date} at {b.booking_time} · {b.customer_phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="text-[#e94560] font-black text-sm">Rs.{Number(b.advance_amount).toFixed(0)} advance</div>
                    <div className="text-white/30 text-xs">Rs.{Number(b.balance_amount).toFixed(0)} on arrival</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>

                {selected?.id === b.id && (
                  <div className="border-t border-white/5 p-4 space-y-3">
                    {b.special_requests && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                        <p className="text-yellow-400 text-xs">Note: {b.special_requests}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-white/30 text-xs mb-0.5">Estimated bill</p>
                        <p className="text-white font-bold">Rs.{Number(b.estimated_amount).toFixed(0)}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-white/30 text-xs mb-0.5">Booking ID</p>
                        <p className="text-white font-mono text-xs">#{b.id.slice(0,8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {nextSt && (
                        <button onClick={e => { e.stopPropagation(); updateStatus.mutate({ id:b.id, status:nextSt }); }}
                          disabled={updateStatus.isPending}
                          className="flex-1 bg-[#e94560]/15 border border-[#e94560]/30 text-[#e94560] text-xs font-bold py-2.5 rounded-xl hover:bg-[#e94560]/25 transition-colors disabled:opacity-50">
                          Mark as {nextSt}
                        </button>
                      )}
                      {['confirmed','pending_payment'].includes(b.status) && (
                        <button onClick={e => { e.stopPropagation(); updateStatus.mutate({ id:b.id, status:'cancelled' }); }}
                          disabled={updateStatus.isPending}
                          className="px-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold py-2.5 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50">
                          Cancel
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <button onClick={e => { e.stopPropagation(); updateStatus.mutate({ id:b.id, status:'no_show' }); }}
                          disabled={updateStatus.isPending}
                          className="px-4 bg-white/5 border border-white/10 text-white/30 text-xs font-bold py-2.5 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50">
                          No Show
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
  </>
  );
}