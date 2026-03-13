import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { API_BASE } from "../utils/api";
import {
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoSignIn,
} from "../utils/cognitoAuth";

/**
 * GuestRegistrationModal
 * Allows guest attendees to convert their session to a registered account.
 * Collects basic account fields and password.
 * Triggers Cognito account creation and email verification.
 */
export default function GuestRegistrationModal({ open, onClose }) {
  const guestEmail = localStorage.getItem("guest_email") || "";
  const guestName = localStorage.getItem("guest_name") || "";
  const nameParts = guestName.trim().split(/\s+/).filter(Boolean);
  const defaultFirstName = nameParts[0] || "";
  const defaultLastName = nameParts.slice(1).join(" ");

  const [form, setForm] = useState({
    first_name: defaultFirstName,
    last_name: defaultLastName,
    email: guestEmail,
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stage, setStage] = useState("signup"); // signup | confirm | done
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const switchToRegisteredSessionAndRejoin = (session) => {
    const idToken = session?.idToken || "";
    const refreshToken = session?.refreshToken || "";

    if (!idToken) {
      throw new Error("Could not establish authenticated session.");
    }

    // Replace guest session with Cognito-backed session
    localStorage.setItem("access_token", idToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_name", `${form.first_name.trim()} ${form.last_name.trim()}`.trim());

    localStorage.removeItem("is_guest");
    localStorage.removeItem("guest_id");
    localStorage.removeItem("guest_email");
    localStorage.removeItem("guest_name");

    try {
      window.dispatchEvent(new Event("auth:changed"));
    } catch {
      // no-op
    }

    // Re-join current meeting as authenticated audience user.
    const current = new URL(window.location.href);
    if (current.pathname.startsWith("/live/")) {
      current.searchParams.set("role", "audience");
      window.location.replace(current.toString());
      return;
    }
    window.location.replace("/events");
  };

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
    if (!form.password.trim()) {
      setError("Password is required");
      return false;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setError("");
    if (stage === "confirm") {
      if (!verifyCode.trim()) {
        setError("Verification code is required.");
        return;
      }
      setLoading(true);
      try {
        await cognitoConfirmSignUp({
          username: pendingUsername,
          code: verifyCode.trim(),
        });

        const session = await cognitoSignIn({
          usernameOrEmail: pendingUsername,
          password: form.password,
        });

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.idToken}`,
          },
          body: JSON.stringify({
            username: pendingUsername,
            email: form.email.trim().toLowerCase(),
            firstName: form.first_name.trim(),
            lastName: form.last_name.trim(),
            timezone: tz,
          }),
        });

        const guestToken = localStorage.getItem("access_token");
        if (guestToken) {
          await fetch(`${API_BASE}/auth/guest-register/link/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${guestToken}`,
            },
            body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
          });
        }

        localStorage.setItem("guest_email", form.email.trim().toLowerCase());
        const displayName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
        if (displayName) localStorage.setItem("guest_name", displayName);
        switchToRegisteredSessionAndRejoin(session);
      } catch (err) {
        const msg =
          err?.code === "CodeMismatchException"
            ? "Invalid verification code."
            : err?.code === "ExpiredCodeException"
              ? "Verification code expired."
              : err?.message || "Verification failed.";
        setError(msg);
        console.error("Guest verification error:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      let emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (!emailPrefix) emailPrefix = "user";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const username = `${emailPrefix}${randomSuffix}`;

      await cognitoSignUp({
        username,
        email,
        firstName: form.first_name.trim(),
        lastName: form.last_name.trim(),
        password: form.password,
      });

      setPendingUsername(username);
      setStage("confirm");
    } catch (err) {
      const msg =
        err?.code === "UsernameExistsException"
          ? "Email is already registered."
          : err?.code === "InvalidPasswordException"
            ? "Password does not meet requirements."
            : err?.code === "InvalidParameterException"
              ? err?.message || "Invalid input."
              : err?.message || "Registration failed.";
      setError(msg);
      console.error("Guest registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Success screen: verified and linked
  if (stage === "done") {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Registration Complete</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Typography variant="body1">
              Your account has been verified for{" "}
              <Typography component="span" sx={{ fontWeight: 600 }}>
                {form.email}
              </Typography>
              .
            </Typography>

            <Typography variant="body2" color="textSecondary">
              You can continue the event now and sign in anytime with this account.
            </Typography>

            <Alert severity="info">
              Account setup completed successfully.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                setStage("signup");
                setVerifyCode("");
                setPendingUsername("");
                onClose();
              }}
              sx={{ py: 1 }}
            >
              Join Meeting Again
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Complete Your Registration</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary">
            {stage === "confirm"
              ? "Enter the verification code sent to your email."
              : "Create an account to save your connections and access recordings."}
          </Typography>

          <TextField
            label="First Name"
            required
            fullWidth
            size="small"
            value={form.first_name}
            onChange={handleInputChange("first_name")}
            disabled={loading || stage === "confirm"}
          />
          <TextField
            label="Last Name"
            required
            fullWidth
            size="small"
            value={form.last_name}
            onChange={handleInputChange("last_name")}
            disabled={loading || stage === "confirm"}
          />
          <TextField
            label="Email"
            required
            type="email"
            fullWidth
            size="small"
            value={form.email}
            onChange={handleInputChange("email")}
            disabled={loading || stage === "confirm"}
          />

          {/* Password field */}
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            fullWidth
            size="small"
            value={form.password}
            onChange={handleInputChange("password")}
            disabled={loading || stage === "confirm"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Confirm password field */}
          <TextField
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            required
            fullWidth
            size="small"
            value={form.confirm_password}
            onChange={handleInputChange("confirm_password")}
            disabled={loading || stage === "confirm"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm(!showConfirm)}
                    edge="end"
                    size="small"
                  >
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {stage === "confirm" && (
            <TextField
              label="Verification Code"
              placeholder="Enter code from email"
              fullWidth
              size="small"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ""))}
              disabled={loading}
            />
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleRegister}
            disabled={
              loading ||
              !form.first_name.trim() ||
              !form.last_name.trim() ||
              !form.email.trim() ||
              !form.password ||
              !form.confirm_password
            }
            sx={{ py: 1 }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              stage === "confirm" ? "Verify Code" : "Create Your Account"
            )}
          </Button>

          <Typography variant="caption" color="textSecondary" sx={{ textAlign: "center" }}>
            {stage === "confirm"
              ? `Code sent to ${form.email}`
              : "Password must be at least 8 characters"}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
