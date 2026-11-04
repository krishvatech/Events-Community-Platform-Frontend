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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { listNewsletterDynamicContents } from "../services/newsletterService";
import {
  CARD_BORDER,
  DYNAMIC_CONTENT_NEW_PATH,
  DynamicContentDeleteDialog,
  NAVY,
  PAGE_SIZE,
  PublishStatusChip,
  dynamicContentEditPath,
  dynamicContentPath,
  formatDateTime,
  getErrorMessage,
  modeLabel,
} from "./newsletterDynamicContentShared.jsx";

const wideOnly = { display: { xs: "none", md: "table-cell" } };
const notPhone = { display: { xs: "none", sm: "table-cell" } };

const COLUMNS = [
  { id: "name", label: "Dynamic Content" },
  { id: "status", label: "Status" },
  { id: "shown", label: "Shown", sx: notPhone, align: "right" },
  { id: "contacts", label: "Contacts", sx: wideOnly, align: "right" },
  { id: "updated", label: "Last Updated", sx: wideOnly },
  { id: "row-actions", label: "Actions", align: "right" },
];

const emptyPage = (page = 1) => ({ count: 0, page, num_pages: 0, results: [] });
const count = (value) => Number(value || 0).toLocaleString();

export default function AdminNewsletterDynamicContentListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(emptyPage());
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [snack, setSnack] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listNewsletterDynamicContents({
        page,
        page_size: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(modeFilter !== "all" ? { mode: modeFilter } : {}),
      });
      setData({
        count: Number(response?.count || 0),
        page: Number(response?.page || page),
        num_pages: Number(response?.num_pages || 0),
        results: Array.isArray(response?.results) ? response.results : [],
      });
    } catch (err) {
      setData(emptyPage(page));
      setError(getErrorMessage(err, "We could not load Dynamic Content from Mautic."));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, modeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack(flash);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const rows = data.results;
  const filtered = Boolean(search) || statusFilter !== "all" || modeFilter !== "all";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Dynamic Content</Typography>
          <Typography color="text.secondary">
            Page blocks that change per visitor: show members one banner and new visitors another, or let a campaign decide.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh from Mautic">
            <span><IconButton aria-label="Refresh from Mautic" onClick={load} disabled={loading}><RefreshRoundedIcon /></IconButton></span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={DYNAMIC_CONTENT_NEW_PATH} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            New Dynamic Content
          </Button>
        </Stack>
      </Stack>

      <Paper
        component="form"
        onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField size="small" label="Search Dynamic Content" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or slot" fullWidth />
          <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} sx={{ minWidth: { sm: 160 } }}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="unpublished">Unpublished</MenuItem>
          </TextField>
          <TextField select size="small" label="Shown" value={modeFilter} onChange={(event) => { setPage(1); setModeFilter(event.target.value); }} sx={{ minWidth: { sm: 190 } }}>
            <MenuItem value="all">By rules or campaign</MenuItem>
            <MenuItem value="rules">By rules</MenuItem>
            <MenuItem value="campaign">By a campaign</MenuItem>
          </TextField>
          <Button type="submit" variant="outlined" startIcon={<SearchRoundedIcon />} disabled={loading} sx={{ textTransform: "none", minWidth: 112 }}>Search</Button>
          {filtered && (
            <Button onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter("all"); setModeFilter("all"); setPage(1); }} sx={{ textTransform: "none" }}>Clear</Button>
          )}
        </Stack>
      </Paper>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {!loading && !error && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ fontWeight: 850, color: NAVY }}>{filtered ? "No Dynamic Content matches these filters." : "No Dynamic Content yet."}</Typography>
            <Typography color="text.secondary">
              {filtered ? "Try another search or clear the filters." : "Create one, then place its slot on a landing page or website. New items start unpublished."}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        !error && (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
            <TableContainer>
              <Table aria-label="Dynamic Content" sx={{ minWidth: { xs: 0, md: 820 } }}>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" } }}>
                    {COLUMNS.map((column) => <TableCell key={column.id} align={column.align || "left"} sx={column.sx}>{column.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {COLUMNS.map((column) => <TableCell key={column.id} sx={column.sx}><Skeleton height={24} /></TableCell>)}
                        </TableRow>
                      ))
                    : rows.map((item) => {
                        const name = item.name || `Dynamic Content #${item.id}`;
                        return (
                          <TableRow key={item.id} hover onClick={() => navigate(dynamicContentPath(item.id))} sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}>
                            <TableCell sx={{ maxWidth: 360 }}>
                              <Link component={RouterLink} to={dynamicContentPath(item.id)} onClick={(event) => event.stopPropagation()} underline="hover"
                                sx={{ fontWeight: 800, color: NAVY, wordBreak: "break-word" }}>
                                {name}
                              </Link>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 340 }}>
                                {item.isCampaignBased ? modeLabel(item) : `${modeLabel(item)} · slot ${item.slotName}`}
                              </Typography>
                            </TableCell>
                            <TableCell><PublishStatusChip focus={item} /></TableCell>
                            <TableCell align="right" sx={notPhone}>{count(item.stats?.shown)}</TableCell>
                            <TableCell align="right" sx={wideOnly}>{count(item.stats?.contacts)}</TableCell>
                            <TableCell sx={{ ...wideOnly, whiteSpace: "nowrap" }}>{formatDateTime(item.dateModified || item.dateAdded)}</TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                              <Tooltip title="Edit">
                                <IconButton aria-label={`Edit ${name}`} size="small" onClick={() => navigate(dynamicContentEditPath(item.id))}><EditRoundedIcon fontSize="small" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton aria-label={`Delete ${name}`} size="small" color="error" onClick={() => setDeleting(item)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
            {data.count > PAGE_SIZE && (
              <TablePagination component="div" count={data.count} page={Math.max(0, page - 1)} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]}
                onPageChange={(_, next) => { if (!loading) setPage(next + 1); }} />
            )}
          </Paper>
        )
      )}

      <DynamicContentDeleteDialog item={deleting} open={Boolean(deleting)} onClose={() => setDeleting(null)}
        onDeleted={(_, message) => { setDeleting(null); setSnack(message); if (rows.length === 1 && page > 1) setPage(page - 1); else load(); }} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
