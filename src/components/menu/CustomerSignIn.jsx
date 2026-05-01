import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCustomerStore from '../../store/customerStore';
import toast from 'react-hot-toast';

export default function CustomerSignIn({ restaurantName, onDone }) {
  const { setCustomer } = useCustomerStore();
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [step,  setStep]  = useState('prompt'); // prompt | form

  function handleGuest() {
    setCustomer({ name: 'Guest', phone: null });
    onDone();
  }

  function handleSignIn(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (phone && !/^[6-9]\d{9}$/.test(phone.trim())) {
      toast.error('Enter a valid 10-digit phone number'); return;
    }
    setCustomer({ name: name.trim(), phone: phone.trim() || null });
    toast.success(`Welcome, ${name.trim()}! 👋`);
    onDone();
  }

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#e94560]/60 transition-colors";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-end"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="w-full bg-[#111] rounded-t-3xl"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          <div className="px-5 pb-8 pt-2">
            {/* Logo + restaurant name */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[#e94560] rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-3">
                {restaurantName?.[0]?.toUpperCase()}
              </div>
              <h2 className="text-white font-black text-xl">{restaurantName}</h2>
              <p className="text-white/40 text-sm mt-1">Welcome! Sign in to track your orders</p>
            </div>

            {step === 'prompt' ? (
              <div className="space-y-3">
                {/* Sign in CTA */}
                <div className="bg-[#e94560]/10 border border-[#e94560]/20 rounded-2xl p-4 mb-2">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📱</div>
                    <div>
                      <p className="text-white font-bold text-sm mb-1">Sign in to track your order live</p>
                      <p className="text-white/50 text-xs leading-relaxed">
                        Enter your name and phone number so you can track your order status in real-time and submit feedback after your meal.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('form')}
                  className="w-full bg-[#e94560] hover:bg-[#d63050] text-white font-bold py-4 rounded-2xl transition-colors text-sm"
                >
                  Sign in with phone →
                </button>

                <button
                  onClick={handleGuest}
                  className="w-full bg-white/5 border border-white/10 text-white/60 font-semibold py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-sm"
                >
                  Continue as guest (no tracking)
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Your Name *</label>
                  <input
                    className={inp}
                    placeholder="e.g. Ravi Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                    Phone Number <span className="normal-case text-white/25">(for tracking)</span>
                  </label>
                  <input
                    className={inp}
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    maxLength={10}
                  />
                  <p className="text-white/25 text-xs mt-1.5">Used only to show your past orders</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#e94560] hover:bg-[#d63050] text-white font-bold py-4 rounded-2xl transition-colors text-sm mt-2"
                >
                  Let's order! →
                </button>
                <button
                  type="button"
                  onClick={() => setStep('prompt')}
                  className="w-full text-white/30 text-sm py-2"
                >
                  ← Back
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}