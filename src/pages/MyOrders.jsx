import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useCustomerStore from '../store/customerStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const STATUS_STYLES = {
  placed:    { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', label: 'Waiting', dot: 'bg-yellow-400 animate-pulse' },
  confirmed: { color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',     label: 'Confirmed', dot: 'bg-blue-400 animate-pulse' },
  preparing: { color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', label: 'Cooking', dot: 'bg-orange-400 animate-pulse' },
  ready:     { color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30',   label: 'Ready!', dot: 'bg-green-400 animate-pulse' },
  delivered: { color: 'text-white/50',   bg: 'bg-white/5 border-white/10',            label: 'Delivered', dot: 'bg-white/30' },
  cancelled: { color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',       label: 'Cancelled', dot: 'bg-red-400' },
};

export default function MyOrders() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { customer, clearCustomer, getMyOrders } = useCustomerStore();

  const myOrders = getMyOrders(slug || null);

  if (!customer || !customer.name || customer.name === 'Guest') {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-center px-4">
        <div>
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-white text-xl font-bold mb-2">Not signed in</h2>
          <p className="text-white/40 text-sm mb-6">
            You ordered as a guest. Sign in with your name and phone when you scan the QR to track orders.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-[#e94560] text-white font-bold rounded-xl"
          >
            ← Go back to menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-20">

      {/* Header */}
      <div className="px-4 pt-10 pb-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black mb-1">My Orders</h1>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#e94560]/20 flex items-center justify-center text-[#e94560] font-black text-xs">
                {customer.name[0].toUpperCase()}
              </div>
              <span className="text-white/50 text-sm">{customer.name}</span>
              {customer.phone && <span className="text-white/30 text-xs">· {customer.phone}</span>}
            </div>
          </div>
          <button
            onClick={() => { clearCustomer(); navigate(`/menu/${slug}/table/1`); }}
            className="text-white/30 text-xs border border-white/10 px-3 py-2 rounded-xl hover:text-red-400 hover:border-red-500/30 transition-all"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        {myOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽</div>
            <h2 className="text-white text-lg font-bold mb-2">No orders yet</h2>
            <p className="text-white/40 text-sm mb-6">Your orders will appear here after you place them.</p>
            <button
              onClick={() => navigate(`/menu/${slug}/table/1`)}
              className="px-6 py-3 bg-[#e94560] text-white font-bold rounded-xl text-sm"
            >
              Browse menu →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white/30 text-xs uppercase tracking-wider font-semibold">
              {myOrders.length} order{myOrders.length > 1 ? 's' : ''}
            </p>

            {myOrders.map((order, i) => {
              const st = STATUS_STYLES[order.status] || STATUS_STYLES.placed;
              const isActive = !['delivered', 'cancelled'].includes(order.status);

              return (
                <motion.div
                  key={order.orderId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden"
                >
                  {/* Active order pulse bar */}
                  {isActive && (
                    <div className="h-1 bg-[#e94560] animate-pulse" />
                  )}

                  <div className="p-4">
                    {/* Order ID + time */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-white font-black">#{order.orderId.slice(0,8).toUpperCase()}</span>
                        <div className="text-white/30 text-xs mt-0.5">{dayjs(order.placedAt).fromNow()}</div>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border ${st.bg} ${st.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </div>
                    </div>

                    {/* Restaurant */}
                    <p className="text-white/50 text-xs mb-2">{order.restaurantName}</p>

                    {/* Items */}
                    <div className="space-y-1 mb-3">
                      {order.items?.map((item, ii) => (
                        <div key={ii} className="flex justify-between text-sm">
                          <span className="text-white/70">{item.name} × {item.quantity}</span>
                          <span className="text-white/50">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between border-t border-white/5 pt-3 mb-3">
                      <span className="text-white/50 text-sm">Total</span>
                      <span className="text-white font-black">₹{order.total}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {/* Only show track button for active orders */}
                      {isActive && (
                        <button
                          onClick={() => navigate(`/order/${order.slug}/${order.orderId}`)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors bg-[#e94560] text-white hover:bg-[#d63050]"
                        >
                          📍 Track live →
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <div className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center bg-green-500/15 border border-green-500/25 text-green-400">
                          🎉 Delivered
                        </div>
                      )}
                      {order.status === 'cancelled' && (
                        <div className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center bg-red-500/10 border border-red-500/20 text-red-400">
                          ❌ Cancelled
                        </div>
                      )}

                      {order.status === 'delivered' && !order.feedbackGiven && (
                        <button
                          onClick={() => navigate(`/order/${order.slug}/${order.orderId}`)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25 transition-colors"
                        >
                          ⭐ Give feedback
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}