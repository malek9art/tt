import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validatePassword } from "@/lib/auth-validation";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function anon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(request: NextRequest) {
  try {
    const ipAllowed = await checkRateLimit(`signup-email:${requestIp(request)}`, 5, 300);
    if (!ipAllowed) {
      return NextResponse.json({ error: "محاولات كثيرة جداً — حاول مرة أخرى بعد قليل" }, { status: 429 });
    }

    const body = await request.json() as { email?: string; password?: string; full_name?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "بريد إلكتروني غير صحيح" }, { status: 400 });
    }
    if (!body.password) {
      return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
    }
    const pwCheck = validatePassword(body.password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const origin = request.headers.get("origin")
      ?? process.env.NEXT_PUBLIC_APP_URL
      ?? "https://ahmadi-store.vercel.app";

    const { data, error: err } = await anon().auth.signUp({
      email,
      password: body.password,
      options: {
        data: { full_name: body.full_name?.trim() ?? "" },
        emailRedirectTo: `${origin}/auth/callback?redirectTo=/account`,
      },
    });

    if (err) {
      // نسجّل رسالة Supabase الحقيقية (rate limit، مُرسِل البريد معطّل، إلخ) —
      // هذه بالضبط الرسالة التي كانت تضيع خلف "تعذّر إنشاء الحساب" العامة
      await svc().from("provider_errors").insert({
        provider:   "supabase_auth",
        context:    "email_signup",
        identifier: email,
        error:      err.message,
      });
      console.error("signup-email error:", err.message);
      return NextResponse.json({ error: "تعذّر إنشاء الحساب — حاول مجدداً بعد قليل" }, { status: 500 });
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json({ error: "هذا البريد مسجّل مسبقاً — سجّل الدخول بدلاً من ذلك" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/signup-email:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
