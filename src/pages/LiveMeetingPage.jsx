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
  SvgIcon,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
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
import LogoutIcon from "@mui/icons-material/Logout"; // <--- ADDED for Leave Table
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AnnouncementIcon from "@mui/icons-material/Announcement"; // ✅ NEW for waiting room announcements
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded"; // <--- ADDED
import CheckRoundedIcon from "@mui/icons-material/CheckRounded"; // <--- ADDED
import ShuffleIcon from "@mui/icons-material/Shuffle"; // Keep this if used elsewhere
import Diversity3Icon from "@mui/icons-material/Diversity3"; // New icon for Networking
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";

import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";

import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";

import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDyteClient, DyteProvider } from "@dytesdk/react-web-core";

import { DyteParticipantsAudio } from "@dytesdk/react-ui-kit";
import LoungeOverlay from "../components/lounge/LoungeOverlay.jsx";
import BreakoutControls from "../components/lounge/BreakoutControls.jsx";
import MainRoomPeek from "../components/lounge/MainRoomPeek.jsx";
import PostEventLoungeScreen from "../components/lounge/PostEventLoungeScreen.jsx";
import SpeedNetworkingZone from "../components/speed-networking/SpeedNetworkingZone.jsx";
import BannedParticipantsDialog from "../components/live-meeting/BannedParticipantsDialog.jsx";
import WaitingRoomAnnouncements from "../components/live-meeting/WaitingRoomAnnouncements.jsx";
import WaitingRoomControls from "../components/live-meeting/WaitingRoomControls.jsx";
import { cognitoRefreshSession } from "../utils/cognitoAuth.js";
import { getRefreshToken } from "../utils/api.js";
import { getUserName } from "../utils/authStorage.js";
import { isPreEventLoungeOpen } from "../utils/gracePeriodUtils.js";
import { useSecondTick } from "../utils/useGracePeriodTimer";

// ================ Custom Lounge Icon ================
const SocialLoungeIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    {/* Horizontal Sofa/Couch - Large Bold Design */}

    {/* Left arm */}
    <rect x="2" y="8" width="2.2" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

    {/* Right arm */}
    <rect x="19.8" y="8" width="2.2" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

    {/* Main seat - horizontal line */}
    <line x1="4.2" y1="13.5" x2="19.8" y2="13.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

    {/* Backrest - curved line */}
    <path d="M 4.2 8 Q 12 4.5 19.8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

    {/* Seat cushion dividers */}
    <line x1="8.5" y1="13.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="12" y1="13.5" x2="12" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="15.5" y1="13.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />

    {/* Front legs - left */}
    <line x1="4.5" y1="15.5" x2="4.5" y2="18.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />

    {/* Front legs - right */}
    <line x1="19.5" y1="15.5" x2="19.5" y2="18.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </SvgIcon>
);

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
    raw.clientSpecificId ??
    raw.client_specific_id ??
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


function ParticipantVideo({ participant, meeting, isSelf = false, expectedUserId = null }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !participant || !meeting) return;

    console.log(
      "[ParticipantVideo] Registering participant:",
      participant?.id,
      "(",
      participant?.name,
      ")",
      "isSelf:",
      isSelf
    );

    let cleanup = () => { };

    // Always set these (helps iOS/Safari)
    el.autoplay = true;
    el.playsInline = true;
    el.muted = true; // always mute video elements; audio comes from DyteParticipantsAudio

    // Track ownership verification
    if (expectedUserId && !isSelf) {
      const participantUserId = getParticipantUserKey(participant);
      const expectedKey = `id:${expectedUserId}`;

      if (participantUserId && participantUserId !== expectedKey) {
        console.warn(
          `[ParticipantVideo] Mismatch! Expected ${expectedKey}, got ${participantUserId}`
        );
        return () => { }; // Don't bind
      }

      console.log(`[ParticipantVideo] Verified: ${participantUserId}`);
    }

    try {
      // ✅ BEST for self (official API on meeting.self)
      if (isSelf && typeof meeting.self?.registerVideoElement === "function") {
        console.log("[ParticipantVideo] Using meeting.self.registerVideoElement");
        meeting.self.registerVideoElement(el);
        cleanup = () => {
          console.log(
            "[ParticipantVideo] Deregistering self video element"
          );
          meeting.self?.deregisterVideoElement?.(el);
        };
      }
      // ✅ Some SDK versions expose registerVideoElement on participant too
      else if (typeof participant.registerVideoElement === "function") {
        console.log(
          "[ParticipantVideo] Using participant.registerVideoElement for",
          participant?.name,
          "videoEnabled:",
          participant.videoEnabled
        );
        participant.registerVideoElement(el);
        cleanup = () => {
          console.log(
            "[ParticipantVideo] Deregistering participant video element for",
            participant?.name
          );
          participant.deregisterVideoElement?.(el);
        };
      }
      // ✅ Fallback: use videoTrack style APIs if available
      else {
        const track = participant.videoTrack || participant.video;
        if (track?.play) {
          console.log("[ParticipantVideo] Using track.play for", participant?.name);
          track.play(el);
          cleanup = () => {
            console.log("[ParticipantVideo] Stopping track for", participant?.name);
            track.stop?.(el);
          };
        } else if (track?.attach) {
          console.log("[ParticipantVideo] Using track.attach for", participant?.name);
          track.attach(el);
          cleanup = () => {
            console.log(
              "[ParticipantVideo] Detaching track for",
              participant?.name
            );
            track.detach?.(el);
          };
        } else {
          console.warn(
            "[ParticipantVideo] No video track available for",
            participant?.name,
            "Participant object keys:",
            Object.keys(participant || {}).join(", ")
          );
        }
      }
    } catch (e) {
      console.warn("[LiveMeeting] attach video failed:", e);
    }

    return () => {
      console.log(
        "[ParticipantVideo] Cleanup for participant:",
        participant?.id,
        "(",
        participant?.name,
        ")"
      );
      try { cleanup(); } catch { }
    };
  }, [participant, meeting, isSelf, expectedUserId]);

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

