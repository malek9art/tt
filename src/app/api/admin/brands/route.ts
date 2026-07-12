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

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, "-").replace(/[^\w؀-ۿ-]/g, "").toLowerCase()
    + "-" + Math.random().toString(36).slice(2, 6);
}

export async function GET() {
  const auth = await requireAdmin("products:read");
  if (auth.error) return auth.error;

  const { data, error } = await sb()
    .from("brands")
    .select("id, name, slug, logo_url, sort_order, is_active")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brands: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin("products:manage");
  if (auth.error) return auth.error;

  const body = await request.json() as {
    name?: string;
    slug?: string;
    logo_url?: string;
    sort_order?: number;
  };

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "اسم العلامة التجارية مطلوب" }, { status: 400 });

  const { data, error } = await sb()
    .from("brands")
    .insert({
      name,
      slug:       body.slug?.trim() || slugify(name),
      logo_url:   body.logo_url || null,
      sort_order: body.sort_order ?? 0,
    })
    .select("id, name, slug, logo_url, sort_order, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
