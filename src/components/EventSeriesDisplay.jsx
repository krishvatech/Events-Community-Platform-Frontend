import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, CardMedia, Typography, Button, Chip,
  Grid, CircularProgress, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { API_BASE, authConfig, getToken } from '../utils/api';

/**
 * Smart display component that shows series cards for "full_series_only" series
 * and individual event cards for other events
 */
const EventSeriesDisplay = ({ event, onSeriesRegister }) => {
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  // Check if we need to fetch series data
  useEffect(() => {
    if (event.series && !series) {
      fetchSeriesData();
    }
  }, [event.series]);

  const fetchSeriesData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/series/${event.series}/`,
        { headers: authConfig().headers }
      );
      if (response.ok) {
        const data = await response.json();
        setSeries(data);
      }
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  };

  // If event doesn't have a series, return null (let parent handle individual event display)
  if (!event.series) {
    return null;
  }

  // If registration_mode is not "full_series_only", return null to show individual event
  if (series && series.registration_mode !== 'full_series_only') {
    return null;
  }

  if (!series || loading) {
    return null; // Don't show anything while loading
  }

  const handleViewSeries = () => {
    navigate(`/series/${series.slug}`);
  };

  const isRegistered = series?.is_registered === true;

  const handleCancelRegistration = async () => {
    if (!getToken()) {
      navigate('/signin');
      return;
    }

    if (!window.confirm(`Cancel your registration for "${series.title}"?`)) {
      return;
    }

    try {
      setCancelling(true);
      setActionError('');
      const response = await fetch(
        `${API_BASE}/series/${series.id}/unregister/`,
        {
          method: 'POST',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        setSeries((prev) => prev ? {
          ...prev,
          is_registered: false,
          registrations_count: prev.is_registered
            ? Math.max(0, Number(prev.registrations_count || 0) - 1)
            : prev.registrations_count,
        } : prev);
      } else {
        const data = await response.json().catch(() => ({}));
        setActionError(data.detail || data.error || 'Failed to cancel series registration');
      }
    } catch (error) {
      setActionError('Failed to cancel series registration');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3,
      }
    }}>
      {series.cover_image && (
        <CardMedia
          component="img"
          height="200"
          image={series.cover_image}
          alt={series.title}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: 1 }}>
          <Chip
            label="SERIES"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <Chip
            label={series.status.toUpperCase()}
            size="small"
            color={series.status === 'published' ? 'success' : 'default'}
          />
        </Box>

        <Typography variant="h6" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
          {series.title}
        </Typography>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {series.description ? series.description.substring(0, 100) + '...' : ''}
        </Typography>

        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="textSecondary">Events</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {series.events_count || 0}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">Registered</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {series.registrations_count || 0}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="textSecondary">Price</Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {series.is_free ? 'Free' : `$${series.price}`}
          </Typography>
        </Box>
      </CardContent>

      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={handleViewSeries}
        >
          View Series
        </Button>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          color={isRegistered ? 'error' : 'primary'}
          disabled={cancelling}
          onClick={() => {
            if (isRegistered) {
              handleCancelRegistration();
              return;
            }
            if (!getToken()) {
              navigate('/signin');
              return;
            }
            onSeriesRegister(series.id);
          }}
        >
          {cancelling ? 'Cancelling...' : (isRegistered ? 'Cancel Registration' : 'Register')}
        </Button>
      </Box>
      {actionError && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Alert severity="error">{actionError}</Alert>
        </Box>
      )}
    </Card>
  );
};

export default EventSeriesDisplay;
