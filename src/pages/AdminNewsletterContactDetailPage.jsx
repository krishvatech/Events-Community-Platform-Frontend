import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate, useParams } from "react-router-dom";

import {
  clearNewsletterAdminContactStage,
  getNewsletterAdminContact,
  getNewsletterAdminContactEngagement,
  listNewsletterAdminContactActivity,
  listNewsletterStages,
  moveNewsletterAdminContactStage,
} from "../services/newsletterService";

const marketingTabs = [
  { value: "dashboard", label: "Dashboard", icon: <InsightsRoundedIcon fontSize="small" /> },
  { value: "campaigns", label: "Campaigns", icon: <EmailRoundedIcon fontSize="small" /> },
  { value: "lists", label: "Subscription Lists", icon: <ListAltRoundedIcon fontSize="small" /> },
  { value: "contacts", label: "Contacts", icon: <ContactsRoundedIcon fontSize="small" /> },
  { value: "stages", label: "Stages", icon: <FlagRoundedIcon fontSize="small" /> },
  { value: "audiences", label: "Audiences", icon: <GroupsRoundedIcon fontSize="small" /> },
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

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 179);
  return { from: toIsoDate(from), to: toIsoDate(to) };
};

const DEFAULT_RANGE = defaultRange();

const getErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  return data.detail || data.error || fallback;
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

