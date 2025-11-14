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
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const getToken = () => localStorage.getItem("access_token") || "";
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

export default function AdminSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({
    open: false,
    type: "success",
    msg: "",
  });

  const [profile, setProfile] = React.useState({
    full_name: "",
    bio: "",
    headline: "",
    location: "",
    user_image_url: "",
  });

  const fileRef = React.useRef(null);

  // bust cache when avatar URL changes so new image shows immediately
  const avatarUrl = React.useMemo(() => {
    const raw = profile?.user_image_url || "";
    return raw ? `${raw}${raw.includes("?") ? "&" : "?"}_=${Date.now()}` : "";
  }, [profile?.user_image_url]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminProfile();
      const prof = data?.profile || {};
      setProfile({
        full_name: prof.full_name || "",
        bio: prof.bio || "",
        headline: prof.headline || "",
        location: prof.location || "",
        user_image_url: prof.user_image_url || "",
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

  React.useEffect(() => {
    load();
  }, [load]);

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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
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
                    {(profile.full_name || "A").charAt(0).toUpperCase()}
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
