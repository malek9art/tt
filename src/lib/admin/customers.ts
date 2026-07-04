import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// يُعيد كل user_id دوره "عميل" حصراً — يستثني أي حساب يحمل أيضاً دور
// موظف/مدير/مندوب (المناديب مثلاً يُمنحون دور "عميل" تلقائياً بالإضافة
// إلى دور "مندوب" عبر trigger، فلا يجب احتسابهم ضمن إحصائيات/قوائم العملاء).
// عميل service-role مطلوب هنا لأن RLS على user_roles يقتصر على من يملك
// صلاحية users:manage تحديداً — بينما صفحات العملاء/التحليلات/لوحة
// التحكم مبنية على صلاحيات أخف (users:read أو products:read).
export async function getPureCustomerIds(): Promise<Set<string>> {
  const client = svc();
  const { data } = await client.from("user_roles").select("user_id, roles(name)");
  const rolesByUser = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data ?? []).forEach((r: any) => {
    const roleObj = r.roles as { name: string } | { name: string }[] | null;
    const name = Array.isArray(roleObj) ? roleObj[0]?.name : roleObj?.name;
    if (!name) return;
    rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), name]);
  });
  const ids = new Set<string>();
  for (const [uid, names] of rolesByUser) {
    if (names.length === 1 && names[0] === "customer") ids.add(uid);
  }
  return ids;
}
