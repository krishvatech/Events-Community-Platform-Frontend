// src/pages/SignInPage.jsx
import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import SocialLogin from '../components/SocialLogin.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveLoginPayload } from "../utils/authStorage";
import { useNavigate, useLocation } from 'react-router-dom';

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
const deepHasFlag = (obj, keys = ["is_staff","isSuperuser","is_superuser","is_admin","staff","admin","isStaff"]) => {
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
        if (["roles","groups","permissions"].includes(k) && hasRoleName(v, ["admin","staff"])) return true;
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
    hasRoleName(u?.groups, ["admin","staff"]) ||
    hasRoleName(u?.roles, ["admin","staff"]) ||
    hasRoleName(u?.permissions, ["admin","staff"]) ||
    deepHasFlag(u) // ← deep fallback
  );

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch { return null; }
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
    { Authorization: `JWT ${access}`,    Accept: "application/json" },
    { Authorization: `Token ${access}`,  Accept: "application/json" },
  ];
  for (const h of headerSets) {
    const obj = await fetchJSON(url, h);
    if (obj) return obj;
  }
  return null;
};

/** Try hard to resolve current user with staff flags */
const resolveCurrentUser = async (access, fallbackEmail) => {
  // 1) Common "me" endpoints
  const meCandidates = [
    `${API_BASE}/auth/users/me/`, // Djoser
    `${API_BASE}/users/me/`,      // custom
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

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data = null;
      try { data = await response.json(); } catch { /* ignore */ }

      if (!response.ok) {
        const msg = data?.detail || data?.error || response.statusText || 'Login failed';
        throw new Error(msg);
      }

      if (data?.access) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('token', data.access);
      }
      if (data?.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

      // Resolve the user with staff info (response.user → /me → by id → JWT → fallback)
      let userObj = data?.user ?? null;
      if (!userObj && data?.access) {
        userObj = await resolveCurrentUser(data.access, formData.email);
      }
      localStorage.setItem("user", JSON.stringify(userObj || {}));

      // Toast + persist auth bits
      // toast.success(`✅ Login successful. Welcome ${formData.email}`);
      saveLoginPayload(data, { email: formData.email });

      // Decide destination
      const params = new URLSearchParams(location.search);
      const intended = params.get("next") || location.state?.from?.pathname || "/events";

      // TEMP: one-time debug (you can comment this out)
      console.log("redirect check", { userObj, goDashboard: isStaffUser(userObj), intended });

      // Staff → dashboard (hard redirect so nothing else can override it)
      if (isStaffUser(userObj)) {
        window.location.replace("/admin/events");
        return;
      }

      // Non-staff → intended
      navigate(intended, { replace: true });
      return;

    } catch (err) {
      toast.error(`❌ ${err.message || 'Login failed. Please try again.'}`);
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

              {/* Form */}
              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490 ,fontSize:13}}>
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

                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490 ,fontSize:13}}>
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
                    sx={{ fontSize: 14, color: '#155dfc' ,fontWeight:600}}
                    onClick={() => toast.info('Password recovery is not implemented yet.')}
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
                  sx={{ py: 1, fontWeight: 600, borderRadius: 1 ,bgcolor: '#2c6af0ff','&:hover': { bgcolor: '#165DFF' },color:'white',fontSize:12}}
                >
                  {loading ? 'Signing in...' : 'Sign Into Your Account'}
                </Button>
              </Box>

              {/* Social */}
              <Box sx={{ mt: 2 }}>
                <SocialLogin />
              </Box>
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