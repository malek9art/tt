import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildSlug } from "@/lib/slug";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;
  const { id } = await params;

  const { data, error: dbErr } = await supabase
    .from("products")
    .select(`*, categories(*), brands(*), product_images(*), product_variants(*)`)
    .eq("id", id).single();

  if (dbErr) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("products:manage");
  if (error) return error;
  const { id } = await params;
  const body   = await request.json();

  // لا نسمح بمسح الـ slug — إن أُرسل فارغاً نولّد واحداً صالحاً
  if ("slug" in body) {
    body.slug = buildSlug(body);
  }

  const { data, error: dbErr } = await supabase
    .from("products").update(body).eq("id", id).select("id").single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("products:delete");
  if (error) return error;
  const { id } = await params;

  const { error: dbErr } = await supabase.from("products").delete().eq("id", id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
