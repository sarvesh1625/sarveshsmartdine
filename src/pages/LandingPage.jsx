import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

if (!document.getElementById('sd-fonts')) {
  const l = document.createElement('link');
  l.id   = 'sd-fonts';
  l.rel  = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap';
  document.head.appendChild(l);
}

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, vis];
}

function Reveal({ children, delay = 0, y = 40, className = '', style = {} }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity:    vis ? 1 : 0,
      transform:  vis ? 'none' : `translateY(${y}px)`,
      transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function AnimNum({ target, suffix = '', prefix = '' }) {
  const [n, setN] = useState(0);
  const [ref, vis] = useReveal();
  useEffect(() => {
    if (!vis) return;
    let start = 0;
    const step = target / 40;
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setN(target); clearInterval(id); }
      else setN(Math.floor(start));
    }, 30);
    return () => clearInterval(id);
  }, [vis, target]);
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

const C = {
  bg:       '#060608',
  surface:  '#0D0D10',
  border:   'rgba(255,255,255,0.07)',
  red:      '#FF2D55',
  redDim:   'rgba(255,45,85,0.12)',
  redBorder:'rgba(255,45,85,0.25)',
  textPrimary: '#F5F5F7',
  textMuted:   'rgba(245,245,247,0.45)',
  textDim:     'rgba(245,245,247,0.25)',
};

