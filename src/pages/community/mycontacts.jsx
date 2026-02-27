import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Avatar,
    Box,
    InputAdornment,
    Pagination,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Button,
    IconButton,
    Checkbox,
    MenuItem,
    ListItemText,
    Skeleton,
    Grid,
    Chip,
    useMediaQuery,
    FormControlLabel,
    Switch,
    Snackbar,
    Alert,
    Tabs,
    Tab
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import { isAdminUser } from "../../utils/adminRole";
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
    useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

/* --------------------- constants & helpers --------------------- */
const BORDER = "#e2e8f0";
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

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
    const parts = String(raw).split(/,|\n/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return "";
    const last = parts[parts.length - 1].replace(/[-–].*$/, "").trim();
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

function displayCountry(user) {
    const direct = user?.profile?.country || user?.country || user?.location_country || user?.profile?.location_country;
    if (direct) return extractCountryFromLocation(direct) || direct;
    const loc = user?.profile?.location || user?.location;
    return extractCountryFromLocation(loc) || "";
}

function getCompanyFromUser(u) { return (u?.company_from_experience || "").trim(); }
function getJobTitleFromUser(u) {
    return (u?.position_from_experience || u?.profile?.job_title || u?.job_title || "").trim();
}
function getCountryFromUser(u) { return (displayCountry(u) || "").trim(); }
function getIndustryFromUser(u) {
    return (u?.industry_from_experience || u?.profile?.industry || u?.industry || "").trim();
}
function getCompanySizeFromUser(u) {
    return (u?.number_of_employees_from_experience || u?.profile?.number_of_employees || u?.number_of_employees || "").trim();
}
function getMinCompanySize(s) {
    if (!s) return 0;
    const firstPart = s.split("-")[0];
    const clean = firstPart.replace(/[^0-9]/g, "");
    return parseInt(clean, 10) || 0;
}

function formatCompanySizeLabel(size) {
    const raw = String(size || "").trim();
    if (!raw || /employee/i.test(raw)) return raw;
    const nums = raw.match(/\d[\d,]*/g) || [];
    const hasPlus = /\+/.test(raw);
    const toNum = (v) => Number(String(v).replace(/,/g, ""));
    const fmt = (v) => toNum(v).toLocaleString("en-US");
    if (nums.length >= 2) return `${fmt(nums[0])}-${fmt(nums[1])} employees`;
    if (nums.length === 1 && hasPlus) return `${fmt(nums[0])}+ employees`;
    return raw;
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
    earth: {
        landPalette: [
            "#c8e6c9", "#a5d6a7", "#81c784", "#e6ce9a", "#d7ccc8",
            "#c5e1a5", "#aed581", "#ffecb3", "#b2dfdb", "#ffe0b2",
        ],
        landStroke: "#8fa8c3",
        memberDot: "#e53935",
        friendDot: "#1e88e5",
        ocean: "#b3d9ff",
    }
};

const CURRENT_MAP_THEME = MAP_THEMES.earth;
const PALETTE = CURRENT_MAP_THEME.landPalette;

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

const userDisplayName = (u) => {
    return (
        u?.profile?.full_name ||
        `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
        u?.username ||
        "Member"
    );
};

/* -------------------------- Map Component -------------------------- */
function MembersLeafletMap({ markers, countryAgg, showMap, minHeight = 580, onOpenProfile }) {
    const hasMarkers = markers && markers.length > 0;
    const SHOW_INDIVIDUAL_DOTS = true;

    function AutoZoom({ markers }) {
        const map = useMap();
        React.useEffect(() => {
            if (!markers || markers.length === 0) return;
            if (markers.length === 1) {
                const [lng, lat] = markers[0].coordinates;
                map.flyTo([lat, lng], 12, { duration: 0.8 });
                return;
            }
            const latLngs = markers.map((m) => {
                const [lng, lat] = m.coordinates;
                return [lat, lng];
            });
            const bounds = L.latLngBounds(latLngs);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        }, [markers, map]);
        return null;
    }

    function MembersHeatLayer({ markers }) {
        const map = useMap();
        React.useEffect(() => {
            if (!map || !markers || markers.length === 0) return;
            const points = markers.map((m) => {
                const [lng, lat] = m.coordinates;
                const base = m.isFriend ? 0.9 : 0.6;
                return [lat, lng, base];
            });
            const heat = L.heatLayer(points, {
                radius: 38,
                blur: 32,
                maxZoom: 18,
                minOpacity: 0.25,
                gradient: {
                    0.2: "#4ade80", 0.4: "#a3e635", 0.6: "#facc15", 0.8: "#f97316", 1.0: "#dc2626",
                },
            }).addTo(map);
            return () => { map.removeLayer(heat); };
        }, [map, markers]);
        return null;
    }

    let center = [20, 0];
    if (hasMarkers) {
        let sumLat = 0, sumLng = 0;
        markers.forEach((m) => {
            const [lng, lat] = m.coordinates;
            sumLat += lat; sumLng += lng;
        });
        center = [sumLat / markers.length, sumLng / markers.length];
    }

    return (
        <Box sx={{ position: "relative", flex: 1, minHeight, borderRadius: 3, overflow: "hidden" }}>
            {showMap && hasMarkers ? (
                <MapContainer center={center} zoom={3} minZoom={2} maxZoom={18} style={{ width: "100%", height: "100%" }} scrollWheelZoom worldCopyJump attributionControl={false}>
                    <AutoZoom markers={markers} />
                    <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    <MembersHeatLayer markers={markers} />
                    {countryAgg.map((c) => {
                        const [lng, lat] = c.center;
                        const baseRadius = 8;
                        const extra = Math.min(24, c.total * 1.5);
                        const radius = baseRadius + extra;
                        return (
                            <CircleMarker key={c.code} center={[lat, lng]} radius={radius} pathOptions={{ color: "transparent", weight: 0, fillColor: "transparent", fillOpacity: 0 }}>
                                <LeafletTooltip direction="top" offset={[0, -4]}>
                                    <Box sx={{ fontSize: 12 }}>
                                        <div style={{ fontWeight: 700 }}>{c.label}</div>
                                        <div>{c.total} people{c.friends ? ` • ${c.friends} My Contacts` : ""}</div>
                                        <div style={{ marginTop: 4, opacity: 0.9 }}>{c.users.slice(0, 6).join(", ")}{c.total > 6 ? ` +${c.total - 6} more` : ""}</div>
                                    </Box>
                                </LeafletTooltip>
                            </CircleMarker>
                        );
                    })}
                    {SHOW_INDIVIDUAL_DOTS && markers.map((m, i) => {
                        const [lng, lat] = m.coordinates;
                        const isVerified = m.user?.profile?.kyc_status === "approved" || m.user?.kyc_status === "approved";
                        return (
                            <CircleMarker key={i} center={[lat, lng]} radius={3} eventHandlers={{ click: () => onOpenProfile?.(m.user) }} pathOptions={{ color: "#ffffff", weight: 1, fillColor: m.isFriend ? CURRENT_MAP_THEME.friendDot : CURRENT_MAP_THEME.memberDot, fillOpacity: 1 }}>
                                <LeafletTooltip direction="top" offset={[0, -4]} interactive>
                                    <Box sx={{ fontSize: 12, cursor: "pointer" }} onClick={() => onOpenProfile?.(m.user)}>
                                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                                            {m.userName}
                                            {isVerified && <VerifiedIcon sx={{ fontSize: 14, color: "#22d3ee" }} />}
                                        </div>
                                        <div style={{ opacity: 0.85 }}>{m.isFriend ? "My Contact" : "Member"}</div>
                                    </Box>
                                </LeafletTooltip>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", color: "text.secondary" }}><Typography>Map hidden.</Typography></Stack>
            )}
        </Box>
    );
}

/* -------------------------- Member card -------------------------- */
const MemberCard = ({ u, friendStatus, onOpenProfile, onAddFriend, currentUserId, viewerIsStaff }) => {
    const name = u?.profile?.full_name || `${u?.first_name || ""} ${u?.last_name || ""}`.trim() || u?.username || "Unknown User";
    const title = getJobTitleFromUser(u);
    const company = getCompanyFromUser(u);
    const country = getCountryFromUser(u);
    const industry = getIndustryFromUser(u);

    const isMe = currentUserId && String(u.id) === String(currentUserId);
    const isFriend = friendStatus === "friends";

    return (
        <Paper
            onClick={() => onOpenProfile(u)}
            sx={{
                p: 1.5,
                borderRadius: 3,
                border: `1px solid ${BORDER}`,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={u.profile?.user_image_url || u.user_image_url || u.avatar_url || u.avatar || u.user_image} sx={{ width: 44, height: 44 }}>
                    {name[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, noWrap: true }}>{name}</Typography>
                        {u.profile?.kyc_status === "approved" && <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {title}{company && ` at ${company}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {industry}{country && ` • ${country}`}
                    </Typography>
                </Box>

                {!isMe && !isFriend && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); onAddFriend(u.id); }}
                        startIcon={<PersonAddAlt1RoundedIcon fontSize="small" />}
                        sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.75rem" }}
                    >
                        Add
                    </Button>
                )}
                {isFriend && (
                    <Chip label="Contact" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                )}
            </Stack>
        </Paper>
    );
};

