import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

const getToken = () =>
  localStorage.getItem('access_token') || localStorage.getItem('access') || '';

function EventCompanionGuard({ children }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRegistration();
  }, [slug]);

  const checkRegistration = async () => {
    setLoading(true);

    try {
      const token = getToken();
      if (!token) {
        // Should not happen as RequireAuth handles this, but just in case
        navigate(`/events/${slug}/companion/access`);
        return;
      }

      // Authenticated users can access companion directory without registration
      setIsRegistered(true);
    } catch (err) {
      // On error, redirect to access page for proper error handling
      navigate(`/events/${slug}/companion/access`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isRegistered) {
    return null; // Will be redirected
  }

  return <>{children}</>;
}

export default EventCompanionGuard;
