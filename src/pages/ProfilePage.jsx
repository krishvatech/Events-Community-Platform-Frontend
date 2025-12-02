// src/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Avatar, Box, Button, Container, Divider, Grid, LinearProgress, Paper,
  Snackbar, Alert, TextField, Typography, Card, CardHeader, CardContent,
  List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Chip,
  FormControlLabel, Checkbox, InputAdornment, Collapse, IconButton, Tooltip,
  useMediaQuery, useTheme, MenuItem, Stack, ListItemAvatar, CircularProgress
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AccountSidebar from "../components/AccountSidebar.jsx";
import Autocomplete from "@mui/material/Autocomplete";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";

// -------------------- Constants for Dropdowns --------------------
const SECTOR_OPTIONS = [
  "Private Sector", "Public Sector", "Non-Profit", "Government", "Education",
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Healthcare", "Education", "Manufacturing", "Retail",
  "Media", "Real Estate", "Transportation", "Energy",
];

const EMPLOYEE_COUNT_OPTIONS = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000-5000", "5000+",
];

// -------------------- API helpers --------------------
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

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

isoCountries.registerLocale(enLocale);

const flagEmoji = (code) =>
  code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));

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

// ---- Education dropdown options ----
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

const CITY_OPTIONS = [
  "Abu Dhabi", "Accra", "Ahmedabad", "Amsterdam", "Athens", "Auckland", "Bangkok",
  "Barcelona", "Beijing", "Bengaluru", "Berlin", "Bhopal", "Bogotá", "Brisbane",
  "Brussels", "Buenos Aires", "Cairo", "Cape Town", "Chennai", "Chicago", "Copenhagen",
  "Dallas", "Delhi", "Doha", "Dubai", "Dublin", "Edinburgh", "Frankfurt", "Geneva",
  "Hong Kong", "Hyderabad", "Indore", "Istanbul", "Jaipur", "Jakarta", "Johannesburg",
  "Kolkata", "Kuala Lumpur", "Lisbon", "London", "Los Angeles", "Lucknow", "Madrid",
  "Manila", "Melbourne", "Mexico City", "Milan", "Montreal", "Moscow", "Mumbai",
  "Nagpur", "Nashik", "New York", "Osaka", "Ottawa", "Paris", "Patna", "Perth",
  "Prague", "Pune", "Rajkot", "Rio de Janeiro", "Rome", "San Francisco", "Santiago",
  "São Paulo", "Seattle", "Seoul", "Shanghai", "Singapore", "Stockholm", "Surat",
  "Sydney", "Thane", "Tokyo", "Toronto", "Vadodara", "Vancouver", "Vienna",
  "Visakhapatnam", "Warsaw", "Washington", "Wellington", "Zurich",
];

// -------------------- Small UI helpers --------------------
function SectionCard({ title, action, children, sx }) {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, width: '100%', mx: { xs: 'auto', md: 0 }, ...sx }}
    >
      <CardHeader
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>}
        action={action}
        sx={{ pb: 0.5, '& .MuiCardHeader-action': { alignSelf: 'center' } }}
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

