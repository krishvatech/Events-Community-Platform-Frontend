import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Container, CircularProgress } from "@mui/material";
import { useLocation } from "react-router-dom";
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { apiClient, startKYC } from "../utils/api";

export default function KYCNotification() {
  const [status, setStatus] = useState(null); // 'not_started', 'pending', 'approved', 'declined'
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Hide on auth pages and live meeting routes
  const hideOnRoutes = ["/signin", "/signup", "/live"];
  const shouldHide = hideOnRoutes.some((route) => location.pathname.startsWith(route));

  // Check status on mount & route change
  useEffect(() => {
    if (shouldHide) {
      setStatus(null);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await apiClient.get("/users/me/");
        const userData = res.data;

        // 1. Check if user is Superuser (Admin)
        // If TRUE: We return immediately, so they DO NOT see the banner.
        if (userData?.is_superuser) {
          setIsSuperUser(true);
          return;
        }

        // 2. Staff and Normal Users pass through here.
        // We check their KYC status.
        const kyc = userData?.profile?.kyc_status;

        // Show banner if NOT approved
        if (kyc && kyc !== "approved") {
          setStatus(kyc);
        } else {
          setStatus(null);
        }
      } catch (error) {
        setStatus(null);
      }
    };

    checkStatus();
  }, [location.pathname, shouldHide]);

  // Handle "Verify Now" click
  const handleVerifyClick = async () => {
    setLoading(true);
    try {
      const data = await startKYC();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not initiate verification. Please try again.");
      }
    } catch (error) {
      alert(error.message || "Error starting verification");
    } finally {
      setLoading(false);
    }
  };

  // Logic: 
  // 1. If Superuser (Admin) -> Return Null (Hidden)
  // 2. If Staff or Normal -> Check Status -> Show Banner
  if (isSuperUser || !status) return null;

  // --- Configuration ---
  const isPending = status === "pending" || status === "review";

  // Style Config: Orange/Red for Action Required, Blue for Info
  const themeStyles = isPending
    ? { bg: "#ffffffff", color: "#239191ff", icon: <InfoOutlinedIcon fontSize="small" /> }
    : { bg: "#ffffffff", color: "#239191ff", icon: <WarningAmberRoundedIcon fontSize="small" /> };

  const message = isPending
    ? "Your identity verification is currently under review."
    : (status === "declined" ? "Identity verification failed." : "Your identity is not verified.");

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: themeStyles.bg,
        color: themeStyles.color,
        borderBottom: "1px solid",
        borderColor: "rgba(0,0,0,0.05)",
        py: 1.5,
        position: "relative",
        zIndex: 1000 // Ensures it sits above some page content but below modals
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
          {themeStyles.icon}

          <Typography variant="body2" fontWeight={600}>
            {message}
          </Typography>

          {/* Show Link/Button only if action is needed (not pending) */}
          {!isPending && (
            <Button
              variant="text"
              size="small"
              onClick={handleVerifyClick}
              disabled={loading}
              sx={{
                textTransform: "none",
                textDecoration: "underline",
                fontWeight: "bold",
                color: "inherit",
                minWidth: "auto",
                p: 0,
                ml: 0.5,
                "&:hover": {
                  textDecoration: "underline",
                  backgroundColor: "transparent"
                }
              }}
            >
              {loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                "Click here to verify"
              )}
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
}