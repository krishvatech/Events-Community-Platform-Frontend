// src/pages/LiveMeetingPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import CallEndIcon from "@mui/icons-material/CallEnd";

import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import PollIcon from "@mui/icons-material/Poll";
import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";

import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";

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

function StageMiniTile({ p, tileW = 140, tileH = 82 }) {
  const isSmall = tileW <= 132 || tileH <= 76;

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
        <Avatar
          sx={{
            position: "absolute",
            top: isSmall ? 6 : 8,          // ✅ little top
            left: "50%",
            transform: "translateX(-50%)", // ✅ center
            bgcolor: "rgba(255,255,255,0.14)",
            width: isSmall ? 30 : 34,
            height: isSmall ? 30 : 34,
            fontSize: isSmall ? 11 : 12,
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
            right: 62, // ✅ was 34, now more space for 2 icons
            fontWeight: 700,
            fontSize: 12,
            opacity: 0.9,
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


export default function NewLiveMeeting() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const [rightOpen, setRightOpen] = useState(false); // mobile drawer
  const [tab, setTab] = useState(0);

  // ✅ Host permissions (local UI state for now)
  const [hostPerms, setHostPerms] = useState({
    chat: true,
    polls: true,
    screenShare: true,
  });

  // ✅ Assume current user is host (replace with your real role check)
  const isHost = true;

  // ✅ Settings menu anchor
  const [permAnchorEl, setPermAnchorEl] = useState(null);
  const permMenuOpen = Boolean(permAnchorEl);

  const openPermMenu = (e) => setPermAnchorEl(e.currentTarget);
  const closePermMenu = () => setPermAnchorEl(null);

  const setPerm = (key) => (e) => {
    const checked = e.target.checked;
    setHostPerms((p) => ({ ...p, [key]: checked }));
  };

  // ✅ Fullscreen support
  const rootRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const meeting = useMemo(
    () => ({
      title: "Q4 2024 M&A Strategy Session",
      live: true,
      timer: "00:23",
      recording: true,
      roomLabel: "Pinned",
      host: { name: "Sarah Johnson", role: "Host" },
    }),
    []
  );

  const participants = useMemo(
    () => [
      { name: "Sarah Johnson", role: "Host", mic: false, cam: false, active: true },
      { name: "Michael Chen", role: "Audience", mic: false, cam: false, active: false },
      { name: "Emma Williams", role: "Audience", mic: false, cam: false, active: false },
      { name: "David Park", role: "Speaker", mic: false, cam: false, active: false },
      { name: "Lisa Anderson", role: "Audience", mic: false, cam: false, active: false },
      { name: "Lisa Anderson", role: "Audience", mic: false, cam: false, active: false },
      { name: "David Park", role: "Speaker", mic: false, cam: false, active: false },
      { name: "David Park", role: "Speaker", mic: false, cam: false, active: false },
      { name: "Michael Chen", role: "Audience", mic: false, cam: false, active: false },
      { name: "Emma Williams", role: "Audience", mic: false, cam: false, active: false },
      { name: "David Park", role: "Speaker", mic: false, cam: false, active: false },
      { name: "Lisa Anderson", role: "Audience", mic: false, cam: false, active: false },
      { name: "Lisa Anderson", role: "Audience", mic: false, cam: false, active: false },
      { name: "David Park", role: "Speaker", mic: false, cam: false, active: false },
      { name: "David Park", role: "Speaker", mic: false, cam: false, active: false },
    ],
    []
  );

  const chat = useMemo(
    () => [
      { name: "Sarah Johnson", time: "11:21 PM", text: "Great insights on the Q4 strategy!" },
      { name: "Michael Chen", time: "11:22 PM", text: "Can you share the slide deck after the session?" },
      { name: "Emma Williams", time: "11:23 PM", text: "What’s the timeline for the merger completion?" },
      { name: "Sarah Johnson", time: "11:24 PM", text: "We’re targeting Q2 2025 for completion." },
    ],
    []
  );

  const currentUserName = "You";

  const [qaItems, setQaItems] = useState(() => [
    {
      id: "q1",
      question: "Will there be any impact on current contracts after the merger?",
      askedBy: "Michael Chen",
      time: "11:26 PM",
      createdAt: 1,
      voters: ["Sarah Johnson", "Emma Williams"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
    {
      id: "q2",
      question: "What are the top risks we should watch closely?",
      askedBy: "Emma Williams",
      time: "11:28 PM",
      createdAt: 2,
      voters: ["Michael Chen"],
    },
  ]);

  const toggleQaVote = (id) => {
    setQaItems((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const voters = q.voters ?? [];
        const hasVoted = voters.includes(currentUserName);
        return {
          ...q,
          voters: hasVoted ? voters.filter((n) => n !== currentUserName) : [...voters, currentUserName],
        };
      })
    );
  };

  // ✅ Highest votes on top (then newest)
  const qaSorted = useMemo(() => {
    const arr = [...qaItems];
    arr.sort((a, b) => (b.voters?.length ?? 0) - (a.voters?.length ?? 0) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return arr;
  }, [qaItems]);

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
    const host = participants.filter((p) => p.role === "Host");
    const speakers = participants.filter((p) => p.role === "Speaker");
    const audience = participants.filter((p) => p.role === "Audience");
    return { host, speakers, audience };
  }, [participants]);

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
        <Tab icon={<PollIcon fontSize="small" />} iconPosition="start" label="Polls" sx={{ display: hostPerms.polls ? "flex" : "none" }} />
        <Tab icon={<GroupIcon fontSize="small" />} iconPosition="start" label="Members" />
      </Tabs>

      {/* Body */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {/* CHAT */}
        {hostPerms.chat && (
          <TabPanel value={tab} index={0}>
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
              <Stack spacing={1.25}>
                {chat.map((m, idx) => (
                  <Paper
                    key={idx}
                    variant="outlined"
                    sx={{
                      p: 1.25,
                      bgcolor: "rgba(255,255,255,0.03)",
                      borderColor: "rgba(255,255,255,0.08)",
                      borderRadius: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{m.name}</Typography>
                      <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{m.time}</Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.5, fontSize: 13, opacity: 0.9 }}>{m.text}</Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                placeholder="Type a message..."
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Send message">
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
        )}

        {/* Q&A */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
            <Stack spacing={1.5}>
              {qaSorted.map((q) => {
                const voters = q.voters ?? [];
                const votes = voters.length;
                const hasVoted = voters.includes(currentUserName);

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
                                  {voters.slice(0, 8).map((name) => (
                                    <Typography key={name} sx={{ fontSize: 12, opacity: 0.9 }}>
                                      {name}
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
                              onClick={() => toggleQaVote(q.id)}
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

                        <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{q.time}</Typography>
                      </Stack>
                    </Stack>

                    <Typography sx={{ mt: 0.75, fontSize: 13, opacity: 0.92 }}>{q.question}</Typography>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <Chip size="small" label={`Asked by ${q.askedBy}`} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              placeholder="Ask a question..."
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Send question">
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
        {hostPerms.polls && (
          <TabPanel value={tab} index={2}>
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2, ...scrollSx }}>
              <Stack spacing={1.5}>
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
                <Paper
                  variant="outlined"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.08)",
                    borderRadius: 2,
                  }}
                >
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
    </Box>
  );

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
            minHeight: 44,          // ✅ smaller header height
            px: 1.25,               // ✅ left/right padding
            py: 0.25,               // ✅ small vertical padding
          }}
        >
          <IconButton sx={headerIconBtnSx} aria-label="Back">
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
          <Switch checked={hostPerms.chat} onChange={setPerm("chat")} />
        </MenuItem>

        <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <PollIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Polls" secondary="Show/hide Polls tab" />
          <Switch checked={hostPerms.polls} onChange={setPerm("polls")} />
        </MenuItem>

        <MenuItem sx={{ gap: 1.25, py: 1.1 }}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <ScreenShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Screen share" secondary="Enable/disable screen sharing" />
          <Switch checked={hostPerms.screenShare} onChange={setPerm("screenShare")} />
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
            <Box sx={{ position: "absolute", top: 12, left: 12 }}>
              <Chip size="small" label={meeting.roomLabel} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
            </Box>

            {/* Main participant */}
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
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
              <StageMiniTile key={`${p.name}-${idx}`} p={p} tileW={stageTileW} tileH={stageTileH} />
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
                onClick={() => setMicOn((v) => !v)}
                sx={{
                  bgcolor: "rgba(255,255,255,0.06)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                }}
                aria-label="Toggle mic"
              >
                {micOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={camOn ? "Turn camera off" : "Turn camera on"}>
              <IconButton
                onClick={() => setCamOn((v) => !v)}
                sx={{
                  bgcolor: "rgba(255,255,255,0.06)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
                }}
                aria-label="Toggle camera"
              >
                {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={!hostPerms.screenShare ? "Screen share disabled by host" : "Share screen"}>
              <span>
                <IconButton
                  disabled={!hostPerms.screenShare}
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
      {/* Member Info Dialog */}
      <Dialog
        open={memberInfoOpen}
        onClose={closeMemberInfo}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgba(0,0,0,0.92)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 3,
            backdropFilter: "blur(14px)",

            // ✅ make all dialog text white
            color: "#fff",
            "& .MuiTypography-root": { color: "#fff" },
            "& .MuiChip-label": { color: "#fff" },
            "& .MuiChip-icon": { color: "rgba(255,255,255,0.9)" },
            "& .MuiIconButton-root": { color: "#fff" },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>User Info</DialogTitle>

        <DialogContent
          dividers
          sx={{
            borderColor: "rgba(255,255,255,0.10)",
            "&.MuiDialogContent-dividers": { borderColor: "rgba(255,255,255,0.10)" },
          }}
        >
          {selectedMember ? (
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.14)", width: 44, height: 44 }}>
                  {initialsFromName(selectedMember.name)}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
                    {selectedMember.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{selectedMember.role}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={selectedMember.role} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                <Chip
                  size="small"
                  label={selectedMember.mic ? "Mic: On" : "Mic: Off"}
                  icon={selectedMember.mic ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                  sx={{ bgcolor: "rgba(255,255,255,0.06)" }}
                />
                <Chip
                  size="small"
                  label={selectedMember.cam ? "Camera: On" : "Camera: Off"}
                  icon={selectedMember.cam ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                  sx={{ bgcolor: "rgba(255,255,255,0.06)" }}
                />
                <Chip
                  size="small"
                  label={selectedMember.active ? "Speaking" : "Not speaking"}
                  sx={{
                    bgcolor: selectedMember.active ? "rgba(20,184,177,0.22)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                />
              </Stack>
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 13, opacity: 0.75, py: 1 }}>No user selected.</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            onClick={closeMemberInfo}
            variant="contained"
            sx={{
              textTransform: "none",
              bgcolor: "rgba(20,184,177,0.40)",
              "&:hover": { bgcolor: "rgba(20,184,177,0.55)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
