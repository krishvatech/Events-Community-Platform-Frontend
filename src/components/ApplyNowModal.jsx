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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useNavigate } from "react-router-dom";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * ApplyNowModal
 * Allows users to apply to an event with 'apply' registration type.
 * Supports both authenticated and unauthenticated users.
 * Collects: first_name, last_name, email, job_title (required), company_name (required), linkedin_url (optional)
 */
export default function ApplyNowModal({ open, onClose, event, token, onSuccess, guestOnly = false }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
    company_name: "",
    linkedin_url: "",
    attendee_marker_value: false,
    comments: "",
    preapproved_code: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [guestToken, setGuestToken] = useState(null); // Guest JWT from application response
  const [canJoinNow, setCanJoinNow] = useState(false); // Whether to show "Join Now" button
  const [codePreapproved, setCodePreapproved] = useState(false);
  const [emailPreapproved, setEmailPreapproved] = useState(false);
  const [codeError, setCodeError] = useState("");
  const preApproved = codePreapproved || emailPreapproved;

  // Pre-fill form for authenticated users on modal open
  useEffect(() => {
    if (!open || !event?.id) {
      return;
    }

    if (token) {
      // User is authenticated - fetch their profile to pre-fill
      fetch(urlJoin(API_BASE, "/auth/me/profile/"), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setForm((prev) => ({
            ...prev,
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
          }));
        })
        .catch((err) => {
          console.error("Failed to fetch profile:", err);
        });
    } else {
      // Unauthenticated - check if they've applied before
      const cached = localStorage.getItem("application_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Number(parsed.event_id) === Number(event.id)) {
            setForm({
              first_name: parsed.first_name || "",
              last_name: parsed.last_name || "",
              email: parsed.email || "",
              job_title: parsed.job_title || "",
              company_name: parsed.company_name || "",
              linkedin_url: parsed.linkedin_url || "",
            });
          }
        } catch (err) {
          console.error("Failed to parse application_cache:", err);
        }
      }
      setShowAuthOptions(true);
    }
  }, [open, event?.id, token]);

  useEffect(() => {
    if (open && form.email) {
      checkPreapprovalEmail(form.email);
    }
  }, [open, form.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };
  const handleCheckboxChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: !!e.target.checked }));
  };

  const checkPreapprovalEmail = async (emailInput) => {
    const email = (emailInput || "").trim().toLowerCase();
    if (!event?.preapproval_allowlist_enabled || !email) return;
    try {
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/preapproval/check-email/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.preapproved && data?.source === "email") {
        setEmailPreapproved(true);
        setForm((prev) => ({
          ...prev,
          first_name: prev.first_name || data.first_name || "",
          last_name: prev.last_name || data.last_name || "",
        }));
      } else {
        setEmailPreapproved(false);
      }
    } catch {
      setEmailPreapproved(false);
    }
  };

  const checkPreapprovalCode = async (codeInput) => {
    const code = (codeInput || "").trim();
    setCodeError("");
    if (!event?.preapproval_code_enabled || !code) {
      setCodePreapproved(false);
      return;
    }
    try {
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/preapproval/check-code/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.preapproved && data?.source === "code") {
        setCodePreapproved(true);
      } else {
        setCodePreapproved(false);
        if (data?.message) setCodeError(data.message);
      }
    } catch {
      setCodePreapproved(false);
    }
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

  const handleSubmitApplication = async () => {
    setError("");
    if (!validateForm()) return;

    setLoading(true);
    try {
      const url = urlJoin(API_BASE, `/events/${event.id}/apply/`);
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth token if user is authenticated
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          job_title: form.job_title.trim(),
          company_name: form.company_name.trim(),
          linkedin_url: form.linkedin_url.trim(),
          attendee_marker_value: !!form.attendee_marker_value,
          comments: form.comments?.trim() || "",
          preapproved_code: form.preapproved_code?.trim() || "",
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

      // Cache the application data for returning users
      const cacheData = {
        event_id: event.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        job_title: form.job_title.trim(),
        company_name: form.company_name.trim(),
        linkedin_url: form.linkedin_url.trim(),
        attendee_marker_value: !!form.attendee_marker_value,
        comments: form.comments?.trim() || "",
        preapproved_code: form.preapproved_code?.trim() || "",
      };
      localStorage.setItem("application_cache", JSON.stringify(cacheData));

      // If guest JWT token is provided, store it in localStorage
      if (data.guest_token && data.guest_id) {
        localStorage.setItem("guest_token", data.guest_token);
        localStorage.setItem("guest_id", data.guest_id.toString());
        console.log("[ApplyNowModal] ✅ Guest JWT stored in localStorage");
        console.log("[ApplyNowModal] guest_token:", data.guest_token.substring(0, 30) + "...");
        console.log("[ApplyNowModal] guest_id:", data.guest_id);
        setGuestToken(data.guest_token);
        setCanJoinNow(true); // Show "Join Now" button
      }

      // Show success state
      setSubmitSuccess(true);

      // Call parent callback with the application data
      if (onSuccess) {
        onSuccess(data);
      }

      // Close modal after 3 seconds (or 5 if they can join now)
      const closeDelay = canJoinNow ? 5000 : 3000;
      setTimeout(() => {
        setSubmitSuccess(false);
        handleModalClose();
      }, closeDelay);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error("Application submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setError("");
    setSubmitSuccess(false);
    setShowAuthOptions(false);
    setGuestToken(null);
    setCanJoinNow(false);
    setCodePreapproved(false);
    setEmailPreapproved(false);
    setCodeError("");
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      job_title: "",
      company_name: "",
      linkedin_url: "",
      attendee_marker_value: false,
      comments: "",
      preapproved_code: "",
    });
    onClose();
  };

  const handleSignInClick = () => {
    handleModalClose();
    navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
  };

  const handleSignUpClick = () => {
    handleModalClose();
    navigate(`/signup?next=${encodeURIComponent(window.location.pathname)}`);
  };

  return (
    <Dialog open={open} onClose={handleModalClose} maxWidth="xs" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle>Apply to {event?.title}</DialogTitle>
      <DialogContent>
        {submitSuccess ? (
          <Stack spacing={2} sx={{ pt: 2, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "success.main" }} />
            </Box>
            <Typography variant="h6">Application Submitted! ✅</Typography>

            {canJoinNow ? (
              <Typography variant="body2" color="textSecondary">
                Your application has been received. You'll receive a confirmation email at <strong>{form.email.toLowerCase()}</strong>.
              </Typography>
            ) : (
              <Typography variant="body2" color="textSecondary">
                We'll notify you at <strong>{form.email.toLowerCase()}</strong> once a decision is made.
              </Typography>
            )}

            <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
              {canJoinNow ? "This window will close in a few seconds..." : "Closing in a few seconds..."}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            {showAuthOptions && !token && !guestOnly && (
              <>
                <Alert severity="info" sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Already have an account?
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSignInClick}
                    disabled={loading}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Sign In to Apply
                  </Button>
                </Alert>
                <Divider>or continue without account</Divider>
              </>
            )}

            <Typography variant="body2" color="textSecondary">
              {token
                ? "Complete your professional details below."
                : "Fill in your information to apply. You can also sign in or create an account to continue."}
            </Typography>

            {/* For authenticated users: show summary of personal info */}
            {token && (
              <Box sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                  Your Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>{form.first_name} {form.last_name}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {form.email}
                </Typography>
              </Box>
            )}

            {/* For unauthenticated users: show all fields */}
            {!token && (
              <>
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
                  onBlur={() => checkPreapprovalEmail(form.email)}
                  disabled={loading}
                />
              </>
            )}

            {event?.preapproval_code_enabled && (
              <TextField
                label="Pre-approved code"
                fullWidth
                size="small"
                value={form.preapproved_code}
                onChange={handleInputChange("preapproved_code")}
                onBlur={() => checkPreapprovalCode(form.preapproved_code)}
                disabled={loading}
                helperText={codeError || ""}
                error={!!codeError}
              />
            )}

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
              label="LinkedIn URL"
              fullWidth
              size="small"
              placeholder="https://linkedin.com/in/yourprofile (optional)"
              value={form.linkedin_url}
              onChange={handleInputChange("linkedin_url")}
              disabled={loading}
            />
            {event?.attendee_marker_enabled && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!form.attendee_marker_value}
                    onChange={handleCheckboxChange("attendee_marker_value")}
                    disabled={loading}
                  />
                }
                label={event?.attendee_marker_label || "Attendee marker"}
              />
            )}
            <TextField
              label="Comments"
              fullWidth
              size="small"
              multiline
              minRows={3}
              value={form.comments}
              onChange={handleInputChange("comments")}
              disabled={loading}
            />
            {preApproved && (
              <Alert severity="success" sx={{ backgroundColor: "#e0f2f1" }}>
                You are pre-approved.
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmitApplication}
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
              {loading ? <CircularProgress size={20} color="inherit" /> : (preApproved ? "Register" : "Submit Application")}
            </Button>

            {!token && (
              <Typography variant="caption" align="center" sx={{ display: "block", mt: 1 }}>
                Want to sign up instead?{" "}
                <Box
                  component="span"
                  onClick={handleSignUpClick}
                  sx={{
                    cursor: "pointer",
                    textDecoration: "underline",
                    color: "primary.main",
                    "&:hover": { fontWeight: 500 },
                  }}
                >
                  Create Account
                </Box>
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
