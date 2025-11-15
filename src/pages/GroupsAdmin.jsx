// src/pages/GroupsAdmin.jsx
import React from "react";
import { isOwnerUser, isStaffUser } from "../utils/adminRole";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Box, Button, Chip, LinearProgress,
  MenuItem, Paper, Snackbar, Alert, Stack, TextField, Typography, Pagination, Dialog,
  DialogTitle, DialogContent, DialogActions, Popper  // <-- ADD THIS
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

// ---- API helpers (same style as your Dashboard.jsx) ----
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;
const API_ORIGIN = BASE.replace(/\/api$/, "") || BASE;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";

const toAbs = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};

// Add this: appends ?v=... (or &v=...) so the browser fetches the new file
const bust = (url, key) => {
  if (!url) return url;
  const u = toAbs(url);
  const sep = u.includes("?") ? "&" : "?";
  const k = key ?? Date.now();
  return `${u}${sep}v=${encodeURIComponent(k)}`;
};

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Pretty label for the chip
const labelJoinPolicy = (v) =>
  v === "approval" ? "Approval" : v === "invite" ? "Invite" : "Open";

// ---- Create Group Dialog ----
// Replace the entire CreateGroupDialog and EditGroupDialog with this:
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
          '&:hover': { borderColor: "#10b8a6" }
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

