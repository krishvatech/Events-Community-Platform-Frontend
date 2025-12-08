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
  Autocomplete,
  ListItemAvatar,
  CircularProgress,
  Snackbar,
  Alert
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
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { startKYC, submitNameChangeRequest } from "../../utils/api"
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
const CEFR_OPTIONS = [
  { value: "A1", label: "Beginner (A1)", desc: "Understands and produces basic phrases and introduces themselves." },
  { value: "A2", label: "Elementary (A2)", desc: "Simple communication and frequently used expressions." },
  { value: "B1", label: "Limited Working (B1)", desc: "Handles routine tasks and produces simple text in familiar matters." },
  { value: "B2", label: "Professional Working (B2)", desc: "Effective operational use; comfortable handling most professional topics." },
  { value: "C1", label: "Full Professional (C1)", desc: "Fluency on complex, professional, and academic subjects." },
  { value: "C2", label: "Native/Bilingual (C2)", desc: "Mastery level; effortlessly expresses and comprehends virtually any topic." },
];

const ACQUISITION_OPTIONS = [
  { value: "mother_tongue", label: "Mother Tongue" },
  { value: "formal_education", label: "Formal Education" },
  { value: "professional_immersion", label: "Professional Immersion" },
  { value: "self_taught", label: "Self-Taught" },
];

