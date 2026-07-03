// ضمانة خادم: slug صالح دائماً حتى لو أرسل العميل قيمة فارغة
export function buildSlug(input: {
  slug?: string;
  name_en?: string | null;
  name_ar?: string | null;
  sku?: string | null;
}): string {
  const clean = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w؀-ۿ-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const fromInput = input.slug ? clean(input.slug) : "";
  if (fromInput) return fromInput;
  const base = clean(input.name_en ?? "") || clean(input.name_ar ?? "") || clean(input.sku ?? "") || "product";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
