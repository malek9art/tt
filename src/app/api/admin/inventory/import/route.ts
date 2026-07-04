import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyLowStock, notifyOutOfStock } from "@/lib/notifications";
import { createProductWithInventory } from "@/lib/admin/create-product";
import { parseCsv } from "@/lib/admin/csv";
import { buildHeaderIndex, rowToProduct, resolveCategoryId, resolveBrandId } from "@/lib/admin/product-csv";

// POST — استيراد شامل من CSV: يُحدّث المنتجات الموجودة (بمطابقة SKU) بكل
// حقولها (السعر، الفئة، الوصف...) وليس الكمية فقط، وينشئ منتجات جديدة كاملة
// (بنفس منطق «الإضافة السريعة») للصفوف التي لا يوجد لها SKU مطابق.
export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("products:manage");
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يُرفع ملف" }, { status: 400 });

  const text  = await file.text();
  const table = parseCsv(text);
  if (table.length < 2) {
    return NextResponse.json({ error: "الملف فارغ أو تنسيق غير صحيح" }, { status: 400 });
  }

  const idx = buildHeaderIndex(table[0]);
  if (idx.name_ar === undefined && idx.sku === undefined) {
    return NextResponse.json({ error: "لم يُعثر على عمود اسم المنتج أو SKU في الملف" }, { status: 400 });
  }
  const dataRows = table.slice(1).filter(r => r.some(c => c.trim()));

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("id, name_ar, slug"),
    supabase.from("brands").select("id, name"),
  ]);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const cols of dataRows) {
    const row = rowToProduct(cols, idx);
    const label = row.sku || row.name_ar || "(بدون اسم)";

    // مطابقة SKU مع منتج/متغيّر موجود — على مستوى المتغيّر أولاً ثم المنتج
    let variantId: string | null = null;
    let productId: string | null = null;
    if (row.sku) {
      const { data: variant } = await supabase
        .from("product_variants").select("id, product_id").eq("sku", row.sku).maybeSingle();
      if (variant) { variantId = variant.id; productId = variant.product_id; }
      else {
        const { data: product } = await supabase
          .from("products").select("id, product_variants(id)").eq("sku", row.sku).maybeSingle();
        if (product) {
          productId = product.id;
          const pvs = (product.product_variants as { id: string }[]) ?? [];
          variantId = pvs[0]?.id ?? null;
        }
      }
    }

    const category_id = row.category_name ? resolveCategoryId(row.category_name, categories ?? []) : null;
    const brand_id     = row.brand_name    ? resolveBrandId(row.brand_name, brands ?? [])          : null;
    if (row.category_name && !category_id) errors.push(`${label}: فئة غير معروفة "${row.category_name}" — تُركت كما كانت`);
    if (row.brand_name && !brand_id)        errors.push(`${label}: علامة تجارية غير معروفة "${row.brand_name}" — تُركت كما كانت`);

    if (productId && variantId) {
      // ===== تحديث منتج موجود =====
      const productPatch: Record<string, unknown> = {};
      if (row.name_ar)        productPatch.name_ar     = row.name_ar;
      if (row.name_en)        productPatch.name_en     = row.name_en;
      if (row.description)    productPatch.description = row.description;
      if (category_id)        productPatch.category_id = category_id;
      if (brand_id)            productPatch.brand_id    = brand_id;
      if (row.warranty)       productPatch.warranty    = row.warranty;
      if (row.tags.length)    productPatch.tags        = row.tags;
      if (row.base_price > 0) productPatch.base_price  = row.base_price;
      productPatch.condition = row.condition;
      productPatch.status    = row.status;
      productPatch.type      = row.type;

      if (Object.keys(productPatch).length > 0) {
        await supabase.from("products").update(productPatch).eq("id", productId);
      }
      // مزامنة سعر المتغيّر — هو ما يُعرض فعلياً للعميل
      const variantPatch: Record<string, unknown> = {};
      if (row.base_price > 0) variantPatch.price = row.base_price;
      if (row.compare_at_price !== null) variantPatch.compare_at_price = row.compare_at_price;
      if (Object.keys(variantPatch).length > 0) {
        await supabase.from("product_variants").update(variantPatch).eq("id", variantId);
      }

      const { data: inv } = await supabase
        .from("inventory").select("id, quantity, reorder_level").eq("variant_id", variantId).maybeSingle();
      if (inv) {
        const invPatch: Record<string, unknown> = {};
        const qtyRaw = idx.quantity !== undefined ? (cols[idx.quantity] ?? "").trim() : "";
        if (qtyRaw !== "") invPatch.quantity = row.quantity;
        if (row.location)          invPatch.location       = row.location;
        if (row.reorder_level)     invPatch.reorder_level  = row.reorder_level;
        if (row.reorder_quantity)  invPatch.reorder_quantity = row.reorder_quantity;
        if (Object.keys(invPatch).length > 0) await supabase.from("inventory").update(invPatch).eq("id", inv.id);

        if (invPatch.quantity !== undefined && Number(inv.quantity) !== row.quantity) {
          await supabase.from("inventory_movements").insert({
            variant_id: variantId, product_name: row.name_ar || label,
            movement_type: "adjust",
            quantity: Math.abs(row.quantity - Number(inv.quantity)),
            quantity_before: Number(inv.quantity), quantity_after: row.quantity,
            reason: "استيراد ملف CSV", reference_type: "import",
          });
          if (row.quantity === 0) await notifyOutOfStock(row.name_ar || label);
          else if (row.quantity <= (row.reorder_level || inv.reorder_level)) {
            await notifyLowStock(row.name_ar || label, row.quantity, inv.id);
          }
        }
      }
      updated++;
      continue;
    }

    // ===== إنشاء منتج جديد =====
    if (!row.name_ar || row.base_price <= 0) {
      skipped++;
      errors.push(`${label}: تخطٍّ — يلزم اسم منتج وسعر أكبر من صفر لإنشاء منتج جديد`);
      continue;
    }
    const result = await createProductWithInventory(supabase, user!.id, {
      name_ar: row.name_ar,
      name_en: row.name_en || null,
      sku: row.sku || null,
      description: row.description || null,
      base_price: row.base_price,
      compare_at_price: row.compare_at_price,
      category_id, brand_id,
      condition: row.condition,
      status: row.status,
      type: row.type,
      warranty: row.warranty || null,
      tags: row.tags,
      quantity: row.quantity,
      reorder_level: row.reorder_level,
      location: row.location || null,
    });
    if (!result.ok) { skipped++; errors.push(`${label}: ${result.error}`); continue; }
    created++;
  }

  return NextResponse.json({
    success: true,
    created, updated, skipped,
    errors: errors.slice(0, 15),
    message: `أُنشئ ${created} منتج جديد، وحُدّث ${updated} منتج${skipped ? `، تخطٍّ ${skipped}` : ""}`,
  });
}
