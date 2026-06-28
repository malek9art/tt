import type { Config } from "tailwindcss";

/**
 * Tailwind CSS Preset — مركز الأحمدي للجوالات
 * يُطبَّق على: storefront + admin + delivery
 */
export const ahmadi = {
  // ===== الألوان =====
  colors: {
    brand: {
      50:  "#EFF6F7",
      100: "#D6EAED",
      200: "#AACFD5",
      300: "#7DB4BD",
      400: "#4E97A2",
      500: "#107080",
      600: "#0C5660",
      700: "#09444C", // ← اللون الأساسي للهوية
      800: "#073A41",
      900: "#052E33",
      950: "#031E22",
    },
    accent: {
      50:  "#FFFDE0",
      100: "#FFF9CC",
      200: "#FFF099",
      300: "#FFE866",
      400: "#FFEC4D",
      500: "#FFE100", // ← اللون التمييزي (الأصفر)
      600: "#D9BE00",
      700: "#B09A00",
      800: "#806F00",
      900: "#4D4200",
    },
    success: {
      DEFAULT: "#16A34A",
      light:   "#DCFCE7",
      dark:    "#166534",
    },
    warning: {
      DEFAULT: "#F59E0B",
      light:   "#FEF3C7",
      dark:    "#92400E",
    },
    error: {
      DEFAULT: "#DC2626",
      light:   "#FEE2E2",
      dark:    "#991B1B",
    },
    info: {
      DEFAULT: "#0EA5E9",
      light:   "#E0F2FE",
      dark:    "#075985",
    },
  },

  // ===== الخطوط =====
  fontFamily: {
    arabic: [
      "IBM Plex Sans Arabic",
      "Cairo",
      "Tajawal",
      "sans-serif",
    ],
    latin: [
      "IBM Plex Sans",
      "Inter",
      "sans-serif",
    ],
    mono: [
      "IBM Plex Mono",
      "monospace",
    ],
  },

  // ===== نظام المسافات 4pt/8pt =====
  spacing: {
    "0":   "0px",
    "0.5": "2px",
    "1":   "4px",
    "1.5": "6px",
    "2":   "8px",
    "3":   "12px",
    "4":   "16px",
    "5":   "20px",
    "6":   "24px",
    "7":   "28px",
    "8":   "32px",
    "10":  "40px",
    "12":  "48px",
    "16":  "64px",
    "20":  "80px",
    "24":  "96px",
    "32":  "128px",
  },

  // ===== الحواف الدائرية =====
  borderRadius: {
    none:    "0",
    sm:      "6px",
    DEFAULT: "10px",
    md:      "10px",
    lg:      "16px",
    xl:      "24px",
    "2xl":   "32px",
    full:    "9999px",
  },

  // ===== الظلال بلون الهوية =====
  boxShadow: {
    card:    "0 4px 14px rgba(9,68,76,0.08)",
    hover:   "0 8px 24px rgba(9,68,76,0.16)",
    modal:   "0 20px 60px rgba(9,68,76,0.28)",
    accent:  "0 4px 14px rgba(255,225,0,0.35)",
    inner:   "inset 0 2px 6px rgba(9,68,76,0.06)",
    none:    "none",
  },

  // ===== توقيتات الحركة (من القسم 2.8) =====
  transitionDuration: {
    micro:  "120ms",
    fast:   "200ms",
    base:   "300ms",
    slow:   "400ms",
    page:   "500ms",
  },

  transitionTimingFunction: {
    standard:   "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    spring:     "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  // ===== نقاط التوقّف =====
  screens: {
    sm:  "640px",
    md:  "768px",
    lg:  "1024px",
    xl:  "1280px",
    "2xl": "1536px",
  },

  // ===== عرض الحاوية الأقصى =====
  maxWidth: {
    container: "1280px",
    prose:     "65ch",
  },
} satisfies Partial<Config["theme"]>;
