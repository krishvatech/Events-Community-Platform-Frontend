// src/pages/community/mygroups.jsx
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
    Card,
    CardContent,
    CardActions,
    Alert,
    Avatar,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    IconButton,
    Popper,
    Chip,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import Skeleton from "@mui/material/Skeleton";
import SearchIcon from "@mui/icons-material/Search";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import { isAdminUser } from "../../utils/adminRole";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";
const JOIN_BTN_SX = {
    textTransform: "none",
    whiteSpace: "nowrap",
    minWidth: 124,
    px: 2.25,
    fontWeight: 600,
    borderRadius: 2,
};

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
        localStorage.getItem("access_token") ||
        localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const slugify = (s) =>
    (s || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

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

const roleLabel = (g) => {
    const role = normalizeRole(g);
    if (!role) return "";
    if (role.includes("owner")) return "Owner";
    if (role.includes("admin")) return "Admin";
    if (role.includes("moderator") || role === "mod") return "Moderator";
    return "";
};

const normalizeMembershipStatus = (g) => {
    const raw =
        g?.membership_status ??
        g?.status ??
        g?.membership?.status ??
        g?.current_user_membership?.status ??
        "";
    return String(raw || "").toLowerCase();
};

const membershipLabel = (g) => {
    if (g?.is_member) return "Member";
    const s = normalizeMembershipStatus(g);
    if (s === "pending" || s === "requested" || s === "request") return "Pending";
    if (s === "joined" || s === "active" || s === "approved" || s === "member") return "Member";
    return "";
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
                                    backgroundColor: value === opt.value ? "#e0f2f1" : "transparent",
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
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async () => {
        if (!group || !validate()) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("name", name.trim());
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

                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-7">
                        <TextField
                            label="Description *"
                            multiline minRows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth className="mb-3"
                            error={!!errors.description} helperText={errors.description}
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

/* ---------- Single group card ---------- */
function GroupGridCard({ g, onJoin, onOpen, onEdit, hideJoin, canEdit }) {
    const isPrivate = (g.visibility || "").toLowerCase() === "private";
    const members = g.member_count ?? g.members_count ?? g.members?.length ?? 0;
    const role = roleLabel(g);
    const memberStatus = membershipLabel(g);

    const visibility = (g.visibility || "").toLowerCase();
    const jp = (g.join_policy || "").toLowerCase();
    const isApproval =
        visibility === "public" && (jp === "public_approval" || jp === "approval");
    const pending = (g.membership_status || "").toLowerCase() === "pending";
    const joined =
        (g.membership_status || "").toLowerCase() === "joined" || !!g.is_member;

    const ctaText = joined
        ? "Joined"
        : pending
            ? "Request pending"
            : isApproval
                ? "Request to Join"
                : "Join";

    return (
        <Card
            variant="outlined"
            sx={{
                width: "100%",
                borderRadius: 3,
                overflow: "hidden",
                borderColor: BORDER,
                height: 280,
                display: "flex", // Keep flex layout
                flexDirection: "column",
            }}
        >
            <Box
                onClick={() => onOpen?.(g)}
                sx={{
                    width: "100%",
                    height: 130,
                    bgcolor: "#f8fafc",
                    borderBottom: `1px solid ${BORDER}`,
                    backgroundImage:
                        g.cover_image || g.cover
                            ? `url(${toAbsolute(g.cover_image || g.cover)})`
                            : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    cursor: "pointer",
                    position: "relative", // Needed for alignment
                }}
            >
                {/* Logo overlay */}
                {g.logo && (
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: -24,
                            left: 16,
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "3px solid white",
                            backgroundColor: "white",
                            zIndex: 2,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                        }}
                    >
                        <img
                            src={bust(g.logo, g._cache || g.updated_at)}
                            alt="logo"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    </Box>
                )}
            </Box>

            <CardContent
                sx={{ flexGrow: 1, pb: 1, cursor: "pointer", pt: g.logo ? 4 : 2 }} // Added pt padding if logo exists
                onClick={() => onOpen?.(g)}
            >
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                >
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexWrap: "wrap" }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                {isPrivate ? "Private" : "Public"}
                            </Typography>
                            {isApproval && (
                                <LockRounded sx={{ fontSize: 14, color: "#f97316" }} />
                            )}
                        </Stack>
                        {memberStatus && (
                            <Chip
                                size="small"
                                label={memberStatus}
                                sx={{
                                    height: 20,
                                    fontSize: 11,
                                    bgcolor: memberStatus === "Pending" ? "#fffbeb" : "#ecfdf3",
                                    color: memberStatus === "Pending" ? "#b45309" : "#166534",
                                }}
                            />
                        )}
                        {role && (
                            <Chip
                                size="small"
                                label={role}
                                sx={{
                                    height: 20,
                                    fontSize: 11,
                                    bgcolor: "#eef2ff",
                                    color: "#4338ca",
                                }}
                            />
                        )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        {members} Member{members !== 1 ? "s" : ""}
                    </Typography>
                </Stack>

                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {g.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                    {g.category || g.topic || g.description || g.name}
                </Typography>
                {g.parent_group && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Subgroup of <b>{g.parent_group.name}</b>
                    </Typography>
                )}
            </CardContent>

            <CardActions sx={{ pt: 0, pb: 1, px: 1 }}>
                <Stack direction="row" spacing={1} sx={{ width: "100%", alignItems: "center" }}>
                    {!hideJoin && (
                        <Button
                            size="small"
                            color="primary"
                            variant={joined ? "outlined" : "contained"}
                            onClick={() => onJoin?.(g)}
                            sx={{ ...JOIN_BTN_SX, flex: 1 }}
                            disabled={pending || joined}
                            title={ctaText}
                        >
                            {ctaText}
                        </Button>
                    )}
                    <Button
                        size="small"
                        variant="outlined"
                        sx={{ flex: 1 }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpen?.(g);
                        }}
                    >
                        Details
                    </Button>
                    {canEdit && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit?.(g);
                            }}
                            sx={{ color: "#10b8a6" }}
                            title="Edit Group"
                        >
                            <EditNoteRoundedIcon />
                        </IconButton>
                    )}
                </Stack>
            </CardActions>
        </Card>
    );
}

