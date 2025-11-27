// src/pages/community/MembersPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
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
  useMediaQuery,
  Tabs,
  Tab,
  Checkbox,
  MenuItem,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { geoCentroid } from "d3-geo";

import { feature as topoFeature } from "topojson-client";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
isoCountries.registerLocale(enLocale);
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";



/* --------------------- constants & helpers --------------------- */
const BORDER = "#e2e8f0";
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const normalizeFriendStatus = (s) => {
  const v = (s || "").toLowerCase();
  if (["friends", "friend", "accepted", "approve", "approved"].includes(v)) return "friends";
  if (["pending_outgoing", "outgoing_pending", "requested", "requested_outgoing", "sent", "request_sent"].includes(v)) return "pending_outgoing";
  if (["pending_incoming", "incoming_pending", "received", "request_received"].includes(v)) return "pending_incoming";
  return "none";
};

const isAbort = (e) =>
  e?.name === "AbortError" ||
  /aborted|aborterror|signal is aborted/i.test(e?.message || "");

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.35;

function extractCountryFromLocation(raw) {
  if (!raw) return "";
  const parts = String(raw)
    .split(/,|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) return "";

  // usually last part = country | e.g. "Mumbai, Maharashtra, India" -> "India"
  const last = parts[parts.length - 1]
    .replace(/[-–].*$/, "") // strip " - something" if present
    .trim();

  return last;
}


function resolveCountryCode(user) {
  const code =
    user?.profile?.country_code ||
    user?.country_code ||
    user?.countryCode ||
    user?.profile?.location_country_code ||
    user?.country_code_iso2;

  if (code) return String(code).toUpperCase();

  const rawName =
    user?.profile?.country ||
    user?.country ||
    user?.location_country ||
    user?.profile?.location_country ||
    user?.profile?.location ||
    user?.location ||
    "";

  const name = extractCountryFromLocation(rawName) || rawName;
  const iso2 = name ? isoCountries.getAlpha2Code(String(name), "en") : "";
  return iso2 ? String(iso2).toUpperCase() : "";
}

function displayCountry(user) {
  // 1) direct country fields
  const direct =
    user?.profile?.country ||
    user?.country ||
    user?.location_country ||
    user?.profile?.location_country;

  if (direct) {
    // if backend accidentally stored "City, Country" here, clean it
    const cleaned = extractCountryFromLocation(direct);
    return cleaned || direct;
  }

  // 2) fall back to full location ("Mumbai, India" -> "India")
  const loc = user?.profile?.location || user?.location;
  const fromLoc = extractCountryFromLocation(loc);
  return fromLoc || "";
}
function getCompanyFromUser(u) {
  return (u?.company_from_experience || "").trim();
}

function getJobTitleFromUser(u) {
  return (
    u?.position_from_experience ||
    u?.profile?.job_title ||
    u?.job_title ||
    ""
  ).trim();
}

function getCountryFromUser(u) {
  return (displayCountry(u) || "").trim();
}

function flagEmojiFromISO2(code) {
  if (!code || code.length !== 2) return "";
  const cc = code.toUpperCase();
  const pts = [...cc].map((c) => 127397 + c.charCodeAt(0));
  try { return String.fromCodePoint(...pts); } catch { return ""; }
}

const normName = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function useCountryCentroids(geoUrl) {
  const [centroidsByName, setCentroidsByName] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const topo = await (await fetch(geoUrl)).json();
        const gj = topoFeature(topo, topo.objects.countries);
        const map = {};
        for (const f of gj.features) {
          const name = f?.properties?.name;
          if (!name) continue;
          map[normName(name)] = geoCentroid(f);
        }
        if (alive) setCentroidsByName(map);
      } catch (e) {
        console.error("centroids load failed", e);
      }
    })();
    return () => { alive = false; };
  }, [geoUrl]);

  const getCenterForISO2 = useCallback((iso2) => {
    if (!iso2) return null;
    const name = isoCountries.getName(String(iso2).toUpperCase(), "en");
    if (!name) return null;
    const n = normName(name);
    if (centroidsByName[n]) return centroidsByName[n];
    const hit = Object.entries(centroidsByName).find(([k]) => k.includes(n) || n.includes(k));
    return hit ? hit[1] : null;
  }, [centroidsByName]);

  return getCenterForISO2;
}

