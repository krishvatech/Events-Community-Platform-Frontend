// src/components/FeaturesSection.jsx
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";

const FEATURES = [
  {
    title: "Continuous Learning",
    // desc: "Keep your knowledge up-to-date with new content.",
    Icon: MenuBookRoundedIcon,
    color: "var(--imaa-teal)",
    tint: "rgba(10,147,150,0.12)",
  },
  {
    title: "Professional Network",
    // desc: "Connect with peers and industry experts.",
    Icon: AccountTreeRoundedIcon,
    color: "var(--imaa-orange)",
    tint: "rgba(232,83,47,0.12)",
  },
  {
    title: "Exclusive Events",
    // desc: "Participate in transformative events.",
    Icon: EventAvailableRoundedIcon,
    color: "var(--imaa-purple)",
    tint: "rgba(123,45,142,0.12)",
  },
];

export default function FeaturesSection() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {FEATURES.map(({ title, desc, Icon, color, tint }) => (
        <Paper
          key={title}
          elevation={0}
          sx={{
            p: 2.25,
            borderRadius: "var(--imaa-radius-card)",
            border: "1px solid var(--imaa-border)",
            boxShadow: "var(--imaa-shadow-sm)",
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              backgroundColor: tint,
              mb: 1.25,
            }}
          >
            <Icon sx={{ fontSize: 24, color }} />
          </Box>

          {/* Feature name (was an <h6> via subtitle1, in "Grey" text below AA contrast) */}
          <Typography variant="subtitle1" component="p" fontWeight={500} fontSize={14} sx={{ color: "var(--imaa-ink)" }}>
            {title}
          </Typography>
          {desc && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {desc}
            </Typography>
          )}
        </Paper>
      ))}
    </Box>
  );
}
