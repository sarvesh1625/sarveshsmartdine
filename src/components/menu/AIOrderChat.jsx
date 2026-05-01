import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const LANGS = [
  { code: 'te-IN', label: 'తె', name: 'Telugu'  },
  { code: 'en-IN', label: 'EN', name: 'English' },
  { code: 'hi-IN', label: 'हि', name: 'Hindi'   },
  { code: 'ta-IN', label: 'த', name: 'Tamil'   },
];

function detectLang(text) {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
  return 'en-IN';
}

const L = {
  'te-IN': {
    greeting:   (r) => `నమస్కారం! 🙏 నేను ${r} AI వెయిటర్ని.\n\nమెను చూడండి, recommend అడగండి లేదా ఆర్డర్ చేయండి!`,
    placeholder:'తెలుగులో టైప్ చేయండి లేదా 🎤 నొక్కండి...',
    listening:  (n) => `వింటున్నాను (${n})...`,
    thinking:   '⏳ ఆలోచిస్తున్నాను...',
    speaking:   '🔊 మాట్లాడుతున్నాను...',
    addCart:    'కార్ట్‌కి add చేయి',
    chips:      ['అన్ని items చూపు', 'ఏం బాగుంటుంది?', 'Budget food', 'వెజ్ items', 'Combo offers', 'ఆర్డర్ చేయాలి'],
  },
  'en-IN': {
    greeting:   (r) => `Hi! 👋 I'm the AI waiter at ${r}.\n\nBrowse the menu, get recommendations, or place an order!`,
    placeholder:'Type your order or hold 🎤...',
    listening:  (n) => `Listening (${n})...`,
    thinking:   '⏳ Thinking...',
    speaking:   '🔊 Speaking...',
    addCart:    'Add to cart',
    chips:      ['Show full menu', "What's popular?", 'Budget meals', 'Veg items', 'Combo offers', 'Place order'],
  },
  'hi-IN': {
    greeting:   (r) => `नमस्ते! 🙏 मैं ${r} का AI वेटर हूँ.\n\nमेनू देखें, सुझाव लें या ऑर्डर करें!`,
    placeholder:'हिंदी में टाइप करें या 🎤 दबाएं...',
    listening:  (n) => `सुन रहा हूँ (${n})...`,
    thinking:   '⏳ सोच रहा हूँ...',
    speaking:   '🔊 बोल रहा हूँ...',
    addCart:    'कार्ट में डालें',
    chips:      ['पूरा मेनू दिखाओ', 'क्या अच्छा है?', 'सस्ता खाना', 'वेज items', 'Combo offers', 'ऑर्डर करना है'],
  },
  'ta-IN': {
    greeting:   (r) => `வணக்கம்! 🙏 நான் ${r} AI வெயிட்டர்.\n\nமெனு பாருங்கள், பரிந்துரை கேளுங்கள் அல்லது ஆர்டர் செய்யுங்கள்!`,
    placeholder:'தமிழில் தட்டச்சு செய்யுங்கள் அல்லது 🎤...',
    listening:  (n) => `கேட்கிறேன் (${n})...`,
    thinking:   '⏳ யோசிக்கிறேன்...',
    speaking:   '🔊 பேசுகிறேன்...',
    addCart:    'கார்ட்டில் சேர்',
    chips:      ['முழு மெனு காட்டு', 'என்ன நல்லது?', 'மலிவான உணவு', 'சைவ items', 'Combo offers', 'ஆர்டர் செய்ய'],
  },
};

