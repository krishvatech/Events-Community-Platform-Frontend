// src/pages/community/GroupsPage.jsx
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  Card,
  CardContent,
  CardActions,
  Alert,
  Avatar,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
} from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import SearchIcon from "@mui/icons-material/Search";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";
const JOIN_BTN_SX = {
  textTransform: "none",
  whiteSpace: "nowrap",
  minWidth: 124,
  px: 2.25,
  fontWeight: 600,
  borderRadius: 2,
};

const ITEMS_PER_PAGE = 6;

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

const toAbsolute = (u) =>
  !u
    ? ""
    : /^https?:\/\//i.test(u)
      ? u
      : `${import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN}${u.startsWith("/") ? "" : "/"
      }${u}`;

function authHeader() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------- Single group card ---------- */
function GroupGridCard({ g, onJoin, onOpen, hideJoin }) {
  const isPrivate = (g.visibility || "").toLowerCase() === "private";
  const members = g.member_count ?? g.members_count ?? g.members?.length ?? 0;

  const visibility = (g.visibility || "").toLowerCase();
  const jp = (g.join_policy || "").toLowerCase();
  const isApproval =
    visibility === "public" && (jp === "public_approval" || jp === "approval");
  const pending = (g.membership_status || "").toLowerCase() === "pending";
  const joined =
    (g.membership_status || "").toLowerCase() === "joined" || !!g.is_member;

  const ctaText = joined
    ? "Joined"
    : pending
      ? "Request pending"
      : isApproval
        ? "Request"
        : "Join";

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        borderRadius: 3,
        overflow: "hidden",
        borderColor: BORDER,
        height: 280,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        onClick={() => onOpen?.(g)}
        sx={{
          width: "100%",
          height: 130,
          bgcolor: "#f8fafc",
          borderBottom: `1px solid ${BORDER}`,
          backgroundImage:
            g.cover_image || g.cover
              ? `url(${toAbsolute(g.cover_image || g.cover)})`
              : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: "pointer",
        }}
      />

      <CardContent
        sx={{ flexGrow: 1, pb: 1, cursor: "pointer" }}
        onClick={() => onOpen?.(g)}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="caption" color="text.secondary">
            {isPrivate ? "Private" : "Public"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {members} Member
          </Typography>
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {g.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {g.category || g.topic || g.description || g.name}
        </Typography>
        {g.parent_group && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Subgroup of <b>{g.parent_group.name}</b>
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, pb: 1, px: 1 }}>
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
          {!hideJoin && (
            <Button
              size="small"
              color="primary"
              variant={joined ? "outlined" : "contained"}
              onClick={() => onJoin?.(g)}
              sx={{ ...JOIN_BTN_SX, flex: 1 }}
              disabled={pending || joined}
              title={ctaText}
            >
              {ctaText}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            sx={{ flex: 1 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen?.(g);
            }}
          >
            Details
          </Button>
        </Stack>
      </CardActions>
    </Card>
  );
}

function GroupGridCardSkeleton() {
  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        borderRadius: 3,
        overflow: "hidden",
        borderColor: BORDER,
        height: 280,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Cover skeleton */}
      <Box
        sx={{
          width: "100%",
          height: 130,
          bgcolor: "#f8fafc",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>

      {/* Content skeleton */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={60} height={16} />
        </Stack>

        <Skeleton variant="text" width="70%" height={24} />
        <Skeleton variant="text" width="90%" height={18} />
      </CardContent>

      {/* Buttons skeleton */}
      <CardActions sx={{ pt: 0, pb: 1, px: 1 }}>
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
          <Skeleton variant="rectangular" width="50%" height={32} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" width="50%" height={32} sx={{ borderRadius: 2 }} />
        </Stack>
      </CardActions>
    </Card>
  );
}

/* ---------- Header with title + overlapping avatars ---------- */
function TopicHeader({ title, previews = [], extraCount = 0 }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        mb: 2,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
          <Stack direction="row" sx={{ "& > *": { border: "2px solid #fff" } }}>
            {previews.slice(0, 3).map((p, i) => (
              <Avatar
                key={p.id || i}
                src={p.avatarUrl}
                alt={p.name}
                sx={{
                  width: 36,
                  height: 36,
                  ml: i === 0 ? 0 : -1.2,
                }}
              >
                {(p.name || "U").slice(0, 1)}
              </Avatar>
            ))}
          </Stack>
          {extraCount > 0 && (
            <Box
              sx={{
                ml: -1,
                px: 1,
                py: 0.25,
                fontSize: 12,
                borderRadius: 999,
                border: `1px solid ${BORDER}`,
                bgcolor: "#fff",
              }}
            >
              +{extraCount}
            </Box>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function GroupQuickViewDialog({ open, group, onClose, onJoin }) {
  if (!group) return null;

  const members = group.member_count ?? group.members_count ?? group.members?.length ?? 0;
  const isPrivate = (group.visibility || "").toLowerCase() === "private";
  const visibility = (group.visibility || "").toLowerCase();
  const jp = (group.join_policy || "").toLowerCase();
  const pending = (group.membership_status || "").toLowerCase() === "pending";
  const joined =
    (group.membership_status || "").toLowerCase() === "joined" || !!group.is_member;
  const isApproval =
    visibility === "public" && (jp === "public_approval" || jp === "approval");
  const ctaText = joined
    ? "Joined"
    : pending
      ? "Request pending"
      : isApproval
        ? "Request to join"
        : "Join";

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{group.name}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            width: "100%",
            height: 180,
            mb: 2,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#f8fafc",
            border: `1px solid ${BORDER}`,
            backgroundImage:
              group.cover_image || group.cover
                ? `url(${toAbsolute(group.cover_image || group.cover)})`
                : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {isPrivate ? "Private" : "Public"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            •
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {members} members
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {group.description || "No description provided."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => onJoin?.(group)}
          disabled={pending || joined}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {ctaText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Normalize "joined-groups" API result
function normalizeMyGroup(row) {
  if (row?.name && !row.group) {
    return { ...row, is_member: true, membership_status: "joined" };
  }
  if (row?.group) {
    const g = row.group;
    return {
      ...g,
      id: g.id,
      name: g.name,
      description: g.description || g.about || "",
      member_count:
        g.member_count ??
        g.members_count ??
        (Array.isArray(g.members) ? g.members.length : g.members ?? 0),
      cover_image: g.cover_image || g.coverImage || null,
      visibility: g.visibility || "public",
      is_member: true,
      membership_status: "joined",
    };
  }
  return null;
}


export default function GroupsPage({ onJoinGroup = async () => { }, user }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const headerTitle = params.get("topic") || "Community Groups";

  const [tabIndex, setTabIndex] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [exploreGroups, setExploreGroups] = React.useState([]);
  const [myGroups, setMyGroups] = React.useState([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [quickOpen, setQuickOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const openQuick = (g) => {
    setSelected(g);
    setQuickOpen(true);
  };

  const [previews, setPreviews] = React.useState([]);
  const [extraCount, setExtraCount] = React.useState(0);

  async function fetchExploreGroups() {
    try {
      const r = await fetch(`${API_ROOT}/groups/explore-groups/`, {
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (r.status === 401) throw new Error("Please log in to see groups.");
      const d = await r.json().catch(() => ({}));
      const list = Array.isArray(d) ? d : d.results || [];
      setExploreGroups(list);

      const mp = list?.[0]?.members_preview;
      if (Array.isArray(mp) && mp.length) {
        setPreviews(mp.slice(0, 3));
        setExtraCount(Math.max(0, mp.length - 3));
      } else {
        setPreviews([
          { id: 1, name: "A", avatarUrl: "" },
          { id: 2, name: "B", avatarUrl: "" },
        ]);
        setExtraCount(0);
      }
    } catch (e) {
      console.error(e);
      if (tabIndex === 0) setError(e?.message || "Failed to load groups");
    }
  }

  async function fetchMyGroups() {
    try {
      const r = await fetch(`${API_ROOT}/groups/joined-groups/`, {
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (r.ok) {
        const d = await r.json();
        const rows = Array.isArray(d) ? d : d?.results || [];
        const normalized = rows.map(normalizeMyGroup).filter(Boolean);
        setMyGroups(normalized);
      }
    } catch (e) {
      console.error("Failed to load joined groups:", e);
    }
  }

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchExploreGroups(), fetchMyGroups()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const handleJoin = async (g) => {
    const visibility = (g.visibility || "").toLowerCase();
    const jp = (g.join_policy || "").toLowerCase();

    const isApproval =
      visibility === "public" && (jp === "public_approval" || jp === "approval");
    const path = isApproval ? "join-group/request" : "join-group";

    try {
      const r = await fetch(`${API_ROOT}/groups/${g.id}/${path}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({}),
      });

      if (r.status === 401) throw new Error("Please log in to join.");

      if (r.ok) {
        fetchExploreGroups();
        fetchMyGroups();
        return;
      }

      const payload = await r.json().catch(() => ({}));
      throw new Error(payload?.detail || "Failed to join group");
    } catch (e) {
      alert(e?.message || "Failed to join group");
    }
  };

  const allGroupsCombined = React.useMemo(() => {
    const map = new Map();

    exploreGroups.forEach((g) => {
      if (!g || g.id == null) return;
      map.set(g.id, g);
    });

    myGroups.forEach((mg) => {
      if (!mg || mg.id == null) return;
      if (map.has(mg.id)) {
        const existing = map.get(mg.id);
        map.set(mg.id, {
          ...existing,
          is_member: true,
          membership_status: "joined",
        });
      } else {
        map.set(mg.id, mg);
      }
    });

    return Array.from(map.values());
  }, [exploreGroups, myGroups]);

  const activeList = tabIndex === 0 ? allGroupsCombined : myGroups;

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return activeList.filter((g) => {
      if (t) {
        const hay = `${g.name || ""} ${g.description || ""} ${g.slug || ""
          }`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [activeList, q]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [q, tabIndex]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedGroups = React.useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (_event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          gap: 3,
          px: { xs: 0, sm: 2, md: 2.5, lg: 3 },
          maxWidth: { xs: "100%", lg: "1200px" },
          mx: "auto",
        }}
      >
        {/* LEFT: Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TopicHeader
            title={headerTitle}
            previews={previews}
            extraCount={extraCount}
          />

          {/* TABS + FILTER BAR */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `1px solid ${BORDER}`,
              borderRadius: 3,
              mb: 2,
            }}
          >
            <Stack spacing={2}>
              <Tabs
                value={tabIndex}
                onChange={(_e, v) => setTabIndex(v)}
                variant="standard"
                textColor="primary"
                indicatorColor="primary"
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="All Groups" />
                <Tab label="My Groups" />
              </Tabs>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={
                      tabIndex === 0 ? "Search all groups..." : "Search my groups..."
                    }
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {/* Loading / error */}
          {!loading && error && tabIndex === 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* === GROUP GRID: exactly 3 cards per row on md+ === */}
          {loading ? (
            // 🔹 Skeleton loading state (keep layout same as real grid)
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <Box key={i}>
                  <GroupGridCardSkeleton />
                </Box>
              ))}
            </Box>
          ) : paginatedGroups.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {paginatedGroups.map((g) => {
                const joined =
                  (g.membership_status || "").toLowerCase() === "joined" ||
                  !!g.is_member;

                const handleOpen = (group) => {
                  // If joined (in any tab) → go to details page
                  if (joined || tabIndex === 1) {
                    navigate(`/community/groups/${group.id}`);
                  } else {
                    // Not joined + All Groups tab → open quick view
                    openQuick(group);
                  }
                };

                return (
                  <Box key={g.id}>
                    <GroupGridCard
                      g={g}
                      onJoin={handleJoin}
                      onOpen={handleOpen}
                      hideJoin={tabIndex === 1 || joined}
                    />
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {tabIndex === 0
                  ? "No groups found."
                  : "You haven't joined any groups yet."}
              </Typography>
            </Paper>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          <GroupQuickViewDialog
            open={quickOpen}
            group={selected}
            onClose={() => setQuickOpen(false)}
            onJoin={handleJoin}
          />
        </Box>
      </Box>
    </Box>
  );
}
