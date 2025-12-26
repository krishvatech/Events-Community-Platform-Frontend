// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { cognitoForgotPassword, cognitoConfirmForgotPassword } from "../utils/cognitoAuth";
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

const ForgotPassword = () => {
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
                await cognitoForgotPassword({ usernameOrEmail: emailLower });

                toast.success('If the account exists, an OTP has been sent.');
                setStep('confirm'); // ✅ stay on same page
            } catch (err) {
                toast.error('Something went wrong. Please try again.');
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
            await cognitoConfirmForgotPassword({
                usernameOrEmail: email.trim().toLowerCase(),
                code: code.trim(),
                newPassword,
            });

            toast.success('Password reset successfully! Redirecting...');
            setTimeout(() => navigate('/signin'), 1500);
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
                                Enter your email and we&apos;ll send you a verification code (OTP).
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

                                {step === 'confirm' && (
                                    <>
                                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}>
                                            Verification Code (OTP)
                                        </Typography>
                                        <TextField
                                            size="small"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                                            fullWidth
                                            error={Boolean(errors.code)}
                                            helperText={errors.code}
                                            sx={{ mb: 2 }}
                                        />

                                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}>
                                            New Password
                                        </Typography>
                                        <TextField
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
                                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />

                                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}>
                                            Confirm Password
                                        </Typography>
                                        <TextField
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
                                        bgcolor: '#155dfc',
                                        '&:hover': { bgcolor: '#165DFF' },
                                        color: 'white',
                                        fontSize: 12,
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
