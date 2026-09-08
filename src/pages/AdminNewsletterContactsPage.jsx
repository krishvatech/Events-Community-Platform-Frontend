import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
  Typography,
} from "@mui/material";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate } from "react-router-dom";

import {
  bulkUpdateNewsletterAdminContactStage,
  listNewsletterAdminContacts,
  listNewsletterStages,
} from "../services/newsletterService";

const marketingTabs = [
  { value: "dashboard", label: "Dashboard", icon: <InsightsRoundedIcon fontSize="small" /> },
  { value: "campaigns", label: "Campaigns", icon: <EmailRoundedIcon fontSize="small" /> },
  { value: "lists", label: "Subscription Lists", icon: <ListAltRoundedIcon fontSize="small" /> },
  { value: "contacts", label: "Contacts", icon: <ContactsRoundedIcon fontSize="small" /> },
  { value: "stages", label: "Stages", icon: <FlagRoundedIcon fontSize="small" /> },
  { value: "points", label: "Points", icon: <StarsRoundedIcon fontSize="small" /> },
  { value: "templates", label: "Templates", icon: <ViewModuleRoundedIcon fontSize="small" /> },
  { value: "analytics", label: "Analytics", icon: <AnalyticsRoundedIcon fontSize="small" /> },
  { value: "settings", label: "Settings", icon: <SettingsRoundedIcon fontSize="small" /> },
];

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

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

function NewsletterTabs({ onChange }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
      <Tabs
        value="contacts"
        onChange={(_, value) => onChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 52,
          px: { xs: 1, md: 2 },
          "& .MuiTab-root": { gap: 1, minHeight: 52, textTransform: "none", fontWeight: 750 },
          "& .Mui-selected": { color: "#0f766e !important" },
          "& .MuiTabs-indicator": { backgroundColor: "#0f766e", height: 3 },
        }}
      >
        {marketingTabs.map((tab) => (
          <Tab key={tab.value} icon={tab.icon} iconPosition="start" label={tab.label} value={tab.value} />
        ))}
      </Tabs>
    </Paper>
  );
}

