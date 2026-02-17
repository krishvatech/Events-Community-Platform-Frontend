import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Slider, Paper, CircularProgress } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";

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

export default function VideoEditor({ videoUrl, eventId, onSave }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimRange, setTrimRange] = useState([0, 100]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setTrimRange([0, 100]);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime || 0);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleTrimChange = (_event, newValue) => {
    setTrimRange(newValue);
    const video = videoRef.current;
    if (!video || !duration) return;
    const startTime = (newValue[0] / 100) * duration;
    video.currentTime = startTime;
  };

  const handleSave = async () => {
    if (!eventId || !duration) return;
    setSaving(true);
    const startTime = (trimRange[0] / 100) * duration;
    const endTime = (trimRange[1] / 100) * duration;

    try {
      const res = await fetch(toApiUrl(`events/${eventId}/edit-recording/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ trim_start: startTime, trim_end: endTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to save edits");
      if (onSave) onSave(data);
    } catch (err) {
      console.error("Error saving recording edit:", err);
      alert(err.message || "Failed to save edits");
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor((seconds || 0) / 60);
    const secs = Math.floor((seconds || 0) % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const trimmedDuration = ((trimRange[1] - trimRange[0]) / 100) * duration;

  return (
    <Paper sx={{ p: 3, bgcolor: "#0b101a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Edit Recording</Typography>

      <Box sx={{ mb: 3, bgcolor: "#000", borderRadius: 2, overflow: "hidden" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: "100%", height: "auto", display: "block" }}
          onEnded={() => setIsPlaying(false)}
          controls
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Button variant="contained" onClick={togglePlayPause} startIcon={isPlaying ? <PauseIcon /> : <PlayArrowIcon />}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Typography variant="body2">{formatTime(currentTime)} / {formatTime(duration)}</Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Trim Recording</Typography>
        <Slider
          value={trimRange}
          onChange={handleTrimChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => formatTime((value / 100) * duration)}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Start: {formatTime((trimRange[0] / 100) * duration)}</Typography>
          <Typography variant="caption" color="text.secondary">End: {formatTime((trimRange[1] / 100) * duration)}</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          New Duration: {formatTime(trimmedDuration)}
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="primary"
        startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
        onClick={handleSave}
        disabled={saving}
        fullWidth
      >
        {saving ? "Processing..." : "Save Edited Recording"}
      </Button>
    </Paper>
  );
}
