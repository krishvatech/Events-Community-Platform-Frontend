import React, { useEffect, useRef, useState } from "react";
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
  Step,
  StepLabel,
  Stepper,
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
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StopCircleRoundedIcon from "@mui/icons-material/StopCircleRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import SegmentRoundedIcon from "@mui/icons-material/SegmentRounded";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  cancelNewsletterCampaign,
  createNewsletterCampaign,
  deleteNewsletterCampaign,
  duplicateNewsletterCampaign,
  getNewsletterCampaign,
  getNewsletterCampaignAnalytics,
  getNewsletterCampaignAnalyticsSummary,
  listNewsletterCampaigns,
  listNewsletterCategories,
  previewNewsletterCampaign,
  scheduleNewsletterCampaign,
  sendNewsletterCampaign,
  sendNewsletterTestEmail,
  syncNewsletterCampaign,
  updateNewsletterCampaign,
  getNewsletterMauticDiagnostics,
} from "../services/newsletterService";
import {
  SAVE_STAGE_SYNC,
  SAVE_STATUS_SYNCED,
  saveBroadcastDraft,
} from "./newsletterBroadcastSave.js";
import {
  broadcastHasSendData,
  broadcastRate,
  broadcastRateText,
  broadcastScheduleActions,
  isBroadcastDetailLoaded,
} from "./newsletterBroadcastState.js";
import AdminNewsletterCategoriesTab from "./AdminNewsletterCategoriesTab.jsx";
import AdminNewsletterTemplatesPanel from "./AdminNewsletterTemplatesPanel.jsx";
import AdminNewsletterMauticCampaignsPanel from "./AdminNewsletterMauticCampaignsPanel.jsx";
import AdminNewsletterMauticCampaignBuilderPage from "./AdminNewsletterMauticCampaignBuilderPage.jsx";
import AdminNewsletterNativeSegmentsPanel from "./AdminNewsletterNativeSegmentsPanel.jsx";
import AdminNewsletterTagsPanel from "./AdminNewsletterTagsPanel.jsx";
import AdminNewsletterCustomFieldsPanel from "./AdminNewsletterCustomFieldsPanel.jsx";
import { getMarketingSectionFromPath } from "../config/marketingNavigation";

const STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Completed",
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

const starterHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family: Arial, sans-serif; color: #1B2A4A; background: #ffffff;">
  <tr>
    <td style="padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.25;">Newsletter headline</h1>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Write a short introduction for this newsletter.</p>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6;">Add the most important update, event, article, or deal alert here.</p>
      <p style="margin: 0;">
        <a href="https://imaa-institute.org" style="display: inline-block; padding: 12px 18px; background: #10b8a6; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 700;">Read more</a>
      </p>
    </td>
  </tr>
</table>`;

const starterPlainText = `Newsletter headline

Write a short introduction for this newsletter.

Add the most important update, event, article, or deal alert here.

Read more: https://imaa-institute.org`;

const blankForm = {
  name: "",
  subject: "",
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "eventncommunity@gmail.com",
  html_content: starterHtml,
  plain_text: starterPlainText,
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
  if (value === null || value === undefined || value === "") return "No data available";
  const number = Number(value);
  if (!Number.isFinite(number)) return "No data available";
  return new Intl.NumberFormat().format(number);
};


const getCampaignAudienceSlugs = (campaign) => {
  const raw = campaign?.audience_slugs || campaign?.audiences || [];
  return raw.map((item) => (typeof item === "string" ? item : item?.slug)).filter(Boolean);
};

const getCampaignAudienceLabels = (campaign) => {
  const raw = campaign?.audiences || campaign?.audience_slugs || [];
  return raw.map((item) => (typeof item === "string" ? item : item?.name || item?.slug)).filter(Boolean);
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
      sx={{ fontWeight: 800 }}
    />
  );
}

function MetricCard({ label, value, loading, helper }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", minHeight: 116 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{label}</Typography>
      {loading ? <Skeleton width="70%" height={34} /> : <Typography variant="h5" sx={{ color: "#1B2A4A", fontWeight: 850 }}>{value}</Typography>}
      {helper && <Typography variant="caption" color="text.secondary">{helper}</Typography>}
    </Paper>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: "#E7ECEF", bgcolor: "#fff" }}>
      <Stack spacing={1.5} alignItems="flex-start">
        <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>{title}</Typography>
        {description && <Typography color="text.secondary">{description}</Typography>}
        {action}
      </Stack>
    </Paper>
  );
}

