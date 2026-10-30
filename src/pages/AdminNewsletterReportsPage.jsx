import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ScheduleSendRoundedIcon from "@mui/icons-material/ScheduleSendRounded";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { listNewsletterReports } from "../services/newsletterService";
import {
  CARD_BORDER,
  NAVY,
  REPORT_NEW_PATH,
  ReportDeleteDialog,
  formatDateTime,
  getErrorMessage,
  reportEditPath,
  reportPath,
  scheduleSummary,
} from "./newsletterReportShared.jsx";

const PAGE_SIZE = 25;
const wideOnly = { display: { xs: "none", md: "table-cell" } };
const notPhone = { display: { xs: "none", sm: "table-cell" } };

const COLUMNS = [
  { id: "name", label: "Report" },
  { id: "source", label: "Data Source", sx: notPhone },
  { id: "schedule", label: "Email Schedule", sx: wideOnly },
  { id: "owner", label: "Created By", sx: wideOnly },
  { id: "updated", label: "Last Updated", sx: wideOnly },
  { id: "row-actions", label: "Actions", align: "right" },
];

export default function AdminNewsletterReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listNewsletterReports();
      setReports(Array.isArray(response?.results) ? response.results : []);
    } catch (err) {
      setReports([]);
      setError(getErrorMessage(err, "We could not load Mautic reports."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Feedback carried over from another Reports page.
  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack({ open: true, severity: "success", message: flash });
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const sources = useMemo(() => {
    const seen = new Map();
    reports.forEach((report) => seen.set(report.source, report.sourceLabel || report.source));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [reports]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => (
      (source === "all" || report.source === source) &&
      (!term || `${report.name} ${report.description}`.toLowerCase().includes(term))
    ));
  }, [reports, search, source]);

  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const isFiltered = Boolean(search.trim()) || source !== "all";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Reports</Typography>
          <Typography color="text.secondary">
            Mautic reports: pick a data source, its columns, filters and graphs, then view, export or email the results.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh from Mautic">
            <span>
              <IconButton aria-label="Refresh from Mautic" onClick={load} disabled={loading}>
                <RefreshRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={REPORT_NEW_PATH} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            Create Report
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Search reports"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Report name"
            fullWidth
          />
          <TextField
            select
            size="small"
            label="Data source"
            value={source}
            onChange={(event) => { setSource(event.target.value); setPage(0); }}
            sx={{ minWidth: { sm: 220 } }}
          >
            <MenuItem value="all">All data sources</MenuItem>
            {sources.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          {isFiltered && (
            <Button onClick={() => { setSearch(""); setSource("all"); setPage(0); }} sx={{ textTransform: "none" }}>Clear</Button>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>
      )}

      {!loading && !error && filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ fontWeight: 850, color: NAVY }}>{isFiltered ? "No reports match these filters." : "No reports yet."}</Typography>
            <Typography color="text.secondary">
              {isFiltered ? "Try another search or clear the filters." : "Create the first report. It is stored in Mautic."}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        !error && (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
            <TableContainer>
              <Table aria-label="Reports" sx={{ minWidth: { xs: 0, md: 860 } }}>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" } }}>
                    {COLUMNS.map((column) => (
                      <TableCell key={column.id} align={column.align || "left"} sx={column.sx}>{column.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {COLUMNS.map((column) => <TableCell key={column.id} sx={column.sx}><Skeleton height={24} /></TableCell>)}
                        </TableRow>
                      ))
                    : rows.map((report) => {
                        const name = report.name || `Report #${report.id}`;
                        return (
                          <TableRow
                            key={report.id}
                            hover
                            onClick={() => navigate(reportPath(report.id))}
                            sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                          >
                            <TableCell sx={{ maxWidth: 340 }}>
                              <Link
                                component={RouterLink}
                                to={reportPath(report.id)}
                                onClick={(event) => event.stopPropagation()}
                                underline="hover"
                                sx={{ fontWeight: 800, color: NAVY, wordBreak: "break-word" }}
                              >
                                {name}
                              </Link>
                              <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                                {!report.isPublished && <Chip size="small" label="Unpublished" />}
                                {report.system && <Chip size="small" variant="outlined" label="Shared with all Mautic users" />}
                              </Stack>
                            </TableCell>
                            <TableCell sx={notPhone}>
                              <Typography variant="body2">{report.sourceLabel || report.source}</Typography>
                              {report.sourceGroup && <Typography variant="caption" color="text.secondary">{report.sourceGroup}</Typography>}
                            </TableCell>
                            <TableCell sx={{ ...wideOnly, whiteSpace: "nowrap" }}>
                              {report.isScheduled ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <ScheduleSendRoundedIcon fontSize="small" color="primary" />
                                  <span>Scheduled</span>
                                </Stack>
                              ) : scheduleSummary(report)}
                            </TableCell>
                            <TableCell sx={wideOnly}>{report.createdByUser || "—"}</TableCell>
                            <TableCell sx={{ ...wideOnly, whiteSpace: "nowrap" }}>{formatDateTime(report.dateModified || report.dateAdded)}</TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                              <Tooltip title="Edit">
                                <IconButton aria-label={`Edit ${name}`} size="small" onClick={() => navigate(reportEditPath(report.id))}>
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton aria-label={`Delete ${name}`} size="small" color="error" onClick={() => setDeleting(report)}>
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
            {filtered.length > PAGE_SIZE && (
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
                onPageChange={(_, next) => setPage(next)}
              />
            )}
          </Paper>
        )
      )}

      <ReportDeleteDialog
        report={deleting}
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onDeleted={(_, message) => {
          setDeleting(null);
          setSnack({ open: true, severity: "success", message });
          load();
        }}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
