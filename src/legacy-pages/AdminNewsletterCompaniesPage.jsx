import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SegmentRoundedIcon from "@mui/icons-material/SegmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate } from "react-router-dom";

import MauticDynamicFields from "../components/marketing/MauticDynamicFields.jsx";
import {
  createNewsletterCompany,
  deleteNewsletterCompany,
  listNewsletterCompanies,
  listNewsletterFields,
} from "../services/newsletterService";

const COMPANY_NAME_ALIAS = "companyname";

const asArray = (value) => (Array.isArray(value) ? value : []);

export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  return fallback;
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

/** Create dialog driven entirely by the live Mautic company field definitions. */
export function CompanyCreateDialog({ open, onClose, onCreated }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setError("");
    setValues({});
    setLoadingFields(true);
    listNewsletterFields("company", { published_only: true })
      .then((data) => {
        if (active) setFields(asArray(data?.results));
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Could not load Mautic company fields."));
      })
      .finally(() => {
        if (active) setLoadingFields(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const grouped = useMemo(() => {
    const groups = new Map();
    fields.forEach((field) => {
      const key = field.group || "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(field);
    });
    return Array.from(groups.entries());
  }, [fields]);

  const handleChange = (alias, value) =>
    setValues((current) => ({ ...current, [alias]: value }));

  const handleSubmit = async () => {
    if (!String(values[COMPANY_NAME_ALIAS] || "").trim()) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Only fields the admin actually filled in are sent.
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== "" && value !== undefined)
      );
      const created = await createNewsletterCompany(payload);
      onCreated(created);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create the company in Mautic."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 850 }}>Create Company</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="info" variant="outlined">
            This creates a company in Mautic only. No ECP account or organization is created.
          </Alert>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {loadingFields ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} variant="rounded" height={48} />
              ))}
            </Stack>
          ) : (
            grouped.map(([group, groupFields]) => (
              <Box key={group}>
                <MauticDynamicFields
                  title={group.charAt(0).toUpperCase() + group.slice(1)}
                  fields={groupFields}
                  values={values}
                  onChange={handleChange}
                  disabled={saving}
                />
              </Box>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || loadingFields}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
          sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
        >
          Create Company
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterCompaniesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const pageSize = 25;

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listNewsletterCompanies({ page, page_size: pageSize, search });
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load companies from Mautic."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNewsletterCompany(deleteTarget.id);
      setSnackbar({ open: true, message: "Company deleted in Mautic.", severity: "success" });
      setDeleteTarget(null);
      loadCompanies();
    } catch (err) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err, "Mautic refused to delete this company."),
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const companies = asArray(data?.results);
  const numPages = Math.max(1, Number(data?.num_pages || 1));

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.5 }}>
            Companies
          </Typography>
          <Typography color="text.secondary">
            Native Mautic companies. Mautic remains the source of truth for every value shown here.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadCompanies}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
          >
            Create Company
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search companies by name, email, or city"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1);
                setSearch(searchInput.trim());
              }
            }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setPage(1);
              setSearch(searchInput.trim());
            }}
            sx={{ textTransform: "none" }}
          >
            Search
          </Button>
          {search ? (
            <Button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              sx={{ textTransform: "none" }}
            >
              Clear
            </Button>
          ) : null}
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                <TableCell>Company</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Industry</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [0, 1, 2, 3, 4].map((key) => (
                  <TableRow key={key}>
                    <TableCell colSpan={7}>
                      <Skeleton variant="text" height={32} />
                    </TableCell>
                  </TableRow>
                ))
              ) : !companies.length ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Stack spacing={1} alignItems="center" sx={{ py: 5 }}>
                      <ApartmentRoundedIcon sx={{ fontSize: 40, color: "#94A3B8" }} />
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>
                        {search ? "No companies match that search" : "No companies in Mautic yet"}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {search
                          ? "Try a different search term."
                          : "Create your first company to start associating contacts."}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow
                    key={company.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/admin/newsletter/companies/${company.id}`)}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 750, color: "#1B2A4A" }}>
                        {formatValue(company.name)}
                      </Typography>
                      {company.website ? (
                        <Typography variant="caption" color="text.secondary">
                          {company.website}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatValue(company.email)}</TableCell>
                    <TableCell>{formatValue(company.phone)}</TableCell>
                    <TableCell>{formatValue(company.city)}</TableCell>
                    <TableCell>{formatValue(company.country)}</TableCell>
                    <TableCell>
                      {company.industry ? (
                        <Chip size="small" label={company.industry} variant="outlined" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="Delete company in Mautic">
                        <IconButton size="small" onClick={() => setDeleteTarget(company)}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {companies.length ? (
          <>
            <Divider />
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 2, py: 1.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                {`${Number(data?.count || 0)} compan${Number(data?.count) === 1 ? "y" : "ies"} in Mautic`}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  sx={{ textTransform: "none" }}
                >
                  Previous
                </Button>
                <Typography variant="body2">{`Page ${page} of ${numPages}`}</Typography>
                <Button
                  size="small"
                  disabled={page >= numPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                  sx={{ textTransform: "none" }}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </>
        ) : null}
      </Paper>

      <CompanyCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          setSnackbar({ open: true, message: "Company created in Mautic.", severity: "success" });
          navigate(`/admin/newsletter/companies/${created.id}`);
        }}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={deleting ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 850 }}>Delete Company?</DialogTitle>
        <DialogContent>
          <Typography>
            {`"${deleteTarget?.name || ""}" will be deleted in Mautic. Contacts are not deleted, but their association with this company is removed.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteRoundedIcon />}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