function NewsletterShell({ children }) {
  return (
    <Stack spacing={3}>
      {children}
    </Stack>
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
              <Typography sx={{ fontWeight: 700 }}>
                {preview?.from_name || "-"} {preview?.from_email ? `<${preview.from_email}>` : ""}
              </Typography>
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
  const invalid = email.trim() && !emailPattern.test(email.trim());

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
            onChange={(event) => setEmail(event.target.value)}
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
    if (open) setValue(formatDateTimeLocalInput(initialValue));
  }, [open, initialValue]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initialValue ? "Reschedule Broadcast" : "Schedule Broadcast"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Date and time"
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
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

// A Draft, Scheduled or Cancelled broadcast has no sends: "—", with no request.
function BroadcastRateCell({ status, analytics, rateKey }) {
  if (!broadcastHasSendData(status)) return "—";
  if (broadcastRate(analytics, rateKey).kind === "loading") return <Skeleton width={40} />;
  return broadcastRateText(analytics, rateKey);
}

function CampaignList({ campaigns, analyticsByUuid, loading, error, filter, onFilter, onRefresh, onOpen, onDuplicate, duplicatingUuid, onCreate }) {
  const filteredCampaigns = filter === "all"
    ? campaigns
    : campaigns.filter((row) => String(row?.status || "").toLowerCase() === filter);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Email Broadcasts</Typography>
          <Typography color="text.secondary">Create, schedule, and review newsletter emails sent to subscription lists.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onCreate} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
          Create Broadcast
        </Button>
      </Stack>
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: "1px solid #E7ECEF", display: "flex", justifyContent: "space-between", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
          <Tabs value={filter} onChange={(_, value) => onFilter(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ minHeight: 40, "& .MuiTab-root": { textTransform: "none", minHeight: 40 }, "& .Mui-selected": { color: "#0f766e !important", fontWeight: 800 }, "& .MuiTabs-indicator": { backgroundColor: "#0f766e" } }}>
            <Tab label="All" value="all" />
            <Tab label="Draft" value="draft" />
            <Tab label="Scheduled" value="scheduled" />
            <Tab label="Sending" value="sending" />
            <Tab label="Completed" value="sent" />
            <Tab label="Failed" value="failed" />
            <Tab label="Cancelled" value="cancelled" />
          </Tabs>
          <Button startIcon={<RefreshRoundedIcon />} onClick={onRefresh} disabled={loading} sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}>
            Refresh
          </Button>
        </Box>
        {loading ? (
          <Box sx={{ p: 3 }}><Stack spacing={1}>{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={46} />)}</Stack></Box>
        ) : error ? (
          <Box sx={{ p: 3 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={onRefresh}>Retry</Button>}>{error}</Alert></Box>
        ) : filteredCampaigns.length === 0 ? (
          <Box sx={{ p: 3 }}><Alert severity="info" variant="outlined">No email broadcasts found.</Alert></Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Broadcast Name</TableCell>
                  <TableCell>Audience</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Scheduled Date</TableCell>
                  <TableCell>Sent Date</TableCell>
                  <TableCell>Open Rate</TableCell>
                  <TableCell>Click Rate</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCampaigns.map((row) => (
                  <TableRow hover key={row.uuid} sx={{ cursor: "pointer" }} onClick={() => onOpen(row.uuid)}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>{row.name || "Untitled broadcast"}</Typography>
                      <Typography variant="body2" color="text.secondary">{row.subject || "-"}</Typography>
                    </TableCell>
                    <TableCell>{getCampaignAudienceLabels(row).join(", ") || "-"}</TableCell>
                    <TableCell><StatusChip status={row.status} /></TableCell>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{formatDateTime(row.scheduled_at)}</TableCell>
                    <TableCell>{formatDateTime(row.sent_at || row.send_started_at)}</TableCell>
                    <TableCell><BroadcastRateCell status={row.status} analytics={analyticsByUuid[row.uuid]} rateKey="open_rate" /></TableCell>
                    <TableCell><BroadcastRateCell status={row.status} analytics={analyticsByUuid[row.uuid]} rateKey="click_rate" /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Duplicate broadcast">
                        <span>
                          <IconButton
                            aria-label="Duplicate broadcast"
                            disabled={Boolean(duplicatingUuid)}
                            onClick={(event) => { event.stopPropagation(); onDuplicate(row.uuid); }}
                          >
                            {duplicatingUuid === row.uuid ? <CircularProgress size={18} /> : <ContentCopyRoundedIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Open broadcast">
                        <IconButton onClick={(event) => { event.stopPropagation(); onOpen(row.uuid); }}>
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

function BroadcastAnalyticsPanel({ status, analyticsState, onRefresh }) {
  const data = analyticsState.data;
  const sendSummary = data?.send_summary || {};
  const engagement = data?.engagement || {};
  const loading = analyticsState.loading;
  // Same rule as the list: a Draft, Scheduled or Cancelled broadcast has no
  // sends, even when Mautic cannot be reached to confirm it.
  const neverSent = !broadcastHasSendData(status);
  const openRate = broadcastRate(data, "open_rate");
  const noSends = !loading && !analyticsState.error && (neverSent || openRate.kind === "none");
  const providerUnavailable = !loading && !neverSent && Boolean(data) && openRate.kind === "unavailable";
  const count = (value) => (loading || !data ? "—" : formatNumber(value));
  const rate = (rateKey) => (loading || !data || neverSent ? "—" : broadcastRateText(data, rateKey));
  // Without Mautic, opens (and sends not recorded by ECP) would read as 0.
  const opensUnknown = providerUnavailable;
  const sentUnknown = providerUnavailable && data?.metadata?.send_summary_source !== "ecp";

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>Broadcast Analytics</Typography>
            <Typography variant="body2" color="text.secondary">
              Rates use delivered emails, or sends when delivery is not reported. Opens and clicks count each recipient once.
            </Typography>
          </Box>
          <Button startIcon={<RefreshRoundedIcon />} onClick={onRefresh} disabled={loading} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            Refresh Analytics
          </Button>
        </Stack>
        {analyticsState.error && <Alert severity="warning">{analyticsState.error} The broadcast itself is unaffected.</Alert>}
        {providerUnavailable && <Alert severity="warning">Mautic statistics are temporarily unavailable, so opens and sends cannot be shown right now.</Alert>}
        {noSends && <Alert severity="info" variant="outlined">No sends yet. Analytics appear after this broadcast is sent.</Alert>}
        <Grid container spacing={2}>
          {/* Sent counts provider send attempts, not mailbox deliveries. */}
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Sent" value={sentUnknown ? "Unavailable" : count(sendSummary.sent_count)} loading={loading} /></Grid>
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Unique Opens" value={opensUnknown ? "Unavailable" : count(engagement.unique_open_count)} loading={loading} /></Grid>
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Open Rate" value={rate("open_rate")} loading={loading} /></Grid>
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Unique Clicks" value={count(engagement.unique_click_count)} loading={loading} /></Grid>
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Click Rate" value={rate("click_rate")} loading={loading} /></Grid>
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Bounced" value={count(engagement.bounced_count)} loading={loading} /></Grid>
          <Grid item xs={6} sm={4} md={3}><MetricCard label="Unsubscribed" value={count(engagement.unsubscribe_count)} loading={loading} /></Grid>
        </Grid>
      </Stack>
    </Paper>
  );
}

function SettingsPage() {
  const [section, setSection] = useState("connection");
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(true);
  const [diagnosticsError, setDiagnosticsError] = useState("");

  const loadDiagnostics = async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsError("");
    try {
      setDiagnostics(await getNewsletterMauticDiagnostics());
    } catch (err) {
      setDiagnostics(null);
      setDiagnosticsError(getErrorMessage(err, "Could not load Mautic diagnostics."));
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  useEffect(() => {
    if (section === "connection") loadDiagnostics();
  }, [section]);

  const StatusChip = ({ value }) => {
    const normalized = String(value || "Not available");
    const healthy = ["Healthy", "Available", "Configured", "Enabled", "Ready", "Received"].includes(normalized);
    const warning = ["Degraded", "Not Verifiable", "Never Received", "Disabled"].includes(normalized);
    return (
      <Chip
        size="small"
        label={normalized}
        color={healthy ? "success" : warning ? "warning" : "error"}
        variant={healthy ? "filled" : "outlined"}
        sx={{ fontWeight: 800 }}
      />
    );
  };

  const InfoCard = ({ title, children, status }) => (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF", minHeight: 132 }}>
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>{title}</Typography>
          {status ? <StatusChip value={status} /> : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );

  const Field = ({ label, value }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right", color: "#1B2A4A" }}>
        {value === null || value === undefined || value === "" ? "Not available" : String(value)}
      </Typography>
    </Stack>
  );

  const formatDiagnosticDate = (value) => {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Settings</Typography>
        <Typography color="text.secondary">Newsletter configuration visible to marketing users.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Tabs
          value={section}
          onChange={(_, value) => setSection(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 750 },
            "& .Mui-selected": { color: "#0f766e !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#0f766e" },
          }}
        >
          <Tab label="Mautic Connection" value="connection" />
          <Tab label="Tags" value="tags" />
          <Tab label="Custom Fields" value="fields" />
        </Tabs>
      </Paper>

      {section === "connection" ? (
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
            <Typography color="text.secondary">
              Read-only operational status for Mautic, bridge plugins, webhooks, and newsletter sync.
            </Typography>
            <Button
              startIcon={<RefreshRoundedIcon />}
              onClick={loadDiagnostics}
              disabled={diagnosticsLoading}
              sx={{ textTransform: "none", alignSelf: { xs: "flex-start", sm: "center" } }}
            >
              Refresh Status
            </Button>
          </Stack>

          {diagnosticsError ? <Alert severity="error">{diagnosticsError}</Alert> : null}

          {diagnosticsLoading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Skeleton variant="rounded" height={150} />
                </Grid>
              ))}
            </Grid>
          ) : diagnostics ? (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <InfoCard title="Mautic Instance" status={diagnostics.connection?.status}>
                    <Field label="Configured" value={diagnostics.connection?.configured ? "Yes" : "No"} />
                    <Field label="Reachable" value={diagnostics.connection?.reachable ? "Yes" : "No"} />
                    <Field label="Authenticated" value={diagnostics.connection?.authenticated ? "Yes" : "No"} />
                    <Field label="Host" value={diagnostics.connection?.host} />
                    <Field label="Version" value={diagnostics.connection?.version} />
                    <Field label="Last Checked" value={formatDiagnosticDate(diagnostics.checked_at)} />
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoCard title="Mautic REST API" status={diagnostics.api?.status}>
                    <Typography color="text.secondary" variant="body2">{diagnostics.api?.detail}</Typography>
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoCard title="ECP Marketing Bridge" status={diagnostics.bridges?.marketing?.status}>
                    <Field label="Plugin" value={diagnostics.bridges?.marketing?.plugin} />
                    <Field label="Version" value={diagnostics.bridges?.marketing?.version} />
                    <Typography variant="body2" color="text.secondary">
                      {(diagnostics.bridges?.marketing?.capabilities || []).join(", ") || diagnostics.bridges?.marketing?.detail || "No capabilities reported."}
                    </Typography>
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoCard title="Campaign Builder Bridge" status={diagnostics.bridges?.campaign_builder?.status}>
                    <Field label="Plugin" value={diagnostics.bridges?.campaign_builder?.plugin} />
                    <Field label="Actions" value={diagnostics.bridges?.campaign_builder?.capabilities?.actions} />
                    <Field label="Conditions" value={diagnostics.bridges?.campaign_builder?.capabilities?.conditions} />
                    <Field label="Decisions" value={diagnostics.bridges?.campaign_builder?.capabilities?.decisions} />
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoCard title="Webhooks" status={diagnostics.webhook?.receiver}>
                    <Field label="Receiver" value={diagnostics.webhook?.receiver} />
                    <Field label="Endpoint" value={diagnostics.webhook?.endpoint_path} />
                    <Field label="Last Received" value={formatDiagnosticDate(diagnostics.webhook?.last_received_at)} />
                    <Field label="Registration" value={diagnostics.webhook?.registration} />
                    <Typography variant="body2" color="text.secondary">
                      {(diagnostics.webhook?.supported_event_types || []).join(", ")}
                    </Typography>
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoCard title="Synchronization" status={diagnostics.sync?.status}>
                    <Field label="Pending" value={diagnostics.sync?.pending} />
                    <Field label="Processing" value={diagnostics.sync?.processing} />
                    <Field label="Retrying" value={diagnostics.sync?.retrying} />
                    <Field label="Failed" value={diagnostics.sync?.failed} />
                    <Field label="Last successful" value={formatDiagnosticDate(diagnostics.sync?.latest_success_at)} />
                  </InfoCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoCard title="Background Processing" status={diagnostics.background_processing?.configuration}>
                    <Field label="Configuration" value={diagnostics.background_processing?.configuration} />
                    <Field label="Worker heartbeat" value={diagnostics.background_processing?.live_worker_status} />
                    <Field label="Sync recovery scheduled" value={diagnostics.background_processing?.newsletter_sync_scheduled ? "Yes" : "No"} />
                    <Field label="Native Broadcast reconciliation scheduled" value={diagnostics.background_processing?.native_broadcast_reconciliation_scheduled ? "Yes" : "No"} />
                  </InfoCard>
                </Grid>
              </Grid>

              {diagnostics.diagnostics?.warnings?.length ? (
                <Stack spacing={1}>
                  {diagnostics.diagnostics.warnings.map((warning) => (
                    <Alert key={warning} severity="warning" variant="outlined">{warning}</Alert>
                  ))}
                </Stack>
              ) : (
                <Alert severity="success" variant="outlined">No diagnostics warnings.</Alert>
              )}
            </>
          ) : null}
        </Stack>
      ) : null}

      {section === "tags" ? <AdminNewsletterTagsPanel /> : null}
      {section === "fields" ? <AdminNewsletterCustomFieldsPanel /> : null}
    </Stack>
  );
}

function CampaignForm({ value, categories, readOnly, errors, onChange, activeStep, onStepChange }) {
  const setField = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  const toggleAudience = (slug) => {
    const set = new Set(value.audience_slugs || []);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    setField("audience_slugs", Array.from(set));
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: "none", md: "flex" } }}>
          {["Broadcast Information", "Subscription Lists", "Email Content", "Review & Actions"].map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        <Tabs value={activeStep} onChange={(_, value) => onStepChange(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ display: { xs: "flex", md: "none" }, "& .MuiTab-root": { textTransform: "none" } }}>
          <Tab label="Info" value={0} />
          <Tab label="Lists" value={1} />
          <Tab label="Content" value={2} />
          <Tab label="Review" value={3} />
        </Tabs>
      </Paper>

      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 2 }}>Broadcast Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Broadcast Name" value={value.name} onChange={(event) => setField("name", event.target.value)} error={Boolean(errors.name)} helperText={errors.name} fullWidth required InputProps={{ readOnly }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Subject" value={value.subject} onChange={(event) => setField("subject", event.target.value)} error={Boolean(errors.subject)} helperText={errors.subject} fullWidth required InputProps={{ readOnly }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Sender Name" value={value.from_name} onChange={(event) => setField("from_name", event.target.value)} error={Boolean(errors.from_name)} helperText={errors.from_name} fullWidth required InputProps={{ readOnly }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Sender Email" type="email" value={value.from_email} onChange={(event) => setField("from_email", event.target.value)} error={Boolean(errors.from_email)} helperText={errors.from_email} fullWidth required InputProps={{ readOnly }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Preview Text" value={value.preview_text} onChange={(event) => setField("preview_text", event.target.value)} fullWidth InputProps={{ readOnly }} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: errors.audience_slugs ? "error.main" : "#E7ECEF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 1 }}>Subscription Lists</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Choose the newsletter lists this broadcast should be sent to.</Typography>
          <FormControl component="fieldset" fullWidth disabled={readOnly} error={Boolean(errors.audience_slugs)}>
            <FormGroup>
              <Grid container spacing={1}>
                {categories.map((category) => (
                  <Grid item xs={12} md={6} key={category.slug}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: (value.audience_slugs || []).includes(category.slug) ? "#0f766e" : "#E7ECEF" }}>
                      <FormControlLabel
                        control={<Checkbox checked={(value.audience_slugs || []).includes(category.slug)} onChange={() => toggleAudience(category.slug)} />}
                        label={<Box><Typography sx={{ fontWeight: 800 }}>{category.name || category.slug}</Typography>{category.description && <Typography variant="body2" color="text.secondary">{category.description}</Typography>}</Box>}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
            {errors.audience_slugs && <FormHelperText>{errors.audience_slugs}</FormHelperText>}
            {categories.length === 0 && <FormHelperText>No active subscription lists found.</FormHelperText>}
          </FormControl>
        </Paper>
      )}

      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: errors.html_content ? "error.main" : "#E7ECEF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 1 }}>Email Content</Typography>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>Advanced Email Builder Coming Soon</Alert>
          <Stack spacing={2}>
            <TextField label="HTML Content" value={value.html_content} onChange={(event) => setField("html_content", event.target.value)} multiline minRows={12} fullWidth required error={Boolean(errors.html_content)} helperText={errors.html_content || "Use HTML content for the email body."} InputProps={{ readOnly }} />
            <TextField label="Plain Text Fallback" value={value.plain_text} onChange={(event) => setField("plain_text", event.target.value)} multiline minRows={6} fullWidth InputProps={{ readOnly }} />
          </Stack>
        </Paper>
      )}

      {activeStep === 3 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 2 }}>Review & Actions</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><MetricCard label="Broadcast Name" value={value.name || "No data available"} /></Grid>
            <Grid item xs={12} md={6}><MetricCard label="Subscription Lists" value={(value.audience_slugs || []).join(", ") || "No data available"} /></Grid>
            <Grid item xs={12} md={6}><MetricCard label="Subject" value={value.subject || "No data available"} /></Grid>
            <Grid item xs={12} md={6}><MetricCard label="Sender" value={value.from_name || "No data available"} /></Grid>
          </Grid>
        </Paper>
      )}
    </Stack>
  );
}

