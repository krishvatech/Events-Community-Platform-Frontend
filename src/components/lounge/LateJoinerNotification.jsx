import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Typography,
  Button,
  Box,
  Stack,
  Chip,
  Alert,
  Grid,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

const LateJoinerNotification = ({ notification, onAssign, onDismiss }) => {
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  if (!notification) return null;

  const {
    late_joiner_id,
    participant_id,
    participant_name,
    participant_email,
    available_rooms,
  } = notification;

  const handleAssign = () => {
    if (selectedRoomId) {
      onAssign(participant_id, selectedRoomId);
      setSelectedRoomId(null);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        background: 'linear-gradient(135deg, #5a78ff 0%, #3f5fc3 100%)',
        color: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(90, 120, 255, 0.25)',
      }}
    >
      <CardHeader
        avatar={<PersonIcon sx={{ fontSize: 32 }} />}
        title={<Typography variant="h6">New Participant Joined</Typography>}
        subheader={<Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>{participant_name}</Typography>}
      />

      <CardContent>
        <Stack spacing={2}>
          {/* Participant Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" />
            <Typography variant="body2">{participant_email}</Typography>
          </Box>

          {/* Status Alert */}
          <Alert
            severity="info"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              '& .MuiAlert-icon': { color: 'white' },
            }}
          >
            {participant_name} is currently in the Main Room and waiting to be assigned to a breakout room.
          </Alert>

          {/* Available Rooms */}
          {available_rooms && available_rooms.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MeetingRoomIcon fontSize="small" />
                Available Breakout Rooms
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {available_rooms.map((room) => (
                  <Chip
                    key={room.id}
                    label={`${room.name} (${room.available_seats}/${room.max_seats})`}
                    onClick={() => setSelectedRoomId(room.id)}
                    color={selectedRoomId === room.id ? 'primary' : 'default'}
                    variant={selectedRoomId === room.id ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: selectedRoomId === room.id ? 'white' : 'transparent',
                      color: selectedRoomId === room.id ? '#5a78ff' : 'white',
                      borderColor: 'white',
                    }}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            <Alert
              severity="warning"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' },
              }}
            >
              No available breakout rooms with open seats at the moment.
            </Alert>
          )}
        </Stack>
      </CardContent>

      <CardActions
        sx={{
          display: 'flex',
          gap: 1,
          justifyContent: 'flex-end',
          paddingTop: 0,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={() => onDismiss(participant_id)}
          sx={{
            color: 'white',
            borderColor: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderColor: 'white',
            },
          }}
        >
          Keep in Main Room
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleAssign}
          disabled={!selectedRoomId}
          sx={{
            backgroundColor: 'white',
            color: '#5a78ff',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
            '&:disabled': {
              backgroundColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          Assign to Room
        </Button>
      </CardActions>
    </Card>
  );
};

export default LateJoinerNotification;
