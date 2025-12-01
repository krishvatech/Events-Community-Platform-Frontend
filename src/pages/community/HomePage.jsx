// src/pages/account/HomePage.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Autocomplete
} from "@mui/material";

// Icons
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailIcon from "@mui/icons-material/Email";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PlaceIcon from "@mui/icons-material/Place";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";

// Countries Library
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

// -----------------------------------------------------------------------------
// API helpers
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// -----------------------------------------------------------------------------
// Data Mappers
// -----------------------------------------------------------------------------
function mapExperience(item) {
  return {
    id: item.id,
    org: item.community_name || item.org || item.company || "",
    position: item.position || "",
    start: item.start_date || "",
    end: item.end_date || "",
    current: !!item.currently_work_here,
    employment_type: item.employment_type || "full_time",
    work_schedule: item.work_schedule || "",
    relationship_to_org: item.relationship_to_org || "",
    career_stage: item.career_stage || "",
    compensation_type: item.compensation_type || "",
    work_arrangement: item.work_arrangement || "",
    location: item.location || "",
    description: item.description || "",
    exit_reason: item.exit_reason || "",
    sector: item.sector || "",
    industry: item.industry || "",
    number_of_employees: item.number_of_employees || "",
  };
}

function mapEducation(item) {
  return {
    id: item.id,
    school: item.school || "",
    degree: item.degree || "",
    field: item.field_of_study || "",
    start: item.start_date || "",
    end: item.end_date || "",
    grade: item.grade || "",
  };
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
isoCountries.registerLocale(enLocale);

const flagEmoji = (code) =>
  code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));

const COUNTRY_OPTIONS = Object.entries(
  isoCountries.getNames("en", { select: "official" })
).map(([code, label]) => ({ code, label, emoji: flagEmoji(code) }));

const getSelectedCountry = (profile) => {
  if (!profile?.location) return null;
  const byCode = COUNTRY_OPTIONS.find((o) => o.code === profile.location);
  if (byCode) return byCode;
  return COUNTRY_OPTIONS.find(
    (o) => (o.label || "").toLowerCase() === String(profile.location).toLowerCase()
  ) || null;
};

function toMonthYear(d) {
  if (!d) return "";
  const [y, m] = String(d).split("-");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
  return mi != null && y ? `${monthNames[mi]} ${y}` : String(d);
}

function dateRange(start, end, current) {
  const s = toMonthYear(start);
  const e = current ? "present" : toMonthYear(end);
  return s || e ? `${s} - ${e || ""}` : "";
}

function parseSkills(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j.map((s) => String(s).trim()).filter(Boolean);
  } catch { }
  return v.split(/,|\n|;/).map((s) => s.trim()).filter(Boolean);
}

// Minimal JWT decoding to get user info before profile loads
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const EMPTY_PROFILE = {
  id: null,
  first_name: "",
  last_name: "",
  email: "",
  job_title: "",
  bio: "",
  location: "",
  avatar: "",
  skills: [],
  links: {},
  experience: [],
  education: [],
};

function loadInitialProfile() {
  try {
    const raw = localStorage.getItem("profile_core");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...EMPTY_PROFILE, ...parsed };
      }
    }
  } catch (e) { console.warn(e); }

  try {
    const token = getToken();
    const payload = decodeJwtPayload(token);
    if (payload) {
      const first_name = payload.first_name || payload.given_name || (payload.name ? String(payload.name).split(" ")[0] : "") || "";
      const last_name = payload.last_name || payload.family_name || (payload.name ? String(payload.name).split(" ").slice(1).join(" ") : "") || "";
      return { ...EMPTY_PROFILE, id: payload.user_id || payload.id || null, first_name, last_name, email: payload.email || "" };
    }
  } catch (e) { console.warn(e); }
  return EMPTY_PROFILE;
}

