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
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Chip,
} from '@mui/material';
import { apiClient } from '../utils/api';
import {
  formatSubmissionMode,
  getTrackDescription,
  getApplicationIntroText,
  getAcceptanceMessage,
} from '../utils/trackFormatting';
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
  const [submittedApplication, setSubmittedApplication] = useState(null);

  // Applicant data (shared)
  const [applicantData, setApplicantData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
    company_name: '',
    location: '',
    phone: '',
    linkedin_url: '',
    comments: '',
  });

  // Track-specific data
  const [trackData, setTrackData] = useState({});
  const [submissionModes, setSubmissionModes] = useState({});
  const [tracks, setTracks] = useState({});
  const [pricingTiers, setPricingTiers] = useState({});
  const [formFields, setFormFields] = useState({});
  const [modeSelectionStep, setModeSelectionStep] = useState(null);

  // Phase 8: Pre-approval state (per-track for confirmed mode, global for backward compatibility)
  const [trackPreapprovalState, setTrackPreapprovalState] = useState({});
  const [isCheckingPreapproval, setIsCheckingPreapproval] = useState(false);
  const [trackCodeErrors, setTrackCodeErrors] = useState({});

  // Load user data if authenticated
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data } = await apiClient.get('/auth/me/profile/');
      const primaryPhone = data.links?.contact?.phones?.find(
        (phone) => phone?.number && String(phone.number).trim()
      )?.number;
      setApplicantData((prev) => ({
        ...prev,
        first_name: data.first_name || prev.first_name,
        last_name: data.last_name || prev.last_name,
        email: data.email || prev.email,
        job_title: data.job_title || prev.job_title,
        company_name: data.company_name || data.company || prev.company_name,
        location: data.location || prev.location,
        phone: primaryPhone || prev.phone,
        linkedin_url: data.linkedin_url || prev.linkedin_url,
      }));
    } catch {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      try {
        const user = JSON.parse(userStr);
        setApplicantData((prev) => ({
          ...prev,
          email: user.email || prev.email,
          first_name: user.first_name || prev.first_name,
          last_name: user.last_name || prev.last_name,
        }));
      } catch {
        // Non-fatal: user can fill the form manually.
      }
    }
  };

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
      const trackMap = {};
      const tiersMap = {};
      const fieldsMap = {};

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
            // Auto-select single mode
            if (track.enabled_submission_modes.length === 1) {
              setSubmissionModes((prev) => ({
                ...prev,
                [trackId]: track.enabled_submission_modes[0],
              }));
            }
          }

          // Load pricing tiers for this track
          try {
            const tiersResponse = await apiClient.get(
              `/events/${eventId}/application-tracks/${trackId}/pricing-tiers/`
            );
            const tiersList = Array.isArray(tiersResponse.data)
              ? tiersResponse.data
              : tiersResponse.data.results || [];
            tiersMap[trackId] = tiersList;

            // Auto-select single tier
            if (tiersList.length === 1) {
              setTrackData((prev) => ({
                ...prev,
                [trackId]: {
                  ...prev[trackId],
                  tier_preference_id: tiersList[0].id,
                },
              }));
            }
          } catch (error) {
            console.debug(`No pricing tiers for track ${trackId}`);
            tiersMap[trackId] = [];
          }

          // Load dynamic per-track application fields.
          try {
            const fieldsResponse = await apiClient.get(
              `/events/${eventId}/application-tracks/${trackId}/form-fields/`
            );
            fieldsMap[trackId] = Array.isArray(fieldsResponse.data)
              ? fieldsResponse.data
              : fieldsResponse.data.results || [];
          } catch (error) {
            console.debug(`No form fields for track ${trackId}`);
            fieldsMap[trackId] = [];
          }
        } catch (error) {
          console.error(`Error loading track ${trackId}:`, error);
        }
      }

      setTracks(trackMap);
      setPricingTiers(tiersMap);
      setFormFields(fieldsMap);
    } catch (error) {
      setSubmitError('Failed to load tracks');
      console.error('Error loading tracks:', error);
    }
  };

  // Phase 8: Check pre-approval code for a specific track (called on blur/verify)
  const checkPreapprovalCodeForTrack = async (trackId, code) => {
    if (!code.trim()) {
      return;
    }

    try {
      const mode = submissionModes[trackId] || 'self_submission';
      const response = await apiClient.post(
        `/events/${eventId}/preapproval/check-code/`,
        {
          code: code.trim(),
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
      console.debug(`Code check failed for track ${trackId}:`, error);
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
  };

  const validateApplicantData = () => {
    if (!isApplicantDataValid()) {
      setSubmitError('Please fill in all required fields');
      return false;
    }
    setSubmitError(null);
    return true;
  };

  const isApplicantDataValid = () => {
    const { first_name, last_name, email, job_title, company_name, location, phone } = applicantData;
    return Boolean(
      first_name?.trim() &&
      last_name?.trim() &&
      email?.trim() &&
      job_title?.trim() &&
      company_name?.trim() &&
      location?.trim() &&
      phone?.trim()
    );
  };

  const saveRegistrationProfile = async () => {
    await apiClient.post('/events/save-lead-gen-fields/', {
      first_name: applicantData.first_name.trim(),
      last_name: applicantData.last_name.trim(),
      email: applicantData.email.trim(),
      job_title: applicantData.job_title.trim(),
      company: applicantData.company_name.trim(),
      location: applicantData.location.trim(),
      phone: applicantData.phone.trim(),
    });
  };

  const extractFieldsFromFormSchema = (track, submissionMode) => {
    if (!track?.form_schema) return [];

    const modeSchema = track.form_schema[submissionMode];
    if (!modeSchema) return [];

    const fields = [];
    (modeSchema.sections || []).forEach((section) => {
      (section.fields || []).forEach((field) => {
        fields.push({
          id: field.id,
          label: field.label,
          required: field.required || false,
          type: field.type || 'text',
          field_type: field.type || 'text',
          help_text: field.help_text || '',
          placeholder: field.placeholder || '',
          options: field.options || [],
        });
      });
    });

    return fields;
  };

  const getSubmissionModeForTrack = (trackId) => (
    submissionModes[trackId] || trackData[trackId]?.submission_mode || 'self_submission'
  );

  const getTrackModeData = (trackId, field) => (
    trackData[trackId]?.[field] || ''
  );

  const getNomineeDetails = (trackId) => (
    trackData[trackId]?.nominee_details || {}
  );

  const handleNomineeDetailChange = (trackId, field, value) => {
    handleTrackDataChange(trackId, 'nominee_details', {
      ...getNomineeDetails(trackId),
      [field]: value,
    });
  };

  const getVisibleFieldsForTrack = (trackId) => {
    const mode = getSubmissionModeForTrack(trackId);
    const track = tracks[trackId];

    // First try to get fields from form_schema
    const schemaFields = extractFieldsFromFormSchema(track, mode);

    if (schemaFields.length > 0) {
      return schemaFields;
    }

    // Fallback to custom form fields
    return (formFields[trackId] || []).filter((field) => {
      if (!field?.visibility_per_mode || Object.keys(field.visibility_per_mode).length === 0) {
        return true;
      }
      return field.visibility_per_mode[mode] !== false;
    });
  };

  const getFieldAnswer = (trackId, field) => {
    const key = String(field.id);
    return trackData[trackId]?.form_answers?.[key] ?? (
      field.field_type === 'checkbox' ? false : field.field_type === 'multi_select' || field.field_type === 'checkbox_group' ? [] : ''
    );
  };

  const handleFieldAnswerChange = (trackId, field, value) => {
    const key = String(field.id);
    setTrackData((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        form_answers: {
          ...(prev[trackId]?.form_answers || {}),
          [key]: value,
        },
      },
    }));
  };

  const isEmptyAnswer = (value) => (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    value === false
  );

  const validateModeSpecificFields = (trackId) => {
    const mode = getSubmissionModeForTrack(trackId);
    const trackLabel = tracks[trackId]?.label || 'selected track';

    // Validate mode-specific required fields
    if (mode === 'confirmed') {
      const preApprovalCode = (trackData[trackId]?.pre_approval_code || '').trim();
      const sponsorOrg = (trackData[trackId]?.sponsor_organization || '').trim();

      if (!preApprovalCode) {
        setSubmitError('Pre-Approval Code is required for sponsor staff applications');
        return false;
      }
      if (!sponsorOrg) {
        setSubmitError('Sponsor / Partner Organisation is required for sponsor staff applications');
        return false;
      }
    }

    if (mode === 'third_party_nomination') {
      const requiredFields = [
        ['nominator_name', 'nominator name'],
        ['nominator_email', 'nominator email'],
        ['nominee_name', 'recommended expert name'],
        ['nominee_email', 'recommended expert email'],
      ];
      const missingField = requiredFields.find(([field]) => !getTrackModeData(trackId, field).trim());

      if (missingField) {
        setSubmitError(`Please enter the ${missingField[1]} for ${trackLabel}.`);
        return false;
      }
    }

    return true;
  };

  const validateTrackStep = (trackId) => {
    if (!validateModeSpecificFields(trackId)) {
      return false;
    }

    // Check if all required fields are filled (including form_schema fields)
    const requiredMissing = getVisibleFieldsForTrack(trackId).find(
      (field) => field.required && isEmptyAnswer(getFieldAnswer(trackId, field))
    );

    if (requiredMissing) {
      setSubmitError(`Please complete required field: ${requiredMissing.label}`);
      return false;
    }

    setSubmitError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateApplicantData()) {
      return;
    }
    const invalidTrack = selectedTracks.find((trackId) => !validateTrackStep(trackId));
    if (invalidTrack) {
      const invalidTrackIndex = selectedTracks.indexOf(invalidTrack);
      setActiveStep(invalidTrackIndex + 1);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Build track_applications array with per-track pre-approval code
      const track_applications = selectedTracks.map((trackId) => {
        const perTrackData = trackData[trackId] || {};
        const { submission_mode: ignoredSubmissionMode, ...safeTrackData } = perTrackData;
        const submissionMode = getSubmissionModeForTrack(trackId) || ignoredSubmissionMode;

        // For confirmed mode, include the per-track pre_approval_code
        const trackPayload = {
          ...safeTrackData,
          track_id: trackId,
          submission_mode: submissionMode,
        };

        if (submissionMode === 'confirmed' && perTrackData.pre_approval_code) {
          trackPayload.pre_approval_code = perTrackData.pre_approval_code;
        }

        return trackPayload;
      });

      // Extract form_schema fields and include them as top-level payload for validation.
      // Keep the /apply/ payload limited to EventApplication fields; profile-only
      // fields such as location and phone are saved through save-lead-gen-fields.
      const payloadFields = {
        first_name: applicantData.first_name,
        last_name: applicantData.last_name,
        email: applicantData.email,
        job_title: applicantData.job_title,
        company_name: applicantData.company_name,
        linkedin_url: applicantData.linkedin_url,
        comments: applicantData.comments,
      };
      selectedTracks.forEach((trackId) => {
        const mode = getSubmissionModeForTrack(trackId);
        const track = tracks[trackId];
        const schemaFields = extractFieldsFromFormSchema(track, mode);

        // Include form_schema fields in payload for ALL modes (not just third_party_nomination)
        schemaFields.forEach((field) => {
          const answer = trackData[trackId]?.form_answers?.[field.id];
          // Include even if empty/undefined for validation to catch missing required fields
          payloadFields[field.id] = answer || '';
        });
      });

      const nominationTrackId = selectedTracks.find(
        (trackId) => getSubmissionModeForTrack(trackId) === 'third_party_nomination'
      );
      const confirmedTrackId = selectedTracks.find(
        (trackId) => getSubmissionModeForTrack(trackId) === 'confirmed'
      );
      const nominationData = nominationTrackId ? trackData[nominationTrackId] || {} : {};
      const confirmedData = confirmedTrackId ? trackData[confirmedTrackId] || {} : {};

      const payload = {
        ...payloadFields,
        ...(nominationTrackId && {
          nominator_name: nominationData.nominator_name || '',
          nominator_email: nominationData.nominator_email || '',
          nominee_name: nominationData.nominee_name || '',
          nominee_email: nominationData.nominee_email || '',
          nominee_details: nominationData.nominee_details || {},
        }),
        ...(confirmedTrackId && {
          sponsor_organization: confirmedData.sponsor_organization || '',
        }),
        track_applications,
      };

      // Debug: Log payload to verify sponsor_organization and pre_approval_code are included
      console.log('📋 Submitting application payload:', {
        applicant: {
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email,
        },
        preapproved_code: payload.preapproved_code,
        track_applications: payload.track_applications.map((ta) => ({
          track_id: ta.track_id,
          submission_mode: ta.submission_mode,
          sponsor_organization: ta.sponsor_organization,
          pre_approval_code: ta.pre_approval_code,
          form_answers_count: Object.keys(ta.form_answers || {}).length,
        })),
      });

      const response = await apiClient.post(
        `/events/${eventId}/apply/`,
        payload
      );

      console.log('✅ Application submitted successfully:', response.data);

      if (onSuccess) {
        onSuccess(response.data);
      } else {
        setSubmittedApplication(response.data);
      }
    } catch (error) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      const codeError = error.response?.data?.code_error;
      const trackId = error.response?.data?.track_id;
      const missingFields = error.response?.data?.missing_fields;
      const responseData = error.response?.data;

      let errorMessage = 'Failed to submit application. Please try again.';

      if (codeError && trackId) {
        // Pre-approval code error for a specific track - show near the field
        const userFriendlyError = {
          'invalid': 'The pre-approval code you entered is invalid.',
          'revoked': 'The pre-approval code has been revoked and can no longer be used.',
          'used': 'This pre-approval code has already been used.',
          'missing': 'Pre-approval code is required for this submission mode.',
          'wrong_track_mode': 'The pre-approval code is not valid for this track or submission mode.',
        }[codeError] || detail;

        // Store error per track so it shows near the code field
        setTrackCodeErrors((prev) => ({
          ...prev,
          [trackId]: userFriendlyError,
        }));

        // Also set form-level error
        errorMessage = userFriendlyError;

        // Keep user on the current track step
        const trackIndex = selectedTracks.indexOf(trackId);
        if (trackIndex >= 0) {
          setActiveStep(trackIndex + 1); // +1 because step 0 is applicant info
        }
      } else if (Array.isArray(missingFields) && missingFields.length > 0) {
        // Handle missing field errors
        const fieldList = missingFields.join(', ');
        errorMessage = `Missing required fields: ${fieldList}`;
      } else if (missingFields && typeof missingFields === 'object' && Object.keys(missingFields).length > 0) {
        const fieldList = Object.values(missingFields).join(', ');
        errorMessage = `Please complete your registration profile: ${fieldList}`;
      } else if (detail) {
        // Use backend error message if available
        errorMessage = detail;
      } else if (status === 409) {
        // Fallback for 409 Conflict (deprecated, using 400 now)
        errorMessage = 'You have already applied to this event. Please check your application status.';
      } else if (status === 400) {
        // Handle 400 errors - could be validation or duplicate application
        errorMessage = 'Unable to submit application. ' + (detail || 'Please check your information and try again.');
      } else if (status === 401) {
        errorMessage = 'You must be logged in to apply for this event.';
      } else if (status === 404) {
        errorMessage = 'Event or application track not found.';
      }

      setSubmitError(errorMessage);
      console.error('❌ Error submitting application:', {
        status,
        detail,
        missingFields,
        payload,
        error: error.response?.data,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToNextStep = () => {
    if (activeStep === 0 && !validateApplicantData()) {
      return;
    }
    if (currentTrackId && !validateTrackStep(currentTrackId)) {
      return;
    }
    // Clear errors when navigating away
    setSubmitError(null);
    if (currentTrackId) {
      setTrackCodeErrors((prev) => {
        const updated = { ...prev };
        delete updated[currentTrackId];
        return updated;
      });
    }
    setActiveStep((prev) => prev + 1);
  };

  const moveToPreviousStep = () => {
    // Clear errors when navigating away
    setSubmitError(null);
    if (currentTrackId) {
      setTrackCodeErrors((prev) => {
        const updated = { ...prev };
        delete updated[currentTrackId];
        return updated;
      });
    }
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

  const renderTrackField = (trackId, field) => {
    const value = getFieldAnswer(trackId, field);
    const commonProps = {
      fullWidth: true,
      label: `${field.label}${field.required ? ' *' : ''}`,
      helperText: field.help_text || '',
      placeholder: field.placeholder || '',
      value,
      required: field.required,
      onChange: (event) => handleFieldAnswerChange(trackId, field, event.target.value),
    };

    const normalizedOptions = Array.isArray(field.options) ? field.options : [];
    const options = normalizedOptions.map((option) => (
      typeof option === 'string'
        ? { label: option, value: option }
        : { label: option.label ?? option.value, value: option.value ?? option.label }
    ));

    switch (field.field_type) {
      case 'long_text':
        return <TextField {...commonProps} multiline rows={4} />;
      case 'number':
        return <TextField {...commonProps} type="number" />;
      case 'email':
        return <TextField {...commonProps} type="email" />;
      case 'url':
        return <TextField {...commonProps} type="url" />;
      case 'phone':
        return <TextField {...commonProps} type="tel" />;
      case 'date':
        return <TextField {...commonProps} type="date" InputLabelProps={{ shrink: true }} />;
      case 'select':
      case 'radio_group':
        return (
          <FormControl fullWidth required={field.required} size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              label={field.label}
              onChange={(event) => handleFieldAnswerChange(trackId, field, event.target.value)}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {field.help_text && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                {field.help_text}
              </Typography>
            )}
          </FormControl>
        );
      case 'multi_select':
      case 'checkbox_group':
        return (
          <FormControl fullWidth required={field.required} size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              label={field.label}
              onChange={(event) => handleFieldAnswerChange(trackId, field, event.target.value)}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {field.help_text && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                {field.help_text}
              </Typography>
            )}
          </FormControl>
        );
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(event) => handleFieldAnswerChange(trackId, field, event.target.checked)}
              />
            }
            label={`${field.label}${field.required ? ' *' : ''}`}
          />
        );
      case 'file_upload':
        return (
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
              {field.label}{field.required ? ' *' : ''}
            </Typography>
            <Button variant="outlined" component="label">
              Choose File
              <input
                type="file"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  handleFieldAnswerChange(trackId, field, file ? file.name : '');
                }}
              />
            </Button>
            {value && (
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                {value}
              </Typography>
            )}
            {field.help_text && (
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                {field.help_text}
              </Typography>
            )}
          </Box>
        );
      case 'text':
      default:
        return <TextField {...commonProps} />;
    }
  };

  const renderModeSpecificFields = (trackId) => {
    const mode = getSubmissionModeForTrack(trackId);
    const track = tracks[trackId];
    const trackLabel = track?.label || 'selected track';

    if (mode === 'confirmed') {
      const codeError = trackCodeErrors[trackId];

      return (
        <Box sx={{ mt: 2, mb: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Confirmed {trackLabel} Application
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Pre-approval code and organization confirmation are required.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pre-Approval Code *"
                value={getTrackModeData(trackId, 'pre_approval_code') || ''}
                onChange={(event) => {
                  handleTrackDataChange(trackId, 'pre_approval_code', event.target.value);
                  // Clear error when user changes the field
                  if (codeError) {
                    setTrackCodeErrors((prev) => {
                      const updated = { ...prev };
                      delete updated[trackId];
                      return updated;
                    });
                  }
                }}
                onBlur={(event) => {
                  if (event.target.value.trim()) {
                    checkPreapprovalCodeForTrack(trackId, event.target.value);
                  }
                }}
                placeholder="Enter your pre-approval code"
                required
                error={!!codeError}
                helperText={codeError || 'You need a valid pre-approval code to apply as confirmed staff.'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sponsor / Partner Organization *"
                value={getTrackModeData(trackId, 'sponsor_organization') || ''}
                onChange={(event) => handleTrackDataChange(trackId, 'sponsor_organization', event.target.value)}
                placeholder="Name of your organization"
                required
                helperText="The organization you represent"
              />
            </Grid>
          </Grid>
        </Box>
      );
    }

    if (mode === 'third_party_nomination') {
      return (
        <Box sx={{ mt: 2, mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Third-party Nomination
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Tell us who is making the nomination and who they recommend for this track.
          </Typography>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
            NOMINATOR
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Nominator Name *"
                value={getTrackModeData(trackId, 'nominator_name')}
                onChange={(event) => handleTrackDataChange(trackId, 'nominator_name', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Nominator Email *"
                value={getTrackModeData(trackId, 'nominator_email')}
                onChange={(event) => handleTrackDataChange(trackId, 'nominator_email', event.target.value)}
              />
            </Grid>
          </Grid>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
            THE RECOMMENDED EXPERT
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Recommended Expert Name *"
                value={getTrackModeData(trackId, 'nominee_name')}
                onChange={(event) => handleTrackDataChange(trackId, 'nominee_name', event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Recommended Expert Email *"
                value={getTrackModeData(trackId, 'nominee_email')}
                onChange={(event) => handleTrackDataChange(trackId, 'nominee_email', event.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Why are you recommending this expert?"
                value={getNomineeDetails(trackId).recommendation || ''}
                onChange={(event) => handleNomineeDetailChange(trackId, 'recommendation', event.target.value)}
              />
            </Grid>
          </Grid>
        </Box>
      );
    }

    return null;
  };

  const reviewStep = selectedTracks.length + 1;

  // Render confirmation
  if (submittedApplication) {
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
                    label="Job Title *"
                    value={applicantData.job_title}
                    onChange={(e) => handleApplicantChange('job_title', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company *"
                    value={applicantData.company_name}
                    onChange={(e) => handleApplicantChange('company_name', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Country/Region *"
                    value={applicantData.location}
                    onChange={(e) => handleApplicantChange('location', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Contact Number *"
                    type="tel"
                    value={applicantData.phone}
                    onChange={(e) => handleApplicantChange('phone', e.target.value)}
                    required
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
              </Grid>
            </Box>
          ) : activeStep <= selectedTracks.length ? (
            // Track-specific steps
            <Box>
              {currentTrackId && tracks[currentTrackId] && (
                <>
                  {/* Track Info Section - User Friendly Display */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                      APPLICATION TRACK
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1976d2' }}>
                      {getApplicationIntroText(tracks[currentTrackId])}
                    </Typography>

                    {/* Track description */}
                    {getTrackDescription(tracks[currentTrackId]) && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                        {getTrackDescription(tracks[currentTrackId])}
                      </Typography>
                    )}

                    {/* Show what role they'll receive */}
                    {tracks[currentTrackId]?.role_mappings_on_acceptance && tracks[currentTrackId].role_mappings_on_acceptance.length > 0 && (
                      <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#fff3e0', borderRadius: 0.5, borderLeft: '4px solid #ff9800' }}>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                          {getAcceptanceMessage(tracks[currentTrackId].role_mappings_on_acceptance)}
                        </Typography>
                      </Box>
                    )}

                    {/* Submission mode */}
                    <Typography variant="caption" color="textSecondary" display="block">
                      <strong>Application Method:</strong> {formatSubmissionMode(getSubmissionModeForTrack(currentTrackId))}
                    </Typography>
                  </Box>

                  {renderModeSpecificFields(currentTrackId)}

                  {/* Tier Selection - if track has pricing tiers */}
                  {pricingTiers[currentTrackId] && pricingTiers[currentTrackId].length > 0 && (
                    <Box sx={{ mt: 2, mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        Pricing Tier Selection
                      </Typography>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Tier {pricingTiers[currentTrackId].length === 1 ? '(Auto-selected)' : ''}</InputLabel>
                        <Select
                          value={trackData[currentTrackId]?.tier_preference_id || ''}
                          label="Select Tier"
                          onChange={(e) =>
                            handleTrackDataChange(currentTrackId, 'tier_preference_id', e.target.value ? parseInt(e.target.value) : null)
                          }
                        >
                          {pricingTiers[currentTrackId].map((tier) => (
                            <MenuItem key={tier.id} value={tier.id}>
                              {tier.label}
                              {tier.price && tier.price > 0 ? ` - ${tier.currency || 'USD'} ${tier.price}` : ' (Free)'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Form header notice from Phase 6 */}
                  {tracks[currentTrackId].form_header_notice && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {tracks[currentTrackId].form_header_notice}
                    </Alert>
                  )}


                  {getVisibleFieldsForTrack(currentTrackId).length > 0 ? (
                    <Grid container spacing={2}>
                      {getVisibleFieldsForTrack(currentTrackId).map((field) => (
                        <Grid item xs={12} key={field.id}>
                          {renderTrackField(currentTrackId, field)}
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No additional questions are configured for this track.
                    </Typography>
                  )}
                </>
              )}
            </Box>
          ) : activeStep === reviewStep ? (
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
                <Typography variant="body2" color="textSecondary">
                  {[applicantData.job_title, applicantData.company_name].filter(Boolean).join(' at ')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {[applicantData.location, applicantData.phone].filter(Boolean).join(' · ')}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Applied Tracks
                </Typography>
                  {selectedTracks.map((trackId) => {
                  const trackState = trackPreapprovalState[trackId];
                  const mode = submissionModes[trackId] || 'self_submission';
                  const isPreapproved = trackState && (trackState.codePreapproved || trackState.emailPreapproved);
                  return (
                    <Box key={trackId} sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {tracks[trackId]?.label}
                          </Typography>
                        </Box>
                        {isPreapproved && (
                          <Chip
                            label="Pre-Approved"
                            color="success"
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Mode: {formatSubmissionMode(mode)}
                      </Typography>
                      {pricingTiers[trackId]?.length > 0 && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Tier: {
                            pricingTiers[trackId].find(
                              (tier) => Number(tier.id) === Number(trackData[trackId]?.tier_preference_id)
                            )?.label || 'No preference'
                          }
                        </Typography>
                      )}
                      {mode === 'confirmed' && (
                        <>
                          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                            Organization: {trackData[trackId]?.sponsor_organization || '(not provided)'}
                          </Typography>
                          {trackPreapprovalState[trackId]?.codePreapproved && (
                            <Chip
                              label="Code Verified"
                              size="small"
                              variant="outlined"
                              color="success"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : null}
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
          {activeStep < reviewStep ? (
            <Button
              variant="contained"
              onClick={moveToNextStep}
              disabled={(activeStep === 0 && !isApplicantDataValid()) || isSubmitting}
            >
              Next
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
