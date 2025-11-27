// src/pages/AdminMessagesPage.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// ---- API helpers ----
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(
  /\/$/,
  ""
);
const BORDER = "#e2e8f0";

const getToken = () =>
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("jwt") ||
  localStorage.getItem("token") ||
  "";
const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const MESSAGING_BASE = `${API_ROOT}/messaging`;

// central endpoints (aligned with MessagesPage)
const ENDPOINTS = {
  conversations: () => `${MESSAGING_BASE}/conversations/`,
  conversationMessages: (cid) => `${MESSAGING_BASE}/conversations/${cid}/messages/`,
  ensureGroup: () => `${MESSAGING_BASE}/conversations/ensure-group/`,
  convMarkAllRead: (cid) => `${MESSAGING_BASE}/conversations/${cid}/mark-all-read/`,
  messageRead: (mid) => `${MESSAGING_BASE}/messages/${mid}/read/`,
  toggleConversationPin: (cid) => `${MESSAGING_BASE}/conversations/${cid}/toggle-pin/`,
  pinnedMessages: (cid) => `${MESSAGING_BASE}/conversations/${cid}/pinned-messages/`,
  pinMessage: (cid) => `${MESSAGING_BASE}/conversations/${cid}/pin-message/`,
  unpinMessage: (cid) => `${MESSAGING_BASE}/conversations/${cid}/unpin-message/`,
};


const resizeImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) => {
  return new Promise((resolve) => {
    // Not an image → return as-is
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // keep aspect ratio but clamp to maxWidth / maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const newFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          "image/jpeg",
          quality
        );
      };
    };
    reader.onerror = () => resolve(file);
  });
};

const emitUnreadMessages = (count) => {
  try {
    window.dispatchEvent(
      new CustomEvent("messages:unread", { detail: { count } })
    );
    localStorage.setItem("unread_messages", String(count));
  } catch {
    // ignore
  }
};

const getLastMessageObj = (t) => {
  const lm = t?.last_message ?? t?.latest_message ?? t?.last ?? null;
  if (!lm) return null;
  return typeof lm === "string" ? { body: lm } : lm;
};

const getLastTimeISO = (t) => {
  const lm = getLastMessageObj(t);
  return (
    t?._last_ts ||
    t?.local_last_ts ||
    t?.last_message_created_at ||
    t?.last_message_at ||
    t?.last_message_time ||
    t?.last_message_timestamp ||
    lm?.created_at ||
    lm?.timestamp ||
    lm?.sent_at ||
    t?.updated_at ||
    t?.created_at ||
    null
  );
};

const formatHHMM = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

const formatLastSeenLabel = (iso) => {
  if (!iso) return "";
  const dt = new Date(iso);
  const now = new Date();

  const timeStr = dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const todayKey = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();
  const dateKey = dt.toDateString();

  if (dateKey === todayKey) {
    return `Last seen today at ${timeStr}`;
  }
  if (dateKey === yesterdayKey) {
    return `Last seen yesterday at ${timeStr}`;
  }

  const dateStr = dt.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
  return `Last seen ${dateStr} at ${timeStr}`;
};


const getLastPreviewText = (t) => {
  const lm = getLastMessageObj(t);
  return (
    t?.last_message_text ||
    t?.last_text ||
    (lm?.body || lm?.text || lm?.message || "") ||
    ""
  );
};

const shortPreview = (text, max = 25) => {
  if (!text) return "";
  const cleaned = String(text).trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max) + "…";   // add ...
};


const threadTitle = (t) =>
  t?.group?.name ||
  t?.display_title ||
  (t?.chat_type === "dm" ? "Direct message" : "Conversation");

const threadAvatar = (t) =>
  t?.context_logo || t?.context_cover || t?.group_cover || t?.event_cover || "";

// sort by time inside a messages array
const byTimeAsc = (a, b) => {
  const ta = Date.parse(a?.created_at || a?.createdAt || a?.timestamp || 0);
  const tb = Date.parse(b?.created_at || b?.createdAt || b?.timestamp || 0);
  if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
  return (a?.id ?? 0) - (b?.id ?? 0);
};

const normalizeMessages = (data) => {
  if (Array.isArray(data)) return [...data].sort(byTimeAsc);
  const rows = Array.isArray(data?.results) ? data.results : [];
  return [...rows].sort(byTimeAsc);
};

const getMessageAttachments = (msg) => {
  const arr = Array.isArray(msg?.attachments) ? msg.attachments : [];
  return arr;
};

const getAttachmentUrl = (att) =>
  att.url ||
  att.file ||
  att.file_url ||
  att.image ||
  att.image_url ||
  att.download_url ||
  "";

const getAttachmentName = (att) =>
  att.name ||
  att.filename ||
  att.file_name ||
  att.original_name ||
  "Attachment";

const isImageAttachment = (att) => {
  const contentType = att.content_type || att.mime_type || "";
  const name = getAttachmentName(att);
  const lowerName = String(name).toLowerCase();

  if (contentType.startsWith("image/")) return true;
  if (lowerName.match(/\.(png|jpe?g|gif|webp|bmp|heic|heif)$/)) return true;
  return false;
};

function SharePreview({ attachment, mine }) {
  if (!attachment) return null;

  // Try to extract the FeedItem / post id from different possible shapes
  const getSharedFeedItemId = (a) => {
    if (!a) return null;
    if (a.feed_item_id) return a.feed_item_id;
    if (a.feed_item) return a.feed_item;
    if (a.target_object_id) return a.target_object_id;
    if (a.object_id) return a.object_id;
    if (a.target && (a.target.object_id || a.target.id)) {
      return a.target.object_id || a.target.id;
    }
    if (a.meta && (a.meta.feed_item_id || a.meta.object_id)) {
      return a.meta.feed_item_id || a.meta.object_id;
    }
    return null;
  };

  const feedItemId = getSharedFeedItemId(attachment);

  const handleClick = () => {
    const basePath = "/community?view=live";

    if (!feedItemId) {
      // no specific post id → just open live feed
      window.location.href = basePath;
      return;
    }

    // store target post id so LiveFeedPage can focus/highlight it
    try {
      window.localStorage.setItem("ecp_livefeed_focus_post", String(feedItemId));
    } catch (e) {
      // ignore storage errors
    }

    // append post id as query param: /community?view=live&post=123
    const url = `${basePath}&post=${encodeURIComponent(feedItemId)}`;
    window.location.href = url;
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        mt: 0.75,
        borderRadius: 1.5,
        border: `1px solid ${BORDER}`,
        bgcolor: mine ? "rgba(255,255,255,0.9)" : "#f8fafc",
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": {
          bgcolor: mine ? "rgba(255,255,255,1)" : "#eef2ff",
        },
      }}
    >
      <Box sx={{ p: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            opacity: 0.8,
            display: "block",
            mb: 0.25,
          }}
        >
          Post
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          View shared post in live feed
        </Typography>
      </Box>
    </Box>
  );
}

