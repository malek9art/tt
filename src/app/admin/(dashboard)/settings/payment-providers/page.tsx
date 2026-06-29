"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, CheckCircle, CreditCard, Banknote, Wallet } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ICONS: Record<string, React.ElementType> = {
  cod: Banknote, stripe: CreditCard,
  jawali: Wallet, jeeb: Wallet, flooss: Wallet,
};

interface Provider {
  id: string; code: string; name_ar: string;
  is_active: boolean; sort_order: number;
  config: Record<string,unknown>;
}

export default function PaymentProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState<string|null>(null);

  useEffect(() => {
    sb.from("payment_providers").select("*").order("sort_order")
      .then(({ data }) => { setProviders(data ?? []); setLoading(false); });
  }, []);

  const toggle = async (id: string, current: boolean) => {
    setToggling(id);
    await sb.from("payment_providers").update({ is_active: !current }).eq("id", id);
    setProviders(p => p.map(x => x.id === id ? { ...x, is_active: !current } : x));
    setToggling(null);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text-1)]">وسائل الدفع</h1>
      <p className="text-sm text-[var(--text-muted)]">فعّل وسائل الدفع التي تريد تقديمها للعملاء</p>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : (
        <div className="space-y-3">
          {providers.map(p => {
            const Icon = ICONS[p.code] ?? CreditCard;
            return (
              <div key={p.id} className="card-base flex items-center gap-4 p-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${p.is_active ? "bg-green-50 dark:bg-green-900/30 text-green-600" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-1)]">{p.name_ar}</p>
                  <p className="text-xs text-[var(--text-muted)]" dir="ltr">{p.code}</p>
                </div>
                <button
                  onClick={() => toggle(p.id, p.is_active)}
                  disabled={toggling === p.id}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${p.is_active ? "bg-brand-700" : "bg-[var(--border)]"}`}>
                  {toggling === p.id
                    ? <Loader2 size={12} className="animate-spin m-auto text-white" />
                    : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${p.is_active ? "translate-x-0" : "-translate-x-5"}`}/>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
