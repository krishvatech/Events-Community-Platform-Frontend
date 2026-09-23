// src/components/community/imaaCommunityTheme.js
// Presentation-only MUI theme for the IMAA-styled Community pages
// (Live Feed, Members, My Contacts, Messages, My Posts, Notifications).
// It extends the app theme so dialogs/menus rendered in portals match too.
import { createTheme } from "@mui/material/styles";
import baseTheme from "../../muiTheme";

export const IMAA = {
  navy: "#1B2A4A",
  navy2: "#2C3E5A",
  coral: "#E8532F",
  coralHover: "#CC4422",
  coralLight: "#FEF2EE",
  teal: "#0A9396",
  tealHover: "#077B7E",
  tealLight: "#E8F7F7",
  bg: "#F6F8FB",
  border: "#E3E8EF",
  borderStrong: "#C9D2DE",
  text: "#1B2A4A",
  body: "#4F5B6B",
  muted: "#667085",
  hint: "#98A2B3",
  danger: "#B42318",
  shadowSm: "0 1px 2px rgba(27, 42, 74, 0.06)",
  shadowMd: "0 6px 18px rgba(27, 42, 74, 0.10)",
};

const imaaCommunityTheme = createTheme(baseTheme, {
  palette: {
    primary: { main: IMAA.teal, light: "#3FB0B2", dark: IMAA.tealHover, contrastText: "#FFFFFF" },
    secondary: { main: IMAA.navy, light: IMAA.navy2, dark: "#111C33", contrastText: "#FFFFFF" },
    text: { primary: IMAA.text, secondary: IMAA.muted },
    divider: IMAA.border,
    background: { default: IMAA.bg, paper: "#FFFFFF" },
  },
  // Numeric sx radii scale from this: 2 → 8px, 3 → 12px.
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8, boxShadow: "none" },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundColor: IMAA.coral,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: IMAA.coralHover, boxShadow: "none" },
          },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: IMAA.border,
            color: IMAA.navy,
            "&:hover": { borderColor: IMAA.borderStrong, backgroundColor: IMAA.bg },
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
      variants: [
        {
          props: { color: "primary", variant: "filled" },
          style: {
            backgroundColor: IMAA.navy,
            color: "#FFFFFF",
            "&.MuiChip-clickable:hover": { backgroundColor: IMAA.navy2 },
          },
        },
      ],
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: IMAA.coral, height: 3, borderRadius: "3px 3px 0 0" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          color: IMAA.muted,
          "&.Mui-selected": { color: IMAA.navy },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: IMAA.border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: IMAA.borderStrong },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: IMAA.teal, borderWidth: 1 },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          "&.Mui-selected": {
            backgroundColor: IMAA.navy,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: IMAA.teal },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${IMAA.border}`,
          boxShadow: "0 12px 32px rgba(27, 42, 74, 0.18)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { color: IMAA.navy, fontWeight: 700, fontSize: 18 } },
    },
    MuiBadge: {
      styleOverrides: { colorPrimary: { backgroundColor: IMAA.coral, color: "#FFFFFF" } },
    },
    MuiLinearProgress: {
      styleOverrides: { colorPrimary: { backgroundColor: "#D5EEEE" } },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 10, border: `1px solid ${IMAA.border}`, boxShadow: IMAA.shadowMd },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: IMAA.navy, fontSize: 12 } },
    },
  },
});

export default imaaCommunityTheme;