// -----------------------------------------------------------------------------
// Profile Fetchers
// -----------------------------------------------------------------------------
async function fetchProfileCore() {
  const r = await fetch(`${API_ROOT}/users/me/`, { headers: { ...authHeader(), accept: "application/json" } });
  if (!r.ok) throw new Error("Failed to load /users/me/");
  const data = await r.json();
  const prof = data.profile || {};
  return {
    id: data.id ?? null,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    email: data.email || "",
    job_title: prof.job_title || "",
    bio: prof.bio || "",
    location: prof.location || "",
    sector: prof.sector || "",
    industry: prof.industry || "",
    number_of_employees: prof.number_of_employees || "",
    avatar: prof.user_image_url || prof.user_image || prof.avatar || data.avatar || "",
    skills: Array.isArray(prof.skills) ? prof.skills : parseSkills(prof.skills || ""),
    links: (prof.links && typeof prof.links === "object") ? prof.links : {},
    experience: [],
    education: [],
  };
}

async function fetchProfileExtras() {
  try {
    const r = await fetch(`${API_ROOT}/auth/me/profile/`, { headers: { ...authHeader(), accept: "application/json" } });
    if (r.ok) {
      const d = await r.json();
      return {
        experiences: Array.isArray(d.experiences) ? d.experiences.map(mapExperience) : [],
        educations: Array.isArray(d.educations) ? d.educations.map(mapEducation) : [],
      };
    }
  } catch { }
  // fallback
  const [e1, e2] = await Promise.all([
    fetch(`${API_ROOT}/auth/me/educations/`, { headers: { ...authHeader(), accept: "application/json" } }).catch(() => null),
    fetch(`${API_ROOT}/auth/me/experiences/`, { headers: { ...authHeader(), accept: "application/json" } }).catch(() => null),
  ]);
  const educations = e1?.ok ? (await e1.json()).map(mapEducation) : [];
  const experiences = e2?.ok ? (await e2.json()).map(mapExperience) : [];
  return { experiences, educations };
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function HomePage() {
  const [profile, setProfile] = React.useState(() => loadInitialProfile());
  const [friendCount, setFriendCount] = React.useState(0);

  // UI States
  const [avatarDialogOpen, setAvatarDialogOpen] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState(null);
  const [avatarPreview, setAvatarPreview] = React.useState("");
  const [avatarSaving, setAvatarSaving] = React.useState(false);

  // --- Fetch Profile ---
  const fetchMyProfileFromMe = React.useCallback(async () => {
    try {
      const corePromise = fetchProfileCore();
      const extrasPromise = fetchProfileExtras().catch(() => ({ experiences: [], educations: [] }));

      const core = await corePromise;
      setProfile((prev) => ({ ...prev, ...core }));
      try { localStorage.setItem("profile_core", JSON.stringify(core)); } catch { }

      const extra = await extrasPromise;
      setProfile((prev) => ({ ...prev, experience: extra.experiences, education: extra.educations }));
    } catch (e) {
      console.error("Failed to load profile:", e);
    }
  }, []);

  // --- Fetch Friends ---
  const fetchMyFriends = React.useCallback(async () => {
    const candidates = [
      `${API_ROOT}/friends/`,
      `${API_ROOT}/users/friends/`,
      `${API_ROOT}/users/me/friends/`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        setFriendCount(Number(data?.count ?? rows.length) || 0);
        return;
      } catch { }
    }
    setFriendCount(0);
  }, []);

  React.useEffect(() => {
    fetchMyProfileFromMe();
    fetchMyFriends();
  }, [fetchMyProfileFromMe, fetchMyFriends]);

  const handleUpdateProfile = (updater) => {
    setProfile((prev) => typeof updater === "function" ? updater(prev) : updater);
  };

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User";

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 0 }, py: 2 }}>
      {/* CHANGED: Ensure max width handles full container width properly 
         The parent Box has padding, this inner Box just needs to fill it.
      */}
      <Box sx={{ width: "100%", mx: "auto" }}>

        {/* Header Card */}
        <Card variant="outlined" sx={{ width: "100%", borderRadius: 3, p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ width: "100%" }}>
            <Box sx={{ position: "relative", mr: { sm: 2 }, width: 72, height: 72 }}>
              <Avatar src={profile.avatar || ""} sx={{ width: 72, height: 72 }}>
                {(fullName[0] || "").toUpperCase()}
              </Avatar>
              <Tooltip title="Change photo">
                <IconButton
                  size="small"
                  onClick={() => { setAvatarPreview(profile.avatar || ""); setAvatarDialogOpen(true); }}
                  sx={{ position: "absolute", right: -6, bottom: -6, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", boxShadow: 1 }}
                >
                  <PhotoCameraRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ flex: { xs: "0 0 auto", sm: 1 }, width: { xs: "100%", sm: "auto" } }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{fullName}</Typography>
              {profile.experience && profile.experience.length > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {profile.experience[0].position} – {profile.experience[0].org}
                </Typography>
              ) : (
                profile.job_title && <Typography variant="body2" color="text.secondary">{profile.job_title}</Typography>
              )}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" }, mx: 2 }} />

            <Box sx={{ minWidth: { sm: 160 }, textAlign: { xs: "left", sm: "center" } }}>
              <Typography variant="subtitle2">
                <Box component="span" sx={{ fontWeight: 600 }}>0</Box> Posts&nbsp;|&nbsp;
                <Box component="span" sx={{ fontWeight: 600 }}>{friendCount}</Box> Friends
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Profile Content Grid */}
        <AboutTab profile={profile} onUpdate={handleUpdateProfile} />

      </Box>

      {/* Avatar Dialog */}
      <AvatarUploadDialog
        open={avatarDialogOpen}
        file={avatarFile}
        preview={avatarPreview}
        currentUrl={profile.avatar}
        saving={avatarSaving}
        onPick={(f, url) => { setAvatarFile(f); setAvatarPreview(url); }}
        onClose={() => { setAvatarDialogOpen(false); setAvatarFile(null); setAvatarPreview(""); }}
        onSaved={(newUrl) => {
          if (newUrl) setProfile((p) => ({ ...p, avatar: newUrl }));
          setAvatarDialogOpen(false);
          setAvatarFile(null);
          setAvatarPreview("");
        }}
        setSaving={setAvatarSaving}
      />
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Avatar Upload Dialog
// -----------------------------------------------------------------------------
function AvatarUploadDialog({ open, file, preview, currentUrl, saving, onPick, onClose, onSaved, setSaving }) {
  const inputRef = React.useRef(null);
  const handleChoose = () => inputRef.current?.click();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => onPick(f, ev.target.result);
    reader.readAsDataURL(f);
  };

  async function uploadAvatarApi(theFile) {
    const candidates = [
      { url: `${API_ROOT}/users/me/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_ROOT}/auth/me/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_ROOT}/users/me/`, method: "PATCH", field: "avatar" },
    ];
    for (const c of candidates) {
      try {
        const fd = new FormData();
        fd.append(c.field, theFile, theFile.name);
        const r = await fetch(c.url, { method: c.method, headers: { ...authHeader() }, body: fd });
        if (!r.ok) continue;
        let j = {};
        try { j = await r.json(); } catch { }
        const newUrl = j?.avatar || j?.profile?.avatar || j?.user_image_url || null;
        if (newUrl) return newUrl;
      } catch { }
    }
    // fallback check
    try {
      const me = await fetch(`${API_ROOT}/users/me/`, { headers: { ...authHeader(), accept: "application/json" } });
      const d = await me.json();
      return d?.profile?.avatar || d?.avatar || null;
    } catch { }
    return null;
  }

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    const newUrl = await uploadAvatarApi(file);
    setSaving(false);
    if (!newUrl) { alert("Could not update photo."); return; }
    onSaved(`${newUrl}${newUrl.includes("?") ? "&" : "?"}_=${Date.now()}`);
  };

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Update profile photo</DialogTitle>
      <DialogContent dividers>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <Stack spacing={2} alignItems="center">
          <Avatar src={preview || currentUrl || ""} sx={{ width: 120, height: 120 }} />
          <Button variant="outlined" startIcon={<CloudUploadRoundedIcon />} onClick={handleChoose}>Choose image</Button>
          <Typography variant="caption" color="text.secondary">JPG/PNG, recommended square image</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!file || saving}>{saving ? "Saving…" : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// About Tab Components
// -----------------------------------------------------------------------------
function SkillsChips({ skills }) {
  if (!skills || !skills.length) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {skills.map((s, i) => (<Chip key={i} size="small" label={s} />))}
    </Box>
  );
}

