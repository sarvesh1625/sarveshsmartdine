import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

// Steps: 0=menu → 1=cart → 2=details → 3=pay → 4=confirmed
const STEPS = ['Menu', 'Cart', 'Your Details', 'Pay 10%', 'Done!'];

function parseComboItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function BookingPage() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const [step,      setStep]    = useState(0);
  const [loading,   setLoading] = useState(false);
  const [cart,      setCart]    = useState([]);
  const [name,      setName]    = useState('');
  const [phone,     setPhone]   = useState('');
  const [note,      setNote]    = useState('');
  const [booking,   setBooking] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant-public', slug],
    queryFn:  () => axios.get(`/api/v1/restaurant/public/${slug}`).then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
  const upiId = restaurant?.upi_id || null;

  const { data: menuData } = useQuery({
    queryKey: ['menu', slug],
    queryFn:  () => axios.get(`/api/v1/menu-items/public?restaurantSlug=${slug}`).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
    onSuccess: (d) => { if (d?.menu?.[0]) setActiveCategory(d.menu[0].id); },
  });

  // Cart helpers
  const cartTotal  = cart.reduce((s, c) => s + (Number(c.item.discounted_price > 0 ? c.item.discounted_price : c.item.price) * c.quantity), 0);
  const advanceAmt = Math.max(1, Math.ceil(cartTotal * 0.10));
  const balanceAmt = cartTotal - advanceAmt;
  const cartCount  = cart.reduce((s, c) => s + c.quantity, 0);

  function addItem(item) {
    setCart(p => {
      const ex = p.find(c => c.item.id === item.id);
      if (ex) return p.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...p, { item, quantity: 1 }];
    });
  }
  function removeItem(itemId) {
    setCart(p => {
      const ex = p.find(c => c.item.id === itemId);
      if (!ex) return p;
      if (ex.quantity <= 1) return p.filter(c => c.item.id !== itemId);
      return p.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }
  function getQty(itemId) { return cart.find(c => c.item.id === itemId)?.quantity || 0; }

  async function createBooking() {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/v1/bookings', {
        restaurantSlug:  slug,
        customerName:    name.trim(),
        customerPhone:   phone.replace(/\D/g, '').slice(-10),
        bookingDate:     new Date().toISOString().split('T')[0],
        bookingTime:     new Date().toTimeString().slice(0, 5),
        partySize:       1,
        estimatedAmount: cartTotal,
        advancePercent:  10,
        specialRequests: note.trim() || undefined,
      });
      setBookingId(data.data.bookingId);
      setBooking(data.data);
      setStep(3); // go to UPI pay step
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed. Try again.');
    } finally { setLoading(false); }
  }



  // PhonePe auto-payment for booking advance
  async function payViaPhonePe() {
    if (!bookingId || !advanceAmt || !restaurant?.id) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/v1/webhooks/phonepe-init', {
        bookingId,
        restaurantId: restaurant.id,
        amount: advanceAmt,
      });
      if (data.data?.redirectUrl) {
        window.location.href = data.data.redirectUrl;
      } else {
        toast.error('Could not open PhonePe. Scan QR to pay.');
      }
    } catch {
      toast.error('PhonePe unavailable. Scan QR to pay.');
    } finally { setLoading(false); }
  }

  const grad  = 'linear-gradient(135deg, #e94560, #c0392b)';
  const inp   = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e94560]/60 transition-colors';
  const menu  = menuData?.menu || [];

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F0F0F]/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-white font-black text-sm">{restaurant?.name || '...'}</h1>
            <p className="text-white/30 text-xs">Pre-order · Pay 10% to confirm</p>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${
                i === step ? 'w-5 h-2 bg-[#e94560]' : i < step ? 'w-2 h-2 bg-green-500' : 'w-2 h-2 bg-white/15'
              }`} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 0: MENU ── */}
        {step === 0 && (
          <motion.div key="menu" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>

            {/* Category pills */}
            {menu.length > 0 && (
              <div className="sticky top-14 z-30 bg-[#0F0F0F]/95 backdrop-blur border-b border-white/5 px-4 py-2.5">
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-lg mx-auto">
                  {menu.map(cat => (
                    <button key={cat.id} onClick={() => {
                      setActiveCategory(cat.id);
                      document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
                    }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeCategory === cat.id ? 'bg-[#e94560] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}>
                      {cat.name_en}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 pb-36 max-w-lg mx-auto mt-4 space-y-8">
              {menu.map(cat => (
                <div key={cat.id} id={`cat-${cat.id}`}>
                  <h2 className="text-white font-black text-base mb-3">{cat.name_en}
                    <span className="text-white/30 font-normal text-xs ml-2">{cat.items?.filter(i => i.is_available !== false).length} items</span>
                  </h2>
                  <div className="space-y-2">
                    {cat.items?.filter(i => i.is_available !== false).map(item => {
                      const price = Number(item.discounted_price > 0 ? item.discounted_price : item.price);
                      const qty   = getQty(item.id);
                      const combos = parseComboItems(item.combo_items);
                      return (
                        <div key={item.id} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-3">
                          {/* Image */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
                              : <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>
                            }
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full m-px ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                              </div>
                              <span className="text-white text-sm font-bold truncate">{item.name_en}</span>
                            </div>
                            {item.description_en && <p className="text-white/35 text-xs line-clamp-1 mb-1">{item.description_en}</p>}
                            {item.is_combo && combos.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {combos.map((ci, idx) => (
                                  <span key={idx} className="text-xs bg-purple-500/15 border border-purple-500/25 text-purple-300 px-1.5 py-0.5 rounded-full">
                                    {ci.qty > 1 ? `${ci.qty}× ` : ''}{ci.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-[#e94560] font-black text-sm">₹{price}</span>
                              {item.discounted_price > 0 && <span className="text-white/25 text-xs line-through">₹{item.price}</span>}
                              {item.is_combo && <span className="text-xs text-purple-300">🎁 Combo</span>}
                            </div>
                          </div>
                          {/* Qty control */}
                          <div className="flex-shrink-0">
                            {qty === 0 ? (
                              <button onClick={() => addItem(item)}
                                className="w-9 h-9 rounded-xl text-white text-xl font-black flex items-center justify-center"
                                style={{ background: grad }}>+</button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => removeItem(item.id)}
                                  className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">−</button>
                                <span className="text-white font-black text-sm w-4 text-center">{qty}</span>
                                <button onClick={() => addItem(item)}
                                  className="w-7 h-7 rounded-lg text-white text-sm flex items-center justify-center"
                                  style={{ background: grad }}>+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Floating cart bar */}
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.div initial={{ y:80 }} animate={{ y:0 }} exit={{ y:80 }}
                  className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#0F0F0F]/95 backdrop-blur border-t border-white/5 z-40">
                  <div className="max-w-lg mx-auto">
                    <button onClick={() => setStep(1)}
                      className="w-full text-white font-black py-4 rounded-2xl flex items-center justify-between px-5"
                      style={{ background: grad }}>
                      <span>🛒 {cartCount} items</span>
                      <span>View Cart · ₹{cartTotal} →</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── STEP 1: CART ── */}
        {step === 1 && (
          <motion.div key="cart" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            className="px-4 py-5 max-w-lg mx-auto pb-36">
            <h2 className="text-white font-black text-lg mb-4">Your Cart</h2>

            <div className="space-y-2 mb-5">
              {cart.map(c => {
                const price = Number(c.item.discounted_price > 0 ? c.item.discounted_price : c.item.price);
                return (
                  <div key={c.item.id} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                      {c.item.image_url
                        ? <img src={c.item.image_url} alt={c.item.name_en} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🍽</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{c.item.name_en}</p>
                      <p className="text-[#e94560] font-black text-sm">₹{price} × {c.quantity} = ₹{price * c.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => removeItem(c.item.id)}
                        className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">−</button>
                      <span className="text-white font-black text-sm w-4 text-center">{c.quantity}</span>
                      <button onClick={() => addItem(c.item)}
                        className="w-7 h-7 rounded-lg text-white text-sm flex items-center justify-center"
                        style={{ background: grad }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bill breakdown */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-white/50">Total bill</span><span className="text-white font-bold">₹{cartTotal}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#e94560] font-bold">Pay now (10%)</span><span className="text-[#e94560] font-black">₹{advanceAmt}</span></div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-2"><span className="text-white/40">Pay on arrival</span><span className="text-green-400 font-bold">₹{balanceAmt}</span></div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#0F0F0F]/95 backdrop-blur border-t border-white/5">
              <div className="max-w-lg mx-auto flex gap-3">
                <button onClick={() => setStep(0)}
                  className="border border-white/10 text-white/50 font-semibold py-4 px-5 rounded-2xl">← Edit</button>
                <button onClick={() => setStep(2)}
                  className="flex-1 text-white font-black py-4 rounded-2xl" style={{ background: grad }}>
                  Next — Enter Details →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: NAME + PHONE ── */}
        {step === 2 && (
          <motion.div key="details" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-36">
            <div>
              <h2 className="text-white font-black text-lg mb-1">Your Details</h2>
              <p className="text-white/40 text-sm">So the restaurant knows who's coming</p>
            </div>

            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Name <span className="text-[#e94560]">*</span></label>
              <input className={inp} placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Mobile <span className="text-[#e94560]">*</span></label>
              <input className={inp} placeholder="10-digit mobile number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              <p className="text-white/25 text-xs mt-1">📍 For booking confirmation only</p>
            </div>

            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Note <span className="text-white/25 font-normal normal-case">— optional</span></label>
              <textarea className={`${inp} resize-none`} rows={2}
                placeholder="Allergies, seating preference, special occasion..."
                value={note} onChange={e => setNote(e.target.value)} />
            </div>

            {/* Mini order summary */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-sm space-y-1">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-2">Order Summary</p>
              {cart.map(c => (
                <div key={c.item.id} className="flex justify-between">
                  <span className="text-white/60">{c.item.name_en} × {c.quantity}</span>
                  <span className="text-white">₹{Number(c.item.discounted_price > 0 ? c.item.discounted_price : c.item.price) * c.quantity}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white/50">Pay now (10%)</span>
                <span className="text-[#e94560]">₹{advanceAmt}</span>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#0F0F0F]/95 backdrop-blur border-t border-white/5">
              <div className="max-w-lg mx-auto flex gap-3">
                <button onClick={() => setStep(1)}
                  className="border border-white/10 text-white/50 font-semibold py-4 px-5 rounded-2xl">← Back</button>
                <button disabled={loading}
                  onClick={() => {
                    if (!name.trim()) { toast.error('Enter your name'); return; }
                    if (phone.replace(/\D/g,'').length !== 10) { toast.error('Enter valid 10-digit phone'); return; }
                    createBooking();
                  }}
                  className="flex-1 text-white font-black py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: grad }}>
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                    : `Proceed to Pay ₹${advanceAmt} →`}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: PAY VIA UPI ── */}
        {step === 3 && booking && (
          <motion.div key="pay" initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
            className="px-4 py-5 max-w-lg mx-auto space-y-5 text-center">

            <div>
              <p className="text-white font-black text-xl mb-1">Pay ₹{advanceAmt} Advance</p>
              <p className="text-white/40 text-sm">Scan QR with PhonePe, GPay, Paytm or any UPI app</p>
            </div>

            {/* Static UPI QR */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-xl">
                {upiId ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurant?.name||'Restaurant')}&am=${advanceAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Advance booking #${bookingId?.slice(0,8).toUpperCase()}`)}`
                    )}`}
                    alt="UPI QR" className="w-48 h-48 rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-center text-sm">
                    <div><div className="text-4xl mb-2">⚠️</div>UPI not configured<br/>Contact restaurant</div>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="bg-[#e94560]/10 border border-[#e94560]/25 rounded-2xl px-6 py-4">
              <p className="text-white/40 text-xs mb-1">Scan & pay exactly</p>
              <p className="text-white font-black text-4xl">₹{advanceAmt}</p>
              <p className="text-white/30 text-sm mt-1">UPI: {upiId || 'Not set'}</p>
              <p className="text-white/20 text-xs mt-0.5">₹{balanceAmt} remaining — pay on arrival</p>
            </div>

            {/* App shortcuts */}
            {upiId && (
              <div className="flex gap-2">
                {[
                  { name:'PhonePe', bg:'bg-purple-600', link:`phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurant?.name||'')}&am=${advanceAmt.toFixed(2)}&cu=INR` },
                  { name:'GPay',    bg:'bg-blue-600',   link:`tez://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurant?.name||'')}&am=${advanceAmt.toFixed(2)}&cu=INR` },
                  { name:'Paytm',   bg:'bg-sky-500',    link:`paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurant?.name||'')}&am=${advanceAmt.toFixed(2)}&cu=INR` },
                ].map(a => (
                  <a key={a.name} href={a.link}
                    className={`${a.bg} text-white text-xs font-bold py-2.5 rounded-xl flex-1 text-center`}>
                    {a.name}
                  </a>
                ))}
              </div>
            )}

            {/* Order summary */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-1.5 text-sm">
              {cart.map(c => (
                <div key={c.item.id} className="flex justify-between">
                  <span className="text-white/55">{c.item.name_en} × {c.quantity}</span>
                  <span className="text-white">₹{Number(c.item.discounted_price > 0 ? c.item.discounted_price : c.item.price) * c.quantity}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white/50">Total</span><span className="text-white">₹{cartTotal}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 border border-white/8 rounded-xl p-4 text-left space-y-2">
              {[
                { icon:'📱', text:'Scan QR or tap app above' },
                { icon:'✅', text:`Pay exactly ₹${advanceAmt} — amount pre-filled` },
                { icon:'⚡', text:'Restaurant gets auto-notified when payment completes' },
              ].map((s,i) => (
                <div key={i} className="flex items-start gap-2">
                  <span>{s.icon}</span>
                  <span className="text-white/50 text-xs">{s.text}</span>
                </div>
              ))}
            </div>

            {/* PhonePe auto-pay — redirects to PhonePe, webhook auto-confirms */}
            <button onClick={payViaPhonePe} disabled={loading}
              className="w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 mb-3"
              style={{ background: 'linear-gradient(135deg, #5f259f, #7b2d9e)' }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Opening PhonePe...</>
                : <>⚡ Pay ₹{advanceAmt} via PhonePe — Auto confirms!</>}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/25 text-xs">or scan QR manually</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button onClick={() => setStep(4)}
              className="w-full border border-white/10 text-white/40 font-semibold py-3 rounded-xl text-sm">
              I paid via QR — Track Booking →
            </button>
          </motion.div>
        )}

        {/* ── STEP 4: CONFIRMED ── */}
        {step === 4 && (
          <motion.div key="done" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            className="px-4 py-10 max-w-lg mx-auto text-center space-y-5">
            <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', delay:0.2 }}
              className="text-7xl">🎉</motion.div>
            <div>
              <h2 className="text-white font-black text-2xl mb-1">Booking Confirmed!</h2>
              <p className="text-white/50 text-sm">Restaurant notified · See you soon, {name}!</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/40">Items</span><span className="text-white font-bold">{cartCount} items · ₹{cartTotal}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Advance paid</span><span className="text-green-400 font-bold">₹{advanceAmt} ✓</span></div>
              <div className="flex justify-between"><span className="text-white/40">Pay on arrival</span><span className="text-white font-bold">₹{balanceAmt}</span></div>
            </div>
            {bookingId && (
              <div className="bg-white/5 rounded-2xl px-4 py-3">
                <p className="text-white/30 text-xs">Booking ID</p>
                <p className="text-white font-mono font-bold mt-0.5">#{bookingId.slice(0,8).toUpperCase()}</p>
              </div>
            )}
            <button onClick={() => navigate(`/booking/${bookingId}`)}
              className="w-full text-white font-black py-4 rounded-2xl mb-3" style={{ background: grad }}>
              📍 Track My Booking →
            </button>
            <button onClick={() => navigate(`/menu/${slug}/table/1`)}
              className="w-full border border-white/10 text-white/50 font-semibold py-3 rounded-xl text-sm">
              Browse Menu
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}