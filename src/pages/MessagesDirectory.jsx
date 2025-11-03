// src/pages/MessagesDirectory.jsx
// Member Directory: table view + search, 5/page pagination.
// Company & Job Title come from Experience model (community_name, position).
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar, Badge, Box, Button, Container, LinearProgress, Paper,
  Pagination, Stack, TextField, Typography, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, Tooltip
} from "@mui/material";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import AccountHero from "../components/AccountHero.jsx";
import AccountSidebar from "../components/AccountSidebar.jsx";
import { useNavigate } from "react-router-dom";

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

// kept: experience helper (no skills helpers anymore)
function pickCurrentOrLatestExperience(exps = []) {
  if (!Array.isArray(exps) || !exps.length) return null;
  const current = exps.find((e) => e?.currently_work_here);
  if (current) return current;
  return [...exps].sort((a, b) => {
    const aEnd = a?.end_date || "2100-01-01";
    const bEnd = b?.end_date || "2100-01-01";
    return new Date(bEnd) - new Date(aEnd);
  })[0];
}

export default function MessagesDirectory() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  // pagination only (skills state removed)
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 5;

  // unread dot
  const [unreadByUser, setUnreadByUser] = useState({});
  const pollRef = useRef(null);

  const navigate = useNavigate();
  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  // load users (roster -> fallback)
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");
        async function fetchUsers(url) {
          const res = await fetch(url, { headers: tokenHeader(), signal: ctrl.signal, credentials: "include" });
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
        if (e?.name !== "AbortError") setError(e?.message || "Failed to load users");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; ctrl.abort(); };
  }, [API_BASE, me?.id]);

  // unread polling (unchanged)
  useEffect(() => {
    function pickOther(conv) {
      if (conv?.other_user) return conv.other_user;
      if (Array.isArray(conv?.users_detail)) return conv.users_detail.find((u) => u?.id !== me?.id);
      const otherId = Array.isArray(conv?.users) ? conv.users.find((id) => id !== me?.id) : conv?.other_user_id;
      return otherId ? { id: otherId } : undefined;
    }
    function lastMeta(conv) {
      const lm = conv?.last_message || {};
      return { ts: lm.created_at || conv?.updated_at || conv?.created_at, sender: lm.sender || lm.sender_id || conv?.last_sender_id };
    }
    async function fetchConversations() {
      try {
        const res = await fetch(`${API_BASE}/messaging/conversations/?limit=200`, { headers: tokenHeader(), credentials: "include" });
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
          const isUnread = ts && sender && sender !== me?.id && (!seen || new Date(ts) > new Date(seen));
          if (isUnread) map[otherId] = true;
        }
        setUnreadByUser(map);
      } catch { }
    }
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [API_BASE, me?.id]);

  // filtering: text only (skills removed)
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    return users.filter((u) => {
      const fn = (u.first_name || "").toLowerCase();
      const ln = (u.last_name || "").toLowerCase();
      const em = (u.email || "").toLowerCase();
      const full = (u.profile?.full_name || "").toLowerCase();
      const company = (u.profile?.company || "").toLowerCase();
      const headline = (u.profile?.headline || "").toLowerCase();
      return (
        !s ||
        fn.includes(s) ||
        ln.includes(s) ||
        em.includes(s) ||
        full.includes(s) ||
        company.includes(s) ||
        headline.includes(s)
      );
    });
  }, [users, q]);

  // pagination (reset only on q)
  useEffect(() => setPage(1), [q]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const startIdx = (page - 1) * ROWS_PER_PAGE;
  const current = filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <AccountHero />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-6">
          <aside className="hidden md:block">
            <AccountSidebar stickyTop={96} />
          </aside>

          <main>
            <Typography variant="h5" className="font-semibold tracking-tight mb-2">
              Members
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-3">
              Search by name/company and start a chat.
            </Typography>

            {/* controls: only search (skills filter removed) */}
            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-3 sm:p-4 mb-3">
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box className="flex items-center gap-2 flex-1">
                  <SearchIcon fontSize="small" />
                  <TextField
                    placeholder="Search by name, email, or company…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                  />
                </Box>
              </Stack>
            </Paper>

            {loading && <LinearProgress />}
            {!loading && error && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
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
                    Showing {filtered.length === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + ROWS_PER_PAGE, filtered.length)}`} of {filtered.length} members
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

                <Paper elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <TableContainer>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell width="40%">Member</TableCell>
                          <TableCell width="30%">Company</TableCell>
                          <TableCell width="20%">Job Title</TableCell>
                          <TableCell align="right" width="10%">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {current.map((u) => {
                          const name =
                            u?.profile?.full_name ||
                            `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
                            u?.email;
                          const subtitle = u?.email;

                          // values injected by backend (from Experience)
                          const company = u?.company_from_experience ?? "—";
                          const title = u?.position_from_experience ?? "—";

                          return (
                            <TableRow key={u?.id} hover>
                              <TableCell>
                                <Box
                                  className="flex items-center gap-2 min-w-0"
                                  onClick={() => navigate(`/account/members/${u.id}`, { state: { user: u } })}
                                  onKeyDown={(e) => e.key === "Enter" && navigate(`/account/members/${u.id}`, { state: { user: u } })}
                                  role="button"
                                  tabIndex={0}
                                  sx={{ cursor: "pointer" }}        
                                >
                                  <Badge
                                    overlap="circular"
                                    variant="dot"
                                    color="error"
                                    invisible={!unreadByUser[u?.id]}
                                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                  >
                                    <Avatar sx={{ width: 36, height: 36 }}>
                                      {(name || "?").slice(0, 1).toUpperCase()}
                                    </Avatar>
                                  </Badge>
                                  <Box className="min-w-0">
                                    <Typography className="font-medium leading-tight truncate">{name}</Typography>
                                    <Typography variant="body2" color="text.secondary" className="truncate">
                                      {subtitle}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell><Typography variant="body2">{company}</Typography></TableCell>
                              <TableCell><Typography variant="body2">{title}</Typography></TableCell>
                              <TableCell align="right">
                                <Tooltip title="Start chat">
                                  <Button
                                    onClick={() => startChat(u.id)}
                                    variant="contained"
                                    size="small"
                                    startIcon={<MailOutlineOutlinedIcon />}
                                    sx={{ textTransform: "none", borderRadius: 2 }}
                                  >
                                    Message
                                  </Button>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                              <Typography>No users match your search.</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

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
          </main>
        </div>
      </Container>
    </div>
  );
}