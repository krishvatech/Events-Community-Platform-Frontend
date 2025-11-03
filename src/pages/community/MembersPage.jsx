// src/pages/community/MembersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Badge,
  Box,
  Grid,
  InputAdornment,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Button,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";

// ---- API base + auth header (copied from MessagesDirectory) ----
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

function MemberRow({ u, unread, onOpenProfile, onMessage }) {
  const name =
    u?.profile?.full_name ||
    `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
    u?.email;
  const company = u?.company_from_experience ?? "—";
  const title = u?.position_from_experience ?? "—";

  return (
    <TableRow hover>
      <TableCell width={56}>
        <Badge
          overlap="circular"
          variant="dot"
          color="error"
          invisible={!unread}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Avatar
            sx={{ width: 36, height: 36, cursor: "pointer" }}
            onClick={() => onOpenProfile?.(u)}
          >
            {(name || "?").slice(0, 1).toUpperCase()}
          </Avatar>
        </Badge>
      </TableCell>

      <TableCell>
        <Stack onClick={() => onOpenProfile?.(u)} sx={{ cursor: "pointer" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {u?.email}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{company}</Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{title}</Typography>
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
        <Tooltip title="Open profile">
          <IconButton size="small" onClick={() => onOpenProfile?.(u)}>
            <OpenInNewOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Message">
          <Button
            size="small"
            variant="contained"
            sx={{ textTransform: "none", borderRadius: 2, ml: 1 }}
            startIcon={<MailOutlineOutlinedIcon />}
            onClick={onMessage}
          >
            Message
          </Button>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export default function MembersPage({ user, stats, tags = [] }) {
  const navigate = useNavigate();

  // ---- state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 5;

  // unread-by-user map (like MessagesDirectory)
  const [unreadByUser, setUnreadByUser] = useState({});
  const pollRef = useRef(null);

  // me
  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // ---- load users (try /users/roster/ else fallback /users/?limit=500)
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");

        async function fetchUsers(url) {
          const res = await fetch(url, {
            headers: tokenHeader(),
            signal: ctrl.signal,
            credentials: "include",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
          return Array.isArray(json) ? json : json?.results ?? [];
        }

        let list = [];
        try {
          list = await fetchUsers(`${API_BASE}/users/roster/`);
        } catch {
          list = await fetchUsers(`${API_BASE}/users/?limit=500`);
        }

        if (!alive) return;
        setUsers(list.filter((u) => u.id !== me?.id));
      } catch (e) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Failed to load users");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [me?.id]);

  // ---- poll conversations to compute unread badge per user (same logic as MessagesDirectory)
  useEffect(() => {
    function pickOther(conv) {
      if (conv?.other_user) return conv.other_user;
      if (Array.isArray(conv?.users_detail))
        return conv.users_detail.find((u) => u?.id !== me?.id);
      const otherId = Array.isArray(conv?.users)
        ? conv.users.find((id) => id !== me?.id)
        : conv?.other_user_id;
      return otherId ? { id: otherId } : undefined;
    }
    function lastMeta(conv) {
      const lm = conv?.last_message || {};
      return {
        ts: lm.created_at || conv?.updated_at || conv?.created_at,
        sender: lm.sender || lm.sender_id || conv?.last_sender_id,
      };
    }
    async function fetchConversations() {
      try {
        const res = await fetch(
          `${API_BASE}/messaging/conversations/?limit=200`,
          { headers: tokenHeader(), credentials: "include" }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const list = Array.isArray(json) ? json : json?.results ?? [];
        const map = {};
        for (const c of list) {
          const other = pickOther(c);
          const otherId = other?.id;
          if (!otherId) continue;
          const { ts, sender } = lastMeta(c);
          const seen = localStorage.getItem(`conv_read_${c.id}`) || "";
          const isUnread =
            ts &&
            sender &&
            sender !== me?.id &&
            (!seen || new Date(ts) > new Date(seen));
          if (isUnread) map[otherId] = true;
        }
        setUnreadByUser(map);
      } catch {}
    }
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [me?.id]);

  // ---- filtering (text only)
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    return users.filter((u) => {
      const fn = (u.first_name || "").toLowerCase();
      const ln = (u.last_name || "").toLowerCase();
      const em = (u.email || "").toLowerCase();
      const full = (u.profile?.full_name || "").toLowerCase();
      const company = (u.company_from_experience || "").toLowerCase();
      const title = (u.position_from_experience || "").toLowerCase();
      return (
        !s ||
        fn.includes(s) ||
        ln.includes(s) ||
        em.includes(s) ||
        full.includes(s) ||
        company.includes(s) ||
        title.includes(s)
      );
    });
  }, [users, q]);

  // ---- pagination
  useEffect(() => setPage(1), [q]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const startIdx = (page - 1) * ROWS_PER_PAGE;
  const current = filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);

  // ---- actions
  async function startChat(recipientId) {
    try {
      const r = await fetch(`${API_BASE}/messaging/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ recipient_id: recipientId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || "Failed to start conversation");
      const id = data?.id || data?.conversation?.id || data?.pk;
      if (id) localStorage.setItem(`conv_read_${id}`, new Date().toISOString());
      navigate(`/account/messages/${id}`);
    } catch (e) {
      alert(e?.message || "Failed to start conversation");
    }
  }

  const handleOpenProfile = (m) => {
    const id = m?.id ?? m?.user_id ?? m?.pk;
    if (!id) return;
    navigate(`/community/rich-profile/${id}`, { state: { user: m } });
  };

  // ---- UI
  return (
    <Grid container spacing={2}>
      {/* Center column */}
      <Grid item xs={12} md={9}>
        <Paper
          sx={{ p: 1.5, mb: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              size="small"
              placeholder="Search by name, email, company, or title…"
              fullWidth
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
          </Stack>
        </Paper>

        {loading && <LinearProgress />}

        {!loading && error && (
          <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
            <Typography color="error">⚠️ {error}</Typography>
          </Paper>
        )}

        {!loading && !error && (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing{" "}
                {filtered.length === 0
                  ? "0"
                  : `${startIdx + 1}–${Math.min(
                      startIdx + ROWS_PER_PAGE,
                      filtered.length
                    )}`}{" "}
                of {filtered.length} members
              </Typography>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, v) => setPage(v)}
                size="small"
                shape="rounded"
                siblingCount={0}
              />
            </Stack>

            <TableContainer
              component={Paper}
              sx={{ border: `1px solid ${BORDER}`, borderRadius: 3 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Member</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Job Title</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {current.map((u) => (
                    <MemberRow
                      key={u.id}
                      u={u}
                      unread={!!unreadByUser[u.id]}
                      onOpenProfile={() => handleOpenProfile(u)}
                      onMessage={() => startChat(u.id)}
                    />
                  ))}

                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography>No users match your search.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, v) => setPage(v)}
                size="small"
                shape="rounded"
                siblingCount={0}
              />
            </Stack>
          </>
        )}
      </Grid>

      {/* Right sticky profile (unchanged) */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box sx={{ position: "sticky", top: 88, alignSelf: "flex-start" }}>
          <CommunityProfileCard user={user} stats={stats} tags={tags} />
        </Box>
      </Grid>
    </Grid>
  );
}
