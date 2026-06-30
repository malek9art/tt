import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error, supabase } = await requireAdmin("marketing:read");
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ banners: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, supabase } = await requireAdmin("marketing:manage");
  if (error) return error;

  const body = await req.json();
  const { title, subtitle, image_url, link_url, link_label, badge_text, sort_order, is_active, starts_at, ends_at } = body;

  if (!title?.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  if (!image_url?.trim()) return NextResponse.json({ error: "رابط الصورة مطلوب" }, { status: 400 });

  const { data, error: dbErr } = await supabase
    .from("banners")
    .insert({
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      image_url: image_url.trim(),
      link_url: link_url?.trim() || null,
      link_label: link_label?.trim() || null,
      badge_text: badge_text?.trim() || null,
      sort_order: Number(sort_order) || 0,
      is_active: is_active !== false,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
