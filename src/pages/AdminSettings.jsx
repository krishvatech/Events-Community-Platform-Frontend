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
  CircularProgress,
  ListItemAvatar,
  Slider,
  Skeleton,
  Radio,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import GitHubIcon from "@mui/icons-material/GitHub";
import PhoneIcon from "@mui/icons-material/Phone";
import LinkIcon from "@mui/icons-material/Link";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { startKYC, submitNameChangeRequest } from "../utils/api";
import { isFutureDate, isFutureMonth, isFutureYear } from "../utils/dateValidation";
import { isOwnerUser } from "../utils/adminRole";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CloseIcon from '@mui/icons-material/Close'; // Used in chips

// --- API helpers ---
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  "";

const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// --- Language Constants ---
const CEFR_OPTIONS = [
  { value: "A1", label: "Beginner (A1)", desc: "Understands and produces basic phrases." },
  { value: "A2", label: "Elementary (A2)", desc: "Simple communication and frequently used expressions." },
  { value: "B1", label: "Limited Working (B1)", desc: "Handles routine tasks." },
  { value: "B2", label: "Professional Working (B2)", desc: "Effective operational use." },
  { value: "C1", label: "Full Professional (C1)", desc: "Fluency on complex subjects." },
  { value: "C2", label: "Native/Bilingual (C2)", desc: "Mastery level." },
];

const ACQUISITION_OPTIONS = [
  { value: "mother_tongue", label: "Mother Tongue" },
  { value: "formal_education", label: "Formal Education" },
  { value: "professional_immersion", label: "Professional Immersion" },
  { value: "self_taught", label: "Self-Taught" },
];

const EMPTY_LANG_FORM = {
  iso_obj: null,
  primary_dialect: "",
  proficiency_cefr: "B2",
  acquisition_context: "",
  notes: ""
};

// --- Language Autocomplete Component ---
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

async function uploadEducationDocApi(educationId, file) {
  const fd = new FormData();
  fd.append("education", educationId);
  fd.append("file", file);
  // Uses API_ROOT defined in this file
  const r = await fetch(`${API_ROOT}/auth/me/education-documents/`, {
    method: "POST",
    headers: authHeader(), // Let browser set Content-Type for FormData
    body: fd
  });
  if (!r.ok) throw new Error("Failed to upload document");
  return await r.json();
}

async function deleteEducationDocApi(docId) {
  const r = await fetch(`${API_ROOT}/auth/me/education-documents/${docId}/`, {
    method: "DELETE",
    headers: authHeader()
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete document");
}

async function addTrainingApi(payload) {
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
  return await r.json();
}

async function deleteTrainingApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/trainings/${id}/`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete training");
}

async function addCertificationApi(payload) {
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
  return await r.json();
}

async function deleteCertificationApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/certifications/${id}/`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete certification");
}

async function addMembershipApi(payload) {
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
  return await r.json();
}

async function deleteMembershipApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/memberships/${id}/`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete membership");
}

/**
 * BACKEND HOOKS
 */
async function fetchAdminProfile() {
  const url = `${API_ROOT}/users/me/`;
  const r = await fetch(url, {
    headers: { accept: "application/json", ...authHeader() },
  });
  if (!r.ok) throw new Error("Failed to load profile");
  return r.json();
}

async function updateAdminProfile(profilePayload) {
  const url = `${API_ROOT}/users/me/`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ profile: profilePayload }),
  });
  if (!r.ok) throw new Error("Failed to save profile");
  return r.json();
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
  fd.append("avatar", file, file.name);
  const r = await fetch(`${API_ROOT}/users/me/avatar/`, {
    method: "POST",
    headers: { ...authHeader() },
    body: fd,
  });
  if (!r.ok) throw new Error("Avatar upload failed");
  return r.json();
}

async function deleteAvatar() {
  try {
    const r = await fetch(`${API_ROOT}/users/me/avatar/`, {
      method: "DELETE",
      headers: { ...authHeader() },
    });
    if (r.ok) return;
  } catch (e) { }

  const r2 = await fetch(`${API_ROOT}/users/me/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ profile: { user_image: null } }),
  });
  if (!r2.ok) throw new Error("Avatar delete failed");
}


// -------------------- Constants --------------------
const SECTOR_OPTIONS = [
  "Private Sector", "Public Sector", "Non-Profit", "Government", "Education",
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Healthcare", "Education", "Manufacturing",
  "Retail", "Media", "Real Estate", "Transportation", "Energy",
];

const EMPLOYEE_COUNT_OPTIONS = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000-5000", "5000+",
];

const CITY_OPTIONS = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata",
  "Pune", "Surat", "Jaipur", "Lucknow", "Nagpur", "Indore", "Thane", "Bhopal",
  "Vadodara", "Nashik", "Rajkot", "Visakhapatnam", "Patna",
];

isoCountries.registerLocale(enLocale);

const flagEmoji = (code) =>
  code
    ? code
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    : "";

const COUNTRY_OPTIONS = Object.entries(
  isoCountries.getNames("en", { select: "official" })
).map(([code, label]) => ({ code, label, emoji: flagEmoji(code) }));

const getSelectedCountry = (obj) => {
  if (!obj?.location) return null;
  const loc = String(obj.location);
  const byCode = COUNTRY_OPTIONS.find((o) => o.code === loc);
  if (byCode) return byCode;
  return (
    COUNTRY_OPTIONS.find(
      (o) => (o.label || "").toLowerCase() === loc.toLowerCase()
    ) || null
  );
};

const EMPTY_EDU_FORM = {
  school: "", degree: "", field: "", start: "", end: "", grade: "",
};

const SCHOOL_OPTIONS = [
  "Harvard University", "Stanford University", "Indian Institute of Technology Bombay",
  "Indian Institute of Management Ahmedabad", "University of Oxford", "University of Cambridge",
  "Massachusetts Institute of Technology (MIT)", "National University of Singapore",
  "University of Mumbai", "University of Delhi",
];

const FIELD_OF_STUDY_OPTIONS = [
  "Computer Science", "Information Technology", "Electronics & Communication Engineering",
  "Mechanical Engineering", "Civil Engineering", "Business Administration", "Finance",
  "Marketing", "Economics", "Psychology", "Law", "Medicine", "Pharmacy", "Design", "Data Science",
];

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
        // ✅ Offline city search (your backend)
        const url = `${API_ROOT}/auth/cities/search/?q=${encodeURIComponent(q)}&limit=10`;

        const r = await fetch(url, {
          signal: controller.signal,
          headers: authHeader(), // ✅ required (IsAuthenticated endpoint)
        });
        if (!r.ok) return;

        const data = await r.json();

        const results = (data?.results || [])
          .map((x) => ({
            name: x.name || "",
            admin1: x.is_other ? "Other / Not listed" : "",
            country: x.country_name || "",
            country_code: x.country_code || "",
            latitude: x.lat,
            longitude: x.lng,
            label: x.label,
          }))
          .filter((x) => x.name && x.country);

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
      getOptionLabel={(o) => o?.name || ""}
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


function parseSkills(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j.map(String);
  } catch { }
  return v.split(",").map((s) => s.trim()).filter(Boolean);
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

const CONTACT_PHONE_TYPES = [
  { value: "professional", label: "Professional" },
  { value: "personal", label: "Personal" },
];

const CONTACT_VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "contacts", label: "Contacts" },
  { value: "public", label: "Public" },
];

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
    phones: [],
    websites: [],
    scheduler: { label: "Calendly", url: "", visibility: "private" },
    socials: { linkedin: "", x: "", facebook: "", instagram: "", github: "" },
    main_email: { type: "", visibility: "private" },
  };
}

function buildContactFormFromLinks(links) {
  const contact = links?.contact && typeof links.contact === "object" ? links.contact : {};
  const emails = Array.isArray(contact.emails) ? contact.emails : [];
  const phones = Array.isArray(contact.phones) ? contact.phones : [];
  const websites = Array.isArray(contact.websites) ? contact.websites : [];
  const scheduler = contact.scheduler && typeof contact.scheduler === "object" ? contact.scheduler : {};

  // Handle main_email
  let mainEmail = { type: "", visibility: "private" };
  if (contact.main_email && typeof contact.main_email === "object") {
    mainEmail = {
      type: contact.main_email.type || "",
      visibility: contact.main_email.visibility || "private",
    };
  }

  return {
    emails: emails.map((item) => ({
      email: item?.email || "",
      type: item?.type || "professional",
      visibility: item?.visibility || "private",
    })),
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
      url: scheduler?.url || "",
      visibility: scheduler?.visibility || "private",
    },
    socials: {
      linkedin: links?.linkedin || "",
      x: links?.x || "",
      facebook: links?.facebook || "",
      instagram: links?.instagram || "",
      github: links?.github || "",
    },
    main_email: mainEmail,
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

  // Handle main_email
  const mainEmail = {
    type: contactForm?.main_email?.type || "",
    visibility: contactForm?.main_email?.visibility || "private",
  };

  const contact = {};
  if (emails.length) contact.emails = emails;
  if (phones.length) contact.phones = phones;
  if (websites.length) contact.websites = websites;
  if (scheduler) contact.scheduler = scheduler;
  contact.main_email = mainEmail;

  if (Object.keys(contact).length) newLinks.contact = contact;
  else delete newLinks.contact;

  return newLinks;
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
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>}
        action={action}
        sx={{ pb: 0.5, "& .MuiCardHeader-action": { alignSelf: "center" } }}
      />
      <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
    </Card>
  );
}

function SectionSkeleton({ minHeight = 140, lines = 3 }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        width: "100%",
        minHeight,
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      {/* Title line */}
      <Skeleton variant="text" width="40%" height={26} sx={{ mb: 1 }} />

      {/* Body lines */}
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          variant="text"
          width={`${70 - idx * 10}%`}
          sx={{ mb: 0.5 }}
        />
      ))}
    </Card>
  );
}

const Label = ({ children, sx }) => (
  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, ...sx }}>
    {children}
  </Typography>
);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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


