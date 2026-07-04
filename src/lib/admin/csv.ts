// أدوات CSV مشتركة بين قالب الاستيراد والتصدير والاستيراد نفسه — تضمن
// أن الأعمدة والتهريب (escaping) متطابقة في الاتجاهين ذهاباً وإياباً.

// يحلّل نص CSV كاملاً مع دعم الحقول المقتبسة (تحتوي فواصل أو أسطر جديدة أو "" كتهريب لعلامة اقتباس)
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ""));
}

// يهرّب حقلاً واحداً للإخراج — يقتبس دائماً لتفادي أي التباس مع الفواصل/الأسطر
export function csvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvField).join(",");
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const bom = "﻿"; // UTF-8 BOM ليفتح Excel العربية بشكل صحيح
  return bom + [csvRow(headers), ...rows.map(csvRow)].join("\n");
}

// يفصل قائمة (مثل الوسوم) داخل خلية CSV واحدة بفاصلة منقوطة لتفادي التعارض مع فاصل الأعمدة
export function joinList(items: string[] | null | undefined): string {
  return (items ?? []).join("؛ ");
}
export function splitList(value: string): string[] {
  return value.split(/[؛;]/).map(s => s.trim()).filter(Boolean);
}
