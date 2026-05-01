import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items:        [],
      restaurantId: null,
      tableId:      null,

      setTableContext: (restaurantId, tableId) =>
        set({ restaurantId, tableId }),

      addItem: (item) => {
        const existing = get().items.find(i => i.id === item.id);
        if (existing) {
          set({ items: get().items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )});
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] });
        }
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter(i => i.id !== itemId) });
        } else {
          set({ items: get().items.map(i =>
            i.id === itemId ? { ...i, quantity } : i
          )});
        }
      },

      removeItem: (itemId) =>
        set({ items: get().items.filter(i => i.id !== itemId) }),

      clearCart: () => set({ items: [], restaurantId: null, tableId: null }),

      getTotal: () => get().items.reduce(
        (sum, i) => sum + (i.discounted_price || i.price) * i.quantity, 0
      ),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'menucloud-cart',
    }
  )
);

export default useCartStore;