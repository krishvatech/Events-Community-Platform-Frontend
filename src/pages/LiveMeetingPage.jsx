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
  Skeleton,
  Switch,
  Paper,
  Stack,

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
  ListItemButton,
  Snackbar,
  Alert,
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
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import CallEndIcon from "@mui/icons-material/CallEnd";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded"; // <--- ADDED
import CheckRoundedIcon from "@mui/icons-material/CheckRounded"; // <--- ADDED
import ShuffleIcon from "@mui/icons-material/Shuffle";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";

import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";

import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";

import { useNavigate, useParams } from "react-router-dom";
import { useDyteClient, DyteProvider } from "@dytesdk/react-web-core";

import { DyteParticipantsAudio } from "@dytesdk/react-ui-kit";
import LoungeOverlay from "../components/lounge/LoungeOverlay.jsx";
import BreakoutControls from "../components/lounge/BreakoutControls.jsx";



// ================ API Helper ================
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
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

function getMyUserIdFromJwt() {
  const tok = getToken();
  if (!tok) return null;

  try {
    const payload = tok.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));

    // SimpleJWT usually uses user_id
    return json.user_id ?? json.id ?? json.sub ?? null;
  } catch {
    return null;
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

function truncateDisplayName(name = "", maxChars = 5) {
  const clean = String(name || "").trim().replace(/\s+/g, " ");
  if (!clean) return "User";
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars);
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

function getParticipantUserKey(participant) {
  if (!participant) return "";

  const raw = participant?._raw || participant || {};
  const directId =
    raw.customParticipantId ??
    raw.customParticipant_id ??
    raw.userId ??
    raw.user_id ??
    raw.uid ??
    raw.id ??
    participant.id;

  let meta =
    raw.customParticipantData ||
    raw.customParticipant ||
    raw.customParticipantDetails ||
    raw.metadata ||
    raw.meta ||
    raw.user ||
    raw.profile ||
    raw.profileData ||
    raw.userData ||
    null;

  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = null;
    }
  }

  const metaId =
    meta?.user_id ??
    meta?.userId ??
    meta?.id ??
    meta?.uid ??
    meta?.pk ??
    null;

  const id = directId || metaId;
  if (id) return `id:${String(id)}`;

  const name = raw.name || participant.name || "";
  return name ? `name:${String(name).toLowerCase()}` : "";
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
          src={p.picture} // ✅ Use profile picture
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

