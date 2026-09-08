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
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate, useParams } from "react-router-dom";

import {
  deleteNewsletterCategory,
  getNewsletterCategoryContactAnalytics,
  linkNewsletterCategoryMauticSegment,
  listMauticSegments,
  listNewsletterCategoriesAdmin,
  listNewsletterCategoryContacts,
  syncNewsletterCategoryMautic,
  updateNewsletterCategory,
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

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const normalizeSegments = (data) => {
  const raw = Array.isArray(data) ? data : data?.results ?? data?.segments ?? data?.lists ?? [];
  return toArray(raw).map((segment) => ({
    ...segment,
    id: segment?.id ?? segment?.segment_id ?? segment?.segmentId,
    name: segment?.name || "Unnamed segment",
    alias: segment?.alias || "",
  }));
};

const segmentStaticState = (segment) => {
  if (typeof segment?.is_static === "boolean") return segment.is_static;
  if (typeof segment?.isStatic === "boolean") return segment.isStatic;
  if (typeof segment?.is_dynamic === "boolean") return !segment.is_dynamic;
  if (typeof segment?.isDynamic === "boolean") return !segment.isDynamic;
  if (Array.isArray(segment?.filters)) return segment.filters.length === 0;
  return null;
};

const segmentMappedState = (segment) => {
  if (typeof segment?.is_mapped === "boolean") return segment.is_mapped;
  if (typeof segment?.mapped === "boolean") return segment.mapped;
  if (segment?.mapped_category_slug || segment?.mappedCategorySlug) return true;
  return false;
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

const syncStatusPresentation = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "succeeded":
      return { label: "Synced", color: "success" };
    case "pending":
    case "processing":
      return { label: "Pending", color: "warning" };
    case "retrying":
      return { label: "Retrying", color: "warning" };
    case "failed":
      return { label: "Failed", color: "error" };
    case "skipped":
      return { label: "Skipped", color: "default" };
    case "mapped":
      return { label: "Mapped", color: "info" };
    default:
      return { label: "Not synced", color: "default" };
  }
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDefaultTimelineRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { from: toIsoDate(start), to: toIsoDate(end) };
};

const DEFAULT_TIMELINE_RANGE = buildDefaultTimelineRange();

