/**
 * Admin view for managing Promotional Profiles.
 *
 * Displays:
 * - List of all promotional profiles with filtering
 * - Progress summary by role
 * - Bulk actions (send reminders, export, mark complete)
 * - Missing assets report
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Grid, Paper, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, Checkbox, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress,
  Chip, Tooltip, Typography, FormControl, InputLabel, Stack, IconButton,
  InputAdornment
} from '@mui/material';
import {
  DownloadRounded as DownloadIcon,
  SendRounded as SendIcon,
  CheckCircleRounded as CheckIcon,
  RefreshRounded as RefreshIcon,
  SettingsRounded as SettingsIcon,
  SearchRounded as SearchIcon
} from '@mui/icons-material';
import { apiClient } from '../../utils/api';

const ROLES = ['speaker', 'sponsor', 'sponsor_staff', 'startup', 'investor'];
const STATUSES = ['not_started', 'in_progress', 'completed', 'lapsed'];
const MODULES = ['speaker', 'sponsor', 'sponsor_staff', 'startup', 'investor'];

export default function PromotionalProfilesManager() {
  const { eventId } = useParams();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState({});
  const [missingAssets, setMissingAssets] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    module: '',
    missing_assets: '',
    display_consent: '',
    search: ''
  });

  // Selection
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [reminderDialog, setReminderDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState('');
  const [exportingRole, setExportingRole] = useState('');
  const [exportDialog, setExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState('zip');
  const [exportingAll, setExportingAll] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load data
  useEffect(() => {
    loadProfiles();
    loadSummary();
    loadMissingAssets();
  }, [eventId, filters]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const { data } = await apiClient.get(
        `/events/${eventId}/promotional-profiles-admin/?${params}`
      );
      setProfiles(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to load promotional profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const { data } = await apiClient.get(
        `/events/${eventId}/promotional-profiles-admin/summary/`
      );
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const loadMissingAssets = async () => {
    try {
      const { data } = await apiClient.get(
        `/events/${eventId}/promotional-profiles-admin/missing-assets/`
      );
      setMissingAssets(data);
    } catch (err) {
      console.error('Failed to load missing assets:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setSelected(new Set());
    setSelectAll(false);
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      const newSelected = new Set(profiles.map(p => p.id));
      setSelected(newSelected);
      setSelectAll(true);
    }
  };

  const handleSendReminders = async () => {
    if (selected.size === 0) {
      setError('No profiles selected');
      return;
    }

    // Check if any selected profiles are completed
    const completedProfiles = profiles.filter(p => selected.has(p.id) && p.status === 'completed');
    const incompleteProfiles = profiles.filter(p => selected.has(p.id) && p.status !== 'completed');

    if (completedProfiles.length > 0 && incompleteProfiles.length === 0) {
      setError('Cannot send reminders to completed profiles. Please select profiles that are in progress or not started.');
      setReminderDialog(false);
      return;
    }

    if (completedProfiles.length > 0) {
      setError(`${completedProfiles.length} selected profile(s) are already completed. Reminders will only be sent to ${incompleteProfiles.length} incomplete profile(s).`);
      setReminderDialog(false);
      return;
    }

    try {
      await apiClient.post(
        `/events/${eventId}/promotional-profiles-admin/reminders/`,
        { assignment_ids: Array.from(selected) }
      );
      setSuccess(`Sent reminders to ${selected.size} profiles`);
      setReminderDialog(false);
      loadProfiles();
    } catch (err) {
      setError('Failed to send reminders');
      console.error(err);
    }
  };

  const handleMarkComplete = async () => {
    if (selected.size === 0 || !selectedModule) {
      setError('Select profiles and module');
      return;
    }

    // Check if any selected profiles are already completed
    const alreadyCompleted = profiles.filter(p =>
      selected.has(p.id) && p.status === 'completed'
    );

    if (alreadyCompleted.length > 0) {
      setError(`${alreadyCompleted.length} selected profile(s) are already marked as complete.`);
      setCompleteDialog(false);
      return;
    }

    try {
      await apiClient.post(
        `/events/${eventId}/promotional-profiles-admin/mark-complete/`,
        {
          assignment_ids: Array.from(selected),
          module: selectedModule
        }
      );
      setSuccess(`Marked ${selected.size} profiles complete`);
      setCompleteDialog(false);
      setSelectedModule('');
      loadProfiles();
    } catch (err) {
      setError('Failed to mark profiles complete');
      console.error(err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await apiClient.get(
        `/events/${eventId}/promotional-profiles-admin/export-csv/`,
        { responseType: 'blob' }
      );
      downloadFile(response.data, 'promotional_profiles.csv');
    } catch (err) {
      setError('Failed to export CSV');
      console.error(err);
    }
  };

  const handleExportByRole = async (role) => {
    try {
      setExportingRole(role);
      const response = await apiClient.get(
        `/events/${eventId}/promotional-profiles-admin/export-by-role/?role=${role}`,
        { responseType: 'blob' }
      );
      downloadFile(response.data, `promotional_profiles_${role}.csv`);
    } catch (err) {
      setError(`Failed to export ${role} profiles`);
      console.error(err);
    } finally {
      setExportingRole('');
    }
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportProduction = async () => {
    if (!exportFormat) {
      setError('Select export format');
      return;
    }

    try {
      setExportingAll(true);
      const response = await apiClient.post(
        `/events/${eventId}/promotional-profiles-admin/export-production/`,
        {
          format: exportFormat,
          include_internal: false
        },
        { responseType: 'blob' }
      );

      const timestamp = new Date().toISOString().slice(0, 10);
      const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'json' ? 'json' : 'zip';
      downloadFile(response.data, `promotional_profiles_${timestamp}.${ext}`);

      setSuccess(`Exported ${exportFormat.toUpperCase()} successfully`);
      setExportDialog(false);
    } catch (err) {
      setError('Failed to export profiles');
      console.error(err);
    } finally {
      setExportingAll(false);
    }
  };

  const handleExportRoleProduction = async (role) => {
    try {
      setExportingRole(role);
      const response = await apiClient.post(
        `/events/${eventId}/promotional-profiles-admin/export-production/`,
        {
          format: 'zip',
          role: role,
          include_internal: false
        },
        { responseType: 'blob' }
      );

      const timestamp = new Date().toISOString().slice(0, 10);
      downloadFile(response.data, `promotional_profiles_${role}_${timestamp}.zip`);

      setSuccess(`Exported ${role} profiles successfully`);
    } catch (err) {
      setError(`Failed to export ${role} profiles`);
      console.error(err);
    } finally {
      setExportingRole('');
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

  const getConsentColor = (consent) => {
    switch (consent) {
      case 'yes':
        return '#4caf50';
      case 'no':
        return '#f44336';
      default:
        return '#999';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Promotional Profiles Manager
      </Typography>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Profiles" />
        <Tab label="Progress Summary" />
        <Tab label="Missing Assets" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {/* Filters and Actions */}
          <Paper sx={{ p: 2, mb: 3 }}>
            {/* Search and Refresh Row */}
            <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Search by name or email..."
                size="small"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250, flex: 1 }}
              />
              <IconButton size="small" onClick={loadProfiles}>
                <RefreshIcon />
              </IconButton>
            </Stack>

            {/* Filters Row */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {STATUSES.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={filters.role}
                  label="Role"
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {ROLES.map(role => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Consent</InputLabel>
                <Select
                  value={filters.display_consent}
                  label="Consent"
                  onChange={(e) => handleFilterChange('display_consent', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="granted">Granted</MenuItem>
                  <MenuItem value="denied">Denied</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Missing Assets</InputLabel>
                <Select
                  value={filters.missing_assets}
                  label="Missing Assets"
                  onChange={(e) => handleFilterChange('missing_assets', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="headshot">Missing Headshot</MenuItem>
                  <MenuItem value="logo">Missing Logo</MenuItem>
                  <MenuItem value="pitch_deck">Missing Pitch Deck</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          {/* Bulk Actions */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SendIcon />}
                onClick={() => setReminderDialog(true)}
                disabled={selected.size === 0}
              >
                Send Reminders ({selected.size})
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CheckIcon />}
                onClick={() => setCompleteDialog(true)}
                disabled={selected.size === 0}
              >
                Mark Complete ({selected.size})
              </Button>
            </Stack>

            {/* Export Buttons */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'textSecondary' }}>
                Export Completed Profiles:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    setExportFormat('zip');  // Default to ZIP
                    setExportDialog(true);
                  }}
                  title="Export all completed profiles (display_consent=yes)"
                >
                  All Profiles (ZIP)
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportRoleProduction('speaker')}
                  disabled={exportingRole === 'speaker'}
                  title="Export completed speaker profiles"
                >
                  {exportingRole === 'speaker' ? 'Exporting...' : 'Speakers'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportRoleProduction('sponsor')}
                  disabled={exportingRole === 'sponsor'}
                  title="Export completed sponsor profiles"
                >
                  {exportingRole === 'sponsor' ? 'Exporting...' : 'Sponsors'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportRoleProduction('startup')}
                  disabled={exportingRole === 'startup'}
                  title="Export completed startup profiles"
                >
                  {exportingRole === 'startup' ? 'Exporting...' : 'Startups'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportRoleProduction('investor')}
                  disabled={exportingRole === 'investor'}
                  title="Export completed investor profiles"
                >
                  {exportingRole === 'investor' ? 'Exporting...' : 'Investors'}
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => setExportDialog(true)}
                  title="Advanced export options (format, include in-progress)"
                >
                  Advanced...
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Modules</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Consent</strong></TableCell>
                  <TableCell><strong>Reminders</strong></TableCell>
                  <TableCell><strong>Completed</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      No profiles found
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map(profile => (
                    <TableRow key={profile.id} hover>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(profile.id)}
                          onChange={() => handleSelectOne(profile.id)}
                        />
                      </TableCell>
                      <TableCell>{profile.attendee_name || '-'}</TableCell>
                      <TableCell>{profile.attendee_email || '-'}</TableCell>
                      <TableCell>
                        {profile.active_modules?.map(m => (
                          <Chip key={m} label={m} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={profile.status}
                          size="small"
                          color={getStatusColor(profile.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <span style={{ color: getConsentColor(profile.display_consent) }}>
                          {profile.display_consent || 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>{profile.reminders_sent || 0}</TableCell>
                      <TableCell>
                        {profile.completed_at ? new Date(profile.completed_at).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {activeTab === 1 && (
        <Grid container spacing={2}>
          {ROLES.map(role => {
            const data = summary.by_role?.[role];
            if (!data || data.total === 0) return null;

            return (
              <Grid item xs={12} sm={6} md={4} key={role}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', mb: 2, fontWeight: 600 }}>
                      {role}s
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <span>{data.completed}/{data.total} Complete</span>
                        <strong>{data.percentage}%</strong>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.percentage}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        onClick={() => handleExportRoleProduction(role)}
                        disabled={exportingRole === role}
                      >
                        {exportingRole === role ? 'Exporting...' : 'Export ZIP'}
                      </Button>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        onClick={() => handleExportByRole(role)}
                        disabled={exportingRole === role}
                      >
                        CSV
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={2}>
          {[
            { title: 'Missing Headshots', items: missingAssets.missing_headshots, count: missingAssets.total_missing?.headshots },
            { title: 'Missing Logos', items: missingAssets.missing_logos, count: missingAssets.total_missing?.logos },
            { title: 'Missing Pitch Decks', items: missingAssets.missing_pitch_decks, count: missingAssets.total_missing?.pitch_decks }
          ].map((section, idx) => (
            <Grid item xs={12} md={6} key={idx}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    {section.title} ({section.count || 0})
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                    {section.items?.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        None missing
                      </Typography>
                    ) : (
                      <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {section.items?.map(item => (
                          <li key={item.id} style={{ marginBottom: 8 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {item.email}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <Dialog open={reminderDialog} onClose={() => setReminderDialog(false)}>
        <DialogTitle>Send Reminders</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(() => {
              const completedProfiles = profiles.filter(p => selected.has(p.id) && p.status === 'completed');
              const incompleteProfiles = profiles.filter(p => selected.has(p.id) && p.status !== 'completed');

              if (completedProfiles.length > 0 && incompleteProfiles.length === 0) {
                return (
                  <Alert severity="error">
                    All selected profiles are already completed. Reminders can only be sent to profiles that are in progress or not started.
                  </Alert>
                );
              }

              if (completedProfiles.length > 0) {
                return (
                  <>
                    <Alert severity="warning">
                      {completedProfiles.length} of {selected.size} selected profile(s) are already completed.
                    </Alert>
                    <Typography variant="body2">
                      Reminders will only be sent to {incompleteProfiles.length} incomplete profile(s)?
                    </Typography>
                  </>
                );
              }

              return (
                <Typography variant="body2">
                  Send reminders to {selected.size} selected profiles?
                </Typography>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSendReminders}
            variant="contained"
            color="primary"
            disabled={profiles.filter(p => selected.has(p.id) && p.status === 'completed').length === selected.size && selected.size > 0}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completeDialog} onClose={() => setCompleteDialog(false)}>
        <DialogTitle>Mark as Complete</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Module</InputLabel>
              <Select
                value={selectedModule}
                label="Module"
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                <MenuItem value="">Select Module...</MenuItem>
                {MODULES.map(m => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {(() => {
              const completedProfiles = profiles.filter(p => selected.has(p.id) && p.status === 'completed');

              if (completedProfiles.length > 0) {
                return (
                  <Alert severity="warning">
                    {completedProfiles.length} of {selected.size} selected profile(s) are already completed.
                  </Alert>
                );
              }
              return null;
            })()}
            <Typography variant="body2">
              Mark {selected.size} profiles as complete for this module?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleMarkComplete}
            variant="contained"
            color="primary"
            disabled={!selectedModule}
          >
            Mark Complete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Promotional Profiles for Production</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Exports completed profiles. Excludes profiles with denied consent.
            </Typography>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Format:</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={exportFormat === 'zip' ? 'contained' : 'outlined'}
                  onClick={() => setExportFormat('zip')}
                  size="small"
                >
                  ZIP
                </Button>
                <Button
                  variant={exportFormat === 'csv' ? 'contained' : 'outlined'}
                  onClick={() => setExportFormat('csv')}
                  size="small"
                >
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'json' ? 'contained' : 'outlined'}
                  onClick={() => setExportFormat('json')}
                  size="small"
                >
                  JSON
                </Button>
              </Stack>
            </Box>
            {exportFormat === 'zip' && (
              <Typography variant="caption" color="textSecondary">
                ZIP contains organized folders by role with profile.json + media files
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
          <Button
            onClick={handleExportProduction}
            variant="contained"
            color="primary"
            disabled={exportingAll}
          >
            {exportingAll ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
