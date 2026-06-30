import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error, supabase } = await requireAdmin("settings:read");
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("settings")
    .select("key, value, scope, is_public")
    .order("key");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const map: Record<string, string> = {};
  (data ?? []).forEach(s => {
    const raw = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
    map[s.key] = raw.replace(/^"|"$/g, "");
  });

  return NextResponse.json({ settings: map });
}

export async function PATCH(request: NextRequest) {
  const { error, supabase } = await requireAdmin("settings:manage");
  if (error) return error;

  const body: Record<string, string> = await request.json();

  const upserts = Object.entries(body).map(([key, value]) => ({
    key,
    value: JSON.stringify(value),
    scope: "global",
    is_public: key.startsWith("store.") || key.startsWith("shipping."),
  }));

  const { error: dbErr } = await supabase
    .from("settings")
    .upsert(upserts, { onConflict: "key" });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true, updated: upserts.length });
}
