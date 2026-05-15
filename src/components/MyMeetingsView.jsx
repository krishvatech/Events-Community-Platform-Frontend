import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Button,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
  IconButton,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { toast } from 'react-toastify';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const getToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('access') || '';

const MEETING_STATUSES = {
  pending: { color: '#FF9500', label: 'Pending', icon: '⏳' },
  accepted: { color: '#4CAF50', label: 'Accepted', icon: '✓' },
  suggested: { color: '#2196F3', label: 'Suggested', icon: '💬' },
  declined: { color: '#F44336', label: 'Declined', icon: '✗' },
  cancelled: { color: '#757575', label: 'Cancelled', icon: '✗' },
  expired: { color: '#9E9E9E', label: 'Expired', icon: '⏰' },
};

function MeetingCard({
  meeting,
  isIncoming,
  eventId,
  onAction,
  onSuggest,
  onReschedule,
  currentUserId,
}) {
  // Determine if current user is requester or recipient
  const currentUserIsRequester = meeting.requester_detail?.user_id === currentUserId;

  // Always show the OTHER attendee on the card (not the current logged-in user)
  const otherParty = currentUserIsRequester ? meeting.recipient_detail : meeting.requester_detail;
  const requesterDetail = meeting.requester_detail;
  const recipientDetail = meeting.recipient_detail;

  const startTime = new Date(meeting.start_time).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const statusInfo = MEETING_STATUSES[meeting.status] || MEETING_STATUSES.pending;

  // Generate status-based title
  const getCardTitle = () => {
    const otherPersonName = otherParty?.display_name || 'Someone';

    if (meeting.status === 'pending') {
      if (currentUserIsRequester) {
        return `Request sent to ${recipientDetail?.display_name || 'Someone'}`;
      } else {
        return `${requesterDetail?.display_name || 'Someone'} requested a meeting with you`;
      }
    }

    if (meeting.status === 'accepted') {
      return `Meeting with ${otherPersonName}`;
    }

    if (meeting.status === 'declined') {
      if (currentUserIsRequester) {
        // Current user is requester, they were declined
        return `${recipientDetail?.display_name || 'Someone'} declined your meeting request`;
      } else {
        // Current user is recipient, they declined
        return `You declined ${requesterDetail?.display_name || 'someone'}'s meeting request`;
      }
    }

    if (meeting.status === 'cancelled') {
      if (meeting.cancelled_by_name) {
        // Check if current user cancelled
        const isCancelledByMe = meeting.cancelled_by_name === 'You' ||
                                meeting.cancelled_by_name === requesterDetail?.display_name && currentUserIsRequester ||
                                meeting.cancelled_by_name === recipientDetail?.display_name && !currentUserIsRequester;
        return isCancelledByMe
          ? `You cancelled the meeting with ${otherPersonName}`
          : `${otherPersonName} cancelled the meeting`;
      }
      return 'Meeting cancelled';
    }

    if (meeting.status === 'suggested') {
      return `${otherPersonName} suggested a different time`;
    }

    return otherPersonName;
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: `1px solid ${statusInfo.color}22`,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        },
      }}
    >
      <CardContent>
        {/* Status-based title */}
        <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1.5, color: '#1B2A4A' }}>
          {getCardTitle()}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flex: 1, minWidth: 0 }}>
            <Avatar
              src={otherParty?.avatar_url}
              sx={{ width: 40, height: 40, flexShrink: 0 }}
            >
              {otherParty?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                {otherParty?.display_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#999' }}>
                {[otherParty?.job_title, otherParty?.company].filter(Boolean).join(' • ')}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={statusInfo.label}
            size="small"
            sx={{
              bgcolor: statusInfo.color + '22',
              color: statusInfo.color,
              fontWeight: 600,
              fontSize: 11,
              flexShrink: 0,
            }}
          />
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: '#999', mb: 0.5 }}>
            {startTime} • {meeting.duration_minutes} min
          </Typography>
          {meeting.table && (
            <Typography sx={{ fontSize: 12, color: '#999' }}>
              {meeting.table.name}
              {meeting.table.location_note && ` • ${meeting.table.location_note}`}
            </Typography>
          )}
          {meeting.message && !currentUserIsRequester && (
            <Typography sx={{ fontSize: 12, mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, fontStyle: 'italic' }}>
              "{meeting.message}"
            </Typography>
          )}
        </Box>

        {/* Actions based on status and direction */}
        {meeting.status === 'pending' && isIncoming && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={() => onAction(meeting.id, 'accept')}
              sx={{
                flex: 1,
                textTransform: 'none',
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#45a049' },
              }}
            >
              Accept
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAction(meeting.id, 'decline')}
              sx={{ flex: 1, textTransform: 'none' }}
            >
              Decline
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => onSuggest(meeting.id)}
              sx={{ flex: 1, textTransform: 'none', fontSize: 12 }}
            >
              Suggest
            </Button>
          </Stack>
        )}

        {meeting.status === 'pending' && !isIncoming && (
          <Button
            size="small"
            variant="outlined"
            fullWidth
            onClick={() => onAction(meeting.id, 'cancel')}
            sx={{ mt: 2, textTransform: 'none' }}
          >
            Cancel Request
          </Button>
        )}

        {meeting.status === 'accepted' && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => onReschedule(meeting.id)}
              sx={{ flex: 1, textTransform: 'none' }}
            >
              Reschedule
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => onAction(meeting.id, 'cancel')}
              sx={{ flex: 1, textTransform: 'none' }}
            >
              Cancel
            </Button>
          </Stack>
        )}

        {meeting.status === 'suggested' && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={() => onAction(meeting.id, 'accept')}
              sx={{
                flex: 1,
                textTransform: 'none',
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#45a049' },
              }}
            >
              Accept
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAction(meeting.id, 'decline')}
              sx={{ flex: 1, textTransform: 'none' }}
            >
              Decline
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => onSuggest(meeting.id)}
              sx={{ flex: 1, textTransform: 'none', fontSize: 12 }}
            >
              Counter
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function MyMeetingsView({ eventId, currentUserId, networkingSettings, isMobile }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestingMeetingId, setSuggestingMeetingId] = useState(null);
  const [suggestingMessage, setSuggestingMessage] = useState('');

  useEffect(() => {
    loadMeetings();
  }, [eventId]);

  const loadMeetings = async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/events/${eventId}/networking-meetings/my/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (meetingId, action) => {
    setActionLoading(prev => ({ ...prev, [meetingId]: action }));

    try {
      const token = getToken();
      const endpoint =
        action === 'accept'
          ? `/accept`
          : action === 'decline'
          ? `/decline`
          : action === 'cancel'
          ? `/cancel`
          : null;

      if (!endpoint) throw new Error('Invalid action');

      const res = await fetch(`${API_BASE}/networking-meetings/${meetingId}${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }

      await loadMeetings();
      toast.success(`Meeting ${action}ed successfully`);
    } catch (err) {
      toast.error(err.message || `Failed to ${action} meeting`);
    } finally {
      setActionLoading(prev => ({ ...prev, [meetingId]: null }));
    }
  };

  const handleSuggest = (meetingId) => {
    setSuggestingMeetingId(meetingId);
    setSuggestingMessage('');
    setSuggestModalOpen(true);
  };

  const handleReschedule = (meetingId) => {
    // For reschedule, we would need to open a slot picker modal
    // For now, show a placeholder
    toast.info('Reschedule feature coming soon - please use Suggest Different Slot instead');
  };

  const submitSuggestion = async () => {
    if (!suggestingMeetingId) return;

    setActionLoading(prev => ({ ...prev, [suggestingMeetingId]: 'suggest' }));

    try {
      const token = getToken();
      // Note: This is a placeholder. Full slot-picker UI for suggesting new times would be implemented separately.
      // For now, the Suggest Different Slot feature requires the user to go through the full flow with date/time picker.
      toast.info('Feature not yet available - use the full meeting request flow to suggest new times');
      setSuggestModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send suggestion');
    } finally {
      setActionLoading(prev => ({ ...prev, [suggestingMeetingId]: null }));
    }
  };

  // Determine if current user is requester or recipient for each meeting
  const isCurrentUserRequester = (meeting) => {
    return meeting.requester_detail?.user_id === currentUserId;
  };

  // Group meetings by status
  const groupedMeetings = {
    incomingPending: meetings.filter(m => !isCurrentUserRequester(m) && m.status === 'pending'),
    outgoingPending: meetings.filter(m => isCurrentUserRequester(m) && m.status === 'pending'),
    accepted: meetings.filter(m => m.status === 'accepted'),
    suggested: meetings.filter(m => m.status === 'suggested'),
    history: meetings.filter(m => ['declined', 'cancelled', 'expired'].includes(m.status)),
  };

  const renderSection = (title, items, isIncoming = false, isHistory = false) => {
    if (items.length === 0 && !isHistory) return null;

    return (
      <Box key={title} sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 2, color: '#1B2A4A' }}>
          {title} ({items.length})
        </Typography>
        {items.length === 0 ? (
          <Typography sx={{ fontSize: 14, color: '#999', fontStyle: 'italic' }}>
            No meetings in this category
          </Typography>
        ) : (
          <Grid
            container
            spacing={isMobile ? 1 : 2}
            sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
            }}
          >
            {items.map(meeting => (
              <Grid item xs={12} key={meeting.id} sx={{ display: 'block' }}>
                <MeetingCard
                  meeting={meeting}
                  isIncoming={isIncoming}
                  eventId={eventId}
                  onAction={handleAction}
                  onSuggest={handleSuggest}
                  onReschedule={handleReschedule}
                  currentUserId={currentUserId}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasAnyMeetings = Object.values(groupedMeetings).some(arr => arr.length > 0);

  return (
    <Box sx={{ p: isMobile ? 2 : 4, maxWidth: 1200, mx: 'auto' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!hasAnyMeetings ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#fff' }}>
          <Typography sx={{ fontSize: 16, color: '#999' }}>
            No meetings yet. Start by requesting a 1:1 meeting with someone from the directory!
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={4}>
          {renderSection('Incoming Requests', groupedMeetings.incomingPending, true)}
          {renderSection('Outgoing Requests', groupedMeetings.outgoingPending, false)}
          {renderSection('Accepted Meetings', groupedMeetings.accepted)}
          {renderSection('Suggested/Proposals', groupedMeetings.suggested)}

          {/* History Section (Collapsible) */}
          {groupedMeetings.history.length > 0 && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  mb: 2,
                }}
                onClick={() => setExpandedHistory(!expandedHistory)}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#1B2A4A', flex: 1 }}>
                  History ({groupedMeetings.history.length})
                </Typography>
                <IconButton
                  size="small"
                  sx={{
                    transform: expandedHistory ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Box>

              <Collapse in={expandedHistory}>
                <Grid
                  container
                  spacing={isMobile ? 1 : 2}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
                  }}
                >
                  {groupedMeetings.history.map(meeting => {
                    const isIncoming = meeting.requester_detail?.user_id !== currentUserId;
                    return (
                      <Grid item xs={12} key={meeting.id} sx={{ display: 'block', opacity: 0.7 }}>
                        <MeetingCard
                          meeting={meeting}
                          isIncoming={isIncoming}
                          eventId={eventId}
                          onAction={() => {}}
                          onSuggest={() => {}}
                          onReschedule={() => {}}
                          currentUserId={currentUserId}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Collapse>
            </Box>
          )}
        </Stack>
      )}

      {/* Suggest Different Slot Modal */}
      <Dialog open={suggestModalOpen} onClose={() => setSuggestModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Suggest Different Time</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, mt: 1 }}>
            Suggest an alternative time for this meeting. The other person will receive your proposal.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Explain why you're suggesting this change (optional)..."
            value={suggestingMessage}
            onChange={e => setSuggestingMessage(e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            {suggestingMessage.length}/500
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={actionLoading[suggestingMeetingId]}
            onClick={submitSuggestion}
          >
            {actionLoading[suggestingMeetingId] ? 'Sending...' : 'Suggest'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MyMeetingsView;
