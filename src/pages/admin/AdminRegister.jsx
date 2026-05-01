import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const STEPS = ['Restaurant', 'Owner', 'Password'];

export default function AdminRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectAfter  = searchParams.get('redirect') || null;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    restaurantName: '', city: '', state: '',
    ownerName: '', phone: '', email: '',
    password: '', confirmPassword: '',
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await axios.post('/api/v1/auth/register', {
        restaurantName: form.restaurantName,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        city: form.city,
        state: form.state,
      });
      toast.success('Registered! Please login to continue.');
      // Pass redirect so after login user goes to upgrade page
      navigate(redirectAfter ? `/admin/login?redirect=${encodeURIComponent(redirectAfter)}` : '/admin/login');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) errors.forEach(e => toast.error(e));
      else toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-all";

  const steps = [
    <div key={0} className="space-y-4">
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Restaurant Name *</label>
        <input className={inputClass} placeholder="e.g. Spice Garden" value={form.restaurantName} onChange={e => update('restaurantName', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">City</label>
          <input className={inputClass} placeholder="Hyderabad" value={form.city} onChange={e => update('city', e.target.value)} />
        </div>
        <div>
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">State</label>
          <input className={inputClass} placeholder="Telangana" value={form.state} onChange={e => update('state', e.target.value)} />
        </div>
      </div>
    </div>,
    <div key={1} className="space-y-4">
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Owner Name *</label>
        <input className={inputClass} placeholder="Your full name" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Phone *</label>
        <input className={inputClass} type="tel" placeholder="9876543210" value={form.phone} onChange={e => update('phone', e.target.value)} />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Email *</label>
        <input className={inputClass} type="email" placeholder="you@restaurant.com" value={form.email} onChange={e => update('email', e.target.value)} />
      </div>
    </div>,
    <div key={2} className="space-y-4">
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Password *</label>
        <input className={inputClass} type="password" placeholder="Min 8 chars, uppercase + number" value={form.password} onChange={e => update('password', e.target.value)} />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Confirm Password *</label>
        <input className={inputClass} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
      </div>
      <div className="bg-white/5 rounded-xl p-4 text-xs text-white/40 leading-relaxed">
        🎉 <strong className="text-white/60">Free forever plan</strong> — up to 3 tables, 30 menu items. No credit card needed.
      </div>
    </div>,
  ];

  const canNext = [
    form.restaurantName.trim().length >= 2,
    form.ownerName && form.phone && form.email,
    form.password.length >= 8 && form.confirmPassword,
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#e94560] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">M</span>
          </div>
          <span className="text-white font-black text-lg">MenuVia</span>
        </div>

        <h2 className="text-3xl font-black text-white mb-1">Register your restaurant</h2>
        <p className="text-white/40 text-sm mb-8">Free forever. No credit card needed.</p>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#e94560] text-white' : 'bg-white/10 text-white/30'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-white' : 'text-white/30'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? 'bg-green-500/50' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          {steps[step]}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 border border-white/10 text-white/60 hover:text-white font-semibold py-3 rounded-xl transition-colors">
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
              className="flex-1 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !canNext[2]}
              className="flex-1 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registering...
                </span>
              ) : 'Create Account 🚀'}
            </button>
          )}
        </div>

        <p className="text-center text-white/30 text-sm mt-5">
          Already registered?{' '}
          <Link to="/admin/login" className="text-[#e94560] font-semibold">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}