import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";

const N = "#1B2A4A";
const T = "#0A9396";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        gap: 2,
        px: 2,
        textAlign: "center",
      }}
    >
      <SettingsRoundedIcon sx={{ fontSize: 72, color: T, opacity: 0.7 }} />

      <Typography variant="h4" sx={{ fontWeight: 700, color: N }}>
        Coming Soon
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
        We're working on something great. Account settings will be available here soon.
      </Typography>

      <Button
        variant="outlined"
        onClick={() => navigate(-1)}
        sx={{
          mt: 1,
          textTransform: "none",
          borderColor: N,
          color: N,
          "&:hover": { borderColor: T, color: T },
        }}
      >
        Go Back
      </Button>
    </Box>
  );
}
