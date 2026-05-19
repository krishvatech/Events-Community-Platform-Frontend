import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
  Stack,
  Alert,
  Paper,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LoginIcon from '@mui/icons-material/Login';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventCompanionDirectoryPage from './EventCompanionDirectoryPage';

dayjs.extend(utc);
dayjs.extend(timezone);

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const getToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('access') || '';

function EventCompanionAccessPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [event, setEvent] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null); // pending, approved, declined, registered
  const [registering, setRegistering] = useState(false);
  const [userData, setUserData] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [processingInvite, setProcessingInvite] = useState(false);
  const [isEventManager, setIsEventManager] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [eventStarted, setEventStarted] = useState(false);

  useEffect(() => {
    // Extract invite_token from URL and call checkAccess with it
    const params = new URLSearchParams(location.search);
    const token = params.get('invite_token');
    setInviteToken(token || null);
    // Note: checkAccess will use the token from location.search directly, not from state
    checkAccess(token);
  }, [slug, location]);

  const checkAccess = async (inviteTokenParam = null) => {
    setLoading(true);
    setError('');

    try {
      // Get event details
      const eventRes = await fetch(`${API_BASE}/events/?slug=${slug}`);
      if (!eventRes.ok) throw new Error('Event not found');

      const eventData = await eventRes.json();
      const eventItem = Array.isArray(eventData) ? eventData[0] : eventData.results?.[0];
      if (!eventItem) throw new Error('Event not found');

      setEvent(eventItem);

      // Check if user is authenticated
      const token = getToken();
      if (!token) {
        // Redirect to login page, preserving invite_token if present
        const nextUrl = inviteTokenParam
          ? `/events/${slug}/companion?invite_token=${inviteTokenParam}`
          : `/events/${slug}/companion`;
        navigate(`/signin?next=${encodeURIComponent(nextUrl)}`);
        return;
      }

      // Get current user
      const userRes = await fetch(`${API_BASE}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('access');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const user = await userRes.json();
      setUserData(user);
      setIsAuthenticated(true);

      // If we have an invite token, process it first
      if (inviteTokenParam) {
        setProcessingInvite(true);
        try {
          const acceptRes = await fetch(
            `${API_BASE}/events/${eventItem.id}/invite-emails/accept/`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ token: inviteTokenParam }),
            }
          );

          if (acceptRes.ok) {
            const acceptData = await acceptRes.json();
            setIsRegistered(true);
            setRegistrationStatus(acceptData.registration_status || 'registered');
            setProcessingInvite(false);
            setLoading(false);
            return; // Skip the rest, we're done
          } else {
            // Token is invalid or expired, but don't error - just continue with normal flow
            setProcessingInvite(false);
          }
        } catch (err) {
          console.error('Failed to process invite token:', err);
          setProcessingInvite(false);
        }
      }

      // Check registration first (for all events, regardless of type)
      const regRes = await fetch(
        `${API_BASE}/event-registrations/?event=${eventItem.id}&user=${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let hasRegistration = false;
      if (regRes.ok) {
        const regData = await regRes.json();
        const registrations = Array.isArray(regData) ? regData : regData.results || [];

        if (registrations.length > 0) {
          const reg = registrations[0];
          if (reg.status === 'registered') {
            // User is registered - grant access immediately
            setIsRegistered(true);
            setRegistrationStatus('registered');
            hasRegistration = true;
          }
        }
      }

      // If not registered, check application status (only for 'apply' type events)
      if (!hasRegistration && eventItem.registration_type === 'apply') {
        const appRes = await fetch(
          `${API_BASE}/events/${eventItem.id}/apply/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (appRes.ok) {
          const appData = await appRes.json();
          // Backend returns {"status":"none"} if no application exists
          if (appData && appData.status && appData.status !== 'none') {
            setIsRegistered(true);
            // Get application status (pending, approved, declined)
            setRegistrationStatus(appData.status);
          } else {
            // No application exists yet
            setIsRegistered(false);
            setRegistrationStatus(null);
          }
        } else {
          setIsRegistered(false);
          setRegistrationStatus(null);
        }
      } else if (!hasRegistration) {
        // For 'open' type events without registration
        setIsRegistered(false);
        setRegistrationStatus(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to check access');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    const nextUrl = inviteToken
      ? `/events/${slug}/companion?invite_token=${inviteToken}`
      : `/events/${slug}/companion`;
    navigate(`/signin?next=${encodeURIComponent(nextUrl)}`);
  };

  const handleSignupClick = () => {
    const nextUrl = inviteToken
      ? `/events/${slug}/companion?invite_token=${inviteToken}`
      : `/events/${slug}/companion`;
    navigate(`/signup?next=${encodeURIComponent(nextUrl)}`);
  };

  // Helper function to format event start time for display
  const formatEventStartTime = (isoDateTime) => {
    try {
      const date = new Date(isoDateTime);
      if (isNaN(date.getTime())) return '';

      // Use Intl.DateTimeFormat for proper localization
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const parts = formatter.formatToParts(date);
      const formatted = formatter.format(date);

      return formatted;
    } catch (error) {
      console.error("Error formatting date:", error);
      return '';
    }
  };

  // Helper function to calculate countdown safely
  const calculateCountdown = (eventStartTime) => {
    try {
      console.log("event.start_time", eventStartTime);
      const startDate = new Date(eventStartTime);
      console.log("parsed start", startDate);
      console.log("now", new Date());

      // Check if date is valid
      if (isNaN(startDate.getTime())) {
        console.error("Invalid date:", eventStartTime);
        return null;
      }

      const now = Date.now();
      const startMs = startDate.getTime();
      console.log("diff", startMs - now);

      const diffMs = startMs - now;

      // If already started, return null
      if (diffMs <= 0) {
        return null;
      }

      // Calculate days, hours, minutes, seconds
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400); // 86400 seconds in a day
      const hours = Math.floor((totalSeconds % 86400) / 3600); // 3600 seconds in an hour
      const minutes = Math.floor((totalSeconds % 3600) / 60); // 60 seconds in a minute
      const seconds = totalSeconds % 60;

      return { days, hours, minutes, seconds };
    } catch (error) {
      console.error("Error calculating countdown:", error);
      return null;
    }
  };

  // Check if event has started and update countdown
  useEffect(() => {
    if (!event || !event.start_time) return;

    // Calculate immediately on mount
    const result = calculateCountdown(event.start_time);
    if (result === null) {
      // Event has already started
      setEventStarted(true);
    } else {
      setCountdown(result);
    }

    // Update countdown every second
    const timer = setInterval(() => {
      const result = calculateCountdown(event.start_time);
      if (result === null) {
        // Event has started, refresh to show directory
        setEventStarted(true);
        clearInterval(timer);
        // Re-check access to switch from countdown to directory
        checkAccess();
      } else {
        setCountdown(result);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event?.start_time]);

  // Check if user is event manager
  useEffect(() => {
    if (userData && event && userData.id === event.created_by_id) {
      setIsEventManager(true);
    } else {
      setIsEventManager(false);
    }
  }, [userData, event]);

  const handleRegisterClick = async () => {
    if (!event || !userData) return;

    setRegistering(true);
    setError('');

    try {
      const token = getToken();
      // Use /apply/ endpoint for application-required events, /register/ for open events
      const endpoint = event.registration_type === 'apply' ? 'apply' : 'register';

      const payload = {
        event: event.id,
      };

      // For 'apply' type events, include user data in application
      if (event.registration_type === 'apply' && userData) {
        payload.email = userData.email || '';
        payload.first_name = userData.first_name || '';
        payload.last_name = userData.last_name || '';
        payload.job_title = userData.profile?.job_title || '';
        payload.company_name = userData.profile?.company || '';
      }

      const res = await fetch(`${API_BASE}/events/${event.id}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || 'Registration failed');
      }

      const regData = await res.json();
      console.log('Registration response:', regData);

      // For application-required events, status will be 'pending'
      // For open registration, status will be 'registered'
      const status = regData.status || (event.registration_type === 'apply' ? 'pending' : 'registered');

      setIsRegistered(true);
      setRegistrationStatus(status);

      // Re-check access to ensure the page updates correctly
      // This is especially important for open registration which should immediately show the directory
      setTimeout(() => {
        checkAccess();
      }, 500);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading || processingInvite) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column' }}>
        <CircularProgress />
        {processingInvite && (
          <Typography sx={{ mt: 2 }}>Processing invite...</Typography>
        )}
      </Box>
    );
  }

  if (error && !event) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Container>
    );
  }

  // If event hasn't started yet and user is not an event manager, show countdown
  if (isAuthenticated && isRegistered && (registrationStatus === 'approved' || registrationStatus === 'registered') && event && !eventStarted && !isEventManager) {
    return (
      <>
        <Helmet>
          <title>Event Countdown - {event?.title || 'Event'}</title>
        </Helmet>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
            p: 2,
          }}
        >
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <EventNoteIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1B2A4A' }}>
                  Get Ready!
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, color: '#333' }}>
                  {event.title}
                </Typography>
              </Box>

              <Stack spacing={3}>
                <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                    Participant Directory opens when the event starts
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    Get ready to connect with attendees, view the participant directory, and request 1:1 networking meetings!
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#666' }}>
                    Event starts on
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#1B2A4A' }}>
                    {formatEventStartTime(event.start_time)}
                  </Typography>

                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#666' }}>
                    Time remaining
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 1.5,
                      mb: 3,
                    }}
                  >
                    {[
                      { label: 'Days', value: countdown.days },
                      { label: 'Hours', value: countdown.hours },
                      { label: 'Minutes', value: countdown.minutes },
                      { label: 'Seconds', value: countdown.seconds },
                    ].map((item) => (
                      <Box
                        key={item.label}
                        sx={{
                          p: 2,
                          bgcolor: '#fff3e0',
                          borderRadius: 1,
                          textAlign: 'center',
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            color: '#FF9800',
                            mb: 0.5,
                          }}
                        >
                          {String(item.value).padStart(2, '0')}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: '#666',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(`/events/${slug}`)}
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Back to Event
                </Button>
              </Stack>
            </Paper>
          </Container>
        </Box>
      </>
    );
  }

  // If authenticated and registered, show the directory
  // For 'open' registration: status will be 'registered'
  // For 'apply' registration: status will be 'approved'
  // Event managers can also preview before event start
  if (isAuthenticated && isRegistered && (registrationStatus === 'approved' || registrationStatus === 'registered')) {
    return <EventCompanionDirectoryPage />;
  }

  // If authenticated and registered but application is pending, show pending message
  if (isAuthenticated && isRegistered && (registrationStatus === 'pending' || registrationStatus === 'submitted') && event && userData) {
    return (
      <>
        <Helmet>
          <title>Application Pending - {event?.title || 'Event'}</title>
        </Helmet>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
            p: 2,
          }}
        >
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <EventNoteIcon sx={{ fontSize: 48, color: '#FF9800', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1B2A4A' }}>
                  Application Under Review
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, color: '#333' }}>
                  {event.title}
                </Typography>
              </Box>

              <Stack spacing={3}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#FF9800' }}>
                    Your application is pending
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    Thank you for applying! Your application for the Event Companion is being reviewed by the event organizer. You'll be notified once it's approved.
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ textAlign: 'center', color: '#666' }}>
                  Please check back soon or wait for an email notification.
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Box>
      </>
    );
  }

  // If authenticated and registered but application is declined, show declined message
  if (isAuthenticated && isRegistered && registrationStatus === 'declined' && event && userData) {
    return (
      <>
        <Helmet>
          <title>Application Declined - {event?.title || 'Event'}</title>
        </Helmet>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
            p: 2,
          }}
        >
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <EventNoteIcon sx={{ fontSize: 48, color: '#F44336', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1B2A4A' }}>
                  Application Declined
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, color: '#333' }}>
                  {event.title}
                </Typography>
              </Box>

              <Stack spacing={3}>
                <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#F44336' }}>
                    Your application was not approved
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    Unfortunately, your application for the Event Companion was declined by the event organizer.
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ textAlign: 'center', color: '#666' }}>
                  If you have questions, please contact the event organizers.
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Box>
      </>
    );
  }

  // If authenticated but not registered, show registration prompt
  if (isAuthenticated && !isRegistered && event && userData) {
    return (
      <>
        <Helmet>
          <title>Register for Event - {event?.title || 'Event'}</title>
        </Helmet>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
            p: 2,
          }}
        >
          <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <EventNoteIcon sx={{ fontSize: 48, color: '#E8532F', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1B2A4A' }}>
                  Event Companion
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, color: '#333' }}>
                  {event.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Connect with attendees, join networking meetings, and stay updated
                </Typography>
              </Box>

              {/* Error Alert */}
              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              {/* Registration Section */}
              <Stack spacing={3}>
                <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                    Welcome back, {userData.first_name || userData.username}!
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#333' }}>
                    {event.registration_type === 'apply'
                      ? 'To access the Event Companion, you need to submit an application. The event organizer will review and approve your application.'
                      : 'To access the Event Companion, you need to register for this event first.'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleRegisterClick}
                  disabled={registering}
                  sx={{
                    bgcolor: '#E8532F',
                    '&:hover': { bgcolor: '#D64020' },
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {registering ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      {event.registration_type === 'apply' ? 'Submitting...' : 'Registering...'}
                    </>
                  ) : (
                    <>
                      <HowToRegIcon sx={{ mr: 1 }} />
                      {event.registration_type === 'apply' ? 'Submit Application' : 'Register for Event'}
                    </>
                  )}
                </Button>

                <Typography variant="caption" sx={{ textAlign: 'center', color: '#666' }}>
                  {event.registration_type === 'apply'
                    ? 'Your application will be reviewed by the event organizer.'
                    : 'Registration is free. You\'ll be able to access the Event Companion immediately after.'}
                </Typography>
              </Stack>
            </Paper>

            {/* Info Footer */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#999' }}>
                For issues or questions, contact event organizers
              </Typography>
            </Box>
          </Container>
        </Box>
      </>
    );
  }
}

export default EventCompanionAccessPage;