const MAP_THEMES = {
  pastel: {
    landPalette: [
      "#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5", "#ede7f6",
      "#fffde7", "#e0f2f1", "#fce4ec", "#e8eaf6", "#f1f8e9",
    ],
    landStroke: "#ffffff",
    memberDot: "#ef4444",
    friendDot: "#10b981",
    ocean: "#f8fafc",
  },

  dark: {
    landPalette: [
      "#1f2937", "#111827", "#0f172a", "#020617", "#111827",
      "#1e293b", "#0b1120", "#020617", "#020617", "#111827",
    ],
    landStroke: "#020617",
    memberDot: "#f97316",   // orange
    friendDot: "#22c55e",   // green
    ocean: "#020617",
  },

  minimal: {
    landPalette: ["#e5e7eb"], // almost flat
    landStroke: "#9ca3af",
    memberDot: "#2563eb",
    friendDot: "#22c55e",
    ocean: "#ffffff",
  },

  // 🌍 Google-Earth style (day)
  earth: {
    landPalette: [
      "#c8e6c9", // light green
      "#a5d6a7",
      "#81c784",
      "#e6ce9a", // sand / desert
      "#d7ccc8",
      "#c5e1a5",
      "#aed581",
      "#ffecb3",
      "#b2dfdb",
      "#ffe0b2",
    ],
    landStroke: "#8fa8c3",          // soft bluish border
    memberDot: "#e53935",           // strong red
    friendDot: "#1e88e5",           // Google blue
    ocean: "#b3d9ff",               // bright blue water
  },

  // 🌎 Google-Earth muted / terrain
  earthMuted: {
    landPalette: [
      "#9ccc65",
      "#8bc34a",
      "#7cb342",
      "#d4b483",
      "#c8b68c",
      "#a5d6a7",
      "#c0ca33",
      "#ffcc80",
      "#80cbc4",
      "#bcaaa4",
    ],
    landStroke: "#7c8c9a",
    memberDot: "#f4511e",           // warmer red-orange
    friendDot: "#29b6f6",           // lighter blue
    ocean: "#90caf9",               // softer blue water
  },
};


const CURRENT_MAP_THEME = MAP_THEMES.earth; // or "pastel" / "minimal"


const PALETTE = CURRENT_MAP_THEME.landPalette;

const countryColor = (name) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

