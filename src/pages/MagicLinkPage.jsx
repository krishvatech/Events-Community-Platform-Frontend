import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircularProgress, Box, Typography, Alert, Container } from "@mui/material";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * MagicLinkPage
 * Validates magic login token and authenticates user automatically.
 * Called from email link: /auth/magic-link?token=<token>&next=/events/slug/
 */
export default function MagicLinkPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAndLogin = async () => {
      const token = searchParams.get("token");
      const nextUrl = searchParams.get("next");

      if (!token) {
        setError("Magic link token is missing");
        setLoading(false);
        return;
      }

      try {
        console.log("[MagicLink] 1. Starting magic link validation...");
        console.log("[MagicLink] Token:", token.substring(0, 20) + "...");
        console.log("[MagicLink] Next URL:", nextUrl);

        // Call backend to validate token and get access token
        const response = await fetch(urlJoin(API_BASE, `/auth/magic-link/?token=${encodeURIComponent(token)}`));
        console.log("[MagicLink] 2. Magic link validation response status:", response.status);

        if (!response.ok) {
          const data = await response.json();
          console.error("[MagicLink] Magic link validation failed:", data);
          throw new Error(data.detail || "Failed to validate magic link");
        }

        const data = await response.json();
        console.log("[MagicLink] 3. Magic link response data:", data);

        const { access_token, user, event, guest_token, guest_id } = data;
        console.log("[MagicLink] Access token:", access_token ? "✅ Received" : "❌ Missing");
        console.log("[MagicLink] User:", user);
        console.log("[MagicLink] Event:", event);
        console.log("[MagicLink] Guest token:", guest_token ? "✅ Received" : "❌ Not provided");
        console.log("[MagicLink] Guest ID:", guest_id || "N/A");

        // Store access token in localStorage
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("user", JSON.stringify(user));
        console.log("[MagicLink] 4. Stored access_token and user in localStorage");

        // If guest_token is provided from approved application, use it directly
        if (guest_token && guest_id) {
          console.log("[MagicLink] 5. Guest token provided from application approval");
          localStorage.setItem("guest_token", guest_token);
          localStorage.setItem("guest_id", guest_id.toString());
          console.log("[MagicLink] 6. Stored guest_token and guest_id from approval email");
          console.log("[MagicLink] guest_token:", guest_token.substring(0, 20) + "...");
          console.log("[MagicLink] guest_id:", guest_id);
        } else if (event?.id) {
          // Fallback: If no guest token in response but event exists, call guest-join
          console.log("[MagicLink] 5. No guest token in response, calling guest-join API as fallback...");
          console.log("[MagicLink] Event ID:", event.id);
          console.log("[MagicLink] Guest data:", { first_name: user.first_name, last_name: user.last_name, email: user.email });

          try {
            // Call guest-join API to create guest attendee session
            const guestUrl = urlJoin(API_BASE, `/events/${event.id}/guest-join/`);
            console.log("[MagicLink] Guest join URL:", guestUrl);

            const guestResponse = await fetch(guestUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
              }),
            });

            console.log("[MagicLink] 6. Guest-join response status:", guestResponse.status);
            const guestResponseText = await guestResponse.text();
            console.log("[MagicLink] Guest-join response:", guestResponseText);

            if (guestResponse.ok) {
              const guestData = JSON.parse(guestResponseText);
              console.log("[MagicLink] 7. Guest data received:", guestData);

              // Store guest token and attendee info
              localStorage.setItem("guest_token", guestData.token);
              localStorage.setItem("guest_id", guestData.guest_id.toString());
              localStorage.setItem("guest_attendee", JSON.stringify(guestData));

              console.log("[MagicLink] 8. Stored guest_token and guest_id in localStorage");
              console.log("[MagicLink] guest_token:", guestData.token.substring(0, 20) + "...");
              console.log("[MagicLink] guest_id:", guestData.guest_id);
            } else {
              console.warn("[MagicLink] Guest join failed with status:", guestResponse.status);
            }
          } catch (guestErr) {
            console.warn("Guest join error:", guestErr);
            console.warn("Error details:", guestErr.message);
            // Continue even if guest join fails - user is authenticated
          }
        } else {
          console.log("[MagicLink] No guest token or event in response, skipping guest setup");
        }

        console.log("[MagicLink] 9. About to redirect...");
        console.log("[MagicLink] nextUrl:", nextUrl);
        console.log("[MagicLink] event?.slug:", event?.slug);

        // Redirect to event or home
        if (nextUrl) {
          console.log("[MagicLink] Redirecting to nextUrl:", nextUrl);
          window.location.href = nextUrl;
        } else if (event?.slug) {
          console.log("[MagicLink] Redirecting to event:", `/events/${event.slug}/`);
          navigate(`/events/${event.slug}/`);
        } else {
          console.log("[MagicLink] Redirecting to events list");
          navigate("/events");
        }
      } catch (err) {
        console.error("Magic link validation error:", err);
        setError(err.message || "Invalid or expired magic link. Please try applying again.");
        setLoading(false);
      }
    };

    validateAndLogin();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ color: "white", mb: 2 }} />
          <Typography variant="h6" sx={{ color: "white" }}>
            Logging you in...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Alert severity="error" sx={{ mt: 4 }}>
          <Typography variant="h6">Login Failed</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 2, color: "#1976d2", cursor: "pointer" }}
            onClick={() => navigate("/events")}
          >
            ← Back to Events
          </Typography>
        </Alert>
      </Container>
    );
  }

  return null;
}
