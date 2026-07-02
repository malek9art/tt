import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (const n of arr) pw += chars[n % chars.length];
  return pw;
}

// POST — set (or auto-generate) a new password for a staff/driver account.
// Body: { password?: string } — if omitted, a strong password is generated and returned once.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { password?: string };

  const password = body.password?.trim() || generatePassword();
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });
  }

  const { error } = await svc().auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The password is returned once so the admin can copy and share it
  return NextResponse.json({ success: true, password });
}

// PATCH — activate / deactivate the account.
// Body: { active: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json() as { active?: boolean };
  if (body.active === undefined) {
    return NextResponse.json({ error: "حدد حالة التفعيل" }, { status: 400 });
  }

  // ban_duration "none" = active, "876000h" (~100 سنة) = disabled
  const { error } = await svc().auth.admin.updateUserById(id, {
    ban_duration: body.active ? "none" : "876000h",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync drivers.is_active when the user is a driver
  await svc().from("drivers").update({ is_active: body.active }).eq("id", id);

  return NextResponse.json({ success: true, active: body.active });
}