const RequestCard = ({ req, type, onOpenProfile, onAccept, onDecline, onCancel }) => {
    // type: "sent" | "received"
    const u = type === "sent" ? req.to_user : req.from_user;
    if (!u) return null;

    const name = u?.profile?.full_name || `${u?.first_name || ""} ${u?.last_name || ""}`.trim() || u?.username || "Unknown User";
    const title = getJobTitleFromUser(u);
    const company = getCompanyFromUser(u);
    const country = getCountryFromUser(u);
    const industry = getIndustryFromUser(u);

    return (
        <Paper
            onClick={() => onOpenProfile(u)}
            sx={{
                p: 1.5,
                borderRadius: 3,
                border: `1px solid ${BORDER}`,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Avatar src={u.profile?.user_image_url || u.user_image_url || u.avatar_url || u.avatar || u.user_image} sx={{ width: 44, height: 44 }}>
                    {name[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, noWrap: true }}>{name}</Typography>
                        {u.profile?.kyc_status === "approved" && <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {title}{company && ` at ${company}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {industry}{country && ` • ${country}`}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, sm: 0 }, ml: { xs: 0, sm: "auto" } }}>
                    {type === "sent" ? (
                        <>
                            <Chip size="small" icon={<HourglassBottomRoundedIcon sx={{ fontSize: 16 }} />} label="Pending" sx={{ bgcolor: "#F5F5F5", color: "#616161", mr: 1 }} />
                            <Button size="small" variant="outlined" color="error" onClick={(e) => { e.stopPropagation(); onCancel(req.id); }} startIcon={<HighlightOffIcon />}>Cancel request</Button>
                        </>
                    ) : (
                        <>
                            <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); onAccept(req.id); }} startIcon={<CheckCircleOutlineIcon />}>Accept</Button>
                            <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); onDecline(req.id); }} startIcon={<HighlightOffIcon />}>Decline</Button>
                        </>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
};

const MemberCardSkeleton = () => (
    <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: `1px solid ${BORDER}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
            <Skeleton variant="circular" width={44} height={44} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="40%" height={24} />
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="50%" height={16} />
            </Box>
            <Skeleton variant="rounded" width={60} height={30} sx={{ borderRadius: 2 }} />
        </Stack>
    </Paper>
);

const RequestCardSkeleton = () => (
    <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: `1px solid ${BORDER}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Skeleton variant="circular" width={44} height={44} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
                <Skeleton variant="text" width="40%" height={24} />
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="50%" height={16} />
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, sm: 0 }, ml: { xs: 0, sm: "auto" } }}>
                <Skeleton variant="rounded" width={80} height={30} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rounded" width={80} height={30} sx={{ borderRadius: 2 }} />
            </Stack>
        </Stack>
    </Paper>
);

/* ------------------------------ Page Component ------------------------------ */
export default function MyContacts() {
    const navigate = useNavigate();
    const isCompact = useMediaQuery("(max-width:900px)");
    const [mapOverlayOpen, setMapOverlayOpen] = useState(false);
    const getCenterForISO2 = useCountryCentroids("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
    const cityCentersRef = useRef({});
    const [cityCenters, setCityCenters] = useState({});
    const [showMap, setShowMap] = useState(true);

    const [tabIndex, setTabIndex] = useState(0); // 0 = Contacts, 1 = Sent, 2 = Received
    const [sentRequests, setSentRequests] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const ROWS_PER_PAGE = 10;

    const [globalOptions, setGlobalOptions] = useState({
        companies: [],
        titles: [],
        industries: [],
        sizes: [],
        countries: [],
    });

    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [selectedTitles, setSelectedTitles] = useState([]);
    const [selectedIndustries, setSelectedIndustries] = useState([]);
    const [selectedCompanySizes, setSelectedCompanySizes] = useState([]);

    const [friendStatusByUser, setFriendStatusByUser] = useState({});
    const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

    const me = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    }, []);

    const viewerIsStaff = isAdminUser();

    async function fetchFriendStatus(id) {
        const r = await fetch(`${API_BASE}/friends/status/?user_id=${id}`, { headers: tokenHeader(), credentials: "include" });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.detail || `Failed status for ${id}`);
        return normalizeFriendStatus(d?.status || d?.friendship || "none");
    }

    async function sendFriendRequest(id) {
        try {
            const r = await fetch(`${API_BASE}/friend-requests/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json", ...tokenHeader() },
                credentials: "include",
                body: JSON.stringify({ to_user: Number(id) }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok && r.status !== 200 && r.status !== 201) {
                let msg = d?.detail || d?.non_field_errors?.[0];
                if (!msg && typeof d === "object") {
                    const firstKey = Object.keys(d)[0];
                    if (firstKey && Array.isArray(d[firstKey])) msg = d[firstKey][0];
                }
                throw new Error(msg || "Failed to send request");
            }
            setFriendStatusByUser((m) => ({ ...m, [id]: "pending_outgoing" }));
            setToast({ open: true, msg: "Contact request sent!", type: "success" });
        } catch (e) { setToast({ open: true, msg: e?.message || "Failed to send request", type: "error" }); }
    }

    async function cancelRequest(id) {
        try {
            const r = await fetch(`${API_BASE}/friend-requests/${id}/cancel/`, {
                method: "POST",
                headers: { ...tokenHeader(), Accept: "application/json" },
            });
            if (r.ok) {
                setSentRequests((prev) => prev.filter((req) => req.id !== id));
                setToast({ open: true, msg: "Request canceled", type: "success" });
            } else throw new Error();
        } catch { setToast({ open: true, msg: "Failed to cancel request", type: "error" }); }
    }

    async function acceptRequest(id) {
        try {
            const r = await fetch(`${API_BASE}/friend-requests/${id}/accept/`, {
                method: "POST",
                headers: { ...tokenHeader(), Accept: "application/json" },
            });
            if (r.ok) {
                setReceivedRequests((prev) => prev.filter((req) => req.id !== id));
                setToast({ open: true, msg: "Request accepted", type: "success" });
                // Optionally reload roster here if needed
                setTimeout(() => window.location.reload(), 1000);
            } else throw new Error();
        } catch { setToast({ open: true, msg: "Failed to accept request", type: "error" }); }
    }

    async function declineRequest(id) {
        try {
            const r = await fetch(`${API_BASE}/friend-requests/${id}/decline/`, {
                method: "POST",
                headers: { ...tokenHeader(), Accept: "application/json" },
            });
            if (r.ok) {
                setReceivedRequests((prev) => prev.filter((req) => req.id !== id));
                setToast({ open: true, msg: "Request declined", type: "success" });
            } else throw new Error();
        } catch { setToast({ open: true, msg: "Failed to decline request", type: "error" }); }
    }

    useEffect(() => {
        if (tabIndex === 0) return;
        const ctrl = new AbortController();
        (async () => {
            try {
                setLoadingRequests(true);
                const isSent = tabIndex === 1;
                const endpoint = isSent ? 'outgoing' : 'incoming';
                const res = await fetch(`${API_BASE}/friend-requests/?type=${endpoint}&status=pending`, {
                    headers: tokenHeader(),
                    signal: ctrl.signal,
                    credentials: "include",
                });
                const json = await res.json().catch(() => []);
                const list = Array.isArray(json) ? json : json?.results ?? [];
                if (isSent) setSentRequests(list);
                else setReceivedRequests(list);
            } catch (e) {
                if (e.name !== "AbortError") console.error(e);
            } finally { setLoadingRequests(false); }
        })();
        return () => ctrl.abort();
    }, [tabIndex, me?.id]);

    // Load Filter Options
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/users/filters/`, { headers: tokenHeader() });
                if (!res.ok) return;
                const data = await res.json();
                const countrySet = new Set();
                (data.locations || []).forEach((loc) => {
                    const c = extractCountryFromLocation(loc);
                    if (c) countrySet.add(c);
                });
                const sortedCountries = Array.from(countrySet).sort((a, b) => a.localeCompare(b));
                const sizeSet = new Set([...(data.sizes || []), ...LINKEDIN_COMPANY_SIZES]);
                const sortedSizes = Array.from(sizeSet).sort((a, b) => getMinCompanySize(a) - getMinCompanySize(b));

                setGlobalOptions({
                    companies: data.companies || [],
                    titles: data.titles || [],
                    industries: data.industries || [],
                    sizes: sortedSizes,
                    countries: sortedCountries,
                });
            } catch (e) { console.error("Failed to load filter options", e); }
        })();
    }, []);

    // Load Users (contacts only)
    useEffect(() => {
        const ctrl = new AbortController();
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE}/users/roster/`, {
                    headers: tokenHeader(),
                    signal: ctrl.signal,
                    credentials: "include",
                });
                const json = await res.json().catch(() => []);
                const list = Array.isArray(json) ? json : json?.results ?? [];
                setUsers((list || []).filter((u) => !u.is_superuser));
            } catch (e) {
                if (e.name !== "AbortError") {
                    console.error(e);
                    setError(e?.message || "Failed to load users");
                }
            } finally { setLoading(false); }
        })();
        return () => ctrl.abort();
    }, [me?.id]);

    // Bulk Load Friend Status
    useEffect(() => {
        let alive = true;
        const ids = users.map((u) => u.id).filter((id) => friendStatusByUser[id] === undefined).slice(0, 300);
        if (!ids.length) return;
        (async () => {
            try {
                const entries = await Promise.all(
                    ids.map(async (id) => {
                        try { const s = await fetchFriendStatus(id); return [id, s]; } catch { return [id, "none"]; }
                    })
                );
                if (alive) setFriendStatusByUser((m) => ({ ...m, ...Object.fromEntries(entries) }));
            } catch { }
        })();
        return () => { alive = false; };
    }, [users, friendStatusByUser]);

    const filtered = useMemo(() => {
        // Only friends
        let sourceList = users.filter((u) => (friendStatusByUser[u.id] || "").toLowerCase() === "friends");

        if (selectedCompanies.length) sourceList = sourceList.filter((u) => selectedCompanies.includes(getCompanyFromUser(u)));
        if (selectedCountries.length) sourceList = sourceList.filter((u) => selectedCountries.includes(getCountryFromUser(u)));
        if (selectedTitles.length) sourceList = sourceList.filter((u) => selectedTitles.includes(getJobTitleFromUser(u)));
        if (selectedIndustries.length) sourceList = sourceList.filter((u) => selectedIndustries.includes(getIndustryFromUser(u)));
        if (selectedCompanySizes.length) sourceList = sourceList.filter((u) => selectedCompanySizes.includes(getCompanySizeFromUser(u)));

        const s = (q || "").toLowerCase().trim();
        if (!s) return sourceList;

        return sourceList.filter((u) => {
            const fn = (u.first_name || "").toLowerCase();
            const ln = (u.last_name || "").toLowerCase();
            const em = (u.email || "").toLowerCase();
            const full = (u.profile?.full_name || "").toLowerCase();
            const company = (u.company_from_experience || "").toLowerCase();
            const title = getJobTitleFromUser(u).toLowerCase();
            const country = getCountryFromUser(u).toLowerCase();
            const industry = getIndustryFromUser(u).toLowerCase();
            const haystack = [fn, ln, full, em, company, title, country, industry];
            return haystack.some((v) => v && v.includes(s));
        });
    }, [users, q, friendStatusByUser, selectedCompanies, selectedCountries, selectedTitles, selectedIndustries, selectedCompanySizes]);

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
                        const url = `${API_BASE}/auth/cities/search/?q=${encodeURIComponent(city)}&limit=1${countryCode ? `&country=${encodeURIComponent(countryCode)}` : ""}`;
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
            const isFriend = true; // All are friends in My Contacts
            const bucket = key || code;
            if (!byCity[bucket]) byCity[bucket] = [];
            byCity[bucket].push({ center, isFriend, user: u });
        }
        const out = [];
        Object.entries(byCity).forEach(([code, arr]) => {
            const base = arr[0].center;
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
    }, [filtered, cityCenters, getCenterForISO2]);

    const countryAgg = useMemo(() => {
        const map = {};
        for (const u of filtered) {
            const code = resolveCountryCode(u).toLowerCase();
            const center = getCenterForISO2(code);
            if (!center) continue;
            const isFriend = true; // All are friends here
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
    }, [filtered]);

    const markers = liveMarkers;
    const hasSideMap = true;

    const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const startIdx = (page - 1) * ROWS_PER_PAGE;
    const current = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const handleOpenProfile = (m) => {
        if (me?.id && String(me.id) === String(m.id)) navigate("/account/profile");
        else navigate(`/community/rich-profile/${m.id}`, { state: { user: m } });
    };

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
                {/* LEFT: contacts list + filters (50%) */}
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
                        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                            <Stack spacing={1.25}>
                                {/* Title row */}
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                                >
                                    <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto">
                                        <Tab label={`My Contacts ${tabIndex === 0 ? `(${filtered.length})` : ''}`} sx={{ fontWeight: 600, textTransform: 'none' }} />
                                        <Tab label={`Requests Sent ${tabIndex === 1 && sentRequests.length ? `(${sentRequests.length})` : ''}`} sx={{ fontWeight: 600, textTransform: 'none' }} />
                                        <Tab label={`Requests Received ${tabIndex === 2 && receivedRequests.length ? `(${receivedRequests.length})` : ''}`} sx={{ fontWeight: 600, textTransform: 'none' }} />
                                    </Tabs>

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

                                {tabIndex === 0 && (
                                    <>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Search contacts..."
                                            value={q}
                                            onChange={(e) => { setQ(e.target.value); setPage(1); }}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                        />

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
                                                    onChange={(_, v) => { setSelectedCompanies(v); setPage(1); }}
                                                    filterSelectedOptions
                                                    disableCloseOnSelect
                                                    renderInput={(p) => (
                                                        <TextField
                                                            {...p}
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
                                                    onChange={(_, v) => { setSelectedCountries(v); setPage(1); }}
                                                    filterSelectedOptions
                                                    disableCloseOnSelect
                                                    renderInput={(p) => (
                                                        <TextField
                                                            {...p}
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
                                                    onChange={(_, v) => { setSelectedTitles(v); setPage(1); }}
                                                    filterSelectedOptions
                                                    disableCloseOnSelect
                                                    renderInput={(p) => (
                                                        <TextField
                                                            {...p}
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
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Industry"
                                                    value={selectedIndustries}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setSelectedIndustries(typeof value === "string" ? value.split(",") : value);
                                                        setPage(1);
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
                                                    {globalOptions.industries.map((n) => (
                                                        <MenuItem key={n} value={n}>
                                                            <Checkbox checked={selectedIndustries.indexOf(n) > -1} />
                                                            <ListItemText primary={n} />
                                                        </MenuItem>
                                                    ))}
                                                </TextField>

                                                {/* Company Size */}
                                                <TextField
                                                    select
                                                    fullWidth
                                                    size="small"
                                                    label="Company Size"
                                                    value={selectedCompanySizes}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setSelectedCompanySizes(typeof value === "string" ? value.split(",") : value);
                                                        setPage(1);
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
                                                    {globalOptions.sizes.map((n) => (
                                                        <MenuItem key={n} value={n}>
                                                            <Checkbox checked={selectedCompanySizes.indexOf(n) > -1} />
                                                            <ListItemText primary={formatCompanySizeLabel(n)} />
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </Paper>

                        {(loading || loadingRequests) && (
                            <Stack spacing={0}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <React.Fragment key={i}>
                                        {tabIndex === 0 ? <MemberCardSkeleton /> : <RequestCardSkeleton />}
                                    </React.Fragment>
                                ))}
                            </Stack>
                        )}

                        {!loading && error && <Typography color="error">⚠️ {error}</Typography>}

                        {!loading && !loadingRequests && !error && (
                            <Stack spacing={1.5}>
                                {tabIndex === 0 && (
                                    <>
                                        {current.map((u) => (
                                            <MemberCard
                                                key={u.id}
                                                u={u}
                                                friendStatus={friendStatusByUser[u.id]}
                                                onOpenProfile={handleOpenProfile}
                                                onAddFriend={sendFriendRequest}
                                                currentUserId={me.id}
                                                viewerIsStaff={viewerIsStaff}
                                            />
                                        ))}
                                        {filtered.length === 0 && (
                                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                                No contacts found matching your filters.
                                            </Typography>
                                        )}
                                        {filtered.length > 0 && (
                                            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1} sx={{ mt: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Showing {filtered.length === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + ROWS_PER_PAGE, filtered.length)} of ${filtered.length}`}
                                                </Typography>
                                                <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" size="small" />
                                            </Stack>
                                        )}
                                    </>
                                )}

                                {tabIndex === 1 && (
                                    <>
                                        {sentRequests.map((req) => (
                                            <RequestCard key={req.id} req={req} type="sent" onOpenProfile={handleOpenProfile} onCancel={cancelRequest} />
                                        ))}
                                        {sentRequests.length === 0 && (
                                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                                No sent requests pending.
                                            </Typography>
                                        )}
                                    </>
                                )}

                                {tabIndex === 2 && (
                                    <>
                                        {receivedRequests.map((req) => (
                                            <RequestCard key={req.id} req={req} type="received" onOpenProfile={handleOpenProfile} onAccept={acceptRequest} onDecline={declineRequest} />
                                        ))}
                                        {receivedRequests.length === 0 && (
                                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                                No pending requests received.
                                            </Typography>
                                        )}
                                    </>
                                )}
                            </Stack>
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
                                    Where My Contacts are from
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
                                Contacts map
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
                                Where My Contacts are from
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
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    severity={toast.type}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </>
    );
}
