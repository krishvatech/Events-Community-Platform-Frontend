// src/pages/ProfilePage.jsx
// Keeps your existing backend logic (/users/me PUT) + AccountHero + AccountSidebar
// Adds a clean "Preview" (cards like your screenshot) next to the existing "Edit" form.

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Avatar, Box, Button, Container, Divider, Grid, LinearProgress, Paper,
  Snackbar, Alert, TextField, Typography, Card, CardHeader, CardContent,
  List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Chip,
  FormControlLabel, Checkbox, InputAdornment, Collapse, IconButton, Tooltip,
  useMediaQuery, useTheme, MenuItem
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import AccountHero from "../components/AccountHero.jsx";
import AccountSidebar from "../components/AccountSidebar.jsx";

// -------------------- API helpers (unchanged) --------------------
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
  } catch { }
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

// -------------------- Small UI helpers for Preview --------------------
function SectionCard({ title, action, children, sx }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        width: '100%',
        // 👇 On phones/tablets: make cards a bit narrower and center them
        // maxWidth: { xs: 560, sm: 640, md: 'unset' },
        mx: { xs: 'auto', md: 0 },
        ...sx,
      }}
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

const PlaceholderLine = ({ height = 22 }) => (
  <Box sx={{ height, borderBottom: '1px solid', borderColor: 'divider', borderRadius: 0.5 }} />
);

