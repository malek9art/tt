import { createClient } from "@supabase/supabase-js";

type NotificationType =
  | "order_new" | "order_paid" | "order_cancelled" | "order_assigned"
  | "stock_low" | "stock_out" | "system" | "admin_message";

interface NotificationPayload {
  type:  NotificationType;
  title: string;
  body:  string;
  link?: string;
  /** null = إشعار للوحة الإدارة، وإلا يُرسل لمستخدم محدد */
  userId?: string | null;
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
    user_id:    payload.userId ?? null,
    channel:    "in_app",
    type:       payload.type,
    title_ar:   payload.title,
    message_ar: payload.body,
    payload:    payload.link ? { link: payload.link } : {},
    is_read:    false,
    sent_at:    new Date().toISOString(),
  });
}

/** Bulk send to many users at once (admin broadcast) */
export async function sendNotificationToUsers(
  userIds: string[],
  title: string,
  body: string,
  link?: string,
) {
  if (userIds.length === 0) return { count: 0 };
  const sb = adminSb();
  const rows = userIds.map(uid => ({
    user_id:    uid,
    channel:    "in_app",
    type:       "admin_message",
    title_ar:   title,
    message_ar: body,
    payload:    link ? { link } : {},
    is_read:    false,
    sent_at:    new Date().toISOString(),
  }));
  const { error } = await sb.from("notifications").insert(rows);
  return { count: error ? 0 : rows.length, error: error?.message };
}

export async function notifyNewOrder(orderNumber: string, orderId: string, total: number) {
  await createNotification({
    type:  "order_new",
    title: "طلب جديد",
    body:  `طلب #${orderNumber} — ${total.toLocaleString("ar")} ر.ي`,
    link:  `/admin/orders/${orderId}`,
  });
}

export async function notifyDriverAssigned(driverId: string, orderNumber: string, shipmentId: string) {
  await createNotification({
    userId: driverId,
    type:   "order_assigned",
    title:  "طلبية جديدة",
    body:   `لديك طلبية جديدة #${orderNumber} — توجّه إلى مركز الأحمدي لبدء إجراءات التوصيل`,
    link:   `/driver/orders/${shipmentId}`,
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

export async function notifyLowStock(productName: string, qty: number, _inventoryId: string) {
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

/** إشعار للعميل عند تغيير حالة طلبه */
/** إشعار العميل بنتيجة مراجعة الدفع — الرسائل حسب مواصفة نظام الدفع */
export async function notifyCustomerPayment(
  customerId: string,
  orderNumber: string,
  orderId: string,
  kind: "verified" | "rejected" | "revision" | "refunded",
  note?: string,
) {
  const messages: Record<typeof kind, { title: string; body: string }> = {
    verified: {
      title: `تم استلام دفعتك — #${orderNumber} ✅`,
      body:  "تم استلام دفعتك بنجاح، جاري تجهيز الطلب.",
    },
    rejected: {
      title: `تعذّر اعتماد دفعتك — #${orderNumber}`,
      body:  note
        ? `لم نتمكن من اعتماد العملية: ${note}`
        : "لم نتمكن من اعتماد العملية لأن المبلغ غير مطابق لقيمة الطلب.",
    },
    revision: {
      title: `دفعتك بحاجة لاستكمال — #${orderNumber}`,
      body:  note
        ? `${note} — أعد رفع إثبات التحويل من صفحة الطلب.`
        : "أعد رفع إثبات تحويل واضح من صفحة الطلب لنتمكن من التحقق.",
    },
    refunded: {
      title: `تم إرجاع مبلغ طلبك — #${orderNumber}`,
      body:  note ?? "تم إرجاع مبلغ الطلب إلى حسابك.",
    },
  };
  const msg = messages[kind];
  await createNotification({
    userId: customerId,
    type:   kind === "verified" ? "order_paid" : "system",
    title:  msg.title,
    body:   msg.body,
    link:   `/account/orders/${orderId}`,
  });
}

export async function notifyCustomerOrderStatus(
  customerId: string,
  orderNumber: string,
  statusLabel: string,
) {
  await createNotification({
    userId: customerId,
    type:   "system",
    title:  `تحديث طلبك #${orderNumber}`,
    body:   statusLabel,
    link:   `/account/orders`,
  });
}
