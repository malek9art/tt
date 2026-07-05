import type { SupabaseClient } from "@supabase/supabase-js";

// خريطة موحّدة تبويب↔صلاحيات — مصدر واحد للحقيقة يستخدمه كل من:
// AdminSidebar (لإظهار/إخفاء التبويب حسب ما يملكه المستخدم فعلاً)
// وشاشة إدارة المستخدمين (لمنح/سحب حزمة الصلاحيات عند تفعيل تبويب لموظف)
// حزم كل تبويب مبنية على فحص فعلي لكل requireAdmin() في مسارات /api/admin
// وليست تخميناً — راجع كل مسار قبل تعديل أي حزمة هنا.
export interface AdminTab {
  key: string;
  label: string;
  href: string;
  /** الأكواد المطلوبة لعرض التبويب لموظف، ونفسها تُمنح له عند تفعيله */
  permissions: string[];
}

export const ADMIN_TABS: AdminTab[] = [
  { key: "dashboard",     label: "لوحة التحكم",          href: "/admin",               permissions: [] },
  { key: "products",      label: "المنتجات",             href: "/admin/products",      permissions: ["products:read", "products:manage", "products:delete"] },
  { key: "orders",        label: "الطلبات",               href: "/admin/orders",        permissions: ["orders:read", "orders:manage"] },
  { key: "payments",      label: "المدفوعات",             href: "/admin/payments",      permissions: ["finance:read", "finance:manage"] },
  { key: "customers",     label: "العملاء",               href: "/admin/customers",     permissions: ["users:read"] },
  { key: "inventory",     label: "المخزون",               href: "/admin/inventory",     permissions: ["products:read", "products:manage", "inventory:manage"] },
  { key: "analytics",     label: "التحليلات",             href: "/admin/analytics",     permissions: ["products:read"] },
  { key: "marketing",     label: "التسويق والكوبونات",     href: "/admin/marketing",     permissions: ["marketing:read", "marketing:manage"] },
  { key: "banners",       label: "البنرات الإعلانية",      href: "/admin/banners",       permissions: ["marketing:read", "marketing:manage"] },
  { key: "notifications", label: "الإشعارات",             href: "/admin/notifications", permissions: ["orders:read", "orders:manage"] },
  { key: "drivers",       label: "المناديب",              href: "/admin/drivers",       permissions: ["delivery:manage"] },
  { key: "settings",      label: "الإعدادات",             href: "/admin/settings",      permissions: ["settings:read", "settings:manage"] },
  { key: "users",         label: "إدارة المستخدمين",       href: "/admin/users",         permissions: ["users:manage"] },
];

// لوحة التحكم صفحة تجميعية تُعرض دائماً لكل من دخل — ليست صلاحية مستقلة تُمنح
export const ASSIGNABLE_TABS = ADMIN_TABS.filter(t => t.key !== "dashboard");

// كل الأكواد التي تديرها شاشة إدارة المستخدمين — أي كود آخر (roles:*، audit:read)
// يبقى محصوراً بالأدوار الثابتة ولا تلمسه هذه الشاشة إطلاقاً
export const MANAGED_PERMISSION_CODES = Array.from(
  new Set(ASSIGNABLE_TABS.flatMap(t => t.permissions))
);

export function hasAnyPermission(granted: Set<string>, required: string[]): boolean {
  return required.length === 0 || required.some(p => granted.has(p));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchUserPermissions(supabase: SupabaseClient<any, any, any>, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("get_user_permissions", { _user_id: userId });
  if (error || !data) return new Set();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Set((data as { code: string }[]).map((r: any) => r.code));
}
