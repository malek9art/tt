import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createProductWithInventory } from "@/lib/admin/create-product";

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Number(searchParams.get("page")   ?? 1);
  const limit  = Number(searchParams.get("limit")  ?? 20);
  const status = searchParams.get("status");
  const search = searchParams.get("q");
  const from   = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(`
      id, sku, name_ar, slug, status, base_price, currency,
      is_featured, created_at, updated_at,
      categories(name_ar), brands(name),
      product_images(url, is_primary),
      product_variants(id, price, is_active)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("name_ar", `%${search}%`);

  const { data, count, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ products: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("products:manage");
  if (error) return error;

  const body = await request.json();

  // منطق موحّد: منتج + متغيّر افتراضي + سجل مخزون — نفس مسار الإضافة السريعة
  const result = await createProductWithInventory(supabase, user!.id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ id: result.product_id, slug: result.slug, sku: result.sku }, { status: 201 });
}
