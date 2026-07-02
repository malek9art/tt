import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Roles allowed to self-reset their password via email.
// Staff and drivers must ask the manager, who sets a password from the admin panel.
const SELF_RESET_ROLES = new Set(["super_admin", "admin", "customer"]);

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "أدخل بريداً إلكترونياً صحيحاً" }, { status: 400 });
    }

    const admin = svc();

    // Find the user (paged lookup — store scale is small)
    const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = users.find(u => u.email?.toLowerCase() === email);

    // Do not reveal whether the email exists
    if (!user) return NextResponse.json({ success: true });

    // Determine role: any user_roles rows?
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const roleNames = (roleRows ?? [])
      .map(r => (r.roles as unknown as { name: string } | null)?.name)
      .filter(Boolean) as string[];

    // Drivers table check
    const { data: driverRow } = await admin
      .from("drivers").select("id").eq("id", user.id).maybeSingle();

    const isPrivileged = roleNames.some(n => SELF_RESET_ROLES.has(n));
    const isRestricted = (driverRow || roleNames.length > 0) && !isPrivileged;

    if (isRestricted) {
      return NextResponse.json({
        error: "استعادة كلمة المرور غير متاحة لحسابات الموظفين والمناديب — تواصل مع مدير المتجر لتعيين كلمة مرور جديدة",
      }, { status: 403 });
    }

    // Send the standard recovery email
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const origin = request.headers.get("origin")
      ?? process.env.NEXT_PUBLIC_APP_URL
      ?? "https://ahmadi-store.vercel.app";

    await anon.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/forgot:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
