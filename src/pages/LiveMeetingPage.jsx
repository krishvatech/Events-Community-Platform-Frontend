// src/pages/LiveMeetingPage.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
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
  GlobalStyles,
  Switch,
  Divider,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import {
  useDyteClient,
  DyteProvider,
  useDyteMeeting,
} from "@dytesdk/react-web-core";

import {
  DyteMeeting,
  registerAddons,
  DyteNotifications,
} from "@dytesdk/react-ui-kit";

import CustomControlbarButton from "@dytesdk/ui-kit-addons/custom-controlbar-button";
import LiveQnAPanel from "../components/LiveQnAPanel.jsx";

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

// Hook to track permissions
function useDytePermissions(meeting) {
  const [permissions, setPermissions] = useState(meeting?.self?.permissions || {});

  useEffect(() => {
    if (!meeting?.self) return;

    setPermissions(meeting.self.permissions);

    const handleUpdate = (data) => {
      setPermissions({ ...meeting.self.permissions });
    };

    meeting.self.on("permissionsUpdate", handleUpdate);

    return () => {
      meeting.self.off("permissionsUpdate", handleUpdate);
    };
  }, [meeting]);

  return permissions;
}

const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(25, 118, 210, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
`;

// Configuration for Dyte UI
const BASE_UI_CONFIG = {
  designTokens: {
    theme: {
      text: "255, 255, 255",
      onBackground: "255, 255, 255",
      background: "0, 0, 0",
    },
  },
};

function DyteMeetingUI({ config }) {
  const { meeting } = useDyteMeeting();

  if (!meeting) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ CRITICAL FIX: Only pass config if it is explicitly defined.
  // Passing {} triggers the "reading 'dyte-meeting'" error.
  const meetingProps = {
    meeting: meeting,
    mode: "fill",
    showSetupScreen: false,
    style: { width: "100%", height: "100%" },
  };

  if (config) {
    meetingProps.config = config;
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: "100%", width: "100%" }}>
      <DyteMeeting {...meetingProps} />
    </Box>
  );
}

// White Theme Waiting Screen
function WaitingForHostScreen() {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        p: 3,
        boxSizing: "border-box",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 9999,
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
          The live stream hasn&apos;t started yet. Sit tight! We will connect
          you automatically as soon as the host goes live.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, color: "primary.main" }}>
          <CircularProgress size={24} thickness={5} color="inherit" />
          <Typography variant="caption" fontWeight="600" sx={{ letterSpacing: 1, textTransform: "uppercase" }}>
            Connecting...
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

function DyteMeetingWrapper({
  authToken,
  eventId,
  role,
  onMeetingEnd,
  onOpenQnA,
  onMeetingReady,
  dbStatus,
}) {
  const [meeting, initMeeting] = useDyteClient();
  const [initError, setInitError] = useState("");
  const [initDone, setInitDone] = useState(false);
  const [dyteConfig, setDyteConfig] = useState(undefined);
  const [hostJoined, setHostJoined] = useState(false);

  // Expose meeting instance
  useEffect(() => {
    if (!meeting) return;
    if (typeof onMeetingReady === "function") onMeetingReady(meeting);
  }, [meeting, onMeetingReady]);

  // Init meeting
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    (async () => {
      try {
        setInitError("");
        setInitDone(false);
        await initMeeting({
          authToken,
          defaults: {
            audio: false,
            video: role === "publisher",
          },
        });
        if (!cancelled) setInitDone(true);
      } catch (err) {
        if (cancelled) return;
        setInitError(err.message || "Failed to initialize Dyte meeting");
      }
    })();
    return () => { cancelled = true; };
  }, [authToken, initMeeting, role]);

  // API Call to update DB Status
  const updateLiveStatus = useCallback(async (action) => {
    if (!eventId) return;
    try {
      await fetch(toApiUrl(`events/${eventId}/live-status/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ action }),
      });
      console.log(`Updated DB status to: ${action === 'start' ? 'LIVE' : 'ENDED'}`);
    } catch (e) {
      console.error("Failed to update live status", e);
    }
  }, [eventId]);

  // Trigger 'start' when Host initializes meeting
  useEffect(() => {
    if (initDone && role === "publisher") {
        updateLiveStatus("start");
    }
  }, [initDone, role, updateLiveStatus]);

  // -------------------------------------------------------------
  // ✅ FIX: SPOTLIGHT LOGIC & PINNING
  // -------------------------------------------------------------
  useEffect(() => {
    if (!meeting || !initDone || !meeting.self) return;

    // Helper: Enforce Spotlight Layout
    const enforceSpotlightLayout = () => {
       // 'ACTIVE_GRID' automatically handles: Pinned User = Big, Others = Small/Sidebar
       if (meeting.participants && typeof meeting.participants.setViewMode === 'function') {
           meeting.participants.setViewMode('ACTIVE_GRID');
       }
    };

    // 1. HOST LOGIC: Wait for room join, then pin self
    if (role === "publisher") {
      setHostJoined(true);

      const performHostSetup = async () => {
        try {
          // Pin self so the host sees themselves big (optional, but good for confidence)
          if (!meeting.self.isPinned) {
            await meeting.self.pin();
          }
          enforceSpotlightLayout();
        } catch (e) {
          console.warn("Host setup error:", e);
        }
      };

      // Listener for when the user ACTUALLY enters the room
      const handleRoomJoined = () => performHostSetup();

      meeting.self.on('roomJoined', handleRoomJoined);
      
      // Edge case: If already joined (e.g. hot reload), run immediately
      if (meeting.self.roomJoined) {
        performHostSetup();
      }

      return () => {
        meeting.self.off('roomJoined', handleRoomJoined);
      };
    }

    // 2. AUDIENCE LOGIC: Find Host, Pin Host
    const checkForHostAndPin = (participant) => {
      if (!participant) return;

      const preset = (participant.presetName || "").toLowerCase();
      // Adjust these checks based on your actual Dyte Preset names
      const isHost =
        preset.includes("host") ||
        preset.includes("publisher") ||
        preset.includes("admin") ||
        preset.includes("presenter");

      if (isHost) {
        setHostJoined(true);
        enforceSpotlightLayout(); // Ensure audience is in Grid mode to see the Pin effect

        if (!participant.isPinned && typeof participant.pin === "function") {
          participant.pin().catch((e) => {
            console.warn("Failed to pin host from audience:", e);
          });
        }
      }
    };

    // Check currently joined participants
    if (meeting.participants.joined) {
      Array.from(meeting.participants.joined.values()).forEach(checkForHostAndPin);
    }

    // Listen for new joiners
    const handleJoin = (p) => checkForHostAndPin(p);
    meeting.participants.joined.on("participantJoined", handleJoin);

    return () => {
      meeting.participants.joined.off("participantJoined", handleJoin);
    };
  }, [meeting, initDone, role]);


  // Handle Room Left
  useEffect(() => {
    if (!meeting || !meeting.self) return;
    const handleRoomLeft = ({ state }) => {
      if (["left", "ended", "kicked", "rejected"].includes(state)) {
        if (typeof onMeetingEnd === "function") onMeetingEnd(state);
      }
    };
    meeting.self.on("roomLeft", handleRoomLeft);
    return () => {
      try { meeting.self.off?.("roomLeft", handleRoomLeft); } catch (e) {}
    };
  }, [meeting, onMeetingEnd]);

  // Q&A Button Addon
  useEffect(() => {
    if (!meeting || !initDone || !meeting.self) return;
    if (dyteConfig) return; 

    try {
      const openTab = (tab) => {
        const dyteRoot = document.querySelector("dyte-meeting");
        if (dyteRoot) {
          dyteRoot.dispatchEvent(new CustomEvent("dyteStateUpdate", {
            detail: { sidebar: { open: false, view: null } },
            bubbles: true, composed: true,
          }));
        }
        if (typeof onOpenQnA === "function") onOpenQnA(tab || "chat");
      };

      const qnaIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4V5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="1.6"/></svg>`;
      
      const qnaBtn = new CustomControlbarButton({
        position: "right",
        label: "Q&A",
        icon: qnaIcon,
        onClick: () => openTab("qna"),
      });

      const addonsConfig = registerAddons([qnaBtn], meeting);
      setDyteConfig({ ...BASE_UI_CONFIG, ...addonsConfig });

    } catch (e) { 
      console.warn("Failed to register Q&A addon", e); 
    }
  }, [meeting, initDone, onOpenQnA, dyteConfig]);

  if (!authToken) return <Typography sx={{ p: 3 }} color="error">Missing Auth Token</Typography>;
  if (initError) return <Typography sx={{ p: 3 }} color="error">{initError}</Typography>;
  
  if (!initDone || !meeting) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const shouldShowMeeting = hostJoined || dbStatus === "live";

  if (!shouldShowMeeting) {
    return <WaitingForHostScreen />;
  }

  return (
    <DyteProvider value={meeting} fallback={<CircularProgress />}>
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        <DyteMeetingUI config={dyteConfig} />
        <DyteNotifications
          meeting={meeting}
          config={{
            notifications: ["chat", "poll", "participant_joined", "participant_left"],
            notification_sounds: [],
          }}
        />
      </Box>
    </DyteProvider>
  );
}

// ------------- Page component -------------

export default function LiveMeetingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [eventId, setEventId] = useState(null);
  const [role, setRole] = useState("audience");
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dbStatus, setDbStatus] = useState("draft"); 
  
  // Sidebar State
  const [showQnA, setShowQnA] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [sidebarMeeting, setSidebarMeeting] = useState(null);

  // Host Controls
  const [controlsOpen, setControlsOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [pollsEnabled, setPollsEnabled] = useState(true);
  const [participantsTabVisible, setParticipantsTabVisible] = useState(true);
  const [screenShareAllowed, setScreenShareAllowed] = useState(true);
  const [pluginsAllowed, setPluginsAllowed] = useState(true);

  const isHost = role === "publisher";
  
  // Permissions & Broadcasting
  const selfPermissions = useDytePermissions(sidebarMeeting);
  const canScreenShare = selfPermissions.canProduceScreenshare === "ALLOWED";
  const [hostForceBlock, setHostForceBlock] = useState(false);

  // 1. Listen for Broadcasts (Audience Side)
  useEffect(() => {
    if (!sidebarMeeting) return;
    const handleBroadcast = ({ type, payload }) => {
      // Logic: Screen Share Toggle
      if (type === "toggle-screen-share") {
        setHostForceBlock(!payload.allowed);
      }
      // Logic: Host ID for Pinning
      if (type === "host-id" && payload.hostId) {
         // This is handled inside DyteMeetingWrapper's pinning logic via side-effect
      }
    };
    sidebarMeeting.participants.on('broadcastedMessage', handleBroadcast);
    return () => sidebarMeeting.participants.off('broadcastedMessage', handleBroadcast);
  }, [sidebarMeeting]);

  const shouldHideScreenShare = !isHost && (!canScreenShare || hostForceBlock);

  // 2. Host Logic: Control Audience & Broadcast Presence
  useEffect(() => {
    if (!isHost || !sidebarMeeting) return;
    
    // Broadcast Host ID so Audience can Pin them
    const broadcastPresence = () => {
        const myId = sidebarMeeting.self.id;
        sidebarMeeting.participants.broadcastMessage("host-id", { hostId: myId });
    };

    broadcastPresence(); 
    const interval = setInterval(broadcastPresence, 4000); 

    return () => clearInterval(interval);
  }, [isHost, sidebarMeeting]);

  const getAudienceParticipantIds = useCallback(() => {
    if (!sidebarMeeting?.participants?.joined) return [];
    const participants = Array.from(sidebarMeeting.participants.joined.values());
    return participants
      .filter((p) => p.id !== sidebarMeeting.self.id) 
      .map((p) => p.id);
  }, [sidebarMeeting]);

  const updateAudiencePermissions = useCallback(async (permissionsPatch) => {
    if (!isHost || !sidebarMeeting) return;
    const audienceIds = getAudienceParticipantIds();
    if (audienceIds.length === 0) return;
    try {
      await sidebarMeeting.participants.updatePermissions(audienceIds, permissionsPatch);
    } catch (e) {
      console.error("Failed to update audience permissions:", e);
    }
  }, [isHost, sidebarMeeting, getAudienceParticipantIds]);

  // Toggle Handlers
  const handleToggleChat = async () => {
    const next = !chatEnabled;
    setChatEnabled(next);
    await updateAudiencePermissions({
      chat: {
        public: { canSend: next, text: next, files: next },
        private: { canSend: next, text: next, files: next },
      },
    });
  };

  const handleTogglePolls = async () => {
    const next = !pollsEnabled;
    setPollsEnabled(next);
    await updateAudiencePermissions({ polls: { canCreate: next, canVote: next } });
  };

  const handleToggleScreenShare = async () => {
    const next = !screenShareAllowed;
    setScreenShareAllowed(next); 
    // Permission Update
    await updateAudiencePermissions({
      canProduceScreenshare: next ? "ALLOWED" : "NOT_ALLOWED",
      requestProduceScreenshare: next
    });
    // Broadcast Update (Force Signal)
    if (sidebarMeeting?.participants) {
        sidebarMeeting.participants.broadcastMessage("toggle-screen-share", { allowed: next });
    }
  };

  const handleTogglePlugins = async () => {
    const next = !pluginsAllowed;
    setPluginsAllowed(next);
    await updateAudiencePermissions({ plugins: { canStart: next, canClose: next } });
  };

  // Sync New Joiners
  useEffect(() => {
    if (!isHost || !sidebarMeeting) return;
    const handleParticipantJoined = async (participant) => {
      if (participant.id === sidebarMeeting.self.id) return;
      try {
        await sidebarMeeting.participants.updatePermissions([participant.id], {
          canProduceScreenshare: screenShareAllowed ? "ALLOWED" : "NOT_ALLOWED",
          requestProduceScreenshare: screenShareAllowed,
          plugins: { canStart: pluginsAllowed, canClose: pluginsAllowed },
          chat: {
            public: { canSend: chatEnabled, text: chatEnabled, files: chatEnabled },
            private: { canSend: chatEnabled, text: chatEnabled, files: chatEnabled },
          },
        });
      } catch (e) { console.warn("Failed to sync permissions", e); }
    };
    sidebarMeeting.participants.joined.on("participantJoined", handleParticipantJoined);
    return () => { sidebarMeeting.participants.joined.off("participantJoined", handleParticipantJoined); };
  }, [sidebarMeeting, isHost, screenShareAllowed, pluginsAllowed, chatEnabled]);

  // Q&A CSS class toggle
  useEffect(() => {
    const dyteRoot = document.querySelector("dyte-meeting");
    if (!dyteRoot) return;
    if (showQnA) dyteRoot.classList.add("qna-open");
    else dyteRoot.classList.remove("qna-open");
  }, [showQnA]);

  const handleOpenQnA = (tab) => {
    if (tab) setSidebarTab(tab);
    setShowQnA(true);
  };

  const handleBack = () => {
    if (role === "publisher") {
        navigate("/admin/events");
    } else {
        navigate(-1);
    }
  };

  // Setup Role & ID & Fetch Initial Status
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const idFromQuery = search.get("id");
    if (!idFromQuery) {
      setError("Missing event id");
      setLoading(false);
      return;
    }
    setEventId(idFromQuery);
    const roleFromQuery = (search.get("role") || "audience").toLowerCase();
    setRole(roleFromQuery === "publisher" || roleFromQuery === "host" ? "publisher" : "audience");
    
    // FETCH DB STATUS
    const fetchStatus = async () => {
        try {
            const res = await fetch(toApiUrl(`events/${idFromQuery}/`), {
                 headers: authHeader()
            });
            if(res.ok) {
                const data = await res.json();
                setDbStatus(data.status); 
            }
        } catch(e) { console.error("Failed to fetch event status", e); }
    };
    fetchStatus();

  }, [slug]);

  // Join API Call
  useEffect(() => {
    if (!eventId) return;
    const join = async () => {
      try {
        const url = toApiUrl(`events/${eventId}/dyte/join/`);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ role }),
        });
        if (!res.ok) throw new Error("Failed to join live meeting.");
        const data = await res.json();
        setAuthToken(data.authToken);
        if (data.role) setRole(data.role);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    join();
  }, [eventId, role]);

  // Auto Fullscreen
  const pageRef = useRef(null);
  useEffect(() => {
    if (!authToken || !pageRef.current) return;
    const el = pageRef.current;
    const requestFs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (requestFs) try { requestFs.call(el); } catch (e) {}
  }, [authToken]);

  // Helper to update DB Status
  const updateLiveStatus = async (action) => {
    if (!eventId) return;
    try {
      await fetch(toApiUrl(`events/${eventId}/live-status/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error("Failed to update live status", e);
    }
  };

  // Correct Redirects on Meeting End & Update DB
  const handleMeetingEnd = useCallback(async (state) => {
      console.log("Meeting ended with state:", state);
      if (document.fullscreenElement) {
        try { document.exitFullscreen(); } catch (e) {}
      }

      // REDIRECT LOGIC
      if (role === "publisher") {
          await updateLiveStatus("end");
          navigate("/admin/events");
      } else {
          navigate(-1);
      }
    }, [role, navigate, eventId]
  );

  // "Smart" Enforcer for Screen Share Hiding
  useEffect(() => {
    if (isHost) return;

    const updateVisibilityRecursively = (node) => {
      if (!node) return;
      const tag = (node.tagName || "").toLowerCase();
      const label = (node.getAttribute("label") || node.getAttribute("aria-label") || "").toLowerCase();

      const isShareComponent = tag === "dyte-screen-share-toggle" || tag === "dyte-screenshare-view-toggle";
      const isShareLabel = label.includes("share") && label.includes("screen");
      const isGenericShare = (tag === "dyte-controlbar-button" || tag === "dyte-menu-item") && label === "share";

      if (isShareComponent || isShareLabel || isGenericShare) {
        if (shouldHideScreenShare) {
          if (node.style.display !== "none") {
            node.style.display = "none";
            node.style.visibility = "hidden";
            node.style.width = "0px";
            node.style.height = "0px";
            node.style.position = "absolute";
          }
        } else {
          if (node.style.display === "none") {
            node.style.display = "";
            node.style.visibility = "";
            node.style.width = "";
            node.style.height = "";
            node.style.position = "";
          }
        }
      }
      if (node.shadowRoot) Array.from(node.shadowRoot.children).forEach(updateVisibilityRecursively);
      if (node.children) Array.from(node.children).forEach(updateVisibilityRecursively);
    };

    const timer = setInterval(() => {
      const meetingEl = document.querySelector("dyte-meeting");
      if (meetingEl) updateVisibilityRecursively(meetingEl);
    }, 500);
    return () => clearInterval(timer);
  }, [isHost, shouldHideScreenShare]);


  // Loading / Error States
  if (loading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !authToken) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }}>Back</Button>
      </Box>
    );
  }

  return (
    <Box
      ref={pageRef}
      sx={{
        position: "relative",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#020617",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      <GlobalStyles
        styles={{
          "dyte-meeting.qna-open dyte-controlbar-button[label='Q&A'], dyte-meeting.qna-open dyte-controlbar-button[aria-label='Q&A']": {
            backgroundColor: "rgba(59, 130, 246, 0.16)",
            boxShadow: "0 0 0 1px #3b82f6 inset",
            borderRadius: "999px",
          },
        }}
      />

      {/* Force Hide CSS for initial load */}
      {!isHost && shouldHideScreenShare && (
        <style>{`
          dyte-meeting dyte-screen-share-toggle,
          dyte-screen-share-toggle,
          dyte-meeting dyte-controlbar-button[icon="screenshare"],
          dyte-controlbar-button[label="Share Screen"],
          dyte-controlbar-button[label="Share screen"],
          button[aria-label="Share Screen"] {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
          }
        `}</style>
      )}

      {/* Header Bar */}
      <Box
        sx={{
          position: "absolute", top: 0, left: 0, right: 0, p: 1, zIndex: 9998,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          pointerEvents: "none", bgcolor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ pointerEvents: "auto", pl: 1 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} size="small" variant="outlined" sx={{ borderRadius: 999 }}>
            Back
          </Button>
          <Typography variant="body2" color="grey.400">Live meeting powered by Dyte</Typography>
        </Stack>

        {isHost && (
          <Box sx={{ position: "relative", pointerEvents: "auto", mr: 1 }}>
            <IconButton
              size="small"
              onClick={() => setControlsOpen((prev) => !prev)}
              sx={{ color: "grey.100", bgcolor: "rgba(0,0,0,0.45)", "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}
            >
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>

            {controlsOpen && (
              <Paper
                elevation={8}
                sx={{
                  position: "absolute", top: 40, right: 0, minWidth: 260,
                  borderRadius: 3, p: 2, bgcolor: "rgba(18,18,18,0.98)", color: "grey.100",
                }}
              >
                <Typography variant="overline" sx={{ letterSpacing: 1, fontWeight: 600 }}>CONTROLS</Typography>
                <Divider sx={{ mb: 1 }} />
                
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2">Enable Chat</Typography>
                  <Switch size="small" checked={chatEnabled} onChange={handleToggleChat} />
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2">Show Polls Tab</Typography>
                  <Switch size="small" checked={pollsEnabled} onChange={handleTogglePolls} />
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2">Allow Screen Share</Typography>
                  <Switch size="small" checked={screenShareAllowed} onChange={handleToggleScreenShare} />
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2">Allow Plugins</Typography>
                  <Switch size="small" checked={pluginsAllowed} onChange={handleTogglePlugins} />
                </Stack>
              </Paper>
            )}
          </Box>
        )}
      </Box>

      {/* Main Meeting Area */}
      <Box sx={{ flex: 1, minHeight: 0, pr: showQnA ? { xs: 0, sm: "360px", md: "400px" } : 0, transition: "padding-right 200ms ease" }}>
        <DyteMeetingWrapper
          authToken={authToken}
          eventId={eventId}
          role={role}
          onMeetingEnd={handleMeetingEnd}
          onOpenQnA={handleOpenQnA}
          onMeetingReady={setSidebarMeeting}
          dbStatus={dbStatus}
        />
      </Box>

      {/* Side Panels */}
      <LiveQnAPanel
        open={showQnA}
        onClose={() => setShowQnA(false)}
        eventId={eventId}
        meeting={sidebarMeeting}
        activeTab={sidebarTab}
        onChangeTab={setSidebarTab}
        chatEnabled={chatEnabled}
        pollsEnabled={pollsEnabled}
        participantsTabVisible={participantsTabVisible}
        screenShareAllowed={screenShareAllowed}
        pluginsAllowed={pluginsAllowed}
      />
    </Box>
  );
}