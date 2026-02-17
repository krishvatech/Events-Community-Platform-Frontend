import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  CircularProgress,
  Button,
  Stack,
} from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PublishIcon from "@mui/icons-material/Publish";
import { useNavigate } from "react-router-dom";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

function authHeader() {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

function toApiUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const rel = String(pathOrUrl).replace(/^\/+/, "");
    return `${API_ROOT}/${rel.replace(/^api\/+/, "")}`;
  }
}

export default function RecordingsLibrary() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const statusConfig = useMemo(
    () => ({
      published: { label: "Published", color: "success" },
      ready_to_edit: { label: "Ready to Edit", color: "warning" },
      editing: { label: "Editing", color: "info" },
      processing: { label: "Processing", color: "default" },
      recording: { label: "Recording", color: "default" },
    }),
    []
  );

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const res = await fetch(toApiUrl("recordings/"), {
        headers: { ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to fetch recordings");
      setRecordings(data.results || data || []);
    } catch (err) {
      console.error("Error fetching recordings:", err);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handlePublish = async (eventId) => {
    if (!window.confirm("Publish this recording to all participants?")) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/publish-recording/`), {
        method: "POST",
        headers: { ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to publish recording");
      fetchRecordings();
    } catch (err) {
      console.error("Error publishing:", err);
      alert(err.message || "Failed to publish recording");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Event Recordings
      </Typography>

      {recordings.length === 0 ? (
        <Typography color="text.secondary">No recordings available yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {recordings.map((event) => {
            const status = statusConfig[event.recording_status] || { label: event.recording_status || "Unknown", color: "default" };
            return (
              <Grid item xs={12} sm={6} md={4} key={event.id}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <CardMedia
                    sx={{ height: 180, bgcolor: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <PlayCircleOutlineIcon sx={{ fontSize: 64, color: "rgba(255,255,255,0.5)" }} />
                  </CardMedia>

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>{event.title}</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Chip label={status.label} color={status.color} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {event.start_time ? new Date(event.start_time).toLocaleDateString() : ""}
                    </Typography>
                    {event.recording_duration && (
                      <Typography variant="caption" color="text.secondary">
                        Duration: {Math.floor(event.recording_duration / 60)} min
                      </Typography>
                    )}
                  </CardContent>

                  <Stack spacing={1} sx={{ p: 2, pt: 0 }}>
                    {event.recording_status === "published" && (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayCircleOutlineIcon />}
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        Open Event
                      </Button>
                    )}

                    {(event.recording_status === "ready_to_edit" || event.recording_status === "editing") && (
                      <>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/events/${event.id}/edit-recording`)}
                        >
                          Edit Recording
                        </Button>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<PublishIcon />}
                          onClick={() => handlePublish(event.id)}
                        >
                          Publish Now
                        </Button>
                      </>
                    )}
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
