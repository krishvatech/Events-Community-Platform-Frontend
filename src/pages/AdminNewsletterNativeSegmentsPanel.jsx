import React, { useEffect, useMemo, useState } from "react";
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
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import {
  addNativeMauticSegmentContact,
  createNativeMauticSegment,
  deleteNativeMauticSegment,
  getNativeMauticSegment,
  listNewsletterAdminContacts,
  listNativeMauticSegmentContacts,
  listNativeMauticSegments,
  removeNativeMauticSegmentContact,
  updateNativeMauticSegment,
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

const formatDateTime = (value) => {
  if (!value) return "-";
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

const formatCount = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat().format(number);
};

function ManagementChip({ segment }) {
  if (segment?.managed_by_subscription_list || segment?.mapped_in_ecp) {
    return (
      <Chip
        size="small"
        color="warning"
        label="Managed by Subscription List"
        sx={{ fontWeight: 800 }}
      />
    );
  }
  return <Chip size="small" variant="outlined" label="Native Mautic" />;
}

function PublishedChip({ value }) {
  return (
    <Chip
      size="small"
      color={value ? "success" : "default"}
      variant={value ? "filled" : "outlined"}
      label={value ? "Published" : "Unpublished"}
      sx={{ fontWeight: 800 }}
    />
  );
}

function SegmentTypeChip({ segment }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={segment?.is_dynamic ? "Dynamic" : "Static"}
    />
  );
}

function DetailField({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#E7ECEF", height: "100%" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, color: "#1B2A4A", overflowWrap: "anywhere" }}>
        {value || "-"}
      </Typography>
    </Paper>
  );
}

function SegmentContactsPanel({
  segment,
  contactsState,
  contactSearch,
  onContactSearch,
  onRefresh,
  onAddOpen,
  onRemoveOpen,
}) {
  const contacts = asArray(contactsState.data?.results);
  const canMutate = segment && !segment.managed_by_subscription_list && !segment.mapped_in_ecp && !segment.is_dynamic;

  return (
    <Stack spacing={2}>
      {segment?.managed_by_subscription_list && (
        <Alert severity="warning" variant="outlined">
          Membership is managed through ECP newsletter consent.
        </Alert>
      )}
      {segment?.is_dynamic && !segment?.managed_by_subscription_list && (
        <Alert severity="info" variant="outlined">
          This is a dynamic segment. Membership is controlled by Mautic filters.
        </Alert>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
        <TextField
          label="Search contacts"
          size="small"
          value={contactSearch}
          onChange={(event) => onContactSearch(event.target.value)}
          sx={{ minWidth: { sm: 280 } }}
        />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshRoundedIcon />} onClick={onRefresh} disabled={contactsState.loading}>
            Refresh
          </Button>
          {canMutate && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAddOpen}>
              Add Contact
            </Button>
          )}
        </Stack>
      </Stack>
      {contactsState.loading ? (
        <Stack spacing={1}>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={42} />)}</Stack>
      ) : contactsState.error ? (
        <Alert severity="error">{contactsState.error}</Alert>
      ) : contacts.length === 0 ? (
        <Alert severity="info" variant="outlined">No contacts were returned for this segment.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                <TableCell>Contact</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Points</TableCell>
                <TableCell>Modified</TableCell>
                {canMutate && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{contact.name || `${contact.firstname || ""} ${contact.lastname || ""}`.trim() || `Contact #${contact.id}`}</TableCell>
                  <TableCell>{contact.email || "-"}</TableCell>
                  <TableCell>{contact.stage?.name || "-"}</TableCell>
                  <TableCell>{contact.points ?? "-"}</TableCell>
                  <TableCell>{formatDateTime(contact.dateModified)}</TableCell>
                  {canMutate && (
                    <TableCell align="right">
                      <Button color="error" size="small" onClick={() => onRemoveOpen(contact)}>
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}

function SegmentDetailDialog({
  open,
  segment,
  loading,
  error,
  activeTab,
  onTabChange,
  contactsState,
  contactSearch,
  onContactSearch,
  onRefreshContacts,
  onAddContactOpen,
  onRemoveContactOpen,
  onClose,
}) {
  const filters = asArray(segment?.filters);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Segment Details</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack spacing={1.5}>
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton variant="rectangular" height={220} />
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack spacing={2.5}>
            {segment?.managed_by_subscription_list && (
              <Alert severity="warning" icon={<InfoOutlinedIcon />}>
                This Mautic segment is managed by the ECP Subscription List "{segment.subscription_list_name}". Edit subscription-list settings from Subscription Lists to avoid breaking consent synchronization.
              </Alert>
            )}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <ManagementChip segment={segment} />
              <PublishedChip value={segment?.isPublished} />
              <SegmentTypeChip segment={segment} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ borderBottom: "1px solid #E7ECEF" }}>
              {["details", "contacts", "filters"].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "contained" : "text"}
                  onClick={() => onTabChange(tab)}
                  sx={{ textTransform: "none" }}
                >
                  {tab === "details" ? "Details" : tab === "contacts" ? "Contacts" : "Filters"}
                </Button>
              ))}
            </Stack>
            {activeTab === "details" && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><DetailField label="ID" value={segment?.id} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Name" value={segment?.name} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Alias" value={segment?.alias} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Contact Count" value={formatCount(segment?.contact_count)} /></Grid>
                <Grid item xs={12}><DetailField label="Description" value={segment?.description} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Subscription List Owner" value={segment?.subscription_list_name} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Subscription List Slug" value={segment?.subscription_list_slug} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Created" value={formatDateTime(segment?.dateAdded)} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Modified" value={formatDateTime(segment?.dateModified)} /></Grid>
              </Grid>
            )}
            {activeTab === "contacts" && (
              <SegmentContactsPanel
                segment={segment}
                contactsState={contactsState}
                contactSearch={contactSearch}
                onContactSearch={onContactSearch}
                onRefresh={onRefreshContacts}
                onAddOpen={onAddContactOpen}
                onRemoveOpen={onRemoveContactOpen}
              />
            )}
            {activeTab === "filters" && (
              <Box>
                <Typography sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1 }}>
                  Filters
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Filter editing is not exposed until Mautic filter metadata can be modeled safely.
                </Typography>
                {filters.length ? (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#E7ECEF", bgcolor: "#F8FAFC", overflow: "auto" }}>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13 }}>
                      {JSON.stringify(filters, null, 2)}
                    </pre>
                  </Paper>
                ) : (
                  <Alert severity="info" variant="outlined">
                    No filters were returned for this segment.
                  </Alert>
                )}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