// ---- Create Group Dialog ----
function CreateGroupDialog({ open, onClose, onCreated }) {
  const token = getToken();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState("public");
  const [joinPolicy, setJoinPolicy] = React.useState("open");
  const [imageFile, setImageFile] = React.useState(null);
  const [localPreview, setLocalPreview] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    if (visibility === "private") {
      setJoinPolicy("invite");
    } else {
      if (!joinPolicy || joinPolicy === "invite") {
        setJoinPolicy("open");
      }
    }
  }, [visibility]);

  const onNameChange = (v) => {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Required";
    if (!slug.trim()) e.slug = "Required";
    if (!description.trim()) e.description = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onPickFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("slug", slug.trim());
      fd.append("description", description.trim());
      fd.append("visibility", visibility);
      fd.append("join_policy", visibility === "private" ? "invite" : joinPolicy);
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
          Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ") ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      onCreated?.({ ...json, _cache: Date.now() });
      setToast({ open: true, type: "success", msg: "Group created" });
      onClose?.();
      setName(""); setSlug(""); setDescription(""); setVisibility("public");
      setJoinPolicy("open");
      setImageFile(null); setLocalPreview("");
    } catch (e) {
      setToast({ open: true, type: "error", msg: String(e?.message || e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
        <DialogTitle className="font-extrabold">Create Group</DialogTitle>
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
                select
                fullWidth
                className="mb-3"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                SelectProps={{
                  MenuProps: {
                    disablePortal: true,
                    PaperProps: { sx: { zIndex: 1300 } }
                  },
                }}
              >
                <MenuItem value="public">Public (anyone can find & request to join)</MenuItem>
                <MenuItem value="private">Private (invite-only)</MenuItem>
              </TextField>

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

              <Box sx={{ display: "none" }}>
                <TextField label="Slug *" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
              </Box>
            </div>

            <div className="col-span-12 md:col-span-5">
              <Typography variant="subtitle1" className="font-semibold">Cover Image</Typography>
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
                  id="group-image-file"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </Box>

              <Stack direction="row" spacing={1} className="mt-2">
                <label htmlFor="group-image-file">
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

      <Snackbar
        open={toast.open}
        autoHideDuration={2800}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={toast.type === "error" ? "error" : "success"}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

function EditGroupDialog({ open, group, onClose, onUpdated }) {
  const token = localStorage.getItem("token") || localStorage.getItem("access") || localStorage.getItem("access_token") || "";
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState("public");
  const [joinPolicy, setJoinPolicy] = React.useState("open");
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
    setJoinPolicy(
      group.join_policy === "open"
        ? "open"
        : group.join_policy === "invite"
          ? "invite"
          : "approval"
    );

    setLocalPreview(group.cover_image ? toAbs(group.cover_image) : "");
    setImageFile(null);
    setRemoveImage(false);
    setErrors({});
  }, [group]);

  React.useEffect(() => {
    if (visibility === "private") {
      setJoinPolicy("invite");
    } else {
      if (!joinPolicy || joinPolicy === "invite") {
        setJoinPolicy("open");
      }
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
      fd.append("visibility", visibility);
      fd.append("join_policy", visibility === "private" ? "invite" : joinPolicy);

      if (imageFile && !removeImage) fd.append("cover_image", imageFile, imageFile.name);
      if (removeImage) fd.append("remove_cover_image", "1");

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

      if (imageFile && (!updated?.cover_image || updated.cover_image === group.cover_image)) {
        try {
          const fresh = await fetch(`${API_ROOT}/groups/${idOrSlug}/`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          if (fresh.ok) updated = await fresh.json();
        } catch { }
      }

      const merged = {
        ...group,
        ...updated,
        cover_image: updated?.cover_image ?? (removeImage ? null : group.cover_image),
        _cache: Date.now(),
      };

      onUpdated?.(merged);
      onClose?.();

      setImageFile(null);
      setRemoveImage(false);
      setLocalPreview(merged.cover_image ? toAbs(merged.cover_image) : "");
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
              select
              fullWidth
              className="mb-3"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              SelectProps={{
                MenuProps: {
                  disablePortal: true,
                  PaperProps: { sx: { zIndex: 1300 } }
                },
              }}
            >
              <MenuItem value="public">Public (anyone can find & request to join)</MenuItem>
              <MenuItem value="private">Private (invite-only)</MenuItem>
            </TextField>

            <TextField
              label="Join Policy"
              select
              fullWidth
              className="mb-3"
              value={joinPolicy}
              onChange={(e) => {
                const newVal = e.target.value;
                setJoinPolicy(newVal);
              }}
              disabled={visibility === "private"}
              helperText={visibility === "private" ? "Private groups are invite-only." : ""}
              SelectProps={{
                menuProps: {
                  disablePortal: true,
                  PaperProps: { sx: { zIndex: 1300 } }
                },
              }}
            >
              {visibility === "public" ? (
                <>
                  <MenuItem value="open">Open (join instantly)</MenuItem>
                  <MenuItem value="approval">Approval required</MenuItem>
                </>
              ) : (
                <MenuItem value="invite">Invite only</MenuItem>
              )}
            </TextField>
          </div>

          <div className="col-span-12 md:col-span-5">
            <Typography variant="subtitle1" className="font-semibold">Cover Image</Typography>
            <Typography variant="caption" className="text-slate-500 block mb-2">
              Recommended 650×365px • Max 50 MB
            </Typography>

            <Box
              className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
              sx={{ height: 200, position: "relative", overflow: "hidden" }}
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

// ---- Group Card ----
function GroupCard({ g, onOpen, onEdit }) {
  return (
    <Paper elevation={0} className="h-full flex flex-col rounded-2xl border border-slate-200 overflow-hidden">
      <Box sx={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
        {g.cover_image ? (
          <img
            key={g._cache || g.updated_at}
            src={bust(g.cover_image, g._cache || g.updated_at)}
            alt={g.name}
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "#E5E7EB" }} />
        )}
      </Box>

      <Box className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Chip
              size="small"
              label={g.visibility === "private" ? "Private" : "Public"}
              className={g.visibility === "private" ? "bg-slate-200 text-slate-700" : "bg-teal-50 text-teal-700"}
            />
            {/* NEW: join policy chip */}
            {g.join_policy && (
              <Chip size="small" label={labelJoinPolicy(g.join_policy)} className="bg-slate-100 text-slate-700" />
            )}
          </div>
          {typeof g.member_count === "number" && (
            <span className="text-xs text-slate-500">{g.member_count} members</span>
          )}
        </div>

        <Typography variant="h6" className="font-extrabold !leading-snug text-slate-900">
          {g.name}
        </Typography>
        {g.description && <p className="text-sm text-slate-500 line-clamp-2">{g.description}</p>}

        <Box className="mt-auto flex items-center gap-1.5 pt-1">
          <Button
            onClick={() => onOpen?.(g)}
            variant="contained"
            className="rounded-xl"
            sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
          >
            Open
          </Button>
          <Button
            onClick={() => onEdit?.(g)}
            startIcon={<EditNoteRoundedIcon />}
            variant="outlined"
            className="rounded-xl"
            sx={{ textTransform: "none" }}
          >
            Edit
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

// ---- Page ----
export default function GroupsAdmin() {
  const token = getToken();
  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const myId = user?.id || user?.pk || user?.user_id || null;

  const [groups, setGroups] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  // --- pagination (6 per page) ---
  const PAGE_SIZE = 6;
  const [page, setPage] = React.useState(1);
  const owner = isOwnerUser();
  const staff = isStaffUser();

  const onUpdated = (updated) => {
    setGroups((prev) =>
      prev.map((x) =>
        ((x.id && updated.id && x.id === updated.id) ||
          (x.slug && updated.slug && x.slug === updated.slug))
          ? updated
          : x
      )
    );
  };

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const owner = isOwnerUser();
        const staff = isStaffUser();

        const url = owner
          ? `${API_ROOT}/groups/?created_by=me`
          : `${API_ROOT}/groups/?page_size=200`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        let data = [];
        if (res.ok) {
          const json = await res.json();
          data = Array.isArray(json) ? json : Array.isArray(json?.results) ? json.results : [];
        }

        if (!cancelled) {
          let arr = Array.isArray(data) ? data : [];

          if (owner && myId) {
            // Owner: only groups I created
            arr = arr.filter((g) => {
              const creator =
                g.created_by?.id ?? g.created_by_id ?? g.owner_id ?? null;
              return creator != null && String(creator) === String(myId);
            });
          }

          if (!owner && staff) {
            // Staff: groups where I'm at least a member (any role)
            arr = arr.filter((g) => !!g.current_user_role);
          }

          setGroups(arr);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setGroups([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, myId]);



  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) =>
      `${g.name || ""} ${g.description || ""}`.toLowerCase().includes(term)
    );
  }, [groups, q]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = React.useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  // reset/clamp page when filters change
  React.useEffect(() => { setPage(1); }, [q]);
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);


  const onCreated = (g) => setGroups((prev) => [g, ...prev]);

  const navigate = useNavigate();
  const onOpen = (g) => {
    const id = g?.slug || g?.id;
    if (!id) return;
    navigate(`/groups/${id}`);
  };

  return (
    <div className="max-w-screen-lg mx-auto py-6 sm:py-8">
      {/* Header */}
      <Box className="flex items-center gap-3 mb-4">
        <Avatar sx={{ bgcolor: "#0ea5a4" }}>{(user?.first_name || "A")[0].toUpperCase()}</Avatar>
        <div className="flex-1">
          <Typography variant="h5" className="font-extrabold">
            Admin Groups
          </Typography>
          <Typography className="text-slate-500">Create and manage your groups.</Typography>
        </div>

        {isOwnerUser() && (
          <Button
            onClick={() => setCreateOpen(true)}
            startIcon={<AddRoundedIcon />}
            variant="contained"
            className="rounded-xl"
            sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
          >
            Create Group
          </Button>
        )}
      </Box>

      {/* Search */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        className="mb-5"
      >
        <TextField
          size="small"
          placeholder="Search your groups…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <SearchRoundedIcon className="mr-2 text-slate-400" /> }}
          sx={{ width: { xs: "100%", sm: 360 } }}
        />
        <Box sx={{ flex: 1 }} />
      </Stack>

      {/* Grid */}
      {loading ? (
        <Box className="flex items-center justify-center py-16">
          <div className="w-64">
            <LinearProgress />
            <p className="text-center text-slate-500 mt-3">Loading groups…</p>
          </div>
        </Box>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} className="rounded-2xl border border-slate-200">
          <Box className="p-8 text-center">
            <Typography variant="h6" className="font-semibold text-slate-700">
              No groups found
            </Typography>
            <p className="text-slate-500 mt-1">Try a different search or create a new group.</p>
            {isOwnerUser() && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 rounded-xl"
                sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                variant="contained"
              >
                Create Group
              </Button>
            )}
          </Box>
        </Paper>

      ) : (
        <Box sx={{ flexGrow: 1 }}>
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 gap-2 md:gap-3">
            {pageItems.map((g) => (
              <div key={g.id || g.slug} className="col-span-4">
                <GroupCard
                  g={g}
                  onOpen={onOpen}
                  onEdit={(grp) => { setEditing(grp); setEditOpen(true); }}
                />
              </div>
            ))}
          </div>
          <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              shape="rounded"
              size="medium"
            />
          </Stack>
        </Box>
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onCreated} />

      {/* Edit Group Dialog */}
      {console.log('isOwnerUser():', isOwnerUser())}
      <EditGroupDialog
        open={editOpen}
        group={editing}
        onClose={() => { setEditOpen(false); setEditing(null); }}
        onUpdated={onUpdated}
      />
    </div>
  );
}
