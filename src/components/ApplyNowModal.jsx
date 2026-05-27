import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useNavigate } from "react-router-dom";
import MultiTrackApplicationForm from "./MultiTrackApplicationForm.jsx";
import {
  getAcceptanceMessage,
  getApplicationIntroText,
  getTrackDescription,
} from "../utils/trackFormatting";

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

  const handleTrackToggle = (trackId, checked) => {
    setSelectedTrackIds((prev) =>
      checked ? [...prev, trackId] : prev.filter((id) => id !== trackId)
    );
  };

  const handleApplicationSuccess = (data) => {
    console.log('✅ ApplyNowModal received success data:', {
      applicationId: data.id,
      applicationStatus: data.application_status,
      status: data.status,
      email: data.email,
    });

    setSubmittedApplication(data);
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
          Choose one or more tracks you'd like to apply for:
        </Typography>

        <Stack spacing={1}>
          {tracks.map((track) => {
            const checked = selectedTrackIds.includes(track.id);
            return (
              <FormControlLabel
                key={track.id}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={(e) => handleTrackToggle(track.id, e.target.checked)}
                  />
                }
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
            );
          })}
        </Stack>

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
      <DialogTitle>Apply to {event?.title}</DialogTitle>
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
        ) : !token ? (
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
            Please sign in to apply for this event.
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
                  Change selected tracks
                </Button>
              </Box>
            )}
            <MultiTrackApplicationForm
              key={`${event?.id}-${selectedTrackIds.join("-")}-${open}`}
              eventId={event.id}
              event={event}
              selectedTracks={selectedTrackIds}
              onSuccess={handleApplicationSuccess}
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
