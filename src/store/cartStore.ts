import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductVariant } from "@/lib/supabase";

export interface CartItem {
  id:         string;
  product_id: string;
  variant_id: string | null;
  name_ar:    string;
  sku:        string | null;
  image:      string;
  price:      number;
  currency:   string;
  quantity:   number;
  attributes: Record<string, string>;
}

interface CartState {
  items:      CartItem[];
  isOpen:     boolean;
  addItem:    (product: Product, variant?: ProductVariant, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty:  (id: string, qty: number) => void;
  clearCart:  () => void;
  toggleCart: () => void;
  openCart:   () => void;
  closeCart:  () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [], isOpen: false,

      addItem: (product, variant, qty = 1) => {
        const id    = variant?.id ?? product.id;
        const price = variant?.price ?? product.base_price;
        const attrs = (variant?.attributes ?? {}) as Record<string, string>;
        const image = product.product_images?.find(i => i.is_primary)?.url
          ?? product.product_images?.[0]?.url
          ?? "https://placehold.co/200x200/09444C/FFE100?text=Phone";

        set(state => {
          const existing = state.items.find(i => i.id === id);
          if (existing) {
            return { items: state.items.map(i => i.id === id ? { ...i, quantity: i.quantity + qty } : i) };
          }
          return {
            items: [...state.items, {
              id, product_id: product.id, variant_id: variant?.id ?? null,
              name_ar: product.name_ar, sku: variant?.sku ?? product.sku,
              image, price, currency: product.currency, quantity: qty, attributes: attrs,
            }],
          };
        });
        get().openCart();
      },

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      updateQty:  (id, qty) => set(s => ({
        items: qty <= 0 ? s.items.filter(i => i.id !== id)
          : s.items.map(i => i.id === id ? { ...i, quantity: qty } : i),
      })),
      clearCart:  () => set({ items: [] }),
      toggleCart: () => set(s => ({ isOpen: !s.isOpen })),
      openCart:   () => set({ isOpen: true }),
      closeCart:  () => set({ isOpen: false }),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalPrice: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: "ahmadi-cart", version: 1 }
  )
);
