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
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';

import { isOwnerUser } from "../utils/adminRole";

// --- API helpers ---
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
function CompanyAutocomplete({ value, onChange }) {
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
function BasicInfoDialog({ open, onClose, profile, onRequestNameChange }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Identity Details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Legal names are locked for security.
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="First Name" fullWidth disabled value={profile?.first_name || ""} />
            <TextField label="Last Name" fullWidth disabled value={profile?.last_name || ""} />
          </Box>
          <Button
            startIcon={<HistoryEduRoundedIcon />}
            sx={{ alignSelf: 'start', textTransform: 'none' }}
            onClick={onRequestNameChange}
          >
            Request Name Change
          </Button>
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
      showToast("error", "First Name, Last Name, and Reason are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/users/me/name-change-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.detail || JSON.stringify(json));
      }
      showToast("success", "Request submitted successfully! An admin will review it shortly.");
      onClose();
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
    first_name: "", last_name: "", full_name: "", bio: "", headline: "",
    location: "", user_image_url: "", email: "", job_title: "", company: "",
    skillsText: "", linksText: "",
  });

  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({
    first_name: "", last_name: "", email: "", city: "", location: "", linkedin: "", job_title: "",
  });

  const [eduList, setEduList] = React.useState([]);
  const [expList, setExpList] = React.useState([]);

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
  const [editEduId, setEditEduId] = React.useState(null);
  const [editExpId, setEditExpId] = React.useState(null);

  const [eduForm, setEduForm] = React.useState(EMPTY_EDU_FORM);
  const [eduErrors, setEduErrors] = React.useState({ start: "", end: "" });

  // Name Change Request State
  const [nameChangeOpen, setNameChangeOpen] = React.useState(false);
  const [basicInfoOpen, setBasicInfoOpen] = React.useState(false);

  const emptyExpForm = {
    org: "", position: "", city: "", location: "", start: "", end: "", current: false,
    employment_type: "full_time", work_schedule: "", relationship_to_org: "",
    career_stage: "", work_arrangement: "", description: "", exit_reason: "",
    compensation_type: "", sector: "",
    industry: "",
    number_of_employees: "",
  };

  const [expForm, setExpForm] = React.useState(emptyExpForm);
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
    setAboutForm({ bio: profile.bio || "", skillsText: profile.skillsText || "" });
    setAboutOpen(true);
  };

  const openContact = () => {
    if (!profile) return;
    const links = parseLinks(profile.linksText);
    let city = "", country = "";
    if (profile.location) {
      const parts = profile.location.split(",").map((p) => p.trim());
      if (parts.length === 1) country = parts[0];
      else if (parts.length >= 2) { city = parts[0]; country = parts.slice(1).join(", "); }
    }
    setContactForm({
      first_name: profile.first_name || "", last_name: profile.last_name || "",
      email: profile.email || "", city, location: country,
      linkedin: links.linkedin || "", job_title: profile.job_title || "",
    });
    setContactOpen(true);
  };

  const saveContact = async () => {
    try {
      setSaving(true);
      const { first_name, last_name, email, city, location, linkedin, job_title } = contactForm;
      const combinedLocation = city && location ? `${city}, ${location}` : location || city || "";
      const links = { ...(profile?.links || {}), linkedin: (linkedin || "").trim() };
      const userPayload = { first_name: (first_name || "").trim(), last_name: (last_name || "").trim(), email: (email || "").trim() || undefined };
      const profilePayload = { job_title: (job_title || "").trim(), location: combinedLocation, links };

      await updateAdminContact(userPayload, profilePayload);
      setProfile((prev) => ({
        ...prev, ...userPayload, job_title: profilePayload.job_title,
        location: profilePayload.location, links, linksText: JSON.stringify(links),
      }));
      setContactOpen(false);
      showNotification("success", "Contact updated");
    } catch (err) {
      showNotification("error", "Failed to update contact");
    } finally { setSaving(false); }
  };

  const saveAbout = async () => {
    try {
      setSaving(true);
      const payload = { bio: aboutForm.bio, skills: parseSkills(aboutForm.skillsText), links: parseLinks(profile.linksText) };
      await updateAdminProfile(payload);
      setProfile((p) => ({ ...p, bio: aboutForm.bio, skillsText: aboutForm.skillsText }));
      showNotification("success", "About updated");
      setAboutOpen(false);
    } catch (e) {
      showNotification("error", e?.message || "Save failed");
    } finally { setSaving(false); }
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
      school: item.school || "", degree: item.degree || "", field: item.field_of_study || "",
      start: toYear(item.start_date), end: toYear(item.end_date), grade: item.grade || "",
    });
    setEduErrors({ start: "", end: "" });
    setEduOpen(true);
  };

  const askDeleteEducation = (id, label = "") => { setConfirm({ open: true, type: "edu", id, label }); };
  const askDeleteExperience = (id, label = "") => { setConfirm({ open: true, type: "exp", id, label }); };
  const closeConfirm = () => { setConfirm({ open: false, type: null, id: null, label: "" }); };

  const doConfirmDelete = async () => {
    const { type, id } = confirm;
    if (!type || !id) return;
    try {
      const url = type === "edu" ? `${API_ROOT}/auth/me/educations/${id}/` : `${API_ROOT}/auth/me/experiences/${id}/`;
      const r = await fetch(url, { method: "DELETE", headers: { ...authHeader() } });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      showNotification("success", type === "edu" ? "Education deleted" : "Experience deleted");
      closeConfirm();
      await loadExtras();
    } catch (e) {
      showNotification("error", e?.message || "Delete failed");
      closeConfirm();
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
        first_name: data?.first_name || "", last_name: data?.last_name || "", full_name: prof.full_name || data?.full_name || "",
        bio: prof.bio || "", headline: prof.headline || "", location: prof.location || "", user_image_url: prof.user_image_url || "",
        email: data?.email || "", job_title: prof.job_title || "", company: prof.company || "",
        skillsText: Array.isArray(prof.skills) ? prof.skills.join(", ") : typeof prof.skills === "string" ? prof.skills : "",
        linksText: prof.links ? JSON.stringify(prof.links) : "",
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
        return;
      }
    } catch { }
    try {
      const [e1, e2] = await Promise.all([
        fetch(`${API_ROOT}/auth/me/educations/`, { headers: { accept: "application/json", ...authHeader() } }),
        fetch(`${API_ROOT}/auth/me/experiences/`, { headers: { accept: "application/json", ...authHeader() } }),
      ]);
      if (e1.ok) setEduList(await e1.json());
      if (e2.ok) setExpList(await e2.json());
    } catch { }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadExtras(); }, [loadExtras]);

  // ---------- CREATE / UPDATE EXTRAS ----------
  const createEducation = async () => {
    try {
      setEduErrors({ start: "", end: "" });
      const startY = eduForm.start ? parseInt(eduForm.start, 10) : null;
      const endY = eduForm.end ? parseInt(eduForm.end, 10) : null;
      const currentYear = new Date().getFullYear();
      if (startY && startY > currentYear) { setEduErrors((prev) => ({ ...prev, start: "Start year cannot be in the future" })); return; }
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
        school: (eduForm.school || "").trim(), degree: (eduForm.degree || "").trim(), field_of_study: (eduForm.field || "").trim(),
        start_date: normalizeYear(eduForm.start), end_date: normalizeYear(eduForm.end), grade: (eduForm.grade || "").trim(),
      };
      if (!payload.school || !payload.degree) { showNotification("error", "Please fill School and Degree."); return; }
      const r = await fetch(url, { method: editEduId ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed to save education");
      showNotification("success", editEduId ? "Education updated" : "Education added");
      setEduOpen(false); setEditEduId(null); setEduForm(EMPTY_EDU_FORM);
      await loadExtras();
    } catch (e) { showNotification("error", e?.message || "Save failed"); }
  };

  const createExperience = async () => {
    try {
      const url = editExpId ? `${API_ROOT}/auth/me/experiences/${editExpId}/` : `${API_ROOT}/auth/me/experiences/`;
      const locationString = buildLocationFromForm(expForm);
      const r = await fetch(url, {
        method: editExpId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          community_name: expForm.org, position: expForm.position, location: locationString,
          start_date: expForm.start || null, end_date: expForm.current ? null : expForm.end || null, currently_work_here: !!expForm.current,
          description: expForm.description || "", exit_reason: expForm.exit_reason || "", employment_type: expForm.employment_type || "full_time",
          work_schedule: expForm.work_schedule || "", relationship_to_org: expForm.relationship_to_org || "", career_stage: expForm.career_stage || "",
          compensation_type: expForm.compensation_type || "", work_arrangement: expForm.work_arrangement || "",
          sector: expForm.sector || "",
          industry: expForm.industry || "",
          number_of_employees: expForm.number_of_employees || "",
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
    } catch (e) { showNotification("error", e?.message || "Save failed"); }
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
          {/* ... (Owner view unchanged) ... */}
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
        </Container>
      ) : (
        // STAFF VIEW
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Profile</Typography>
          {loading && <LinearProgress />}
          {!loading && (
            <>
              {/* Top profile strip */}
              <Card variant="outlined" sx={{ mb: 2.5, borderRadius: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 } }}>
                  <Box sx={{ position: "relative", display: "inline-flex", mr: 2 }}>
                    <Avatar src={avatarUrl || undefined} sx={{ width: 56, height: 56, bgcolor: "grey.300", fontSize: 24 }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                    <IconButton size="small" onClick={openAvatarDialog} sx={{ position: "absolute", bottom: -4, right: -4, width: 26, height: 26, bgcolor: "background.paper", borderRadius: "50%", border: "1px solid", borderColor: "divider", boxShadow: 1, "&:hover": { bgcolor: "grey.100" } }}>
                      {avatarUrl ? <EditOutlinedIcon sx={{ fontSize: 16 }} /> : <PhotoCameraRoundedIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{displayName}</Typography>
                    {/* Display latest experience under name */}
                    {workLine && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} noWrap>{workLine}</Typography>}
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
                  <SectionCard title="About" action={<Button size="small" onClick={() => openAbout("description")}>Edit</Button>}>
                    <Label>Summary</Label>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>{profile.bio?.trim() ? profile.bio : "Add a short description about your role, focus areas, and what you're working on."}</Typography>
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Skills" action={<Button size="small" onClick={() => openAbout("skills")}>Edit</Button>}>
                    {parseSkills(profile.skillsText).length ? (
                      <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {parseSkills(profile.skillsText).map((s, i) => (<Chip key={i} size="small" label={s} sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />))}
                      </Box>
                    ) : <Typography variant="body2" color="text.secondary">Add your top skills.</Typography>}
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Experience" action={<Button size="small" variant="outlined" onClick={openAddExperience}>Add more</Button>}>
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
                                {x.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "normal" }}>{x.description}</Typography>}
                              </Box>
                            } />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}><Avatar sx={{ width: 64, height: 64, bgcolor: "grey.200", mx: "auto" }} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This section is empty</Typography><Typography variant="caption" color="text.secondary">Add an experience to your profile</Typography><Box><Button variant="contained" size="small" sx={{ mt: 1.5 }} onClick={openAddExperience}>Create</Button></Box></Box>
                    )}
                  </SectionCard>

                  <SectionCard sx={{ mt: 2 }} title="Education" action={<Button size="small" variant="outlined" onClick={() => setEduOpen(true)}>Add more</Button>}>
                    {eduList.length ? (
                      <List dense disablePadding>
                        {eduList.map((e) => (
                          <ListItem key={e.id} disableGutters sx={{ py: 0.5, pr: { xs: 0, md: 9 } }} secondaryAction={
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
                              <Tooltip title="Edit"><IconButton size="small" onClick={() => onEditEducation(e)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete"><IconButton size="small" onClick={() => askDeleteEducation(e.id, `${e.school} — ${e.degree}`)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                            </Box>
                          }>
                            <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{e.degree} - {e.school}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{rangeLinkedIn(e.start_date, e.end_date, false)}</Typography>} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}><Avatar sx={{ width: 64, height: 64, bgcolor: "grey.200", mx: "auto" }} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This section is empty</Typography><Typography variant="caption" color="text.secondary">Add an education to your profile</Typography><Box><Button variant="contained" color="success" size="small" sx={{ mt: 1.5 }} onClick={() => setEduOpen(true)}>Create</Button></Box></Box>
                    )}
                  </SectionCard>

                  {/* NEW: Certifications & Licenses (Static Data) */}
                  <SectionCard sx={{ mt: 2 }} title="Certifications & Licenses" action={<Tooltip title="Add"><IconButton size="small"><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                    <List dense disablePadding>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>AWS Certified Solutions Architect – Associate</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">Amazon Web Services (AWS) • Issued Jan 2023</Typography>}
                        />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>Google Professional Machine Learning Engineer</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">Google Cloud • Issued Jun 2023</Typography>}
                        />
                      </ListItem>
                    </List>
                  </SectionCard>
                </Grid>

                {/* RIGHT COLUMN */}
                <Grid item xs={12} lg={6}>
                  <SectionCard title="Contact" action={<Button size="small" onClick={openContact}>Edit</Button>}>
                    <Label>Social Media Links</Label>
                    <List dense disablePadding>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 34, mr: 0.5 }}><LinkedInIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary={<Typography variant="body2" sx={{ wordBreak: "break-word" }}>{parseLinks(profile.linksText).linkedin || "—"}</Typography>} />
                      </ListItem>
                    </List>
                    <Label sx={{ mt: 2 }}>Emails</Label>
                    <List dense disablePadding>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 34 }}><EmailIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary={<Typography variant="body2">{profile.email || "—"}</Typography>} secondary={<Typography variant="caption" color="text.secondary" display="block">Private field.</Typography>} />
                      </ListItem>
                    </List>
                    <Label sx={{ mt: 2, mb: 1 }}>Live Location</Label>
                    {profile.location ? <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><PlaceIcon fontSize="small" /><Typography variant="body2">{profile.location}</Typography></Box> : <Box sx={{ height: 100, borderRadius: 1, bgcolor: "grey.100", border: "1px solid", borderColor: "divider" }} />}
                  </SectionCard>

                  {/* NEW: Trainings & Executive Education (Static Data) */}
                  <SectionCard sx={{ mt: 2 }} title="Trainings & Executive Education" action={<Tooltip title="Add"><IconButton size="small"><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                    <List dense disablePadding>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>Executive Leadership Programme</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">University of Oxford • 2022</Typography>}
                        />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>Advanced AI Strategy</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">MIT Sloan School of Management • 2023</Typography>}
                        />
                      </ListItem>
                    </List>
                  </SectionCard>

                  {/* NEW: Memberships (Static Data) */}
                  <SectionCard sx={{ mt: 2 }} title="Memberships" action={<Tooltip title="Add"><IconButton size="small"><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                    <List dense disablePadding>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>IEEE Computer Society</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">Member since 2018</Typography>}
                        />
                      </ListItem>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>Association for Computing Machinery (ACM)</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">Professional Member</Typography>}
                        />
                      </ListItem>
                    </List>
                  </SectionCard>
                </Grid>
              </Grid>
            </>
          )}
        </Container>
      )}

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

            {/* Dropdowns - Disabled if no latest experience */}
            <TextField select label="Sector" value={workForm.sector} onChange={(e) => setWorkForm({ ...workForm, sector: e.target.value })} fullWidth disabled={!latestExp}>
              {SECTOR_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>

            <TextField select label="Industry" value={workForm.industry} onChange={(e) => setWorkForm({ ...workForm, industry: e.target.value })} fullWidth disabled={!latestExp}>
              {INDUSTRY_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>

            <TextField select label="Number of Employees" value={workForm.employees} onChange={(e) => setWorkForm({ ...workForm, employees: e.target.value })} fullWidth disabled={!latestExp}>
              {EMPLOYEE_COUNT_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </TextField>
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

      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", gap: 2 }}><TextField label="First name" fullWidth value={contactForm.first_name} onChange={(e) => setContactForm((f) => ({ ...f, first_name: e.target.value }))} /><TextField label="Last name" fullWidth value={contactForm.last_name} onChange={(e) => setContactForm((f) => ({ ...f, last_name: e.target.value }))} /></Box>
            <TextField label="Email" type="email" fullWidth value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
            <Autocomplete fullWidth size="small" options={CITY_OPTIONS} value={contactForm.city || null} onChange={(_, value) => setContactForm((f) => ({ ...f, city: value || "" }))} renderInput={(params) => <TextField {...params} label="City" placeholder="Select city" />} />
            <Autocomplete fullWidth size="small" options={COUNTRY_OPTIONS} autoHighlight getOptionLabel={(option) => option.label} value={getSelectedCountry({ location: contactForm.location })} onChange={(_, value) => setContactForm((f) => ({ ...f, location: value?.label || "" }))} renderOption={(props, option) => (<Box component="li" sx={{ display: "flex", gap: 1 }} {...props}><span>{flagEmoji(option.code)}</span><span>{option.label}</span></Box>)} renderInput={(params) => <TextField {...params} label="Country" placeholder="Select country" />} />
            <TextField label="LinkedIn URL" fullWidth value={contactForm.linkedin} onChange={(e) => setContactForm((f) => ({ ...f, linkedin: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setContactOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveContact} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogActions>
      </Dialog>

      {/* --- Education Dialog --- */}
      <Dialog open={eduOpen} onClose={() => { setEduOpen(false); setEditEduId(null); setEduErrors({ start: "", end: "" }); }} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editEduId ? "Edit education" : "Add education"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>*Required fields are marked with an asterisk</Typography>
          <Autocomplete freeSolo options={SCHOOL_OPTIONS} value={eduForm.school} onChange={(_, value) => setEduForm((f) => ({ ...f, school: value || "" }))} onInputChange={(event, newInput) => { if (event && event.type === "change") setEduForm((f) => ({ ...f, school: newInput })); }} renderInput={(params) => <TextField {...params} label="School *" fullWidth sx={{ mb: 2 }} />} />
          <TextField label="Degree *" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <Autocomplete freeSolo options={[...FIELD_OF_STUDY_OPTIONS, "Other"]} value={eduForm.field} onChange={(_, value) => setEduForm((f) => ({ ...f, field: value || "" }))} onInputChange={(event, newInput) => { if (event && event.type === "change") setEduForm((f) => ({ ...f, field: newInput })); }} renderInput={(params) => <TextField {...params} label="Field of Study *" fullWidth sx={{ mb: 2 }} helperText="Pick from list or type your own (Other)." />} />
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 2 }}>
            <TextField label="Start Year" type="number" value={eduForm.start} onChange={(e) => setEduForm((f) => ({ ...f, start: e.target.value }))} fullWidth sx={{ flex: 1 }} inputProps={{ min: 1900, max: new Date().getFullYear() }} error={!!eduErrors.start} helperText={eduErrors.start || ""} />
            <TextField label="End Year" type="number" value={eduForm.end} onChange={(e) => setEduForm((f) => ({ ...f, end: e.target.value }))} fullWidth sx={{ flex: 1 }} inputProps={{ min: 1900, max: new Date().getFullYear() + 10 }} error={!!eduErrors.end} helperText={eduErrors.end || ""} />
          </Box>
          <TextField label="Grade (optional)" value={eduForm.grade} onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {editEduId && <Button color="error" onClick={() => askDeleteEducation(editEduId, `${eduForm.school} — ${eduForm.degree}`)}>Delete</Button>}
          <Button variant="outlined" onClick={() => { setEduOpen(false); setEditEduId(null); setEduErrors({ start: "", end: "" }); setEduForm(EMPTY_EDU_FORM); }}>Cancel</Button>
          <Button variant="contained" onClick={createEducation}>{editEduId ? "Save changes" : "Save"}</Button>
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
          />
          <TextField label="Position *" value={expForm.position} onChange={(e) => setExpForm((f) => ({ ...f, position: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          {/* Sector / Industry / Employees – full-width fields */}
          <TextField
            select
            label="Sector"
            value={expForm.sector || ""}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, sector: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            {SECTOR_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Industry"
            value={expForm.industry || ""}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, industry: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Number of employees"
            value={expForm.number_of_employees || ""}
            onChange={(e) =>
              setExpForm((f) => ({
                ...f,
                number_of_employees: e.target.value,
              }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete fullWidth size="small" options={CITY_OPTIONS} value={CITY_OPTIONS.find((c) => c === expForm.city) || null} onChange={(_, value) => setExpForm((prev) => ({ ...prev, city: value || "" }))} renderInput={(params) => <TextField {...params} label="City" placeholder="Enter city (optional)" fullWidth sx={{ mb: 2 }} />} />
          <Autocomplete fullWidth size="small" options={COUNTRY_OPTIONS} autoHighlight value={getSelectedCountry({ location: expForm.location })} getOptionLabel={(opt) => opt?.label ?? ""} isOptionEqualToValue={(o, v) => o.code === v.code} onChange={(_, newVal) => setExpForm((f) => ({ ...f, location: newVal ? newVal.label : "" }))} renderOption={(props, option) => (<li {...props}><span style={{ marginRight: 8 }}>{option.emoji}</span>{option.label}</li>)} renderInput={(params) => <TextField {...params} label="Country *" placeholder="Select country" fullWidth inputProps={{ ...params.inputProps, autoComplete: "new-password" }} sx={{ mb: 2 }} />} />
          <TextField select label="Employment type *" value={expForm.relationship_to_org} onChange={(e) => setExpForm((f) => ({ ...f, relationship_to_org: e.target.value }))} fullWidth sx={{ mb: 2 }}>
            <MenuItem value="employee">Employee (on payroll)</MenuItem><MenuItem value="independent">Independent (self-employed / contractor / freelance)</MenuItem><MenuItem value="third_party">Third-party (Agency / Consultancy / Temp)</MenuItem>
          </TextField>
          <TextField select label="Work schedule" value={expForm.work_schedule} onChange={(e) => setExpForm((f) => ({ ...f, work_schedule: e.target.value }))} fullWidth sx={{ mb: 2 }}>
            <MenuItem value="full_time">Full-time</MenuItem><MenuItem value="part_time">Part-time</MenuItem>
          </TextField>
          <TextField select fullWidth label="Career stage" value={expForm.career_stage} onChange={(e) => setExpForm((f) => ({ ...f, career_stage: e.target.value }))} sx={{ mb: 1 }}>
            <MenuItem value="internship">Internship</MenuItem><MenuItem value="apprenticeship">Apprenticeship</MenuItem><MenuItem value="trainee">Trainee</MenuItem><MenuItem value="entry">Entry level</MenuItem><MenuItem value="mid">Mid level</MenuItem><MenuItem value="senior">Senior level</MenuItem>
          </TextField>
          <TextField select label="Work arrangement" value={expForm.work_arrangement} onChange={(e) => setExpForm((f) => ({ ...f, work_arrangement: e.target.value }))} fullWidth sx={{ mb: 2 }}>
            <MenuItem value="onsite">On-site</MenuItem><MenuItem value="hybrid">Hybrid</MenuItem><MenuItem value="remote">Remote</MenuItem>
          </TextField>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}><TextField label="Start Date" type="date" value={expForm.start} onChange={(e) => setExpForm((f) => ({ ...f, start: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="End Date" type="date" value={expForm.end} onChange={(e) => setExpForm((f) => ({ ...f, end: e.target.value }))} fullWidth disabled={expForm.current} InputLabelProps={{ shrink: true }} /></Grid>
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
          {!!editExpId && <Button color="error" onClick={() => askDeleteExperience(editExpId, `${expForm.org} — ${expForm.position}`)}>Delete</Button>}
          <Button variant="outlined" onClick={() => { setExpOpen(false); setEditExpId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={createExperience}>{editExpId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* --- Delete confirmation dialog for edu/exp --- */}
      <Dialog open={confirm.open} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>Delete {confirm.type === "edu" ? "education" : "experience"}?</DialogTitle>
        <DialogContent>{confirm.label && <DialogContentText sx={{ mb: 1 }}>{confirm.label}</DialogContentText>}<DialogContentText>This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={closeConfirm}>Cancel</Button><Button color="error" variant="contained" onClick={doConfirmDelete}>Delete</Button></DialogActions>
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
                <Typography variant="body2" color="text.secondary">Add skills separated by commas. We’ll store them as a list.</Typography>
                <TextField multiline minRows={3} value={aboutForm.skillsText} onChange={(e) => setAboutForm((f) => ({ ...f, skillsText: e.target.value }))} placeholder='e.g. Event strategy, Sponsorships, Community building' fullWidth helperText='Example: "Community building, Partnerships" or ["Community building","Partnerships"]' />
                {parseSkills(aboutForm.skillsText).length > 0 && (<Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>{parseSkills(aboutForm.skillsText).map((s, i) => (<Chip key={i} label={s} size="small" />))}</Box>)}
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
    </Box>
  );
}