import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import axios from 'axios';
import dayjs from 'dayjs';

const STATUS_STEPS = [
  { key: 'pending_payment', icon: '⏳', label: 'Awaiting Payment',   desc: 'Pay the advance to confirm your booking'     },
  { key: 'confirmed',       icon: '✅', label: 'Booking Confirmed',   desc: 'Restaurant has received your pre-order'       },
  { key: 'arrived',         icon: '🚪', label: 'You Arrived',         desc: 'Welcome! Your table is being prepared'        },
  { key: 'completed',       icon: '🎉', label: 'Completed',           desc: 'Thank you for dining with us!'                },
];

const STATUS_COLORS = {
  pending_payment: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  confirmed:       'text-blue-400   bg-blue-500/10   border-blue-500/20',
  arrived:         'text-purple-400 bg-purple-500/10 border-purple-500/20',
  completed:       'text-green-400  bg-green-500/10  border-green-500/20',
  cancelled:       'text-red-400    bg-red-500/10    border-red-500/20',
  no_show:         'text-white/30   bg-white/5       border-white/10',
};

export default function BookingTrackPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['booking-track', bookingId],
    queryFn:  () => axios.get(`/api/v1/bookings/${bookingId}`).then(r => r.data.data),
    refetchInterval: 15000, // poll every 15s for status updates
    retry: 2,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#e94560]/30 border-t-[#e94560] rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-white text-xl font-bold mb-2">Booking not found</h2>
        <p className="text-white/40 text-sm">This booking ID doesn't exist or has expired.</p>
      </div>
    </div>
  );

  const activeStep  = STATUS_STEPS.findIndex(s => s.key === data.status);
  const isCancelled = data.status === 'cancelled' || data.status === 'no_show';
  const isCompleted = data.status === 'completed';
  const isPaid      = data.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-20">

      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center border-b border-white/5">
        <div className="text-4xl mb-3">
          {isCancelled ? '❌' : isCompleted ? '🎉' : isPaid ? '✅' : '⏳'}
        </div>
        <h1 className="text-2xl font-black mb-1">{data.restaurant_name}</h1>
        <p className="text-white/40 text-sm mb-3">Advance Booking · #{bookingId.slice(0,8).toUpperCase()}</p>

        {/* Live refresh indicator */}
        {!isCancelled && !isCompleted && (
          <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Auto-refreshing every 15s
          </div>
        )}
      </div>

      <div className="px-4 max-w-md mx-auto mt-6 space-y-5">

        {/* Current status badge */}
        <div className={`rounded-2xl border px-5 py-4 text-center ${STATUS_COLORS[data.status] || STATUS_COLORS.confirmed}`}>
          <p className="font-black text-lg">{STATUS_STEPS.find(s => s.key === data.status)?.label || data.status}</p>
          <p className="text-sm opacity-70 mt-0.5">{STATUS_STEPS.find(s => s.key === data.status)?.desc}</p>
        </div>

        {/* Cancelled state */}
        {isCancelled && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-white font-bold">{data.status === 'no_show' ? 'Marked as No Show' : 'Booking Cancelled'}</p>
            <p className="text-white/40 text-sm mt-1">Contact the restaurant for assistance</p>
          </div>
        )}

        {/* Progress steps */}
        {!isCancelled && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            {STATUS_STEPS.map((step, index) => {
              const isDone   = index < activeStep || isCompleted;
              const isActive = index === activeStep && !isCompleted;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        backgroundColor: isDone ? '#22c55e' : isActive ? '#e94560' : 'rgba(255,255,255,0.08)',
                        scale: isActive ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.4 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 border-2"
                      style={{ borderColor: isDone ? '#22c55e' : isActive ? '#e94560' : 'rgba(255,255,255,0.1)' }}>
                      {isDone ? '✓' : step.icon}
                    </motion.div>
                    {index < STATUS_STEPS.length - 1 && (
                      <motion.div
                        animate={{ backgroundColor: isDone ? '#22c55e' : 'rgba(255,255,255,0.08)' }}
                        className="w-0.5 h-8 mt-1" />
                    )}
                  </div>
                  <div className="pb-8 flex-1">
                    <p className={`font-bold text-sm ${isActive ? 'text-white' : isDone ? 'text-green-400' : 'text-white/25'}`}>
                      {step.label}
                      {isActive && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e94560] animate-pulse" />
                          <span className="text-[#e94560] text-xs font-normal">Now</span>
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-white/50' : 'text-white/20'}`}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Booking details */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm mb-2">Booking Details</h3>
          {[
            ['👤 Name',          data.customer_name],
            ['📱 Phone',         data.customer_phone],
            ['🍽️ Items ordered', data.estimated_amount ? `₹${Number(data.estimated_amount).toFixed(0)} estimated` : '—'],
            ['💰 Advance paid',  isPaid ? `₹${Number(data.advance_amount).toFixed(0)} ✓` : `₹${Number(data.advance_amount).toFixed(0)} — pending`],
            ['💵 Pay on arrival',`₹${Number(data.balance_amount).toFixed(0)}`],
            ['📅 Booked on',     dayjs(data.created_at).format('DD MMM YYYY, hh:mm A')],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-white/40">{label}</span>
              <span className={`font-semibold text-right ${label.includes('Advance') && isPaid ? 'text-green-400' : 'text-white'}`}>
                {value}
              </span>
            </div>
          ))}

          {data.special_requests && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 mt-2">
              <p className="text-yellow-400 text-xs">📝 {data.special_requests}</p>
            </div>
          )}
        </div>

        {/* Pay advance if still pending */}
        {data.payment_status === 'pending' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
            <p className="text-yellow-400 font-bold mb-1">⚠️ Advance not paid yet</p>
            <p className="text-white/40 text-xs mb-3">Your booking is not confirmed until advance is paid</p>
            <button onClick={() => navigate(`/book/${data.restaurant_slug}`)}
              className="text-white font-bold px-6 py-2.5 rounded-xl text-sm"
              style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>
              Pay ₹{Number(data.advance_amount).toFixed(0)} Now →
            </button>
          </div>
        )}

        {/* Back to menu */}
        <button onClick={() => navigate(`/menu/${data.restaurant_slug}/table/1`)}
          className="w-full border border-white/10 text-white/50 hover:text-white font-semibold py-3 rounded-xl transition-colors text-sm">
          ← Browse Menu
        </button>
      </div>
    </div>
  );
}