export default function AdminNewsletterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams();
  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const isNew = normalizedPath.endsWith("/admin/newsletter/new");
  const isBuilderRoute = normalizedPath.includes("/admin/newsletter/builder");
  const isDetail = (isNew || Boolean(campaignId)) && !isBuilderRoute;
  const activeTab = getMarketingSectionFromPath(location.pathname);
  const requestedTab = location.state?.newsletterTab;

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
  const [activeStep, setActiveStep] = useState(0);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [previewState, setPreviewState] = useState({ open: false, loading: false, data: null, error: "" });
  const [testState, setTestState] = useState({ open: false, loading: false, error: "" });
  const [scheduleState, setScheduleState] = useState({ open: false, loading: false, error: "" });
  const [confirmState, setConfirmState] = useState({ type: "", loading: false });
  const [analyticsState, setAnalyticsState] = useState({ loading: false, data: null, error: "" });
  const [listAnalytics, setListAnalytics] = useState({});
  // Bumped on every successful list load so analytics follow each reload,
  // even when the reloaded rows are unchanged.
  const [listLoadCount, setListLoadCount] = useState(0);
  // Set by the list's Refresh button so the next summary bypasses the cache.
  const refreshListAnalytics = useRef(false);
  const [duplicatingUuid, setDuplicatingUuid] = useState("");
  const duplicateInFlight = useRef(false);

  const loadCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterCampaigns();
      const rows = Array.isArray(data) ? data : data?.results || [];
      setCampaigns(rows);
      setListLoadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err, "We could not load email broadcasts."));
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const data = await listNewsletterCategories();
    const rows = Array.isArray(data) ? data : data?.results || data?.categories || [];
    setCategories(rows.filter((category) => category.is_active !== false));
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
        setActiveStep(0);
      } else {
        const data = await getNewsletterCampaign(campaignId);
        const nextForm = campaignToForm(data);
        setCampaign(data);
        setForm(nextForm);
        setSavedForm(nextForm);
        setActiveStep(0);
        loadAnalytics(campaignId);
      }
    } catch (err) {
      setCampaign(null);
      setError(getErrorMessage(err, "We could not load this broadcast."));
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (uuid) => {
    if (!uuid) return;
    setAnalyticsState((state) => ({ ...state, loading: true, error: "" }));
    try {
      const data = await getNewsletterCampaignAnalytics(uuid);
      setAnalyticsState({ loading: false, data, error: "" });
    } catch (err) {
      setAnalyticsState({ loading: false, data: null, error: getErrorMessage(err, "We could not load campaign analytics.") });
    }
  };

  useEffect(() => {
    if (isDetail) loadDetail();
    else loadCampaigns();
  }, [campaignId, isNew]);

  useEffect(() => {
    if (!isDetail) {
      if (requestedTab) {
        const paths = {
          dashboard: "/admin/newsletter",
          campaigns: "/admin/newsletter/campaigns",
          broadcasts: "/admin/newsletter/broadcasts",
          lists: "/admin/newsletter/lists",
          segments: "/admin/newsletter/segments",
          templates: "/admin/newsletter/templates",
          analytics: "/admin/newsletter/analytics",
          settings: "/admin/newsletter/settings",
          contacts: "/admin/newsletter/contacts",
          companies: "/admin/newsletter/companies",
          stages: "/admin/newsletter/stages",
          points: "/admin/newsletter/points",
        };
        navigate(paths[requestedTab] || "/admin/newsletter", { replace: true, state: {} });
      }
    }
  }, [isDetail, requestedTab, navigate]);

  // Open/Click Rate for the list: one summary request for the broadcasts that
  // have sends, never one request per row.
  useEffect(() => {
    if (isDetail || activeTab !== "broadcasts") return undefined;
    const uuids = campaigns.filter((row) => broadcastHasSendData(row.status)).map((row) => row.uuid);
    if (!uuids.length) return undefined;

    const refresh = refreshListAnalytics.current;
    refreshListAnalytics.current = false;
    let active = true;
    setListAnalytics((current) => {
      const next = { ...current };
      uuids.forEach((uuid) => { next[uuid] = { loading: true }; });
      return next;
    });
    getNewsletterCampaignAnalyticsSummary(uuids, { refresh })
      .then((data) => {
        if (!active) return;
        const results = data?.results || {};
        setListAnalytics((current) => {
          const next = { ...current };
          uuids.forEach((uuid) => { next[uuid] = results[uuid] || { error: "unavailable" }; });
          return next;
        });
      })
      .catch(() => {
        if (!active) return;
        setListAnalytics((current) => {
          const next = { ...current };
          uuids.forEach((uuid) => { next[uuid] = { error: "unavailable" }; });
          return next;
        });
      });
    return () => { active = false; };
  }, [campaigns, listLoadCount, activeTab, isDetail]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Broadcast name is required.";
    if (!form.subject.trim()) errors.subject = "Subject is required.";
    if (!form.from_name.trim()) errors.from_name = "Sender name is required.";
    if (!form.from_email.trim()) errors.from_email = "Sender email is required.";
    else if (!emailPattern.test(form.from_email.trim())) errors.from_email = "Enter a valid sender email.";
    if (!form.html_content.trim()) errors.html_content = "HTML content is required.";
    if (!form.audience_slugs?.length) errors.audience_slugs = "Select at least one subscription list.";
    setFormErrors(errors);
    if (Object.keys(errors).length) setError("Complete the required newsletter fields before continuing.");
    return Object.keys(errors).length === 0;
  };

  const saveDraft = async () => {
    if (!validate()) return null;
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
      return await saveBroadcastDraft({
        isNew,
        campaignId,
        payload,
        createCampaign: createNewsletterCampaign,
        updateCampaign: updateNewsletterCampaign,
        syncCampaign: syncNewsletterCampaign,
        applySaved: (record) => {
          const nextForm = campaignToForm(record);
          setCampaign(record);
          setForm(nextForm);
          setSavedForm(nextForm);
        },
        onError: ({ stage, error }) => {
          setError(
            stage === SAVE_STAGE_SYNC
              ? `Draft saved in ECP, but Mautic sync failed: ${getErrorMessage(error, "Mautic sync failed.")}`
              : getErrorMessage(error, "We could not save this draft.")
          );
        },
        onNotify: ({ status }) => {
          const synced = status === SAVE_STATUS_SYNCED;
          setSnack({
            open: true,
            severity: synced ? "success" : "warning",
            message: synced
              ? "Draft saved and synced to Mautic."
              : "Draft saved, but Mautic sync failed.",
          });
        },
        onNavigate: (uuid) => navigate(`/admin/newsletter/${uuid}`, { replace: true }),
      });
    } finally {
      // Stays disabled for the whole local save + sync sequence.
      setSaving(false);
    }
  };

  const refreshCampaign = async () => {
    const data = await getNewsletterCampaign(campaignId);
    const nextForm = campaignToForm(data);
    setCampaign(data);
    setForm(nextForm);
    setSavedForm(nextForm);
    loadAnalytics(campaignId);
    return data;
  };

  const duplicateCampaign = async (uuid) => {
    // The ref blocks a second click before `duplicatingUuid` has re-rendered,
    // so one click can never create two copies.
    if (!uuid || duplicateInFlight.current) return;
    duplicateInFlight.current = true;
    setDuplicatingUuid(uuid);
    try {
      const data = await duplicateNewsletterCampaign(uuid);
      setSnack({ open: true, severity: "success", message: "Broadcast duplicated as a new draft." });
      navigate(`/admin/newsletter/${data.uuid}`);
    } catch (err) {
      // A snackbar, not the page error slot: on the list that slot replaces
      // the whole table, and the source broadcast is untouched either way.
      setSnack({
        open: true,
        severity: "error",
        message: err?.response
          ? getErrorMessage(err, "We could not duplicate this broadcast.")
          : "We could not reach the server. Check your connection and try again.",
      });
    } finally {
      duplicateInFlight.current = false;
      setDuplicatingUuid("");
    }
  };

  const openPreview = async () => {
    if (isNew || isDirty) return setError("Save your changes before previewing.");
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
    setTestState((state) => ({ ...state, loading: true, error: "" }));
    try {
      await sendNewsletterTestEmail(campaignId, email);
      setTestState({ open: false, loading: false, error: "" });
      setSnack({ open: true, severity: "success", message: "Test email sent." });
    } catch (err) {
      setTestState((state) => ({ ...state, loading: false, error: getErrorMessage(err, "We could not send the test email.") }));
    }
  };

  const scheduleCampaign = async (scheduledAt) => {
    if (isDirty) return setError("Save your changes before scheduling.");
    if (!validate()) return;
    setScheduleState((state) => ({ ...state, loading: true, error: "" }));
    try {
      const data = await scheduleNewsletterCampaign(campaignId, scheduledAt);
      const nextForm = campaignToForm(data);
      setCampaign(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setScheduleState({ open: false, loading: false, error: "" });
      setSnack({ open: true, severity: "success", message: "Broadcast scheduled." });
    } catch (err) {
      setScheduleState((state) => ({ ...state, loading: false, error: getErrorMessage(err, "We could not schedule this broadcast.") }));
    }
  };

  const sendNow = async () => {
    if (isDirty) return setError("Save your changes before sending.");
    if (!validate()) return;
    setConfirmState((state) => ({ ...state, loading: true }));
    try {
      await sendNewsletterCampaign(campaignId);
      setConfirmState({ type: "", loading: false });
      setSnack({ open: true, severity: "success", message: "Newsletter send accepted." });
      refreshCampaign();
    } catch (err) {
      setError(getErrorMessage(err, "We could not send this broadcast."));
      setConfirmState({ type: "", loading: false });
    }
  };

  const detailLoaded = isBroadcastDetailLoaded({ isNew, loading, campaign });
  const status = campaign ? String(campaign.status || "").toLowerCase() : "";
  const editable = detailLoaded && (isNew || status === "draft");
  const isDirty = editable && !isNew && JSON.stringify(form) !== JSON.stringify(savedForm);
  const canDelete = detailLoaded && !isNew && status === "draft";
  const { canSchedule, canCancel } = broadcastScheduleActions({
    detailLoaded,
    isNew,
    status,
    scheduleOwner: campaign?.schedule_owner,
    scheduledAt: campaign?.scheduled_at,
  });
  const canSendNow = detailLoaded && !isNew && status === "draft";

  // Shared by the list and the editor: Duplicate reports success or failure
  // from either one.
  const snackbar = (
    <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((state) => ({ ...state, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
      <Alert severity={snack.severity} onClose={() => setSnack((state) => ({ ...state, open: false }))}>{snack.message}</Alert>
    </Snackbar>
  );

  if (!isDetail) {
    return (
      <NewsletterShell>
        {isBuilderRoute ? (
          <AdminNewsletterMauticCampaignBuilderPage />
        ) : (
          <>
            {activeTab === "campaigns" && <AdminNewsletterMauticCampaignsPanel />}
            {activeTab === "broadcasts" && (
              <CampaignList
                campaigns={campaigns}
                analyticsByUuid={listAnalytics}
                loading={loading}
                error={error}
                filter={filter}
                onFilter={setFilter}
                onRefresh={() => { refreshListAnalytics.current = true; loadCampaigns(); }}
                onOpen={(uuid) => navigate(`/admin/newsletter/${uuid}`)}
                onDuplicate={duplicateCampaign}
                duplicatingUuid={duplicatingUuid}
                onCreate={() => navigate("/admin/newsletter/new")}
              />
            )}
            {activeTab === "lists" && <AdminNewsletterCategoriesTab />}
            {activeTab === "segments" && <AdminNewsletterNativeSegmentsPanel />}
            {activeTab === "templates" && <AdminNewsletterTemplatesPanel />}
            {activeTab === "settings" && <SettingsPage />}
          </>
        )}
        {snackbar}
      </NewsletterShell>
    );
  }

  return (
    <NewsletterShell>
      <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <IconButton onClick={() => navigate("/admin/newsletter/broadcasts")}><ArrowBackRoundedIcon /></IconButton>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>{isNew ? "Create Broadcast" : campaign?.name || "Email Broadcast"}</Typography>
              {!isNew && <StatusChip status={campaign?.status} />}
            </Stack>
            <Typography color="text.secondary">Build the email broadcast in four steps, then test, schedule, or send.</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {!isNew && <Button startIcon={<PreviewRoundedIcon />} onClick={openPreview} disabled={isDirty || confirmState.loading} sx={{ textTransform: "none" }}>Preview</Button>}
          {!isNew && <Button startIcon={duplicatingUuid ? <CircularProgress size={18} color="inherit" /> : <ContentCopyRoundedIcon />} onClick={() => duplicateCampaign(campaignId)} disabled={confirmState.loading || Boolean(duplicatingUuid)} sx={{ textTransform: "none" }}>{duplicatingUuid ? "Duplicating..." : "Duplicate"}</Button>}
          {!isNew && editable && <Button startIcon={<EmailRoundedIcon />} onClick={() => setTestState({ open: true, loading: false, error: "" })} disabled={isDirty || confirmState.loading} sx={{ textTransform: "none" }}>Send Test Email</Button>}
          {canSchedule && <Button startIcon={<ScheduleRoundedIcon />} onClick={() => setScheduleState({ open: true, loading: false, error: "" })} disabled={isDirty || confirmState.loading} sx={{ textTransform: "none" }}>{status === "scheduled" ? "Reschedule" : "Schedule"}</Button>}
          {canCancel && <Button color="warning" startIcon={<StopCircleRoundedIcon />} onClick={() => setConfirmState({ type: "cancel", loading: false })} disabled={confirmState.loading} sx={{ textTransform: "none" }}>Cancel</Button>}
          {canSendNow && <Button color="success" variant="contained" startIcon={<SendRoundedIcon />} onClick={() => setConfirmState({ type: "send", loading: false })} disabled={isDirty || confirmState.loading} sx={{ textTransform: "none" }}>Send Now</Button>}
          {editable && <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveDraft} disabled={saving || loading} sx={{ textTransform: "none" }}>{saving ? "Saving..." : "Save Draft"}</Button>}
          {canDelete && <Button color="error" startIcon={<DeleteRoundedIcon />} onClick={() => setConfirmState({ type: "delete", loading: false })} disabled={confirmState.loading} sx={{ textTransform: "none" }}>Delete</Button>}
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {isDirty && <Alert severity="info">Save your changes before previewing, testing, scheduling, or sending.</Alert>}
      {!isNew && detailLoaded && campaign?.last_error && <Alert severity="error">{campaign.last_error}</Alert>}

      {loading ? (
        <Stack spacing={2}>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rectangular" height={140} />)}</Stack>
      ) : detailLoaded ? (
        <CampaignForm
          value={form}
          categories={categories}
          readOnly={!editable}
          errors={formErrors}
          onChange={setForm}
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />
      ) : (
        <EmptyState title="Broadcast could not be loaded." action={<Button variant="contained" onClick={loadDetail}>Retry</Button>} />
      )}

      {detailLoaded && !isNew && (
        <BroadcastAnalyticsPanel status={status} analyticsState={analyticsState} onRefresh={() => loadAnalytics(campaignId)} />
      )}

      {detailLoaded && activeStep === 3 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>Broadcast Actions</Typography>
              <Typography color="text.secondary">
                {isNew
                  ? "Save the draft before testing, scheduling, or sending."
                  : editable
                    ? "Test, schedule, or send this draft broadcast."
                    : "This broadcast status is read-only for sending actions."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                startIcon={<EmailRoundedIcon />}
                onClick={() => setTestState({ open: true, loading: false, error: "" })}
                disabled={isNew || !editable || isDirty || confirmState.loading}
                sx={{ textTransform: "none" }}
              >
                Send Test Email
              </Button>
              <Button
                startIcon={<ScheduleRoundedIcon />}
                onClick={() => setScheduleState({ open: true, loading: false, error: "" })}
                disabled={isNew || !canSchedule || isDirty || confirmState.loading}
                sx={{ textTransform: "none" }}
              >
                {status === "scheduled" ? "Reschedule" : "Schedule"}
              </Button>
              <Button
                color="success"
                variant="contained"
                startIcon={<SendRoundedIcon />}
                onClick={() => setConfirmState({ type: "send", loading: false })}
                disabled={isNew || !canSendNow || isDirty || confirmState.loading}
                sx={{ textTransform: "none" }}
              >
                Send Now
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Stack direction="row" justifyContent="space-between">
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(0, step - 1))}>Back</Button>
        <Button variant="contained" onClick={() => setActiveStep((step) => Math.min(3, step + 1))} disabled={activeStep === 3}>Next</Button>
      </Stack>

      <PreviewDialog open={previewState.open} loading={previewState.loading} preview={previewState.data} error={previewState.error} onClose={() => setPreviewState({ open: false, loading: false, data: null, error: "" })} />
      <TestEmailDialog open={testState.open} loading={testState.loading} error={testState.error} onClose={() => setTestState({ open: false, loading: false, error: "" })} onSend={sendTest} />
      <ScheduleDialog open={scheduleState.open} loading={scheduleState.loading} error={scheduleState.error} initialValue={status === "scheduled" ? campaign?.scheduled_at : ""} onClose={() => setScheduleState({ open: false, loading: false, error: "" })} onSchedule={scheduleCampaign} />

      <ConfirmDialog open={confirmState.type === "send"} title="Send Broadcast Now?" confirmLabel="Send Now" confirmColor="success" loading={confirmState.loading} onClose={() => setConfirmState({ type: "", loading: false })} onConfirm={sendNow}>
        <Typography>This broadcast will be sent immediately to the selected subscription lists.</Typography>
      </ConfirmDialog>
      <ConfirmDialog open={confirmState.type === "cancel"} title="Cancel Scheduled Broadcast?" confirmLabel="Cancel Broadcast" confirmColor="warning" loading={confirmState.loading} onClose={() => setConfirmState({ type: "", loading: false })} onConfirm={async () => {
        setConfirmState((state) => ({ ...state, loading: true }));
        try {
          const data = await cancelNewsletterCampaign(campaignId);
          setCampaign(data);
          setConfirmState({ type: "", loading: false });
          setSnack({ open: true, severity: "success", message: "Scheduled broadcast cancelled." });
        } catch (err) {
          setError(getErrorMessage(err, "We could not cancel this broadcast."));
          setConfirmState({ type: "", loading: false });
        }
      }}>
        <Typography>The scheduled delivery will be cancelled.</Typography>
      </ConfirmDialog>
      <ConfirmDialog open={confirmState.type === "delete"} title="Delete Draft Broadcast?" confirmLabel="Delete" confirmColor="error" loading={confirmState.loading} onClose={() => setConfirmState({ type: "", loading: false })} onConfirm={async () => {
        setConfirmState((state) => ({ ...state, loading: true }));
        try {
          await deleteNewsletterCampaign(campaignId);
          navigate("/admin/newsletter/broadcasts", { replace: true });
        } catch (err) {
          setError(getErrorMessage(err, "We could not delete this draft."));
          setConfirmState({ type: "", loading: false });
        }
      }}>
        <Typography>This only removes draft broadcasts. Sent or scheduled broadcast history is left untouched.</Typography>
      </ConfirmDialog>

      {snackbar}
      </Stack>
    </NewsletterShell>
  );
}