function buildSystemPrompt(menu, restaurantName, lang) {
  const allItems = menu.flatMap(cat =>
    cat.items.filter(i => i.is_available !== false).map(i => ({
      ...i, category: cat.name_en,
      finalPrice: Number(i.discounted_price || i.price),
    }))
  );
  const byPrice   = [...allItems].sort((a, b) => a.finalPrice - b.finalPrice);
  const cheapest  = byPrice.slice(0, 5).map(i => `${i.name_en} ₹${i.finalPrice}`).join(', ');
  const costliest = byPrice.slice(-5).reverse().map(i => `${i.name_en} ₹${i.finalPrice}`).join(', ');
  const combos    = allItems.filter(i => (Array.isArray(i.tags) && i.tags.includes('combo')) || i.is_combo || i.name_en.toLowerCase().includes('combo'));
  const langName  = { 'te-IN':'Telugu','en-IN':'English','hi-IN':'Hindi','ta-IN':'Tamil' }[lang] || 'Telugu';

  const menuText = menu.map(cat =>
    `[${cat.name_en}]\n` +
    cat.items.filter(i => i.is_available !== false).map(i =>
      `  ID:${i.id} | ${i.name_en}${i.name_te?`/${i.name_te}`:''} | ₹${i.discounted_price||i.price}${i.discounted_price?` (was ₹${i.price})`:''} | ${i.is_veg?'Veg':'Non-veg'}${i.description_en?` | ${i.description_en}`:''}`
    ).join('\n')
  ).join('\n\n');

  return `You are a friendly AI food waiter for "${restaurantName}". RESPOND IN ${langName} ONLY for every reply. Never switch language.

MENU (${allItems.length} items):
${menuText}

QUICK REFERENCE:
- Budget picks: ${cheapest}
- Premium picks: ${costliest}
- Combos available: ${combos.length ? combos.map(i=>`${i.name_en} ₹${i.finalPrice}`).join(', ') : 'None yet'}
- Veg: ${allItems.filter(i=>i.is_veg).length} items | Non-veg: ${allItems.filter(i=>!i.is_veg).length} items

YOUR JOB:
1. Show items with highlight action — item cards appear inside the chat automatically
2. Recommend 3-4 dishes when asked — explain why each is good — ALWAYS ask "what would you like?" after
3. Filter by price/veg/non-veg and highlight matches
4. Explain any dish in detail
5. When user wants to ORDER → collect name → phone → confirm order
6. REFUSE non-food questions politely in ${langName}

ALWAYS use JSON response format:

Showing items (most responses should use this):
\`\`\`json
{"action":"show_items","highlight_ids":["ID1","ID2","ID3"],"message":"${langName} reply text here"}
\`\`\`

Just text reply (refuse off-topic, collecting name/phone):
\`\`\`json
{"action":"info","message":"${langName} reply here"}
\`\`\`

Add to cart directly:
\`\`\`json
{"action":"add_to_cart","items":[{"id":"EXACT_ID","name":"Name","quantity":1}],"highlight_ids":["EXACT_ID"],"message":"${langName} reply"}
\`\`\`

Ask name for order:
\`\`\`json
{"action":"ask_name","message":"${langName}: please tell me your name"}
\`\`\`

Got name:
\`\`\`json
{"action":"got_name","name":"Name","message":"${langName}: thanks, now phone number?"}
\`\`\`

Got phone:
\`\`\`json
{"action":"got_phone","phone":"10DIGITS","message":"${langName}: confirming your order..."}
\`\`\`

Place order (only when name + phone + items ready):
\`\`\`json
{"action":"place_order","items":[{"id":"EXACT_ID","name":"Name","quantity":1}],"message":"${langName}: order confirmed!"}
\`\`\`

RULES:
- Use show_items for EVERY query that involves food — show the actual items inside the chat
- highlight_ids must be real IDs from menu above only
- Keep message short: 1-3 sentences
- After showing recommendations, ALWAYS end with asking what they'd like to order
- Never place order without name AND phone`;
}

