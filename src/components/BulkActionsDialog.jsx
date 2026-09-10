import React, { useEffect, useState } from 'react';
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
  TextField,
} from '@mui/material';
import { performBulkAction } from '../utils/reviewQueue';

const DESTRUCTIVE_ACTIONS = ['decline', 'delete'];

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
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset any in-progress action when the dialog opens, so a primed destructive
  // confirmation can never carry over to a different selection.
  useEffect(() => {
    setAction('');
    setSelectedTier('');
    setSelectedReviewer('');
    setReason('');
    setConfirming(false);
    setError(null);
  }, [open]);

  const handleActionChange = (e) => {
    setAction(e.target.value);
    setSelectedTier('');
    setSelectedReviewer('');
    setReason('');
    setConfirming(false);
    setError(null);
  };

  const runAction = async () => {
    setLoading(true);
    setError(null);

    const options = {};
    if (action === 'accept') {
      options.tierId = selectedTier;
    }
    if (action === 'assign_reviewer') {
      options.reviewerId = selectedReviewer;
    }
    if (action === 'delete' && reason) {
      options.reason = reason;
    }

    const result = await performBulkAction(eventId, action, selectedIds, options);

    if (result.success) {
      setLoading(false);
      setAction('');
      setSelectedTier('');
      setSelectedReviewer('');
      setReason('');
      setConfirming(false);
      onSuccess?.(result);
      onClose();
    } else {
      setError(result.error);
      setLoading(false);
      setConfirming(false);
    }
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

    if (DESTRUCTIVE_ACTIONS.includes(action) && !confirming) {
      setError(null);
      setConfirming(true);
      return;
    }

    await runAction();
  };

  const getActionDescription = () => {
    const descriptions = {
      accept: `Accept ${selectedIds.length} application(s)`,
      decline: `Decline ${selectedIds.length} application(s)`,
      waitlist: `Waitlist ${selectedIds.length} application(s)`,
      assign_reviewer: `Assign ${selectedIds.length} application(s) to reviewer`,
      delete: `Delete ${selectedIds.length} application(s)`,
    };
    return descriptions[action] || '';
  };

  const getConfirmationMessage = () => {
    if (action === 'delete') {
      return `You are about to delete ${selectedIds.length} selected application(s). They will be removed from active views but kept for audit purposes. This includes applications already accepted.`;
    }
    if (action === 'decline') {
      return `You are about to decline ${selectedIds.length} selected application(s). This includes applications already accepted, whose registration and role assignments will be reversed.`;
    }
    return '';
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
              <MenuItem value="delete">Delete</MenuItem>
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

          {/* Reason (for delete action) */}
          {action === 'delete' && (
            <TextField
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              fullWidth
              multiline
              minRows={2}
            />
          )}

          {/* Action Summary */}
          {action && !confirming && (
            <Alert severity="info">
              {getActionDescription()}
            </Alert>
          )}

          {/* Destructive-action confirmation */}
          {confirming && (
            <Alert severity="warning">
              {getConfirmationMessage()}
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
          color={confirming ? 'error' : 'primary'}
          disabled={loading || !action}
        >
          {loading ? <CircularProgress size={24} /> : confirming ? 'Confirm' : 'Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkActionsDialog;
