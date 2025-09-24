import React from 'react';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Box, Divider, Typography, Button } from '@mui/material';

const SocialLogin = () => {
  const handleGoogle = () => toast.info('🔐 Google login is not implemented yet.');
  const handleLinkedIn = () => toast.info('🔐 LinkedIn login is not implemented yet.');

  return (
    <Box sx={{ mt: 2}}>
      {/* Just the text */}
      <Box sx={{ my: 2, textAlign: 'center' }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: 13,
            color: 'text.secondary',
            fontWeight: 300,
          }}
        >
          OR CONTINUE WITH
        </Typography>
      </Box>


      {/* Buttons */}
      <Box width="50%"  sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' },mx: 'auto',  justifyContent: 'center'}}>
        <Button
          onClick={handleGoogle}
          variant="outlined"
          fullWidth
          startIcon={<FaGoogle style={{ color: '#070707ff' }} />}
          sx={{
            textTransform: 'none',
            fontSize: 14,
            fontWeight: 500,
            bgcolor: '#fff',
            borderColor: 'divider',
            color:'black',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          Google
        </Button>

        <Button
          onClick={handleLinkedIn}
          variant="outlined"
          fullWidth
          startIcon={<FaLinkedinIn style={{ color: '#070707ff' }} />}
          sx={{
            textTransform: 'none',
            fontSize: 14,
            fontWeight: 500,
            bgcolor: '#fff',
            color:'black',
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
