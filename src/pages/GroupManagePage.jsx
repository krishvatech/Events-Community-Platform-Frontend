// src/pages/GroupManagePage.jsx
import React from "react";
import {
    Alert, Avatar, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent,
    DialogTitle, Divider, Grid, LinearProgress, MenuItem, Paper, Stack, Tab, Tabs,
    TextField, Typography, Switch, FormControlLabel, CircularProgress,
    List, ListItem, ListItemAvatar, ListItemText, ButtonGroup,
    IconButton, Menu, ListItemIcon
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

function mapFeedPollToPost(row) {
    const m = row?.metadata || {};
    const t = (m.type || row.type || "").toLowerCase();
    if (t !== "poll") return null;

    // make every option a plain string (prevents Chip label errors)
    const opts = Array.isArray(m.options)
        ? m.options.map(o => String(o?.text ?? o?.label ?? o))
        : [];

    return {
        id: Number(row.id),
        feed_item_id: Number(row.id),
        type: "poll",

        // ✅ the missing piece
        question: m.question ?? m.title ?? row.title ?? row.text ?? "",

        options: opts,

        created_at: row.created_at || m.created_at || row.createdAt || new Date().toISOString(),
        created_by: row.created_by || row.user || row.actor || null,
        hidden: !!(row.is_hidden ?? m.is_hidden),
        is_hidden: !!(row.is_hidden ?? m.is_hidden),
    };
}

// ---- Edit Dialog (inline, smaller version) ----
function EditGroupDialog({ open, group, onClose, onUpdated }) {
    const token = getToken();
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [visibility, setVisibility] = React.useState("public");
    const [imageFile, setImageFile] = React.useState(null);
    const [localPreview, setLocalPreview] = React.useState("");
    const [removeImage, setRemoveImage] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    React.useEffect(() => {
        if (!group) return;
        setName(group.name || "");
        setDescription(group.description || "");
        setVisibility(group.visibility || "public");
        setLocalPreview(group.cover_image ? toAbs(group.cover_image) : "");
        setImageFile(null);
        setRemoveImage(false);
        setErrors({});
    }, [group]);

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
            fd.append("visibility", visibility);
            if (imageFile) fd.append("cover_image", imageFile, imageFile.name);
            if (removeImage) fd.append("remove_cover_image", "1"); // backend clears it

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
            onUpdated?.({ ...json, _cache: Date.now() }); // cache-bust for images
            onClose?.();
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
                {errors.__all__ && <Alert severity="error" className="mb-3">{errors.__all__}</Alert>}

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
                            multiline minRows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth className="mb-3"
                            error={!!errors.description} helperText={errors.description}
                        />
                        <TextField
                            label="Visibility"
                            select fullWidth className="mb-3"
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                        >
                            <MenuItem value="public">Public (anyone can find & request to join)</MenuItem>
                            <MenuItem value="private">Private (invite-only)</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid xs={12} md={5}>
                        <Typography variant="subtitle1" className="font-semibold">Group Photo</Typography>
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
                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                                />
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
                                    Upload
                                </Button>
                            </label>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => { setRemoveImage(true); setImageFile(null); setLocalPreview(""); }}
                            >
                                Remove
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
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

// ---- Add Sub-group Dialog (same UI as Create Group) ----
function AddSubgroupDialog({ open, onClose, parentGroup, onCreated }) {
    const token = getToken();

    const [name, setName] = React.useState("");
    const [slug, setSlug] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [visibility, setVisibility] = React.useState("public");  // public | private
    const [joinPolicy, setJoinPolicy] = React.useState("open");    // open | approval | invite
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
            fd.append("visibility", visibility);
            fd.append("join_policy", joinPolicy);
            fd.append("parent_id", String(parentGroup.id));
            // send community_id if you have it (works with your backend shape)
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

                        <TextField
                            label="Visibility"
                            select fullWidth className="mb-3"
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                        >
                            <MenuItem value="public">Public (anyone can find & request to join)</MenuItem>
                            <MenuItem value="private">Private (invite-only)</MenuItem>
                        </TextField>

                        <TextField
                            label="Join Policy"
                            select fullWidth className="mb-3"
                            value={joinPolicy}
                            onChange={(e) => setJoinPolicy(e.target.value)}
                        >
                            <MenuItem value="open">Open (join instantly)</MenuItem>
                            <MenuItem value="approval">Approval required</MenuItem>
                            <MenuItem value="invite">Invite-only</MenuItem>
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
        </Dialog>
    );
}


