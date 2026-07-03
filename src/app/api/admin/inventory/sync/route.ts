import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// POST — مزامنة المخزون مع كتالوج المنتجات:
// 1) ينشئ متغيّراً افتراضياً لكل منتج بلا متغيّرات
// 2) ينشئ صف مخزون لكل متغيّر نشط بلا صف
// آمنة للتكرار — لا تلمس الصفوف الموجودة
export async function POST() {
  const { error, supabase } = await requireAdmin("inventory:manage");
  if (error) return error;

  const { data: warehouse } = await supabase
    .from("warehouses").select("id").limit(1).maybeSingle();
  if (!warehouse) {
    return NextResponse.json({ error: "لا يوجد مخزن — أنشئ مخزناً أولاً" }, { status: 400 });
  }

  let createdVariants = 0;
  let createdInventory = 0;
  const errors: string[] = [];

  // 1) منتجات بلا متغيّرات
  const { data: products } = await supabase
    .from("products")
    .select("id, name_ar, sku, base_price, product_variants(id)")
    .neq("status", "archived");

  for (const p of products ?? []) {
    const variants = (p.product_variants as { id: string }[]) ?? [];
    if (variants.length > 0) continue;
    const { error: vErr } = await supabase.from("product_variants").insert({
      product_id: p.id,
      sku: p.sku || null,
      price: p.base_price,
      attributes: {},
      is_active: true,
    });
    if (vErr) errors.push(`${p.name_ar}: ${vErr.message}`);
    else createdVariants++;
  }

  // 2) متغيّرات بلا صفوف مخزون
  const { data: allVariants } = await supabase
    .from("product_variants")
    .select("id, inventory(id)")
    .eq("is_active", true);

  for (const v of allVariants ?? []) {
    const inv = (v.inventory as { id: string }[]) ?? [];
    if (inv.length > 0) continue;
    const { error: iErr } = await supabase.from("inventory").insert({
      variant_id: v.id,
      warehouse_id: warehouse.id,
      quantity: 0,
      reorder_level: 5,
    });
    if (iErr) errors.push(iErr.message);
    else createdInventory++;
  }

  return NextResponse.json({
    success: true,
    created_variants: createdVariants,
    created_inventory: createdInventory,
    errors,
    message: createdVariants + createdInventory === 0
      ? "كل شيء متزامن — لا يوجد ما يُضاف"
      : `أُنشئ ${createdVariants} متغيّر و${createdInventory} صف مخزون`,
  });
}
