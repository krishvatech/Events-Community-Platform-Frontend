import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { fetchReviewQueueStats } from '../utils/reviewQueue';

const ReviewQueueStats = ({ eventId, filters }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);

      const result = await fetchReviewQueueStats(eventId);
      if (result.success) {
        setStats(result.stats);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    loadStats();
  }, [eventId, filters]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!stats) {
    return <Alert severity="info">No statistics available</Alert>;
  }

  const StatCard = ({ title, value, color = '#1976d2' }) => (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" style={{ color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Overview
      </Typography>

      {/* Total Count */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Applications" value={stats.total || 0} color="#1976d2" />
        </Grid>
      </Grid>

      {/* By Track */}
      {stats.by_track && stats.by_track.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            By Track
          </Typography>
          <Grid container spacing={2}>
            {stats.by_track.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.track__label}>
                <StatCard
                  title={item.track__label}
                  value={item.count}
                  color="#2196f3"
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* By Status */}
      {stats.by_status && stats.by_status.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            By Status
          </Typography>
          <Grid container spacing={2}>
            {stats.by_status.map((item) => {
              const statusColors = {
                pending: '#ff9800',
                pre_approved: '#2196f3',
                accepted: '#4caf50',
                declined: '#f44336',
                waitlisted: '#ff9800',
              };
              return (
                <Grid item xs={12} sm={6} md={3} key={item.status}>
                  <StatCard
                    title={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    value={item.count}
                    color={statusColors[item.status] || '#999'}
                  />
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* By Mode */}
      {stats.by_mode && stats.by_mode.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            By Submission Mode
          </Typography>
          <Grid container spacing={2}>
            {stats.by_mode.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.submission_mode}>
                <StatCard
                  title={item.submission_mode.replace(/_/g, ' ')}
                  value={item.count}
                  color="#9c27b0"
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* By Tier */}
      {stats.by_tier && stats.by_tier.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            By Tier
          </Typography>
          <Grid container spacing={2}>
            {stats.by_tier.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.tier_preference__label}>
                <StatCard
                  title={item.tier_preference__label}
                  value={item.count}
                  color="#ff5722"
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default ReviewQueueStats;
