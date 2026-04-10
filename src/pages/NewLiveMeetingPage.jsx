// src/pages/NewLiveMeetingPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useRealtimeKitClient } from "@cloudflare/realtimekit-react";
import { RtkMeeting } from "@cloudflare/realtimekit-react-ui";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
import axios from "axios";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    ""
  );
}

export default function NewLiveMeetingPage() {
  const { meetingId: slug } = useParams(); // event slug from URL
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const eventId = searchParams.get("id");
  const role = searchParams.get("role") || "audience"; // publisher | audience
  const isHost = role === "publisher";

  const [meeting, initMeeting] = useRealtimeKitClient();
  const [status, setStatus] = useState("idle"); // idle | joining | joined | error
  const [error, setError] = useState(null);

  // Fetch RTK token and init meeting
  useEffect(() => {
    if (!eventId) {
      setError("Event ID is required");
      setStatus("error");
      return;
    }

    setStatus("joining");
    const controller = new AbortController();

    axios
      .post(
        `/api/events/${eventId}/rtk/join/`,
        { role },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
        }
      )
      .then(async ({ data }) => {
        if (data.authToken) {
          await initMeeting({
            authToken: data.authToken,
            defaults: { audio: false, video: false },
          });
          setStatus("joined");
        } else {
          setError("No auth token received from server");
          setStatus("error");
        }
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        const errorMsg =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to join meeting";
        setError(errorMsg);
        setStatus("error");
      });

    return () => controller.abort();
  }, [eventId, role]);

  // Loading state
  if (status === "idle" || status === "joining") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography>Joining meeting…</Typography>
      </Box>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        gap={2}
      >
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  // Joined — render RTK meeting UI
  return (
    <Box sx={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <RtkMeeting meeting={meeting} onLeave={() => navigate(-1)} />
    </Box>
  );
}
