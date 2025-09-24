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

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

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
      try {
        data = await response.json();
      } catch {
        /* ignore parse errors */
      }

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
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      toast.success(`✅ Login successful. Welcome ${formData.email}`);
      saveLoginPayload(data, { email: formData.email });

      const redirectTo = location.state?.from?.pathname || '/dashboard';
      setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 0);
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
                      '& fieldset': {
                        borderColor: '#d1d5db', // default border color (gray-300)
                      },
                      '&:hover fieldset': {
                        borderColor: '#155dfc', // hover color
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#155dfc', // focus color (your brand blue)
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: 12,
                      '::placeholder': {
                        fontSize: 14,
                        opacity: 0.6,
                      },
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
                      '& fieldset': {
                        borderColor: '#d1d5db', // default border color (gray)
                      },
                      '&:hover fieldset': {
                        borderColor: '#155dfc', // hover border color
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#155dfc', // focused border color
                      },
                    },
                    '& .MuiInputBase-input': {
                      fontSize: 12,
                      '::placeholder': {
                        fontSize: 14,
                        opacity: 0.6,
                      },
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
                    onClick={() =>
                      toast.info('Password recovery is not implemented yet.')
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
