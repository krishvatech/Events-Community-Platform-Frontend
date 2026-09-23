// src/theme/imaaTokens.js
// IMAA Institute design tokens shared by the Admin Event Details screens.
// Presentation only — no behaviour, no data, no API concerns.

export const NAVY = "#1B2A4A";
export const CORAL = "#E8532F";
export const CORAL_DARK = "#CF4525";
export const TEAL = "#0A9396";
export const TEAL_DARK = "#087F82";
export const BG = "#F6F8FB";
export const BORDER = "#E3E8EF";
export const BORDER_STRONG = "#D9E0E8";
export const MUTED = "#64748B";
export const CARD_SHADOW = "0 2px 8px rgba(16,24,40,0.05)";
export const CARD_SHADOW_HOVER = "0 10px 24px rgba(27,42,74,0.10)";

export const CARD_SX = {
  border: `1px solid ${BORDER}`,
  borderRadius: 3,
  bgcolor: "#fff",
  boxShadow: CARD_SHADOW,
};

// Primary CTA = coral, per the IMAA button hierarchy.
export const PRIMARY_BTN_SX = {
  textTransform: "none",
  fontWeight: 600,
  borderRadius: 2,
  px: 2.5,
  bgcolor: CORAL,
  color: "#fff",
  boxShadow: "none",
  "&:hover": { bgcolor: CORAL_DARK, boxShadow: "none" },
  "&.Mui-disabled": { bgcolor: "#CBD5E1", color: "#fff" },
};

// Supporting accent = teal.
export const ACCENT_BTN_SX = {
  ...PRIMARY_BTN_SX,
  bgcolor: TEAL,
  "&:hover": { bgcolor: TEAL_DARK, boxShadow: "none" },
};

export const OUTLINE_BTN_SX = {
  textTransform: "none",
  fontWeight: 600,
  borderRadius: 2,
  px: 2.5,
  color: NAVY,
  borderColor: BORDER_STRONG,
  bgcolor: "#fff",
  "&:hover": { borderColor: TEAL, bgcolor: "rgba(10,147,150,0.06)" },
};

export const SUBTLE_BTN_SX = {
  textTransform: "none",
  fontWeight: 600,
  borderRadius: 2,
  color: MUTED,
  "&:hover": { bgcolor: "rgba(27,42,74,0.05)", color: NAVY },
};

// Destructive, but on the IMAA scale rather than raw MUI red.
export const DANGER_BTN_SX = {
  textTransform: "none",
  fontWeight: 600,
  borderRadius: 2,
  px: 2.5,
  color: "#B91C1C",
  borderColor: "#FECACA",
  bgcolor: "#fff",
  "&:hover": { borderColor: "#B91C1C", bgcolor: "rgba(185,28,28,0.06)" },
};

export const BTN_SHAPE_SX = { textTransform: "none", fontWeight: 600, borderRadius: 2 };

export const FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "#fff",
    "& fieldset": { borderColor: BORDER },
    "&:hover fieldset": { borderColor: "#CBD5E1" },
    "&.Mui-focused fieldset": { borderColor: TEAL, borderWidth: 2 },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: TEAL },
};

export const chipSx = (fg, bg, bd) => ({
  height: 24,
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 1.5,
  color: fg,
  bgcolor: bg,
  border: `1px solid ${bd}`,
  "& .MuiChip-icon": { color: `${fg} !important`, fontSize: 15, ml: 0.75 },
  "& .MuiChip-label": { px: 1 },
});

export const BADGE_LIVE = chipSx(CORAL, "rgba(232,83,47,0.10)", "rgba(232,83,47,0.26)");
export const BADGE_UPCOMING = chipSx(TEAL_DARK, "rgba(10,147,150,0.10)", "rgba(10,147,150,0.22)");
export const BADGE_NEUTRAL = chipSx(MUTED, "#F1F5F9", BORDER);
export const BADGE_NAVY = chipSx(NAVY, "rgba(27,42,74,0.07)", "rgba(27,42,74,0.16)");
export const BADGE_OUTLINE = chipSx(MUTED, "#fff", BORDER);

export const DIALOG_TITLE_SX = {
  fontWeight: 800,
  fontSize: 19,
  color: NAVY,
  borderBottom: `1px solid ${BORDER}`,
  py: 2,
};

export const DIALOG_PAPER_SX = { borderRadius: 3, border: `1px solid ${BORDER}` };

export const DIALOG_ACTIONS_SX = {
  px: 3,
  py: 2.25,
  borderTop: `1px solid ${BORDER}`,
  bgcolor: BG,
  gap: 1,
};

export const UPLOAD_BOX_SX = {
  position: "relative",
  borderRadius: 2,
  border: "1px dashed #CBD5E1",
  bgcolor: BG,
  color: "#AEBACB",
  transition: "border-color .2s ease, background-color .2s ease",
  "&:hover": { borderColor: TEAL, bgcolor: "rgba(10,147,150,0.04)" },
};

export const TABLE_SX = {
  border: `1px solid ${BORDER}`,
  borderRadius: 2,
  "& .MuiTableHead-root .MuiTableCell-root": {
    bgcolor: BG,
    color: NAVY,
    fontWeight: 700,
    fontSize: 12.5,
    borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap",
  },
  "& .MuiTableCell-root": { borderBottom: `1px solid ${BORDER}`, fontSize: 13.5, color: "#334155" },
  "& .MuiTableBody-root .MuiTableRow-root:hover": { bgcolor: "rgba(10,147,150,0.04)" },
};

export const TABS_SX = {
  minHeight: 48,
  "& .MuiTab-root": {
    textTransform: "none",
    fontWeight: 700,
    minHeight: 48,
    fontSize: 13.5,
    letterSpacing: 0.2,
    color: MUTED,
    "&:hover": { color: NAVY },
  },
  "& .Mui-selected": { color: `${NAVY} !important` },
  "& .MuiTabs-indicator": { backgroundColor: CORAL, height: 3, borderRadius: 3 },
};

export const PAGINATION_SX = {
  "& .MuiPaginationItem-root": {
    borderRadius: 2,
    fontWeight: 600,
    color: NAVY,
    border: `1px solid ${BORDER}`,
    bgcolor: "#fff",
    minWidth: 34,
    height: 34,
    "&:hover": { bgcolor: "rgba(10,147,150,0.08)", borderColor: TEAL },
  },
  "& .MuiPaginationItem-root.Mui-selected": {
    bgcolor: NAVY,
    color: "#fff",
    borderColor: NAVY,
    "&:hover": { bgcolor: "#16233D" },
  },
  "& .MuiPaginationItem-ellipsis": { border: "none", bgcolor: "transparent" },
};

// Teal when on, neutral grey when off.
export const SWITCH_SX = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: TEAL },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: TEAL, opacity: 0.5 },
  "& .MuiSwitch-switchBase": { color: "#fff" },
  "& .MuiSwitch-track": { backgroundColor: "#CBD5E1", opacity: 1 },
  "& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track": { backgroundColor: "#E2E8F0", opacity: 1 },
};
