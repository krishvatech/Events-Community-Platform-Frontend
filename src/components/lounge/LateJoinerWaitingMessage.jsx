import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const LateJoinerWaitingMessage = ({ joinedAt }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!joinedAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const joined = new Date(joinedAt);
      const secondsElapsed = Math.floor((now - joined) / 1000);
      setElapsedSeconds(secondsElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [joinedAt]);

  const formatElapsedTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <Card
      sx={{
        mb: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
    >
      <CardHeader
        avatar={<HourglassEmptyIcon sx={{ fontSize: 32 }} />}
        title={<Typography variant="h6">Waiting for Room Assignment</Typography>}
        subheader={<Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Breakout sessions are in progress</Typography>}
      />

      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          {/* Progress Spinner */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress
              sx={{
                color: 'white',
              }}
              size={60}
            />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Elapsed: {formatElapsedTime(elapsedSeconds)}
            </Typography>
          </Box>

          {/* Main Message */}
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.6,
            }}
          >
            The host will assign you to a breakout room shortly. Please wait...
          </Typography>

          {/* Info Alert */}
          <Alert
            severity="info"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' },
              width: '100%',
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                You are in the Main Room
              </Typography>
              <Typography variant="caption">
                Once the host assigns you, you'll automatically join your breakout room.
              </Typography>
            </Stack>
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LateJoinerWaitingMessage;
