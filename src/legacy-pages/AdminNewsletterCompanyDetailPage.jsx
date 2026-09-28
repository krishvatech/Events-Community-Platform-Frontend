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
  Grid,
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
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate, useParams } from "react-router-dom";

import MauticDynamicFields from "../components/marketing/MauticDynamicFields.jsx";
import {
  addNewsletterCompanyContact,
  deleteNewsletterCompany,
  getNewsletterCompany,
  listNewsletterAdminContacts,
  listNewsletterCompanyContacts,
  listNewsletterFields,
  removeNewsletterCompanyContact,
  updateNewsletterCompany,
} from "../services/newsletterService";

const asArray = (value) => (Array.isArray(value) ? value : []);

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
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

const formatDateTime = (value) => {
  if (!value) return "—";
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

/** Editable block of Mautic company fields that submits only what changed. */
function CompanyFieldEditor({ companyId, fields, values, onSaved, emptyMessage, title }) {
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEdits({});
    setError("");
  }, [companyId, values]);

  const merged = useMemo(() => ({ ...values, ...edits }), [values, edits]);
  const isDirty = Object.keys(edits).length > 0;

  const handleChange = (alias, value) => {
    setEdits((current) => {
      const next = { ...current, [alias]: value };
      // Dropping a field back to its stored value keeps it out of the PATCH payload.
      const stored = values?.[alias] ?? "";
      if (String(stored) === String(value)) delete next[alias];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateNewsletterCompany(companyId, edits);
      setEdits({});
      onSaved(updated, Object.keys(edits).length);
    } catch (err) {
      setError(getErrorMessage(err, "Mautic rejected the company update."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <MauticDynamicFields
        title={title}
        fields={fields}
        values={merged}
        onChange={handleChange}
        disabled={saving}
        emptyMessage={emptyMessage}
      />
      {fields.length ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
          {isDirty ? (
            <Typography variant="body2" color="text.secondary">
              {`${Object.keys(edits).length} field${Object.keys(edits).length === 1 ? "" : "s"} changed`}
            </Typography>
          ) : null}
          <Button
            onClick={() => setEdits({})}
            disabled={!isDirty || saving}
            sx={{ textTransform: "none" }}
          >
            Discard
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!isDirty || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
          >
            Save to Mautic
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

function AddContactDialog({ open, companyId, onClose, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [open]);

  const runSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterAdminContacts({ search: query.trim(), page_size: 10 });
      setResults(asArray(data?.results));
    } catch (err) {
      setError(getErrorMessage(err, "Could not search Mautic contacts."));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (contact) => {
    setSaving(true);
    setError("");
    try {
      await addNewsletterCompanyContact(companyId, contact.mautic_contact_id);
      onAdded(contact);
    } catch (err) {
      setError(getErrorMessage(err, "Mautic rejected the association."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 850 }}>Add Contact to Company</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Search contacts by name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
            />
            <Button variant="outlined" onClick={runSearch} disabled={loading} sx={{ textTransform: "none" }}>
              Search
            </Button>
          </Stack>
          {loading ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} variant="rounded" height={44} />
              ))}
            </Stack>
          ) : results.length ? (
            <Stack spacing={1}>
              {results.map((contact) => (
                <Paper
                  key={contact.mautic_contact_id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, borderColor: "#E7ECEF" }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }} noWrap>
                        {contact.name || contact.email || `Contact ${contact.mautic_contact_id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {contact.email}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={saving}
                      onClick={() => handleAdd(contact)}
                      sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
                    >
                      Add
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" variant="body2">
              Search for a Mautic contact to associate with this company.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterCompanyDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [contacts, setContacts] = useState(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [contactsPage, setContactsPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [detail, metadata] = await Promise.all([
        getNewsletterCompany(companyId),
        listNewsletterFields("company", { published_only: true }),
      ]);
      setCompany(detail);
      setFields(asArray(metadata?.results));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this company from Mautic."));
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError("");
    try {
      const data = await listNewsletterCompanyContacts(companyId, {
        page: contactsPage,
        page_size: 25,
      });
      setContacts(data);
    } catch (err) {
      setContactsError(getErrorMessage(err, "Could not load contacts for this company."));
      setContacts(null);
    } finally {
      setContactsLoading(false);
    }
  }, [companyId, contactsPage]);

  useEffect(() => {
    if (tab === "contacts") loadContacts();
  }, [tab, loadContacts]);

  const coreFields = useMemo(() => fields.filter((field) => field.group === "core"), [fields]);
  const otherFields = useMemo(() => fields.filter((field) => field.group !== "core"), [fields]);

  const handleSaved = (updated, changedCount) => {
    setCompany(updated);
    setSnackbar({
      open: true,
      message: `${changedCount} field${changedCount === 1 ? "" : "s"} saved to Mautic.`,
      severity: "success",
    });
  };

  const handleRemoveContact = async () => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await removeNewsletterCompanyContact(companyId, removeTarget.mautic_contact_id);
      setSnackbar({ open: true, message: "Contact removed from company.", severity: "success" });
      setRemoveTarget(null);
      loadContacts();
    } catch (err) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err, "Mautic rejected the change."),
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCompany = async () => {
    setBusy(true);
    try {
      await deleteNewsletterCompany(companyId);
      navigate("/admin/newsletter/companies");
    } catch (err) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err, "Mautic refused to delete this company."),
        severity: "error",
      });
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={220} />
      </Stack>
    );
  }

  if (error || !company) {
    return (
      <Stack spacing={2}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/admin/newsletter/companies")}
          sx={{ textTransform: "none", alignSelf: "flex-start" }}
        >
          Back to Companies
        </Button>
        <Alert severity="error">{error || "Company not found."}</Alert>
      </Stack>
    );
  }

  const companyContacts = asArray(contacts?.results);
  const contactPages = Math.max(1, Number(contacts?.num_pages || 1));

  return (
    <Stack spacing={3}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate("/admin/newsletter/companies")}
        sx={{ textTransform: "none", alignSelf: "flex-start" }}
      >
        Back to Companies
      </Button>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              bgcolor: "#E6F4F1",
              display: "grid",
              placeItems: "center",
            }}
          >
            <ApartmentRoundedIcon sx={{ color: "#0f766e" }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
              {company.name || `Company ${company.id}`}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip size="small" label={`Mautic ID ${company.id}`} variant="outlined" />
              {company.industry ? <Chip size="small" label={company.industry} variant="outlined" /> : null}
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadCompany}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            color="error"
            startIcon={<DeleteRoundedIcon />}
            onClick={() => setDeleteOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            px: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 750 },
            "& .Mui-selected": { color: "#0f766e !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#0f766e" },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Contacts" value="contacts" />
          <Tab label="Custom Fields" value="fields" />
        </Tabs>
      </Paper>

      {tab === "overview" ? (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 3 }}>
            <Typography sx={{ fontWeight: 800, color: "#1B2A4A", mb: 2 }}>Mautic Metadata</Typography>
            <Grid container spacing={2}>
              {[
                ["Mautic ID", company.id],
                ["Score", company.score],
                ["Created", formatDateTime(company.date_added)],
                ["Modified", formatDateTime(company.date_modified)],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} md={3} key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>
                    {formatValue(value)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 3 }}>
            <CompanyFieldEditor
              companyId={companyId}
              title="Company Details"
              fields={coreFields}
              values={company.values}
              onSaved={handleSaved}
              emptyMessage="Mautic has no core company fields published."
            />
          </Paper>
        </Stack>
      ) : null}

      {tab === "fields" ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 3 }}>
          <CompanyFieldEditor
            companyId={companyId}
            title="Custom & Professional Fields"
            fields={otherFields}
            values={company.values}
            onSaved={handleSaved}
            emptyMessage="No additional company fields are defined in Mautic. Add one in Settings → Custom Fields."
          />
        </Paper>
      ) : null}

      {tab === "contacts" ? (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
              Associated Contacts
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<RefreshRoundedIcon />}
                onClick={loadContacts}
                disabled={contactsLoading}
                sx={{ textTransform: "none" }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setAddOpen(true)}
                sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
              >
                Add Contact
              </Button>
            </Stack>
          </Stack>

          {contactsError ? <Alert severity="error">{contactsError}</Alert> : null}

          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                    <TableCell>Contact</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contactsLoading ? (
                    [0, 1, 2].map((key) => (
                      <TableRow key={key}>
                        <TableCell colSpan={5}>
                          <Skeleton variant="text" height={32} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !companyContacts.length ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
                          <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>
                            No contacts associated yet
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            Use “Add Contact” to associate a Mautic contact with this company.
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    companyContacts.map((contact) => (
                      <TableRow key={contact.mautic_contact_id} hover>
                        <TableCell>
                          <Typography
                            sx={{ fontWeight: 700, color: "#0f766e", cursor: "pointer" }}
                            onClick={() =>
                              navigate(`/admin/newsletter/contacts/${contact.mautic_contact_id}`)
                            }
                          >
                            {contact.name || `Contact ${contact.mautic_contact_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatValue(contact.email)}</TableCell>
                        <TableCell>
                          {contact.stage?.name ? (
                            <Chip size="small" label={contact.stage.name} variant="outlined" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{formatValue(contact.points)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove from company">
                            <IconButton size="small" onClick={() => setRemoveTarget(contact)}>
                              <LinkOffRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {companyContacts.length ? (
              <>
                <Divider />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ px: 2, py: 1.5 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {`${Number(contacts?.count || 0)} associated contact(s)`}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      disabled={contactsPage <= 1 || contactsLoading}
                      onClick={() => setContactsPage((current) => Math.max(1, current - 1))}
                      sx={{ textTransform: "none" }}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2">{`Page ${contactsPage} of ${contactPages}`}</Typography>
                    <Button
                      size="small"
                      disabled={contactsPage >= contactPages || contactsLoading}
                      onClick={() => setContactsPage((current) => current + 1)}
                      sx={{ textTransform: "none" }}
                    >
                      Next
                    </Button>
                  </Stack>
                </Stack>
              </>
            ) : null}
          </Paper>
        </Stack>
      ) : null}

      <AddContactDialog
        open={addOpen}
        companyId={companyId}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAddOpen(false);
          setSnackbar({ open: true, message: "Contact associated in Mautic.", severity: "success" });
          loadContacts();
        }}
      />

      <Dialog open={Boolean(removeTarget)} onClose={busy ? undefined : () => setRemoveTarget(null)}>
        <DialogTitle sx={{ fontWeight: 850 }}>Remove Contact from Company?</DialogTitle>
        <DialogContent>
          <Typography>
            The contact stays in Mautic; only the association with this company is removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRemoveTarget(null)} disabled={busy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRemoveContact}
            disabled={busy}
            sx={{ textTransform: "none" }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={busy ? undefined : () => setDeleteOpen(false)}>
        <DialogTitle sx={{ fontWeight: 850 }}>Delete Company?</DialogTitle>
        <DialogContent>
          <Typography>
            {`"${company.name || company.id}" will be deleted in Mautic. Associated contacts are not deleted.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={busy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCompany}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DeleteRoundedIcon />}
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
