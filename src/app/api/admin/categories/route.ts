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

function slugify(ar: string): string {
  return ar.trim().replace(/\s+/g, "-").replace(/[^\w؀-ۿ-]/g, "").toLowerCase()
    + "-" + Math.random().toString(36).slice(2, 6);
}

export async function GET() {
  const auth = await requireAdmin("products:read");
  if (auth.error) return auth.error;

  const { data, error } = await sb()
    .from("categories")
    .select("id, parent_id, name_ar, name_en, slug, description, image_url, icon, sort_order, is_active")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin("products:manage");
  if (auth.error) return auth.error;

  const body = await request.json() as {
    name_ar?: string;
    name_en?: string;
    slug?: string;
    description?: string;
    image_url?: string;
    icon?: string;
    parent_id?: string | null;
    sort_order?: number;
  };

  const nameAr = body.name_ar?.trim();
  if (!nameAr) return NextResponse.json({ error: "اسم الفئة مطلوب" }, { status: 400 });

  const { data, error } = await sb()
    .from("categories")
    .insert({
      name_ar:     nameAr,
      name_en:     body.name_en?.trim() || null,
      slug:        body.slug?.trim() || slugify(nameAr),
      description: body.description?.trim() || null,
      image_url:   body.image_url || null,
      icon:        body.icon || null,
      parent_id:   body.parent_id || null,
      sort_order:  body.sort_order ?? 0,
    })
    .select("id, parent_id, name_ar, name_en, slug, description, image_url, icon, sort_order, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
