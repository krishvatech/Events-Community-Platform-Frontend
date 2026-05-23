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
} from "@mui/material";
import { apiClient } from "../utils/api";

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    track_id: null,
    track_key: null,
    submission_mode: "self_submission",
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

  // Load available tracks
  useEffect(() => {
    loadTracks();
  }, [eventId]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(
        `/events/${eventId}/application-tracks/?status=open`
      );
      setTracks(data.filter((t) => t.is_active));
      setError(null);

      // Auto-select track if only one
      if (data.length === 1) {
        selectTrack(data[0]);
      }
    } catch (err) {
      console.error("Failed to load tracks:", err);
      setError("Failed to load application tracks");
    } finally {
      setLoading(false);
    }
  };

  const selectTrack = (track) => {
    setSelectedTrack(track);
    setFormData((prev) => ({
      ...prev,
      track_id: track.id,
      track_key: track.key,
    }));

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

  const modeLabels = {
    self_submission: "Apply for Yourself",
    confirmed: "Confirmed Participation",
    self_nomination: "Self-Nominate",
    third_party_nomination: "Nominate Someone",
  };

  const modeDescriptions = {
    self_submission: "Submit your own application",
    confirmed: "Already confirmed by sponsor/partner organization",
    self_nomination: "Nominate yourself for this opportunity",
    third_party_nomination: "Nominate another person for this opportunity",
  };

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
                      <strong>{modeLabels[mode]}</strong>
                      <Box sx={{ fontSize: "0.9rem", color: "#666" }}>
                        {modeDescriptions[mode]}
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
            <p>
              <strong>Track:</strong> {selectedTrack?.label}
            </p>
            <p>
              <strong>Mode:</strong> {modeLabels[formData.submission_mode]}
            </p>

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
