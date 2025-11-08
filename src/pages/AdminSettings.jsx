// src/pages/AdminSettings.jsx
import * as React from "react";
import {
  Box, Stack, Container, Paper, Card, CardContent, CardHeader, Divider,
  Avatar, Button, TextField, Typography, Grid, Snackbar, Alert, IconButton
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";

// ---- Minimal API helpers ----
const API_ROOT = (import.meta?.env?.VITE_API_ROOT) || "/api";
const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("access") ||
  sessionStorage.getItem("token");
const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function fetchMe() {
  const candidates = [`${API_ROOT}/users/me/`, `${API_ROOT}/auth/me/`, `${API_ROOT}/profile/me/`];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json", ...authHeader() } });
      if (r.ok) return await r.json();
    } catch {}
  }
  return null;
}
async function updateMe(payload) {
  const candidates = [
    { url: `${API_ROOT}/users/me/`, method: "PATCH" },
    { url: `${API_ROOT}/auth/me/`, method: "PATCH" },
    { url: `${API_ROOT}/profile/me/`, method: "PATCH" },
  ];
  for (const c of candidates) {
    try {
      const r = await fetch(c.url, {
        method: c.method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      if (r.ok) return await r.json();
    } catch {}
  }
  throw new Error("Update failed");
}
async function uploadAvatar(file) {
  if (!file) return null;
  const fd = new FormData();
  fd.append("avatar", file, file.name);
  const endpoints = [
    { url: `${API_ROOT}/users/me/avatar/`, method: "POST" },
    { url: `${API_ROOT}/auth/me/avatar/`, method: "POST" },
    { url: `${API_ROOT}/profile/avatar/`, method: "POST" },
  ];
  for (const e of endpoints) {
    try {
      const r = await fetch(e.url, { method: e.method, headers: { ...authHeader() }, body: fd });
      if (r.ok) {
        let j = {};
        try { j = await r.json(); } catch {}
        return j?.avatar || j?.profile?.avatar || j?.data?.avatar || j?.user_image_url || null;
      }
    } catch {}
  }
  return null;
}

// ---- Page ----
export default function AdminSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });

  const fileRef = React.useRef(null);

  const [me, setMe] = React.useState(null);
  const [form, setForm] = React.useState({
    first_name: "", last_name: "", email: "", phone: "", title: "", company: "",
  });

  const avatarUrl = React.useMemo(() => {
    const raw =
      me?.avatar ||
      me?.profile?.avatar ||
      me?.user_image_url ||
      me?.profile?.user_image ||
      "";
    return raw ? `${raw}${raw.includes("?") ? "&" : "?"}_=${Date.now()}` : "";
  }, [me]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchMe();
      setMe(data || {});
      setForm({
        first_name: data?.first_name || data?.profile?.first_name || "",
        last_name:  data?.last_name  || data?.profile?.last_name  || "",
        email:      data?.email      || data?.profile?.email      || "",
        phone:      data?.phone      || data?.profile?.phone      || "",
        title:      data?.title      || data?.profile?.title      || "",
        company:    data?.company    || data?.profile?.company    || "",
      });
      setLoading(false);
    })();
  }, []);

  const onPickFile = () => fileRef.current?.click();
  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSaving(true);
    try {
      const url = await uploadAvatar(f);
      if (!url) throw new Error("Avatar upload failed");
      const data = await fetchMe();
      setMe(data || {});
      setToast({ open: true, type: "success", msg: "Profile photo updated" });
    } catch (err) {
      setToast({ open: true, type: "error", msg: err?.message || "Upload failed" });
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name?.trim(),
        last_name:  form.last_name?.trim(),
        email:      form.email?.trim(),
        phone:      form.phone?.trim(),
        title:      form.title?.trim(),
        company:    form.company?.trim(),
      };
      await updateMe(payload);
      const data = await fetchMe();
      setMe(data || {});
      setToast({ open: true, type: "success", msg: "Profile updated" });
    } catch (err) {
      setToast({ open: true, type: "error", msg: err?.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Admin Settings
        </Typography>

        <Grid container spacing={2}>
          {/* Profile card */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardHeader
                title="Admin profile"
                subheader="Update your public details"
                action={
                  <Button
                    variant="contained"
                    startIcon={<SaveRoundedIcon />}
                    onClick={onSave}
                    disabled={saving || loading}
                  >
                    Save
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                  <Avatar src={avatarUrl} sx={{ width: 88, height: 88 }} />
                  <div>
                    <Button
                      variant="outlined"
                      startIcon={<UploadRoundedIcon />}
                      onClick={onPickFile}
                      disabled={saving || loading}
                      sx={{ mr: 1 }}
                    >
                      Change photo
                    </Button>
                    <IconButton onClick={() => setMe((m) => ({ ...m }))} title="Refresh">
                      <EditRoundedIcon />
                    </IconButton>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      JPG/PNG recommended. Large images are auto-resized by the server.
                    </Typography>
                  </div>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="First name"
                      fullWidth
                      value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Last name"
                      fullWidth
                      value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Email"
                      type="email"
                      fullWidth
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Phone"
                      fullWidth
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Title"
                      placeholder="e.g., Community Manager"
                      fullWidth
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Company / Organization"
                      placeholder="Your org"
                      fullWidth
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick info */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Account
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Row label="Username" value={me?.username || me?.user?.username || "—"} />
                <Row label="Role" value={me?.role || (me?.is_staff ? "Admin" : "User")} />
                <Row label="Member since" value={formatDate(me?.date_joined || me?.created_at)} />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
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

function Row({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value || "—"}</Typography>
    </Stack>
  );
}
function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(); } catch { return "—"; }
}
