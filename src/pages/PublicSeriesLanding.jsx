import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Alert, Chip } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import { API_BASE, authConfig, getToken } from '../utils/api';

const PublicSeriesLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
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
    if (!getToken()) {
      navigate('/signin');
      return;
    }

    setRegistering(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/register/`,
        {
          method: 'POST',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-50">
        <CircularProgress />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <Alert severity="error" className="mb-4">{error || 'Series not found'}</Alert>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
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
        <div className="relative h-96 bg-gradient-to-br from-teal-600 to-teal-800 overflow-hidden">
          <img
            src={series.cover_image}
            alt={series.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className={`${series.cover_image ? '-mt-24 relative z-10' : ''} mb-12`}>
          <div className={`${series.cover_image ? 'bg-white rounded-lg shadow-lg p-8' : ''}`}>
            {/* Status Badge */}
            <div className="mb-4">
              <Chip
                label={series.status === 'published' ? 'PUBLISHED' : series.status.toUpperCase()}
                color={series.status === 'published' ? 'success' : 'default'}
                sx={{ fontWeight: 600, height: 28 }}
              />
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4 leading-tight">
              {series.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-6 mb-6 text-neutral-600">
              <div className="flex items-center gap-2">
                <CalendarMonthIcon className="text-teal-600" />
                <span className="font-medium">{events.length} {events.length === 1 ? 'Event' : 'Events'}</span>
              </div>
              <div className="flex items-center gap-2">
                <GroupsIcon className="text-teal-600" />
                <span className="font-medium">{series.registrations_count || 0} Registered</span>
              </div>
              <div className="font-medium">
                {series.is_free ? (
                  <span className="text-teal-600 font-semibold">Free</span>
                ) : (
                  <span className="text-teal-600 font-semibold">${series.price}</span>
                )}
              </div>
            </div>

            {/* Description */}
            {series.description && (
              <p className="text-lg text-neutral-700 mb-8 leading-relaxed max-w-3xl">
                {series.description}
              </p>
            )}

            {/* CTA Button */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleRegisterForSeries}
                disabled={registering}
                className="rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 transition-colors text-lg"
              >
                {registering ? 'Registering...' : 'Register for Series'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="rounded-lg border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold py-3 px-8 transition-colors text-lg"
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>

        {/* Series Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Visibility</h3>
            <p className="text-lg font-semibold text-neutral-900 capitalize">{series.visibility}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Registration Mode</h3>
            <p className="text-lg font-semibold text-neutral-900 capitalize">
              {series.registration_mode?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Price</h3>
            <p className="text-lg font-semibold text-teal-600">
              {series.is_free || !series.price ? 'Free' : `$${series.price}`}
            </p>
          </div>
        </div>

        {/* Events Section */}
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-8">Events in this Series</h2>

          {events.length === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <p className="text-neutral-700">No events added to this series yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {events
                .sort((a, b) => (a.series_order || 0) - (b.series_order || 0))
                .map((event, idx) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-neutral-200 bg-white p-6 hover:shadow-md transition-shadow"
                >
                  {/* Event Order Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-100">
                      <span className="text-sm font-bold text-teal-700">{event.series_order || idx + 1}</span>
                    </div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase">
                      Session {event.series_order || idx + 1}
                    </span>
                  </div>

                  {/* Event Title and Label */}
                  <div className="mb-4">
                    {event.series_session_label && (
                      <p className="text-sm font-semibold text-teal-600 mb-1">
                        {event.series_session_label}
                      </p>
                    )}
                    <h3 className="text-xl font-bold text-neutral-900">{event.title}</h3>
                  </div>

                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 pb-4 border-b border-neutral-100">
                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <CalendarMonthIcon className="text-teal-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500 font-semibold uppercase mb-1">Date</p>
                        <p className="text-sm font-semibold text-neutral-900">
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
                      <AccessTimeIcon className="text-teal-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500 font-semibold uppercase mb-1">Time</p>
                        <p className="text-sm font-semibold text-neutral-900">
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
                      <GroupsIcon className="text-teal-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500 font-semibold uppercase mb-1">Registered</p>
                        <p className="text-sm font-semibold text-neutral-900">
                          {event.registrations_count || 0} {event.registrations_count === 1 ? 'person' : 'people'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Link */}
                  <button
                    onClick={() => navigate(`/events/${event.slug || event.id}`)}
                    className="text-teal-600 hover:text-teal-700 font-semibold text-sm transition-colors"
                  >
                    View Event Details →
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
