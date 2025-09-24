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
    color: "#2E5BFF",
    tint: "rgba(46,91,255,0.14)",
  },
  {
    title: "Professional Network",
    // desc: "Connect with peers and industry experts.",
    Icon: AccountTreeRoundedIcon,
    color: "#00C853",
    tint: "rgba(0,200,83,0.14)",
  },
  {
    title: "Exclusive Events",
    // desc: "Participate in transformative events.",
    Icon: EventAvailableRoundedIcon,
    color: "#AA00FF",
    tint: "rgba(170,0,255,0.14)",
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
            borderRadius: 1,                 // small, not pill
            border: "1px solid #E6EAF2",
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
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

          <Typography variant="subtitle1" fontWeight={400} fontSize={14} color="Grey">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {desc}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
