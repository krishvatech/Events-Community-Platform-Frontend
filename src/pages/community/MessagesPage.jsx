// src/pages/community/MessagesPage.jsx
import * as React from "react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VideoFileOutlinedIcon from "@mui/icons-material/VideoFileOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

const BORDER = "#e2e8f0";
const PANEL_H = "calc(100vh - 180px)";

/** ---------- MOCK DATA (Groups, Members, Messages, Attachments) ---------- */
const MOCK_GROUPS = [
  {
    id: "g1",
    name: "Hatypo Studio",
    logo: "https://images.unsplash.com/photo-1545670723-196ed0954986?w=80&auto=format&fit=crop&q=80",
    last: "Mas Adit Typing……",
    time: "09:26 PM",
    unread: 2,
    pinned: true,
    members: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "g2",
    name: "Odama Studio",
    logo: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&auto=format&fit=crop&q=80",
    last: "Mas Figm…",
    time: "09:11 PM",
    unread: 1,
    pinned: true,
    members: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=80&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "g3",
    name: "Nolaaa",
    logo: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=80&auto=format&fit=crop&q=80",
    last: "PPPPPPPPPPPPPPPPPPP",
    time: "09:12 PM",
    unread: 11,
    members: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "g4",
    name: "OMOC Project",
    logo: "https://images.unsplash.com/photo-1546456073-92b9f0a8d413?w=80&auto=format&fit=crop&q=80",
    last: "Aldi Typing……",
    time: "09:11 PM",
    unread: 2,
    members: [
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "g5",
    name: "Momon",
    logo: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=80&auto=format&fit=crop&q=80",
    last: "Typing…",
    time: "09:26 PM",
    unread: 0,
    members: [],
  },
  {
    id: "g6",
    name: "Farhan",
    logo: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=80&auto=format&fit=crop&q=80",
    last: "Cek Figma coba han",
    time: "09:25 PM",
    unread: 0,
    members: [],
  },
];

const MOCK_MEMBERS = [
  {
    id: "u1",
    name: "Faza Dzikrullah",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=80",
    role: "Owner",
  },
  {
    id: "u2",
    name: "Adhitya P.",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80",
  },
  {
    id: "u3",
    name: "Raul Khaq",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&auto=format&fit=crop&q=80",
  },
  {
    id: "u4",
    name: "Vito Arvy",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&auto=format&fit=crop&q=80",
  },
  {
    id: "u5",
    name: "Nola Sofyan",
    avatar:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&auto=format&fit=crop&q=80",
  },
];

const MOCK_ATTACHMENTS = [
  { id: "a1", icon: <DescriptionOutlinedIcon fontSize="small" />, label: "Document", stat: "129 Files – 375 MB" },
  { id: "a2", icon: <ImageOutlinedIcon fontSize="small" />, label: "Photo", stat: "938 Files – 1.7 GB" },
  { id: "a3", icon: <VideoFileOutlinedIcon fontSize="small" />, label: "Videos", stat: "96 Files – 2.3 GB" },
  { id: "a4", icon: <FolderOpenOutlinedIcon fontSize="small" />, label: "Other Files", stat: "171 Files – 1.9 GB" },
];

const MOCK_MESSAGES = {
  g1: [
    {
      id: "m1",
      sender: "Raull",
      avatar:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&auto=format&fit=crop&q=80",
      time: "05:00 PM",
      text: "Guysss cek Figma dong, minta feedbacknyaa",
      mentions: ["Momon", "Fazaa", "Farhan"],
    },
    {
      id: "m2",
      sender: "You",
      avatar:
        "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=80&auto=format&fit=crop&q=80",
      time: "05:02 PM",
      mine: true,
      text: "Gokill Bangettt!",
    },
    {
      id: "m3",
      sender: "Farhan",
      avatar:
        "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=80&auto=format&fit=crop&q=80",
      time: "09:20 AM",
      attachment: { preview: "Visual Identity Guidelines" },
      text: "Ada yang typo nih",
    },
    {
      id: "m4",
      sender: "Momon",
      avatar:
        "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=80&auto=format&fit=crop&q=80",
      time: "09:21 AM",
      text: "Gas ULLLL!",
    },
    {
      id: "m5",
      sender: "Nolaaa",
      avatar:
        "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&auto=format&fit=crop&q=80",
      time: "09:25 AM",
      text: "Like dlu guysss hehe\nhttps://www.instagram.com/p/Cq2AzG…",
    },
  ],
  g2: [
    { id: "m1", sender: "Adit", time: "11:10 AM", text: "Design tokens pushed." },
  ],
};

/** ---------- UI SUB-COMPONENTS ---------- */

// Left list row (group)
function GroupRow({ group, active, onClick }) {
  return (
    <ListItem
      disableGutters
      onClick={onClick}
      sx={{
        px: 1,
        py: 1,
        borderRadius: 2,
        cursor: "pointer",
        ...(active
          ? { bgcolor: "#f6fffe", border: `1px solid ${BORDER}` }
          : { "&:hover": { bgcolor: "#fafafa" } }),
      }}
    >
      <ListItemAvatar sx={{ minWidth: 48 }}>
        <Badge
          variant={group.unread > 0 ? "dot" : "standard"}
          color="primary"
          overlap="circular"
        >
          <Avatar src={group.logo} alt={group.name} />
        </Badge>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {group.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {group.time}
            </Typography>
          </Stack>
        }
        secondary={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {group.last}
            </Typography>
            {group.unread > 0 && (
              <Chip
                size="small"
                label={String(group.unread)}
                color="primary"
                sx={{ height: 18, minHeight: 18 }}
              />
            )}
          </Stack>
        }
      />
    </ListItem>
  );
}

// Single message bubble (center)
function Bubble({ m }) {
  const mine = Boolean(m.mine);
  return (
    <Stack
      direction="row"
      justifyContent={mine ? "flex-end" : "flex-start"}
      alignItems="flex-end"
      sx={{ my: 1 }}
    >
      {!mine && <Avatar src={m.avatar} sx={{ width: 32, height: 32, mr: 1 }} />}
      <Box
        sx={{
          maxWidth: "78%",
          bgcolor: mine ? "#2dd4bf" : "background.paper",
          color: mine ? "white" : "inherit",
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: `1px solid ${mine ? "#14b8a6" : BORDER}`,
          boxShadow: mine ? "0 2px 6px rgba(20,184,166,0.25)" : "none",
        }}
      >
        {!mine && (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {m.sender}
          </Typography>
        )}
        {m.text && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {m.text}
          </Typography>
        )}
        {m.mentions?.length ? (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }}>
            {m.mentions.map((x) => (
              <Chip key={x} size="small" variant="outlined" label={`@${x}`} />
            ))}
          </Stack>
        ) : null}
        {m.attachment && (
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              mt: 0.75,
              borderRadius: 2,
              bgcolor: mine ? "rgba(255,255,255,0.15)" : "background.paper",
            }}
          >
            <Typography variant="caption">{m.attachment.preview}</Typography>
          </Paper>
        )}
        <Stack direction="row" justifyContent="flex-end">
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {m.time}
          </Typography>
        </Stack>
      </Box>
      {mine && <Avatar src={m.avatar} sx={{ width: 32, height: 32, ml: 1 }} />}
    </Stack>
  );
}

