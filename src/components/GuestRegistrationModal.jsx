import React, { useEffect, useMemo, useState } from "react";
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
  Checkbox,
  FormControlLabel,
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
export default function GuestRegistrationModal({ open, onClose: onCloseProp }) {
  const buildInitialForm = () => {
    const guestEmail = localStorage.getItem("guest_email") || "";
    const guestName = localStorage.getItem("guest_name") || "";
    const guestCompany = localStorage.getItem("guest_company") || "";
    const guestJobTitle = localStorage.getItem("guest_job_title") || "";
    const nameParts = guestName.trim().split(/\s+/).filter(Boolean);

    return {
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" "),
      email: guestEmail,
      company: guestCompany,
      job_title: guestJobTitle,
      password: "",
      confirm_password: "",
    };
  };

  const [form, setForm] = useState(buildInitialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stage, setStage] = useState("signup"); // signup | confirm | done
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [originalGuestEmail, setOriginalGuestEmail] = useState(
    () => (localStorage.getItem("guest_email") || "").trim().toLowerCase()
  );
  const [allowDifferentEmail, setAllowDifferentEmail] = useState(false);

  const normalizedSignupEmail = useMemo(
    () => form.email.trim().toLowerCase(),
    [form.email]
  );
  const hasDifferentSignupEmail = Boolean(
    normalizedSignupEmail &&
    originalGuestEmail &&
    normalizedSignupEmail !== originalGuestEmail
  );

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm());
    setOriginalGuestEmail((localStorage.getItem("guest_email") || "").trim().toLowerCase());
    setAllowDifferentEmail(false);
    setStage("signup");
    setVerifyCode("");
    setPendingUsername("");
    setError("");
  }, [open]);

  const onClose = () => {
    setStage("signup");
    setVerifyCode("");
    setPendingUsername("");
    setError("");
    setAllowDifferentEmail(false);
    onCloseProp();
  };

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
    localStorage.removeItem("guest_session_cache");
    localStorage.removeItem("guest_job_title");
    localStorage.removeItem("guest_company");

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address");
      return false;
    }
    if (hasDifferentSignupEmail && !allowDifferentEmail) {
      setError("Please confirm that you want to sign up with a different email address.");
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
        const bootstrapResponse = await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
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
            company: form.company.trim(),
            job_title: form.job_title.trim(),
            timezone: tz,
          }),
        });

        if (!bootstrapResponse.ok) {
          let bootstrapData = {};
          try {
            bootstrapData = await bootstrapResponse.json();
          } catch {
            bootstrapData = {};
          }
          throw new Error(bootstrapData?.detail || "We could not save your account profile.");
        }

        const guestToken = localStorage.getItem("access_token");
        if (guestToken) {
          const linkResponse = await fetch(`${API_BASE}/auth/guest-register/link/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${guestToken}`,
            },
            body: JSON.stringify({
              email: form.email.trim().toLowerCase(),
              guest_email: originalGuestEmail,
              first_name: form.first_name.trim(),
              last_name: form.last_name.trim(),
              company: form.company.trim(),
              job_title: form.job_title.trim(),
              email_changed: hasDifferentSignupEmail,
              preserve_guest_email_history: !hasDifferentSignupEmail || allowDifferentEmail,
            }),
          });

          if (!linkResponse.ok) {
            let linkData = {};
            try {
              linkData = await linkResponse.json();
            } catch {
              linkData = {};
            }
            throw new Error(
              linkData?.error ||
              linkData?.message ||
              "We could not link your guest session to the new account."
            );
          }

          // Capture profile data from link response
          const linkData = await linkResponse.json();
          const profile = linkData?.profile || {};

          // Persist profile fields locally so UI updates immediately after rejoin
          if (profile.job_title) localStorage.setItem("user_job_title", profile.job_title);
          if (profile.company) localStorage.setItem("user_company", profile.company);
          if (profile.full_name) localStorage.setItem("user_name", profile.full_name);
        }

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

  const DARK_MODAL_PAPER_PROPS = {
    sx: {
      backgroundColor: "#1a1a1a",
      backgroundImage: "none",
      color: "rgba(255,255,255,0.95)",
    },
  };

  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      color: "rgba(255,255,255,0.95)",
      "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
      "&.Mui-focused fieldset": { borderColor: "primary.main" },
    },
    "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.5)", opacity: 1 },
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "primary.main" },
  };

  // Success screen: verified and linked
  if (stage === "done") {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={DARK_MODAL_PAPER_PROPS}>
        <DialogTitle sx={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Registration Complete</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.95)" }}>
              Your account has been verified for{" "}
              <Typography component="span" sx={{ fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>
                {form.email}
              </Typography>
              .
            </Typography>

            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              You can continue the event now and sign in anytime with this account.
            </Typography>

            <Alert severity="info" sx={{ backgroundColor: "rgba(25, 103, 210, 0.1)", color: "#64B5F6" }}>
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
              sx={{ py: 1, color: "#ffffff", fontWeight: 600 }}
            >
              Join Meeting Again
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={DARK_MODAL_PAPER_PROPS}>
      <DialogTitle sx={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Complete Your Registration</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ backgroundColor: "rgba(244, 67, 54, 0.1)", color: "#EF5350" }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
            {stage === "confirm"
              ? "Enter the verification code sent to your email."
              : "Create an account to save your connections and access recordings."}
          </Typography>

          {stage === "signup" && (
            <>
              <TextField
                label="First Name"
                required
                fullWidth
                size="small"
                value={form.first_name}
                onChange={handleInputChange("first_name")}
                disabled={loading}
                sx={textFieldSx}
              />
              <TextField
                label="Last Name"
                required
                fullWidth
                size="small"
                value={form.last_name}
                onChange={handleInputChange("last_name")}
                disabled={loading}
                sx={textFieldSx}
              />
              <TextField
                label="Email"
                required
                type="email"
                fullWidth
                size="small"
                value={form.email}
                onChange={handleInputChange("email")}
                disabled={loading}
                sx={textFieldSx}
              />
              <TextField
                label="Company"
                fullWidth
                size="small"
                value={form.company}
                onChange={handleInputChange("company")}
                disabled={loading}
                sx={textFieldSx}
              />
              <TextField
                label="Role / Job Title"
                fullWidth
                size="small"
                value={form.job_title}
                onChange={handleInputChange("job_title")}
                disabled={loading}
                sx={textFieldSx}
              />
              {hasDifferentSignupEmail && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allowDifferentEmail}
                        onChange={(e) => setAllowDifferentEmail(e.target.checked)}
                        disabled={loading}
                        sx={{ color: "rgba(255,255,255,0.7)" }}
                      />
                    }
                    label={(
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
                        Sign me up with this different email and keep my original join email linked for attendance history.
                      </Typography>
                    )}
                    sx={{ alignItems: "flex-start", m: 0 }}
                  />
                  <Alert severity="info" sx={{ backgroundColor: "rgba(25, 103, 210, 0.1)", color: "#64B5F6" }}>
                    Joined as <strong>{originalGuestEmail}</strong>, signing up as <strong>{normalizedSignupEmail}</strong>.
                  </Alert>
                </>
              )}

              {/* Password field */}
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                fullWidth
                size="small"
                value={form.password}
                onChange={handleInputChange("password")}
                disabled={loading}
                sx={textFieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: "rgba(255,255,255,0.6)" }}
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
                disabled={loading}
                sx={textFieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirm(!showConfirm)}
                        edge="end"
                        size="small"
                        sx={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}

          {stage === "confirm" && (
            <>
              {hasDifferentSignupEmail && (
                <Alert severity="info" sx={{ backgroundColor: "rgba(25, 103, 210, 0.1)", color: "#64B5F6" }}>
                  We will link your guest attendance from {originalGuestEmail} to your new account {normalizedSignupEmail}.
                </Alert>
              )}
              <TextField
                label="Verification Code"
                placeholder="Enter code from email"
                fullWidth
                size="small"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ""))}
                disabled={loading}
                sx={textFieldSx}
              />
            </>
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
            sx={{ py: 1, color: "#ffffff", fontWeight: 600 }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              stage === "confirm" ? "Verify Code" : "Create Your Account"
            )}
          </Button>

          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            {stage === "confirm"
              ? `Code sent to ${form.email}`
              : "Password must be at least 8 characters"}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
