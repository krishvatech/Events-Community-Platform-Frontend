import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { listNewsletterForms } from "../services/newsletterService";
import {
  CARD_BORDER,
  FORM_NEW_PATH,
  FormStatusChip,
  NAVY,
  PAGE_SIZE,
  formDetailsPath,
  formEditPath,
  formatDateTime,
  getErrorMessage,
  postActionLabel,
} from "./newsletterFormShared.jsx";

// Counts and after-submit give way on narrow screens; the Details page has them all.
const wideOnly = { display: { xs: "none", md: "table-cell" } };
// Phones keep name, status and actions in view.
const notPhone = { display: { xs: "none", sm: "table-cell" } };

const COLUMNS = [
  { id: "name", label: "Form Name" },
  { id: "status", label: "Status" },
  { id: "fields", label: "Fields", sx: wideOnly },
  { id: "actions-count", label: "Submit Actions", sx: wideOnly },
  { id: "after", label: "After Submit", sx: wideOnly },
  { id: "updated", label: "Last Updated", sx: notPhone },
  { id: "row-actions", label: "Actions", align: "right" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
];

const emptyPage = (page = 1) => ({ count: 0, page, page_size: PAGE_SIZE, num_pages: 0, results: [] });

export default function AdminNewsletterFormsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(emptyPage());
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  // `refresh` asks the backend to bypass its list cache (Refresh button).
  const loadForms = useCallback(
    async ({ nextPage = page, nextSearch = search, nextStatus = statusFilter, refresh = false } = {}) => {
      setLoading(true);
      setError("");
      try {
        const response = await listNewsletterForms({
          page: nextPage,
          page_size: PAGE_SIZE,
          ...(nextSearch ? { search: nextSearch } : {}),
          ...(nextStatus !== "all" ? { status: nextStatus } : {}),
          ...(refresh ? { refresh: 1 } : {}),
        });
        setData({
          count: Number(response?.count || 0),
          page: Number(response?.page || nextPage),
          page_size: Number(response?.page_size || PAGE_SIZE),
          num_pages: Number(response?.num_pages || 0),
          results: Array.isArray(response?.results) ? response.results : [],
        });
      } catch (err) {
        setData(emptyPage(nextPage));
        setError(getErrorMessage(err, "We could not load Mautic Forms."));
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter]
  );

  useEffect(() => {
    loadForms({ nextPage: page, nextSearch: search, nextStatus: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  // Feedback carried over from another Forms page.
  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack({ open: true, severity: "success", message: flash });
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (page !== 1) setPage(1);
    setSearch(nextSearch);
    if (page === 1 && nextSearch === search) loadForms({ nextPage: 1, nextSearch });
  };

  const changeStatus = (value) => {
    setPage(1);
    setStatusFilter(value);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const rows = Array.isArray(data.results) ? data.results : [];
  const filtered = Boolean(search) || statusFilter !== "all";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Forms</Typography>
          <Typography color="text.secondary">
            Native Mautic Forms that capture contacts. Manage their settings and publication here.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh from Mautic">
            <span>
              <IconButton aria-label="Refresh from Mautic" onClick={() => loadForms({ refresh: true })} disabled={loading}>
                <RefreshRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={FORM_NEW_PATH} sx={{ textTransform: "none" }}>
            Create Form
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth for Forms. Fields and submit actions are shown read-only;
        new Forms start unpublished.
      </Alert>

      <Paper component="form" onSubmit={submitSearch} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Search Forms"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Form name"
            fullWidth
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(event) => changeStatus(event.target.value)}
            sx={{ minWidth: { sm: 180 } }}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="outlined" startIcon={<SearchRoundedIcon />} disabled={loading} sx={{ textTransform: "none", minWidth: 112 }}>
            Search
          </Button>
          {filtered && (
            <Button onClick={clearFilters} disabled={loading} sx={{ textTransform: "none" }}>
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => loadForms()}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {!loading && !error && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ fontWeight: 850, color: NAVY }}>
              {filtered ? "No Forms match these filters." : "No Forms yet."}
            </Typography>
            <Typography color="text.secondary">
              {filtered
                ? "Try another search or clear the current filters."
                : "Create the first Form. It is stored directly in Mautic and starts unpublished."}
            </Typography>
            {!filtered && (
              <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={FORM_NEW_PATH} sx={{ textTransform: "none" }}>
                Create Form
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        !error && (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
            <TableContainer>
              <Table aria-label="Forms" sx={{ minWidth: { xs: 0, md: 860 } }}>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" } }}>
                    {COLUMNS.map((column) => (
                      <TableCell key={column.id} align={column.align || "left"} sx={column.sx}>{column.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {COLUMNS.map((column) => (
                            <TableCell key={column.id} sx={column.sx}><Skeleton height={24} /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : rows.map((form) => {
                        const name = form.name || `Form #${form.id}`;
                        return (
                          <TableRow
                            key={form.id}
                            hover
                            data-form-id={form.id}
                            onClick={() => navigate(formDetailsPath(form.id))}
                            sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                          >
                            <TableCell sx={{ maxWidth: 320 }}>
                              <Link
                                component={RouterLink}
                                to={formDetailsPath(form.id)}
                                onClick={(event) => event.stopPropagation()}
                                underline="hover"
                                sx={{ fontWeight: 800, color: NAVY, wordBreak: "break-word" }}
                              >
                                {name}
                              </Link>
                              {form.description && (
                                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                                  {form.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell><FormStatusChip published={form.isPublished} /></TableCell>
                            <TableCell sx={wideOnly}>{form.fieldCount ?? 0}</TableCell>
                            <TableCell sx={wideOnly}>{form.actionCount ?? 0}</TableCell>
                            <TableCell sx={{ ...wideOnly, whiteSpace: "nowrap" }}>{postActionLabel(form.postAction)}</TableCell>
                            <TableCell sx={{ ...notPhone, whiteSpace: "nowrap" }}>{formatDateTime(form.dateModified || form.dateAdded)}</TableCell>
                            {/* Clicks here never open the row. */}
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                              <Tooltip title="View details">
                                <IconButton aria-label={`View ${name}`} size="small" onClick={() => navigate(formDetailsPath(form.id))}>
                                  <VisibilityRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit settings">
                                <IconButton aria-label={`Edit ${name}`} size="small" onClick={() => navigate(formEditPath(form.id))}>
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
            {data.count > 0 && (
              <TablePagination
                component="div"
                count={data.count}
                page={Math.max(0, page - 1)}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
                onPageChange={(_, nextPage) => {
                  if (!loading) setPage(nextPage + 1);
                }}
              />
            )}
          </Paper>
        )
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
