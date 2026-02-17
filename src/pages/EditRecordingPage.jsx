import React, { useEffect, useState } from "react";
import { Container, Box, CircularProgress, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import VideoEditor from "../components/VideoEditor.jsx";

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

export default function EditRecordingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(toApiUrl(`events/${id}/recording-status/`), { headers: { ...authHeader() } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.detail || "Failed to load recording status");
        const candidate = data.edited_url || data.raw_url || data.recording_url || "";
        if (!candidate) throw new Error("No recording URL available for editing");
        if (mounted) setVideoUrl(candidate);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load recording");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <VideoEditor
        videoUrl={videoUrl}
        eventId={id}
        onSave={() => {
          alert("Edit request submitted.");
          navigate("/account/recordings-library");
        }}
      />
    </Container>
  );
}
