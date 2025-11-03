// src/pages/RichProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  ListItemAvatar,
  Divider,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CommunitySidebar from "../../components/CommunitySideBar.jsx";

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

// UI helpers
const Section = ({ title, children, action }) => (
  <Card variant="outlined" sx={{ borderRadius: 2 }}>
    <CardHeader
      title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>}
      action={action}
      sx={{ pb: 0.5 }}
    />
    <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
  </Card>
);

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const toMonthYear = (d) => {
  if (!d) return "";
  const [y, m] = String(d).split("-");
  const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
  return mi != null && y ? `${MONTHS[mi]} ${y}` : String(d);
};
const rangeText = (s, e, cur) => {
  const start = toMonthYear(s);
  const end = cur ? "present" : toMonthYear(e);
  return (start || end) ? `${start} - ${end || ""}` : "";
};

function pickBestExperience(exps = []) {
  if (!Array.isArray(exps) || !exps.length) return null;
  const current = exps.find((e) => e?.currently_work_here);
  if (current) return current;
  return [...exps].sort((a, b) => {
    const aEnd = a?.end_date || "2100-01-01";
    const bEnd = b?.end_date || "2100-01-01";
    return new Date(bEnd) - new Date(aEnd);
  })[0];
}

export default function RichProfile() {
  // IMPORTANT: use :userId from /community/rich-profile/:userId
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // roster user (passed from directory) if available
  const [userItem, setUserItem] = useState(location.state?.user || null);
  const [loadingBase, setLoadingBase] = useState(!location.state?.user);
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const isMe = String(me?.id || "") === String(userId || "");

  // --- FRIEND BUTTON / STATUS ---
  const [friendStatus, setFriendStatus] = useState(isMe ? "self" : "none"); // self | none | pending_outgoing | pending_incoming | friends
  const [friendLoading, setFriendLoading] = useState(!isMe);
  const [friendSubmitting, setFriendSubmitting] = useState(false);

  const [mutual, setMutual] = useState([]);
  const [mutualCount, setMutualCount] = useState(0);
  const [connTab, setConnTab] = useState("all"); // "all" | "mutual"

  useEffect(() => {
    let alive = true;
    if (isMe) {
      setFriendStatus("self");
      setFriendLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/friends/status/?user_id=${userId}`, {
          headers: { ...tokenHeader(), Accept: "application/json" },
          credentials: "include",
        });
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        const map = {
         incoming_pending: "pending_incoming",
         outgoing_pending: "pending_outgoing",
       };
       setFriendStatus(map[d?.status] || d?.status || "none");
      } catch {
        if (!alive) return;
        setFriendStatus("none");
      } finally {
        if (alive) setFriendLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, isMe]);

  const sendFriendRequest = async () => {
    try {
      setFriendSubmitting(true);
      const r = await fetch(`${API_BASE}/friend-requests/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeader(),
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(userId) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 200)
        throw new Error(d?.detail || "Failed to send request");
      setFriendStatus(d?.status || "pending_outgoing");
    } catch (e) {
      alert(e?.message || "Failed to send friend request");
    } finally {
      setFriendSubmitting(false);
    }
  };

  // if navigated directly, obtain roster item so we have basic info to render
  useEffect(() => {
    let alive = true;
    (async () => {
      if (userItem) {
        setLoadingBase(false);
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/users/roster/`, {
          headers: tokenHeader(),
          credentials: "include",
        });
        const data = await r.json().catch(() => []);
        const list = Array.isArray(data) ? data : data?.results || [];
        const found = list.find((x) => String(x.id) === String(userId));
        if (alive) setUserItem(found || null);
      } catch {}
      finally {
        if (alive) setLoadingBase(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, userItem]);

  // load experiences + educations (public-first)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingExtras(true);

      const tryJSON = async (url) => {
        try {
          const r = await fetch(url, { headers: tokenHeader(), credentials: "include" });
          if (!r.ok) return null;
          return await r.json().catch(() => null);
        } catch { return null; }
      };

      // 1) Public-for-all endpoint (new backend action)
      let j = await tryJSON(`${API_BASE}/users/${userId}/profile/`);

      // 2) Fallback to "me" endpoints only if we’re looking at ourselves
      if (!j && isMe) {
        j = await tryJSON(`${API_BASE}/auth/me/profile/`);
        if (!j) {
          const [e1, e2] = await Promise.all([
            tryJSON(`${API_BASE}/auth/me/experiences/`),
            tryJSON(`${API_BASE}/auth/me/educations/`),
          ]);
          j = {
            experiences: Array.isArray(e1) ? e1 : [],
            educations: Array.isArray(e2) ? e2 : [],
          };
        }
      }

      const exps = Array.isArray(j?.experiences) ? j.experiences : [];
      const edus = Array.isArray(j?.educations) ? j.educations : [];

      if (!alive) return;
      setExperiences(exps);
      setEducations(edus);
      setLoadingExtras(false);
    })();
    return () => { alive = false; };
  }, [userId, isMe]);

  const fullName = useMemo(() => {
    const u = userItem || {};
    return (
      u?.profile?.full_name ||
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
      u?.email ||
      "Member"
    );
  }, [userItem]);

  const currentExp = useMemo(() => pickBestExperience(experiences), [experiences]);

  const companyFromRoster =
    userItem?.company_from_experience || userItem?.profile?.company || "";
  const titleFromRoster =
    userItem?.position_from_experience ||
    userItem?.profile?.job_title ||
    userItem?.profile?.role ||
    "";

  /* =========================
     Connections popup (friends list)
     ========================= */
  const [connOpen, setConnOpen] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [connQ, setConnQ] = useState("");

  const displayName = (u) =>
   u?.username ||
   u?.profile?.full_name ||
   `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
   u?.email ||
   `User ${u?.id || ""}`.trim();

  async function startChat(recipientId) {
    try {
      const r = await fetch(`${API_BASE}/messaging/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        credentials: "include",
        body: JSON.stringify({ recipient_id: Number(recipientId) }),
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

  function normalizeFriendShape(x) {
  const u = x?.user || x?.friend || x?.friend_user || x?.other_user || x?.target || x;
  return {
    id: u?.id ?? x?.id,
    username: u?.username ?? x?.username ?? "",
    email: u?.email ?? x?.email ?? "",
    first_name: u?.first_name ?? x?.first_name ?? "",
    last_name: u?.last_name ?? x?.last_name ?? "",
    profile: u?.profile ?? x?.profile ?? null,
  };
}

  // Try a few likely endpoints; adjust to your backend path if needed.
  async function fetchFriendList(targetUserId) {
    const url = `${API_BASE}/friends/of/?user_id=${targetUserId}`;
    try {
        const r = await fetch(url, { headers: tokenHeader(), credentials: "include" });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j) return [];
        const arr = Array.isArray(j) ? j : j.results || j.friends || [];
        return Array.isArray(arr) ? arr.map(normalizeFriendShape) : [];
    } catch {
        return [];
    }
    }

    async function fetchMutualList(targetUserId) {
        if (!targetUserId || String(targetUserId) === String(me?.id || "")) return [];
        try {
            const r = await fetch(`${API_BASE}/friends/mutual/?user_id=${targetUserId}`, {
            headers: tokenHeader(),
            credentials: "include",
            });
            const j = await r.json().catch(() => []);
            const arr = Array.isArray(j) ? j : j.results || j.friends || [];
            return Array.isArray(arr) ? arr.map(normalizeFriendShape) : [];
        } catch {
            return [];
        }
        }
  const openConnections = async () => {
    setConnOpen(true);
    setConnLoading(true);
    const [list, mutualList] = await Promise.all([
    fetchFriendList(userId),
    fetchMutualList(userId),
    ]);
    setConnections(list);
    setMutual(mutualList);
    setMutualCount(mutualList.length);
    setConnLoading(false);
  };

  const filterList = (arr) => {
  const s = (connQ || "").toLowerCase().trim();
  if (!s) return arr;
  return arr.filter((u) => {
    const name = (displayName(u) || "").toLowerCase();
    const email = (u?.email || "").toLowerCase();
    return name.includes(s) || email.includes(s);
  });
};

const filteredConnections = useMemo(
  () => filterList(connections),
  [connections, connQ]
);
const filteredMutual = useMemo(
  () => filterList(mutual),
  [mutual, connQ]
);

  /* ========================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-6">
          <aside>
            {/* Community sidebar */}
            <CommunitySidebar stickyTop={96} />
          </aside>

          <main>
            {loadingBase && <LinearProgress />}

            {!loadingBase && (
              <Stack spacing={2.5}>
                {/* Header Card */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box className="flex items-center gap-3">
                    <Avatar sx={{ width: 56, height: 56 }}>
                      {(fullName || "?").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700 }}
                        className="truncate"
                      >
                        {fullName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        className="truncate"
                      >
                        {(currentExp?.position || titleFromRoster || "—")} ·{" "}
                        {(currentExp?.community_name || companyFromRoster || "—")}
                      </Typography>
                    </Box>

                    {/* Right-side actions */}
                    {!isMe && (
                      <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end", ml: "auto", gap: 1 }}>
                        {friendLoading && (
                         <Button variant="outlined" size="small" disabled>Loading…</Button>
                       )}
                       {!friendLoading && friendStatus === "friends" && (
                        <>
                            <Button
                            variant="outlined"
                            size="small"
                            disabled
                            sx={{ textTransform: "none", borderRadius: 2 }}
                            >
                            Your Friend
                            </Button>
                            {!!mutualCount && (
                                <Chip
                                label={`${mutualCount} mutual`}
                                size="small"
                                sx={{ alignSelf: "center" }}
                                />
                            )}
                            <Button
                            variant="contained"
                            size="small"
                            onClick={openConnections}
                            sx={{ textTransform: "none", borderRadius: 2 }}
                            >
                            Connections
                            </Button>
                        </>
                        )}
                       {!friendLoading && friendStatus === "pending_outgoing" && (
                         <Button variant="outlined" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
                           Request sent
                         </Button>
                       )}
                       {!friendLoading && friendStatus === "pending_incoming" && (
                         <Button variant="outlined" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
                           Pending your approval
                         </Button>
                       )}
                       {!friendLoading && friendStatus === "none" && (
                         <Button
                           variant="contained"
                           size="small"
                           onClick={sendFriendRequest}
                           disabled={friendSubmitting}
                           sx={{ textTransform: "none", borderRadius: 2 }}
                         >
                           {friendSubmitting ? "Sending…" : "Add Friend"}
                         </Button>
                       )}
                      </Box>
                    )}
                  </Box>
                </Paper>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <Section title="About">
                    <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                        Email:
                      </Typography>
                      <Typography variant="body2">{userItem?.email || "—"}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                        Company:
                      </Typography>
                      <Typography variant="body2">
                        {currentExp?.community_name || companyFromRoster || "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                        Job Title:
                      </Typography>
                      <Typography variant="body2">
                        {currentExp?.position || titleFromRoster || "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                        Location:
                      </Typography>
                      <Typography variant="body2">
                        {userItem?.profile?.location || "—"}
                      </Typography>
                    </Box>
                  </Section>

                  <Section title="Current role">
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {currentExp?.position || titleFromRoster || "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentExp?.community_name || companyFromRoster || "—"}
                    </Typography>
                    {(currentExp?.start_date ||
                      currentExp?.end_date ||
                      currentExp?.currently_work_here) && (
                      <Typography variant="caption" color="text.secondary">
                        {rangeText(
                          currentExp?.start_date,
                          currentExp?.end_date,
                          currentExp?.currently_work_here
                        )}
                      </Typography>
                    )}
                  </Section>
                </div>

                <Section title="Experience">
                  {loadingExtras ? (
                    <LinearProgress />
                  ) : experiences.length ? (
                    <List dense disablePadding>
                      {experiences.map((x) => (
                        <ListItem key={x.id} disableGutters sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {x.position || "—"} — {x.community_name || "—"}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {rangeText(
                                  x.start_date,
                                  x.end_date,
                                  x.currently_work_here
                                )}
                                {x.location ? ` · ${x.location}` : ""}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {isMe
                        ? "You haven’t added any experience yet."
                        : "This member hasn’t shared experience publicly yet."}
                    </Typography>
                  )}
                </Section>

                <Section title="Education">
                  {loadingExtras ? (
                    <LinearProgress />
                  ) : educations.length ? (
                    <List dense disablePadding>
                      {educations.map((e) => (
                        <ListItem key={e.id} disableGutters sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {e.degree || "—"} — {e.school || "—"}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {rangeText(e.start_date, e.end_date, false)}
                                {e.field_of_study ? ` · ${e.field_of_study}` : ""}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {isMe
                        ? "You haven’t added any education yet."
                        : "This member hasn’t shared education publicly yet."}
                    </Typography>
                  )}
                </Section>
              </Stack>
            )}
          </main>
        </div>
      </Container>

      {/* Connections Dialog */}
      <Dialog open={connOpen} onClose={() => setConnOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Connections
        </DialogTitle>
        <DialogContent dividers>
          <Tabs
            value={connTab}
            onChange={(e, v) => setConnTab(v)}
            sx={{ mb: 1 }}
            >
            <Tab value="all" label={`All (${connections.length})`} />
            <Tab value="mutual" label={`Mutual (${mutual.length})`} />
            </Tabs>
          <TextField
            fullWidth
            size="small"
            placeholder="Search connections…"
            value={connQ}
            onChange={(e) => setConnQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1.5 }}
          />
          {connLoading ? (
            <LinearProgress />
          ) : (
            <>
              { (connTab === "mutual" ? filteredMutual : filteredConnections).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No connections found.
                </Typography>
              ) : (
                <List dense sx={{ py: 0 }}>
                  {(connTab === "mutual" ? filteredMutual : filteredConnections).map((f, idx) => {
                    const name = displayName(f);
                    return (
                      <React.Fragment key={f.id || idx}>
                        <ListItem
                          disableGutters
                          secondaryAction={
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                title="Open profile"
                                onClick={() => {
                                  setConnOpen(false);
                                  navigate(`/community/rich-profile/${f.id}`);
                                }}
                              >
                                <OpenInNewOutlinedIcon fontSize="small" />
                              </IconButton>
                              <Button
                                size="small"
                                variant="contained"
                                sx={{ textTransform: "none", borderRadius: 2 }}
                                onClick={() => startChat(f.id)}
                              >
                                Message
                              </Button>
                            </Stack>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ width: 36, height: 36 }}>
                              {(name || "?").slice(0, 1).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>}
                            secondary={<Typography variant="caption" color="text.secondary">{f?.email || ""}</Typography>}
                          />
                        </ListItem>
                        {idx < filteredConnections.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
