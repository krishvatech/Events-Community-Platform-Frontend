// src/pages/LiveMeetingPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import {
  DyteProvider,
  useDyteClient,
  useDyteMeeting,
} from "@dytesdk/react-web-core";
import { DyteMeeting } from "@dytesdk/react-ui-kit";

// --- API base (same pattern as other pages) ---
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
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

// -------- Dyte meeting UI wrapper --------

function DyteMeetingUI() {
  const { meeting } = useDyteMeeting();
  return (
    <Box sx={{ flex: 1, minHeight: 0, height: "100%", width: "100%" }}>
     <DyteMeeting
       meeting={meeting}
       mode="fill"
       showSetupScreen={false}
       style={{ width: "100%", height: "100%" }}
     />
   </Box>
  );
}

function DyteMeetingWrapper({ authToken, eventId, role, onMeetingEnd }) {
  const [meeting, initMeeting] = useDyteClient();
  const [initError, setInitError] = useState("");
  const [initDone, setInitDone] = useState(false);
  const [liveStatusSent, setLiveStatusSent] = useState(false);

  // Init meeting with auth token
  useEffect(() => {
    if (!authToken) return;
    (async () => {
      try {
        await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: true,
          },
        });
        setInitDone(true);
      } catch (err) {
        console.error("Dyte init failed", err);
        setInitError(err?.message || "Failed to initialize Dyte meeting");
      }
    })();
  }, [authToken, initMeeting]);

  useEffect(() => {
    // Only host should mark event as LIVE
    if (!meeting || !eventId || role !== "publisher" || liveStatusSent) return;

    const sendLiveStatus = async () => {
      try {
        await fetch(toApiUrl(`events/${eventId}/live-status/`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ action: "start" }),
        });
        setLiveStatusSent(true);
      } catch (e) {
        console.warn("Failed to update live-status (start):", e);
      }
    };

    sendLiveStatus();
  }, [meeting, eventId, role, liveStatusSent]);

    useEffect(() => {
    if (!meeting || !eventId) return;

    let lastSent = undefined;

    const sendActiveSpeaker = (userId) => {
      // avoid spamming same value
      if (userId === lastSent) return;
      lastSent = userId;

      try {
        fetch(toApiUrl(`events/${eventId}/active-speaker/`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ user_id: userId }),
        }).catch((e) => {
          console.warn("Failed to update active speaker:", e);
        });
      } catch (e) {
        console.warn("Error while calling active-speaker endpoint:", e);
      }
    };

    const handleActiveSpeaker = (participant) => {
      try {
        // When there is no remote active speaker, Dyte can pass null/undefined
        if (!participant) {
          // On HOST tab (publisher), fall back to marking host as active
          if (role === "publisher" && meeting.self) {
            const hostId =
              meeting.self.customParticipantId || meeting.self.userId;
            if (hostId) {
              sendActiveSpeaker(hostId);
            }
          } else {
            // viewers just clear it
            sendActiveSpeaker(null);
          }
          return;
        }

        // Normal case: some remote participant is speaking
        const userId =
          participant.customParticipantId ||
          participant.userId ||
          participant.id;

        if (!userId) {
          console.warn(
            "Active speaker event without customParticipantId/userId",
            participant
          );
          return;
        }

        sendActiveSpeaker(userId);
      } catch (e) {
        console.warn("Error handling activeSpeaker event:", e);
      }
    };

    try {
      meeting.participants.on("activeSpeaker", handleActiveSpeaker);
    } catch (e) {
      console.warn("Failed to subscribe to activeSpeaker:", e);
    }

    // 🔹 On host side, as soon as they actually join the room, mark them as initial active speaker
    const markHostOnJoin = () => {
      if (role !== "publisher" || !meeting.self) return;
      const hostId =
        meeting.self.customParticipantId || meeting.self.userId;
      if (hostId) {
        sendActiveSpeaker(hostId);
      }
    };

    try {
      meeting.self.on("roomJoined", markHostOnJoin);
    } catch (e) {
      // optional, older SDKs might not have this
      console.warn("Failed to subscribe to roomJoined", e);
    }

    return () => {
      try {
        meeting.participants.off("activeSpeaker", handleActiveSpeaker);
      } catch (e) {
        // ignore
      }
      try {
        meeting.self.off?.("roomJoined", markHostOnJoin);
      } catch (e) {
        // ignore
      }

      // Optional: clear on unmount/leave
      sendActiveSpeaker(null);
    };
  }, [meeting, eventId, role]);


  // 🔢 SYNC PARTICIPANT COUNT → Event.attending_count
  useEffect(() => {
    if (!meeting || !eventId) return;

    let lastSent = -1;

    const pushCount = (total) => {
      if (!Number.isFinite(total) || total <= 0) return;
      if (total === lastSent) return;
      lastSent = total;

      try {
        fetch(toApiUrl(`events/${eventId}/attending/`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({
            op: "set",
            value: total,
          }),
        }).catch((e) => {
          console.warn("Failed to sync attending_count:", e);
        });
      } catch (e) {
        console.warn("Error while calling attending endpoint:", e);
      }
    };

    const computeAndPushCount = () => {
      try {
        const participants = meeting.participants;
        if (!participants) return;

        // Dyte Web Core: participants.count = remote participants only (no local user)
        // So total = remote + 1 (self)
        let remoteCount = 0;

        if (typeof participants.count === "number") {
          remoteCount = participants.count;
        } else if (participants.joined) {
          const joined = participants.joined;
          if (typeof joined.size === "number") {
            remoteCount = joined.size;
          } else if (typeof joined.toArray === "function") {
            remoteCount = joined.toArray().length;
          }
        }

        const total = remoteCount + 1; // include local user
        pushCount(total);
      } catch (e) {
        console.warn("Failed to compute participant count:", e);
      }
    };

    // Initial sync once meeting is ready
    computeAndPushCount();

    // Periodic sync every 10 seconds
    const intervalId = window.setInterval(computeAndPushCount, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [meeting, eventId]);

  // 🔔 Listen for "roomLeft" (user left / meeting ended) and auto-close
  useEffect(() => {
    if (!meeting || !meeting.self) return;

    const handleRoomLeft = ({ state }) => {
      console.log("Dyte roomLeft:", state);
      // state can be: 'left', 'ended', 'kicked', 'rejected', etc.
      if (
        state === "left" ||
        state === "ended" ||
        state === "kicked" ||
        state === "rejected"
      ) {
        if (typeof onMeetingEnd === "function") {
          onMeetingEnd(state);
        }
      }
    };

    try {
      meeting.self.on("roomLeft", handleRoomLeft);
    } catch (e) {
      console.warn("Failed to register roomLeft handler", e);
    }

    return () => {
      try {
        meeting.self.off?.("roomLeft", handleRoomLeft);
      } catch (e) {
        // ignore if off is not available
      }
    };
  }, [meeting, onMeetingEnd]);

  if (!authToken) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Missing Dyte auth token.</Typography>
      </Box>
    );
  }

  if (initError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{initError}</Typography>
      </Box>
    );
  }

  if (!initDone || !meeting) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DyteProvider
      value={meeting}
      fallback={
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <DyteMeetingUI />
    </DyteProvider>
  );
}

