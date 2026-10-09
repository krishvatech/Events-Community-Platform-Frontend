// src/pages/community/mygroups.jsx
import * as React from "react";
import { useLocation, useNavigate } from "#navigation";
import {
  GROUP_SHORT_DESCRIPTION_MAX_LENGTH,
  describeWordCount,
  validateDescriptionWords,
} from "../../utils/groupValidation";
import {
    Box,
    Button,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
    Alert,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Popper,
    Chip,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import {
    CommunityGroupCard,
    CommunityGroupCardSkeleton,
} from "../../components/CommunityGroupCard.jsx";
import { getAccessToken as getStoredAccessToken } from "../../utils/tokenStore";
import { colors, layout, radii, shadows, semanticColors } from "../../styles/designTokens";
import "../../styles/communityParity.css";

const BORDER = "#e2e8f0";
const JOIN_POLICY_LABELS = {
    open: "Open",
    approval: "Request approval",
    invite: "Invite-only",
};

const VISIBILITY_LABELS = {
    public: "Public",
    private: "Private",
};

const ITEMS_PER_PAGE = 6;

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(
    /\/$/,
    ""
);
const API_ORIGIN = (() => {
    try {
        const u = new URL(API_ROOT);
        return `${u.protocol}//${u.host}`;
    } catch {
        return "";
    }
})();

const toAbsolute = (u) =>
    !u
        ? ""
        : /^https?:\/\//i.test(u)
            ? u
            : `${import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN}${u.startsWith("/") ? "" : "/"
            }${u}`;

const bust = (url, key) => {
    if (!url) return url;
    const u = toAbsolute(url);
    const sep = u.includes("?") ? "&" : "?";
    const k = key ?? Date.now();
    return `${u}${sep}v=${encodeURIComponent(k)}`;
};

function authHeader() {
    const token =
        localStorage.getItem("access") ||
        getStoredAccessToken() ||
        localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const normalizeRole = (g) => {
    const raw =
        g?.current_user_role ??
        g?.membership_role ??
        g?.member_role ??
        g?.role ??
        g?.membership?.role ??
        g?.current_user_membership?.role ??
        "";
    const val =
        typeof raw === "string"
            ? raw
            : raw?.name || raw?.role || raw?.title || "";
    return String(val || "").toLowerCase();
};

/* ---------- Custom Select Component ---------- */
function extractCountryFromLocation(raw) {
    if (!raw) return "";
    const parts = String(raw)
        .split(/,|\n/)
        .map((p) => p.trim())
        .filter(Boolean);

    if (!parts.length) return "";

    // usually last part = country | e.g. "Mumbai, Maharashtra, India" -> "India"
    const last = parts[parts.length - 1]
        .replace(/\s*-\s.*$/, "")
        .trim();

    return last;
}

/* ---------- Custom Select Component ---------- */
function CustomSelect({ label, value, onChange, options, disabled, helperText }) {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef(null);

    return (
        <Box className="mb-3">
            <Box
                ref={anchorRef}
                onClick={() => !disabled && setOpen(!open)}
                className="border border-slate-300 rounded-md p-3 bg-white cursor-pointer hover:bg-slate-50 transition"
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    minHeight: 56,
                    opacity: disabled ? 0.6 : 1,
                    pointerEvents: disabled ? "none" : "auto",
                    '&:hover': { borderColor: disabled ? "inherit" : "#10b8a6" }
                }}
            >
                <Box>
                    <Typography variant="caption" className="text-slate-500">{label}</Typography>
                    <Typography variant="body2" className="font-medium">
                        {options.find(opt => opt.value === value)?.label || "Select..."}
                    </Typography>
                </Box>
                <Box className="text-slate-400">▼</Box>
            </Box>

            <Popper
                open={open}
                anchorEl={anchorRef.current}
                placement="bottom-start"
                style={{ zIndex: 10000 }}
            >
                <Paper
                    elevation={3}
                    className="rounded-md border border-slate-200 overflow-hidden"
                    style={{ width: anchorRef.current?.offsetWidth || 300 }}
                >
                    <Box className="max-h-60 overflow-y-auto">
                        {options.map((opt) => (
                            <Box
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className="px-4 py-2.5 hover:bg-slate-100 cursor-pointer transition border-b border-slate-100 last:border-b-0"
                                sx={{
                                    backgroundColor: value === opt.value ? "var(--imaa-dm-muted, #e0f2f1)" : "transparent",
                                    fontWeight: value === opt.value ? 600 : 400,
                                    color: value === opt.value ? "#10b8a6" : "inherit"
                                }}
                            >
                                {opt.label}
                            </Box>
                        ))}
                    </Box>
                </Paper>
            </Popper>

            {helperText && (
                <Typography variant="caption" className="text-slate-500 block mt-1">
                    {helperText}
                </Typography>
            )}
        </Box>
    );
}

