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
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
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
  IconButton,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate } from "react-router-dom";

import {
  createNewsletterPointAction,
  deleteNewsletterPointAction,
  listNewsletterPointActions,
  listNewsletterPointActionTypes,
  listNewsletterPointGroups,
  updateNewsletterPointAction,
} from "../services/newsletterService";
import AdminNewsletterPointTriggersPanel from "./AdminNewsletterPointTriggersPanel";
import AdminNewsletterPointGroupsPanel from "./AdminNewsletterPointGroupsPanel";

const blankForm = {
  name: "",
  description: "",
  type: "",
  delta: "1",
  repeatable: false,
  isPublished: true,
  groupChoice: "",
  propertyInput: "",
  page_url: "",
  page_hits: "1",
  accumulative_time: "",
  returns_within: "",
  returns_after: "",
};

const listPropertyByType = {
  "asset.download": {
    key: "assets",
    label: "Asset IDs",
    helper: "Optional comma-separated Mautic asset IDs. Leave blank to match all assets.",
  },
  "email.open": {
    key: "emails",
    label: "Email IDs",
    helper: "Optional comma-separated Mautic email IDs. Leave blank to match all emails.",
  },
  "email.send": {
    key: "emails",
    label: "Email IDs",
    helper: "Optional comma-separated Mautic email IDs. Leave blank to match all emails.",
  },
  "form.submit": {
    key: "forms",
    label: "Form IDs",
    helper: "Optional comma-separated Mautic form IDs. Leave blank to match all forms.",
  },
  "page.hit": {
    key: "pages",
    label: "Landing Page IDs",
    helper: "Enter one or more comma-separated Mautic landing page IDs.",
    required: true,
  },
};

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  return data.detail || data.error || fallback;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseIdList = (value) => {
  const tokens = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!tokens.length) return [];
  if (tokens.some((item) => !/^\d+$/.test(item) || Number(item) <= 0)) {
    throw new Error("Use positive numeric Mautic IDs separated by commas.");
  }
  return tokens.map((item) => Number(item));
};

const propertyListToInput = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};

