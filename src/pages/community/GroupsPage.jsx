// src/pages/community/GroupsPage.jsx
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
  Tab,
  Tabs,
  MenuItem,
  IconButton,
  Popper,
  Chip,
  Tooltip,
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

const normalizeJoinPolicy = (g) => {
  const raw =
    g?.join_policy ??
    g?.joinPolicy ??
    g?.join_policy_value ??
    g?.joinPolicyValue ??
    "";
  const v = String(raw || "").toLowerCase().trim();
  if (v === "public_approval") return "approval";
  if (v === "request") return "approval";
  return v;
};

const normalizeVisibility = (g) => {
  const raw = g?.visibility ?? g?.visibility_level ?? g?.visibilityLevel ?? "";
  return String(raw || "").toLowerCase().trim();
};

const membershipLabel = (g) => {
  if (g?.is_member) return "Member";
  const s = normalizeMembershipStatus(g);
  if (s === "pending" || s === "requested" || s === "request") return "Pending";
  if (s === "joined" || s === "active" || s === "approved" || s === "member") return "Member";
  return "";
};

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

/* ---------- Single group card — v3 design ---------- */
const GROUP_ACCENT_COLORS = ["#0A9396", "#E8532F", "#1B2A4A", "#7B2D8E", "#D4920B", "#3B5998"];
function hashColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return GROUP_ACCENT_COLORS[h % GROUP_ACCENT_COLORS.length];
}

