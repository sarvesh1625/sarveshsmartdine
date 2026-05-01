import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCustomerStore = create(
  persist(
    (set, get) => ({
      customer: null,      // { name, phone }
      // orders stored as { [phone]: [...orders] }
      ordersByCustomer: {},

      setCustomer: (customer) => set({ customer }),

      clearCustomer: () => set({ customer: null }),

      addOrder: (order) => {
        const phone = get().customer?.phone || 'guest';
        const existing = get().ordersByCustomer[phone] || [];
        set({
          ordersByCustomer: {
            ...get().ordersByCustomer,
            [phone]: [order, ...existing].slice(0, 20),
          },
        });
      },

      // Get orders for current customer (optionally filtered by slug)
      getMyOrders: (slug) => {
        const phone = get().customer?.phone || 'guest';
        const orders = get().ordersByCustomer[phone] || [];
        return slug ? orders.filter(o => o.slug === slug) : orders;
      },

      // Legacy - kept for backwards compat
      getOrdersBySlug: (slug) => {
        return get().getMyOrders(slug);
      },

      isLoggedIn: () => !!get().customer?.phone,
    }),
    {
      name: 'smartdine-customer',
      // Migrate old flat orders array to new format
      onRehydrateStorage: () => (state) => {
        if (state && state.orders && !state.ordersByCustomer) {
          const phone = state.customer?.phone || 'guest';
          state.ordersByCustomer = { [phone]: state.orders };
          state.orders = undefined;
        }
      },
    }
  )
);

export default useCustomerStore;