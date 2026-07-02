"use client";
import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HiEnvelope, HiCheckCircle, HiArrowLeft, HiKey } from "react-icons/hi2";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const send = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("أدخل بريداً إلكترونياً صحيحاً"); return;
    }
    setLoading(true); setError("");

    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const d = await res.json();

    setLoading(false);
    if (!res.ok) setError(d.error ?? "تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
    else setSent(true);
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-white text-2xl shadow-lg">
              <HiKey/>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">إعادة تعيين كلمة المرور</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {sent ? "تحقق من بريدك الإلكتروني" : "أدخل بريدك وسنرسل لك رابط إعادة التعيين"}
            </p>
          </div>

          <div className="card-base p-6">
            {sent ? (
              <div className="py-8 text-center space-y-3">
                <HiCheckCircle className="mx-auto text-6xl text-green-500" />
                <p className="font-bold text-lg text-[var(--text-1)]">تم إرسال الرابط</p>
                <p className="text-sm text-[var(--text-muted)]">
                  افتح الرسالة المُرسلة إلى <span className="font-semibold" dir="ltr">{email}</span> واضغط على الرابط لتعيين كلمة مرور جديدة.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
                  <div className="relative">
                    <HiEnvelope className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                    <input type="email" dir="ltr" placeholder="example@gmail.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && send()}
                      className={`${iCls} pe-9`}
                      autoComplete="email" autoFocus />
                  </div>
                </div>
                <button onClick={send} disabled={loading || !email}
                  className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الإرسال...</>
                    : <>إرسال رابط إعادة التعيين <HiArrowLeft className="text-base" /></>}
                </button>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            تذكرت كلمة المرور؟{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-900 dark:text-accent-400 transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
