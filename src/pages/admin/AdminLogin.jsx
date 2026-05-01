import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectAfter  = searchParams.get('redirect') || null;

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      if (redirectAfter) {
        navigate(decodeURIComponent(redirectAfter));
      } else if (result.user?.role === 'super_admin') {
        navigate('/superadmin');
      } else if (result.user?.role === 'staff') {
        navigate('/staff');
      } else if (result.user?.role === 'kitchen') {
        navigate('/kitchen');
      } else {
        navigate('/admin');
      }
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#111] border-r border-white/5 p-12 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#e94560] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-black">M</span>
          </div>
          <span className="text-white font-black text-lg">MenuVia</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Your restaurant,<br />
            <span className="text-[#e94560]">fully digital.</span>
          </h1>
          <p className="text-white/40 text-lg leading-relaxed max-w-sm">
            QR menus, real-time orders, kitchen display, and analytics — all in one place.
          </p>
        </motion.div>
        <div className="grid grid-cols-3 gap-4">
          {[{ value: '2min', label: 'Setup time' }, { value: '₹0', label: 'To get started' }, { value: '100%', label: 'Contactless' }].map(({ value, label }) => (
            <div key={label} className="bg-white/5 rounded-2xl p-4">
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-white/40 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-[#e94560] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="text-white font-black text-lg">MenuVia</span>
          </div>

          <h2 className="text-3xl font-black text-white mb-1">Sign in</h2>
          <p className="text-white/40 text-sm mb-8">Access your restaurant dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@restaurant.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-all"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-all pr-16"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-lg shadow-[#e94560]/25">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            New restaurant?{' '}
            <Link to="/admin/register" className="text-[#e94560] hover:text-[#ff6b80] font-semibold">Register for free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}