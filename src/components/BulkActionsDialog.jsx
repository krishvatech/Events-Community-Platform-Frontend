import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { performBulkAction } from '../utils/reviewQueue';

const BulkActionsDialog = ({
  open,
  onClose,
  selectedIds = [],
  eventId,
  tiers = [],
  reviewers = [],
  onSuccess
}) => {
  const [action, setAction] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleActionChange = (e) => {
    setAction(e.target.value);
    setSelectedTier('');
    setSelectedReviewer('');
    setError(null);
  };

  const handleExecuteAction = async () => {
    if (!action) {
      setError('Please select an action');
      return;
    }

    if (action === 'accept' && !selectedTier) {
      setError('Please select a tier for acceptance');
      return;
    }

    if (action === 'assign_reviewer' && !selectedReviewer) {
      setError('Please select a reviewer');
      return;
    }

    setLoading(true);
    setError(null);

    const options = {};
    if (action === 'accept') {
      options.tierId = selectedTier;
    }
    if (action === 'assign_reviewer') {
      options.reviewerId = selectedReviewer;
    }

    const result = await performBulkAction(eventId, action, selectedIds, options);

    if (result.success) {
      setLoading(false);
      setAction('');
      setSelectedTier('');
      setSelectedReviewer('');
      onSuccess?.(result);
      onClose();
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const getActionDescription = () => {
    const descriptions = {
      accept: `Accept ${selectedIds.length} application(s)`,
      decline: `Decline ${selectedIds.length} application(s)`,
      waitlist: `Waitlist ${selectedIds.length} application(s)`,
      assign_reviewer: `Assign ${selectedIds.length} application(s) to reviewer`,
    };
    return descriptions[action] || '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Actions</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedIds.length > 0 && (
            <Typography variant="body2" color="textSecondary">
              Selected: {selectedIds.length} application(s)
            </Typography>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {/* Action Selection */}
          <FormControl fullWidth>
            <InputLabel>Action</InputLabel>
            <Select
              value={action}
              label="Action"
              onChange={handleActionChange}
              disabled={loading}
            >
              <MenuItem value="">Select an action</MenuItem>
              <MenuItem value="accept">Accept with Tier</MenuItem>
              <MenuItem value="decline">Decline</MenuItem>
              <MenuItem value="waitlist">Waitlist</MenuItem>
              <MenuItem value="assign_reviewer">Assign Reviewer</MenuItem>
            </Select>
          </FormControl>

          {/* Tier Selection (for accept action) */}
          {action === 'accept' && (
            <FormControl fullWidth>
              <InputLabel>Select Tier</InputLabel>
              <Select
                value={selectedTier}
                label="Select Tier"
                onChange={(e) => setSelectedTier(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="">Choose a tier...</MenuItem>
                {tiers.map((tier) => (
                  <MenuItem key={tier.id} value={tier.id}>
                    {tier.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Reviewer Selection (for assign_reviewer action) */}
          {action === 'assign_reviewer' && (
            <FormControl fullWidth>
              <InputLabel>Select Reviewer</InputLabel>
              <Select
                value={selectedReviewer}
                label="Select Reviewer"
                onChange={(e) => setSelectedReviewer(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="">Choose a reviewer...</MenuItem>
                {reviewers.map((reviewer) => (
                  <MenuItem key={reviewer.id} value={reviewer.id}>
                    {reviewer.first_name} {reviewer.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Action Summary */}
          {action && (
            <Alert severity="info">
              {getActionDescription()}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExecuteAction}
          variant="contained"
          color="primary"
          disabled={loading || !action}
        >
          {loading ? <CircularProgress size={24} /> : 'Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkActionsDialog;
