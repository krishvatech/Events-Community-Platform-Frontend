import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  LinearProgress,
  useTheme,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LoungeTable from './LoungeTable';

/**
 * PostEventLoungeScreen
 * Displays available social lounges after the main event has ended.
 * Shows a countdown timer and message about the networking window.
 */
const PostEventLoungeScreen = ({
  closingTime, // ISO datetime string for when lounge closes
  loungeTables = [],
  onJoinTable, // Full join handler that gets token and enters breakout
  onLeaveTable,
  currentUserId,
  myUsername,
  onExit,
  onParticipantClick,
  loungeOpenStatus, // ✅ NEW: lounge availability status
  isHost = false, // ✅ NEW: whether user is the host
}) => {
  useTheme();

  const [timeRemaining, setTimeRemaining] = useState('--:--');
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [progressPercent, setProgressPercent] = useState(100);

  // Filter to show only LOUNGE category tables (not BREAKOUT)
  const loungeOnlyTables = loungeTables.filter(
    (t) => t.category === 'LOUNGE' || !t.category
  );

  // Update countdown timer
  useEffect(() => {
    if (!closingTime) return;

    const updateTimer = () => {
      const now = new Date();
      const closing = new Date(closingTime);
      const diffMs = closing - now;

      if (diffMs <= 0) {
        setTimeRemaining('0:00');
        setMinutesRemaining(0);
        setProgressPercent(0);
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      setTimeRemaining(`${mins}:${String(secs).padStart(2, '0')}`);
      setMinutesRemaining(mins);

      // Calculate progress percentage based on time remaining
      const progressPercentCalc = Math.max(0, Math.min(100,
        ((diffMs / 1000) / (mins * 60 + secs)) * 100
      ));
      setProgressPercent(progressPercentCalc);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [closingTime]);

  const handleExit = () => {
    if (onExit) {
      onExit();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        py: 4,
      }}
    >
      {/* Header Section */}
      <Container maxWidth="lg" sx={{ mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            bgcolor: 'rgba(90, 120, 255, 0.1)',
            border: '2px solid rgba(90, 120, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <AccessTimeRoundedIcon
              sx={{
                fontSize: { xs: 32, md: 40 },
                color: '#5a78ff',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: 'white',
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              {timeRemaining}
            </Typography>
          </Box>

          <Typography
            variant="h6"
            sx={{
              color: 'white',
              mb: 1,
              fontWeight: 600,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            The event has ended
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 3,
              fontSize: { xs: '0.95rem', md: '1rem' },
            }}
          >
            {minutesRemaining > 0
              ? `But you're invited to network in the Social Lounge for the next ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}!`
              : 'The social lounge is closing soon. Please say your goodbyes!'}
          </Typography>

          {/* Progress Bar */}
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: 'linear-gradient(90deg, #5a78ff, #7a98ff)',
              },
            }}
          />
        </Paper>
      </Container>

      {/* Lounge Tables Section */}
      <Container maxWidth="lg" sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'white',
              mb: 2,
            }}
          >
            Available Networking Tables
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              mb: 3,
            }}
          >
            Join a table to continue networking with other attendees
          </Typography>
        </Box>

        {loungeOnlyTables.length > 0 ? (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {loungeOnlyTables.map((table) => (
              <Grid item xs={12} sm={6} md={4} key={table.id}>
                <LoungeTable
                  table={table}
                  onJoin={onJoinTable}
                  onLeave={onLeaveTable}
                  currentUserId={currentUserId}
                  myUsername={myUsername}
                  isAdmin={false} // Participants can't admin in post-event mode
                  onUpdateIcon={() => {}} // No icon update in post-event mode
                  onEditTable={() => {}} // No edit in post-event mode
                  onDeleteTable={() => {}} // No delete in post-event mode
                  onParticipantClick={onParticipantClick}
                  loungeOpenStatus={loungeOpenStatus}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            sx={{
              py: 8,
              textAlign: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 3,
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              mb: 4,
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '1.1rem',
              }}
            >
              No networking tables available at this time.
            </Typography>
          </Paper>
        )}
      </Container>

      {/* Exit Button */}
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            py: 2,
          }}
        >
          <Button
            variant="outlined"
            size="large"
            onClick={handleExit}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 2,
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            {isHost ? 'Exit to Dashboard' : 'Leave Lounge'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default PostEventLoungeScreen;