/** ---------- PAGE ---------- */
export default function MessagesPage() {
  // Left list state
  const [q, setQ] = React.useState("");
  const [groups, setGroups] = React.useState(MOCK_GROUPS);
  const [activeId, setActiveId] = React.useState(MOCK_GROUPS[0]?.id || null);

  // Center chat state
  const [messages, setMessages] = React.useState(
    () => MOCK_MESSAGES[activeId] || []
  );
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    setMessages(MOCK_MESSAGES[activeId] || []);
  }, [activeId]);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(t));
  }, [q, groups]);

  const pinned = filtered.filter((g) => g.pinned);
  const rest = filtered.filter((g) => !g.pinned);

  const active = groups.find((g) => g.id === activeId);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const m = {
      id: "local-" + Date.now(),
      sender: "You",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mine: true,
      text,
      avatar:
        "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=80&auto=format&fit=crop&q=80",
    };
    setMessages((curr) => [...curr, m]);
    setDraft("");

    // update left row preview
    setGroups((curr) =>
      curr.map((g) =>
        g.id === activeId ? { ...g, last: text, time: m.time, unread: 0 } : g
      )
    );

    // scroll to bottom
    requestAnimationFrame(() => {
      const el = document.getElementById("chat-scroll");
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  // Hide the global footer only while this page is mounted
  React.useEffect(() => {
    // Try common footer selectors used across apps
    const selectors = ["footer", "#footer", "#site-footer", ".site-footer", ".app-footer", "#app-footer"];
    const els = selectors.flatMap((s) => Array.from(document.querySelectorAll(s)));

    // Remember previous display values so we can restore on leave
    const prev = new Map();
    els.forEach((el) => {
      prev.set(el, el.style.display);
      el.style.display = "none";
    });

    // Cleanup: restore footer when navigating away
    return () => {
      els.forEach((el) => {
        el.style.display = prev.get(el) || "";
      });
    };
  }, []);


  return (
    <Grid container spacing={2}>
      {/* LEFT: Conversation list */}
      <Grid item xs={12} md={3}>
        <Paper sx={{
          p: 1.5,
          border: `1px solid ${BORDER}`,
          borderRadius: 3,
          height: PANEL_H,                 // ← fixed height
          display: "flex",
          flexDirection: "column",
        }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Messages
            </Typography>
            <IconButton size="small">
              <AttachFileOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <TextField
            size="small"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* Pinned */}
          {!!pinned.length && (
            <>
              <Typography variant="caption" sx={{ mt: 1.5, mb: 0.5, display: "block", color: "text.secondary" }}>
                Pinned Message
              </Typography>
              <List dense>
                {pinned.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    active={g.id === activeId}
                    onClick={() => setActiveId(g.id)}
                  />
                ))}
              </List>
            </>
          )}

          {/* All */}
          <Typography variant="caption" sx={{ mt: 1, mb: 0.5, display: "block", color: "text.secondary" }}>
            All Message
          </Typography>
          <List dense sx={{ flex: 1, overflowY: "auto" }}>
            {rest.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                active={g.id === activeId}
                onClick={() => setActiveId(g.id)}
              />
            ))}
          </List>

          <Button fullWidth variant="outlined" sx={{ mt: 1 }}>
            New Chat
          </Button>
        </Paper>
      </Grid>

      {/* CENTER: Chat */}
      <Grid item xs={12} md={6}>
        <Box sx={{ height: PANEL_H, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Top bar like the first image */}
          <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar src={active?.logo} sx={{ width: 40, height: 40 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {active?.name || "Group Name"}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1.25}>
                <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 12 } }}>
                  {(active?.members || []).map((m, i) => (
                    <Avatar key={i} src={m} />
                  ))}
                </AvatarGroup>
                <IconButton size="small"><PhoneOutlinedIcon fontSize="small" /></IconButton>
                <IconButton size="small"><VideocamOutlinedIcon fontSize="small" /></IconButton>
                <IconButton size="small"><MoreVertOutlinedIcon fontSize="small" /></IconButton>
              </Stack>
            </Stack>
          </Paper>

          {/* Chat thread */}
          <Paper
            sx={{
              p: 2,
              border: `1px solid ${BORDER}`,
              borderRadius: 3,
              flex: 1,          // <-- take remaining height
              minHeight: 0,     // <-- allow inner scroll area to size correctly
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Day divider */}
            <Stack alignItems="center" sx={{ mb: 1 }}>
              <Chip size="small" variant="outlined" label="Today" />
            </Stack>

            <Box id="chat-scroll" sx={{ flex: 1, overflowY: "auto" }}>
              {messages.map((m) => (
                <Bubble key={m.id} m={m} />
              ))}
            </Box>

            <Divider sx={{ my: 1.25 }} />

            <Stack direction="row" spacing={1}>
              <Tooltip title="Attach file">
                <IconButton size="small">
                  <AttachFileOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <TextField
                size="small"
                placeholder="Type a message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button variant="contained" size="small" endIcon={<SendIcon />} onClick={handleSend}>
                Send
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Grid>

      {/* RIGHT: Members + Attachments */}
      <Grid item xs={12} md={3}>
        <Paper sx={{
          p: 1.5,
          border: `1px solid ${BORDER}`,
          borderRadius: 3,
          height: PANEL_H,            // ← same height as chat
          display: "flex",
          flexDirection: "column",
        }}
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Group Name
            </Typography>

            {/* Members accordion */}
            <Accordion disableGutters defaultExpanded sx={{ border: "none", boxShadow: "none" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Members
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<PersonAddAltOutlinedIcon />}
                  sx={{ mb: 1, textTransform: "none" }}
                >
                  Add Member
                </Button>
                <Stack spacing={1}>
                  {MOCK_MEMBERS.map((p) => (
                    <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                      <Avatar src={p.avatar} sx={{ width: 28, height: 28 }} />
                      <Typography variant="body2">{p.name}</Typography>
                      {p.role && (
                        <Chip size="small" variant="outlined" label={p.role} sx={{ ml: "auto" }} />
                      )}
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Attachments accordion */}
            <Accordion disableGutters defaultExpanded sx={{ border: "none", boxShadow: "none" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Attachments
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  {MOCK_ATTACHMENTS.map((a) => (
                    <Stack key={a.id} direction="row" spacing={1} alignItems="center">
                      {a.icon}
                      <Typography variant="body2">{a.label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                        {a.stat}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
