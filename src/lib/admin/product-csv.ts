// تعريف موحّد لأعمدة استيراد/تصدير/قالب المنتجات — يستخدمه template وexport وimport
// معاً حتى يبقى الحقل نفسه بنفس الترتيب والتسمية في الاتجاهين، ويطابق نفس
// الحقول التي يلتقطها نموذج "إضافة منتج جديد" ونافذة "الإضافة السريعة".
import { splitList, joinList } from "./csv";

export const CSV_HEADERS = [
  "اسم المنتج",
  "الاسم الإنجليزي",
  "SKU",
  "الوصف",
  "الفئة",
  "العلامة التجارية",
  "السعر",
  "السعر قبل الخصم",
  "الحالة",
  "حالة النشر",
  "النوع",
  "الضمان",
  "الوسوم",
  "الكمية",
  "حد إعادة الطلب",
  "كمية إعادة الطلب",
  "الموقع",
] as const;

export const CONDITION_LABELS: Record<string, string> = { new: "جديد", used_certified: "مستعمل مضمون" };
export const STATUS_LABELS:    Record<string, string> = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };
export const TYPE_LABELS:      Record<string, string> = { physical: "منتج مادي", service: "خدمة" };

function reverseMap(map: Record<string,string>): Record<string,string> {
  const out: Record<string,string> = {};
  for (const [k,v] of Object.entries(map)) out[v.trim()] = k;
  return out;
}
const CONDITION_BY_LABEL = reverseMap(CONDITION_LABELS);
const STATUS_BY_LABEL    = reverseMap(STATUS_LABELS);
const TYPE_BY_LABEL      = reverseMap(TYPE_LABELS);

export function labelToCondition(label: string): "new" | "used_certified" {
  return (CONDITION_BY_LABEL[label.trim()] as "new"|"used_certified") ?? "new";
}
export function labelToStatus(label: string): "draft" | "published" | "archived" {
  return (STATUS_BY_LABEL[label.trim()] as "draft"|"published"|"archived") ?? "published";
}
export function labelToType(label: string): "physical" | "service" {
  return (TYPE_BY_LABEL[label.trim()] as "physical"|"service") ?? "physical";
}

// مطابقة اسم الفئة/الماركة من ملف CSV — بلا حساسية لحالة الأحرف أو الفراغات الزائدة،
// وتقبل أيضاً الـslug للفئة (وليس فقط الاسم العربي)
export function resolveCategoryId(
  raw: string,
  categories: { id: string; name_ar: string; slug: string }[],
): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  const hit = categories.find(c =>
    c.name_ar.trim().toLowerCase() === needle || c.slug.trim().toLowerCase() === needle
  );
  return hit?.id ?? null;
}

export function resolveBrandId(
  raw: string,
  brands: { id: string; name: string }[],
): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  const hit = brands.find(b => b.name.trim().toLowerCase() === needle);
  return hit?.id ?? null;
}

export interface ParsedProductRow {
  name_ar: string;
  name_en: string;
  sku: string;
  description: string;
  category_name: string;
  brand_name: string;
  base_price: number;
  compare_at_price: number | null;
  condition: "new" | "used_certified";
  status: "draft" | "published" | "archived";
  type: "physical" | "service";
  warranty: string;
  tags: string[];
  quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  location: string;
}

// يبني خريطة اسم عمود → فهرس، بمطابقة مرنة (تجاهل اختلاف بسيط بالمسافات/الحالة)
// حتى يبقى الاستيراد يعمل إن عدّل المدير ترتيب الأعمدة أو حذف بعضها
export function buildHeaderIndex(headerRow: string[]): Record<string, number> {
  const norm = (s: string) => s.trim().toLowerCase();
  const idx: Record<string, number> = {};
  const patterns: Record<string, RegExp> = {
    name_ar:          /^اسم المنتج$|^name$/i,
    name_en:          /الاسم الإنجليزي|name_en|english/i,
    sku:              /^sku$/i,
    description:      /الوصف|description/i,
    category_name:    /الفئة|category/i,
    brand_name:       /العلامة|الماركة|brand/i,
    base_price:       /^السعر$|^price$|base_price/i,
    compare_at_price: /السعر قبل الخصم|compare/i,
    condition:        /^الحالة$|condition/i,
    status:           /حالة النشر|status/i,
    type:             /^النوع$|^type$/i,
    warranty:         /الضمان|warranty/i,
    tags:             /الوسوم|tags/i,
    quantity:         /^الكمية$|^quantity$/i,
    reorder_level:    /حد.*طلب|reorder.level/i,
    reorder_quantity: /كمية.*طلب|reorder.quantity/i,
    location:         /الموقع|location/i,
  };
  headerRow.forEach((h, i) => {
    const cell = norm(h);
    for (const [key, re] of Object.entries(patterns)) {
      if (idx[key] === undefined && re.test(cell)) idx[key] = i;
    }
  });
  return idx;
}

// شكل المنتج بعد ضمّ الفئة/الماركة/المتغيّر الافتراضي/المخزون — يستخدمه
// template وexport لبناء صف CSV بنفس ترتيب CSV_HEADERS بالضبط
export interface JoinedProductForExport {
  name_ar: string;
  name_en: string | null;
  description: string | null;
  base_price: number;
  condition: string;
  status: string;
  type: string;
  warranty: string | null;
  tags: string[] | null;
  category_name: string | null;
  brand_name: string | null;
  variant_sku: string | null;
  compare_at_price: number | null;
  quantity: number | null;
  reorder_level: number | null;
  reorder_quantity: number | null;
  location: string | null;
}

export function productToRow(p: JoinedProductForExport): unknown[] {
  return [
    p.name_ar,
    p.name_en ?? "",
    p.variant_sku ?? "",
    p.description ?? "",
    p.category_name ?? "",
    p.brand_name ?? "",
    p.base_price,
    p.compare_at_price ?? "",
    CONDITION_LABELS[p.condition] ?? p.condition,
    STATUS_LABELS[p.status] ?? p.status,
    TYPE_LABELS[p.type] ?? p.type,
    p.warranty ?? "",
    joinList(p.tags),
    p.quantity ?? 0,
    p.reorder_level ?? 5,
    p.reorder_quantity ?? 0,
    p.location ?? "",
  ];
}

export function rowToProduct(cols: string[], idx: Record<string, number>): ParsedProductRow {
  const get = (key: string) => (idx[key] !== undefined ? (cols[idx[key]] ?? "").trim() : "");
  return {
    name_ar:          get("name_ar"),
    name_en:          get("name_en"),
    sku:              get("sku"),
    description:      get("description"),
    category_name:    get("category_name"),
    brand_name:       get("brand_name"),
    base_price:       Number(get("base_price").replace(/[^\d.]/g, "")) || 0,
    compare_at_price: get("compare_at_price") ? (Number(get("compare_at_price").replace(/[^\d.]/g, "")) || null) : null,
    condition:        labelToCondition(get("condition")),
    status:           labelToStatus(get("status")),
    type:             labelToType(get("type")),
    warranty:         get("warranty"),
    tags:             splitList(get("tags")),
    quantity:         Number(get("quantity")) || 0,
    reorder_level:    Number(get("reorder_level")) || 5,
    reorder_quantity: Number(get("reorder_quantity")) || 0,
    location:         get("location"),
  };
}
