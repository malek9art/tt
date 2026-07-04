"use client";
import { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, Search } from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  created_at: string;
}

const LIMIT = 20;

export default function AdminCustomersPage() {
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [total,        setTotal]        = useState(0);
  const [newThisMonth,  setNewThisMonth] = useState<number | null>(null);
  const [loading,       setLoading]      = useState(true);
  const [page,          setPage]         = useState(1);
  const [search,        setSearch]       = useState("");

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/customers?${params}`);
    const d = await res.json().catch(() => ({}));
    setCustomers(d.customers ?? []);
    setTotal(d.total ?? 0);
    setLoading(false);
  }, []);

  // بحث بتأخير بسيط حتى لا يُرسل طلباً مع كل حرف
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1, search); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { load(page, search); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  useEffect(() => {
    fetch("/api/admin/analytics?days=30")
      .then(r => r.json())
      .then(d => setNewThisMonth(d?.summary?.newCustomers ?? 0))
      .catch(() => setNewThisMonth(0));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">العملاء</h1>
        <p className="text-sm text-[var(--text-muted)]">{total} عميل مسجَّل</p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 max-w-md">
        <div className="card-base p-4 bg-blue-50 dark:bg-blue-900/20">
          <Users size={18} className="mb-2 text-blue-600"/>
          <p className="text-xl font-bold text-blue-600">{total}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">إجمالي العملاء</p>
        </div>
        <div className="card-base p-4 bg-green-50 dark:bg-green-900/20">
          <UserPlus size={18} className="mb-2 text-green-600"/>
          <p className="text-xl font-bold text-green-600">{newThisMonth ?? "—"}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">عملاء جدد (30 يوماً)</p>
        </div>
      </div>

      {/* بحث */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute top-1/2 -translate-y-1/2 end-3 text-[var(--text-muted)] pointer-events-none"/>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] pe-8 ps-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors"/>
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-12 w-full"/>)}</div>
        ) : customers.length===0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="text-[var(--text-muted)]">{search ? "لا نتائج لبحثك" : "لا يوجد عملاء بعد"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                <tr>{["الاسم","البريد الإلكتروني","الهاتف","تاريخ التسجيل"].map(h=>(
                  <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {customers.map(c=>(
                  <tr key={c.id} className="hover:bg-[var(--bg-page)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-1)]">{c.full_name||"—"}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] font-mono text-xs" dir="ltr">{c.email||"—"}</td>
                    <td className="px-4 py-3 text-[var(--text-2)]" dir="ltr">{c.phone||"—"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString("ar-YE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                page===p ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
