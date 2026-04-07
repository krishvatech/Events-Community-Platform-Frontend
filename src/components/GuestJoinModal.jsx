import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Divider,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * GuestJoinModal
 * Allows unauthenticated users to join an event as guests.
 * Two-step flow:
 * 1. Collect name, email, job title → send OTP
 * 2. Verify OTP → receive guest JWT token
 */
export default function GuestJoinModal({ open, onClose, event, livePath }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // "form" or "otp"
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
    company_name: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState("");

  // Detect and pre-fill form for returning guest on modal open
  useEffect(() => {
    console.debug("[GuestJoinModal useEffect] open=", open, "event.id=", event?.id, "event=", event);

    if (!open) {
      console.debug("[GuestJoinModal] Modal closed, skipping pre-fill");
      return;
    }

    if (!event?.id) {
      console.debug("[GuestJoinModal] No event ID, skipping pre-fill");
      return;
    }

    console.debug("[GuestJoinModal] Checking for returning guest. event.id=", event.id, "event type:", typeof event.id);
    const cached = localStorage.getItem("guest_session_cache");
    console.debug("[GuestJoinModal] guest_session_cache exists?", !!cached);

    if (!cached) {
      console.debug("[GuestJoinModal] No cache found");
      setIsReturningGuest(false);
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      console.debug("[GuestJoinModal] Parsed cache:", parsed, "cached event_id type:", typeof parsed.event_id);
      console.debug("[GuestJoinModal] Event ID comparison: ", {
        cached: parsed.event_id,
        current: event.id,
        match: parsed.event_id === event.id,
        stringMatch: String(parsed.event_id) === String(event.id)
      });

      // Compare as numbers to handle type mismatches
      if (Number(parsed.event_id) === Number(event.id)) {
        console.debug("[GuestJoinModal] Event ID match! Pre-filling form");
        setForm({
          first_name: parsed.first_name || "",
          last_name: parsed.last_name || "",
          email: parsed.email || "",
          job_title: parsed.job_title || "",
          company_name: parsed.company_name || "",
        });
        setIsReturningGuest(true);
      } else {
        console.debug("[GuestJoinModal] Event ID mismatch - cached:", parsed.event_id, "current:", event.id);
        setIsReturningGuest(false);
      }
    } catch (err) {
      console.error("[GuestJoinModal] Failed to parse guest_session_cache:", err);
      setIsReturningGuest(false);
    }
  }, [open, event?.id]);

  const handleInputChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validateForm = () => {
    if (!form.first_name.trim()) {
      setError("First name is required");
      return false;
    }
    if (!form.last_name.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleGuestJoin = async () => {
    setError("");
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Step 1: Send OTP to email
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/guest-join/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          job_title: form.job_title.trim(),
          company_name: form.company_name.trim(),
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.error === "account_exists") {
          setError("You already have an account for this event. Please sign in.");
          return;
        }
        throw new Error(data.error || data.message || text || `Failed to send verification code (${res.status})`);
      }

      if (!data?.otp_required) {
        throw new Error("OTP was not requested by server.");
      }

      // Successfully sent OTP - move to verification step
      setOtpSentEmail(form.email.trim().toLowerCase());
      setStep("otp");
      setOtpCode("");
      console.debug("[GuestJoinModal] OTP sent to:", form.email);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error("Guest join error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (!otpCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      // Step 2: Verify OTP and get JWT
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/guest-verify-otp/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpSentEmail,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          otp_code: otpCode.trim(),
          job_title: form.job_title.trim(),
          company: form.company_name.trim(),
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.error === "account_exists") {
          setError("You already have an account for this event. Please sign in.");
          return;
        }
        throw new Error(data.error || data.message || text || `Failed to verify code (${res.status})`);
      }

      if (!data?.token) {
        throw new Error("OTP verification succeeded but no token was returned.");
      }

      // Store guest session in localStorage
      localStorage.setItem("guest_token", data.token);
      localStorage.setItem("is_guest", "true");
      localStorage.setItem("guest_email", data.email);
      localStorage.setItem("guest_name", data.name);
      localStorage.setItem("guest_id", String(data.guest_id));
      localStorage.setItem("guest_company", data.company || form.company_name.trim());
      localStorage.setItem("guest_job_title", data.job_title || form.job_title.trim());

      // Store persistent guest session cache (survives token expiry)
      const cacheData = {
        event_id: event.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: otpSentEmail,
        job_title: form.job_title.trim(),
        company_name: form.company_name.trim(),
      };
      localStorage.setItem("guest_session_cache", JSON.stringify(cacheData));
      console.debug("[GuestJoinModal] Saved guest_session_cache:", cacheData);

      // Notify auth system of change
      window.dispatchEvent(new Event("auth:changed"));

      onClose();
      navigate(livePath, { state: { event } });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error("OTP verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/guest-resend-otp/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpSentEmail,
          first_name: form.first_name.trim(),
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        // 429 = rate limited
        if (res.status === 429 && data.seconds_remaining) {
          throw new Error(`Please wait ${data.seconds_remaining} seconds before requesting another code`);
        }
        throw new Error(data.error || data.message || `Failed to resend code (${res.status})`);
      }

      setOtpCode("");
      console.debug("[GuestJoinModal] OTP resent to:", otpSentEmail);
    } catch (err) {
      setError(err.message || "Failed to resend code. Please try again.");
      console.error("Resend OTP error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtpCode("");
    setError("");
    setOtpSentEmail("");
  };

  const handleClearGuestSession = () => {
    localStorage.removeItem("guest_session_cache");
    setForm({ first_name: "", last_name: "", email: "", job_title: "", company_name: "" });
    setIsReturningGuest(false);
    setError("");
  };

  const handleModalClose = () => {
    setIsReturningGuest(false);
    setError("");
    setStep("form");
    setOtpCode("");
    setOtpSentEmail("");
    onClose();
  };

  const handleSignInClick = () => {
    handleModalClose();
    navigate("/signin");
  };

  const handleSignUpClick = () => {
    handleModalClose();
    navigate("/signup");
  };

  return (
    <Dialog open={open} onClose={handleModalClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {step === "form" ? "Join Event as Guest" : "Verify Your Email"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {step === "form" ? (
            <>
              {isReturningGuest && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Welcome back! Your details have been pre-filled.
                </Alert>
              )}

              <Typography variant="body2" color="textSecondary">
                {isReturningGuest
                  ? "Continue your event experience or update your details."
                  : "Experience the event first, then register to save your connections."}
              </Typography>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="First Name"
                  required
                  fullWidth
                  size="small"
                  value={form.first_name}
                  onChange={handleInputChange("first_name")}
                  disabled={loading}
                />
                <TextField
                  label="Last Name"
                  required
                  fullWidth
                  size="small"
                  value={form.last_name}
                  onChange={handleInputChange("last_name")}
                  disabled={loading}
                />
              </Stack>

              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                size="small"
                value={form.email}
                onChange={handleInputChange("email")}
                disabled={loading}
              />

              <TextField
                label="Current Role / Job Title"
                fullWidth
                size="small"
                placeholder="e.g., Software Engineer"
                value={form.job_title}
                onChange={handleInputChange("job_title")}
                disabled={loading}
              />

              <TextField
                label="Company Name"
                fullWidth
                size="small"
                placeholder="e.g., Acme Corporation"
                value={form.company_name}
                onChange={handleInputChange("company_name")}
                disabled={loading}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleGuestJoin}
                disabled={loading || !form.first_name || !form.last_name || !form.email}
                sx={{ py: 1 }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : isReturningGuest ? (
                  "Continue as Guest"
                ) : (
                  "Send Verification Code"
                )}
              </Button>

              {isReturningGuest && (
                <Typography variant="caption" align="center" sx={{ display: "block", mt: -1 }}>
                  Not you?{" "}
                  <Box
                    component="span"
                    onClick={handleClearGuestSession}
                    sx={{
                      cursor: "pointer",
                      textDecoration: "underline",
                      color: "primary.main",
                      "&:hover": { fontWeight: 500 },
                    }}
                  >
                    Clear and start fresh
                  </Box>
                </Typography>
              )}

              <Divider sx={{ my: 1 }}>or</Divider>

              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleSignInClick}
                  disabled={loading}
                >
                  Sign In
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleSignUpClick}
                  disabled={loading}
                >
                  Create Account
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary">
                A verification code has been sent to <strong>{otpSentEmail}</strong>.
                Please enter it below to confirm your email.
              </Typography>

              <TextField
                label="Verification Code"
                placeholder="Enter 6-digit code"
                inputProps={{ maxLength: 6, style: { textAlign: "center", letterSpacing: "0.25em", fontSize: "1.5em" } }}
                fullWidth
                size="small"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                autoFocus
              />

              <Typography variant="caption" color="textSecondary">
                This code expires in 10 minutes.
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={handleVerifyOTP}
                disabled={loading || otpCode.length !== 6}
                sx={{ py: 1 }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Verify Code"
                )}
              </Button>

              <Typography variant="caption" align="center" sx={{ display: "block" }}>
                Didn't receive the code?{" "}
                <Box
                  component="span"
                  onClick={handleResendOTP}
                  sx={{
                    cursor: "pointer",
                    textDecoration: "underline",
                    color: "primary.main",
                    "&:hover": { fontWeight: 500 },
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Resend Code
                </Box>
              </Typography>

              <Button
                variant="text"
                fullWidth
                onClick={handleBackToForm}
                disabled={loading}
                size="small"
              >
                ← Back to Form
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