// -------------------- Company Autocomplete --------------------
function CompanyAutocomplete({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
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
// Avatar Upload Dialog
// -----------------------------------------------------------------------------
function AvatarUploadDialog({ open, file, preview, currentUrl, saving, onPick, onClose, onSaved, setSaving }) {
  const inputRef = useRef(null);
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
      { url: `${API_BASE}/users/me/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_BASE}/auth/me/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_BASE}/users/me/`, method: "PATCH", field: "avatar" },
    ];
    for (const c of candidates) {
      try {
        const fd = new FormData();
        fd.append(c.field, theFile, theFile.name);
        const r = await fetch(c.url, { method: c.method, headers: { ...tokenHeader() }, body: fd });
        if (!r.ok) continue;
        let j = {};
        try { j = await r.json(); } catch { }
        const newUrl = j?.avatar || j?.profile?.avatar || j?.user_image_url || null;
        if (newUrl) return newUrl;
      } catch { }
    }
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
// Basic Info Dialog (Header Trigger) - Identity & Name Change Entry
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

          {/* LOCKED NAMES */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="First Name" fullWidth disabled value={profile?.first_name || ""} />
            <TextField label="Last Name" fullWidth disabled value={profile?.last_name || ""} />
          </Box>

          {/* REQUEST BUTTON */}
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
// Name Change Request Dialog (Updated to use showToast)
// -----------------------------------------------------------------------------
function NameChangeDialog({ open, onClose, currentNames, showToast }) {
  const [form, setForm] = React.useState({
    new_first_name: "", new_middle_name: "", new_last_name: "", reason: "",
  });
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
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
      const res = await fetch(`${API_BASE}/users/me/name-change-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
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

// -------------------- Page --------------------
export default function ProfilePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  
  // New helper for consistent toast notifications
  const showNotification = (type, msg) => {
    setSnack({ open: true, sev: type, msg });
  };

  const [mode, setMode] = useState("preview");
  const [friendCount, setFriendCount] = useState(0);

  // Avatar State
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Dialogs
  const [eduOpen, setEduOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [editEduId, setEditEduId] = useState(null);
  const [editExpId, setEditExpId] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutMode, setAboutMode] = useState("description");
  const [contactOpen, setContactOpen] = useState(false);

  // Name Change Request State
  const [nameChangeOpen, setNameChangeOpen] = useState(false);
  const [basicInfoOpen, setBasicInfoOpen] = useState(false); // Header Identity Dialog

  // Lists & Forms
  const [eduList, setEduList] = useState([]);
  const [expList, setExpList] = useState([]);
  const [aboutForm, setAboutForm] = useState({ bio: "", skillsText: "" });
  const [contactForm, setContactForm] = useState({ first_name: "", last_name: "", email: "", linkedin: "", city: "", location: "" });
  const [workOpen, setWorkOpen] = useState(false);
  const [workForm, setWorkForm] = useState({ sector: "", industry: "", employees: "" });

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", full_name: "", timezone: "",
    bio: "", headline: "", job_title: "", company: "", location: "",
    skillsText: "", linksText: "", avatar: ""
  });

  const [confirm, setConfirm] = useState({ open: false, type: null, id: null, label: "" });

  const EMPTY_EDU_FORM = { school: "", degree: "", field: "", start: "", end: "", grade: "" };
  const initialExpForm = {
    org: "", position: "", city: "", location: "", start: "", end: "", current: false,
    employment_type: "full_time", work_schedule: "", relationship_to_org: "", career_stage: "",
    work_arrangement: "", description: "", exit_reason: "", sector: "", industry: "", number_of_employees: "",
  };
  const [eduForm, setEduForm] = useState(EMPTY_EDU_FORM);
  const [eduErrors, setEduErrors] = useState({ start: "", end: "" });
  const [expForm, setExpForm] = useState(initialExpForm);
  const [syncProfileLocation, setSyncProfileLocation] = useState(false);

  // Helpers
  const latestExp = useMemo(() => expList.length > 0 ? expList[0] : null, [expList]);
  const fullName = `${form.first_name || ""} ${form.last_name || ""}`.trim() || "User";

  const toMonthYear = (d) => {
    if (!d) return "";
    const [y, m] = String(d).split("-");
    const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return mi != null && y ? `${MONTHS[mi]} ${y}` : String(d);
  };
  const rangeLinkedIn = (s, e, cur) => {
    const start = toMonthYear(s);
    const end = cur ? "present" : toMonthYear(e);
    return (start || end) ? `${start} - ${end || ""}` : "";
  };
  const shouldShowExitReason = () => {
    if (!expForm.end || expForm.current) return false;
    const endDate = new Date(expForm.end);
    const today = new Date();
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  };
  function buildLocationFromForm(f) {
    const city = (f.city || "").trim();
    const country = (f.location || "").trim();
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return "";
  }

  // Sync Work Form
  useEffect(() => {
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

  // Load Profile
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const url = `${API_BASE}/users/me/`;
        const r = await fetch(url, { headers: tokenHeader(), signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!alive) return;
        const prof = data?.profile || {};
        setForm({
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          email: data?.email || "",
          full_name: prof.full_name || "",
          timezone: prof.timezone || "",
          bio: prof.bio || "",
          headline: prof.headline || "",
          job_title: prof.job_title || "",
          company: prof.company || "",
          location: prof.location || "",
          avatar: prof.user_image_url || prof.avatar || data.avatar || "",
          skillsText: Array.isArray(prof.skills) ? prof.skills.join(", ") : typeof prof.skills === "string" ? prof.skills : "",
          linksText: prof.links ? JSON.stringify(prof.links) : "",
        });
      } catch (e) {
        if (e?.name === "AbortError") return;
        showNotification("error", e?.message || "Failed to load profile");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; ctrl.abort(); };
  }, []);

  useEffect(() => { loadMeExtras(); fetchMyFriends(); }, []);

  async function fetchMyFriends() {
    const candidates = [`${API_BASE}/friends/`, `${API_BASE}/users/friends/`, `${API_BASE}/users/me/friends/`];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...tokenHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        setFriendCount(Number(data?.count ?? rows.length) || 0);
        return;
      } catch { }
    }
    setFriendCount(0);
  }

  // --- Handlers ---
  const saveAboutWork = async () => {
    if (!latestExp) { showNotification("error", "Please add an experience entry first."); return; }
    try {
      setSaving(true);
      const payload = { sector: workForm.sector, industry: workForm.industry, number_of_employees: workForm.employees };
      const r = await fetch(`${API_BASE}/auth/me/experiences/${latestExp.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json", ...tokenHeader() }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed to update work details");
      showNotification("success", "Work details updated");
      setWorkOpen(false);
      await loadMeExtras();
    } catch (e) { showNotification("error", e.message || "Save failed"); } finally { setSaving(false); }
  };

  const openEditAbout = (mode = "description") => {
    setAboutMode(mode);
    setAboutForm({ bio: form.bio || "", skillsText: form.skillsText || "" });
    setAboutOpen(true);
  };

  const openEditContact = () => {
    const locStr = (form.location || "").trim();
    let city = "", country = "";
    if (locStr) {
      const parts = locStr.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 1) {
        const maybeCountry = getSelectedCountry({ location: parts[0] });
        if (maybeCountry) country = maybeCountry.label; else city = parts[0];
      } else if (parts.length >= 2) {
        city = parts[0];
        const lastPart = parts[parts.length - 1];
        const maybeCountry = getSelectedCountry({ location: lastPart });
        country = maybeCountry ? maybeCountry.label : lastPart;
      }
    }
    const linksObj = parseLinks(form.linksText);
    setContactForm({
      first_name: form.first_name || "", last_name: form.last_name || "", email: form.email || "",
      linkedin: typeof linksObj.linkedin === "string" ? linksObj.linkedin : "", city, location: country,
    });
    setContactOpen(true);
  };

  function askDeleteEducation(id, label = "") { setConfirm({ open: true, type: "edu", id, label }); }
  function askDeleteExperience(id, label = "") { setConfirm({ open: true, type: "exp", id, label }); }
  function closeConfirm() { setConfirm({ open: false, type: null, id: null, label: "" }); }

  async function doConfirmDelete() {
    const { type, id } = confirm;
    if (!type || !id) return;
    try {
      const url = type === "edu" ? `${API_BASE}/auth/me/educations/${id}/` : `${API_BASE}/auth/me/experiences/${id}/`;
      const r = await fetch(url, { method: "DELETE", headers: tokenHeader() });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      showNotification("success", type === "edu" ? "Education deleted" : "Experience deleted");
      setEduOpen(false); setExpOpen(false); setEditEduId(null); setEditExpId(null);
      closeConfirm();
      await loadMeExtras();
    } catch (e) { showNotification("error", e?.message || "Delete failed"); closeConfirm(); }
  }

  async function saveAbout() {
    try {
      setSaving(true);
      const payload = {
        first_name: form.first_name, last_name: form.last_name, email: form.email,
        profile: {
          full_name: form.full_name, timezone: form.timezone, bio: aboutForm.bio,
          headline: form.headline, job_title: form.job_title, company: form.company,
          location: form.location, skills: parseSkills(aboutForm.skillsText), links: parseLinks(form.linksText),
        },
      };
      const r = await fetch(`${API_BASE}/users/me/`, { method: "PUT", headers: { "Content-Type": "application/json", ...tokenHeader() }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Save failed");
      setForm(f => ({ ...f, bio: aboutForm.bio, skillsText: aboutForm.skillsText }));
      showNotification("success", "About updated");
      setAboutOpen(false);
    } catch (e) { showNotification("error", e?.message || "Save failed"); } finally { setSaving(false); }
  }

  async function saveContact() {
    try {
      setSaving(true);
      const firstName = (contactForm.first_name || "").trim();
      const lastName = (contactForm.last_name || "").trim();
      const email = (contactForm.email || "").trim();
      const linkedinUrl = (contactForm.linkedin || "").trim();
      const locationString = buildLocationFromForm(contactForm);
      const existingLinks = parseLinks(form.linksText);
      const newLinks = { ...existingLinks };
      if (linkedinUrl) newLinks.linkedin = linkedinUrl; else delete newLinks.linkedin;

      const payload = {
        first_name: firstName, last_name: lastName, email: email || undefined,
        profile: {
          full_name: form.full_name, timezone: form.timezone, bio: form.bio, headline: form.headline,
          job_title: form.job_title, company: form.company, location: locationString,
          skills: parseSkills(form.skillsText), links: newLinks,
        },
      };
      const r = await fetch(`${API_BASE}/users/me/`, { method: "PUT", headers: { "Content-Type": "application/json", ...tokenHeader() }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Save failed");
      setForm(prev => ({ ...prev, first_name: firstName, last_name: lastName, email: email || "", location: locationString, linksText: Object.keys(newLinks).length > 0 ? JSON.stringify(newLinks) : "" }));
      showNotification("success", "Contact updated");
      setContactOpen(false);
    } catch (e) { showNotification("error", e?.message || "Save failed"); } finally { setSaving(false); }
  }

  async function createEducation() {
    try {
      setEduErrors({ start: "", end: "" });
      const startY = eduForm.start ? parseInt(eduForm.start, 10) : null;
      const endY = eduForm.end ? parseInt(eduForm.end, 10) : null;
      const currentYear = new Date().getFullYear();
      if (startY && startY > currentYear) { setEduErrors(p => ({ ...p, start: "Start year cannot be in the future" })); return; }
      if (startY && endY && endY < startY) { setEduErrors(p => ({ ...p, end: "End year cannot be before start year" })); return; }
      const normalizeYear = (val) => {
        const y = String(val || "").trim();
        if (!y) return null;
        const year = parseInt(y, 10);
        if (!year || year < 1900 || year > 2100) return null;
        return `${year}-01-01`;
      };
      const url = editEduId ? `${API_BASE}/auth/me/educations/${editEduId}/` : `${API_BASE}/auth/me/educations/`;
      const payload = { school: (eduForm.school || "").trim(), degree: (eduForm.degree || "").trim(), field_of_study: (eduForm.field || "").trim(), start_date: normalizeYear(eduForm.start), end_date: normalizeYear(eduForm.end), grade: (eduForm.grade || "").trim() };
      if (!payload.school || !payload.degree) { showNotification("error", "Please fill School and Degree."); return; }
      const r = await fetch(url, { method: editEduId ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...tokenHeader() }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed to save education");
      showNotification("success", editEduId ? "Education updated" : "Education added");
      setEduOpen(false); setEditEduId(null); setEduForm(EMPTY_EDU_FORM);
      await loadMeExtras();
    } catch (e) { showNotification("error", e?.message || "Save failed"); }
  }

  async function createExperience() {
    try {
      const url = editExpId ? `${API_BASE}/auth/me/experiences/${editExpId}/` : `${API_BASE}/auth/me/experiences/`;
      const r = await fetch(url, {
        method: editExpId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({
          community_name: expForm.org, position: expForm.position, location: buildLocationFromForm(expForm),
          start_date: expForm.start || null, end_date: expForm.current ? null : (expForm.end || null),
          currently_work_here: !!expForm.current, description: expForm.description || "",
          exit_reason: expForm.exit_reason || "", employment_type: expForm.employment_type || "full_time",
          work_schedule: expForm.work_schedule || "", relationship_to_org: expForm.relationship_to_org || "",
          career_stage: expForm.career_stage || "", compensation_type: expForm.compensation_type || "",
          work_arrangement: expForm.work_arrangement || "", sector: expForm.sector || "",
          industry: expForm.industry || "", number_of_employees: expForm.number_of_employees || ""
        }),
      });
      if (!r.ok) throw new Error("Failed to save experience");
      if (syncProfileLocation && expForm.location) {
        try {
          const locationString = buildLocationFromForm(expForm);
          const payload = {
            first_name: form.first_name, last_name: form.last_name, email: form.email,
            profile: {
              full_name: form.full_name, timezone: form.timezone, bio: form.bio, headline: form.headline,
              job_title: form.job_title, company: form.company, location: locationString,
              skills: parseSkills(form.skillsText), links: parseLinks(form.linksText),
            },
          };
          const resp = await fetch(`${API_BASE}/users/me/`, { method: "PUT", headers: { "Content-Type": "application/json", ...tokenHeader() }, body: JSON.stringify(payload) });
          if (resp.ok) setForm(prev => ({ ...prev, location: locationString }));
        } catch (err) { console.error("Sync failed", err); }
      }
      showNotification("success", editExpId ? "Experience updated" : "Experience added");
      setExpOpen(false); setEditExpId(null); setExpForm(initialExpForm);
      await loadMeExtras();
    } catch (e) { showNotification("error", e?.message || "Save failed"); }
  }

  async function loadMeExtras() {
    try {
      const r = await fetch(`${API_BASE}/auth/me/profile/`, { headers: tokenHeader() });
      if (r.ok) {
        const data = await r.json();
        setEduList(Array.isArray(data.educations) ? data.educations : []);
        setExpList(Array.isArray(data.experiences) ? data.experiences : []);
        return;
      }
    } catch { }
    try {
      const [e1, e2] = await Promise.all([
        fetch(`${API_BASE}/auth/me/educations/`, { headers: tokenHeader() }),
        fetch(`${API_BASE}/auth/me/experiences/`, { headers: tokenHeader() }),
      ]);
      if (e1.ok) setEduList(await e1.json());
      if (e2.ok) setExpList(await e2.json());
    } catch { }
  }

  function onEditEducation(item) {
    setEditEduId(item.id);
    const startYear = (item.start || item.start_date || "").slice(0, 4);
    const endYear = (item.end || item.end_date || "").slice(0, 4);
    setEduForm({ school: item.school || "", degree: item.degree || "", field: item.field_of_study || "", start: startYear || "", end: endYear || "", grade: item.grade || "" });
    setEduErrors({ start: "", end: "" });
    setEduOpen(true);
  }

  function openAddExperience() { setEditExpId(null); setExpForm(initialExpForm); setSyncProfileLocation(false); setExpOpen(true); }

  function onEditExperience(item) {
    const loc = (item.location || "").trim();
    let city = "", country = "";
    if (loc) {
      const parts = loc.split(",").map(p => p.trim()).filter(Boolean);
      if (parts.length === 1) {
        const maybeCountry = getSelectedCountry({ location: parts[0] });
        if (maybeCountry) country = maybeCountry.label; else city = parts[0];
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
      exit_reason: item.exit_reason || "", sector: item.sector || "", industry: item.industry || "",
      number_of_employees: item.number_of_employees || ""
    });
    setSyncProfileLocation(false);
    setExpOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          <aside className="col-span-12 lg:col-span-3">
            <AccountSidebar stickyTop={96} />
          </aside>

          <main className="col-span-12 lg:col-span-9">
            {loading && <LinearProgress />}
            {!loading && mode === 'preview' && (
              <Box>
                {/* --- HEADER CARD (Matching HomePage) --- */}
                <Card variant="outlined" sx={{ width: "100%", borderRadius: 3, p: 2, mb: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ width: "100%" }}>
                    <Box sx={{ position: "relative", mr: { sm: 2 }, width: 72, height: 72 }}>
                      <Avatar src={form.avatar || ""} sx={{ width: 72, height: 72 }}>
                        {(fullName[0] || "").toUpperCase()}
                      </Avatar>
                      <Tooltip title="Change photo">
                        <IconButton
                          size="small"
                          onClick={() => { setAvatarPreview(form.avatar || ""); setAvatarDialogOpen(true); }}
                          sx={{ position: "absolute", right: -6, bottom: -6, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", boxShadow: 1 }}
                        >
                          <PhotoCameraRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ flex: { xs: "0 0 auto", sm: 1 }, width: { xs: "100%", sm: "auto" } }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{fullName}</Typography>
                      </Stack>
                      {latestExp ? (
                        <Typography variant="body2" color="text.secondary">
                          {latestExp.position} – {latestExp.community_name || latestExp.org}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">{form.headline || form.job_title || ""}</Typography>
                      )}
                    </Box>

                    {/* --- EDIT BUTTON (Identity) --- */}
                    <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
                      <Tooltip title="Identity Details">
                        <IconButton size="small" onClick={() => setBasicInfoOpen(true)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

                {/* --- CONTENT GRID --- */}
                <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                  {/* LEFT COLUMN */}
                  <Grid item xs={12} lg={6}>
                    <SectionCard title="About" action={<Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEditAbout("description")}>Edit</Button>}>
                      <Label>Summary</Label>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>{form.bio?.trim() ? form.bio : "Add a short description about your role, focus areas, and what you're working on."}</Typography>
                    </SectionCard>

                    <SectionCard sx={{ mt: 2 }} title="Skills" action={<Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEditAbout("skills")}>Edit</Button>}>
                      {parseSkills(form.skillsText).length ? (
                        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {parseSkills(form.skillsText).map((s, i) => (<Chip key={i} size="small" label={s} sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }} />))}
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
                        <Box sx={{ textAlign: "center", py: 4 }}><Avatar sx={{ width: 64, height: 64, bgcolor: "grey.200", color: "grey.600", mb: 1 }}><WorkOutlineIcon /></Avatar><Typography variant="body2" color="text.secondary">Add your work experience.</Typography></Box>
                      )}
                    </SectionCard>

                    <SectionCard sx={{ mt: 2 }} title="Education" action={<Button size="small" variant="outlined" onClick={() => setEduOpen(true)}>Add more</Button>}>
                      {eduList.length ? (
                        <List dense disablePadding>
                          {eduList.map((e) => (
                            <ListItem key={e.id} disableGutters sx={{ py: 0.5, pr: { xs: 0, md: 9 } }} secondaryAction={
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                                <Tooltip title="Edit"><IconButton size="small" onClick={() => onEditEducation(e)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Delete"><IconButton size="small" onClick={() => askDeleteEducation(e.id, `${e.school} — ${e.degree}`)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                              </Box>
                            }>
                              <ListItemText primary={<Typography variant="body2" fontWeight={500}>{e.degree || "Degree"} — {e.school || "School"}</Typography>} secondary={<Typography variant="body2" color="text.secondary">{[(e.start_date || "").slice(0, 4), (e.end_date || "").slice(0, 4)].filter(Boolean).join(" - ")}{e.field_of_study ? ` · ${e.field_of_study}` : ""}{e.grade ? ` · Grade: ${e.grade}` : ""}</Typography>} />
                            </ListItem>
                          ))}
                        </List>
                      ) : <Box sx={{ textAlign: 'center', py: 4 }}><Avatar sx={{ width: 64, height: 64, bgcolor: 'grey.200', mx: 'auto' }} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This section is empty</Typography><Box><Button variant="contained" color="success" size="small" sx={{ mt: 1.5 }} onClick={() => { setEditEduId(null); setEduForm(EMPTY_EDU_FORM); setEduOpen(true); }}>Create</Button></Box></Box>}
                    </SectionCard>
                    <SectionCard sx={{ mt: 2 }} title="Certifications & Licenses" action={<Tooltip title="Add"><IconButton size="small"><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                      <List dense disablePadding>
                        <ListItem disableGutters>
                          <ListItemText primary={<Typography variant="body2" fontWeight={600}>AWS Certified Solutions Architect – Associate</Typography>} secondary={<Typography variant="caption" color="text.secondary">Amazon Web Services (AWS) • Issued Jan 2023</Typography>} />
                        </ListItem>
                        <ListItem disableGutters>
                          <ListItemText primary={<Typography variant="body2" fontWeight={600}>Google Professional Machine Learning Engineer</Typography>} secondary={<Typography variant="caption" color="text.secondary">Google Cloud • Issued Jun 2023</Typography>} />
                        </ListItem>
                      </List>
                    </SectionCard>
                  </Grid>

                  {/* RIGHT COLUMN */}
                  <Grid item xs={12} lg={6}>
                    <SectionCard title="Contact" action={<Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={openEditContact}>Edit</Button>}>
                      <Label>Social Media Links</Label>
                      <List dense disablePadding>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 34, mr: 0.5 }}><LinkedInIcon fontSize="small" /></ListItemIcon>
                          <ListItemText primary={<Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{parseLinks(form.linksText).linkedin || '—'}</Typography>} />
                        </ListItem>
                      </List>
                      <Label sx={{ mt: 2 }}>Emails</Label>
                      <List dense disablePadding>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 34 }}><EmailIcon fontSize="small" /></ListItemIcon>
                          <ListItemText primary={<Typography variant="body2">{form.email || '—'}</Typography>} secondary={<Typography variant="caption" color="text.secondary" display="block">Private field.</Typography>} />
                        </ListItem>
                      </List>
                      <Label sx={{ mt: 2, mb: 1 }}>Live Location</Label>
                      {form.location ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PlaceIcon fontSize="small" /><Typography variant="body2">{form.location}</Typography></Box> : <Box sx={{ height: 100, borderRadius: 1, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider' }} />}
                    </SectionCard>

                    <SectionCard sx={{ mt: 2 }} title="Trainings & Executive Education" action={<Tooltip title="Add"><IconButton size="small"><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                      <List dense disablePadding>
                        <ListItem disableGutters>
                          <ListItemText primary={<Typography variant="body2" fontWeight={600}>Executive Leadership Programme</Typography>} secondary={<Typography variant="caption" color="text.secondary">University of Oxford • 2022</Typography>} />
                        </ListItem>
                        <ListItem disableGutters>
                          <ListItemText primary={<Typography variant="body2" fontWeight={600}>Advanced AI Strategy</Typography>} secondary={<Typography variant="caption" color="text.secondary">MIT Sloan School of Management • 2023</Typography>} />
                        </ListItem>
                      </List>
                    </SectionCard>

                    <SectionCard sx={{ mt: 2 }} title="Memberships" action={<Tooltip title="Add"><IconButton size="small"><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                      <List dense disablePadding>
                        <ListItem disableGutters>
                          <ListItemText primary={<Typography variant="body2" fontWeight={600}>IEEE Computer Society</Typography>} secondary={<Typography variant="caption" color="text.secondary">Member since 2018</Typography>} />
                        </ListItem>
                        <ListItem disableGutters>
                          <ListItemText primary={<Typography variant="body2" fontWeight={600}>Association for Computing Machinery (ACM)</Typography>} secondary={<Typography variant="caption" color="text.secondary">Professional Member</Typography>} />
                        </ListItem>
                      </List>
                    </SectionCard>
                  </Grid>
                </Grid>
              </Box>
            )}
          </main>
        </div>
      </Container>

      {/* --- Avatar Upload Dialog --- */}
      <AvatarUploadDialog
        open={avatarDialogOpen}
        file={avatarFile}
        preview={avatarPreview}
        currentUrl={form.avatar}
        saving={avatarSaving}
        onPick={(f, url) => { setAvatarFile(f); setAvatarPreview(url); }}
        onClose={() => { setAvatarDialogOpen(false); setAvatarFile(null); setAvatarPreview(""); }}
        onSaved={(newUrl) => {
          if (newUrl) setForm((p) => ({ ...p, avatar: newUrl }));
          setAvatarDialogOpen(false);
          setAvatarFile(null);
          setAvatarPreview("");
        }}
        setSaving={setAvatarSaving}
      />

      {/* --- NEW DIALOG: Identity (Header Trigger) --- */}
      <BasicInfoDialog
        open={basicInfoOpen}
        onClose={() => setBasicInfoOpen(false)}
        profile={form}
        onRequestNameChange={() => {
          setBasicInfoOpen(false);
          setNameChangeOpen(true);
        }}
      />

      {/* --- NEW DIALOG: Edit About Work --- */}
      <Dialog open={workOpen} onClose={() => setWorkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit About your work</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Latest Position (Auto-detected)</Typography>
              {latestExp ? (
                <>
                  <Typography variant="body1" fontWeight={600}>{latestExp.position}</Typography>
                  <Typography variant="body2" color="text.secondary">at {latestExp.community_name || latestExp.org}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>To change this, please update your Experience section.</Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">No experience found. Add an experience entry to populate this.</Typography>
              )}
            </Box>
            <TextField select label="Sector" value={workForm.sector} onChange={(e) => setWorkForm({ ...workForm, sector: e.target.value })} fullWidth disabled={!latestExp}>{SECTOR_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}</TextField>
            <TextField select label="Industry" value={workForm.industry} onChange={(e) => setWorkForm({ ...workForm, industry: e.target.value })} fullWidth disabled={!latestExp}>{INDUSTRY_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}</TextField>
            <TextField select label="Number of Employees" value={workForm.employees} onChange={(e) => setWorkForm({ ...workForm, employees: e.target.value })} fullWidth disabled={!latestExp}>{EMPLOYEE_COUNT_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}</TextField>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setWorkOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveAboutWork} disabled={saving || !latestExp}>Save</Button></DialogActions>
      </Dialog>

      {/* --- Other Dialogs (Contact, Education, Experience, etc.) --- */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit contact</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 2 }}>
            <TextField label="First name" fullWidth disabled value={contactForm.first_name} />
            <TextField label="Last name" fullWidth disabled value={contactForm.last_name} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Button startIcon={<HistoryEduRoundedIcon />} sx={{ textTransform: 'none' }} onClick={() => { setContactOpen(false); setNameChangeOpen(true); }}>Request Name Change</Button>
          </Box>
          <TextField label="Email" type="email" fullWidth sx={{ mb: 2 }} value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
          <TextField label="LinkedIn URL" fullWidth sx={{ mb: 2 }} placeholder="https://www.linkedin.com/in/username" value={contactForm.linkedin} onChange={(e) => setContactForm((f) => ({ ...f, linkedin: e.target.value }))} />
          <Autocomplete fullWidth size="small" options={CITY_OPTIONS} value={CITY_OPTIONS.find((c) => c === contactForm.city) || null} onChange={(_, value) => setContactForm((prev) => ({ ...prev, city: value || "" }))} renderInput={(params) => <TextField {...params} label="City" placeholder="Select city" sx={{ mb: 2 }} />} />
          <Autocomplete size="small" fullWidth options={COUNTRY_OPTIONS} autoHighlight value={getSelectedCountry({ location: contactForm.location })} getOptionLabel={(opt) => opt?.label ?? ""} isOptionEqualToValue={(o, v) => o.code === v.code} onChange={(_, newVal) => setContactForm((f) => ({ ...f, location: newVal ? newVal.label : "" }))} renderOption={(props, option) => (<li {...props}><span style={{ marginRight: 8 }}>{option.emoji}</span>{option.label}</li>)} renderInput={(params) => <TextField {...params} label="Country" placeholder="Select country" fullWidth />} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setContactOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveContact} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={eduOpen} onClose={() => { setEduOpen(false); setEditEduId(null); setEduErrors({ start: "", end: "" }); }} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editEduId ? "Edit education" : "Add education"}</DialogTitle>
        <DialogContent dividers>
          <Autocomplete freeSolo options={SCHOOL_OPTIONS} value={eduForm.school} onChange={(_, newValue) => setEduForm((f) => ({ ...f, school: newValue || "" }))} onInputChange={(event, newInput) => { if (event && event.type === "change") setEduForm((f) => ({ ...f, school: newInput })); }} renderInput={(params) => <TextField {...params} label="School *" fullWidth sx={{ mb: 2 }} />} />
          <TextField label="Degree *" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <Autocomplete freeSolo options={[...FIELD_OF_STUDY_OPTIONS, "Other"]} value={eduForm.field} onChange={(_, newValue) => setEduForm((f) => ({ ...f, field: newValue || "" }))} onInputChange={(event, newInput) => { if (event && event.type === "change") setEduForm((f) => ({ ...f, field: newInput })); }} renderInput={(params) => <TextField {...params} label="Field of Study *" fullWidth sx={{ mb: 2 }} helperText="Pick from list or type your own (Other)." />} />
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 2 }}>
            <TextField label="Start Year" type="number" value={eduForm.start} onChange={(e) => setEduForm((f) => ({ ...f, start: e.target.value }))} fullWidth sx={{ flex: 1 }} inputProps={{ min: 1900, max: new Date().getFullYear() }} error={!!eduErrors.start} helperText={eduErrors.start || ""} />
            <TextField label="End Year" type="number" value={eduForm.end} onChange={(e) => setEduForm((f) => ({ ...f, end: e.target.value }))} fullWidth sx={{ flex: 1 }} inputProps={{ min: 1900, max: new Date().getFullYear() + 10 }} error={!!eduErrors.end} helperText={eduErrors.end || ""} />
          </Box>
          <TextField label="Grade (optional)" value={eduForm.grade} onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions>
          {editEduId && <Button color="error" onClick={() => askDeleteEducation(editEduId, `${eduForm.school || ""} — ${eduForm.degree || ""}`)}>Delete</Button>}
          <Button onClick={() => { setEduOpen(false); setEditEduId(null); setEduErrors({ start: "", end: "" }); setEduForm(EMPTY_EDU_FORM); }}>Cancel</Button>
          <Button variant="contained" onClick={createEducation}>{editEduId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={expOpen} onClose={() => setExpOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editExpId ? "Edit experience" : "Create experience"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>*Required fields are marked with an asterisk</Typography>
          <CompanyAutocomplete value={expForm.org ? { name: expForm.org } : null} onChange={(newVal) => { const name = typeof newVal === 'string' ? newVal : (newVal?.name || ""); setExpForm(prev => ({ ...prev, org: name })); }} />
          <TextField label="Position *" value={expForm.position} onChange={(e) => setExpForm((f) => ({ ...f, position: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <TextField select label="Sector" fullWidth sx={{ mb: 2 }} value={expForm.sector || ""} onChange={(e) => setExpForm((f) => ({ ...f, sector: e.target.value }))}>{SECTOR_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}</TextField>
          <TextField select label="Industry" fullWidth sx={{ mb: 2 }} value={expForm.industry || ""} onChange={(e) => setExpForm((f) => ({ ...f, industry: e.target.value }))}>{INDUSTRY_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}</TextField>
          <TextField select label="Number of employees" fullWidth sx={{ mb: 2 }} value={expForm.number_of_employees || ""} onChange={(e) => setExpForm((f) => ({ ...f, number_of_employees: e.target.value }))}>{EMPLOYEE_COUNT_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}</TextField>
          <Autocomplete fullWidth size="small" options={CITY_OPTIONS} value={CITY_OPTIONS.find((c) => c === expForm.city) || null} onChange={(_, value) => setExpForm((prev) => ({ ...prev, city: value || "" }))} renderInput={(params) => <TextField {...params} label="City" placeholder="Select city" sx={{ mb: 2 }} />} />
          <Autocomplete size="small" fullWidth options={COUNTRY_OPTIONS} autoHighlight value={getSelectedCountry({ location: expForm.location })} getOptionLabel={(opt) => opt?.label ?? ""} isOptionEqualToValue={(o, v) => o.code === v.code} onChange={(_, newVal) => setExpForm((f) => ({ ...f, location: newVal ? newVal.label : "" }))} renderOption={(props, option) => (<li {...props}><span style={{ marginRight: 8 }}>{option.emoji}</span>{option.label}</li>)} renderInput={(params) => <TextField {...params} label="Country *" placeholder="Select country" fullWidth inputProps={{ ...params.inputProps, autoComplete: "new-password" }} sx={{ mb: 2 }} />} />
          <TextField select label="Employment type *" value={expForm.relationship_to_org} onChange={(e) => setExpForm((f) => ({ ...f, relationship_to_org: e.target.value }))} fullWidth sx={{ mb: 2 }}><MenuItem value="employee">Employee (on payroll)</MenuItem><MenuItem value="independent">Independent (self-employed / contractor / freelance)</MenuItem><MenuItem value="third_party">Third-party (Agency / Consultancy / Temp)</MenuItem></TextField>
          <TextField select label="Work schedule" value={expForm.work_schedule} onChange={(e) => setExpForm((f) => ({ ...f, work_schedule: e.target.value }))} fullWidth sx={{ mb: 2 }}><MenuItem value="full_time">Full-time</MenuItem><MenuItem value="part_time">Part-time</MenuItem></TextField>
          <TextField select fullWidth label="Career stage" value={expForm.career_stage} onChange={(e) => setExpForm((f) => ({ ...f, career_stage: e.target.value }))} sx={{ mb: 1 }}><MenuItem value="internship">Internship</MenuItem><MenuItem value="apprenticeship">Apprenticeship</MenuItem><MenuItem value="trainee">Trainee</MenuItem><MenuItem value="entry">Entry level</MenuItem><MenuItem value="mid">Mid level</MenuItem><MenuItem value="senior">Senior level</MenuItem></TextField>
          <TextField select label="Work arrangement" value={expForm.work_arrangement} onChange={(e) => setExpForm((f) => ({ ...f, work_arrangement: e.target.value }))} fullWidth sx={{ mb: 2 }}><MenuItem value="onsite">On-site</MenuItem><MenuItem value="hybrid">Hybrid</MenuItem><MenuItem value="remote">Remote</MenuItem></TextField>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}><TextField label="Start Date" type="date" value={expForm.start} onChange={(e) => setExpForm((f) => ({ ...f, start: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="End Date" type="date" value={expForm.end} onChange={(e) => setExpForm((f) => ({ ...f, end: e.target.value }))} fullWidth disabled={expForm.current} InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <FormControlLabel control={<Checkbox checked={expForm.current} onChange={(e) => { const current = e.target.checked; setExpForm((prev) => ({ ...prev, current, end: current ? "" : prev.end })); }} />} label="I currently work here" sx={{ mb: 1 }} />
          {shouldShowExitReason() && <TextField fullWidth multiline minRows={2} maxRows={4} label="Why did you leave this job?" value={expForm.exit_reason} onChange={(e) => setExpForm((prev) => ({ ...prev, exit_reason: e.target.value }))} sx={{ mt: 2 }} />}
          {expForm.current && <FormControlLabel control={<Checkbox checked={syncProfileLocation} onChange={(e) => setSyncProfileLocation(e.target.checked)} />} label="Make this location my profile’s work location" sx={{ mb: 1 }} />}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Description</Typography>
            <TextField placeholder="List your major duties..." value={expForm.description || ""} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} fullWidth multiline minRows={4} />
            <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">Review before saving.</Typography>
              <Typography variant="caption" color="text.secondary">{(expForm.description?.length || 0)}/2000</Typography>
            </Box>
            <Box sx={{ mt: 1 }}><Button variant="outlined" size="small">Rewrite with AI</Button></Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!!editExpId && <Button color="error" onClick={() => askDeleteExperience(editExpId, `${expForm.org} — ${expForm.position}`)}>Delete</Button>}
          <Button variant="outlined" onClick={() => { setExpOpen(false); setEditExpId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={createExperience}>{editExpId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm.open} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>Delete {confirm.type === "edu" ? "education" : "experience"}?</DialogTitle>
        <DialogContent>{confirm.label && <DialogContentText sx={{ mb: 1 }}>{confirm.label}</DialogContentText>}<DialogContentText>This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={closeConfirm}>Cancel</Button><Button color="error" variant="contained" onClick={doConfirmDelete}>Delete</Button></DialogActions>
      </Dialog>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{aboutMode === "skills" ? "Edit skills" : "Edit description"}</DialogTitle>
        <DialogContent dividers>
          {aboutMode === "description" && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Description</Typography>
              <TextField placeholder="List your major duties..." value={aboutForm.bio} onChange={(e) => setAboutForm((f) => ({ ...f, bio: e.target.value }))} fullWidth multiline minRows={4} />
              <Box sx={{ mt: 0.5, display: "flex", justifyContent: "space-between" }}><Typography variant="caption" color="text.secondary">Review before saving.</Typography><Typography variant="caption" color="text.secondary">{(aboutForm.bio?.length || 0)}/2000</Typography></Box>
              <Box sx={{ mt: 1 }}><Button variant="outlined" size="small">Rewrite with AI</Button></Box>
            </Box>
          )}
          {aboutMode === "skills" && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Skills</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>We recommend adding your top 5 used skills.</Typography>
              <TextField label="Skills (CSV or JSON array)" value={aboutForm.skillsText} onChange={(e) => setAboutForm((f) => ({ ...f, skillsText: e.target.value }))} fullWidth helperText="Saved as a list of strings" />
              <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>{parseSkills(aboutForm.skillsText).length ? parseSkills(aboutForm.skillsText).map((skill, idx) => (<Chip key={idx} size="small" label={skill} />)) : null}</Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={() => setAboutOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveAbout} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogActions>
      </Dialog>

      {/* Name Change Request Dialog */}
      <NameChangeDialog
        open={nameChangeOpen}
        onClose={() => setNameChangeOpen(false)}
        currentNames={{ first: form.first_name, middle: "", last: form.last_name }}
        showToast={showNotification}
      />

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.sev} variant="filled" sx={{ width: "100%" }}>{snack.msg}</Alert>
      </Snackbar>
    </div>
  );
}