// src/components/CommunityProfileCard.jsx
import * as React from "react";
import axios from "axios";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { clearAuth } from "../utils/authStorage";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

const BORDER = "#e2e8f0";
const SLATE_700 = "#334155";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "";
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

const apiBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const getCookie = (name) =>
  document.cookie
    .split("; ")
    .find((x) => x.startsWith(name + "="))
    ?.split("=")[1];


// ---- helpers for data wiring (single-file) ----
// Support BOTH env names used across your app.
const RAW_BASE = (
  import.meta?.env?.VITE_API_BASE_URL ??
  window.API_BASE_URL ??
  "http://127.0.0.1:8000/api"   // <-- safe local fallback
).trim();

function resolveMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  // strip trailing "/api" if present so we get the origin
  const origin = RAW_BASE.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Build Group Detail route (pick the one that matches your app)
const buildGroupDetailUrl = (g) => {
  const id = g?.id || g?.pk;
  // If your route is /community/groups/:id (common since your page is in pages/community):
  return `/community/groups/${id}`;
  // If your route is /groups/:id, use this instead:
  // return `/groups/${id}`;
  // If you use slugs:
  // const slug = g?.slug || g?.code;
  // return `/community/groups/${slug || id}`;
};

const buildRichProfileUrl = (u) => `/community/rich-profile/${u?.id ?? u}`;

function joinApi(url) {
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  if (!RAW_BASE) return url; // rely on dev proxy if no base given

  const base = RAW_BASE.replace(/\/$/, "");
  const startsWithApi = url.startsWith("/api");
  const baseEndsWithApi = /\/api$/i.test(base);

  if (baseEndsWithApi && startsWithApi) {
    return `${base}${url.slice(4)}`;
  }
  return `${base}${url}`;
}

