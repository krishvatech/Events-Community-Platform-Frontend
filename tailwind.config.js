// tailwind.config.js
import { colors, fontStacks, shadows } from "./src/styles/designTokens.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand values from src/styles/designTokens.js. Tailwind's own palette (teal-600, slate-200, …)
        // is untouched. `primary` / `secondary` were unused placeholder blue/purple values.
        primary: {
          DEFAULT: colors.teal,
          dark: colors.tealDark,
          light: "#E8F7F7", // existing --imaa-teal-light
        },
        secondary: {
          DEFAULT: colors.navy,
          dark: colors.navy,
          light: "#2C3E5A", // existing --imaa-navy-2
        },
        imaa: {
          navy: colors.navy,
          coral: colors.coral,
          teal: colors.teal,
          "teal-dark": colors.tealDark,
          link: colors.link,
          cool: colors.bgCool,
          member: colors.bgMember,
          ink: colors.ink,
          body: colors.inkBody,
          meta: colors.inkMeta,
          hint: colors.inkHint,
          border: colors.border,
          "border-hover": colors.borderHover,
        },
      },
      fontFamily: {
        // Inter body/UI stack (also set globally in index.css)
        sans: [...fontStacks.sans, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"],
        display: fontStacks.sans,
        // Source Serif 4, available for later heading work (`font-serif`); not applied anywhere yet
        serif: fontStacks.serif,
      },
      boxShadow: {
        "imaa-sm": shadows.sm,
        "imaa-md": shadows.md,
        "imaa-lg": shadows.lg,
      },
    },
  },
  plugins: [],
};
