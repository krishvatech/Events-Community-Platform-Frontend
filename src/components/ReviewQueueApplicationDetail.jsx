import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Dialog as PaymentDialog,
} from '@mui/material';
import {
  acceptTrackApplication,
  declineTrackApplication,
  waitlistTrackApplication,
  formatDate,
  getStatusColor,
  fetchAttendeeOrigins,
  markOriginPaid
} from '../utils/reviewQueue';

const ReviewQueueApplicationDetail = ({
  open,
  onClose,
  application,
  event,
  tiers = [],
  onUpdate
}) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTier, setSelectedTier] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // FIX 4: Origins (payment) management
  const [origins, setOrigins] = useState([]);
  const [loadingOrigins, setLoadingOrigins] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Load origins when application detail opens and application is accepted
  useEffect(() => {
    if (open && application.status === 'accepted' && application.registration_id) {
      const loadOrigins = async () => {
        setLoadingOrigins(true);
        const result = await fetchAttendeeOrigins(event.id, application.registration_id);
        if (result.success) {
          setOrigins(result.data);
        }
        setLoadingOrigins(false);
      };
      loadOrigins();
    }
  }, [open, application, event?.id]);

  // Filter tiers by track
  const filteredTiers = useMemo(() => {
    if (!application?.track_id || !tiers || tiers.length === 0) {
      return tiers;
    }
    return tiers.filter(tier => tier.track_id === application.track_id);
  }, [application?.track_id, tiers]);

  // Determine preselected tier for accept action
  const preselectedTier = useMemo(() => {
    if (!application) return '';

    if (application.tier_preference_id) {
      return application.tier_preference_id;
    }
    // Find default tier from event's tracks
    if (event?.tracks && application.track_id) {
      const track = event.tracks.find(t => t.id === application.track_id);
      if (track?.default_tier_id) {
        return track.default_tier_id;
      }
    }
    return '';
  }, [application, event]);

  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setError(null);
    setSuccess(null);
    setNotes('');

    // Preselect tier for accept action
    if (action === 'accept') {
      setSelectedTier(preselectedTier);
    } else {
      setSelectedTier('');
    }
  };

  const handleTierChange = (e) => {
    setSelectedTier(e.target.value);
  };

  const handleEmailToggle = () => {
    setSendEmail(!sendEmail);
  };

  // FIX 4: Mark origin as paid
  const handleMarkOriginPaid = async () => {
    if (!selectedOrigin) return;

    setPaymentLoading(true);
    const result = await markOriginPaid(event.id, selectedOrigin.id, paymentReference);
    setPaymentLoading(false);

    if (result.success) {
      // Update origins list with new status
      setOrigins(origins.map(o =>
        o.id === selectedOrigin.id
          ? { ...o, origin_status: 'confirmed' }
          : o
      ));
      setPaymentDialogOpen(false);
      setSelectedOrigin(null);
      setPaymentReference('');
      setSuccess(`Origin marked as paid successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleExecuteDecision = async () => {
    if (!selectedAction) {
      setError('Please select an action');
      return;
    }

    if (selectedAction === 'accept' && !selectedTier) {
      setError('Please select a tier for acceptance');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    let result;
    try {
      if (selectedAction === 'accept') {
        result = await acceptTrackApplication(
          event.id,
          application.application_id,
          application.id,
          selectedTier,
          notes
        );
      } else if (selectedAction === 'decline') {
        result = await declineTrackApplication(
          event.id,
          application.application_id,
          application.id,
          sendEmail,
          notes
        );
      } else if (selectedAction === 'waitlist') {
        result = await waitlistTrackApplication(
          event.id,
          application.application_id,
          application.id,
          sendEmail,
          notes
        );
      }

      if (result.success) {
        setSuccess(`Application ${selectedAction} successfully!`);
        setTimeout(() => {
          onUpdate?.(result.data);
          onClose();
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const InfoSection = ({ title, children }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  const InfoRow = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body2" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  );

  const canSendEmail = !application?.opt_out_automated_communication;

  // Terminal states - no further action allowed
  // FIXED: Waitlisted is NOT terminal - admin can still accept or decline
  const terminalStatuses = ['accepted', 'declined', 'cancelled'];
  const isTerminalStatus = terminalStatuses.includes(application?.status);
  const isWaitlisted = application?.status === 'waitlisted';

  if (!application) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Application Details - {application.applicant_first_name} {application.applicant_last_name}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Applicant Section */}
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Applicant Information
          </Typography>
          <InfoRow label="Name" value={`${application.applicant_first_name} ${application.applicant_last_name}`} />
          <InfoRow label="Email" value={application.applicant_email} />
          <InfoRow label="Company" value={application.applicant_company} />
          <InfoRow label="Job Title" value={application.applicant_job_title} />
          {application.applicant_linkedin && (
            <InfoRow label="LinkedIn" value={application.applicant_linkedin} />
          )}
          {event?.attendee_marker_enabled && (
            <InfoRow
              label={event?.attendee_marker_label || 'Marker'}
              value={application.attendee_marker_value ? 'Yes' : 'No'}
            />
          )}
          {application.opt_out_automated_communication && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              ⚠️ Applicant has opted out of automated communication
            </Alert>
          )}
        </Paper>

        {/* Application Details */}
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Application Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Track" value={application.track_label} />
              <InfoRow label="Mode" value={application.submission_mode_display} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow label="Status" value={application.status_display} />
              <InfoRow label="Requested Tier" value={application.tier_label} />
            </Grid>
          </Grid>
        </Paper>

        {/* Pre-Approval Info */}
        {application.is_preapproved && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#e8f5e9' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Pre-Approval Information
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={`Pre-Approved via ${application.preapproval_source}`}
                color="success"
                variant="outlined"
              />
            </Box>
          </Paper>
        )}

        {/* Third-Party Nomination Info */}
        {application.submission_mode === 'third_party_nomination' && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f3e5f5' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Nominator Information
            </Typography>
            <InfoRow label="Nominator Name" value={application.nominator_name} />
            <InfoRow label="Nominator Email" value={application.nominator_email} />
            <InfoRow label="Nominee Name" value={application.nominee_name} />
            <InfoRow label="Nominee Email" value={application.nominee_email} />
          </Paper>
        )}

        {/* Confirmed Submission Info */}
        {application.submission_mode === 'confirmed' && application.sponsor_organization && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#e3f2fd' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sponsor Information
            </Typography>
            <InfoRow label="Organization" value={application.sponsor_organization} />
          </Paper>
        )}

        {/* Form Answers */}
        {application.form_answers && Object.keys(application.form_answers).length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Form Answers
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.entries(application.form_answers).map(([key, value]) => (
              <Box key={key} sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  {key}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        {/* Review Status */}
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Review Status
          </Typography>
          <InfoRow
            label="Reviewed By"
            value={application.reviewed_by_user
              ? `${application.reviewed_by_user.first_name} ${application.reviewed_by_user.last_name}`
              : 'Not reviewed'
            }
          />
          <InfoRow label="Reviewed At" value={formatDate(application.reviewed_at)} />

          {/* Phase 10: Show decision timestamps */}
          {application.accepted_at && (
            <InfoRow label="Accepted At" value={formatDate(application.accepted_at)} />
          )}
          {application.declined_at && (
            <InfoRow label="Declined At" value={formatDate(application.declined_at)} />
          )}
          {application.waitlisted_at && (
            <InfoRow label="Waitlisted At" value={formatDate(application.waitlisted_at)} />
          )}
        </Paper>

        {/* FIX 4: Attendee Origins (Payment Status) */}
        {application.status === 'accepted' && origins.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Attendee Origins (Payment Status)
            </Typography>
            {loadingOrigins ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Track</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Tier</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {origins.map((origin) => (
                    <TableRow key={origin.id}>
                      <TableCell>{origin.track_label || 'N/A'}</TableCell>
                      <TableCell>{origin.role_label || 'N/A'}</TableCell>
                      <TableCell>{origin.accepted_tier_label || 'N/A'}</TableCell>
                      <TableCell>
                        {origin.price || origin.tier_price
                          ? `${origin.currency || ''} ${origin.price || origin.tier_price}`.trim()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={origin.origin_status}
                          color={origin.origin_status === 'confirmed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {origin.origin_status === 'payment_pending' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => {
                              setSelectedOrigin(origin);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {/* Phase 10: Decision Actions */}
        <Divider sx={{ my: 2 }} />
        <Paper sx={{ p: 2, backgroundColor: isTerminalStatus ? '#f5f5f5' : '#fff3e0' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Application Decision
          </Typography>

          {isTerminalStatus ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              This application has already been <strong>{application.status_display}</strong>. No further action is allowed.
            </Alert>
          ) : (
            <>
              {isWaitlisted && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This application is currently <strong>waitlisted</strong>. You can accept or decline it.
                </Alert>
              )}

              {!selectedAction ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleActionSelect('accept')}
                    disabled={loading}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleActionSelect('decline')}
                    disabled={loading}
                  >
                    Decline
                  </Button>
                  {!isWaitlisted && (
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => handleActionSelect('waitlist')}
                      disabled={loading}
                    >
                      Waitlist
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`Action: ${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}`}
                      onDelete={() => setSelectedAction(null)}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {/* Tier Selection for Accept */}
                  {selectedAction === 'accept' && (
                    <>
                      {filteredTiers.length === 0 ? (
                        <Alert severity="warning">No tiers available for this track</Alert>
                      ) : (
                        <FormControl fullWidth>
                          <InputLabel>Tier * (for {application.track_label || 'this track'})</InputLabel>
                          <Select
                            value={selectedTier}
                            label={`Tier * (for ${application.track_label || 'this track'})`}
                            onChange={handleTierChange}
                            disabled={loading}
                          >
                            <MenuItem value="">Select a tier...</MenuItem>
                            {filteredTiers.map((tier) => (
                              <MenuItem key={tier.id} value={tier.id}>
                                {tier.label}
                                {tier.price && parseFloat(tier.price) > 0 ? ` - $${parseFloat(tier.price).toFixed(2)}` : ' (Free)'}
                                {preselectedTier === String(tier.id) && ' ✓ (Recommended)'}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </>
                  )}

                  {/* Email Notification Option */}
                  {(selectedAction === 'decline' || selectedAction === 'waitlist') && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={sendEmail && canSendEmail}
                          onChange={handleEmailToggle}
                          disabled={!canSendEmail || loading}
                        />
                      }
                      label={
                        canSendEmail
                          ? `Send ${selectedAction} email to applicant`
                          : 'Cannot send email (applicant opted out)'
                      }
                    />
                  )}

                  {/* Notes */}
                  <FormControl fullWidth>
                    <InputLabel>Notes (Optional)</InputLabel>
                    <Select
                      value="textarea"
                      disabled={loading}
                      renderValue={() => (
                        <textarea
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '8px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                          }}
                          placeholder="Add notes about this decision..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          disabled={loading}
                        />
                      )}
                    />
                  </FormControl>
                </Box>
              )}
            </>
          )}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
        {selectedAction && !isTerminalStatus && (
          <>
            <Button onClick={() => setSelectedAction(null)} disabled={loading}>
              Cancel Decision
            </Button>
            <Button
              onClick={handleExecuteDecision}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : `Confirm ${selectedAction.toUpperCase()}`}
            </Button>
          </>
        )}
      </DialogActions>

      {/* FIX 4: Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedOrigin(null);
          setPaymentReference('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mark Origin as Paid</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOrigin && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Track: <strong>{selectedOrigin.track_label}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Tier: <strong>{selectedOrigin.accepted_tier_label}</strong>
              </Typography>
              <TextField
                fullWidth
                label="Payment Reference (Optional)"
                placeholder="e.g., Invoice number, check number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                variant="outlined"
                disabled={paymentLoading}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPaymentDialogOpen(false);
              setSelectedOrigin(null);
              setPaymentReference('');
            }}
            disabled={paymentLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMarkOriginPaid}
            variant="contained"
            color="success"
            disabled={paymentLoading}
          >
            {paymentLoading ? <CircularProgress size={24} /> : 'Mark as Paid'}
          </Button>
        </DialogActions>
      </PaymentDialog>
    </Dialog>
  );
};

export default ReviewQueueApplicationDetail;
