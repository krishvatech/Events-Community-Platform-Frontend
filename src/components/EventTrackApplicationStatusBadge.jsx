import React from 'react';
import { Chip, Box, Typography, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import WarningIcon from '@mui/icons-material/Warning';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

/**
 * EventTrackApplicationStatusBadge Component
 * Displays the status of a track application with color coding.
 * Phase 7: Multi-track application support.
 */
const EventTrackApplicationStatusBadge = ({
  status,
  reviewedAt,
  size = 'medium',
  showDate = false,
}) => {
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: 'default',
      icon: <HourglassTopIcon fontSize={size} />,
      backgroundColor: 'rgba(158, 158, 158, 0.1)',
    },
    pre_approved: {
      label: 'Pre-Approved',
      color: 'warning',
      icon: <AutoAwesomeIcon fontSize={size} />,
      backgroundColor: 'rgba(251, 140, 0, 0.1)',
    },
    accepted: {
      label: 'Accepted',
      color: 'success',
      icon: <CheckCircleIcon fontSize={size} />,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    declined: {
      label: 'Declined',
      color: 'error',
      icon: <CancelIcon fontSize={size} />,
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
    waitlisted: {
      label: 'Waitlisted',
      color: 'info',
      icon: <WarningIcon fontSize={size} />,
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  const chip = (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      variant="outlined"
      size={size === 'small' ? 'small' : 'medium'}
      sx={{
        backgroundColor: config.backgroundColor,
        fontWeight: 600,
      }}
    />
  );

  if (!showDate || !reviewedAt) {
    return chip;
  }

  const reviewDate = new Date(reviewedAt).toLocaleDateString();
  const tooltipText = `${config.label} on ${reviewDate}`;

  return (
    <Tooltip title={tooltipText}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {chip}
        <Typography variant="caption" color="textSecondary">
          {reviewDate}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default EventTrackApplicationStatusBadge;
