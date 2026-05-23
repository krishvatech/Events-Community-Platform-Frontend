import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  Alert,
} from '@mui/material';

/**
 * SubmissionModePicker Component
 * Allows applicants to select submission mode for a specific track.
 * Auto-selects if only one mode is available.
 * Phase 7: Multi-track application support.
 */
const SubmissionModePicker = ({ track, onModeSelected, onCancel }) => {
  const [selectedMode, setSelectedMode] = React.useState('');

  const modes = track.enabled_submission_modes || [];

  // Mode descriptions
  const modeDescriptions = {
    self_submission: 'Apply directly with your own information',
    confirmed:
      'Apply with confirmation from a sponsor or partner organization',
    self_nomination: 'Nominate yourself for this opportunity',
    third_party_nomination:
      'Have someone nominate you for this opportunity',
  };

  useEffect(() => {
    // Auto-select if only one mode
    if (modes.length === 1) {
      setSelectedMode(modes[0]);
    }
  }, [modes]);

  const handleConfirm = () => {
    if (selectedMode) {
      onModeSelected(selectedMode);
    }
  };

  if (modes.length === 1) {
    // Auto-proceed if only one mode
    return (
      <Dialog open={false}>
        <DialogContent>
          <Typography>Loading...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">{track.label}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          How would you like to apply?
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {track.short_description && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {track.short_description}
          </Alert>
        )}

        <RadioGroup value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)}>
          {modes.map((mode) => (
            <Box
              key={mode}
              sx={{
                p: 2,
                mb: 1,
                border: selectedMode === mode ? '2px solid #1976d2' : '1px solid #e0e0e0',
                borderRadius: 1,
                backgroundColor:
                  selectedMode === mode ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                },
              }}
              onClick={() => setSelectedMode(mode)}
            >
              <FormControlLabel
                control={<Radio checked={selectedMode === mode} />}
                label={
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {mode.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      {modeDescriptions[mode] || mode}
                    </Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
            </Box>
          ))}
        </RadioGroup>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} variant="outlined">
          Back
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selectedMode}>
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubmissionModePicker;
