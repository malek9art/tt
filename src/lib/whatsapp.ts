export { normalisePhone } from "@/lib/auth-validation";

export interface WhatsAppResult {
  success: boolean;
  error?:  string;
  /** يميّز "الخدمة غير مُعدّة على الخادم" عن "فشل فعلي من المزوّد" — حتى لا
   *  يُلام رقم العميل خطأً عندما يكون السبب مفتاح API مفقوداً */
  code?:   "not_configured" | "provider_error";
}

async function sendFonnte(phone: string, message: string): Promise<WhatsAppResult> {
  const apiKey = process.env.FONNTE_API_KEY;
  if (!apiKey) return { success: false, error: "FONNTE_API_KEY not set", code: "not_configured" };

  const target = phone.replace("+", "");
  const res = await fetch("https://api.fonnte.com/send", {
    method:  "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ target, message, countryCode: "967" }),
  });

  if (!res.ok) return { success: false, error: `Fonnte HTTP ${res.status}`, code: "provider_error" };
  const data = await res.json() as { status?: boolean; reason?: string };
  return data.status ? { success: true } : { success: false, error: data.reason, code: "provider_error" };
}

async function sendMeta(phone: string, message: string): Promise<WhatsAppResult> {
  const token   = process.env.META_WA_TOKEN;
  const phoneId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneId) return { success: false, error: "META_WA_TOKEN or META_WA_PHONE_ID not set", code: "not_configured" };

  const to = phone.replace("+", "");
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    return { success: false, error: err?.error?.message ?? `HTTP ${res.status}`, code: "provider_error" };
  }
  return { success: true };
}

export async function sendWhatsAppOtp(phone: string, code: string): Promise<WhatsAppResult> {
  const message =
    `مركز الأحمدي للجوالات 📱\n\n` +
    `رمز التحقق الخاص بك:\n\n` +
    `*${code}*\n\n` +
    `صالح لمدة 10 دقائق.\n` +
    `لا تشارك هذا الرمز مع أحد.`;

  const provider = (process.env.WHATSAPP_PROVIDER ?? "fonnte").toLowerCase();

  switch (provider) {
    case "meta":    return sendMeta(phone, message);
    case "fonnte":
    default:        return sendFonnte(phone, message);
  }
}
