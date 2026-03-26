import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  Typography,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { toast } from 'react-toastify';
import {
  listVirtualSpeakers,
  deleteVirtualSpeaker,
  resendVirtualSpeakerInvite,
} from '../services/virtualSpeakerService';
import VirtualSpeakerForm from '../components/VirtualSpeakerForm';
import ConvertVirtualSpeakerModal from '../components/ConvertVirtualSpeakerModal';

const VirtualSpeakersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get community ID from URL or context
  const urlParams = new URLSearchParams(window.location.search);
  const communityId = parseInt(urlParams.get('community_id')) || 1;

  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingSpeaker, setConvertingSpeaker] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [speakerToDelete, setSpeakerToDelete] = useState(null);

  // Load speakers
  const loadSpeakers = useCallback(async () => {
    setLoading(true);
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

  return (
    <>
    <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Virtual Speakers
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create and manage reusable speaker profiles
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleCreateNew}
          >
            Create Speaker
          </Button>
        </Box>

        {/* Search */}
        <TextField
          placeholder="Search speakers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
          size="small"
        />

        {/* Loading */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredSpeakers.length === 0 ? (
          <Alert severity="info">
            {searchQuery
              ? 'No speakers found matching your search'
              : 'No virtual speakers created yet. Create one to get started!'}
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
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
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {speaker.name}
                          </Typography>
                          {speaker.bio && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
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
                      <Chip
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
                        <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                          {speaker.invited_email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(speaker)}
                          title="Edit"
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(speaker)}
                          title="Delete"
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>

                        {speaker.status !== 'converted' ? (
                          <Button
                            size="small"
                            startIcon={<PersonAddRoundedIcon />}
                            onClick={() => handleConvert(speaker)}
                            variant="text"
                          >
                            Convert
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            onClick={() => handleResendInvite(speaker)}
                            variant="text"
                          >
                            Resend Invite
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Virtual Speaker</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{speakerToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
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
