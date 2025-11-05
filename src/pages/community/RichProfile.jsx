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
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
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

/* --------------------------------------------------------------------------
 * Mock posts and helpers for the Posts tab. In a real app you would fetch
 * these from your backend. Posts include support for text, link, image and
 * poll types. The timeAgo helper returns a human‑friendly relative time.
 */
const MOCK_POSTS = [
  {
    id: 1,
    type: "text",
    content: "Hello from Rich Profile!",
    created_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
  },
  {
    id: 2,
    type: "link",
    content: "Check out our blog",
    link: "https://example.com",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: 3,
    type: "image",
    content: "Our new design",
    images: [
      "https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=600&q=60",
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: 4,
    type: "poll",
    content: "Which JavaScript framework do you prefer?",
    options: ["React", "Vue", "Angular", "Svelte"],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
];

function timeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Post card component used in the Posts tab. Shows the post content and a
// bottom row with mutual connections and a friend button (if not friends).
function RichPostCard({ post, fullName, mutualCount, friendStatus, friendSubmitting, handleAddFriend }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        avatar={
          <Avatar sx={{ width: 40, height: 40 }}>
            {(fullName || "?").slice(0, 1).toUpperCase()}
          </Avatar>
        }
        title={<Typography fontWeight={600}>{fullName || "User"}</Typography>}
        subheader={timeAgo(post.created_at)}
      />
      <CardContent sx={{ pt: 0 }}>
        {post.content && (
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>
        )}
        {post.type === "link" && post.link && (
          <Button
            size="small"
            href={post.link}
            target="_blank"
            rel="noreferrer"
            sx={{ mt: 1 }}
          >
            {post.link}
          </Button>
        )}
        {post.type === "image" && Array.isArray(post.images) && post.images.length > 0 && (
          <Stack spacing={1} direction="row" sx={{ mt: 1 }} flexWrap="wrap">
            {post.images.map((src, idx) => (
              <Box key={idx} sx={{ width: "100%", maxWidth: 200, borderRadius: 1, overflow: "hidden" }}>
                <img
                  src={src}
                  alt={`post-img-${idx}`}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Box>
            ))}
          </Stack>
        )}
        {post.type === "poll" && Array.isArray(post.options) && post.options.length > 0 && (
          <List dense sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            {post.options.map((opt, idx) => (
              <ListItem key={idx} disableGutters sx={{ px: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 28, height: 28 }}>{idx + 1}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={opt} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pb: 2,
        }}
      >
        {mutualCount > 0 && (
          <Chip label={`${mutualCount} mutual`} size="small" />
        )}
        {friendStatus !== "self" && (
          friendStatus === "none" ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonAddAlt1RoundedIcon />}
              disabled={friendSubmitting}
              onClick={handleAddFriend}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {friendSubmitting ? "Sending…" : "Add Friend"}
            </Button>
          ) : friendStatus === "pending_outgoing" ? (
            <Button variant="outlined" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
              Request sent
            </Button>
          ) : friendStatus === "pending_incoming" ? (
            <Button variant="outlined" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
              Pending your approval
            </Button>
          ) : friendStatus === "friends" ? (
            <Button variant="contained" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
              Your Friend
            </Button>
          ) : null
        )}
      </Box>
    </Card>
  );
}

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
  // Per-row friendship status inside Connections dialog
  const [connFriendStatus, setConnFriendStatus] = useState({}); // { [userId]: "friends" | "pending_outgoing" | "pending_incoming" | "none" }
  const [connSubmitting, setConnSubmitting] = useState({});     // { [userId]: boolean }

  async function fetchFriendStatus(targetId) {
    try {
      const r = await fetch(`${API_BASE}/friends/status/?user_id=${targetId}`, {
        headers: { ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      // backend may return incoming_pending/outgoing_pending — normalize:
      const map = { incoming_pending: "pending_incoming", outgoing_pending: "pending_outgoing" };
      return (map[d?.status] || d?.status || "none").toLowerCase();
    } catch {
      return "none";
    }
  }

  async function sendFriendRequestTo(targetId) {
    try {
      setConnSubmitting((m) => ({ ...m, [targetId]: true }));
      const r = await fetch(`${API_BASE}/friend-requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(targetId) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 200) throw new Error(d?.detail || "Failed to send request");
      setConnFriendStatus((m) => ({ ...m, [targetId]: (d?.status || "pending_outgoing").toLowerCase() }));
    } catch (e) {
      alert(e?.message || "Failed to send friend request");
    } finally {
      setConnSubmitting((m) => ({ ...m, [targetId]: false }));
    }
  }

  const [mutual, setMutual] = useState([]);
  const [mutualCount, setMutualCount] = useState(0);
  const [connTab, setConnTab] = useState("all"); // "all" | "mutual"

  // --- POSTS & TAB STATE ---
  // In this rich profile we show two tabs: Posts and About. Posts are mocked
  // locally. When integrating with a backend, replace MOCK_POSTS with
  // fetched posts for this user. The tab state controls which tab is active.
  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState(MOCK_POSTS);

  // Preload mutual connections count for displaying on posts. This effect
  // fetches the mutual friends list once when the component mounts (or when
  // the viewed userId changes) and stores the count in state. Without this
  // call, mutualCount will remain zero unless the user opens the connections
  // dialog.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mutualList = await fetchMutualList(userId);
        if (!alive) return;
        setMutual(mutualList);
        setMutualCount((mutualList || []).length);
      } catch {
        // ignore errors; leave mutual count unchanged
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

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

  // Preload friendship status for everyone we might show
  const ids = Array.from(new Set([...list, ...mutualList].map((x) => String(x?.id)).filter(Boolean)));
  const missing = ids.filter((id) => connFriendStatus[id] === undefined && String(id) !== String(me?.id || ""));
  if (missing.length) {
    const entries = await Promise.all(
      missing.map(async (id) => [id, await fetchFriendStatus(id)])
    );
    setConnFriendStatus((m) => ({ ...m, ...Object.fromEntries(entries) }));
  }
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

                {/*
                  Replace the legacy about/role/experience/education sections with a
                  card containing two tabs: Posts and About. Posts show a
                  feed of the user’s posts, including mutual connection
                  count and a friend button. About mirrors the prior sections
                  (About, Current role, Experience, Education) for viewing.
                */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <Tabs
                    value={tab}
                    onChange={(e, v) => setTab(v)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                  >
                    <Tab label="Posts" />
                    <Tab label="About" />
                  </Tabs>
                  <Divider />
                  {tab === 0 && (
                    <CardContent>
                      <Stack spacing={2}>
                        {posts.map((post) => (
                          <RichPostCard
                            key={post.id}
                            post={post}
                            fullName={fullName}
                            mutualCount={mutualCount}
                            friendStatus={friendStatus}
                            friendSubmitting={friendSubmitting}
                            handleAddFriend={sendFriendRequest}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  )}
                  {tab === 1 && (
                    <CardContent>
                      <Stack spacing={2.5}>
                        {/* About section */}
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

                        {/* Current role section */}
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

                        {/* Experience section */}
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

                        {/* Education section */}
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
                    </CardContent>
                  )}
                </Card>
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

                              {String(f.id) === String(me?.id || "") ? (
                                // self row → show a neutral chip instead of hiding the action area
                                <Chip label="You" size="small" />
                              ) : (() => {
                                const status = (connFriendStatus[String(f.id)] || "none").toLowerCase();
                                if (status === "friends") {
                                  return (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{ textTransform: "none", borderRadius: 2 }}
                                      onClick={() => startChat(f.id)}
                                    >
                                      Message
                                    </Button>
                                  );
                                }
                                if (status === "pending_outgoing") {
                                  return (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled
                                      sx={{ textTransform: "none", borderRadius: 2 }}
                                    >
                                      Request pending
                                    </Button>
                                  );
                                }
                                // not friends → Add friend
                                return (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PersonAddAlt1RoundedIcon />}
                                    sx={{ textTransform: "none", borderRadius: 2 }}
                                    disabled={!!connSubmitting[f.id]}
                                    onClick={() => sendFriendRequestTo(f.id)}
                                  >
                                    {connSubmitting[f.id] ? "Sending…" : "Add friend"}
                                  </Button>
                                );
                              })()}
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
