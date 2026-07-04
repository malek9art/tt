"use client";
import { useEffect, useState } from "react";
import { HiArrowDownTray, HiXMark, HiShare } from "react-icons/hi2";

// المتصفحات الحديثة (كروم/إيدج على أندرويد وسطح المكتب) أوقفت الإشعار
// التلقائي للتثبيت، وتتطلب أن يلتقط الموقع حدث beforeinstallprompt ويعرض
// زر تثبيت خاص به — لذلك لم يكن يظهر أي شيء رغم أن المانيفست والـ
// service worker جاهزان. آيفون/سفاري لا يدعم هذا الحدث إطلاقاً ويتطلب
// تعليمات يدوية (زر المشاركة → إضافة للشاشة الرئيسية).
const DISMISS_KEY = "ahmadi-install-dismissed-at";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const days = (Date.now() - Number(raw)) / 86_400_000;
  return days < DISMISS_DAYS;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // نبدأ مخفياً حتى نتحقق من الشروط بعد mount

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || isDismissedRecently()) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
    if (isIos) {
      setShowIosHint(true);
      setDismissed(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    const onInstalled = () => { setDeferred(null); setDismissed(true); };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setDismissed(true);
  };

  if (dismissed || (!deferred && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:bottom-4 sm:end-4 sm:inset-x-auto sm:max-w-sm" dir="rtl">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-accent-500">
          <HiArrowDownTray className="text-lg"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-1)]">ثبّت التطبيق على جهازك</p>
          {showIosHint ? (
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed flex items-center gap-1 flex-wrap">
              اضغط زر المشاركة <HiShare className="inline text-sm"/> ثم اختر «إضافة إلى الشاشة الرئيسية»
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-1">وصول أسرع بلا فتح المتصفح في كل مرة</p>
          )}
          {!showIosHint && (
            <button onClick={install}
              className="btn-primary mt-3 gap-1.5 text-xs px-3 py-1.5">
              <HiArrowDownTray className="text-sm"/> تثبيت الآن
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="إغلاق" className="text-[var(--text-muted)] hover:text-[var(--text-1)] shrink-0">
          <HiXMark className="text-base"/>
        </button>
      </div>
    </div>
  );
}
