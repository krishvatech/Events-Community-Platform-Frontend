import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import StopCircleRoundedIcon from "@mui/icons-material/StopCircleRounded";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  cancelNewsletterCampaign,
  createNewsletterCampaign,
  deleteNewsletterCampaign,
  getNewsletterCampaignAnalytics,
  getNewsletterCampaign,
  listNewsletterCampaigns,
  listNewsletterCategories,
  previewNewsletterCampaign,
  scheduleNewsletterCampaign,
  sendNewsletterCampaign,
  sendNewsletterTestEmail,
  updateNewsletterCampaign,
} from "../services/newsletterService";

const STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  draft: "default",
  scheduled: "info",
  sending: "warning",
  sent: "success",
  failed: "error",
  cancelled: "default",
};

const blankForm = {
  name: "",
  subject: "",
  preview_text: "",
  from_name: "",
  from_email: "",
  html_content: "",
  plain_text: "",
  audience_slugs: [],
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTimeLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const formatNumber = (value) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat().format(number);
};

const formatPercent = (rate) => {
  const number = Number(rate ?? 0);
  if (!Number.isFinite(number)) return "0%";
  return `${Math.round(number * 100)}%`;
};

const getCampaignAudienceSlugs = (campaign) => {
  const raw = campaign?.audience_slugs || campaign?.audiences || [];
  return raw
    .map((item) => (typeof item === "string" ? item : item?.slug))
    .filter(Boolean);
};

const getCampaignAudienceLabels = (campaign) => {
  const raw = campaign?.audiences || campaign?.audience_slugs || [];
  return raw
    .map((item) => (typeof item === "string" ? item : item?.name || item?.slug))
    .filter(Boolean);
};

const campaignToForm = (campaign) => ({
  name: campaign?.name || "",
  subject: campaign?.subject || "",
  preview_text: campaign?.preview_text || "",
  from_name: campaign?.from_name || "",
  from_email: campaign?.from_email || "",
  html_content: campaign?.html_content || "",
  plain_text: campaign?.plain_text || "",
  audience_slugs: getCampaignAudienceSlugs(campaign),
});

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

function StatusChip({ status }) {
  const normalized = String(status || "draft").toLowerCase();
  return (
    <Chip
      size="small"
      label={STATUS_LABELS[normalized] || normalized}
      color={STATUS_COLORS[normalized] || "default"}
      variant={normalized === "draft" || normalized === "cancelled" ? "outlined" : "filled"}
      sx={{ fontWeight: 700 }}
    />
  );
}