// ------------- Page component -------------

export default function LiveMeetingPage() {
  const { slug } = useParams(); // URL like /events/:slug/live
  const navigate = useNavigate();

  const [eventId, setEventId] = useState(null);
  const [role, setRole] = useState("audience");
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // 👇 For fullscreen
  const pageRef = useRef(null);

  // Extract eventId from query (?id=123)
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const idFromQuery = search.get("id");
    if (!idFromQuery) {
      setError("Missing event id (?id=...) in URL.");
      setLoading(false);
      return;
    }
    setEventId(idFromQuery);

    const roleFromQuery = (search.get("role") || "audience").toLowerCase();
    // Normalize to 'publisher' or 'audience' only
    if (roleFromQuery === "publisher" || roleFromQuery === "host") {
      setRole("publisher");
    } else {
      setRole("audience");
    }
  }, [slug]);

  // Call backend /events/<id>/dyte/join/
  useEffect(() => {
    if (!eventId) return;

    const join = async () => {
      setJoining(true);
      setError("");

      try {
        const url = toApiUrl(`events/${eventId}/dyte/join/`);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ role }), // 👈 send role to backend
        });

        if (!res.ok) {
          let detail = "Failed to join live meeting.";
          try {
            const data = await res.json();
            detail = data.detail || data.error || detail;
          } catch (_) {}
          throw new Error(detail);
        }

        const data = await res.json();
        setAuthToken(data.authToken);
        // backend may downgrade role; keep it in state if returned
        if (data.role) {
          setRole(data.role);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to get Dyte auth token");
      } finally {
        setLoading(false);
        setJoining(false);
      }
    };

    join();
  }, [eventId, role]);

  const handleBack = () => {
    navigate(-1);
  };

  // 🔲 Auto fullscreen when we have an authToken (meeting view)
  useEffect(() => {
    if (!authToken) return;

    const el = pageRef.current || document.documentElement;
    if (!el) return;

    const requestFs =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;

    if (requestFs) {
      try {
        requestFs.call(el);
      } catch (e) {
        console.warn("Fullscreen request failed", e);
      }
    }
  }, [authToken]);

  // 🧹 When meeting ends, exit fullscreen + close window / go back
  const handleMeetingEnd = React.useCallback(
    (state) => {
      console.log("Meeting ended with state:", state);

      if (eventId) {
        try {
          fetch(toApiUrl(`events/${eventId}/end-meeting/`), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeader(),
            },
          }).catch((e) => {
            console.warn("Failed to mark event as ended:", e);
          });
        } catch (e) {
          console.warn("Failed to call end-meeting API:", e);
        }
      }

      if (document.fullscreenElement) {
        try {
          document.exitFullscreen();
        } catch (e) {
          console.warn("Failed to exit fullscreen", e);
        }
      }

      try {
        window.close();
      } catch (e) {}
      try {
        navigate(-1);
      } catch (e) {}
    },
    [navigate, eventId]
  );

  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            size="small"
          >
            Back
          </Button>
        </Box>
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            size="small"
          >
            Back
          </Button>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
          {!getToken() && (
            <Typography variant="body2">
              Make sure you are logged in; this endpoint requires
              authentication.
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  if (!authToken) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            size="small"
          >
            Back
          </Button>
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography color="error">
            Could not get Dyte auth token. Please try again.
          </Typography>
        </Box>
      </Box>
    );
  }

  // Happy path: show Dyte meeting
  return (
    <Box
      ref={pageRef}
      sx={{
        position: "fixed",
        inset: 0, // top:0, right:0, bottom:0, left:0
        zIndex: 1300,
        bgcolor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 999 }}
          >
            Back
          </Button>
          <Typography variant="body2" color="grey.400">
            Live meeting powered by Dyte
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DyteMeetingWrapper
          authToken={authToken}
          eventId={eventId}
          role={role}
          onMeetingEnd={handleMeetingEnd}
        />
      </Box>
    </Box>
  );
}
