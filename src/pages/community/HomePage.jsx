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
  DialogContentText,
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
  Alert,
  Slider,
  Skeleton,
  Radio
} from "@mui/material";

// Icons
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailIcon from "@mui/icons-material/Email";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import XIcon from "@mui/icons-material/X";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import GitHubIcon from "@mui/icons-material/GitHub";
import PhoneIcon from "@mui/icons-material/Phone";
import LinkIcon from "@mui/icons-material/Link";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
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
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { startKYC, submitNameChangeRequest } from "../../utils/api"
import { isFutureDate, isFutureMonth, isFutureYear } from "../../utils/dateValidation";
// Countries Library
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

// -----------------------------------------------------------------------------
// API helpers
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("access_token") ||
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

// 2. Add Proficiency Labels Constant (place this near CEFR_OPTIONS)
const PROFICIENCY_LABELS = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

function formatSkillLabel(skill) {
  if (!skill) return "";
  const base = skill.label || "";
  const lvl = skill.proficiency_level;
  if (!lvl) return base;
  const suffix = PROFICIENCY_LABELS[lvl] || "";
  return suffix ? `${base} · ${suffix}` : base;
}

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

function parseLocationString(locationString) {
  const raw = (locationString || "").trim();
  if (!raw) return { city: "", country: "" };
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const city = parts[0];
    const lastPart = parts[parts.length - 1];
    const maybeCountry = getSelectedCountry({ location: lastPart });
    return { city, country: maybeCountry ? maybeCountry.label : lastPart };
  }
  if (parts.length === 1) {
    const maybeCountry = getSelectedCountry({ location: parts[0] });
    if (maybeCountry) return { city: "", country: maybeCountry.label };
    return { city: parts[0], country: "" };
  }
  return { city: "", country: "" };
}

function toMonthYear(d) {
  if (!d) return "";
  const [y, m] = String(d).split("-");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
  return mi != null && y ? `${monthNames[mi]} ${y}` : String(d);
}

function dateRange(start, end, current, currentLabel = "present") {
  const s = toMonthYear(start);
  const e = current ? currentLabel : toMonthYear(end);
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

const CONTACT_EMAIL_TYPES = [
  { value: "professional", label: "Professional" },
  { value: "educational", label: "Educational" },
  { value: "personal", label: "Personal" },
  { value: "", label: "Uncategorized" },
];

const getEmailTypeLabel = (type) =>
  CONTACT_EMAIL_TYPES.find((t) => t.value === type)?.label || type;

const CONTACT_PHONE_TYPES = [
  { value: "professional", label: "Professional" },
  { value: "personal", label: "Personal" },
];

const VISIBILITY_META = {
  public: { label: "Visible to Public", Icon: PublicOutlinedIcon },
  contacts: { label: "Visible to your Contacts", Icon: PeopleAltOutlinedIcon },
  private: { label: "Invisible", Icon: VisibilityOffOutlinedIcon },
};

const CONTACT_VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "contacts", label: "Contacts" },
  { value: "public", label: "Public" },
];

const renderVisibilityIcon = (visibility) => {
  const meta = VISIBILITY_META[visibility];
  if (!meta) return null;
  const Icon = meta.Icon;
  return (
    <Tooltip title={meta.label} arrow enterTouchDelay={0} leaveTouchDelay={2000}>
      <Box component="span" sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}>
        <Icon fontSize="small" />
      </Box>
    </Tooltip>
  );
};

const SOCIAL_REGEX = {
  linkedin: /^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/i,
  x: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.*$/i,
  facebook: /^(https?:\/\/)?(www\.)?facebook\.com\/.*$/i,
  instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/.*$/i,
  github: /^(https?:\/\/)?(www\.)?github\.com\/.*$/i,
};

function createEmptyContactForm() {
  return {
    emails: [],
    main_email: { type: "", visibility: "private" },
    phones: [],
    websites: [],
    scheduler: { label: "Calendly", url: "https://calendly.com/me", visibility: "private" },
    socials: { linkedin: "", x: "", facebook: "", instagram: "", github: "" },
  };
}

function buildContactFormFromLinks(links) {
  const contact = links?.contact && typeof links.contact === "object" ? links.contact : {};
  const emails = Array.isArray(contact.emails) ? contact.emails : [];
  const phones = Array.isArray(contact.phones) ? contact.phones : [];
  const websites = Array.isArray(contact.websites) ? contact.websites : [];
  const scheduler = contact.scheduler && typeof contact.scheduler === "object" ? contact.scheduler : {};

  const main_email = contact.main_email || { type: "", visibility: "private" };

  return {
    emails: emails.map((item) => ({
      email: item?.email || "",
      type: item?.type || "professional",
      visibility: item?.visibility || "private",
    })),
    main_email: {
      type: main_email.type || "",
      visibility: main_email.visibility || "private",
    },
    phones: phones.map((item) => ({
      number: item?.number || "",
      type: item?.type || "professional",
      visibility: item?.visibility || "private",
      primary: !!item?.primary,
    })),
    websites: websites.map((item) => ({
      label: item?.label || "",
      url: item?.url || "",
      visibility: item?.visibility || "private",
    })),
    scheduler: {
      label: scheduler?.label || "Calendly",
      url: scheduler?.url || "https://calendly.com/me",
      visibility: scheduler?.visibility || "private",
    },
    socials: {
      linkedin: links?.linkedin || "",
      x: links?.x || "",
      facebook: links?.facebook || "",
      instagram: links?.instagram || "",
      github: links?.github || "",
    },
  };
}

function orderPhonesForDisplay(phones) {
  if (!phones?.length) return [];
  const idx = phones.findIndex((p) => p?.primary);
  const primaryIndex = idx >= 0 ? idx : 0;
  return [phones[primaryIndex], ...phones.filter((_, i) => i !== primaryIndex)];
}

function buildLinksWithContact(existingLinks, contactForm) {
  const newLinks = { ...(existingLinks || {}) };
  const socials = contactForm?.socials || {};
  const socialKeys = ["linkedin", "x", "facebook", "instagram", "github"];

  socialKeys.forEach((key) => {
    const value = (socials[key] || "").trim();
    if (value) newLinks[key] = value;
    else delete newLinks[key];
  });

  const emails = (contactForm?.emails || [])
    .map((item) => ({
      email: (item?.email || "").trim(),
      type: item?.type || "professional",
      visibility: item?.visibility || "private",
    }))
    .filter((item) => item.email);

  const main_email = {
    type: contactForm?.main_email?.type || "",
    visibility: contactForm?.main_email?.visibility || "private",
  };

  let phones = (contactForm?.phones || [])
    .map((item) => ({
      number: (item?.number || "").trim(),
      type: item?.type || "professional",
      visibility: item?.visibility || "private",
      primary: !!item?.primary,
    }))
    .filter((item) => item.number);

  if (phones.length) {
    const idx = phones.findIndex((p) => p.primary);
    const primaryIndex = idx >= 0 ? idx : 0;
    phones = phones.map((p, i) => ({ ...p, primary: i === primaryIndex }));
  }

  const websites = (contactForm?.websites || [])
    .map((item) => ({
      label: (item?.label || "").trim(),
      url: (item?.url || "").trim(),
      visibility: item?.visibility || "private",
    }))
    .filter((item) => item.url);

  const schedulerLabel = (contactForm?.scheduler?.label || "Calendly").trim();
  const schedulerUrl = (contactForm?.scheduler?.url || "").trim();
  const schedulerVisibility = contactForm?.scheduler?.visibility || "private";
  const scheduler = schedulerUrl
    ? { label: schedulerLabel || "Calendly", url: schedulerUrl, visibility: schedulerVisibility }
    : null;

  const contact = {};
  if (emails.length) contact.emails = emails;
  if (main_email) contact.main_email = main_email;
  if (phones.length) contact.phones = phones;
  if (websites.length) contact.websites = websites;
  if (scheduler) contact.scheduler = scheduler;

  if (Object.keys(contact).length) newLinks.contact = contact;
  else delete newLinks.contact;

  return newLinks;
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
  trainings: [],
  certifications: [],
  memberships: [],
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
        trainings: Array.isArray(d.trainings) ? d.trainings : [],
        certifications: Array.isArray(d.certifications) ? d.certifications : [],
        memberships: Array.isArray(d.memberships) ? d.memberships : [],
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
function CompanyAutocomplete({ value, onChange, error, helperText }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    setInputValue(value?.name || "");
  }, [value]);

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
      value={value || null}
      inputValue={inputValue}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          onChange({ name: newValue, logo: null, domain: null });
        } else if (newValue && newValue.inputValue) {
          onChange({ name: newValue.inputValue, logo: null, domain: null });
        } else {
          onChange(newValue);
        }
      }}
      onInputChange={(event, newInputValue, reason) => {
        setInputValue(newInputValue);
        if (reason === "input") {
          onChange(newInputValue ? { name: newInputValue, logo: null, domain: null } : null);
        }
      }}
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
          error={!!error}
          helperText={helperText || ""}
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
  const [loading, setLoading] = React.useState(true);

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

  // About (Summary) see more
  const [aboutExpanded, setAboutExpanded] = React.useState(false);
  const [aboutHasOverflow, setAboutHasOverflow] = React.useState(false);
  const aboutBioRef = React.useRef(null);

  const checkAboutOverflow = React.useCallback(() => {
    const el = aboutBioRef.current;
    if (!el) return;
    // detect if clamped text is actually overflowing
    setAboutHasOverflow(el.scrollHeight > el.clientHeight + 1);
  }, []);

  React.useEffect(() => {
    // only measure when collapsed (clamped)
    if (aboutExpanded) return;

    const raf = requestAnimationFrame(checkAboutOverflow);
    const onResize = () => checkAboutOverflow();

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [profile?.bio, aboutExpanded, checkAboutOverflow]);

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
    setLoading(true);
    try {
      const corePromise = fetchProfileCore();
      const extrasPromise = fetchProfileExtras().catch(() => ({
        experiences: [],
        educations: [],
        trainings: [],
        certifications: [],
        memberships: [],
      }));
      const core = await corePromise;
      setProfile((prev) => ({ ...prev, ...core }));
      try { localStorage.setItem("profile_core", JSON.stringify(core)); } catch { }
      const extra = await extrasPromise;
      setProfile((prev) => ({
        ...prev,
        experience: extra.experiences,
        education: extra.educations,
        trainings: extra.trainings,
        certifications: extra.certifications,
        memberships: extra.memberships,
      }));
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // --- Languages State ---
  const [langList, setLangList] = React.useState([]);
  const [langOpen, setLangOpen] = React.useState(false);
  const [langSaving, setLangSaving] = React.useState(false);
  const [editLangId, setEditLangId] = React.useState(null);
  const [langCertFiles, setLangCertFiles] = React.useState([]);
  const [existingCertificates, setExistingCertificates] = React.useState([]);
  const [deleteLangDialog, setDeleteLangDialog] = React.useState({ open: false, id: null, name: "" });
  const [deleteCertDialog, setDeleteCertDialog] = React.useState({ open: false, id: null, name: "" });
  const [deletingLang, setDeletingLang] = React.useState(false);
  const [deletingCert, setDeletingCert] = React.useState(false);

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

  // 1. LANGUAGE: Open Dialog
  function deleteLanguage(id) {
    const lang = langList.find((l) => l.id === id);
    const name = lang ? lang.language.english_name : "this language";
    setDeleteLangDialog({ open: true, id, name });
  }

  // 2. LANGUAGE: Perform Delete
  async function confirmDeleteLanguage() {
    if (!deleteLangDialog.id) return;
    setDeletingLang(true);
    try {
      const r = await fetch(`${API_ROOT}/auth/me/languages/${deleteLangDialog.id}/`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (r.ok) {
        showNotification("success", "Language deleted");
        loadLanguages();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      showNotification("error", "Delete failed");
    } finally {
      setDeletingLang(false);
      setDeleteLangDialog({ open: false, id: null, name: "" });
    }
  }

  // 3. CERTIFICATE: Open Dialog
  function handleDeleteCertificate(certId) {
    // Find the cert name for display (searching inside all languages)
    let certName = "this certificate";
    for (const lang of langList) {
      const found = lang.certificates?.find((c) => c.id === certId);
      if (found) {
        certName = found.filename || "Certificate";
        break;
      }
    }
    // Also check "existingCertificates" state if currently editing a language
    if (certName === "this certificate") {
      const foundInEdit = existingCertificates.find(c => c.id === certId);
      if (foundInEdit) certName = foundInEdit.filename;
    }

    setDeleteCertDialog({ open: true, id: certId, name: certName });
  }

  // 4. CERTIFICATE: Perform Delete
  async function confirmDeleteCertificate() {
    if (!deleteCertDialog.id) return;
    setDeletingCert(true);
    try {
      const r = await fetch(`${API_ROOT}/auth/me/language-certificates/${deleteCertDialog.id}/`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (r.ok) {
        showNotification("success", "Certificate deleted");
        // Update both the main list and the edit-form list
        setExistingCertificates((prev) => prev.filter((c) => c.id !== deleteCertDialog.id));
        loadLanguages();
      } else {
        throw new Error("Failed to delete certificate");
      }
    } catch (e) {
      showNotification("error", e.message);
    } finally {
      setDeletingCert(false);
      setDeleteCertDialog({ open: false, id: null, name: "" });
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
        {loading ? (
          <Card
            variant="outlined"
            sx={{ width: "100%", borderRadius: 3, p: 2, mb: 2 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              sx={{ width: "100%" }}
            >
              <Box sx={{ mr: { sm: 2 }, width: 72, height: 72 }}>
                <Skeleton variant="circular" width={72} height={72} />
              </Box>
              <Box sx={{ flex: { xs: "0 0 auto", sm: 1 }, width: { xs: "100%", sm: "auto" } }}>
                <Skeleton variant="text" width="40%" height={28} />
                <Skeleton variant="text" width="60%" />
              </Box>
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: "none", sm: "block" }, mx: 2 }}
              />
              <Box sx={{ minWidth: { sm: 160 }, textAlign: { xs: "left", sm: "center" } }}>
                <Skeleton variant="text" width={120} />
              </Box>
            </Stack>
          </Card>
        ) : (
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
        )}

        {loading ? (
          <Box>
            <Grid
              container
              spacing={2}
              sx={{
                flexWrap: { xs: "wrap", sm: "nowrap" },
                alignItems: "flex-start",
              }}
            >
              {/* LEFT skeleton column */}
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
                }}
              >
                <SectionSkeleton minHeight={160} lines={3} />
                <SectionSkeleton minHeight={140} lines={2} />
                <SectionSkeleton minHeight={180} lines={3} />
                <SectionSkeleton minHeight={180} lines={3} />
              </Grid>

              {/* RIGHT skeleton column */}
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
                }}
              >
                <SectionSkeleton minHeight={140} lines={3} />
                <SectionSkeleton minHeight={140} lines={2} />
                <SectionSkeleton minHeight={140} lines={2} />
                <SectionSkeleton minHeight={140} lines={2} />
              </Grid>
            </Grid>
          </Box>
        ) : (
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
            onStartKYC={handleStartKYC}
          />
        )}

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
      {/* ------------------------------------------------------- */}
      {/* NEW: Modern Delete Dialog for Language                  */}
      {/* ------------------------------------------------------- */}
      <Dialog
        open={deleteLangDialog.open}
        onClose={() => !deletingLang && setDeleteLangDialog({ ...deleteLangDialog, open: false })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutlineRoundedIcon color="error" />
          Delete Language?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove{" "}
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
              {deleteLangDialog.name}
            </Box>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteLangDialog({ ...deleteLangDialog, open: false })}
            disabled={deletingLang}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteLanguage}
            disabled={deletingLang}
          >
            {deletingLang ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------- */}
      {/* NEW: Modern Delete Dialog for Certificate               */}
      {/* ------------------------------------------------------- */}
      <Dialog
        open={deleteCertDialog.open}
        onClose={() => !deletingCert && setDeleteCertDialog({ ...deleteCertDialog, open: false })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteOutlineRoundedIcon color="error" />
          Delete Certificate?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete the file{" "}
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
              {deleteCertDialog.name}
            </Box>
            .
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteCertDialog({ ...deleteCertDialog, open: false })}
            disabled={deletingCert}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteCertificate}
            disabled={deletingCert}
          >
            {deletingCert ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

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

function SectionSkeleton({ minHeight = 140, lines = 3 }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        width: "100%",
        minHeight,
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} variant="text" width={`${70 - idx * 10}%`} />
      ))}
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

