import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { apiClient } from "../../utils/api";

const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

export default function EventPreApprovalManager({ event, token, onEventUpdated }) {
  const CODES_PAGE_SIZE = 10;
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [configMsg, setConfigMsg] = React.useState("");
  const [config, setConfig] = React.useState({
    preapproval_code_enabled: !!event?.preapproval_code_enabled,
    preapproval_allowlist_enabled: !!event?.preapproval_allowlist_enabled,
    attendee_marker_enabled: !!event?.attendee_marker_enabled,
    attendee_marker_label: event?.attendee_marker_label || "",
  });

  // FIX 3: Add tracks and submission modes state
  const [tracks, setTracks] = React.useState([]);
  const SUBMISSION_MODES = [
    { value: "self_submission", label: "Self Submission" },
    { value: "confirmed", label: "Confirmed" },
    { value: "self_nomination", label: "Self Nomination" },
    { value: "third_party_nomination", label: "Third Party Nomination" },
  ];

  const [codes, setCodes] = React.useState([]);
  const [codeStatus, setCodeStatus] = React.useState("active");
  const [codeSearch, setCodeSearch] = React.useState("");
  const [codePage, setCodePage] = React.useState(1);
  const [newCode, setNewCode] = React.useState("");
  const [newCodeNotes, setNewCodeNotes] = React.useState("");
  const [newCodeTrackId, setNewCodeTrackId] = React.useState(""); // FIX 3
  const [newCodeSubmissionMode, setNewCodeSubmissionMode] = React.useState(""); // FIX 3
  const [batchPrefix, setBatchPrefix] = React.useState("");
  const [batchCount, setBatchCount] = React.useState(20);
  const [batchTrackId, setBatchTrackId] = React.useState(""); // FIX 3
  const [batchSubmissionMode, setBatchSubmissionMode] = React.useState(""); // FIX 3

  const [allowlist, setAllowlist] = React.useState([]);
  const [allowFirst, setAllowFirst] = React.useState("");
  const [allowLast, setAllowLast] = React.useState("");
  const [allowEmail, setAllowEmail] = React.useState("");
  const [allowTrackId, setAllowTrackId] = React.useState(""); // FIX 2
  const [allowSubmissionMode, setAllowSubmissionMode] = React.useState(""); // FIX 2
  const [removeDialog, setRemoveDialog] = React.useState({
    open: false,
    type: "",
    item: null,
  });
  const [notice, setNotice] = React.useState({
    open: false,
    severity: "success",
    message: "",
  });

  React.useEffect(() => {
    setConfig({
      preapproval_code_enabled: !!event?.preapproval_code_enabled,
      preapproval_allowlist_enabled: !!event?.preapproval_allowlist_enabled,
      attendee_marker_enabled: !!event?.attendee_marker_enabled,
      attendee_marker_label: event?.attendee_marker_label || "",
    });
  }, [event]);

  // FIX 3: Load application tracks for dropdowns
  React.useEffect(() => {
    if (!event?.id) return;
    const loadTracks = async () => {
      try {
        const { data } = await apiClient.get(`/events/${event.id}/application-tracks/`);
        const tracksArray = Array.isArray(data) ? data : (data.results || []);
        setTracks(tracksArray);
      } catch (err) {
        console.error("Failed to load tracks:", err);
      }
    };
    loadTracks();
  }, [event?.id]);

  const authHeaders = React.useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchCodes = React.useCallback(async () => {
    if (!event?.id) return;
    try {
      // FIX 11: Use apiClient instead of fetch
      const { data } = await apiClient.get(`/events/${event.id}/preapproval/codes/?status=${codeStatus}`);
      setCodes(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to fetch codes:", err);
    }
  }, [event?.id, codeStatus]);

  const fetchAllowlist = React.useCallback(async () => {
    if (!event?.id) return;
    try {
      // FIX 11: Use apiClient instead of fetch
      const { data } = await apiClient.get(`/events/${event.id}/preapproval/allowlist/`);
      setAllowlist(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to fetch allowlist:", err);
    }
  }, [event?.id]);

  React.useEffect(() => { fetchCodes(); }, [fetchCodes]);
  React.useEffect(() => { fetchAllowlist(); }, [fetchAllowlist]);
  React.useEffect(() => { setCodePage(1); }, [codeStatus, codeSearch, codes.length]);

  const filteredCodes = React.useMemo(() => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter((row) => {
      const code = String(row.code || "").toLowerCase();
      const usedBy = String(row.used_by_email || "").toLowerCase();
      const notes = String(row.notes || "").toLowerCase();
      return code.includes(q) || usedBy.includes(q) || notes.includes(q);
    });
  }, [codes, codeSearch]);

  const totalCodePages = Math.max(1, Math.ceil(filteredCodes.length / CODES_PAGE_SIZE));
  const paginatedCodes = React.useMemo(() => {
    const start = (codePage - 1) * CODES_PAGE_SIZE;
    return filteredCodes.slice(start, start + CODES_PAGE_SIZE);
  }, [filteredCodes, codePage]);

  const saveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg("");
    try {
      // FIX 11: Use apiClient instead of fetch
      const { data } = await apiClient.patch(`/events/${event.id}/`, config);
      onEventUpdated?.(data);
      setConfigMsg("Configuration saved.");
    } catch (e) {
      setConfigMsg(e.response?.data?.detail || "Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const createSingleCode = async () => {
    try {
      // FIX 3: Include track_id and submission_mode
      // FIX 11: Use apiClient instead of fetch
      const payload = {
        code: newCode.trim(),
        notes: newCodeNotes.trim(),
      };
      if (newCodeTrackId) payload.track_id = newCodeTrackId;
      if (newCodeSubmissionMode) payload.submission_mode = newCodeSubmissionMode;

      await apiClient.post(`/events/${event.id}/preapproval/codes/`, payload);
      setNewCode("");
      setNewCodeNotes("");
      setNewCodeTrackId("");
      setNewCodeSubmissionMode("");
      fetchCodes();
    } catch (err) {
      console.error("Failed to create code:", err);
    }
  };

  const createBatchCodes = async () => {
    try {
      // FIX 3: Include track_id and submission_mode
      // FIX 11: Use apiClient instead of fetch
      const payload = {
        count: Number(batchCount),
        prefix: batchPrefix.trim(),
      };
      if (batchTrackId) payload.track_id = batchTrackId;
      if (batchSubmissionMode) payload.submission_mode = batchSubmissionMode;

      await apiClient.post(`/events/${event.id}/preapproval/codes/batch/`, payload);
      setBatchPrefix("");
      setBatchCount(20);
      setBatchTrackId("");
      setBatchSubmissionMode("");
      fetchCodes();
    } catch (err) {
      console.error("Failed to create batch codes:", err);
    }
  };

  const revokeCode = (code) => {
    setRemoveDialog({ open: true, type: "code", item: code });
  };

  const markCodeUsed = async (codeId) => {
    try {
      // FIX 11: Use apiClient instead of fetch
      await apiClient.post(`/events/${event.id}/preapproval/codes/${codeId}/mark-used/`, {});
      fetchCodes();
    } catch (err) {
      console.error("Failed to mark code used:", err);
    }
  };

  const addAllowlist = async () => {
    try {
      // FIX 2: Include track_id and submission_mode in allowlist creation
      // FIX 11: Use apiClient instead of fetch
      const payload = {
        first_name: allowFirst.trim(),
        last_name: allowLast.trim(),
        email: allowEmail.trim().toLowerCase(),
      };
      if (allowTrackId) payload.track_id = allowTrackId;
      if (allowSubmissionMode) payload.submission_mode = allowSubmissionMode;

      await apiClient.post(`/events/${event.id}/preapproval/allowlist/`, payload);
      setAllowFirst("");
      setAllowLast("");
      setAllowEmail("");
      setAllowTrackId("");
      setAllowSubmissionMode("");
      fetchAllowlist();
    } catch (err) {
      console.error("Failed to add allowlist entry:", err);
    }
  };

  const removeAllowlist = (entry) => {
    setRemoveDialog({ open: true, type: "allowlist", item: entry });
  };

  const confirmSoftRemove = async () => {
    const { type, item } = removeDialog;
    if (!item?.id) return;

    try {
      let response;
      if (type === "code") {
        response = await apiClient.post(
          `/events/${event.id}/preapproval/codes/${item.id}/revoke/`,
          {}
        );
        await fetchCodes();
      } else {
        response = await apiClient.delete(
          `/events/${event.id}/preapproval/allowlist/${item.id}/`
        );
        await fetchAllowlist();
      }

      setNotice({
        open: true,
        severity: "success",
        message:
          response?.data?.detail ||
          (type === "code"
            ? "The code was removed from active use and remains stored in the database."
            : "The email was removed from active pre-approval and remains stored in the database."),
      });
      setRemoveDialog({ open: false, type: "", item: null });
    } catch (err) {
      console.error("Failed to remove pre-approval record:", err);
      setNotice({
        open: true,
        severity: "error",
        message: err.response?.data?.detail || "Failed to remove the pre-approval record.",
      });
    }
  };

  const importCsv = async (file) => {
    try {
      // FIX 2: CSV import must include track_id and submission_mode (via CSV columns)
      // FIX 11: Use apiClient instead of fetch
      const fd = new FormData();
      fd.append("file", file);
      if (allowTrackId) fd.append("track_id", allowTrackId);
      if (allowSubmissionMode) fd.append("submission_mode", allowSubmissionMode);

      await apiClient.post(`/events/${event.id}/preapproval/allowlist/import-csv/`, fd);
      fetchAllowlist();
    } catch (err) {
      console.error("Failed to import CSV:", err);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
      <Stack spacing={2}>
        <Typography variant="h6">Pre-Approval Manager</Typography>

        <Typography variant="subtitle2">Configuration</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FormControlLabel
            control={<Switch checked={!!config.preapproval_code_enabled} onChange={(e) => setConfig((p) => ({ ...p, preapproval_code_enabled: e.target.checked }))} />}
            label="Enable pre-approved codes"
          />
          <FormControlLabel
            control={<Switch checked={!!config.preapproval_allowlist_enabled} onChange={(e) => setConfig((p) => ({ ...p, preapproval_allowlist_enabled: e.target.checked }))} />}
            label="Enable email allowlist"
          />
          <FormControlLabel
            control={<Switch checked={!!config.attendee_marker_enabled} onChange={(e) => setConfig((p) => ({ ...p, attendee_marker_enabled: e.target.checked }))} />}
            label="Show attendee marker checkbox"
          />
        </Stack>
        <TextField
          size="small"
          label="Attendee marker label"
          value={config.attendee_marker_label}
          onChange={(e) => setConfig((p) => ({ ...p, attendee_marker_label: e.target.value }))}
        />
        <Box>
          <Button variant="contained" onClick={saveConfig} disabled={savingConfig}>
            {savingConfig ? "Saving..." : "Save Configuration"}
          </Button>
        </Box>
        {configMsg && <Alert severity="info">{configMsg}</Alert>}

        <Divider />
        <Typography variant="subtitle2">Codes</Typography>
        {/* FIX 3: Add track and submission mode dropdowns */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" label="Custom-Code (optional)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <TextField size="small" label="Notes" value={newCodeNotes} onChange={(e) => setNewCodeNotes(e.target.value)} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Track (optional)</InputLabel>
            <Select value={newCodeTrackId} label="Track (optional)" onChange={(e) => setNewCodeTrackId(e.target.value)}>
              <MenuItem value="">None (event-level)</MenuItem>
              {tracks.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Submission Mode (optional)</InputLabel>
            <Select value={newCodeSubmissionMode} label="Submission Mode (optional)" onChange={(e) => setNewCodeSubmissionMode(e.target.value)}>
              <MenuItem value="">Any mode</MenuItem>
              {SUBMISSION_MODES.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={createSingleCode}>Create Code</Button>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" label="Prefix" value={batchPrefix} onChange={(e) => setBatchPrefix(e.target.value)} />
          <TextField size="small" type="number" label="Count" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Track (optional)</InputLabel>
            <Select value={batchTrackId} label="Track (optional)" onChange={(e) => setBatchTrackId(e.target.value)}>
              <MenuItem value="">None (event-level)</MenuItem>
              {tracks.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Submission Mode (optional)</InputLabel>
            <Select value={batchSubmissionMode} label="Submission Mode (optional)" onChange={(e) => setBatchSubmissionMode(e.target.value)}>
              <MenuItem value="">Any mode</MenuItem>
              {SUBMISSION_MODES.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={createBatchCodes}>Generate Batch</Button>
          <Select size="small" value={codeStatus} onChange={(e) => setCodeStatus(e.target.value)}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="used">Used</MenuItem>
            <MenuItem value="revoked">Revoked</MenuItem>
          </Select>
        </Stack>
        <TextField
          size="small"
          label="Search codes"
          placeholder="Search by code, used email, or notes"
          value={codeSearch}
          onChange={(e) => setCodeSearch(e.target.value)}
        />
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Used By Email</TableCell>
                <TableCell>Used At</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCodes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell><Chip size="small" label={row.status} /></TableCell>
                  <TableCell>{row.used_by_email || "-"}</TableCell>
                  <TableCell>{row.used_at ? new Date(row.used_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {row.status === "active" && <Button size="small" onClick={() => revokeCode(row)}>Revoke</Button>}
                      {row.status === "active" && <Button size="small" onClick={() => markCodeUsed(row.id)}>Mark Used</Button>}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: "text.secondary" }}>
                    No codes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Showing {paginatedCodes.length} of {filteredCodes.length} codes
          </Typography>
          <Pagination
            page={codePage}
            count={totalCodePages}
            onChange={(_e, page) => setCodePage(page)}
            size="small"
            color="primary"
          />
        </Stack>

        <Divider />
        <Typography variant="subtitle2">Allowlist</Typography>
        {/* FIX 2: Add track and submission mode to allowlist */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" label="First Name" value={allowFirst} onChange={(e) => setAllowFirst(e.target.value)} />
          <TextField size="small" label="Last Name" value={allowLast} onChange={(e) => setAllowLast(e.target.value)} />
          <TextField size="small" label="Email" value={allowEmail} onChange={(e) => setAllowEmail(e.target.value)} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Track (optional)</InputLabel>
            <Select value={allowTrackId} label="Track (optional)" onChange={(e) => setAllowTrackId(e.target.value)}>
              <MenuItem value="">None (event-level)</MenuItem>
              {tracks.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Submission Mode (optional)</InputLabel>
            <Select value={allowSubmissionMode} label="Submission Mode (optional)" onChange={(e) => setAllowSubmissionMode(e.target.value)}>
              <MenuItem value="">Any mode</MenuItem>
              {SUBMISSION_MODES.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={addAllowlist}>Add Entry</Button>
          <Button variant="outlined" component="label">
            Import CSV
            <input hidden type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          </Button>
        </Stack>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allowlist.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.first_name}</TableCell>
                  <TableCell>{row.last_name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{row.is_active && <Button size="small" onClick={() => removeAllowlist(row)}>Remove</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>

      <Dialog
        open={removeDialog.open}
        onClose={() => setRemoveDialog({ open: false, type: "", item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {removeDialog.type === "code"
            ? "Remove Pre-Approval Code"
            : "Remove Email from Allowlist"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            {removeDialog.type === "code"
              ? `Code "${removeDialog.item?.code || "this code"}" will stop working immediately, but it will remain stored in the database with its scope and audit history.`
              : `"${removeDialog.item?.email || "This email"}" will no longer receive pre-approved access, but the allowlist record will remain stored in the database with its scope and audit history.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialog({ open: false, type: "", item: null })}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmSoftRemove}>
            {removeDialog.type === "code" ? "Remove Code" : "Remove Email"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice.open}
        autoHideDuration={4500}
        onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
