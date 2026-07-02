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

// DELETE — only custom providers (metadata.custom = true) can be removed
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("settings:manage");
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: p } = await sb()
    .from("payment_providers")
    .select("id, metadata")
    .eq("id", id)
    .single();

  if (!p) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  if (!meta.custom) {
    return NextResponse.json({ error: "لا يمكن حذف الوسائل الأساسية — يمكنك تعطيلها فقط" }, { status: 400 });
  }

  const { error } = await sb().from("payment_providers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH /api/admin/settings/payment-providers/[id]
// Body: { config?, is_active?, is_test_mode?, name_ar?, description?, logo_url? }
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
    name_ar?: string;
    description?: string;
    logo_url?: string;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.config       !== undefined) patch.config       = body.config;
  if (body.is_active    !== undefined) patch.is_active    = body.is_active;
  if (body.is_test_mode !== undefined) patch.is_test_mode = body.is_test_mode;

  // Metadata fields require read-merge-write to keep other keys intact
  if (body.name_ar !== undefined || body.description !== undefined || body.logo_url !== undefined) {
    const { data: cur } = await sb()
      .from("payment_providers")
      .select("metadata")
      .eq("id", id)
      .single();
    const meta = { ...((cur?.metadata ?? {}) as Record<string, unknown>) };
    if (body.name_ar     !== undefined) meta.name_ar     = body.name_ar;
    if (body.description !== undefined) meta.description = body.description;
    if (body.logo_url    !== undefined) meta.logo_url    = body.logo_url;
    patch.metadata = meta;
    if (body.name_ar) patch.name = body.name_ar;
  }

  const { data, error } = await sb()
    .from("payment_providers")
    .update(patch)
    .eq("id", id)
    .select("id, code, name, is_active, is_test_mode, config, metadata")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
