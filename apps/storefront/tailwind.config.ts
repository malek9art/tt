import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#EFF6F7",
          100: "#D6EAED",
          200: "#AACFD5",
          300: "#7DB4BD",
          400: "#4E97A2",
          500: "#107080",
          600: "#0C5660",
          700: "#09444C",
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
          500: "#FFE100",
          600: "#D9BE00",
          700: "#B09A00",
        },
        success: { DEFAULT: "#16A34A", light: "#DCFCE7", dark: "#166534" },
        warning: { DEFAULT: "#F59E0B", light: "#FEF3C7", dark: "#92400E" },
        error:   { DEFAULT: "#DC2626", light: "#FEE2E2", dark: "#991B1B" },
        info:    { DEFAULT: "#0EA5E9", light: "#E0F2FE", dark: "#075985" },
      },
      fontFamily: {
        arabic: ["IBM Plex Sans Arabic", "Cairo", "Tajawal", "sans-serif"],
        latin:  ["IBM Plex Sans", "Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "6px", DEFAULT: "10px", md: "10px",
        lg: "16px", xl: "24px", "2xl": "32px", full: "9999px",
      },
      boxShadow: {
        card:   "0 4px 14px rgba(9,68,76,0.08)",
        hover:  "0 8px 24px rgba(9,68,76,0.16)",
        modal:  "0 20px 60px rgba(9,68,76,0.28)",
        accent: "0 4px 14px rgba(255,225,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;