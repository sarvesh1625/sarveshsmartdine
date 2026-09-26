import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const LOGO = 'https://res.cloudinary.com/dummgu0pr/image/upload/v1783176548/Logo_guszj5.png';
const STEPS = ['Verify Phone', 'Restaurant', 'Owner', 'Password'];

// MSG91 Widget config — tokenAuth is a public client-side token, safe to expose
const MSG91_WIDGET_ID  = '36697a664b66333630343431';
const MSG91_TOKEN_AUTH = '575307TxrDtNCw6ab76826P1';

export default function AdminRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectAfter = searchParams.get('redirect') || null;

  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);

  // OTP state
  const [otpSent,      setOtpSent]      = useState(false);
  const [otpValue,     setOtpValue]     = useState('');
  const [otpVerified,  setOtpVerified]  = useState(false);
  const [otpLoading,   setOtpLoading]   = useState(false);
  const [resendTimer,  setResendTimer]  = useState(0);
  const timerRef = useRef(null);

  const [form, setForm] = useState({
    restaurantName: '', city: '', state: '',
    ownerName: '', phone: '', email: '',
    password: '', confirmPassword: '',
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Load MSG91 widget script once — guarded against React StrictMode's
  // double-invoked effects, which would otherwise inject the script twice
  // and corrupt the widget's internal h-captcha custom element registry. ──
  useEffect(() => {
    // Set/refresh the callbacks every render so closures stay fresh
    window.configuration = {
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_TOKEN_AUTH,
      exposeMethods: true, // we control the UI ourselves
      success: (data) => {
        // data.message contains the verified access-token
        verifyTokenServerSide(data.message);
      },
      failure: (error) => {
        console.error('MSG91 widget error:', error);
        toast.error('OTP verification failed. Please try again.');
        setOtpLoading(false);
      },
    };

    // Already loaded and initialized — just reuse it, don't re-init
    if (window.__msg91WidgetLoaded && typeof window.initSendOTP === 'function') {
      window.initSendOTP(window.configuration);
      setWidgetReady(true);
      return;
    }

    // Script tag already injected (e.g. StrictMode double-effect) — don't add again
    if (document.getElementById('msg91-otp-widget-script')) return;

    const urls = [
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js',
    ];
    let i = 0;
    function attempt() {
      const s = document.createElement('script');
      s.id = 'msg91-otp-widget-script';
      s.src = urls[i];
      s.async = true;
      s.onload = () => {
        if (typeof window.initSendOTP === 'function') {
          window.initSendOTP(window.configuration);
          window.__msg91WidgetLoaded = true;
          setWidgetReady(true);
        }
      };
      s.onerror = () => {
        document.getElementById('msg91-otp-widget-script')?.remove();
        i++;
        if (i < urls.length) attempt();
      };
      document.head.appendChild(s);
    }
    attempt();
  }, []);

  function startResendTimer() {
    setResendTimer(30);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  // ── Verify the MSG91 access-token on our backend before trusting it ──
  async function verifyTokenServerSide(token) {
    try {
      await axios.post('/api/v1/auth/verify-widget-token', { token });
      setOtpVerified(true);
      setOtpLoading(false);
      toast.success('Phone number verified! ✅');
      setTimeout(() => setStep(1), 600);
    } catch (err) {
      setOtpLoading(false);
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  }

  function sendOtp() {
    const clean = form.phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    if (!widgetReady || typeof window.sendOtp !== 'function') {
      toast.error('OTP service still loading, please wait a moment');
      return;
    }
    setOtpLoading(true);
    window.sendOtp(
      `91${clean}`,
      () => {
        setOtpSent(true);
        setOtpLoading(false);
        startResendTimer();
        toast.success('OTP sent to your mobile number');
      },
      (err) => {
        setOtpLoading(false);
        console.error('sendOtp error:', err);
        toast.error('Failed to send OTP. Please try again.');
      }
    );
  }

  function resendOtp() {
    if (typeof window.retryOtp !== 'function') { sendOtp(); return; }
    setOtpLoading(true);
    window.retryOtp(
      'text', // retry channel — 'text' for SMS
      () => { setOtpLoading(false); startResendTimer(); toast.success('OTP resent'); },
      () => { setOtpLoading(false); toast.error('Failed to resend OTP'); }
    );
  }

  function verifyOtp() {
    if (!/^\d{4,6}$/.test(otpValue)) { toast.error('Enter the OTP'); return; }
    if (typeof window.verifyOtp !== 'function') {
      toast.error('OTP service unavailable, please refresh and try again');
      return;
    }
    setOtpLoading(true);
    window.verifyOtp(
      otpValue
      // success/failure handled by the global configuration.success / configuration.failure
    );
  }

  async function handleSubmit() {
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (!otpVerified) { toast.error('Please verify your phone number first'); setStep(0); return; }
    setLoading(true);
    try {
      await axios.post('/api/v1/auth/register', {
        restaurantName: form.restaurantName,
        ownerName:      form.ownerName,
        email:          form.email,
        password:       form.password,
        phone:          form.phone.replace(/\D/g, '').slice(-10),
        city:           form.city,
        state:          form.state,
      });
      toast.success('Registered! Please login to continue.');
      navigate(redirectAfter
        ? `/admin/login?redirect=${encodeURIComponent(redirectAfter)}`
        : '/admin/login'
      );
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) errors.forEach(e => toast.error(e));
      else toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-all";

  const stepContent = [
    // ── STEP 0: Phone verification ──
    <div key={0} className="space-y-4">
      {!otpVerified ? (
        <>
          <div>
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Mobile Number *</label>
            <div className="flex gap-2">
              <input
                className={inp}
                type="tel"
                placeholder="9876543210"
                value={form.phone}
                disabled={otpSent}
                onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
              {!otpSent && (
                <button
                  onClick={sendOtp}
                  disabled={otpLoading || !form.phone || !widgetReady}
                  className="px-5 py-3 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white text-sm font-bold rounded-xl whitespace-nowrap transition-all"
                >
                  {otpLoading ? '...' : !widgetReady ? 'Loading...' : 'Send OTP'}
                </button>
              )}
            </div>
            <p className="text-white/25 text-xs mt-1.5">We'll send a 6-digit OTP to verify your number</p>
          </div>

          {otpSent && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Enter OTP *</label>
              <input
                className={inp}
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={resendOtp}
                  disabled={resendTimer > 0 || otpLoading}
                  className="text-xs text-[#e94560] disabled:text-white/20 font-semibold hover:underline"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </button>
                <button
                  onClick={() => { setOtpSent(false); setOtpValue(''); update('phone', ''); }}
                  className="text-xs text-white/30 hover:text-white/50"
                >
                  Change number
                </button>
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-white font-bold text-sm">Phone verified!</p>
            <p className="text-white/40 text-xs">{form.phone}</p>
          </div>
        </div>
      )}
    </div>,

    // ── STEP 1: Restaurant ──
    <div key={1} className="space-y-4">
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Restaurant Name *</label>
        <input className={inp} placeholder="e.g. Spice Garden" value={form.restaurantName} onChange={e => update('restaurantName', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">City</label>
          <input className={inp} placeholder="Hyderabad" value={form.city} onChange={e => update('city', e.target.value)} />
        </div>
        <div>
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">State</label>
          <input className={inp} placeholder="Telangana" value={form.state} onChange={e => update('state', e.target.value)} />
        </div>
      </div>
    </div>,

    // ── STEP 2: Owner ──
    <div key={2} className="space-y-4">
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Owner Name *</label>
        <input className={inp} placeholder="Your full name" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Phone (verified)</label>
        <input className={`${inp} opacity-60 cursor-not-allowed`} value={form.phone} disabled />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Email *</label>
        <input className={inp} type="email" placeholder="you@restaurant.com" value={form.email} onChange={e => update('email', e.target.value)} />
      </div>
    </div>,

    // ── STEP 3: Password ──
    <div key={3} className="space-y-4">
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Password *</label>
        <input className={inp} type="password" placeholder="Min 8 characters" value={form.password} onChange={e => update('password', e.target.value)} />
      </div>
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Confirm Password *</label>
        <input className={inp} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-white/50 text-xs leading-relaxed">
          By registering you agree to our{' '}
          <span className="text-[#e94560]">Terms of Service</span> and{' '}
          <span className="text-[#e94560]">Privacy Policy</span>.
          Your 15-day free trial starts immediately.
        </p>
      </div>
    </div>,
  ];

  function nextStep() {
    if (step === 0) {
      if (!otpVerified) { toast.error('Please verify your phone number first'); return; }
      setStep(1);
      return;
    }
    if (step === 1 && !form.restaurantName.trim()) { toast.error('Restaurant name is required'); return; }
    if (step === 2 && (!form.ownerName.trim() || !form.email.trim())) { toast.error('All fields are required'); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#111] border-r border-white/5 p-12 justify-between">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="MenuVia" className="h-10 w-auto object-contain" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Go digital in<br />
            <span className="text-[#e94560]">under 2 minutes.</span>
          </h1>
          <p className="text-white/40 text-lg leading-relaxed max-w-sm">
            Join 500+ restaurants across India already using MenuVia to take orders, manage their kitchen, and grow their business.
          </p>
        </motion.div>
        <div className="space-y-3">
          {[
            { icon: '📱', text: 'Verified phone — no spam accounts' },
            { icon: '✅', text: '15-day free trial — no credit card needed' },
            { icon: '🍳', text: 'Real-time kitchen display included'        },
            { icon: '📊', text: 'Analytics and feedback built-in'           },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-white/50 text-sm">
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">

          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src={LOGO} alt="MenuVia" className="h-9 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-1.5 mb-8 flex-wrap">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-[#e94560] text-white' :
                  'bg-white/10 text-white/30'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-[11px] font-semibold hidden sm:inline ${i === step ? 'text-white' : 'text-white/30'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`w-4 h-px ${i < step ? 'bg-green-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            {step === 0 ? 'Verify your phone' :
             step === 1 ? 'Your restaurant' :
             step === 2 ? 'Your details' : 'Set password'}
          </h2>
          <p className="text-white/40 text-sm mb-6">
            {step === 0 ? 'We verify every restaurant to keep MenuVia spam-free' :
             step === 1 ? 'Tell us about your restaurant' :
             step === 2 ? 'How can customers reach you?' :
             'Secure your account'}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-white/10 text-white/50 font-semibold py-3.5 rounded-xl hover:bg-white/5 transition-all"
              >
                ← Back
              </button>
            )}

            {step === 0 ? (
              otpSent && !otpVerified ? (
                <button
                  onClick={verifyOtp}
                  disabled={otpLoading || otpValue.length < 4}
                  className="flex-1 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {otpLoading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                    : 'Verify OTP →'
                  }
                </button>
              ) : otpVerified ? (
                <button
                  onClick={nextStep}
                  className="flex-1 bg-[#e94560] hover:bg-[#d63050] text-white font-bold py-3.5 rounded-xl transition-all"
                >
                  Continue →
                </button>
              ) : null
            ) : (
              <button
                onClick={nextStep}
                disabled={loading}
                className="flex-1 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  : step < STEPS.length - 1 ? 'Continue →' : '🚀 Create Account'
                }
              </button>
            )}
          </div>

          <p className="text-center text-white/30 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/admin/login" className="text-[#e94560] font-semibold hover:underline">Sign in</Link>
          </p>

          <a
            href="https://wa.me/919390683569"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 text-white/25 hover:text-green-400 transition-colors text-xs"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Need help? Chat on WhatsApp
          </a>
        </motion.div>
      </div>
    </div>
  );
}