import React from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  Container,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Diversity3Icon from "@mui/icons-material/Diversity3";

/**
 * GuestNetworkingWaitingScreen
 * Full-page blocking screen shown when guest chooses "Maybe Later" on the networking modal
 * Prevents guest from accessing the main meeting while networking session is active
 *
 * Props:
 * - onSignUp: function — called when user clicks "Sign Up" button
 */
export default function GuestNetworkingWaitingScreen({ onSignUp = () => {} }) {
  const darkBg = "#0d0d0d";
  const tealAccent = "#14b8a6";
  const lightText = "rgba(255,255,255,0.87)";
  const secondaryText = "rgba(255,255,255,0.6)";

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: darkBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        overflow: "auto",
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Stack
          spacing={3}
          sx={{
            textAlign: "center",
            width: "100%",
          }}
        >
          {/* Icon Badge — Lock + Networking */}
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              bgcolor: "rgba(20,184,177,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              position: "relative",
            }}
          >
            <Diversity3Icon
              sx={{
                fontSize: 56,
                color: tealAccent,
              }}
            />
            {/* Lock overlay on top-right */}
            <Box
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 32,
                height: 32,
                borderRadius: "50%",
                bgcolor: darkBg,
                border: `2px solid ${tealAccent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockOutlinedIcon
                sx={{
                  fontSize: 16,
                  color: tealAccent,
                }}
              />
            </Box>
          </Box>

          {/* Header */}
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: lightText,
                fontWeight: 700,
                mb: 1.5,
                fontSize: "1.5rem",
              }}
            >
              Networking Session In Progress
            </Typography>

            {/* Subheader */}
            <Typography
              variant="body1"
              sx={{
                color: secondaryText,
                lineHeight: 1.7,
                fontSize: "1rem",
              }}
            >
              The hosting team is currently running a networking session. Sign up to connect with other attendees, or wait for the session to conclude.
            </Typography>
          </Box>

          {/* Info Box */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 1,
              bgcolor: "rgba(20,184,177,0.08)",
              border: `1px solid ${tealAccent}40`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: tealAccent,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                display: "block",
                mb: 1,
              }}
            >
              What happens next?
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: lightText,
                lineHeight: 1.6,
              }}
            >
              Once the networking session ends, you'll automatically have access to the main meeting. Alternatively, sign up now to join the networking session immediately.
            </Typography>
          </Box>

          {/* CTA Buttons */}
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {/* Sign Up Button */}
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
                py: 1.5,
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
              Sign Up to Join
            </Button>

            {/* Waiting Message */}
            <Typography
              variant="caption"
              sx={{
                color: secondaryText,
                textAlign: "center",
                py: 1,
                fontStyle: "italic",
              }}
            >
              Waiting for networking session to conclude...
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