// ✅ Common Modern Modal Style
const MODAL_PAPER_PROPS = {
  sx: {
    bgcolor: "#0b101a",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 4,
    boxShadow: "0px 20px 40px rgba(0,0,0,0.6)",
    backdropFilter: "blur(14px)",
    color: "#fff",
    "& .MuiTypography-root": { color: "#fff" },
  },
};



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
    <Tooltip title={""} arrow placement="top">
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
  waitingRoomImage = null,
  timezone = null,
  loungeAvailable = false,
  onOpenLounge,
  loungeStatusLabel = "",
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
        {/* Icon circle or waiting room image */}
        {waitingRoomImage ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: 400,
              height: 250,
              mx: "auto",
              mb: 2,
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <img
              src={waitingRoomImage}
              alt="Waiting room"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        ) : (
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
        )}

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
              {timezone && (
                <Typography
                  component="span"
                  sx={{ fontSize: 11, color: "rgba(255,255,255,0.65)", ml: 0.5 }}
                >
                  ({timezone})
                </Typography>
              )}
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

        {loungeAvailable && (
          <Button
            onClick={onOpenLounge}
            variant="outlined"
            sx={{
              mt: 2.2,
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
            Open Social Lounge {loungeStatusLabel ? `• ${loungeStatusLabel}` : ""}
          </Button>
        )}

        {onBack && (
          <Button
            onClick={onBack}
            variant="outlined"
            sx={{
              mt: loungeAvailable ? 1.5 : 2.5,
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

function PreEventLoungeGate({
  onBack,
  eventTitle = "Live Meeting",
  scheduled = "--",
  duration = "--",
  roleLabel = "Audience",
  waitingRoomImage = null,
  timezone = null,
  loungeAvailable = false,
  onOpenLounge,
  loungeStatusLabel = "",
  isLoungeOpen = true,
  onJoinMain,
  isHost = false,
  onHostChooseLounge,
  hostChoiceDialogOpen = false,
  pendingHostChoice = null,
  onConfirmHostChoice,
  onCancelHostChoice,
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
        {/* Icon circle or waiting room image */}
        {waitingRoomImage ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: 400,
              height: 250,
              mx: "auto",
              mb: 2,
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <img
              src={waitingRoomImage}
              alt="Social lounge"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        ) : (
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
        )}

        <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.8, color: "rgba(255,255,255,0.92)" }}>
          {isHost
            ? "Choose Your Entry Point"
            : (isLoungeOpen ? "Social Lounge is open" : "Social Lounge is closed")
          }
        </Typography>

        {!isLoungeOpen && (
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              bgcolor: "rgba(245, 124, 0, 0.12)",
              border: "1px solid rgba(245, 124, 0, 0.3)",
              color: "rgba(255, 193, 7, 0.95)",
              "& .MuiAlert-icon": {
                color: "rgba(255, 193, 7, 0.95)",
              },
            }}
          >
            The Social Lounge is closed. You should join the main meeting now.
          </Alert>
        )}

        <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)", mb: 2 }}>
          {isHost
            ? "As the host, you can join the main meeting to start the event, or mingle in the Social Lounge with early attendees."
            : (isLoungeOpen
                ? "Join the Social Lounge now. You'll move into the main meeting automatically when the event begins."
                : "The Social Lounge is closed. Please join the main meeting instead.")
          }
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
              {timezone && (
                <Typography
                  component="span"
                  sx={{ fontSize: 11, color: "rgba(255,255,255,0.65)", ml: 0.5 }}
                >
                  ({timezone})
                </Typography>
              )}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Duration</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {duration}
            </Typography>
          </Stack>
        </Box>

        {/* Action Buttons - Conditional based on role */}
        {isHost ? (
          // Host-specific UI
          <>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                mt: 2.5,
                mb: 1.5,
                textAlign: "center",
              }}
            >
              Choose how you want to join:
            </Typography>

            <Button
              onClick={onJoinMain}
              variant="contained"
              fullWidth
              sx={{
                mb: 1.5,
                px: 3,
                py: 1.5,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 800,
                letterSpacing: 0.4,
                bgcolor: "#10b8a6",
                "&:hover": { bgcolor: "#0ea5a4" },
              }}
            >
              Join as Host (Main Meeting)
            </Button>

            {loungeAvailable && isLoungeOpen && (
              <Button
                onClick={onHostChooseLounge}
                variant="outlined"
                fullWidth
                sx={{
                  mb: 1.5,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  color: "rgba(255,255,255,0.92)",
                  borderColor: "rgba(255,255,255,0.28)",
                  bgcolor: "rgba(255,255,255,0.06)",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.10)",
                    borderColor: "rgba(255,255,255,0.40)",
                  },
                }}
              >
                Join Social Lounge {loungeStatusLabel ? `• ${loungeStatusLabel}` : ""}
              </Button>
            )}
          </>
        ) : (
          // Audience UI (existing behavior)
          <>
            {isLoungeOpen && loungeAvailable && (
              <Button
                onClick={onOpenLounge}
                variant="outlined"
                sx={{
                  mt: 2.2,
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
                Open Social Lounge {loungeStatusLabel ? `• ${loungeStatusLabel}` : ""}
              </Button>
            )}

            {!isLoungeOpen && onJoinMain && (
              <Button
                onClick={onJoinMain}
                variant="contained"
                sx={{
                  mt: 2.2,
                  px: 3,
                  py: 1,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  bgcolor: "#10b8a6",
                  "&:hover": { bgcolor: "#0ea5a4" },
                }}
              >
                Join Main Meeting
              </Button>
            )}
          </>
        )}

        {/* Back button - always show */}
        {onBack && (
          <Button
            onClick={onBack}
            variant="outlined"
            sx={{
              mt: isHost ? 1.5 : (loungeAvailable ? 1.5 : 2.5),
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

      {/* Host Choice Confirmation Dialog */}
      <Dialog
        open={hostChoiceDialogOpen && isHost}
        onClose={onCancelHostChoice}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: 18,
            color: "rgba(255,255,255,0.92)",
            pb: 1,
          }}
        >
          {pendingHostChoice === "main"
            ? "Join as Host (Main Meeting)"
            : "Join Social Lounge"}
        </DialogTitle>

        <DialogContent
          sx={{
            color: "rgba(255,255,255,0.75)",
            py: 2,
          }}
        >
          <Typography sx={{ fontSize: 14, mb: 1 }}>
            {pendingHostChoice === "main"
              ? "You are about to join the main meeting as host. You'll have full control over the event settings and participant permissions."
              : "You are about to join the social lounge. You can mingle with early attendees and switch between lounge tables. You can join the main meeting later."}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)", mt: 2 }}>
            {pendingHostChoice === "main"
              ? "This will initialize the main meeting connection."
              : "This will NOT initialize the main meeting. The main meeting will remain isolated until you explicitly join it later."}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            gap: 1,
            p: 2,
            pt: 1,
          }}
        >
          <Button
            onClick={onCancelHostChoice}
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              borderColor: "rgba(255,255,255,0.28)",
              bgcolor: "rgba(255,255,255,0.06)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.10)",
                borderColor: "rgba(255,255,255,0.40)",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={onConfirmHostChoice}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 800,
              bgcolor: pendingHostChoice === "main" ? "#10b8a6" : "#8b5cf6",
              "&:hover": {
                bgcolor: pendingHostChoice === "main" ? "#0ea5a4" : "#7c3aed",
              },
            }}
          >
            {pendingHostChoice === "main" ? "Join as Host" : "Join Lounge"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
function WaitingRoomScreen({
  onBack,
  eventTitle = "Live Meeting",
  scheduled = "--",
  duration = "--",
  roleLabel = "Audience",
  waitingRoomImage = null,
  timezone = null,
  loungeAvailable = false,
  onOpenLounge,
  loungeStatusLabel = "",
  isHost = false,
  eventId = null,
  waitingCount = 0,
  announcementsRef = null,
}) {
  // ✅ NEW: Initialize announcements component
  const announcementHelper = WaitingRoomAnnouncements({});

  // Store reference for parent to use
  useEffect(() => {
    if (announcementsRef) {
      announcementsRef.current = announcementHelper;
    }
  }, [announcementHelper, announcementsRef]);

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
        {waitingRoomImage ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: 400,
              height: 250,
              mx: "auto",
              mb: 2,
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <img
              src={waitingRoomImage}
              alt="Waiting room"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        ) : (
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
        )}

        <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.8, color: "rgba(255,255,255,0.92)" }}>
          Waiting for host admission
        </Typography>
        <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)", mb: 2 }}>
          You are in the waiting room. You'll be admitted when the host is ready.
        </Typography>

        {/* ✅ NEW: Display waiting room announcements */}
        {announcementHelper && (
          <Box sx={{ mb: 2 }}>
            {announcementHelper.AnnouncementsUI}
          </Box>
        )}

        {/* ✅ NEW: Host announcement controls */}
        {isHost && eventId && (
          <Box sx={{ mb: 2 }}>
            <WaitingRoomControls
              eventId={eventId}
              waitingCount={waitingCount}
              onAnnounce={(result) => {
                console.log(`[WaitingRoom] Announcement sent to ${result.recipients} participants`);
              }}
              onError={(error) => {
                console.error("[WaitingRoom] Failed to send announcement:", error);
              }}
            />
          </Box>
        )}

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
              {timezone && (
                <Typography
                  component="span"
                  sx={{ fontSize: 11, color: "rgba(255,255,255,0.65)", ml: 0.5 }}
                >
                  ({timezone})
                </Typography>
              )}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Duration</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {duration}
            </Typography>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
          <CircularProgress size={22} sx={{ color: "rgba(255,255,255,0.70)" }} />
          <Typography sx={{ fontWeight: 700, letterSpacing: 0.2, color: "rgba(255,255,255,0.80)" }}>
            Waiting...
          </Typography>
        </Stack>

        {loungeAvailable && (
          <Button
            onClick={onOpenLounge}
            variant="outlined"
            sx={{
              mt: 2.2,
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
            Open Social Lounge {loungeStatusLabel ? `• ${loungeStatusLabel}` : ""}
          </Button>
        )}

        {onBack && (
          <Button
            onClick={onBack}
            variant="outlined"
            sx={{
              mt: loungeAvailable ? 1.5 : 2.5,
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

      <Typography sx={{ mt: 3, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
        You can network in the Social Lounge while you wait.
      </Typography>
    </Box>
  );
}



export default function NewLiveMeeting() {
  // ✅ Global Snackbar State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info", // "error" | "warning" | "info" | "success"
    onClick: null,
  });

  const showSnackbar = (message, severity = "info", options = {}) => {
    setSnackbar({ open: true, message, severity, onClick: options?.onClick || null });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (event?.stopPropagation) event.stopPropagation();
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false, onClick: null }));
  };

  const handleSnackbarClick = () => {
    if (typeof snackbar.onClick === "function") {
      snackbar.onClick();
      setSnackbar((prev) => ({ ...prev, open: false, onClick: null }));
    }
  };

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
  const [quickSwitchAnchorEl, setQuickSwitchAnchorEl] = useState(null);
  const quickSwitchOpen = Boolean(quickSwitchAnchorEl);

  const openPermMenu = (e) => setPermAnchorEl(e.currentTarget);
  const closePermMenu = () => setPermAnchorEl(null);
  const openQuickSwitchMenu = (e) => setQuickSwitchAnchorEl(e.currentTarget);
  const closeQuickSwitchMenu = () => setQuickSwitchAnchorEl(null);

  // ✅ Breakout Orchestration State
  const [breakoutTimer, setBreakoutTimer] = useState(null);
  const [breakoutAnnouncement, setBreakoutAnnouncement] = useState("");
  const [showBreakoutAnnouncement, setShowBreakoutAnnouncement] = useState(false);

  // ✅ NEW: Waiting Room Announcements State
  const waitingRoomAnnouncementsRef = useRef(null);

  // Participant Menu (Kick/Ban)
  const [participantMenuAnchor, setParticipantMenuAnchor] = useState(null);
  const [participantMenuTarget, setParticipantMenuTarget] = useState(null);
  const [bannedDialogOpen, setBannedDialogOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  // Custom Confirmation State
  const [kickConfirmOpen, setKickConfirmOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [actionTargetUser, setActionTargetUser] = useState(null);

  const [isBreakoutControlsOpen, setIsBreakoutControlsOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [serverDebugMessage, setServerDebugMessage] = useState("");
  const [speedNetworkingActive, setSpeedNetworkingActive] = useState(false);
  const [speedNetworkingRound, setSpeedNetworkingRound] = useState(0);
  const [speedNetworkingTotalRounds, setSpeedNetworkingTotalRounds] = useState(0);
  const [speedNetworkingDurationMinutes, setSpeedNetworkingDurationMinutes] = useState(0);
  const mainSocketRef = useRef(null);
  const lastLoungeFetchRef = useRef(0);
  const speedNetworkingTimeoutRef = useRef(null);

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

  // ✅ Proactive Token Refresh: Keep Cognito tokens alive during live meeting
  // This prevents auto-logout due to token expiration during long meetings
  useEffect(() => {
    const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // Refresh every 15 minutes (Cognito tokens are typically 1 hour)

    const refreshTokenProactively = async () => {
      try {
        const refreshToken = getRefreshToken();
        let username = getUserName();

        // Fallback: Try getting username from localStorage 'user' object
        if (!username) {
          try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            username = u.username || u.email || "";
          } catch { }
        }

        if (!refreshToken || !username) {
          console.log("[LiveMeeting] Cannot refresh token: missing refresh token or username");
          return;
        }

        console.log("[LiveMeeting] Proactively refreshing Cognito token...");

        const { idToken, refreshToken: newRefresh } = await cognitoRefreshSession({
          username,
          refreshToken,
        });

        // Update localStorage with new tokens
        localStorage.setItem("access_token", idToken);
        if (newRefresh) {
          localStorage.setItem("refresh_token", newRefresh);
        }

        console.log("[LiveMeeting] Token refresh successful! Next refresh in 15 minutes.");
      } catch (error) {
        console.error("[LiveMeeting] Token refresh failed:", error);
        // If refresh fails, user will be redirected on next API call
      }
    };

    // Refresh immediately on mount, then refresh every 15 minutes
    refreshTokenProactively();
    const refreshInterval = setInterval(refreshTokenProactively, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, []);

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
  const [showSpeedNetworking, setShowSpeedNetworking] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [isPostEventLounge, setIsPostEventLounge] = useState(false); // ✅ Track post-event lounge mode
  const [postEventLoungeClosingTime, setPostEventLoungeClosingTime] = useState(null); // ✅ Track closing time
  const [waitingRoomActive, setWaitingRoomActive] = useState(false);
  const [waitingRoomStatus, setWaitingRoomStatus] = useState("waiting");
  const [waitingRoomLoungeAllowed, setWaitingRoomLoungeAllowed] = useState(false);
  const [waitingRoomNetworkingAllowed, setWaitingRoomNetworkingAllowed] = useState(false);
  const [waitingRoomQueueCount, setWaitingRoomQueueCount] = useState(0);
  const [waitingRoomQueue, setWaitingRoomQueue] = useState([]);
  const waitingRoomPrevCountRef = useRef(0);
  const waitingSectionRef = useRef(null);
  const [pendingWaitFocus, setPendingWaitFocus] = useState(false);

  // ✅ NEW: Announcement Dialog State
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSending, setAnnouncementSending] = useState(false);
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
  // ✅ Store user's preferred media state to preserve across room switches
  const userMediaPreferenceRef = useRef({ mic: true, cam: false });
  // ✅ Store local audio/video streams to stop them when needed
  const localAudioStreamRef = useRef(null);
  const localVideoStreamRef = useRef(null);

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

  const openMemberInfo = useCallback((member) => {
    setSelectedMember(member);
    setMemberInfoOpen(true);
  }, []);

  const closeMemberInfo = useCallback(() => {
    setMemberInfoOpen(false);
    setSelectedMember(null);
  }, []);

  const openLoungeParticipantInfo = useCallback(
    (participant) => {
      if (!participant) return;
      const userId =
        participant.user_id ||
        participant.userId ||
        participant.id ||
        participant.uid ||
        participant.pk ||
        null;
      const name =
        participant.full_name ||
        participant.name ||
        participant.username ||
        "User";
      const picture =
        participant.avatar_url ||
        participant.user_image_url ||
        participant.user_image ||
        participant.avatar ||
        "";
      const roleLabel = String(participant.role || participant.user_role || "Audience");

      openMemberInfo({
        id: userId || participant.username || name,
        name,
        picture,
        role: roleLabel.toLowerCase().includes("host") ? "Host" : "Audience",
        job_title: participant.job_title || participant.title || participant.designation || "",
        company: participant.company || participant.organization || participant.company_name || "",
        location: participant.location || participant.city || participant.country || "",
        username: participant.username,
        _raw: { customParticipantId: userId || participant.user_id || participant.id || null },
      });
    },
    [openMemberInfo]
  );

  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preEventTick = useSecondTick();
  const eventFromState = location?.state?.event || null;

  // ---------- Old logic states (real) ----------
  const [eventId, setEventId] = useState(null);
  const [role, setRole] = useState("audience"); // 'publisher' | 'audience'
  const isHost = role === "publisher";

  const [authToken, setAuthToken] = useState("");
  const mainAuthTokenRef = useRef("");
  const joinRoomRetryRef = useRef(0);
  const tokenFetchInFlightRef = useRef(false);
  const initInFlightRef = useRef(false);
  const joinInFlightRef = useRef(false);
  const mainJoinInFlightRef = useRef(false);
  const lastInitTokenRef = useRef(null);
  const tokenFetchAbortControllerRef = useRef(null); // ✅ AbortController for cancelling in-flight token fetches
  const [joinMainRequested, setJoinMainRequested] = useState(false);
  const [hostChoiceMade, setHostChoiceMade] = useState(false);
  const [hostChoseLoungeOnly, setHostChoseLoungeOnly] = useState(false);
  const [hostChoiceDialogOpen, setHostChoiceDialogOpen] = useState(false);
  const [pendingHostChoice, setPendingHostChoice] = useState(null); // "main" or "lounge"
  const [loadingJoin, setLoadingJoin] = useState(true);
  const [joinError, setJoinError] = useState("");
  const [joinRequestTick, setJoinRequestTick] = useState(0);
  const [dbStatus, setDbStatus] = useState("draft");
  const [eventTitle, setEventTitle] = useState("Live Meeting");
  const [isBreakout, setIsBreakout] = useState(false);
  const [activeTableId, setActiveTableId] = useState(null);
  const activeTableIdRef = useRef(null); // ✅ Ref for socket access
  const [activeTableName, setActiveTableName] = useState("");
  const [activeTableLogoUrl, setActiveTableLogoUrl] = useState(""); // ✅ Store table logo
  const [eventData, setEventData] = useState(null); // ✅ Store full event data (images, timezone, etc.)
  const [loungeTables, setLoungeTables] = useState([]);
  const [loungeOpenStatus, setLoungeOpenStatus] = useState(null);
  const isLoungeCurrentlyOpen = loungeOpenStatus?.status === "OPEN";
  const isPreEventLoungeStatus = Boolean(loungeOpenStatus?.reason?.includes("Pre-event"));
  const loungeNextChangeTs = useMemo(() => {
    if (!loungeOpenStatus?.next_change) return null;
    const ts = new Date(loungeOpenStatus.next_change).getTime();
    return Number.isFinite(ts) ? ts : null;
  }, [loungeOpenStatus?.next_change]);
  const preEventLoungeOpen = useMemo(
    () => isPreEventLoungeOpen(eventData || eventFromState),
    [eventData, eventFromState, preEventTick]
  );

  const loungeOnlyTables = useMemo(() =>
    loungeTables.filter(t => t.category === 'LOUNGE' || !t.category),
    [loungeTables]
  );

  const breakoutOnlyTables = useMemo(() =>
    loungeTables.filter(t => t.category === 'BREAKOUT'),
    [loungeTables]
  );


  const [scheduledLabel, setScheduledLabel] = useState("--");
  const [durationLabel, setDurationLabel] = useState("--");

  // ---------- Dyte init ----------
  const [dyteMeeting, initMeeting] = useDyteClient();
  const [initDone, setInitDone] = useState(false);
  const selfPermissions = useDytePermissions(dyteMeeting);

  // Dual connection for main room peek
  const [mainDyteMeeting, initMainMeeting] = useDyteClient();
  const [mainRoomAuthToken, setMainRoomAuthToken] = useState(null);
  const [isInBreakoutRoom, setIsInBreakoutRoom] = useState(false);
  const isInBreakoutRoomRef = useRef(false); // ✅ Ref for socket access
  const leaveBreakoutInFlightRef = useRef(false);
  const preEventLoungeWasOpenRef = useRef(false);
  const preEventLoungePhaseRef = useRef(false);
  const fetchLoungeStateRef = useRef(null); // ✅ Ref to store fetchLoungeState for calling from handleLeaveBreakout

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
      const speakers = devices.filter((d) => d.kind === "audiooutput" && d.deviceId);

      setAudioDevices(audio);
      setVideoDevices(video);
      setAudioOutputDevices(speakers);

      // Set default devices if not already selected
      if (audio.length > 0 && !selectedAudioDeviceId) {
        setSelectedAudioDeviceId(audio[0].deviceId);
      }
      if (video.length > 0 && !selectedVideoDeviceId) {
        setSelectedVideoDeviceId(video[0].deviceId);
      }
      if (speakers.length > 0 && !selectedAudioOutputDeviceId) {
        setSelectedAudioOutputDeviceId(speakers[0].deviceId);
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

  // Device state reconciliation
  useEffect(() => {
    if (!dyteMeeting || !initDone) return;

    const reconcile = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some((d) => d.kind === "videoinput");
        const dyteEnabled = dyteMeeting.self?.videoEnabled || false;

        if (!hasVideo && dyteEnabled) {
          console.warn("[DeviceState] Mismatch: Video on but no cameras");
          await dyteMeeting.self.disableVideo();
          console.log("[DeviceState] Auto-disabled video");
        }

        console.log("[DeviceState]", { hasVideo, dyteEnabled });
      } catch (err) {
        console.error("[DeviceState] Reconciliation failed:", err);
      }
    };

    reconcile();

    const handler = () => reconcile();
    dyteMeeting.self.on("videoUpdate", handler);

    return () => {
      dyteMeeting.self.off("videoUpdate", handler);
    };
  }, [dyteMeeting, initDone]);

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

  const handleToggleMic = useCallback(async () => {
    if (!dyteMeeting?.self) return;

    try {
      if (dyteMeeting.self.audioEnabled) {
        console.log(
          "[LiveMeeting] 🔴 TOGGLING MIC OFF - isBreakout:",
          isBreakout,
          "Disabling audio...",
          "Current audioEnabled:",
          dyteMeeting.self.audioEnabled
        );
        // ✅ CRITICAL FIX: Save preference IMMEDIATELY to false, don't wait for SDK response
        userMediaPreferenceRef.current.mic = false;

        // ✅ NEW FIX FOR LOUNGE: Stop local audio stream to prevent any audio capture
        if (isBreakout) {
          console.log("[LiveMeeting LOUNGE] Stopping local audio stream...");
          try {
            if (localAudioStreamRef.current) {
              localAudioStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                console.log("[LiveMeeting LOUNGE] Audio track stopped:", track.kind);
              });
              localAudioStreamRef.current = null;
            }
          } catch (e) {
            console.warn("[LiveMeeting LOUNGE] Failed to stop local audio stream:", e);
          }
        }

        await dyteMeeting.self.disableAudio?.();

        // ✅ CRITICAL: Ensure audio track is fully muted at WebRTC level
        // This prevents any lingering audio transmission to other participants
        try {
          const audioSenders = dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
            (s) => s.track?.kind === "audio"
          ) || [];
          console.log(
            "[LiveMeeting] Found audio senders to disable:",
            audioSenders.length,
            "in",
            isBreakout ? "LOUNGE" : "MAIN ROOM"
          );
          for (const sender of audioSenders) {
            if (sender.track) {
              sender.track.enabled = false;
              console.log("[LiveMeeting] Audio track explicitly disabled at WebRTC level");
            }
          }
        } catch (e) {
          console.warn("[LiveMeeting] Failed to disable audio track at WebRTC level:", e);
        }

        // Give SDK time to update internal state
        await new Promise((r) => setTimeout(r, 100));
        const newState = Boolean(dyteMeeting.self.audioEnabled);
        console.log(
          "[LiveMeeting] 🔴 Audio disabled -",
          isBreakout ? "LOUNGE" : "MAIN",
          "- SDK reports audioEnabled:",
          newState,
          "preference stored as:",
          false
        );
        setMicOn(newState);
      } else {
        // ✅ CRITICAL FIX: Save preference IMMEDIATELY to true
        userMediaPreferenceRef.current.mic = true;

        // ✅ NEW FIX FOR LOUNGE: Re-establish local audio stream in lounge
        if (isBreakout) {
          console.log("[LiveMeeting LOUNGE] Re-establishing local audio stream...");
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localAudioStreamRef.current = stream;
            console.log("[LiveMeeting LOUNGE] Local audio stream established, tracks:", stream.getTracks().length);
          } catch (e) {
            console.warn("[LiveMeeting LOUNGE] Failed to get audio stream:", e);
          }
        } else {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
          } catch { }
        }

        console.log("[LiveMeeting] Enabling audio...");
        await dyteMeeting.self.enableAudio?.();

        // ✅ CRITICAL: Ensure audio track is fully enabled at WebRTC level
        try {
          const audioSenders = dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
            (s) => s.track?.kind === "audio"
          ) || [];
          for (const sender of audioSenders) {
            if (sender.track) {
              sender.track.enabled = true;
              console.log("[LiveMeeting] Audio track explicitly enabled at WebRTC level");
            }
          }
        } catch (e) {
          console.warn("[LiveMeeting] Failed to enable audio track at WebRTC level:", e);
        }

        // Give SDK time to update internal state
        await new Promise((r) => setTimeout(r, 100));
        const newState = Boolean(dyteMeeting.self.audioEnabled);
        setMicOn(newState);
      }
    } catch (e) {
      console.warn("[LiveMeeting] mic toggle failed:", e);
      const newState = Boolean(dyteMeeting?.self?.audioEnabled);
      setMicOn(newState);
      // ✅ Save to user preference ref
      userMediaPreferenceRef.current.mic = newState;
    }
  }, [dyteMeeting]);

  /**
   * Switch to a different video device
   * Uses Dyte's official SDK method setDevice for reliable switching
   */
  const switchVideoDevice = useCallback(async (deviceId) => {
    if (!deviceId || !dyteMeeting?.self) return;

    try {
      setDeviceSwitchError("");
      const videoDevice = videoDevices.find((d) => d.deviceId === deviceId);

      if (videoDevice) {
        console.log("[LiveMeeting] Switching video device to:", deviceId);
        // Use the official Dyte SDK method to switch device
        // This handles stopping old tracks and starting new ones internally
        await dyteMeeting.self.setDevice(videoDevice);

        setSelectedVideoDeviceId(deviceId);
      }
    } catch (err) {
      console.error("[LiveMeeting] Failed to switch video device:", err);
      setDeviceSwitchError("Failed to switch camera. Please try again.");
    }
  }, [dyteMeeting, videoDevices]);

  /**
   * Switch audio output device (speakers/headphones)
   * Note: Limited browser support - works on Chrome, Edge, some Firefox versions
   */
  const switchAudioOutputDevice = useCallback(async (deviceId) => {
    if (!deviceId) return;

    try {
      setDeviceSwitchError("");

      // 1. Check if browser supports setSinkId
      if (typeof HTMLMediaElement.prototype.setSinkId !== "function") {
        console.warn("[LiveMeeting] Audio output device selection not supported in this browser");
        setDeviceSwitchError(
          "Audio output device selection is limited in your browser. Please change your system default output."
        );
        setSelectedAudioOutputDeviceId(deviceId); // Optimistically update UI
        return;
      }

      // 2. Find all audio elements (Dyte renders multiple audio tags)
      const container = remoteAudioRef.current;
      if (!container) return;

      const audioElements = container.querySelectorAll("audio");
      const promises = [];

      for (const el of audioElements) {
        promises.push(el.setSinkId(deviceId));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        console.log(`[LiveMeeting] Switched output to ${deviceId} for ${promises.length} audio/video elements`);
      } else {
        console.log("[LiveMeeting] No audio elements found to switch yet (will apply to future participants automatically if Dyte supports it, otherwise reload needed)");
      }

      setSelectedAudioOutputDeviceId(deviceId);
    } catch (err) {
      const errMsg = `Failed to switch audio output device: ${err.message}`;
      console.error("[LiveMeeting]", errMsg);
      setDeviceSwitchError("Unable to switch output device. Please check your browser permissions.");
    }
  }, []);



  const handleToggleCamera = useCallback(async () => {
    if (!dyteMeeting?.self) return;

    try {
      // ✅ CRITICAL FIX: Use actual Dyte state, not local UI state
      if (dyteMeeting.self.videoEnabled) {
        console.log(
          "[LiveMeeting] 📹 TOGGLING CAMERA OFF - isBreakout:",
          isBreakout,
          "Disabling video...",
          "Current videoEnabled:",
          dyteMeeting.self.videoEnabled
        );
        // ✅ CRITICAL FIX: Save preference IMMEDIATELY to false, don't wait for SDK response
        userMediaPreferenceRef.current.cam = false;

        await dyteMeeting.self.disableVideo();

        // ✅ CRITICAL: Ensure video track is fully muted at WebRTC level
        // This prevents any lingering video transmission to other participants
        try {
          const videoSenders = dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
            (s) => s.track?.kind === "video"
          ) || [];
          console.log(
            "[LiveMeeting] Found video senders to disable:",
            videoSenders.length,
            "in",
            isBreakout ? "LOUNGE" : "MAIN ROOM"
          );
          for (const sender of videoSenders) {
            if (sender.track) {
              sender.track.enabled = false;
              console.log("[LiveMeeting] Video track explicitly disabled at WebRTC level");
            }
          }
        } catch (e) {
          console.warn("[LiveMeeting] Failed to disable video track at WebRTC level:", e);
        }

        // Give SDK time to update internal state
        await new Promise((r) => setTimeout(r, 100));
        const newState = Boolean(dyteMeeting.self.videoEnabled);
        console.log(
          "[LiveMeeting] 📹 Video disabled -",
          isBreakout ? "LOUNGE" : "MAIN",
          "- SDK reports videoEnabled:",
          newState,
          "preference stored as:",
          false
        );
        setCamOn(newState);
      } else {
        console.log("[LiveMeeting] Enabling video...");
        // ✅ CRITICAL FIX: Save preference IMMEDIATELY to true
        userMediaPreferenceRef.current.cam = true;

        await dyteMeeting.self.enableVideo();

        // ✅ CRITICAL: Ensure video track is fully enabled at WebRTC level
        try {
          const videoSenders = dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
            (s) => s.track?.kind === "video"
          ) || [];
          for (const sender of videoSenders) {
            if (sender.track) {
              sender.track.enabled = true;
              console.log("[LiveMeeting] Video track explicitly enabled at WebRTC level");
            }
          }
        } catch (e) {
          console.warn("[LiveMeeting] Failed to enable video track at WebRTC level:", e);
        }

        // Give SDK time to update internal state
        await new Promise((r) => setTimeout(r, 100));
        const newState = Boolean(dyteMeeting.self.videoEnabled);
        setCamOn(newState);
      }
    } catch (e) {
      console.error("[LiveMeeting] Failed to toggle camera:", e);
      // Sync UI state with actual Dyte state on error
      const newState = Boolean(dyteMeeting?.self?.videoEnabled);
      setCamOn(newState);
      // ✅ Save to user preference ref
      userMediaPreferenceRef.current.cam = newState;
    }
  }, [dyteMeeting]);

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
  const hostIdRef = useRef(null);
  const hostUserKeyRef = useRef(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const resolveTableName = useCallback(
    (tid) => {
      const table = loungeTables.find((t) => String(t.id) === String(tid));
      if (!table) return "";
      return table.name || `Room ${tid}`;
    },
    [loungeTables]
  );

  const applyBreakoutTokenRef = useRef(null);

  const applyBreakoutToken = useCallback(
    async (newToken, tableId, tableName, logoUrl) => {
      if (newToken) {
        console.log("[LiveMeeting] Transitioning to breakout room...");

        // 1. If currently in a meeting, leave it first
        if (dyteMeeting) {
          console.log("[LiveMeeting] Switching rooms: Leaving current room explicitly...");
          ignoreRoomLeftRef.current = true;
          try {
            await dyteMeeting.leaveRoom();
            // Clear video elements
            document.querySelectorAll("video").forEach((v) => {
              if (v.srcObject) v.srcObject = null;
            });
            // Wait a bit for SDK to clean up
            await new Promise((r) => setTimeout(r, 100));
          } catch (e) {
            console.warn("[LiveMeeting] Error leaving previous room:", e);
          }
          ignoreRoomLeftRef.current = false;
        }

        // 2. Clear state before re-initializing
        setAuthToken(null);
        setInitDone(false);
        setRoomJoined(false);
        joinedOnceRef.current = false;

        console.log("[LiveMeeting] Applying new breakout token");

        // Initialize main room connection if not already done (lazy init)
        if (mainRoomAuthToken && !mainDyteMeeting) {
          console.log("[LiveMeeting] Lazy-initializing main room connection for peek");
          try {
            await initMainMeeting({
              authToken: mainRoomAuthToken,
              defaults: {
                // Peek connection should be receive-only (never publish mic/cam)
                audio: false,
                video: false,
              },
            });
          } catch (e) {
            console.error("[LiveMeeting] Failed to initialize main room:", e);
          }
        }

        setIsBreakout(true);
        setLoungeOpen(true); // ✅ CRITICAL: Mark lounge as open so render condition works
        setAuthToken(newToken);
        if (tableId) {
          setActiveTableId(tableId);
          setActiveTableName(tableName || `Room ${tableId}`);
          setActiveTableLogoUrl(logoUrl || ""); // ✅ Store the logo URL
        }

        // Auto-switch to Room Chat (Tab 0) when entering breakout
        setTab(0);
        return;
      }

      if (mainAuthTokenRef.current) {
        console.log("[LiveMeeting] Returning to main meeting...");
        if (dyteMeeting) {
          console.log("[LiveMeeting] Leaving breakout room explicitly...");
          ignoreRoomLeftRef.current = true;
          try {
            await dyteMeeting.leaveRoom();
            // Clear video elements
            document.querySelectorAll("video").forEach((v) => {
              if (v.srcObject) v.srcObject = null;
            });
            await new Promise((r) => setTimeout(r, 100));
          } catch (e) {
            console.warn("[LiveMeeting] Error leaving breakout:", e);
          }
          ignoreRoomLeftRef.current = false;
        }

        console.log("[LiveMeeting] Resetting to main meeting state");
        setAuthToken(null);
        setInitDone(false);
        setRoomJoined(false);
        joinedOnceRef.current = false;

        setIsBreakout(false);
        setAuthToken(mainAuthTokenRef.current);
        setActiveTableId(null);
        setActiveTableName("");
        setActiveTableLogoUrl(""); // ✅ Clear logo when returning to main meeting
        setRoomChatConversationId(null);
        console.log("[LiveMeeting] Successfully returned to main meeting");

        // ✅ Force refresh of video subscriptions for all participants
        // This ensures all returned participants' streams are properly subscribed
        if (dyteMeeting && typeof dyteMeeting.participants?.videoSubscribed?.refresh === 'function') {
          console.log("[LiveMeeting] Forcing video stream refresh after returning to main");
          try {
            await dyteMeeting.participants.videoSubscribed.refresh();
            console.log("[LiveMeeting] Video streams refreshed successfully");
          } catch (e) {
            console.warn("[LiveMeeting] Video subscription refresh failed (non-critical):", e?.message);
          }
        }
      } else {
        console.warn("[LiveMeeting] No main token available to return to! Resetting state to re-join.");
        setIsBreakout(false);
        setAuthToken(null);
        setInitDone(false);
        setRoomJoined(false);
        joinedOnceRef.current = false;
        setActiveTableId(null);
        setActiveTableName("");
        setActiveTableLogoUrl("");
        setRoomChatConversationId(null);
      }
    },
    [dyteMeeting, isBreakout, mainRoomAuthToken, mainDyteMeeting, initMainMeeting]
  );

  // ✅ Keep refs in sync for WebSocket handlers to avoid stale closures
  useEffect(() => {
    isInBreakoutRoomRef.current = isInBreakoutRoom;
  }, [isInBreakoutRoom]);

  useEffect(() => {
    activeTableIdRef.current = activeTableId;
  }, [activeTableId]);

  useEffect(() => {
    applyBreakoutTokenRef.current = applyBreakoutToken;
  }, [applyBreakoutToken]);

  const handleEnterBreakout = async (tableId) => {
    if (!eventId || !tableId) return;

    // ✅ DEFENSIVE: Ensure we're NOT updating meeting status
    // Joining a lounge should NEVER trigger updateLiveStatus or change meeting state
    console.log("[LiveMeeting] Entering lounge table - current status:", dbStatus, "(should not change)");

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

          // ✅ CRITICAL: Assert we're not reactivating the meeting
          // This join is purely lounge-based, not meeting-based
          if (dbStatus === "live") {
            console.warn("[LiveMeeting] WARNING: Lounge join happening while meeting is live. This is unexpected.");
          }
          console.assert(
            dbStatus !== "live",
            "[CRITICAL] Lounge join should not happen while main meeting is live!"
          );

          const tableName = resolveTableName(tableId) || `Room ${tableId}`;
          // ✅ Get logo URL from loungeTables
          const table = loungeTables.find((t) => String(t.id) === String(tableId));
          const logoUrl = table?.icon_url || "";
          await applyBreakoutToken(data.token, tableId, tableName, logoUrl);
        }
      } else if (res.status === 403) {
        // ✅ NEW: Lounge is closed or not available
        const data = await res.json().catch(() => ({}));
        const reason = data.reason || "The lounge is currently closed";
        showSnackbar(reason, "warning");
        console.warn("[LiveMeeting] Lounge not available:", reason);
      } else if (res.status === 400) {
        // ✅ NEW: Check if backend detected meeting state corruption
        const data = await res.json().catch(() => ({}));
        if (data.error_code === "meeting_state_corrupted") {
          console.error("[LiveMeeting] Backend detected meeting state corruption!");
          showSnackbar("Meeting state error detected. Please refresh the page and try again.", "error");
        } else {
          console.error("[LiveMeeting] Failed to fetch breakout token:", res.status);
          showSnackbar("Failed to join table. Please try again.", "error");
        }
      } else {
        console.error("[LiveMeeting] Failed to fetch breakout token:", res.status);
        showSnackbar("Failed to join table. Please try again.", "error");
      }
    } catch (err) {
      console.error("[LiveMeeting] Failed to join breakout:", err);
      showSnackbar("Error joining table", "error");
    }
  };

  const handleOpenParticipantMenu = (event, member) => {
    setParticipantMenuAnchor(event.currentTarget);
    setParticipantMenuTarget(member);
  };

  const handleCloseParticipantMenu = () => {
    setParticipantMenuAnchor(null);
    setParticipantMenuTarget(null);
  };

  const handleKickParticipant = () => {
    const p = participantMenuTarget;
    handleCloseParticipantMenu();
    if (!p) return;
    setActionTargetUser(p);
    setKickConfirmOpen(true);
  };

  const executeKick = async () => {
    const p = actionTargetUser;
    if (!p) return;
    setKickConfirmOpen(false); // Close dialog

    console.log("[Kick] Target participant object:", p);

    let targetDjangoId = p.clientSpecificId || p._raw?.clientSpecificId || p.customParticipantId || p._raw?.customParticipantId;

    console.log("[Kick] Resolved targetDjangoId:", targetDjangoId);

    if (!targetDjangoId) {
      try {
        targetDjangoId = p.id;
        console.warn("[Kick] Warning: using Dyte ID as fallback:", targetDjangoId);
      } catch (e) { }
    }

    try {
      console.log(`[Kick] Sending POST to events/${eventId}/kick/ with user_id:`, targetDjangoId);
      const res = await fetch(toApiUrl(`events/${eventId}/kick/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ user_id: targetDjangoId })
      });

      console.log("[Kick] API Response status:", res.status);

      if (!res.ok) {
        const err = await res.json();
        console.error("[Kick] API Error:", err);
        alert(`Failed to kick: ${JSON.stringify(err)}`);
      } else {
        const data = await res.json();
        console.log("[Kick] Success:", data);
        if (dyteMeeting?.participants?.kick) {
          try {
            console.log("[Kick] Executing Dyte kick on:", p.id);
            dyteMeeting.participants.kick(p.id);
          } catch (e) { console.warn("Dyte kick failed", e); }
        }
        setParticipantMenuTarget(null);
      }
    } catch (e) {
      console.error("[Kick] Exception:", e);
      showSnackbar("Error kicking user: " + e.message, "error");
    }
  };

  const handleBanParticipant = () => {
    const p = participantMenuTarget;
    handleCloseParticipantMenu();
    if (!p) return;
    setActionTargetUser(p);
    setBanConfirmOpen(true);
  };

  const executeBan = async () => {
    const p = actionTargetUser;
    if (!p) return;
    setBanConfirmOpen(false); // Close dialog

    console.log("[Ban] Target participant object:", p);

    let targetDjangoId = p.clientSpecificId || p._raw?.clientSpecificId || p.customParticipantId || p._raw?.customParticipantId;

    console.log("[Ban] Resolved targetDjangoId:", targetDjangoId);

    if (!targetDjangoId) {
      targetDjangoId = p.id;
    }

    try {
      console.log(`[Ban] Sending POST to events/${eventId}/ban/ with user_id:`, targetDjangoId);
      const res = await fetch(toApiUrl(`events/${eventId}/ban/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ user_id: targetDjangoId })
      });

      console.log("[Ban] API Response status:", res.status);

      if (!res.ok) {
        const err = await res.json();
        console.error("[Ban] API Error:", err);
        alert(`Failed to ban: ${JSON.stringify(err)}`);
      } else {
        const data = await res.json();
        console.log("[Ban] Success:", data);
        if (dyteMeeting?.participants?.kick) {
          try {
            console.log("[Ban] Executing Dyte kick (for ban) on:", p.id);
            dyteMeeting.participants.kick(p.id);
          } catch (e) { console.warn("Dyte ban-kick failed", e); }
        }
      }
    } catch (e) {
      console.error("[Ban] Exception:", e);
      showSnackbar("Error banning user: " + e.message, "error");
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
          setEventData(data); // ✅ Store full event data for access to images and timezone
          if (data?.status) setDbStatus(data.status);
          if (data?.title) setEventTitle(data.title);
          if (data?.waiting_room_enabled === false) {
            setWaitingRoomActive(false);
          }
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
    if (role !== "publisher" && !eventData && !eventFromState) return;
    if (waitingRoomActive) {
      console.log("[LiveMeeting] Skipping token fetch - user is in waiting room");
      return;
    }
    if (preEventLoungeOpen && !joinMainRequested &&
        (role !== "publisher" || !hostChoiceMade || hostChoseLoungeOnly)) {
      // ✅ Log when skipping token fetch due to pre-event lounge
      if (!joinInFlightRef.current) {
        console.log("[LiveMeeting] In pre-event lounge, skipping token fetch");
      }
      setLoadingJoin(false);
      return;
    }

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
      if (tokenFetchInFlightRef.current) return;
      tokenFetchInFlightRef.current = true;
      setLoadingJoin(true);
      setJoinError("");

      // ✅ Cancel any previous in-flight token fetch to prevent stale tokens
      if (tokenFetchAbortControllerRef.current) {
        tokenFetchAbortControllerRef.current.abort();
        console.log("[LiveMeeting] Cancelled previous in-flight token fetch");
      }

      // Create new AbortController for this fetch
      const abortController = new AbortController();
      tokenFetchAbortControllerRef.current = abortController;

      try {
        console.log("[LiveMeeting] Fetching initial Dyte token for role:", role);
        const res = await fetch(toApiUrl(`events/${eventId}/dyte/join/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ role }),
          signal: abortController.signal, // ✅ Add abort signal
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === "banned" || res.status === 403) {
            setIsBanned(true);
            setLoadingJoin(false);
            return; // Stop execution
          }
          throw new Error(errData.detail || "Failed to join live meeting.");
        }
        const data = await res.json();

        if (data?.waiting) {
          setWaitingRoomActive(true);
          setWaitingRoomStatus(data?.admission_status || "waiting");
          setWaitingRoomLoungeAllowed(Boolean(data?.lounge_allowed));
          setWaitingRoomNetworkingAllowed(Boolean(data?.networking_allowed));
          setLoadingJoin(false);
          return;
        }

        console.log("[LiveMeeting] Received initial Dyte token");
        setWaitingRoomActive(false);
        setAuthToken(data.authToken);
        mainAuthTokenRef.current = data.authToken;
        if (data.role) setRole(normalizeRole(data.role));
      } catch (e) {
        // ✅ Don't log abort errors - they're expected when switching rooms or on lounge close
        if (e.name === 'AbortError') {
          console.log("[LiveMeeting] Token fetch was cancelled (expected during room switch)");
          return;
        }
        console.error("[LiveMeeting] Failed to fetch initial Dyte token:", e);
        setJoinError(e.message || "Join failed");
      } finally {
        // ✅ Only mark complete if this is still the active fetch
        if (tokenFetchAbortControllerRef.current === abortController) {
          tokenFetchAbortControllerRef.current = null;
          tokenFetchInFlightRef.current = false;
          setLoadingJoin(false);
        }
      }
    })();
  }, [eventId, role, isBreakout, waitingRoomActive, preEventLoungeOpen, eventData, eventFromState, joinRequestTick, joinMainRequested, authToken, hostChoiceMade, hostChoseLoungeOnly]);

  useEffect(() => {
    if (!eventId || !waitingRoomActive) return;
    let alive = true;

    const poll = async () => {
      if (!alive) return;
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/status/`), {
          headers: { ...authHeader() },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data) return;
        if (data.admission_status === "admitted") {
          console.log("[LiveMeeting] ✅ User ADMITTED from waiting room! Setting waitingRoomActive to false");
          setWaitingRoomActive(false);
          setWaitingRoomStatus("admitted");
          // ✅ NEW: Clear announcements when user is admitted
          if (waitingRoomAnnouncementsRef.current?.clearAllAnnouncements) {
            waitingRoomAnnouncementsRef.current.clearAllAnnouncements();
          }
        } else if (data.admission_status === "rejected") {
          console.log("[LiveMeeting] ❌ User REJECTED from waiting room");
          setWaitingRoomActive(false);
          setJoinError("You were not admitted to this event.");
          // ✅ NEW: Clear announcements when user is rejected
          if (waitingRoomAnnouncementsRef.current?.clearAllAnnouncements) {
            waitingRoomAnnouncementsRef.current.clearAllAnnouncements();
          }
        } else {
          console.log("[LiveMeeting] Waiting room status polling - status:", data.admission_status);
          setWaitingRoomStatus(data.admission_status || "waiting");
          setWaitingRoomLoungeAllowed(Boolean(data?.lounge_allowed));
          setWaitingRoomNetworkingAllowed(Boolean(data?.networking_allowed));
        }
      } catch { }
    };

    poll();
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [eventId, waitingRoomActive]);

  // Fallback: fetch lounge state periodically in case websocket updates are missed
  const fetchLoungeState = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/lounge-state/`), {
        headers: { ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const tables = data?.tables || data?.lounge_state || data?.state || [];
      if (Array.isArray(tables)) {
        setLoungeTables(tables);
      }
      if (data?.lounge_open_status) {
        setLoungeOpenStatus(data.lounge_open_status);
      }
    } catch (e) {
      // ignore transient errors
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    fetchLoungeState();
    const interval = setInterval(() => {
      // Avoid too-frequent fetches if other updates already happened
      if (Date.now() - lastLoungeFetchRef.current > 8000) {
        fetchLoungeState();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [eventId, fetchLoungeState]);

  useEffect(() => {
    if (preEventLoungeOpen && isLoungeCurrentlyOpen && role !== "publisher" && !isBreakout) {
      setLoungeOpen(true);
    }
  }, [preEventLoungeOpen, isLoungeCurrentlyOpen, role, isBreakout]);

  // ✅ Keep fetchLoungeStateRef in sync for handleLeaveBreakout to call
  useEffect(() => {
    fetchLoungeStateRef.current = fetchLoungeState;
  }, [fetchLoungeState]);

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
        setLastMessage(msg);
        console.log("[MainSocket] Received:", msg.type, msg);

        if (msg.type === "force_join_breakout") {
          // 1. Join the table via API to get token
          handleEnterBreakout(msg.table_id);
        } else if (msg.type === "server_debug") {
          // Show a toast or console log if host
          if (isHost) {
            console.log("[SERVER_DEBUG]", msg.message);
            setServerDebugMessage(msg.message);
            // Clear message after 10 seconds
            setTimeout(() => setServerDebugMessage(""), 10000);
          }
        } else if (msg.type === "breakout_timer") {
          setBreakoutTimer(msg.duration);
        } else if (msg.type === "breakout_announcement") {
          setBreakoutAnnouncement(msg.message);
          setShowBreakoutAnnouncement(true);
        } else if (msg.type === "breakout_end") {
          // Host has ended all breakouts - return to main room
          console.log("[MainSocket] Received breakout_end - host ended all breakouts");
          // Check both isInBreakoutRoom state AND if user has an active table assigned
          // ✅ Use Refs to access current state inside stale closure
          const inBreakout = isInBreakoutRoomRef.current;
          const userTable = activeTableIdRef.current;

          if (inBreakout || userTable) {
            console.log(`[MainSocket] User was in breakout (isInBreakoutRoom=${inBreakout}, activeTableId=${userTable}) - returning to main room`);
            // Asynchronously return to main room with proper stream re-subscription
            // ✅ Use function Ref to ensure we call the latest version with fresh closures
            if (applyBreakoutTokenRef.current) {
              applyBreakoutTokenRef.current(null, null, null, null).catch((e) => {
                console.error("[MainSocket] Error returning to main room:", e);
              });
            }
          } else {
            console.log("[MainSocket] Not in breakout, refreshing lounge state");
          }
        } else if (msg.type === "waiting_room_announcement") {
          // ✅ NEW: Handle waiting room announcements
          console.log("[MainSocket] Received waiting room announcement:", msg.message);
          if (waitingRoomAnnouncementsRef.current) {
            waitingRoomAnnouncementsRef.current.addAnnouncement({
              message: msg.message,
              sender_name: msg.sender_name,
              timestamp: msg.timestamp,
            });
          }
        } else if (msg.type === "lounge_state" || msg.type === "welcome") {
          if (msg.online_users) setOnlineUsers(msg.online_users);
          const tableState =
            msg.lounge_state || msg.state || msg.tables || msg.lounge_tables || [];
          if (Array.isArray(tableState) && tableState.length) {
            setLoungeTables(tableState);
            lastLoungeFetchRef.current = Date.now();
          }
          if (msg.lounge_open_status) {
            setLoungeOpenStatus(msg.lounge_open_status);
          }
          setActiveTableId(null);
          setActiveTableName("");
          setRoomChatConversationId(null);
        } else if (msg.type === "message" && msg.data) {
          // Handle broadcast messages (kick/ban)
          const payload = msg.data;
          if (payload.type === "kicked") {
            // alert("You have been kicked from the meeting by the host."); // Removed intrusive alert
            showSnackbar("You have been kicked from the meeting by the host.", "error");
            navigate(`/community/${currentCommunitySlug}/events/${eventId}`);
          } else if (payload.type === "banned") {
            setIsBanned(true);
            if (dyteMeeting) dyteMeeting.leaveRoom();
          }
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

  // ✅ Additional polling for lounge status while in breakout (more frequent)
  // Ensures lounge close is detected quickly even if WebSocket updates are delayed
  useEffect(() => {
    if (role === "publisher") return; // Only non-publishers need to check
    if (!eventId) return;
    if (!isBreakout) return; // Only while in breakout

    let alive = true;

    const pollLoungeStatus = async () => {
      if (!alive) return;
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/lounge-state/`), {
          headers: { ...authHeader() },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || !alive) return;

        if (data.lounge_open_status) {
          setLoungeOpenStatus(data.lounge_open_status);

          // ✅ Log lounge status changes for debugging
          if (data.lounge_open_status.status === "CLOSED") {
            console.log("[LiveMeeting] Lounge status update via polling: CLOSED (will trigger rejoin)");
          }
        }
      } catch (e) {
        console.warn("[LiveMeeting] Error polling lounge status:", e);
      }
    };

    // Poll immediately and every 5 seconds (more frequent than regular lounge polling)
    pollLoungeStatus();
    const interval = setInterval(pollLoungeStatus, 5000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [eventId, isBreakout, role]);

  const sendMainSocketAction = useCallback((payload) => {
    const ws = mainSocketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    console.warn("[MainSocket] Unable to send action; socket not open", payload);
    return false;
  }, []);

  const admitAllWaiting = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/admit/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ admit_all: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err?.detail || "Failed to admit waiting participants", "error");
        return;
      }
      showSnackbar("Admitted all waiting participants", "success");
    } catch (e) {
      showSnackbar("Failed to admit waiting participants", "error");
    }
  }, [eventId, showSnackbar]);

  const admitWaitingUser = useCallback(
    async (userId) => {
      if (!eventId || !userId) return;
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/admit/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ user_id: userId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showSnackbar(err?.detail || "Failed to admit participant", "error");
          return;
        }
        showSnackbar("Participant admitted", "success");
      } catch {
        showSnackbar("Failed to admit participant", "error");
      }
    },
    [eventId, showSnackbar]
  );

  const rejectWaitingUser = useCallback(
    async (userId) => {
      if (!eventId || !userId) return;
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/reject/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ user_id: userId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showSnackbar(err?.detail || "Failed to reject participant", "error");
          return;
        }
        showSnackbar("Participant rejected", "warning");
      } catch {
        showSnackbar("Failed to reject participant", "error");
      }
    },
    [eventId, showSnackbar]
  );

  // ✅ NEW: Send announcement to waiting room
  const sendAnnouncement = useCallback(
    async (message) => {
      if (!eventId || !message?.trim()) return;
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/announce/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ message: message.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showSnackbar(err?.detail || "Failed to send announcement", "error");
          return;
        }
        const data = await res.json();
        showSnackbar(
          `Announcement sent to ${data.recipients || 0} participant(s)`,
          "success"
        );
      } catch (e) {
        console.error("[Announcement] Error:", e);
        showSnackbar("Failed to send announcement", "error");
      }
    },
    [eventId, showSnackbar]
  );

  useEffect(() => {
    if (!eventId || !isHost || !eventData?.waiting_room_enabled) return;
    let alive = true;
    const poll = async () => {
      if (!alive) return;
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/queue/`), {
          headers: { ...authHeader() },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data && typeof data.count === "number") {
          setWaitingRoomQueueCount(data.count);
          if (Array.isArray(data.results)) {
            setWaitingRoomQueue(
              data.results.map((r) => ({
                ...r,
                name: r.user_name || r.name || r.user_email || "User",
              }))
            );
          }
        }
      } catch { }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [eventId, isHost, eventData?.waiting_room_enabled]);

  // ✅ Filter out lounge occupants from waiting room display
  // Users in the Social Lounge should NOT appear in the waiting room section
  const filteredWaitingRoomQueue = useMemo(() => {
    const loungeOccupantIds = new Set();
    loungeTables.forEach((t) => {
      Object.values(t.participants || {}).forEach((p) => {
        if (p.user_id) loungeOccupantIds.add(String(p.user_id));
      });
    });

    // Filter out users who are in the lounge
    const filtered = (waitingRoomQueue || []).filter((w) => {
      const userId = String(w.user_id || w.id || "");
      return !loungeOccupantIds.has(userId);
    });

    return filtered;
  }, [waitingRoomQueue, loungeTables]);

  const filteredWaitingRoomCount = filteredWaitingRoomQueue.length;

  useEffect(() => {
    if (!isHost || !eventData?.waiting_room_enabled) return;
    if (filteredWaitingRoomCount > waitingRoomPrevCountRef.current) {
      const diff = filteredWaitingRoomCount - waitingRoomPrevCountRef.current;
      showSnackbar(
        diff === 1 ? "New participant is waiting (click to view)" : `${diff} new participants are waiting (click to view)`,
        "info",
        {
          onClick: () => {
            setPendingWaitFocus(true);
            toggleRightPanel(3);
          },
        }
      );
    }
    waitingRoomPrevCountRef.current = filteredWaitingRoomCount;
  }, [filteredWaitingRoomCount, isHost, eventData?.waiting_room_enabled, showSnackbar, toggleRightPanel]);

  useEffect(() => {
    if (!pendingWaitFocus) return;
    if (tab !== 3 || !isPanelOpen) return;
    const el = waitingSectionRef.current;
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setPendingWaitFocus(false);
  }, [pendingWaitFocus, tab, isPanelOpen]);

  const clearSpeedNetworkingTimer = useCallback(() => {
    if (speedNetworkingTimeoutRef.current) {
      clearTimeout(speedNetworkingTimeoutRef.current);
      speedNetworkingTimeoutRef.current = null;
    }
  }, []);

  const stopSpeedNetworking = useCallback((options = {}) => {
    clearSpeedNetworkingTimer();
    setSpeedNetworkingActive(false);
    setSpeedNetworkingRound(0);
    setSpeedNetworkingTotalRounds(0);
    setSpeedNetworkingDurationMinutes(0);

    if (!isHost) return;

    if (options.sendEnd !== false) {
      sendMainSocketAction({ action: "end_all_breakouts" });
    }
    if (options.announce) {
      sendMainSocketAction({
        action: "broadcast_announcement",
        message: "Speed networking ended. Thanks for joining!",
      });
    }
  }, [clearSpeedNetworkingTimer, isHost, sendMainSocketAction]);

  const runSpeedNetworkingRound = useCallback((roundNumber, totalRounds, durationMinutes) => {
    if (!isHost) return;

    const durationSeconds = Math.max(1, Math.round(durationMinutes * 60));

    setSpeedNetworkingActive(true);
    setSpeedNetworkingRound(roundNumber);
    setSpeedNetworkingTotalRounds(totalRounds);
    setSpeedNetworkingDurationMinutes(durationMinutes);

    sendMainSocketAction({ action: "random_assign", per_room: 2 });
    sendMainSocketAction({ action: "start_timer", duration: durationSeconds });
    sendMainSocketAction({
      action: "broadcast_announcement",
      message: `Speed networking: Round ${roundNumber}/${totalRounds} (${durationMinutes} min)`,
    });

    clearSpeedNetworkingTimer();
    if (roundNumber < totalRounds) {
      speedNetworkingTimeoutRef.current = setTimeout(() => {
        runSpeedNetworkingRound(roundNumber + 1, totalRounds, durationMinutes);
      }, durationSeconds * 1000 + 1000);
    } else {
      speedNetworkingTimeoutRef.current = setTimeout(() => {
        stopSpeedNetworking({ announce: true });
      }, durationSeconds * 1000 + 1000);
    }
  }, [clearSpeedNetworkingTimer, isHost, sendMainSocketAction, stopSpeedNetworking]);

  const startSpeedNetworking = useCallback((roundDurationMinutes, totalRounds) => {
    if (!isHost || speedNetworkingActive) return;
    const durationMinutes = Math.max(1, Math.min(20, Number(roundDurationMinutes) || 0));
    const rounds = Math.max(1, Math.min(50, Number(totalRounds) || 0));

    runSpeedNetworkingRound(1, rounds, durationMinutes);
  }, [isHost, runSpeedNetworkingRound, speedNetworkingActive]);

  useEffect(() => {
    return () => {
      clearSpeedNetworkingTimer();
    };
  }, [clearSpeedNetworkingTimer]);

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
    if (initInFlightRef.current) return;
    if (lastInitTokenRef.current === authToken && initDone) return;

    // CRITICAL: Skip initialization if host is in pre-event lounge without making a choice
    // This prevents Dyte initialization until host confirms the dialog choice
    // BUT: Allow initialization if already in breakout (joined a lounge table)
    const shouldSkipInitDueToPreEventLounge = preEventLoungeOpen && !joinMainRequested &&
        (role !== "publisher" || !hostChoiceMade || hostChoseLoungeOnly) &&
        !isBreakout;  // ✅ Allow init for users in breakout rooms (joined lounge table)
    if (shouldSkipInitDueToPreEventLounge) {
      console.log("[LiveMeeting] ⏸️ Skipping init - host in pre-event lounge without making a choice");
      setInitDone(false);
      return;
    }

    let cancelled = false;
    (async () => {
      initInFlightRef.current = true;
      lastInitTokenRef.current = authToken;
      try {
        setInitDone(false);
        // ✅ Reset join flags so we can join the NEW meeting room
        joinedOnceRef.current = false;
        setRoomJoined(false);

        // Store main room token if this is the initial connection (not a breakout)
        // We'll initialize the main connection lazily when entering breakout
        if (!isBreakout && !mainRoomAuthToken) {
          setMainRoomAuthToken(authToken);
        }

        // Update breakout status IMMEDIATELY so UI reflects the change
        // before waiting for the potentially slow Dyte init
        setIsInBreakoutRoom(isBreakout);

        // Initialize active meeting (main or breakout)
        // ✅ CRITICAL FIX: Use user's actual preferences from ref, not hardcoded defaults
        // When entering lounge, respect what the user had set (mic OFF, camera OFF, etc)
        let audioDefault = role === "publisher" ? true : false;
        let videoDefault = role === "publisher" ? false : false; // publishers usually start with video off

        if (isBreakout) {
          // In breakout, use the user's saved preferences, not the hardcoded "enable all" default
          audioDefault = userMediaPreferenceRef.current.mic;
          videoDefault = userMediaPreferenceRef.current.cam;
          console.log(
            "[LiveMeeting] ⚠️ INITIALIZING BREAKOUT with saved user preferences:",
            "mic =",
            audioDefault,
            "(from ref:",
            userMediaPreferenceRef.current.mic,
            "), cam =",
            videoDefault,
            "(from ref:",
            userMediaPreferenceRef.current.cam,
            ")"
          );
        }

        console.log(
          "[LiveMeeting] Calling initMeeting with defaults - audio:",
          audioDefault,
          "video:",
          videoDefault,
          "isBreakout:",
          isBreakout
        );

        console.log("[LiveMeeting] Awaiting initMeeting to complete...");
        await initMeeting({
          authToken,
          defaults: {
            audio: audioDefault,
            video: videoDefault,
          },
        });
        console.log("[LiveMeeting] ✅ initMeeting completed successfully!");

        if (!cancelled) {
          console.log("[LiveMeeting] Setting initDone to true - join effect should trigger now");
          setInitDone(true);
        } else {
          console.log("[LiveMeeting] ⚠️ Init was cancelled, not setting initDone");
        }
      } catch (e) {
        console.error("[LiveMeeting] ❌ initMeeting FAILED:", e?.message || e);
        if (!cancelled) setJoinError(e.message || "Failed to initialize Dyte meeting");
      } finally {
        console.log("[LiveMeeting] Init effect finally block - clearing initInFlightRef");
        initInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authToken, initMeeting, role, isBreakout, preEventLoungeOpen, joinMainRequested, hostChoiceMade, hostChoseLoungeOnly]);
  // ✅ CRITICAL FIX: Neither initDone nor mainRoomAuthToken in dependencies
  // We're SETTING these states inside the effect, not depending on them
  // Having them in dependencies causes cleanup to run immediately after state updates,
  // cancelling the effect before initMeeting completes (causing "Init was cancelled" issue)
  //
  // ✅ HOST CHOICE FIX: Added pre-event lounge guard variables to dependencies
  // The effect needs to re-run when host makes a choice so initialization can proceed
  // with the proper state flags set

  // ---------- Join main room (for peek functionality) ----------
  useEffect(() => {
    if (!mainDyteMeeting?.self || !mainRoomAuthToken) return;

    (async () => {
      if (mainDyteMeeting.self.roomJoined || mainJoinInFlightRef.current) return;
      mainJoinInFlightRef.current = true;

      try {
        await mainDyteMeeting.join();
        console.log("[MainRoom] Joined main room for peek");
      } catch (e) {
        console.error("[MainRoom] Failed to join:", e);
      } finally {
        mainJoinInFlightRef.current = false;
      }
    })();
  }, [mainDyteMeeting, mainRoomAuthToken]);

  // ---------- Audio routing: Mute main room when in breakout ----------
  useEffect(() => {
    if (!mainDyteMeeting?.self) return;

    let isMounted = true;

    (async () => {
      try {
        if (isInBreakoutRoom) {
          // Mute main room to prevent echo
          await mainDyteMeeting.self.disableAudio?.();
          await mainDyteMeeting.self.disableVideo?.();
          if (isMounted) console.log("[MainRoom] Muted audio/video (in breakout)");
        } else {
          // Keep peek connection receive-only to avoid publishing mic/cam
          await mainDyteMeeting.self.disableAudio?.();
          await mainDyteMeeting.self.disableVideo?.();
          if (isMounted) console.log("[MainRoom] Kept peek connection muted (back in main)");
        }
      } catch (error) {
        if (isMounted) {
          console.warn("[MainRoom] Failed to toggle audio:", error?.message || error);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isInBreakoutRoom, mainDyteMeeting]);

  // ---------- MUST join Dyte room (custom UI doesn't auto-join) ----------
  useEffect(() => {
    if (!dyteMeeting?.self || !initDone) {
      console.log("[LiveMeeting] Join effect skipped - dyteMeeting?.self:", !!dyteMeeting?.self, "initDone:", initDone);
      return;
    }

    console.log("[LiveMeeting] ✅ Join effect triggered! dyteMeeting.self exists and initDone is true");

    const onRoomJoined = () => {
      console.log("[LiveMeeting] ✅ roomJoined event received!");
      setRoomJoined(true);
    };
    dyteMeeting.self.on?.("roomJoined", onRoomJoined);

    // refresh case
    if (dyteMeeting.self.roomJoined) setRoomJoined(true);

    (async () => {
      // ✅ Multiple guards against concurrent join calls
      if (joinInFlightRef.current) {
        console.warn("[LiveMeeting] Join already in flight, skipping duplicate call");
        return;
      }
      if (joinedOnceRef.current) {
        console.log("[LiveMeeting] Already joined once, skipping");
        return;
      }
      if (dyteMeeting.self.roomJoined) {
        console.log("[LiveMeeting] Already in room, skipping");
        return;
      }
      // ✅ Additional safety: check if we just left due to lounge transition
      if (rejoinFromLoungeRef.current) {
        console.log("[LiveMeeting] Recent lounge rejoin in progress, waiting");
        return;
      }

      joinedOnceRef.current = true;
      joinInFlightRef.current = true;

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
        console.log("[LiveMeeting] Calling dyteMeeting.joinRoom()...");
        await dyteMeeting.joinRoom?.();
        console.log("[LiveMeeting] ✅ joinRoom() completed successfully!");
      } catch (e) {
        console.error("[LiveMeeting] ❌ joinRoom failed:", e?.message || e);

        // ✅ Only retry if not recently rejoin from lounge (to avoid retry loops)
        if (rejoinFromLoungeRef.current) {
          console.warn("[LiveMeeting] Skipping join retry due to lounge rejoin");
          setJoinError(e?.message || "Failed to join Dyte room");
          return;
        }

        // ✅ Allow retry for ALL users (both audience and publishers)
        if (joinRoomRetryRef.current < 1) {
          console.log("[LiveMeeting] Join failed, retrying once...");
          joinRoomRetryRef.current += 1;
          mainAuthTokenRef.current = "";
          setAuthToken("");
          setLoadingJoin(true);
          setJoinError("");
          setJoinRequestTick((v) => v + 1);
          return;
        }
        setJoinError(e?.message || "Failed to join Dyte room");
      } finally {
        joinInFlightRef.current = false;
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

  // ✅ CRITICAL FIX: Explicit media state sync when entering/leaving lounge (breakout)
  // This ensures UI state matches actual media track state when transitioning between rooms
  useEffect(() => {
    if (!dyteMeeting?.self || !isBreakout) return;

    console.log(
      "[LiveMeeting] Syncing media state in lounge - Audio:",
      dyteMeeting.self.audioEnabled,
      "Video:",
      dyteMeeting.self.videoEnabled
    );

    // Force sync on breakout entry
    setMicOn(Boolean(dyteMeeting.self.audioEnabled));
    setCamOn(Boolean(dyteMeeting.self.videoEnabled));
  }, [isBreakout, dyteMeeting?.self?.id]); // Trigger when entering/leaving breakout

  // ✅ CRITICAL FIX: Ensure media tracks are properly muted at WebRTC level when disabled
  // This adds an extra layer of protection specifically for lounge/breakout rooms
  // Run frequently to catch any tracks that get mysteriously re-enabled
  useEffect(() => {
    if (!dyteMeeting?.self || !isBreakout) return;

    console.log(
      "[LiveMeeting LOUNGE ENFORCEMENT EFFECT] Running - micOn:",
      micOn,
      "camOn:",
      camOn,
      "audioEnabled:",
      dyteMeeting.self.audioEnabled,
      "videoEnabled:",
      dyteMeeting.self.videoEnabled
    );

    // Only check and enforce if tracks should be disabled
    if (!micOn || !camOn) {
      // Run enforcement immediately and then repeatedly
      const enforceMediaMute = () => {
        try {
          let audioAction = null;
          let videoAction = null;

          // Enforce audio mute if mic is OFF
          if (!micOn) {
            if (dyteMeeting.self.audioEnabled) {
              dyteMeeting.self.disableAudio?.();
            }
            const audioSenders =
              dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
                (s) => s.track?.kind === "audio"
              ) || [];
            console.log(
              "[LiveMeeting LOUNGE] Audio enforcement - micOn=false, found senders:",
              audioSenders.length,
              "audioEnabled:",
              dyteMeeting.self.audioEnabled
            );
            for (const sender of audioSenders) {
              if (sender.track && sender.track.enabled) {
                sender.track.enabled = false;
                audioAction = "ENFORCED MUTE";
              }
            }
          }

          // Enforce video mute if camera is OFF
          if (!camOn) {
            if (dyteMeeting.self.videoEnabled) {
              dyteMeeting.self.disableVideo?.();
            }
            const videoSenders =
              dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
                (s) => s.track?.kind === "video"
              ) || [];
            console.log(
              "[LiveMeeting LOUNGE] Video enforcement - camOn=false, found senders:",
              videoSenders.length,
              "videoEnabled:",
              dyteMeeting.self.videoEnabled
            );
            for (const sender of videoSenders) {
              if (sender.track && sender.track.enabled) {
                sender.track.enabled = false;
                videoAction = "ENFORCED MUTE";
              }
            }
          }

          if (audioAction || videoAction) {
            console.log(
              "[LiveMeeting] LOUNGE ENFORCEMENT: Audio:",
              audioAction || "OK",
              "Video:",
              videoAction || "OK"
            );
          }
        } catch (e) {
          console.warn("[LiveMeeting] Error enforcing lounge media mute:", e);
        }
      };

      // Run immediately
      enforceMediaMute();

      // And run every 200ms to be aggressive about enforcement
      const interval = setInterval(() => {
        try {
          const audioSenders =
            dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
              (s) => s.track?.kind === "audio"
            ) || [];
          const videoSenders =
            dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
              (s) => s.track?.kind === "video"
            ) || [];

          // Log if senders are now available (they weren't during init)
          if (audioSenders.length > 0 || videoSenders.length > 0) {
            console.log(
              "[LiveMeeting] LOUNGE: Senders now available! Audio senders:",
              audioSenders.length,
              "Audio enabled:",
              dyteMeeting.self.audioEnabled,
              "Video senders:",
              videoSenders.length,
              "Video enabled:",
              dyteMeeting.self.videoEnabled
            );
          }

          enforceMediaMute();
        } catch (e) {
          console.warn("[LiveMeeting] Enforcement interval error:", e);
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, [micOn, camOn, isBreakout, dyteMeeting]);

  // ✅ CRITICAL FIX: Immediately apply media preferences when joining lounge breakout room
  // The defaults in initMeeting might enable audio/video, so we forcefully apply the user's actual preference
  useEffect(() => {
    if (!dyteMeeting?.self || !isBreakout || !roomJoined) return;

    const applyMediaPreferences = async () => {
      try {
        // Use the saved user preferences from the ref
        const userMicPreference = userMediaPreferenceRef.current.mic;
        const userCamPreference = userMediaPreferenceRef.current.cam;

        console.log(
          "[LiveMeeting] LOUNGE ROOM JOINED: Applying user media preferences - Mic:",
          userMicPreference,
          "Camera:",
          userCamPreference,
          "Current Dyte state - Audio:",
          dyteMeeting.self.audioEnabled,
          "Video:",
          dyteMeeting.self.videoEnabled
        );

        // If user prefers mic OFF but Dyte has it ON, disable it
        if (!userMicPreference && dyteMeeting.self.audioEnabled) {
          console.log("[LiveMeeting] LOUNGE: User prefers mic OFF, disabling audio...");
          // Try disabling multiple times to ensure it sticks
          for (let i = 0; i < 3; i++) {
            try {
              await dyteMeeting.self.disableAudio?.();
              console.log("[LiveMeeting] disableAudio attempt", i + 1, "succeeded");
            } catch (e) {
              console.warn("[LiveMeeting] disableAudio attempt", i + 1, "failed:", e?.message);
            }
            await new Promise((r) => setTimeout(r, 50));
          }

          // Wait a bit for SDK to process
          await new Promise((r) => setTimeout(r, 100));

          // AGGRESSIVELY disable at WebRTC level - this is the nuclear option
          try {
            const audioSenders =
              dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
                (s) => s.track?.kind === "audio"
              ) || [];
            console.log("[LiveMeeting] Found audio senders:", audioSenders.length);
            for (const sender of audioSenders) {
              if (sender.track) {
                sender.track.enabled = false;
                console.log(
                  "[LiveMeeting] FORCED: Audio track disabled at WebRTC level"
                );
              }
            }
          } catch (e) {
            console.warn("[LiveMeeting] Failed to disable audio at WebRTC level:", e);
          }
        }

        // If user prefers camera OFF but Dyte has it ON, disable it
        if (!userCamPreference && dyteMeeting.self.videoEnabled) {
          console.log("[LiveMeeting] LOUNGE: User prefers camera OFF, disabling video...");
          // Try disabling multiple times to ensure it sticks
          for (let i = 0; i < 3; i++) {
            try {
              await dyteMeeting.self.disableVideo?.();
              console.log("[LiveMeeting] disableVideo attempt", i + 1, "succeeded");
            } catch (e) {
              console.warn("[LiveMeeting] disableVideo attempt", i + 1, "failed:", e?.message);
            }
            await new Promise((r) => setTimeout(r, 50));
          }

          // Wait a bit for SDK to process
          await new Promise((r) => setTimeout(r, 100));

          // AGGRESSIVELY disable at WebRTC level
          try {
            const videoSenders =
              dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
                (s) => s.track?.kind === "video"
              ) || [];
            console.log("[LiveMeeting] Found video senders:", videoSenders.length);
            for (const sender of videoSenders) {
              if (sender.track) {
                sender.track.enabled = false;
                console.log(
                  "[LiveMeeting] FORCED: Video track disabled at WebRTC level"
                );
              }
            }
          } catch (e) {
            console.warn("[LiveMeeting] Failed to disable video at WebRTC level:", e);
          }
        }

        // Wait and verify the state - do this multiple times to be sure
        await new Promise((r) => setTimeout(r, 200));
        console.log(
          "[LiveMeeting] LOUNGE: First verification - Audio enabled:",
          dyteMeeting.self.audioEnabled,
          "Video enabled:",
          dyteMeeting.self.videoEnabled
        );

        // Second pass - re-enforce if needed
        await new Promise((r) => setTimeout(r, 300));
        if (!userMicPreference && dyteMeeting.self.audioEnabled) {
          console.log("[LiveMeeting] LOUNGE: Audio re-enabled unexpectedly! Forcing mute again...");
          try {
            const audioSenders =
              dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
                (s) => s.track?.kind === "audio"
              ) || [];
            for (const sender of audioSenders) {
              if (sender.track) {
                sender.track.enabled = false;
              }
            }
          } catch (e) {
            console.warn("[LiveMeeting] Second enforcement failed:", e);
          }
        }

        if (!userCamPreference && dyteMeeting.self.videoEnabled) {
          console.log(
            "[LiveMeeting] LOUNGE: Video re-enabled unexpectedly! Forcing mute again..."
          );
          try {
            const videoSenders =
              dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
                (s) => s.track?.kind === "video"
              ) || [];
            for (const sender of videoSenders) {
              if (sender.track) {
                sender.track.enabled = false;
              }
            }
          } catch (e) {
            console.warn("[LiveMeeting] Second enforcement failed:", e);
          }
        }

        console.log(
          "[LiveMeeting] LOUNGE: Final verification - Audio enabled:",
          dyteMeeting.self.audioEnabled,
          "Video enabled:",
          dyteMeeting.self.videoEnabled
        );
      } catch (e) {
        console.warn("[LiveMeeting] Error applying lounge media preferences:", e);
      }
    };

    applyMediaPreferences();
  }, [isBreakout, roomJoined, dyteMeeting]);

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
    if (!initDone || role !== "publisher") return;
    // Do not reactivate main meeting from lounge/breakout or after it ended
    if (isBreakout || dbStatus === "ended") return;
    updateLiveStatus("start");
    setDbStatus("live"); // ✅ show LIVE chip immediately for host too
  }, [initDone, role, isBreakout, dbStatus, updateLiveStatus]);

  const ignoreRoomLeftRef = useRef(false);
  const rejoinFromLoungeRef = useRef(false);

  const myUserId = useMemo(() => String(getMyUserIdFromJwt() || ""), []);
  const isEventOwner = useMemo(() => {
    if (!myUserId || !eventData?.created_by_id) return false;
    return String(myUserId) === String(eventData.created_by_id);
  }, [myUserId, eventData?.created_by_id]);

  const handleMeetingEnd = useCallback(
    async (state, options = {}) => {
      // If user is banned, do NOT navigate away. We want to show the banned screen.
      if (isBanned) return;

      const { explicitEnd = false } = options;
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

      // ✅ IMPORTANT: Wait for meeting end to be processed on backend before fetching lounge status
      // This ensures is_live = False and live_ended_at is set before we check lounge availability
      if (explicitEnd && role === "publisher") {
        try {
          await updateLiveStatus("end");
          console.log("[LiveMeeting] Host explicitly ended meeting, backend notified");
        } catch (e) {
          console.warn("[LiveMeeting] Error notifying backend of meeting end:", e);
        }
      }

      let loungeStatus = loungeOpenStatus;

      // ✅ Fetch latest lounge status in case it changed
      if (!eventId) {
        if (isEventOwner || (role === "publisher" && !eventData?.created_by_id)) {
          navigate("/admin/events");
        } else {
          navigate(-1);
        }
        return;
      }

      try {
        const res = await fetch(toApiUrl(`events/${eventId}/lounge-state/`), {
          headers: authHeader(),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.lounge_open_status) {
            loungeStatus = data.lounge_open_status;
            console.log("[LiveMeeting] Lounge status after meeting end:", loungeStatus);
          }
        }
      } catch {
        // Use existing loungeOpenStatus if fetch fails
      }

      const isPostEventWindowOpen = loungeStatus?.status === "OPEN" &&
                                    loungeStatus?.reason?.includes("Post-event");

      if (isPostEventWindowOpen && loungeStatus?.next_change) {
        // ✅ Show post-event lounge screen (both host and participants)
        console.log("[LiveMeeting] Showing post-event lounge, closing at:", loungeStatus.next_change);
        setIsPostEventLounge(true);
        setPostEventLoungeClosingTime(loungeStatus.next_change);
      } else {
        // ✅ Event not in post-event window, navigate appropriately
        console.log("[LiveMeeting] Post-event lounge not available, navigating away. Status:", loungeStatus?.status, "Reason:", loungeStatus?.reason);
        if (role === "publisher" || isEventOwner) {
          navigate("/admin/events");
        } else {
          navigate(-1);
        }
      }
    },
    [navigate, role, isEventOwner, eventData?.created_by_id, updateLiveStatus, dyteMeeting, isBanned, eventId]
  );

  // ✅ Handler for exiting post-event lounge
  const handleExitPostEventLounge = useCallback(() => {
    setIsPostEventLounge(false);
    // ✅ Host goes to admin dashboard, participants go back
    if (isEventOwner || (role === "publisher" && !eventData?.created_by_id)) {
      navigate("/admin/events");
    } else {
      navigate(-1);
    }
  }, [navigate, role, isEventOwner, eventData?.created_by_id]);

  // Poll event status so clients exit when backend ends the meeting
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/`), { headers: authHeader() });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.status) setDbStatus(data.status);
        if (data?.status === "ended" && !endHandledRef.current) {
          handleMeetingEnd("ended");
        }
      } catch {
        // ignore transient errors
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventId, handleMeetingEnd]);

  useEffect(() => {
    if (!dyteMeeting?.self) return;
    const handleRoomLeft = ({ state }) => {
      if (ignoreRoomLeftRef.current) return;
      if (rejoinFromLoungeRef.current) return;
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
        if (payload?.hostUserKey) hostUserKeyRef.current = payload.hostUserKey;

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

  // ✅ If Host leaves MAIN MEETING, show waiting state for audience
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

      // Host left MAIN meeting => show waiting state (do not end)
      if (p.id === hostId) {
        console.log("[LiveMeeting] Host left MAIN meeting - waiting for host to return");
        setHostJoined(false);
        setPinnedHost(null);
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

  // If pinned host is no longer present, clear pinned state
  useEffect(() => {
    if (!pinnedHost) return;
    const current = getJoinedParticipants().find((p) => p?.id === pinnedHost?.id);
    if (current) return;

    try {
      pinnedHost.unpin?.();
    } catch { }
    try {
      dyteMeeting?.participants?.unpin?.(pinnedHost);
    } catch { }
    try {
      dyteMeeting?.participants?.unpin?.(pinnedHost?.id);
    } catch { }

    setHostJoined(false);
    setPinnedHost(null);
  }, [dyteMeeting, getJoinedParticipants, pinnedHost]);

  // Host broadcasts presence so audience can pin
  useEffect(() => {
    if (!isHost || !dyteMeeting?.self) return;
    if (!dyteMeeting.self.roomJoined) return;

    const broadcastPresence = () => {
      const myId = dyteMeeting.self?.id;
      const hostUserKey = getParticipantUserKey(dyteMeeting.self);
      // Only broadcast after join is complete to avoid ERR1205
      if (myId && dyteMeeting.self?.roomJoined) {
        dyteMeeting.participants?.broadcastMessage?.("host-id", {
          hostId: myId,
          hostUserKey,
        });
      }
      if (hostUserKey) hostUserKeyRef.current = hostUserKey;
    };
    broadcastPresence();
    const interval = setInterval(broadcastPresence, 4000);
    return () => clearInterval(interval);
  }, [isHost, dyteMeeting]);

  useEffect(() => {
    if (hostIdHint) hostIdRef.current = hostIdHint;
  }, [hostIdHint]);

  useEffect(() => {
    if (pinnedHost?.id) hostIdRef.current = pinnedHost.id;
  }, [pinnedHost?.id]);

  useEffect(() => {
    if (isHost && dyteMeeting?.self?.id) hostIdRef.current = dyteMeeting.self.id;
  }, [isHost, dyteMeeting?.self?.id]);


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
    if (!dyteMeeting) return;
    const hostId = hostIdHint || pinnedHost?.id || (isHost ? dyteMeeting?.self?.id : null);
    if (!hostId) return;
    const all = getJoinedParticipants();
    const found =
      all.find((p) => p?.id === hostId) ||
      (dyteMeeting?.self?.id === hostId ? dyteMeeting.self : null);
    if (!found) return;
    const key = getParticipantUserKey(found);
    if (key) hostUserKeyRef.current = key;
  }, [dyteMeeting, getJoinedParticipants, hostIdHint, pinnedHost?.id, isHost, participantsTick]);

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

    // ✅ Fix Audience Icons: Listen for specific audio/video events
    dyteMeeting.participants.joined?.on?.("audioUpdate", bump);
    dyteMeeting.participants.joined?.on?.("videoUpdate", bump);
    dyteMeeting.participants?.on?.("audioUpdate", bump);
    dyteMeeting.participants?.on?.("videoUpdate", bump);
    dyteMeeting?.on?.("audioUpdate", bump);
    dyteMeeting?.on?.("videoUpdate", bump);

    // Initial sync
    bump();

    // Fallback: periodic sync in case events are missed
    // Reduced from 2500ms to 1000ms for better real-time participant visibility
    // especially for grace period joins which might have timing issues with Dyte SDK
    const poll = setInterval(bump, 1000);

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

      dyteMeeting.participants.joined?.off?.("audioUpdate", bump);
      dyteMeeting.participants.joined?.off?.("videoUpdate", bump);
      dyteMeeting.participants?.off?.("audioUpdate", bump);
      dyteMeeting.participants?.off?.("videoUpdate", bump);
      dyteMeeting?.off?.("audioUpdate", bump);
      dyteMeeting?.off?.("videoUpdate", bump);

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

    const handleParticipantLeft = (participant) => {
      if (participant?.id) {
        observedParticipantsRef.current.delete(participant.id);
        setParticipantsTick((v) => v + 1);
      }
    };

    dyteMeeting.participants?.on?.("broadcastedMessage", onBroadcast);
    dyteMeeting.participants?.joined?.on?.("participantLeft", handleParticipantLeft);

    broadcastPresence();
    const interval = setInterval(broadcastPresence, 4000);

    return () => {
      dyteMeeting.participants?.off?.("broadcastedMessage", onBroadcast);
      dyteMeeting.participants?.joined?.off?.("participantLeft", handleParticipantLeft);
      clearInterval(interval);
    };
  }, [dyteMeeting]);

  const participants = useMemo(() => {
    const loungeOccupantIds = new Set();
    loungeTables.forEach((t) => {
      Object.values(t.participants || {}).forEach((p) => {
        if (p.user_id) loungeOccupantIds.add(String(p.user_id));
      });
    });

    // Debug: Log lounge occupants
    if (loungeOccupantIds.size > 0 && participantsTick % 5 === 0) {
      console.log(`[LoungeSync] Lounge occupants detected: ${Array.from(loungeOccupantIds).join(", ")}`);
    }

    const list = [];

    // Prefer self, then joined, then fallback observed entries
    if (dyteMeeting?.self) list.push(dyteMeeting.self);
    getJoinedParticipants().forEach((p) => list.push(p));
    observedParticipantsRef.current.forEach((p) => list.push(p));

    const joinedIds = new Set(getJoinedParticipants().map(p => p.id));
    if (dyteMeeting?.self?.id) joinedIds.add(dyteMeeting.self.id);

    const deduped = [];
    const seenKeys = new Set();
    let idx = 0;
    for (const p of list) {
      const key = getParticipantUserKey(p) || `id:${String(p?.id || "")}`;
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);

      // Attach inMeeting flag
      p.inMeeting = joinedIds.has(p.id);

      // Attach lounge occupancy info
      const userKey = getParticipantUserKey(p);
      const userIdFromKey = userKey.startsWith("id:") ? userKey.replace("id:", "") : null;

      const raw = p?._raw || p || {};
      const clientSpecificId = String(
        userIdFromKey ||
        raw.clientSpecificId ||
        raw.client_specific_id ||
        p.clientSpecificId ||
        p.userId ||
        p.customId ||
        raw.userId ||
        raw.clientSpecificId ||
        raw.client_specific_id ||
        raw.customParticipantId ||
        raw.uid ||
        p.id ||
        ""
      );

      const isOccupied = loungeOccupantIds.has(clientSpecificId);
      p.isOccupyingLounge = isOccupied;

      // Log for everyone (not just host) to debug lounge sync
      if (idx % 3 === 0 && participantsTick % 5 === 0) {
        console.log(`[LoungeIsolation] ${p.name}: key=${userKey}, extractedID=${clientSpecificId}, inLounge=${isOccupied}`);
      }

      deduped.push(p);
      idx++;
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
      // ✅ Determine role from preset/metadata first, then fall back to pinned host
      const preset = (p.presetName || "").toLowerCase();

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
      const rawRole = String(
        raw.role ||
        raw.user_role ||
        raw.userRole ||
        raw.participant_role ||
        raw.participantRole ||
        parsedMeta.role ||
        parsedMeta.user_role ||
        parsedMeta.userRole ||
        parsedMeta.preset ||
        parsedMeta.presetName ||
        ""
      ).toLowerCase();

      const isPublisherPreset =
        preset.includes("host") ||
        preset.includes("publisher") ||
        preset.includes("admin") ||
        preset.includes("presenter") ||
        preset.includes("speaker") ||
        rawRole.includes("host") ||
        rawRole.includes("publisher") ||
        rawRole.includes("admin") ||
        rawRole.includes("presenter") ||
        rawRole.includes("speaker") ||
        raw?.isHost === true ||
        raw?.is_host === true;

      // If preset indicates publisher/host, mark as Host
      // Otherwise check if they're the pinned host or the broadcast host hint
      const hostIdCurrent = hostIdRef.current || hostIdHint; // ✅ Fallback to hostIdHint if hostIdRef is cleared during lounge transition
      const hostUserKeyCurrent = hostUserKeyRef.current;
      const participantUserKey = getParticipantUserKey(p);
      const isHostParticipant =
        isPublisherPreset ||
        (hostIdCurrent && p.id === hostIdCurrent) ||
        (hostUserKeyCurrent && participantUserKey && participantUserKey === hostUserKeyCurrent) ||
        (isHost && dyteMeeting?.self?.id && p.id === dyteMeeting.self.id);

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
        inMeeting: Boolean(p.inMeeting),
        isOccupyingLounge: Boolean(p.isOccupyingLounge),
        _raw: p,
      };
    });
  }, [dyteMeeting, getJoinedParticipants, isHost, pinnedHost, hostIdHint, participantsTick, loungeTables]);

  const breakoutParticipantCount = useMemo(() => {
    if (!isBreakout) return 0;
    const ids = new Set();
    if (dyteMeeting?.self?.id) ids.add(dyteMeeting.self.id);
    getJoinedParticipants().forEach((p) => {
      if (p?.id) ids.add(p.id);
    });
    return ids.size;
  }, [isBreakout, dyteMeeting?.self?.id, getJoinedParticipants, participantsTick]);

  // ✅ Leave Breakout / Table logic
  const handleLeaveBreakout = useCallback(async () => {
    if (leaveBreakoutInFlightRef.current) return;
    leaveBreakoutInFlightRef.current = true;
    // 1. Notify backend via MAIN socket (same endpoint as lounge)
    if (mainSocketRef.current?.readyState === WebSocket.OPEN) {
      console.log("[LiveMeeting] Sending leave_table via main socket");
      mainSocketRef.current.send(JSON.stringify({ action: "leave_table" }));
    }

    // 2. ✅ SPECIAL HANDLING FOR POST-EVENT LOUNGE
    // If in post-event mode, don't try to return to main meeting (it's ended)
    // Just reset breakout state and show PostEventLoungeScreen again
    if (isPostEventLounge) {
      console.log("[LiveMeeting] In post-event lounge - resetting breakout state only");
      try {
        if (dyteMeeting) {
          try {
            await dyteMeeting.leaveRoom();
          } catch (e) {
            console.warn("[LiveMeeting] Error leaving lounge room:", e);
          }
        }
        await new Promise((r) => setTimeout(r, 200));

        // ✅ REFRESH LOUNGE STATE FIRST: Fetch updated table data BEFORE resetting state
        // This ensures data has time to fetch before UI re-renders
        if (fetchLoungeStateRef.current) {
          console.log("[LiveMeeting] Refreshing lounge state before returning to post-event screen");
          fetchLoungeStateRef.current();
        }

        // Give API call time to complete before resetting state and re-rendering
        await new Promise((r) => setTimeout(r, 300));

        // Reset breakout state without trying to return to main
        setIsBreakout(false);
        setAuthToken(null);
        setInitDone(false);
        setRoomJoined(false);
        joinedOnceRef.current = false;
        setActiveTableId(null);
        setActiveTableName("");
        setActiveTableLogoUrl("");
        if (typeof setRoomChatConversationId === "function") {
          setRoomChatConversationId(null);
        }
        console.log("[LiveMeeting] Successfully returned to post-event lounge screen with refreshed table data");
      } finally {
        setTimeout(() => {
          leaveBreakoutInFlightRef.current = false;
        }, 300);
      }
      return;
    }

    // 3. Use the same switch logic as breakout end to avoid double-leave (for non-post-event)
    try {
      if (applyBreakoutTokenRef.current) {
        await applyBreakoutTokenRef.current(null, null, null, null);
      } else {
        if (dyteMeeting) {
          try {
            await dyteMeeting.leaveRoom();
          } catch (e) {
            console.warn("Error leaving breakout room:", e);
          }
        }
        await new Promise((r) => setTimeout(r, 500));
        if (mainAuthTokenRef.current) {
          setIsBreakout(false);
          setAuthToken(mainAuthTokenRef.current);
          setActiveTableId(null);
          setActiveTableName("");
          setActiveTableLogoUrl("");
          if (typeof setRoomChatConversationId === "function") {
            setRoomChatConversationId(null);
          }
        }
      }
    } finally {
      setTimeout(() => {
        leaveBreakoutInFlightRef.current = false;
      }, 300);
    }
  }, [dyteMeeting, isPostEventLounge]);

  const forceRejoinMainFromLounge = useCallback(async () => {
    // Close lounge UI and force a fresh join via API (to respect waiting room/grace rules)
    setLoungeOpen(false);
    setJoinMainRequested(true);
    setHostChoseLoungeOnly(false);
    rejoinFromLoungeRef.current = true;

    // ✅ Cancel any in-flight token fetch to prevent stale tokens during lounge rejoin
    if (tokenFetchAbortControllerRef.current) {
      tokenFetchAbortControllerRef.current.abort();
      console.log("[LiveMeeting] Cancelled in-flight token fetch during lounge rejoin");
      tokenFetchAbortControllerRef.current = null;
    }

    if (dyteMeeting) {
      try {
        ignoreRoomLeftRef.current = true;
        await dyteMeeting.leaveRoom();
      } catch (e) {
        console.warn("[LiveMeeting] Error leaving lounge room:", e);
      } finally {
        ignoreRoomLeftRef.current = false;
      }
    }
    mainAuthTokenRef.current = "";
    setMainRoomAuthToken(null);
    setIsBreakout(false);
    setAuthToken("");
    setInitDone(false);
    setRoomJoined(false);
    joinedOnceRef.current = false;
    setActiveTableId(null);
    setActiveTableName("");
    setActiveTableLogoUrl("");
    setRoomChatConversationId(null);
    setWaitingRoomActive(false);
    setJoinRequestTick((v) => v + 1);
    setTimeout(() => {
      rejoinFromLoungeRef.current = false;
    }, 500);
  }, [dyteMeeting]);

  // ✅ Lounge close detection ref to prevent concurrent rejoin calls
  const loungeCloseDetectionRef = useRef({
    inFlightCount: 0,
    lastTriggerTime: 0,
    MIN_INTERVAL_MS: 1000, // Debounce: prevent rapid re-triggers within 1 second
  });

  // ✅ Helper function to safely trigger lounge rejoin
  const shouldTriggerLoungeRejoin = useCallback(() => {
    // Already in flight - don't trigger again
    if (loungeCloseDetectionRef.current.inFlightCount > 0) {
      console.log("[LiveMeeting] Lounge rejoin already in flight, skipping");
      return false;
    }

    // Too soon since last trigger
    const now = Date.now();
    const timeSinceLastTrigger = now - loungeCloseDetectionRef.current.lastTriggerTime;
    if (timeSinceLastTrigger < loungeCloseDetectionRef.current.MIN_INTERVAL_MS) {
      console.log("[LiveMeeting] Lounge rejoin triggered too recently, debouncing");
      return false;
    }

    // Check if user should be forced to rejoin
    if (role === "publisher") return false; // Hosts don't auto-rejoin
    if (!isBreakout) return false; // Only rejoin from breakout/lounge

    return true;
  }, [role, isBreakout]);

  useEffect(() => {
    const wasOpen = preEventLoungeWasOpenRef.current;
    if (wasOpen && !preEventLoungeOpen) {
      setLoungeOpen(false);
      if (isBreakout) {
        handleLeaveBreakout();
      }
    }
    preEventLoungeWasOpenRef.current = preEventLoungeOpen;
  }, [preEventLoungeOpen, isBreakout, handleLeaveBreakout]);

  // ✅ CONSOLIDATED LOUNGE CLOSE DETECTION
  // Replaces 5 separate effects with single guard against race conditions
  useEffect(() => {
    if (role === "publisher") return; // Hosts don't auto-rejoin
    if (!isBreakout) return; // Only applies to users in breakout/lounge

    // Evaluate all lounge close conditions
    const shouldRejoin =
      (!preEventLoungeOpen && isBreakout) || // Pre-event lounge closed
      (!isLoungeCurrentlyOpen && isPreEventLoungeStatus && isBreakout) || // Pre-event lounge ended
      (loungeOpenStatus?.status === "CLOSED" && !isPostEventLounge && isBreakout); // Lounge CLOSED

    if (!shouldRejoin) return;

    // Guard against concurrent calls
    if (!shouldTriggerLoungeRejoin()) return;

    // Execute rejoin with race condition protection
    (async () => {
      loungeCloseDetectionRef.current.inFlightCount++;
      loungeCloseDetectionRef.current.lastTriggerTime = Date.now();

      try {
        console.log("[LiveMeeting] Consolidated lounge close detected, triggering rejoin");
        await forceRejoinMainFromLounge();
      } catch (e) {
        console.error("[LiveMeeting] Error during forced rejoin:", e);
      } finally {
        loungeCloseDetectionRef.current.inFlightCount--;
      }
    })();
  }, [
    role,
    isBreakout,
    preEventLoungeOpen,
    isLoungeCurrentlyOpen,
    isPreEventLoungeStatus,
    loungeOpenStatus?.status,
    isPostEventLounge,
    forceRejoinMainFromLounge,
    shouldTriggerLoungeRejoin,
  ]);

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
      window.__loungeTables = loungeTables;
    }
  }, [dyteMeeting, getJoinedParticipants, participantsTick, loungeTables]);

  // Pinned “host” view data
  const latestPinnedHost = useMemo(() => {
    // ✅ FORCE for Host: Always use self as the pinned host source of truth
    // In breakout/lounge, always pin self if host is present
    if (isHost && dyteMeeting?.self) {
      const selfParticipant = participants.find(x => x.id === dyteMeeting.self.id);

      // If host is in lounge, pin host (breakout view should show host)
      if (selfParticipant?.isOccupyingLounge && isBreakout) {
        return dyteMeeting.self;
      }

      // If host is in lounge and we're in main view, find another participant to pin instead
      if (selfParticipant?.isOccupyingLounge && !isBreakout) {
        console.log("[LoungePinning] Host is in lounge, looking for alternative participant from main room...", {
          selfId: selfParticipant.id,
          selfName: selfParticipant.name
        });

        // ✅ FIX: Filter out lounge participants using isOccupyingLounge flag
        // Don't show lounge participants in main area, only main area participants
        const mainAreaParticipants = participants.filter(
          x =>
            x.id !== dyteMeeting.self.id &&  // Exclude self (host in lounge)
            !x.isOccupyingLounge &&           // Only show main area participants
            x.id                              // Must have valid ID
        );
        console.log("[LoungePinning] Main area participants available:", mainAreaParticipants.map(p => ({
          id: p.id,
          name: p.name,
          isOccupyingLounge: p.isOccupyingLounge
        })));

        if (mainAreaParticipants.length > 0) {
          console.log("[LoungePinning] Host in lounge: pinning main area participant:", mainAreaParticipants[0].name);
          return mainAreaParticipants[0];
        }
        // If no main area participants available, return null (show welcome screen)
        console.log("[LoungePinning] Host in lounge: no main area participants available, showing welcome screen");
        return null;
      }
      return dyteMeeting.self;
    }

    let p = pinnedHost;

    // ✅ NEW: If pinned host is occupying lounge, find another participant to show audience instead
    // In breakout/lounge, keep pinned host visible
    if (p && !isHost) {
      const pinnedHostParticipant = participants.find(x => x.id === p.id);

      if (pinnedHostParticipant?.isOccupyingLounge && !isBreakout) {
        console.log("[LoungePinning-Audience] Pinned host IS in lounge, finding alternative...");

        // ✅ Use participants array instead of getJoinedParticipants() to access all observed participants
        // Filter to:
        // 1. Exclude participants who are occupying lounge (not in main room)
        // 2. Exclude pinned host and self
        // This shows participants who are in the main room and observable

        // Debug: Log all available participants and their lounge status
        console.log("[LoungePinning-Audience] All available participants:", participants.map(x => ({
          id: x.id,
          name: x.name,
          isOccupyingLounge: x.isOccupyingLounge,
          isSelf: x.id === dyteMeeting?.self?.id,
          isPinned: x.id === p.id
        })));

        // First, try to find participants who are NOT self and NOT in lounge
        const alternativeParticipants = participants.filter(
          x =>
            x.id !== p.id &&
            x.id !== dyteMeeting?.self?.id &&
            !x.isOccupyingLounge && // Don't show lounge participants in main area
            x.id // Must have valid id
        );

        console.log("[LoungePinning] Filtered alternative participants:", alternativeParticipants.map(x => ({
          id: x.id,
          name: x.name
        })));

        if (alternativeParticipants.length > 0) {
          console.log("[LoungePinning] Audience: Pinning alternative participant:", alternativeParticipants[0].name);
          p = alternativeParticipants[0];
        } else {
          // Fallback: If all other participants are in lounge, show self (the viewer) if available in main room
          const selfParticipant = participants.find(x => x.id === dyteMeeting?.self?.id);
          if (selfParticipant && !selfParticipant.isOccupyingLounge) {
            console.log("[LoungePinning] Audience: No other participants in main room, showing self:", selfParticipant.name);
            p = selfParticipant;
          } else {
            console.log("[LoungePinning] Audience: No participants in main room available (all are lounge occupants), showing welcome screen");
            return null;
          }
        }
      } else {
        console.log("[LoungePinning-Audience] Pinned host is NOT in lounge or not found:", {
          pinnedHostFound: !!pinnedHostParticipant,
          pinnedHostInLounge: pinnedHostParticipant?.isOccupyingLounge
        });
      }
    }

    // If in breakout and no official host pinned, find first other participant in the lounge room
    if (!p && isBreakout) {
      const breakoutParticipants = getJoinedParticipants().filter(
        (x) => x.id && x.id !== dyteMeeting?.self?.id
      );
      if (breakoutParticipants.length > 0) {
        console.log("[LoungePinning] Breakout fallback: Found participant:", breakoutParticipants[0].name);
        p = breakoutParticipants[0];
      } else {
        console.log("[LoungePinning] Breakout fallback: No other participants available");
      }
      // If no other participants, p remains null - welcome/placeholder UI will show
    }

    // ✅ NEW: If pinned participant is self and in lounge/breakout, show someone else instead
    if (p && isBreakout && p.id === dyteMeeting?.self?.id) {
      console.log("[LoungePinning] Breakout: Self is pinned, looking for main area participant...", {
        selfId: dyteMeeting?.self?.id,
        selfName: dyteMeeting?.self?.name,
        pinnedId: p.id,
        isBreakout
      });

      // First, try to find participants in the main area (not occupying lounge)
      // Use participants array which has lounge status information
      const mainAreaParticipants = participants.filter(
        x =>
          x.id !== dyteMeeting?.self?.id &&
          !x.isOccupyingLounge && // Show only main area participants
          x.id
      );

      console.log("[LoungePinning] Breakout: Main area participants available:", mainAreaParticipants.map(x => ({ id: x.id, name: x.name })));

      if (mainAreaParticipants.length > 0) {
        console.log("[LoungePinning] Breakout: Switching from self to main area participant:", mainAreaParticipants[0].name);
        p = mainAreaParticipants[0];
      } else {
        // No main area participants - fallback to other lounge participants
        const otherLoungeParticipants = getJoinedParticipants().filter(x => x.id !== dyteMeeting?.self?.id);
        console.log("[LoungePinning] Breakout: No main area participants, other lounge participants:", otherLoungeParticipants.map(x => ({ id: x.id, name: x.name })));
        if (otherLoungeParticipants.length > 0) {
          console.log("[LoungePinning] Breakout: Showing other lounge participant:", otherLoungeParticipants[0].name);
          p = otherLoungeParticipants[0];
        } else {
          console.log("[LoungePinning] Breakout: No other participants available, keeping self");
          // Keep showing self if no other participants available
        }
      }
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
    const result = fresh || p;

    // Debug: Log what we're about to return
    if (fresh) {
      console.log("[latestPinnedHost] Using fresh version:", {
        id: fresh.id,
        name: fresh.name,
        videoEnabled: fresh.videoEnabled,
      });
    } else {
      console.log("[latestPinnedHost] Using fallback (no fresh version):", {
        id: p.id,
        name: p.name,
        videoEnabled: p.videoEnabled,
      });
    }

    return result;
  }, [pinnedHost, participantsTick, getJoinedParticipants, isBreakout, dyteMeeting?.self, camOn, isHost, participants]);

  // Pinned “host” view data
  const meetingMeta = useMemo(
    () => ({
      title: eventTitle,
      live: dbStatus === "live",
      timer: joinElapsedLabel,
      recording: true,
      roomLabel: isBreakout ? "Breakout" : "Pinned",
      host: {
        name: latestPinnedHost?.name || (isBreakout ? "Breakout Room" : "Waiting for host"),
        role: latestPinnedHost ? (isBreakout ? "Member" : "Host") : (isBreakout ? "Member" : "Disconnected"),
      },
    }),
    [eventTitle, dbStatus, latestPinnedHost, joinElapsedLabel, isBreakout]
  );
  const meeting = meetingMeta;

  const currentRoomLabel = useMemo(() => {
    if (!isBreakout) return "Main Room";
    if (activeTableName) return activeTableName;
    if (activeTableId) return `Room ${activeTableId}`;
    return "Breakout Room";
  }, [activeTableId, activeTableName, isBreakout]);


  const handleQuickSwitch = async (targetId) => {
    closeQuickSwitchMenu();
    if (targetId === "main") {
      if (isBreakout) await handleLeaveBreakout();
      return;
    }
    if (targetId && String(targetId) === String(activeTableId) && isBreakout) return;
    await handleEnterBreakout(targetId);
  };

  // ✅ Use 'latestPinnedHost' instead of 'pinnedHost'
  const pinnedRaw = latestPinnedHost?._raw || latestPinnedHost || null;

  const pinnedIsSelf = Boolean(pinnedRaw?.id && dyteMeeting?.self?.id && pinnedRaw.id === dyteMeeting.self.id);

  // ✅ Now this will correctly see 'true' when the host turns the camera on
  const pinnedHasVideo = Boolean(pinnedRaw?.videoEnabled);

  // Debug: Log when pinnedRaw changes
  useEffect(() => {
    console.log(
      "[pinnedRaw] Changed to:",
      pinnedRaw?.id,
      "(",
      pinnedRaw?.name,
      ")",
      "videoEnabled:",
      pinnedRaw?.videoEnabled
    );
  }, [pinnedRaw?.id, pinnedRaw?.name, pinnedRaw?.videoEnabled]);



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
  // ✅ Also show meeting if in breakout/lounge room (post-event)
  const shouldShowMeeting = role === "publisher" || roomJoined || hostJoined || dbStatus === "live" || isBreakout;
  const hasMainToken = Boolean(mainAuthTokenRef.current || authToken);
  // ✅ Show gate/lounge if in pre-event lounge and (for hosts) haven't chosen main yet
  // Allow breakout display if loungeOpen (user joined a table)
  // Hosts see gate initially (!hostChoiceMade=true) or when they've chosen lounge (hostChoseLoungeOnly=true)
  const shouldShowPreEventLoungeGate =
    preEventLoungeOpen && !joinMainRequested &&
    (role !== "publisher" || !hostChoiceMade || hostChoseLoungeOnly) &&
    (!isBreakout || loungeOpen);

  const handleJoinMainMeeting = useCallback(() => {
    setJoinMainRequested(true);
    setJoinError("");
    setWaitingRoomActive(false);
    setLoadingJoin(true);
    setJoinRequestTick((v) => v + 1);
  }, []);

  const handleHostChooseMainMeeting = useCallback(() => {
    console.log("[LiveMeeting] Host clicked 'Join as Host' - opening confirmation dialog");
    setPendingHostChoice("main");
    setHostChoiceDialogOpen(true);
  }, []);

  const handleHostChooseLoungeOnly = useCallback(() => {
    console.log("[LiveMeeting] Host clicked 'Join Social Lounge' - opening confirmation dialog");
    setPendingHostChoice("lounge");
    setHostChoiceDialogOpen(true);
  }, []);

  const handleConfirmHostChoice = useCallback(() => {
    console.log("[LiveMeeting] Host confirmed choice:", pendingHostChoice);
    if (pendingHostChoice === "main") {
      setHostChoiceMade(true);
      setHostChoseLoungeOnly(false);
      setJoinMainRequested(true);
      setJoinError("");
      setWaitingRoomActive(false);
      setLoadingJoin(true);
      setJoinRequestTick((v) => v + 1);
    } else if (pendingHostChoice === "lounge") {
      setHostChoiceMade(true);
      setHostChoseLoungeOnly(true);
      setLoadingJoin(false);
      setLoungeOpen(true);
      // CRITICAL: Do NOT set joinMainRequested - keeps main meeting isolated
    }
    setHostChoiceDialogOpen(false);
    setPendingHostChoice(null);
  }, [pendingHostChoice]);

  const handleCancelHostChoice = useCallback(() => {
    console.log("[LiveMeeting] Host cancelled choice dialog");
    setHostChoiceDialogOpen(false);
    setPendingHostChoice(null);
  }, []);

  // Back behavior (same as old intent)
  const handleBack = () => {
    if (isEventOwner || (role === "publisher" && !eventData?.created_by_id)) navigate("/admin/events");
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
  const [chatEditId, setChatEditId] = useState(null);
  const [chatEditBody, setChatEditBody] = useState("");
  const [chatEditSaving, setChatEditSaving] = useState(false);
  const [chatDeleteOpen, setChatDeleteOpen] = useState(false);
  const [chatDeleteTarget, setChatDeleteTarget] = useState(null);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [qnaUnreadCount, setQnaUnreadCount] = useState(0);

  // ✅ Private chat unread (per user)
  const [privateUnreadByUserId, setPrivateUnreadByUserId] = useState({});
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

  const ensureSeatedInLounge = useCallback(async () => {
    if (!eventId) return null;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/lounge/ensure-seated/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ table_id: activeTableId || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn("[LoungeSeat] Failed to ensure seated:", data?.detail || "Unknown error");
        throw new Error(data?.detail || "Failed to seat in lounge.");
      }
      console.log("[LoungeSeat] User seated:", data);
      return data;
    } catch (error) {
      console.warn("[LoungeSeat] Error ensuring seated:", error?.message || error);
      throw error;
    }
  }, [eventId, activeTableId]);

  const ensureLoungeConversation = useCallback(async () => {
    if (!activeTableId) return null;

    // First ensure user is seated in the lounge
    try {
      await ensureSeatedInLounge();
    } catch (error) {
      throw new Error("Must be seated in lounge to access chat.");
    }

    const attemptEnsure = async () => {
      const res = await fetch(toApiUrl("messaging/conversations/ensure-lounge/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ table_id: activeTableId, title: activeRoomLabel }),
      });
      const data = await res.json().catch(() => null);
      return { res, data };
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { res, data } = await attemptEnsure();
      if (res.ok) {
        const cid = data?.id;
        if (!cid) throw new Error("Room chat conversation missing.");
        setRoomChatConversationId(cid);
        return cid;
      }
      lastError = data?.detail || "Failed to open room chat.";
      if (res.status !== 403) break;
      // Seat creation can race join_table; re-ensure and retry briefly
      try {
        await ensureSeatedInLounge();
      } catch {}
      await sleep(350);
    }

    throw new Error(lastError || "Failed to open room chat.");
  }, [activeRoomLabel, activeTableId, ensureSeatedInLounge]);

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
      if (!getToken()) return;

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
      if (!getToken()) return;

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
      if (!getToken()) return;

      try {
        const unread = await fetchChatUnread();

        // If user is actively viewing chat, auto-refresh and clear unread
        if (isChatActive) {
          try {
            const cid = activeChatConversationId || (await ensureActiveConversation());
            if (cid) {
              await fetchChatMessages(cid);
              await markChatAllRead(cid);
            }
          } catch (error) {
            // Handle "not seated in room" error gracefully - user may still be joining the lounge
            if (error?.message?.includes("not seated")) {
              console.debug("[ChatSync] User not yet seated in lounge, skipping chat sync");
              return; // Skip this tick, will retry next time
            }
            // Log other errors but don't crash
            console.warn("[ChatSync] Failed to ensure conversation:", error?.message || error);
          }
        }
      } catch (error) {
        console.warn("[ChatSync] Tick failed:", error?.message || error);
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

  const updateChatMessage = useCallback(
    async (messageId, body) => {
      const cid = activeChatConversationId;
      if (!cid || !messageId) return;
      const trimmed = String(body || "").trim();
      if (!trimmed) return;
      setChatEditSaving(true);
      try {
        const res = await fetch(
          toApiUrl(`messaging/conversations/${cid}/messages/${messageId}/`),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ body: trimmed }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Failed to edit message.");
        setChatMessages((prev) =>
          prev.map((m) => (String(m.id) === String(messageId) ? { ...m, body: data.body } : m))
        );
        await fetchChatMessages(cid);
        setChatEditId(null);
        setChatEditBody("");
      } catch (e) {
        setChatError(e?.message || "Failed to edit message.");
      } finally {
        setChatEditSaving(false);
      }
    },
    [activeChatConversationId, fetchChatMessages]
  );

  const deleteChatMessage = useCallback(
    async (messageId) => {
      const cid = activeChatConversationId;
      if (!cid || !messageId) return;
      const res = await fetch(
        toApiUrl(`messaging/conversations/${cid}/messages/${messageId}/`),
        {
          method: "DELETE",
          headers: { ...authHeader() },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setChatError(data?.detail || "Failed to delete message.");
        return;
      }
      setChatMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
      await fetchChatMessages(cid);
    },
    [activeChatConversationId, fetchChatMessages]
  );

  const flagChatMessage = useCallback(
    async (messageId) => {
      const cid = activeChatConversationId;
      if (!cid || !messageId) return;
      const res = await fetch(
        toApiUrl(`messaging/conversations/${cid}/messages/${messageId}/flag/`),
        {
          method: "POST",
          headers: { ...authHeader() },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setChatError(data?.detail || "Failed to flag message.");
        return;
      }
      setChatMessages((prev) =>
        prev.map((m) => (String(m.id) === String(messageId) ? { ...m, is_flagged_by_me: true } : m))
      );
      await fetchChatMessages(cid);
    },
    [activeChatConversationId, fetchChatMessages]
  );

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

  // Editing state
  const [qnaEditingId, setQnaEditingId] = useState(null);
  const [qnaEditContent, setQnaEditContent] = useState("");

  // Delete confirmation
  const [qnaDeleteId, setQnaDeleteId] = useState(null);

  const loadQuestions = useCallback(async (opts = {}) => {
    if (!eventId) return;
    const { silent = false } = opts;
    if (!silent) setQnaLoading(true);
    setQnaError("");

    try {
      const res = await fetch(toApiUrl(`interactions/questions/?event_id=${encodeURIComponent(eventId)}`), {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) throw new Error("Failed to load questions.");
      const data = await res.json();

      // Map questions and ensure visibility fields are present
      const mapped = (data || []).map(q => ({
        ...q,
        is_hidden: q.is_hidden || false,
        hidden_by: q.hidden_by || null,
        hidden_at: q.hidden_at || null
      }));

      setQuestions(mapped);
    } catch (e) {
      setQnaError(e.message || "Failed to load questions.");
    } finally {
      if (!silent) setQnaLoading(false);
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

        if (msg.type === "qna.update") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? { ...q, content: msg.content }
                : q
            )
          );
        }

        if (msg.type === "qna.delete") {
          setQuestions((prev) => prev.filter((q) => q.id !== msg.question_id));
        }

        if (msg.type === "qna.visibility_change") {
          const { question_id, is_hidden, hidden_by, hidden_at } = msg;
          console.log("[WS] Question visibility changed:", question_id, is_hidden);
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === question_id
                ? { ...q, is_hidden, hidden_by, hidden_at }
                : q
            )
          );
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

  const handleQnaEditSubmit = async (qId) => {
    if (!qnaEditContent.trim()) return;

    try {
      const res = await fetch(toApiUrl(`interactions/questions/${qId}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ content: qnaEditContent.trim() }),
      });

      if (!res.ok) throw new Error("Failed to edit");

      setQnaEditingId(null);
      setQnaEditContent("");
    } catch (e) {
      setQnaError("Failed to edit question");
    }
  };

  const handleQnaDelete = (qId) => {
    setQnaDeleteId(qId);
  };

  const confirmQnaDelete = async () => {
    if (!qnaDeleteId) return;
    try {
      const res = await fetch(toApiUrl(`interactions/questions/${qnaDeleteId}/`), {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setQnaDeleteId(null);
    } catch (e) {
      setQnaError("Failed to delete question");
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
      if (isHost) {
        await loadQuestions({ silent: true });
      }
    } catch (e) {
      setQnaError(e.message || "Failed to update vote.");
    }
  };

  const toggleQuestionVisibility = async (questionId) => {
    setQnaError("");
    try {
      const res = await fetch(toApiUrl(`interactions/questions/${questionId}/toggle_visibility/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.detail || "Failed to toggle visibility.");
      }
      const updated = await res.json();
      console.log("[Q&A] Visibility toggled:", updated);

      // Update local state optimistically
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, is_hidden: updated.is_hidden, hidden_by: updated.hidden_by, hidden_at: updated.hidden_at }
            : q
        )
      );
    } catch (e) {
      setQnaError("Error toggling visibility: " + (e.message || "Unknown error"));
    }
  };

  // Sort: highest votes on top, then newest
  // Filter: hide hidden questions for non-hosts
  const qaSorted = useMemo(() => {
    let arr = [...questions];

    // Filter hidden questions for non-hosts
    if (!isHost) {
      arr = arr.filter((q) => !q.is_hidden);
    }

    // Sort by upvotes first, then by timestamp
    arr.sort((a, b) => (b.upvote_count ?? 0) - (a.upvote_count ?? 0) || (new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    return arr;
  }, [questions, isHost]);

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
    const hostId = hostIdRef.current || pinnedHost?.id || hostIdHint || (isHost ? dyteMeeting?.self?.id : null);
    const hostUserKey = hostUserKeyRef.current;
    const hostFromKey = hostUserKey
      ? participants.find((p) => getParticipantUserKey(p?._raw || p) === hostUserKey)
      : null;
    const hostIdExists = hostId ? participants.some((p) => p.id === hostId) : false;
    const effectiveHostId = hostIdExists ? hostId : (hostFromKey?.id || null);

    const host = effectiveHostId
      ? participants.filter((p) => p.id === effectiveHostId && p.inMeeting)
      : participants.filter((p) => p.role === "Host" && p.inMeeting); // ✅ Don't filter by isOccupyingLounge for host (they may be in transition)

    const audience = effectiveHostId
      ? participants.filter((p) => p.id !== effectiveHostId && p.inMeeting && (isBreakout || !p.isOccupyingLounge)) // ✅ filter lounge occupants out of main room
      : participants.filter((p) => p.role !== "Host" && p.inMeeting && (isBreakout || !p.isOccupyingLounge));

    return { host, speakers: [], audience };
  }, [participants, pinnedHost, hostIdHint, isHost, dyteMeeting?.self?.id, isBreakout]);

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

  const RIGHT_PANEL_W = 460;
  const APPBAR_H = 44;

  // Others only (Audience + Speaker), host is pinned already
  const stageOthers = useMemo(() => {
    const pinnedKey = latestPinnedHost ? getParticipantUserKey(latestPinnedHost?._raw || latestPinnedHost) : "";
    if (isBreakout) {
      // In breakout, everyone is a peer. Hide only the person currently occupying the main stage.
      return participants.filter((p) => {
        if (!p.inMeeting) return false;
        if (p.id === latestPinnedHost?.id) return false;
        const key = getParticipantUserKey(p?._raw || p);
        if (pinnedKey && key && key === pinnedKey) return false;
        return true;
      });
    }
    // Main meeting: Show everyone else in the strip EXCEPT the person pinned on stage
    // (So if there are multiple hosts, they show up here)
    return participants.filter((p) => {
      if (!p.inMeeting) return false;
      if (p.id === latestPinnedHost?.id) return false;
      const key = getParticipantUserKey(p?._raw || p);
      if (pinnedKey && key && key === pinnedKey) return false;
      if (!isBreakout && p.isOccupyingLounge) return false;
      return true;
    });
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
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
                                {formatChatTime(m.created_at)}
                              </Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                {isHost && m.is_flagged && (
                                  <IconButton
                                    size="small"
                                    aria-label="Flagged message"
                                    sx={{ color: "#f59e0b" }}
                                  >
                                    <FlagOutlinedIcon fontSize="small" />
                                  </IconButton>
                                )}
                                {(m.mine || isHost) && (
                                  <IconButton
                                    size="small"
                                    aria-label="Edit message"
                                    onClick={() => {
                                      setChatEditId(m.id);
                                      setChatEditBody(m.body || "");
                                    }}
                                  >
                                    <EditRoundedIcon fontSize="small" />
                                  </IconButton>
                                )}
                                {(m.mine || isHost) && (
                                  <IconButton
                                    size="small"
                                    aria-label="Delete message"
                                    onClick={() => {
                                      setChatDeleteTarget(m.id);
                                      setChatDeleteOpen(true);
                                    }}
                                  >
                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                  </IconButton>
                                )}
                                {!isHost && !m.mine && (
                                  <IconButton
                                    size="small"
                                    aria-label="Flag message"
                                    onClick={() => flagChatMessage(m.id)}
                                    sx={{
                                      color: m.is_flagged_by_me ? "#f59e0b" : "inherit",
                                      fontWeight: m.is_flagged_by_me ? 700 : 400,
                                    }}
                                  >
                                    <FlagOutlinedIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Stack>
                            </Stack>
                          </Stack>
                          {chatEditId === m.id ? (
                            <Box sx={{ mt: 1 }}>
                              <TextField
                                fullWidth
                                size="small"
                                value={chatEditBody}
                                onChange={(e) => setChatEditBody(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    updateChatMessage(m.id, chatEditBody);
                                  }
                                }}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    bgcolor: "rgba(255,255,255,0.03)",
                                    borderRadius: 2,
                                  },
                                }}
                              />
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setChatEditId(null);
                                    setChatEditBody("");
                                  }}
                                  sx={{ textTransform: "none" }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => updateChatMessage(m.id, chatEditBody)}
                                  disabled={chatEditSaving || !chatEditBody.trim()}
                                  sx={{ textTransform: "none" }}
                                >
                                  {chatEditSaving ? "Saving..." : "Save"}
                                </Button>
                              </Stack>
                            </Box>
                          ) : (
                            <Typography sx={{ mt: 0.5, fontSize: 13, opacity: 0.9 }}>{m.body}</Typography>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  <Box ref={chatBottomRef} />
                </Box>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                <Box sx={{ p: 2 }}>
                  {isBreakout && !isRoomChatActive && !preEventLoungeOpen ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Public chat is disabled while you are in a breakout room. Return to the main room to participate.
                    </Alert>
                  ) : (
                    <TextField
                      fullWidth
                      placeholder={
                        isRoomChatActive
                          ? "Type to room..."
                          : preEventLoungeOpen && isBreakout
                            ? "Connecting to lounge chat..."
                            : "Type a message..."
                      }
                      size="small"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage();
                        }
                      }}
                      disabled={preEventLoungeOpen && isBreakout && !isRoomChatActive}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              aria-label="Send message"
                              onClick={sendChatMessage}
                              disabled={chatSending || !chatInput.trim() || (preEventLoungeOpen && isBreakout && !isRoomChatActive)}
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
                  )}
                </Box>
              </TabPanel>
            )}

            <Dialog
              open={chatDeleteOpen}
              onClose={() => {
                setChatDeleteOpen(false);
                setChatDeleteTarget(null);
              }}
              maxWidth="xs"
              fullWidth
              PaperProps={MODAL_PAPER_PROPS}
            >
              <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete message?</DialogTitle>
              <DialogContent>
                <Typography sx={{ color: "rgba(255,255,255,0.7)" }}>
                  This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() => {
                    setChatDeleteOpen(false);
                    setChatDeleteTarget(null);
                  }}
                  sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    if (chatDeleteTarget) deleteChatMessage(chatDeleteTarget);
                    setChatDeleteOpen(false);
                    setChatDeleteTarget(null);
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

            {/* Q&A Delete Dialog */}
            <Dialog
              open={Boolean(qnaDeleteId)}
              onClose={() => setQnaDeleteId(null)}
              PaperProps={MODAL_PAPER_PROPS}
            >
              <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete question?</DialogTitle>
              <DialogContent>
                <Typography sx={{ color: "rgba(255,255,255,0.7)" }}>
                  This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() => setQnaDeleteId(null)}
                  sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmQnaDelete}
                  sx={{ textTransform: "none" }}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>

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
                      const canViewVoters = isHost;

                      // Check if self
                      const self = dyteMeeting?.self;
                      const selfCsid = self?.clientSpecificId || self?.customParticipantId;
                      // Fallback to myUserIdRef if CSID not available/matching
                      const meId = myUserIdRef.current;

                      // API returns 'user' (int or obj), WS returns 'user_id' (int/str)
                      let qUserId = q.user_id ?? q.user;
                      if (typeof qUserId === 'object' && qUserId) qUserId = qUserId.id;

                      const isSelfQuestion = (selfCsid && String(selfCsid) === String(qUserId)) || (meId && String(meId) === String(qUserId));

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

                      const canManage = isHost || isSelfQuestion;
                      const isEditing = qnaEditingId === q.id;

                      return (
                        <Paper
                          key={q.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            bgcolor: q.is_hidden
                              ? "rgba(251, 191, 36, 0.08)"
                              : "rgba(255,255,255,0.03)",
                            borderColor: q.is_hidden
                              ? "rgba(251, 191, 36, 0.3)"
                              : "rgba(255,255,255,0.08)",
                            borderRadius: 2,
                            position: "relative",
                            ...(q.is_hidden && {
                              "&::before": {
                                content: '"HIDDEN"',
                                position: "absolute",
                                top: 8,
                                right: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#fbbf24",
                                bgcolor: "rgba(251, 191, 36, 0.15)",
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                border: "1px solid rgba(251, 191, 36, 0.3)"
                              }
                            })
                          }}
                        >
                          {isEditing ? (
                            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleQnaEditSubmit(q.id); }}>
                              <TextField
                                fullWidth
                                size="small"
                                autoFocus
                                value={qnaEditContent}
                                onChange={(e) => setQnaEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setQnaEditingId(null);
                                  }
                                }}
                                sx={{
                                  mb: 1,
                                  "& .MuiOutlinedInput-root": {
                                    color: "#fff",
                                    bgcolor: "rgba(255,255,255,0.1)",
                                    "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                                  }
                                }}
                              />
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  onClick={() => setQnaEditingId(null)}
                                  sx={{ color: "rgba(255,255,255,0.7)" }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" size="small" variant="contained">
                                  Save
                                </Button>
                              </Stack>
                            </Box>
                          ) : (
                            <>
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Question</Typography>

                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Tooltip
                                    arrow
                                    placement="left"
                                    onOpen={() => {
                                      if (isHost) loadQuestions({ silent: true });
                                    }}
                                    title={
                                      canViewVoters ? (
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
                                      ) : hasVoted ? (
                                        "Remove your vote"
                                      ) : (
                                        "Vote for this question"
                                      )
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

                              <Typography sx={{ mt: 0.75, fontSize: 13, opacity: 0.92, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{q.content}</Typography>

                              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                                <Chip size="small" label={`Asked by ${askedBy}`} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />

                                {canManage && (
                                  <Stack direction="row" spacing={0}>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setQnaEditingId(q.id);
                                        setQnaEditContent(q.content);
                                      }}
                                      sx={{ color: "rgba(255,255,255,0.5)", p: 0.5 }}
                                    >
                                      <EditRoundedIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    {isHost && (
                                      <Tooltip title={q.is_hidden ? "Unhide Question" : "Hide Question"}>
                                        <IconButton
                                          size="small"
                                          onClick={() => toggleQuestionVisibility(q.id)}
                                          sx={{
                                            color: q.is_hidden ? "rgba(251, 191, 36, 0.7)" : "rgba(255,255,255,0.5)",
                                            p: 0.5,
                                            "&:hover": {
                                              color: q.is_hidden ? "#fbbf24" : "rgba(255,255,255,0.9)"
                                            }
                                          }}
                                        >
                                          {q.is_hidden ? <VisibilityIcon sx={{ fontSize: 16 }} /> : <VisibilityOffIcon sx={{ fontSize: 16 }} />}
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <IconButton
                                      size="small"
                                      onClick={() => handleQnaDelete(q.id)}
                                      sx={{ color: "rgba(255,255,255,0.5)", p: 0.5 }}
                                    >
                                      <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Stack>
                                )}
                              </Stack>
                            </>
                          )}
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
                                {/* MIC ICON - GREEN when ON, RED when OFF - Read Only */}
                                <Tooltip title={m.mic ? "Mic on" : "Mic off"}>
                                  <IconButton
                                    size="small"
                                    disabled
                                    sx={{
                                      bgcolor: m.mic ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                      border: "1px solid",
                                      borderColor: m.mic ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                      color: m.mic ? "#22c55e" : "#ef4444",
                                      padding: "6px",
                                      "&:hover": {
                                        bgcolor: m.mic ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                      }
                                    }}
                                  >
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>

                                {/* CAMERA ICON - GREEN when ON, RED when OFF - Read Only */}
                                <Tooltip title={m.cam ? "Camera on" : "Camera off"}>
                                  <IconButton
                                    size="small"
                                    disabled
                                    sx={{
                                      bgcolor: m.cam ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                      border: "1px solid",
                                      borderColor: m.cam ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                      color: m.cam ? "#22c55e" : "#ef4444",
                                      padding: "6px",
                                      "&:hover": {
                                        bgcolor: m.cam ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                      }
                                    }}
                                  >
                                    {m.cam ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
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

                  {isHost && eventData?.waiting_room_enabled && (
                    <Box ref={waitingSectionRef}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8 }}>
                          WAITING ({filteredWaitingRoomCount})
                        </Typography>
                      </Stack>

                      {/* Global Waiting Room Actions */}
                      {filteredWaitingRoomCount > 0 && (
                        <Stack direction="row" spacing={1} sx={{ mb: 1.5, gap: 0.75, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={admitAllWaiting}
                            sx={{
                              bgcolor: "rgba(34, 197, 94, 0.8)",
                              color: "white",
                              fontSize: 11,
                              fontWeight: 700,
                              py: 0.75,
                              px: 1.5,
                              textTransform: 'none',
                              borderRadius: 1,
                              '&:hover': {
                                bgcolor: "rgba(34, 197, 94, 1)",
                              }
                            }}
                          >
                            Admit All
                          </Button>

                          {/* ✅ NEW: Send Announcement Button */}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AnnouncementIcon sx={{ fontSize: 14 }} />}
                            onClick={() => {
                              // ✅ Open proper Material-UI dialog
                              setAnnouncementDialogOpen(true);
                              setAnnouncementText("");
                            }}
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              py: 0.75,
                              px: 1.5,
                              textTransform: 'none',
                              borderRadius: 1,
                              color: "rgba(100, 200, 255, 1)",
                              borderColor: "rgba(100, 200, 255, 0.5)",
                              '&:hover': {
                                bgcolor: "rgba(100, 200, 255, 0.1)",
                                borderColor: "rgba(100, 200, 255, 0.8)",
                              }
                            }}
                          >
                            Announce
                          </Button>
                        </Stack>
                      )}
                      <Paper
                        variant="outlined"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.03)",
                          borderColor: "rgba(255,255,255,0.08)",
                          borderRadius: 2,
                        }}
                      >
                        {filteredWaitingRoomCount === 0 ? (
                          <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
                              No one waiting
                            </Typography>
                          </Box>
                        ) : (
                          <Stack spacing={1}>
                            {(filteredWaitingRoomQueue || []).map((w) => (
                              <Box
                                key={w.id || `${w.user_id}-${w.joined_at || w.created_at || ""}`}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 1.25,
                                  px: 1.25,
                                  py: 1,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                {/* Avatar */}
                                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.14)", flexShrink: 0 }}>
                                  {initialsFromName(w.name || "User")}
                                </Avatar>

                                {/* Name and Buttons in vertical stack */}
                                <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.75}>
                                  {/* Participant name */}
                                  <Typography
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: 13,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    noWrap
                                  >
                                    {w.name || "User"}
                                  </Typography>

                                  {/* Action buttons below name */}
                                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => admitWaitingUser(w.user_id)}
                                      sx={{
                                        fontSize: 10,
                                        color: "rgba(255,255,255,0.85)",
                                        borderColor: "rgba(255,255,255,0.25)",
                                        py: 0.25,
                                        px: 1,
                                        height: 24,
                                        flexShrink: 0,
                                      }}
                                    >
                                      Admit
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => rejectWaitingUser(w.user_id)}
                                      sx={{
                                        fontSize: 10,
                                        color: "rgba(239, 68, 68, 0.9)",
                                        py: 0.25,
                                        px: 1,
                                        height: 24,
                                        flexShrink: 0,
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Paper>
                    </Box>
                  )}

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
                                {/* MIC ICON - GREEN when ON, RED when OFF - Clickable for Host */}
                                <Tooltip title={isHost && !isSelfMember(m) ? (m.mic ? "Mute" : "Unmute") : (m.mic ? "Mic on" : "Mic off")}>
                                  <IconButton
                                    size="small"
                                    onClick={isHost && !isSelfMember(m) ? () => forceMuteParticipant(m) : undefined}
                                    disabled={!isHost || isSelfMember(m)}
                                    sx={{
                                      bgcolor: m.mic ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                      border: "1px solid",
                                      borderColor: m.mic ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                      color: m.mic ? "#22c55e" : "#ef4444",
                                      padding: "6px",
                                      cursor: (isHost && !isSelfMember(m)) ? "pointer" : "default",
                                      "&:hover": {
                                        bgcolor: m.mic ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                      }
                                    }}
                                  >
                                    {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>

                                {/* CAMERA ICON - GREEN when ON, RED when OFF - Clickable for Host */}
                                <Tooltip title={isHost && !isSelfMember(m) ? (m.cam ? "Turn camera off" : "Turn camera on") : (m.cam ? "Camera on" : "Camera off")}>
                                  <IconButton
                                    size="small"
                                    onClick={isHost && !isSelfMember(m) ? () => forceCameraOffParticipant(m) : undefined}
                                    disabled={!isHost || isSelfMember(m)}
                                    sx={{
                                      bgcolor: m.cam ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                      border: "1px solid",
                                      borderColor: m.cam ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                      color: m.cam ? "#22c55e" : "#ef4444",
                                      padding: "6px",
                                      cursor: (isHost && !isSelfMember(m)) ? "pointer" : "default",
                                      "&:hover": {
                                        bgcolor: m.cam ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                      }
                                    }}
                                  >
                                    {m.cam ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>

                                {/* KICK/BAN MENU for Host */}
                                {isHost && !isSelfMember(m) && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleOpenParticipantMenu(e, m)}
                                    sx={{ color: "rgba(255,255,255,0.7)" }}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
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
                                primary={<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{truncateDisplayName(m.name)}{isSelfMember(m) ? " (You)" : ""}</Typography>}
                                secondary={<Typography sx={{ fontSize: 12, opacity: 0.7 }}>Speaker</Typography>}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>

                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 12, opacity: 0.8 }}>
                      AUDIENCE ({groupedMembers.audience.length})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {isHost && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setBannedDialogOpen(true)}
                            sx={{
                              fontSize: 10,
                              color: "rgba(255,255,255,0.7)",
                              borderColor: "rgba(255,255,255,0.2)",
                              py: 0.2,
                              minWidth: "auto",
                              height: 24
                            }}
                          >
                            Bans
                          </Button>
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
                        </>
                      )}
                    </Stack>
                  </Stack>
                  <Paper variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                    <List dense disablePadding>
                      {audienceMembersSorted.map((m, idx) => (
                        <ListItem
                          key={idx}
                          disablePadding
                          secondaryAction={
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              {/* MIC ICON - GREEN when ON, RED when OFF - Clickable for Host */}
                              <Tooltip title={isHost && !isSelfMember(m) ? (m.mic ? "Mute" : "Unmute") : (m.mic ? "Mic on" : "Mic off")}>
                                <IconButton
                                  size="small"
                                  onClick={isHost && !isSelfMember(m) ? () => forceMuteParticipant(m) : undefined}
                                  disabled={!isHost || isSelfMember(m)}
                                  sx={{
                                    bgcolor: m.mic ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                    border: "1px solid",
                                    borderColor: m.mic ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                    color: m.mic ? "#22c55e" : "#ef4444",
                                    padding: "4px",
                                    cursor: (isHost && !isSelfMember(m)) ? "pointer" : "default",
                                    "&:hover": {
                                      bgcolor: m.mic ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                    }
                                  }}
                                >
                                  {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>

                              {/* CAMERA ICON - GREEN when ON, RED when OFF - Read-only for self, Clickable for Host on others */}
                              <Tooltip title={isHost && !isSelfMember(m) ? (m.cam ? "Turn camera off" : "Turn camera on") : (m.cam ? "Camera on" : "Camera off")}>
                                <IconButton
                                  size="small"
                                  onClick={(isHost && !isSelfMember(m)) ? () => forceCameraOffParticipant(m) : undefined}
                                  disabled={!isHost || isSelfMember(m)}
                                  sx={{
                                    bgcolor: m.cam ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                    border: "1px solid",
                                    borderColor: m.cam ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                    color: m.cam ? "#22c55e" : "#ef4444",
                                    padding: "4px",
                                    cursor: (isHost && !isSelfMember(m)) ? "pointer" : "default",
                                    opacity: isSelfMember(m) ? 0.6 : 1,
                                    "&:hover": {
                                      bgcolor: m.cam ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                    }
                                  }}
                                >
                                  {m.cam ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>

                              {/* MESSAGE ICON */}
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

                              {/* KICK/BAN MENU for Host */}
                              {isHost && !isSelfMember(m) && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleOpenParticipantMenu(e, m)}
                                  sx={{ color: "rgba(255,255,255,0.7)" }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              )}

                            </Stack>
                          }
                        >
                          <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1, pr: 14 }}>
                            <ListItemAvatar>
                              <Avatar src={m.picture} sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
                                {initialsFromName(m.name)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={<Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>{truncateDisplayName(m.name)}{isSelfMember(m) ? " (You)" : ""}</Typography>}
                              secondary={<Typography noWrap sx={{ fontSize: 12, opacity: 0.7 }}>Audience</Typography>}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
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
      {/* Speed Networking Icon (New) */}
      <Tooltip title="Networking" placement="left" arrow>
        <IconButton
          onClick={() => setShowSpeedNetworking(true)}
          sx={{
            width: 44,
            height: 44,
            bgcolor: showSpeedNetworking ? "rgba(20,184,177,0.15)" : "transparent",
            color: showSpeedNetworking ? "#14b8b1" : "rgba(255,255,255,0.55)",
            border: showSpeedNetworking ? "1px solid rgba(20,184,177,0.3)" : "1px solid transparent",
            "&:hover": { bgcolor: "rgba(20,184,177,0.08)", color: "#fff" },
            transition: "all 0.2s",
          }}
        >
          <Diversity3Icon />
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

  if (isBanned) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#070A10", color: "#fff", flexDirection: "column", gap: 2 }}>
        <Typography variant="h4" fontWeight={700} color="error">
          You are banned
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.7 }}>
          You have been banned from this meeting by the host.
        </Typography>
        <Button variant="outlined" color="inherit" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  // ✅ PRIORITY: Check pre-event lounge BEFORE loading screen
  // Pre-event lounge gate/overlay takes priority even if loadingJoin is true
  // This ensures users can join the lounge without waiting for main meeting token
  if (shouldShowPreEventLoungeGate) {
    return loungeOpen ? (
      <LoungeOverlay
        open
        onClose={() => setLoungeOpen(false)}
        eventId={eventId}
        currentUserId={getMyUserIdFromJwt()}
        isAdmin={role === "publisher"}
        onEnterBreakout={applyBreakoutToken}
        dyteMeeting={dyteMeeting}
        onParticipantClick={openLoungeParticipantInfo}
        onJoinMain={forceRejoinMainFromLounge}
      />
    ) : (
      <PreEventLoungeGate
        onBack={handleBack}
        eventTitle={eventTitle}
        scheduled={scheduledLabel}
        duration={durationLabel}
        roleLabel={role === "publisher" ? "Host" : "Audience"}
        waitingRoomImage={eventData?.waiting_room_image || null}
        timezone={eventData?.timezone || null}
        loungeAvailable={preEventLoungeOpen}
        loungeStatusLabel={loungeOpenStatus?.reason || "Pre-event networking"}
        isLoungeOpen={isLoungeCurrentlyOpen}
        onOpenLounge={() => setLoungeOpen(true)}
        onJoinMain={role === "publisher" ? handleHostChooseMainMeeting : handleJoinMainMeeting}
        isHost={role === "publisher"}
        onHostChooseLounge={handleHostChooseLoungeOnly}
        hostChoiceDialogOpen={hostChoiceDialogOpen}
        pendingHostChoice={pendingHostChoice}
        onConfirmHostChoice={handleConfirmHostChoice}
        onCancelHostChoice={handleCancelHostChoice}
      />
    );
  }

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



  if (waitingRoomActive && !isBreakout) {
    return (
      <>
        <WaitingRoomScreen
          onBack={handleBack}
          eventTitle={eventTitle}
          scheduled={scheduledLabel}
          duration={durationLabel}
          roleLabel={role === "publisher" ? "Host" : "Audience"}
          waitingRoomImage={eventData?.waiting_room_image || null}
          timezone={eventData?.timezone || null}
          loungeAvailable={(waitingRoomLoungeAllowed || waitingRoomNetworkingAllowed) && loungeOpenStatus?.status === "OPEN"}
          loungeStatusLabel={loungeOpenStatus?.reason || ""}
          onOpenLounge={() => setLoungeOpen(true)}
          isHost={role === "publisher"}
          eventId={eventId}
          waitingCount={filteredWaitingRoomCount || 0}
          announcementsRef={waitingRoomAnnouncementsRef}
        />
        <LoungeOverlay
          open={loungeOpen}
          onClose={() => setLoungeOpen(false)}
          eventId={eventId}
          currentUserId={getMyUserIdFromJwt()}
          isAdmin={role === "publisher"}
          onEnterBreakout={applyBreakoutToken}
          dyteMeeting={dyteMeeting}
          onParticipantClick={openLoungeParticipantInfo}
          onJoinMain={forceRejoinMainFromLounge}
        />
      </>
    );
  }

  if (!initDone || !dyteMeeting) {
    return <JoiningMeetingScreen onBack={handleBack} />;
  }

  // ✅ IMPORTANT: Check post-event lounge BEFORE checking shouldShowMeeting
  // This ensures post-event lounge screen always shows, never "Waiting for host"
  // If in post-event lounge mode, show the special screen
  // BUT if user joined a lounge table, show the actual lounge video instead
  if (isPostEventLounge && !isBreakout) {
    return (
      <DyteProvider value={dyteMeeting}>
        <div
          ref={remoteAudioRef}
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <DyteParticipantsAudio meeting={dyteMeeting} />
        </div>
        <PostEventLoungeScreen
          closingTime={postEventLoungeClosingTime}
          loungeTables={loungeOnlyTables}
          onJoinTable={(tableId, seatIndex) => {
            // ✅ Join lounge table - same as main lounge overlay
            mainSocketRef.current?.send(
              JSON.stringify({
                action: "join_table",
                table_id: tableId,
                seat_index: seatIndex,
              })
            );
            // Then get the token and enter the breakout room
            handleEnterBreakout(tableId);
          }}
          onLeaveTable={() => {
            mainSocketRef.current?.send(JSON.stringify({ action: "leave_table" }));
          }}
          currentUserId={getMyUserIdFromJwt()}
          myUsername={getUserName()}
          onExit={handleExitPostEventLounge}
          onParticipantClick={openLoungeParticipantInfo}
          loungeOpenStatus={loungeOpenStatus}
          isHost={role === "publisher"}
        />
      </DyteProvider>
    );
  }

  // ✅ Check if should show "Waiting for host" (not in post-event lounge)
  if (!shouldShowMeeting) {
    return (
      <WaitingForHost
        onBack={handleBack}
        eventTitle={eventTitle}
        scheduled={scheduledLabel}
        duration={durationLabel}
        roleLabel={role === "publisher" ? "Host" : "Audience"}
        waitingRoomImage={eventData?.waiting_room_image || null}
        timezone={eventData?.timezone || null}
      />
    );
  }

  return (
    <DyteProvider value={dyteMeeting}>
      {/* Wrap audio in a ref to capture all participant audio elements */}
      <div
        ref={remoteAudioRef}
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <DyteParticipantsAudio meeting={dyteMeeting} />
      </div>
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
              position: "relative",    // ✅ For absolute centering of timer
            }}
          >
            {/* ✅ Breakout Timer Centered in Header */}
            {breakoutTimer !== null && breakoutTimer > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: "rgba(0,0,0,0.6)", // Subtle background for contrast
                  px: 1,
                  py: 0.25,
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <AccessTimeRoundedIcon sx={{ fontSize: 16, color: breakoutTimer < 30 ? "#f44336" : "#4caf50" }} />
                <Typography variant="body2" fontWeight={700} sx={{ color: "white", fontVariantNumeric: "tabular-nums", minWidth: 40, textAlign: "center" }}>
                  {Math.floor(breakoutTimer / 60).toString().padStart(2, "0")}:{(breakoutTimer % 60).toString().padStart(2, "0")}
                </Typography>
              </Box>
            )}
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

            {isHost && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 0.5 }}>
                <Chip
                  size="small"
                  label={`Room: ${currentRoomLabel}`}
                  sx={{
                    bgcolor: isBreakout ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    "& .MuiChip-label": { fontWeight: 700, fontSize: 11 },
                    maxWidth: 180,
                  }}
                />

                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={openQuickSwitchMenu}
                  sx={{
                    textTransform: "none",
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    minWidth: 0,
                    px: 1.2,
                    "&:hover": { borderColor: "rgba(255,255,255,0.35)" },
                  }}
                >
                  Quick Switch
                </Button>

                {isBreakout && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<HomeRoundedIcon />}
                    onClick={handleLeaveBreakout}
                    sx={{
                      textTransform: "none",
                      bgcolor: "#14b8b1",
                      fontWeight: 700,
                      "&:hover": { bgcolor: "#0e8e88" },
                    }}
                  >
                    Return to Main
                  </Button>
                )}
              </Stack>
            )}

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
              <MenuItem onClick={handleKickParticipant}>
                <ListItemIcon>
                  <DirectionsWalkIcon fontSize="small" sx={{ color: "warning.main" }} />
                </ListItemIcon>
                <ListItemText>Kick User (Temp)</ListItemText>
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

        <Menu
          anchorEl={quickSwitchAnchorEl}
          open={quickSwitchOpen}
          onClose={closeQuickSwitchMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 220,
              bgcolor: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 2.5,
              overflow: "hidden",
              backdropFilter: "blur(12px)",
              color: "#fff",
              "& .MuiListItemText-primary": { color: "#fff" },
              "& .MuiListItemText-secondary": { color: "rgba(255,255,255,0.65)" },
            },
          }}
          MenuListProps={{
            sx: {
              "& .MuiMenuItem-root:hover": { bgcolor: "rgba(255,255,255,0.06)" },
            },
          }}
        >
          <MenuItem onClick={() => handleQuickSwitch("main")}>
            <ListItemText
              primary="Main Room"
              secondary={!isBreakout ? "You are here" : "Return to main"}
            />
          </MenuItem>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />
          {loungeTables.length === 0 ? (
            <MenuItem disabled>
              <ListItemText primary="No rooms yet" />
            </MenuItem>
          ) : (
            <>
              {breakoutOnlyTables.length > 0 && (
                <MenuItem disabled sx={{ opacity: "1 !important" }}>
                  <Typography variant="caption" sx={{ color: "#14b8b1", fontWeight: 800 }}>BREAKOUT SESSIONS</Typography>
                </MenuItem>
              )}
              {breakoutOnlyTables.map((table) => (
                <MenuItem
                  key={table.id}
                  onClick={() => handleQuickSwitch(table.id)}
                  selected={isBreakout && String(activeTableId) === String(table.id)}
                >
                  <ListItemText
                    primary={table.name}
                    secondary={isBreakout && String(activeTableId) === String(table.id) ? "You are here" : null}
                  />
                </MenuItem>
              ))}
              {loungeOnlyTables.length > 0 && (
                <MenuItem disabled sx={{ opacity: "1 !important", mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "#5a78ff", fontWeight: 800 }}>NETWORKING</Typography>
                </MenuItem>
              )}
              {loungeOnlyTables.map((table) => (
                <MenuItem
                  key={table.id}
                  onClick={() => handleQuickSwitch(table.id)}
                  selected={!isBreakout && String(activeTableId) === String(table.id)}
                >
                  <ListItemText
                    primary={table.name}
                    secondary={!isBreakout && String(activeTableId) === String(table.id) ? "You are here" : null}
                  />
                </MenuItem>
              ))}
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
                      key={pinnedRaw?.id}
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
                    {/* ✅ FIRST PARTICIPANT WELCOME SCREEN: Show when alone in breakout room */}
                    {isBreakout && !latestPinnedHost && breakoutParticipantCount <= 1 ? (
                      <>
                        {/* Show logo if available, otherwise show waving hand */}
                        {activeTableLogoUrl ? (
                          <Box
                            sx={{
                              width: 76,
                              height: 76,
                              borderRadius: "50%",
                              bgcolor: "rgba(255,255,255,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              border: "2px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            <Box
                              component="img"
                              src={activeTableLogoUrl}
                              alt="Social Lounge Logo"
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </Box>
                        ) : (
                          <Avatar
                            sx={{
                              width: 76,
                              height: 76,
                              fontSize: 22,
                              bgcolor: "rgba(255,255,255,0.12)",
                            }}
                          >
                            👋
                          </Avatar>
                        )}
                        <Typography sx={{ fontWeight: 800, fontSize: 18, textAlign: "center" }}>
                          Welcome to {activeTableName || "Social Lounge"}
                        </Typography>
                        <Typography sx={{ opacity: 0.7, fontSize: 13, textAlign: "center", maxWidth: "70%" }}>
                          You're the first one here. More participants may join you soon.
                        </Typography>
                      </>
                    ) : latestPinnedHost ? (
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
                    ) : isBreakout && breakoutParticipantCount > 1 ? (
                      <>
                        <Avatar
                          sx={{
                            width: 76,
                            height: 76,
                            fontSize: 22,
                            bgcolor: "rgba(255,255,255,0.12)",
                          }}
                        >
                          👥
                        </Avatar>
                        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                          Participants are in the room
                        </Typography>
                        <Typography sx={{ opacity: 0.7, fontSize: 13 }}>
                          Connecting to live tiles...
                        </Typography>
                      </>
                    ) : (
                      <>
                        {eventData?.cover_image ? (
                          <Box
                            sx={{
                              width: 200,
                              height: 150,
                              borderRadius: 2,
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              mb: 2,
                            }}
                          >
                            <Box
                              component="img"
                              src={eventData.cover_image}
                              alt="Event cover"
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </Box>
                        ) : (
                          <Avatar
                            sx={{
                              width: 76,
                              height: 76,
                              fontSize: 22,
                              bgcolor: "rgba(255,255,255,0.08)",
                            }}
                          >
                            H
                          </Avatar>
                        )}
                        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                          Host disconnected
                        </Typography>
                        <Typography sx={{ opacity: 0.7, fontSize: 13 }}>
                          Waiting for host to return
                        </Typography>
                      </>
                    )}
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

                <Tooltip title={!hostPerms.chat ? "Chat disabled by host" : "Chat"}>
                  <span>
                    <IconButton
                      onClick={() => {
                        // ✅ CHAT ICON: Toggle chat open/close
                        if (isChatActive) closeRightPanel();
                        else toggleRightPanel(0);
                      }}
                      sx={{
                        bgcolor: isChatActive ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                        "&:hover": { bgcolor: isChatActive ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                        opacity: hostPerms.chat ? 1 : 0.7,
                      }}
                      aria-label="Chat"
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

                <Tooltip title={isQnaActive ? "Close Q&A" : "Open Q&A"}>
                  <IconButton
                    onClick={() => {
                      // toggle behavior: if Q&A is open on tab=1, close panel
                      if (isQnaActive) closeRightPanel();
                      else toggleRightPanel(1);
                    }}
                    sx={{
                      bgcolor: isQnaActive ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                      "&:hover": { bgcolor: isQnaActive ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                    }}
                    aria-label="Q&A"
                  >
                    <Badge
                      variant="dot"
                      color="error"
                      overlap="circular"
                      invisible={!(qnaUnreadCount > 0 && !isQnaActive)}
                      anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      <QuestionAnswerIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={isPanelOpen && tab === 3 ? "Close Participants" : "Open Participants"}>
                  <IconButton
                    onClick={() => {
                      // toggle behavior: if Participants is open on tab=3, close panel
                      if (isPanelOpen && tab === 3) closeRightPanel();
                      else toggleRightPanel(3);
                    }}
                    sx={{
                      bgcolor: (isPanelOpen && tab === 3) ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                      "&:hover": { bgcolor: (isPanelOpen && tab === 3) ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                    }}
                    aria-label="Participants"
                  >
                    <Badge
                      variant="dot"
                      color="error"
                      overlap="circular"
                      invisible={!showMembersDot}
                      anchorOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      <GroupIcon />
                    </Badge>
                  </IconButton>
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
                    <SocialLoungeIcon />
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

                {/* ✅ Separate Side Panel Toggle */}
                <Tooltip title={isPanelOpen ? "Close Sidebar" : "Open Sidebar"}>
                  <IconButton
                    onClick={() => {
                      if (isPanelOpen) closeRightPanel();
                      else toggleRightPanel(tab); // Open to last used tab
                    }}
                    sx={{
                      bgcolor: isPanelOpen ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                      "&:hover": { bgcolor: isPanelOpen ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                      mx: 0.5
                    }}
                    aria-label="Toggle Sidebar"
                  >
                    <ViewSidebarIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Leave meeting">
                  <IconButton
                    onClick={async () => {
                      if (isHost) {
                        setLeaveDialogOpen(true);
                        return;
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

                {/* ✅ Leave Table Button (Only in Breakout) - Moved to right end with Label */}
                {isBreakout && (
                  <Button
                    variant="contained"
                    onClick={handleLeaveBreakout}
                    startIcon={<LogoutIcon />}
                    sx={{
                      ml: 1,
                      bgcolor: "#ef4444",
                      color: "white",
                      borderRadius: 10,
                      textTransform: "none",
                      fontWeight: 700,
                      px: 2,
                      "&:hover": { bgcolor: "#dc2626" },
                      whiteSpace: "nowrap"
                    }}
                  >
                    Leave Table
                  </Button>
                )}
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
          PaperProps={MODAL_PAPER_PROPS}
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

        {/* Host Leave / End Dialog */}
        <Dialog
          open={leaveDialogOpen}
          onClose={() => setLeaveDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={MODAL_PAPER_PROPS}
        >
          <DialogTitle sx={{ pb: 0, pt: 2, px: 2, fontWeight: 700, fontSize: 16 }}>
            Leave or end meeting?
          </DialogTitle>
          <DialogContent sx={{ px: 2, pb: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Leaving keeps the event running for attendees. Ending will close it for everyone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2, gap: 1, justifyContent: "space-between" }}>
            <Button
              variant="text"
              onClick={async () => {
                setLeaveDialogOpen(false);
                const myId = dyteMeeting?.self?.id;
                if (myId) {
                  try {
                    dyteMeeting?.participants?.broadcastMessage?.("meeting-ended", { hostId: myId });
                  } catch { }
                }
                await handleMeetingEnd("ended", { explicitEnd: true });
              }}
              sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#ef5350" } }}
            >
              End for all
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                setLeaveDialogOpen(false);
                await handleMeetingEnd("left");
              }}
              sx={{ flex: 1, fontWeight: 700 }}
            >
              Leave Meeting
            </Button>
          </DialogActions>
        </Dialog>

        {/* Device Settings Dialog */}
        <Dialog
          open={showDeviceSettings}
          onClose={() => setShowDeviceSettings(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={MODAL_PAPER_PROPS}
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

            {/* Speaker/Headphone Selection */}
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <VolumeUpIcon fontSize="small" />
                Speaker/Headphone
                {audioOutputDevices.length === 0 && (
                  <Chip label="Limited" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "rgba(255,152,0,0.2)", color: "#ffb74d" }} />
                )}
              </Typography>
              {audioOutputDevices.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.4, bgcolor: "rgba(255,152,0,0.1)", p: 1.5, borderRadius: 2, border: "1px solid rgba(255,152,0,0.2)" }}>
                  Speaker selection is limited in your browser. Please set your headset as system default output and refresh.
                </Typography>
              ) : (
                <>
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
                  <Typography sx={{ mt: 1, fontSize: 11, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                    Output will switch when audio starts playing.
                  </Typography>
                </>
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

        {/* Participant Action Menu */}
        <Menu
          anchorEl={participantMenuAnchor}
          open={Boolean(participantMenuAnchor)}
          onClose={handleCloseParticipantMenu}
          PaperProps={{
            sx: {
              bgcolor: "#1e293b",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              "& .MuiMenuItem-root": {
                fontSize: 13,
                py: 1.5
              },
              "& .MuiSvgIcon-root": {
                fontSize: 18
              }
            }
          }}
        >
          <MenuItem onClick={handleKickParticipant}>
            <ListItemIcon>
              <DirectionsWalkIcon fontSize="small" sx={{ color: "#f59e0b" }} />
            </ListItemIcon>
            <ListItemText>Kick User (Temp)</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleBanParticipant}>
            <ListItemIcon>
              <PersonRemoveIcon fontSize="small" sx={{ color: "#ef4444" }} />
            </ListItemIcon>
            <ListItemText>Ban User (Perm)</ListItemText>
          </MenuItem>
        </Menu>

        <BannedParticipantsDialog
          open={bannedDialogOpen}
          onClose={() => setBannedDialogOpen(false)}
          eventId={eventId}
          setOnlineUsers={setOnlineUsers}
        />

        {/* Kick Confirmation Dialog */}
        <Dialog
          open={kickConfirmOpen}
          onClose={() => setKickConfirmOpen(false)}
          PaperProps={MODAL_PAPER_PROPS}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Confirm Kick</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to kick <strong>{actionTargetUser?.name || "this user"}</strong>?
            </Typography>
            {actionTargetUser?.id && (
              <Typography variant="caption" sx={{ opacity: 0.5, display: "block", mt: 1 }}>
                ID: {actionTargetUser.id}
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setKickConfirmOpen(false)} sx={{ color: "rgba(255,255,255,0.7)" }}>
              Cancel
            </Button>
            <Button onClick={executeKick} variant="contained" color="error">
              Kick User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Ban Confirmation Dialog */}
        <Dialog
          open={banConfirmOpen}
          onClose={() => setBanConfirmOpen(false)}
          PaperProps={MODAL_PAPER_PROPS}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Confirm Ban</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to BAN <strong>{actionTargetUser?.name || "this user"}</strong>?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Banned users cannot rejoin this meeting.
            </Typography>
            {actionTargetUser?.id && (
              <Typography variant="caption" sx={{ opacity: 0.5, display: "block", mt: 1 }}>
                ID: {actionTargetUser.id}
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setBanConfirmOpen(false)} sx={{ color: "rgba(255,255,255,0.7)" }}>
              Cancel
            </Button>
            <Button onClick={executeBan} variant="contained" color="error">
              Ban User
            </Button>
          </DialogActions>
        </Dialog>
        <LoungeOverlay
          open={loungeOpen}
          onClose={() => setLoungeOpen(false)}
          eventId={eventId}
          currentUserId={getMyUserIdFromJwt()}
          isAdmin={isHost}
          dyteMeeting={dyteMeeting}
          onParticipantClick={openLoungeParticipantInfo}
          onEnterBreakout={async (newToken, tableId, tableName, logoUrl) => {
            await applyBreakoutToken(newToken, tableId, tableName, logoUrl); // ✅ Pass logo URL
          }}
          onJoinMain={forceRejoinMainFromLounge}
        />

        {/* ✅ Breakout Controls (Host Only) */}
        <BreakoutControls
          open={isBreakoutControlsOpen}
          onClose={() => setIsBreakoutControlsOpen(false)}
          onAction={(data) => {
            if (data?.action === "speed_networking_start") {
              // Legacy/confusing call - redirecting or ignoring. 
              // Ideally we shouldn't receive this from current UI anymore.
              console.warn("Received legacy speed networking start action");
              return;
            }
            if (data?.action === "speed_networking_stop") {
              stopSpeedNetworking({ announce: true }); // We can keep stop functionality just in case
              return;
            }
            sendMainSocketAction(data);
          }}
          onlineCount={onlineUsers.length}
          debugMessage={serverDebugMessage}
        // Removing these props from passing down as they are no longer handled by BreakoutControls UI
        // speedNetworkingActive={speedNetworkingActive}
        // speedNetworkingRound={speedNetworkingRound}
        // speedNetworkingTotalRounds={speedNetworkingTotalRounds}
        // speedNetworkingDurationMinutes={speedNetworkingDurationMinutes}
        />

        {/* ✅ Speed Networking Dialog */}
        <Dialog
          fullScreen
          open={showSpeedNetworking}
          onClose={() => setShowSpeedNetworking(false)}
          sx={{ zIndex: 1250 }} // Above lounge but below snackbars
        >
          <SpeedNetworkingZone
            eventId={eventId}
            isAdmin={isHost}
            onClose={() => setShowSpeedNetworking(false)}
            dyteMeeting={dyteMeeting}
            // Passing down the last WebSocket message to handle matching events
            lastMessage={lastMessage}
          />
        </Dialog>

        {/* ✅ Main Room Peek (when seated at a lounge table) */}
        {activeTableId && dyteMeeting && !isPostEventLounge && (
          <Box
            sx={{
              position: "fixed",
              bottom: 20,
              right: 20,
              zIndex: 1300,
              width: 280,
              height: 180,
            }}
          >
            <MainRoomPeek
              mainDyteMeeting={mainDyteMeeting}
              isInBreakout={isInBreakoutRoom}
              pinnedParticipantId={pinnedRaw?.id}
              loungeParticipantsData={participants.filter(p => p.isOccupyingLounge)}
            />
          </Box>
        )}

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

        {/* ✅ Global App Snackbar for Alerts */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            onClick={handleSnackbarClick}
            role={snackbar.onClick ? "button" : undefined}
            sx={{
              width: "100%",
              boxShadow: 3,
              cursor: snackbar.onClick ? "pointer" : "default",
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* ✅ NEW: Announcement Dialog */}
        <Dialog
          open={announcementDialogOpen}
          onClose={() => {
            setAnnouncementDialogOpen(false);
            setAnnouncementText("");
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "rgba(15, 23, 42, 0.90)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.10)",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 800,
              fontSize: 16,
              color: "rgba(255,255,255,0.92)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            📢 Send Announcement
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.65)",
                mb: 2,
                display: "block",
              }}
            >
              Send a message to all {filteredWaitingRoomCount} waiting participant(s)
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="e.g., 'We're running 5 minutes late. Thanks for your patience!'"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              maxRows={6}
              disabled={announcementSending}
              autoFocus
              InputProps={{
                sx: {
                  color: "rgba(255,255,255,0.85)",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.15)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.25)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(100, 200, 255, 0.5)",
                  },
                },
              }}
            />

            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.45)",
                mt: 1,
                display: "block",
                textAlign: "right",
              }}
            >
              {announcementText.length} / 1000 characters
            </Typography>
          </DialogContent>
          <DialogActions
            sx={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              pt: 2,
              pb: 2,
              px: 2.5,
              gap: 1,
            }}
          >
            <Button
              onClick={() => {
                setAnnouncementDialogOpen(false);
                setAnnouncementText("");
              }}
              disabled={announcementSending}
              sx={{
                color: "rgba(255,255,255,0.65)",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!announcementText.trim()) return;
                setAnnouncementSending(true);
                try {
                  await sendAnnouncement(announcementText);
                  setAnnouncementDialogOpen(false);
                  setAnnouncementText("");
                } finally {
                  setAnnouncementSending(false);
                }
              }}
              variant="contained"
              disabled={
                announcementSending || !announcementText.trim() || announcementText.length > 1000
              }
              startIcon={announcementSending ? <CircularProgress size={20} /> : <AnnouncementIcon />}
              sx={{
                bgcolor: "rgba(100, 200, 255, 0.8)",
                color: "#fff",
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                "&:hover": {
                  bgcolor: "rgba(100, 200, 255, 1)",
                },
                "&:disabled": {
                  bgcolor: "rgba(100, 200, 255, 0.3)",
                  color: "rgba(255,255,255,0.4)",
                },
              }}
            >
              {announcementSending ? "Sending..." : "Send"}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
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
