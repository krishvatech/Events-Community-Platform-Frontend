import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Step,
  Stepper,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Divider,
} from "@mui/material";
import { apiClient } from "../utils/api";
import {
  formatSubmissionMode,
  getSubmissionModeDescription,
  getTrackDisplayName,
  getTrackDescription,
  getApplicationIntroText,
  getAcceptanceMessage,
} from "../utils/trackFormatting";

/**
 * EventApplicationForm
 *
 * Handles application submission for events with different submission modes.
 * Features:
 * - Track selection (if multiple tracks)
 * - Submission mode selection (if track has multiple modes)
 * - Mode-specific form fields
 * - Conditional field visibility based on submission mode
 */
export default function EventApplicationForm({ eventId, onSuccess }) {
  const [step, setStep] = useState(0); // 0: track selection, 1: mode selection, 2: form
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    track_id: null,
    track_key: null,
    submission_mode: "self_submission",
    tier_preference_id: null,
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
    company_name: "",
    linkedin_url: "",
    comments: "",
    attendee_marker_value: false,
    // Mode-specific fields
    nominator_name: "",
    nominator_email: "",
    nominee_name: "",
    nominee_email: "",
    nominee_details: {},
    sponsor_organization: "",
    preapproved_code: "",
  });

  // Load available tracks and pre-fill user profile for authenticated users
  useEffect(() => {
    loadTracks();
    loadUserProfile();
  }, [eventId]);

  const loadUserProfile = async () => {
    try {
      const { data } = await apiClient.get('/auth/me/profile/');
      setFormData((prev) => ({
        ...prev,
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        job_title: data.job_title || "",
        company_name: data.company || "",
        linkedin_url: data.linkedin_url || "",
      }));
    } catch (err) {
      console.error("Failed to load user profile:", err);
      // Not a fatal error - form can still be filled manually
    }
  };

  const loadTracks = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(
        `/events/${eventId}/application-tracks/?status=open`
      );
      // Handle both array and paginated response
      const tracksList = Array.isArray(data) ? data : (data.results || []);
      const activeTracks = tracksList.filter((t) => t.is_active);
      setTracks(activeTracks);
      setError(null);

      // Auto-select track if only one
      if (activeTracks.length === 1) {
        selectTrack(activeTracks[0]);
      }
    } catch (err) {
      console.error("Failed to load tracks:", err);
      setError("Failed to load application tracks");
    } finally {
      setLoading(false);
    }
  };

  const loadPricingTiers = async (trackId) => {
    try {
      const { data } = await apiClient.get(
        `/events/${eventId}/application-tracks/${trackId}/pricing-tiers/`
      );
      const tiersList = Array.isArray(data) ? data : (data.results || []);
      setPricingTiers(tiersList);

      // Auto-select first tier if only one
      if (tiersList.length === 1) {
        setFormData((prev) => ({
          ...prev,
          tier_preference_id: tiersList[0].id,
        }));
      }
    } catch (err) {
      console.error("Failed to load pricing tiers:", err);
      setPricingTiers([]);
    }
  };

  const selectTrack = (track) => {
    setSelectedTrack(track);
    setFormData((prev) => ({
      ...prev,
      track_id: track.id,
      track_key: track.key,
      tier_preference_id: null, // Reset tier when track changes
    }));

    // Load pricing tiers for this track
    loadPricingTiers(track.id);

    // Determine next step
    const modes = track.enabled_submission_modes || [];
    if (modes.length === 1) {
      // Single mode: auto-select and go to form
      setFormData((prev) => ({
        ...prev,
        submission_mode: modes[0],
      }));
      setStep(2);
    } else if (modes.length > 1) {
      // Multiple modes: show mode selector
      setStep(1);
    } else {
      // No modes: default to self_submission
      setFormData((prev) => ({
        ...prev,
        submission_mode: "self_submission",
      }));
      setStep(2);
    }
  };

  const selectMode = (mode) => {
    setFormData((prev) => ({
      ...prev,
      submission_mode: mode,
    }));
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    const { submission_mode } = formData;

    // Base validation
    if (!formData.email) {
      setError("Email is required");
      return false;
    }

    // Mode-specific validation
    switch (submission_mode) {
      case "self_submission":
      case "self_nomination":
        if (!formData.first_name || !formData.last_name) {
          setError("First and Last name are required");
          return false;
        }
        break;

      case "confirmed":
        if (!formData.first_name || !formData.last_name) {
          setError("First and Last name are required");
          return false;
        }
        if (!formData.sponsor_organization) {
          setError("Sponsor/Partner Organization is required for confirmed mode");
          return false;
        }
        break;

      case "third_party_nomination":
        if (!formData.nominator_name || !formData.nominator_email) {
          setError("Nominator name and email are required");
          return false;
        }
        if (!formData.nominee_name || !formData.nominee_email) {
          setError("Nominee name and email are required");
          return false;
        }
        break;

      default:
        break;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await apiClient.post(
        `/events/${eventId}/apply/`,
        formData
      );
      setError(null);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error("Failed to submit application:", err);
      setError(
        err.response?.data?.detail ||
        "Failed to submit application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Using formatSubmissionMode from trackFormatting utils instead of hardcoded labels

  const availableModes = selectedTrack?.enabled_submission_modes || [];

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Step 1: Track Selection */}
      {step === 0 && (
        <Card>
          <CardContent>
            <h2>Select Application Track</h2>
            <Grid container spacing={2}>
              {tracks.map((track) => (
                <Grid item xs={12} key={track.id}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => selectTrack(track)}
                    sx={{
                      p: 2,
                      textAlign: "left",
                      justifyContent: "flex-start",
                    }}
                  >
                    <Box>
                      <strong>{track.label}</strong>
                      {track.short_description && (
                        <Box sx={{ fontSize: "0.9rem", color: "#666" }}>
                          {track.short_description}
                        </Box>
                      )}
                    </Box>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mode Selection */}
      {step === 1 && selectedTrack && (
        <Card>
          <CardContent>
            <h2>Select Submission Mode</h2>
            <p>How would you like to apply for {selectedTrack.label}?</p>
            <Grid container spacing={2}>
              {availableModes.map((mode) => (
                <Grid item xs={12} key={mode}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => selectMode(mode)}
                    sx={{
                      p: 2,
                      textAlign: "left",
                      justifyContent: "flex-start",
                    }}
                  >
                    <Box>
                      <strong>{formatSubmissionMode(mode)}</strong>
                      <Box sx={{ fontSize: "0.9rem", color: "#666" }}>
                        {getSubmissionModeDescription(mode)}
                      </Box>
                    </Box>
                  </Button>
                </Grid>
              ))}
            </Grid>
            <Button
              sx={{ mt: 2 }}
              onClick={() => {
                setStep(0);
                setSelectedTrack(null);
              }}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Application Form */}
      {step === 2 && (
        <Card>
          <CardContent>
            <h2>Application Form</h2>

            {/* Track Info Section - User Friendly Display */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                APPLICATION TRACK
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#1976d2' }}>
                {getApplicationIntroText(selectedTrack)}
              </Typography>

              {/* Track description */}
              {getTrackDescription(selectedTrack) && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                  {getTrackDescription(selectedTrack)}
                </Typography>
              )}

              {/* Show what role they'll receive */}
              {selectedTrack?.role_mappings_on_acceptance && selectedTrack.role_mappings_on_acceptance.length > 0 && (
                <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#fff3e0', borderRadius: 0.5, borderLeft: '4px solid #ff9800' }}>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    {getAcceptanceMessage(selectedTrack.role_mappings_on_acceptance)}
                  </Typography>
                </Box>
              )}

              {/* Submission mode */}
              <Typography variant="caption" color="textSecondary" display="block">
                <strong>Application Method:</strong> {formatSubmissionMode(formData.submission_mode)}
              </Typography>
            </Box>

            {/* Self-submission and self-nomination fields */}
            {["self_submission", "self_nomination"].includes(
              formData.submission_mode
            ) && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
              </Grid>
            )}

            {/* Confirmed mode fields */}
            {formData.submission_mode === "confirmed" && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sponsor/Partner Organization"
                    name="sponsor_organization"
                    value={formData.sponsor_organization}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
              </Grid>
            )}

            {/* Third-party nomination fields */}
            {formData.submission_mode === "third_party_nomination" && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <h4>Nominator Information</h4>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Your Name"
                    name="nominator_name"
                    value={formData.nominator_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Your Email"
                    name="nominator_email"
                    type="email"
                    value={formData.nominator_email}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <h4>Nominee Information</h4>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nominee Name"
                    name="nominee_name"
                    value={formData.nominee_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nominee Email"
                    name="nominee_email"
                    type="email"
                    value={formData.nominee_email}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Why are you nominating them?"
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                  />
                </Grid>
              </Grid>
            )}

            {/* Tier Selection - if track has multiple tiers */}
            {pricingTiers.length > 0 && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Pricing Tier Selection
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Tier {pricingTiers.length === 1 ? '(Auto-selected)' : ''}</InputLabel>
                  <Select
                    value={formData.tier_preference_id || ''}
                    label="Select Tier"
                    name="tier_preference_id"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tier_preference_id: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                  >
                    {pricingTiers.map((tier) => (
                      <MenuItem key={tier.id} value={tier.id}>
                        {tier.label}
                        {tier.price && tier.price > 0 ? ` - ${tier.currency || 'USD'} ${tier.price}` : ' (Free)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Common fields for all modes */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Job Title"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company/Organization"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="LinkedIn URL"
                  name="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>

            {/* Form Actions */}
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 3 }}>
              <Button
                onClick={() => setStep(availableModes.length > 1 ? 1 : 0)}
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <CircularProgress size={24} /> : "Submit Application"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