// ---------- Likes Popup ----------
function GroupLikesDialog({ open, onClose, groupIdOrSlug, postId }) {
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    const load = React.useCallback(async () => {
        if (!open || !groupIdOrSlug || !postId) return;
        setLoading(true);
        const token = getToken();
        const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        // Try a few common patterns; first success wins
        const candidates = [
            `${API_ROOT}/groups/${groupIdOrSlug}/posts/${postId}/likes/`,
            `${API_ROOT}/activity/feed/${postId}/likes/`,
        ];
        for (const url of candidates) {
            try {
                const r = await fetch(url, { headers });
                if (!r.ok) continue;
                const j = await r.json().catch(() => []);
                const arr = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : j?.data || []);
                setRows(arr || []);
                setLoading(false);
                return;
            } catch { }
        }
        setRows([]);
        setLoading(false);
    }, [open, groupIdOrSlug, postId]);

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

// ---------- Comments Popup (threaded, like, reply, delete by author or group owner) ----------
function GroupCommentsDialog({ open, onClose, groupIdOrSlug, postId, groupOwnerId, onBumpCount }) {
    const [loading, setLoading] = React.useState(false);
    const [me, setMe] = React.useState(null);
    const [items, setItems] = React.useState([]);
    const [text, setText] = React.useState("");
    const [replyTo, setReplyTo] = React.useState(null);

    React.useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const r = await fetch(`${API_ROOT}/users/me/`, { headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) } });
                setMe(r.ok ? await r.json() : {});
            } catch { setMe({}); }
        })();
    }, [open]);

    const load = React.useCallback(async () => {
        if (!open || !groupIdOrSlug || !postId) return;
        setLoading(true);
        const token = getToken();
        const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const url = `${API_ROOT}/groups/${groupIdOrSlug}/posts/${postId}/comments/?page_size=200`;
        try {
            const r = await fetch(url, { headers });
            const j = r.ok ? await r.json() : [];
            const flat = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
            setItems(flat || []);
        } catch { setItems([]); }
        setLoading(false);
    }, [open, groupIdOrSlug, postId]);

    React.useEffect(() => { load(); }, [load]);

    const roots = React.useMemo(() => {
        const map = new Map();
        (items || []).forEach(c => map.set(c.id, { ...c, children: [] }));
        map.forEach(c => { if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).children.push(c); });
        return [...map.values()].filter(c => !c.parent_id);
    }, [items]);

    async function createComment(body, parentId = null) {
        if (!body.trim()) return;
        const token = getToken();
        try {
            const r = await fetch(`${API_ROOT}/groups/${groupIdOrSlug}/posts/${postId}/comments/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(parentId ? { text: body, parent_id: parentId } : { text: body }),
            });
            if (r.ok) { setText(""); setReplyTo(null); await load(); onBumpCount?.(); }
        } catch { }
    }

    async function toggleCommentLike(c) {
        const token = getToken();
        const liked = !!c.user_has_liked;
        try {
            const r = await fetch(`${API_ROOT}/groups/${groupIdOrSlug}/posts/${postId}/comments/${c.id}/like/`, {
                method: liked ? "DELETE" : "POST",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (r.ok) load();
        } catch { }
    }

    async function deleteComment(c) {
        // Only author OR group owner
        const myId = me?.id || me?.user?.id;
        if (!(myId && (myId === c.author_id || myId === groupOwnerId || groupOwnerId === c.author_id))) return;
        const token = getToken();
        try {
            const r = await fetch(`${API_ROOT}/groups/${groupIdOrSlug}/posts/${postId}/comments/${c.id}/`, {
                method: "DELETE",
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (r.ok) load();
        } catch { }
    }

    const CommentItem = ({ c, depth = 0 }) => (
        <Box sx={{ pl: depth ? 2 : 0, borderLeft: depth ? "2px solid #e2e8f0" : "none", ml: depth ? 1.5 : 0, mt: depth ? 1 : 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Avatar src={c.author?.avatar} sx={{ width: 28, height: 28 }} />
                <Typography variant="subtitle2">{c.author?.name || c.author?.username || `User #${c.author_id}`}</Typography>
                <Typography variant="caption" color="text.secondary">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</Typography>
            </Stack>
            <Typography sx={{ mt: .5, whiteSpace: "pre-wrap" }}>{c.text}</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: .5 }}>
                <Button size="small"
                    startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
                    onClick={() => toggleCommentLike(c)}
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
                    {c.children.map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
                </Stack>
            )}
        </Box>
    );

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
                    <TextField size="small" fullWidth placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
                        value={text} onChange={(e) => setText(e.target.value)} />
                    <Button variant="contained" onClick={() => createComment(text, replyTo?.id || null)}>Post</Button>
                </Stack>
            </Box>
        </Dialog>
    );
}

