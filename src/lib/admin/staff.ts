import type { SupabaseClient } from "@supabase/supabase-js";
import { ASSIGNABLE_TABS, MANAGED_PERMISSION_CODES } from "./permission-tabs";

export interface StaffAccount {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  created_at: string;
  role_names: string[];
  tabs: string[];
}

function isActiveUser(bannedUntil: string | null | undefined): boolean {
  return !bannedUntil || new Date(bannedUntil) < new Date();
}

// يجلب كل حسابات الموظفين (أي مستخدم له دور غير عميل/مندوب، أو مُنحت له
// صلاحية مباشرة عبر هذه الشاشة) — العملاء العاديون والمناديب المحضون
// (يُداران من صفحاتهما الخاصة) لا يظهرون هنا
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listStaffAccounts(svc: SupabaseClient<any, any, any>): Promise<StaffAccount[]> {
  const [{ data: authList }, { data: profiles }, { data: userRoles }, { data: userPerms }] = await Promise.all([
    svc.auth.admin.listUsers({ perPage: 200 }),
    svc.from("profiles").select("id, full_name"),
    svc.from("user_roles").select("user_id, roles(name)"),
    svc.from("user_permissions").select("user_id, permissions(code)").eq("granted", true),
  ]);

  const profileMap = new Map<string, string>((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));

  const rolesMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (userRoles ?? []).forEach((r: any) => {
    const roleObj = r.roles as { name: string } | { name: string }[] | null;
    const name = Array.isArray(roleObj) ? roleObj[0]?.name : roleObj?.name;
    if (!name) return;
    rolesMap.set(r.user_id, [...(rolesMap.get(r.user_id) ?? []), name]);
  });

  const codesMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (userPerms ?? []).forEach((r: any) => {
    const permObj = r.permissions as { code: string } | { code: string }[] | null;
    const code = Array.isArray(permObj) ? permObj[0]?.code : permObj?.code;
    if (!code) return;
    codesMap.set(r.user_id, [...(codesMap.get(r.user_id) ?? []), code]);
  });

  const result: StaffAccount[] = [];
  for (const u of authList?.users ?? []) {
    const roleNames = rolesMap.get(u.id) ?? [];
    const grantedCodes = new Set(codesMap.get(u.id) ?? []);
    const isStaff = roleNames.some(r => r !== "customer" && r !== "driver") || grantedCodes.size > 0;
    if (!isStaff) continue;

    const tabs = ASSIGNABLE_TABS
      .filter(t => t.permissions.some(p => grantedCodes.has(p)))
      .map(t => t.key);

    result.push({
      id: u.id,
      email: u.email ?? "",
      full_name: profileMap.get(u.id) ?? (u.user_metadata?.full_name as string | undefined) ?? "",
      active: isActiveUser(u.banned_until),
      created_at: u.created_at,
      role_names: roleNames,
      tabs,
    });
  }
  return result.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// يمنح بالضبط حزم صلاحيات التبويبات المختارة، ويسحب ما عداها — لا يمسّ أي
// كود صلاحية خارج نطاق MANAGED_PERMISSION_CODES (مثل roles:*/audit:read)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setStaffTabs(svc: SupabaseClient<any, any, any>, userId: string, tabKeys: string[]) {
  const wantedCodes = new Set(
    ASSIGNABLE_TABS.filter(t => tabKeys.includes(t.key)).flatMap(t => t.permissions)
  );

  const { data: permRows } = await svc
    .from("permissions").select("id, code").in("code", MANAGED_PERMISSION_CODES);
  const codeToId = new Map<string, string>((permRows ?? []).map((p: { id: string; code: string }) => [p.code, p.id]));

  const toGrant  = MANAGED_PERMISSION_CODES.filter(c => wantedCodes.has(c));
  const toRevoke = MANAGED_PERMISSION_CODES.filter(c => !wantedCodes.has(c));

  const revokeIds = toRevoke.map(c => codeToId.get(c)).filter((id): id is string => !!id);
  if (revokeIds.length) {
    await svc.from("user_permissions").delete().eq("user_id", userId).in("permission_id", revokeIds);
  }
  const grantRows = toGrant
    .map(c => ({ user_id: userId, permission_id: codeToId.get(c), granted: true }))
    .filter((r): r is { user_id: string; permission_id: string; granted: true } => !!r.permission_id);
  if (grantRows.length) {
    await svc.from("user_permissions").upsert(grantRows, { onConflict: "user_id,permission_id" });
  }
}

export function generateStaffPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (const n of arr) pw += chars[n % chars.length];
  return pw;
}
