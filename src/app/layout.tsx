import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ThemeProvider } from "next-themes";
import CartDrawer from "@/components/cart/CartDrawer";
import "./globals.css";

const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://ahmadi-store.vercel.app"),
  title: { default: "مركز الأحمدي للجوالات", template: "%s | مركز الأحمدي" },
  description: "أفضل متجر إلكتروني للجوالات والإكسسوارات في اليمن — تعز.",
  keywords: ["جوالات", "هواتف", "اليمن", "تعز", "إكسسوارات"],
  openGraph: { type: "website", locale: "ar_YE", siteName: "مركز الأحمدي للجوالات" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#09444C" },
    { media: "(prefers-color-scheme: dark)",  color: "#052E33" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={fontArabic.variable}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
          {children}
          <CartDrawer />
        </ThemeProvider>
      </body>
    </html>
  );
}
