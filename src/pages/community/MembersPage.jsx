// src/pages/community/MembersPage.jsx
import * as React from "react";
import {
  Avatar, Box, Button, Chip, Grid, IconButton, InputAdornment, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";

function MemberRow({ m, onOpen, onMessage }) {
  return (
    <TableRow hover>
      <TableCell width={56}>
        <Avatar src={m.avatar} alt={m.name} />
      </TableCell>
      <TableCell>
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {m.title} {m.company ? `· ${m.company}` : ""}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {(m.tags || []).map((t) => <Chip key={t} size="small" label={t} />)}
        </Stack>
      </TableCell>
      <TableCell>{m.group || "-"}</TableCell>
      <TableCell align="right">
        <Tooltip title="Open profile">
          <IconButton size="small" onClick={() => onOpen?.(m)}>
            <OpenInNewOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Message">
          <IconButton size="small" onClick={() => onMessage?.(m)}>
            <MailOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export default function MembersPage({
  members: initialMembers,
  groups = ["All", "Charter Holders", "EMEA Chapter", "Cohort 2024 Online"],
  onOpenProfile = (m) => { },
  onMessage = (m) => { },
  user, stats, tags = [],
}) {
  const [q, setQ] = React.useState("");
  const [group, setGroup] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("az");
  const [members, setMembers] = React.useState(() => initialMembers ?? demoMembers());

  const filtered = React.useMemo(() => {
    let arr = [...members];
    const t = q.trim().toLowerCase();
    if (t) {
      arr = arr.filter(
        (m) =>
          m.name.toLowerCase().includes(t) ||
          m.title?.toLowerCase().includes(t) ||
          m.company?.toLowerCase().includes(t)
      );
    }
    if (group !== "All") {
      arr = arr.filter((m) => m.group === group);
    }
    if (sortBy === "az") arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "recent") arr.sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));
    return arr;
  }, [members, q, group, sortBy]);

  return (
    <Grid container spacing={2}>
      {/* Center: table */}
      <Grid item xs={12} md={9}>
        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              size="small" placeholder="Search members" fullWidth
              value={q} onChange={(e) => setQ(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <TextField
              select size="small" label="Group" value={group}
              onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 180 }}
            >
              {groups.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Sort" value={sortBy}
              onChange={(e) => setSortBy(e.target.value)} sx={{ minWidth: 160 }}
            >
              <MenuItem value="az">A–Z</MenuItem>
              <MenuItem value="recent">Recently joined</MenuItem>
            </TextField>
          </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Name</TableCell>
                <TableCell>Expertise</TableCell>
                <TableCell>Group</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  onOpen={onOpenProfile}
                  onMessage={onMessage}
                />
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No members match your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
function demoMembers() {
  const now = Date.now();
  return [
    {
      id: "u1",
      name: "Anita Sharma",
      title: "M&A Analyst",
      company: "IMAA",
      group: "EMEA Chapter",
      tags: ["Valuation", "PE"],
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
      joined_at: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      id: "u2",
      name: "Kenji Watanabe",
      title: "Associate",
      company: "Sakura Capital",
      group: "Charter Holders",
      tags: ["Diligence", "Carve-outs"],
      avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&q=80&auto=format&fit=crop",
      joined_at: new Date(now - 1000 * 60 * 60 * 24 * 11).toISOString(),
    },
    {
      id: "u3",
      name: "Aisha Khan",
      title: "Analyst",
      company: "HBR Ventures",
      group: "Cohort 2024 Online",
      tags: ["Integration", "PMO"],
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop",
      joined_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
  ];
}