function displayName(user) {
  if (!user) return "";
  const full =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.display_name ||
    user.username ||
    user.email;
  return full || "Staff";
}

/**
 * New-chat dialog for admin:
 * - Tab 0: Staff (from props.staff)
 * - Tab 1: Groups (joined-groups API)
 */
function AdminNewChatDialog({
  open,
  staff,
  existingGroupIds = [],
  existingGroupNames = [],
  onClose,
  onStartStaffChat,
  onStartGroupChat,
}) {
  const [tab, setTab] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [groups, setGroups] = React.useState([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);

    // Load "groups you joined" when dialog opens on Groups tab
  // 👉 only fetch once per open; filtering is done separately
  React.useEffect(() => {
    if (!open || tab !== 1) return;
    let cancelled = false;

    (async () => {
      setLoadingGroups(true);
      try {
        const res = await fetch(`${API_ROOT}/groups/joined-groups/`, {
          headers: { Accept: "application/json", ...authHeader() },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load groups");
        }

        const raw = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];

        const mapped = raw
          .map((g) => ({
            id: g.id,
            name: g.name || g.title || "Group",
            avatar:
              g.logo_url ||
              g.logo ||
              g.avatar ||
              g.image ||
              g.cover_image ||
              "",
          }))
          .filter((g) => g.id);

        if (!cancelled) setGroups(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tab]);        // 🔴 remove existingGroupIds from deps

  // Groups that should appear in "New chat" → Groups tab
  // hide groups that already have a conversation with messages
  const groupList = React.useMemo(() => {
    if (!Array.isArray(groups)) return [];

    const idSet = new Set(existingGroupIds || []);
    const nameSet = new Set(
      (existingGroupNames || [])
        .map((n) => (n || "").trim().toLowerCase())
        .filter(Boolean)
    );

    return groups.filter((g) => {
      const id = g.id;
      const name = (g.name || "").trim().toLowerCase();
      if (id && idSet.has(id)) return false;
      if (name && nameSet.has(name)) return false;
      return true;
    });
  }, [groups, existingGroupIds, existingGroupNames]);

  const list = tab === 0 ? staff : groupList;
  const filtered = React.useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return list;
    return list.filter((item) => {
      const name = item.name || displayName(item);
      return name.toLowerCase().includes(t);
    });
  }, [query, list]);

  const placeholder = tab === 0 ? "Search staff…" : "Search groups…";
  const secondary = tab === 0 ? "Staff chat" : "Group chat";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Start a new chat</DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={(_, val) => setTab(val)}
          sx={{ mb: 1 }}
          variant="fullWidth"
        >
          <Tab label="Staff" />
          <Tab label="Groups" />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {tab === 1 && loadingGroups ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <List dense>
            {filtered.map((item) => {
              const name = item.name || displayName(item);
              const avatarSrc =
                item.avatar || item.avatar_url || item.profile_image || "";
              return (
                <ListItemButton
                  key={`${tab}-${item.id}`}
                  onClick={() => {
                    if (tab === 0) {
                      onStartStaffChat?.(item);
                    } else {
                      onStartGroupChat?.(item);
                    }
                    onClose?.();
                  }}
                  sx={{
                    px: 1,
                    py: 1,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "#fafafa" },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar src={avatarSrc}>
                      {name.slice(0, 1).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {secondary}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
            {filtered.length === 0 && (
              <Stack alignItems="center" sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No results
                </Typography>
              </Stack>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminMessagesPage() {
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [users, setUsers] = React.useState([]); // staff list for New Chat
  const [q, setQ] = React.useState("");

  // LEFT: conversations list (DMs + groups)
  const [threads, setThreads] = React.useState([]);
  const [loadingThreads, setLoadingThreads] = React.useState(true);

  const [conversationId, setConversationId] = React.useState(null);
  const [selectedUserId, setSelectedUserId] = React.useState(null);

  const [messages, setMessages] = React.useState([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [pinned, setPinned] = React.useState([]);
  const [pinsExpanded, setPinsExpanded] = React.useState(false);

  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [menuMessage, setMenuMessage] = React.useState(null);
  const messageMenuOpen = Boolean(menuAnchorEl);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [draftAttachments, setDraftAttachments] = React.useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);
  const [previewUrls, setPreviewUrls] = React.useState([]);
  const [error, setError] = React.useState("");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [newChatOpen, setNewChatOpen] = React.useState(false);

  // { type: "staff" | "group", id, name, avatar? }
  const [activeTarget, setActiveTarget] = React.useState(null);

  const chatScrollRef = React.useRef(null);
  const [isUserAtBottom, setIsUserAtBottom] = React.useState(true);

  // Conversation context menu (pin / unpin)
  const [convMenuAnchor, setConvMenuAnchor] = React.useState(null);
  const [convMenuTarget, setConvMenuTarget] = React.useState(null);

  // Attachment menu + hidden inputs
  const [attachMenuAnchor, setAttachMenuAnchor] = React.useState(null);
  const isAttachMenuOpen = Boolean(attachMenuAnchor);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  // Camera modal
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Build local blob URLs for draft attachment preview
  React.useEffect(() => {
    if (!draftAttachments || draftAttachments.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const urls = draftAttachments.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    // cleanup old blob URLs when attachments change / unmount
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [draftAttachments]);

  const me = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // load staff (for New Chat)
  const fetchUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${MESSAGING_BASE}/conversations/staff-list/`, {
        headers: { Accept: "application/json", ...authHeader() },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => []);
      let rows = Array.isArray(data) ? data : [];

      // include both staff + owners
      rows = rows.filter((u) => u.is_staff || u.is_superuser);

      // don't show yourself
      const meLocal = JSON.parse(localStorage.getItem("user") || "{}");
      if (meLocal?.id) {
        rows = rows.filter((u) => u.id !== meLocal.id);
      }

      setUsers(rows);
    } catch (e) {
      console.error("Failed to load staff users", e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // load conversations list (all types) – supports background polling
  const loadConversations = React.useCallback(
    async (opts = {}) => {
      const { background = false } = opts;

      if (!background) {
        setLoadingThreads(true);
      }

      try {
        const res = await fetch(ENDPOINTS.conversations(), {
          headers: { Accept: "application/json", ...authHeader() },
        });

        const raw = await res.json().catch(() => ({}));
        const data = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.results)
            ? raw.results
            : [];

        setThreads((prev) => {
          // keep previous timestamps so list doesn’t “jump backwards”
          const byId = new Map(prev.map((p) => [String(p.id), p]));

          const normalized = data
            .map((t) => {
              const serverTs = getLastTimeISO(t);
              const prevTs = byId.get(String(t.id))?._last_ts;

              const best =
                new Date(serverTs || 0).getTime() >=
                  new Date(prevTs || 0).getTime()
                  ? serverTs
                  : prevTs;

              return {
                ...t,
                _last_ts: best || serverTs || t.updated_at || t.created_at,
              };
            })
            .sort((a, b) => {
              const pinA = !!a.is_pinned;
              const pinB = !!b.is_pinned;
              if (pinA !== pinB) return pinA ? -1 : 1; // pinned first
              return (
                new Date(b._last_ts || 0).getTime() -
                new Date(a._last_ts || 0).getTime()
              );
            });
          // broadcast unread count (based on sorted list)
          const totalUnread = normalized.reduce(
            (sum, th) => sum + (th?.unread_count || 0),
            0
          );
          emitUnreadMessages(totalUnread);

          return normalized;
        });
      } catch (e) {
        console.error("Failed to load conversations", e);
        setThreads([]);
        emitUnreadMessages(0);
      } finally {
        if (!background) {
          setLoadingThreads(false);
        }
      }
    },
    []
  );

  // Start / stop camera when the modal opens/closes
  React.useEffect(() => {
    if (!cameraOpen) return;

    let stream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to open camera", err);
        setCameraOpen(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraOpen]);

  React.useEffect(() => {
    fetchUsers(); // first load

    // 🔁 refresh staff list every 15s to update online status
    const iv = setInterval(fetchUsers, 5000);
    return () => clearInterval(iv);
  }, [fetchUsers]);

  // initial + background polling for conversations
  React.useEffect(() => {
    // first load – show spinner
    loadConversations();

    // next loads – silent background refresh (no loading spinner)
    const iv = setInterval(() => {
      loadConversations({ background: true });
    }, 1000);

    return () => clearInterval(iv);
  }, [loadConversations]);


  // only show threads that actually have messages (after "hi")
  const visibleThreads = React.useMemo(
    () =>
      threads.filter((t) => {
        const txt = (getLastPreviewText(t) || "").trim();
        return txt.length > 0;
      }),
    [threads]
  );

  

  // Staff for "New chat" – hide staff who already have a DM with real messages
  const staffForNewChat = React.useMemo(() => {
    if (!users || users.length === 0) return [];

    const dmTitles = new Set(
      visibleThreads
        .filter((t) => {
          const isGroup =
            t.chat_type === "group" || Boolean(t.group || t.context_group);
          return !isGroup; // only direct messages
        })
        .map((t) => (threadTitle(t) || "").trim().toLowerCase())
        .filter(Boolean)
    );

    return users.filter((u) => {
      const name = (displayName(u) || "").trim().toLowerCase();
      if (!name) return false;
      return !dmTitles.has(name);
    });
  }, [users, visibleThreads]);

  // Group IDs that already have conversations with messages
  const existingGroupIds = React.useMemo(() => {
    const ids = new Set();
    visibleThreads.forEach((t) => {
      const isGroup =
        t.chat_type === "group" || Boolean(t.group || t.context_group);
      if (!isGroup) return;

      const g = t.group || t.context_group || {};
      const id =
        g.id ||
        t.group_id ||
        t.context_group_id ||
        t.context_id ||
        null;

      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [visibleThreads]);

  // Names of groups that already have a conversation with messages
  const existingGroupNames = React.useMemo(() => {
    const names = new Set();
    visibleThreads.forEach((t) => {
      const isGroup =
        t.chat_type === "group" ||
        Boolean(t.group || t.context_group) ||
        (t.context_type &&
          String(t.context_type).toLowerCase().includes("group"));
      if (!isGroup) return;

      const title = (threadTitle(t) || "").trim().toLowerCase();
      if (title) names.add(title);
    });
    return Array.from(names);
  }, [visibleThreads]);


  const filteredThreads = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return visibleThreads;
    return visibleThreads.filter((t) =>
      (threadTitle(t) || "").toLowerCase().includes(term)
    );
  }, [q, visibleThreads]);

  const activeThread = React.useMemo(
    () => threads.find((t) => t.id === conversationId) || null,
    [threads, conversationId]
  );

  const activeUser = React.useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const isGroupChat =
    activeTarget?.type === "group" ||
    activeThread?.chat_type === "group" ||
    Boolean(activeThread?.group || activeThread?.context_group);

  const hasActiveChat = Boolean(conversationId);

  const headerName =
    activeTarget?.name ||
    (activeUser ? displayName(activeUser) : "") ||
    (activeThread ? threadTitle(activeThread) : "");

  // 🔎 pull presence info from the staff object
  const presenceProfile =
    (activeUser && activeUser.profile) ||
    (activeTarget && activeTarget.profile) ||
    {};

  const activeLastSeenISO = presenceProfile.last_activity_at || null;

  // ✅ use backend flag only
  const activeIsOnline = !!presenceProfile.is_online;

  const headerSubtitle = isGroupChat
    ? "Group chat"
    : activeIsOnline
      ? "Online"
      : activeLastSeenISO
        ? formatLastSeenLabel(activeLastSeenISO)
        : "Staff chat";
  const headerAvatarSrc = isGroupChat
    ? activeTarget?.avatar ||
    (activeThread ? threadAvatar(activeThread) : "")
    : activeTarget?.avatar ||
    activeUser?.avatar_url ||
    activeUser?.profile_image ||
    activeUser?.avatar ||
    activeUser?.image ||
    activeUser?.image_url ||
    (activeThread ? threadAvatar(activeThread) : "");


  const showOnlineDot = Boolean(!isGroupChat && conversationId && activeIsOnline);

  // mark-all-read for a conversation
  const markConversationAllRead = React.useCallback(async (cid) => {
    if (!cid) return;
    try {
      const res = await fetch(ENDPOINTS.convMarkAllRead(cid), {
        method: "POST",
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (!res.ok) return;
      setThreads((cur) => {
        const next = cur.map((t) =>
          t.id === cid ? { ...t, unread_count: 0 } : t
        );
        const totalUnread = next.reduce(
          (sum, th) => sum + (th?.unread_count || 0),
          0
        );
        emitUnreadMessages(totalUnread);
        return next;
      });
    } catch (e) {
      console.error("Failed to mark conversation read", e);
    }
  }, []);

  // open / create conversation with staff
  const openConversation = async (user) => {
    if (!user) return;
    setSelectedUserId(user.id);
    setActiveTarget({
      type: "staff",
      id: user.id,
      name: displayName(user),
      avatar: user.avatar_url || user.profile_image || "",
      profile: user.profile || null,
    });
    setConversationId(null);
    setMessages([]);
    setError("");

    try {
      setLoadingMessages(true);
      const res = await fetch(`${MESSAGING_BASE}/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ recipient_id: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to open conversation");
      }
      const id = data?.id || data?.conversation?.id || data?.pk;
      if (!id) {
        throw new Error("No conversation id returned from server");
      }
      setConversationId(id);
      // refresh list in case this DM already has history
      loadConversations();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to open conversation");
    } finally {
      setLoadingMessages(false);
    }
  };

  // open / create conversation with a group (joined group)
  const openGroupConversation = async (group) => {
    if (!group) return;
    setSelectedUserId(null);
    setActiveTarget({
      type: "group",
      id: group.id,
      name: group.name,
      avatar: group.avatar || "",
    });
    setConversationId(null);
    setMessages([]);
    setError("");

    try {
      setLoadingMessages(true);
      const res = await fetch(ENDPOINTS.ensureGroup(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ group: group.id, title: group.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to open group chat");
      }
      const id = data?.id || data?.conversation?.id || data?.pk;
      if (!id) {
        throw new Error("No conversation id returned from server");
      }
      setConversationId(id);
      loadConversations();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to open group chat");
    } finally {
      setLoadingMessages(false);
    }
  };

  // select an existing conversation from the left list
  const selectThread = React.useCallback(
    (thread) => {
      if (!thread) return;
      setConversationId(thread.id);
      setMessages([]);
      setError("");
      setIsUserAtBottom(true);

      const isGroup =
        thread.chat_type === "group" ||
        Boolean(thread.group || thread.context_group);

      if (isGroup) {
        const g = thread.group || thread.context_group || {};
        setActiveTarget({
          type: "group",
          id:
            g.id ||
            thread.group_id ||
            thread.context_group_id ||
            thread.context_id ||
            null,
          name: g.name || g.title || threadTitle(thread) || "Group chat",
          avatar: threadAvatar(thread),
        });
        setSelectedUserId(null);
      } else {
        const title = threadTitle(thread);
        const match =
          users.find(
            (u) => displayName(u).toLowerCase() === title.toLowerCase()
          ) || null;

        if (match) {
          setSelectedUserId(match.id);
          setActiveTarget({
            type: "staff",
            id: match.id,
            name: displayName(match),
            avatar: match.avatar_url || match.profile_image || "",
            profile: match.profile || null,
          });
        } else {
          setSelectedUserId(null);
          setActiveTarget({
            type: "staff",
            id: null,
            name: title,
            avatar: threadAvatar(thread),
            profile: null,
          });
        }
      }
    },
    [users]
  );

  // open context menu on right-click of conversation row
  const handleConvContextMenu = (event, thread) => {
    event.preventDefault();
    setConvMenuTarget(thread);
    setConvMenuAnchor(event.currentTarget);
  };

  const handleCloseConvMenu = () => {
    setConvMenuAnchor(null);
    setConvMenuTarget(null);
  };

  const handleTogglePinConversation = async () => {
    if (!convMenuTarget) return;
    const targetId = convMenuTarget.id;
    handleCloseConvMenu();

    try {
      const res = await fetch(ENDPOINTS.toggleConversationPin(targetId), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });

      if (!res.ok) {
        console.error("Failed to toggle pin", res.status);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const isNowPinned = !!data.is_pinned;

      setThreads((prev) => {
        const updated = prev.map((t) =>
          t.id === targetId ? { ...t, is_pinned: isNowPinned } : t
        );

        // same sort logic as above: pinned first, then latest
        return updated.sort((a, b) => {
          const pinA = !!a.is_pinned;
          const pinB = !!b.is_pinned;
          if (pinA !== pinB) return pinA ? -1 : 1;
          return (
            new Date(b._last_ts || 0).getTime() -
            new Date(a._last_ts || 0).getTime()
          );
        });
      });
    } catch (err) {
      console.error("toggle pin failed", err);
    }
  };
  // poll messages for active conversation
  React.useEffect(() => {
    if (!conversationId) return;
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(
          ENDPOINTS.conversationMessages(conversationId),
          {
            headers: { Accept: "application/json", ...authHeader() },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Failed to load messages");
        if (cancelled) return;
        setMessages(normalizeMessages(data));
        setError("");
        await markConversationAllRead(conversationId);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message || "Unable to load messages");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    setLoadingMessages(true);
    tick();
    timer = setInterval(tick, 2500);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [conversationId, markConversationAllRead]);

  React.useEffect(() => {
    if (!conversationId) {
      setPinned([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(ENDPOINTS.pinnedMessages(conversationId), {
          headers: { Accept: "application/json", ...authHeader() },
        });

        if (!res.ok) {
          if (!cancelled) setPinned([]);
          return;
        }

        const json = await res.json();
        const arr = Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json)
          ? json
          : [];
        if (!cancelled) setPinned(arr);
      } catch (err) {
        console.error("Failed to fetch pinned messages", err);
        if (!cancelled) setPinned([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const isMessagePinned = React.useCallback(
    (mid) => {
      if (!mid) return false;
      return pinned.some((p) => {
        const id =
          p?.message_id ??
          p?.messageId ??
          p?.message_pk ??
          p?.msg_id ??
          (p?.message && (p.message.id || p.message.pk));
        return id && String(id) === String(mid);
      });
    },
    [pinned]
  );

  const pinnedMessages = React.useMemo(() => {
    if (!Array.isArray(pinned) || pinned.length === 0) return [];

    const byId = new Map(messages.map((m) => [String(m.id), m]));
    const out = [];

    for (const p of pinned) {
      const mid =
        p?.message_id ??
        p?.messageId ??
        p?.message_pk ??
        p?.msg_id ??
        (p?.message && (p.message.id || p.message.pk));
      if (!mid) continue;

      const existing = byId.get(String(mid));
      if (existing) {
        out.push(existing);
      }
      // ❗ if message is not in messages[], we treat it as deleted → no pin shown
    }

    return out;
  }, [pinned, messages]);

    const isMyMessage = (msg) => {
      if (!msg || !me) return false;
      const senderId =
        msg.sender_id ??
        (typeof msg.sender === "object" ? msg.sender.id : msg.sender) ??
        msg.user_id ??
        (typeof msg.user === "object" ? msg.user.id : msg.user);

      return String(senderId) === String(me.id);
    };

    const handleOpenMessageMenu = (event, message) => {
    if (!message) return;
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    setMenuAnchorEl(event.currentTarget);
    setMenuMessage(message);
  };

  const handleCloseMessageMenu = () => {
    setMenuAnchorEl(null);
    setMenuMessage(null);
  };

  const handlePinOrUnpin = async () => {
    if (!menuMessage || !conversationId) {
      handleCloseMessageMenu();
      return;
    }

    const currentlyPinned = isMessagePinned(menuMessage.id);

    const url = currentlyPinned
      ? ENDPOINTS.unpinMessage(conversationId)
      : ENDPOINTS.pinMessage(conversationId);

    // For admin page we can just use global scope
    const pinScope = "global";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          message_id: menuMessage.id,
          scope: pinScope,
        }),
      });

      if (!res.ok) {
        console.error("Pin/unpin failed", res.status);
      } else {
        // reload pinned list
        try {
          const r = await fetch(ENDPOINTS.pinnedMessages(conversationId), {
            headers: { Accept: "application/json", ...authHeader() },
          });
          if (r.ok) {
            const json = await r.json();
            const arr = Array.isArray(json?.results)
              ? json.results
              : Array.isArray(json)
              ? json
              : [];
            setPinned(arr);
          }
        } catch (e) {
          console.error("Failed to refresh pinned after toggle", e);
        }
      }
    } catch (err) {
      console.error("Pin/unpin error", err);
    } finally {
      handleCloseMessageMenu();
    }
  };

  const handleDeleteMessage = async () => {
    if (!menuMessage || !conversationId) {
      handleCloseMessageMenu();
      return;
    }

    try {
      const res = await fetch(
        `${MESSAGING_BASE}/conversations/${conversationId}/messages/${menuMessage.id}/`,
        {
          method: "DELETE",
          headers: { ...authHeader() },
        }
      );

      if (!res.ok && res.status !== 204) {
        console.error("Delete message failed", res.status);
      } else {
        // 1) Remove from main messages list
        setMessages((curr) => curr.filter((m) => m.id !== menuMessage.id));

        // 2) Also remove from pinned list if it was pinned
        setPinned((prev) => {
          if (!Array.isArray(prev)) return prev;

          return prev.filter((p) => {
            const mid =
              p?.message_id ??
              p?.messageId ??
              p?.message_pk ??
              p?.msg_id ??
              (p?.message && (p.message.id || p.message.pk)) ??
              p?.id;

            if (!mid) return true;
            return String(mid) !== String(menuMessage.id);
          });
        });
      }
    } catch (err) {
      console.error("Delete message error", err);
    } finally {
      handleCloseMessageMenu();
    }
  };



  const handleChatScroll = React.useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const threshold = 48; // px from bottom
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

    setIsUserAtBottom(atBottom);
  }, []);


  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    // only stick to bottom if user is already near bottom
    if (!isUserAtBottom) return;

    el.scrollTop = el.scrollHeight;
  }, [messages, loadingMessages, conversationId, isUserAtBottom]);

  const handleAttachClick = (event) => {
    setAttachMenuAnchor(event.currentTarget);
  };

  const handleAttachClose = () => {
    setAttachMenuAnchor(null);
  };

  const handleTriggerFileUpload = () => {
    handleAttachClose();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTriggerCamera = () => {
    handleAttachClose();
    setCameraOpen(true);
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);

      const processed = await Promise.all(
        fileArray.map((f) => resizeImage(f))
      );

      setDraftAttachments((prev) => [...prev, ...processed]);
      setActivePreviewIndex(0);
    }
    event.target.value = "";
  };

  const handleClearAttachments = () => {
    setDraftAttachments([]);
    setActivePreviewIndex(0);
    setText(""); // clear caption as well
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;

    const maxWidth = 1280;
    const maxHeight = 1280;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const resized = await resizeImage(file);
        setDraftAttachments((prev) => [...prev, resized]);
        setActivePreviewIndex(0);
        setCameraOpen(false);
      },
      "image/jpeg",
      0.8
    );
  };

  const handleCloseCamera = () => {
    setCameraOpen(false);
  };

  const handleSend = async () => {
    const body = text.trim();
    const hasAttachments = draftAttachments.length > 0;
    if ((!body && !hasAttachments) || sending || !conversationId) return;

    const nowIso = new Date().toISOString();

    try {
      setSending(true);
      setIsUserAtBottom(true);  // we want to follow our own new message

      const formData = new FormData();
        formData.append("body", body);
        draftAttachments.forEach((file) => {
          formData.append("attachments", file);
        });

        const res = await fetch(ENDPOINTS.conversationMessages(conversationId), {
          method: "POST",
          headers: { ...authHeader() }, // let browser set multipart boundary
          body: formData,
        });
      const msg = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(msg?.detail || "Failed to send message");

      // update messages list
      setMessages((prev) => {
        if (msg?.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].sort(byTimeAsc);
      });

      setText("");
      setDraftAttachments([]);
      setActivePreviewIndex(0);

      // 🔝 immediately bump this conversation to the top on the left
      setThreads((prev) =>
        prev
          .map((t) =>
            t.id === conversationId
              ? {
                ...t,
                last_message:
                  msg.body ||
                  msg.text ||
                  msg.message ||
                  body ||
                  (Array.isArray(msg.attachments) && msg.attachments.length
                    ? msg.attachments.length === 1
                      ? msg.attachments[0].name || "Attachment"
                      : `${msg.attachments.length} attachments`
                    : ""),
                last_message_created_at:
                  msg.created_at || msg.timestamp || nowIso,
                _last_ts: msg.created_at || msg.timestamp || nowIso,
              }
              : t
          )
          .sort(
            (a, b) =>
              new Date(b._last_ts || 0).getTime() -
              new Date(a._last_ts || 0).getTime()
          )
      );

      // soft sync with server in background
      loadConversations({ background: true });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };


  return (
    <Container
      maxWidth="xl"
      sx={{
        // reduced top + left padding vs previous version
        pt: 2,
        pb: 3,
        pl: { xs: 1.5, md: 3 },
        pr: { xs: 1.5, md: 3 },
      }}
    >
      {/* New chat dialog (staff + joined groups) */}
      <AdminNewChatDialog
        open={newChatOpen}
        staff={staffForNewChat}
        existingGroupIds={existingGroupIds}
        existingGroupNames={existingGroupNames}
        onClose={() => setNewChatOpen(false)}
        onStartStaffChat={(u) => openConversation(u)}
        onStartGroupChat={(g) => openGroupConversation(g)}
      />

      {/* Page header – similar to Community Groups */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main" }}>
            {(me?.first_name || me?.last_name || "A")
              .slice(0, 1)
              .toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Messages
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chat with your staff and moderators.
            </Typography>
          </Box>
        </Stack>
      </Stack>

      {/* outer card */}
      <Paper
        className="rounded-2xl border border-slate-200"
        sx={{
          p: { xs: 2, sm: 3 },
          height: { xs: "auto", md: "78vh" },
          background:
            "radial-gradient(circle at top left, rgba(45,212,191,0.08), transparent 55%), radial-gradient(circle at bottom right, rgba(59,130,246,0.06), transparent 55%)",
        }}
      >
        {/* 40 / 60 layout with vertical divider */}
        <Box
          sx={{
            height: "100%",
            display: { xs: "block", md: "flex" },
          }}
        >
          {/* LEFT 40% – conversations list */}
          <Box
            sx={{
              width: { xs: "100%", md: "40%" },
              borderRight: { md: "1px solid #e2e8f0" }, // vertical divider
              pr: { md: 3 },
              mb: { xs: 2, md: 0 },
              display: { xs: hasActiveChat ? "none" : "flex", md: "flex" },
              flexDirection: "column",
              height: "100%",
            }}
          >
            {/* Search + title inside member panel */}
            <Box sx={{ mb: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search..."
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
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  mb: 0.5,
                  display: "block",
                  color: "text.secondary",
                }}
              >
                All Message
              </Typography>
            </Box>

            {/* Scrollable conversation list */}
            <Box sx={{ flex: 1, overflowY: "auto", mb: 1 }}>
              {loadingThreads ? (
                <Box py={4} textAlign="center">
                  <CircularProgress size={24} />
                </Box>
              ) : filteredThreads.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  No conversations yet. Use <strong>New chat</strong> to start
                  one.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {filteredThreads.map((th) => {
                    const active = conversationId === th.id;
                    const title = threadTitle(th);

                    const isGroup = Boolean(th.group) || th.chat_type === "group";

                    // try to match this thread to a staff user
                    let matchedUser = null;
                    if (!isGroup) {
                      matchedUser =
                        users.find(
                          (u) => displayName(u).toLowerCase() === title.toLowerCase()
                        ) || null;
                    }

                    // avatar comes from user if we have it
                    let avatarSrc = threadAvatar(th);
                    if (matchedUser) {
                      avatarSrc = matchedUser.avatar_url || matchedUser.profile_image || avatarSrc;
                    }

                    // 🔴 presence for the list item
                    const matchProfile = matchedUser?.profile || {};
                    const isOnline = !!matchProfile.is_online;

                    const time = formatHHMM(getLastTimeISO(th));
                    const preview = shortPreview(getLastPreviewText(th) || "Say hi 👋");
                    const unread = th.unread_count || 0;

                    return (
                      <ListItemButton
                        key={th.id}
                        selected={active}
                        onClick={() => selectThread(th)}
                        onContextMenu={(e) => handleConvContextMenu(e, th)}
                        sx={{
                          px: 1,
                          py: 1,
                          mb: 0.75,
                          borderRadius: 2,
                          alignItems: "flex-start",
                          ...(active
                            ? {
                              bgcolor: "#f6fffe",
                              border: "1px solid #e2e8f0",
                            }
                            : {
                              "&:hover": {
                                bgcolor: "#fafafa",
                              },
                            }),
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Box
                            sx={{
                              position: "relative",
                              display: "inline-flex",
                            }}
                          >
                            <Avatar src={avatarSrc}>
                              {(title || "C").slice(0, 1).toUpperCase()}
                            </Avatar>
                            {/* green dot – top-right corner for DMs */}
                            {!isGroup && isOnline && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  right: -2,
                                  top: -2,
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  bgcolor: "success.main",
                                  border: "2px solid #fff",
                                }}
                              />
                            )}
                          </Box>
                        </ListItemAvatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                              noWrap
                            >
                              {title}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              {th.is_pinned && (
                                <PushPinIcon
                                  sx={{
                                    fontSize: 14,
                                    color: "text.secondary",
                                    transform: "rotate(45deg)",
                                  }}
                                />
                              )}
                              {time && (
                                <Typography variant="caption" color="text.secondary">
                                  {time}
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ width: "100%" }}        // full row width
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ flexGrow: 1, mr: 1 }}  // takes all space on left
                            >
                              {preview}
                            </Typography>

                            {unread > 0 && (
                              <Chip
                                label={String(unread)}
                                size="small"
                                color="primary"
                                sx={{ height: 18, minHeight: 18 }}  // badge at far right
                              />
                            )}
                          </Stack>
                        </Box>
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>

            {/* New chat (staff + groups they joined) */}
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setNewChatOpen(true)}
              sx={{
                mt: 0.5,
                textTransform: "none",
                borderRadius: 999,
              }}
            >
              New chat
            </Button>
          </Box>

          {/* RIGHT 60% – chat box */}
          <Box
            sx={{
              width: { xs: "100%", md: "60%" },
              pl: { md: 3 },
              // Mobile: show chat ONLY when a conversation is active
              display: { xs: hasActiveChat ? "flex" : "none", md: "flex" },
              flexDirection: "column",
              height: "100%",
            }}
          >
            {hasActiveChat ? (
              <>
                {/* Small details popup dialog (staff OR group) */}
                <Dialog
                  open={detailsOpen}
                  onClose={() => setDetailsOpen(false)}
                  maxWidth="xs"
                  fullWidth
                >
                  <DialogTitle>
                    {isGroupChat ? "Group details" : "Staff details"}
                  </DialogTitle>
                  <DialogContent dividers>
                    {isGroupChat ? (
                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Avatar src={headerAvatarSrc}>
                            {headerName.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {headerName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Group chat
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Avatar src={headerAvatarSrc}>
                            {headerName.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {headerName}
                            </Typography>
                            {activeUser && (
                              <Chip
                                size="small"
                                color="primary"
                                variant={
                                  activeUser.is_superuser ? "filled" : "outlined"
                                }
                                label={
                                  activeUser.is_superuser
                                    ? "Owner"
                                    : activeUser.is_staff
                                      ? "Staff"
                                      : "Member"
                                }
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </Stack>

                        {activeUser?.email && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Email: {activeUser.email}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Chat header */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1.5}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {/* Back button – visible only on mobile */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedUserId(null);
                        setActiveTarget(null);
                        setConversationId(null);
                        setMessages([]);
                        setError("");
                      }}
                      sx={{
                        mr: 0.5,
                        display: { xs: "inline-flex", md: "none" },
                      }}
                    >
                      <ArrowBackIosNewRoundedIcon fontSize="small" />
                    </IconButton>

                    <Box
                      sx={{ position: "relative", display: "inline-flex" }}
                    >
                      <Avatar src={headerAvatarSrc}>
                        {headerName.slice(0, 1).toUpperCase()}
                      </Avatar>
                      {showOnlineDot && (
                        <Box
                          sx={{
                            position: "absolute",
                            right: -2,
                            top: -2,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: "success.main",
                            border: "2px solid #fff",
                          }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {headerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {headerSubtitle}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Details icon at right side of header */}
                  <IconButton size="small" onClick={() => setDetailsOpen(true)}>
                    <MoreVertOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Divider sx={{ mb: 1.5 }} />

                {/* 📌 Pinned bar – fixed under header, does NOT scroll */}
                {pinnedMessages.length > 0 && (
                  <Box
                    sx={{
                      mb: 1.5,
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 2,
                      bgcolor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Header row */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      onClick={() => {
                        if (pinnedMessages.length > 1)
                          setPinsExpanded(!pinsExpanded);
                      }}
                      sx={{
                        cursor: pinnedMessages.length > 1 ? "pointer" : "default",
                        userSelect: "none",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ overflow: "hidden", flex: 1 }}
                      >
                        <Typography variant="caption" sx={{ fontSize: 13 }}>
                          📌
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: 13,
                            fontWeight: pinsExpanded ? 700 : 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "text.primary",
                          }}
                        >
                          {pinsExpanded
                            ? "Pinned messages"
                            : pinnedMessages[pinnedMessages.length - 1].body}
                        </Typography>
                      </Stack>

                      {pinnedMessages.length > 1 && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={pinnedMessages.length}
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          />
                          <ExpandMoreIcon
                            fontSize="small"
                            sx={{
                              transform: pinsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        </Stack>
                      )}
                    </Stack>

                    {/* Expanded pinned list */}
                    {pinsExpanded && (
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {pinnedMessages.map((m) => (
                          <Stack
                            key={`pinned-${m.id}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                              cursor: "pointer",
                              borderRadius: 1,
                              p: 0.5,
                              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                            }}
                            onClick={() => {
                              const el = document.querySelector(
                                `[data-mid="${m.id}"]`
                              );
                              if (el) {
                                el.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                              }
                            }}
                          >
                            <Box
                              sx={{
                                width: 24,
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <Box
                                sx={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: "50%",
                                  bgcolor: "text.secondary",
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontSize: 13,
                              }}
                            >
                              {m.body}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Scrollable messages area */}
                <Box
                  ref={chatScrollRef}
                  onScroll={handleChatScroll}
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    pr: { xs: 0, md: 1 },
                    py: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    borderRadius: 3,
                  }}
                >
                  {loadingMessages && messages.length === 0 && (
                    <Box py={4} textAlign="center">
                      <CircularProgress size={24} />
                    </Box>
                  )}

                  {!loadingMessages && error && messages.length === 0 && (
                    <Typography color="error" variant="body2">
                      {error}
                    </Typography>
                  )}

                  {messages.length > 0 &&
                    (() => {
                      const elems = [];
                      let lastDateKey = null;
                      const meId = me?.id;

                      messages.forEach((m, idx) => {
                        const created = m.created_at
                          ? new Date(m.created_at)
                          : null;

                        
                        // ---- date chip (Nov 14, 2025) ----
                        const dateKey = created
                          ? created.toDateString()
                          : "unknown";
                        if (dateKey !== lastDateKey) {
                          lastDateKey = dateKey;

                          let dateLabel = "";
                          if (created) {
                            const today = new Date();
                            const todayKey = today.toDateString();

                            const yesterday = new Date();
                            yesterday.setDate(today.getDate() - 1);
                            const yesterdayKey = yesterday.toDateString();

                            if (dateKey === todayKey) {
                              dateLabel = "Today";
                            } else if (dateKey === yesterdayKey) {
                              dateLabel = "Yesterday";
                            } else {
                              dateLabel = created.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                            }
                          }

                          elems.push(
                            <Box
                              key={`date-${dateKey}-${idx}`}
                              sx={{ textAlign: "center", my: 1.5 }}
                            >
                              <Chip
                                label={dateLabel}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderRadius: 999,
                                  px: 1.5,
                                  bgcolor: "#fff",
                                  borderColor: "rgba(148,163,184,0.5)",
                                  fontSize: 12,
                                }}
                              />
                            </Box>
                          );
                        }

                        // ---- message bubble with avatar + time ----
                        const mine =
                          m.is_mine === true ||
                          m.sender === meId ||
                          m.sender_id === meId ||
                          m.user_id === meId;

                        const body = m.body || m.text || m.message || "";
                        const timeStr = created
                          ? created.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "";

                        const senderName = mine
                          ? "You"
                          : m.sender_name ||
                            m.user_name ||
                            m.author_name ||
                            headerName;

                        const allAttachments = getMessageAttachments(m);
                        const shareAttachment = allAttachments.find((a) => a && a.type === "share");
                        const attachments = allAttachments.filter((a) => a && a.type !== "share");


                        // Avatar for *me*
                        const meAvatar =
                          me?.profile_image ||
                          me?.avatar_url ||
                          me?.avatar ||
                          me?.image ||
                          me?.image_url ||
                          "";

                        // Avatar coming from the *message sender* (works for group + 1-1)
                        const msgAvatar =
                          m.sender_avatar ||           // from normalizeMessages / API
                          m.user_avatar ||
                          (m.raw && (m.raw.sender_avatar || m.raw.user_avatar)) ||
                          headerAvatarSrc ||           // fallback to header avatar
                          "";

                        // Final avatar to use for this bubble
                        const senderAvatar = mine
                          ? (meAvatar || msgAvatar)
                          : msgAvatar;



                        elems.push(
                          <Box
                            key={m.id ?? `msg-${idx}`}
                            sx={{
                              display: "flex",
                              justifyContent: mine ? "flex-end" : "flex-start",
                              alignItems: "flex-end",   // ✅ bottom of avatar & bubble align
                              px: 1,
                              mb: 1,
                              gap: 0.75,                 // consistent space between avatar & bubble
                            }}
                          >
                            {/* avatar on left for other person, on right for you */}
                            {!mine && (
                              <Avatar
                                src={senderAvatar}
                                sx={{ width: 32, height: 32, mr: 1 }}
                              >
                                {senderName?.slice(0, 1)?.toUpperCase()}
                              </Avatar>
                            )}

                            <Box
                              data-mid={m.id}
                              sx={{
                                maxWidth: "75%",
                                px: 1.5,
                                py: 1,
                                borderRadius: 1,
                                bgcolor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
                              }}
                              onContextMenu={(e) => handleOpenMessageMenu(e, m)}
                            >
                              {/* 🔹 Attachments preview (same style as user messages page) */}
                              {/* 🔹 Attachments preview (same style as user messages page) */}
                              {attachments.length > 0 && (
                                <Stack spacing={0.75} sx={{ mb: body ? 0.75 : 0 }}>
                                  {/* your existing attachments.map(...) code stays the same */}
                                </Stack>
                              )}

                              {/* 🔹 Text body (if any) */}
                              {body && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {body}
                                </Typography>
                              )}

                              {/* 🔹 Shared post preview (same as user MessagesPage) */}
                              {shareAttachment && (
                                <SharePreview attachment={shareAttachment} mine={mine} />
                              )}

                              {/* 🔹 Time at bottom-right */}
                              {timeStr && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: "block",
                                    mt: 0.5,
                                    textAlign: "right",
                                    fontSize: "0.65rem",
                                  }}
                                >
                                  {timeStr}
                                </Typography>
                              )}

                            </Box>


                            {mine && (
                              <Avatar
                                src={senderAvatar}
                                sx={{ width: 32, height: 32, ml: 1 }}
                              >
                                {senderName?.slice(0, 1)?.toUpperCase()}
                              </Avatar>
                            )}
                          </Box>
                        );
                      });

                      return elems;
                    })()}

                  {!loadingMessages && !error && messages.length === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 2, textAlign: "center" }}
                    >
                      No messages yet. Say hi 👋
                    </Typography>
                  )}
                </Box>

                {/* Hidden inputs for File Upload & Camera (shared for both states) */}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />

                <Divider sx={{ mt: 1.5, mb: 1 }} />

                {draftAttachments.length > 0 ? (
                  // 🔍 Media preview panel (like MessagesPage)
                  (() => {
                    const activeFile =
                      draftAttachments[activePreviewIndex] || draftAttachments[0];
                    const activeUrl =
                      previewUrls[activePreviewIndex] || previewUrls[0] || null;
                    const isImage =
                      activeFile &&
                      typeof activeFile.type === "string" &&
                      activeFile.type.startsWith("image/");

                    return (
                      <Box
                        sx={{
                          borderRadius: 2,
                          border: "1px solid #e2e8f0",
                          bgcolor: "#f8fafc",
                          px: { xs: 1.5, md: 2 },
                          py: { xs: 1, md: 1.25 },
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                          maxWidth: 480,          // ⬅ limit width
                          alignSelf: "center",    // ⬅ center inside chat column
                        }}
                      >
                        {/* Header: title + attach + close */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Preview
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {draftAttachments.length > 1 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {activePreviewIndex + 1} / {draftAttachments.length}
                              </Typography>
                            )}
                            {/* Attach more files */}
                            <Tooltip title="Attach more">
                              <IconButton
                                size="small"
                                onClick={handleAttachClick}
                                sx={{ mr: 0.5 }}
                              >
                                <AddRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {/* Close / clear all */}
                            <IconButton size="small" onClick={handleClearAttachments}>
                              <CloseRoundedIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>

                        {/* Large preview */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {activeUrl && isImage ? (
                            <Box
                              component="img"
                              src={activeUrl}
                              alt={activeFile?.name || "preview"}
                              sx={{
                                maxHeight: 240,          // ⬅ shorter
                                maxWidth: "100%",
                                borderRadius: 2,
                                objectFit: "contain",
                                bgcolor: "#e2e8f0",
                              }}
                            />
                          ) : (
                            <Paper
                              elevation={0}
                              sx={{
                                borderRadius: 2,
                                border: "1px dashed #94a3b8",
                                bgcolor: "#e2e8f0",
                                px: 4,
                                py: 3,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                maxWidth: 320,
                              }}
                            >
                              <UploadFileRoundedIcon sx={{ mb: 1 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {activeFile?.name || "File"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                              >
                                This file will be sent with your message.
                              </Typography>
                            </Paper>
                          )}
                        </Box>

                        {/* Thumbnails for multiple files */}
                        {draftAttachments.length > 1 && (
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="center"
                            flexWrap="wrap"
                          >
                            {previewUrls.map((url, idx) => {
                              const file = draftAttachments[idx];
                              const img =
                                file &&
                                typeof file.type === "string" &&
                                file.type.startsWith("image/");

                              return (
                                <Box
                                  key={idx}
                                  onClick={() => setActivePreviewIndex(idx)}
                                  sx={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 1.5,
                                      overflow: "hidden",
                                      border:
                                        idx === activePreviewIndex
                                          ? "2px solid #0ea5e9"
                                          : "1px solid #e2e8f0",
                                      cursor: "pointer",
                                    }}
                                >
                                  {img ? (
                                    <Box
                                      component="img"
                                      src={url}
                                      alt={file?.name || "thumb"}
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 10,
                                        px: 0.5,
                                        textAlign: "center",
                                      }}
                                    >
                                      {file?.name}
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </Stack>
                        )}

                        {/* Caption + Send button (WhatsApp style) */}
                        <Box sx={{ position: "relative", mt: 0.5 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Add a caption…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 999,
                                pr: 7, // space for send button
                              },
                            }}
                          />
                          <IconButton
                            onClick={handleSend}
                            disabled={
                              sending ||
                              (!text.trim() && draftAttachments.length === 0) ||
                              !conversationId
                            }
                            sx={{
                              position: "absolute",
                              right: 6,
                              top: "50%",
                              transform: "translateY(-50%)",
                              bgcolor: "primary.main",
                              color: "#fff",
                              "&:hover": { bgcolor: "primary.dark" },
                              width: 34,
                              height: 34,
                            }}
                          >
                            <SendRoundedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })()
                ) : (
                  // ✉️ Normal text-only composer
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Tooltip title="Attach">
                      <IconButton
                        onClick={handleAttachClick}
                        size="small"
                        sx={{
                          bgcolor: isAttachMenuOpen ? "rgba(0,0,0,0.06)" : "transparent",
                          transition: "transform 0.2s",
                          transform: isAttachMenuOpen ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        <AddRoundedIcon fontSize="medium" />
                      </IconButton>
                    </Tooltip>

                    <TextField
                      placeholder="Type a message…"
                      fullWidth
                      size="small"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<SendRoundedIcon />}
                      disabled={
                        (!text.trim() && draftAttachments.length === 0) ||
                        sending ||
                        !conversationId
                      }
                      onClick={handleSend}
                      sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                      Send
                    </Button>
                  </Box>
                )}
                {/* Attach menu: File Upload & Camera (same as MessagesPage) */}
                  <Menu
                    anchorEl={attachMenuAnchor}
                    open={isAttachMenuOpen}
                    onClose={handleAttachClose}
                    anchorOrigin={{ vertical: "top", horizontal: "left" }}
                    transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                  >
                    <MenuItem onClick={handleTriggerFileUpload}>
                      <ListItemIcon>
                        <UploadFileRoundedIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2" fontWeight={600}>
                        File Upload
                      </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleTriggerCamera}>
                      <ListItemIcon>
                        <CameraAltRoundedIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2" fontWeight={600}>
                        Camera
                      </Typography>
                    </MenuItem>
                  </Menu>
              </>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Select a conversation on the left or use{" "}
                  <strong>New chat</strong> to start one.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
      {/* Conversation context menu: pin / unpin */}
      <Menu
        anchorEl={convMenuAnchor}
        open={Boolean(convMenuAnchor)}
        onClose={handleCloseConvMenu}
      >
        <MenuItem onClick={handleTogglePinConversation}>
          {convMenuTarget?.is_pinned ? "Unpin chat" : "Pin chat"}
        </MenuItem>
      </Menu>
      {/* Message context menu: pin / unpin / delete */}
      <Menu
        anchorEl={menuAnchorEl}
        open={messageMenuOpen && !!menuMessage}
        onClose={handleCloseMessageMenu}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {/* Everyone can see Pin / Unpin */}
        {menuMessage && (
          <MenuItem onClick={handlePinOrUnpin}>
            {isMessagePinned(menuMessage.id) ? "Unpin message" : "Pin message"}
          </MenuItem>
        )}

        {/* Only message owner can see Delete */}
        {menuMessage && (menuMessage.mine || isMyMessage(menuMessage)) && (
          <MenuItem onClick={handleDeleteMessage}>Delete</MenuItem>
        )}
      </Menu>

      {/* Camera modal for capturing a photo */}
      <Dialog open={cameraOpen} onClose={handleCloseCamera} maxWidth="md">
        <DialogContent sx={{ p: 0, bgcolor: "black" }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
              }}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 2,
            }}
          >
            <IconButton
              onClick={handleCapturePhoto}
              sx={{
                width: 60,
                height: 60,
                border: "4px solid white",
                color: "white",
              }}
            >
              <CameraAltRoundedIcon fontSize="large" />
            </IconButton>
          </Box>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </DialogContent>
      </Dialog>
    </Container>
  );
}
