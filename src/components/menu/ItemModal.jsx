import { motion, AnimatePresence } from 'framer-motion';

export default function ItemModal({ item, onClose, onAdd }) {
  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 30 }}
          className="bg-[#1A1A1A] rounded-3xl w-full max-w-sm overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="w-full h-52 bg-white/5 relative">
            {item.image_url
              ? <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-6xl">🍽</div>
            }
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white/70 hover:text-white">
              ✕
            </button>
            {/* Veg/Non-veg indicator */}
            <div className="absolute top-3 left-3">
              <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h2 className="text-white font-black text-xl mb-1">{item.name_en}</h2>
            {item.name_te && <p className="text-white/40 text-sm mb-3">{item.name_te}</p>}
            {item.description_en && (
              <p className="text-white/60 text-sm leading-relaxed mb-4">{item.description_en}</p>
            )}

            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[#e94560] font-black text-2xl">
                  ₹{(item.discounted_price > 0) ? item.discounted_price : item.price}
                </span>
                {(item.discounted_price > 0 && item.discounted_price < item.price) && (
                  <span className="text-white/30 text-sm line-through">₹{item.price}</span>
                )}
              </div>
              <span className="text-white/30 text-xs">·</span>
              {item.preparation_time_mins > 0 && (
                <span className="text-white/40 text-xs">⏱ {item.preparation_time_mins} min</span>
              )}
              {item.calories && (
                <>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-white/40 text-xs">🔥 {item.calories} kcal</span>
                </>
              )}
            </div>

            {/* Tags */}
            {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-5">
                {item.tags.map(tag => (
                  <span key={tag} className="bg-white/10 text-white/50 text-xs px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            )}

            <button
              onClick={() => { onAdd(item); onClose(); }}
              className="w-full bg-[#e94560] hover:bg-[#d63050] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#e94560]/25 active:scale-95">
              Add to Cart — ₹{(item.discounted_price > 0) ? item.discounted_price : item.price}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}