export default function AdminNewsletterContactsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState("");
  const [stages, setStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stagesError, setStagesError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(null);
  const pageSize = 25;

  const loadStages = useCallback(async () => {
    setStagesLoading(true);
    setStagesError("");
    try {
      const response = await listNewsletterStages({ page: 1, page_size: 100 });
      setStages(Array.isArray(response?.results) ? response.results : []);
    } catch (err) {
      setStages([]);
      setStagesError(getErrorMessage(err, "We could not load lifecycle stages."));
    } finally {
      setStagesLoading(false);
    }
  }, []);

  const loadContacts = useCallback(
    async ({
      nextPage = page,
      nextSearch = search,
      nextStageFilter = stageFilter,
    } = {}) => {
      setLoading(true);
      setError("");
      setSelectedIds([]);
      try {
        const response = await listNewsletterAdminContacts({
          page: nextPage,
          page_size: pageSize,
          ...(nextSearch ? { search: nextSearch } : {}),
          ...(nextStageFilter ? { stage_id: nextStageFilter } : {}),
        });
        setData(response);
        setPage(response?.page || nextPage);
      } catch (err) {
        setData(null);
        setError(getErrorMessage(err, "We could not load Mautic contacts."));
      } finally {
        setLoading(false);
      }
    },
    [page, search, stageFilter]
  );

  useEffect(() => {
    loadContacts({ nextPage: 1, nextSearch: "", nextStageFilter: "" });
    loadStages();
  }, []);

  const contacts = Array.isArray(data?.results) ? data.results : [];
  const count = Number(data?.count || 0);
  const numPages = Math.max(1, Number(data?.num_pages || 1));

  const handleTabChange = (tab) => {
    if (tab === "contacts") return;
    if (tab === "stages") {
      navigate("/admin/newsletter/stages");
      return;
    }
    if (tab === "points") {
      navigate("/admin/newsletter/points");
      return;
    }
    navigate("/admin/newsletter", { state: { newsletterTab: tab } });
  };

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(1);
    loadContacts({ nextPage: 1, nextSearch, nextStageFilter: stageFilter });
  };

  const handleStageFilterChange = (event) => {
    const nextStageFilter = String(event.target.value || "");
    setStageFilter(nextStageFilter);
    setPage(1);
    setBulkMessage(null);
    loadContacts({
      nextPage: 1,
      nextSearch: search,
      nextStageFilter,
    });
  };

  const handlePageChange = (nextPage) => {
    if (loading || nextPage < 1 || nextPage > numPages) return;
    setPage(nextPage);
    loadContacts({ nextPage, nextSearch: search, nextStageFilter: stageFilter });
  };

  const toggleContactSelection = (contactId) => {
    const normalized = String(contactId);
    setSelectedIds((current) =>
      current.includes(normalized)
        ? current.filter((id) => id !== normalized)
        : [...current, normalized]
    );
  };

  const togglePageSelection = () => {
    const pageIds = contacts.map((contact) => String(contact.mautic_contact_id));
    setSelectedIds((current) =>
      pageIds.length > 0 && current.length === pageIds.length ? [] : pageIds
    );
  };

  const runBulkStageAction = async (action) => {
    if (!selectedIds.length) return;
    if (action === "move" && !bulkStageId) {
      setBulkMessage({ severity: "warning", text: "Select a target Stage first." });
      return;
    }

    setBulkLoading(true);
    setBulkMessage(null);
    try {
      const result = await bulkUpdateNewsletterAdminContactStage({
        action,
        contact_ids: selectedIds,
        ...(action === "move" ? { stage_id: bulkStageId } : {}),
      });
      const succeeded = Number(result?.succeeded || 0);
      const failed = Number(result?.failed || 0);
      const changed = Number(result?.changed || 0);
      setBulkMessage({
        severity: failed ? "warning" : "success",
        text: `${succeeded} succeeded, ${failed} failed, ${changed} changed.`,
      });
      setSelectedIds([]);
      await loadContacts({
        nextPage: page,
        nextSearch: search,
        nextStageFilter: stageFilter,
      });
    } catch (err) {
      setBulkMessage({
        severity: "error",
        text: getErrorMessage(err, "Bulk Stage update failed."),
      });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>
          Newsletter
        </Typography>
        <Typography color="text.secondary">
          Manage campaigns, subscription lists, contacts, lifecycle stages, and performance from ECP.
        </Typography>
      </Box>

      <NewsletterTabs onChange={handleTabChange} />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.5 }}>
            Contacts
          </Typography>
          <Typography color="text.secondary">
            All contacts currently available in Mautic, enriched with ECP mapping and newsletter subscription data.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshRoundedIcon />}
          onClick={() =>
            loadContacts({
              nextPage: page,
              nextSearch: search,
              nextStageFilter: stageFilter,
            })
          }
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ p: 2, borderBottom: "1px solid #E7ECEF" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
              All Contacts
            </Typography>
            {!loading && (
              <Chip
                size="small"
                label={`${count} contact${count === 1 ? "" : "s"}`}
                variant="outlined"
                color="primary"
              />
            )}
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ minWidth: { md: 680 } }}
          >
            <FormControl size="small" sx={{ minWidth: { sm: 190 } }}>
              <InputLabel id="newsletter-contact-stage-filter-label">Stage</InputLabel>
              <Select
                labelId="newsletter-contact-stage-filter-label"
                value={stageFilter}
                label="Stage"
                onChange={handleStageFilterChange}
                disabled={loading}
              >
                <MenuItem value="">All stages</MenuItem>
                <MenuItem value="none">No stage</MenuItem>
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={String(stage.id)}>
                    {stage.name || `Stage #${stage.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search contacts"
              size="small"
              fullWidth
              disabled={loading}
            />
            <Button
              variant="outlined"
              onClick={handleSearch}
              disabled={loading}
              sx={{ minWidth: 92, textTransform: "none" }}
            >
              Search
            </Button>
          </Stack>
        </Stack>

        {stagesError && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={loadStages}>
                Retry
              </Button>
            }
            sx={{ mx: 2, mt: 2 }}
          >
            {stagesError}
          </Alert>
        )}

        {bulkMessage && (
          <Alert
            severity={bulkMessage.severity}
            onClose={() => setBulkMessage(null)}
            sx={{ mx: 2, mt: 2 }}
          >
            {bulkMessage.text}
          </Alert>
        )}

        {selectedIds.length > 0 && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ p: 2, borderBottom: "1px solid #E7ECEF", bgcolor: "#F8FAFC" }}
          >
            <Chip
              label={`${selectedIds.length} selected`}
              color="primary"
              variant="outlined"
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="newsletter-bulk-stage-label">Move to Stage</InputLabel>
              <Select
                labelId="newsletter-bulk-stage-label"
                value={bulkStageId}
                label="Move to Stage"
                onChange={(event) => setBulkStageId(String(event.target.value))}
                disabled={bulkLoading || stagesLoading}
              >
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={String(stage.id)}>
                    {stage.name || `Stage #${stage.id}`}
                    {stage.weight !== null && stage.weight !== undefined
                      ? ` · Weight ${stage.weight}`
                      : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => runBulkStageAction("move")}
              disabled={bulkLoading || !bulkStageId}
              sx={{ textTransform: "none" }}
            >
              {bulkLoading ? <CircularProgress size={20} color="inherit" /> : "Move to Stage"}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => runBulkStageAction("clear")}
              disabled={bulkLoading}
              sx={{ textTransform: "none" }}
            >
              Clear Stage
            </Button>
          </Stack>
        )}

        {error ? (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() =>
                    loadContacts({
                      nextPage: page,
                      nextSearch: search,
                      nextStageFilter: stageFilter,
                    })
                  }
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        ) : loading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={48} />
            ))}
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        contacts.length > 0 && selectedIds.length === contacts.length
                      }
                      indeterminate={
                        selectedIds.length > 0 && selectedIds.length < contacts.length
                      }
                      onChange={togglePageSelection}
                      inputProps={{ "aria-label": "Select all contacts on this page" }}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Subscription Lists</TableCell>
                  <TableCell>ECP Mapping</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell align="right">Mautic ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow
                    hover
                    key={contact.mautic_contact_id}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/admin/newsletter/contacts/${contact.mautic_contact_id}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/admin/newsletter/contacts/${contact.mautic_contact_id}`);
                      }
                    }}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell
                      padding="checkbox"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.includes(String(contact.mautic_contact_id))}
                        onChange={() =>
                          toggleContactSelection(contact.mautic_contact_id)
                        }
                        inputProps={{ "aria-label": `Select ${contact.name || `Contact ${contact.mautic_contact_id}`}` }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 170 }}>
                      <Typography
                        sx={{ fontWeight: 800, color: "#1B2A4A", "&:hover": { color: "#0f766e" } }}
                      >
                        {contact.name || `Contact #${contact.mautic_contact_id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contact.points ?? 0} point{Number(contact.points || 0) === 1 ? "" : "s"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {contact.email || "—"}
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      {contact.location || "—"}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {contact.current_stage ? (
                        <Stack spacing={0.35} alignItems="flex-start">
                          <Chip
                            size="small"
                            icon={<FlagRoundedIcon />}
                            label={contact.current_stage.name || `Stage #${contact.current_stage.id}`}
                            color="info"
                            variant="outlined"
                          />
                          {contact.current_stage.weight !== null && contact.current_stage.weight !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              Weight {contact.current_stage.weight}
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No stage</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {Array.isArray(contact.subscription_lists) && contact.subscription_lists.length ? (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {contact.subscription_lists.map((item) => (
                            <Chip
                              key={item.slug}
                              size="small"
                              label={item.name || item.slug}
                              variant="outlined"
                              color="success"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No active ECP subscriptions
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 155 }}>
                      {contact.mapped_in_ecp ? (
                        <Stack spacing={0.25} alignItems="flex-start">
                          <Chip size="small" label="Mapped" color="success" />
                          <Typography variant="caption" color="text.secondary">
                            ECP User #{contact.ecp_user_id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Last sync {formatDateTime(contact.last_synced_at)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Chip size="small" label="Mautic only" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 165 }}>
                      {formatDateTime(contact.last_active_at || contact.date_modified)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700 }}>
                        #{contact.mautic_contact_id}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">
                        {search || stageFilter
                          ? "No contacts match the current filters."
                          : "No Mautic contacts found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={1.5}
          sx={{ px: 2, py: 1.5, borderTop: "1px solid #E7ECEF" }}
        >
          <Typography variant="body2" color="text.secondary">
            {count} contact{count === 1 ? "" : "s"} · Page {page} of {numPages}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handlePageChange(page - 1)}
              disabled={loading || page <= 1}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handlePageChange(page + 1)}
              disabled={loading || page >= numPages}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
