import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key:     'free',
    name:    'Free',
    price:   '₹0',
    period:  '/month',
    color:   'border-white/10 bg-white/3',
    badge:   null,
    features: ['3 tables', '30 menu items', 'Basic order management', 'Offline menu cache', 'Pay at counter only'],
    disabled: true,
  },
  {
    key:     'pro',
    name:    'Pro',
    price:   '₹999',
    amount:  99900,
    period:  '/month',
    color:   'border-[#e94560]/40 bg-[#e94560]/6',
    badge:   'Most Popular',
    features: ['1 restaurant location', 'Unlimited tables & items', 'UPI + card payments', 'Full analytics dashboard', 'AI voice ordering (Telugu)', 'Multi-language support', 'Coupons & promotions', 'SMS notifications', 'Remove branding'],
  },
  {
    key:     'enterprise',
    name:    'Enterprise',
    price:   '₹2,999',
    amount:  299900,
    period:  '/month',
    color:   'border-purple-500/40 bg-purple-500/6',
    badge:   'For chains',
    features: ['Everything in Pro', '🏪 Unlimited branches', 'Centralised branch dashboard', 'Per-branch analytics', 'Custom domain & white-label', 'Dedicated account manager', 'API access', 'Priority 24/7 support'],
  },
];

export default function UpgradePage() {
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const [loading, setLoading] = useState('');

  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn:  () => api.get('/billing/status').then(r => r.data.data),
    retry: false,
    onError: () => {},   // silently fail — page still works
  });

  async function handleUpgrade(plan) {
    if (plan.disabled) return;
    if (!plan.key || plan.key === 'free') return;
    if (!['pro', 'enterprise'].includes(plan.key)) {
      toast.error('Invalid plan selected');
      return;
    }
    setLoading(plan.key);
    try {
      console.log('Sending plan_type:', plan.key);
      const res = await api.post('/billing/create-order', { plan_type: plan.key });
      console.log('Response:', res.data);
      const { data } = res;

      // Load Razorpay script
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const rzp = new window.Razorpay({
        key:         data.data.keyId,
        amount:      data.data.amount,
        currency:    'INR',
        name:        'SmartDine',
        description: `${plan.name} Plan — 1 Month`,
        order_id:    data.data.orderId,
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#e94560' },
        handler: async (response) => {
          try {
            await api.post('/billing/verify-payment', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan_type:           plan.key,
            });
            // Update planType in authStore so sidebar reflects immediately
            useAuthStore.getState().setPlanType(plan.key);
            qc.invalidateQueries(['billing-status']);
            qc.invalidateQueries(['admin-orders']);
            toast.success(`🎉 Upgraded to ${plan.name}! Enjoy all features.`);
            navigate('/admin');
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: { ondismiss: () => setLoading('') },
      });
      rzp.open();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Payment gateway unavailable';
      console.error('Billing error:', err.response?.status, err.response?.data);
      toast.error(msg);
      setLoading('');
    }
  }

  const [searchParams]   = useSearchParams();
  const urlPlan          = searchParams.get('plan'); // e.g. ?plan=enterprise
  const currentPlan      = billing?.planType || 'free';
  const trialDays        = billing?.trialDaysLeft || 0;
  const isExpired        = billing ? !billing.hasAccess : false;

  // Auto-scroll to and highlight the plan from URL
  useEffect(() => {
    if (urlPlan) {
      setTimeout(() => {
        document.getElementById(`plan-${urlPlan}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [urlPlan]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <button onClick={() => navigate('/admin')} className="text-white/30 text-sm mb-6 hover:text-white/60 transition-colors inline-block">
            ← Back to dashboard
          </button>
          <h1 className="text-3xl font-black mb-3">
            {isExpired ? '🔒 Upgrade to Continue' : '⬆️ Upgrade Your Plan'}
          </h1>
          {isExpired ? (
            <p className="text-red-400 text-sm font-semibold">Your free trial has ended. Upgrade to restore full access.</p>
          ) : billing?.isTrialActive ? (
            <p className="text-white/50 text-sm">{trialDays} days left in your free trial. Upgrade anytime to keep access.</p>
          ) : (
            <p className="text-white/50 text-sm">You're on the <span className="text-white font-bold capitalize">{currentPlan}</span> plan.</p>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {PLANS.map((plan, i) => {
            const isCurrent = currentPlan === plan.key && billing?.isPaid;
            const isDisabled = plan.disabled || (isCurrent && billing?.isPaid);
            return (
              <motion.div key={plan.key} id={`plan-${plan.key}`}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 flex flex-col ${plan.color} ${isCurrent ? 'ring-2 ring-[#e94560]' : ''}`}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e94560] text-white text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-black px-3 py-1 rounded-full">
                    Current
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-white font-black text-lg mb-1">{plan.name}</div>
                  <div>
                    <span className="text-white font-black text-3xl">{plan.price}</span>
                    <span className="text-white/30 text-sm">{plan.period}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-white/65 text-sm">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isDisabled && handleUpgrade(plan)}
                  disabled={!!isDisabled || loading === plan.key}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                    isCurrent
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default'
                      : plan.key === 'free'
                      ? 'bg-white/5 border border-white/10 text-white/30 cursor-default'
                      : plan.key === 'pro'
                      ? 'bg-[#e94560] text-white hover:bg-[#d63050] shadow-lg shadow-[#e94560]/25'
                      : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/25'
                  }`}
                >
                  {loading === plan.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : isCurrent ? '✓ Current plan'
                    : plan.key === 'free' ? 'Free plan'
                    : `Upgrade to ${plan.name} →`}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4">Common questions</h2>
          <div className="space-y-4">
            {[
              ['What happens after 15 days on free?', 'Your dashboard is locked until you upgrade. Customer menu and QR codes continue working so customers can still see your menu.'],
              ['Can I cancel anytime?', 'Yes. Plans are monthly. Cancel before renewal and you keep access until the end of the billing period.'],
              ['Is payment secure?', 'Yes — payments are processed via Razorpay, India\'s leading payment gateway. We never store card details.'],
              ['What payment methods are accepted?', 'UPI, all debit/credit cards, net banking, wallets — all major Indian payment methods.'],
            ].map(([q, a]) => (
              <div key={q} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <p className="text-white font-semibold text-sm mb-1">{q}</p>
                <p className="text-white/40 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Need help? Email hello@smartdine.in or WhatsApp +91 98765 43210
        </p>
      </div>
    </div>
  );
}