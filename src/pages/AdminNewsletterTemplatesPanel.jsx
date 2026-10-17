import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
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
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { listNewsletterTemplates } from "../services/newsletterService";
import {
  CARD_BORDER,
  NAVY,
  PAGE_SIZE,
  TEMPLATE_NEW_PATH,
  TemplateDeleteDialog,
  TemplateStatusChip,
  formatDateTime,
  getErrorMessage,
  templateDetailsPath,
  templateEditPath,
  templateTestSendBlocker,
  useTemplateDuplicate,
} from "./newsletterTemplateShared.jsx";

// Kept for existing importers; the rule itself lives with the Test Send panel.
export { templateTestSendBlocker };

// Category, Theme and Sender give way on narrow screens; the Details page has them all.
const wideOnly = { display: { xs: "none", md: "table-cell" } };

const COLUMNS = [
  { id: "name", label: "Template Name" },
  { id: "subject", label: "Subject" },
  { id: "status", label: "Status" },
  { id: "category", label: "Category", sx: wideOnly },
  { id: "theme", label: "Theme", sx: wideOnly },
  { id: "sender", label: "Sender", sx: wideOnly },
  { id: "updated", label: "Last Updated" },
  { id: "actions", label: "Actions", align: "right" },
];

function TemplateActionsMenu({ template, duplicating, onView, onEdit, onPreview, onDuplicate, onTestSend, onDelete }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const run = (action) => () => {
    close();
    action(template);
  };
  const blocker = templateTestSendBlocker(template);
  const label = template.name || `Template #${template.id}`;

  return (
    <>
      <Tooltip title="Edit">
        <IconButton aria-label={`Edit ${label}`} onClick={() => onEdit(template)} size="small">
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="More actions">
        <IconButton aria-label={`More actions for ${label}`} onClick={(event) => setAnchor(event.currentTarget)} size="small">
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={run(onView)}>
          <ListItemIcon><VisibilityRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onEdit)}>
          <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onPreview)}>
          <ListItemIcon><PreviewRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Preview</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onDuplicate)} disabled={duplicating}>
          <ListItemIcon><ContentCopyRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{duplicating ? "Duplicating..." : "Duplicate"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onTestSend)} disabled={Boolean(blocker)}>
          <ListItemIcon><EmailRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Test Send" secondary={blocker || null} />
        </MenuItem>
        <MenuItem onClick={run(onDelete)} sx={{ color: "error.main" }}>
          <ListItemIcon><DeleteRoundedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default function AdminNewsletterTemplatesPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState({ count: 0, page: 1, page_size: PAGE_SIZE, num_pages: 0, results: [] });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const { duplicate, duplicatingId } = useTemplateDuplicate({
    onError: (message) => setSnack({ open: true, severity: "error", message }),
  });

  // `refresh` asks the backend to bypass its list cache (Refresh button).
  const loadTemplates = useCallback(
    async ({ nextPage = page, nextSearch = search, refresh = false } = {}) => {
      setLoading(true);
      setError("");
      try {
        const response = await listNewsletterTemplates({
          page: nextPage,
          page_size: PAGE_SIZE,
          ...(nextSearch ? { search: nextSearch } : {}),
          ...(refresh ? { refresh: 1 } : {}),
        });
        const normalized = {
          count: Number(response?.count || 0),
          page: Number(response?.page || nextPage),
          page_size: Number(response?.page_size || PAGE_SIZE),
          num_pages: Number(response?.num_pages || 0),
          results: Array.isArray(response?.results) ? response.results : [],
        };
        setData(normalized);
        setPage(normalized.page || 1);
      } catch (err) {
        setData({ count: 0, page: nextPage, page_size: PAGE_SIZE, num_pages: 0, results: [] });
        setError(getErrorMessage(err, "We could not load Mautic Newsletter Templates."));
      } finally {
        setLoading(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    loadTemplates({ nextPage: page, nextSearch: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Feedback carried over from a Details page (e.g. after a delete).
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
    if (page === 1 && nextSearch === search) loadTemplates({ nextPage: 1, nextSearch });
  };

  const openDetails = (template) => navigate(templateDetailsPath(template.id));
  const openEdit = (template) => navigate(templateEditPath(template.id));
  const openPreview = (template) => navigate(`${templateDetailsPath(template.id)}#preview`);
  const openTestSend = (template) => navigate(`${templateDetailsPath(template.id)}?testSend=1`);
  const duplicateTemplate = async (template) => {
    const copy = await duplicate(template);
    if (copy?.id) {
      navigate(templateDetailsPath(copy.id), {
        state: { flash: copy.designCopied ? "Template duplicated as a draft, with its visual design." : "Template duplicated as a draft." },
      });
    }
  };

  const rows = Array.isArray(data.results) ? data.results : [];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Newsletter Templates</Typography>
          <Typography color="text.secondary">
            Create and manage reusable Mautic email Templates without leaving IMAA Connect.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh from Mautic">
            <span>
              <IconButton aria-label="Refresh from Mautic" onClick={() => loadTemplates({ nextPage: page, nextSearch: search, refresh: true })} disabled={loading}>
                <RefreshRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={TEMPLATE_NEW_PATH} sx={{ textTransform: "none" }}>
            Create Template
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth. Only reusable Mautic emails with
        <strong> emailType=template</strong> are shown here; newsletter campaign delivery
        emails are excluded.
      </Alert>

      <Paper component="form" onSubmit={submitSearch} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Search Templates"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name or subject"
            fullWidth
          />
          <Button type="submit" variant="outlined" startIcon={<SearchRoundedIcon />} disabled={loading} sx={{ textTransform: "none", minWidth: 112 }}>
            Search
          </Button>
          {search && (
            <Button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              disabled={loading}
              sx={{ textTransform: "none" }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => loadTemplates({ nextPage: page, nextSearch: search })}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {!loading && !error && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ fontWeight: 850, color: NAVY }}>
              {search ? "No Templates match this search." : "No Newsletter Templates yet."}
            </Typography>
            <Typography color="text.secondary">
              {search
                ? "Try another search or clear the current filter."
                : "Create the first reusable email Template. It will be stored directly in Mautic."}
            </Typography>
            {!search && (
              <Button variant="contained" startIcon={<AddRoundedIcon />} component={RouterLink} to={TEMPLATE_NEW_PATH} sx={{ textTransform: "none" }}>
                Create Template
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        !error && (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
            <TableContainer>
              <Table aria-label="Newsletter Templates" sx={{ minWidth: { xs: 560, md: 900 } }}>
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
                    : rows.map((template) => {
                        const name = template.name || `Template #${template.id}`;
                        return (
                          <TableRow
                            key={template.id}
                            hover
                            data-template-id={template.id}
                            onClick={() => openDetails(template)}
                            sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                          >
                            <TableCell sx={{ maxWidth: 280 }}>
                              <Link
                                component={RouterLink}
                                to={templateDetailsPath(template.id)}
                                onClick={(event) => event.stopPropagation()}
                                underline="hover"
                                sx={{ fontWeight: 800, color: NAVY, wordBreak: "break-word" }}
                              >
                                {name}
                              </Link>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 280, wordBreak: "break-word" }}>
                              {template.subject || <Typography component="span" variant="body2" color="text.secondary">No subject</Typography>}
                            </TableCell>
                            <TableCell><TemplateStatusChip published={template.isPublished} /></TableCell>
                            <TableCell sx={wideOnly}>{template.category?.title || "Uncategorized"}</TableCell>
                            <TableCell sx={wideOnly}>{template.template || "Custom HTML"}</TableCell>
                            <TableCell sx={{ ...wideOnly, wordBreak: "break-word" }}>{template.fromName || "-"}</TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(template.dateModified || template.dateAdded)}</TableCell>
                            {/* Clicks here never open the row. */}
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }} onClick={(event) => event.stopPropagation()}>
                              <TemplateActionsMenu
                                template={template}
                                duplicating={duplicatingId === String(template.id)}
                                onView={openDetails}
                                onEdit={openEdit}
                                onPreview={openPreview}
                                onDuplicate={duplicateTemplate}
                                onTestSend={openTestSend}
                                onDelete={setDeleteTarget}
                              />
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

      <TemplateDeleteDialog
        template={deleteTarget}
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onDeleted={async () => {
          setDeleteTarget(null);
          setSnack({ open: true, severity: "success", message: "Template deleted from Mautic." });
          const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
          if (nextPage !== page) setPage(nextPage);
          else await loadTemplates({ nextPage, nextSearch: search });
        }}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
