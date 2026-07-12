import type { SupabaseClient } from "@supabase/supabase-js";
import { createProductWithInventory } from "./create-product";
import {
  resolveCategoryId, resolveBrandId, resolveWarehouseId, inferCategoryId, inferBrandId,
  type ParsedProductRow,
} from "./product-csv";
import { notifyLowStock, notifyOutOfStock } from "@/lib/notifications";

// صف مُجمَّع لكل SKU فريد — يحمل بيانات المنتج + كمية كل مخزن مطابق له.
// كشوف المخزون الواقعية قد تُكرِّر نفس رقم الصنف بصفٍّ مستقل لكل مخزن.
export interface GroupedRow {
  row: ParsedProductRow;
  warehouseQuantities: Array<{ warehouse_name: string; quantity: number }>;
}

export function groupRowsBySku(rows: ParsedProductRow[]): GroupedRow[] {
  const groups: GroupedRow[] = [];
  const bySku = new Map<string, GroupedRow>();
  for (const row of rows) {
    const wq = { warehouse_name: row.warehouse_name, quantity: row.quantity };
    if (!row.sku) { groups.push({ row, warehouseQuantities: [wq] }); continue; }
    const existing = bySku.get(row.sku);
    if (existing) { existing.warehouseQuantities.push(wq); continue; }
    const grouped: GroupedRow = { row, warehouseQuantities: [wq] };
    bySku.set(row.sku, grouped);
    groups.push(grouped);
  }
  return groups;
}

export interface ImportRunResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * منطق الاستيراد الفعلي المشترك — يستدعيه مسار API (رفع ملف من لوحة
 * التحكم) وأي عملية استيراد برمجية لمرة واحدة، لضمان أنهما يسلكان
 * بالضبط نفس المسار (مطابقة SKU، تجميع المخازن، استدلال الفئة/الماركة،
 * إنشاء/تحديث المخزون متعدد المخازن).
 */
