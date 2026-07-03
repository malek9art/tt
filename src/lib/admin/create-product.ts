import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSlug } from "@/lib/slug";

// منطق موحّد لإنشاء منتج مكتمل — يستخدمه مسار «إضافة منتج جديد»
// ومسار «الإضافة السريعة من المخزون» معاً، فيضمن أن كل منتج يُنشأ:
//   منتج + متغيّر افتراضي (يظهر للعميل كقابل للشراء) + سجل مخزون

export interface CreateProductInput {
  name_ar:           string;
  name_en?:          string | null;
  sku?:              string | null;
  description?:      string | null;
  base_price:        number;
  compare_at_price?: number | null;
  category_id?:      string | null;
  brand_id?:         string | null;
  condition?:        "new" | "used_certified";
  status?:           "draft" | "published" | "archived";
  type?:             "physical" | "service";
  warranty?:         string | null;
  tags?:             string[];
  is_featured?:      boolean;
  // المخزون الابتدائي
  quantity?:         number;
  reorder_level?:    number;
  location?:         string | null;
}

export type CreateProductResult =
  | { ok: true; product_id: string; variant_id: string; sku: string; slug: string }
  | { ok: false; status: number; error: string };

function generateSku(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "PRD";
  return `${base}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function createProductWithInventory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const name = input.name_ar?.trim();
  if (!name || name.length < 2) {
    return { ok: false, status: 400, error: "أدخل اسم المنتج" };
  }
  const price = Number(input.base_price);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, status: 400, error: "أدخل سعراً صحيحاً أكبر من صفر" };
  }

  const sku = input.sku?.trim() || generateSku(name);

  // SKU فريد على مستوى المنتجات والمتغيّرات معاً (كلاهما UNIQUE)
  const [{ data: dupeVariant }, { data: dupeProduct }] = await Promise.all([
    supabase.from("product_variants").select("id").eq("sku", sku).maybeSingle(),
    supabase.from("products").select("id").eq("sku", sku).maybeSingle(),
  ]);
  if (dupeVariant || dupeProduct) {
    return { ok: false, status: 409, error: `SKU مكرر: ${sku} — استخدم رمزاً آخر` };
  }

  // slug فريد — تكرار الاسم يضيف لاحقة بدل الفشل
  let slug = buildSlug({ name_ar: name, name_en: input.name_en, sku });
  const { data: dupeSlug } = await supabase
    .from("products").select("id").eq("slug", slug).maybeSingle();
  if (dupeSlug) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  // 1) المنتج
  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      name_ar:     name,
      name_en:     input.name_en?.trim() || null,
      slug,
      sku,
      description: input.description?.trim() || null,
      base_price:  price,
      currency:    "YER",
      category_id: input.category_id || null,
      brand_id:    input.brand_id || null,
      condition:   input.condition ?? "new",
      status:      input.status ?? "published",
      type:        input.type ?? "physical",
      warranty:    input.warranty?.trim() || null,
      tags:        input.tags ?? [],
      is_featured: input.is_featured ?? false,
      created_by:  userId,
    })
    .select("id, slug")
    .single();
  if (pErr || !product) {
    return { ok: false, status: 500, error: pErr?.message ?? "فشل إنشاء المنتج" };
  }

  // 2) المتغيّر الافتراضي — بدونه يظهر المنتج للعميل «غير متوفر»
  const { data: variant, error: vErr } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku,
      price,
      compare_at_price: input.compare_at_price || null,
      attributes: {},
      is_active: true,
    })
    .select("id")
    .single();
  if (vErr || !variant) {
    await supabase.from("products").delete().eq("id", product.id);
    return { ok: false, status: 500, error: vErr?.message ?? "فشل إنشاء متغيّر المنتج" };
  }

  // 3) سجل المخزون في المخزن الرئيسي
  const { data: warehouse } = await supabase
    .from("warehouses").select("id").limit(1).maybeSingle();
  if (warehouse) {
    const { error: iErr } = await supabase.from("inventory").insert({
      variant_id:    variant.id,
      warehouse_id:  warehouse.id,
      quantity:      Math.max(0, Math.floor(input.quantity ?? 0)),
      reorder_level: Math.max(0, Math.floor(input.reorder_level ?? 5)),
      location:      input.location || null,
    });
    if (iErr) console.error("create-product inventory:", iErr);
  }

  return { ok: true, product_id: product.id, variant_id: variant.id, sku, slug: product.slug };
}
