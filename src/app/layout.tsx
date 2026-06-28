import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مركز الأحمدي للجوالات",
  description: "أفضل متجر إلكتروني للجوالات في اليمن — تعز",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}