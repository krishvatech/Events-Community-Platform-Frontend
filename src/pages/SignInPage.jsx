// src/pages/SignInPage.jsx
import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import SocialLogin from '../components/SocialLogin.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import WordPressLogin from '../components/WordPressLogin.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveLoginPayload } from "../utils/authStorage";
import { useNavigate, useLocation } from 'react-router-dom';
import { cognitoSignIn } from "../utils/cognitoAuth";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";



import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  InputAdornment,
  IconButton,
  CssBaseline,
} from '@mui/material';

import { Visibility, VisibilityOff } from '@mui/icons-material';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

/* 🔔 Simple helper for “Coming Soon” toasts */
const showComingSoon = (feature) => {
  toast.info(`${feature} is coming soon`, {
    autoClose: 2500,
  });
};

/* ───────────────────────── helpers (no CSS changes) ───────────────────────── */

const truthy = (v) => {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["true", "1", "yes", "y", "on"].includes(s);
  }
  return false;
};

const hasRoleName = (arr, names) =>
  Array.isArray(arr) && arr.some(r => {
    const n = String(r?.name ?? r ?? "").toLowerCase();
    return names.some(x => n.includes(x));
  });

/** Deep check: does object contain any /staff flags anywhere */
const deepHasFlag = (obj, keys = ["is_staff", "isSuperuser", "is_superuser", "is_admin", "staff", "admin", "isStaff"]) => {
  const seen = new Set();
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (cur && typeof cur === "object" && !seen.has(cur)) {
      seen.add(cur);
      for (const k of Object.keys(cur)) {
        const v = cur[k];
        // key-based truthy
        if (keys.includes(k) && truthy(v)) return true;
        // array roles/groups/permissions
        if (["roles", "groups", "permissions"].includes(k) && hasRoleName(v, ["admin", "staff"])) return true;
        // nested
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return false;
};

const isStaffUser = (u) =>
  !!(
    truthy(u?.is_staff) ||
    truthy(u?.isSuperuser) ||
    truthy(u?.is_superuser) ||
    truthy(u?.is_admin) ||
    truthy(u?.staff) ||
    truthy(u?.isStaff) ||
    (u?.role && String(u.role).toLowerCase() === "admin") ||
    truthy(u?.user?.is_staff) ||
    truthy(u?.user?.is_superuser) ||
    hasRoleName(u?.groups, ["admin", "staff"]) ||
    hasRoleName(u?.roles, ["admin", "staff"]) ||
    hasRoleName(u?.permissions, ["admin", "staff"]) ||
    deepHasFlag(u) // ← deep fallback
  );

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch { return null; }
};

const getCognitoGroups = (token) => {
  const payload = decodeJwtPayload(token);
  const raw = payload?.["cognito:groups"] || [];
  if (typeof raw === "string") return [raw];
  return Array.isArray(raw) ? raw : [];
};

const fetchJSON = async (url, headers = {}) => {
  try {
    const r = await fetch(url, { headers, credentials: "include" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

const fetchWithManyAuthStyles = async (url, access) => {
  const headerSets = [
    { Authorization: `Bearer ${access}`, Accept: "application/json" },
  ];
  for (const h of headerSets) {
    const obj = await fetchJSON(url, h);
    if (obj) return obj;
  }
  return null;
};

const resolveBackendUser = async (accessToken) => {
  const url = `${API_BASE}/users/me/`;
  const u = await fetchWithManyAuthStyles(url, accessToken);
  if (u) return u;
  return null;
};

const updateTimezone = async (accessToken) => {
  if (!accessToken) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    await fetch(`${API_BASE}/users/me/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ profile: { timezone: tz } }),
    });
  } catch (e) {
    console.warn("Timezone update failed:", e);
  }
};

/** Try hard to resolve current user with staff flags */
const resolveCurrentUser = async (access, fallbackEmail) => {
  // 1) Common "me" endpoints
  const meCandidates = [
    `${API_BASE}/users/me/`,      // custom
    `${API_BASE}/auth/users/me/`, // Djoser
    `${API_BASE}/auth/me/`,
    `${API_BASE}/me/`,
  ];
  for (const url of meCandidates) {
    const u = await fetchWithManyAuthStyles(url, access);
    if (u) return u;
  }

  // 2) If JWT has user_id, try by id
  const payload = decodeJwtPayload(access);
  const uid = payload?.user_id || payload?.id;
  if (uid) {
    const byId = [
      `${API_BASE}/users/${uid}/`,
      `${API_BASE}/auth/users/${uid}/`,
    ];
    for (const url of byId) {
      const u = await fetchWithManyAuthStyles(url, access);
      if (u) return u;
    }
  }

  // 3) Fallback to JWT claims (sometimes include roles)
  if (payload) return payload;

  // 4) Last resort
  const name = (fallbackEmail || "").split("@")[0] || "Member";
  return { first_name: name, email: fallbackEmail };
};

/* ───────────────────────── end helpers ────────────────────────────────────── */

const roleToLabel = (role) => {
  if (role === "admin") return "SuperAdmin";
  if (role === "staff") return "Staff";
  return "Normal User";
};

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loginMethod, setLoginMethod] = useState('standard'); // 'standard' or 'wordpress'

  const validate = () => {
    let newErrors = { email: '', password: '' };
    let valid = true;

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Enter a valid email address';
        valid = false;
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleWordPressLoginSuccess = async (wpUser) => {
    try {
      console.log('✅ WordPress login successful:', wpUser);

      // Store WordPress user info for reference
      localStorage.setItem("wordpress_user", JSON.stringify(wpUser));

      // Get the tokens from the WordPress sync response (stored by wordpressAuth service)
      const accessToken = localStorage.getItem('access_token');
      const idToken = localStorage.getItem('id_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (accessToken) {
        console.log('✅ Cognito tokens received, redirecting to platform...');
        toast.success(`Welcome, ${wpUser.email}!`);

        // Redirect to dashboard or community
        setTimeout(() => {
          const intended = new URLSearchParams(location.search).get("next") || "/community";
          navigate(intended, { replace: true });
        }, 500);
      } else {
        // Fallback: redirect to Cognito if no tokens in response
        console.log('⚠️ No tokens in response, redirecting to Cognito...');
        toast.info('Completing authentication...');

        const intended = new URLSearchParams(location.search).get("next") || "/community";
        sessionStorage.setItem("post_wordpress_cognito_redirect", intended);

        setTimeout(() => {
          const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/\/+$/, "");
          const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
          const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || "http://localhost:5173/cognito/callback";

          if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
            toast.error("Cognito not configured");
            return;
          }

          const params = new URLSearchParams({
            response_type: "code",
            client_id: COGNITO_CLIENT_ID,
            redirect_uri: COGNITO_REDIRECT_URI,
            scope: "openid email profile",
            state: Math.random().toString(36).substring(7),
          });

          window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
        }, 1000);
      }
    } catch (err) {
      console.error("WordPress login redirect error:", err);
      toast.error('Login successful but redirect failed');
    }
  };

  const handleWordPressLoginError = (error) => {
    console.error('❌ WordPress login error:', error);
    toast.error(`❌ ${error}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER;

      let data = null;

      if (AUTH_PROVIDER === "cognito") {
        // NOTE: this works only if your pool allows Email as sign-in alias
        const res = await cognitoSignIn({
          usernameOrEmail: formData.email,
          password: formData.password,
        });

        const idToken = res.idToken || "";         // ✅ use for backend (has email + verified)
        const accessToken = res.accessToken || ""; // keep for groups / optional cognito calls

        // store both (optional but useful)
        if (accessToken) localStorage.setItem("cognito_access_token", accessToken);
        if (idToken) localStorage.setItem("id_token", idToken);

        // ✅ backend should receive idToken
        data = {
          access: accessToken,          // keep for cognito groups logic
          access_token: idToken,        // ✅ used by your API everywhere (localStorage access_token)
          refresh: res.refreshToken,
          user: res.payload,
          id_token: idToken,
        };

      } else {
        // keep your old backend login if you ever need it
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(`${API_BASE}/auth/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, timezone: tz }),
        });

        try { data = await response.json(); } catch { /* ignore */ }

        if (!response.ok) {
          const msg = data?.detail || data?.error || response.statusText || 'Login failed';
          throw new Error(msg);
        }
      }

      // store tokens (your code already does this)
      const accessTokenValue = data?.access_token || data?.access || "";
      if (accessTokenValue) {
        localStorage.setItem('access_token', accessTokenValue);
      }
      if (data?.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

      const accessTokenForBackend =
        data?.access_token ||
        localStorage.getItem("access_token") ||
        data?.access ||
        localStorage.getItem("access_token") ||
        "";

      await updateTimezone(accessTokenForBackend);

      /*
       * 🔔 STRICT SUSPENSION CHECK
       * Even if Cognito auth succeeded, the BACKEND middleware might block this user (suspended).
       * We must verify access to 'me' endpoint BEFORE navigating.
       */
      let backendUser = null;
      try {
        if (accessTokenForBackend) {
          backendUser = await resolveBackendUser(accessTokenForBackend);
        }
      } catch (err) {
        // Should catch 403 if your fetch wrapper throws, but fetchWithManyAuthStyles suppresses errors.
      }

      // If resolveBackendUser returns null but we HAVE a token, it might mean 403/Suspended.
      // Let's force a direct check if we are unsure.
      if (accessTokenForBackend && !backendUser) {
        // Double check: if the token is valid but backend rejects it, it's suspension.
        // We can't easily distinguish 403 from network error in 'resolveBackendUser' (it returns null).
        // But for safety, if we can't resolve the backend user, we should be cautious.
        // However, to be precise, let's try one explicit fetch if backendUser is null.
        const checkRes = await fetch(`${API_BASE}/users/me/`, {
          headers: { Authorization: `Bearer ${accessTokenForBackend}` }
        });
        if (checkRes.status === 403) {
          console.error("Backend blocked login (Suspended user).");
          throw new Error("Your account has been suspended. Please contact support.");
        }
      }

      let userObj = backendUser || data?.user || null;

      // Always prefer server /me for Cognito (it includes is_staff/is_superuser)
      const fallbackAuthToken = accessTokenForBackend || "";
      if (AUTH_PROVIDER === "cognito" && fallbackAuthToken && !backendUser) {
        const serverUser = await resolveCurrentUser(fallbackAuthToken, formData.email);
        if (serverUser) userObj = serverUser;
      } else if (!userObj && fallbackAuthToken) {
        userObj = await resolveCurrentUser(fallbackAuthToken, formData.email);
      }

      localStorage.setItem("user", JSON.stringify(userObj || {}));

      saveLoginPayload(data, { email: formData.email });

      const params = new URLSearchParams(location.search);
      const intended = params.get("next") || location.state?.from?.pathname || "/account/profile";

      const accessTokenForGroups = data?.access || localStorage.getItem("access_token") || "";
      const cognitoGroups = getCognitoGroupsFromTokens(accessTokenForGroups);

      const { role, path } = getRoleAndRedirectPath({
        cognitoGroups,
        backendUser,
        defaultPath: intended || "/account/profile",
      });

      console.log("[auth] role redirect", {
        role,
        path,
        cognitoGroups,
        backendFlags: {
          is_staff: backendUser?.is_staff,
          is_superuser: backendUser?.is_superuser,
        },
      });

      toast.success(`Signed in as ${roleToLabel(role)}`);

      const doRedirect = () => {
        if (path === "/admin/events") {
          window.location.replace(path);
        } else {
          navigate(path, { replace: true });
        }
      };

      setTimeout(doRedirect, 900);
      return;

      // console.log("redirect check", {
      //   userObj,
      //   groups,
      //   isDbStaff,
      //   isDbAdmin,
      //   intended,
      // });

      // if (isDbAdmin) {
      //   window.location.replace("/admin/events");
      //   return;
      // }

      // if (isCognitoStaff && isDbStaff) {
      //   window.location.replace("/admin/events");
      //   return;
      // }

      // navigate(intended || "/community", { replace: true });
      // return;

    } catch (err) {
      console.error("Login error:", err);
      let msg = err.message || 'Login failed. Please try again.';

      if (err.code === 'UserDisabledException') {
        msg = 'Your account has been suspended. Please contact support.';
      } else if (err.code === 'NotAuthorizedException') {
        msg = 'Incorrect username or password.';
      }

      toast.error(`❌ ${msg}`);

      // ✅ Vital: Clear any partial state so we don't end up half-logged-in
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("cognito_access_token");
      localStorage.removeItem("id_token");
      localStorage.removeItem("user");

    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CssBaseline />

      <Box
        component="main"
        sx={{
          width: 1,
          minHeight: '100svh',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          bgcolor: (t) => t.palette.background.default,
        }}
      >
        {/* LEFT: Hero */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexBasis: '50%',
            flexShrink: 0,
            alignItems: 'stretch',
            justifyContent: 'stretch',
          }}
        >
          <HeroSection />
        </Box>

        {/* RIGHT: Form */}
        <Box
          sx={{
            flexGrow: 1,
            width: { xs: '100%', md: '50%' },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, md: 6 },
            bgcolor: '#fff',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 480 }}>
            {/* Heading */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 400, letterSpacing: '-0.2px' }}>
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to access your learning journey
              </Typography>
            </Box>

            {/* Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow:
                  '0 12px 28px rgba(22,93,255,0.10), 0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              {/* Tabs */}
              <Box sx={{ mb: 2 }}>
                <AuthToggle />
              </Box>

              {/* Login Method Selector */}
              <Box sx={{ mb: 3, display: 'flex', gap: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
                <Button
                  variant={loginMethod === 'standard' ? 'contained' : 'text'}
                  onClick={() => setLoginMethod('standard')}
                  sx={{
                    flex: 1,
                    py: 1,
                    fontWeight: loginMethod === 'standard' ? 600 : 500,
                    fontSize: 13,
                    bgcolor: loginMethod === 'standard' ? '#2c6af0ff' : 'transparent',
                    color: loginMethod === 'standard' ? 'white' : 'text.primary',
                    '&:hover': { bgcolor: loginMethod === 'standard' ? '#165DFF' : '#f5f5f5' },
                    borderRadius: 1,
                    textTransform: 'none',
                  }}
                >
                  Standard Login
                </Button>
                <Button
                  variant={loginMethod === 'wordpress' ? 'contained' : 'text'}
                  onClick={() => setLoginMethod('wordpress')}
                  sx={{
                    flex: 1,
                    py: 1,
                    fontWeight: loginMethod === 'wordpress' ? 600 : 500,
                    fontSize: 13,
                    bgcolor: loginMethod === 'wordpress' ? '#2c6af0ff' : 'transparent',
                    color: loginMethod === 'wordpress' ? 'white' : 'text.primary',
                    '&:hover': { bgcolor: loginMethod === 'wordpress' ? '#165DFF' : '#f5f5f5' },
                    borderRadius: 1,
                    textTransform: 'none',
                  }}
                >
                  IMAA Login
                </Button>
              </Box>

              {/* Conditional Form Rendering */}
              {loginMethod === 'standard' ? (
                <>
                  <Box component="form" noValidate onSubmit={handleSubmit}>
                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}>
                      Email Address
                    </Typography>
                    <TextField
                      size="small"
                      name="email"
                      type="text"
                      placeholder="your@gmail.com"
                      value={formData.email}
                      onChange={handleChange}
                      fullWidth
                      error={Boolean(errors.email)}
                      helperText={errors.email}
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          '& fieldset': { borderColor: '#d1d5db' },
                          '&:hover fieldset': { borderColor: '#155dfc' },
                          '&.Mui-focused fieldset': { borderColor: '#155dfc' },
                        },
                        '& .MuiInputBase-input': {
                          fontSize: 12,
                          '::placeholder': { fontSize: 14, opacity: 0.6 },
                        },
                      }}
                    />

                    <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}>
                      Password
                    </Typography>
                    <TextField
                      size="small"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="your password"
                      value={formData.password}
                      onChange={handleChange}
                      fullWidth
                      error={Boolean(errors.password)}
                      helperText={errors.password}
                      sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          '& fieldset': { borderColor: '#d1d5db' },
                          '&:hover fieldset': { borderColor: '#155dfc' },
                          '&.Mui-focused fieldset': { borderColor: '#155dfc' },
                        },
                        '& .MuiInputBase-input': {
                          fontSize: 12,
                          '::placeholder': { fontSize: 14, opacity: 0.6 },
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton edge="end" onClick={() => setShowPwd((v) => !v)}>
                              {showPwd ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'start', mb: 2 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        underline="none"
                        sx={{ fontSize: 14, color: '#155dfc', fontWeight: 600 }}
                        onClick={() =>
                          navigate('/forgot-password', {
                            state: { email: formData.email },
                          })
                        }
                      >
                        Forgot password?
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      size="large"
                      variant="contained"
                      disabled={loading}
                      sx={{ py: 1, fontWeight: 600, borderRadius: 1, bgcolor: '#2c6af0ff', '&:hover': { bgcolor: '#165DFF' }, color: 'white', fontSize: 12 }}
                    >
                      {loading ? 'Signing in...' : 'Sign Into Your Account'}
                    </Button>
                  </Box>

                  {/* Social */}
                  <Box sx={{ mt: 2 }}>
                    <SocialLogin />
                  </Box>
                </>
              ) : (
                // WordPress IMAA Login Form
                <Box sx={{
                  '& .wordpress-login-container': {
                    minHeight: 'auto',
                    p: 0,
                    background: 'transparent'
                  },
                  '& .wordpress-login-card': {
                    p: 0,
                    boxShadow: 'none',
                    background: 'transparent',
                    border: 'none',
                    '& h2': { display: 'none' },
                    '& .subtitle': { display: 'none' },
                  }
                }}>
                  <WordPressLogin
                    onSuccess={handleWordPressLoginSuccess}
                    onError={handleWordPressLoginError}
                  />
                </Box>
              )}
            </Paper>

            {/* Features */}
            <Box sx={{ mt: 3 }}>
              <FeaturesSection />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Toasts */}
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
};

export default SignInPage;
