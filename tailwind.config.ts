import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6F7", 100: "#D6EAED", 200: "#AACFD5",
          300: "#7DB4BD", 400: "#4E97A2", 500: "#107080",
          600: "#0C5660", 700: "#09444C", 800: "#073A41",
          900: "#052E33", 950: "#031E22",
        },
        accent: {
          100: "#FFF9CC", 200: "#FFF099", 300: "#FFE866",
          400: "#FFEC4D", 500: "#FFE100", 600: "#D9BE00", 700: "#B09A00",
        },
      },
      fontFamily: {
        arabic: ["var(--font-arabic)", "Cairo", "Tajawal", "sans-serif"],
      },
      boxShadow: {
        card:  "0 4px 14px rgba(9,68,76,0.08)",
        hover: "0 8px 24px rgba(9,68,76,0.16)",
      },
    },
  },
  plugins: [],
};
export default config;
