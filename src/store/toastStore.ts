import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id:       string;
  type:     ToastType;
  message:  string;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  show:    (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show(message, type = "info", duration = 3500) {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  dismiss(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },
}));

// Convenience helpers
export const toast = {
  success: (msg: string, dur?: number) => useToastStore.getState().show(msg, "success", dur),
  error:   (msg: string, dur?: number) => useToastStore.getState().show(msg, "error",   dur),
  info:    (msg: string, dur?: number) => useToastStore.getState().show(msg, "info",    dur),
  warning: (msg: string, dur?: number) => useToastStore.getState().show(msg, "warning", dur),
};
