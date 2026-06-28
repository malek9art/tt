import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

interface ImagePayload {
  url:        string;
  path:       string;
  is_primary: boolean;
  alt_ar:     string;
  sort_order: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin("products:manage");
  if (error) return error;

  const { id }    = await params;
  const images: ImagePayload[] = await request.json();

  // حذف الصور القديمة من DB (Storage محذوف من الواجهة)
  await supabase.from("product_images").delete().eq("product_id", id);

  if (!images.length) return NextResponse.json({ success: true });

  // إدراج الجديدة
  const rows = images.map((img, i) => ({
    product_id: id,
    url:        img.url,
    alt_ar:     img.alt_ar || null,
    is_primary: img.is_primary,
    sort_order: i,
  }));

  const { error: dbErr } = await supabase.from("product_images").insert(rows);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true, count: rows.length });
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { id } = await params;
  const { data } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  return NextResponse.json(data ?? []);
}
