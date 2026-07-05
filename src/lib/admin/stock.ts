import { createClient } from "@supabase/supabase-js";
import { notifyLowStock, notifyOutOfStock } from "@/lib/notifications";

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

export interface StockAdjustment {
  variant_id:   string;
  name_snapshot: string;
  quantity_before: number;
  quantity_after:  number;
}

/**
 * خصم المخزون عند البيع أو إرجاعه عند الإلغاء — مع قيد حركة لكل عنصر.
 * الخصم/الإرجاع الفعلي يمر عبر adjust_inventory_by_variant (RPC ذرّية تقفل
 * الصف) بدل قراءة ثم كتابة من التطبيق، لمنع فقدان تحديثات عند تزامن عمليتين
 * على نفس المتغيّر. لا يرمي استثناء أبداً حتى لا يكسر مسار الطلب؛ يسجّل
 * الأخطاء فقط، ويعيد قائمة التعديلات الفعلية التي طبّقها لمن يحتاج التفاعل
 * معها (مثل إشعارات نقص/نفاد المخزون).
 */
export async function applyOrderStock(
  orderId: string,
  orderNumber: string,
  items: StockItem[],
  direction: "sale" | "return",
): Promise<StockAdjustment[]> {
  const sb = svc();
  const applied: StockAdjustment[] = [];
  for (const item of items) {
    if (!item.variant_id || item.quantity <= 0) continue;
    try {
      const delta = direction === "sale" ? -item.quantity : item.quantity;
      const { data, error } = await sb.rpc("adjust_inventory_by_variant", {
        p_variant_id: item.variant_id,
        p_delta: delta,
      });
      if (error) throw error;
      const row = data?.[0] as
        { inventory_id: string; quantity_before: number; quantity_after: number; reorder_level: number } | undefined;
      if (!row) continue; // لا سجل مخزون لهذا المتغيّر = غير مُتتبَّع

      await sb.from("inventory_movements").insert({
        variant_id:      item.variant_id,
        product_name:    item.name_snapshot,
        movement_type:   direction,
        quantity:        item.quantity,
        quantity_before: row.quantity_before,
        quantity_after:  row.quantity_after,
        reason:          direction === "sale" ? `بيع — طلب ${orderNumber}` : `إرجاع — إلغاء طلب ${orderNumber}`,
        reference_type:  "order",
        reference_id:    orderId,
      });

      // إشعار نقص/نفاد المخزون فور خصم بيع فعلي يعبر بالكمية عتبة إعادة الطلب
      if (direction === "sale" && row.quantity_after <= row.reorder_level) {
        if (row.quantity_after === 0) {
          notifyOutOfStock(item.name_snapshot).catch(() => {});
        } else {
          notifyLowStock(item.name_snapshot, row.quantity_after, row.inventory_id).catch(() => {});
        }
      }

      applied.push({
        variant_id: item.variant_id, name_snapshot: item.name_snapshot,
        quantity_before: row.quantity_before, quantity_after: row.quantity_after,
      });
    } catch (err) {
      console.error("applyOrderStock:", err);
    }
  }
  return applied;
}