/* -------------------------- Member card (left) -------------------------- */
function MemberCard({ u, friendStatus, onOpenProfile, onAddFriend }) {
  const isMobile = useMediaQuery("(max-width:600px)");
  const email = u?.email || "";
  const usernameFromEmail = email ? email.split("@")[0] : "";
  const name =
    u?.profile?.full_name ||
    `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
    usernameFromEmail ||
    email;

  const company = u?.company_from_experience ?? "—";
  const title =
    u?.position_from_experience || u?.profile?.job_title || u?.job_title || "—";
  const status = (friendStatus || "").toLowerCase();
  const iso2 = resolveCountryCode(u);
  const flag = flagEmojiFromISO2(iso2);
  const country = displayCountry(u);

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100% !important",
        maxWidth: "100% !important",
        m: 0,
        borderRadius: 3,
        borderColor: BORDER,
        px: 1.5,
        py: 1.25,
        "&:hover": {
          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
          borderColor: "#cbd5e1",
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={u?.avatar_url || ""}
          alt={name}
          sx={{ width: 44, height: 44, cursor: "pointer", bgcolor: "#e2e8f0", color: "#334155", fontWeight: 700 }}
          onClick={() => onOpenProfile?.(u)}
        >
          {!(u?.avatar_url) ? (name || "?").slice(0, 1).toUpperCase() : null}
        </Avatar>

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

        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          {status === "friends" ? (
            <Tooltip title="Open profile">
              <IconButton size="small" onClick={() => onOpenProfile?.(u)}>
                <OpenInNewOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : status === "pending_outgoing" ? (
            <Tooltip title="Request sent">
              <IconButton size="small" disabled>
                <CheckCircleRoundedIcon fontSize="small" color="success" />
              </IconButton>
            </Tooltip>
          ) : isMobile ? (
            <Tooltip title="Request Contact">
              <IconButton
                size="small"
                onClick={() => onAddFriend?.(u)}
              >
                <PersonAddAlt1RoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              size="small"
              variant="outlined"
              sx={{ textTransform: "none", borderRadius: 2 }}
              startIcon={<PersonAddAlt1RoundedIcon />}
              onClick={() => onAddFriend?.(u)}
            >
              Request Contact
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}


function MembersLeafletMap({ markers, countryAgg, showMap, minHeight = 580 }) {
  const hasMarkers = markers && markers.length > 0;
  function AutoZoom({ markers }) {
    const map = useMap();

    React.useEffect(() => {
      if (!markers || markers.length === 0) return;

      // If only one marker, zoom in strongly on it
      if (markers.length === 1) {
        const [lng, lat] = markers[0].coordinates;
        map.flyTo([lat, lng], 6, { duration: 0.8 }); // zoom 6 = closer
        return;
      }

      // If multiple markers, fit bounds but don't zoom too far out
      const latLngs = markers.map((m) => {
        const [lng, lat] = m.coordinates;
        return [lat, lng];
      });

      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 4, // more zoom than before, but not too tight
      });
    }, [markers, map]);

    return null;
  }


  // Simple center: average of all marker positions, fallback to (20,0)
  let center = [20, 0]; // [lat, lng]
  if (hasMarkers) {
    let sumLat = 0;
    let sumLng = 0;
    markers.forEach((m) => {
      const [lng, lat] = m.coordinates; // our data is [lng, lat]
      sumLat += lat;
      sumLng += lng;
    });
    center = [sumLat / markers.length, sumLng / markers.length];
  }

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        minHeight,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {showMap && hasMarkers ? (
        <MapContainer
          center={center}
          zoom={3}
          minZoom={2}
          maxZoom={7}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom
          worldCopyJump
        >
          {/* Auto-adjust view when search/filter changes */}
          <AutoZoom markers={markers} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />


          {/* Country-level circles with counts (big soft markers) */}
          {countryAgg.map((c) => {
            const [lng, lat] = c.center;
            return (
              <CircleMarker
                key={c.code}
                center={[lat, lng]} // Leaflet uses [lat, lng]
                radius={10}
                pathOptions={{
                  color: "transparent",
                  fillOpacity: 0,
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -4]}>
                  <Box sx={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>{c.label}</div>
                    <div>
                      {c.total} people
                      {c.friends ? ` • ${c.friends} friends` : ""}
                    </div>
                    <div style={{ marginTop: 4, opacity: 0.9 }}>
                      {c.users.slice(0, 6).join(", ")}
                      {c.total > 6 ? ` +${c.total - 6} more` : ""}
                    </div>
                  </Box>
                </LeafletTooltip>
              </CircleMarker>
            );
          })}

          {/* Individual member dots */}
          {markers.map((m, i) => {
            const [lng, lat] = m.coordinates;
            return (
              <CircleMarker
                key={i}
                center={[lat, lng]}
                radius={3}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1,
                  fillColor: m.isFriend
                    ? CURRENT_MAP_THEME.friendDot
                    : CURRENT_MAP_THEME.memberDot,
                  fillOpacity: 1,
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -4]}>
                  <Box sx={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{m.userName}</div>
                    <div style={{ opacity: 0.85 }}>
                      {m.isFriend ? "Friend" : "Member"}
                    </div>
                  </Box>
                </LeafletTooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ height: "100%", color: "text.secondary" }}
        >
          <Typography>Map hidden.</Typography>
        </Stack>
      )}
    </Box>
  );
}


/* ------------------------------ page component ------------------------------ */
export default function MembersPage() {
  const navigate = useNavigate();
  // Changed logic: Trigger side-by-side mode earlier (at 900px, which is 'md')
  const isCompact = useMediaQuery("(max-width:900px)");
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);
  const getCenterForISO2 = useCountryCentroids(geoUrl);

  // state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);


  const [tabValue, setTabValue] = useState(0);

  // map controls
  const [showMap, setShowMap] = useState(true);
  const [mapPos, setMapPos] = useState({ coordinates: [0, 0], zoom: 1 });

  const hasSideMap = !isCompact;

  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 5;

  const [friendStatusByUser, setFriendStatusByUser] = useState({});

  const userDisplayName = (u) =>
    u?.profile?.full_name ||
    `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
    u?.email ||
    `User #${u?.id}`;

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
    return normalizeFriendStatus(d?.status || d?.friendship || "none");
  }

  async function sendFriendRequest(id) {
    try {
      const r = await fetch(`${API_BASE}/friend-requests/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...tokenHeader(),
        },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(id) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 200 && r.status !== 201) {
        throw new Error(d?.detail || "Failed to send request");
      }
      const status = normalizeFriendStatus(d?.status || "pending_outgoing");
      setFriendStatusByUser((m) => ({ ...m, [id]: status }));
    } catch (e) {
      alert(e?.message || "Failed to send request");
    }
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
        setUsers(
          (list || []).filter(
            (u) => u.id !== me?.id && !u.is_superuser
          )
        );
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

  const companyOptions = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      const c = getCompanyFromUser(u);
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const countryOptions = useMemo(() => {
    const map = new Map();

    users.forEach((u) => {
      const raw = getCountryFromUser(u);
      if (!raw) return;

      const cleaned = raw.trim();
      const key = cleaned.toLowerCase(); // use lower-case for dedupe

      if (!map.has(key)) {
        map.set(key, cleaned); // store the nicely formatted label once
      }
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [users]);


  const titleOptions = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      const t = getJobTitleFromUser(u);
      if (t) set.add(t);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);


  const filtered = useMemo(() => {
    let sourceList = users;

    // Tab filter (All Members / My Contacts)
    if (tabValue === 1) {
      sourceList = users.filter((u) => {
        const status = (friendStatusByUser[u.id] || "").toLowerCase();
        return status === "friends";
      });
    }

    // ✅ Company filter
    if (selectedCompanies.length) {
      sourceList = sourceList.filter((u) =>
        selectedCompanies.includes(getCompanyFromUser(u))
      );
    }

    // ✅ Country filter
    if (selectedCountries.length) {
      sourceList = sourceList.filter((u) =>
        selectedCountries.includes(getCountryFromUser(u))
      );
    }

    // ✅ Job title filter
    if (selectedTitles.length) {
      sourceList = sourceList.filter((u) =>
        selectedTitles.includes(getJobTitleFromUser(u))
      );
    }

    const s = (q || "").toLowerCase().trim();
    if (!s) return sourceList;

    // Text search (name, email, company, title, skills, city, country)
    return sourceList.filter((u) => {
      const fn = (u.first_name || "").toLowerCase();
      const ln = (u.last_name || "").toLowerCase();
      const em = (u.email || "").toLowerCase();
      const full = (u.profile?.full_name || "").toLowerCase();
      const company = (u.company_from_experience || "").toLowerCase();
      const title = (
        u.position_from_experience ||
        u.profile?.job_title ||
        u.job_title ||
        ""
      ).toLowerCase();
      const role = (u.profile?.role || u.role || "").toLowerCase();
      let skills = [];
      const rawSkills =
        (u.profile && u.profile.skills) ||
        u.skills ||
        [];
      if (Array.isArray(rawSkills)) {
        skills = rawSkills.map((x) => String(x).toLowerCase());
      } else if (typeof rawSkills === "string") {
        skills = rawSkills
          .split(/,|;|\n/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);
      }
      const countryName = (displayCountry(u) || "").toLowerCase();
      const city = (
        u.profile?.location_city ||
        u.profile?.city ||
        u.city ||
        u.profile?.location ||
        ""
      ).toLowerCase();

      const haystack = [
        fn,
        ln,
        full,
        em,
        company,
        title,
        role,
        countryName,
        city,
        ...skills,
      ];

      return haystack.some((v) => v && v.includes(s));
    });
  }, [
    users,
    q,
    tabValue,
    friendStatusByUser,
    selectedCompanies,
    selectedCountries,
    selectedTitles,
  ]);


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
      } catch { }
    })();
    return () => { alive = false; };
  }, [filtered.map((u) => u.id).join("|")]);

  const liveMarkers = useMemo(() => {
    const byCountry = {};
    for (const u of filtered) {
      const code = resolveCountryCode(u).toLowerCase();
      const center = getCenterForISO2(code);
      if (!center) continue;
      const isFriend = (friendStatusByUser[u.id] || "").toLowerCase() === "friends";
      if (!byCountry[code]) byCountry[code] = [];
      byCountry[code].push({ center, isFriend, user: u });
    }
    const out = [];
    Object.entries(byCountry).forEach(([code, arr]) => {
      const base = arr[0].center;
      arr.forEach((item, idx) => {
        const angle = ((idx * 40) % 360) * (Math.PI / 180);
        const ring = Math.floor(idx / 9) + 1;
        const r = 0.4 * ring;
        const dx = r * Math.cos(angle);
        const dy = r * Math.sin(angle);
        out.push({
          coordinates: [base[0] + dx, base[1] + dy],
          isFriend: item.isFriend,
          userName: userDisplayName(item.user),
          countryCode: code,
        });
      });
    });
    return out;
  }, [filtered, friendStatusByUser]);

  const countryAgg = useMemo(() => {
    const map = {};
    for (const u of filtered) {
      const code = resolveCountryCode(u).toLowerCase();
      const center = getCenterForISO2(code);
      if (!center) continue;
      const isFriend = (friendStatusByUser[u.id] || "").toLowerCase() === "friends";
      if (!map[code]) {
        map[code] = {
          code,
          center,
          users: [],
          friends: 0,
          label: displayCountry(u) || code.toUpperCase(),
        };
      }
      map[code].users.push(userDisplayName(u));
      if (isFriend) map[code].friends += 1;
    }
    return Object.values(map).map((e) => ({ ...e, total: e.users.length }));
  }, [filtered, friendStatusByUser]);

  const markers = liveMarkers;

  useEffect(() => {
    setPage(1);
  }, [q, tabValue, selectedCompanies, selectedCountries, selectedTitles]);


  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const startIdx = (page - 1) * ROWS_PER_PAGE;
  const current = filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);

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
      } catch { }
    })();
    return () => { alive = false; };
  }, [current.map((u) => u.id).join(",")]);

  const handleOpenProfile = (m) => {
    const id = m?.id;
    if (!id) return;
    navigate(`/community/rich-profile/${id}`, { state: { user: m } });
  };


  const zoomIn = () =>
    setMapPos((p) => ({ ...p, zoom: Math.min(MAX_ZOOM, +(p.zoom * ZOOM_STEP).toFixed(3)) }));
  const zoomOut = () =>
    setMapPos((p) => ({ ...p, zoom: Math.max(MIN_ZOOM, +(p.zoom / ZOOM_STEP).toFixed(3)) }));
  const resetView = () => setMapPos({ coordinates: [0, 0], zoom: MIN_ZOOM });

  /* -------------------------------- UI -------------------------------- */
  return (
    <>
      <Grid
        container
        spacing={hasSideMap ? 2 : 0}
        alignItems={hasSideMap ? "stretch" : "flex-start"}
      >
        {/* Left: Member list */}
        <Grid
          item
          xs={12}
          md={hasSideMap ? 5 : 12}
          lg={hasSideMap ? 7 : 12}
          xl={hasSideMap ? 7 : 12}
          sx={{ minWidth: 0, display: "flex" }}
        >
          <Box
            sx={{
              // 👇 Set width per device
              width: {
                xs: 410,  // 0–599px  → mobile
                sm: 740,     // 600–899px → tablet (includes 768px)
                md: "100%",  // 900px+    → desktop (use full grid width)
                // if you want, you can also add:
                // lg: 840,
                // xl: 960,
              },
              mx: "auto",        // center when width is a fixed number
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            {/* Header Paper */}
            <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Stack spacing={1.25}>
                {/* Title row */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {tabValue === 0 ? "All Members" : "My Contacts"} ({filtered.length})
                  </Typography>

                  {isCompact && (
                    <Tooltip title="View map">
                      <IconButton
                        size="small"
                        onClick={() => setMapOverlayOpen(true)}
                        sx={{ flexShrink: 0 }}
                      >
                        <MapRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                {/* Search bar - full width */}
                <TextField
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  size="small"
                  placeholder="Search by name, company, country..."
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Filters row: company / country / job title */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    width: "100%",
                    flexWrap: "wrap",
                    "& > *": {
                      minWidth: { xs: "100%", sm: 180 },
                      maxWidth: { xs: "100%", sm: 260 },
                    },
                  }}
                >
                  {/* Company filter */}
                  <TextField
                    size="small"
                    select
                    label="Company"
                    value={selectedCompanies}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedCompanies(
                        typeof value === "string" ? value.split(",") : value
                      );
                    }}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{
                      multiple: true,
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected || selected.length === 0) {
                          return "All companies";
                        }
                        return selected.join(", ");
                      },
                    }}
                  >
                    {companyOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={selectedCompanies.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Country filter */}
                  <TextField
                    size="small"
                    select
                    label="Country"
                    value={selectedCountries}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedCountries(
                        typeof value === "string" ? value.split(",") : value
                      );
                    }}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{
                      multiple: true,
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected || selected.length === 0) {
                          return "All countries";
                        }
                        return selected.join(", ");
                      },
                    }}
                  >
                    {countryOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={selectedCountries.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Job title filter */}
                  <TextField
                    size="small"
                    select
                    label="Job title"
                    value={selectedTitles}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTitles(
                        typeof value === "string" ? value.split(",") : value
                      );
                    }}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{
                      multiple: true,
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected || selected.length === 0) {
                          return "All job titles";
                        }
                        return selected.join(", ");
                      },
                    }}
                  >
                    {titleOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={selectedTitles.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </TextField>

                </Stack>

                {/* Tabs row */}
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  textColor="primary"
                  indicatorColor="primary"
                  variant="standard"
                  sx={{
                    minHeight: 40,
                    borderBottom: `1px solid ${BORDER}`,
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontWeight: 600,
                      minHeight: 40,
                      px: 2,
                    },
                  }}
                >
                  <Tab label="All Members" />
                  <Tab label="My Contacts" />
                </Tabs>
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
                  spacing={1.25}
                  alignItems="stretch"
                  sx={{
                    flex: 1,
                    width: "100%",
                    "& > *": {
                      width: "100% !important",
                      maxWidth: "100% !important",
                    },
                  }}
                >
                  {current.map((u) => (
                    <MemberCard
                      key={u.id}
                      u={u}
                      friendStatus={friendStatusByUser[u.id]}
                      onOpenProfile={handleOpenProfile}
                      onAddFriend={() => sendFriendRequest(u.id)}
                    />
                  ))}

                  {filtered.length === 0 && (
                    <Paper
                      sx={{
                        p: 4,
                        borderRadius: 3,
                        textAlign: "center",
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <Typography>
                        {tabValue === 1 && Object.keys(friendStatusByUser).length === 0
                          ? "No friends found."
                          : "No members match your search."}
                      </Typography>
                    </Paper>
                  )}
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Showing{" "}
                    {filtered.length === 0
                      ? "0"
                      : `${startIdx + 1}–${Math.min(
                        startIdx + ROWS_PER_PAGE,
                        filtered.length
                      )} of ${filtered.length}`}
                  </Typography>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                    size="small"
                  />
                </Stack>
              </>
            )}
          </Box>
        </Grid>

        {/* Right: map panel */}
        {hasSideMap && (
          <Grid
            item
            xs={12}
            md={7}
            lg={5}
            xl={5}
            sx={{
              minWidth: 0,
              display: "flex",
              // 👉 Fix map width to 600px on large screens (like 1440px)
              flexBasis: { lg: 600, xl: 600 },
              maxWidth: { lg: 600, xl: 600 },
            }}
          >
            <Paper
              sx={{
                p: 1.5,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                // ⬇️ REMOVE sticky + fixed viewport height
                // position: { md: "sticky" },
                // top: 88,
                // height: { xs: 520, md: "calc(100vh - 140px)" },
                width: "100%",                         // ⬅️ full width of grid cell
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Where {tabValue === 1 ? "friends" : "members"} are from
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showMap}
                        onChange={(_, v) => setShowMap(v)}
                        size="small"
                      />
                    }
                    label="Show map"
                  />
                </Stack>
              </Stack>

              {/* Legend */}
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: CURRENT_MAP_THEME.memberDot,
                        border: "1px solid #fff",
                      }}
                    />
                    <Typography variant="caption">Members</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: CURRENT_MAP_THEME.friendDot,
                        border: "1px solid #fff",
                      }}
                    />
                    <Typography variant="caption">My Contacts</Typography>
                  </Stack>
                </Stack>
              </Stack>

              <MembersLeafletMap
                markers={markers}
                countryAgg={countryAgg}
                showMap={showMap}
              />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* 🔹 Full-screen map overlay for mobile / tablet / 900px */}
      {isCompact && mapOverlayOpen && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Paper
            sx={{
              flex: 1,
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              p: 1.5,
              gap: 1,
            }}
          >
            {/* Top bar with back button */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <IconButton
                size="small"
                onClick={() => setMapOverlayOpen(false)}
              >
                <ArrowBackIosNewRoundedIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Members map
              </Typography>
            </Stack>

            {/* Header + legend (similar to desktop map) */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Where {tabValue === 1 ? "friends" : "members"} are from
              </Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showMap}
                      onChange={(_, v) => setShowMap(v)}
                      size="small"
                    />
                  }
                  label="Show map"
                />
              </Stack>
            </Stack>

            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: CURRENT_MAP_THEME.memberDot,
                      border: "1px solid #fff",
                    }}
                  />
                  <Typography variant="caption">Members</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: CURRENT_MAP_THEME.friendDot,
                      border: "1px solid #fff",
                    }}
                  />
                  <Typography variant="caption">Friends</Typography>
                </Stack>
              </Stack>
            </Stack>

            <MembersLeafletMap
              markers={markers}
              countryAgg={countryAgg}
              showMap={showMap}
              minHeight={360}
            />
          </Paper>
        </Box>
      )}
    </>
  );
}