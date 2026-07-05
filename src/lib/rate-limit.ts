import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** أول عنوان IP في x-forwarded-for (يضعه Vercel تلقائياً) — "unknown" إن غاب */
export function requestIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

/**
 * يتحقق من عدّاد نافذة زمنية ذرّي في القاعدة عبر check_rate_limit RPC.
 * عند فشل الاتصال بالقاعدة نفسها (لا علاقة بتجاوز الحد) نسمح بالطلب
 * (fail-open) حتى لا يعطّل عطل بنية تحتية في نظام التحديد مسار الدفع الحقيقي.
 */
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const sb = svc();
  const { data, error } = await sb.rpc("check_rate_limit", {
    p_key: key, p_max: max, p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("checkRateLimit:", error);
    return true;
  }
  return data === true;
}