function SectionCard({ title, action, children, sx }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: "100%", ...sx }}>
      <CardHeader title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>} action={action} sx={{ pb: 0.5 }} />
      <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
    </Card>
  );
}

// ---- Sub-components helpers ----
async function saveProfileToMe(payload) {
  const clean = {
    first_name: payload.first_name || "",
    last_name: payload.last_name || "",
    email: payload.email || undefined,
    profile: {
      full_name: payload.profile?.full_name || "",
      bio: payload.profile?.bio || "",
      job_title: payload.profile?.job_title || "",
      location: payload.profile?.location || "",
      skills: Array.isArray(payload.profile?.skills) ? payload.profile.skills : [],
      links: typeof payload.profile?.links === "object" ? payload.profile.links : {},
    },
  };
  const r = await fetch(`${API_ROOT}/users/me/`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(clean) });
  if (!r.ok) throw new Error("Save failed");
}

async function createEducationApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/educations/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ school: payload.school, degree: payload.degree, field_of_study: payload.field, start_date: payload.start || null, end_date: payload.end || null, grade: payload.grade || "" }) });
  if (!r.ok) throw new Error("Failed to add education");
}

async function updateEducationApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/educations/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ school: payload.school, degree: payload.degree, field_of_study: payload.field, start_date: payload.start || null, end_date: payload.end || null, grade: payload.grade || "" }) });
  if (!r.ok) throw new Error("Failed to update education");
}

