import React, { useState } from "react";
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
 * Collects minimal info: name, email, job title
 * Issues a guest JWT token for session access.
 */
export default function GuestJoinModal({ open, onClose, event, livePath }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/guest-join/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          job_title: form.job_title.trim(),
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
        throw new Error(data.error || data.message || text || `Failed to join as guest (${res.status})`);
      }

      if (!data?.token) {
        throw new Error("Guest join succeeded but no token was returned.");
      }

      // Store guest session in localStorage
      localStorage.setItem("access_token", data.token);
      localStorage.setItem("is_guest", "true");
      localStorage.setItem("guest_email", data.email);
      localStorage.setItem("guest_name", data.name);
      localStorage.setItem("guest_id", String(data.guest_id));

      // Notify auth system of change
      window.dispatchEvent(new Event("auth:changed"));

      onClose();
      navigate(livePath, { state: { event } });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error("Guest join error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInClick = () => {
    onClose();
    navigate("/signin");
  };

  const handleSignUpClick = () => {
    onClose();
    navigate("/signup");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Join Event as Guest</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary">
            Experience the event first, then register to save your connections.
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

          <Button
            variant="contained"
            fullWidth
            onClick={handleGuestJoin}
            disabled={loading || !form.first_name || !form.last_name || !form.email}
            sx={{ py: 1 }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Join as Guest"
            )}
          </Button>

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
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
