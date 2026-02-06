// src/pages/GroupManagePage.jsx
import React from "react";
import {
    Alert, Avatar, AvatarGroup, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, Divider, Grid, LinearProgress, MenuItem, Paper, Stack, Tab, Tabs,
    TextField, Typography, Switch, FormControlLabel, CircularProgress,
    List, ListItem, ListItemAvatar, ListItemText, ButtonGroup, Badge,
    IconButton, Menu, ListItemIcon, Popper, Drawer, Popover, Tooltip, Snackbar
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { isOwnerUser } from "../utils/adminRole";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PollRoundedIcon from "@mui/icons-material/PollRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import VerifiedIcon from "@mui/icons-material/Verified";


// ---- API helpers (reuse same pattern as AdminGroups.jsx) ----
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;
const API_ORIGIN = BASE.replace(/\/api$/, "") || BASE;

// ---- Messaging API endpoints (shared between tabs) ----
// Adjust these URLs to match your existing messaging backend
const MESSAGING_API = {
    // Group-level chat (one shared thread per group)
    // ✅ use a dedicated "ensure group conversation" endpoint (POST)
    ensureGroupThread: () => `${API_ROOT}/messaging/conversations/ensure-group/`,

    // Direct chat with a specific user (DM)
    // ✅ use a dedicated "ensure direct conversation" endpoint (POST)
    ensureDirectThread: () => `${API_ROOT}/messaging/conversations/ensure-direct/`,

    // List messages in a conversation
    listMessages: (cid) => `${API_ROOT}/messaging/conversations/${cid}/messages/`,

    // Send a new message to a conversation
    sendMessage: (cid) => `${API_ROOT}/messaging/conversations/${cid}/messages/`,
};

const POST_REACTIONS = [
    { id: "like", emoji: "👍", label: "Like" },
    { id: "intriguing", emoji: "🤔", label: "Intriguing" },
    { id: "spot_on", emoji: "🎯", label: "Spot On" },
    { id: "validated", emoji: "🧠", label: "Validated" },
    { id: "debatable", emoji: "🤷", label: "Debatable" },
];

const toAbs = (u) => {
    if (!u) return u;
    if (/^https?:\/\//i.test(u)) return u;
    const p = u.startsWith("/") ? u : `/${u}`;
    return `${API_ORIGIN}${p}`;
};
const bust = (url, key) => {
    if (!url) return url;
    const u = toAbs(url);
    const sep = u.includes("?") ? "&" : "?";
    const k = key ?? Date.now();
    return `${u}${sep}v=${encodeURIComponent(k)}`;
};
const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";

const ROLE_BADGE_CONFIG = {
    owner: { label: "Owner", className: "bg-slate-200 text-slate-700" },
    admin: { label: "Admin", className: "bg-teal-50 text-teal-700" },
    moderator: { label: "Moderator", className: "bg-sky-50 text-sky-700" },
    member: { label: "Member", className: "bg-slate-100 text-slate-700" },
};
const RoleBadge = ({ role }) => {
    const cfg = ROLE_BADGE_CONFIG[role] || ROLE_BADGE_CONFIG.member;
    return <Chip size="small" label={cfg.label} className={cfg.className} />;
};

// Keep labels safe for Chips / text
const toStr = (v) => {
    if (v == null) return "";
    if (typeof v === "object") return String(v?.text ?? v?.label ?? JSON.stringify(v));
    return String(v);
};

// Always-unique key for posts (avoids poll/post ID clashes)
const postKey = (p) => `${p?.type || "post"}:${p?.feed_item_id ?? p?.id ?? Math.random()}`;

const cleanPollOptions = (arr) => {
    const seen = new Set();
    const out = [];
    for (const raw of (arr || [])) {
        const s = String(raw ?? "").trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
        if (out.length >= 10) break; // hard cap at 10 options
    }
    return out;
};

function ClampedText({ text = "", lines = 5, sx = {} }) {
    const [expanded, setExpanded] = React.useState(false);
    const [showToggle, setShowToggle] = React.useState(false);
    const ref = React.useRef(null);

    React.useLayoutEffect(() => {
        if (!ref.current || expanded) return;

        // Wait a frame so line-clamp styles apply before measuring
        const id = requestAnimationFrame(() => {
            const el = ref.current;
            const overflow = el.scrollHeight > el.clientHeight + 1;
            setShowToggle(overflow);
        });

        return () => cancelAnimationFrame(id);
    }, [text, lines, expanded]);

    if (!text) return null;

    return (
        <Box sx={{ ...sx }}>
            <Box
                ref={ref}
                sx={{
                    whiteSpace: "pre-wrap",   // ✅ keeps \n exactly like LinkedIn
                    wordBreak: "break-word",  // ✅ prevents long URL overflow
                    ...(expanded
                        ? {}
                        : {
                            display: "-webkit-box",
                            WebkitLineClamp: lines,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }),
                }}
            >
                {text}
            </Box>

            {showToggle && (
                <Button
                    size="small"
                    onClick={() => setExpanded((v) => !v)}
                    sx={{ textTransform: "none", px: 0, mt: 0.5, color: "#0ea5a4" }}
                >
                    {expanded ? "See less" : "See more"}
                </Button>
            )}
        </Box>
    );
}


function mapFeedPollToPost(row) {
    const m = row?.metadata || {};
    const t = (m.type || row.type || "").toLowerCase();
    if (t !== "poll") return null;

    const opts = Array.isArray(m.options)
        ? m.options.map((o) => ({
            id: o?.id ?? o?.option_id ?? null,
            label: o?.text ?? o?.label ?? String(o),
            votes: typeof o?.vote_count === "number" ? o.vote_count : (typeof o?.votes === "number" ? o.votes : 0),
        }))
        : [];

    const gidRaw = row?.group_id ?? m.group_id ?? m.groupId ?? m.group?.id;
    const gid = Number(gidRaw) || null;

    // 👇 real poll id coming from metadata
    const pollId = Number(m.poll_id ?? row.poll_id ?? null) || null;

    return {
        id: Number(row.id),              // feed item id (keep for UI keys)
        feed_item_id: Number(row.id),    // feed item id
        poll_id: pollId,                 // 👈 add this
        type: "poll",
        question: m.question ?? m.title ?? row.title ?? row.text ?? "",
        options: opts,
        user_votes: Array.isArray(m.user_votes) ? m.user_votes : [],
        is_closed: Boolean(m.is_closed),
        created_at: row.created_at || m.created_at || row.createdAt || new Date().toISOString(),
        created_by: row.created_by || row.user || row.actor || null,
        hidden: !!(row.is_hidden ?? m.is_hidden),
        is_hidden: !!(row.is_hidden ?? m.is_hidden),
        group_id: gid,
        moderation_status: row.moderation_status ?? m.moderation_status ?? row.moderationStatus ?? m.moderationStatus ?? row.status ?? m.status ?? null,
        is_removed: row.is_removed ?? m.is_removed ?? (row.moderation_status === "removed") ?? (m.moderationStatus === "removed") ?? (m.status === "removed") ?? (row.status === "removed") ?? false,
    };
}

// --- Voters Dialog Component (Adapted from AdminPostsPage) ---
function PollVotersDialog({ open, onClose, option, postId }) {
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);
    const [anonymous, setAnonymous] = React.useState(false);

    React.useEffect(() => {
        if (!open || !option?.id) return;
        setLoading(true);
        setRows([]);
        setAnonymous(false);

        (async () => {
            try {
                const token = getToken();
                const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const res = await fetch(`${API_ROOT}/activity/feed/polls/options/${option.id}/votes/`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setAnonymous(!!data.anonymous);
                    const raw = Array.isArray(data.results) ? data.results : [];
                    setRows(raw.map(r => {
                        const u = r.user || r.voter || r;
                        return {
                            id: u.id || u.user_id,
                            name: u.name || u.full_name || u.username || `User #${u.id}`,
                            avatar: toAbs(u.avatar || u.photo || u.profile_image || ""),
                            votedAt: r.voted_at || r.created_at
                        };
                    }));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [open, option?.id]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6">Voters</Typography>
                <Typography variant="subtitle2" color="text.secondary" noWrap>
                    For: {option?.label || option?.text || "Option"}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Stack alignItems="center" py={3}><CircularProgress size={24} /></Stack>
                ) : anonymous ? (
                    <Alert severity="info" variant="outlined">Anonymous poll — voter list hidden.</Alert>
                ) : rows.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={2}>No voters found (or hidden).</Typography>
                ) : (
                    <List dense disablePadding>
                        {rows.map((u, i) => (
                            <ListItem key={u.id || i}>
                                <ListItemAvatar>
                                    <Avatar src={u.avatar}>{(u.name || "?")[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={u.name}
                                    secondary={u.votedAt ? new Date(u.votedAt).toLocaleDateString() : null}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

function PollResultsBlock({ post }) {
    const options = Array.isArray(post?.options) ? post.options : [];
    const userVotes = Array.isArray(post?.user_votes) ? post.user_votes : [];
    const totalVotes = options.reduce(
        (sum, o) => sum + (typeof o?.votes === "number" ? o.votes : (o?.vote_count ?? 0)),
        0
    );
    const question = post?.question || post?.text || "";

    const [votersOpen, setVotersOpen] = React.useState(false);
    const [scannedOption, setScannedOption] = React.useState(null);

    const handleOpenVoters = (opt) => {
        setScannedOption(opt);
        setVotersOpen(true);
    };

    return (
        <Box>
            {question && (
                <Typography className="mb-1 font-medium">{question}</Typography>
            )}

            {options.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No options added yet.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {options.map((opt, idx) => {
                        const optionId = opt?.id ?? opt?.option_id ?? null;
                        const label = opt?.label ?? opt?.text ?? toStr(opt);
                        const votes = typeof opt?.votes === "number" ? opt.votes : (opt?.vote_count ?? 0);
                        const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const chosen = optionId != null && userVotes.includes(optionId);
                        const hasVotes = votes > 0;

                        return (
                            <Paper
                                key={optionId ?? `${label}-${idx}`}
                                variant="outlined"
                                sx={{
                                    p: 1,
                                    borderRadius: 2,
                                    borderColor: "#e2e8f0",
                                    bgcolor: chosen ? "action.selected" : "background.paper",
                                }}
                            >
                                <Stack spacing={0.5}>
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {label}
                                            </Typography>
                                            {chosen && (
                                                <Chip
                                                    size="small"
                                                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                                                    label="Your vote"
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {percent}%
                                            </Typography>
                                            {hasVotes && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ py: 0, px: 1, minWidth: "auto", height: 24, fontSize: "0.7rem", textTransform: "none" }}
                                                    onClick={() => handleOpenVoters(opt)}
                                                >
                                                    Voters
                                                </Button>
                                            )}
                                        </Stack>
                                    </Stack>
                                    <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 1 }} />
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Total votes: {totalVotes} vote{totalVotes === 1 ? "" : "s"}{post?.is_closed ? " | Poll closed" : ""}
            </Typography>

            <PollVotersDialog
                open={votersOpen}
                onClose={() => setVotersOpen(false)}
                option={scannedOption}
                postId={post.id}
            />
        </Box>
    );
}


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

// ---- Edit Dialog (match screenshot fields) ----
function EditGroupDialog({ open, group, onClose, onUpdated }) {
    const token = getToken();

    // form state
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
    const isSubgroup = !!(group?.parent_id || group?.parent?.id || group?.parent);
    const [parentVis, setParentVis] = React.useState("");

    // hydrate from loaded group
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

        setLocalPreview(group.cover_image ? toAbs(group.cover_image) : "");
        setImageFile(null);
        setRemoveImage(false);

        setLogoPreview(group.logo ? toAbs(group.logo) : "");
        setLogoFile(null);
        setRemoveLogo(false);

        setErrors({});
    }, [group]);

    // robustly determine parent visibility (needed for policy constraints)
    React.useEffect(() => {
        if (!group || !open || !isSubgroup) {
            setParentVis("");
            return;
        }
        // 1. If parent object is fully loaded with visibility
        const pv = group.parent?.visibility;
        if (pv) {
            setParentVis(pv.toLowerCase());
            return;
        }
        // 2. Fetch parent if we only have ID
        const pid = group.parent_id || group.parent?.id || (typeof group.parent === "object" ? null : group.parent);
        if (!pid) return;

        let active = true;
        fetch(`${API_ROOT}/groups/${pid}/`, {
            headers: { Authorization: token ? `Bearer ${token}` : undefined }
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (active && d?.visibility) setParentVis(d.visibility.toLowerCase());
            })
            .catch(() => { });
        return () => { active = false; };
    }, [group, open, isSubgroup, token]);

    const isParentPrivate = parentVis === "private";

    // if Private → force Invite-only (optional safety)
    React.useEffect(() => {
        if (visibility === "private" && joinPolicy !== "invite") {
            setJoinPolicy("invite");
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

            // flexible policy: always send visibility/join_policy
            // logic: server defaults to parent's if missing, but we want to override
            fd.append("visibility", visibility);
            fd.append("join_policy", joinPolicy);

            if (imageFile) fd.append("cover_image", imageFile, imageFile.name);
            if (removeImage) fd.append("remove_cover_image", "1");

            if (logoFile) fd.append("logo", logoFile, logoFile.name);
            if (removeLogo) fd.append("remove_logo", "1");

            const idOrSlug = group.slug || group.id;
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                method: "PATCH",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    json?.detail ||
                    Object.entries(json)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join(" | ") ||
                    `HTTP ${res.status}`;
                throw new Error(msg);
            }
            onUpdated?.({ ...json, _cache: Date.now() });
            onClose?.();
        } catch (e) {
            setErrors((prev) => ({ ...prev, __all__: String(e?.message || e) }));
        } finally {
            setSubmitting(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ className: "rounded-2xl" }}
        >
            <DialogTitle className="font-extrabold">Edit Group</DialogTitle>

            <DialogContent dividers>
                {errors.__all__ && (
                    <Alert severity="error" className="mb-3">
                        {errors.__all__}
                    </Alert>
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

                <Grid container spacing={3} columns={{ xs: 12, md: 12 }}>
                    <Grid xs={12} md={7}>
                        <TextField
                            label="Description *"
                            multiline
                            minRows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            className="mb-3"
                            error={!!errors.description}
                            helperText={errors.description}
                        />

                        {/* Visibility (Flexible: allow Private Subgroup in Public Parent) */}
                        <CustomSelect
                            label="Visibility"
                            value={visibility}
                            onChange={(val) => {
                                setVisibility(val);
                                // Strict Policy Enforcement:
                                // 1. If switching to PRIVATE -> Must be Invite Only.
                                if (val === "private") {
                                    setJoinPolicy("invite");
                                }
                                // 2. If switching to PUBLIC and Parent is PRIVATE -> Must be Approval (no open).
                                if (val === "public" && isParentPrivate) {
                                    setJoinPolicy("approval");
                                }
                            }}
                            // Constraint: User wants to allow Public Subgroups under Private Parents (restricted to Approval)
                            // So we do NOT disable Public option.
                            disabled={false}
                            helperText={
                                (isSubgroup && isParentPrivate)
                                    ? "Public subgroups of private groups will require approval to join."
                                    : "You can make this subgroup private even if the parent is public."
                            }
                            options={[
                                { label: "Public (anyone can find & request to join)", value: "public" },
                                { label: "Private (invite-only)", value: "private" }
                            ]}
                        />

                        {/* Join Policy (Flexible) */}
                        <CustomSelect
                            label="Join Policy"
                            value={joinPolicy}
                            onChange={(val) => setJoinPolicy(val)}
                            disabled={visibility === "private"}
                            helperText={visibility === "private" ? "Private groups are invite-only." : ""}
                            options={
                                visibility === "public"
                                    ? (
                                        (isSubgroup && isParentPrivate)
                                            ? [{ label: "Approval required", value: "approval" }]
                                            : [
                                                { label: "Open (join instantly)", value: "open" },
                                                { label: "Approval required", value: "approval" }
                                            ]
                                    )
                                    : [
                                        { label: "Invite only", value: "invite" }
                                    ]
                            }
                        />
                    </Grid>

                    <Grid xs={12} md={5}>
                        <Box className="flex flex-col gap-6">
                            {/* Logo Upload */}
                            <div>
                                <Typography variant="subtitle1" className="font-semibold">
                                    Logo / Icon
                                </Typography>
                                <Typography variant="caption" className="text-slate-500 block mb-2">
                                    Recommended 200×200px (Square)
                                </Typography>

                                <Box className="flex items-center gap-4">
                                    <Box
                                        className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center overflow-hidden"
                                        sx={{ width: 100, height: 100, position: "relative" }}
                                    >
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt="logo"
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        ) : (
                                            <Stack alignItems="center" spacing={0.5}>
                                                <ImageRoundedIcon fontSize="small" />
                                                <Typography variant="caption" className="text-slate-600 text-[10px]">
                                                    Icon
                                                </Typography>
                                            </Stack>
                                        )}
                                        <input
                                            id="group-edit-logo-file-manage"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => onPickLogo(e.target.files?.[0])}
                                        />
                                    </Box>

                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="group-edit-logo-file-manage">
                                            <Button
                                                component="span"
                                                size="small"
                                                variant="outlined"
                                                startIcon={<InsertPhotoRoundedIcon />}
                                            >
                                                Upload Icon
                                            </Button>
                                        </label>
                                        <Button
                                            size="small"
                                            variant="text"
                                            color="error"
                                            onClick={() => {
                                                setRemoveLogo(true);
                                                setLogoFile(null);
                                                setLogoPreview("");
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </Box>
                            </div>

                            {/* Cover Image */}
                            <div>
                                <Typography variant="subtitle1" className="font-semibold">
                                    Cover Image
                                </Typography>
                                <Typography variant="caption" className="text-slate-500 block mb-2">
                                    Recommended 650×365px • Max 50 MB
                                </Typography>

                                <Box
                                    className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                                    sx={{ height: 200, position: "relative", overflow: "hidden" }}
                                >
                                    {localPreview ? (
                                        <img
                                            src={localPreview}
                                            alt="cover"
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        <Stack alignItems="center" spacing={1}>
                                            <ImageRoundedIcon />
                                            <Typography variant="body2" className="text-slate-600">
                                                Image Preview
                                            </Typography>
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
                                        <Button
                                            component="span"
                                            size="small"
                                            variant="outlined"
                                            startIcon={<InsertPhotoRoundedIcon />}
                                        >
                                            Upload
                                        </Button>
                                    </label>
                                    <Button
                                        size="small"
                                        variant="text"
                                        color="error"
                                        onClick={() => {
                                            setRemoveImage(true);
                                            setImageFile(null);
                                            setLocalPreview("");
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </Stack>
                            </div>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions className="px-6 py-4">
                <Button onClick={onClose} className="rounded-xl" sx={{ textTransform: "none" }}>
                    Cancel
                </Button>
                <Button
                    onClick={submit}
                    disabled={submitting}
                    variant="contained"
                    className="rounded-xl"
                    sx={{
                        textTransform: "none",
                        backgroundColor: "#10b8a6",
                        "&:hover": { backgroundColor: "#0ea5a4" },
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ---- Image-only Dialog ----
// ---- Image-only Dialog (Generic for Logo or Cover) ----
function GroupImageDialog({ open, group, onClose, type = "cover", onUpdated }) {
    const token = getToken();
    const [imageFile, setImageFile] = React.useState(null);
    const [localPreview, setLocalPreview] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");

    const isLogo = type === "logo";
    const title = isLogo ? "Edit Group Icon" : "Edit Cover Image";
    const fieldName = isLogo ? "logo" : "cover_image";

    React.useEffect(() => {
        if (!open || !group) return;
        setImageFile(null);
        const initialUrl = isLogo ? group.logo : group.cover_image;
        setLocalPreview(initialUrl ? toAbs(initialUrl) : "");
        setError("");
    }, [open, group, isLogo]);

    const onPickFile = (file) => {
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setLocalPreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const submit = async () => {
        if (!group) return;
        if (!imageFile) {
            setError("Please choose an image.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const fd = new FormData();
            fd.append(fieldName, imageFile, imageFile.name);
            const idOrSlug = group.slug || group.id;
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                method: "PATCH",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    json?.detail ||
                    Object.entries(json)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join(" | ") ||
                    `HTTP ${res.status}`;
                throw new Error(msg);
            }
            onUpdated?.({ ...json, _cache: Date.now() });
            onClose?.();
        } catch (e) {
            setError(String(e?.message || e));
        } finally {
            setSubmitting(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ className: "rounded-2xl" }}>
            <DialogTitle className="font-extrabold pb-1">{title}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" className="mb-3">
                        {error}
                    </Alert>
                )}

                <Stack spacing={3} alignItems="center" py={2}>
                    <Box
                        sx={{
                            width: isLogo ? 120 : "100%",
                            height: isLogo ? 120 : 200,
                            borderRadius: isLogo ? "50%" : 2,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            position: "relative",
                            bgcolor: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {localPreview ? (
                            <img
                                src={localPreview}
                                alt="preview"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        ) : (
                            <ImageRoundedIcon sx={{ fontSize: 40, color: "#cbd5e1" }} />
                        )}
                    </Box>

                    <Box textAlign="center">
                        <Typography variant="body2" className="text-slate-500 mb-2">
                            {isLogo ? "Recommended 200×200px (Square)" : "Recommended 650×365px"}
                        </Typography>

                        <input
                            id="group-image-file-input"
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                        />
                        <label htmlFor="group-image-file-input">
                            <Button component="span" variant="outlined" startIcon={<InsertPhotoRoundedIcon />}>
                                Choose Image
                            </Button>
                        </label>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions className="px-6 py-4">
                <Button onClick={onClose} disabled={submitting} className="rounded-xl" sx={{ textTransform: "none" }}>
                    Cancel
                </Button>
                <Button
                    onClick={submit}
                    variant="contained"
                    disabled={submitting || !imageFile}
                    className="rounded-xl"
                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                >
                    {submitting ? "Saving..." : "Save Changes"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


function AddMembersDialog({ open, onClose, groupIdOrSlug, existingIds, onAdded, ownerId }) {
    const token = getToken();
    const [q, setQ] = React.useState("");
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [selected, setSelected] = React.useState(new Set());

    const toggle = (id) => {
        if (id === ownerId) return; // 👈 safety
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const fetchUsers = React.useCallback(async () => {
        setLoading(true); setError("");
        try {
            // If you have a different user search endpoint, swap URL below.
            const res = await fetch(`${API_ROOT}/users-lookup/?search=${encodeURIComponent(q)}&limit=30`, {
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const json = await res.json().catch(() => ([]));
            if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
            const exist = new Set(existingIds || []);
            const filtered = (Array.isArray(json) ? json : [])
                .filter(u => u?.id !== ownerId)       // 👈 hide owner from picker
                .filter(u => !exist.has(u.id));       // already-in-group filter
            setRows(filtered);
        } catch (e) {
            setError(String(e?.message || e));
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [q, token, existingIds]);

    React.useEffect(() => { if (open) fetchUsers(); }, [open, fetchUsers]);

    const submit = async () => {
        if (selected.size === 0) return;
        await fetch(`${API_ROOT}/groups/${groupIdOrSlug}/members/add-member/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ user_ids: Array.from(selected) }),
        });
        onAdded?.(selected.size);
        onClose?.();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
            <DialogTitle className="font-extrabold">Add members</DialogTitle>
            <DialogContent dividers>
                <TextField
                    placeholder="Search users…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    fullWidth
                    size="small"
                    className="mb-3"
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                />

                {loading ? (
                    <>
                        <LinearProgress />
                        <Typography className="mt-2 text-slate-500">Searching…</Typography>
                    </>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : rows.length === 0 ? (
                    <Typography className="text-slate-500">No users found.</Typography>
                ) : (
                    <Stack spacing={1} divider={<Divider />}>
                        {rows.map((u) => {
                            const checked = selected.has(u.id);
                            return (
                                <Stack
                                    key={u.id}
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                    className="py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1"
                                    onClick={() => toggle(u.id)}
                                >
                                    <input type="checkbox" checked={checked} readOnly />
                                    <Avatar src={toAbs(u.avatar)}>
                                        {(u.name || u.email || "U").slice(0, 1).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography className="font-medium">{u.name || u.email || u.id}</Typography>
                                        {u.email && <Typography variant="caption" className="text-slate-500">{u.email}</Typography>}
                                    </Box>
                                </Stack>
                            );
                        })}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ position: 'sticky', bottom: 0, background: 'white' }} className="px-6 py-4">
                <Typography sx={{ flex: 1 }} className="text-slate-600">
                    {selected.size} selected
                </Typography>
                <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
                <Button
                    onClick={submit}
                    disabled={selected.size === 0}
                    variant="contained"
                    className="rounded-xl"
                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                >
                    Add {selected.size > 0 ? `(${selected.size})` : ""}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function RequestAddMembersDialog({ open, onClose, groupIdOrSlug, existingIds, onRequested, ownerId }) {
    const token = getToken();

    const [q, setQ] = React.useState("");
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [selected, setSelected] = React.useState(new Set());

    const toggle = (id) => {
        if (id === ownerId) return;
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const USER_SEARCH_ENDPOINTS = [
        (q) => `${API_ROOT}/users-lookup/?search=${encodeURIComponent(q)}&limit=30`, // ✅ the one AddMembersDialog uses
        (q) => `${API_ROOT}/users/?search=${encodeURIComponent(q)}&limit=30`,
        (q) => `${API_ROOT}/users/search/?q=${encodeURIComponent(q)}&limit=30`,
        (q) => `${API_ROOT}/accounts/users/?search=${encodeURIComponent(q)}&limit=30`,
    ];

    const fetchUsers = React.useCallback(async () => {
        if (!open) return;
        const term = (q || "").trim(); // can be empty

        setLoading(true);
        setError("");

        try {
            // Prefer the same endpoint used by the admin AddMembersDialog
            const primaryUrl = `${API_ROOT}/users-lookup/?search=${encodeURIComponent(term)}&limit=30`;
            let res = await fetch(primaryUrl, {
                headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });

            // Fallbacks only if primary fails
            if (!res.ok) {
                for (const makeUrl of USER_SEARCH_ENDPOINTS.slice(1)) {
                    res = await fetch(makeUrl(term), {
                        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    });
                    if (res.ok) break;
                }
            }

            const json = await res.json().catch(() => ([]));
            if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

            const items = Array.isArray(json?.results) ? json.results : (Array.isArray(json) ? json : []);
            const exist = new Set(existingIds || []);
            setRows(
                items
                    .filter((u) => u?.id !== ownerId)   // 👈 hide owner from picker
                    .filter((u) => !exist.has(u.id))    // exclude already-in-group/pending
            );
        } catch (e) {
            setError(String(e?.message || e));
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [open, q, token, existingIds]);


    React.useEffect(() => { if (open) fetchUsers(); }, [open, fetchUsers]);

    const submit = async () => {
        if (selected.size === 0) return;

        // ignore owner id if somehow selected
        const ids = Array.from(selected).map(Number).filter((x) => x !== Number(ownerId));
        if (ids.length === 0) return;
        const url = `${API_ROOT}/groups/${groupIdOrSlug}/moderator/request-add-members/`;
        const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        // include group_id in body if the path param is numeric (backend allows it as a sanity check)
        const groupIdInt = Number(groupIdOrSlug);
        const maybeGroupId = Number.isFinite(groupIdInt) ? { group_id: groupIdInt } : {};

        try {
            // 1) Try bulk first (for backends that accept user_ids)
            const bulkBody = JSON.stringify({ user_ids: ids, ...maybeGroupId });
            let res = await fetch(url, { method: "POST", headers, body: bulkBody });
            let j = await res.json().catch(() => ({}));

            // 2) If backend says "user_id is required" (no bulk), send one request per user_id
            const needsSingle =
                !res.ok &&
                (String(j?.detail || "").toLowerCase().includes("user_id is required") ||
                    j?.user_id === "This field is required.");

            if (needsSingle) {
                // fire requests sequentially to keep error handling simple
                for (const uid of ids) {
                    const body = JSON.stringify({ user_id: uid, ...maybeGroupId });
                    const r = await fetch(url, { method: "POST", headers, body });
                    if (!r.ok) {
                        const jj = await r.json().catch(() => ({}));
                        throw new Error(jj?.detail || `HTTP ${r.status}`);
                    }
                }
            } else if (!res.ok) {
                // some other error
                throw new Error(j?.detail || `HTTP ${res.status}`);
            }

            onRequested?.(ids.length);
            onClose?.();
        } catch (e) {
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
            <DialogTitle className="font-extrabold">Request to add members</DialogTitle>
            <DialogContent dividers>
                <TextField
                    placeholder="Search users…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    fullWidth
                    size="small"
                    className="mb-3"
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                />

                {loading ? (
                    <>
                        <LinearProgress />
                        <Typography className="mt-2 text-slate-500">Searching…</Typography>
                    </>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : rows.length === 0 ? (
                    <Typography className="text-slate-500">No users found.</Typography>
                ) : (
                    <Stack spacing={1} divider={<Divider />}>
                        {rows.map((u) => {
                            const checked = selected.has(u.id);
                            return (
                                <Stack
                                    key={u.id}
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                    className="py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1"
                                    onClick={() => toggle(u.id)}
                                >
                                    <input type="checkbox" checked={checked} readOnly />
                                    <Avatar src={toAbs(u.avatar)}>
                                        {(u.name || u.email || "U").slice(0, 1).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography className="font-medium">{u.name || u.email || u.id}</Typography>
                                        {u.email && <Typography variant="caption" className="text-slate-500">{u.email}</Typography>}
                                    </Box>
                                </Stack>
                            );
                        })}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ position: 'sticky', bottom: 0, background: 'white' }} className="px-6 py-4">
                <Typography sx={{ flex: 1 }} className="text-slate-600">
                    {selected.size} selected
                </Typography>
                <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
                <Button
                    onClick={submit} disabled={selected.size === 0}
                    variant="contained"
                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                >
                    Send request
                </Button>
            </DialogActions>
        </Dialog>
    );
}


// ---- Add Sub-group Dialog (same UI as Create Group) ----
function AddSubgroupDialog({ open, onClose, parentGroup, onCreated }) {
    const token = getToken();

    const [name, setName] = React.useState("");
    const [slug, setSlug] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [visibility, setVisibility] = React.useState("public");  // public | private
    const [joinPolicy, setJoinPolicy] = React.useState("open");

    // Constraint logic:
    // If Parent is Private, we don't force Private anymore, but we limit the Join Policy options.
    const isParentPrivate = (parentGroup?.visibility || "").toLowerCase() === "private";

    // However, we should probably set a safe default if not set.
    React.useEffect(() => {
        if (isParentPrivate) {
            // User wants "Public - Approval required" or "Private - Invite only".
            // Let's default to Public+Approval if they haven't chosen yet, or just leave defaults.
            // Actually, staying with 'public'+'open' default might be misleading if 'open' is forbidden.
            // So if Parent is Private, default to "approval" if visibility is public.
            if (visibility === "public" && joinPolicy === "open") {
                setJoinPolicy("approval");
            }
        }
    }, [isParentPrivate, open, visibility]);
    const [imageFile, setImageFile] = React.useState(null);
    const [localPreview, setLocalPreview] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    const slugify = (s) =>
        (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const onNameChange = (v) => {
        setName(v);
        // mirror Create Group behavior: auto-fill slug (hidden)
        if (!slug || slug === slugify(name)) setSlug(slugify(v));
    };

    const onPickFile = (file) => {
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setLocalPreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = "Required";
        if (!slug.trim()) e.slug = "Required";
        if (!description.trim()) e.description = "Required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async () => {
        if (!parentGroup || !validate()) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("slug", slug.trim());
            fd.append("description", description.trim());

            // Flexible Policy: Use user selection
            fd.append("visibility", visibility);
            fd.append("join_policy", joinPolicy);

            fd.append("parent_id", String(parentGroup.id));
            if (parentGroup?.community?.id) fd.append("community_id", String(parentGroup.community.id));
            if (parentGroup?.community_id) fd.append("community_id", String(parentGroup.community_id));
            if (imageFile) fd.append("cover_image", imageFile, imageFile.name);

            const res = await fetch(`${API_ROOT}/groups/`, {
                method: "POST",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    json?.detail ||
                    Object.entries(json || {})
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join(" | ") ||
                    `HTTP ${res.status}`;
                throw new Error(msg);
            }

            onCreated?.({ ...json, _cache: Date.now() });
            // reset form
            setName(""); setSlug(""); setDescription("");
            setVisibility("public"); setJoinPolicy("open");
            setImageFile(null); setLocalPreview("");
            onClose?.();
        } catch (e) {
            alert(String(e?.message || e));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
            <DialogTitle className="font-extrabold">Create Sub-group</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" className="text-slate-500 mb-4">
                    *Required fields are marked with an asterisk
                </Typography>

                <Box className="flex items-start gap-3 mb-4">
                    <Avatar sx={{ bgcolor: "#10b8a6", width: 40, height: 40 }} />
                    <TextField
                        label="Group Name *"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name}
                        className="mb-3"
                    />
                </Box>

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

                        {/* Visibility (Flexible) */}
                        <TextField
                            label="Visibility"
                            select
                            fullWidth
                            className="mb-3"
                            value={visibility}
                            onChange={(e) => {
                                setVisibility(e.target.value);
                                // if switching to private, force invite
                                if (e.target.value === "private") setJoinPolicy("invite");
                                // if switching to public and parent is private, force approval (no open)
                                if (e.target.value === "public" && isParentPrivate) setJoinPolicy("approval");
                            }}
                            disabled={false} // Allow specific combinations
                            helperText={isParentPrivate ? "Public subgroups of private parents require approval." : "Private subgroups can be created inside public groups."}
                        >
                            <MenuItem value="public">Public (anyone can find & request to join)</MenuItem>
                            <MenuItem value="private">Private (invite-only)</MenuItem>
                        </TextField>

                        {/* Join Policy */}
                        <TextField
                            label="Join Policy"
                            select
                            fullWidth
                            className="mb-3"
                            value={joinPolicy}
                            onChange={(e) => setJoinPolicy(e.target.value)}
                            // logic:
                            // 1. If Vis=Private => Only Invite (disable others? or just hide?)
                            // 2. If Vis=Public & Parent=Private => Only Approval (disable Open)
                            helperText={
                                visibility === "private" ? "Private groups are invite-only." :
                                    (isParentPrivate ? "Public subgroups of private groups cannot be Open." : undefined)
                            }
                        >
                            <MenuItem
                                value="open"
                                disabled={visibility === "private" || isParentPrivate}
                            >
                                Open (join instantly)
                            </MenuItem>
                            <MenuItem
                                value="approval"
                                disabled={visibility === "private"} // Private means Invite Only per user rules
                            >
                                Approval required
                            </MenuItem>
                            <MenuItem
                                value="invite"
                                // Only show/enable for Private? Logic says Public-Approval OR Private-Invite.
                                // If Vis is Public, can we have Invite? Usually no.
                                disabled={visibility === "public"}
                            >
                                Invite only
                            </MenuItem>
                        </TextField>
                        {/* hidden slug like Create Group */}
                        <Box sx={{ display: "none" }}>
                            <TextField
                                label="Slug *"
                                value={slug}
                                onChange={(e) => setSlug(slugify(e.target.value))}
                                error={!!errors.slug}
                                helperText={errors.slug}
                            />
                        </Box>
                    </div>

                    <div className="col-span-12 md:col-span-5">
                        <Typography variant="subtitle1" className="font-semibold">Group Photo</Typography>
                        <Typography variant="caption" className="text-slate-500 block mb-2">
                            Recommended 650×365px • Max 50 MB
                        </Typography>

                        <Box
                            className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                            sx={{ height: 200, position: "relative", overflow: "hidden" }}
                        >
                            {localPreview ? (
                                <img src={localPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <Stack alignItems="center" spacing={1}>
                                    <ImageRoundedIcon />
                                    <Typography variant="body2" className="text-slate-600">Image Preview</Typography>
                                </Stack>
                            )}
                            <input
                                id="subgroup-cover-input"
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                            />
                        </Box>

                        <Stack direction="row" spacing={1} className="mt-2">
                            <label htmlFor="subgroup-cover-input">
                                <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />}>
                                    Upload
                                </Button>
                            </label>
                        </Stack>
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
                    Create
                </Button>
            </DialogActions>
        </Dialog >
    );
}

// ---------- Likes/Reactions Popup (Updated with Tabs) ----------
function GroupLikesDialog({ open, onClose, groupIdOrSlug, postId }) {
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);
    const [activeFilter, setActiveFilter] = React.useState("all");

    // Helper to normalize user/reaction data
    const normalizeUsers = (payload) => {
        const arr = Array.isArray(payload) ? payload
            : Array.isArray(payload?.results) ? payload.results
                : Array.isArray(payload?.data) ? payload.data
                    : Array.isArray(payload?.items) ? payload.items
                        : [];

        return arr.map((r) => {
            // Support various user shapes (liker, actor, user, etc.)
            const u = r.user || r.actor || r.liker || r.owner || r.created_by || r;
            const id = u?.id ?? r.user_id ?? r.id;

            const name = u.name || u.full_name || u.username || (u.first_name ? `${u.first_name} ${u.last_name || ""}` : `User #${id}`);
            const avatar = toAbs(u.avatar || u.photo || u.photo_url || u.image || null);

            // Determine reaction type
            const reactionId = r.reaction || r.reaction_type || r.kind || "like";
            const def = POST_REACTIONS.find(x => x.id === reactionId) || POST_REACTIONS[0];

            return id ? { id, name, avatar, reactionId, reactionEmoji: def.emoji, reactionLabel: def.label } : null;
        }).filter(Boolean);
    };

    const load = React.useCallback(async () => {
        if (!open || !postId) return;
        setLoading(true);
        setActiveFilter("all"); // reset filter on open

        const token = getToken();
        const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        const fid = Number(postId);

        // Try both endpoints to gather all reactions
        const urls = [
            `${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${fid}&page_size=200`,
            `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${fid}`,
        ];

        let collected = [];
        for (const url of urls) {
            try {
                const r = await fetch(url, { headers });
                if (!r.ok) continue;
                const j = await r.json().catch(() => ({}));
                collected.push(...normalizeUsers(j));
                if (collected.length > 0) break; // Use first successful non-empty response
            } catch { }
        }

        // De-duplicate by User ID
        const seen = new Set();
        const unique = [];
        for (const row of collected) {
            if (!seen.has(row.id)) {
                seen.add(row.id);
                unique.push(row);
            }
        }

        setRows(unique);
        setLoading(false);
    }, [open, postId]);

    React.useEffect(() => { load(); }, [load]);

    // Filter logic
    const filteredRows = activeFilter === "all"
        ? rows
        : rows.filter(r => r.reactionId === activeFilter);

    // Count per reaction type
    const reactionCounts = { all: rows.length };
    rows.forEach(u => {
        if (!u.reactionId) return;
        reactionCounts[u.reactionId] = (reactionCounts[u.reactionId] || 0) + 1;
    });

    return (
        <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Reactions</DialogTitle>
            <DialogContent dividers>
                {/* Tabs for filtering */}
                <Box sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}>
                    <Tabs
                        value={activeFilter}
                        onChange={(_, v) => setActiveFilter(v)}
                        variant="scrollable"
                        allowScrollButtonsMobile
                        sx={{ minHeight: 40 }}
                    >
                        <Tab
                            value="all"
                            label={`All (${reactionCounts.all || 0})`}
                            sx={{ minHeight: 40, py: 1 }}
                        />
                        {POST_REACTIONS.map((r) => (
                            <Tab
                                key={r.id}
                                value={r.id}
                                sx={{ minHeight: 40, py: 1 }}
                                label={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <span>{r.emoji}</span>
                                        <span style={{ fontSize: 12 }}>({reactionCounts[r.id] || 0})</span>
                                    </Box>
                                }
                            />
                        ))}
                    </Tabs>
                </Box>

                {loading ? (
                    <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
                ) : filteredRows.length === 0 ? (
                    <Typography color="text.secondary" sx={{ p: 2 }}>No reactions yet.</Typography>
                ) : (
                    <List dense>
                        {filteredRows.map((u, i) => (
                            <ListItem key={u.id || i}>
                                <ListItemAvatar><Avatar src={u.avatar} /></ListItemAvatar>
                                <ListItemText primary={u.name} />
                                {u.reactionEmoji && (
                                    <Tooltip title={u.reactionLabel || ""}>
                                        <Box sx={{ fontSize: 20 }}>{u.reactionEmoji}</Box>
                                    </Tooltip>
                                )}
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}


// ---------- Shares Popup ----------
function GroupSharesDialog({ open, onClose, groupIdOrSlug, postId }) {
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    const load = React.useCallback(async () => {
        if (!open || !postId) return;
        setLoading(true);

        const token = getToken();
        const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const fid = Number(postId);
        const urls = [
            `${API_ROOT}/engagements/shares/?target_type=activity_feed.feeditem&target_id=${fid}&page_size=200`,
            `${API_ROOT}/engagements/shares/?feed_item=${fid}&page_size=200`,
        ];

        let got = [];
        for (const url of urls) {
            try {
                const r = await fetch(url, { headers });
                if (!r.ok) continue;
                const j = await r.json().catch(() => []);
                const arr = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : j?.data || []);
                if (arr && arr.length >= 0) {
                    got = arr.map((it) => {
                        const u = it.user || it.actor || it.shared_by || it;
                        return {
                            id: u.id ?? it.id,
                            name: u.name || u.full_name || u.username || `User #${u.id ?? it.id ?? ""}`,
                            avatar: u.avatar || u.photo || u.photo_url || u.image || null,
                        };
                    });
                    break;
                }
            } catch { }
        }

        setRows(got);
        setLoading(false);
    }, [open, postId]);


    React.useEffect(() => { load(); }, [load]);

    return (
        <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Shares</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
                ) : rows.length === 0 ? (
                    <Typography color="text.secondary">No shares yet.</Typography>
                ) : (
                    <List>
                        {rows.map((u, i) => {
                            const user = u.user || u;
                            return (
                                <ListItem key={user.id ?? i}>
                                    <ListItemAvatar><Avatar src={user.avatar} /></ListItemAvatar>
                                    <ListItemText primary={user.name || user.username || `User #${user.id}`} />
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

// ---------- Comments Popup (threaded, like, reply, delete by author or group owner) ----------
function GroupCommentsDialog({
    open,
    onClose,
    groupIdOrSlug,
    postId,
    groupOwnerId,
    onBumpCount,
    // NEW props for Instagram/LinkedIn style
    inline = false,
    initialCount = 3,
    inputRef = null,
}) {
    const [loading, setLoading] = React.useState(false);
    const [me, setMe] = React.useState(null);
    const [items, setItems] = React.useState([]);
    const [text, setText] = React.useState("");
    const [replyTo, setReplyTo] = React.useState(null);
    const [visibleCount, setVisibleCount] = React.useState(initialCount);
    // DELETE CONFIRMATION State
    const [confirmDelId, setConfirmDelId] = React.useState(null);
    const [delBusy, setDelBusy] = React.useState(false);

    // add just once inside GroupCommentsDialog
    const authHeader = () => (getToken() ? { Authorization: `Bearer ${getToken()}` } : {});

    // fetch current user (for delete permission)
    const fetchMe = React.useCallback(async () => {
        try {
            const r = await fetch(`${API_ROOT}/users/me/`, {
                headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
            });
            setMe(r.ok ? await r.json() : {});
        } catch {
            setMe({});
        }
    }, []);
    // --- add: comment normalizer + small parallel runner ---
    const normalizeCommentRow = (c) => {
        const parent_id =
            c.parent_id ??
            (typeof c.parent === "number" ? c.parent :
                (typeof c.parent === "object" ? c.parent?.id : null)) ??
            c.parentId ?? null;

        const rawAuthor = c.author || c.user || c.created_by || c.owner || {};
        const author_id = rawAuthor.id ?? c.author_id ?? c.user_id ?? c.created_by_id ?? null;

        const name =
            rawAuthor.name || rawAuthor.full_name ||
            (rawAuthor.first_name || rawAuthor.last_name
                ? `${rawAuthor.first_name || ""} ${rawAuthor.last_name || ""}`.trim()
                : rawAuthor.username) ||
            (author_id ? `User #${author_id}` : "User");

        const avatar = rawAuthor.avatar || rawAuthor.profile?.avatar || c.author_avatar || "";

        return { ...c, parent_id, author_id, author: { id: author_id, name, avatar } };
    };

    async function runLimited(items, limit, worker) {
        const out = new Array(items.length); let i = 0; const pool = new Set();
        async function one(idx) {
            const p = worker(items[idx])
                .then(res => { out[idx] = res; })
                .finally(() => pool.delete(p));
            pool.add(p);
            if (pool.size >= limit) await Promise.race(pool);
        }
        while (i < items.length) await one(i++);
        await Promise.all(pool);
        return out;
    }
    // --- end add ---

    const load = React.useCallback(async () => {
        if (!open) return;
        setLoading(true);
        try {
            // 1) fetch root comments for this feed item
            const rootsRes = await fetch(
                `${API_ROOT}/engagements/comments/?target_type=activity_feed.feeditem&target_id=${postId}&page_size=200`,
                { headers: { Accept: "application/json", ...authHeader() } }
            );
            const rootsJson = rootsRes.ok ? await rootsRes.json() : [];
            const roots = (Array.isArray(rootsJson?.results) ? rootsJson.results : Array.isArray(rootsJson) ? rootsJson : [])
                .map(normalizeCommentRow);

            // 2) fetch replies for each root (parallel, throttled)
            const replyUrls = roots.map(root =>
                `${API_ROOT}/engagements/comments/?parent=${root.id}&page_size=200`
            );
            const replyPages = await runLimited(replyUrls, 3, async (url) => {
                try {
                    const rr = await fetch(url, { headers: { Accept: "application/json", ...authHeader() } });
                    return rr.ok ? await rr.json() : [];
                } catch { return []; }
            });
            const replies = replyPages.flatMap(pg => {
                const arr = Array.isArray(pg?.results) ? pg.results : (Array.isArray(pg) ? pg : []);
                return arr.map(normalizeCommentRow);
            });

            setItems([...roots, ...replies]);
        } catch {
            setItems([]);
        }
        setLoading(false);
    }, [open, postId]);

    React.useEffect(() => {
        if (inline || open) {
            fetchMe();
            load();
        }
    }, [inline, open, fetchMe, load]);


    // build threaded tree
    const roots = React.useMemo(() => {
        const map = new Map();
        (items || []).forEach(c => map.set(c.id, { ...c, children: [] }));
        map.forEach(c => {
            if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).children.push(c);
        });
        // newest roots first
        return [...map.values()]
            .filter(c => !c.parent_id)
            .sort((a, b) => (new Date(b.created_at || 0)) - (new Date(a.created_at || 0)));
    }, [items]);


    async function createComment(body, parentId = null) {
        if (!body?.trim()) return;
        const token = getToken();

        // engagements root or reply
        const payload = parentId
            ? { text: body.trim(), parent: parentId }
            : { text: body.trim(), target_type: "activity_feed.feeditem", target_id: postId };


        try {
            const r = await fetch(`${API_ROOT}/engagements/comments/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(payload),
            });
            if (r.ok) {
                setText("");
                setReplyTo(null);
                onBumpCount?.();
                await load();
            }
        } catch { /* ignore */ }
    }


    async function toggleCommentLike(commentId) {
        // optimistic
        setItems(curr => curr.map(c => c.id === commentId
            ? { ...c, user_has_liked: !c.user_has_liked, like_count: Math.max(0, (c.like_count || 0) + (c.user_has_liked ? -1 : +1)) }
            : c
        ));

        try {
            const res = await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
                body: JSON.stringify({ target_type: "comment", target_id: commentId, reaction: "like" }),
            });
            if (!res.ok) throw new Error();

            // re-sync counts for this comment (exactly like AdminPostsPage)
            const rc = await fetch(
                `${API_ROOT}/engagements/reactions/counts/?target_type=comment&ids=${commentId}`,
                { headers: { Accept: "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) } }
            );
            if (rc.ok) {
                const payload = await rc.json();
                const m = payload?.results?.[String(commentId)];
                if (m) {
                    setItems(curr => curr.map(c => c.id === commentId ? { ...c, like_count: m.like_count ?? 0, user_has_liked: !!m.user_has_liked } : c));
                }
            }
        } catch {
            // rollback by reloading thread
            await load();
        }
    }


    async function deleteComment(c) {
        if (!c?.id) return;
        // Open custom dialog instead of window.confirm
        setConfirmDelId(c.id);
    }

    async function performDelete() {
        if (!confirmDelId) return;
        setDelBusy(true);
        const token = getToken();
        try {
            const r = await fetch(`${API_ROOT}/engagements/comments/${confirmDelId}/`, {
                method: "DELETE",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (r.ok) {
                await load();
                setConfirmDelId(null);
            } else {
                throw new Error("Failed to delete");
            }
        } catch {
            alert("Could not delete comment.");
        } finally {
            setDelBusy(false);
        }
    }

    const deleteConfirmationDialog = (
        <Dialog
            open={!!confirmDelId}
            onClose={() => !delBusy && setConfirmDelId(null)}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>Delete Comment?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete this comment?
                    This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setConfirmDelId(null)} disabled={delBusy}>
                    Cancel
                </Button>
                <Button
                    onClick={performDelete}
                    color="error"
                    variant="contained"
                    disabled={delBusy}
                    startIcon={delBusy ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );


    const CommentItem = ({ c, depth = 0 }) => (
        <Box sx={{
            pl: depth ? 2 : 0,
            borderLeft: depth ? "2px solid #e2e8f0" : "none",
            ml: depth ? 1.5 : 0,
            mt: depth ? 1 : 0
        }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Avatar src={c.author?.avatar} sx={{ width: 28, height: 28 }} />
                <Typography variant="subtitle2">
                    {c.author?.name || c.author?.username || `User #${c.author_id}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                </Typography>
            </Stack>

            <Typography sx={{ mt: .5, whiteSpace: "pre-wrap" }}>{c.text}</Typography>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: .5 }}>
                <Button
                    size="small"
                    startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
                    onClick={() => toggleCommentLike(c.id)}
                    sx={{ color: c.user_has_liked ? "teal" : "inherit" }}
                >
                    {c.like_count ?? 0}
                </Button>
                <Button size="small" startIcon={<ReplyRoundedIcon fontSize="small" />} onClick={() => setReplyTo(c)}>
                    Reply
                </Button>
                {((me?.id || me?.user?.id) === c.author_id || (me?.id || me?.user?.id) === groupOwnerId) && (
                    <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon fontSize="small" />} onClick={() => deleteComment(c)}>Delete</Button>
                )}
            </Stack>

            {!!c.children?.length && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                    {c.children
                        .sort((a, b) => (new Date(a.created_at || 0)) - (new Date(b.created_at || 0)))  // replies oldest→newest
                        .map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
                </Stack>
            )}
        </Box>
    );

    // -------- INLINE: LinkedIn/Instagram style (always visible box) --------
    if (inline) {
        const visibleRoots = roots.slice(0, visibleCount);
        const hasMore = roots.length > visibleRoots.length;

        return (
            <Box sx={{ mt: 1 }}>
                {replyTo && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Replying to {replyTo.author?.name || `#${replyTo.author_id}`}
                        </Typography>
                        <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
                    </Stack>
                )}

                <Stack direction="row" spacing={1}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        inputRef={inputRef || undefined}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                createComment(text, replyTo?.id || null);
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={() => createComment(text, replyTo?.id || null)}
                        disabled={!text.trim()}
                    >
                        Post
                    </Button>
                </Stack>

                <Box sx={{ mt: 1.25 }}>
                    {loading ? (
                        <Stack alignItems="center" py={1.5}><CircularProgress size={18} /></Stack>
                    ) : visibleRoots.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">Be the first to comment.</Typography>
                    ) : (
                        <Stack spacing={1.25}>
                            {visibleRoots.map((c) => <CommentItem key={c.id} c={c} />)}
                        </Stack>
                    )}

                    {hasMore && (
                        <Stack alignItems="flex-start" sx={{ mt: 1 }}>
                            <Button size="small" variant="text" onClick={() => setVisibleCount(v => v + initialCount)}>
                                Load more comments
                            </Button>
                        </Stack>
                    )}
                </Box>
                {deleteConfirmationDialog}
            </Box>
        );
    }

    // -------- ORIGINAL MODAL (kept intact) --------
    return (
        <>
            <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="md">
                <DialogTitle>Comments</DialogTitle>
                <DialogContent dividers>
                    {loading ? (
                        <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
                    ) : roots.length === 0 ? (
                        <Typography color="text.secondary">No comments yet.</Typography>
                    ) : (
                        <Stack spacing={2}>{roots.map((c) => <CommentItem key={c.id} c={c} />)}</Stack>
                    )}
                </DialogContent>
                <Divider />
                <Box sx={{ px: 2, py: 1.5 }}>
                    {replyTo && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">Replying to {replyTo.author?.name || `#${replyTo.author_id}`}</Typography>
                            <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
                        </Stack>
                    )}
                    <Stack direction="row" spacing={1}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <Button variant="contained" onClick={() => createComment(text, replyTo?.id || null)}>
                            Post
                        </Button>
                    </Stack>
                </Box>
            </Dialog>
            {deleteConfirmationDialog}
        </>
    );
}

// ---------- Social row under each post (Updated with Reactions) ----------
function GroupPostSocialBar({ groupIdOrSlug, groupOwnerId, post }) {
    const [likesOpen, setLikesOpen] = React.useState(false);
    const [commentsOpen, setCommentsOpen] = React.useState(false);
    const [sharesOpen, setSharesOpen] = React.useState(false);

    // Identify Feed Item ID
    const fid = React.useMemo(() => Number(post.feed_item_id ?? post.id), [post.feed_item_id, post.id]);

    // Reaction State
    const [counts, setCounts] = React.useState({
        likes: post.like_count ?? post.metrics?.likes ?? 0,
        comments: post.comment_count ?? post.metrics?.comments ?? 0,
    });
    const [shareCount, setShareCount] = React.useState(post.share_count ?? post.metrics?.shares ?? 0);

    // "myReaction" holds the string ID (e.g., 'like', 'spot_on') or null
    const [myReaction, setMyReaction] = React.useState(
        post.my_reaction || post.user_reaction || (post.user_has_liked ? "like" : null)
    );

    // Popover State
    const [anchorEl, setAnchorEl] = React.useState(null);
    const pickerOpen = Boolean(anchorEl);

    // Liker preview (avatars)
    const [likerPreview, setLikerPreview] = React.useState([]);

    // --- Derived UI Data ---
    const myReactionDef = POST_REACTIONS.find((r) => r.id === myReaction);
    const likeBtnLabel = myReactionDef ? myReactionDef.label : "Like";
    const likeBtnEmoji = myReactionDef ? myReactionDef.emoji : "👍"; // Default emoji if no reaction
    const hasReaction = !!myReaction;
    const LikeIcon = hasReaction ? FavoriteRoundedIcon : FavoriteBorderRoundedIcon; // Fallback icon

    // Fetch fresh metrics
    const fetchCounts = React.useCallback(async () => {
        if (!fid) return;
        try {
            const token = getToken?.();
            const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            const url = `${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${fid}`;

            const res = await fetch(url, { headers });
            if (!res.ok) return;

            const j = await res.json().catch(() => ({}));
            // Handle various response shapes
            const rows = Array.isArray(j?.results) ? j.results :
                (j && typeof j === "object" && j[fid]) ? [j[fid]] : [];

            const row = rows?.[0] || {};
            const m = row.metrics || row;

            setCounts({
                likes: m.likes ?? m.like_count ?? 0,
                comments: m.comments ?? m.comment_count ?? 0
            });
            setShareCount(m.shares ?? m.share_count ?? 0);

            // Update my reaction from server
            if (row.my_reaction !== undefined) setMyReaction(row.my_reaction);
            else if (row.user_reaction !== undefined) setMyReaction(row.user_reaction);
            else if (row.user_has_liked !== undefined) {
                // If backend only gives boolean, maintain specific reaction if set locally, else "like"
                setMyReaction(row.user_has_liked ? (myReaction || "like") : null);
            }

        } catch { }
    }, [fid, myReaction]);

    // Initial Load
    React.useEffect(() => {
        fetchCounts();

        // Fetch liker preview
        (async () => {
            try {
                const token = getToken?.();
                const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const r = await fetch(`${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${fid}&page_size=3`, { headers });
                if (r.ok) {
                    const j = await r.json();
                    const arr = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
                    setLikerPreview(arr.map(it => {
                        const u = it.user || it.actor || it.liker || it;
                        return {
                            id: u.id,
                            name: u.name || u.full_name || u.username,
                            avatar: toAbs(u.avatar || u.photo)
                        };
                    }));
                }
            } catch { }
        })();
    }, [fid, fetchCounts]);

    // Handle React Logic (Optimistic + API)
    const handleReact = async (reactionId) => {
        const prevReaction = myReaction;
        const isSame = prevReaction === reactionId;

        // 1. Optimistic Update
        let delta = 0;
        if (!prevReaction && reactionId) delta = 1;        // New reaction
        else if (prevReaction && !reactionId) delta = -1;  // Removed reaction
        else if (prevReaction && reactionId && isSame) delta = -1; // Toggle off
        // else switching (no total count change)

        const newReaction = (isSame && reactionId) ? null : reactionId;

        setMyReaction(newReaction);
        setCounts(c => ({ ...c, likes: Math.max(0, c.likes + delta) }));

        // 2. API Call
        try {
            const token = getToken();
            const res = await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    target_type: "activity_feed.feeditem",
                    target_id: fid,
                    reaction: reactionId // Send specific reaction ID
                }),
            });
            if (!res.ok) throw new Error();
            await fetchCounts(); // Sync strict counts
        } catch {
            // Rollback
            setMyReaction(prevReaction);
            await fetchCounts();
        }
    };

    // Popover handlers
    const handleOpenPicker = (event) => setAnchorEl(event.currentTarget);
    const handleClosePicker = () => setAnchorEl(null);
    const bumpCommentCount = () => setCounts((c) => ({ ...c, comments: c.comments + 1 }));

    // Text for "Name and X others"
    const likeNames = likerPreview.map(l => l.name).filter(Boolean);
    let likeLine = "";
    if (counts.likes > 0) {
        if (likeNames.length === 1) {
            const others = Math.max(0, counts.likes - 1);
            likeLine = others > 0 ? `${likeNames[0]} and ${others} others` : likeNames[0];
        } else if (likeNames.length >= 2) {
            const others = Math.max(0, counts.likes - 2);
            likeLine = others > 0 ? `${likeNames[0]} and ${others} others` : `${likeNames[0]} and ${likeNames[1]}`;
        } else {
            likeLine = `${counts.likes} reactions`;
        }
    }

    return (
        <>
            {/* TOP META ROW — likers preview on left, SHARES on right */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, pb: 1 }}>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    onClick={() => setLikesOpen(true)}
                    sx={{ cursor: "pointer" }}
                >
                    <AvatarGroup
                        max={3}
                        sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 12 } }}
                    >
                        {likerPreview.slice(0, 3).map(u => (
                            <Avatar key={u.id} src={u.avatar}>{(u.name || "U").slice(0, 1).toUpperCase()}</Avatar>
                        ))}
                    </AvatarGroup>
                    {!!likeLine && (
                        <Typography variant="body2">{likeLine}</Typography>
                    )}
                </Stack>

                <Typography
                    variant="body2"
                    onClick={() => setSharesOpen(true)}
                    sx={{ cursor: "pointer", fontWeight: 700, textTransform: "uppercase", color: "#10b8a6" }}
                >
                    {shareCount} Shares
                </Typography>
            </Stack>

            {/* BOTTOM ROW — actions (REACTION / COMMENT / SHARE) */}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, pb: 1 }}>

                {/* REACTION BUTTON */}
                <Button
                    size="small"
                    onClick={handleOpenPicker}
                    sx={{
                        textTransform: "uppercase",
                        color: hasReaction ? "#10b8a6" : "inherit", // Teal if active
                        fontWeight: hasReaction ? 700 : 400,
                    }}
                    // Show Emoji if specific reaction, else Heart icon fallback
                    startIcon={hasReaction
                        ? <span style={{ fontSize: 18, lineHeight: 1, marginRight: 4 }}>{likeBtnEmoji}</span>
                        : <FavoriteBorderRoundedIcon />
                    }
                >
                    {likeBtnLabel}
                </Button>

                <Button
                    size="small"
                    startIcon={<ChatBubbleOutlineRoundedIcon />}
                    onClick={() => setCommentsOpen(true)}
                    sx={{ textTransform: "uppercase" }}
                >
                    Comment
                </Button>

                <Button
                    size="small"
                    startIcon={<IosShareRoundedIcon />}
                    onClick={() => setSharesOpen(true)}
                    sx={{ textTransform: "uppercase" }}
                >
                    Share
                </Button>
            </Stack>

            {/* REACTION PICKER POPOVER */}
            <Popover
                open={pickerOpen}
                anchorEl={anchorEl}
                onClose={handleClosePicker}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                transformOrigin={{ vertical: "bottom", horizontal: "center" }}
                disableRestoreFocus
            >
                <Box sx={{ p: 1, display: "flex", gap: 1, px: 1.5 }}>
                    {POST_REACTIONS.map((r) => (
                        <Tooltip key={r.id} title={r.label}>
                            <Box
                                onClick={() => {
                                    handleReact(r.id);
                                    handleClosePicker();
                                }}
                                sx={{
                                    cursor: "pointer",
                                    fontSize: 24,
                                    lineHeight: 1,
                                    p: 0.5,
                                    borderRadius: "50%",
                                    transition: "transform 120ms ease",
                                    "&:hover": {
                                        backgroundColor: "#f1f5f9",
                                        transform: "scale(1.2)",
                                    },
                                }}
                            >
                                {r.emoji}
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            </Popover>

            {/* Dialogs */}
            <GroupCommentsDialog
                open={commentsOpen}
                onClose={() => setCommentsOpen(false)}
                groupIdOrSlug={groupIdOrSlug}
                postId={Number(post.feed_item_id ?? post.id)}
                groupOwnerId={groupOwnerId}
                onBumpCount={bumpCommentCount}
            />

            <GroupLikesDialog
                open={likesOpen}
                onClose={() => setLikesOpen(false)}
                groupIdOrSlug={groupIdOrSlug}
                postId={Number(post.feed_item_id ?? post.id)}
            />

            <GroupSharesDialog
                open={sharesOpen}
                onClose={() => setSharesOpen(false)}
                groupIdOrSlug={groupIdOrSlug}
                postId={Number(post.feed_item_id ?? post.id)}
            />
        </>
    );
}

// -------- Group Chat Tab (group chat + 1-1 with members) --------
function GroupChatTab({ group, membersWithOwner, currentUserId, chatOn, myRole }) {
    const [activePeer, setActivePeer] = React.useState({ type: "group", user: null }); // {type:"group"} or {type:"dm", user}
    const [conversation, setConversation] = React.useState(null);
    const [convLoading, setConvLoading] = React.useState(false);
    const [messages, setMessages] = React.useState([]);
    const [messagesLoading, setMessagesLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [text, setText] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [mobileView, setMobileView] = React.useState("list"); // "list" | "chat"


    const listRef = React.useRef(null);

    const canSend =
        !!conversation &&
        (!!chatOn || myRole === "owner" || myRole === "admin"); // when chat is OFF, only owner/admin can still post

    const myId = React.useMemo(() => {
        const fromProp = Number(currentUserId);
        if (fromProp) return fromProp;
        const fromGroup = Number(group?.current_user?.id ?? group?.current_user_id);
        if (fromGroup) return fromGroup;
        try {
            const raw = localStorage.getItem("user");
            if (raw) {
                const id = Number(JSON.parse(raw)?.id);
                if (id) return id;
            }
        } catch { }
        return null;
    }, [currentUserId, group?.current_user?.id, group?.current_user_id]);


    const userDisplayName = (u, fallbackId) =>
        u?.name ||
        u?.full_name ||
        u?.display_name ||
        u?.sender_display ||
        u?.sender_name ||
        (u?.first_name || u?.last_name
            ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim()
            : "") ||
        u?.username ||
        u?.email ||
        (fallbackId ? `User #${fallbackId}` : "Member");

    const normalizeMessage = (raw) => {
        // Prefer nested sender/user objects if present
        const senderBase =
            (raw.sender && typeof raw.sender === "object" ? raw.sender : null) ||
            (raw.user && typeof raw.user === "object" ? raw.user : null) ||
            (raw.author && typeof raw.author === "object" ? raw.author : null) ||
            (raw.from_user && typeof raw.from_user === "object" ? raw.from_user : null) ||
            (raw.from && typeof raw.from === "object" ? raw.from : null) ||
            {};

        // Best-effort sender id (similar to MessagesPage)
        const sender_id =
            raw.sender_id ??
            raw.user_id ??
            raw.author_id ??
            raw.from_user_id ??
            raw.from_id ??
            senderBase.id ??
            raw.user ??
            raw.sender ??
            raw.author ??
            raw.from_user ??
            raw.from ??
            null;

        // Merge root-level name fields so we can reuse the same display logic
        const senderForName = {
            ...senderBase,
            display_name: raw.sender_display ?? senderBase.display_name,
            sender_display: raw.sender_display ?? senderBase.sender_display,
            sender_name: raw.sender_name ?? senderBase.sender_name,
        };

        const sender = {
            ...senderBase,
            id: sender_id,
            // friendly name just like MessagesPage (falls back to "User #id")
            name: userDisplayName(senderForName, sender_id),
            avatar:
                senderBase.avatar ||
                senderBase.photo ||
                senderBase.photo_url ||
                senderBase.image ||
                raw.sender_avatar ||
                null,
        };

        return {
            ...raw,
            sender_id,
            sender,
            text: raw.text ?? raw.body ?? raw.message ?? raw.content ?? "",
            created_at:
                raw.created_at ?? raw.timestamp ?? raw.sent_at ?? raw.createdAt ?? raw.created,
        };
    };

    const fetchConversation = React.useCallback(
        async (peer) => {
            if (!group?.id) return null;
            setConvLoading(true);
            setError("");
            try {
                const token = getToken();
                const headers = {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };

                let conv = null;

                if (peer.type === "group") {
                    // 👇 Be tolerant to backend expecting group_id / group / group_slug
                    const url = MESSAGING_API.ensureGroupThread();
                    const payloadVariants = [
                        { group_id: group.id },
                        { group: group.id },
                        group.slug ? { group_slug: group.slug } : null,
                    ].filter(Boolean);

                    let lastErr = "";

                    for (const body of payloadVariants) {
                        const res = await fetch(url, {
                            method: "POST",
                            headers,
                            body: JSON.stringify(body),
                        });
                        const data = await res.json().catch(() => ({}));

                        if (res.ok) {
                            conv = data.conversation || data;
                            break;
                        } else {
                            lastErr = data?.detail || `HTTP ${res.status}`;
                        }
                    }

                    if (!conv) {
                        throw new Error(lastErr || "Could not create/load group conversation");
                    }
                } else {
                    // Direct DM with a member (keep as-is, since it's already working)
                    const url = MESSAGING_API.ensureDirectThread();
                    const body = {
                        user_id: peer.user.id,
                        group_id: group.id, // optional context
                    };

                    const res = await fetch(url, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(body),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);

                    conv = data.conversation || data;
                }

                setConversation(conv);
                return conv;
            } catch (e) {
                setError(e?.message || String(e));
                setConversation(null);
                return null;
            } finally {
                setConvLoading(false);
            }
        },
        [group?.id, group?.slug]
    );


    const fetchMessages = React.useCallback(
        async (convId, withSpinner = true) => {
            if (!convId) return;
            if (withSpinner) setMessagesLoading(true);
            try {
                const token = getToken();
                const headers = {
                    Accept: "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };
                const res = await fetch(MESSAGING_API.listMessages(convId), { headers });
                const data = await res.json().catch(() => ([]));
                let arr = [];
                if (Array.isArray(data)) arr = data;
                else if (Array.isArray(data?.results)) arr = data.results;
                else if (Array.isArray(data?.messages)) arr = data.messages;
                setMessages(arr.map(normalizeMessage));
            } catch (e) {
                setError(e?.message || String(e));
                setMessages([]);
            } finally {
                if (withSpinner) setMessagesLoading(false);
            }
        },
        []
    );

    // auto scroll to bottom when messages change
    React.useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length]);

    // whenever active peer changes, ensure conversation + load messages
    React.useEffect(() => {
        (async () => {
            const conv = await fetchConversation(activePeer);
            if (conv?.id) await fetchMessages(conv.id, true);
        })();
    }, [activePeer, fetchConversation, fetchMessages]);

    // light polling (8s) to keep chat updated while open
    React.useEffect(() => {
        if (!conversation?.id) return;
        const id = setInterval(() => {
            fetchMessages(conversation.id, false);
        }, 8000);
        return () => clearInterval(id);
    }, [conversation?.id, fetchMessages]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || !conversation?.id) return;

        setSending(true);
        try {
            const token = getToken();
            const headers = {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };
            const url = MESSAGING_API.sendMessage(conversation.id);

            // 👇 Try different payload shapes: text / body / message / content
            const payloadVariants = [
                { text: trimmed },
                { body: trimmed },
                { message: trimmed },
                { content: trimmed },
            ];

            let ok = false;
            let lastErr = "";

            for (const payload of payloadVariants) {
                const res = await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                });
                const data = await res.json().catch(() => ({}));

                if (res.ok) {
                    ok = true;
                    setText("");
                    await fetchMessages(conversation.id, false);
                    break;
                } else {
                    lastErr = data?.detail || `HTTP ${res.status}`;
                }
            }

            if (!ok) {
                throw new Error(lastErr || "Could not send message");
            }
        } catch (e) {
            setError(e?.message || String(e));
        } finally {
            setSending(false);
        }
    };


    const disabledForMember =
        !chatOn && myRole !== "owner" && myRole !== "admin";

    const displayTitle =
        activePeer.type === "group"
            ? (group?.name || "Group chat")
            : (activePeer.user?.name ||
                activePeer.user?.email ||
                `User #${activePeer.user?.id}`);

    const memberList = (membersWithOwner || []).filter(
        (m) => Number(m?.user?.id) !== myId  // don't show self for DM
    );

    return (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
            {/* Left: target list (group + members) */}
            <Paper
                elevation={0}
                className="rounded-2xl border border-slate-200"
                sx={{
                    width: { xs: "100%", md: 280 },
                    maxHeight: 480,
                    overflowY: "auto",
                    display: { xs: mobileView === "list" ? "block" : "none", md: "block" },
                }}
            >
                <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
                    <Typography variant="subtitle1" className="font-semibold">
                        Chats
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Group chat + direct messages
                    </Typography>
                </Box>

                <List dense disablePadding>
                    {/* Group chat item */}
                    <ListItem
                        button
                        selected={activePeer.type === "group"}
                        onClick={() => {
                            setActivePeer({ type: "group", user: null });
                            setMobileView("chat");
                        }}
                    >
                        <ListItemAvatar>
                            <Avatar src={group?.cover_image ? toAbs(group.cover_image) : undefined}>
                                {(group?.name || "G").slice(0, 1).toUpperCase()}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={group?.name || "Group chat"}
                            secondary="Group conversation"
                        />
                    </ListItem>

                    <Divider />

                    {/* Direct messages with members */}
                    {memberList.map((m) => (
                        <ListItem
                            key={m.user.id}
                            button
                            selected={
                                activePeer.type === "dm" &&
                                activePeer.user &&
                                Number(activePeer.user.id) === Number(m.user.id)
                            }
                            onClick={() => {
                                setActivePeer({ type: "dm", user: m.user });
                                setMobileView("chat");
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar src={toAbs(m.user.avatar)}>
                                    {(m.user.name || m.user.email || "U").slice(0, 1).toUpperCase()}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={m.user.name || m.user.email || `User #${m.user.id}`}
                                secondary={m.role ? (m.role.charAt(0).toUpperCase() + m.role.slice(1)) : "Member"}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            {/* Right: conversation */}
            <Paper
                elevation={0}
                className="rounded-2xl border border-slate-200 flex-1"
                sx={{
                    display: {
                        xs: mobileView === "chat" ? "flex" : "none",
                        md: "flex",
                    },
                    flexDirection: "column",
                    minHeight: 320,
                    maxHeight: 520,
                }}
            >
                <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 0.5 }}
                    >
                        <IconButton
                            size="small"
                            sx={{ display: { xs: "inline-flex", md: "none" }, mr: 0.5 }}
                            onClick={() => setMobileView("list")}
                        >
                            <ArrowBackRoundedIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle1" className="font-semibold">
                            {displayTitle}
                        </Typography>
                    </Stack>
                    {activePeer.type === "group" ? (
                        <Typography variant="caption" color="text.secondary">
                            Group messages visible to all members.
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            1-to-1 chat with this member.
                        </Typography>
                    )}
                </Box>

                {error && (
                    <Box sx={{ p: 2 }}>
                        <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
                    </Box>
                )}

                {!chatOn && (
                    <Box sx={{ p: 2 }}>
                        <Alert severity="info">
                            Group chat is currently <b>disabled</b> in Settings.
                            {myRole === "owner" || myRole === "admin"
                                ? " You can still send messages as Owner/Admin."
                                : " You can read past messages but cannot send new ones."}
                        </Alert>
                    </Box>
                )}

                {/* Messages list */}
                <Box
                    ref={listRef}
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        px: 2,
                        py: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                    }}
                >
                    {convLoading || messagesLoading ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ flex: 1 }}>
                            <CircularProgress size={22} />
                        </Stack>
                    ) : messages.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No messages yet. Start the conversation!
                        </Typography>
                    ) : (
                        messages.map((msg) => {
                            const mine = myId && Number(msg.sender_id) === myId;
                            return (
                                <Box
                                    key={msg.id}
                                    sx={{
                                        display: "flex",
                                        justifyContent: mine ? "flex-end" : "flex-start",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            maxWidth: "80%",
                                            px: 1.5,
                                            py: 1,
                                            borderRadius: 2,
                                            bgcolor: mine ? "#10b8a6" : "#e2e8f0",
                                            color: mine ? "white" : "inherit",
                                        }}
                                    >
                                        {!mine && (
                                            <Typography
                                                variant="caption"
                                                sx={{ fontWeight: 600, display: "block", mb: 0.2 }}
                                            >
                                                {userDisplayName(msg.sender, msg.sender_id)}
                                            </Typography>
                                        )}
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                            {msg.text}
                                        </Typography>
                                        {msg.created_at && (
                                            <Typography
                                                variant="caption"
                                                sx={{ opacity: 0.7, display: "block", mt: 0.3 }}
                                            >
                                                {new Date(msg.created_at).toLocaleString()}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })
                    )}
                </Box>

                {/* Composer */}
                <Box sx={{ p: 1.5, borderTop: "1px solid #e2e8f0" }}>
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        component="form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!disabledForMember && canSend) handleSend();
                        }}
                    >
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={
                                disabledForMember
                                    ? "Chat is disabled for members."
                                    : "Type a message…"
                            }
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={disabledForMember || !conversation || sending}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!disabledForMember && canSend) handleSend();
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={
                                disabledForMember ||
                                !conversation ||
                                !text.trim() ||
                                sending
                            }
                            sx={{
                                textTransform: "none",
                                backgroundColor: "#10b8a6",
                                "&:hover": { backgroundColor: "#0ea5a4" },
                            }}
                        >
                            Send
                        </Button>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
}


const GROUP_TAB_LABELS = [
    "Overview",
    "Members",
    "Sub-groups",
    "Settings",
    "Posts",
    "Notifications",
    "Chat",
];



// ---- Main page ----
export default function GroupManagePage() {
    const { idOrSlug } = useParams();
    const navigate = useNavigate();
    const token = getToken();

    const [tab, setTab] = React.useState(0);
    const [mobileTabsOpen, setMobileTabsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [group, setGroup] = React.useState(null);

    // 👇 already there
    const [editOpen, setEditOpen] = React.useState(false);
    const [imageOnlyOpen, setImageOnlyOpen] = React.useState(false);

    // 👇 ADD THIS HELPER
    const handleOpenEditDialog = () => {
        if (!group) return;
        setEditOpen(true);
    };
    const handleOpenImageOnly = () => {
        if (!group) return;
        setImageOnlyOpen(true);
    };

    const [isStaffUser, setIsStaffUser] = React.useState(false);
    // Is this group a child (has a parent)?
    const isChildGroup = Boolean(group?.parent_id || group?.parent?.id || group?.parent);
    // Show Sub-groups tab only on top-level groups
    const showSubgroupsTab = !isChildGroup;
    // Show Notifications tab only when Public + Approval
    const showNotificationsTab =
        (group?.visibility === "public" && group?.join_policy === "approval") ||
        (group?.visibility === "private" && group?.join_policy === "invite");
    // Keep indexes stable: Overview=0, Members=1, Sub-groups=2, Settings=3, Posts=4, Notifications=5
    const NOTIF_TAB_INDEX = 5;
    // Default to "Overview" whenever /groups/:idOrSlug changes (main or sub)
    React.useEffect(() => {
        setTab(0);
    }, [idOrSlug]);

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            if (raw) {
                const u = JSON.parse(raw);
                if (u.is_staff || u.isStaff || u.role === "staff") {
                    setIsStaffUser(true);
                }
            }
        } catch {
            // ignore parse error
        }
    }, []);

    React.useEffect(() => {
        if (!group) return;

        if (group.current_user_role === "staff") {
            setIsStaffUser(true);
        }
        if (group.current_user?.is_staff === true) {
            setIsStaffUser(true);
        }
        if (group.current_user_is_staff === true) {
            setIsStaffUser(true);
        }
    }, [group]);

    // If this is a child group, never allow tab index 2 (Sub-groups)
    React.useEffect(() => {
        if (!showSubgroupsTab && tab === 2) setTab(0);
    }, [showSubgroupsTab, tab]);
    const [members, setMembers] = React.useState([]);
    const [memLoading, setMemLoading] = React.useState(true);
    const [memError, setMemError] = React.useState("");
    const [addOpen, setAddOpen] = React.useState(false);
    const [requestAddOpen, setRequestAddOpen] = React.useState(false);
    const [memMenuAnchor, setMemMenuAnchor] = React.useState(null);
    const [activeMember, setActiveMember] = React.useState(null);
    const [exportingCSV, setExportingCSV] = React.useState(false);
    // Sub-groups state
    const [subgroups, setSubgroups] = React.useState([]);
    const [subLoading, setSubLoading] = React.useState(true);
    const [subError, setSubError] = React.useState("");
    const [addSubOpen, setAddSubOpen] = React.useState(false);

    // ----- Notifications tab (local-only settings) -----
    const [notifyEnabled, setNotifyEnabled] = React.useState(true);
    const [notifyRecipients, setNotifyRecipients] = React.useState("owners_admins");

    // --- Chat toggle state (Settings tab) ---
    const [chatOn, setChatOn] = React.useState(true);
    const [chatSaving, setChatSaving] = React.useState(false);
    // confirm modal for chat toggle
    const [chatConfirmOpen, setChatConfirmOpen] = React.useState(false);
    const [chatNext, setChatNext] = React.useState(true);

    // keep the confirm text for delete group
    const [deleteGroupOpen, setDeleteGroupOpen] = React.useState(false);
    const [deletingGroup, setDeletingGroup] = React.useState(false);
    const [confirmName, setConfirmName] = React.useState("");
    React.useEffect(() => { if (!deleteGroupOpen) setConfirmName(""); }, [deleteGroupOpen]);

    // When group loads/changes, infer initial chat state from backend shape
    React.useEffect(() => {
        if (!group) return;

        // 1) If explicit flag exists on the group payload, use it.
        if (typeof group.chat_enabled === "boolean") {
            setChatOn(Boolean(group.chat_enabled));
            return;
        }

        // 2) If message_mode exists on the group payload, use it.
        if (typeof group.message_mode === "string") {
            setChatOn(group.message_mode !== "admins_only");
            return;
        }

        // 3) Neither field present on this payload — fetch authoritative setting.
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/settings/message-mode/`, {
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (res.ok && data) {
                    const on = data.message_mode
                        ? data.message_mode !== "admins_only"
                        : !data.admins_only_effective;
                    setChatOn(Boolean(on));
                }
                // If not ok, do nothing (avoid forcing a wrong default).
            } catch {
                // Swallow errors; don't force an incorrect default.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [group, idOrSlug, token]);

    const saveChatToggle = async (next) => {
        if (!group) return;
        setChatSaving(true);
        try {
            // Prefer explicit message_mode, keep legacy boolean as fallback
            const payload =
                typeof group.chat_enabled === "boolean"
                    ? { chat_enabled: next }
                    : { message_mode: next ? "all" : "admins_only" };

            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/settings/message-mode/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);

            // Normalize response into our boolean switch
            const on = data.message_mode
                ? data.message_mode === "all"
                : (typeof data.chat_enabled === "boolean" ? data.chat_enabled : !data.admins_only_effective);

            setChatOn(Boolean(on));
        } catch (e) {
            alert(`Could not update chat setting: ${e?.message || e}`);
            setChatOn((prev) => !prev); // revert UI
        } finally {
            setChatSaving(false);
        }
    };



    // Load saved prefs per group from localStorage
    React.useEffect(() => {
        if (!group?.id) return;
        try {
            const saved = JSON.parse(localStorage.getItem(`group_notify_${group.id}`) || "{}");
            if (typeof saved.enabled === "boolean") setNotifyEnabled(!!saved.enabled);
            if (saved.recipients) setNotifyRecipients(saved.recipients);
        } catch { }
    }, [group?.id]);

    const saveNotify = () => {
        if (!group?.id) return;
        localStorage.setItem(
            `group_notify_${group.id}`,
            JSON.stringify({ enabled: notifyEnabled, recipients: notifyRecipients })
        );
    };
    // ---- Join Request API endpoints (tweak these 3 if your backend differs) ----
    const API = {
        list: (gid) => `${API_ROOT}/groups/${gid}/member-requests/`,
        approve: (gid, id) => `${API_ROOT}/groups/${gid}/member-requests/approve/${id}/`,
        reject: (gid, id) => `${API_ROOT}/groups/${gid}/member-requests/reject/${id}/`,
    };
    // ---- Promotion (role upgrade) API endpoints ----
    const PROMOTION_API = {
        list: (gid) => `${API_ROOT}/groups/${gid}/promotion/request-list/`,
        request: (gid) => `${API_ROOT}/groups/${gid}/promotion/request/`,
        approve: (gid) => `${API_ROOT}/groups/${gid}/promotion/request-approve/`,
        reject: (gid) => `${API_ROOT}/groups/${gid}/promotion/request-reject/`,
    };


    // ---- Notifications tab data ----
    const [reqs, setReqs] = React.useState([]);
    const [reqsLoading, setReqsLoading] = React.useState(false);
    const [reqsError, setReqsError] = React.useState("");

    // Promotion requests (moderators → admins)
    const [promotionReqs, setPromotionReqs] = React.useState([]);
    const [promotionLoading, setPromotionLoading] = React.useState(false);
    const [promotionError, setPromotionError] = React.useState("");

    // tiny helper to format dates
    const fmtWhen = (s) => {
        try {
            const d = new Date(s);
            return d.toLocaleString();
        } catch { return ""; }
    };

    const fetchRequests = React.useCallback(async () => {
        if (!group?.id) return;
        setReqsLoading(true);
        setReqsError("");
        try {
            const r = await fetch(API.list(group.id), {
                headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d?.detail || "Failed to load join requests");

            // Support all shapes: array | {results: []} | {requests: []}
            let items = [];
            if (Array.isArray(d)) items = d;
            else if (Array.isArray(d?.results)) items = d.results;
            else if (Array.isArray(d?.requests)) items = d.requests;

            // Ensure each item has an id + created_at so UI + actions work
            const normalized = items.map((it, i) => ({
                ...it,
                id: it.id ?? it.pk ?? it.user?.id ?? i,           // use user.id if no request id
                created_at: it.created_at || it.requested_at || it.joined_at || it.createdAt,
                user: it.user || it.requester || it.member || it, // keep a 'user' field
            }));

            setReqs(normalized);
        } catch (e) {
            setReqsError(e?.message || "Failed to load join requests");
        } finally {
            setReqsLoading(false);
        }
    }, [group?.id, token]);

    // Load promotion (role-upgrade) requests: moderators asking to become admin
    const fetchPromotionRequests = React.useCallback(async () => {
        if (!group?.id) return;
        setPromotionLoading(true);
        setPromotionError("");
        try {
            const r = await fetch(PROMOTION_API.list(group.id), {
                headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d?.detail || "Failed to load promotion requests");

            let items = [];
            if (Array.isArray(d)) items = d;
            else if (Array.isArray(d?.results)) items = d.results;
            else if (Array.isArray(d?.requests)) items = d.requests;
            else if (Array.isArray(d?.promotion_requests)) items = d.promotion_requests;

            const normalized = items.map((it, i) => ({
                ...it,
                id: it.id ?? it.pk ?? it.request_id ?? i,
                user: it.user || it.requester || it.moderator || it.member || it,
                created_at: it.created_at || it.requested_at || it.createdAt,
                status: it.status || it.state || "pending",
            }));

            setPromotionReqs(normalized);
        } catch (e) {
            setPromotionError(e?.message || "Failed to load promotion requests");
            setPromotionReqs([]);
        } finally {
            setPromotionLoading(false);
        }
    }, [group?.id, token]);

    const takeAction = async (id, action) => {
        try {
            const url =
                action === "approve"
                    ? API.approve(group.id, id)
                    : API.reject(group.id, id);

            const r = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: "{}",
            });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                throw new Error(d?.detail || `Failed to ${action}`);
            }

            setReqs(prev => prev.filter(x => (x.id ?? x.pk) !== id));
            if (action === "approve") {
                await fetchMembers();
                setGroup(prev =>
                    prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev
                );
            }
        } catch (e) {
            alert(e?.message || `Failed to ${action}`);
        }
    };

    // Approve / reject a promotion request (moderator → admin)
    const takePromotionAction = async (req, action) => {
        if (!req || !group?.id) return;

        const id = req.id ?? req.pk ?? req.request_id;
        const userId = req.user?.id ?? req.user_id;
        const url =
            action === "approve"
                ? PROMOTION_API.approve(group.id)
                : PROMOTION_API.reject(group.id);

        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Try a couple of payload shapes to be compatible with the backend
        const payloadCandidates = [];
        if (userId) payloadCandidates.push({ user_id: userId });
        if (id) {
            payloadCandidates.push({ id });
            payloadCandidates.push({ request_id: id });
        }
        if (!payloadCandidates.length) payloadCandidates.push({}); // last resort

        let ok = false;
        let lastErr = "";
        for (const body of payloadCandidates) {
            try {
                const r = await fetch(url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                });
                if (r.ok) {
                    ok = true;
                    break;
                }
                const d = await r.json().catch(() => ({}));
                lastErr = d?.detail || `HTTP ${r.status}`;
            } catch (e) {
                lastErr = e?.message || String(e);
            }
        }

        if (!ok) {
            alert(lastErr || `Failed to ${action} promotion request`);
            return;
        }

        // Remove from local list
        setPromotionReqs(prev =>
            prev.filter(p =>
                (p.id ?? p.pk ?? p.request_id) !== id &&
                (p.user?.id ?? p.user_id) !== userId
            )
        );

        // On approve: refresh members so the role change is visible
        if (action === "approve") {
            await fetchMembers();
            await fetchGroup();
        }
    };
    // Load sub-groups (tries multiple URL patterns; first that works wins)
    const fetchSubgroups = React.useCallback(async () => {
        if (!group?.id) return;
        setSubLoading(true); setSubError("");
        const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        const candidates = [
            `${API_ROOT}/groups/${idOrSlug}/subgroups/`,
            `${API_ROOT}/groups/?parent_id=${group.id}`,
            `${API_ROOT}/groups/?parent=${group.id}`,
            `${API_ROOT}/groups/?parent_slug=${encodeURIComponent(group.slug || idOrSlug)}`
        ];
        let rows = null, lastErr = null;
        for (const url of candidates) {
            try {
                const res = await fetch(url, { headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                rows = Array.isArray(json) ? json : (Array.isArray(json?.results) ? json.results : []);
                if (Array.isArray(rows)) break;
            } catch (e) {
                lastErr = e;
            }
        }
        if (!Array.isArray(rows)) {
            setSubgroups([]);
            setSubError(lastErr ? String(lastErr.message || lastErr) : "Unable to load sub-groups");
        } else {
            setSubgroups(rows);
        }
        setSubLoading(false);
    }, [group, idOrSlug, token]);

    React.useEffect(() => {
        if (group && showSubgroupsTab) fetchSubgroups();
    }, [group, showSubgroupsTab, fetchSubgroups]);

    const [busyUserId, setBusyUserId] = React.useState(null);
    const [roleErrorOpen, setRoleErrorOpen] = React.useState(false);
    const [roleErrorMsg, setRoleErrorMsg] = React.useState("");

    const [requestInfoOpen, setRequestInfoOpen] = React.useState(false);
    const [requestInfoMessage, setRequestInfoMessage] = React.useState("");


    // Posts tab state
    const [posts, setPosts] = React.useState([]);
    const [postsLoading, setPostsLoading] = React.useState(true);
    const [postsError, setPostsError] = React.useState("");
    const [postsMeta, setPostsMeta] = React.useState(null);

    // Compose state
    const [postType, setPostType] = React.useState("text"); // text | image | link | poll
    const [postText, setPostText] = React.useState("");
    const [postImageFile, setPostImageFile] = React.useState(null);
    const [postLinkUrl, setPostLinkUrl] = React.useState("");
    const [pollQuestion, setPollQuestion] = React.useState("");
    const [pollOptions, setPollOptions] = React.useState(["", ""]); // at least two
    const [creating, setCreating] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [notifTab, setNotifTab] = React.useState(0);


    // ==== Post actions UI state (add-only) ====
    const [postMenuAnchor, setPostMenuAnchor] = React.useState(null);
    const [activePost, setActivePost] = React.useState(null);
    const [editPostOpen, setEditPostOpen] = React.useState(false);
    const [editImageFile, setEditImageFile] = React.useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    // Member removal confirm (new)
    const [removeMemberOpen, setRemoveMemberOpen] = React.useState(false);
    const [removeMemberTarget, setRemoveMemberTarget] = React.useState(null);

    // Settings Tab State
    const [visibilitySetting, setVisibilitySetting] = React.useState("public");
    const [joinPolicySetting, setJoinPolicySetting] = React.useState("open");
    const [saveSettingsLoading, setSaveSettingsLoading] = React.useState(false);
    const [parentVis, setParentVis] = React.useState(""); // robust parent visibility
    const isSubgroup = !!(group?.parent_id || group?.parent?.id || group?.parent);

    // Group Actions Menu
    const [groupMenuAnchor, setGroupMenuAnchor] = React.useState(null);
    const [leaveGroupOpen, setLeaveGroupOpen] = React.useState(false);

    // Snackbar state for modern messages
    const [snack, setSnack] = React.useState({ open: false, message: "", severity: "info" });
    const showMessage = (message, severity = "success") => {
        setSnack({ open: true, message, severity });
    };
    const handleSnackClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnack((prev) => ({ ...prev, open: false }));
    };

    // Who am I? (prefer backend, fallback to localStorage user)
    const currentUserId = React.useMemo(() => {
        const fromPayload = group?.current_user?.id ?? group?.current_user_id ?? null;
        if (fromPayload) return Number(fromPayload);
        try {
            const raw = localStorage.getItem("user");
            if (raw) return Number(JSON.parse(raw)?.id) || null;
        } catch { }
        return null;
    }, [group?.current_user?.id, group?.current_user_id]);

    // ---- Role helpers for permissions ----
    const myRole = group?.current_user_role || "member";
    const isOwnerRole = myRole === "owner";
    const isAdminRole = myRole === "admin";
    const isModeratorRole = myRole === "moderator";
    const isPlatformAdmin = isOwnerUser();

    // ---- Which sub-groups should be visible to this user? ----
    // Owner/Admin → see ALL sub-groups
    // Moderator/Member → see ONLY sub-groups they have joined
    const visibleSubgroups = React.useMemo(() => {
        if (!Array.isArray(subgroups)) return [];

        // Owners & Admins see all sub-groups
        if (isOwnerRole || isAdminRole) return subgroups;

        // Moderators & members → only sub-groups they are part of
        return subgroups.filter((sg) => {
            // If backend gives an explicit membership flag, use it
            if (typeof sg.current_user_is_member === "boolean") {
                return sg.current_user_is_member;
            }
            if (typeof sg.is_member === "boolean") {
                return sg.is_member;
            }

            // If subgroup has a current_user_role, treat any non-"none" value as membership
            if (typeof sg.current_user_role === "string" && sg.current_user_role) {
                return sg.current_user_role !== "none";
            }

            // Fallback: if current user created the subgroup, treat as joined
            if (currentUserId) {
                if (Number(sg.created_by_id) === currentUserId) return true;
                if (sg.created_by?.id && Number(sg.created_by.id) === currentUserId) return true;
            }

            return false;
        });
    }, [subgroups, isOwnerRole, isAdminRole, currentUserId]);

    const canEditGroup = isOwnerRole || isAdminRole || isPlatformAdmin;
    const canReviewRequests = isOwnerRole || isAdminRole;

    // ✅ Strong member management (only owner + admin can remove/change roles)
    const canHardManageMembers = isOwnerRole || isAdminRole;

    // visibility helpers
    const isPublicGroup = group?.visibility === "public";
    const isPrivateGroup = group?.visibility === "private";

    // ✅ Who can directly ADD members?
    // - Owner/Admin: always
    // - Moderator: only in PUBLIC groups
    const canAddMembersDirectly =
        isOwnerRole || isAdminRole || (isModeratorRole && isPublicGroup);

    // ✅ Who can only REQUEST member changes (add)?
    // - Moderator in PRIVATE (or non-public) groups
    const canRequestMemberChanges =
        isModeratorRole && !canAddMembersDirectly;

    // ✅ Posts: owner + admin + moderator can create/manage/delete posts
    const canModerate = isOwnerRole || isAdminRole || isModeratorRole;
    const canPost = canModerate;

    // ✅ Sub-group creation is restricted to Owner + Admin only
    const canCreateSubgroups = isOwnerRole;


    const canSeeSettingsTab = isOwnerRole || isAdminRole || isModeratorRole;
    const canSeeNotificationsTab = canModerate && showNotificationsTab;

    // Keep logical indexes fixed (same as GROUP_TAB_LABELS)
    // 0: Overview, 1: Members, 2: Sub-groups, 3: Settings,
    // 4: Posts, 5: Notifications, 6: Chat
    const CHAT_TAB_INDEX = 6;


    React.useEffect(() => {
        if (!canCreateSubgroups && addSubOpen) setAddSubOpen(false);
    }, [canCreateSubgroups, addSubOpen]);

    // If user can't see Settings, never allow tab index 3
    React.useEffect(() => {
        if (!canSeeSettingsTab && tab === 3) setTab(0);
    }, [canSeeSettingsTab, tab]);

    // Per-post menu open/close 
    const openPostMenu = (evt, post) => {
        if (!post) return;
        const fid = Number(post.feed_item_id ?? post.id);
        if (!Number.isInteger(fid)) {
            alert("Cannot moderate this item (missing feed item id).");
            return;
        }
        const isHidden = Boolean(post.hidden ?? post.is_hidden);
        const isPoll = String(post.type).toLowerCase() === "poll";
        const pollOptions = isPoll ? (post.options || []).map((o) => o?.label ?? o?.text ?? String(o)) : post.options;
        setActivePost({ ...post, options: pollOptions, _feed_item_id: fid, hidden: isHidden, is_hidden: isHidden });
        setPostMenuAnchor(evt.currentTarget);
    };
    const closePostMenu = () => { setPostMenuAnchor(null); /* keep activePost for edit form */ };

    // Hide/Unhide
    const toggleHidePost = async (post) => {
        if (!post) return;
        const postId = Number(post._feed_item_id ?? post.feed_item_id ?? post.id);
        if (!Number.isInteger(postId)) { alert("Invalid item id"); return; }

        const isHidden = Boolean(post.hidden ?? post.is_hidden);
        const endpoint = isHidden ? "unhide-post" : "hide-post";

        const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/${endpoint}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ id: postId })
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(j?.detail || `HTTP ${res.status}`);
            return;
        }
        await fetchPosts();
        setPostMenuAnchor(null);
    };

    // Delete
    const deletePost = async () => {
        if (!activePost) return;

        const itemId = Number(activePost._feed_item_id ?? activePost.feed_item_id ?? activePost.id);
        if (!Number.isInteger(itemId)) { alert("Invalid item id"); return; }

        const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        let ok = false, lastErr = "";

        try {
            if (String(activePost.type).toLowerCase() === "poll") {
                const pollId = Number(activePost.poll_id);
                if (!Number.isInteger(pollId)) {
                    alert("Cannot delete: missing poll_id in this item.");
                    return;
                }
                // Use only the dedicated /delete/ endpoints (works with POST or DELETE)
                for (const { url, method, body } of [
                    { url: `${API_ROOT}/activity/feed/polls/${pollId}/delete/`, method: "DELETE" }
                ]) {
                    const r = await fetch(url, { method, headers, ...(body ? { body } : {}) });
                    if (r.ok || r.status === 204) { ok = true; break; }
                    lastErr = `HTTP ${r.status}`;
                }
            } else {
                // NEW group post delete endpoints
                for (const { url, method, body } of [
                    { url: `${API_ROOT}/groups/${idOrSlug}/posts/${itemId}/delete/`, method: "DELETE" }
                ]) {
                    const r = await fetch(url, { method, headers, ...(body ? { body } : {}) });
                    if (r.ok || r.status === 204) { ok = true; break; }
                    lastErr = `HTTP ${r.status}`;
                }
            }
        } catch (e) {
            lastErr = e?.message || String(e);
        }

        if (!ok) {
            alert(`Failed to delete: ${lastErr || "Unknown error"}`);
            return;
        }

        setDeleteConfirmOpen(false);
        await fetchPosts();
        setPostMenuAnchor(null);
    };


    // GET posts for this group
    const fetchPosts = React.useCallback(async () => {
        if (!idOrSlug) return;
        setPostsLoading(true); setPostsError("");

        try {
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            // (A) group posts (text/image/link/event) from /groups/:idOrSlug/posts/
            const resPosts = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/`, { headers });
            const postsJson = await resPosts.json().catch(() => ([]));
            if (!resPosts.ok) throw new Error(postsJson?.detail || `HTTP ${resPosts.status}`);

            // Backend now returns {results, meta} format
            let postsArr = Array.isArray(postsJson?.results) ? postsJson.results : (Array.isArray(postsJson) ? postsJson : []);
            const postsMetaData = postsJson?.meta || null;
            setPostsMeta(postsMetaData);

            // drop polls if backend mixes them here; we'll pull them from Activity Feed
            postsArr = postsArr.filter(p => {
                const t = (p?.type || "").toLowerCase();
                return t !== "poll" && t !== "event";
            });

            // (B) polls come from Activity Feed (scope=group)
            const currentGid = Number(group?.id) || null;
            const currentSlug = group?.slug || String(idOrSlug);

            // try multiple URL shapes; take first successful one
            const feedCandidates = [
                `${API_ROOT}/activity/feed/?scope=group&group_id=${encodeURIComponent(currentGid || "")}`,
                `${API_ROOT}/activity/feed/?scope=group&group_slug=${encodeURIComponent(currentSlug)}`,
                `${API_ROOT}/activity/feed/?scope=group&group=${encodeURIComponent(currentGid || "")}`,
            ];

            let feedRows = null;
            for (const url of feedCandidates) {
                try {
                    const r = await fetch(url, { headers });
                    if (!r.ok) continue;
                    const j = await r.json().catch(() => ([]));
                    feedRows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
                    if (Array.isArray(feedRows)) break;
                } catch { /* try next */ }
            }
            if (!Array.isArray(feedRows)) feedRows = [];

            // map → polls and STRICTLY keep only polls of THIS group
            const pollsAll = feedRows.map(mapFeedPollToPost).filter(Boolean);
            const polls = pollsAll.filter(p => {
                // prefer numeric id comparison; as a fallback, keep all if we don't know currentGid
                return currentGid ? Number(p.group_id) === currentGid : true;
            });

            // merge + de-dup + newest first
            const merged = [...postsArr, ...polls];
            const seen = new Set();
            const uniq = [];
            for (const p of merged) {
                const id = Number(p?.feed_item_id ?? p?.id);
                const key = `${(p?.type || "post").toLowerCase()}:${isNaN(id) ? "na" : id}`;
                if (seen.has(key)) continue;
                seen.add(key);
                uniq.push(p);
            }
            uniq.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));

            setPosts(uniq);
        } catch (e) {
            setPostsError(String(e?.message || e));
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    }, [idOrSlug, token, group?.id, group?.slug]);


    // Load posts only when Posts tab is active (saves calls)
    React.useEffect(() => {
        if (tab === 4) fetchPosts();
    }, [tab, fetchPosts]);

    // auto-load join requests when landing on Notifications tab
    React.useEffect(() => {
        if (canSeeNotificationsTab && canReviewRequests && tab === NOTIF_TAB_INDEX) {
            fetchRequests();
            fetchPromotionRequests();
        }
    }, [canSeeNotificationsTab, canReviewRequests, tab, fetchRequests, fetchPromotionRequests]);

    // Helpers for poll options
    const updatePollOption = (idx, val) => {
        setPollOptions((prev) => {
            const copy = [...prev];
            copy[idx] = val;
            return copy;
        });
    };
    const addPollOption = () => setPollOptions((prev) => [...prev, ""]);
    const removePollOption = (idx) => setPollOptions((prev) => prev.filter((_, i) => i !== idx));

    // CREATE post
    const createPost = async () => {
        if (creating) return;
        try {
            setCreating(true);

            // Decide payload by type
            if (postType === "image") {
                const fd = new FormData();
                fd.append("type", "image");
                if (postText.trim()) fd.append("text", postText);
                if (postImageFile) fd.append("image", postImageFile, postImageFile.name);
                const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/`, {
                    method: "POST",
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: fd,
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.detail || `HTTP ${res.status}`);
                }
            } else if (postType === "link") {
                const payload = { type: "link", url: postLinkUrl.trim(), text: postText };
                const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.detail || `HTTP ${res.status}`);
                }
            } else if (postType === "poll") {
                const payload = {
                    question: pollQuestion.trim(),
                    options: cleanPollOptions(pollOptions),
                    group_id: Number(group?.id || idOrSlug), // feed needs the owning group
                };

                const res = await fetch(`${API_ROOT}/activity/feed/polls/create/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.detail || `HTTP ${res.status}`);
                }
            } else {
                // text
                const payload = { type: "text", text: postText };
                const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.detail || `HTTP ${res.status}`);
                }
            }

            // Reset minimal fields
            setPostText(""); setPostImageFile(null); setPostLinkUrl("");
            setPollQuestion(""); setPollOptions(["", ""]);

            await fetchPosts(); // refresh
        } catch (e) {
            alert(`Failed to post: ${e?.message || e}`);
        } finally {
            setCreating(false);
        }
    };


    // Owner id (used to lock Owner row)
    const ownerId = group?.owner?.id ?? null;

    // Owner user (from the group payload)
    const ownerUser = group?.owner || null;

    // Members + an "owner" row (if the owner isn't already in /members/)
    const membersWithOwner = React.useMemo(() => {
        const base = Array.isArray(members) ? members.slice() : [];
        const oid = ownerUser?.id;
        if (!oid) return base;

        const coerced = base.map(m =>
            Number(m?.user?.id) === Number(oid) ? { ...m, role: "owner" } : m
        );

        const hasOwnerRow = coerced.some(m => Number(m?.user?.id) === Number(oid));
        return hasOwnerRow ? coerced : [{ user: ownerUser, role: "owner" }, ...coerced];
    }, [members, ownerUser?.id]);

    // Unique member count including owner (deduped)
    const memberCount = React.useMemo(() => {
        const ids = new Set();
        (membersWithOwner || []).forEach(m => {
            const id = Number(m?.user?.id);
            if (!Number.isNaN(id)) ids.add(id);
        });
        return ids.size; // => at least 1 when owner exists
    }, [membersWithOwner]);

    // action menu handlers
    const openMemberMenu = (evt, m) => {
        if (myRole === "admin" && currentUserId && Number(m.user.id) === Number(currentUserId)) return;

        // NEW: moderators cannot open menu for others or for admin/owner rows
        if (myRole === "moderator") {
            const isSelf = currentUserId && Number(m.user.id) === Number(currentUserId);
            const isOwner = ownerId && Number(m.user.id) === Number(ownerId);
            if (!isSelf) return;
            if (isOwner || m.role === "admin") return;
        }

        setActiveMember(m);
        setMemMenuAnchor(evt.currentTarget);
    };
    const closeMemberMenu = () => { setActiveMember(null); setMemMenuAnchor(null); };

    const setRole = async (userId, role) => {
        if (currentUserId && Number(userId) === Number(currentUserId)) {
            setRoleErrorMsg("You can’t change your own role.");
            setRoleErrorOpen(true);
            return;
        }
        setBusyUserId(userId);
        try {
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/set-role/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ user_id: userId, role }),
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.detail || `HTTP ${res.status}`);
            }
            await fetchMembers();   // refresh list after role change
        } catch (e) {
            console.error(e);
            setRoleErrorMsg(`Failed to update role: ${e?.message || e}`);
            setRoleErrorOpen(true);
        } finally {
            setBusyUserId(null);
            closeMemberMenu();
        }
    };

    const removeMember = async (userId) => {
        if (currentUserId && Number(userId) === Number(currentUserId)) {
            alert("You can’t remove yourself from the group.");
            return;
        }
        setBusyUserId(userId);
        try {
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/members/remove-member/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ user_id: userId }),
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.detail || `HTTP ${res.status}`);
            }
            await fetchMembers();   // refresh after removal
        } catch (e) {
            console.error(e);
            alert(`Failed to remove: ${e?.message || e}`);
        } finally {
            setBusyUserId(null);
            closeMemberMenu();
        }
    };

    // Leave Group
    const handleLeaveGroup = async () => {
        if (!group?.id) return;
        try {
            const res = await fetch(`${API_ROOT}/groups/${group.id}/leave/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: "{}"
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // Modern error message
                showMessage(data?.detail || "Failed to leave group.", "error");
                setLeaveGroupOpen(false); // Close dialog so they can see the error
                return;
            }

            // Success
            navigate("/admin/groups");
        } catch (e) {
            showMessage(e?.message || "Failed to leave group.", "error");
            setLeaveGroupOpen(false);
        } finally {
            setGroupMenuAnchor(null);
        }
    };

    const saveGroupSettings = async () => {
        if (!group) return;
        setSaveSettingsLoading(true);
        try {
            const fd = new FormData();
            // Allow "public" or "private"
            fd.append("visibility", visibilitySetting);
            // Enforce policy rules
            let validPolicy = joinPolicySetting;
            if (visibilitySetting === "private") validPolicy = "invite";
            else if (visibilitySetting === "public" && parentVis === "private") validPolicy = "approval";

            fd.append("join_policy", validPolicy);

            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                method: "PATCH",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

            setGroup(json); // Update local state
            setJoinPolicySetting(validPolicy); // Ensure local state matches forced rules
            showMessage("Group settings updated successfully.", "success");
        } catch (e) {
            showMessage(`Failed to update settings: ${e.message}`, "error");
        } finally {
            setSaveSettingsLoading(false);
        }
    };

    // For moderators: only send "requests" (now wired to promotion endpoints)
    const requestMemberChange = async (action, member) => {
        const label = member?.user?.name || member?.user?.email || "this member";
        let msg = "";

        if (action === "make_admin") {
            try {
                const headers = {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };
                const body = { user_id: member?.user?.id };

                const r = await fetch(PROMOTION_API.request(group.id), {
                    method: "POST",
                    headers,
                    body: JSON.stringify(body),
                });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(d?.detail || "Failed to send promotion request");

                msg = d?.detail || `Request sent to group admins to make ${label} an Admin.`;
            } catch (e) {
                msg = e?.message || "Could not send promotion request.";
            }
        } else {
            // Fallback text for any other future "request" actions
            switch (action) {
                case "make_moderator":
                    msg = `Request sent to group admins to make ${label} a Moderator.`;
                    break;
                case "make_member":
                    msg = `Request sent to group admins to set ${label} as a Member.`;
                    break;
                case "remove":
                    msg = `Request sent to group admins to remove ${label} from this group.`;
                    break;
                default:
                    msg = "Request sent to group admins.";
            }
        }

        setRequestInfoMessage(msg || "Request sent to group admins.");
        setRequestInfoOpen(true);
        closeMemberMenu();
    };


    const fetchGroup = React.useCallback(async () => {
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
            setGroup(json);
        } catch (e) {
            setError(String(e?.message || e));
            setGroup(null);
        } finally {
            setLoading(false);
        }
    }, [idOrSlug, token]);

    React.useEffect(() => { fetchGroup(); }, [fetchGroup]);

    // Sync settings state when group loads
    React.useEffect(() => {
        if (group) {
            setVisibilitySetting(group.visibility || "public");
            setJoinPolicySetting(group.join_policy || "open");
        }
    }, [group]);

    // Robustly determine parent visibility (for settings validation)
    React.useEffect(() => {
        if (!group || !isSubgroup) {
            setParentVis("");
            return;
        }
        // 1. If parent object is fully loaded
        const pv = group.parent?.visibility;
        if (pv) {
            setParentVis(pv.toLowerCase());
            return;
        }
        // 2. Fetch if missing
        const pid = group.parent_id || group.parent?.id || (typeof group.parent === "object" ? null : group.parent);
        if (!pid) return;

        let active = true;
        fetch(`${API_ROOT}/groups/${pid}/`, {
            headers: { Authorization: token ? `Bearer ${token}` : undefined }
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (active && d?.visibility) setParentVis(d.visibility.toLowerCase());
            })
            .catch(() => { });
        return () => { active = false; };
    }, [group, isSubgroup, token]);


    const fetchMembers = React.useCallback(async () => {
        if (!idOrSlug) return;
        setMemLoading(true); setMemError("");
        try {
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/members/`, {
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const json = await res.json().catch(() => ([]));
            if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
            setMembers(Array.isArray(json) ? json : []);
        } catch (e) {
            setMemError(String(e?.message || e));
            setMembers([]);
        } finally {
            setMemLoading(false);
        }
    }, [idOrSlug, token]);

    // Export members as CSV
    const handleExportCSV = async () => {
        if (!group?.id && !idOrSlug) return;
        setExportingCSV(true);
        try {
            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/members/export-csv/`, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // Get the filename from the response header
            const contentDisposition = res.headers.get("content-disposition");
            let filename = `group_members.csv`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) filename = match[1];
            }

            // Create blob and download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            alert(`Failed to export CSV: ${e?.message || e}`);
        } finally {
            setExportingCSV(false);
        }
    };

    // Call members fetch when group is loaded/changed
    React.useEffect(() => { if (group) fetchMembers(); }, [group, fetchMembers]);
    // Auto-refresh when switching to Members tab
    React.useEffect(() => {
        if (tab === 1) fetchMembers();
    }, [tab, fetchMembers]);

    const onUpdated = (updated) => setGroup(updated);

    return (
        <div className="max-w-screen-xl mx-auto px-3 md:px-4 lg:px-6 py-0">
            <div className="grid grid-cols-12 gap-4">

                {/* RIGHT: your original page content unchanged */}
                <main className="col-span-12 lg:col-span-9">
                    {/* ↓↓↓ PASTE everything that was inside your <Container> here ↓↓↓ */}
                    <Container maxWidth="lg" disableGutters className="py-0">
                        {/* Cover banner */}
                        {/* Header (no cover image) */}
                        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                                spacing={2}
                            >
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={2}
                                    sx={{ width: { xs: "100%", sm: "auto" } }}
                                >
                                    <Box sx={{ position: "relative", display: "inline-flex" }}>
                                        <Avatar
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                bgcolor: "#10b8a6",
                                                border: "3px solid white",
                                            }}
                                            src={group?.logo ? bust(group.logo, group.updated_at || group._cache) : undefined}
                                            alt={group?.name || "Group"}
                                        >
                                            {(group?.name || "G").slice(0, 1).toUpperCase()}
                                        </Avatar>
                                        {canEditGroup && (
                                            <Tooltip title="Change group icon">
                                                <IconButton
                                                    size="small"
                                                    onClick={handleOpenImageOnly}
                                                    sx={{
                                                        position: "absolute",
                                                        right: -6,
                                                        bottom: -6,
                                                        bgcolor: "white",
                                                        border: "1px solid #e2e8f0",
                                                        boxShadow: 1,
                                                        "&:hover": { bgcolor: "#f8fafc" },
                                                    }}
                                                >
                                                    <PhotoCameraRoundedIcon fontSize="inherit" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            variant="h5"
                                            className="font-extrabold"
                                            sx={{ wordBreak: "break-word" }}
                                        >
                                            {group?.name || "Group"}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                size="small"
                                                label={group?.visibility === "private" ? "Private" : "Public"}
                                                className={group?.visibility === "private" ? "bg-slate-200 text-slate-700" : "bg-teal-50 text-teal-700"}
                                            />
                                            {typeof memberCount === "number" && (
                                                <Typography variant="body2">{memberCount} members</Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>

                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                        mt: { xs: 1, sm: 0 },
                                        width: { xs: "100%", sm: "auto" },
                                        justifyContent: { xs: "flex-start", sm: "flex-end" },
                                    }}
                                >
                                    <Button
                                        onClick={() => navigate(-1)}
                                        variant="outlined"
                                        className="rounded-xl"
                                        sx={{ textTransform: "none", color: "#0ea5a4", borderColor: "#0ea5a4" }}
                                    >
                                        Back
                                    </Button>

                                    {canEditGroup && (
                                        <Button
                                            startIcon={<EditNoteRoundedIcon />}
                                            onClick={handleOpenEditDialog}
                                            variant="contained"
                                            className="rounded-xl"
                                            sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                        >
                                            Edit
                                        </Button>
                                    )}

                                    {/* Leave Group Button */}
                                    <Button
                                        startIcon={<LogoutRoundedIcon />}
                                        onClick={() => setLeaveGroupOpen(true)}
                                        variant="outlined"
                                        color="error"
                                        className="rounded-xl"
                                        sx={{ textTransform: "none" }}
                                    >
                                        Leave
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>


                        {/* Tabs – desktop / tablet */}
                        <Paper
                            elevation={0}
                            className="rounded-none"
                            sx={{ display: { xs: "none", sm: "block" } }}
                        >
                            <Tabs
                                value={tab}
                                onChange={(_, v) => setTab(v)}
                                variant="scrollable"
                                allowScrollButtonsMobile
                            >
                                <Tab label="Overview" value={0} />
                                <Tab label="Members" value={1} />

                                {showSubgroupsTab ? (
                                    <Tab label="Sub-groups" value={2} />
                                ) : (
                                    // keep index #2 but hide it so other tabs keep their indices
                                    <Tab sx={{ display: "none" }} disabled value={2} />
                                )}

                                {canSeeSettingsTab ? (
                                    <Tab label="Settings" value={3} />
                                ) : (
                                    // keep index #3 but hide it so other tabs keep their indices
                                    <Tab sx={{ display: "none" }} disabled value={3} />
                                )}

                                <Tab label="Posts" value={4} />

                                {canSeeNotificationsTab && (
                                    <Tab
                                        value={NOTIF_TAB_INDEX} // 5
                                        label={
                                            <Badge
                                                color="error"
                                                variant="dot"
                                                invisible={
                                                    // Hide dot when: not on Notifications tab OR nothing to show
                                                    tab !== NOTIF_TAB_INDEX ||
                                                    (reqs.length + promotionReqs.length === 0)
                                                }
                                            >
                                                Notifications
                                            </Badge>
                                        }
                                    />
                                )}

                                <Tab label="Chat" value={CHAT_TAB_INDEX} /> {/* 6 */}
                            </Tabs>
                        </Paper>

                        {/* Mobile tab header (like HomePage) */}
                        <Box
                            sx={{
                                display: { xs: "flex", sm: "none" },
                                alignItems: "center",
                                justifyContent: "space-between",
                                px: 2,
                                py: 1,
                                borderBottom: "1px solid #e2e8f0",
                                bgcolor: "background.paper",
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {GROUP_TAB_LABELS[tab] || "Overview"}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setMobileTabsOpen(true)}
                                aria-label="Open group sections"
                            >
                                <MenuRoundedIcon />
                            </IconButton>
                        </Box>

                        {/* Content */}
                        {loading ? (
                            <Box className="p-8"><LinearProgress /><Typography className="mt-3 text-slate-500">Loading…</Typography></Box>
                        ) : error ? (
                            <Box className="p-8"><Alert severity="error">{error}</Alert></Box>
                        ) : !group ? (
                            <Box className="p-8"><Alert severity="warning">Group not found.</Alert></Box>
                        ) : (
                            <Box className="p-6">
                                {tab === 0 && (
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={8}>
                                            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                                <Typography variant="h6" className="font-semibold mb-1">About</Typography>
                                                <Typography className="text-slate-600 whitespace-pre-line">
                                                    {group.description || "No description"}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                                <Typography variant="h6" className="font-semibold mb-2">Details</Typography>
                                                <Stack spacing={1} className="text-slate-600">
                                                    <div><b>Visibility:</b> {group.visibility}</div>
                                                    {group.parent_group && (
                                                        <div>
                                                            <b>Parent Group: </b>
                                                            {group.parent_group.name}
                                                        </div>
                                                    )}
                                                    {group.created_by?.name && <div><b>Owner:</b> {group.created_by.name}</div>}
                                                    {group.created_at && <div><b>Created:</b> {new Date(group.created_at).toLocaleString()}</div>}
                                                    {group.updated_at && <div><b>Updated:</b> {new Date(group.updated_at).toLocaleString()}</div>}
                                                </Stack>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                )}
                                {tab === 1 && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" className="mb-4">
                                            <Typography variant="h6" className="font-semibold">Members</Typography>

                                            <Stack direction="row" spacing={1}>
                                                {canAddMembersDirectly && (
                                                    // Owner + Admin → Export CSV
                                                    <Button
                                                        variant="outlined"
                                                        className="rounded-xl"
                                                        startIcon={<FileDownloadRoundedIcon />}
                                                        disabled={exportingCSV}
                                                        sx={{ textTransform: "none", borderColor: "#10b8a6", color: "#10b8a6" }}
                                                        onClick={handleExportCSV}
                                                    >
                                                        {exportingCSV ? "Exporting..." : "Export CSV"}
                                                    </Button>
                                                )}

                                                {canAddMembersDirectly && (
                                                    // Owner + Admin → real "Add members" (opens dialog)
                                                    <Button
                                                        variant="contained"
                                                        className="rounded-xl"
                                                        sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                        onClick={() => setAddOpen(true)}
                                                    >
                                                        Add members
                                                    </Button>
                                                )}

                                                {canRequestMemberChanges && !canAddMembersDirectly && (
                                                    // Moderator → can only *request* adding members (no real add)
                                                    <Button
                                                        variant="outlined"
                                                        className="rounded-xl"
                                                        sx={{ textTransform: "none", borderColor: "#10b8a6", color: "#10b8a6" }}
                                                        onClick={() => {
                                                            fetchRequests();
                                                            setRequestAddOpen(true);
                                                        }}
                                                    >
                                                        Request to add members
                                                    </Button>
                                                )}
                                            </Stack>

                                        </Stack>

                                        {memLoading ? (
                                            <><LinearProgress /><Typography className="mt-2 text-slate-500">Loading members…</Typography></>
                                        ) : memError ? (
                                            <Alert severity="error">{memError}</Alert>
                                        ) : membersWithOwner.length === 0 ? (
                                            <Typography className="text-slate-500">No members yet.</Typography>
                                        ) : (
                                            <>
                                                <Stack divider={<Divider />} spacing={1}>
                                                    {membersWithOwner
                                                        .slice()
                                                        .sort((a, b) => {
                                                            // Owner → Admin → Moderator → Member → Name
                                                            const rank = { owner: 0, admin: 1, moderator: 2, member: 3 };
                                                            const ar = (a.user?.id === ownerId) ? 0 : (rank[a.role] ?? 99);
                                                            const br = (b.user?.id === ownerId) ? 0 : (rank[b.role] ?? 99);
                                                            if (ar !== br) return ar - br;
                                                            return (a.user?.name || "").localeCompare(b.user?.name || "");
                                                        })
                                                        .map((m) => {
                                                            const isOwnerRow = ownerId && Number(m.user.id) === Number(ownerId);
                                                            const role = isOwnerRow ? "owner" : m.role;
                                                            const isSelfAdminRow = myRole === "admin" && currentUserId && Number(m.user.id) === Number(currentUserId);
                                                            const isSelf = currentUserId && Number(m.user.id) === Number(currentUserId);
                                                            const isAdminRow = role === "admin";

                                                            // previous:
                                                            let disabled = busyUserId === m.user.id || isOwnerRow || isSelfAdminRow;

                                                            // NEW rules for moderators:
                                                            if (myRole === "moderator") {
                                                                // cannot act on Admin or Owner
                                                                if (isAdminRow || isOwnerRow) disabled = true;
                                                                // cannot act on other members — only self
                                                                if (!isSelf) disabled = true;
                                                            }
                                                            return (
                                                                <Stack key={m.user.id} direction="row" alignItems="center" spacing={2} className="py-2">
                                                                    <Avatar src={toAbs(m.user.avatar)}>{(m.user.name || "U").slice(0, 1).toUpperCase()}</Avatar>
                                                                    <Box sx={{ flex: 1 }}>
                                                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                            <Typography className="font-medium">{m.user.name || m.user.email || m.user.id}</Typography>
                                                                            {m.user?.kyc_status === "approved" && (
                                                                                <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} /> // Cyan verified icon
                                                                            )}
                                                                        </Stack>
                                                                        <Stack direction="row" spacing={2}>
                                                                            {m.user.email && (
                                                                                <Typography variant="caption" className="text-slate-500">{m.user.email}</Typography>
                                                                            )}
                                                                            {m.joined_at && (
                                                                                <Typography variant="caption" className="text-slate-500">
                                                                                    Joined: {new Date(m.joined_at).toLocaleDateString()}
                                                                                </Typography>
                                                                            )}
                                                                            {m.left_at && (
                                                                                <Typography variant="caption" className="text-red-600">
                                                                                    Left: {new Date(m.left_at).toLocaleDateString()}
                                                                                </Typography>
                                                                            )}
                                                                        </Stack>
                                                                    </Box>

                                                                    <RoleBadge role={role} />

                                                                    {(canHardManageMembers || canRequestMemberChanges) && (
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={(e) => openMemberMenu(e, m)}
                                                                            disabled={disabled}
                                                                            title={
                                                                                isOwnerRow
                                                                                    ? "Owner actions are locked"
                                                                                    : canHardManageMembers
                                                                                        ? "Manage role / remove"
                                                                                        : "Request changes from admins"
                                                                            }
                                                                        >
                                                                            <MoreVertRoundedIcon fontSize="small" />
                                                                        </IconButton>
                                                                    )}

                                                                </Stack>
                                                            );
                                                        })}
                                                </Stack>

                                                {/* Per-member action menu */}
                                                <Menu
                                                    anchorEl={memMenuAnchor}
                                                    open={
                                                        Boolean(memMenuAnchor)
                                                        && !(myRole === "admin" && activeMember && Number(activeMember.user.id) === Number(currentUserId))
                                                        && !(myRole === "moderator" && activeMember && Number(activeMember.user.id) !== Number(currentUserId))
                                                        && !(myRole === "moderator" && activeMember && (activeMember.role === "admin" || (ownerId && Number(activeMember.user.id) === Number(ownerId))))
                                                    }

                                                    onClose={closeMemberMenu}
                                                    elevation={2}
                                                >
                                                    {activeMember && canHardManageMembers && (
                                                        <>
                                                            {/* Owner + Admin: real actions */}
                                                            <MenuItem
                                                                onClick={() => setRole(activeMember.user.id, "admin")}
                                                                disabled={activeMember.user.id === ownerId || activeMember.role === "admin"}
                                                            >
                                                                <ListItemIcon>🛡️</ListItemIcon>
                                                                <ListItemText>Make Admin</ListItemText>
                                                            </MenuItem>

                                                            <MenuItem
                                                                onClick={() => setRole(activeMember.user.id, "moderator")}
                                                                disabled={activeMember.user.id === ownerId || activeMember.role === "moderator"}
                                                            >
                                                                <ListItemIcon>🔧</ListItemIcon>
                                                                <ListItemText>Make Moderator</ListItemText>
                                                            </MenuItem>

                                                            <MenuItem
                                                                onClick={() => setRole(activeMember.user.id, "member")}
                                                                disabled={activeMember.user.id === ownerId || activeMember.role === "member"}
                                                            >
                                                                <ListItemIcon>👤</ListItemIcon>
                                                                <ListItemText>Make Member</ListItemText>
                                                            </MenuItem>

                                                            <Divider />

                                                            <MenuItem
                                                                onClick={() => { setRemoveMemberTarget(activeMember); setRemoveMemberOpen(true); }}
                                                                disabled={activeMember.user.id === ownerId}
                                                            >
                                                                <ListItemIcon>🗑️</ListItemIcon>
                                                                <ListItemText>Remove from Group</ListItemText>
                                                            </MenuItem>
                                                        </>
                                                    )}

                                                    {activeMember
                                                        && !canHardManageMembers
                                                        && canRequestMemberChanges
                                                        && Number(activeMember?.user?.id) === Number(currentUserId)   // ⭐ self only
                                                        && (
                                                            <>
                                                                <MenuItem onClick={() => requestMemberChange("make_admin", activeMember)}>
                                                                    <ListItemIcon>🛡️</ListItemIcon>
                                                                    <ListItemText>Request: make Admin</ListItemText>
                                                                </MenuItem>
                                                            </>
                                                        )}
                                                </Menu>

                                            </>
                                        )}
                                    </Paper>
                                )}

                                {/* Sub-groups tab */}
                                {showSubgroupsTab && tab === 2 && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" className="mb-2">
                                            <Typography variant="h6" className="font-semibold">Sub-groups</Typography>
                                            {canCreateSubgroups && (
                                                <Button
                                                    variant="contained"
                                                    className="rounded-xl"
                                                    sx={{ textTransform: "none", backgroundColor: "#10b981", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                    onClick={() => setAddSubOpen(true)}
                                                    startIcon={<AddRoundedIcon />}
                                                >
                                                    Add sub-group
                                                </Button>
                                            )}
                                        </Stack>

                                        {subLoading ? (
                                            <LinearProgress />
                                        ) : subError ? (
                                            <Alert severity="error">{subError}</Alert>
                                        ) : visibleSubgroups.length === 0 ? (
                                            <Typography className="text-slate-500">
                                                {isOwnerRole || isAdminRole
                                                    ? "No sub-groups yet."
                                                    : "You haven't joined any sub-groups yet."}
                                            </Typography>
                                        ) : (
                                            <Stack spacing={1.5}>
                                                {visibleSubgroups.map((sg) => (
                                                    <Paper key={sg.id || sg.slug} variant="outlined" className="p-2 rounded-xl">
                                                        <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
                                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                                <Avatar
                                                                    variant="circular"
                                                                    src={bust(sg.cover_image)}
                                                                    alt={sg.name || "Group"}
                                                                >
                                                                    {(sg.name || "?").charAt(0).toUpperCase()}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography className="font-semibold">{sg.name}</Typography>
                                                                    <Typography variant="caption" className="text-slate-500">
                                                                        {(sg.visibility === "private" ? "Private" : "Public")} •{" "}
                                                                        {(sg.member_count ?? sg.members_count ?? 0)} members
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                endIcon={<OpenInNewRoundedIcon />}
                                                                onClick={() => navigate(`/groups/${sg.slug || sg.id}`)}
                                                            >
                                                                Open
                                                            </Button>
                                                        </Stack>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        )}

                                        {canCreateSubgroups && (
                                            <AddSubgroupDialog
                                                open={addSubOpen}
                                                onClose={() => setAddSubOpen(false)}
                                                parentGroup={group}
                                                onCreated={(g) => { setSubgroups((prev) => [g, ...prev]); }}
                                            />
                                        )}
                                    </Paper>
                                )}

                                {tab === 3 && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Typography variant="h6" className="font-semibold mb-1">Settings</Typography>
                                        <Typography className="text-slate-500 mb-4">
                                            Manage group visibility and permissions.
                                        </Typography>

                                        {/* Visibility & Join Policy Controls */}
                                        <Grid container spacing={3} className="mb-6">
                                            <Grid item xs={12} md={6}>
                                                <CustomSelect
                                                    label="Visibility"
                                                    value={visibilitySetting}
                                                    onChange={(val) => {
                                                        setVisibilitySetting(val);
                                                        // Auto-adjust join policy based on rules
                                                        if (val === "private") {
                                                            setJoinPolicySetting("invite");
                                                        }
                                                        // NEW: If switching to PUBLIC, default to Approval (user can change to Open later if allowed)
                                                        if (val === "public") {
                                                            setJoinPolicySetting("approval");
                                                        }
                                                    }}
                                                    options={[
                                                        { label: "Public (anyone can find & request to join)", value: "public" },
                                                        { label: "Private (invite-only)", value: "private" }
                                                    ]}
                                                    helperText={
                                                        (parentVis === "private" && visibilitySetting === "public")
                                                            ? "Public subgroups of private groups will require approval to join."
                                                            : (visibilitySetting === "private" ? "Private groups are always invite-only." : "")
                                                    }
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <CustomSelect
                                                    label="Join Policy"
                                                    value={joinPolicySetting}
                                                    onChange={(val) => setJoinPolicySetting(val)}
                                                    disabled={visibilitySetting === "private"} // Private is always invite-only
                                                    options={
                                                        visibilitySetting === "public"
                                                            ? (
                                                                (parentVis === "private")
                                                                    ? [{ label: "Approval required", value: "approval" }]
                                                                    : [
                                                                        { label: "Open (join instantly)", value: "open" },
                                                                        { label: "Approval required", value: "approval" }
                                                                    ]
                                                            )
                                                            : [
                                                                { label: "Invite only", value: "invite" }
                                                            ]
                                                    }
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Button
                                                    variant="contained"
                                                    disabled={saveSettingsLoading}
                                                    onClick={saveGroupSettings}
                                                    className="rounded-xl"
                                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                >
                                                    {saveSettingsLoading ? "Saving..." : "Save Changes"}
                                                </Button>
                                            </Grid>
                                        </Grid>

                                        <Divider className="mb-4" />
                                        {/* Chat toggle */}
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" className="mb-2">
                                            <div>
                                                <Typography variant="subtitle1" className="font-semibold">Group Chat</Typography>
                                                <Typography variant="body2" className="text-slate-600">
                                                    {chatOn ? "Members can chat in this group." : "Chat is disabled — only owners/admins can post updates."}
                                                </Typography>
                                            </div>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={!!chatOn}
                                                        onChange={(e) => {
                                                            const next = e.target.checked;
                                                            setChatNext(next);
                                                            setChatConfirmOpen(true);   // show confirm instead of saving immediately
                                                        }}
                                                        disabled={chatSaving}
                                                    />
                                                }
                                                label={chatOn ? "On" : "Off"}
                                            />
                                        </Stack>
                                        <Divider className="my-3" />

                                        <Stack direction="row" spacing={1}>
                                            {canEditGroup && (
                                                <Button
                                                    variant="contained"
                                                    className="rounded-xl"
                                                    startIcon={<EditNoteRoundedIcon fontSize="small" />}
                                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                    onClick={handleOpenEditDialog}
                                                >
                                                    Edit Details
                                                </Button>
                                            )}
                                            {canEditGroup && (
                                                <Button
                                                    variant="outlined"
                                                    className="rounded-xl"
                                                    startIcon={<PhotoCameraRoundedIcon fontSize="small" />}
                                                    sx={{ textTransform: "none" }}
                                                    onClick={handleOpenImageOnly}
                                                >
                                                    Edit Group Icon
                                                </Button>
                                            )}
                                            {canEditGroup && (
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    className="rounded-xl"
                                                    sx={{ textTransform: "none" }}
                                                    onClick={() => setDeleteGroupOpen(true)}
                                                >
                                                    Delete Group
                                                </Button>
                                            )}
                                        </Stack>
                                    </Paper>
                                )}

                                {tab === 4 && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Stack spacing={2}>
                                            <Typography variant="h6" className="font-semibold">Posts</Typography>

                                            {!canPost ? (
                                                <Alert severity="info">
                                                    Only the <b>Owner</b>, <b>Admins</b>, and <b>Moderators</b> can create posts in this group.
                                                </Alert>
                                            ) : (
                                                <Paper elevation={0} className="rounded-xl border border-slate-200 p-3">
                                                    <Stack spacing={2}>
                                                        <Stack direction="row" spacing={2} alignItems="center">
                                                            <TextField
                                                                label="Post Type"
                                                                select size="small" sx={{ minWidth: 200 }}
                                                                value={postType}
                                                                onChange={(e) => setPostType(e.target.value)}
                                                            >
                                                                <MenuItem value="text">Text</MenuItem>
                                                                <MenuItem value="image">Image</MenuItem>
                                                                <MenuItem value="link">Link</MenuItem>
                                                                <MenuItem value="poll">Poll</MenuItem>

                                                            </TextField>

                                                            <Button
                                                                variant="contained"
                                                                onClick={createPost}
                                                                disabled={creating || (postType === "text" && !postText.trim()) || (postType === "image" && !postImageFile)}
                                                                startIcon={<SendRoundedIcon />}
                                                                className="rounded-xl"
                                                                sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                            >
                                                                Post
                                                            </Button>
                                                        </Stack>

                                                        {/* Dynamic fields */}
                                                        {postType === "text" && (
                                                            <TextField
                                                                label="Write something…"
                                                                multiline minRows={3} fullWidth
                                                                value={postText}
                                                                onChange={(e) => setPostText(e.target.value)}
                                                            />
                                                        )}

                                                        {postType === "image" && (
                                                            <>
                                                                <TextField
                                                                    label="Caption (optional)"
                                                                    fullWidth
                                                                    multiline
                                                                    minRows={2}
                                                                    value={postText}
                                                                    onChange={(e) => setPostText(e.target.value)}
                                                                />
                                                                <Stack direction="row" spacing={1} alignItems="center">
                                                                    <label htmlFor="post-image-file">
                                                                        <Button component="span" size="small" variant="outlined" startIcon={<AttachFileRoundedIcon />}>
                                                                            Choose image
                                                                        </Button>
                                                                    </label>
                                                                    <input
                                                                        id="post-image-file"
                                                                        type="file"
                                                                        accept="image/*"
                                                                        style={{ display: "none" }}
                                                                        onChange={(e) => setPostImageFile(e.target.files?.[0] || null)}
                                                                    />
                                                                    <Typography variant="body2" className="text-slate-600">
                                                                        {postImageFile ? postImageFile.name : "No file selected"}
                                                                    </Typography>
                                                                </Stack>
                                                            </>
                                                        )}

                                                        {postType === "link" && (
                                                            <>
                                                                <TextField
                                                                    label="URL"
                                                                    fullWidth
                                                                    value={postLinkUrl}
                                                                    onChange={(e) => setPostLinkUrl(e.target.value)}
                                                                    placeholder="https://example.com"
                                                                />
                                                                <TextField
                                                                    label="Comment (optional)"
                                                                    fullWidth
                                                                    multiline
                                                                    minRows={2}
                                                                    value={postText}
                                                                    onChange={(e) => setPostText(e.target.value)}
                                                                />
                                                            </>
                                                        )}

                                                        {postType === "poll" && (
                                                            <>
                                                                <TextField
                                                                    label="Poll question"
                                                                    fullWidth
                                                                    value={pollQuestion}
                                                                    onChange={(e) => setPollQuestion(e.target.value)}
                                                                />
                                                                <Stack spacing={1}>
                                                                    {pollOptions.map((opt, idx) => (
                                                                        <Stack key={idx} direction="row" spacing={1} alignItems="center">
                                                                            <TextField
                                                                                label={`Option ${idx + 1}`}
                                                                                fullWidth
                                                                                value={opt}
                                                                                onChange={(e) => updatePollOption(idx, e.target.value)}
                                                                            />
                                                                            {pollOptions.length > 2 && (
                                                                                <Button size="small" onClick={() => removePollOption(idx)}>Remove</Button>
                                                                            )}
                                                                        </Stack>
                                                                    ))}
                                                                    <Button size="small" onClick={addPollOption} startIcon={<PollRoundedIcon />}>
                                                                        Add option
                                                                    </Button>
                                                                </Stack>
                                                            </>
                                                        )}


                                                    </Stack>
                                                </Paper>
                                            )}

                                            {/* Posts list */}
                                            {postsLoading ? (
                                                <>
                                                    <LinearProgress />
                                                    <Typography className="mt-2 text-slate-500">Loading posts…</Typography>
                                                </>
                                            ) : postsError ? (
                                                <Alert severity="error">{postsError}</Alert>
                                            ) : posts.length === 0 ? (
                                                <Typography className="text-slate-500" sx={{ fontStyle: (postsMeta?.has_removed_posts || (postsMeta?.removed_posts > 0 && postsMeta?.visible_posts === 0)) ? 'italic' : 'normal' }}>
                                                    {(postsMeta?.has_removed_posts || (postsMeta?.removed_posts > 0 && postsMeta?.visible_posts === 0))
                                                        ? "This content was removed by moderators."
                                                        : "No posts yet."}
                                                </Typography>
                                            ) : (
                                                <Stack spacing={2}>
                                                    {posts.map((p) => {
                                                        const m = p.metadata || {};
                                                        const isRemoved = p.is_removed || (p.moderation_status === "removed") || (p.status === "removed") || (m.status === "removed") || (m.moderationStatus === "removed") || (p.moderationStatus === "removed");

                                                        return (
                                                            <Paper key={postKey(p)} elevation={0} className="rounded-xl border border-slate-200 p-3">
                                                                <Stack direction="row" spacing={1} alignItems="center" className="mb-1">
                                                                    <Chip size="small" label={String(p.type || "text").toUpperCase()} />
                                                                    <Typography variant="caption" className="text-slate-500">
                                                                        {p.created_by?.name || p.created_by?.email || "User"} • {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
                                                                    </Typography>
                                                                </Stack>

                                                                {/* Render by type */}
                                                                {/* footer actions at end of post — show for ALL types if we can moderate and item has an id */}
                                                                {canModerate && Number.isInteger(Number(p.feed_item_id ?? p.id)) && (
                                                                    <Stack direction="row" justifyContent="flex-end" className="mt-2">
                                                                        <IconButton size="small" onClick={(e) => openPostMenu(e, p)} title="More">
                                                                            <MoreVertRoundedIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Stack>
                                                                )}

                                                                {isRemoved ? (
                                                                    <Typography color="text.secondary" sx={{ fontStyle: "italic", py: 2 }}>
                                                                        This content was removed by moderators.
                                                                    </Typography>
                                                                ) : (
                                                                    <>
                                                                        {p.type === "image" ? (
                                                                            <>
                                                                                {p.text && <ClampedText text={p.text} sx={{ mb: 1 }} />}
                                                                                {p.image && (
                                                                                    <img
                                                                                        alt="post"
                                                                                        src={toAbs(p.image)}
                                                                                        style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12 }}
                                                                                    />
                                                                                )}
                                                                            </>
                                                                        ) : p.type === "link" ? (
                                                                            <>
                                                                                {p.text && <ClampedText text={p.text} sx={{ mb: 0.5 }} />}
                                                                                {p.url && (
                                                                                    <a
                                                                                        href={toAbs(p.url)}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        style={{ color: "#0ea5a4", wordBreak: "break-word" }}
                                                                                    >
                                                                                        <LinkRoundedIcon fontSize="small" /> {p.url}
                                                                                    </a>
                                                                                )}
                                                                            </>
                                                                        ) : p.type === "poll" ? (
                                                                            <PollResultsBlock post={p} />

                                                                        ) : (
                                                                            <ClampedText text={p.text || ""} />
                                                                        )}
                                                                    </>
                                                                )}
                                                                <GroupPostSocialBar
                                                                    groupIdOrSlug={idOrSlug}
                                                                    groupOwnerId={group?.created_by?.id}
                                                                    post={p}
                                                                />
                                                            </Paper>
                                                        );
                                                    })}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Paper>
                                )}
                                {tab === CHAT_TAB_INDEX && (
                                    <Paper
                                        elevation={0}
                                        className="rounded-2xl border border-slate-200 p-4"
                                    >
                                        <GroupChatTab
                                            group={group}
                                            onEditGroup={() => setEditOpen(true)}
                                            membersWithOwner={membersWithOwner}
                                            currentUserId={currentUserId}
                                            chatOn={chatOn}
                                            myRole={myRole}
                                        />
                                    </Paper>
                                )}

                                {canSeeNotificationsTab && tab === NOTIF_TAB_INDEX && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Stack spacing={2}>
                                            <Typography variant="h6" className="font-semibold">Notifications</Typography>

                                            {canReviewRequests ? (
                                                <>
                                                    {/* Filter Tabs */}
                                                    <Box sx={{ display: "flex", gap: 1, mb: 2, pb: 1, borderBottom: "2px solid #e2e8f0" }}>
                                                        <Button
                                                            onClick={() => setNotifTab(0)}
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: notifTab === 0 ? 600 : 400,
                                                                color: notifTab === 0 ? "#10b8a6" : "#64748b",
                                                                borderBottom: notifTab === 0 ? "3px solid #10b8a6" : "none",
                                                                paddingBottom: "8px",
                                                                marginBottom: "-2px",
                                                                "&:hover": { backgroundColor: "transparent", color: "#10b8a6" },
                                                            }}
                                                        >
                                                            All Notifications
                                                            {(reqs.length + promotionReqs.length > 0) && (
                                                                <Chip
                                                                    label={reqs.length + promotionReqs.length}
                                                                    size="small"
                                                                    sx={{ ml: 1, height: 20, backgroundColor: "#10b8a6", color: "white" }}
                                                                />
                                                            )}
                                                        </Button>

                                                        <Button
                                                            onClick={() => setNotifTab(1)}
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: notifTab === 1 ? 600 : 400,
                                                                color: notifTab === 1 ? "#10b8a6" : "#64748b",
                                                                borderBottom: notifTab === 1 ? "3px solid #10b8a6" : "none",
                                                                paddingBottom: "8px",
                                                                marginBottom: "-2px",
                                                                "&:hover": { backgroundColor: "transparent", color: "#10b8a6" },
                                                            }}
                                                        >
                                                            Join Requests
                                                            {reqs.length > 0 && (
                                                                <Chip
                                                                    label={reqs.length}
                                                                    size="small"
                                                                    sx={{ ml: 1, height: 20, backgroundColor: "#10b8a6", color: "white" }}
                                                                />
                                                            )}
                                                        </Button>

                                                        <Button
                                                            onClick={() => setNotifTab(2)}
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: notifTab === 2 ? 600 : 400,
                                                                color: notifTab === 2 ? "#10b8a6" : "#64748b",
                                                                borderBottom: notifTab === 2 ? "3px solid #10b8a6" : "none",
                                                                paddingBottom: "8px",
                                                                marginBottom: "-2px",
                                                                "&:hover": { backgroundColor: "transparent", color: "#10b8a6" },
                                                            }}
                                                        >
                                                            Promotion Requests
                                                            {promotionReqs.length > 0 && (
                                                                <Chip
                                                                    label={promotionReqs.length}
                                                                    size="small"
                                                                    sx={{ ml: 1, height: 20, backgroundColor: "#10b8a6", color: "white" }}
                                                                />
                                                            )}
                                                        </Button>
                                                    </Box>

                                                    {/* Combined list or empty state */}
                                                    {notifTab === 0 && (reqsLoading || promotionLoading) && (
                                                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                                                            <CircularProgress />
                                                        </Box>
                                                    )}
                                                    {(notifTab === 0 || notifTab === 1) && (
                                                        <>
                                                            {reqsError && <Alert severity="error">{reqsError}</Alert>}

                                                            {reqsLoading && notifTab !== 0 ? (
                                                                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                                                                    <CircularProgress />
                                                                </Box>
                                                            ) : reqs.length === 0 && notifTab !== 0 ? (
                                                                <Alert severity="info">
                                                                    No join requests for this group.
                                                                </Alert>
                                                            ) : reqs.length > 0 ? (
                                                                <List sx={{ width: "100%" }}>
                                                                    {reqs.map((r) => {
                                                                        const id = r.id ?? r.pk;
                                                                        const u = r.user || r.requester || r.member || {};
                                                                        const name = u.full_name || u.name || u.username || "Member";
                                                                        const avatar = u.avatar || u.photo_url || null;
                                                                        const when = r.created_at || r.requested_at || r.createdAt;
                                                                        const userId = r.user?.id;

                                                                        return (
                                                                            <ListItem
                                                                                key={id}
                                                                                divider
                                                                                secondaryAction={
                                                                                    <ButtonGroup variant="outlined" size="small">
                                                                                        <Button
                                                                                            color="success"
                                                                                            onClick={() => takeAction(userId, "approve")}
                                                                                            disabled={reqsLoading}
                                                                                        >
                                                                                            Approve
                                                                                        </Button>
                                                                                        <Button
                                                                                            color="error"
                                                                                            onClick={() => takeAction(userId, "reject")}
                                                                                            disabled={reqsLoading}
                                                                                        >
                                                                                            Reject
                                                                                        </Button>
                                                                                    </ButtonGroup>
                                                                                }
                                                                            >
                                                                                <ListItemAvatar>
                                                                                    <Avatar src={avatar || undefined}>
                                                                                        {name?.[0]?.toUpperCase() || "U"}
                                                                                    </Avatar>
                                                                                </ListItemAvatar>
                                                                                <ListItemText
                                                                                    primary={<span><b>{name}</b> requested to join this group</span>}
                                                                                    secondary={when ? `Requested on ${fmtWhen(when)}` : null}
                                                                                />
                                                                            </ListItem>
                                                                        );
                                                                    })}
                                                                </List>
                                                            ) : null}
                                                        </>
                                                    )}

                                                    {/* Promotion Requests */}
                                                    {(notifTab === 0 || notifTab === 2) && (
                                                        <>
                                                            {promotionError && <Alert severity="error">{promotionError}</Alert>}

                                                            {promotionLoading && notifTab !== 0 ? (
                                                                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                                                                    <CircularProgress />
                                                                </Box>
                                                            ) : promotionReqs.length === 0 && notifTab !== 0 ? (
                                                                <Alert severity="info">
                                                                    No pending promotion requests.
                                                                </Alert>
                                                            ) : promotionReqs.length > 0 ? (
                                                                <List sx={{ width: "100%" }}>
                                                                    {promotionReqs.map((r) => {
                                                                        const id = r.id ?? r.pk ?? r.request_id;
                                                                        const u = r.user || r.requester || r.moderator || {};
                                                                        const name = u.full_name || u.name || u.username || "Member";
                                                                        const avatar = u.avatar || u.photo_url || null;
                                                                        const when = r.created_at || r.requested_at || r.createdAt;

                                                                        return (
                                                                            <ListItem
                                                                                key={id}
                                                                                divider
                                                                                secondaryAction={
                                                                                    <ButtonGroup variant="outlined" size="small">
                                                                                        <Button
                                                                                            color="success"
                                                                                            onClick={() => takePromotionAction(r, "approve")}
                                                                                            disabled={promotionLoading}
                                                                                        >
                                                                                            Approve
                                                                                        </Button>
                                                                                        <Button
                                                                                            color="error"
                                                                                            onClick={() => takePromotionAction(r, "reject")}
                                                                                            disabled={promotionLoading}
                                                                                        >
                                                                                            Reject
                                                                                        </Button>
                                                                                    </ButtonGroup>
                                                                                }
                                                                            >
                                                                                <ListItemAvatar>
                                                                                    <Avatar src={avatar || undefined}>
                                                                                        {name?.[0]?.toUpperCase() || "U"}
                                                                                    </Avatar>
                                                                                </ListItemAvatar>
                                                                                <ListItemText
                                                                                    primary={
                                                                                        <span>
                                                                                            <b>{name}</b> requested to be promoted to <b>Admin</b>
                                                                                        </span>
                                                                                    }
                                                                                    secondary={when ? `Requested on ${fmtWhen(when)}` : null}
                                                                                />
                                                                            </ListItem>
                                                                        );
                                                                    })}
                                                                </List>
                                                            ) : null}
                                                        </>
                                                    )}

                                                    {/* All Notifications Combined View */}
                                                    {notifTab === 0 && !reqsLoading && !promotionLoading && reqs.length === 0 && promotionReqs.length === 0 && (
                                                        <Alert severity="info">
                                                            No notifications. Your group is all caught up! ✓
                                                        </Alert>
                                                    )}

                                                    {/* Refresh buttons */}
                                                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={fetchRequests}
                                                            disabled={reqsLoading}
                                                        >
                                                            Refresh
                                                        </Button>
                                                    </Stack>
                                                </>
                                            ) : (
                                                <Alert severity="info">
                                                    You can see this tab, but only <b>Owners</b> and <b>Admins</b> can review
                                                    join and promotion requests.
                                                </Alert>
                                            )}
                                        </Stack>
                                    </Paper>
                                )}

                            </Box>
                        )}

                        {/* Mobile tabs drawer */}
                        <Drawer
                            anchor="right"
                            open={mobileTabsOpen}
                            onClose={() => setMobileTabsOpen(false)}
                            sx={{
                                display: { xs: "block", sm: "none" },
                                "& .MuiBackdrop-root": {
                                    backgroundColor: "rgba(15, 23, 42, 0.45)",
                                },
                            }}
                            PaperProps={{
                                sx: {
                                    width: { xs: "88vw", sm: 320 },
                                    maxWidth: "100vw",
                                    borderTopLeftRadius: 24,
                                    borderBottomLeftRadius: 24,
                                    borderTopRightRadius: 0,
                                    borderBottomRightRadius: 0,
                                    pb: 2,
                                },
                            }}
                        >
                            <Box sx={{ p: 2 }}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        mb: 2,
                                        fontWeight: 700,
                                        fontSize: 16,
                                        textTransform: "none",
                                    }}
                                >
                                    Go to section
                                </Typography>

                                <Stack spacing={1}>
                                    {GROUP_TAB_LABELS.map((label, index) => {
                                        // Respect your existing visibility rules
                                        if (index === 2 && !showSubgroupsTab) return null;
                                        if (index === 3 && !canSeeSettingsTab) return null;
                                        if (index === NOTIF_TAB_INDEX && !canSeeNotificationsTab) return null;

                                        return (
                                            <Button
                                                key={label}
                                                fullWidth
                                                variant="text"
                                                sx={{
                                                    justifyContent: "flex-start",
                                                    textTransform: "none",
                                                    borderRadius: 999,
                                                    px: 1.5,
                                                    py: 0.75,
                                                    fontSize: 14,
                                                    fontWeight: index === tab ? 700 : 500,
                                                    backgroundColor:
                                                        index === tab ? "#E6F7F6" : "transparent",
                                                    "&:hover": {
                                                        backgroundColor:
                                                            index === tab ? "#E6F7F6" : "#F3F4F6",
                                                    },
                                                }}
                                                onClick={() => {
                                                    setTab(index);
                                                    setMobileTabsOpen(false);
                                                }}
                                            >
                                                {label}
                                            </Button>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        </Drawer>

                        {/* Edit dialog */}
                        <AddMembersDialog
                            open={addOpen}
                            onClose={() => setAddOpen(false)}
                            groupIdOrSlug={idOrSlug}
                            existingIds={[...members.map(m => m.user.id), ownerId].filter(Boolean)} // 👈 add owner too
                            ownerId={ownerId}                                                     // 👈 new prop
                            onAdded={async (n) => {
                                await fetchMembers();
                                setGroup((prev) => prev ? { ...prev, member_count: (prev.member_count || 0) + n } : prev);
                            }}
                        />

                        <RequestAddMembersDialog
                            open={requestAddOpen}
                            onClose={() => setRequestAddOpen(false)}
                            groupIdOrSlug={idOrSlug}
                            existingIds={[
                                ...new Set([
                                    ...members.map(m => m.user.id),
                                    ...reqs.map(r => r.user?.id).filter(Boolean),
                                    ownerId,                                  // 👈 add owner here too
                                ]),
                            ].filter(Boolean)}
                            ownerId={ownerId}                              // 👈 new prop
                            onRequested={(n) => {
                                setRequestAddOpen(false);
                            }}
                        />


                        {/* Role assign — error modal */}
                        <Dialog
                            open={roleErrorOpen}
                            onClose={() => setRoleErrorOpen(false)}
                            fullWidth
                            maxWidth="xs"
                            PaperProps={{ sx: { borderRadius: 3 } }}
                        >
                            <DialogTitle sx={{ fontWeight: 800 }}>Couldn’t update role</DialogTitle>
                            <DialogContent>
                                <Alert severity="error" sx={{ my: 1 }}>
                                    {roleErrorMsg || "Something went wrong while assigning the role."}
                                </Alert>
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={() => setRoleErrorOpen(false)}
                                    variant="contained"
                                    sx={{ textTransform: "none" }}
                                >
                                    OK
                                </Button>
                            </DialogActions>
                        </Dialog>
                        {/* Promotion request — info modal */}
                        <Dialog
                            open={requestInfoOpen}
                            onClose={() => setRequestInfoOpen(false)}
                            fullWidth
                            maxWidth="xs"
                            PaperProps={{ sx: { borderRadius: 3 } }}
                        >
                            <DialogTitle sx={{ fontWeight: 800 }}>Request sent</DialogTitle>
                            <DialogContent>
                                <Alert severity="success" sx={{ my: 1 }}>
                                    {requestInfoMessage || "Your request has been sent to the group admins."}
                                </Alert>
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={() => setRequestInfoOpen(false)}
                                    variant="contained"
                                    sx={{ textTransform: "none" }}
                                >
                                    OK
                                </Button>
                            </DialogActions>
                        </Dialog>

                        <Dialog
                            open={chatConfirmOpen}
                            onClose={() => setChatConfirmOpen(false)}
                            fullWidth
                            maxWidth="xs"
                            PaperProps={{ sx: { borderRadius: 3 } }}
                        >
                            <DialogTitle sx={{ fontWeight: 800 }}>
                                {chatNext ? "Allow everyone to chat?" : "Restrict chat to admins only?"}
                            </DialogTitle>
                            <DialogContent>
                                <Alert severity={chatNext ? "info" : "warning"} sx={{ mb: 2 }}>
                                    {chatNext
                                        ? "Members will be able to send messages in this group."
                                        : "Only owners/admins will be able to send messages. Members won’t be able to chat."}
                                </Alert>
                                <Typography variant="body2" color="text.secondary">
                                    You can change this anytime in Settings.
                                </Typography>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setChatConfirmOpen(false)} sx={{ textTransform: "none" }}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    disabled={chatSaving}
                                    onClick={async () => {
                                        setChatConfirmOpen(false);
                                        setChatOn(chatNext);            // optimistic
                                        await saveChatToggle(chatNext); // persist to DB as all/admins_only
                                    }}
                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                >
                                    {chatNext ? "Allow all" : "Set to admins_only"}
                                </Button>
                            </DialogActions>
                        </Dialog>

                        {/* Delete Group — confirmation */}
                        <Dialog
                            open={deleteGroupOpen}
                            onClose={() => (deletingGroup ? null : setDeleteGroupOpen(false))}
                            fullWidth
                            maxWidth="xs"
                            PaperProps={{ sx: { borderRadius: 3 } }}
                        >
                            <DialogTitle sx={{ fontWeight: 800 }}>Delete this group?</DialogTitle>
                            <DialogContent>
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    This action cannot be undone. All group posts, polls and memberships will be removed.
                                </Alert>
                                <Typography sx={{ mb: 1 }}>
                                    Type the group name to confirm:
                                </Typography>
                                <TextField
                                    fullWidth
                                    autoFocus
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                    placeholder={group?.name || "Group name"}
                                />
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setDeleteGroupOpen(false)} disabled={deletingGroup} sx={{ textTransform: "none" }}>
                                    Cancel
                                </Button>
                                <Button
                                    color="error"
                                    variant="contained"
                                    disabled={deletingGroup || (confirmName || "").trim() !== (group?.name || "").trim()}
                                    sx={{ textTransform: "none" }}
                                    onClick={async () => {
                                        if (!group) return;
                                        setDeletingGroup(true);
                                        try {
                                            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                                                method: "DELETE",
                                                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                            });
                                            if (!res.ok && res.status !== 204) {
                                                const j = await res.json().catch(() => ({}));
                                                throw new Error(j?.detail || `HTTP ${res.status}`);
                                            }
                                            setDeletingGroup(false);
                                            setDeleteGroupOpen(false);
                                            navigate("/admin/groups"); // adjust route if your list lives elsewhere
                                        } catch (e) {
                                            setDeletingGroup(false);
                                            alert(`Failed to delete group: ${e?.message || e}`);
                                        }
                                    }}
                                >
                                    {deletingGroup ? "Deleting…" : "Delete"}
                                </Button>
                            </DialogActions>
                        </Dialog>

                        {/* Remove member — confirmation */}
                        <Dialog
                            open={removeMemberOpen}
                            onClose={() => setRemoveMemberOpen(false)}
                            fullWidth
                            maxWidth="xs"
                            PaperProps={{ sx: { borderRadius: 3 } }}
                        >
                            <DialogTitle sx={{ fontWeight: 800 }}>Remove member?</DialogTitle>
                            <DialogContent>
                                <Typography sx={{ mb: 1.5 }}>
                                    {removeMemberTarget?.user?.name || removeMemberTarget?.user?.email || "This member"} will be
                                    removed from the group and will lose access to posts and updates.
                                </Typography>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setRemoveMemberOpen(false)} sx={{ textTransform: "none" }}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    sx={{ textTransform: "none" }}
                                    disabled={
                                        !!removeMemberTarget &&
                                        busyUserId === (removeMemberTarget.user?.id ?? removeMemberTarget.userId)
                                    }
                                    onClick={() => {
                                        const id = removeMemberTarget?.user?.id ?? removeMemberTarget?.userId;
                                        if (!id) return;
                                        setRemoveMemberOpen(false);          // close modal first
                                        removeMember(id);                    // uses your existing function
                                    }}
                                >
                                    Remove
                                </Button>
                            </DialogActions>
                        </Dialog>


                        {/* Per-post actions menu */}
                        <Menu anchorEl={postMenuAnchor} open={Boolean(postMenuAnchor)} onClose={closePostMenu}>
                            <MenuItem onClick={() => toggleHidePost(activePost)} disabled={!activePost}>
                                <ListItemIcon>👁️</ListItemIcon>
                                <ListItemText>
                                    {(activePost?.hidden ?? activePost?.is_hidden) ? "Unhide" : "Hide"}
                                </ListItemText>
                            </MenuItem>

                            <MenuItem onClick={() => { setEditImageFile(null); setEditPostOpen(true); closePostMenu(); }} disabled={!activePost}>
                                <ListItemIcon>✏️</ListItemIcon>
                                <ListItemText>Edit</ListItemText>
                            </MenuItem>

                            <MenuItem onClick={() => { setDeleteConfirmOpen(true); }} disabled={!activePost}>
                                <ListItemIcon>🗑️</ListItemIcon>
                                <ListItemText>Delete</ListItemText>
                            </MenuItem>
                        </Menu>

                        {/* Delete confirmation dialog */}
                        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                            <DialogTitle>Delete this post?</DialogTitle>
                            <DialogContent>
                                <Typography>This action can’t be undone. The post will be permanently removed for this group.</Typography>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
                                <Button onClick={deletePost} color="error" variant="contained" sx={{ textTransform: "none" }}>
                                    Delete
                                </Button>
                            </DialogActions>
                        </Dialog>
                        {/* Edit Post dialog */}
                        <Dialog
                            open={editPostOpen}
                            onClose={() => { setEditPostOpen(false); setEditImageFile(null); }}
                            fullWidth
                            maxWidth="sm"
                        >
                            <DialogTitle>Edit Post</DialogTitle>
                            <DialogContent>
                                {activePost?.type === "text" && (
                                    <TextField
                                        label="Text"
                                        fullWidth
                                        multiline minRows={3}
                                        value={activePost?.text || ""}
                                        onChange={(e) => setActivePost({ ...activePost, text: e.target.value })}
                                        className="mt-2"
                                    />
                                )}

                                {activePost?.type === "link" && (
                                    <>
                                        <TextField
                                            label="Text (optional)"
                                            fullWidth
                                            multiline minRows={2}
                                            value={activePost?.text || ""}
                                            onChange={(e) => setActivePost({ ...activePost, text: e.target.value })}
                                            className="mt-2"
                                        />
                                        <TextField
                                            label="URL"
                                            fullWidth
                                            value={activePost?.url || ""}
                                            onChange={(e) => setActivePost({ ...activePost, url: e.target.value })}
                                            className="mt-2"
                                        />
                                    </>
                                )}

                                {activePost?.type === "event" && (
                                    <>
                                        <TextField
                                            label="Title"
                                            fullWidth
                                            value={activePost?.title || ""}
                                            onChange={(e) => setActivePost({ ...activePost, title: e.target.value })}
                                            className="mt-2"
                                        />
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} className="mt-2">
                                            <TextField
                                                label="Starts at"
                                                type="datetime-local"
                                                value={activePost?.starts_at ? activePost.starts_at.slice(0, 16) : ""}
                                                onChange={(e) => setActivePost({ ...activePost, starts_at: e.target.value })}
                                                InputLabelProps={{ shrink: true }}
                                                fullWidth
                                            />
                                            <TextField
                                                label="Ends at"
                                                type="datetime-local"
                                                value={activePost?.ends_at ? activePost.ends_at.slice(0, 16) : ""}
                                                onChange={(e) => setActivePost({ ...activePost, ends_at: e.target.value })}
                                                InputLabelProps={{ shrink: true }}
                                                fullWidth
                                            />
                                        </Stack>
                                        <TextField
                                            label="Description"
                                            fullWidth
                                            multiline minRows={2}
                                            value={activePost?.text || ""}
                                            onChange={(e) => setActivePost({ ...activePost, text: e.target.value })}
                                            className="mt-2"
                                        />
                                    </>
                                )}

                                {activePost?.type === "image" && (
                                    <>
                                        <TextField
                                            label="Caption"
                                            fullWidth
                                            multiline minRows={2}
                                            value={activePost?.text || ""}
                                            onChange={(e) => setActivePost({ ...activePost, text: e.target.value })}
                                            className="mt-2"
                                        />
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                            <label htmlFor="edit-image-file">
                                                <Button component="span" size="small" variant="outlined" startIcon={<AttachFileRoundedIcon />}>
                                                    Replace image
                                                </Button>
                                            </label>
                                            <input
                                                id="edit-image-file"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                                            />
                                            <Typography variant="body2" className="text-slate-600">
                                                {editImageFile ? editImageFile.name : "Keeping current image"}
                                            </Typography>
                                        </Stack>
                                    </>
                                )}


                                {activePost?.type === "poll" && (
                                    <>
                                        <TextField
                                            label="Question"
                                            fullWidth
                                            value={activePost?.question || ""}
                                            onChange={(e) => setActivePost({ ...activePost, question: e.target.value })}
                                            className="mt-2"
                                        />

                                        <Stack spacing={1} className="mt-2">
                                            {(activePost?.options || []).map((opt, idx) => (
                                                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                                                    <TextField
                                                        label={`Option ${idx + 1}`}
                                                        fullWidth
                                                        value={String(opt ?? "")}
                                                        onChange={(e) => {
                                                            const next = [...(activePost?.options || [])];
                                                            next[idx] = e.target.value;
                                                            setActivePost({ ...activePost, options: next });
                                                        }}
                                                    />
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            const next = [...(activePost?.options || [])];
                                                            next.splice(idx, 1);
                                                            setActivePost({ ...activePost, options: next });
                                                        }}
                                                        disabled={(activePost?.options?.length || 0) <= 2}  // ✅ keep at least 2
                                                    >
                                                        Remove
                                                    </Button>
                                                </Stack>
                                            ))}

                                            <Button
                                                size="small"
                                                startIcon={<AddRoundedIcon />}
                                                onClick={() => {
                                                    const cur = activePost?.options || [];
                                                    if (cur.length >= 10) return;             // ✅ cap at 10
                                                    setActivePost({ ...activePost, options: [...cur, ""] });
                                                }}
                                            >
                                                Add option
                                            </Button>
                                        </Stack>
                                    </>
                                )}
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setEditPostOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
                                <Button
                                    onClick={async () => {
                                        if (saving || !activePost) return;
                                        setSaving(true);
                                        const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

                                        try {
                                            const itemId = Number(activePost._feed_item_id ?? activePost.id);
                                            if (!Number.isInteger(itemId)) { alert("Invalid item id"); return; }

                                            if (activePost.type === "poll") {
                                                // REPLACE the payload build with this:
                                                const patchPayload = {
                                                    question: (activePost.question || "").trim(),
                                                    options: cleanPollOptions(activePost.options || []),   // ✅ use helper
                                                };
                                                if (patchPayload.options.length < 2) {
                                                    alert("Poll must have at least 2 options.");
                                                    return;
                                                }

                                                const pollId = Number(activePost.poll_id);
                                                let ok = false, lastErr = "";

                                                if (Number.isInteger(pollId)) {
                                                    try {
                                                        const r = await fetch(`${API_ROOT}/activity/feed/polls/${pollId}/`, {
                                                            method: "PATCH",
                                                            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                                            body: JSON.stringify(patchPayload),
                                                        });
                                                        ok = r.ok;
                                                        if (!ok) lastErr = `HTTP ${r.status}`;
                                                    } catch (e) { lastErr = e?.message || String(e); }
                                                }

                                                if (!ok) {
                                                    const itemId = Number(activePost._feed_item_id ?? activePost.id);
                                                    try {
                                                        const r2 = await fetch(`${API_ROOT}/activity/feed/${itemId}/poll/`, {
                                                            method: "PATCH",
                                                            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                                            body: JSON.stringify(patchPayload),
                                                        });
                                                        ok = r2.ok;
                                                        if (!ok) lastErr = `HTTP ${r2.status}`;
                                                    } catch (e) { lastErr = e?.message || String(e); }
                                                }

                                                if (!ok) { alert(`Failed to update poll: ${lastErr}`); return; }
                                            }
                                            else {
                                                // Non-poll posts → use NEW /edit endpoint
                                                let ok = false, lastErr = "";

                                                if (activePost.type === "image" && editImageFile) {
                                                    const fd = new FormData();
                                                    fd.append("text", activePost.text || "");
                                                    fd.append("image", editImageFile, editImageFile.name);

                                                    for (const url of [
                                                        `${API_ROOT}/groups/${idOrSlug}/posts/${itemId}/edit`,
                                                        `${API_ROOT}/groups/${idOrSlug}/posts/${itemId}/edit/`,
                                                    ]) {
                                                        try {
                                                            const r = await fetch(url, { method: "PATCH", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: fd });
                                                            if (r.ok) { ok = true; break; }
                                                            lastErr = `HTTP ${r.status}`;
                                                        } catch (e) { lastErr = e?.message || String(e); }
                                                    }
                                                } else {
                                                    const body =
                                                        activePost.type === "text"
                                                            ? { text: activePost.text }
                                                            : activePost.type === "link"
                                                                ? { text: activePost.text, url: activePost.url }
                                                                : activePost.type === "event"
                                                                    ? { title: activePost.title, text: activePost.text, starts_at: activePost.starts_at, ends_at: activePost.ends_at }
                                                                    : { text: activePost.text };

                                                    for (const { url, method, hdrs, payload } of [
                                                        // Prefer NEW /edit (JSON)
                                                        { url: `${API_ROOT}/groups/${idOrSlug}/posts/${itemId}/edit`, method: "PATCH", hdrs: { "Content-Type": "application/json" }, payload: JSON.stringify(body) },
                                                        { url: `${API_ROOT}/groups/${idOrSlug}/posts/${itemId}/edit/`, method: "PATCH", hdrs: { "Content-Type": "application/json" }, payload: JSON.stringify(body) },
                                                        // Fallback to legacy PATCH /posts/:id/
                                                        { url: `${API_ROOT}/groups/${idOrSlug}/posts/${itemId}/`, method: "PATCH", hdrs: { "Content-Type": "application/json" }, payload: JSON.stringify(body) },
                                                    ]) {
                                                        try {
                                                            const r = await fetch(url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(hdrs || {}) }, body: payload });
                                                            if (r.ok) { ok = true; break; }
                                                            lastErr = `HTTP ${r.status}`;
                                                        } catch (e) { lastErr = e?.message || String(e); }
                                                    }
                                                }

                                                if (!ok) { alert(`Failed to update post: ${lastErr}`); return; }
                                                setEditImageFile(null);
                                            }

                                            setEditPostOpen(false);
                                            await fetchPosts();
                                        } catch (e) {
                                            alert(String(e?.message || e));
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    variant="contained"
                                    disabled={saving}
                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                >
                                    {saving ? "Saving…" : "Save"}
                                </Button>

                            </DialogActions>
                        </Dialog>
                    </Container>
                    {/* ↑↑↑ END of pasted original content ↑↑↑ */}
                </main>
                {/* 👇 ADD THIS ANYWHERE INSIDE RETURN (typically here) */}
                <EditGroupDialog
                    open={editOpen}
                    group={group}
                    onClose={() => setEditOpen(false)}
                    onUpdated={onUpdated}
                />
                <GroupImageDialog
                    open={imageOnlyOpen}
                    group={group}
                    onClose={() => setImageOnlyOpen(false)}
                    onUpdated={onUpdated}
                    type="logo"
                />

                <Dialog open={leaveGroupOpen} onClose={() => setLeaveGroupOpen(false)}>
                    <DialogTitle>Leave Group?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to leave <b>{group?.name}</b>?<br /><br />
                            {myRole === "owner" && "Ownership will be transferred to the longest-serving Admin. If no other Admins exist, you cannot leave until you promote someone."}
                            {myRole === "admin" && "If you are the last Admin, you must promote another member before leaving."}
                            {myRole !== "owner" && myRole !== "admin" && "You can rejoin later if the group is public or by request."}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setLeaveGroupOpen(false)}>Cancel</Button>
                        <Button onClick={handleLeaveGroup} color="error" variant="contained">
                            Confirm Leave
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Modern Snackbar for messages */}
                <Snackbar
                    open={snack.open}
                    autoHideDuration={6000}
                    onClose={handleSnackClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={handleSnackClose}
                        severity={snack.severity}
                        sx={{ width: "100%", borderRadius: 2 }}
                        variant="filled"
                    >
                        {snack.message}
                    </Alert>
                </Snackbar>
            </div>
        </div>
    );

}