const blankSegmentForm = {
  name: "",
  alias: "",
  description: "",
  isPublished: false,
};

const segmentToForm = (segment) => ({
  name: segment?.name || "",
  alias: segment?.alias || "",
  description: segment?.description || "",
  isPublished: Boolean(segment?.isPublished),
});

function SegmentFormDialog({ open, mode, value, loading, error, onClose, onSubmit }) {
  const [form, setForm] = useState(blankSegmentForm);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (open) setForm(value || blankSegmentForm);
  }, [open, value]);

  const updateField = (field, nextValue) => {
    setForm((current) => ({ ...current, [field]: nextValue }));
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Segment" : "Create Segment"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            {isEdit
              ? "Updates the native Mautic marketing segment only. This does not change Subscription Lists or newsletter consent."
              : "Creates a native Mautic marketing segment. This does not create a Subscription List or newsletter consent option."}
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            label="Name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Alias"
            value={form.alias}
            onChange={(event) => updateField("alias", event.target.value)}
            helperText="Leave blank to let Mautic assign an alias when supported."
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isPublished}
                onChange={(event) => updateField("isPublished", event.target.checked)}
              />
            }
            label="Published"
          />
          {isEdit && (
            <Alert severity="warning" variant="outlined">
              Dynamic filters are not edited in this phase, and existing filter definitions will not be sent or reset.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(form)}
          disabled={loading || !form.name.trim()}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteSegmentDialog({ open, segment, loading, error, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Segment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography>
            Delete native Mautic segment "{segment?.name || `Segment #${segment?.id}`}"?
          </Typography>
          <Alert severity="warning" variant="outlined">
            This only deletes the native segment in Mautic. It does not delete any ECP Subscription List or consent record.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddContactDialog({
  open,
  contacts,
  search,
  loading,
  saving,
  error,
  selectedId,
  onSearchChange,
  onSelect,
  onClose,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Contact</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            label="Search Mautic contacts"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            fullWidth
          />
          {loading ? (
            <Stack spacing={1}>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={38} />)}</Stack>
          ) : contacts.length === 0 ? (
            <Alert severity="info" variant="outlined">No Mautic contacts found.</Alert>
          ) : (
            <Stack spacing={1}>
              {contacts.map((contact) => {
                const contactId = contact.mautic_contact_id || contact.id;
                const selected = String(selectedId) === String(contactId);
                return (
                  <Paper
                    key={contactId}
                    variant="outlined"
                    onClick={() => onSelect(contactId)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderColor: selected ? "#0f766e" : "#E7ECEF",
                      bgcolor: selected ? "#ECFDF5" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
                      {contact.name || contact.email || `Contact #${contactId}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {contact.email || "-"}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving || !selectedId}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Add Contact"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RemoveContactDialog({ open, contact, loading, error, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove Contact</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography>
            Remove "{contact?.name || contact?.email || `Contact #${contact?.id}`}" from this native Mautic segment?
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Remove"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterNativeSegmentsPanel() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [detailState, setDetailState] = useState({
    open: false,
    loading: false,
    segment: null,
    error: "",
    tab: "details",
  });
  const [segmentContactsState, setSegmentContactsState] = useState({
    loading: false,
    data: null,
    error: "",
    search: "",
  });
  const [formState, setFormState] = useState({
    open: false,
    mode: "create",
    segment: null,
    loading: false,
    error: "",
  });
  const [deleteState, setDeleteState] = useState({
    open: false,
    segment: null,
    loading: false,
    error: "",
  });
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [addContactState, setAddContactState] = useState({
    open: false,
    search: "",
    contacts: [],
    loading: false,
    saving: false,
    selectedId: "",
    error: "",
  });
  const [removeContactState, setRemoveContactState] = useState({
    open: false,
    contact: null,
    loading: false,
    error: "",
  });

  const loadSegments = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNativeMauticSegments();
      setSegments(asArray(data));
    } catch (err) {
      setError(getErrorMessage(err, "We could not load native Mautic segments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSegments();
  }, []);

  const filteredSegments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return segments;
    return segments.filter((segment) => {
      const values = [
        segment?.name,
        segment?.alias,
        segment?.description,
        segment?.subscription_list_name,
        segment?.subscription_list_slug,
      ];
      return values.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [segments, search]);

  const openDetail = async (segmentId) => {
    setDetailState({ open: true, loading: true, segment: null, error: "", tab: "details" });
    setSegmentContactsState({ loading: false, data: null, error: "", search: "" });
    try {
      const segment = await getNativeMauticSegment(segmentId);
      setDetailState({ open: true, loading: false, segment, error: "", tab: "details" });
    } catch (err) {
      setDetailState({
        open: true,
        loading: false,
        segment: null,
        error: getErrorMessage(err, "We could not load this Mautic segment."),
        tab: "details",
      });
    }
  };

  const loadSegmentContacts = async ({ search: nextSearch } = {}) => {
    const segmentId = detailState.segment?.id;
    if (!segmentId) return;
    const query = nextSearch !== undefined ? nextSearch : segmentContactsState.search;
    setSegmentContactsState((state) => ({ ...state, loading: true, error: "", search: query }));
    try {
      const data = await listNativeMauticSegmentContacts(segmentId, {
        page: 1,
        page_size: 25,
        ...(query.trim() ? { search: query.trim() } : {}),
      });
      setSegmentContactsState({ loading: false, data, error: "", search: query });
    } catch (err) {
      setSegmentContactsState((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(err, "We could not load segment contacts."),
      }));
    }
  };

  const setDetailTab = (tab) => {
    setDetailState((state) => ({ ...state, tab }));
    if (tab === "contacts" && !segmentContactsState.data && !segmentContactsState.loading) {
      setTimeout(() => loadSegmentContacts(), 0);
    }
  };

  const openCreate = () => {
    setFormState({
      open: true,
      mode: "create",
      segment: null,
      loading: false,
      error: "",
    });
  };

  const openEdit = (segment) => {
    setFormState({
      open: true,
      mode: "edit",
      segment,
      loading: false,
      error: "",
    });
  };

  const closeForm = () => {
    setFormState({
      open: false,
      mode: "create",
      segment: null,
      loading: false,
      error: "",
    });
  };

  const submitForm = async (form) => {
    const payload = {
      name: form.name.trim(),
      description: form.description,
      isPublished: Boolean(form.isPublished),
    };
    if (form.alias.trim() || formState.mode === "edit") {
      payload.alias = form.alias.trim();
    }

    setFormState((state) => ({ ...state, loading: true, error: "" }));
    try {
      if (formState.mode === "edit") {
        await updateNativeMauticSegment(formState.segment.id, payload);
        setSnack({ open: true, severity: "success", message: "Segment updated." });
      } else {
        await createNativeMauticSegment(payload);
        setSnack({ open: true, severity: "success", message: "Segment created." });
      }
      closeForm();
      loadSegments();
    } catch (err) {
      setFormState((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(err, "We could not save this Mautic segment."),
      }));
    }
  };

  const openDelete = (segment) => {
    setDeleteState({ open: true, segment, loading: false, error: "" });
  };

  const closeDelete = () => {
    setDeleteState({ open: false, segment: null, loading: false, error: "" });
  };

  const confirmDelete = async () => {
    setDeleteState((state) => ({ ...state, loading: true, error: "" }));
    try {
      await deleteNativeMauticSegment(deleteState.segment.id);
      closeDelete();
      setSnack({ open: true, severity: "success", message: "Segment deleted." });
      loadSegments();
    } catch (err) {
      setDeleteState((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(err, "We could not delete this Mautic segment."),
      }));
    }
  };

  const searchContactsForAdd = async (query) => {
    setAddContactState((state) => ({
      ...state,
      search: query,
      loading: true,
      error: "",
      selectedId: "",
    }));
    try {
      const data = await listNewsletterAdminContacts({
        page: 1,
        page_size: 10,
        ...(query.trim() ? { search: query.trim() } : {}),
      });
      setAddContactState((state) => ({
        ...state,
        contacts: asArray(data?.results),
        loading: false,
      }));
    } catch (err) {
      setAddContactState((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(err, "We could not search Mautic contacts."),
      }));
    }
  };

  const openAddContact = () => {
    setAddContactState({
      open: true,
      search: "",
      contacts: [],
      loading: false,
      saving: false,
      selectedId: "",
      error: "",
    });
    setTimeout(() => searchContactsForAdd(""), 0);
  };

  const closeAddContact = () => {
    setAddContactState({
      open: false,
      search: "",
      contacts: [],
      loading: false,
      saving: false,
      selectedId: "",
      error: "",
    });
  };

  const submitAddContact = async () => {
    setAddContactState((state) => ({ ...state, saving: true, error: "" }));
    try {
      await addNativeMauticSegmentContact(detailState.segment.id, addContactState.selectedId);
      closeAddContact();
      setSnack({ open: true, severity: "success", message: "Contact added to segment." });
      loadSegmentContacts();
      loadSegments();
    } catch (err) {
      setAddContactState((state) => ({
        ...state,
        saving: false,
        error: getErrorMessage(err, "We could not add this contact."),
      }));
    }
  };

  const openRemoveContact = (contact) => {
    setRemoveContactState({ open: true, contact, loading: false, error: "" });
  };

  const closeRemoveContact = () => {
    setRemoveContactState({ open: false, contact: null, loading: false, error: "" });
  };

  const confirmRemoveContact = async () => {
    setRemoveContactState((state) => ({ ...state, loading: true, error: "" }));
    try {
      await removeNativeMauticSegmentContact(detailState.segment.id, removeContactState.contact.id);
      closeRemoveContact();
      setSnack({ open: true, severity: "success", message: "Contact removed from segment." });
      loadSegmentContacts();
      loadSegments();
    } catch (err) {
      setRemoveContactState((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(err, "We could not remove this contact."),
      }));
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
            Segments
          </Typography>
          <Typography color="text.secondary">
            Manage and inspect Mautic marketing segments used for targeting and campaign automation.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Mautic is the source of truth for native marketing segments.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignSelf: "flex-start" }}>
          <Button startIcon={<RefreshRoundedIcon />} onClick={loadSegments} disabled={loading} sx={{ textTransform: "none" }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ textTransform: "none" }}>
            Create Segment
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #E7ECEF" }}>
          <TextField
            label="Search segments"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            size="small"
            fullWidth
          />
        </Box>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Stack spacing={1}>{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={46} />)}</Stack>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadSegments}>Retry</Button>}>
              {error}
            </Alert>
          </Box>
        ) : filteredSegments.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">
              No Mautic segments match the current search.
            </Alert>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Alias</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Published</TableCell>
                  <TableCell>Contacts</TableCell>
                  <TableCell>Management</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSegments.map((segment) => (
                  <TableRow hover key={segment.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
                        {segment.name || `Segment #${segment.id}`}
                      </Typography>
                      {segment.description && (
                        <Typography variant="body2" color="text.secondary">
                          {segment.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{segment.alias || "-"}</TableCell>
                    <TableCell><SegmentTypeChip segment={segment} /></TableCell>
                    <TableCell><PublishedChip value={segment.isPublished} /></TableCell>
                    <TableCell>{formatCount(segment.contact_count)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.75} alignItems="flex-start">
                        <ManagementChip segment={segment} />
                        {segment.subscription_list_name && (
                          <Typography variant="caption" color="text.secondary">
                            {segment.subscription_list_name}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View segment">
                        <IconButton onClick={() => openDetail(segment.id)}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {segment.managed_by_subscription_list || segment.mapped_in_ecp ? (
                        <Typography variant="caption" color="text.secondary">
                          Protected
                        </Typography>
                      ) : (
                        <>
                          <Tooltip title="Edit segment">
                            <IconButton onClick={() => openEdit(segment)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete segment">
                            <IconButton color="error" onClick={() => openDelete(segment)}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Divider />

      <Alert severity="info" variant="outlined">
        Manual membership, dynamic filter controls, import/export, and advanced statistics are intentionally not exposed in this phase.
      </Alert>

      <SegmentDetailDialog
        open={detailState.open}
        loading={detailState.loading}
        segment={detailState.segment}
        error={detailState.error}
        activeTab={detailState.tab}
        onTabChange={setDetailTab}
        contactsState={segmentContactsState}
        contactSearch={segmentContactsState.search}
        onContactSearch={(value) => {
          setSegmentContactsState((state) => ({ ...state, search: value }));
          loadSegmentContacts({ search: value });
        }}
        onRefreshContacts={() => loadSegmentContacts()}
        onAddContactOpen={openAddContact}
        onRemoveContactOpen={openRemoveContact}
        onClose={() => setDetailState({ open: false, loading: false, segment: null, error: "", tab: "details" })}
      />
      <SegmentFormDialog
        open={formState.open}
        mode={formState.mode}
        value={formState.mode === "edit" ? segmentToForm(formState.segment) : blankSegmentForm}
        loading={formState.loading}
        error={formState.error}
        onClose={closeForm}
        onSubmit={submitForm}
      />
      <DeleteSegmentDialog
        open={deleteState.open}
        segment={deleteState.segment}
        loading={deleteState.loading}
        error={deleteState.error}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
      <AddContactDialog
        open={addContactState.open}
        contacts={addContactState.contacts}
        search={addContactState.search}
        loading={addContactState.loading}
        saving={addContactState.saving}
        error={addContactState.error}
        selectedId={addContactState.selectedId}
        onSearchChange={searchContactsForAdd}
        onSelect={(contactId) => setAddContactState((state) => ({ ...state, selectedId: contactId }))}
        onClose={closeAddContact}
        onSubmit={submitAddContact}
      />
      <RemoveContactDialog
        open={removeContactState.open}
        contact={removeContactState.contact}
        loading={removeContactState.loading}
        error={removeContactState.error}
        onClose={closeRemoveContact}
        onConfirm={confirmRemoveContact}
      />
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
