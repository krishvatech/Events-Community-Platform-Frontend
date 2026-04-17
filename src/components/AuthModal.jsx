// src/components/AuthModal.jsx
// Modal login/signup overlay — matches the provided design reference
import React, { useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  TextField,
  Button,
  Divider,
  InputAdornment,
  IconButton,
  Link as MuiLink,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff, Close as CloseIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { cognitoSignIn, cognitoSignUp, cognitoConfirmSignUp } from "../utils/cognitoAuth";
import { saveLoginPayload } from "../utils/authStorage";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";
import { API_BASE } from "../utils/api";

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4069 3.78409 7.83 3.96409 7.29V4.9582H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
    <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.9582L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z" fill="#EA4335"/>
  </svg>
);

const LINKEDIN_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 1.2891C0 0.5771 0.5927 0 1.3232 0H16.6768C17.4073 0 18 0.5771 18 1.2891V16.7109C18 17.4229 17.4073 18 16.6768 18H1.3232C0.5927 18 0 17.4229 0 16.7109V1.2891Z" fill="#0A66C2"/>
    <path d="M5.4521 15.0938V6.9375H2.7207V15.0938H5.4521ZM4.0869 5.8008C5.0039 5.8008 5.5713 5.1973 5.5713 4.4414C5.5547 3.668 5.0039 3.082 4.1035 3.082C3.2031 3.082 2.6191 3.668 2.6191 4.4414C2.6191 5.1973 3.1865 5.8008 4.0693 5.8008H4.0869ZM9.9707 15.0938V10.6055C9.9707 10.3594 9.9883 10.1133 10.0605 9.9375C10.2559 9.4453 10.7012 8.9355 11.4551 8.9355C12.4414 8.9355 12.832 9.6914 12.832 10.7871V15.0938H15.5635V10.4824C15.5635 7.9512 14.2148 6.7793 12.4238 6.7793C10.9629 6.7793 10.3438 7.5879 10.0078 8.1504H10.0254V6.9375H7.2939C7.3281 7.6758 7.2939 15.0938 7.2939 15.0938H9.9707Z" fill="white"/>
  </svg>
);

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    fontSize: 14,
    bgcolor: "#F8FAFC",
    "& fieldset": { borderColor: "#E2E8F0" },
    "&:hover fieldset": { borderColor: "#CBD5E1" },
    "&.Mui-focused fieldset": { borderColor: "#0F2040" },
  },
  "& .MuiInputLabel-root": { fontSize: 14 },
  "& .MuiInputLabel-root.Mui-focused": { color: "#0F2040" },
};

