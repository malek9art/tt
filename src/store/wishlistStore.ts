import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { toast } from "./toastStore";

interface WishlistState {
  /** product_id → معرف صف المفضلة في قاعدة البيانات */
  ids: Record<string, string>;
  loadedFor: string | null;
  load: (userId: string) => Promise<void>;
  reset: () => void;
  isWished: (productId: string) => boolean;
  /** يضيف/يزيل المنتج — يتطلب تسجيل الدخول */
  toggle: (productId: string, userId: string | undefined) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: {},
  loadedFor: null,

  load: async (userId) => {
    if (get().loadedFor === userId) return;
    const { data, error } = await supabase
      .from("wishlists")
      .select("id, product_id")
      .eq("user_id", userId);
    if (error) { console.error("wishlist.load:", error); return; }
    const ids: Record<string, string> = {};
    for (const row of data ?? []) ids[row.product_id] = row.id;
    set({ ids, loadedFor: userId });
  },

  reset: () => set({ ids: {}, loadedFor: null }),

  isWished: (productId) => Boolean(get().ids[productId]),

  toggle: async (productId, userId) => {
    if (!userId) {
      toast.info("سجّل الدخول لحفظ المنتجات في المفضلة");
      return;
    }
    const existing = get().ids[productId];
    if (existing) {
      // إزالة متفائلة ثم تراجع عند الفشل
      set(s => {
        const next = { ...s.ids };
        delete next[productId];
        return { ids: next };
      });
      const { error } = await supabase.from("wishlists").delete().eq("id", existing);
      if (error) {
        set(s => ({ ids: { ...s.ids, [productId]: existing } }));
        toast.error("تعذّرت إزالة المنتج من المفضلة");
        return;
      }
      toast.info("تمت إزالة المنتج من المفضلة");
    } else {
      const { data, error } = await supabase
        .from("wishlists")
        .insert({ user_id: userId, product_id: productId })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("تعذّرت إضافة المنتج إلى المفضلة");
        return;
      }
      set(s => ({ ids: { ...s.ids, [productId]: data.id } }));
      toast.success("تمت إضافة المنتج إلى المفضلة");
    }
  },
}));
