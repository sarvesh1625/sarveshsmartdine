import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const TABS = ['Account', 'Staff', 'Payment', 'Password'];

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [tab,   setTab]  = useState('Account');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name:'', email:'', password:'', phone:'', role:'staff' });
  const [pw,    setPw]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [upiId,          setUpiId]          = useState('');
  const [payFirst,       setPayFirst]       = useState(false);
  const [merchantId,     setMerchantId]     = useState('');
  const [saltKey,        setSaltKey]        = useState('');
  const [saltIndex,      setSaltIndex]      = useState('1');
  const [phonepeEnv,     setPhonepeEnv]     = useState('UAT');
  const [paymentMode,    setPaymentMode]    = useState('upi');
   const [rzpKeyId,       setRzpKeyId]       = useState('');
   const [rzpKeySecret,   setRzpKeySecret]   = useState('');
   const [cfAppId,        setCfAppId]        = useState('');
   const [cfSecret,       setCfSecret]       = useState('');
   const [cfEnv,          setCfEnv]          = useState('TEST');
   const [activeGateway,  setActiveGateway]  = useState('phonepe');
  const qrRef = useRef(null);

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn:  () => api.get('/restaurant/staff').then(r => r.data.data),
    enabled:  tab === 'Staff',
  });

  const addStaff = useMutation({
    mutationFn: () => api.post('/restaurant/staff', staffForm),
    onSuccess:  () => {
      toast.success('Staff account created!');
      qc.invalidateQueries(['staff-list']);
      setStaffForm({ name:'', email:'', password:'', phone:'', role:'staff' });
      setShowAddStaff(false);
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const toggleStaff = useMutation({
    mutationFn: id => api.patch(`/restaurant/staff/${id}/toggle`),
    onSuccess:  () => qc.invalidateQueries(['staff-list']),
    onError:    () => toast.error('Failed'),
  });

  const deleteStaff = useMutation({
    mutationFn: id => api.delete(`/restaurant/staff/${id}`),
    onSuccess:  () => { toast.success('Staff removed'); qc.invalidateQueries(['staff-list']); },
    onError:    () => toast.error('Failed'),
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn:  () => api.get('/restaurant/payment-settings').then(r => r.data.data),
    enabled:  tab === 'Payment',
  });

  useEffect(() => {
    if (paymentSettings?.upi_id)              setUpiId(paymentSettings.upi_id);
    if (paymentSettings?.pay_first !== undefined) setPayFirst(!!paymentSettings.pay_first);
    if (paymentSettings?.phonepe_merchant_id) setMerchantId(paymentSettings.phonepe_merchant_id);
    if (paymentSettings?.phonepe_salt_key)    setSaltKey(paymentSettings.phonepe_salt_key);
    if (paymentSettings?.phonepe_salt_index)  setSaltIndex(String(paymentSettings.phonepe_salt_index));
    if (paymentSettings?.phonepe_env)         setPhonepeEnv(paymentSettings.phonepe_env);
  }, [paymentSettings]);

  useEffect(() => {
    if (!upiId || !qrRef.current || tab !== 'Payment') return;
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(user?.restaurantName || 'Restaurant')}&cu=INR`;
    qrRef.current.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
  }, [upiId, tab]);

  const saveUpi = useMutation({
    mutationFn: () => api.put('/restaurant/payment-settings', {
      upi_id:              upiId.trim(),
      pay_first:           payFirst ? 1 : 0,
      phonepe_merchant_id: merchantId.trim()   || null,
      razorpay_key_id:     rzpKeyId.trim()     || null,
      razorpay_key_secret: rzpKeySecret.trim() || null,
      cashfree_app_id:     cfAppId.trim()      || null,
      cashfree_secret:     cfSecret.trim()     || null,
      cashfree_env:        cfEnv               || 'TEST',
      phonepe_salt_key:    saltKey.trim()      || null,
      phonepe_salt_index:  Number(saltIndex)   || 1,
      phonepe_env:         phonepeEnv          || 'UAT',
      razorpay_key_id:     rzpKeyId.trim()     || null,
      razorpay_key_secret: rzpKeySecret.trim() || null,
      cashfree_app_id:     cfAppId.trim()      || null,
      cashfree_secret:     cfSecret.trim()     || null,
      cashfree_env:        cfEnv               || 'TEST',
    }),
    onSuccess: () => toast.success('Payment settings saved!'),
    onError:   e => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const changePw = useMutation({
    mutationFn: d => api.put('/auth/change-password', d),
    onSuccess:  () => { toast.success('Password changed. Logging out...'); setTimeout(() => logout(), 1500); },
    onError:    e  => toast.error(e.response?.data?.message || 'Failed'),
  });

  function handlePwSubmit(e) {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pw.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    changePw.mutate({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
  }

  const inp = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-colors';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t ? 'bg-[#e94560] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}>
            {t === 'Payment' ? '💳 ' : ''}{t}
          </button>
        ))}
      </div>

      {/* Account tab */}
      {tab === 'Account' && (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4">Account Info</h2>
          {[['Name', user?.name], ['Email', user?.email], ['Role', user?.role], ['Restaurant', user?.restaurantName]].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
              <span className="text-white/40 text-sm">{label}</span>
              <span className="text-white text-sm capitalize">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2.5">
            <span className="text-white/40 text-sm">Plan</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${
              user?.planType === 'free' ? 'bg-white/10 text-white/60' :
              user?.planType === 'pro'  ? 'bg-[#e94560]/20 text-[#e94560]' :
                                          'bg-purple-500/20 text-purple-400'
            }`}>{user?.planType}</span>
          </div>
        </div>
      )}

      {/* Staff tab */}
      {tab === 'Staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold">Staff Accounts</h2>
              <p className="text-white/40 text-xs mt-0.5">Kitchen staff and waiters who can access the system</p>
            </div>
            <button onClick={() => setShowAddStaff(true)}
              className="bg-[#e94560] hover:bg-[#d63050] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              + Add Staff
            </button>
          </div>

          {/* Add staff form */}
          {showAddStaff && (
            <div className="bg-white/5 border border-[#e94560]/20 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4">New Staff Account</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Full name *" value={staffForm.name}
                    onChange={e => setStaffForm({...staffForm, name: e.target.value})}
                    className={inp} />
                  <input type="tel" placeholder="Phone (optional)" value={staffForm.phone}
                    onChange={e => setStaffForm({...staffForm, phone: e.target.value})}
                    className={inp} />
                </div>
                <input type="email" placeholder="Email address *" value={staffForm.email}
                  onChange={e => setStaffForm({...staffForm, email: e.target.value})}
                  className={inp} />
                <input type="password" placeholder="Password (min 6 chars) *" value={staffForm.password}
                  onChange={e => setStaffForm({...staffForm, password: e.target.value})}
                  className={inp} />
                <div>
                  <label className="text-white/40 text-xs font-semibold uppercase tracking-wider block mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'staff',   icon: '🙋', label: 'Waiter / Staff',  desc: 'Takes orders, manages tables' },
                      { key: 'kitchen', icon: '👨‍🍳', label: 'Kitchen',         desc: 'Views & updates order status' },
                    ].map(r => (
                      <button key={r.key} onClick={() => setStaffForm({...staffForm, role: r.key})}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          staffForm.role === r.key
                            ? 'bg-[#e94560]/15 border-[#e94560]/40 text-white'
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}>
                        <div className="text-xl mb-1">{r.icon}</div>
                        <div className="text-xs font-bold">{r.label}</div>
                        <div className="text-xs opacity-60 mt-0.5">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => addStaff.mutate()}
                    disabled={addStaff.isPending || !staffForm.name || !staffForm.email || !staffForm.password}
                    className="flex-1 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors">
                    {addStaff.isPending ? 'Creating...' : 'Create Account'}
                  </button>
                  <button onClick={() => setShowAddStaff(false)}
                    className="px-5 bg-white/5 hover:bg-white/10 text-white/50 font-semibold rounded-xl transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Staff list */}
          {staffList.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-white/50 font-semibold mb-1">No staff added yet</p>
              <p className="text-white/25 text-sm">Add kitchen staff and waiters so they can log in.</p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
              {staffList.map((member, i) => (
                <div key={member.id} className={`flex items-center gap-4 px-5 py-4 ${i < staffList.length-1 ? 'border-b border-white/5' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-white flex-shrink-0">
                    {member.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{member.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-bold capitalize ${
                        member.role === 'kitchen'
                          ? 'bg-orange-500/15 text-orange-400'
                          : 'bg-blue-500/15 text-blue-400'
                      }`}>{member.role}</span>
                      {!member.is_active && (
                        <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-lg">Inactive</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5">{member.email}{member.phone ? ` · ${member.phone}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleStaff.mutate(member.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        member.is_active
                          ? 'bg-white/5 border-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                          : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                      }`}>
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => { if(window.confirm(`Remove ${member.name}?`)) deleteStaff.mutate(member.id); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Login info box */}
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
            <p className="text-white/40 text-xs font-semibold mb-2">Staff login info</p>
            <div className="space-y-1 text-white/30 text-xs">
              <p>• Staff login at: <span className="font-mono text-white/50">localhost:3000/admin/login</span></p>
              <p>• Waiter role → goes to Staff Dashboard</p>
              <p>• Kitchen role → goes to Kitchen Display</p>
              <p>• Share the email & password you set above</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment tab */}
      {tab === 'Payment' && (
        <div className="space-y-4">

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPaymentMode('upi')}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                paymentMode === 'upi'
                  ? 'bg-green-500/15 border-green-500/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
              }`}>
              <div className="text-2xl">🇮🇳</div>
              <div>
                <p className="font-bold text-sm">Static UPI</p>
                <p className="text-xs opacity-60">QR from your UPI ID</p>
              </div>
              {paymentMode === 'upi' && <span className="ml-auto text-green-400 text-lg">✓</span>}
            </button>
            <button onClick={() => setPaymentMode('merchant')}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                paymentMode === 'merchant'
                  ? 'bg-purple-500/15 border-purple-500/30 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
              }`}>
              <div className="text-2xl">⚡</div>
              <div>
                <p className="font-bold text-sm">Merchant Auto</p>
                <p className="text-xs opacity-60">Dynamic QR + auto-confirm</p>
              </div>
              {paymentMode === 'merchant' && <span className="ml-auto text-purple-400 text-lg">✓</span>}
            </button>
          </div>

          {/* ── TAB 1: Static UPI ── */}
          {paymentMode === 'upi' && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-xl">🇮🇳</div>
                <div>
                  <p className="text-white font-bold">Static UPI QR</p>
                  <p className="text-white/40 text-xs">Works with PhonePe · GPay · Paytm · BHIM · any UPI app</p>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">Your UPI ID</label>
                <input type="text" placeholder="e.g. yourshop@ybl  or  9876543210@paytm"
                  value={upiId} onChange={e => setUpiId(e.target.value)} className={inp} />
                <p className="text-white/25 text-xs mt-1.5">
                  Find in PhonePe → Profile · Google Pay → Payment methods · Paytm → UPI ID
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/8 rounded-xl">
                <div>
                  <p className="text-white text-sm font-bold">Require payment before order</p>
                  <p className="text-white/35 text-xs mt-0.5">Customer must pay before kitchen receives order</p>
                </div>
                <button type="button" onClick={() => setPayFirst(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ml-4 ${payFirst ? 'bg-[#e94560]' : 'bg-white/15'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${payFirst ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl p-3">
                <p className="text-yellow-400 text-xs font-bold mb-1">How this works:</p>
                <p className="text-white/40 text-xs leading-relaxed">Customer scans QR → pays to your UPI → shows screenshot to staff → staff marks paid manually in Orders page.</p>
              </div>

              <button onClick={() => saveUpi.mutate()} disabled={saveUpi.isPending || !upiId.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl">
                {saveUpi.isPending ? 'Saving...' : '✓ Save UPI Settings'}
              </button>

              {upiId && (
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white/40 text-xs font-semibold mb-3">Preview — Customer sees this QR:</p>
                  <div className="flex gap-4 items-start">
                    <div className="bg-white p-3 rounded-xl shadow-lg flex-shrink-0">
                      <img ref={qrRef} alt="QR" className="w-28 h-28 block" />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div><p className="text-white/30">UPI ID</p><p className="text-white font-semibold">{upiId}</p></div>
                      <div><p className="text-white/30">Payee name</p><p className="text-white font-semibold">{user?.restaurantName}</p></div>
                      <div className="flex flex-wrap gap-1">
                        {['PhonePe','Google Pay','Paytm','BHIM'].map(a => (
                          <span key={a} className="bg-white/8 text-white/50 px-2 py-0.5 rounded-lg">{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Merchant Auto ── */}
          {paymentMode === 'merchant' && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-xl">⚡</div>
                <div>
                  <p className="text-white font-bold">Merchant Auto-Confirmation</p>
                  <p className="text-white/40 text-xs">Dynamic QR generated per order · Payment auto-confirms instantly</p>
                </div>
              </div>

              {/* Provider selector */}
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">Payment Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key:'phonepe', label:'PhonePe', color:'bg-purple-600' },
                    { key:'razorpay', label:'Razorpay', color:'bg-blue-600' },
                    { key:'cashfree', label:'Cashfree', color:'bg-green-600' },
                  ].map(p => (
                    <button key={p.key} onClick={() => setPhonepeEnv(p.key === 'phonepe' ? phonepeEnv : p.key)}
                      className={`${p.color}/15 border border-white/10 text-white text-xs font-bold py-2.5 rounded-xl hover:opacity-80`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test credentials box */}
              <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-4">
                <p className="text-blue-400 text-xs font-bold mb-2">🧪 PhonePe UAT Test Credentials</p>
                <div className="space-y-0.5 font-mono text-xs text-white/50 mb-3">
                  <p>Merchant ID: <span className="text-white/80">MERCHANTUAT</span></p>
                  <p>Salt Key: <span className="text-white/80">099eb0cd-02cf-4dc2-a4ca-1e8c13b7d98e</span></p>
                  <p>Salt Index: <span className="text-white/80">1</span></p>
                </div>
                <button type="button" onClick={() => {
                  setMerchantId('MERCHANTUAT');
                  setSaltKey('099eb0cd-02cf-4dc2-a4ca-1e8c13b7d98e');
                  setSaltIndex('1');
                  setPhonepeEnv('UAT');
                  toast.success('Test credentials filled!');
                }} className="text-xs bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 font-semibold">
                  ↑ Fill test credentials
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Merchant ID</label>
                  <input value={merchantId} onChange={e => setMerchantId(e.target.value)}
                    placeholder="MERCHANTUAT  or  your live Merchant ID"
                    className={`${inp} font-mono`} />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Salt Key / API Key</label>
                  <input value={saltKey} onChange={e => setSaltKey(e.target.value)}
                    placeholder="Your secret key from merchant dashboard"
                    className={`${inp} font-mono`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Salt Index</label>
                    <input value={saltIndex} onChange={e => setSaltIndex(e.target.value)}
                      placeholder="1" type="number" min="1" className={inp} />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Environment</label>
                    <select value={phonepeEnv} onChange={e => setPhonepeEnv(e.target.value)}
                      className={`${inp}`}>
                      <option value="UAT">UAT (Testing)</option>
                      <option value="PROD">PROD (Live)</option>
                    </select>
                  </div>
                </div>

                {/* ── Razorpay Fields (shown when razorpay active) ── */}
              {activeGateway === 'razorpay' && (
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-4">
                    <p className="text-blue-400 text-xs font-bold mb-2">🔵 Razorpay Test Credentials</p>
                    <div className="font-mono text-xs text-white/50 space-y-0.5 mb-3">
                      <p>Key ID: <span className="text-white/75">rzp_test_SizPk4M11xjZzy</span></p>
                      <p>Secret: <span className="text-white/75">4eR2nWj3no5nn8Y7ctv6B3YL</span></p>
                    </div>
                    <button type="button" onClick={() => { setRzpKeyId('rzp_test_SizPk4M11xjZzy'); setRzpKeySecret('4eR2nWj3no5nn8Y7ctv6B3YL'); toast.success('Razorpay test credentials filled!'); }}
                      className="text-xs bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 font-semibold">
                      ↑ Fill test credentials
                    </button>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Razorpay Key ID</label>
                    <input value={rzpKeyId} onChange={e => setRzpKeyId(e.target.value)} placeholder="rzp_live_..." className={`${inp} font-mono`} />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Razorpay Key Secret</label>
                    <input value={rzpKeySecret} onChange={e => setRzpKeySecret(e.target.value)} placeholder="Your secret key" type="password" className={`${inp} font-mono`} />
                  </div>
                  {rzpKeyId && rzpKeySecret && (
                    <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <p className="text-green-400 text-xs font-bold">Razorpay configured — dynamic QR + auto-confirm active</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Cashfree Fields ── */}
              {activeGateway === 'cashfree' && (
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Cashfree App ID</label>
                    <input value={cfAppId} onChange={e => setCfAppId(e.target.value)} placeholder="Your Cashfree App ID" className={`${inp} font-mono`} />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Cashfree Secret Key</label>
                    <input value={cfSecret} onChange={e => setCfSecret(e.target.value)} placeholder="Your Cashfree Secret" type="password" className={`${inp} font-mono`} />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-1.5">Environment</label>
                    <select value={cfEnv} onChange={e => setCfEnv(e.target.value)} className={inp}>
                      <option value="TEST">TEST (Sandbox)</option>
                      <option value="PROD">PROD (Live)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Webhook URL */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3">
                  <p className="text-white/40 text-xs font-semibold mb-1.5">📋 Register this webhook URL in your merchant dashboard:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-green-400 text-xs break-all flex-1">
                      {window.location.origin.replace('3000','5000')}/api/v1/webhooks/phonepe/{user?.restaurantId}
                    </code>
                    <button type="button" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin.replace('3000','5000')}/api/v1/webhooks/phonepe/${user?.restaurantId}`);
                      toast.success('Copied!');
                    }} className="text-white/30 hover:text-white text-sm flex-shrink-0">📋</button>
                  </div>
                </div>

                {merchantId && saltKey && (
                  <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-green-400 text-lg">✓</span>
                    <div>
                      <p className="text-green-400 text-xs font-bold">
                        {phonepeEnv === 'UAT' ? 'TEST mode' : 'LIVE mode'} configured
                      </p>
                      <p className="text-green-400/60 text-xs">Dynamic QR shown to customers · Payments auto-confirm</p>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => saveUpi.mutate()} disabled={saveUpi.isPending || !merchantId.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl">
                {saveUpi.isPending ? 'Saving...' : '⚡ Save Merchant Settings'}
              </button>
            </div>
          )}
        </div>
      )}

            {/* Password tab */}
      {tab === 'Password' && (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4">Change Password</h2>
          <form onSubmit={handlePwSubmit} className="space-y-3">
            {[['currentPassword','Current Password'],['newPassword','New Password (min 8 chars)'],['confirmPassword','Confirm New Password']].map(([k,p]) => (
              <input key={k} type="password" placeholder={p} value={pw[k]}
                onChange={e => setPw({ ...pw, [k]: e.target.value })} className={inp} />
            ))}
            <button type="submit" disabled={changePw.isPending}
              className="px-5 py-2.5 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
              {changePw.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}