function ContactTimelineChart({ series = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 1000;
  const height = 300;
  const margin = { top: 24, right: 28, bottom: 48, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const safeSeries = Array.isArray(series) ? series : [];
  const maxValue = Math.max(
    1,
    ...safeSeries.flatMap((item) => [
      Number(item?.added || 0),
      Number(item?.removed || 0),
      Number(item?.total || 0),
    ])
  );
  const rowWidth = safeSeries.length <= 1 ? plotWidth : plotWidth / (safeSeries.length - 1);
  const xFor = (index) =>
    margin.left +
    (safeSeries.length <= 1 ? plotWidth / 2 : (index / (safeSeries.length - 1)) * plotWidth);
  const yFor = (value) =>
    margin.top + plotHeight - (Math.max(0, Number(value || 0)) / maxValue) * plotHeight;
  const pointsFor = (key) =>
    safeSeries.map((item, index) => `${xFor(index)},${yFor(item?.[key])}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(safeSeries.length / 6));
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxValue * index) / 4)
  );
  const hoveredPoint = hoveredIndex !== null ? safeSeries[hoveredIndex] : null;
  const tooltipWidth = 158;
  const tooltipHeight = 92;
  const tooltipX = hoveredIndex === null
    ? 0
    : Math.max(
        margin.left,
        Math.min(
          width - margin.right - tooltipWidth,
          xFor(hoveredIndex) - tooltipWidth / 2
        )
      );
  const tooltipBaseY = hoveredPoint
    ? Math.min(
        yFor(Math.max(
          Number(hoveredPoint?.added || 0),
          Number(hoveredPoint?.removed || 0),
          Number(hoveredPoint?.total || 0)
        )),
        yFor(0)
      )
    : margin.top;
  const tooltipY = Math.max(margin.top, tooltipBaseY - tooltipHeight - 16);

  if (safeSeries.length === 0) {
    return (
      <Box sx={{ py: 7, textAlign: "center" }} onMouseLeave={() => setHoveredIndex(null)}>
        <Typography color="text.secondary">No contact activity is available for this range.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }} onMouseLeave={() => setHoveredIndex(null)}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Contacts in time chart showing added, removed, and total subscribers"
        sx={{ display: "block", width: "100%", minWidth: 720, height: "auto" }}
      >
        {safeSeries.map((item, index) => {
          const centerX = xFor(index);
          const rectX = index === 0
            ? margin.left
            : centerX - rowWidth / 2;
          const rectWidth = index === safeSeries.length - 1
            ? width - margin.right - rectX
            : rowWidth;
          return (
            <rect
              key={`hover-target-${item.date}`}
              x={rectX}
              y={margin.top}
              width={Math.max(16, rectWidth)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
            />
          );
        })}

        {yTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                stroke="#E7ECEF"
                strokeWidth="1"
              />
              <text
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748B"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <polyline points={pointsFor("total")} fill="none" stroke="#F97360" strokeWidth="3" />
        <polyline points={pointsFor("added")} fill="none" stroke="#6172D9" strokeWidth="2.5" />
        <polyline points={pointsFor("removed")} fill="none" stroke="#20B8A6" strokeWidth="2.5" />

        {hoveredPoint && (
          <>
            <line
              x1={xFor(hoveredIndex)}
              x2={xFor(hoveredIndex)}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />

            <circle
              cx={xFor(hoveredIndex)}
              cy={yFor(hoveredPoint.total)}
              r="5"
              fill="#FFFFFF"
              stroke="#F97360"
              strokeWidth="3"
            />
            <circle
              cx={xFor(hoveredIndex)}
              cy={yFor(hoveredPoint.added)}
              r="4.5"
              fill="#FFFFFF"
              stroke="#6172D9"
              strokeWidth="2.5"
            />
            <circle
              cx={xFor(hoveredIndex)}
              cy={yFor(hoveredPoint.removed)}
              r="4.5"
              fill="#FFFFFF"
              stroke="#20B8A6"
              strokeWidth="2.5"
            />

            <g>
              <rect
                x={tooltipX}
                y={tooltipY}
                rx="10"
                ry="10"
                width={tooltipWidth}
                height={tooltipHeight}
                fill="#FFFFFF"
                stroke="#E2E8F0"
              />
              <text
                x={tooltipX + 12}
                y={tooltipY + 20}
                fontSize="12"
                fontWeight="700"
                fill="#1E293B"
              >
                {new Date(`${hoveredPoint.date}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </text>

              <text x={tooltipX + 12} y={tooltipY + 42} fontSize="12" fill="#6172D9">
                {`Added: ${Number(hoveredPoint.added || 0)}`}
              </text>
              <text x={tooltipX + 12} y={tooltipY + 58} fontSize="12" fill="#20B8A6">
                {`Removed: ${Number(hoveredPoint.removed || 0)}`}
              </text>
              <text x={tooltipX + 12} y={tooltipY + 74} fontSize="12" fill="#F97360">
                {`Total: ${Number(hoveredPoint.total || 0)}`}
              </text>
            </g>
          </>
        )}

        {safeSeries.map((item, index) => {
          if (index % labelEvery !== 0 && index !== safeSeries.length - 1) return null;
          const label = new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return (
            <text
              key={item.date}
              x={xFor(index)}
              y={height - 16}
              textAnchor="middle"
              fontSize="12"
              fill="#64748B"
            >
              {label}
            </text>
          );
        })}
      </Box>
    </Box>
  );
}