function authHeaders() {
  const candidates = ["access", "access_token", "accessToken", "jwt", "JWT", "token"];
  const token = candidates.map((k) => localStorage.getItem(k)).find(Boolean);
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function getJson(url) {
  const full = joinApi(url);
  const res = await fetch(full, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} @ ${full}`);
  return res.json();
}

// Try multiple endpoints, return first success
async function getJsonOneOf(urls) {
  let lastErr;
  for (const u of urls) {
    try {
      return await getJson(u);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All candidate URLs failed");
}

function buildName(u = {}) {
  if (!u || typeof u !== "object") return "";
  const full =
    u.profile?.full_name ||
    u.display_name ||
    `${u.first_name || ""} ${u.last_name || ""}`.trim();
  if (full) return full;
  return u.username || u.email || "User";
}

function pickAvatar(u) {
  if (!u || typeof u !== "object") return "";
  // Check the common fields across your APIs
  const raw =
    // flat fields
    u.user_image_url || u.user_image || u.photo_url ||
    u.avatar || u.avatar_url ||
    // nested profile fields
    u.profile?.user_image_url || u.profile?.user_image ||
    u.profile?.avatar || u.profile?.image_url || u.profile?.photo ||
    "";
  return resolveMediaUrl(raw);
}

// ------------------------------------------------

export default function CommunityProfileCard({
  // If 'user' prop is passed (object with id or fields) we will show that user's groups/friends.
  user: userProp,
  communities: communitiesProp,
  friends: friendsProp,

  onMessage = () => { },
  onMore = () => { },
  onCommunityUnsubscribe = (c) => console.log("Unsubscribe:", c),

  // Optional callbacks invoked when user opens the dialogs
  onViewAllCommunities,
  onViewAllFriends,
}) {
  const navigate = useNavigate();

  const getAccessToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("token");

  const getRefreshToken = () =>
    localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh");

  const signOut = async () => {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    try {
      if (access && refresh) {
        await axios.post(
          `${apiBase}/auth/logout/`,
          { refresh },
          { headers: { Authorization: `Bearer ${access}` } }
        );
      }
    } catch { }

    clearAuth();
    localStorage.setItem("cart_count", "0");
    window.dispatchEvent(new Event("cart:update"));

    navigate("/", { replace: true });
  };

  const [openGroups, setOpenGroups] = React.useState(false);
  const [openFriends, setOpenFriends] = React.useState(false);

  const [me, setMe] = React.useState(null);
  const [groups, setGroups] = React.useState(() =>
    Array.isArray(communitiesProp) ? communitiesProp : []
  );
  const [friends, setFriends] = React.useState(() =>
    Array.isArray(friendsProp) ? friendsProp : []
  );
  const [loading, setLoading] = React.useState(true);

  // Helper: normalize group rows to {id, name, code, color, subscribed}
  function normalizeGroups(rows = []) {
    return (rows || []).map((row) => {
      // handle when API returns group object or nested object
      const g = row.group || row || {};
      const name = g.name || g.title || g.display_name || g.slug || "Group";
      return {
        id: g.id || g.pk || `${name}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        code: (g.slug && g.slug.slice(0, 2).toUpperCase()) || initials(name),
        color: g.color || "#F1F5F9",
        subscribed: !!(g.subscribed || g.is_member || g.member_status === "active"),
        cover_image: resolveMediaUrl(g.cover_image || g.coverImage || g.icon || g.image || ""),
      };
    });
  }

  function normalizeFriends(rows = [], meId) {
    const arr = (rows || []).filter(Boolean); // drop null/undefined
    return arr
      .map((row) => {
        let other = null;
        if (row.id && (row.email || row.first_name || row.username)) {
          other = row;
        } else if (row.friend) other = row.friend;
        else if (row.user) other = row.user;
        else if (row.user1 && row.user2) {
          other = row.user1?.id === meId ? row.user2 : row.user1;
        } else if (row.to_user) other = row.to_user;
        else if (row.requestor) other = row.requestor;
        else other = row;
        if (!other || !other.id) return null;
        return {
          id: other.id,
          name: buildName(other),
          avatarUrl: pickAvatar(other),
        };
      })
      .filter(Boolean);
  }


  // Fetch live data for: me (or target user), joined groups, friends
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // If userProp passed and has usable fields, prefer it.
        const targetId = userProp?.id ?? userProp?.pk;
        let targetUser = null;
        if (userProp && !targetId) {
          // userProp exists but no id — treat it as preloaded user object
          targetUser = userProp;
        }

        // 1) Load user data (either userProp if complete, or fetch by id, else fallback to /me)
        try {
          if (targetId) {
            // try multiple endpoints to fetch the user if needed
            try {
              targetUser = await getJsonOneOf([
                `/api/users/${targetId}/`,
                `/api/users/detail/${targetId}/`,
                `/api/profile/${targetId}/`,
              ]);
            } catch {
              // swallow; leave targetUser as userProp if present
              targetUser = targetUser || { id: targetId };
            }
          } else if (!targetUser) {
            // no target passed: fetch /me
            try {
              targetUser = await getJson("/api/users/me/");
            } catch {
              // if /api/users/me/ fails, try common alt
              try {
                targetUser = await getJson("/api/me/");
              } catch {
                targetUser = null;
              }
            }
          }
        } catch (e) {
          console.warn("profile load failed:", e);
        }

        // store me for subsequent normalization (some friend rows need me.id)
        if (!mounted) return;
        setMe(targetUser);

        // 2) Joined groups for the target user
        let groupsRaw = [];
        if (Array.isArray(communitiesProp) && communitiesProp.length > 0) {
          groupsRaw = communitiesProp;
        } else {
          // build candidate endpoints — many backends differ, so try a few
          const candidateGroupEndpoints = targetId
            ? [
              `/api/groups/joined-groups/?user_id=${targetId}`,
              `/api/users/${targetId}/groups/?page_size=50`,
              `/api/groups/?member_id=${targetId}&page_size=50`,
              `/api/groups/members/?user_id=${targetId}&page_size=50`,
            ]
            : [
              "/api/groups/joined-groups/",
              "/api/groups/?page_size=50",
            ];

          try {
            const g = await getJsonOneOf(candidateGroupEndpoints);
            groupsRaw =
              Array.isArray(g?.results) ? g.results : Array.isArray(g) ? g : [];
          } catch (e) {
            // fail soft — keep any prop content visible
            console.warn("group fetch failed:", e);
            groupsRaw = [];
          }
        }
        const groupsNorm = normalizeGroups(groupsRaw);

        // 3) Friends list for the target user
        let friendsRaw = [];
        if (Array.isArray(friendsProp) && friendsProp.length > 0) {
          friendsRaw = friendsProp;
        } else {
          // candidate friend endpoints (varies by backend)
          const candidateFriendEndpoints = targetId
            ? [
              `/api/friends/?user_id=${targetId}&page_size=100`,
              `/api/users/${targetId}/friends/?page_size=100`,
              `/api/friendships/?user_id=${targetId}&page_size=100`,
              `/api/friends/?page_size=100&user=${targetId}`,
              `/api/friendships/?page_size=100&user=${targetId}`,
              `/api/friends/?page_size=100`, // fallback – might return ALL friends (server may filter)
            ]
            : [
              "/api/friends/?page_size=100",
              "/api/friendships/?page_size=100",
              "/api/friends/?limit=100",
            ];

          try {
            const f = await getJsonOneOf(candidateFriendEndpoints);
            friendsRaw = Array.isArray(f?.results) ? f.results : Array.isArray(f) ? f : [];
          } catch (e) {
            console.warn("friend fetch failed:", e);
            friendsRaw = [];
          }
        }
        const friendsNorm = normalizeFriends(friendsRaw, targetUser?.id);

        if (!mounted) return;
        setGroups(groupsNorm);
        setFriends(friendsNorm);
      } catch (e) {
        console.error("CommunityProfileCard (fetch):", e);
        // fail soft – keep any props content visible
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // Re-run when userProp, communitiesProp or friendsProp change
  }, [userProp, communitiesProp, friendsProp]);

  const handleOpenGroups = () => {
    onViewAllCommunities?.();
    setOpenGroups(true);
  };
  const handleOpenFriends = () => {
    onViewAllFriends?.();
    setOpenFriends(true);
  };

  const userDisplay = React.useMemo(() => {
    // prefer passed userProp (so parent can override name/avatar), else derive from me (fetched)
    if (userProp) {
      return {
        name: buildName(userProp),
        status: userProp.status || "Active",
        avatarUrl: pickAvatar(userProp),
      };
    }
    const name = buildName(me);
    const avatarUrl = pickAvatar(me);
    return {
      name: name || "User",
      status: (me && (me.status || me.profile?.status)) || "Active",
      avatarUrl,
    };
  }, [userProp, me]);

  // ✅ Show only 3 items on the card; dialogs use full arrays
  const groupsPreview = React.useMemo(() => (groups || []).slice(0, 3), [groups]);
  const friendsPreview = React.useMemo(() => (friends || []).slice(0, 3), [friends]);

  return (
    <>
      <Stack spacing={2.25}>
        {/* Profile card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          <Stack spacing={1.25} alignItems="center">
            <Avatar
              src={userDisplay.avatarUrl}
              alt={userDisplay.name}
              sx={{ width: 72, height: 72, bgcolor: "#1abc9c", fontWeight: 700 }}
            >
              {userDisplay.avatarUrl ? null : initials(userDisplay.name)}
            </Avatar>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: SLATE_700 }}>
              {userDisplay.name}
            </Typography>

            {!!userDisplay.status && (
              <Chip
                size="small"
                label={userDisplay.status}
                variant="filled"
                sx={{
                  bgcolor: "#E6F9EE",
                  color: "#198754",
                  fontWeight: 600,
                  height: 22,
                  "& .MuiChip-label": { px: 1.25, pt: "1px" },
                }}
              />
            )}

            <Stack direction="row" spacing={1}>
              <Tooltip title="Logout">
                <IconButton size="small" onClick={signOut}>
                  <LogoutRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="More">
                <IconButton size="small" onClick={onMore}>
                  <MoreHorizRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        {/* Your Groups */}
        <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <SectionHeader title="Your Groups" onViewAll={handleOpenGroups} viewAllText="View all" />

          <Stack spacing={1.25} mt={1}>
            {(groupsPreview || []).map((c) => (
              <Stack
                key={c.id}
                direction="row"
                spacing={1.25}
                alignItems="center"
                component={RouterLink}
                to={buildGroupDetailUrl(c)}
                sx={{ textDecoration: "none", cursor: "pointer" }}
              >
                <Avatar
                  variant="rounded"
                  src={c.cover_image || undefined}
                  imgProps={{ referrerPolicy: "no-referrer" }}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: c.cover_image ? undefined : (c.color || "#F1F5F9"),
                    color: "#111827",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {!c.cover_image ? (c.code || initials(c.name)) : null}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: SLATE_700, lineHeight: 1.2 }}
                    noWrap
                    title={c.name}
                  >
                    {c.name}
                  </Typography>
                  {c.subscribed && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCommunityUnsubscribe(c); }}
                      sx={{
                        p: 0,
                        minWidth: 0,
                        justifyContent: "flex-start",
                        color: "#2E7D32",
                        textTransform: "none",
                        fontSize: 12,
                      }}
                    >
                      Unsubscribe
                    </Button>
                  )}
                </Box>
              </Stack>
            ))}
            {!loading && (!groups || groups.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                No groups to show.
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Your friends */}
        <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <SectionHeader title="Your Contacts" onViewAll={handleOpenFriends} viewAllText="View all" />

          <Stack spacing={1.25} mt={1}>
            {(friendsPreview || []).map((f) => (
              <Stack
                key={f.id}
                direction="row"
                spacing={1.25}
                alignItems="center"
                component={RouterLink}
                to={buildRichProfileUrl(f)}
                sx={{ textDecoration: "none", cursor: "pointer" }}
              >
                <Avatar src={f.avatarUrl} alt={f.name} sx={{ width: 28, height: 28 }}>
                  {f.avatarUrl ? null : (f.name?.[0] || "").toUpperCase()}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: SLATE_700 }}
                  noWrap
                  title={f.name}
                >
                  {f.name}
                </Typography>
              </Stack>
            ))}
            {!loading && (!friends || friends.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                No friends to show.
              </Typography>
            )}
          </Stack>
        </Paper>
      </Stack>

      {/* Dialog: Your Groups */}
      <Dialog open={openGroups} onClose={() => setOpenGroups(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Your Groups</DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {(groups || []).map((c, idx) => (
              <React.Fragment key={c.id || idx}>
                <ListItemButton
                  disableRipple
                  component={RouterLink}
                  to={buildGroupDetailUrl(c)}
                  onClick={() => setOpenGroups(false)}
                >
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: c.color || "#F1F5F9",
                        color: "#111827",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {c.code || initials(c.name)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>{c.name}</Typography>}
                    secondary={c.subscribed ? "Subscribed" : ""}
                  />
                  {c.subscribed && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCommunityUnsubscribe(c); }}
                      sx={{ textTransform: "none" }}
                    >
                      Unsubscribe
                    </Button>
                  )}
                </ListItemButton>
                {idx < (groups?.length || 0) - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
            {!loading && (!groups || groups.length === 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                No groups to show.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroups(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Your friends */}
      <Dialog open={openFriends} onClose={() => setOpenFriends(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Your friends</DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {(friends || []).map((f, idx) => (
              <React.Fragment key={f.id || idx}>
                <ListItemButton
                  disableRipple
                  component={RouterLink}
                  to={buildRichProfileUrl(f)}
                  onClick={() => setOpenFriends(false)}
                >
                  <ListItemAvatar>
                    <Avatar src={f.avatarUrl} alt={f.name}>
                      {f.avatarUrl ? null : (f.name?.[0] || "").toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>{f.name}</Typography>}
                    secondary={f.job_title || f.headline || ""}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMessage(f); }}
                    sx={{ textTransform: "none" }}
                  >
                    Message
                  </Button>
                </ListItemButton>
                {idx < (friends?.length || 0) - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
            {!loading && (!friends || friends.length === 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                No friends to show.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFriends(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SectionHeader({ title, onViewAll, viewAllText = "View all" }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Button
        size="small"
        variant="text"
        onClick={onViewAll}
        sx={{ textTransform: "none", fontSize: 12, p: 0, minWidth: 0 }}
      >
        {viewAllText}
      </Button>
    </Stack>
  );
}
