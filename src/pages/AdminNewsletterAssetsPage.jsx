import React, { useCallback, useEffect, useState } from "react";
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
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { listNewsletterAssets } from "../services/newsletterService";
import {
  ASSET_NEW_PATH,
  AssetDeleteDialog,
  AssetStatusChip,
  CARD_BORDER,
  NAVY,
  PAGE_SIZE,
  assetEditPath,
  assetPath,
  formatBytes,
  formatDateTime,
  getErrorMessage,
} from "./newsletterAssetShared.jsx";

const wideOnly = { display: { xs: "none", md: "table-cell" } };
const notPhone = { display: { xs: "none", sm: "table-cell" } };

const COLUMNS = [
  { id: "title", label: "Asset" },
  { id: "status", label: "Status" },
  { id: "type", label: "Type", sx: notPhone },
  { id: "size", label: "Size", sx: wideOnly },
  { id: "downloads", label: "Downloads", sx: notPhone, align: "right" },
  { id: "updated", label: "Last Updated", sx: wideOnly },
  { id: "row-actions", label: "Actions", align: "right" },
];

const emptyPage = (page = 1) => ({ count: 0, page, num_pages: 0, results: [] });

export default function AdminNewsletterAssetsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(emptyPage());
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [snack, setSnack] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listNewsletterAssets({
        page,
        page_size: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setData({
        count: Number(response?.count || 0),
        page: Number(response?.page || page),
        num_pages: Number(response?.num_pages || 0),
        results: Array.isArray(response?.results) ? response.results : [],
      });
    } catch (err) {
      setData(emptyPage(page));
      setError(getErrorMessage(err, "We could not load Mautic assets."));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

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
  const filtered = Boolean(search) || statusFilter !== "all";

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Assets</Typography>
          <Typography color="text.secondary">
            Files contacts can download (guides, brochures, reports). Link them in emails and landing pages; every download is tracked.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh from Mautic">
            <span><IconButton aria-label="Refresh from Mautic" onClick={load} disabled={loading}><RefreshRoundedIcon /></IconButton></span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={ASSET_NEW_PATH} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            Add Asset
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
          <TextField size="small" label="Search assets" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Title" fullWidth />
          <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} sx={{ minWidth: { sm: 180 } }}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="unpublished">Unpublished</MenuItem>
          </TextField>
          <Button type="submit" variant="outlined" startIcon={<SearchRoundedIcon />} disabled={loading} sx={{ textTransform: "none", minWidth: 112 }}>Search</Button>
          {filtered && (
            <Button onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter("all"); setPage(1); }} sx={{ textTransform: "none" }}>Clear</Button>
          )}
        </Stack>
      </Paper>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {!loading && !error && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ fontWeight: 850, color: NAVY }}>{filtered ? "No assets match these filters." : "No assets yet."}</Typography>
            <Typography color="text.secondary">
              {filtered ? "Try another search or clear the filters." : "Upload a file or link to one hosted elsewhere. New assets start unpublished."}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        !error && (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
            <TableContainer>
              <Table aria-label="Assets" sx={{ minWidth: { xs: 0, md: 860 } }}>
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
                    : rows.map((asset) => {
                        const name = asset.title || `Asset #${asset.id}`;
                        return (
                          <TableRow key={asset.id} hover onClick={() => navigate(assetPath(asset.id))} sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}>
                            <TableCell sx={{ maxWidth: 340 }}>
                              <Link component={RouterLink} to={assetPath(asset.id)} onClick={(event) => event.stopPropagation()} underline="hover"
                                sx={{ fontWeight: 800, color: NAVY, wordBreak: "break-word" }}>
                                {name}
                              </Link>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                                {asset.storageLocation === "remote" ? asset.remotePath : asset.originalFileName}
                              </Typography>
                            </TableCell>
                            <TableCell><AssetStatusChip published={asset.isPublished} /></TableCell>
                            <TableCell sx={notPhone}>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Chip size="small" variant="outlined" label={(asset.extension || "file").toUpperCase()} />
                                {asset.storageLocation === "remote" && <Tooltip title="Linked, not stored in Mautic"><LinkRoundedIcon fontSize="small" color="action" /></Tooltip>}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ ...wideOnly, whiteSpace: "nowrap" }}>{formatBytes(asset.size)}</TableCell>
                            <TableCell align="right" sx={{ ...notPhone, whiteSpace: "nowrap" }}>
                              {Number(asset.downloadCount || 0).toLocaleString()}
                              <Typography component="span" variant="caption" color="text.secondary">{` (${Number(asset.uniqueDownloadCount || 0).toLocaleString()} unique)`}</Typography>
                            </TableCell>
                            <TableCell sx={{ ...wideOnly, whiteSpace: "nowrap" }}>{formatDateTime(asset.dateModified || asset.dateAdded)}</TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                              <Tooltip title="Edit">
                                <IconButton aria-label={`Edit ${name}`} size="small" onClick={() => navigate(assetEditPath(asset.id))}><EditRoundedIcon fontSize="small" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton aria-label={`Delete ${name}`} size="small" color="error" onClick={() => setDeleting(asset)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
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

      <AssetDeleteDialog asset={deleting} open={Boolean(deleting)} onClose={() => setDeleting(null)}
        onDeleted={(_, message) => { setDeleting(null); setSnack(message); if (rows.length === 1 && page > 1) setPage(page - 1); else load(); }} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
