// src/pages/community/MembersPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Grid,
  InputAdornment,
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
  Skeleton
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { geoCentroid } from "d3-geo";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
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
  AttributionControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";



/* --------------------- constants & helpers --------------------- */
const BORDER = "#e2e8f0";
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
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
const LINKEDIN_COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10000+",
];

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

function extractCityFromLocation(raw) {
  if (!raw) return "";
  const parts = String(raw)
    .split(/,|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  return parts[0];
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

function resolveCityName(user) {
  const direct =
    user?.profile?.location_city ||
    user?.profile?.city ||
    user?.city ||
    user?.location_city;
  if (direct) return String(direct).trim();
  const loc = user?.profile?.location || user?.location || "";
  return extractCityFromLocation(loc);
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

// ✅ HELPER: Industry
function getIndustryFromUser(u) {
  return (
    u?.industry_from_experience ||
    u?.profile?.industry ||
    u?.industry ||
    ""
  ).trim();
}

// ✅ HELPER: Company Size
function getCompanySizeFromUser(u) {
  return (
    u?.number_of_employees_from_experience ||
    u?.profile?.number_of_employees ||
    u?.number_of_employees ||
    ""
  ).trim();
}

// ✅ HELPER: Parse size for sorting (e.g. "11-50" -> 11, "5000+" -> 5000)
function getMinCompanySize(s) {
  if (!s) return 0;
  // Handle formats like "1-10", "5000+", "10,000+"
  const firstPart = s.split("-")[0]; // Take the part before dash
  const clean = firstPart.replace(/[^0-9]/g, ""); // Remove non-digits (like +, commas)
  return parseInt(clean, 10) || 0;
}

function formatCompanySizeLabel(size) {
  const raw = String(size || "").trim();
  if (!raw) return "";
  if (/employee/i.test(raw)) return raw;

  const nums = raw.match(/\d[\d,]*/g) || [];
  const hasPlus = /\+/.test(raw);
  const toNum = (v) => Number(String(v).replace(/,/g, ""));
  const fmt = (v) => toNum(v).toLocaleString("en-US");

  if (nums.length >= 2) {
    return `${fmt(nums[0])}-${fmt(nums[1])} employees`;
  }
  if (nums.length === 1 && hasPlus) {
    return `${fmt(nums[0])}+ employees`;
  }
  return raw;
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

  const rawKycStatus = (
    u?.profile?.kyc_status ||
    u?.kyc_status ||
    ""
  )
    .toString()
    .toLowerCase();

  const isVerified =
    rawKycStatus === "approved" || rawKycStatus === "verified";
  // --- NEW LOGIC START ---
  // 1. Get raw values to check if they actually exist (ignoring defaults)
  const rawCompany = (u?.company_from_experience || "").trim();
  const rawTitle = (
    u?.position_from_experience ||
    u?.profile?.job_title ||
    u?.job_title ||
    ""
  ).trim();

  // 2. Check if we have data to show
  const hasWorkInfo = rawCompany.length > 0 || rawTitle.length > 0;

  // 3. Set display values (if hidden, these serve as placeholders to maintain height)
  const displayCompany = rawCompany || "—";
  const displayTitle = rawTitle || "—";
  // --- NEW LOGIC END ---

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

            {isVerified && (
              <Tooltip title="KYC verified">
                <VerifiedRoundedIcon
                  sx={{ fontSize: 18, color: "success.main", flexShrink: 0 }}
                />
              </Tooltip>
            )}

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

          {/* --- UPDATED TYPOGRAPHY START --- */}
          {/* We use visibility: hidden so the height remains the same even if data is missing */}
          <Typography
            variant="body2"
            sx={{
              mt: 0.25,
              visibility: hasWorkInfo ? "visible" : "hidden"
            }}
            noWrap
          >
            {displayCompany} • <span style={{ color: "#64748b" }}>{displayTitle}</span>
          </Typography>
          {/* --- UPDATED TYPOGRAPHY END --- */}

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

function MembersLeafletMap({ markers, countryAgg, showMap, minHeight = 580, onOpenProfile }) {
  const hasMarkers = markers && markers.length > 0;
  const SHOW_INDIVIDUAL_DOTS = true;
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

  // 🔥 Heatmap layer using leaflet.heat
  function MembersHeatLayer({ markers }) {
    const map = useMap();

    React.useEffect(() => {
      if (!map || !markers || markers.length === 0) return;

      // Convert your markers -> [lat, lng, intensity]
      const points = markers.map((m) => {
        const [lng, lat] = m.coordinates;
        // base intensity: friends slightly “hotter”
        const base = m.isFriend ? 0.9 : 0.6;
        return [lat, lng, base];
      });

      const heat = L.heatLayer(points, {
        radius: 38,      // size of each hotspot
        blur: 32,        // softness of edges
        maxZoom: 7,
        minOpacity: 0.25,
        // Snapchat-style gradient: green → yellow → orange → red
        gradient: {
          0.2: "#4ade80", // light green
          0.4: "#a3e635", // yellow-green
          0.6: "#facc15", // yellow
          0.8: "#f97316", // orange
          1.0: "#dc2626", // red
        },
      }).addTo(map);

      // cleanup when markers change / component unmounts
      return () => {
        map.removeLayer(heat);
      };
    }, [map, markers]);

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
          attributionControl={false}
        >
          {/* Auto-adjust view when search/filter changes */}
          <AutoZoom markers={markers} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {/* 🔥 Snapchat-style heatmap zone */}
          <MembersHeatLayer markers={markers} />

          {/* Country-level circles with counts (big soft markers) */}
          {countryAgg.map((c) => {
            const [lng, lat] = c.center;

            // 🔥 1) Radius grows with number of people
            const baseRadius = 8;                    // minimum size
            const extra = Math.min(24, c.total * 1.5); // more members → bigger
            const radius = baseRadius + extra;

            // 🔥 2) Intensity 0–1 based on count
            const intensity = Math.min(1, c.total / 20); // 0..1

            return (
              <CircleMarker
                key={c.code}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color: "transparent",
                  weight: 0,
                  fillColor: "transparent",
                  fillOpacity: 0,
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -4]}>
                  <Box sx={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>{c.label}</div>
                    <div>
                      {c.total} people
                      {c.friends ? ` • ${c.friends} My Contacts` : ""}
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

          {/* Individual member dots (disabled for Snapchat-style heatmap) */}
          {SHOW_INDIVIDUAL_DOTS &&
            markers.map((m, i) => {
              const [lng, lat] = m.coordinates;
              return (
                <CircleMarker
                  key={i}
                  center={[lat, lng]}
                  radius={3}
                  eventHandlers={{
                    click: () => onOpenProfile?.(m.user),
                  }}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 1,
                    fillColor: m.isFriend
                      ? CURRENT_MAP_THEME.friendDot
                      : CURRENT_MAP_THEME.memberDot,
                    fillOpacity: 1,
                  }}
                >
                  <LeafletTooltip direction="top" offset={[0, -4]} interactive>
                    <Box
                      sx={{ fontSize: 12, cursor: "pointer" }}
                      onClick={() => onOpenProfile?.(m.user)}
                    >
                      <div style={{ fontWeight: 600 }}>{m.userName}</div>
                      <div style={{ opacity: 0.85 }}>
                        {m.isFriend ? "My Contact" : "Member"}
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
  const cityCentersRef = useRef({});
  const [cityCenters, setCityCenters] = useState({});

  // state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);

  // ✅ 1. NEW STATES
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedCompanySizes, setSelectedCompanySizes] = useState([]);

  // ✅ 2. GLOBAL OPTIONS STATE
  const [globalOptions, setGlobalOptions] = useState({
    companies: [],
    titles: [],
    industries: [],
    sizes: [],
    countries: [],
  });


  const [tabValue, setTabValue] = useState(0);

  // map controls
  const [showMap, setShowMap] = useState(true);
  const [mapPos, setMapPos] = useState({ coordinates: [0, 0], zoom: 1 });

  const hasSideMap = true;

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

  // ✅ 3. LOAD GLOBAL FILTER OPTIONS
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/filters/`, {
          headers: tokenHeader(),
        });
        if (!res.ok) return;
        const data = await res.json();

        if (!alive) return;

        // Extract clean country names from location strings
        const countrySet = new Set();
        (data.locations || []).forEach((loc) => {
          const c = extractCountryFromLocation(loc);
          if (c) countrySet.add(c);
        });
        const sortedCountries = Array.from(countrySet).sort((a, b) =>
          a.localeCompare(b)
        );

        // ✅ Sort company sizes numerically (Small -> Large), and ensure LinkedIn-style ranges exist
        const sizeSet = new Set([...(data.sizes || []), ...LINKEDIN_COMPANY_SIZES]);
        const sortedSizes = Array.from(sizeSet).sort(
          (a, b) => getMinCompanySize(a) - getMinCompanySize(b)
        );

        setGlobalOptions({
          companies: data.companies || [],
          titles: data.titles || [],
          industries: data.industries || [],
          sizes: sortedSizes, // Uses new numeric sort
          countries: sortedCountries,
        });
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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


  const filtered = useMemo(() => {
    let sourceList = users;

    // Tab filter (All Members / My Contacts)
    if (tabValue === 1) {
      sourceList = users.filter((u) => {
        const status = (friendStatusByUser[u.id] || "").toLowerCase();
        return status === "friends";
      });
    }

    // Company filter
    if (selectedCompanies.length) {
      sourceList = sourceList.filter((u) =>
        selectedCompanies.includes(getCompanyFromUser(u))
      );
    }

    // Country filter
    if (selectedCountries.length) {
      sourceList = sourceList.filter((u) =>
        selectedCountries.includes(getCountryFromUser(u))
      );
    }

    // Job title filter
    if (selectedTitles.length) {
      sourceList = sourceList.filter((u) =>
        selectedTitles.includes(getJobTitleFromUser(u))
      );
    }

    // ✅ 4. FILTER BY INDUSTRY & SIZE
    if (selectedIndustries.length) {
      sourceList = sourceList.filter((u) => selectedIndustries.includes(getIndustryFromUser(u)));
    }

    if (selectedCompanySizes.length) {
      sourceList = sourceList.filter((u) => selectedCompanySizes.includes(getCompanySizeFromUser(u)));
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

      // ✅ Add Industry to text search haystack
      const ind = getIndustryFromUser(u).toLowerCase();

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
        ind, // Added
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
    selectedIndustries,   // Added
    selectedCompanySizes, // Added
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

  const cityKeyEntries = useMemo(() => {
    const map = new Map();
    for (const u of filtered) {
      const city = resolveCityName(u);
      if (!city) continue;
      const code = resolveCountryCode(u);
      const key = `${String(city).trim().toLowerCase()}|${String(code || "").trim().toUpperCase()}`;
      if (!map.has(key)) map.set(key, { city, countryCode: code });
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [filtered]);

  useEffect(() => {
    let alive = true;
    const missing = cityKeyEntries.filter(
      (e) => !Object.prototype.hasOwnProperty.call(cityCentersRef.current, e.key)
    );
    if (!missing.length) return () => { };

    const MAX_CITY_LOOKUPS = 60;
    const batch = missing.slice(0, MAX_CITY_LOOKUPS);

    (async () => {
      const updates = {};
      await Promise.all(
        batch.map(async ({ key, city, countryCode }) => {
          try {
            const url = `${API_BASE}/auth/cities/search/?q=${encodeURIComponent(city)}&limit=1${countryCode ? `&country=${encodeURIComponent(countryCode)}` : ""
              }`;
            const res = await fetch(url, { headers: tokenHeader() });
            if (!res.ok) { updates[key] = null; return; }
            const data = await res.json();
            const hit = (data?.results || [])[0];
            if (hit?.lat != null && hit?.lng != null) {
              updates[key] = [hit.lng, hit.lat];
            } else {
              updates[key] = null;
            }
          } catch {
            updates[key] = null;
          }
        })
      );
      if (!alive) return;
      if (Object.keys(updates).length) {
        Object.assign(cityCentersRef.current, updates);
        setCityCenters((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => { alive = false; };
  }, [cityKeyEntries]);

  const liveMarkers = useMemo(() => {
    const byCity = {};
    for (const u of filtered) {
      const code = resolveCountryCode(u).toLowerCase();
      const city = resolveCityName(u);
      const key = city
        ? `${String(city).trim().toLowerCase()}|${String(code || "").trim().toUpperCase()}`
        : "";
      const center = (key && cityCenters[key]) || getCenterForISO2(code);
      if (!center) continue;
      const isFriend = (friendStatusByUser[u.id] || "").toLowerCase() === "friends";
      const bucket = key || code;
      if (!byCity[bucket]) byCity[bucket] = [];
      byCity[bucket].push({ center, isFriend, user: u });
    }
    const out = [];
    Object.entries(byCity).forEach(([code, arr]) => {
      const base = arr[0].center;
      // If only one person is in this city/country, put them EXACTLY at the center
      if (arr.length === 1) {
        out.push({
          coordinates: base,
          isFriend: arr[0].isFriend,
          userName: userDisplayName(arr[0].user),
          countryCode: code,
          user: arr[0].user,
        });
        return;
      }

      arr.forEach((item, idx) => {
        const angle = ((idx * 40) % 360) * (Math.PI / 180);
        const ring = Math.floor(idx / 9) + 1;
        const r = 0.03 * ring;
        const dx = r * Math.cos(angle);
        const dy = r * Math.sin(angle);
        out.push({
          coordinates: [base[0] + dx, base[1] + dy],
          isFriend: item.isFriend,
          userName: userDisplayName(item.user),
          countryCode: code,
          user: item.user,
        });
      });
    });
    return out;
  }, [filtered, friendStatusByUser, cityCenters, getCenterForISO2]);

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
  }, [q, tabValue, selectedCompanies, selectedCountries, selectedTitles, selectedIndustries, selectedCompanySizes]); // ✅ Added deps


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
  /* -------------------------------- UI -------------------------------- */
  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        {/* LEFT: members list + filters (50%) */}
        <Box
          sx={{
            flexBasis: { xs: "100%", md: "50%" },
            maxWidth: { xs: "100%", md: "50%" },
            minWidth: 0,
            display: "flex",
          }}
        >
          <Box
            sx={{
              width: "100%",
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            {/* Header Paper */}
            <Paper
              sx={{
                p: 1.5,
                mb: 1.5,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
              }}
            >
              <Stack spacing={1.25}>
                {/* Title row */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {tabValue === 0 ? "All Members" : "My Contacts"} (
                    {filtered.length})
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
                  placeholder="Search by name, company, region..."
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Filters row: top = company/country/job title, bottom = industry/company size */}
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {/* Row 1: Company, Country, Job title */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    {/* Company */}
                    <Autocomplete
                      multiple
                      fullWidth
                      size="small"
                      options={globalOptions.companies}
                      value={selectedCompanies}
                      onChange={(_, newValue) => setSelectedCompanies(newValue)}
                      filterSelectedOptions
                      disableCloseOnSelect
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Company"
                          placeholder={selectedCompanies.length ? "" : "All companies"}
                        />
                      )}
                      sx={{ flex: 1 }}
                    />

                    {/* Region */}
                    <Autocomplete
                      multiple
                      fullWidth
                      size="small"
                      options={globalOptions.countries}
                      value={selectedCountries}
                      onChange={(_, newValue) => setSelectedCountries(newValue)}
                      filterSelectedOptions
                      disableCloseOnSelect
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Region"
                          placeholder={selectedCountries.length ? "" : "All regions"}
                        />
                      )}
                      sx={{ flex: 1 }}
                    />

                    {/* Job title */}
                    <Autocomplete
                      multiple
                      fullWidth
                      size="small"
                      options={globalOptions.titles}
                      value={selectedTitles}
                      onChange={(_, newValue) => setSelectedTitles(newValue)}
                      filterSelectedOptions
                      disableCloseOnSelect
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Job title"
                          placeholder={selectedTitles.length ? "" : "All job titles"}
                        />
                      )}
                      sx={{ flex: 1 }}
                    />
                  </Stack>

                  {/* Row 2: Industry, Company size */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    {/* Industry */}
                    <TextField
                      size="small"
                      select
                      fullWidth
                      label="Industry"
                      value={selectedIndustries}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedIndustries(
                          typeof value === "string" ? value.split(",") : value
                        );
                      }}
                      InputLabelProps={{ shrink: true }}
                      SelectProps={{
                        multiple: true,
                        displayEmpty: true,
                        renderValue: (selected) => {
                          if (!selected || selected.length === 0) return "All industries";
                          return selected.join(", ");
                        },
                      }}
                      sx={{ flex: 1 }}
                    >
                      {globalOptions.industries.map((name) => (
                        <MenuItem key={name} value={name}>
                          <Checkbox checked={selectedIndustries.indexOf(name) > -1} />
                          <ListItemText primary={name} />
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Company size */}
                    <TextField
                      size="small"
                      select
                      fullWidth
                      label="Company Size"
                      value={selectedCompanySizes}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedCompanySizes(
                          typeof value === "string" ? value.split(",") : value
                        );
                      }}
                      InputLabelProps={{ shrink: true }}
                      SelectProps={{
                        multiple: true,
                        displayEmpty: true,
                        renderValue: (selected) => {
                          if (!selected || selected.length === 0) return "All sizes";
                          return selected.map((s) => formatCompanySizeLabel(s)).join(", ");
                        },
                      }}
                      sx={{ flex: 1 }}
                    >
                      {globalOptions.sizes.map((name) => (
                        <MenuItem key={name} value={name}>
                          <Checkbox checked={selectedCompanySizes.indexOf(name) > -1} />
                          <ListItemText primary={formatCompanySizeLabel(name)} />
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Box>



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

            {/* 🔄 Loading state with skeletons */}
            {loading && (
              <>
                {/* Skeleton list */}
                <Stack
                  spacing={1.25}
                  alignItems="stretch"
                  sx={{
                    mt: 2,
                    flex: 1,
                    width: "100%",
                    "& > *": {
                      width: "100% !important",
                      maxWidth: "100% !important",
                    },
                  }}
                >
                  {Array.from({ length: ROWS_PER_PAGE }).map((_, idx) => (
                    <Paper
                      key={idx}
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${BORDER}`,
                        p: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Skeleton variant="circular" width={44} height={44} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Skeleton width="40%" height={20} />
                          <Skeleton width="60%" height={16} sx={{ mt: 0.5 }} />
                          <Skeleton width="55%" height={16} sx={{ mt: 0.5 }} />
                        </Box>
                        <Skeleton
                          variant="rectangular"
                          width={120}
                          height={32}
                          sx={{ borderRadius: 2 }}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                {/* Skeleton for pagination row */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mt: 2 }}
                >
                  <Skeleton width={160} height={20} />
                  <Skeleton width={220} height={32} />
                </Stack>
              </>
            )}

            {/* ❌ Error state */}
            {!loading && error && (
              <Paper
                sx={{
                  p: 2,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 3,
                }}
              >
                <Typography color="error">⚠️ {error}</Typography>
              </Paper>
            )}

            {/* ✅ Loaded state (existing logic unchanged) */}
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
                        {tabValue === 1 &&
                          Object.keys(friendStatusByUser).length === 0
                          ? "No My Contacts found."
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
        </Box>

        {/* RIGHT: map panel (50%) – hidden on small screens */}
        {hasSideMap && (
          <Box
            sx={{
              flexBasis: { xs: "100%", md: "50%" },
              maxWidth: { xs: "100%", md: "50%" },
              minWidth: 0,
              display: { xs: "none", md: "flex" },
            }}
          >
            <Paper
              sx={{
                p: 1.5,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                position: { md: "sticky" },
                top: 88,
                height: { xs: 520, md: "calc(100vh - 140px)" },
                width: "100%",
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
                  Where {tabValue === 1 ? "My Contacts" : "members"} are from
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
                onOpenProfile={handleOpenProfile}
              />
            </Paper>
          </Box>
        )}
      </Box>

      {/* Full-screen map overlay for mobile / tablet */}
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
            {/* Top bar */}
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

            {/* Header + legend */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Where {tabValue === 1 ? "My Contacts" : "members"} are from
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
                      border: "1px solid #fff",    // ✅ fixed
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
                  <Typography variant="caption">My Contact</Typography>
                </Stack>
              </Stack>
            </Stack>

            <MembersLeafletMap
              markers={markers}
              countryAgg={countryAgg}
              showMap={showMap}
              minHeight={360}
              onOpenProfile={handleOpenProfile}
            />
          </Paper>
        </Box>
      )}
    </>
  );

}
