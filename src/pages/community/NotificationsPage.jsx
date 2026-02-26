// src/pages/community/NotificationsPage.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Chip, Grid, IconButton,
  List, ListItem, ListItemAvatar, Paper, Stack,
  Typography, Switch, FormControlLabel, MenuItem, Select, useMediaQuery, useTheme,
  Skeleton
} from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import VerifiedIcon from "@mui/icons-material/Verified";
import EventRoundedIcon from "@mui/icons-material/EventRounded";

const BORDER = "#e2e8f0";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const emitUnreadCount = (count) => {
  try {
    window.dispatchEvent(new CustomEvent("notify:unread", { detail: { count } }));
    localStorage.setItem("unread_notifications", String(count));
  } catch { }
};

/* ---------------------- helpers ---------------------- */
const getUserDisplayName = (u) => {
  if (!u) return "User";
  const name = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return name || u.full_name || u.username || u.email || "User";
};

function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function groupByDay(items) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const it of items) {
    const d0 = new Date(it.created_at); const d = new Date(d0); d.setHours(0, 0, 0, 0);
    if (d >= today) groups.Today.push(it);
    else if (d >= yesterday) groups.Yesterday.push(it);
    else groups.Earlier.push(it);
  }
  return groups;
}

// Helper to detect if a notification is KYC-related
function isKycNotification(item) {
  const t = String(item?.data?.type || "").toLowerCase();
  if (t === "kyc") return true;

  // Check title for KYC keywords (for admin-triggered notifications)
  const title = String(item?.title || "").toLowerCase();
  if (title.includes("kyc") || title.includes("identity verification")) return true;

  return false;
}

// Keep Community Notifications page scoped to verification items only
// - API notifications: kind="event" with data.type in ["kyc", "name_change"]
// - Local identity request (pending only): kind="name_change" (_source="identity")
function isVerificationItem(item) {
  if (isKycNotification(item)) return true;

  const t = String(item?.data?.type || "").toLowerCase();
  if (t === "name_change") return true;

  // Your identity loader uses: source: "identity" (NOT _source)
  if (item?.source === "identity") return true;

  if (item?.kind === "name_change") return true;
  return false;
}

const KIND_LABEL = {
  mention: "Mentions",
  comment: "Comments",
  reaction: "Reactions",
  follow: "Follows",
  event: "Events",
  system: "System",
  friend_request: "Contact Requests",
  connection_request: "Contact Requests",
  join_request: "Group",
  member_joined: "Group",
  member_added: "Group",
  group_created: "Group",
  forum_enabled: "Group",
  forum_disabled: "Group",
  name_change: "Identity",
  suggestion_digest: "Suggestions",
};

function kindChip(kind) {
  return KIND_LABEL[kind] || "Other";
}

// --- Local Storage Helpers for Identity Requests ---
function getReadIdentityIds() {
  try {
    return JSON.parse(localStorage.getItem("read_identity_requests") || "[]");
  } catch { return []; }
}

function markIdentityIdsAsRead(ids) {
  const current = getReadIdentityIds();
  const newSet = new Set([...current, ...ids]);
  localStorage.setItem("read_identity_requests", JSON.stringify([...newSet]));
}

function markIdentityIdsAsUnread(ids) {
  const current = getReadIdentityIds();
  const newIds = current.filter(id => !ids.includes(id));
  localStorage.setItem("read_identity_requests", JSON.stringify(newIds));
}

// ---------------------- DATA LOADERS ----------------------

