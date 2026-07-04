"use client";
import { useEffect } from "react";

// تطبيق مثبّت على الشاشة الرئيسية قد يبقى العملية حيّة في الخلفية بدل
// إغلاقها فعلياً — عند العودة إليه لا يحدث تنقّل شبكي جديد فيبقى المستخدم
// على نسخة قديمة رغم نشر تحديثات. نعالج هذا بثلاث آليات معاً:
// 1) updateViaCache:"none" يمنع متصفح المستخدم من تخزين sw.js نفسه مؤقتاً
//    فيكتشف أي تحديث لملف service worker فوراً بدل الانتظار حتى 24 ساعة
// 2) استدعاء registration.update() كلما عاد التطبيق للواجهة (بعد إخفائه)
// 3) إعادة تحميل تلقائية مرة واحدة إذا كان التطبيق مخفياً لأكثر من دقيقة
//    ثم عاد للظهور — يضمن جلب أحدث نسخة من الصفحة دون إزعاج عند التنقل
//    السريع بين التطبيقات
const HIDDEN_RELOAD_THRESHOLD_MS = 60_000;

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then(reg => { registration = reg; })
      .catch(() => {});

    let reloadedOnce = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadedOnce) return;
      reloadedOnce = true;
      window.location.reload();
    });

    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      // عاد التطبيق للظهور
      registration?.update().catch(() => {});
      if (hiddenAt && Date.now() - hiddenAt > HIDDEN_RELOAD_THRESHOLD_MS) {
        window.location.reload();
      }
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return null;
}