/* ---------- Edit Group Dialog ---------- */
function EditGroupDialog({ open, group, onClose, onUpdated }) {
    const token = authHeader().Authorization?.replace("Bearer ", "") || "";
    const [name, setName] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [visibility, setVisibility] = React.useState("public");
    const [joinPolicy, setJoinPolicy] = React.useState("open");
    const [imageFile, setImageFile] = React.useState(null);
    const [localPreview, setLocalPreview] = React.useState("");
    const [removeImage, setRemoveImage] = React.useState(false);

    const [logoFile, setLogoFile] = React.useState(null);
    const [logoPreview, setLogoPreview] = React.useState("");
    const [removeLogo, setRemoveLogo] = React.useState(false);

    const [submitting, setSubmitting] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    React.useEffect(() => {
        if (!group) return;
        setName(group.name || "");
        setShortDescription(group.short_description || "");
        setDescription(group.description || "");
        setVisibility(group.visibility || "public");

        // Map join_policy from API to form values
        const jp = (group.join_policy || "").toLowerCase();
        if (jp === "open") {
            setJoinPolicy("open");
        } else if (jp === "invite") {
            setJoinPolicy("invite");
        } else if (jp === "approval" || jp === "public_approval") {
            setJoinPolicy("approval");
        } else {
            // Default based on visibility
            setJoinPolicy(group.visibility === "private" ? "invite" : "open");
        }

        setLocalPreview(group.cover_image ? toAbsolute(group.cover_image) : "");
        setImageFile(null);
        setRemoveImage(false);

        setLogoPreview(group.logo ? toAbsolute(group.logo) : "");
        setLogoFile(null);
        setRemoveLogo(false);
        setErrors({});
    }, [group]);

    React.useEffect(() => {
        if (visibility === "private") {
            if (joinPolicy !== "invite") setJoinPolicy("invite");
        } else if (!joinPolicy) {
            setJoinPolicy("open");
        }
    }, [visibility]);

    const onPickFile = (file) => {
        if (!file) return;
        setImageFile(file);
        setRemoveImage(false);
        const reader = new FileReader();
        reader.onload = (e) => setLocalPreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const onPickLogo = (file) => {
        if (!file) return;
        setLogoFile(file);
        setRemoveLogo(false);
        const reader = new FileReader();
        reader.onload = (e) => setLogoPreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = "Required";
        if (!description.trim()) e.description = "Required";
        else {
            const wordError = validateDescriptionWords(description);
            if (wordError) e.description = wordError;
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async () => {
        if (!group || !validate()) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("short_description", shortDescription.trim());
            fd.append("description", description.trim());
            fd.append("visibility", visibility);
            fd.append("join_policy", visibility === "private" ? "invite" : joinPolicy);

            if (imageFile && !removeImage) fd.append("cover_image", imageFile, imageFile.name);
            if (removeImage) fd.append("remove_cover_image", "1");

            if (logoFile && !removeLogo) fd.append("logo", logoFile, logoFile.name);
            if (removeLogo) fd.append("remove_logo", "1");

            const idOrSlug = group.slug || group.id;

            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                method: "PATCH",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: fd,
            });

            let updated;
            if (res.status === 204) {
                const getRes = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                });
                updated = await getRes.json();
            } else {
                updated = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg =
                        updated?.detail ||
                        Object.entries(updated)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                            .join(" | ") ||
                        `HTTP ${res.status}`;
                    throw new Error(msg);
                }
            }

            const merged = {
                ...group,
                ...updated,
                cover_image: updated?.cover_image ?? (removeImage ? null : group.cover_image),
                logo: updated?.logo ?? (removeLogo ? null : group.logo),
                _cache: Date.now(),
            };

            onUpdated?.(merged);
            onClose?.();

            setImageFile(null);
            setRemoveImage(false);
            setLocalPreview(merged.cover_image ? toAbsolute(merged.cover_image) : "");

            setLogoFile(null);
            setRemoveLogo(false);
            setLogoPreview(merged.logo ? toAbsolute(merged.logo) : "");
        } catch (e) {
            setErrors((prev) => ({ ...prev, __all__: String(e?.message || e) }));
        } finally {
            setSubmitting(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
            <DialogTitle className="font-extrabold">Edit Group</DialogTitle>
            <DialogContent dividers>
                {errors.__all__ && (
                    <Alert severity="error" className="mb-3">{errors.__all__}</Alert>
                )}

                <TextField
                    label="Group Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name}
                    className="mb-3"
                />

                <TextField
                    label="Short Description / Headline"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    fullWidth
                    className="mb-3"
                    placeholder="e.g. Connecting AI professionals worldwide"
                    inputProps={{ maxLength: GROUP_SHORT_DESCRIPTION_MAX_LENGTH }}
                    helperText={`${shortDescription.length}/${GROUP_SHORT_DESCRIPTION_MAX_LENGTH} characters`}
                />

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-7">
                        <TextField
                            label="Description *"
                            multiline minRows={3}
                            maxRows={12}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth className="mb-3"
                            error={!!errors.description}
                            helperText={errors.description || describeWordCount(description)}
                        />

                        <CustomSelect
                            label="Visibility"
                            value={visibility}
                            onChange={(val) => setVisibility(val)}
                            options={[
                                { label: "Public (anyone can find)", value: "public" },
                                { label: "Private", value: "private" }
                            ]}
                        />


                        <CustomSelect
                            label="Join Policy"
                            value={joinPolicy}
                            onChange={(val) => setJoinPolicy(val)}
                            disabled={visibility === "private"}
                            helperText={visibility === "private" ? "Private groups are invite-only." : ""}
                            options={
                                visibility === "public"
                                    ? [
                                        { label: "Open (Join instantly)", value: "open" },
                                        { label: "Approval required (Request approval)", value: "approval" },
                                        { label: "Invite only (By invitation only)", value: "invite" }
                                    ]
                                    : [
                                        { label: "Invite only (By invitation only)", value: "invite" }
                                    ]
                            }
                        />
                    </div>

                    <div className="col-span-12 md:col-span-5 flex flex-col gap-4">

                        {/* Logo Upload */}
                        <div>
                            <Typography variant="subtitle1" className="font-semibold">Logo / Icon</Typography>
                            <Typography variant="caption" className="text-slate-500 block mb-2">
                                Recommended 200×200px (Square)
                            </Typography>

                            <Box className="flex items-center gap-4">
                                <Box
                                    className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center overflow-hidden"
                                    sx={{ width: 100, height: 100, position: "relative" }}
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Stack alignItems="center" spacing={0.5}>
                                            <ImageRoundedIcon fontSize="small" />
                                            <Typography variant="caption" className="text-slate-600 text-[10px]">Icon</Typography>
                                        </Stack>
                                    )}
                                    <input
                                        id="group-edit-logo-file"
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(e) => onPickLogo(e.target.files?.[0])}
                                    />
                                </Box>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="group-edit-logo-file">
                                        <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />}>
                                            Upload Icon
                                        </Button>
                                    </label>
                                    <Button
                                        size="small"
                                        variant="text"
                                        color="error"
                                        onClick={() => { setRemoveLogo(true); setLogoFile(null); setLogoPreview(""); }}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </Box>
                        </div>

                        {/* Cover Image Upload */}
                        <div>
                            <Typography variant="subtitle1" className="font-semibold">Cover Image</Typography>
                            <Typography variant="caption" className="text-slate-500 block mb-2">
                                Recommended 650×365px • Max 50 MB
                            </Typography>

                            <Box
                                className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                                sx={{ height: 160, position: "relative", overflow: "hidden" }}
                            >
                                {localPreview ? (
                                    <img src={localPreview} alt="cover" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <Stack alignItems="center" spacing={1}>
                                        <ImageRoundedIcon />
                                        <Typography variant="body2" className="text-slate-600">Image Preview</Typography>
                                    </Stack>
                                )}
                                <input
                                    id="group-edit-image-file"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={(e) => onPickFile(e.target.files?.[0])}
                                />
                            </Box>

                            <Stack direction="row" spacing={1} className="mt-2">
                                <label htmlFor="group-edit-image-file">
                                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />}>
                                        Upload Cover
                                    </Button>
                                </label>
                                <Button
                                    size="small"
                                    variant="text"
                                    color="error"
                                    onClick={() => { setRemoveImage(true); setImageFile(null); setLocalPreview(""); }}
                                >
                                    Remove
                                </Button>
                            </Stack>
                        </div>
                    </div>
                </div>
            </DialogContent>
            <DialogActions className="px-6 py-4">
                <Button onClick={onClose} className="rounded-xl" sx={{ textTransform: "none" }}>Cancel</Button>
                <Button
                    onClick={submit}
                    disabled={submitting}
                    variant="contained"
                    className="rounded-xl"
                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function QuickViewDialog({ open, group, onClose, onJoin, onEdit, canEdit }) {
    if (!group) return null;
    const isPrivate = (group.visibility || "").toLowerCase() === "private";
    const joined = (group.membership_status || "").toLowerCase() === "joined";
    const pending = (group.membership_status || "").toLowerCase() === "pending";

    let cta = "Join Group";
    if (joined) cta = "Joined";
    else if (pending) cta = "Request Pending";
    else if (isPrivate) cta = "Request to Join";

    const cover = group.cover_image || group.cover;
    const logo = group.logo;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ className: "rounded-2xl" }}>
            <Box sx={{ position: "relative", height: 160, bgcolor: "var(--imaa-dm-surface-alt, #f1f5f9)" }}>
                {cover && (
                    <img
                        src={toAbsolute(cover)}
                        alt="cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                )}
                {/* Logo overlay */}
                {logo && (
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: -32,
                            left: 24,
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "4px solid var(--imaa-dm-surface, white)",
                            backgroundColor: "var(--imaa-dm-surface, white)",
                            zIndex: 2,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}
                    >
                        <img src={toAbsolute(logo)} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </Box>
                )}
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 8, right: 8, bgcolor: "var(--imaa-dm-glass, rgba(255,255,255,0.8))", "&:hover": { bgcolor: "var(--imaa-dm-surface, #fff)" } }}
                    size="small"
                >
                    ✕
                </IconButton>
            </Box>

            <DialogContent sx={{ pt: logo ? 6 : 3 }}>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                    {group.name}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                        size="small"
                        label={isPrivate ? "Private" : "Public"}
                        color={isPrivate ? "default" : "success"}
                        variant="outlined"
                    />
                    <Chip
                        size="small"
                        label={`${group.member_count || 0} Members`}
                        variant="outlined"
                    />
                </Stack>

                {group.short_description && (
                    <Typography variant="subtitle1" className="text-slate-700 font-semibold mb-2">
                        {group.short_description}
                    </Typography>
                )}

                <Typography variant="body1" className="text-slate-600 mb-4 whitespace-pre-line">
                    {group.description || "No description provided."}
                </Typography>

                {group.parent_group && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        This is a subgroup of <b>{group.parent_group.name}</b>
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button onClick={onClose} color="inherit">Close</Button>
                {canEdit && (
                    <Button
                        variant="outlined"
                        startIcon={<EditNoteRoundedIcon />}
                        onClick={() => onEdit?.(group)}
                    >
                        Edit
                    </Button>
                )}
                <Button
                    variant="contained"
                    disabled={joined || pending}
                    onClick={() => onJoin?.(group)}
                    className="rounded-xl shadow-none"
                    sx={{ px: 4, py: 1, backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                >
                    {cta}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function MyGroupsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    // "My Groups" list
    const [data, setData] = React.useState([]);
    const [allData, setAllData] = React.useState([]);
    const [isServerPaginated, setIsServerPaginated] = React.useState(true);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    // Search/Filter
    const [search, setSearch] = React.useState("");
    const [debouncedSearch, setDebouncedSearch] = React.useState("");

    /* ---------- State for Filters ---------- */
    const [selectedCompanies, setSelectedCompanies] = React.useState([]);
    const [selectedRegions, setSelectedRegions] = React.useState([]);
    const [selectedTitles, setSelectedTitles] = React.useState([]);
    const [selectedJoinPolicies, setSelectedJoinPolicies] = React.useState([]);
    const [selectedVisibilities, setSelectedVisibilities] = React.useState([]);

    const [globalOptions, setGlobalOptions] = React.useState({
        companies: [],
        titles: [],
        regions: [],
    });

    // Pagination
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);

    // Dialogs
    const [quickViewGroup, setQuickViewGroup] = React.useState(null);
    const [editGroup, setEditGroup] = React.useState(null);

    /* ---------- Fetch Filter Options ---------- */
    React.useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`${API_ROOT}/users/filters/`, {
                    headers: { Accept: "application/json", ...authHeader() },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!alive) return;

                const regionSet = new Set();
                (data.locations || []).forEach((loc) => {
                    const c = extractCountryFromLocation(loc);
                    if (c) regionSet.add(c);
                });
                const sortedRegions = Array.from(regionSet).sort((a, b) => a.localeCompare(b));

                setGlobalOptions({
                    companies: data.companies || [],
                    titles: data.titles || [],
                    regions: sortedRegions,
                });
            } catch (e) {
                console.error("Failed to load filter options", e);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // Debounce search
    React.useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(t);
    }, [search]);

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedCompanies, selectedRegions, selectedTitles, selectedJoinPolicies, selectedVisibilities]);

    // Fetch groups function
    const fetchGroups = React.useRef(async () => {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();
            params.set("page", page);
            params.set("page_size", ITEMS_PER_PAGE);

            if (debouncedSearch) params.set("search", debouncedSearch);

            // Append filters
            selectedCompanies.forEach((v) => params.append("company", v));
            selectedTitles.forEach((v) => params.append("title", v));
            selectedRegions.forEach((v) => params.append("region", v));
            selectedJoinPolicies.forEach((v) => params.append("join_policy", v));
            selectedVisibilities.forEach((v) => params.append("visibility", v));

            // Using the backend specific endpoint for joined groups
            const r = await fetch(`${API_ROOT}/groups/joined-groups/?${params.toString()}`, {
                headers: { Accept: "application/json", ...authHeader() },
            });

            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const json = await r.json();

            const results = json?.results ?? json?.data ?? json ?? [];
            const serverPaginated =
                typeof json?.count === "number" ||
                json?.next !== undefined ||
                json?.previous !== undefined;
            setIsServerPaginated(serverPaginated);

            if (serverPaginated) {
                setData(results);
                setAllData([]);
                // Determine total pages
                const total = json.count || results.length;
                setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);
            } else {
                const list = Array.isArray(results) ? results : [];
                setAllData(list);
                const total = list.length;
                setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);
                const start = (page - 1) * ITEMS_PER_PAGE;
                setData(list.slice(start, start + ITEMS_PER_PAGE));
            }

        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }).current;

    // React to filter/search changes
    React.useEffect(() => {
        fetchGroups();
    }, [debouncedSearch, selectedCompanies, selectedRegions, selectedTitles, selectedJoinPolicies, selectedVisibilities]);

    // React to page changes (server-side pagination only)
    React.useEffect(() => {
        if (!isServerPaginated) return;
        fetchGroups();
    }, [page, isServerPaginated]);

    React.useEffect(() => {
        if (isServerPaginated) return;
        const start = (page - 1) * ITEMS_PER_PAGE;
        setData(allData.slice(start, start + ITEMS_PER_PAGE));
    }, [page, allData, isServerPaginated]);

    const handleJoin = async (g) => {
        // If user is already active/pending, maybe do nothing or navigate
        // Logic here is typically for joining "Explore" groups.
        // Use the same logic just in case.
        if (!g) return;
        try {
            const r = await fetch(`${API_ROOT}/groups/${g.slug || g.id}/join-group/request/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader()
                },
                body: JSON.stringify({})
            });
            const json = await r.json();
            if (r.ok) {
                // refresh
                fetchGroups();
                if (quickViewGroup?.id === g.id) setQuickViewGroup(null);
            } else {
                alert(json.detail || "Failed to join");
            }
        } catch (e) {
            console.error(e);
            alert("Error joining group");
        }
    };

    const handleCreate = () => {
        navigate("/community/groups/create");
    };

    const canEditGroup = (g) => {
        const role = normalizeRole(g);
        return role.includes("admin") || role.includes("owner");
    };

    return (
        <Box className="ecp-community-surface" sx={{ width: "100%", py: { xs: 3, md: 5 }, bgcolor: semanticColors.page, minHeight: "100vh" }}>
            <Box
                sx={{
                    display: "flex",
                    gap: 3,
                    px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
                    maxWidth: layout.contentMax,
                    mx: "auto",
                }}
            >
                {/* Main content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <Box sx={{ mb: { xs: 3, md: 4 }, pt: 1 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: semanticColors.tealText, textTransform: "uppercase", letterSpacing: "0.12em", mb: 0.75 }}>
                            COMMUNITY
                        </Typography>
                        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: semanticColors.text, mb: 1, lineHeight: 1.2 }}>
                            My Groups
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: semanticColors.textBody }}>
                            Groups you have joined or are managing
                        </Typography>
                    </Box>

                    {/* Filters */}
                    <Box sx={{ mb: 3, p: { xs: 1.5, sm: 2 }, bgcolor: semanticColors.surface, border: `1px solid ${semanticColors.border}`, borderRadius: `${radii.card}px`, boxShadow: shadows.sm }}>
                        <Stack direction="column" spacing={2}>
                    <TextField
                        placeholder="Search my groups..."
                        size="small"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" className="text-slate-400" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ bgcolor: semanticColors.surface }}
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
                                <TextField {...params} label="Company" placeholder={selectedCompanies.length ? "" : "All companies"} sx={{ bgcolor: "var(--imaa-dm-surface, white)" }} />
                            )}
                            sx={{ flex: 1 }}
                        />
                        <Autocomplete
                            multiple
                            fullWidth
                            size="small"
                            options={globalOptions.regions}
                            value={selectedRegions}
                            onChange={(_, newValue) => setSelectedRegions(newValue)}
                            filterSelectedOptions
                            disableCloseOnSelect
                            renderInput={(params) => (
                                <TextField {...params} label="Region" placeholder={selectedRegions.length ? "" : "All regions"} sx={{ bgcolor: "var(--imaa-dm-surface, white)" }} />
                            )}
                            sx={{ flex: 1 }}
                        />
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
                                <TextField {...params} label="Job title" placeholder={selectedTitles.length ? "" : "All job titles"} sx={{ bgcolor: "var(--imaa-dm-surface, white)" }} />
                            )}
                            sx={{ flex: 1 }}
                        />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Autocomplete
                            multiple
                            fullWidth
                            size="small"
                            options={Object.keys(JOIN_POLICY_LABELS)}
                            value={selectedJoinPolicies}
                            onChange={(_, newValue) => setSelectedJoinPolicies(newValue)}
                            filterSelectedOptions
                            disableCloseOnSelect
                            getOptionLabel={(opt) => JOIN_POLICY_LABELS[opt] || opt}
                            renderInput={(params) => (
                                <TextField {...params} label="Join policy" placeholder={selectedJoinPolicies.length ? "" : "All policies"} sx={{ bgcolor: "var(--imaa-dm-surface, white)" }} />
                            )}
                            sx={{ flex: 1 }}
                        />
                        <Autocomplete
                            multiple
                            fullWidth
                            size="small"
                            options={Object.keys(VISIBILITY_LABELS)}
                            value={selectedVisibilities}
                            onChange={(_, newValue) => setSelectedVisibilities(newValue)}
                            filterSelectedOptions
                            disableCloseOnSelect
                            getOptionLabel={(opt) => VISIBILITY_LABELS[opt] || opt}
                            renderInput={(params) => (
                                <TextField {...params} label="Visibility" placeholder={selectedVisibilities.length ? "" : "All visibilities"} sx={{ bgcolor: "var(--imaa-dm-surface, white)" }} />
                            )}
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                </Stack>
                    </Box>

                    {/* Showing count */}
                    {!loading && (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: semanticColors.textBody, textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
                            MY GROUPS {data.length}
                        </Typography>
                    )}

                    {/* Content */}
                    <Box sx={{ minHeight: "400px" }}>
                        {loading ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
                        {[...Array(6)].map((_, i) => (
                            <CommunityGroupCardSkeleton key={i} />
                        ))}
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : data.length === 0 ? (
                    <Paper variant="outlined" sx={{ py: { xs: 6, md: 8 }, px: 2, textAlign: "center", borderColor: semanticColors.border, borderRadius: `${radii.card}px`, boxShadow: "none" }}>
                        <Typography component="h2" variant="h6" sx={{ color: semanticColors.text, mb: 0.5 }}>
                            No groups found
                        </Typography>
                        <Typography variant="body2" sx={{ color: semanticColors.textBody, mb: 3 }}>
                            {search || selectedCompanies.length || selectedRegions.length || selectedTitles.length || selectedJoinPolicies.length || selectedVisibilities.length
                                ? "Try a different search term or filter selection."
                                : "You haven't joined any groups yet."}
                        </Typography>
                        <Button variant="outlined" onClick={() => navigate("/community/groups")} sx={{ minHeight: 40, textTransform: "none", fontWeight: 700 }}>
                            Explore Groups
                        </Button>
                    </Paper>
                ) : (
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
                                {data.map((g) => (
                                    <CommunityGroupCard
                                        key={g.id}
                                        group={g}
                                        imageUrl={g.cover_image || g.cover ? bust(g.cover_image || g.cover, g._cache || g.updated_at) : ""}
                                        logoUrl={g.logo ? bust(g.logo, g._cache || g.updated_at) : ""}
                                        hideJoin={true} // Usually "My Groups" are already joined, so we can hide generic join button or keep it as status
                                        onOpen={(grp) => navigate(`/community/mygroups/${grp.slug || grp.id}`, { state: { backTo: "/community/mygroups", backLabel: "Back to My Groups" } })}
                                        onEdit={(grp) => setEditGroup(grp)}
                                        canEdit={canEditGroup(g)}
                                    />
                                ))}
                            </Box>
                        )}

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 4 }}>
                                <Typography variant="caption" sx={{ color: semanticColors.textBody }}>
                                    {ITEMS_PER_PAGE} per page
                                </Typography>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, p) => setPage(p)}
                                    color="primary"
                                    size="large"
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
                        )}
                    </Box>

                    {/* Dialogs */}
                    <QuickViewDialog
                        open={!!quickViewGroup}
                        group={quickViewGroup}
                        onClose={() => setQuickViewGroup(null)}
                        onJoin={handleJoin}
                        onEdit={(g) => {
                            setQuickViewGroup(null);
                            setEditGroup(g);
                        }}
                        canEdit={quickViewGroup && canEditGroup(quickViewGroup)}
                    />

                    <EditGroupDialog
                        open={!!editGroup}
                        group={editGroup}
                        onClose={() => setEditGroup(null)}
                        onUpdated={(updated) => {
                            setData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                            setEditGroup(null);
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}
