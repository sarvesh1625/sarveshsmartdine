import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const OPTIONS = [
  { key: 'waiter', icon: '🙋', label: 'Call Waiter' },
  { key: 'water',  icon: '💧', label: 'Water Please' },
  { key: 'bill',   icon: '🧾', label: 'Get Bill' },
];

export default function WaiterButton({ restaurantId, tableId, slug }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function call(type) {
    setLoading(true);
    try {
      await axios.post('/api/v1/restaurant/waiter-call', {
        restaurantSlug: slug,
        tableId,
        type,
      });
      toast.success(type === 'waiter' ? 'Waiter is on the way!' : type === 'water' ? 'Water coming soon!' : 'Bill requested!', {
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      });
      setOpen(false);
    } catch {
      toast.error('Could not reach staff. Please try again.');
    } finally {
      setLoading(false); }
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && OPTIONS.map((opt, i) => (
          <motion.button
            key={opt.key}
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => call(opt.key)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#1A1A1A] border border-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(v => !v)}
        className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-xl transition-all ${
          open ? 'bg-white/20 rotate-45' : 'bg-[#1A1A1A] border border-white/15'
        }`}
      >
        {open ? '✕' : '🔔'}
      </motion.button>
    </div>
  );
}