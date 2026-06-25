// src/pages/community/ForumPage.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(
  /\/$/,
  ""
);

const API_ORIGIN = (() => {
  try {
    const u = new URL(API_ROOT);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
})();

const BORDER = "#e2e8f0";
const TEAL = "#0A9396";
const ORANGE = "#E8532F";
const NAVY = "#1B2A4A";
const ITEMS_PER_PAGE = 6;

function authHeader() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const toAbsolute = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const bust = (url, key) => {
  if (!url) return "";
  const absolute = toAbsolute(url);
  const sep = absolute.includes("?") ? "&" : "?";
  return `${absolute}${sep}v=${encodeURIComponent(key || "forum")}`;
};

const isForumEnabled = (group) => {
  const value = group?.forum_enabled;
  return value === true || String(value).toLowerCase() === "true";
};

const normalizeMembershipStatus = (group) => {
  const raw =
    group?.membership_status ??
    group?.status ??
    group?.membership?.status ??
    group?.current_user_membership?.status ??
    "";
  return String(raw || "").toLowerCase();
};

const isJoined = (group) => {
  const status = normalizeMembershipStatus(group);
  const role = String(group?.current_user_role || "").toLowerCase();
  return (
    group?.is_member === true ||
    status === "active" ||
    status === "joined" ||
    status === "member" ||
    status === "approved" ||
    ["owner", "admin", "moderator", "member"].includes(role)
  );
};

const isPending = (group) => {
  const status = normalizeMembershipStatus(group);
  return status === "pending" || status === "requested" || status === "request";
};

const normalizeJoinPolicy = (group) => {
  const value = String(group?.join_policy || "").toLowerCase().trim();
  if (value === "public_approval" || value === "request") return "approval";
  return value || "open";
};

const normalizeVisibility = (group) => String(group?.visibility || "public").toLowerCase().trim();

function normalizeMyGroup(row) {
  if (row?.name && !row.group) {
    const status = row.membership_status || row.status || "joined";
    return {
      ...row,
      is_member:
        typeof row.is_member === "boolean"
          ? row.is_member
          : ["active", "joined", "member", "approved"].includes(String(status).toLowerCase()),
      membership_status: status,
    };
  }

  if (row?.group) {
    const group = row.group;
    const status = row.membership_status || row.status || group.membership_status || "joined";
    return {
      ...group,
      is_member: ["active", "joined", "member", "approved"].includes(String(status).toLowerCase()),
      membership_status: status,
    };
  }

  return null;
}

function mergeGroups(exploreGroups, myGroups) {
  const map = new Map();

  exploreGroups.forEach((group) => {
    if (!group || group.id == null) return;
    map.set(String(group.id), group);
  });

  myGroups.forEach((group) => {
    if (!group || group.id == null) return;
    const key = String(group.id);
    if (map.has(key)) {
      map.set(key, { ...map.get(key), ...group });
    } else {
      map.set(key, group);
    }
  });

  return Array.from(map.values());
}

function ForumCardSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER, overflow: "hidden" }}>
      <Skeleton variant="rectangular" height={140} />
      <CardContent>
        <Stack spacing={1.25}>
          <Skeleton width="35%" />
          <Skeleton height={28} width="75%" />
          <Skeleton width="95%" />
          <Skeleton width="70%" />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={74} height={24} />
            <Skeleton variant="rounded" width={88} height={24} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ForumCard({ group, onOpen, onJoin, joiningId }) {
  const joined = isJoined(group);
  const pending = isPending(group);
  const visibility = normalizeVisibility(group);
  const joinPolicy = normalizeJoinPolicy(group);
  const inviteOnly = joinPolicy === "invite";
  const approvalRequired = joinPolicy === "approval";
  const members = group.member_count ?? group.members_count ?? group.members?.length ?? 0;
  const posts = group.post_count ?? group.posts_count ?? group.posts?.length ?? 0;
  const groupId = group.id || group.slug;
  const cover = group.cover_image || group.cover || group.coverImage;
  const logo = group.logo || group.icon || group.avatar;
  const loadingJoin = joiningId && String(joiningId) === String(groupId);

  const joinLabel = pending
    ? "Request pending"
    : inviteOnly
      ? "Invite only"
      : approvalRequired
        ? "Request to join"
        : "Join forum";

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        borderColor: BORDER,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fff",
        transition: "box-shadow .2s ease, transform .2s ease, border-color .2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "rgba(10,147,150,.45)",
          boxShadow: "0 12px 32px rgba(15,23,42,.08)",
        },
      }}
    >
      <Box sx={{ position: "relative", height: 150, bgcolor: "#eef2f7", cursor: "pointer" }} onClick={() => onOpen(group)}>
        {cover ? (
          <img
            src={bust(cover, group.updated_at)}
            alt={group.name || "Forum cover"}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, rgba(10,147,150,.16), rgba(232,83,47,.16))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: TEAL,
            }}
          >
            <ForumRoundedIcon sx={{ fontSize: 46 }} />
          </Box>
        )}

        <Avatar
          src={logo ? bust(logo, group.updated_at) : ""}
          sx={{
            position: "absolute",
            left: 18,
            bottom: -24,
            width: 54,
            height: 54,
            border: "3px solid #fff",
            bgcolor: TEAL,
            fontWeight: 800,
            boxShadow: "0 4px 14px rgba(15,23,42,.18)",
          }}
        >
          {(group.name || "F").charAt(0).toUpperCase()}
        </Avatar>
      </Box>

      <CardContent sx={{ pt: 4.5, flex: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
          <Chip
            size="small"
            icon={visibility === "private" ? <LockRoundedIcon /> : <PublicRoundedIcon />}
            label={visibility === "private" ? "Private" : "Public"}
            sx={{ bgcolor: visibility === "private" ? "#fff7ed" : "#ecfeff", color: visibility === "private" ? "#c2410c" : "#0f766e" }}
          />
          {joined && <Chip size="small" label="Joined" sx={{ bgcolor: "#f0fdfa", color: "#0f766e", fontWeight: 700 }} />}
          {pending && <Chip size="small" label="Pending" sx={{ bgcolor: "#fffbeb", color: "#b45309", fontWeight: 700 }} />}
        </Stack>

        <Typography
          onClick={() => onOpen(group)}
          sx={{
            color: NAVY,
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1.25,
            mb: 0.75,
            "&:hover": { color: TEAL },
          }}
        >
          {group.name || "Untitled forum"}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            fontSize: 13,
            lineHeight: 1.55,
            minHeight: 42,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {group.description || "Join this forum-enabled group to follow discussions and participate in posts."}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mt: 2, color: "#64748b" }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PeopleAltRoundedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{members} members</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{posts} posts</Typography>
          </Stack>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
        <Button
          fullWidth
          variant={joined ? "contained" : "outlined"}
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={() => onOpen(group)}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 800,
            bgcolor: joined ? TEAL : "transparent",
            borderColor: TEAL,
            color: joined ? "#fff" : TEAL,
            "&:hover": { bgcolor: joined ? "#087f82" : "rgba(10,147,150,.08)", borderColor: TEAL },
          }}
        >
          {joined ? "Open Forum" : "View Forum"}
        </Button>
        {!joined && (
          <Button
            variant="text"
            disabled={pending || inviteOnly || loadingJoin}
            onClick={() => onJoin(group)}
            sx={{ minWidth: 120, textTransform: "none", fontWeight: 800, color: ORANGE }}
          >
            {loadingJoin ? <CircularProgress size={18} /> : joinLabel}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

export default function ForumPage() {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [exploreGroups, setExploreGroups] = React.useState([]);
  const [myGroups, setMyGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [joiningId, setJoiningId] = React.useState(null);

  const loadGroups = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const headers = { Accept: "application/json", ...authHeader() };
      const [exploreRes, joinedRes] = await Promise.all([
        fetch(`${API_ROOT}/groups/explore-groups/`, { headers }),
        fetch(`${API_ROOT}/groups/joined-groups/`, { headers }),
      ]);

      if (exploreRes.status === 401 || joinedRes.status === 401) {
        throw new Error("Please log in to see discussion forums.");
      }

      const exploreData = await exploreRes.json().catch(() => ({}));
      const joinedData = await joinedRes.json().catch(() => ({}));

      const exploreRows = Array.isArray(exploreData) ? exploreData : exploreData.results || [];
      const joinedRows = Array.isArray(joinedData) ? joinedData : joinedData.results || [];

      setExploreGroups(exploreRows.filter(isForumEnabled));
      setMyGroups(joinedRows.map(normalizeMyGroup).filter(Boolean).filter(isForumEnabled));
    } catch (err) {
      console.error("Failed to load forums", err);
      setError(err?.message || "Failed to load discussion forums.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const allForums = React.useMemo(() => mergeGroups(exploreGroups, myGroups), [exploreGroups, myGroups]);
  const activeForums = tab === "mine" ? myGroups : allForums;

  const filteredForums = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return activeForums;
    return activeForums.filter((group) => {
      const haystack = `${group.name || ""} ${group.description || ""} ${group.slug || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [activeForums, query]);

  React.useEffect(() => {
    setPage(1);
  }, [query, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredForums.length / ITEMS_PER_PAGE));
  const pageItems = filteredForums.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const openForum = (group) => {
    const idOrSlug = group.id || group.slug;
    if (!idOrSlug) return;
    navigate(`/community/groups/${idOrSlug}?tab=posts`, {
      state: { backTo: "/community?view=forum", backLabel: "Back to Discussion Forum" },
    });
  };

  const joinForum = async (group) => {
    const groupId = group.id || group.slug;
    if (!groupId || isJoined(group) || isPending(group)) return;

    const visibility = normalizeVisibility(group);
    const joinPolicy = normalizeJoinPolicy(group);
    if (joinPolicy === "invite") return;

    const path = visibility === "public" && joinPolicy === "approval" ? "join-group/request" : "join-group";

    setJoiningId(groupId);
    try {
      const response = await fetch(`${API_ROOT}/groups/${groupId}/${path}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || "Failed to join forum.");
      }

      await loadGroups();
    } catch (err) {
      alert(err?.message || "Failed to join forum.");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 }, bgcolor: "#FAF9F7", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 2.5, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${BORDER}`,
            background: "linear-gradient(135deg, #ffffff 0%, #f8fffe 55%, #fff7f2 100%)",
            p: { xs: 3, md: 4 },
            mb: 3,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              bgcolor: "rgba(10,147,150,.10)",
              right: -70,
              top: -90,
            }}
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" sx={{ position: "relative" }}>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: TEAL, textTransform: "uppercase", letterSpacing: ".14em", mb: 1 }}>
                Community Discussions
              </Typography>
              <Typography variant="h4" sx={{ color: NAVY, fontWeight: 900, lineHeight: 1.15, mb: 1 }}>
                Discussion Forum
              </Typography>
              <Typography sx={{ color: "#64748b", fontSize: 15, maxWidth: 680, lineHeight: 1.65 }}>
                Find forum-enabled groups, follow member conversations, ask questions, share updates, and participate in group posts and polls.
              </Typography>
            </Box>
            <Box
              sx={{
                width: 82,
                height: 82,
                borderRadius: 4,
                bgcolor: "#fff",
                border: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TEAL,
                boxShadow: "0 16px 34px rgba(10,147,150,.14)",
                flexShrink: 0,
              }}
            >
              <ForumRoundedIcon sx={{ fontSize: 42 }} />
            </Box>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            mb: 2.5,
            pb: 2,
            borderBottom: "1px solid #EEECEA",
          }}
        >
          <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { key: "all", label: "All Forums", count: allForums.length },
              { key: "mine", label: "My Forums", count: myGroups.length },
            ].map((item) => (
              <Box
                key={item.key}
                onClick={() => setTab(item.key)}
                sx={{
                  px: 2,
                  py: "7px",
                  borderRadius: "100px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: tab === item.key ? 800 : 600,
                  color: tab === item.key ? NAVY : "#64748b",
                  bgcolor: tab === item.key ? "#fff" : "transparent",
                  border: tab === item.key ? "1.5px solid #EEECEA" : "1.5px solid transparent",
                  boxShadow: tab === item.key ? "0 1px 4px rgba(0,0,0,.06)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                {item.key === "all" ? <ForumRoundedIcon sx={{ fontSize: 16 }} /> : <GroupsRoundedIcon sx={{ fontSize: 16 }} />}
                {item.label}
                <Box component="span" sx={{ fontSize: 11, fontWeight: 800, bgcolor: tab === item.key ? TEAL : "#e5e7eb", color: tab === item.key ? "#fff" : "#64748b", px: "7px", py: "1px", borderRadius: "100px" }}>
                  {item.count}
                </Box>
              </Box>
            ))}
          </Box>

          <TextField
            size="small"
            placeholder="Search forums…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                </InputAdornment>
              ),
              sx: { borderRadius: "12px", bgcolor: "#fff", fontSize: 13 },
            }}
            sx={{ width: { xs: "100%", sm: 280 } }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".08em", mb: 2 }}>
            Showing {filteredForums.length} {tab === "mine" ? "joined" : "available"} forum{filteredForums.length === 1 ? "" : "s"}
          </Typography>
        )}

        {loading ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
              <ForumCardSkeleton key={index} />
            ))}
          </Box>
        ) : pageItems.length ? (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
                gap: 2,
              }}
            >
              {pageItems.map((group) => (
                <ForumCard
                  key={group.id || group.slug}
                  group={group}
                  onOpen={openForum}
                  onJoin={joinForum}
                  joiningId={joiningId}
                />
              ))}
            </Box>

            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => {
                    setPage(value);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        ) : (
          <Paper
            elevation={0}
            sx={{
              border: `1px dashed ${BORDER}`,
              borderRadius: 4,
              bgcolor: "#fff",
              p: { xs: 4, md: 6 },
              textAlign: "center",
            }}
          >
            <ForumRoundedIcon sx={{ fontSize: 48, color: TEAL, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 900, color: NAVY, mb: 1 }}>
              {query ? "No forums match your search." : "No discussion forums are available yet."}
            </Typography>
            <Typography sx={{ color: "#64748b", maxWidth: 560, mx: "auto", mb: 2 }}>
              Forums appear here when a group admin enables the forum setting for a group. You can still explore all groups and join the ones relevant to you.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<GroupsRoundedIcon />}
              onClick={() => navigate("/community?view=groups")}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 800, borderColor: TEAL, color: TEAL }}
            >
              Explore Groups
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
