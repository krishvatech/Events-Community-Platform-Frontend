// src/components/page/EmptyState.jsx
// Empty / no-results message for member/public pages (phase A3 UI primitive).
//
// Shows only what the page passes in: an optional decorative icon, a title, an optional description
// and an optional action. It never adds actions of its own. Styling comes from the IMAA design tokens
// (--imaa-*).
//
//   <EmptyState
//     icon={<SchoolRoundedIcon />}       // optional, decorative (hidden from screen readers)
//     title="No courses found"           // required; <h2> by default
//     description="Optional guidance"    // optional
//     action={<Button>…</Button>}        // optional: the page's existing action only
//     surface={false}                    // optional: drop the bordered card when embedding inline
//   />
import React from "react";
import { Box, Typography } from "@mui/material";

// A plain heading element is used because index.css forces the body font onto `.MuiTypography-root`.
const titleSx = {
  m: 0,
  fontFamily: "var(--imaa-font-serif)",
  fontWeight: 700,
  fontSize: "1.125rem", // 18px
  lineHeight: 1.35,
  color: "var(--imaa-ink)",
};

const descriptionSx = {
  m: 0,
  mt: 0.75,
  mx: "auto",
  maxWidth: 480,
  fontSize: "0.875rem",
  lineHeight: 1.55,
  color: "var(--imaa-ink-body)",
};

export default function EmptyState({ icon, title, description, action, surface = true, titleComponent = "h2", sx }) {
  return (
    <Box
      sx={{
        textAlign: "center",
        px: { xs: 2, sm: 4 },
        py: { xs: 5, sm: 6 },
        ...(surface && {
          bgcolor: "background.paper",
          border: "1px solid var(--imaa-border)",
          borderRadius: "var(--imaa-radius-card)",
        }),
        ...sx,
      }}
    >
      {icon && (
        <Box
          aria-hidden="true"
          sx={{ display: "inline-flex", mb: 1.5, color: "var(--imaa-ink-hint)", "& svg": { fontSize: 48 } }}
        >
          {icon}
        </Box>
      )}
      <Box component={titleComponent} sx={titleSx}>
        {title}
      </Box>
      {description && (
        <Typography component="p" sx={descriptionSx}>
          {description}
        </Typography>
      )}
      {action && (
        <Box sx={{ mt: 2.5, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>{action}</Box>
      )}
    </Box>
  );
}
