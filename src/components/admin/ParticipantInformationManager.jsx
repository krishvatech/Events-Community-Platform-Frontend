import React, { useState, useEffect } from 'react';
import { apiClient } from '../../utils/api';
import {
  Box,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

export default function ParticipantInformationManager({ eventId }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAttendanceMode, setFilterAttendanceMode] = useState('all');
  const [filterVisaSupport, setFilterVisaSupport] = useState('all');
  const [filterAccessibilityNeed, setFilterAccessibilityNeed] = useState('all');
  const [filterPhotoConcent, setFilterPhotoConcent] = useState('all');
  const [selectedAssignments, setSelectedAssignments] = useState(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    lapsed: 0,
    completion_percentage: 0,
  });

  // Fetch assignments and summary
  useEffect(() => {
    fetchAssignments();
    fetchSummary();
  }, [eventId, page, rowsPerPage, searchText, filterStatus, filterRole, filterAttendanceMode, filterVisaSupport, filterAccessibilityNeed, filterPhotoConcent]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterRole !== 'all') {
        params.append('attendee_role', filterRole);
      }
      if (filterAttendanceMode !== 'all') {
        params.append('attendance_mode', filterAttendanceMode);
      }
      if (filterVisaSupport !== 'all') {
        params.append('visa_support_requested', filterVisaSupport);
      }
      if (filterAccessibilityNeed !== 'all') {
        params.append('accessibility_need_declared', filterAccessibilityNeed);
      }
      if (filterPhotoConcent !== 'all') {
        params.append('photo_consent_denied', filterPhotoConcent);
      }
      if (searchText) {
        params.append('search', searchText);
      }
      params.append('limit', rowsPerPage);
      params.append('offset', page * rowsPerPage);

      const { data } = await apiClient.get(
        `/events/${eventId}/post-acceptance-form-assignments-admin/?${params.toString()}`
      );
      setAssignments(Array.isArray(data.results) ? data.results : data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignments');
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await apiClient.get(
        `/events/${eventId}/post-acceptance-form-assignments-admin/summary/`
      );
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setPage(0);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setPage(0);
  };

  const handleRoleFilterChange = (e) => {
    setFilterRole(e.target.value);
    setPage(0);
  };

  const handleAttendanceModeFilterChange = (e) => {
    setFilterAttendanceMode(e.target.value);
    setPage(0);
  };

  const handleVisaSupportFilterChange = (e) => {
    setFilterVisaSupport(e.target.value);
    setPage(0);
  };

  const handleAccessibilityNeedFilterChange = (e) => {
    setFilterAccessibilityNeed(e.target.value);
    setPage(0);
  };

  const handlePhotoConsentFilterChange = (e) => {
    setFilterPhotoConcent(e.target.value);
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = new Set(assignments.map(a => a.id));
      setSelectedAssignments(newSelected);
    } else {
      setSelectedAssignments(new Set());
    }
  };

  const handleSelectClick = (id) => {
    const newSelected = new Set(selectedAssignments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssignments(newSelected);
  };

  const handleSendReminders = async () => {
    try {
      setSubmitting(true);
      const assignmentIds = Array.from(selectedAssignments);
      const { data } = await apiClient.post(
        `/events/${eventId}/post-acceptance-form-assignments-admin/send-reminders/`,
        { assignment_ids: assignmentIds.length > 0 ? assignmentIds : [] }
      );
      alert(data.message || `Reminders sent to ${data.sent_count} participant(s)`);
      setSelectedAssignments(new Set());
      fetchAssignments();
    } catch (err) {
      alert('Failed to send reminders: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (restricted = false) => {
    try {
      setSubmitting(true);
      const response = await apiClient.post(
        `/events/${eventId}/post-acceptance-form-assignments-admin/export/`,
        { restricted }
      );
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-assignments-${eventId}${restricted ? '-restricted' : ''}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (assignment) => {
    try {
      const { data } = await apiClient.get(
        `/events/${eventId}/post-acceptance-form-assignments-admin/${assignment.id}/details/`
      );
      setSelectedAssignment(data);
      setDetailsOpen(true);
    } catch (err) {
      alert('Failed to load details: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleMarkComplete = async (assignmentId) => {
    try {
      setSubmitting(true);
      await apiClient.post(
        `/events/${eventId}/post-acceptance-form-assignments-admin/${assignmentId}/mark-complete/`
      );
      alert('Assignment marked as complete');
      setDetailsOpen(false);
      fetchAssignments();
    } catch (err) {
      alert('Failed to mark complete: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'not_started':
        return 'default';
      case 'lapsed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      case 'lapsed':
        return 'Lapsed';
      default:
        return status;
    }
  };

  if (loading && assignments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const completedCount = summary.completed;
  const progressPercent = summary.completion_percentage;

  return (
    <Box>
      {/* Header with stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Participant Information Forms
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {completedCount} of {summary.total} completed ({progressPercent}%)
        </Typography>
        {/* Progress bar */}
        <Box
          sx={{
            width: '100%',
            height: 8,
            backgroundColor: '#e0e0e0',
            borderRadius: 4,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <Box
            sx={{
              height: '100%',
              backgroundColor: '#4caf50',
              width: `${progressPercent}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Search and Refresh Row */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by name or email..."
            size="small"
            value={searchText}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250, flex: 1 }}
          />
          <IconButton size="small" onClick={fetchAssignments} disabled={loading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Stack>

        {/* Filters Row 1 */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={handleFilterChange}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="lapsed">Lapsed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={filterRole}
              onChange={handleRoleFilterChange}
              label="Role"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="speaker">Speaker</MenuItem>
              <MenuItem value="moderator">Moderator</MenuItem>
              <MenuItem value="host">Host</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Attendance Mode</InputLabel>
            <Select
              value={filterAttendanceMode}
              onChange={handleAttendanceModeFilterChange}
              label="Attendance Mode"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="in_person">In Person</MenuItem>
              <MenuItem value="online">Online</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Visa Support</InputLabel>
            <Select
              value={filterVisaSupport}
              onChange={handleVisaSupportFilterChange}
              label="Visa Support"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Requested</MenuItem>
              <MenuItem value="false">Not Requested</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Filters Row 2 */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Accessibility Need</InputLabel>
            <Select
              value={filterAccessibilityNeed}
              onChange={handleAccessibilityNeedFilterChange}
              label="Accessibility Need"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Declared</MenuItem>
              <MenuItem value="false">Not Declared</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Photo Consent</InputLabel>
            <Select
              value={filterPhotoConcent}
              onChange={handlePhotoConsentFilterChange}
              label="Photo Consent"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Denied</MenuItem>
              <MenuItem value="false">Allowed</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Action buttons */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EmailRoundedIcon />}
            onClick={handleSendReminders}
            disabled={selectedAssignments.size === 0 || submitting}
          >
            Send Reminders ({selectedAssignments.size})
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<GetAppRoundedIcon />}
            onClick={() => handleExport(false)}
            disabled={submitting}
          >
            Export CSV
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<GetAppRoundedIcon />}
            onClick={() => handleExport(true)}
            disabled={submitting}
            title="Includes restricted data (emergency contact, medical, dietary)"
          >
            Export (Restricted)
          </Button>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedAssignments.size > 0 && selectedAssignments.size < assignments.length}
                  checked={selectedAssignments.size === assignments.length && assignments.length > 0}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Deadline</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Reminders</TableCell>
              <TableCell>Role(s)</TableCell>
              <TableCell>Attendance Mode</TableCell>
              <TableCell>Accessibility Need</TableCell>
              <TableCell>Photo Consent Denied</TableCell>
              <TableCell>Visa Support</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedAssignments.has(assignment.id)}
                    onChange={() => handleSelectClick(assignment.id)}
                  />
                </TableCell>
                <TableCell>{assignment.attendee_name}</TableCell>
                <TableCell>{assignment.attendee_email}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(assignment.status)}
                    color={getStatusColor(assignment.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {assignment.deadline
                    ? new Date(assignment.deadline).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  {assignment.completed_at
                    ? new Date(assignment.completed_at).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>{assignment.reminders_sent}</TableCell>
                <TableCell>{assignment.attendee_role || '-'}</TableCell>
                <TableCell>{assignment.attendance_mode || '-'}</TableCell>
                <TableCell>
                  {assignment.accessibility_need_declared ? '✓' : '-'}
                </TableCell>
                <TableCell>
                  {assignment.photo_consent_denied ? '✗' : '-'}
                </TableCell>
                <TableCell>
                  {assignment.visa_support_requested ? '✓' : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => handleViewDetails(assignment)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[25, 50, 100]}
        component="div"
        count={summary.total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* Details Modal */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Participant Information Details</DialogTitle>
        <DialogContent dividers>
          {selectedAssignment && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Attendee
                </Typography>
                <Typography>
                  {selectedAssignment.attendee_name} ({selectedAssignment.attendee_email})
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusLabel(selectedAssignment.status)}
                  color={getStatusColor(selectedAssignment.status)}
                  size="small"
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Deadline
                </Typography>
                <Typography>
                  {selectedAssignment.deadline
                    ? new Date(selectedAssignment.deadline).toLocaleString()
                    : '-'}
                </Typography>
              </Box>

              {selectedAssignment.submission && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Responses
                  </Typography>
                  {selectedAssignment.submission.answers?.map((answer) => (
                    <Box key={answer.id} sx={{ mb: 1, pl: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        {answer.question_key}
                      </Typography>
                      <Typography variant="body2">
                        {Array.isArray(answer.answer_data)
                          ? answer.answer_data.join(', ')
                          : answer.answer_text || '-'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Flags
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {selectedAssignment.visa_support_requested && (
                    <Chip label="Visa Support" size="small" color="primary" variant="outlined" />
                  )}
                  {selectedAssignment.photo_video_consent === 'full' && (
                    <Chip label="Photo Consent" size="small" color="primary" variant="outlined" />
                  )}
                  {selectedAssignment.directory_visibility && (
                    <Chip label="Directory Visible" size="small" color="primary" variant="outlined" />
                  )}
                </Stack>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedAssignment?.status !== 'completed' && (
            <Button
              onClick={() => handleMarkComplete(selectedAssignment.id)}
              variant="contained"
              disabled={submitting}
            >
              Mark Complete
            </Button>
          )}
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
