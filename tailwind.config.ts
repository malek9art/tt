import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          700: "#09444C",
          800: "#073A41",
          900: "#052E33",
        },
        accent: {
          500: "#FFE100",
        },
      },
      fontFamily: {
        arabic: ["IBM Plex Sans Arabic", "Cairo", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;