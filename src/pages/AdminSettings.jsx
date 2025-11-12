// src/pages/AdminSettings.jsx
import * as React from "react";
import {
  Box, Stack, Container, Card, CardHeader, CardContent, Divider,
  Avatar, Button, TextField, Typography, Grid, Snackbar, Alert
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

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

// ---- Admin profile endpoints ----
// GET/PATCH: /users/me/admin-profile/   (full_name, bio, headline, location, user_image)
// POST:      /users/me/avatar/          (FormData: 'avatar' or 'user_image')
async function fetchAdminProfile() {
  const url = `${API_ROOT}/users/me/admin-profile/`;
  const r = await fetch(url, { headers: { accept: "application/json", ...authHeader() } });
  if (!r.ok) throw new Error("Failed to load admin profile");
  return r.json();
}
async function updateAdminProfile(payload) {
  const url = `${API_ROOT}/users/me/admin-profile/`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to save admin profile");
  return r.json();
}
async function uploadAvatar(file) {
  const fd = new FormData();
  // Either key works server-side; using 'avatar' here
  fd.append("avatar", file, file.name);
  const r = await fetch(`${API_ROOT}/users/me/avatar/`, {
    method: "POST",
    headers: { ...authHeader() },
    body: fd,
  });
  if (!r.ok) throw new Error("Avatar upload failed");
  return r.json(); // { user_image, user_image_url }
}

export default function AdminSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });

  const fileRef = React.useRef(null);

  const [profile, setProfile] = React.useState({
    full_name: "",
    bio: "",
    headline: "",
    location: "",
    user_image_url: "",
  });

  const avatarUrl = React.useMemo(() => {
    const raw = profile?.user_image_url || "";
    // cache-bust so the new image shows immediately after upload
    return raw ? `${raw}${raw.includes("?") ? "&" : "?"}_=${Date.now()}` : "";
  }, [profile?.user_image_url]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminProfile();
      setProfile({
        full_name: data?.full_name || "",
        bio: data?.bio || "",
        headline: data?.headline || "",
        location: data?.location || "",
        user_image_url: data?.user_image_url || "",
      });
    } catch (e) {
      setToast({ open: true, type: "error", msg: e?.message || "Load failed" });
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const onPickFile = () => fileRef.current?.click();
  const onFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSaving(true);
    try {
      await uploadAvatar(f);
      await load(); // refresh to get new user_image_url
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
        full_name: profile.full_name?.trim(),
        bio: profile.bio?.trim(),
        headline: profile.headline?.trim(),
        location: profile.location?.trim(),
      };
      await updateAdminProfile(payload);
      await load();
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

        <Card variant="outlined">
          <CardHeader
            title="Admin profile"
            subheader="These details are visible on your profile"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={load}
                  disabled={loading || saving}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={onSave}
                  disabled={saving || loading}
                >
                  Save
                </Button>
              </Stack>
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
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  JPG/PNG recommended. Large images are auto-resized by the server.
                </Typography>
              </div>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Full name"
                  fullWidth
                  value={profile.full_name}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Headline"
                  placeholder="e.g., Building communities at X"
                  fullWidth
                  value={profile.headline}
                  onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Location"
                  placeholder="City, Country"
                  fullWidth
                  value={profile.location}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
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
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
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