// 1. Standard Notifications
async function fetchStandardNotifications(url) {
  const r = await fetch(url, {
    headers: { ...tokenHeader(), Accept: "application/json" },
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed");
  const j = await r.json();
  const raw = Array.isArray(j) ? j : j?.results || [];

  return {
    items: raw.map((n) => ({
      id: n.id,
      source: 'api', // mark source
      kind: n.kind,
      state: n.state || n.data?.status || "",
      title: n.title || "",
      description: n.description || "",
      created_at: n.created_at,
      is_read: !!n.is_read,
      data: n.data || {},
      actor: {
        id: n.actor?.id,
        name: getUserDisplayName(n.actor),
        avatar: n.actor?.avatar_url || "",
      },
      context: {
        friend_request_id: n.data?.friend_request_id,
        profile_user_id: n.data?.from_user_id || n.data?.to_user_id,
        eventId: n.data?.event_id || n.data?.eventId,
        postId: n.data?.post_id || n.data?.postId,
        groupSlug: n.data?.group_slug,
      },
    })),
    next: j?.next || null
  };
}

// 2. Sent Requests (Outgoing)
async function loadSentRequests() {
  try {
    const r = await fetch(`${API_BASE}/friend-requests/?type=outgoing`, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) return [];
    const j = await r.json();
    const raw = Array.isArray(j) ? j : j?.results || [];

    // Map outgoing requests to notification-like objects
    return raw.map((n) => ({
      id: `sent-${n.id}`,
      source: "sent_request",
      kind: "friend_request",
      state: "pending", // Always pending if in this list
      title: "Contact Request Sent",
      description: "",
      created_at: n.created_at,
      is_read: true,
      data: n,
      actor: {
        id: n.to_user?.id,
        name: getUserDisplayName(n.to_user),
        avatar: n.to_user?.avatar_url || "",
      },
      context: {
        profile_user_id: n.to_user?.id,
        friend_request_id: n.id,
      },
    }));
  } catch (e) {
    console.error("Failed to load sent requests:", e);
    return [];
  }
}

// 1b. Group Notifications (for group admins/mods)
async function fetchGroupNotifications(url) {
  try {
    const r = await fetch(url, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) {
      // If feature not enabled or permission denied, just return empty
      console.warn("Group notifications fetch failed", r.status);
      return { items: [] };
    }
    const j = await r.json();
    const raw = Array.isArray(j) ? j : j?.results || [];

    return {
      items: raw.map((n) => ({
        id: `group-${n.id}`,
        source: "group",
        kind: n.kind,
        state: n.state || "",
        title: n.title || "",
        description: n.description || "",
        created_at: n.created_at,
        is_read: !!n.is_read,
        data: n.data || {},
        actor: {
          id: n.actor?.id,
          name: getUserDisplayName(n.actor),
          avatar: n.actor?.avatar || n.actor?.avatar_url || "",
        },
        context: {
          groupId: n.data?.group_id || n.group,
          groupName: n.data?.group_name,
          userId: n.data?.user_id,
        },
      })),
      next: j?.next || null
    };
  } catch (e) {
    console.warn("Group notifications network error", e);
    return { items: [] };
  }
}

// 2. Identity Requests (Direct Fetch)
async function loadMyIdentityRequests() {
  try {
    const r = await fetch(`${API_BASE}/users/me/name-change-requests/`, {
      headers: { ...tokenHeader(), Accept: "application/json" },
    });
    if (!r.ok) return [];

    const data = await r.json();
    const rowsAll = Array.isArray(data) ? data : data.results || [];
    // ✅ Keep only pending here. Approved/Rejected should come from /notifications/
    const rows = rowsAll.filter((req) => String(req.status || "").toLowerCase() === "pending");
    const readIds = getReadIdentityIds();

    return rows.map(req => {
      const fullId = `identity-${req.id}`;
      // Logic: Pending -> Read (white). Processed -> Unread (highlighted) until marked read.
      const isFinished = req.status === 'approved' || req.status === 'rejected';
      const isRead = isFinished ? readIds.includes(fullId) : true;

      const dateToUse = (isFinished && req.updated_at) ? req.updated_at : req.created_at;

      return {
        id: fullId,
        source: 'identity',
        kind: 'name_change',
        state: req.status,
        title: req.status === 'pending'
          ? `Requesting name change to ${req.new_first_name} ${req.new_last_name}`
          : `Name change request ${req.status}`,
        description: `Status: ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}`,
        created_at: dateToUse,
        is_read: isRead,
        actor: {
          name: "System",
          avatar: "",
        },
        context: {
          old_name: `${req.old_first_name} ${req.old_last_name}`,
          new_name: `${req.new_first_name} ${req.new_last_name}`,
          reason: req.reason
        }
      };
    });
  } catch (e) {
    console.warn("Could not load identity requests", e);
    return [];
  }
}

// ---------------------- SKELETON COMPONENT ----------------------
function NotificationSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1,
        width: "100%",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={120} height={20} />
          </Stack>
          <Skeleton variant="text" width="90%" height={16} />
          <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

function NotificationRow({
  item,
  onOpen,
  onAvatarClick, // New prop for avatar clicks
  onToggleRead,
  onAcceptRequest,
  onDeclineRequest,
  onFollowBack,
  onOpenDigest,
}) {
  const unread = !item.is_read;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const showDescription =
    item.description &&
    !/^Post #\d+$/i.test(String(item.description).trim());

  // --- Dynamic Content for Identity Requests ---
  const renderContent = () => {
    const notifType = String(item?.data?.type || "").toLowerCase();
    const isKyc = isKycNotification(item);

    if (isKyc) {
      const s = String(item.state || "").toLowerCase();
      const title = String(item?.title || "").toLowerCase();

      // Handle KYC Reset
      if (title.includes("reset")) {
        return (
          <Typography variant="body2">
            Your identity verification process has been <span style={{ color: '#b42318', fontWeight: 700 }}>reset</span>. You may start a new verification, please retry KYC
          </Typography>
        );
      }

      // Handle Approved
      if (s === "approved" || s === "accepted") {
        return (
          <Typography variant="body2">
            Your profile is <span style={{ color: '#1a7f37', fontWeight: 700 }}>verified</span> ✅
          </Typography>
        );
      }

      // Handle Review/Pending
      if (s === "review" || s === "pending") {
        return (
          <Typography variant="body2">
            Your identity verification is <span style={{ fontWeight: 700 }}>under review</span> ⏳
          </Typography>
        );
      }

      // Handle Declined/Rejected
      if (s === "declined" || s === "rejected") {
        return (
          <Typography variant="body2">
            Your identity verification status has been updated to: <span style={{ color: '#b42318', fontWeight: 700 }}>declined. Not Accepted</span>
          </Typography>
        );
      }

      // Default KYC message
      return (
        <Typography variant="body2">
          {item.description || item.title || "Identity verification update"}
        </Typography>
      );
    }
    if (item.kind === 'name_change') {
      const state = item.state || 'pending';
      const newName = item.context?.new_name || "New Name";
      if (state === 'approved') {
        return (
          <>
            <Typography variant="body2">
              Your name change to <b>{newName}</b> has been <span style={{ color: '#1a7f37', fontWeight: 600 }}>approved</span>.
            </Typography>
          </>
        );
      } else if (state === 'rejected') {
        return (
          <>
            <Typography variant="body2">
              Your name change to <b>{newName}</b> was <span style={{ color: '#b42318', fontWeight: 600 }}>rejected</span>.
            </Typography>
          </>
        );
      } else {
        return (
          <Typography variant="body2">
            You requested to change your name to <b>{newName}</b>.
          </Typography>
        );
      }
    }

    if (item.kind === "suggestion_digest") {
      const cc = item.data?.connection_count ?? 0;
      const gc = item.data?.group_count ?? 0;

      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Daily suggestions
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {cc} connections • {gc} groups
          </Typography>
        </>
      );
    }

    if (item.kind === "join_request") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, cursor: "pointer", "&:hover": { color: "primary.main" } }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick?.(item);
            }}
          >
            {item.actor?.name || "Someone"}
          </Typography>
          <Typography variant="body2">
            requested to join
          </Typography>
          {item.context?.groupName && (
            <Chip size="small" label={item.context.groupName} variant="outlined" />
          )}
        </Stack>
      );
    }

    if (item.kind === "member_joined" || item.kind === "member_added") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, cursor: "pointer", "&:hover": { color: "primary.main" } }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick?.(item);
            }}
          >
            {item.actor?.name || "Someone"}
          </Typography>
          <Typography variant="body2">
            {item.kind === "member_added" ? "was added to" : "joined"}
          </Typography>
          {item.context?.groupName && (
            <Chip size="small" label={item.context.groupName} variant="outlined" />
          )}
        </Stack>
      );
    }

    if (item.kind === "group_created") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, cursor: "pointer", "&:hover": { color: "primary.main" } }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick?.(item);
            }}
          >
            {item.actor?.name || "Someone"}
          </Typography>
          <Typography variant="body2">
            created a group
          </Typography>
          {item.context?.groupName && (
            <Chip size="small" label={item.context.groupName} variant="outlined" />
          )}
        </Stack>
      );
    }

    if (item.kind === "forum_enabled") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2">
            Forum has been <span style={{ fontWeight: 700, color: '#10b8a6' }}>enabled</span> for
          </Typography>
          {item.data?.group_name && (
            <Chip size="small" label={item.data.group_name} variant="outlined" />
          )}
        </Stack>
      );
    }

    if (item.kind === "forum_disabled") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2">
            Forum has been <span style={{ fontWeight: 700, color: '#b42318' }}>disabled</span> for
          </Typography>
          {item.data?.group_name && (
            <Chip size="small" label={item.data.group_name} variant="outlined" />
          )}
        </Stack>
      );
    }

    if (item.kind === "system") {
      if (item.data?.type === "moderation") {
        const action = item.data?.action;
        const isApproved = action === "approve";
        const target = item.data?.target_type === "post" ? "post" : "comment";
        const targetId = item.data?.target_id;

        return (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              System
            </Typography>
            <Typography variant="body2">
              {isApproved ? `approved your ${target}` : `removed your ${target}`}
            </Typography>
            {isApproved ? (
              <Chip
                size="small"
                label="Approved"
                component={targetId ? "a" : "div"}
                clickable={!!targetId}
                href={targetId && target === 'post' ? `/feed/post/${targetId}` : undefined}
                icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  bgcolor: "#e6f4ea",
                  color: "#1a7f37",
                  borderColor: "#e6f4ea",
                  "& .MuiChip-icon": { color: "#1a7f37", ml: 0.5 },
                  textDecoration: "none"
                }}
              />
            ) : (
              <Chip
                size="small"
                label="Removed"
                icon={<CancelRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ bgcolor: "#fde7e9", color: "#b42318", borderColor: "#fde7e9", "& .MuiChip-icon": { color: "#b42318", ml: 0.5 } }}
              />
            )}
          </Stack>
        );
      }
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            System
          </Typography>
          <Typography variant="body2">{item.title}</Typography>
        </Stack>
      );
    }

    if (item.kind === "friend_request" || item.kind === "connection_request") {
      const isAccepted = String(item.title || "").toLowerCase().includes("accepted") || item.state === "accepted";
      const isDeclined = item.state === "declined" || item.state === "rejected";
      const isSent = item.source === "sent_request";

      if (isSent) {
        return (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2">
              You sent a contact request to
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={(e) => {
                e.stopPropagation();
                onAvatarClick?.(item);
              }}
            >
              {item.actor?.name || "Someone"}
            </Typography>
          </Stack>
        );
      }

      if (isDeclined) {
        return (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2">
              Contact request from
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={(e) => {
                e.stopPropagation();
                onAvatarClick?.(item);
              }}
            >
              {item.actor?.name || "Someone"}
            </Typography>
            <Typography variant="body2">
              was declined.
            </Typography>
          </Stack>
        );
      }

      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick?.(item);
            }}
          >
            {item.actor?.name || "Someone"}
          </Typography>
          <Typography variant="body2">
            {isAccepted ? "accepted your contact request" : "sent you a contact request"}
          </Typography>
        </Stack>
      );
    }
    if (item.kind === "event") {
      return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarClick?.(item);
            }}
          >
            {item.actor?.name || "System"}
          </Typography>
          <Typography variant="body2">
            invited you to
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <EventRoundedIcon sx={{ fontSize: 16, color: "primary.main" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
              {item.title.replace(/^Invitation:\s*/i, "")}
            </Typography>
          </Stack>
        </Stack>
      );
    }

    // Default Render
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={(e) => {
            e.stopPropagation();
            onAvatarClick?.(item);
          }}
        >
          {item.actor?.name || "System"}
        </Typography>
        <Typography variant="body2">{String(item.title || "").replace(/friend/gi, "contact")}</Typography>
        {item.context?.group && (
          <Chip size="small" label={item.context.group} variant="outlined" />
        )}
      </Stack>
    );
  };



  const ActionsByKind = () => {
    if (item.kind === "friend_request" || item.kind === "connection_request") {
      if (item.source === "sent_request") return null;
      if (item.state === "accepted") return null;
      if (item.state === "declined") return null;
      return (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptRequest?.(item.id);
            }}
            disabled={!!item._busy}
            sx={{ textTransform: "none", borderRadius: 2 }}
            startIcon={<CheckCircleOutlineIcon />}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              onDeclineRequest?.(item.id);
            }}
            disabled={!!item._busy}
            sx={{ textTransform: "none", borderRadius: 2 }}
            startIcon={<HighlightOffIcon />}
          >
            Decline
          </Button>
        </Stack>
      );
    }

    if (item.kind === "suggestion_digest") {
      const cc = item.data?.connection_count ?? 0;
      const gc = item.data?.group_count ?? 0;

      return (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDigest?.(item, "connections");
            }}
            sx={{ textTransform: "none", borderRadius: 2 }}
            disabled={cc === 0}
          >
            View suggestions
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDigest?.(item, "groups");
            }}
            sx={{ textTransform: "none", borderRadius: 2 }}
            disabled={gc === 0}
          >
            View group activity
          </Button>
        </Stack>
      );
    }

    if (item.kind === "follow") {
      return item.following_back ? (
        <Chip size="small" variant="outlined" label="Following" sx={{ ml: 1 }} />
      ) : (
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            onFollowBack?.(item.id);
          }}
          disabled={!!item._busy}
          sx={{ textTransform: "none", borderRadius: 2, mt: 1 }}
          startIcon={<PersonAddAlt1Icon />}
        >
          Follow back
        </Button>
      );
    }

    return null;
  };

  return (
    <Paper
      elevation={0}
      onClick={() => {
        // Make entire card clickable for certain notification types
        if (
          item.kind === "forum_enabled" ||
          item.kind === "forum_disabled" ||
          item.data?.type === "kyc" ||
          item.kind === "name_change" ||
          item.source === "identity" ||
          item.context?.profile_user_id ||
          item.context?.eventId ||
          item.context?.postId ||
          item.context?.groupSlug ||
          item.data?.group_slug
        ) {
          onOpen?.(item);
        }
      }}
      sx={{
        p: 1.25,
        mb: 1,
        width: "100%",
        flexGrow: 1,
        boxSizing: "border-box",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        bgcolor: unread ? "#f6fffe" : "background.paper",
        cursor: (
          item.kind === "forum_enabled" ||
          item.kind === "forum_disabled" ||
          item.data?.type === "kyc" ||
          item.kind === "name_change" ||
          item.source === "identity" ||
          item.context?.profile_user_id ||
          item.context?.eventId ||
          item.context?.postId ||
          item.context?.groupSlug ||
          item.data?.group_slug
        ) ? "pointer" : "default",
        "&:hover": (
          item.kind === "forum_enabled" ||
          item.kind === "forum_disabled" ||
          item.data?.type === "kyc" ||
          item.kind === "name_change" ||
          item.source === "identity" ||
          item.context?.profile_user_id ||
          item.context?.eventId ||
          item.context?.postId ||
          item.context?.groupSlug ||
          item.data?.group_slug
        ) ? {
          bgcolor: unread ? "#e6f7f5" : "#f9fafb",
        } : {},
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <ListItemAvatar sx={{ minWidth: 48 }}>
          {isKycNotification(item) ? (
            <Avatar sx={{ bgcolor: "transparent" }}>
              <VerifiedIcon sx={{ color: "#22d3ee", fontSize: 32 }} />
            </Avatar>
          ) : item.kind === 'name_change' ? (
            <Avatar sx={{ bgcolor: '#394d79', color: 'white' }}>
              <BadgeRoundedIcon fontSize="small" />
            </Avatar>

          ) : item.kind === 'system' ? (
            <Avatar sx={{ bgcolor: '#f3f4f6', color: '#1f2937' }}>
              <InfoRoundedIcon />
            </Avatar>
          ) : (
            <Avatar
              src={item.actor?.avatar}
              alt={item.actor?.name}
              onClick={() => onAvatarClick?.(item)} // Use parent handler
              sx={{ cursor: (item?.context?.profile_user_id || item?.actor?.id) ? "pointer" : "default" }}
            >
              {(item.actor?.name || "S").slice(0, 1).toUpperCase()}
            </Avatar>
          )}
        </ListItemAvatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renderContent()}

          {/* Show description only if it's not a generic auto-generated one */}
          {showDescription && item.kind !== 'name_change' && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {item.description}
            </Typography>
          )}

          <Stack
            direction={isMobile ? "column" : "row"}
            alignItems={isMobile ? "flex-start" : "center"}
            spacing={isMobile ? 0.5 : 1}
            sx={{ mt: 0.75 }}
          >
            {(() => {
              const isKyc = isKycNotification(item);
              const isNameChange = item.kind === "name_change" || String(item?.data?.type || "").toLowerCase() === "name_change" || item.source === "identity";
              const label = isKyc ? "KYC" : isNameChange ? "Name Change" : kindChip(item.kind);
              return <Chip size="small" label={label} />;
            })()}
            <Typography variant="caption" color="text.secondary">
              {formatWhen(item.created_at)}
            </Typography>
          </Stack>

          <ActionsByKind />
        </Box>

        <Stack spacing={0.5} alignItems="flex-end">
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              title={unread ? "Mark as read" : "Mark as unread"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead?.(item.id, !unread);
              }}
            >
              {unread ? (
                <MarkEmailReadOutlinedIcon fontSize="small" />
              ) : (
                <MarkEmailUnreadOutlinedIcon fontSize="small" />
              )}
            </IconButton>

            {(
              item.data?.type === "kyc" ||
              item.kind === "name_change" ||
              item.kind === "forum_enabled" ||
              item.kind === "forum_disabled" ||
              item.source === "identity" ||
              item.context?.profile_user_id ||
              item.context?.eventId ||
              item.context?.postId ||
              item.context?.groupSlug ||
              item.data?.group_slug
            ) && (
                <IconButton size="small" title="Open" onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.(item);
                }}>
                  <OpenInNewOutlinedIcon fontSize="small" />
                </IconButton>
              )}
          </Stack>

          {(() => {
            const s = (item.state || "").toLowerCase();
            if (!s) return null;

            const common = {
              size: "small",
              variant: "outlined",
              sx: {
                mt: 0.5,
                height: 24,
                borderRadius: "999px",
                fontWeight: 600,
                "& .MuiChip-label": { px: 0.5, pt: "1px" },
              },
            };

            if (s === "accepted" || s === "approved") {
              return <Chip {...common} icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />} label="Approved" sx={{ ...common.sx, bgcolor: "#e6f4ea", borderColor: "#e6f4ea", color: "#1a7f37", "& .MuiChip-icon": { color: "#1a7f37", mr: 0.5 } }} />;
            }
            if (s === "declined" || s === "rejected") {
              return <Chip {...common} icon={<CancelRoundedIcon sx={{ fontSize: 16 }} />} label="Rejected" sx={{ ...common.sx, bgcolor: "#fde7e9", borderColor: "#fde7e9", color: "#b42318", "& .MuiChip-icon": { color: "#b42318", mr: 0.5 } }} />;
            }
            if (s === "pending" || s === "review" || s === "under_review" || s === "requested" || s === "waiting" || s === "sent") {
              return <Chip {...common} icon={<HourglassBottomRoundedIcon sx={{ fontSize: 16 }} />} label={s === "sent" ? "Sent" : "Pending"} sx={{ ...common.sx, bgcolor: "#eef2f6", borderColor: "#eef2f6", color: "#374151", "& .MuiChip-icon": { color: "#374151", mr: 0.5 } }} />;
            }
            return <Chip {...common} icon={<InfoRoundedIcon sx={{ fontSize: 16 }} />} label={item.state} sx={{ ...common.sx, bgcolor: "#f3f4f6", borderColor: "#f3f4f6", color: "#111827", "& .MuiChip-icon": { color: "#6b7280", mr: 0.5 } }} />;
          })()}
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ------------------- main page component ------------------- */
export default function NotificationsPage({
  // optional external callbacks
  onOpen,
  onFollowBackUser,
}) {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [showOnlyUnread, setShowOnlyUnread] = React.useState(false);
  const [kind, setKind] = React.useState("All");

  // --- Pagination State ---
  const [loading, setLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  const [nextUrl, setNextUrl] = React.useState(`${API_BASE}/notifications/?page_size=10`);

  const observerTarget = React.useRef(null);
  const [visibleCount, setVisibleCount] = React.useState(10);
  const [isLoadingMoreLocal, setIsLoadingMoreLocal] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return;
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Derived state
  const unreadCount = React.useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const handleOpenDigest = (item, target) => {
    const focus = target === "groups" ? "groups" : "connections";
    markAndNavigate(item, `/community?view=live&focus=${focus}`);
  };

  React.useEffect(() => {
    emitUnreadCount(unreadCount);
  }, [unreadCount]);

  const filtered = React.useMemo(() => {
    let arr = [...items];
    if (showOnlyUnread) arr = arr.filter((i) => !i.is_read);
    if (kind !== "All") {
      const k = kind.toLowerCase();
      const norm = {
        requests: ["friend_request", "connection_request"],
        group: ["join_request", "member_joined", "member_added", "group_created", "forum_enabled", "forum_disabled"],
        follows: ["follow"],
        mentions: ["mention"],
        comments: ["comment"],
        reactions: ["reaction"],
        events: ["event"],
        system: ["system"],
        identity: ["name_change"],
        suggestions: ["suggestion_digest"],
        sentrequests: ["friend_request"],
      };
      const keys = norm[k] || [k.slice(0, -1)];

      if (k === "sentrequests") {
        arr = arr.filter((i) => i.source === "sent_request");
      } else {
        arr = arr.filter((i) => keys.includes(i.kind));
        // Exclude sent requests from other filters unless "All"
        if (k !== "All") {
          arr = arr.filter((i) => i.source !== "sent_request");
        }
      }
    }
    // Re-sort by date (descending)
    arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [items, showOnlyUnread, kind]);

  const groupedLimited = React.useMemo(() => {
    const sliced = filtered.slice(0, visibleCount);
    return groupByDay(sliced);
  }, [filtered, visibleCount]);

  // --- Main Load Function ---
  const loadNotifications = React.useCallback(async (url, isAppend = false) => {
    setLoading(true);
    try {
      const promises = [fetchStandardNotifications(url || nextUrl)];

      // ✅ Include identity list only when filter is All or Identity
      const fetchingIdentity = !isAppend && (kind === "All" || kind === "Identity");
      if (fetchingIdentity) promises.push(loadMyIdentityRequests());

      // ✅ Include group notifications only on initial load
      const fetchingGroups = !isAppend && (kind === "All" || kind === "Group");
      if (fetchingGroups) promises.push(fetchGroupNotifications(`${API_BASE}/groups/group-notifications/?page_size=50`));

      // ✅ Include sent requests when filter is All or SentRequests
      const fetchingSent = !isAppend && (kind === "All" || kind === "SentRequests");
      if (fetchingSent) promises.push(loadSentRequests());

      const settled = await Promise.all(promises);
      const apiData = settled[0];
      const identityData = settled.find((x) => Array.isArray(x) && x.length > 0 && x[0]?.source === "identity") || [];
      const groupData = settled.find((x) => x?.items && !x?._source) || { items: [] };
      const sentData = settled.find((x) => Array.isArray(x) && x.length > 0 && x[0]?.source === "sent_request") || [];

      // ✅ Keep all API notifications (kind filter will handle display)
      const newItems = [...(apiData.items || []), ...(identityData || []), ...(groupData.items || []), ...sentData];

      setItems(prev => {
        const combined = isAppend ? [...prev, ...newItems] : newItems;
        const uniqueMap = new Map();
        combined.forEach(item => uniqueMap.set(item.id, item));
        return Array.from(uniqueMap.values());
      });

      setNextUrl(apiData.next);
      setHasMore(!!apiData.next);

      // Removed auto-mark-read to keep unread count high until user interaction.

    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [nextUrl, kind]);

  React.useEffect(() => {
    setVisibleCount(10);
    setHasMore(true);
    setNextUrl(`${API_BASE}/notifications/?page_size=10`);
    loadNotifications(`${API_BASE}/notifications/?page_size=10`, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);


  // --- Infinite Scroll ---
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;

        if (filtered.length > visibleCount && !isLoadingMoreLocal) {
          setIsLoadingMoreLocal(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 10, filtered.length));
            setIsLoadingMoreLocal(false);
          }, 400);
          return;
        }

        if (hasMore && !loading && nextUrl) {
          loadNotifications(nextUrl, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [filtered.length, visibleCount, isLoadingMoreLocal, hasMore, loading, nextUrl, loadNotifications]);

  // --- Handlers ---
  const handleToggleRead = async (id, nowRead) => {
    const item = items.find(i => i.id === id);

    // Identity Items Handler
    if (item && item.source === 'identity') {
      if (nowRead) markIdentityIdsAsRead([id]);
      else markIdentityIdsAsUnread([id]);
      setItems(curr => curr.map(i => i.id === id ? { ...i, is_read: nowRead } : i));
      return;
    }

    // Standard Items Handler - Update state immediately
    setItems((curr) => {
      const next = curr.map((i) => (i.id === id ? { ...i, is_read: nowRead } : i));
      return next;
    });

    // API Items Handler - Handle both read and unread
    if (item?.source === "api") {
      try {
        if (nowRead) {
          await fetch(`${API_BASE}/notifications/mark-read/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...tokenHeader() },
            body: JSON.stringify({ ids: [id] }),
          });
        } else {
          await fetch(`${API_BASE}/notifications/mark-unread/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...tokenHeader() },
            body: JSON.stringify({ ids: [id] }),
          });
        }
      } catch { }
    }

    // Group Items Handler - Handle both read and unread
    if (item?.source === "group") {
      try {
        const rawId = String(id).replace(/^group-/, "");
        if (nowRead) {
          await fetch(`${API_BASE}/groups/group-notifications/mark-read/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...tokenHeader() },
            body: JSON.stringify({ ids: [Number(rawId)] }),
          });
        } else {
          await fetch(`${API_BASE}/groups/group-notifications/mark-unread/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...tokenHeader() },
            body: JSON.stringify({ ids: [Number(rawId)] }),
          });
        }
      } catch { }
    }
  };

  const handleMarkAllRead = async () => {
    // 1. Identity Items
    const identityIds = items.filter(i => !i.is_read && i.source === 'identity').map(i => i.id);
    if (identityIds.length) markIdentityIdsAsRead(identityIds);

    // 2. API Items
    const apiIds = items.filter((i) => !i.is_read && i.source === 'api').map((i) => i.id);
    const groupIds = items
      .filter((i) => !i.is_read && i.source === 'group')
      .map((i) => Number(String(i.id).replace(/^group-/, "")))
      .filter((i) => Number.isFinite(i));

    // Update State
    setItems((curr) => curr.map((i) => ({ ...i, is_read: true })));

    // Send API req
    if (apiIds.length) {
      try {
        await fetch(`${API_BASE}/notifications/mark-read/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeader() },
          body: JSON.stringify({ ids: apiIds }),
        });
      } catch { }
    }
    if (groupIds.length) {
      try {
        await fetch(`${API_BASE}/groups/group-notifications/mark-read/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeader() },
          body: JSON.stringify({ ids: groupIds }),
        });
      } catch { }
    }
  };

  // Helper to mark read and then navigate
  const markAndNavigate = (item, destination) => {
    // Mark as read immediately if it's unread
    if (!item.is_read) {
      handleToggleRead(item.id, true);
    }
    // Navigate
    if (destination) navigate(destination);
  };

  const handleOpen = async (n) => {
    if (onOpen) return onOpen(n); // Custom override
    const ctx = n.context || {};

    let dest = null;
    if (isKycNotification(n) || n.kind === "name_change" || n.source === "identity") {
      markAndNavigate(n, "/account/profile");
      return;
    }

    // Handle forum enable/disable notifications
    if ((n.kind === "forum_enabled" || n.kind === "forum_disabled") && n.data?.group_slug) {
      markAndNavigate(n, `/community/groups/${n.data.group_slug}?tab=posts`);
      return;
    }

    // Handle Event Notifications with Conditional Navigation
    if (ctx.eventId) {
      // Mark as read immediately
      if (!n.is_read) {
        handleToggleRead(n.id, true);
      }

      try {
        const res = await fetch(`${API_BASE}/events/${ctx.eventId}/check_registration/`, {
          headers: { ...tokenHeader(), Accept: "application/json" }
        });

        if (res.ok) {
          const data = await res.json();
          const slug = data.slug || ctx.eventId;

          if (data.is_registered) {
            // If registered, go to the account events page as requested
            navigate("/account/events");
          } else {
            // If not registered, go to main events listing page
            navigate("/events");
          }
        } else {
          // Fallback if check fails
          navigate(`/events/${ctx.eventId}`);
        }
      } catch (err) {
        console.warn("Failed to check registration status:", err);
        navigate(`/events/${ctx.eventId}`);
      }
      return;
    }

    if (n.kind === "friend_request" || n.kind === "connection_request") {
      if (ctx.profile_user_id) dest = `/community/rich-profile/${ctx.profile_user_id}`;
    } else if (ctx.postId) {
      dest = `/feed/post/${ctx.postId}`;
    } else if (ctx.groupSlug) {
      dest = `/groups/${ctx.groupSlug}`;
    } else if (ctx.groupId) {
      dest = `/groups/${ctx.groupId}`;
    }

    // Only if there is a destination or logic, we mark read and go
    if (dest) markAndNavigate(n, dest);
  };

  const handleAvatarClick = (item) => {
    const uid = item?.context?.profile_user_id || item?.actor?.id;
    if (uid) {
      markAndNavigate(item, `/community/rich-profile/${uid}`);
    }
  };

  const updateItem = (id, patch) => setItems((curr) => curr.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleAcceptRequest = async (id) => {
    const n = items.find((x) => x.id === id);
    if (!n?.context?.friend_request_id) return;
    updateItem(id, { _busy: true });
    try {
      const r = await fetch(`${API_BASE}/friend-requests/${n.context.friend_request_id}/accept/`, { method: "POST", headers: { ...tokenHeader(), Accept: "application/json" } });
      updateItem(id, { _busy: false, is_read: true, state: r.ok ? "accepted" : n.state });
    } catch { updateItem(id, { _busy: false }); }
  };

  const handleDeclineRequest = async (id) => {
    const n = items.find((x) => x.id === id);
    if (!n?.context?.friend_request_id) return;
    updateItem(id, { _busy: true });
    try {
      const r = await fetch(`${API_BASE}/friend-requests/${n.context.friend_request_id}/decline/`, { method: "POST", headers: { ...tokenHeader(), Accept: "application/json" } });
      updateItem(id, { _busy: false, is_read: true, state: r.ok ? "declined" : n.state });
    } catch { updateItem(id, { _busy: false }); }
  };

  const handleFollowBack = async (id) => {
    updateItem(id, { _busy: true });
    setTimeout(() => { updateItem(id, { following_back: true, _busy: false, is_read: true }); onFollowBackUser?.(id); }, 350);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={12} md={9} sx={{ width: '100%' }}>
        {/* Header */}
        <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, alignItems: "center", gap: 1 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Badge badgeContent={unreadCount} color="primary"><NotificationsNoneOutlinedIcon /></Badge>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
              <Chip size="small" label={`${unreadCount} unread`} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
              <FormControlLabel control={<Switch checked={showOnlyUnread} onChange={(e) => setShowOnlyUnread(e.target.checked)} size="small" />} label="Unread only" sx={{ m: 0 }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                <Select
                  size="small"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Requests">Contact Requests (Inbox)</MenuItem>
                  <MenuItem value="SentRequests">Sent Contact Requests</MenuItem>
                  <MenuItem value="Follows">Follows</MenuItem>
                  <MenuItem value="Mentions">Mentions</MenuItem>
                  <MenuItem value="Comments">Comments</MenuItem>
                  <MenuItem value="Reactions">Reactions</MenuItem>
                  <MenuItem value="Events">Events</MenuItem>
                  <MenuItem value="System">System</MenuItem>
                  <MenuItem value="Identity">Identity</MenuItem>
                  <MenuItem value="Suggestions">Suggestions</MenuItem>
                  <MenuItem value="Group">Group</MenuItem>
                </Select>
                <Button size="small" variant="outlined" startIcon={<DoneAllIcon />} onClick={handleMarkAllRead} sx={{ whiteSpace: "nowrap" }}>Mark all read</Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {/* Loading / Empty / Content */}
        {loading && items.length === 0 ? (
          <><NotificationSkeleton /><NotificationSkeleton /><NotificationSkeleton /></>
        ) : filtered.length === 0 ? (
          <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">No notifications found.</Typography></Paper>
        ) : (
          <>
            {["Today", "Yesterday", "Earlier"].map((section) => groupedLimited[section]?.length ? (
              <Box key={section} sx={{ mb: 2 }}>
                <Typography variant="overline" sx={{ color: "text.secondary" }}>{section}</Typography>
                <List sx={{ mt: 1 }}>
                  {groupedLimited[section].map((it) => (
                    <ListItem key={it.id} disableGutters sx={{ px: 0 }}>
                      <NotificationRow
                        item={it}
                        onOpen={handleOpen}
                        onAvatarClick={handleAvatarClick} // Pass the handler
                        onToggleRead={handleToggleRead}
                        onAcceptRequest={handleAcceptRequest}
                        onDeclineRequest={handleDeclineRequest}
                        onFollowBack={handleFollowBack}
                        onOpenDigest={handleOpenDigest}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : null)}
            {(hasMore || filtered.length > visibleCount) && (
              <Box ref={observerTarget} sx={{ py: 1, textAlign: "center" }}>{(loading || isLoadingMoreLocal) && <NotificationSkeleton />}</Box>
            )}
          </>
        )}
      </Grid>
      {showScrollTop && (
        <Box sx={{ position: "fixed", bottom: { xs: 72, md: 32 }, right: { xs: 16, md: 32 }, zIndex: 1300 }}>
          <IconButton onClick={handleScrollTop} size="large" sx={{ bgcolor: "primary.main", color: "#fff", boxShadow: 4, borderRadius: "999px", "&:hover": { bgcolor: "primary.dark" } }}><KeyboardArrowUpRoundedIcon /></IconButton>
        </Box>
      )}
    </Grid>
  );
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
