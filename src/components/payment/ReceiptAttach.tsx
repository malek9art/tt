"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { HiCheckCircle } from "react-icons/hi2";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * رفع إثبات التحويل (صورة إيصال أو نص إشعار) — يُستخدم في شاشة تأكيد الطلب
 * وفي صفحة تفاصيل الطلب لإعادة الرفع بعد «طلب تعديل».
 */
export default function ReceiptAttach({ paymentId, onDone }: { paymentId: string; onDone?: () => void }) {
  const [file,    setFile]    = useState<File | null>(null);
  const [note,    setNote]    = useState("");
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState("");

  const submit = async () => {
    if (!file && !note.trim()) { setErr("أرفق صورة الإيصال أو الصق نص الإشعار"); return; }
    setSending(true); setErr("");

    let receiptUrl: string | undefined;
    if (file) {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `customer/${paymentId}-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("payment-receipts").upload(path, file, {
        upsert: true, contentType: file.type,
      });
      if (upErr) { setErr("فشل رفع الصورة — حاول مجدداً"); setSending(false); return; }
      receiptUrl = sb.storage.from("payment-receipts").getPublicUrl(path).data.publicUrl;
    }

    const res = await fetch(`/api/payments/${paymentId}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptUrl, note: note.trim() || undefined }),
    });
    const d = await res.json();
    if (res.ok && d.success) { setDone(true); onDone?.(); }
    else setErr(d.error ?? "فشل الإرسال");
    setSending(false);
  };

  if (done) {
    return (
      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-start gap-3">
        <HiCheckCircle className="text-2xl text-green-500 shrink-0 mt-0.5"/>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">تم استلام إثبات التحويل</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
            طلبك قيد المراجعة — سيتم تأكيده فور تحقق فريقنا من وصول المبلغ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-4">
      <p className="text-sm font-semibold text-[var(--text-1)]">أرفق إثبات التحويل بعد إتمام العملية:</p>

      <label className={`block w-full rounded-xl border-2 border-dashed px-4 py-4 text-sm text-center cursor-pointer transition-colors ${
        file ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
             : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400"
      }`}>
        <input type="file" accept="image/*,.pdf" className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}/>
        📎 {file ? file.name : "صورة إيصال الإيداع / لقطة شاشة التحويل"}
      </label>

      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
        placeholder="أو الصق هنا نص الإشعار (SMS) الذي وصلك من خدمة الدفع…"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors resize-none"/>

      {err && <p className="text-xs text-red-500">{err}</p>}

      <button onClick={submit} disabled={sending}
        className="btn-primary w-full justify-center gap-2">
        <HiCheckCircle className="text-base"/>
        {sending ? "جاري الإرسال..." : "إرسال إثبات التحويل"}
      </button>
      <p className="text-[11px] text-[var(--text-muted)] text-center">
        يبقى الطلب قيد المراجعة حتى تتأكد إدارة المتجر من استلام المبلغ
      </p>
    </div>
  );
}
