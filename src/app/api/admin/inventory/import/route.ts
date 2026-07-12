import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/admin-auth";
import { parseCsv } from "@/lib/admin/csv";
import { buildHeaderIndex, rowToProduct } from "@/lib/admin/product-csv";
import { runInventoryImport } from "@/lib/admin/inventory-import";

// يقرأ أول ورقة عمل من ملف xlsx إلى مصفوفة صفوف نصية — بنفس شكل مخرجات parseCsv
async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(Buffer.from(buffer) as any);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, row => {
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, cell => {
      const v = cell.value;
      cols.push(v === null || v === undefined ? "" : String(v).trim());
    });
    rows.push(cols);
  });
  return rows;
}

// POST — استيراد شامل من CSV/XLSX: يُحدّث المنتجات الموجودة (بمطابقة رقم
// الصنف/SKU) بكل حقولها (السعر، الفئة، الوصف، مخزون كل مخزن...) وليس
// الكمية فقط، وينشئ منتجات جديدة كاملة للصفوف التي لا يوجد لها SKU مطابق.
export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("products:manage");
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "لم يُرفع ملف" }, { status: 400 });

  const isXlsx = file.name.toLowerCase().endsWith(".xlsx")
    || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const table = isXlsx ? await parseXlsx(await file.arrayBuffer()) : parseCsv(await file.text());
  if (table.length < 2) {
    return NextResponse.json({ error: "الملف فارغ أو تنسيق غير صحيح" }, { status: 400 });
  }

  const idx = buildHeaderIndex(table[0]);
  if (idx.name_ar === undefined && idx.sku === undefined) {
    return NextResponse.json({ error: "لم يُعثر على عمود اسم المنتج أو رقم الصنف (SKU) في الملف" }, { status: 400 });
  }
  const dataRows = table.slice(1).filter(r => r.some(c => c.trim()));
  const parsedRows = dataRows.map(cols => rowToProduct(cols, idx));

  const { created, updated, skipped, errors } = await runInventoryImport(
    supabase, user!.id, parsedRows, { respectStatusColumn: idx.status !== undefined },
  );

  return NextResponse.json({
    success: true,
    created, updated, skipped,
    errors: errors.slice(0, 15),
    message: `أُنشئ ${created} منتج جديد، وحُدّث ${updated} منتج${skipped ? `، تخطٍّ ${skipped}` : ""}`,
  });
}