/* ── Inline item card shown inside chat ─────────────────────────────────── */
function ItemCard({ item, onAdd, lang }) {
  const ui = L[lang] || L['en-IN'];
  return (
    <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
      className="flex items-center gap-3 bg-white/6 border border-white/10 rounded-2xl p-3 w-full">
      {/* Image */}
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
        {item.image_url
          ? <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        }
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full m-px ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <span className="text-white font-bold text-sm truncate">{item.name_en}</span>
          {item.is_combo && <span className="text-purple-400 text-xs">🎁</span>}
        </div>
        {item.description_en && (
          <p className="text-white/35 text-xs line-clamp-1 mb-1">{item.description_en}</p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[#e94560] font-black text-sm">₹{item.discounted_price || item.price}</span>
          {item.discounted_price && (
            <span className="text-white/25 text-xs line-through">₹{item.price}</span>
          )}
          {item.combo_savings > 0 && (
            <span className="text-green-400 text-xs">Save ₹{item.combo_savings}</span>
          )}
        </div>
      </div>
      {/* Add button */}
      <button onClick={() => onAdd(item)}
        className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #e94560)' }}>
        + Add
      </button>
    </motion.div>
  );
}

export default function AIOrderChat({ menu, restaurantName, slug, tableId, onAddItem, onRemoveItem, onHighlightItem }) {
  const navigate    = useNavigate();
  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [listening,  setListening]  = useState(false);
  const [lang,       setLang]       = useState('te-IN');
  const [transcript, setTranscript] = useState('');
  const [speaking,   setSpeaking]   = useState(false);

  const customerRef    = useRef({ name: null, phone: null });
  const cartRef        = useRef([]);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const conversationRef= useRef([]);
  const voiceFinished  = useRef(false);

  const ui = L[lang] || L['te-IN'];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = { role: 'assistant', content: (L[lang]||L['te-IN']).greeting(restaurantName) };
      setMessages([greeting]);
      speakText(greeting.content, lang);
    }
  }, [open]);

  function switchLang(code) {
    setLang(code);
    if (messages.length <= 1) {
      const greeting = { role: 'assistant', content: (L[code]||L['en-IN']).greeting(restaurantName) };
      setMessages([greeting]);
      conversationRef.current = [];
      speakText(greeting.content, code);
    }
  }

  function speakText(text, forceLang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g,'').replace(/[*_`]/g,'').trim();
    const utt   = new SpeechSynthesisUtterance(clean);
    const useLang = forceLang || lang;
    utt.lang  = useLang;
    utt.rate  = 0.92;
    const assignVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const match  = voices.find(v => v.lang === useLang) || voices.find(v => v.lang.startsWith(useLang.split('-')[0]));
      if (match) utt.voice = match;
    };
    assignVoice();
    if (!window.speechSynthesis.getVoices().length) window.speechSynthesis.onvoiceschanged = assignVoice;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Chrome browser వాడండి'); return; }
    window.speechSynthesis?.cancel();
    const rec = new SR();
    rec.lang = lang; rec.continuous = false; rec.interimResults = true; rec._hasResult = false;
    rec.onstart  = () => { setListening(true); setTranscript(''); voiceFinished.current = false; };
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(t);
      if (e.results[0].isFinal) { setInput(t); setTranscript(''); rec._hasResult = true; }
    };
    rec.onerror = () => { setListening(false); toast.error('వినలేకపోయాను. మళ్ళీ try చేయండి.'); };
    rec.onend   = () => { setListening(false); if (rec._hasResult) voiceFinished.current = true; };
    recognitionRef.current = rec;
    rec.start();
  }
  function stopListening() { recognitionRef.current?.stop(); setListening(false); }

  useEffect(() => {
    if (voiceFinished.current && input && !loading) {
      voiceFinished.current = false;
      const t = setTimeout(() => sendMessage(input), 600);
      return () => clearTimeout(t);
    }
  }, [listening]);

  async function placeRealOrder(items) {
    const { data } = await axios.post('/api/v1/orders', {
      restaurantSlug: slug, tableId: tableId || null,
      customerName:  customerRef.current.name  || 'Guest',
      customerPhone: customerRef.current.phone ? customerRef.current.phone.toString().replace(/\D/g,'').slice(-10) : null,
      paymentMethod: 'counter',
      items: items.map(i => ({ menuItemId: i.id, quantity: i.quantity || 1 })),
    });
    return data.data.orderId;
  }

  /* Add item to cart — used by inline card buttons */
  function handleAddItem(item) {
    onAddItem(item);
    const ex = cartRef.current.find(c => c.id === item.id);
    if (ex) ex.quantity += 1;
    else cartRef.current.push({ id: item.id, name: item.name_en, quantity: 1 });
    toast.success(`${item.name_en} added!`, {
      style: { background:'#111', color:'#fff', border:'1px solid rgba(34,197,94,0.3)' },
      duration: 1500,
    });
  }

  /* Get item objects from highlight_ids */
  function getItemsById(ids) {
    if (!ids?.length) return [];
    return ids.map(id => {
      for (const cat of (menu || [])) {
        const found = cat.items?.find(i => String(i.id) === String(id));
        if (found) return found;
      }
      return null;
    }).filter(Boolean);
  }

  function processResponse(rawContent) {
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      addMsg({ role: 'assistant', content: rawContent });
      speakText(rawContent);
      return;
    }

    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const msg    = parsed.message || '';

      /* Scroll/glow items on the menu page behind the chat */
      if (parsed.highlight_ids?.length) {
        parsed.highlight_ids.forEach(id => onHighlightItem?.(id));
      }

      if (parsed.action === 'show_items' || parsed.action === 'highlight') {
        /* Show text message */
        if (msg) addMsg({ role: 'assistant', content: msg });
        /* Show inline item cards */
        const items = getItemsById(parsed.highlight_ids || []);
        if (items.length) addMsg({ role: 'items', items });
        if (msg) speakText(msg);
        return;
      }

      if (parsed.action === 'add_to_cart' && parsed.items?.length) {
        parsed.items.forEach(item => {
          for (const cat of (menu || [])) {
            const found = cat.items?.find(mi => String(mi.id) === String(item.id));
            if (found) {
              const qty = item.quantity || 1;
              for (let i = 0; i < qty; i++) onAddItem(found);
              const ex = cartRef.current.find(c => c.id === item.id);
              if (ex) ex.quantity += qty; else cartRef.current.push({ id: item.id, name: found.name_en, quantity: qty });
            }
          }
        });
        if (parsed.highlight_ids?.length) {
          const items = getItemsById(parsed.highlight_ids);
          if (items.length) addMsg({ role: 'items', items });
        }
      }

      if (parsed.action === 'got_name'  && parsed.name)  customerRef.current.name  = parsed.name;
      if (parsed.action === 'got_phone' && parsed.phone) customerRef.current.phone = parsed.phone;

      if (parsed.action === 'place_order') {
        const itemsToOrder = parsed.items?.length ? parsed.items : cartRef.current;
        if (msg) addMsg({ role: 'assistant', content: msg });
        speakText(msg);
        placeRealOrder(itemsToOrder).then(orderId => {
          cartRef.current = [];
          const doneMsg = {
            'te-IN': `✅ ఆర్డర్ confirm అయింది!\n#${orderId.slice(0,8).toUpperCase()}\nTrack button నొక్కండి 👇`,
            'hi-IN': `✅ ऑर्डर confirm!\n#${orderId.slice(0,8).toUpperCase()}\nनीचे Track करें 👇`,
            'ta-IN': `✅ Order confirm!\n#${orderId.slice(0,8).toUpperCase()}\nகீழே Track செய்யுங்கள் 👇`,
            'en-IN': `✅ Order confirmed!\n#${orderId.slice(0,8).toUpperCase()}\nTap below to track 👇`,
          }[lang] || `✅ Order confirmed! #${orderId.slice(0,8).toUpperCase()}`;
          addMsg({ role: 'assistant', content: doneMsg });
          addMsg({ role: 'track', orderId, slug });
          speakText(doneMsg);
        }).catch(err => {
          addMsg({ role: 'assistant', content: `❌ ${err.response?.data?.message || err.message}` });
        });
        return;
      }

      if (msg) { addMsg({ role: 'assistant', content: msg }); speakText(msg); }
    } catch {
      const clean = rawContent.replace(/```[\s\S]*?```/g,'').trim();
      addMsg({ role: 'assistant', content: clean || rawContent });
      speakText(clean || rawContent);
    }
  }

  function addMsg(msg) {
    setMessages(prev => [...prev, msg]);
    if (msg.role === 'assistant') {
      conversationRef.current = [...conversationRef.current, { role: 'assistant', content: msg.content }];
    }
  }

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    setInput(''); setTranscript('');
    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    conversationRef.current = [...conversationRef.current, { role: 'user', content: text.trim() }];
    setLoading(true);

    try {
      const KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const systemPrompt = buildSystemPrompt(menu, restaurantName, lang);
      const customerCtx  = `Customer state: name="${customerRef.current.name||'unknown'}", phone="${customerRef.current.phone||'unknown'}", cart=${JSON.stringify(cartRef.current)}. RESPOND IN ${(L[lang]||L['te-IN']).name} ONLY.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt + '\n\n' + customerCtx }] },
            contents: conversationRef.current
              .filter(m => m.role !== 'track')
              .map(m => ({
                role:  m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
            generationConfig: { maxOutputTokens: 600, temperature: 0.35 },
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${res.status}`);
      }

      const data    = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!content) throw new Error('Empty response from Gemini');

      conversationRef.current = [...conversationRef.current, { role: 'assistant', content }];
      processResponse(content);

    } catch (err) {
      console.error('AI error:', err.message);
      const errMsg = {
        'te-IN': `సారీ, error వచ్చింది: ${err.message}. మళ్ళీ try చేయండి.`,
        'hi-IN': `माफ़ करें, error: ${err.message}. फिर कोशिश करें.`,
        'en-IN': `Sorry, error: ${err.message}. Please try again.`,
        'ta-IN': `மன்னிப்பு, பிழை: ${err.message}. மீண்டும் முயற்சி செய்யுங்கள்.`,
      }[lang] || `Error: ${err.message}`;
      addMsg({ role: 'assistant', content: errMsg });
    } finally { setLoading(false); }
  }, [menu, restaurantName, onAddItem, loading, lang, slug, tableId]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  const gradBg = { background: 'linear-gradient(135deg, #7C3AED, #e94560)' };
  const inp    = "flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/60 transition-colors resize-none";

  return (
    <>
      {/* Floating button */}
      <motion.button whileTap={{ scale:0.92 }} onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-2xl"
        style={{ display: open ? 'none' : 'flex', ...gradBg, boxShadow:'0 8px 24px rgba(124,58,237,0.35)' }}>
        <span style={{ fontSize:18 }}>🤖</span>
        <span>AI {lang==='te-IN'?'వెయిటర్':lang==='hi-IN'?'वेटर':lang==='ta-IN'?'வெயிட்டர்':'Waiter'}</span>
        {speaking && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/65 z-50" onClick={() => setOpen(false)} />

            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:26, stiffness:240 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F0F] border-t border-white/8 rounded-t-3xl flex flex-col"
              style={{ height:'88vh' }} onClick={e => e.stopPropagation()}>

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={gradBg}>
                    🤖
                    {speaking && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0F0F0F] animate-pulse" />}
                  </div>
                  <div>
                    <div className="text-white font-black text-sm">
                      AI {lang==='te-IN'?'వెయిటర్':lang==='hi-IN'?'वेटर':lang==='ta-IN'?'வெயிட்டர்':'Waiter'}
                    </div>
                    <div className={`text-xs ${loading?'text-purple-400':speaking?'text-green-400':'text-white/30'}`}>
                      {loading ? ui.thinking : speaking ? ui.speaking : `● ${restaurantName} · Gemini AI`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {LANGS.map(l => (
                    <button key={l.code} onClick={() => switchLang(l.code)} title={l.name}
                      className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${lang===l.code?'bg-purple-500 text-white':'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                      {l.label}
                    </button>
                  ))}
                  <button onClick={() => setOpen(false)} className="ml-1 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white">✕</button>
                </div>
              </div>

              {/* Customer state bar */}
              {(customerRef.current.name || customerRef.current.phone || cartRef.current.length > 0) && (
                <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-3 text-xs flex-wrap">
                  {customerRef.current.name  && <span className="text-purple-300">👤 {customerRef.current.name}</span>}
                  {customerRef.current.phone && <span className="text-purple-300">📱 {customerRef.current.phone}</span>}
                  {cartRef.current.length > 0 && (
                    <span className="text-green-400">🛒 {cartRef.current.reduce((s,i)=>s+i.quantity,0)} items — {cartRef.current.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</span>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    className={`flex ${msg.role==='user'?'justify-end':'justify-start'} w-full`}>

                    {/* Track button */}
                    {msg.role === 'track' && (
                      <div className="flex w-full">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1" style={gradBg}>🤖</div>
                        <button onClick={() => { setOpen(false); navigate(`/order/${msg.slug}/${msg.orderId}`); }}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white shadow-lg"
                          style={{ ...gradBg, boxShadow:'0 4px 16px rgba(124,58,237,0.4)' }}>
                          📍 {lang==='te-IN'?'ఆర్డర్ Track చేయండి':lang==='hi-IN'?'Order Track करें':lang==='ta-IN'?'Order Track செய்யுங்கள்':'Track your order'} →
                        </button>
                      </div>
                    )}

                    {/* Inline item cards */}
                    {msg.role === 'items' && (
                      <div className="w-full space-y-2 pl-9">
                        {msg.items.map(item => (
                          <ItemCard key={item.id} item={item} onAdd={handleAddItem} lang={lang} />
                        ))}
                      </div>
                    )}

                    {/* Normal message */}
                    {(msg.role === 'assistant' || msg.role === 'user') && (
                      <>
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1" style={gradBg}>🤖</div>
                        )}
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                          msg.role==='user' ? 'text-white rounded-br-sm' : 'bg-white/6 text-white/90 rounded-bl-sm border border-white/8'
                        }`} style={msg.role==='user' ? gradBg : {}}>
                          {msg.content}
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}

                {/* Loading dots */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm mr-2 flex-shrink-0" style={gradBg}>🤖</div>
                    <div className="bg-white/6 border border-white/8 px-4 py-3 rounded-2xl flex items-center gap-1.5">
                      {[0,.15,.3].map((d,i) => <div key={i} className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay:`${d}s` }} />)}
                    </div>
                  </div>
                )}

                {/* Voice transcript preview */}
                {listening && transcript && (
                  <div className="flex justify-end">
                    <div className="bg-purple-500/20 border border-purple-500/30 px-4 py-3 rounded-2xl text-sm text-white/60 italic max-w-[80%]">
                      {transcript}...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 border-t border-white/5">
                {messages.length <= 1 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-0.5">
                    {ui.chips.map(s => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="flex-shrink-0 text-xs bg-white/5 border border-white/10 text-white/55 px-3 py-1.5 rounded-xl hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-white transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <motion.button
                    onPointerDown={startListening} onPointerUp={stopListening} onPointerLeave={stopListening}
                    whileTap={{ scale:0.86 }}
                    className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center text-xl transition-all ${listening?'animate-pulse':'bg-white/8 hover:bg-white/14'}`}
                    style={listening?{ background:'#EF4444', boxShadow:'0 4px 16px rgba(239,68,68,0.4)' }:{}}>
                    {listening ? '🔴' : '🎤'}
                  </motion.button>

                  <textarea className={inp} rows={1}
                    placeholder={listening ? ui.listening(LANGS.find(l=>l.code===lang)?.name||'') : ui.placeholder}
                    value={listening ? transcript : input}
                    onChange={e => !listening && setInput(e.target.value)}
                    onKeyDown={handleKeyDown} disabled={listening || loading}
                    style={{ minHeight:48, maxHeight:96 }} />

                  <motion.button whileTap={{ scale:0.9 }} onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading || listening}
                    className="w-12 h-12 flex-shrink-0 disabled:opacity-25 rounded-2xl flex items-center justify-center text-white text-xl"
                    style={gradBg}>↑</motion.button>
                </div>

                <p className="text-white/18 text-xs text-center mt-2">
                  {listening ? `🎤 ${LANGS.find(l=>l.code===lang)?.name} వింటున్నాను... వదలండి` : 'Hold 🎤 మాట్లాడండి · Enter ↑'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}