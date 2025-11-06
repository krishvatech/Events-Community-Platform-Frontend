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
  TextField,
  Tooltip,
  Typography,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Card,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// Colorful world map + markers with pan/zoom
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

/* --------------------- constants & helpers --------------------- */
const BORDER = "#e2e8f0";
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const isAbort = (e) =>
  e?.name === "AbortError" ||
  /aborted|aborterror|signal is aborted/i.test(e?.message || "");

const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .replace(/[\u2019'".,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* ------------ Static country mapping + centroids + flag emoji ------------ */
const COUNTRY_NAME_TO_ISO2 = {
  india: "IN", bharat: "IN", hindustan: "IN",
  "united states": "US", usa: "US", "u.s.": "US", america: "US",
  "united kingdom": "GB", uk: "GB", england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB",
  pakistan: "PK",
  switzerland: "CH", suisse: "CH", schweiz: "CH", svizzera: "CH",
  "united arab emirates": "AE", uae: "AE", dubai: "AE", "abu dhabi": "AE",
  canada: "CA", australia: "AU", italy: "IT", japan: "JP",
  germany: "DE", france: "FR", spain: "ES", brazil: "BR", mexico: "MX",
  singapore: "SG", indonesia: "ID", vietnam: "VN", russia: "RU", china: "CN",
  "south korea": "KR", "republic of korea": "KR", "korea, republic of": "KR",
  argentina: "AR", "south africa": "ZA", nigeria: "NG", kenya: "KE",
  turkey: "TR", netherlands: "NL", sweden: "SE", norway: "NO",
  denmark: "DK", portugal: "PT", poland: "PL", ireland: "IE",
  "new zealand": "NZ",
};

function resolveCountryCode(user) {
  const direct =
    user?.profile?.country_code ||
    user?.country_code ||
    user?.countryCode ||
    user?.country_code_iso2;
  if (direct && String(direct).length === 2) return String(direct).toUpperCase();

  const candidates = [
    user?.profile?.country,
    user?.country,
    user?.location_country,
    user?.profile?.location_country,
    (user?.profile?.location || "").split(",").slice(-1)[0],
  ].filter(Boolean);

  for (const c of candidates) {
    const code = COUNTRY_NAME_TO_ISO2[norm(c)];
    if (code) return code.toUpperCase();
  }
  return "";
}

function displayCountry(user) {
  return (
    user?.profile?.country ||
    user?.country ||
    user?.location_country ||
    user?.profile?.location_country ||
    ""
  );
}

function flagEmojiFromISO2(code) {
  if (!code || code.length !== 2) return "";
  const cc = code.toUpperCase();
  const pts = [...cc].map((c) => 127397 + c.charCodeAt(0));
  try { return String.fromCodePoint(...pts); } catch { return ""; }
}

// centroids (lng, lat)
const COUNTRY_CENTROIDS = {
  in: [78.9629, 22.5937], gb: [-3.4359, 55.3781], ch: [8.2275, 46.8182],
  us: [-98.5795, 39.8283], pk: [69.3451, 30.3753], ae: [54.366, 24.455],
  ca: [-106.3468, 56.1304], au: [133.7751, -25.2744], it: [12.5674, 41.8719],
  jp: [138.2529, 36.2048], de: [10.4515, 51.1657], fr: [2.2137, 46.2276],
  es: [-3.7492, 40.4637], br: [-51.9253, -14.235], mx: [-102.5528, 23.6345],
  sg: [103.8198, 1.3521], id: [113.9213, -0.7893], vn: [108.2772, 14.0583],
  ru: [105.3188, 61.524], cn: [104.1954, 35.8617], kr: [127.7669, 35.9078],
  ar: [-63.6167, -38.4161], za: [22.9375, -30.5595], ng: [8.6753, 9.082],
  ke: [37.9062, 0.0236], tr: [35.2433, 38.9637], nl: [5.2913, 52.1326],
  se: [18.6435, 60.1282], no: [8.4689, 60.472], dk: [9.5018, 56.2639],
  pt: [-8.2245, 39.3999], pl: [19.1451, 51.9194], ie: [-8.2439, 53.4129],
  nz: [170.5, -44.0],
};

// pastel country fills
const PALETTE = [
  "#e3f2fd","#e8f5e9","#fff3e0","#f3e5f5","#ede7f6",
  "#fffde7","#e0f2f1","#fce4ec","#e8eaf6","#f1f8e9",
];
const countryColor = (name) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

/* ------------------------ mock members (fallback) ------------------------ */
const MOCK_MEMBERS = [
  { id: 101, first_name: "Shehar", last_name: "Yar", email: "shehar@example.com",
    company_from_experience: "Freelance", position_from_experience: "Frontend Engineer",
    profile: { full_name: "Shehar Yar", job_title: "Active today", country: "Pakistan" } },
  { id: 102, first_name: "Stewart", last_name: "Farquhar", email: "stewart@example.com",
    company_from_experience: "Glasgow Uni", position_from_experience: "Researcher",
    profile: { full_name: "Stewart Farquhar", job_title: "Active today", country: "United Kingdom" } },
  { id: 103, first_name: "Christopher", last_name: "Kummer", email: "ckummer@example.com",
    company_from_experience: "Kummer AG", position_from_experience: "CTO",
    profile: { full_name: "Christopher Kummer", job_title: "Active today", country: "Switzerland" } },
  { id: 104, first_name: "Eden", last_name: "Roberts", email: "edenr@example.com",
    company_from_experience: "UWS", position_from_experience: "AI Student",
    profile: { full_name: "Eden Roberts", job_title: "Active today", country: "United Kingdom" } },
  { id: 105, first_name: "Jamie", last_name: "Hamilton", email: "jamieh@example.com",
    company_from_experience: "UWS", position_from_experience: "MS AI",
    profile: { full_name: "Jamie Hamilton", job_title: "Active today", country: "United Kingdom" } },
  { id: 106, first_name: "Aarav", last_name: "Patel", email: "aarav@example.com",
    company_from_experience: "TCS", position_from_experience: "SWE",
    profile: { full_name: "Aarav Patel", job_title: "Active today", country: "India" } },
  { id: 107, first_name: "Neha", last_name: "Shah", email: "neha@example.com",
    company_from_experience: "Zomato", position_from_experience: "PM",
    profile: { full_name: "Neha Shah", job_title: "Active today", country: "India" } },
  { id: 108, first_name: "Ravi", last_name: "Kumar", email: "ravi@example.com",
    company_from_experience: "Flipkart", position_from_experience: "Data Eng",
    profile: { full_name: "Ravi Kumar", job_title: "Active today", country: "India" } },
  { id: 109, first_name: "Olivia", last_name: "Smith", email: "olivia@example.com",
    company_from_experience: "Meta", position_from_experience: "Designer",
    profile: { full_name: "Olivia Smith", job_title: "Active today", country: "United States" } },
  { id: 110, first_name: "Liam", last_name: "Johnson", email: "liam@example.com",
    company_from_experience: "Stripe", position_from_experience: "SRE",
    profile: { full_name: "Liam Johnson", job_title: "Active today", country: "United States" } },
  { id: 111, first_name: "Aisha", last_name: "Khan", email: "aisha@example.com",
    company_from_experience: "Noon", position_from_experience: "Ops",
    profile: { full_name: "Aisha Khan", job_title: "Active today", country: "United Arab Emirates" } },
  { id: 112, first_name: "Ethan", last_name: "Brown", email: "ethan@example.com",
    company_from_experience: "Shopify", position_from_experience: "Backend",
    profile: { full_name: "Ethan Brown", job_title: "Active today", country: "Canada" } },
  { id: 113, first_name: "Sophie", last_name: "Martin", email: "sophie@example.com",
    company_from_experience: "Atlassian", position_from_experience: "QE",
    profile: { full_name: "Sophie Martin", job_title: "Active today", country: "Australia" } },
  { id: 114, first_name: "Marco", last_name: "Rossi", email: "marco@example.com",
    company_from_experience: "Uni Milano", position_from_experience: "PhD",
    profile: { full_name: "Marco Rossi", job_title: "Active today", country: "Italy" } },
  { id: 115, first_name: "Kenji", last_name: "Sato", email: "kenji@example.com",
    company_from_experience: "Rakuten", position_from_experience: "ML Eng",
    profile: { full_name: "Kenji Sato", job_title: "Active today", country: "Japan" } },
  { id: 116, first_name: "Julia", last_name: "Müller", email: "julia@example.com",
    company_from_experience: "ETH Zürich", position_from_experience: "Research",
    profile: { full_name: "Julia Müller", job_title: "Active today", country: "Switzerland" } },
];

/* ----------------------------- preview markers ---------------------------- */
const PREVIEW_LIST = [
  { code: "in", members: 6, friends: 2 },
  { code: "gb", members: 4, friends: 2 },
  { code: "ch", members: 2, friends: 1 },
  { code: "us", members: 3, friends: 1 },
  { code: "pk", members: 1, friends: 0 },
  { code: "ae", members: 1, friends: 0 },
  { code: "ca", members: 1, friends: 0 },
  { code: "au", members: 1, friends: 0 },
  { code: "it", members: 1, friends: 0 },
  { code: "jp", members: 1, friends: 0 },
];
function expandPreviewMarkers() {
  const out = [];
  for (const row of PREVIEW_LIST) {
    const center = COUNTRY_CENTROIDS[row.code];
    if (!center) continue;
    const total = row.members;
    const gf = Math.min(row.friends, row.members);
    for (let i = 0; i < total; i++) {
      out.push({ code: row.code, center, isFriend: i < gf });
    }
  }
  return out;
}

/* -------------------------- Member card (left) -------------------------- */
function MemberCard({ u, unread, friendStatus, onOpenProfile, onMessage, onAddFriend }) {
  const name =
    u?.profile?.full_name ||
    `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
    u?.email;
  const email = u?.email;
  const company = u?.company_from_experience ?? "—";
  const title = u?.position_from_experience || u?.profile?.job_title || u?.job_title || "—";
  const status = (friendStatus || "").toLowerCase();
  const iso2 = resolveCountryCode(u);
  const flag = flagEmojiFromISO2(iso2);
  const country = displayCountry(u);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: BORDER,
        px: 1.5,
        py: 1.25,
        "&:hover": { boxShadow: "0 6px 24px rgba(0,0,0,0.06)", borderColor: "#cbd5e1" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Badge
          overlap="circular"
          variant="dot"
          color="error"
          invisible={!unread}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Avatar
            sx={{ width: 44, height: 44, cursor: "pointer", bgcolor: "#e2e8f0", color: "#334155", fontWeight: 700 }}
            onClick={() => onOpenProfile?.(u)}
          >
            {(name || "?").slice(0, 1).toUpperCase()}
          </Avatar>
        </Badge>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, cursor: "pointer" }}
              onClick={() => onOpenProfile?.(u)}
              noWrap
            >
              {name}
            </Typography>
            {!!country && (
              <Chip
                size="small"
                variant="outlined"
                label={`${flag ? flag + " " : ""}${country}`}
                sx={{ height: 22 }}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap>
            {email}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25 }} noWrap>
            {company} • <span style={{ color: "#64748b" }}>{title}</span>
          </Typography>
        </Box>

        {/* actions on the right */}
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          {status === "friends" ? (
            <>
              <Tooltip title="Open profile">
                <IconButton size="small" onClick={() => onOpenProfile?.(u)}>
                  <OpenInNewOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                variant="contained"
                sx={{ textTransform: "none", borderRadius: 2 }}
                startIcon={<MailOutlineOutlinedIcon />}
                onClick={() => onMessage?.(u)}
              >
                Message
              </Button>
            </>
          ) : status === "pending_outgoing" ? (
            <Button
              size="small"
              variant="outlined"
              sx={{ textTransform: "none", borderRadius: 2 }}
              disabled
            >
              Request pending
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              sx={{ textTransform: "none", borderRadius: 2 }}
              startIcon={<PersonAddAlt1RoundedIcon />}
              onClick={() => onAddFriend?.(u)}
            >
              Add friend
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

/* ------------------------------ page component ------------------------------ */
export default function MembersPage() {
  const navigate = useNavigate();

  // state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  // map controls
  const [showMap, setShowMap] = useState(true);
  const [usePreview, setUsePreview] = useState(true); // show dots immediately
  const [mapPos, setMapPos] = useState({ coordinates: [0, 0], zoom: 1 }); // pan/zoom state

  // pagination
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // friend + unread
  const [friendStatusByUser, setFriendStatusByUser] = useState({});
  const [unreadByUser, setUnreadByUser] = useState({});
  const pollRef = useRef(null);

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  }, []);

  async function fetchFriendStatus(id) {
    const r = await fetch(`${API_BASE}/friends/status/?user_id=${id}`, {
      headers: tokenHeader(),
      credentials: "include",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.detail || `Failed status for ${id}`);
    return (d?.status || d?.friendship || "none").toLowerCase();
  }

  async function sendFriendRequest(id) {
    const r = await fetch(`${API_BASE}/friend-requests/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenHeader() },
      credentials: "include",
      body: JSON.stringify({ to_user_id: id }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d?.detail || "Failed to send request"); return; }
    setFriendStatusByUser((m) => ({ ...m, [id]: "pending_outgoing" }));
  }

  // data load
  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;

    (async () => {
      try {
        if (!alive) return;
        setLoading(true);
        setError("");

        const fetchUsers = async (url) => {
          const res = await fetch(url, {
            headers: tokenHeader(),
            signal: ctrl.signal,
            credentials: "include",
          });
          const text = await res.text();
          const json = text ? JSON.parse(text) : [];
          if (!res.ok) {
            throw new Error((json && json.detail) || `HTTP ${res.status} while fetching users`);
          }
          return Array.isArray(json) ? json : json?.results ?? [];
        };

        let list = [];
        try { list = await fetchUsers(`${API_BASE}/users/roster/`); }
        catch (e) {
          if (isAbort(e)) return;
          try { list = await fetchUsers(`${API_BASE}/users/?limit=500`); }
          catch (e2) { if (isAbort(e2)) return; throw e2; }
        }

        if (!alive) return;
        const finalList = list && list.length ? list : MOCK_MEMBERS;
        setUsers(finalList.filter((u) => u.id !== me?.id));
      } catch (e) {
        if (isAbort(e)) return;
        console.error(e);
        if (alive) setError(e?.message || "Failed to load users");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; ctrl.abort(); };
  }, [me?.id]);

  // conversations polling (for unread)
  useEffect(() => {
    let alive = true;

    function pickOther(conv) {
      const otherId = Array.isArray(conv?.users)
        ? conv.users.find((id) => id !== me?.id)
        : conv?.other_user_id;
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
          const isUnread = ts && sender && sender !== me?.id && (!seen || new Date(ts).getTime() > new Date(seen).getTime());
          if (isUnread) map[otherId] = true;
        }
        if (alive) setUnreadByUser(map);
      } catch {}
    }
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => { alive = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [me?.id]);

  // text filter
  const filtered = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    return users.filter((u) => {
      const fn = (u.first_name || "").toLowerCase();
      const ln = (u.last_name || "").toLowerCase();
      const em = (u.email || "").toLowerCase();
      const full = (u.profile?.full_name || "").toLowerCase();
      const company = (u.company_from_experience || "").toLowerCase();
      const title = (u.position_from_experience || u.profile?.job_title || u.job_title || "").toLowerCase();
      return fn.includes(s) || ln.includes(s) || em.includes(s) || full.includes(s) || company.includes(s) || title.includes(s);
    });
  }, [users, q]);

  // preload friend statuses (for map dot colors and cards)
  useEffect(() => {
    let alive = true;
    const ids = filtered
      .map((u) => u.id)
      .filter((id) => friendStatusByUser[id] === undefined)
      .slice(0, 300);
    if (!ids.length) return;
    (async () => {
      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            try { const s = await fetchFriendStatus(id); return [id, s]; }
            catch { return [id, "none"]; }
          })
        );
        if (alive) setFriendStatusByUser((m) => ({ ...m, ...Object.fromEntries(entries) }));
      } catch {}
    })();
    return () => { alive = false; };
  }, [filtered.map((u) => u.id).join("|")]); // eslint-disable-line

  // markers from filtered list
  const liveMarkers = useMemo(() => {
    const byCountry = {};
    for (const u of filtered) {
      const code = resolveCountryCode(u).toLowerCase();
      const center = COUNTRY_CENTROIDS[code];
      if (!center) continue;
      const isFriend = (friendStatusByUser[u.id] || "").toLowerCase() === "friends";
      if (!byCountry[code]) byCountry[code] = [];
      byCountry[code].push({ center, isFriend });
    }
    const out = [];
    Object.entries(byCountry).forEach(([code, arr]) => {
      const base = COUNTRY_CENTROIDS[code];
      arr.forEach((item, idx) => {
        const angle = ((idx * 40) % 360) * (Math.PI / 180);
        const ring = Math.floor(idx / 9) + 1;
        const r = 0.4 * ring;
        const dx = r * Math.cos(angle);
        const dy = r * Math.sin(angle);
        out.push({ coordinates: [base[0] + dx, base[1] + dy], isFriend: item.isFriend });
      });
    });
    return out;
  }, [filtered, friendStatusByUser]);

  const markers = usePreview
    ? expandPreviewMarkers().map((m, i) => {
        const angle = ((i * 40) % 360) * (Math.PI / 180);
        const ring = Math.floor(i / 9) + 1;
        const r = 0.4 * ring;
        const dx = r * Math.cos(angle);
        const dy = r * Math.sin(angle);
        return { coordinates: [m.center[0] + dx, m.center[1] + dy], isFriend: m.isFriend };
      })
    : liveMarkers;

  // pagination
  useEffect(() => setPage(1), [q]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const startIdx = (page - 1) * ROWS_PER_PAGE;
  const current = filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);

  // ensure page rows have friend status (for action buttons)
  useEffect(() => {
    let alive = true;
    const idsToLoad = current.map((u) => u.id).filter((id) => friendStatusByUser[id] === undefined);
    if (!idsToLoad.length) return;
    (async () => {
      try {
        const entries = await Promise.all(
          idsToLoad.map(async (id) => {
            try { const s = await fetchFriendStatus(id); return [id, s]; }
            catch { return [id, "none"]; }
          })
        );
        if (alive) setFriendStatusByUser((m) => ({ ...m, ...Object.fromEntries(entries) }));
      } catch {}
    })();
    return () => { alive = false; };
  }, [current.map((u) => u.id).join(",")]); // eslint-line-disable

  const handleOpenProfile = (m) => {
    const id = m?.id;
    if (!id) return;
    navigate(`/community/rich-profile/${id}`, { state: { user: m } });
  };

  const startChat = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/messaging/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        credentials: "include",
        body: JSON.stringify({ to_user_id: id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.detail || "Failed to start chat");
      const convId = d?.id || d?.conversation_id;
      if (convId) navigate(`/messages/${convId}`);
    } catch (e) {
      alert(e?.message || "Unable to start chat");
    }
  };

  // map controls
  const zoomIn = () =>
    setMapPos((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  const zoomOut = () =>
    setMapPos((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 0.8) }));
  const resetView = () => setMapPos({ coordinates: [0, 0], zoom: 1 });

  /* -------------------------------- UI -------------------------------- */
  return (
    <Grid container spacing={2}>
      {/* Left: Member list (card style) */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Members ({filtered.length})
            </Typography>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              size="small"
              placeholder="Search members"
              sx={{ width: { xs: "100%", sm: 320 } }}
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
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filtered.length === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + ROWS_PER_PAGE, filtered.length)} of ${filtered.length}`}
              </Typography>
              <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" size="small" />
            </Stack>

            <Stack spacing={1.25}>
              {current.map((u) => (
                <MemberCard
                  key={u.id}
                  u={u}
                  unread={!!unreadByUser[u.id]}
                  friendStatus={friendStatusByUser[u.id]}
                  onOpenProfile={handleOpenProfile}
                  onMessage={() => startChat(u.id)}
                  onAddFriend={() => sendFriendRequest(u.id)}
                />
              ))}

              {filtered.length === 0 && (
                <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center", border: `1px solid ${BORDER}` }}>
                  <Typography>No members match your search.</Typography>
                </Paper>
              )}
            </Stack>

            <Stack alignItems="center" sx={{ mt: 1 }}>
              <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" size="small" />
            </Stack>
          </>
        )}
      </Grid>

      {/* Right: Colorful map with red/green dots + pan/zoom */}
      <Grid item xs={12} md={6}>
        <Paper
          sx={{
            p: 1.5,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            position: { md: "sticky" },
            top: 88,
            height: { xs: 520, md: "calc(100vh - 140px)" },
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Where members are from
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <FormControlLabel control={<Switch checked={showMap} onChange={(_, v) => setShowMap(v)} size="small" />} label="Show map" />
              <FormControlLabel control={<Switch checked={usePreview} onChange={(_, v) => setUsePreview(v)} size="small" />} label="Preview" />
            </Stack>
          </Stack>

          {/* Legend + zoom controls */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ef4444", border: "1px solid #fff" }} />
                <Typography variant="caption">Members</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#10b981", border: "1px solid #fff" }} />
                <Typography variant="caption">Friends</Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={zoomOut}><ZoomOutIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={zoomIn}><ZoomInIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={resetView}><RestartAltIcon fontSize="small" /></IconButton>
            </Stack>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 360 }}>
            {showMap ? (
              <ComposableMap projection="geoEqualEarth" width={800} height={440}>
                <ZoomableGroup
                  center={mapPos.coordinates}
                  zoom={mapPos.zoom}
                  minZoom={0.8}
                  maxZoom={8}
                  onMoveEnd={(pos) => setMapPos(pos)} // drag to pan, wheel to zoom
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={countryColor(geo.properties.name)}
                          stroke="#ffffff"
                          strokeWidth={0.3}
                        />
                      ))
                    }
                  </Geographies>

                  {markers.map((m, i) => (
                    <Marker key={i} coordinates={m.coordinates}>
                      <circle
                        r={3.2}
                        fill={m.isFriend ? "#10b981" : "#ef4444"}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    </Marker>
                  ))}
                </ZoomableGroup>
              </ComposableMap>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", color: "text.secondary" }}>
                <Typography>Map hidden.</Typography>
              </Stack>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