function PointActionDialog({
  open,
  action,
  types,
  groups,
  groupsLoading,
  groupsError,
  saving,
  error,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    const properties = action?.properties || {};
    const listConfig = action ? listPropertyByType[action.type] : null;
    setForm(
      action
        ? {
            name: action.name || "",
            description: action.description || "",
            type: action.type || "",
            delta: String(action.delta ?? 0),
            repeatable: Boolean(action.repeatable),
            isPublished: action.isPublished !== false,
            groupChoice: "__unchanged__",
            propertyInput: listConfig ? propertyListToInput(properties[listConfig.key]) : "",
            page_url: properties.page_url || "",
            page_hits: String(properties.page_hits ?? "1"),
            accumulative_time: String(properties.accumulative_time ?? ""),
            returns_within: String(properties.returns_within ?? ""),
            returns_after: String(properties.returns_after ?? ""),
          }
        : blankForm
    );
    setFormError("");
  }, [open, action]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleTypeChange = (type) => {
    setForm((current) => ({
      ...current,
      type,
      propertyInput: "",
      page_url: "",
      page_hits: "1",
      accumulative_time: "",
      returns_within: "",
      returns_after: "",
    }));
  };

  const submit = () => {
    const name = form.name.trim();
    const deltaText = String(form.delta).trim();
    if (!name) return setFormError("Point Action name is required.");
    if (!form.type) return setFormError("Point Action type is required.");
    if (!/^-?\d+$/.test(deltaText)) return setFormError("Points must be a whole number.");

    const properties = {};
    const listConfig = listPropertyByType[form.type];
    try {
      if (listConfig) {
        const ids = parseIdList(form.propertyInput);
        if (listConfig.required && !ids.length) {
          return setFormError(`${listConfig.label} are required for this action type.`);
        }
        if (ids.length) properties[listConfig.key] = ids;
      }

      if (form.type === "url.hit") {
        const pageUrl = form.page_url.trim();
        if (!pageUrl) return setFormError("URL is required for a specific URL action.");
        properties.page_url = pageUrl;

        const pageHitsText = String(form.page_hits || "").trim();
        if (pageHitsText) {
          if (!/^\d+$/.test(pageHitsText) || Number(pageHitsText) <= 0) {
            return setFormError("Required hits must be a positive whole number.");
          }
          properties.page_hits = Number(pageHitsText);
        }

        properties.accumulative_time_unit = "H";
        properties.returns_within_unit = "H";
        properties.returns_after_unit = "H";

        for (const field of ["accumulative_time", "returns_within", "returns_after"]) {
          const value = String(form[field] || "").trim();
          if (value) {
            if (!/^\d+$/.test(value) || Number(value) < 0) {
              return setFormError("Optional URL timing values must be whole numbers.");
            }
            properties[field] = Number(value);
          }
        }
      }
    } catch (err) {
      return setFormError(err.message);
    }

    const groupPayload = {};
    if (action) {
      if (form.groupChoice === "__clear_group__") {
        groupPayload.group = "";
      } else if (form.groupChoice && form.groupChoice !== "__unchanged__") {
        groupPayload.group = form.groupChoice;
      }
    } else if (form.groupChoice) {
      groupPayload.group = form.groupChoice;
    }

    setFormError("");
    onSave({
      name,
      description: form.description.trim(),
      type: form.type,
      delta: Number(deltaText),
      repeatable: Boolean(form.repeatable),
      isPublished: Boolean(form.isPublished),
      properties,
      ...groupPayload,
    });
  };

  const listConfig = listPropertyByType[form.type];

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{action ? "Edit Point Action" : "Create Point Action"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {(error || formError) && <Alert severity="error">{error || formError}</Alert>}
          <TextField
            autoFocus
            label="Name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            required
            fullWidth
            disabled={saving}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={saving}
          />
          <FormControl fullWidth required>
            <InputLabel id="point-action-type-label">Action Type</InputLabel>
            <Select
              labelId="point-action-type-label"
              label="Action Type"
              value={form.type}
              onChange={(event) => handleTypeChange(event.target.value)}
              disabled={saving || Boolean(action)}
            >
              {types.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label} ({item.value})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {action && (
            <Typography variant="caption" color="text.secondary">
              Action type is kept fixed while editing to avoid carrying incompatible provider properties between Mautic action types.
            </Typography>
          )}
          <TextField
            label="Points"
            type="number"
            value={form.delta}
            onChange={(event) => setField("delta", event.target.value)}
            inputProps={{ step: 1 }}
            helperText="Use a positive value to add points or a negative value to subtract points."
            fullWidth
            required
            disabled={saving}
          />
          {groupsError && (
            <Alert severity="warning" variant="outlined">
              {groupsError} You can still save this Point Action without changing its Point Group.
            </Alert>
          )}
          <FormControl fullWidth disabled={saving || groupsLoading}>
            <InputLabel id="point-action-group-label">Point Group</InputLabel>
            <Select
              labelId="point-action-group-label"
              label="Point Group"
              value={form.groupChoice}
              onChange={(event) => setField("groupChoice", event.target.value)}
              renderValue={(value) => {
                if (value === "__unchanged__") return "Keep current Point Group";
                if (value === "__clear_group__") return "Clear current Point Group";
                if (!value) return "No Point Group";
                const group = groups.find((item) => String(item.id) === String(value));
                if (!group) return `Point Group #${value}`;
                return `${group.name || `Point Group #${group.id}`}${!group.isPublished ? " (Unpublished)" : ""}`;
              }}
            >
              {action ? (
                <>
                  <MenuItem value="__unchanged__">Keep current Point Group</MenuItem>
                  <MenuItem
                    value="__clear_group__"
                    onClick={() => setField("groupChoice", "__clear_group__")}
                  >
                    Clear current Point Group
                  </MenuItem>
                </>
              ) : (
                <MenuItem value="">No Point Group</MenuItem>
              )}
              {groups.map((group) => (
                <MenuItem key={group.id} value={String(group.id)}>
                  {group.name || `Point Group #${group.id}`}
                  {!group.isPublished ? " (Unpublished)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {action
              ? "Mautic's legacy Point API does not expose the current Group. Keep it unchanged unless you intentionally want to move or clear this Point Action."
              : "Optional. Assign this Point Action to one provider-backed Mautic Point Group."}
          </Typography>

          {listConfig && (
            <TextField
              label={listConfig.label}
              value={form.propertyInput}
              onChange={(event) => setField("propertyInput", event.target.value)}
              helperText={listConfig.helper}
              required={Boolean(listConfig.required)}
              fullWidth
              disabled={saving}
            />
          )}

          {form.type === "url.hit" && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#E7ECEF" }}>
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>Specific URL rules</Typography>
                <TextField
                  label="URL"
                  value={form.page_url}
                  onChange={(event) => setField("page_url", event.target.value)}
                  placeholder="https://example.com/pricing"
                  required
                  fullWidth
                  disabled={saving}
                />
                <TextField
                  label="Required Hits"
                  type="number"
                  value={form.page_hits}
                  onChange={(event) => setField("page_hits", event.target.value)}
                  inputProps={{ min: 1, step: 1 }}
                  fullWidth
                  disabled={saving}
                />
                <Typography variant="caption" color="text.secondary">
                  Optional timing fields below use hours, matching the Mautic 7.1.3 Point Action form.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="Accumulative Time"
                    type="number"
                    value={form.accumulative_time}
                    onChange={(event) => setField("accumulative_time", event.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                    fullWidth
                    disabled={saving}
                  />
                  <TextField
                    label="Returns Within"
                    type="number"
                    value={form.returns_within}
                    onChange={(event) => setField("returns_within", event.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                    fullWidth
                    disabled={saving}
                  />
                  <TextField
                    label="Returns After"
                    type="number"
                    value={form.returns_after}
                    onChange={(event) => setField("returns_after", event.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                    fullWidth
                    disabled={saving}
                  />
                </Stack>
              </Stack>
            </Paper>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={form.repeatable}
                onChange={(event) => setField("repeatable", event.target.checked)}
                disabled={saving}
              />
            }
            label="Repeatable"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isPublished}
                onChange={(event) => setField("isPublished", event.target.checked)}
                disabled={saving}
              />
            }
            label="Published"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : action ? "Save Changes" : "Create Action"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterPointsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(true);
  const [error, setError] = useState("");
  const [typesError, setTypesError] = useState("");
  const [pointGroups, setPointGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [pointsSection, setPointsSection] = useState("actions");
  const [dialog, setDialog] = useState({ open: false, action: null, saving: false, error: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, action: null, deleting: false, error: "" });
  const pageSize = 25;

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    setTypesError("");
    try {
      const response = await listNewsletterPointActionTypes();
      setTypes(Array.isArray(response?.types) ? response.types : []);
    } catch (err) {
      setTypes([]);
      setTypesError(getErrorMessage(err, "We could not load Mautic Point Action types."));
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const loadPointGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError("");
    try {
      let nextPage = 1;
      let totalPages = 1;
      const allGroups = [];

      do {
        const response = await listNewsletterPointGroups({
          page: nextPage,
          page_size: 100,
        });
        const results = Array.isArray(response?.results) ? response.results : [];
        allGroups.push(...results);
        totalPages = Math.max(1, Number(response?.num_pages || 1));
        nextPage += 1;
      } while (nextPage <= totalPages);

      setPointGroups(allGroups);
    } catch (err) {
      setPointGroups([]);
      setGroupsError(getErrorMessage(err, "We could not load Mautic Point Groups."));
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const loadActions = useCallback(
    async ({ nextPage = page, nextSearch = search } = {}) => {
      setLoading(true);
      setError("");
      try {
        const response = await listNewsletterPointActions({
          page: nextPage,
          page_size: pageSize,
          ...(nextSearch ? { search: nextSearch } : {}),
        });
        setData(response);
        setPage(response?.page || nextPage);
      } catch (err) {
        setData(null);
        setError(getErrorMessage(err, "We could not load Mautic Point Actions."));
      } finally {
        setLoading(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    loadActions({ nextPage: 1, nextSearch: "" });
    loadTypes();
  }, []);

  useEffect(() => {
    if (pointsSection === "actions") {
      loadPointGroups();
    }
  }, [pointsSection, loadPointGroups]);

  const rows = Array.isArray(data?.results) ? data.results : [];
  const count = Number(data?.count || 0);
  const numPages = Math.max(1, Number(data?.num_pages || 1));
  const typeLabelMap = useMemo(
    () => new Map(types.map((item) => [item.value, item.label])),
    [types]
  );

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(1);
    loadActions({ nextPage: 1, nextSearch });
  };

  const saveAction = async (payload) => {
    const editing = dialog.action;
    setDialog((current) => ({ ...current, saving: true, error: "" }));
    try {
      if (editing) {
        const { type, ...updatePayload } = payload;
        await updateNewsletterPointAction(editing.id, updatePayload);
      } else {
        await createNewsletterPointAction(payload);
      }
      setDialog({ open: false, action: null, saving: false, error: "" });
      setSuccess(editing ? "Point Action updated in Mautic." : "Point Action created in Mautic.");
      await loadActions({ nextPage: editing ? page : 1, nextSearch: search });
    } catch (err) {
      setDialog((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(err, editing ? "Failed to update this Point Action." : "Failed to create this Point Action."),
      }));
    }
  };

  const deleteAction = async () => {
    if (!deleteDialog.action) return;
    setDeleteDialog((current) => ({ ...current, deleting: true, error: "" }));
    try {
      await deleteNewsletterPointAction(deleteDialog.action.id);
      setDeleteDialog({ open: false, action: null, deleting: false, error: "" });
      setSuccess("Point Action deleted from Mautic.");
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await loadActions({ nextPage, nextSearch: search });
    } catch (err) {
      setDeleteDialog((current) => ({
        ...current,
        deleting: false,
        error: getErrorMessage(err, "Failed to delete this Point Action."),
      }));
    }
  };

  return (
    <Stack spacing={3}>
      {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Tabs
          value={pointsSection}
          onChange={(_, value) => setPointsSection(value)}
          sx={{
            px: 2,
            minHeight: 48,
            "& .MuiTab-root": { minHeight: 48, textTransform: "none", fontWeight: 800 },
            "& .Mui-selected": { color: "#0f766e !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#0f766e" },
          }}
        >
          <Tab value="actions" label="Point Actions" />
          <Tab value="triggers" label="Point Triggers" />
          <Tab value="groups" label="Point Groups" />
        </Tabs>
      </Paper>

      {pointsSection === "triggers" ? (
        <AdminNewsletterPointTriggersPanel />
      ) : pointsSection === "groups" ? (
        <AdminNewsletterPointGroupsPanel />
      ) : (
        <>

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <StarsRoundedIcon sx={{ color: "#0f766e" }} />
            <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
              Point Actions
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Award or subtract Mautic contact points when configured engagement actions occur.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={() => {
              loadActions({ nextPage: page, nextSearch: search });
              loadTypes();
              loadPointGroups();
            }}
            disabled={loading || typesLoading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialog({ open: true, action: null, saving: false, error: "" })}
            disabled={typesLoading || Boolean(typesError) || types.length === 0}
            sx={{ textTransform: "none" }}
          >
            Create Point Action
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth for scoring. Point Actions use the action types exposed by the connected Mautic instance; no duplicate ECP scoring records are created.
      </Alert>

      {typesError && (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={loadTypes}>Retry</Button>}>
          {typesError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          sx={{ p: 2, borderBottom: "1px solid #E7ECEF" }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Search Point Actions"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              sx={{ minWidth: { sm: 320 } }}
            />
            <Button variant="outlined" onClick={handleSearch} disabled={loading}>Search</Button>
            {(search || searchInput) && (
              <Button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                  loadActions({ nextPage: 1, nextSearch: "" });
                }}
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: { md: "center" } }}>
            {count} Point Action{count === 1 ? "" : "s"}
          </Typography>
        </Stack>

        {loading ? (
          <Stack spacing={1} sx={{ p: 3 }}>
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={48} />)}
          </Stack>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => loadActions()}>Retry</Button>}>
              {error}
            </Alert>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">
              No Mautic Point Actions found. Create one to start scoring contact engagement.
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Action Type</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Repeatable</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Modified</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>{row.name || `Point Action #${row.id}`}</Typography>
                      {row.description && <Typography variant="body2" color="text.secondary">{row.description}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography>{row.type_label || typeLabelMap.get(row.type) || row.type || "—"}</Typography>
                      {row.type && <Typography variant="caption" color="text.secondary">{row.type}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${Number(row.delta || 0) >= 0 ? "+" : ""}${Number(row.delta || 0)}`}
                        color={Number(row.delta || 0) >= 0 ? "success" : "error"}
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell>{row.repeatable ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.isPublished ? "Published" : "Unpublished"}
                        color={row.isPublished ? "success" : "default"}
                        variant={row.isPublished ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(row.dateModified || row.dateAdded)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Point Action">
                        <IconButton
                          onClick={() => setDialog({ open: true, action: row, saving: false, error: "" })}
                          size="small"
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Point Action">
                        <IconButton
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, action: row, deleting: false, error: "" })}
                          size="small"
                        >
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2, py: 1.5, borderTop: "1px solid #E7ECEF" }}
        >
          <Typography variant="body2" color="text.secondary">Page {page} of {numPages}</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page <= 1}
              onClick={() => {
                const nextPage = page - 1;
                setPage(nextPage);
                loadActions({ nextPage, nextSearch: search });
              }}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page >= numPages}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                loadActions({ nextPage, nextSearch: search });
              }}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <PointActionDialog
        open={dialog.open}
        action={dialog.action}
        types={types}
        groups={pointGroups}
        groupsLoading={groupsLoading}
        groupsError={groupsError}
        saving={dialog.saving}
        error={dialog.error}
        onClose={() => setDialog({ open: false, action: null, saving: false, error: "" })}
        onSave={saveAction}
      />

      <Dialog
        open={deleteDialog.open}
        onClose={deleteDialog.deleting ? undefined : () => setDeleteDialog({ open: false, action: null, deleting: false, error: "" })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Point Action?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {deleteDialog.error && <Alert severity="error">{deleteDialog.error}</Alert>}
            <Typography>
              Delete <strong>{deleteDialog.action?.name || "this Point Action"}</strong> from Mautic?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Existing contact point history remains in Mautic; this stops this action from awarding or subtracting future points.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, action: null, deleting: false, error: "" })}
            disabled={deleteDialog.deleting}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={deleteAction} disabled={deleteDialog.deleting}>
            {deleteDialog.deleting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Stack>
  );
}
