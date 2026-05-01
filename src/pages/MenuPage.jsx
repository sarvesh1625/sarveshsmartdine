import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useCustomerStore from '../store/customerStore';
import CartDrawer from '../components/menu/CartDrawer';
import ItemModal from '../components/menu/ItemModal';
import WaiterButton from '../components/menu/WaiterButton';
import CustomerSignIn from '../components/menu/CustomerSignIn';

/* Safe parse combo_items whether string or array from API */
function parseComboItems(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function MenuPage() {
  const { slug, tableId } = useParams();
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const categoryRefs = useRef({});
  const { addItem, removeItem, getItemCount, getTotal, setTableContext } = useCartStore();
  const [highlightedItemId, setHighlightedItemId] = useState(null);



  // Fetch restaurant UPI ID for payment QR
  const { data: paymentSettings } = useQuery({
    queryKey: ['public-payment', slug, tableId],
    queryFn:  () => axios.get(`/api/v1/restaurant/public/${slug}${tableId ? `?table=${tableId}` : ''}`).then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
  const upiId       = paymentSettings?.upi_id || null;
  const tableUpiOnly = paymentSettings?.tableUpiOnly || false;
  const { customer, isLoggedIn } = useCustomerStore();
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['menu', slug],
    queryFn: () => axios.get(`/api/v1/menu-items/public?restaurantSlug=${slug}`).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data && tableId) setTableContext(data.restaurant.id, tableId);
    if (data?.menu?.length) setActiveCategory(data.menu[0].id);
    // Show sign-in sheet if customer not identified yet
    if (data && !isLoggedIn()) setShowSignIn(true);
  }, [data]);

  const filteredMenu = data?.menu?.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      const matchSearch = !searchQuery || item.name_en.toLowerCase().includes(searchQuery.toLowerCase());
      const matchVeg = !vegOnly || item.is_veg;
      return matchSearch && matchVeg;
    }),
  })).filter(cat => cat.items.length > 0);

  const itemCount = getItemCount();
  const total = getTotal();

  if (isLoading) return (
    <div className="min-h-screen bg-[#0F0F0F] px-4 pt-10 animate-pulse">
      <div className="h-20 w-20 rounded-3xl bg-white/10 mx-auto mb-4" />
      <div className="h-8 w-48 bg-white/10 rounded-xl mx-auto mb-8" />
      {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl mb-3" />)}
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-white text-xl font-bold mb-2">Oops!</h2>
        <p className="text-white/50 text-sm">Could not load menu. Please scan QR again.</p>
      </div>
    </div>
  );

  const { restaurant, menu } = data;

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/80 to-[#0F0F0F]" />
        <div className="relative px-4 pt-10 pb-6 text-center">
          {restaurant.logo_url && (
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-20 h-20 rounded-3xl mx-auto mb-4 border-2 border-white/10 object-cover"
            />
          )}
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-black tracking-tight"
          >
            {restaurant.name}
          </motion.h1>
          {tableId && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-2 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-white/80"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Table {tableId}
            </motion.div>
          )}
          {/* Customer identity + My Orders */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {isLoggedIn() ? (
              <>
                <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-white/50">
                  👤 {customer?.name}
                </div>
                <button
                  onClick={() => navigate('/my-orders/' + slug)}
                  className="inline-flex items-center gap-1.5 bg-[#e94560]/15 border border-[#e94560]/30 text-[#e94560] px-3 py-1 rounded-full text-xs font-semibold"
                >
                  📋 My Orders
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowSignIn(true)}
                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/40 px-3 py-1 rounded-full text-xs"
              >
                Sign in to track orders
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Search + Filter + Category pills */}
      <div className="sticky top-0 z-30 bg-[#0F0F0F]/95 backdrop-blur-xl px-4 py-3 border-b border-white/5">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#e94560]/60 transition-colors"
            />
          </div>
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${vegOnly ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/10 text-white/50'}`}
          >
            <span className="w-3 h-3 rounded-sm border-2 border-current" /> Veg
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {menu.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                categoryRefs.current[cat.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#e94560] text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {cat.name_en}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="px-4 pb-40 space-y-10 mt-6">
        {filteredMenu?.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <div className="text-4xl mb-3">🔍</div>
            <p>No dishes found</p>
          </div>
        )}

        {filteredMenu?.map((cat, ci) => (
          <motion.section
            key={cat.id}
            ref={el => categoryRefs.current[cat.id] = el}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.05 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-black">{cat.name_en}</h2>
              <span className="text-xs text-white/30">{cat.items.length} items</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {cat.items.map((item, ii) => (
                <motion.div
                  key={item.id}
                  id={`menu-item-${item.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: ii * 0.04 }}
                  className={`flex gap-3 bg-white/5 border rounded-2xl p-3 cursor-pointer transition-all hover:bg-white/8 ${highlightedItemId === item.id ? "border-[#e94560]/60 bg-[#e94560]/5 scale-[1.01]" : "border-white/5"}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`w-3.5 h-3.5 rounded-sm border-2 mb-1 ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full m-px ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <h3 className="font-bold text-sm leading-tight mb-1 line-clamp-1">{item.name_en}</h3>
                    {item.description_en && (
                      <p className="text-xs text-white/40 line-clamp-2 mb-2">{item.description_en}</p>
                    )}
                    {/* Combo contents preview */}
                    {item.is_combo && parseComboItems(item.combo_items).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {parseComboItems(item.combo_items).map((ci, idx) => (
                          <span key={idx} className="text-xs bg-purple-500/15 border border-purple-500/25 text-purple-300 px-2 py-0.5 rounded-full">
                            {ci.qty > 1 ? `${ci.qty}× ` : ''}{ci.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(() => {
                        const dp = Number(item.discounted_price);
                        const p  = Number(item.price);
                        const hasDiscount = !isNaN(dp) && dp > 0 && dp < p;
                        return (
                          <>
                            <span className="text-[#e94560] font-black text-base">
                              ₹{hasDiscount ? dp : p}
                            </span>
                            {hasDiscount && (
                              <span className="text-white/25 text-xs line-through">₹{p}</span>
                            )}
                          </>
                        );
                      })()}
                      {item.preparation_time_mins > 0 && (
                        <span className="text-white/25 text-xs">· {item.preparation_time_mins}m</span>
                      )}
                      {item.is_combo && (
                        <span className="text-xs bg-purple-500/15 border border-purple-500/25 text-purple-300 px-1.5 py-0.5 rounded-full">🎁 Combo</span>
                      )}
                      {item.is_combo && item.combo_savings > 0 && (
                        <span className="text-xs bg-green-500/15 border border-green-500/25 text-green-400 px-1.5 py-0.5 rounded-full">Save ₹{item.combo_savings}</span>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5">
                      {item.image_url
                        ? <img
                            src={item.image_url}
                            alt={item.name_en}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                          />
                        : null
                      }
                      <div className="w-full h-full items-center justify-center text-3xl"
                        style={{ display: item.image_url ? 'none' : 'flex' }}>
                        🍽
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem(item);
                        toast.success(`${item.name_en} added!`, { duration: 1500 });
                      }}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#e94560] hover:bg-[#d63050] rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      {/* Floating cart button */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 left-4 right-4 z-40 bg-[#e94560] text-white rounded-2xl py-4 px-6 flex items-center justify-between shadow-2xl shadow-[#e94560]/40"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-xs font-black rounded-lg w-6 h-6 flex items-center justify-center">
                {itemCount}
              </span>
              <span className="font-bold text-sm">View Cart</span>
            </div>
            <span className="text-sm font-bold">₹{total.toFixed(0)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* slug prop added to fix waiter-call 404 */}
      {tableId && (
        <WaiterButton
          restaurantId={restaurant.id}
          tableId={tableId}
          slug={slug}
        />
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        restaurant={restaurant}
        slug={slug}
        tableId={tableId}
        upiId={upiId}
        upiOnly={tableUpiOnly}
      />

      <ItemModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdd={item => {
          addItem(item);
          toast.success(`${item.name_en} added!`);
        }}
      />



      {/* Customer sign-in sheet */}
      {showSignIn && (
        <CustomerSignIn
          restaurantName={restaurant?.name}
          onDone={() => setShowSignIn(false)}
        />
      )}
    </div>
  );
}