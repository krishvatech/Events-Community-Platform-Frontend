import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Avatar,
  Stack,
  Button,
  Collapse,
  IconButton,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { toast } from 'react-toastify';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const getToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('access') || '';

const COLORS = {
  teal: '#0A9396',
  dark: '#1B2A4A',
  gold: '#D4920B',
  primary: '#E8532F',
  bg: '#F7F5F2',
};

function ScheduleTab({ eventId, token, isMobile, currentUserId }) {
  const theme = useTheme();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [bookmarkedSessions, setBookmarkedSessions] = useState(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(new Set());
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [eventId, token]);

  const fetchSchedule = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `${API_BASE}/events/${eventId}/schedule/`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (!res.ok) throw new Error('Failed to load schedule');

      const data = await res.json();
      setSchedule(data.days || []);

      // Extract bookmarked sessions
      const bookmarked = new Set();
      data.days?.forEach(day => {
        day.sessions?.forEach(session => {
          if (session.is_bookmarked) {
            bookmarked.add(session.id);
          }
        });
      });
      setBookmarkedSessions(bookmarked);

      if (data.days?.length > 0) {
        setSelectedDay(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkToggle = async (sessionId, isCurrentlyBookmarked) => {
    setBookmarkLoading(prev => new Set(prev).add(sessionId));

    try {
      const method = isCurrentlyBookmarked ? 'DELETE' : 'POST';
      const res = await fetch(
        `${API_BASE}/events/${eventId}/schedule/${sessionId}/bookmark/`,
        {
          method,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!res.ok) throw new Error('Failed to update bookmark');

      setBookmarkedSessions(prev => {
        const updated = new Set(prev);
        if (isCurrentlyBookmarked) {
          updated.delete(sessionId);
        } else {
          updated.add(sessionId);
        }
        return updated;
      });

      toast.success(isCurrentlyBookmarked ? 'Bookmark removed' : 'Session bookmarked!');
    } catch (err) {
      toast.error(err.message || 'Failed to update bookmark');
    } finally {
      setBookmarkLoading(prev => {
        const updated = new Set(prev);
        updated.delete(sessionId);
        return updated;
      });
    }
  };

  const formatTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          onClick={fetchSchedule}
          sx={{ mt: 2, textTransform: 'none' }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: '#999' }}>
          No schedule available for this event
        </Typography>
      </Box>
    );
  }

  const currentDay = selectedDay !== null ? schedule[selectedDay] : null;
  const sessionsToDisplay = currentDay?.sessions || [];
  const filteredSessions = showBookmarkedOnly
    ? sessionsToDisplay.filter(s => bookmarkedSessions.has(s.id))
    : sessionsToDisplay;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: COLORS.bg }}>
      {/* Day selector */}
      <Box sx={{
        bgcolor: '#fff',
        borderBottom: '1px solid #f0eeeb',
        p: { xs: 2, sm: 3 },
        overflowX: 'auto',
      }}>
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content', mb: 2 }}>
          {schedule.map((day, idx) => (
            <Chip
              key={idx}
              label={`${day.label} (${formatDate(day.date)})`}
              onClick={() => setSelectedDay(idx)}
              sx={{
                bgcolor: selectedDay === idx ? COLORS.teal : '#f5f5f5',
                color: selectedDay === idx ? '#fff' : '#333',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: selectedDay === idx ? COLORS.teal : '#eee',
                },
              }}
            />
          ))}
        </Stack>

        {/* Filter toggle */}
        <Button
          size="small"
          variant={showBookmarkedOnly ? 'contained' : 'outlined'}
          startIcon={<BookmarkIcon />}
          onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          sx={{
            textTransform: 'none',
            bgcolor: showBookmarkedOnly ? COLORS.teal : 'transparent',
            color: showBookmarkedOnly ? '#fff' : COLORS.teal,
            borderColor: COLORS.teal,
          }}
        >
          Bookmarked Only
        </Button>
      </Box>

      {/* Sessions list */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
        {filteredSessions.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#999', textAlign: 'center', mt: 4 }}>
            {showBookmarkedOnly ? 'No bookmarked sessions for this day' : 'No sessions scheduled for this day'}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {filteredSessions.map(session => (
              <Card
                key={session.id}
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
                }}
              >
                <CardContent>
                  {/* Header with title and bookmark */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, color: COLORS.dark, mb: 0.5 }}>
                        {session.title}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#999' }}>
                        {formatTime(session.start_time)} - {formatTime(session.end_time)} ({session.duration_minutes} min)
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleBookmarkToggle(session.id, bookmarkedSessions.has(session.id))}
                      disabled={bookmarkLoading.has(session.id)}
                      sx={{ ml: 1, color: COLORS.teal }}
                    >
                      {bookmarkLoading.has(session.id) ? (
                        <CircularProgress size={20} />
                      ) : bookmarkedSessions.has(session.id) ? (
                        <BookmarkIcon sx={{ color: COLORS.teal }} />
                      ) : (
                        <BookmarkBorderIcon />
                      )}
                    </IconButton>
                  </Box>

                  {/* Room and speakers */}
                  <Stack spacing={1} sx={{ mb: 1.5 }}>
                    {session.room && (
                      <Typography sx={{ fontSize: 12, color: '#666' }}>
                        <strong>Room:</strong> {session.room}
                        {session.location_note && ` • ${session.location_note}`}
                      </Typography>
                    )}

                    {session.speakers && session.speakers.length > 0 && (
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#666', mb: 0.5 }}>
                          Speakers:
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          {session.speakers.map(speaker => (
                            <Chip
                              key={speaker.id}
                              avatar={<Avatar src={speaker.avatar_url} />}
                              label={speaker.name || speaker.username}
                              size="small"
                              sx={{ fontSize: 11 }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>

                  {/* Session type badge */}
                  <Box sx={{ mb: 1.5 }}>
                    <Chip
                      label={session.session_type}
                      size="small"
                      sx={{
                        bgcolor: session.session_type === 'main' ? '#FFB74D' :
                               session.session_type === 'breakout' ? '#81C784' :
                               session.session_type === 'workshop' ? '#64B5F6' : '#90CAF9',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </Box>

                  {/* Description (collapsible) */}
                  {session.description && (
                    <>
                      <Button
                        size="small"
                        onClick={() =>
                          setExpandedSession(expandedSession === session.id ? null : session.id)
                        }
                        endIcon={
                          <ExpandMoreIcon
                            sx={{
                              transform: expandedSession === session.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          />
                        }
                        sx={{
                          textTransform: 'none',
                          color: COLORS.teal,
                          p: 0,
                          justifyContent: 'flex-start',
                        }}
                      >
                        Description
                      </Button>

                      <Collapse in={expandedSession === session.id}>
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            p: 1.5,
                            bgcolor: '#f9f9f9',
                            borderRadius: 1,
                            color: '#666',
                            lineHeight: 1.6,
                          }}
                        >
                          {session.description}
                        </Typography>
                      </Collapse>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default ScheduleTab;
