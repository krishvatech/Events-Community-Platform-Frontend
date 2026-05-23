import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  Divider,
  Checkbox,
  FormControlLabel,
  Grid,
  Chip,
} from '@mui/material';
import { apiClient } from '../utils/api';
import SubmissionModePicker from './SubmissionModePicker';
import ApplicationConfirmation from './ApplicationConfirmation';

/**
 * MultiTrackApplicationForm Component
 * Main form for multi-track applications with:
 * - Applicant identity (once)
 * - Per-track submission mode selection
 * - Per-track form fields
 * - File uploads
 * Phase 7: Multi-track application support.
 * Phase 8: Fine-grained pre-approval per event × track × submission_mode
 */
const MultiTrackApplicationForm = ({
  eventId,
  selectedTracks,
  onSuccess,
  event,
}) => {
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Applicant data (shared)
  const [applicantData, setApplicantData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
    company_name: '',
    linkedin_url: '',
    comments: '',
  });

  // Track-specific data
  const [trackData, setTrackData] = useState({});
  const [submissionModes, setSubmissionModes] = useState({});
  const [tracks, setTracks] = useState({});
  const [modeSelectionStep, setModeSelectionStep] = useState(null);

  // Phase 8: Pre-approval state
  const [preapprovalCode, setPreapprovalCode] = useState('');
  const [codeCheckError, setCodeCheckError] = useState(null);
  const [trackPreapprovalState, setTrackPreapprovalState] = useState({});
  const [isCheckingPreapproval, setIsCheckingPreapproval] = useState(false);

  // Load user data if authenticated
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setApplicantData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        first_name: user.first_name || prev.first_name,
        last_name: user.last_name || prev.last_name,
      }));
    }
  }, []);

  // Load track details
  useEffect(() => {
    loadTracks();
  }, [eventId, selectedTracks]);

  // Phase 8: Check email pre-approval for all tracks when email changes
  useEffect(() => {
    if (applicantData.email && event?.preapproval_allowlist_enabled) {
      checkEmailPreapprovalForAllTracks(applicantData.email);
    }
  }, [applicantData.email, selectedTracks, submissionModes]);

  const loadTracks = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      };

      const trackMap = {};
      const modeMap = {};

      for (const trackId of selectedTracks) {
        try {
          const response = await apiClient.get(
            `/events/${eventId}/application-tracks/${trackId}/`
          );
          const track = response.data;
          trackMap[trackId] = track;

          // Initialize track data
          if (!trackData[trackId]) {
            setTrackData((prev) => ({
              ...prev,
              [trackId]: {
                submission_mode: '',
                tier_preference_id: null,
                form_answers: {},
                file_uploads: {},
                // Mode-specific fields
                nominator_name: '',
                nominator_email: '',
                nominee_name: '',
                nominee_email: '',
                nominee_details: {},
                sponsor_organization: '',
              },
            }));
          }

          // Set available modes
          if (track.enabled_submission_modes) {
            modeMap[trackId] = track.enabled_submission_modes;

            // Auto-select single mode
            if (track.enabled_submission_modes.length === 1) {
              setSubmissionModes((prev) => ({
                ...prev,
                [trackId]: track.enabled_submission_modes[0],
              }));
            }
          }
        } catch (error) {
          console.error(`Error loading track ${trackId}:`, error);
        }
      }

      setTracks(trackMap);
    } catch (error) {
      setSubmitError('Failed to load tracks');
      console.error('Error loading tracks:', error);
    }
  };

  // Phase 8: Check pre-approval code for all tracks
  const checkPreapprovalCodeForAllTracks = async () => {
    if (!preapprovalCode.trim()) {
      setCodeCheckError('Please enter a pre-approval code');
      return;
    }

    try {
      setIsCheckingPreapproval(true);
      setCodeCheckError(null);

      for (const trackId of selectedTracks) {
        const mode = submissionModes[trackId] || 'self_submission';
        try {
          const response = await apiClient.post(
            `/events/${eventId}/preapproval/check-code/`,
            {
              code: preapprovalCode.trim(),
              track_id: trackId,
              submission_mode: mode,
            }
          );

          if (response.data.preapproved) {
            setTrackPreapprovalState((prev) => ({
              ...prev,
              [trackId]: {
                codePreapproved: true,
                emailPreapproved: prev[trackId]?.emailPreapproved || false,
                source: 'code',
              },
            }));
          }
        } catch (error) {
          console.error(`Code check failed for track ${trackId}:`, error);
        }
      }
    } finally {
      setIsCheckingPreapproval(false);
    }
  };

  // Phase 8: Check email pre-approval for all tracks
  const checkEmailPreapprovalForAllTracks = async (email) => {
    if (!email) return;

    try {
      for (const trackId of selectedTracks) {
        const mode = submissionModes[trackId] || 'self_submission';
        try {
          const response = await apiClient.post(
            `/events/${eventId}/preapproval/check-email/`,
            {
              email,
              track_id: trackId,
              submission_mode: mode,
            }
          );

          if (response.data.preapproved) {
            setTrackPreapprovalState((prev) => ({
              ...prev,
              [trackId]: {
                codePreapproved: prev[trackId]?.codePreapproved || false,
                emailPreapproved: true,
                source: 'email',
              },
            }));

            // Prefill names if not already filled
            if (!applicantData.first_name) {
              setApplicantData((prev) => ({
                ...prev,
                first_name: response.data.first_name || prev.first_name,
              }));
            }
            if (!applicantData.last_name) {
              setApplicantData((prev) => ({
                ...prev,
                last_name: response.data.last_name || prev.last_name,
              }));
            }
          }
        } catch (error) {
          // Email not found - this is not an error, just means not pre-approved
          console.debug(`Email not in pre-approval allowlist for track ${trackId}`);
        }
      }
    } catch (error) {
      console.error('Error checking email pre-approval:', error);
    }
  };

  // Phase 8: Check if all tracks are pre-approved
  const allTracksPreapproved = () => {
    return selectedTracks.every((trackId) => {
      const state = trackPreapprovalState[trackId];
      return state && (state.codePreapproved || state.emailPreapproved);
    });
  };

  // Phase 8: Check if some tracks are pre-approved
  const someTracksPreapproved = () => {
    return selectedTracks.some((trackId) => {
      const state = trackPreapprovalState[trackId];
      return state && (state.codePreapproved || state.emailPreapproved);
    });
  };

  // Phase 8: Get dynamic CTA text based on pre-approval state
  const getCtaText = () => {
    if (allTracksPreapproved()) return 'Register';
    if (someTracksPreapproved()) return 'Submit';
    return 'Submit Application';
  };

  const handleApplicantChange = (field, value) => {
    setApplicantData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTrackDataChange = (trackId, field, value) => {
    setTrackData((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        [field]: value,
      },
    }));
  };

  const handleModeSelected = (trackId, mode) => {
    setSubmissionModes((prev) => ({
      ...prev,
      [trackId]: mode,
    }));
    setModeSelectionStep(null);
    handleTrackDataChange(trackId, 'submission_mode', mode);
    moveToNextStep();
  };

  const validateApplicantData = () => {
    const { first_name, last_name, email } = applicantData;
    if (!first_name || !last_name || !email) {
      setSubmitError('Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateApplicantData()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Build track_applications array with Phase 8 pre-approval info
      const track_applications = selectedTracks.map((trackId) => ({
        track_id: trackId,
        submission_mode: submissionModes[trackId] || 'self_submission',
        pre_approved_via: trackPreapprovalState[trackId]?.source || null,
        ...trackData[trackId],
      }));

      const payload = {
        ...applicantData,
        // Phase 8: Include pre-approval code if provided
        preapproved_code: preapprovalCode.trim() || undefined,
        track_applications,
      };

      const response = await apiClient.post(
        `/events/${eventId}/apply/`,
        payload
      );

      if (onSuccess) {
        onSuccess(response.data);
      } else {
        // Show confirmation page
        setActiveStep(selectedTracks.length + 2); // Skip to confirmation
      }
    } catch (error) {
      setSubmitError(
        error.response?.data?.detail ||
          'Failed to submit application. Please try again.'
      );
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToNextStep = () => {
    setActiveStep((prev) => prev + 1);
  };

  const moveToPreviousStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Check if we need mode selection for current track
  const currentTrackIdx = activeStep - 1;
  const currentTrackId =
    currentTrackIdx >= 0 && currentTrackIdx < selectedTracks.length
      ? selectedTracks[currentTrackIdx]
      : null;

  if (
    currentTrackId &&
    modeSelectionStep === null &&
    !submissionModes[currentTrackId] &&
    tracks[currentTrackId]?.enabled_submission_modes?.length > 1
  ) {
    return (
      <SubmissionModePicker
        track={tracks[currentTrackId]}
        onModeSelected={(mode) => handleModeSelected(currentTrackId, mode)}
        onCancel={moveToPreviousStep}
      />
    );
  }

  // Render confirmation
  if (activeStep >= selectedTracks.length + 1) {
    return (
      <ApplicationConfirmation
        application={applicantData}
        trackApplications={selectedTracks.map((trackId) => ({
          id: trackId,
          track_id: trackId,
          track_label: tracks[trackId]?.label,
          submission_mode: submissionModes[trackId],
          status: 'pending',
          confirmation_page_content: tracks[trackId]?.confirmation_page_content,
        }))}
        eventTitle={event?.title || 'Event'}
      />
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {submitError && <Alert severity="error" sx={{ mb: 3 }}>{submitError}</Alert>}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Applicant Info</StepLabel>
        </Step>
        {selectedTracks.map((trackId, idx) => (
          <Step key={trackId}>
            <StepLabel>{tracks[trackId]?.label || `Track ${idx + 1}`}</StepLabel>
          </Step>
        ))}
        <Step>
          <StepLabel>Review &amp; Submit</StepLabel>
        </Step>
      </Stepper>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          {activeStep === 0 ? (
            // Step 0: Applicant Identity + Phase 8 Pre-approval
            <Box>
              <Typography variant="h6" gutterBottom>
                Your Information
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                This information will be shared across all your applications.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    value={applicantData.first_name}
                    onChange={(e) => handleApplicantChange('first_name', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    value={applicantData.last_name}
                    onChange={(e) => handleApplicantChange('last_name', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email *"
                    type="email"
                    value={applicantData.email}
                    onChange={(e) => handleApplicantChange('email', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Job Title"
                    value={applicantData.job_title}
                    onChange={(e) => handleApplicantChange('job_title', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={applicantData.company_name}
                    onChange={(e) => handleApplicantChange('company_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="LinkedIn URL"
                    type="url"
                    value={applicantData.linkedin_url}
                    onChange={(e) => handleApplicantChange('linkedin_url', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Comments"
                    multiline
                    rows={3}
                    value={applicantData.comments}
                    onChange={(e) => handleApplicantChange('comments', e.target.value)}
                  />
                </Grid>

                {/* Phase 8: Pre-approval Code Input */}
                {event?.preapproval_code_enabled && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Pre-Approval Code (Optional)
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                        If you have a pre-approval code, enter it below.
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Pre-Approval Code"
                        value={preapprovalCode}
                        onChange={(e) => setPreapprovalCode(e.target.value)}
                        disabled={isCheckingPreapproval}
                        error={!!codeCheckError}
                        helperText={codeCheckError}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        onClick={checkPreapprovalCodeForAllTracks}
                        disabled={!preapprovalCode.trim() || isCheckingPreapproval}
                        startIcon={isCheckingPreapproval ? <CircularProgress size={20} /> : null}
                      >
                        {isCheckingPreapproval ? 'Checking...' : 'Verify Code'}
                      </Button>
                    </Grid>

                    {/* Pre-approval Status Alerts */}
                    {allTracksPreapproved() && (
                      <Grid item xs={12}>
                        <Alert severity="success">
                          ✅ All tracks are pre-approved! You can register directly.
                        </Alert>
                      </Grid>
                    )}
                    {someTracksPreapproved() && !allTracksPreapproved() && (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          ℹ️ Some of your selected tracks are pre-approved.
                        </Alert>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </Box>
          ) : activeStep <= selectedTracks.length ? (
            // Track-specific steps
            <Box>
              {currentTrackId && tracks[currentTrackId] && (
                <>
                  <Typography variant="h6" gutterBottom>
                    {tracks[currentTrackId].label}
                  </Typography>
                  {tracks[currentTrackId].short_description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {tracks[currentTrackId].short_description}
                    </Typography>
                  )}

                  {/* Form header notice from Phase 6 */}
                  {tracks[currentTrackId].form_header_notice && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {tracks[currentTrackId].form_header_notice}
                    </Alert>
                  )}

                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Submission Mode: <strong>{submissionModes[currentTrackId]}</strong>
                  </Typography>

                  <Typography variant="body2" color="textSecondary">
                    Additional fields for this track would appear here.
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            // Review and Submit
            <Box>
              <Typography variant="h6" gutterBottom>
                Review Your Application
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Please review your information before submitting.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Applicant Information
                </Typography>
                <Typography variant="body2">
                  {applicantData.first_name} {applicantData.last_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {applicantData.email}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Applied Tracks
                </Typography>
                {selectedTracks.map((trackId) => {
                  const trackState = trackPreapprovalState[trackId];
                  const isPreapproved = trackState && (trackState.codePreapproved || trackState.emailPreapproved);
                  return (
                    <Box key={trackId} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {tracks[trackId]?.label}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Mode: {submissionModes[trackId] || 'Not selected'}
                        </Typography>
                      </Box>
                      {/* Phase 8: Pre-approval badge */}
                      {isPreapproved && (
                        <Chip
                          label="Pre-Approved"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          disabled={activeStep === 0 || isSubmitting}
          onClick={moveToPreviousStep}
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep < selectedTracks.length ? (
            <Button
              variant="contained"
              onClick={moveToNextStep}
              disabled={isSubmitting}
            >
              Next
            </Button>
          ) : activeStep === selectedTracks.length ? (
            <Button
              variant="contained"
              onClick={moveToNextStep}
              disabled={!validateApplicantData() || isSubmitting}
            >
              Review
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting ? `${getCtaText()}...` : getCtaText()}
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default MultiTrackApplicationForm;
