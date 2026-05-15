import { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Paper,
  Avatar,
  useMediaQuery,
  useTheme,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IconButton from '@mui/material/IconButton';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const getToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('access') || '';

function NetworkingMeetingRequestModal({ open, onClose, attendee, eventId, networkingSettings, currentUser }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [step, setStep] = useState('duration'); // 'duration', 'slots', 'message', 'success'
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleClose = () => {
    setStep('duration');
    setSelectedDuration(null);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setMessage('');
    setSubmitError('');
    setSuccessMessage('');
    onClose();
  };

  const handleDurationSelect = async (duration) => {
    setSelectedDuration(duration);
    setSlotsLoading(true);
    setSlotsError('');

    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE}/events/${eventId}/networking-meetings/availability/?recipient_registration_id=${attendee.registration_id}&duration_minutes=${duration}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const slots = Array.isArray(data) ? data : (data.available_slots || []);
      setAvailableSlots(slots);

      if (slots.length === 0) {
        setSlotsError(`No available ${duration}-minute time slots found. Check the event schedule or try a different duration.`);
      } else {
        setStep('slots');
      }
    } catch (err) {
      setSlotsError(err.message || 'Failed to load available slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep('message');
  };

  const handleSendRequest = async () => {
    if (!selectedSlot || !selectedDuration) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE}/events/${eventId}/networking-meetings/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            recipient_registration_id: attendee.registration_id,
            duration_minutes: selectedDuration,
            start_time: selectedSlot.start_time,
            message: message.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
      }

      setSuccessMessage(`Meeting request sent to ${attendee.display_name}!`);
      setStep('success');
    } catch (err) {
      setSubmitError(err.message || 'Failed to send meeting request');
    } finally {
      setSubmitting(false);
    }
  };

  // Group slots by date
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    const date = new Date(slot.start_time).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  // Render duration step
  const renderDurationStep = () => (
    <>
      <DialogTitle sx={{ pb: 1 }}>Select Meeting Duration</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            How long would you like to meet with {attendee?.display_name}?
          </Typography>
          <Stack spacing={1} direction={isMobile ? 'column' : 'row'} flexWrap="wrap">
            {(networkingSettings?.duration_options_minutes || [5, 10, 15]).map(duration => (
              <Button
                key={duration}
                variant={selectedDuration === duration ? 'contained' : 'outlined'}
                disabled={slotsLoading}
                onClick={() => handleDurationSelect(duration)}
                sx={{
                  flex: isMobile ? '1' : 'auto',
                  textTransform: 'none',
                  borderRadius: 1,
                }}
              >
                {duration} min
              </Button>
            ))}
          </Stack>
        </Box>
        {slotsError && <Alert severity="warning">{slotsError}</Alert>}
        {slotsLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading available times...</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </>
  );

  // Render slots step
  const renderSlotsStep = () => (
    <>
      <DialogTitle sx={{ pb: 1 }}>Select a Time</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Available slots for {selectedDuration}-minute meetings:
        </Typography>
        <Stack spacing={2}>
          {Object.entries(groupedSlots).map(([date, slots]) => (
            <Box key={date}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                {date}
              </Typography>
              <Stack direction={isMobile ? 'column' : 'row'} flexWrap="wrap" gap={1}>
                {slots.map(slot => {
                  const startTime = new Date(slot.start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const endTime = new Date(slot.end_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const isSelected =
                    selectedSlot?.start_time === slot.start_time &&
                    selectedSlot?.end_time === slot.end_time;

                  return (
                    <Button
                      key={`${slot.start_time}-${slot.end_time}`}
                      variant={isSelected ? 'contained' : 'outlined'}
                      onClick={() => handleSlotSelect(slot)}
                      sx={{
                        flex: isMobile ? '1' : 'auto',
                        textTransform: 'none',
                        borderRadius: 1,
                      }}
                    >
                      {startTime} – {endTime}
                    </Button>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setStep('duration')}>Back</Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </>
  );

  // Render message step
  const renderMessageStep = () => {
    const startTime = new Date(selectedSlot?.start_time).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <>
        <DialogTitle sx={{ pb: 1 }}>Add a Message (Optional)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            <strong>{selectedDuration} minutes</strong> • {startTime}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Tell them why you'd like to meet..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 500 }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {message.length}/500
          </Typography>
          {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStep('slots')}>Back</Button>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={submitting || !selectedSlot || !selectedDuration}
            onClick={handleSendRequest}
            sx={{ position: 'relative', minWidth: 120 }}
          >
            {submitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogActions>
      </>
    );
  };

  // Render success step
  const renderSuccessStep = () => (
    <>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Request Sent!
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {successMessage}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {attendee?.display_name} will receive your meeting request and can accept or suggest a different time.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" fullWidth onClick={handleClose}>
          Done
        </Button>
      </DialogActions>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: isMobile ? { m: 0 } : undefined,
      }}
    >
      {/* Header with attendee info and close button */}
      {step !== 'success' && (
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            <Avatar
              src={attendee?.avatar_url}
              sx={{ width: 40, height: 40, flexShrink: 0 }}
            >
              {attendee?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                {attendee?.display_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[attendee?.job_title, attendee?.company].filter(Boolean).join(' • ')}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleClose} sx={{ flexShrink: 0 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Step content */}
      {step === 'duration' && renderDurationStep()}
      {step === 'slots' && renderSlotsStep()}
      {step === 'message' && renderMessageStep()}
      {step === 'success' && renderSuccessStep()}
    </Dialog>
  );
}

export default NetworkingMeetingRequestModal;
