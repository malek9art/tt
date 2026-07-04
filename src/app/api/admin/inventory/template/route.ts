import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildCsv } from "@/lib/admin/csv";
import { CSV_HEADERS } from "@/lib/admin/product-csv";

// GET — قالب استيراد جاهز: صفّان مثاليان (منتج مادي وخدمة) يوضّحان كل الأعمدة
// المطلوبة لإنشاء منتج جديد كامل (السعر، الفئة، الوصف...)، إضافةً لصف بلا SKU
// كمثال إضافة، وتعليق يوضّح أن ترك SKU فارغاً يُنشئ منتجاً جديداً بينما وضع
// SKU لمنتج موجود يُحدّثه بدل تكراره.
export async function GET() {
  const { error } = await requireAdmin("products:read");
  if (error) return error;

  const rows = [
    // مثال منتج مادي جديد (SKU فارغ → يُنشأ منتج جديد ويُولَّد SKU تلقائياً)
    ["هاتف سامسونج A15 128GB", "Samsung Galaxy A15", "", "هاتف ذكي بشاشة 6.5 بوصة وبطارية 5000mAh",
     "الهواتف الذكية", "Samsung", 95000, 105000, "جديد", "منشور", "منتج مادي", "سنة واحدة",
     "هواتف؛ الأكثر مبيعاً", 15, 5, 20, "المخزن الرئيسي"],
    // مثال خدمة صيانة
    ["خدمة تغيير الشاشة", "Screen Replacement", "", "تغيير شاشة مكسورة بقطعة أصلية مع ضمان",
     "خدمات الصيانة", "", 15000, "", "جديد", "منشور", "خدمة", "3 أشهر على الصيانة",
     "صيانة", 999, 0, 0, ""],
    // مثال تحديث منتج موجود — ضع SKU حقيقي موجود بالفعل ليُحدَّث بدل الإنشاء
    ["", "", "SKU-موجود-فعلياً", "", "", "", "", "", "", "", "", "", "", 10, "", "", ""],
  ];

  const csv = buildCsv([...CSV_HEADERS], rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-import-template.csv"`,
    },
  });
}
