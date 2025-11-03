// src/pages/community/GroupsPage.jsx
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, InputAdornment, MenuItem, Paper, Select, Stack,
  TextField, Typography, Card, CardContent, CardActions, CardHeader, Tooltip,
  Tabs, Tab,LinearProgress, Alert
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";

const API_ROOT = (import.meta.env.VITE_API_ROOT || "http://127.0.0.1:8000/api").replace(/\/$/, "");
function authHeader() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function GroupRow({ g, onJoin, showJoin = true }) {
  const isPrivate = (g.visibility || "").toLowerCase() === "private";
  const groupPath = `/community/group/${g.slug || g.id}`;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#e2e8f0" }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        {/* Left: image + texts */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Avatar
            component={RouterLink}
            to={groupPath}
            src={g.avatar || g.cover}
            sx={{ width: 56, height: 56, borderRadius: 2 }}
            aria-label={`Open ${g.name} group`}
          >
            {g.name?.[0]}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={RouterLink}
              to={groupPath}
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                textDecoration: "none",
                color: "inherit",
                "&:hover": { textDecoration: "underline" },
              }}
              aria-label={`Open ${g.name} group`}
            >
              {g.name}
            </Typography>


            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
              {/* member count */}
              <Typography variant="body2" color="text.secondary">
                {(g.member_count || 0)} members
              </Typography>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.75 }} />

              {/* privacy */}
              <Chip
                size="small"
                icon={isPrivate ? <LockOutlinedIcon /> : <GroupOutlinedIcon />}
                label={isPrivate ? "Private" : "Public"}
                variant="outlined"
              />
            </Stack>
          </Box>
        </Stack>

        {/* Right: Join / Request (hidden for "My groups") */}
        {showJoin && (
          <Button
            size="small"
            variant="contained"
            onClick={() => onJoin?.(g)}
          >
            {isPrivate ? "Request to join" : "Join"}
          </Button>
        )}
      </Stack>
    </Paper >
  );
}


function GroupCard({ g, onOpen, onJoin }) {
  const isPrivate = g.visibility === "private";
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, overflow: "hidden", borderColor: BORDER }}
    >
      {g.cover && (
        <Box component="img" src={g.cover} alt="" sx={{ width: "100%", height: 120, objectFit: "cover" }} />
      )}
      <CardHeader
        avatar={<Avatar src={g.avatar}>{g.name?.[0]}</Avatar>}
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{g.name}</Typography>
            <Chip
              size="small"
              icon={isPrivate ? <LockOutlinedIcon /> : <GroupOutlinedIcon />}
              label={isPrivate ? "Private" : "Public"}
              variant="outlined"
            />
            <Chip size="small" label={`${g.member_count || 0} members`} />
          </Stack>
        }
        subheader={g.slug ? `/${g.slug}` : ""}
      />
      <CardContent sx={{ pt: 0 }}>
        {g.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {g.description}
          </Typography>
        )}
        {g.tags?.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {g.tags.map((t) => <Chip key={t} size="small" label={t} />)}
          </Stack>
        ) : null}
      </CardContent>
      <CardActions sx={{ justifyContent: "space-between" }}>
        <Button size="small" variant="outlined" onClick={() => onOpen?.(g)}>
          Open
        </Button>
        <Button size="small" variant="contained" onClick={() => onJoin?.(g)}>
          {isPrivate ? "Request to join" : "Join"}
        </Button>
      </CardActions>
    </Card>
  );
}

