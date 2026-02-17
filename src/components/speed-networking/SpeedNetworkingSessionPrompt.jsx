import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Card,
  Chip,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

/**
 * SpeedNetworkingSessionPrompt - Modal shown when Host starts Speed Networking
 *
 * Dark-themed component matching BreakoutControls style.
 * Displays 3 action buttons:
 * 1. Join Networking (Primary CTA - highlighted with blue)
 * 2. Stay in Lounge (Secondary action)
 * 3. Leave (Danger/exit action)
 *
 * Props:
 * - open: boolean - whether modal is visible
 * - sessionData: object - {sessionId, sessionName, durationMinutes, timestamp}
 * - onJoinNetworking: function - callback when "Join Networking" clicked
 * - onJoinLounge: function - callback when "Stay in Lounge" clicked
 * - onLeave: function - callback when "Leave" clicked
 * - isLoading: boolean - disable buttons while loading
 *
 * Style: Dark theme with blue accents, square/minimal border radius
 */
function SpeedNetworkingSessionPrompt({
  open,
  sessionData,
  onJoinNetworking,
  onJoinLounge,
  onLeave,
  isLoading = false
}) {
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!open || !sessionData) return null;

  // Dark theme colors matching BreakoutControls
  const darkBg = '#1a1a1a';
  const accentBlue = '#1e88e5'; // Material Blue
  const lightText = 'rgba(255, 255, 255, 0.87)';
  const secondaryText = 'rgba(255, 255, 255, 0.6)';
  const borderColor = 'rgba(255, 255, 255, 0.12)';

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      onClose={() => !isLoading && onLeave()}
      // Prevent closing while action is in progress
      disableEscapeKeyDown={isLoading}
      onBackdropClick={() => !isLoading && onLeave()}
      PaperProps={{
        sx: {
          // Square/minimal border radius - more angular
          borderRadius: 2,
          // Dark theme background
          bgcolor: darkBg,
          color: lightText,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }
      }}
      TransitionProps={{
        // Add smooth fade transition
        timeout: {
          enter: 300,
          exit: 200
        }
      }}
    >
      {/* Header - Blue accent with dark background */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3,
          bgcolor: accentBlue,
          color: 'white',
          fontWeight: 700,
          fontSize: '1.2rem',
          borderRadius: '2px 2px 0 0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>🎉</span>
          Speed Networking Started!
        </Box>
        <IconButton
          onClick={onLeave}
          disabled={isLoading}
          sx={{
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.15)'
            }
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        dividers
        sx={{
          py: 3,
          px: 3,
          textAlign: 'center',
          bgcolor: darkBg,
          borderColor: borderColor,
          '&::-webkit-scrollbar': {
            width: '10px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '5px'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(30, 136, 229, 0.5)',
            borderRadius: '5px',
            border: '2px solid rgba(26, 26, 26, 0.8)',
            '&:hover': {
              bgcolor: 'rgba(30, 136, 229, 0.8)'
            }
          }
        }}
      >
        <Stack spacing={2.5}>
          {/* Primary Message */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                mb: 1.5,
                color: lightText,
                fontWeight: 600
              }}
            >
              Connect with professionals in real-time
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: secondaryText,
                lineHeight: 1.6
              }}
            >
              Join the speed networking session for{' '}
              <span style={{ color: accentBlue, fontWeight: 600 }}>
                {sessionData.durationMinutes} minutes
              </span>{' '}
              to meet and network with other participants.
            </Typography>
          </Box>

          <Divider sx={{ borderColor: borderColor, my: 0.5 }} />

          {/* Session Details Card */}
          <Card
            sx={{
              p: 2,
              bgcolor: 'rgba(30, 136, 229, 0.08)', // Light blue background
              border: `1px solid ${accentBlue}40`, // Subtle blue border
              borderRadius: 1,
              color: lightText
            }}
            variant="outlined"
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon
                  sx={{
                    fontSize: '1.1rem',
                    color: accentBlue
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: accentBlue,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}
                >
                  Session Details
                </Typography>
              </Box>

              {/* Session Name */}
              {sessionData.sessionName && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: lightText,
                      fontWeight: 500
                    }}
                  >
                    Session:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: accentBlue,
                      fontWeight: 700
                    }}
                  >
                    {sessionData.sessionName}
                  </Typography>
                </Box>
              )}

              {/* Duration */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: lightText,
                    fontWeight: 500
                  }}
                >
                  <HourglassTopIcon sx={{ fontSize: '1.1rem', color: accentBlue }} />
                  Duration:
                </Typography>
                <Chip
                  label={`${sessionData.durationMinutes} minutes`}
                  size="small"
                  sx={{
                    bgcolor: accentBlue,
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </Box>
            </Stack>
          </Card>

          {/* CTA Text */}
          <Typography
            variant="body2"
            sx={{
              color: secondaryText,
              fontStyle: 'italic',
              mt: 1
            }}
          >
            What would you like to do?
          </Typography>
        </Stack>
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          p: 3,
          gap: 1,
          flexDirection: 'column',
          bgcolor: darkBg,
          borderTop: `1px solid ${borderColor}`
        }}
      >
        {/* Primary CTA - Join Networking */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={onJoinNetworking}
          disabled={isLoading}
          sx={{
            bgcolor: accentBlue,
            color: 'white',
            fontWeight: 700,
            fontSize: '1rem',
            py: 1.3,
            textTransform: 'none',
            letterSpacing: 0.3,
            borderRadius: 1,
            transition: 'all 0.2s ease-in-out',
            '&:hover:not(:disabled)': {
              bgcolor: accentBlue,
              filter: 'brightness(1.1)',
              boxShadow: `0 8px 20px rgba(30, 136, 229, 0.4)`,
              transform: 'translateY(-2px)'
            },
            '&:active:not(:disabled)': {
              transform: 'translateY(0)',
              boxShadow: `0 4px 10px rgba(30, 136, 229, 0.2)`
            },
            '&:focus-visible': {
              outline: `3px solid ${accentBlue}80`,
              outlineOffset: '2px'
            },
            '&:disabled': {
              bgcolor: 'rgba(30, 136, 229, 0.5)',
              color: 'rgba(255, 255, 255, 0.5)'
            }
          }}
          startIcon={<Diversity3Icon />}
        >
          {isLoading ? 'Joining...' : 'Join Networking'}
        </Button>

        {/* Secondary Options Row */}
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={1}
          sx={{ width: '100%' }}
        >
          {/* Stay in Lounge Button */}
          <Button
            variant="outlined"
            fullWidth
            onClick={onJoinLounge}
            disabled={isLoading}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: 0.3,
              color: secondaryText,
              borderColor: borderColor,
              borderRadius: 1,
              transition: 'all 0.2s ease-in-out',
              '&:hover:not(:disabled)': {
                borderColor: accentBlue,
                color: accentBlue,
                bgcolor: 'rgba(30, 136, 229, 0.1)'
              },
              '&:focus-visible': {
                outline: `2px solid ${accentBlue}80`,
                outlineOffset: '2px'
              }
            }}
          >
            Stay in Lounge
          </Button>

          {/* Leave Button (Danger action) */}
          <Button
            variant="outlined"
            fullWidth
            onClick={onLeave}
            disabled={isLoading}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: 0.3,
              color: '#ff6b6b',
              borderColor: 'rgba(255, 107, 107, 0.3)',
              borderRadius: 1,
              transition: 'all 0.2s ease-in-out',
              '&:hover:not(:disabled)': {
                borderColor: '#ff6b6b',
                color: '#ff6b6b',
                bgcolor: 'rgba(255, 107, 107, 0.1)'
              },
              '&:focus-visible': {
                outline: '2px solid rgba(255, 107, 107, 0.4)',
                outlineOffset: '2px'
              }
            }}
            startIcon={<ExitToAppIcon />}
          >
            Leave
          </Button>
        </Stack>

        {/* Helper Text */}
        <Typography
          variant="caption"
          sx={{
            color: secondaryText,
            textAlign: 'center',
            mt: 1,
            display: 'block'
          }}
        >
          You can join the networking session at any time from the controls
        </Typography>
      </DialogActions>
    </Dialog>
  );
}

export default SpeedNetworkingSessionPrompt;
