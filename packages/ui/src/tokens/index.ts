/**
 * Design Tokens — مركز الأحمدي للجوالات
 * المصدر الوحيد للحقيقة لكل قيم التصميم
 */

// ===== ألوان الهوية =====
export const colors = {
  brand: {
    50:  "#EFF6F7",
    100: "#D6EAED",
    200: "#AACFD5",
    300: "#7DB4BD",
    400: "#4E97A2",
    500: "#107080",
    600: "#0C5660",
    700: "#09444C", // PRIMARY
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
    500: "#FFE100", // ACCENT
    600: "#D9BE00",
    700: "#B09A00",
  },
  semantic: {
    success: "#16A34A",
    warning: "#F59E0B",
    error:   "#DC2626",
    info:    "#0EA5E9",
  },
} as const;

// ===== نظام الحركة (القسم 2.8) =====
export const motion = {
  duration: {
    micro: 0.12,  // 120ms — ضغط زر، toggle
    fast:  0.20,  // 200ms — hover، قوائم
    base:  0.30,  // 300ms — modals، drawers
    slow:  0.40,  // 400ms — انتقالات صفحة
    page:  0.50,  // 500ms — View Transitions
  },

  ease: {
    standard:   [0.4, 0, 0.2, 1]  as const,
    decelerate: [0, 0, 0.2, 1]    as const,
    accelerate: [0.4, 0, 1, 1]    as const,
    // spring يُستخدم مع Framer Motion مباشرة:
    spring:     { type: "spring", stiffness: 300, damping: 25 },
    bounce:     { type: "spring", stiffness: 400, damping: 15 },
  },

  // Variants جاهزة لـ Framer Motion
  variants: {
    // بطاقة تظهر من الأسفل
    cardReveal: {
      hidden:  { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    // حاوية stagger للقوائم
    staggerContainer: {
      hidden:  { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
      },
    },
    // Modal
    modal: {
      hidden:  { opacity: 0, scale: 0.95, y: 8 },
      visible: { opacity: 1, scale: 1,    y: 0 },
      exit:    { opacity: 0, scale: 0.95, y: 8 },
    },
    // Toast
    toast: {
      hidden:  { opacity: 0, y: -20, x: "-50%" },
      visible: { opacity: 1, y: 0,   x: "-50%" },
      exit:    { opacity: 0, y: -20, x: "-50%" },
    },
    // Fade بسيط
    fadeIn: {
      hidden:  { opacity: 0 },
      visible: { opacity: 1 },
      exit:    { opacity: 0 },
    },
    // Slide من اليمين (RTL: من اليسار)
    slideIn: {
      hidden:  { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0   },
      exit:    { opacity: 0, x: -20 },
    },
    // بطاقة منتج عند Hover
    productCard: {
      rest:  { y: 0, boxShadow: "0 4px 14px rgba(9,68,76,0.08)" },
      hover: { y: -4, boxShadow: "0 8px 24px rgba(9,68,76,0.16)" },
    },
  },
} as const;

// ===== مقياس الطباعة =====
export const typography = {
  scale: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60] as const,
  weight: {
    regular:   400,
    medium:    500,
    semibold:  600,
    bold:      700,
  },
  lineHeight: {
    tight:  1.3,
    base:   1.7,  // للعربية
    loose:  1.9,
  },
} as const;

// ===== نظام المسافات 4pt/8pt =====
export const spacing = {
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  24:  96,
} as const;
