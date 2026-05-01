import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';

export default function TrialExpiredWall() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-4xl mx-auto mb-6">
          🔒
        </div>

        <h1 className="text-white font-black text-2xl mb-3">Trial Expired</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          Your 15-day free trial has ended. Upgrade to a paid plan to continue using your restaurant dashboard, kitchen display, analytics and more.
        </p>

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            {
              name: 'Pro',
              price: '₹999',
              period: '/month',
              color: 'border-[#e94560]/40 bg-[#e94560]/8',
              badge: 'Most Popular',
              features: ['Unlimited tables & items', 'UPI payments', 'Analytics', 'AI ordering', 'Multi-language'],
            },
            {
              name: 'Enterprise',
              price: '₹2,999',
              period: '/month',
              color: 'border-purple-500/40 bg-purple-500/8',
              badge: 'For chains',
              features: ['Everything in Pro', 'Multi-branch', 'Custom domain', 'Dedicated support', 'API access'],
            },
          ].map(plan => (
            <div key={plan.name} className={`rounded-2xl border p-4 text-left ${plan.color}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-black text-base">{plan.name}</span>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-lg">{plan.badge}</span>
              </div>
              <div className="mb-3">
                <span className="text-white font-black text-xl">{plan.price}</span>
                <span className="text-white/30 text-xs">{plan.period}</span>
              </div>
              <div className="space-y-1">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <span className="text-green-400 text-xs">✓</span>
                    <span className="text-white/60 text-xs">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/admin/upgrade')}
          className="w-full bg-[#e94560] hover:bg-[#d63050] text-white font-black py-4 rounded-2xl text-base transition-colors mb-3 shadow-lg shadow-[#e94560]/30"
        >
          Upgrade Now — Keep Your Dashboard
        </button>

        <button
          onClick={handleLogout}
          className="w-full text-white/30 text-sm py-2 hover:text-white/50 transition-colors"
        >
          Sign out
        </button>

        <p className="text-white/20 text-xs mt-4">
          Questions? Contact us at hello@smartdine.in
        </p>
      </motion.div>
    </div>
  );
}