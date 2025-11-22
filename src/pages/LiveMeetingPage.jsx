// src/pages/LiveMeetingPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Button,
  CircularProgress,
  Typography,
  Paper,
  Avatar,
  keyframes,
  GlobalStyles
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PodcastsIcon from '@mui/icons-material/Podcasts';

import {
  DyteProvider,
  useDyteClient,
  useDyteMeeting,
} from "@dytesdk/react-web-core";

import {
  DyteMeeting,
  registerAddons,            // ⬅️ registerAddons from react-ui-kit
  DyteNotifications,
} from "@dytesdk/react-ui-kit";

import CustomControlbarButton from "@dytesdk/ui-kit-addons/custom-controlbar-button";
import LiveQnAPanel from "../components/LiveQnAPanel.jsx";

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


const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 15px rgba(25, 118, 210, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;
// -------- Dyte meeting UI wrapper --------

function DyteMeetingUI({ config }) {
  const { meeting } = useDyteMeeting();

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: "100%", width: "100%" }}>
      <DyteMeeting
        meeting={meeting}
        mode="fill"
        showSetupScreen={false}
        style={{ width: "100%", height: "100%" }}
        {...(config ? { config } : {})}
      />
    </Box>
  );
}

function WaitingForHostScreen() {
  return (
    <Box
      sx={{
        // Force the component to fill the parent container completely
        width: "100%",
        height: "100%", 
        
        // Layout centering
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        
        // Background design
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        
        // Handle padding safely
        p: 3,
        boxSizing: "border-box", 
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          borderRadius: 4,
          maxWidth: 450,
          width: "100%",
          bgcolor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Animated Icon */}
        <Box sx={{ position: "relative", mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              animation: `${pulseAnimation} 2s infinite`,
            }}
          >
            <PodcastsIcon sx={{ fontSize: 40, color: "white" }} />
          </Avatar>
        </Box>

        <Typography variant="h5" fontWeight="800" color="text.primary" gutterBottom>
          Waiting for Host
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
          The live stream hasn't started yet. Sit tight! 
          We will connect you automatically as soon as the host goes live.
        </Typography>

        {/* Loading Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'primary.main' }}>
            <CircularProgress size={24} thickness={5} color="inherit" />
            <Typography variant="caption" fontWeight="600" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                Connecting...
            </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
const BASE_UI_CONFIG = {
  root: {
    components: {
      // completely hide Dyte's built-in sidebar
      sidebar: false,
    },
  },
  controlBarElements: {
    // hide Dyte's built-in bottom icons
    chat: false,
    polls: false,
    participants: false,
    plugins: false,
  },
  sideBarElements: {
    // hide sidebar views if something tries to open them
    chat: false,
    polls: false,
    participants: false,
    plugins: false,
  },
};


function DyteMeetingWrapper({
  authToken,
  eventId,
  role,
  onMeetingEnd,
  onOpenQnA,
  onMeetingReady,
}) {
  const [meeting, initMeeting] = useDyteClient();
  const [initError, setInitError] = useState("");
  const [initDone, setInitDone] = useState(false);
  const [liveStatusSent, setLiveStatusSent] = useState(false);
  const [dyteConfig, setDyteConfig] = useState(BASE_UI_CONFIG);


  // Waiting room
  const [hostJoined, setHostJoined] = useState(false);

  // When meeting is ready → expose to parent + enforce UI config once
  useEffect(() => {
    if (!meeting) return;
    if (typeof onMeetingReady === "function") {
      onMeetingReady(meeting);
    }
  }, [meeting, onMeetingReady]);

  // Init meeting with auth token
  useEffect(() => {
    if (!authToken) return;

    (async () => {
      try {
        await initMeeting({
          authToken,
          defaults: {
            audio: false,
            video: false,
            args: {},
          },
        });
        setInitDone(true);
      } catch (err) {
        console.error("Dyte init failed", err);
        setInitError(err?.message || "Failed to initialize Dyte meeting");
      }
    })();
  }, [authToken, initMeeting]);



  // 🟦 HOST DETECTION (same logic as before)
  useEffect(() => {
    if (!meeting || !initDone) return;

    if (role === "publisher") {
      setHostJoined(true);
      return;
    }

    const scanForHost = () => {
      const participants = Array.from(meeting.participants.joined.values());

      const foundHost = participants.some((p) => {
        const preset = (p.presetName || "").toLowerCase();
        const customId = (p.customParticipantId || "").toLowerCase();

        return (
          preset.includes("host") ||
          preset.includes("publisher") ||
          preset.includes("presenter") ||
          customId.includes("host") ||
          customId.includes("publisher")
        );
      });

      if (foundHost) setHostJoined(true);
    };

    scanForHost();

    const handleJoin = () => scanForHost();
    meeting.participants.joined.on("participantJoined", handleJoin);

    const intervalId = setInterval(() => {
      if (!hostJoined) scanForHost();
    }, 3000);

    return () => {
      meeting.participants.joined.off("participantJoined", handleJoin);
      clearInterval(intervalId);
    };
  }, [meeting, initDone, role, hostJoined]);

  // ✅ If event is already live, skip waiting screen (unchanged)
  useEffect(() => {
    if (!eventId) return;
    if (role === "publisher") return;
    if (!meeting) return;
    if (hostJoined) return;

    let cancelled = false;

    const checkEventLive = async () => {
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/`), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
        });

        if (!res.ok) return;

        const data = await res.json();

        if (!cancelled && data.live_started_at && !data.live_ended_at) {
          setHostJoined(true);
        }
      } catch (e) {
        console.warn("Failed to check event live status:", e);
      }
    };

    checkEventLive();

    const id = window.setInterval(() => {
      if (cancelled || hostJoined) {
        window.clearInterval(id);
        return;
      }
      checkEventLive();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [eventId, role, meeting, hostJoined]);

  // 🔴 Existing live-status effect (kept same)
  useEffect(() => {
    if (!meeting || !eventId || role !== "publisher" || liveStatusSent) return;
    const sendLiveStatus = async () => {
      try {
        await fetch(toApiUrl(`events/${eventId}/live-status/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ action: "start" }),
        });
        setLiveStatusSent(true);
      } catch (e) {
        console.warn("Failed to update live-status (start):", e);
      }
    };
    sendLiveStatus();
  }, [meeting, eventId, role, liveStatusSent]);

  // (Your duplicate live-status effect is left as-is or you can safely delete one copy)

  // 🔊 Active speaker sync (unchanged)
  useEffect(() => {
    if (!meeting || !eventId) return;
    let lastSent;

    const sendActiveSpeaker = (userId) => {
      if (userId === lastSent) return;
      lastSent = userId;
      try {
        fetch(toApiUrl(`events/${eventId}/active-speaker/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ user_id: userId }),
        }).catch((e) =>
          console.warn("Failed to update active speaker:", e)
        );
      } catch (e) {}
    };

    const handleActiveSpeaker = (participant) => {
      if (!participant) {
        if (role === "publisher" && meeting.self) {
          const hostId =
            meeting.self.customParticipantId || meeting.self.userId;
          if (hostId) sendActiveSpeaker(hostId);
        } else {
          sendActiveSpeaker(null);
        }
        return;
      }
      const userId =
        participant.customParticipantId ||
        participant.userId ||
        participant.id;
      if (userId) sendActiveSpeaker(userId);
    };

    meeting.participants.on("activeSpeaker", handleActiveSpeaker);

    const markHostOnJoin = () => {
      if (role !== "publisher" || !meeting.self) return;
      const hostId = meeting.self.customParticipantId || meeting.self.userId;
      if (hostId) sendActiveSpeaker(hostId);
    };
    meeting.self.on("roomJoined", markHostOnJoin);

    return () => {
      try {
        meeting.participants.off("activeSpeaker", handleActiveSpeaker);
      } catch (e) {}
      try {
        meeting.self.off?.("roomJoined", markHostOnJoin);
      } catch (e) {}
      sendActiveSpeaker(null);
    };
  }, [meeting, eventId, role]);

  // 👥 Participant count sync (unchanged)
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
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ op: "set", value: total }),
        }).catch((e) =>
          console.warn("Failed to sync attending_count:", e)
        );
      } catch (e) {}
    };

    const computeAndPushCount = () => {
      try {
        const participants = meeting.participants;
        if (!participants) return;
        let remoteCount = 0;
        if (typeof participants.count === "number") {
          remoteCount = participants.count;
        } else if (participants.joined) {
          remoteCount = participants.joined.size || 0;
        }
        pushCount(remoteCount + 1);
      } catch (e) {}
    };

    computeAndPushCount();
    const intervalId = window.setInterval(computeAndPushCount, 10000);
    return () => window.clearInterval(intervalId);
  }, [meeting, eventId]);

  // 🚪 Room left handler (unchanged)
  useEffect(() => {
    if (!meeting || !meeting.self) return;
    const handleRoomLeft = ({ state }) => {
      if (["left", "ended", "kicked", "rejected"].includes(state)) {
        if (typeof onMeetingEnd === "function") onMeetingEnd(state);
      }
    };
    meeting.self.on("roomLeft", handleRoomLeft);
    return () => {
      try {
        meeting.self.off?.("roomLeft", handleRoomLeft);
      } catch (e) {}
    };
  }, [meeting, onMeetingEnd]);

  // ⭐ Custom control-bar buttons for our sidebar (Chat / Polls / Participants / Plugins / Q&A)
  useEffect(() => {
    if (!meeting) return;

    try {
      const openTab = (tab) => {
        // 1️⃣ Tell Dyte's own UI to close any built-in sidebar (chat / polls / participants / plugins)
        try {
          // DyteMeeting renders a <dyte-meeting> web component
          const dyteRoot =
            document.querySelector("dyte-meeting") ||
            document.querySelector("[data-dyte-ui='meeting']");

          if (dyteRoot) {
            dyteRoot.dispatchEvent(
              new CustomEvent("dyteStateUpdate", {
                detail: {
                  activeSidebar: false, // force sidebar closed
                  sidebar: "none",
                },
                bubbles: true,
                composed: true,
              })
            );
          }
        } catch (e) {
          console.warn(
            "Failed to dispatch dyteStateUpdate to close sidebar",
            e
          );
        }

        // 2️⃣ Fallback: try closing via sidebarManager if available (older SDKs)
        const sb =
          meeting?.sidebar || meeting?.sideBar || meeting?.sidebarManager;
        if (sb) {
          try {
            if (typeof sb.close === "function") sb.close();
            if (typeof sb.toggle === "function") sb.toggle(false);
            if (typeof sb.setView === "function") sb.setView("none");
            if (typeof sb.setActiveSidebar === "function") {
              sb.setActiveSidebar("none");
            }
            if ("activeSidebar" in sb) sb.activeSidebar = "none";
            if ("isOpen" in sb) sb.isOpen = false;
          } catch (e) {
            console.warn("Failed to close Dyte sidebar via sidebarManager", e);
          }
        }

        // 3️⃣ Finally open your custom Q&A drawer
        if (typeof onOpenQnA === "function") {
          onOpenQnA(tab);
        }
      };

      const qnaIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`;

      const qnaBtn = new CustomControlbarButton({
        position: "right",
        label: "Q&A",
        icon: qnaIcon,
        onClick: () => openTab("qna"),
      });

      // Add Q&A button to Dyte + get its config
      const addonsConfig = registerAddons([qnaBtn], meeting) || {};

      // Merge: our “hide chat/polls/participants/plugins” config + addon config
      const mergedConfig = {
        ...BASE_UI_CONFIG,
        ...addonsConfig,

        root: {
          ...(BASE_UI_CONFIG.root || {}),
          ...(addonsConfig.root || {}),
          components: {
            ...(BASE_UI_CONFIG.root?.components || {}),
            ...(addonsConfig.root?.components || {}),
          },
        },

        controlBarElements: {
          ...(addonsConfig.controlBarElements || {}),
          ...(BASE_UI_CONFIG.controlBarElements || {}),
        },

        sideBarElements: {
          ...(addonsConfig.sideBarElements || {}),
          ...(BASE_UI_CONFIG.sideBarElements || {}),
        },
      };

      setDyteConfig(mergedConfig);
    } catch (e) {
      console.warn("Failed to register Q&A addon or update UI config", e);
    }
  }, [meeting, onOpenQnA]);

  // === Render states ===
  if (!authToken) {
    return (
      <Typography sx={{ p: 3 }} color="error">
        Missing Dyte auth token.
      </Typography>
    );
  }
  if (initError) {
    return (
      <Typography sx={{ p: 3 }} color="error">
        {initError}
      </Typography>
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

  // Waiting room screen if host not joined yet
  if (!hostJoined) {
    return (
      <DyteProvider value={meeting}>
        <WaitingForHostScreen />
      </DyteProvider>
    );
  }

  // ✅ Main meeting + notifications
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
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <DyteMeetingUI config={dyteConfig} />

        {/* Dyte-style toast notifications:
            - new chat messages
            - participant joined / left
            (Poll + Q&A toasts will come from your custom logic) */}
        <DyteNotifications
          meeting={meeting}
          config={{
            notifications: ["chat", "poll", "participant_joined", "participant_left"],
            notification_sounds: [], // no sounds
          }}
        />
      </Box>
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
  const [showQnA, setShowQnA] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat"); // "chat" | "polls" | "plugins" | "qna"
  const [sidebarMeeting, setSidebarMeeting] = useState(null);

  // Highlight Q&A button when our custom Q&A drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;

    const dyteRoot =
      document.querySelector("dyte-meeting") ||
      document.querySelector("[data-dyte-ui='meeting']");

    if (!dyteRoot) return;

    if (showQnA) {
      dyteRoot.classList.add("qna-open");
    } else {
      dyteRoot.classList.remove("qna-open");
    }
  }, [showQnA]);
  // 👇 For fullscreen
  const pageRef = useRef(null);

  const handleOpenQnA = React.useCallback((tab = "qna") => {
    if (typeof document !== "undefined") {
      try {
        if (
          document.fullscreenElement &&
          document.fullscreenElement !== pageRef.current
        ) {
          const exitFs =
            document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.msExitFullscreen;

          if (exitFs) {
            exitFs.call(document);
          }
        }
      } catch (e) {
        console.warn("Failed to exit fullscreen before opening sidebar", e);
      }
    }

    setSidebarTab(tab);  
    setShowQnA(true);
  }, []);

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
    if (!pageRef.current) return;   // wait for wrapper to mount

    const el = pageRef.current;     // 👉 fullscreen the outer meeting wrapper
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
        inset: 0,
        zIndex: 1300,
        bgcolor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
       <GlobalStyles
        styles={{
          // still hide Dyte’s built-in sidebar toggles if you want
          "dyte-chat-toggle, dyte-polls-toggle, dyte-participants-toggle, dyte-plugins-toggle":
            {
              display: "none !important",
            },

          // 🔵 When our custom Q&A drawer is open, visually
          // highlight the Q&A controlbar button like Chat does
          "dyte-meeting.qna-open dyte-controlbar-button[label='Q&A'], \
dyte-meeting.qna-open dyte-controlbar-button[aria-label='Q&A']": {
            backgroundColor: "rgba(59, 130, 246, 0.16)", // light blue fill
            boxShadow: "0 0 0 1px #3b82f6 inset",        // blue border
            borderRadius: "999px",
          },
        }}
      />
      {/* 🔝 Header overlay ABOVE Dyte */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          p: 1,
          zIndex: 9998, // higher than Dyte, lower than QnA Drawer
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none", // let clicks pass through, except where we override
          bgcolor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ pointerEvents: "auto" }} // clickable
        >
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

      {/* Meeting fills the background */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          pr: showQnA
            ? { xs: 0, sm: "360px", md: "400px" } // same width as Q&A panel
            : 0,
          transition: "padding-right 200ms ease",
        }}
      >
        <DyteMeetingWrapper
          authToken={authToken}
          eventId={eventId}
          role={role}
          onMeetingEnd={handleMeetingEnd}
          onOpenQnA={handleOpenQnA}
          onMeetingReady={setSidebarMeeting}
        />
      </Box>

      {/* Custom Q&A drawer (width matches the reserved padding above) */}
      <LiveQnAPanel
        open={showQnA}
        onClose={() => setShowQnA(false)}
        eventId={eventId}
        meeting={sidebarMeeting}
        activeTab={sidebarTab}
        onChangeTab={setSidebarTab}
      />
    </Box>
  );
}