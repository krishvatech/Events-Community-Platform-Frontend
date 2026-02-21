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
  Popover,
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
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AnnouncementIcon from "@mui/icons-material/Announcement"; // ✅ NEW for waiting room announcements
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded"; // <--- ADDED
import CheckRoundedIcon from "@mui/icons-material/CheckRounded"; // <--- ADDED
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded"; // <--- ADDED for KYC verified badge
import ShuffleIcon from "@mui/icons-material/Shuffle"; // Keep this if used elsewhere
import Diversity3Icon from "@mui/icons-material/Diversity3"; // New icon for Networking
import CoffeeIcon from "@mui/icons-material/Coffee"; // Break Mode icon
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

import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDyteClient, DyteProvider } from "@dytesdk/react-web-core";
import EmojiPicker from "emoji-picker-react";

import { DyteParticipantsAudio } from "@dytesdk/react-ui-kit";
import LoungeOverlay from "../components/lounge/LoungeOverlay.jsx";
import BreakoutControls from "../components/lounge/BreakoutControls.jsx";
import MainRoomPeek from "../components/lounge/MainRoomPeek.jsx";
import PostEventLoungeScreen from "../components/lounge/PostEventLoungeScreen.jsx";
import NotificationHistoryPanel from "../components/lounge/NotificationHistoryPanel.jsx";
import SpeedNetworkingZone from "../components/speed-networking/SpeedNetworkingZone.jsx";
import SpeedNetworkingSessionPrompt from "../components/speed-networking/SpeedNetworkingSessionPrompt.jsx";
import BannedParticipantsDialog from "../components/live-meeting/BannedParticipantsDialog.jsx";
import BreakModeScreen from "../components/live-meeting/BreakModeScreen.jsx";
import BreakConfigDialog from "../components/live-meeting/BreakConfigDialog.jsx";
import HostBreakControls from "../components/live-meeting/HostBreakControls.jsx";
import WaitingRoomAnnouncements from "../components/live-meeting/WaitingRoomAnnouncements.jsx";
import WaitingRoomControls from "../components/live-meeting/WaitingRoomControls.jsx";
import LoungeSettingsDialog from "../components/live-meeting/LoungeSettingsDialog.jsx";
import RoomLocationBadge from "../components/RoomLocationBadge.jsx";
import { cognitoRefreshSession } from "../utils/cognitoAuth.js";
import { getRefreshToken } from "../utils/api.js";
import { getUserName } from "../utils/authStorage.js";
import { isPreEventLoungeOpen } from "../utils/gracePeriodUtils.js";
import { useSecondTick } from "../utils/useGracePeriodTimer";
import { getBrowserTimezone } from "../utils/timezoneUtils.js";

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

