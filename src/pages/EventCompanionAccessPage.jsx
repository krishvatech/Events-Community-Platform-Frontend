import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import EventCompanionDirectoryPage from './EventCompanionDirectoryPage';

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
  const [registering, setRegistering] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    checkAccess();
  }, [slug]);

  const checkAccess = async () => {
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
        // Redirect to login page instead of showing access page
        const nextUrl = `/events/${slug}/companion`;
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
      setIsRegistered(true);
    } catch (err) {
      setError(err.message || 'Failed to check access');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    const nextUrl = `/events/${slug}/companion`;
    navigate(`/signin?next=${encodeURIComponent(nextUrl)}`);
  };

  const handleSignupClick = () => {
    const nextUrl = `/events/${slug}/companion`;
    navigate(`/signup?next=${encodeURIComponent(nextUrl)}`);
  };

  const handleRegisterClick = async () => {
    if (!event || !userData) return;

    setRegistering(true);
    setError('');

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/events/${event.id}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: event.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.error || 'Registration failed');
      }

      setIsRegistered(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
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

  // If authenticated and registered, show the directory
  if (isAuthenticated && isRegistered) {
    return <EventCompanionDirectoryPage />;
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
                    To access the Event Companion, you need to register for this event first.
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
                      Registering...
                    </>
                  ) : (
                    <>
                      <HowToRegIcon sx={{ mr: 1 }} />
                      Register for Event
                    </>
                  )}
                </Button>

                <Typography variant="caption" sx={{ textAlign: 'center', color: '#666' }}>
                  Registration is free. You'll be able to access the Event Companion immediately after.
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
