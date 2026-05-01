import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useCartStore from '../../store/cartStore';
import useCustomerStore from '../../store/customerStore';

export default function CartDrawer({ open, onClose, restaurant, slug, tableId, upiId, upiOnly = false }) {
  // Detect payment mode from restaurant settings (hasMerchant flag from public API)
  const hasMerchant = !!(restaurant?.hasMerchant || (restaurant?.phonepe_merchant_id && restaurant?.phonepe_salt_key));
  const activeUpiId = upiId || restaurant?.upi_id || null;
  const { items, updateQuantity, removeItem, clearCart, getTotal, restaurantId } = useCartStore();
  const { customer, addOrder } = useCustomerStore();
  const navigate = useNavigate();

  // Steps: cart → details → pay → success
  const [step,        setStep]        = useState('cart');
  const [form,        setForm]        = useState({
    name:         customer?.name && customer.name !== 'Guest' ? customer.name : '',
    phone:        customer?.phone || '',
    instructions: '',
  });
  const [payMethod,     setPayMethod]     = useState('upi'); // always starts as upi
  const [coupon,        setCoupon]        = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [orderId,       setOrderId]       = useState(null);
  const [paidTotal,     setPaidTotal]     = useState(0);
  // Static UPI QR only — no Razorpay

  const subtotal = getTotal();
  const discount = couponApplied?.discount || 0;
  const total    = Math.max(0, subtotal - discount);

  async function payViaMerchant() {
    if (!orderId || !paidTotal) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/v1/webhooks/payment-init', {
        orderId, restaurantId: restaurant?.id, amount: paidTotal,
      });
      const gw = data.data;
      if (gw.gateway === 'razorpay') {
        if (!window.Razorpay) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        new window.Razorpay({
          key: gw.keyId, amount: Math.round(gw.amount * 100), currency: 'INR',
          name: restaurant?.name || 'Restaurant', order_id: gw.razorpayOrderId,
          theme: { color: '#e94560' },
          handler: () => { toast.success('Payment confirmed! 🎉'); navigate('/order/' + slug + '/' + orderId); },
          modal: { ondismiss: () => setLoading(false) },
        }).open();
        return;
      }
      if (gw.redirectUrl) { window.location.href = gw.redirectUrl; return; }
      toast.error('Gateway unavailable. Scan QR to pay.');
    } catch (e) { toast.error('Payment error. Scan QR to pay.'); }
    finally { setLoading(false); }
  }

  function handleClose() {
    if (step === 'success') {
      setStep('cart');
      setForm({ name: customer?.name && customer.name !== 'Guest' ? customer.name : '', phone: customer?.phone || '', instructions: '' });
      setCoupon(''); setCouponApplied(null); setOrderId(null);
      setQrData(null); setQrError(null); setPaidTotal(0);
    }
    onClose();
  }

  async function validateCoupon() {
    if (!coupon.trim()) return;
    try {
      const { data } = await axios.post('/api/v1/promotions/validate', {
        restaurantId: restaurantId || restaurant?.id,
        code: coupon.toUpperCase(),
        orderAmount: subtotal,
      });
      setCouponApplied({ code: coupon.toUpperCase(), discount: data.data.discount });
      toast.success(`Coupon applied! ₹${data.data.discount} off`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
      setCouponApplied(null);
    }
  }

  // ── Place order then show UPI QR ─────────────────────────────────────────────
  async function proceedToPayment() {
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    const cleanPhone = form.phone.replace(/\D/g,'').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) { toast.error('Please enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      // First create a pending order
      const { data } = await axios.post('/api/v1/orders', {
        restaurantSlug:       slug,
        tableId:              tableId || null,
        customerName:         form.name,
        customerPhone:        cleanPhone,
        specialInstructions:  form.instructions || null,
        couponCode:            couponApplied?.code || null,
        paymentMethod:         upiOnly ? 'upi' : payMethod,
        items: items.map(i => ({ menuItemId: Number(i.id), quantity: i.quantity })),
      });

      const newOrderId = data.data.orderId;
      setOrderId(newOrderId);
      setPaidTotal(total);

      // Save to history immediately as 'placed'
      addOrder({
        orderId:        newOrderId,
        slug,
        restaurantName: restaurant?.name,
        status:         'placed',
        placedAt:       new Date().toISOString(),
        total,
        items: items.map(i => ({ name: i.name_en, quantity: i.quantity, price: i.discounted_price || i.price })),
      });

      clearCart();

      if (payMethod === 'upi') {
        setStep('pay');
      } else {
        // counter / cash — no payment needed upfront
        setStep('success');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setLoading(false); }
  }





  const upiLink = (app) => {
    const base = `pa=${encodeURIComponent(activeUpiId||upiId)}&pn=${encodeURIComponent(restaurant?.name||'Restaurant')}&am=${paidTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order #'+(orderId||'').slice(0,8).toUpperCase())}`;
    if (app === 'phonepe') return `phonepe://pay?${base}`;
    if (app === 'gpay')    return `tez://upi/pay?${base}`;
    if (app === 'paytm')   return `paytmmp://pay?${base}`;
    return `upi://pay?${base}`;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 bg-black/70 z-50" onClick={handleClose} />

          <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', damping:30, stiffness:260 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-3xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <h2 className="text-white font-black text-lg">
                {step==='cart'?'Your Cart': step==='details'?'Your Details': step==='pay'?'Payment': 'Order Placed!'}
              </h2>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ── CART STEP ── */}
              {step === 'cart' && (
                <div className="flex-1">
                  {items.length === 0 ? (
                    <div className="py-20 text-center text-white/30">
                      <div className="text-5xl mb-3">🛒</div>
                      <p className="font-semibold">Cart is empty</p>
                    </div>
                  ) : (
                    <div className="px-5 py-4 space-y-3">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xl">🍽</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold truncate">{item.name_en}</p>
                            <p className="text-[#e94560] font-black text-sm">
                              ₹{(item.discounted_price > 0 ? item.discounted_price : item.price) * item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-sm hover:bg-white/20">−</button>
                            <span className="text-white font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-[#e94560] text-white flex items-center justify-center text-sm hover:bg-[#d63050]">+</button>
                          </div>
                        </div>
                      ))}

                      {/* Coupon */}
                      <div className="flex gap-2 pt-2">
                        <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                          placeholder="Coupon code"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e94560]/60" />
                        <button onClick={validateCoupon}
                          className="px-4 py-2.5 bg-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-colors">
                          Apply
                        </button>
                      </div>

                      {/* Totals */}
                      <div className="bg-white/5 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between text-sm text-white/60"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
                        {discount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Discount</span><span>−₹{discount.toFixed(0)}</span></div>}
                        <div className="border-t border-white/10 pt-2 flex justify-between font-black text-white text-base">
                          <span>Total</span><span>₹{total.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DETAILS STEP ── */}
              {step === 'details' && (
                <div className="px-5 py-5 space-y-4">
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                      Your Name <span className="text-[#e94560]">*</span>
                    </label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="Enter your name" required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e94560]/60" />
                    <p className="text-white/25 text-xs mt-1.5">🍽 Shown on your order for easy identification</p>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                      Mobile Number <span className="text-[#e94560]">*</span>
                    </label>
                    <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                      placeholder="10-digit mobile number" type="tel" required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e94560]/60" />
                    <p className="text-white/25 text-xs mt-1.5">📍 Used only to track your order status</p>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Special Instructions</label>
                    <textarea value={form.instructions} onChange={e => setForm(f => ({...f, instructions: e.target.value}))}
                      placeholder="Allergies, preferences..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e94560]/60 resize-none" />
                  </div>

                  {/* Payment method */}
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3 block">Payment Method</label>

                    {upiOnly ? (
                      /* UPI-only table — no choice, only UPI */
                      <div className="bg-[#e94560]/10 border border-[#e94560]/25 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-2xl">📱</span>
                        <div>
                          <p className="text-white font-bold text-sm">UPI Payment Only</p>
                          <p className="text-white/40 text-xs mt-0.5">This table requires UPI payment before order confirmation</p>
                        </div>
                        <span className="ml-auto text-[#e94560] font-black text-sm">✓</span>
                      </div>
                    ) : (
                      /* Regular table — all options */
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key:'upi',     icon:'📱', label:'UPI'           },
                          { key:'counter', icon:'🏪', label:'Pay at Counter' },
                          { key:'card',    icon:'💳', label:'Card'           },
                        ].map(m => (
                          <button key={m.key} onClick={() => setPayMethod(m.key)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                              payMethod === m.key
                                ? 'bg-[#e94560]/15 border-[#e94560]/40 text-white'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
                            }`}>
                            <span className="text-xl">{m.icon}</span>
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {(payMethod === 'upi' || upiOnly) && (
                      <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                        <span className="text-blue-400 text-lg">⚡</span>
                        <div>
                          <p className="text-blue-300 text-xs font-bold">Pay first, then order is confirmed</p>
                          <p className="text-white/35 text-xs mt-0.5">Dynamic QR generated — scan with any UPI app</p>
                        </div>
                      </div>
                    )}
                    {payMethod === 'counter' && !upiOnly && (
                      <p className="text-yellow-400/70 text-xs mt-2 text-center">Pay at the counter when your order is ready</p>
                    )}
                  </div>

                  {/* Order summary */}
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="flex justify-between text-sm text-white/60 mb-1"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-sm text-green-400 mb-1"><span>Discount</span><span>−₹{discount.toFixed(0)}</span></div>}
                    <div className="border-t border-white/10 pt-2 flex justify-between font-black text-white">
                      <span>Total</span><span>₹{total.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAYMENT STEP ── */}
              {step === 'pay' && orderId && (
                <div className="px-5 py-6 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center text-3xl mb-3">📱</div>
                  <h3 className="text-white font-black text-lg mb-1">Scan & Pay</h3>
                  <p className="text-white/40 text-sm mb-4">Scan with PhonePe, GPay, Paytm or any UPI app</p>

                  {/* Static UPI QR — no manual confirmation needed */}
                  <div className="bg-white p-3 rounded-2xl mb-4 shadow-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=${encodeURIComponent(upiLink())}`}
                      alt="UPI QR" className="w-52 h-52 rounded-lg block"
                    />
                  </div>

                  {/* Amount */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-4 w-full">
                    <p className="text-white/40 text-xs mb-1">Scan & pay exactly</p>
                    <p className="text-white font-black text-3xl">₹{paidTotal.toFixed(0)}</p>
                    <p className="text-white/30 text-xs mt-1">UPI: {activeUpiId || upiId}</p>
                  </div>

                  {/* UPI app shortcuts */}
                  <div className="flex gap-2 mb-4 w-full">
                    {[
                      { name:'PhonePe', bg:'bg-purple-600', app:'phonepe' },
                      { name:'GPay',    bg:'bg-blue-600',   app:'gpay'    },
                      { name:'Paytm',   bg:'bg-sky-500',    app:'paytm'   },
                    ].map(a => (
                      <a key={a.name} href={upiLink(a.app)}
                        className={`${a.bg} text-white text-xs font-bold py-2.5 rounded-xl flex-1 text-center`}>
                        {a.name}
                      </a>
                    ))}
                  </div>

                  {/* How it works */}
                  <div className="bg-white/5 border border-white/8 rounded-xl p-4 text-left w-full mb-5 space-y-2">
                    {[
                      { icon:'📷', text:'Scan QR or tap app button above' },
                      { icon:'✅', text:`Pay ₹${paidTotal.toFixed(0)} — amount pre-filled` },
                      { icon:'🧾', text: 'Show payment screenshot to waiter to confirm order' },
                    ].map((s,i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="flex-shrink-0">{s.icon}</span>
                        <span className="text-white/55 text-xs leading-relaxed">{s.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Auto-detect: Merchant = PhonePe button, Static UPI = QR only */}
                  {hasMerchant ? (
                    <>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center w-full mb-1">
                        <p className="text-purple-300 text-xs font-bold">⚡ Auto-Confirmation Active</p>
                        <p className="text-white/35 text-xs mt-0.5">Payment confirms automatically — no manual step needed</p>
                      </div>
                      <button onClick={payViaMerchant} disabled={loading}
                        className="w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #5f259f, #7b2d9e)' }}>
                        {loading
                          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Opening...</>
                          : <>⚡ Pay ₹{paidTotal.toFixed(0)} — Auto Confirm</>}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl p-3 text-center w-full mb-1">
                        <p className="text-yellow-400 text-xs">🧾 Show payment screenshot to staff after paying</p>
                      </div>
                    </>
                  )}

                  <button onClick={() => navigate(`/order/${slug}/${orderId}`)}
                    className="w-full border border-white/10 text-white/50 font-semibold py-3 rounded-2xl text-sm mt-2">
                    Track Order →
                  </button>
                  <button onClick={handleClose} className="mt-2 text-white/30 text-sm py-2">Close</button>
                </div>
              )}

              {/* ── SUCCESS STEP (counter/cash) ── */}
              {step === 'success' && (
                <div className="px-5 py-10 text-center">
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', delay:0.1 }}
                    className="text-6xl mb-4">✅</motion.div>
                  <h3 className="text-white font-black text-xl mb-2">Order Placed!</h3>
                  <p className="text-white/40 text-sm mb-2">Pay at the counter when ready</p>
                  <p className="text-white/25 text-xs mb-6">Your food is being prepared</p>
                  <div className="bg-white/5 rounded-2xl p-4 mb-6">
                    <p className="text-white/50 text-xs mb-1">Order ID</p>
                    <p className="text-white font-mono font-bold">#{orderId?.slice(0,8).toUpperCase()}</p>
                  </div>
                  {orderId && (
                    <button onClick={() => { handleClose(); navigate(`/order/${slug}/${orderId}`); }}
                      className="w-full bg-[#e94560] text-white font-bold py-3.5 rounded-2xl mb-3">
                      Track My Order →
                    </button>
                  )}
                  <button onClick={handleClose}
                    className="w-full border border-white/10 text-white/50 font-semibold py-3 rounded-2xl">
                    Back to Menu
                  </button>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="px-5 py-4 border-t border-white/5">
              {step === 'cart' && items.length > 0 && (
                <button onClick={() => setStep('details')}
                  className="w-full bg-[#e94560] hover:bg-[#d63050] text-white font-bold py-4 rounded-2xl flex items-center justify-between px-6 shadow-lg shadow-[#e94560]/25">
                  <span>Proceed to Checkout</span>
                  <span>₹{total.toFixed(0)} →</span>
                </button>
              )}
              {step === 'details' && (
                <div className="flex gap-3">
                  <button onClick={() => setStep('cart')}
                    className="flex-1 border border-white/10 text-white/60 font-semibold py-4 rounded-2xl">
                    ← Back
                  </button>
                  <button onClick={proceedToPayment} disabled={loading}
                    className="flex-1 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                      : payMethod === 'upi' ? `Pay ₹${total.toFixed(0)} →` : `Place Order · ₹${total.toFixed(0)}`
                    }
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}