function ConfirmDialog({ open, title, children, confirmLabel, confirmColor = "primary", loading, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PreviewDialog({ open, loading, preview, error, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Newsletter Preview</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack spacing={1.5}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton variant="rectangular" height={320} />
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">From</Typography>
              <Typography sx={{ fontWeight: 700 }}>{preview?.from_name || "-"} {preview?.from_email ? `<${preview.from_email}>` : ""}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Subject</Typography>
              <Typography sx={{ fontWeight: 700 }}>{preview?.subject || "-"}</Typography>
              {preview?.preview_text && <Typography color="text.secondary">{preview.preview_text}</Typography>}
            </Box>
            <Paper variant="outlined" sx={{ height: 360, overflow: "hidden", borderRadius: 2 }}>
              <iframe
                title="Newsletter HTML preview"
                sandbox=""
                srcDoc={preview?.html_content || preview?.html || "<p>No HTML preview available.</p>"}
                style={{ width: "100%", height: "100%", border: 0, background: "white" }}
              />
            </Paper>
            {(preview?.plain_text || preview?.plain) && (
              <TextField
                label="Plain text"
                value={preview.plain_text || preview.plain}
                multiline
                minRows={4}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function TestEmailDialog({ open, loading, error, onClose, onSend }) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (open) setEmail("");
  }, [open]);
  const invalid = email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Send Test Email</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(invalid)}
            helperText={invalid ? "Enter a valid email address." : ""}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSend(email.trim())} variant="contained" disabled={loading || !email.trim() || invalid}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Send Test"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ScheduleDialog({ open, loading, error, initialValue, onClose, onSchedule }) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open) {
      const date = initialValue ? new Date(initialValue) : null;
      setValue(date && !Number.isNaN(date.getTime()) ? formatDateTimeLocalInput(initialValue) : "");
    }
  }, [open, initialValue]);
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initialValue ? "Reschedule Newsletter" : "Schedule Newsletter"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Date and time"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Uses your local timezone and sends an ISO datetime to the server."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSchedule(new Date(value).toISOString())} variant="contained" disabled={loading || !value}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Schedule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function NewsletterForm({ value, categories, readOnly, errors, onChange }) {
  const setField = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  const toggleAudience = (slug) => {
    const set = new Set(value.audience_slugs || []);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    setField("audience_slugs", Array.from(set));
  };
  const campaignHasErrors = Boolean(errors.name || errors.subject);
  const senderHasErrors = Boolean(errors.from_name || errors.from_email);
  const audienceHasErrors = Boolean(errors.audience_slugs);
  const contentHasErrors = Boolean(errors.html_content);

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: campaignHasErrors ? "error.main" : "#F0EEEB" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A", mb: 2 }}>Campaign Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Campaign Name" value={value.name} onChange={(e) => setField("name", e.target.value)} error={Boolean(errors.name)} helperText={errors.name} fullWidth required InputProps={{ readOnly }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Subject" value={value.subject} onChange={(e) => setField("subject", e.target.value)} error={Boolean(errors.subject)} helperText={errors.subject} fullWidth required InputProps={{ readOnly }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Preview Text" value={value.preview_text} onChange={(e) => setField("preview_text", e.target.value)} fullWidth InputProps={{ readOnly }} />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: senderHasErrors ? "error.main" : "#F0EEEB" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A", mb: 2 }}>Sender</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="From Name" value={value.from_name} onChange={(e) => setField("from_name", e.target.value)} error={Boolean(errors.from_name)} helperText={errors.from_name} fullWidth required InputProps={{ readOnly }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="From Email" type="email" value={value.from_email} onChange={(e) => setField("from_email", e.target.value)} error={Boolean(errors.from_email)} helperText={errors.from_email} fullWidth required InputProps={{ readOnly }} />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: audienceHasErrors ? "error.main" : "#F0EEEB" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A", mb: 1 }}>Audience</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose one or more newsletter audiences.
        </Typography>
        <FormControl component="fieldset" fullWidth disabled={readOnly} error={audienceHasErrors}>
          <FormGroup>
            <Grid container spacing={1}>
              {categories.map((category) => (
                <Grid item xs={12} md={6} key={category.slug}>
                  <FormControlLabel
                    control={<Checkbox checked={(value.audience_slugs || []).includes(category.slug)} onChange={() => toggleAudience(category.slug)} />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{category.name || category.slug}</Typography>
                        {category.description && <Typography variant="body2" color="text.secondary">{category.description}</Typography>}
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
          {errors.audience_slugs && <FormHelperText>{errors.audience_slugs}</FormHelperText>}
          {categories.length === 0 && <FormHelperText>No active newsletter audiences found.</FormHelperText>}
        </FormControl>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: contentHasErrors ? "error.main" : "#F0EEEB" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A", mb: 2 }}>Email Content</Typography>
        <Stack spacing={2}>
          <TextField label="HTML Content" value={value.html_content} onChange={(e) => setField("html_content", e.target.value)} multiline minRows={12} fullWidth required error={Boolean(errors.html_content)} helperText={errors.html_content || "Enter the HTML email body."} InputProps={{ readOnly }} />
          <TextField label="Plain Text Fallback" value={value.plain_text} onChange={(e) => setField("plain_text", e.target.value)} multiline minRows={6} fullWidth InputProps={{ readOnly }} />
        </Stack>
      </Paper>
    </Stack>
  );
}

function MetricValue({ label, value }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>{value}</Typography>
    </Box>
  );
}

function CampaignPerformance({ analyticsState }) {
  const analytics = analyticsState.data || {};
  const sendSummary = analytics.send_summary || {};
  const engagement = analytics.engagement || {};
  const rates = analytics.rates || {};

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#F0EEEB" }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A" }}>Campaign Performance</Typography>
          {sendSummary.send_status && <Chip size="small" label={`Send: ${sendSummary.send_status}`} variant="outlined" />}
        </Stack>

        {analyticsState.loading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 11 }).map((_, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Skeleton height={54} />
              </Grid>
            ))}
          </Grid>
        ) : analyticsState.error ? (
          <Alert severity="warning" variant="outlined">{analyticsState.error}</Alert>
        ) : (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#2C3E5A", mb: 1 }}>Send Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Sent" value={formatNumber(sendSummary.sent_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Failed" value={formatNumber(sendSummary.failed_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Success Rate" value={formatPercent(sendSummary.success_rate)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Attempt Count" value={formatNumber(sendSummary.attempt_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Send Status" value={sendSummary.send_status || "-"} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#2C3E5A", mb: 1 }}>Engagement</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={3}>
                  <Box>
                    <MetricValue label="Provider Sent Events" value={formatNumber(engagement.delivered_count)} />
                    <Typography variant="caption" color="text.secondary">
                      Number of emails Mautic processed for sending. This does not confirm inbox delivery.
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Opened" value={formatNumber(engagement.opened_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Unique Opens" value={formatNumber(engagement.unique_open_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Clicked" value={formatNumber(engagement.clicked_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Unique Clicks" value={formatNumber(engagement.unique_click_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Unsubscribed" value={formatNumber(engagement.unsubscribe_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Bounced" value={formatNumber(engagement.bounced_count)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Tracking Failed Events" value={formatNumber(engagement.failed_count)} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#2C3E5A", mb: 1 }}>Rates</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Open Rate" value={formatPercent(rates.open_rate)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Click Rate" value={formatPercent(rates.click_rate)} />
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <MetricValue label="Unsubscribe Rate" value={formatPercent(rates.unsubscribe_rate)} />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export default function AdminNewsletterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams();
  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const isNew = normalizedPath.endsWith("/admin/newsletter/new");
  const isDetail = isNew || Boolean(campaignId);
  const [campaigns, setCampaigns] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [savedForm, setSavedForm] = useState(blankForm);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [previewState, setPreviewState] = useState({ open: false, loading: false, data: null, error: "" });
  const [testState, setTestState] = useState({ open: false, loading: false, error: "" });
  const [scheduleState, setScheduleState] = useState({ open: false, loading: false, error: "" });
  const [confirmState, setConfirmState] = useState({ type: "", loading: false });
  const [analyticsState, setAnalyticsState] = useState({ loading: false, data: null, error: "" });
  const [activeTab, setActiveTab] = useState("manage");
  const [sendPending, setSendPending] = useState(false);
  const mountedRef = useRef(false);
  const currentCampaignIdRef = useRef(campaignId);
  const pollTimeoutRef = useRef(null);
  const pollRunRef = useRef(0);

  const clearPollTimeout = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const stopSendPolling = () => {
    pollRunRef.current += 1;
    clearPollTimeout();
    setSendPending(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollRunRef.current += 1;
      clearPollTimeout();
    };
  }, []);

  useEffect(() => {
    currentCampaignIdRef.current = campaignId;
    setActiveTab("manage");
    stopSendPolling();
  }, [campaignId, isNew]);

  const loadCategories = async () => {
    const data = await listNewsletterCategories();
    const rows = Array.isArray(data) ? data : data?.results || data?.categories || [];
    setCategories(rows.filter((category) => category.is_active !== false));
  };

  const loadList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterCampaigns();
      setCampaigns(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, "We could not load newsletter campaigns."));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (campaignUuid) => {
    if (!campaignUuid) return;
    setAnalyticsState((state) => ({ ...state, loading: true, error: "" }));
    try {
      const data = await getNewsletterCampaignAnalytics(campaignUuid);
      if (!mountedRef.current || currentCampaignIdRef.current !== campaignUuid) return;
      setAnalyticsState({ loading: false, data, error: "" });
    } catch (err) {
      if (!mountedRef.current || currentCampaignIdRef.current !== campaignUuid) return;
      setAnalyticsState({
        loading: false,
        data: null,
        error: getErrorMessage(err, "We could not load campaign analytics."),
      });
    }
  };

  const loadDetail = async () => {
    setLoading(true);
    setError("");
    try {
      await loadCategories();
      if (isNew) {
        setCampaign(null);
        setForm(blankForm);
        setSavedForm(blankForm);
        setAnalyticsState({ loading: false, data: null, error: "" });
      } else {
        const data = await getNewsletterCampaign(campaignId);
        const nextForm = campaignToForm(data);
        setCampaign(data);
        setForm(nextForm);
        setSavedForm(nextForm);
        loadAnalytics(campaignId);
      }
    } catch (err) {
      setCampaign(null);
      setAnalyticsState({ loading: false, data: null, error: "" });
      setError(getErrorMessage(err, "We could not load this campaign."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDetail) loadDetail();
    else loadList();
  }, [campaignId, isNew]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Campaign name is required.";
    if (!form.subject.trim()) errors.subject = "Subject is required.";
    if (!form.from_name.trim()) errors.from_name = "From name is required.";
    if (!form.from_email.trim()) errors.from_email = "From email is required.";
    else if (!emailPattern.test(form.from_email.trim())) errors.from_email = "Enter a valid sender email.";
    if (!form.html_content.trim()) errors.html_content = "HTML content is required.";
    if (!form.audience_slugs?.length) errors.audience_slugs = "Select at least one audience.";
    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    if (!isValid) {
      setError("Complete the required newsletter fields before continuing.");
    }
    return isValid;
  };

  const saveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      preview_text: form.preview_text.trim(),
      from_name: form.from_name.trim(),
      from_email: form.from_email.trim(),
      html_content: form.html_content,
      plain_text: form.plain_text,
      audience_slugs: form.audience_slugs,
    };
    try {
      const data = isNew ? await createNewsletterCampaign(payload) : await updateNewsletterCampaign(campaignId, payload);
      setSnack({ open: true, severity: "success", message: "Draft saved." });
      if (isNew) navigate(`/admin/newsletter/${data.uuid}`, { replace: true });
      else {
        const nextForm = campaignToForm(data);
        setCampaign(data);
        setForm(nextForm);
        setSavedForm(nextForm);
      }
    } catch (err) {
      setError(getErrorMessage(err, "We could not save this draft."));
    } finally {
      setSaving(false);
    }
  };

  const refreshCampaign = async () => {
    const data = await getNewsletterCampaign(campaignId);
    const nextForm = campaignToForm(data);
    if (!mountedRef.current) return data;
    setCampaign(data);
    setForm(nextForm);
    setSavedForm(nextForm);
    loadAnalytics(campaignId);
    if (["sending", "sent", "failed"].includes(String(data?.status || "").toLowerCase())) {
      setSendPending(false);
    }
    return data;
  };

  const pollCampaignBriefly = async () => {
    const runId = pollRunRef.current;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => {
        pollTimeoutRef.current = setTimeout(resolve, 1500);
      });
      pollTimeoutRef.current = null;
      if (!mountedRef.current || pollRunRef.current !== runId) return;
      const data = await refreshCampaign();
      if (!mountedRef.current || pollRunRef.current !== runId) return;
      if (["sending", "sent", "failed"].includes(String(data?.status || "").toLowerCase())) {
        setSendPending(false);
        return;
      }
    }
    if (mountedRef.current && pollRunRef.current === runId) {
      setSendPending(false);
    }
  };

  const runAndRefresh = async (runner, successMessage, { refetchOnly = false, poll = false } = {}) => {
    const startedCampaignId = campaignId;
    setConfirmState((s) => ({ ...s, loading: true }));
    setError("");
    try {
      const data = await runner();
      if (!mountedRef.current || currentCampaignIdRef.current !== startedCampaignId) return;
      if (refetchOnly) {
        setSendPending(true);
        setConfirmState({ type: "", loading: false });
        setSnack({ open: true, severity: "success", message: successMessage });
        await refreshCampaign();
        if (!mountedRef.current || currentCampaignIdRef.current !== startedCampaignId) return;
        if (poll) {
          pollRunRef.current += 1;
          pollCampaignBriefly().catch(() => {
            if (mountedRef.current) setSendPending(false);
          });
        }
        return;
      } else {
        const nextForm = campaignToForm(data);
        setCampaign(data);
        setForm(nextForm);
        setSavedForm(nextForm);
      }
      setSnack({ open: true, severity: "success", message: successMessage });
      setConfirmState({ type: "", loading: false });
      setScheduleState({ open: false, loading: false, error: "" });
    } catch (err) {
      if (!mountedRef.current || currentCampaignIdRef.current !== startedCampaignId) return;
      if (refetchOnly) setSendPending(false);
      setError(getErrorMessage(err));
      setConfirmState({ type: "", loading: false });
    } finally {
      if (mountedRef.current && currentCampaignIdRef.current === startedCampaignId) {
        setConfirmState((s) => ({ ...s, loading: false }));
      }
    }
  };

  const blockIfDirty = () => {
    setError("Save your changes before previewing, testing, scheduling, or sending.");
  };

  const openIfValid = (openAction) => {
    if (isDirty) {
      blockIfDirty();
      return;
    }
    if (!validate()) return;
    setError("");
    openAction();
  };

  const openPreview = async () => {
    if (isNew) return;
    if (isDirty) {
      blockIfDirty();
      return;
    }
    setPreviewState({ open: true, loading: true, data: null, error: "" });
    try {
      const data = await previewNewsletterCampaign(campaignId);
      setPreviewState({ open: true, loading: false, data, error: "" });
    } catch (err) {
      setPreviewState({ open: true, loading: false, data: null, error: getErrorMessage(err, "Preview is unavailable.") });
    }
  };

  const sendTest = async (email) => {
    if (!validate()) return;
    setTestState((s) => ({ ...s, loading: true, error: "" }));
    try {
      await sendNewsletterTestEmail(campaignId, email);
      setTestState({ open: false, loading: false, error: "" });
      setSnack({ open: true, severity: "success", message: "Test email sent." });
    } catch (err) {
      setTestState((s) => ({ ...s, loading: false, error: getErrorMessage(err, "We could not send the test email.") }));
    }
  };

  const scheduleCampaign = async (scheduledAt) => {
    if (isDirty) {
      blockIfDirty();
      return;
    }
    if (!validate()) return;
    setScheduleState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await scheduleNewsletterCampaign(campaignId, scheduledAt);
      const nextForm = campaignToForm(data);
      setCampaign(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setScheduleState({ open: false, loading: false, error: "" });
      setSnack({ open: true, severity: "success", message: campaign?.status === "scheduled" ? "Campaign rescheduled." : "Campaign scheduled." });
    } catch (err) {
      setScheduleState((s) => ({ ...s, loading: false, error: getErrorMessage(err, "We could not schedule this campaign.") }));
    }
  };

  const sendNow = () => {
    if (!validate()) return;
    runAndRefresh(() => sendNewsletterCampaign(campaignId), "Newsletter send accepted.", { refetchOnly: true, poll: true });
  };

  const filteredCampaigns = useMemo(
    () => (filter === "all" ? campaigns : campaigns.filter((row) => String(row?.status || "").toLowerCase() === filter)),
    [campaigns, filter]
  );
  const detailLoaded = isNew || (!loading && !error && Boolean(campaign));
  const status = campaign ? String(campaign.status || "").toLowerCase() : "";
  const editable = detailLoaded && (isNew || status === "draft");
  const isDirty = editable && !isNew && JSON.stringify(form) !== JSON.stringify(savedForm);
  const actionsDisabledForDirty = isDirty || confirmState.loading;
  const canDelete = detailLoaded && !isNew && status === "draft";
  const canSchedule = detailLoaded && !isNew && (status === "draft" || status === "scheduled");
  const canSendNow = detailLoaded && !isNew && status === "draft";
  const sendNowDisabled = actionsDisabledForDirty || sendPending;
  const canCancel = detailLoaded && !isNew && status === "scheduled";
  const showDetailTabs = detailLoaded && !isNew;
  const showManageTab = isNew || activeTab === "manage";
  const showAnalyticsTab = showDetailTabs && activeTab === "analytics";
  const audienceLabels = getCampaignAudienceLabels(campaign);

  if (!isDetail) {
    return (
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 0.75 }}>Newsletter Campaigns</Typography>
            <Typography color="text.secondary">Create, schedule, and review newsletter campaigns.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/admin/newsletter/new")} sx={{ textTransform: "none" }}>
            Create Campaign
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#F0EEEB", overflow: "hidden" }}>
          <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: "1px solid #F0EEEB", display: "flex", justifyContent: "space-between", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
            <Tabs value={filter} onChange={(_, v) => setFilter(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 40, "& .MuiTab-root": { textTransform: "none", minHeight: 40 }, "& .Mui-selected": { color: "#0ea5a4 !important", fontWeight: 700 }, "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" } }}>
              <Tab label="All" value="all" />
              <Tab label="Draft" value="draft" />
              <Tab label="Scheduled" value="scheduled" />
              <Tab label="Sent" value="sent" />
              <Tab label="Failed" value="failed" />
              <Tab label="Cancelled" value="cancelled" />
            </Tabs>
            <Button startIcon={<RefreshRoundedIcon />} onClick={loadList} disabled={loading} sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}>
              Refresh
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ p: 3 }}><Stack spacing={1}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={46} />)}</Stack></Box>
          ) : error ? (
            <Box sx={{ p: 3 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={loadList}>Retry</Button>}>{error}</Alert></Box>
          ) : filteredCampaigns.length === 0 ? (
            <Box sx={{ p: 3 }}><Alert severity="info" variant="outlined">No newsletter campaigns found.</Alert></Box>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                    <TableCell>Campaign</TableCell>
                    <TableCell>Audience</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Scheduled / Sent Time</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCampaigns.map((row) => (
                    <TableRow hover key={row.uuid} sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/newsletter/${row.uuid}`)}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>{row.name || "Untitled campaign"}</Typography>
                        <Typography variant="body2" color="text.secondary">{row.subject || "-"}</Typography>
                      </TableCell>
                      <TableCell>{getCampaignAudienceLabels(row).join(", ") || "-"}</TableCell>
                      <TableCell><StatusChip status={row.status} /></TableCell>
                      <TableCell>{formatDateTime(row.sent_at || row.scheduled_at || row.send_started_at)}</TableCell>
                      <TableCell>{formatDateTime(row.updated_at)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Open campaign">
                          <IconButton onClick={(e) => { e.stopPropagation(); navigate(`/admin/newsletter/${row.uuid}`); }}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <IconButton onClick={() => navigate("/admin/newsletter")}><ArrowBackRoundedIcon /></IconButton>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2A4A" }}>{isNew ? "Create Campaign" : campaign?.name || "Newsletter Campaign"}</Typography>
              {!isNew && <StatusChip status={campaign?.status} />}
            </Stack>
            <Typography color="text.secondary">{editable ? "Save draft content before scheduling or sending." : "Campaign details are read-only for this status."}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {detailLoaded && !isNew && <Button startIcon={<PreviewRoundedIcon />} onClick={openPreview} disabled={actionsDisabledForDirty} sx={{ textTransform: "none" }}>Preview</Button>}
          {detailLoaded && !isNew && editable && <Button startIcon={<EmailRoundedIcon />} onClick={() => openIfValid(() => setTestState({ open: true, loading: false, error: "" }))} disabled={actionsDisabledForDirty} sx={{ textTransform: "none" }}>Send Test Email</Button>}
          {canSchedule && <Button startIcon={<ScheduleRoundedIcon />} onClick={() => openIfValid(() => setScheduleState({ open: true, loading: false, error: "" }))} disabled={actionsDisabledForDirty} sx={{ textTransform: "none" }}>{status === "scheduled" ? "Reschedule" : "Schedule"}</Button>}
          {canCancel && <Button color="warning" startIcon={<StopCircleRoundedIcon />} onClick={() => setConfirmState({ type: "cancel", loading: false })} disabled={confirmState.loading} sx={{ textTransform: "none" }}>Cancel Scheduled Send</Button>}
          {canSendNow && <Button color="success" variant="contained" startIcon={<SendRoundedIcon />} onClick={() => openIfValid(() => setConfirmState({ type: "send", loading: false }))} disabled={sendNowDisabled} sx={{ textTransform: "none" }}>Send Now</Button>}
          {editable && <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveDraft} disabled={saving || loading} sx={{ textTransform: "none" }}>{saving ? "Saving..." : "Save Draft"}</Button>}
          {canDelete && <Button color="error" startIcon={<DeleteRoundedIcon />} onClick={() => setConfirmState({ type: "delete", loading: false })} disabled={confirmState.loading} sx={{ textTransform: "none" }}>Delete</Button>}
        </Stack>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {isDirty && <Alert severity="info">Save your changes before previewing, testing, scheduling, or sending.</Alert>}
      {!isNew && !loading && error && !campaign && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#F0EEEB" }}>
          <Stack spacing={2} alignItems="flex-start">
            <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>Campaign could not be loaded.</Typography>
            <Stack direction="row" spacing={1}>
              <Button startIcon={<RefreshRoundedIcon />} variant="contained" onClick={loadDetail} sx={{ textTransform: "none" }}>
                Retry
              </Button>
              <Button onClick={() => navigate("/admin/newsletter")} sx={{ textTransform: "none" }}>
                Back to Campaigns
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
      {detailLoaded && !isNew && campaign?.last_error && <Alert severity="error">{campaign.last_error}</Alert>}
      {showDetailTabs && (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#F0EEEB", overflow: "hidden" }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 44, px: { xs: 1, md: 2 }, "& .MuiTab-root": { textTransform: "none", minHeight: 44 }, "& .Mui-selected": { color: "#0ea5a4 !important", fontWeight: 700 }, "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" } }}>
            <Tab label="Manage" value="manage" />
            <Tab label="Analytics" value="analytics" />
          </Tabs>
        </Paper>
      )}

      {showManageTab && detailLoaded && !isNew && (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#F0EEEB" }}>
            <Stack direction={{ xs: "column", md: "row" }} divider={<Divider flexItem orientation="vertical" />} spacing={2}>
              <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Audience</Typography><Typography sx={{ fontWeight: 700 }}>{audienceLabels.join(", ") || "-"}</Typography></Box>
              <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Scheduled</Typography><Typography sx={{ fontWeight: 700 }}>{formatDateTime(campaign.scheduled_at)}</Typography></Box>
              <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Sent</Typography><Typography sx={{ fontWeight: 700 }}>{formatDateTime(campaign.sent_at || campaign.send_started_at)}</Typography></Box>
              <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Last Synced</Typography><Typography sx={{ fontWeight: 700 }}>{formatDateTime(campaign.last_synced_to_mautic_at)}</Typography></Box>
            </Stack>
          </Paper>
        </Stack>
      )}

      {showAnalyticsTab && <CampaignPerformance analyticsState={analyticsState} />}

      {loading ? (
        <Stack spacing={2}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={140} />)}</Stack>
      ) : detailLoaded && showManageTab ? (
        <NewsletterForm value={form} categories={categories} readOnly={!editable} errors={formErrors} onChange={setForm} />
      ) : null}

      <PreviewDialog open={previewState.open} loading={previewState.loading} preview={previewState.data} error={previewState.error} onClose={() => setPreviewState({ open: false, loading: false, data: null, error: "" })} />
      <TestEmailDialog open={testState.open} loading={testState.loading} error={testState.error} onClose={() => setTestState({ open: false, loading: false, error: "" })} onSend={sendTest} />
      <ScheduleDialog open={scheduleState.open} loading={scheduleState.loading} error={scheduleState.error} initialValue={status === "scheduled" ? campaign?.scheduled_at : ""} onClose={() => setScheduleState({ open: false, loading: false, error: "" })} onSchedule={scheduleCampaign} />

      <ConfirmDialog
        open={confirmState.type === "send"}
        title="Send Newsletter Now?"
        confirmLabel="Send Newsletter"
        confirmColor="success"
        loading={confirmState.loading}
        onClose={() => setConfirmState({ type: "", loading: false })}
        onConfirm={sendNow}
      >
        <Stack spacing={2}>
          <Typography>This newsletter will be sent immediately. Once provider delivery starts, it cannot safely be recalled.</Typography>
          <Box>
            <Typography variant="body2" color="text.secondary">Audience</Typography>
            <Typography sx={{ fontWeight: 700 }}>{audienceLabels.join(", ") || "-"}</Typography>
          </Box>
        </Stack>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmState.type === "cancel"}
        title="Cancel Scheduled Newsletter?"
        confirmLabel="Cancel Send"
        confirmColor="warning"
        loading={confirmState.loading}
        onClose={() => setConfirmState({ type: "", loading: false })}
        onConfirm={() => runAndRefresh(() => cancelNewsletterCampaign(campaignId), "Scheduled newsletter cancelled.")}
      >
        <Typography>The scheduled delivery will be cancelled.</Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmState.type === "delete"}
        title="Delete Draft Campaign?"
        confirmLabel="Delete"
        confirmColor="error"
        loading={confirmState.loading}
        onClose={() => setConfirmState({ type: "", loading: false })}
        onConfirm={async () => {
          setConfirmState((s) => ({ ...s, loading: true }));
          try {
            await deleteNewsletterCampaign(campaignId);
            navigate("/admin/newsletter", { replace: true });
          } catch (err) {
            setError(getErrorMessage(err, "We could not delete this draft."));
            setConfirmState({ type: "", loading: false });
          }
        }}
      >
        <Typography>This only removes draft campaigns. Sent or scheduled campaign history is left untouched.</Typography>
      </ConfirmDialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
