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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { useNavigate } from "react-router-dom";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * GuestApplyModal
 * Handles guest user flow for Application Required events.
 * Steps:
 * 1. "form" - Collect application info & check existing application status
 * 2. "otp" - OTP verification (if approved)
 * 3. "submitted" - Application submitted (if new)
 * 4. "pending" - Application under review (if pending)
 * 5. "rejected" - Application declined (if rejected)
 */
export default function GuestApplyModal({ open, onClose, event, livePath }) {
  const navigate = useNavigate();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
    company_name: "",
    linkedin_url: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  // Pre-fill form for returning guest on modal open
  useEffect(() => {
    if (!open) {
      return;
    }

    if (!event?.id) {
      return;
    }

    const cached = localStorage.getItem("guest_session_cache");
    if (!cached) {
      setIsReturningGuest(false);
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      if (Number(parsed.event_id) === Number(event.id)) {
        setForm({
          first_name: parsed.first_name || "",
          last_name: parsed.last_name || "",
          email: parsed.email || "",
          job_title: parsed.job_title || "",
          company_name: parsed.company_name || "",
          linkedin_url: "",
        });
        setIsReturningGuest(true);
      } else {
        setIsReturningGuest(false);
      }
    } catch (err) {
      console.error("[GuestApplyModal] Failed to parse guest_session_cache:", err);
      setIsReturningGuest(false);
    }
  }, [open, event?.id]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const timer = setInterval(() => setOtpTimer((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [otpTimer]);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!form.job_title.trim()) {
      setError("Job title is required");
      return false;
    }
    if (!form.company_name.trim()) {
      setError("Company name is required");
      return false;
    }
    return true;
  };

  const handleCheckAndApply = async () => {
    setError("");
    if (!validateForm()) return;

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();

      // Step 1: Check if application already exists
      const checkRes = await fetch(
        urlJoin(API_BASE, `/events/${event.id}/apply/?email=${encodeURIComponent(email)}`)
      );

      if (checkRes.ok) {
        // Application exists, get status
        const appData = await checkRes.json();
        console.log("[GuestApplyModal] Existing application found:", appData);

        if (appData.status === "approved") {
          // Approved - proceed to OTP
          console.log("[GuestApplyModal] Application approved, sending OTP...");
          await handleSendOtpForApproved();
        } else if (appData.status === "pending") {
          setStep("pending");
        } else if (appData.status === "declined") {
          setStep("rejected");
        } else if (appData.status === "none") {
          // "none" status means no application exists yet - treat as not found
          console.log("[GuestApplyModal] Application status is 'none', submitting new...");
          await handleSubmitNewApplication();
        } else {
          setError(`Unknown application status: ${appData.status}`);
        }
      } else if (checkRes.status === 404 || checkRes.status === 204) {
        // No existing application - submit new one
        console.log("[GuestApplyModal] No existing application, submitting new...");
        await handleSubmitNewApplication();
      } else {
        const errorData = await checkRes.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to check application (${checkRes.status})`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error("[GuestApplyModal] Check/apply error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNewApplication = async () => {
    try {
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/apply/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          job_title: form.job_title.trim(),
          company_name: form.company_name.trim(),
          linkedin_url: form.linkedin_url.trim(),
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
        if (res.status === 409) {
          setError("You have already applied to this event with this email.");
          return;
        }
        throw new Error(
          data.detail || data.error || data.message || text || `Failed to submit application (${res.status})`
        );
      }

      console.log("[GuestApplyModal] Application submitted successfully");
      setStep("submitted");
    } catch (err) {
      setError(err.message || "Failed to submit application.");
      console.error("[GuestApplyModal] Submit error:", err);
      throw err;
    }
  };

  const handleSendOtpForApproved = async () => {
    try {
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

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "account_exists") {
          throw new Error("An account already exists with this email. Please sign in instead.");
        }
        if (data.error === "banned") {
          throw new Error("You have been banned from this event.");
        }
        if (res.status === 429) {
          const secsRemaining = data.seconds_remaining || 60;
          throw new Error(`Too many OTP requests. Please wait ${secsRemaining} seconds.`);
        }
        throw new Error(data.detail || data.message || `Failed to send OTP (${res.status})`);
      }

      if (data.otp_required) {
        console.log("[GuestApplyModal] OTP sent successfully");
        setOtpSentEmail(form.email.trim().toLowerCase());
        setStep("otp");
        setOtpCode("");
        setOtpTimer(60); // Start 60 second timer before allow resend
      } else {
        throw new Error("OTP not sent. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
      console.error("[GuestApplyModal] Send OTP error:", err);
      throw err;
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setError("Please enter the OTP code");
      return;
    }

    setError("");
    setLoading(true);
    try {
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

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(data.detail || "Invalid or expired OTP. Please try again.");
        }
        throw new Error(data.detail || data.message || `Verification failed (${res.status})`);
      }

      // Success - store guest token and redirect
      console.log("[GuestApplyModal] OTP verified successfully");

      // Store guest session in localStorage
      localStorage.setItem("guest_token", data.token);
      localStorage.setItem("is_guest", "true");
      localStorage.setItem("guest_email", data.email);
      localStorage.setItem("guest_name", data.name || `${form.first_name} ${form.last_name}`);
      localStorage.setItem("guest_id", String(data.guest_id));
      localStorage.setItem("guest_company", data.company || form.company_name);
      localStorage.setItem("guest_job_title", data.job_title || form.job_title);
      localStorage.setItem(
        "guest_session_cache",
        JSON.stringify({
          event_id: event.id,
          first_name: form.first_name,
          last_name: form.last_name,
          email: otpSentEmail,
          job_title: form.job_title,
          company_name: form.company_name,
        })
      );

      // Dispatch auth changed event
      window.dispatchEvent(new Event("auth:changed"));

      // Close modal and navigate to live meeting
      handleModalClose();
      navigate(livePath);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error("[GuestApplyModal] OTP verify error:", err);
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

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          const secsRemaining = data.seconds_remaining || 60;
          throw new Error(`Too many requests. Please wait ${secsRemaining} seconds.`);
        }
        throw new Error(data.detail || data.message || `Failed to resend OTP (${res.status})`);
      }

      setOtpTimer(60);
      setError("");
      console.log("[GuestApplyModal] OTP resent successfully");
    } catch (err) {
      setError(err.message || "Failed to resend OTP.");
      console.error("[GuestApplyModal] Resend error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setError("");
    setStep("form");
    setOtpCode("");
    setOtpSentEmail("");
    setOtpTimer(0);
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      job_title: "",
      company_name: "",
      linkedin_url: "",
    });
    onClose();
  };

  // Render different content based on step
  const renderContent = () => {
    if (step === "form") {
      return (
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary">
            Fill in your professional information to apply for this event.
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
            label="Email Address"
            type="email"
            required
            fullWidth
            size="small"
            value={form.email}
            onChange={handleInputChange("email")}
            disabled={loading}
          />

          <TextField
            label="Job Title"
            required
            fullWidth
            size="small"
            placeholder="e.g., Product Manager"
            value={form.job_title}
            onChange={handleInputChange("job_title")}
            disabled={loading}
          />

          <TextField
            label="Company Name"
            required
            fullWidth
            size="small"
            placeholder="e.g., TechCorp Inc."
            value={form.company_name}
            onChange={handleInputChange("company_name")}
            disabled={loading}
          />

          <TextField
            label="LinkedIn URL (Optional)"
            fullWidth
            size="small"
            placeholder="https://linkedin.com/in/yourprofile"
            value={form.linkedin_url}
            onChange={handleInputChange("linkedin_url")}
            disabled={loading}
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleCheckAndApply}
            disabled={
              loading ||
              !form.first_name ||
              !form.last_name ||
              !form.email ||
              !form.job_title ||
              !form.company_name
            }
            sx={{ py: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Check & Apply"}
          </Button>
        </Stack>
      );
    }

    if (step === "otp") {
      return (
        <Stack spacing={2} sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary">
            We've sent a verification code to <strong>{otpSentEmail}</strong>
          </Typography>

          <TextField
            label="Verification Code"
            placeholder="Enter 6-digit code"
            fullWidth
            size="small"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            disabled={loading}
            maxLength="6"
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleVerifyOTP}
            disabled={loading || !otpCode.trim() || otpCode.length !== 6}
            sx={{ py: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Verify OTP"}
          </Button>

          <Typography variant="caption" align="center" sx={{ display: "block" }}>
            Didn't receive the code?{" "}
            <Box
              component="span"
              onClick={handleResendOTP}
              sx={{
                cursor: otpTimer === 0 ? "pointer" : "default",
                textDecoration: "underline",
                color: otpTimer === 0 ? "primary.main" : "text.disabled",
                "&:hover": otpTimer === 0 ? { fontWeight: 500 } : {},
              }}
            >
              {otpTimer === 0 ? "Resend" : `Resend in ${otpTimer}s`}
            </Box>
          </Typography>
        </Stack>
      );
    }

    if (step === "submitted") {
      return (
        <Stack spacing={2} sx={{ pt: 2, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "success.main" }} />
          </Box>
          <Typography variant="h6">Application Submitted! ✅</Typography>
          <Typography variant="body2" color="textSecondary">
            We'll review your application and notify you at <strong>{form.email.toLowerCase()}</strong> once a decision
            is made.
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
            This window will close in a few seconds...
          </Typography>
        </Stack>
      );
    }

    if (step === "pending") {
      return (
        <Stack spacing={2} sx={{ pt: 2, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <HourglassEmptyIcon sx={{ fontSize: 60, color: "warning.main" }} />
          </Box>
          <Typography variant="h6">Application Under Review</Typography>
          <Typography variant="body2" color="textSecondary">
            Your application is being reviewed. We'll send you an email at <strong>{form.email.toLowerCase()}</strong>{" "}
            once a decision is made.
          </Typography>
          <Button variant="outlined" fullWidth onClick={handleModalClose}>
            Close
          </Button>
        </Stack>
      );
    }

    if (step === "rejected") {
      return (
        <Stack spacing={2} sx={{ pt: 2, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CancelIcon sx={{ fontSize: 60, color: "error.main" }} />
          </Box>
          <Typography variant="h6">Application Declined</Typography>
          <Typography variant="body2" color="textSecondary">
            Unfortunately, your application for this event has been declined. Please try another event or contact the
            event organizer for more information.
          </Typography>
          <Button variant="outlined" fullWidth onClick={handleModalClose}>
            Close
          </Button>
        </Stack>
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleModalClose}
      maxWidth="xs"
      fullWidth
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle>
        {step === "form"
          ? `Apply to ${event?.title}`
          : step === "otp"
          ? "Verify Your Email"
          : step === "submitted"
          ? "Application Submitted"
          : step === "pending"
          ? "Application Status"
          : "Application Status"}
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
    </Dialog>
  );
}
