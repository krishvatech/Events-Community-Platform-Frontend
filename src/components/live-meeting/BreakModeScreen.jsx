import React from "react";
import { Box, Typography, Button, LinearProgress, Paper } from "@mui/material";
import CoffeeIcon from "@mui/icons-material/Coffee";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import MicOffIcon from "@mui/icons-material/MicOff";

/**
 * BreakModeScreen Component
 *
 * Full-screen overlay shown to participants during a break.
 * Displays countdown timer, break message, and option to join Social Lounge.
 */
export default function BreakModeScreen({
  remainingSeconds,
  durationSeconds,
  loungeEnabled,
  onOpenLounge,
}) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = durationSeconds > 0
    ? ((durationSeconds - remainingSeconds) / durationSeconds) * 100
    : 0;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        bgcolor: "#05070D",
        backgroundImage:
          "radial-gradient(700px 350px at 50% 0%, rgba(60,80,180,0.22), transparent 55%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: "#E5E7EB",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: "100%",
          borderRadius: 4,
          p: { xs: 3, sm: 4 },
          bgcolor: "rgba(15,23,42,0.65)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(14px)",
          textAlign: "center",
        }}
      >
        {/* Coffee Icon */}
        <Box sx={{ mb: 2 }}>
          <CoffeeIcon sx={{ fontSize: 52, color: "rgba(255,255,255,0.75)" }} />
        </Box>

        {/* Heading */}
        <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 0.5 }}>
          We're on a break
        </Typography>
        <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.60)", mb: 3 }}>
          The session will resume shortly. Sit tight!
        </Typography>

        {/* Mic & Camera Disabled Note */}
        <Box sx={{ bgcolor: "rgba(239, 68, 68, 0.1)", borderRadius: 2, p: 1.5, mb: 3, border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", gap: 1, alignItems: "center" }}>
          <MicOffIcon sx={{ color: "#ef4444", fontSize: 18 }} />
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            Your mic and camera are disabled during this break.
          </Typography>
        </Box>

        {/* Countdown Timer */}
        {remainingSeconds > 0 && (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1.5,
              }}
            >
              <AccessTimeRoundedIcon sx={{ fontSize: 20, color: "#4caf50" }} />
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 36,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: 2,
                }}
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                mb: 3,
                height: 6,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.10)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: progress > 80 ? "#f44336" : "#4caf50",
                  borderRadius: 3,
                },
              }}
            />
          </>
        )}

        {/* Social Lounge CTA Button */}
        {loungeEnabled && onOpenLounge && (
          <Button
            onClick={onOpenLounge}
            variant="contained"
            fullWidth
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#10b8a6",
              "&:hover": { bgcolor: "#0ea5a4" },
            }}
          >
            Join Social Lounge
          </Button>
        )}
      </Paper>
    </Box>
  );
}
