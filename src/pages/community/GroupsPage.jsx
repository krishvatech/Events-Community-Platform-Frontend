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
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Alert,
  Avatar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function authHeader() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ---------- Single group card ---------- */
function GroupGridCard({ g, onJoin }) {
  const isPrivate = (g.visibility || "").toLowerCase() === "private";
  const groupPath = `/community/group/${g.slug || g.id}`;
  const members = g.member_count ?? g.members_count ?? g.members?.length ?? 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        borderColor: BORDER,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: 130,
          bgcolor: "#f8fafc",
          borderBottom: `1px solid ${BORDER}`,
          backgroundImage: g.cover ? `url(${g.cover})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
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
          variant="contained"
          onClick={() => onJoin?.(g)}
          sx={{ textTransform: "none" }}
          disabled={(g.membership_status || "").toLowerCase() === "pending"}
        >
          {(g.membership_status || "").toLowerCase() === "pending" ? "Request pending" : "Join"}
        </Button>

        <Button
          size="small"
          variant="outlined"
          component={RouterLink}
          to={groupPath}
          sx={{ textTransform: "none", ml: 1 }}
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

export default function GroupsPage({ onJoinGroup = async (_g) => { }, user }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);

  // If you pass ?topic=Something in URL, header uses it; else default
  const headerTitle = params.get("topic") || "Sustainable Living";

  // Filters (visibility removed as requested)
  const [q, setQ] = React.useState("");
  const [locationQ, setLocationQ] = React.useState("");
  const [typeTab, setTypeTab] = React.useState("groups"); // UI only

  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // participants preview for header (fallback images)
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

      // If backend ever returns a members preview, plug it in here
      // looking for list[0].members_preview = [{name, avatarUrl}, ...]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async (g) => {
    try {
      await onJoinGroup?.(g);
    } finally {
      setGroups((curr) =>
        curr.map((it) =>
          it.id === g.id ? { ...it, is_member: true, membership_status: "joined" } : it
        )
      );
    }
  };

  const clearAll = () => {
    setQ("");
    setLocationQ("");
  };

  // Local filtering only (no endpoint changes)
  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    const loc = locationQ.trim().toLowerCase();
    return groups.filter((g) => {
      if (t) {
        const hay = `${g.name || ""} ${g.description || ""} ${g.slug || ""}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (loc) {
        const locHay = [g.location_name, g.city, g.state, g.country, g.region, g.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!locHay.includes(loc)) return false;
      }
      return true;
    });
  }, [groups, q, locationQ]);

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
      <Grid container spacing={2}>
        {/* LEFT: header + filters + grid */}
        <Grid item xs={12} md={8}>
          {/* Big header like your mock */}
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

            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Search by location
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Type and select a location"
                value={locationQ}
                onChange={(e) => setLocationQ(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={clearAll}
              sx={{ whiteSpace: "nowrap", alignSelf: { xs: "flex-end", md: "flex-end" } }}
            >
              Clear all Filters
            </Button>
          </Stack>

          {/* Posts / Groups toggle (UI only) */}
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
            <Button
              size="small"
              variant={typeTab === "posts" ? "contained" : "outlined"}
              onClick={() => setTypeTab("posts")}
              sx={{ textTransform: "none" }}
            >
              Posts
            </Button>
            <Button
              size="small"
              variant={typeTab === "groups" ? "contained" : "outlined"}
              onClick={() => setTypeTab("groups")}
              sx={{ textTransform: "none" }}
            >
              Groups
            </Button>
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
          <Grid container spacing={2}>
            {filtered.map((g) => (
              <Grid key={g.id} item size={4}>
                <GroupGridCard g={g} onJoin={handleJoin} />
              </Grid>
            ))}

            {!loading && filtered.length === 0 && (
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No groups match your filters.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* RIGHT: stacked community profile card as in the mock */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <CommunityProfileCard user={user} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
