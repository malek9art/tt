import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createProductWithInventory, type CreateProductInput } from "@/lib/admin/create-product";

// POST — إضافة منتج سريعة من شاشة المخزون
// يستخدم نفس المنطق الموحّد لمسار «إضافة منتج جديد»:
// منتج + متغيّر افتراضي + سجل مخزون في خطوة واحدة
export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("products:manage");
  if (error) return error;

  const body = await request.json() as CreateProductInput;

  const result = await createProductWithInventory(supabase, user!.id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    success: true,
    product_id: result.product_id,
    variant_id: result.variant_id,
    sku: result.sku,
    slug: result.slug,
  }, { status: 201 });
}
