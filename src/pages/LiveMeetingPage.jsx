// src/pages/LiveMeetingPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  Menu,
  MenuItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Switch,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import SendIcon from "@mui/icons-material/Send";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import CallEndIcon from "@mui/icons-material/CallEnd";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import PollIcon from "@mui/icons-material/Poll";
import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";

import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";

import { useNavigate, useParams } from "react-router-dom";
import { useDyteClient, DyteProvider } from "@dytesdk/react-web-core";

import { DyteParticipantsAudio } from "@dytesdk/react-ui-kit";



// ================ API Helper ================
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

// -------- Dyte permission hook (copied from Old logic style) ----------
function useDytePermissions(meeting) {
  const [permissions, setPermissions] = useState(meeting?.self?.permissions || {});

  useEffect(() => {
    if (!meeting?.self) return;

    setPermissions(meeting.self.permissions);

    const handleUpdate = () => {
      setPermissions({ ...meeting.self.permissions });
    };

    meeting.self.on("permissionsUpdate", handleUpdate);
    return () => meeting.self.off("permissionsUpdate", handleUpdate);
  }, [meeting]);

  return permissions;
}

function roleFromPreset(presetName = "") {
  const preset = presetName.toLowerCase();
  if (
    preset.includes("host") ||
    preset.includes("publisher") ||
    preset.includes("admin") ||
    preset.includes("presenter")
  ) {
    return "Host";
  }
  return "Audience";
}

// Normalize backend role strings into the two modes we support
const normalizeRole = (raw = "") => {
  const r = String(raw || "").toLowerCase();
  return r.includes("publisher") || r.includes("host") || r.includes("admin") ? "publisher" : "audience";
};

// ==============================

function TabPanel({ value, index, children }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ height: "100%", display: value === index ? "flex" : "none", flexDirection: "column" }}
    >
      {value === index ? children : null}
    </Box>
  );
}

function initialsFromName(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function formatElapsedTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatClockTime(ts) {
  if (!ts) return "--:--";
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--";
  }
}


function ParticipantVideo({ participant, meeting, isSelf = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !participant || !meeting) return;

    let cleanup = () => { };

    // Always set these (helps iOS/Safari)
    el.autoplay = true;
    el.playsInline = true;
    el.muted = true; // always mute video elements; audio comes from DyteParticipantsAudio


    try {
      // ✅ BEST for self (official API on meeting.self) :contentReference[oaicite:0]{index=0}
      if (isSelf && typeof meeting.self?.registerVideoElement === "function") {
        meeting.self.registerVideoElement(el);
        cleanup = () => meeting.self?.deregisterVideoElement?.(el);
      }
      // ✅ Some SDK versions expose registerVideoElement on participant too
      else if (typeof participant.registerVideoElement === "function") {
        participant.registerVideoElement(el);
        cleanup = () => participant.deregisterVideoElement?.(el);
      }
      // ✅ Fallback: use videoTrack style APIs if available
      else {
        const track = participant.videoTrack || participant.video;
        if (track?.play) {
          track.play(el);
          cleanup = () => track.stop?.(el);
        } else if (track?.attach) {
          track.attach(el);
          cleanup = () => track.detach?.(el);
        }
      }
    } catch (e) {
      console.warn("[LiveMeeting] attach video failed:", e);
    }

    return () => {
      try { cleanup(); } catch { }
    };
  }, [participant, meeting, isSelf]);

  return (
    <Box
      component="video"
      ref={videoRef}
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}


function ScreenShareVideo({ participant, meeting }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !participant) return;

    let cancelled = false;

    const getMediaTrack = (maybeTrack) => {
      if (!maybeTrack) return null;
      // Some SDKs wrap MediaStreamTrack in an object (e.g., { track })
      const t = maybeTrack.track || maybeTrack.mediaStreamTrack || maybeTrack;
      return t && typeof t === "object" ? t : null;
    };

    const clearEl = () => {
      try {
        el.srcObject = null;
      } catch (_) { }
    };

    const attachWithSdk = () => {
      try {
        if (typeof participant.registerScreenShareElement === "function") {
          participant.registerScreenShareElement(el);
          return true;
        }
      } catch (_) { }
      return false;
    };

    const attachFromTracks = (tracks) => {
      if (cancelled) return;

      // Prefer SDK helper if available (handles renegotiations internally)
      if (attachWithSdk()) return;

      const videoTrack =
        getMediaTrack(tracks?.video) ||
        getMediaTrack(tracks?.videoTrack) ||
        getMediaTrack(participant?.screenShareTracks?.video) ||
        getMediaTrack(participant?.screenShareTrack);

      if (videoTrack && videoTrack.kind === "video") {
        try {
          const stream = new MediaStream([videoTrack]);
          el.srcObject = stream;
          el.play?.().catch(() => { });
        } catch (_) {
          clearEl();
        }
      } else {
        clearEl();
      }
    };

    // Initial attach
    attachFromTracks(participant.screenShareTracks);

    const onUpdate = (payload) => {
      if (cancelled) return;

      const enabled =
        typeof payload?.screenShareEnabled === "boolean"
          ? payload.screenShareEnabled
          : undefined;

      if (enabled === false) {
        try {
          if (typeof participant.deregisterScreenShareElement === "function") {
            participant.deregisterScreenShareElement(el);
          }
        } catch (_) { }
        clearEl();
        return;
      }

      const tracks = payload?.screenShareTracks || payload?.tracks || payload;
      attachFromTracks(tracks);
    };

    try {
      if (typeof participant.on === "function") {
        participant.on("screenShareUpdate", onUpdate);
      }
    } catch (_) { }

    // As a safety net, retry once shortly after mount (helps if tracks arrive a tick later)
    const t = setTimeout(() => {
      if (cancelled) return;
      attachFromTracks(participant.screenShareTracks);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);

      try {
        if (typeof participant.off === "function") {
          participant.off("screenShareUpdate", onUpdate);
        }
      } catch (_) { }

      try {
        if (typeof participant.deregisterScreenShareElement === "function") {
          participant.deregisterScreenShareElement(el);
        }
      } catch (_) { }

      clearEl();
    };
  }, [participant, meeting]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
}

function StageMiniTile({ p, meeting, tileW = 140, tileH = 82 }) {
  const isSmall = tileW <= 132 || tileH <= 76;

  const raw = p?._raw || null;
  const isSelf = Boolean(raw?.id && meeting?.self?.id && raw.id === meeting.self.id);
  const showVideo = Boolean(p?.cam && raw);

  return (
    <Tooltip title={p?.name || ""} arrow placement="top">
      <Paper
        variant="outlined"
        sx={{
          flex: "0 0 auto",
          width: tileW,
          height: tileH,
          borderRadius: 2,
          borderColor: "rgba(255,255,255,0.10)",
          bgcolor: "rgba(255,255,255,0.03)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
        }}
      >
        {/* ✅ Video layer (behind) */}
        {showVideo && (
          <Box sx={{ position: "absolute", inset: 0, zIndex: 0, bgcolor: "rgba(0,0,0,0.25)" }}>
            <ParticipantVideo participant={raw} meeting={meeting} isSelf={isSelf} />
          </Box>
        )}

        {/* Avatar overlay (show always, matches your UI) */}
        <Avatar
          sx={{
            position: "absolute",
            top: isSmall ? 6 : 8,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(255,255,255,0.14)",
            width: isSmall ? 30 : 34,
            height: isSmall ? 30 : 34,
            fontSize: isSmall ? 11 : 12,
            zIndex: 1,
          }}
        >
          {initialsFromName(p.name)}
        </Avatar>

        <Typography
          noWrap
          sx={{
            position: "absolute",
            bottom: 8,
            left: 10,
            right: 62,
            fontWeight: 700,
            fontSize: 12,
            opacity: 0.9,
            zIndex: 1,
            textShadow: showVideo ? "0 2px 8px rgba(0,0,0,0.55)" : "none",
          }}
        >
          {p.name}
        </Typography>

        <Box
          sx={{
            position: "absolute",
            bottom: 6,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            zIndex: 1,
          }}
        >
          {p.cam ? (
            <VideocamIcon sx={{ fontSize: 18, color: "#22c55e" }} />
          ) : (
            <VideocamOffIcon sx={{ fontSize: 18, color: "#ef4444" }} />
          )}

          {p.mic ? (
            <MicIcon sx={{ fontSize: 18, color: "#22c55e" }} />
          ) : (
            <MicOffIcon sx={{ fontSize: 18, color: "#ef4444" }} />
          )}
        </Box>
      </Paper>
    </Tooltip>
  );
}

