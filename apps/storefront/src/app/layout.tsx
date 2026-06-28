import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// ===== الخطوط =====

/** الخط العربي الأساسي */
const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: true,
});

/** الخط اللاتيني المنسجم */
const fontLatin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
  preload: false,
});

// ===== Metadata =====
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "مركز الأحمدي للجوالات ومستلزماتها",
    template: "%s | مركز الأحمدي",
  },
  description:
    "أفضل متجر إلكتروني للجوالات والإكسسوارات في اليمن — تعز. أسعار منافسة، توصيل سريع، ضمان أصلي.",
  keywords: ["جوالات", "هواتف", "اليمن", "تعز", "إكسسوارات", "الأحمدي"],
  openGraph: {
    type: "website",
    locale: "ar_YE",
    siteName: "مركز الأحمدي للجوالات",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#09444C" },
    { media: "(prefers-color-scheme: dark)",  color: "#052E33" },
  ],
};

// ===== Root Layout =====
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      // suppressHydrationWarning ضروري مع next-themes
      suppressHydrationWarning
      className={`${fontArabic.variable} ${fontLatin.variable}`}
    >
      <body className="font-arabic antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
