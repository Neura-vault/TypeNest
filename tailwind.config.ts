import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        blue: { 500: "#1E6FEF", 700: "#0B4FCB" },
        amber: { 500: "#FF8A1E", 700: "#E85B00" },
        violet: { 500: "#7C5CF0", 700: "#5A3ADB" },
        teal: { 500: "#15B895", 700: "#0C8F74" },
        rose: { 500: "#F0568C", 700: "#D63870" },
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border: "var(--border)",
        ink: "var(--text)",
        "ink-dim": "var(--text-dim)"
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      borderRadius: {
        xl2: "18px"
      }
    }
  },
  plugins: []
};

export default config;