function JoiningMeetingScreen({ onBack, brandText = "IMAA Connect" }) {
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
      {/* Back (optional) */}
      {onBack && (
        <IconButton
          onClick={onBack}
          sx={{
            position: "fixed",
            top: 18,
            left: 18,
            zIndex: 60,
            bgcolor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.9)" }} />
        </IconButton>
      )}

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
          <Typography sx={{ fontWeight: 700, letterSpacing: 0.2, color: "rgba(255,255,255,0.85)" }}>
            {brandText}
          </Typography>
        </Box>
      </Box>

      {/* Center Card */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 4,
          px: 3,
          py: 3,
          textAlign: "center",
          bgcolor: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
        }}
      >
        <CircularProgress size={36} sx={{ color: "rgba(255,255,255,0.65)", mb: 1.5 }} />

        <Typography sx={{ fontWeight: 800, letterSpacing: 0.2, color: "rgba(255,255,255,0.88)" }}>
          Joining meeting...
        </Typography>

        <Typography sx={{ mt: 0.5, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          Please wait while we connect you
        </Typography>
      </Paper>

      {/* Small tiles under card (like your 2nd image) */}
      <Box
        sx={{
          mt: 2.5,
          width: "100%",
          maxWidth: 520,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 1.25,
          opacity: 0.95,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{
              height: 54,
              borderRadius: 2.5,
              bgcolor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </Box>
    </Box>
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
  const [hostMediaLocks, setHostMediaLocks] = useState({ mic: false, cam: false });

  // ✅ Settings menu anchor
  const [permAnchorEl, setPermAnchorEl] = useState(null);
  const permMenuOpen = Boolean(permAnchorEl);

  const openPermMenu = (e) => setPermAnchorEl(e.currentTarget);
  const closePermMenu = () => setPermAnchorEl(null);

  // ✅ Breakout Orchestration State
  const [breakoutTimer, setBreakoutTimer] = useState(null);
  const [breakoutAnnouncement, setBreakoutAnnouncement] = useState("");
  const [showBreakoutAnnouncement, setShowBreakoutAnnouncement] = useState(false);
  const [isBreakoutControlsOpen, setIsBreakoutControlsOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const mainSocketRef = useRef(null);

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

  // ============ DEVICE SELECTION STATE ============
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [selectedAudioOutputDeviceId, setSelectedAudioOutputDeviceId] = useState("");
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [deviceSwitchError, setDeviceSwitchError] = useState("");
  const activeAudioStreamRef = useRef(null); // Track audio stream for device switching
  const activeVideoStreamRef = useRef(null); // Track video stream for device switching
  const remoteAudioRef = useRef(null); // Reference to remote audio element for output device selection

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
  const [loungeOpen, setLoungeOpen] = useState(false);
  const isPanelOpen = isMdUp ? rightPanelOpen : rightOpen;
  const isChatActive = isPanelOpen && tab === 0 && hostPerms.chat;
  const isQnaActive = isPanelOpen && tab === 1;

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
  const mainAuthTokenRef = useRef("");
  const [loadingJoin, setLoadingJoin] = useState(true);
  const [joinError, setJoinError] = useState("");
  const [dbStatus, setDbStatus] = useState("draft");
  const [eventTitle, setEventTitle] = useState("Live Meeting");
  const [isBreakout, setIsBreakout] = useState(false);
  const [activeTableId, setActiveTableId] = useState(null);
  const [activeTableName, setActiveTableName] = useState("");
  const [loungeTables, setLoungeTables] = useState([]);

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
    (isHost ? !hostPerms.screenShare : true);

  // ============ DEVICE ENUMERATION & SWITCHING ============
  
  /**
   * Enumerate all available audio and video devices
   */
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audio = devices.filter((d) => d.kind === "audioinput" && d.deviceId);
      const video = devices.filter((d) => d.kind === "videoinput" && d.deviceId);
      
      setAudioDevices(audio);
      setVideoDevices(video);
      
      // Set default devices if not already selected
      if (audio.length > 0 && !selectedAudioDeviceId) {
        setSelectedAudioDeviceId(audio[0].deviceId);
      }
      if (video.length > 0 && !selectedVideoDeviceId) {
        setSelectedVideoDeviceId(video[0].deviceId);
      }
    } catch (err) {
      console.warn("[LiveMeeting] Failed to enumerate devices:", err);
    }
  }, [selectedAudioDeviceId, selectedVideoDeviceId, selectedAudioOutputDeviceId]);

  // Enumerate devices on mount and when permissions change
  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes (new device plugged in, etc.)
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [enumerateDevices]);

  /**
   * Switch to a different audio device
   * Uses replaceTrack for smooth transition without reconnecting
   */
  const switchAudioDevice = useCallback(async (deviceId) => {
    if (!deviceId || !dyteMeeting?.self) return;

    try {
      setDeviceSwitchError("");

      // Get new audio stream from the selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });

      const newAudioTrack = newStream.getAudioTracks()[0];
      if (!newAudioTrack) {
        throw new Error("No audio track in new stream");
      }

      // Get sender from Dyte's WebRTC connection
      const sender = dyteMeeting?.self?.peerConnection?.getSenders?.()?.find(
        (s) => s.track?.kind === "audio"
      );

      if (sender) {
        // Replace track smoothly without reconnecting
        await sender.replaceTrack(newAudioTrack);
      }

      // Stop old audio tracks to free resources
      if (activeAudioStreamRef.current) {
        activeAudioStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Store new stream reference for future switches
      activeAudioStreamRef.current = newStream;
      setSelectedAudioDeviceId(deviceId);

      console.log("[LiveMeeting] Audio device switched to:", deviceId);
    } catch (err) {
      const errMsg = `Failed to switch audio device: ${err.message}`;
      console.error("[LiveMeeting]", errMsg);
      setDeviceSwitchError(errMsg);
    }
  }, [dyteMeeting]);

  /**
   * Switch to a different video device
   * Uses replaceTrack for smooth transition without reconnecting
   */
  const switchVideoDevice = useCallback(async (deviceId) => {
    if (!deviceId || !dyteMeeting?.self) return;

    try {
      setDeviceSwitchError("");

      // Get new video stream from the selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error("No video track in new stream");
      }

      // Get sender from Dyte's WebRTC connection
      const sender = dyteMeeting?.self?.peerConnection?.getSenders?.()?.find(
        (s) => s.track?.kind === "video"
      );

      if (sender) {
        // Replace track smoothly without reconnecting
        await sender.replaceTrack(newVideoTrack);
      }

      // Stop old video tracks to free resources
      if (activeVideoStreamRef.current) {
        activeVideoStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Store new stream reference for future switches
      activeVideoStreamRef.current = newStream;
      setSelectedVideoDeviceId(deviceId);

      console.log("[LiveMeeting] Video device switched to:", deviceId);
    } catch (err) {
      const errMsg = `Failed to switch video device: ${err.message}`;
      console.error("[LiveMeeting]", errMsg);
      setDeviceSwitchError(errMsg);
    }
  }, [dyteMeeting]);

  /**
   * Switch audio output device (speakers/headphones)
   * Note: Limited browser support - works on Chrome, Edge, some Firefox versions
   */
  const switchAudioOutputDevice = useCallback(async (deviceId) => {
    if (!deviceId) return;

    try {
      setDeviceSwitchError("");

      // Try to set sink ID on remote audio element
      if (remoteAudioRef.current && typeof remoteAudioRef.current.setSinkId === "function") {
        await remoteAudioRef.current.setSinkId(deviceId);
        setSelectedAudioOutputDeviceId(deviceId);
        console.log("[LiveMeeting] Audio output device switched to:", deviceId);
      } else {
        // Fallback: setSinkId not supported or not available yet
        console.warn("[LiveMeeting] Audio output device selection not supported in this browser");
        setDeviceSwitchError(
          "Audio output device selection is limited in your browser. Some devices may not support this feature."
        );
        setSelectedAudioOutputDeviceId(deviceId);
      }
    } catch (err) {
      const errMsg = `Failed to switch audio output device: ${err.message}`;
      console.error("[LiveMeeting]", errMsg);
      setDeviceSwitchError(errMsg);
    }
  }, []);

  const handleToggleMic = useCallback(async () => {
    if (!dyteMeeting?.self) return;

    try {
      if (dyteMeeting.self.audioEnabled) {
        await dyteMeeting.self.disableAudio?.();
      } else {
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
  }, [dyteMeeting]);

  const handleToggleCamera = useCallback(async () => {
    if (!dyteMeeting?.self) return;

    try {
      if (camOn) {
        await dyteMeeting.self.disableVideo();
      } else {
        await dyteMeeting.self.enableVideo();
      }
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  }, [camOn, dyteMeeting]);

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

  const resolveTableName = useCallback(
    (tableId) => {
      if (!tableId) return "";
      const hit = (Array.isArray(loungeTables) ? loungeTables : []).find(
        (t) => String(t?.id) === String(tableId)
      );
      return hit?.name || "";
    },
    [loungeTables]
  );


  const handleEnterBreakout = async (tableId) => {
    if (!eventId || !tableId) return;
    try {
      const url = `${API_ROOT}/events/${eventId}/lounge-join-table/`.replace(/([^:]\/)\/+/g, "$1");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ table_id: tableId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          console.log("[LiveMeeting] Joining breakout room with token");
          setAuthToken(data.token);
          setIsBreakout(true);
          setActiveTableId(tableId);
          setActiveTableName(resolveTableName(tableId) || `Room ${tableId}`);
        }
      } else {
        console.error("[LiveMeeting] Failed to fetch breakout token:", res.status);
      }
    } catch (err) {
      console.error("[LiveMeeting] Failed to join breakout:", err);
    }
  };

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

  const forceMuteParticipant = useCallback(
    async (participant) => {
      if (!isHost || !dyteMeeting) return;
      const raw = participant?._raw || participant;
      const id = raw?.id || participant?.id;
      if (!id) return;
      try {
        await dyteMeeting.participants.updatePermissions([id], {
          canProduceAudio: "NOT_ALLOWED",
          requestProduceAudio: false,
        });
      } catch (e) {
        console.warn("Failed to lock mic for participant", e);
      }
      try {
        await raw?.disableAudio?.();
      } catch (e) {
        console.warn("Failed to force mute participant", e);
      }
    },
    [dyteMeeting, isHost]
  );

  const forceCameraOffParticipant = useCallback(
    async (participant) => {
      if (!isHost || !dyteMeeting) return;
      const raw = participant?._raw || participant;
      const id = raw?.id || participant?.id;
      if (!id) return;
      try {
        await dyteMeeting.participants.updatePermissions([id], {
          canProduceVideo: "NOT_ALLOWED",
          requestProduceVideo: false,
        });
      } catch (e) {
        console.warn("Failed to lock camera for participant", e);
      }
      try {
        await raw?.disableVideo?.();
      } catch (e) {
        console.warn("Failed to force camera off for participant", e);
      }
    },
    [dyteMeeting, isHost]
  );

  const forceMuteAll = useCallback(async () => {
    if (!isHost || !dyteMeeting) return;
    setHostMediaLocks((prev) => ({ ...prev, mic: true }));
    const participants = getJoinedParticipants().filter((p) => p.id !== dyteMeeting?.self?.id);
    const ids = participants.map((p) => p.id).filter(Boolean);
    if (ids.length) {
      try {
        await dyteMeeting.participants.updatePermissions(ids, {
          canProduceAudio: "NOT_ALLOWED",
          requestProduceAudio: false,
        });
      } catch (e) {
        console.warn("Failed to lock mic for all", e);
      }
    }
    for (const p of participants) {
      try {
        await p?.disableAudio?.();
      } catch (_) { }
    }
  }, [dyteMeeting, getJoinedParticipants, isHost]);

  const forceCameraOffAll = useCallback(async () => {
    if (!isHost || !dyteMeeting) return;
    setHostMediaLocks((prev) => ({ ...prev, cam: true }));
    const participants = getJoinedParticipants().filter((p) => p.id !== dyteMeeting?.self?.id);
    const ids = participants.map((p) => p.id).filter(Boolean);
    if (ids.length) {
      try {
        await dyteMeeting.participants.updatePermissions(ids, {
          canProduceVideo: "NOT_ALLOWED",
          requestProduceVideo: false,
        });
      } catch (e) {
        console.warn("Failed to lock camera for all", e);
      }
    }
    for (const p of participants) {
      try {
        await p?.disableVideo?.();
      } catch (_) { }
    }
  }, [dyteMeeting, getJoinedParticipants, isHost]);

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
    // Force re-fetch of main token if desired, but we usually get it once

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

    // 1. If we are in a breakout room, we don't manage tokens here
    // (Breakout tokens are managed by LoungeOverlay -> handleEnterBreakout)
    if (isBreakout) return;

    // 2. If we already have the main token, just use it
    if (mainAuthTokenRef.current) {
      console.log("[LiveMeeting] Already have main token, using it");
      if (authToken !== mainAuthTokenRef.current) {
        setAuthToken(mainAuthTokenRef.current);
      }
      setLoadingJoin(false);
      return;
    }

    // 3. Otherwise, fetch it for the first time
    (async () => {
      setLoadingJoin(true);
      setJoinError("");

      try {
        console.log("[LiveMeeting] Fetching initial Dyte token for role:", role);
        const res = await fetch(toApiUrl(`events/${eventId}/dyte/join/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ role }),
        });

        if (!res.ok) throw new Error("Failed to join live meeting.");
        const data = await res.json();

        console.log("[LiveMeeting] Received initial Dyte token");
        setAuthToken(data.authToken);
        mainAuthTokenRef.current = data.authToken;
        if (data.role) setRole(normalizeRole(data.role));
      } catch (e) {
        console.error("[LiveMeeting] Failed to fetch initial Dyte token:", e);
        setJoinError(e.message || "Join failed");
      } finally {
        setLoadingJoin(false);
      }
    })();
  }, [eventId, role, isBreakout]);

  // ---------- Persistent Main Event WebSocket (for Force Join, Timer, Broadcast) ----------
  useEffect(() => {
    if (!eventId) return;

    const token = getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";

    // Construct WS URL for the main event consumer
    const WS_ROOT = API_ROOT.replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const wsUrl = `${WS_ROOT}/ws/events/${eventId}/${qs}`.replace(/([^:]\/)\/+/g, "$1");

    console.log("[MainSocket] Connecting to:", wsUrl);
    const ws = new WebSocket(wsUrl);
    mainSocketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[MainSocket] Received:", msg.type, msg);

        if (msg.type === "force_join_breakout") {
          // 1. Join the table via API to get token
          handleEnterBreakout(msg.table_id);
        } else if (msg.type === "server_debug") {
          // Silent in production
        } else if (msg.type === "breakout_timer") {
          setBreakoutTimer(msg.duration);
        } else if (msg.type === "breakout_announcement") {
          setBreakoutAnnouncement(msg.message);
          setShowBreakoutAnnouncement(true);
        } else if (msg.type === "lounge_state" || msg.type === "welcome") {
          if (msg.online_users) setOnlineUsers(msg.online_users);
          const tableState =
            msg.lounge_state || msg.state || msg.tables || msg.lounge_tables || [];
          if (Array.isArray(tableState) && tableState.length) {
            setLoungeTables(tableState);
          }
        } else if (msg.type === "breakout_end") {
          console.log("[MainSocket] Breakout session ended by host.");
          // Return to main meeting
          setAuthToken(mainAuthTokenRef.current);
          setIsBreakout(false);
          setActiveTableId(null);
          setActiveTableName("");
          setRoomChatConversationId(null);
        } else {
          console.log("[MainSocket] Other message type:", msg.type, msg);
        }
      } catch (err) {
        console.warn("[MainSocket] Failed to parse message:", err);
      }
    };

    ws.onclose = (e) => {
      console.log("[MainSocket] Disconnected");
      console.log("[MainSocket] Close event:", {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
        eventId: eventId,
        timestamp: new Date().toISOString()
      });
      mainSocketRef.current = null;
    };

    return () => {
      console.log("[MainSocket] Cleanup function called - closing WebSocket");
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    };
  }, [eventId]);

  // Timer countdown logic
  useEffect(() => {
    if (breakoutTimer === null || breakoutTimer <= 0) return;

    const interval = setInterval(() => {
      setBreakoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breakoutTimer]);

  // ---------- Init Dyte meeting ----------
  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;
    (async () => {
      try {
        setInitDone(false);
        // ✅ Reset join flags so we can join the NEW meeting room
        joinedOnceRef.current = false;
        setRoomJoined(false);

        await initMeeting({
          authToken,
          defaults: {
            audio: isBreakout || role === "publisher", // Full access in breakout
            video: isBreakout || role === "publisher",
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
  }, [authToken, initMeeting, role, isBreakout]);

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

  const ignoreRoomLeftRef = useRef(false);

  const handleMeetingEnd = useCallback(
    async (state) => {
      if (endHandledRef.current) return;
      endHandledRef.current = true;

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch { }
      }

      try {
        await dyteMeeting?.leaveRoom?.();
        await dyteMeeting?.leave?.();
      } catch { }

      if (role === "publisher") {
        updateLiveStatus("end");
        navigate("/admin/events");
      } else {
        navigate(-1);
      }
    },
    [navigate, role, updateLiveStatus, dyteMeeting]
  );

  useEffect(() => {
    if (!dyteMeeting?.self) return;
    const handleRoomLeft = ({ state }) => {
      if (ignoreRoomLeftRef.current) return;
      if (["left", "ended", "kicked", "rejected", "disconnected", "failed"].includes(state)) {
        if (!isBreakout) handleMeetingEnd(state);
      }
    };
    dyteMeeting.self.on("roomLeft", handleRoomLeft);
    return () => dyteMeeting.self.off?.("roomLeft", handleRoomLeft);
  }, [dyteMeeting, handleMeetingEnd, isBreakout]);

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

  // ✅ If Host leaves MAIN MEETING, auto-end for everyone (audience auto leaves)
  // NOTE: This should NOT trigger when host leaves a breakout room
  useEffect(() => {
    if (!dyteMeeting) return;
    if (isHost) return; // host doesn't need to auto-leave (already leaving)

    // IMPORTANT: Only monitor for host leaving in the MAIN meeting, not breakouts
    if (isBreakout) {
      console.log("[LiveMeeting] In breakout room - not monitoring for host leave");
      return;
    }

    const onParticipantLeft = (p) => {
      const hostId = hostIdHint || pinnedHost?.id;
      if (!hostId || !p?.id) return;

      // Host left MAIN meeting => end meeting for audience
      if (p.id === hostId) {
        if (endHandledRef.current) return;

        console.log("[LiveMeeting] Host left MAIN meeting - ending for all attendees");

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
  }, [dyteMeeting, getJoinedParticipants, isHost, isBreakout, hostIdHint, pinnedHost, handleMeetingEnd]);

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
          canProduceScreenshare: "NOT_ALLOWED",
          requestProduceScreenshare: false,
          chat: {
            public: { canSend: hostPerms.chat, text: hostPerms.chat, files: hostPerms.chat },
            private: { canSend: hostPerms.chat, text: hostPerms.chat, files: hostPerms.chat },
          },
          polls: { canCreate: hostPerms.polls, canVote: hostPerms.polls },
          ...(hostMediaLocks.mic
            ? { canProduceAudio: "NOT_ALLOWED", requestProduceAudio: false }
            : {}),
          ...(hostMediaLocks.cam
            ? { canProduceVideo: "NOT_ALLOWED", requestProduceVideo: false }
            : {}),
        });
      } catch (e) {
        console.warn("Failed to sync permissions", e);
      }
      if (hostMediaLocks.mic) {
        try { await participant?.disableAudio?.(); } catch { }
      }
      if (hostMediaLocks.cam) {
        try { await participant?.disableVideo?.(); } catch { }
      }
    };
    dyteMeeting.participants.joined.on("participantJoined", handleParticipantJoined);
    return () => dyteMeeting.participants.joined.off("participantJoined", handleParticipantJoined);
  }, [dyteMeeting, hostPerms.chat, hostPerms.polls, hostPerms.screenShare, hostMediaLocks, isHost]);

  // ---------- Build participants list for your NEW UI ----------
  const [participantsTick, setParticipantsTick] = useState(0);
  const observedParticipantsRef = useRef(new Map()); // fallback map from events

  useEffect(() => {
    if (!dyteMeeting?.participants) return;

    // Clear stale state when meeting changes
    observedParticipantsRef.current.clear();
    setPinnedHost(null);
    setHostJoined(false);
    setActiveScreenShareParticipant(null);

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

  useEffect(() => {
    // Reset fallback caches when switching between main and breakout rooms
    observedParticipantsRef.current.clear();
    participantJoinedAtRef.current.clear();
  }, [authToken]);

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

    // Prefer self, then joined, then fallback observed entries
    if (dyteMeeting?.self) list.push(dyteMeeting.self);
    getJoinedParticipants().forEach((p) => list.push(p));
    observedParticipantsRef.current.forEach((p) => list.push(p));

    const deduped = [];
    const seenKeys = new Set();
    for (const p of list) {
      const key = getParticipantUserKey(p) || `id:${String(p?.id || "")}`;
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push(p);
    }

    deduped.forEach((pp) => {
      if (!pp?.id) return;
      if (participantJoinedAtRef.current.has(pp.id)) return;

      const isSelf = dyteMeeting?.self?.id && pp.id === dyteMeeting.self.id;
      if (isSelf && joinedAtRef.current) {
        participantJoinedAtRef.current.set(pp.id, joinedAtRef.current);
      } else {
        participantJoinedAtRef.current.set(pp.id, Date.now());
      }
    });

    return deduped.map((p) => {
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

      const raw = p?._raw || p || {};
      const rawMeta =
        raw.customParticipantData ||
        raw.customParticipant ||
        raw.customParticipantDetails ||
        raw.metadata ||
        raw.meta ||
        raw.user ||
        raw.profile ||
        {};
      let parsedMeta = {};
      if (typeof rawMeta === "string") {
        try {
          parsedMeta = JSON.parse(rawMeta);
        } catch {
          parsedMeta = {};
        }
      } else if (typeof rawMeta === "object" && rawMeta) {
        parsedMeta = rawMeta;
      }
      const metaProfilePicture =
        typeof parsedMeta?.profilePicture === "object"
          ? parsedMeta.profilePicture.displayImage || parsedMeta.profilePicture.url
          : parsedMeta?.profilePicture;
      const metaPicture =
        parsedMeta?.picture ||
        parsedMeta?.avatar ||
        parsedMeta?.avatar_url ||
        parsedMeta?.user_image_url ||
        parsedMeta?.user_image ||
        parsedMeta?.image ||
        parsedMeta?.photo ||
        metaProfilePicture ||
        "";

      return {
        id: p.id,
        name: p.name || "User",
        role: isHostParticipant ? "Host" : "Audience",
        mic: Boolean(p.audioEnabled),
        cam: Boolean(p.videoEnabled),
        active: Boolean(p.isSpeaking),
        joinedAtTs: participantJoinedAtRef.current.get(p.id),
        picture: p.picture || p.avatar || p.profilePicture || metaPicture || "", // ✅ Extract picture
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
    // ✅ FORCE for Host: Always use self as the pinned host source of truth
    if (isHost && dyteMeeting?.self) {
      return dyteMeeting.self;
    }

    let p = pinnedHost;
    // If in breakout and no official host pinned, fallback to first other person or self
    if (!p && isBreakout) {
      p = getJoinedParticipants().find(x => x.id !== dyteMeeting?.self?.id) || dyteMeeting?.self;
    }
    if (!p) return null;

    // ✅ FIX: If p is self, return the current dyteMeeting.self which is always fresh
    if (dyteMeeting?.self?.id && p.id === dyteMeeting.self.id) {
      return dyteMeeting.self;
    }

    // 1. Try to find the exact same participant ID in the fresh list
    // This gets the version where videoEnabled is effectively 'true'
    const fresh = getJoinedParticipants().find((x) => x.id === p.id);

    // 2. Return the fresh object if found, otherwise fallback to the state one
    return fresh || p;
  }, [pinnedHost, participantsTick, getJoinedParticipants, isBreakout, dyteMeeting?.self, camOn, isHost]);

  // Pinned “host” view data
  const meetingMeta = useMemo(
    () => ({
      title: eventTitle,
      live: dbStatus === "live",
      timer: joinElapsedLabel,
      recording: true,
      roomLabel: isBreakout ? "Breakout" : "Pinned",
      host: {
        name: latestPinnedHost?.name || (isBreakout ? "Breakout Room" : "Host"),
        role: (isBreakout && latestPinnedHost) ? "Member" : "Host"
      },
    }),
    [eventTitle, dbStatus, latestPinnedHost, joinElapsedLabel, isBreakout]
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

    // optional safety: if host turns OFF while sharing, stop it
    if (!next && dyteMeeting?.self?.disableScreenShare) {
      try { await dyteMeeting.self.disableScreenShare(); } catch { }
      setIsScreenSharing(false);
    }
  }, [dyteMeeting, hostPerms.screenShare, isHost, isScreenSharing]);

  // -------- Live chat (messaging backend) ----------
  const [chatConversationId, setChatConversationId] = useState(null);
  const [roomChatConversationId, setRoomChatConversationId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef(null);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [qnaUnreadCount, setQnaUnreadCount] = useState(0);

  // ✅ Private chat unread (per user)
  const [privateUnreadByUserId, setPrivateUnreadByUserId] = useState({});
  const myUserId = useMemo(() => String(getMyUserIdFromJwt() || ""), []);
  const isRoomChatActive = Boolean(isBreakout && activeTableId);
  const activeRoomLabel =
    activeTableName || (activeTableId ? `Room ${activeTableId}` : "");

  // refs so WS doesn't need to reconnect on every tab change
  const isQnaActiveRef = useRef(false);
  const myUserIdRef = useRef(myUserId);

  useEffect(() => {
    isQnaActiveRef.current = isQnaActive;
    if (isQnaActive) setQnaUnreadCount(0); // clear dot when user opens Q&A
  }, [isQnaActive]);

  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  const activeChatConversationId = isRoomChatActive
    ? roomChatConversationId
    : chatConversationId;

  const fetchChatMessages = useCallback(
    async (conversationId) => {
      const cid = conversationId || activeChatConversationId;
      if (!cid) return;
      const res = await fetch(toApiUrl(`messaging/conversations/${cid}/messages/`), {
        headers: { Accept: "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.detail || "Failed to load chat.");
      setChatMessages(Array.isArray(data) ? data : []);
    },
    [activeChatConversationId]
  );

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

  const ensureLoungeConversation = useCallback(async () => {
    if (!activeTableId) return null;
    const res = await fetch(toApiUrl("messaging/conversations/ensure-lounge/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ table_id: activeTableId, title: activeRoomLabel }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.detail || "Failed to open room chat.");
    }
    const cid = data?.id;
    if (!cid) throw new Error("Room chat conversation missing.");
    setRoomChatConversationId(cid);
    return cid;
  }, [activeRoomLabel, activeTableId]);

  const ensureActiveConversation = useCallback(async () => {
    if (isRoomChatActive) return ensureLoungeConversation();
    return ensureEventConversation();
  }, [ensureEventConversation, ensureLoungeConversation, isRoomChatActive]);

  const fetchChatUnread = useCallback(async () => {
    try {
      const cid = activeChatConversationId || (await ensureActiveConversation());
      if (!cid) return 0;

      const res = await fetch(toApiUrl(`messaging/conversations/${cid}/`), {
        headers: { Accept: "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => null);
      const unread = Number(data?.unread_count || 0);

      setChatUnreadCount(unread);
      return unread;
    } catch {
      return 0;
    }
  }, [activeChatConversationId, ensureActiveConversation]);

  const markChatAllRead = useCallback(async (conversationId) => {
    const cid = conversationId || activeChatConversationId;
    if (!cid) return;

    try {
      await fetch(toApiUrl(`messaging/conversations/${cid}/mark-all-read/`), {
        method: "POST",
        headers: { ...authHeader() },
      });
      setChatUnreadCount(0);
    } catch { }
  }, [activeChatConversationId]);

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

      // ✅ Clear unread for this DM as soon as it opens
      try {
        await fetch(toApiUrl(`messaging/conversations/${convData.id}/mark-all-read/`), {
          method: "POST",
          headers: { ...authHeader() },
        });

        const ridKey = String(recipientId);
        setPrivateUnreadByUserId((prev) => {
          if (!prev?.[ridKey]) return prev;
          const next = { ...prev };
          delete next[ridKey];
          return next;
        });
      } catch { }

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

  useEffect(() => {
    if (!myUserId) return;

    let alive = true;

    const tick = async () => {
      if (!alive) return;

      try {
        const res = await fetch(toApiUrl("messaging/conversations/"), {
          headers: { Accept: "application/json", ...authHeader() },
        });

        const data = await res.json().catch(() => []);
        if (!res.ok || !Array.isArray(data)) return;

        const next = {};
        const activeRid = privateChatUser
          ? String(privateChatUser._raw?.customParticipantId || privateChatUser.id || "")
          : "";

        for (const c of data) {
          if (c?.chat_type !== "dm") continue;

          const unread = Number(c?.unread_count || 0);
          if (unread <= 0) continue;

          const ids = (c?.participant_ids || []).map((x) => String(x));
          const otherId = ids.find((x) => x !== myUserId);
          if (!otherId) continue;

          // If currently inside that DM, don't show dot (optional)
          if (activeRid && otherId === activeRid) continue;

          next[otherId] = unread;
        }

        if (alive) setPrivateUnreadByUserId(next);
      } catch { }
    };

    tick();
    const t = setInterval(tick, 3000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [myUserId, privateChatUser]);

  // ✅ Auto-load new messages while Private Chat is OPEN (active DM)
  useEffect(() => {
    if (!privateChatUser || !privateConversationId) return;

    let alive = true;

    const recipientId = String(
      privateChatUser?._raw?.customParticipantId || privateChatUser?.id || ""
    );

    const tick = async () => {
      if (!alive) return;

      try {
        // 1) Check unread for THIS DM
        const res = await fetch(
          toApiUrl(`messaging/conversations/${privateConversationId}/`),
          { headers: { Accept: "application/json", ...authHeader() } }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) return;

        const unread = Number(data?.unread_count || 0);

        // If you want ALWAYS refresh, remove this if-block.
        if (unread <= 0) return;

        // 2) Fetch latest messages
        const msgRes = await fetch(
          toApiUrl(`messaging/conversations/${privateConversationId}/messages/`),
          { headers: { Accept: "application/json", ...authHeader() } }
        );
        const msgs = await msgRes.json().catch(() => []);
        if (alive) setPrivateMessages(Array.isArray(msgs) ? msgs : []);

        // 3) Mark read + clear dot
        await fetch(
          toApiUrl(`messaging/conversations/${privateConversationId}/mark-all-read/`),
          { method: "POST", headers: { ...authHeader() } }
        );

        if (recipientId) {
          setPrivateUnreadByUserId((prev) => {
            if (!prev?.[recipientId]) return prev;
            const next = { ...prev };
            delete next[recipientId];
            return next;
          });
        }
      } catch { }
    };

    tick();
    const t = setInterval(tick, 2000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [privateChatUser, privateConversationId]);


  useEffect(() => {
    if (!hostPerms.chat) return;
    if (!eventId && !activeTableId) return;

    let alive = true;

    const tick = async () => {
      if (!alive) return;

      const unread = await fetchChatUnread();

      // If user is actively viewing chat, auto-refresh and clear unread
      if (isChatActive && unread > 0) {
        const cid = activeChatConversationId || (await ensureActiveConversation());
        if (cid) {
          await fetchChatMessages(cid);
          await markChatAllRead(cid);
        }
      }
    };

    tick();
    const t = setInterval(tick, 3000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [
    eventId,
    activeTableId,
    hostPerms.chat,
    isChatActive,
    activeChatConversationId,
    ensureActiveConversation,
    fetchChatMessages,
    fetchChatUnread,
    markChatAllRead,
  ]);

  // Auto-scroll private chat
  useEffect(() => {
    if (privateChatBottomRef.current) {
      privateChatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [privateMessages]);
  // =================================================





  const loadChatThread = useCallback(async () => {
    setChatLoading(true);
    setChatError("");
    try {
      const cid = await ensureActiveConversation();
      if (cid) {
        await fetchChatMessages(cid);
        await markChatAllRead(cid);
      }
    } catch (e) {
      setChatError(e?.message || "Unable to load chat.");
    } finally {
      setChatLoading(false);
    }
  }, [ensureActiveConversation, fetchChatMessages, markChatAllRead]);

  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatError("");
    try {
      const cid = activeChatConversationId || (await ensureActiveConversation());
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
  }, [activeChatConversationId, chatInput, chatSending, ensureActiveConversation]);

  useEffect(() => {
    if (eventId) {
      setChatConversationId(null);
      setRoomChatConversationId(null);
      setChatMessages([]);
      setActiveTableId(null);
      setActiveTableName("");
      setLoungeTables([]);
    }
  }, [eventId]);

  useEffect(() => {
    setRoomChatConversationId(null);
    setChatMessages([]);
    setChatInput("");
    setChatError("");
  }, [activeTableId]);

  useEffect(() => {
    if (!activeTableId) return;
    const name = resolveTableName(activeTableId);
    if (name && name !== activeTableName) {
      setActiveTableName(name);
    }
  }, [activeTableId, activeTableName, resolveTableName]);

  useEffect(() => {
    if (!eventId || !activeTableId) return;
    if (activeTableName) return;

    let alive = true;
    const loadTableName = async () => {
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/lounge-state/`), {
          headers: { Accept: "application/json", ...authHeader() },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const tables = Array.isArray(data?.tables) ? data.tables : [];
        const match = tables.find((t) => String(t?.id) === String(activeTableId));
        if (alive && match?.name) {
          setActiveTableName(match.name);
        }
      } catch {
        // keep fallback name
      }
    };

    loadTableName();
    return () => {
      alive = false;
    };
  }, [eventId, activeTableId, activeTableName]);

  useEffect(() => {
    const chatActive = hostPerms.chat && tab === 0 && isPanelOpen;
    if (!chatActive || (!eventId && !activeTableId)) return;
    loadChatThread();
  }, [hostPerms.chat, tab, isPanelOpen, eventId, activeTableId, loadChatThread]);

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

  const getParticipantFromMessage = useCallback((msg) => {
    const senderId =
      msg?.sender_id ??
      (typeof msg?.sender === "object" ? msg?.sender?.id : msg?.sender) ??
      msg?.user_id ??
      (typeof msg?.user === "object" ? msg?.user?.id : msg?.user) ??
      msg?.uid ??
      "";

    const senderKey = senderId ? String(senderId) : "";
    const label =
      msg?.sender_display ||
      msg?.sender_name ||
      msg?.user_name ||
      msg?.user ||
      "";

    const byId = senderKey
      ? participants.find((p) => {
        const raw = p?._raw || {};
        const pid =
          raw?.customParticipantId ??
          raw?.clientSpecificId ??
          raw?.client_specific_id ??
          raw?.client_specific_id_str ??
          raw?.user_id ??
          raw?.userId ??
          p?.id ??
          "";
        return String(pid) === senderKey;
      })
      : null;

    if (byId) return byId;

    const normLabel = String(label || "").trim().toLowerCase();
    if (!normLabel) return null;
    return participants.find(
      (p) => String(p?.name || "").trim().toLowerCase() === normLabel
    );
  }, [participants]);

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

  useEffect(() => {
    const isQnATabActive = (tab === 1) && (isPanelOpen === true);
    if (!isQnATabActive) return;

    setQnaUnreadCount(0);   // ✅ clear dot when user opens Q&A
    loadQuestions();
  }, [tab, isPanelOpen, loadQuestions]);

  // WS live updates while Q&A tab open
  useEffect(() => {
    const isQnATabActive = (tab === 1) && (isPanelOpen === true);
    if (!eventId) return;
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
          const senderId = String(msg.user_id ?? msg.uid ?? "");
          const meId = String(myUserIdRef.current || "");
          const active = Boolean(isQnaActiveRef.current);

          // If I'm NOT on Q&A tab, and this question is from someone else → show dot
          if (!active && senderId && meId && senderId !== meId) {
            setQnaUnreadCount((c) => c + 1);
          }
          setQuestions((prev) => {
            if (prev.some((q) => q.id === msg.question_id)) return prev;
            const newQ = {
              id: msg.question_id,
              content: msg.content,
              user_id: msg.user_id,
              user_name: msg.user,
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

  // --- Self helpers for Members UI ---
  const selfDyteId = dyteMeeting?.self?.id || null;

  const audienceMembersSorted = useMemo(() => {
    const arr = [...(groupedMembers?.audience || [])];

    // put self on top (only matters for Audience view, host won't be inside audience anyway)
    arr.sort((a, b) => {
      const aSelf = Boolean(selfDyteId && a?.id === selfDyteId);
      const bSelf = Boolean(selfDyteId && b?.id === selfDyteId);
      if (aSelf && !bSelf) return -1;
      if (!aSelf && bSelf) return 1;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });

    return arr;
  }, [groupedMembers?.audience, selfDyteId]);

  const isSelfMember = (m) => Boolean(selfDyteId && m?.id === selfDyteId);

  const RIGHT_PANEL_W = 400;
  const APPBAR_H = 44;

  // Others only (Audience + Speaker), host is pinned already
  const stageOthers = useMemo(() => {
    if (isBreakout) {
      // In breakout, everyone is a peer. Hide only the person currently occupying the main stage.
      return participants.filter((p) => p.id !== latestPinnedHost?.id);
    }
    // Main meeting: keep legacy behavior of hiding all hosts from the audience strip
    return participants.filter((p) => p.role !== "Host");
  }, [participants, isBreakout, latestPinnedHost]);

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

  const showChatDot = hostPerms.chat && chatUnreadCount > 0 && !isChatActive;
  const showPrivateDot = Object.keys(privateUnreadByUserId || {}).length > 0;
  const showQnaDot = qnaUnreadCount > 0 && !isQnaActive;

  const showAnyChatDot = showChatDot || showPrivateDot || showQnaDot;
  const showAnyPanelDot = showAnyChatDot;

  const showMembersDot = showPrivateDot;


  // ================= SIDEBAR COMPONENTS =================

  // 1. Main Content Area (Left side)
  const SidebarMainContent = (
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
      {privateChatUser ? (
        <>
          {/* 1. Private Chat Header (User Name on Top) */}
          <Box
            sx={{
              px: 2, py: 2,
              display: "flex", alignItems: "center", gap: 1.5,
              borderBottom: "1px solid", borderColor: "rgba(255,255,255,0.08)",
              bgcolor: "rgba(0,0,0,0.10)",
            }}
          >
            <IconButton onClick={handleClosePrivateChat} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={privateChatUser.picture} sx={{ width: 32, height: 32, bgcolor: "rgba(255,255,255,0.14)", fontSize: 13 }}>
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
        // ================= EXISTING TABS BODY (REUSED) =================
        <>
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "rgba(255,255,255,0.08)",
              bgcolor: "rgba(0,0,0,0.10)",
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              {tab === 0 &&
                (isRoomChatActive
                  ? `Room Chat${activeRoomLabel ? `: ${activeRoomLabel}` : ""}`
                  : "Public Chat")}
              {tab === 1 && "Q&A"}
              {tab === 2 && "Polls"}
              {tab === 3 && "Participants"}
            </Typography>

            <IconButton onClick={closeRightPanel} size="small" aria-label="Close panel">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Body */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {/* CHAT */}
            {hostPerms.chat && (
              <TabPanel value={tab} index={0}>
                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
                  {isRoomChatActive && (
                    <Typography sx={{ fontSize: 12, opacity: 0.7, mb: 1 }}>
                      Room chat is limited to people seated in {activeRoomLabel || "this room"}.
                    </Typography>
                  )}
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
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar
                                src={
                                  getParticipantFromMessage(m)?.picture ||
                                  m.sender_avatar ||
                                  m.sender_image ||
                                  m.sender_profile_image ||
                                  m.sender?.avatar ||
                                  m.sender?.profile_image ||
                                  ""
                                }
                                sx={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 12,
                                  bgcolor: "rgba(255,255,255,0.12)",
                                }}
                              >
                                {(m.sender_display || m.sender_name || "U").slice(0, 1)}
                              </Avatar>
                              <Typography
                                onClick={() => {
                                  const member = getParticipantFromMessage(m);
                                  if (member) openMemberInfo(member);
                                }}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                  cursor: "pointer",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    const member = getParticipantFromMessage(m);
                                    if (member) openMemberInfo(member);
                                  }
                                }}
                              >
                                {m.sender_display || m.sender_name || "User"}
                              </Typography>
                            </Stack>
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

                      // Check if self
                      const selfCsid = dyteMeeting?.self?.clientSpecificId;
                      const isSelfQuestion = selfCsid && String(selfCsid) === String(q.user_id);

                      const askedBy = isSelfQuestion
                        ? "You"
                        : q.user_name ||
                        q.user_display ||
                        q.user ||
                        q.user?.name ||
                        participants.find((p) => {
                          const raw = p?._raw || {};
                          const csid = raw.clientSpecificId ?? raw.client_specific_id;
                          return csid != null && String(csid) === String(q.user_id);
                        })?.name ||
                        (q.user_id ? `User ${q.user_id}` : "Audience");

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

            {/* POLLS (Hidden) */}
            <TabPanel value={tab} index={2}>
              {/* ... Polls Logic (Hidden) ... */}
            </TabPanel>

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
                            disablePadding
                            secondaryAction={
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                  <IconButton size="small" sx={{ color: m.mic ? "#fff" : "rgba(255,255,255,0.5)" }}>
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>

                                {/* Audience can DM Host; Host should NOT see message icon on own name */}
                                {!isHost && (
                                  <Tooltip title="Send Message">
                                    <IconButton
                                      size="small"
                                      sx={{ color: "#fff" }}
                                      onClick={() => handleOpenPrivateChat(m)}
                                    >
                                      <Badge
                                        variant="dot"
                                        color="error"
                                        overlap="circular"
                                        invisible={
                                          !privateUnreadByUserId[
                                          String(
                                            m.clientSpecificId ||
                                            m._raw?.clientSpecificId ||
                                            m._raw?.client_specific_id ||
                                            m._raw?.customParticipantId ||
                                            m.id
                                          )
                                          ] && !privateUnreadByUserId[String(m.id)]
                                        }
                                      >
                                        <ChatBubbleOutlineIcon fontSize="small" />
                                      </Badge>
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            }
                          >
                            <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1 }}>
                              <ListItemAvatar>
                                <Avatar src={m.picture} sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                  {initialsFromName(m.name)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{truncateDisplayName(m.name)}{isSelfMember(m) ? " (You)" : ""}</Typography>
                                    <Chip size="small" label="Host" sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                                  </Stack>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>

                  <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8 }}>
                        SPEAKERS ({groupedMembers.speakers.length})
                      </Typography>
                    </Stack>
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
                            disablePadding
                            secondaryAction={
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                {isHost && !isSelfMember(m) && (
                                  <>
                                    <Tooltip title="Force mute">
                                      <IconButton
                                        size="small"
                                        sx={{ color: "rgba(255,255,255,0.9)" }}
                                        onClick={() => forceMuteParticipant(m)}
                                      >
                                        <MicOffIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Turn camera off">
                                      <IconButton
                                        size="small"
                                        sx={{ color: "rgba(255,255,255,0.9)" }}
                                        onClick={() => forceCameraOffParticipant(m)}
                                      >
                                        <VideocamOffIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                  <Box sx={{ opacity: 0.9 }}>
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </Box>
                                </Tooltip>

                              </Stack>
                            }
                          >
                            <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1 }}>
                              <ListItemAvatar>
                                <Avatar src={m.picture} sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                  {initialsFromName(m.name)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{truncateDisplayName(m.name)}{isSelfMember(m) ? " (You)" : ""}</Typography>}
                                secondary={<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Speaker</Typography>}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>

                  <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8 }}>
                        AUDIENCE ({groupedMembers.audience.length})
                      </Typography>
                      {isHost && (
                        <Stack direction="row" spacing={0.75}>
                          <Tooltip title="Mute all">
                            <IconButton size="small" onClick={forceMuteAll} sx={{ color: "rgba(255,255,255,0.9)" }}>
                              <MicOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Camera off all">
                            <IconButton size="small" onClick={forceCameraOffAll} sx={{ color: "rgba(255,255,255,0.9)" }}>
                              <VideocamOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>
                    <Paper variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                      <List dense disablePadding>
                        {audienceMembersSorted.map((m, idx) => (
                          <ListItem
                            key={idx}
                            disablePadding
                            secondaryAction={
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                {isHost && !isSelfMember(m) && (
                                  <>
                                    <Tooltip title="Force mute">
                                      <IconButton
                                        size="small"
                                        sx={{ color: "rgba(255,255,255,0.9)" }}
                                        onClick={() => forceMuteParticipant(m)}
                                      >
                                        <MicOffIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Turn camera off">
                                      <IconButton
                                        size="small"
                                        sx={{ color: "rgba(255,255,255,0.9)" }}
                                        onClick={() => forceCameraOffParticipant(m)}
                                      >
                                        <VideocamOffIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                  <Box sx={{ opacity: 0.9 }}>
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </Box>
                                </Tooltip>

                                {/* --- NEW MESSAGE ICON --- */}
                                {!isSelfMember(m) && (
                                  <Tooltip title="Send Message">
                                    <IconButton size="small" sx={{ color: "#fff" }} onClick={() => handleOpenPrivateChat(m)}>
                                      <Badge
                                        variant="dot"
                                        color="error"
                                        overlap="circular"
                                        invisible={
                                          !privateUnreadByUserId[
                                          String(
                                            m.clientSpecificId ||
                                            m._raw?.clientSpecificId ||
                                            m._raw?.client_specific_id ||
                                            m._raw?.customParticipantId ||
                                            m.id
                                          )
                                          ] && !privateUnreadByUserId[String(m.id)]
                                        }
                                      >
                                        <ChatBubbleOutlineIcon fontSize="small" />
                                      </Badge>
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {/* ------------------------ */}

                              </Stack>
                            }
                          >
                            <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1 }}>
                              <ListItemAvatar>
                                <Avatar src={m.picture} sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                  {initialsFromName(m.name)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{truncateDisplayName(m.name)}{isSelfMember(m) ? " (You)" : ""}</Typography>}
                                secondary={<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Audience</Typography>}
                              />
                            </ListItemButton>
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

  // 2. Vertical Icon Rail (Right side)
  const SidebarIconRail = (
    <Box
      sx={{
        width: 70, // Fixed width for the rail
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 2.5,
        gap: 2.5,
        bgcolor: "rgba(0,0,0,0.3)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Chat Icon */}
      {hostPerms.chat && (
        <Tooltip title={tab === 0 && rightPanelOpen ? "Close Chat" : "Open Chat"} placement="left" arrow>
          <IconButton
            onClick={() => {
              if (rightPanelOpen && tab === 0) {
                if (isMdUp) setRightPanelOpen(false);
                else setRightOpen(false);
              } else {
                if (isMdUp) setRightPanelOpen(true);
                else setRightOpen(true);
                setTab(0);
                if (privateChatUser) setPrivateChatUser(null);
              }
            }}
            sx={{
              width: 44,
              height: 44,
              bgcolor: (!privateChatUser && tab === 0 && rightPanelOpen) ? "rgba(20,184,177,0.15)" : "transparent",
              color: (!privateChatUser && tab === 0 && rightPanelOpen) ? "#14b8b1" : "rgba(255,255,255,0.55)",
              border: (!privateChatUser && tab === 0 && rightPanelOpen) ? "1px solid rgba(20,184,177,0.3)" : "1px solid transparent",
              "&:hover": { bgcolor: "rgba(20,184,177,0.08)", color: "#fff" },
              transition: "all 0.2s",
            }}
          >
            <Badge variant="dot" color="error" invisible={!showChatDot}>
              <ChatBubbleOutlineIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      )}

      {/* Q&A Icon */}
      <Tooltip title={tab === 1 && rightPanelOpen ? "Close Q&A" : "Open Q&A"} placement="left" arrow>
        <IconButton
          onClick={() => {
            if (rightPanelOpen && tab === 1) {
              if (isMdUp) setRightPanelOpen(false);
              else setRightOpen(false);
            } else {
              if (isMdUp) setRightPanelOpen(true);
              else setRightOpen(true);
              setTab(1);
              if (privateChatUser) setPrivateChatUser(null);
            }
          }}
          sx={{
            width: 44,
            height: 44,
            bgcolor: (!privateChatUser && tab === 1 && rightPanelOpen) ? "rgba(20,184,177,0.15)" : "transparent",
            color: (!privateChatUser && tab === 1 && rightPanelOpen) ? "#14b8b1" : "rgba(255,255,255,0.55)",
            border: (!privateChatUser && tab === 1 && rightPanelOpen) ? "1px solid rgba(20,184,177,0.3)" : "1px solid transparent",
            "&:hover": { bgcolor: "rgba(20,184,177,0.08)", color: "#fff" },
            transition: "all 0.2s",
          }}
        >
          <Badge variant="dot" color="error" invisible={!(qnaUnreadCount > 0 && !isQnaActive)}>
            <QuestionAnswerIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Participants Icon */}
      <Tooltip title={tab === 3 && rightPanelOpen ? "Close Participants" : "Open Participants"} placement="left" arrow>
        <IconButton
          onClick={() => {
            if (rightPanelOpen && tab === 3) {
              if (isMdUp) setRightPanelOpen(false);
              else setRightOpen(false);
            } else {
              if (isMdUp) setRightPanelOpen(true);
              else setRightOpen(true);
              setTab(3);
              if (privateChatUser) setPrivateChatUser(null);
            }
          }}
          sx={{
            width: 44,
            height: 44,
            bgcolor: (!privateChatUser && tab === 3 && rightPanelOpen) ? "rgba(20,184,177,0.15)" : "transparent",
            color: (!privateChatUser && tab === 3 && rightPanelOpen) ? "#14b8b1" : "rgba(255,255,255,0.55)",
            border: (!privateChatUser && tab === 3 && rightPanelOpen) ? "1px solid rgba(20,184,177,0.3)" : "1px solid transparent",
            "&:hover": { bgcolor: "rgba(20,184,177,0.08)", color: "#fff" },
            transition: "all 0.2s",
          }}
        >
          <Badge variant="dot" color="error" invisible={!showMembersDot}>
            <GroupIcon />
          </Badge>
        </IconButton>
      </Tooltip>
    </Box>
  );

  const RightPanelContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "row", overflow: "hidden" }}>
      {SidebarMainContent}
      {SidebarIconRail}
    </Box>
  );

  if (loadingJoin) {
    return <JoiningMeetingScreen onBack={handleBack} />;
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
    return <JoiningMeetingScreen onBack={handleBack} />;
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

            <Tooltip title={isHost ? "Host permissions" : "My controls"}>
              <span>
                <IconButton
                  sx={headerIconBtnSx}
                  aria-label={isHost ? "Host permissions" : "My controls"}
                  onClick={openPermMenu}
                  disabled={!dyteMeeting?.self}
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
          {isHost ? (
            <>
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

              <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />
              <MenuItem disabled sx={{ fontWeight: 800, opacity: 0.9, fontSize: 12 }}>
                Host Device Controls
              </MenuItem>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

              <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <MicIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Microphone" secondary={micOn ? "On" : "Off"} />
                <Switch checked={micOn} onChange={handleToggleMic} />
              </MenuItem>

              <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <VideocamIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Camera" secondary={camOn ? "On" : "Off"} />
                <Switch checked={camOn} onChange={handleToggleCamera} />
              </MenuItem>

              <MenuItem onClick={() => { setShowDeviceSettings(true); closePermMenu(); }} sx={{ gap: 1.25, py: 1.1 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Choose Devices" secondary="Mic, camera & speakers" />
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem disabled sx={{ fontWeight: 800, opacity: 0.9 }}>
                My Controls
              </MenuItem>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

              <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <MicIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Microphone" secondary={micOn ? "On" : "Off"} />
                <Switch checked={micOn} onChange={handleToggleMic} />
              </MenuItem>

              <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <VideocamIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Camera" secondary={camOn ? "On" : "Off"} />
                <Switch checked={camOn} onChange={handleToggleCamera} />
              </MenuItem>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

              <MenuItem onClick={() => { setShowDeviceSettings(true); closePermMenu(); }} sx={{ gap: 1.25, py: 1.1 }}>
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Device Settings" secondary="Choose mic & camera" />
              </MenuItem>
            </>
          )}
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
                      src={pinnedRaw?.picture} // ✅ Use pinned host picture
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
                <Tooltip title="View all participants">
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
                    onClick={handleToggleMic}
                    aria-label="Toggle mic"
                  >
                    {micOn ? <MicIcon /> : <MicOffIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title={camOn ? "Turn camera off" : "Turn camera on"}>
                  <IconButton
                    onClick={handleToggleCamera}
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
                {isHost && (
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
                )}

                <Tooltip title={!hostPerms.chat ? "Chat disabled by host" : (isChatActive ? "Close Sidebar" : "Open Sidebar")}>
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
                      <Badge
                        variant="dot"
                        color="error"
                        overlap="circular"
                        invisible={!showAnyPanelDot}
                        anchorOrigin={{ vertical: "top", horizontal: "right" }}
                      >
                        <ChatBubbleOutlineIcon />
                      </Badge>
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Social Lounge">
                  <IconButton
                    onClick={() => setLoungeOpen(true)}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.06)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                      mx: 0.5
                    }}
                  >
                    <AutoAwesomeIcon />
                  </IconButton>
                </Tooltip>

                {isHost && (
                  <Tooltip title="Breakout Control">
                    <IconButton
                      onClick={() => setIsBreakoutControlsOpen(true)}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.06)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                        mx: 0.5,
                        color: "#ff9800"
                      }}
                    >
                      <ShuffleIcon />
                    </IconButton>
                  </Tooltip>
                )}

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
          {isMdUp && (
            <Box sx={{ display: "flex", flexDirection: "row", height: `calc(100vh - ${APPBAR_H}px)`, position: "sticky", top: APPBAR_H }}>
              {/* Content Panel (Collapsible) */}
              {rightPanelOpen && (
                <Box
                  sx={{
                    width: RIGHT_PANEL_W - 70, // 350px left for content
                    borderLeft: "1px solid rgba(255,255,255,0.08)",
                    bgcolor: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(10px)",
                    height: "100%",
                    overflow: "hidden",
                    // (optional) to match the “padded card” look:
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
                    {SidebarMainContent}
                  </Paper>
                </Box>
              )}

              {/* Icon Rail (Always Visible) */}
              <Box sx={{ height: "100%" }}>
                {SidebarIconRail}
              </Box>
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
            Participant Info
          </DialogTitle>

          <DialogContent sx={{ px: 2, pb: 2, pt: 1 }}>
            {selectedMember ? (
              <MemberInfoContent
                selectedMember={selectedMember}
                onClose={closeMemberInfo}
              />
            ) : (
              <Box sx={{ py: 4, textAlign: "center", opacity: 0.5 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* Device Settings Dialog */}
        <Dialog
          open={showDeviceSettings}
          onClose={() => setShowDeviceSettings(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "#0b101a",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 4,
              boxShadow: "0px 20px 40px rgba(0,0,0,0.6)",
              backdropFilter: "blur(14px)",
              color: "#fff",
              "& .MuiTypography-root": { color: "#fff" },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1, pt: 2, px: 2, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsIcon fontSize="small" />
            Device Settings
          </DialogTitle>

          <DialogContent sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2.5 }}>
            {deviceSwitchError && (
              <Alert severity="error" sx={{ bgcolor: "rgba(244,67,54,0.15)", border: "1px solid rgba(244,67,54,0.3)", color: "#ff6b6b" }}>
                <Typography variant="body2">{deviceSwitchError}</Typography>
              </Alert>
            )}

            {/* Microphone Selection */}
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <MicIcon fontSize="small" />
                Microphone
              </Typography>
              {audioDevices.length === 0 ? (
                <Typography sx={{ fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
                  No microphones found
                </Typography>
              ) : (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedAudioDeviceId}
                  onChange={(e) => switchAudioDevice(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(255,255,255,0.05)",
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" },
                      "&.Mui-focused fieldset": { borderColor: "rgba(20,184,177,0.4)" },
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  {audioDevices.map((device) => (
                    <MenuItem key={device.deviceId} value={device.deviceId} sx={{ color: "#000" }}>
                      <MicIcon sx={{ mr: 1.5, fontSize: 16, opacity: 0.7 }} />
                      {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            {/* Camera Selection */}
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <VideocamIcon fontSize="small" />
                Camera
              </Typography>
              {videoDevices.length === 0 ? (
                <Typography sx={{ fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
                  No cameras found
                </Typography>
              ) : (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedVideoDeviceId}
                  onChange={(e) => switchVideoDevice(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(255,255,255,0.05)",
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" },
                      "&.Mui-focused fieldset": { borderColor: "rgba(20,184,177,0.4)" },
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  {videoDevices.map((device) => (
                    <MenuItem key={device.deviceId} value={device.deviceId} sx={{ color: "#000" }}>
                      <VideocamIcon sx={{ mr: 1.5, fontSize: 16, opacity: 0.7 }} />
                      {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            {/* Speaker/Headphone Selection - Limited Support */}
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <VolumeUpIcon fontSize="small" />
                Speaker/Headphone
                <Chip label="Limited" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "rgba(255,152,0,0.2)", color: "#ffb74d" }} />
              </Typography>
              {audioOutputDevices.length === 0 ? (
                <Typography sx={{ fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
                  No audio output devices found or not supported
                </Typography>
              ) : (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedAudioOutputDeviceId}
                  onChange={(e) => switchAudioOutputDevice(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(255,255,255,0.05)",
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" },
                      "&.Mui-focused fieldset": { borderColor: "rgba(20,184,177,0.4)" },
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  {audioOutputDevices.map((device) => (
                    <MenuItem key={device.deviceId} value={device.deviceId} sx={{ color: "#000" }}>
                      <VolumeUpIcon sx={{ mr: 1.5, fontSize: 16, opacity: 0.7 }} />
                      {device.label || `Speaker ${audioOutputDevices.indexOf(device) + 1}`}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            {/* Info */}
            <Box sx={{ p: 1.5, bgcolor: "rgba(33,150,243,0.10)", border: "1px solid rgba(33,150,243,0.2)", borderRadius: 2 }}>
              <Typography sx={{ fontSize: 12, color: "rgba(100,200,255,0.9)", lineHeight: 1.5 }}>
                💡 <strong>Tip:</strong> Switching devices will smoothly transition without dropping your call. New audio/video settings will take effect immediately. Speaker/Headphone selection has limited browser support.
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 2, py: 2, gap: 1 }}>
            <Button
              onClick={() => setShowDeviceSettings(false)}
              variant="outlined"
              sx={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "#fff",
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.3)" },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <LoungeOverlay
        open={loungeOpen}
        onClose={() => setLoungeOpen(false)}
        eventId={eventId}
        currentUserId={getMyUserIdFromJwt()}
        isAdmin={isHost}
        dyteMeeting={dyteMeeting}
        onEnterBreakout={async (newToken, tableId, tableName) => {
          if (newToken) {
            console.log("[LiveMeeting] Transitioning to breakout room...");
            // Switch Breakouts Fix: If already in a breakout, leave it explicitly first
            if (isBreakout && dyteMeeting) {
              console.log("[LiveMeeting] Switching tables: Leaving current room explicitly...");
              ignoreRoomLeftRef.current = true;
              try {
                await dyteMeeting.leaveRoom();
              } catch (e) {
                console.warn("[LiveMeeting] Error leaving previous breakout:", e);
              }
              ignoreRoomLeftRef.current = false;
            }

            console.log("[LiveMeeting] New breakout token received");
            setIsBreakout(true);
            setAuthToken(newToken);
            if (tableId) {
              setActiveTableId(tableId);
              setActiveTableName(tableName || `Room ${tableId}`);
            }
          } else if (mainAuthTokenRef.current) {
            console.log("[LiveMeeting] Returning to main meeting...");

            // Leave Breakout Fix: Explicitly leave the breakout room
            if (dyteMeeting) {
              console.log("[LiveMeeting] Leaving breakout room explicitly...");
              ignoreRoomLeftRef.current = true;
              try {
                await dyteMeeting.leaveRoom();
              } catch (e) {
                console.warn("[LiveMeeting] Error leaving breakout:", e);
              }
              ignoreRoomLeftRef.current = false;
            }

            console.log("[LiveMeeting] Current state:", {
              isBreakout,
              hasMainToken: !!mainAuthTokenRef.current,
              currentAuthToken: authToken?.substring(0, 20) + "...",
              mainAuthToken: mainAuthTokenRef.current?.substring(0, 20) + "..."
            });
            // Wait a bit for cleanup to complete before switching tokens
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log("[LiveMeeting] Switching back to main token");
            setIsBreakout(false);
            setAuthToken(mainAuthTokenRef.current);
            setActiveTableId(null);
            setActiveTableName("");
            setRoomChatConversationId(null);
            console.log("[LiveMeeting] Successfully returned to main meeting");
          } else {
            console.warn("[LiveMeeting] No main token available to return to!");
          }
        }}
      />

      {/* ✅ Breakout Controls (Host Only) */}
      <BreakoutControls
        open={isBreakoutControlsOpen}
        onClose={() => setIsBreakoutControlsOpen(false)}
        onAction={(data) => {
          if (mainSocketRef.current?.readyState === WebSocket.OPEN) {
            mainSocketRef.current.send(JSON.stringify(data));
          }
        }}
        onlineCount={onlineUsers.length}
      />

      {/* ✅ Global Announcement Notification */}
      <Snackbar
        open={showBreakoutAnnouncement}
        autoHideDuration={6000}
        onClose={() => setShowBreakoutAnnouncement(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowBreakoutAnnouncement(false)}
          severity="info"
          variant="filled"
          sx={{ width: "100%", bgcolor: "#7b1fa2" }}
        >
          {breakoutAnnouncement}
        </Alert>
      </Snackbar>

      {/* ✅ Global Room Timer Display */}
      {breakoutTimer !== null && breakoutTimer > 0 && (
        <Box
          sx={{
            position: "fixed",
            top: 64,
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "rgba(0,0,0,0.8)",
            px: 2,
            py: 1,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            zIndex: 1400,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <AccessTimeRoundedIcon sx={{ color: breakoutTimer < 30 ? "#f44336" : "#4caf50" }} />
          <Typography variant="h6" fontWeight={700}>
            {Math.floor(breakoutTimer / 60)}:{(breakoutTimer % 60).toString().padStart(2, "0")}
          </Typography>
        </Box>
      )}
    </DyteProvider>

  );
}

// ✅ Separate sub-component to handle async friendship logic locally
function MemberInfoContent({ selectedMember, onClose }) {
  const [connStatus, setConnStatus] = useState("loading"); // "loading" | "none" | "friends" | "pending_outgoing" | "pending_incoming"
  const [connLoading, setConnLoading] = useState(false);
  const [profileInfo, setProfileInfo] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // 1. Check friendship status on mount
  useEffect(() => {
    let alive = true;
    const checkStatus = async () => {
      // Use DB ID if available, else Dyte ID (though friends API needs DB ID usually)
      const userId = selectedMember._raw?.customParticipantId || selectedMember.id;
      if (!userId) {
        if (alive) setConnStatus("none");
        return;
      }

      try {
        const res = await fetch(toApiUrl(`friends/status/?user_id=${userId}`), {
          headers: { ...authHeader() },
        });
        const d = await res.json().catch(() => ({}));
        if (alive) {
          // backend returning 'incoming_pending' etc.
          const map = { incoming_pending: "pending_incoming", outgoing_pending: "pending_outgoing" };
          const s = (map[d?.status] || d?.status || "none").toLowerCase();
          setConnStatus(s);
        }
      } catch (e) {
        if (alive) setConnStatus("none");
      }
    };
    checkStatus();
    return () => { alive = false; };
  }, [selectedMember]);

  // 1b. Fetch profile info for job title/company/location
  useEffect(() => {
    let alive = true;
    const userId = selectedMember?._raw?.customParticipantId || selectedMember?.id;
    if (!userId) {
      setProfileInfo(null);
      setProfileLoading(false);
      return () => { };
    }

    const pickLocation = (data) => {
      const profile = data?.profile || data?.user?.profile || {};
      const city = profile.city || data?.city || data?.user?.city || "";
      const country = profile.country || data?.country || data?.user?.country || "";
      const joined = [city, country].filter(Boolean).join(", ");
      return profile.location || data?.location || joined || "";
    };

    const pickJobAndCompany = (data) => {
      const profile = data?.profile || data?.user?.profile || {};
      const jobTitle =
        profile.job_title ||
        profile.jobTitle ||
        data?.job_title ||
        data?.jobTitle ||
        data?.position_from_experience ||
        data?.user?.position_from_experience ||
        "";
      const company =
        profile.company ||
        profile.company_name ||
        profile.companyName ||
        data?.company ||
        data?.company_name ||
        data?.company_from_experience ||
        data?.user?.company_from_experience ||
        data?.organization ||
        "";
      return { jobTitle, company };
    };

    const pickFromExperiences = (data) => {
      const exps = Array.isArray(data?.experiences) ? data.experiences : [];
      if (!exps.length) return {};
      const sorted = [...exps].sort((a, b) => {
        const aCurrent = Boolean(a?.currently_work_here ?? a?.is_current);
        const bCurrent = Boolean(b?.currently_work_here ?? b?.is_current);
        if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
        const aStart = Date.parse(a?.start_date || a?.start || "") || 0;
        const bStart = Date.parse(b?.start_date || b?.start || "") || 0;
        return bStart - aStart;
      });
      const best = sorted[0] || {};
      return {
        jobTitle: best.position || best.title || "",
        company: best.company || best.community_name || best.organization || "",
        location: best.location || "",
      };
    };

    const fetchProfile = async () => {
      if (alive) setProfileLoading(true);
      const headers = { accept: "application/json", ...authHeader() };
      const urls = [
        toApiUrl(`users/${userId}/profile/`),
        toApiUrl(`profile/${userId}/`),
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const data = await res.json().catch(() => null);
          if (!alive || !data) break;

          const base = pickJobAndCompany(data);
          const fromExp = pickFromExperiences(data);
          const location = pickLocation(data) || fromExp.location || "";
          const jobTitle = base.jobTitle || fromExp.jobTitle || "";
          const company = base.company || fromExp.company || "";

          setProfileInfo({
            jobTitle: jobTitle || "",
            company: company || "",
            location: location || "",
          });
          break;
        } catch (e) {
          // try next URL
        }
      }
      if (alive) setProfileLoading(false);
    };

    setProfileInfo(null);
    fetchProfile();
    return () => {
      alive = false;
    };
  }, [selectedMember]);

  // 2. Send request
  const handleConnect = async () => {
    const userId = selectedMember._raw?.customParticipantId || selectedMember.id;
    if (!userId) return;

    setConnLoading(true);
    try {
      const res = await fetch(toApiUrl("friend-requests/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ to_user: Number(userId) }),
      });
      if (res.ok) {
        // success
        setConnStatus("pending_outgoing");
      } else {
        const msg = await res.text();
        console.error("Failed to send request:", msg);
        alert("Failed to send connection request.");
      }
    } catch (e) {
      console.error("Connect error:", e);
    } finally {
      setConnLoading(false);
    }
  };

  const raw = selectedMember?._raw || {};
  const rawMeta =
    raw.customParticipantData ||
    raw.customParticipant ||
    raw.customParticipantDetails ||
    raw.metadata ||
    raw.meta ||
    raw.user ||
    raw.profile ||
    {};
  let parsedMeta = {};
  if (typeof rawMeta === "string") {
    try {
      parsedMeta = JSON.parse(rawMeta);
    } catch {
      parsedMeta = {};
    }
  } else if (typeof rawMeta === "object" && rawMeta) {
    parsedMeta = rawMeta;
  }

  const profileMeta = parsedMeta.profile || parsedMeta.user || parsedMeta || {};
  const metaJobTitle =
    profileMeta.job_title ||
    profileMeta.jobTitle ||
    raw.job_title ||
    raw.jobTitle ||
    selectedMember.job_title ||
    "";
  const metaCompanyName =
    profileMeta.company ||
    profileMeta.company_name ||
    profileMeta.companyName ||
    raw.company ||
    raw.organization ||
    selectedMember.company ||
    "";
  const locationParts = [profileMeta.city, profileMeta.country].filter(Boolean);
  const metaLocationLabel =
    profileMeta.location ||
    raw.location ||
    (locationParts.length ? locationParts.join(", ") : "") ||
    "";

  const jobTitle = profileInfo?.jobTitle || metaJobTitle || "";
  const companyName = profileInfo?.company || metaCompanyName || "";
  const locationLabel = profileInfo?.location || metaLocationLabel || "";

  const hasProfileInfo = Boolean(jobTitle || companyName || locationLabel);

  const userId = selectedMember?._raw?.customParticipantId || selectedMember?.id;
  const profileLink = `/community/rich-profile/${userId}`;

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* 1. Avatar Section with Crown Badge */}
      <Box sx={{ position: "relative", mb: 1.5 }}>
        <Avatar
          src={selectedMember.picture} // ✅ Use real picture
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

      {/* 4. Profile Details (under role chip) */}
      {(hasProfileInfo || profileLoading) && (
        <Box sx={{ mt: 2, textAlign: "center", width: "100%" }}>
          {hasProfileInfo ? (
            <>
              {jobTitle && (
                <Typography sx={{ fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.95)" }}>
                  {jobTitle}
                </Typography>
              )}
              {companyName && (
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  {companyName}
                </Typography>
              )}
              {locationLabel && (
                <Stack
                  direction="row"
                  spacing={0.6}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ mt: 1 }}
                >
                  <LocationOnOutlinedIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.7)" }} />
                  <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                    {locationLabel}
                  </Typography>
                </Stack>
              )}
            </>
          ) : (
            <>
              <Skeleton
                variant="text"
                width={120}
                height={20}
                sx={{ bgcolor: "rgba(255,255,255,0.12)", mx: "auto" }}
              />
              <Skeleton
                variant="text"
                width={90}
                height={18}
                sx={{ bgcolor: "rgba(255,255,255,0.10)", mx: "auto", mt: 0.5 }}
              />
              <Skeleton
                variant="text"
                width={140}
                height={18}
                sx={{ bgcolor: "rgba(255,255,255,0.10)", mx: "auto", mt: 0.8 }}
              />
            </>
          )}
        </Box>
      )}


      {/* 5. Actions: View Profile + Connect */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 3, width: "100%" }}>
        {/* View Profile */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Box component="span" sx={{ fontSize: 18, display: "flex" }}>👤</Box>}
          onClick={() => {
            window.open(profileLink, "_blank");
          }}
          sx={{
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

        {/* Connect Button */}
        {connStatus === "none" && (
          <Button
            fullWidth
            variant="contained"
            disabled={connLoading}
            onClick={handleConnect}
            startIcon={<PersonAddAlt1RoundedIcon />}
            sx={{
              py: 1.5,
              borderRadius: 3,
              bgcolor: "#14b8b1",
              color: "#fff",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 14,
              "&:hover": { bgcolor: "#0e8e88" },
            }}
          >
            {connLoading ? "Sending..." : "Connect"}
          </Button>
        )}

        {connStatus === "pending_outgoing" && (
          <Button
            fullWidth
            disabled
            variant="contained"
            sx={{
              py: 1.5,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.1) !important",
              color: "rgba(255,255,255,0.5) !important",
              textTransform: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Request Sent
          </Button>
        )}

        {connStatus === "friends" && (
          <Button
            fullWidth
            disabled
            variant="outlined"
            startIcon={<CheckRoundedIcon />}
            sx={{
              py: 1.5,
              borderRadius: 3,
              borderColor: "rgba(20,184,177,0.5) !important",
              color: "#14b8b1 !important",
              textTransform: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Connected
          </Button>
        )}
      </Stack>
    </Box>
  );
}
