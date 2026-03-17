import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import CloseIcon from "@mui/icons-material/Close";

/**
 * GuestNetworkingModal
 * Displayed when guest user is in a meeting and the host starts Speed Networking
 * Informs guest that networking is a registered-users-only feature
 * Provides Sign Up CTA that opens GuestRegistrationModal
 *
 * Props:
 * - open: boolean — whether modal is visible
 * - onClose: function — called when user clicks "Maybe Later" or close button
 * - onSignUp: function — called when user clicks "Sign Up" button
 */
export default function GuestNetworkingModal({ open = false, onClose = () => {}, onSignUp = () => {} }) {
  const darkBg = "#1a1a1a";
  const tealAccent = "#14b8a6";
  const lightText = "rgba(255,255,255,0.87)";
  const secondaryText = "rgba(255,255,255,0.55)";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: darkBg,
          color: lightText,
          borderRadius: 2,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        },
      }}
      TransitionProps={{
        timeout: {
          enter: 300,
          exit: 200,
        },
      }}
    >
      {/* Header — teal with icon and close button */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 2,
          px: 3,
          bgcolor: tealAccent,
          color: "white",
          fontWeight: 700,
          fontSize: "1.1rem",
          borderRadius: "2px 2px 0 0",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Diversity3Icon />
          Networking
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content with lock icon and message */}
      <DialogContent
        sx={{
          bgcolor: darkBg,
          textAlign: "center",
          pt: 4,
          pb: 2,
          px: 3,
        }}
      >
        {/* Lock icon in circular badge */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "rgba(20,184,177,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 40, color: tealAccent }} />
        </Box>

        {/* Main message */}
        <Typography
          variant="h6"
          sx={{
            color: lightText,
            fontWeight: 700,
            mb: 1.5,
            fontSize: "1.1rem",
          }}
        >
          Networking is only accessible for registered users.
        </Typography>

        {/* Secondary message */}
        <Typography
          variant="body2"
          sx={{
            color: secondaryText,
            lineHeight: 1.7,
          }}
        >
          Sign up to connect with other attendees in real-time during speed networking sessions.
        </Typography>
      </DialogContent>

      {/* Actions — Sign Up and Maybe Later buttons */}
      <DialogActions
        sx={{
          bgcolor: darkBg,
          px: 3,
          pb: 3,
          flexDirection: "column",
          gap: 1,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Sign Up CTA */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={onSignUp}
          sx={{
            bgcolor: tealAccent,
            color: "white",
            fontWeight: 700,
            fontSize: "1rem",
            py: 1.3,
            textTransform: "none",
            borderRadius: 1,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "#0d9488",
              boxShadow: "0 8px 20px rgba(20,184,177,0.4)",
              transform: "translateY(-2px)",
            },
            "&:active": {
              transform: "translateY(0)",
              boxShadow: "0 4px 10px rgba(20,184,177,0.2)",
            },
          }}
        >
          Sign Up
        </Button>

        {/* Maybe Later button */}
        <Button
          variant="text"
          fullWidth
          onClick={onClose}
          sx={{
            color: secondaryText,
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 1,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              color: lightText,
              bgcolor: "rgba(255,255,255,0.05)",
            },
          }}
        >
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
}
