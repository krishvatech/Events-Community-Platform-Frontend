// src/pages/AdminProfileModerationPage.jsx
import * as React from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Avatar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("access") || "";
}

function authHeader() {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

function toApiUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const rel = String(pathOrUrl).replace(/^\/+/, "");
    return `${API_ROOT}/${rel}`;
  }
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

const REASON_LABELS = {
  profile_inappropriate: "Inappropriate Profile",
  profile_deceased: "Deceased Person",
  profile_impersonation: "Impersonation",
  profile_fake: "Fake Profile",
  profile_correction: "Needs Correction",
  profile_illegal: "Illegal Content",
};

export default function AdminProfileModerationPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("under_review");
  const [query, setQuery] = React.useState("");
  const [actionBusy, setActionBusy] = React.useState(false);

  // Action dialog state
  const [actionOpen, setActionOpen] = React.useState(false);
  const [actionTarget, setActionTarget] = React.useState(null);
  const [actionType, setActionType] = React.useState("");
  const [actionReason, setActionReason] = React.useState("");
  const [notifyUser, setNotifyUser] = React.useState(false);

  // Deceased-specific fields
  const [deathDate, setDeathDate] = React.useState("");
  const [legacyContacts, setLegacyContacts] = React.useState("");

  const fetchQueue = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(toApiUrl("moderation/profiles/queue/"));
      if (status && status !== "all") {
        url.searchParams.set("status", status);
      }

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json", ...authHeader() },
      });

      const j = res.ok ? await res.json() : {};
      const rows = Array.isArray(j?.results) ? j.results : [];
      setItems(rows);
    } catch (error) {
      console.error("Failed to fetch profile moderation queue:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((i) => {
      const text = [
        i?.user?.full_name,
        i?.user?.username,
        i?.user?.email,
        i?.user?.bio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [items, query]);

  function openAction(item, action) {
    setActionTarget(item);
    setActionType(action);
    setActionReason("");
    setNotifyUser(false);
    setDeathDate("");
    setLegacyContacts("");
    setActionOpen(true);
  }

  async function submitAction() {
    if (!actionTarget || !actionType) return;

    setActionBusy(true);
    try {
      const payload = {
        user_id: actionTarget.user_id,
        action: actionType,
        reason: actionReason,
        notify_user: notifyUser,
      };

      if (actionType === "mark_deceased") {
        payload.deceased_data = {
          death_date: deathDate || null,
          legacy_contact_ids: legacyContacts
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id)),
        };
      }

      const res = await fetch(toApiUrl("moderation/profiles/action/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP ${res.status}`);
      }

      setActionOpen(false);
      await fetchQueue();
    } catch (e) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <Box sx={{ px: { xs: 1, md: 2 }, py: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Profile Moderation Queue
        </Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search name, email, bio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 240 }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={status}
          onChange={(_, v) => setStatus(v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="under_review" label="Under Review" />
          <Tab value="all" label="All Reports" />
          <Tab value="suspended" label="Suspended" />
          <Tab value="deceased" label="Deceased" />
          <Tab value="fake" label="Fake/Impersonation" />
          <Tab value="active" label="Cleared" />
        </Tabs>
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary">
            No profile reports in this view.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filtered.map((item) => (
            <Paper key={item.user_id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                {/* Header with avatar and basic info */}
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    src={item.user?.avatar}
                    sx={{ width: 64, height: 64 }}
                  >
                    {item.user?.full_name?.[0] || item.user?.username?.[0]}
                  </Avatar>

                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {item.user?.full_name || item.user?.username}
                      </Typography>
                      <Chip
                        size="small"
                        icon={<FlagOutlinedIcon />}
                        label={`${item.report_count} report${item.report_count !== 1 ? 's' : ''}`}
                      />
                      <Chip
                        size="small"
                        label={item.user?.profile_status || "active"}
                        color={
                          item.user?.profile_status === "suspended" ||
                            item.user?.profile_status === "deceased"
                            ? "error"
                            : item.user?.profile_status === "under_review"
                              ? "warning"
                              : "default"
                        }
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      @{item.user?.username} · {item.user?.email}
                    </Typography>

                    <Typography variant="body2">
                      {item.user?.bio || "(no bio)"}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Last reported: {formatDate(item.last_reported_at)}
                    </Typography>
                  </Stack>

                  {/* Action buttons */}
                  <Stack spacing={1}>
                    <Button
                      size="small"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => openAction(item, "clear")}
                      disabled={actionBusy}
                      variant={item.user?.profile_status === "active" ? "outlined" : "contained"}
                    >
                      Clear Profile
                    </Button>

                    <Button
                      size="small"
                      color="warning"
                      startIcon={<BlockIcon />}
                      onClick={() => openAction(item, "suspend")}
                      disabled={actionBusy}
                    >
                      Suspend
                    </Button>

                    <Button
                      size="small"
                      color="error"
                      startIcon={<PersonOffOutlinedIcon />}
                      onClick={() => openAction(item, "mark_deceased")}
                      disabled={actionBusy}
                    >
                      Mark Deceased
                    </Button>

                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => openAction(item, "mark_fake")}
                      disabled={actionBusy}
                    >
                      Mark Fake
                    </Button>
                  </Stack>
                </Stack>

                <Divider />

                {/* Reason breakdown */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
                    Report reasons:
                  </Typography>
                  {Object.entries(item.reason_breakdown || {}).map(([reason, count]) => (
                    <Chip
                      key={reason}
                      size="small"
                      label={`${REASON_LABELS[reason] || reason}: ${count}`}
                      variant="outlined"
                    />
                  ))}
                </Stack>

                {/* Sample metadata */}
                {item.sample_metadata && (
                  <Box sx={{ bgcolor: "grey.50", p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Additional Details:
                    </Typography>

                    {item.sample_metadata.relationship_to_deceased && (
                      <Typography variant="body2">
                        <strong>Relationship to deceased:</strong>{" "}
                        {item.sample_metadata.relationship_to_deceased}
                      </Typography>
                    )}

                    {item.sample_metadata.death_date && (
                      <Typography variant="body2">
                        <strong>Death date:</strong> {item.sample_metadata.death_date}
                      </Typography>
                    )}

                    {item.sample_metadata.obituary_url && (
                      <Typography variant="body2">
                        <strong>Obituary:</strong>{" "}
                        <a
                          href={item.sample_metadata.obituary_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.sample_metadata.obituary_url}
                        </a>
                      </Typography>
                    )}

                    {item.sample_metadata.impersonated_person_name && (
                      <Typography variant="body2">
                        <strong>Impersonating:</strong>{" "}
                        {item.sample_metadata.impersonated_person_name}
                      </Typography>
                    )}

                    {item.sample_metadata.correction_fields &&
                      Object.keys(item.sample_metadata.correction_fields).length > 0 && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Corrections needed:
                          </Typography>
                          <Stack spacing={0.5} sx={{ pl: 2, mt: 0.5, borderLeft: "2px solid", borderColor: "primary.main" }}>
                            {Object.entries(item.sample_metadata.correction_fields).map(([key, value]) => (
                              <Box key={key}>
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                  {key.replace(/_/g, " ")}
                                </Typography>
                                <Typography variant="body2">
                                  {value || <i>(Remove/Empty)</i>}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}

                    {item.sample_metadata.correction_reason && (
                      <Typography variant="body2">
                        <strong>Correction reason:</strong>{" "}
                        {item.sample_metadata.correction_reason}
                      </Typography>
                    )}

                    {item.sample_metadata.illegal_content_description && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        <strong>Illegal content:</strong>{" "}
                        {item.sample_metadata.illegal_content_description}
                        {item.sample_metadata.illegal_content_location && (
                          <> (Location: {item.sample_metadata.illegal_content_location})</>
                        )}
                      </Alert>
                    )}
                  </Box>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionType === "clear" && "Clear Profile"}
          {actionType === "suspend" && "Suspend Profile"}
          {actionType === "mark_deceased" && "Mark Profile as Deceased"}
          {actionType === "mark_fake" && "Mark as Fake/Impersonation"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            {actionType === "mark_deceased" && (
              <>
                <Alert severity="warning">
                  This action will memorialize the profile. The profile will be
                  marked as deceased and access will be limited.
                </Alert>

                <TextField
                  label="Date of death (optional)"
                  type="date"
                  fullWidth
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />

                <TextField
                  label="Legacy contact user IDs (comma-separated)"
                  fullWidth
                  placeholder="123, 456, 789"
                  value={legacyContacts}
                  onChange={(e) => setLegacyContacts(e.target.value)}
                  helperText="Users who can manage this memorialized profile"
                />
              </>
            )}

            {actionType === "suspend" && (
              <Alert severity="warning">
                This will suspend the profile. The user will not be able to access
                their account until it is restored.
              </Alert>
            )}

            {actionType === "mark_fake" && (
              <Alert severity="error">
                This will mark the profile as fake/impersonation. This is a serious
                action and should only be used when confirmed.
              </Alert>
            )}

            {actionType === "clear" && (
              <Alert severity="info">
                This will restore the profile to active status and dismiss all
                reports.
              </Alert>
            )}

            <TextField
              label="Reason for this action"
              fullWidth
              multiline
              minRows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              required
              helperText="This will be logged and may be visible to the user"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                />
              }
              label="Send notification to user"
            />

            <Typography variant="caption" color="text.secondary">
              User: {actionTarget?.user?.full_name} (@{actionTarget?.user?.username})
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setActionOpen(false)} disabled={actionBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitAction}
            disabled={actionBusy || !actionReason.trim()}
            color={
              actionType === "clear"
                ? "primary"
                : actionType === "suspend"
                  ? "warning"
                  : "error"
            }
          >
            {actionBusy ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