function GroupGridCard({ g, onJoin, onOpen, onEdit, hideJoin, canEdit }) {
  const [hov, setHov] = React.useState(false);
  const isPrivate = (g.visibility || "").toLowerCase() === "private";
  const members = g.member_count ?? g.members_count ?? g.members?.length ?? 0;
  const posts = g.post_count ?? g.posts_count ?? 0;
  const activity = g.weekly_activity ?? g.activity_count ?? null;
  const role = roleLabel(g);
  const memberStatus = membershipLabel(g);
  const accent = g.color || hashColor(g.name);

  const visibility = (g.visibility || "").toLowerCase();
  const jp = (g.join_policy || "").toLowerCase();
  const isApproval =
    visibility === "public" && (jp === "public_approval" || jp === "approval");
  const isInviteOnly = jp === "invite";
  const pending = (g.membership_status || "").toLowerCase() === "pending";
  const joined =
    (g.membership_status || "").toLowerCase() === "joined" || !!g.is_member;

  const ctaText = joined
    ? "Joined"
    : pending
      ? "Request pending"
      : isInviteOnly
        ? "Invite Only"
        : isApproval
          ? "Request to Join"
          : "Join";

  return (
    <Box
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      sx={{
        borderRadius: "14px",
        border: `1px solid ${hov ? accent + "55" : BORDER}`,
        background: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow .2s, border-color .2s",
        boxShadow: hov ? "0 6px 24px rgba(0,0,0,.09)" : "0 1px 4px rgba(0,0,0,.05)",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Top accent stripe */}
      <Box sx={{ height: 4, bgcolor: accent, flexShrink: 0 }} />

      {/* Cover image / color bar */}
      <Box
        onClick={() => onOpen?.(g)}
        sx={{
          width: "100%",
          height: g.cover_image || g.cover ? 100 : 0,
          backgroundImage: g.cover_image || g.cover ? `url(${toAbsolute(g.cover_image || g.cover)})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Logo overlay */}
        {g.logo && (
          <Box sx={{
            position: "absolute", bottom: -20, left: 14,
            width: 44, height: 44, borderRadius: "50%",
            overflow: "hidden", border: "3px solid white", bgcolor: "white",
            zIndex: 2, boxShadow: "0 2px 8px rgba(0,0,0,.15)"
          }}>
            <img src={bust(g.logo, g._cache || g.updated_at)} alt="logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: "16px 18px 14px", flexGrow: 1, display: "flex", flexDirection: "column", gap: "6px", mt: g.logo && (g.cover_image || g.cover) ? 3 : 0 }}>
        {/* Category breadcrumb + status badges row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px", mb: "2px" }}>
          {category ? (
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {category}{subcategory ? ` · ${subcategory}` : ""}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isPrivate ? "PRIVATE" : "GROUP"}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {joined && (
              <Box sx={{ fontSize: 10, fontWeight: 700, color: "#0A9396", bgcolor: "#E8F7F7", px: "7px", py: "2px", borderRadius: "100px" }}>
                ✓ Joined
              </Box>
            )}
            {pending && (
              <Box sx={{ fontSize: 10, fontWeight: 700, color: "#b45309", bgcolor: "#fffbeb", px: "7px", py: "2px", borderRadius: "100px" }}>
                Pending
              </Box>
            )}
            {isApproval && !joined && !pending && (
              <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <LockRounded sx={{ fontSize: 11, color: "#f97316" }} />
                <Typography sx={{ fontSize: 10, color: "#f97316" }}>Approval required</Typography>
              </Box>
            )}
            {role && (
              <Box sx={{ fontSize: 10, fontWeight: 700, color: "#4338ca", bgcolor: "#eef2ff", px: "7px", py: "2px", borderRadius: "100px" }}>
                {role}
              </Box>
            )}
          </Box>
        </Box>

        {/* Title */}
        <Box onClick={() => onOpen?.(g)}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: "0.08em", mb: "2px" }}>
            GROUP
          </Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#1B2A4A", lineHeight: 1.25, mb: "4px" }}>
            {g.name}
          </Typography>
          {g.owner_name || g.created_by_name ? (
            <Typography sx={{ fontSize: 11, color: "#888" }}>
              by {g.owner_name || g.created_by_name}
            </Typography>
          ) : null}
        </Box>

        {/* Description */}
        {desc && (
          <Typography sx={{ fontSize: 12, color: "#666", lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {desc}
          </Typography>
        )}

        {/* Stats */}
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", mt: "4px" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <Typography sx={{ fontSize: 11, color: "#888" }}>{members}</Typography>
          </Box>
          {posts > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <Typography sx={{ fontSize: 11, color: "#888" }}>{posts}</Typography>
            </Box>
          )}
          {activity != null && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              <Typography sx={{ fontSize: 11, color: "#888" }}>{activity}/wk</Typography>
            </Box>
          )}
        </Box>

        {/* Tags */}
        {g.parent_group && (
          <Typography sx={{ fontSize: 11, color: "#888" }}>
            Subgroup of <b>{g.parent_group.name}</b>
          </Typography>
        )}
      </Box>

      {/* CTA footer */}
      <Box sx={{ borderTop: `1px solid ${BORDER}`, px: "18px", py: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
        {!hideJoin && (
          <Box
            onClick={() => !pending && !joined && onJoin?.(g)}
            sx={{
              fontSize: 12, fontWeight: 700,
              color: joined ? "#888" : accent,
              cursor: (pending || joined) ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: "4px",
              opacity: pending ? 0.6 : 1,
              "&:hover": { textDecoration: (pending || joined) ? "none" : "underline" }
            }}
          >
            {ctaLabel} {!joined && !pending && "→"}
          </Box>
        )}
        {canEdit && (
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit?.(g); }}
            sx={{ ml: "auto", color: "#aaa", "&:hover": { color: accent } }} title="Edit Group">
            <EditNoteRoundedIcon fontSize="small" />
          </IconButton>
        )}
        {(hideJoin || joined) && (
          <Box
            onClick={() => onOpen?.(g)}
            sx={{ fontSize: 12, fontWeight: 700, color: accent, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px",
              "&:hover": { textDecoration: "underline" } }}
          >
            {joined ? "Open Group →" : "View Details →"}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function GroupGridCardSkeleton() {
  return (
    <Box sx={{ borderRadius: "14px", border: `1px solid ${BORDER}`, background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Skeleton variant="rectangular" width="100%" height={4} sx={{ bgcolor: "#e8f7f7" }} />
      <Box sx={{ p: "16px 18px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton variant="text" width={80} height={14} />
          <Skeleton variant="text" width={50} height={14} />
        </Box>
        <Skeleton variant="text" width="20%" height={12} />
        <Skeleton variant="text" width="70%" height={22} />
        <Skeleton variant="text" width="40%" height={14} />
        <Skeleton variant="text" width="95%" height={14} />
        <Skeleton variant="text" width="80%" height={14} />
        <Box sx={{ display: "flex", gap: "12px" }}>
          <Skeleton variant="text" width={40} height={14} />
          <Skeleton variant="text" width={30} height={14} />
        </Box>
      </Box>
      <Box sx={{ borderTop: `1px solid ${BORDER}`, px: "18px", py: "12px" }}>
        <Skeleton variant="text" width={90} height={16} />
      </Box>
    </Box>
  );
}

/* ---------- Header with title + overlapping avatars ---------- */
function TopicHeader({ title, groupCount, myGroupCount }) {
  const navigate = useNavigate();
  const canCreate = isAdminUser();
  return (
    <Box sx={{ textAlign: "center", mb: 3, pt: 1 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#0A9396", textTransform: "uppercase", letterSpacing: "0.12em", mb: "6px" }}>
        COMMUNITY
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2A4A", mb: "8px", lineHeight: 1.2 }}>
        Explore Groups
      </Typography>
      <Typography sx={{ fontSize: 14, color: "#888", mb: canCreate ? 2 : 0 }}>
        Join groups organized by region, industry, practice area, and topic.
      </Typography>
      {canCreate && (
        <Box sx={{ mt: 1 }}>
          <Button
            variant="contained"
            onClick={() => navigate("/group/create")}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: 13,
              bgcolor: "#0A9396", "&:hover": { bgcolor: "#077B7E" },
              borderRadius: "10px", px: 3,
            }}
          >
            + Create Group
          </Button>
        </Box>
      )}
    </Box>
  );
}

function GroupQuickViewDialog({ open, group, onClose, onJoin }) {
  if (!group) return null;

  const members = group.member_count ?? group.members_count ?? group.members?.length ?? 0;
  const isPrivate = (group.visibility || "").toLowerCase() === "private";
  const visibility = (group.visibility || "").toLowerCase();
  const jp = (group.join_policy || "").toLowerCase();
  const pending = (group.membership_status || "").toLowerCase() === "pending";
  const joined =
    (group.membership_status || "").toLowerCase() === "joined" || !!group.is_member;
  const isApproval =
    visibility === "public" && (jp === "public_approval" || jp === "approval");
  const isInviteOnly = jp === "invite";
  const ctaText = joined
    ? "Joined"
    : pending
      ? "Request pending"
      : isInviteOnly
        ? "Invite Only"
        : isApproval
          ? "Request to join"
          : "Join";

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{group.name}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            width: "100%",
            height: 180,
            mb: 2,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#f8fafc",
            border: `1px solid ${BORDER}`,
            backgroundImage:
              group.cover_image || group.cover
                ? `url(${toAbsolute(group.cover_image || group.cover)})`
                : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {/* Logo overlay */}
          {group.logo && (
            <Box
              sx={{
                position: "absolute",
                bottom: -28,
                left: 20,
                width: 56,
                height: 56,
                borderRadius: "50%",
                overflow: "hidden",
                border: "4px solid white",
                backgroundColor: "white",
                zIndex: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}
            >
              <img
                src={bust(group.logo, group._cache || group.updated_at)}
                alt="logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, pt: group.logo ? 4 : 1 }}>
          <Typography variant="caption" color="text.secondary">
            {isPrivate ? "Private" : "Public"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            •
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {members} members
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {group.description || "No description provided."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => onJoin?.(group)}
          disabled={pending || joined || isInviteOnly}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {ctaText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Normalize "joined-groups" API result
function normalizeMyGroup(row) {
  if (row?.name && !row.group) {
    // If backend provides specific status, use it. Otherwise fallback.
    // "joined-groups" endpoint returns "active" or "pending".
    const status = row.membership_status || "joined";
    const isMember =
      typeof row.is_member === "boolean"
        ? row.is_member
        : status === "active" || status === "joined" || status === "member";

    return { ...row, is_member: isMember, membership_status: status };
  }
  if (row?.group) {
    const g = row.group;
    // Attempt to read status from the wrapper or the group
    const status =
      row.membership_status ||
      row.status ||
      g.membership_status ||
      "joined";

    // Check if truly active
    const lower = String(status).toLowerCase();
    const isMember =
      lower === "active" ||
      lower === "joined" ||
      lower === "member" ||
      lower === "approved";

    return {
      ...g,
      id: g.id,
      name: g.name,
      description: g.description || g.about || "",
      member_count:
        g.member_count ??
        g.members_count ??
        (Array.isArray(g.members) ? g.members.length : g.members ?? 0),
      cover_image: g.cover_image || g.coverImage || null,
      visibility: g.visibility || "public",
      is_member: isMember,
      membership_status: status,
    };
  }
  return null;
}


export default function GroupsPage({ onJoinGroup = async () => { }, user }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const headerTitle = params.get("topic") || "Groups";

  const [tabIndex, setTabIndex] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);


  const [selectedRegions, setSelectedRegions] = React.useState([]);

  const [globalOptions, setGlobalOptions] = React.useState({


    regions: [],
  });

  const [selectedJoinPolicies, setSelectedJoinPolicies] = React.useState([]);
  const [selectedVisibilities, setSelectedVisibilities] = React.useState([]);

  const [exploreGroups, setExploreGroups] = React.useState([]);
  const [myGroups, setMyGroups] = React.useState([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [quickOpen, setQuickOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const openQuick = (g) => {
    setSelected(g);
    setQuickOpen(true);
  };

  const [previews, setPreviews] = React.useState([]);
  const [extraCount, setExtraCount] = React.useState(0);

  // Edit dialog state
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState(null);

  const openEdit = (g) => {
    setEditingGroup(g);
    setEditOpen(true);
  };

  const handleGroupUpdated = (updated) => {
    // Update in exploreGroups
    setExploreGroups((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
    // Update in myGroups
    setMyGroups((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
  };

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

  const buildMemberFiltersQuery = React.useCallback(() => {
    const params = new URLSearchParams();


    selectedRegions.forEach((v) => params.append("region", v));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [selectedRegions]);

  async function fetchExploreGroups() {
    try {
      const r = await fetch(`${API_ROOT}/groups/explore-groups/${buildMemberFiltersQuery()}`, {
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (r.status === 401) throw new Error("Please log in to see groups.");
      const d = await r.json().catch(() => ({}));
      const list = Array.isArray(d) ? d : d.results || [];
      setExploreGroups(list);

      const mp = list?.[0]?.members_preview;
      if (Array.isArray(mp) && mp.length) {
        setPreviews(mp.slice(0, 3));
        setExtraCount(Math.max(0, mp.length - 3));
      } else {
        setPreviews([
          { id: 1, name: "A", avatarUrl: "" },
          { id: 2, name: "B", avatarUrl: "" },
        ]);
        setExtraCount(0);
      }
    } catch (e) {
      console.error(e);
      if (tabIndex === 0) setError(e?.message || "Failed to load groups");
    }
  }

  async function fetchMyGroups() {
    try {
      const r = await fetch(`${API_ROOT}/groups/joined-groups/${buildMemberFiltersQuery()}`, {
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (r.ok) {
        const d = await r.json();
        const rows = Array.isArray(d) ? d : d?.results || [];
        const normalized = rows.map(normalizeMyGroup).filter(Boolean);
        setMyGroups(normalized);
      }
    } catch (e) {
      console.error("Failed to load joined groups:", e);
    }
  }

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchExploreGroups(), fetchMyGroups()]).finally(() =>
      setLoading(false)
    );
  }, [selectedRegions]);

  const handleJoin = async (g) => {
    const visibility = (g.visibility || "").toLowerCase();
    const jp = (g.join_policy || "").toLowerCase();

    const isApproval =
      visibility === "public" && (jp === "public_approval" || jp === "approval");
    const path = isApproval ? "join-group/request" : "join-group";

    try {
      const r = await fetch(`${API_ROOT}/groups/${g.id}/${path}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({}),
      });

      if (r.status === 401) throw new Error("Please log in to join.");

      if (r.ok) {
        fetchExploreGroups();
        fetchMyGroups();
        return;
      }

      const payload = await r.json().catch(() => ({}));
      throw new Error(payload?.detail || "Failed to join group");
    } catch (e) {
      alert(e?.message || "Failed to join group");
    }
  };

  const allGroupsCombined = React.useMemo(() => {
    const map = new Map();

    exploreGroups.forEach((g) => {
      if (!g || g.id == null) return;
      map.set(g.id, g);
    });

    myGroups.forEach((mg) => {
      if (!mg || mg.id == null) return;
      if (map.has(mg.id)) {
        const existing = map.get(mg.id);
        map.set(mg.id, {
          ...existing,
          is_member: mg.is_member,
          membership_status: mg.membership_status,
        });
      } else {
        map.set(mg.id, mg);
      }
    });

    return Array.from(map.values());
  }, [exploreGroups, myGroups]);

  const activeList = tabIndex === 0 ? allGroupsCombined : myGroups;

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return activeList.filter((g) => {
      if (t) {
        const hay = `${g.name || ""} ${g.description || ""} ${g.slug || ""
          }`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (selectedJoinPolicies.length) {
        const jp = normalizeJoinPolicy(g);
        if (!selectedJoinPolicies.includes(jp)) return false;
      }
      if (selectedVisibilities.length) {
        const vis = normalizeVisibility(g);
        if (!selectedVisibilities.includes(vis)) return false;
      }
      return true;
    });
  }, [activeList, q, selectedJoinPolicies, selectedVisibilities]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [q, tabIndex, selectedJoinPolicies, selectedVisibilities, selectedRegions]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedGroups = React.useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (_event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 }, bgcolor: "#FAF9F7", minHeight: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          gap: 3,
          px: { xs: 2, sm: 2, md: 2.5, lg: 3 },
          maxWidth: { xs: "100%", lg: "1200px" },
          mx: "auto",
        }}
      >
        {/* LEFT: Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TopicHeader
            groupCount={allGroupsCombined.length}
            myGroupCount={myGroups.length}
          />

          {/* TABS + FILTER BAR */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              pb: 2,
              borderBottom: "1px solid #EEECEA",
            }}
          >
            <Box sx={{ display: "flex", gap: "4px" }}>
              {[
                { label: "All Groups", count: allGroupsCombined.length },
                { label: "My Groups", count: myGroups.length },
              ].map((tab, i) => (
                <Box
                  key={i}
                  onClick={() => setTabIndex(i)}
                  sx={{
                    px: 2, py: "6px", borderRadius: "100px", cursor: "pointer",
                    fontSize: 13, fontWeight: tabIndex === i ? 700 : 500,
                    color: tabIndex === i ? "#1B2A4A" : "#888",
                    bgcolor: tabIndex === i ? "#fff" : "transparent",
                    border: tabIndex === i ? "1.5px solid #EEECEA" : "1.5px solid transparent",
                    boxShadow: tabIndex === i ? "0 1px 4px rgba(0,0,0,.06)" : "none",
                    display: "flex", alignItems: "center", gap: "6px",
                    transition: "all .15s",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Box component="span" sx={{
                      fontSize: 11, fontWeight: 700,
                      bgcolor: tabIndex === i ? "#0A9396" : "#e5e7eb",
                      color: tabIndex === i ? "#fff" : "#666",
                      px: "7px", py: "1px", borderRadius: "100px",
                    }}>
                      {tab.count}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
            <TextField
              size="small"
              placeholder={tabIndex === 0 ? "Search groups…" : "Search my groups…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "#aaa" }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: "10px", fontSize: 13, bgcolor: "#fff" }
              }}
              sx={{ width: 240 }}
            />
          </Box>

          {/* Showing count */}
          {!loading && (
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>
              {tabIndex === 0 ? "ALL GROUPS" : "MY GROUPS"} {filtered.length}
            </Typography>
          )}

          {/* Loading / error */}
          {!loading && error && tabIndex === 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* === GROUP GRID: exactly 3 cards per row on md+ === */}
          {loading ? (
            // 🔹 Skeleton loading state (keep layout same as real grid)
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <Box key={i}>
                  <GroupGridCardSkeleton />
                </Box>
              ))}
            </Box>
          ) : paginatedGroups.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {paginatedGroups.map((g) => {
                const joined =
                  (g.membership_status || "").toLowerCase() === "joined" ||
                  !!g.is_member;

                // Check if user is owner of the group OR is an admin
                const canEdit = g.is_owner || isAdminUser();

                const handleOpen = (group) => {
                  // If joined (in any tab) → go to details page
                  if (joined || tabIndex === 1) {
                    navigate(`/community/groups/${group.id}`);
                  } else {
                    // Not joined + All Groups tab → open quick view
                    openQuick(group);
                  }
                };

                return (
                  <Box key={g.id}>
                    <GroupGridCard
                      g={g}
                      onJoin={handleJoin}
                      onOpen={handleOpen}
                      onEdit={openEdit}
                      hideJoin={tabIndex === 1 || joined}
                      canEdit={canEdit}
                    />
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 8, color: "#aaa" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {tabIndex === 0 ? "No groups found." : "You haven't joined any groups yet."}
              </Typography>
            </Box>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}

          <GroupQuickViewDialog
            open={quickOpen}
            group={selected}
            onClose={() => setQuickOpen(false)}
            onJoin={handleJoin}
          />

          <EditGroupDialog
            open={editOpen}
            group={editingGroup}
            onClose={() => setEditOpen(false)}
            onUpdated={handleGroupUpdated}
          />
        </Box>
      </Box>
    </Box>
  );
}
