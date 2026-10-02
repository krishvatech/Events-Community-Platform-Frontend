import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Avatar,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import InsertPhotoRoundedIcon from '@mui/icons-material/InsertPhotoRounded';
import { toast } from 'react-toastify';
import { createVirtualSpeaker, updateVirtualSpeaker } from '../services/virtualSpeakerService';
import { colors, radii } from '../styles/designTokens';

const VirtualSpeakerForm = ({
  open,
  onClose,
  onSuccess,
  initialData,
  communityId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    company: '',
    bio: '',
    profileImage: null,
  });

  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Edit mode
        setFormData({
          name: initialData.name || '',
          jobTitle: initialData.job_title || '',
          company: initialData.company || '',
          bio: initialData.bio || '',
          profileImage: null,
        });
        setImagePreview(initialData.profile_image_url || '');
      } else {
        // Create mode
        resetForm();
      }
    }
  }, [open, initialData]);

  const resetForm = () => {
    setFormData({
      name: '',
      jobTitle: '',
      company: '',
      bio: '',
      profileImage: null,
    });
    setImagePreview('');
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        profileImage: file,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        name: formData.name,
        jobTitle: formData.jobTitle,
        company: formData.company,
        bio: formData.bio,
        profileImage: formData.profileImage,
      };

      if (initialData) {
        // Update existing
        data.communityId = initialData.community;
        await updateVirtualSpeaker(initialData.id, data);
        toast.success('Virtual speaker updated successfully');
      } else {
        // Create new
        data.communityId = communityId;
        await createVirtualSpeaker(data);
        toast.success('Virtual speaker created successfully');
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save virtual speaker');
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="virtual-speaker-form-title"
      PaperProps={{ sx: { borderRadius: `${radii.popup}px`, m: 2 } }}
    >
      <DialogTitle id="virtual-speaker-form-title" sx={{ color: colors.navy, fontWeight: 700 }}>
        {initialData ? 'Edit Virtual Speaker' : 'Create Virtual Speaker'}
      </DialogTitle>

      <DialogContent sx={{ bgcolor: colors.white }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            mt: 2,
            '& .MuiOutlinedInput-root': { borderRadius: `${radii.field}px` },
          }}
        >
          {/* Profile Image */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: imagePreview ? 'transparent' : colors.bgCool,
                  border: `1px solid ${colors.border}`,
                }}
                src={imagePreview}
                alt={`${formData.name || 'Virtual speaker'} profile preview`}
              >
                {!imagePreview && <InsertPhotoRoundedIcon sx={{ fontSize: 40 }} />}
              </Avatar>
              <input
                accept="image/*"
                type="file"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="profile-image-input"
              />
              <label htmlFor="profile-image-input">
                <Button
                  variant="outlined"
                  size="small"
                  component="span"
                  sx={{ minHeight: 40, borderRadius: `${radii.field}px` }}
                >
                  Upload Image
                </Button>
              </label>
            </Box>
          </Box>

          {/* Name Field */}
          <TextField
            label="Full Name *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            error={!!errors.name}
            helperText={errors.name}
            placeholder="e.g., John Smith"
          />

          {/* Job Title Field */}
          <TextField
            label="Job Title"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g., Senior Engineer"
          />

          {/* Company Field */}
          <TextField
            label="Company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g., Tech Corp"
          />

          {/* Bio Field */}
          <TextField
            label="Bio / Description"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={4}
            placeholder="Tell us about this speaker..."
          />

          {initialData && initialData.status === 'converted' && (
            <Alert severity="info">
              This speaker has been converted to a real user account (
              {initialData.invited_email})
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          pt: 1,
          gap: 1,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          '& .MuiButton-root': { minHeight: 44, width: { xs: '100%', sm: 'auto' } },
        }}
      >
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: `${radii.field}px` }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          sx={{ borderRadius: `${radii.field}px` }}
        >
          {submitting ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} color="inherit" />
              <span>Saving...</span>
            </Stack>
          ) : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VirtualSpeakerForm;
