// src/components/page/PageHeader.jsx
// Member/public page header: the page title block (phase A3 UI primitive).
//
// Visual reference: mockup connect-page-headers.html (serif title, muted subtitle, actions on the right).
// Styling comes from the IMAA design tokens in src/styles/brand.css (--imaa-*).
// Layout only: it renders the content and actions it is given and owns no behaviour.
//
//   <PageHeader
//     title="My Events"                 // required; rendered as the page's <h1> by default
//     subtitle="Short description"      // optional
//     eyebrow="Explore"                 // optional small label above the title
//     leading={<BackLink />}            // optional element above the title (e.g. a back link)
//     actions={<Button>…</Button>}      // optional; wraps below the title on narrow screens
//   >
//     {optional content below the header, e.g. tabs}
//   </PageHeader>
import React from "react";
import { Box, Typography } from "@mui/material";

// Page titles use the design heading font. A plain <h1> (not MUI Typography) is used because
// index.css forces the body font onto `.MuiTypography-root`.
const titleSx = {
  m: 0,
  fontFamily: "var(--imaa-font-serif)",
  fontWeight: 700,
  fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" }, // 24 / 28 / 32px
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  color: "var(--imaa-ink)",
  overflowWrap: "anywhere",
};

const eyebrowSx = {
  m: 0,
  mb: 0.5,
  fontSize: "0.6875rem", // 11px
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--imaa-ink-body)",
};

const subtitleSx = {
  m: 0,
  mt: 0.5,
  fontSize: "0.875rem",
  lineHeight: 1.55,
  color: "var(--imaa-ink-body)",
  maxWidth: "var(--imaa-prose-max)",
};

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  leading,
  actions,
  children,
  titleComponent = "h1",
  sx,
}) {
  return (
    <Box sx={{ mb: { xs: 1.5, sm: 2 }, ...sx }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          columnGap: 3,
          rowGap: 1.5,
        }}
      >
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          {leading && <Box sx={{ mb: 1 }}>{leading}</Box>}
          {eyebrow && (
            <Typography component="p" sx={eyebrowSx}>
              {eyebrow}
            </Typography>
          )}
          <Box component={titleComponent} sx={titleSx}>
            {title}
          </Box>
          {subtitle && (
            <Typography component="p" sx={subtitleSx}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>{actions}</Box>
        )}
      </Box>
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  );
}
