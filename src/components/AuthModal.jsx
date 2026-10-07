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
import { useNavigate } from "#navigation";
import { toast } from "react-toastify";
import { cognitoSignIn, cognitoSignUp, cognitoConfirmSignUp, cognitoResendSignUp } from "../utils/cognitoAuth";
import { saveLoginPayload } from "../utils/authStorage";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";
import { API_BASE } from "../utils/api";
import { randomString, pkceChallengeFromVerifier } from "../utils/pkce";
import { wordpressAuthService } from "../services/wordpressAuth";
import { assertAccountCanLogin } from "../services/accountStatus";
import { removeAccessToken, removeIdToken, removeRefreshToken } from "../utils/tokenStore";
import { establishMemberAuthSession } from "../utils/memberAuthSession";
import imaaLogo from "../assets/IMAA-logo130.svg";

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4" />
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853" />
    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4069 3.78409 7.83 3.96409 7.29V4.9582H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05" />
    <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.9582L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z" fill="#EA4335" />
  </svg>
);

const LINKEDIN_ICON = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 1.2891C0 0.5771 0.5927 0 1.3232 0H16.6768C17.4073 0 18 0.5771 18 1.2891V16.7109C18 17.4229 17.4073 18 16.6768 18H1.3232C0.5927 18 0 17.4229 0 16.7109V1.2891Z" fill="#0A66C2" />
    <path d="M5.4521 15.0938V6.9375H2.7207V15.0938H5.4521ZM4.0869 5.8008C5.0039 5.8008 5.5713 5.1973 5.5713 4.4414C5.5547 3.668 5.0039 3.082 4.1035 3.082C3.2031 3.082 2.6191 3.668 2.6191 4.4414C2.6191 5.1973 3.1865 5.8008 4.0693 5.8008H4.0869ZM9.9707 15.0938V10.6055C9.9707 10.3594 9.9883 10.1133 10.0605 9.9375C10.2559 9.4453 10.7012 8.9355 11.4551 8.9355C12.4414 8.9355 12.832 9.6914 12.832 10.7871V15.0938H15.5635V10.4824C15.5635 7.9512 14.2148 6.7793 12.4238 6.7793C10.9629 6.7793 10.3438 7.5879 10.0078 8.1504H10.0254V6.9375H7.2939C7.3281 7.6758 7.2939 15.0938 7.2939 15.0938H9.9707Z" fill="white" />
  </svg>
);

const IMAA_ICON = (
  <Box
    component="span"
    sx={{
      width: 18,
      height: 18,
      borderRadius: "50%",
      bgcolor: "var(--imaa-navy)",
      color: "var(--imaa-teal)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 800,
      lineHeight: 1,
    }}
  >
    I
  </Box>
);

const imaaLogoSrc = typeof imaaLogo === "string" ? imaaLogo : imaaLogo.src;
const ENABLE_IMAA_SSO = String(import.meta.env.VITE_ENABLE_IMAA_SSO || "false").toLowerCase() === "true";
const IMAA_SSO_IDP_NAME = import.meta.env.VITE_COGNITO_IMAA_IDP_NAME || "IMAAWordPress";

const DEACTIVATED_ACCOUNT_MESSAGE =
  "This account has been deactivated by an administrator. Please contact support.";

const ACCOUNT_STATUS_MESSAGES = {
  account_deleted: DEACTIVATED_ACCOUNT_MESSAGE,
  account_inactive: DEACTIVATED_ACCOUNT_MESSAGE,
  account_suspended: "Your account has been suspended. Please contact support for assistance.",
  account_disabled: "This account has been disabled due to policy violations.",
  account_memorialized: "This account has been memorialized.",
};

const getErrorCode = (error) =>
  String(error?.code || error?.name || "").trim();

const isCognitoDisabledAccountError = (error) => {
  const code = getErrorCode(error);
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "UserDisabledException" ||
    message.includes("user is disabled") ||
    message.includes("account is disabled") ||
    message.includes("user disabled")
  );
};

const getAccountStatusMessage = (error) => {
  const code = getErrorCode(error);
  if (ACCOUNT_STATUS_MESSAGES[code]) return ACCOUNT_STATUS_MESSAGES[code];

  const message = String(error?.message || "");
  if (message.toLowerCase().includes("deactivated by an administrator")) {
    return DEACTIVATED_ACCOUNT_MESSAGE;
  }
  return "";
};

