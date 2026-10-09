import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '#navigation';
import { CircularProgress, Alert, Chip } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import { API_BASE, authConfig, getToken } from '../utils/api';
import { EmptyState } from '../components/page';

const PublicSeriesLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSeries();
  }, [slug]);

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/series/public/${slug}/`,
        { headers: authConfig().headers }
      );

      if (!response.ok) {
        setError('Series not found');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setSeries(data);
      setEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching series:', err);
      setError('Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterForSeries = async () => {
    if (series?.is_registered) {
      return;
    }

    if (!getToken()) {
      navigate('/signin');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/register/`,
        {
          method: 'POST',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        setSeries((prev) => prev ? {
          ...prev,
          is_registered: true,
          registrations_count: prev.is_registered
            ? prev.registrations_count
            : Number(prev.registrations_count || 0) + 1,
        } : prev);
        setSuccess('Successfully registered for series!');
        setTimeout(() => navigate('/'), 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to register for series');
      }
    } catch (err) {
      console.error('Error registering:', err);
      setError('Failed to register for series');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelSeriesRegistration = async () => {
    if (!series || series.registration_mode !== 'full_series_only') {
      return;
    }

    if (!getToken()) {
      navigate('/signin');
      return;
    }

    if (!window.confirm(`Cancel your registration for "${series.title}"?`)) {
      return;
    }

    setCancelling(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/unregister/`,
        {
          method: 'POST',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        setSeries((prev) => prev ? {
          ...prev,
          is_registered: false,
          registrations_count: prev.is_registered
            ? Math.max(0, Number(prev.registrations_count || 0) - 1)
            : prev.registrations_count,
        } : prev);
        setSuccess('Series registration cancelled.');
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.detail || data.error || 'Failed to cancel series registration');
      }
    } catch (err) {
      console.error('Error cancelling series registration:', err);
      setError('Failed to cancel series registration');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-imaa-member">
        <CircularProgress />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-imaa-member flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <Alert severity="error" className="mb-4">{error || 'Series not found'}</Alert>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-imaa-teal-dark hover:brightness-90 text-white font-semibold py-3 rounded-lg transition"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const isSeriesRegistered = series?.is_registered === true;
  // The creator/admin is auto-registered in their own series and should not be
  // able to cancel that registration. is_owner comes from the backend (covers
  // the creator and superusers), so this is not a frontend-only role check.
  const isSeriesOwner = series?.is_owner === true;
  const canCancelSeriesRegistration =
    isSeriesRegistered &&
    series?.registration_mode === 'full_series_only' &&
    !isSeriesOwner;

  return (
    <div className="min-h-screen bg-imaa-member">
      {error && (
        <div className="sticky top-0 z-40 bg-red-50 border-b border-red-200 p-4">
          <div className="max-w-7xl mx-auto">
            <Alert severity="error">{error}</Alert>
          </div>
        </div>
      )}
      {success && (
        <div className="sticky top-0 z-40 bg-green-50 border-b border-green-200 p-4">
          <div className="max-w-7xl mx-auto">
            <Alert severity="success">{success}</Alert>
          </div>
        </div>
      )}

      {/* Hero Section with Cover Image */}
      {series.cover_image && (
        <div className="relative h-64 sm:h-96 bg-imaa-navy overflow-hidden">
          <img
            src={series.cover_image}
            alt={series.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-imaa-navy/60 via-imaa-navy/30 to-transparent" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className={`${series.cover_image ? '-mt-24 relative z-10' : ''} mb-12`}>
          <div className={`${series.cover_image ? 'bg-white rounded-lg border border-imaa-border shadow-imaa-md p-5 sm:p-8' : ''}`}>
            {/* Status Badge */}
            <div className="mb-4">
              <Chip
                label={series.status === 'published' ? 'PUBLISHED' : series.status.toUpperCase()}
                color={series.status === 'published' ? 'success' : 'default'}
                sx={{ fontWeight: 600, height: 28 }}
              />
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-imaa-ink mb-4 leading-tight break-words">
              {series.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6 text-imaa-body">
              <div className="flex items-center gap-2">
                <CalendarMonthIcon className="text-imaa-teal" />
                <span className="font-medium">{events.length} {events.length === 1 ? 'Event' : 'Events'}</span>
              </div>
              <div className="flex items-center gap-2">
                <GroupsIcon className="text-imaa-teal" />
                <span className="font-medium">{series.registrations_count || 0} Registered</span>
              </div>
              <div className="font-medium">
                {series.is_free || !series.price ? (
                  <span className="text-imaa-teal-dark font-semibold">Free</span>
                ) : (
                  <span className="text-imaa-teal-dark font-semibold">${series.price}</span>
                )}
              </div>
            </div>

            {/* Description */}
            {series.description && (
              <p className="text-lg text-imaa-body mb-8 leading-relaxed max-w-3xl">
                {series.description}
              </p>
            )}

            {/* CTA Button */}
            <div className="flex gap-3 flex-wrap">
              {/* Registered users (including the auto-registered creator/admin)
                  do not see "Register for Series". Decision is based on
                  is_registered, never on a frontend admin role. */}
              {!isSeriesRegistered && (
                <button
                  onClick={handleRegisterForSeries}
                  disabled={registering}
                  className="rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed bg-imaa-teal-dark hover:brightness-90 text-white font-semibold py-3 px-8 transition text-lg"
                >
                  {registering ? 'Registering...' : 'Register for Series'}
                </button>
              )}
              {/* Preserve existing cancel ability for full-series registrations. */}
              {canCancelSeriesRegistration && (
                <button
                  onClick={handleCancelSeriesRegistration}
                  disabled={cancelling}
                  className="rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 transition-colors text-lg"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Registration'}
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="rounded-lg border-2 border-imaa-teal-dark text-imaa-teal-dark hover:bg-[var(--imaa-teal-light)] font-semibold py-3 px-8 transition-colors text-lg"
              >
                Back to Events
              </button>
            </div>
            {/* Under "Back to Events": confirm the user is already registered. */}
            {isSeriesRegistered && (
              <p className="mt-3 text-imaa-teal-dark font-medium">
                You are already registered for this Series
              </p>
            )}
          </div>
        </div>

        {/* Series Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-lg border border-imaa-border bg-white shadow-imaa-sm p-5 sm:p-6">
            <p className="text-sm font-semibold text-imaa-body uppercase mb-2">Visibility</p>
            <p className="text-lg font-semibold text-imaa-ink capitalize">{series.visibility}</p>
          </div>
          <div className="rounded-lg border border-imaa-border bg-white shadow-imaa-sm p-5 sm:p-6">
            <p className="text-sm font-semibold text-imaa-body uppercase mb-2">Registration Mode</p>
            <p className="text-lg font-semibold text-imaa-ink capitalize">
              {series.registration_mode?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="rounded-lg border border-imaa-border bg-white shadow-imaa-sm p-5 sm:p-6">
            <p className="text-sm font-semibold text-imaa-body uppercase mb-2">Price</p>
            <p className="text-lg font-semibold text-imaa-teal-dark">
              {series.is_free || !series.price ? 'Free' : `$${series.price}`}
            </p>
          </div>
        </div>

        {/* Events Section */}
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-imaa-ink mb-6 sm:mb-8">Events in this Series</h2>

          {events.length === 0 ? (
            <EmptyState titleComponent="h3" title="No events added to this series yet" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {events
                .sort((a, b) => (a.series_order || 0) - (b.series_order || 0))
                .map((event, idx) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-imaa-border bg-white shadow-imaa-sm p-5 sm:p-6 hover:shadow-imaa-md transition-shadow"
                >
                  {/* Event Order Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--imaa-teal-light)]" aria-hidden="true">
                      <span className="text-sm font-bold text-imaa-teal-dark">{event.series_order || idx + 1}</span>
                    </div>
                    <span className="text-xs font-semibold text-imaa-body uppercase">
                      Session {event.series_order || idx + 1}
                    </span>
                  </div>

                  {/* Event Title and Label */}
                  <div className="mb-4">
                    {event.series_session_label && (
                      <p className="text-sm font-semibold text-imaa-teal-dark mb-1">
                        {event.series_session_label}
                      </p>
                    )}
                    <h3 className="font-serif text-xl font-bold text-imaa-ink break-words">{event.title}</h3>
                  </div>

                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 pb-4 border-b border-imaa-border">
                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <CalendarMonthIcon className="text-imaa-teal mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-imaa-body font-semibold uppercase mb-1">Date</p>
                        <p className="text-sm font-semibold text-imaa-ink">
                          {event.start_time
                            ? new Date(event.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-start gap-3">
                      <AccessTimeIcon className="text-imaa-teal mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-imaa-body font-semibold uppercase mb-1">Time</p>
                        <p className="text-sm font-semibold text-imaa-ink">
                          {event.start_time
                            ? new Date(event.start_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Registrations */}
                    <div className="flex items-start gap-3">
                      <GroupsIcon className="text-imaa-teal mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-imaa-body font-semibold uppercase mb-1">Registered</p>
                        <p className="text-sm font-semibold text-imaa-ink">
                          {event.registrations_count || 0} {event.registrations_count === 1 ? 'person' : 'people'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Link */}
                  <button
                    onClick={() => navigate(`/events/${event.slug || event.id}`)}
                    aria-label={`View Event Details: ${event.title}`}
                    className="text-imaa-teal-dark hover:text-imaa-ink font-semibold text-sm transition-colors"
                  >
                    View Event Details <span aria-hidden="true">→</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicSeriesLanding;
