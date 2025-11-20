// src/pages/AdminSettings.jsx
import * as React from "react";
import {
  Box,
  Stack,
  Container,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Avatar,
  Button,
  TextField,
  Typography,
  Grid,
  Snackbar,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  MenuItem,
} from "@mui/material";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { isOwnerUser } from "../utils/adminRole";

// --- API helpers (same base style as before) ---
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("access") ||
  "";

const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * BACKEND HOOKS
 *
 * We use the existing UserViewSet actions:
 *   GET/PATCH  /api/users/me/        -> user + profile (UserSerializer)
 *   POST       /api/users/me/avatar/ -> upload avatar file
 */

async function fetchAdminProfile() {
  const url = `${API_ROOT}/users/me/`;
  const r = await fetch(url, {
    headers: { accept: "application/json", ...authHeader() },
  });
  if (!r.ok) throw new Error("Failed to load profile");
  return r.json(); // { id, username, email, profile: {...}, ... }
}

async function updateAdminProfile(profilePayload) {
  const url = `${API_ROOT}/users/me/`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ profile: profilePayload }),
  });
  if (!r.ok) throw new Error("Failed to save profile");
  return r.json(); // updated user object
}

async function updateAdminContact(userPayload, profilePayload) {
  const url = `${API_ROOT}/users/me/`;
  const body = { ...userPayload };
  if (profilePayload && Object.keys(profilePayload).length) {
    body.profile = profilePayload;
  }

  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Failed to save contact");
  return r.json();
}

async function uploadAvatar(file) {
  const fd = new FormData();
  // backend accepts 'avatar' OR 'user_image'
  fd.append("avatar", file, file.name);
  const r = await fetch(`${API_ROOT}/users/me/avatar/`, {
    method: "POST",
    headers: { ...authHeader() },
    body: fd,
  });
  if (!r.ok) throw new Error("Avatar upload failed");
  return r.json(); // { user_image, user_image_url }
}

// -------------------- Helpers copied from ProfilePage --------------------

function parseSkills(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j.map(String);
  } catch {
    // ignore
  }
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLinks(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return {};
  try {
    const j = JSON.parse(v);
    if (j && typeof j === "object" && !Array.isArray(j)) return j;
  } catch {
    // ignore
  }
  // fallback: "key=url" lines
  const out = {};
  v.split(/\n|,|;/).forEach((part) => {
    const [k, ...rest] = part.split("=");
    const key = (k || "").trim();
    const val = rest.join("=").trim();
    if (key && val) out[key] = val;
  });
  return out;
}

function SectionCard({ title, action, children, sx }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        width: "100%",
        mx: { xs: "auto", md: 0 },
        ...sx,
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        }
        action={action}
        sx={{ pb: 0.5, "& .MuiCardHeader-action": { alignSelf: "center" } }}
      />
      <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
    </Card>
  );
}

const Label = ({ children, sx }) => (
  <Typography
    variant="subtitle2"
    color="text.secondary"
    sx={{ mb: 0.5, ...sx }}
  >
    {children}
  </Typography>
);

const PlaceholderLine = ({ height = 22 }) => (
  <Box
    sx={{
      height,
      borderBottom: "1px solid",
      borderColor: "divider",
      borderRadius: 0.5,
    }}
  />
);

