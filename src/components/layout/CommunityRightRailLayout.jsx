// src/components/layout/CommunityRightRailLayout.jsx
import * as React from "react";
import { Box, Grid, Stack } from "@mui/material";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

export default function CommunityRightRailLayout({ user, stats, tags, children }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={9}>
        {children}
      </Grid>
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box sx={{ position: "sticky", top: 88 }}>
          <Stack spacing={2}>
            <CommunityProfileCard user={user} stats={stats} tags={tags} />
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}
