import type { Config } from "tailwindcss";
import { ahmadi } from "@ahmadi/config/tailwind/preset";

const config: Config = {
  // Dark Mode عبر class (next-themes يُضيف class="dark")
  darkMode: ["class"],

  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      ...ahmadi,

      // CSS Variables للـ Dark Mode
      backgroundColor: {
        page:    "var(--bg-page)",
        card:    "var(--bg-card)",
        header:  "var(--bg-header)",
      },
      textColor: {
        primary:   "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted:     "var(--text-muted)",
        "on-dark": "var(--text-on-dark)",
      },
      borderColor: {
        DEFAULT: "var(--border-color)",
      },
    },
  },

  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};

export default config;
