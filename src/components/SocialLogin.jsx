import React from 'react';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Box, Divider, Typography, Button } from '@mui/material';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

const SocialLogin = () => {
  const handleGoogle = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/google/url/`, {
        method: 'GET',
        credentials: 'include', // <-- important
      });
      if (!res.ok) throw new Error('Failed to start Google login');
      const data = await res.json();
      if (!data.authorization_url) throw new Error('No authorization_url from backend');
      // Redirect browser to Google
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(err);
      toast.error('❌ Could not start Google login. Please try again.');
    }
  };

  const handleLinkedIn = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/linkedin/url/`, {
        method: 'GET',
        credentials: 'include', // <-- important
      });
      if (!res.ok) throw new Error('Failed to start LinkedIn login');
      const data = await res.json();
      if (!data.authorization_url) throw new Error('No authorization_url from backend');

      // Redirect browser to LinkedIn consent page
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(err);
      toast.error('❌ Could not start LinkedIn login. Please try again.');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Just the text */}
      <Box sx={{ my: 2, textAlign: 'center' }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontSize: 12 }}
        >
          OR CONTINUE WITH
        </Typography>
      </Box>

      {/* Buttons row */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<FaGoogle />}
          onClick={handleGoogle}
          sx={{
            textTransform: 'none',
            bgcolor: '#fff',
            color: 'black',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          Google
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<FaLinkedinIn />}
          onClick={handleLinkedIn}
          sx={{
            textTransform: 'none',
            bgcolor: '#fff',
            color: 'black',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          LinkedIn
        </Button>
      </Box>
    </Box>
  );
};

export default SocialLogin;
