import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // RTL + Arabic support
  i18n: undefined, // next-intl يتكفل بهذا لاحقاً

  // تحسين الصور
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.ahmadi.ye",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // حماية أمنية
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options",           value: "DENY" },
        { key: "X-Content-Type-Options",    value: "nosniff" },
        { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self)" },
      ],
    },
  ],

  // Turbopack للتطوير السريع (Next.js 15)
  experimental: {
    turbo: {},
  },

  // منع تسرب معلومات الخادم
  serverExternalPackages: ["@supabase/ssr"],

  // إعادة توجيه للإدارة
  redirects: async () => [
    {
      source: "/admin",
      destination: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
      permanent: false,
    },
  ],
};

export default nextConfig;
