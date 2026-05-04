import React, { useState, useEffect } from 'react';
import {
  Box, Tabs, Tab, Paper, Typography, Button, TextField, Switch,
  FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Table, TableContainer, TableHead, TableRow, TableCell,
  TableBody, Chip, Select, MenuItem, FormControl, InputLabel, Alert,
  Stack, Grid, Card, CardContent, CardMedia
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  DragIndicator as DragIcon, Publish as PublishIcon, Archive as ArchiveIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE, authConfig } from '../utils/api';

const SeriesManagePage = () => {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [errors, setErrors] = useState({});

  const tabLabels = ['Overview', 'Events', 'Registrations', 'Analytics', 'Edit'];

  useEffect(() => {
    fetchSeries();
  }, [seriesId]);

  const fetchSeries = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/series/${seriesId}/`,
        { headers: authConfig().headers }
      );
      const data = await response.json();
      setSeries(data);
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching series:', error);
      setErrors({ general: 'Failed to load series' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/series/${seriesId}/registrations/`,
        { headers: authConfig().headers }
      );
      const data = await response.json();
      setRegistrations(data.results || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handlePublish = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${seriesId}/publish/`,
        { method: 'POST', headers: authConfig().headers }
      );
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      setErrors({ general: 'Failed to publish series' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleArchive = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${seriesId}/archive/`,
        { method: 'POST', headers: authConfig().headers }
      );
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      setErrors({ general: 'Failed to archive series' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUnarchive = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${seriesId}/publish/`,
        { method: 'POST', headers: authConfig().headers }
      );
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      setErrors({ general: 'Failed to unarchive series' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (window.confirm('Delete this series permanently?')) {
      try {
        const response = await fetch(
          `${API_BASE}/series/${seriesId}/`,
          { method: 'DELETE', headers: authConfig().headers }
        );
        if (response.ok) {
          navigate('/admin/series');
        }
      } catch (error) {
        setErrors({ general: 'Failed to delete series' });
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!series) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Series not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {series.title}
        </Typography>
        <Stack direction="row" spacing={1}>
          {series.status === 'draft' && (
            <Button
              variant="contained"
              startIcon={<PublishIcon />}
              onClick={handlePublish}
              disabled={saveLoading}
            >
              Publish
            </Button>
          )}
          {series.status === 'published' && (
            <Button
              variant="outlined"
              startIcon={<ArchiveIcon />}
              onClick={handleArchive}
              disabled={saveLoading}
            >
              Archive
            </Button>
          )}
          {series.status === 'archived' && (
            <Button
              variant="outlined"
              color="success"
              startIcon={<PublishIcon />}
              onClick={handleUnarchive}
              disabled={saveLoading}
            >
              Unarchive
            </Button>
          )}
          <Button variant="outlined" color="error" onClick={handleDeleteSeries}>
            Delete
          </Button>
        </Stack>
      </Box>

      {/* Status Info */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 3 }}>
        <Box>
          <Typography variant="body2" color="textSecondary">Status</Typography>
          <Chip label={series.status} color={series.status === 'published' ? 'success' : 'default'} />
        </Box>
        <Box>
          <Typography variant="body2" color="textSecondary">Events</Typography>
          <Typography variant="h6">{series.events_count}</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="textSecondary">Registrations</Typography>
          <Typography variant="h6">{series.registrations_count}</Typography>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, newTab) => setTab(newTab)}>
          {tabLabels.map((label) => <Tab key={label} label={label} />)}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {tab === 0 && <OverviewTab series={series} />}
        {tab === 1 && <EventsTab series={series} events={events} onUpdate={fetchSeries} />}
        {tab === 2 && <RegistrationsTab seriesId={seriesId} />}
        {tab === 3 && <AnalyticsTab seriesId={seriesId} />}
        {tab === 4 && <EditTab series={series} onUpdate={fetchSeries} />}
      </Box>
    </Box>
  );
};

// Tab Components
const OverviewTab = ({ series }) => (
  <div className="space-y-6">
    {/* Metrics Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Status</p>
        <Chip
          label={series.status?.toUpperCase() || 'DRAFT'}
          color={series.status === 'published' ? 'success' : 'default'}
          sx={{ fontWeight: 600 }}
        />
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Total Events</p>
        <p className="text-2xl font-bold text-neutral-900">{series.events_count || 0}</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Registrations</p>
        <p className="text-2xl font-bold text-neutral-900">{series.registrations_count || 0}</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Price</p>
        <p className="text-2xl font-bold text-teal-600">{series.is_free ? 'Free' : `$${series.price}`}</p>
      </div>
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Description Section */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Series Details</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-500 uppercase mb-1">Description</p>
              <p className="text-neutral-700 leading-relaxed">{series.description || 'No description'}</p>
            </div>

            <div className="pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-neutral-500 uppercase mb-1">Registration Mode</p>
                <p className="text-neutral-900 font-semibold capitalize">
                  {series.registration_mode?.replace(/_/g, ' ') || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-500 uppercase mb-1">Visibility</p>
                <p className="text-neutral-900 font-semibold capitalize">{series.visibility || 'Private'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100">
              <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Series URL</p>
              <div className="flex items-center gap-2 bg-neutral-50 p-3 rounded-lg">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/series/${series.slug}`}
                  className="flex-1 bg-transparent text-sm text-neutral-600 outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/series/${series.slug}`)}
                  className="text-teal-600 hover:text-teal-700 font-semibold text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image Section */}
      {series.cover_image && (
        <div>
          <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <img
              src={series.cover_image}
              alt={series.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <p className="text-sm font-semibold text-neutral-500 uppercase">Cover Image</p>
              <p className="text-sm text-neutral-600 mt-1">Successfully uploaded</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

const EventsTab = ({ series, events, onUpdate }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    event_id: '',
    series_order: events.length + 1,
    series_session_label: '',
  });
  const [editFormData, setEditFormData] = useState({
    series_order: '',
    series_session_label: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dialogOpen) {
      fetchAvailableEvents();
    }
  }, [dialogOpen]);

  const fetchAvailableEvents = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/events/?limit=100`,
        { headers: authConfig().headers }
      );
      const data = await response.json();
      setAvailableEvents(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleAddEvent = async () => {
    if (!formData.event_id) {
      alert('Please select an event');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/events/`,
        {
          method: 'POST',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: formData.event_id,
            series_order: formData.series_order,
            series_session_label: formData.series_session_label,
          }),
        }
      );

      if (response.ok) {
        setDialogOpen(false);
        onUpdate();
        setFormData({ event_id: '', series_order: events.length + 1, series_session_label: '' });
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEditFormData({
      series_order: event.series_order || '',
      series_session_label: event.series_session_label || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/events/${editingEvent.id}/`,
        {
          method: 'PATCH',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(editFormData),
        }
      );

      if (response.ok) {
        setEditDialogOpen(false);
        onUpdate();
      } else {
        alert('Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEvent = async (event) => {
    if (!window.confirm(`Remove "${event.title}" from this series?`)) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/events/${event.id}/`,
        {
          method: 'DELETE',
          headers: authConfig().headers,
        }
      );

      if (response.ok) {
        onUpdate();
      } else {
        alert('Failed to remove event');
      }
    } catch (error) {
      console.error('Error removing event:', error);
      alert('Failed to remove event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ mb: 2 }}
      >
        Add Event
      </Button>

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>Registered</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event, idx) => (
              <TableRow key={event.id} hover>
                <TableCell><DragIcon sx={{ color: 'grey.400' }} /></TableCell>
                <TableCell>{event.series_session_label || event.title}</TableCell>
                <TableCell>
                  {event.start_time ? new Date(event.start_time).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell align="center">{event.registrations_count}</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditEvent(event)}>Edit</Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleRemoveEvent(event)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Event to Series</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Event</InputLabel>
            <Select
              value={formData.event_id}
              label="Select Event"
              onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
              disabled={loading}
            >
              {availableEvents.map((event) => (
                <MenuItem key={event.id} value={event.id}>
                  {event.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Series Order"
            type="number"
            value={formData.series_order}
            onChange={(e) => setFormData({ ...formData, series_order: parseInt(e.target.value) || 1 })}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Session Label (e.g., 'Session 1: Introduction')"
            value={formData.series_session_label}
            onChange={(e) => setFormData({ ...formData, series_session_label: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleAddEvent} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Event in Series</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Event Title"
            value={editingEvent?.title || ''}
            disabled
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Series Order"
            type="number"
            value={editFormData.series_order}
            onChange={(e) => setEditFormData({ ...editFormData, series_order: parseInt(e.target.value) || 1 })}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Session Label (e.g., 'Session 1: Introduction')"
            value={editFormData.series_session_label}
            onChange={(e) => setEditFormData({ ...editFormData, series_session_label: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const RegistrationsTab = ({ seriesId }) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/series/${seriesId}/registrations/`,
          { headers: authConfig().headers }
        );
        const data = await response.json();
        setRegistrations(data.results || []);
      } catch (error) {
        console.error('Error fetching registrations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistrations();
  }, [seriesId]);

  if (loading) return <CircularProgress />;

  return (
    <TableContainer sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Email</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800 }}>Attended</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {registrations.map((reg) => (
            <TableRow key={reg.id}>
              <TableCell>{reg.user_name}</TableCell>
              <TableCell>{reg.user_email}</TableCell>
              <TableCell align="center">
                {reg.events_attended_count} / {reg.total_events}
              </TableCell>
              <TableCell>
                <Chip label={reg.status} color={reg.status === 'registered' ? 'success' : 'error'} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const AnalyticsTab = ({ seriesId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/series/${seriesId}/analytics/`,
          { headers: authConfig().headers }
        );
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [seriesId]);

  if (loading) return <CircularProgress />;

  const totalRegistrations = analytics?.total_registrations || 0;
  const totalAttended = analytics?.event_attendance?.reduce((sum, evt) => sum + evt.attended, 0) || 0;
  const avgAttendanceRate = analytics?.event_attendance?.length > 0
    ? (analytics.event_attendance.reduce((sum, evt) => sum + evt.attendance_rate, 0) / analytics.event_attendance.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Total Registrations</p>
          <p className="text-3xl font-bold text-neutral-900">{totalRegistrations}</p>
          <p className="text-xs text-neutral-500 mt-2">Series-wide registrations</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Total Attended</p>
          <p className="text-3xl font-bold text-teal-600">{totalAttended}</p>
          <p className="text-xs text-neutral-500 mt-2">Across all events</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Avg Attendance Rate</p>
          <p className="text-3xl font-bold text-neutral-900">{avgAttendanceRate.toFixed(1)}%</p>
          <p className="text-xs text-neutral-500 mt-2">Average across events</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold text-neutral-500 uppercase mb-2">Events</p>
          <p className="text-3xl font-bold text-neutral-900">{analytics?.event_attendance?.length || 0}</p>
          <p className="text-xs text-neutral-500 mt-2">In this series</p>
        </div>
      </div>

      {/* Event Attendance Table */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">Event Attendance Details</h3>

        {analytics?.event_attendance && analytics.event_attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700 text-sm">Event</th>
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 text-sm">Registered</th>
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 text-sm">Attended</th>
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 text-sm">Attendance Rate</th>
                  <th className="text-center px-4 py-3 font-semibold text-neutral-700 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {analytics.event_attendance.map((evt) => {
                  const attendanceRate = evt.attendance_rate || 0;
                  const statusColor = attendanceRate >= 75 ? 'bg-green-100 text-green-800' :
                                     attendanceRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-orange-100 text-orange-800';
                  return (
                    <tr key={evt.event_id} className="border-b border-neutral-100 hover:bg-neutral-50 transition">
                      <td className="px-4 py-3 text-neutral-900 font-semibold">{evt.event_title}</td>
                      <td className="px-4 py-3 text-center text-neutral-700">{evt.registered}</td>
                      <td className="px-4 py-3 text-center text-neutral-700 font-semibold">{evt.attended}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-semibold text-neutral-900">{attendanceRate.toFixed(1)}%</span>
                          <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-600 transition-all"
                              style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Chip
                          label={attendanceRate >= 75 ? 'Excellent' : attendanceRate >= 50 ? 'Good' : 'Fair'}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            backgroundColor: attendanceRate >= 75 ? '#d1fae5' :
                                           attendanceRate >= 50 ? '#fef3c7' : '#fed7aa',
                            color: attendanceRate >= 75 ? '#065f46' :
                                  attendanceRate >= 50 ? '#92400e' : '#92400e'
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-500">No attendance data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EditTab = ({ series, onUpdate }) => {
  const [formData, setFormData] = useState(series);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE}/series/${series.id}/`,
        {
          method: 'PATCH',
          headers: { ...authConfig().headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving series:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Edit Series</Typography>

      <TextField
        fullWidth
        label="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        multiline
        rows={4}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Visibility</InputLabel>
        <Select
          value={formData.visibility}
          label="Visibility"
          onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
        >
          <MenuItem value="public">Public</MenuItem>
          <MenuItem value="private">Private</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Registration Mode</InputLabel>
        <Select
          value={formData.registration_mode}
          label="Registration Mode"
          onChange={(e) => setFormData({ ...formData, registration_mode: e.target.value })}
        >
          <MenuItem value="full_series_only">Full Series Only</MenuItem>
          <MenuItem value="per_session_only">Per Session Only</MenuItem>
          <MenuItem value="both">Both</MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="contained"
        fullWidth
        onClick={handleSave}
        disabled={saving}
        sx={{ mt: 2 }}
      >
        {saving ? <CircularProgress size={24} /> : 'Save Changes'}
      </Button>
    </Paper>
  );
};

export default SeriesManagePage;
