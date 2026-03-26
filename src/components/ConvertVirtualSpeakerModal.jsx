import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Alert,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { convertVirtualSpeaker } from '../services/virtualSpeakerService';

const ConvertVirtualSpeakerModal = ({
  open,
  onClose,
  onSuccess,
  speaker,
}) => {
  const [email, setEmail] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await convertVirtualSpeaker(speaker.id, email, sendInvite);

      toast.success(
        `Virtual speaker converted successfully! ${
          sendInvite ? 'Invitation email has been sent.' : ''
        }`
      );

      setEmail('');
      setSendInvite(true);
      setErrors({});
      onSuccess(result);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to convert virtual speaker');
      console.error('Conversion error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!speaker) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Convert Virtual Speaker to User Account</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* Speaker Info */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Speaker Name:
            </Typography>
            <Typography variant="body1">{speaker.name}</Typography>
          </Box>

          <Alert severity="info">
            This will create a real user account and convert all event speaker assignments.
          </Alert>

          {/* Email Field */}
          <TextField
            label="Email Address *"
            type="email"
            value={email}
            onChange={handleEmailChange}
            fullWidth
            error={!!errors.email}
            helperText={errors.email}
            placeholder="user@example.com"
            disabled={submitting}
          />

          {/* Send Invite Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                disabled={submitting}
              />
            }
            label="Send invitation email with login credentials"
          />

          {/* Info Text */}
          <Typography variant="caption" color="textSecondary">
            The new user account will be created with all profile data (name, job title, company, bio, and image).
            An invitation email with temporary credentials will be sent to activate the account.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={24} /> : 'Convert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConvertVirtualSpeakerModal;
