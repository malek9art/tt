import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyLowStock, notifyOutOfStock } from "@/lib/notifications";

interface ImportRow {
  sku:      string;
  quantity: number;
  location: string;
  reorder_level:    number;
  reorder_quantity: number;
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  // Detect header row and find column indices
  const header = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const idx = {
    sku:             header.findIndex(h => /sku/i.test(h)),
    quantity:        header.findIndex(h => /كمية|quantity/i.test(h) && !/محجوز|reserved|طلب|reorder/i.test(h)),
    location:        header.findIndex(h => /موقع|location/i.test(h)),
    reorder_level:   header.findIndex(h => /حد.*طلب|reorder.level/i.test(h)),
    reorder_quantity:header.findIndex(h => /كمية.*طلب|reorder.quantity/i.test(h)),
  };

  if (idx.sku === -1 || idx.quantity === -1) return [];

  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.replace(/"/g, "").trim());
    return {
      sku:             cols[idx.sku]             ?? "",
      quantity:        Number(cols[idx.quantity] ?? 0),
      location:        idx.location   >= 0 ? (cols[idx.location]   ?? "") : "",
      reorder_level:   idx.reorder_level   >= 0 ? Number(cols[idx.reorder_level]   ?? 0) : 0,
      reorder_quantity:idx.reorder_quantity >= 0 ? Number(cols[idx.reorder_quantity] ?? 0) : 0,
    };
  }).filter(r => r.sku);
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin("inventory:manage");
  if (error) return error;

  const formData  = await request.formData();
  const file      = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يُرفع ملف" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (!rows.length) return NextResponse.json({ error: "الملف فارغ أو تنسيق غير صحيح. تأكد من وجود عمود SKU وعمود الكمية" }, { status: 400 });

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Find inventory by SKU (via product_variants)
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id, products(name_ar)")
      .eq("sku", row.sku)
      .maybeSingle();

    let variantId: string | null = variant?.id ?? null;
    let prodName = "";
    if (variant) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prod = Array.isArray(variant.products) ? variant.products[0] : variant.products as any;
      prodName = prod?.name_ar ?? row.sku;
    } else {
      // SKU على مستوى المنتج — نصل لمتغيّره الافتراضي
      const { data: product } = await supabase
        .from("products")
        .select("id, name_ar, product_variants(id)")
        .eq("sku", row.sku)
        .maybeSingle();
      if (!product) { skipped++; errors.push(row.sku); continue; }
      const pvs = (product.product_variants as { id: string }[]) ?? [];
      if (pvs.length === 0) { skipped++; errors.push(row.sku); continue; }
      variantId = pvs[0].id;
      prodName  = product.name_ar;
    }

    const { data: inv } = await supabase
      .from("inventory")
      .select("id, quantity, reorder_level")
      .eq("variant_id", variantId)
      .maybeSingle();

    if (!inv) { skipped++; errors.push(row.sku); continue; }

    const updateData: Record<string, unknown> = { quantity: row.quantity };
    if (row.location)         updateData.location = row.location;
    if (row.reorder_level)    updateData.reorder_level = row.reorder_level;
    if (row.reorder_quantity) updateData.reorder_quantity = row.reorder_quantity;

    await supabase.from("inventory").update(updateData).eq("id", inv.id);
    updated++;

    // قيد حركة تعديل بالاستيراد إن تغيّرت الكمية
    if (Number(inv.quantity) !== row.quantity) {
      await supabase.from("inventory_movements").insert({
        variant_id:      variantId,
        product_name:    prodName,
        movement_type:   "adjust",
        quantity:        Math.abs(row.quantity - Number(inv.quantity)),
        quantity_before: Number(inv.quantity),
        quantity_after:  row.quantity,
        reason:          "استيراد ملف CSV",
        reference_type:  "import",
      });
    }

    if (row.quantity === 0) await notifyOutOfStock(prodName);
    else if (row.quantity <= (row.reorder_level || inv.reorder_level)) {
      await notifyLowStock(prodName, row.quantity, inv.id);
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    skipped,
    errors: errors.slice(0, 10),
    message: `تم تحديث ${updated} صنف، تجاوز ${skipped} صنف`,
  });
}
