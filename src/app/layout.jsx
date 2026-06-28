export const metadata = {
  title: "مركز الأحمدي للجوالات",
  description: "أفضل متجر إلكتروني للجوالات في اليمن",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Cairo, sans-serif; background:#09444C; color:#fff; direction:rtl; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}