export default function GroupsPage({
  groups: initialGroups,
  onOpenGroup = (g) => { },
  onJoinGroup = (g) => { },
  onCreateGroup = (payload, memberIds) => { }, // persist to backend if you pass this
  user, stats, tags = [],
}) {
  const [q, setQ] = React.useState("");
  const [visibility, setVisibility] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("recent");
  const [open, setOpen] = React.useState(false);

  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [tab, setTab] = React.useState("explore"); // "explore" | "mine"

  // Decide if the current user has joined a group.
  // Works with several common backend shapes (pick any that you return).
  const isJoined = React.useCallback(
    (g) => {
      const lc = (v) => (v || "").toLowerCase();
      const roles = ["owner", "admin", "moderator", "member"];
      const statuses = ["approved", "member", "joined", "active"];
      return Boolean(
        g?.is_member || g?.am_i_member || g?.joined || g?.isJoined ||
        roles.includes(lc(g?.my_role)) || roles.includes(lc(g?.role)) ||
        statuses.includes(lc(g?.membership_status)) ||
        roles.includes(lc(g?.membership?.role)) ||
        statuses.includes(lc(g?.membership?.status)) ||
        (Array.isArray(g?.members) && user?.id &&
          g.members.some((m) => m?.id === user.id))
      );
    },
    [user?.id]
  );

  const handleJoin = async (g) => {
    try {
      await onJoinGroup?.(g); // your existing backend join
    } finally {
      // optimistic local update so Explore hides it right away
      setGroups((curr) =>
        curr.map((it) =>
          it.id === g.id
            ? { ...it, is_member: true, membership_status: "joined", my_role: it.my_role ?? "member" }
            : it
        )
      );
    }
  };


  const filtered = React.useMemo(() => {
  let arr = [...groups]; // Trust backend: "mine" already = joined; "explore" = discoverable
  const t = q.trim().toLowerCase();
  if (t) {
    arr = arr.filter(
      (g) =>
        g.name?.toLowerCase().includes(t) ||
        g.description?.toLowerCase().includes(t)
    );
  }
  if (tab !== "mine" && visibility !== "All") {
    arr = arr.filter(
      (g) => (g.visibility || "").toLowerCase() === visibility.toLowerCase()
    );
  }
  if (sortBy === "recent") {
    arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortBy === "members") {
    arr.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
  }
  return arr;
}, [groups, q, visibility, sortBy, tab]);
  const handleCreate = (payload, memberIds) => {
    setGroups((curr) => [payload, ...curr]);
    onCreateGroup?.(payload, memberIds);
  };

  async function loadTabData(nextTab = tab) {
  setLoading(true);
  setError("");
  try {
    // Use your backend endpoints
    // "mine" = joined groups; "explore" = discoverable groups
    const endpoint = nextTab === "mine" ? "groups/joined/" : "groups/explore/";
    const r = await fetch(`${API_ROOT}/${endpoint}`, {
      headers: {
        Accept: "application/json",
        ...authHeader(),
      },
    });
    // handle unauthorized
    if (r.status === 401) {
      throw new Error("Please log in to see your groups.");
    }
    const d = await r.json().catch(() => ({}));
    const list = Array.isArray(d) ? d : d.results || [];
    setGroups(list);
  } catch (e) {
    setError(e?.message || "Failed to load groups");
    setGroups([]);
  } finally {
    setLoading(false);
  }
}


  React.useEffect(() => {
  loadTabData(tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tab]);

  return (
    <Grid container spacing={2}>
      {/* Center: groups list */}
      <Grid item xs={12} md={12}>
        <Box sx={{ width: '100%', maxWidth: { md: 750 }, mx: 'auto' }}>
          <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <TextField
                size="small" placeholder="Search groups…" fullWidth
                value={q} onChange={(e) => setQ(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              />
              <TextField
                select size="small" label="Visibility" value={visibility}
                onChange={(e) => setVisibility(e.target.value)} sx={{ minWidth: 160 }}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Public">Public</MenuItem>
                <MenuItem value="Private">Private</MenuItem>
              </TextField>
              <TextField
                select size="small" label="Sort by" value={sortBy}
                onChange={(e) => setSortBy(e.target.value)} sx={{ minWidth: 160 }}
              >
                <MenuItem value="recent">Most recent</MenuItem>
                <MenuItem value="members">Most members</MenuItem>
              </TextField>
            </Stack>
            <Divider sx={{ my: 1.25 }} />
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab value="explore" label="Explore groups" />
              <Tab value="mine" label="My groups" />
            </Tabs>
          </Paper>

          {loading && (
            <Paper sx={{ p: 1.5, mb: 1.25, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <LinearProgress />
            </Paper>
          )}
          {!loading && error && (
            <Alert severity="error" sx={{ mb: 1.25 }}>{error}</Alert>
          )}
          <Stack spacing={1.25}>
            {filtered.map((g) => (
              <GroupRow key={g.id} g={g} onJoin={handleJoin} showJoin={tab !== "mine"} />
            ))}
            {filtered.length === 0 && (
              <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No groups match your filters.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Box>
      </Grid>
      {/* Right: Profile (sticky like left sidebar) */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box
          sx={{
            position: "sticky",
            top: 88,            // adjust if your header is taller/shorter (e.g., 72–104)
            alignSelf: "flex-start"
          }}
        >
          <CommunityProfileCard user={user} stats={stats} tags={tags} />
        </Box>
      </Grid>
    </Grid>
  );
}

/* ---------------- Demo data ---------------- */
function demoGroups() {
  const now = Date.now();
  return [
    {
      id: "g1",
      name: "Charter Holders",
      slug: "charter-holders",
      description: "Verified members who completed the program.",
      visibility: "public",
      join_policy: "open",
      member_count: 312,
      is_member: true,
      tags: ["Charter", "Alumni"],
      cover: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop",
      created_at: new Date(now - 600000).toISOString(),
    },
    {
      id: "g2",
      name: "EMEA Chapter",
      slug: "emea-chapter",
      description: "Regional hub for Europe, Middle East & Africa.",
      visibility: "public",
      join_policy: "open",
      member_count: 189,
      tags: ["Regional"],
      cover: "https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=1200&q=80&auto=format&fit=crop",
      created_at: new Date(now - 1600000).toISOString(),
    },
    {
      id: "g3",
      name: "Cohort 2024 Online",
      slug: "cohort-2024-online",
      description: "This year’s online cohort workspace.",
      visibility: "private",
      join_policy: "approval",
      member_count: 58,
      tags: ["Cohort", "2024"],
      cover: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop",
      created_at: new Date(now - 2600000).toISOString(),
    },
  ];
}

function demoMembers() {
  return [
    { id: "u1", name: "Anita Sharma", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop" },
    { id: "u2", name: "Kenji Watanabe", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&q=80&auto=format&fit=crop" },
    { id: "u3", name: "Aisha Khan", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop" },
  ];
}
