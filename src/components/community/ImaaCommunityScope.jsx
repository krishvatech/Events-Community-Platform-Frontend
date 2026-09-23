// src/components/community/ImaaCommunityScope.jsx
// Presentation-only wrapper: applies the IMAA community theme and a scoping
// class for src/styles/communityPagesImaa.css. Holds no state or logic.
import * as React from "react";
import { Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import imaaCommunityTheme from "./imaaCommunityTheme";

export default function ImaaCommunityScope({ page, children }) {
  return (
    <ThemeProvider theme={imaaCommunityTheme}>
      <Box className={`ecp-community-page ecp-community-page--${page}`}>{children}</Box>
    </ThemeProvider>
  );
}
