// src/pages/GroupManagePage.jsx
import React from "react";
import {
    Alert, Avatar, AvatarGroup, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent,
    DialogTitle, Divider, Grid, LinearProgress, MenuItem, Paper, Stack, Tab, Tabs,
    TextField, Typography, Switch, FormControlLabel, CircularProgress,
    List, ListItem, ListItemAvatar, ListItemText, ButtonGroup,
    IconButton, Menu, ListItemIcon, Popper
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PollRoundedIcon from "@mui/icons-material/PollRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import AdminSidebar from "../components/AdminSidebar";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";




// ---- API helpers (reuse same pattern as GroupsAdmin.jsx) ----
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;
const API_ORIGIN = BASE.replace(/\/api$/, "") || BASE;

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
    localStorage.getItem("token") ||
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
function mapFeedPollToPost(row) {
    const m = row?.metadata || {};
    const t = (m.type || row.type || "").toLowerCase();
    if (t !== "poll") return null;

    const opts = Array.isArray(m.options)
        ? m.options.map(o => String(o?.text ?? o?.label ?? o))
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
        created_at: row.created_at || m.created_at || row.createdAt || new Date().toISOString(),
        created_by: row.created_by || row.user || row.actor || null,
        hidden: !!(row.is_hidden ?? m.is_hidden),
        is_hidden: !!(row.is_hidden ?? m.is_hidden),
        group_id: gid,
    };
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
    const [submitting, setSubmitting] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const isSubgroup = !!(group?.parent_id || group?.parent?.id || group?.parent);

    // hydrate from loaded group
    React.useEffect(() => {
        if (!group) return;
        setName(group.name || "");
        setDescription(group.description || "");
        setVisibility(group.visibility || "public");
        setJoinPolicy(group.join_policy === "open" ? "open" : "approval");
        setLocalPreview(group.cover_image ? toAbs(group.cover_image) : "");
        setImageFile(null);
        setRemoveImage(false);
        setErrors({});
    }, [group]);

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

            // only for main groups; sub-groups inherit from parent
            if (!isSubgroup) {
                fd.append("visibility", visibility);
                fd.append("join_policy", joinPolicy);
            }

            if (imageFile) fd.append("cover_image", imageFile, imageFile.name);
            if (removeImage) fd.append("remove_cover_image", "1");

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

                <Box className="flex items-start gap-3 mb-4">
                    <Avatar sx={{ bgcolor: "#10b8a6", width: 40, height: 40 }} />
                    <TextField
                        label="Group Name *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name}
                        className="mb-3"
                    />
                </Box>

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

                        {/* Visibility (only for top-level groups) */}
                        {!isSubgroup && (
                            <CustomSelect
                                label="Visibility"
                                value={visibility}
                                onChange={(val) => setVisibility(val)}
                                options={[
                                    { label: "Public (anyone can find & request to join)", value: "public" },
                                    { label: "Private (invite-only)", value: "private" }
                                ]}
                            />
                        )}

                        {/* Join Policy (only for top-level groups) */}
                        {!isSubgroup && (
                            <CustomSelect
                                label="Join Policy"
                                value={joinPolicy}
                                onChange={(val) => setJoinPolicy(val)}
                                disabled={visibility === "private"}
                                helperText={visibility === "private" ? "Private groups are invite-only." : ""}
                                options={
                                    visibility === "public"
                                        ? [
                                            { label: "Open (join instantly)", value: "open" },
                                            { label: "Approval required", value: "approval" }
                                        ]
                                        : [
                                            { label: "Invite only", value: "invite" }
                                        ]
                                }
                            />
                        )}
                    </Grid>

                    <Grid xs={12} md={5}>
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
                                onClick={() => {
                                    setRemoveImage(true);
                                    setImageFile(null);
                                    setLocalPreview("");
                                }}
                            >
                                Remove
                            </Button>
                        </Stack>
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


function AddMembersDialog({ open, onClose, groupIdOrSlug, existingIds, onAdded }) {
    const token = getToken();
    const [q, setQ] = React.useState("");
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [selected, setSelected] = React.useState(new Set());

    const toggle = (id) => {
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
            const filtered = (Array.isArray(json) ? json : []).filter(u => !exist.has(u.id));
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

function RequestAddMembersDialog({ open, onClose, groupIdOrSlug, existingIds, onRequested }) {
    const token = getToken();

    const [q, setQ] = React.useState("");
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [selected, setSelected] = React.useState(new Set());

    const toggle = (id) => {
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
            setRows(items.filter((u) => !exist.has(u.id))); // exclude already-in-group
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

        const ids = Array.from(selected).map(Number);
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

            // 👇 inherit from parent, do NOT expose in UI
            const parentVis = parentGroup?.visibility || "public";
            const parentJoin = parentGroup?.join_policy || (parentVis === "private" ? "approval" : "open");
            fd.append("visibility", parentVis);
            fd.append("join_policy", parentJoin);

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

                        {/* HIDDEN: sub-groups inherit from parent */}
                        {false && (
                            <TextField
                                label="Visibility"
                                select
                                fullWidth
                                className="mb-3"
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                            >
                                <MenuItem value="public">Public (anyone can find & request to join)</MenuItem>
                                <MenuItem value="private">Private (invite-only)</MenuItem>
                            </TextField>
                        )}

                        {false && (
                            <TextField
                                label="Join Policy"
                                select
                                fullWidth
                                className="mb-3"
                                value={joinPolicy}
                                onChange={(e) => setJoinPolicy(e.target.value)}
                                disabled={visibility === "private"}
                                helperText={visibility === "private" ? "Private groups require approval." : undefined}
                            >
                                <MenuItem value="open">Open (join instantly)</MenuItem>
                                <MenuItem value="approval">Approval required</MenuItem>
                            </TextField>
                        )}
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
        </Dialog>
    );
}


// ---------- Likes Popup ----------
function GroupLikesDialog({ open, onClose, groupIdOrSlug, postId }) {
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    const load = React.useCallback(async () => {
        if (!open || !postId) return;
        setLoading(true);

        const token = getToken();
        const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const fid = Number(postId);
        // Your working endpoints (tries in order)
        const candidates = [
            // primary: reactions filtered to like for a FeedItem
            `${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${fid}&reaction=like&page_size=200`,
            // optional helper shape
            `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${fid}`,
        ];

        let got = [];
        for (const url of candidates) {
            try {
                const r = await fetch(url, { headers });
                if (!r.ok) continue;
                const j = await r.json().catch(() => []);
                const arr = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : j?.data || []);
                if (arr && arr.length >= 0) {
                    got = arr.map((it) => {
                        // normalize user shape
                        const u = it.user || it.actor || it.liker || it;
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
            <DialogTitle>Liked by</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
                ) : rows.length === 0 ? (
                    <Typography color="text.secondary">No likes yet.</Typography>
                ) : (
                    <List>
                        {rows.map((u, i) => {
                            const user = u.user || u; // tolerate shapes
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
        const token = getToken();
        const ok = window.confirm("Delete this comment?");
        if (!ok) return;

        try {
            const r = await fetch(`${API_ROOT}/engagements/comments/${c.id}/`, {
                method: "DELETE",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (r.ok) await load();
        } catch { /* ignore */ }
    }


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

                >
                    {c.like_count ?? 0}
                </Button>
                <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />} onClick={() => setReplyTo(c)}>
                    Reply
                </Button>
                {((me?.id || me?.user?.id) === c.author_id || (me?.id || me?.user?.id) === groupOwnerId) && (
                    <Button size="small" color="error" onClick={() => deleteComment(c)}>Delete</Button>
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
            </Box>
        );
    }

    // -------- ORIGINAL MODAL (kept intact) --------
    return (
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
    );
}


// ---------- Social row under each post ----------
// ---------- Social row under each post ----------
function GroupPostSocialBar({ groupIdOrSlug, groupOwnerId, post }) {
    const [likesOpen, setLikesOpen] = React.useState(false);
    const [commentsOpen, setCommentsOpen] = React.useState(false);
    const [sharesOpen, setSharesOpen] = React.useState(false);

    const fid = React.useMemo(() => Number(post.feed_item_id ?? post.id), [post.feed_item_id, post.id]);

    const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
    const [counts, setCounts] = React.useState({
        likes: post.like_count ?? post.metrics?.likes ?? 0,
        comments: post.comment_count ?? post.metrics?.comments ?? 0,
    });
    const [shareCount, setShareCount] = React.useState(post.share_count ?? post.metrics?.shares ?? 0);

    // preview of first few likers (for "admin and N others")
    const [likerPreview, setLikerPreview] = React.useState([]);

    React.useEffect(() => {
        if (!fid) return;

        (async () => {
            try {
                const token = getToken?.();
                const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

                // metrics (for counts + liked-by-me)
                const url = `${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${fid}`;
                const res = await fetch(url, { headers });
                if (res.ok) {
                    const j = await res.json().catch(() => ({}));
                    const rows =
                        Array.isArray(j?.results) ? j.results :
                            Array.isArray(j?.data) ? j.data :
                                Array.isArray(j?.items) ? j.items :
                                    Array.isArray(j) ? j :
                                        (j && typeof j === "object" && j[fid]) ? [j[fid]] : [];

                    const row = rows?.[0] || {};
                    const m = row.metrics || row;

                    const likes = (m.likes ?? m.like_count ?? 0);
                    const comments = (m.comments ?? m.comment_count ?? 0);
                    const shares = (m.shares ?? m.share_count ?? 0);
                    const meLiked = (row.user_has_liked ?? m.user_has_liked);

                    setCounts({ likes, comments });
                    setShareCount(shares);
                    if (typeof meLiked === "boolean") setUserHasLiked(meLiked);
                }
            } catch { }
        })();
    }, [fid]);

    // fetch 2 likers for the left-side "avatars + text"
    React.useEffect(() => {
        if (!fid) return;

        (async () => {
            try {
                const token = getToken?.();
                const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
                const candidates = [
                    `${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${fid}&reaction=like&page_size=2`,
                    `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${fid}&limit=2`,
                ];

                let got = [];
                for (const u of candidates) {
                    const r = await fetch(u, { headers });
                    if (!r.ok) continue;
                    const j = await r.json().catch(() => []);
                    const arr = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : j?.data || []);
                    if (arr) {
                        got = arr.map((it) => {
                            const u = it.user || it.actor || it.liker || it;
                            return {
                                id: u.id ?? it.id,
                                name: u.name || u.full_name || u.username || `User #${u.id ?? it.id ?? ""}`,
                                avatar: toAbs(u.avatar || u.photo || u.photo_url || u.image || null),
                            };
                        });
                        break;
                    }
                }
                setLikerPreview(got.slice(0, 2));
            } catch {
                setLikerPreview([]);
            }
        })();
    }, [fid, counts.likes]);
    async function fetchCounts() {
        try {
            const headers = { Accept: "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) };
            const url = `${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${fid}`;
            const res = await fetch(url, { headers });
            if (!res.ok) return;

            const j = await res.json().catch(() => ({}));
            const rows =
                Array.isArray(j?.results) ? j.results :
                    Array.isArray(j?.data) ? j.data :
                        Array.isArray(j?.items) ? j.items :
                            Array.isArray(j) ? j :
                                (j && typeof j === "object" && j[fid]) ? [j[fid]] : [];

            const row = rows?.[0] || {};
            const m = row.metrics || row;

            const likes = m.likes ?? m.like_count ?? 0;
            const comments = m.comments ?? m.comment_count ?? 0;
            const shares = m.shares ?? m.share_count ?? 0;
            const meLiked = (row.user_has_liked ?? m.user_has_liked);

            setCounts({ likes, comments });
            setShareCount(shares);
            if (typeof meLiked === "boolean") setUserHasLiked(meLiked);
        } catch { /* ignore */ }
    }


    async function toggleLike() {
        const willUnlike = userHasLiked;

        // optimistic
        setUserHasLiked(!willUnlike);
        setCounts(c => ({ ...c, likes: Math.max(0, (c.likes || 0) + (willUnlike ? -1 : +1)) }));

        try {
            const res = await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
                body: JSON.stringify({ target_type: "activity_feed.feeditem", target_id: fid, reaction: "like" }),
            });
            if (!res.ok) throw new Error();
            // re-sync exact counts (like Admin)
            await fetchCounts();
        } catch {
            await fetchCounts();
        }
    }

    const bumpCommentCount = () => setCounts((c) => ({ ...c, comments: c.comments + 1 }));

    // text like "admin and 1 others" (kept intentionally as "others")
    const likeNames = likerPreview.map(l => l.name).filter(Boolean);
    let likeLine = "";
    if (counts.likes > 0) {
        if (likeNames.length === 1) {
            const others = Math.max(0, counts.likes - 1);
            likeLine = others > 0 ? `${likeNames[0]} and ${others} others` : likeNames[0];
        } else if (likeNames.length >= 2) {
            const others = Math.max(0, counts.likes - 2);
            likeLine = others > 0 ? `${likeNames[0]} and ${others} others` : `${likeNames[0]} and ${likeNames[1]}`;
        }
    }

    return (
        <>
            {/* TOP META ROW — likers preview on left, SHARES on right (clickable) */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, pb: 1 }}>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    onClick={() => setLikesOpen(true)}
                    sx={{ cursor: "pointer" }}
                >
                    <AvatarGroup
                        max={2}
                        sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 12 } }}
                    >
                        {likerPreview.slice(0, 2).map(u => (
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

            {/* BOTTOM ROW — actions (LIKE / COMMENT / SHARE) */}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, pb: 1 }}>
                <Button
                    size="small"
                    startIcon={userHasLiked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                    onClick={toggleLike}
                    sx={{ textTransform: "uppercase" }}
                >
                    Like
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

            {/* Popups */}
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



// ---- Main page ----
export default function GroupManagePage() {
    const { idOrSlug } = useParams();
    const navigate = useNavigate();
    const token = getToken();

    const [tab, setTab] = React.useState(0);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [group, setGroup] = React.useState(null);
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

    const [editOpen, setEditOpen] = React.useState(false);
    const [members, setMembers] = React.useState([]);
    const [memLoading, setMemLoading] = React.useState(true);
    const [memError, setMemError] = React.useState("");
    const [addOpen, setAddOpen] = React.useState(false);
    const [requestAddOpen, setRequestAddOpen] = React.useState(false);
    const [memMenuAnchor, setMemMenuAnchor] = React.useState(null);
    const [activeMember, setActiveMember] = React.useState(null);
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

    // Posts tab state
    const [posts, setPosts] = React.useState([]);
    const [postsLoading, setPostsLoading] = React.useState(true);
    const [postsError, setPostsError] = React.useState("");

    // Compose state
    const [postType, setPostType] = React.useState("text"); // text | image | link | poll | event
    const [postText, setPostText] = React.useState("");
    const [postImageFile, setPostImageFile] = React.useState(null);
    const [postLinkUrl, setPostLinkUrl] = React.useState("");
    const [pollQuestion, setPollQuestion] = React.useState("");
    const [pollOptions, setPollOptions] = React.useState(["", ""]); // at least two
    const [eventTitle, setEventTitle] = React.useState("");
    const [eventStart, setEventStart] = React.useState("");
    const [eventEnd, setEventEnd] = React.useState("");
    const [creating, setCreating] = React.useState(false);

    // ==== Post actions UI state (add-only) ====
    const [postMenuAnchor, setPostMenuAnchor] = React.useState(null);
    const [activePost, setActivePost] = React.useState(null);
    const [editPostOpen, setEditPostOpen] = React.useState(false);
    const [editImageFile, setEditImageFile] = React.useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    // Member removal confirm (new)
    const [removeMemberOpen, setRemoveMemberOpen] = React.useState(false);
    const [removeMemberTarget, setRemoveMemberTarget] = React.useState(null);

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
    const canReviewRequests = isOwnerRole || isAdminRole;

    // ✅ Strong member management (only owner + admin can directly add/remove/change roles)
    const canHardManageMembers = isOwnerRole || isAdminRole;

    // ✅ Moderators can only "request" member changes (front-end only for now)
    const canRequestMemberChanges = isModeratorRole;

    // ✅ Posts: owner + admin + moderator can create/manage/delete posts
    const canModerate = isOwnerRole || isAdminRole || isModeratorRole;
    const canPost = canModerate;

    // ✅ Sub-group creation is restricted to Owner + Admin only
    const canCreateSubgroups = isOwnerRole;

    const canSeeSettingsTab = isOwnerRole || isAdminRole || isModeratorRole;
    const canSeeNotificationsTab = canModerate && showNotificationsTab;

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
        setActivePost({ ...post, _feed_item_id: fid, hidden: isHidden, is_hidden: isHidden });
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

            let postsArr = Array.isArray(postsJson) ? postsJson : [];
            // drop polls if backend mixes them here; we'll pull them from Activity Feed
            postsArr = postsArr.filter(p => (p?.type || "").toLowerCase() !== "poll");

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
        try {
            setCreating(true);

            // Decide payload by type
            if (postType === "image") {
                const fd = new FormData();
                fd.append("type", "image");
                if (postText) fd.append("text", postText.trim());
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
                const payload = { type: "link", url: postLinkUrl.trim(), text: postText.trim() };
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
            } else if (postType === "event") {
                const payload = {
                    type: "event",
                    title: eventTitle.trim(),
                    starts_at: eventStart ? new Date(eventStart).toISOString() : null,
                    ends_at: eventEnd ? new Date(eventEnd).toISOString() : null,
                    text: postText.trim() || undefined,
                };
                const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/`, {
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
                const payload = { type: "text", text: postText.trim() };
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
            setEventTitle(""); setEventStart(""); setEventEnd("");

            await fetchPosts(); // refresh
        } catch (e) {
            alert(`Failed to post: ${e?.message || e}`);
        } finally {
            setCreating(false);
        }
    };


    // Owner id (used to lock Owner row)
    const ownerId = group?.created_by?.id ?? null;

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

        alert(msg);
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
                        <Box sx={{ px: 3, py: 2 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar
                                        sx={{ width: 64, height: 64, bgcolor: "#10b8a6", border: "3px solid white" }}
                                        src={group?.cover_image ? bust(group.cover_image, group.updated_at || group._cache) : undefined}
                                        alt={group?.name || "Group"}
                                    >
                                        {(group?.name || "G").slice(0, 1).toUpperCase()}
                                    </Avatar>

                                    <Box>
                                        <Typography variant="h5" className="font-extrabold">{group?.name || "Group"}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                size="small"
                                                label={group?.visibility === "private" ? "Private" : "Public"}
                                                className={group?.visibility === "private" ? "bg-slate-200 text-slate-700" : "bg-teal-50 text-teal-700"}
                                            />
                                            {typeof group?.member_count === "number" && (
                                                <Typography variant="body2">{group.member_count} members</Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={1}>
                                    {!isStaffUser && (
                                        <Button
                                            startIcon={<EditNoteRoundedIcon />}
                                            onClick={() => setEditOpen(true)}
                                            variant="contained"
                                            className="rounded-xl"
                                            sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => navigate(-1)}
                                        variant="outlined"
                                        className="rounded-xl"
                                        sx={{ textTransform: "none", color: "#0ea5a4", borderColor: "#0ea5a4" }}
                                    >
                                        Back
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>


                        {/* Tabs */}
                        <Paper elevation={0} className="rounded-none">
                            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
                                <Tab label="Overview" />
                                <Tab label="Members" />
                                {showSubgroupsTab ? (
                                    <Tab label="Sub-groups" />
                                ) : (
                                    // keep index #2 but hide it so other tabs keep their indices
                                    <Tab sx={{ display: "none" }} disabled />
                                )}
                                {canSeeSettingsTab ? (
                                    <Tab label="Settings" />
                                ) : (
                                    // keep index #3 but hide it, so Posts/Notifications keep their indices
                                    <Tab sx={{ display: "none" }} disabled />
                                )}
                                <Tab label="Posts" />
                                {canSeeNotificationsTab && <Tab label="Notifications" />}
                            </Tabs>
                        </Paper>

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
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" className="mb-2">
                                            <Typography variant="h6" className="font-semibold">Members</Typography>

                                            {group?.visibility === "private" && (
                                                <>
                                                    {canHardManageMembers && (
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

                                                    {!canHardManageMembers && canRequestMemberChanges && (
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
                                                </>
                                            )}
                                        </Stack>

                                        {memLoading ? (
                                            <><LinearProgress /><Typography className="mt-2 text-slate-500">Loading members…</Typography></>
                                        ) : memError ? (
                                            <Alert severity="error">{memError}</Alert>
                                        ) : members.length === 0 ? (
                                            <Typography className="text-slate-500">No members yet.</Typography>
                                        ) : (
                                            <>
                                                <Stack divider={<Divider />} spacing={1}>
                                                    {members
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
                                                                        <Typography className="font-medium">{m.user.name || m.user.email || m.user.id}</Typography>
                                                                        {m.user.email && (
                                                                            <Typography variant="caption" className="text-slate-500">{m.user.email}</Typography>
                                                                        )}
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
                                        ) : subgroups.length === 0 ? (
                                            <Typography className="text-slate-500">No sub-groups yet.</Typography>
                                        ) : (
                                            <Stack spacing={1.5}>
                                                {subgroups.map((sg) => (
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
                                                                        {(sg.visibility === "private" ? "Private" : "Public")} • {(sg.member_count ?? sg.members_count ?? 0)} members
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
                                        <Typography className="text-slate-500 mb-3">
                                            Update visibility, manage tags/subgroups, or delete the group (wire endpoints as needed).
                                        </Typography>
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
                                            {!isStaffUser && (
                                                <Button
                                                    variant="contained"
                                                    className="rounded-xl"
                                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                    onClick={() => setEditOpen(true)}
                                                >
                                                    Edit Details
                                                </Button>
                                            )}
                                            {!isStaffUser && (
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
                                                                <MenuItem value="event">Event</MenuItem>
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

                                                        {postType === "event" && (
                                                            <>
                                                                <TextField
                                                                    label="Event title"
                                                                    fullWidth
                                                                    value={eventTitle}
                                                                    onChange={(e) => setEventTitle(e.target.value)}
                                                                />
                                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                                                    <TextField
                                                                        label="Starts at"
                                                                        type="datetime-local"
                                                                        value={eventStart}
                                                                        onChange={(e) => setEventStart(e.target.value)}
                                                                        InputLabelProps={{ shrink: true }}
                                                                        fullWidth
                                                                    />
                                                                    <TextField
                                                                        label="Ends at"
                                                                        type="datetime-local"
                                                                        value={eventEnd}
                                                                        onChange={(e) => setEventEnd(e.target.value)}
                                                                        InputLabelProps={{ shrink: true }}
                                                                        fullWidth
                                                                    />
                                                                </Stack>
                                                                <TextField
                                                                    label="Description (optional)"
                                                                    multiline minRows={2} fullWidth
                                                                    value={postText}
                                                                    onChange={(e) => setPostText(e.target.value)}
                                                                />
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
                                                <Typography className="text-slate-500">No posts yet.</Typography>
                                            ) : (
                                                <Stack spacing={2}>
                                                    {posts.map((p) => (
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

                                                            {p.type === "image" ? (
                                                                <>
                                                                    {p.text && <Typography className="mb-2">{p.text}</Typography>}
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
                                                                    {p.text && <Typography className="mb-1">{p.text}</Typography>}
                                                                    {p.url && (
                                                                        <a href={toAbs(p.url)} target="_blank" rel="noreferrer" style={{ color: "#0ea5a4" }}>
                                                                            <LinkRoundedIcon fontSize="small" /> {p.url}
                                                                        </a>
                                                                    )}
                                                                </>
                                                            ) : p.type === "poll" ? (
                                                                <>
                                                                    <Typography className="mb-1 font-medium">{p.question}</Typography>
                                                                    <Stack spacing={0.5}>
                                                                        {(p.options || []).map((o, i) => (
                                                                            <Chip key={i} size="small" label={toStr(o)} className="bg-slate-100 text-slate-700 w-fit" />
                                                                        ))}
                                                                    </Stack>
                                                                </>
                                                            ) : p.type === "event" ? (
                                                                <>
                                                                    <Stack direction="row" spacing={1} alignItems="center" className="mb-1">
                                                                        <EventNoteRoundedIcon fontSize="small" />
                                                                        <Typography className="font-medium">{p.title}</Typography>
                                                                    </Stack>
                                                                    <Typography variant="caption" className="text-slate-600">
                                                                        {p.starts_at ? new Date(p.starts_at).toLocaleString() : ""} — {p.ends_at ? new Date(p.ends_at).toLocaleString() : ""}
                                                                    </Typography>
                                                                    {p.text && <Typography className="mt-1">{p.text}</Typography>}
                                                                </>
                                                            ) : (
                                                                <Typography>{p.text}</Typography>
                                                            )}
                                                            <GroupPostSocialBar
                                                                groupIdOrSlug={idOrSlug}
                                                                groupOwnerId={group?.created_by?.id}
                                                                post={p}
                                                            />
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Paper>
                                )}

                                {canSeeNotificationsTab && tab === NOTIF_TAB_INDEX && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Stack spacing={2}>
                                            <Typography variant="h6" className="font-semibold">Notifications</Typography>

                                            {canReviewRequests ? (
                                                <>
                                                    {/* JOIN REQUESTS (existing UI) */}
                                                    {!!reqsError && <Alert severity="error">{reqsError}</Alert>}

                                                    {reqsLoading ? (
                                                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                                                            <CircularProgress />
                                                        </Box>
                                                    ) : reqs.length === 0 ? (
                                                        <Alert severity="info">
                                                            No join requests for this group.
                                                        </Alert>
                                                    ) : (
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
                                                    )}

                                                    {/* PROMOTION REQUESTS */}
                                                    <Divider sx={{ my: 2 }} />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                        Promotion requests
                                                    </Typography>

                                                    {!!promotionError && (
                                                        <Alert severity="error">{promotionError}</Alert>
                                                    )}

                                                    {promotionLoading ? (
                                                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                                            <CircularProgress />
                                                        </Box>
                                                    ) : promotionReqs.length === 0 ? (
                                                        <Alert severity="info">
                                                            No pending promotion requests.
                                                        </Alert>
                                                    ) : (
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
                                                    )}

                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={fetchRequests}
                                                            disabled={reqsLoading}
                                                        >
                                                            Refresh join requests
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={fetchPromotionRequests}
                                                            disabled={promotionLoading}
                                                        >
                                                            Refresh promotion requests
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

                        {/* Edit dialog */}
                        <EditGroupDialog
                            open={editOpen}
                            group={group}
                            onClose={() => setEditOpen(false)}
                            onUpdated={(g) => { setEditOpen(false); setGroup(g); }}
                        />
                        <AddMembersDialog
                            open={addOpen}
                            onClose={() => setAddOpen(false)}
                            groupIdOrSlug={idOrSlug}
                            existingIds={members.map(m => m.user.id)}
                            onAdded={async (n) => {
                                await fetchMembers();                         // refresh list
                                setGroup((prev) => prev ? {
                                    ...prev,         // bump visible count
                                    member_count: (prev.member_count || 0) + n
                                } : prev);
                            }}
                        />
                        <RequestAddMembersDialog
                            open={requestAddOpen}
                            onClose={() => setRequestAddOpen(false)}
                            groupIdOrSlug={idOrSlug}
                            existingIds={[
                                ...new Set([
                                    ...members.map(m => m.user.id),                 // active members
                                    ...reqs.map(r => r.user?.id).filter(Boolean),   // pending (status = "pending")
                                ]),
                            ]}
                            onRequested={(n) => {
                                setRequestAddOpen(false);
                                alert(`Request sent to admins to add ${n} member(s).`);
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
                                            navigate("/groups"); // adjust route if your list lives elsewhere
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
                                        if (!activePost) return;
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
                                        }
                                    }}
                                    variant="contained"
                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                >
                                    Save
                                </Button>

                            </DialogActions>
                        </Dialog>
                    </Container>
                    {/* ↑↑↑ END of pasted original content ↑↑↑ */}
                </main>
            </div>
        </div>
    );

}