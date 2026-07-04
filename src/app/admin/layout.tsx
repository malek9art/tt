import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "لوحة الإدارة", template: "%s | مركز الأحمدي - الإدارة" },
  robots: { index: false, follow: false },
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "الإدارة",
  },
};

// هذا الـ layout يُغلّف كل /admin/*
// لكن كل شيء داخل route groups:
//   (auth)      → صفحة login فقط
//   (dashboard) → صفحات الإدارة مع Sidebar+Header
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
