import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate } from "react-router-dom";

import {
  createNativeMauticCampaign,
  getMauticCampaignCapabilities,
} from "../services/newsletterService";

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const getEventKey = (event) => event?.key || event?.type || event?.eventType || "unknown";

const getEventLabel = (event) => event?.label || getEventKey(event);

const sourceLabel = (source, fallback) =>
  source?.name || source?.alias || (source?.id ? `${fallback} #${source.id}` : fallback);

function CapabilityGroup({ title, description, events, loading }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2.5 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Box>

        {loading ? (
          <Stack spacing={1}>
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
          </Stack>
        ) : events.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {events.map((event, index) => (
              <Chip
                key={`${title}-${getEventKey(event)}-${index}`}
                label={getEventLabel(event)}
                variant="outlined"
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        ) : (
          <Alert severity="warning" variant="outlined">
            No {title.toLowerCase()} were returned by the capability API.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

export default function AdminNewsletterMauticCampaignBuilderPage() {
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPublished: false,
    lists: [],
    forms: [],
  });

  const actions = useMemo(() => asArray(capabilities?.actions), [capabilities]);
  const conditions = useMemo(() => asArray(capabilities?.conditions), [capabilities]);
  const decisions = useMemo(() => asArray(capabilities?.decisions), [capabilities]);
  const segments = useMemo(
    () => asArray(capabilities?.sources?.segments),
    [capabilities]
  );
  const forms = useMemo(() => asArray(capabilities?.sources?.forms), [capabilities]);

  const loadCapabilities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMauticCampaignCapabilities();
      setCapabilities(data || {});
    } catch (err) {
      setCapabilities(null);
      setError(
        getErrorMessage(err, "We could not load native Mautic Campaign capabilities.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const createCampaign = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError("Campaign name is required.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await createNativeMauticCampaign({
        name,
        description: form.description,
        isPublished: Boolean(form.isPublished),
        lists: form.lists,
        forms: form.forms,
        events: [],
        canvasSettings: { nodes: [], connections: [] },
      });
      setSnack({
        open: true,
        severity: "success",
        message: "Native Mautic Campaign created.",
      });
      setForm({
        name: "",
        description: "",
        isPublished: false,
        lists: [],
        forms: [],
      });
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "We could not create this native Mautic Campaign yet."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/admin/newsletter", { state: { newsletterTab: "campaigns" } })}
          sx={{ textTransform: "none", mb: 1 }}
        >
          Back to Campaigns
        </Button>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>
              Native Mautic Campaign Builder
            </Typography>
            <Typography color="text.secondary">
              Create provider-owned Campaign drafts and inspect runtime Mautic Builder capabilities.
            </Typography>
          </Box>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadCapabilities}
            disabled={loading}
            sx={{ textTransform: "none", alignSelf: "flex-start" }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadCapabilities}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {capabilities?.builder_metadata?.available === false && (
        <Alert severity="warning" variant="outlined">
          {capabilities.builder_metadata.reason ||
            "The backend did not return runtime Campaign Builder metadata yet."}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2.5 }}>
        <Stack spacing={2.5} component="form" onSubmit={createCampaign}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <AccountTreeRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                Basic Campaign Create
              </Typography>
              <Typography color="text.secondary">
                Foundation only. Workflow design and drag/drop will be added later.
              </Typography>
            </Box>
          </Stack>

          {formError && <Alert severity="error">{formError}</Alert>}

          <TextField
            label="Campaign Name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            inputProps={{ maxLength: 190 }}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={saving}
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth disabled={saving || loading || !segments.length}>
              <InputLabel id="campaign-segments-label">Segments</InputLabel>
              <Select
                labelId="campaign-segments-label"
                multiple
                value={form.lists}
                onChange={(event) => updateField("lists", event.target.value)}
                input={<OutlinedInput label="Segments" />}
                renderValue={(selected) =>
                  selected
                    .map((id) => sourceLabel(segments.find((source) => String(source.id) === String(id)), "Segment"))
                    .join(", ")
                }
              >
                {segments.map((source) => (
                  <MenuItem key={`segment-${source.id}`} value={source.id}>
                    <Checkbox checked={form.lists.includes(source.id)} />
                    <ListItemText primary={sourceLabel(source, "Segment")} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={saving || loading || !forms.length}>
              <InputLabel id="campaign-forms-label">Forms</InputLabel>
              <Select
                labelId="campaign-forms-label"
                multiple
                value={form.forms}
                onChange={(event) => updateField("forms", event.target.value)}
                input={<OutlinedInput label="Forms" />}
                renderValue={(selected) =>
                  selected
                    .map((id) => sourceLabel(forms.find((source) => String(source.id) === String(id)), "Form"))
                    .join(", ")
                }
              >
                {forms.map((source) => (
                  <MenuItem key={`form-${source.id}`} value={source.id}>
                    <Checkbox checked={form.forms.includes(source.id)} />
                    <ListItemText primary={sourceLabel(source, "Form")} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={form.isPublished}
                onChange={(event) => updateField("isPublished", event.target.checked)}
                disabled={saving}
              />
            }
            label={form.isPublished ? "Published" : "Draft / Unpublished"}
          />

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={1.5}>
            <Button
              type="button"
              onClick={() =>
                setForm({
                  name: "",
                  description: "",
                  isPublished: false,
                  lists: [],
                  forms: [],
                })
              }
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              disabled={saving}
            >
              Create Campaign
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <CapabilityGroup
            title="Actions"
            description="Provider actions returned by Mautic."
            events={actions}
            loading={loading}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <CapabilityGroup
            title="Conditions"
            description="Provider conditions returned by Mautic."
            events={conditions}
            loading={loading}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <CapabilityGroup
            title="Decisions"
            description="Provider decisions returned by Mautic."
            events={decisions}
            loading={loading}
          />
        </Box>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