const KV = ({ label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', py: 0.75 }}>
    <Typography
      variant="subtitle2"
      sx={{
        width: { xs: 110, sm: 150, md: 170 },     // ✅ narrower on phones
        minWidth: { xs: 110, sm: 150, md: 170 },
        color: 'text.secondary'
      }}
    >
      {label}:
    </Typography>
    <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-word' }}>
      {value || '—'}
    </Typography>
  </Box>
);

function GroupItem({ name, members }) {
  return (
    <ListItem sx={{ px: 0 }}>
      <ListItemIcon sx={{ minWidth: 50 }}>
        <Box sx={{ width: 40, height: 26, bgcolor: 'grey.200', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
      </ListItemIcon>
      <ListItemText
        primary={<Typography variant="body2">{name}</Typography>}
        secondary={<Typography variant="caption" color="text.secondary">{members}</Typography>}
      />
    </ListItem>
  );
}

// -------------------- Page --------------------
export default function ProfilePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });
  const [mode, setMode] = useState("preview"); // "preview" | "edit"
  const [eduOpen, setEduOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [editEduId, setEditEduId] = useState(null);   // number | null
  const [editExpId, setEditExpId] = useState(null);   // number | null
  // Lists (render in cards)
  const [eduList, setEduList] = useState([]);
  const [expList, setExpList] = useState([]);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutForm, setAboutForm] = useState({ bio: "", skillsText: "" });

  const openAbout = () => {
    setAboutForm({
      bio: form.bio || "",
      skillsText: form.skillsText || "",
    });
    setAboutOpen(true);
  };


  const [confirm, setConfirm] = useState({ open: false, type: null, id: null, label: "" }); // type: 'edu' | 'exp'

  // tiny helpers for date display
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
    return (start || end) ? `${start} - ${end || ""}` : "";
  };


  const [eduForm, setEduForm] = useState({
    school: "", degree: "", field: "", start: "", end: "", grade: ""
  });
  const [expForm, setExpForm] = useState({
    org: "",
    position: "",
    location: "",
    start: "",
    end: "",
    current: false,
    employment_type: "full_time", // compulsory (default)
    work_schedule: "",            // "", "full_time", "part_time"
    relationship_to_org: "",      // "", "employee", "independent", "third_party"
    career_stage: "",             // "", "internship","apprenticeship","trainee","entry","mid","senior"
    compensation_type: "",        // "", "paid","stipend","volunteer"
    work_arrangement: "",         // "", "onsite","hybrid","remote"
  });


  // Controlled form state
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    full_name: "",
    timezone: "",
    bio: "",
    headline: "",
    job_title: "",
    company: "",
    location: "",
    skillsText: "",
    linksText: "",
  });

  const initials = useMemo(() => {
    const a = (form.first_name || "").trim();
    const b = (form.last_name || "").trim();
    return (a[0] || "") + (b[0] || "");
  }, [form.first_name, form.last_name]);

  // Load current profile (unchanged)
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
          skillsText: Array.isArray(prof.skills)
            ? prof.skills.join(", ")
            : typeof prof.skills === "string"
              ? prof.skills
              : "",
          linksText: prof.links ? JSON.stringify(prof.links) : "",
        });
      } catch (e) {
        if (e?.name === "AbortError") return;
        setSnack({ open: true, sev: "error", msg: e?.message || "Failed to load profile" });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  useEffect(() => { loadMeExtras(); }, []);

  function askDeleteEducation(id, label = "") {
    setConfirm({ open: true, type: "edu", id, label });
  }
  function askDeleteExperience(id, label = "") {
    setConfirm({ open: true, type: "exp", id, label });
  }
  function closeConfirm() {
    setConfirm({ open: false, type: null, id: null, label: "" });
  }

  async function doConfirmDelete() {
    const { type, id } = confirm;
    if (!type || !id) return;
    try {
      const url =
        type === "edu"
          ? `${API_BASE}/auth/me/educations/${id}/`
          : `${API_BASE}/auth/me/experiences/${id}/`;

      const r = await fetch(url, { method: "DELETE", headers: tokenHeader() });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");

      setSnack({
        open: true,
        sev: "success",
        msg: type === "edu" ? "Education deleted" : "Experience deleted",
      });

      // close any open edit dialog for the same item
      setEduOpen(false);
      setExpOpen(false);
      setEditEduId(null);
      setEditExpId(null);

      closeConfirm();
      await loadMeExtras();
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Delete failed" });
      closeConfirm();
    }
  }


  async function saveProfile() {
    try {
      setSaving(true);
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        profile: {
          full_name: form.full_name,
          timezone: form.timezone,
          bio: form.bio,
          headline: form.headline,
          job_title: form.job_title,
          company: form.company,
          location: form.location,
          skills: parseSkills(form.skillsText),
          links: parseLinks(form.linksText),
        },
      };
      const r = await fetch(`${API_BASE}/users/me/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          json?.detail ||
          Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ") ||
          "Save failed";
        throw new Error(msg);
      }
      setSnack({ open: true, sev: "success", msg: "Profile saved" });
      const cached = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...cached,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
        })
      );
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function createEducation() {
    try {
      const url = editEduId
        ? `${API_BASE}/auth/me/educations/${editEduId}/`
        : `${API_BASE}/auth/me/educations/`;
      const r = await fetch(url, {
        method: editEduId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({
          school: eduForm.school,
          degree: eduForm.degree,
          field_of_study: eduForm.field,        // map your 'field' -> backend 'field_of_study'
          start_date: eduForm.start || null,    // map 'start' -> 'start_date'
          end_date: eduForm.end || null,        // map 'end'   -> 'end_date'
          grade: eduForm.grade || "",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || "Failed to save education");
      setSnack({ open: true, sev: "success", msg: editEduId ? "Education updated" : "Education added" });
      setEduOpen(false);
      setEditEduId(null);
      setEduForm({ school: "", degree: "", field: "", start: "", end: "", grade: "" });
      await loadMeExtras();
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Save failed" });
    }
  }


  async function createExperience() {
    try {
      const url = editExpId
        ? `${API_BASE}/auth/me/experiences/${editExpId}/`
        : `${API_BASE}/auth/me/experiences/`;

      const r = await fetch(url, {
        method: editExpId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({
          community_name: expForm.org,
          position: expForm.position,
          location: expForm.location || "",
          start_date: expForm.start || null,
          end_date: expForm.current ? null : (expForm.end || null),
          currently_work_here: !!expForm.current,

          // same as HomePage AboutTab createExperienceApi
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
      if (!r.ok) throw new Error(j?.detail || "Failed to save experience");

      setSnack({
        open: true,
        sev: "success",
        msg: editExpId ? "Experience updated" : "Experience added",
      });

      setExpOpen(false);
      setEditExpId(null);
      setExpForm({
        org: "",
        position: "",
        location: "",
        start: "",
        end: "",
        current: false,
        employment_type: "full_time",
        work_schedule: "",
        relationship_to_org: "",
        career_stage: "",
        compensation_type: "",
        work_arrangement: "",
      });
      await loadMeExtras();
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Save failed" });
    }
  }



  async function loadMeExtras() {
    try {
      // combined endpoint (if you added MeProfileView)
      const r = await fetch(`${API_BASE}/auth/me/profile/`, { headers: tokenHeader() });
      if (r.ok) {
        const data = await r.json();
        setEduList(Array.isArray(data.educations) ? data.educations : []);
        setExpList(Array.isArray(data.experiences) ? data.experiences : []);
        return;
      }
    } catch { }
    // fallback to separate endpoints
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
    setEduForm({
      school: item.school || "",
      degree: item.degree || "",
      field: item.field_of_study || "",
      start: item.start_date || "",
      end: item.end_date || "",
      grade: item.grade || "",
    });
    setEduOpen(true);
  }


  async function saveAbout() {
    try {
      setSaving(true);
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        profile: {
          full_name: form.full_name,
          timezone: form.timezone,
          bio: aboutForm.bio,
          headline: form.headline,
          job_title: form.job_title,
          company: form.company,
          location: form.location,
          skills: parseSkills(aboutForm.skillsText),
          links: parseLinks(form.linksText),
        },
      };
      const r = await fetch(`${API_BASE}/users/me/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          json?.detail ||
          Object.entries(json).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ") ||
          "Save failed";
        throw new Error(msg);
      }
      // reflect changes locally
      setForm(f => ({ ...f, bio: aboutForm.bio, skillsText: aboutForm.skillsText }));
      setSnack({ open: true, sev: "success", msg: "About updated" });
      setAboutOpen(false);
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteEducation(id) {
    if (!window.confirm("Delete this education?")) return;
    try {
      const r = await fetch(`${API_BASE}/auth/me/educations/${id}/`, {
        method: "DELETE",
        headers: tokenHeader(),
      });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      setSnack({ open: true, sev: "success", msg: "Education deleted" });
      await loadMeExtras();
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Delete failed" });
    }
  }

  function onEditExperience(item) {
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
  }


  async function onDeleteExperience(id) {
    if (!window.confirm("Delete this experience?")) return;
    try {
      const r = await fetch(`${API_BASE}/auth/me/experiences/${id}/`, {
        method: "DELETE",
        headers: tokenHeader(),
      });
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");
      setSnack({ open: true, sev: "success", msg: "Experience deleted" });
      await loadMeExtras();
    } catch (e) {
      setSnack({ open: true, sev: "error", msg: e?.message || "Delete failed" });
    }
  }


  // Reusable Field
  const Field = ({ label, name, multiline = false, type = "text", placeholder = "", helperText = "" }) => (
    <TextField
      label={label}
      value={form[name] ?? ""}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      fullWidth
      size="medium"
      type={type}
      placeholder={placeholder}
      helperText={helperText}
      multiline={multiline}
      minRows={multiline ? 3 : 1}
      sx={{ mb: 2 }}
      inputProps={{ spellCheck: "false", autoComplete: "off", inputMode: type === "email" ? "email" : "text" }}
    />
  );

  // -------------------- Render --------------------
  return (
    <div className="min-h-screen bg-slate-50">
      <AccountHero
        actions={
          <Box sx={{ display: "flex", gap: 1.25 }}>
            <Button
              variant="text"
              className="rounded-xl px-4"
              onClick={() => setMode("edit")}
              sx={{
                textTransform: "none",
                color: "#10b8a6",
                fontWeight: 700,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Edit My Profile
            </Button>
          </Box>
        }
      />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <aside className="col-span-12 lg:col-span-3">
            <AccountSidebar stickyTop={96} />
          </aside>

          <main className="col-span-12 lg:col-span-9">
            {loading && <LinearProgress />}
            {!loading && mode === 'preview' && (
              <Box>
                <Grid
                  container
                  spacing={{ xs: 2, md: 2.5 }}
                  sx={{
                    // same pattern as HomePage About tab
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  }}
                >
                  {/* LEFT */}
                  <Grid item xs={12} lg={6}>
                    <SectionCard
                      title="About"
                      action={<Button size="small" onClick={openAbout}>Edit</Button>}
                    >
                      <Label>Summary:</Label>
                      {form.bio ? (
                        <Typography variant="body2">{form.bio}</Typography>
                      ) : (
                        <PlaceholderLine />
                      )}
                      {/* Skills */}
                      <Label sx={{ mt: 2 }}>Skills:</Label>
                      {parseSkills(form.skillsText).length ? (
                        <Box
                          sx={{
                            mt: 1,
                            display: "grid",
                            // max 6 per row; responsive so it isn't tiny on phones
                            gridTemplateColumns: {
                              xs: "repeat(4, minmax(0,1fr))",   // phones
                              sm: "repeat(3, minmax(0,1fr))",   // small tablets
                              md: "repeat(4, minmax(0,1fr))",   // desktops: max 6 per row
                            },
                            gap: 1, // space between chips
                          }}
                        >
                          {parseSkills(form.skillsText).map((s, i) => (
                            <Box key={i} sx={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                              <Chip
                                size="small"
                                label={s}
                                sx={{
                                  maxWidth: "100%",
                                  "& .MuiChip-label": {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  },
                                }}
                              />
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <PlaceholderLine />
                      )}
                    </SectionCard>



                    <SectionCard
                      sx={{ mt: 2 }}
                      title="Experience"
                      action={
                        <Button size="small" variant="outlined" onClick={() => setExpOpen(true)}>
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
                              sx={{ py: 0.5, pr: { xs: 0, md: 9 } }}  // <-- add right padding so text doesn’t hug the icons
                              secondaryAction={
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => onEditExperience(x)}>
                                      <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => askDeleteExperience(x.id, `${x.community_name} — ${x.position}`)}>
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{x.position} - {x.community_name}</Typography>}
                                secondary={<Typography variant="caption" color="text.secondary">
                                  {rangeLinkedIn(x.start_date, x.end_date, x.currently_work_here)}{x.location ? ` · ${x.location}` : ""}
                                </Typography>}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Avatar sx={{ width: 64, height: 64, bgcolor: 'grey.200', mx: 'auto' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This section is empty</Typography>
                          <Typography variant="caption" color="text.secondary">Add an experience to your profile</Typography>
                          <Box><Button variant="contained" size="small" sx={{ mt: 1.5 }} onClick={() => setExpOpen(true)}>Create</Button></Box>
                        </Box>
                      )}
                    </SectionCard>


                    <SectionCard
                      sx={{ mt: 2 }}
                      title="Education"
                      action={
                        <Button size="small" variant="outlined" onClick={() => setEduOpen(true)}>
                          Add more
                        </Button>
                      }
                    >
                      {eduList.length ? (
                        <List dense disablePadding>
                          {eduList.map((e) => (
                            <ListItem key={e.id} disableGutters sx={{ py: 0.5, pr: { xs: 0, md: 9 } }}
                              secondaryAction={
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => onEditEducation(e)}>
                                      <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => askDeleteEducation(e.id, `${e.school} — ${e.degree}`)}>
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{e.degree} - {e.school}</Typography>}
                                secondary={<Typography variant="caption" color="text.secondary">
                                  {rangeLinkedIn(e.start_date, e.end_date, false)}
                                </Typography>}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Avatar sx={{ width: 64, height: 64, bgcolor: 'grey.200', mx: 'auto' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This section is empty</Typography>
                          <Typography variant="caption" color="text.secondary">Add an education to your profile</Typography>
                          <Box><Button variant="contained" color="success" size="small" sx={{ mt: 1.5 }} onClick={() => setEduOpen(true)}>Create</Button></Box>
                        </Box>
                      )}
                    </SectionCard>

                  </Grid>

                  {/* RIGHT */}
                  <Grid item xs={12} lg={6}>
                    <SectionCard title="Contact" action={<Button size="small">Edit</Button>}>
                      <Label>Social Media Links</Label>
                      <List dense disablePadding>
                        {(() => {
                          const links = parseLinks(form.linksText);
                          const hasLinkedIn = typeof links.linkedin === 'string' && links.linkedin.trim();
                          return (
                            <>
                              <ListItem sx={{ px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 34, mr: 0.5 }}>
                                  <LinkedInIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                      {hasLinkedIn || '—'}   {/* ✅ no more “in” */}
                                    </Typography>
                                  } />
                              </ListItem>
                            </>
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
                            primary={<Typography variant="body2">{form.email || '—'}</Typography>}
                            secondary={
                              <>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Private field, visible by you and admins only. Editable in your
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Privacy settings.
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      </List>

                      <Label sx={{ mt: 2, mb: 1 }}>Live Location</Label>
                      {form.location ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PlaceIcon fontSize="small" />
                          <Typography variant="body2">{form.location}</Typography>
                        </Box>
                      ) : (
                        <Box sx={{
                          height: { xs: 120, sm: 160, md: 170 },
                          borderRadius: 1,
                          bgcolor: 'grey.100',
                          border: '1px solid',
                          borderColor: 'divider',
                        }} />
                      )}
                    </SectionCard>
                    <SectionCard sx={{ mt: 2 }} title="About your work" action={<Button size="small">Edit</Button>}>
                      <KV label="Job Title" value={form.job_title} />
                      <Divider sx={{ my: 0.5 }} />
                      <KV label="Community" value={form.company} />
                      <Divider sx={{ my: 0.5 }} />
                      <KV label="Sector" value={''} />
                      <Divider sx={{ my: 0.5 }} />
                      <KV label="Industry" value={''} />
                      <Divider sx={{ my: 0.5 }} />
                      <KV label="Number of Employees" value={''} />
                    </SectionCard>

                  </Grid>
                </Grid>
              </Box>
            )}
          </main>
        </div>
      </Container >

      {/* --- Create Education Dialog --- */}
      <Dialog open={eduOpen} onClose={() => setEduOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editEduId ? "Edit education" : "Create education"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            *Required fields are marked with an asterisk
          </Typography>

          <TextField
            label="School *"
            value={eduForm.school}
            onChange={e => setEduForm(f => ({ ...f, school: e.target.value }))}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Degree *"
            value={eduForm.degree}
            onChange={e => setEduForm(f => ({ ...f, degree: e.target.value }))}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="Field of Study *"
            value={eduForm.field}
            onChange={e => setEduForm(f => ({ ...f, field: e.target.value }))}
            fullWidth sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={eduForm.start}
                onChange={e => setEduForm(f => ({ ...f, start: e.target.value }))}
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
                onChange={e => setEduForm(f => ({ ...f, end: e.target.value }))}
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
            onChange={e => setEduForm(f => ({ ...f, grade: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!!editEduId && (
            <Button color="error" onClick={() => askDeleteEducation(editEduId, `${eduForm.school} — ${eduForm.degree}`)}>
              Delete
            </Button>
          )}
          <Button variant="outlined" onClick={() => { setEduOpen(false); setEditEduId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={createEducation}>
            {editEduId ? "Save changes" : "Save"}
          </Button>
        </DialogActions>
      </Dialog >

      {/* --- Create Experience Dialog --- */}
      <Dialog open={expOpen} onClose={() => setExpOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editExpId ? "Edit experience" : "Create experience"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            *Required fields are marked with an asterisk
          </Typography>

          <TextField
            label="Company name *"
            value={expForm.org}
            onChange={(e) => setExpForm((f) => ({ ...f, org: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Position *"
            value={expForm.position}
            onChange={(e) => setExpForm((f) => ({ ...f, position: e.target.value }))}
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
              setExpForm((f) => ({ ...f, relationship_to_org: e.target.value }))
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
              setExpForm((f) => ({ ...f, work_schedule: e.target.value }))
            }
            fullWidth
            SelectProps={{
              displayEmpty: true,
              renderValue: (v) =>
                v
                  ? ({ full_time: "Full-time", part_time: "Part-time" }[v] || v)
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

          {/* Career stage + Compensation type (half-half) */}
          <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
            {/* Career stage (optional) */}
            <TextField
              select
              value={expForm.career_stage}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, career_stage: e.target.value }))
              }
              fullWidth
              sx={{ flex: 1 }}   // 👈 makes it use 50% of row
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

            {/* Compensation type (optional) */}
            <TextField
              select
              value={expForm.compensation_type}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, compensation_type: e.target.value }))
              }
              fullWidth
              sx={{ flex: 1 }}   // 👈 also 50% of row
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
              setExpForm((f) => ({ ...f, work_arrangement: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="onsite">On-site</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
            <MenuItem value="remote">Remote</MenuItem>
          </TextField>

          {/* ⬇️ Existing date + checkbox UI remains the same below */}
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={expForm.start}
                onChange={(e) => setExpForm((f) => ({ ...f, start: e.target.value }))}
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
                onChange={(e) => setExpForm((f) => ({ ...f, end: e.target.value }))}
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
                onChange={(e) => setExpForm((f) => ({ ...f, current: e.target.checked }))}
              />
            }
            label="I currently work here"
            sx={{ mb: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {!!editExpId && (
            <Button color="error" onClick={() => askDeleteExperience(editExpId, `${expForm.org} — ${expForm.position}`)}>
              Delete
            </Button>
          )}
          <Button variant="outlined" onClick={() => { setExpOpen(false); setEditExpId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={createExperience}>
            {editExpId ? "Save changes" : "Save"}
          </Button>
        </DialogActions>
      </Dialog >

      {/* Delete Dialog */}
      <Dialog open={confirm.open} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>
          Delete {confirm.type === "edu" ? "education" : "experience"}?
        </DialogTitle>
        <DialogContent>
          {confirm.label ? (
            <DialogContentText sx={{ mb: 1 }}>
              {confirm.label}
            </DialogContentText>
          ) : null}
          <DialogContentText>
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeConfirm}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit About</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Update your summary and skills
          </Typography>

          {/* Summary */}
          <TextField
            label="Summary"
            value={aboutForm.bio}
            onChange={(e) => setAboutForm(f => ({ ...f, bio: e.target.value }))}
            fullWidth
            multiline
            minRows={4}
            sx={{ mb: 2 }}
            placeholder="Tell people a little about yourself…"
          />

          {/* Skills (CSV or JSON array) */}
          <TextField
            label="Skills (CSV or JSON array)"
            value={aboutForm.skillsText}
            onChange={(e) => setAboutForm(f => ({ ...f, skillsText: e.target.value }))}
            fullWidth
            placeholder='e.g., M&A, Strategy  OR  ["M&A","Strategy"]'
            helperText="Saved as a list of strings"
          />

          {/* Live preview of parsed skills */}
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {parseSkills(aboutForm.skillsText).length
              ? parseSkills(aboutForm.skillsText).map((s, i) => <Chip key={i} label={s} size="small" />)
              : <Typography variant="caption" color="text.secondary">No skills parsed yet</Typography>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAboutOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAbout} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.sev}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </div >
  );
}