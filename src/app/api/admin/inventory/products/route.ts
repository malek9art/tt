import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildSlug } from "@/lib/slug";

interface QuickAddBody {
  name_ar:          string;
  sku?:             string;
  base_price:       number;
  compare_at_price?: number | null;
  category_id?:     string | null;
  brand_id?:        string | null;
  condition?:       "new" | "used_certified";
  status?:          "draft" | "published";
  quantity?:        number;
  reorder_level?:   number;
  location?:        string | null;
}

function generateSku(name: string): string {
  const base = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "PRD";
  return `${base}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// POST — إضافة منتج سريعة من شاشة المخزون:
// تنشئ المنتج + متغيّراً افتراضياً + صف مخزون في خطوة واحدة
export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("products:manage");
  if (error) return error;

  const body = await request.json() as QuickAddBody;

  const name = body.name_ar?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "أدخل اسم المنتج" }, { status: 400 });
  }
  const price = Number(body.base_price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "أدخل سعراً صحيحاً أكبر من صفر" }, { status: 400 });
  }

  const sku = body.sku?.trim() || generateSku(name);

  // منع تكرار SKU (على مستوى المنتجات والمتغيّرات معاً — كلاهما UNIQUE)
  const [{ data: dupeVariant }, { data: dupeProduct }] = await Promise.all([
    supabase.from("product_variants").select("id").eq("sku", sku).maybeSingle(),
    supabase.from("products").select("id").eq("sku", sku).maybeSingle(),
  ]);
  if (dupeVariant || dupeProduct) {
    return NextResponse.json({ error: `SKU مكرر: ${sku} — استخدم رمزاً آخر` }, { status: 409 });
  }

  // slug فريد — تكرار اسم المنتج يضيف لاحقة عشوائية بدل الفشل
  let slug = buildSlug({ name_ar: name, sku });
  const { data: dupeSlug } = await supabase
    .from("products").select("id").eq("slug", slug).maybeSingle();
  if (dupeSlug) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  // 1) المنتج
  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      name_ar:    name,
      slug,
      sku,
      base_price: price,
      currency:   "YER",
      category_id: body.category_id || null,
      brand_id:    body.brand_id || null,
      condition:   body.condition ?? "new",
      status:      body.status ?? "published",
      type:        "physical",
      created_by:  user!.id,
    })
    .select("id, slug")
    .single();
  if (pErr || !product) {
    return NextResponse.json({ error: pErr?.message ?? "فشل إنشاء المنتج" }, { status: 500 });
  }

  // 2) المتغيّر الافتراضي
  const { data: variant, error: vErr } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku,
      price,
      compare_at_price: body.compare_at_price || null,
      attributes: {},
      is_active: true,
    })
    .select("id")
    .single();
  if (vErr || !variant) {
    await supabase.from("products").delete().eq("id", product.id);
    return NextResponse.json({ error: vErr?.message ?? "فشل إنشاء المتغيّر" }, { status: 500 });
  }

  // 3) صف المخزون في المخزن الرئيسي
  const { data: warehouse } = await supabase
    .from("warehouses").select("id").limit(1).maybeSingle();
  if (warehouse) {
    const { error: iErr } = await supabase.from("inventory").insert({
      variant_id:    variant.id,
      warehouse_id:  warehouse.id,
      quantity:      Math.max(0, Math.floor(body.quantity ?? 0)),
      reorder_level: Math.max(0, Math.floor(body.reorder_level ?? 5)),
      location:      body.location || null,
    });
    if (iErr) console.error("quick-add inventory:", iErr);
  }

  return NextResponse.json({
    success: true,
    product_id: product.id,
    variant_id: variant.id,
    sku,
    slug: product.slug,
  }, { status: 201 });
}