function GroupGridCardSkeleton() {
    return (
        <Card
            variant="outlined"
            sx={{
                width: "100%",
                borderRadius: 3,
                overflow: "hidden",
                borderColor: BORDER,
                height: 280,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Cover skeleton */}
            <Box
                sx={{
                    width: "100%",
                    height: 130,
                    bgcolor: "#f8fafc",
                    borderBottom: `1px solid ${BORDER}`,
                }}
            >
                <Skeleton variant="rectangular" width="100%" height="100%" />
            </Box>

            <CardContent sx={{ flexGrow: 1, pb: 1, pt: 2 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Skeleton variant="text" width={60} height={20} />
                    <Skeleton variant="text" width={50} height={20} />
                </Stack>
                <Skeleton variant="text" width="80%" height={28} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="60%" height={20} />
            </CardContent>

            <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
                <Skeleton variant="rectangular" width="100%" height={36} sx={{ borderRadius: 1 }} />
            </CardActions>
        </Card>
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
            <Box sx={{ position: "relative", height: 160, bgcolor: "#f1f5f9" }}>
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
                            border: "4px solid white",
                            backgroundColor: "white",
                            zIndex: 2,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}
                    >
                        <img src={toAbsolute(logo)} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </Box>
                )}
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(255,255,255,0.8)", "&:hover": { bgcolor: "#fff" } }}
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

            const results = json.results || json.data || [];
            setData(results);
            // Determine total pages
            const total = json.count || results.length;
            setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);

        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }).current;

    // React to changes
    React.useEffect(() => {
        fetchGroups();
    }, [page, debouncedSearch, selectedCompanies, selectedRegions, selectedTitles, selectedJoinPolicies, selectedVisibilities]);

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
        <Box className="p-4 md:p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <Box className="mb-6">
                <Box className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <Typography variant="h4" fontWeight={800} className="text-slate-800">
                            My Groups
                        </Typography>
                        <Typography variant="body2" className="text-slate-500 mt-1">
                            Groups you have joined or are managing
                        </Typography>
                    </div>
                </Box>

                {/* Filters */}
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
                        sx={{ bgcolor: "white" }}
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
                                <TextField {...params} label="Company" placeholder={selectedCompanies.length ? "" : "All companies"} sx={{ bgcolor: "white" }} />
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
                                <TextField {...params} label="Region" placeholder={selectedRegions.length ? "" : "All regions"} sx={{ bgcolor: "white" }} />
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
                                <TextField {...params} label="Job title" placeholder={selectedTitles.length ? "" : "All job titles"} sx={{ bgcolor: "white" }} />
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
                                <TextField {...params} label="Join policy" placeholder={selectedJoinPolicies.length ? "" : "All policies"} sx={{ bgcolor: "white" }} />
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
                                <TextField {...params} label="Visibility" placeholder={selectedVisibilities.length ? "" : "All visibilities"} sx={{ bgcolor: "white" }} />
                            )}
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                </Stack>
            </Box>

            {/* Profile Card if needed, or maybe just list? GroupsPage had it. */}
            {/* <CommunityProfileCard /> */}

            {/* Content */}
            <Box className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <GroupGridCardSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : data.length === 0 ? (
                    <Paper className="p-12 text-center rounded-2xl border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50">
                        <Typography variant="h6" className="text-slate-600 mb-2">
                            No groups found
                        </Typography>
                        <Typography variant="body2" className="text-slate-500 mb-6">
                            You haven't joined any groups yet.
                        </Typography>
                        <Button variant="outlined" onClick={() => navigate("/community/groups")}>
                            Explore Groups
                        </Button>
                    </Paper>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.map((g) => (
                            <GroupGridCard
                                key={g.id}
                                g={g}
                                hideJoin={true} // Usually "My Groups" are already joined, so we can hide generic join button or keep it as status
                                onOpen={(grp) => navigate(`/community/mygroups/${grp.slug || grp.id}`, { state: { backTo: "/community/mygroups", backLabel: "Back to My Groups" } })}
                                onEdit={(grp) => setEditGroup(grp)}
                                canEdit={canEditGroup(g)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <Box className="flex justify-center mt-8">
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_, p) => setPage(p)}
                            color="primary"
                            shape="rounded"
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
    );
}
