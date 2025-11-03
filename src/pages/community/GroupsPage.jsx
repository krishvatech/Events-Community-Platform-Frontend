// src/pages/community/GroupsPage.jsx
import * as React from "react";
import {
  Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, InputAdornment, MenuItem, Paper, Select, Stack,
  TextField, Typography, Card, CardContent, CardActions, CardHeader, Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";

function GroupRow({ g, onJoin }) {
  const isPrivate = (g.visibility || "").toLowerCase() === "private";
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#e2e8f0" }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        {/* Left: image + texts */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Avatar
            src={g.avatar || g.cover}
            sx={{ width: 56, height: 56, borderRadius: 2 }}
          >
            {g.name?.[0]}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
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

        {/* Right: Join / Request */}
        <Button
          size="small"
          variant="contained"
          onClick={() => onJoin?.(g)}
        >
          {isPrivate ? "Request to join" : "Join"}
        </Button>
      </Stack>
    </Paper>
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
  const [visibility, setVisibility] = React.useState("Public");
  const [sortBy, setSortBy] = React.useState("recent");
  const [open, setOpen] = React.useState(false);

  const [groups, setGroups] = React.useState(() => initialGroups ?? demoGroups());

  const filtered = React.useMemo(() => {
    let arr = [...groups];
    const t = q.trim().toLowerCase();
    if (t) arr = arr.filter((g) => g.name.toLowerCase().includes(t) || g.description?.toLowerCase().includes(t));
    if (visibility !== "All") {
      arr = arr.filter((g) => g.visibility === visibility.toLowerCase());
    }
    if (sortBy === "recent") {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "members") {
      arr.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));
    }
    return arr;
  }, [groups, q, visibility, sortBy]);

  const handleCreate = (payload, memberIds) => {
    setGroups((curr) => [payload, ...curr]);
    onCreateGroup?.(payload, memberIds);
  };

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
          </Paper>

          <Stack spacing={1.25}>
            {filtered.map((g) => (
              <GroupRow key={g.id} g={g} onJoin={onJoinGroup} />
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
