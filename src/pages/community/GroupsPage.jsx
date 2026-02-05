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
} from "@mui/material";
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
                { label: "Public (anyone can find & request to join)", value: "public" },
                { label: "Private (invite-only)", value: "private" }
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
                    { label: "Open (join instantly)", value: "open" },
                    { label: "Approval required", value: "approval" }
                  ]
                  : [
                    { label: "Invite only", value: "invite" }
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

      {/* Content skeleton */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={60} height={16} />
        </Stack>

        <Skeleton variant="text" width="70%" height={24} />
        <Skeleton variant="text" width="90%" height={18} />
      </CardContent>

      {/* Buttons skeleton */}
      <CardActions sx={{ pt: 0, pb: 1, px: 1 }}>
        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
          <Skeleton variant="rectangular" width="50%" height={32} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" width="50%" height={32} sx={{ borderRadius: 2 }} />
        </Stack>
      </CardActions>
    </Card>
  );
}

/* ---------- Header with title + overlapping avatars ---------- */
function TopicHeader({ title, previews = [], extraCount = 0 }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        mb: 2,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
          <Stack direction="row" sx={{ "& > *": { border: "2px solid #fff" } }}>
            {previews.slice(0, 3).map((p, i) => (
              <Avatar
                key={p.id || i}
                src={p.avatarUrl}
                alt={p.name}
                sx={{
                  width: 36,
                  height: 36,
                  ml: i === 0 ? 0 : -1.2,
                }}
              >
                {(p.name || "U").slice(0, 1)}
              </Avatar>
            ))}
          </Stack>
          {extraCount > 0 && (
            <Box
              sx={{
                ml: -1,
                px: 1,
                py: 0.25,
                fontSize: 12,
                borderRadius: 999,
                border: `1px solid ${BORDER}`,
                bgcolor: "#fff",
              }}
            >
              +{extraCount}
            </Box>
          )}
        </Stack>
      </Stack>
    </Paper>
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
  const ctaText = joined
    ? "Joined"
    : pending
      ? "Request pending"
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
          disabled={pending || joined}
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
    return { ...row, is_member: true, membership_status: "joined" };
  }
  if (row?.group) {
    const g = row.group;
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
      is_member: true,
      membership_status: "joined",
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

  async function fetchExploreGroups() {
    try {
      const r = await fetch(`${API_ROOT}/groups/explore-groups/`, {
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
      const r = await fetch(`${API_ROOT}/groups/joined-groups/`, {
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
  }, []);

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
          is_member: true,
          membership_status: "joined",
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
      return true;
    });
  }, [activeList, q]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [q, tabIndex]);

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
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          gap: 3,
          px: { xs: 0, sm: 2, md: 2.5, lg: 3 },
          maxWidth: { xs: "100%", lg: "1200px" },
          mx: "auto",
        }}
      >
        {/* LEFT: Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TopicHeader
            title={headerTitle}
            previews={[]}
            extraCount={0}
          />

          {/* TABS + FILTER BAR */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: `1px solid ${BORDER}`,
              borderRadius: 3,
              mb: 2,
            }}
          >
            <Stack spacing={2}>
              <Tabs
                value={tabIndex}
                onChange={(_e, v) => setTabIndex(v)}
                variant="standard"
                textColor="primary"
                indicatorColor="primary"
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="All Groups" />
                <Tab label="My Groups" />
              </Tabs>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={
                      tabIndex === 0 ? "Search all groups..." : "Search my groups..."
                    }
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Stack>
            </Stack>
          </Paper>

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
            <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {tabIndex === 0
                  ? "No groups found."
                  : "You haven't joined any groups yet."}
              </Typography>
            </Paper>
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
