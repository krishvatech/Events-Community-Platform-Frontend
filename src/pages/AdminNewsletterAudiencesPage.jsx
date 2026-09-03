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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
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

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <IconButton onClick={() => navigate("/admin/newsletter")}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 0.75 }}>Newsletter Audiences</Typography>
            <Typography color="text.secondary">Create and manage ECP-owned newsletter audiences.</Typography>
          </Box>
        </Stack>
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
            <Alert severity="info" variant="outlined">No newsletter audiences found.</Alert>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Audience Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Estimated Count</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow hover key={row.uuid} sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/newsletter/audiences/${row.uuid}`)}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>{row.name || "Untitled audience"}</Typography>
                      {row.description && <Typography variant="body2" color="text.secondary">{row.description}</Typography>}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[row.audience_type] || row.audience_type || "-"}</TableCell>
                    <TableCell><AudienceStatusChip status={row.status} /></TableCell>
                    <TableCell>{formatNumber(row.estimated_count)}</TableCell>
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
