import { createClient } from "@supabase/supabase-js";

// رسوم الشحن الافتراضية عند عدم وجود أي قاعدة مطابقة (محافظة/فئة) —
// نفس القيمة الثابتة المستخدمة سابقاً قبل إضافة shipping_rules، كقيمة
// احتياطية أخيرة فقط.
const DEFAULT_FEE = 2000;

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * يحسب رسم الشحن النهائي لطلب: لكل فئة منتج موجودة في السلة، نطابق أولاً
 * قاعدة (محافظة + فئة) محدَّدة، ثم قاعدة (محافظة + كل الفئات)، ثم القيمة
 * الافتراضية الثابتة. الرسم الإجمالي = الأعلى بين القواعد المطابقة لعناصر
 * السلة (وليس مجموعها) — قرار مقصود لتفادي مضاعفة الشحن لسلة بفئات متعددة.
 */
export async function resolveShippingFee(
  governorate: string,
  categoryIds: Array<string | null>,
): Promise<number> {
  const { data: rules } = await svc()
    .from("shipping_rules")
    .select("category_id, fee")
    .eq("governorate", governorate)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return DEFAULT_FEE;

  const byCategory = new Map<string, number>();
  let catchAll: number | null = null;
  for (const r of rules) {
    if (r.category_id) byCategory.set(r.category_id, r.fee);
    else catchAll = r.fee;
  }

  const uniqueCategoryIds = Array.from(new Set(categoryIds));
  const fees = uniqueCategoryIds.map(catId => {
    if (catId && byCategory.has(catId)) return byCategory.get(catId)!;
    if (catchAll !== null) return catchAll;
    return DEFAULT_FEE;
  });

  return Math.max(...fees);
}
