import React from "react";
import { Box, Typography, Button } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

/**
 * GuestRestrictionOverlay
 * Wraps content with a blur effect and shows a locked overlay with Sign Up CTA
 * when guest users try to access restricted features (profile, chat, Q&A).
 *
 * Props:
 * - visible: boolean — controls whether the overlay is active
 * - message: string — restriction message shown in the overlay
 * - onSignUp: function — callback when Sign Up button is clicked
 * - children: ReactNode — the content to blur
 */
export default function GuestRestrictionOverlay({
  visible = false,
  message = "Please register to access this feature.",
  onSignUp = () => {},
  children,
}) {
  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Blurred background content */}
      <Box
        sx={{
          filter: visible ? "blur(6px)" : "none",
          userSelect: "none",
          pointerEvents: visible ? "none" : "auto",
          transition: "filter 0.3s ease-in-out",
        }}
      >
        {children}
      </Box>

      {/* Overlay — only shown when visible */}
      {visible && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(20, 30, 48, 0.75)",
            backdropFilter: "blur(4px)",
            textAlign: "center",
            px: 3,
            py: 3,
            zIndex: 10,
            animation: "fadeIn 0.3s ease-in-out",
            "@keyframes fadeIn": {
              from: {
                opacity: 0,
              },
              to: {
                opacity: 1,
              },
            },
          }}
        >
          {/* Lock Icon Circle Background */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2.5,
            }}
          >
            <LockOutlinedIcon
              sx={{
                fontSize: 36,
                color: "rgba(20, 184, 177, 0.9)",
              }}
            />
          </Box>

          {/* Message Typography */}
          <Typography
            variant="body1"
            color="rgba(255, 255, 255, 0.95)"
            sx={{
              mb: 2.5,
              lineHeight: 1.6,
              fontWeight: 500,
              fontSize: "15px",
              maxWidth: "90%",
            }}
          >
            {message}
          </Typography>

          {/* Sign Up Button */}
          <Button
            variant="contained"
            size="medium"
            onClick={onSignUp}
            sx={{
              backgroundColor: "#14b8a6",
              color: "white",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "14px",
              px: 2.5,
              py: 1,
              borderRadius: "8px",
              transition: "all 0.2s ease-in-out",
              boxShadow: "0 4px 12px rgba(20, 184, 177, 0.3)",
              "&:hover": {
                backgroundColor: "#0d9488",
                boxShadow: "0 6px 16px rgba(20, 184, 177, 0.4)",
                transform: "translateY(-2px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            }}
          >
            Sign Up
          </Button>
        </Box>
      )}
    </Box>
  );
}
