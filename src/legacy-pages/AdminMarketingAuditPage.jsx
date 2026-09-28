import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

import { getMarketingAudit } from "../services/newsletterService";

const PAGE_SIZE = 25;

const filterFieldSx = {
  flex: "1 1 160px",
  minWidth: { xs: "100%", sm: 150 },
};

const compactFilterFieldSx = {
  flex: "0 1 145px",
  minWidth: { xs: "100%", sm: 135 },
};

const searchFilterFieldSx = {
  flex: "2 1 260px",
  minWidth: { xs: "100%", md: 240 },
};

const actionFilterFieldSx = {
  flex: "2 1 320px",
  minWidth: { xs: "100%", md: 260 },
};

const ACTION_LABELS = {
  "campaign.create": "Create campaign",
  "campaign.update": "Update campaign",
  "campaign.delete": "Delete campaign",
  "campaign.event.delete": "Delete campaign event",
  "segment.create": "Create segment",
  "segment.update": "Update segment",
  "segment.delete": "Delete segment",
  "segment.contact.add": "Add contact to segment",
  "segment.contact.remove": "Remove contact from segment",
  "contact.create": "Create contact",
  "contact.update": "Update contact",
  "contact.tag.add": "Add contact tag",
  "contact.tag.remove": "Remove contact tag",
  "contact.note.create": "Create contact note",
  "contact.dnc.add": "Add communication restriction",
  "contact.dnc.remove": "Remove communication restriction",
  "company.create": "Create company",
  "company.update": "Update company",
  "company.delete": "Delete company",
  "company.contact.add": "Add contact to company",
  "company.contact.remove": "Remove contact from company",
  "template.create": "Create template",
  "template.update": "Update template",
  "template.delete": "Delete template",
  "template.duplicate": "Duplicate template",
  "stage.create": "Create stage",
  "stage.update": "Update stage",
  "stage.delete": "Delete stage",
  "stage.contact.add": "Move contact to stage",
  "stage.contact.remove": "Clear contact stage",
  "point.action.create": "Create point action",
  "point.action.update": "Update point action",
  "point.action.delete": "Delete point action",
  "point.group.create": "Create point group",
  "point.group.update": "Update point group",
  "point.group.delete": "Delete point group",
  "point.contact.adjust": "Adjust contact points",
  "point.contact_group.adjust": "Adjust contact group points",
  "point.trigger.create": "Create point trigger",
  "point.trigger.update": "Update point trigger",
  "point.trigger.delete": "Delete point trigger",
  "tag.create": "Create tag",
  "tag.update": "Update tag",
  "tag.delete": "Delete tag",
  "field.create": "Create field",
  "field.update": "Update field",
  "field.delete": "Delete field",
  "newsletter.test_send": "Send newsletter test",
  "connection.create": "Create Marketing connection",
  "connection.activate": "Activate Marketing connection",
  "connection.deactivate": "Deactivate Marketing connection",
};

const statusMeta = {
  succeeded: { label: "Succeeded", color: "success", icon: <VerifiedRoundedIcon fontSize="small" /> },
  denied: { label: "Denied", color: "warning", icon: <SecurityRoundedIcon fontSize="small" /> },
  failed: { label: "Failed", color: "error", icon: <ErrorOutlineRoundedIcon fontSize="small" /> },
};

const modeMeta = {
  asserted_user: { label: "Asserted User", color: "primary" },
  service_account: { label: "Service Account", color: "default" },
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const humanizeAction = (action) =>
  ACTION_LABELS[action] ||
  String(action || "Unknown operation")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const compact = (value, size = 14) => {
  if (!value) return "—";
  const text = String(value);
  return text.length > size ? `${text.slice(0, size)}…` : text;
};

const getErrorMessage = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Couldn't load Marketing activity.";
  if (typeof data === "string") return data;
  return data.detail || data.error || "Couldn't load Marketing activity.";
};