function mapExperience(item) {
  return {
    id: item.id,
    org: item.community_name || item.org || item.company || "",
    logo: item.logo || "",
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
    documents: item.documents || [],
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

function parseLinks(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return {};
  try {
    const j = JSON.parse(v);
    if (j && typeof j === "object" && !Array.isArray(j)) return j;
  } catch { }
  const out = {};
  v.split(/\n|,|;/).forEach((part) => {
    const [k, ...rest] = part.split("=");
    const key = (k || "").trim();
    const val = rest.join("=").trim();
    if (key && val) out[key] = val;
  });
  return out;
}

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

async function uploadEducationDocApi(educationId, file) {
  const fd = new FormData();
  fd.append("education", educationId);
  fd.append("file", file);

  // CHANGED: /users/ -> /auth/
  const r = await fetch(`${API_ROOT}/auth/me/education-documents/`, {
    method: "POST",
    headers: { ...authHeader() },
    body: fd
  });
  if (!r.ok) throw new Error("Failed to upload document");
  return await r.json();
}

async function deleteEducationDocApi(docId) {
  // CHANGED: /users/ -> /auth/
  const r = await fetch(`${API_ROOT}/auth/me/education-documents/${docId}/`, {
    method: "DELETE",
    headers: { ...authHeader() }
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete document");
}

const EMPTY_PROFILE = {
  id: null,
  first_name: "",
  middle_name: "",
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
  kyc_status: "not_started",
  legal_name_locked: false,
  kyc_decline_reason: "",
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
  const r = await fetch(`${API_ROOT}/users/me/`, {
    headers: { ...authHeader(), accept: "application/json" },
  });
  if (!r.ok) throw new Error("Failed to load /users/me/");
  const data = await r.json();
  const prof = data.profile || {};

  const rawStatus = (prof.kyc_status || "not_started").toLowerCase();

  return {
    id: data.id ?? null,
    first_name: data.first_name || "",
    middle_name: prof.middle_name || "",
    last_name: data.last_name || "",
    email: data.email || "",
    job_title: prof.job_title || "",
    bio: prof.bio || "",
    location: prof.location || "",
    avatar:
      prof.user_image_url ||
      prof.user_image ||
      prof.avatar ||
      data.avatar ||
      "",
    skills: Array.isArray(prof.skills)
      ? prof.skills
      : parseSkills(prof.skills || ""),
    links:
      prof.links && typeof prof.links === "object"
        ? prof.links
        : {},

    // ✅ KYC fields from backend
    kyc_status: rawStatus,                    // "approved" / "declined" / "pending" / "review" / "not_started"
    legal_name_locked: !!prof.legal_name_locked,
    kyc_decline_reason: prof.kyc_decline_reason || "",

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
// Company Autocomplete Component
// -----------------------------------------------------------------------------
function CompanyAutocomplete({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    let active = true;

    if (inputValue === "") {
      setOptions(value ? [value] : []);
      return undefined;
    }

    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${inputValue}`);
        const data = await response.json();
        if (active) setOptions(data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = setTimeout(fetchCompanies, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [inputValue, value]);

  return (
    <Autocomplete
      freeSolo
      id="company-autocomplete"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.name === value.name}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option.name;
      }}
      options={options}
      loading={loading}
      value={value}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          onChange({ name: newValue, logo: null, domain: null });
        } else if (newValue && newValue.inputValue) {
          onChange({ name: newValue.inputValue, logo: null, domain: null });
        } else {
          onChange(newValue);
        }
      }}
      onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
      renderOption={(props, option) => (
        <ListItem {...props} key={option.domain || option.name}>
          <ListItemAvatar>
            <Avatar src={option.logo} variant="rounded" sx={{ width: 24, height: 24 }}>
              <BusinessRoundedIcon fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={option.name}
            secondary={option.domain}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Company Name"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
}

// -----------------------------------------------------------------------------
// Name Change Request Dialog (Updated with showToast)
// -----------------------------------------------------------------------------
function NameChangeDialog({ open, onClose, currentNames, showToast }) {
  const [form, setForm] = React.useState({
    new_first_name: "",
    new_middle_name: "",
    new_last_name: "",
    reason: "",
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({
        new_first_name: currentNames.first || "",
        new_middle_name: currentNames.middle || "",
        new_last_name: currentNames.last || "",
        reason: "",
      });
    }
  }, [open, currentNames]);

  const handleSubmit = async () => {
    if (!form.new_first_name || !form.new_last_name || !form.reason) {
      showToast("error", "First Name, Last Name, and Reason are required.");
      return;
    }
    setLoading(true);
    try {
      // Call API
      const data = await submitNameChangeRequest(form);

      showToast("success", "Request submitted.");

      // Check if backend returned a KYC URL (Phase B2 of flow)
      if (data.kyc_url) {
        showToast("success", "Redirecting to verification...");
        setTimeout(() => {
          window.location.href = data.kyc_url;
        }, 1500);
      } else {
        onClose();
      }
    } catch (e) {
      showToast("error", `Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Request Name Change</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Legal names cannot be changed directly. Please submit a request with your valid reason (e.g., Marriage, Spelling Correction).
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="First Name" fullWidth required value={form.new_first_name} onChange={(e) => setForm({ ...form, new_first_name: e.target.value })} />
            <TextField label="Middle Name" fullWidth value={form.new_middle_name} onChange={(e) => setForm({ ...form, new_middle_name: e.target.value })} />
            <TextField label="Last Name" fullWidth required value={form.new_last_name} onChange={(e) => setForm({ ...form, new_last_name: e.target.value })} />
          </Box>
          <TextField label="Reason for Change" fullWidth multiline minRows={2} required placeholder="e.g. Marriage, Legal change, Typos..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit Request"}</Button>
      </DialogActions>
    </Dialog>
  );
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

  // Dialog States
  const [nameChangeOpen, setNameChangeOpen] = React.useState(false);
  const [basicInfoOpen, setBasicInfoOpen] = React.useState(false); // Header Identity Dialog

  // Toast State
  const [snack, setSnack] = React.useState({ open: false, msg: "", sev: "success" });

  const showNotification = (type, msg) => {
    setSnack({ open: true, sev: type, msg });
  };

  React.useEffect(() => {
    if (
      profile?.kyc_status === "declined" &&
      profile?.kyc_decline_reason === "name_mismatch"
    ) {
      showNotification(
        "error",
        "Your KYC was rejected because your sign-up name does not match your ID. Please submit a Name Change Request using your document name."
      );

      // Optionally auto-open Name Change dialog
      setNameChangeOpen(true);
    }
  }, [profile?.kyc_status, profile?.kyc_decline_reason]); // runs when KYC status/reason updates

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

  // --- Languages State ---
  const [langList, setLangList] = React.useState([]);
  const [langOpen, setLangOpen] = React.useState(false);
  const [langSaving, setLangSaving] = React.useState(false);
  const [editLangId, setEditLangId] = React.useState(null);
  const [langCertFiles, setLangCertFiles] = React.useState([]);
  const [existingCertificates, setExistingCertificates] = React.useState([]);

  const EMPTY_LANG_FORM = {
    iso_obj: null,
    primary_dialect: "",
    proficiency_cefr: "B2",
    acquisition_context: "",
    notes: ""
  };
  const [langForm, setLangForm] = React.useState(EMPTY_LANG_FORM);

  // Load Languages
  const loadLanguages = React.useCallback(async () => {
    try {
      const r = await fetch(`${API_ROOT}/auth/me/languages/`, { headers: authHeader() });
      if (r.ok) {
        const data = await r.json();
        // Handle pagination vs array
        const list = Array.isArray(data) ? data : (data.results || []);
        setLangList(list);
      }
    } catch (e) { console.error(e); }
  }, []);

  React.useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  async function saveLanguage() {
    if (!langForm.iso_obj) {
      showNotification("error", "Please select a language");
      return;
    }
    setLangSaving(true);
    try {
      const payload = {
        iso_639_1: langForm.iso_obj.iso_639_1,
        english_name: langForm.iso_obj.label || langForm.iso_obj.english_name,
        primary_dialect: langForm.primary_dialect,
        proficiency_cefr: langForm.proficiency_cefr,
        acquisition_context: langForm.acquisition_context,
      };

      const url = editLangId
        ? `${API_ROOT}/auth/me/languages/${editLangId}/`
        : `${API_ROOT}/auth/me/languages/`;

      const method = editLangId ? "PATCH" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error("Failed to save language");

      const savedLang = await r.json();

      // Upload Certificates
      if (langCertFiles.length > 0) {
        const langId = editLangId || savedLang.id;
        for (const file of langCertFiles) {
          const fd = new FormData();
          fd.append("user_language", langId);
          fd.append("file", file);
          await fetch(`${API_ROOT}/auth/me/language-certificates/`, {
            method: "POST",
            headers: authHeader(),
            body: fd
          });
        }
      }

      showNotification("success", "Language saved successfully");
      setLangOpen(false);
      loadLanguages();
    } catch (e) {
      showNotification("error", e.message);
    } finally {
      setLangSaving(false);
    }
  }

  async function deleteLanguage(id) {
    if (!window.confirm("Are you sure you want to delete this language?")) return;
    try {
      const r = await fetch(`${API_ROOT}/auth/me/languages/${id}/`, {
        method: "DELETE",
        headers: authHeader()
      });
      if (r.ok) {
        showNotification("success", "Language deleted");
        loadLanguages();
      }
    } catch (e) { showNotification("error", "Delete failed"); }
  }

  async function handleDeleteCertificate(certId) {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    try {
      const r = await fetch(`${API_ROOT}/auth/me/language-certificates/${certId}/`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (r.ok) {
        showNotification("success", "Certificate deleted");
        setExistingCertificates((prev) => prev.filter((c) => c.id !== certId));
        loadLanguages();
      } else {
        throw new Error("Failed to delete certificate");
      }
    } catch (e) {
      showNotification("error", e.message);
    }
  }

  function openAddLanguage() {
    setEditLangId(null);
    setLangForm(EMPTY_LANG_FORM);
    setLangCertFiles([]);
    setExistingCertificates([]);
    setLangOpen(true);
  }

  function onEditLanguage(item) {
    setEditLangId(item.id);
    setLangForm({
      iso_obj: {
        iso_639_1: item.language.iso_639_1,
        label: item.language.english_name
      },
      primary_dialect: item.primary_dialect || "",
      proficiency_cefr: item.proficiency_cefr || "B2",
      acquisition_context: item.acquisition_context || "",
      notes: item.notes || ""
    });
    setLangCertFiles([]);
    setExistingCertificates(item.certificates || []);
    setLangOpen(true);
  }

  // --- Fetch Friends ---
  const fetchMyFriends = React.useCallback(async () => {
    const candidates = [`${API_ROOT}/friends/`, `${API_ROOT}/users/friends/`, `${API_ROOT}/users/me/friends/`];
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

  const handleStartKYC = async () => {
    try {
      showNotification("info", "Initiating verification...");
      const data = await startKYC();

      if (data.url) {
        // Redirect user to Didit
        window.location.href = data.url;
      } else {
        showNotification("error", "Could not start verification. Please try again.");
      }
    } catch (error) {
      showNotification("error", error.message);
    }
  };

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User";

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 0 }, py: 2 }}>
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
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{fullName}</Typography>

                {/* Verified Badge */}
                {profile.kyc_status === 'approved' && (
                  <Tooltip title="Identity Verified">
                    <VerifiedRoundedIcon color="primary" sx={{ fontSize: 20 }} />
                  </Tooltip>
                )}
              </Stack>
              {profile.experience && profile.experience.length > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {profile.experience[0].position} – {profile.experience[0].org}
                </Typography>
              ) : (
                profile.job_title && <Typography variant="body2" color="text.secondary">{profile.job_title}</Typography>
              )}
            </Box>

            {/* --- EDIT BUTTON (Identity) moved to end, before divider --- */}
            <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
              <Tooltip title="Identity Details">
                <IconButton size="small" onClick={() => setBasicInfoOpen(true)}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", sm: "block" }, mx: 2 }}
            />

            <Box sx={{ minWidth: { sm: 160 }, textAlign: { xs: "left", sm: "center" } }}>
              <Typography variant="subtitle2">
                <Box component="span" sx={{ fontWeight: 600 }}>0</Box> Posts&nbsp;|&nbsp;
                <Box component="span" sx={{ fontWeight: 600 }}>{friendCount}</Box> Contacts
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Profile Content Grid */}
        <AboutTab
          profile={profile}
          onUpdate={handleUpdateProfile}
          showToast={showNotification}

          // ✅ Languages
          langList={langList}
          langOpen={langOpen}
          langSaving={langSaving}
          editLangId={editLangId}
          langCertFiles={langCertFiles}
          existingCertificates={existingCertificates}
          langForm={langForm}

          setLangOpen={setLangOpen}
          setLangForm={setLangForm}
          setLangCertFiles={setLangCertFiles}
          setExistingCertificates={setExistingCertificates}

          openAddLanguage={openAddLanguage}
          onEditLanguage={onEditLanguage}
          saveLanguage={saveLanguage}
          deleteLanguage={deleteLanguage}
          handleDeleteCertificate={handleDeleteCertificate}
        />

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
          showNotification("success", "Profile photo updated successfully.");
        }}
        setSaving={setAvatarSaving}
      />

      {/* NEW: Identity Details Dialog */}
      <BasicInfoDialog
        open={basicInfoOpen}
        onClose={() => setBasicInfoOpen(false)}
        profile={profile}
        onRequestNameChange={() => {
          setBasicInfoOpen(false);
          setNameChangeOpen(true);
        }}
        onStartKYC={handleStartKYC}
      />

      {/* Name Change Request Dialog */}
      <NameChangeDialog
        open={nameChangeOpen}
        onClose={() => setNameChangeOpen(false)}
        currentNames={{
          first: profile.first_name,
          middle: profile.middle_name || "",
          last: profile.last_name
        }}
        showToast={showNotification}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.sev} variant="filled" sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
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
// NEW COMPONENT: Identity Dialog (Header Trigger) - NO JOB TITLE
// -----------------------------------------------------------------------------
function BasicInfoDialog({ open, onClose, profile, onRequestNameChange, onStartKYC }) {
  // Determine status
  const kycStatus = profile?.kyc_status || "not_started";
  const isVerified = kycStatus === "approved";
  const isPending = kycStatus === "pending" || kycStatus === "review";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Identity Details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              {profile?.legal_name_locked
                ? "Legal names are verified and locked."
                : "Verify your identity to lock your legal name."}
            </Typography>

            {/* Status Chip */}
            <Chip
              label={kycStatus.replace("_", " ").toUpperCase()}
              color={isVerified ? "success" : isPending ? "warning" : "default"}
              size="small"
            />
          </Box>

          {/* LOCKED NAMES */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="First Name" fullWidth disabled value={profile?.first_name || ""} />
            <TextField label="Last Name" fullWidth disabled value={profile?.last_name || ""} />
          </Box>

          {/* ACTIONS */}
          <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
            {/* Show "Verify Identity" if not verified yet */}
            {!isVerified && !isPending && (
              <Button
                variant="contained"
                color="primary"
                onClick={onStartKYC}
              >
                Verify Identity
              </Button>
            )}

            {/* Show "Request Name Change" ONLY if verified/locked */}
            {isVerified && (
              <Button
                variant="outlined"
                startIcon={<HistoryEduRoundedIcon />}
                onClick={onRequestNameChange}
              >
                Request Name Change
              </Button>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
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
  const r = await fetch(`${API_ROOT}/auth/me/educations/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({
      school: payload.school,
      degree: payload.degree,
      field_of_study: payload.field,
      start_date: payload.start || null,
      end_date: payload.end || null,
      grade: payload.grade || "",
    }),
  });

  if (!r.ok) throw new Error("Failed to add education");
  // IMPORTANT: return created education so we can get its id
  return await r.json();
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
  const r = await fetch(`${API_ROOT}/auth/me/experiences/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ community_name: payload.org, position: payload.position, location: payload.location || "", start_date: payload.start || null, end_date: payload.end || null, currently_work_here: !!payload.current, description: payload.description || "", employment_type: payload.employment_type, work_schedule: payload.work_schedule, relationship_to_org: payload.relationship_to_org, career_stage: payload.career_stage, compensation_type: payload.compensation_type, work_arrangement: payload.work_arrangement, exit_reason: payload.exit_reason, sector: payload.sector, industry: payload.industry, number_of_employees: payload.number_of_employees }) });
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

function IsoLanguageAutocomplete({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    let active = true;
    if (inputValue.length < 2) {
      setOptions(value ? [value] : []);
      return undefined;
    }

    const fetchLanguages = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_ROOT}/auth/languages/search/?q=${inputValue}`, {
          headers: authHeader()
        });
        if (response.ok) {
          const data = await response.json();
          if (active) setOptions(data.results || []);
        }
      } catch (err) {
        console.error("Language search failed", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(fetchLanguages, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [inputValue, value]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, val) => option.iso_639_1 === val.iso_639_1}
      getOptionLabel={(option) => option.label || option.english_name || ""}
      options={options}
      loading={loading}
      value={value}
      onChange={(event, newValue) => onChange(newValue)}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Language *"
          placeholder="Type to search (e.g. English, Hindi)"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

function UniversityAutocomplete({ value, onChange, label = "University" }) {
  const [inputValue, setInputValue] = React.useState(value || "");
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // sync external value → input
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  React.useEffect(() => {
    const query = (inputValue || "").trim();

    if (!query || query.length < 2) {
      setOptions([]);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const fetchOrgs = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.ror.org/v2/organizations?query=${encodeURIComponent(
            query
          )}&filter=types:education`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          console.error("ROR API error", res.status);
          return;
        }

        const data = await res.json();
        if (!active) return;

        const items = (data.items || [])
          .map((org) => {
            const primaryName =
              org.names?.find((n) => n.types?.includes("ror_display"))?.value ||
              org.names?.[0]?.value ||
              "";

            return { id: org.id, name: primaryName };
          })
          .filter((o) => o.name);

        setOptions(items);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("ROR fetch failed", err);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const timeout = setTimeout(fetchOrgs, 400);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [inputValue]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      filterOptions={(x) => x} // keep server results as-is
      value={value || ""}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option?.name || ""
      }
      onChange={(_, newValue) => {
        if (typeof newValue === "string") {
          onChange?.(newValue);
        } else if (newValue && typeof newValue === "object") {
          onChange?.(newValue.name || "");
        } else {
          onChange?.("");
        }
      }}
      inputValue={inputValue}
      onInputChange={(_, newInputValue, reason) => {
        if (reason === "input") {
          setInputValue(newInputValue);
          onChange?.(newInputValue);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required
          fullWidth
          margin="normal"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}



function AboutTab({
  profile,
  onUpdate,
  showToast,

  // ✅ Languages props
  langList,
  langOpen,
  langSaving,
  editLangId,
  langCertFiles,
  existingCertificates,
  langForm,

  setLangOpen,
  setLangForm,
  setLangCertFiles,
  setExistingCertificates,

  openAddLanguage,
  onEditLanguage,
  saveLanguage,
  deleteLanguage,
  handleDeleteCertificate,
}) {

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

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({});

  const [savingAbout, setSavingAbout] = React.useState(false);
  const [savingEdu, setSavingEdu] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [deletingEdu, setDeletingEdu] = React.useState(false);
  const [deletingExp, setDeletingExp] = React.useState(false);
  const [eduFiles, setEduFiles] = React.useState([]);
  const latestExp = React.useMemo(() => profile.experience?.[0], [profile.experience]);

  // For modern delete confirmation when removing an education document
  const [deleteDocDialog, setDeleteDocDialog] = React.useState({
    open: false,
    doc: null,
  });

  const handleAskDeleteDoc = (doc) => {
    setDeleteDocDialog({ open: true, doc });
  };

  const handleCloseDeleteDoc = () => {
    setDeleteDocDialog({ open: false, doc: null });
  };

  const handleConfirmDeleteDoc = async () => {
    const doc = deleteDocDialog.doc;
    if (!doc) return;

    // you already have deletingEdu state
    setDeletingEdu(true);
    try {
      await deleteEducationDocApi(doc.id);

      // Remove from local state
      setEduForm((prev) => ({
        ...prev,
        documents: (prev.documents || []).filter((d) => d.id !== doc.id),
      }));

      showToast?.("success", "File deleted");
      await reloadExtras(); // refresh list in background
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to delete file.");
    } finally {
      setDeletingEdu(false);
      setDeleteDocDialog({ open: false, doc: null });
    }
  };

  React.useEffect(() => {
    const fullLoc = profile.location || "";
    const [city, country] = fullLoc.includes(",") ? fullLoc.split(",").map(s => s.trim()) : ["", fullLoc];
    setContactForm({ email: profile.email || "", city, location: country, linkedin: profile.links?.linkedin || "" });
    setAboutForm({ bio: profile.bio || "", skillsText: (profile.skills || []).join(", ") });
  }, [profile, latestExp]);

  const reloadExtras = async () => {
    const extra = await fetchProfileExtras();
    onUpdate?.(prev => ({ ...prev, experience: extra.experiences, education: extra.educations }));
  };

  const saveAbout = async () => {
    if (savingAbout) return;
    setSavingAbout(true);
    try {
      await saveProfileToMe({
        ...profile,
        profile: {
          ...profile,
          bio: aboutForm.bio,
          skills: parseSkills(aboutForm.skillsText),
        },
      });
      onUpdate?.({
        ...profile,
        bio: aboutForm.bio,
        skills: parseSkills(aboutForm.skillsText),
      });
      showToast?.("success", "About section updated.");
      setAboutOpen(false);
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save about section.");
    } finally {
      setSavingAbout(false);
    }
  };

  const saveEducation = async () => {
    if (savingEdu) return;
    setSavingEdu(true);

    const payload = {
      ...eduForm,
      start: eduForm.start ? `${eduForm.start}-01-01` : null,
      end: eduForm.end ? `${eduForm.end}-01-01` : null,
    };

    try {
      let activeId = editEduId;

      if (activeId) {
        await updateEducationApi(activeId, payload);
      } else {
        const newEdu = await createEducationApi(payload);  // uses start_date/end_date
        activeId = newEdu.id;
      }

      // 2. Upload new files if any
      if (eduFiles.length > 0 && activeId) {
        for (const file of eduFiles) {
          await uploadEducationDocApi(activeId, file);
        }
      }

      showToast?.("success", editEduId ? "Education updated." : "Education added.");
      setEduOpen(false);
      setEditEduId(null);
      setEduFiles([]); // Clear files
      await reloadExtras();
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save education.");
    } finally {
      setSavingEdu(false);
    }
  };


  const saveExperience = async () => {
    if (savingExp) return;
    setSavingExp(true);

    try {
      const loc = [expForm.city, expForm.location].filter(Boolean).join(", ");
      const payload = {
        ...expForm,
        org: expForm.org,
        position: expForm.position,
        location: loc,
        start: expForm.start || null,
        end: expForm.current ? null : (expForm.end || null),
        current: expForm.current,
      };

      if (editExpId) await updateExperienceApi(editExpId, payload);
      else await createExperienceApi(payload);

      if (expForm.current && syncProfileLocation && loc) {
        await saveProfileToMe({
          ...profile,
          profile: { ...profile, location: loc },
        });
        onUpdate?.({ ...profile, location: loc });
      }

      showToast?.("success", editExpId ? "Experience updated." : "Experience added.");
      setExpOpen(false);
      setEditExpId(null);
      await reloadExtras();
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save experience.");
    } finally {
      setSavingExp(false);
    }
  };


  const saveContact = async () => {
    if (savingContact) return;
    setSavingContact(true);

    try {
      const loc = [contactForm.city, contactForm.location]
        .filter(Boolean)
        .join(", ");
      const links = { ...(profile.links || {}), linkedin: contactForm.linkedin };
      const payload = {
        email: contactForm.email,
        profile: { ...profile, location: loc, links },
      };
      await saveProfileToMe(payload);
      onUpdate?.({
        ...profile,
        email: payload.email,
        location: loc,
        links,
      });
      showToast?.("success", "Contact info updated.");
      setContactOpen(false);
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save contact info.");
    } finally {
      setSavingContact(false);
    }
  };


  const openAddExp = () => {
    setEditExpId(null);
    setExpForm({
      org: "",
      position: "",
      city: "",
      location: "",
      start: "",
      end: "",
      current: false,
      employment_type: "full_time",
      work_schedule: "",
      relationship_to_org: "",
      career_stage: "",
      work_arrangement: "",
      description: "",
      exit_reason: "",
      sector: "",
      industry: "",
      number_of_employees: "",
    });
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
      <Grid container spacing={2} sx={{ flexWrap: { xs: "wrap", sm: "nowrap" }, alignItems: "flex-start" }}>
        {/* LEFT: About / Skills / Experience / Education */}
        <Grid item xs={12} sx={{ display: "flex", flexDirection: "column", gap: 2, flexBasis: { xs: "100%", sm: "345px", md: "540px", lg: "540px", xl: "540px" }, maxWidth: { xs: "100%", sm: "345px", md: "540px", lg: "540px", xl: "540px" }, flexShrink: 0, "@media (min-width:1024px) and (max-width:1024px)": { flexBasis: "330px", maxWidth: "330px" } }}>

          <SectionCard title="About" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => { setAboutMode("description"); setAboutOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>} sx={{ minHeight: 160, display: "flex", flexDirection: "column" }}>
            <Typography variant="body2">{profile.bio || <Box component="span" sx={{ color: "text.secondary" }}>List your major duties...</Box>}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: "auto", alignSelf: "flex-end", display: "block", pt: 1 }}>{(profile.bio || "").length}/2000</Typography>
          </SectionCard>

          <SectionCard title="Skills" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => { setAboutMode("skills"); setAboutOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <SkillsChips skills={profile.skills} />
          </SectionCard>

          <SectionCard title="Experience" action={<Tooltip title="Add"><IconButton size="small" onClick={openAddExp}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              {profile.experience?.map(exp => (
                <ListItem key={exp.id} disableGutters secondaryAction={<Box sx={{ display: "flex" }}><IconButton size="small" onClick={() => setExpDeleteId(exp.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton><IconButton size="small" onClick={() => openEditExp(exp.id)}><EditOutlinedIcon fontSize="small" /></IconButton></Box>}>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {exp.position || "Role not specified"}
                          {exp.org ? ` · ${exp.org}` : ""}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {dateRange(exp.start, exp.end, exp.current)}
                          {exp.location ? ` · ${exp.location}` : ""}
                        </Typography>



                        {exp.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              whiteSpace: "normal",
                            }}
                          >
                            {exp.description}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </SectionCard>

          <SectionCard title="Education" action={<Tooltip title="Add"><IconButton size="small" onClick={() => { setEditEduId(null); setEduForm({}); setEduFiles([]); setEduOpen(true); }}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              {profile.education?.map(edu => (
                <ListItem key={edu.id} disableGutters secondaryAction={<Box sx={{ display: "flex" }}><IconButton size="small" onClick={() => setEduDeleteId(edu.id)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton><IconButton size="small" onClick={() => { setEditEduId(edu.id); setEduForm({ ...edu, start: (edu.start || "").slice(0, 4), end: (edu.end || "").slice(0, 4), documents: edu.documents || [] }); setEduOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></Box>}>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={600}>{edu.degree} — {edu.school}</Typography>}
                    secondary={
                      <Stack component="span" spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {edu.start?.slice(0, 4)} - {edu.end?.slice(0, 4)}
                        </Typography>

                        {/* --- NEW: Display Documents Chips --- */}
                        {edu.documents && edu.documents.length > 0 && (
                          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                            {edu.documents.map((doc) => (
                              <Chip
                                key={doc.id}
                                icon={<InsertDriveFileIcon style={{ fontSize: 14 }} />}
                                label={doc.filename}
                                size="small"
                                variant="outlined"
                                onClick={() => window.open(doc.file, '_blank')}
                                sx={{ cursor: "pointer", height: 24, fontSize: "0.75rem" }}
                              />
                            ))}
                          </Stack>
                        )}
                        {/* ---------------------------------- */}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </SectionCard>

          <SectionCard title="Certifications & Licenses" action={<Tooltip title="Add"><IconButton size="small" onClick={() => showToast("info", "Add coming soon")}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              <ListItem disableGutters
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => showToast("info", "Delete coming soon")}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => showToast("info", "Edit coming soon")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                }
              >
                <ListItemText primary={<Typography variant="body2" fontWeight={600}>AWS Certified Solutions Architect – Associate</Typography>} secondary={<Typography variant="caption" color="text.secondary">Amazon Web Services (AWS) • Issued Jan 2023</Typography>} />
              </ListItem>

              <ListItem disableGutters
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => showToast("info", "Delete coming soon")}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => showToast("info", "Edit coming soon")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                }
              >
                <ListItemText primary={<Typography variant="body2" fontWeight={600}>Google Professional Machine Learning Engineer</Typography>} secondary={<Typography variant="caption" color="text.secondary">Google Cloud • Issued Jun 2023</Typography>} />
              </ListItem>
            </List>
          </SectionCard>
        </Grid>

        {/* RIGHT: Contact + New Sections */}
        <Grid item xs={12} sx={{ display: "flex", flexDirection: "column", gap: 2, flexBasis: { xs: "100%", sm: "345px", md: "320px", lg: "540px", xl: "540px" }, maxWidth: { xs: "100%", sm: "345px", md: "320px", lg: "540px", xl: "540px" }, flexShrink: 0, "@media (min-width:1024px) and (max-width:1024px)": { flexBasis: "330px", maxWidth: "330px" } }}>
          <SectionCard title="Contact" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => setContactOpen(true)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Typography variant="subtitle2" color="text.secondary">LinkedIn</Typography><Box sx={{ display: "flex", gap: 1, mb: 1 }}><LinkedInIcon fontSize="small" /><Typography variant="body2">{profile.links?.linkedin || "—"}</Typography></Box>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography><Box sx={{ display: "flex", gap: 1, mb: 1 }}><EmailIcon fontSize="small" /><Typography variant="body2">{profile.email || "—"}</Typography></Box>
            <Typography variant="subtitle2" color="text.secondary">Location</Typography><Box sx={{ display: "flex", gap: 1 }}><PlaceIcon fontSize="small" /><Typography variant="body2">{profile.location || "—"}</Typography></Box>
          </SectionCard>

          <SectionCard title="Trainings & Executive Education" action={<Tooltip title="Add"><IconButton size="small" onClick={() => showToast("info", "Add coming soon")}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              <ListItem disableGutters
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => showToast("info", "Delete coming soon")}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => showToast("info", "Edit coming soon")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                }
              >
                <ListItemText primary={<Typography variant="body2" fontWeight={600}>Executive Leadership Programme</Typography>} secondary={<Typography variant="caption" color="text.secondary">University of Oxford • 2022</Typography>} />
              </ListItem>

              <ListItem disableGutters
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => showToast("info", "Delete coming soon")}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => showToast("info", "Edit coming soon")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                }
              >
                <ListItemText primary={<Typography variant="body2" fontWeight={600}>Advanced AI Strategy</Typography>} secondary={<Typography variant="caption" color="text.secondary">MIT Sloan School of Management • 2023</Typography>} />
              </ListItem>
            </List>
          </SectionCard>

          <SectionCard title="Memberships" action={<Tooltip title="Add"><IconButton size="small" onClick={() => showToast("info", "Add coming soon")}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            <List dense disablePadding>
              <ListItem disableGutters
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => showToast("info", "Delete coming soon")}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => showToast("info", "Edit coming soon")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                }
              >
                <ListItemText primary={<Typography variant="body2" fontWeight={600}>IEEE Computer Society</Typography>} secondary={<Typography variant="caption" color="text.secondary">Member since 2018</Typography>} />
              </ListItem>

              <ListItem disableGutters
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Delete"><IconButton size="small" onClick={() => showToast("info", "Delete coming soon")}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => showToast("info", "Edit coming soon")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>
                }
              >
                <ListItemText primary={<Typography variant="body2" fontWeight={600}>Association for Computing Machinery (ACM)</Typography>} secondary={<Typography variant="caption" color="text.secondary">Professional Member</Typography>} />
              </ListItem>
            </List>
          </SectionCard>

          <SectionCard
            title="Languages"
            action={
              <Tooltip title="Add Language">
                <IconButton size="small" onClick={openAddLanguage}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {langList.length > 0 ? (
              <List dense disablePadding>
                {langList.map((l) => (
                  <ListItem
                    key={l.id}
                    disableGutters
                    secondaryAction={
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton size="small" onClick={() => onEditLanguage(l)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => deleteLanguage(l.id)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {l.language.english_name}
                          {l.primary_dialect && <Typography component="span" variant="caption" color="text.secondary"> ({l.primary_dialect})</Typography>}
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span" display="block">
                            {CEFR_OPTIONS.find(c => c.value === l.proficiency_cefr)?.label || l.proficiency_cefr}
                          </Typography>
                          {l.certificates && l.certificates.length > 0 && (
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              {l.certificates.map(c => (
                                <Chip
                                  key={c.id}
                                  label="Certificate"
                                  size="small"
                                  icon={<VerifiedRoundedIcon />}
                                  variant="outlined"
                                  color={c.verified ? "success" : "default"}
                                  onClick={() => window.open(c.file, '_blank')}
                                  sx={{ cursor: 'pointer' }}
                                />
                              ))}
                            </Stack>
                          )}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">Add languages you know.</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* DIALOGS */}
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{aboutMode === "skills" ? "Edit skills" : "Edit description"}</DialogTitle>
        <DialogContent>{aboutMode === "description" ? (<TextField multiline minRows={4} fullWidth value={aboutForm.bio} onChange={(e) => setAboutForm(f => ({ ...f, bio: e.target.value }))} />) : (<TextField fullWidth label="Skills (CSV)" value={aboutForm.skillsText} onChange={(e) => setAboutForm(f => ({ ...f, skillsText: e.target.value }))} />)}</DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveAbout}
            disabled={savingAbout}
          >
            {savingAbout ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONTACT DIALOG (Cleaned up - No Names/Request Button) */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email" fullWidth value={contactForm.email || ""} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
            <Autocomplete options={CITY_OPTIONS} value={contactForm.city || null} onChange={(_, v) => setContactForm({ ...contactForm, city: v || "" })} renderInput={(p) => <TextField {...p} label="City" />} />
            <Autocomplete options={COUNTRY_OPTIONS} value={getSelectedCountry({ location: contactForm.location })} getOptionLabel={(o) => o?.label || ""} onChange={(_, v) => setContactForm({ ...contactForm, location: v?.label || "" })} renderInput={(p) => <TextField {...p} label="Country" />} />
            <TextField label="LinkedIn" fullWidth value={contactForm.linkedin || ""} onChange={(e) => setContactForm({ ...contactForm, linkedin: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveContact}
            disabled={savingContact}
          >
            {savingContact ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Language Dialog */}
      <Dialog open={langOpen} onClose={() => setLangOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editLangId ? "Edit Language" : "Add Language"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>

            <IsoLanguageAutocomplete
              value={langForm.iso_obj}
              onChange={(val) => setLangForm({ ...langForm, iso_obj: val })}
            />

            <TextField
              label="Primary Dialect (Optional)"
              placeholder="e.g. Mexican Spanish, Quebec French"
              value={langForm.primary_dialect}
              onChange={(e) => setLangForm({ ...langForm, primary_dialect: e.target.value })}
              fullWidth
              helperText="If the language has a specific dialect you speak."
            />

            <TextField
              select
              label="Proficiency (CEFR)"
              value={langForm.proficiency_cefr}
              onChange={(e) => setLangForm({ ...langForm, proficiency_cefr: e.target.value })}
              fullWidth
              helperText={
                CEFR_OPTIONS.find((c) => c.value === langForm.proficiency_cefr)?.desc ||
                "Select your proficiency level."
              }
            >
              {CEFR_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{opt.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Where did you learn this?"
              value={langForm.acquisition_context}
              onChange={(e) => setLangForm({ ...langForm, acquisition_context: e.target.value })}
              fullWidth
            >
              {ACQUISITION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <VerifiedRoundedIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                Certificates & Proof
              </Typography>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<CloudUploadRoundedIcon />}
              >
                Upload Certificate
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => {
                    if (e.target.files) setLangCertFiles(prev => [...prev, ...Array.from(e.target.files)]);
                  }}
                />
              </Button>

              {/* Existing Certs */}
              {existingCertificates.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Saved Certificates:</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {existingCertificates.map((cert) => (
                      <Chip
                        key={cert.id}
                        label={cert.filename || "Certificate"}
                        size="small"
                        color="primary"
                        variant="outlined"
                        onClick={() => window.open(cert.file, '_blank')}
                        onDelete={() => handleDeleteCertificate(cert.id)}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* New Certs */}
              {langCertFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>To be uploaded:</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {langCertFiles.map((f, i) => (
                      <Chip key={i} label={f.name} size="small" onDelete={() => setLangCertFiles(prev => prev.filter((_, idx) => idx !== i))} sx={{ mr: 1 }} />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLangOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveLanguage} disabled={langSaving}>
            {langSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={eduOpen} onClose={() => setEduOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editEduId ? "Edit" : "Add"} Education</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <UniversityAutocomplete
              value={eduForm.school || ""}
              onChange={(newValue) =>
                setEduForm((prev) => ({
                  ...prev,
                  school: newValue || "",
                }))
              }
            />
            <TextField label="Degree" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} />
            <Autocomplete freeSolo options={FIELD_OF_STUDY_OPTIONS} value={eduForm.field} onChange={(_, v) => setEduForm({ ...eduForm, field: v || "" })} renderInput={(p) => <TextField {...p} label="Field" />} />
            <Box sx={{ display: "flex", gap: 2 }}><TextField label="Start Year" type="number" value={eduForm.start} onChange={(e) => setEduForm({ ...eduForm, start: e.target.value })} /><TextField label="End Year" type="number" value={eduForm.end} onChange={(e) => setEduForm({ ...eduForm, end: e.target.value })} /></Box>
            <TextField
              label="Grade (optional)"
              value={eduForm.grade || ""}
              onChange={(e) => setEduForm({ ...eduForm, grade: e.target.value })}
              fullWidth
              sx={{ mt: 2 }}
            />
            {/* --- NEW: File Upload Section --- */}
            <Box sx={{ mt: 2, borderTop: '1px dashed', borderColor: 'divider', pt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Transcripts / Certificates</Typography>

              {/* 1. Existing Files (Edit Mode) */}
              {editEduId && eduForm.documents && eduForm.documents.length > 0 && (
                <List dense disablePadding>
                  {eduForm.documents.map((doc) => (
                    <ListItem key={doc.id} disableGutters
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleAskDeleteDoc(doc)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar sx={{ minWidth: 32 }}>
                        <InsertDriveFileIcon fontSize="small" color="action" />
                      </ListItemAvatar>
                      <ListItemText
                        primary={doc.filename}
                        primaryTypographyProps={{ variant: 'caption', noWrap: true, maxWidth: 200 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* 2. New File Selection */}
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                sx={{ mt: 1, textTransform: 'none' }}
              >
                Attach Files
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files) {
                      setEduFiles(prev => [...prev, ...Array.from(e.target.files)]);
                    }
                  }}
                />
              </Button>

              {/* 3. Pending Files List */}
              {eduFiles.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {eduFiles.map((f, i) => (
                    <Chip
                      key={i}
                      label={f.name}
                      onDelete={() => setEduFiles(prev => prev.filter((_, idx) => idx !== i))}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}
            </Box>
            {/* --------------------------------- */}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEduOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveEducation}
            disabled={savingEdu}
          >
            {savingEdu ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* EXPERIENCE DIALOG */}
      <Dialog open={expOpen} onClose={() => setExpOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editExpId ? "Edit Experience" : "Add Experience"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* 1. Company / Organization (same Clearbit autocomplete as ProfilePage) */}
            <CompanyAutocomplete
              value={expForm.org ? { name: expForm.org } : null}
              onChange={(company) =>
                setExpForm((prev) => ({
                  ...prev,
                  org: company?.name || "",
                }))
              }
            />

            {/* 2. Position / Title */}
            <TextField
              label="Position / Title"
              fullWidth
              value={expForm.position || ""}
              onChange={(e) =>
                setExpForm((prev) => ({ ...prev, position: e.target.value }))
              }
            />

            {/* 6. Location: City + Country (same pattern you already use) */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Autocomplete
                options={CITY_OPTIONS}
                value={expForm.city || ""}
                onChange={(_, v) =>
                  setExpForm((prev) => ({ ...prev, city: v || "" }))
                }
                renderInput={(params) => (
                  <TextField {...params} label="City" />
                )}
                sx={{ flex: 1, minWidth: 150 }}
              />

              <Autocomplete
                options={COUNTRY_OPTIONS}
                value={getSelectedCountry({ location: expForm.location })}
                getOptionLabel={(o) => o?.label || ""}
                onChange={(_, v) =>
                  setExpForm((prev) => ({
                    ...prev,
                    location: v?.label || "",
                  }))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Country" />
                )}
                sx={{ flex: 1, minWidth: 150 }}
              />
            </Box>

            {/* 7. Employment type / schedule / stage / arrangement – SAME as Profile page */}
            <TextField
              select
              label="Employment type *"
              fullWidth
              value={expForm.relationship_to_org || ""}
              onChange={(e) =>
                setExpForm((prev) => ({
                  ...prev,
                  relationship_to_org: e.target.value,
                }))
              }
            >
              <MenuItem value="employee">Employee (on payroll)</MenuItem>
              <MenuItem value="independent">
                Independent (self-employed / contractor / freelance)
              </MenuItem>
              <MenuItem value="third_party">
                Third-party (Agency / Consultancy / Temp)
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Work schedule"
              fullWidth
              value={expForm.work_schedule || ""}
              onChange={(e) =>
                setExpForm((prev) => ({
                  ...prev,
                  work_schedule: e.target.value,
                }))
              }
            >
              <MenuItem value="full_time">Full-time</MenuItem>
              <MenuItem value="part_time">Part-time</MenuItem>
            </TextField>

            <TextField
              select
              fullWidth
              label="Career stage"
              value={expForm.career_stage || ""}
              onChange={(e) =>
                setExpForm((prev) => ({
                  ...prev,
                  career_stage: e.target.value,
                }))
              }
            >
              <MenuItem value="internship">Internship</MenuItem>
              <MenuItem value="apprenticeship">Apprenticeship</MenuItem>
              <MenuItem value="trainee">Trainee</MenuItem>
              <MenuItem value="entry">Entry level</MenuItem>
              <MenuItem value="mid">Mid level</MenuItem>
              <MenuItem value="senior">Senior level</MenuItem>
            </TextField>

            <TextField
              select
              label="Work arrangement"
              fullWidth
              value={expForm.work_arrangement || ""}
              onChange={(e) =>
                setExpForm((prev) => ({
                  ...prev,
                  work_arrangement: e.target.value,
                }))
              }
            >
              <MenuItem value="onsite">On-site</MenuItem>
              <MenuItem value="hybrid">Hybrid</MenuItem>
              <MenuItem value="remote">Remote</MenuItem>
            </TextField>

            {/* 8. Dates */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={expForm.start || ""}
                onChange={(e) =>
                  setExpForm((prev) => ({ ...prev, start: e.target.value }))
                }
              />
              <TextField
                label="End Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={!!expForm.current}
                value={expForm.end || ""}
                onChange={(e) =>
                  setExpForm((prev) => ({ ...prev, end: e.target.value }))
                }
              />
            </Box>

            {/* 9. Current + sync profile location (only when current) */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!expForm.current}
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
            />

            {expForm.current && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!syncProfileLocation}
                    onChange={(e) => setSyncProfileLocation(e.target.checked)}
                  />
                }
                label="Make this location my profile’s work location"
              />
            )}

            {/* 10. Description + counter + Rewrite button */}
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                Description
              </Typography>
              <TextField
                placeholder="List your major duties..."
                multiline
                minRows={4}
                fullWidth
                value={expForm.description || ""}
                onChange={(e) =>
                  setExpForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
              <Box
                sx={{
                  mt: 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Review before saving.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(expForm.description?.length || 0)}/2000
                </Typography>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Button variant="outlined" size="small">
                  Rewrite with AI
                </Button>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveExperience}
            disabled={savingExp}
          >
            {savingExp ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Education Document – Modern Confirmation Dialog */}
      <Dialog
        open={deleteDocDialog.open}
        onClose={deletingEdu ? undefined : handleCloseDeleteDoc}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete document?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {deleteDocDialog.doc?.filename}
            </Box>{" "}
            from this education entry.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDoc} disabled={deletingEdu}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteDoc}
            disabled={deletingEdu}
          >
            {deletingEdu ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Delete Dialogs */}
      <Dialog open={!!eduDeleteId} onClose={() => setEduDeleteId(null)}>
        <DialogTitle>Delete Education?</DialogTitle>
        <DialogActions>
          <Button
            onClick={() => setEduDeleteId(null)}
            disabled={deletingEdu}
          >
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deletingEdu}
            onClick={async () => {
              if (deletingEdu) return;
              const idToDelete = eduDeleteId;   // keep a copy
              setEduDeleteId(null);             // close dialog immediately
              setDeletingEdu(true);
              try {
                await deleteEducationApi(idToDelete);
                await reloadExtras();
                showNotification("success", "Education deleted.");
              } catch (e) {
                console.error(e);
                showNotification("error", "Failed to delete education.");
              } finally {
                setDeletingEdu(false);
              }
            }}
          >
            {deletingEdu ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!expDeleteId} onClose={() => setExpDeleteId(null)}>
        <DialogTitle>Delete Experience?</DialogTitle>
        <DialogActions>
          <Button
            onClick={() => setExpDeleteId(null)}
            disabled={deletingExp}
          >
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deletingExp}
            onClick={async () => {
              if (deletingExp) return;
              setDeletingExp(true);
              try {
                await deleteExperienceApi(expDeleteId);
                await reloadExtras();
                showNotification("success", "Experience deleted.");
                setExpDeleteId(null);
              } catch (e) {
                console.error(e);
                showNotification("error", "Failed to delete experience.");
              } finally {
                setDeletingExp(false);
              }
            }}
          >
            {deletingExp ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}