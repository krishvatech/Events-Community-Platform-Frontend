import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
  Paper,
  Avatar,
  Chip,
  Grid,
  Container,
  useMediaQuery,
  useTheme,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const COLORS = {
  primary: '#E8532F',
  dark: '#1B2A4A',
  bg: '#F7F5F2',
};

function ParticipantDirectoryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [badgeLabels, setBadgeLabels] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;

  useEffect(() => {
    fetchDirectory();
  }, [eventId, searchQuery, selectedBadge]);

  const fetchDirectory = async (newOffset = 0) => {
    setLoading(newOffset === 0);
    if (newOffset > 0) setLoadingMore(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: LIMIT,
        offset: newOffset,
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedBadge) {
        params.append('badge', selectedBadge);
      }

      const res = await fetch(`${API_BASE}/events/${eventId}/participants/directory/?${params}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        if (!data.available) {
          setError(data.detail || 'Participant directory not available for this event');
          setLoading(false);
          return;
        }

        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (newOffset === 0) {
        setParticipants(data.results || []);
        setEvent(data.event);
        setBadgeLabels(data.event?.badge_labels || []);
      } else {
        setParticipants(prev => [...prev, ...(data.results || [])]);
      }

      setTotalCount(data.count || 0);
      setHasMore(data.next || false);
      setOffset(newOffset + LIMIT);
    } catch (err) {
      if (newOffset === 0) {
        setError(err.message || 'Failed to load participants');
      } else {
        toast.error('Failed to load more participants');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setOffset(0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setOffset(0);
  };

  const handleBadgeFilter = (badgeId) => {
    setSelectedBadge(selectedBadge === badgeId ? null : badgeId);
    setOffset(0);
  };

  const handleLoadMore = () => {
    fetchDirectory(offset);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Participant Directory - {event?.title || 'Event'}</title>
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 6 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.dark, mb: 1 }}>
            Participant Directory
          </Typography>
          {event && (
            <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
              {event.title} · {totalCount} {totalCount === 1 ? 'participant' : 'participants'}
            </Typography>
          )}

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search by name, company, or job title..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#999' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <ClearIcon
                    sx={{ cursor: 'pointer', color: '#999' }}
                    onClick={handleClearSearch}
                  />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Badge Filters */}
          {badgeLabels.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              {badgeLabels.map((badge) => (
                <Chip
                  key={badge.id}
                  label={badge.name}
                  onClick={() => handleBadgeFilter(badge.id)}
                  variant={selectedBadge === badge.id ? 'filled' : 'outlined'}
                  sx={{
                    bgcolor: selectedBadge === badge.id ? badge.color : 'transparent',
                    borderColor: badge.color,
                    color: selectedBadge === badge.id ? '#fff' : badge.color,
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: selectedBadge === badge.id ? badge.color : badge.color + '22',
                    },
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Participants Grid */}
        {participants.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.bg }}>
            <Typography sx={{ color: '#666' }}>
              No participants found. Try adjusting your search or filters.
            </Typography>
          </Paper>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {participants.map((participant) => (
                <Grid item xs={12} sm={6} md={4} key={participant.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid #E8E4DF',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    {/* Avatar and Name */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                      <Avatar
                        src={participant.avatar_url}
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          background: `linear-gradient(135deg, ${COLORS.dark}, #2C3E5A)`,
                          fontWeight: 700,
                          fontSize: 14,
                          color: '#fff',
                        }}
                      >
                        {participant.display_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: COLORS.dark,
                            mb: 0.25,
                            wordBreak: 'break-word',
                          }}
                        >
                          {participant.display_name}
                        </Typography>
                        {participant.job_title && (
                          <Typography sx={{ fontSize: 12, color: '#666', mb: 0.25 }}>
                            {participant.job_title}
                          </Typography>
                        )}
                        {participant.company && (
                          <Typography sx={{ fontSize: 12, color: '#999' }}>
                            {participant.company}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Badges */}
                    {participant.badges && participant.badges.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                        {participant.badges.map((badge) => (
                          <Chip
                            key={`${participant.id}-${badge.id}`}
                            label={badge.name}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: badge.color + '22',
                              color: badge.color,
                              border: `1px solid ${badge.color}66`,
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Load More Button */}
            {hasMore && (
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  sx={{
                    textTransform: 'none',
                    borderColor: COLORS.primary,
                    color: COLORS.primary,
                  }}
                >
                  {loadingMore ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Loading...
                    </>
                  ) : (
                    `Load More (${totalCount - participants.length} remaining)`
                  )}
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
}

export default ParticipantDirectoryPage;
