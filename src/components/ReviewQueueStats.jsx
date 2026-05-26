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
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
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

  const StatCard = ({ title, value, color = '#1976d2', icon: Icon = AssignmentIcon }) => (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `2px solid ${color}30`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${color}30`,
          border: `2px solid ${color}50`,
        }
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, width: '100%' }}>
          <Box
            sx={{
              p: 1,
              borderRadius: '8px',
              background: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ color, fontSize: '24px' }} />
          </Box>
          <Typography variant="caption" sx={{ color: 'textSecondary', fontSize: '0.75rem', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  // Flatten all stats into a single list for display
  const allStats = [];

  // Add total
  if (stats.total !== undefined) {
    allStats.push({
      id: 'total',
      title: 'Total Applications',
      value: stats.total,
      color: '#1976d2',
      icon: AssignmentIcon,
    });
  }

  // Add by track
  if (stats.by_track && stats.by_track.length > 0) {
    stats.by_track.forEach((item) => {
      allStats.push({
        id: `track-${item.track__label}`,
        title: `${item.track__label} Track`,
        value: item.count,
        color: '#2196f3',
        icon: AssignmentIcon,
      });
    });
  }

  // Add by status
  if (stats.by_status && stats.by_status.length > 0) {
    stats.by_status.forEach((item) => {
      const statusConfig = {
        pending: { color: '#ff9800', icon: PendingActionsIcon },
        pre_approved: { color: '#2196f3', icon: EventAvailableIcon },
        accepted: { color: '#4caf50', icon: CheckCircleIcon },
        declined: { color: '#f44336', icon: ThumbDownIcon },
        waitlisted: { color: '#ff9800', icon: PendingActionsIcon },
      };
      const config = statusConfig[item.status] || { color: '#999', icon: AssignmentIcon };
      allStats.push({
        id: `status-${item.status}`,
        title: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
        value: item.count,
        color: config.color,
        icon: config.icon,
      });
    });
  }

  // Add by mode
  if (stats.by_mode && stats.by_mode.length > 0) {
    stats.by_mode.forEach((item) => {
      allStats.push({
        id: `mode-${item.submission_mode}`,
        title: item.submission_mode.replace(/_/g, ' ').charAt(0).toUpperCase() + item.submission_mode.replace(/_/g, ' ').slice(1),
        value: item.count,
        color: '#9c27b0',
        icon: AssignmentIcon,
      });
    });
  }

  // Add by tier
  if (stats.by_tier && stats.by_tier.length > 0) {
    stats.by_tier.forEach((item) => {
      allStats.push({
        id: `tier-${item.tier_preference__label}`,
        title: item.tier_preference__label,
        value: item.count,
        color: '#ff5722',
        icon: AssignmentIcon,
      });
    });
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 4,
            height: 24,
            background: 'linear-gradient(135deg, #1976d2, #2196f3)',
            borderRadius: '2px'
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#212121' }}>
          Review Queue Overview
        </Typography>
      </Box>

      {/* All Stats in Single Row */}
      <Grid container spacing={2}>
        {allStats.map((stat) => (
          <Grid item xs={6} sm={4} md={3} lg={2.4} key={stat.id}>
            <StatCard
              title={stat.title}
              value={stat.value}
              color={stat.color}
              icon={stat.icon}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReviewQueueStats;
