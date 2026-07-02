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

// PATCH /api/admin/settings/payment-providers/[id]
// Body: { config?: Record<string, string>, is_active?: boolean, is_test_mode?: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json() as {
    config?: Record<string, string>;
    is_active?: boolean;
    is_test_mode?: boolean;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.config       !== undefined) patch.config       = body.config;
  if (body.is_active    !== undefined) patch.is_active    = body.is_active;
  if (body.is_test_mode !== undefined) patch.is_test_mode = body.is_test_mode;

  const { data, error } = await sb()
    .from("payment_providers")
    .update(patch)
    .eq("id", id)
    .select("id, code, name, is_active, is_test_mode, config, metadata")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
