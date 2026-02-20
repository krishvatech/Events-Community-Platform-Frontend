import React from "react";
import { Box, Button, Typography } from "@mui/material";
import CoffeeIcon from "@mui/icons-material/Coffee";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

/**
 * HostBreakControls Component
 *
 * Floating control bar shown to the Host during a break.
 * Displays break countdown and button to end break.
 * The main stage remains visible behind this bar.
 */
export default function HostBreakControls({
  remainingSeconds,
  onEndBreak,
}) {
  const minutes = Math.floor((remainingSeconds || 0) / 60);
  const seconds = (remainingSeconds || 0) % 60;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 72,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        bgcolor: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(255,165,0,0.4)",
        borderRadius: 99,
        px: 2.5,
        py: 1.2,
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <CoffeeIcon sx={{ color: "rgba(255,165,0,0.85)", fontSize: 20 }} />
      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
        Break Active
      </Typography>
      {remainingSeconds > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AccessTimeRoundedIcon sx={{ fontSize: 16, color: "#4caf50" }} />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 14,
              color: "#4caf50",
              fontVariantNumeric: "tabular-nums",
              minWidth: 40,
            }}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </Typography>
        </Box>
      )}
      <Button
        size="small"
        onClick={onEndBreak}
        variant="contained"
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: 12,
          bgcolor: "#f97316",
          borderRadius: 99,
          px: 1.5,
          "&:hover": { bgcolor: "#ea6c10" },
        }}
      >
        End Break
      </Button>
    </Box>
  );
}
