// IMAA design foundations: shared design values for JavaScript.
//
// Source: the IMAA design-system mockup `_foundations.css` v1.65 (2026-06-07).
// Used by src/muiTheme.js and tailwind.config.js. CSS code should use the matching
// custom properties in src/styles/brand.css (`--imaa-*`). Keep the two in sync.
//
// This module must stay dependency-free: Tailwind loads it in Node at build time.

export const colors = {
  navy: "#1B2A4A",
  coral: "#E84C38",
  teal: "#0A9396",
  // Existing --imaa-teal-hover. White text on it passes WCAG AA (≈5:1); on `teal` it is ≈3.7:1.
  tealDark: "#077B7E",
  link: "#4A7DB5",

  // Grounds
  bgCool: "#F0F4F5", // public alternating sections
  bgMember: "#F7F8FA", // member (Connect) area
  white: "#FFFFFF",

  // Text ladder
  ink: "#1B2A4A", // headings / primary text
  inkBody: "#5A6070", // body text
  inkMeta: "#747A88", // metadata; below AA for small text on white, so use for ≥14px or non-essential text
  inkHint: "#B0B4BC", // placeholders, disabled text

  // Borders
  border: "#E2E4E8",
  borderHover: "#D1CFC9",
};

export const fontStacks = {
  sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  // "Source Serif 4" must stay quoted: a family name containing a number is not a valid unquoted CSS identifier.
  serif: ['"Source Serif 4"', "Georgia", "serif"],
};

export const fonts = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
};

// Navy-tinted elevation (the mockup never uses black shadows).
export const shadows = {
  sm: "0 1px 2px rgba(27, 42, 74, 0.08)",
  md: "0 4px 12px rgba(27, 42, 74, 0.12)",
  lg: "0 12px 32px rgba(27, 42, 74, 0.20)",
};

// Neutral hairline used for dividers and outlines. It is translucent (≈ #E2E4E8 on white)
// so MUI's derived table borders and borders on tinted grounds keep working.
export const hairline = "rgba(27, 42, 74, 0.13)";

export const radii = { tag: 4, field: 6, card: 8, popup: 12, pill: 999 };

export const layout = { contentMax: 1200, proseMax: 700, sectionSpacing: 60 };

// Keyboard focus ring. The mockup defines none. Teal is ≥3:1 against white, cream and navy grounds.
export const focus = { color: colors.teal, width: 2, offset: 2 };

// Dark-mode aware colours for CSS-in-JS (sx / style props). Each is the light value from `colors`
// wrapped in its dark-mode override token (src/styles/brand.css), so it is identical in light mode
// and readable in dark mode. Keep using `colors` for brand fills and anywhere a parsable hex is
// required (alpha(), hex-alpha suffixes, Tailwind, the MUI palette).
const darkAware = (role, hex) => `var(--imaa-dm-${role}, ${hex})`;
export const semanticColors = {
  surface: darkAware("surface", colors.white), // cards, panels, rings that match the card
  surfaceCool: darkAware("surface-alt", colors.bgCool),
  page: darkAware("page", colors.bgMember),
  text: darkAware("text", colors.ink), // headings / primary text (also navy used as text)
  textBody: darkAware("text-body", colors.inkBody),
  textMeta: darkAware("text-meta", colors.inkMeta),
  border: darkAware("border", colors.border),
  borderHover: darkAware("border-strong", colors.borderHover),
  tealText: darkAware("teal-text", colors.tealDark), // teal links / labels
  coralText: darkAware("orange-text", colors.coral),
};
