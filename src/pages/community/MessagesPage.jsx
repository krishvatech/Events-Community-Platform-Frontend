// src/pages/community/MessagesPage.jsx
import * as React from "react";
import {
  Avatar,
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
  ListItemIcon,
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
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Skeleton
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VideoFileOutlinedIcon from "@mui/icons-material/VideoFileOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import { useNavigate } from "react-router-dom";


const BORDER = "#e2e8f0";
const PANEL_H = "calc(100vh - 130px)";
const TIME_W = 56;   // px reserved on the right for time
const TIME_H = 16;   // px reserved at the bottom for time

const bubbleSx = (mine) => (theme) => ({
  position: "relative",
  // maxWidth: "calc(78% - 8px)",
  maxWidth: "340px",
  padding: theme.spacing(0.75, 1.25),
  paddingRight: `calc(${theme.spacing(1.25)} + ${TIME_W}px)`,
  paddingBottom: `calc(${theme.spacing(0.75)} + ${TIME_H}px)`,
  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
  bgcolor: mine ? "rgb(189, 189, 189, 0.25)" : theme.palette.background.paper,
  color: mine ? theme.palette.common.black : "inherit",
  border: `1px solid ${mine ? "rgba(87, 87, 87, 0.15)" : BORDER}`,
  boxShadow: mine ? "0 2px 6px rgba(114, 113, 113, 0.15)" : "none",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  "&:after": {
    content: '""',
    position: "absolute",
    bottom: 0,
    width: 0,
    height: 0,
    borderTop: "8px solid transparent",
    borderBottom: "8px solid transparent",
    ...(mine
      ? { right: -8, borderLeft: "8px solid rgba(87, 87, 87, 0.15)" }
      : { left: -8, borderRight: `8px solid ${theme.palette.background.paper}` }),
  },
});

function SharePreview({ attachment, mine }) {
  if (!attachment) return null;

  // ---------- helper utilities ----------
  const getNested = (obj, path) => {
    if (!obj) return undefined;
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (!cur) return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const pickFirstUrl = (obj, paths) => {
    if (!obj) return "";
    for (const p of paths) {
      const v = p === "." ? obj : getNested(obj, p);
      if (!v) continue;
      if (typeof v === "string") return v;
      if (v.url) return v.url;
      if (v.file) return v.file;
      if (v.file_url) return v.file_url;
      if (v.image) return v.image;
    }
    return "";
  };

  const pickFirstText = (obj, paths) => {
    if (!obj) return "";
    for (const p of paths) {
      const v = p === "." ? obj : getNested(obj, p);
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

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

  // ---------- fetch full post once (for real Instagram-style preview) ----------
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!feedItemId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_ROOT}/activity/feed/${feedItemId}/`, {
          headers: {
            Accept: "application/json",
            ...authHeader(),
          },
        });
        const data = await res.json().catch(() => null);
        if (!cancelled) {
          if (res.ok && data) {
            setPost(data);
          } else {
            setPost(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load shared post", e);
          setPost(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feedItemId]);

  // If API failed or we don't have id, still keep basic behaviour on click
  const handleClick = () => {
    const basePath = "/community?view=live";

    if (!feedItemId) {
      window.location.href = basePath;
      return;
    }

    try {
      window.localStorage.setItem("ecp_livefeed_focus_post", String(feedItemId));
    } catch (e) {
      // ignore storage errors
    }

    const url = `${basePath}&post=${encodeURIComponent(feedItemId)}`;
    window.location.href = url;
  };

  // ---------- build Instagram-style card data ----------
  // Prefer data from the API (`post`), fall back to attachment.meta
  const source = post || attachment;

  // ✅ Detect poll-type posts
  const isPoll =
    !!source?.poll ||
    !!source?.meta?.poll ||
    !!source?.poll_options ||
    !!source?.meta?.poll_options ||
    source?.kind === "poll" ||
    source?.type === "poll";

  // ---------- POLL-SPECIFIC PARSING ----------
  let pollQuestion = "";
  let pollOptions = [];
  let totalVotes = 0;

  if (isPoll) {
    pollQuestion =
      pickFirstText(source, [
        "poll.question",
        "meta.poll.question",
        "meta.poll_question",
        "question",
        "title",
        "meta.title",
        "text",
        "body",
      ]) || "";

    const rawOptions =
      (Array.isArray(source?.poll?.options) && source.poll.options) ||
      (Array.isArray(source?.meta?.poll?.options) && source.meta.poll.options) ||
      (Array.isArray(source?.poll_options) && source.poll_options) ||
      (Array.isArray(source?.meta?.poll_options) && source.meta.poll_options) ||
      [];

    pollOptions = rawOptions.map((opt, idx) => {
      const votes =
        opt.votes ??
        opt.vote_count ??
        opt.count ??
        opt.total_votes ??
        0;

      return {
        id: opt.id ?? idx,
        label:
          opt.label ??
          opt.text ??
          opt.option ??
          opt.choice ??
          `Option ${idx + 1}`,
        votes,
        percentage: opt.percentage ?? opt.percent ?? null,
      };
    });

    totalVotes = pollOptions.reduce(
      (sum, o) => sum + (Number.isFinite(o.votes) ? o.votes : 0),
      0
    );

    pollOptions = pollOptions.map((o) => ({
      ...o,
      pct:
        o.percentage != null
          ? o.percentage
          : totalVotes > 0
            ? Math.round((o.votes / totalVotes) * 100)
            : 0,
    }));
  }

  // ---------- Generic post data (for non-poll, or to reuse author name) ----------
  const thumbUrl = pickFirstUrl(source, [
    "meta.preview_image",
    "meta.preview_image_url",
    "meta.image",
    "meta.cover_image",
    "preview_image",
    "preview_image_url",
    "image",
    "cover_image",
    "images.0.url",
    "images.0.image",
    "attachments.0.image",
    "attachments.0.file_url",
    "attachments.0.file",
    ".thumbnail",
  ]);

  const author =
    pickFirstText(source, [
      "meta.author_name",
      "meta.owner_name",
      "owner_name",
      "owner.full_name",
      "owner.name",
      "user.full_name",
      "user.name",
      "creator_name",
    ]) ||
    attachment.owner_name ||
    attachment.author_name ||
    "";

  const rawCaption =
    pickFirstText(source, [
      "meta.preview_text",
      "meta.title",
      "title",
      "meta.caption",
      "preview_text",
      "caption",
      "text",
      "body",
      "content",
    ]) || "";

  const caption =
    rawCaption.length > 80
      ? rawCaption.slice(0, 77).trimEnd() + "…"
      : rawCaption;

  const label = author
    ? isPoll
      ? `${author} • Poll`
      : `${author} • Post`
    : isPoll
      ? "Poll"
      : "Post";

  // ---------- UI: Poll Card ----------
  if (isPoll) {
    return (
      <Box
        onClick={handleClick}
        sx={{
          mt: 0.75,
          borderRadius: 2,
          border: `1px solid ${BORDER}`,
          bgcolor: mine ? "#ffffff" : "#f8fafc",
          overflow: "hidden",
          cursor: "pointer",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(15,23,42,0.12)",
          },
        }}
      >
        <Box sx={{ p: 1.25 }}>
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
            {label}
          </Typography>

          {pollQuestion && (
            <Typography
              variant="body2"
              sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}
            >
              {pollQuestion}
            </Typography>
          )}

          <Stack spacing={0.5} sx={{ mb: 0.75 }}>
            {pollOptions.slice(0, 4).map((opt) => (
              <Box key={opt.id}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.25,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontSize: 12, fontWeight: 500 }}
                  >
                    {opt.label}
                  </Typography>
                  {totalVotes > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 11, opacity: 0.8 }}
                    >
                      {opt.pct}%
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    position: "relative",
                    height: 6,
                    borderRadius: 9999,
                    bgcolor: "rgba(148,163,184,0.25)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: `${opt.pct}%`,
                      maxWidth: "100%",
                      borderRadius: 9999,
                      bgcolor: "primary.main",
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>

          <Typography
            variant="caption"
            sx={{ fontSize: 11, opacity: 0.7, display: "block" }}
          >
            {totalVotes > 0
              ? `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`
              : loading
                ? "Loading poll…"
                : "Tap to open poll"}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ---------- UI: Normal post card ----------
  return (
    <Box
      onClick={handleClick}
      sx={{
        mt: 0.75,
        borderRadius: 2,
        border: `1px solid ${BORDER}`,
        bgcolor: mine ? "#ffffff" : "#f8fafc",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 4px 12px rgba(15,23,42,0.12)",
        },
      }}
    >
      {/* Top media preview (image/video thumbnail) */}
      {thumbUrl && (
        <Box
          sx={{
            position: "relative",
            pt: "100%", // square like Instagram
            bgcolor: "#0f172a",
            overflow: "hidden",
          }}
        >
          <Box
            component="img"
            src={thumbUrl}
            alt="Shared post"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Box>
      )}

      {/* Text / caption area */}
      <Box sx={{ p: 1.25 }}>
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
          {label}
        </Typography>

        {caption && (
          <Typography
            variant="body2"
            color="text.primary"
            sx={{
              fontSize: 13,
              mb: 0.75,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {caption}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: "primary.main",
          }}
        >
          {loading ? "Loading post…" : "View post in live feed"}
        </Typography>
      </Box>
    </Box>
  );
}


// ---------- API helpers ----------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const MESSAGING = `${API_ROOT}/messaging`;

// Centralized endpoints (keeps paths consistent with DRF trailing slashes)
const ENDPOINTS = {
  // Conversations
  conversations: () => `${MESSAGING}/conversations/`,
  conversationMessages: (cid) => `${MESSAGING}/conversations/${cid}/messages/`,
  conversationMembers: (cid) => `${MESSAGING}/conversations/${cid}/members/`,
  convMarkAllRead: (cid) => `${MESSAGING}/conversations/${cid}/mark-all-read/`,
  chatGroups: () => `${MESSAGING}/conversations/chat-groups/`,
  chatEvents: () => `${MESSAGING}/conversations/chat-events/`,
  ensureGroup: () => `${MESSAGING}/conversations/ensure-group/`,
  ensureEvent: () => `${MESSAGING}/conversations/ensure-event/`,

  // Messages
  messageRead: (mid) => `${MESSAGING}/messages/${mid}/read/`,
  downloadAttachment: (cid, mid, index) =>
    `${MESSAGING}/conversations/${cid}/messages/${mid}/download-attachment/?index=${index}`,
};

const emitUnreadMessages = (count) => {
  try {
    window.dispatchEvent(new CustomEvent("messages:unread", { detail: { count } }));
    localStorage.setItem("unread_messages", String(count));
  } catch {
    // ignore
  }
};
// ---------- SPA routes (taken from GroupsPage & MembersPage) ----------
const groupPath = (objOrId) => {
  const o = typeof objOrId === "object" ? objOrId : { id: objOrId };
  return `/community/group/${o?.slug || o?.id}`;
};
const userProfilePath = (id) => `/community/rich-profile/${id}`;



const CAPTION_SX = { fontSize: 11, lineHeight: 1.2 };
const TINY_TIME_SX = { fontSize: 11, lineHeight: 1.2, opacity: .7 };
const CHIP_TINY_SX = {
  height: 18,
  '& .MuiChip-label': { px: 0.75, fontSize: 11, fontWeight: 400, lineHeight: '14px' }
};

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return m ? decodeURIComponent(m.pop()) : null;
}
function authHeader() {
  const access =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken");
  const headers = {};
  if (access) headers.Authorization = `Bearer ${access}`;
  return headers;
}
function csrfHeader(method) {
  if (!method || ["GET", "HEAD", "OPTIONS"].includes(method)) return {};
  const csrftoken = getCookie("csrftoken") || getCookie("csrfToken");
  return csrftoken ? { "X-CSRFToken": csrftoken } : {};
}
async function apiFetch(url, { method = "GET", headers = {}, body } = {}) {
  const finalHeaders = {
    Accept: "application/json",
    ...authHeader(),
    ...csrfHeader(method),
    ...headers,
  };
  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body,
    credentials: "include",
  });
  return res;
}

// small JSON helper
async function postJSON(url, data) {
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.detail || `POST ${url} failed`);
  return json;
}

// -------- read receipts helpers ----------
async function markMessageRead(messageId) {
  try {
    const res = await apiFetch(ENDPOINTS.messageRead(messageId), { method: "POST" });
    if (!res.ok) throw new Error("mark read failed");
  } catch (e) {
    console.warn("markMessageRead:", e?.message || e);
  }
}

async function downloadAttachmentFromApi(conversationId, messageId, index, filename) {
  if (!conversationId || !messageId) return;

  try {
    const res = await apiFetch(
      ENDPOINTS.downloadAttachment(conversationId, messageId, index),
      {
        // For binary file, accept anything
        headers: { Accept: "*/*" },
      }
    );

    if (!res.ok) {
      console.error("Attachment download failed", res.status);
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Download error", e);
  }
}

async function markConversationAllRead(conversationId) {
  try {
    const res = await apiFetch(ENDPOINTS.convMarkAllRead(conversationId), { method: "POST" });
    if (!res.ok) throw new Error("mark all read failed");
  } catch (e) {
    console.warn("markConversationAllRead:", e?.message || e);
  }
}


// ---------- UI SUB-COMPONENTS ----------
const absUrl = (u) => {
  if (!u) return "";
  if (/^(https?:|data:)/i.test(u)) return u;
  try { return new URL(u, API_ROOT).href; } catch { return u; }
};
const urlish = (v) => (typeof v === "string" ? v : (v && typeof v === "object" && v.url) ? v.url : "");
const pickImg = (obj, keys) => {
  for (const path of keys) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) cur = cur?.[p];
    const u = absUrl(urlish(cur));
    if (u) return u;
  }
  return "";
};

// ---- last-message helpers ----
const getLastMessageObj = (t) => {
  const lm = t?.last_message ?? t?.latest_message ?? t?.last ?? null;
  if (!lm) return null;
  return typeof lm === "string" ? { body: lm } : lm;
};

const getLastTimeISO = (t) => {
  const lm = getLastMessageObj(t);
  return (
    // ✅ prefer sticky client-side values when present
    t?._last_ts || t?.local_last_ts ||
    // server-provided possibilities
    t?.last_message_created_at ||
    t?.last_message_at ||
    t?.last_message_time ||
    t?.last_message_timestamp ||
    lm?.created_at || lm?.timestamp || lm?.sent_at ||
    // fallbacks
    t?.updated_at || t?.created_at || null
  );
};

const formatHHMM = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const formatLastSeen = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (sameDay(d, now)) {
    return `last seen today at ${timeStr}`;
  }
  if (sameDay(d, yesterday)) {
    return `last seen yesterday at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `last seen on ${dateStr} at ${timeStr}`;
};

const getLastPreviewText = (t) => {
  const lm = getLastMessageObj(t);

  const fullText =
    t?.last_message_text ||
    t?.last_text ||
    (lm?.body || lm?.text || lm?.message || "") ||
    "";

  const trimmed = (fullText || "").trim();
  if (!trimmed) return "";

  const words = trimmed.split(/\s+/);

  // 👇 Only first 3 words in the preview
  if (words.length <= 3) {
    return trimmed;
  }
  return words.slice(0, 3).join(" ") + "…";
};

const shortPreview = (text, max = 28) => {
  if (!text) return "";
  const cleaned = String(text).trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max) + "…";
};



const isDmThread = (thread) => {
  if (!thread) return false;

  // explicit chat_type flags
  if (
    thread.chat_type === "dm" ||
    thread.chat_type === "direct" ||
    thread.chat_type === "private"
  ) {
    return true;
  }

  // fall-back: anything that is NOT a group/event chat
  const isGroupOrEvent = Boolean(
    thread.is_group ||
    thread.is_event_group ||
    thread.group ||
    thread.context_group ||
    thread.event ||
    thread.event_id
  );

  return !isGroupOrEvent;
};

// Figure out the "other" user in a DM conversation
// Figure out the "other" user in a DM conversation
const getDmPartnerId = (thread, me, rosterMap) => {
  if (!isDmThread(thread)) return null;

  // 1) Explicit ID fields from backend (add/change as per your serializer)
  const explicitId =
    thread.dm_partner_id ??
    thread.other_user_id ??
    thread.friend_id ??
    thread.recipient_id ??
    null;
  if (explicitId) return explicitId;

  // 2) Explicit object fields from backend
  const explicitObj =
    thread.dm_partner ||
    thread.other_user ||
    thread.friend ||
    thread.partner ||
    null;

  if (explicitObj) {
    if (typeof explicitObj === "object") {
      return (
        explicitObj.id ??
        explicitObj.user_id ??
        explicitObj.user?.id ??
        null
      );
    }
    return explicitObj;
  }

  // 3) Fallback: participants/members array → pick "not me"
  const participants = Array.isArray(thread.participants)
    ? thread.participants
    : Array.isArray(thread.members)
      ? thread.members
      : null;

  const myId = me?.id ? String(me.id) : null;
  if (participants && myId) {
    const other = participants.find((p) => {
      const id = p.id ?? p.user_id ?? p.user?.id;
      if (!id) return false;
      return String(id) !== myId;
    });

    if (other) {
      return other.id ?? other.user_id ?? other.user?.id ?? null;
    }
  }

  // 4) Name-based fallback using rosterMap
  if (rosterMap && thread.display_title) {
    const title = String(thread.display_title).trim().toLowerCase();

    for (const key of Object.keys(rosterMap)) {
      const entry = rosterMap[key];
      const user = entry?.user || {};
      const profile = entry?.profile || {};

      const fullName = String(
        user.full_name || user.name || profile.full_name || ""
      )
        .trim()
        .toLowerCase();

      const username = String(user.username || "").trim().toLowerCase();

      if (fullName && fullName === title) return key;
      if (username && username === title) return key;
    }
  }

  return null;
};

function ConversationRow({ thread, active, onClick, online, onContextMenu }) {
  const unread = thread.unread_count || 0;
  const timeISO = thread._last_ts || getLastTimeISO(thread);
  const time = formatHHMM(timeISO);
  const last = shortPreview(getLastPreviewText(thread) || "");
  const title =
    thread?.group?.name ||
    thread.display_title ||
    (isDmThread(thread) ? "Direct Message" : "Conversation");

  return (
    <ListItem
      disableGutters
      onClick={onClick}
      onContextMenu={onContextMenu} // <--- Handle Right Click
      sx={{
        px: 1,
        py: 1,
        borderRadius: 2,
        cursor: "pointer",
        bgcolor: thread.is_pinned ? "#f8fafc" : "transparent", // Slight background for pinned
        ...(active
          ? { bgcolor: "#f6fffe", border: `1px solid ${BORDER}` }
          : { "&:hover": { bgcolor: "#fafafa" } }),
      }}
    >
      <ListItemAvatar sx={{ minWidth: 48 }}>
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <Avatar
            src={
              thread?.context_logo ||
              thread?.context_cover ||
              thread?.group_cover ||
              thread?.event_cover ||
              ""
            }
          >
            {(title || "C").slice(0, 1)}
          </Avatar>
          {online && (
            <Box
              sx={{
                position: "absolute", left: 2, top: 2, width: 10, height: 10,
                borderRadius: "50%", bgcolor: "success.main", border: "2px solid #fff",
              }}
            />
          )}
        </Box>
      </ListItemAvatar>

      <ListItemText
        disableTypography
        primary={
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {/* Show Pin Icon if pinned */}
              {thread.is_pinned && <PushPinIcon sx={{ fontSize: 14, color: "text.secondary", transform: "rotate(45deg)" }} />}
              <Typography variant="caption" color="text.secondary" sx={CAPTION_SX}>
                {time}
              </Typography>
            </Stack>
          </Stack>
        }
        secondary={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {last}
            </Typography>
            {unread > 0 && (
              <Chip
                size="small" label={String(unread)} color="primary"
                sx={{ height: 18, minHeight: 18 }}
              />
            )}
          </Stack>
        }
      />
    </ListItem>
  );
}
function Bubble({ m, showSender, onBubbleClick, onBubbleContextMenu, isPinned, conversationId }) {
  const mine = Boolean(m.mine);

  const attachments = m.attachments || [];
  const shareAttachment = attachments.find((a) => a && a.type === "share");
  const standardAttachments = attachments.filter((a) => a && a.type !== "share");

  // Check if we need to hide the main timestamp (because we overlay it on the image)
  const hasFullWidthAttachmentNoText =
    standardAttachments.some((a) => {
      const url = a.url || "";
      const type = (a.type || "").toLowerCase();
      const isImage = type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      const isVideo = type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(url);
      const isPdf = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
      return isImage || isVideo || isPdf;
    }) && !m.body;

  const hasOnlyPdfAttachmentNoText =
    standardAttachments.length === 1 &&
    !m.body &&
    (() => {
      const a = standardAttachments[0];
      if (!a) return false;
      const url = a.url || "";
      const type = (a.type || "").toLowerCase();
      const isPdf =
        type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
      return isPdf;
    })();


  const formatSize = (bytes) => {
    if (!bytes) return "";
    const k = bytes / 1024;
    return k < 1024 ? `${k.toFixed(1)} KB` : `${(k / 1024).toFixed(1)} MB`;
  };

  const handleDownloadClick = (idx, filename) => {
    if (!conversationId) return;
    downloadAttachmentFromApi(conversationId, m.id, idx, filename);
  };

  return (
    <Stack
      direction="row"
      justifyContent={mine ? "flex-end" : "flex-start"}
      alignItems="flex-end"
      sx={{ my: 0.75, width: "100%" }}
      data-mid={m.id}
      data-mine={mine ? "1" : "0"}
      data-readbyme={m.read_by_me ? "1" : "0"}
    >
      {!mine && (
        <Avatar src={m.sender_avatar} sx={{ width: 30, height: 30, mr: 1 }}>
          {(m.sender_display || m.sender_name || "U").slice(0, 1)}
        </Avatar>
      )}

      <Box
        sx={[
          bubbleSx(mine),
          hasFullWidthAttachmentNoText && {
            p: 0,
            paddingRight: 0,
            paddingBottom: 0, // no extra space for time
          },
          hasOnlyPdfAttachmentNoText && {
            // hide outer grey bubble for “PDF only” messages
            bgcolor: "transparent",
            border: "none",
            boxShadow: "none",
            "&:after": { display: "none" },
          },
        ]}
        onClick={(e) => {
          if (onBubbleClick) onBubbleClick(e, m);
        }}
        onContextMenu={(e) => {
          if (onBubbleContextMenu) {
            e.preventDefault();
            onBubbleContextMenu(e, m);
          }
        }}
      >
        {/* Sender Name */}
        {showSender && (
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              lineHeight: 1.2,
              fontWeight: 700,
              display: "block",
              mb: 0.5,
              opacity: 0.9,
              color: mine ? "inherit" : "primary.main"
            }}
          >
            {mine ? "You" : (m.sender_display || m.sender_name)}
          </Typography>
        )}

        {/* 🔹 ATTACHMENTS */}
        {standardAttachments.length > 0 && (
          <Stack spacing={0.5} sx={{ mb: m.body ? 0.5 : -0.5 }}>
            {standardAttachments.map((att, index) => {
              const realIndex = m.attachments.indexOf(att);
              const url = att.url || "";
              const type = (att.type || "").toLowerCase();
              const name = att.name || "Unknown File";
              const fullWidthSx = !m.body
                ? {
                  // pure attachment message → fill entire bubble
                  width: "100%",
                  maxWidth: "100%",
                  borderRadius: "inherit",
                  overflow: "hidden",
                }
                : {
                  // attachment + text → stay inside normal padding
                  width: "100%",
                  maxWidth: "100%",
                  borderRadius: 2,
                  overflow: "hidden",
                  mt: 0.5,
                };

              const isImage = type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
              const isVideo = type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(url);
              const isPdf = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

              // 🟢 1. IMAGE DISPLAY (Flush with edges + Time Overlay)
              if (isImage) {
                return (
                  <Box
                    key={index}
                    onClick={() => window.open(url, "_blank")}
                    sx={{
                      ...fullWidthSx,
                      height: 250,
                      cursor: "pointer",
                      display: "flex",
                      position: "relative",
                      bgcolor: "rgba(0,0,0,0.05)",
                    }}
                  >
                    <img
                      src={url}
                      alt={name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />

                    {/* 🔹 WhatsApp Style Time Overlay (Only if no text) */}
                    {!m.body && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          width: "100%",
                          height: 40,
                          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "flex-end",
                          p: 1
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "white", fontSize: 11, fontWeight: 500 }}>
                          {m._time}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              }

              // 🟢 2. VIDEO DISPLAY
              if (isVideo) {
                return (
                  <Box
                    key={index}
                    sx={{
                      ...fullWidthSx,
                      height: 260,
                      bgcolor: "rgba(0,0,0,0.05)",
                      display: "flex",
                    }}
                  >
                    <video
                      src={url}
                      controls
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </Box>
                );
              }

              // 🟢 3. PDF
              if (isPdf) {
                return (
                  <Box
                    key={index}
                    onClick={() => handleDownloadClick(realIndex, name)}
                    sx={{
                      width: 240,
                      maxWidth: "100%",
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: mine ? "rgba(0,0,0,0.05)" : "#f0f2f5",
                      cursor: "pointer",
                      mb: 0.5,
                      border: "1px solid rgba(0,0,0,0.08)"
                    }}
                  >
                    <Box sx={{ height: 120, bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      <PictureAsPdfRoundedIcon sx={{ fontSize: 50, color: "#e0e0e0" }} />
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5 }}>
                      <PictureAsPdfRoundedIcon sx={{ color: "#d32f2f", fontSize: 28 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>{name}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatSize(att.size)} • PDF</Typography>
                      </Box>
                      <FileDownloadOutlinedIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadClick(realIndex, name);
                        }}
                      />
                    </Stack>
                  </Box>
                );
              }

              // 🟢 4. GENERIC FILE
              return (
                <Stack
                  key={index}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  onClick={() => window.open(url, "_blank")}
                  sx={{
                    p: 1.5, borderRadius: 2, bgcolor: "rgba(0,0,0,0.06)", cursor: "pointer", mb: 0.5
                  }}
                >
                  <InsertDriveFileRoundedIcon sx={{ color: "#54656f", fontSize: 28 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>{name}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{formatSize(att.size)} • {type.split('/').pop().toUpperCase()}</Typography>
                  </Box>
                  <FileDownloadOutlinedIcon sx={{ opacity: 0.6 }} />
                </Stack>
              );
            })}
          </Stack>
        )}

        {/* Text Body */}
        {m.body && (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              mt: standardAttachments.length > 0 ? 0.5 : 0
            }}
          >
            {m.body}
          </Typography>
        )}

        {/* Shared Post Preview */}
        {shareAttachment && (
          <SharePreview attachment={shareAttachment} mine={mine} />
        )}

        {/* 🔹 Main Timestamp (Hide if we already showed it inside the image) */}
        {!hasFullWidthAttachmentNoText && (
          <Typography
            className="bubble-time"
            variant="caption"
            sx={{
              float: "right",
              ml: 1,
              mt: 0.5,
              fontSize: 10,
              opacity: 0.75,
              display: "inline-block",
              verticalAlign: "bottom"
            }}
          >
            {m._time}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}


async function hydrateMissingAvatars(items, type) {
  const out = [...items];
  const pickFromUser = (j) =>
    pickImg(j, [
      "profile.user_image", "profile.user_image.url",
      "profile.avatar", "profile.avatar.url",
      "profile.picture", "profile.photo", "profile_pic",
      "avatar", "image",
      "linkedin.picture_url",
    ]);

  const pickFromGroup = (j) =>
    pickImg(j, [
      "logo_url", "logo.url", "logo", "avatar", "image",
      "cover_image.url", "cover_image", "banner_url", "banner", "cover",
      "header_image", "hero_image",
    ]);

  const pickFromEvent = (j) =>
    pickImg(j, [
      "thumbnail", "thumbnail.url", "poster", "poster.url", "logo_url",
      "cover_image.url", "cover_image", "banner_url", "banner", "cover",
      "header_image", "hero_image", "preview_image",
    ]);

  const endpoint = (t, id) => {
    if (t === "friend") return `${API_ROOT}/users/${id}/`;
    if (t === "group") return `${API_ROOT}/groups/${id}/`;
    if (t === "event") return `${API_ROOT}/events/${id}/`;
    return null;
  };

  const mapper = (t, json) =>
    t === "friend" ? pickFromUser(json) :
      t === "group" ? pickFromGroup(json) :
        t === "event" ? pickFromEvent(json) : "";

  const jobs = out.map(async (item) => {
    if (item.avatar) return item;
    const url = endpoint(type, item.id);
    if (!url) return item;
    try {
      const res = await apiFetch(url);
      if (!res.ok) return item;
      const j = await res.json();
      const av = mapper(type, j);
      return av ? { ...item, avatar: av } : item;
    } catch {
      return item;
    }
  });

  return Promise.all(jobs);
}

// ---------- New Chat Dialog ----------
function NewChatDialog({ open, onClose, onOpened }) {
  const [tab, setTab] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [friends, setFriends] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [events, setEvents] = React.useState([]);

  const normalizeEvents = React.useCallback((json) => {
    const inArr = Array.isArray(json?.results) ? json.results : Array.isArray(json) ? json : [];
    const out = [];
    for (const x of inArr) {
      if (x?.id && (x?.title || x?.name)) {
        out.push({
          id: x.id,
          name: x.title || x.name || `Event #${x.id}`,
          avatar:
            pickImg(x, [
              "thumbnail", "poster", "logo_url",
              "cover_image", "banner_url", "banner", "cover", "header_image", "hero_image",
              "preview_image",
            ]) || "",
          status: x?.status || ev?.status || null,
          end_time: x?.end_time || ev?.end_time || null,
        });
        continue;
      }
      const ev = x?.event || x?.event_obj || null;
      if (ev && (ev.id || x.event_id)) {
        const id = ev.id || x.event_id;
        out.push({
          id,
          name: ev.title || ev.name || x.event_title || `Event #${id}`,
          avatar:
            pickImg(ev, [
              "thumbnail", "poster", "logo_url",
              "cover_image", "banner_url", "banner", "cover", "header_image", "hero_image",
              "preview_image",
            ]) || "",
          status: x?.status || ev?.status || null,
          end_time: x?.end_time || ev?.end_time || null,
        });
        continue;
      }
      if (x?.event_id) {
        const id = x.event_id;
        out.push({ id, name: x.event_title || `Event #${id}`, avatar: "", status: x?.status || null, end_time: x?.end_time || null });
      }
    }
    const seen = new Set();
    return out.filter((e) => (e.id && !seen.has(e.id) && seen.add(e.id)));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    onOpened?.();

    (async () => {
      setLoading(true);
      try {
        const fr = await apiFetch(`${API_ROOT}/friends/?page_size=100`);
        const frJson = await fr.json();
        const ff = (Array.isArray(frJson?.results) ? frJson.results : Array.isArray(frJson) ? frJson : [])
          .map((x) => {
            const id =
              x?.friend?.id ?? x?.id ?? x?.user_id ?? x?.user?.id;
            const name =
              x?.friend?.full_name ||
              x?.friend?.username ||
              x?.friend_name ||
              x?.name ||
              x?.user?.username ||
              "Friend";
            const avatar =
              pickImg(x, [
                "friend.profile.user_image",
                "friend.profile.avatar",
                "profile.user_image",
                "profile.avatar",
                "friend.avatar",
                "friend.image",
                "friend.photo",
                "avatar",
                "image",
                "friend.linkedin.picture_url",
              ]) || "";
            return { id, name, avatar };
          })
          .filter((x) => x.id);
        setFriends(ff);
        try { setFriends(await hydrateMissingAvatars(ff, "friend")); } catch { }

        // 🔒 Only load groups where the logged-in user is a member
        let gJson = [];
        try {
          const jg = await apiFetch(`${API_ROOT}/groups/joined-groups/`);
          if (jg.ok) {
            gJson = await jg.json();
          }
        } catch (e) {
          console.error("joined-groups load failed", e);
        }

        const rawGroups = Array.isArray(gJson?.results)
          ? gJson.results
          : Array.isArray(gJson)
            ? gJson
            : [];

        const gg = rawGroups
          .map((g) => {
            const id = g.id;
            const name = g.name || g.title || "Group";
            const avatar =
              pickImg(g, [
                "logo_url", "logo", "avatar", "image",
                "cover_image", "banner", "banner_url", "cover", "header_image", "hero_image",
              ]) || "";

            // everything returned by joined-groups is a group the user has joined
            const isMember = true;

            return { id, name, avatar, isMember };
          })
          // ✅ final safety: only keep groups that have a valid id
          .filter((g) => g.id && g.isMember);

        setGroups(gg);
        try {
          const hydrated = await hydrateMissingAvatars(gg, "group");
          setGroups(hydrated.filter((g) => g.id && g.isMember));
        } catch {
          // ignore failures
        }



        let meId = null;
        try {
          const meRes = await apiFetch(`${API_ROOT}/users/me/`);
          if (meRes.ok) {
            const meJson = await meRes.json();
            meId = meJson?.id || null;
          }
        } catch { }

        const candidates = [
          `${API_ROOT}/events/mine/`,
          `${API_ROOT}/event-registrations/mine/`,
          `${API_ROOT}/registrations/mine/`,
          `${API_ROOT}/event-registrations/?user=me`,
          meId ? `${API_ROOT}/event-registrations/?user=${meId}` : null,
        ].filter(Boolean);

        let evOut = [];
        try {
          const er = await apiFetch(ENDPOINTS.chatEvents());
          if (er.ok) {
            const ej = await er.json();
            evOut = normalizeEvents(ej);
          }
        } catch { }

        if (evOut.length === 0) {
          for (const url of candidates) {
            try {
              const r = await apiFetch(url);
              if (!r.ok) continue;
              const j = await r.json();
              const picked = normalizeEvents(j);
              if (picked.length) { evOut = picked; break; }
            } catch { }
          }
        }

        const now = Date.now();
        evOut = evOut.filter((e) => {
          const st = String(e?.status || "").toLowerCase();
          if (st === "ended") return true;

          if (!e?.end_time) return false;
          const t = Date.parse(e.end_time);
          return Number.isFinite(t) && t <= now;
        });

        setEvents(evOut);
        try { setEvents(await hydrateMissingAvatars(evOut, "event")); } catch { }
      } catch (e) {
        console.error("Load lists failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, normalizeEvents]);

  const list = React.useMemo(() => (tab === 0 ? friends : tab === 1 ? groups : events), [tab, friends, groups, events]);
  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((x) => (x.name || "").toLowerCase().includes(t));
  }, [q, list]);

  const placeholder = tab === 0 ? "Search friends…" : tab === 1 ? "Search groups…" : "Search events…";
  const secondary = tab === 0 ? "Direct message" : tab === 1 ? "Group chat" : "Event chat";

  return (
    <Dialog open={open} onClose={() => onClose?.()} fullWidth maxWidth="sm">
      <DialogTitle>Start a new chat</DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          <Tab label="Friends" />
          <Tab label="Groups" />
          <Tab label="Events" />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <List dense>
            {filtered.map((x) => (
              <ListItem
                key={`tab${tab}-${x.id}`}
                disableGutters
                sx={{ px: 1, py: 1, borderRadius: 2, cursor: "pointer", "&:hover": { bgcolor: "#fafafa" } }}
                onClick={async () => {
                  try {
                    if (tab === 0) {
                      const res = await apiFetch(`${MESSAGING}/conversations/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recipient_id: x.id }),
                      });
                      const convo = await res.json();
                      if (!res.ok) throw new Error(convo?.detail || "Unable to create DM");
                      onClose?.({ type: "dm", conversation: convo });
                    } else if (tab === 1) {
                      const res = await apiFetch(ENDPOINTS.ensureGroup(), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ group: x.id, title: x.name }),
                      });
                      const convo = await res.json();
                      if (!res.ok) throw new Error(convo?.detail || "Unable to create group chat");
                      onClose?.({ type: "group", conversation: convo });
                    } else {
                      const res = await apiFetch(`${MESSAGING}/conversations/ensure-event/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event: x.id, title: x.name }),
                      });
                      const convo = await res.json();
                      if (!res.ok) throw new Error(convo?.detail || "Unable to create event chat");
                      onClose?.({ type: "event", conversation: convo });
                    }
                  } catch (e) {
                    console.error(e);
                    onClose?.();
                  }
                }}
              >
                <ListItemAvatar sx={{ minWidth: 44 }}>
                  <Avatar src={absUrl(x.avatar)}>{(x.name || "X").slice(0, 1)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{x.name}</Typography>}
                  secondary={secondary}
                />
              </ListItem>
            ))}
            {filtered.length === 0 && (
              <Stack alignItems="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">No results</Typography>
              </Stack>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 🔹 Helper to resize images
const resizeImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) => {
  return new Promise((resolve) => {
    // If not an image, return original file
    if (!file.type.startsWith('image/')) {
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

        // Calculate new dimensions maintaining aspect ratio
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

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert back to file
        ctx.canvas.toBlob((blob) => {
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
    };
    reader.onerror = () => resolve(file);
  });
};

/** ---------- PAGE ---------- */
export default function MessagesPage() {
  const navigate = useNavigate();
  // 🔹 Responsive breakpoints
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));   // < 900px
  const isLaptop = useMediaQuery(theme.breakpoints.between("md", "lg"));  // 900–1199px
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));            // ≥ 1200px

  // For small screens: which pane to show: 'list' | 'chat'
  const [mobileView, setMobileView] = React.useState("list");

  // Details popup (members + attachments)
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  // LEFT: conversations list
  const [q, setQ] = React.useState("");
  const [threads, setThreads] = React.useState([]); // API: /conversations/
  const [activeId, setActiveId] = React.useState(null);
  const [newOpen, setNewOpen] = React.useState(false);

  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [cameraStream, setCameraStream] = React.useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const isFirstLoadRef = React.useRef(true);
  React.useEffect(() => {
    isFirstLoadRef.current = true;
  }, [activeId]);

  // CENTER: chat
  const [messages, setMessages] = React.useState([]); // API: /conversations/:id/messages/
  const [pinned, setPinned] = React.useState([]);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [menuMessage, setMenuMessage] = React.useState(null);
  const messageMenuOpen = Boolean(menuAnchorEl);
  const [pinsExpanded, setPinsExpanded] = React.useState(false);
  const [convMenuAnchor, setConvMenuAnchor] = React.useState(null);
  const [convMenuTarget, setConvMenuTarget] = React.useState(null);
  // 🔹 Attachment Menu State
  const [attachMenuAnchor, setAttachMenuAnchor] = React.useState(null);
  const isAttachMenuOpen = Boolean(attachMenuAnchor);
  const hasActiveChat = Boolean(activeId);

  // 🔹 Hidden Input Refs
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  // 🔹 Handlers
  const handleAttachClick = (event) => {
    setAttachMenuAnchor(event.currentTarget);
  };

  const handleAttachClose = () => {
    setAttachMenuAnchor(null);
  };

  const handleTriggerFileUpload = () => {
    handleAttachClose();
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleTriggerCamera = () => {
    handleAttachClose();
    // On mobile, you might still want the native input (optional), 
    // but for consistency let's use the modal or check strictly for desktop.
    setCameraOpen(true);
  };

  // 🔹 Handle actual file selection (Placeholder logic)
  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);

      // Resize all selected images before adding to state
      const processedFiles = await Promise.all(
        fileArray.map(f => resizeImage(f))
      );

      setDraftAttachments(prev => [...prev, ...processedFiles]);
      setActivePreviewIndex(0);
    }
    event.target.value = "";
  };

  // 1. Handle opening the context menu
  const handleConvContextMenu = (e, thread) => {
    e.preventDefault();
    setConvMenuTarget(thread);
    setConvMenuAnchor(e.currentTarget); // Or e.clientX/Y for precise position
  };

  const handleCloseConvMenu = () => {
    setConvMenuAnchor(null);
    setConvMenuTarget(null);
  };

  // 2. Handle the Pin API Call
  const handleTogglePinConversation = async () => {
    if (!convMenuTarget) return;
    const targetId = convMenuTarget.id;
    handleCloseConvMenu();

    try {
      const res = await apiFetch(`${MESSAGING}/conversations/${targetId}/toggle-pin/`, {
        method: "POST"
      });

      if (res.ok) {
        const data = await res.json();
        const isNowPinned = data.is_pinned;

        // Update local state immediately without full reload
        setThreads(prev => {
          const updated = prev.map(t =>
            t.id === targetId ? { ...t, is_pinned: isNowPinned } : t
          );

          // RE-SORT: Pinned first, then Newest Timestamp
          return updated.sort((a, b) => {
            const pinA = Boolean(a.is_pinned);
            const pinB = Boolean(b.is_pinned);
            if (pinA !== pinB) return pinA ? -1 : 1;

            return new Date(b._last_ts || 0) - new Date(a._last_ts || 0);
          });
        });
      }
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  };

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
      const key = String(mid);

      // Try to find the normalized message from `messages`
      const existing = byId.get(key);
      if (existing) {
        out.push(existing);
        continue;
      }

      // Fallback: if backend returned a nested `message` object
      if (p.message) {
        const m = p.message;
        const createdIso =
          m.created_at ?? m.created ?? m.timestamp ?? m.sent_at ?? m.createdOn;

        out.push({
          id: key,
          body: m.body ?? m.text ?? m.message ?? "",
          sender_id:
            m.sender_id ??
            m.user_id ??
            (typeof m.sender === "object" ? m.sender?.id : m.sender) ??
            (typeof m.user === "object" ? m.user?.id : m.user),
          sender_name:
            m.sender_name ?? m.sender_display ?? m.senderUsername ?? "",
          sender_display:
            m.sender_display ?? m.sender_name ?? m.senderUsername ?? "",
          sender_avatar:
            m.sender_avatar ??
            (typeof m.sender === "object" ? m.sender?.avatar : undefined) ??
            "",
          attachments: Array.isArray(m.attachments) ? m.attachments : [],
          mine: false,
          read_by_me: true,
          created_at: createdIso,
          _time: createdIso
            ? new Date(createdIso).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "",
        });
      }
    }

    return out;
  }, [pinned, messages]);


  const sections = React.useMemo(() => {
    const out = [];
    const by = new Map();

    const today = new Date();
    const yest = new Date(); yest.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const dlabel = (iso) => {
      const d = new Date(iso);
      if (sameDay(d, today)) return "Today";
      if (sameDay(d, yest)) return "Yesterday";
      return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(d);
    };

    for (const m of messages) {
      const key = dlabel(m.created_at || Date.now());
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(m);
    }

    for (const [label, arr] of by.entries()) {
      out.push({ label, items: arr });
    }

    out.sort((a, b) => new Date(a.items[0].created_at) - new Date(b.items[0].created_at));
    return out;
  }, [messages]);

  const [draft, setDraft] = React.useState("");
  const [draftAttachments, setDraftAttachments] = React.useState([]);

  const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);

  // attachments summary
  const attachmentSummary = React.useMemo(() => {
    const out = {
      document: { key: 'document', icon: <DescriptionOutlinedIcon fontSize="small" />, label: 'Documents', count: 0 },
      photo: { key: 'photo', icon: <ImageOutlinedIcon fontSize="small" />, label: 'Photos', count: 0 },
      video: { key: 'video', icon: <VideoFileOutlinedIcon fontSize="small" />, label: 'Videos', count: 0 },
      other: { key: 'other', icon: <FolderOpenOutlinedIcon fontSize="small" />, label: 'Other', count: 0 },
    };
    const isExt = (u, list) => {
      const ext = (u || "").split(".").pop()?.toLowerCase();
      return !!ext && list.includes(ext);
    };
    for (const m of messages) {
      for (const a of (m.attachments || [])) {
        const url = a.url || "";
        const mime = (a.mimetype || a.type || "").toLowerCase();
        let bucket = 'other';
        if (mime.startsWith('image/') || isExt(url, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'])) bucket = 'photo';
        else if (mime.startsWith('video/') || isExt(url, ['mp4', 'mov', 'mkv', 'webm'])) bucket = 'video';
        else if (mime.startsWith('application/') || isExt(url, ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'])) bucket = 'document';
        out[bucket].count += 1;
      }
    }
    return Object.values(out);
  }, [messages]);

  const [me, setMe] = React.useState(null);
  const [topMembers, setTopMembers] = React.useState([]);
  const [rosterMap, setRosterMap] = React.useState({});
  const [membersLoading, setMembersLoading] = React.useState(false);
  const membersReqIdRef = React.useRef(0);

  // 🔹 Whether the current user is allowed to send messages to the ACTIVE group
  // (for WhatsApp-style "Only admins can send messages" mode)
  const [canSendToActiveGroup, setCanSendToActiveGroup] = React.useState(true);
  // 'all' | 'admins_only' | null (null = unknown/not a group)
  const [activeMessageMode, setActiveMessageMode] = React.useState(null);
  // 🔹 all group IDs where the CURRENT user is a member
  const joinedGroupIdsRef = React.useRef(null);
  // 🔹 all event IDs where the CURRENT user is registered
  const registeredEventIdsRef = React.useRef(null);

  const active = React.useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );


  // --- READ RECEIPT: throttle controls ---
  const markCooldown = React.useRef(false);
  const markAllReadInFlight = React.useRef(false);

  // mark all read call (idempotent)
  const markAllReadNow = React.useCallback(async () => {
    if (!activeId) return;
    if (markAllReadInFlight.current) return;
    markAllReadInFlight.current = true;
    try {
      const r = await postJSON(ENDPOINTS.convMarkAllRead(activeId));
      // Drop unread badge for this conversation immediately
      setThreads((cur) => {
        const next = cur.map((t) =>
          t.id === activeId ? { ...t, unread_count: 0 } : t
        );
        const totalUnread = next.reduce(
          (sum, th) => sum + (th?.unread_count || 0),
          0
        );
        emitUnreadMessages(totalUnread);
        return next;
      });
      // Flip local messages' read_by_me (for UI)
      setMessages((cur) => cur.map((m) => (m.mine ? m : { ...m, read_by_me: true })));

    } catch (e) {
      // ignore errors silently; it's idempotent anyway
    } finally {
      markAllReadInFlight.current = false;
    }
  }, [activeId]);

  // debounced helper: avoid hammering endpoint while scrolling/polling
  const markAllReadDebounced = React.useCallback(() => {
    if (markCooldown.current) return;
    markCooldown.current = true;
    markAllReadNow();
    setTimeout(() => { markCooldown.current = false; }, 800);
  }, [markAllReadNow]);

  const loadRoster = React.useCallback(async () => {
    try {
      const res = await apiFetch(`${API_ROOT}/users/roster/`);
      if (!res.ok) {
        console.warn("roster load failed", res.status);
        return;
      }
      const data = await res.json();
      const map = {};

      (Array.isArray(data) ? data : []).forEach((u) => {
        if (!u) return;

        // user id can come as id / user_id / user.id
        const id =
          u.id ??
          u.user_id ??
          (typeof u.user === "object" ? u.user.id : null);

        if (!id) return;

        // store with the real user id
        map[String(id)] = { ...u, id };
      });

      setRosterMap(map);
    } catch (e) {
      console.error("roster load failed", e);
    }
  }, []);

  const loadConversations = React.useCallback(async () => {
    try {
      const res = await apiFetch(ENDPOINTS.conversations());
      if (res.status === 401) {
        console.warn("Not authenticated for conversations");
        return;
      }
      const raw = await res.json();
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.results)
          ? raw.results
          : [];

      if (Array.isArray(data)) {
        // 🔒 helper: hide any GROUP conversation where the logged-in user is NOT a member
        const isGroupConversationNotMember = (t) => {
          const g = t.group || t.context_group || t.chat_group || null;
          const gid =
            g?.id ??
            t.group_id ??
            t.context_group_id ??
            t.context_id ??
            null;

          // if no group id, it's not a group chat → don't filter here
          if (!gid) return false;

          const joinedIds = joinedGroupIdsRef.current;

          // if we haven't loaded joined-groups yet, don't hide anything
          if (!joinedIds) return false;

          // ✅ core rule: only allow group conversations whose group_id is in joined-groups
          return !joinedIds.has(String(gid));
        };

        // 🔒 helper: hide any EVENT conversation where the logged-in user is NOT registered
        const isEventConversationNotRegistered = (t) => {
          // event can come as: t.event (id), t.event_id, or nested object in some shapes
          const e =
            t.event ??
            t.context_event ??
            t.chat_event ??
            null;

          const eid =
            (typeof e === "object" ? e?.id : e) ??
            t.event_id ??
            t.context_event_id ??
            null;

          // if no event id, it's not an event chat → don't filter here
          if (!eid) return false;

          const registeredIds = registeredEventIdsRef.current;

          // if we haven't loaded registrations yet, don't hide anything
          if (!registeredIds) return false;

          // ✅ core rule: only allow event conversations whose event_id is in my registrations
          return !registeredIds.has(String(eid));
        };

        // ✅ drop any group conversations where the current user is NOT a member
        // ✅ drop any event conversations where the current user is NOT registered
        const filteredData = data.filter(
          (t) => !isGroupConversationNotMember(t) && !isEventConversationNotRegistered(t)
        );

        setThreads((prev) => {
          const byId = new Map(prev.map((p) => [String(p.id), p]));

          const normalized = filteredData
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
              // 1. Priority: Pinned status (True comes first)
              const pinA = Boolean(a.is_pinned);
              const pinB = Boolean(b.is_pinned);
              if (pinA !== pinB) return pinA ? -1 : 1;

              // 2. Priority: Time (Newest first)
              return new Date(b._last_ts || 0) - new Date(a._last_ts || 0);
            });
          return normalized;
        });

        // 👉 broadcast total unread to sidebar (only for visible conversations)
        const totalUnread = filteredData.reduce(
          (sum, t) => sum + (t?.unread_count || 0),
          0
        );
        emitUnreadMessages(totalUnread);
      }
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }, [activeId]);


  // Resolve group key from many possible shapes, then navigate
  const resolveActiveGroup = React.useCallback(() => {
    // active.group can be:
    //   - full group object  → { id, slug, ... }
    //   - plain PK number    → 3
    //   - string id/slug     → "3" or "main-group"
    const raw = active?.group ?? active?.context_group ?? null;

    let gid = null;
    let gslug = null;

    if (raw && typeof raw === "object") {
      gid = raw.id ?? null;
      gslug = raw.slug ?? null;
    } else if (typeof raw === "number" || typeof raw === "string") {
      // If backend sent just the pk, use it directly as id
      gid = raw;
    }

    return {
      id:
        active?.group_id ??
        gid ??
        active?.context_group_id ??
        active?.context_id ??
        null,
      slug:
        active?.group_slug ??
        gslug ??
        active?.context_slug ??
        null,
    };
  }, [active]);


  const hasActiveGroup = React.useMemo(() => {
    const { id, slug } = resolveActiveGroup();
    return Boolean(id || slug);
  }, [resolveActiveGroup]);

  // When this is true, we should show "Only admins can send messages" instead of input
  // If server told us the mode, prefer it. Otherwise fall back to ok-flag only.
  const groupReadOnly = hasActiveGroup && (
    activeMessageMode
      ? (activeMessageMode === "admins_only" && !canSendToActiveGroup) // members blocked, admins allowed
      : !canSendToActiveGroup
  );

  React.useEffect(() => {
    // No conversation → clear pins
    if (!activeId) {
      setPinned([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch(
          `${MESSAGING}/conversations/${activeId}/pinned-messages/`
        );

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

        if (!cancelled) {
          setPinned(arr);
        }
      } catch (err) {
        console.error("Failed to fetch pinned messages", err);
        if (!cancelled) setPinned([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // 🔹 Check if current user can send messages to the ACTIVE group
  // Uses: GET /api/groups/{id}/can-send/ → { ok, reason, message_mode }

  // Start Camera when modal opens
  React.useEffect(() => {
    if (cameraOpen) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera access denied:", err);
          alert("Could not access camera. Please allow permissions.");
          setCameraOpen(false);
        }
      })();
    } else {
      // Stop Camera when modal closes
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    }
  }, [cameraOpen]);

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Resize Logic
    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 1280;
    let width = video.videoWidth;
    let height = video.videoHeight;

    // Calculate aspect ratio
    if (width > height) {
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }
    }

    // Set canvas to new small size
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    // Draw image scaled down
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });

      setDraftAttachments([file]);
      setCameraOpen(false);
    }, "image/jpeg", 0.8); // 0.8 quality (80%)
  };

  // 🔹 NEW: Clear attachments
  const handleClearAttachments = () => {
    setDraftAttachments([]);
    setDraft("");
    setActivePreviewIndex(0); // Reset
  };

  const handleCloseCamera = () => {
    setCameraOpen(false);
  };

  React.useEffect(() => {
    loadRoster();
    const iv = setInterval(loadRoster, 60000); // refresh every 60s
    return () => clearInterval(iv);
  }, [loadRoster]);

  React.useEffect(() => {
    const { id: groupId, slug: groupSlug } = resolveActiveGroup();
    const key = groupId || groupSlug;  // support id OR slug

    // If there is no group (DM / event / nothing selected), allow sending
    if (!key) {
      setCanSendToActiveGroup(true);
      setActiveMessageMode(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch(`${API_ROOT}/groups/${key}/can-send/`);
        if (!res.ok) {
          // Fail-open: if probe fails, don't block chat
          if (!cancelled) {
            setCanSendToActiveGroup(true);
            setActiveMessageMode(null);
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        // data.ok → whether THIS user can send (admins get true even in admins_only)
        setCanSendToActiveGroup(Boolean(data?.ok ?? true));
        // capture exact server mode for UI logic
        setActiveMessageMode(data?.message_mode ?? null);
      } catch (err) {
        console.error("Failed to check can-send for group", err);
        if (!cancelled) {
          setCanSendToActiveGroup(true);
          setActiveMessageMode(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [activeId, resolveActiveGroup]);






  const openActiveGroup = React.useCallback(() => {
    const { id, slug } = resolveActiveGroup();
    if (!id && !slug) return;
    navigate(groupPath({ id, slug }));
  }, [navigate, resolveActiveGroup]);

  // Go to a member's profile page
  const openUserProfile = React.useCallback((uid) => {
    if (!uid) return;
    navigate(userProfilePath(uid));
  }, [navigate]);

  React.useEffect(() => {
    (async () => {
      try {
        // registrations endpoint (DRF paginated or plain)
        const res = await apiFetch(`${API_ROOT}/event-registrations/mine/`);
        if (!res.ok) return;

        const json = await res.json();
        const arr = Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json)
            ? json
            : [];

        // event id can be: r.event.id (your serializer), or fallback shapes
        const ids = new Set(
          arr
            .map((r) => String(r?.event?.id ?? r?.event_id ?? r?.event ?? ""))
            .filter(Boolean)
        );

        registeredEventIdsRef.current = ids;

        // re-apply filter once we know registrations
        loadConversations();
      } catch (e) {
        console.error("Failed to load event registrations", e);
      }
    })();
  }, [loadConversations]);

  // 🔹 Load all groups where THIS user is a member
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_ROOT}/groups/joined-groups/`);
        if (!res.ok) return;
        const json = await res.json();
        const arr = Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json)
            ? json
            : [];
        const ids = new Set(arr.map((g) => String(g.id)));
        joinedGroupIdsRef.current = ids;
        // re-apply filter on conversations once we know membership
        loadConversations();
      } catch (e) {
        console.error("Failed to load joined groups", e);
      }
    })();
  }, [loadConversations]);

  React.useEffect(() => { loadConversations(); }, [loadConversations]);

  // load me
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_ROOT}/users/me/`);
        if (res.ok) {
          const data = await res.json();
          setMe(data);
        }
      } catch (e) {
        console.error("Load me failed", e);
      }
    })();
  }, []);

  // fetch messages for active thread

  // fetch messages for active thread
  const loadMessages = React.useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await apiFetch(ENDPOINTS.conversationMessages(activeId));
      if (!res.ok) { console.error("Messages load failed", res.status); return; }
      const payload = await res.json();

      // Accept many possible server shapes:
      // - DRF pagination:   { results: [...] }
      // - Our custom:       { items: [...] } or { messages: [...] } or { data: [...] }
      // - Bare array:       [ ... ]
      const rowsRaw =
        (Array.isArray(payload?.results) && payload.results) ||
        (Array.isArray(payload?.items) && payload.items) ||
        (Array.isArray(payload?.messages) && payload.messages) ||
        (Array.isArray(payload?.data) && payload.data) ||
        (Array.isArray(payload) && payload) ||
        [];

      // Normalize fields used by the UI  ✅ sets "mine"
      const mapped = rowsRaw.map((m) => {
        const senderId =
          m.sender_id ??
          m.user_id ??
          (typeof m.sender === "object" ? m.sender?.id : m.sender) ??
          (typeof m.user === "object" ? m.user?.id : m.user);

        const createdIso =
          m.created_at ?? m.created ?? m.timestamp ?? m.sent_at ?? m.createdOn;

        // >>> THE IMPORTANT BIT: decide if this message is mine (logged-in user)
        const isMine = me
          ? String(senderId) === String(me.id)
          : Boolean(m.mine);

        return {
          id: m.id ?? m.pk ?? m.uuid ?? String(Math.random()),
          body: m.body ?? m.text ?? m.message ?? "",
          sender_id: senderId,
          sender_name: m.sender_name ?? m.sender_display ?? m.senderUsername ?? "",
          sender_display: isMine
            ? "You"
            : (m.sender_display ?? m.sender_name ?? m.senderUsername ?? ""),
          sender_avatar:
            m.sender_avatar ??
            (typeof m.sender === "object" ? m.sender?.avatar : undefined) ??
            "",

          attachments: Array.isArray(m.attachments) ? m.attachments : [],
          read_by_me: Boolean(m.read_by_me ?? m.seen ?? m.is_read),

          // ✅ include mine flag so Bubble can right-align like WhatsApp
          mine: isMine,

          created_at: createdIso,
          _time: createdIso
            ? new Date(createdIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
        };
      });

      setMessages(mapped);
      // 🔧 Update the active conversation row's last-time from the newest message
      const last = mapped[mapped.length - 1];
      const lastIso = last?.created_at || null;

      if (lastIso) {
        setThreads((cur) =>
          cur
            .map((t) => {
              if (t.id !== activeId) return t;
              const prevTs = t._last_ts;
              const better =
                new Date(lastIso || 0).getTime() >= new Date(prevTs || 0).getTime()
                  ? lastIso
                  : prevTs;
              return {
                ...t,
                _last_ts: better,
                last_message: last?.body ?? t.last_message,
                last_message_created_at: better || t.last_message_created_at,
              };
            })
            .sort((a, b) => {
              const pinA = Boolean(a.is_pinned);
              const pinB = Boolean(b.is_pinned);

              // 1. Pinned items go to top
              if (pinA !== pinB) return pinA ? -1 : 1;

              // 2. Then sort by time
              return new Date(b._last_ts || 0) - new Date(a._last_ts || 0);
            })
        );
      }


      // 1. Scroll Logic (Updated to handle First Load)
      requestAnimationFrame(() => {
        const el = document.getElementById("chat-scroll");
        if (!el) return;

        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNearBottom = distanceFromBottom < 80;

        // 🟢 FIX: Scroll if it's the first load OR if user is already near bottom
        if (isFirstLoadRef.current || isNearBottom) {
          el.scrollTop = el.scrollHeight;
          isFirstLoadRef.current = false; // Mark first load as complete
        }
      });

      // 2. Mark inbound bubbles as read once ~60% visible
      requestAnimationFrame(() => {
        const container = document.getElementById("chat-scroll");
        if (!container) return;

        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const mid = el.getAttribute("data-mid");
            const mine = el.getAttribute("data-mine") === "1";
            const byme = el.getAttribute("data-readbyme") === "1";
            if (!mid || mine || byme) return;

            markMessageRead(mid); // fire-and-forget
            el.setAttribute("data-readbyme", "1");
            io.unobserve(el);
          });
        }, { root: container, threshold: 0.6 });

        container.querySelectorAll("[data-mid]").forEach((n) => io.observe(n));
      });

      // (Deleted duplicate scroll block here)

      // Important: immediately mark-all-read for visible conversation
      markAllReadDebounced();
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }, [activeId, me, markAllReadDebounced]);


  // initial + polling
  React.useEffect(() => {
    if (!activeId) return;
    loadMessages();                          // load now
    const iv = setInterval(loadMessages, 4000); // then poll
    return () => clearInterval(iv);
  }, [activeId, loadMessages]);

  // light polling to refresh conversation list (last message / unread)
  React.useEffect(() => {
    const iv = setInterval(loadConversations, 10000);
    return () => clearInterval(iv);
  }, [loadConversations]);

  const normalizeMember = (p) => ({
    id:
      p.id ?? p.user_id ?? p.user?.id ?? p.pk ?? null,
    name:
      p.name ?? p.display_name ?? p.username ??
      p.user?.full_name ?? p.user?.username ?? "Member",
    avatar:
      p.avatar ?? p.user?.avatar ?? p.profile?.user_image ?? "",
    role:
      p.role ?? p.membership_role ?? (p.is_host ? "Host" : undefined),
    is_you: Boolean(p.is_you || p.is_me || p.me || p.user?.is_me),
  });

  const dedupeMembers = (arr) => {
    const byId = new Map();
    const rank = { Host: 4, Owner: 4, Admin: 3, Moderator: 2, Member: 1, undefined: 0, null: 0 };

    for (const raw of arr) {
      const m = normalizeMember(raw);
      const key = m.id || `${m.name}|${m.avatar}`; // fallback key if id missing
      const prev = byId.get(key);
      if (!prev) {
        byId.set(key, m);
      } else {
        // merge duplicates: keep best role, keep avatar if missing, keep "You" if any copy has it
        const merged = { ...prev };
        if (m.is_you) merged.is_you = true;
        if ((rank[m.role] || 0) > (rank[merged.role] || 0)) merged.role = m.role;
        if (!merged.avatar && m.avatar) merged.avatar = m.avatar;
        byId.set(key, merged);
      }
    }

    // 🔹 CHANGE: Sort array so "You" is always index 0
    return [...byId.values()].sort((a, b) => {
      if (a.is_you) return -1;
      if (b.is_you) return 1;
      return 0;
    });
  };

  const loadMembers = React.useCallback(async (cid) => {
    if (!cid) return;

    const reqId = ++membersReqIdRef.current;
    setMembersLoading(true);
    setTopMembers([]);

    try {
      const res = await apiFetch(ENDPOINTS.conversationMembers(cid));
      if (reqId !== membersReqIdRef.current) return; // stale request

      if (!res.ok) {
        setTopMembers([]);
        return;
      }

      const raw = await res.json();
      const list = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.results) ? raw.results : []);

      setTopMembers(dedupeMembers(list));
    } catch (e) {
      if (reqId !== membersReqIdRef.current) return;
      console.error("members load failed", e);
      setTopMembers([]);
    } finally {
      if (reqId === membersReqIdRef.current) setMembersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!activeId) {
      membersReqIdRef.current += 1; // invalidate any in-flight request
      setMembersLoading(false);
      setTopMembers([]);
      return;
    }
    loadMembers(activeId);
  }, [activeId, loadMembers]);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return threads;
    return threads.filter((th) => (th.display_title || "").toLowerCase().includes(t));
  }, [q, threads]);

  const handleSend = async () => {
    const text = draft.trim();

    // 1. Check if there is text OR an attachment
    if ((!text && draftAttachments.length === 0) || !activeId) return;

    if (groupReadOnly) {
      console.warn("Sending disabled: only admins can send messages in this group.");
      return;
    }

    const now = new Date();
    const nowStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const localMsg = {
      id: "local-" + Date.now(),
      body: text,
      mine: true,
      sender_id: me?.id,
      sender_avatar: me?.profile?.user_image || me?.avatar || "",
      sender_display: "You",
      created_at: now.toISOString(),
      _time: nowStr,
      // 2. Add attachments to local message for immediate display
      attachments: draftAttachments.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type
      }))
    };

    setMessages((cur) => [...cur, localMsg]);

    // 3. Clear inputs immediately (this closes the Preview Overlay)
    const filesToSend = [...draftAttachments];
    setDraft("");
    setDraftAttachments([]);

    requestAnimationFrame(() => {
      const el = document.getElementById("chat-scroll");
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      // Note: You need to implement actual file upload logic here (e.g. using FormData)
      // For now, this sends the text and an empty attachment array to the backend
      const formData = new FormData();
      formData.append("body", text);

      // Append each file. Key must be 'attachments' to match Django logic
      draftAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      // 4. API Call 
      // IMPORTANT: Remove 'Content-Type' header so browser sets multipart boundary
      const res = await apiFetch(ENDPOINTS.conversationMessages(activeId), {
        method: "POST",
        headers: {},
        body: formData,
      });

      const saved = await res.json();
      if (!res.ok) throw new Error(saved?.detail || "Send failed");

      setMessages((cur) =>
        cur.map((m) =>
          m.id === localMsg.id
            ? {
              ...saved,
              mine: true,
              _time: saved.created_at
                ? new Date(saved.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : nowStr,
            }
            : m
        )
      );

      const hasAttachments = filesToSend.length > 0;
      const previewText = saved.body
        ? saved.body
        : (hasAttachments
          ? (filesToSend[0].type?.startsWith("image/") ? "📷 Photo" : "📎 Sent an attachment")
          : "Sent a message");

      setThreads((cur) =>
        cur
          .map((t) =>
            t.id === activeId
              ? {
                ...t,
                // 🔹 UPDATE ALL FIELDS so the UI doesn't use old cached text
                last_message: previewText,
                last_message_text: previewText,
                last_text: previewText,

                // Update timestamps
                last_message_created_at: saved.created_at || new Date().toISOString(),
                _last_ts: saved.created_at || new Date().toISOString(),
                updated_at: saved.created_at || new Date().toISOString(), // Move to top
                unread_count: 0,
              }
              : t
          )
          .sort((a, b) => {
            const pinA = Boolean(a.is_pinned);
            const pinB = Boolean(b.is_pinned);
            if (pinA !== pinB) return pinA ? -1 : 1;
            return new Date(b._last_ts || 0) - new Date(a._last_ts || 0);
          })
      );

    } catch (e) {
      console.error(e);
    }
  };

  // Hide global footer on this page
  React.useEffect(() => {
    const sels = ["footer", "#footer", "#site-footer", ".site-footer", ".app-footer", "#app-footer"];
    const els = sels.flatMap((s) => Array.from(document.querySelectorAll(s)));
    const prev = new Map();
    els.forEach((el) => {
      prev.set(el, el.style.display);
      el.style.display = "none";
    });
    return () => {
      els.forEach((el) => {
        el.style.display = prev.get(el) || "";
      });
    };
  }, []);

  // scroll listener: if near bottom, mark-all-read (new inbound messages)
  React.useEffect(() => {
    const el = document.getElementById("chat-scroll");
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      if (nearBottom) markAllReadDebounced();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeId, markAllReadDebounced]);

  const topTitle = (active?.group?.name)
    || active?.display_title
    || (active && isDmThread(active) ? "Direct Message" : "Conversation");

  const topLogo =
    active?.context_logo
    || active?.context_cover
    || active?.group_cover
    || active?.event_cover
    || "";

  // Presence line for DM chats: "online" or "last seen ..."
  const dmPresence = React.useMemo(() => {
    if (!active || !isDmThread(active)) return null;
    if (!topMembers || topMembers.length === 0) return null;

    // pick the "other" member (not me)
    let other =
      topMembers.find((m) => m.is_you === false && m.id) || null;

    if (!other && me) {
      other = topMembers.find(
        (m) => m.id && String(m.id) !== String(me.id)
      ) || null;
    }

    if (!other) {
      other = topMembers.find((m) => m.id) || null;
    }
    if (!other || !other.id) return null;

    const entry = rosterMap[String(other.id)];
    const prof = entry?.profile;
    if (!prof) return null;

    if (prof.is_online) {
      return { label: "online", isOnline: true };
    }

    if (!prof.last_activity_at) return null;

    return {
      label: formatLastSeen(prof.last_activity_at),
      isOnline: false,
    };
  }, [active, topMembers, rosterMap, me]);

  const MemberRowSkeleton = () => (
    <Stack direction="row" spacing={1} alignItems="center">
      <Skeleton variant="circular" width={28} height={28} />
      <Skeleton variant="text" width="60%" height={20} />
      <Box sx={{ ml: "auto" }}>
        <Skeleton variant="rounded" width={56} height={20} sx={{ borderRadius: 999 }} />
      </Box>
    </Stack>
  );

  // 🔹 Reusable "details" content (Members + Attachments)
  const renderDetailsContent = () => {

    // 1. Determine if this is a DM or Group
    const isGroupChat = active && !isDmThread(active);

    // 2. Find the current user's role in this chat
    const myMemberProfile = topMembers.find((m) => m.is_you);

    // 3. Define valid Admin roles based on your Backend models + Frontend normalization
    // Backend (GroupMembership) returns: 'admin', 'moderator', 'member'
    // Frontend (dedupeMembers) might map 'Host' for events.
    const adminRoles = ["admin", "Admin", "owner", "Owner", "host", "Host"];

    const isAdmin = myMemberProfile && adminRoles.includes(myMemberProfile.role);

    // 4. Final condition: Must be a group AND user must be admin
    const canAddMembers = isGroupChat && isAdmin;

    return (
      <Stack spacing={1.25}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            cursor: hasActiveGroup ? "pointer" : "default",
            "&:hover": hasActiveGroup ? { textDecoration: "underline" } : undefined,
          }}
          onClick={hasActiveGroup ? openActiveGroup : undefined}
        >
          {topTitle}
        </Typography>
        <Accordion disableGutters defaultExpanded sx={{ border: "none", boxShadow: "none" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Members
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>

            {/* 🟢 CONDITIONAL RENDERING HERE */}
            {canAddMembers && (
              <Button
                size="small"
                startIcon={<PersonAddAltOutlinedIcon />}
                sx={{ mb: 1, textTransform: "none" }}
                onClick={() => {
                  // logic to open add member dialog goes here
                  console.log("Open Add Member Dialog");
                }}
              >
                Add Member
              </Button>
            )}

            <Stack spacing={1}>
              {membersLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <MemberRowSkeleton key={`members-skel-${idx}`} />
                ))
              ) : topMembers.length > 0 ? (
                topMembers.map((p) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    role="button"
                    tabIndex={0}
                    sx={{ cursor: "pointer" }}
                    onClick={() => { if (p.id) openUserProfile(p.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && p.id) openUserProfile(p.id); }}
                    title="Open user profile"
                  >
                    <Avatar
                      src={p.avatar}
                      sx={{ width: 28, height: 28, cursor: "pointer" }}
                      onClick={() => openUserProfile(p.id)}
                    />
                    <Typography
                      variant="body2"
                      sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                      onClick={() => openUserProfile(p.id)}
                    >
                      {/* Display "You" if it's the current user, otherwise the name */}
                      {p.is_you ? "You" : p.name}
                    </Typography>
                    <Box sx={{ ml: "auto" }}>
                      {/* 🔹 CHANGE: Only show role if it exists AND is NOT "Member" */}
                      {p.role && p.role.toLowerCase() !== "member" ? (
                        <Chip size="small" variant="outlined" label={p.role} sx={CHIP_TINY_SX} />
                      ) : null}
                    </Box>
                  </Stack>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No members found
                </Typography>
              )}
            </Stack>


          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters defaultExpanded sx={{ border: "none", boxShadow: "none" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Attachments
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1}>
              {attachmentSummary.map((a) => (
                <Stack key={a.key} direction="row" spacing={1} alignItems="center">
                  {a.icon}
                  <Typography variant="body2">{a.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {a.count} file{a.count === 1 ? "" : "s"}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    );
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
    if (!menuMessage || !activeId) {
      handleCloseMessageMenu();
      return;
    }

    const currentlyPinned = isMessagePinned(menuMessage.id);

    const url = currentlyPinned
      ? `${MESSAGING}/conversations/${activeId}/unpin-message/`
      : `${MESSAGING}/conversations/${activeId}/pin-message/`;

    // 1. Check if this is a group chat
    const { id: groupId } = resolveActiveGroup();
    const isGroupChat = Boolean(groupId);

    // 2. Determine Scope
    // Default to 'global' for DMs. For groups, check role.
    let pinScope = 'global';

    if (isGroupChat) {
      // Find my member object from the topMembers list to check role
      const meMember = topMembers.find((m) => m.is_you);
      const myRole = meMember?.role; // e.g., "Host", "Admin", "Moderator", "Member"

      // Allow global pins only for these roles
      const canGlobalPin = ["Host", "Owner", "Admin", "Moderator"].includes(myRole);

      pinScope = canGlobalPin ? 'global' : 'private';
    }

    try {
      const res = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: menuMessage.id,
          scope: pinScope // 👈 Sending the scope to backend
        }),
      });

      if (!res.ok) {
        console.error("Pin/unpin failed", res.status);
      } else {
        // Reload pinned list
        try {
          const r = await apiFetch(
            `${MESSAGING}/conversations/${activeId}/pinned-messages/`
          );
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
    if (!menuMessage || !activeId) {
      handleCloseMessageMenu();
      return;
    }

    try {
      // 🔴 OLD (Caused 404): `${MESSAGING}/conversations/${activeId}/${menuMessage.id}/`
      // 🟢 NEW (Correct): Added "/messages/"
      const res = await apiFetch(
        `${MESSAGING}/conversations/${activeId}/messages/${menuMessage.id}/`,
        { method: "DELETE" }
      );

      if (!res.ok && res.status !== 204) {
        console.error("Delete message failed", res.status);
      } else {
        // Remove from UI immediately
        setMessages((curr) => curr.filter((m) => m.id !== menuMessage.id));

        // Refresh pinned messages in case the deleted one was pinned
        try {
          const r = await apiFetch(
            `${MESSAGING}/conversations/${activeId}/pinned-messages/`
          );
          if (r.ok) {
            const json = await r.json();
            const arr = Array.isArray(json?.results) ? json.results : (Array.isArray(json) ? json : []);
            setPinned(arr);
          }
        } catch (e) {
          console.error("Failed to refresh pinned after delete", e);
        }
      }
    } catch (err) {
      console.error("Delete message error", err);
    } finally {
      handleCloseMessageMenu();
    }
  };



  return (
    <>
      <NewChatDialog
        open={newOpen}
        onOpened={() => { }}
        onClose={async (result) => {
          setNewOpen(false);
          if (!result?.conversation) return;
          await loadConversations();
          const newId = result.conversation?.id;
          if (newId) setActiveId(newId);
        }}
      />

      <Grid
        container
        rowSpacing={2}
        columnSpacing={{ xs: 0, md: 2 }}   // 🔹 no side gap on mobile/tablet
        sx={{
          width: "100%",
        }}
      >
        {/* LEFT: Conversation list */}
        <Grid
          item
          xs={12}
          md={3}
          sx={{
            // Mobile / tablet: only show when in "list" mode
            display: {
              xs: mobileView === "list" ? "block" : "none",
              md: "block", // from md and up, list is always visible
            },
          }}
        >
          <Paper
            sx={{
              p: 1.5,
              border: `1px solid ${BORDER}`,
              borderRadius: 3,
              height: PANEL_H,
              display: "flex",
              flexDirection: "column",

              // 🔹 137% width on mobile (xs), normal 100% on tablet & up
              width: { xs: "137%", sm: "250%", md: "100%" },
              maxWidth: "none",

              // optional: recentre the block so it doesn’t look shifted
              ml: { xs: "-1.0%", sm: 0 }, // half of extra 37% = 18.5%
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Messages</Typography>
              <IconButton size="small"><AttachFileOutlinedIcon fontSize="small" /></IconButton>
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

            <Typography variant="caption" sx={{ mt: 1, mb: 0.5, display: "block", color: "text.secondary" }}>
              All Message
            </Typography>
            <List dense sx={{ flex: 1, overflowY: "auto" }}>
              {filtered.map((t) => {
                const isActive = t.id === activeId;
                let showOnline = false;

                if (isDmThread(t)) {
                  // ✅ Always decide from rosterMap (no need to open chat first)
                  const partnerId = getDmPartnerId(t, me, rosterMap);
                  if (partnerId) {
                    const entry = rosterMap[String(partnerId)];
                    const prof = entry?.profile;
                    if (prof?.is_online) {
                      showOnline = true;
                    }
                  }
                }

                return (
                  <ConversationRow
                    key={t.id}
                    thread={t}
                    active={isActive}
                    online={showOnline}
                    onClick={() => {
                      setActiveId(t.id);
                      if (isMobileOrTablet) {
                        setMobileView("chat");
                      }
                    }}
                    onContextMenu={(e) => handleConvContextMenu(e, t)}
                  />
                );
              })}

            </List>

            <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => setNewOpen(true)}>
              New Chat
            </Button>
          </Paper>
        </Grid>

        {/* CENTER: Chat */}
        <Grid
          item
          xs={12}
          md={9}
          sx={{
            display: {
              xs: mobileView === "chat" ? "block" : "none",
              md: "block", // from md and up, chat is always visible
            },
          }}
        >
          <Box
            sx={{
              height: PANEL_H,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              // 🔹 full width on mobile / tablet
              width: { xs: "105%", sm: "185%", md: "149%" },
              maxWidth: "none",  // no cap on tablet/mobile
            }}
          >
            {!activeId ? (
              <Paper
                sx={{
                  flex: 1,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  px: 3,
                  background:
                    "radial-gradient(1200px circle at 30% 0%, rgba(99,102,241,0.10), transparent 55%), radial-gradient(1000px circle at 80% 30%, rgba(20,184,166,0.10), transparent 55%)",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Select a conversation on the left or use{" "}
                  <Box component="span" sx={{ fontWeight: 800 }}>
                    New chat
                  </Box>{" "}
                  to start one.
                </Typography>
              </Paper>
            ) : (
              <>
                {/* Top bar */}
                <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    {/* CLICKABLE: group avatar + name */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      role={hasActiveGroup ? "button" : undefined}
                      tabIndex={hasActiveGroup ? 0 : -1}
                      sx={{ cursor: hasActiveGroup ? "pointer" : "default", outline: "none" }}
                      onClick={hasActiveGroup ? openActiveGroup : undefined}
                      onKeyDown={(e) => { if (e.key === "Enter" && hasActiveGroup) openActiveGroup(); }}
                      title={hasActiveGroup ? "Open group details" : undefined}
                    >
                      {/* 🔙 Back button on Mobile / Tablet */}
                      {isMobileOrTablet && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileView("list");
                          }}
                        >
                          <ArrowBackRoundedIcon fontSize="small" />
                        </IconButton>
                      )}

                      <Avatar
                        src={topLogo}
                        sx={{ width: 40, height: 40, cursor: hasActiveGroup ? "pointer" : "default" }}
                        onClick={hasActiveGroup ? openActiveGroup : undefined}
                      >
                        {(topTitle || "C").slice(0, 1)}
                      </Avatar>

                      {/* Title + presence (online / last seen) */}
                      <Stack spacing={0.25}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            cursor: hasActiveGroup ? "pointer" : "default",
                            "&:hover": hasActiveGroup ? { textDecoration: "underline" } : undefined,
                          }}
                          onClick={hasActiveGroup ? openActiveGroup : undefined}
                        >
                          {topTitle}
                        </Typography>

                        {/* WhatsApp-style status: only for DM (dmPresence is computed above) */}
                        {dmPresence && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                          >
                            {dmPresence.isOnline && (
                              <Box
                                component="span"
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: "success.main",
                                }}
                              />
                            )}
                            {dmPresence.label}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    {/* Right actions */}
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      {/* ℹ️ Details icon – opens members/attachments popup */}
                      <IconButton
                        size="small"
                        onClick={() => setDetailsOpen(true)}
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>


                {/* Chat thread */}
                <Paper
                  sx={{
                    p: 2,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 3,
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                >
                  {/* 🔹 ATTACHMENT PREVIEW OVERLAY (Multi-File Carousel) */}
                  {draftAttachments.length > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 20,
                        bgcolor: "#e9edef",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        overflow: "hidden"
                      }}
                    >
                      {/* Header */}
                      <Stack direction="row" alignItems="center" sx={{ p: 2, zIndex: 2 }}>
                        <IconButton onClick={handleClearAttachments}>
                          <CloseRoundedIcon sx={{ fontSize: 30 }} />
                        </IconButton>
                        <Typography variant="h6" sx={{ ml: 2 }}>
                          Preview {draftAttachments.length > 1 && `(${activePreviewIndex + 1} of ${draftAttachments.length})`}
                        </Typography>
                      </Stack>

                      {/* Center: Carousel Stage */}
                      <Box
                        sx={{
                          flex: 1,
                          position: "relative",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          bgcolor: "#d1d7db",
                          overflow: "hidden"
                        }}
                      >
                        {/* LEFT ARROW (Show only if not first) */}
                        {draftAttachments.length > 1 && (
                          <IconButton
                            onClick={() => setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : prev))}
                            disabled={activePreviewIndex === 0}
                            sx={{
                              position: "absolute",
                              left: 10,
                              bgcolor: "rgba(255,255,255,0.6)",
                              "&:hover": { bgcolor: "white" },
                              zIndex: 10,
                              display: activePreviewIndex === 0 ? "none" : "flex"
                            }}
                          >
                            <ArrowBackRoundedIcon />
                          </IconButton>
                        )}

                        {/* THE ACTIVE FILE */}
                        <Box sx={{ p: 4, width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                          {draftAttachments[activePreviewIndex].type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(draftAttachments[activePreviewIndex])}
                              alt="Preview"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                                borderRadius: 8
                              }}
                            />
                          ) : (
                            <Stack alignItems="center" spacing={2} sx={{ p: 4, bgcolor: "white", borderRadius: 4 }}>
                              <DescriptionOutlinedIcon sx={{ fontSize: 60, color: "#54656f" }} />
                              <Typography variant="h6">{draftAttachments[activePreviewIndex].name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {(draftAttachments[activePreviewIndex].size / 1024).toFixed(1)} KB
                              </Typography>
                            </Stack>
                          )}
                        </Box>

                        {/* RIGHT ARROW (Show only if not last) */}
                        {draftAttachments.length > 1 && (
                          <IconButton
                            onClick={() => setActivePreviewIndex((prev) => (prev < draftAttachments.length - 1 ? prev + 1 : prev))}
                            disabled={activePreviewIndex === draftAttachments.length - 1}
                            sx={{
                              position: "absolute",
                              right: 10,
                              bgcolor: "rgba(255,255,255,0.6)",
                              "&:hover": { bgcolor: "white" },
                              zIndex: 10,
                              display: activePreviewIndex === draftAttachments.length - 1 ? "none" : "flex"
                            }}
                          >
                            {/* We reuse ArrowBack but rotate it 180deg for Right Arrow */}
                            <ArrowBackRoundedIcon sx={{ transform: "rotate(180deg)" }} />
                          </IconButton>
                        )}
                      </Box>

                      {/* Thumbnail Strip (Only if > 1 file) */}
                      {draftAttachments.length > 1 && (
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            p: 1,
                            bgcolor: "rgba(255,255,255,0.5)",
                            justifyContent: "center",
                            overflowX: "auto"
                          }}
                        >
                          {draftAttachments.map((file, idx) => (
                            <Box
                              key={idx}
                              onClick={() => setActivePreviewIndex(idx)}
                              sx={{
                                width: 50,
                                height: 50,
                                borderRadius: 1,
                                overflow: "hidden",
                                border: activePreviewIndex === idx ? "2px solid #00a884" : "2px solid transparent",
                                cursor: "pointer",
                                flexShrink: 0
                              }}
                            >
                              {file.type.startsWith("image/") ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <Box sx={{ width: "100%", height: "100%", bgcolor: "white", display: "flex", justifyContent: "center", alignItems: "center" }}>
                                  <DescriptionOutlinedIcon fontSize="small" />
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      )}

                      {/* Footer: Caption & Send */}
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ p: 2, bgcolor: "#f0f2f5" }}
                      >
                        <TextField
                          size="small"
                          placeholder="Add a caption..."
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          fullWidth
                          autoFocus
                          sx={{ bgcolor: "white", borderRadius: 1 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                        />
                        <IconButton
                          onClick={handleSend}
                          sx={{
                            bgcolor: "#00a884",
                            color: "white",
                            width: 45, height: 45,
                            "&:hover": { bgcolor: "#008f6f" }
                          }}
                        >
                          <SendIcon sx={{ fontSize: 20, ml: 0.5 }} />
                        </IconButton>
                      </Stack>
                    </Box>
                  )}
                  <Box
                    id="chat-scroll"
                    sx={{
                      flex: 1,
                      overflowY: "auto",
                      overflowX: "hidden",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    {pinnedMessages.length > 0 && (
                      <Box
                        sx={{
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          mb: 1,
                          px: 1,
                          py: 0.75,
                          borderRadius: 2,
                          bgcolor: "#f8fafc",
                          border: `1px solid ${BORDER}`,
                          boxShadow: pinnedMessages.length > 1 ? "0 2px 4px rgba(0,0,0,0.03)" : "none",
                        }}
                      >
                        {/* Header Row: Always visible */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          onClick={() => {
                            if (pinnedMessages.length > 1) setPinsExpanded(!pinsExpanded);
                          }}
                          sx={{
                            cursor: pinnedMessages.length > 1 ? "pointer" : "default",
                            userSelect: "none"
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ overflow: "hidden", flex: 1 }}>
                            <Typography variant="caption" sx={{ fontSize: 13 }}>📌</Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: 13,
                                fontWeight: pinsExpanded ? 700 : 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "text.primary"
                              }}
                            >
                              {pinsExpanded
                                ? "Pinned messages"
                                : pinnedMessages[pinnedMessages.length - 1].body}
                            </Typography>
                          </Stack>

                          {pinnedMessages.length > 1 && (
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 1 }}>
                              {!pinsExpanded && (
                                <Chip
                                  label={`+${pinnedMessages.length - 1}`}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    bgcolor: "primary.main",
                                    color: "#fff"
                                  }}
                                />
                              )}
                              <ExpandMoreIcon
                                fontSize="small"
                                sx={{
                                  transform: pinsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.2s"
                                }}
                              />
                            </Stack>
                          )}
                        </Stack>

                        {/* Expanded List */}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const el = document.querySelector(`[data-mid="${m.id}"]`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }
                                }}
                              >
                                <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                                </Box>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontSize: 13,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    flex: 1
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
                    {sections.map((sec) => (
                      <React.Fragment key={sec.label}>
                        <Stack alignItems="center" sx={{ my: 0.8 }}>
                          <Chip size="small" variant="outlined" label={sec.label} />
                        </Stack>
                        {sec.items.map((m, i) => {
                          const prev = sec.items[i - 1];
                          const firstOfBlock = !prev || prev.sender_id !== m.sender_id;
                          return (
                            <Bubble
                              key={m.id}
                              m={m}
                              showSender={active && !isDmThread(active) && firstOfBlock}
                              isPinned={isMessagePinned(m.id)}
                              conversationId={activeId}
                              onBubbleClick={handleOpenMessageMenu}
                              onBubbleContextMenu={handleOpenMessageMenu}
                            />

                          );
                        })}

                      </React.Fragment>
                    ))}
                  </Box>

                  <Divider sx={{ my: 1.25 }} />

                  {groupReadOnly ? (
                    // 🔒 WhatsApp-style read-only group banner
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 1.5,
                        border: `1px dashed ${BORDER}`,
                        bgcolor: "#f9fafb",
                        color: "text.secondary",
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      Only admins can send messages in this group.
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center">
                      {/* 🔹 1. Hidden Inputs for File and Camera */}
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
                        capture="environment" // This triggers the camera on mobile
                        ref={cameraInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />

                      {/* 🔹 2. The Plus (+) Button */}
                      <Tooltip title="Attach">
                        <IconButton
                          onClick={handleAttachClick}
                          size="small"
                          sx={{
                            bgcolor: isAttachMenuOpen ? "rgba(0,0,0,0.08)" : "transparent",
                            transition: "transform 0.2s",
                            transform: isAttachMenuOpen ? "rotate(45deg)" : "rotate(0deg)"
                          }}
                        >
                          <AddRoundedIcon fontSize="medium" />
                        </IconButton>
                      </Tooltip>

                      {/* 🔹 3. The Attachment Menu */}
                      <Menu
                        anchorEl={attachMenuAnchor}
                        open={isAttachMenuOpen}
                        onClose={handleAttachClose}
                        anchorOrigin={{ vertical: "top", horizontal: "left" }}
                        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                        sx={{
                          "& .MuiPaper-root": {
                            borderRadius: 3,
                            mb: 1,
                            boxShadow: "0px 4px 20px rgba(0,0,0,0.15)"
                          }
                        }}
                      >
                        <MenuItem onClick={handleTriggerFileUpload} sx={{ py: 1.5, pr: 3 }}>
                          <ListItemIcon>
                            <UploadFileRoundedIcon fontSize="small" sx={{ color: "#7F66FF" }} />
                          </ListItemIcon>
                          <Typography variant="body2" fontWeight={600}>File Upload</Typography>
                        </MenuItem>

                        <MenuItem onClick={handleTriggerCamera} sx={{ py: 1.5, pr: 3 }}>
                          <ListItemIcon>
                            <CameraAltRoundedIcon fontSize="small" sx={{ color: "#D93025" }} />
                          </ListItemIcon>
                          <Typography variant="body2" fontWeight={600}>Camera</Typography>
                        </MenuItem>
                      </Menu>

                      {/* Existing TextField */}
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
                      <Button
                        variant="contained"
                        size="small"
                        endIcon={<SendIcon />}
                        onClick={handleSend}
                      >
                        Send
                      </Button>
                    </Stack>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </Grid>

        {/* RIGHT: Members + Attachments (Desktop only) */}
        {/* <Grid
          item
          xs={12}
          md={3}
          sx={{
            display: { xs: "none", lg: "block" }, // show only ≥ lg (desktop)
          }}
        >
          <Paper
            sx={{
              p: 1.5,
              border: `1px solid ${BORDER}`,
              borderRadius: 3,
              height: PANEL_H,
              Width: 260,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {renderDetailsContent()}
          </Paper>
        </Grid> */}
      </Grid>
      {/* 🔹 Details popup for mobile / tablet / laptop */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobileOrTablet}
        sx={{
          // 🔹 make paper full-width on mobile & remove side margins
          "& .MuiDialog-paper": {
            width: "100%",
            m: 0,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          <Typography variant="h6">Chat details</Typography>
          <IconButton size="small" onClick={() => setDetailsOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {renderDetailsContent()}
        </DialogContent>
      </Dialog>
      <Menu
        anchorEl={menuAnchorEl}
        open={messageMenuOpen && !!menuMessage}
        onClose={handleCloseMessageMenu}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {menuMessage && (
          <MenuItem onClick={handlePinOrUnpin}>
            {isMessagePinned(menuMessage.id) ? "Unpin" : "Pin"}
          </MenuItem>
        )}

        {menuMessage && menuMessage.mine && (
          <MenuItem onClick={handleDeleteMessage}>Delete</MenuItem>
        )}
      </Menu>
      <Menu
        anchorEl={convMenuAnchor}
        open={Boolean(convMenuAnchor)}
        onClose={handleCloseConvMenu}
        anchorOrigin={{ vertical: "center", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem onClick={handleTogglePinConversation}>
          {convMenuTarget?.is_pinned ? "Unpin Chat" : "Pin Chat"}
        </MenuItem>
      </Menu>

      {/* 🔹 Camera Modal */}
      <Dialog open={cameraOpen} onClose={handleCloseCamera} maxWidth="md">
        <DialogContent sx={{ p: 0, bgcolor: "black", display: "flex", justifyContent: "center" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", maxHeight: "60vh", objectFit: "contain" }}
          />
          {/* Hidden canvas for capture logic */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </DialogContent>
        <Stack
          direction="row"
          justifyContent="center"
          spacing={2}
          sx={{ p: 2, bgcolor: "#000" }}
        >
          <IconButton onClick={handleCloseCamera} sx={{ color: "white" }}>
            <CloseRoundedIcon />
          </IconButton>
          <IconButton
            onClick={handleCapturePhoto}
            sx={{
              width: 60,
              height: 60,
              border: "4px solid white",
              color: "white"
            }}
          >
            <CameraAltRoundedIcon fontSize="large" />
          </IconButton>
        </Stack>
      </Dialog>
    </>
  );
}
