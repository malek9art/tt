import { supabase, type Product, type Category, type Brand } from "./supabase";

// ===== الفئات =====
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) { console.error("getCategories:", error); return []; }
  return data ?? [];
}

// ===== المنتجات المميزة للرئيسية =====
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`*, product_images(*), product_variants(*), categories(name_ar,slug), brands(name)`)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getFeaturedProducts:", error); return []; }
  return data ?? [];
}

// ===== قائمة المنتجات (PLP) =====
export async function getProducts(opts: {
  category?: string; brand?: string; search?: string;
  sort?: "newest" | "price_asc" | "price_desc"; page?: number; limit?: number;
} = {}): Promise<{ products: Product[]; total: number }> {
  const { category, brand, search, sort = "newest", page = 1, limit = 12 } = opts;
  const from = (page - 1) * limit;

  // !inner مطلوب حتى تُفلتر صفوف المنتجات نفسها وليس العلاقة المضمّنة فقط
  const catRel   = category ? "categories!inner(name_ar,slug)" : "categories(name_ar,slug)";
  const brandRel = brand    ? "brands!inner(name,slug)"        : "brands(name)";

  let query = supabase
    .from("products")
    .select(`*, product_images(*), product_variants(*), ${catRel}, ${brandRel}`, { count: "exact" })
    .eq("status", "published");

  if (category) query = query.eq("categories.slug", category);
  if (brand)    query = query.eq("brands.slug", brand);
  if (search)   query = query.ilike("name_ar", `%${search}%`);

  if (sort === "newest")     query = query.order("created_at", { ascending: false });
  if (sort === "price_asc")  query = query.order("base_price", { ascending: true });
  if (sort === "price_desc") query = query.order("base_price", { ascending: false });

  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) { console.error("getProducts:", error); return { products: [], total: 0 }; }
  return { products: data ?? [], total: count ?? 0 };
}

// ===== منتج واحد بالـ slug (PDP) =====
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(`*, product_images(*), product_variants(*), categories(*), brands(*)`)
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  if (error) { console.error("getProductBySlug:", error); return null; }
  return data;
}

// ===== البانرات (بيانات عامة — بدون كوكيز حتى تبقى الصفحة قابلة للتخزين المؤقت) =====
export type Banner = {
  id: string; title: string | null; subtitle: string | null;
  image_url: string; link_url: string | null; link_label: string | null;
  badge_text: string | null; sort_order: number;
};

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, link_label, badge_text, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) { console.error("getBanners:", error); return []; }
  return data ?? [];
}

// ===== أحدث المنتجات =====
export async function getLatestProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`*, product_images(*), product_variants(*), categories(name_ar), brands(name)`)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getLatestProducts:", error); return []; }
  return data ?? [];
}

// ===== أدوات مساعدة =====
export function formatPrice(amount: number, currency = "YER"): string {
  if (currency === "YER") {
    return new Intl.NumberFormat("ar-YE", {
      style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount) + " ﷼";
  }
  return new Intl.NumberFormat("ar", {
    style: "currency", currency, minimumFractionDigits: 2,
  }).format(amount);
}

export function discountPercent(original: number, sale: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

export function getPrimaryImage(product: Product): string {
  const primary = product.product_images?.find(i => i.is_primary);
  return primary?.url ?? product.product_images?.[0]?.url ?? "https://placehold.co/400x400/09444C/FFE100?text=📱";
}

export function getLowestPrice(product: Product): number {
  if (!product.product_variants?.length) return product.base_price;
  return Math.min(...product.product_variants.filter(v => v.is_active).map(v => v.price));
}

export function getHighestComparePrice(product: Product): number | null {
  const prices = product.product_variants
    ?.filter(v => v.is_active && v.compare_at_price)
    .map(v => v.compare_at_price!) ?? [];
  return prices.length ? Math.max(...prices) : null;
}
