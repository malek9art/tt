"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Users } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<{id:string;full_name:string;phone:string|null;created_at:string}[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    supabase.from("profiles").select("id,full_name,phone,created_at")
      .order("created_at",{ascending:false}).limit(50)
      .then(({data})=>{ setCustomers(data??[]); setLoading(false); });
  },[]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">العملاء</h1>
        <p className="text-sm text-[var(--text-muted)]">{customers.length} عميل</p>
      </div>
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-12 w-full"/>)}</div>
        ) : customers.length===0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="text-[var(--text-muted)]">لا يوجد عملاء بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
              <tr>{["الاسم","الهاتف","تاريخ التسجيل"].map(h=>(
                <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {customers.map(c=>(
                <tr key={c.id} className="hover:bg-[var(--bg-page)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-1)]">{c.full_name||"—"}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]" dir="ltr">{c.phone||"—"}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {new Date(c.created_at).toLocaleDateString("ar-YE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