// -----------------------------------------------------------------------------
// Company Autocomplete Component
// -----------------------------------------------------------------------------
function CompanyAutocomplete({ value, onChange, error, helperText }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    let active = true;

    if (inputValue === "") {
      setOptions(value ? [{ name: value }] : []);
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
      value={value ? { name: value } : null}
      onChange={(event, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else if (newValue && newValue.inputValue) {
          onChange(newValue.inputValue);
        } else if (newValue && newValue.name) {
          onChange(newValue.name);
        } else {
          onChange("");
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
          label="Company Name *"
          fullWidth
          sx={{ mb: 2 }}
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
// Basic Info Dialog (Identity)
// -----------------------------------------------------------------------------
function BasicInfoDialog({
  open,
  onClose,
  profile,
  onRequestNameChange,
  onStartKYC,
}) {
  const fullName =
    profile?.full_name ||
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  const initial = fullName ? fullName[0].toUpperCase() : "?";

  const kycStatus = profile?.kyc_status || "not_started";
  const isVerified = kycStatus === "approved";
  const isPending = kycStatus === "pending" || kycStatus === "review";

  const statusLabel =
    kycStatus === "approved"
      ? "Verified"
      : kycStatus === "pending" || kycStatus === "review"
        ? "Verification in progress"
        : "Not verified";

  const statusColor =
    kycStatus === "approved"
      ? "success"
      : kycStatus === "pending" || kycStatus === "review"
        ? "warning"
        : "default";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Identity Details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Avatar + name + verified chip */}
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{ width: 48, height: 48, bgcolor: "primary.main" }}
            >
              {initial}
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {fullName || "Your legal name"}
                </Typography>
                {isVerified && (
                  <Chip
                    size="small"

                    icon={<VerifiedRoundedIcon sx={{ fontSize: 18 }} />}
                    label="Verified"
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {profile?.legal_name_locked
                  ? "Your legal name is locked. To change it, submit a Name Change Request."
                  : "Verify your identity once. After verification, your legal name will be locked."}
              </Typography>
            </Box>
          </Stack>

          {/* Name fields (read-only) */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="First Name"
              fullWidth
              size="small"
              value={profile?.first_name || ""}
              disabled
            />
            <TextField
              label="Last Name"
              fullWidth
              size="small"
              value={profile?.last_name || ""}
              disabled
            />
          </Box>

          {/* KYC status + actions */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 1,
            }}
          >
            <Chip
              size="small"
              label={statusLabel}
              color={statusColor}
              variant={statusColor === "default" ? "outlined" : "filled"}
            />

            <Box sx={{ display: "flex", gap: 1.5 }}>
              {!isVerified && !isPending && (
                <Button variant="contained" onClick={onStartKYC}>
                  Verify Identity
                </Button>
              )}

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
// Name Change Request Dialog (Updated to use showToast instead of alert)
// -----------------------------------------------------------------------------
function NameChangeDialog({ open, onClose, currentNames, showToast }) {
  const [form, setForm] = React.useState({
    new_first_name: "", new_middle_name: "", new_last_name: "", reason: "",
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
      showToast(
        "error",
        "First Name, Last Name, and Reason are required."
      );
      return;
    }

    setLoading(true);
    try {
      const data = await submitNameChangeRequest(form);

      showToast("success", "Request submitted.");

      if (data?.kyc_url) {
        showToast("success", "Redirecting to verification…");
        setTimeout(() => {
          window.location.href = data.kyc_url;
        }, 1200);
      } else {
        onClose();
      }
    } catch (e) {
      showToast(
        "error",
        e?.message || "Failed to submit name change request."
      );
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


// -------------------- Component --------------------

export default function AdminSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({
    open: false,
    type: "success",
    msg: "",
  });

  const showNotification = (type, msg) => {
    setToast({ open: true, type, msg });
  };

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
    kyc_status: "not_started",
    legal_name_locked: false,
  });

  // About Summary (See more)
  const aboutBioRef = React.useRef(null);
  const [aboutBioExpanded, setAboutBioExpanded] = React.useState(false);
  const [aboutBioHasOverflow, setAboutBioHasOverflow] = React.useState(false);

  const measureAboutBioOverflow = React.useCallback(() => {
    const el = aboutBioRef.current;
    if (!el) return;

    // Measure only while collapsed (otherwise clientHeight == scrollHeight)
    if (aboutBioExpanded) return;

    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    setAboutBioHasOverflow(hasOverflow);
  }, [aboutBioExpanded]);

  React.useEffect(() => {
    // Optional: when bio changes (after edit), reset to collapsed
    setAboutBioExpanded(false);
  }, [profile.bio]);

  React.useEffect(() => {
    requestAnimationFrame(measureAboutBioOverflow);
  }, [profile.bio, aboutBioExpanded, measureAboutBioOverflow]);

  React.useEffect(() => {
    window.addEventListener("resize", measureAboutBioOverflow);
    return () => window.removeEventListener("resize", measureAboutBioOverflow);
  }, [measureAboutBioOverflow]);

  // --- Languages State ---
  const [langList, setLangList] = React.useState([]);
  const [langOpen, setLangOpen] = React.useState(false);
  const [langSaving, setLangSaving] = React.useState(false);
  const [editLangId, setEditLangId] = React.useState(null);
  const [langCertFiles, setLangCertFiles] = React.useState([]);
  const [existingCertificates, setExistingCertificates] = React.useState([]);
  const [langForm, setLangForm] = React.useState(EMPTY_LANG_FORM);

  // 1. Load Languages
  async function loadLanguages() {
    try {
      const r = await fetch(`${API_ROOT}/auth/me/languages/`, { headers: authHeader() });
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setLangList(list);
      }
    } catch (e) { console.error(e); }
  }

  // 2. Open Add Dialog
  function openAddLanguage() {
    setEditLangId(null);
    setLangForm(EMPTY_LANG_FORM);
    setLangCertFiles([]);
    setExistingCertificates([]);
    setLangOpen(true);
  }

  // 3. Open Edit Dialog
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

  // 4. Save Language
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

      // Upload Certificates if any
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

  // 7. Load on mount
  React.useEffect(() => {
    loadLanguages();
  }, []);

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactEditSection, setContactEditSection] = React.useState("all");
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState(() => createEmptyContactForm());
  const [socialErrors, setSocialErrors] = React.useState({ linkedin: "", x: "", facebook: "", instagram: "", github: "" });
  const [locationForm, setLocationForm] = React.useState({ city: "", country: "" });

  const [eduList, setEduList] = React.useState([]);
  const [expList, setExpList] = React.useState([]);
  const [trainingList, setTrainingList] = React.useState([]);
  const [certList, setCertList] = React.useState([]);
  const [memberList, setMemberList] = React.useState([]);

  const fileRef = React.useRef(null);
  const avatarFileRef = React.useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isOwner = React.useMemo(() => {
    try { return typeof isOwnerUser === "function" ? isOwnerUser() : false; } catch { return false; }
  }, []);

  const avatarUrl = React.useMemo(() => {
    const raw = profile?.user_image_url || "";
    return raw ? `${raw}${raw.includes("?") ? "&" : "?"}_=${Date.now()}` : "";
  }, [profile?.user_image_url]);

  // --- dialogs & forms ---
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [aboutMode, setAboutMode] = React.useState("description");
  const [aboutForm, setAboutForm] = React.useState({ bio: "", skillsText: "" });

  const [eduOpen, setEduOpen] = React.useState(false);
  const [expOpen, setExpOpen] = React.useState(false);

  const [trainingOpen, setTrainingOpen] = React.useState(false);
  const [certOpen, setCertOpen] = React.useState(false);
  const [memberOpen, setMemberOpen] = React.useState(false);

  const [trainingForm, setTrainingForm] = React.useState({
    program_title: "",
    provider: "",
    start_month: "",
    end_month: "",
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
  const [certForm, setCertForm] = React.useState({
    certification_name: "",
    issuing_organization: "",
    issue_month: "",
    expiration_month: "",
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
  const [memberForm, setMemberForm] = React.useState({
    organization_name: "",
    role_type: "Member",
    start_month: "",
    end_month: "",
    ongoing: false,
    membership_url: "",
  });
  const [memberReqErrors, setMemberReqErrors] = React.useState({
    organization_name: "",
    role_type: "",
    start_month: "",
    end_month: "",
  });

  const [editEduId, setEditEduId] = React.useState(null);
  const [editExpId, setEditExpId] = React.useState(null);
  const [editTrainingId, setEditTrainingId] = React.useState(null);
  const [editCertId, setEditCertId] = React.useState(null);
  const [editMemberId, setEditMemberId] = React.useState(null);

  const [eduForm, setEduForm] = React.useState(EMPTY_EDU_FORM);
  const [eduErrors, setEduErrors] = React.useState({ start: "", end: "" });
  const [eduReqErrors, setEduReqErrors] = React.useState({ school: "", degree: "", field: "", start: "" });
  const [eduFiles, setEduFiles] = React.useState([]);


  // Name Change Request State
  const [nameChangeOpen, setNameChangeOpen] = React.useState(false);
  const [basicInfoOpen, setBasicInfoOpen] = React.useState(false);

  const [userSkills, setUserSkills] = React.useState([]);
  const [skillOptions, setSkillOptions] = React.useState([]); // Autocomplete options
  const [skillSearch, setSkillSearch] = React.useState("");   // Search input
  const skillSearchTimeout = React.useRef(null);              // Debounce timer
  const [aboutSkills, setAboutSkills] = React.useState([]);   // Temporary state for Dialog
  const [skillsDialogOpen, setSkillsDialogOpen] = React.useState(false); // "See more" dialog

  // NEW: education document delete dialog state
  const [deleteDocDialog, setDeleteDocDialog] = React.useState({
    open: false,
    doc: null,
  });
  const [deletingDoc, setDeletingDoc] = React.useState(false);

  const handleAskDeleteDoc = (doc) => {
    setDeleteDocDialog({ open: true, doc });
  };

  const handleCloseDeleteDoc = () => {
    if (deletingDoc) return;
    setDeleteDocDialog({ open: false, doc: null });
  };

  const handleConfirmDeleteDoc = async () => {
    const doc = deleteDocDialog.doc;
    if (!doc) return;

    setDeletingDoc(true);
    try {
      await deleteEducationDocApi(doc.id);

      // Remove from current eduForm state
      setEduForm((prev) => ({
        ...prev,
        documents: (prev.documents || []).filter((d) => d.id !== doc.id),
      }));

      showNotification("success", "File deleted");
      await loadExtras(); // refresh list
    } catch (e) {
      console.error(e);
      showNotification("error", "Failed to delete file");
    } finally {
      setDeletingDoc(false);
      setDeleteDocDialog({ open: false, doc: null });
    }
  };

  // --- Skills API Helpers ---

  const PROFICIENCY_LABELS = {
    1: "Beginner",
    2: "Basic",
    3: "Intermediate",
    4: "Advanced",
    5: "Expert",
  };

  // 1. Load User Skills
  async function loadUserSkills() {
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
        .filter((s) => s.uri && s.label)
        .sort((a, b) => (b.proficiency_level || 0) - (a.proficiency_level || 0));

      setUserSkills(mapped);

      // Sync legacy text field just in case
      setProfile((prev) => ({
        ...prev,
        skillsText: mapped.map((s) => s.label).join(", "),
      }));
    } catch (e) {
      console.error("Error loading skills", e);
    }
  }

  // 2. Fetch ESCO Options (Autocomplete)
  async function fetchSkillOptions(query) {
    const q = (query || "").trim();
    try {
      const r = await fetch(
        `${API_ROOT}/auth/skills/search?q=${encodeURIComponent(q)}`,
        { headers: { "Content-Type": "application/json", ...authHeader() } }
      );
      if (!r.ok) return;
      const data = await r.json();

      const cleaned = (data.results || []).map((item) => {
        const lbl = item.label;
        let label = "";
        if (typeof lbl === "string") label = lbl;
        else if (lbl && typeof lbl === "object") {
          label = lbl["en-us"] || lbl["en"] || Object.values(lbl)[0] || "";
        }
        return { uri: item.uri, label };
      }).filter((x) => x.label);

      setSkillOptions(cleaned);
    } catch (e) {
      console.error("Error searching skills", e);
    }
  }

  // 3. Sync Logic (Save)
  async function syncUserSkillsWithBackend(selectedSkills) {
    try {
      // A. Get current backend skills to find deletions
      const r = await fetch(`${API_ROOT}/auth/me/skills/`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!r.ok) return;
      const data = await r.json();
      const current = Array.isArray(data) ? data : data.results || [];

      const selectedByUri = new Map((selectedSkills || []).map((s) => [s.uri, s]));

      // B. Delete removed skills
      const deletions = current.filter((item) => !selectedByUri.has(item.skill?.uri));
      await Promise.all(
        deletions.map((item) =>
          fetch(`${API_ROOT}/auth/me/skills/${item.id}/`, {
            method: "DELETE",
            headers: authHeader(),
          })
        )
      );

      // C. Create/Update selected skills
      await Promise.all(
        (selectedSkills || []).map((s) =>
          fetch(`${API_ROOT}/auth/me/skills/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({
              skill_uri: s.uri,
              preferred_label: s.label,
              proficiency_level: s.proficiency_level ?? 3,
              assessment_type: "self",
            }),
          })
        )
      );

      // Reload to refresh UI
      await loadUserSkills();
    } catch (err) {
      console.error("Error syncing skills", err);
    }
  }

  // Helper for slider change
  const handleSkillLevelChange = (uri, level) => {
    const numeric = Array.isArray(level) ? level[0] : level;
    setAboutSkills((prev) =>
      prev.map((s) => (s.uri === uri ? { ...s, proficiency_level: numeric } : s))
    );
  };

  // Load skills on mount
  React.useEffect(() => {
    loadUserSkills();
  }, []);

  // Handle search debounce
  React.useEffect(() => {
    if (skillSearchTimeout.current) clearTimeout(skillSearchTimeout.current);

    const q = (skillSearch || "").trim();
    if (!q) {
      fetchSkillOptions(""); // Load defaults if empty
    } else {
      skillSearchTimeout.current = setTimeout(() => {
        fetchSkillOptions(q);
      }, 300);
    }
    return () => { if (skillSearchTimeout.current) clearTimeout(skillSearchTimeout.current); };
  }, [skillSearch]);


  const emptyExpForm = {
    org: "", position: "", city: "", location: "", start: "", end: "", current: false,
    employment_type: "full_time", work_schedule: "", relationship_to_org: "",
    career_stage: "", work_arrangement: "", description: "", exit_reason: "",
    compensation_type: "", sector: "",
    industry: "",
    number_of_employees: "",
  };

  const [expForm, setExpForm] = React.useState(emptyExpForm);
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
  const [syncProfileLocation, setSyncProfileLocation] = React.useState(false);

  // --- Work Details State ---
  const [workOpen, setWorkOpen] = React.useState(false);
  const [workForm, setWorkForm] = React.useState({ sector: "", industry: "", employees: "" });

  // --- Latest Experience Helper ---
  const latestExp = React.useMemo(() => {
    if (!expList || expList.length === 0) return null;
    return expList[0];
  }, [expList]);

  // --- Work Line (Displayed under name) ---
  const workLine = React.useMemo(() => {
    if (latestExp) {
      const org = latestExp.community_name || latestExp.org || "";
      return `${latestExp.position} ${org ? `– ${org}` : ""}`;
    }
    if (profile.job_title || profile.company) {
      return [profile.job_title, profile.company].filter(Boolean).join(" – ");
    }
    return profile.headline || "";
  }, [latestExp, profile]);
  const parsedLocation = React.useMemo(
    () => parseLocationString(profile.location),
    [profile.location]
  );
  const contactLinks = React.useMemo(
    () => buildContactFormFromLinks(parseLinks(profile.linksText)),
    [profile.linksText]
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
    { key: "x", label: "X", icon: <TwitterIcon fontSize="small" />, url: contactLinks.socials.x },
    { key: "facebook", label: "Facebook", icon: <FacebookIcon fontSize="small" />, url: contactLinks.socials.facebook },
    { key: "instagram", label: "Instagram", icon: <InstagramIcon fontSize="small" />, url: contactLinks.socials.instagram },
    { key: "github", label: "GitHub", icon: <GitHubIcon fontSize="small" />, url: contactLinks.socials.github },
  ];

  // Sync Work Form
  React.useEffect(() => {
    if (latestExp) {
      setWorkForm({
        sector: latestExp.sector || "",
        industry: latestExp.industry || "",
        employees: latestExp.number_of_employees || "",
      });
    } else {
      setWorkForm({ sector: "", industry: "", employees: "" });
    }
  }, [latestExp]);

  const shouldShowExitReason = () => {
    if (!expForm.end || expForm.current) return false;
    const endDate = new Date(expForm.end);
    const today = new Date();
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  function buildLocationFromForm(form) {
    const city = (form.city || "").trim();
    const country = (form.location || "").trim();
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return "";
  }
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

  const [confirm, setConfirm] = React.useState({ open: false, type: null, id: null, label: "" });
  const [avatarDialogOpen, setAvatarDialogOpen] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState(null);
  const [avatarPreview, setAvatarPreview] = React.useState("");
  const [avatarMode, setAvatarMode] = React.useState(null);

  // ---------- HANDLERS ----------

  const saveAboutWork = async () => {
    if (!latestExp) {
      showNotification("error", "Please add an experience entry first.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        sector: workForm.sector,
        industry: workForm.industry,
        number_of_employees: workForm.employees,
      };

      const r = await fetch(`${API_ROOT}/auth/me/experiences/${latestExp.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error("Failed to update work details");

      showNotification("success", "Work details updated");
      setWorkOpen(false);
      await loadExtras();
    } catch (e) {
      showNotification("error", e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openAbout = (mode = "description") => {
    if (!profile) return;
    setAboutMode(mode);

    if (mode === "skills") {
      setAboutForm({ bio: profile.bio || "", skillsText: profile.skillsText || "" });
      // Load current skills into the dialog editing state
      setAboutSkills([...userSkills]);
    } else {
      setAboutForm({ bio: profile.bio || "", skillsText: profile.skillsText || "" });
    }
    setAboutOpen(true);
  };

  const openContactEditor = (section = "all") => {
    if (!profile) return;
    const links = parseLinks(profile.linksText);
    setContactForm(buildContactFormFromLinks(links));
    setContactEditSection(section);
    setContactOpen(true);
    setSocialErrors({ linkedin: "", x: "", facebook: "", instagram: "", github: "" });
  };

  const closeContactEditor = () => {
    setContactOpen(false);
    setContactEditSection("all");
  };

  const openLocation = () => {
    if (!profile) return;
    const { city, country } = parseLocationString(profile.location);
    setLocationForm({ city, country });
    setLocationOpen(true);
  };

  const saveContact = async () => {
    try {
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
        showNotification("error", "Please fix the social profile errors.");
        return;
      }

      setSaving(true);
      const links = buildLinksWithContact(parseLinks(profile.linksText), contactForm);
      const userPayload = { first_name: (profile.first_name || "").trim(), last_name: (profile.last_name || "").trim() };
      const profilePayload = { job_title: (profile.job_title || "").trim(), location: profile.location, links };

      await updateAdminContact(userPayload, profilePayload);
      setProfile((prev) => ({
        ...prev, ...userPayload, job_title: profilePayload.job_title,
        links, linksText: JSON.stringify(links),
      }));
      closeContactEditor();
      showNotification("success", "Contact updated");
    } catch (err) {
      showNotification("error", "Failed to update contact");
    } finally { setSaving(false); }
  };

  const saveLocation = async () => {
    try {
      setSaving(true);
      const city = (locationForm.city || "").trim();
      const country = (locationForm.country || "").trim();
      const combinedLocation = [city, country].filter(Boolean).join(", ");
      const profilePayload = {
        location: combinedLocation,
      };
      await updateAdminContact({}, profilePayload);
      setProfile((prev) => ({
        ...prev,
        location: combinedLocation,
      }));
      setLocationOpen(false);
      showNotification("success", "Location updated");
    } catch (err) {
      showNotification("error", "Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async () => {
    try {
      setSaving(true);

      // 1. Save standard profile fields (Bio, etc)
      // Note: We remove 'skills' from here as it's now handled via syncUserSkillsWithBackend
      const payload = {
        bio: aboutForm.bio,
        links: parseLinks(profile.linksText)
      };
      await updateAdminProfile(payload);
      setProfile((p) => ({ ...p, bio: aboutForm.bio }));

      // 2. If we were editing skills, sync them specifically
      if (aboutMode === "skills") {
        await syncUserSkillsWithBackend(aboutSkills);
        // Update the local text representation for fallback
        const labels = aboutSkills.map(s => s.label).join(", ");
        setProfile(p => ({ ...p, skillsText: labels }));
      }

      showNotification("success", "Updated successfully");
      setAboutOpen(false);
    } catch (e) {
      showNotification("error", e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openAddExperience = () => { setEditExpId(null); setExpForm(emptyExpForm); setSyncProfileLocation(false); setExpOpen(true); };

  const onEditExperience = (item) => {
    const loc = (item.location || "").trim();
    let city = "", country = "";
    if (loc) {
      const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 1) {
        const maybeCountry = getSelectedCountry({ location: parts[0] });
        if (maybeCountry) { country = maybeCountry.label; city = ""; } else { city = parts[0]; country = ""; }
      } else if (parts.length >= 2) {
        city = parts[0];
        const lastPart = parts[parts.length - 1];
        const maybeCountry = getSelectedCountry({ location: lastPart });
        country = maybeCountry ? maybeCountry.label : lastPart;
      }
    }
    setEditExpId(item.id);
    setExpForm({
      org: item.org || item.community_name || "", position: item.position || "",
      city, location: country, start: item.start || item.start_date || "",
      end: item.end || item.end_date || "", current: !!(item.current || item.currently_work_here),
      employment_type: item.employment_type || "full_time", work_schedule: item.work_schedule || "",
      relationship_to_org: item.relationship_to_org || "", career_stage: item.career_stage || "",
      work_arrangement: item.work_arrangement || "", description: item.description || "",
      exit_reason: item.exit_reason || "", compensation_type: item.compensation_type || "",
      sector: item.sector || "",
      industry: item.industry || "",
      number_of_employees: item.number_of_employees || "",
    });
    setSyncProfileLocation(false);
    setExpOpen(true);
  };

  const onEditEducation = (item) => {
    const toYear = (d) => (d ? String(d).slice(0, 4) : "");
    setEditEduId(item.id);
    setEduForm({
      school: item.school || "",
      degree: item.degree || "",
      field: item.field_of_study || "",
      start: toYear(item.start_date),
      end: toYear(item.end_date),
      grade: item.grade || "",
      documents: item.documents || [] // Add this
    });
    setEduFiles([]); // Add this
    setEduErrors({ start: "", end: "" });
    setEduOpen(true);
  };
  const askDeleteLanguage = (id, label) => {
    setConfirm({ open: true, type: "language", id, label });
  };

  const askDeleteCertificate = (id, label) => {
    setConfirm({ open: true, type: "certificate", id, label });
  };
  const askDeleteEducation = (id, label = "") => { setConfirm({ open: true, type: "edu", id, label }); };
  const askDeleteExperience = (id, label = "") => { setConfirm({ open: true, type: "exp", id, label }); };
  const askDeleteTraining = (id, label = "") => { setConfirm({ open: true, type: "training", id, label }); };
  const askDeleteCert = (id, label = "") => { setConfirm({ open: true, type: "cert", id, label }); };
  const askDeleteMember = (id, label = "") => { setConfirm({ open: true, type: "member", id, label }); };
  const closeConfirm = () => { setConfirm({ open: false, type: null, id: null, label: "" }); };

  // --- Updated Delete Logic ---
  const doConfirmDelete = async () => {
    const { type, id } = confirm;
    if (!type || !id || saving) return;

    setSaving(true);
    try {
      let url = "";
      if (type === "edu") url = `${API_ROOT}/auth/me/educations/${id}/`;
      else if (type === "exp") url = `${API_ROOT}/auth/me/experiences/${id}/`;
      else if (type === "language") url = `${API_ROOT}/auth/me/languages/${id}/`;
      else if (type === "certificate") url = `${API_ROOT}/auth/me/language-certificates/${id}/`;
      else if (type === "training") url = `${API_ROOT}/auth/me/trainings/${id}/`;
      else if (type === "cert") url = `${API_ROOT}/auth/me/certifications/${id}/`;
      else if (type === "member") url = `${API_ROOT}/auth/me/memberships/${id}/`;

      const r = await fetch(url, {
        method: "DELETE",
        headers: authHeader(),
      });

      if (!r.ok && r.status !== 204) throw new Error("Delete failed");

      // --- Success UI Updates ---
      if (type === "language") {
        showNotification("success", "Language deleted");
        loadLanguages(); // Refresh language list
      }
      else if (type === "certificate") {
        showNotification("success", "Certificate deleted");
        // Remove from local state immediately so user sees it gone
        setExistingCertificates((prev) => prev.filter((c) => c.id !== id));
        loadLanguages(); // Refresh background list
      }
      else if (type === "training") {
        showNotification("success", "Training deleted");
        await loadExtras();
      }
      else if (type === "cert") {
        showNotification("success", "Certification deleted");
        await loadExtras();
      }
      else if (type === "member") {
        showNotification("success", "Membership deleted");
        await loadExtras();
      }
      else {
        // Existing Edu/Exp handling
        showNotification("success", type === "edu" ? "Education deleted" : "Experience deleted");
        await loadExtras();
      }
    } catch (e) {
      showNotification("error", e?.message || "Delete failed");
    } finally {
      setSaving(false);
      closeConfirm();
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
      start_month: t.start_date ? String(t.start_date).slice(0, 7) : "",
      end_month: t.end_date ? String(t.end_date).slice(0, 7) : "",
      currently_ongoing: !!t.currently_ongoing,
      description: t.description || "",
      credential_url: t.credential_url || "",
    });
    setTrainingOpen(true);
  };

  const saveTraining = async () => {
    if (saving) return;
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
    setSaving(true);
    try {
      const isOngoing = !!trainingForm.currently_ongoing || !(trainingForm.end_month || "").trim();
      const payload = {
        program_title: trainingForm.program_title || "",
        provider: trainingForm.provider || "",
        start_date: trainingForm.start_month ? `${trainingForm.start_month}-01` : null,
        end_date: isOngoing
          ? null
          : (trainingForm.end_month ? `${trainingForm.end_month}-01` : null),
        currently_ongoing: isOngoing,
        description: trainingForm.description || "",
        credential_url: trainingForm.credential_url || "",
      };
      if (editTrainingId) {
        await updateTrainingApi(editTrainingId, payload);
      } else {
        await addTrainingApi(payload);
      }
      showNotification("success", editTrainingId ? "Training updated" : "Training added");
      setTrainingOpen(false);
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
      await loadExtras();
    } catch (e) {
      showNotification("error", e?.message || "Failed to save training");
    } finally {
      setSaving(false);
    }
  };

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
      issue_month: c.issue_date ? String(c.issue_date).slice(0, 7) : "",
      expiration_month: c.expiration_date ? String(c.expiration_date).slice(0, 7) : "",
      no_expiration: !!c.no_expiration,
      credential_id: c.credential_id || "",
      credential_url: c.credential_url || "",
    });
    setCertOpen(true);
  };

  const saveCert = async () => {
    if (saving) return;
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
    setSaving(true);
    try {
      const noExpiration = !!certForm.no_expiration || !(certForm.expiration_month || "").trim();
      const payload = {
        certification_name: certForm.certification_name || "",
        issuing_organization: certForm.issuing_organization || "",
        issue_date: certForm.issue_month ? `${certForm.issue_month}-01` : null,
        expiration_date: noExpiration
          ? null
          : (certForm.expiration_month ? `${certForm.expiration_month}-01` : null),
        no_expiration: noExpiration,
        credential_id: certForm.credential_id || "",
        credential_url: certForm.credential_url || "",
      };
      if (editCertId) {
        await updateCertificationApi(editCertId, payload);
      } else {
        await addCertificationApi(payload);
      }
      showNotification("success", editCertId ? "Certification updated" : "Certification added");
      setCertOpen(false);
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
      await loadExtras();
    } catch (e) {
      showNotification("error", e?.message || "Failed to save certification");
    } finally {
      setSaving(false);
    }
  };

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
      start_month: m.start_date ? String(m.start_date).slice(0, 7) : "",
      end_month: m.end_date ? String(m.end_date).slice(0, 7) : "",
      ongoing: !!m.ongoing,
      membership_url: m.membership_url || "",
    });
    setMemberOpen(true);
  };

  const saveMember = async () => {
    if (saving) return;
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
    setSaving(true);
    try {
      const isOngoing = !!memberForm.ongoing || !(memberForm.end_month || "").trim();
      const payload = {
        organization_name: memberForm.organization_name || "",
        role_type: memberForm.role_type || "Member",
        start_date: memberForm.start_month ? `${memberForm.start_month}-01` : null,
        end_date: isOngoing
          ? null
          : (memberForm.end_month ? `${memberForm.end_month}-01` : null),
        ongoing: isOngoing,
        membership_url: memberForm.membership_url || "",
      };
      if (editMemberId) {
        await updateMembershipApi(editMemberId, payload);
      } else {
        await addMembershipApi(payload);
      }
      showNotification("success", editMemberId ? "Membership updated" : "Membership added");
      setMemberOpen(false);
      setEditMemberId(null);
      setMemberForm({
        organization_name: "",
        role_type: "Member",
        start_month: "",
        end_month: "",
        ongoing: false,
        membership_url: "",
      });
      await loadExtras();
    } catch (e) {
      showNotification("error", e?.message || "Failed to save membership");
    } finally {
      setSaving(false);
    }
  };

  const openAvatarDialog = () => { setAvatarMode(null); setAvatarFile(null); setAvatarPreview(avatarUrl || ""); setAvatarDialogOpen(true); };
  const closeAvatarDialog = () => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarDialogOpen(false); setAvatarFile(null); setAvatarPreview(""); setAvatarMode(null);
  };
  const onAvatarFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (avatarPreview && avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); setAvatarMode("upload");
    if (avatarFileRef.current) avatarFileRef.current.value = "";
  };
  const handleAvatarRemoveClick = () => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null); setAvatarPreview(""); setAvatarMode("remove");
  };
  const saveAvatarDialog = async () => {
    if (!avatarMode) { closeAvatarDialog(); return; }
    try {
      setSaving(true);
      if (avatarMode === "upload" && avatarFile) {
        const res = await uploadAvatar(avatarFile);
        setProfile((p) => ({ ...p, user_image_url: res.user_image_url || p.user_image_url }));
        showNotification("success", "Profile image updated");
      } else if (avatarMode === "remove") {
        await deleteAvatar();
        setProfile((p) => ({ ...p, user_image_url: "" }));
        showNotification("success", "Profile image removed");
      }
      closeAvatarDialog();
    } catch (err) { showNotification("error", err?.message || "Failed to update profile photo"); } finally { setSaving(false); }
  };

  // ---------- LOADERS ----------
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminProfile();
      const prof = data?.profile || {};
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
        skillsText: Array.isArray(prof.skills)
          ? prof.skills.join(", ")
          : typeof prof.skills === "string"
            ? prof.skills
            : "",
        linksText: prof.links ? JSON.stringify(prof.links) : "",
        kyc_status: prof.kyc_status || "not_started",
        legal_name_locked: !!prof.legal_name_locked,
      });
    } catch (e) { showNotification("error", e?.message || "Load failed"); } finally { setLoading(false); }
  }, []);

  const loadExtras = React.useCallback(async () => {
    try {
      const r = await fetch(`${API_ROOT}/auth/me/profile/`, { headers: { accept: "application/json", ...authHeader() } });
      if (r.ok) {
        const data = await r.json();
        setEduList(Array.isArray(data.educations) ? data.educations : []);
        setExpList(Array.isArray(data.experiences) ? data.experiences : []);
        setTrainingList(Array.isArray(data.trainings) ? data.trainings : []);
        setCertList(Array.isArray(data.certifications) ? data.certifications : []);
        setMemberList(Array.isArray(data.memberships) ? data.memberships : []);
        return;
      }
    } catch { }
    try {
      const [e1, e2, t1, c1, m1] = await Promise.all([
        fetch(`${API_ROOT}/auth/me/educations/`, { headers: { accept: "application/json", ...authHeader() } }),
        fetch(`${API_ROOT}/auth/me/experiences/`, { headers: { accept: "application/json", ...authHeader() } }),
        fetch(`${API_ROOT}/auth/me/trainings/`, { headers: { accept: "application/json", ...authHeader() } }),
        fetch(`${API_ROOT}/auth/me/certifications/`, { headers: { accept: "application/json", ...authHeader() } }),
        fetch(`${API_ROOT}/auth/me/memberships/`, { headers: { accept: "application/json", ...authHeader() } }),
      ]);
      if (e1.ok) setEduList(await e1.json());
      if (e2.ok) setExpList(await e2.json());
      if (t1.ok) setTrainingList(await t1.json());
      if (c1.ok) setCertList(await c1.json());
      if (m1.ok) setMemberList(await m1.json());
    } catch { }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadExtras(); }, [loadExtras]);

  // ---------- CREATE / UPDATE EXTRAS ----------
  const createEducation = async () => {
    if (saving) return; // Prevent double click
    try {
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
          showNotification("error", "Please fill School and Degree.");
        }
        return;
      }
      const startY = eduForm.start ? parseInt(eduForm.start, 10) : null;
      const endY = eduForm.end ? parseInt(eduForm.end, 10) : null;
      const now = new Date();
      if (isFutureYear(eduForm.start, now)) { setEduErrors((prev) => ({ ...prev, start: "Start year can't be in the future." })); return; }
      if (startY && endY && endY < startY) { setEduErrors((prev) => ({ ...prev, end: "End year cannot be before start year" })); return; }

      const normalizeYear = (val) => {
        const y = String(val || "").trim();
        if (!y) return null;
        const year = parseInt(y, 10);
        if (!year || year < 1900 || year > 2100) return null;
        return `${year}-01-01`;
      };

      const url = editEduId ? `${API_ROOT}/auth/me/educations/${editEduId}/` : `${API_ROOT}/auth/me/educations/`;

      const payload = {
        school: (eduForm.school || "").trim(),
        degree: (eduForm.degree || "").trim(),
        field_of_study: (eduForm.field || "").trim(),
        start_date: normalizeYear(eduForm.start),
        end_date: normalizeYear(eduForm.end),
        grade: (eduForm.grade || "").trim(),
      };

      setSaving(true); // Lock buttons
      const r = await fetch(url, { method: editEduId ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed to save education");

      const savedEdu = await r.json();
      const activeId = editEduId || savedEdu.id;

      if (eduFiles.length > 0 && activeId) {
        for (const file of eduFiles) {
          await uploadEducationDocApi(activeId, file);
        }
      }

      showNotification("success", editEduId ? "Education updated" : "Education added");
      setEduOpen(false);
      setEditEduId(null);
      setEduForm(EMPTY_EDU_FORM);
      setEduFiles([]);
      await loadExtras();
    } catch (e) {
      showNotification("error", e?.message || "Save failed");
    } finally {
      setSaving(false); // Unlock buttons
    }
  };

  const createExperience = async () => {
    if (saving) return;
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
      setSaving(true);
      const url = editExpId ? `${API_ROOT}/auth/me/experiences/${editExpId}/` : `${API_ROOT}/auth/me/experiences/`;
      const locationString = buildLocationFromForm(expForm);
      const isCurrent = !!expForm.current || !(expForm.end || "").trim();
      const r = await fetch(url, {
        method: editExpId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          community_name: expForm.org, position: expForm.position, location: locationString,
          start_date: expForm.start || null, end_date: isCurrent ? null : expForm.end || null, currently_work_here: isCurrent,
          description: expForm.description || "", exit_reason: expForm.exit_reason || "", employment_type: expForm.employment_type || "full_time",
          work_schedule: expForm.work_schedule || "", relationship_to_org: expForm.relationship_to_org || "", career_stage: expForm.career_stage || "",
          compensation_type: expForm.compensation_type || "", work_arrangement: expForm.work_arrangement || "",

        }),
      });
      if (!r.ok) throw new Error("Failed to save experience");

      if (syncProfileLocation && locationString) {
        try {
          await updateAdminProfile({ location: locationString });
          setProfile((prev) => ({ ...prev, location: locationString }));
        } catch (err) { console.error("Failed to sync profile location", err); }
      }

      showNotification("success", editExpId ? "Experience updated" : "Experience added");
      setExpOpen(false); setEditExpId(null); setExpForm(emptyExpForm);
      await loadExtras();
    } catch (e) {
      showNotification("error", e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = () => fileRef.current?.click();
  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSaving(true);
    try {
      const res = await uploadAvatar(f);
      setProfile((p) => ({ ...p, user_image_url: res.user_image_url || p.user_image_url }));
      showNotification("success", "Profile image updated");
    } catch (err) { showNotification("error", err?.message || "Avatar upload failed"); } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleStartKYC = async () => {
    try {
      showNotification("info", "Initiating verification…");
      const data = await startKYC();

      // In ProfilePage it uses `data.url` – mirror that behaviour
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.kyc_url) {
        // just in case backend sends kyc_url
        window.location.href = data.kyc_url;
      } else {
        showNotification(
          "error",
          "Could not start verification. Please try again."
        );
      }
    } catch (error) {
      showNotification("error", error?.message || "Failed to start KYC.");
    }
  };


  const onSave = async () => {
    setSaving(true);
    try {
      const payload = { full_name: profile.full_name?.trim(), bio: profile.bio?.trim(), headline: profile.headline?.trim(), location: profile.location?.trim() };
      await updateAdminProfile(payload);
      await load();
      showNotification("success", "Profile updated");
    } catch (err) { showNotification("error", err?.message || "Update failed"); } finally { setSaving(false); }
  };

  const displayNameRaw = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  const displayName = displayNameRaw || "—";

  // ---------- RENDER ----------
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {isOwner ? (
        <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
          {loading ? (
            // 🔹 OWNER SKELETON
            <Stack spacing={3}>
              {/* Title skeleton */}
              <Skeleton variant="text" width="55%" height={32} />

              {/* Main profile card skeleton */}
              <SectionSkeleton minHeight={260} lines={3} />

              {/* Extra sections skeleton (About, Contact, etc.) */}
              <Grid container spacing={{ xs: 2, md: 3 }}>
                <Grid item xs={12} md={6}>
                  <SectionSkeleton minHeight={180} lines={3} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionSkeleton minHeight={180} lines={3} />
                </Grid>
              </Grid>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Box><Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: 0.2 }}>Admin Settings</Typography><Typography variant="body2" sx={{ color: "text.secondary" }}>Update how you appear as an admin across the community.</Typography></Box>
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "divider", boxShadow: { xs: "none", md: "0 18px 45px rgba(15,23,42,0.08)" } }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
                    <Grid item xs={12} md={4}>
                      <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
                        <Box sx={{ position: "relative", width: 112, height: 112, borderRadius: "50%", border: "3px solid", borderColor: "primary.light", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50" }}>
                          <Avatar src={avatarUrl || undefined} sx={{ width: 104, height: 104, fontSize: 34, bgcolor: "primary.main" }}>{(profile.full_name || "A").charAt(0).toUpperCase()}</Avatar>
                        </Box>
                        <input ref={fileRef} hidden type="file" accept="image/*" onChange={onFileChange} />
                        <Button size="small" variant="outlined" fullWidth startIcon={<UploadRoundedIcon />} onClick={onPickFile} disabled={loading || saving} sx={{ borderRadius: 999, textTransform: "none" }}>Change photo</Button>
                        <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>Recommended: square image, at least 400×400px.</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}><TextField label="Full name" fullWidth size="small" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} /></Grid>
                        <Grid item xs={12}><TextField label="Headline" placeholder="e.g., Community manager at ABC" fullWidth size="small" value={profile.headline} onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))} /></Grid>
                        <Grid item xs={12}><TextField label="Location" placeholder="City, Country" fullWidth size="small" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} /></Grid>
                        <Grid item xs={12}><TextField label="Bio" placeholder="Tell people a bit about yourself…" fullWidth multiline minRows={4} size="small" value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} /></Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 3 }} />
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={1.5}>
                    <Button variant="text" startIcon={<RefreshRoundedIcon />} onClick={load} disabled={loading || saving} sx={{ textTransform: "none" }}>Reset</Button>
                    <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={onSave} disabled={saving || loading} sx={{ textTransform: "none", minWidth: 140 }}>Save changes</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}
        </Container>
      ) : (
        // STAFF VIEW
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Profile</Typography>

          {loading ? (
            // 🔹 STAFF SKELETON
            <Stack spacing={2.5}>
              {/* Top strip skeleton */}
              <Card variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: { xs: 2, md: 3 },
                    py: { xs: 1.5, md: 2 },
                  }}
                >
                  {/* Avatar circle */}
                  <Skeleton variant="circular" width={56} height={56} />

                  {/* Name + role */}
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Skeleton variant="text" width="35%" height={24} />
                    <Skeleton variant="text" width="45%" height={18} />
                  </Box>

                  {/* Right side badge / status */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                    <Skeleton variant="text" width={80} height={18} />
                    <Skeleton variant="text" width={60} height={16} />
                  </Box>
                </Box>
              </Card>

              {/* 2-column skeleton for detail sections */}
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <SectionSkeleton minHeight={160} lines={3} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionSkeleton minHeight={160} lines={3} />
                </Grid>
              </Grid>
            </Stack>
          ) : (
            <>
              <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 } }}>
                  <Box sx={{ position: "relative", display: "inline-flex", mr: 2 }}>
                    <Avatar src={avatarUrl || undefined} sx={{ width: 56, height: 56, bgcolor: "grey.300", fontSize: 24 }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                    <IconButton size="small" onClick={openAvatarDialog} sx={{ position: "absolute", bottom: -4, right: -4, width: 26, height: 26, bgcolor: "background.paper", borderRadius: "50%", border: "1px solid", borderColor: "divider", boxShadow: 1, "&:hover": { bgcolor: "grey.100" } }}>
                      {avatarUrl ? <EditOutlinedIcon sx={{ fontSize: 16 }} /> : <PhotoCameraRoundedIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {displayName}
                      </Typography>
                      {profile.kyc_status === "approved" && (
                        <Tooltip title="KYC verified">
                          <VerifiedRoundedIcon sx={{ fontSize: 18, color: "success.main" }} />
                        </Tooltip>
                      )}
                    </Box>
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
                  {/* Edit Identity Trigger */}
                  <Box sx={{ ml: "auto" }}>
                    <Tooltip title="Identity Details">
                      <IconButton size="small" onClick={() => setBasicInfoOpen(true)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Card>

              <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                {/* LEFT COLUMN */}
                <Grid item xs={12} lg={6}>
                  <SectionCard title="About" action={
                    <Tooltip title="Edit About">
                      <IconButton size="small" onClick={() => openAbout("description")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    <Label>Summary</Label>
                    <Typography
                      ref={aboutBioRef}
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap", // keep new lines + spaces
                        wordBreak: "break-word",
                        ...(aboutBioExpanded
                          ? {}
                          : {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                          }),
                      }}
                    >
                      {profile.bio?.trim()
                        ? profile.bio
                        : "Add a short description about your role, focus areas, and what you're working on."}
                    </Typography>
                    {(aboutBioHasOverflow || aboutBioExpanded) && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setAboutBioExpanded((v) => !v)}
                        sx={{ mt: 0.5, p: 0, minWidth: "auto", textTransform: "none" }}
                      >
                        {aboutBioExpanded ? "See less" : "See more"}
                      </Button>
                    )}
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Skills" action={
                    <Tooltip title="Edit Skills">
                      <IconButton size="small" onClick={() => openAbout("skills")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    {userSkills.length > 0 ? (
                      <>
                        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {userSkills.slice(0, 5).map((s) => {
                            // Format label: "React · Expert"
                            const suffix = PROFICIENCY_LABELS[s.proficiency_level] || "";
                            const label = suffix ? `${s.label} · ${suffix}` : s.label;
                            return (
                              <Chip
                                key={s.uri || s.id}
                                size="small"
                                label={label}
                                sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                              />
                            );
                          })}
                          {userSkills.length > 5 && (
                            <Chip
                              size="small"
                              label={`+${userSkills.length - 5} more`}
                              onClick={() => setSkillsDialogOpen(true)}
                              sx={{ cursor: "pointer" }}
                            />
                          )}
                        </Box>

                        {/* "See More" Dialog for skills */}
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
                          <DialogActions>
                            <Button onClick={() => setSkillsDialogOpen(false)}>Close</Button>
                          </DialogActions>
                        </Dialog>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Add your top skills.</Typography>
                    )}
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Experience" action={
                    <Tooltip title="Add Experience">
                      <IconButton size="small" onClick={openAddExperience}>
                        <AddRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    {expList.length ? (
                      <List dense disablePadding>
                        {expList.map((x) => (
                          <ListItem key={x.id} disableGutters sx={{ py: 0.5, pr: { xs: 0, md: 9 } }} secondaryAction={
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEditExperience(x)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete"><IconButton size="small" onClick={() => askDeleteExperience(x.id, `${x.community_name || x.org || ""} — ${x.position || ""}`)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                            </Box>
                          }>
                            <ListItemText disableTypography primary={
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{x.position || "Role not specified"}{x.community_name || x.org ? ` · ${x.community_name || x.org}` : ""}</Typography>
                                <Typography variant="caption" color="text.secondary">{rangeLinkedIn(x.start_date || x.start, x.end_date || x.end, x.currently_work_here ?? x.current)}{x.location ? ` · ${x.location}` : ""}</Typography>
                                {x.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "normal" }}>{x.description}</Typography>}
                              </Box>
                            } />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}><Avatar sx={{ width: 64, height: 64, bgcolor: "grey.200", mx: "auto" }} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Add an experience to your profile</Typography><Box><Button variant="contained" size="small" sx={{ mt: 1.5 }} onClick={openAddExperience}>Create</Button></Box></Box>
                    )}
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Education" action={
                    <Tooltip title="Add Education">
                      <IconButton size="small" onClick={() => setEduOpen(true)}>
                        <AddRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    {eduList.length ? (
                      <List dense disablePadding>
                        {eduList.map((e) => (
                          <ListItem key={e.id} disableGutters sx={{ py: 0.5, pr: { xs: 0, md: 9 } }} secondaryAction={
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEditEducation(e)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete"><IconButton size="small" onClick={() => askDeleteEducation(e.id, `${e.school} — ${e.degree}`)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                            </Box>
                          }>
                            <ListItemText
                              primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{e.degree} - {e.school}</Typography>}
                              secondary={
                                <Stack component="span" spacing={0.5}>
                                  <Typography variant="body2" color="text.secondary">
                                    {rangeLinkedIn(e.start_date, e.end_date, false)}
                                  </Typography>
                                  {/* --- NEW: Display Document Chips --- */}
                                  {e.documents && e.documents.length > 0 && (
                                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                                      {e.documents.map((doc) => (
                                        <Chip
                                          key={doc.id}
                                          icon={<InsertDriveFileIcon style={{ fontSize: 14 }} />}
                                          label={doc.filename}
                                          size="small"
                                          variant="outlined"
                                          onClick={() => window.open(doc.file, '_blank')}
                                          sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem' }}
                                        />
                                      ))}
                                    </Stack>
                                  )}
                                </Stack>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}><Avatar sx={{ width: 64, height: 64, bgcolor: "grey.200", mx: "auto" }}><HistoryEduRoundedIcon /></Avatar><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Add an education to your profile</Typography><Box><Button variant="contained" size="small" sx={{ mt: 1.5 }} onClick={() => setEduOpen(true)}>Create</Button></Box></Box>
                    )}
                  </SectionCard>

                  {/* NEW: Certifications & Licenses (Static Data) */}
                  <SectionCard
                    sx={{ mt: 2 }}
                    title="Certifications & Licenses"
                    action={
                      <Tooltip title="Add">
                        <IconButton size="small" onClick={openAddCert}>
                          <AddRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    {certList.length ? (
                      <List dense disablePadding>
                        {certList.map((cert) => (
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
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      askDeleteCert(
                                        cert.id,
                                        `${cert.certification_name || "Certification"}`
                                      )
                                    }
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
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
                                  {cert.issuing_organization || ""}
                                  {cert.issue_date ? ` - Issued ${toMonthYear(cert.issue_date)}` : ""}
                                  {cert.no_expiration
                                    ? " - No Expiration"
                                    : cert.expiration_date
                                      ? ` - Expires ${toMonthYear(cert.expiration_date)}`
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
                          <VerifiedRoundedIcon />
                        </Avatar>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Add your certifications and licenses.
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
                    sx={{ mt: 2 }}
                    title="Memberships"
                    action={
                      <Tooltip title="Add">
                        <IconButton size="small" onClick={openAddMember}>
                          <AddRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    {memberList.length ? (
                      <List dense disablePadding>
                        {memberList.map((m) => (
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
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      askDeleteMember(
                                        m.id,
                                        `${m.organization_name || "Organization"}`
                                      )
                                    }
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
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
                                    ? ` - ${rangeLinkedIn(m.start_date, m.end_date, !!m.ongoing)}`
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

                {/* RIGHT COLUMN */}
                <Grid item xs={12} lg={6}>
                  <SectionCard title="E-Mail" action={
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openContactEditor("emails")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    <Stack spacing={1}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <EmailIcon fontSize="small" />
                        <Typography variant="body2">{profile.email || "\u2014"}</Typography>
                        <Chip label="Main" size="small" color="primary" variant="outlined" />
                        {profile.links?.contact?.main_email?.type && (
                          <Typography variant="caption" color="text.secondary">
                            ({CONTACT_EMAIL_TYPES.find(t => t.value === profile.links.contact.main_email.type)?.label || profile.links.contact.main_email.type})
                          </Typography>
                        )}
                      </Box>
                      {emailPreview.map((item, idx) => (
                        <Box key={`email-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1, pl: 3 }}>
                          <Typography variant="body2">{item.email}</Typography>
                          <Typography variant="caption" color="text.secondary">({item.type})</Typography>
                        </Box>
                      ))}
                      {emailRemaining > 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                          +{emailRemaining} more
                        </Typography>
                      ) : null}
                    </Stack>
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Phone Numbers" action={
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openContactEditor("phones")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    <Stack spacing={1}>
                      {phonePreview.length ? (
                        phonePreview.map((item, idx) => (
                          <Box key={`phone-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <PhoneIcon fontSize="small" />
                            <Typography variant="body2">{item.number}</Typography>
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

                  <SectionCard sx={{ mt: 2 }} title="Social Profiles" action={
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openContactEditor("socials")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    <Stack spacing={1}>
                      {socialItems.filter((item) => item.url).length ? (
                        socialItems.filter((item) => item.url).map((item) => (
                          <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box component="a" href={item.url} target="_blank" rel="noopener noreferrer" sx={{ color: "inherit", display: "flex" }}>
                              {item.icon}
                            </Box>
                            <Typography
                              variant="body2"
                              component="a"
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ wordBreak: "break-word" }}
                            >
                              {item.url}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">\u2014</Typography>
                      )}
                    </Stack>
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Websites" action={
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openContactEditor("websites")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    <Stack spacing={1}>
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

                  <SectionCard sx={{ mt: 2 }} title="Scheduling Link" action={
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openContactEditor("scheduler")}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

                  <SectionCard
                    sx={{ mt: 2 }}
                    title="Location"
                    action={
                      <Tooltip title="Edit Location">
                        <IconButton size="small" onClick={openLocation}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <Stack spacing={1}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PlaceIcon fontSize="small" />
                        <Typography variant="body2">
                          City: {parsedLocation.city || "\u2014"}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ pl: 3 }}>
                        Country: {parsedLocation.country || "\u2014"}
                      </Typography>
                    </Stack>
                  </SectionCard>

                  {/* NEW: Trainings & Executive Education (Static Data) */}
                  <SectionCard
                    sx={{ mt: 2 }}
                    title="Trainings & Executive Education"
                    action={
                      <Tooltip title="Add">
                        <IconButton size="small" onClick={openAddTraining}>
                          <AddRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    {trainingList.length ? (
                      <List dense disablePadding>
                        {trainingList.map((t) => (
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
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      askDeleteTraining(
                                        t.id,
                                        `${t.program_title || "Training"}`
                                      )
                                    }
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
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
                                    {t.provider || ""}
                                    {t.start_date || t.end_date
                                      ? ` - ${rangeLinkedIn(t.start_date, t.end_date, !!t.currently_ongoing)}`
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
                                        whiteSpace: "normal",
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
                    sx={{ mt: 2 }}
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
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => onEditLanguage(l)}>
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {/* Inside the map loop for languages */}
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => askDeleteLanguage(l.id, l.language.english_name)} // <--- Updated
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
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
                                <>
                                  <Typography variant="body2" component="span" display="block">
                                    {CEFR_OPTIONS.find(c => c.value === l.proficiency_cefr)?.label || l.proficiency_cefr}
                                  </Typography>
                                  {/* Show certificates if any exist */}
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
            </>
          )}
        </Container>
      )
      }

      {/* --- Language Dialog --- */}
      <Dialog open={langOpen} onClose={() => setLangOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editLangId ? "Edit Language" : "Add Language"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* 1. Language Search */}
            <IsoLanguageAutocomplete
              value={langForm.iso_obj}
              onChange={(val) => setLangForm({ ...langForm, iso_obj: val })}
            />

            {/* 2. Primary Dialect */}
            <TextField
              label="Primary Dialect (Optional)"
              placeholder="e.g. Mexican Spanish, Quebec French"
              value={langForm.primary_dialect}
              onChange={(e) => setLangForm({ ...langForm, primary_dialect: e.target.value })}
              fullWidth
              helperText="If the language has a specific dialect you speak."
            />

            {/* 3. CEFR Proficiency */}
            <TextField
              select
              label="Proficiency (CEFR)"
              value={langForm.proficiency_cefr}
              onChange={(e) => setLangForm({ ...langForm, proficiency_cefr: e.target.value })}
              fullWidth
            >
              {CEFR_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{opt.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {/* 4. Acquisition Context */}
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

            {/* 5. Certificate Upload Section */}
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
                    if (e.target.files) {
                      setLangCertFiles(prev => [...prev, ...Array.from(e.target.files)]);
                    }
                  }}
                />
              </Button>

              {/* Existing Saved Certificates */}
              {existingCertificates.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Saved Certificates:
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {existingCertificates.map((cert) => (
                      <Chip
                        key={cert.id}
                        label={cert.filename || "Certificate"}
                        size="small"
                        color="primary"
                        variant="outlined"
                        onClick={() => window.open(cert.file, '_blank')}
                        onDelete={() => askDeleteCertificate(cert.id, cert.filename)}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* New Pending Files */}
              {langCertFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    To be uploaded:
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {langCertFiles.map((file, i) => (
                      <Chip
                        key={i}
                        label={file.name}
                        size="small"
                        onDelete={() => setLangCertFiles(prev => prev.filter((_, idx) => idx !== i))}
                      />
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
      {/* --- NEW DIALOG: Edit About Work --- */}
      <Dialog open={workOpen} onClose={() => setWorkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit About your work</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Read-Only Context */}
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Latest Position (Auto-detected)</Typography>
              {latestExp ? (
                <>
                  <Typography variant="body1" fontWeight={600}>{latestExp.position}</Typography>
                  <Typography variant="body2" color="text.secondary">at {latestExp.community_name || latestExp.org}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    To change this, please update your Experience section.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">No experience found. Add an experience entry to populate this.</Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAboutWork} disabled={saving || !latestExp}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* --- Other Dialogs (Avatar, Contact, Edu, Exp, etc.) --- */}
      <Dialog open={avatarDialogOpen} onClose={closeAvatarDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Update profile photo</DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Avatar src={avatarPreview || avatarUrl || undefined} sx={{ width: 96, height: 96, mb: 2, bgcolor: "grey.300", fontSize: 32 }}>{displayName.charAt(0).toUpperCase()}</Avatar>
          <input ref={avatarFileRef} hidden type="file" accept="image/*" onChange={onAvatarFileChange} />
          <Button variant="outlined" startIcon={<UploadRoundedIcon />} onClick={() => avatarFileRef.current?.click()} sx={{ borderRadius: 999, px: 3, mb: 1 }} disabled={saving}>Choose image</Button>
          <Typography variant="caption" color="text.secondary">JPG/PNG, recommended square image</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {avatarUrl && <Button color="error" onClick={handleAvatarRemoveClick} disabled={saving}>Remove photo</Button>}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={closeAvatarDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveAvatarDialog} disabled={saving || !avatarMode}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contactOpen} onClose={closeContactEditor} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {contactEditSection === "emails"
            ? "Edit E-Mail"
            : contactEditSection === "phones"
              ? "Edit Phone Numbers"
              : contactEditSection === "socials"
                ? "Edit Social Profiles"
                : contactEditSection === "websites"
                  ? "Edit Websites"
                  : contactEditSection === "scheduler"
                    ? "Edit Scheduling Link"
                    : "Edit Contact"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>

            {/* EMAILS */}
            {(contactEditSection === "all" || contactEditSection === "emails") && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Emails</Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {/* MAIN EMAIL ROW */}
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Main Email"
                        type="email"
                        fullWidth
                        value={profile.email || ""}
                        disabled
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Chip label="Main" size="small" color="primary" variant="outlined" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
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
                    <Grid item xs={6} md={3}>
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
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                  {contactForm.emails.map((item, idx) => (
                    <Grid container spacing={1} alignItems="center" key={`email-row-${idx}`}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Email"
                          type="email"
                          fullWidth
                          value={item.email}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              emails: prev.emails.map((row, i) => (i === idx ? { ...row, email: e.target.value } : row)),
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
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
                      <Grid item xs={5} md={2}>
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
                      <Grid item xs={1} md={1}>
                        <IconButton onClick={() => setContactForm((prev) => ({ ...prev, emails: prev.emails.filter((_, i) => i !== idx) }))}>
                          <DeleteOutlineIcon fontSize="small" />
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
            )}

            {(contactEditSection === "all") && <Divider />}

            {/* PHONES */}
            {(contactEditSection === "all" || contactEditSection === "phones") && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Phones</Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {contactForm.phones.map((item, idx) => (
                    <Grid container spacing={1} alignItems="center" key={`phone-row-${idx}`}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          label="Number"
                          fullWidth
                          value={item.number}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              phones: prev.phones.map((row, i) => (i === idx ? { ...row, number: e.target.value } : row)),
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={6} md={2}>
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
                      <Grid item xs={6} md={2}>
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
                      <Grid item xs={8} md={2}>
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
                      <Grid item xs={4} md={1}>
                        <IconButton onClick={() => setContactForm((prev) => ({ ...prev, phones: prev.phones.filter((_, i) => i !== idx) }))}>
                          <DeleteOutlineIcon fontSize="small" />
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
            )}

            {(contactEditSection === "all") && <Divider />}

            {/* SOCIALS */}
            {(contactEditSection === "all" || contactEditSection === "socials") && (
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
            )}

            {(contactEditSection === "all") && <Divider />}

            {/* WEBSITES */}
            {(contactEditSection === "all" || contactEditSection === "websites") && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Websites</Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {contactForm.websites.map((item, idx) => (
                    <Grid container spacing={1} alignItems="center" key={`site-row-${idx}`}>
                      <Grid item xs={12} md={4}>
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
                      <Grid item xs={12} md={5}>
                        <TextField
                          label="URL"
                          fullWidth
                          value={item.url}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              websites: prev.websites.map((row, i) => (i === idx ? { ...row, url: e.target.value } : row)),
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={7} md={2}>
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
                      <Grid item xs={5} md={1}>
                        <IconButton onClick={() => setContactForm((prev) => ({ ...prev, websites: prev.websites.filter((_, i) => i !== idx) }))}>
                          <DeleteOutlineIcon fontSize="small" />
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
            )}

            {(contactEditSection === "all") && <Divider />}

            {/* SCHEDULER */}
            {(contactEditSection === "all" || contactEditSection === "scheduler") && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Scheduler</Typography>
                <Grid container spacing={1} sx={{ mt: 1 }} alignItems="center">
                  <Grid item xs={12} md={4}>
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
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="URL"
                      fullWidth
                      value={contactForm.scheduler.url}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          scheduler: { ...prev.scheduler, url: e.target.value },
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
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
            )}

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeContactEditor}>Cancel</Button>
          <Button variant="contained" onClick={saveContact} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={locationOpen} onClose={() => setLocationOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Location</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <CityAutocompleteOpenMeteo
              label="City"
              value={locationForm.city ? { name: locationForm.city, admin1: "", country: locationForm.country || "" } : null}
              onSelect={(place) => {
                setLocationForm((prev) => ({
                  ...prev,
                  city: place?.name || "",
                  country: place?.country || prev.country || "",
                }));
              }}
            />
            <Box sx={{ mt: 1.5 }}>
              <Autocomplete
                fullWidth
                size="small"
                options={COUNTRY_OPTIONS}
                autoHighlight
                getOptionLabel={(opt) => opt?.label ?? ""}
                value={getSelectedCountry({ location: locationForm.country })}
                onChange={(_, value) => setLocationForm((f) => ({ ...f, country: value?.label || "" }))}
                renderInput={(params) => (
                  <TextField {...params} label="Country" placeholder="Select country" />
                )}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setLocationOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveLocation} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* --- Education Dialog --- */}
      <Dialog open={eduOpen} onClose={() => { setEduOpen(false); setEditEduId(null); setEduErrors({ start: "", end: "" }); setEduReqErrors({ school: "", degree: "", field: "", start: "" }); }} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editEduId ? "Edit education" : "Add education"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>*Required fields are marked with an asterisk</Typography>
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
          <TextField label="Degree *" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} fullWidth sx={{ mb: 2 }} error={!!eduReqErrors.degree} helperText={eduReqErrors.degree || ""} />
          <Autocomplete freeSolo options={[...FIELD_OF_STUDY_OPTIONS, "Other"]} value={eduForm.field} onChange={(_, value) => setEduForm((f) => ({ ...f, field: value || "" }))} onInputChange={(event, newInput) => { if (event && event.type === "change") setEduForm((f) => ({ ...f, field: newInput })); }} renderInput={(params) => <TextField {...params} label="Field of Study *" fullWidth sx={{ mb: 2 }} error={!!eduReqErrors.field} helperText={eduReqErrors.field || "Pick from list or type your own (Other)."} />} />
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 2 }}>
            <TextField label="Start Year" type="number" value={eduForm.start} onChange={(e) => setEduForm((f) => ({ ...f, start: e.target.value }))} fullWidth sx={{ flex: 1 }} inputProps={{ min: 1900, max: new Date().getFullYear() }} error={!!(eduReqErrors.start || eduErrors.start)} helperText={eduReqErrors.start || eduErrors.start || ""} />
            <TextField label="End Year" type="number" value={eduForm.end} onChange={(e) => setEduForm((f) => ({ ...f, end: e.target.value }))} fullWidth sx={{ flex: 1 }} inputProps={{ min: 1900, max: new Date().getFullYear() + 10 }} error={!!eduErrors.end} helperText={eduErrors.end || ""} />
          </Box>
          {/* ADD THIS TEXTFIELD HERE */}
          <TextField
            label="Grade (optional)"
            value={eduForm.grade}
            onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))}
            fullWidth
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
                        <DeleteOutlineIcon fontSize="small" color="error" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 32 }}><InsertDriveFileIcon fontSize="small" color="action" /></ListItemAvatar>
                    <ListItemText primary={doc.filename} primaryTypographyProps={{ variant: 'caption', noWrap: true, maxWidth: 200 }} />
                  </ListItem>
                ))}
              </List>
            )}

            {/* 2. File Selection */}
            <Button component="label" variant="outlined" size="small" startIcon={<AttachFileIcon />} sx={{ mt: 1, textTransform: 'none' }}>
              Attach Files
              <input type="file" multiple hidden onChange={(e) => {
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
                  <Chip key={i} label={f.name} onDelete={() => setEduFiles(prev => prev.filter((_, idx) => idx !== i))} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {editEduId && <Button color="error" onClick={() => askDeleteEducation(editEduId, `${eduForm.school} — ${eduForm.degree}`)} disabled={saving}>Delete</Button>}
          <Button variant="outlined" onClick={() => { setEduOpen(false); setEditEduId(null); setEduErrors({ start: "", end: "" }); setEduReqErrors({ school: "", degree: "", field: "", start: "" }); setEduForm(EMPTY_EDU_FORM); }} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={createEducation} disabled={saving}>{editEduId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* --- Delete education document confirmation dialog --- */}
      <Dialog
        open={deleteDocDialog.open}
        onClose={handleCloseDeleteDoc}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineIcon color="error" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 1, color: "text.primary" }}>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {deleteDocDialog.doc?.filename || "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDeleteDoc} disabled={deletingDoc} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmDeleteDoc} disabled={deletingDoc}>
            {deletingDoc ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>


      {/* --- Experience Dialog --- */}
      <Dialog open={expOpen} onClose={() => { setExpOpen(false); setEditExpId(null); }} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editExpId ? "Edit experience" : "Create experience"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>*Required fields are marked with an asterisk</Typography>
          <CompanyAutocomplete
            value={expForm.org}
            onChange={(val) => setExpForm((f) => ({ ...f, org: val }))}
            error={!!expReqErrors.org}
            helperText={expReqErrors.org || ""}
          />
          <TextField label="Position *" value={expForm.position} onChange={(e) => setExpForm((f) => ({ ...f, position: e.target.value }))} fullWidth sx={{ mb: 2 }} error={!!expReqErrors.position} helperText={expReqErrors.position || ""} />
          <Stack spacing={2.5}>
            <CityAutocompleteOpenMeteo
              label="City"
              value={expForm.city ? { name: expForm.city, admin1: "", country: expForm.location || "" } : null}
              onSelect={(place) => {
                setExpForm((prev) => ({
                  ...prev,
                  city: place?.name || "",
                  location: place?.country || prev.location || "",
                }));
              }}
            />
            <Autocomplete fullWidth size="small" options={COUNTRY_OPTIONS} autoHighlight value={getSelectedCountry({ location: expForm.location })} getOptionLabel={(opt) => opt?.label ?? ""} isOptionEqualToValue={(o, v) => o.code === v.code} onChange={(_, newVal) => setExpForm((f) => ({ ...f, location: newVal ? newVal.label : "" }))} renderOption={(props, option) => (<li {...props}><span style={{ marginRight: 8 }}>{option.emoji}</span>{option.label}</li>)} renderInput={(params) => <TextField {...params} label="Country *" placeholder="Select country" fullWidth inputProps={{ ...params.inputProps, autoComplete: "new-password" }} sx={{ mb: 2 }} error={!!expReqErrors.location} helperText={expReqErrors.location || ""} />} />
          </Stack><TextField select label="Employment type *" value={expForm.relationship_to_org} onChange={(e) => setExpForm((f) => ({ ...f, relationship_to_org: e.target.value }))} fullWidth sx={{ mb: 2 }} error={!!expReqErrors.relationship_to_org} helperText={expReqErrors.relationship_to_org || ""}>
            <MenuItem value="employee">Employee (on payroll)</MenuItem><MenuItem value="independent">Independent (self-employed / contractor / freelance)</MenuItem><MenuItem value="third_party">Third-party (Agency / Consultancy / Temp)</MenuItem>
          </TextField>
          <TextField select label="Work schedule" value={expForm.work_schedule} onChange={(e) => setExpForm((f) => ({ ...f, work_schedule: e.target.value }))} fullWidth sx={{ mb: 2 }} error={!!expReqErrors.work_schedule} helperText={expReqErrors.work_schedule || ""}>
            <MenuItem value="full_time">Full-time</MenuItem><MenuItem value="part_time">Part-time</MenuItem>
          </TextField>
          <TextField select fullWidth label="Career stage" value={expForm.career_stage} onChange={(e) => setExpForm((f) => ({ ...f, career_stage: e.target.value }))} sx={{ mb: 1 }} error={!!expReqErrors.career_stage} helperText={expReqErrors.career_stage || ""}>
            <MenuItem value="internship">Internship</MenuItem><MenuItem value="apprenticeship">Apprenticeship</MenuItem><MenuItem value="trainee">Trainee</MenuItem><MenuItem value="entry">Entry level</MenuItem><MenuItem value="mid">Mid level</MenuItem><MenuItem value="senior">Senior level</MenuItem>
          </TextField>
          <TextField select label="Work arrangement" value={expForm.work_arrangement} onChange={(e) => setExpForm((f) => ({ ...f, work_arrangement: e.target.value }))} fullWidth sx={{ mb: 2 }} error={!!expReqErrors.work_arrangement} helperText={expReqErrors.work_arrangement || ""}>
            <MenuItem value="onsite">On-site</MenuItem><MenuItem value="hybrid">Hybrid</MenuItem><MenuItem value="remote">Remote</MenuItem>
          </TextField>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}><TextField label="Start Date" type="date" value={expForm.start} onChange={(e) => setExpForm((f) => ({ ...f, start: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} error={!!expReqErrors.start} helperText={expReqErrors.start || ""} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="End Date" type="date" value={expForm.end} onChange={(e) => setExpForm((f) => ({ ...f, end: e.target.value }))} fullWidth disabled={expForm.current} InputLabelProps={{ shrink: true }} error={!!expReqErrors.end} helperText={expReqErrors.end || ""} /></Grid>
          </Grid>
          <FormControlLabel control={<Checkbox checked={expForm.current} onChange={(e) => { const current = e.target.checked; setExpForm((prev) => ({ ...prev, current, end: current ? "" : prev.end })); }} />} label="I currently work here" sx={{ mb: 1 }} />
          {shouldShowExitReason() && <TextField fullWidth multiline minRows={2} maxRows={4} label="Why did you leave this job?" value={expForm.exit_reason} onChange={(e) => setExpForm((prev) => ({ ...prev, exit_reason: e.target.value }))} sx={{ mt: 2 }} />}
          {expForm.current && <FormControlLabel control={<Checkbox checked={syncProfileLocation} onChange={(e) => setSyncProfileLocation(e.target.checked)} />} label="Make this location my profile’s work location" sx={{ mb: 1 }} />}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Description</Typography>
            <TextField placeholder="List your major duties and successes, highlighting specific projects" value={expForm.description || ""} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} fullWidth multiline minRows={4} />
            <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography variant="caption" color="text.secondary">Review before saving.</Typography><Typography variant="caption" color="text.secondary">{(expForm.description?.length || 0)}/2000</Typography></Box>
            <Box sx={{ mt: 1 }}><Button variant="outlined" size="small">Rewrite with AI</Button></Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!!editExpId && <Button color="error" onClick={() => askDeleteExperience(editExpId, `${expForm.org} — ${expForm.position}`)} disabled={saving}>Delete</Button>}
          <Button variant="outlined" onClick={() => { setExpOpen(false); setEditExpId(null); }} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={createExperience} disabled={saving}>{editExpId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Training Add/Edit */}
      <Dialog open={trainingOpen} onClose={() => setTrainingOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
          <Button onClick={() => setTrainingOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveTraining} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Certification Add/Edit */}
      <Dialog open={certOpen} onClose={() => setCertOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
          <Button onClick={() => setCertOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveCert} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Membership Add/Edit */}
      <Dialog open={memberOpen} onClose={() => setMemberOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
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
          <Button onClick={() => setMemberOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveMember} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Modern Generic Delete Confirmation --- */}
      <Dialog
        open={confirm.open}
        onClose={closeConfirm}
        fullWidth
        maxWidth="xs"
        sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteOutlineIcon color="error" />
          Delete Item?
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ color: "text.primary", mb: 1 }}>
            This will permanently remove{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {confirm.label || "this item"}
            </Box>
            .
          </DialogContentText>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeConfirm} disabled={saving} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button onClick={doConfirmDelete} disabled={saving} variant="contained" color="error">
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Edit About dialog --- */}
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{aboutMode === "description" ? "Edit About" : "Edit Skills"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {aboutMode === "description" ? (
              <>
                <Typography variant="body2" color="text.secondary">Write a brief summary about your role, experience or focus areas.</Typography>
                <TextField multiline minRows={4} value={aboutForm.bio} onChange={(e) => setAboutForm((f) => ({ ...f, bio: e.target.value }))} inputProps={{ maxLength: 2600 }} placeholder="e.g. Community manager focused on tech meetups and online workshops." fullWidth />
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography variant="caption" color="text.secondary">{(aboutForm.bio?.length || 0)}/2600 characters</Typography><Button size="small" variant="outlined">Rewrite with AI</Button></Box>
              </>
            ) : (
              <>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Skills</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                    Search for skills and set your proficiency level.
                  </Typography>

                  <Autocomplete
                    multiple
                    options={skillOptions}
                    value={aboutSkills}
                    onChange={(_, newValue) => {
                      setAboutSkills((prev) => {
                        const merged = (newValue || []).map((skill) => {
                          const existing = prev.find((s) => s.uri === skill.uri);
                          return existing ? existing : { ...skill, proficiency_level: 3 }; // Default Intermediate
                        });
                        return merged;
                      });
                    }}
                    inputValue={skillSearch}
                    onInputChange={(_, newInputValue) => setSkillSearch(newInputValue)}
                    getOptionLabel={(option) => {
                      if (!option) return "";
                      return option.label || "";
                    }}
                    isOptionEqualToValue={(option, value) => option.uri === value.uri}
                    filterSelectedOptions
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search skills"
                        placeholder="Start typing to search ESCO skills…"
                        fullWidth
                      />
                    )}
                  />

                  {aboutSkills.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Rate your level for each skill
                      </Typography>
                      <Stack spacing={2}>
                        {aboutSkills.map((skill) => {
                          const lvl = skill.proficiency_level || 3;
                          return (
                            <Box key={skill.uri} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Typography variant="body2" sx={{ minWidth: 140, fontWeight: 500 }}>
                                {skill.label}
                              </Typography>
                              <Slider
                                value={lvl}
                                min={1}
                                max={5}
                                step={1}
                                marks
                                sx={{ flex: 1 }}
                                onChange={(_, value) => handleSkillLevelChange(skill.uri, value)}
                              />
                              <Typography variant="caption" sx={{ width: 80, textAlign: "right" }}>
                                {PROFICIENCY_LABELS[lvl] || ""}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setAboutOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveAbout} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogActions>
      </Dialog>

      {/* --- NEW DIALOG: Identity (Header Trigger) --- */}
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
          middle: "", // Adjust if middle name is available
          last: profile.last_name
        }}
        showToast={showNotification}
      />

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert variant="filled" severity={toast.type === "error" ? "error" : "success"} onClose={() => setToast((t) => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Box >
  );
}
