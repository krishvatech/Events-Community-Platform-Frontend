// src/components/page/FilterToolbar.jsx
// Layout shell for a page's existing search/filter controls (phase A3 UI primitive).
//
// It owns NO filtering, query, debounce or reset behaviour: pages pass their existing controls in
// as children, and trailing controls (e.g. a page action) as `actions`. Extra props (e.g. role,
// aria-label) are forwarded to the wrapper. Styling comes from the IMAA design tokens (--imaa-*).
//
//   <FilterToolbar actions={<Button>…</Button>}>
//     <TextField … />      // the page's existing search field
//     <Select … />         // the page's existing filters
//   </FilterToolbar>
//
// Responsive: controls stack full-width below the `sm` breakpoint and sit in one wrapping row above
// it, with `actions` pushed to the end of the row.
import React from "react";
import { Box } from "@mui/material";

export default function FilterToolbar({ children, actions, surface = false, sx, ...rest }) {
  return (
    <Box
      {...rest}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        flexWrap: { sm: "wrap" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: 2,
        minWidth: 0,
        // Optional card surface (mockup toolbar card); off by default so adopting pages keep their look.
        ...(surface && {
          bgcolor: "background.paper",
          border: "1px solid var(--imaa-border)",
          borderRadius: "var(--imaa-radius-card)",
          p: 1.5,
        }),
        ...sx,
      }}
    >
      {children}
      {actions && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            flexWrap: { sm: "wrap" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1,
            ml: { sm: "auto" },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
