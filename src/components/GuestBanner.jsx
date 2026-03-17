import React, { useState } from "react";
import {
  Button,
  Typography,
  Stack,
  IconButton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * GuestBanner
 * Persistent banner displayed at top of LiveMeetingPage when user is a guest.
 * Shows guest name and CTA to register and save connections.
 */
export default function GuestBanner({ guestName, onRegister, onClose }) {
  const displayName = guestName || localStorage.getItem("guest_name") || "Guest";
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  return (
    <Alert
      severity="info"
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        borderRadius: 0,
        borderBottom: "1px solid rgba(20,184,166,0.35)",
        background:
          "linear-gradient(90deg, rgba(8,20,28,0.95) 0%, rgba(12,30,40,0.95) 100%)",
        py: 0.5,
        px: { xs: 1, sm: 1.5 },
        minHeight: { xs: 44, sm: 48 },
        color: "#e6f6f5",
        "& .MuiAlert-icon": {
          color: "#2dd4bf",
          mt: 0,
          mr: 1,
          p: 0,
          alignSelf: "center",
        },
        "& .MuiAlert-message": {
          display: "flex",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
          py: 0,
        },
      }}
      action={
        <IconButton
          size="small"
          sx={{ color: "rgba(230,246,245,0.8)", p: 0.5 }}
          onClick={handleClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: "#d1faf5",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          You're attending as <strong>{displayName}</strong> (Guest)
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(209,250,245,0.86)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: { xs: "none", md: "block" },
          }}
        >
          Register to save networking connections and access recordings
        </Typography>
      </Stack>
      <Button
        size="small"
        variant="contained"
        onClick={onRegister}
        sx={{
          whiteSpace: "nowrap",
          textTransform: "none",
          fontWeight: 700,
          minWidth: { xs: 96, sm: 112 },
          px: 1.5,
          backgroundColor: "#14b8a6",
          color: "#042f2e",
          "&:hover": {
            backgroundColor: "#0d9488",
          },
        }}
      >
        Register Now
      </Button>
    </Alert>
  );
}
