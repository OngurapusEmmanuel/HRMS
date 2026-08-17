import type { Config } from "tailwindcss";

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--color-bg"),
        foreground: withOpacity("--color-text"),
        surface: withOpacity("--color-surface"),
        "surface-2": withOpacity("--color-surface-2"),
        border: withOpacity("--color-border"),
        "border-strong": withOpacity("--color-border-strong"),
        muted: withOpacity("--color-text-muted"),
        secondary: withOpacity("--color-text-secondary"),
        primary: {
          50: withOpacity("--color-primary-50"),
          100: withOpacity("--color-primary-100"),
          200: withOpacity("--color-primary-200"),
          300: withOpacity("--color-primary-300"),
          400: withOpacity("--color-primary-400"),
          500: withOpacity("--color-primary-500"),
          600: withOpacity("--color-primary-600"),
          700: withOpacity("--color-primary-700"),
          800: withOpacity("--color-primary-800"),
          900: withOpacity("--color-primary-900"),
          950: withOpacity("--color-primary-950"),
          DEFAULT: withOpacity("--color-primary-500"),
        },
        success: {
          100: withOpacity("--color-success-100"),
          500: withOpacity("--color-success-500"),
          700: withOpacity("--color-success-700"),
        },
        warning: {
          100: withOpacity("--color-warning-100"),
          500: withOpacity("--color-warning-500"),
          700: withOpacity("--color-warning-700"),
        },
        danger: {
          100: withOpacity("--color-danger-100"),
          500: withOpacity("--color-danger-500"),
          700: withOpacity("--color-danger-700"),
        },
        info: {
          100: withOpacity("--color-info-100"),
          500: withOpacity("--color-info-500"),
          700: withOpacity("--color-info-700"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        lg: "0.5rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(16 19 26 / 0.04), 0 1px 3px rgb(16 19 26 / 0.06)",
        popover: "0 4px 16px -2px rgb(16 19 26 / 0.12), 0 2px 6px -1px rgb(16 19 26 / 0.06)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "zoom-in": { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-from-top": { from: { opacity: "0", transform: "translateY(-4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 120ms ease-out",
        "zoom-in": "zoom-in 120ms ease-out",
        "slide-in-from-top": "slide-in-from-top 120ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
