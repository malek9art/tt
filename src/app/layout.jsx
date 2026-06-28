import "./globals.css";

export const metadata = {
  title: "مركز الأحمدي للجوالات",
  description: "أفضل متجر إلكتروني للجوالات في اليمن",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}