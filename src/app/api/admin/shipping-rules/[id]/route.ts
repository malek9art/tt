import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json() as {
    fee?: number;
    is_active?: boolean;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.fee       !== undefined) patch.fee       = body.fee;
  if (body.is_active !== undefined) patch.is_active = body.is_active;

  const { data, error } = await sb()
    .from("shipping_rules")
    .update(patch)
    .eq("id", id)
    .select("id, governorate, category_id, fee, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const { error } = await sb().from("shipping_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
