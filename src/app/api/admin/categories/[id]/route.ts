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

// PATCH /api/admin/categories/[id]
// Body: any subset of category fields, including is_active (soft delete/restore toggle)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("products:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json() as {
    name_ar?: string;
    name_en?: string;
    slug?: string;
    description?: string;
    image_url?: string;
    icon?: string;
    parent_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
  };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name_ar     !== undefined) patch.name_ar     = body.name_ar.trim();
  if (body.name_en     !== undefined) patch.name_en     = body.name_en?.trim() || null;
  if (body.slug        !== undefined) patch.slug        = body.slug.trim();
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.image_url   !== undefined) patch.image_url   = body.image_url || null;
  if (body.icon        !== undefined) patch.icon        = body.icon || null;
  if (body.parent_id   !== undefined) patch.parent_id   = body.parent_id || null;
  if (body.sort_order  !== undefined) patch.sort_order  = body.sort_order;
  if (body.is_active   !== undefined) patch.is_active   = body.is_active;

  const { data, error } = await sb()
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select("id, parent_id, name_ar, name_en, slug, description, image_url, icon, sort_order, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — soft delete only (is_active=false), preserves referential integrity
// for existing products/orders that still reference this category.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("products:manage");
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data, error } = await sb()
    .from("categories")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ success: true });
}
