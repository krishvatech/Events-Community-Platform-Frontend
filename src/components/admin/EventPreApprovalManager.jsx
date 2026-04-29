import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Pagination,
  Paper,
  Select,
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

  const [codes, setCodes] = React.useState([]);
  const [codeStatus, setCodeStatus] = React.useState("active");
  const [codeSearch, setCodeSearch] = React.useState("");
  const [codePage, setCodePage] = React.useState(1);
  const [newCode, setNewCode] = React.useState("");
  const [newCodeNotes, setNewCodeNotes] = React.useState("");
  const [batchPrefix, setBatchPrefix] = React.useState("");
  const [batchCount, setBatchCount] = React.useState(20);

  const [allowlist, setAllowlist] = React.useState([]);
  const [allowFirst, setAllowFirst] = React.useState("");
  const [allowLast, setAllowLast] = React.useState("");
  const [allowEmail, setAllowEmail] = React.useState("");

  React.useEffect(() => {
    setConfig({
      preapproval_code_enabled: !!event?.preapproval_code_enabled,
      preapproval_allowlist_enabled: !!event?.preapproval_allowlist_enabled,
      attendee_marker_enabled: !!event?.attendee_marker_enabled,
      attendee_marker_label: event?.attendee_marker_label || "",
    });
  }, [event]);

  const authHeaders = React.useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchCodes = React.useCallback(async () => {
    if (!event?.id || !token) return;
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/codes/?status=${codeStatus}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setCodes(Array.isArray(data) ? data : []);
    }
  }, [event?.id, token, codeStatus]);

  const fetchAllowlist = React.useCallback(async () => {
    if (!event?.id || !token) return;
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/allowlist/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setAllowlist(Array.isArray(data) ? data : []);
    }
  }, [event?.id, token]);

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
      const res = await fetch(`${API_ROOT}/events/${event.id}/`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save pre-approval configuration.");
      const data = await res.json();
      onEventUpdated?.(data);
      setConfigMsg("Configuration saved.");
    } catch (e) {
      setConfigMsg(e.message || "Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const createSingleCode = async () => {
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/codes/`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ code: newCode.trim(), notes: newCodeNotes.trim() }),
    });
    if (res.ok) {
      setNewCode("");
      setNewCodeNotes("");
      fetchCodes();
    }
  };

  const createBatchCodes = async () => {
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/codes/batch/`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ count: Number(batchCount), prefix: batchPrefix.trim() }),
    });
    if (res.ok) fetchCodes();
  };

  const revokeCode = async (codeId) => {
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/codes/${codeId}/revoke/`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    if (res.ok) fetchCodes();
  };

  const markCodeUsed = async (codeId) => {
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/codes/${codeId}/mark-used/`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    if (res.ok) fetchCodes();
  };

  const addAllowlist = async () => {
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/allowlist/`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        first_name: allowFirst.trim(),
        last_name: allowLast.trim(),
        email: allowEmail.trim().toLowerCase(),
      }),
    });
    if (res.ok) {
      setAllowFirst("");
      setAllowLast("");
      setAllowEmail("");
      fetchAllowlist();
    }
  };

  const removeAllowlist = async (entryId) => {
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/allowlist/${entryId}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchAllowlist();
  };

  const importCsv = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_ROOT}/events/${event.id}/preapproval/allowlist/import-csv/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) fetchAllowlist();
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" label="Custom-Code (optional)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <TextField size="small" label="Notes" value={newCodeNotes} onChange={(e) => setNewCodeNotes(e.target.value)} />
          <Button variant="outlined" onClick={createSingleCode}>Create Code</Button>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" label="Prefix" value={batchPrefix} onChange={(e) => setBatchPrefix(e.target.value)} />
          <TextField size="small" type="number" label="Count" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} />
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
                      {row.status === "active" && <Button size="small" onClick={() => revokeCode(row.id)}>Revoke</Button>}
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" label="First Name" value={allowFirst} onChange={(e) => setAllowFirst(e.target.value)} />
          <TextField size="small" label="Last Name" value={allowLast} onChange={(e) => setAllowLast(e.target.value)} />
          <TextField size="small" label="Email" value={allowEmail} onChange={(e) => setAllowEmail(e.target.value)} />
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
                  <TableCell>{row.is_active && <Button size="small" onClick={() => removeAllowlist(row.id)}>Remove</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </Paper>
  );
}