export default function AuthModal({ open, onClose, initialMode = "login", onLoginSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);   // "login" | "signup" | "confirm"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupData, setSignupData] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [signupErrors, setSignupErrors] = useState({});
  const [pendingUsername, setPendingUsername] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const truthy = (v) => {
    if (v === true || v === 1) return true;
    if (typeof v === "string") return ["true", "1", "yes", "y", "on"].includes(v.trim().toLowerCase());
    return false;
  };

  const isStaffOrAdmin = (u) =>
    !!(truthy(u?.is_staff) || truthy(u?.is_superuser) || truthy(u?.is_admin) || truthy(u?.staff));

  const handleClose = () => {
    setError("");
    setLoading(false);
    setMode(initialMode);
    if (onClose) onClose();
  };

  // ─── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!loginEmail.trim() || !loginPassword) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const result = await cognitoSignIn({ usernameOrEmail: loginEmail.trim(), password: loginPassword });

      // Call parent's onLoginSuccess if provided — let it handle token storage and redirect
      if (onLoginSuccess) {
        const data = {
          access_token: result.idToken || "",
          access: result.accessToken || "",
          refresh: result.refreshToken || "",
          user: result.payload,
          id_token: result.idToken || "",
          email: loginEmail.trim(),
        };
        onLoginSuccess(data);
      } else {
        saveLoginPayload({ id_token: result.idToken, refresh: result.refreshToken });
        window.dispatchEvent(new Event("auth:changed"));
        // Redirect to community home
        handleClose();
        navigate("/community?view=home", { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign Up ────────────────────────────────────────────────────────────────
  const filterInput = (value, field) => {
    switch (field) {
      case "firstName":
      case "lastName":
        return value.replace(/[^a-zA-Z]/g, "");
      case "email":
        return value.replace(/\s/g, "");
      case "password":
      case "confirmPassword":
        return value.replace(/\s/g, "");
      default:
        return value;
    }
  };

  const validateSignup = () => {
    const errs = {};
    if (!/^[A-Za-z]{2,}$/.test(signupData.firstName || "")) {
      errs.firstName = "First name must be at least 2 letters";
    }
    if (!/^[A-Za-z]{2,}$/.test(signupData.lastName || "")) {
      errs.lastName = "Last name must be at least 2 letters";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email || "")) {
      errs.email = "Enter a valid email address";
    }
    const strongPwd = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;
    if (!strongPwd.test(signupData.password || "")) {
      errs.password = "Min 8 chars, 1 uppercase, 1 number, 1 special";
    }
    if (signupData.password !== signupData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    setSignupErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateSignup()) return;
    setLoading(true);
    try {
      // ✅ CHECK: Email already registered?
      const email = (signupData.email || "").toLowerCase().trim();
      try {
        const checkResponse = await fetch(`${API_BASE}/auth/check-email/?email=${encodeURIComponent(email)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (checkResponse.ok) {
          const data = await checkResponse.json();
          if (data.exists === true) {
            // Email already registered
            setError(`❌ This email is already registered.`);
            setMode("login");
            setLoginEmail(email);
            toast.info("📩 You can log in with your existing account or reset your password.");
            setLoading(false);
            return;
          }
        }
      } catch (checkErr) {
        console.warn("Email check failed (non-blocking):", checkErr);
        // Continue with signup even if check fails
      }

      // Auto-generate username from email prefix + random suffix
      let emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (!emailPrefix) emailPrefix = "user";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const username = `${emailPrefix}${randomSuffix}`;

      await cognitoSignUp({
        username,
        email: email,
        firstName: (signupData.firstName || "").trim(),
        lastName: (signupData.lastName || "").trim(),
        password: signupData.password,
      });

      toast.info("📩 Verification code sent to your email.");
      setPendingUsername(username);
      setMode("confirm");
    } catch (err) {
      const msg =
        err?.code === "UsernameExistsException" ? "Username already taken" :
          err?.code === "InvalidPasswordException" ? "Password does not match Cognito policy" :
            err?.code === "InvalidParameterException" ? (err?.message || "Invalid input") :
              (err?.message || "Signup failed");
      setError(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Confirm code ───────────────────────────────────────────────────────────
  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    if (!verifyCode.trim()) { setError("Please enter the verification code."); return; }
    setLoading(true);
    try {
      await cognitoConfirmSignUp({ username: pendingUsername || signupData.email.trim(), code: verifyCode.trim() });

      /**
       * DB sync at signup time:
       * 1) silently sign-in to get Cognito Access Token
       * 2) call backend /api/auth/cognito/bootstrap/ with Bearer token
       *    -> backend creates auth_user + profile + community membership
       */
      let session = null;
      try {
        if (signupData.password) {
          session = await cognitoSignIn({
            usernameOrEmail: pendingUsername || signupData.email.trim(),
            password: signupData.password,
          });

          // Save auth payload & dispatch event
          saveLoginPayload({ id_token: session.idToken, refresh: session.refreshToken });
          window.dispatchEvent(new Event("auth:changed"));

          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.idToken}`,
            },
            body: JSON.stringify({
              username: pendingUsername || signupData.email.trim(),
              email: (signupData.email || "").trim().toLowerCase(),
              firstName: (signupData.firstName || "").trim(),
              lastName: (signupData.lastName || "").trim(),
              timezone: tz,
            }),
          });
        }
      } catch (syncErr) {
        // Don't block signup UX if sync fails
        console.warn("Signup DB sync skipped/failed:", syncErr);
      }

      toast.success("✅ Account verified! You can now sign in.");
      setMode("login");
      setSignupData({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
      setVerifyCode("");
    } catch (err) {
      const msg =
        err?.code === "AliasExistsException"
          ? "Email already taken"
          : err?.code === "CodeMismatchException"
            ? "Invalid verification code"
            : err?.code === "ExpiredCodeException"
              ? "Verification code expired"
              : (err?.message || "Verification failed");

      setError(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    const base = import.meta.env.VITE_COGNITO_DOMAIN || "";
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
    const redirect = `${window.location.origin}/cognito/callback`;
    if (base && clientId) {
      window.location.href = `${base}/oauth2/authorize?identity_provider=${provider}&redirect_uri=${encodeURIComponent(redirect)}&response_type=CODE&client_id=${clientId}&scope=email+openid+profile`;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          p: 0,
          overflow: "hidden",
        },
      }}
      BackdropProps={{ sx: { backdropFilter: "blur(4px)", bgcolor: "rgba(0,0,0,.35)" } }}
    >
      <Box sx={{ position: "relative" }}>
        {/* Close button */}
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: "absolute", top: 12, right: 12, zIndex: 1, color: "#64748B" }}
          aria-label="Close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <DialogContent sx={{ p: 4 }}>
          {/* ── Title ── */}
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 20, color: "#0F2040", mb: 0.5, textAlign: "center" }}>
            {mode === "confirm" ? "Verify your email" : "Sign in or create an account"}
          </Typography>

          {/* ── Mode toggle (Login / Signup) ── */}
          {mode !== "confirm" && (
            <Box sx={{ display: "flex", bgcolor: "#F1F5F9", borderRadius: 100, p: 0.5, mb: 3, mt: 2 }}>
              {["login", "signup"].map((m) => (
                <Box
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  sx={{
                    flex: 1, textAlign: "center", py: 0.75, borderRadius: 100,
                    cursor: "pointer", fontSize: 14, fontWeight: mode === m ? 600 : 500,
                    color: mode === m ? "#0F2040" : "#64748B",
                    bgcolor: mode === m ? "#FFFFFF" : "transparent",
                    boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                    transition: "all .18s ease",
                    userSelect: "none",
                  }}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </Box>
              ))}
            </Box>
          )}

          {/* ── Error alert ── */}
          {error && <Alert severity="error" sx={{ mb: 2, fontSize: 13, borderRadius: 2 }}>{error}</Alert>}

          {/* ─────────── LOGIN FORM ─────────── */}
          {mode === "login" && (
            <Box component="form" onSubmit={handleLogin} noValidate>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                sx={{ ...inputSx, mb: 2 }}
                autoComplete="email"
                autoFocus
                required
              />
              <TextField
                label="Password"
                type={showPwd ? "text" : "password"}
                fullWidth
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                sx={{ ...inputSx, mb: 0.5 }}
                autoComplete="current-password"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ textAlign: "right", mb: 2.5 }}>
                <MuiLink
                  href="/forgot-password"
                  underline="hover"
                  sx={{ fontSize: 13, color: "#0F2040", fontWeight: 500 }}
                  onClick={handleClose}
                >
                  Forgot password?
                </MuiLink>
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ borderRadius: 2, py: 1.25, bgcolor: "#0F2040", color: "#FFFFFF", fontWeight: 600, fontSize: 15, textTransform: "none", "&:hover": { bgcolor: "#1a3460" }, boxShadow: "none" }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Log in"}
              </Button>
            </Box>
          )}

          {/* ─────────── SIGNUP FORM ─────────── */}
          {mode === "signup" && (
            <Box component="form" onSubmit={handleSignup} noValidate>
              <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
                <TextField
                  label="First name" fullWidth value={signupData.firstName}
                  onChange={e => setSignupData(p => ({ ...p, firstName: filterInput(e.target.value, "firstName") }))}
                  sx={inputSx} error={!!signupErrors.firstName} helperText={signupErrors.firstName}
                  autoFocus
                />
                <TextField
                  label="Last name" fullWidth value={signupData.lastName}
                  onChange={e => setSignupData(p => ({ ...p, lastName: filterInput(e.target.value, "lastName") }))}
                  sx={inputSx} error={!!signupErrors.lastName} helperText={signupErrors.lastName}
                />
              </Box>
              <TextField
                label="Email address" type="email" fullWidth value={signupData.email}
                onChange={e => setSignupData(p => ({ ...p, email: filterInput(e.target.value, "email") }))}
                sx={{ ...inputSx, mb: 2 }}
                error={!!signupErrors.email} helperText={signupErrors.email}
                autoComplete="email"
              />
              <TextField
                label="Password" type={showPwd ? "text" : "password"} fullWidth value={signupData.password}
                onChange={e => setSignupData(p => ({ ...p, password: filterInput(e.target.value, "password") }))}
                sx={{ ...inputSx, mb: 2 }}
                error={!!signupErrors.password} helperText={signupErrors.password || "Min 8 chars, 1 uppercase, 1 number, 1 special"}
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm password" type={showPwd2 ? "text" : "password"} fullWidth value={signupData.confirmPassword}
                onChange={e => setSignupData(p => ({ ...p, confirmPassword: filterInput(e.target.value, "confirmPassword") }))}
                sx={{ ...inputSx, mb: 2.5 }}
                error={!!signupErrors.confirmPassword} helperText={signupErrors.confirmPassword}
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd2(v => !v)} tabIndex={-1}>
                        {showPwd2 ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ borderRadius: 2, py: 1.25, bgcolor: "#0F2040", color: "#FFFFFF", fontWeight: 600, fontSize: 15, textTransform: "none", "&:hover": { bgcolor: "#1a3460" }, boxShadow: "none" }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Create account"}
              </Button>
            </Box>
          )}

          {/* ─────────── CONFIRM FORM ─────────── */}
          {mode === "confirm" && (
            <Box component="form" onSubmit={handleConfirm} noValidate>
              <Typography variant="body2" sx={{ color: "#64748B", mb: 2.5, textAlign: "center" }}>
                We sent a verification code to <strong>{signupData.email}</strong>. Enter it below.
              </Typography>
              <TextField
                label="Verification code" fullWidth value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                sx={{ ...inputSx, mb: 2.5 }}
                autoFocus inputProps={{ maxLength: 8 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ borderRadius: 2, py: 1.25, bgcolor: "#0F2040", color: "#FFFFFF", fontWeight: 600, fontSize: 15, textTransform: "none", "&:hover": { bgcolor: "#1a3460" }, boxShadow: "none" }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Verify & continue"}
              </Button>
            </Box>
          )}

          {/* ── Social login ── */}
          {mode !== "confirm" && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", my: 2.5, gap: 1.5 }}>
                <Box sx={{ flex: 1, height: "1px", bgcolor: "#E2E8F0" }} />
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500, whiteSpace: "nowrap" }}>Continue with</Typography>
                <Box sx={{ flex: 1, height: "1px", bgcolor: "#E2E8F0" }} />
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={GOOGLE_ICON}
                  onClick={() => handleSocialLogin("Google")}
                  sx={{
                    textTransform: "none", fontWeight: 500, fontSize: 14,
                    borderColor: "#E2E8F0", color: "#374151", borderRadius: 2, py: 1,
                    "&:hover": { borderColor: "#CBD5E1", bgcolor: "#F8FAFC" },
                  }}
                >
                  Google
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={LINKEDIN_ICON}
                  onClick={() => handleSocialLogin("LinkedIn")}
                  sx={{
                    textTransform: "none", fontWeight: 500, fontSize: 14,
                    borderColor: "#E2E8F0", color: "#374151", borderRadius: 2, py: 1,
                    "&:hover": { borderColor: "#CBD5E1", bgcolor: "#F8FAFC" },
                  }}
                >
                  LinkedIn
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Box>
    </Dialog>
  );
}