function normalizeDisplayRole(rawRole = "") {
  const r = String(rawRole || "").toLowerCase();
  if (r.includes("host") || r.includes("publisher") || r.includes("admin") || r.includes("presenter")) {
    return "Host";
  }
  if (r.includes("speaker") || r.includes("moderator")) {
    return "Speaker";
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

// ✅ PHASE 1: Helper to extract backend user ID from participant
function getBackendUserId(participant) {
  if (!participant) return null;

  return (
    participant.customParticipantId ||
    participant._raw?.customParticipantId ||
    participant.clientSpecificId ||
    participant._raw?.client_specific_id ||
    null
  );
}

// ✅ PHASE 1: Match Dyte participant to backend user in lounge tables
function findUserIdForDyteParticipant(dyteParticipantId, loungeTables, participantIdMapRef) {
  if (!dyteParticipantId || !loungeTables) return null;

  // Check cache first
  const cached = participantIdMapRef.current?.get(dyteParticipantId);
  if (cached) return cached;

  // Search lounge tables
  for (const table of loungeTables) {
    if (!table.participants || !Array.isArray(table.participants)) continue;

    const participant = table.participants.find(
      p => String(p.dyte_participant_id || p.dyteParticipantId) === String(dyteParticipantId)
    );

    if (participant) {
      const userId = String(participant.user_id || participant.userId);
      if (participantIdMapRef.current) {
        participantIdMapRef.current.set(dyteParticipantId, userId);
      }
      return userId;
    }
  }

  return null;
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
  isOnBreak = false,
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

        {/* Break Indicator Banner */}
        {isOnBreak && (
          <Box sx={{ bgcolor: "rgba(255,165,0,0.12)", borderRadius: 2, p: 1.5, mb: 2,
             border: "1px solid rgba(255,165,0,0.3)", display:"flex", gap:1 }}>
            <CoffeeIcon sx={{ color:"rgba(255,165,0,0.85)", fontSize:18 }} />
            <Typography sx={{ fontSize:13, color:"rgba(255,255,255,0.8)" }}>
              The session is currently on a short break.
            </Typography>
          </Box>
        )}

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

  // ✅ Notification History State (for late-joiner notifications)
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [assigningParticipantId, setAssigningParticipantId] = useState(null);

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const [rightOpen, setRightOpen] = useState(false); // mobile drawer
  const [tab, setTab] = useState(0);

  // ✅ Participant visibility filter for Host (Phase 5)
  const [participantRoomFilter, setParticipantRoomFilter] = useState("all"); // "all" | "main" | "breakout" | "lounge"

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
  const [isBreakoutEnding, setIsBreakoutEnding] = useState(false); // ✅ Track when host ends breakout to clear timer immediately

  // ✅ PHASE 1: Dual-Timer Foundation for Breakout Room Sessions
  // Separate tracking for main room and breakout room timers
  const [mainRoomElapsedSeconds, setMainRoomElapsedSeconds] = useState(0);
  const [breakoutRoomElapsedSeconds, setBreakoutRoomElapsedSeconds] = useState(0);
  const [activeTimerType, setActiveTimerType] = useState('main'); // 'main' or 'breakout'

  // Refs to track timer state for accurate calculation
  const mainRoomElapsedRef = useRef(0);
  const breakoutRoomElapsedRef = useRef(0);
  const mainRoomStartTimeRef = useRef(null);
  const breakoutRoomStartTimeRef = useRef(null);
  const lastMainRoomSyncRef = useRef(null); // Server sync timestamp for offline calculation
  const lastBreakoutRoomSyncRef = useRef(null); // Server sync timestamp for offline calculation

  // ✅ Break Mode State
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState(null);
  const [breakDurationSeconds, setBreakDurationSeconds] = useState(600);
  const [loungeEnabledBreaks, setLoungeEnabledBreaks] = useState(false);
  const [breakConfigOpen, setBreakConfigOpen] = useState(false);
  const breakTimerRef = useRef(null);

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
  const [spotlightTarget, setSpotlightTarget] = useState(null); // { participantId, participantUserKey, name, byHostId, ts }

  const [isBreakoutControlsOpen, setIsBreakoutControlsOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [serverDebugMessage, setServerDebugMessage] = useState("");
  const [speedNetworkingActive, setSpeedNetworkingActive] = useState(false);
  const [speedNetworkingRound, setSpeedNetworkingRound] = useState(0);
  const [speedNetworkingTotalRounds, setSpeedNetworkingTotalRounds] = useState(0);
  const [speedNetworkingDurationMinutes, setSpeedNetworkingDurationMinutes] = useState(0);
  const mainSocketRef = useRef(null);
  const navigationTimeoutRef = useRef(null);
  const mainSocketReadyRef = useRef(false);
  const pendingMainSocketActionsRef = useRef([]);
  const lastLoungeFetchRef = useRef(0);
  const speedNetworkingTimeoutRef = useRef(null);

  // ✅ Fullscreen support
  const rootRef = useRef(null);
  const endHandledRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const joinedOnceRef = useRef(false);
  const askedMediaPermRef = useRef(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const roomJoinedRef = useRef(false); // ✅ Track roomJoined state for async contexts (e.g., breakout rejoin)

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
  const [speedNetworkingNotification, setSpeedNetworkingNotification] = useState(null); // ✅ Notification message

  // ✅ NEW: Speed Networking Session Prompt State
  const [sessionStartNotification, setSessionStartNotification] = useState(null); // {sessionId, durationMinutes, timestamp}
  const [showNetworkingPrompt, setShowNetworkingPrompt] = useState(false); // Show/hide modal
  const [networkingSessionId, setNetworkingSessionId] = useState(null); // Current session ID

  const [lastMessage, setLastMessage] = useState(null);
  const [isPostEventLounge, setIsPostEventLounge] = useState(false); // ✅ Track post-event lounge mode
  const [postEventLoungeClosingTime, setPostEventLoungeClosingTime] = useState(null); // ✅ Track closing time
  const [showEndStateMessage, setShowEndStateMessage] = useState(false); // ✅ Show thank you/event ended message
  const [loungeHasEnded, setLoungeHasEnded] = useState(false); // ✅ Track when lounge time is over
  const [waitingRoomActive, setWaitingRoomActive] = useState(false);
  const [waitingRoomStatus, setWaitingRoomStatus] = useState("waiting");
  const [waitingRoomLoungeAllowed, setWaitingRoomLoungeAllowed] = useState(false);
  const [waitingRoomNetworkingAllowed, setWaitingRoomNetworkingAllowed] = useState(false);
  const [waitingRoomQueueCount, setWaitingRoomQueueCount] = useState(0);
  const [waitingRoomQueue, setWaitingRoomQueue] = useState([]);
  const waitingRoomPrevCountRef = useRef(0);
  const waitingSectionRef = useRef(null);
  const breakoutJoinInProgressRef = useRef(false);
  const breakoutJoinTimeoutRef = useRef(null);
  const isBreakoutRef = useRef(false);
  const cameraToggleTimeRef = useRef(0); // ✅ Track when camera was last toggled to prevent enforcement race conditions
  const [pendingWaitFocus, setPendingWaitFocus] = useState(false);

  // ✅ NEW: Announcement Dialog State
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSending, setAnnouncementSending] = useState(false);

  // ✅ NEW: Announcement Management State (edit/delete)
  const [sentAnnouncements, setSentAnnouncements] = useState([]);  // Host's sent announcements
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);  // {id, message} | null
  const [deleteConfirmAnnouncementId, setDeleteConfirmAnnouncementId] = useState(null);  // id | null
  const [announcementActionLoading, setAnnouncementActionLoading] = useState(false);

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

  // --- Participant "More" Menu State ---
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const moreMenuOpen = Boolean(moreMenuAnchor);

  const handleOpenMoreMenu = (event) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleCloseMoreMenu = () => {
    setMoreMenuAnchor(null);
  };

  const handleReportIssue = () => {
    handleCloseMoreMenu();
    showSnackbar("Report issue feature coming soon!", "info");
  };



  const handleContactSupport = () => {
    handleCloseMoreMenu();
    showSnackbar("Contact support feature coming soon!", "info");
  };
  // -------------------------------------
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
  const [participantKycCache, setParticipantKycCache] = useState({}); // Cache for kyc_status by userId
  const [moodMap, setMoodMap] = useState({});
  const [recentMoods, setRecentMoods] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("webinar_recent_moods") || "[]");
      return Array.isArray(raw) ? raw.slice(0, 10) : [];
    } catch {
      return [];
    }
  });
  const [moodAnchorEl, setMoodAnchorEl] = useState(null);
  const moodUpdateInFlightRef = useRef(false);
  const lastMoodSentAtRef = useRef(0);

  const fetchAndCacheKycStatus = useCallback((userId) => {
    if (!userId || participantKycCache[userId] !== undefined) return; // Already cached

    const headers = { accept: "application/json", ...authHeader() };
    const urls = [
      toApiUrl(`users/${userId}/`),
      toApiUrl(`users/${userId}/profile/`),
    ];

    let isMounted = true;
    (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const data = await res.json().catch(() => null);
          if (!isMounted || !data) break;

          const kycStatus = data?.kyc_status || data?.profile?.kyc_status || "";
          if (isMounted && kycStatus) {
            setParticipantKycCache(prev => ({ ...prev, [userId]: kycStatus }));
          }
          break;
        } catch (e) {
          // try next URL
        }
      }
    })();

    return () => { isMounted = false; };
  }, [participantKycCache]);

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
      const normalizedRole = normalizeDisplayRole(roleLabel);

      openMemberInfo({
        id: userId || participant.username || name,
        name,
        picture,
        role: normalizedRole,
        job_title: participant.job_title || participant.title || participant.designation || "",
        company: participant.company || participant.organization || participant.company_name || "",
        location: participant.location || participant.city || participant.country || "",
        username: participant.username,
        _raw: {
          customParticipantId: userId || participant.user_id || participant.id || null,
          isKycVerified: participant.is_kyc_verified || participant.isKycVerified || false,
        },
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
  const [loungeSettingsOpen, setLoungeSettingsOpen] = useState(false);
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState("");
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingAnchorEl, setRecordingAnchorEl] = useState(null);
  const [cancelRecordingOpen, setCancelRecordingOpen] = useState(false);
  const [isCancellingRecording, setIsCancellingRecording] = useState(false);
  const [cancelRecordingStep, setCancelRecordingStep] = useState(1);
  const [cancelRecordingText, setCancelRecordingText] = useState("");
  const [activeTableId, setActiveTableId] = useState(null);
  const activeTableIdRef = useRef(null); // ✅ Ref for socket access
  const [activeTableName, setActiveTableName] = useState("");
  const [activeTableLogoUrl, setActiveTableLogoUrl] = useState(""); // ✅ Store table logo

  // ✅ PHASE 1: Participant Visibility - Room Location Tracking
  const [participantRoomMap, setParticipantRoomMap] = useState(new Map());
  // Map<dyte_participant_id, { type: "main"|"breakout"|"lounge", roomId, roomName, roomCategory }>

  const participantIdMapRef = useRef(new Map());
  // Map<backend_user_id, dyte_participant_id> for ID matching

  const lastParticipantSyncRef = useRef(0);
  // Track last sync timestamp for validation

  const [eventData, setEventData] = useState(null); // ✅ Store full event data (images, timezone, etc.)
  const [mainRoomSupportStatus, setMainRoomSupportStatus] = useState(null);
  const [assistanceCooldownUntil, setAssistanceCooldownUntil] = useState(0);
  const currentUserId = useMemo(() => String(getMyUserIdFromJwt() || ""), []);
  const primaryHostUserId = useMemo(
    () => String(eventData?.created_by_id || ""),
    [eventData?.created_by_id]
  );
  const isPrimaryBroadcastHost = Boolean(
    isHost &&
    currentUserId &&
    primaryHostUserId &&
    currentUserId === primaryHostUserId
  );
  const assignedRoleByIdentity = useMemo(() => {
    const map = new Map();
    const groups = eventData?.event_participants || {};

    const add = (key, role) => {
      if (!key || !role) return;
      map.set(String(key).toLowerCase(), role);
    };

    const ingest = (items, role) => {
      if (!Array.isArray(items)) return;
      items.forEach((p) => {
        const userId = p?.user_id ?? p?.id ?? null;
        const email = String(p?.email || "").trim().toLowerCase();
        const name = String(p?.name || "").trim().toLowerCase();
        if (userId !== null && userId !== undefined && String(userId)) add(`id:${userId}`, role);
        if (email) add(`email:${email}`, role);
        if (name) add(`name:${name}`, role);
      });
    };

    ingest(groups.hosts || groups.host || [], "Host");
    ingest(groups.speakers || groups.speaker || [], "Speaker");
    ingest(groups.moderators || groups.moderator || [], "Moderator");

    return map;
  }, [eventData?.event_participants]);
  const [loungeTables, setLoungeTables] = useState([]);
  const [loungeOpenStatus, setLoungeOpenStatus] = useState(null);
  const isLoungeCurrentlyOpen = loungeOpenStatus?.status === "OPEN";
  const isPreEventLoungeStatus = Boolean(loungeOpenStatus?.reason?.includes("Pre-event"));
  const loungeNextChangeTs = useMemo(() => {
    if (!loungeOpenStatus?.next_change) return null;
    const ts = new Date(loungeOpenStatus.next_change).getTime();
    return Number.isFinite(ts) ? ts : null;
  }, [loungeOpenStatus?.next_change]);
  const openLoungeFromState = Boolean(location?.state?.openLounge);
  const preEventLoungeOpen = useMemo(
    () => isPreEventLoungeOpen(eventData || eventFromState),
    [eventData, eventFromState, preEventTick]
  );
  const isPostEventWindowOpen = useMemo(
    () => loungeOpenStatus?.status === "OPEN" && loungeOpenStatus?.reason?.includes("Post-event"),
    [loungeOpenStatus?.status, loungeOpenStatus?.reason]
  );

  const loungeOnlyTables = useMemo(() =>
    loungeTables.filter(t => t.category === 'LOUNGE' || !t.category),
    [loungeTables]
  );
  const hasConfiguredSocialLounge = loungeOnlyTables.length > 0;
  const participantCanAccessSocialLounge = Boolean(
    role !== "publisher" &&
    hasConfiguredSocialLounge &&
    isLoungeCurrentlyOpen
  );
  const showSocialLoungeToolbarAction = isHost || participantCanAccessSocialLounge;
  const isMainRoomSupportMissing = Boolean(
    !isBreakout &&
    role !== "publisher" &&
    mainRoomSupportStatus &&
    mainRoomSupportStatus.has_host_or_moderator_in_main_room === false
  );
  const assistanceCooldownRemaining = Math.max(
    0,
    Math.ceil((assistanceCooldownUntil - Date.now()) / 1000)
  );

  const breakoutOnlyTables = useMemo(() =>
    loungeTables.filter(t => t.category === 'BREAKOUT'),
    [loungeTables]
  );
  const activeTableCategory = useMemo(() => {
    if (!activeTableId) return null;
    const table = loungeTables.find((t) => String(t.id) === String(activeTableId));
    return table?.category || "LOUNGE";
  }, [loungeTables, activeTableId]);
  const isInBreakoutTable = activeTableCategory === "BREAKOUT";
  const isLiveEventSocialLounge = useMemo(
    () =>
      Boolean(
        isBreakout &&
        dbStatus === "live" &&
        !isPostEventLounge &&
        !isPreEventLoungeStatus &&
        !isInBreakoutTable
      ),
    [isBreakout, dbStatus, isPostEventLounge, isPreEventLoungeStatus, isInBreakoutTable]
  );
  const loungePrimaryUserId = useMemo(() => {
    if (!isLiveEventSocialLounge || !activeTableId) return null;
    const table = loungeTables.find((t) => String(t.id) === String(activeTableId));
    if (!table?.participants) return null;
    const entries = Object.entries(table.participants)
      .map(([seat, p]) => ({
        seat: Number(seat),
        participant: p,
        joinedAt: p?.joined_at ? new Date(p.joined_at).getTime() : null,
      }))
      .filter((item) => item.participant && Number.isFinite(item.seat));
    if (entries.length === 0) return null;
    entries.sort((a, b) => {
      const aHasTime = Number.isFinite(a.joinedAt);
      const bHasTime = Number.isFinite(b.joinedAt);
      if (aHasTime && bHasTime && a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
      if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
      return a.seat - b.seat;
    });
    return entries[0]?.participant?.user_id || null;
  }, [isLiveEventSocialLounge, activeTableId, loungeTables]);
  const currentLoungeUserIds = useMemo(() => {
    // ✅ CRITICAL FIX: Works for ALL breakout contexts, not just social lounge
    // For regular breakout rooms: activeTableId is set, loungeTables has the breakout data
    // For social lounges: same structure applies
    // This set is used to filter participants in the current breakout/lounge in the video grid
    if (!activeTableId) return new Set();
    const table = loungeTables.find((t) => String(t.id) === String(activeTableId));
    const ids = new Set();
    if (!table?.participants) return ids;
    Object.values(table.participants).forEach((p) => {
      const id = p?.user_id;
      if (id !== undefined && id !== null && String(id)) ids.add(String(id));
    });
    return ids;
  }, [activeTableId, loungeTables]);


  const [scheduledLabel, setScheduledLabel] = useState("--");
  const [durationLabel, setDurationLabel] = useState("--");

  // ---------- Dyte init ----------
  const [dyteMeeting, initMeeting] = useDyteClient();
  const [initDone, setInitDone] = useState(false);
  const selfPermissions = useDytePermissions(dyteMeeting);
  const myParticipantKey = useMemo(
    () => getParticipantUserKey(dyteMeeting?.self),
    [dyteMeeting?.self]
  );

  const syncMoodMapFromApi = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/moods/`), {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.moods) ? data.moods : [];

      setMoodMap((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          const userKey = row?.user_id !== undefined && row?.user_id !== null ? `id:${String(row.user_id)}` : "";
          if (userKey && row?.mood) next[userKey] = row.mood;
        });
        return next;
      });
    } catch {
      // best-effort sync
    }
  }, [eventId]);

  const persistRecentMood = useCallback((mood) => {
    if (!mood) return;
    setRecentMoods((prev) => {
      const next = [mood, ...prev.filter((x) => x !== mood)].slice(0, 10);
      localStorage.setItem("webinar_recent_moods", JSON.stringify(next));
      return next;
    });
  }, []);

  const applyMood = useCallback(
    async (moodValue) => {
      if (!eventId || !myParticipantKey) return;
      const now = Date.now();
      if (now - lastMoodSentAtRef.current < 1500 || moodUpdateInFlightRef.current) return;
      lastMoodSentAtRef.current = now;
      moodUpdateInFlightRef.current = true;

      const previous = moodMap[myParticipantKey] || null;
      const nextMood = moodValue || null;
      setMoodMap((prev) => ({ ...prev, [myParticipantKey]: nextMood }));

      try {
        const method = nextMood ? "PUT" : "DELETE";
        const res = await fetch(toApiUrl(`events/${eventId}/mood/`), {
          method,
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: nextMood ? JSON.stringify({ mood: nextMood }) : undefined,
        });
        if (!res.ok) {
          setMoodMap((prev) => ({ ...prev, [myParticipantKey]: previous }));
          return;
        }

        if (nextMood) {
          persistRecentMood(nextMood);
          dyteMeeting?.participants?.broadcastMessage?.("mood-updated", {
            userKey: myParticipantKey,
            mood: nextMood,
            ts: Date.now(),
          });
        } else {
          dyteMeeting?.participants?.broadcastMessage?.("mood-updated", {
            userKey: myParticipantKey,
            mood: null,
            ts: Date.now(),
          });
        }
      } catch {
        setMoodMap((prev) => ({ ...prev, [myParticipantKey]: previous }));
      } finally {
        moodUpdateInFlightRef.current = false;
      }
    },
    [dyteMeeting, eventId, moodMap, myParticipantKey, persistRecentMood]
  );

  // Dual connection for main room peek
  const [mainDyteMeeting, initMainMeeting] = useDyteClient();
  const [mainRoomAuthToken, setMainRoomAuthToken] = useState(null);
  const [isInBreakoutRoom, setIsInBreakoutRoom] = useState(false);
  const [mainRoomPeekVisible, setMainRoomPeekVisible] = useState(true);
  const [showMainRoomPeek, setShowMainRoomPeek] = useState(true);
  const [mainRoomPeekPosition, setMainRoomPeekPosition] = useState({ x: 0, y: 80 });
  const [hasMovedMainRoomPeek, setHasMovedMainRoomPeek] = useState(false);
  const [isDraggingMainRoomPeek, setIsDraggingMainRoomPeek] = useState(false);
  const mainRoomPeekRef = useRef(null);
  const mainRoomPeekDragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const isInBreakoutRoomRef = useRef(false); // ✅ Ref for socket access
  const leaveBreakoutInFlightRef = useRef(false);
  const preEventLoungeWasOpenRef = useRef(false);
  const preEventLoungePhaseRef = useRef(false);
  const fetchLoungeStateRef = useRef(null); // ✅ Ref to store fetchLoungeState for calling from handleLeaveBreakout
  const mainInitInFlightRef = useRef(false); // ✅ Track if main meeting init is in flight to prevent concurrent calls

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const mainRoomPeekPrefKey = useMemo(
    () => `main-room-peek-visible:${String(eventId || "")}`,
    [eventId]
  );

  const canSelfScreenShare =
    selfPermissions?.canProduceScreenshare === "ALLOWED"; // Dyte permission string

  const screenShareDisabled =
    !roomJoined ||
    !canSelfScreenShare ||
    (isHost ? !hostPerms.screenShare : true);

  const RIGHT_PANEL_W = 460;
  const APPBAR_H = 44;

  const clampMainRoomPeekPosition = useCallback((x, y) => {
    const el = mainRoomPeekRef.current;
    const width = el?.offsetWidth || 280;
    const height = el?.offsetHeight || 180;
    const minX = 8;
    const minY = APPBAR_H + 8;
    const maxX = Math.max(minX, window.innerWidth - width - 8);
    const maxY = Math.max(minY, window.innerHeight - height - 8);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, [APPBAR_H]);

  const getMainRoomPeekDefaultPosition = useCallback(() => {
    const el = mainRoomPeekRef.current;
    const width = el?.offsetWidth || 280;
    const reservedRight = isMdUp ? (rightPanelOpen ? RIGHT_PANEL_W : 70) : 8;
    const x = window.innerWidth - reservedRight - width - 12;
    const y = APPBAR_H + 32;
    return clampMainRoomPeekPosition(x, y);
  }, [APPBAR_H, RIGHT_PANEL_W, clampMainRoomPeekPosition, isMdUp, rightPanelOpen]);

  const handleMainRoomPeekDragStart = useCallback((event) => {
    const target = event.target;
    if (target?.closest?.("button")) return;

    const point = "touches" in event ? event.touches[0] : event;
    const rect = mainRoomPeekRef.current?.getBoundingClientRect();
    if (!point || !rect) return;

    mainRoomPeekDragRef.current = {
      active: true,
      offsetX: point.clientX - rect.left,
      offsetY: point.clientY - rect.top,
    };
    setHasMovedMainRoomPeek(true);
    setIsDraggingMainRoomPeek(true);
    event.preventDefault?.();
  }, []);

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

  const enforceSelfBreakMediaLock = useCallback(async () => {
    // ✅ STATE PRIORITY FIX: Skip lock enforcement for lounge users during break
    if (isBreakout && isOnBreak) {
      console.log("[LiveMeeting] Skipping break media lock - user is in lounge during break");
      return;
    }
    if (!dyteMeeting?.self) return;
    try { await dyteMeeting.self.disableAudio?.(); } catch (e) {
      console.warn("[LiveMeeting] Failed to disable self audio during break:", e);
    }
    try { await dyteMeeting.self.disableVideo?.(); } catch (e) {
      console.warn("[LiveMeeting] Failed to disable self video during break:", e);
    }
    try {
      const senders = dyteMeeting?.self?.peerConnection?.getSenders?.() || [];
      for (const sender of senders) {
        if (sender?.track?.kind === "audio" || sender?.track?.kind === "video") {
          sender.track.enabled = false;
        }
      }
    } catch (e) {
      console.warn("[LiveMeeting] Failed to enforce self track disable during break:", e);
    }
    setMicOn(false);
    setCamOn(false);
  }, [dyteMeeting, isBreakout, isOnBreak]);

  const ensureVideoInputReady = useCallback(async () => {
    if (!dyteMeeting?.self) return false;
    if (dyteMeeting.self.videoInput) return true;

    console.log("[LiveMeeting] No video input selected. Attempting camera device initialization...");
    try {
      await enumerateDevices();
    } catch (_) { }

    let availableVideoDevices = [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableVideoDevices = devices.filter((d) => d.kind === "videoinput" && d.deviceId);
    } catch (e) {
      console.warn("[LiveMeeting] Failed to enumerate video devices before enable:", e);
    }

    if (availableVideoDevices.length === 0) {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: true });
        probe.getTracks().forEach((t) => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableVideoDevices = devices.filter((d) => d.kind === "videoinput" && d.deviceId);
      } catch (e) {
        console.warn("[LiveMeeting] Camera permission/device probe failed:", e);
      }
    }

    if (availableVideoDevices.length === 0) {
      // Don't hard-block camera toggle if browser doesn't expose devices reliably.
      // We'll still try enableVideo() and verify the final SDK state.
      console.warn("[LiveMeeting] No enumerated video devices; continuing with SDK enable attempt");
      return true;
    }

    const preferredDevice =
      availableVideoDevices.find((d) => d.deviceId === selectedVideoDeviceId) ||
      availableVideoDevices[0];

    try {
      if (preferredDevice && typeof dyteMeeting.self.setDevice === "function") {
        await dyteMeeting.self.setDevice(preferredDevice);
        setSelectedVideoDeviceId(preferredDevice.deviceId);
        console.log("[LiveMeeting] Video input initialized using device:", preferredDevice.deviceId);
        return true;
      }
    } catch (e) {
      console.warn("[LiveMeeting] Failed to set video input device before enable:", e);
    }

    return Boolean(dyteMeeting.self.videoInput);
  }, [dyteMeeting, enumerateDevices, selectedVideoDeviceId]);

  const handleToggleMic = useCallback(async () => {
    if (!dyteMeeting?.self) return;
    // ✅ STATE PRIORITY FIX: Allow mic toggle in lounge rooms during break
    // Only enforce break media lock on main stage users, not lounge participants
    if (isOnBreak && !isBreakout) {
      showSnackbar("Mic is locked during break.", "info");
      await enforceSelfBreakMediaLock();
      return;
    }

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
  }, [dyteMeeting, enforceSelfBreakMediaLock, isOnBreak]);

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
    try {
      console.log("[LiveMeeting] 🎬 CAMERA ICON CLICKED - START");
      console.log("[LiveMeeting] Current states - isOnBreak:", isOnBreak, "isBreakout:", isBreakout, "role:", role);

      if (!dyteMeeting?.self) {
        console.error("[LiveMeeting] ❌ dyteMeeting.self not available");
        return;
      }

      // ✅ STATE PRIORITY FIX: Allow camera toggle in lounge rooms during break
      // Only enforce break media lock on main stage users, not lounge participants
      if (isOnBreak && !isBreakout) {
        console.log("[LiveMeeting] Camera locked during break (not in lounge)");
        showSnackbar("Camera is locked during break.", "info");
        await enforceSelfBreakMediaLock();
        return;
      }

      // ✅ CRITICAL FIX: Mark camera as toggled to prevent enforcement loop interference
      cameraToggleTimeRef.current = Date.now();
      console.log("[LiveMeeting] 📹 Camera toggle - cameraToggleTimeRef set");

      console.log("[LiveMeeting] 📹 Current SDK videoEnabled:", dyteMeeting.self.videoEnabled);
      console.log("[LiveMeeting] 📹 Video device:", dyteMeeting.self.videoInput);

      // ✅ CRITICAL FIX: Use actual Dyte state, not local UI state
      if (dyteMeeting.self.videoEnabled) {
        console.log(
          "[LiveMeeting] 📹 TOGGLING CAMERA OFF - isBreakout:",
          isBreakout,
          "Current videoEnabled:",
          dyteMeeting.self.videoEnabled
        );
        // ✅ CRITICAL FIX: Save preference IMMEDIATELY to false, don't wait for SDK response
        userMediaPreferenceRef.current.cam = false;

        console.log("[LiveMeeting] Calling disableVideo()...");
        await dyteMeeting.self.disableVideo();
        console.log("[LiveMeeting] ✅ disableVideo() completed");

        // ✅ CRITICAL: Ensure video track is fully muted at WebRTC level
        // This prevents any lingering video transmission to other participants
        try {
          const videoSenders = dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
            (s) => s.track?.kind === "video"
          ) || [];
          console.log(
            "[LiveMeeting] Found video senders to disable:",
            videoSenders.length
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
        console.log("[LiveMeeting] After disableVideo - SDK videoEnabled:", newState);
        setCamOn(newState);
      } else {
        console.log("[LiveMeeting] 📹 TOGGLING CAMERA ON");
        console.log("[LiveMeeting] Current SDK state before enable - videoEnabled:", dyteMeeting.self.videoEnabled);
        console.log("[LiveMeeting] Video device available:", dyteMeeting.self.videoInput);

        // ✅ CRITICAL FIX: Save preference IMMEDIATELY to true
        userMediaPreferenceRef.current.cam = true;

        // ✅ LOUNGE/BREAK FIX: ensure a video input is selected before enabling camera
        if (!dyteMeeting.self.videoInput) {
          await ensureVideoInputReady();
        }

        console.log("[LiveMeeting] Calling enableVideo()...");

        // Add timeout to catch hanging calls
        const enablePromise = dyteMeeting.self.enableVideo?.();
        if (!enablePromise) {
          console.error("[LiveMeeting] ❌ enableVideo() is not a function!");
          throw new Error("enableVideo is not available");
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("enableVideo() timed out after 5s")), 5000)
        );

        try {
          const enableResult = await Promise.race([enablePromise, timeoutPromise]);
          console.log("[LiveMeeting] ✅ enableVideo() completed, result:", enableResult);
        } catch (timeoutErr) {
          console.error("[LiveMeeting] ⚠️ enableVideo error:", timeoutErr?.message);
          throw timeoutErr;
        }

        console.log("[LiveMeeting] After enableVideo - SDK videoEnabled:", dyteMeeting.self.videoEnabled);

        // Retry once if SDK still reports disabled
        if (!dyteMeeting.self.videoEnabled) {
          console.warn("[LiveMeeting] Video still disabled after first enable attempt. Retrying bootstrap + enable...");
          await ensureVideoInputReady();
          await dyteMeeting.self.enableVideo?.();
        }

        // ✅ CRITICAL: Ensure video track is fully enabled at WebRTC level
        try {
          const videoSenders = dyteMeeting?.self?.peerConnection?.getSenders?.()?.filter(
            (s) => s.track?.kind === "video"
          ) || [];
          console.log("[LiveMeeting] Video senders found:", videoSenders.length);
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
        console.log("[LiveMeeting] After all enable ops - final SDK videoEnabled:", newState);
        if (!newState) {
          showSnackbar("Unable to turn on camera. Please check browser/site camera permission.", "warning");
        }
        setCamOn(newState);
      }
    } catch (e) {
      console.error("[LiveMeeting] ❌ Failed to toggle camera:", e?.message || e);
      console.error("[LiveMeeting] Full error:", e);
      // Sync UI state with actual Dyte state on error
      const newState = Boolean(dyteMeeting?.self?.videoEnabled);
      console.log("[LiveMeeting] Setting camOn to:", newState);
      setCamOn(newState);
      // ✅ Save to user preference ref
      userMediaPreferenceRef.current.cam = newState;
    }
  }, [
    dyteMeeting,
    ensureVideoInputReady,
    enforceSelfBreakMediaLock,
    isOnBreak,
    isBreakout,
    role,
    showSnackbar,
  ]);

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
  const [loungePinnedId, setLoungePinnedId] = useState(null);
  const loungePinnedIdRef = useRef(null);
  const loungePinElectionTimeoutRef = useRef(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveTableDialogOpen, setLeaveTableDialogOpen] = useState(false);

  const resolveTableName = useCallback(
    (tid) => {
      const table = loungeTables.find((t) => String(t.id) === String(tid));
      if (!table) return "";
      return table.name || `Room ${tid}`;
    },
    [loungeTables]
  );

  const applyBreakoutTokenRef = useRef(null);
  const loungeOpenAutoCloseRef = useRef(false);
  const openLoungeOverlay = useCallback(() => {
    loungeOpenAutoCloseRef.current = false;
    setLoungeOpen(true);
  }, []);

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

        // ✅ PHASE 2: RESET BREAKOUT TIMER ON JOIN
        // When user joins breakout room, start fresh timer from 0
        setBreakoutRoomElapsedSeconds(0);
        breakoutRoomElapsedRef.current = 0;
        breakoutRoomStartTimeRef.current = Date.now();
        lastBreakoutRoomSyncRef.current = Date.now();
        setActiveTimerType('breakout');
        console.log("[LiveMeeting] ✅ Breakout timer reset to 0:00:00");

        // ✅ CRITICAL FIX: Set activeTableId FIRST to prevent race conditions with auto-rejoin effect
        // The auto-rejoin effect checks activeTableId to determine if it should trigger
        // If we set authToken first, it may trigger the effect before activeTableId is set
        if (tableId) {
          console.log("[LiveMeeting] Setting activeTableId FIRST:", tableId);
          loungeJoinTimestampRef.current = Date.now(); // ✅ Mark when user joins lounge
          setActiveTableId(tableId);
          setActiveTableName(tableName || `Room ${tableId}`);
          setActiveTableLogoUrl(logoUrl || ""); // ✅ Store the logo URL
        }

        // ✅ CRITICAL FIX: DON'T lazily initialize main room here to avoid concurrent init conflicts
        // When user joins breakout, the main init effect tries to initialize at the same time
        // This causes "Unsupported concurrent calls on Dyte method: DyteClient.init" error
        // Instead, let a separate effect handle main room initialization AFTER breakout is ready
        // The main room peek will initialize when both mainRoomAuthToken AND isBreakout are true
        console.log("[LiveMeeting] Skipping lazy main room init in applyBreakoutToken to prevent concurrent Dyte init calls - will be handled by separate effect");

        setIsBreakout(true);
        isBreakoutRef.current = true;
        loungeOpenAutoCloseRef.current = true;
        setLoungeOpen(true); // ✅ CRITICAL: Mark lounge as open so render condition works
        setAuthToken(newToken);

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

        // ✅ PHASE 2: RESTORE MAIN ROOM TIMER ON RETURN
        // When user returns from breakout, restore the main room timer and switch active timer
        setActiveTimerType('main');
        mainRoomStartTimeRef.current = Date.now();
        lastMainRoomSyncRef.current = Date.now();
        console.log("[LiveMeeting] ✅ Restored main room timer, current elapsed:", mainRoomElapsedRef.current, "seconds");

        // ✅ TIMER STOP: Reset breakout ending flag so countdown resumes if applicable
        setIsBreakoutEnding(false);

        setIsBreakout(false);
        isBreakoutRef.current = false;
        loungeOpenAutoCloseRef.current = false;
        setAuthToken(mainAuthTokenRef.current);
        setActiveTableId(null);
        setActiveTableName("");
        setActiveTableLogoUrl(""); // ✅ Clear logo when returning to main meeting
        setRoomChatConversationId(null);
        loungeJoinTimestampRef.current = null; // ✅ Clear grace period timestamp when returning to main
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
        isBreakoutRef.current = false;
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

  // ✅ NEW: Auto-close lounge overlay once user is in breakout meeting (fixes rejoin UI issue)
  // When user joins a table, applyBreakoutToken sets loungeOpen=true to satisfy render conditions.
  // However, once the meeting initializes and roomJoined=true, we should close the lounge overlay
  // so users see the meeting instead of the lounge table list.
  // This ensures consistent behavior between first join and rejoin.
  useEffect(() => {
    if (isBreakout && roomJoined && loungeOpen && loungeOpenAutoCloseRef.current) {
      console.log("[LiveMeeting] User joined breakout meeting, closing lounge overlay to show meeting");
      loungeOpenAutoCloseRef.current = false;
      setLoungeOpen(false);
    }
  }, [isBreakout, roomJoined, loungeOpen]);

  // ✅ Keep refs in sync for WebSocket handlers to avoid stale closures
  useEffect(() => {
    isInBreakoutRoomRef.current = isInBreakoutRoom;
  }, [isInBreakoutRoom]);

  useEffect(() => {
    if (!eventId) return;
    try {
      const raw = sessionStorage.getItem(mainRoomPeekPrefKey);
      if (raw === "0") setMainRoomPeekVisible(false);
      else if (raw === "1") setMainRoomPeekVisible(true);
    } catch {
      // ignore storage issues
    }
  }, [eventId, mainRoomPeekPrefKey]);

  useEffect(() => {
    if (!eventId) return;
    try {
      sessionStorage.setItem(mainRoomPeekPrefKey, mainRoomPeekVisible ? "1" : "0");
    } catch {
      // ignore storage issues
    }
  }, [eventId, mainRoomPeekPrefKey, mainRoomPeekVisible]);

  useEffect(() => {
    if (activeTableId && isInBreakoutRoom) {
      setShowMainRoomPeek(true);
      setMainRoomPeekVisible(true);
      setHasMovedMainRoomPeek(false);
    }
  }, [activeTableId, isInBreakoutRoom]);

  useEffect(() => {
    if (!showMainRoomPeek || !activeTableId || !isInBreakoutRoom) return;
    if (hasMovedMainRoomPeek) return;

    const applyDefaultPosition = () => {
      setMainRoomPeekPosition(getMainRoomPeekDefaultPosition());
    };

    applyDefaultPosition();
    const raf = window.requestAnimationFrame(applyDefaultPosition);
    return () => window.cancelAnimationFrame(raf);
  }, [
    activeTableId,
    getMainRoomPeekDefaultPosition,
    hasMovedMainRoomPeek,
    isInBreakoutRoom,
    rightOpen,
    rightPanelOpen,
    showMainRoomPeek,
  ]);

  useEffect(() => {
    if (!showMainRoomPeek || !activeTableId || !isInBreakoutRoom) return;

    const handleResize = () => {
      setMainRoomPeekPosition((prev) => clampMainRoomPeekPosition(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTableId, clampMainRoomPeekPosition, isInBreakoutRoom, showMainRoomPeek]);

  useEffect(() => {
    if (!isDraggingMainRoomPeek) return;

    const handleMove = (event) => {
      if (!mainRoomPeekDragRef.current.active) return;
      const point = "touches" in event ? event.touches[0] : event;
      if (!point) return;
      const nextX = point.clientX - mainRoomPeekDragRef.current.offsetX;
      const nextY = point.clientY - mainRoomPeekDragRef.current.offsetY;
      setMainRoomPeekPosition(clampMainRoomPeekPosition(nextX, nextY));
      if ("touches" in event) event.preventDefault?.();
    };

    const handleEnd = () => {
      mainRoomPeekDragRef.current.active = false;
      setIsDraggingMainRoomPeek(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [clampMainRoomPeekPosition, isDraggingMainRoomPeek]);

  useEffect(() => {
    isBreakoutRef.current = isBreakout;
  }, [isBreakout]);

  useEffect(() => {
    activeTableIdRef.current = activeTableId;
  }, [activeTableId]);

  useEffect(() => {
    roomJoinedRef.current = roomJoined;
  }, [roomJoined]);

  useEffect(() => {
    applyBreakoutTokenRef.current = applyBreakoutToken;
  }, [applyBreakoutToken]);

  const handleEnterBreakout = async (tableId, tableName = null) => {
    if (!eventId || !tableId) {
      console.error("[BREAKOUT] ❌ Missing eventId or tableId");
      return;
    }

    // ✅ DEFENSIVE: Ensure we're NOT updating meeting status
    // Joining a lounge should NEVER trigger updateLiveStatus or change meeting state
    console.log("[BREAKOUT] Attempting to enter room", tableId, "- current status:", dbStatus);

    try {
      breakoutJoinInProgressRef.current = true;
      if (breakoutJoinTimeoutRef.current) {
        clearTimeout(breakoutJoinTimeoutRef.current);
        breakoutJoinTimeoutRef.current = null;
      }
      let breakoutJoinSucceeded = false;
      const url = `${API_ROOT}/events/${eventId}/lounge-join-table/`.replace(/([^:]\/)\/+/g, "$1");
      console.log("[BREAKOUT] Calling endpoint:", url, "with table_id:", tableId);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ table_id: tableId }),
      });

      // ✅ FIX #2C: Enhanced error handling with detailed feedback
      if (res.ok) {
        const data = await res.json();
        if (!data.token) {
          console.error("[BREAKOUT] ❌ No auth token received from server");
          showSnackbar("Server did not return authentication token", "error");
          return;
        }

        console.log("[BREAKOUT] ✅ Token received, applying to room", tableId);

        // ✅ CRITICAL: Assert we're not reactivating the meeting
        if (dbStatus === "live") {
          console.warn("[BREAKOUT] ⚠️ Room join happening while main meeting is live (expected during active event)");
        }

        const finalTableName = tableName || resolveTableName(tableId) || `Room ${tableId}`;
        // ✅ Get logo URL from loungeTables
        const table = loungeTables.find((t) => String(t.id) === String(tableId));
        const logoUrl = table?.icon_url || "";

        console.log("[BREAKOUT] Applying token for room:", finalTableName);
        await applyBreakoutToken(data.token, tableId, finalTableName, logoUrl);
        console.log("[BREAKOUT] ✅ Successfully joined room", tableId);
        breakoutJoinSucceeded = true;

        // Clear the join-in-progress flag once Dyte room join completes (see roomJoined handler).
        // Fallback timeout in case roomJoined never fires.
        breakoutJoinTimeoutRef.current = setTimeout(() => {
          breakoutJoinInProgressRef.current = false;
          breakoutJoinTimeoutRef.current = null;
        }, 8000);

      } else if (res.status === 403) {
        // ✅ FIX: Handle new waiting room and permission errors
        const data = await res.json().catch(() => ({}));
        console.error("[BREAKOUT] ❌ Access denied (403):", data);

        if (data.error === "waiting_room_active") {
          console.warn("[BREAKOUT] User in waiting room, lounge not allowed");
          showSnackbar("You must be admitted to the meeting before accessing this room", "warning");
        } else if (data.error === "not_assigned") {
          console.warn("[BREAKOUT] User not assigned to this room");
          showSnackbar("You are not assigned to this breakout room", "warning");
        } else if (data.error === "waiting_rejected") {
          console.warn("[BREAKOUT] User has been rejected from event");
          showSnackbar("You have been rejected from this event", "error");
        } else {
          const reason = data.reason || "Access denied";
          showSnackbar(reason, "warning");
        }

      } else if (res.status === 409) {
        // User already in meeting
        const data = await res.json().catch(() => ({}));
        console.warn("[BREAKOUT] User already in room");
        showSnackbar("You are already in this room", "info");

      } else if (res.status === 400) {
        // ✅ NEW: Check if backend detected meeting state corruption
        const data = await res.json().catch(() => ({}));
        if (data.error_code === "meeting_state_corrupted") {
          console.error("[BREAKOUT] ❌ Meeting state corrupted detected");
          showSnackbar("Meeting state error detected. Please refresh the page and try again.", "error");
        } else {
          console.error("[BREAKOUT] ❌ Bad request (400):", data);
          showSnackbar(data.detail || "Failed to join room. Invalid request.", "error");
        }

      } else {
        console.error("[BREAKOUT] ❌ Failed to join room:", res.status, res.statusText);
        const data = await res.json().catch(() => ({}));
        showSnackbar(
          data.detail || data.reason || `Failed to join room (${res.status})`,
          "error"
        );
      }

      if (!breakoutJoinSucceeded) {
        breakoutJoinInProgressRef.current = false;
        if (breakoutJoinTimeoutRef.current) {
          clearTimeout(breakoutJoinTimeoutRef.current);
          breakoutJoinTimeoutRef.current = null;
        }
      }

    } catch (err) {
      console.error("[BREAKOUT] ❌ Exception while entering breakout room:", err);
      showSnackbar(err.message || "Error joining room", "error");
      breakoutJoinInProgressRef.current = false;
      if (breakoutJoinTimeoutRef.current) {
        clearTimeout(breakoutJoinTimeoutRef.current);
        breakoutJoinTimeoutRef.current = null;
      }
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

  const handleSpotlightParticipant = () => {
    const p = participantMenuTarget;
    handleCloseParticipantMenu();
    if (!isHost || !p) return;

    const payload = {
      participantId: p.id || null,
      participantUserKey: getParticipantUserKey(p?._raw || p) || null,
      name: p.name || "Participant",
      byHostId: dyteMeeting?.self?.id || null,
      ts: Date.now(),
    };

    setSpotlightTarget(payload);
    try {
      dyteMeeting?.participants?.broadcastMessage?.("spotlight-user", payload);
    } catch (e) {
      console.warn("[Spotlight] Failed to broadcast spotlight-user:", e);
    }
    showSnackbar(`${payload.name} moved to main stage`, "success");
  };

  const handleClearSpotlight = () => {
    handleCloseParticipantMenu();
    if (!isHost) return;

    setSpotlightTarget(null);
    const payload = { byHostId: dyteMeeting?.self?.id || null, ts: Date.now() };
    try {
      dyteMeeting?.participants?.broadcastMessage?.("spotlight-clear", payload);
    } catch (e) {
      console.warn("[Spotlight] Failed to broadcast spotlight-clear:", e);
    }
    showSnackbar("Returned to normal layout", "info");
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

  const handleStartRecording = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/start-recording/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to start recording");
      setIsRecording(true);
      setRecordingId(data.recording_id || "");
      setIsRecordingPaused(false);
      showSnackbar("Recording started", "success");
    } catch (err) {
      console.error("Error starting recording:", err);
      showSnackbar(err.message || "Failed to start recording", "error");
    }
  }, [eventId, showSnackbar]);

  const handlePauseRecording = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/pause-recording/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to pause recording");
      setIsRecordingPaused(true);
      setRecordingAnchorEl(null);
      showSnackbar("Recording paused", "success");
    } catch (err) {
      console.error("Error pausing recording:", err);
      showSnackbar(err.message || "Failed to pause recording", "error");
    }
  }, [eventId, showSnackbar]);

  const handleResumeRecording = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/resume-recording/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to resume recording");
      setIsRecordingPaused(false);
      setRecordingAnchorEl(null);
      showSnackbar("Recording resumed", "success");
    } catch (err) {
      console.error("Error resuming recording:", err);
      showSnackbar(err.message || "Failed to resume recording", "error");
    }
  }, [eventId, showSnackbar]);

  const handleStopRecording = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/stop-recording/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to stop recording");
      setIsRecording(false);
      setRecordingId("");
      setIsRecordingPaused(false);
      setRecordingAnchorEl(null);
      showSnackbar("Recording stopped", "success");
    } catch (err) {
      console.error("Error stopping recording:", err);
      showSnackbar(err.message || "Failed to stop recording", "error");
    }
  }, [eventId, showSnackbar]);

  const handleCancelRecordingClick = useCallback(() => {
    setRecordingAnchorEl(null);
    setCancelRecordingStep(1);
    setCancelRecordingText("");
    setCancelRecordingOpen(true);
  }, []);

  const executeCancelRecording = useCallback(async () => {
    if (!eventId) return;
    setIsCancellingRecording(true);
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/cancel-recording/`), {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to cancel recording");

      setIsRecording(false);
      setRecordingId("");
      setIsRecordingPaused(false);
      setCancelRecordingOpen(false);
      setCancelRecordingStep(1);
      setCancelRecordingText("");
      showSnackbar("Recording permanently deleted", "success");
    } catch (err) {
      console.error("Error cancelling recording:", err);
      showSnackbar(err.message || "Failed to cancel recording", "error");
    } finally {
      setIsCancellingRecording(false);
    }
  }, [eventId, showSnackbar]);

  // Break Mode API Callbacks
  const handleStartBreak = useCallback(async (durationSeconds) => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/start-break/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ duration_seconds: durationSeconds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showSnackbar(data?.detail || "Failed to start break.", "error");
        return;
      }
      // WebSocket broadcast will update state reactively
      console.log("[LiveMeeting] Break started:", data);
    } catch (e) {
      console.error("Error starting break:", e);
      showSnackbar("Network error starting break.", "error");
    }
  }, [eventId, showSnackbar]);

  const handleEndBreak = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/end-break/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showSnackbar(data?.detail || "Failed to end break.", "error");
        return;
      }
      // WebSocket broadcast will update state reactively
    } catch (e) {
      console.error("Error ending break:", e);
      showSnackbar("Network error ending break.", "error");
    }
  }, [eventId, showSnackbar]);

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

  const updateAudienceMediaForBreak = useCallback(
    async (lockMedia) => {
      if (!isHost || !dyteMeeting) return;
      const joinedParticipants = getJoinedParticipants().filter((p) => p.id !== dyteMeeting?.self?.id);
      if (joinedParticipants.length === 0) return;

      const isParticipantInLoungeOrBreakout = (participant) => {
        const roomInfo = participantRoomMap.get(participant?.id);
        if (roomInfo?.type === "lounge" || roomInfo?.type === "breakout") return true;

        const participantUserId = getBackendUserId(participant);
        if (!participantUserId) return false;

        return loungeTables.some((table) => {
          if (!table?.participants) return false;
          const participantsList = Array.isArray(table.participants)
            ? table.participants
            : Object.values(table.participants);
          return participantsList.some((tableParticipant) => {
            const tableUserId = tableParticipant?.user_id || tableParticipant?.userId;
            return tableUserId && String(tableUserId) === String(participantUserId);
          });
        });
      };

      const lockTargets = lockMedia
        ? joinedParticipants.filter((p) => !isParticipantInLoungeOrBreakout(p))
        : joinedParticipants;
      const audienceIds = lockTargets.map((p) => p.id);
      if (audienceIds.length === 0) return;

      try {
        await dyteMeeting.participants.updatePermissions(
          audienceIds,
          lockMedia
            ? {
              canProduceAudio: "NOT_ALLOWED",
              requestProduceAudio: false,
              canProduceVideo: "NOT_ALLOWED",
              requestProduceVideo: false,
            }
            : {
              canProduceAudio: "ALLOWED",
              requestProduceAudio: true,
              canProduceVideo: "ALLOWED",
              requestProduceVideo: true,
            }
        );
      } catch (e) {
        console.warn("Failed to update break media permissions:", e);
      }
      if (lockMedia) {
        for (const p of lockTargets) {
          try { await p?.disableAudio?.(); } catch (_) { }
          try { await p?.disableVideo?.(); } catch (_) { }
        }
      }
    },
    [dyteMeeting, getJoinedParticipants, isHost, loungeTables, participantRoomMap]
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

  useEffect(() => {
    if (!eventData) return;
    setIsRecording(eventData.is_recording || false);
    setRecordingId(eventData.rtk_recording_id || "");
    setIsRecordingPaused(Boolean(eventData.recording_paused_at));
  }, [eventData]);


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
    if (breakoutJoinInProgressRef.current || isBreakoutRef.current) {
      console.log("[LiveMeeting] Skipping token fetch - breakout join in progress");
      return;
    }
    if ((preEventLoungeOpen || openLoungeFromState || isPostEventWindowOpen) && !joinMainRequested &&
      (role !== "publisher" || !hostChoiceMade || hostChoseLoungeOnly)) {
      // ✅ Log when skipping token fetch due to pre-event lounge
      if (!joinInFlightRef.current) {
        console.log("[LiveMeeting] In lounge-only flow, skipping token fetch");
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

        const shouldDeferMainToken = breakoutJoinInProgressRef.current || isBreakoutRef.current;
        if (shouldDeferMainToken) {
          console.log("[LiveMeeting] Main token received during breakout join; storing for later");
          mainAuthTokenRef.current = data.authToken;
          if (!mainRoomAuthToken) setMainRoomAuthToken(data.authToken);
          setWaitingRoomActive(false);
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
  }, [eventId, role, isBreakout, waitingRoomActive, preEventLoungeOpen, openLoungeFromState, isPostEventWindowOpen, eventData, eventFromState, joinRequestTick, joinMainRequested, authToken, hostChoiceMade, hostChoseLoungeOnly]);

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

    // ✅ CRITICAL FOR PARTICIPANTS: Stop polling once meeting ends
    // On server, polling can reset lounge status before backend catches up
    if (endHandledRef.current && role !== "publisher") {
      console.log("[LiveMeeting] Skipping lounge poll - meeting ended for participant");
      return;
    }

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
  }, [eventId, role]);

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

  useEffect(() => {
    if (!isPostEventWindowOpen || loungeHasEnded) return;
    if (!isPostEventLounge) {
      setIsPostEventLounge(true);
    }
    if (loungeOpenStatus?.next_change) {
      setPostEventLoungeClosingTime(loungeOpenStatus.next_change);
    }
  }, [isPostEventWindowOpen, loungeHasEnded, isPostEventLounge, loungeOpenStatus?.next_change]);

  useEffect(() => {
    if (!isPostEventLounge || loungeHasEnded) return;
    if (loadingJoin) setLoadingJoin(false);
    if (joinError) setJoinError("");
  }, [isPostEventLounge, loungeHasEnded, loadingJoin, joinError]);

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

    ws.onopen = () => {
      console.log("[MainSocket] Connected");
      mainSocketReadyRef.current = true;
      if (pendingMainSocketActionsRef.current.length > 0) {
        const queued = [...pendingMainSocketActionsRef.current];
        pendingMainSocketActionsRef.current = [];
        queued.forEach((payload) => {
          try {
            ws.send(JSON.stringify(payload));
          } catch (e) {
            console.warn("[MainSocket] Failed to send queued action:", e);
          }
        });
      }
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);
        console.log("[MainSocket] Received:", msg.type, msg);

        if (msg.type === "force_join_breakout") {
          // Host-initiated force join - enter the breakout room
          console.log("[MainSocket] Force join to breakout:", msg.table_id);
          handleEnterBreakout(msg.table_id);
        } else if (msg.type === "breakout_restored") {
          // ✅ NEW: Page reload/reconnect - user is being restored to their previous breakout room
          console.log("[MainSocket] Breakout restored to table", msg.table_id);

          // ✅ RECONNECT FIX: Eagerly mark breakout restoration BEFORE async chain starts
          // This prevents the welcome message (arriving milliseconds later) from
          // showing the break screen or clearing activeTableId during the async gap.
          isBreakoutRef.current = true;
          setActiveTableId(msg.table_id);
          setActiveTableName(msg.table_name || `Room ${msg.table_id}`);
          console.log("[MainSocket] ✅ Eagerly set breakout flags to suppress break screen during reconnect");

          showSnackbar(`Restored to ${msg.table_name || "your breakout room"}`, "info");

          // 🎥 Restore BOTH breakout room AND main room peek view after page reload
          // The main room peek is essential for the dual-screen layout
          if (msg.main_room_meeting_id && !mainDyteMeeting) {
            (async () => {
              try {
                console.log("[MainSocket] Getting main room token for peek view restoration");
                const res = await fetch(toApiUrl(`events/${eventId}/dyte/join/`), {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeader() },
                  body: JSON.stringify({ is_host: false }),
                });
                if (!res.ok) {
                  console.warn("[MainSocket] Failed to get main room token:", res.status);
                  return;
                }
                const data = await res.json();
                if (data.authToken) {
                  mainAuthTokenRef.current = data.authToken;
                  console.log("[MainSocket] ✅ Main room token obtained, initializing peek");
                  // Initialize main meeting for peek view (receive-only, no audio/video)
                  await initMainMeeting({
                    authToken: data.authToken,
                    defaults: { audio: false, video: false },
                  });
                }
              } catch (e) {
                console.warn("[MainSocket] Error restoring main room for peek:", e);
              }
            })();
          }

          // Join the breakout room (happens in parallel with main room init)
          handleEnterBreakout(msg.table_id);

          // ✅ NEW: After breakout rejoin, refresh Dyte SDK participant list
          // When a participant rejoins a breakout room after page reload, the Dyte SDK
          // doesn't automatically sync existing participants. We need to force a refresh.
          // This ensures that other participants (e.g., Christopher) become visible to the
          // rejoining participant (e.g., Ravikumar) without requiring manual action.
          (async () => {
            try {
              // Wait for Dyte SDK to initialize and room to be joined (timeout after 8 seconds)
              const maxWaitTime = 8000;
              const startTime = Date.now();
              while (!roomJoinedRef?.current && Date.now() - startTime < maxWaitTime) {
                await new Promise((r) => setTimeout(r, 100));
              }

              // Check if room joined successfully
              if (!roomJoinedRef?.current) {
                console.warn("[MainSocket] Dyte room not joined after 8s, skipping participant refresh");
                return;
              }

              // Give Dyte SDK a moment to populate the initial participant list
              await new Promise((r) => setTimeout(r, 200));

              // Force refresh of participant list and video subscriptions
              if (dyteMeeting && typeof dyteMeeting.participants?.videoSubscribed?.refresh === 'function') {
                console.log("[MainSocket] 🔄 Refreshing Dyte participant list after breakout rejoin");
                try {
                  await dyteMeeting.participants.videoSubscribed.refresh();
                  console.log("[MainSocket] ✅ Dyte participant list refreshed successfully");
                } catch (e) {
                  console.warn("[MainSocket] Participant list refresh failed (non-critical):", e?.message);
                }
              }
            } catch (e) {
              console.warn("[MainSocket] Error during breakout rejoin participant sync:", e);
            }
          })();
        } else if (msg.type === "breakout_restore_failed") {
          // ✅ NEW: Page reload/reconnect - restoration failed (room full, closed, etc.)
          console.log("[MainSocket] Breakout restore failed:", msg.message);
          showSnackbar(msg.message || "Your previous breakout room is no longer available", "warning");
        } else if (msg.type === "server_debug") {
          // Show debug message to host
          console.log("[SERVER_DEBUG]", msg.message);
          if (isHost) {
            // Show as both state and snackbar for better visibility
            setServerDebugMessage(msg.message);
            // Determine severity based on message content
            const severity = msg.message.includes("❌") || msg.message.includes("Error") || msg.message.includes("failed") ? "error"
              : msg.message.includes("✅") || msg.message.includes("Success") ? "success"
                : "info";
            showSnackbar(msg.message, severity);
            // Clear message after 10 seconds
            setTimeout(() => setServerDebugMessage(""), 10000);
          }
        } else if (msg.type === "main_room_support_status") {
          if (msg.status) {
            setMainRoomSupportStatus(msg.status);
          }
        } else if (msg.type === "assistance_requested") {
          // Hosts/moderators receive high-priority assistance alerts.
          const requesterName = msg.requester_name || "A participant";
          showSnackbar(`${requesterName} needs assistance in the Main Room.`, "warning");
        } else if (msg.type === "assistance_request_ack") {
          if (msg.ok) {
            const seconds = Number(msg.cooldown_seconds || 60);
            setAssistanceCooldownUntil(Date.now() + seconds * 1000);
            showSnackbar("Assistance request sent to hosts/moderators.", "success");
          } else if (msg.reason === "cooldown_active") {
            const seconds = Number(msg.cooldown_seconds || 60);
            setAssistanceCooldownUntil(Date.now() + seconds * 1000);
            showSnackbar(`Please wait ${seconds}s before requesting again.`, "info");
          } else if (msg.reason === "no_active_hosts_or_moderators") {
            showSnackbar("No active host/moderator is currently available.", "warning");
          } else if (msg.reason === "privileged_user_not_allowed") {
            showSnackbar("Hosts/Moderators cannot use Request Assistance.", "info");
          } else if (msg.reason === "not_in_main_room") {
            showSnackbar("Request Assistance is available only in the Main Room.", "info");
          } else if (msg.reason === "not_registered") {
            showSnackbar("You are not registered for this event.", "error");
          } else if (msg.reason === "not_online") {
            showSnackbar("Your presence is still syncing. Please try again.", "warning");
          } else if (msg.reason === "event_ended") {
            showSnackbar("This event has ended.", "info");
          } else if (msg.reason === "rejected") {
            showSnackbar("You are not eligible to request assistance for this event.", "error");
          } else if (msg.reason === "banned") {
            showSnackbar("Assistance request is unavailable for this account.", "error");
          } else if (msg.reason === "server_error") {
            showSnackbar("Server error while sending assistance request.", "error");
          } else {
            showSnackbar(`Unable to send assistance request (${msg.reason || "unknown"}).`, "error");
          }
        } else if (msg.type === "breakout_timer") {
          // ✅ PHASE 3: ENHANCED DUAL-TIMER WEBSOCKET PROTOCOL
          // Support both legacy (msg.duration) and new dual-timer format
          const { duration, elapsedSeconds, activeRoom, mainRoomElapsed, startTime } = msg;

          // Legacy support: if only duration provided, use old breakoutTimer
          if (duration !== undefined && activeRoom === undefined) {
            setBreakoutTimer(duration);
            console.log("[MainSocket] Received legacy breakout_timer:", duration);
          } else {
            // ✅ New dual-timer format
            console.log("[MainSocket] Received dual-timer update:", { activeRoom, breakoutRoomElapsed: elapsedSeconds, mainRoomElapsed, startTime });

            // Sync breakout room timer if in breakout
            if (activeRoom === 'breakout' && elapsedSeconds !== undefined) {
              setBreakoutRoomElapsedSeconds(elapsedSeconds);
              breakoutRoomElapsedRef.current = elapsedSeconds;
              if (startTime) {
                breakoutRoomStartTimeRef.current = startTime;
                lastBreakoutRoomSyncRef.current = Date.now();
              }
            }

            // Sync main room timer if we have it
            if (mainRoomElapsed !== undefined && activeRoom !== 'breakout') {
              setMainRoomElapsedSeconds(mainRoomElapsed);
              mainRoomElapsedRef.current = mainRoomElapsed;
              if (startTime) {
                mainRoomStartTimeRef.current = startTime;
                lastMainRoomSyncRef.current = Date.now();
              }
            }
          }
        } else if (msg.type === "breakout_announcement") {
          setBreakoutAnnouncement(msg.message);
          setShowBreakoutAnnouncement(true);
        } else if (msg.type === "breakout_end") {
          // Host has ended all breakouts - return to main room
          console.log("[MainSocket] Received breakout_end - host ended all breakouts");

          // ✅ IMMEDIATE TIMER STOP: Clear all timer states immediately before room transition
          // This ensures timer stops in real-time without requiring refresh
          console.log("[MainSocket] ✅ Stopping all breakout timers immediately");
          setIsBreakoutEnding(true);
          setBreakoutTimer(null); // Clear legacy timer
          setBreakoutRoomElapsedSeconds(0); // Clear new dual-timer
          breakoutRoomElapsedRef.current = 0;
          breakoutRoomStartTimeRef.current = null;
          setActiveTimerType('main'); // Switch back to main timer display

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
            console.log("[MainSocket] Not in breakout, still clearing timers for consistency");
            // Even if user is not in breakout, clear timers for late joiners
            setIsBreakoutEnding(false);
          }
        } else if (msg.type === "late_joiner_notification") {
          // Host gets a notification that a new participant joined during breakout
          console.log("[MainSocket] Late joiner notification:", msg.notification);
          // ✅ FIX: Only show notification to host/publisher role
          if (role === "publisher") {
            const notif = msg.notification;
            showSnackbar(
              `${notif.participant_name} joined and is in the Main Room.`,
              "info",
              { onClick: () => setLoungeOpen(true) }
            );

            // ✅ Add to notification history
            setNotificationHistory(prev => [
              ...prev.filter(n => n.participant_id !== notif.participant_id),
              {
                ...notif,
                joinedAt: new Date().toISOString(),
                status: "Joined in Main Room"
              }
            ]);
            setUnreadNotifCount(prev => prev + 1);
          }
        } else if (msg.type === "waiting_for_breakout_assignment") {
          // Participant receives message that they are waiting for assignment
          console.log("[MainSocket] Waiting for breakout assignment");
          showSnackbar(
            "Breakout sessions are active. Waiting for host to assign you to a room.",
            "info"
          );
        } else if (msg.type === "late_joiner_assigned") {
          // Participant receives assignment to a breakout room
          console.log("[MainSocket] Late joiner assigned to room:", msg);
          showSnackbar(`You've been assigned to ${msg.room_name}!`, "success");

          // ✅ Refresh Dyte participant list to show newly assigned participant
          if (dyteMeeting) {
            console.log("[MainSocket] Refreshing Dyte participants after assignment...");
            try {
              // Refresh video subscriptions to detect new participant
              if (typeof dyteMeeting.participants?.videoSubscribed?.refresh === 'function') {
                await dyteMeeting.participants.videoSubscribed.refresh();
                console.log("[MainSocket] ✅ Dyte participants refreshed");
              }
              // Also try to refresh active participants list
              if (typeof dyteMeeting.participants?.refresh === 'function') {
                await dyteMeeting.participants.refresh();
              }
            } catch (e) {
              console.warn("[MainSocket] Failed to refresh Dyte participants:", e);
            }
          }

          // Trigger join breakout room if we have the token function
          if (applyBreakoutTokenRef.current) {
            // The token is handled by the backend in the socket, so we just need to trigger joining the room
            // The LoungeOverlay will handle this via WebSocket
          }
        } else if (msg.type === "late_joiner_dismissed") {
          // Participant receives message that they stay in main room
          console.log("[MainSocket] Late joiner dismissed - staying in main room");
          showSnackbar("You will remain in the Main Room.", "info");
        } else if (msg.type === "refresh_breakout_participants") {
          // Someone was assigned to a breakout room - refresh that room's participant list
          console.log("[MainSocket] Refreshing breakout participants for room:", msg.room_id);

          // ✅ Refresh Dyte participants to sync with late joiner assignment
          if (dyteMeeting) {
            console.log("[MainSocket] Refreshing Dyte participants due to breakout assignment...");
            try {
              // Refresh video subscriptions to detect newly assigned participant
              if (typeof dyteMeeting.participants?.videoSubscribed?.refresh === 'function') {
                await dyteMeeting.participants.videoSubscribed.refresh();
                console.log("[MainSocket] ✅ Dyte participants refreshed for breakout room");
              }
              // Also try to refresh active participants list
              if (typeof dyteMeeting.participants?.refresh === 'function') {
                await dyteMeeting.participants.refresh();
              }
            } catch (e) {
              console.warn("[MainSocket] Failed to refresh Dyte participants:", e);
            }
          }

          // ✅ FIX: Refresh lounge state (table participants)
          if (fetchLoungeState) {
            console.log("[MainSocket] Refreshing lounge state for video grid sync...");
            fetchLoungeState();
          }
        } else if (msg.type === "waiting_room_enforced") {
          // ✅ NEW: Handle waiting room enforcement
          console.log("[MainSocket] Received waiting_room_enforced");
          if (!isHost) {
            console.log("[MainSocket] Enforcing waiting room transition - host started meeting");

            // 1. Unset main token ref so we don't auto-rejoin main
            mainAuthTokenRef.current = null;

            // 2. Leave any active room (breakout/lounge) and reset state
            if (applyBreakoutTokenRef.current) {
              applyBreakoutTokenRef.current(null, null, null, null).catch(console.error);
            }

            // 3. Force Waiting Room UI
            setWaitingRoomActive(true);
            setLoungeOpen(false);
            setWaitingRoomStatus("waiting");

            showSnackbar("The meeting has started. You are now in the waiting room.", "info");
          }

        } else if (msg.type === "waiting_room_announcement") {
          // ✅ NEW: Handle waiting room announcements
          console.log("[MainSocket] Received waiting room announcement:", msg.message);
          if (waitingRoomAnnouncementsRef.current) {
            waitingRoomAnnouncementsRef.current.addAnnouncement({
              announcement_id: msg.announcement_id,  // ✅ Include server ID
              message: msg.message,
              sender_name: msg.sender_name,
              timestamp: msg.timestamp,
            });
          }
        } else if (msg.type === "waiting_room_announcement_update") {
          // ✅ NEW: Handle announcement edits
          console.log("[MainSocket] Announcement updated:", msg.announcement_id);
          if (waitingRoomAnnouncementsRef.current) {
            waitingRoomAnnouncementsRef.current.updateAnnouncement(
              msg.announcement_id,
              msg.message,
              msg.updated_at
            );
          }
        } else if (msg.type === "waiting_room_announcement_delete") {
          // ✅ NEW: Handle announcement deletions
          console.log("[MainSocket] Announcement deleted:", msg.announcement_id);
          if (waitingRoomAnnouncementsRef.current) {
            waitingRoomAnnouncementsRef.current.deleteAnnouncement(msg.announcement_id);
          }
        } else if (msg.type === "admission_status_changed") {
          // ✅ NEW: Handle real-time admission status change
          // When host admits user, button should change from "Join Waiting Room" to "Join Live"
          console.log("[MainSocket] ✅ Admission status changed:", msg.admission_status);

          const newStatus = msg.admission_status;
          setWaitingRoomStatus(newStatus);

          if (newStatus === "admitted") {
            // User was admitted - exit waiting room and enter meeting
            console.log("[MainSocket] ✅ User admitted! Exiting waiting room...");
            setWaitingRoomActive(false);
            showSnackbar("You have been admitted to the meeting! 🎉", "success");
          } else if (newStatus === "rejected") {
            // User was rejected from the meeting
            console.log("[MainSocket] ❌ User rejected from meeting");
            showSnackbar("Your request to join has been declined by the host.", "error");
            // Optionally redirect after delay
            setTimeout(() => {
              navigate(`/community/${currentCommunitySlug}/events/${eventId}`);
            }, 3000);
          }
        } else if (msg.type === "participant_location_update") {
          // ✅ PHASE 2: Handle when a user joins/leaves/switches rooms
          console.log("[MainSocket] Participant location update:", msg);

          if (!msg.updates || !Array.isArray(msg.updates)) return;

          const newRoomMap = new Map(participantRoomMap);
          let mapChanged = false;

          for (const update of msg.updates) {
            const { user_id, dyte_participant_id, current_room, action } = update;

            // Cache the user_id → dyte_participant_id mapping
            if (user_id && dyte_participant_id) {
              participantIdMapRef.current.set(dyte_participant_id, user_id);
            }

            if (action === "left" || !current_room) {
              // User left the meeting or a room
              if (dyte_participant_id && newRoomMap.has(dyte_participant_id)) {
                newRoomMap.delete(dyte_participant_id);
                mapChanged = true;
                console.log(`[MainSocket] Participant ${user_id} left room`);
              }
            } else {
              // User joined or switched rooms
              if (dyte_participant_id) {
                newRoomMap.set(dyte_participant_id, {
                  type: current_room.type || "main",
                  roomId: current_room.room_id || null,
                  roomName: current_room.room_name || "Main Room",
                  roomCategory: current_room.room_category || null,
                  lastUpdate: msg.timestamp || Date.now()
                });
                mapChanged = true;
                console.log(`[MainSocket] Participant ${user_id} in ${current_room.type}: ${current_room.room_name}`);
              }
            }
          }

          if (mapChanged) {
            setParticipantRoomMap(newRoomMap);
          }

        } else if (msg.type === "participant_location_sync") {
          // ✅ PHASE 2: Full sync (on reconnect or initial load)
          console.log("[MainSocket] Received participant location sync:", msg);

          if (!msg.participants || !Array.isArray(msg.participants)) return;

          const newRoomMap = new Map();

          for (const p of msg.participants) {
            const { dyte_participant_id, user_id, current_room } = p;

            if (user_id && dyte_participant_id) {
              participantIdMapRef.current.set(dyte_participant_id, user_id);
            }

            if (dyte_participant_id && current_room) {
              newRoomMap.set(dyte_participant_id, {
                type: current_room.type || "main",
                roomId: current_room.room_id || null,
                roomName: current_room.room_name || "Main Room",
                roomCategory: current_room.room_category || null,
                lastUpdate: msg.timestamp || Date.now()
              });
            }
          }

          setParticipantRoomMap(newRoomMap);
          lastParticipantSyncRef.current = Date.now();
          console.log("[MainSocket] Participant location sync complete");

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
          if (msg.main_room_support_status) {
            setMainRoomSupportStatus(msg.main_room_support_status);
          }

          // ✅ FIX: Don't clear active table state while participant is in breakout room
          // This prevents race conditions where lounge_state broadcast conflicts with breakout join.
          // When a participant joins a breakout, we need to preserve activeTableId and activeTableName
          // so that the breakout state remains consistent. Without this guard, the WebSocket lounge_state
          // broadcast (which fires immediately after join) would clear these values, causing the Dyte SDK
          // to lose track of the participant's breakout assignment and auto-rejoin the main meeting.
          if (!isBreakoutRef.current) {
            setActiveTableId(null);
            setActiveTableName("");
            setRoomChatConversationId(null);
          }

          // Restore break state on reconnect (welcome message includes break state)
          if (msg.type === "welcome") {
            // ✅ STATE PRIORITY FIX: Process user's lounge table BEFORE break state
            // If user is in a lounge table, mark breakout state immediately
            if (msg.user_lounge_table_id && !isBreakoutRef.current) {
              console.log("[MainSocket] User is in lounge table", msg.user_lounge_table_id, "- suppressing break screen");
              isBreakoutRef.current = true;
              setActiveTableId(msg.user_lounge_table_id);
            }

            // Then restore break state if active
            if (msg.is_on_break) {
              console.log("[MainSocket] Reconnected during active break, remaining:", msg.break_remaining_seconds);
              setIsOnBreak(true);
              setBreakDurationSeconds(msg.break_duration_seconds);
              setBreakRemainingSeconds(msg.break_remaining_seconds);
              setLoungeEnabledBreaks(msg.lounge_enabled_breaks || false);
            }
          }
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
        } else if (msg.type === "meeting_started") {
          // ✅ NEW: Handle meeting start notification from backend
          console.log("[MainSocket] Received meeting_started broadcast:", {
            event_id: msg.event_id,
            status: msg.status,
            started_at: msg.started_at
          });

          // Update status immediately without waiting for poll
          if (msg.status === "live") {
            console.log("[MainSocket] ✅ Meeting went LIVE via WebSocket - updating dbStatus");
            setDbStatus("live");
          }
        } else if (msg.type === "recording_status_changed") {
          console.log("[MainSocket] Recording status changed:", msg);
          setIsRecording(Boolean(msg.is_recording));
          setRecordingId(msg.recording_id || "");
          setIsRecordingPaused(Boolean(msg.is_paused));

          const actionMessages = {
            started: "Recording started",
            paused: "Recording paused",
            resumed: "Recording resumed",
            stopped: "Recording stopped",
            cancelled: "Recording cancelled and deleted",
          };
          const severity = msg.action === "cancelled" ? "warning" : "info";
          showSnackbar(actionMessages[msg.action] || "Recording status changed", severity);
        } else if (msg.type === "meeting_ended") {
          // ✅ NEW: Handle meeting end notification from backend
          // This message is broadcast when host ends meeting or auto-end conditions trigger
          console.log("[MainSocket] Received meeting_ended broadcast:", {
            event_id: msg.event_id,
            ended_at: msg.ended_at,
            lounge_available: msg.lounge_available,
            lounge_closing_time: msg.lounge_closing_time
          });

          // Set lounge availability before triggering meeting end
          if (msg.lounge_available && msg.lounge_closing_time) {
            console.log("[MainSocket] ✅ Lounge is available from broadcast, cancelling any pending redirect");
            // ✅ Cancel any pending auto-redirect if lounge becomes available
            // This handles the race condition where polling returned CLOSED and scheduled a redirect
            // but the WebSocket now tells us the lounge IS actually available
            if (navigationTimeoutRef.current) {
              clearTimeout(navigationTimeoutRef.current);
              navigationTimeoutRef.current = null;
              console.log("[MainSocket] ✅ Cleared pending redirect timeout");
            }
            setLoungeOpenStatus({
              status: "OPEN",
              reason: "Post-event networking",
              next_change: msg.lounge_closing_time
            });
            setIsPostEventLounge(true);
            setPostEventLoungeClosingTime(msg.lounge_closing_time);
          }

          // Only trigger meeting end flow if not already handled
          if (!endHandledRef.current) {
            handleMeetingEnd("ended", { explicitEnd: false });
          }
        } else if (msg.type === "speed_networking_session_started") {
          // ✅ NEW: Handle Speed Networking Session Started
          console.log("[MainSocket] 🎉 Speed Networking session started!", msg.data);
          setNetworkingSessionId(msg.data.session_id);
          setSessionStartNotification({
            sessionId: msg.data.session_id,
            sessionName: msg.data.session_name || 'Speed Networking Session',
            durationMinutes: msg.data.duration_minutes,
            timestamp: Date.now()
          });
          setShowNetworkingPrompt(true);
          showSnackbar("Speed Networking has started! Join now to network with others.", "success");
        } else if (msg.type === "speed_networking_match_found") {
          // ✅ NEW: Handle Speed Networking Match Found (for participants already in networking)
          console.log("[MainSocket] 🤝 Match found!", msg.data);
          // This will be handled by SpeedNetworkingZone component
          setLastMessage(msg);
        } else if (msg.type === "speed_networking_session_ended") {
          // ✅ NEW: Handle Speed Networking Session Ended
          console.log("[MainSocket] Networking session ended");
          setShowNetworkingPrompt(false);
          setNetworkingSessionId(null);
          showSnackbar("Speed Networking session has ended", "info");
        } else if (msg.type === "break_started") {
          console.log("[MainSocket] Break started:", msg);
          setIsOnBreak(true);
          setBreakDurationSeconds(msg.break_duration_seconds);
          setBreakRemainingSeconds(msg.break_duration_seconds);
          setLoungeEnabledBreaks(msg.lounge_enabled_breaks || false);

          // ✅ STATE PRIORITY FIX: Skip media lock if user is actively in a lounge room
          // Break media lock should only apply to main stage attendees, not lounge participants
          if (isBreakoutRef.current) {
            // User is in a lounge room - preserve their audio/video
            console.log("[MainSocket] ✅ User is in lounge room - preserving media (not enforcing break media lock)");
            showSnackbar("A break has started on the main stage. Enjoy the lounge!", "info");
          } else {
            // User is on main stage - enforce break media lock
            enforceSelfBreakMediaLock();
            if (isHost) updateAudienceMediaForBreak(true);

            if (loungeOpen && !msg.lounge_enabled_breaks) {
              setLoungeOpen(false);
              showSnackbar("Social Lounge closed during break.", "info");
            } else {
              showSnackbar("Break started. Mic and camera are now disabled.", "info");
            }
          }
        } else if (msg.type === "break_ended") {
          console.log("[MainSocket] Break ended:", msg);
          setIsOnBreak(false);
          setBreakRemainingSeconds(null);
          if (breakTimerRef.current) {
            clearInterval(breakTimerRef.current);
            breakTimerRef.current = null;
          }
          if (isHost) updateAudienceMediaForBreak(false);

          // ✅ BUGFIX: Always clear breakout state when break ends
          // User is no longer in a breakout room after break ends (they were removed from lounge)
          setIsBreakout(false);
          setActiveTableId(null);
          console.log("[MainSocket] Cleared breakout state - user returned to main room");

          // ✅ BUGFIX: Update lounge state so UI reflects that users were removed from lounge during break
          if (msg.lounge_state !== undefined) {
            console.log("[MainSocket] Updating lounge state after break ended:", msg.lounge_state);
            setLoungeState(msg.lounge_state);
          }

          if (loungeOpen && !msg.lounge_enabled_during) {
            setLoungeOpen(false);
            showSnackbar("Break ended — Social Lounge is closed during the session.", "warning");
          } else {
            showSnackbar("Break has ended. Mic and camera are now enabled.", "info");
          }
        } else {
          console.log("[MainSocket] Other message type:", msg.type, msg);
        }
      } catch (err) {
        console.warn("[MainSocket] Failed to parse message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[MainSocket] Error:", err);
      console.warn("[MainSocket] Pending actions will be retried on reconnect:", pendingMainSocketActionsRef.current.length);
    };

    ws.onclose = (e) => {
      console.log("[MainSocket] Disconnected");
      console.log("[MainSocket] Close event:", {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        pendingActions: pendingMainSocketActionsRef.current.length
      });
      mainSocketRef.current = null;
      mainSocketReadyRef.current = false;
      // ✅ IMPORTANT: Keep pending actions so they can be sent when socket reconnects
      // DO NOT clear pendingMainSocketActionsRef.current here
    };

    return () => {
      console.log("[MainSocket] Cleanup function called - closing WebSocket");
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    };
  }, [eventId, isHost]);

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
      console.log("[MainSocket] Action sent:", payload);
      return true;
    }
    // Queue action if socket is connecting or closed - it will be sent when reconnected
    if (!ws || ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.CLOSED) {
      pendingMainSocketActionsRef.current.push(payload);
      console.warn("[MainSocket] Socket not ready; queued action", payload);
      return false;
    }
    console.warn("[MainSocket] Unable to send action; socket state:", ws?.readyState, payload);
    return false;
  }, []);

  const requestMainRoomAssistance = useCallback(() => {
    if (isHost || isBreakout) return;
    if (assistanceCooldownRemaining > 0) {
      showSnackbar(`Please wait ${assistanceCooldownRemaining}s before requesting again.`, "info");
      return;
    }
    const sent = sendMainSocketAction({ action: "request_assistance" });
    if (!sent) {
      showSnackbar("Connection is re-establishing. Assistance request queued.", "warning");
    }
  }, [isHost, isBreakout, assistanceCooldownRemaining, sendMainSocketAction]);

  // ✅ Handle assignment from notification history
  const handleAssignFromHistory = useCallback((participantId, roomId) => {
    setAssigningParticipantId(participantId);
    sendMainSocketAction({
      action: "assign_late_joiner",
      participant_id: participantId,
      room_id: roomId,
    });
    // Remove from history after assignment
    setNotificationHistory(prev => prev.filter(n => n.participant_id !== participantId));
    setAssigningParticipantId(null);
    console.log(`[NotificationHistory] Assigned participant ${participantId} to room ${roomId}`);
  }, [sendMainSocketAction]);

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

        // ✅ NEW: Store announcement with server ID for edit/delete management
        if (data.announcement_id) {
          setSentAnnouncements((prev) => [{
            id: data.announcement_id,
            message: data.message,
            sender_name: data.sender_name,
            created_at: data.created_at,
            updated_at: data.created_at,
            is_edited: false,
          }, ...prev]);
        }

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

  // ✅ NEW: Fetch sent announcements (for host management and refresh/reconnect recovery)
  const fetchSentAnnouncements = useCallback(async () => {
    if (!eventId || !isHost) return;
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/announcements/`), {
        headers: { ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSentAnnouncements(data);
    } catch (e) {
      console.warn("[Announcement] Failed to fetch sent announcements:", e);
    }
  }, [eventId, isHost]);

  // ✅ NEW: Update announcement (edit) via API and broadcast to waiting room
  const updateAnnouncementAPI = useCallback(async (id, newMessage) => {
    if (!eventId || !id || !newMessage?.trim()) return;
    setAnnouncementActionLoading(true);
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/announcements/${id}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err?.detail || "Failed to update announcement", "error");
        return;
      }
      const data = await res.json();
      setSentAnnouncements((prev) =>
        prev.map((a) => a.id === id ? { ...a, message: data.message, updated_at: data.updated_at, is_edited: true } : a)
      );
      showSnackbar("Announcement updated", "success");
      setEditingAnnouncement(null);
      setAnnouncementText("");
      setAnnouncementDialogOpen(false);
    } catch (e) {
      showSnackbar("Failed to update announcement", "error");
    } finally {
      setAnnouncementActionLoading(false);
    }
  }, [eventId, showSnackbar]);

  // ✅ NEW: Delete announcement via API and broadcast to waiting room
  const deleteAnnouncementAPI = useCallback(async (id) => {
    if (!eventId || !id) return;
    setAnnouncementActionLoading(true);
    try {
      const res = await fetch(toApiUrl(`events/${eventId}/waiting-room/announcements/${id}/delete/`), {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!res.ok) {
        showSnackbar("Failed to delete announcement", "error");
        return;
      }
      setSentAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showSnackbar("Announcement deleted", "success");
      setDeleteConfirmAnnouncementId(null);
    } catch (e) {
      showSnackbar("Failed to delete announcement", "error");
    } finally {
      setAnnouncementActionLoading(false);
    }
  }, [eventId, showSnackbar]);

  useEffect(() => {
    if (!eventId || !isHost || !eventData?.waiting_room_enabled) return;

    // ✅ NEW: Fetch sent announcements on mount (for refresh/reconnect recovery)
    fetchSentAnnouncements();

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
  }, [eventId, isHost, eventData?.waiting_room_enabled, fetchSentAnnouncements]);

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

  // ✅ PHASE 3: Keep participantRoomMap in sync with loungeTables state

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

  // Break Mode countdown effect
  useEffect(() => {
    if (!isOnBreak || !breakRemainingSeconds) {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
      return;
    }
    breakTimerRef.current = setInterval(() => {
      setBreakRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(breakTimerRef.current);
          breakTimerRef.current = null;
          setIsOnBreak(false); // optimistic clear; Celery broadcasts authoritative break_ended
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
    };
  }, [isOnBreak]);

  // ✅ PHASE 3: DUAL-TIMER COUNTDOWN EFFECT
  // Handles continuous countdown for both main room and breakout room timers
  // Uses refs to track local elapsed time and syncs with server updates
  // ✅ TIMER STOP: Stops immediately when host ends breakout room
  useEffect(() => {
    // Stop countdown if breakout is ending or user not in active room
    if (isBreakoutEnding || (!isInBreakoutRoomRef.current && !roomJoinedRef.current)) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // ✅ TIMER STOP: Re-check isBreakoutEnding every tick to stop immediately
      if (isBreakoutEnding) {
        clearInterval(interval);
        return;
      }

      if (activeTimerType === 'breakout' && breakoutRoomStartTimeRef.current) {
        // Breakout room timer: increment from start time
        const elapsed = Math.floor((now - breakoutRoomStartTimeRef.current) / 1000);
        setBreakoutRoomElapsedSeconds(elapsed);
        breakoutRoomElapsedRef.current = elapsed;
      } else if (activeTimerType === 'main' && mainRoomStartTimeRef.current) {
        // Main room timer: increment from stored elapsed + start time
        const elapsed = mainRoomElapsedRef.current + Math.floor((now - mainRoomStartTimeRef.current) / 1000);
        setMainRoomElapsedSeconds(elapsed);
        mainRoomElapsedRef.current = elapsed;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimerType, isInBreakoutRoom, roomJoined, isBreakoutEnding]);

  // ✅ PHASE 3: RECONNECT SYNC EFFECT
  // Re-syncs timers with server after connection loss
  useEffect(() => {
    if (!mainSocketRef.current) return;

    const handleReconnect = () => {
      console.log('[LiveMeeting] ✅ Socket reconnected, syncing timers with server');

      // Request timer sync from server
      if (activeTimerType === 'breakout' && isInBreakoutRoomRef.current) {
        mainSocketRef.current?.emit('action', {
          action: 'request_timer_sync',
          room_type: 'breakout',
          elapsed_seconds: breakoutRoomElapsedRef.current,
        });
      } else if (activeTimerType === 'main' && roomJoinedRef.current) {
        mainSocketRef.current?.emit('action', {
          action: 'request_timer_sync',
          room_type: 'main',
          elapsed_seconds: mainRoomElapsedRef.current,
        });
      }
    };

    // Listen for reconnect event
    mainSocketRef.current?.on?.('reconnect', handleReconnect);
    mainSocketRef.current?.on?.('connect', handleReconnect);

    return () => {
      mainSocketRef.current?.off?.('reconnect', handleReconnect);
      mainSocketRef.current?.off?.('connect', handleReconnect);
    };
  }, [activeTimerType, isInBreakoutRoom, roomJoined]);

  // ✅ TIMER STOP: Handle Edge Cases (Host Disconnect, Late Joins)
  // If host disconnects during breakout, timer should stop to avoid confusion
  // If user joins late and breakout has ended, timer should not be visible
  useEffect(() => {
    if (!mainSocketRef.current) return;

    const handleSocketDisconnect = () => {
      console.log('[LiveMeeting] ⚠️ Socket disconnected, stopping breakout timer if active');
      // If we're in breakout and socket disconnects, pause the timer countdown
      // until we can confirm breakout status from server
      if (isInBreakoutRoomRef.current && !isBreakoutEnding) {
        setIsBreakoutEnding(true);
        console.log('[LiveMeeting] Paused breakout timer due to socket disconnect');
      }
    };

    const handleSocketConnect = () => {
      // Reset pause flag on reconnect - the reconnect sync effect will handle timer validation
      if (isBreakoutEnding && isInBreakoutRoomRef.current) {
        setIsBreakoutEnding(false);
        console.log('[LiveMeeting] Resumed breakout timer after socket reconnect');
      }
    };

    mainSocketRef.current?.on?.('disconnect', handleSocketDisconnect);
    mainSocketRef.current?.on?.('connect', handleSocketConnect);

    return () => {
      mainSocketRef.current?.off?.('disconnect', handleSocketDisconnect);
      mainSocketRef.current?.off?.('connect', handleSocketConnect);
    };
  }, [isBreakoutEnding, isInBreakoutRoom]);

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
          // ✅ STATE PRIORITY FIX: During break in lounge, initialize video devices but start audio OFF
          // Video MUST be true to initialize devices, even if we show UI as OFF
          if (isOnBreak) {
            audioDefault = false;  // Default OFF during break in lounge
            videoDefault = true;   // ✅ CRITICAL: Must be true to initialize video devices!
            console.log(
              "[LiveMeeting] 🔊 INITIALIZING BREAKOUT DURING BREAK - audio OFF, video devices INITIALIZED:",
              "mic = false (start OFF), cam = true (initialize devices, user can toggle)"
            );
          } else {
            // Outside of break, use the user's saved preferences
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

    // ✅ CRITICAL FIX: Prevent audience from joining until host starts meeting (dbStatus === "live")
    // This prevents the race condition where audience joins before shouldShowMeeting check
    if (role !== "publisher" && !isBreakout && dbStatus !== "live") {
      console.log("[LiveMeeting] Join effect skipped for audience - waiting for meeting to go live. dbStatus:", dbStatus);
      return;
    }

    console.log("[LiveMeeting] ✅ Join effect triggered! dyteMeeting.self exists and initDone is true");

    const onRoomJoined = async () => {
      console.log("[LiveMeeting] ✅ roomJoined event received!");
      setRoomJoined(true);
      if (isBreakoutRef.current) {
        breakoutJoinInProgressRef.current = false;
        if (breakoutJoinTimeoutRef.current) {
          clearTimeout(breakoutJoinTimeoutRef.current);
          breakoutJoinTimeoutRef.current = null;
        }

        // ✅ CRITICAL FIX: Disable video right after joining so it starts OFF visually
        // But video devices are already initialized (videoDefault=true), so enabling will work!
        if (isOnBreak) {
          console.log("[LiveMeeting] 🔊 Joined lounge during break - disabling video to start OFF");
          try {
            await dyteMeeting.self.disableVideo?.();
            await dyteMeeting.self.disableAudio?.();
            const videoReady = await ensureVideoInputReady();
            if (!videoReady) {
              console.warn("[LiveMeeting] Camera input still unavailable after lounge join");
            }
            setCamOn(false);
            setMicOn(false);
            console.log("[LiveMeeting] ✅ Media disabled - user can now toggle on");
          } catch (e) {
            console.warn("[LiveMeeting] Error disabling media after join:", e);
          }
        }
      }
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
  }, [dyteMeeting, ensureVideoInputReady, initDone, dbStatus, role, isBreakout, isOnBreak]);

  // ✅ NEW: Initialize main room peek AFTER breakout is ready (not during breakout join)
  // This prevents concurrent Dyte init calls that cause "Unsupported concurrent calls" error
  useEffect(() => {
    if (!isBreakout) return; // Only init main room peek when IN breakout
    if (!mainRoomAuthToken) return; // Need main token
    if (mainDyteMeeting) return; // Already initialized
    if (mainInitInFlightRef.current) return; // Already in flight
    if (!roomJoined) return; // Wait for breakout room to be fully joined first

    console.log("[LiveMeeting] Initializing main room peek connection (delayed after breakout join)");
    mainInitInFlightRef.current = true;

    (async () => {
      try {
        await initMainMeeting({
          authToken: mainRoomAuthToken,
          defaults: {
            // Peek connection should be receive-only (never publish mic/cam)
            audio: false,
            video: false,
          },
        });
        console.log("[LiveMeeting] ✅ Main room peek connection initialized successfully");
      } catch (e) {
        console.error("[LiveMeeting] Failed to initialize main room peek:", e);
      } finally {
        mainInitInFlightRef.current = false;
      }
    })();
  }, [isBreakout, mainRoomAuthToken, mainDyteMeeting, roomJoined, initMainMeeting]);

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

  // ✅ Auto-join Speed Networking if session is active when user joins/rejoins
  const speedNetworkingAutoJoinedRef = useRef(false);
  const autoJoinCheckOnMountRef = useRef(false);

  // Helper function to check and auto-join Speed Networking
  const checkAndAutoJoinSpeedNetworking = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        console.warn('[LiveMeeting] No auth token available for auto-join');
        return;
      }

      if (!eventId) {
        console.warn('[LiveMeeting] No eventId available for auto-join');
        return;
      }

      console.log('[LiveMeeting] Fetching Speed Networking sessions for event', eventId);

      // Fetch active Speed Networking session
      const url = `${API_ROOT}/events/${eventId}/speed-networking/`;
      console.log('[LiveMeeting] Fetch URL:', url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[LiveMeeting] API response status:', res.status);

      if (!res.ok) {
        console.warn('[LiveMeeting] Failed to fetch sessions, status:', res.status);
        return;
      }

      const data = await res.json();
      console.log('[LiveMeeting] Sessions data:', data);

      const activeSession = data.results?.find(s => s.status === 'ACTIVE');
      console.log('[LiveMeeting] Active session found:', activeSession ? { id: activeSession.id, name: activeSession.name } : 'NONE');

      if (activeSession) {
        console.log('[LiveMeeting] ✅ Auto-detected active Speed Networking session, opening zone');
        // Mark as auto-joined to prevent repeated attempts
        speedNetworkingAutoJoinedRef.current = true;

        // Show notification
        setSpeedNetworkingNotification('Speed Networking session is in progress. Opening queue...');
        console.log('[LiveMeeting] Setting showSpeedNetworking to true');

        // Open the Speed Networking dialog
        setShowSpeedNetworking(true);

        // Check if user already has an active queue entry or match
        setTimeout(async () => {
          try {
            const checkUrl = `${API_ROOT}/events/${eventId}/speed-networking/${activeSession.id}/my-match/`;
            console.log('[LiveMeeting] Checking user queue status:', checkUrl);

            const checkRes = await fetch(checkUrl, {
              headers: { Authorization: `Bearer ${token}` }
            });

            console.log('[LiveMeeting] Queue check response status:', checkRes.status);

            // If user already has a queue entry/match, they'll be restored automatically
            // by SpeedNetworkingZone component. Only join if they don't have one.
            if (checkRes.status === 404) {
              // No existing queue entry, join now
              console.log('[LiveMeeting] No existing queue entry, attempting auto-join');

              const joinUrl = `${API_ROOT}/events/${eventId}/speed-networking/${activeSession.id}/join/`;
              const joinRes = await fetch(joinUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              console.log('[LiveMeeting] Auto-join response status:', joinRes.status);

              if (joinRes.ok) {
                const joinData = await joinRes.json();
                console.log('[LiveMeeting] ✅ User auto-joined Speed Networking queue', joinData);
                setSpeedNetworkingNotification('You have been added to the Speed Networking queue!');
                setTimeout(() => setSpeedNetworkingNotification(null), 3000);
              } else {
                console.warn('[LiveMeeting] Failed to auto-join queue:', joinRes.status);
                const errorText = await joinRes.text();
                console.warn('[LiveMeeting] Error response:', errorText);
                setSpeedNetworkingNotification(null);
              }
            } else if (checkRes.ok) {
              const existingQueue = await checkRes.json();
              console.log('[LiveMeeting] ✅ User has existing queue entry, restoring:', existingQueue);
              if (existingQueue.current_match) {
                setSpeedNetworkingNotification('Restoring your active match...');
              } else {
                setSpeedNetworkingNotification('You have been restored to the Speed Networking queue!');
              }
              setTimeout(() => setSpeedNetworkingNotification(null), 3000);
            } else {
              console.warn('[LiveMeeting] Unexpected queue check response:', checkRes.status);
            }
          } catch (err) {
            console.error('[LiveMeeting] Error checking queue status:', err);
            setSpeedNetworkingNotification(null);
          }
        }, 500); // Small delay to ensure zone is rendered
      } else {
        console.log('[LiveMeeting] No active Speed Networking session found');
      }
    } catch (err) {
      console.error('[LiveMeeting] Error checking for active Speed Networking session:', err);
    }
  }, [eventId]);

  // Trigger auto-join when user is in room - handles both new joins and refresh cases
  useEffect(() => {
    console.log('[LiveMeeting] Auto-join check:', { roomJoined, eventId, alreadyAutoJoined: speedNetworkingAutoJoinedRef.current });

    // Skip if not ready
    if (!roomJoined || !eventId) {
      console.log('[LiveMeeting] Auto-join skipped: roomJoined=' + roomJoined + ', eventId=' + eventId);
      return;
    }

    // Skip if already auto-joined
    if (speedNetworkingAutoJoinedRef.current) {
      console.log('[LiveMeeting] Auto-join already executed, skipping');
      return;
    }

    // Prevent duplicate checks from multiple effect triggers
    if (!autoJoinCheckOnMountRef.current) {
      autoJoinCheckOnMountRef.current = true;
      console.log('[LiveMeeting] Triggering auto-join for roomJoined=true, eventId=' + eventId);
      checkAndAutoJoinSpeedNetworking();
    }
  }, [roomJoined, eventId, checkAndAutoJoinSpeedNetworking]);

  // Keep local button state in sync with Dyte actual state

  useEffect(() => {
    if (!dyteMeeting?.self) return;

    // ✅ STATE PRIORITY FIX: Skip sync during break + lounge
    // When user is in a lounge during break, they should control media without constant syncing
    if (isOnBreak && isBreakout) {
      console.log(
        "[LiveMeeting] Skipping media state sync during break + lounge (user has full control)"
      );
      return;
    }

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
  }, [dyteMeeting, isOnBreak, isBreakout]);
  useEffect(() => {
    if (!dyteMeeting?.self) return;

    // ✅ STATE PRIORITY FIX: Skip sync during break + lounge
    if (isOnBreak && isBreakout) {
      return;
    }

    setMicOn(Boolean(dyteMeeting.self.audioEnabled));
    setCamOn(Boolean(dyteMeeting.self.videoEnabled));
  }, [dyteMeeting, roomJoined, isOnBreak, isBreakout]);

  // ✅ CRITICAL FIX: Explicit media state sync when entering/leaving lounge (breakout)
  // This ensures UI state matches actual media track state when transitioning between rooms
  useEffect(() => {
    if (!dyteMeeting?.self || !isBreakout) return;

    // ✅ STATE PRIORITY FIX: Skip sync during break + lounge
    // When user is in a lounge during break, maintain their media control without syncing
    if (isOnBreak) {
      console.log(
        "[LiveMeeting] Skipping media sync on breakout entry (user in lounge during break - full control)"
      );
      return;
    }

    console.log(
      "[LiveMeeting] Syncing media state in lounge - Audio:",
      dyteMeeting.self.audioEnabled,
      "Video:",
      dyteMeeting.self.videoEnabled
    );

    // Force sync on breakout entry (only outside of break)
    setMicOn(Boolean(dyteMeeting.self.audioEnabled));
    setCamOn(Boolean(dyteMeeting.self.videoEnabled));
  }, [isBreakout, dyteMeeting?.self?.id, isOnBreak]); // Trigger when entering/leaving breakout

  // ✅ CRITICAL FIX: Ensure media tracks are properly muted at WebRTC level when disabled
  // This adds an extra layer of protection specifically for lounge/breakout rooms
  // Run frequently to catch any tracks that get mysteriously re-enabled
  useEffect(() => {
    if (!dyteMeeting?.self || !isBreakout) return;

    // ✅ STATE PRIORITY FIX: Skip enforcement during break + lounge
    // When user is in a lounge room during a break, they should have full media control
    // Don't enforce mute if in a lounge during break
    if (isOnBreak && isBreakout) {
      console.log(
        "[LiveMeeting LOUNGE ENFORCEMENT EFFECT] Skipped - user is in lounge during break (full media enabled)"
      );
      return;
    }

    // ✅ NEW FIX: Don't enforce if user just toggled camera (within last 500ms)
    // This prevents the enforcement loop from overriding user-intentional toggles
    const timeSinceToggle = Date.now() - cameraToggleTimeRef.current;
    const isRecentToggle = timeSinceToggle < 500;

    console.log(
      "[LiveMeeting LOUNGE ENFORCEMENT EFFECT] Running - micOn:",
      micOn,
      "camOn:",
      camOn,
      "audioEnabled:",
      dyteMeeting.self.audioEnabled,
      "videoEnabled:",
      dyteMeeting.self.videoEnabled,
      "isRecentToggle:",
      isRecentToggle
    );

    // Only check and enforce if tracks should be disabled AND not a recent toggle
    if ((!micOn || !camOn) && !isRecentToggle) {
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
        // ✅ CRITICAL FIX: Skip preference enforcement during lounge + break
        // User should be able to freely toggle media during break in lounge without
        // saved preferences overriding their choices
        if (isOnBreak && isBreakout) {
          console.log("[LiveMeeting] 🔊 Skipping preference enforcement - user is in lounge during break");
          return;
        }

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
  const loungeJoinTimestampRef = useRef(null); // ✅ Track when user joins lounge to prevent immediate auto-rejoin

  const myUserId = useMemo(() => String(getMyUserIdFromJwt() || ""), []);
  const isEventOwner = useMemo(() => {
    if (!myUserId || !eventData?.created_by_id) return false;
    return String(myUserId) === String(eventData.created_by_id);
  }, [myUserId, eventData?.created_by_id]);

  const handleMeetingEnd = useCallback(
    async (state, options = {}) => {
      // If user is banned, do NOT navigate away. We want to show the banned screen.
      if (isBanned) {
        console.log("[LiveMeeting] User is banned, not processing end");
        return;
      }

      const { explicitEnd = false } = options;
      if (endHandledRef.current) {
        console.log("[LiveMeeting] End already handled, skipping");
        return;
      }
      endHandledRef.current = true;
      console.log("[LiveMeeting] handleMeetingEnd called with state:", state, "explicitEnd:", explicitEnd);

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch { }
      }

      try {
        await dyteMeeting?.leaveRoom?.();
        await dyteMeeting?.leave?.();
        console.log("[LiveMeeting] Left Dyte room");
      } catch (e) {
        console.warn("[LiveMeeting] Error leaving Dyte room:", e);
      }

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
      console.log("[LiveMeeting] Current loungeOpenStatus:", loungeOpenStatus);

      // ✅ Fetch latest lounge status in case it changed
      if (!eventId) {
        console.log("[LiveMeeting] No eventId, navigating away");
        if (isEventOwner || (role === "publisher" && !eventData?.created_by_id)) {
          navigate("/admin/events");
        } else {
          navigate(-1);
        }
        return;
      }

      try {
        console.log("[LiveMeeting] Fetching lounge-state...");
        const res = await fetch(toApiUrl(`events/${eventId}/lounge-state/`), {
          headers: authHeader(),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.lounge_open_status) {
            loungeStatus = data.lounge_open_status;
            console.log("[LiveMeeting] ✅ Lounge status after meeting end:", loungeStatus);
          } else {
            console.log("[LiveMeeting] No lounge_open_status in response:", data);
          }
        } else {
          console.warn("[LiveMeeting] Lounge state fetch failed:", res.status);
        }
      } catch (err) {
        // Use existing loungeOpenStatus if fetch fails
        console.error("[LiveMeeting] Error fetching lounge-state:", err);
      }

      // ✅ FIXED: Check if lounge is OPEN with post-event reason
      // The backend ensures "Post-event" is in the reason only for post-event lounge windows
      const isPostEventWindowOpen = loungeStatus?.status === "OPEN" &&
        loungeStatus?.reason?.includes("Post-event");

      console.log("[LiveMeeting] Checking lounge availability:");
      console.log("  - loungeStatus?.status:", loungeStatus?.status);
      console.log("  - loungeStatus?.reason:", loungeStatus?.reason);
      console.log("  - Has 'Post-event' in reason:", loungeStatus?.reason?.includes("Post-event"));
      console.log("  - isPostEventWindowOpen:", isPostEventWindowOpen);
      console.log("  - loungeStatus?.next_change:", loungeStatus?.next_change);

      if (isPostEventWindowOpen && loungeStatus?.next_change) {
        // Cancel any pending auto-navigation if the lounge has become available
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        }
        // Show post-event lounge immediately and don't schedule a redirect
        setIsPostEventLounge(true);
        setPostEventLoungeClosingTime(loungeStatus.next_change);
        return; // prevent scheduling a fallback redirect below
      } else {
        // Not in post-event window: show thank-you page
        setShowEndStateMessage(true);

        // Schedule a single auto-redirect after four seconds
        navigationTimeoutRef.current = setTimeout(() => {
          if (role === "publisher" || isEventOwner) {
            // Admins still go to dashboard
            navigate("/admin/events");
          } else {
            // Participants go explicitly to My Events (avoids history.goBack issues)
            navigate("/my-events");
          }
        }, 4000);

        // Clean up the timeout if the component unmounts
        return () => {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        };
      }
    },
    [navigate, role, isEventOwner, eventData?.created_by_id, updateLiveStatus, dyteMeeting, isBanned, eventId]
  );

  // ✅ Handler for exiting post-event lounge
  const handleExitPostEventLounge = useCallback(() => {
    setIsPostEventLounge(false);
    // ✅ Host goes to admin dashboard, participants go to My Events
    if (role === "publisher" || isEventOwner) {
      navigate("/admin/events");
    } else {
      navigate("/my-events");
    }
  }, [navigate, role, isEventOwner]);

  // Poll event status so clients exit when backend ends the meeting
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(toApiUrl(`events/${eventId}/`), { headers: authHeader() });
        if (!res.ok) {
          console.warn("[LiveMeeting] Status poll failed:", res.status);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        const previousStatus = dbStatus;
        if (data?.status) {
          setDbStatus(data.status);
          console.log("[LiveMeeting] Status poll result:", data.status);

          // ✅ NEW: Detect transition from draft → live for audience members
          if (role !== "publisher" && previousStatus !== "live" && data.status === "live") {
            console.log("[LiveMeeting] ✅ Meeting went live via status poll - audience can now join");
          }
        }
        // ✅ IMPROVED: Check if meeting has ended and handle it
        if (data?.status === "ended" && !endHandledRef.current) {
          console.log("[LiveMeeting] ✅ Detected meeting ended from status poll - triggering handleMeetingEnd");
          try {
            await handleMeetingEnd("ended");
          } catch (error) {
            console.error("[LiveMeeting] Error in handleMeetingEnd:", error);
          }
        }
      } catch (err) {
        console.error("[LiveMeeting] Status poll error:", err);
      }
    };

    // ✅ Fetch immediately on mount
    fetchStatus();
    // ✅ Poll more frequently (every 2 seconds instead of 3) for faster end detection
    const interval = setInterval(fetchStatus, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventId, handleMeetingEnd]);

  // ✅ NEW: Detect when post-event lounge time has ended using countdown timer
  // Uses postEventLoungeClosingTime instead of polling loungeOpenStatus to avoid premature closure
  useEffect(() => {
    console.log("[LiveMeeting LOUNGE_TIMER] Check conditions - isPostEventLounge:", isPostEventLounge, "loungeHasEnded:", loungeHasEnded, "postEventLoungeClosingTime:", postEventLoungeClosingTime);

    if (!isPostEventLounge || loungeHasEnded || !postEventLoungeClosingTime) {
      console.log("[LiveMeeting LOUNGE_TIMER] Early return: isPostEventLounge=" + isPostEventLounge + ", loungeHasEnded=" + loungeHasEnded + ", hasClosingTime=" + !!postEventLoungeClosingTime);
      return;
    }

    const checkLoungeExpired = () => {
      const now = new Date().getTime();
      const closingTime = new Date(postEventLoungeClosingTime).getTime();
      const timeUntilClose = closingTime - now;

      if (timeUntilClose <= 0) {
        console.log("[LiveMeeting] ✅ Post-event lounge time has ended (timer-based), showing end-state message", {
          closingTime: postEventLoungeClosingTime,
          now: new Date().toISOString(),
          elapsedMs: Math.abs(timeUntilClose),
        });
        setLoungeHasEnded(true);
      } else if (timeUntilClose < 5000) {
        console.log("[LiveMeeting LOUNGE_TIMER] Lounge closing soon:", Math.floor(timeUntilClose / 1000), "seconds remaining");
      }
    };

    // Check immediately
    checkLoungeExpired();

    // Then check every second
    const interval = setInterval(checkLoungeExpired, 1000);
    console.log("[LiveMeeting LOUNGE_TIMER] Started timer for lounge closing at:", postEventLoungeClosingTime);
    return () => {
      clearInterval(interval);
      console.log("[LiveMeeting LOUNGE_TIMER] Cleared timer");
    };
  }, [isPostEventLounge, loungeHasEnded, postEventLoungeClosingTime]);

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
      if (!dyteMeeting?.self?.roomJoined) return;
      const preset = (participant.presetName || "").toLowerCase();
      const designatedHostId = hostIdRef.current || hostIdHint || null;
      const primaryHostKey = primaryHostUserId ? `id:${primaryHostUserId}` : "";
      const participantKey = getParticipantUserKey(participant?._raw || participant);
      const isPublisher =
        preset.includes("host") ||
        preset.includes("publisher") ||
        preset.includes("admin") ||
        preset.includes("presenter") ||
        (hostIdHint && participant.id === hostIdHint);

      // If we already have a designated host ID, only pin that participant.
      if (designatedHostId && participant.id !== designatedHostId) return;
      // If we don't have designated host yet but know creator ID, only accept creator as canonical host.
      if (!designatedHostId && primaryHostKey && participantKey !== primaryHostKey) return;

      if (isPublisher) {
        if (!designatedHostId) setHostIdHint(participant.id || null);
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
  }, [dyteMeeting, getJoinedParticipants, initDone, role, hostIdHint, primaryHostUserId]);

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

        let found = getJoinedParticipants().find((p) => p?.id === payload.hostId);
        if (!found && payload?.hostUserKey) {
          found = getJoinedParticipants().find(
            (p) => getParticipantUserKey(p?._raw || p) === payload.hostUserKey
          );
        }
        if (found) {
          setHostJoined(true);
          setPinnedHost(found);
          if (!found.isPinned && typeof found.pin === "function") {
            found.pin().catch(() => { });
          }
        }
      }

      if (type === "lounge-pin" && payload?.pinnedId) {
        const targetTableId = payload?.tableId ? String(payload.tableId) : null;
        const currentTableId = activeTableId ? String(activeTableId) : null;
        if (!isLiveEventSocialLounge) return;
        if (targetTableId && currentTableId && targetTableId !== currentTableId) return;
        if (payload?.pinnedId === loungePinnedIdRef.current) return;
        setLoungePinnedId(payload.pinnedId);
      }

      if (type === "spotlight-user" && (payload?.participantId || payload?.participantUserKey)) {
        setSpotlightTarget({
          participantId: payload?.participantId || null,
          participantUserKey: payload?.participantUserKey || null,
          name: payload?.name || "Participant",
          byHostId: payload?.byHostId || null,
          ts: payload?.ts || Date.now(),
        });
      }

      if (type === "spotlight-clear") {
        setSpotlightTarget(null);
      }

      if (type === "mood-updated" && payload?.userKey) {
        setMoodMap((prev) => ({ ...prev, [payload.userKey]: payload?.mood || null }));
      }
    };

    dyteMeeting.participants?.on?.("broadcastedMessage", handleBroadcast);
    return () => dyteMeeting.participants?.off?.("broadcastedMessage", handleBroadcast);
  }, [dyteMeeting, getJoinedParticipants, activeTableId, isLiveEventSocialLounge]);

  useEffect(() => {
    if (!eventId || !roomJoined) return;
    syncMoodMapFromApi();
    const t = setInterval(syncMoodMapFromApi, 20000);
    return () => clearInterval(t);
  }, [eventId, roomJoined, syncMoodMapFromApi]);

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
    if (!dyteMeeting?.self?.roomJoined) return;
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

  // If spotlighted participant leaves, host clears spotlight and broadcasts clear.
  // Non-host clients should not auto-clear locally, otherwise layouts can diverge.
  useEffect(() => {
    if (!spotlightTarget) return;
    if (!isHost) return;
    if (!dyteMeeting?.self?.roomJoined) return;

    const spotlightId = spotlightTarget.participantId ? String(spotlightTarget.participantId) : "";
    const spotlightKey = spotlightTarget.participantUserKey ? String(spotlightTarget.participantUserKey) : "";
    const currentParticipants = [
      ...(dyteMeeting?.self ? [dyteMeeting.self] : []),
      ...getJoinedParticipants(),
    ];
    const exists = currentParticipants.some((pp) => {
      if (!pp) return false;
      if (spotlightId && String(pp.id) === spotlightId) return true;
      if (spotlightKey && getParticipantUserKey(pp?._raw || pp) === spotlightKey) return true;
      return false;
    });
    if (exists) return;

    setSpotlightTarget(null);
    try {
      dyteMeeting?.participants?.broadcastMessage?.("spotlight-clear", {
        byHostId: dyteMeeting?.self?.id || null,
        ts: Date.now(),
      });
    } catch (e) {
      console.warn("[Spotlight] Failed to auto-broadcast spotlight-clear:", e);
    }
  }, [getJoinedParticipants, spotlightTarget, dyteMeeting, isHost]);

  // Host broadcasts presence so audience can pin
  useEffect(() => {
    if (!isHost || !dyteMeeting?.self) return;
    if (!dyteMeeting.self.roomJoined) return;
    if (primaryHostUserId && !isPrimaryBroadcastHost) return;

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
  }, [isHost, dyteMeeting, primaryHostUserId, isPrimaryBroadcastHost]);

  useEffect(() => {
    if (hostIdHint) hostIdRef.current = hostIdHint;
  }, [hostIdHint]);

  useEffect(() => {
    if (pinnedHost?.id) hostIdRef.current = pinnedHost.id;
  }, [pinnedHost?.id]);

  useEffect(() => {
    loungePinnedIdRef.current = loungePinnedId;
  }, [loungePinnedId]);

  useEffect(() => {
    if (isPrimaryBroadcastHost && dyteMeeting?.self?.id) hostIdRef.current = dyteMeeting.self.id;
  }, [isPrimaryBroadcastHost, dyteMeeting?.self?.id]);

  const getCurrentRoomParticipants = useCallback(() => {
    const list = [];
    if (dyteMeeting?.self) list.push(dyteMeeting.self);
    getJoinedParticipants().forEach((p) => list.push(p));
    const seen = new Set();
    const deduped = [];
    for (const p of list) {
      if (!p?.id) continue;
      const key = String(p.id);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(p);
    }
    return deduped;
  }, [dyteMeeting?.self, getJoinedParticipants]);

  const pickFirstByJoinTime = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) return null;
    let best = null;
    let bestTs = Number.POSITIVE_INFINITY;
    for (const p of list) {
      if (!p?.id) continue;
      const ts = participantJoinedAtRef.current.get(p.id);
      const safeTs = Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
      if (!best || safeTs < bestTs) {
        best = p;
        bestTs = safeTs;
      } else if (safeTs === bestTs && best && String(p.id) < String(best.id)) {
        best = p;
        bestTs = safeTs;
      }
    }
    return best;
  }, []);

  // ---------- Build participants list for your NEW UI ----------
  const [participantsTick, setParticipantsTick] = useState(0);
  const observedParticipantsRef = useRef(new Map()); // fallback map from events

  useEffect(() => {
    if (!dyteMeeting) return;

    if (!isLiveEventSocialLounge) {
      if (loungePinnedIdRef.current) setLoungePinnedId(null);
      if (loungePinElectionTimeoutRef.current) {
        clearTimeout(loungePinElectionTimeoutRef.current);
        loungePinElectionTimeoutRef.current = null;
      }
      return;
    }

    if (loungePrimaryUserId) {
      if (loungePinnedIdRef.current) setLoungePinnedId(null);
      if (loungePinElectionTimeoutRef.current) {
        clearTimeout(loungePinElectionTimeoutRef.current);
        loungePinElectionTimeoutRef.current = null;
      }
      return;
    }

    const currentRoom = getCurrentRoomParticipants();
    const pinnedId = loungePinnedIdRef.current;
    if (pinnedId && !currentRoom.some((p) => p.id === pinnedId)) {
      setLoungePinnedId(null);
    }

    if (!loungePinnedIdRef.current && currentRoom.length > 0 && !loungePinElectionTimeoutRef.current) {
      loungePinElectionTimeoutRef.current = setTimeout(() => {
        loungePinElectionTimeoutRef.current = null;
        if (!isLiveEventSocialLounge) return;
        if (loungePinnedIdRef.current) return;
        const first = pickFirstByJoinTime(getCurrentRoomParticipants());
        if (!first?.id) return;
        setLoungePinnedId(first.id);
        dyteMeeting?.participants?.broadcastMessage?.("lounge-pin", {
          pinnedId: first.id,
          tableId: activeTableId || null,
        });
      }, 350);
    }
  }, [
    dyteMeeting,
    isLiveEventSocialLounge,
    participantsTick,
    activeTableId,
    getCurrentRoomParticipants,
    pickFirstByJoinTime,
    loungePrimaryUserId,
  ]);


  // Sync new joiners with host permission toggles
  useEffect(() => {
    if (!isHost || !dyteMeeting?.participants?.joined || !dyteMeeting?.self) return;
    const handleParticipantJoined = async (participant) => {
      if (participant.id === dyteMeeting.self?.id) return;
      const roomInfo = participantRoomMap.get(participant?.id);
      const participantUserId = getBackendUserId(participant);
      const isInLoungeOrBreakout =
        roomInfo?.type === "lounge" ||
        roomInfo?.type === "breakout" ||
        loungeTables.some((table) => {
          if (!table?.participants || !participantUserId) return false;
          const participantsList = Array.isArray(table.participants)
            ? table.participants
            : Object.values(table.participants);
          return participantsList.some((tableParticipant) => {
            const tableUserId = tableParticipant?.user_id || tableParticipant?.userId;
            return tableUserId && String(tableUserId) === String(participantUserId);
          });
        });
      const shouldApplyBreakLock = isOnBreak && !isInLoungeOrBreakout;
      try {
        await dyteMeeting.participants.updatePermissions([participant.id], {
          canProduceScreenshare: "NOT_ALLOWED",
          requestProduceScreenshare: false,
          chat: {
            public: { canSend: hostPerms.chat, text: hostPerms.chat, files: hostPerms.chat },
            private: { canSend: hostPerms.chat, text: hostPerms.chat, files: hostPerms.chat },
          },
          polls: { canCreate: hostPerms.polls, canVote: hostPerms.polls },
          ...((hostMediaLocks.mic || shouldApplyBreakLock)
            ? { canProduceAudio: "NOT_ALLOWED", requestProduceAudio: false }
            : {}),
          ...((hostMediaLocks.cam || shouldApplyBreakLock)
            ? { canProduceVideo: "NOT_ALLOWED", requestProduceVideo: false }
            : {}),
        });
      } catch (e) {
        console.warn("Failed to sync permissions", e);
      }
      if (hostMediaLocks.mic || shouldApplyBreakLock) {
        try { await participant?.disableAudio?.(); } catch { }
      }
      if (hostMediaLocks.cam || shouldApplyBreakLock) {
        try { await participant?.disableVideo?.(); } catch { }
      }
    };
    dyteMeeting.participants.joined.on("participantJoined", handleParticipantJoined);
    return () => dyteMeeting.participants.joined.off("participantJoined", handleParticipantJoined);
  }, [dyteMeeting, hostPerms.chat, hostPerms.polls, hostPerms.screenShare, hostMediaLocks, isHost, isOnBreak, loungeTables, participantRoomMap]);

  useEffect(() => {
    if (!dyteMeeting?.self) return;
    if (isOnBreak) {
      enforceSelfBreakMediaLock();
    }
    if (isHost) {
      updateAudienceMediaForBreak(isOnBreak);
    }
  }, [dyteMeeting, enforceSelfBreakMediaLock, isHost, isOnBreak, updateAudienceMediaForBreak]);

  useEffect(() => {
    if (!isOnBreak || !dyteMeeting?.self) return;
    const interval = setInterval(() => {
      enforceSelfBreakMediaLock();
    }, 800);
    return () => clearInterval(interval);
  }, [dyteMeeting, enforceSelfBreakMediaLock, isOnBreak]);

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
    setLoungePinnedId(null);

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

    // ✅ Get host ID from dyteMeeting for audience members
    const hostFromMeeting = dyteMeeting?.host?.id || dyteMeeting?.meta?.hostId || dyteMeeting?.host?.participantId;

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

      const isHostLikePreset =
        preset.includes("host") ||
        preset.includes("publisher") ||
        preset.includes("admin") ||
        preset.includes("presenter") ||
        rawRole.includes("host") ||
        rawRole.includes("publisher") ||
        rawRole.includes("admin") ||
        rawRole.includes("presenter") ||
        raw?.isHost === true ||
        raw?.is_host === true ||
        String(raw?.role || "").toLowerCase().includes("host") ||  // ✅ Direct role property
        String(raw?.participantRole || "").toLowerCase().includes("host");  // ✅ Alternative role property

      const isSpeakerLikePreset =
        preset.includes("speaker") ||
        preset.includes("moderator") ||
        rawRole.includes("speaker") ||
        rawRole.includes("moderator");

      // If preset indicates publisher/host, mark as Host
      // Otherwise check if they're the pinned host or the broadcast host hint
      const hostIdCurrent = hostIdRef.current || hostIdHint; // ✅ Fallback to hostIdHint if hostIdRef is cleared during lounge transition
      const hostUserKeyCurrent = hostUserKeyRef.current;
      const participantUserKey = getParticipantUserKey(p);
      // ✅ Check if participant is in the "host" section of the participants map
      const toArraySafe = (source) => {
        if (!source) return [];
        if (Array.isArray(source)) return source;
        if (typeof source?.toArray === "function") return source.toArray();
        if (typeof source?.values === "function") return Array.from(source.values());
        try { return Array.from(source); } catch { return []; }
      };

      const isInHostSection = toArraySafe(dyteMeeting?.participants?.host).some(x => x?.id === p.id) ||
        toArraySafe(dyteMeeting?.participants?.hosts).some(x => x?.id === p.id) ||
        toArraySafe(dyteMeeting?.participants?.active).some(x => x?.id === p.id && (String(x?.role || "").toLowerCase().includes("host") || String(x?.presetName || "").toLowerCase().includes("host")));

      // ✅ Also check raw properties that might indicate host role
      const participantRoleStr = String(p?.role || p?._raw?.role || "").toLowerCase();
      const participantPresetStr = String(p?.presetName || p?._raw?.presetName || "").toLowerCase();
      const hasHostRoleOrPreset = participantRoleStr.includes("host") || participantRoleStr.includes("publisher") ||
        participantPresetStr.includes("host") || participantPresetStr.includes("publisher");

      const isHostParticipant =
        isHostLikePreset ||
        hasHostRoleOrPreset ||
        (hostIdCurrent && p.id === hostIdCurrent) ||
        (hostUserKeyCurrent && participantUserKey && participantUserKey === hostUserKeyCurrent) ||
        (isHost && dyteMeeting?.self?.id && p.id === dyteMeeting.self.id) ||
        (hostFromMeeting && p.id === hostFromMeeting) ||  // ✅ Check if participant is the host from dyteMeeting
        (dyteMeeting?.host && (p.name === dyteMeeting.host.name || p.id === dyteMeeting.host.id)) ||  // ✅ Match by name or ID
        isInHostSection;  // ✅ Check if participant is in the "host" section of participants map

      const participantEmail = String(
        raw?.email ||
        raw?.user_email ||
        raw?.userEmail ||
        parsedMeta?.email ||
        parsedMeta?.user_email ||
        parsedMeta?.userEmail ||
        ""
      ).trim().toLowerCase();
      const participantName = String(p?.name || raw?.name || parsedMeta?.name || "").trim().toLowerCase();
      const participantIdKey = String(
        raw?.clientSpecificId ||
        raw?.client_specific_id ||
        p?.clientSpecificId ||
        raw?.userId ||
        raw?.user_id ||
        parsedMeta?.user_id ||
        parsedMeta?.userId ||
        p?.userId ||
        p?.id ||
        ""
      ).trim().toLowerCase();
      const assignedRole =
        (participantUserKey ? assignedRoleByIdentity.get(String(participantUserKey).toLowerCase()) : null) ||
        (participantIdKey ? assignedRoleByIdentity.get(`id:${participantIdKey}`) : null) ||
        (participantEmail ? assignedRoleByIdentity.get(`email:${participantEmail}`) : null) ||
        (participantName ? assignedRoleByIdentity.get(`name:${participantName}`) : null) ||
        null;
      const finalRole = assignedRole || (isHostParticipant ? "Host" : (isSpeakerLikePreset ? "Speaker" : "Audience"));

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
        role: finalRole,
        presetName: p.presetName || "", // ✅ Include Dyte SDK preset name for display
        mic: Boolean(p.audioEnabled),
        cam: Boolean(p.videoEnabled),
        active: Boolean(p.isSpeaking),
        joinedAtTs: participantJoinedAtRef.current.get(p.id),
        picture: p.picture || p.avatar || p.profilePicture || metaPicture || "", // ✅ Extract picture
        inMeeting: Boolean(p.inMeeting),
        isOccupyingLounge: Boolean(p.isOccupyingLounge),
        mood: participantUserKey ? (moodMap[participantUserKey] || null) : null,
        _raw: p,
      };
    });
  }, [dyteMeeting, getJoinedParticipants, isHost, pinnedHost, hostIdHint, participantsTick, loungeTables, assignedRoleByIdentity, moodMap]);

  // ✅ Phase 3: Sync loungeTables with participantRoomMap
  useEffect(() => {
    if (loungeTables.length === 0 || !participants || participants.length === 0) return;

    const newRoomMap = new Map(participantRoomMap);

    // For each table, update room location for all participants
    for (const table of loungeTables) {
      const roomType = table.category === "BREAKOUT" ? "breakout" : "lounge";
      const roomName = table.name || `${table.category} Room ${table.id}`;

      // Update all participants in this table
      if (table.participants) {
        const participantsList = Array.isArray(table.participants)
          ? table.participants
          : Object.values(table.participants);

        for (const tableParticipant of participantsList) {
          const userId = String(tableParticipant.user_id || tableParticipant.userId);

          // Find the corresponding Dyte participant
          const dyteParticipant = participants.find(p => {
            const pUserId = getBackendUserId(p);
            return pUserId && String(pUserId) === userId;
          });

          if (dyteParticipant && dyteParticipant.id) {
            newRoomMap.set(dyteParticipant.id, {
              type: roomType,
              roomId: String(table.id),
              roomName: roomName,
              roomCategory: table.category,
              lastUpdate: Date.now()
            });

            // Update cache
            participantIdMapRef.current.set(dyteParticipant.id, userId);
          }
        }
      }
    }

    // Also mark main room participants (not in any lounge table)
    const loungeUserIds = new Set();
    for (const table of loungeTables) {
      if (table.participants) {
        const participantsList = Array.isArray(table.participants)
          ? table.participants
          : Object.values(table.participants);
        for (const p of participantsList) {
          loungeUserIds.add(String(p.user_id || p.userId));
        }
      }
    }

    for (const p of participants) {
      const pUserId = getBackendUserId(p);
      if (pUserId && !loungeUserIds.has(String(pUserId))) {
        // ✅ Always update to Main Room if not in any lounge (catches participants leaving lounges)
        if (p.inMeeting) {
          newRoomMap.set(p.id, {
            type: "main",
            roomId: null,
            roomName: "Main Room",
            roomCategory: null,
            lastUpdate: Date.now()
          });
        }
      }
    }

    setParticipantRoomMap(newRoomMap);
  }, [loungeTables, participants]);

  // ✅ Build available participants for manual assignment (all meeting participants except self)
  const availableParticipantsForAssign = useMemo(() => {
    if (!participants || participants.length === 0) return [];

    // Filter to include all participants in the meeting, excluding the current user (host/self)
    return participants
      .filter((p) => {
        // Must be in meeting
        if (!p.inMeeting) return false;
        // Exclude self (the current user)
        if (dyteMeeting?.self?.id && p.id === dyteMeeting.self.id) return false;
        return true;
      })
      .map((p) => {
        // Extract the actual database user_id from the participant metadata
        const databaseUserId =
          p._raw?.customParticipantId ||
          p._raw?.userId ||
          p._raw?.user_id ||
          p.clientSpecificId ||
          p.userId ||
          parseInt(p.id) || // Fallback to parsed participant ID
          p.id;

        return {
          user_id: databaseUserId,  // ✅ Use actual database user ID
          full_name: p.name,
          username: p.name,
          email: p._raw?.email || p._raw?.user_email || "",
        };
      });
  }, [participants, dyteMeeting?.self?.id]);

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
    breakoutJoinInProgressRef.current = false;
    if (breakoutJoinTimeoutRef.current) {
      clearTimeout(breakoutJoinTimeoutRef.current);
      breakoutJoinTimeoutRef.current = null;
    }
    // 1. Notify backend via MAIN socket (same endpoint as lounge)
    if (mainSocketRef.current?.readyState === WebSocket.OPEN) {
      console.log("[LiveMeeting] Sending leave_table via main socket");
      mainSocketRef.current.send(JSON.stringify({ action: "leave_table" }));
    }

    // 2. ✅ SPECIAL HANDLING FOR DURING-EVENT LOUNGE (non-post-event)
    // When user/host leaves a lounge table during an event, show the lounge overlay again
    // This allows them to rejoin tables or return to main meeting
    if (!isPostEventLounge && loungeOpenStatus?.status === "OPEN") {
      console.log("[LiveMeeting] During-event lounge - returning to lounge overlay after leaving table");
      try {
        if (dyteMeeting) {
          try {
            await dyteMeeting.leaveRoom();
          } catch (e) {
            console.warn("[LiveMeeting] Error leaving lounge room:", e);
          }
        }

        // Reset breakout state to show lounge overlay
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

        // ✅ Show lounge overlay so user can see table list
        setLoungeOpen(true);
        console.log("[LiveMeeting] Successfully returned to lounge overlay");
      } finally {
        setTimeout(() => {
          leaveBreakoutInFlightRef.current = false;
        }, 300);
      }
      return;
    }

    // 3. ✅ SPECIAL HANDLING FOR POST-EVENT LOUNGE
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
  }, [dyteMeeting, isPostEventLounge, loungeOpenStatus?.status]);

  const forceRejoinMainFromLounge = useCallback(async () => {
    // Close lounge UI and force a fresh join via API (to respect waiting room/grace rules)
    setLoungeOpen(false);
    setJoinMainRequested(true);
    setHostChoseLoungeOnly(false);
    rejoinFromLoungeRef.current = true;
    loungeJoinTimestampRef.current = null; // ✅ Clear grace period when force-rejoin happens

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
    isBreakoutRef.current = false;
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
    if (breakoutJoinInProgressRef.current) {
      console.log("[LiveMeeting] Breakout join in progress, skipping lounge rejoin");
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

  // ✅ REMOVED: This effect was causing premature auto-exit from event lounge
  // It relied on client-side preEventLoungeOpen calculation instead of server loungeOpenStatus
  // Users now stay in lounge until it actually closes (server says so) or they manually leave
  // This effect has been replaced by the consolidated lounge close detection below which uses server status
  /*
  useEffect(() => {
    const wasOpen = preEventLoungeWasOpenRef.current;
    if (wasOpen && !preEventLoungeOpen) {
      setLoungeOpen(false);
      if (isBreakout && !isInBreakoutTable && !breakoutJoinInProgressRef.current) {
        handleLeaveBreakout();
      }
    }
    preEventLoungeWasOpenRef.current = preEventLoungeOpen;
  }, [preEventLoungeOpen, isBreakout, isInBreakoutTable, handleLeaveBreakout]);
  */

  // ✅ SERVER-DRIVEN LOUNGE CLOSE DETECTION
  // Only triggers when server actually closes the lounge (not based on client-side calculations)
  // This allows users to stay in event lounge indefinitely until they manually leave or server closes it
  useEffect(() => {
    if (role === "publisher") return; // Hosts don't auto-rejoin
    if (!isBreakout) return; // Only applies to users in breakout/lounge

    // ✅ CRITICAL FIX: Do not force rejoin if user is in ANY table
    // This check happens FIRST before anything else to prevent premature rejoin
    if (activeTableId) {
      console.log("[LiveMeeting] ✅ User is in breakout table, preventing auto-rejoin. activeTableId:", activeTableId);
      return;
    }

    // ✅ NEW: Grace period after joining to prevent immediate auto-rejoin
    // User might have just joined, and lounge status might be in a transient state
    // Wait 5 seconds after join before allowing auto-rejoin
    const GRACE_PERIOD_MS = 5000;
    const timeSinceJoin = loungeJoinTimestampRef.current
      ? Date.now() - loungeJoinTimestampRef.current
      : Infinity;

    if (timeSinceJoin < GRACE_PERIOD_MS) {
      console.log(`[LiveMeeting] ⏳ User just joined lounge (${Math.round(timeSinceJoin)}ms ago), in grace period. Skipping auto-rejoin.`);
      return;
    }

    // Log that we reached past first guard - user is in breakout but no activeTableId
    console.log("[LiveMeeting] ⚠️ User in breakout but activeTableId is null/empty. This is unusual.");

    if (isPostEventLounge) return; // ✅ Do NOT auto-rejoin from post-event lounge - user must manually exit

    // ✅ CRITICAL FIX: Only check server-driven condition
    // Only rejoin when server explicitly closes lounge, not based on client-side time calculations
    const serverLoungeIsClosed = loungeOpenStatus?.status === "CLOSED";

    console.log("[LiveMeeting] Auto-rejoin check - serverLoungeIsClosed:", serverLoungeIsClosed, "status:", loungeOpenStatus?.status);

    if (!serverLoungeIsClosed) return;

    // Guard against concurrent calls
    if (!shouldTriggerLoungeRejoin()) return;

    console.log("[LiveMeeting] ⚠️ TRIGGERING AUTO-REJOIN: All guards passed, lounge is closed");

    // Execute rejoin with race condition protection
    (async () => {
      loungeCloseDetectionRef.current.inFlightCount++;
      loungeCloseDetectionRef.current.lastTriggerTime = Date.now();

      try {
        console.log("[LiveMeeting] Server lounge closed, triggering auto-rejoin to main meeting");
        await forceRejoinMainFromLounge();
      } catch (e) {
        console.error("[LiveMeeting] Error during auto-rejoin:", e);
      } finally {
        loungeCloseDetectionRef.current.inFlightCount--;
      }
    })();
  }, [
    role,
    isBreakout,
    loungeOpenStatus?.status,
    isPostEventLounge,
    activeTableId,
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
    if (isLiveEventSocialLounge) {
      if (loungePrimaryUserId) {
        const primaryKey = `id:${String(loungePrimaryUserId)}`;
        const fromParticipants = participants.find((p) => getParticipantUserKey(p?._raw || p) === primaryKey);
        if (fromParticipants?._raw) return fromParticipants._raw;
        if (fromParticipants) return fromParticipants;
        const fromJoined = getJoinedParticipants().find((p) => getParticipantUserKey(p) === primaryKey);
        if (fromJoined) return fromJoined;
        if (dyteMeeting?.self && getParticipantUserKey(dyteMeeting.self) === primaryKey) {
          return dyteMeeting.self;
        }
      }
      const pinnedId = loungePinnedIdRef.current || loungePinnedId;
      if (!pinnedId) return null;
      const fresh =
        getJoinedParticipants().find((x) => x.id === pinnedId) ||
        (dyteMeeting?.self?.id === pinnedId ? dyteMeeting.self : null);
      if (fresh) return fresh;
      const fallback = participants.find((x) => x.id === pinnedId);
      return fallback?._raw || fallback || null;
    }

    // Host-controlled spotlight: if active, force spotlighted participant as primary view for everyone.
    // This intentionally overrides canonical host pin.
    if (!isBreakout && spotlightTarget) {
      const spotlightId = spotlightTarget.participantId ? String(spotlightTarget.participantId) : "";
      const spotlightKey = spotlightTarget.participantUserKey ? String(spotlightTarget.participantUserKey) : "";

      let spotlighted = null;
      if (spotlightId) {
        spotlighted =
          getJoinedParticipants().find((x) => String(x?.id) === spotlightId) ||
          participants.find((x) => String(x?.id) === spotlightId) ||
          null;
      }
      if (!spotlighted && spotlightKey) {
        spotlighted =
          getJoinedParticipants().find((x) => getParticipantUserKey(x?._raw || x) === spotlightKey) ||
          participants.find((x) => getParticipantUserKey(x?._raw || x) === spotlightKey) ||
          null;
      }
      if (!spotlighted && dyteMeeting?.self) {
        const selfKey = getParticipantUserKey(dyteMeeting.self);
        if ((spotlightId && String(dyteMeeting.self.id) === spotlightId) || (spotlightKey && selfKey === spotlightKey)) {
          spotlighted = dyteMeeting.self;
        }
      }

      if (spotlighted) return spotlighted?._raw || spotlighted;
    }

    // Canonical host pin: when creator is present, everyone must pin the same creator participant.
    if (!isBreakout && primaryHostUserId) {
      const primaryHostKey = `id:${primaryHostUserId}`;
      const creatorHost =
        getJoinedParticipants().find((x) => getParticipantUserKey(x?._raw || x) === primaryHostKey) ||
        participants.find((x) => getParticipantUserKey(x?._raw || x) === primaryHostKey) ||
        (dyteMeeting?.self && getParticipantUserKey(dyteMeeting.self) === primaryHostKey ? dyteMeeting.self : null);
      // ✅ FIX: Don't pin creator host if they're occupying a breakout room
      // In main view, only pin if they're actually in main room
      if (creatorHost && !creatorHost.isOccupyingLounge) {
        console.log("[LatestPinnedHost] ✅ Pinning creator host from main room:", creatorHost.name);
        return creatorHost?._raw || creatorHost;
      } else if (creatorHost && creatorHost.isOccupyingLounge) {
        console.log("[LatestPinnedHost] ❌ Creator host is in breakout room, not pinning in main view:", creatorHost.name);
        // Fall through to find other participants
      }
    }

    // ✅ FORCE for primary host only: use self as source of truth
    // In breakout/lounge, always pin self if host is present
    if (isPrimaryBroadcastHost && dyteMeeting?.self) {
      const selfParticipant = participants.find(x => x.id === dyteMeeting.self.id);

      // ✅ NEW RULE: If host is in lounge, ALWAYS show the host (not other participants)
      // This ensures both host and audience see the host when they're present
      if (selfParticipant?.isOccupyingLounge && isBreakout) {
        console.log("[LoungePinning] Host in lounge: showing self (the host) in pinned area");
        return selfParticipant;
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
      return selfParticipant;
    }

    let p = pinnedHost;
    const designatedHostId = hostIdRef.current || hostIdHint || null;

    // Keep all clients aligned to the same designated host when available.
    if (!isBreakout && designatedHostId) {
      const designated =
        getJoinedParticipants().find((x) => x?.id === designatedHostId) ||
        participants.find((x) => x?.id === designatedHostId) ||
        (dyteMeeting?.self?.id === designatedHostId ? dyteMeeting.self : null);
      if (designated) p = designated;
    }

    // ✅ CRITICAL FIX: In breakout rooms, verify pinned host is actually in the current room
    // If the pinned host is from the main room (not in this breakout table), reset and find a local participant instead
    // This fixes the issue where host from main room shows blank video in the lounge breakout room
    if (isBreakout && p) {
      const currentRoomParticipants = getJoinedParticipants();
      const pinnedIsInMyRoom = currentRoomParticipants.some(x => x.id === p.id);

      if (!pinnedIsInMyRoom) {
        console.log("[LatestPinnedHost] Pinned host is NOT in current breakout room (" + (p.name || p.id) + "), resetting to find local participant");
        p = null; // Reset to null, will use fallback logic below
      }
    }

    // ✅ FIX: If pinnedHost is null but there IS a host participant connected, find and use them
    // This fixes the issue where host appears in Participants list but shows as "disconnected" in pinned area
    // CRITICAL: In breakout rooms, verify the host is actually in the current room (not in main room)
    if (!p && (!isHost || !isPrimaryBroadcastHost)) {
      // ✅ CRITICAL FIX: In social lounges, host may be in a different lounge table
      // Search in the full participants array, not just getJoinedParticipants()
      // This ensures audience can find the host even if they're in separate lounge tables
      const hostParticipant = participants.find((participant) => {
        if (!participant) return false;
        const preset = (participant.presetName || "").toLowerCase();
        const role = (participant.role || "").toLowerCase();
        return (
          preset.includes("host") ||
          preset.includes("publisher") ||
          preset.includes("admin") ||
          preset.includes("presenter") ||
          role.includes("host") ||
          role.includes("publisher")
        );
      });

      // ✅ CRITICAL FIX: In breakout rooms, verify host is in current room
      // Only use the found host if they're actually in the current breakout room
      if (hostParticipant) {
        if (isBreakout) {
          // ✅ RULE: In breakout (social lounge), if host is found, ALWAYS pin the host
          // The host should be shown to everyone (both host and audience) when present
          // Host may or may not be explicitly in a lounge table, but should still be pinned
          console.log("[LatestPinnedHost] Host found in breakout - pinning host:", hostParticipant.name);
          p = hostParticipant;
        } else {
          // ✅ FIX: In main view, verify host is actually in main room
          // Don't leak breakout room participants into main room video feed
          // Only pin if they're NOT occupying a lounge (not in a breakout room)
          console.log("[LatestPinnedHost] DEBUG: Checking host in main view:", {
            hostName: hostParticipant.name,
            isOccupyingLounge: hostParticipant.isOccupyingLounge,
            id: hostParticipant.id,
            inMeeting: hostParticipant.inMeeting,
            preset: hostParticipant.presetName
          });
          if (!hostParticipant.isOccupyingLounge) {
            console.log("[LatestPinnedHost] ✅ PINNING: Found host in main room, using as pinned host:", hostParticipant.name);
            p = hostParticipant;
          } else {
            console.log("[LatestPinnedHost] ❌ BLOCKING: Host found but is in breakout room - not pinning in main view:", hostParticipant.name);
            // Don't pin - leave for fallback logic which will handle empty main room
            p = null;
          }
        }
      }
    }

    // ✅ NOTE: Logic for audience in breakout lounge is now simplified
    // We don't pin the host for audience anymore (see line 6061-6072)
    // Instead, audience always sees the first real participant via fallback logic at line 6152-6172
    if (p && !isHost) {
      const pinnedHostParticipant = participants.find(x => x.id === p.id);

      // This block now only applies to main view (!isBreakout)
      // In breakout, p is already set to a real participant, not the host
      if (isBreakout && pinnedHostParticipant) {
        // Fallback: if somehow a host got pinned in breakout for audience, find other members
        const hostId = hostIdRef.current || pinnedHost?.id || hostIdHint;
        const isTheHost = pinnedHostParticipant.id === hostId || pinnedHostParticipant.role === "Host";

        if (isTheHost) {
          console.log("[LoungePinning-Audience] Host somehow pinned in breakout (should not happen) - finding other members...");

          const otherLoungeMembers = participants.filter(
            x =>
              x.id !== p.id &&
              x.id !== dyteMeeting?.self?.id &&
              x.inMeeting &&
              x.id
          );

          if (otherLoungeMembers.length > 0) {
            console.log("[LoungePinning] Audience: Showing other member instead of host:", otherLoungeMembers[0].name);
            p = otherLoungeMembers[0];
          } else {
            console.log("[LoungePinning] Audience: No other members found - will show fallback message");
            return null;
          }
        }
      }

      if (pinnedHostParticipant?.isOccupyingLounge && !isBreakout) {
        console.log("[LoungePinning-Audience] Pinned host IS in lounge, finding other lounge members...");

        // ✅ When pinned host is in a lounge, show OTHER members in the SAME lounge, not main room participants
        const loungeMembers = participants.filter(
          x =>
            x.isOccupyingLounge && // Must be in a lounge
            x.id !== p.id && // Not the pinned host
            x.id !== dyteMeeting?.self?.id && // Not self (the viewer)
            x.inMeeting &&
            x.id
        );

        console.log("[LoungePinning] Lounge members found:", loungeMembers.map(x => ({
          id: x.id,
          name: x.name
        })));

        if (loungeMembers.length > 0) {
          console.log("[LoungePinning] Audience: Pinning lounge member:", loungeMembers[0].name);
          p = loungeMembers[0];
        } else {
          console.log("[LoungePinning] Audience: No other members in lounge, showing welcome screen");
          return null;
        }
      } else {
        console.log("[LoungePinning-Audience] Pinned host is NOT in lounge or not found:", {
          pinnedHostFound: !!pinnedHostParticipant,
          pinnedHostInLounge: pinnedHostParticipant?.isOccupyingLounge
        });
      }
    }

    // ✅ FIX: If in breakout and no official host pinned, find first participant (non-host for audience)
    if (!p && isBreakout) {
      // For audience, exclude the host to show the first real participant
      // Identify host by preset name AND by ID (hostId might not be reliable)
      const hostIdFromRef = hostIdRef.current || hostIdHint;

      // ✅ NEW: Helper to reliably identify if a participant is the host
      const isParticipantHost = (participant) => {
        if (!participant) return false;
        // Check by ID first if we know the host ID
        if (hostIdFromRef && participant.id === hostIdFromRef) return true;
        // Check by preset name (most reliable for identifying host)
        const preset = (participant.presetName || "").toLowerCase();
        const role = (participant.role || "").toLowerCase();
        return (
          preset.includes("host") ||
          preset.includes("publisher") ||
          preset.includes("admin") ||
          preset.includes("presenter") ||
          role.includes("host")
        );
      };

      const breakoutParticipants = participants.filter(
        (x) =>
          x.id &&
          x.id !== dyteMeeting?.self?.id &&
          !isParticipantHost(x)  // Exclude anyone who is the host
      );

      if (breakoutParticipants.length > 0) {
        console.log("[LoungePinning] Breakout fallback: Found first real participant (non-host):", breakoutParticipants[0].name);
        p = breakoutParticipants[0];
      } else {
        // Fallback: If all other participants are host or self, show self
        const selfParticipant = participants.find(x => x.id === dyteMeeting?.self?.id);
        if (selfParticipant) {
          console.log("[LoungePinning] Breakout fallback: Only host available, showing self");
          p = selfParticipant;
        } else {
          console.log("[LoungePinning] Breakout fallback: No participants available at all");
        }
      }
      // If no participants at all, p remains null - welcome/placeholder UI will show
    }

    // ✅ CRITICAL FIX: When viewing main room (!isBreakout), only show main room participants
    // If all participants are in lounges, show null (no participant in main stage)
    if (!isBreakout && p) {
      const pinnedIsInLounge = p.isOccupyingLounge;
      if (pinnedIsInLounge) {
        console.log("[MainRoomFilter] Pinned participant is in lounge, not showing in main room view");
        // Try to find a main room participant
        const mainRoomParticipants = participants.filter(
          (x) => x.id && !x.isOccupyingLounge && x.id !== dyteMeeting?.self?.id
        );
        if (mainRoomParticipants.length > 0) {
          console.log("[MainRoomFilter] Found main room participant:", mainRoomParticipants[0].name);
          p = mainRoomParticipants[0];
        } else {
          console.log("[MainRoomFilter] No participants in main room (all are in lounges), showing welcome screen");
          return null;
        }
      }
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
  }, [
    pinnedHost,
    participantsTick,
    getJoinedParticipants,
    isBreakout,
    dyteMeeting?.self,
    camOn,
    isHost,
    isPrimaryBroadcastHost,
    primaryHostUserId,
    participants,
    isLiveEventSocialLounge,
    loungePinnedId,
    loungePrimaryUserId,
    spotlightTarget,
  ]);

  // Pinned “host” view data
  const meetingMeta = useMemo(
    () => ({
      title: eventTitle,
      live: dbStatus === "live",
      timer: joinElapsedLabel,
      recording: isRecording,
      recordingPaused: isRecordingPaused,
      recordingId,
      roomLabel: isBreakout ? "Breakout" : "Pinned",
      host: {
        name: latestPinnedHost?.name || (isBreakout ? "Breakout Room" : "Waiting for host"),
        role: latestPinnedHost ? (isBreakout ? "Member" : "Host") : (isBreakout ? "Member" : "Disconnected"),
      },
    }),
    [eventTitle, dbStatus, latestPinnedHost, joinElapsedLabel, isBreakout, isRecording, isRecordingPaused, recordingId]
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
  // ✅ FIX: Use latestPinnedHost directly (has role field), fallback to _raw only for raw SDK data
  const pinnedRaw = latestPinnedHost || null;

  const pinnedIsSelf = Boolean(pinnedRaw?.id && dyteMeeting?.self?.id && pinnedRaw.id === dyteMeeting.self.id);

  // ✅ Determine if pinned participant is the host using same logic as groupedMembers (right panel)
  const pinnedIsHost = useMemo(() => {
    if (!pinnedRaw?.id) return false;
    const hostId = hostIdRef.current || pinnedHost?.id || hostIdHint || (isHost ? dyteMeeting?.self?.id : null);
    const hostUserKey = hostUserKeyRef.current;
    const hostFromKey = hostUserKey
      ? participants.find((p) => getParticipantUserKey(p?._raw || p) === hostUserKey)
      : null;
    const hostIdExists = hostId ? participants.some((p) => p.id === hostId) : false;
    const effectiveHostId = hostIdExists ? hostId : (hostFromKey?.id || null);

    // Check if pinned participant is the host
    if (effectiveHostId) {
      return pinnedRaw.id === effectiveHostId;
    }
    // Fallback to role check if no effective host ID
    return pinnedRaw.role === "Host";
  }, [pinnedRaw?.id, pinnedRaw?.role, hostIdRef, pinnedHost?.id, hostIdHint, isHost, dyteMeeting?.self?.id, participants]);

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
  // FIXED: Audience should only see meeting when dbStatus is "live" or they've joined their room
  // Host sees immediately (role === "publisher"), breakout rooms work as before (isBreakout)
  const shouldShowMeeting =
    role === "publisher" ||
    isBreakout ||
    (role !== "publisher" && (dbStatus === "live" || roomJoined));
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

  const handleLeaveMeetingClick = useCallback(async () => {
    if (isHost) {
      setLeaveDialogOpen(true);
      return;
    }
    await handleMeetingEnd("left");
  }, [handleMeetingEnd, isHost]);

  // Handle back button - show confirmation if in breakout/lounge, otherwise use existing leave logic
  const handleBackButtonClick = useCallback(() => {
    // Check if user is in a breakout/lounge table
    if (activeTableId) {
      // User is in a breakout/lounge - show confirmation dialog
      setLeaveTableDialogOpen(true);
      return;
    }

    // User is not in breakout/lounge - use existing leave logic
    handleLeaveMeetingClick();
  }, [activeTableId, handleLeaveMeetingClick]);

  // Handle confirmation to leave current table/room
  const handleConfirmLeaveTable = useCallback(async () => {
    setLeaveTableDialogOpen(false);
    await handleLeaveBreakout();
  }, [handleLeaveBreakout]);

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
      } catch { }
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
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const privateChatBottomRef = useRef(null); // To auto-scroll
  const [privateEventMetaById, setPrivateEventMetaById] = useState({});

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
        body: JSON.stringify({
          body: text,
          event_id: eventId || undefined,
        }),
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

  const handleStartEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditText(msg.body);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditText("");
  };

  const handleSaveEdit = async (msgId) => {
    const text = editText.trim();
    if (!text) return;

    try {
      const res = await fetch(
        toApiUrl(`messaging/conversations/${privateConversationId}/messages/${msgId}/`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ body: text }),
        }
      );

      if (res.ok) {
        const updatedMsg = await res.json();
        setPrivateMessages((prev) =>
          prev.map((m) => (m.id === msgId ? updatedMsg : m))
        );
        setEditingMsgId(null);
        setEditText("");
      } else {
        console.error("Failed to edit message");
      }
    } catch (e) {
      console.error("Edit message error:", e);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const res = await fetch(
        toApiUrl(`messaging/conversations/${privateConversationId}/messages/${msgId}/`),
        {
          method: "DELETE",
          headers: { ...authHeader() },
        }
      );

      if (res.ok) {
        setPrivateMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, is_deleted: true, body: "This message was deleted" }
              : m
          )
        );
      } else {
        console.error("Failed to delete message");
      }
    } catch (e) {
      console.error("Delete message error:", e);
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

        // Always fetch messages to capture edits/deletes from sender
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

  // ✅ WebSocket listener for real-time edit/delete updates on private messages
  useEffect(() => {
    if (!privateChatUser || !privateConversationId) return;

    let alive = true;

    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/messaging/conversations/${privateConversationId}/?token=${getToken()}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (!alive) return;

          if (data.type === "message.edited") {
            setPrivateMessages((prev) =>
              prev.map((m) =>
                m.id === data.message.id ? data.message : m
              )
            );
          } else if (data.type === "message.deleted") {
            setPrivateMessages((prev) =>
              prev.map((m) =>
                m.id === data.message.id ? data.message : m
              )
            );
          } else if (data.type === "message.created") {
            // Add new messages from WebSocket as well
            setPrivateMessages((prev) =>
              prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
            );
          }
        } catch (e) {
          console.warn("[PrivateChat WS] Parse error:", e);
        }
      };

      ws.onerror = (error) => {
        console.warn("[PrivateChat WS] Error:", error);
      };

      return () => {
        alive = false;
        ws.close();
      };
    } catch (e) {
      console.warn("[PrivateChat WS] Failed to connect:", e);
    }
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

  useEffect(() => {
    const eventIds = Array.from(
      new Set(
        (privateMessages || [])
          .map((m) => m?.event_id)
          .filter((id) => id !== null && id !== undefined && id !== "")
      )
    );
    if (!eventIds.length) return;

    const missing = eventIds.filter((id) => !privateEventMetaById[id]);
    if (!missing.length) return;

    let alive = true;
    (async () => {
      const fetched = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(toApiUrl(`events/${id}/`), {
              headers: { Accept: "application/json", ...authHeader() },
            });
            if (!res.ok) {
              console.warn(`Failed to fetch event ${id}: HTTP ${res.status}`);
              return;
            }
            const data = await res.json().catch((err) => {
              console.warn(`Failed to parse event ${id} JSON:`, err);
              return null;
            });
            if (data) {
              fetched[id] = data;
              console.log(`✓ Loaded event metadata for ${id}:`, data);
            }
          } catch (err) {
            console.warn(`Error fetching event ${id}:`, err);
          }
        })
      );
      if (!alive || !Object.keys(fetched).length) return;
      setPrivateEventMetaById((prev) => ({ ...prev, ...fetched }));
    })();

    return () => {
      alive = false;
    };
  }, [privateMessages, privateEventMetaById]);

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

  const formatEventDateLabel = (eventObj) => {
    const source =
      eventObj?.start_time ||
      eventObj?.start_date ||
      eventObj?.date ||
      eventObj?.created_at;
    if (!source) return "Date unavailable";
    const dt = new Date(source);
    if (Number.isNaN(dt.getTime())) return "Date unavailable";
    return dt.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };

  const formatPrivateMessageTimestamp = (currentMsg, prevMsg) => {
    const ts = currentMsg?.created_at;
    if (!ts) return "";
    const now = new Date(ts);
    if (Number.isNaN(now.getTime())) return "";

    if (!prevMsg) {
      return now.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const prev = new Date(prevMsg?.created_at);
    if (Number.isNaN(prev.getTime())) {
      return now.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const sameDay = now.toDateString() === prev.toDateString();
    const sameEvent = String(currentMsg?.event_id || "") === String(prevMsg?.event_id || "");

    if (sameDay && sameEvent) {
      return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return now.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to check if an event has actually ended
  const isEventEnded = useCallback((eventObj) => {
    if (!eventObj) return false;
    // Check status field first (if event was explicitly ended by host)
    if (eventObj?.status === 'ended') return true;
    // Fall back to checking end_time (if current time has passed event's scheduled end)
    const endTime = eventObj?.end_time || eventObj?.ends_at || eventObj?.end_at;
    if (!endTime) return false;
    return new Date(endTime) <= new Date();
  }, []);

  const privateTimelineItems = useMemo(() => {
    const rows = Array.isArray(privateMessages) ? privateMessages : [];
    if (!rows.length) return [];

    console.log(`[Chat Timeline] Processing ${rows.length} messages`, rows.map(m => ({ id: m.id, event_id: m.event_id, body: m.body?.substring(0, 20) })));

    const items = [];
    for (let i = 0; i < rows.length; i += 1) {
      const msg = rows[i];
      const prev = i > 0 ? rows[i - 1] : null;
      const next = i < rows.length - 1 ? rows[i + 1] : null;

      const eventId = msg?.event_id || null;
      const prevEventId = prev?.event_id || null;
      const nextEventId = next?.event_id || null;

      if (eventId && eventId !== prevEventId) {
        const eventObj = privateEventMetaById[eventId] || {};
        const eventName = eventObj?.title || eventObj?.name || eventObj?.slug || `Event ${eventId}`;
        console.log(`[Chat Timeline] Event START divider for event ${eventId}:`, eventName, eventObj);
        items.push({
          type: "system",
          key: `event-start-${eventId}-${msg.id}`,
          text: `Messages exchanged during: ${eventName} | ${formatEventDateLabel(eventObj)}`,
        });
      }

      items.push({
        type: "message",
        key: `message-${msg.id}`,
        msg,
        prevMessage: prev,
      });

      if (eventId && eventId !== nextEventId) {
        const eventObj = privateEventMetaById[eventId] || {};
        // Only show "Event Ended" divider if the event has actually ended
        if (isEventEnded(eventObj)) {
          const eventName = eventObj?.title || eventObj?.name || eventObj?.slug || `Event ${eventId}`;
          console.log(`[Chat Timeline] Event ENDED divider for event ${eventId}:`, eventName, eventObj);
          items.push({
            type: "system",
            key: `event-end-${eventId}-${msg.id}`,
            text: `Event Ended - ${eventName} | ${formatEventDateLabel(eventObj)}`,
          });
        } else {
          console.log(`[Chat Timeline] Event NOT ended for ${eventId}:`, eventObj);
        }
      }
    }
    console.log(`[Chat Timeline] Created ${items.length} timeline items`);
    return items;
  }, [privateMessages, privateEventMetaById, isEventEnded]);

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
      let url = `interactions/questions/?event_id=${encodeURIComponent(eventId)}`;
      // Check for active table (Social Lounge / Breakout)
      // If activeTableId is present, we are in a specific room context
      if (activeTableId) {
        url += `&lounge_table_id=${activeTableId}`;
      }

      const res = await fetch(toApiUrl(url), {
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
  }, [eventId, activeTableId]);

  useEffect(() => {
    const isQnATabActive = (tab === 1) && (isPanelOpen === true);
    if (!isQnATabActive) return;

    setQnaUnreadCount(0);   // ✅ clear dot when user opens Q&A
    loadQuestions();
  }, [tab, isPanelOpen, loadQuestions]);

  // WS live updates while Q&A tab open
  useEffect(() => {
    const isQnATabActive = (tab === 1) && (isPanelOpen === true);
    if (!eventId) return; // Wait for eventId
    // Optimization: Only connect if tab is active OR if backend supports background updates?
    // Current logic connects always? No, let's check.
    // The previous code didn't check isQnATabActive for connection start?
    // Wait, line 8645 defined isQnATabActive but didn't use it to return early?
    // Ah, it didn't return early! It connected even if tab closed?
    // "const isQnATabActive = (tab === 1) && (isPanelOpen === true);" was unused in previous code block?
    // No, checking previous code: 
    // 8645: const isQnATabActive = ...
    // 8646: if (!eventId) return;
    // It proceeded to connect!
    // But `setQnaUnreadCount` logic relies on `isQnATabActive` ref (isQnaActiveRef.current).
    // So we KEEP the connection open to receive unread counts. Correct.

    const API_RAW = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
    const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const token = getToken();
    let qs = token ? `?token=${encodeURIComponent(token)}` : "";

    // Add lounge_table_id to query params if active
    if (activeTableId) {
      qs += (qs ? "&" : "?") + `lounge_table_id=${activeTableId}`;
    }

    const wsUrl = `${WS_ROOT}/ws/events/${eventId}/qna/${qs}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "lounge_settings_update") {
          console.log("[WS] Lounge settings updated:", msg.settings);
          setEventData((prev) => ({ ...prev, ...msg.settings }));
        }

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
          // Check if this new question belongs to the current view
          // If we receive a question for a different table (shouldn't happen due to server filtering, but good for safety)
          // msg.lounge_table_id should match activeTableId
          const msgTableId = msg.lounge_table_id ? String(msg.lounge_table_id) : null;
          const currentTableId = activeTableId ? String(activeTableId) : null;

          if (msgTableId !== currentTableId) {
            // Ignore messages from other rooms if leakage happens
            return;
          }

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
              lounge_table_id: msg.lounge_table_id, // Store it
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
  }, [tab, isPanelOpen, eventId, activeTableId]); // Re-connect when activeTableId changes

  const submitQuestion = async () => {
    const content = newQuestion.trim();
    if (!content || !eventId) return;

    setQnaSubmitting(true);
    setQnaError("");

    try {
      const payload = { event: eventId, content };
      if (activeTableId) {
        payload.lounge_table = activeTableId;
      }

      const res = await fetch(toApiUrl("interactions/questions/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
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

    // ✅ CRITICAL FIX: Apply lounge filter to hosts when not in breakout (main room context)
    // When user is in main room, hosts occupying lounge should be filtered out
    // When user is in breakout, show all participants in that room (lounge filter doesn't apply)
    let host = participants.filter((p) => p.role === "Host" && p.inMeeting && (isBreakout || !p.isOccupyingLounge));
    if (host.length === 0 && effectiveHostId) {
      host = participants.filter((p) => p.id === effectiveHostId && p.inMeeting && (isBreakout || !p.isOccupyingLounge));
    }

    const hostIdSet = new Set(host.map((p) => p.id));
    // ✅ PHASE 4: Host in main room should see ALL participants (including those in breakout/lounge)
    const speakers = participants.filter(
      (p) => !hostIdSet.has(p.id) && p.role === "Speaker" && p.inMeeting && (isBreakout || isHost || !p.isOccupyingLounge)
    );
    const audience = participants.filter(
      (p) => !hostIdSet.has(p.id) && p.role !== "Speaker" && p.inMeeting && (isBreakout || isHost || !p.isOccupyingLounge)
    );

    // ✅ PHASE 4: For host, enhance with room location
    if (isHost && !isBreakout) {
      // Host in main room: show all with locations
      return {
        host: host.map(p => ({
          ...p,
          _roomLocation: participantRoomMap.get(p.id) || {
            type: "main",
            roomId: null,
            roomName: "Main Room"
          }
        })),
        speakers: speakers.map(p => ({
          ...p,
          _roomLocation: participantRoomMap.get(p.id) || {
            type: "main",
            roomId: null,
            roomName: "Main Room"
          }
        })),
        audience: audience.map(p => ({
          ...p,
          _roomLocation: participantRoomMap.get(p.id) || {
            type: "main",
            roomId: null,
            roomName: "Main Room"
          }
        }))
      };
    }

    // Regular participant or breakout view: keep original behavior
    return { host, speakers, audience };
  }, [
    participants,
    pinnedHost,
    hostIdHint,
    isHost,
    dyteMeeting?.self?.id,
    isBreakout,
    participantRoomMap  // ✅ PHASE 4: Added dependency
  ]);


  // --- Self helpers for Members UI ---
  const selfDyteId = dyteMeeting?.self?.id || null;

  // ✅ Phase 5: Apply room filter to groupedMembers
  const filteredGroupedMembers = useMemo(() => {
    if (!isHost || isBreakout) return groupedMembers;

    if (participantRoomFilter === "all") {
      return groupedMembers;
    }

    // Filter participants based on room type
    const filterByRoomType = (participants) => {
      return participants.filter(p => {
        const roomType = p._roomLocation?.type || "main";
        if (participantRoomFilter === "main") return roomType === "main";
        if (participantRoomFilter === "breakout") return roomType === "breakout";
        if (participantRoomFilter === "lounge") return roomType === "lounge";
        return true;
      });
    };

    return {
      host: filterByRoomType(groupedMembers.host || []),
      speakers: filterByRoomType(groupedMembers.speakers || []),
      audience: filterByRoomType(groupedMembers.audience || [])
    };
  }, [groupedMembers, participantRoomFilter, isHost, isBreakout]);

  const audienceMembersSorted = useMemo(() => {
    const arr = [...(filteredGroupedMembers?.audience || [])];

    // put self on top (only matters for Audience view, host won't be inside audience anyway)
    arr.sort((a, b) => {
      const aSelf = Boolean(selfDyteId && a?.id === selfDyteId);
      const bSelf = Boolean(selfDyteId && b?.id === selfDyteId);
      if (aSelf && !bSelf) return -1;
      if (!aSelf && bSelf) return 1;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });

    return arr;
  }, [filteredGroupedMembers?.audience, selfDyteId]);

  const isSelfMember = (m) => Boolean(selfDyteId && m?.id === selfDyteId);
  const moodPickerOpen = Boolean(moodAnchorEl);

  const renderMemberAvatar = useCallback((member) => {
    const mine = isSelfMember(member);
    const mood = member?.mood || null;
    const avatarNode = (
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        badgeContent={
          mood ? (
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(0,0,0,0.75)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {mood}
            </Box>
          ) : null
        }
      >
        <Avatar src={member?.picture} sx={{ bgcolor: "rgba(255,255,255,0.14)" }}>
          {initialsFromName(member?.name)}
        </Avatar>
      </Badge>
    );

    if (!mine) return avatarNode;
    return (
      <Tooltip title="Set your mood">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setMoodAnchorEl(e.currentTarget);
          }}
          sx={{ p: 0.1 }}
        >
          {avatarNode}
        </IconButton>
      </Tooltip>
    );
  }, [isSelfMember]);
  const renderMoodTrigger = useCallback((member, label = "🙂 Mood") => {
    if (!isSelfMember(member)) return null;
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation();
          setMoodAnchorEl(e.currentTarget);
        }}
        sx={{
          minWidth: "auto",
          px: 0.8,
          py: 0.2,
          lineHeight: 1,
          fontSize: 11,
          borderColor: "rgba(255,255,255,0.25)",
          color: "rgba(255,255,255,0.9)",
        }}
      >
        {label}
      </Button>
    );
  }, [isSelfMember]);
  const renderMoodRow = useCallback((member) => {
    const mood = member?.mood || null;
    const isSelf = isSelfMember(member);
    if (mood) {
      return (
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
            {mood}
          </Typography>
          {renderMoodTrigger(member, "Edit Mood")}
        </Stack>
      );
    }
    if (!isSelf) return null;
    return (
      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minHeight: 22 }}>
        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
          How are you today?
        </Typography>
        {renderMoodTrigger(member, "🙂 Set Mood")}
      </Stack>
    );
  }, [isSelfMember, renderMoodTrigger]);

  // Others only (Audience + Speaker), host is pinned already
  const stageOthers = useMemo(() => {
    const pinnedKey = latestPinnedHost ? getParticipantUserKey(latestPinnedHost?._raw || latestPinnedHost) : "";
    if (isBreakout) {
      // ✅ CRITICAL FIX: In breakout/lounge, show ONLY participants actually in the current room
      // When user joins a lounge table (breakout), they enter a separate Dyte room
      // This room should only include participants who are also in that table
      // Uses currentLoungeUserIds which is populated from the CURRENT breakout's participants
      // This works for BOTH social lounges AND regular breakout rooms
      // Fix: Late joiners who are manually assigned now appear correctly in the grid
      return participants.filter((p) => {
        if (!p.inMeeting) return false;
        if (p.id === latestPinnedHost?.id) return false;

        // ✅ FIX: Use currentLoungeUserIds for ALL breakout contexts
        // This set contains user_id from the current table's LoungeParticipant records
        if (currentLoungeUserIds.size > 0) {
          const key = getParticipantUserKey(p?._raw || p);
          const userId = key.startsWith("id:") ? key.replace("id:", "") : null;
          // Show only if the participant is actually in THIS breakout room
          if (!userId || !currentLoungeUserIds.has(String(userId))) return false;
        } else {
          // If we don't have participant data yet (data still syncing), don't filter
          // The video grid will show empty and update once data arrives
          console.warn("[stageOthers] Empty currentLoungeUserIds in breakout - waiting for sync");
        }

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
  }, [participants, isBreakout, latestPinnedHost, dyteMeeting?.self?.id, currentLoungeUserIds]);

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
                {privateTimelineItems.map((item) => {
                  if (item.type === "system") {
                    return (
                      <Box key={item.key} sx={{ display: "flex", justifyContent: "center", py: 0.75 }}>
                        <Typography
                          sx={{
                            fontSize: 11,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 999,
                            color: "rgba(255,255,255,0.7)",
                            border: "1px solid rgba(255,255,255,0.14)",
                            bgcolor: "rgba(255,255,255,0.04)",
                          }}
                        >
                          {item.text}
                        </Typography>
                      </Box>
                    );
                  }

                  const m = item.msg;
                  return (
                  <Stack key={item.key} alignItems={m.mine ? "flex-end" : "flex-start"} spacing={0.25}>
                    {/* Edit mode */}
                    {editingMsgId === m.id ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          maxWidth: "85%",
                          bgcolor: "rgba(20,184,177,0.1)",
                          borderColor: "rgba(20,184,177,0.4)",
                          borderRadius: 2,
                        }}
                      >
                        <TextField
                          fullWidth
                          multiline
                          maxRows={4}
                          size="small"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          sx={{
                            mb: 1,
                            "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.05)" },
                          }}
                        />
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCancelEdit}
                            sx={{ fontSize: "11px", px: 1 }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSaveEdit(m.id)}
                            disabled={!editText.trim()}
                            sx={{ fontSize: "11px", px: 1 }}
                          >
                            Save
                          </Button>
                        </Stack>
                      </Paper>
                    ) : (
                      <Box
                        sx={{
                          position: "relative",
                          display: "flex",
                          justifyContent: m.mine ? "flex-end" : "flex-start",
                          alignItems: "flex-start",
                          gap: 0.5,
                          "&:hover .edit-delete-buttons": {
                            opacity: 1,
                          },
                        }}
                      >
                        {/* Edit/Delete menu for own messages (before message on hover) */}
                        {m.mine && !m.is_deleted && (
                          <Stack
                            className="edit-delete-buttons"
                            direction="row"
                            spacing={0.25}
                            sx={{
                              opacity: 0,
                              transition: "opacity 0.2s",
                              pt: 0.25,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleStartEdit(m)}
                              sx={{
                                width: 24,
                                height: 24,
                                p: 0.25,
                                color: "rgba(255,255,255,0.6)",
                                "&:hover": { color: "rgba(255,255,255,1)", bgcolor: "rgba(255,255,255,0.1)" },
                              }}
                              title="Edit message"
                            >
                              <EditRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMessage(m.id)}
                              sx={{
                                width: 24,
                                height: 24,
                                p: 0.25,
                                color: "rgba(255,255,255,0.6)",
                                "&:hover": { color: "#f44336", bgcolor: "rgba(244,67,54,0.15)" },
                              }}
                              title="Delete message"
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>
                        )}

                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.25,
                            maxWidth: "85%",
                            bgcolor: m.mine ? "rgba(20,184,177,0.15)" : "rgba(255,255,255,0.03)",
                            borderColor: m.mine ? "rgba(20,184,177,0.3)" : "rgba(255,255,255,0.08)",
                            borderRadius: 2,
                            opacity: m.is_deleted ? 0.6 : 1,
                          }}
                        >
                          {/* Message body with deleted/edited states */}
                          <Typography
                            sx={{
                              fontSize: 13,
                              opacity: m.is_deleted ? 0.6 : 0.9,
                              fontStyle: m.is_deleted ? "italic" : "normal",
                              color: m.is_deleted ? "#999" : "inherit",
                            }}
                          >
                            {m.body}
                          </Typography>

                          {/* Edited label */}
                          {!m.is_deleted && m.is_edited && (
                            <Typography sx={{ fontSize: 9, opacity: 0.5, mt: 0.25 }}>Edited</Typography>
                          )}

                          {/* Timestamp */}
                          <Typography sx={{ fontSize: 10, opacity: 0.5, textAlign: "right", mt: 0.5, whiteSpace: "nowrap" }}>
                            {formatPrivateMessageTimestamp(m, item.prevMessage)}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                  </Stack>
                )})}
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
              {tab === 1 &&
                (activeTableId
                  ? `Room Q&A${activeRoomLabel ? `: ${activeRoomLabel}` : ""}`
                  : "Q&A")}
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
                  {/* {isRoomChatActive && (
                    <Typography sx={{ fontSize: 12, opacity: 0.7, mb: 1 }}>
                      Room chat is limited to people seated in {activeRoomLabel || "this room"}.
                    </Typography>
                  )} */}
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
                            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flex: 1, minWidth: 0 }}>
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
                                  flexShrink: 0,
                                }}
                              >
                                {(m.sender_display || m.sender_name || "U").slice(0, 1)}
                              </Avatar>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                                <Typography
                                  onClick={() => {
                                    const member = getParticipantFromMessage(m);
                                    if (member) openMemberInfo(member);
                                  }}
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    "&:hover": { textDecoration: "underline" },
                                    color: "rgba(255,255,255,0.9)",
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
                                {(() => {
                                  const participant = getParticipantFromMessage(m);
                                  const userId = participant?._raw?.customParticipantId || participant?.id;

                                  // Fetch kyc_status if not cached
                                  if (userId && !participantKycCache[userId]) {
                                    fetchAndCacheKycStatus(userId);
                                  }

                                  const isVerified = participantKycCache[userId] === "approved";
                                  return isVerified ? (
                                    <VerifiedRoundedIcon
                                      sx={{
                                        fontSize: 16,
                                        color: "#14b8a6",
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : null;
                                })()}
                              </Box>
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
              {/* <Box sx={{ p: 2, pb: 0 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                  Q&A: {activeTableId && loungeTables.find(t => t.id === activeTableId)?.name ? loungeTables.find(t => t.id === activeTableId).name : "Main Room"}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", display: "block", mb: 2 }}>
                  {activeTableId
                    ? `Room Q&A is limited to people seated in ${activeRoomLabel || "this room"}.`
                    : "Questions here are visible to everyone in the main room."}
                </Typography>
              </Box> */}

              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2, pb: 2, ...scrollSx }}>
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
                  placeholder={activeTableId ? "Type to room..." : "Ask a question..."}
                  size="small"
                  value={newQuestion}
                  disabled={qnaSubmitting}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitQuestion();
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Send question"
                          onClick={submitQuestion}
                          disabled={qnaSubmitting || newQuestion.trim().length === 0}
                        >
                          {qnaSubmitting ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
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
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx, opacity: isOnBreak ? 0.65 : 1, transition: "opacity 0.3s" }}>
                {/* Break Mode Banner */}
                {isOnBreak && (
                  <Box sx={{ bgcolor: "rgba(255,165,0,0.12)", borderRadius: 2, p: 1.5, mb: 2, border: "1px solid rgba(255,165,0,0.3)", display: "flex", gap: 1, alignItems: "center" }}>
                    <CoffeeIcon sx={{ color: "rgba(255,165,0,0.85)", fontSize: 18 }} />
                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                      {/* ✅ STATE PRIORITY FIX: Show different message if user is in a lounge room */}
                      {isBreakout
                        ? "Break is in progress on the main stage. Enjoy your networking in the lounge!"
                        : "Break in progress. Participant interactions are disabled."}
                    </Typography>
                  </Box>
                )}
                {/* ✅ Phase 5: Filter controls for Host (in main room) - 2x2 Grid */}
                {isHost && !isBreakout && (
                  <Stack sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      {[
                        { value: "all", label: "All" },
                        { value: "main", label: "Main Room" },
                      ].map((filter) => (
                        <Button
                          key={filter.value}
                          size="small"
                          variant={participantRoomFilter === filter.value ? "contained" : "outlined"}
                          onClick={() => setParticipantRoomFilter(filter.value)}
                          disabled={isOnBreak}
                          sx={{
                            flex: 1,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            borderColor: "rgba(255,255,255,0.2)",
                            color: participantRoomFilter === filter.value ? "#fff" : "rgba(255,255,255,0.7)",
                            bgcolor: participantRoomFilter === filter.value ? "primary.main" : "transparent",
                            "&:hover": {
                              borderColor: "rgba(255,255,255,0.4)",
                              bgcolor: participantRoomFilter === filter.value ? "primary.dark" : "rgba(255,255,255,0.05)",
                            },
                          }}
                        >
                          {filter.label}
                        </Button>
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      {[
                        { value: "breakout", label: "Breakout Rooms" },
                        { value: "lounge", label: "Social Lounges" },
                      ].map((filter) => (
                        <Button
                          key={filter.value}
                          size="small"
                          variant={participantRoomFilter === filter.value ? "contained" : "outlined"}
                          onClick={() => setParticipantRoomFilter(filter.value)}
                          disabled={isOnBreak}
                          sx={{
                            flex: 1,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            borderColor: "rgba(255,255,255,0.2)",
                            color: participantRoomFilter === filter.value ? "#fff" : "rgba(255,255,255,0.7)",
                            bgcolor: participantRoomFilter === filter.value ? "primary.main" : "transparent",
                            "&:hover": {
                              borderColor: "rgba(255,255,255,0.4)",
                              bgcolor: participantRoomFilter === filter.value ? "primary.dark" : "rgba(255,255,255,0.05)",
                            },
                          }}
                        >
                          {filter.label}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                )}
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
                        {(isHost && !isBreakout ? filteredGroupedMembers.host : groupedMembers.host).map((m, idx) => (
                          <ListItem
                            key={idx}
                            disablePadding
                          >
                            <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1, width: "100%" }}>
                              <ListItemAvatar>
                                {renderMemberAvatar(m)}
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Stack spacing={1}>
                                    <Stack direction="row" spacing={0.8} alignItems="center">
                                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{m.name}{isSelfMember(m) ? " (You)" : ""}</Typography>
                                      {(() => {
                                        const userId = m._raw?.customParticipantId || m.id;
                                        if (userId && !participantKycCache[userId]) {
                                          fetchAndCacheKycStatus(userId);
                                        }
                                        const isVerified = participantKycCache[userId] === "approved";
                                        return isVerified ? (
                                          <VerifiedRoundedIcon sx={{ fontSize: 14, color: "#14b8a6", flexShrink: 0 }} />
                                        ) : null;
                                      })()}
                                      <Chip size="small" label="Host" sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                                      {isOnBreak && (
                                        <Chip size="small" label="On Break" icon={<CoffeeIcon sx={{ fontSize: 13 }} />} sx={{ bgcolor: "rgba(255,165,0,0.15)", borderColor: "rgba(255,165,0,0.3)", border: "1px solid", color: "rgba(255,165,0,0.85)" }} />
                                      )}
                                    </Stack>
                                    {/* ✅ Phase 5: Room location badge below name */}
                                    {isHost && !isBreakout && m._roomLocation && (
                                      <RoomLocationBadge
                                        type={m._roomLocation.type}
                                        roomName={m._roomLocation.roomName}
                                        size="small"
                                      />
                                    )}
                                    {renderMoodRow(m)}
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                      {/* MIC ICON - GREEN when ON, RED when OFF - Clickable for Host (self) */}
                                      <Tooltip title={isOnBreak ? "Disabled during break" : (isHost && isSelfMember(m) ? (m.mic ? "Mute" : "Unmute") : (m.mic ? "Mic on" : "Mic off"))}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isHost && isSelfMember(m)) handleToggleMic();
                                          }}
                                          disabled={isOnBreak || !isHost || !isSelfMember(m)}
                                          sx={{
                                            bgcolor: m.mic ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                            border: "1px solid",
                                            borderColor: m.mic ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                            color: m.mic ? "#22c55e" : "#ef4444",
                                            padding: "6px",
                                            cursor: (isHost && isSelfMember(m)) ? "pointer" : "default",
                                            "&:hover": {
                                              bgcolor: m.mic ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                            }
                                          }}
                                        >
                                          {m.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                        </IconButton>
                                      </Tooltip>

                                      {/* CAMERA ICON - GREEN when ON, RED when OFF - Clickable for Host (self) */}
                                      <Tooltip title={isOnBreak ? "Disabled during break" : (isHost && isSelfMember(m) ? (m.cam ? "Turn camera off" : "Turn camera on") : (m.cam ? "Camera on" : "Camera off"))}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isHost && isSelfMember(m)) handleToggleCamera();
                                          }}
                                          disabled={isOnBreak || !isHost || !isSelfMember(m)}
                                          sx={{
                                            bgcolor: m.cam ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                            border: "1px solid",
                                            borderColor: m.cam ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                            color: m.cam ? "#22c55e" : "#ef4444",
                                            padding: "6px",
                                            cursor: (isHost && isSelfMember(m)) ? "pointer" : "default",
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
                                        <Tooltip title={isOnBreak ? "Disabled during break" : "Send Message"}>
                                          <IconButton
                                            size="small"
                                            disabled={isOnBreak}
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

                                      {/* Host actions for other hosts (Bring to Main Stage / Clear / Kick / Ban) */}
                                      {isHost && !isSelfMember(m) && (
                                        <IconButton
                                          size="small"
                                          disabled={isOnBreak}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenParticipantMenu(e, m);
                                          }}
                                          sx={{ color: "rgba(255,255,255,0.7)" }}
                                        >
                                          <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Stack>
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

                      {/* ✅ NEW: Sent Announcements Panel (Host Management) */}
                      {isHost && sentAnnouncements.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.6, mb: 1, textTransform: "uppercase" }}>
                            Sent Announcements ({sentAnnouncements.length})
                          </Typography>
                          <Stack spacing={0.75}>
                            {sentAnnouncements.map((ann) => (
                              <Paper key={ann.id} variant="outlined" sx={{
                                px: 1.25, py: 1,
                                bgcolor: "rgba(100, 200, 255, 0.06)",
                                borderColor: "rgba(100, 200, 255, 0.2)",
                                borderRadius: 1.5,
                              }}>
                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.85)", wordBreak: "break-word", mb: 0.5 }}>
                                      {ann.message}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <Typography sx={{ fontSize: 10, opacity: 0.5 }}>
                                        {new Date(ann.created_at).toLocaleTimeString()}
                                      </Typography>
                                      {ann.is_edited && (
                                        <Chip label="Edited" size="small" sx={{ fontSize: 9, height: 16, bgcolor: "rgba(255,255,255,0.1)" }} />
                                      )}
                                    </Stack>
                                  </Box>
                                  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                                    <Tooltip title="Edit">
                                      <IconButton size="small" sx={{ color: "rgba(100,200,255,0.8)" }}
                                        onClick={() => {
                                          setEditingAnnouncement({ id: ann.id, message: ann.message });
                                          setAnnouncementText(ann.message);
                                          setAnnouncementDialogOpen(true);
                                        }}
                                      >
                                        <EditRoundedIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton size="small" sx={{ color: "rgba(239,68,68,0.8)" }}
                                        onClick={() => setDeleteConfirmAnnouncementId(ann.id)}
                                      >
                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
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
                        SPEAKERS ({(isHost && !isBreakout ? filteredGroupedMembers.speakers : groupedMembers.speakers).length})
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
                        {(isHost && !isBreakout ? filteredGroupedMembers.speakers : groupedMembers.speakers).map((m, idx) => (
                          <ListItem
                            key={idx}
                            disablePadding
                          >
                            <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1, width: "100%" }}>
                              <ListItemAvatar>
                                {renderMemberAvatar(m)}
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Stack spacing={1}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                                        {m.name}{isSelfMember(m) ? " (You)" : ""}
                                      </Typography>
                                      {(() => {
                                        const userId = m._raw?.customParticipantId || m.id;
                                        if (userId && !participantKycCache[userId]) {
                                          fetchAndCacheKycStatus(userId);
                                        }
                                        const isVerified = participantKycCache[userId] === "approved";
                                        return isVerified ? (
                                          <VerifiedRoundedIcon sx={{ fontSize: 14, color: "#14b8a6", flexShrink: 0 }} />
                                        ) : null;
                                      })()}
                                      {isOnBreak && (
                                        <Chip size="small" label="On Break" icon={<CoffeeIcon sx={{ fontSize: 13 }} />} sx={{ bgcolor: "rgba(255,165,0,0.15)", borderColor: "rgba(255,165,0,0.3)", border: "1px solid", color: "rgba(255,165,0,0.85)" }} />
                                      )}
                                    </Box>
                                    {/* ✅ Phase 5: Room location badge below name */}
                                    {isHost && !isBreakout && m._roomLocation && (
                                      <RoomLocationBadge
                                        type={m._roomLocation.type}
                                        roomName={m._roomLocation.roomName}
                                        size="small"
                                      />
                                    )}
                                    {renderMoodRow(m)}
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                      {/* MIC ICON - GREEN when ON, RED when OFF - Clickable for Host */}
                                      <Tooltip title={isOnBreak ? "Disabled during break" : (isHost && !isSelfMember(m) ? (m.mic ? "Mute" : "Unmute") : (m.mic ? "Mic on" : "Mic off"))}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isHost && !isSelfMember(m)) forceMuteParticipant(m);
                                          }}
                                          disabled={isOnBreak || !isHost || isSelfMember(m)}
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

                                      {/* CAMERA ICON - GREEN when ON, RED when OFF - Clickable for Host */}
                                      <Tooltip title={isOnBreak ? "Disabled during break" : (isHost && !isSelfMember(m) ? (m.cam ? "Turn camera off" : "Turn camera on") : (m.cam ? "Camera on" : "Camera off"))}>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isHost && !isSelfMember(m)) forceCameraOffParticipant(m);
                                          }}
                                          disabled={isOnBreak || !isHost || isSelfMember(m)}
                                          sx={{
                                            bgcolor: m.cam ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                            border: "1px solid",
                                            borderColor: m.cam ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
                                            color: m.cam ? "#22c55e" : "#ef4444",
                                            padding: "4px",
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
                                          disabled={isOnBreak}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenParticipantMenu(e, m);
                                          }}
                                          sx={{ color: "rgba(255,255,255,0.7)" }}
                                        >
                                          <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Stack>
                                  </Stack>
                                }
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
                      AUDIENCE ({(isHost && !isBreakout ? filteredGroupedMembers.audience : groupedMembers.audience).length})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {isHost && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={isOnBreak}
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
                            <Tooltip title={isOnBreak ? "Disabled during break" : "Mute all"}>
                              <IconButton size="small" disabled={isOnBreak} onClick={forceMuteAll} sx={{ color: "rgba(255,255,255,0.9)" }}>
                                <MicOffIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={isOnBreak ? "Disabled during break" : "Camera off all"}>
                              <IconButton size="small" disabled={isOnBreak} onClick={forceCameraOffAll} sx={{ color: "rgba(255,255,255,0.9)" }}>
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
                        >
                          <ListItemButton onClick={() => openMemberInfo(m)} sx={{ px: 1.25, py: 1, width: "100%" }}>
                            <ListItemAvatar>
                              {renderMemberAvatar(m)}
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Stack spacing={1}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                    <Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>
                                      {m.name}{isSelfMember(m) ? " (You)" : ""}
                                    </Typography>
                                    {(() => {
                                      const userId = m._raw?.customParticipantId || m.id;
                                      if (userId && !participantKycCache[userId]) {
                                        fetchAndCacheKycStatus(userId);
                                      }
                                      const isVerified = participantKycCache[userId] === "approved";
                                      return isVerified ? (
                                        <VerifiedRoundedIcon sx={{ fontSize: 14, color: "#14b8a6", flexShrink: 0 }} />
                                      ) : null;
                                    })()}
                                    {isOnBreak && (
                                      <Chip size="small" label="On Break" icon={<CoffeeIcon sx={{ fontSize: 13 }} />} sx={{ bgcolor: "rgba(255,165,0,0.15)", borderColor: "rgba(255,165,0,0.3)", border: "1px solid", color: "rgba(255,165,0,0.85)" }} />
                                    )}
                                  </Box>
                                  {/* ✅ Phase 5: Room location badge below name */}
                                  {isHost && !isBreakout && m._roomLocation && (
                                    <RoomLocationBadge
                                      type={m._roomLocation.type}
                                      roomName={m._roomLocation.roomName}
                                      size="small"
                                    />
                                  )}
                                  {renderMoodRow(m)}
                                  <Stack direction="row" spacing={0.75} alignItems="center">
                                    {/* MIC ICON - GREEN when ON, RED when OFF - Clickable for Host */}
                                    <Tooltip title={isOnBreak ? "Disabled during break" : (isHost && !isSelfMember(m) ? (m.mic ? "Mute" : "Unmute") : (m.mic ? "Mic on" : "Mic off"))}>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isHost && !isSelfMember(m)) forceMuteParticipant(m);
                                        }}
                                        disabled={isOnBreak || !isHost || isSelfMember(m)}
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
                                    <Tooltip title={isOnBreak ? "Disabled during break" : (isHost && !isSelfMember(m) ? (m.cam ? "Turn camera off" : "Turn camera on") : (m.cam ? "Camera on" : "Camera off"))}>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isHost && !isSelfMember(m)) forceCameraOffParticipant(m);
                                        }}
                                        disabled={isOnBreak || !isHost || isSelfMember(m)}
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
                                      <Tooltip title={isOnBreak ? "Disabled during break" : "Send Message"}>
                                        <IconButton
                                          size="small"
                                          disabled={isOnBreak}
                                          sx={{ color: "#fff" }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPrivateChat(m);
                                          }}
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

                                    {/* KICK/BAN MENU for Host */}
                                    {isHost && !isSelfMember(m) && (
                                      <IconButton
                                        size="small"
                                        disabled={isOnBreak}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenParticipantMenu(e, m);
                                        }}
                                        sx={{ color: "rgba(255,255,255,0.7)" }}
                                      >
                                        <MoreVertIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Stack>
                                </Stack>
                              }
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
        timezone={getBrowserTimezone()}
        loungeAvailable={role === "publisher" ? preEventLoungeOpen : participantCanAccessSocialLounge}
        loungeStatusLabel={loungeOpenStatus?.reason || "Pre-event networking"}
        isLoungeOpen={isLoungeCurrentlyOpen}
        onOpenLounge={openLoungeOverlay}
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

  // ✅ PRIORITY: Post-event lounge should render before loading screen
  if (isPostEventLounge && !loungeHasEnded && !isBreakout) {
    return (
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
    );
  }

  if (loadingJoin) {
    return <JoiningMeetingScreen onBack={handleBack} />;
  }

  // ✅ If lounge has ended and user gets "Event ended" error, show thank you page instead
  if (joinError && !authToken && loungeHasEnded && isPostEventLounge) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          bgcolor: "#05070D",
          backgroundImage: "radial-gradient(900px 420px at 50% 0%, rgba(90,120,255,0.18), transparent 55%)",
          gap: 3,
          p: 2,
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            maxWidth: 600,
            animation: "fadeIn 0.6s ease-in-out",
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(20px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: "white",
              fontWeight: 700,
              mb: 2,
              textShadow: "0 2px 8px rgba(90,120,255,0.3)",
            }}
          >
            Thank You for Attending!
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontWeight: 400,
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Social Lounge Time is Over
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.6)",
              mb: 4,
              lineHeight: 1.6,
            }}
          >
            {eventData?.title && `Thank you for joining ${eventData.title} and engaging in the social lounge.`}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={handleBack}
              sx={{
                bgcolor: "#14b8b1",
                color: "white",
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "#0e8e88",
                },
              }}
            >
              Go Back
            </Button>
          </Box>
        </Box>
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
          timezone={getBrowserTimezone()}
          loungeAvailable={
            role === "publisher"
              ? (waitingRoomLoungeAllowed || waitingRoomNetworkingAllowed) && loungeOpenStatus?.status === "OPEN"
              : (waitingRoomLoungeAllowed || waitingRoomNetworkingAllowed) && participantCanAccessSocialLounge
          }
          loungeStatusLabel={loungeOpenStatus?.reason || ""}
          onOpenLounge={openLoungeOverlay}
          isHost={role === "publisher"}
          eventId={eventId}
          waitingCount={filteredWaitingRoomCount || 0}
          announcementsRef={waitingRoomAnnouncementsRef}
          isOnBreak={isOnBreak}
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

  // ✅ IMPORTANT: Show end-state message when meeting ends and lounge is not available
  // This gives users a "Thank you for attending" message before navigating away
  if (showEndStateMessage && !isPostEventLounge) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          bgcolor: "#05070D",
          backgroundImage: "radial-gradient(900px 420px at 50% 0%, rgba(90,120,255,0.18), transparent 55%)",
          gap: 3,
          p: 2,
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            maxWidth: 600,
            animation: "fadeIn 0.6s ease-in-out",
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(20px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: "white",
              fontWeight: 700,
              mb: 2,
              textShadow: "0 2px 8px rgba(90,120,255,0.3)",
            }}
          >
            Thank You for Attending!
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontWeight: 400,
              mb: 4,
              lineHeight: 1.6,
            }}
          >
            {eventData?.title && `Thanks for joining ${eventData.title}.`} We hope you had a great experience.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => {
                if (role === "publisher" || isEventOwner) {
                  navigate("/admin/events");
                } else {
                  navigate(-1);
                }
              }}
              sx={{
                bgcolor: "#14b8b1",
                color: "white",
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "#0e8e88",
                },
              }}
            >
              {role === "publisher" || isEventOwner ? "Go to Dashboard" : "Go Back"}
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.4)",
              mt: 3,
              display: "block",
            }}
          >
            You will be redirected automatically...
          </Typography>
        </Box>
      </Box>
    );
  }

  // ✅ NEW: Show thank you page when post-event lounge time has ended
  if (loungeHasEnded && isPostEventLounge && !isBreakout) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          bgcolor: "#05070D",
          backgroundImage: "radial-gradient(900px 420px at 50% 0%, rgba(90,120,255,0.18), transparent 55%)",
          gap: 3,
          p: 2,
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            maxWidth: 600,
            animation: "fadeIn 0.6s ease-in-out",
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(20px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: "white",
              fontWeight: 700,
              mb: 2,
              textShadow: "0 2px 8px rgba(90,120,255,0.3)",
            }}
          >
            Thank You for Attending!
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontWeight: 400,
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Social Lounge Time is Over
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.6)",
              mb: 4,
              lineHeight: 1.6,
            }}
          >
            {eventData?.title && `Thank you for joining ${eventData.title} and engaging in the social lounge.`}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => {
                if (role === "publisher" || isEventOwner) {
                  navigate("/admin/events");
                } else {
                  navigate(-1);
                }
              }}
              sx={{
                bgcolor: "#14b8b1",
                color: "white",
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "#0e8e88",
                },
              }}
            >
              {role === "publisher" || isEventOwner ? "Go to Dashboard" : "Go Back"}
            </Button>
          </Box>
        </Box>
      </Box>
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
        timezone={getBrowserTimezone()}
      />
    );
  }

  // ✅ CRITICAL: Show thank you page if lounge has ended, even for hosts in breakout/lounge tables
  // This ensures hosts also see thank you page when lounge time expires
  if (loungeHasEnded && isPostEventLounge) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          bgcolor: "#05070D",
          backgroundImage: "radial-gradient(900px 420px at 50% 0%, rgba(90,120,255,0.18), transparent 55%)",
          gap: 3,
          p: 2,
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            maxWidth: 600,
            animation: "fadeIn 0.6s ease-in-out",
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(20px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: "white",
              fontWeight: 700,
              mb: 2,
              textShadow: "0 2px 8px rgba(90,120,255,0.3)",
            }}
          >
            Thank You for Attending!
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontWeight: 400,
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Social Lounge Time is Over
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.6)",
              mb: 4,
              lineHeight: 1.6,
            }}
          >
            {eventData?.title && `Thank you for joining ${eventData.title} and engaging in the social lounge.`}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => {
                if (role === "publisher" || isEventOwner) {
                  navigate("/admin/events");
                } else {
                  navigate(-1);
                }
              }}
              sx={{
                bgcolor: "#14b8b1",
                color: "white",
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
                "&:hover": {
                  bgcolor: "#0e8e88",
                },
              }}
            >
              {role === "publisher" || isEventOwner ? "Go to Dashboard" : "Go Back"}
            </Button>
          </Box>
        </Box>
      </Box>
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
            {/* ✅ Breakout Timer Centered in Header - TIMER STOP: Hidden when host ends breakout */}
            {breakoutTimer !== null && breakoutTimer > 0 && !isBreakoutEnding && (
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
            <IconButton sx={headerIconBtnSx} aria-label="Leave meeting" onClick={handleBackButtonClick}>
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

              {meeting.recording && (
                <Chip
                  size="small"
                  label={meeting.recordingPaused ? "Recording Paused" : "Recording"}
                  sx={{
                    ...headerChipSx,
                    bgcolor: meeting.recordingPaused ? "rgba(255,152,0,0.2)" : "rgba(244,67,54,0.2)",
                    borderColor: meeting.recordingPaused ? "rgba(255,152,0,0.4)" : "rgba(244,67,54,0.4)",
                  }}
                />
              )}
            </Stack>
            {activeTableId && dyteMeeting && !isPostEventLounge && !mainRoomPeekVisible && (
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setMainRoomPeekVisible(true);
                  setShowMainRoomPeek(true);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 999,
                  px: 1.2,
                  py: 0.4,
                  minWidth: 0,
                  bgcolor: "#14b8b1",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#0e8e88" },
                }}
              >
                Restore Main Room View
              </Button>
            )}

            {/* ✅ Notification History Bell Icon (Host Only) */}
            {isHost && (
              <Tooltip title="Notification History">
                <IconButton
                  sx={headerIconBtnSx}
                  aria-label="Notification History"
                  onClick={(e) => {
                    setNotifAnchorEl(e.currentTarget);
                    setUnreadNotifCount(0);
                  }}
                >
                  <Badge badgeContent={unreadNotifCount} color="error" max={99}>
                    {unreadNotifCount > 0 ? (
                      <NotificationsIcon fontSize="small" sx={{ color: 'white' }} />
                    ) : (
                      <NotificationsNoneIcon fontSize="small" sx={{ color: 'white' }} />
                    )}
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

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
                <IconButton
                  sx={headerIconBtnSx}
                  aria-label="More options"
                  onClick={handleOpenMoreMenu}
                  aria-controls={moreMenuOpen ? "participant-more-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={moreMenuOpen ? "true" : undefined}
                >
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

        {/* Main Layout - Hidden if Speed Networking is active */}
        {!showSpeedNetworking && (
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
                      {/* ✅ FIRST PARTICIPANT TILE: Show first participant when alone in lounge instead of welcome message */}
                      {isBreakout && !latestPinnedHost && breakoutParticipantCount <= 1 && participants.length > 0 ? (
                        <>
                          <Avatar
                            src={participants[0]?.picture}
                            sx={{
                              width: 76,
                              height: 76,
                              fontSize: 22,
                              bgcolor: "rgba(255,255,255,0.12)",
                            }}
                          >
                            {initialsFromName(participants[0]?.name || "Participant")}
                          </Avatar>
                          <Typography sx={{ fontWeight: 800, fontSize: 18, textAlign: "center" }}>
                            {participants[0]?.name || "Participant"}
                          </Typography>
                          <Typography sx={{ opacity: 0.7, fontSize: 13, textAlign: "center" }}>
                            Member
                          </Typography>
                        </>
                      ) : isBreakout && !latestPinnedHost && breakoutParticipantCount <= 1 ? (
                        <>
                          {/* Fallback welcome message if participants not yet available */}
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
                            src={pinnedRaw?.picture} // ✅ Use pinned participant picture
                            sx={{
                              width: 76,
                              height: 76,
                              fontSize: 22,
                              bgcolor: "rgba(255,255,255,0.12)",
                            }}
                          >
                            {/* ✅ FIX: Show pinned participant's initials, not host's */}
                            {initialsFromName(pinnedRaw?.name || meeting.host.name)}
                          </Avatar>

                          {/* ✅ FIX: Display pinned participant's name and role */}
                          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                            {pinnedRaw?.name || meeting.host.name}
                          </Typography>
                          <Typography sx={{ opacity: 0.7, fontSize: 13 }}>
                            {pinnedIsHost ? "Host" : "Member"}
                          </Typography>
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
                      ) : isBreakout && breakoutParticipantCount === 0 ? (
                        <>
                          <Avatar
                            sx={{
                              width: 76,
                              height: 76,
                              fontSize: 22,
                              bgcolor: "rgba(255,255,255,0.12)",
                            }}
                          >
                            👤
                          </Avatar>
                          <Typography sx={{ fontWeight: 800, fontSize: 18, textAlign: "center" }}>
                            No one in this stage
                          </Typography>
                          <Typography sx={{ opacity: 0.7, fontSize: 13, textAlign: "center" }}>
                            Waiting for participants to join
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
                      {/* ✅ FIX: Display pinned participant's name and role (not just host's) */}
                      <Typography sx={{ fontWeight: 900, fontSize: 14, textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                        {pinnedRaw?.name || meeting.host.name}
                      </Typography>
                      <Typography sx={{ opacity: 0.75, fontSize: 12, textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                        {pinnedIsHost ? "Host" : "Member"}
                      </Typography>
                    </Box>
                  )}
                </Box>

              </Paper>

              {isMainRoomSupportMissing && (
                <Alert
                  severity="info"
                  sx={{
                    mt: 1,
                    mb: 0.5,
                    bgcolor: "rgba(20,184,177,0.12)",
                    border: "1px solid rgba(20,184,177,0.35)",
                    color: "rgba(255,255,255,0.92)",
                    "& .MuiAlert-icon": { color: "#14b8a6" },
                  }}
                >
                  Hosts/Moderators are currently in Breakout Rooms or Social Lounges. Please wait.
                </Alert>
              )}

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
                  <Tooltip title={(isOnBreak && !isBreakout) ? "Disabled during break" : (micOn ? "Mute" : "Unmute")}>
                    <IconButton
                      onClick={handleToggleMic}
                      disabled={isOnBreak && !isBreakout}
                      aria-label="Toggle mic"
                    >
                      {micOn ? <MicIcon /> : <MicOffIcon />}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={(isOnBreak && !isBreakout) ? "Disabled during break" : (camOn ? "Turn camera off" : "Turn camera on")}>
                    <IconButton
                      onClick={handleToggleCamera}
                      disabled={isOnBreak && !isBreakout}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.06)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                        "&.Mui-disabled": { opacity: 0.45 },
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

                  {showSocialLoungeToolbarAction && (
                    <Tooltip title="Social Lounge">
                      <IconButton
                        onClick={openLoungeOverlay}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.06)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                          mx: 0.5
                        }}
                      >
                        <SocialLoungeIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  {!isHost &&
                    !isBreakout &&
                    !isEventOwner &&
                    !["Host", "Moderator", "Speaker"].includes(
                      assignedRoleByIdentity.get(`id:${String(currentUserId)}`) || ""
                    ) && (
                      <Tooltip
                        title={
                          assistanceCooldownRemaining > 0
                            ? `Request Assistance (${assistanceCooldownRemaining}s)`
                            : "Request Assistance"
                        }
                      >
                        <span>
                          <IconButton
                            onClick={requestMainRoomAssistance}
                            disabled={assistanceCooldownRemaining > 0}
                            sx={{
                              bgcolor: "rgba(255,255,255,0.06)",
                              "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                              mx: 0.5,
                              "&.Mui-disabled": { opacity: 0.45 },
                            }}
                          >
                            <SupportAgentIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

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

                  {isHost && !isOnBreak && dbStatus === "live" && (
                    <Tooltip title="Start Break">
                      <IconButton
                        onClick={() => setBreakConfigOpen(true)}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.06)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                          mx: 0.5,
                          color: "#8b7355"
                        }}
                      >
                        <CoffeeIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  {isHost && (
                    <>
                      <Tooltip title={!isRecording ? "Start Recording" : isRecordingPaused ? "Recording Paused - Click for options" : "Recording Active - Click for options"}>
                        <IconButton
                          onClick={(e) => {
                            if (!isRecording) handleStartRecording();
                            else setRecordingAnchorEl(e.currentTarget);
                          }}
                          sx={{
                            bgcolor: !isRecording ? "rgba(255,255,255,0.06)" : isRecordingPaused ? "rgba(255,152,0,0.22)" : "rgba(244,67,54,0.22)",
                            "&:hover": { bgcolor: !isRecording ? "rgba(255,255,255,0.10)" : isRecordingPaused ? "rgba(255,152,0,0.30)" : "rgba(244,67,54,0.30)" },
                            mx: 0.5,
                            color: !isRecording ? "#fff" : isRecordingPaused ? "#ff9800" : "#f44336",
                          }}
                        >
                          {!isRecording ? (
                            <FiberManualRecordIcon />
                          ) : isRecordingPaused ? (
                            <PauseCircleIcon />
                          ) : (
                            <FiberManualRecordIcon
                              sx={{
                                animation: "recordingPulse 1.5s ease-in-out infinite",
                                "@keyframes recordingPulse": {
                                  "0%, 100%": { opacity: 1 },
                                  "50%": { opacity: 0.5 },
                                },
                              }}
                            />
                          )}
                        </IconButton>
                      </Tooltip>

                      <Menu
                        anchorEl={recordingAnchorEl}
                        open={Boolean(recordingAnchorEl)}
                        onClose={() => setRecordingAnchorEl(null)}
                        anchorOrigin={{ vertical: "top", horizontal: "center" }}
                        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
                      >
                        {isRecordingPaused ? (
                          <MenuItem onClick={handleResumeRecording}>
                            <ListItemIcon><PlayCircleIcon fontSize="small" sx={{ color: "#4caf50" }} /></ListItemIcon>
                            <ListItemText>Resume Recording</ListItemText>
                          </MenuItem>
                        ) : (
                          <MenuItem onClick={handlePauseRecording}>
                            <ListItemIcon><PauseCircleIcon fontSize="small" sx={{ color: "#ff9800" }} /></ListItemIcon>
                            <ListItemText>Pause Recording</ListItemText>
                          </MenuItem>
                        )}
                        <MenuItem onClick={handleStopRecording}>
                          <ListItemIcon><StopCircleIcon fontSize="small" sx={{ color: "#f44336" }} /></ListItemIcon>
                          <ListItemText>Stop Recording</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handleCancelRecordingClick} sx={{ color: "error.main" }}>
                          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                          <ListItemText>Cancel Recording</ListItemText>
                        </MenuItem>
                      </Menu>
                    </>
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
                      onClick={handleLeaveMeetingClick}
                      sx={{
                        bgcolor: "rgba(244,67,54,0.22)",
                        "&:hover": { bgcolor: "rgba(244,67,54,0.30)" },
                      }}
                      aria-label="Leave meeting"
                    >
                      <CallEndIcon />
                    </IconButton>
                  </Tooltip>

                  {/* ✅ Contextual leave button for breakout/social lounge */}
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
                      {isInBreakoutTable ? "Leave Breakout Room" : "Leave Table"}
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
        )}
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

        {/* Leave Table/Room Confirmation Dialog */}
        <Dialog
          open={leaveTableDialogOpen}
          onClose={() => setLeaveTableDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={MODAL_PAPER_PROPS}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
            Leave this table and return to Main Room?
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "rgba(255,255,255,0.7)" }}>
              {activeTableName
                ? `You will leave "${activeTableName}" and return to the Main Room. You can rejoin tables anytime.`
                : "You will leave this table and return to the Main Room. You can rejoin tables anytime."}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setLeaveTableDialogOpen(false)}
              sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
            >
              No, Stay Here
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmLeaveTable}
              sx={{
                textTransform: "none",
                bgcolor: "#14b8b1",
                "&:hover": { bgcolor: "#0e8e88" },
                fontWeight: 700,
              }}
            >
              Yes, Return to Main Room
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
          <MenuItem
            onClick={handleSpotlightParticipant}
            disabled={!participantMenuTarget}
          >
            <ListItemIcon>
              <AutoAwesomeIcon fontSize="small" sx={{ color: "#22c55e" }} />
            </ListItemIcon>
            <ListItemText>
              {spotlightTarget &&
                (spotlightTarget?.participantId
                  ? String(spotlightTarget.participantId) === String(participantMenuTarget?.id)
                  : spotlightTarget?.participantUserKey &&
                  spotlightTarget.participantUserKey === getParticipantUserKey(participantMenuTarget?._raw || participantMenuTarget))
                ? "Already On Stage"
                : "Bring To Main Stage"}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={handleClearSpotlight} disabled={!spotlightTarget}>
            <ListItemIcon>
              <AutoAwesomeIcon fontSize="small" sx={{ color: "#94a3b8" }} />
            </ListItemIcon>
            <ListItemText>Clear Spotlight</ListItemText>
          </MenuItem>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
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

        <Dialog
          open={cancelRecordingOpen}
          onClose={() => !isCancellingRecording && setCancelRecordingOpen(false)}
          PaperProps={MODAL_PAPER_PROPS}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main", fontWeight: 700 }}>
            <DeleteOutlineIcon color="error" />
            Cancel Recording?
          </DialogTitle>
          <DialogContent>
            {cancelRecordingStep === 1 ? (
              <>
                <Typography sx={{ mb: 1.5 }}>
                  This will <strong>permanently delete</strong> the recording.
                </Typography>
                <Typography variant="body2" sx={{ color: "error.main", bgcolor: "rgba(244,67,54,0.1)", p: 1.5, borderRadius: 1, border: "1px solid rgba(244,67,54,0.3)", mb: 1 }}>
                  Warning: This action cannot be undone.
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                  If you want to keep the recording, choose Stop Recording instead.
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ mb: 1.25 }}>
                  Type <strong>DELETE</strong> to confirm permanent deletion.
                </Typography>
                <TextField
                  fullWidth
                  value={cancelRecordingText}
                  onChange={(e) => setCancelRecordingText(e.target.value)}
                  placeholder="DELETE"
                  disabled={isCancellingRecording}
                  autoFocus
                  sx={{
                    "& .MuiInputBase-input": {
                      color: "#fff",
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: "rgba(255,255,255,0.45)",
                      opacity: 1,
                    },
                  }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setCancelRecordingOpen(false);
                setCancelRecordingStep(1);
                setCancelRecordingText("");
              }}
              disabled={isCancellingRecording}
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Keep Recording
            </Button>
            {cancelRecordingStep === 1 ? (
              <Button
                onClick={() => setCancelRecordingStep(2)}
                variant="contained"
                color="error"
                disabled={isCancellingRecording}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={executeCancelRecording}
                variant="contained"
                color="error"
                disabled={isCancellingRecording || cancelRecordingText !== "DELETE"}
                startIcon={isCancellingRecording ? <CircularProgress size={16} /> : <DeleteOutlineIcon />}
              >
                {isCancellingRecording ? "Deleting..." : "Delete Forever"}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Participants: Break Mode Full-Screen Overlay */}
        {/* ✅ State hierarchy: lounge session > break > main stage */}
        {/* Only show break screen if NOT in a lounge room (!isBreakout && !activeTableId) */}
        {isOnBreak && !isHost && !isBreakout && !activeTableId && dbStatus === "live" && (
          <BreakModeScreen
            remainingSeconds={breakRemainingSeconds ?? 0}
            durationSeconds={breakDurationSeconds}
            loungeEnabled={loungeEnabledBreaks}
            onOpenLounge={() => setLoungeOpen(true)}
          />
        )}

        {/* Host: Break Mode Floating Control Bar */}
        {isOnBreak && isHost && (
          <HostBreakControls
            remainingSeconds={breakRemainingSeconds ?? 0}
            onEndBreak={handleEndBreak}
          />
        )}

        {/* Break Duration Configuration Dialog */}
        <BreakConfigDialog
          open={breakConfigOpen}
          onClose={() => setBreakConfigOpen(false)}
          onStartBreak={handleStartBreak}
        />

        <LoungeOverlay
          open={loungeOpen}
          onClose={() => setLoungeOpen(false)}
          eventId={eventId}
          currentUserId={getMyUserIdFromJwt()}
          isAdmin={isHost}
          dyteMeeting={dyteMeeting}
          onParticipantClick={openLoungeParticipantInfo}
          onOpenSettings={() => setLoungeSettingsOpen(true)}
          onEnterBreakout={async (newToken, tableId, tableName, logoUrl) => {
            await applyBreakoutToken(newToken, tableId, tableName, logoUrl); // ✅ Pass logo URL
          }}
          onJoinMain={forceRejoinMainFromLounge}
        />
        <LoungeSettingsDialog
          open={loungeSettingsOpen}
          onClose={() => setLoungeSettingsOpen(false)}
          event={eventData}
          onSaved={(savedSettings) => {
            // Immediately update eventData so dialog shows correct values when reopened
            setEventData((prev) => ({ ...prev, ...savedSettings }));
          }}
        />

        {/* ✅ Breakout Controls (Host Only) */}
        <BreakoutControls
          open={isBreakoutControlsOpen}
          onClose={() => setIsBreakoutControlsOpen(false)}
          onAction={(data) => {
            console.log("[BreakoutControls] Action received:", data);
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

            // ✅ Send action and provide feedback
            const sent = sendMainSocketAction(data);
            if (sent) {
              console.log("[BreakoutControls] Action sent successfully:", data.action);
              showSnackbar(`${data.action === "manual_assign" ? "Assigning participant..." : "Processing..."} `, "info");
            } else {
              console.warn("[BreakoutControls] Action queued or failed:", data.action);
              showSnackbar(`Action queued. Will send when connection is ready.`, "warning");
            }
          }}
          onlineCount={availableParticipantsForAssign.length}
          onlineUsers={availableParticipantsForAssign}
          loungeTables={loungeTables}
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
            onMemberInfo={openMemberInfo}
          />
        </Dialog>

        {/* ✅ Speed Networking Session Prompt Modal */}
        <SpeedNetworkingSessionPrompt
          open={showNetworkingPrompt}
          sessionData={sessionStartNotification}
          onJoinNetworking={() => {
            // ✅ FIXED: Only redirect to Speed Networking screen
            // Do NOT join queue here - let SpeedNetworkingZone handle it
            // Users will join queue only after clicking the green "JOIN SPEED NETWORKING" button
            console.log("[Modal] Redirecting to Speed Networking screen (not joining queue yet)");
            setShowNetworkingPrompt(false);
            setShowSpeedNetworking(true);
          }}
          onJoinLounge={() => {
            setShowNetworkingPrompt(false);
            showSnackbar("You can join the networking session anytime from the controls", "info");
          }}
          onLeave={() => {
            setShowNetworkingPrompt(false);
            // Leave meeting logic
            if (dyteMeeting) {
              dyteMeeting.leaveRoom();
            }
          }}
          isLoading={false}
        />

        {/* ✅ Main Room Peek (when seated at a lounge table) */}
        {activeTableId && dyteMeeting && !isPostEventLounge && mainRoomPeekVisible && showMainRoomPeek && (
          <Box
            ref={mainRoomPeekRef}
            sx={{
              position: "fixed",
              top: `${mainRoomPeekPosition.y}px`,
              left: `${mainRoomPeekPosition.x}px`,
              zIndex: 1300,
              transition: isDraggingMainRoomPeek ? "none" : "top 140ms ease, left 140ms ease",
            }}
          >
            <MainRoomPeek
              mainDyteMeeting={mainDyteMeeting}
              isInBreakout={isInBreakoutRoom}
              onClose={() => setMainRoomPeekVisible(false)}
              onHeaderPointerDown={handleMainRoomPeekDragStart}
              isDragging={isDraggingMainRoomPeek}
              pinnedParticipantId={pinnedRaw?.id}
              loungeParticipantKeys={participants
                .filter((p) => p.isOccupyingLounge)
                .map((p) => getParticipantUserKey(p?._raw || p))
                .filter(Boolean)}
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

        {/* ✅ Speed Networking Auto-Join Notification */}
        <Snackbar
          open={!!speedNetworkingNotification}
          autoHideDuration={4000}
          onClose={() => setSpeedNetworkingNotification(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSpeedNetworkingNotification(null)}
            severity="info"
            variant="filled"
            sx={{
              width: "100%",
              boxShadow: 3,
            }}
          >
            {speedNetworkingNotification}
          </Alert>
        </Snackbar>

        {/* ✅ Notification History Popover */}
        <Popover
          open={Boolean(notifAnchorEl)}
          anchorEl={notifAnchorEl}
          onClose={() => setNotifAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              bgcolor: '#111827',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              width: 340,
              maxHeight: 480,
            },
          }}
        >
          <NotificationHistoryPanel
            notifications={notificationHistory}
            onClearAll={() => setNotificationHistory([])}
            onClose={() => setNotifAnchorEl(null)}
            breakoutRooms={loungeTables}
            onAssign={handleAssignFromHistory}
            assigningParticipantId={assigningParticipantId}
          />
        </Popover>

        <Popover
          open={moodPickerOpen}
          anchorEl={moodAnchorEl}
          onClose={() => {
            setMoodAnchorEl(null);
          }}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: {
              p: 1.2,
              width: 360,
              bgcolor: "rgba(9, 14, 24, 0.96)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 2,
              "& .EmojiPickerReact": {
                "--epr-bg-color": "#111420",
                "--epr-picker-border-color": "rgba(255,255,255,0.12)",
                "--epr-search-border-color": "rgba(255,255,255,0.12)",
                "--epr-search-input-bg-color": "rgba(255,255,255,0.06)",
                "--epr-search-input-text-color": "rgba(255,255,255,0.92)",
                "--epr-category-label-bg-color": "#111420",
                "--epr-category-label-text-color": "rgba(255,255,255,0.74)",
                "--epr-text-color": "rgba(255,255,255,0.88)",
                "--epr-hover-bg-color": "rgba(40, 190, 190, 0.14)",
                borderRadius: "14px",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              },
              "& .EmojiPickerReact *::-webkit-scrollbar": {
                width: "10px",
                height: "10px",
              },
              "& .EmojiPickerReact *::-webkit-scrollbar-track": {
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                borderRadius: "999px",
              },
              "& .EmojiPickerReact *::-webkit-scrollbar-thumb": {
                background: "linear-gradient(180deg, #1fd1c7, #0ea5a5)",
                borderRadius: "999px",
                border: "2px solid rgba(8,12,20,0.95)",
              },
              "& .EmojiPickerReact *::-webkit-scrollbar-thumb:hover": {
                background: "linear-gradient(180deg, #39e3da, #14b8a6)",
              },
              "& .EmojiPickerReact *": {
                scrollbarWidth: "thin",
                scrollbarColor: "#14b8a6 rgba(255,255,255,0.06)",
              },
            },
          }}
        >
          <Stack spacing={1}>
            <EmojiPicker
              width="100%"
              height={320}
              theme="dark"
              searchDisabled={false}
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emojiData) => {
                const value = emojiData?.emoji;
                if (!value) return;
                applyMood(value);
                setMoodAnchorEl(null);
              }}
            />

            {!!recentMoods.length && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {recentMoods.slice(0, 6).map((m) => (
                  <IconButton
                    key={`recent-${m}`}
                    size="small"
                    onClick={() => {
                      applyMood(m);
                      setMoodAnchorEl(null);
                    }}
                    sx={{ fontSize: 18 }}
                  >
                    {m}
                  </IconButton>
                ))}
              </Stack>
            )}
            <Button
              size="small"
              variant="text"
              onClick={() => {
                applyMood(null);
                setMoodAnchorEl(null);
              }}
            >
              Clear Mood
            </Button>
          </Stack>
        </Popover>

        {/* ✅ NEW: Announcement Dialog (Create & Edit) */}
        <Dialog
          open={announcementDialogOpen}
          onClose={() => {
            setAnnouncementDialogOpen(false);
            setAnnouncementText("");
            setEditingAnnouncement(null);
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
            {editingAnnouncement ? "✏️ Edit Announcement" : "📢 Send Announcement"}
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
              {editingAnnouncement
                ? "Update your announcement for all waiting participant(s)"
                : `Send a message to all ${filteredWaitingRoomCount} waiting participant(s)`}
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

                // ✅ NEW: Handle both create and edit modes
                if (editingAnnouncement) {
                  await updateAnnouncementAPI(editingAnnouncement.id, announcementText);
                } else {
                  setAnnouncementSending(true);
                  try {
                    await sendAnnouncement(announcementText);
                    setAnnouncementDialogOpen(false);
                    setAnnouncementText("");
                  } finally {
                    setAnnouncementSending(false);
                  }
                }
              }}
              variant="contained"
              disabled={
                announcementActionLoading || announcementSending || !announcementText.trim() || announcementText.length > 1000
              }
              startIcon={announcementActionLoading || announcementSending ? <CircularProgress size={20} /> : <AnnouncementIcon />}
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
              {announcementActionLoading || announcementSending ? "Saving..." : editingAnnouncement ? "Update" : "Send"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ✅ NEW: Delete Announcement Confirmation Dialog */}
        <Dialog
          open={Boolean(deleteConfirmAnnouncementId)}
          onClose={() => setDeleteConfirmAnnouncementId(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.10)",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
            Delete Announcement?
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
              This announcement will be immediately removed for all participants in the waiting room. This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2 }}>
            <Button
              onClick={() => setDeleteConfirmAnnouncementId(null)}
              sx={{ color: "rgba(255,255,255,0.65)", textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteAnnouncementAPI(deleteConfirmAnnouncementId)}
              variant="contained"
              color="error"
              disabled={announcementActionLoading}
              startIcon={announcementActionLoading ? <CircularProgress size={16} /> : <DeleteOutlineRoundedIcon />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* ✅ Participant More Menu */}
        <Menu
          id="participant-more-menu"
          anchorEl={moreMenuAnchor}
          open={moreMenuOpen}
          onClose={handleCloseMoreMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 220,
              bgcolor: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 2.5,
              backdropFilter: "blur(12px)",
              color: "#fff",
              "& .MuiMenuItem-root": {
                typography: "body2",
                fontWeight: 600,
                gap: 1.5,
                py: 1.2,
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
              },
              "& .MuiListItemIcon-root": {
                color: "rgba(255,255,255,0.8)",
                minWidth: 32,
              },
            },
          }}
        >
          <MenuItem onClick={handleReportIssue}>
            <ListItemIcon>
              <ReportProblemIcon fontSize="small" />
            </ListItemIcon>
            Report an Issue
          </MenuItem>
          <MenuItem onClick={handleContactSupport}>
            <ListItemIcon>
              <SupportAgentIcon fontSize="small" />
            </ListItemIcon>
            Help & Support
          </MenuItem>
        </Menu>

      </Box>
    </DyteProvider >

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
        toApiUrl(`users/${userId}/`),
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

          // Extract kyc_status from various possible locations
          const kycStatus =
            data?.kyc_status ||
            data?.profile?.kyc_status ||
            data?.user?.kyc_status ||
            data?.user?.profile?.kyc_status ||
            "";

          setProfileInfo({
            jobTitle: jobTitle || "",
            company: company || "",
            location: location || "",
            kycStatus: kycStatus,
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

        {/* Show Mood Emoji Badge */}
        {selectedMember.mood && (
          <Box
            sx={{
              position: "absolute",
              bottom: -8,
              right: -8,
              bgcolor: "rgba(20, 184, 166, 0.2)",
              borderRadius: "50%",
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #14b8a6",
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            <Typography sx={{ fontSize: 24 }}>{selectedMember.mood}</Typography>
          </Box>
        )}
      </Box>

      {/* 2. Name */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.8, mb: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
          {selectedMember.name}
        </Typography>
        {profileInfo?.kycStatus === "approved" && (
          <VerifiedRoundedIcon
            sx={{
              fontSize: 20,
              color: "#14b8a6",
              flexShrink: 0,
            }}
          />
        )}
      </Box>

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
