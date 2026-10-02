// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from '#navigation';
import { API_BASE } from "../utils/api";
import { InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';


import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    CssBaseline,
} from '@mui/material';

// `authedMode` is used by the /account/set-password route, where an already
// signed-in federated (e.g. Google) user sets a password for the first time.
// It only changes wording and where we land on success — the OTP request and
// confirm calls are identical, so the public /forgot-password flow is
// unchanged by default.
// Visible field labels (block so their spacing applies), Inter, ink
const labelSx = { display: 'block', mb: 0.5, fontWeight: 500, fontSize: 13, color: 'var(--imaa-ink)' };

const ForgotPassword = ({ authedMode = false }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // If we came from SignInPage with an email, use it. Otherwise empty.
    const initialEmail = location.state?.email || '';
    const [step, setStep] = useState('request'); // 'request' | 'confirm'

    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState(initialEmail);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [deliveryHint, setDeliveryHint] = useState('');

    const postJson = async (path, payload) => {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload || {}),
        });
        let data = null;
        try {
            data = await res.clone().json();
        } catch {
            data = null;
        }
        if (!res.ok) {
            const msg = data?.detail || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return data;
    };

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

    const validateStep2 = () => {
        const errs = {};

        if (!code.trim()) errs.code = 'Verification code is required';

        const strongPwd = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;
        if (!strongPwd.test(newPassword || '')) {
            errs.newPassword = 'Min 8 chars, 1 uppercase, 1 number, 1 special';
        }

        if (newPassword !== confirmPassword) {
            errs.confirmPassword = 'Passwords do not match';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Step 1: request OTP
        if (step === 'request') {
            if (!validate()) return;

            setLoading(true);
            try {
                const emailLower = email.trim().toLowerCase();
                const resp = await postJson("/auth/password/forgot-cognito/", { email: emailLower });
                const medium = (resp?.delivery?.medium || "").toString().toUpperCase();
                if (medium === "EMAIL") setDeliveryHint("Check your email for the verification code.");
                else if (medium === "SMS") setDeliveryHint("Check your phone (SMS) for the verification code.");
                else setDeliveryHint("Check your email (and possibly SMS) for the verification code.");

                toast.success('If the account exists, a verification code has been sent.');
                setStep('confirm'); // ✅ stay on same page
            } catch (err) {
                const msg = err?.message || 'Something went wrong. Please try again.';
                toast.error(msg);
            } finally {
                setLoading(false);
            }
            return;
        }

        // Step 2: confirm OTP + set new password
        setErrors({});
        if (!validateStep2()) return;

        setLoading(true);
        try {
            const emailLower = email.trim().toLowerCase();
            await postJson("/auth/password/reset-cognito/", {
                email: emailLower,
                code: code.trim(),
                new_password: newPassword,
                confirm_new_password: confirmPassword,
            });

            // Authed users keep their session (they are adding a password, not
            // recovering an account) and go back to Profile → Security.
            if (authedMode) {
                toast.success('Password set successfully! Redirecting...');
                setTimeout(() => navigate('/account/profile'), 1500);
            } else {
                toast.success('Password reset successfully! Redirecting...');
                setTimeout(() => navigate('/signin'), 1500);
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <CssBaseline />

            <Box
                sx={{
                    width: 1,
                    minHeight: authedMode ? 'auto' : '100svh',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    bgcolor: (t) => t.palette.background.default,
                }}
            >
                {/* LEFT: Hero (same as SignInPage). Hidden for signed-in users,
                    who reach this screen inside the app shell — the marketing
                    hero there would read as having been logged out. */}
                {!authedMode && (
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
                )}

                {/* RIGHT: Form */}
                <Box
                    sx={{
                        flexGrow: 1,
                        width: { xs: '100%', md: authedMode ? '100%' : '50%' },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: { xs: 3, md: 6 },
                        bgcolor: authedMode ? 'transparent' : 'var(--imaa-bg-member)',
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: 480 }}>
                        {/* Heading */}
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                            <Box
                                component="h1"
                                sx={{ m: 0, fontFamily: 'var(--imaa-font-serif)', fontWeight: 700, fontSize: { xs: 24, md: 28 }, lineHeight: 1.25, color: 'var(--imaa-ink)' }}
                            >
                                {authedMode ? 'Set your password' : 'Forgot your password?'}
                            </Box>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                                {authedMode
                                    ? 'Confirm your email and we’ll send you a verification code (OTP) to set your password.'
                                    : 'Enter your email and we’ll send you a verification code (OTP).'}
                            </Typography>
                            {step === 'confirm' && deliveryHint ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} role="status">
                                    {deliveryHint}
                                </Typography>
                            ) : null}
                        </Box>

                        {/* Card */}
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 'var(--imaa-radius-card)',
                                p: { xs: 2.5, md: 3 },
                                border: '1px solid var(--imaa-border)',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Box component="form" noValidate onSubmit={handleSubmit}>
                                <Typography
                                    component="label"
                                    htmlFor="forgot-email"
                                    variant="caption"
                                    sx={labelSx}
                                >
                                    Email Address
                                </Typography>
                                <TextField
                                    id="forgot-email"
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
                                        '& .MuiOutlinedInput-root': { borderRadius: 1 },
                                        '& .MuiInputBase-input': {
                                            fontSize: 14,
                                            '@media (max-width: 599.95px)': { fontSize: 16 },
                                        },
                                    }}
                                />

                                {step === 'confirm' && (
                                    <>
                                        <Typography component="label" htmlFor="forgot-code" variant="caption" sx={labelSx}>
                                            Verification Code (OTP)
                                        </Typography>
                                        <TextField
                                            id="forgot-code"
                                            size="small"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                                            fullWidth
                                            error={Boolean(errors.code)}
                                            helperText={errors.code}
                                            sx={{ mb: 2 }}
                                        />

                                        <Typography component="label" htmlFor="forgot-new-password" variant="caption" sx={labelSx}>
                                            New Password
                                        </Typography>
                                        <TextField
                                            id="forgot-new-password"
                                            size="small"
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value.replace(/\s/g, ''))}
                                            fullWidth
                                            error={Boolean(errors.newPassword)}
                                            helperText={errors.newPassword}
                                            sx={{ mb: 2 }}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}>
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />

                                        <Typography component="label" htmlFor="forgot-confirm-password" variant="caption" sx={labelSx}>
                                            Confirm Password
                                        </Typography>
                                        <TextField
                                            id="forgot-confirm-password"
                                            size="small"
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ''))}
                                            fullWidth
                                            error={Boolean(errors.confirmPassword)}
                                            helperText={errors.confirmPassword}
                                            sx={{ mb: 2 }}
                                        />
                                    </>
                                )}

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
                                        bgcolor: 'var(--imaa-navy)',
                                        '&:hover': { bgcolor: 'var(--imaa-navy-2)' },
                                        color: 'white',
                                        fontSize: 15,
                                    }}
                                >
                                    {loading
                                        ? (step === 'request' ? 'Sending OTP...' : 'Resetting...')
                                        : (step === 'request' ? 'Send OTP' : 'Reset Password')}
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
                                        {authedMode ? 'Changed your mind?' : 'Remember your password?'}
                                    </Typography>
                                    <Button
                                        type="button"
                                        onClick={() => navigate(authedMode ? '/account/profile' : '/signin')}
                                        sx={{
                                            p: 0,
                                            minWidth: 'auto',
                                            textTransform: 'none',
                                            fontSize: 13,
                                            color: 'var(--imaa-navy)',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {authedMode ? 'Back to Profile' : 'Back to Sign in'}
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Features (same as SignInPage) — marketing content,
                            not shown to already signed-in users. */}
                        {!authedMode && (
                            <Box sx={{ mt: 3 }}>
                                <FeaturesSection />
                            </Box>
                        )}
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
