"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Shield, Users, ChevronDown, ChevronUp } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Role {
  id: string; name: string; display_name: string; description: string | null;
  user_roles: { profiles: { full_name: string | null } | null }[];
}
interface Permission { id: string; code: string; name_ar: string; group_name: string; }

export default function RolesPage() {
  const [roles, setRoles]   = useState<Role[]>([]);
  const [perms, setPerms]   = useState<Permission[]>([]);
  const [expanded, setExp]  = useState<string|null>(null);
  const [loading,  setLd]   = useState(true);

  useEffect(() => {
    Promise.all([
      sb.from("roles").select("*, user_roles(profiles(full_name))").order("id"),
      sb.from("permissions").select("*").order("group_name,code"),
    ]).then(([r, p]) => {
      setRoles(r.data ?? []);
      setPerms(p.data ?? []);
      setLd(false);
    });
  }, []);

  const groups = [...new Set(perms.map(p => p.group_name))];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">الأدوار والصلاحيات</h1>
        <p className="text-sm text-[var(--text-muted)]">{roles.length} أدوار · {perms.length} صلاحية</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : (
        <div className="space-y-3">
          {roles.map(role => {
            const memberCount = role.user_roles?.length ?? 0;
            const isOpen = expanded === role.id;
            return (
              <div key={role.id} className="card-base overflow-hidden">
                <button
                  onClick={() => setExp(isOpen ? null : role.id)}
                  className="w-full flex items-center gap-4 p-4 text-right hover:bg-[var(--bg-page)] transition-colors">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
                    <Shield size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-1)]">{role.display_name}</p>
                    <p className="text-xs text-[var(--text-muted)]" dir="ltr">{role.name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Users size={13}/> {memberCount}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-[var(--text-muted)]"/> : <ChevronDown size={16} className="text-[var(--text-muted)]"/>}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-[var(--border)] p-4 space-y-4">
                    {role.description && (
                      <p className="text-sm text-[var(--text-2)]">{role.description}</p>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">الصلاحيات حسب المجموعة</p>
                      <div className="space-y-2">
                        {groups.map(g => {
                          const gPerms = perms.filter(p => p.group_name === g);
                          return (
                            <div key={g} className="rounded-lg bg-[var(--bg-page)] p-3">
                              <p className="text-xs font-medium text-brand-700 dark:text-accent-400 mb-2">{g}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {gPerms.map(p => (
                                  <span key={p.id} className="text-[10px] bg-[var(--border)] text-[var(--text-2)] px-2 py-0.5 rounded-full" dir="ltr">
                                    {p.code}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
