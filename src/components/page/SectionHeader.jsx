// src/components/page/SectionHeader.jsx
// Heading for a section inside a member/public page (phase A3 UI primitive).
// For the page title itself, use PageHeader.
//
// Visual reference: mockup section headings (serif title + muted description + optional action).
// Styling comes from the IMAA design tokens in src/styles/brand.css (--imaa-*). Layout only.
//
//   <SectionHeader
//     title="Upcoming sessions"         // required; <h2> by default (use titleComponent="h3" when nested)
//     description="Optional one line"   // optional
//     action={<Button>…</Button>}       // optional; wraps below on narrow screens
//   />
import React from "react";
import { Box, Typography } from "@mui/material";

// A plain heading element is used because index.css forces the body font onto `.MuiTypography-root`.
const titleSx = {
  m: 0,
  fontFamily: "var(--imaa-font-serif)",
  fontWeight: 700,
  fontSize: "1.125rem", // 18px
  lineHeight: 1.3,
  color: "var(--imaa-ink)",
  overflowWrap: "anywhere",
};

const descriptionSx = {
  m: 0,
  mt: 0.5,
  fontSize: "0.8125rem", // 13px
  lineHeight: 1.5,
  color: "var(--imaa-ink-body)",
};

export default function SectionHeader({ title, description, action, titleComponent = "h2", sx }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        columnGap: 2,
        rowGap: 1,
        mb: 1.5,
        ...sx,
      }}
    >
      <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
        <Box component={titleComponent} sx={titleSx}>
          {title}
        </Box>
        {description && (
          <Typography component="p" sx={descriptionSx}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>{action}</Box>}
    </Box>
  );
}
