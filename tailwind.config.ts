import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        background: "#ffffff",
        card: "#f8fafc",
        "card-highlight": "#f1f5f9",
        primary: { DEFAULT: "#0ea5e7", hover: "#0284c7" },
        secondary: "#64748b",
        border: "#e2e8f0",
        input: "#f1f5f9",
        ring: "#0ea5e7",
        foreground: { DEFAULT: "#1e293b", muted: "#64748b" },
        destructive: { DEFAULT: "#dc2626", hover: "#b91c1c" },
        success: { DEFAULT: "#16a34a", hover: "#15803d" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: { md: "0.375rem", lg: "0.5rem" },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;