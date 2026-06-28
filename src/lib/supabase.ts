import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// أنواع مشتقة من قاعدة البيانات
export type Category = {
  id: string; parent_id: string | null; name_ar: string; name_en: string | null;
  slug: string; description: string | null; image_url: string | null;
  icon: string | null; sort_order: number; is_active: boolean;
  attributes_schema: unknown[];
};

export type Brand = {
  id: string; name: string; slug: string; logo_url: string | null;
  is_active: boolean; sort_order: number;
};

export type Product = {
  id: string; sku: string | null; name_ar: string; name_en: string | null;
  slug: string; description: string | null; category_id: string | null;
  brand_id: string | null; type: "physical" | "service";
  condition: "new" | "used_certified"; status: "draft" | "published" | "archived";
  warranty: string | null; base_price: number; currency: string;
  attributes: Record<string, unknown>; tags: string[];
  is_featured: boolean; created_at: string; updated_at: string;
  // علاقات
  categories?: Category;
  brands?: Brand;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
};

export type ProductVariant = {
  id: string; product_id: string; sku: string | null;
  attributes: Record<string, string>; price: number;
  compare_at_price: number | null; barcode: string | null;
  is_active: boolean; sort_order: number;
};

export type ProductImage = {
  id: string; product_id: string; variant_id: string | null;
  url: string; alt_ar: string | null; sort_order: number; is_primary: boolean;
};
