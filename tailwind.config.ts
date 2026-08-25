import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        edge: "var(--edge)",
        edgeStrong: "var(--edge-strong)",
        ink: "var(--ink)",
        inkMuted: "var(--ink-muted)",
        inkSubtle: "var(--ink-subtle)",
      },
      borderRadius: {
        squircular: "14px",
      },
      fontFamily: {
        // Inter loaded from Google Fonts with its plain family name.
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        pop: "0 8px 30px rgba(15, 23, 42, 0.12)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out both",
        "slide-in-right": "slide-in-right 0.24s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;