function WaitingForHost({
  onBack,
  eventTitle = "Live Meeting",
  scheduled = "--",
  duration = "--",
  roleLabel = "Audience",
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        px: 2,
        bgcolor: "#05070D",
        backgroundImage:
          "radial-gradient(900px 420px at 50% 0%, rgba(90,120,255,0.18), transparent 55%), radial-gradient(900px 520px at 0% 100%, rgba(20,184,177,0.10), transparent 60%)",
        color: "#E5E7EB",
      }}
    >
      {/* Top Brand */}
      <Box
        sx={{
          position: "absolute",
          top: 44,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, opacity: 0.95 }}>
          <AutoAwesomeIcon sx={{ fontSize: 22, color: "rgba(255,255,255,0.85)" }} />
          <Typography
            sx={{
              fontWeight: 700,
              letterSpacing: 0.2,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            IMAA Connect
          </Typography>
        </Box>
      </Box>

      {/* Bottom-left role badge */}
      <Box sx={{ position: "fixed", left: 16, bottom: 16, zIndex: 50 }}>
        <Chip
          label={roleLabel}
          size="small"
          sx={{
            bgcolor: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 700,
            backdropFilter: "blur(8px)",
          }}
        />
      </Box>

      {/* Center Card */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 4,
          p: { xs: 2.5, sm: 3 },
          bgcolor: "rgba(15, 23, 42, 0.60)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(12px)",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        {/* Icon circle */}
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 2,
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <AccessTimeRoundedIcon sx={{ fontSize: 34, color: "rgba(255,255,255,0.70)" }} />
        </Box>

        <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.8, color: "rgba(255,255,255,0.92)" }}>
          Waiting for host to start the meeting
        </Typography>

        <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)", mb: 2 }}>
          The meeting will begin once the host joins. You’ll be automatically connected.
        </Typography>

        {/* Info box */}
        <Box
          sx={{
            textAlign: "left",
            borderRadius: 3,
            p: 2,
            bgcolor: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Event</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {eventTitle}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Scheduled</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {scheduled}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Duration</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {duration}
            </Typography>
          </Stack>
        </Box>

        {/* Tip */}
        <Box
          sx={{
            mt: 2,
            borderRadius: 3,
            px: 2,
            py: 1.2,
            bgcolor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
            💡 Tip: Make sure your microphone and camera are ready
          </Typography>
        </Box>

        {/* Connecting */}
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
          <CircularProgress size={22} sx={{ color: "rgba(255,255,255,0.70)" }} />
          <Typography sx={{ fontWeight: 700, letterSpacing: 0.2, color: "rgba(255,255,255,0.80)" }}>
            Connecting...
          </Typography>
        </Stack>

        {onBack && (
          <Button
            onClick={onBack}
            variant="outlined"
            sx={{
              mt: 2.5,
              px: 3,
              py: 1,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 800,
              letterSpacing: 0.4,
              opacity: 1,
              color: "rgba(255,255,255,0.92)",
              borderColor: "rgba(255,255,255,0.28)",
              bgcolor: "rgba(255,255,255,0.06)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.10)",
                borderColor: "rgba(255,255,255,0.40)",
              },
            }}
          >
            BACK
          </Button>
        )}
      </Paper>

      {/* Footer */}
      <Typography sx={{ mt: 3, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
        Having trouble? Check your connection or contact support
      </Typography>
    </Box>
  );
}



export default function NewLiveMeeting() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const [rightOpen, setRightOpen] = useState(false); // mobile drawer
  const [tab, setTab] = useState(0);

  // ✅ Host permissions (synced to Dyte permissions)
  const [hostPerms, setHostPerms] = useState({
    chat: true,
    polls: true,
    screenShare: true,
  });
  const [hostForceBlock, setHostForceBlock] = useState(false);

  // ✅ Settings menu anchor
  const [permAnchorEl, setPermAnchorEl] = useState(null);
  const permMenuOpen = Boolean(permAnchorEl);

  const openPermMenu = (e) => setPermAnchorEl(e.currentTarget);
  const closePermMenu = () => setPermAnchorEl(null);

  // ✅ Fullscreen support
  const rootRef = useRef(null);
  const endHandledRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const joinedOnceRef = useRef(false);
  const askedMediaPermRef = useRef(false);
  const [roomJoined, setRoomJoined] = useState(false);

  // ✅ Local join timer (per user)
  const joinedAtRef = useRef(null);
  const [joinElapsedLabel, setJoinElapsedLabel] = useState("00:00");

  // ✅ Per-participant join clock time (for Member/User Info dialog)
  const participantJoinedAtRef = useRef(new Map()); // participantId -> timestamp(ms)

  // ============ POLL CREATION STATE ============
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [createPollQuestion, setCreatePollQuestion] = useState("");
  const [createPollOptions, setCreatePollOptions] = useState(["", ""]);

  const handleAddOption = () => {
    setCreatePollOptions((prev) => [...prev, ""]);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...createPollOptions];
    newOptions[index] = value;
    setCreatePollOptions(newOptions);
  };

  const handleRemoveOption = (index) => {
    if (createPollOptions.length <= 2) return;
    setCreatePollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancelPoll = () => {
    setIsCreatingPoll(false);
    setCreatePollQuestion("");
    setCreatePollOptions(["", ""]);
  };

  const handleLaunchPoll = async () => {
    if (!createPollQuestion.trim() || createPollOptions.some((o) => !o.trim())) return;

    // TODO: Connect this to your backend API
    console.log("Launching Poll:", { question: createPollQuestion, options: createPollOptions });

    // Reset after launch
    handleCancelPoll();
  };


  const getFullscreenElement = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;

  const toggleFullscreen = async () => {
    try {
      const el = rootRef.current;
      if (!el) return;

      const fsEl = getFullscreenElement();

      // Exit
      if (fsEl) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }

      // Enter (prefer root container)
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  };

  // keep icon state in sync (Esc key, browser UI, etc.)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    onFsChange();
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // ✅ If host disables the currently-open tab, jump to Q&A
  useEffect(() => {
    if (!hostPerms.chat && tab === 0) setTab(1);   // Chat -> Q&A
    if (!hostPerms.polls && tab === 2) setTab(1);  // Polls -> Q&A
  }, [hostPerms.chat, hostPerms.polls, tab]);

  useEffect(() => {
    if (tab === 2) setTab(1); // if Poll was selected, jump to Q&A
  }, [tab]);

  // Desktop right panel toggle
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const isPanelOpen = isMdUp ? rightPanelOpen : rightOpen;
  const isChatActive = isPanelOpen && tab === 0 && hostPerms.chat;

  // When switching to desktop, keep panel open by default
  useEffect(() => {
    if (isMdUp) setRightPanelOpen(true);
  }, [isMdUp]);

  const toggleRightPanel = (targetTab = 0) => {
    let nextTab = targetTab;

    // ✅ Chat OFF => open panel but jump to Q&A (so chat never shows)
    if (nextTab === 0 && !hostPerms.chat) nextTab = 1;

    // ✅ Polls OFF => never land on polls
    if (nextTab === 2 && !hostPerms.polls) nextTab = 1;

    setTab(nextTab);
    if (isMdUp) setRightPanelOpen(true);
    else setRightOpen(true);
  };

  const closeRightPanel = () => {
    if (isMdUp) setRightPanelOpen(false);
    else setRightOpen(false);
  };

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);

  const scrollSx = {
    scrollbarWidth: "thin", // Firefox
    scrollbarColor: "rgba(255,255,255,0.18) rgba(255,255,255,0.06)", // thumb track

    "&::-webkit-scrollbar": { width: 8, height: 8 },
    "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.06)" },
    "&::-webkit-scrollbar-thumb": {
      background: "rgba(255,255,255,0.16)",
      borderRadius: 999,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "rgba(255,255,255,0.26)",
    },
  };

  const [memberInfoOpen, setMemberInfoOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const openMemberInfo = (member) => {
    setSelectedMember(member);
    setMemberInfoOpen(true);
  };

  const closeMemberInfo = () => {
    setMemberInfoOpen(false);
    setSelectedMember(null);
  };

  const { slug } = useParams();
  const navigate = useNavigate();

  // ---------- Old logic states (real) ----------
  const [eventId, setEventId] = useState(null);
  const [role, setRole] = useState("audience"); // 'publisher' | 'audience'
  const isHost = role === "publisher";

  const [authToken, setAuthToken] = useState("");
  const [loadingJoin, setLoadingJoin] = useState(true);
  const [joinError, setJoinError] = useState("");
  const [dbStatus, setDbStatus] = useState("draft");
  const [eventTitle, setEventTitle] = useState("Live Meeting");

  const [scheduledLabel, setScheduledLabel] = useState("--");
  const [durationLabel, setDurationLabel] = useState("--");

  // ---------- Dyte init ----------
  const [dyteMeeting, initMeeting] = useDyteClient();
  const [initDone, setInitDone] = useState(false);
  const selfPermissions = useDytePermissions(dyteMeeting);

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const canSelfScreenShare =
    selfPermissions?.canProduceScreenshare === "ALLOWED"; // Dyte permission string

  const screenShareDisabled =
    !roomJoined ||
    !canSelfScreenShare ||
    !hostPerms.screenShare ||           // host toggle
    (!isHost && hostForceBlock);        // host broadcast block for audience

  const toggleScreenShareNow = useCallback(async () => {
    if (!dyteMeeting?.self) return;
    if (screenShareDisabled) return;

    try {
      if (isScreenSharing) {
        await dyteMeeting.self.disableScreenShare?.();   // stop
        setIsScreenSharing(false);
      } else {
        await dyteMeeting.self.enableScreenShare?.();    // start
        setIsScreenSharing(true);
      }
    } catch (e) {
      console.warn("[LiveMeeting] screenshare toggle failed:", e);
      // keep state consistent if it failed
      setIsScreenSharing(false);
    }
  }, [dyteMeeting, isScreenSharing, screenShareDisabled]);
  const canScreenShare = selfPermissions.canProduceScreenshare === "ALLOWED";
  const shouldHideScreenShare = !isHost && (!canScreenShare || hostForceBlock);
  // const screenShareDisabled = isHost ? false : shouldHideScreenShare || !hostPerms.screenShare;

  // ---------- Host detection (for audience waiting screen) ----------
  const [hostJoined, setHostJoined] = useState(false);
  const [pinnedHost, setPinnedHost] = useState(null);
  const [hostIdHint, setHostIdHint] = useState(null);


  const getJoinedParticipants = useCallback(() => {
    const participantsObj = dyteMeeting?.participants;
    if (!participantsObj) return [];

    const toArraySafe = (source) => {
      if (!source) return [];
      if (Array.isArray(source)) return source;
      if (typeof source === "object" && Array.isArray(source.participants)) return source.participants;
      if (typeof source.toArray === "function") return source.toArray();
      if (typeof source.values === "function") return Array.from(source.values());
      try {
        return Array.from(source);
      } catch {
        return [];
      }
    };

    // Some SDKs nest participant maps inside `.participants`
    const unwrap = (item) => {
      if (!item) return [];
      if (typeof item === "object" && item.participants) return toArraySafe(item.participants);
      return toArraySafe(item);
    };

    // Union of possible collections; dedupe by id to be safe
    const buckets = [
      participantsObj.joined,
      participantsObj.all,
      participantsObj.active,
      participantsObj.pinned,
      participantsObj.hidden,
      participantsObj.waitlisted,
      participantsObj.selectedPeers,
      participantsObj.videoSubscribed,
      participantsObj.audioSubscribed,
      participantsObj.list,
      participantsObj.participants,
      participantsObj,
      participantsObj?.joined?.participants,
    ];

    const all = buckets.flatMap(unwrap);
    const deduped = [];
    const seen = new Set();
    for (const p of all) {
      const id = p?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      deduped.push(p);
    }
    return deduped;
  }, [dyteMeeting]);

  const getAudienceParticipantIds = useCallback(() => {
    const participants = getJoinedParticipants();
    return participants.filter((p) => p.id !== dyteMeeting?.self?.id).map((p) => p.id);
  }, [dyteMeeting?.self?.id, getJoinedParticipants]);

  const updateAudiencePermissions = useCallback(
    async (permissionsPatch) => {
      if (!isHost || !dyteMeeting) return;
      const audienceIds = getAudienceParticipantIds();
      if (audienceIds.length === 0) return;
      try {
        await dyteMeeting.participants.updatePermissions(audienceIds, permissionsPatch);
      } catch (e) {
        console.warn("Failed to update audience permissions:", e);
      }
    },
    [dyteMeeting, getAudienceParticipantIds, isHost]
  );

  // ---------- Read query params + fetch DB status ----------
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const idFromQuery = search.get("id");
    if (!idFromQuery) {
      setJoinError("Missing event id");
      setLoadingJoin(false);
      return;
    }

    setEventId(idFromQuery);

    const roleFromQuery = (search.get("role") || "audience").toLowerCase();
    setRole(normalizeRole(roleFromQuery));

    // Fetch DB status + title
    (async () => {
      try {
        const res = await fetch(toApiUrl(`events/${idFromQuery}/`), { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
          if (data?.status) setDbStatus(data.status);
          if (data?.title) setEventTitle(data.title);
          const start =
            data?.start_time ||
            data?.starts_at ||
            data?.start_at ||
            data?.scheduled_at ||
            data?.scheduled_start;

          const end =
            data?.end_time ||
            data?.ends_at ||
            data?.end_at;

          if (start) {
            const d = new Date(start);
            const day = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
            const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            setScheduledLabel(`${day} • ${time}`);
          }

          let mins = data?.duration_minutes || data?.duration_mins || data?.duration;
          if (!mins && start && end) {
            mins = Math.round((new Date(end) - new Date(start)) / 60000);
          }
          if (mins) setDurationLabel(`${mins} minutes`);
        }
      } catch (e) {
        console.warn("Failed to fetch event status", e);
      }
    })();
  }, [slug]);

  // ---------- Join Dyte via your backend ----------
  useEffect(() => {
    if (!eventId) return;

    (async () => {
      setLoadingJoin(true);
      setJoinError("");

      try {
        const res = await fetch(toApiUrl(`events/${eventId}/dyte/join/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ role }),
        });

        if (!res.ok) throw new Error("Failed to join live meeting.");
        const data = await res.json();

        setAuthToken(data.authToken);
        if (data.role) setRole(normalizeRole(data.role));
      } catch (e) {
        setJoinError(e.message || "Join failed");
      } finally {
        setLoadingJoin(false);
      }
    })();
  }, [eventId, role]);

  // ---------- Init Dyte meeting ----------
  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;
    (async () => {
      try {
        setInitDone(false);

        await initMeeting({
          authToken,
          defaults: {
            audio: false,
            video: role === "publisher",
          },
        });

        if (!cancelled) setInitDone(true);
      } catch (e) {
        if (!cancelled) setJoinError(e.message || "Failed to initialize Dyte meeting");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authToken, initMeeting, role]);

  // ---------- MUST join Dyte room (custom UI doesn't auto-join) ----------
  useEffect(() => {
    if (!dyteMeeting?.self || !initDone) return;

    const onRoomJoined = () => setRoomJoined(true);
    dyteMeeting.self.on?.("roomJoined", onRoomJoined);

    // refresh case
    if (dyteMeeting.self.roomJoined) setRoomJoined(true);

    (async () => {
      // ✅ join only once
      if (joinedOnceRef.current || dyteMeeting.self.roomJoined) return;
      joinedOnceRef.current = true;

      // ✅ ask mic+cam permission (browser popup)
      if (!askedMediaPermRef.current) {
        askedMediaPermRef.current = true;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.warn("[LiveMeeting] getUserMedia denied:", e);
        }
      }

      // ✅ ACTUAL JOIN
      try {
        await dyteMeeting.joinRoom?.();
      } catch (e) {
        console.error("[LiveMeeting] joinRoom failed:", e);
        setJoinError(e?.message || "Failed to join Dyte room");
      }
    })();

    return () => {
      dyteMeeting.self.off?.("roomJoined", onRoomJoined);
    };
  }, [dyteMeeting, initDone]);

  // ---------- Join timer (shows how long THIS user has been in the meeting) ----------
  useEffect(() => {
    if (!roomJoined) return;

    if (!joinedAtRef.current) joinedAtRef.current = Date.now();

    const tick = () => {
      setJoinElapsedLabel(formatElapsedTime(Date.now() - joinedAtRef.current));
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [roomJoined]);

  // Keep local button state in sync with Dyte actual state

  useEffect(() => {
    if (!dyteMeeting?.self) return;

    const sync = () => {
      setMicOn(Boolean(dyteMeeting.self.audioEnabled));
      setCamOn(Boolean(dyteMeeting.self.videoEnabled));
    };

    sync();
    dyteMeeting.self.on?.("audioUpdate", sync);
    dyteMeeting.self.on?.("videoUpdate", sync);

    return () => {
      dyteMeeting.self.off?.("audioUpdate", sync);
      dyteMeeting.self.off?.("videoUpdate", sync);
    };
  }, [dyteMeeting]);
  useEffect(() => {
    if (!dyteMeeting?.self) return;
    setMicOn(Boolean(dyteMeeting.self.audioEnabled));
    setCamOn(Boolean(dyteMeeting.self.videoEnabled));
  }, [dyteMeeting, roomJoined]);

  // ---------- Update DB live-status (start/end) ----------
  const updateLiveStatus = useCallback(
    async (action) => {
      if (!eventId) return;
      try {
        await fetch(toApiUrl(`events/${eventId}/live-status/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ action }),
        });
      } catch (e) {
        console.warn("Failed to update live status", e);
      }
    },
    [eventId]
  );

  // Host triggers LIVE on init done
  useEffect(() => {
    if (initDone && role === "publisher") {
      updateLiveStatus("start");
      setDbStatus("live"); // ✅ show LIVE chip immediately for host too
    }
  }, [initDone, role, updateLiveStatus]);

  const handleMeetingEnd = useCallback(
    async (state) => {
      if (endHandledRef.current) return;
      endHandledRef.current = true;

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch { }
      }

      if (role === "publisher") {
        await updateLiveStatus("end");
        navigate("/admin/events");
      } else {
        navigate(-1);
      }
    },
    [navigate, role, updateLiveStatus]
  );

  useEffect(() => {
    if (!dyteMeeting?.self) return;
    const handleRoomLeft = ({ state }) => {
      if (["left", "ended", "kicked", "rejected", "disconnected", "failed"].includes(state)) {
        handleMeetingEnd(state);
      }
    };
    dyteMeeting.self.on("roomLeft", handleRoomLeft);
    return () => dyteMeeting.self.off?.("roomLeft", handleRoomLeft);
  }, [dyteMeeting, handleMeetingEnd]);

  // ---------- Detect host for audience (pin + waiting screen) ----------
  useEffect(() => {
    if (!dyteMeeting || !initDone || !dyteMeeting.self) return;

    const enforceSpotlightLayout = () => {
      if (dyteMeeting.participants && typeof dyteMeeting.participants.setViewMode === "function") {
        dyteMeeting.participants.setViewMode("ACTIVE_GRID");
      }
    };

    // Host case
    if (role === "publisher") {
      setHostJoined(true);
      setPinnedHost(dyteMeeting.self);

      const performHostSetup = async () => {
        try {
          if (!dyteMeeting.self.isPinned && typeof dyteMeeting.self.pin === "function") {
            await dyteMeeting.self.pin();
          }
          enforceSpotlightLayout();
        } catch (e) {
          console.warn("Host setup error:", e);
        }
      };

      const handleRoomJoined = () => performHostSetup();

      dyteMeeting.self.on("roomJoined", handleRoomJoined);
      if (dyteMeeting.self.roomJoined) performHostSetup();

      return () => {
        dyteMeeting.self.off?.("roomJoined", handleRoomJoined);
      };
    }

    // Audience: search host in joined participants
    const checkForHostAndPin = (participant) => {
      if (!participant) return;
      const preset = (participant.presetName || "").toLowerCase();
      const isPublisher =
        preset.includes("host") ||
        preset.includes("publisher") ||
        preset.includes("admin") ||
        preset.includes("presenter") ||
        (hostIdHint && participant.id === hostIdHint);

      if (isPublisher) {
        setHostJoined(true);
        setPinnedHost(participant);
        enforceSpotlightLayout();
        if (!participant.isPinned && typeof participant.pin === "function") {
          participant.pin().catch((e) => console.warn("Failed to pin host from audience:", e));
        }
      }
    };

    getJoinedParticipants().forEach(checkForHostAndPin);
    if (dyteMeeting.self) checkForHostAndPin(dyteMeeting.self);

    const handleJoin = (p) => checkForHostAndPin(p);
    dyteMeeting.participants?.joined?.on?.("participantJoined", handleJoin);
    dyteMeeting.participants?.on?.("participantJoined", handleJoin);

    return () => {
      dyteMeeting.participants?.joined?.off?.("participantJoined", handleJoin);
      dyteMeeting.participants?.off?.("participantJoined", handleJoin);
    };
  }, [dyteMeeting, getJoinedParticipants, initDone, role, hostIdHint]);

  // Listen for host broadcast updates (audience)
  useEffect(() => {
    if (!dyteMeeting) return;

    const handleBroadcast = ({ type, payload }) => {
      if (type === "toggle-screen-share") {
        setHostForceBlock(!payload?.allowed);
      }

      if (type === "meeting-ended" && payload?.hostId) {
        // ignore echo for host itself
        if (dyteMeeting?.self?.id !== payload.hostId) {
          handleMeetingEnd("ended");
          dyteMeeting?.leave?.();
          dyteMeeting?.leaveRoom?.();
        }
      }

      // ✅ Host announces itself so audience can pin even if preset is weird
      if (type === "host-id" && payload?.hostId) {
        setHostIdHint(payload.hostId);

        const found = getJoinedParticipants().find((p) => p?.id === payload.hostId);
        if (found) {
          setHostJoined(true);
          setPinnedHost(found);
          if (!found.isPinned && typeof found.pin === "function") {
            found.pin().catch(() => { });
          }
        }
      }
    };

    dyteMeeting.participants?.on?.("broadcastedMessage", handleBroadcast);
    return () => dyteMeeting.participants?.off?.("broadcastedMessage", handleBroadcast);
  }, [dyteMeeting, getJoinedParticipants]);

  // ✅ If Host leaves, auto-end for everyone (audience auto leaves)
  useEffect(() => {
    if (!dyteMeeting) return;
    if (isHost) return; // host doesn't need to auto-leave (already leaving)

    const onParticipantLeft = (p) => {
      const hostId = hostIdHint || pinnedHost?.id;
      if (!hostId || !p?.id) return;

      // Host left => end meeting for audience
      if (p.id === hostId) {
        if (endHandledRef.current) return;

        // optional: reflect UI state
        setDbStatus("ended");

        // leave + exit screen
        dyteMeeting.leaveRoom?.();
        handleMeetingEnd("ended");
      }
    };

    dyteMeeting.participants?.joined?.on?.("participantLeft", onParticipantLeft);
    dyteMeeting.participants?.on?.("participantLeft", onParticipantLeft);
    dyteMeeting?.on?.("participantLeft", onParticipantLeft);

    return () => {
      dyteMeeting.participants?.joined?.off?.("participantLeft", onParticipantLeft);
      dyteMeeting.participants?.off?.("participantLeft", onParticipantLeft);
      dyteMeeting?.off?.("participantLeft", onParticipantLeft);
    };
  }, [dyteMeeting, isHost, hostIdHint, pinnedHost, handleMeetingEnd]);

  // Host broadcasts presence so audience can pin
  useEffect(() => {
    if (!isHost || !dyteMeeting?.self) return;
    if (!dyteMeeting.self.roomJoined) return;

    const broadcastPresence = () => {
      const myId = dyteMeeting.self?.id;
      // Only broadcast after join is complete to avoid ERR1205
      if (myId && dyteMeeting.self?.roomJoined) {
        dyteMeeting.participants?.broadcastMessage?.("host-id", { hostId: myId });
      }
    };
    broadcastPresence();
    const interval = setInterval(broadcastPresence, 4000);
    return () => clearInterval(interval);
  }, [isHost, dyteMeeting]);

  // Sync new joiners with host permission toggles
  useEffect(() => {
    if (!isHost || !dyteMeeting?.participants?.joined || !dyteMeeting?.self) return;
    const handleParticipantJoined = async (participant) => {
      if (participant.id === dyteMeeting.self?.id) return;
      try {
        await dyteMeeting.participants.updatePermissions([participant.id], {
          canProduceScreenshare: hostPerms.screenShare ? "ALLOWED" : "NOT_ALLOWED",
          requestProduceScreenshare: hostPerms.screenShare,
          chat: {
            public: { canSend: hostPerms.chat, text: hostPerms.chat, files: hostPerms.chat },
            private: { canSend: hostPerms.chat, text: hostPerms.chat, files: hostPerms.chat },
          },
          polls: { canCreate: hostPerms.polls, canVote: hostPerms.polls },
        });
      } catch (e) {
        console.warn("Failed to sync permissions", e);
      }
    };
    dyteMeeting.participants.joined.on("participantJoined", handleParticipantJoined);
    return () => dyteMeeting.participants.joined.off("participantJoined", handleParticipantJoined);
  }, [dyteMeeting, hostPerms.chat, hostPerms.polls, hostPerms.screenShare, isHost]);

  // ---------- Build participants list for your NEW UI ----------
  const [participantsTick, setParticipantsTick] = useState(0);
  const observedParticipantsRef = useRef(new Map()); // fallback map from events

  useEffect(() => {
    if (!dyteMeeting?.participants) return;

    const bump = () => setParticipantsTick((v) => v + 1);
    const upsert = (p) => {
      if (p?.id) {
        observedParticipantsRef.current.set(p.id, p);
        bump();
      }
    };
    const remove = (p) => {
      if (p?.id && observedParticipantsRef.current.has(p.id)) {
        observedParticipantsRef.current.delete(p.id);
        bump();
      }
    };

    dyteMeeting.participants.joined?.on?.("participantJoined", bump);
    dyteMeeting.participants.joined?.on?.("participantLeft", bump);
    dyteMeeting.participants.joined?.on?.("participantUpdated", bump);
    dyteMeeting.participants.joined?.on?.("participantJoined", upsert);
    dyteMeeting.participants.joined?.on?.("participantLeft", remove);
    dyteMeeting.participants.joined?.on?.("participantUpdated", upsert);

    // Some SDK versions fire events on the participants object instead of the joined map
    dyteMeeting.participants?.on?.("participantJoined", bump);
    dyteMeeting.participants?.on?.("participantLeft", bump);
    dyteMeeting.participants?.on?.("participantUpdated", bump);
    dyteMeeting.participants?.on?.("participantsUpdated", bump);
    dyteMeeting.participants?.on?.("participantJoined", upsert);
    dyteMeeting.participants?.on?.("participantLeft", remove);
    dyteMeeting.participants?.on?.("participantUpdated", upsert);
    dyteMeeting.participants?.on?.("participantsUpdated", bump);
    dyteMeeting?.on?.("participantJoined", bump);
    dyteMeeting?.on?.("participantLeft", bump);
    dyteMeeting?.on?.("participantUpdated", bump);
    dyteMeeting?.on?.("participantJoined", upsert);
    dyteMeeting?.on?.("participantLeft", remove);
    dyteMeeting?.on?.("participantUpdated", upsert);

    // Initial sync
    bump();

    // Fallback: periodic sync in case events are missed
    const poll = setInterval(bump, 2500);

    return () => {
      dyteMeeting.participants.joined?.off?.("participantJoined", bump);
      dyteMeeting.participants.joined?.off?.("participantLeft", bump);
      dyteMeeting.participants.joined?.off?.("participantUpdated", bump);
      dyteMeeting.participants.joined?.off?.("participantJoined", upsert);
      dyteMeeting.participants.joined?.off?.("participantLeft", remove);
      dyteMeeting.participants.joined?.off?.("participantUpdated", upsert);
      dyteMeeting.participants?.off?.("participantJoined", bump);
      dyteMeeting.participants?.off?.("participantLeft", bump);
      dyteMeeting.participants?.off?.("participantUpdated", bump);
      dyteMeeting.participants?.off?.("participantsUpdated", bump);
      dyteMeeting.participants?.off?.("participantJoined", upsert);
      dyteMeeting.participants?.off?.("participantLeft", remove);
      dyteMeeting.participants?.off?.("participantUpdated", upsert);
      dyteMeeting.participants?.off?.("participantsUpdated", bump);
      dyteMeeting?.off?.("participantJoined", bump);
      dyteMeeting?.off?.("participantLeft", bump);
      dyteMeeting?.off?.("participantUpdated", bump);
      dyteMeeting?.off?.("participantJoined", upsert);
      dyteMeeting?.off?.("participantLeft", remove);
      dyteMeeting?.off?.("participantUpdated", upsert);

      clearInterval(poll);
    };
  }, [dyteMeeting]);

  // Explicit poll via SDK helper (getAll) for SDK variants that don't expose collections
  useEffect(() => {
    if (!dyteMeeting?.participants) return;

    const bump = () => setParticipantsTick((v) => v + 1);
    const upsert = (p) => {
      if (p?.id) {
        observedParticipantsRef.current.set(p.id, p);
        bump();
      }
    };

    let cancelled = false;
    const fetchAll = async () => {
      if (cancelled) return;
      try {
        let arr = [];
        if (typeof dyteMeeting.participants.getAll === "function") {
          arr = await dyteMeeting.participants.getAll();
        } else if (typeof dyteMeeting.participants.toArray === "function") {
          arr = dyteMeeting.participants.toArray();
        }
        if (Array.isArray(arr)) {
          arr.forEach(upsert);
        }
      } catch (err) {
        console.warn("Dyte participants getAll failed:", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dyteMeeting]);

  // Presence broadcast fallback: every client announces itself, listeners upsert into the fallback map
  useEffect(() => {
    if (!dyteMeeting?.self) return;
    if (!dyteMeeting.self.roomJoined) return;

    const bump = () => setParticipantsTick((v) => v + 1);
    const upsertPresence = (payload) => {
      if (!payload?.id) return;
      observedParticipantsRef.current.set(payload.id, {
        id: payload.id,
        name: payload.name || "User",
        presetName: payload.preset || payload.role || "",
        audioEnabled: payload.audioEnabled,
        videoEnabled: payload.videoEnabled,
        isSpeaking: payload.isSpeaking,
      });
      bump();
    };

    const broadcastPresence = () => {
      const self = dyteMeeting.self;
      if (!self?.id) return;
      dyteMeeting.participants?.broadcastMessage?.("presence", {
        id: self.id,
        name: self.name,
        preset: self.presetName,
        role: self.presetName,
        audioEnabled: self.audioEnabled,
        videoEnabled: self.videoEnabled,
        isSpeaking: self.isSpeaking,
      });
    };

    const onBroadcast = ({ type, payload }) => {
      if (type === "presence") upsertPresence(payload);
    };

    dyteMeeting.participants?.on?.("broadcastedMessage", onBroadcast);
    broadcastPresence();
    const interval = setInterval(broadcastPresence, 4000);

    return () => {
      dyteMeeting.participants?.off?.("broadcastedMessage", onBroadcast);
      clearInterval(interval);
    };
  }, [dyteMeeting]);

  const participants = useMemo(() => {
    const list = [];

    // joined participants
    getJoinedParticipants().forEach((p) => list.push(p));

    // Fallback: include any participants we observed via events even if SDK didn't expose them in collections
    observedParticipantsRef.current.forEach((p) => {
      if (!list.some((x) => x?.id === p?.id)) list.push(p);
    });

    // ensure self is included even if Dyte doesn't list it inside joined
    if (dyteMeeting?.self && !list.some((p) => p.id === dyteMeeting.self.id)) {
      list.push(dyteMeeting.self);
    }

    list.forEach((pp) => {
      if (!pp?.id) return;
      if (participantJoinedAtRef.current.has(pp.id)) return;

      const isSelf = dyteMeeting?.self?.id && pp.id === dyteMeeting.self.id;
      if (isSelf && joinedAtRef.current) {
        participantJoinedAtRef.current.set(pp.id, joinedAtRef.current);
      } else {
        participantJoinedAtRef.current.set(pp.id, Date.now());
      }
    });

    return list.map((p) => {
      // ✅ Determine role from preset first, then fall back to pinned host
      const preset = (p.presetName || "").toLowerCase();
      const isPublisherPreset =
        preset.includes("host") ||
        preset.includes("publisher") ||
        preset.includes("admin") ||
        preset.includes("presenter") ||
        preset.includes("speaker");

      // If preset indicates publisher/host, mark as Host
      // Otherwise check if they're the pinned host
      const isHostParticipant =
        isPublisherPreset ||
        (pinnedHost?.id && p.id === pinnedHost.id) ||
        (isHost && dyteMeeting?.self?.id && p.id === dyteMeeting.self.id);

      return {
        id: p.id,
        name: p.name || "User",
        role: isHostParticipant ? "Host" : "Audience",
        mic: Boolean(p.audioEnabled),
        cam: Boolean(p.videoEnabled),
        active: Boolean(p.isSpeaking),
        joinedAtTs: participantJoinedAtRef.current.get(p.id),
        _raw: p,
      };
    });
  }, [dyteMeeting, initDone, participantsTick, getJoinedParticipants, pinnedHost, isHost]);

  // Debug: log what Dyte exposes so we can see why audience is missing
  useEffect(() => {
    if (!dyteMeeting) return;

    const toArraySafe = (source) => {
      if (!source) return [];
      if (Array.isArray(source)) return source;
      if (typeof source === "object" && Array.isArray(source.participants)) return source.participants;
      if (typeof source.toArray === "function") return source.toArray();
      if (typeof source.values === "function") return Array.from(source.values());
      try {
        return Array.from(source);
      } catch {
        return [];
      }
    };

    const participantsObj = dyteMeeting.participants;
    const joinedRaw = participantsObj?.joined?.participants || participantsObj?.joined?._participants;
    const joinedFromRaw =
      joinedRaw && typeof joinedRaw.values === "function"
        ? Array.from(joinedRaw.values()).map((p) => ({ id: p?.id, name: p?.name, preset: p?.presetName }))
        : [];
    const snapshot = {
      keys: participantsObj ? Object.keys(participantsObj) : [],
      joined: toArraySafe(participantsObj?.joined)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      joinedKeys: participantsObj?.joined ? Object.keys(participantsObj.joined) : null,
      all: toArraySafe(participantsObj?.all)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      list: toArraySafe(participantsObj?.list)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      participants: toArraySafe(participantsObj?.participants)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      active: toArraySafe(participantsObj?.active)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      hidden: toArraySafe(participantsObj?.hidden)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      pinned: toArraySafe(participantsObj?.pinned)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      waitlisted: toArraySafe(participantsObj?.waitlisted)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      selectedPeers: toArraySafe(participantsObj?.selectedPeers)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      videoSubscribed: toArraySafe(participantsObj?.videoSubscribed)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      audioSubscribed: toArraySafe(participantsObj?.audioSubscribed)?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      joinedRawKeys: joinedRaw ? Object.keys(joinedRaw) : null,
      joinedRawEntries: joinedFromRaw,
      sizes: {
        joinedSize: participantsObj?.joined?.size,
        allSize: participantsObj?.all?.size,
        listSize: participantsObj?.list?.size,
        participantsSize: participantsObj?.participants?.size,
        waitlistedSize: participantsObj?.waitlisted?.size,
        selectedPeersSize: participantsObj?.selectedPeers?.size,
        videoSubscribedSize: participantsObj?.videoSubscribed?.size,
        audioSubscribedSize: participantsObj?.audioSubscribed?.size,
      },
      meetingKeys: Object.keys(dyteMeeting || {}),
      observedFromEvents: Array.from(observedParticipantsRef.current.values()).map((p) => ({
        id: p?.id,
        name: p?.name,
        preset: p?.presetName,
      })),
      fromHelper: getJoinedParticipants()?.map((p) => ({ id: p.id, name: p.name, preset: p.presetName })),
      self: dyteMeeting.self ? { id: dyteMeeting.self.id, name: dyteMeeting.self.name, preset: dyteMeeting.self.presetName } : null,
    };
    // expose for manual inspection in DevTools
    if (typeof window !== "undefined") {
      window.__dyteMeeting = dyteMeeting;
      window.__dyteParticipantsSnapshot = snapshot;
    }
  }, [dyteMeeting, getJoinedParticipants, participantsTick]);

  // Pinned “host” view data
  const latestPinnedHost = useMemo(() => {
    if (!pinnedHost) return null;

    // 1. Try to find the exact same participant ID in the fresh list
    // This gets the version where videoEnabled is effectively 'true'
    const fresh = getJoinedParticipants().find((p) => p.id === pinnedHost.id);

    // 2. Return the fresh object if found, otherwise fallback to the state one
    return fresh || pinnedHost;
  }, [pinnedHost, participantsTick, getJoinedParticipants]);

  // Pinned “host” view data
  const meetingMeta = useMemo(
    () => ({
      title: eventTitle,
      live: dbStatus === "live",
      timer: joinElapsedLabel,
      recording: true,
      roomLabel: "Pinned",
      host: { name: latestPinnedHost?.name || "Host", role: "Host" },
    }),
    [eventTitle, dbStatus, latestPinnedHost, joinElapsedLabel]
  );
  const meeting = meetingMeta;

  // ✅ Use 'latestPinnedHost' instead of 'pinnedHost'
  const pinnedRaw = latestPinnedHost?._raw || latestPinnedHost || null;

  const pinnedIsSelf = Boolean(pinnedRaw?.id && dyteMeeting?.self?.id && pinnedRaw.id === dyteMeeting.self.id);

  // ✅ Now this will correctly see 'true' when the host turns the camera on
  const pinnedHasVideo = Boolean(pinnedRaw?.videoEnabled);



  // -------------------------
  // Active screen-share (same behavior as the old DyteMeeting UI: when someone shares, it becomes the main stage)
  // -------------------------
  const [activeScreenShareParticipant, setActiveScreenShareParticipant] = useState(null);

  const isParticipantScreenSharing = useCallback((p) => {
    if (!p) return false;

    const flag =
      p?.screenShareEnabled ??
      p?.screenshareEnabled ??
      p?.isScreenSharing ??
      p?.screenSharing ??
      p?.screenShareOn ??
      p?.screensharing ??
      p?.isScreensharing ??
      p?.isScreenShareEnabled ??
      p?.isScreenshareEnabled;

    if (flag) return true;

    const tracks =
      p?.screenShareTracks ??
      p?.screenshareTracks ??
      p?.screenShareVideoTracks ??
      p?.screenshareVideoTracks ??
      p?.screenShareTrack ??
      p?.screenshareTrack ??
      null;

    try {
      if (Array.isArray(tracks) && tracks.length > 0) return true;
      if (typeof tracks?.size === "number" && tracks.size > 0) return true;
      if (typeof tracks?.length === "number" && tracks.length > 0) return true;
      if (typeof tracks?.toArray === "function") return (tracks.toArray()?.length ?? 0) > 0;
    } catch {
      // ignore
    }

    return false;
  }, []);

  const findActiveScreenShareParticipant = useCallback(() => {
    if (!dyteMeeting) return null;

    // 1) Scan joined/active participants (most consistent across SDKs)
    const joined = getJoinedParticipants();
    const fromJoined = joined.find(isParticipantScreenSharing);
    if (fromJoined) return fromJoined;

    // 2) Try common SDK collections (if available)
    const candidatesStores = [
      dyteMeeting?.participants?.screenShares,
      dyteMeeting?.participants?.screenshares,
      dyteMeeting?.participants?.screenShare,
      dyteMeeting?.participants?.screenshare,
    ].filter(Boolean);

    const toArr = (x) => {
      try {
        if (!x) return [];
        if (Array.isArray(x)) return x;
        if (typeof x?.toArray === "function") return x.toArray() || [];
        if (typeof x?.values === "function") return Array.from(x.values());
        if (typeof x?.forEach === "function") {
          const out = [];
          x.forEach((v) => out.push(v));
          return out;
        }
      } catch {
        return [];
      }
      return [];
    };

    for (const store of candidatesStores) {
      const arr = toArr(store);
      const p = arr.find(Boolean);
      if (p) return p;
    }

    // 3) Self
    if (isParticipantScreenSharing(dyteMeeting?.self)) return dyteMeeting.self;

    return null;
  }, [dyteMeeting, getJoinedParticipants, isParticipantScreenSharing]);

  useEffect(() => {
    if (!dyteMeeting) return;

    const refresh = () => {
      const next = findActiveScreenShareParticipant();
      const nextId = next?.id ?? null;

      setActiveScreenShareParticipant((prev) => {
        const prevId = prev?.id ?? null;
        if (prevId === nextId) return prev;
        return next || null;
      });
    };

    // Initial check
    refresh();

    // Event-driven updates (best-effort across SDK versions)
    const cleanups = [];
    const safeOn = (obj, evt) => {
      try {
        if (typeof obj?.on === "function") {
          obj.on(evt, refresh);
          cleanups.push(() => {
            try { obj.off?.(evt, refresh); } catch { }
          });
        }
      } catch {
        // ignore
      }
    };

    safeOn(dyteMeeting, "screenShareUpdate");
    safeOn(dyteMeeting, "screenShareStarted");
    safeOn(dyteMeeting, "screenShareStopped");

    safeOn(dyteMeeting?.participants, "screenShareUpdate");
    safeOn(dyteMeeting?.participants?.joined, "participantUpdated");
    safeOn(dyteMeeting?.participants?.joined, "screenShareUpdate");
    safeOn(dyteMeeting?.participants?.joined, "screenShareStarted");
    safeOn(dyteMeeting?.participants?.joined, "screenShareStopped");

    safeOn(dyteMeeting?.self, "screenShareUpdate");
    safeOn(dyteMeeting?.self, "screenShareStarted");
    safeOn(dyteMeeting?.self, "screenShareStopped");

    // Poll fallback (covers SDKs that don't emit the events we subscribed to)
    const interval = setInterval(refresh, 800);

    return () => {
      clearInterval(interval);
      cleanups.forEach((fn) => {
        try { fn(); } catch { }
      });
    };
  }, [dyteMeeting, findActiveScreenShareParticipant]);

  const hasScreenshare = !!activeScreenShareParticipant;
  const stageHasVideo = pinnedHasVideo || hasScreenshare;

  // If audience and host not live yet
  const shouldShowMeeting = role === "publisher" || hostJoined || dbStatus === "live";

  // Back behavior (same as old intent)
  const handleBack = () => {
    if (role === "publisher") navigate("/admin/events");
    else navigate(-1);
  };

  const handleToggleChat = useCallback(async () => {
    if (!isHost) return;
    const next = !hostPerms.chat;
    setHostPerms((p) => ({ ...p, chat: next }));
    await updateAudiencePermissions({
      chat: {
        public: { canSend: next, text: next, files: next },
        private: { canSend: next, text: next, files: next },
      },
    });
  }, [hostPerms.chat, isHost, updateAudiencePermissions]);

  const handleTogglePolls = useCallback(async () => {
    if (!isHost) return;
    const next = !hostPerms.polls;
    setHostPerms((p) => ({ ...p, polls: next }));
    await updateAudiencePermissions({ polls: { canCreate: next, canVote: next } });
  }, [hostPerms.polls, isHost, updateAudiencePermissions]);

  const handleToggleScreenShare = useCallback(async () => {
    if (!isHost) return;
    const next = !hostPerms.screenShare;
    setHostPerms((p) => ({ ...p, screenShare: next }));
    setHostForceBlock(!next);
    await updateAudiencePermissions({
      canProduceScreenshare: next ? "ALLOWED" : "NOT_ALLOWED",
      requestProduceScreenshare: next,
    });
    dyteMeeting?.participants?.broadcastMessage?.("toggle-screen-share", { allowed: next });
  }, [dyteMeeting, hostPerms.screenShare, isHost, updateAudiencePermissions]);

  // -------- Live chat (messaging backend) ----------
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef(null);

  // ============ PRIVATE CHAT STATE ============
  const [privateChatUser, setPrivateChatUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateInput, setPrivateInput] = useState("");
  const [privateConversationId, setPrivateConversationId] = useState(null); // <--- NEW
  const [privateChatLoading, setPrivateChatLoading] = useState(false);      // <--- NEW
  const privateChatBottomRef = useRef(null); // To auto-scroll

  const handleOpenPrivateChat = async (member) => {
    setPrivateChatUser(member);
    if (isMdUp) setRightPanelOpen(true);
    else setRightOpen(true);

    // Reset UI state
    setPrivateMessages([]);
    setPrivateInput("");
    setPrivateConversationId(null);
    setPrivateChatLoading(true);

    try {
      // 1. Determine Recipient ID
      // We assume Dyte participant's `customParticipantId` holds the Django User ID.
      // If not set, we fallback to `member.id` (though that might be a Dyte UUID).
      const recipientId = member._raw?.customParticipantId || member.id;

      // 2. Ensure Conversation Exists
      const res = await fetch(toApiUrl("messaging/conversations/ensure-direct/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ recipient_id: recipientId }),
      });

      if (!res.ok) {
        console.error("Failed to ensure private chat", await res.text());
        return;
      }

      const convData = await res.json();
      setPrivateConversationId(convData.id);

      // 3. Fetch Message History
      const msgRes = await fetch(toApiUrl(`messaging/conversations/${convData.id}/messages/`), {
        headers: { ...authHeader() },
      });

      if (msgRes.ok) {
        const msgs = await msgRes.json();
        setPrivateMessages(msgs);
      }
    } catch (e) {
      console.error("Private chat error:", e);
    } finally {
      setPrivateChatLoading(false);
    }
  };

  const handleClosePrivateChat = () => {
    setPrivateChatUser(null);
    setPrivateInput("");
    setPrivateConversationId(null);
    setPrivateMessages([]);
  };

  const sendPrivateMessage = async () => {
    const text = privateInput.trim();
    if (!text || !privateConversationId) return;

    try {
      const res = await fetch(toApiUrl(`messaging/conversations/${privateConversationId}/messages/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ body: text }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setPrivateMessages((prev) => [...prev, newMsg]);
        setPrivateInput("");
      } else {
        console.error("Failed to send message");
      }
    } catch (e) {
      console.error("Send private message error:", e);
    }
  };

  // Auto-scroll private chat
  useEffect(() => {
    if (privateChatBottomRef.current) {
      privateChatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [privateMessages]);
  // =================================================

  const ensureEventConversation = useCallback(async () => {
    if (!eventId) return null;
    const res = await fetch(toApiUrl("messaging/conversations/ensure-event/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ event: eventId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.detail || "Failed to open chat.");
    }
    const cid = data?.id;
    if (!cid) throw new Error("Chat conversation missing.");
    setChatConversationId(cid);
    return cid;
  }, [eventId]);

  const fetchChatMessages = useCallback(
    async (conversationId) => {
      const cid = conversationId || chatConversationId;
      if (!cid) return;
      const res = await fetch(toApiUrl(`messaging/conversations/${cid}/messages/`), {
        headers: { Accept: "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.detail || "Failed to load chat.");
      setChatMessages(Array.isArray(data) ? data : []);
    },
    [chatConversationId]
  );

  const loadChatThread = useCallback(async () => {
    setChatLoading(true);
    setChatError("");
    try {
      const cid = await ensureEventConversation();
      await fetchChatMessages(cid);
    } catch (e) {
      setChatError(e?.message || "Unable to load chat.");
    } finally {
      setChatLoading(false);
    }
  }, [ensureEventConversation, fetchChatMessages]);

  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatError("");
    try {
      const cid = chatConversationId || (await ensureEventConversation());
      if (!cid) throw new Error("Chat not ready.");
      const res = await fetch(toApiUrl(`messaging/conversations/${cid}/messages/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Failed to send message.");
      setChatMessages((prev) => [...prev, ...(data ? [data] : [])]);
      setChatInput("");
    } catch (e) {
      setChatError(e?.message || "Failed to send message.");
    } finally {
      setChatSending(false);
    }
  }, [chatConversationId, chatInput, chatSending, ensureEventConversation]);

  useEffect(() => {
    if (eventId) {
      setChatConversationId(null);
      setChatMessages([]);
    }
  }, [eventId]);

  useEffect(() => {
    const chatActive = hostPerms.chat && tab === 0 && isPanelOpen;
    if (!chatActive || !eventId) return;
    loadChatThread();
  }, [hostPerms.chat, tab, isPanelOpen, eventId, loadChatThread]);

  useEffect(() => {
    if (!isChatActive) return;
    const el = chatBottomRef.current;
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, isChatActive]);

  const formatChatTime = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // -------- Q&A (real backend logic from LiveQnAPanel) ----------
  const [questions, setQuestions] = useState([]);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [qnaSubmitting, setQnaSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [qnaError, setQnaError] = useState("");

  const loadQuestions = useCallback(async () => {
    if (!eventId) return;
    setQnaLoading(true);
    setQnaError("");

    try {
      const res = await fetch(toApiUrl(`interactions/questions/?event_id=${encodeURIComponent(eventId)}`), {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) throw new Error("Failed to load questions.");
      const data = await res.json();
      setQuestions(data || []);
    } catch (e) {
      setQnaError(e.message || "Failed to load questions.");
    } finally {
      setQnaLoading(false);
    }
  }, [eventId]);

  // Load on open Q&A tab
  useEffect(() => {
    const isQnATabActive = (tab === 1) && (isPanelOpen === true);
    if (!isQnATabActive) return;
    loadQuestions();
  }, [tab, isPanelOpen, loadQuestions]);

  // WS live updates while Q&A tab open
  useEffect(() => {
    const isQnATabActive = (tab === 1) && (isPanelOpen === true);
    if (!isQnATabActive || !eventId) return;

    const API_RAW = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
    const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const token = getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const wsUrl = `${WS_ROOT}/ws/events/${eventId}/qna/${qs}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "qna.upvote") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? { ...q, upvote_count: msg.upvote_count, upvoters: msg.upvoters ?? q.upvoters }
                : q
            )
          );
        }

        if (msg.type === "qna.question") {
          setQuestions((prev) => {
            if (prev.some((q) => q.id === msg.question_id)) return prev;
            const newQ = {
              id: msg.question_id,
              content: msg.content,
              user_id: msg.user_id,
              event_id: msg.event_id,
              upvote_count: msg.upvote_count ?? 0,
              user_upvoted: false,
              upvoters: msg.upvoters ?? [],
              created_at: msg.created_at,
            };
            return [newQ, ...prev];
          });
        }
      } catch { }
    };

    return () => ws.close();
  }, [tab, isPanelOpen, eventId]);

  const submitQuestion = async () => {
    const content = newQuestion.trim();
    if (!content || !eventId) return;

    setQnaSubmitting(true);
    setQnaError("");

    try {
      const res = await fetch(toApiUrl("interactions/questions/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ event: eventId, content }),
      });
      if (!res.ok) throw new Error("Failed to create question.");
      setNewQuestion("");
      await loadQuestions();
    } catch (e) {
      setQnaError(e.message || "Failed to create question.");
    } finally {
      setQnaSubmitting(false);
    }
  };

  const upvoteQuestion = async (questionId) => {
    setQnaError("");
    try {
      const res = await fetch(toApiUrl(`interactions/questions/${questionId}/upvote/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) throw new Error("Failed to update vote.");
      const data = await res.json(); // { question_id, upvoted, upvote_count }

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.question_id
            ? { ...q, upvote_count: data.upvote_count, user_upvoted: data.upvoted }
            : q
        )
      );
    } catch (e) {
      setQnaError(e.message || "Failed to update vote.");
    }
  };

  // Sort: highest votes on top, then newest
  const qaSorted = useMemo(() => {
    const arr = [...questions];
    arr.sort((a, b) => (b.upvote_count ?? 0) - (a.upvote_count ?? 0) || (new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    return arr;
  }, [questions]);

  const polls = useMemo(
    () => [
      {
        question: "What's your biggest concern about the merger?",
        votes: 40,
        voted: true,
        options: [
          { label: "Integration timeline", pct: 30 },
          { label: "Cultural alignment", pct: 20 },
          { label: "Technology consolidation", pct: 38 },
          { label: "Job security", pct: 13 },
        ],
      },
      {
        question: "Which integration priority should we focus on first?",
        votes: 18,
        voted: false,
        options: [
          { label: "Systems integration", pct: 45 },
          { label: "Team alignment", pct: 30 },
          { label: "Customer communication", pct: 25 },
        ],
      },
    ],
    []
  );

  const groupedMembers = useMemo(() => {
    const hostId = pinnedHost?.id || (isHost ? dyteMeeting?.self?.id : null);

    const host = hostId
      ? participants.filter((p) => p.id === hostId)
      : participants.filter((p) => p.role === "Host");

    const audience = hostId
      ? participants.filter((p) => p.id !== hostId) // ✅ all others go to audience
      : participants.filter((p) => p.role !== "Host");

    return { host, speakers: [], audience };
  }, [participants, pinnedHost, isHost, dyteMeeting?.self?.id]);

  const RIGHT_PANEL_W = 400;
  const APPBAR_H = 44;

  // Others only (Audience + Speaker), host is pinned already
  const stageOthers = useMemo(() => participants.filter((p) => p.role !== "Host"), [participants]);

  // Strip should be only others (no host duplicate)
  const stageStrip = stageOthers;

  // ✅ Show 8 participants + "+N more"
  const MAX_STAGE_TILES = 8;

  const stageStripLimited = useMemo(
    () => stageStrip.slice(0, MAX_STAGE_TILES),
    [stageStrip]
  );

  const stageStripRemaining = Math.max(0, stageStrip.length - stageStripLimited.length);

  // ✅ Make mini tiles auto-fit 8 participants (+ more tile) even when right panel is CLOSED
  const stageStripRef = useRef(null);
  const [stageStripWidth, setStageStripWidth] = useState(0);

  useEffect(() => {
    const el = stageStripRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries?.[0]?.contentRect?.width ?? 0);
      setStageStripWidth(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageGapPx = useMemo(() => {
    const v = theme.spacing(1);
    const n = parseFloat(String(v).replace("px", ""));
    return Number.isFinite(n) ? n : 8;
  }, [theme]);

  // total tiles we try to fit in the strip (8 participants + optional "+N more")
  const stageTileCount = useMemo(() => {
    const visible = Math.min(MAX_STAGE_TILES, stageStrip.length);
    return stageStrip.length > MAX_STAGE_TILES ? visible + 1 : visible;
  }, [stageStrip.length]);

  const stageTileW = useMemo(() => {
    const maxW = isMdUp && rightPanelOpen ? 132 : 140; // match your screenshot sizes
    const minW = isMdUp ? 110 : 104;

    if (!stageStripWidth || !stageTileCount) return maxW;

    const available = stageStripWidth - stageGapPx * (stageTileCount - 1);
    const ideal = Math.floor(available / stageTileCount);

    return Math.max(minW, Math.min(maxW, ideal));
  }, [stageStripWidth, stageTileCount, stageGapPx, isMdUp, rightPanelOpen]);

  const stageTileH = useMemo(() => {
    const ratio = 82 / 140; // keep same ratio as 140x82
    const h = Math.round(stageTileW * ratio);
    return Math.max(70, Math.min(82, h));
  }, [stageTileW]);


  // When right panel is open on desktop, make tiles more compact
  const isCompactStage = isMdUp && rightPanelOpen;

  const headerIconBtnSx = {
    color: "rgba(255,255,255,0.82)",
    "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
  };

  const headerChipSx = {
    height: 22,
    bgcolor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    "& .MuiChip-label": {
      px: 1.1,
      fontWeight: 700,
      fontSize: 12,
      color: "rgba(255,255,255,0.85)",
    },
  };

  const RightPanelContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", pb: { xs: "calc(16px + env(safe-area-inset-bottom))", md: 2 }, boxSizing: "border-box" }}>
      {/* ================= CONDITION: PRIVATE CHAT VIEW ================= */}
      {privateChatUser ? (
        <>
          {/* 1. Private Chat Header (User Name on Top) */}
          <Box
            sx={{
              px: 2, py: 1.5,
              display: "flex", alignItems: "center", gap: 1.5,
              borderBottom: "1px solid", borderColor: "rgba(255,255,255,0.08)",
              bgcolor: "rgba(0,0,0,0.25)",
            }}
          >
            <IconButton onClick={handleClosePrivateChat} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(255,255,255,0.14)", fontSize: 13 }}>
                {initialsFromName(privateChatUser.name)}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{privateChatUser.name}</Typography>
                <Typography sx={{ fontSize: 11, opacity: 0.6 }}>Private Chat</Typography>
              </Box>
            </Stack>

            <Box sx={{ flex: 1 }} />
            <IconButton onClick={closeRightPanel} size="small"><CloseIcon fontSize="small" /></IconButton>
          </Box>

          {/* 2. Private Chat Messages Area */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
            {privateChatLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : privateMessages.length === 0 ? (
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, flexDirection: "column" }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography fontSize={13}>Start a private conversation</Typography>
              </Box>
            ) : (
              <Stack spacing={1.25}>
                {privateMessages.map((m) => (
                  <Paper
                    key={m.id}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      maxWidth: "85%",
                      alignSelf: m.mine ? "flex-end" : "flex-start",
                      bgcolor: m.mine ? "rgba(20,184,177,0.15)" : "rgba(255,255,255,0.03)",
                      borderColor: m.mine ? "rgba(20,184,177,0.3)" : "rgba(255,255,255,0.08)",
                      borderRadius: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: 13, opacity: 0.9 }}>{m.body}</Typography>
                    <Typography sx={{ fontSize: 10, opacity: 0.5, textAlign: "right", mt: 0.5 }}>
                      {formatChatTime(m.created_at)}
                    </Typography>
                  </Paper>
                ))}
                <div ref={privateChatBottomRef} />
              </Stack>
            )}
          </Box>

          {/* 3. Private Chat Input */}
          <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <TextField
              fullWidth
              placeholder={`Message ${privateChatUser.name}...`}
              size="small"
              value={privateInput}
              onChange={(e) => setPrivateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendPrivateMessage();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={sendPrivateMessage} disabled={!privateInput.trim() || !privateConversationId}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.03)", borderRadius: 2 },
              }}
            />
          </Box>
        </>
      ) : (
        // ================= EXISTING TABS VIEW =================
        <>
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "rgba(255,255,255,0.08)",
              bgcolor: "rgba(0,0,0,0.25)",
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>Meeting Details</Typography>

            <IconButton onClick={closeRightPanel} size="small" aria-label="Close panel">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              minHeight: 42,
              borderBottom: "1px solid",
              borderColor: "rgba(255,255,255,0.08)",
              "& .MuiTab-root": { minHeight: 42, textTransform: "none", fontWeight: 600 },
            }}
          >
            <Tab icon={<ChatBubbleOutlineIcon fontSize="small" />} iconPosition="start" label="Chat" sx={{ display: hostPerms.chat ? "flex" : "none" }} />
            <Tab icon={<QuestionAnswerIcon fontSize="small" />} iconPosition="start" label="Q&A" />
            <Tab icon={<PollIcon fontSize="small" />} iconPosition="start" label="Polls" sx={{ display: "none" }} />
            <Tab icon={<GroupIcon fontSize="small" />} iconPosition="start" label="Members" />
          </Tabs>

          {/* Body */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {/* CHAT */}
            {hostPerms.chat && (
              <TabPanel value={tab} index={0}>
                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
                  {chatError && (
                    <Typography color="error" sx={{ mb: 1 }}>
                      {chatError}
                    </Typography>
                  )}

                  {chatLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                      <CircularProgress size={22} />
                    </Box>
                  ) : chatMessages.length === 0 ? (
                    <Typography sx={{ opacity: 0.75 }}>No messages yet. Start the conversation!</Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {chatMessages.map((m) => (
                        <Paper
                          key={m.id}
                          variant="outlined"
                          sx={{
                            p: 1.25,
                            bgcolor: "rgba(255,255,255,0.03)",
                            borderColor: "rgba(255,255,255,0.08)",
                            borderRadius: 2,
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                              {m.sender_display || m.sender_name || "User"}
                            </Typography>
                            <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
                              {formatChatTime(m.created_at)}
                            </Typography>
                          </Stack>
                          <Typography sx={{ mt: 0.5, fontSize: 13, opacity: 0.9 }}>{m.body}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  <Box ref={chatBottomRef} />
                </Box>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                <Box sx={{ p: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    size="small"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label="Send message"
                            onClick={sendChatMessage}
                            disabled={chatSending || !chatInput.trim()}
                          >
                            {chatSending ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "rgba(255,255,255,0.03)",
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              </TabPanel>
            )}

            {/* Q&A */}
            <TabPanel value={tab} index={1}>
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
                {qnaError && (
                  <Typography color="error" sx={{ mb: 1 }}>
                    {qnaError}
                  </Typography>
                )}

                {qnaLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : qaSorted.length === 0 ? (
                  <Typography sx={{ opacity: 0.75 }}>No questions yet. Be the first to ask!</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {qaSorted.map((q) => {
                      const voters = q.upvoters ?? [];
                      const votes = q.upvote_count ?? voters.length;
                      const hasVoted = Boolean(q.user_upvoted);
                      const askedBy = q.user_name || q.user?.name || (q.user_id ? `User ${q.user_id}` : "Audience");
                      const timeLabel = q.created_at ? new Date(q.created_at).toLocaleTimeString() : "";

                      return (
                        <Paper
                          key={q.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: "rgba(255,255,255,0.03)",
                            borderColor: "rgba(255,255,255,0.08)",
                            borderRadius: 2,
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Question</Typography>

                            <Stack direction="row" spacing={1} alignItems="center">
                              {/* ✅ Hover: show who voted */}
                              <Tooltip
                                arrow
                                placement="left"
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: 12, mb: 0.5 }}>Voted by</Typography>
                                    {votes ? (
                                      <Stack spacing={0.25}>
                                        {voters.slice(0, 8).map((voter, idx) => (
                                          <Typography key={`${voter?.id || idx}`} sx={{ fontSize: 12, opacity: 0.9 }}>
                                            {voter?.name || voter?.username || voter?.id || "User"}
                                          </Typography>
                                        ))}
                                        {votes > 8 && (
                                          <Typography sx={{ fontSize: 12, opacity: 0.7 }}>+{votes - 8} more</Typography>
                                        )}
                                      </Stack>
                                    ) : (
                                      <Typography sx={{ fontSize: 12, opacity: 0.7 }}>No votes yet</Typography>
                                    )}
                                  </Box>
                                }
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: "rgba(0,0,0,0.92)",
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      borderRadius: 2,
                                    },
                                  },
                                }}
                              >
                                <Box>
                                  <Chip
                                    size="small"
                                    clickable
                                    onClick={() => upvoteQuestion(q.id)}
                                    icon={hasVoted ? <ThumbUpAltIcon fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
                                    label={votes}
                                    sx={{
                                      bgcolor: hasVoted ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      "&:hover": { bgcolor: hasVoted ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                                    }}
                                  />
                                </Box>
                              </Tooltip>

                              <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{timeLabel}</Typography>
                            </Stack>
                          </Stack>

                          <Typography sx={{ mt: 0.75, fontSize: 13, opacity: 0.92 }}>{q.content}</Typography>

                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                            <Chip size="small" label={`Asked by ${askedBy}`} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitQuestion();
                }}
                sx={{ p: 2 }}
              >
                <TextField
                  fullWidth
                  placeholder="Ask a question..."
                  size="small"
                  value={newQuestion}
                  disabled={qnaSubmitting}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Send question"
                          onClick={submitQuestion}
                          disabled={qnaSubmitting || newQuestion.trim().length === 0}
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(255,255,255,0.03)",
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            </TabPanel>

            {/* POLLS */}
            {false && (
              <TabPanel value={tab} index={2}>
                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
                  <Stack spacing={2}>
                    {/* HOST: Create Poll UI */}
                    {isHost && (
                      <Box>
                        {!isCreatingPoll ? (
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => setIsCreatingPoll(true)}
                            sx={{
                              py: 1.5,
                              borderStyle: "dashed",
                              borderColor: "rgba(255,255,255,0.2)",
                              color: "rgba(255,255,255,0.7)",
                              "&:hover": {
                                borderColor: "rgba(255,255,255,0.4)",
                                bgcolor: "rgba(255,255,255,0.03)",
                              },
                            }}
                          >
                            Create New Poll
                          </Button>
                        ) : (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              bgcolor: "rgba(255,255,255,0.03)",
                              borderColor: "rgba(20,184,177,0.5)", // Highlight active creation
                              borderRadius: 2,
                            }}
                          >
                            <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1.5 }}>
                              CREATE NEW POLL
                            </Typography>

                            {/* Question Input */}
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Ask a question..."
                              value={createPollQuestion}
                              onChange={(e) => setCreatePollQuestion(e.target.value)}
                              sx={{
                                mb: 2,
                                "& .MuiOutlinedInput-root": {
                                  bgcolor: "rgba(0,0,0,0.2)",
                                },
                              }}
                            />

                            {/* Options Inputs */}
                            <Stack spacing={1.5}>
                              {createPollOptions.map((opt, idx) => (
                                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder={`Option ${idx + 1}`}
                                    value={opt}
                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        bgcolor: "rgba(0,0,0,0.2)",
                                      },
                                    }}
                                  />
                                  {createPollOptions.length > 2 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveOption(idx)}
                                      sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#ef4444" } }}
                                    >
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Stack>
                              ))}
                            </Stack>

                            {/* Add Option Button */}
                            <Button
                              size="small"
                              startIcon={<AddIcon fontSize="small" />}
                              onClick={handleAddOption}
                              sx={{ mt: 1.5, textTransform: "none", color: "rgba(255,255,255,0.6)" }}
                            >
                              Add another option
                            </Button>

                            <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.1)" }} />

                            {/* Actions */}
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                onClick={handleCancelPoll}
                                sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none" }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="contained"
                                onClick={handleLaunchPoll}
                                disabled={!createPollQuestion.trim() || createPollOptions.some((o) => !o.trim())}
                                sx={{
                                  bgcolor: "#14b8b1",
                                  color: "#fff",
                                  fontWeight: 700,
                                  textTransform: "none",
                                  "&:hover": { bgcolor: "#0e8e88" },
                                }}
                              >
                                Launch Poll
                              </Button>
                            </Stack>
                          </Paper>
                        )}
                      </Box>
                    )}

                    {/* Existing Polls List */}
                    {polls.map((p, idx) => (
                      <Paper
                        key={idx}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          bgcolor: "rgba(255,255,255,0.03)",
                          borderColor: "rgba(255,255,255,0.08)",
                          borderRadius: 2,
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Poll</Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{p.votes} votes</Typography>
                            {p.voted ? (
                              <Chip size="small" label="You voted" sx={{ bgcolor: "rgba(76,175,80,0.18)" }} />
                            ) : (
                              <Chip size="small" label="Active" sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                            )}
                          </Stack>
                        </Stack>

                        <Typography sx={{ mt: 0.75, fontSize: 13, opacity: 0.92 }}>{p.question}</Typography>

                        <Stack spacing={1} sx={{ mt: 1.25 }}>
                          {p.options.map((o, i) => (
                            <Box key={i}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography sx={{ fontSize: 13, opacity: 0.9 }}>{o.label}</Typography>
                                <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{o.pct}%</Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={o.pct}
                                sx={{
                                  mt: 0.5,
                                  height: 8,
                                  borderRadius: 999,
                                  bgcolor: "rgba(255,255,255,0.08)",
                                  "& .MuiLinearProgress-bar": {
                                    borderRadius: 999,
                                  },
                                }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </TabPanel>
            )}

            {/* MEMBERS */}
            <TabPanel value={tab} index={3}>
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8, mb: 1 }}>
                      HOST
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.03)",
                        borderColor: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                      }}
                    >
                      <List dense disablePadding>
                        {groupedMembers.host.map((m, idx) => (
                          <ListItem
                            key={idx}
                            sx={{ px: 1.25, py: 1, display: "flex", alignItems: "center" }}
                            secondaryAction={
                              <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                <Box sx={{ opacity: 0.9 }}>
                                  {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                </Box>
                              </Tooltip>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                {initialsFromName(m.name)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{m.name}</Typography>
                                  <Chip size="small" label="Host" sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                                </Stack>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8, mb: 1 }}>
                      SPEAKERS ({groupedMembers.speakers.length})
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.03)",
                        borderColor: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                      }}
                    >
                      <List dense disablePadding>
                        {groupedMembers.speakers.map((m, idx) => (
                          <ListItem
                            key={idx}
                            sx={{ px: 1.25, py: 1 }}
                            secondaryAction={
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                  <Box sx={{ opacity: 0.9 }}>
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </Box>
                                </Tooltip>

                                <Tooltip title="User info">
                                  <IconButton
                                    size="small"
                                    onClick={() => openMemberInfo(m)}
                                    aria-label={`User info: ${m.name}`}
                                    sx={{
                                      bgcolor: "rgba(255,255,255,0.06)",
                                      "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                                    }}
                                  >
                                    <InfoOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                {initialsFromName(m.name)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{m.name}</Typography>}
                              secondary={<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Speaker</Typography>}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8, mb: 1 }}>
                      AUDIENCE ({groupedMembers.audience.length})
                    </Typography>
                    <Paper variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                      <List dense disablePadding>
                        {groupedMembers.audience.map((m, idx) => (
                          <ListItem
                            key={idx}
                            sx={{ px: 1.25, py: 1 }}
                            secondaryAction={
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                  <Box sx={{ opacity: 0.9 }}>
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </Box>
                                </Tooltip>

                                {/* --- NEW MESSAGE ICON --- */}
                                <Tooltip title="Send Message">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenPrivateChat(m)} // <--- TRIGGER PRIVATE CHAT
                                    sx={{
                                      bgcolor: "rgba(255,255,255,0.06)",
                                      "&:hover": { bgcolor: "rgba(20,184,177,0.25)", color: "#14b8b1" },
                                    }}
                                  >
                                    <ChatBubbleOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {/* ------------------------ */}

                                <Tooltip title="User info">
                                  <IconButton
                                    size="small"
                                    onClick={() => openMemberInfo(m)}
                                    sx={{ bgcolor: "rgba(255,255,255,0.06)", "&:hover": { bgcolor: "rgba(255,255,255,0.10)" } }}
                                  >
                                    <InfoOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                {initialsFromName(m.name)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{m.name}</Typography>}
                              secondary={<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Audience</Typography>}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                </Stack>
              </Box>
            </TabPanel>
          </Box>
        </>
      )}
    </Box>
  );

  if (loadingJoin) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#070A10" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (joinError && !authToken) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{joinError}</Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }} variant="outlined">
          Back
        </Button>
      </Box>
    );
  }

  if (!initDone || !dyteMeeting) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#070A10" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!shouldShowMeeting) {
    return (
      <WaitingForHost
        onBack={handleBack}
        eventTitle={eventTitle}
        scheduled={scheduledLabel}
        duration={durationLabel}
        roleLabel={role === "publisher" ? "Host" : "Audience"}
      />
    );
  }

  return (
    <DyteProvider value={dyteMeeting}>
      <DyteParticipantsAudio
        meeting={dyteMeeting}
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      />
      <Box
        ref={rootRef}
        sx={{
          height: "100vh",
          overflow: "hidden",
          bgcolor: "#070A10",
          color: "#fff",
          backgroundImage:
            "radial-gradient(1000px 500px at 50% 0%, rgba(90,120,255,0.18), transparent 55%), radial-gradient(900px 500px at 0% 100%, rgba(20,184,177,0.10), transparent 60%)",

          // ✅ FORCE ALL TEXT WHITE ON DARK
          "&, & *": { color: "#fff" },

          // ✅ Secondary text
          "& .MuiTypography-root": { color: "#fff" },
          "& .MuiListItemText-secondary": { color: "rgba(255,255,255,0.70)" },

          // ✅ Tabs
          "& .MuiTab-root": { color: "rgba(255,255,255,0.75)" },
          "& .MuiTab-root.Mui-selected": { color: "#fff" },
          "& .MuiTabs-indicator": { backgroundColor: "#14b8b1" },

          // ✅ Chip labels (LIVE / Recording / etc.)
          "& .MuiChip-label": { color: "#fff" },

          // ✅ TextField input + placeholder + border
          "& .MuiInputBase-input": { color: "#fff" },
          "& .MuiInputBase-input::placeholder": {
            color: "rgba(255,255,255,0.55)",
            opacity: 1,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(19, 19, 19, 0.16)",
          },

          // ✅ Icons
          "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.90)" },
        }}
      >
        {/* Top Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "rgba(5,7,12,0.72)",
            backgroundImage:
              "linear-gradient(180deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.35) 100%)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              gap: 1,
              minHeight: 44,          // ✅ smaller header height
              px: 1.25,               // ✅ left/right padding
              py: 0.25,               // ✅ small vertical padding
            }}
          >
            <IconButton sx={headerIconBtnSx} aria-label="Back" onClick={handleBack}>
              <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: 14, sm: 16 },
                color: "rgba(255,255,255,0.88)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
              }}
            >
              {meeting.title}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 0.5 }}>
              {meeting.live && (
                <Chip
                  size="small"
                  label="LIVE"
                  sx={{
                    ...headerChipSx,
                    bgcolor: "rgba(244,67,54,0.18)",
                    border: "1px solid rgba(244,67,54,0.35)",
                    "& .MuiChip-label": {
                      px: 1.1,
                      fontWeight: 800,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.90)",
                    },
                  }}
                />
              )}

              <Chip size="small" label={meeting.timer} sx={headerChipSx} />

              {meeting.recording && <Chip size="small" label="Recording" sx={headerChipSx} />}
            </Stack>

            <Tooltip title={isHost ? "Host permissions" : "Only host can change"}>
              <span>
                <IconButton
                  sx={headerIconBtnSx}
                  aria-label="Host permissions"
                  onClick={isHost ? openPermMenu : undefined}
                  disabled={!isHost}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <IconButton sx={headerIconBtnSx} aria-label="Fullscreen" onClick={toggleFullscreen}>
                {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {!isMdUp ? (
              <Tooltip title="Open panel">
                <IconButton sx={headerIconBtnSx} aria-label="Open right panel" onClick={() => toggleRightPanel(0)}>
                  <MenuIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="More">
                <IconButton sx={headerIconBtnSx} aria-label="More options">
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            )}
          </Toolbar>
        </AppBar>

        <Menu
          anchorEl={permAnchorEl}
          open={permMenuOpen}
          onClose={closePermMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 320,
              bgcolor: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 2.5,
              overflow: "hidden",
              backdropFilter: "blur(12px)",

              // ✅ make menu text white
              color: "#fff",
              "& .MuiListItemText-primary": { color: "#fff" },
              "& .MuiListItemText-secondary": { color: "rgba(255,255,255,0.65)" },
              "& .MuiListItemIcon-root": { color: "#fff" },
            },
          }}
          MenuListProps={{
            sx: {
              // ✅ hover bg on dark menu
              "& .MuiMenuItem-root:hover": { bgcolor: "rgba(255,255,255,0.06)" },
            },
          }}
        >
          <MenuItem disabled sx={{ fontWeight: 800, opacity: 0.9 }}>
            Host Permissions
          </MenuItem>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

          <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
            <ListItemIcon sx={{ minWidth: 34 }}>
              <ChatBubbleOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Chat" secondary="Hide chat tab + block chat panel" />
            <Switch checked={hostPerms.chat} onChange={handleToggleChat} />
          </MenuItem>
          {false && (
            <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
              <ListItemIcon sx={{ minWidth: 34 }}>
                <PollIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Polls" secondary="Show/hide Polls tab" />
              <Switch checked={hostPerms.polls} onChange={handleTogglePolls} />
            </MenuItem>
          )}

          <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
            <ListItemIcon sx={{ minWidth: 34 }}>
              <ScreenShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Screen share" secondary="Enable/disable screen sharing" />
            <Switch checked={hostPerms.screenShare} onChange={handleToggleScreenShare} />
          </MenuItem>
        </Menu>

        {/* Main Layout */}
        <Box
          sx={{
            display: "flex",
            height: `calc(100vh - ${APPBAR_H}px)`,
            overflow: "hidden",
          }}
        >
          {/* Left/Main */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
              p: { xs: 1.5, sm: 2 },
              pr: { md: 2 },
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {/* Video Stage */}
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                minHeight: 0,
                borderRadius: 3,
                borderColor: "rgba(255,255,255,0.08)",
                bgcolor: "rgba(255,255,255,0.04)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Pinned badge */}
              <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 3 }}>
                <Chip size="small" label={meeting.roomLabel} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
              </Box>



              {/* Main participant */}
              {/* ✅ Host Video (background) */}
              {stageHasVideo && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "rgba(0,0,0,0.85)",
                  }}
                >
                  {hasScreenshare ? (
                    <ScreenShareVideo
                      participant={activeScreenShareParticipant}
                      meeting={dyteMeeting}
                    />
                  ) : (
                    <ParticipantVideo
                      participant={pinnedRaw}
                      meeting={dyteMeeting}
                      isSelf={pinnedIsSelf}
                    />
                  )}
                </Box>
              )}

              {/* Main participant (keep your UI, but hide center avatar when video exists) */}
              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 1.25,
                }}
              >
                {!stageHasVideo && (
                  <>
                    <Avatar
                      sx={{
                        width: 76,
                        height: 76,
                        fontSize: 22,
                        bgcolor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      {initialsFromName(meeting.host.name)}
                    </Avatar>

                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{meeting.host.name}</Typography>
                    <Typography sx={{ opacity: 0.7, fontSize: 13 }}>{meeting.host.role}</Typography>
                  </>
                )}

                {pinnedHasVideo && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      right: 12,
                      zIndex: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.25,
                      pointerEvents: "none",
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, fontSize: 14, textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                      {meeting.host.name}
                    </Typography>
                    <Typography sx={{ opacity: 0.75, fontSize: 12, textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                      {meeting.host.role}
                    </Typography>
                  </Box>
                )}
              </Box>

            </Paper>

            {/* Participants strip (Audience + Speaker) */}
            <Box
              ref={stageStripRef}
              sx={{
                flexShrink: 0,
                display: "flex",
                gap: 1,
                overflowX: "auto",
                flexWrap: "nowrap",
                pb: 0.5,
                ...scrollSx,
              }}
            >
              {stageStripLimited.map((p, idx) => (
                <StageMiniTile
                  key={`${p.name}-${idx}`}
                  p={p}
                  meeting={dyteMeeting}
                  tileW={stageTileW}
                  tileH={stageTileH}
                />

              ))}

              {stageStripRemaining > 0 && (
                <Tooltip title="View all members">
                  <Paper
                    variant="outlined"
                    onClick={() => toggleRightPanel(3)}
                    sx={{
                      cursor: "pointer",
                      flex: "0 0 auto",
                      width: stageTileW,
                      height: stageTileH,
                      borderRadius: 2,
                      borderColor: "rgba(255,255,255,0.10)",
                      bgcolor: "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, opacity: 0.9 }}>+{stageStripRemaining} more</Typography>
                  </Paper>
                </Tooltip>
              )}
            </Box>


            {/* Bottom Controls */}
            <Box
              sx={{
                flexShrink: 0,
                position: "relative",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Role badge aligned with bottom controls (left) */}
              <Box
                sx={{
                  position: "absolute",
                  left: 0,         // change to 12 if you want same inset like stage chip
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              >
                <Chip
                  size="small"
                  label={isHost ? "As Host" : "As Audience"}
                  sx={{
                    bgcolor: "rgba(0,0,0,0.55)",
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    fontWeight: 700,
                    height: 26,
                    "& .MuiChip-label": { px: 1.1, fontSize: 12 },
                  }}
                />
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  borderRadius: 999,
                  borderColor: "rgba(255,255,255,0.08)",
                  bgcolor: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(10px)",
                  px: 2,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                  mx: "auto",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <Tooltip title={micOn ? "Mute" : "Unmute"}>
                  <IconButton
                    onClick={async () => {
                      if (!dyteMeeting?.self) return;

                      try {
                        if (dyteMeeting.self.audioEnabled) {
                          await dyteMeeting.self.disableAudio?.();
                        } else {
                          // ensures permission prompt happens on user click if needed
                          try {
                            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                            s.getTracks().forEach((t) => t.stop());
                          } catch { }

                          await dyteMeeting.self.enableAudio?.();
                        }

                        setMicOn(Boolean(dyteMeeting.self.audioEnabled));
                      } catch (e) {
                        console.warn("[LiveMeeting] mic toggle failed:", e);
                        setMicOn(Boolean(dyteMeeting?.self?.audioEnabled));
                      }
                    }}
                    aria-label="Toggle mic"
                  >
                    {micOn ? <MicIcon /> : <MicOffIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title={camOn ? "Turn camera off" : "Turn camera on"}>
                  <IconButton
                    onClick={async () => {
                      if (!dyteMeeting?.self) return;

                      // 1. Disable the button temporarily if you want to prevent spamming
                      // (Optional, but good practice)

                      try {
                        if (camOn) {
                          // If currently ON, disable it
                          await dyteMeeting.self.disableVideo();
                        } else {
                          // If currently OFF, enable it
                          await dyteMeeting.self.enableVideo();
                        }
                        // No need to call setCamOn() manually here.
                        // The 'videoUpdate' event listener in your useEffect will 
                        // automatically fire and update the UI state correctly.
                      } catch (e) {
                        console.error("Failed to toggle camera:", e);
                      }
                    }}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.06)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                      // Optional: Visual feedback if cam is active
                      color: camOn ? "#fff" : "inherit"
                    }}
                    aria-label="Toggle camera"
                  >
                    {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip
                  title={
                    !hostPerms.screenShare
                      ? "Screen share disabled by host"
                      : !canSelfScreenShare
                        ? "Screen share not allowed"
                        : (!isHost && hostForceBlock)
                          ? "Screen share blocked for audience"
                          : (isScreenSharing ? "Stop sharing" : "Share screen")
                  }
                >
                  <span>
                    <IconButton
                      onClick={toggleScreenShareNow}
                      disabled={screenShareDisabled}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.06)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                        "&.Mui-disabled": { opacity: 0.45 },
                      }}
                      aria-label="Share screen"
                    >
                      <ScreenShareIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title={!hostPerms.chat ? "Chat disabled by host" : (isChatActive ? "Close chat" : "Open chat")}>
                  <span>
                    <IconButton
                      onClick={() => {
                        // toggle behavior: if chat is open on tab=0, close panel
                        if (hostPerms.chat && isChatActive) closeRightPanel();
                        else toggleRightPanel(hostPerms.chat ? 0 : 1);
                      }}
                      sx={{
                        bgcolor: isChatActive ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                        "&:hover": { bgcolor: isChatActive ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                        opacity: hostPerms.chat ? 1 : 0.7,
                      }}
                      aria-label="Chat / panel"
                    >
                      <ChatBubbleOutlineIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Leave meeting">
                  <IconButton
                    onClick={async () => {
                      // ✅ tell everyone the host ended it
                      if (isHost) {
                        const myId = dyteMeeting?.self?.id;
                        if (myId) {
                          try {
                            dyteMeeting?.participants?.broadcastMessage?.("meeting-ended", { hostId: myId });
                          } catch { }
                        }
                      }

                      await handleMeetingEnd("left");
                      dyteMeeting?.leaveRoom?.();
                    }}
                    sx={{
                      bgcolor: "rgba(244,67,54,0.22)",
                      "&:hover": { bgcolor: "rgba(244,67,54,0.30)" },
                    }}
                    aria-label="Leave meeting"
                  >
                    <CallEndIcon />
                  </IconButton>
                </Tooltip>
              </Paper>
            </Box>
          </Box>

          {/* Right Panel (Desktop) */}
          {isMdUp && rightPanelOpen && (
            <Box
              sx={{
                width: RIGHT_PANEL_W,
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                bgcolor: "rgba(0,0,0,0.25)",
                backdropFilter: "blur(10px)",
                height: `calc(100vh - ${APPBAR_H}px)`,
                position: "sticky",
                top: APPBAR_H,
                overflow: "hidden",
                // (optional) to match the “padded card” look like main stage:
                p: 2,
                boxSizing: "border-box",
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  height: "100%",
                  minHeight: 0,
                  borderRadius: 3,
                  borderColor: "rgba(255,255,255,0.08)",
                  bgcolor: "rgba(255,255,255,0.03)",
                  overflow: "hidden",
                }}
              >
                {RightPanelContent}
              </Paper>
            </Box>
          )}

          {/* Right Panel (Mobile Drawer) */}
          {!isMdUp && (
            <Drawer
              anchor="right"
              open={rightOpen}
              onClose={() => setRightOpen(false)}
              PaperProps={{
                sx: {
                  width: { xs: "92vw", sm: 420 },
                  bgcolor: "rgba(0,0,0,0.85)",
                  borderLeft: "1px solid rgba(255,255,255,0.08)",

                  // ✅ FORCE WHITE TEXT ONLY IN MOBILE RIGHT PANEL
                  color: "#fff",
                  "&, & *": { color: "#fff" },
                },
              }}
            >
              {RightPanelContent}
            </Drawer>
          )}
        </Box>
        {/* Member Info Dialog - Redesigned */}
        <Dialog
          open={memberInfoOpen}
          onClose={closeMemberInfo}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "#0b101a", // Deep dark blue/black background
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 4,
              boxShadow: "0px 20px 40px rgba(0,0,0,0.6)",
              backdropFilter: "blur(14px)",
              p: 1,
              color: "#fff",
              "& .MuiTypography-root": { color: "#fff" },
            },
          }}
        >
          {/* Header Title */}
          <DialogTitle sx={{ pb: 0, pt: 2, px: 2, fontWeight: 700, fontSize: 16 }}>
            User Info
          </DialogTitle>

          <DialogContent sx={{ px: 2, pb: 2, pt: 1 }}>
            {selectedMember ? (
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>

                {/* 1. Avatar Section with Crown Badge */}
                <Box sx={{ position: "relative", mb: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: "rgba(255,255,255,0.1)",
                      fontSize: 32,
                      border: "2px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {initialsFromName(selectedMember.name)}
                  </Avatar>

                  {/* Show Crown if Host */}
                  {selectedMember.role === "Host" && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bgcolor: "#ffb300", // Gold color
                        borderRadius: "50%",
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #0b101a",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                      }}
                    >
                      <Typography sx={{ fontSize: 12 }}>👑</Typography>
                    </Box>
                  )}
                </Box>

                {/* 2. Name */}
                <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 0.5 }}>
                  {selectedMember.name}
                </Typography>

                {/* 3. Role Chip */}
                <Chip
                  label={selectedMember.role}
                  size="small"
                  icon={
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: selectedMember.role === "Host" ? "#ffb300" : "#22c55e", // Gold or Green dot
                        ml: 0.5,
                      }}
                    />
                  }
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    height: 24,
                    "& .MuiChip-label": { px: 1.5, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" },
                    "& .MuiChip-icon": { order: -1, mr: -0.5 }, // Move dot to start
                  }}
                />

                {/* 4. Info Card / Table */}
                <Box
                  sx={{
                    mt: 3,
                    width: "100%",
                    bgcolor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 3,
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >

                  {/* Row: Joined */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Joined</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                      {formatClockTime(selectedMember.joinedAtTs)}
                    </Typography>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                  {/* Row: Status */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Status</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>In Meeting</Typography>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                  {/* Row: Microphone */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Microphone</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {selectedMember.mic ? (
                        <>
                          <MicIcon sx={{ fontSize: 14, color: "#fff" }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>On</Typography>
                        </>
                      ) : (
                        <>
                          <MicOffIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }} />
                          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Off</Typography>
                        </>
                      )}
                    </Stack>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                  {/* Row: Camera */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Camera</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {selectedMember.cam ? (
                        <>
                          <VideocamIcon sx={{ fontSize: 14, color: "#fff" }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>On</Typography>
                        </>
                      ) : (
                        <>
                          <VideocamOffIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }} />
                          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Off</Typography>
                        </>
                      )}
                    </Stack>
                  </Box>

                  <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                  {/* Row: Permissions */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Permissions</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#facc15" }}>
                      {selectedMember.role === "Host" ? "Full Access" : "Attendee"}
                    </Typography>
                  </Box>
                </Box>

                {/* 5. View Profile Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Box component="span" sx={{ fontSize: 18, display: "flex" }}>👤</Box>} // Simple user icon or use PersonOutlineIcon
                  onClick={() => {
                    // Logic: Use customParticipantId (DB ID) if available, else fallback to Dyte ID
                    const userId = selectedMember._raw?.customParticipantId || selectedMember.id;
                    window.open(`/community/rich-profile/${userId}`, "_blank");
                  }}
                  sx={{
                    mt: 3,
                    py: 1.5,
                    borderRadius: 3,
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 14,
                    bgcolor: "rgba(255,255,255,0.02)",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.08)",
                      borderColor: "#fff",
                    },
                  }}
                >
                  View Profile
                </Button>
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: "center", opacity: 0.5 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DyteProvider>

  );
}