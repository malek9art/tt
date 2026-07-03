import { createClient } from "@supabase/supabase-js";

// عمليات المخزون المرتبطة بالطلبات — تعمل بمفتاح الخدمة لأن العميل نفسه
// لا يملك صلاحية تعديل المخزون، لكن طلبه يجب أن يخصم منه

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface StockItem {
  variant_id: string | null;
  name_snapshot: string;
  quantity: number;
}

/** فحص التوفر قبل إنشاء الطلب — يعيد أسماء المنتجات غير المتوفرة بالكمية المطلوبة */
export async function checkStockAvailability(items: StockItem[]): Promise<string[]> {
  const sb = svc();
  const shortages: string[] = [];
  for (const item of items) {
    if (!item.variant_id) continue; // عناصر قديمة بلا متغيّر — لا تتبع مخزون
    const { data: inv } = await sb
      .from("inventory")
      .select("quantity")
      .eq("variant_id", item.variant_id)
      .maybeSingle();
    if (!inv) continue; // لا سجل مخزون = غير مُتتبَّع
    if (Number(inv.quantity) < item.quantity) shortages.push(item.name_snapshot);
  }
  return shortages;
}

/**
 * خصم المخزون عند البيع أو إرجاعه عند الإلغاء — مع قيد حركة لكل عنصر.
 * لا يرمي استثناء أبداً حتى لا يكسر مسار الطلب؛ يسجّل الأخطاء فقط.
 */
export async function applyOrderStock(
  orderId: string,
  orderNumber: string,
  items: StockItem[],
  direction: "sale" | "return",
) {
  const sb = svc();
  for (const item of items) {
    if (!item.variant_id || item.quantity <= 0) continue;
    try {
      const { data: inv } = await sb
        .from("inventory")
        .select("id, quantity")
        .eq("variant_id", item.variant_id)
        .maybeSingle();
      if (!inv) continue;

      const before = Number(inv.quantity);
      const after  = direction === "sale"
        ? Math.max(0, before - item.quantity)
        : before + item.quantity;

      await sb.from("inventory")
        .update({ quantity: after, updated_at: new Date().toISOString() })
        .eq("id", inv.id);

      await sb.from("inventory_movements").insert({
        variant_id:      item.variant_id,
        product_name:    item.name_snapshot,
        movement_type:   direction,
        quantity:        item.quantity,
        quantity_before: before,
        quantity_after:  after,
        reason:          direction === "sale" ? `بيع — طلب ${orderNumber}` : `إرجاع — إلغاء طلب ${orderNumber}`,
        reference_type:  "order",
        reference_id:    orderId,
      });
    } catch (err) {
      console.error("applyOrderStock:", err);
    }
  }
}