export async function runInventoryImport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  rows: ParsedProductRow[],
  opts: { respectStatusColumn: boolean },
): Promise<ImportRunResult> {
  const groups = groupRowsBySku(rows);

  const [{ data: categories }, { data: brands }, { data: warehouses }] = await Promise.all([
    supabase.from("categories").select("id, name_ar, slug"),
    supabase.from("brands").select("id, name"),
    supabase.from("warehouses").select("id, name"),
  ]);
  const categoryList  = categories  ?? [];
  const brandList     = brands     ?? [];
  const warehouseList = warehouses ?? [];
  const defaultWarehouse = warehouseList[0] ?? null;

  async function resolveOrCreateWarehouse(name: string): Promise<string | null> {
    if (!name.trim()) return defaultWarehouse?.id ?? null;
    const existingId = resolveWarehouseId(name, warehouseList);
    if (existingId) return existingId;
    const { data: created, error: wErr } = await supabase
      .from("warehouses")
      .insert({ name: name.trim(), governorate: "تعز", is_active: true, is_default: false })
      .select("id, name")
      .single();
    if (wErr || !created) return defaultWarehouse?.id ?? null;
    warehouseList.push(created);
    return created.id;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { row, warehouseQuantities } of groups) {
    const label = row.sku || row.name_ar || "(بدون اسم)";

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

    let category_id = row.category_name ? resolveCategoryId(row.category_name, categoryList) : null;
    if (row.category_name && !category_id) errors.push(`${label}: فئة غير معروفة "${row.category_name}" — تُركت كما كانت`);
    if (!category_id && row.sku) category_id = inferCategoryId(row.sku, row.name_ar, categoryList);

    let brand_id = row.brand_name ? resolveBrandId(row.brand_name, brandList) : null;
    if (row.brand_name && !brand_id) errors.push(`${label}: علامة تجارية غير معروفة "${row.brand_name}" — تُركت كما كانت`);
    if (!brand_id) brand_id = inferBrandId(row.name_ar, brandList);

    const resolvedWarehouseQty: Array<{ warehouse_id: string; quantity: number }> = [];
    for (const wq of warehouseQuantities) {
      const warehouseId = await resolveOrCreateWarehouse(wq.warehouse_name);
      if (!warehouseId) continue;
      const existing = resolvedWarehouseQty.find(w => w.warehouse_id === warehouseId);
      if (existing) existing.quantity += wq.quantity;
      else resolvedWarehouseQty.push({ warehouse_id: warehouseId, quantity: wq.quantity });
    }

    const attributes: Record<string, unknown> = {};
    if (row.model_number) attributes.model_number = row.model_number;

    if (productId && variantId) {
      const productPatch: Record<string, unknown> = {};
      if (row.name_ar)        productPatch.name_ar     = row.name_ar;
      if (row.name_en)        productPatch.name_en     = row.name_en;
      if (row.description)    productPatch.description = row.description;
      if (category_id)        productPatch.category_id = category_id;
      if (brand_id)            productPatch.brand_id    = brand_id;
      if (row.warranty)       productPatch.warranty    = row.warranty;
      if (row.tags.length)    productPatch.tags        = row.tags;
      if (row.base_price > 0) productPatch.base_price  = row.base_price;
      if (Object.keys(attributes).length) {
        const { data: current } = await supabase.from("products").select("attributes").eq("id", productId).maybeSingle();
        productPatch.attributes = { ...(current?.attributes as Record<string, unknown> ?? {}), ...attributes };
      }
      productPatch.condition = row.condition;
      productPatch.type      = row.type;
      if (opts.respectStatusColumn) productPatch.status = row.status;

      if (Object.keys(productPatch).length > 0) {
        await supabase.from("products").update(productPatch).eq("id", productId);
      }
      const variantPatch: Record<string, unknown> = {};
      if (row.base_price > 0) variantPatch.price = row.base_price;
      if (row.compare_at_price !== null) variantPatch.compare_at_price = row.compare_at_price;
      if (Object.keys(variantPatch).length > 0) {
        await supabase.from("product_variants").update(variantPatch).eq("id", variantId);
      }

      const { data: invRows } = await supabase
        .from("inventory").select("id, warehouse_id, quantity, reorder_level").eq("variant_id", variantId);
      const invByWarehouse = new Map((invRows ?? []).map(r => [r.warehouse_id, r]));

      for (const wq of resolvedWarehouseQty) {
        const inv = invByWarehouse.get(wq.warehouse_id);
        if (inv) {
          const invPatch: Record<string, unknown> = { quantity: wq.quantity };
          if (row.location) invPatch.location = row.location;
          if (row.reorder_level) invPatch.reorder_level = row.reorder_level;
          if (row.reorder_quantity) invPatch.reorder_quantity = row.reorder_quantity;
          await supabase.from("inventory").update(invPatch).eq("id", inv.id);

          if (Number(inv.quantity) !== wq.quantity) {
            await supabase.from("inventory_movements").insert({
              variant_id: variantId, product_name: row.name_ar || label,
              movement_type: "adjust",
              quantity: Math.abs(wq.quantity - Number(inv.quantity)),
              quantity_before: Number(inv.quantity), quantity_after: wq.quantity,
              reason: "استيراد ملف مخزون", reference_type: "import",
            });
            if (wq.quantity === 0) await notifyOutOfStock(row.name_ar || label);
            else if (wq.quantity <= (row.reorder_level || inv.reorder_level)) {
              await notifyLowStock(row.name_ar || label, wq.quantity, inv.id);
            }
          }
        } else {
          await supabase.from("inventory").insert({
            variant_id: variantId, warehouse_id: wq.warehouse_id,
            quantity: wq.quantity, reorder_level: row.reorder_level || 5,
            location: row.location || null,
          });
        }
      }
      updated++;
      continue;
    }

    if (!row.name_ar) {
      skipped++;
      errors.push(`${label}: تخطٍّ — يلزم اسم منتج لإنشاء منتج جديد`);
      continue;
    }
    const result = await createProductWithInventory(supabase, userId, {
      name_ar: row.name_ar,
      name_en: row.name_en || null,
      sku: row.sku || null,
      description: row.description || null,
      base_price: row.base_price,
      compare_at_price: row.compare_at_price,
      category_id, brand_id,
      condition: row.condition,
      status: opts.respectStatusColumn ? row.status : undefined,
      type: row.type,
      warranty: row.warranty || null,
      tags: row.tags,
      attributes: Object.keys(attributes).length ? attributes : undefined,
      warehouseQuantities: resolvedWarehouseQty.length ? resolvedWarehouseQty : undefined,
      quantity: resolvedWarehouseQty.length ? undefined : row.quantity,
      reorder_level: row.reorder_level,
      location: row.location || null,
    });
    if (!result.ok) { skipped++; errors.push(`${label}: ${result.error}`); continue; }
    created++;
  }

  return { created, updated, skipped, errors };
}
