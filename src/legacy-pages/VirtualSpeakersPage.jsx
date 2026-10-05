import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '#navigation';
import {
  Box,
  Button,
  TextField,
  Alert,
  Avatar,
  Typography,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { toast } from 'react-toastify';
import { isOwnerUser } from '../utils/adminRole';
import {
  listVirtualSpeakers,
  deleteVirtualSpeaker,
  resendVirtualSpeakerInvite,
} from '../services/virtualSpeakerService';
import VirtualSpeakerForm from '../components/VirtualSpeakerForm';
import ConvertVirtualSpeakerModal from '../components/ConvertVirtualSpeakerModal';
import AdminTableShell from '../components/admin/AdminTableShell';
import AdminStatusChip from '../components/admin/AdminStatusChip';
import { colors, radii, semanticColors } from '../styles/designTokens';

const VirtualSpeakersPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  // Below md (where the sidebar collapses to a menu) speakers are shown as a stacked list instead of
  // the table, which needs ~760px. The page is client-only, so the first render already matches.
  const isCompact = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  // Role-based access control: Super Admin only
  useEffect(() => {
    if (!isOwnerUser()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Get community ID from URL or context
  const urlParams = new URLSearchParams(window.location.search);
  const communityId = parseInt(urlParams.get('community_id')) || 1;

  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingSpeaker, setConvertingSpeaker] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [speakerToDelete, setSpeakerToDelete] = useState(null);

  // Get current user
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  // Load speakers
  const loadSpeakers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      console.log('Loading virtual speakers for community:', communityId);
      const response = await listVirtualSpeakers(communityId, {
        search: searchQuery || undefined,
      });

      console.log('Virtual speakers response:', response);
      let speakerList = [];
      if (Array.isArray(response)) {
        speakerList = response;
      } else if (response?.results && Array.isArray(response.results)) {
        speakerList = response.results;
      } else if (response && typeof response === 'object') {
        // If response is an object but not a paginated response, try to extract speakers
        speakerList = Object.values(response).find(v => Array.isArray(v)) || [];
      }
      console.log('Processed speaker list:', speakerList);
      setSpeakers(speakerList);
    } catch (error) {
      console.error('Load error:', error);
      setLoadError('Failed to load virtual speakers. Please try again later.');
      toast.error('Failed to load virtual speakers: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [communityId, searchQuery]);

  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  const handleCreateNew = () => {
    setEditingSpeaker(null);
    setFormOpen(true);
  };

  const handleEdit = (speaker) => {
    setEditingSpeaker(speaker);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSpeaker(null);
  };

  const handleFormSuccess = () => {
    loadSpeakers();
  };

  const handleConvert = (speaker) => {
    setConvertingSpeaker(speaker);
    setConvertDialogOpen(true);
  };

  const handleConvertSuccess = () => {
    loadSpeakers();
  };

  const handleDeleteClick = (speaker) => {
    setSpeakerToDelete(speaker);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!speakerToDelete) return;

    try {
      await deleteVirtualSpeaker(speakerToDelete.id);
      toast.success('Virtual speaker deleted successfully');
      loadSpeakers();
    } catch (error) {
      toast.error('Failed to delete virtual speaker');
      console.error('Delete error:', error);
    } finally {
      setDeleteConfirmOpen(false);
      setSpeakerToDelete(null);
    }
  };

  const handleResendInvite = async (speaker) => {
    try {
      await resendVirtualSpeakerInvite(speaker.id);
      toast.success('Invitation email sent successfully');
    } catch (error) {
      toast.error('Failed to resend invitation');
      console.error('Resend error:', error);
    }
  };

  const filteredSpeakers = speakers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Shared by the table and the compact list
  const renderStatus = (speaker, emailSx) => (
    <>
      <AdminStatusChip
        status={speaker.status || 'virtual'}
        label={
          speaker.status === 'converted'
            ? '✓ User Account'
            : 'Virtual'
        }
        color={speaker.status === 'converted' ? 'success' : 'default'}
        size="small"
        variant="outlined"
      />
      {speaker.is_converted && speaker.invited_email && (
        <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5, ...emailSx }}>
          {speaker.invited_email}
        </Typography>
      )}
    </>
  );

  const renderActions = (speaker) => (
    <>
      <IconButton
        size="small"
        onClick={() => handleEdit(speaker)}
        title="Edit"
        aria-label={`Edit ${speaker.name}`}
        sx={{ minWidth: 40, minHeight: 40 }}
      >
        <EditRoundedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        color="error"
        onClick={() => handleDeleteClick(speaker)}
        title="Delete"
        aria-label={`Delete ${speaker.name}`}
        sx={{ minWidth: 40, minHeight: 40 }}
      >
        <DeleteRoundedIcon fontSize="small" />
      </IconButton>

      {speaker.status !== 'converted' ? (
        <Button
          size="small"
          startIcon={<PersonAddRoundedIcon />}
          onClick={() => handleConvert(speaker)}
          variant="text"
          sx={{ minHeight: 40 }}
        >
          Convert
        </Button>
      ) : (
        <Button
          size="small"
          onClick={() => handleResendInvite(speaker)}
          variant="text"
          sx={{ minHeight: 40 }}
        >
          Resend Invite
        </Button>
      )}
    </>
  );

  return (
    <>
    <Box sx={{ width: '100%', minWidth: 0, p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          <Avatar sx={{ bgcolor: colors.tealDark }}>
            {(user?.first_name || 'A')[0].toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h1" variant="h5" sx={{ color: semanticColors.text, fontWeight: 700 }}>
              Virtual Speakers
            </Typography>
            <Typography color="text.secondary">
              Create and manage reusable speaker profiles
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleCreateNew}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minHeight: 44,
              textTransform: 'none',
              borderRadius: `${radii.field}px`,
              backgroundColor: colors.tealDark,
              '&:hover': { backgroundColor: colors.navy },
            }}
          >
            Create Speaker
          </Button>
        </Box>

        {/* Search */}
        <TextField
          label="Search speakers by name"
          placeholder="Search speakers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          sx={{
            mb: 3,
            maxWidth: 560,
            '& .MuiOutlinedInput-root': { borderRadius: `${radii.field}px` },
          }}
          size="small"
        />

        {loadError ? (
          <Alert severity="error" sx={{ borderRadius: `${radii.card}px` }}>
            {loadError}
          </Alert>
        ) : (
          <AdminTableShell
            loading={loading}
            loadingLabel="Loading virtual speakers"
            empty={!loading && filteredSpeakers.length === 0}
            emptyTitle={
              searchQuery
                ? 'No speakers found matching your search'
                : 'No virtual speakers created yet. Create one to get started!'
            }
            minWidth={760}
          >
            {isCompact ? (
              <Box component="ul" aria-label="Virtual speakers" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {filteredSpeakers.map((speaker) => (
                  <Box
                    component="li"
                    key={speaker.id}
                    sx={{
                      p: 2,
                      '&:not(:first-of-type)': { borderTop: `1px solid ${semanticColors.border}` },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Avatar
                        src={speaker.profile_image_url}
                        alt={speaker.name}
                        sx={{ width: 44, height: 44 }}
                      >
                        {speaker.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'break-word' }}>
                          {speaker.name}
                        </Typography>
                        {(speaker.job_title || speaker.company) && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, overflowWrap: 'break-word' }}>
                            {[speaker.job_title, speaker.company].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                        {speaker.bio && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, overflowWrap: 'break-word' }}>
                            {speaker.bio.substring(0, 50)}...
                          </Typography>
                        )}
                        <Box sx={{ mt: 1 }}>
                          {renderStatus(speaker, { overflowWrap: 'anywhere' })}
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1, ml: -1 }}>
                          {renderActions(speaker)}
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Box>
            ) : (
            <Table aria-label="Virtual speakers">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, minWidth: 220 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Job Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSpeakers.map((speaker) => (
                  <TableRow key={speaker.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={speaker.profile_image_url}
                          alt={speaker.name}
                          sx={{ width: 40, height: 40 }}
                        >
                          {speaker.name.charAt(0)}
                        </Avatar>
                        {/* break-word, not anywhere: in a table, "anywhere" lets the column shrink until
                            names break after every few letters */}
                        <Box sx={{ minWidth: 0, maxWidth: 300 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'break-word' }}>
                            {speaker.name}
                          </Typography>
                          {speaker.bio && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, overflowWrap: 'break-word' }}>
                              {speaker.bio.substring(0, 50)}...
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {speaker.job_title || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {speaker.company || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {renderStatus(speaker)}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                        {renderActions(speaker)}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </AdminTableShell>
        )}
      </Box>

      {/* Form Dialog */}
      <VirtualSpeakerForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        initialData={editingSpeaker}
        communityId={communityId}
      />

      {/* Convert Dialog */}
      {convertingSpeaker && (
        <ConvertVirtualSpeakerModal
          open={convertDialogOpen}
          onClose={() => {
            setConvertDialogOpen(false);
            setConvertingSpeaker(null);
          }}
          onSuccess={handleConvertSuccess}
          speaker={convertingSpeaker}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-virtual-speaker-title"
        PaperProps={{ sx: { borderRadius: `${radii.popup}px`, m: 2 } }}
      >
        <DialogTitle id="delete-virtual-speaker-title">Delete Virtual Speaker</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{speakerToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            pt: 1,
            gap: 1,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            '& .MuiButton-root': { minHeight: 44, width: { xs: '100%', sm: 'auto' } },
          }}
        >
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VirtualSpeakersPage;
