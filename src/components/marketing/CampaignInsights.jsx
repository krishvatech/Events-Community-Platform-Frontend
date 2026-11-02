// Read-only Campaign insights shown on the builder page, as on Mautic's own
// Campaign page: the contacts currently in the Campaign and per-step counts.
// Step counts follow Mautic (failed executions left out, shown separately).

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Link,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Link as RouterLink } from "react-router-dom";

import { getNativeMauticCampaignContacts, getNativeMauticCampaignStats } from "../../services/newsletterService";

const NAVY = "#0B2A3C";
const BORDER = "#E7ECEF";
const PAGE_SIZE = 25;
const GROUPS = [
  ["action", "Actions"],
  ["decision", "Decisions"],
  ["condition", "Conditions"],
];

const errorText = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(String(value).includes("T") ? value : `${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const headSx = { "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" } };

export function CampaignStatsPanel({ campaignId }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [showRemoved, setShowRemoved] = useState(false);

  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    getNativeMauticCampaignStats(campaignId)
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((err) => setState({ loading: false, error: errorText(err, "Campaign statistics could not be loaded."), data: null }));
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const events = (state.data?.events || []).filter((event) => showRemoved || !event.deleted);
  return (
    <Stack spacing={2} aria-label="Campaign statistics">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
        <Box>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>Step statistics</Typography>
          <Typography variant="body2" color="text.secondary">
            Counts per step, as Mautic counts them: processed and pending (scheduled) contacts, and for decisions and conditions the yes and no paths. Failed executions are counted separately; they include scheduled steps Mautic cancelled because the contact left the campaign.
          </Typography>
        </Box>
        <Button startIcon={<RefreshRoundedIcon />} onClick={load} disabled={state.loading} sx={{ textTransform: "none", flexShrink: 0 }}>Refresh</Button>
      </Stack>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.data && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`In campaign: ${state.data.contacts.current.toLocaleString()}`} color="primary" variant="outlined" />
          <Chip label={`Removed: ${state.data.contacts.removed.toLocaleString()}`} variant="outlined" />
          {(state.data.events || []).some((event) => event.deleted) && (
            <FormControlLabel control={<Switch size="small" checked={showRemoved} onChange={(event) => setShowRemoved(event.target.checked)} />}
              label="Show removed steps" sx={{ ml: 1 }} />
          )}
        </Stack>
      )}
      {state.loading && !state.data ? (
        <Skeleton variant="rounded" height={160} />
      ) : (
        GROUPS.map(([type, label]) => {
          const rows = events.filter((event) => event.eventType === type);
          if (!rows.length) return null;
          const branching = type !== "action";
          return (
            <Paper key={type} variant="outlined" sx={{ borderRadius: 2, borderColor: BORDER, overflow: "hidden" }}>
              <Typography sx={{ px: 2, pt: 1.5, fontWeight: 800, color: NAVY }}>{label}</Typography>
              <TableContainer>
                <Table size="small" aria-label={`${label} statistics`}>
                  <TableHead>
                    <TableRow sx={headSx}>
                      <TableCell>Step</TableCell>
                      <TableCell align="right">Processed</TableCell>
                      <TableCell align="right">Pending</TableCell>
                      {branching && <TableCell align="right">Yes</TableCell>}
                      {branching && <TableCell align="right">No</TableCell>}
                      <TableCell align="right">Failed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((event) => (
                      <TableRow key={event.id} data-event-id={event.id}>
                        <TableCell sx={{ wordBreak: "break-word" }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{event.name || event.type}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.type}{event.decisionPath ? ` · ${event.decisionPath} path` : ""}{event.deleted ? " · removed" : ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{event.processed}</TableCell>
                        <TableCell align="right">{event.pending}</TableCell>
                        {branching && <TableCell align="right">{event.yes}</TableCell>}
                        {branching && <TableCell align="right">{event.no}</TableCell>}
                        <TableCell align="right" sx={{ color: event.failed ? "error.main" : undefined, fontWeight: event.failed ? 700 : undefined }}>{event.failed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          );
        })
      )}
      {state.data && !events.length && <Typography color="text.secondary">This campaign has no steps yet.</Typography>}
    </Stack>
  );
}

export function CampaignContactsPanel({ campaignId }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    getNativeMauticCampaignContacts(campaignId, { page, page_size: PAGE_SIZE, ...(applied ? { search: applied } : {}) })
      .then((data) => active && setState({ loading: false, error: "", data }))
      .catch((err) => active && setState({ loading: false, error: errorText(err, "Campaign contacts could not be loaded."), data: null }));
    return () => {
      active = false;
    };
  }, [campaignId, page, applied]);

  const apply = () => {
    setPage(1);
    setApplied(search.trim());
  };
  const rows = state.data?.results || [];
  return (
    <Stack spacing={2} aria-label="Campaign contacts">
      <Box>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>
          Contacts in this campaign{state.data ? ` (${state.data.count.toLocaleString()})` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">Contacts currently in the campaign, newest first. Use Contacts → Bulk actions to add or remove them.</Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }} sx={{ minWidth: { sm: 320 } }} />
        <Button variant="outlined" onClick={apply} sx={{ textTransform: "none" }}>Search</Button>
      </Stack>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: BORDER, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" aria-label="Contacts in campaign">
            <TableHead>
              <TableRow sx={headSx}>
                <TableCell>Contact</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Added by</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Last step run</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.loading && !rows.length
                ? Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`s${index}`}>{[0, 1, 2, 3].map((cell) => <TableCell key={cell}><Skeleton height={22} /></TableCell>)}</TableRow>
                ))
                : rows.map((row) => (
                  <TableRow key={row.id} data-contact-id={row.id}>
                    <TableCell sx={{ wordBreak: "break-all" }}>
                      <Link component={RouterLink} to={`/admin/newsletter/contacts/${row.id}`} underline="hover" sx={{ fontWeight: 700 }}>
                        {row.name || row.email || `Contact #${row.id}`}
                      </Link>
                      {row.name && row.email && <Typography variant="caption" color="text.secondary" component="div">{row.email}</Typography>}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.dateAdded)}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{row.manuallyAdded ? "Manually" : "Campaign source"}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" }, whiteSpace: "nowrap" }}>{formatDate(row.lastActivity)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!state.loading && !rows.length && !state.error && (
          <Typography color="text.secondary" sx={{ p: 2 }}>{applied ? "No contacts match this search." : "No contacts are in this campaign yet."}</Typography>
        )}
        {state.data?.count > 0 && (
          <TablePagination component="div" count={state.data.count} page={Math.max(0, page - 1)} rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, next) => !state.loading && setPage(next + 1)} />
        )}
      </Paper>
    </Stack>
  );
}
