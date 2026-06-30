"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiCheckCircle, HiXCircle, HiInformationCircle, HiExclamationTriangle, HiXMark } from "react-icons/hi2";
import { useToastStore } from "@/store/toastStore";

const CONFIG = {
  success: { icon: HiCheckCircle,        bg: "bg-green-50 dark:bg-green-900/30",  border: "border-green-200 dark:border-green-700",  text: "text-green-800 dark:text-green-200",  icon_cls: "text-green-500" },
  error:   { icon: HiXCircle,            bg: "bg-red-50 dark:bg-red-900/30",      border: "border-red-200 dark:border-red-700",      text: "text-red-800 dark:text-red-200",      icon_cls: "text-red-500"   },
  info:    { icon: HiInformationCircle,  bg: "bg-blue-50 dark:bg-blue-900/30",    border: "border-blue-200 dark:border-blue-700",    text: "text-blue-800 dark:text-blue-200",    icon_cls: "text-blue-500"  },
  warning: { icon: HiExclamationTriangle,bg: "bg-amber-50 dark:bg-amber-900/30",  border: "border-amber-200 dark:border-amber-700",  text: "text-amber-800 dark:text-amber-200",  icon_cls: "text-amber-500" },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-4 end-4 z-[9999] flex flex-col gap-2 pointer-events-none" dir="rtl">
      <AnimatePresence>
        {toasts.map(t => {
          const cfg = CONFIG[t.type];
          const Icon = cfg.icon;
          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,   scale: 1    }}
              exit  ={{ opacity: 0, y: -8,   scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg max-w-sm ${cfg.bg} ${cfg.border}`}>
              <Icon className={`mt-0.5 shrink-0 text-xl ${cfg.icon_cls}`} />
              <p className={`flex-1 text-sm font-medium leading-snug ${cfg.text}`}>{t.message}</p>
              <button onClick={() => dismiss(t.id)}
                className={`shrink-0 rounded-md p-0.5 transition-colors hover:bg-black/10 ${cfg.text}`}>
                <HiXMark className="text-base" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
