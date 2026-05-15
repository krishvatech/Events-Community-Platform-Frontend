import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Paper,
  Stack,
  Button,
  useMediaQuery,
  useTheme,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CoffeeIcon from '@mui/icons-material/Coffee';
import { Helmet } from 'react-helmet-async';
import NetworkingMeetingRequestModal from '../components/NetworkingMeetingRequestModal';
import MyMeetingsView from '../components/MyMeetingsView';
import ScheduleTab from '../components/ScheduleTab';
import { toast } from 'react-toastify';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const COLORS = {
  primary: '#E8532F',
  dark: '#1B2A4A',
  teal: '#0A9396',
  purple: '#7B2D8E',
  gold: '#D4920B',
  bg: '#F7F5F2',
};

const ROLE_CHIP_COLORS = {
  speaker: { backgroundColor: COLORS.gold + '22', color: COLORS.gold },
  host: { backgroundColor: COLORS.teal + '22', color: COLORS.teal },
  moderator: { backgroundColor: COLORS.purple + '22', color: COLORS.purple },
  attendee: { backgroundColor: '#f5f5f5', color: '#424242' },
};

function DesktopView({
  event,
  allParticipants,
  loading,
  error,
  userInitials,
  searchQuery,
  onSearchChange,
  networkingSettings,
  currentUserId,
  onRequestMeeting,
}) {
  return (
    <Box sx={{
      bgcolor: '#fff',
      borderRadius: 0,
      overflow: 'hidden',
      boxShadow: 'none',
      minHeight: '100vh',
      width: '100%',
    }}>
      <Box sx={{
        p: '14px 24px',
        borderBottom: '1px solid #F0EEEB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850, fontSize: 20, color: COLORS.dark, flexShrink: 0 }}>imaa</Typography>
          <Typography sx={{
            fontSize: 13,
            color: '#999',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1
          }}>
            {event?.title || 'Annual M&A Conference 2026'}
          </Typography>
        </Box>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1,
          background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>{userInitials || 'CK'}</Box>
      </Box>

      <Box sx={{ p: '20px 24px' }}>
        <Typography variant="h5" sx={{ fontWeight: 740, color: COLORS.dark, mb: 0.5 }}>
          Event Attendees
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#999', mb: 2 }}>
          {allParticipants.length} attendees · Tap 🔗 to request a 1:1
        </Typography>

        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          p: '10px 14px', borderRadius: 1.25, bgcolor: COLORS.bg, mb: 2,
        }}>
          <SearchIcon sx={{ color: '#BBB', fontSize: 16 }} />
          <input
            type="text"
            placeholder="Search by name, company, or role..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              color: '#333',
              outline: 'none',
            }}
          />
        </Box>

        {loading && <CircularProgress sx={{ mx: 'auto', display: 'block', my: 4 }} size={32} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && allParticipants.length === 0 && !error && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.bg }}>
            <Typography>No participants found.</Typography>
          </Paper>
        )}

        {!loading && allParticipants.length > 0 && (
          <Stack spacing={0.5}>
            {allParticipants.map((p) => (
              <Box
                key={`${p.registration_id || 'v'}-${p.user_id || p.display_name}`}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  p: '14px 16px', borderRadius: 1.5, transition: 'all 0.15s',
                  '&:hover': { bgcolor: COLORS.bg, border: '1px solid #E8E4DF' },
                }}
              >
                <Avatar
                  src={p.avatar_url}
                  sx={{
                    width: 48, height: 48, borderRadius: 1.5,
                    background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                    fontWeight: 700, fontSize: 15, color: '#fff',
                  }}
                >
                  {p.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 640, color: COLORS.dark }}>
                      {p.display_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {p.badge_key && p.badge_key !== 'attendee' && (
                        <Chip
                          label={p.badge_label}
                          size="small"
                          sx={{
                            height: 18, fontSize: '0.65rem', fontWeight: 750,
                            backgroundColor: ROLE_CHIP_COLORS[p.badge_key]?.backgroundColor,
                            color: ROLE_CHIP_COLORS[p.badge_key]?.color,
                          }}
                        />
                      )}
                      {(p.badge_labels || []).map(badge => (
                        <Chip
                          key={badge.id}
                          label={badge.name}
                          size="small"
                          sx={{
                            height: 18, fontSize: '0.65rem', fontWeight: 700,
                            backgroundColor: badge.color + '22',
                            color: badge.color,
                            border: `1px solid ${badge.color}66`,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#888' }}>
                    {[p.job_title, p.company].filter(Boolean).join(' – ')}
                  </Typography>
                </Box>

                <Tooltip
                  title={
                    !networkingSettings?.enabled
                      ? '1:1 meetings not enabled'
                      : currentUserId === p.user_id
                      ? 'Cannot request meeting with yourself'
                      : 'Request a 1:1 meeting'
                  }
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CoffeeIcon />}
                      disabled={!networkingSettings?.enabled || currentUserId === p.user_id}
                      onClick={() => onRequestMeeting(p)}
                      sx={{
                        borderColor: COLORS.teal,
                        color: COLORS.teal,
                        textTransform: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        px: 1.5,
                        py: 0.75,
                        '&:hover': {
                          borderColor: COLORS.teal,
                          bgcolor: COLORS.teal + '08',
                        },
                        '&:disabled': {
                          borderColor: '#ccc',
                          color: '#ccc',
                        },
                      }}
                    >
                      Request 1:1
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function MobileView({
  allParticipants,
  loading,
  error,
  searchQuery,
  onSearchChange,
  networkingSettings,
  currentUserId,
  onRequestMeeting,
}) {
  return (
    <Box sx={{
      width: '100%', maxWidth: '100%',
      borderRadius: 0, overflow: 'hidden',
      bgcolor: COLORS.bg, display: 'flex', flexDirection: 'column',
      minHeight: '100vh',
    }}>

        <Box sx={{
          p: '12px 16px', bgcolor: '#fff', borderBottom: '1px solid #F0EEEB',
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}>
          <Typography sx={{ fontSize: 16, fontWeight: 720, color: COLORS.dark }}>
            People
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: '12px' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            p: '10px 14px', borderRadius: 1.25, bgcolor: '#fff',
            border: '1px solid #ECEAE6', mb: 1.25,
          }}>
            <SearchIcon sx={{ color: '#BBB', fontSize: 15 }} />
            <input
              type="text"
              placeholder="Search attendees..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                color: '#333',
                outline: 'none',
              }}
            />
          </Box>

          {loading && <CircularProgress sx={{ mx: 'auto', display: 'block', my: 4 }} size={32} />}
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {!loading && allParticipants.length === 0 && !error && (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#fff' }}>
              <Typography>No participants found.</Typography>
            </Paper>
          )}

          {!loading && allParticipants.length > 0 && (
            <Stack spacing={0.5}>
              {allParticipants.map((p) => (
                <Box
                  key={`${p.registration_id || 'v'}-${p.user_id}`}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    p: 1.5, borderRadius: 1.5, bgcolor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <Avatar
                    src={p.avatar_url}
                    sx={{
                      width: 42, height: 42, borderRadius: 1.4,
                      background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                      fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
                    }}
                  >
                    {p.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.dark }}>
                        {p.display_name}
                      </Typography>
                      {p.badge_key && p.badge_key !== 'attendee' && (
                        <Chip
                          label={p.badge_label}
                          size="small"
                          sx={{
                            height: 16, fontSize: '0.6rem', fontWeight: 750,
                            backgroundColor: ROLE_CHIP_COLORS[p.badge_key]?.backgroundColor,
                            color: ROLE_CHIP_COLORS[p.badge_key]?.color,
                          }}
                        />
                      )}
                      {(p.badge_labels || []).map(badge => (
                        <Chip
                          key={badge.id}
                          label={badge.name}
                          size="small"
                          sx={{
                            height: 16, fontSize: '0.6rem', fontWeight: 700,
                            backgroundColor: badge.color + '22',
                            color: badge.color,
                            border: `1px solid ${badge.color}66`,
                          }}
                        />
                      ))}
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: '#999' }}>
                      {[p.job_title, p.company].filter(Boolean).join(' – ')}
                    </Typography>
                  </Box>
                  <Tooltip
                    title={
                      !networkingSettings?.enabled
                        ? '1:1 meetings not enabled'
                        : currentUserId === p.user_id
                        ? 'Cannot request meeting with yourself'
                        : 'Request a 1:1 meeting'
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CoffeeIcon />}
                        disabled={!networkingSettings?.enabled || currentUserId === p.user_id}
                        onClick={() => onRequestMeeting(p)}
                        sx={{
                          borderColor: COLORS.teal,
                          color: COLORS.teal,
                          textTransform: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          px: 1,
                          py: 0.5,
                          flexShrink: 0,
                          '&:hover': {
                            borderColor: COLORS.teal,
                            bgcolor: COLORS.teal + '08',
                          },
                          '&:disabled': {
                            borderColor: '#ccc',
                            color: '#ccc',
                          },
                        }}
                      >
                        Request 1:1
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
  );
}

function EventCompanionDirectoryPage() {
  const { slug } = useParams();
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [event, setEvent] = useState(null);
  const [allParticipants, setAllParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [networkingSettings, setNetworkingSettings] = useState(null);
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Directory, 1: My Meetings, 2: Schedule
  const [highlightedMeetingId, setHighlightedMeetingId] = useState(null);
  const [scheduleAvailable, setScheduleAvailable] = useState(false);
  const debounceTimer = useRef(null);

  // Handle tab and meeting query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const meetingId = params.get('meeting');

    if (tab === 'meetings') {
      setActiveTab(1);
    }
    if (meetingId) {
      setHighlightedMeetingId(parseInt(meetingId));
    }
  }, [location.search]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${slug}/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to load event');
        const data = await res.json();
        setEvent(data);
      } catch (err) {
        setError(err.message);
        // Set a default event on error so title still displays
        setEvent({ title: 'Event Conference', slug: slug });
      }
    };
    if (slug) {
      // Set default event immediately while fetching
      setEvent({ title: 'Event Conference', slug: slug });
      fetchEvent();
    }
  }, [slug, token]);

  // Get current user info and networking settings
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE}/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          const firstName = user.first_name || '';
          const lastName = user.last_name || '';
          const initials = (firstName[0] + lastName[0]).toUpperCase();
          setUserInitials(initials);
          setCurrentUserId(user.id);
        }
      } catch (err) {
        // Fallback to empty string if API not available
        setUserInitials('');
      }
    };
    fetchCurrentUser();
  }, [token]);

  // Fetch networking settings
  useEffect(() => {
    if (!event?.id) return;

    const fetchNetworkingSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${event.id}/networking-settings/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const settings = await res.json();
          setNetworkingSettings(settings);
        } else {
          // If 404 or other error, networking not configured
          setNetworkingSettings(null);
        }
      } catch (err) {
        // Silently fail - networking is optional
        setNetworkingSettings(null);
      }
    };

    fetchNetworkingSettings();
  }, [event?.id, token]);

  useEffect(() => {
    if (!event?.id || !token) return;

    const checkSchedule = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${event.id}/schedule/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          setScheduleAvailable(false);
          return;
        }
        const data = await res.json();
        setScheduleAvailable(data.days && data.days.some(d => d.sessions && d.sessions.length > 0));
      } catch (err) {
        setScheduleAvailable(false);
      }
    };

    checkSchedule();
  }, [event?.id, token]);

  useEffect(() => {
    if (!event?.id) return;

    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);

        const res = await fetch(
          `${API_BASE}/events/${event.id}/companion-directory/?${params.toString()}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || 'Access denied.');
        }
        if (!res.ok) throw new Error('Failed to load directory');

        const data = await res.json();
        setAllParticipants(data.participants || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchDirectory, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [event?.id, token, searchQuery]);

  if (!event && loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !event) {
    return <Alert severity="error">{error}</Alert>;
  }

  const handleRequestMeeting = (attendee) => {
    setSelectedAttendee(attendee);
    setModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>{event?.title || 'Event'} - Participant Directory</title>
      </Helmet>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: COLORS.bg,
      }}>
        {/* Tab Navigation */}
        {networkingSettings?.enabled && (
          <Box sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid #F0EEEB',
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 2 : 3,
          }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: COLORS.teal, height: 3 },
              }}
            >
              <Tab
                label="Directory"
                sx={{
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTab === 0 ? COLORS.teal : '#999',
                  minHeight: 50,
                }}
              />
              <Tab
                label="My Meetings"
                sx={{
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: activeTab === 1 ? COLORS.teal : '#999',
                  minHeight: 50,
                }}
              />
              {scheduleAvailable && (
                <Tab
                  label="Schedule"
                  sx={{
                    textTransform: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: activeTab === 2 ? COLORS.teal : '#999',
                    minHeight: 50,
                  }}
                />
              )}
            </Tabs>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: isMobile ? 2 : 0 }}>
          {activeTab === 0 ? (
            isMobile ? (
              <MobileView
                allParticipants={allParticipants}
                loading={loading}
                error={error}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                networkingSettings={networkingSettings}
                currentUserId={currentUserId}
                onRequestMeeting={handleRequestMeeting}
              />
            ) : (
              <DesktopView
                event={event}
                allParticipants={allParticipants}
                loading={loading}
                error={error}
                userInitials={userInitials}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                networkingSettings={networkingSettings}
                currentUserId={currentUserId}
                onRequestMeeting={handleRequestMeeting}
              />
            )
          ) : activeTab === 1 ? (
            <MyMeetingsView
              eventId={event?.id}
              currentUserId={currentUserId}
              networkingSettings={networkingSettings}
              isMobile={isMobile}
            />
          ) : (
            <ScheduleTab
              eventId={event?.id}
              token={token}
              isMobile={isMobile}
              currentUserId={currentUserId}
            />
          )}
        </Box>
      </Box>

      {/* Meeting Request Modal */}
      {selectedAttendee && event && (
        <NetworkingMeetingRequestModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedAttendee(null);
          }}
          attendee={selectedAttendee}
          eventId={event.id}
          networkingSettings={networkingSettings}
          currentUser={{ id: currentUserId }}
        />
      )}
    </>
  );
}

export default EventCompanionDirectoryPage;
