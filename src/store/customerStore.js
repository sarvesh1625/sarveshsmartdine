import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';

const useCustomerStore = create(
  persist(
    (set, get) => ({
      customer: null,      // { name, phone }
      // orders stored as { [phone]: [...orders] }
      ordersByCustomer: {},

      setCustomer: (newCustomer) => {
        const state = get();
        // If signing in with phone, merge any guest orders into their phone account
        if (newCustomer?.phone) {
          const guestOrders = state.ordersByCustomer['guest'] || [];
          const existingOrders = state.ordersByCustomer[newCustomer.phone] || [];
          const allOrders = [...existingOrders, ...guestOrders];
          const seen = new Set();
          const merged = allOrders.filter(o => {
            if (seen.has(o.orderId)) return false;
            seen.add(o.orderId);
            return true;
          }).slice(0, 20);

          set({
            customer: newCustomer,
            ordersByCustomer: {
              ...state.ordersByCustomer,
              [newCustomer.phone]: merged,
              guest: [],
            },
          });
        } else {
          set({ customer: newCustomer });
        }
      },

      clearCustomer: () => set({ customer: null }),
      // NOTE: we do NOT clear ordersByCustomer on logout
      // so history is restored when they sign in again with same phone

      addOrder: (order) => {
        const phone = get().customer?.phone || 'guest';
        const existing = get().ordersByCustomer[phone] || [];
        const alreadyExists = existing.some(o => o.orderId === order.orderId);
        if (alreadyExists) return;
        set({
          ordersByCustomer: {
            ...get().ordersByCustomer,
            [phone]: [order, ...existing].slice(0, 20),
          },
        });
      },

      updateOrderStatus: (orderId, status) => {
        const state = get();
        const phone = state.customer?.phone || 'guest';
        const orders = state.ordersByCustomer[phone] || [];
        const updated = orders.map(o =>
          o.orderId === orderId ? { ...o, status } : o
        );
        set({
          ordersByCustomer: {
            ...state.ordersByCustomer,
            [phone]: updated,
          },
        });
      },

      getMyOrders: (slug) => {
        const phone = get().customer?.phone || 'guest';
        const orders = get().ordersByCustomer[phone] || [];
        return slug ? orders.filter(o => o.slug === slug) : orders;
      },

      getOrdersBySlug: (slug) => {
        return get().getMyOrders(slug);
      },

      isLoggedIn: () => !!get().customer?.phone,
    }),
    {
      name: 'smartdine-customer',
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

// Hook to know when the persisted store has finished loading from localStorage.
// Prevents flash of "not signed in" UI (like the sign-in sheet) before
// Zustand has restored the saved customer from localStorage.
export const useCustomerStoreHydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCustomerStore.persist.onFinishHydration(() => setHydrated(true));
    if (useCustomerStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
};

export default useCustomerStore;