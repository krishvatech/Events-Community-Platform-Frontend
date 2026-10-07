// src/muiTheme.js
// Values come from src/styles/designTokens.js (IMAA design foundations, mockup `_foundations.css` v1.65).
// Phase 1 scope only: palette, elevation, fonts and low-risk component surfaces.
// Not yet changed (later phases): button shape/casing, shape.borderRadius, serif headings, typography scale.
import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { colors, fonts, hairline, radii } from './styles/designTokens';
import { COLOR_MODE_ATTRIBUTE, DARK_MODE_ENABLED, colorModeProviderProps } from './theme/colorMode';

// MUI's default elevation scale with the black shadow colour replaced by a softer navy tint.
// Offsets, blur and spread are unchanged, so elevation never changes layout.
const navyShadows = createTheme().shadows.map((shadow) =>
  shadow.replace(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g, (_, a) => `rgba(27,42,74,${+(parseFloat(a) * 0.8).toFixed(3)})`)
);

let theme = createTheme({
  palette: {
    mode: 'light',
    // Unchanged in Phase 1 (pending design approval). MUI gives #1bbbb3 dark button text (≈8:1);
    // brand teal (colors.teal #0A9396) would switch filled buttons to white text at ≈3.7:1, which
    // fails AA. Many buttons with hard-coded #10b8a6 backgrounds also rely on this dark text.
    // Brand teal is used for the focus ring and is available as a token.
    primary: { main: '#1bbbb3' },
    // Unchanged: used for Superuser chips/checkboxes and Live Meeting controls.
    secondary: { main: '#111827' },
    // error / warning / info / success intentionally keep MUI's semantic defaults.
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      cool: colors.bgCool, // public alternating sections (available, not applied yet)
      member: colors.bgMember, // member area (available, not applied yet)
    },
    text: {
      primary: colors.ink, // was #111827
      secondary: colors.inkBody, // was #6b7280; slightly darker, so contrast goes up
    },
    // Navy-tinted hairline (≈ #E2E4E8 on white). Kept translucent because MUI derives
    // table borders from it.
    divider: hairline,
  },
  shape: { borderRadius: 12 },
  shadows: navyShadows,
  typography: {
    fontFamily: fonts.sans,
    // Available for later heading work (e.g. sx={{ fontFamily: (t) => t.typography.fontFamilySerif }}).
    // Not applied to any variant yet.
    fontFamilySerif: fonts.serif,
  },
  components: {
    // Text fields: brand-tinted resting border plus a soft focus ring. Hover, focus, error and
    // disabled keep MUI's stronger state colours. Label behaviour (floating) is unchanged.
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: 'rgba(27, 42, 74, 0.3)' },
        root: ({ theme: t }) => ({
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}` },
          '&.Mui-focused.Mui-error': { boxShadow: `0 0 0 3px ${alpha(t.palette.error.main, 0.15)}` },
        }),
      },
    },
    // Chips: consistent label weight; neutral outlined chips use the brand hairline tint.
    // Coloured chips keep their palette colours (no business-state remapping).
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
        outlined: ({ ownerState }) =>
          ownerState.color === 'default' || !ownerState.color ? { borderColor: 'rgba(27, 42, 74, 0.25)' } : {},
      },
    },
    // Standard alerts get a 3px left accent in their severity colour (mockup alert family).
    // Filled/outlined variants, severity colours and alert behaviour are unchanged.
    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState, theme: t }) => {
          if ((ownerState.variant || 'standard') !== 'standard') return {};
          const palette = t.palette[ownerState.color || ownerState.severity || 'success'];
          return palette?.main ? { borderLeft: `3px solid ${palette.main}` } : {};
        },
      },
    },
    // Tooltips: brand navy instead of translucent grey (higher text contrast).
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: colors.navy },
        arrow: { color: colors.navy },
      },
    },
    // Menus, select lists and popovers: hairline border and 8px corners.
    // Elevation comes from the navy-tinted shadows above.
    MuiPopover: {
      styleOverrides: {
        paper: { border: `1px solid ${hairline}`, borderRadius: radii.card },
      },
    },
  },
});

// Extra brand colours for later phases (e.g. <Button color="navy">). Nothing uses them yet.
theme = createTheme(theme, {
  palette: {
    navy: theme.palette.augmentColor({ color: { main: colors.navy }, name: 'navy' }),
    coral: theme.palette.augmentColor({ color: { main: colors.coral }, name: 'coral' }),
  },
});

theme = responsiveFontSizes(theme);
export default theme;

// ── Colour-scheme theme (dark mode, phase D2) ───────────────────────────────────────────────
// Used instead of the theme above only when VITE_ENABLE_DARK_MODE is "true" (see
// src/theme/colorMode.js). With the flag off nothing below is used.
// The light scheme repeats the palette above value for value; the dark scheme changes only
// grounds, text and lines. Brand colours (primary, navy, coral, teal focus ring) are fixed.
// MUI writes the active scheme to <html data-imaa-color-mode="light|dark">; the semantic
// --imaa-* variables in src/styles/brand.css key off the same attribute.

// Dark values: keep in sync with the [data-imaa-color-mode="dark"] block in brand.css.
const darkPalette = {
  primary: { main: '#1bbbb3' },
  // Light secondary (#111827) disappears on dark grounds; a light grey keeps it visible.
  secondary: { main: '#D5DBE5' },
  background: { default: '#0E1626', paper: '#16213A', cool: '#121D33', member: '#0E1626' },
  text: { primary: '#E8ECF3', secondary: '#B3BCCB' },
  // Same as --imaa-hairline (dark): ≈ #303D5E on the card surface.
  divider: 'rgba(226, 232, 240, 0.16)',
  // Disabled text/icons: MUI's dark default (white at 30%) is about 2:1 on dark cards and reads as
  // missing; 40% stays clearly disabled but legible. Other action values keep MUI's dark defaults.
  action: { disabled: 'rgba(255, 255, 255, 0.4)' },
};

export const colorModeTheme = responsiveFontSizes(
  createTheme({
    cssVariables: { colorSchemeSelector: COLOR_MODE_ATTRIBUTE },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: '#1bbbb3' },
          secondary: { main: '#111827' },
          background: { default: '#ffffff', paper: '#ffffff', cool: colors.bgCool, member: colors.bgMember },
          text: { primary: colors.ink, secondary: colors.inkBody },
          divider: hairline,
          navy: theme.palette.navy,
          coral: theme.palette.coral,
        },
      },
      // Brand navy is lifted on dark grounds (same value as --imaa-navy in brand.css dark block).
      dark: {
        palette: {
          ...darkPalette,
          navy: theme.palette.augmentColor({ color: { main: '#2F4675' }, name: 'navy' }),
          coral: theme.palette.coral,
        },
      },
    },
    shape: { borderRadius: 12 },
    shadows: navyShadows,
    typography: { fontFamily: fonts.sans, fontFamilySerif: fonts.serif },
    // Same overrides as above. Fixed light colours become CSS variables from brand.css (with the
    // light value as fallback) or MUI palette variables, so they follow the active scheme.
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: { borderColor: 'var(--imaa-input-outline, rgba(27, 42, 74, 0.3))' },
          root: ({ theme: t }) => ({
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}` },
            '&.Mui-focused.Mui-error': {
              boxShadow: `0 0 0 3px rgba(${t.vars.palette.error.mainChannel} / 0.15)`,
            },
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
          outlined: ({ ownerState }) =>
            ownerState.color === 'default' || !ownerState.color
              ? { borderColor: 'var(--imaa-chip-outline, rgba(27, 42, 74, 0.25))' }
              : {},
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ ownerState, theme: t }) => {
            if ((ownerState.variant || 'standard') !== 'standard') return {};
            const palette = t.vars.palette[ownerState.color || ownerState.severity || 'success'];
            return palette?.main ? { borderLeft: `3px solid ${palette.main}` } : {};
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: 'var(--imaa-tooltip-bg, #1B2A4A)' },
          arrow: { color: 'var(--imaa-tooltip-bg, #1B2A4A)' },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: ({ theme: t }) => ({ border: `1px solid ${t.vars.palette.divider}`, borderRadius: radii.card }),
        },
      },
      // Dialogs: no dark-mode elevation overlay. At elevation 24 MUI lightens the paper with ~16% white,
      // which turns dialogs a washed-out grey and makes fields look darker than the dialog. Dialogs
      // use the standard card surface instead. Light mode has no overlay, so nothing changes there.
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundImage: 'none' },
        },
      },
    },
  })
);

// What both entry points (src/main.jsx, src/providers/AppProviders.jsx) give MUI's ThemeProvider.
// Dark mode disabled: the original theme above with no extra props, exactly as before D2.
export const appTheme = DARK_MODE_ENABLED ? colorModeTheme : theme;
export const appThemeProviderProps = DARK_MODE_ENABLED ? colorModeProviderProps : {};