// -------------------- Trainings API --------------------
async function createTrainingApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/trainings/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to add training");
  return await r.json();
}

async function updateTrainingApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/trainings/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to update training");
}

async function deleteTrainingApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/trainings/${id}/`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete training");
}

// -------------------- Certifications API --------------------
async function createCertificationApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/certifications/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to add certification");
  return await r.json();
}

async function updateCertificationApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/certifications/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to update certification");
}

async function deleteCertificationApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/certifications/${id}/`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete certification");
}

// -------------------- Memberships API --------------------
async function createMembershipApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/memberships/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to add membership");
  return await r.json();
}

async function updateMembershipApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/memberships/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to update membership");
}

async function deleteMembershipApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/memberships/${id}/`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete membership");
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

function UniversityAutocomplete({ value, onChange, label = "University", error, helperText }) {
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
          error={!!error}
          helperText={helperText || ""}
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

// -----------------------------------------------------------------------------
// City Autocomplete (OFFLINE - Backend GeoCitySearchView)
// GET /api/auth/cities/search/?q=sur&country=IN&limit=20
// Returns mapped shape similar to Open-Meteo: { name, admin1, country, country_code, latitude, longitude }
// -----------------------------------------------------------------------------
function CityAutocompleteOffline({ label = "City", value, onSelect, countryCode = "" }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    const q = (inputValue || "").trim();

    if (q.length < 2) {
      setOptions(value ? [value] : []);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        params.set("limit", "10");
        if (countryCode) params.set("country", String(countryCode).toUpperCase());

        const url = `${API_ROOT}/auth/cities/search/?${params.toString()}`;

        const r = await fetch(url, {
          headers: { ...authHeader(), accept: "application/json" },
          signal: controller.signal,
        });
        if (!r.ok) return;

        const data = await r.json();

        const results = (data?.results || []).map((x) => ({
          geoname_id: x.geoname_id ?? null,
          name: x.name || "",
          admin1: x.admin1_code || "",
          country: x.country_name || x.country_code || "",
          country_code: x.country_code || "",
          latitude: x.lat ?? null,
          longitude: x.lng ?? null,
          is_other: !!x.is_other,
          label: x.label || [x.name, x.country_name || x.country_code].filter(Boolean).join(", "),
        })).filter((x) => x.name);

        if (active) setOptions(results);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("Offline city search failed", e);
      } finally {
        if (active) setLoading(false);
      }
    };

    const t = setTimeout(run, 300);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(t);
    };
  }, [inputValue, value, countryCode]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      value={value || null}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      isOptionEqualToValue={(o, v) => {
        if (o?.geoname_id && v?.geoname_id) return o.geoname_id === v.geoname_id;
        return o?.name === v?.name && o?.country === v?.country;
      }}
      getOptionLabel={(o) => o?.name || ""}
      onChange={(_, newValue) => onSelect?.(newValue || null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {option.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.country_code ? `Country Code: ${option.country_code}` : ""}
              {option.is_other ? " · Custom" : ""}
            </Typography>
          </Box>
        </li>
      )}
    />
  );
}


// -----------------------------------------------------------------------------
// City Autocomplete (Open-Meteo) → returns { name, admin1, country, country_code, latitude, longitude }
// -----------------------------------------------------------------------------
function CityAutocompleteOpenMeteo({ label = "City", value, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    const q = (inputValue || "").trim();
    if (q.length < 2) {
      setOptions(value ? [value] : []);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) return;
        const data = await r.json();

        const results = (data?.results || []).map((x) => ({
          name: x.name || "",
          admin1: x.admin1 || "",
          country: x.country || "",
          country_code: x.country_code || "",
          latitude: x.latitude,
          longitude: x.longitude,
        })).filter((x) => x.name && x.country);

        if (active) setOptions(results);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("City search failed", e);
      } finally {
        if (active) setLoading(false);
      }
    };

    const t = setTimeout(run, 350); // debounce
    return () => {
      active = false;
      controller.abort();
      clearTimeout(t);
    };
  }, [inputValue, value]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      value={value || null}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      isOptionEqualToValue={(o, v) =>
        o?.name === v?.name &&
        o?.country === v?.country &&
        o?.admin1 === v?.admin1
      }
      getOptionLabel={(o) => {
        if (!o) return "";
        const parts = [o.name, o.admin1, o.country].filter(Boolean);
        return parts.join(", ");
      }}
      onChange={(_, newValue) => {
        onSelect?.(newValue || null);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {option.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[option.admin1, option.country].filter(Boolean).join(", ")}
              {option.country_code ? ` · ${option.country_code}` : ""}
            </Typography>
          </Box>
        </li>
      )}
    />
  );
}




function VerificationCard({ status, onVerify }) {
  const isVerified = status === "approved";
  const isPending = status === "pending" || status === "review";
  const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <SectionCard
      title="Verification"
      sx={{
        mb: 2,
        borderColor: isVerified ? "primary.light" : isPending ? "#14b8a6" : "divider",
        bgcolor: isVerified ? "primary.50" : isPending ? "#f0fdfa" : "background.paper"
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", textAlign: "center", pb: 1 }}>
        {isVerified ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main" }}>
              <VerifiedRoundedIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Verified Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your profile has been verified on {today}. This will provide you with more benefits of the community platform.
              </Typography>
            </Box>
          </>
        ) : isPending ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#14b8a6" }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "3px solid",
                  borderColor: "#14b8a6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24
                }}
              >
                ⏳
              </Box>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Verification {status === "review" ? "Under Review" : "Pending"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your verification request is currently being processed. You will be notified once the review is complete.
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Verify your profile and identity to unleash all benefits of the community platform.
            </Typography>
            <Button variant="contained" color="primary" onClick={onVerify} sx={{ px: 4, borderRadius: 20 }}>
              GET VERIFIED
            </Button>
          </>
        )}
      </Box>
    </SectionCard>
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
  onStartKYC,
}) {

  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [aboutMode, setAboutMode] = React.useState("description");
  const [aboutForm, setAboutForm] = React.useState({ bio: "", skillsText: "" });

  // About (Summary) see more clamp
  const [aboutExpanded, setAboutExpanded] = React.useState(false);
  const [aboutHasOverflow, setAboutHasOverflow] = React.useState(false);
  const aboutBioRef = React.useRef(null);

  const checkAboutOverflow = React.useCallback(() => {
    const el = aboutBioRef.current;
    if (!el) return;
    setAboutHasOverflow(el.scrollHeight > el.clientHeight + 1);
  }, []);

  React.useEffect(() => {
    // when bio changes, collapse + re-measure
    setAboutExpanded(false);
    const raf = requestAnimationFrame(checkAboutOverflow);
    return () => cancelAnimationFrame(raf);
  }, [profile?.bio, checkAboutOverflow]);

  React.useEffect(() => {
    if (aboutExpanded) return;
    const onResize = () => checkAboutOverflow();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aboutExpanded, checkAboutOverflow]);

  const [eduOpen, setEduOpen] = React.useState(false);
  const [editEduId, setEditEduId] = React.useState(null);
  const [eduForm, setEduForm] = React.useState({ school: "", degree: "", field: "", start: "", end: "", grade: "" });
  const [eduErrors, setEduErrors] = React.useState({ start: "", end: "" });
  const [eduReqErrors, setEduReqErrors] = React.useState({ school: "", degree: "", field: "", start: "" });
  const [eduDeleteId, setEduDeleteId] = React.useState(null);

  const [expOpen, setExpOpen] = React.useState(false);
  const [editExpId, setEditExpId] = React.useState(null);
  const [expDeleteId, setExpDeleteId] = React.useState(null);
  const [expForm, setExpForm] = React.useState({});
  const [expReqErrors, setExpReqErrors] = React.useState({
    org: "",
    position: "",
    location: "",
    relationship_to_org: "",
    work_schedule: "",
    career_stage: "",
    work_arrangement: "",
    start: "",
    end: "",
  });
  const [savingExp, setSavingExp] = React.useState(false);
  const [syncProfileLocation, setSyncProfileLocation] = React.useState(false);

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactEditSection, setContactEditSection] = React.useState("all"); // "emails", "phones", "socials", "websites", "scheduler", "all"

  const openContactEditor = (section) => {
    setContactEditSection(section);
    setContactOpen(true);
  };

  const closeContactEditor = () => {
    setContactOpen(false);
    setContactEditSection("all");
  };

  const [locationOpen, setLocationOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState(() => createEmptyContactForm());
  const [socialErrors, setSocialErrors] = React.useState({ linkedin: "", x: "", facebook: "", instagram: "", github: "" });
  const [emailErrors, setEmailErrors] = React.useState({});
  const [phoneErrors, setPhoneErrors] = React.useState({});
  const [websiteErrors, setWebsiteErrors] = React.useState({});
  const [schedulerError, setSchedulerError] = React.useState("");
  const [locationForm, setLocationForm] = React.useState({ city_obj: null, city: "", location: "" });

  const [savingAbout, setSavingAbout] = React.useState(false);
  const [savingEdu, setSavingEdu] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [deletingEdu, setDeletingEdu] = React.useState(false);
  const [deletingExp, setDeletingExp] = React.useState(false);
  const [eduFiles, setEduFiles] = React.useState([]);
  const latestExp = React.useMemo(() => profile.experience?.[0], [profile.experience]);
  const parsedLocation = React.useMemo(
    () => parseLocationString(profile.location),
    [profile.location]
  );
  const contactLinks = React.useMemo(
    () => buildContactFormFromLinks(profile.links && typeof profile.links === "object" ? profile.links : parseLinks(profile.linksText)),
    [profile.links, profile.linksText]
  );
  const orderedPhones = React.useMemo(
    () => orderPhonesForDisplay(contactLinks.phones),
    [contactLinks.phones]
  );
  const emailPreview = contactLinks.emails.slice(0, 2);
  const emailRemaining = Math.max(0, contactLinks.emails.length - emailPreview.length);
  const phonePreview = orderedPhones.slice(0, 3);
  const phoneRemaining = Math.max(0, orderedPhones.length - phonePreview.length);
  const websitePreview = contactLinks.websites.slice(0, 2);
  const websiteRemaining = Math.max(0, contactLinks.websites.length - websitePreview.length);
  const socialItems = [
    { key: "linkedin", label: "LinkedIn", icon: <LinkedInIcon fontSize="small" />, url: contactLinks.socials.linkedin },
    { key: "x", label: "X", icon: <XIcon fontSize="small" />, url: contactLinks.socials.x },
    { key: "facebook", label: "Facebook", icon: <FacebookIcon fontSize="small" />, url: contactLinks.socials.facebook },
    { key: "instagram", label: "Instagram", icon: <InstagramIcon fontSize="small" />, url: contactLinks.socials.instagram },
    { key: "github", label: "GitHub", icon: <GitHubIcon fontSize="small" />, url: contactLinks.socials.github },
  ];

  // --- Trainings ---
  const [trainingOpen, setTrainingOpen] = React.useState(false);
  const [editTrainingId, setEditTrainingId] = React.useState(null);
  const [trainingDeleteId, setTrainingDeleteId] = React.useState(null);
  const [savingTraining, setSavingTraining] = React.useState(false);
  const [deletingTraining, setDeletingTraining] = React.useState(false);
  const [trainingForm, setTrainingForm] = React.useState({
    program_title: "",
    provider: "",
    start_month: "",   // YYYY-MM
    end_month: "",     // YYYY-MM
    currently_ongoing: false,
    description: "",
    credential_url: "",
  });
  const [trainingReqErrors, setTrainingReqErrors] = React.useState({
    program_title: "",
    provider: "",
    start_month: "",
    end_month: "",
  });

  // --- Certifications ---
  const [certOpen, setCertOpen] = React.useState(false);
  const [editCertId, setEditCertId] = React.useState(null);
  const [certDeleteId, setCertDeleteId] = React.useState(null);
  const [savingCert, setSavingCert] = React.useState(false);
  const [deletingCert, setDeletingCert] = React.useState(false);
  const [certForm, setCertForm] = React.useState({
    certification_name: "",
    issuing_organization: "",
    issue_month: "",        // YYYY-MM
    expiration_month: "",   // YYYY-MM
    no_expiration: false,
    credential_id: "",
    credential_url: "",
  });
  const [certReqErrors, setCertReqErrors] = React.useState({
    certification_name: "",
    issuing_organization: "",
    issue_month: "",
    expiration_month: "",
  });

  // --- Memberships ---
  const [memberOpen, setMemberOpen] = React.useState(false);
  const [editMemberId, setEditMemberId] = React.useState(null);
  const [memberDeleteId, setMemberDeleteId] = React.useState(null);
  const [savingMember, setSavingMember] = React.useState(false);
  const [deletingMember, setDeletingMember] = React.useState(false);
  const [memberForm, setMemberForm] = React.useState({
    organization_name: "",
    role_type: "Member",
    start_month: "",   // YYYY-MM
    end_month: "",     // YYYY-MM
    ongoing: false,
    membership_url: "",
  });
  const [memberReqErrors, setMemberReqErrors] = React.useState({
    organization_name: "",
    role_type: "",
    start_month: "",
    end_month: "",
  });

  // For modern delete confirmation when removing an education document
  const [deleteDocDialog, setDeleteDocDialog] = React.useState({
    open: false,
    doc: null,
  });

  const trainingToDelete = React.useMemo(
    () => (profile.trainings || []).find((t) => t.id === trainingDeleteId) || null,
    [profile.trainings, trainingDeleteId]
  );
  const certToDelete = React.useMemo(
    () => (profile.certifications || []).find((c) => c.id === certDeleteId) || null,
    [profile.certifications, certDeleteId]
  );
  const memberToDelete = React.useMemo(
    () => (profile.memberships || []).find((m) => m.id === memberDeleteId) || null,
    [profile.memberships, memberDeleteId]
  );
  const eduToDelete = React.useMemo(
    () => (profile.education || []).find((e) => e.id === eduDeleteId) || null,
    [profile.education, eduDeleteId]
  );
  const expToDelete = React.useMemo(
    () => (profile.experience || []).find((e) => e.id === expDeleteId) || null,
    [profile.experience, expDeleteId]
  );

  // --- NEW SKILLS STATE ---
  const [userSkills, setUserSkills] = React.useState([]);
  const [skillOptions, setSkillOptions] = React.useState([]);
  const [skillSearch, setSkillSearch] = React.useState("");
  const [aboutSkills, setAboutSkills] = React.useState([]); // For the edit dialog
  const [skillsDialogOpen, setSkillsDialogOpen] = React.useState(false); // For "See all"
  const skillSearchTimeout = React.useRef(null);

  // --- API FUNCTIONS FOR SKILLS ---

  // 1. Load User Skills
  const loadUserSkills = React.useCallback(async () => {
    try {
      const r = await fetch(`${API_ROOT}/auth/me/skills/`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!r.ok) return;
      const data = await r.json();
      const items = Array.isArray(data) ? data : data.results || [];

      const mapped = items
        .map((item) => ({
          id: item.id,
          uri: item.skill?.uri,
          label: item.skill?.preferred_label || "",
          proficiency_level: item.proficiency_level ?? 3,
        }))
        .filter((s) => s.uri && s.label);

      setUserSkills(mapped);
    } catch (e) {
      console.error("Error loading skills", e);
    }
  }, []);

  React.useEffect(() => {
    loadUserSkills();
  }, [loadUserSkills]);

  // 2. Fetch Options (Debounced)
  async function fetchSkillOptions(query) {
    const q = (query || "").trim();
    if (!q) { setSkillOptions([]); return; }
    try {
      const resp = await fetch(`${API_ROOT}/auth/skills/search?q=${encodeURIComponent(q)}`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const cleaned = (data.results || []).map((item) => {
        const lbl = item.label;
        let label = "";
        if (typeof lbl === "string") label = lbl;
        else if (lbl && typeof lbl === "object") label = lbl["en-us"] || lbl["en"] || Object.values(lbl)[0] || "";
        return { uri: item.uri, label };
      }).filter((x) => x.label);
      setSkillOptions(cleaned);
    } catch (e) { console.error(e); }
  }

  React.useEffect(() => {
    if (skillSearchTimeout.current) clearTimeout(skillSearchTimeout.current);
    const q = (skillSearch || "").trim();
    if (!q) { setSkillOptions([]); return; }
    skillSearchTimeout.current = setTimeout(() => { fetchSkillOptions(q); }, 300);
    return () => { if (skillSearchTimeout.current) clearTimeout(skillSearchTimeout.current); };
  }, [skillSearch]);

  // 3. Sync Logic (Called on Save)
  async function syncUserSkillsWithBackend(selectedSkills) {
    try {
      // Get current from backend to diff
      const resp = await fetch(`${API_ROOT}/auth/me/skills/`, { headers: authHeader() });
      if (!resp.ok) return;
      const data = await resp.json();
      const current = Array.isArray(data) ? data : data.results || [];
      const selectedByUri = new Map((selectedSkills || []).map((s) => [s.uri, s]));

      // Delete removed
      const deletions = current.filter((item) => !selectedByUri.has(item.skill?.uri));
      await Promise.all(deletions.map((item) =>
        fetch(`${API_ROOT}/auth/me/skills/${item.id}/`, { method: "DELETE", headers: authHeader() })
      ));

      // Create/Update
      await Promise.all((selectedSkills || []).map((s) =>
        fetch(`${API_ROOT}/auth/me/skills/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({
            skill_uri: s.uri,
            preferred_label: s.label,
            proficiency_level: s.proficiency_level ?? 3,
            assessment_type: "self",
            notes: "",
          }),
        })
      ));

      // Update local state WITH SORTING
      const sortedSkills = [...(selectedSkills || [])].sort((a, b) => {
        // Sort by Proficiency Descending (5 -> 1)
        return (b.proficiency_level || 0) - (a.proficiency_level || 0);
      });

      setUserSkills(sortedSkills);
    } catch (err) { console.error(err); }
  }

  // 4. Handle Slider Change
  const handleSkillLevelChange = (uri, level) => {
    const numeric = Array.isArray(level) ? level[0] : level;
    setAboutSkills((prev) => prev.map((s) => s.uri === uri ? { ...s, proficiency_level: numeric } : s));
  };

  // --- MODIFIED SAVE FUNCTION ---
  const saveAbout = async () => {
    if (savingAbout) return;
    setSavingAbout(true);
    try {
      // 1. Save Basic Profile (Bio)
      await saveProfileToMe({
        ...profile,
        profile: {
          ...profile,
          bio: aboutForm.bio,
          // We don't save skills to 'profile.skills' legacy array anymore, 
          // but we can sync it for backward compatibility if you wish.
          // For now, we rely on the relational table.
        },
      });
      onUpdate?.({ ...profile, bio: aboutForm.bio });

      // 2. Save Skills (if in skills mode)
      if (aboutMode === "skills" && aboutSkills) {
        await syncUserSkillsWithBackend(aboutSkills);
      }

      showToast?.("success", "Section updated.");
      setAboutOpen(false);
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save section.");
    } finally {
      setSavingAbout(false);
    }
  };

  // --- MODIFIED OPEN FUNCTION ---
  const handleOpenAbout = (mode) => {
    setAboutMode(mode);
    if (mode === "skills") {
      setAboutSkills(userSkills || []); // Pre-fill with current structured skills
    }
    setAboutForm({ bio: profile.bio || "", skillsText: "" }); // Reset legacy text
    setAboutOpen(true);
  };

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
    const { city, country } = parseLocationString(profile.location);

    const city_obj = city
      ? {
        name: city,
        admin1: "",
        country: country || "",
        country_code: "",
        latitude: null,
        longitude: null,
      }
      : null;

    setContactForm(
      buildContactFormFromLinks(profile.links && typeof profile.links === "object" ? profile.links : parseLinks(profile.linksText))
    );
    setLocationForm({
      city,
      location: country,
      city_obj,
    });

    setAboutForm({ bio: profile.bio || "", skillsText: (profile.skills || []).join(", ") });
  }, [profile, latestExp]);

  const reloadExtras = async () => {
    const extra = await fetchProfileExtras();
    onUpdate?.(prev => ({
      ...prev,
      experience: extra.experiences,
      education: extra.educations,
      trainings: extra.trainings,
      certifications: extra.certifications,
      memberships: extra.memberships,
    }));
  };

  const saveEducation = async () => {
    if (savingEdu) return;
    setEduErrors({ start: "", end: "" });
    setEduReqErrors({ school: "", degree: "", field: "", start: "" });
    const reqErrors = { school: "", degree: "", field: "", start: "" };
    if (!(eduForm.school || "").trim()) reqErrors.school = "School is required";
    if (!(eduForm.degree || "").trim()) reqErrors.degree = "Degree is required";
    if (!(eduForm.field || "").trim()) reqErrors.field = "Field of study is required.";
    if (!(eduForm.start || "").trim()) reqErrors.start = "Start year is required";
    if (Object.values(reqErrors).some(Boolean)) {
      setEduReqErrors(reqErrors);
      if (reqErrors.school || reqErrors.degree) {
        showToast?.("error", "Please fill School and Degree.");
      }
      return;
    }
    const now = new Date();
    if (isFutureYear(eduForm.start, now)) {
      setEduErrors((p) => ({ ...p, start: "Start year can't be in the future." }));
      return;
    }
    const startY = eduForm.start ? parseInt(eduForm.start, 10) : null;
    const endY = eduForm.end ? parseInt(eduForm.end, 10) : null;
    if (startY && endY && endY < startY) {
      setEduErrors((p) => ({ ...p, end: "End year cannot be before start year" }));
      return;
    }

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

    try {
      setExpReqErrors({
        org: "",
        position: "",
        location: "",
        relationship_to_org: "",
        work_schedule: "",
        career_stage: "",
        work_arrangement: "",
        start: "",
        end: "",
      });
      const reqErrors = {
        org: "",
        position: "",
        location: "",
        relationship_to_org: "",
        work_schedule: "",
        career_stage: "",
        work_arrangement: "",
        start: "",
        end: "",
      };
      if (!(expForm.org || "").trim()) reqErrors.org = "Organization is required";
      if (!(expForm.position || "").trim()) reqErrors.position = "Position is required";
      if (!(expForm.location || "").trim()) reqErrors.location = "Country is required";
      if (!(expForm.relationship_to_org || "").trim()) reqErrors.relationship_to_org = "Employment type is required";
      if (!(expForm.work_schedule || "").trim()) reqErrors.work_schedule = "Work schedule is required.";
      if (!(expForm.career_stage || "").trim()) reqErrors.career_stage = "Career stage is required.";
      if (!(expForm.work_arrangement || "").trim()) reqErrors.work_arrangement = "Work arrangement is required.";
      if (!(expForm.start || "").trim()) reqErrors.start = "Start date is required";
      if (Object.values(reqErrors).some(Boolean)) {
        setExpReqErrors(reqErrors);
        return;
      }
      const now = new Date();
      if (expForm.start && isFutureDate(expForm.start, now)) {
        setExpReqErrors((prev) => ({ ...prev, start: "Start date can't be in the future." }));
        return;
      }
      const isCurrent = !!expForm.current || !(expForm.end || "").trim();

      setSavingExp(true);
      const loc = [expForm.city, expForm.location].filter(Boolean).join(", ");
      const payload = {
        ...expForm,
        org: expForm.org,
        position: expForm.position,
        location: loc,
        start: expForm.start || null,
        end: isCurrent ? null : (expForm.end || null),
        current: isCurrent,
      };

      if (editExpId) await updateExperienceApi(editExpId, payload);
      else await createExperienceApi(payload);

      if (isCurrent && syncProfileLocation && loc) {
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

  const openAddTraining = () => {
    setEditTrainingId(null);
    setTrainingForm({
      program_title: "",
      provider: "",
      start_month: "",
      end_month: "",
      currently_ongoing: false,
      description: "",
      credential_url: "",
    });
    setTrainingOpen(true);
  };

  const openEditTraining = (t) => {
    setEditTrainingId(t.id);
    setTrainingForm({
      program_title: t.program_title || "",
      provider: t.provider || "",
      start_month: (t.start_date || "").slice(0, 7),
      end_month: (t.end_date || "").slice(0, 7),
      currently_ongoing: !!t.currently_ongoing,
      description: t.description || "",
      credential_url: t.credential_url || "",
    });
    setTrainingOpen(true);
  };

  const saveTraining = async () => {
    if (savingTraining) return;
    setTrainingReqErrors({
      program_title: "",
      provider: "",
      start_month: "",
      end_month: "",
    });
    const reqErrors = {
      program_title: "",
      provider: "",
      start_month: "",
      end_month: "",
    };
    if (!(trainingForm.program_title || "").trim()) reqErrors.program_title = "Program title is required";
    if (!(trainingForm.provider || "").trim()) reqErrors.provider = "Provider is required";
    if (!(trainingForm.start_month || "").trim()) {
      reqErrors.start_month = "Start month is required";
    } else {
      const now = new Date();
      if (isFutureMonth(trainingForm.start_month, now)) {
        reqErrors.start_month = "Start month can't be in the future.";
      }
    }
    if (Object.values(reqErrors).some(Boolean)) {
      setTrainingReqErrors(reqErrors);
      return;
    }
    setSavingTraining(true);
    try {
      const isOngoing = !!trainingForm.currently_ongoing || !(trainingForm.end_month || "").trim();
      const payload = {
        program_title: trainingForm.program_title,
        provider: trainingForm.provider,
        start_date: trainingForm.start_month ? `${trainingForm.start_month}-01` : null,
        end_date: isOngoing
          ? null
          : (trainingForm.end_month ? `${trainingForm.end_month}-01` : null),
        currently_ongoing: isOngoing,
        description: trainingForm.description || "",
        credential_url: trainingForm.credential_url || "",
      };

      if (editTrainingId) await updateTrainingApi(editTrainingId, payload);
      else await createTrainingApi(payload);

      showToast?.("success", editTrainingId ? "Training updated." : "Training added.");
      setTrainingOpen(false);
      setEditTrainingId(null);
      await reloadExtras();
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save training.");
    } finally {
      setSavingTraining(false);
    }
  };

  // --- Certifications ---
  const openAddCert = () => {
    setEditCertId(null);
    setCertForm({
      certification_name: "",
      issuing_organization: "",
      issue_month: "",
      expiration_month: "",
      no_expiration: false,
      credential_id: "",
      credential_url: "",
    });
    setCertOpen(true);
  };

  const openEditCert = (c) => {
    setEditCertId(c.id);
    setCertForm({
      certification_name: c.certification_name || "",
      issuing_organization: c.issuing_organization || "",
      issue_month: (c.issue_date || "").slice(0, 7),
      expiration_month: (c.expiration_date || "").slice(0, 7),
      no_expiration: !!c.no_expiration,
      credential_id: c.credential_id || "",
      credential_url: c.credential_url || "",
    });
    setCertOpen(true);
  };

  const saveCert = async () => {
    if (savingCert) return;
    setCertReqErrors({
      certification_name: "",
      issuing_organization: "",
      issue_month: "",
      expiration_month: "",
    });
    const reqErrors = {
      certification_name: "",
      issuing_organization: "",
      issue_month: "",
      expiration_month: "",
    };
    if (!(certForm.certification_name || "").trim()) reqErrors.certification_name = "Certification name is required";
    if (!(certForm.issuing_organization || "").trim()) reqErrors.issuing_organization = "Issuing organization is required";
    if (!(certForm.issue_month || "").trim()) {
      reqErrors.issue_month = "Issue month is required";
    } else {
      const now = new Date();
      if (isFutureMonth(certForm.issue_month, now)) {
        reqErrors.issue_month = "Issue month can't be in the future.";
      }
    }
    if (Object.values(reqErrors).some(Boolean)) {
      setCertReqErrors(reqErrors);
      return;
    }
    setSavingCert(true);
    try {
      const noExpiration = !!certForm.no_expiration || !(certForm.expiration_month || "").trim();
      const payload = {
        certification_name: certForm.certification_name,
        issuing_organization: certForm.issuing_organization,
        issue_date: certForm.issue_month ? `${certForm.issue_month}-01` : null,
        expiration_date: noExpiration
          ? null
          : (certForm.expiration_month ? `${certForm.expiration_month}-01` : null),
        no_expiration: noExpiration,
        credential_id: certForm.credential_id || "",
        credential_url: certForm.credential_url || "",
      };

      if (editCertId) await updateCertificationApi(editCertId, payload);
      else await createCertificationApi(payload);

      showToast?.("success", editCertId ? "Certification updated." : "Certification added.");
      setCertOpen(false);
      setEditCertId(null);
      await reloadExtras();
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save certification.");
    } finally {
      setSavingCert(false);
    }
  };

  // --- Memberships ---
  const openAddMember = () => {
    setEditMemberId(null);
    setMemberForm({
      organization_name: "",
      role_type: "Member",
      start_month: "",
      end_month: "",
      ongoing: false,
      membership_url: "",
    });
    setMemberOpen(true);
  };

  const openEditMember = (m) => {
    setEditMemberId(m.id);
    setMemberForm({
      organization_name: m.organization_name || "",
      role_type: m.role_type || "Member",
      start_month: (m.start_date || "").slice(0, 7),
      end_month: (m.end_date || "").slice(0, 7),
      ongoing: !!m.ongoing,
      membership_url: m.membership_url || "",
    });
    setMemberOpen(true);
  };

  const saveMember = async () => {
    if (savingMember) return;
    setMemberReqErrors({
      organization_name: "",
      role_type: "",
      start_month: "",
      end_month: "",
    });
    const reqErrors = {
      organization_name: "",
      role_type: "",
      start_month: "",
      end_month: "",
    };
    if (!(memberForm.organization_name || "").trim()) reqErrors.organization_name = "Organization name is required";
    if (!(memberForm.role_type || "").trim()) reqErrors.role_type = "Role is required";
    if (!(memberForm.start_month || "").trim()) {
      reqErrors.start_month = "Start month is required";
    } else {
      const now = new Date();
      if (isFutureMonth(memberForm.start_month, now)) {
        reqErrors.start_month = "Start month can't be in the future.";
      }
    }
    if (Object.values(reqErrors).some(Boolean)) {
      setMemberReqErrors(reqErrors);
      return;
    }
    setSavingMember(true);
    try {
      const isOngoing = !!memberForm.ongoing || !(memberForm.end_month || "").trim();
      const payload = {
        organization_name: memberForm.organization_name,
        role_type: memberForm.role_type || "",
        start_date: memberForm.start_month ? `${memberForm.start_month}-01` : null,
        end_date: isOngoing
          ? null
          : (memberForm.end_month ? `${memberForm.end_month}-01` : null),
        ongoing: isOngoing,
        membership_url: memberForm.membership_url || "",
      };

      if (editMemberId) await updateMembershipApi(editMemberId, payload);
      else await createMembershipApi(payload);

      showToast?.("success", editMemberId ? "Membership updated." : "Membership added.");
      setMemberOpen(false);
      setEditMemberId(null);
      await reloadExtras();
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save membership.");
    } finally {
      setSavingMember(false);
    }
  };


  const saveContact = async () => {
    if (savingContact) return;

    // Validate Socials
    const errors = { linkedin: "", x: "", facebook: "", instagram: "", github: "" };
    let hasError = false;
    const { socials } = contactForm;

    if (socials.linkedin && !SOCIAL_REGEX.linkedin.test(socials.linkedin)) {
      errors.linkedin = "Invalid LinkedIn URL";
      hasError = true;
    }
    if (socials.x && !SOCIAL_REGEX.x.test(socials.x)) {
      errors.x = "Invalid X/Twitter URL";
      hasError = true;
    }
    if (socials.facebook && !SOCIAL_REGEX.facebook.test(socials.facebook)) {
      errors.facebook = "Invalid Facebook URL";
      hasError = true;
    }
    if (socials.instagram && !SOCIAL_REGEX.instagram.test(socials.instagram)) {
      errors.instagram = "Invalid Instagram URL";
      hasError = true;
    }
    if (socials.github && !SOCIAL_REGEX.github.test(socials.github)) {
      errors.github = "Invalid GitHub URL";
      hasError = true;
    }

    if (hasError) {
      setSocialErrors(errors);
      showToast?.("error", "Please fix the social profile errors.");
      return;
    }

    // Validate Emails
    const newEmailErrors = {};
    let hasEmailError = false;
    contactForm.emails.forEach((item, idx) => {
      if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
        newEmailErrors[idx] = "Invalid email format";
        hasEmailError = true;
      }
    });

    if (hasEmailError) {
      setEmailErrors(newEmailErrors);
      showToast?.("error", "Please fix invalid emails");
      return;
    }

    // Validate Phones
    const newPhoneErrors = {};
    let hasPhoneError = false;
    // Regex: optional +, then 10 to 12 digits. Anchor start/end.
    const PHONE_REGEX = /^\+?[0-9]{10,12}$/;

    contactForm.phones.forEach((item, idx) => {
      const val = (item.number || "").trim();
      if (val && !PHONE_REGEX.test(val)) {
        newPhoneErrors[idx] = "Must be 10-12 digits (numeric only)";
        hasPhoneError = true;
      }
    });

    if (hasPhoneError) {
      setPhoneErrors(newPhoneErrors);
      showToast?.("error", "Please fix invalid phone numbers");
      return;
    }

    // Validate Websites
    const newWebsiteErrors = {};
    let hasWebsiteError = false;
    const WEBSITE_REGEX = /^https:\/\/([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

    contactForm.websites.forEach((item, idx) => {
      const url = (item.url || "").trim();
      const label = (item.label || "").trim();

      if (label && !url) {
        newWebsiteErrors[idx] = "URL is required";
        hasWebsiteError = true;
      } else if (url) {
        if (!url.toLowerCase().startsWith("https://")) {
          newWebsiteErrors[idx] = "Must start with https://";
          hasWebsiteError = true;
        } else if (!WEBSITE_REGEX.test(url)) {
          newWebsiteErrors[idx] = "Enter valid URL";
          hasWebsiteError = true;
        }
      }
    });

    if (hasWebsiteError) {
      setWebsiteErrors(newWebsiteErrors);
      showToast?.("error", "Please fix invalid website URLs");
      return;
    }

    // Validate Scheduler
    let schedulerErrorMsg = "";
    const schedulerUrl = (contactForm.scheduler?.url || "").trim();
    const schedulerLabel = (contactForm.scheduler?.label || "").trim();

    if (schedulerLabel && !schedulerUrl) {
      schedulerErrorMsg = "URL is required";
    } else if (schedulerUrl) {
      if (!schedulerUrl.toLowerCase().startsWith("https://")) {
        schedulerErrorMsg = "Must start with https://";
      } else if (!WEBSITE_REGEX.test(schedulerUrl)) {
        schedulerErrorMsg = "Enter valid URL";
      }
    }

    if (schedulerErrorMsg) {
      setSchedulerError(schedulerErrorMsg);
      showToast?.("error", "Please fix invalid scheduling link");
      return;
    }

    setSavingContact(true);

    try {
      const links = buildLinksWithContact(profile.links || {}, contactForm);
      const payload = {
        profile: { ...profile, location: profile.location || "", links },
      };
      await saveProfileToMe(payload);
      onUpdate?.({
        ...profile,
        links,
      });

      let successMsg = "Contact info saved";
      if (contactEditSection === "emails") successMsg = "Emails saved";
      else if (contactEditSection === "phones") successMsg = "Phone numbers saved";
      else if (contactEditSection === "socials") successMsg = "Social profiles saved";
      else if (contactEditSection === "websites") successMsg = "Websites saved";
      else if (contactEditSection === "scheduler") successMsg = "Scheduling link saved";

      showToast?.("success", successMsg);
      closeContactEditor();
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save contact info.");
    } finally {
      setSavingContact(false);
    }
  };

  const saveLocation = async () => {
    if (savingContact) return;
    setSavingContact(true);

    try {
      const loc = [locationForm.city, locationForm.location]
        .filter(Boolean)
        .join(", ");
      const payload = {
        email: profile.email,
        profile: { ...profile, location: loc, links: profile.links || {} },
      };
      await saveProfileToMe(payload);
      onUpdate?.({
        ...profile,
        location: loc,
      });
      showToast?.("success", "Location updated.");
      setLocationOpen(false);
    } catch (e) {
      console.error(e);
      showToast?.("error", "Failed to save location.");
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
      city_obj: null,
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
    const [city, country] = (x.location || "").includes(",")
      ? x.location.split(",").map(s => s.trim())
      : ["", x.location];

    const city_obj = city
      ? {
        name: city,
        admin1: "",
        country: country || "",
        country_code: "",
        latitude: null,
        longitude: null,
      }
      : null;

    setEditExpId(id);
    setExpForm({ ...x, city, location: country || "", city_obj }); // ✅ add city_obj
    setExpOpen(true);
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ flexWrap: { xs: "wrap", sm: "nowrap" }, alignItems: "flex-start" }}>
        {/* LEFT: About / Skills / Experience / Education */}
        <Grid item xs={12} sx={{ display: "flex", flexDirection: "column", gap: 2, flexBasis: { xs: "100%", sm: "345px", md: "540px", lg: "540px", xl: "540px" }, maxWidth: { xs: "100%", sm: "345px", md: "540px", lg: "540px", xl: "540px" }, flexShrink: 0, "@media (min-width:1024px) and (max-width:1024px)": { flexBasis: "330px", maxWidth: "330px" } }}>

          <VerificationCard status={profile.kyc_status} onVerify={onStartKYC} />

          <SectionCard title="About" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => { setAboutMode("description"); setAboutOpen(true); }}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>} sx={{ minHeight: 160, display: "flex", flexDirection: "column" }}>
            <Typography
              ref={aboutBioRef}
              variant="body2"
              sx={{
                display: aboutExpanded ? "block" : "-webkit-box",
                ...(aboutExpanded
                  ? {}
                  : {
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }),
                whiteSpace: "pre-wrap", // ✅ keep LinkedIn-style new lines/spaces
                wordBreak: "break-word",
              }}
            >
              {profile.bio || <Box sx={{ color: "text.secondary" }}>List your major duties...</Box>}
            </Typography>
            {Boolean((profile.bio || "").trim()) && (aboutExpanded || aboutHasOverflow) && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setAboutExpanded((v) => !v)}
                  sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600 }}
                >
                  {aboutExpanded ? "See less" : "See more"}
                </Button>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: "auto", alignSelf: "flex-end", display: "block", pt: 1 }}>{(profile.bio || "").length}/2000</Typography>
          </SectionCard>

          <SectionCard
            title="Skills"
            action={
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => handleOpenAbout("skills")}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {userSkills.length > 0 ? (
              <>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {userSkills.slice(0, 5).map((s) => (
                    <Chip
                      key={s.uri || s.id}
                      size="small"
                      label={formatSkillLabel(s)}
                      sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                    />
                  ))}
                  {userSkills.length > 5 && (
                    <Chip
                      size="small"
                      label={`+${userSkills.length - 5} more`}
                      onClick={() => setSkillsDialogOpen(true)}
                      sx={{ cursor: "pointer" }}
                    />
                  )}
                </Box>
                {/* See All Dialog */}
                <Dialog open={skillsDialogOpen} onClose={() => setSkillsDialogOpen(false)} fullWidth maxWidth="sm">
                  <DialogTitle>Skills</DialogTitle>
                  <DialogContent dividers>
                    <List>
                      {userSkills.map((s) => (
                        <ListItem key={s.uri || s.id} disableGutters>
                          <ListItemText
                            primary={s.label}
                            secondary={PROFICIENCY_LABELS[s.proficiency_level] || ""}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </DialogContent>
                  <DialogActions><Button onClick={() => setSkillsDialogOpen(false)}>Close</Button></DialogActions>
                </Dialog>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">Add your top skills.</Typography>
            )}
          </SectionCard>

          <SectionCard title="Experience" action={<Tooltip title="Add"><IconButton size="small" onClick={openAddExp}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            {(profile.experience?.length || 0) > 0 ? (
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
                            {dateRange(exp.start, exp.end, exp.current || !exp.end, "I currently work here")}
                            {exp.location ? ` · ${exp.location}` : ""}
                          </Typography>



                          {exp.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
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
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: "grey.200",
                    color: "grey.600",
                    mx: "auto",
                  }}
                >
                  <WorkOutlineIcon />
                </Avatar>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add your work experience.
                </Typography>

                <Box>
                  <Button
                    variant="contained"

                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={openAddExp}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            )}
          </SectionCard>

          <SectionCard title="Education" action={<Tooltip title="Add"><IconButton size="small" onClick={() => { setEditEduId(null); setEduForm({}); setEduFiles([]); setEduOpen(true); }}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
            {(profile.education?.length || 0) > 0 ? (
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
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: "grey.200", mx: "auto" }}>
                  <HistoryEduRoundedIcon />
                </Avatar>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add an education to your profile
                </Typography>

                <Box>
                  <Button
                    variant="contained"

                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={() => {
                      setEditEduId(null);
                      setEduForm({});
                      setEduFiles([]);
                      setEduOpen(true);
                    }}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            )}
          </SectionCard>

          <SectionCard
            title="Certifications & Licenses"
            action={
              <Tooltip title="Add">
                <IconButton size="small" onClick={openAddCert}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {(profile.certifications?.length || 0) > 0 ? (
              <List dense disablePadding>
                {profile.certifications.map((cert) => (
                  <ListItem
                    key={cert.id}
                    disableGutters
                    secondaryAction={
                      <Box sx={{ display: "flex" }}>
                        {cert.credential_url ? (
                          <Tooltip title="View credential">
                            <IconButton
                              size="small"
                              onClick={() => window.open(cert.credential_url, "_blank")}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}

                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setCertDeleteId(cert.id)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditCert(cert)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {cert.certification_name || "Certification"}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {cert.issuing_organization || "—"}
                          {cert.issue_date ? ` • Issued ${toMonthYear(cert.issue_date)}` : ""}
                          {(cert.no_expiration || !cert.expiration_date)
                            ? " • No expiration"
                            : ` • Expires ${toMonthYear(cert.expiration_date)}`}
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
                    color: "grey.600",
                    mx: "auto",
                  }}
                >
                  <VerifiedRoundedIcon />
                </Avatar>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add your certifications & licenses.
                </Typography>

                <Box>
                  <Button
                    variant="contained"

                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={openAddCert}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            )}
          </SectionCard>
          <SectionCard
            title="Memberships"
            action={
              <Tooltip title="Add">
                <IconButton size="small" onClick={openAddMember}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {(profile.memberships?.length || 0) > 0 ? (
              <List dense disablePadding>
                {profile.memberships.map((m) => (
                  <ListItem
                    key={m.id}
                    disableGutters
                    secondaryAction={
                      <Box sx={{ display: "flex" }}>
                        {m.membership_url ? (
                          <Tooltip title="Open link">
                            <IconButton
                              size="small"
                              onClick={() => window.open(m.membership_url, "_blank")}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}

                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setMemberDeleteId(m.id)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditMember(m)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {m.organization_name || "Organization"}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {m.role_type ? `${m.role_type}` : "Member"}
                          {m.start_date || m.end_date
                            ? ` • ${dateRange(m.start_date, m.end_date, !!m.ongoing || !m.end_date, "Currently ongoing")}`
                            : ""}
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
                    color: "grey.600",
                    mx: "auto",
                  }}
                >
                  <BusinessRoundedIcon />
                </Avatar>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add your memberships.
                </Typography>

                <Box>
                  <Button
                    variant="contained"

                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={openAddMember}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Grid>

        {/* RIGHT: Contact + New Sections */}
        <Grid item xs={12} sx={{ display: "flex", flexDirection: "column", gap: 2, flexBasis: { xs: "100%", sm: "345px", md: "320px", lg: "540px", xl: "540px" }, maxWidth: { xs: "100%", sm: "345px", md: "320px", lg: "540px", xl: "540px" }, flexShrink: 0, "@media (min-width:1024px) and (max-width:1024px)": { flexBasis: "330px", maxWidth: "330px" } }}>
          <SectionCard title="E-Mail" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => openContactEditor("emails")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 24, display: "flex", justifyContent: "center" }}>
                  <EmailIcon fontSize="small" />
                </Box>
                <Typography variant="body2">{profile.email || "\u2014"}</Typography>
                {renderVisibilityIcon(profile.links?.contact?.main_email?.visibility || "private")}
                <Chip label="Main" size="small" color="primary" variant="outlined" />
                {profile.links?.contact?.main_email?.type && (
                  <Typography variant="caption" color="text.secondary">
                    ({getEmailTypeLabel(profile.links.contact.main_email.type)})
                  </Typography>
                )}
              </Box>
              {emailPreview.map((item, idx) => (
                <Box key={`email-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 24, display: "flex", justifyContent: "center" }}>
                    <EmailIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </Box>
                  <Typography variant="body2">{item.email}</Typography>
                  {renderVisibilityIcon(item.visibility || "private")}
                  <Typography variant="caption" color="text.secondary">({getEmailTypeLabel(item.type)})</Typography>
                </Box>
              ))}
              {emailRemaining > 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                  +{emailRemaining} more
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>

          <SectionCard title="Phone Numbers" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => openContactEditor("phones")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {phonePreview.length ? (
                phonePreview.map((item, idx) => (
                  <Box key={`phone-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneIcon fontSize="small" />
                    <Typography variant="body2">{item.number}</Typography>
                    {renderVisibilityIcon(item.visibility || "private")}
                    <Typography variant="caption" color="text.secondary">({item.type})</Typography>
                    {item.primary ? <Chip label="Primary" size="small" variant="outlined" /> : null}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">\u2014</Typography>
              )}
              {phoneRemaining > 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                  +{phoneRemaining} more
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>

          <SectionCard title="Social Profiles" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => openContactEditor("socials")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
              {socialItems.filter((item) => item.url).length ? (
                socialItems.filter((item) => item.url).map((item) => (
                  <Tooltip key={item.key} title={item.label}>
                    <Box
                      component="a"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${item.label} profile`}
                      sx={{ color: "inherit", display: "flex" }}
                    >
                      {item.icon}
                    </Box>
                  </Tooltip>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  The member has not yet provided any social profiles.
                </Typography>
              )}
            </Stack>
          </SectionCard>

          <SectionCard title="Websites" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => openContactEditor("websites")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {websitePreview.length ? (
                websitePreview.map((item, idx) => (
                  <Box key={`site-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box component="a" href={item.url} target="_blank" rel="noopener noreferrer" sx={{ color: "inherit", display: "flex", textDecoration: "none", alignItems: "center", gap: 1 }}>
                      <LinkIcon fontSize="small" />
                      <Typography variant="body2" sx={{ textDecoration: "underline" }}>
                        {item.label || "Website"}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      component="a"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ wordBreak: "break-word", ml: "auto" }}
                    >
                      {item.url}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">\u2014</Typography>
              )}
              {websiteRemaining > 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                  +{websiteRemaining} more
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>

          <SectionCard title="Scheduling Link" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => openContactEditor("scheduler")}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              {contactLinks.scheduler?.url ? (
                <Box component="a" href={contactLinks.scheduler.url} target="_blank" rel="noopener noreferrer" sx={{ color: "inherit", display: "flex" }}>
                  <CalendarTodayIcon fontSize="small" />
                </Box>
              ) : (
                <CalendarTodayIcon fontSize="small" />
              )}
              {contactLinks.scheduler?.url ? (
                <>
                  <Box component="a" href={contactLinks.scheduler.url} target="_blank" rel="noopener noreferrer" sx={{ color: "inherit", display: "flex", textDecoration: "none", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ textDecoration: "underline" }}>
                      {contactLinks.scheduler.label || "Scheduler"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    component="a"
                    href={contactLinks.scheduler.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ wordBreak: "break-word", ml: "auto" }}
                  >
                    {contactLinks.scheduler.url}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">\u2014</Typography>
              )}
            </Box>
          </SectionCard>

          <SectionCard title="Location" action={<Tooltip title="Edit"><IconButton size="small" onClick={() => setLocationOpen(true)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>}>
            <Typography variant="subtitle2" color="text.secondary">City</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}><PlaceIcon fontSize="small" /><Typography variant="body2">{parsedLocation.city || "\u2014"}</Typography></Box>
            <Typography variant="subtitle2" color="text.secondary">Country</Typography>
            <Typography variant="body2" sx={{ pl: 3 }}>{parsedLocation.country || "\u2014"}</Typography>
          </SectionCard>

          <SectionCard
            title="Trainings & Executive Education"
            action={
              <Tooltip title="Add">
                <IconButton size="small" onClick={openAddTraining}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {(profile.trainings?.length || 0) > 0 ? (
              <List dense disablePadding>
                {profile.trainings.map((t) => (
                  <ListItem
                    key={t.id}
                    disableGutters
                    secondaryAction={
                      <Box sx={{ display: "flex" }}>
                        {t.credential_url ? (
                          <Tooltip title="View credential">
                            <IconButton
                              size="small"
                              onClick={() => window.open(t.credential_url, "_blank")}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}

                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setTrainingDeleteId(t.id)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditTraining(t)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {t.program_title || "Training"}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t.provider || "—"}
                            {t.start_date || t.end_date
                              ? ` • ${dateRange(t.start_date, t.end_date, !!t.currently_ongoing || !t.end_date, "Currently ongoing")}`
                              : ""}
                          </Typography>

                          {t.description ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {t.description}
                            </Typography>
                          ) : null}
                        </>
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
                    color: "grey.600",
                    mx: "auto",
                  }}
                >
                  <HistoryEduRoundedIcon />
                </Avatar>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add trainings or executive education programs.
                </Typography>

                <Box>
                  <Button
                    variant="contained"

                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={openAddTraining}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            )}
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
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: "grey.200",
                    color: "grey.600",
                    mx: "auto",
                  }}
                >
                  <VerifiedRoundedIcon />
                </Avatar>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add languages you know.
                </Typography>

                <Box>
                  <Button
                    variant="contained"

                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={openAddLanguage}
                  >
                    Create
                  </Button>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{aboutMode === "skills" ? "Edit skills" : "Edit description"}</DialogTitle>
        <DialogContent dividers>
          {aboutMode === "description" ? (
            <TextField multiline minRows={4} fullWidth value={aboutForm.bio} onChange={(e) => setAboutForm(f => ({ ...f, bio: e.target.value }))} />
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                We recommend adding your top 5 used skills and rating your proficiency.
              </Typography>

              <Autocomplete
                multiple
                options={skillOptions}
                value={aboutSkills}
                onChange={(_, newValue) => {
                  setAboutSkills((prev) => {
                    const merged = (newValue || []).map((skill) => {
                      const existing = prev.find((s) => s.uri === skill.uri);
                      return existing ? existing : { ...skill, proficiency_level: 3 };
                    });
                    return merged;
                  });
                }}
                inputValue={skillSearch}
                onInputChange={(_, newInputValue) => setSkillSearch(newInputValue)}
                getOptionLabel={(option) => {
                  if (!option) return "";
                  const lbl = option.label;
                  if (typeof lbl === "string") return lbl;
                  if (lbl && typeof lbl === "object") return lbl["en-us"] || lbl["en"] || Object.values(lbl)[0] || "";
                  return "";
                }}
                isOptionEqualToValue={(option, value) => option.uri === value.uri}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField {...params} label="Search skills" placeholder="Type to search ESCO skills..." fullWidth />
                )}
              />

              {aboutSkills.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Rate your level</Typography>
                  <Stack spacing={2}>
                    {aboutSkills.map((skill) => {
                      const lvl = skill.proficiency_level || 3;
                      return (
                        <Box key={skill.uri} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Typography variant="body2" sx={{ minWidth: 140, fontWeight: 500 }}>{skill.label}</Typography>
                          <Slider
                            value={lvl}
                            min={1} max={5} step={1} marks
                            sx={{ flex: 1 }}
                            onChange={(_, value) => handleSkillLevelChange(skill.uri, value)}
                          />
                          <Typography variant="caption" sx={{ width: 80, textAlign: "right", fontWeight: 600 }}>
                            {PROFICIENCY_LABELS[lvl] || ""}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAbout} disabled={savingAbout}>
            {savingAbout ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>



      {/* CONTACT DIALOG */}
      <Dialog open={contactOpen} onClose={closeContactEditor} fullWidth maxWidth="sm">
        <DialogTitle>
          {{
            all: "Edit Contact",
            emails: "Edit E-Mail",
            phones: "Edit Phone Numbers",
            socials: "Edit Social Profiles",
            websites: "Edit Websites",
            scheduler: "Edit Scheduling Link",
          }[contactEditSection] || "Edit Contact"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {[
              {
                key: "emails",
                node: (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Emails</Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      {/* Main Email Row */}
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <TextField
                            label="Main Email"
                            fullWidth
                            disabled
                            value={profile.email || ""}
                          />
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <TextField
                            select
                            label="Type"
                            fullWidth
                            value={contactForm.main_email?.type || ""}
                            SelectProps={{
                              displayEmpty: true,
                              renderValue: (selected) => {
                                if (selected === "") return "Uncategorized";
                                return CONTACT_EMAIL_TYPES.find(t => t.value === selected)?.label || selected;
                              }
                            }}
                            InputLabelProps={{ shrink: true }}
                            onChange={(e) =>
                              setContactForm((prev) => ({
                                ...prev,
                                main_email: { ...prev.main_email, type: e.target.value },
                              }))
                            }
                          >
                            {CONTACT_EMAIL_TYPES.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            select
                            label="Visibility"
                            fullWidth
                            value={contactForm.main_email?.visibility || "private"}
                            onChange={(e) =>
                              setContactForm((prev) => ({
                                ...prev,
                                main_email: { ...prev.main_email, visibility: e.target.value },
                              }))
                            }
                          >
                            {CONTACT_VISIBILITY_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        {/* No delete for main email */}
                      </Grid>

                      <Divider sx={{ my: 1 }} />

                      {contactForm.emails.map((item, idx) => (
                        <Grid container spacing={1} alignItems="center" key={`email-row-${idx}`}>
                          <Grid item xs={12} sm={5}>
                            <TextField
                              label="Email Address"
                              fullWidth
                              value={item.email}
                              error={!!emailErrors[idx]}
                              helperText={emailErrors[idx] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setContactForm((prev) => ({
                                  ...prev,
                                  emails: prev.emails.map((row, i) => (i === idx ? { ...row, email: val } : row)),
                                }));
                                if (emailErrors[idx]) {
                                  setEmailErrors((prev) => ({ ...prev, [idx]: "" }));
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              select
                              label="Type"
                              fullWidth
                              value={item.type}
                              onChange={(e) =>
                                setContactForm((prev) => ({
                                  ...prev,
                                  emails: prev.emails.map((row, i) => (i === idx ? { ...row, type: e.target.value } : row)),
                                }))
                              }
                            >
                              {CONTACT_EMAIL_TYPES.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              select
                              label="Visibility"
                              fullWidth
                              value={item.visibility}
                              onChange={(e) =>
                                setContactForm((prev) => ({
                                  ...prev,
                                  emails: prev.emails.map((row, i) => (i === idx ? { ...row, visibility: e.target.value } : row)),
                                }))
                              }
                            >
                              {CONTACT_VISIBILITY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={1} sm={1}>
                            <IconButton onClick={() => setContactForm((prev) => ({ ...prev, emails: prev.emails.filter((_, i) => i !== idx) }))}>
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Button
                        variant="outlined"
                        startIcon={<AddRoundedIcon fontSize="small" />}
                        onClick={() =>
                          setContactForm((prev) => ({
                            ...prev,
                            emails: [...prev.emails, { email: "", type: "professional", visibility: "private" }],
                          }))
                        }
                      >
                        Add email
                      </Button>
                    </Stack>
                  </Box>
                ),
              },
              {
                key: "phones",
                node: (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Phones</Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      {contactForm.phones.map((item, idx) => (
                        <Grid container spacing={1} alignItems="center" key={`phone-row-${idx}`}>
                          <Grid item xs={12} sm={5}>
                            <TextField
                              label="Number"
                              fullWidth
                              value={item.number}
                              error={!!phoneErrors[idx]}
                              helperText={phoneErrors[idx] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setContactForm((prev) => ({
                                  ...prev,
                                  phones: prev.phones.map((row, i) => (i === idx ? { ...row, number: val } : row)),
                                }));
                                if (phoneErrors[idx]) {
                                  setPhoneErrors((prev) => ({ ...prev, [idx]: "" }));
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <TextField
                              select
                              label="Type"
                              fullWidth
                              value={item.type}
                              onChange={(e) =>
                                setContactForm((prev) => ({
                                  ...prev,
                                  phones: prev.phones.map((row, i) => (i === idx ? { ...row, type: e.target.value } : row)),
                                }))
                              }
                            >
                              {CONTACT_PHONE_TYPES.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <TextField
                              select
                              label="Visibility"
                              fullWidth
                              value={item.visibility}
                              onChange={(e) =>
                                setContactForm((prev) => ({
                                  ...prev,
                                  phones: prev.phones.map((row, i) => (i === idx ? { ...row, visibility: e.target.value } : row)),
                                }))
                              }
                            >
                              {CONTACT_VISIBILITY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={8} sm={2}>
                            <FormControlLabel
                              control={
                                <Radio
                                  checked={!!item.primary}
                                  onChange={() =>
                                    setContactForm((prev) => ({
                                      ...prev,
                                      phones: prev.phones.map((row, i) => ({ ...row, primary: i === idx })),
                                    }))
                                  }
                                />
                              }
                              label="Primary"
                            />
                          </Grid>
                          <Grid item xs={4} sm={1}>
                            <IconButton onClick={() => setContactForm((prev) => ({ ...prev, phones: prev.phones.filter((_, i) => i !== idx) }))}>
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Button
                        variant="outlined"
                        startIcon={<AddRoundedIcon fontSize="small" />}
                        onClick={() =>
                          setContactForm((prev) => ({
                            ...prev,
                            phones: [...prev.phones, { number: "", type: "professional", visibility: "private", primary: prev.phones.length === 0 }],
                          }))
                        }
                      >
                        Add phone
                      </Button>
                    </Stack>
                  </Box>
                ),
              },
              {
                key: "socials",
                node: (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Social Profiles</Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      <TextField
                        label="LinkedIn URL"
                        fullWidth
                        value={contactForm.socials.linkedin}
                        error={!!socialErrors.linkedin}
                        helperText={socialErrors.linkedin || ""}
                        onChange={(e) => {
                          setContactForm((prev) => ({ ...prev, socials: { ...prev.socials, linkedin: e.target.value } }));
                          setSocialErrors((prev) => ({ ...prev, linkedin: "" }));
                        }}
                      />
                      <TextField
                        label="X URL"
                        fullWidth
                        value={contactForm.socials.x}
                        error={!!socialErrors.x}
                        helperText={socialErrors.x || ""}
                        onChange={(e) => {
                          setContactForm((prev) => ({ ...prev, socials: { ...prev.socials, x: e.target.value } }));
                          setSocialErrors((prev) => ({ ...prev, x: "" }));
                        }}
                      />
                      <TextField
                        label="Facebook URL"
                        fullWidth
                        value={contactForm.socials.facebook}
                        error={!!socialErrors.facebook}
                        helperText={socialErrors.facebook || ""}
                        onChange={(e) => {
                          setContactForm((prev) => ({ ...prev, socials: { ...prev.socials, facebook: e.target.value } }));
                          setSocialErrors((prev) => ({ ...prev, facebook: "" }));
                        }}
                      />
                      <TextField
                        label="Instagram URL"
                        fullWidth
                        value={contactForm.socials.instagram}
                        error={!!socialErrors.instagram}
                        helperText={socialErrors.instagram || ""}
                        onChange={(e) => {
                          setContactForm((prev) => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }));
                          setSocialErrors((prev) => ({ ...prev, instagram: "" }));
                        }}
                      />
                      <TextField
                        label="GitHub URL"
                        fullWidth
                        value={contactForm.socials.github}
                        error={!!socialErrors.github}
                        helperText={socialErrors.github || ""}
                        onChange={(e) => {
                          setContactForm((prev) => ({ ...prev, socials: { ...prev.socials, github: e.target.value } }));
                          setSocialErrors((prev) => ({ ...prev, github: "" }));
                        }}
                      />
                    </Stack>
                  </Box>
                ),
              },
              {
                key: "websites",
                node: (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Websites</Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      {contactForm.websites.map((item, idx) => (
                        <Grid container spacing={1} alignItems="center" key={`site-row-${idx}`}>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              label="Label"
                              fullWidth
                              value={item.label}
                              onChange={(e) =>
                                setContactForm((prev) => ({
                                  ...prev,
                                  websites: prev.websites.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row)),
                                }))
                              }
                            />
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <TextField
                              label="URL"
                              fullWidth
                              value={item.url}
                              error={!!websiteErrors[idx]}
                              helperText={websiteErrors[idx] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setContactForm((prev) => ({
                                  ...prev,
                                  websites: prev.websites.map((row, i) => (i === idx ? { ...row, url: val } : row)),
                                }));
                                if (websiteErrors[idx]) {
                                  setWebsiteErrors((prev) => ({ ...prev, [idx]: "" }));
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={7} sm={2}>
                            <TextField
                              select
                              label="Visibility"
                              fullWidth
                              value={item.visibility}
                              onChange={(e) =>
                                setContactForm((prev) => ({
                                  ...prev,
                                  websites: prev.websites.map((row, i) => (i === idx ? { ...row, visibility: e.target.value } : row)),
                                }))
                              }
                            >
                              {CONTACT_VISIBILITY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={5} sm={1}>
                            <IconButton onClick={() => setContactForm((prev) => ({ ...prev, websites: prev.websites.filter((_, i) => i !== idx) }))}>
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Button
                        variant="outlined"
                        startIcon={<AddRoundedIcon fontSize="small" />}
                        onClick={() =>
                          setContactForm((prev) => ({
                            ...prev,
                            websites: [...prev.websites, { label: "", url: "", visibility: "private" }],
                          }))
                        }
                      >
                        Add website
                      </Button>
                    </Stack>
                  </Box>
                ),
              },
              {
                key: "scheduler",
                node: (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Scheduler</Typography>
                    <Grid container spacing={1} sx={{ mt: 1 }} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Label"
                          fullWidth
                          value={contactForm.scheduler.label}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              scheduler: { ...prev.scheduler, label: e.target.value },
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label="URL"
                          fullWidth
                          value={contactForm.scheduler.url}
                          error={!!schedulerError}
                          helperText={schedulerError}
                          onChange={(e) => {
                            setContactForm((prev) => ({
                              ...prev,
                              scheduler: { ...prev.scheduler, url: e.target.value },
                            }));
                            setSchedulerError("");
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          select
                          label="Visibility"
                          fullWidth
                          value={contactForm.scheduler.visibility}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              scheduler: { ...prev.scheduler, visibility: e.target.value },
                            }))
                          }
                        >
                          {CONTACT_VISIBILITY_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Box>
                ),
              },
            ].filter(s => contactEditSection === "all" || s.key === contactEditSection).map((s, idx, arr) => (
              <React.Fragment key={s.key}>
                {s.node}
                {idx < arr.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeContactEditor}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveContact}
            disabled={savingContact}
          >
            {savingContact ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={locationOpen} onClose={() => setLocationOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Location</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <CityAutocompleteOffline
              label="City"
              value={locationForm.city_obj || null}
              countryCode={getSelectedCountry({ location: locationForm.location })?.code || ""}
              onSelect={(place) => {
                setLocationForm((prev) => ({
                  ...prev,
                  city_obj: place,
                  city: place?.name || "",
                  location: place?.country || "",
                }));
              }}
            />
            <Autocomplete
              options={COUNTRY_OPTIONS}
              value={getSelectedCountry({ location: locationForm.location })}
              getOptionLabel={(o) => o?.label || ""}
              disabled={!!locationForm.city_obj}
              onChange={(_, v) =>
                setLocationForm((prev) => ({ ...prev, location: v?.label || "" }))
              }
              renderInput={(p) => <TextField {...p} label="Country" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveLocation}
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

      <Dialog open={eduOpen} onClose={() => { setEduOpen(false); setEduErrors({ start: "", end: "" }); setEduReqErrors({ school: "", degree: "", field: "", start: "" }); }} fullWidth maxWidth="sm">
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
              error={!!eduReqErrors.school}
              helperText={eduReqErrors.school || ""}
            />
            <TextField label="Degree" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} error={!!eduReqErrors.degree} helperText={eduReqErrors.degree || ""} />
            <Autocomplete
              freeSolo
              options={[...FIELD_OF_STUDY_OPTIONS, "Other"]}
              value={eduForm.field}
              onChange={(_, v) => setEduForm((f) => ({ ...f, field: v || "" }))}
              onInputChange={(event, newInput) => {
                if (event && event.type === "change") {
                  setEduForm((f) => ({ ...f, field: newInput }));
                }
              }}
              renderInput={(p) => (
                <TextField
                  {...p}
                  label="Field of Study *"
                  error={!!eduReqErrors.field}
                  helperText={eduReqErrors.field || "Pick from list or type your own (Other)."}
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 2 }}><TextField label="Start Year" type="number" value={eduForm.start} onChange={(e) => setEduForm({ ...eduForm, start: e.target.value })} error={!!(eduReqErrors.start || eduErrors.start)} helperText={eduReqErrors.start || eduErrors.start || ""} /><TextField label="End Year" type="number" value={eduForm.end} onChange={(e) => setEduForm({ ...eduForm, end: e.target.value })} error={!!eduErrors.end} helperText={eduErrors.end || ""} /></Box>
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
      <Dialog open={expOpen} onClose={() => { setExpOpen(false); setExpReqErrors({ org: "", position: "", location: "", relationship_to_org: "", work_schedule: "", career_stage: "", work_arrangement: "", start: "", end: "" }); }} fullWidth maxWidth="sm">
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
              error={!!expReqErrors.org}
              helperText={expReqErrors.org || ""}
            />

            {/* 2. Position / Title */}
            <TextField
              label="Position / Title"
              fullWidth
              value={expForm.position || ""}
              onChange={(e) =>
                setExpForm((prev) => ({ ...prev, position: e.target.value }))
              }
              error={!!expReqErrors.position}
              helperText={expReqErrors.position || ""}
            />

            {/* 6. Location: City + Country (same pattern you already use) */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <CityAutocompleteOffline
                  label="City"
                  value={expForm.city_obj || null}
                  countryCode={getSelectedCountry({ location: expForm.location })?.code || ""} // optional filter
                  onSelect={(place) => {
                    setExpForm((prev) => ({
                      ...prev,
                      city_obj: place,
                      city: place?.name || "",
                      location: place?.country || "", // country label
                    }));
                  }}
                />
              </Box>

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
                  <TextField {...params} label="Country" error={!!expReqErrors.location} helperText={expReqErrors.location || ""} />
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
              error={!!expReqErrors.relationship_to_org}
              helperText={expReqErrors.relationship_to_org || ""}
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
              error={!!expReqErrors.work_schedule}
              helperText={expReqErrors.work_schedule || ""}
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
              error={!!expReqErrors.career_stage}
              helperText={expReqErrors.career_stage || ""}
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
              error={!!expReqErrors.work_arrangement}
              helperText={expReqErrors.work_arrangement || ""}
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
                error={!!expReqErrors.start}
                helperText={expReqErrors.start || ""}
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
                error={!!expReqErrors.end}
                helperText={expReqErrors.end || ""}
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

      {/* Delete Education Document ? Modern Confirmation Dialog */}
      <Dialog
        open={deleteDocDialog.open}
        onClose={deletingEdu ? undefined : handleCloseDeleteDoc}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
              {deleteDocDialog.doc?.filename || "this item"}
            </Box>
            .
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDoc} disabled={deletingEdu} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteDoc}
            disabled={deletingEdu}
          >
            {deletingEdu ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Training Add/Edit */}
      <Dialog open={trainingOpen} onClose={() => setTrainingOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editTrainingId ? "Edit Training" : "Add Training"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Program / Training Title"
              fullWidth
              value={trainingForm.program_title || ""}
              onChange={(e) => setTrainingForm((p) => ({ ...p, program_title: e.target.value }))}
              error={!!trainingReqErrors.program_title}
              helperText={trainingReqErrors.program_title || ""}
            />
            <TextField
              label="Provider / Institution"
              fullWidth
              value={trainingForm.provider || ""}
              onChange={(e) => setTrainingForm((p) => ({ ...p, provider: e.target.value }))}
              error={!!trainingReqErrors.provider}
              helperText={trainingReqErrors.provider || ""}
            />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label="Start Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={trainingForm.start_month || ""}
                onChange={(e) => setTrainingForm((p) => ({ ...p, start_month: e.target.value }))}
                error={!!trainingReqErrors.start_month}
                helperText={trainingReqErrors.start_month || ""}
              />
              <TextField
                label="End Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                disabled={!!trainingForm.currently_ongoing}
                fullWidth
                value={trainingForm.end_month || ""}
                onChange={(e) => setTrainingForm((p) => ({ ...p, end_month: e.target.value }))}
                error={!!trainingReqErrors.end_month}
                helperText={trainingReqErrors.end_month || ""}
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!trainingForm.currently_ongoing}
                  onChange={(e) =>
                    setTrainingForm((p) => ({
                      ...p,
                      currently_ongoing: e.target.checked,
                      end_month: e.target.checked ? "" : p.end_month,
                    }))
                  }
                />
              }
              label="Currently ongoing"
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              fullWidth
              value={trainingForm.description || ""}
              onChange={(e) => setTrainingForm((p) => ({ ...p, description: e.target.value }))}
            />
            <TextField
              label="Credential URL"
              fullWidth
              value={trainingForm.credential_url || ""}
              onChange={(e) => setTrainingForm((p) => ({ ...p, credential_url: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrainingOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveTraining} disabled={savingTraining}>
            {savingTraining ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Certification Add/Edit */}
      <Dialog open={certOpen} onClose={() => setCertOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editCertId ? "Edit Certification" : "Add Certification"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Certification Name"
              fullWidth
              value={certForm.certification_name || ""}
              onChange={(e) => setCertForm((p) => ({ ...p, certification_name: e.target.value }))}
              error={!!certReqErrors.certification_name}
              helperText={certReqErrors.certification_name || ""}
            />
            <TextField
              label="Issuing Organization"
              fullWidth
              value={certForm.issuing_organization || ""}
              onChange={(e) => setCertForm((p) => ({ ...p, issuing_organization: e.target.value }))}
              error={!!certReqErrors.issuing_organization}
              helperText={certReqErrors.issuing_organization || ""}
            />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label="Issue Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={certForm.issue_month || ""}
                onChange={(e) => setCertForm((p) => ({ ...p, issue_month: e.target.value }))}
                error={!!certReqErrors.issue_month}
                helperText={certReqErrors.issue_month || ""}
              />
              <TextField
                label="Expiration Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                disabled={!!certForm.no_expiration}
                fullWidth
                value={certForm.expiration_month || ""}
                onChange={(e) => setCertForm((p) => ({ ...p, expiration_month: e.target.value }))}
                error={!!certReqErrors.expiration_month}
                helperText={certReqErrors.expiration_month || ""}
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!certForm.no_expiration}
                  onChange={(e) =>
                    setCertForm((p) => ({
                      ...p,
                      no_expiration: e.target.checked,
                      expiration_month: e.target.checked ? "" : p.expiration_month,
                    }))
                  }
                />
              }
              label="No Expiration"
            />
            <TextField
              label="Credential ID"
              fullWidth
              value={certForm.credential_id || ""}
              onChange={(e) => setCertForm((p) => ({ ...p, credential_id: e.target.value }))}
            />
            <TextField
              label="Credential URL"
              fullWidth
              value={certForm.credential_url || ""}
              onChange={(e) => setCertForm((p) => ({ ...p, credential_url: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCert} disabled={savingCert}>
            {savingCert ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Membership Add/Edit */}
      <Dialog open={memberOpen} onClose={() => setMemberOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editMemberId ? "Edit Membership" : "Add Membership"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Organization / Community Name"
              fullWidth
              value={memberForm.organization_name || ""}
              onChange={(e) => setMemberForm((p) => ({ ...p, organization_name: e.target.value }))}
              error={!!memberReqErrors.organization_name}
              helperText={memberReqErrors.organization_name || ""}
            />

            <TextField
              select
              label="Role / Type"
              fullWidth
              value={memberForm.role_type || "Member"}
              onChange={(e) => setMemberForm((p) => ({ ...p, role_type: e.target.value }))}
              error={!!memberReqErrors.role_type}
              helperText={memberReqErrors.role_type || ""}
            >
              <MenuItem value="Member">Member</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Volunteer">Volunteer</MenuItem>
              <MenuItem value="Fellow">Fellow</MenuItem>
            </TextField>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label="Start Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={memberForm.start_month || ""}
                onChange={(e) => setMemberForm((p) => ({ ...p, start_month: e.target.value }))}
                error={!!memberReqErrors.start_month}
                helperText={memberReqErrors.start_month || ""}
              />
              <TextField
                label="End Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                disabled={!!memberForm.ongoing}
                fullWidth
                value={memberForm.end_month || ""}
                onChange={(e) => setMemberForm((p) => ({ ...p, end_month: e.target.value }))}
                error={!!memberReqErrors.end_month}
                helperText={memberReqErrors.end_month || ""}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={!!memberForm.ongoing}
                  onChange={(e) =>
                    setMemberForm((p) => ({
                      ...p,
                      ongoing: e.target.checked,
                      end_month: e.target.checked ? "" : p.end_month,
                    }))
                  }
                />
              }
              label="Ongoing"
            />

            <TextField
              label="Membership URL"
              fullWidth
              value={memberForm.membership_url || ""}
              onChange={(e) => setMemberForm((p) => ({ ...p, membership_url: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveMember} disabled={savingMember}>
            {savingMember ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Delete Dialogs */}

      <Dialog open={!!trainingDeleteId} onClose={() => setTrainingDeleteId(null)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {trainingToDelete?.program_title || "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrainingDeleteId(null)} disabled={deletingTraining} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deletingTraining}
            onClick={async () => {
              if (deletingTraining) return;
              setDeletingTraining(true);
              try {
                await deleteTrainingApi(trainingDeleteId);
                await reloadExtras();
                showToast?.("success", "Training deleted.");
                setTrainingDeleteId(null);
              } catch (e) {
                console.error(e);
                showToast?.("error", "Failed to delete training.");
              } finally {
                setDeletingTraining(false);
              }
            }}
            variant="contained"
          >
            {deletingTraining ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!certDeleteId} onClose={() => setCertDeleteId(null)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {certToDelete?.certification_name || "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertDeleteId(null)} disabled={deletingCert} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deletingCert}
            onClick={async () => {
              if (deletingCert) return;
              setDeletingCert(true);
              try {
                await deleteCertificationApi(certDeleteId);
                await reloadExtras();
                showToast?.("success", "Certification deleted.");
                setCertDeleteId(null);
              } catch (e) {
                console.error(e);
                showToast?.("error", "Failed to delete certification.");
              } finally {
                setDeletingCert(false);
              }
            }}
            variant="contained"
          >
            {deletingCert ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!memberDeleteId} onClose={() => setMemberDeleteId(null)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {memberToDelete?.organization_name || "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDeleteId(null)} disabled={deletingMember} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deletingMember}
            onClick={async () => {
              if (deletingMember) return;
              setDeletingMember(true);
              try {
                await deleteMembershipApi(memberDeleteId);
                await reloadExtras();
                showToast?.("success", "Membership deleted.");
                setMemberDeleteId(null);
              } catch (e) {
                console.error(e);
                showToast?.("error", "Failed to delete membership.");
              } finally {
                setDeletingMember(false);
              }
            }}
            variant="contained"
          >
            {deletingMember ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!eduDeleteId} onClose={() => setEduDeleteId(null)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {eduToDelete ? `${eduToDelete.school || ""} ${eduToDelete.degree || ""}`.trim() || "this item" : "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEduDeleteId(null)} disabled={deletingEdu} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deletingEdu}
            onClick={async () => {
              if (deletingEdu) return;
              const idToDelete = eduDeleteId;
              setEduDeleteId(null);
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
            variant="contained"
          >
            {deletingEdu ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!expDeleteId} onClose={() => setExpDeleteId(null)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineRoundedIcon color="error" fontSize="small" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {expToDelete ? `${expToDelete.org || expToDelete.community_name || ""} ${expToDelete.position || ""}`.trim() || "this item" : "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpDeleteId(null)} disabled={deletingExp} variant="outlined" color="inherit">
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
            variant="contained"
          >
            {deletingExp ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
