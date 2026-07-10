import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * تسجيل تحصيل نقدي (دفع عند الاستلام) في عهدة المندوب — يُستدعى فقط من
 * كود خادم موثوق (api/driver/shipments/[id]/route.ts عند تأكيد التسليم)،
 * لذا دالة عادية وليست RPC — لا حدود ثقة هنا.
 */
export async function recordCashCollection(
  driverId: string,
  amount: number,
  orderId: string,
  shipmentId: string,
) {
  await svc().from("driver_cash_ledger").insert({
    driver_id:   driverId,
    entry_type:  "collection",
    amount,
    order_id:    orderId,
    shipment_id: shipmentId,
  });
}
