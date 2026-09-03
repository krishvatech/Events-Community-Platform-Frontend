import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import Tabs from "@mui/material/Tabs";
import { useNavigate } from "react-router-dom";

import { listNewsletterAudiences } from "../services/newsletterService";

const TYPE_LABELS = {
  static: "Static",
  dynamic: "Dynamic",
};

const STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const STATUS_COLORS = {
  draft: "default",
  active: "success",
  archived: "default",
};

const marketingTabs = [
  { value: "dashboard", label: "Dashboard", icon: <InsightsRoundedIcon fontSize="small" /> },
  { value: "campaigns", label: "Campaigns", icon: <EmailRoundedIcon fontSize="small" /> },
  { value: "audiences", label: "Audiences", icon: <GroupsRoundedIcon fontSize="small" /> },
  { value: "templates", label: "Templates", icon: <ViewModuleRoundedIcon fontSize="small" /> },
  { value: "analytics", label: "Analytics", icon: <AnalyticsRoundedIcon fontSize="small" /> },
  { value: "settings", label: "Settings", icon: <SettingsRoundedIcon fontSize="small" /> },
];

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

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat().format(number);
};

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

function AudienceStatusChip({ status }) {
  const normalized = String(status || "draft").toLowerCase();
  return (
    <Chip
      size="small"
      label={STATUS_LABELS[normalized] || normalized}
      color={STATUS_COLORS[normalized] || "default"}
      variant={normalized === "active" ? "filled" : "outlined"}
      sx={{ fontWeight: 700 }}
    />
  );
}

function NewsletterAdminTabs({ onChange }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
      <Tabs
        value="audiences"
        onChange={(_, value) => onChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 52,
          px: { xs: 1, md: 2 },
          "& .MuiTab-root": { gap: 1, minHeight: 52, textTransform: "none", fontWeight: 750 },
          "& .Mui-selected": { color: "#0f766e !important" },
          "& .MuiTabs-indicator": { backgroundColor: "#0f766e", height: 3 },
        }}
      >
        {marketingTabs.map((tab) => (
          <Tab key={tab.value} icon={tab.icon} iconPosition="start" label={tab.label} value={tab.value} />
        ))}
      </Tabs>
    </Paper>
  );
}

export default function AdminNewsletterAudiencesPage() {
  const navigate = useNavigate();
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAudiences = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterAudiences();
      setAudiences(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, "We could not load newsletter audiences."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudiences();
  }, []);

  const rows = useMemo(() => audiences || [], [audiences]);

  const handleTabChange = (tab) => {
    if (tab === "audiences") return;
    navigate("/admin/newsletter", { state: { newsletterTab: tab } });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>
          Newsletter
        </Typography>
        <Typography color="text.secondary">
          Manage campaigns, audiences, templates, and performance from ECP.
        </Typography>
      </Box>

      <NewsletterAdminTabs onChange={handleTabChange} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>Audiences</Typography>
          <Typography color="text.secondary">Create advanced audience segments for future targeting.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/admin/newsletter/audiences/new")} sx={{ textTransform: "none" }}>
          Create Audience
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#F0EEEB", overflow: "hidden" }}>
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: "1px solid #F0EEEB", display: "flex", justifyContent: "flex-end" }}>
          <Button startIcon={<RefreshRoundedIcon />} onClick={loadAudiences} disabled={loading} sx={{ textTransform: "none" }}>
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>
            <Stack spacing={1}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={46} />)}</Stack>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadAudiences}>Retry</Button>}>{error}</Alert>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">No audience segments found.</Alert>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Subscriber Count</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow hover key={row.uuid} sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/newsletter/audiences/${row.uuid}`)}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>{row.name || "Untitled audience"}</Typography>
                      <Typography variant="body2" color="text.secondary">{TYPE_LABELS[row.audience_type] || row.audience_type || "Static"}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                        {row.description || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatNumber(row.estimated_count)}</TableCell>
                    <TableCell><AudienceStatusChip status={row.status} /></TableCell>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open audience">
                        <IconButton onClick={(e) => { e.stopPropagation(); navigate(`/admin/newsletter/audiences/${row.uuid}`); }}>
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
