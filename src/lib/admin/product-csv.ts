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

// قيم شائعة تعني "لا يوجد" فعلياً في كشوف المخزون الواقعية (عمود الماركة
// غالباً "بدون" حرفياً) — تُعامَل كحقل فارغ لا كاسم فئة/ماركة حقيقي يجب
// البحث عنه (وإلا ظهرت رسالة خطأ زائفة "فئة غير معروفة: بدون" لكل صف)
const EMPTY_SENTINELS = new Set(["بدون", "لا يوجد", "-", "--", "غير محدد", "n/a", "na"]);

function isEmptyValue(raw: string): boolean {
  const needle = raw.trim().toLowerCase();
  return !needle || EMPTY_SENTINELS.has(needle);
}

// مطابقة اسم الفئة/الماركة من ملف CSV — بلا حساسية لحالة الأحرف أو الفراغات الزائدة،
// وتقبل أيضاً الـslug للفئة (وليس فقط الاسم العربي)
export function resolveCategoryId(
  raw: string,
  categories: { id: string; name_ar: string; slug: string }[],
): string | null {
  if (isEmptyValue(raw)) return null;
  const needle = raw.trim().toLowerCase();
  const hit = categories.find(c =>
    c.name_ar.trim().toLowerCase() === needle || c.slug.trim().toLowerCase() === needle
  );
  return hit?.id ?? null;
}

export function resolveBrandId(
  raw: string,
  brands: { id: string; name: string }[],
): string | null {
  if (isEmptyValue(raw)) return null;
  const needle = raw.trim().toLowerCase();
  const hit = brands.find(b => b.name.trim().toLowerCase() === needle);
  return hit?.id ?? null;
}

