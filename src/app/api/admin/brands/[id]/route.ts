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
  const auth = await requireAdmin("products:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    slug?: string;
    logo_url?: string;
    sort_order?: number;
    is_active?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if (body.name       !== undefined) patch.name       = body.name.trim();
  if (body.slug       !== undefined) patch.slug       = body.slug.trim();
  if (body.logo_url   !== undefined) patch.logo_url   = body.logo_url || null;
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
  if (body.is_active  !== undefined) patch.is_active  = body.is_active;

  const { data, error } = await sb()
    .from("brands")
    .update(patch)
    .eq("id", id)
    .select("id, name, slug, logo_url, sort_order, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// حذف ناعم فقط (is_active=false) — لحفظ سلامة الإحالة للمنتجات المرتبطة
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("products:manage");
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data, error } = await sb()
    .from("brands")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ success: true });
}