function SummaryCard({ label, value, loading }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", height: "100%" }}>
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        {loading ? <Skeleton width="60%" height={34} /> : (
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
            {Number(value || 0).toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }) {
  const meta = statusMeta[status] || { label: status || "Unknown", color: "default", icon: <InfoOutlinedIcon fontSize="small" /> };
  return <Chip size="small" color={meta.color} icon={meta.icon} label={meta.label} sx={{ fontWeight: 700 }} />;
}

function ModeChip({ mode }) {
  const meta = modeMeta[mode] || { label: mode || "—", color: "default" };
  return <Chip size="small" color={meta.color} variant={mode === "service_account" ? "outlined" : "filled"} label={meta.label} sx={{ fontWeight: 700 }} />;
}

function DetailLine({ label, value, copy }) {
  const display = value || "—";
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={{ wordBreak: "break-word", flex: 1 }}>{display}</Typography>
        {copy && value ? (
          <Tooltip title="Copy">
            <IconButton size="small" onClick={() => navigator.clipboard?.writeText(String(value))}>
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Stack>
  );
}

export default function AdminMarketingAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [draftSearch, setDraftSearch] = React.useState(searchParams.get("search") || "");

  const params = React.useMemo(() => {
    const values = Object.fromEntries(searchParams.entries());
    return {
      page: values.page || 1,
      page_size: PAGE_SIZE,
      date_from: values.date_from || undefined,
      date_to: values.date_to || undefined,
      ecp_user_id: values.ecp_user_id || undefined,
      mautic_user_id: values.mautic_user_id || undefined,
      domain: values.domain || undefined,
      action: values.action || undefined,
      auth_mode: values.auth_mode || undefined,
      status: values.status || undefined,
      search: values.search || undefined,
    };
  }, [searchParams]);

  const setParam = React.useCallback((key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const fetchAudit = React.useCallback(() => {
    setLoading(true);
    setError("");
    getMarketingAudit(params)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params]);

  React.useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  React.useEffect(() => {
    setDraftSearch(searchParams.get("search") || "");
  }, [searchParams]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if ((searchParams.get("search") || "") !== draftSearch) {
        setParam("search", draftSearch.trim());
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [draftSearch, searchParams, setParam]);

  const rows = data?.results || [];
  const summary = data?.summary || {};
  const domains = data?.filters?.domains || [];
  const actions = data?.filters?.actions || [];
  const page = Number(data?.page || params.page || 1);

  const quick = (key) => {
    if (key === "all") {
      const next = new URLSearchParams(searchParams);
      ["status", "auth_mode", "page"].forEach((name) => next.delete(name));
      setSearchParams(next);
      return;
    }
    if (key === "denied" || key === "failed") setParam("status", key);
    if (key === "asserted") setParam("auth_mode", "asserted_user");
    if (key === "service") setParam("auth_mode", "service_account");
  };

  const table = (
    <TableContainer sx={{ border: "1px solid #E7ECEF", borderRadius: 2, bgcolor: "#fff" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "#F8FAFC" }}>
            <TableCell>Time</TableCell>
            <TableCell>ECP Actor</TableCell>
            <TableCell>Mautic Identity</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Mode</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? Array.from({ length: 6 }).map((_, idx) => (
            <TableRow key={idx}><TableCell colSpan={6}><Skeleton height={36} /></TableCell></TableRow>
          )) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>No Marketing activity found.</Typography>
              </TableCell>
            </TableRow>
          ) : rows.map((row) => (
            <TableRow key={row.id} hover onClick={() => setSelected(row)} sx={{ cursor: "pointer" }}>
              <TableCell>{formatDateTime(row.created_at)}</TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.ecp_user?.label || "System"}</Typography>
                <Typography variant="caption" color="text.secondary">ECP #{row.ecp_user?.id || "—"}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {row.mautic_user?.username || (row.mautic_user?.id ? `Mautic #${row.mautic_user.id}` : "—")}
                </Typography>
                {row.mautic_user?.id ? <Typography variant="caption" color="text.secondary">Mautic #{row.mautic_user.id}</Typography> : null}
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{humanizeAction(row.action)}</Typography>
                <Typography variant="caption" color="text.secondary">{row.action}</Typography>
              </TableCell>
              <TableCell><ModeChip mode={row.auth_mode} /></TableCell>
              <TableCell><StatusChip status={row.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const cards = (
    <Stack spacing={1.5}>
      {rows.length === 0 && !loading ? (
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
          <Typography variant="body2" color="text.secondary">No Marketing activity found.</Typography>
          <Typography variant="caption" color="text.secondary">Try changing the date range or removing some filters.</Typography>
        </Card>
      ) : rows.map((row) => (
        <Card key={row.id} variant="outlined" onClick={() => setSelected(row)} sx={{ borderRadius: 2, borderColor: "#E7ECEF", cursor: "pointer" }}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{humanizeAction(row.action)}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDateTime(row.created_at)}</Typography>
                </Box>
                <StatusChip status={row.status} />
              </Stack>
              <Typography variant="body2">ECP: {row.ecp_user?.label || "System"} · #{row.ecp_user?.id || "—"}</Typography>
              <Typography variant="body2">Mautic: {row.mautic_user?.id ? `#${row.mautic_user.id}` : "—"}</Typography>
              <ModeChip mode={row.auth_mode} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Marketing Audit & Activity</Typography>
          <Typography color="text.secondary">Review Marketing actions, execution identity, permissions, and failures.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={fetchAudit} disabled={loading}>Refresh</Button>
      </Stack>

      {error ? <Alert severity="error" action={<Button onClick={fetchAudit}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><SummaryCard label="Actions" value={summary.actions} loading={loading && !data} /></Grid>
        <Grid item xs={6} md={3}><SummaryCard label="Succeeded" value={summary.succeeded} loading={loading && !data} /></Grid>
        <Grid item xs={6} md={3}><SummaryCard label="Denied" value={summary.denied} loading={loading && !data} /></Grid>
        <Grid item xs={6} md={3}><SummaryCard label="Failed" value={summary.failed} loading={loading && !data} /></Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-start" }}>
            <Box sx={compactFilterFieldSx}><TextField fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={searchParams.get("date_from") || ""} onChange={(e) => setParam("date_from", e.target.value)} /></Box>
            <Box sx={compactFilterFieldSx}><TextField fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={searchParams.get("date_to") || ""} onChange={(e) => setParam("date_to", e.target.value)} /></Box>
            <Box sx={{ ...filterFieldSx, flexBasis: 170 }}><TextField fullWidth size="small" label="Actor ID" value={searchParams.get("ecp_user_id") || ""} onChange={(e) => setParam("ecp_user_id", e.target.value)} /></Box>
            <Box sx={filterFieldSx}>
              <FormControl fullWidth size="small"><InputLabel>Domain</InputLabel><Select label="Domain" value={searchParams.get("domain") || ""} onChange={(e) => setParam("domain", e.target.value)}>
                <MenuItem value="">All</MenuItem>{domains.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </Select></FormControl>
            </Box>
            <Box sx={{ ...filterFieldSx, flexBasis: 180 }}>
              <FormControl fullWidth size="small"><InputLabel>Mode</InputLabel><Select label="Mode" value={searchParams.get("auth_mode") || ""} onChange={(e) => setParam("auth_mode", e.target.value)}>
                <MenuItem value="">All</MenuItem><MenuItem value="asserted_user">Asserted User</MenuItem><MenuItem value="service_account">Service Account</MenuItem>
              </Select></FormControl>
            </Box>
            <Box sx={filterFieldSx}>
              <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select label="Status" value={searchParams.get("status") || ""} onChange={(e) => setParam("status", e.target.value)}>
                <MenuItem value="">All</MenuItem><MenuItem value="succeeded">Succeeded</MenuItem><MenuItem value="denied">Denied</MenuItem><MenuItem value="failed">Failed</MenuItem>
              </Select></FormControl>
            </Box>
            <Box sx={searchFilterFieldSx}><TextField fullWidth size="small" label="Search" value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} placeholder="Actor, ID, correlation ID, JTI" /></Box>
            <Box sx={actionFilterFieldSx}>
              <FormControl fullWidth size="small"><InputLabel>Action</InputLabel><Select label="Action" value={searchParams.get("action") || ""} onChange={(e) => setParam("action", e.target.value)}>
                <MenuItem value="">All</MenuItem>{actions.map((action) => <MenuItem key={action} value={action}>{action}</MenuItem>)}
              </Select></FormControl>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            {[
              ["all", "All"],
              ["denied", "Denied"],
              ["failed", "Failed"],
              ["asserted", "Asserted"],
              ["service", "Service Account"],
            ].map(([key, label]) => <Button key={key} size="small" variant="outlined" onClick={() => quick(key)}>{label}</Button>)}
          </Stack>
        </CardContent>
      </Card>

      {isMobile ? cards : table}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {rows.length ? ((page - 1) * PAGE_SIZE) + 1 : 0}-{((page - 1) * PAGE_SIZE) + rows.length} of {data?.count || 0}
        </Typography>
        <Pagination count={data?.num_pages || 1} page={page} onChange={(_, value) => setParam("page", String(value))} />
      </Stack>

      <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)} PaperProps={{ sx: { width: { xs: "100%", sm: 460 }, p: 3 } }}>
        {selected ? (
          <Stack spacing={2.25}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>Activity Details</Typography>
              <Typography variant="body2" color="text.secondary">{formatDateTime(selected.created_at)}</Typography>
            </Box>
            <Stack direction="row" spacing={1}><StatusChip status={selected.status} /><ModeChip mode={selected.auth_mode} /></Stack>
            <Divider />
            <DetailLine label="Operation" value={`${humanizeAction(selected.action)} (${selected.action})`} />
            <DetailLine label="Domain" value={selected.domain} />
            <DetailLine label="ECP user" value={`${selected.ecp_user?.label || "System"} · ECP #${selected.ecp_user?.id || "—"}`} />
            <DetailLine label="ECP email" value={selected.ecp_user?.email} />
            <DetailLine label="Mautic user" value={selected.mautic_user?.id ? `Mautic #${selected.mautic_user.id}` : ""} />
            <DetailLine label="Resource" value={selected.resource_id ? `${selected.resource || "resource"} #${selected.resource_id}` : selected.resource} />
            <Divider />
            <DetailLine label="Correlation ID" value={selected.correlation_id} copy />
            <DetailLine label="Assertion JTI" value={selected.assertion_jti} copy />
            <Divider />
            <DetailLine label="Error code" value={selected.error_code} />
            <DetailLine label="Safe detail" value={selected.error_detail} />
            <Typography variant="caption" color="text.secondary">IDs are informational only. This page cannot retry, replay, edit, or delete audit records.</Typography>
          </Stack>
        ) : null}
      </Drawer>
    </Box>
  );
}