async function deleteEducationApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/educations/${id}/`, { method: "DELETE", headers: { ...authHeader() } });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete education");
}

async function createExperienceApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/experiences/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ community_name: payload.org, position: payload.position, location: payload.location || "", start_date: payload.start || null, end_date: payload.current ? null : (payload.end || null), currently_work_here: !!payload.current, description: payload.description || "", employment_type: payload.employment_type, work_schedule: payload.work_schedule, relationship_to_org: payload.relationship_to_org, career_stage: payload.career_stage, compensation_type: payload.compensation_type, work_arrangement: payload.work_arrangement, exit_reason: payload.exit_reason, sector: payload.sector, industry: payload.industry, number_of_employees: payload.number_of_employees }) });
  if (!r.ok) throw new Error("Failed to add experience");
}

async function updateExperienceApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/experiences/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ community_name: payload.org, position: payload.position, location: payload.location || "", start_date: payload.start || null, end_date: payload.current ? null : (payload.end || null), currently_work_here: !!payload.current, description: payload.description || "", employment_type: payload.employment_type, work_schedule: payload.work_schedule, relationship_to_org: payload.relationship_to_org, career_stage: payload.career_stage, compensation_type: payload.compensation_type, work_arrangement: payload.work_arrangement, exit_reason: payload.exit_reason, sector: payload.sector, industry: payload.industry, number_of_employees: payload.number_of_employees }) });
  if (!r.ok) throw new Error("Failed to update experience");
}

async function deleteExperienceApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/experiences/${id}/`, { method: "DELETE", headers: { ...authHeader() } });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete experience");
}

const SCHOOL_OPTIONS = ["Harvard University", "Stanford University", "University of Oxford", "University of Cambridge", "MIT", "University of Mumbai", "University of Delhi"];
const FIELD_OF_STUDY_OPTIONS = ["Computer Science", "Business Administration", "Finance", "Marketing", "Economics", "Engineering", "Arts", "Medicine", "Law"];
const CITY_OPTIONS = ["New York", "London", "Paris", "Berlin", "Mumbai", "Delhi", "Bangalore", "San Francisco", "Toronto", "Sydney", "Dubai"];
const SECTOR_OPTIONS = ["Private Sector", "Public Sector", "Non-Profit", "Government", "Education"];
const INDUSTRY_OPTIONS = ["Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Retail", "Media", "Real Estate", "Transportation", "Energy"];
const EMPLOYEE_COUNT_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000-5000", "5000+"];

