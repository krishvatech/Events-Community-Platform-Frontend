import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * LeadGenModal: Info-only modal showing missing lead-generation fields for event registration.
 * Does NOT allow editing directly in the modal. User must go to their Profile to update.
 * Shows a simple centered dialog with:
 * - Title: "Complete your profile to register"
 * - Message about missing fields
 * - List of missing fields only (no input fields)
 * - Buttons: "Go to Profile" and "Cancel"
 */
export function LeadGenModal({
  open = false,
  onClose = () => {},
  onSuccess = () => {},
  user = null,
  missingFields = {},
}) {
  const navigate = useNavigate();

  const handleGoToProfile = () => {
    onClose();
    navigate('/account/profile');
  };

  const getMissingFieldsList = () => {
    return Object.entries(missingFields).map(([key, displayName]) => displayName);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }
      }}
    >
      <DialogTitle sx={{
        fontSize: '1.5rem',
        fontWeight: 700,
        textAlign: 'center',
        color: '#1f2937',
        pb: 1,
      }}>
        Complete your profile to register
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          p: 2.5,
          mb: 2,
        }}>
          <Typography variant="body2" sx={{ color: '#1f2937', lineHeight: 1.6, mb: 2 }}>
            Some required profile details are missing. Please update your profile before registering for this event.
          </Typography>

          <Box sx={{ pl: 1, borderLeft: '3px solid #0ea5a4' }}>
            {getMissingFieldsList().map((fieldName, idx) => (
              <Typography
                key={idx}
                variant="body2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1f2937',
                  mb: idx < getMissingFieldsList().length - 1 ? 0.8 : 0,
                  fontWeight: 500,
                }}
              >
                <Box sx={{ mr: 1.5, color: '#ef4444', fontWeight: 'bold' }}>•</Box>
                {fieldName} is missing
              </Typography>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{
        p: 2.5,
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        gap: 1.5,
      }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleGoToProfile}
          variant="contained"
          sx={{
            backgroundColor: '#0ea5a4',
            '&:hover': {
              backgroundColor: '#0d9193',
            },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          Go to Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}
