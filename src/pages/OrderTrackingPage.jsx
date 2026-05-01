import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_STEPS = [
  { key: 'placed',    icon: '📋', label: 'Order Placed',   desc: 'We received your order'          },
  { key: 'confirmed', icon: '✅', label: 'Confirmed',       desc: 'Restaurant confirmed your order' },
  { key: 'preparing', icon: '👨‍🍳', label: 'Being Prepared', desc: 'Chef is cooking your food'       },
  { key: 'ready',     icon: '🍽',  label: 'Ready to Serve', desc: 'Your food is ready!'              },
  { key: 'delivered', icon: '🎉', label: 'Delivered',       desc: 'Enjoy your meal!'                },
];

export default function OrderTrackingPage() {
  const { orderId, slug } = useParams();
  const navigate     = useNavigate();
  const qc           = useQueryClient();

  const [currentStatus,     setCurrentStatus]     = useState(null);
  const [showFeedback,      setShowFeedback]       = useState(false);
  const [feedback,          setFeedback]           = useState({ foodRating: 0, serviceRating: 0, comment: '' });
  const [feedbackSubmitted, setFeedbackSubmitted]  = useState(false);
  const [feedbackLoading,   setFeedbackLoading]    = useState(false);
  const [connected,         setConnected]          = useState(false);

  /* ── Fetch order from backend ── */
  const { data, isLoading, error } = useQuery({
    queryKey: ['order-track', orderId],
    queryFn:  () => axios.get(`/api/v1/orders/track/${orderId}`).then(r => r.data.data),
    refetchInterval: 15000, // poll every 15s as backup
    retry: 2,
  });

  /* ── Sync status from query result ── */
  useEffect(() => {
    if (data?.status) {
      setCurrentStatus(data.status);
      if (data.status === 'delivered') setShowFeedback(true);
    }
  }, [data?.status]);

  /* ── Real-time Socket.io connection ── */
  useEffect(() => {
    if (!orderId) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Join the order-specific room so we get status updates
      socket.emit('track_order', { orderId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('reconnect', () => {
      socket.emit('track_order', { orderId });
    });

    // Backend emits 'order_status' to the order:${orderId} room
    socket.on('order_status', ({ status }) => {
      setCurrentStatus(status);
      qc.invalidateQueries(['order-track', orderId]);
      if (status === 'delivered') {
        setShowFeedback(true);
        toast('🎉 Your food is delivered! Enjoy your meal!', {
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(46,204,113,0.3)' },
          duration: 4000,
        });
      } else if (status === 'ready') {
        toast('🍽 Your food is ready! Waiter is bringing it to your table.', {
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(34,197,94,0.3)' },
          duration: 4000,
        });
      } else if (status === 'preparing') {
        toast('👨‍🍳 Kitchen has started preparing your order!', {
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(249,115,22,0.3)' },
          duration: 3000,
        });
      } else if (status === 'confirmed') {
        toast('✅ Order confirmed! Heading to kitchen now.', {
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
          duration: 3000,
        });
      }
    });

    return () => socket.disconnect();
  }, [orderId]);

  /* ── Submit feedback ── */
  async function submitFeedback() {
    if (!feedback.foodRating || !feedback.serviceRating) {
      toast.error('Please rate both food and service');
      return;
    }
    if (!data?.restaurant_id) {
      toast.error('Could not submit feedback — restaurant not found');
      return;
    }
    setFeedbackLoading(true);
    try {
      await axios.post('/api/v1/feedback', {
        orderId,
        restaurantId:  data.restaurant_id,
        foodRating:    feedback.foodRating,
        serviceRating: feedback.serviceRating,
        comment:       feedback.comment.trim() || null,
      });
      setFeedbackSubmitted(true);
      toast.success('Thank you for your feedback! 🙏');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit feedback';
      toast.error(msg);
    } finally {
      setFeedbackLoading(false);
    }
  }

  /* ── Loading ── */
  if (isLoading) return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-[#e94560]/30 border-t-[#e94560] rounded-full animate-spin" />
      <p className="text-white/30 text-sm">Loading your order...</p>
    </div>
  );

  /* ── Error ── */
  if (error || !data) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-white text-xl font-bold mb-2">Order not found</h2>
        <p className="text-white/40 text-sm mb-6">This order doesn't exist or may have expired.</p>
        {slug && (
          <button onClick={() => navigate(`/menu/${slug}/table/1`)}
            className="px-6 py-3 bg-[#e94560] text-white font-bold rounded-xl">
            Back to Menu
          </button>
        )}
      </div>
    </div>
  );

  const status      = currentStatus || data.status;
  const activeStep  = STATUS_STEPS.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-24">

      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center border-b border-white/5">
        <div className="text-4xl mb-3">
          {isCancelled ? '❌' : isDelivered ? '🎉' : '⏱'}
        </div>
        <h1 className="text-2xl font-black mb-1">
          {isDelivered ? 'Delivered!' : isCancelled ? 'Order Cancelled' : 'Order Tracking'}
        </h1>
        <p className="text-white/40 text-sm mb-2">#{orderId.slice(0, 8).toUpperCase()}</p>
        {/* Live indicator — hide when delivered/cancelled */}
        {!isDelivered && !isCancelled && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${
            connected
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-white/5 border-white/10 text-white/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
            {connected ? 'Live updates on' : 'Connecting...'}
          </div>
        )}
      </div>

      <div className="px-4 max-w-md mx-auto mt-6 space-y-5">

        {/* Cancelled */}
        {isCancelled && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-white font-black text-lg mb-2">Order Cancelled</h2>
            <p className="text-white/50 text-sm">Please contact the restaurant for assistance.</p>
          </div>
        )}

        {/* Delivered completion card */}
        {isDelivered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/25 rounded-2xl p-6 text-center"
          >
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-white font-black text-xl mb-1">Enjoy your meal!</h2>
            <p className="text-white/50 text-sm">Your order has been delivered. Hope you love it!</p>
          </motion.div>
        )}

        {/* Status steps — only show when NOT delivered and NOT cancelled */}
        {!isCancelled && !isDelivered && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            {STATUS_STEPS.map((step, index) => {
              const isDone   = index < activeStep;
              const isActive = index === activeStep;
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
                      style={{ borderColor: isDone ? '#22c55e' : isActive ? '#e94560' : 'rgba(255,255,255,0.1)' }}
                    >
                      {isDone ? '✓' : step.icon}
                    </motion.div>
                    {index < STATUS_STEPS.length - 1 && (
                      <motion.div
                        animate={{ backgroundColor: isDone ? '#22c55e' : 'rgba(255,255,255,0.08)' }}
                        transition={{ duration: 0.4 }}
                        className="w-0.5 h-8 mt-1"
                      />
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
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-white/55' : 'text-white/20'}`}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Estimated time */}
        {!isCancelled && !isDelivered && activeStep >= 0 && (
          <div className="bg-[#e94560]/10 border border-[#e94560]/20 rounded-2xl p-4 text-center">
            <p className="text-white/40 text-xs mb-1">Estimated wait time</p>
            <p className="text-white font-black text-2xl">
              {activeStep === 0 ? '20–30' : activeStep === 1 ? '15–25' : activeStep === 2 ? '5–10' : '2–3'} min
            </p>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-black mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4">
            {data.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white/65">{item.item_name_snapshot} × {item.quantity}</span>
                <span className="text-white font-semibold">₹{(item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3 space-y-1.5">
            {data.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Discount</span><span>−₹{data.discount_amount}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-white text-base">
              <span>Total</span><span>₹{data.final_amount}</span>
            </div>
          </div>
          {data.special_instructions && (
            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
              <p className="text-yellow-400 text-xs">📝 {data.special_instructions}</p>
            </div>
          )}
        </div>

        {/* Feedback form */}
        <AnimatePresence>
          {(showFeedback || isDelivered) && !feedbackSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/5 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⭐</span>
                <h3 className="text-white font-black">How was your experience?</h3>
              </div>
              <p className="text-white/40 text-xs mb-5">Your feedback is shown to the restaurant admin</p>

              {/* Food rating */}
              <div className="mb-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Food Quality</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star}
                      onClick={() => setFeedback(f => ({ ...f, foodRating: star }))}
                      className="transition-all hover:scale-110 active:scale-95">
                      <span className={`text-3xl ${star <= feedback.foodRating ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                    </button>
                  ))}
                </div>
                {feedback.foodRating > 0 && (
                  <p className="text-white/40 text-xs mt-1.5">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][feedback.foodRating]}
                  </p>
                )}
              </div>

              {/* Service rating */}
              <div className="mb-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Service</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star}
                      onClick={() => setFeedback(f => ({ ...f, serviceRating: star }))}
                      className="transition-all hover:scale-110 active:scale-95">
                      <span className={`text-3xl ${star <= feedback.serviceRating ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                    </button>
                  ))}
                </div>
                {feedback.serviceRating > 0 && (
                  <p className="text-white/40 text-xs mt-1.5">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][feedback.serviceRating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <textarea
                placeholder="Any comments? Tell us what you loved or how we can improve..."
                value={feedback.comment}
                onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 resize-none mb-4 transition-colors"
              />

              <button
                onClick={submitFeedback}
                disabled={!feedback.foodRating || !feedback.serviceRating || feedbackLoading}
                className="w-full bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {feedbackLoading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                ) : 'Submit Feedback →'}
              </button>

              {(!feedback.foodRating || !feedback.serviceRating) && (
                <p className="text-white/25 text-xs text-center mt-2">Rate both food and service to submit</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback submitted */}
        {feedbackSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center"
          >
            <div className="text-4xl mb-3">🙏</div>
            <h3 className="text-white font-black text-lg mb-1">Thank you!</h3>
            <p className="text-white/40 text-sm">Your feedback helps the restaurant improve.</p>
          </motion.div>
        )}

        {/* Back to menu */}
        {slug && (
          <button
            onClick={() => navigate(`/menu/${slug}/table/1`)}
            className="w-full border border-white/10 text-white/50 hover:text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            ← Back to Menu
          </button>
        )}
      </div>
    </div>
  );
}