function AboutTab({ profile, onUpdate }) {
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [aboutMode, setAboutMode] = React.useState("description");
  const [aboutForm, setAboutForm] = React.useState({ bio: "", skillsText: "" });

  const [eduOpen, setEduOpen] = React.useState(false);
  const [editEduId, setEditEduId] = React.useState(null);
  const [eduForm, setEduForm] = React.useState({ school: "", degree: "", field: "", start: "", end: "", grade: "" });
  const [eduDeleteId, setEduDeleteId] = React.useState(null);

  const [expOpen, setExpOpen] = React.useState(false);
  const [editExpId, setEditExpId] = React.useState(null);
  const [expDeleteId, setExpDeleteId] = React.useState(null);
  const [expForm, setExpForm] = React.useState({});
  const [savingExp, setSavingExp] = React.useState(false);
  const [syncProfileLocation, setSyncProfileLocation] = React.useState(false);

  const [workOpen, setWorkOpen] = React.useState(false);
  const [workForm, setWorkForm] = React.useState({});

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({});

  const latestExp = React.useMemo(() => profile.experience?.[0], [profile.experience]);

  // Sync Forms
  React.useEffect(() => {
    const fullLoc = profile.location || "";
    const [city, country] = fullLoc.includes(",") ? fullLoc.split(",").map(s => s.trim()) : ["", fullLoc];
    setContactForm({ first_name: profile.first_name || "", last_name: profile.last_name || "", email: profile.email || "", city, location: country, linkedin: profile.links?.linkedin || "" });
    setAboutForm({ bio: profile.bio || "", skillsText: (profile.skills || []).join(", ") });
    setWorkForm({ sector: latestExp?.sector || "", industry: latestExp?.industry || "", employees: latestExp?.number_of_employees || "" });
  }, [profile, latestExp]);

  const reloadExtras = async () => {
    const extra = await fetchProfileExtras();
    onUpdate?.(prev => ({ ...prev, experience: extra.experiences, education: extra.educations }));
  };

  // Handlers
  const saveAbout = async () => {
    try {
      await saveProfileToMe({ ...profile, profile: { ...profile, bio: aboutForm.bio, skills: parseSkills(aboutForm.skillsText) } });
      onUpdate?.({ ...profile, bio: aboutForm.bio, skills: parseSkills(aboutForm.skillsText) });
      setAboutOpen(false);
    } catch { }
  };

  const saveEducation = async () => {
    const payload = { ...eduForm, start: eduForm.start ? `${eduForm.start}-01-01` : null, end: eduForm.end ? `${eduForm.end}-01-01` : null };
    try {
      if (editEduId) await updateEducationApi(editEduId, payload);
      else await createEducationApi(payload);
      setEduOpen(false); setEditEduId(null); await reloadExtras();
    } catch { }
  };

  const saveExperience = async () => {
    if (savingExp) return;
    setSavingExp(true);
    try {
      const loc = [expForm.city, expForm.location].filter(Boolean).join(", ");
      const existing = editExpId ? (profile.experience.find(e => e.id === editExpId) || {}) : {};
      const payload = { ...expForm, org: expForm.org, position: expForm.position, location: loc, start: expForm.start || null, end: expForm.current ? null : (expForm.end || null), current: expForm.current, sector: existing.sector || "", industry: existing.industry || "", number_of_employees: existing.number_of_employees || "" };

      if (editExpId) await updateExperienceApi(editExpId, payload);
      else await createExperienceApi(payload);

      if (expForm.current && syncProfileLocation && loc) {
        await saveProfileToMe({ ...profile, profile: { ...profile, location: loc } });
        onUpdate?.({ ...profile, location: loc });
      }
      setExpOpen(false); setEditExpId(null); await reloadExtras();
    } catch { }
    setSavingExp(false);
  };

  const saveAboutWork = async () => {
    if (!latestExp) return;
    try {
      await updateExperienceApi(latestExp.id, { ...latestExp, sector: workForm.sector, industry: workForm.industry, number_of_employees: workForm.employees });
      await reloadExtras(); setWorkOpen(false);
    } catch { }
  };

  const saveContact = async () => {
    try {
      const loc = [contactForm.city, contactForm.location].filter(Boolean).join(", ");
      const links = { ...(profile.links || {}), linkedin: contactForm.linkedin };
      const payload = { first_name: contactForm.first_name, last_name: contactForm.last_name, email: contactForm.email, profile: { ...profile, location: loc, links } };
      await saveProfileToMe(payload);
      onUpdate?.({ ...profile, first_name: payload.first_name, last_name: payload.last_name, email: payload.email, location: loc, links });
      setContactOpen(false);
    } catch { }
  };

  const openAddExp = () => {
    setEditExpId(null);
    setExpForm({ org: "", position: "", city: "", location: "", start: "", end: "", current: false, employment_type: "full_time" });
    setExpOpen(true);
  };
  const openEditExp = (id) => {
    const x = profile.experience.find(e => e.id === id);
    if (!x) return;
    const [city, country] = (x.location || "").includes(",") ? x.location.split(",").map(s => s.trim()) : ["", x.location];
    setEditExpId(id);
    setExpForm({ ...x, city, location: country || "" });
    setExpOpen(true);
  };

  return (
    <Box>
      <Grid
        container
        spacing={2}
        sx={{
          // Stack on phones, side-by-side from sm (>= 600px)
          flexWrap: { xs: "wrap", sm: "nowrap" },
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: About / Skills / Experience / Education */}
        <Grid
          item
          xs={12}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,

            flexBasis: {
              xs: "100%",
              sm: "345px",
              md: "540px",
              lg: "540px",
              xl: "540px",
            },
            maxWidth: {
              xs: "100%",
              sm: "345px",
              md: "540px",
              lg: "540px",
              xl: "540px",
            },
            flexShrink: 0,

            // 🔹 Only for 1024px viewport
            "@media (min-width:1024px) and (max-width:1024px)": {
              flexBasis: "330px",
              maxWidth: "330px",
            },
          }}
        >
          {/* About */}
          <SectionCard title="About" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => { setAboutMode("description"); setAboutOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>} sx={{ minHeight: 160, display: "flex", flexDirection: "column" }}>
            <Typography variant="body2">{profile.bio || <Box component="span" sx={{ color: "text.secondary" }}>List your major duties...</Box>}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: "auto", alignSelf: "flex-end", display: "block", pt: 1 }}>{(profile.bio || "").length}/2000</Typography>
          </SectionCard>

          {/* Skills */}
          <SectionCard title="Skills" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => { setAboutMode("skills"); setAboutOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <SkillsChips skills={profile.skills} />
          </SectionCard>

          {/* Experience */}
          <SectionCard title="Experience" action={<Tooltip title="Add"><IconButton size="small" onClick={openAddExp}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              {profile.experience?.map(exp => (
                <ListItem key={exp.id} disableGutters secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <IconButton size="small" onClick={() => setExpDeleteId(exp.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => openEditExp(exp.id)}><EditRoundedIcon fontSize="small" /></IconButton>
                  </Box>
                }>
                  <ListItemText primary={<Typography variant="body2" fontWeight={600}>{exp.position} — {exp.org}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{dateRange(exp.start, exp.end, exp.current)}</Typography>} />
                </ListItem>
              ))}
            </List>
          </SectionCard>

          {/* Education */}
          <SectionCard title="Education" action={<Tooltip title="Add"><IconButton size="small" onClick={() => { setEditEduId(null); setEduForm({}); setEduOpen(true); }}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              {profile.education?.map(edu => (
                <ListItem key={edu.id} disableGutters secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <IconButton size="small" onClick={() => setEduDeleteId(edu.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => { setEditEduId(edu.id); setEduForm({ ...edu, start: (edu.start || "").slice(0, 4), end: (edu.end || "").slice(0, 4) }); setEduOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton>
                  </Box>
                }>
                  <ListItemText primary={<Typography variant="body2" fontWeight={600}>{edu.degree} — {edu.school}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{edu.start?.slice(0, 4)} - {edu.end?.slice(0, 4)}</Typography>} />
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </Grid>

        {/* RIGHT: Contact / About your work */}
        <Grid
          item
          xs={12}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,

            flexBasis: {
              xs: "100%",
              sm: "345px",
              md: "320px",
              lg: "540px",
              xl: "540px",
            },
            maxWidth: {
              xs: "100%",
              sm: "345px",
              md: "320px",
              lg: "540px",
              xl: "540px",
            },
            flexShrink: 0,

            // 🔹 Only for 1024px viewport
            "@media (min-width:1024px) and (max-width:1024px)": {
              flexBasis: "330px",
              maxWidth: "330px",
            },
          }}
        >
          {/* Contact */}
          <SectionCard title="Contact" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => setContactOpen(true)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Typography variant="subtitle2" color="text.secondary">LinkedIn</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}><LinkedInIcon fontSize="small" /><Typography variant="body2">{profile.links?.linkedin || "—"}</Typography></Box>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}><EmailIcon fontSize="small" /><Typography variant="body2">{profile.email || "—"}</Typography></Box>
            <Typography variant="subtitle2" color="text.secondary">Location</Typography>
            <Box sx={{ display: "flex", gap: 1 }}><PlaceIcon fontSize="small" /><Typography variant="body2">{profile.location || "—"}</Typography></Box>
          </SectionCard>

          {/* About Work */}
          <SectionCard title="About your work" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => setWorkOpen(true)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Box sx={{ display: "flex", py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>Job Title</Typography>
              <Typography variant="body2">{latestExp?.position || "—"}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>Company</Typography>
              <Typography variant="body2">{latestExp?.org || "—"}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>Sector</Typography>
              <Typography variant="body2">{latestExp?.sector || "—"}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>Industry</Typography>
              <Typography variant="body2">{latestExp?.industry || "—"}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: "flex", py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>Number of Employees</Typography>
              <Typography variant="body2">{latestExp?.number_of_employees || "—"}</Typography>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* DIALOGS */}
      {/* About */}
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{aboutMode === "skills" ? "Edit skills" : "Edit description"}</DialogTitle>
        <DialogContent>
          {aboutMode === "description" ? (
            <TextField multiline minRows={4} fullWidth value={aboutForm.bio} onChange={(e) => setAboutForm(f => ({ ...f, bio: e.target.value }))} />
          ) : (
            <TextField fullWidth label="Skills (CSV)" value={aboutForm.skillsText} onChange={(e) => setAboutForm(f => ({ ...f, skillsText: e.target.value }))} />
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAboutOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveAbout}>Save</Button></DialogActions>
      </Dialog>

      {/* Work */}
      <Dialog open={workOpen} onClose={() => setWorkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Work Details</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2, bgcolor: "action.hover", mb: 2, borderRadius: 1 }}><Typography variant="body2">Updating details for: <b>{latestExp?.org || "No Experience Found"}</b></Typography></Box>
          <TextField select label="Sector" fullWidth value={workForm.sector || ""} onChange={(e) => setWorkForm({ ...workForm, sector: e.target.value })} sx={{ mb: 2 }} disabled={!latestExp}>
            {SECTOR_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField select label="Industry" fullWidth value={workForm.industry || ""} onChange={(e) => setWorkForm({ ...workForm, industry: e.target.value })} sx={{ mb: 2 }} disabled={!latestExp}>
            {INDUSTRY_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField select label="Employees" fullWidth value={workForm.employees || ""} onChange={(e) => setWorkForm({ ...workForm, employees: e.target.value })} disabled={!latestExp}>
            {EMPLOYEE_COUNT_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions><Button onClick={() => setWorkOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveAboutWork} disabled={!latestExp}>Save</Button></DialogActions>
      </Dialog>

      {/* Contact */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", gap: 2 }}><TextField label="First" fullWidth value={contactForm.first_name || ""} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })} /><TextField label="Last" fullWidth value={contactForm.last_name || ""} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })} /></Box>
            <TextField label="Email" fullWidth value={contactForm.email || ""} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
            <Autocomplete options={CITY_OPTIONS} value={contactForm.city || null} onChange={(_, v) => setContactForm({ ...contactForm, city: v || "" })} renderInput={(p) => <TextField {...p} label="City" />} />
            <Autocomplete options={COUNTRY_OPTIONS} value={getSelectedCountry({ location: contactForm.location })} getOptionLabel={(o) => o?.label || ""} onChange={(_, v) => setContactForm({ ...contactForm, location: v?.label || "" })} renderInput={(p) => <TextField {...p} label="Country" />} />
            <TextField label="LinkedIn" fullWidth value={contactForm.linkedin || ""} onChange={(e) => setContactForm({ ...contactForm, linkedin: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setContactOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveContact}>Save</Button></DialogActions>
      </Dialog>

      {/* Education & Experience Modals simplified for brevity but functional */}
      <Dialog open={eduOpen} onClose={() => setEduOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editEduId ? "Edit" : "Add"} Education</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete freeSolo options={SCHOOL_OPTIONS} value={eduForm.school} onChange={(_, v) => setEduForm({ ...eduForm, school: v || "" })} renderInput={(p) => <TextField {...p} label="School" />} />
            <TextField label="Degree" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} />
            <Autocomplete freeSolo options={FIELD_OF_STUDY_OPTIONS} value={eduForm.field} onChange={(_, v) => setEduForm({ ...eduForm, field: v || "" })} renderInput={(p) => <TextField {...p} label="Field" />} />
            <Box sx={{ display: "flex", gap: 2 }}><TextField label="Start Year" type="number" value={eduForm.start} onChange={(e) => setEduForm({ ...eduForm, start: e.target.value })} /><TextField label="End Year" type="number" value={eduForm.end} onChange={(e) => setEduForm({ ...eduForm, end: e.target.value })} /></Box>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setEduOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveEducation}>Save</Button></DialogActions>
      </Dialog>

      <Dialog open={expOpen} onClose={() => setExpOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editExpId ? "Edit" : "Add"} Experience</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Company" value={expForm.org || ""} onChange={(e) => setExpForm({ ...expForm, org: e.target.value })} />
            <TextField label="Position" value={expForm.position || ""} onChange={(e) => setExpForm({ ...expForm, position: e.target.value })} />
            <Autocomplete options={CITY_OPTIONS} value={expForm.city || null} onChange={(_, v) => setExpForm({ ...expForm, city: v || "" })} renderInput={(p) => <TextField {...p} label="City" />} />
            <Autocomplete options={COUNTRY_OPTIONS} value={getSelectedCountry({ location: expForm.location })} getOptionLabel={(o) => o?.label || ""} onChange={(_, v) => setExpForm({ ...expForm, location: v?.label || "" })} renderInput={(p) => <TextField {...p} label="Country" />} />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField label="Start" type="date" fullWidth InputLabelProps={{ shrink: true }} value={expForm.start || ""} onChange={(e) => setExpForm({ ...expForm, start: e.target.value })} />
              <TextField label="End" type="date" fullWidth InputLabelProps={{ shrink: true }} disabled={expForm.current} value={expForm.end || ""} onChange={(e) => setExpForm({ ...expForm, end: e.target.value })} />
            </Box>
            <FormControlLabel control={<Checkbox checked={!!expForm.current} onChange={(e) => setExpForm({ ...expForm, current: e.target.checked })} />} label="Currently work here" />
            {expForm.current && <FormControlLabel control={<Checkbox checked={syncProfileLocation} onChange={(e) => setSyncProfileLocation(e.target.checked)} />} label="Update profile location to match" />}
            <TextField multiline minRows={3} label="Description" value={expForm.description || ""} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setExpOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveExperience}>Save</Button></DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <Dialog open={!!eduDeleteId} onClose={() => setEduDeleteId(null)}>
        <DialogTitle>Delete Education?</DialogTitle>
        <DialogActions><Button onClick={() => setEduDeleteId(null)}>Cancel</Button><Button color="error" onClick={async () => { await deleteEducationApi(eduDeleteId); await reloadExtras(); setEduDeleteId(null); }}>Delete</Button></DialogActions>
      </Dialog>
      <Dialog open={!!expDeleteId} onClose={() => setExpDeleteId(null)}>
        <DialogTitle>Delete Experience?</DialogTitle>
        <DialogActions><Button onClick={() => setExpDeleteId(null)}>Cancel</Button><Button color="error" onClick={async () => { await deleteExperienceApi(expDeleteId); await reloadExtras(); setExpDeleteId(null); }}>Delete</Button></DialogActions>
      </Dialog>
    </Box>
  );
}