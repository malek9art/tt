import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildCsv } from "@/lib/admin/csv";
import { CSV_HEADERS, productToRow, type JoinedProductForExport } from "@/lib/admin/product-csv";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(p: any): JoinedProductForExport {
  const cat  = Array.isArray(p.categories) ? p.categories[0] : p.categories;
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
  const variants = (p.product_variants as Array<{ sku: string|null; compare_at_price: number|null; inventory: unknown }>) ?? [];
  const variant = variants[0];
  const invRaw = variant?.inventory as { quantity:number; reorder_level:number; reorder_quantity:number; location:string|null }[] | { quantity:number; reorder_level:number; reorder_quantity:number; location:string|null } | null;
  const inv = Array.isArray(invRaw) ? invRaw[0] : invRaw;

  return {
    name_ar: p.name_ar, name_en: p.name_en, description: p.description,
    base_price: Number(p.base_price), condition: p.condition, status: p.status, type: p.type,
    warranty: p.warranty, tags: p.tags,
    category_name: cat?.name_ar ?? null, brand_name: brand?.name ?? null,
    variant_sku: variant?.sku ?? null, compare_at_price: variant?.compare_at_price ?? null,
    quantity: inv?.quantity ?? null, reorder_level: inv?.reorder_level ?? null,
    reorder_quantity: inv?.reorder_quantity ?? null, location: inv?.location ?? null,
  };
}

// GET — تصدير كامل لكل المنتجات بكل حقولها (السعر، الفئة، الوصف، المخزون...)
// بنفس تنسيق الاستيراد تماماً، فيصلح كنسخة احتياطية أو كملف تعديل جماعي يُعاد رفعه
export async function GET() {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("products")
    .select(`
      name_ar, name_en, description, base_price, condition, status, type, warranty, tags,
      categories(name_ar), brands(name),
      product_variants(sku, compare_at_price, inventory(quantity, reorder_level, reorder_quantity, location))
    `)
    .order("created_at", { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const rows = (data ?? []).map(p => productToRow(toRow(p)));
  const csv  = buildCsv([...CSV_HEADERS], rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
