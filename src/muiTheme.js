// src/muiTheme.js
// Values come from src/styles/designTokens.js (IMAA design foundations, mockup `_foundations.css` v1.65).
// Phase 1 scope only: palette, elevation, fonts and low-risk component surfaces.
// Not yet changed (later phases): button shape/casing, shape.borderRadius, serif headings, typography scale.
import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { colors, fonts, hairline, radii } from './styles/designTokens';

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
