import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
} from "@cloudflare/realtimekit-react";
import {
  RtkUiProvider,
  RtkGrid,
  RtkChat,
  RtkParticipants,
  RtkParticipantsAudio,
  RtkDialogManager,
  RtkNotifications,
  RtkMeetingTitle,
  RtkLivestreamIndicator,
  RtkClock,
  RtkParticipantCount,
  RtkMicToggle,
  RtkCameraToggle,
  RtkScreenShareToggle,
  RtkLeaveButton,
  RtkSettingsToggle,
  RtkFullscreenToggle,
  RtkSetupScreen,
  RtkWaitingScreen,
  RtkEndedScreen,
} from "@cloudflare/realtimekit-react-ui";
import {
  Avatar,
  Box,
  CircularProgress,
  Typography,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Chip,
  Stack,
  Tooltip,
  Paper,
  Drawer,
  useMediaQuery,
  useTheme,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Menu,
  Badge,
  Switch,
} from "@mui/material";
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Group as GroupIcon,
  ViewSidebar as ViewSidebarIcon,
  CallEnd as CallEndIcon,
  FiberManualRecord as FiberManualRecordIcon,
  PauseCircle as PauseCircleIcon,
  PlayCircle as PlayCircleIcon,
  StopCircle as StopCircleIcon,
  DeleteOutline as DeleteOutlineIcon,
} from "@mui/icons-material";
import axios from "axios";

const LAYOUT_TOP_OFFSET = 64;
const RIGHT_PANEL_W = 420;

function toArraySafe(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (typeof source.toArray === "function") return source.toArray();
  if (source instanceof Map) return Array.from(source.values());
  if (typeof source === "object") {
    if (Array.isArray(source.participants)) return source.participants;
    return Object.values(source).filter((item) => item && typeof item === "object");
  }
  return [];
}

function getJoinedParticipants(meeting) {
  if (!meeting) return [];

  const participantsObj = meeting.participants || {};
  const candidates = [
    meeting.self,
    participantsObj.joined,
    participantsObj.all,
    participantsObj.active,
    participantsObj.list,
    participantsObj.participants,
    participantsObj.joined?.participants,
  ];

  const byId = new Map();
  candidates.flatMap(toArraySafe).forEach((participant) => {
    const id = participant?.id || participant?.participantId || participant?.userId;
    if (!id) return;
    byId.set(String(id), participant);
  });

  if (meeting.self?.id) byId.set(String(meeting.self.id), meeting.self);
  return Array.from(byId.values());
}

function getParticipantRole(participant, selfIsHost = false, selfId = null) {
  if (!participant) return "Audience";
  if (selfIsHost && selfId && String(participant.id || "") === String(selfId)) return "Host";

  const rawRole = [
    participant.role,
    participant.participantRole,
    participant.displayRole,
    participant.userRole,
    participant.user_role,
    participant._raw?.role,
    participant._raw?.participantRole,
    participant._raw?.user_role,
    participant.presetName,
    participant._raw?.presetName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(host|publisher|admin|presenter)/.test(rawRole)) return "Host";
  if (/(speaker|moderator)/.test(rawRole)) return "Speaker";
  return "Audience";
}

function participantName(participant) {
  return participant?.name || participant?.displayName || participant?._raw?.name || "Guest";
}

function initialsFromName(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "G";
}

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    ""
  );
}

