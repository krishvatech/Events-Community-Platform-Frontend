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
import { ChevronDown, Check, X, Clock, MapPin, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const COLORS = {
  primary: '#E8532F',
  dark: '#1B2A4A',
  teal: '#0A9396',
  purple: '#7B2D8E',
  gold: '#D4920B',
  bg: '#F7F5F2',
};

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
  onMessage,
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
        borderRadius: 1.5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: `1.5px solid ${statusInfo.color}20`,
        transition: 'all 0.2s',
        bgcolor: '#fff',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: '16px 18px' }}>
        {/* Status-based title */}
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5, color: COLORS.dark }}>
          {getCardTitle()}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.25, flex: 1, minWidth: 0 }}>
            <Avatar
              src={otherParty?.avatar_url}
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 1.25,
                background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                fontWeight: 700,
                fontSize: 13,
                color: '#fff',
              }}
            >
              {otherParty?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 640, fontSize: 13.5, color: COLORS.dark }}>
                {otherParty?.display_name}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#999', mt: 0.25 }}>
                {[otherParty?.job_title, otherParty?.company].filter(Boolean).join(' • ')}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={statusInfo.label}
            size="small"
            sx={{
              bgcolor: statusInfo.color + '18',
              color: statusInfo.color,
              fontWeight: 700,
              fontSize: 10,
              flexShrink: 0,
              borderRadius: 0.625,
              p: '3px 8px',
              height: 'auto',
            }}
          />
        </Box>

        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: COLORS.dark }}>
            <Clock size={13} color={COLORS.teal} strokeWidth={2} />
            <Typography sx={{ fontSize: 12, color: COLORS.dark }}>
              {startTime} • {meeting.duration_minutes} min
            </Typography>
          </Box>
          {meeting.table && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: COLORS.dark }}>
              <MapPin size={13} color={COLORS.teal} strokeWidth={2} />
              <Typography sx={{ fontSize: 12, color: COLORS.dark }}>
                {meeting.table.name}
                {meeting.table.location_note && ` • ${meeting.table.location_note}`}
              </Typography>
            </Box>
          )}
          {meeting.message && !currentUserIsRequester && (
            <Box sx={{ mt: 0.5, p: '8px 10px', bgcolor: COLORS.bg, borderRadius: 1, borderLeft: `2px solid ${COLORS.teal}` }}>
              <Typography sx={{ fontSize: 11.5, color: COLORS.dark, fontStyle: 'italic' }}>
                "{meeting.message}"
              </Typography>
            </Box>
          )}
        </Box>

        {/* Actions based on status and direction */}
        {meeting.status === 'pending' && isIncoming && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => onAction(meeting.id, 'accept')}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                background: COLORS.teal,
                color: '#fff',
                fontSize: 12,
                fontWeight: 650,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                '&:hover': { background: '#069393' },
              }}
            >
              <Check size={13} strokeWidth={2} /> Accept
            </Button>
            <Button
              size="small"
              onClick={() => onAction(meeting.id, 'decline')}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                border: `1.5px solid #E0DCD7`,
                background: '#fff',
                fontSize: 12,
                fontWeight: 650,
                color: COLORS.dark,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              <X size={13} strokeWidth={2} /> Decline
            </Button>
            <Button
              size="small"
              onClick={() => onSuggest(meeting.id)}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                border: `1.5px solid #E0DCD7`,
                background: '#fff',
                fontSize: 12,
                fontWeight: 650,
                color: COLORS.dark,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              <MessageCircle size={13} strokeWidth={2} /> Suggest
            </Button>
          </Stack>
        )}

        {meeting.status === 'pending' && !isIncoming && (
          <Button
            size="small"
            fullWidth
            onClick={() => onAction(meeting.id, 'cancel')}
            sx={{
              mt: 2,
              p: '10px 14px',
              borderRadius: 1,
              border: `1.5px solid #E0DCD7`,
              background: '#fff',
              fontSize: 12,
              fontWeight: 650,
              color: COLORS.primary,
              cursor: 'pointer',
              textTransform: 'none',
              fontFamily: 'inherit',
            }}
          >
            Cancel Request
          </Button>
        )}

        {meeting.status === 'accepted' && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
            {otherParty?.user_id && (
              <Button
                size="small"
                onClick={() => onMessage(meeting)}
                sx={{
                  flex: 1,
                  p: '8px 12px',
                  borderRadius: 1,
                  background: COLORS.teal,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 650,
                  cursor: 'pointer',
                  textTransform: 'none',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  '&:hover': { background: '#069393' },
                }}
              >
                <MessageCircle size={13} strokeWidth={2} /> Message
              </Button>
            )}
            <Button
              size="small"
              onClick={() => onReschedule(meeting.id)}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                border: `1.5px solid #E0DCD7`,
                background: '#fff',
                fontSize: 12,
                fontWeight: 650,
                color: COLORS.dark,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
              }}
            >
              Reschedule
            </Button>
            <Button
              size="small"
              onClick={() => onAction(meeting.id, 'cancel')}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                border: `1.5px solid #E0DCD7`,
                background: '#fff',
                fontSize: 12,
                fontWeight: 650,
                color: COLORS.primary,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </Button>
          </Stack>
        )}

        {meeting.status === 'suggested' && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
            <Button
              size="small"
              onClick={() => onAction(meeting.id, 'accept')}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                background: COLORS.teal,
                color: '#fff',
                fontSize: 12,
                fontWeight: 650,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                '&:hover': { background: '#069393' },
              }}
            >
              <Check size={13} strokeWidth={2} /> Accept
            </Button>
            <Button
              size="small"
              onClick={() => onAction(meeting.id, 'decline')}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                border: `1.5px solid #E0DCD7`,
                background: '#fff',
                fontSize: 12,
                fontWeight: 650,
                color: COLORS.dark,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
              }}
            >
              Decline
            </Button>
            <Button
              size="small"
              onClick={() => onSuggest(meeting.id)}
              sx={{
                flex: 1,
                p: '8px 12px',
                borderRadius: 1,
                border: `1.5px solid #E0DCD7`,
                background: '#fff',
                fontSize: 12,
                fontWeight: 650,
                color: COLORS.dark,
                cursor: 'pointer',
                textTransform: 'none',
                fontFamily: 'inherit',
              }}
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
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [reschedulingMeetingId, setReschedulingMeetingId] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

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

  const handleReschedule = async (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    setReschedulingMeetingId(meetingId);
    setSelectedSlot(null);
    setRescheduleError('');
    setRescheduleSlots([]);
    setRescheduleModalOpen(true);

    // Fetch available slots
    setRescheduleLoading(true);
    try {
      const token = getToken();
      const currentUserIsRequester = meeting.requester_detail?.user_id === currentUserId;
      const otherPersonRegistrationId = currentUserIsRequester
        ? meeting.recipient_detail.id
        : meeting.requester_detail.id;

      const res = await fetch(
        `${API_BASE}/events/${eventId}/networking-meetings/availability/?recipient_registration_id=${otherPersonRegistrationId}&duration_minutes=${meeting.duration_minutes}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Failed to load available slots (HTTP ${res.status})`);
      }

      const data = await res.json();
      setRescheduleSlots(data.available_slots || []);
      if ((!data.available_slots || data.available_slots.length === 0) && !rescheduleError) {
        setRescheduleError('No available slots for rescheduling.');
      }
    } catch (err) {
      setRescheduleError(err.message || 'Failed to load available slots');
      setRescheduleSlots([]);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const submitReschedule = async () => {
    if (!reschedulingMeetingId || !selectedSlot) return;

    setRescheduleLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/networking-meetings/${reschedulingMeetingId}/reschedule/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          suggested_start_time: selectedSlot.start_time,
          suggested_end_time: selectedSlot.end_time,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Failed to reschedule (HTTP ${res.status})`);
      }

      await loadMeetings();
      setRescheduleModalOpen(false);
      toast.success('Meeting rescheduled successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule meeting');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleMessageMeetingParticipant = async (meeting) => {
    try {
      const token = getToken();

      // Determine if current user is requester or recipient
      const currentUserIsRequester = meeting.requester_detail?.user_id === currentUserId;
      const otherParty = currentUserIsRequester ? meeting.recipient_detail : meeting.requester_detail;

      if (!otherParty?.user_id) {
        toast.error('Unable to message - participant information missing');
        return;
      }

      // Call ensure-direct endpoint with meeting_id
      const res = await fetch(`${API_BASE}/messaging/conversations/ensure-direct/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipient_id: otherParty.user_id,
          meeting_id: meeting.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Failed to create conversation (HTTP ${res.status})`);
      }

      const conversation = await res.json();
      const conversationId = conversation.id || (conversation.conversation && conversation.conversation.id);

      if (!conversationId) {
        throw new Error('No conversation ID in response');
      }

      // Navigate to Messages page with conversation query param
      window.location.href = `/community?view=messages&conversation=${conversationId}`;
    } catch (err) {
      toast.error(err.message || 'Failed to start message');
    }
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
      <Box key={title} sx={{ mb: 3.5 }}>
        <Typography sx={{
          fontWeight: 750,
          fontSize: 14,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: COLORS.dark + '80',
          mb: 2,
        }}>
          {title} ({items.length})
        </Typography>
        {items.length === 0 ? (
          <Typography sx={{ fontSize: 13.5, color: '#999', fontStyle: 'italic' }}>
            No meetings in this category
          </Typography>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: isMobile ? 1.5 : 2,
          }}>
            {items.map(meeting => (
              <Box key={meeting.id}>
                <MeetingCard
                  meeting={meeting}
                  isIncoming={isIncoming}
                  eventId={eventId}
                  onAction={handleAction}
                  onSuggest={handleSuggest}
                  onReschedule={handleReschedule}
                  onMessage={handleMessageMeetingParticipant}
                  currentUserId={currentUserId}
                />
              </Box>
            ))}
          </Box>
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
    <Box sx={{
      p: isMobile ? '16px' : '24px',
      maxWidth: 1200,
      mx: 'auto',
      bgcolor: COLORS.bg,
      minHeight: '100vh',
    }}>
      {error && (
        <Alert severity="error" sx={{
          mb: 2,
          borderRadius: 1.5,
          border: `1.5px solid #F44336`,
        }}>
          {error}
        </Alert>
      )}

      {!hasAnyMeetings ? (
        <Paper sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: '#fff',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <Typography sx={{ fontSize: 15, color: '#999', fontWeight: 500 }}>
            No meetings yet. Start by requesting a 1:1 meeting with someone from the directory!
          </Typography>
        </Paper>
      ) : (
        <Box>
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
                  p: 1,
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: COLORS.bg },
                }}
                onClick={() => setExpandedHistory(!expandedHistory)}
              >
                <Typography sx={{
                  fontWeight: 750,
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: COLORS.dark + '80',
                  flex: 1,
                }}>
                  History ({groupedMeetings.history.length})
                </Typography>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: expandedHistory ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>
                  <ChevronDown size={18} color={COLORS.dark} strokeWidth={2} />
                </Box>
              </Box>

              <Collapse in={expandedHistory}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: isMobile ? 1.5 : 2,
                  opacity: 0.65,
                }}>
                  {groupedMeetings.history.map(meeting => {
                    const isIncoming = meeting.requester_detail?.user_id !== currentUserId;
                    return (
                      <Box key={meeting.id}>
                        <MeetingCard
                          meeting={meeting}
                          isIncoming={isIncoming}
                          eventId={eventId}
                          onAction={() => {}}
                          onSuggest={() => {}}
                          onReschedule={() => {}}
                          onMessage={() => {}}
                          currentUserId={currentUserId}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>
      )}

      {/* Suggest Different Slot Modal */}
      <Dialog
        open={suggestModalOpen}
        onClose={() => setSuggestModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, color: COLORS.dark }}>
          Suggest Different Time
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: 13.5, color: '#666', mb: 2 }}>
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                '& fieldset': { borderColor: '#E0DCD7' },
              },
            }}
          />
          <Typography sx={{ fontSize: 11.5, color: '#999', display: 'block', mt: 1 }}>
            {suggestingMessage.length}/500
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setSuggestModalOpen(false)}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 1,
              border: `1.5px solid #E0DCD7`,
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.dark,
              cursor: 'pointer',
              textTransform: 'none',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={actionLoading[suggestingMeetingId]}
            onClick={submitSuggestion}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 1,
              background: COLORS.teal,
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              textTransform: 'none',
              fontFamily: 'inherit',
              '&:hover': { background: '#069393' },
              '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
            }}
          >
            {actionLoading[suggestingMeetingId] ? 'Sending...' : 'Suggest'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Meeting Modal */}
      <Dialog open={rescheduleModalOpen} onClose={() => setRescheduleModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reschedule Meeting</DialogTitle>
        <DialogContent>
          {rescheduleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : rescheduleError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {rescheduleError}
            </Alert>
          ) : rescheduleSlots.length === 0 ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No available time slots for rescheduling. Please try again later.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, mt: 1 }}>
                Select a new time slot for your meeting:
              </Typography>
              <Stack spacing={1}>
                {rescheduleSlots.map((slot, idx) => {
                  const slotStart = new Date(slot.start_time).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const slotEnd = new Date(slot.end_time).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <Box
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: selectedSlot?.start_time === slot.start_time ? '#4CAF50' : '#ddd',
                        borderRadius: 1,
                        cursor: 'pointer',
                        bgcolor: selectedSlot?.start_time === slot.start_time ? '#4CAF5022' : '#fff',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: '#4CAF50',
                          bgcolor: '#4CAF5011',
                        },
                      }}
                    >
                      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                        {slotStart} – {slotEnd}
                      </Typography>
                      {selectedSlot?.start_time === slot.start_time && (
                        <Typography sx={{ fontSize: 12, color: '#4CAF50', fontWeight: 600, mt: 0.5 }}>
                          ✓ Selected
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={rescheduleLoading || !selectedSlot || rescheduleError}
            onClick={submitReschedule}
          >
            {rescheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MyMeetingsView;