// Dark-mode aware colours: each is the light value wrapped in its dark-mode override token
// (src/styles/brand.css "Dark-mode override tokens"), so light mode is unchanged and dark mode
// gets readable surfaces and text. Brand fills (coral, navy, teal) stay fixed.
const SURFACE = "var(--imaa-dm-surface, #FFFFFF)"; // dialog card
const SURFACE_INSET = "var(--imaa-dm-surface-alt, #FFFFFF)"; // fields and the mode-toggle track
const SURFACE_HOVER = "var(--imaa-dm-surface-hover, #F7F8FA)";
const TEXT = "var(--imaa-dm-text, #1B2A4A)";
const TEXT_BODY = "var(--imaa-dm-text-body, #5A6070)";
const TEXT_META = "var(--imaa-dm-text-meta, #747A88)";
const TEXT_HINT = "var(--imaa-dm-text-hint, #B0B4BC)";
const FIELD_BORDER = "var(--imaa-dm-border-strong, #DCE5EC)";
const FIELD_BORDER_HOVER = "var(--imaa-dm-text-hint, #A9BAC8)";
const HAIRLINE = "var(--imaa-dm-border, #E2E4E8)";
const TEAL_TEXT = "var(--imaa-dm-teal-text, #0A9396)"; // focused label: lighter teal on dark grounds

// Auth field styling (design tokens). 16px text on phones so iOS doesn't zoom in on focus.
const inputSx = {
  "& .MuiFormHelperText-root": {
    mx: 0,
    mt: 0.75,
    fontSize: 12,
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    fontSize: 14,
    minHeight: 48,
    // Transparent field background (upstream design); text and borders follow the dark tokens.
    bgcolor: "transparent",
    color: TEXT,
    "& fieldset": { borderColor: FIELD_BORDER },
    "&:hover fieldset": { borderColor: FIELD_BORDER_HOVER },
    "&.Mui-focused fieldset": { borderColor: "#0A9396", borderWidth: 2 },
    "@media (max-width: 599.95px)": { fontSize: 16 },
  },
  "& .MuiInputLabel-root": { fontSize: 14, color: TEXT_BODY },
  "& .MuiInputLabel-root.Mui-focused": { color: TEAL_TEXT },
  "& .MuiInputBase-input": {
    py: 1.45,
    bgcolor: "transparent",
    color: TEXT,
    caretColor: TEXT,
    "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active": {
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: TEXT,
      WebkitBoxShadow: "0 0 0 1000px transparent inset",
      transition: "background-color 9999s ease-out 0s",
      caretColor: TEXT,
    },
  },
};

// Primary auth action: coral pill, matching the public IMAA-style CTA treatment.
const primaryButtonSx = {
  borderRadius: "999px",
  py: 1.35,
  bgcolor: "#E84C38",
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: 0.2,
  textTransform: "uppercase",
  "&:hover": { bgcolor: "#CC4422", boxShadow: "0 8px 20px rgba(232, 76, 56, 0.22)" },
  boxShadow: "none",
};

const socialButtonSx = {
  textTransform: "none",
  fontWeight: 700,
  fontSize: 14,
  borderColor: FIELD_BORDER,
  color: TEXT,
  borderRadius: "999px",
  py: 1.05,
  bgcolor: SURFACE,
  "&:hover": {
    borderColor: FIELD_BORDER_HOVER,
    bgcolor: SURFACE_HOVER,
  },
};

