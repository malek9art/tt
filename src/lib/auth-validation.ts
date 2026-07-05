export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("967")) return `+${digits}`;
  if (digits.startsWith("0"))   return `+967${digits.slice(1)}`;
  if (digits.length === 9)      return `+967${digits}`;
  return `+${digits}`;
}

export function phoneToVirtualEmail(phone: string): string {
  return `${normalisePhone(phone).replace("+", "")}@phone.ahmadistore.internal`;
}

export function validatePassword(pw: string): { valid: boolean; error?: string } {
  if (pw.length < 8)      return { valid: false, error: "كلمة المرور 8 أحرف على الأقل" };
  if (!/[A-Z]/.test(pw))  return { valid: false, error: "يجب أن تحتوي على حرف كبير (A-Z)" };
  if (!/\d/.test(pw))     return { valid: false, error: "يجب أن تحتوي على رقم واحد على الأقل" };
  return { valid: true };
}
