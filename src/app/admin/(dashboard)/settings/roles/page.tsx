"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Shield, Users, CheckCircle, ArrowRight } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Role {
  id:           string;
  name:         string;
  display_name: string;
  permissions:  string[];
}

const ROLE_ICONS: Record<string,string> = {
  super_admin:"👑", admin:"🛡️", manager:"📊", support:"🎧",
  driver:"🚚", accountant:"📈", marketer:"📣", customer:"👤",
};

export default function RolesPage() {
  const [roles,   setRoles]   = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected,setSelected] = useState<string|null>(null);

  useEffect(() => {
    Promise.all([
      sb.from("roles").select("id, name, display_name").order("name"),
      sb.from("role_permissions")
        .select("role_id, permissions(code)"),
    ]).then(([rolesRes, permsRes]) => {
      const permsMap: Record<string,string[]> = {};
      (permsRes.data ?? []).forEach(rp => {
        const perm = rp.permissions as { code: string } | { code: string }[] | null;
        const code = Array.isArray(perm) ? perm[0]?.code : perm?.code;
        if (code) {
          if (!permsMap[rp.role_id]) permsMap[rp.role_id] = [];
          permsMap[rp.role_id].push(code);
        }
      });
      const result = (rolesRes.data ?? []).map(r => ({
        ...r,
        permissions: permsMap[r.id] ?? [],
      }));
      setRoles(result);
      if (result.length > 0) setSelected(result[0].id);
      setLoading(false);
    });
  }, []);

  const selectedRole = roles.find(r => r.id === selected);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">الأدوار والصلاحيات</h1>
          <p className="text-sm text-[var(--text-muted)]">{roles.length} دور مُعرَّف في النظام</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map(i=><div key={i} className="skeleton h-20 w-full rounded-xl"/>)}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {/* قائمة الأدوار */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">الأدوار</h2>
            {roles.map(role => (
              <button key={role.id} onClick={() => setSelected(role.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-right transition-all ${
                  selected === role.id
                    ? "bg-brand-700 text-white shadow"
                    : "border border-[var(--border)] text-[var(--text-1)] hover:border-brand-300"
                }`}>
                <span className="text-xl">{ROLE_ICONS[role.name] ?? "👤"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{role.display_name}</p>
                  <p className={`text-xs mt-0.5 ${selected===role.id ? "text-brand-200" : "text-[var(--text-muted)]"}`}>
                    {role.permissions.length} صلاحية
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* صلاحيات الدور المختار */}
          <div className="md:col-span-2">
            {selectedRole ? (
              <div className="card-base p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-2xl">
                    {ROLE_ICONS[selectedRole.name] ?? "👤"}
                  </div>
                  <div>
                    <h2 className="font-bold text-[var(--text-1)]">{selectedRole.display_name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{selectedRole.name}</p>
                  </div>
                  <div className="mr-auto flex items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5">
                    <Shield size={13} className="text-brand-700"/>
                    <span className="text-xs font-medium text-brand-700 dark:text-accent-400">
                      {selectedRole.permissions.length} صلاحية
                    </span>
                  </div>
                </div>

                {selectedRole.permissions.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-6">لا توجد صلاحيات لهذا الدور</p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {selectedRole.permissions.sort().map(perm => (
                      <div key={perm} className="flex items-center gap-2 rounded-lg bg-[var(--bg-page)] px-3 py-2">
                        <CheckCircle size={13} className="shrink-0 text-green-500"/>
                        <code className="text-xs text-[var(--text-1)]" dir="ltr">{perm}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-base py-16 text-center">
                <Users size={32} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]"/>
                <p className="text-[var(--text-muted)] text-sm">اختر دوراً لعرض صلاحياته</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
