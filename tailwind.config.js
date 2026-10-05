// tailwind.config.js
import defaultColors from "tailwindcss/colors";
import { colors, fontStacks, shadows } from "./src/styles/designTokens.js";

// ── Dark mode ────────────────────────────────────────────────────────────────────────────────
// Neutral and status utilities that assume a light page (bg-white, bg-slate-50, text-slate-600,
// border-slate-200, bg-red-50, text-teal-700, …) read the dark-mode override tokens from
// src/styles/brand.css. Each colour is `rgb(var(--imaa-dm-ROLE-rgb, <Tailwind's own channels>))`:
// the tokens exist only in dark mode, so light mode renders Tailwind's original value.
// Only light-page shades are mapped: light text for dark sections (text-white, text-slate-200,
// text-teal-300), solid fills (bg-slate-800, bg-teal-600) and brand colours keep their values.
const channels = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
};
const dm = (role, lightHex) => `rgb(var(--imaa-dm-${role}-rgb, ${channels(lightHex)}) / <alpha-value>)`;
const NEUTRALS = ["gray", "slate", "zinc", "neutral", "stone"];
const HUE_FAMILY = {
  red: "red", rose: "red", pink: "red", orange: "orange", amber: "amber", yellow: "amber",
  lime: "green", green: "green", emerald: "green", teal: "teal", cyan: "teal",
  sky: "blue", blue: "blue", indigo: "blue", violet: "purple", purple: "purple", fuchsia: "purple",
};
// { gray: { 50: role, ... }, ... } for neutral scales; { red: { 50: role } ... } for hues.
const mapScales = (neutralRoles, hueRoles) => {
  const out = {};
  for (const name of NEUTRALS) {
    out[name] = {};
    for (const [shade, role] of Object.entries(neutralRoles)) out[name][shade] = dm(role, defaultColors[name][shade]);
  }
  for (const [name, family] of Object.entries(HUE_FAMILY)) {
    out[name] = {};
    for (const [shade, role] of Object.entries(hueRoles)) out[name][shade] = dm(role.replace("*", family), defaultColors[name][shade]);
  }
  return out;
};
const darkAwareBackground = {
  white: dm("surface", "#ffffff"),
  ...mapScales({ 50: "surface-hover", 100: "muted", 200: "muted", 300: "muted-strong" }, { 50: "tint-*", 100: "tint-*", 200: "tint-*-border" }),
  imaa: { cool: dm("surface-alt", colors.bgCool), member: dm("page", colors.bgMember) },
};
// Hue text that is too dark to read on the dark card surface (< 4.5:1) gets the lighter variant
// of its hue in dark mode; brighter shades keep their value.
const luminance = (hex) => {
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = channels(hex).split(" ").map((v) => lin(Number(v) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const DARK_SURFACE_LUMINANCE = luminance("#16213A"); // --imaa-dm-surface
const lowContrastOnDark = (hex) => (luminance(hex) + 0.05) / (DARK_SURFACE_LUMINANCE + 0.05) < 4.5;
const hueText500 = {};
for (const [name, family] of Object.entries(HUE_FAMILY)) {
  if (lowContrastOnDark(defaultColors[name][500])) hueText500[name] = { 500: dm(`${family}-text`, defaultColors[name][500]) };
}
const darkAwareText = {
  black: dm("text", "#000000"),
  ...mapScales(
    { 500: "text-meta", 600: "text-body", 700: "text-2", 800: "text", 900: "text", 950: "text" },
    { 600: "*-text", 700: "*-text", 800: "*-text", 900: "*-text", 950: "*-text" }
  ),
  imaa: {
    ink: dm("text", colors.ink), body: dm("text-body", colors.inkBody), meta: dm("text-meta", colors.inkMeta), hint: dm("text-hint", colors.inkHint),
    // brand hues used as text (links, teal labels): lighter variant only where contrast requires it
    teal: dm("teal-text", colors.teal), "teal-dark": dm("teal-text", colors.tealDark), link: dm("blue-text", colors.link),
  },
};
for (const [name, shades] of Object.entries(hueText500)) Object.assign(darkAwareText[name], shades);
const darkAwareBorder = {
  white: dm("surface", "#ffffff"),
  ...mapScales({ 100: "border", 200: "border", 300: "border-strong", 400: "border-strong" }, { 100: "tint-*-border", 200: "tint-*-border", 300: "tint-*-border" }),
  imaa: { border: dm("border", colors.border), "border-hover": dm("border-strong", colors.borderHover) },
};
const darkAwareLines = mapScales({ 100: "border", 200: "border", 300: "border-strong" }, {});
const darkAwarePlaceholder = mapScales({ 400: "text-hint", 500: "text-meta" }, {});
const darkAwareGradient = {
  white: dm("surface", "#ffffff"),
  ...mapScales({ 50: "surface-hover", 100: "muted" }, { 50: "tint-*", 100: "tint-*" }),
};

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
      // Dark-mode aware utilities (see the top of this file). Light values are unchanged.
      backgroundColor: darkAwareBackground,
      textColor: darkAwareText,
      borderColor: darkAwareBorder,
      divideColor: darkAwareLines,
      ringColor: darkAwareLines,
      placeholderColor: darkAwarePlaceholder,
      gradientColorStops: darkAwareGradient,
    },
  },
  plugins: [],
};