function JoinedMeetingLayout({ meeting, isHost, panel, setPanel, containerRef }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [permAnchorEl, setPermAnchorEl] = useState(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [recordingAnchorEl, setRecordingAnchorEl] = useState(null);
  const rootRef = useRef(null);

  const permMenuOpen = Boolean(permAnchorEl);
  const moreMenuOpen = Boolean(moreMenuAnchor);

  const openPermMenu = (event) => setPermAnchorEl(event.currentTarget);
  const closePermMenu = () => setPermAnchorEl(null);
  const handleOpenMoreMenu = (event) => setMoreMenuAnchor(event.currentTarget);
  const handleCloseMoreMenu = () => setMoreMenuAnchor(null);

  const [pinnedHostId, setPinnedHostId] = useState(null);
  const [participantChips, setParticipantChips] = useState([]);
  const [participantList, setParticipantList] = useState([]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const updateParticipantChips = () => {
    if (!meeting) return;
    const participants = getJoinedParticipants(meeting);
    const selfId = meeting.self?.id || null;
    const toParticipantItem = (participant) => {
      const name = participantName(participant);
      const roleLabel = getParticipantRole(participant, isHost, selfId);

      return {
        id: participant.id || participant.participantId || participant.userId || name,
        name,
        roleLabel,
        cam: Boolean(participant.cam || participant.videoEnabled || participant.webcamOn),
        mic: Boolean(participant.mic || participant.audioEnabled || participant.micOn),
        picture: participant.picture || participant.image || participant.avatar || participant._raw?.picture || null,
        isHost: roleLabel === "Host",
        isSpeaker: roleLabel === "Speaker",
        isSelf: selfId ? String(participant.id || "") === String(selfId) : false,
      };
    };

    const hostParticipant = participants.find((participant) => getParticipantRole(participant, isHost, selfId) === "Host");
    const hostId = hostParticipant?.id || meeting.self?.id || null;
    setPinnedHostId(hostId);

    const sortedParticipants = [...participants].sort((a, b) => {
      const roleOrder = { Host: 0, Speaker: 1, Audience: 2 };
      const aRole = roleOrder[getParticipantRole(a, isHost, selfId)] ?? 3;
      const bRole = roleOrder[getParticipantRole(b, isHost, selfId)] ?? 3;
      if (aRole !== bRole) return aRole - bRole;
      const aName = String(participantName(a)).toLowerCase();
      const bName = String(participantName(b)).toLowerCase();
      return aName.localeCompare(bName);
    });

    const chips = sortedParticipants
      .filter((participant) => participant?.id && participant.id !== hostId)
      .slice(0, 8)
      .map(toParticipantItem);

    setParticipantChips(chips);
    setParticipantList(sortedParticipants.map(toParticipantItem));
  };

  useEffect(() => {
    if (!meeting) return;
    const joined = meeting.participants?.joined;
    const listeners = ["participantJoined", "participantLeft", "participantsUpdate", "stageStatusUpdate"];

    updateParticipantChips();

    listeners.forEach((event) => {
      if (typeof joined?.on === "function") {
        joined.on(event, updateParticipantChips);
      } else if (typeof joined?.addListener === "function") {
        joined.addListener(event, updateParticipantChips);
      }
    });

    return () => {
      listeners.forEach((event) => {
        if (typeof joined?.off === "function") {
          joined.off(event, updateParticipantChips);
        } else if (typeof joined?.removeListener === "function") {
          joined.removeListener(event, updateParticipantChips);
        }
      });
    };
  }, [meeting, isHost]);

  const groupedParticipantList = [
    { label: "HOST", items: participantList.filter((participant) => participant.roleLabel === "Host") },
    { label: "SPEAKER", items: participantList.filter((participant) => participant.roleLabel === "Speaker") },
    { label: "AUDIENCE", items: participantList.filter((participant) => participant.roleLabel === "Audience") },
  ];

  const ParticipantsTabContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box
        sx={{
          px: 2,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(0,0,0,0.10)",
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Participants</Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.65, mt: 0.5 }}>
            {participantList.length} current participant{participantList.length === 1 ? "" : "s"}
          </Typography>
        </Box>
        <Chip
          size="small"
          label="All users"
          sx={{
            bgcolor: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontWeight: 700,
            fontSize: 11,
          }}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}>
        {participantList.length === 0 ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ opacity: 0.75 }}>No participants yet.</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {groupedParticipantList.map((group) => (
              <Box key={group.label}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0, opacity: 0.65, mb: 1 }}>
                  {group.label} ({group.items.length})
                </Typography>
                {group.items.length === 0 ? (
                  <Typography sx={{ fontSize: 13, opacity: 0.55, mb: 1.25 }}>No {group.label.toLowerCase()} users.</Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {group.items.map((participant) => (
                      <Paper
                        key={participant.id}
                        variant="outlined"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          p: 1.25,
                          borderRadius: 2,
                          borderColor: "rgba(255,255,255,0.12)",
                          bgcolor: participant.isHost ? "rgba(20,184,177,0.08)" : "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Avatar
                          src={participant.picture || undefined}
                          sx={{ width: 42, height: 42, fontSize: 14, bgcolor: "rgba(255,255,255,0.12)" }}
                        >
                          {initialsFromName(participant.name)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                            {participant.name}{participant.isSelf ? " (You)" : ""}
                          </Typography>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                            <Chip
                              size="small"
                              label={participant.roleLabel}
                              sx={{
                                bgcolor: participant.isHost ? "rgba(20,184,177,0.16)" : "rgba(255,255,255,0.06)",
                                color: participant.isHost ? "#bbf7d0" : "rgba(255,255,255,0.86)",
                                border: participant.isHost ? "1px solid rgba(20,184,177,0.3)" : "1px solid rgba(255,255,255,0.12)",
                                fontSize: 10,
                                height: 22,
                              }}
                            />
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {participant.cam ? (
                                <VideocamIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                              ) : (
                                <VideocamOffIcon sx={{ fontSize: 14, color: "#ef4444" }} />
                              )}
                              {participant.mic ? (
                                <MicIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                              ) : (
                                <MicOffIcon sx={{ fontSize: 14, color: "#ef4444" }} />
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );

  useEffect(() => {
    if (!meeting) return;

    const pinHost = async () => {
      try {
        if (isHost && meeting.self && typeof meeting.self.pin === "function") {
          if (!meeting.self.isPinned) await meeting.self.pin();
        }

        const joined = meeting.participants?.joined;
        const participants = typeof joined?.toArray === "function" ? joined.toArray() : [];

        if (!isHost) {
          const hostParticipant = participants.find((participant) => {
            const preset = String(participant?.presetName || "").toLowerCase();
            return (
              preset.includes("host") ||
              preset.includes("publisher") ||
              preset.includes("admin") ||
              preset.includes("presenter")
            );
          });

          if (hostParticipant && typeof hostParticipant.pin === "function") {
            if (!hostParticipant.isPinned) await hostParticipant.pin();
            setPinnedHostId(hostParticipant.id || null);
          }
        }

        if (typeof meeting.participants?.setViewMode === "function") {
          meeting.participants.setViewMode("ACTIVE_GRID");
        }
      } catch (e) {
        console.warn("RTK pin/active grid setup failed:", e);
      }
    };

    pinHost();
  }, [meeting, isHost]);

  const toggleRightPanel = (newTab) => {
    setTab(newTab);
    setRightPanelOpen(true);
  };

  const closeRightPanel = () => {
    setRightPanelOpen(false);
  };

  const SidebarMainContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {tab === 0 ? "Chat" : tab === 3 ? "Participants" : "Panel"}
        </Typography>
        <IconButton
          onClick={closeRightPanel}
          sx={{ color: "rgba(255,255,255,0.7)" }}
        >
          ×
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, p: 0 }}>
        {tab === 0 ? (
          <RtkChat style={{ width: "100%", height: "100%" }} />
        ) : tab === 3 ? (
          ParticipantsTabContent
        ) : null}
      </Box>
    </Box>
  );

  const SidebarIconRail = (
    <Box
      sx={{
        width: 70,
        height: "100%",
        borderRadius: "24px",
        background: "rgba(0,0,0,0.38)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        py: 1,
      }}
    >
      <Tooltip title="Chat">
        <IconButton
          onClick={() => toggleRightPanel(0)}
          sx={{
            width: 52,
            height: 52,
            borderRadius: "16px",
            color: "#fff",
            background: tab === 0 && rightPanelOpen ? "rgba(18, 193, 163, 0.22)" : "transparent",
            border: tab === 0 && rightPanelOpen
              ? "1px solid rgba(18, 193, 163, 0.45)"
              : "1px solid transparent",
            "&:hover": {
              background: tab === 0 && rightPanelOpen
                ? "rgba(18, 193, 163, 0.28)"
                : "rgba(255,255,255,0.06)",
            },
          }}
        >
          <ChatBubbleOutlineIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Participants">
        <IconButton
          onClick={() => toggleRightPanel(3)}
          sx={{
            width: 52,
            height: 52,
            borderRadius: "16px",
            color: "#fff",
            background: tab === 3 && rightPanelOpen ? "rgba(18, 193, 163, 0.22)" : "transparent",
            border: tab === 3 && rightPanelOpen
              ? "1px solid rgba(18, 193, 163, 0.45)"
              : "1px solid transparent",
            "&:hover": {
              background: tab === 3 && rightPanelOpen
                ? "rgba(18, 193, 163, 0.28)"
                : "rgba(255,255,255,0.06)",
            },
          }}
        >
          <GroupIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const RightPanelContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {tab === 0 ? "Chat" : tab === 3 ? "Participants" : "Panel"}
        </Typography>
        <IconButton
          onClick={() => setRightPanelOpen(false)}
          sx={{ color: "rgba(255,255,255,0.7)" }}
        >
          ×
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, p: 0 }}>
        {tab === 0 ? (
          <RtkChat style={{ width: "100%", height: "100%" }} />
        ) : tab === 3 ? (
          ParticipantsTabContent
        ) : null}
      </Box>
    </Box>
  );

  const headerIconBtnSx = {
    width: 36,
    height: 36,
    borderRadius: 2,
    color: "#fff",
    background: "rgba(255,255,255,0.06)",
    "&:hover": { background: "rgba(255,255,255,0.10)" },
  };

  const headerChipSx = {
    bgcolor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    "& .MuiChip-label": { fontWeight: 700, fontSize: 11 },
  };

  return (
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
            minHeight: 44,
            px: 1.25,
            py: 0.25,
            position: "relative",
          }}
        >
          <IconButton sx={headerIconBtnSx} aria-label="Leave meeting">
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
            <RtkMeetingTitle />
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 0.5 }}>
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

            <Chip size="small" label={<RtkClock />} sx={headerChipSx} />
          </Stack>

          <Tooltip title="My controls">
            <span>
              <IconButton
                sx={headerIconBtnSx}
                aria-label="My controls"
                onClick={openPermMenu}
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
                <ViewSidebarIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="More">
              <IconButton
                sx={headerIconBtnSx}
                aria-label="More options"
                onClick={handleOpenMoreMenu}
              >
                ⋯
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
            color: "#fff",
            "& .MuiListItemText-primary": { color: "#fff" },
            "& .MuiListItemText-secondary": { color: "rgba(255,255,255,0.65)" },
            "& .MuiListItemIcon-root": { color: "#fff" },
          },
        }}
        MenuListProps={{
          sx: {
            "& .MuiMenuItem-root:hover": { bgcolor: "rgba(255,255,255,0.06)" },
          },
        }}
      >
        <MenuItem disabled sx={{ fontWeight: 800, opacity: 0.9 }}>
          My Controls
        </MenuItem>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

        <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <MicIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Microphone" secondary="On" />
          <RtkMicToggle />
        </MenuItem>

        <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <VideocamIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Camera" secondary="On" />
          <RtkCameraToggle />
        </MenuItem>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.10)" }} />

        <MenuItem onClick={() => {}} sx={{ gap: 1.25, py: 1.1 }}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Device Settings" secondary="Choose mic & camera" />
        </MenuItem>
      </Menu>

      <Menu
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
          },
        }}
        MenuListProps={{
          sx: {
            "& .MuiMenuItem-root:hover": { bgcolor: "rgba(255,255,255,0.06)" },
          },
        }}
      >
        <MenuItem>
          <ListItemText>Report an Issue</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemText>Help & Support</ListItemText>
        </MenuItem>
      </Menu>

      {/* Main Layout */}
      <Box
        sx={{
          display: "flex",
          height: `calc(100vh - ${LAYOUT_TOP_OFFSET}px)`,
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
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
              <Chip
                size="small"
                label={isHost ? "Host pinned" : "Host stage"}
                sx={{
                  bgcolor: "rgba(0,0,0,0.55)",
                  color: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  fontWeight: 700,
                  px: 1.2,
                }}
              />
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
              <RtkGrid style={{ width: "100%", height: "100%" }} />
            </Box>

            {participantChips.length > 0 && (
              <Box
                sx={{
                  flexShrink: 0,
                  display: "flex",
                  gap: 1,
                  overflowX: "auto",
                  flexWrap: "nowrap",
                  px: 2,
                  py: 1,
                  bgcolor: "rgba(0,0,0,0.16)",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {participantChips.map((participant) => (
                  <Paper
                    key={participant.id}
                    variant="outlined"
                    sx={{
                      flex: "0 0 auto",
                      width: 150,
                      minWidth: 150,
                      height: 84,
                      borderRadius: 2,
                      borderColor: "rgba(255,255,255,0.10)",
                      bgcolor: "rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                    }}
                  >
                    <Avatar
                      src={participant.picture || undefined}
                      sx={{ width: 36, height: 36, fontSize: 14, bgcolor: "rgba(255,255,255,0.12)" }}
                    >
                      {participant.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
                        {participant.name}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        {participant.cam ? (
                          <VideocamIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                        ) : (
                          <VideocamOffIcon sx={{ fontSize: 14, color: "#ef4444" }} />
                        )}
                        {participant.mic ? (
                          <MicIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                        ) : (
                          <MicOffIcon sx={{ fontSize: 14, color: "#ef4444" }} />
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>

          {/* Bottom Controls */}
          <Box
            sx={{
              flexShrink: 0,
              position: "relative",
              width: "100%",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 0.5,
              pb: 1,
            }}
          >
            {/* Role Badge */}
            <Box
              sx={{
                position: "fixed",
                left: 16,
                bottom: 16,
                display: "flex",
                alignItems: "center",
                zIndex: 1200,
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

            {/* Main Controls Bar */}
            <Paper
              variant="outlined"
              sx={{
                flexShrink: 0,
                borderRadius: 32,
                borderColor: "rgba(255,255,255,0.08)",
                bgcolor: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(14px)",
                px: 3,
                py: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3.5,
                mx: "auto",
                width: { xs: "auto", sm: "auto" },
                flexWrap: "nowrap",
              }}
            >
              {/* Microphone Control */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  minWidth: 90,
                }}
              >
                <RtkMicToggle />
              </Box>

              {/* Camera Control */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  minWidth: 90,
                }}
              >
                <RtkCameraToggle />
              </Box>

              {/* Screen Share Control */}
              {isHost && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    minWidth: 90,
                  }}
                >
                  <RtkScreenShareToggle />
                </Box>
              )}

              {/* Chat Control */}
              <Tooltip title="Chat">
                <Box
                  onClick={() => toggleRightPanel(0)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    minWidth: 90,
                  }}
                >
                  <IconButton
                    onClick={(e) => {
                      e.preventDefault();
                      toggleRightPanel(0);
                    }}
                    sx={{
                      width: 48,
                      height: 48,
                      padding: 0,
                      bgcolor: tab === 0 && rightPanelOpen ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                      color: "#fff",
                      "&:hover": { bgcolor: tab === 0 && rightPanelOpen ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                    }}
                  >
                    <ChatBubbleOutlineIcon />
                  </IconButton>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.80)",
                      textAlign: "center",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Chat
                  </Typography>
                </Box>
              </Tooltip>

              {/* Participants Control */}
              <Tooltip title="Participants">
                <Box
                  onClick={() => toggleRightPanel(3)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    minWidth: 90,
                  }}
                >
                  <IconButton
                    onClick={(e) => {
                      e.preventDefault();
                      toggleRightPanel(3);
                    }}
                    sx={{
                      width: 48,
                      height: 48,
                      padding: 0,
                      bgcolor: tab === 3 && rightPanelOpen ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                      color: "#fff",
                      "&:hover": { bgcolor: tab === 3 && rightPanelOpen ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                    }}
                  >
                    <GroupIcon />
                  </IconButton>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.80)",
                      textAlign: "center",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    People
                  </Typography>
                </Box>
              </Tooltip>

              {/* Sidebar Control */}
              <Tooltip title={rightPanelOpen ? "Close Sidebar" : "Open Sidebar"}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    minWidth: 90,
                  }}
                >
                  <IconButton
                    onClick={() => {
                      if (rightPanelOpen) closeRightPanel();
                      else toggleRightPanel(tab);
                    }}
                    sx={{
                      width: 48,
                      height: 48,
                      padding: 0,
                      bgcolor: rightPanelOpen ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                      color: "#fff",
                      "&:hover": { bgcolor: rightPanelOpen ? "rgba(20,184,177,0.30)" : "rgba(255,255,255,0.10)" },
                    }}
                  >
                    <ViewSidebarIcon />
                  </IconButton>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.80)",
                      textAlign: "center",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Panel
                  </Typography>
                </Box>
              </Tooltip>

              {/* Leave Button */}
              <Tooltip title="Leave meeting">
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    minWidth: 90,
                  }}
                >
                  <RtkLeaveButton />
                </Box>
              </Tooltip>
            </Paper>
          </Box>
        </Box>

        {/* Right Panel (Desktop) */}
        {isMdUp && (
          <Box sx={{ display: "flex", flexDirection: "row", height: `calc(100vh - ${LAYOUT_TOP_OFFSET}px)`, position: "sticky", top: LAYOUT_TOP_OFFSET }}>
            {/* Content Panel (Collapsible) */}
            {rightPanelOpen && (
              <Box
                sx={{
                  width: RIGHT_PANEL_W - 70,
                  borderLeft: "1px solid rgba(255,255,255,0.08)",
                  bgcolor: "rgba(0,0,0,0.25)",
                  backdropFilter: "blur(10px)",
                  height: "100%",
                  overflow: "hidden",
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
            open={rightPanelOpen}
            onClose={() => setRightPanelOpen(false)}
            PaperProps={{
              sx: {
                width: { xs: "92vw", sm: RIGHT_PANEL_W },
                bgcolor: "rgba(0,0,0,0.85)",
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                "&, & *": { color: "#fff" },
              },
            }}
          >
            {RightPanelContent}
          </Drawer>
        )}
      </Box>
    </Box>
  );
}

export default function NewLiveMeetingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const eventId = searchParams.get("id");
  const role = searchParams.get("role") || "audience";
  const isHost = role === "publisher";

  const [meeting, initMeeting] = useRealtimeKitClient();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [uiStates, setUiStates] = useState({});
  const containerRef = useRef(null);

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
            defaults: {
              audio: false,
              video: false,
            },
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
  }, [eventId, role, initMeeting]);

  if (status === "idle" || status === "joining") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        gap={2}
        sx={{ background: "#050b16", color: "#fff" }}
      >
        <CircularProgress />
        <Typography>Joining meeting…</Typography>
      </Box>
    );
  }

  if (status === "error") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        gap={2}
        sx={{ background: "#050b16", color: "#fff" }}
      >
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <RealtimeKitProvider value={meeting}>
      <RtkUiProvider
        meeting={meeting}
        showSetupScreen={isHost}
        onRtkStatesUpdate={(e) => setUiStates(e.detail)}
        style={{ width: "100vw", height: "100vh", display: "block" }}
      >
        {uiStates.meeting === "setup" ? (
          <RtkSetupScreen />
        ) : uiStates.meeting === "waiting" ? (
          <RtkWaitingScreen />
        ) : uiStates.meeting === "ended" ? (
          <RtkEndedScreen />
        ) : (
          <JoinedMeetingLayout
            meeting={meeting}
            isHost={isHost}
            containerRef={containerRef}
          />
        )}

        <RtkParticipantsAudio />
        <RtkDialogManager />
        <RtkNotifications />
      </RtkUiProvider>
    </RealtimeKitProvider>
  );
}