const KV = ({ label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
    <Typography
      variant="subtitle2"
      sx={{
        width: { xs: 110, sm: 150, md: 170 },
        minWidth: { xs: 110, sm: 150, md: 170 },
        color: "text.secondary",
      }}
    >
      {label}:
    </Typography>
    <Typography
      variant="body2"
      sx={{ flex: 1, wordBreak: "break-word" }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

// date helpers for Experience/Education display
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const toMonthYear = (d) => {
  if (!d) return "";
  const [y, m] = String(d).split("-");
  const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
  return mi != null && y ? `${MONTHS[mi]} ${y}` : String(d);
};

const rangeLinkedIn = (s, e, cur) => {
  const start = toMonthYear(s);
  const end = cur ? "present" : toMonthYear(e);
  return start || end ? `${start} - ${end || ""}` : "";
};

// -------------------- Component --------------------

export default function AdminSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({
    open: false,
    type: "success",
    msg: "",
  });

  const [profile, setProfile] = React.useState({
    first_name: "",
    last_name: "",
    full_name: "",
    bio: "",
    headline: "",
    location: "",
    user_image_url: "",
    email: "",
    job_title: "",
    company: "",
    skillsText: "",
    linksText: "",
  });

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    location: "",
    linkedinUrl: "",
  });


  const [eduList, setEduList] = React.useState([]);
  const [expList, setExpList] = React.useState([]);

  const fileRef = React.useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isOwner = React.useMemo(() => {
    try {
      return typeof isOwnerUser === "function" ? isOwnerUser() : false;
    } catch {
      return false;
    }
  }, []);

  // bust cache when avatar URL changes so new image shows immediately
  const avatarUrl = React.useMemo(() => {
    const raw = profile?.user_image_url || "";
    return raw ? `${raw}${raw.includes("?") ? "&" : "?"}_=${Date.now()}` : "";
  }, [profile?.user_image_url]);

  // --- dialogs & forms for staff view (About / Experience / Education) ---
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [aboutForm, setAboutForm] = React.useState({
    bio: "",
    skillsText: "",
  });

  const [eduOpen, setEduOpen] = React.useState(false);
  const [expOpen, setExpOpen] = React.useState(false);
  const [editEduId, setEditEduId] = React.useState(null);
  const [editExpId, setEditExpId] = React.useState(null);

  const [eduForm, setEduForm] = React.useState({
    school: "",
    degree: "",
    field: "",
    start: "",
    end: "",
    grade: "",
  });

  const emptyExpForm = {
    org: "",
    position: "",
    location: "",
    start: "",
    end: "",
    current: false,
    employment_type: "full_time", // compulsory (default)
    work_schedule: "",
    relationship_to_org: "",
    career_stage: "",
    compensation_type: "",
    work_arrangement: "",
  };
  const [expForm, setExpForm] = React.useState(emptyExpForm);
  const [syncProfileLocation, setSyncProfileLocation] = React.useState(false);

  const [confirm, setConfirm] = React.useState({
    open: false,
    type: null, // 'edu' | 'exp'
    id: null,
    label: "",
  });

  const openAbout = () => {
    setAboutForm({
      bio: profile.bio || "",
      skillsText: profile.skillsText || "",
    });
    setAboutOpen(true);
  };

  const openContact = () => {
    const links = parseLinks(profile.linksText);
    setContactForm({
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      jobTitle: profile.job_title || "",
      email: profile.email || "",
      location: profile.location || "",
      linkedinUrl:
        typeof links.linkedin === "string" ? links.linkedin : "",
    });
    setContactOpen(true);
  };

  const saveContact = async () => {
    try {
      setSaving(true);

      const links = parseLinks(profile.linksText);
      const linkedin = (contactForm.linkedinUrl || "").trim();
      const newLinks = { ...links };
      if (linkedin) newLinks.linkedin = linkedin;
      else delete newLinks.linkedin;

      const userPayload = {
        first_name: contactForm.firstName || "",
        last_name: contactForm.lastName || "",
        email: contactForm.email || "",
      };

      const profilePayload = {
        job_title: contactForm.jobTitle || "",
        location: contactForm.location || "",
        links: newLinks,
      };

      const updated = await updateAdminContact(userPayload, profilePayload);
      const updatedProfile = updated.profile || {};

      const linksText =
        updatedProfile.links != null
          ? JSON.stringify(updatedProfile.links)
          : JSON.stringify(newLinks);

      setProfile((prev) => ({
        ...prev,
        first_name: updated.first_name ?? userPayload.first_name,
        last_name: updated.last_name ?? userPayload.last_name,
        full_name:
          updatedProfile.full_name ||
          prev.full_name ||
          `${userPayload.first_name} ${userPayload.last_name}`.trim(),
        email: updated.email ?? userPayload.email,
        job_title: updatedProfile.job_title ?? profilePayload.job_title,
        location: updatedProfile.location ?? profilePayload.location,
        linksText,
      }));

      setToast({
        open: true,
        type: "success",
        msg: "Contact updated",
      });
      setContactOpen(false);
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        msg: err?.message || "Failed to update contact",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async () => {
    try {
      setSaving(true);
      const payload = {
        bio: aboutForm.bio,
        skills: parseSkills(aboutForm.skillsText),
        links: parseLinks(profile.linksText),
      };
      await updateAdminProfile(payload);
      setProfile((p) => ({
        ...p,
        bio: aboutForm.bio,
        skillsText: aboutForm.skillsText,
      }));
      setToast({
        open: true,
        type: "success",
        msg: "About updated",
      });
      setAboutOpen(false);
    } catch (e) {
      setToast({
        open: true,
        type: "error",
        msg: e?.message || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const openAddExperience = () => {
    setEditExpId(null);
    setExpForm(emptyExpForm);
    setSyncProfileLocation(false);
    setExpOpen(true);
  };

  const onEditExperience = (item) => {
    setEditExpId(item.id);
    setExpForm({
      org: item.org || item.community_name || "",
      position: item.position || "",
      location: item.location || "",
      start: item.start || item.start_date || "",
      end: item.end || item.end_date || "",
      current: !!(item.current || item.currently_work_here),
      employment_type: item.employment_type || "full_time",
      work_schedule: item.work_schedule || "",
      relationship_to_org: item.relationship_to_org || "",
      career_stage: item.career_stage || "",
      compensation_type: item.compensation_type || "",
      work_arrangement: item.work_arrangement || "",
    });
    setExpOpen(true);
  };

  const onEditEducation = (item) => {
    setEditEduId(item.id);
    setEduForm({
      school: item.school || "",
      degree: item.degree || "",
      field: item.field_of_study || "",
      start: item.start_date || "",
      end: item.end_date || "",
      grade: item.grade || "",
    });
    setEduOpen(true);
  };

  const askDeleteEducation = (id, label = "") => {
    setConfirm({ open: true, type: "edu", id, label });
  };

  const askDeleteExperience = (id, label = "") => {
    setConfirm({ open: true, type: "exp", id, label });
  };

  const closeConfirm = () => {
    setConfirm({ open: false, type: null, id: null, label: "" });
  };

  const doConfirmDelete = async () => {
    const { type, id } = confirm;
    if (!type || !id) return;
    try {
      const url =
        type === "edu"
          ? `${API_ROOT}/auth/me/educations/${id}/`
          : `${API_ROOT}/auth/me/experiences/${id}/`;
      const r = await fetch(url, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");

      setToast({
        open: true,
        type: "success",
        msg: type === "edu" ? "Education deleted" : "Experience deleted",
      });

      closeConfirm();
      await loadExtras();
    } catch (e) {
      setToast({
        open: true,
        type: "error",
        msg: e?.message || "Delete failed",
      });
      closeConfirm();
    }
  };

  // ---------- LOADERS ----------

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminProfile();
      const prof = data?.profile || {};

      const skillsText = Array.isArray(prof.skills)
        ? prof.skills.join(", ")
        : typeof prof.skills === "string"
          ? prof.skills
          : "";

      const linksText = prof.links ? JSON.stringify(prof.links) : "";

      setProfile({
        first_name: data?.first_name || "",
        last_name: data?.last_name || "",
        full_name: prof.full_name || data?.full_name || "",
        bio: prof.bio || "",
        headline: prof.headline || "",
        location: prof.location || "",
        user_image_url: prof.user_image_url || "",
        email: data?.email || "",
        job_title: prof.job_title || "",
        company: prof.company || "",
        skillsText,
        linksText,
      });

    } catch (e) {
      setToast({
        open: true,
        type: "error",
        msg: e?.message || "Load failed",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExtras = React.useCallback(async () => {
    // Experience + Education (same endpoints as ProfilePage)
    try {
      const r = await fetch(`${API_ROOT}/auth/me/profile/`, {
        headers: { accept: "application/json", ...authHeader() },
      });
      if (r.ok) {
        const data = await r.json();
        setEduList(Array.isArray(data.educations) ? data.educations : []);
        setExpList(Array.isArray(data.experiences) ? data.experiences : []);
        return;
      }
    } catch {
      // ignore – we'll try fallback
    }
    try {
      const [e1, e2] = await Promise.all([
        fetch(`${API_ROOT}/auth/me/educations/`, {
          headers: { accept: "application/json", ...authHeader() },
        }),
        fetch(`${API_ROOT}/auth/me/experiences/`, {
          headers: { accept: "application/json", ...authHeader() },
        }),
      ]);
      if (e1.ok) setEduList(await e1.json());
      if (e2.ok) setExpList(await e2.json());
    } catch {
      // silent – these sections can show as empty
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  // ---------- CREATE / UPDATE EXTRAS ----------

  const createEducation = async () => {
    try {
      const url = editEduId
        ? `${API_ROOT}/auth/me/educations/${editEduId}/`
        : `${API_ROOT}/auth/me/educations/`;
      const r = await fetch(url, {
        method: editEduId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          school: eduForm.school,
          degree: eduForm.degree,
          field_of_study: eduForm.field,
          start_date: eduForm.start || null,
          end_date: eduForm.end || null,
          grade: eduForm.grade || "",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(j?.detail || "Failed to save education");

      setToast({
        open: true,
        type: "success",
        msg: editEduId ? "Education updated" : "Education added",
      });
      setEduOpen(false);
      setEditEduId(null);
      setEduForm({
        school: "",
        degree: "",
        field: "",
        start: "",
        end: "",
        grade: "",
      });
      await loadExtras();
    } catch (e) {
      setToast({
        open: true,
        type: "error",
        msg: e?.message || "Save failed",
      });
    }
  };

  const createExperience = async () => {
    try {
      const url = editExpId
        ? `${API_ROOT}/auth/me/experiences/${editExpId}/`
        : `${API_ROOT}/auth/me/experiences/`;

      const r = await fetch(url, {
        method: editExpId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          community_name: expForm.org,
          position: expForm.position,
          location: expForm.location || "",
          start_date: expForm.start || null,
          end_date: expForm.current ? null : expForm.end || null,
          currently_work_here: !!expForm.current,
          description: "",
          employment_type: expForm.employment_type || "full_time",
          work_schedule: expForm.work_schedule || "",
          relationship_to_org: expForm.relationship_to_org || "",
          career_stage: expForm.career_stage || "",
          compensation_type: expForm.compensation_type || "",
          work_arrangement: expForm.work_arrangement || "",
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(j?.detail || "Failed to save experience");

      if (syncProfileLocation && expForm.location) {
        try {
          await updateAdminProfile({ location: expForm.location });
          setProfile((prev) => ({
            ...prev,
            location: expForm.location,
          }));
        } catch (err) {
          console.error("Failed to sync profile location", err);
        }
      }

      setToast({
        open: true,
        type: "success",
        msg: editExpId ? "Experience updated" : "Experience added",
      });

      setExpOpen(false);
      setEditExpId(null);
      setExpForm(emptyExpForm);
      await loadExtras();
    } catch (e) {
      setToast({
        open: true,
        type: "error",
        msg: e?.message || "Save failed",
      });
    }
  };

  // ---------- OWNER AVATAR + BASIC SAVE ----------

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setSaving(true);
    try {
      const res = await uploadAvatar(f);
      setProfile((p) => ({
        ...p,
        user_image_url: res.user_image_url || p.user_image_url,
      }));
      setToast({
        open: true,
        type: "success",
        msg: "Profile image updated",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        msg: err?.message || "Avatar upload failed",
      });
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async () => {
    // NOTE: this only affects the owner view (staff use dialogs)
    setSaving(true);
    try {
      const payload = {
        full_name: profile.full_name?.trim(),
        bio: profile.bio?.trim(),
        headline: profile.headline?.trim(),
        location: profile.location?.trim(),
      };
      await updateAdminProfile(payload);
      await load();
      setToast({
        open: true,
        type: "success",
        msg: "Profile updated",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        msg: err?.message || "Update failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayNameRaw =
    profile.full_name ||
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  const displayName = displayNameRaw || "—";

  const workLine =
    profile.job_title || profile.company
      ? [profile.job_title, profile.company].filter(Boolean).join(" – ")
      : profile.headline || ""

  // ---------- RENDER ----------
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {isOwner ? (
        // OWNER VIEW – keep existing UI
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Admin Settings
          </Typography>

          <Card variant="outlined">
            <CardHeader
              title="Admin profile"
              subheader="Update how you appear as an admin across the community."
              action={
                <Button
                  size="small"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={load}
                  disabled={loading || saving}
                >
                  Refresh
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Avatar column */}
                <Grid item xs={12} sm={4} md={3}>
                  <Stack spacing={2} alignItems="center">
                    <Avatar
                      src={avatarUrl || undefined}
                      sx={{
                        width: 96,
                        height: 96,
                        fontSize: 32,
                        bgcolor: "primary.main",
                      }}
                    >
                      {(profile.full_name || "A")
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>

                    <input
                      ref={fileRef}
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                    />

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<UploadRoundedIcon />}
                      onClick={onPickFile}
                      disabled={loading || saving}
                    >
                      Change photo
                    </Button>
                  </Stack>
                </Grid>

                {/* Text fields */}
                <Grid item xs={12} sm={8} md={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Full name"
                        fullWidth
                        value={profile.full_name}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            full_name: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Headline"
                        placeholder="e.g., Community manager at ABC"
                        fullWidth
                        value={profile.headline}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            headline: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Location"
                        placeholder="City, Country"
                        fullWidth
                        value={profile.location}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            location: e.target.value,
                          }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        label="Bio"
                        placeholder="Tell people a bit about yourself…"
                        fullWidth
                        multiline
                        minRows={4}
                        value={profile.bio}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            bio: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Stack direction="row" justifyContent="flex-end" spacing={2}>
                <Button
                  variant="text"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={load}
                  disabled={loading || saving}
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={onSave}
                  disabled={saving || loading}
                >
                  Save changes
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      ) : (
        // STAFF VIEW – ProfilePage-style cards + edit dialogs
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Profile
          </Typography>

          {loading && <LinearProgress />}

          {!loading && (
            <>
              {/* Top profile strip: avatar + name + work line */}
              <Card
                variant="outlined"
                sx={{
                  mb: 2.5,
                  borderRadius: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: { xs: 2, md: 3 },
                    py: { xs: 1.5, md: 2 },
                  }}
                >
                  <Avatar
                    src={avatarUrl || undefined}
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: "grey.300",
                      fontSize: 24,
                      mr: 2,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700 }}
                    >
                      {displayName}
                    </Typography>

                    {workLine && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.25 }}
                        noWrap
                      >
                        {workLine}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Card>

              <Grid
                container
                spacing={{ xs: 2, md: 2.5 }}
                sx={{
                  // same pattern as HomePage / ProfilePage
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >

                {/* LEFT COLUMN */}
                <Grid item xs={12} lg={6}>
                  {/* About */}
                  <SectionCard
                    title="About"
                    action={
                      <Button size="small" onClick={openAbout}>
                        Edit
                      </Button>
                    }
                  >
                    <Label>Summary:</Label>
                    {profile.bio ? (
                      <Typography variant="body2">{profile.bio}</Typography>
                    ) : (
                      <PlaceholderLine />
                    )}

                    <Label sx={{ mt: 2 }}>Skills:</Label>
                    {parseSkills(profile.skillsText).length ? (
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        {parseSkills(profile.skillsText).map((s, i) => (
                          <Chip key={i} size="small" label={s} />
                        ))}
                      </Box>
                    ) : (
                      <PlaceholderLine />
                    )}
                  </SectionCard>

                  {/* Experience */}
                  <SectionCard
                    sx={{ mt: 2 }}
                    title="Experience"
                    action={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={openAddExperience}
                      >
                        Add more
                      </Button>
                    }
                  >
                    {expList.length ? (
                      <List dense disablePadding>
                        {expList.map((x) => (
                          <ListItem
                            key={x.id}
                            disableGutters
                            sx={{ py: 0.5, pr: { xs: 0, md: 9 } }}
                            secondaryAction={
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => onEditExperience(x)}
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      askDeleteExperience(
                                        x.id,
                                        `${x.community_name} — ${x.position}`
                                      )
                                    }
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            }
                          >
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {x.position} - {x.community_name}
                                </Typography>
                              }
                              secondary={
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {rangeLinkedIn(
                                    x.start_date,
                                    x.end_date,
                                    x.current || x.currently_work_here
                                  )}
                                  {x.location ? ` · ${x.location}` : ""}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            bgcolor: "grey.200",
                            mx: "auto",
                          }}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          This section is empty
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Add an experience to your profile
                        </Typography>
                        <Box>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{ mt: 1.5 }}
                            onClick={openAddExperience}
                          >
                            Create
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </SectionCard>

                  {/* Education */}
                  <SectionCard
                    sx={{ mt: 2 }}
                    title="Education"
                    action={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setEduOpen(true)}
                      >
                        Add more
                      </Button>
                    }
                  >
                    {eduList.length ? (
                      <List dense disablePadding>
                        {eduList.map((e) => (
                          <ListItem
                            key={e.id}
                            disableGutters
                            sx={{ py: 0.5, pr: { xs: 0, md: 9 } }}
                            secondaryAction={
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => onEditEducation(e)}
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      askDeleteEducation(
                                        e.id,
                                        `${e.school} — ${e.degree}`
                                      )
                                    }
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            }
                          >
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {e.degree} - {e.school}
                                </Typography>
                              }
                              secondary={
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {rangeLinkedIn(
                                    e.start_date,
                                    e.end_date,
                                    false
                                  )}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            bgcolor: "grey.200",
                            mx: "auto",
                          }}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          This section is empty
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          Add an education to your profile
                        </Typography>
                        <Box>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            sx={{ mt: 1.5 }}
                            onClick={() => setEduOpen(true)}
                          >
                            Create
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </SectionCard>
                </Grid>

                {/* RIGHT COLUMN */}
                <Grid item xs={12} lg={6}>
                  {/* Contact */}
                  <SectionCard
                    title="Contact"
                    action={
                      <Button size="small" onClick={openContact}>
                        Edit
                      </Button>
                    }
                  >
                    <Label>Social Media Links</Label>
                    <List dense disablePadding>
                      {(() => {
                        const links = parseLinks(profile.linksText);
                        const hasLinkedIn =
                          typeof links.linkedin === "string" &&
                          links.linkedin.trim();
                        return (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 34, mr: 0.5 }}>
                              <LinkedInIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{ wordBreak: "break-word" }}
                                >
                                  {hasLinkedIn || "—"}
                                </Typography>
                              }
                            />
                          </ListItem>
                        );
                      })()}
                    </List>

                    <Label sx={{ mt: 2 }}>Emails</Label>
                    <List dense disablePadding>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 34 }}>
                          <EmailIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              {profile.email || "—"}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                Private field, visible by you and admins only.
                                Editable in your
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                Privacy settings.
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    </List>

                    <Label sx={{ mt: 2, mb: 1 }}>Live Location</Label>
                    {profile.location ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <PlaceIcon fontSize="small" />
                        <Typography variant="body2">
                          {profile.location}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          height: { xs: 120, sm: 160, md: 170 },
                          borderRadius: 1,
                          bgcolor: "grey.100",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    )}
                  </SectionCard>

                  {/* About your work */}
                  <SectionCard
                    sx={{ mt: 2 }}
                    title="About your work"
                    action={<Button size="small">Edit</Button>}
                  >
                    <KV label="Job Title" value={profile.job_title} />
                    <Divider sx={{ my: 0.5 }} />
                    <KV label="Community" value={profile.company} />
                    <Divider sx={{ my: 0.5 }} />
                    <KV label="Sector" value={""} />
                    <Divider sx={{ my: 0.5 }} />
                    <KV label="Industry" value={""} />
                    <Divider sx={{ my: 0.5 }} />
                    <KV label="Number of Employees" value={""} />
                  </SectionCard>
                </Grid>
              </Grid>
            </>
          )}
        </Container>
      )}

      {/* --- Edit Contact dialog --- */}
      <Dialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Contact</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First name"
                fullWidth
                value={contactForm.firstName}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last name"
                fullWidth
                value={contactForm.lastName}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </Grid>
          </Grid>

          <TextField
            label="Job title"
            fullWidth
            sx={{ mb: 2 }}
            value={contactForm.jobTitle}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, jobTitle: e.target.value }))
            }
          />

          <TextField
            label="Email"
            type="email"
            fullWidth
            sx={{ mb: 2 }}
            value={contactForm.email}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, email: e.target.value }))
            }
          />

          <TextField
            label="Location"
            fullWidth
            sx={{ mb: 2 }}
            value={contactForm.location}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, location: e.target.value }))
            }
          />

          <TextField
            label="LinkedIn URL"
            fullWidth
            value={contactForm.linkedinUrl}
            onChange={(e) =>
              setContactForm((f) => ({ ...f, linkedinUrl: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setContactOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveContact}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Education Dialog --- */}
      <Dialog
        open={eduOpen}
        onClose={() => {
          setEduOpen(false);
          setEditEduId(null);
        }}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editEduId ? "Edit education" : "Create education"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2 }}
          >
            *Required fields are marked with an asterisk
          </Typography>

          <TextField
            label="School *"
            value={eduForm.school}
            onChange={(e) =>
              setEduForm((f) => ({ ...f, school: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Degree *"
            value={eduForm.degree}
            onChange={(e) =>
              setEduForm((f) => ({ ...f, degree: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Field of Study *"
            value={eduForm.field}
            onChange={(e) =>
              setEduForm((f) => ({ ...f, field: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={eduForm.start}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, start: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={eduForm.end}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, end: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <TextField
            label="Grade *"
            value={eduForm.grade}
            onChange={(e) =>
              setEduForm((f) => ({ ...f, grade: e.target.value }))
            }
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!!editEduId && (
            <Button
              color="error"
              onClick={() =>
                askDeleteEducation(
                  editEduId,
                  `${eduForm.school} — ${eduForm.degree}`
                )
              }
            >
              Delete
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              setEduOpen(false);
              setEditEduId(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={createEducation}>
            {editEduId ? "Save changes" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Experience Dialog --- */}
      <Dialog
        open={expOpen}
        onClose={() => {
          setExpOpen(false);
          setEditExpId(null);
        }}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editExpId ? "Edit experience" : "Create experience"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2 }}
          >
            *Required fields are marked with an asterisk
          </Typography>

          <TextField
            label="Company name *"
            value={expForm.org}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, org: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Position *"
            value={expForm.position}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, position: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Location *"
            value={expForm.location}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, location: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Relationship to organization (required) */}
          <TextField
            select
            label="Employment type *"
            value={expForm.relationship_to_org}
            onChange={(e) =>
              setExpForm((f) => ({
                ...f,
                relationship_to_org: e.target.value,
              }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="employee">Employee (on payroll)</MenuItem>
            <MenuItem value="independent">
              Independent (self-employed / contractor / freelance)
            </MenuItem>
            <MenuItem value="third_party">
              Third-party (Agency / Consultancy / Temp)
            </MenuItem>
          </TextField>

          {/* Work schedule (optional) */}
          <TextField
            select
            value={expForm.work_schedule}
            onChange={(e) =>
              setExpForm((f) => ({
                ...f,
                work_schedule: e.target.value,
              }))
            }
            fullWidth
            SelectProps={{
              displayEmpty: true,
              renderValue: (v) =>
                v
                  ? ({ full_time: "Full-time", part_time: "Part-time" }[v] ||
                    v)
                  : (
                    <span style={{ color: "rgba(0,0,0,0.6)" }}>
                      Work schedule
                    </span>
                  ),
            }}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="full_time">Full-time</MenuItem>
            <MenuItem value="part_time">Part-time</MenuItem>
          </TextField>

          {/* Career stage + Compensation type */}
          <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
            <TextField
              select
              value={expForm.career_stage}
              onChange={(e) =>
                setExpForm((f) => ({
                  ...f,
                  career_stage: e.target.value,
                }))
              }
              fullWidth
              sx={{ flex: 1 }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) =>
                  v
                    ? ({
                      internship: "Internship",
                      apprenticeship: "Apprenticeship",
                      trainee: "Trainee / Entry program",
                      entry: "Entry level",
                      mid: "Mid level",
                      senior: "Senior level",
                    }[v] || v)
                    : (
                      <span style={{ color: "rgba(0,0,0,0.6)" }}>
                        Career stage
                      </span>
                    ),
              }}
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="internship">Internship</MenuItem>
              <MenuItem value="apprenticeship">Apprenticeship</MenuItem>
              <MenuItem value="trainee">Trainee / Entry program</MenuItem>
              <MenuItem value="entry">Entry level</MenuItem>
              <MenuItem value="mid">Mid level</MenuItem>
              <MenuItem value="senior">Senior level</MenuItem>
            </TextField>

            <TextField
              select
              value={expForm.compensation_type}
              onChange={(e) =>
                setExpForm((f) => ({
                  ...f,
                  compensation_type: e.target.value,
                }))
              }
              fullWidth
              sx={{ flex: 1 }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) =>
                  v
                    ? ({
                      paid: "Paid",
                      stipend: "Stipend",
                      volunteer: "Volunteer / Unpaid",
                    }[v] || v)
                    : (
                      <span style={{ color: "rgba(0,0,0,0.6)" }}>
                        Compensation type
                      </span>
                    ),
              }}
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="stipend">Stipend</MenuItem>
              <MenuItem value="volunteer">Volunteer / Unpaid</MenuItem>
            </TextField>
          </Box>

          {/* Work arrangement (optional) */}
          <TextField
            select
            label="Work arrangement"
            value={expForm.work_arrangement}
            onChange={(e) =>
              setExpForm((f) => ({
                ...f,
                work_arrangement: e.target.value,
              }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="onsite">On-site</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
            <MenuItem value="remote">Remote</MenuItem>
          </TextField>

          {/* Dates */}
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={expForm.start}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, start: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={expForm.end}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, end: e.target.value }))
                }
                fullWidth
                disabled={expForm.current}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Checkbox
                checked={expForm.current}
                onChange={(e) => {
                  const current = e.target.checked;
                  setExpForm((prev) => ({
                    ...prev,
                    current,
                    end: current ? "" : prev.end,
                  }));
                }}
              />
            }
            label="I currently work here"
            sx={{ mb: 1 }}
          />
          {expForm.current && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={syncProfileLocation}
                  onChange={(e) => setSyncProfileLocation(e.target.checked)}
                />
              }
              label="Make this location my profile’s work location"
              sx={{ mb: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!!editExpId && (
            <Button
              color="error"
              onClick={() =>
                askDeleteExperience(
                  editExpId,
                  `${expForm.org} — ${expForm.position}`
                )
              }
            >
              Delete
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              setExpOpen(false);
              setEditExpId(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={createExperience}>
            {editExpId ? "Save changes" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Delete confirmation dialog for edu/exp --- */}
      <Dialog
        open={confirm.open}
        onClose={closeConfirm}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Delete {confirm.type === "edu" ? "education" : "experience"}?
        </DialogTitle>
        <DialogContent>
          {confirm.label ? (
            <DialogContentText sx={{ mb: 1 }}>
              {confirm.label}
            </DialogContentText>
          ) : null}
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeConfirm}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Edit About dialog --- */}
      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit About</DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2 }}
          >
            Update your summary and skills
          </Typography>

          <TextField
            label="Summary"
            value={aboutForm.bio}
            onChange={(e) =>
              setAboutForm((f) => ({ ...f, bio: e.target.value }))
            }
            fullWidth
            multiline
            minRows={4}
            sx={{ mb: 2 }}
            placeholder="Tell people a little about yourself…"
          />

          <TextField
            label="Skills (CSV or JSON array)"
            value={aboutForm.skillsText}
            onChange={(e) =>
              setAboutForm((f) => ({
                ...f,
                skillsText: e.target.value,
              }))
            }
            fullWidth
            placeholder='e.g., M&A, Strategy  OR  ["M&A","Strategy"]'
            helperText="Saved as a list of strings"
          />

          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {parseSkills(aboutForm.skillsText).length ? (
              parseSkills(aboutForm.skillsText).map((s, i) => (
                <Chip key={i} label={s} size="small" />
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                No skills parsed yet
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAboutOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAbout} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Global toast --- */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          variant="filled"
          severity={toast.type === "error" ? "error" : "success"}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
