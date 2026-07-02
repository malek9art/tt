import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { sendNotificationToUsers } from "@/lib/notifications";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/admin/notifications/send
// Body: { audience: "all_customers" | "all_drivers" | "user", userId?, title, message, link? }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin("orders:manage");
  if (auth.error) return auth.error;

  const body = await request.json() as {
    audience: "all_customers" | "all_drivers" | "user";
    userId?: string;
    title?: string;
    message?: string;
    link?: string;
  };

  if (!body.title?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "العنوان ونص الرسالة مطلوبان" }, { status: 400 });
  }

  let userIds: string[] = [];
  const svc = sb();

  if (body.audience === "user") {
    if (!body.userId) return NextResponse.json({ error: "حدد المستخدم" }, { status: 400 });
    userIds = [body.userId];
  } else if (body.audience === "all_drivers") {
    const { data } = await svc.from("drivers").select("id").eq("is_active", true);
    userIds = (data ?? []).map(d => d.id);
  } else {
    // all_customers: profiles that are not drivers and not staff
    const [{ data: profiles }, { data: drivers }, { data: staff }] = await Promise.all([
      svc.from("profiles").select("id"),
      svc.from("drivers").select("id"),
      svc.from("user_roles").select("user_id"),
    ]);
    const exclude = new Set([
      ...(drivers ?? []).map(d => d.id),
      ...(staff ?? []).map(s => s.user_id),
    ]);
    userIds = (profiles ?? []).map(p => p.id).filter(id => !exclude.has(id));
  }

  const result = await sendNotificationToUsers(
    userIds, body.title.trim(), body.message.trim(), body.link?.trim() || undefined,
  );

  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, sent: result.count });
}
