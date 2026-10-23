import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import MultiTrackApplicationForm from "./MultiTrackApplicationForm.jsx";
import {
  getAcceptanceMessage,
  getApplicationIntroText,
  getTrackDescription,
} from "../utils/trackFormatting";
import {
  buildApplicationCacheEntry,
  writeApplicationCache,
} from "../utils/applicationCache";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

export default function ApplyNowModal({ open, onClose, event, token, onSuccess }) {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksError, setTracksError] = useState("");
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const guestApplicationsAllowed = event?.allow_guest_applications === true;
  const isGuestApplication = !token;

  useEffect(() => {
    if (!open || !event?.id) return;

    let cancelled = false;
    const loadApplicationTracks = async () => {
      try {
        setLoadingTracks(true);
        setTracksError("");
        setSubmittedApplication(null);

        const response = await fetch(
          urlJoin(API_BASE, `/events/${event.id}/application-tracks/?status=open`),
          { method: "GET" }
        );
        const data = await response.json().catch(() => ({}));
        const tracksList = Array.isArray(data) ? data : data.results || [];
        const activeTracks = tracksList.filter((track) => track.is_active);

        if (cancelled) return;
        setTracks(activeTracks);

        if (activeTracks.length === 1) {
          setSelectedTrackIds([activeTracks[0].id]);
          setShowTrackSelector(false);
        } else {
          setSelectedTrackIds([]);
          setShowTrackSelector(activeTracks.length > 1);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load application tracks:", err);
          setTracksError("Failed to load application tracks. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingTracks(false);
      }
    };

    loadApplicationTracks();
    return () => {
      cancelled = true;
    };
  }, [open, event?.id]);

  const handleModalClose = () => {
    setTracks([]);
    setSelectedTrackIds([]);
    setShowTrackSelector(false);
    setTracksError("");
    setSubmittedApplication(null);
    onClose();
  };

  const handleTrackSelect = (trackId) => {
    // IPDT-771: single selection only. Selecting a track replaces any
    // previous selection. The state stays an array (length <= 1) so the
    // `selectedTracks` contract consumed by MultiTrackApplicationForm is
    // unchanged; the step `key` includes the selected id, so switching
    // tracks remounts the form and no stale per-track answers survive.
    setSelectedTrackIds([trackId]);
  };

  const handleApplicationSuccess = (data) => {
    console.log('✅ ApplyNowModal received success data:', {
      applicationId: data.id,
      applicationStatus: data.application_status,
      status: data.status,
      email: data.email,
    });

    setSubmittedApplication(data);

    // Guests have no account/profile to look the application up later, so keep
    // the event + the applicant's own details here. The public status endpoint
    // returns a status only, so these cached values (which the guest just typed
    // into this form) are what lets an approved guest call guest-join later.
    if (isGuestApplication && data?.email && event?.id) {
      writeApplicationCache(buildApplicationCacheEntry(event.id, data));
    }

    if (onSuccess) {
      console.log('📤 Calling parent onSuccess callback with application data');
      onSuccess(data);
    }

    // Auto-close modal after 2.5 seconds to show success message,
    // allowing state updates to complete before modal closes
    setTimeout(() => {
      console.log('🔒 Auto-closing apply modal');
      handleModalClose();
    }, 2500);
  };

  const renderTrackSelector = () => (
    <Card sx={{ mb: 2, bgcolor: "#f5f5f5" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Select Application Track
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Choose one track you'd like to apply for:
        </Typography>

        <RadioGroup
          aria-label="Application track"
          name="application-track"
          value={selectedTrackIds.length ? String(selectedTrackIds[0]) : ""}
          onChange={(e) => handleTrackSelect(Number(e.target.value))}
        >
          <Stack spacing={1}>
            {tracks.map((track) => (
              <FormControlLabel
                key={track.id}
                value={String(track.id)}
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {getApplicationIntroText(track)}
                    </Typography>
                    {getTrackDescription(track) && (
                      <Typography variant="caption" color="textSecondary">
                        {getTrackDescription(track)}
                      </Typography>
                    )}
                    {track.role_mappings_on_acceptance?.length > 0 && (
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ display: "block", mt: 0.5, fontWeight: 600 }}
                      >
                        {getAcceptanceMessage(track.role_mappings_on_acceptance)}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{ alignItems: "flex-start", m: 0 }}
              />
            ))}
          </Stack>
        </RadioGroup>

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          disabled={selectedTrackIds.length === 0}
          onClick={() => setShowTrackSelector(false)}
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );

  const contentIsWide = selectedTrackIds.length > 0 && !showTrackSelector && !submittedApplication;

  return (
    <Dialog
      open={open}
      onClose={handleModalClose}
      maxWidth={contentIsWide ? "md" : "sm"}
      fullWidth
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>Apply to {event?.title}</Box>
        <IconButton aria-label="Close application dialog" onClick={handleModalClose} sx={{ flexShrink: 0 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {submittedApplication ? (
          <Stack spacing={2} sx={{ py: 3, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "success.main" }} />
            </Box>
            <Typography variant="h6">Application Submitted</Typography>
            <Typography variant="body2" color="textSecondary">
              Your application has been submitted for review.
            </Typography>
          </Stack>
        ) : isGuestApplication && !guestApplicationsAllowed ? (
          <Alert
            severity="info"
            action={
              <Button
                size="small"
                onClick={() => {
                  handleModalClose();
                  navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
                }}
              >
                Sign In
              </Button>
            }
          >
            Guest applications are disabled for this event. Please sign in to apply.
          </Alert>
        ) : loadingTracks ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : tracksError ? (
          <Alert severity="error">{tracksError}</Alert>
        ) : tracks.length === 0 ? (
          <Alert severity="warning">
            Applications are not open yet. No application tracks are available for this event.
          </Alert>
        ) : showTrackSelector ? (
          renderTrackSelector()
        ) : (
          <>
            {tracks.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <Button variant="text" size="small" onClick={() => setShowTrackSelector(true)}>
                  Change selected track
                </Button>
              </Box>
            )}
            <MultiTrackApplicationForm
              key={`${event?.id}-${selectedTrackIds.join("-")}-${open}`}
              eventId={event.id}
              event={event}
              selectedTracks={selectedTrackIds}
              onSuccess={handleApplicationSuccess}
              isGuestApplication={isGuestApplication}
            />
          </>
        )}
      </DialogContent>
      {submittedApplication && (
        <DialogActions>
          <Button onClick={handleModalClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
