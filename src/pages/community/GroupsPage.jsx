// src/pages/community/GroupsPage.jsx
import * as React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  Card, CardContent, CardActions, LinearProgress, Alert, Avatar, Pagination,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
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

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
// derive the backend origin (e.g. http://127.0.0.1:8000) from API_ROOT
const API_ORIGIN = (() => {
  try { const u = new URL(API_ROOT); return `${u.protocol}//${u.host}`; } catch { return ""; }
})();

// turn relative "/media/..." into absolute "http://host/media/..."
const toAbsolute = (u) =>
  !u ? "" : /^https?:\/\//i.test(u)
    ? u
    : `${(import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN)}${u.startsWith("/") ? "" : "/"}${u}`;


function authHeader() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------- Single group card ---------- */
function GroupGridCard({ g, onJoin, onOpen }) {
  const isPrivate = (g.visibility || "").toLowerCase() === "private";
  const groupPath = `/community/group/${g.slug || g.id}`;
  const members = g.member_count ?? g.members_count ?? g.members?.length ?? 0;

  const visibility = (g.visibility || "").toLowerCase();
  const jp = (g.join_policy || "").toLowerCase();
  const isApproval =
    visibility === "public" && (jp === "public_approval" || jp === "approval");
  const pending = (g.membership_status || "").toLowerCase() === "pending";
  const joined =
    (g.membership_status || "").toLowerCase() === "joined" || !!g.is_member;

  const ctaText = joined ? "Joined" : pending ? "Request pending" : (isApproval ? "Request to join" : "Join");

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",          // fill the Grid column
        borderRadius: 3,
        overflow: "hidden",
        borderColor: BORDER,
        height: 280,
        display: "flex",
        flexDirection: "column",
        // ❌ remove maxWidth and mx
        // maxWidth: { xs: "100%", sm: 320, lg: 360 },
        // mx: "auto",
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
            (g.cover_image || g.cover)
              ? `url(${toAbsolute(g.cover_image || g.cover)})`
              : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: "pointer"
        }}
      />

      <CardContent sx={{ flexGrow: 1, pb: 1, cursor: "pointer" }} onClick={() => onOpen?.(g)}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
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
      </CardContent>

      <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
        <Button
          size="small"
          color="primary"
          variant="contained"
          onClick={() => onJoin?.(g)}
          sx={JOIN_BTN_SX}
          disabled={pending || joined}
          title={ctaText}
        >
          {ctaText}
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen?.(g);
          }}
        >
          Details
        </Button>
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
  const joined = (group.membership_status || "").toLowerCase() === "joined" || !!group.is_member;
  const isApproval = visibility === "public" && (jp === "public_approval" || jp === "approval");
  const ctaText = joined ? "Joined" : pending ? "Request pending" : (isApproval ? "Request to join" : "Join");

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{group.name}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            width: "100%", height: 180, mb: 2, borderRadius: 2, overflow: "hidden",
            bgcolor: "#f8fafc", border: `1px solid ${BORDER}`,
            backgroundImage:
              (group.cover_image || group.cover)
                ? `url(${toAbsolute(group.cover_image || group.cover)})`
                : "none",
            backgroundSize: "cover", backgroundPosition: "center",
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {isPrivate ? "Private" : "Public"}
          </Typography>
          <Typography variant="caption" color="text.secondary">•</Typography>
          <Typography variant="caption" color="text.secondary">{members} members</Typography>
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


export default function GroupsPage({ onJoinGroup = async (_g) => { }, user }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);

  const headerTitle = params.get("topic") || "Sustainable Living";

  const [q, setQ] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [quickOpen, setQuickOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const openQuick = (g) => { setSelected(g); setQuickOpen(true); };

  const [previews, setPreviews] = React.useState([
    {
      id: 1,
      name: "A",
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop",
    },
    {
      id: 2,
      name: "B",
      avatarUrl:
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&auto=format&fit=crop",
    },
    {
      id: 3,
      name: "C",
      avatarUrl:
        "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&auto=format&fit=crop",
    },
  ]);
  const [extraCount, setExtraCount] = React.useState(3);

  async function loadGroups() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_ROOT}/groups/explore-groups/`, {
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (r.status === 401) throw new Error("Please log in to see groups.");
      const d = await r.json().catch(() => ({}));
      const list = Array.isArray(d) ? d : d.results || [];
      setGroups(list);

      const mp = list?.[0]?.members_preview;
      if (Array.isArray(mp) && mp.length) {
        setPreviews(mp.slice(0, 3));
        setExtraCount(Math.max(0, mp.length - 3));
      }
    } catch (e) {
      setError(e?.message || "Failed to load groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadGroups();
  }, []);

  const handleJoin = async (g) => {
    const visibility = (g.visibility || "").toLowerCase();
    const jp = (g.join_policy || "").toLowerCase();

    const isApproval = visibility === "public" && (jp === "public_approval" || jp === "approval");
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
        window.location.reload();
        return;
      }

      const payload = await r.json().catch(() => ({}));
      throw new Error(payload?.detail || "Failed to join group");
    } catch (e) {
      setError(e?.message || "Failed to join group");
    }
  };

  const clearAll = () => {
    setQ("");
    setCurrentPage(1);
  };

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (t) {
        const hay = `${g.name || ""} ${g.description || ""} ${g.slug || ""}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [groups, q]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  // Paginated results
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedGroups = React.useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    // Scroll to top of groups section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          gap: 3,
          px: { xs: 0, sm: 2, md: 2.5, lg: 3 },   // reduced left/right padding
          maxWidth: { xs: "100%", lg: "1200px" },
          mx: "auto",
        }}
      >
        {/* LEFT: Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TopicHeader title={headerTitle} previews={previews} extraCount={extraCount} />

          {/* Filter bar */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ mb: 1.5 }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Search for Groups
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search a name or a keyword"
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

          {/* Loading / error */}
          {loading && (
            <Paper sx={{ p: 1.5, mb: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <LinearProgress />
            </Paper>
          )}
          {!loading && error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 3-column grid */}
          <Grid
            container
            rowSpacing={2}
            columnSpacing={{ xs: 0, sm: 2 }}   // ⬅️ no left/right gap on mobile
          >
            {paginatedGroups.map((g) => (
              <Grid key={g.id} item xs={12} sm={4} md={4}>
                <GroupGridCard g={g} onJoin={handleJoin} onOpen={openQuick} />
              </Grid>
            ))}

            {!loading && paginatedGroups.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No groups match your filters.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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

        {/* RIGHT: Sidebar - sticky */}
        <Box
          sx={{
            width: 150,
            display: "none",                       // hidden by default
            "@media (min-width:1440px)": {
              display: "block",                    // show only on 1440px+
            },
            position: "sticky",
            top: 88,
            height: "fit-content",
            flexShrink: 0,
          }}
        >
          <Stack spacing={2}>
            <CommunityProfileCard user={user} />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}