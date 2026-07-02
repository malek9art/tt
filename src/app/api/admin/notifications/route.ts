import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin("orders:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "1";
  const limit = Number(searchParams.get("limit") ?? 50);

  let query = supabase
    .from("notifications")
    .select("id, type, title_ar, message_ar, payload, is_read, created_at")
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const { error, supabase } = await requireAdmin("orders:read");
  if (error) return error;

  const body = await request.json() as { ids?: string[]; all?: boolean };

  if (body.all) {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  } else if (body.ids?.length) {
    await supabase.from("notifications").update({ is_read: true }).in("id", body.ids);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { error, supabase } = await requireAdmin("orders:read");
  if (error) return error;

  const body = await request.json() as { ids?: string[]; all?: boolean };

  if (body.all) {
    await supabase.from("notifications").delete().eq("is_read", true);
  } else if (body.ids?.length) {
    await supabase.from("notifications").delete().in("id", body.ids);
  }

  return NextResponse.json({ success: true });
}