// ---------- Social row under each post ----------
function GroupPostSocialBar({ groupIdOrSlug, groupOwnerId, post }) {
    const [likesOpen, setLikesOpen] = React.useState(false);
    const [commentsOpen, setCommentsOpen] = React.useState(false);
    const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
    const [counts, setCounts] = React.useState({
        likes: post.like_count ?? post.metrics?.likes ?? 0,
        comments: post.comment_count ?? post.metrics?.comments ?? 0,
    });

    async function toggleLike() {
        // Optional: toggle your like (also opens popup per your ask)
        try {
            const r = await fetch(`${API_ROOT}/groups/${groupIdOrSlug}/posts/${post.id}/like/`, {
                method: userHasLiked ? "DELETE" : "POST",
                headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
            });
            if (r.ok) {
                setUserHasLiked(!userHasLiked);
                setCounts((c) => ({ ...c, likes: Math.max(0, c.likes + (userHasLiked ? -1 : 1)) }));
            }
        } catch { }
        setLikesOpen(true); // open popup as requested “on like → show liked users”
    }

    const bumpCommentCount = () => setCounts((c) => ({ ...c, comments: c.comments + 1 }));

    return (
        <>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                <Button size="small" startIcon={userHasLiked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />} onClick={toggleLike}>
                    {counts.likes}
                </Button>
                <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon />} onClick={() => setCommentsOpen(true)}>
                    {counts.comments}
                </Button>
            </Stack>

            <GroupLikesDialog
                open={likesOpen}
                onClose={() => setLikesOpen(false)}
                groupIdOrSlug={groupIdOrSlug}
                postId={post.id}
            />
            <GroupCommentsDialog
                open={commentsOpen}
                onClose={() => setCommentsOpen(false)}
                groupIdOrSlug={groupIdOrSlug}
                postId={post.id}
                groupOwnerId={groupOwnerId}
                onBumpCount={bumpCommentCount}
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
    // Is this group a child (has a parent)?
    const isChildGroup = Boolean(group?.parent_id || group?.parent?.id || group?.parent);
    // Show Sub-groups tab only on top-level groups
    const showSubgroupsTab = !isChildGroup;
    // Show Notifications tab only when Public + Approval
    const showNotificationsTab = (group?.visibility === "public") && (group?.join_policy === "approval");
    // Keep indexes stable: Overview=0, Members=1, Sub-groups=2, Settings=3, Posts=4, Notifications=5
    const NOTIF_TAB_INDEX = 5;
    // Default to "Overview" whenever /groups/:idOrSlug changes (main or sub)
    React.useEffect(() => {
        setTab(0);
    }, [idOrSlug]);
    // If this is a child group, never allow tab index 2 (Sub-groups)
    React.useEffect(() => {
        if (!showSubgroupsTab && tab === 2) setTab(0);
    }, [showSubgroupsTab, tab]);
    const [editOpen, setEditOpen] = React.useState(false);
    const [members, setMembers] = React.useState([]);
    const [memLoading, setMemLoading] = React.useState(true);
    const [memError, setMemError] = React.useState("");
    const [addOpen, setAddOpen] = React.useState(false);
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

    // keep the confirm text for delete group
    const [deleteGroupOpen, setDeleteGroupOpen] = React.useState(false);
    const [deletingGroup, setDeletingGroup] = React.useState(false);
    const [confirmName, setConfirmName] = React.useState("");
    React.useEffect(() => { if (!deleteGroupOpen) setConfirmName(""); }, [deleteGroupOpen]);

    // When group loads/changes, infer initial chat state from backend shape
    React.useEffect(() => {
        if (!group) return;
        // supports either boolean chat_enabled OR message_mode = 'all'|'admins_only'
        const initial =
            typeof group.chat_enabled === "boolean"
                ? group.chat_enabled
                : (group.message_mode ? group.message_mode !== "admins_only" : true);
        setChatOn(initial);
    }, [group]);

    const saveChatToggle = async (next) => {
        if (!group) return;
        setChatSaving(true);
        try {
            const payload =
                typeof group.chat_enabled === "boolean"
                    ? { chat_enabled: next }
                    : { message_mode: next ? "all" : "admins_only" };

            const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.detail || `HTTP ${res.status}`);
            }
            const updated = await res.json();
            setGroup(updated);
            setChatOn(
                typeof updated.chat_enabled === "boolean"
                    ? updated.chat_enabled
                    : (updated.message_mode ? updated.message_mode !== "admins_only" : next)
            );
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

    // ---- Notifications tab data ----
    const [reqs, setReqs] = React.useState([]);
    const [reqsLoading, setReqsLoading] = React.useState(false);
    const [reqsError, setReqsError] = React.useState("");

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

    const takeAction = async (id, action) => {
        try {
            const url = action === "approve"
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

            // 1) Remove the request from the notifications list immediately
            setReqs(prev => prev.filter(x => (x.id ?? x.pk) !== id));

            // 2) If approved, refresh members and bump the visible count
            if (action === "approve") {
                await fetchMembers();
                setGroup(prev => prev ? {
                    ...prev,
                    member_count: (prev.member_count || 0) + 1
                } : prev);
                // Optional: jump to Members tab so they see the newly added person
                // setTab(1);
            }
        } catch (e) {
            alert(e?.message || `Failed to ${action}`);
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
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    // Member removal confirm (new)
    const [removeMemberOpen, setRemoveMemberOpen] = React.useState(false);
    const [removeMemberTarget, setRemoveMemberTarget] = React.useState(null);


    // Moderation gate (same roles as canPost; separate for clarity)
    const canModerate = ["owner", "admin", "moderator"].includes(group?.current_user_role || "member");

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
        const postId = Number(activePost._feed_item_id ?? activePost.feed_item_id ?? activePost.id);
        if (!Number.isInteger(postId)) { alert("Invalid item id"); return; }

        const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/delete-post/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ id: postId })
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(j?.detail || `HTTP ${res.status}`);
            return;
        }
        setDeleteConfirmOpen(false);
        await fetchPosts();
        setPostMenuAnchor(null);
    };


    // Gate: only owner/admin/moderator can post (server should also enforce)
    const canPost = ["owner", "admin", "moderator"].includes(group?.current_user_role || "member");

    // GET posts for this group
    const fetchPosts = React.useCallback(async () => {
        if (!idOrSlug) return;
        setPostsLoading(true); setPostsError("");
        try {
            const headers = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            // (A) normal group posts (text/image/link/event)
            const resPosts = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/`, { headers });
            const postsJson = await resPosts.json().catch(() => ([]));
            if (!resPosts.ok) throw new Error(postsJson?.detail || `HTTP ${resPosts.status}`);
            let postsArr = Array.isArray(postsJson) ? postsJson : [];
            // If backend returns polls here, drop them — we load polls from Activity Feed.
            postsArr = postsArr.filter(p => (p?.type || "").toLowerCase() !== "poll");
            // (B) polls now come from Activity Feed (scope=group)
            const gid = group?.id || idOrSlug; // prefer numeric id when present
            const feedUrl = new URL(`${API_ROOT}/activity/feed/`, API_ROOT);
            feedUrl.searchParams.set("scope", "group");
            feedUrl.searchParams.set("group_id", String(gid));

            const resFeed = await fetch(feedUrl.toString(), { headers });
            const feedJson = await resFeed.json().catch(() => ([]));
            const feedRows = Array.isArray(feedJson?.results) ? feedJson.results
                : (Array.isArray(feedJson) ? feedJson : []);
            const polls = feedRows.map(mapFeedPollToPost).filter(Boolean);

            // merge + newest first
            const merged = [...postsArr, ...polls]
            const seen = new Set();
            const uniq = [];
            for (const p of merged) {
                const id = Number(p?.feed_item_id ?? p?.id);
                const key = `${(p?.type || "post").toLowerCase()}:${isNaN(id) ? "na" : id}`;
                if (seen.has(key)) continue;
                seen.add(key);
                uniq.push(p);
            }

            // newest first
            uniq.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
            setPosts(uniq);
        } catch (e) {
            setPostsError(String(e?.message || e));
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    }, [idOrSlug, token, group?.id]);

    // Load posts only when Posts tab is active (saves calls)
    React.useEffect(() => {
        if (tab === 4) fetchPosts();
    }, [tab, fetchPosts]);

    // auto-load join requests when landing on Notifications tab
    React.useEffect(() => {
        if (showNotificationsTab && tab === NOTIF_TAB_INDEX) fetchRequests();
    }, [showNotificationsTab, tab, fetchRequests]);

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
                    options: pollOptions.map(o => o.trim()).filter(Boolean),
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
    const openMemberMenu = (evt, m) => { setActiveMember(m); setMemMenuAnchor(evt.currentTarget); };
    const closeMemberMenu = () => { setActiveMember(null); setMemMenuAnchor(null); };

    const setRole = async (userId, role) => {
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
                {/* LEFT: Admin sidebar (hidden on small screens, sticky on desktop) */}
                <aside className="hidden lg:block col-span-3">
                    <Box sx={{ position: "sticky", top: 88 /* match Dashboard.jsx header offset */ }}>
                        {/* If your Dashboard passes a prop, reuse it (e.g., active="groups") */}
                        <AdminSidebar active="groups" />
                        {/* OR whatever prop name/value your Dashboard uses */}
                    </Box>
                </aside>

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
                                    <Button
                                        startIcon={<EditNoteRoundedIcon />}
                                        onClick={() => setEditOpen(true)}
                                        variant="contained"
                                        className="rounded-xl"
                                        sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                    >
                                        Edit
                                    </Button>
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
                                <Tab label="Settings" />
                                <Tab label="Posts" />
                                {showNotificationsTab && <Tab label="Notifications" />}
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
                                                <Button
                                                    variant="contained"
                                                    className="rounded-xl"
                                                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                    onClick={() => setAddOpen(true)}
                                                >
                                                    Add members
                                                </Button>
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
                                                            const disabled = busyUserId === m.user.id || isOwnerRow;
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

                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(e) => openMemberMenu(e, m)}
                                                                        disabled={disabled}
                                                                        title={isOwnerRow ? "Owner actions are locked" : "Manage role / remove"}
                                                                    >
                                                                        <MoreVertRoundedIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Stack>
                                                            );
                                                        })}
                                                </Stack>

                                                {/* Per-member action menu */}
                                                <Menu
                                                    anchorEl={memMenuAnchor}
                                                    open={Boolean(memMenuAnchor)}
                                                    onClose={closeMemberMenu}
                                                    elevation={2}
                                                >
                                                    {activeMember && (
                                                        <>
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
                                            {canModerate && (
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

                                        <AddSubgroupDialog
                                            open={addSubOpen}
                                            onClose={() => setAddSubOpen(false)}
                                            parentGroup={group}
                                            onCreated={(g) => { setSubgroups((prev) => [g, ...prev]); }}
                                        />
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
                                                            setChatOn(next);        // optimistic
                                                            saveChatToggle(next);   // persist
                                                        }}
                                                        disabled={chatSaving}
                                                    />
                                                }
                                                label={chatOn ? "On" : "Off"}
                                            />
                                        </Stack>
                                        <Divider className="my-3" />

                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                className="rounded-xl"
                                                sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                                onClick={() => setEditOpen(true)}
                                            >
                                                Edit Details
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                className="rounded-xl"
                                                sx={{ textTransform: "none" }}
                                                onClick={() => setDeleteGroupOpen(true)}
                                            >
                                                Delete Group
                                            </Button>
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
                                                            {/* footer actions at end of post (not for polls) */}
                                                            {canModerate && ["text", "poll"].includes(p.type) && (
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

                                {showNotificationsTab && tab === NOTIF_TAB_INDEX && (
                                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                                        <Stack spacing={2}>
                                            <Typography variant="h6" className="font-semibold">Notifications</Typography>

                                            {!!reqsError && <Alert severity="error">{reqsError}</Alert>}

                                            {reqsLoading ? (
                                                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : reqs.length === 0 ? (
                                                <Alert severity="info">No notifications — there are no pending join requests.</Alert>
                                            ) : (
                                                <List sx={{ width: "100%" }}>
                                                    {reqs.map((r) => {
                                                        const id = r.id ?? r.pk; // tolerate pk/id
                                                        const u = r.user || r.requester || r.member || {};
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
                                                                            onClick={() => takeAction(id, "approve")}
                                                                            disabled={reqsLoading}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            color="error"
                                                                            onClick={() => takeAction(id, "reject")}
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

                                            <Stack direction="row" spacing={1}>
                                                <Button variant="outlined" onClick={fetchRequests} disabled={reqsLoading}>
                                                    Refresh
                                                </Button>
                                            </Stack>
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

                            <MenuItem onClick={() => { setEditPostOpen(true); closePostMenu(); }} disabled={!activePost}>
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
                        <Dialog open={editPostOpen} onClose={() => setEditPostOpen(false)} fullWidth maxWidth="sm">
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
                                    <TextField
                                        label="Caption"
                                        fullWidth
                                        multiline minRows={2}
                                        value={activePost?.text || ""}
                                        onChange={(e) => setActivePost({ ...activePost, text: e.target.value })}
                                        className="mt-2"
                                    />
                                )}

                                {activePost?.type === "poll" && (
                                    <Alert severity="info" className="mt-2">
                                        Editing polls is not enabled here. You can still Hide/Unhide or Delete.
                                    </Alert>
                                )}
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setEditPostOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
                                <Button
                                    onClick={async () => {
                                        if (!activePost) return;
                                        // Adjust endpoint if your backend differs
                                        const res = await fetch(`${API_ROOT}/groups/${idOrSlug}/posts/${activePost.id}/`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                            body: JSON.stringify(
                                                activePost.type === "text" ? { text: activePost.text } :
                                                    activePost.type === "link" ? { text: activePost.text, url: activePost.url } :
                                                        activePost.type === "event" ? { title: activePost.title, text: activePost.text, starts_at: activePost.starts_at, ends_at: activePost.ends_at } :
                                                            activePost.type === "image" ? { text: activePost.text } :
                                                                {}
                                            )
                                        });
                                        if (!res.ok) {
                                            const j = await res.json().catch(() => ({}));
                                            alert(j?.detail || `HTTP ${res.status}`);
                                            return;
                                        }
                                        setEditPostOpen(false);
                                        await fetchPosts();
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