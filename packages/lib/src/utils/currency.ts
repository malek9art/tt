/**
 * أدوات تنسيق العملة — الريال اليمني والدولار
 */

const YER_RATE = 2200; // سعر صرف تقريبي (يُحدَّث من الإعدادات)

/** تنسيق سعر بالريال اليمني */
export function formatYER(amount: number): string {
  return new Intl.NumberFormat("ar-YE", {
    style:                 "currency",
    currency:              "YER",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** تنسيق سعر بالدولار */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("ar-YE", {
    style:                 "currency",
    currency:              "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** تنسيق سعر حسب العملة */
export function formatPrice(amount: number, currency: "YER" | "USD" = "YER"): string {
  return currency === "YER" ? formatYER(amount) : formatUSD(amount);
}

/** تحويل YER → USD */
export function yerToUsd(yer: number, rate = YER_RATE): number {
  return Math.round((yer / rate) * 100) / 100;
}

/** حساب نسبة الخصم */
export function discountPercent(original: number, sale: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - sale) / original) * 100);
}

/**
 * أدوات تنسيق التاريخ — العربية
 */

/** تاريخ قصير: ١٥ يناير ٢٠٢٥ */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-YE", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  }).format(new Date(date));
}

/** تاريخ مع الوقت */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-YE", {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** وقت نسبي: منذ ٣ دقائق */
export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const diff = (new Date(date).getTime() - Date.now()) / 1000;

  if (Math.abs(diff) < 60)   return rtf.format(Math.round(diff), "second");
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