// ── Legal Modal ──────────────────────────────────────────────────────────────
function LegalModal({ type, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const content = {
    privacy: {
      title: 'Privacy Policy',
      updated: 'Last updated: June 2026',
      sections: [
        { heading: 'Information We Collect', body: 'We collect information you provide directly to us when you register your restaurant, including your name, email address, phone number, and restaurant details. We also collect usage data such as pages visited, features used, and order activity.' },
        { heading: 'How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.' },
        { heading: 'Data Storage', body: 'Your data is stored securely on servers in the European Union (Clever Cloud infrastructure). We use industry-standard encryption for data in transit and at rest.' },
        { heading: 'Data Sharing', body: 'We do not sell, trade, or otherwise transfer your personally identifiable information to third parties. We may share data with trusted service providers who assist us in operating our platform, subject to confidentiality agreements.' },
        { heading: 'Customer Data', body: 'Order data from your restaurant customers (name, phone) is stored solely to enable order tracking. We do not use customer data for marketing or share it with any third party.' },
        { heading: 'Cookies', body: 'We use essential cookies for authentication and session management. We do not use advertising or tracking cookies.' },
        { heading: 'Your Rights', body: 'You may request access to, correction of, or deletion of your personal data at any time by contacting us at sarveshthokala1625@gmail.com.' },
        { heading: 'Contact', body: 'For privacy-related queries, contact Tokala Sarveswara Rao at sarveshthokala1625@gmail.com.' },
      ],
    },
    terms: {
      title: 'Terms of Service',
      updated: 'Last updated: June 2026',
      sections: [
        { heading: 'Acceptance of Terms', body: 'By registering and using MenuVia, you agree to these Terms of Service. If you do not agree to these terms, please do not use our platform.' },
        { heading: 'Use of Service', body: 'MenuVia provides a restaurant management platform including digital menus, order management, kitchen display, and analytics. You may use the service only for lawful purposes and in accordance with these Terms.' },
        { heading: 'Account Responsibility', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.' },
        { heading: 'Free Trial', body: 'New restaurants receive a 15-day free trial of all Pro features. After the trial, your account reverts to the Free plan unless you upgrade. No credit card is required for the trial.' },
        { heading: 'Payment & Billing', body: 'Paid plans are billed monthly. Payments are processed securely via Razorpay. All prices are in Indian Rupees and inclusive of applicable taxes.' },
        { heading: 'Refunds', body: 'Please refer to our Refund Policy for details on cancellations and refunds.' },
        { heading: 'Termination', body: 'We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity. You may cancel your subscription at any time from your dashboard.' },
        { heading: 'Limitation of Liability', body: 'MenuVia shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service.' },
        { heading: 'Governing Law', body: 'These Terms shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Andhra Pradesh, India.' },
        { heading: 'Contact', body: 'For terms-related queries, contact us at sarveshthokala1625@gmail.com.' },
      ],
    },
    refund: {
      title: 'Refund Policy',
      updated: 'Last updated: June 2026',
      sections: [
        { heading: 'Overview', body: 'We want you to be satisfied with MenuVia. This policy outlines when refunds are issued.' },
        { heading: 'Free Trial', body: 'All new restaurants receive a 15-day free trial. No payment is required during the trial period, so no refund is applicable.' },
        { heading: 'Monthly Subscriptions', body: 'Monthly subscription payments are non-refundable once the billing period has started. You can cancel at any time and retain access until the end of the paid period.' },
        { heading: 'Exceptional Circumstances', body: 'If you experience a technical issue caused by MenuVia that significantly impairs your ability to use the service, contact us within 7 days. We will review the situation and may issue a full or partial refund at our discretion.' },
        { heading: 'Duplicate Payments', body: 'If you are charged twice for the same billing period due to a technical error, we will promptly refund the duplicate charge.' },
        { heading: 'How to Request a Refund', body: 'Email sarveshthokala1625@gmail.com with your registered email, the date of payment, and the reason for the refund request. We respond within 2 business days.' },
        { heading: 'Processing Time', body: 'Approved refunds are processed within 5–7 business days and credited to your original payment method via Razorpay.' },
      ],
    },
    cookie: {
      title: 'Cookie Policy',
      updated: 'Last updated: June 2026',
      sections: [
        { heading: 'What Are Cookies', body: 'Cookies are small text files stored on your device when you visit a website. We use cookies to make MenuVia work correctly and securely.' },
        { heading: 'Cookies We Use', body: 'We use only essential cookies: authentication tokens to keep you logged in, and session cookies to maintain your admin dashboard state. We do not use advertising, tracking, or analytics cookies.' },
        { heading: 'Third-Party Cookies', body: 'Our payment provider Razorpay may set cookies during the payment process. We do not control these cookies. Please refer to Razorpay\'s cookie policy for details.' },
        { heading: 'Managing Cookies', body: 'You can control or delete cookies through your browser settings. Note that disabling essential cookies will prevent you from logging into the admin dashboard.' },
        { heading: 'No Advertising', body: 'MenuVia does not use advertising cookies and does not share your browsing data with advertisers.' },
        { heading: 'Contact', body: 'For cookie-related queries, email us at sarveshthokala1625@gmail.com.' },
      ],
    },
  };

  const c = content[type];
  if (!c) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'relative', background: '#0D0D10', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, width: '100%', maxWidth: 680, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display'", fontWeight: 800, fontSize: 22, color: '#F5F5F7', marginBottom: 4 }}>{c.title}</h2>
            <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)' }}>{c.updated}</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,245,247,0.5)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '24px 32px', flex: 1 }}>
          {c.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: "'Playfair Display'", fontWeight: 700, fontSize: 16, color: '#F5F5F7', marginBottom: 8 }}>{s.heading}</h3>
              <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.55)', lineHeight: 1.8 }}>{s.body}</p>
            </div>
          ))}
          <div style={{ marginTop: 32, padding: '20px 24px', background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.15)', borderRadius: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', lineHeight: 1.7 }}>
              <strong style={{ color: "rgba(245,245,247,0.8)" }}>MenuVia</strong> is operated by Tokala Sarveswara Rao.<br />
              📧 sarveshthokala1625@gmail.com &nbsp;·&nbsp; 📍 Andhra Pradesh, India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrollY,      setScrollY]      = useState(0);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [legalModal,   setLegalModal]   = useState(null); // 'privacy'|'terms'|'refund'|'cookie'

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navScrolled = scrollY > 60;

  function goTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  }

  const NAV = [
    { label: 'Features',     id: 'features'   },
    { label: 'How it works', id: 'howitworks' },
    { label: 'Pricing',      id: 'pricing'     },
    { label: 'Contact',      id: 'contact'     },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, color: C.textPrimary, overflowX: 'hidden', lineHeight: 1.6 }}>

      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(255,45,85,0.3); color: #fff; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #060608; } ::-webkit-scrollbar-thumb { background: #2a2a2e; border-radius: 3px; }
        a { text-decoration: none; }
        .nav-link { background: none; border: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 500; color: rgba(245,245,247,0.55); padding: 8px 14px; border-radius: 8px; transition: all 0.2s; }
        .nav-link:hover { color: #F5F5F7; background: rgba(255,255,255,0.06); }
        .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #FF2D55; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 15px; padding: 13px 26px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.25s; text-decoration: none; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 20px 40px rgba(255,45,85,0.35); background: #ff1a40; }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.06); color: rgba(245,245,247,0.7); font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 15px; padding: 13px 26px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.25s; text-decoration: none; }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); }
        .feat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; transition: all 0.35s cubic-bezier(.16,1,.3,1); cursor: default; position: relative; overflow: hidden; }
        .feat-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,45,85,0.04), transparent); opacity: 0; transition: opacity 0.35s; border-radius: 20px; }
        .feat-card:hover { border-color: rgba(255,45,85,0.2); transform: translateY(-6px); box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .feat-card:hover::before { opacity: 1; }
        .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 28px 24px; text-align: center; transition: all 0.3s; }
        .stat-card:hover { border-color: rgba(255,45,85,0.2); transform: translateY(-4px); }
        .step-num { font-family: 'Playfair Display', Georgia, serif; font-weight: 800; font-size: 72px; background: linear-gradient(135deg, rgba(255,45,85,0.15), transparent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }
        .pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,45,85,0.08); border: 1px solid rgba(255,45,85,0.18); border-radius: 100px; padding: 5px 14px; }
        .pill-text { font-size: 12px; font-weight: 600; color: #FF2D55; letter-spacing: 0.04em; text-transform: uppercase; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Playfair Display', Georgia, serif !important; letter-spacing: -0.02em; }
        .input-style { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 13px 16px; color: #F5F5F7; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .input-style::placeholder { color: rgba(245,245,247,0.25); }
        .input-style:focus { border-color: rgba(255,45,85,0.4); }
        .tag { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 4px 10px; font-size: 12px; color: rgba(245,245,247,0.45); font-weight: 500; }
        .ticker { display: flex; gap: 24px; white-space: nowrap; animation: ticker 20s linear infinite; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .floating { animation: float 6s ease-in-out infinite; }
        .floating-2 { animation: float 8s ease-in-out infinite 1s; }
        .floating-3 { animation: float 7s ease-in-out infinite 2s; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
        @keyframes pulseDot { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:0.5; transform: scale(0.85); } }
        .shine { position: relative; overflow: hidden; }
        .shine::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); animation: shine 3s ease-in-out infinite 2s; }
        @keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }
        .gradient-text { background: linear-gradient(135deg, #FF2D55 0%, #FF6B35 50%, #FF2D55 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; background-size: 200% 200%; animation: gradShift 4s ease infinite; font-style: italic; }
        @keyframes gradShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .footer-link { font-size: 13px; cursor: pointer; transition: color 0.2s; background: none; border: none; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; text-align: left; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: navScrolled ? 'rgba(6,6,8,0.85)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: navScrolled ? `1px solid ${C.border}` : 'none',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="https://res.cloudinary.com/dummgu0pr/image/upload/v1783176548/Logo_guszj5.png" alt="MenuVia" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
          </div>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV.map(n => <button key={n.id} className="nav-link" onClick={() => goTo(n.id)}>{n.label}</button>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/admin/login" className="hide-mobile nav-link" style={{ color: 'rgba(245,245,247,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 14px', borderRadius: 8 }}>Sign in</Link>
            <Link to="/admin/register" className="btn-primary shine" style={{ fontSize: 14, padding: '10px 20px' }}>Get started free</Link>
            <button className="show-mobile" style={{ display: 'none', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 10, color: '#fff', cursor: 'pointer', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', fontSize: 18 }} onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div style={{ background: 'rgba(6,6,8,0.97)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${C.border}`, padding: '16px 24px 24px' }}>
            {NAV.map(n => <button key={n.id} className="nav-link" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 4 }} onClick={() => goTo(n.id)}>{n.label}</button>)}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/admin/login" style={{ textAlign: 'center', padding: '12px', borderRadius: 12, border: `1px solid ${C.border}`, color: 'rgba(245,245,247,0.6)', fontWeight: 600, fontSize: 14 }}>Sign in</Link>
              <Link to="/admin/register" className="btn-primary" style={{ justifyContent: 'center' }}>Get started free →</Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: 80 }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-20%)', width: 900, height: 700, background: 'radial-gradient(ellipse, rgba(255,45,85,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: 0, left: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0, maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' }} />
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1, width: '100%' }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <div style={{ marginBottom: 28, opacity: 0, animation: 'fadeUp 0.8s cubic-bezier(.16,1,.3,1) 0.1s forwards' }}>
                <div className="pill">
                  <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF2D55', display: 'inline-block' }} />
                  <span className="pill-text">India's #1 Restaurant SaaS Platform</span>
                </div>
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(2.6rem, 5vw, 4.2rem)', lineHeight: 1.06, letterSpacing: '-1.5px', color: '#F5F5F7', marginBottom: 24, opacity: 0, animation: 'fadeUp 0.9s cubic-bezier(.16,1,.3,1) 0.2s forwards' }}>
                Every restaurant,<br />
                <span className="gradient-text">fully digital</span><br />
                in 2 minutes.
              </h1>
              <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.75, maxWidth: 500, marginBottom: 36, fontWeight: 400, opacity: 0, animation: 'fadeUp 0.9s cubic-bezier(.16,1,.3,1) 0.3s forwards' }}>
                QR menus, real-time kitchen display, UPI payments and smart analytics — one platform for every restaurant from a Kakinada dhaba to a Hyderabad cloud kitchen.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48, opacity: 0, animation: 'fadeUp 0.9s cubic-bezier(.16,1,.3,1) 0.4s forwards' }}>
                <Link to="/admin/register" className="btn-primary">Start free — ₹0 <span style={{ fontSize: 18 }}>→</span></Link>
                <button className="btn-ghost" onClick={() => goTo('howitworks')}>Watch how it works</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0, animation: 'fadeUp 0.9s cubic-bezier(.16,1,.3,1) 0.5s forwards' }}>
                <div style={{ display: 'flex' }}>
                  {['R','P','K','A','S'].map((l, i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${i*40+10}, 70%, 50%)`, border: '2px solid #060608', marginLeft: i > 0 ? -10 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{l}</div>
                  ))}
                </div>
                <span style={{ fontSize: 13, color: C.textMuted }}><span style={{ color: '#F5F5F7', fontWeight: 600 }}>500+</span> restaurants trust MenuVia</span>
              </div>
            </div>
            <div className="hide-mobile" style={{ position: 'relative', height: 520 }}>
              <div className="floating" style={{ position: 'absolute', right: 40, top: 20, width: 240, background: 'rgba(13,13,16,0.9)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 28, padding: '20px 16px', backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', opacity: 0, animation: 'fadeUp 1s cubic-bezier(.16,1,.3,1) 0.4s forwards' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Playfair Display'", fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 2 }}>Sri Lakshmi Tiffins</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 20, padding: '3px 10px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ECC71', animation: 'pulseDot 2s infinite' }} />
                    <span style={{ fontSize: 11, color: '#2ECC71', fontWeight: 600 }}>Table 4 · Live</span>
                  </div>
                </div>
                {[
                  { name: 'Masala Dosa', price: '₹60', tag: 'bestseller' },
                  { name: 'Idli (2 pcs)', price: '₹40', tag: '' },
                  { name: 'Filter Coffee', price: '₹25', tag: '' },
                  { name: 'Pesarattu', price: '₹55', tag: 'new' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, border: '1.5px solid #2ECC71', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2ECC71' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#F5F5F7', fontWeight: 600 }}>{item.name}</div>
                        {item.tag && <div style={{ fontSize: 10, color: item.tag === 'new' ? '#FF2D55' : '#F5A623', fontWeight: 700, textTransform: 'uppercase' }}>{item.tag}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#FF2D55' }}>{item.price}</span>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#FF2D55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}>+</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 16, background: '#FF2D55', borderRadius: 12, padding: '11px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>View Cart · ₹180</div>
              </div>
              <div className="floating-2" style={{ position: 'absolute', left: 0, top: 60, width: 190, background: 'rgba(13,13,16,0.95)', border: `1px solid rgba(46,204,113,0.2)`, borderRadius: 18, padding: '14px 16px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', opacity: 0, animation: 'fadeUp 1s cubic-bezier(.16,1,.3,1) 0.6s forwards' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ECC71', animation: 'pulseDot 2s infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2ECC71', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Order</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>#MCL-2847 · Table 3</div>
                <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', marginBottom: 10 }}>Dosa ×2 · Coffee ×1</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, background: '#2ECC71', borderRadius: 8, padding: '6px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>Accept</div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Reject</div>
                </div>
              </div>
              <div className="floating-3" style={{ position: 'absolute', left: 10, bottom: 60, width: 200, background: 'rgba(13,13,16,0.95)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 18, padding: '16px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', opacity: 0, animation: 'fadeUp 1s cubic-bezier(.16,1,.3,1) 0.7s forwards' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Revenue</div>
                <div style={{ fontFamily: "'Playfair Display'", fontWeight: 800, fontSize: 28, color: '#fff', marginBottom: 4 }}>₹8,430</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
                  <span style={{ color: '#2ECC71', fontSize: 12, fontWeight: 700 }}>↑ 18%</span>
                  <span style={{ color: C.textDim, fontSize: 12 }}>vs yesterday</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
                  {[40, 65, 45, 80, 55, 90, 72].map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: 3, background: i === 5 ? '#FF2D55' : 'rgba(255,255,255,0.1)', height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div style={{ position: 'absolute', right: -10, bottom: 40, background: 'rgba(255,45,85,0.1)', border: `1px solid rgba(255,45,85,0.25)`, borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(20px)', opacity: 0, animation: 'fadeUp 1s cubic-bezier(.16,1,.3,1) 0.8s forwards' }}>
                <div style={{ fontSize: 11, color: '#FF2D55', fontWeight: 700, marginBottom: 4 }}>🍳 Kitchen Display</div>
                <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.6)' }}>3 orders in queue</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0, animation: 'fadeUp 1s 1s forwards' }}>
          <span style={{ fontSize: 11, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,45,85,0.4), transparent)' }} />
        </div>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }`}</style>
      </section>

      {/* TICKER */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '16px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div className="ticker">
            {[...Array(2)].map((_, gi) => (
              ['QR Menus', 'Kitchen Display', 'UPI Payments', 'Telugu UI', 'Offline Mode', 'Real-time Orders', 'Waiter Call', 'Analytics', 'Hindi Support', 'Free Forever'].map((t, i) => (
                <div key={`${gi}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.3)', fontWeight: 500, whiteSpace: 'nowrap' }}>{t}</span>
                  <span style={{ color: '#FF2D55', fontSize: 10 }}>✦</span>
                </div>
              ))
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { target: 500, suffix: '+',   label: 'Restaurants live'     },
              { target: 2,   suffix: ' min', label: 'Average setup time'   },
              { target: 99,  suffix: '%',    label: 'Uptime guaranteed'    },
              { target: 5,   suffix: '+',    label: 'Languages supported'  },
            ].map(({ target, suffix, label }, i) => (
              <Reveal key={label} delay={i * 0.08}>
                <div className="stat-card">
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 40, color: '#fff', marginBottom: 6 }}>
                    <AnimNum target={target} suffix={suffix} />
                  </div>
                  <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <div className="pill" style={{ marginBottom: 20, display: 'inline-flex' }}><span className="pill-text">Platform Features</span></div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F5F7', marginBottom: 18, letterSpacing: '-0.5px' }}>Built for Indian restaurants</h2>
              <p style={{ fontSize: 17, color: C.textMuted, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>Everything from a small tea stall to a multi-branch cloud kitchen — one platform handles it all.</p>
            </div>
          </Reveal>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '📱', title: 'QR-Based Ordering',    desc: 'Customers scan, browse & order in seconds. No app download. Works perfectly on 2G networks.', tag: 'Core' },
              { icon: '🍳', title: 'Live Kitchen Display',  desc: 'Real-time order kanban with elapsed timers, urgent alerts, and one-tap status updates for staff.', tag: 'Operations' },
              { icon: '📊', title: 'Smart Analytics',       desc: 'Revenue charts, peak hours, top dishes, table-wise breakdown and customer rating trends.', tag: 'Insights' },
              { icon: '💳', title: 'UPI & Card Payments',   desc: 'Razorpay integration for UPI, debit and credit cards with server-side signature verification.', tag: 'Payments' },
              { icon: '🌐', title: 'Telugu, Hindi & More',  desc: 'Full UI in Telugu, Hindi, Tamil, Kannada and Marathi. Admin sets default, customer can switch.', tag: 'India-first' },
              { icon: '📡', title: 'Offline Menu Cache',    desc: 'ServiceWorker caches the latest menu. Browsing works even without internet connection.', tag: 'Reliability' },
              { icon: '🎟️', title: 'Coupons & Promotions', desc: 'Percent or flat discounts with min order, expiry dates and max usage limits for festivals.', tag: 'Marketing' },
              { icon: '🔔', title: 'Waiter Assistance',     desc: 'Customers call waiter, request water or ask for bill — staff notified in real time via sockets.', tag: 'Experience' },
              { icon: '⭐', title: 'Post-Order Feedback',   desc: 'Separate food and service ratings after delivery. Aggregated view in admin dashboard.', tag: 'Quality' },
            ].map(({ icon, title, desc, tag }, i) => (
              <Reveal key={title} delay={i * 0.06}>
                <div className="feat-card" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ width: 48, height: 48, background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
                    <span className="tag">{tag}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: '#F5F5F7', marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="howitworks" style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <div className="pill" style={{ marginBottom: 20, display: 'inline-flex' }}><span className="pill-text">How It Works</span></div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F5F7', letterSpacing: '-0.5px' }}>Live in under 2 minutes</h2>
            </div>
          </Reveal>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, position: 'relative' }}>
            <div className="hide-mobile" style={{ position: 'absolute', top: 36, left: '12%', right: '12%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,45,85,0.3), rgba(255,45,85,0.3), transparent)', zIndex: 0 }} />
            {[
              { n: '01', icon: '✍️', title: 'Register free',    desc: 'Sign up with your restaurant name and email. No card needed.' },
              { n: '02', icon: '🍽',  title: 'Add your menu',    desc: 'Add categories, dishes, prices and preparation times.' },
              { n: '03', icon: '📲', title: 'Print QR codes',    desc: 'Add tables, download print-ready QR PNGs, place on tables.' },
              { n: '04', icon: '⚡', title: 'Go live instantly', desc: 'Customers scan and order. Kitchen gets alerts in real time.' },
            ].map(({ n, icon, title, desc }, i) => (
              <Reveal key={n} delay={i * 0.1}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 64, height: 64, background: i === 3 ? 'rgba(255,45,85,0.15)' : 'rgba(255,255,255,0.04)', border: i === 3 ? '1px solid rgba(255,45,85,0.3)' : `1px solid ${C.border}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>{icon}</div>
                  <div className="step-num" style={{ marginBottom: 8, fontSize: 56 }}>{n}</div>
                  <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 18, color: '#F5F5F7', marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <div className="pill" style={{ marginBottom: 20, display: 'inline-flex' }}><span className="pill-text">Pricing</span></div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#F5F5F7', marginBottom: 16, letterSpacing: '-0.5px' }}>Honest pricing. No surprises.</h2>
              <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 440, margin: '0 auto' }}>Start free forever. Upgrade when you grow. Cancel any time.</p>
            </div>
          </Reveal>
          <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
            {[
              { name: 'Free', price: '₹0', period: '/month', popular: false, badge: null, desc: 'Perfect to get started', color: C.border, features: ['3 tables', '30 menu items', 'Basic order management', 'QR code menu', 'Customer feedback', 'Pay at counter only'], cta: 'Get started free' },
              { name: 'Pro', price: '₹499', period: '/month', popular: true, badge: 'Most Popular', desc: 'For growing restaurants', color: '#FF2D55', features: ['Unlimited tables & items', 'Food photos on menu', 'UPI + card payments', 'AI voice ordering', 'Full analytics dashboard', 'Multi-language (Telugu, Hindi…)', 'Coupons & promotions', 'SMS notifications', 'Remove branding'], cta: 'Start Pro' },
              { name: 'Enterprise', price: '₹1699', period: '', popular: false, badge: 'For Chains', desc: 'For restaurant chains & brands', color: '#7C3AED', features: ['Everything in Pro', 'Multi-branch management', 'Centralised menu control', 'Custom domain & white-label', 'Dedicated account manager', 'Priority 24/7 support', 'Custom analytics & reports', 'API access & integrations', 'Staff role management', 'SLA guarantee'], cta: 'Contact Sales' },
            ].map(({ name, price, period, popular, badge, desc, color, features, cta }, i) => (
              <Reveal key={name} delay={i * 0.1}>
                <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: popular ? 'rgba(255,45,85,0.06)' : name === 'Enterprise' ? 'rgba(124,58,237,0.05)' : C.surface, border: `1px solid ${popular ? 'rgba(255,45,85,0.3)' : name === 'Enterprise' ? 'rgba(124,58,237,0.25)' : C.border}`, borderRadius: 24, padding: '36px 32px', boxShadow: popular ? '0 0 60px rgba(255,45,85,0.1)' : 'none', transition: 'all 0.35s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                >
                  {badge && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: popular ? 'linear-gradient(135deg, #FF2D55, #FF6B35)' : 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 18px', borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {badge}
                    </div>
                  )}
                  <div style={{ marginBottom: 6 }}><span style={{ fontFamily: "'Playfair Display'", fontWeight: 700, fontSize: 20, color: '#F5F5F7' }}>{name}</span></div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>{desc}</div>
                  <div style={{ marginBottom: 32 }}>
                    <span style={{ fontFamily: "'Playfair Display'", fontWeight: 800, fontSize: 44, color, letterSpacing: '-1px', lineHeight: 1 }}>{price}</span>
                    {period && <span style={{ fontSize: 14, color: C.textMuted }}>{period}</span>}
                  </div>
                  <div style={{ flex: 1, marginBottom: 32 }}>
                    {features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: popular ? 'rgba(255,45,85,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: popular ? '#FF2D55' : '#2ECC71' }}>✓</span>
                        </div>
                        <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.7)', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to={name === 'Free' ? '/admin/register' : name === 'Pro' ? '/admin/register?redirect=/admin/upgrade?plan=pro' : '/admin/register?redirect=/admin/upgrade?plan=enterprise'}
                    style={{ display: 'block', textAlign: 'center', padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', background: popular ? 'linear-gradient(135deg, #FF2D55, #FF6B35)' : name === 'Enterprise' ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : 'rgba(255,255,255,0.06)', color: popular || name === 'Enterprise' ? '#fff' : 'rgba(245,245,247,0.7)', border: popular || name === 'Enterprise' ? 'none' : `1px solid ${C.border}` }}>
                    {cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.5}>
            <p style={{ textAlign: 'center', fontSize: 13, color: C.textDim, marginTop: 24 }}>
              All plans include free setup · No hidden fees · Cancel any time · GST invoice provided
            </p>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.008)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#F5F5F7', textAlign: 'center', marginBottom: 56, letterSpacing: '-0.5px' }}>
              Restaurants across India love MenuVia
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { q: 'Setup literally took 4 minutes. My customers now order in Telugu and they absolutely love it. Orders are up 30%.', name: 'Ravi Shankar', role: 'Owner, Sri Lakshmi Tiffins', city: 'Kakinada', stars: 5 },
              { q: 'The kitchen display is a game changer. Zero paper tickets, zero shouting. My kitchen runs like a machine now.', name: 'Priya Reddy', role: 'Manager, Spice Garden', city: 'Hyderabad', stars: 5 },
              { q: 'Analytics showed me 70% of revenue comes from just 3 dishes. I doubled down on those. Profit went up 40%.', name: 'Karthik Rao', role: 'Owner, Coastal Kitchen', city: 'Vizag', stars: 5 },
            ].map(({ q, name, role, city, stars }, i) => (
              <Reveal key={name} delay={i * 0.1}>
                <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`, borderRadius: 24, padding: '32px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                    {[...Array(stars)].map((_, si) => <span key={si} style={{ color: '#FF2D55', fontSize: 16 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 16, color: 'rgba(245,245,247,0.75)', lineHeight: 1.7, flex: 1, marginBottom: 24, fontStyle: 'italic' }}>"{q}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,45,85,0.3), rgba(255,107,53,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display'", fontWeight: 800, color: '#FF2D55', fontSize: 18 }}>{name[0]}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F5F7' }}>{name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{role} · {city}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
            <Reveal>
              <div>
                <div className="pill" style={{ marginBottom: 24, display: 'inline-flex' }}><span className="pill-text">Get in touch</span></div>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F5F7', marginBottom: 20, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                  Let's get your<br />restaurant online
                </h2>
                <p style={{ fontSize: 16, color: C.textMuted, lineHeight: 1.75, marginBottom: 48 }}>
                  Have questions before signing up? We reply within a few hours. Or just start — it's free, no card needed.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { icon: '👤', label: 'Founder',       value: 'Tokala Sarveswara Rao'      },
                    { icon: '📧', label: 'Email us',       value: 'sarveshthokala1625@gmail.com' },
                    { icon: '💬', label: 'WhatsApp',       value: '+91 93906 83569'              },
                    { icon: '📍', label: 'Based in',       value: 'Andhra Pradesh, India'        },
                    { icon: '🕐', label: 'Response time',  value: 'Within 24 hours'              },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                      <div>
                        <div style={{ fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 15, color: 'rgba(245,245,247,0.75)', fontWeight: 500 }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`, borderRadius: 24, padding: '40px 36px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: '#F5F5F7', marginBottom: 28 }}>Send a message</h3>
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(255,45,85,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Reveal>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 56, marginBottom: 24 }}>🚀</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', color: '#F5F5F7', marginBottom: 18, letterSpacing: '-0.5px' }}>Ready to go fully digital?</h2>
            <p style={{ fontSize: 17, color: C.textMuted, marginBottom: 40, lineHeight: 1.7 }}>Join 500+ restaurants across India. Free forever — no credit card, no catch. Setup in 2 minutes.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/admin/register" className="btn-primary" style={{ fontSize: 16, padding: '15px 32px' }}>Start free today <span style={{ fontSize: 20 }}>→</span></Link>
              <Link to="/admin/login" className="btn-ghost" style={{ fontSize: 16, padding: '15px 32px' }}>Sign in</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* WhatsApp Float Button */}
      <a href="https://wa.me/919390683569" target="_blank" rel="noopener noreferrer" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, width: 56, height: 56, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(37,211,102,0.4)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
        <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '48px 24px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <img src="https://res.cloudinary.com/dummgu0pr/image/upload/v1783176548/Logo_guszj5.png" alt="MenuVia" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, maxWidth: 220 }}>India's smartest restaurant digital ordering platform. Made with ❤️ in Andhra Pradesh.</p>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>👤 Tokala Sarveswara Rao</span>
                <a href="mailto:sarveshthokala1625@gmail.com" style={{ fontSize: 12, color: C.textDim, textDecoration: 'none' }}>📧 sarveshthokala1625@gmail.com</a>
                <a href="https://wa.me/919390683569" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.textDim, textDecoration: 'none' }}>💬 +91 93906 83569</a>
              </div>
            </div>
            {[
              {
                title: 'Product',
                links: [
                  { label: 'Features',       action: () => goTo('features')   },
                  { label: 'Pricing',        action: () => goTo('pricing')    },
                  { label: 'How it works',   action: () => goTo('howitworks') },
                  { label: 'Kitchen Display', action: () => goTo('features')  },
                  { label: 'Analytics',      action: () => goTo('features')   },
                ],
              },
              {
                title: 'Company',
                links: [
                  { label: 'About us',  action: () => goTo('contact') },
                  { label: 'Contact',   action: () => goTo('contact') },
                  { label: 'WhatsApp',  action: () => window.open('https://wa.me/919390683569', '_blank') },
                  { label: 'Email us',  action: () => window.open('mailto:sarveshthokala1625@gmail.com') },
                ],
              },
              {
                title: 'Legal',
                links: [
                  { label: 'Privacy Policy',   action: () => setLegalModal('privacy') },
                  { label: 'Terms of Service', action: () => setLegalModal('terms')   },
                  { label: 'Refund Policy',    action: () => setLegalModal('refund')  },
                  { label: 'Cookie Policy',    action: () => setLegalModal('cookie')  },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(245,245,247,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {links.map(({ label, action }) => (
                    <button key={label} className="footer-link" onClick={action}
                      style={{ color: C.textDim }}
                      onMouseEnter={e => e.target.style.color = '#F5F5F7'}
                      onMouseLeave={e => e.target.style.color = C.textDim}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: C.textDim }}>© 2026 MenuVia by Tokala Sarveswara Rao. All rights reserved.</span>
            <span style={{ fontSize: 13, color: C.textDim }}>Built for Tier-2 & Tier-3 India 🇮🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Contact Form — sends to backend which emails/WhatsApp notifies ── */
function ContactForm() {
  const [form,   setForm]   = useState({ name: '', email: '', phone: '', restaurant: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('loading');
    try {
      await axios.post('/api/v1/contact', form);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h3 style={{ fontFamily: "'Playfair Display'", fontWeight: 700, fontSize: 20, color: '#F5F5F7', marginBottom: 10 }}>Message sent!</h3>
      <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.45)', lineHeight: 1.6, marginBottom: 24 }}>Tokala Sarveswara Rao will get back to you within 24 hours.</p>
      <button onClick={() => { setStatus('idle'); setForm({ name:'', email:'', phone:'', restaurant:'', message:'' }); }}
        style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.1)`, color: 'rgba(245,245,247,0.6)', fontFamily: "'Plus Jakarta Sans'", fontWeight: 600, fontSize: 14, padding: '10px 22px', borderRadius: 10, cursor: 'pointer' }}>
        Send another
      </button>
    </div>
  );

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(245,245,247,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Name *">
          <input className="input-style" value={form.name} onChange={e => up('name', e.target.value)} placeholder="Your name" required />
        </Field>
        <Field label="Phone">
          <input className="input-style" type="tel" value={form.phone} onChange={e => up('phone', e.target.value)} placeholder="9876543210" />
        </Field>
      </div>
      <Field label="Email *">
        <input className="input-style" type="email" value={form.email} onChange={e => up('email', e.target.value)} placeholder="you@restaurant.com" required />
      </Field>
      <Field label="Restaurant name">
        <input className="input-style" value={form.restaurant} onChange={e => up('restaurant', e.target.value)} placeholder="e.g. Sri Lakshmi Tiffins" />
      </Field>
      <Field label="Message *">
        <textarea className="input-style" rows={4} value={form.message} onChange={e => up('message', e.target.value)} placeholder="Tell us about your restaurant and what you need..." style={{ resize: 'vertical', minHeight: 100 }} required />
      </Field>
      {status === 'error' && (
        <div style={{ background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#FF2D55' }}>Failed to send. Please WhatsApp us directly at +91 93906 83569</p>
        </div>
      )}
      <button type="submit" disabled={status === 'loading'} className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: status === 'loading' ? 0.7 : 1 }}>
        {status === 'loading' ? (
          <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Sending...</>
        ) : 'Send message →'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}