function NewsletterTabs({ onChange }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
      <Tabs
        value="lists"
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

export default function AdminNewsletterListManagePage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [contactsData, setContactsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [error, setError] = useState("");
  const [contactsError, setContactsError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [segments, setSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState("");
  const [timelineFrom, setTimelineFrom] = useState(DEFAULT_TIMELINE_RANGE.from);
  const [timelineTo, setTimelineTo] = useState(DEFAULT_TIMELINE_RANGE.to);
  const [timelineAppliedRange, setTimelineAppliedRange] = useState(DEFAULT_TIMELINE_RANGE);
  const pageSize = 25;

  const loadCategory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterCategoriesAdmin({ includeMautic: true });
      const rows = Array.isArray(data) ? data : data?.results || [];
      const match = rows.find((item) => item.slug === slug);
      if (!match) throw new Error("Subscription list not found.");
      setCategory(match);
      return match;
    } catch (err) {
      setCategory(null);
      setError(getErrorMessage(err, "We could not load this subscription list."));
      return null;
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadContacts = useCallback(
    async ({ nextPage = page, nextSearch = search } = {}) => {
      setContactsLoading(true);
      setContactsError("");
      try {
        const data = await listNewsletterCategoryContacts(slug, {
          page: nextPage,
          page_size: pageSize,
          ...(nextSearch ? { search: nextSearch } : {}),
        });
        setContactsData(data);
        setPage(data?.page || nextPage);
      } catch (err) {
        setContactsData(null);
        setContactsError(getErrorMessage(err, "We could not load subscribers."));
      } finally {
        setContactsLoading(false);
      }
    },
    [slug, page, search]
  );

  const loadTimeline = useCallback(
    async ({ from = timelineAppliedRange.from, to = timelineAppliedRange.to } = {}) => {
      setTimelineLoading(true);
      setTimelineError("");
      try {
        const data = await getNewsletterCategoryContactAnalytics(slug, { from, to });
        setTimelineData(data);
        setTimelineAppliedRange({ from, to });
      } catch (err) {
        setTimelineData(null);
        setTimelineError(getErrorMessage(err, "We could not load contact timeline analytics."));
      } finally {
        setTimelineLoading(false);
      }
    },
    [slug, timelineAppliedRange]
  );

  useEffect(() => {
    loadCategory();
    loadContacts({ nextPage: 1, nextSearch: "" });
    setTimelineFrom(DEFAULT_TIMELINE_RANGE.from);
    setTimelineTo(DEFAULT_TIMELINE_RANGE.to);
    loadTimeline(DEFAULT_TIMELINE_RANGE);
  }, [slug]);

  const contacts = Array.isArray(contactsData?.results) ? contactsData.results : [];
  const count = Number(contactsData?.count || 0);
  const numPages = Math.max(1, Number(contactsData?.num_pages || 1));
  const segmentId = category?.mautic_segment_id ? String(category.mautic_segment_id) : "";

  const selectableSegments = useMemo(
    () =>
      segments.filter((segment) => {
        const staticState = segmentStaticState(segment);
        return (
          staticState !== false &&
          !segmentMappedState(segment) &&
          segment.id !== null &&
          segment.id !== undefined &&
          segment.id !== ""
        );
      }),
    [segments]
  );

  const refreshAll = async () => {
    await Promise.all([
      loadCategory(),
      loadContacts({ nextPage: page, nextSearch: search }),
      loadTimeline(),
    ]);
  };

  const applyTimelineRange = () => {
    if (!timelineFrom || !timelineTo) {
      setTimelineError("Select both From and To dates.");
      return;
    }
    loadTimeline({ from: timelineFrom, to: timelineTo });
  };

  const handleTabChange = (value) => {
    if (value === "contacts") {
      navigate("/admin/newsletter/contacts");
      return;
    }
    if (value === "stages") {
      navigate("/admin/newsletter/stages");
      return;
    }
    if (value === "points") {
      navigate("/admin/newsletter/points");
      return;
    }
    navigate("/admin/newsletter", { state: { newsletterTab: value } });
  };

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(1);
    loadContacts({ nextPage: 1, nextSearch });
  };

  const handlePageChange = (nextPage) => {
    if (contactsLoading || nextPage < 1 || nextPage > numPages) return;
    setPage(nextPage);
    loadContacts({ nextPage, nextSearch: search });
  };

  const openEdit = () => {
    setEditForm({
      name: category?.name || "",
      description: category?.description || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    setAction("edit");
    try {
      await updateNewsletterCategory(slug, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
      setEditOpen(false);
      setSnack({ open: true, severity: "success", message: "Subscription list updated and synced." });
      await loadCategory();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to update subscription list.") });
    } finally {
      setAction("");
    }
  };

  const syncMautic = async () => {
    setAction("sync");
    try {
      const result = await syncNewsletterCategoryMautic(slug);
      setSnack({ open: true, severity: "success", message: result?.detail || result?.message || "Mautic sync completed." });
      await refreshAll();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Mautic sync failed.") });
    } finally {
      setAction("");
    }
  };

  const deactivate = async () => {
    setAction("deactivate");
    try {
      await deleteNewsletterCategory(slug);
      setDeactivateOpen(false);
      setSnack({ open: true, severity: "success", message: "Subscription list deactivated." });
      await loadCategory();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to deactivate subscription list.") });
    } finally {
      setAction("");
    }
  };

  const reactivate = async () => {
    setAction("reactivate");
    try {
      await updateNewsletterCategory(slug, { is_active: true });
      setSnack({ open: true, severity: "success", message: "Subscription list reactivated." });
      await loadCategory();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to reactivate subscription list.") });
    } finally {
      setAction("");
    }
  };

  const openConnect = async () => {
    setConnectOpen(true);
    setSelectedSegmentId("");
    setSegments([]);
    setSegmentsError("");
    setSegmentsLoading(true);
    try {
      const data = await listMauticSegments();
      setSegments(normalizeSegments(data));
    } catch (err) {
      setSegmentsError(getErrorMessage(err, "Failed to load Mautic segments."));
    } finally {
      setSegmentsLoading(false);
    }
  };

  const connect = async () => {
    if (!selectedSegmentId) return;
    setAction("connect");
    try {
      const result = await linkNewsletterCategoryMauticSegment(slug, selectedSegmentId);
      setConnectOpen(false);
      setSelectedSegmentId("");
      setSnack({ open: true, severity: "success", message: result?.detail || result?.message || "Mautic segment connected." });
      await refreshAll();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to connect Mautic segment.") });
    } finally {
      setAction("");
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>
          Newsletter
        </Typography>
        <Typography color="text.secondary">
          Manage campaigns, subscription lists, contacts, lifecycle stages, scoring, templates, and performance from ECP.
        </Typography>
      </Box>

      <NewsletterTabs onChange={handleTabChange} />

      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <IconButton
            onClick={() => navigate("/admin/newsletter", { state: { newsletterTab: "lists" } })}
            aria-label="Back to subscription lists"
          >
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {loading ? "Subscription List" : category?.name || slug}
              </Typography>
              {category && (
                <Chip
                  size="small"
                  label={category.is_active ? "Active" : "Inactive"}
                  color={category.is_active ? "success" : "default"}
                  variant={category.is_active ? "filled" : "outlined"}
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Stack>
            <Typography color="text.secondary">
              {category?.description || "Manage list settings, Mautic connection, and subscribers."}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button startIcon={<RefreshRoundedIcon />} onClick={refreshAll} disabled={loading || contactsLoading || Boolean(action)}>
            Refresh
          </Button>
          <Button startIcon={<EditRoundedIcon />} onClick={openEdit} disabled={!category || Boolean(action)}>
            Edit
          </Button>
          <Button startIcon={<SyncRoundedIcon />} onClick={syncMautic} disabled={!category || Boolean(action)}>
            {action === "sync" ? "Syncing..." : segmentId ? "Sync / Repair" : "Create / Sync Mautic"}
          </Button>
          {!segmentId && (
            <Button startIcon={<LinkRoundedIcon />} onClick={openConnect} disabled={!category || Boolean(action)}>
              Connect Existing
            </Button>
          )}
          {category?.is_active ? (
            <Button color="error" startIcon={<PowerSettingsNewRoundedIcon />} onClick={() => setDeactivateOpen(true)} disabled={Boolean(action)}>
              Deactivate
            </Button>
          ) : (
            <Button color="success" startIcon={<RestoreRoundedIcon />} onClick={reactivate} disabled={Boolean(action)}>
              {action === "reactivate" ? "Reactivating..." : "Reactivate"}
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={3} key={index}>
              <Skeleton variant="rectangular" height={108} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : category ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", height: "100%" }}>
              <Typography variant="body2" color="text.secondary">Current Subscribers</Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mt: 0.5 }}>{count}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", height: "100%" }}>
              <Typography variant="body2" color="text.secondary">Mautic</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mt: 0.75 }}>
                {segmentId ? `Connected · Segment #${segmentId}` : "Not connected"}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", height: "100%" }}>
              <Typography variant="body2" color="text.secondary">Slug</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mt: 0.75 }}>{category.slug}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", height: "100%" }}>
              <Typography variant="body2" color="text.secondary">ECP Status</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mt: 0.75 }}>
                {category.is_active ? "Active" : "Inactive"}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", lg: "center" }}
          sx={{ p: 2.25, borderBottom: "1px solid #E7ECEF" }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>
              Contacts in time
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subscriber additions, removals, and total active subscribers from ECP history.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <TextField
              type="date"
              label="From"
              size="small"
              value={timelineFrom}
              onChange={(event) => setTimelineFrom(event.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={timelineLoading}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              label="To"
              size="small"
              value={timelineTo}
              onChange={(event) => setTimelineTo(event.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={timelineLoading}
              sx={{ minWidth: 160 }}
            />
            <Button
              variant="outlined"
              onClick={applyTimelineRange}
              disabled={timelineLoading || !timelineFrom || !timelineTo}
              sx={{ minWidth: 92 }}
            >
              Apply
            </Button>
          </Stack>
        </Stack>

        {timelineError && <Alert severity="error" sx={{ m: 2 }}>{timelineError}</Alert>}

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ px: 2.25, pt: 2 }}
        >
          <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#6172D9" }} />
              <Typography variant="body2">Added</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#20B8A6" }} />
              <Typography variant="body2">Removed</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#F97360" }} />
              <Typography variant="body2">Total</Typography>
            </Stack>
          </Stack>

          {timelineData && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                variant="outlined"
                label={`Start ${timelineData.range_start_total ?? 0}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`End ${timelineData.range_end_total ?? 0}`}
              />
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`Current ${timelineData.current_total ?? count}`}
              />
            </Stack>
          )}
        </Stack>

        <Box sx={{ px: 2.25, pb: 2.25 }}>
          {timelineLoading ? (
            <Skeleton variant="rectangular" height={300} sx={{ mt: 2, borderRadius: 1.5 }} />
          ) : (
            <ContactTimelineChart series={timelineData?.series || []} />
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ p: 2.25, borderBottom: "1px solid #E7ECEF" }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>Subscribers</Typography>
            <Typography variant="body2" color="text.secondary">
              Current ECP subscribers and their Mautic synchronization status.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: { md: 460 } }}>
            <TextField
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search name, email, or username"
              size="small"
              fullWidth
              disabled={contactsLoading}
            />
            <Button variant="outlined" onClick={handleSearch} disabled={contactsLoading}>Search</Button>
          </Stack>
        </Stack>

        {contactsError && <Alert severity="error" sx={{ m: 2 }}>{contactsError}</Alert>}

        {contactsLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={46} />)}
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Mautic Contact</TableCell>
                  <TableCell>Sync Status</TableCell>
                  <TableCell>Subscribed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => {
                  const syncState = syncStatusPresentation(contact.sync_status);
                  return (
                    <TableRow hover key={String(contact.user_id)}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>{contact.name || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">ECP User #{contact.user_id}</Typography>
                      </TableCell>
                      <TableCell>{contact.email || "—"}</TableCell>
                      <TableCell>
                        {contact.mautic_contact_id ? (
                          <Stack spacing={0.25}>
                            <Typography sx={{ fontWeight: 700 }}>Contact #{contact.mautic_contact_id}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {contact.last_synced_at ? `Last sync ${formatDateTime(contact.last_synced_at)}` : "Mapped"}
                            </Typography>
                          </Stack>
                        ) : (
                          <Chip size="small" label="Not mapped" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.35} alignItems="flex-start">
                          <Chip
                            size="small"
                            label={syncState.label}
                            color={syncState.color}
                            variant={syncState.color === "success" ? "filled" : "outlined"}
                          />
                          {contact.sync_error ? (
                            <Tooltip title={contact.sync_error}>
                              <Typography variant="caption" color="error" sx={{ maxWidth: 180 }} noWrap>
                                {contact.sync_error}
                              </Typography>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography>{formatDateTime(contact.subscribed_at)}</Typography>
                        <Typography variant="caption" color="text.secondary">{contact.source || "—"}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contacts.length === 0 && !contactsError && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">
                        {search ? "No subscribers match this search." : "No current subscribers in this subscription list."}
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
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ px: 2, py: 1.5, borderTop: "1px solid #E7ECEF" }}
        >
          <Typography variant="body2" color="text.secondary">
            {count} subscriber{count === 1 ? "" : "s"} · Page {page} of {numPages}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => handlePageChange(page - 1)} disabled={contactsLoading || page <= 1}>
              Previous
            </Button>
            <Button size="small" variant="outlined" onClick={() => handlePageChange(page + 1)} disabled={contactsLoading || page >= numPages}>
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>List Settings</Typography>
            <Typography variant="body2" color="text.secondary">
              ECP remains the source of truth for list metadata, active state, and newsletter consent.
            </Typography>
          </Box>
          <Stack spacing={0.5} sx={{ minWidth: { md: 320 } }}>
            <Typography variant="body2"><strong>Name:</strong> {category?.name || "—"}</Typography>
            <Typography variant="body2"><strong>Slug:</strong> {category?.slug || "—"}</Typography>
            <Typography variant="body2"><strong>Mautic:</strong> {segmentId ? `Segment #${segmentId}` : "Not connected"}</Typography>
            <Typography variant="body2"><strong>Status:</strong> {category?.is_active ? "Active" : "Inactive"}</Typography>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={editOpen} onClose={() => action !== "edit" && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Subscription List</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="List Name"
              value={editForm.name}
              onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
              fullWidth
              required
              disabled={action === "edit"}
            />
            <TextField label="Slug" value={slug} fullWidth disabled helperText="Stable integration identifier." />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
              multiline
              rows={4}
              fullWidth
              disabled={action === "edit"}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={action === "edit"}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={action === "edit" || !editForm.name.trim()}>
            {action === "edit" ? <CircularProgress size={20} color="inherit" /> : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deactivateOpen} onClose={() => action !== "deactivate" && setDeactivateOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Deactivate Subscription List?</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary">
            Members will no longer be able to subscribe to this list, and its mapped Mautic segment will be unpublished.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateOpen(false)} disabled={action === "deactivate"}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deactivate} disabled={action === "deactivate"}>
            {action === "deactivate" ? <CircularProgress size={20} color="inherit" /> : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={connectOpen} onClose={() => action !== "connect" && setConnectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Connect Existing Mautic Segment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Link an existing unassigned static Mautic segment. Existing ECP subscriptions will be reconciled after linking.
            </Typography>
            {segmentsError && <Alert severity="error">{segmentsError}</Alert>}
            {segmentsLoading ? (
              <Skeleton variant="rectangular" height={48} />
            ) : (
              <Select
                value={selectedSegmentId}
                onChange={(event) => setSelectedSegmentId(String(event.target.value))}
                displayEmpty
                fullWidth
              >
                <MenuItem value="" disabled>Select a Mautic segment</MenuItem>
                {segments.map((segment) => {
                  const staticState = segmentStaticState(segment);
                  const mapped = segmentMappedState(segment);
                  const disabled = staticState === false || mapped || segment.id === null || segment.id === undefined || segment.id === "";
                  return (
                    <MenuItem key={String(segment.id ?? segment.alias ?? segment.name)} value={String(segment.id ?? "")} disabled={disabled}>
                      {segment.name} (#{segment.id ?? "-"}){staticState === false ? " · Dynamic" : ""}{mapped ? " · Already mapped" : ""}
                    </MenuItem>
                  );
                })}
              </Select>
            )}
            {!segmentsLoading && !segmentsError && segments.length > 0 && selectableSegments.length === 0 && (
              <Alert severity="info">No unassigned static Mautic segments are available.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectOpen(false)} disabled={action === "connect"}>Cancel</Button>
          <Button variant="contained" onClick={connect} disabled={action === "connect" || !selectedSegmentId}>
            {action === "connect" ? <CircularProgress size={20} color="inherit" /> : "Connect"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
