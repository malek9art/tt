import { createClient } from "@supabase/supabase-js";

type NotificationType = "order_new" | "order_paid" | "order_cancelled" | "stock_low" | "stock_out" | "system";

interface NotificationPayload {
  type:  NotificationType;
  title: string;
  body:  string;
  link?: string;
}

function adminSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function createNotification(payload: NotificationPayload) {
  const sb = adminSb();
  await sb.from("notifications").insert({
    type:     payload.type,
    title:    payload.title,
    body:     payload.body,
    link:     payload.link ?? null,
    is_read:  false,
  });
}

export async function notifyNewOrder(orderNumber: string, orderId: string, total: number) {
  await createNotification({
    type:  "order_new",
    title: "طلب جديد",
    body:  `طلب #${orderNumber} — ${total.toLocaleString("ar")} ر.ي`,
    link:  `/admin/orders/${orderId}`,
  });
}

export async function notifyOrderPaid(orderNumber: string, orderId: string) {
  await createNotification({
    type:  "order_paid",
    title: "تم الدفع",
    body:  `تم تأكيد دفع الطلب #${orderNumber}`,
    link:  `/admin/orders/${orderId}`,
  });
}

export async function notifyOrderCancelled(orderNumber: string, orderId: string) {
  await createNotification({
    type:  "order_cancelled",
    title: "طلب ملغي",
    body:  `تم إلغاء الطلب #${orderNumber}`,
    link:  `/admin/orders/${orderId}`,
  });
}

export async function notifyLowStock(productName: string, qty: number, inventoryId: string) {
  await createNotification({
    type:  "stock_low",
    title: "مخزون منخفض",
    body:  `${productName} — تبقى ${qty} قطعة فقط`,
    link:  `/admin/inventory`,
  });
}

export async function notifyOutOfStock(productName: string) {
  await createNotification({
    type:  "stock_out",
    title: "نفد المخزون",
    body:  `${productName} — نفد المخزون بالكامل`,
    link:  `/admin/inventory`,
  });
}
