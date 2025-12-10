// src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE } from '../utils/api';

import HeroSection from '../components/HeroSection.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';

import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    CssBaseline,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get uid and token from the URL query parameters
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    const isInvalidLink = !uid || !token;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        newPassword: '',
        confirmPassword: '',
    });

    const validatePasswords = () => {
        const next = {};
        const strongPwd = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;

        if (!strongPwd.test(newPassword || '')) {
            next.newPassword = 'Min 8 chars, 1 uppercase, 1 number, 1 special';
        }

        if (newPassword !== confirmPassword) {
            next.confirmPassword = 'Passwords do not match';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setErrors({ newPassword: '', confirmPassword: '' });

        if (!newPassword || !confirmPassword) {
            toast.error('Please fill in both password fields.');
            return;
        }

        // ✅ Frontend validation like Sign Up
        if (!validatePasswords()) {
            toast.error('Please fix the highlighted errors.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/password/reset/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: uid,
                    token: token,
                    new_password: newPassword,
                    confirm_new_password: confirmPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Password reset successfully! Redirecting...');
                setTimeout(() => navigate('/signin'), 3000);
            } else {
                const errorMsg =
                    data.detail ||
                    (data.new_password ? data.new_password[0] : 'Failed to reset password.');
                toast.error(errorMsg);
            }
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
                {/* LEFT: Hero (same as ForgotPassword) */}
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
                                {isInvalidLink ? 'Invalid reset link' : 'Set new password'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                                {isInvalidLink
                                    ? 'This password reset link is invalid or has expired.'
                                    : 'Enter your new password below.'}
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
                            {isInvalidLink ? (
                                <Box sx={{ textAlign: 'center' }}>
                                    <Button
                                        type="button"
                                        onClick={() => navigate('/signin')}
                                        sx={{
                                            mt: 1,
                                            textTransform: 'none',
                                            fontSize: 13,
                                            color: '#155dfc',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Back to Sign in
                                    </Button>
                                </Box>
                            ) : (
                                <Box component="form" onSubmit={handleSubmit}>
                                    {/* New Password */}
                                    <Typography
                                        variant="caption"
                                        sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}
                                    >
                                        New Password
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\s/g, ''); // ❌ no spaces
                                            setNewPassword(value);
                                            setErrors((prev) => ({ ...prev, newPassword: '' }));
                                        }}
                                        error={Boolean(errors.newPassword)}
                                        helperText={errors.newPassword}
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
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    {/* Confirm Password */}
                                    <Typography
                                        variant="caption"
                                        sx={{ mb: 0.5, fontWeight: 490, fontSize: 13 }}
                                    >
                                        Confirm Password
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\s/g, ''); // ❌ no spaces
                                            setConfirmPassword(value);
                                            setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                                        }}
                                        error={Boolean(errors.confirmPassword)}
                                        helperText={errors.confirmPassword}
                                        sx={{
                                            mb: 3,
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
                                        {loading ? 'Resetting...' : 'Reset Password'}
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
                            )}
                        </Paper>

                        {/* Features (same as ForgotPassword) */}
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

export default ResetPassword;