function EngagementChart({ series = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 960;
  const height = 280;
  const margin = { top: 24, right: 24, bottom: 42, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const rows = Array.isArray(series) ? series : [];
  const maxValue = Math.max(1, ...rows.map((item) => Number(item.engagements || 0)));
  const xFor = (index) =>
    margin.left + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const yFor = (value) =>
    margin.top + plotHeight - (Math.max(0, Number(value || 0)) / maxValue) * plotHeight;
  const points = rows.map((item, index) => `${xFor(index)},${yFor(item.engagements)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(rows.length / 6));
  const hovered = hoveredIndex !== null ? rows[hoveredIndex] : null;

  if (!rows.length) {
    return <Box sx={{ py: 7, textAlign: "center" }}><Typography color="text.secondary">No engagement activity for this range.</Typography></Box>;
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }} onMouseLeave={() => setHoveredIndex(null)}>
      <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ display: "block", width: "100%", minWidth: 700 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = Math.round(maxValue * ratio);
          const y = yFor(value);
          return (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#E7ECEF" />
              <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748B">{value}</text>
            </g>
          );
        })}
        <polyline points={points} fill="none" stroke="#6172D9" strokeWidth="3" />
        {rows.map((item, index) => {
          const left = index === 0 ? margin.left : (xFor(index - 1) + xFor(index)) / 2;
          const right = index === rows.length - 1 ? width - margin.right : (xFor(index) + xFor(index + 1)) / 2;
          return (
            <rect
              key={`hit-${item.date}`}
              x={left}
              y={margin.top}
              width={Math.max(10, right - left)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
            />
          );
        })}
        {hovered && (
          <>
            <line
              x1={xFor(hoveredIndex)}
              x2={xFor(hoveredIndex)}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#94A3B8"
              strokeDasharray="4 4"
            />
            <circle cx={xFor(hoveredIndex)} cy={yFor(hovered.engagements)} r="5" fill="#fff" stroke="#6172D9" strokeWidth="3" />
            <g>
              <rect
                x={Math.min(width - 190, Math.max(margin.left, xFor(hoveredIndex) - 80))}
                y={Math.max(margin.top, yFor(hovered.engagements) - 84)}
                width="170"
                height="68"
                rx="8"
                fill="#fff"
                stroke="#E2E8F0"
              />
              <text
                x={Math.min(width - 178, Math.max(margin.left + 12, xFor(hoveredIndex) - 68))}
                y={Math.max(margin.top + 18, yFor(hovered.engagements) - 64)}
                fontSize="12"
                fontWeight="700"
                fill="#1E293B"
              >
                {new Date(`${hovered.date}T00:00:00`).toLocaleDateString()}
              </text>
              <text
                x={Math.min(width - 178, Math.max(margin.left + 12, xFor(hoveredIndex) - 68))}
                y={Math.max(margin.top + 38, yFor(hovered.engagements) - 44)}
                fontSize="12"
                fill="#6172D9"
              >
                {`Engagements: ${hovered.engagements}`}
              </text>
              <text
                x={Math.min(width - 178, Math.max(margin.left + 12, xFor(hoveredIndex) - 68))}
                y={Math.max(margin.top + 54, yFor(hovered.engagements) - 28)}
                fontSize="12"
                fill="#64748B"
              >
                {`Events that day: ${hovered.events}`}
              </text>
            </g>
          </>
        )}
        {rows.map((item, index) => {
          if (index % labelEvery !== 0 && index !== rows.length - 1) return null;
          return (
            <text key={item.date} x={xFor(index)} y={height - 14} textAnchor="middle" fontSize="12" fill="#64748B">
              {new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          );
        })}
      </Box>
    </Box>
  );
}

export default function AdminNewsletterContactDetailPage() {
  const navigate = useNavigate();
  const { mauticContactId } = useParams();
  const [contact, setContact] = useState(null);
  const [activity, setActivity] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [engagementError, setEngagementError] = useState("");
  const [stages, setStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stageActionLoading, setStageActionLoading] = useState(false);
  const [stageError, setStageError] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [rangeFrom, setRangeFrom] = useState(DEFAULT_RANGE.from);
  const [rangeTo, setRangeTo] = useState(DEFAULT_RANGE.to);
  const pageSize = 25;

  const loadContact = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setContact(await getNewsletterAdminContact(mauticContactId));
    } catch (err) {
      setContact(null);
      setError(getErrorMessage(err, "Failed to load contact."));
    } finally {
      setLoading(false);
    }
  }, [mauticContactId]);

  const loadActivity = useCallback(async ({ page = activityPage } = {}) => {
    setActivityLoading(true);
    setActivityError("");
    try {
      const data = await listNewsletterAdminContactActivity(mauticContactId, {
        page,
        page_size: pageSize,
      });
      setActivity(data);
      setActivityPage(data?.page || page);
    } catch (err) {
      setActivity(null);
      setActivityError(getErrorMessage(err, "Failed to load contact history."));
    } finally {
      setActivityLoading(false);
    }
  }, [mauticContactId, activityPage]);

  const loadEngagement = useCallback(async ({ from = rangeFrom, to = rangeTo } = {}) => {
    setEngagementLoading(true);
    setEngagementError("");
    try {
      setEngagement(await getNewsletterAdminContactEngagement(mauticContactId, { from, to }));
    } catch (err) {
      setEngagement(null);
      setEngagementError(getErrorMessage(err, "Failed to load engagement analytics."));
    } finally {
      setEngagementLoading(false);
    }
  }, [mauticContactId, rangeFrom, rangeTo]);

  const loadStages = useCallback(async () => {
    setStagesLoading(true);
    setStageError("");
    try {
      const first = await listNewsletterStages({ page: 1, page_size: 100 });
      const allStages = Array.isArray(first?.results) ? [...first.results] : [];
      const pages = Math.max(1, Number(first?.num_pages || 1));
      for (let nextPage = 2; nextPage <= pages; nextPage += 1) {
        const next = await listNewsletterStages({ page: nextPage, page_size: 100 });
        if (Array.isArray(next?.results)) allStages.push(...next.results);
      }
      setStages(allStages);
    } catch (err) {
      setStages([]);
      setStageError(getErrorMessage(err, "Failed to load Mautic stages."));
    } finally {
      setStagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContact();
    loadActivity({ page: 1 });
    loadEngagement(DEFAULT_RANGE);
    loadStages();
  }, [mauticContactId]);

  useEffect(() => {
    setSelectedStageId(contact?.current_stage?.id ? String(contact.current_stage.id) : "");
  }, [contact?.current_stage?.id]);

  const subscribedSegments = useMemo(
    () => (contact?.subscription_lists || []).filter((item) => item.is_subscribed),
    [contact]
  );
  const history = Array.isArray(activity?.results) ? activity.results : [];
  const historyPages = Math.max(1, Number(activity?.num_pages || 1));

  const handleTabChange = (tab) => {
    if (tab === "contacts") return navigate("/admin/newsletter/contacts");
    if (tab === "audiences") return navigate("/admin/newsletter/audiences");
    if (tab === "stages") return navigate("/admin/newsletter/stages");
    navigate("/admin/newsletter", { state: { newsletterTab: tab } });
  };

  const refreshAll = () => {
    loadContact();
    loadActivity({ page: activityPage });
    loadEngagement({ from: rangeFrom, to: rangeTo });
    loadStages();
  };

  const refreshAfterStageChange = async () => {
    await Promise.all([
      loadContact(),
      loadActivity({ page: 1 }),
      loadEngagement({ from: rangeFrom, to: rangeTo }),
    ]);
    setActivityPage(1);
  };

  const moveStage = async () => {
    if (!selectedStageId || stageActionLoading) return;
    setStageActionLoading(true);
    setStageError("");
    try {
      await moveNewsletterAdminContactStage(mauticContactId, selectedStageId);
      await refreshAfterStageChange();
    } catch (err) {
      setStageError(getErrorMessage(err, "Failed to move this contact to the selected stage."));
    } finally {
      setStageActionLoading(false);
    }
  };

  const clearStage = async () => {
    if (!contact?.current_stage || stageActionLoading) return;
    setStageActionLoading(true);
    setStageError("");
    try {
      await clearNewsletterAdminContactStage(mauticContactId);
      await refreshAfterStageChange();
    } catch (err) {
      setStageError(getErrorMessage(err, "Failed to clear this contact's stage."));
    } finally {
      setStageActionLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>Newsletter</Typography>
        <Typography color="text.secondary">Manage campaigns, subscription lists, contacts, audiences, and performance from ECP.</Typography>
      </Box>

      <NewsletterTabs onChange={handleTabChange} />

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <IconButton onClick={() => navigate("/admin/newsletter/contacts")}><ArrowBackRoundedIcon /></IconButton>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {contact?.name || `Contact #${mauticContactId}`}
              </Typography>
              {contact && <Chip size="small" label={contact.mapped_in_ecp ? "Mapped to ECP" : "Mautic only"} color={contact.mapped_in_ecp ? "success" : "default"} />}
            </Stack>
            <Typography color="text.secondary">{contact?.email || "Mautic contact activity and ECP subscription state."}</Typography>
          </Box>
        </Stack>
        <Button startIcon={<RefreshRoundedIcon />} onClick={refreshAll} disabled={loading}>Refresh</Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={9}>
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ p: 2.25, borderBottom: "1px solid #E7ECEF" }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Engagements</Typography>
                  <Typography variant="body2" color="text.secondary">Cumulative Mautic contact activity in the selected period.</Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField type="date" size="small" label="From" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                  <TextField type="date" size="small" label="To" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                  <Button variant="outlined" onClick={() => loadEngagement({ from: rangeFrom, to: rangeTo })} disabled={engagementLoading}>Apply</Button>
                </Stack>
              </Stack>
              {engagementError && <Alert severity="error" sx={{ m: 2 }}>{engagementError}</Alert>}
              <Box sx={{ p: 2 }}>
                {engagementLoading ? <Skeleton variant="rectangular" height={280} /> : <EngagementChart series={engagement?.series || []} />}
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ p: 2.25, borderBottom: "1px solid #E7ECEF" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>History</Typography>
                  {!activityLoading && <Chip size="small" label={activity?.count || 0} />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Complete Mautic contact activity, newest first.
                </Typography>
              </Stack>
              {activityError && <Alert severity="error" sx={{ m: 2 }}>{activityError}</Alert>}
              {activityLoading ? (
                <Stack spacing={1} sx={{ p: 2 }}>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} />)}</Stack>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                        <TableCell>Event Name</TableCell>
                        <TableCell>Event Type</TableCell>
                        <TableCell>Event Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((event) => (
                        <TableRow hover key={event.id}>
                          <TableCell><Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>{event.label}</Typography></TableCell>
                          <TableCell>{event.event_type || event.event || "Activity"}</TableCell>
                          <TableCell>{formatDateTime(event.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                      {!history.length && (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No contact events found.</Typography></TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderTop: "1px solid #E7ECEF" }}>
                <Typography variant="body2" color="text.secondary">Page {activityPage} of {historyPages}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" disabled={activityLoading || activityPage <= 1} onClick={() => { const page = activityPage - 1; setActivityPage(page); loadActivity({ page }); }}>Previous</Button>
                  <Button size="small" variant="outlined" disabled={activityLoading || activityPage >= historyPages} onClick={() => { const page = activityPage + 1; setActivityPage(page); loadActivity({ page }); }}>Next</Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Stack spacing={2.5}>
            {loading ? (
              <><Skeleton variant="rectangular" height={150} /><Skeleton variant="rectangular" height={260} /></>
            ) : contact ? (
              <>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF", textAlign: "center" }}>
                  <Typography variant="h3" sx={{ fontWeight: 850, color: "#1B2A4A" }}>{Number(contact.points || 0)}</Typography>
                  <Typography color="text.secondary">points</Typography>
                  <Stack spacing={0.75} sx={{ mt: 2, textAlign: "left" }}>
                    <Typography variant="body2"><strong>Mautic:</strong> #{contact.mautic_contact_id}</Typography>
                    <Typography variant="body2"><strong>ECP:</strong> {contact.mapped_in_ecp ? `User #${contact.ecp_user_id}` : "Not mapped"}</Typography>
                    <Typography variant="body2"><strong>Last active:</strong> {formatDateTime(contact.last_active_at || contact.date_modified)}</Typography>
                    <Typography variant="body2"><strong>Last sync:</strong> {formatDateTime(contact.last_synced_at)}</Typography>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Stack spacing={1.75}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FlagRoundedIcon fontSize="small" color="action" />
                        <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Lifecycle Stage</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Mautic is the source of truth for this contact's current stage.
                      </Typography>
                    </Box>

                    {stageError && <Alert severity="error">{stageError}</Alert>}

                    {contact.current_stage ? (
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip
                          icon={<FlagRoundedIcon />}
                          label={contact.current_stage.name || `Stage #${contact.current_stage.id}`}
                          color="info"
                          variant="outlined"
                          sx={{ fontWeight: 800 }}
                        />
                        {contact.current_stage.weight !== null && contact.current_stage.weight !== undefined && (
                          <Typography variant="caption" color="text.secondary">Weight {contact.current_stage.weight}</Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No stage assigned.</Typography>
                    )}

                    {stagesLoading ? (
                      <Skeleton height={48} />
                    ) : stages.length ? (
                      <>
                        <FormControl fullWidth size="small">
                          <InputLabel id="contact-stage-select-label">Move to stage</InputLabel>
                          <Select
                            labelId="contact-stage-select-label"
                            label="Move to stage"
                            value={selectedStageId}
                            onChange={(event) => setSelectedStageId(String(event.target.value))}
                            disabled={stageActionLoading}
                          >
                            {stages.map((stage) => (
                              <MenuItem key={stage.id} value={String(stage.id)}>
                                {stage.name || `Stage #${stage.id}`}
                                {stage.weight !== null && stage.weight !== undefined ? ` · Weight ${stage.weight}` : ""}
                                {stage.isPublished === false ? " · Unpublished" : ""}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={moveStage}
                            disabled={
                              stageActionLoading ||
                              !selectedStageId ||
                              String(contact.current_stage?.id || "") === selectedStageId
                            }
                            sx={{ textTransform: "none" }}
                          >
                            {stageActionLoading ? <CircularProgress size={18} color="inherit" /> : "Move to Stage"}
                          </Button>
                          {contact.current_stage && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={clearStage}
                              disabled={stageActionLoading}
                              sx={{ textTransform: "none" }}
                            >
                              Clear Stage
                            </Button>
                          )}
                        </Stack>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate("/admin/newsletter/stages")}
                        sx={{ textTransform: "none", alignSelf: "flex-start" }}
                      >
                        Manage Stages
                      </Button>
                    )}
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 2 }}>Contact</Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2"><strong>Email:</strong> {contact.email || "—"}</Typography>
                    <Typography variant="body2"><strong>Phone:</strong> {contact.contact_info?.phone || "—"}</Typography>
                    <Typography variant="body2"><strong>Mobile:</strong> {contact.contact_info?.mobile || "—"}</Typography>
                    <Typography variant="body2"><strong>Address:</strong> {contact.contact_info?.address1 || "—"}</Typography>
                    <Typography variant="body2"><strong>City:</strong> {contact.contact_info?.city || "—"}</Typography>
                    <Typography variant="body2"><strong>State:</strong> {contact.contact_info?.state || "—"}</Typography>
                    <Typography variant="body2"><strong>Country:</strong> {contact.contact_info?.country || "—"}</Typography>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1.5 }}>Segments</Typography>
                  {contact.mapped_in_ecp ? (
                    subscribedSegments.length ? (
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {subscribedSegments.map((segment) => (
                          <Chip
                            key={segment.slug}
                            size="small"
                            label={segment.name}
                            color="success"
                            variant="outlined"
                            onClick={() => navigate(`/admin/newsletter/lists/${segment.slug}`)}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No active ECP newsletter subscriptions.</Typography>
                    )
                  ) : (
                    <Typography variant="body2" color="text.secondary">ECP subscription state is unavailable for this Mautic-only contact.</Typography>
                  )}
                </Paper>
              </>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
