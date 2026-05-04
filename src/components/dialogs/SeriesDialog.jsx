import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Select, MenuItem,
  FormControl, InputLabel, Alert, Box, FormControlLabel,
  Switch
} from '@mui/material';
import { API_BASE, authConfig } from '../../utils/api';

const SeriesDialog = ({ open, onClose, onSubmit, series = null, communityId = null }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [communities, setCommunities] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    community_id: communityId || '',
    registration_mode: 'both',
    is_free: true,
    price: 0,
    visibility: 'public',
  });

  useEffect(() => {
    if (series) {
      setFormData({
        title: series.title || '',
        description: series.description || '',
        community_id: series.community_id || '',
        registration_mode: series.registration_mode || 'both',
        is_free: series.is_free || true,
        price: series.price || 0,
        visibility: series.visibility || 'public',
      });
    }
  }, [series]);

  // Auto-populate community_id from user's first community
  useEffect(() => {
    if (open && !formData.community_id) {
      const fetchDefaultCommunity = async () => {
        try {
          const response = await fetch(`${API_BASE}/communities/`, {
            headers: authConfig().headers,
          });
          const data = await response.json();
          const communityList = Array.isArray(data) ? data : data.results || [];
          if (communityList.length > 0) {
            setFormData((prev) => ({ ...prev, community_id: communityList[0].id }));
          }
        } catch (error) {
          console.error('Error fetching default community:', error);
        }
      };
      fetchDefaultCommunity();
    }
  }, [open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const url = series
        ? `${API_BASE}/series/${series.id}/`
        : `${API_BASE}/series/`;

      const method = series ? 'PATCH' : 'POST';

      // Exclude empty community_id from submission
      const submitData = { ...formData };
      if (!submitData.community_id) {
        delete submitData.community_id;
      }

      const response = await fetch(url, {
        method,
        headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.detail) {
          setErrors({ general: data.detail });
        } else {
          setErrors(data);
        }
        return;
      }

      onSubmit();
      onClose();
    } catch (error) {
      setErrors({ general: 'Failed to save series. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{series ? 'Edit Series' : 'Create New Series'}</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {errors.general && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.general}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Series Title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={Boolean(errors.title)}
          helperText={errors.title}
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Registration Mode</InputLabel>
          <Select
            value={formData.registration_mode}
            label="Registration Mode"
            onChange={(e) => handleChange('registration_mode', e.target.value)}
            disabled={loading}
          >
            <MenuItem value="full_series_only">Full Series Only</MenuItem>
            <MenuItem value="per_session_only">Per Session Only</MenuItem>
            <MenuItem value="both">Both Series and Per-Session</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Visibility</InputLabel>
          <Select
            value={formData.visibility}
            label="Visibility"
            onChange={(e) => handleChange('visibility', e.target.value)}
            disabled={loading}
          >
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_free}
                onChange={(e) => handleChange('is_free', e.target.checked)}
                disabled={loading}
              />
            }
            label="Free Series"
          />
        </Box>

        {!formData.is_free && (
          <TextField
            fullWidth
            label="Price (USD)"
            type="number"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value))}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 2 }}
            disabled={loading}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Save Series'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeriesDialog;