// اسم مخزن من كشف المخزون — تطابق تام أولاً ثم احتواء جزئي (كي لا يفشل
// التطابق لاختلاف بسيط مثل "المخزن الرئيسي" مقابل "المخزن الرئيسي — تعز")
export function resolveWarehouseId(
  raw: string,
  warehouses: { id: string; name: string }[],
): string | null {
  if (isEmptyValue(raw)) return null;
  const needle = raw.trim().toLowerCase();
  const exact = warehouses.find(w => w.name.trim().toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = warehouses.find(w => {
    const n = w.name.trim().toLowerCase();
    return n.includes(needle) || needle.includes(n);
  });
  return partial?.id ?? null;
}

// ── استدلال احتياطي عند غياب الفئة/الماركة صراحة في الملف ───────────
// خاص بترقيم "رقم الصنف" الداخلي لمخزون مركز الأحمدي (بادئتا رقمين) —
// يحتاج تحديثاً يدوياً إن اعتمد المتجر مخططاً جديداً للترقيم مستقبلاً.
// المفتاح = slug فئة موجودة (تُنشأ مسبقاً عبر صفحة إدارة الفئات).
export const SKU_PREFIX_CATEGORY_SLUG: Record<string, string> = {
  "11": "smartphones",     // جوالات (والأجهزة اللوحية تُستثنى بالكلمات المفتاحية أدناه)
  "12": "accessories",     // إكسسوارات عامة (الشواحن/الكابلات تُستثنى لصالح "chargers" بالكلمات المفتاحية)
  "13": "memory-flash",    // ذاكرة وفلاشات
  "14": "spare-parts",     // شاشات (قطع غيار)
  "15": "surveillance-cameras", // كاميرات مراقبة
  "16": "accessories",     // مودمات/أجهزة شبكات — عدد قليل جداً، تُطوى ضمن الإكسسوارات
  "17": "shavers",         // مكينات حلاقة
  "18": "power-banks",     // باور بانك
  "20": "spare-parts",     // بطاريات (قطع غيار)
  "21": "sim-cards",       // شرائح اتصال
};

// كلمات مفتاحية بالاسم تُعيد التصنيف إلى فئة أدق من فئة البادئة الافتراضية
const CATEGORY_KEYWORD_OVERRIDES: Array<{ re: RegExp; slug: string }> = [
  { re: /ايباد|آيباد|تاب(?!لت.?خارجي)|ipad/i, slug: "tablets" },
  { re: /شاحن|شواحن|توصيل|كابل|راس سيار[ةه]|type-?c|type c/i, slug: "chargers" },
];

export function inferCategoryId(
  sku: string,
  nameAr: string,
  categories: { id: string; slug: string }[],
): string | null {
  const prefix = sku.trim().slice(0, 2);
  let slug = SKU_PREFIX_CATEGORY_SLUG[prefix];
  if (!slug) return null;
  for (const { re, slug: overrideSlug } of CATEGORY_KEYWORD_OVERRIDES) {
    if (re.test(nameAr)) { slug = overrideSlug; break; }
  }
  return categories.find(c => c.slug === slug)?.id ?? null;
}

// قاموس كلمات مفتاحية بالاسم ← اسم علامة تجارية (يُطابَق مقابل brands.name
// الفعلية بقاعدة البيانات، فحساسية الأحرف/المسافات تُعالَج في resolveBrandId)
const BRAND_KEYWORDS: Array<{ re: RegExp; name: string }> = [
  { re: /ايفون|آيفون|iphone/i,                         name: "Apple" },
  { re: /سامسنج|سامسونج|جلاكسي|جالكسي|galaxy|samsung/i, name: "Samsung" },
  { re: /ردمي|ريدمي|شاومي|redmi|xiaomi/i,               name: "Xiaomi" },
  { re: /هواوي|huawei|honor|هونر/i,                     name: "Huawei" },
  { re: /نوكيا|nokia/i,                                 name: "Nokia" },
  { re: /تكنو|tecno/i,                                  name: "Tecno" },
  { re: /اوبو|oppo/i,                                   name: "OPPO" },
  { re: /فيفو|vivo/i,                                   name: "Vivo" },
  { re: /ريلمي|realme/i,                                name: "Realme" },
  { re: /وان بلس|oneplus/i,                             name: "OnePlus" },
  { re: /مترولا|موتورولا|motorola/i,                    name: "Motorola" },
  { re: /ايتل|itel/i,                                   name: "itel" },
  { re: /ال ?جي|lg\b/i,                                 name: "LG" },
  { re: /\bبلو\b|\bblu\b/i,                              name: "BLU" },
  { re: /الكاتل|alcatel/i,                              name: "Alcatel" },
  { re: /ويكو|wiko/i,                                   name: "Wiko" },
  { re: /تراك ?فون|trackfone/i,                         name: "TrackFone" },
  { re: /ال ?تي\b|^lt\b/i,                              name: "LT" },
];

export function inferBrandId(
  nameAr: string,
  brands: { id: string; name: string }[],
): string | null {
  for (const { re, name } of BRAND_KEYWORDS) {
    if (re.test(nameAr)) {
      const hit = brands.find(b => b.name.trim().toLowerCase() === name.toLowerCase());
      if (hit) return hit.id;
    }
  }
  return null;
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
  // حقول إضافية تظهر في كشوف مخزون واقعية (كشف المخزون بالمخازن) — لا
  // مكافئ مباشر لها بالتنسيق القديم، فتبقى فارغة إن لم يوجد العمود
  warehouse_name: string;
  model_number: string;
}

// يبني خريطة اسم عمود → فهرس، بمطابقة مرنة (تجاهل اختلاف بسيط بالمسافات/الحالة)
// حتى يبقى الاستيراد يعمل إن عدّل المدير ترتيب الأعمدة أو حذف بعضها
export function buildHeaderIndex(headerRow: string[]): Record<string, number> {
  const norm = (s: string) => s.trim().toLowerCase();
  const idx: Record<string, number> = {};
  const patterns: Record<string, RegExp> = {
    // "الصنف"/"اسم الصنف" شائعة في كشوف المخزون الواقعية بجانب "اسم المنتج" الأصلية
    name_ar:          /^اسم المنتج$|^name$|^الصنف$|اسم الصنف/i,
    // "الاسم الاجنبي" (بلا همزة، شكل شائع بكشوف المخزون) بجانب "الاسم الإنجليزي" الأصلية
    name_en:          /الاسم الإنجليزي|الاسم الاجنبي|الاسم الأجنبي|name_en|english/i,
    // "رقم الصنف" هو المعرّف الفريد (SKU) في كشوف المخزون الواقعية
    sku:              /^sku$|رقم الصنف/i,
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
    // "الكمية المتوفرة" شائعة بكشوف المخزون الواقعية بجانب "الكمية" الأصلية
    quantity:         /^الكمية$|الكمية المتوفرة|^quantity$/i,
    reorder_level:    /حد.*طلب|reorder.level/i,
    reorder_quantity: /كمية.*طلب|reorder.quantity/i,
    location:         /الموقع|location/i,
    // حقول كشف المخزون الواقعي فقط — لا مكافئ لها بالتنسيق القديم
    warehouse_name:   /^المخزن$|warehouse/i,
    model_number:     /رقم الموديل|model.number/i,
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
    warehouse_name:   get("warehouse_name"),
    model_number:     get("model_number"),
  };
}
