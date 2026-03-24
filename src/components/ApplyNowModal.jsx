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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
      };
      localStorage.setItem("application_cache", JSON.stringify(cacheData));

      // Show success state
      setSubmitSuccess(true);

      // Call parent callback with the application data
      if (onSuccess) {
        onSuccess(data);
      }

      // Close modal after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        handleModalClose();
      }, 3000);
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
            <Typography variant="h6">Application Submitted!</Typography>
            <Typography variant="body2" color="textSecondary">
              We'll notify you at <strong>{form.email.toLowerCase()}</strong> once a decision is made.
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Closing in a few seconds...
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
                  disabled={loading}
                />
              </>
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
              {loading ? <CircularProgress size={20} color="inherit" /> : "Submit Application"}
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
