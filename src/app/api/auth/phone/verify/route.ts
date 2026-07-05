import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalisePhone } from "@/lib/whatsapp";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    // حد لكل IP — يمنع تجربة أكواد/أرقام كثيرة بسرعة من نفس المصدر
    const ipAllowed = await checkRateLimit(`phone-verify:${requestIp(request)}`, 20, 600);
    if (!ipAllowed) {
      return NextResponse.json({ error: "محاولات كثيرة جداً — حاول مرة أخرى بعد قليل" }, { status: 429 });
    }

    const body = await request.json() as { phone?: string; code?: string; full_name?: string };
    if (!body.phone || !body.code) {
      return NextResponse.json({ error: "الهاتف والرمز مطلوبان" }, { status: 400 });
    }

    const phone = normalisePhone(body.phone);
    const code  = body.code.trim();
    const admin = adminClient();

    // 1) Fetch latest unused OTP
    const { data: otpRow } = await admin
      .from("phone_otps")
      .select("id, code, expires_at, attempts, used_at")
      .eq("phone", phone)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return NextResponse.json({ error: "الرمز منتهي الصلاحية — أرسل رمزاً جديداً" }, { status: 400 });
    }

    // 2) Max 5 wrong attempts
    if (otpRow.attempts >= 5) {
      return NextResponse.json({ error: "تجاوزت الحد المسموح — أرسل رمزاً جديداً" }, { status: 429 });
    }

    if (otpRow.code !== code) {
      await admin.from("phone_otps").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
      const remaining = 4 - otpRow.attempts;
      return NextResponse.json({ error: `الرمز غير صحيح — ${remaining} محاولات متبقية` }, { status: 400 });
    }

    // 3) Mark OTP as used
    await admin.from("phone_otps").update({ used_at: new Date().toISOString() }).eq("id", otpRow.id);

    // 4) Find or create Supabase user
    const virtualEmail = `${phone.replace("+", "")}@phone.ahmadistore.internal`;

    let userId: string;

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email:         virtualEmail,
        email_confirm: true,
        phone,
        phone_confirm: true,
        user_metadata: { full_name: body.full_name?.trim() ?? "", phone, auth_method: "whatsapp" },
      });

      if (createErr || !newUser.user) {
        const { data: { users } } = await admin.auth.admin.listUsers();
        const found = users.find(u => u.email === virtualEmail);
        if (!found) return NextResponse.json({ error: "فشل في إنشاء الحساب" }, { status: 500 });
        userId = found.id;
      } else {
        userId = newUser.user.id;
        if (body.full_name) {
          await admin.from("profiles").upsert({
            id:        userId,
            full_name: body.full_name.trim(),
            phone,
          }, { onConflict: "id" });
        }
      }
    }

    // 5) Generate magic-link token and exchange for session
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type:  "magiclink",
      email: virtualEmail,
      options: { redirectTo: "/" },
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: "فشل في إنشاء الجلسة" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const anonClient  = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()  { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
            try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* */ }
          },
        },
      },
    );

    const { data: sessionData, error: sessionErr } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type:       "magiclink",
    });

    if (sessionErr || !sessionData.session) {
      return NextResponse.json({ error: "فشل في تفعيل الجلسة" }, { status: 500 });
    }

    return NextResponse.json({
      success:       true,
      access_token:  sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user_id:       userId,
    });

  } catch (err) {
    console.error("phone/verify error:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
