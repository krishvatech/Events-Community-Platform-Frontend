import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  Link,
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
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import MauticSegmentFilterEditor from "./MauticSegmentFilterEditor";
import MauticCategoryPicker from "../components/marketing/MauticCategoryPicker.jsx";
import {
  buildFilterMetadataIndex,
  hydrateFilterRows,
  toFilterPayload,
  validateSegmentFilters,
} from "./mauticSegmentFilters";
import {
  addNativeMauticSegmentContact,
  createNativeMauticSegment,
  deleteNativeMauticSegment,
  duplicateNativeMauticSegment,
  getNativeMauticSegment,
  getNativeMauticSegmentUsage,
  getNativeMauticSegmentFilterMetadata,
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

// A Subscription List segment, or one in the Subscription List category (a
// consent gate): both are managed by ECP.
export const isProtectedSegment = (segment) =>
  Boolean(segment?.protected || segment?.managed_by_subscription_list || segment?.mapped_in_ecp || segment?.consent_marked);

function ManagementChip({ segment }) {
  if (isProtectedSegment(segment)) {
    return (
      <Chip
        size="small"
        color="warning"
        label={segment?.consent_marked && !segment?.managed_by_subscription_list ? "Consent gate" : "Managed by Subscription List"}
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

const USAGE_GROUPS = [
  { key: "campaigns", label: "Campaigns" },
  { key: "emails", label: "Emails" },
  { key: "forms", label: "Forms" },
  { key: "segments", label: "Other segments' filters" },
  { key: "reports", label: "Reports" },
  { key: "point_triggers", label: "Point triggers" },
];
const ROLE_LABELS = {
  source: "Source",
  condition: "Condition",
  adds: "Adds contacts",
  removes: "Removes contacts",
  sends_to: "Sent to it",
  excludes: "Excludes it",
};

export const usageTotal = (usage) => USAGE_GROUPS.reduce((sum, group) => sum + asArray(usage?.[group.key]).length, 0);

const usageLink = (groupKey, item) => {
  if (groupKey === "campaigns") return `/admin/newsletter/builder/${item.id}`;
  if (groupKey === "emails") {
    if (item.broadcast_uuid) return `/admin/newsletter/${item.broadcast_uuid}`;
    return item.email_type === "template" ? `/admin/newsletter/templates/${item.id}` : null;
  }
  if (groupKey === "forms") return `/admin/newsletter/forms/${item.id}`;
  if (groupKey === "reports") return `/admin/newsletter/reports/${item.id}`;
  if (groupKey === "point_triggers") return "/admin/newsletter/points";
  return null;
};

export function SegmentUsageList({ usage }) {
  const groups = USAGE_GROUPS.filter((group) => asArray(usage?.[group.key]).length);
  if (!groups.length) {
    return <Alert severity="success" variant="outlined">Not used by any campaign, email, form, segment, report or point trigger.</Alert>;
  }
  return (
    <Stack spacing={1.5} aria-label="Segment usage">
      {groups.map((group) => (
        <Box key={group.key}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 0.5 }}>
            {group.label} ({asArray(usage[group.key]).length})
          </Typography>
          <Stack spacing={0.5} component="ul" sx={{ m: 0, pl: 2.5 }}>
            {asArray(usage[group.key]).map((item) => {
              const to = usageLink(group.key, item);
              return (
                <Box component="li" key={`${group.key}-${item.id}`}>
                  {to ? <Link component={RouterLink} to={to} underline="hover">{item.name || `#${item.id}`}</Link> : (item.name || `#${item.id}`)}
                  {item.broadcast_uuid && <Typography component="span" variant="caption" color="text.secondary"> · Broadcast</Typography>}
                  {asArray(item.roles).map((role) => (
                    <Chip key={role} size="small" variant="outlined" label={ROLE_LABELS[role] || role} sx={{ ml: 0.75, height: 20 }} />
                  ))}
                  {item.published === false && (
                    <Typography component="span" variant="caption" color="text.secondary"> · unpublished</Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function useSegmentUsage(segmentId, enabled) {
  const [state, setState] = useState({ loading: false, usage: null, error: "" });
  useEffect(() => {
    if (!enabled || !segmentId) {
      setState({ loading: false, usage: null, error: "" });
      return undefined;
    }
    let active = true;
    setState({ loading: true, usage: null, error: "" });
    getNativeMauticSegmentUsage(segmentId)
      .then((data) => active && setState({ loading: false, usage: data?.usage || {}, error: "" }))
      .catch((err) => active && setState({ loading: false, usage: null, error: getErrorMessage(err, "We could not check where this segment is used.") }));
    return () => {
      active = false;
    };
  }, [segmentId, enabled]);
  return state;
}

function SegmentUsagePanel({ segmentId }) {
  const { loading, usage, error } = useSegmentUsage(segmentId, true);
  if (loading) return <Skeleton variant="rectangular" height={80} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Changing or deleting this segment affects everything below.
      </Typography>
      <SegmentUsageList usage={usage} />
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
              {["details", "contacts", "filters", "usage"].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "contained" : "text"}
                  onClick={() => onTabChange(tab)}
                  sx={{ textTransform: "none" }}
                >
                  {{ details: "Details", contacts: "Contacts", filters: "Filters", usage: "Used in" }[tab]}
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
                <Grid item xs={12} sm={6}><DetailField label="Public Name" value={segment?.publicName} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Category" value={segment?.category?.title} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Global (visible to other Mautic users)" value={segment ? (segment.isGlobal ? "Yes" : "No") : ""} /></Grid>
                <Grid item xs={12} sm={6}><DetailField label="Show in Preference Center" value={segment ? (segment.isPreferenceCenter ? "Yes" : "No") : ""} /></Grid>
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
            {activeTab === "usage" && segment?.id && <SegmentUsagePanel segmentId={segment.id} />}
            {activeTab === "filters" && (
              <Box>
                <Typography sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1 }}>
                  Filters
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Membership is decided by these filters. Edit them with the Edit button.
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
  publicName: "",
  category: null,
  categoryInfo: null,
  isGlobal: true,
  isPreferenceCenter: false,
  isPublished: false,
  filters: [],
};

const segmentToForm = (segment) => ({
  name: segment?.name || "",
  alias: segment?.alias || "",
  description: segment?.description || "",
  publicName: segment?.publicName || "",
  category: segment?.category?.id || null,
  categoryInfo: segment?.category || null,
  isGlobal: Boolean(segment?.isGlobal),
  isPreferenceCenter: Boolean(segment?.isPreferenceCenter),
  isPublished: Boolean(segment?.isPublished),
  // Saved filters are read back exactly as Mautic evaluates them.
  filters: hydrateFilterRows(segment?.filters),
});

function SegmentFormDialog({
  open,
  mode,
  value,
  loading,
  error,
  filterMetadata,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(blankSegmentForm);
  const isEdit = mode === "edit";
  const metadataIndex = useMemo(
    () => buildFilterMetadataIndex(filterMetadata?.data),
    [filterMetadata?.data]
  );
  const filterValidation = useMemo(
    () => validateSegmentFilters(form.filters, metadataIndex),
    [form.filters, metadataIndex]
  );

  useEffect(() => {
    if (open) setForm(value || blankSegmentForm);
  }, [open, value]);

  const updateField = (field, nextValue) => {
    setForm((current) => ({ ...current, [field]: nextValue }));
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      // A filter row is five controls wide, so this dialog needs room the other
      // segment dialogs do not.
      PaperProps={{ sx: { width: "min(1100px, calc(100vw - 48px))" } }}
    >
      <DialogTitle>{isEdit ? "Edit Segment" : "Create Segment"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            {isEdit
              ? "Updates the native Mautic marketing segment only. This does not change Subscription Lists or newsletter consent."
              : "Creates a native Mautic marketing segment. This does not create a Subscription List or newsletter consent option."}
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {/* The segment's own details stay a readable column even though the
              dialog is wide enough for the filter builder. */}
          <Stack spacing={2} sx={{ maxWidth: 640 }}>
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
            <TextField
              label="Public Name"
              value={form.publicName}
              onChange={(event) => updateField("publicName", event.target.value)}
              helperText="What contacts see in the preference center. Leave blank to use the name."
              inputProps={{ maxLength: 190 }}
              fullWidth
            />
            <MauticCategoryPicker
              bundle="segment"
              value={form.category}
              current={form.categoryInfo}
              disabled={loading}
              onChange={(category) => updateField("category", category)}
              helperText="Manage categories under Administration → Categories."
            />
            <FormControlLabel
              control={<Switch checked={form.isGlobal} onChange={(event) => updateField("isGlobal", event.target.checked)} />}
              label="Global: visible to other Mautic users"
            />
            <FormControlLabel
              control={<Switch checked={form.isPreferenceCenter} onChange={(event) => updateField("isPreferenceCenter", event.target.checked)} />}
              label="Show in preference center: contacts can join or leave this segment themselves"
            />
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={form.isPublished}
                onChange={(event) => updateField("isPublished", event.target.checked)}
              />
            }
            label="Published"
          />
          <MauticSegmentFilterEditor
            rows={form.filters}
            metadataIndex={metadataIndex}
            loading={filterMetadata?.loading}
            error={filterMetadata?.error}
            disabled={loading}
            onChange={(rows) => updateField("filters", rows)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(form)}
          disabled={loading || !form.name.trim() || !filterValidation.valid}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteSegmentDialog({ open, segment, loading, error, serverUsage, onClose, onConfirm }) {
  const usageState = useSegmentUsage(segment?.id, open);
  const usage = serverUsage || usageState.usage;
  const inUse = usageTotal(usage) > 0;
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Segment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography>
            Delete native Mautic segment "{segment?.name || `Segment #${segment?.id}`}"?
          </Typography>
          {usageState.loading && !serverUsage ? (
            <Skeleton variant="rectangular" height={60} />
          ) : usageState.error && !serverUsage ? (
            <Alert severity="error">{usageState.error}</Alert>
          ) : inUse ? (
            <>
              <Alert severity="warning">This segment is in use, so it can't be deleted. Remove it from these items first:</Alert>
              <SegmentUsageList usage={usage} />
            </>
          ) : (
            <Alert severity="warning" variant="outlined">
              This only deletes the native segment in Mautic. It does not delete any ECP Subscription List or consent record.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}
          disabled={loading || inUse || (usageState.loading && !serverUsage) || Boolean(usageState.error && !serverUsage)}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DuplicateSegmentDialog({ open, segment, loading, error, onClose, onConfirm }) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName(`Copy of ${segment?.name || `Segment #${segment?.id}`}`.slice(0, 190));
  }, [open, segment]);
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Duplicate Segment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField autoFocus label="Name of the copy" value={name} onChange={(event) => setName(event.target.value)}
            inputProps={{ maxLength: 190 }} required fullWidth />
          <Alert severity="info" variant="outlined">
            The copy gets the same filters, description and category. It starts unpublished, is not shown in the preference
            center, and does not copy contacts added by hand.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={() => onConfirm(name.trim())} disabled={loading || !name.trim()}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Duplicate"}
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
  // Which fields, conditions and values Mautic offers for filters. Fetched once
  // per panel session and shared by create and edit.
  const [filterMetadata, setFilterMetadata] = useState({
    loading: false,
    error: "",
    data: null,
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
    usage: null,
  });
  const [duplicateState, setDuplicateState] = useState({ open: false, segment: null, loading: false, error: "" });
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

  // Stable per open dialog: a new object each render would reset what the
  // admin typed whenever the panel re-renders (e.g. filter options loading).
  const formValue = useMemo(
    () => (formState.mode === "edit" ? segmentToForm(formState.segment) : blankSegmentForm),
    [formState.mode, formState.segment]
  );

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

  const loadFilterMetadata = useCallback(async () => {
    if (filterMetadata.data || filterMetadata.loading) return;
    setFilterMetadata((state) => ({ ...state, loading: true, error: "" }));
    try {
      const data = await getNativeMauticSegmentFilterMetadata();
      setFilterMetadata({ loading: false, error: "", data });
    } catch (err) {
      setFilterMetadata({
        loading: false,
        data: null,
        error: getErrorMessage(
          err,
          "We could not load segment filter options from Mautic."
        ),
      });
    }
  }, [filterMetadata.data, filterMetadata.loading]);

  useEffect(() => {
    if (formState.open) loadFilterMetadata();
  }, [formState.open, loadFilterMetadata]);

  const submitForm = async (form) => {
    const payload = {
      name: form.name.trim(),
      description: form.description,
      publicName: form.publicName.trim(),
      category: form.category || null,
      isGlobal: Boolean(form.isGlobal),
      isPreferenceCenter: Boolean(form.isPreferenceCenter),
      isPublished: Boolean(form.isPublished),
    };
    if (form.alias.trim() || formState.mode === "edit") {
      payload.alias = form.alias.trim();
    }
    // Always sent, so clearing every row turns a dynamic segment back into a
    // static one rather than silently leaving the old filters in place.
    payload.filters = toFilterPayload(form.filters);

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
    setDeleteState({ open: true, segment, loading: false, error: "", usage: null });
  };

  const closeDelete = () => {
    setDeleteState({ open: false, segment: null, loading: false, error: "", usage: null });
  };

  const openDuplicate = (segment) => setDuplicateState({ open: true, segment, loading: false, error: "" });
  const closeDuplicate = () => setDuplicateState({ open: false, segment: null, loading: false, error: "" });
  const confirmDuplicate = async (name) => {
    setDuplicateState((state) => ({ ...state, loading: true, error: "" }));
    try {
      const copy = await duplicateNativeMauticSegment(duplicateState.segment.id, { name });
      closeDuplicate();
      setSnack({ open: true, severity: "success", message: `Segment duplicated as "${copy?.name || name}".` });
      loadSegments();
    } catch (err) {
      setDuplicateState((state) => ({ ...state, loading: false, error: getErrorMessage(err, "We could not duplicate this segment.") }));
    }
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
        // The segment came into use after the dialog opened.
        usage: err?.response?.data?.code === "segment_in_use" ? err.response.data.usage : state.usage,
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
                      {isProtectedSegment(segment) ? (
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
                          <Tooltip title="Duplicate segment">
                            <IconButton aria-label={`Duplicate ${segment.name || `segment ${segment.id}`}`} onClick={() => openDuplicate(segment)}>
                              <ContentCopyRoundedIcon fontSize="small" />
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
        filterMetadata={filterMetadata}
        open={formState.open}
        mode={formState.mode}
        value={formValue}
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
        serverUsage={deleteState.usage}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
      <DuplicateSegmentDialog
        open={duplicateState.open}
        segment={duplicateState.segment}
        loading={duplicateState.loading}
        error={duplicateState.error}
        onClose={closeDuplicate}
        onConfirm={confirmDuplicate}
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