// Modal title: serif heading, the dialog's accessible name
const AUTH_TITLE_ID = "auth-modal-title";

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
  const [resendTimer, setResendTimer] = useState(0);

  // Timer Effect
  React.useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Start timer when entering confirm mode
  React.useEffect(() => {
    if (mode === "confirm" && resendTimer === 0) {
      setResendTimer(60);
    }
  }, [mode]);

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
    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail || !loginPassword) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      // Check the authoritative local status first so an administrator-deactivated
      // account shows a stable message instead of entering Cognito/WordPress retries.
      await assertAccountCanLogin(trimmedEmail);

      // Step 1: Try primary Cognito login
      try {
        const result = await cognitoSignIn({ usernameOrEmail: trimmedEmail, password: loginPassword });

        // Cognito success
        if (onLoginSuccess) {
          const data = {
            access_token: result.idToken || "",
            access: result.accessToken || "",
            refresh: result.refreshToken || "",
            user: result.payload,
            id_token: result.idToken || "",
            email: trimmedEmail,
          };
          onLoginSuccess(data);
        } else {
          const memberToken = await establishMemberAuthSession({
            accessToken: result.idToken,
            idToken: result.idToken,
            refreshToken: result.refreshToken,
            cognitoAccessToken: result.accessToken,
          });
          saveLoginPayload({ id_token: memberToken, access_token: memberToken, refresh: "", user: result.payload });
          window.dispatchEvent(new Event("auth:changed"));
          handleClose();
          navigate("/community?view=home", { replace: true });
        }
      } catch (cognitoErr) {
        // A disabled Cognito account is a terminal account-state failure. Do
        // not repeatedly retry WordPress or replace it with "invalid password".
        if (isCognitoDisabledAccountError(cognitoErr)) {
          const disabledError = new Error(DEACTIVATED_ACCOUNT_MESSAGE);
          disabledError.code = "account_deleted";
          throw disabledError;
        }

        // Step 2: Cognito failed for a non-terminal reason; try WordPress fallback.
        console.log("Cognito login failed, attempting WordPress fallback...");
        
        try {
          const wpResult = await wordpressAuthService.loginWithWordPress(trimmedEmail, loginPassword);
          
          // WordPress success - normalize response for saveLoginPayload
          const normalizedPayload = {
            access_token: wpResult.id_token || wpResult.access_token,
            access: wpResult.access_token,
            id_token: wpResult.id_token || wpResult.access_token,
            refresh: wpResult.refresh_token,
            user: {
              id: wpResult.user_id,
              username: wpResult.username,
              email: wpResult.email,
              name: wpResult.username,
              first_name: wpResult.username
            }
          };

          if (onLoginSuccess) {
            onLoginSuccess({
              ...normalizedPayload,
              email: trimmedEmail
            });
          } else {
            const memberToken = await establishMemberAuthSession({
              accessToken: normalizedPayload.access_token,
              idToken: normalizedPayload.id_token,
              refreshToken: normalizedPayload.refresh,
              cognitoAccessToken: normalizedPayload.access,
            });
            saveLoginPayload(
              { ...normalizedPayload, access_token: memberToken, id_token: memberToken, refresh: "" },
              { email: trimmedEmail },
            );
            window.dispatchEvent(new Event("auth:changed"));
            handleClose();
            navigate("/community?view=home", { replace: true });
          }
        } catch (wpErr) {
          console.error("WordPress fallback also failed:", wpErr);
          const accountStatusMessage = getAccountStatusMessage(wpErr);
          if (accountStatusMessage) {
            const statusError = new Error(accountStatusMessage);
            statusError.code = wpErr?.code || "account_deleted";
            throw statusError;
          }
          throw new Error("Invalid email or password. Please try again.");
        }
      }
    } catch (err) {
      const accountStatusMessage = getAccountStatusMessage(err);
      setError(
        accountStatusMessage ||
        err?.message ||
        "Invalid email or password. Please try again."
      );
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

          // Establish the member session before exposing the signed-in UI.
          const memberToken = await establishMemberAuthSession({
            accessToken: session.idToken,
            idToken: session.idToken,
            refreshToken: session.refreshToken,
            cognitoAccessToken: session.accessToken,
          });
          saveLoginPayload({ id_token: memberToken, access_token: memberToken, refresh: "" });
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

  const handleResendCode = async () => {
    if (resendTimer > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await cognitoResendSignUp({ username: pendingUsername || signupData.email.trim() });
      toast.info("📩 A new verification code has been sent to your email.");
      setResendTimer(60); // Reset timer
    } catch (err) {
      setError(err?.message || "Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    const base = import.meta.env.VITE_COGNITO_DOMAIN || "";
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
    const redirect = import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/cognito/callback`;
    if (base && clientId) {
      // Prevent stale-session refresh loops while OAuth callback is in progress.
      removeAccessToken();
      removeRefreshToken();
      removeIdToken();
      localStorage.removeItem("user");

      const state = randomString(16);
      const verifier = randomString(48);
      const challenge = await pkceChallengeFromVerifier(verifier);

      sessionStorage.setItem(`pkce_verifier_${state}`, verifier);
      localStorage.setItem(`pkce_verifier_${state}`, verifier);

      const intended =
        new URLSearchParams(window.location.search).get("next") ||
        window.location.pathname ||
        "/account/events";
      sessionStorage.setItem(`post_login_redirect_${state}`, intended);
      localStorage.setItem(`post_login_redirect_${state}`, intended);

      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirect,
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        identity_provider: provider,
      });

      window.location.href = `${base}/oauth2/authorize?${params.toString()}`;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby={AUTH_TITLE_ID}
      PaperProps={{
        sx: {
          width: { xs: "calc(100% - 32px)", sm: "min(900px, calc(100% - 48px))" },
          maxWidth: 900,
          borderRadius: { xs: "18px", sm: "22px" },
          boxShadow: "0 24px 70px rgba(27, 42, 74, 0.18)",
          p: 0,
          overflow: "hidden",
          bgcolor: SURFACE,
          border: "1px solid var(--imaa-dm-border, rgba(27, 42, 74, 0.08))",
        },
      }}
      BackdropProps={{
        sx: {
          // Transparent blurred backdrop (upstream design); works on light and dark pages alike.
          bgcolor: "transparent",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" },
          minHeight: { xs: "auto", md: 560 },
          bgcolor: SURFACE,
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            p: 4,
            color: "#FFFFFF",
            background:
              "linear-gradient(150deg, rgba(27,42,74,0.96) 0%, rgba(36,62,117,0.94) 58%, rgba(10,147,150,0.82) 100%)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              width: 220,
              height: 220,
              border: "22px solid rgba(255,255,255,0.12)",
              borderRadius: "28px",
              transform: "rotate(45deg)",
              top: -78,
              right: -72,
            },
            "&::after": {
              content: '""',
              position: "absolute",
              width: 160,
              height: 160,
              border: "18px solid rgba(232,76,56,0.24)",
              borderRadius: "24px",
              transform: "rotate(45deg)",
              bottom: -64,
              left: -58,
            },
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box
              component="img"
              src={imaaLogoSrc}
              alt="IMAA"
              sx={{
                width: 140,
                height: "auto",
                display: "block",
                bgcolor: "#FFFFFF",
                borderRadius: "12px",
                p: 1.4,
                boxShadow: "0 10px 28px rgba(0,0,0,0.16)",
              }}
            />
          </Box>
          <Box sx={{ position: "relative", zIndex: 1, maxWidth: 280 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: "#72E0DC", mb: 1.5 }}>
              IMAA Connect
            </Typography>
            <Box
              component="p"
              sx={{
                m: 0,
                fontFamily: "var(--imaa-font-serif)",
                fontSize: 34,
                lineHeight: 1.08,
                fontWeight: 700,
              }}
            >
              Access your professional network.
            </Box>
            <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 1.7 }}>
              Events, resources and community tools in one secure member area.
            </Typography>
          </Box>
        </Box>

        {/* Close button */}
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 2,
            color: TEXT_BODY,
            bgcolor: "var(--imaa-dm-glass, rgba(255,255,255,0.86))",
            border: "1px solid var(--imaa-dm-border, rgba(27,42,74,0.08))",
            "&:hover": { bgcolor: SURFACE_HOVER },
          }}
          aria-label="Close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <DialogContent
          sx={{
            p: { xs: 3, sm: 4.5, md: 5 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            bgcolor: SURFACE,
          }}
        >
          {/* ── Title (one h1 for the active view; plain element because index.css forces sans on Typography) ── */}
          <Box
            component="h1"
            id={AUTH_TITLE_ID}
            sx={{
              m: 0,
              fontFamily: "var(--imaa-font-serif)",
              fontWeight: 700,
              fontSize: { xs: 26, sm: 30 },
              lineHeight: 1.15,
              color: TEXT,
              mb: 0.5,
              pr: 3,
              textAlign: "left",
            }}
          >
            {mode === "confirm" ? "Verify your email" : "Sign in or create an account"}
          </Box>

          {/* ── Mode toggle (Login / Signup) ── */}
          {mode !== "confirm" && (
            <Box role="group" aria-label="Log in or sign up" sx={{ display: "flex", bgcolor: "var(--imaa-dm-surface-alt, #F0F4F5)", borderRadius: 100, p: 0.5, mb: 3, mt: 2.5 }}>
              {["login", "signup"].map((m) => (
                <Box
                  key={m}
                  component="button"
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => { setMode(m); setError(""); }}
                  sx={{
                    flex: 1, textAlign: "center", py: 0.75, borderRadius: 100,
                    border: 0, font: "inherit", fontFamily: "var(--imaa-font-sans)",
                    cursor: "pointer", fontSize: 14, fontWeight: mode === m ? 600 : 500,
                    color: mode === m ? TEXT : TEXT_BODY,
                    // Selected pill: white on the light track; a raised neutral fill on the dark track.
                    bgcolor: mode === m ? "var(--imaa-dm-muted, #FFFFFF)" : "transparent",
                    boxShadow: mode === m ? "0 3px 10px rgba(27,42,74,0.10)" : "none",
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
          {error && <Alert severity="error" sx={{ mb: 2, fontSize: 13, borderRadius: "var(--imaa-radius-card)" }}>{error}</Alert>}

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
                      <IconButton size="small" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? "Hide password" : "Show password"}>
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
                  sx={{ fontSize: 13, color: "#E84C38", fontWeight: 700 }}
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
                sx={primaryButtonSx}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Log in"}
              </Button>
            </Box>
          )}

          {/* ─────────── SIGNUP FORM ─────────── */}
          {mode === "signup" && (
            <Box component="form" onSubmit={handleSignup} noValidate>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 2 }}>
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
                      <IconButton size="small" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? "Hide password" : "Show password"}>
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
                      <IconButton size="small" onClick={() => setShowPwd2(v => !v)} aria-label={showPwd2 ? "Hide confirm password" : "Show confirm password"}>
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
                sx={primaryButtonSx}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Create account"}
              </Button>
            </Box>
          )}

          {/* ─────────── CONFIRM FORM ─────────── */}
          {mode === "confirm" && (
            <Box component="form" onSubmit={handleConfirm} noValidate>
              <Typography variant="body2" sx={{ color: "var(--imaa-ink-body)", mb: 2.5, textAlign: "center" }}>
                We sent a verification code to <strong>{signupData.email}</strong>. Enter it below.
              </Typography>
              <TextField
                label="Verification code" fullWidth value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                sx={{ ...inputSx, mb: 1.5 }}
                autoFocus inputProps={{ maxLength: 8 }}
                error={error.includes("expired") || error.includes("Invalid")}
              />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, px: 0.5 }}>
                <MuiLink
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setResendTimer(0);
                  }}
                  sx={{ color: TEXT_BODY, textDecoration: "none", fontSize: 13, "&:hover": { textDecoration: "underline" } }}
                >
                  Change email address
                </MuiLink>

                <Button
                  variant="text"
                  size="small"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || loading}
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: resendTimer > 0 ? TEXT_HINT : "#E84C38",
                    textTransform: "none",
                    "&:hover": { bgcolor: "transparent", textDecoration: "underline" }
                  }}
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                </Button>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={primaryButtonSx}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Verify & continue"}
              </Button>
            </Box>
          )}

          {/* ── Social login ── */}
          {mode !== "confirm" && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", my: 2.5, gap: 1.5 }}>
                <Box sx={{ flex: 1, height: "1px", bgcolor: HAIRLINE }} />
                <Typography variant="caption" sx={{ color: TEXT_META, fontWeight: 600, whiteSpace: "nowrap" }}>Continue with</Typography>
                <Box sx={{ flex: 1, height: "1px", bgcolor: HAIRLINE }} />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {ENABLE_IMAA_SSO && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={IMAA_ICON}
                    onClick={() => handleSocialLogin(IMAA_SSO_IDP_NAME)}
                    sx={socialButtonSx}
                  >
                    Continue with IMAA
                  </Button>
                )}
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={GOOGLE_ICON}
                    onClick={() => handleSocialLogin("Google")}
                    sx={socialButtonSx}
                  >
                    Google
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={LINKEDIN_ICON}
                    onClick={() => handleSocialLogin("LinkedIn")}
                    sx={socialButtonSx}
                  >
                    LinkedIn
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Box>
    </Dialog>
  );
}
