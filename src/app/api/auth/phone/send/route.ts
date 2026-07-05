import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalisePhone, sendWhatsAppOtp } from "@/lib/whatsapp";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    // حد لكل IP بالإضافة للحد الحالي لكل رقم — يمنع تجربة أرقام كثيرة مختلفة
    // بسرعة من نفس المصدر (استنزاف تكلفة إرسال واتساب)
    const ipAllowed = await checkRateLimit(`phone-send:${requestIp(request)}`, 8, 600);
    if (!ipAllowed) {
      return NextResponse.json({ error: "محاولات كثيرة جداً — حاول مرة أخرى بعد قليل" }, { status: 429 });
    }

    const body = await request.json() as { phone?: string };
    if (!body.phone) return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });

    const phone = normalisePhone(body.phone);
    if (phone.length < 10) return NextResponse.json({ error: "رقم هاتف غير صحيح" }, { status: 400 });

    const supabase = sb();

    // Rate limit: max 3 codes per phone per 10 minutes
    const { count } = await supabase
      .from("phone_otps")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "تم إرسال الحد الأقصى من الرموز — انتظر 10 دقائق" }, { status: 429 });
    }

    const code = generateCode();

    const { error: dbErr } = await supabase.from("phone_otps").insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (dbErr) return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });

    // محاولة واحدة أولى، وإعادة محاولة واحدة بعد تأخير قصير عند فشل المزوّد
    // (وليس عند "not_configured" — إعادة المحاولة لن تُصلح غياب الإعداد)
    let waResult = await sendWhatsAppOtp(phone, code);
    if (!waResult.success && waResult.code === "provider_error") {
      await new Promise(r => setTimeout(r, 1200));
      waResult = await sendWhatsAppOtp(phone, code);
    }

    if (!waResult.success) {
      const provider = (process.env.WHATSAPP_PROVIDER ?? "fonnte").toLowerCase();
      await supabase.from("provider_errors").insert({
        provider,
        context:    "phone_otp_send",
        identifier: phone,
        error:      waResult.error ?? "unknown error",
      });

      if (waResult.code === "not_configured") {
        console.error("WhatsApp not configured on server:", waResult.error);
        return NextResponse.json(
          { error: "تسجيل الدخول عبر واتساب غير متاح حالياً — استخدم البريد الإلكتروني" },
          { status: 503 },
        );
      }
      console.error("WhatsApp send error:", waResult.error);
      return NextResponse.json(
        { error: "تعذّر إرسال الرمز حالياً — حاول مجدداً بعد قليل أو استخدم البريد الإلكتروني" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, phone });
  } catch (err) {
    console.error("phone/send error:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
