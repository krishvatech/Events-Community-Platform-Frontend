import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Stack,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import AssignmentIcon from '@mui/icons-material/Assignment';

const NotificationHistoryPanel = ({
  notifications = [],
  onClearAll,
  onClose,
  breakoutRooms = [],
  onAssign = null,
  assigningParticipantId = null,
}) => {
  const [assignMenuAnchor, setAssignMenuAnchor] = useState(null);
  const [assigningNotifId, setAssigningNotifId] = useState(null);
  const formatTime = (isoString) => {
    if (!isoString) return 'Unknown';
    try {
      const diffSeconds = (Date.now() - new Date(isoString).getTime()) / 1000;
      if (diffSeconds < 60) return 'Just now';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  const handleAssignClick = (notif, event) => {
    setAssigningNotifId(notif.participant_id);
    setAssignMenuAnchor(event.currentTarget);
  };

  const handleAssignToRoom = (roomId) => {
    if (onAssign && assigningNotifId) {
      onAssign(assigningNotifId, roomId);
    }
    setAssignMenuAnchor(null);
    setAssigningNotifId(null);
  };

  const handleCloseMenu = () => {
    setAssignMenuAnchor(null);
    setAssigningNotifId(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
          Notification History
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          ×
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {notifications && notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {notifications.map((notif, idx) => (
              <React.Fragment key={`${notif.participant_id}-${idx}`}>
                <ListItem
                  sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    pt: 1.5,
                    pb: 1.5,
                    px: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'rgba(90, 120, 255, 1)' }}>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                          {notif.participant_name || 'Unknown Participant'}
                        </Typography>
                        <Chip
                          label="Main Room"
                          size="small"
                          icon={<MeetingRoomIcon />}
                          sx={{
                            bgcolor: 'rgba(76, 175, 80, 0.2)',
                            color: '#4caf50',
                            border: '1px solid rgba(76, 175, 80, 0.5)',
                            height: 20,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: 'rgba(255,255,255,0.6)' }}>
                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption">{formatTime(notif.joinedAt)}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Assign Button */}
                  {onAssign && breakoutRooms && breakoutRooms.length > 0 && (
                    <Box sx={{ ml: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          assigningParticipantId === notif.participant_id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <AssignmentIcon fontSize="small" />
                          )
                        }
                        onClick={(e) => handleAssignClick(notif, e)}
                        disabled={assigningParticipantId === notif.participant_id}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          color: 'rgba(90, 120, 255, 1)',
                          borderColor: 'rgba(90, 120, 255, 0.5)',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: 'rgba(90, 120, 255, 0.1)',
                            borderColor: 'rgba(90, 120, 255, 1)',
                          },
                        }}
                      >
                        Assign
                      </Button>
                    </Box>
                  )}
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          /* Empty State */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <NotificationsNoneIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2">No recent notifications</Typography>
            <Typography variant="caption" sx={{ mt: 1 }}>
              Late joiner notifications will appear here
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      {notifications && notifications.length > 0 && (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<ClearAllIcon />}
            onClick={onClearAll}
            sx={{
              textTransform: 'none',
              color: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            Clear All
          </Button>
        </Box>
      )}

      {/* Room Selection Menu */}
      <Menu
        anchorEl={assignMenuAnchor}
        open={Boolean(assignMenuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            bgcolor: '#1f2937',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 1,
            '& .MuiMenuItem-root': {
              color: 'white',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'rgba(90, 120, 255, 0.2)',
              },
            },
          },
        }}
      >
        <MenuItem disabled sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
          Select Breakout Room
        </MenuItem>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 0.5 }} />
        {breakoutRooms && breakoutRooms.length > 0 ? (
          breakoutRooms.map((room) => (
            <MenuItem
              key={room.id}
              onClick={() => handleAssignToRoom(room.id)}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <span>{room.name || 'Unnamed Room'}</span>
              <Chip
                label={`${room.available_seats || 0}/${room.max_seats || 0}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: 'rgba(76, 175, 80, 0.2)',
                  color: '#4caf50',
                }}
              />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled sx={{ color: 'rgba(255,255,255,0.5)' }}>
            No breakout rooms available
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default NotificationHistoryPanel;
