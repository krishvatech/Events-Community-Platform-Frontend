// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../utils/api';

import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    CssBaseline,
} from '@mui/material';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // If we came from SignInPage with an email, use it. Otherwise empty.
    const initialEmail = location.state?.email || '';

    const [email, setEmail] = useState(initialEmail);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const errs = {};
        if (!email.trim()) {
            errs.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
            errs.email = 'Enter a valid email address';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // 👉 Adjust this URL to match your backend reset endpoint
            // e.g. Djoser: `${API_BASE}/auth/users/reset_password/`
            // or your custom: `${API_BASE}/auth/password/reset/`
            await fetch(`${API_BASE}/auth/password/forgot/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            toast.success(
                'If this email is registered, a password reset link has been sent.'
            );
        } catch (err) {
            toast.error('Something went wrong. Please try again.');
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
                {/* LEFT: Hero (same as SignInPage) */}
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
                        bgcolor: '#f9fafb',
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: 480 }}>
                        {/* Heading */}
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: 400, letterSpacing: '-0.2px' }}
                            >
                                Forgot your password?
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                                Enter your email and we&apos;ll send you a reset link.
                            </Typography>
                        </Box>

                        {/* Card */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 2,
                                p: { xs: 2.5, md: 3 },
                                border: '1px solid #e5e7eb',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Box component="form" noValidate onSubmit={handleSubmit}>
                                <Typography
                                    variant="caption"
                                    sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}
                                >
                                    Email Address
                                </Typography>
                                <TextField
                                    size="small"
                                    name="email"
                                    type="text"
                                    placeholder="your@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    fullWidth
                                    error={Boolean(errors.email)}
                                    helperText={errors.email}
                                    sx={{
                                        mb: 2,
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

                                <Button
                                    type="submit"
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    disabled={loading}
                                    sx={{
                                        py: 1,
                                        fontWeight: 600,
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        bgcolor: '#155dfc',
                                        '&:hover': { bgcolor: '#165DFF' },
                                        color: 'white',
                                        fontSize: 12,
                                    }}
                                >
                                    {loading ? 'Sending reset link...' : 'Send Reset Link'}
                                </Button>

                                <Box
                                    sx={{
                                        mt: 2,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: 1,
                                        fontSize: 13,
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        Remember your password?
                                    </Typography>
                                    <Button
                                        type="button"
                                        onClick={() => navigate('/signin')}
                                        sx={{
                                            p: 0,
                                            minWidth: 'auto',
                                            textTransform: 'none',
                                            fontSize: 13,
                                            color: '#155dfc',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Back to Sign in
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Features (same as SignInPage) */}
                        <Box sx={{ mt: 3 }}>
                            <FeaturesSection />
                        </Box>
                    </Box>
                </Box>
            </Box>

            <ToastContainer
                position="top-right"
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

export default ForgotPassword;
