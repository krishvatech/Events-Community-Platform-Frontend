import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { apiClient } from '../utils/api';

/**
 * TrackPicker Component
 * Allows applicants to select one or more tracks for application.
 * Phase 7: Multi-track application support.
 */
const TrackPicker = ({ eventId, onTracksSelected, onCancel, multiple = true }) => {
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOpenTracks();
  }, [eventId]);

  const fetchOpenTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(
        `/events/${eventId}/application-tracks/`,
        {
          params: { status: 'open' },
        }
      );
      setTracks(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load available tracks. Please try again.');
      console.error('Error fetching tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackToggle = (trackId) => {
    if (multiple) {
      setSelectedTracks((prev) =>
        prev.includes(trackId)
          ? prev.filter((id) => id !== trackId)
          : [...prev, trackId]
      );
    } else {
      setSelectedTracks([trackId]);
    }
  };

  const handleConfirm = () => {
    if (selectedTracks.length > 0) {
      onTracksSelected(selectedTracks);
    }
  };

  const isConfirmDisabled = selectedTracks.length === 0;

  return (
    <Dialog open={true} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {multiple ? 'Select Tracks' : 'Choose Track'}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          {multiple
            ? 'Select one or more tracks to apply to'
            : 'Select a track to apply to'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : tracks.length === 0 ? (
          <Alert severity="info">No open tracks available at this time.</Alert>
        ) : (
          <FormGroup>
            {tracks.map((track) => (
              <Box
                key={track.id}
                sx={{
                  p: 2,
                  mb: 1,
                  border: selectedTracks.includes(track.id)
                    ? '2px solid #1976d2'
                    : '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: selectedTracks.includes(track.id)
                    ? 'rgba(25, 118, 210, 0.04)'
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  },
                }}
                onClick={() => handleTrackToggle(track.id)}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedTracks.includes(track.id)}
                      onChange={() => handleTrackToggle(track.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                  label={
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {track.label}
                      </Typography>
                      {track.short_description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          {track.short_description}
                        </Typography>
                      )}
                      {track.enabled_submission_modes && track.enabled_submission_modes.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {track.enabled_submission_modes.map((mode) => (
                            <Chip
                              key={mode}
                              label={mode.replace(/_/g, ' ')}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Box>
            ))}
          </FormGroup>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isConfirmDisabled || loading}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrackPicker;
