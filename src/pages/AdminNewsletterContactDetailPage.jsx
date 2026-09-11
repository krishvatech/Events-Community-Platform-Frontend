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
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate, useParams } from "react-router-dom";

import MauticDynamicFields from "../components/marketing/MauticDynamicFields.jsx";

import {
  adjustNewsletterAdminContactPointGroup,
  adjustNewsletterAdminContactPoints,
  addNewsletterAdminContactDnc,
  addNewsletterAdminContactTag,
  clearNewsletterAdminContactStage,
  createNewsletterAdminContactNote,
  getNewsletterAdminContact,
  getNewsletterAdminContactEngagement,
  addNewsletterCompanyContact,
  listNewsletterAdminContactCompanies,
  listNewsletterCompanies,
  listNewsletterFields,
  removeNewsletterCompanyContact,
  listNewsletterAdminContactFieldMetadata,
  listNewsletterAdminContactActivity,
  listNewsletterAdminContactNotes,
  listNewsletterAdminContactPointGroups,
  listNewsletterPointGroups,
  listNewsletterStages,
  moveNewsletterAdminContactStage,
  removeNewsletterAdminContactDnc,
  removeNewsletterAdminContactTag,
  updateNewsletterAdminContact,
} from "../services/newsletterService";

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

/** Picks an existing Mautic company to associate with this contact. */
function AddCompanyDialog({ open, busy, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    listNewsletterCompanies({ page_size: 10 })
      .then((data) => {
        if (active) setResults(Array.isArray(data?.results) ? data.results : []);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Could not load companies from Mautic."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const runSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterCompanies({ search: query.trim(), page_size: 10 });
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not search companies."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 850 }}>Add Contact to a Company</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder="Search companies by name"
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
            <Skeleton variant="rounded" height={120} />
          ) : results.length ? (
            <Stack spacing={1}>
              {results.map((company) => (
                <Paper key={company.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }} noWrap>
                        {company.name || `Company #${company.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {[company.email, company.city, company.country].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      onClick={() => onSelect(company)}
                      sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
                    >
                      Add
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No companies found. Create one in Marketing → Companies.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
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
  const [pointAmount, setPointAmount] = useState("1");
  const [pointReason, setPointReason] = useState("");
  const [pointActionLoading, setPointActionLoading] = useState(false);
  const [pointError, setPointError] = useState("");
  const [pointSuccess, setPointSuccess] = useState("");
  const [pointGroups, setPointGroups] = useState([]);
  const [groupScores, setGroupScores] = useState([]);
  const [groupScoresLoading, setGroupScoresLoading] = useState(true);
  const [groupScoresError, setGroupScoresError] = useState("");
  const [selectedPointGroupId, setSelectedPointGroupId] = useState("");
  const [groupPointAmount, setGroupPointAmount] = useState("1");
  const [groupPointReason, setGroupPointReason] = useState("");
  const [groupPointActionLoading, setGroupPointActionLoading] = useState(false);
  const [groupPointSuccess, setGroupPointSuccess] = useState("");
  const [contactDetailTab, setContactDetailTab] = useState("overview");
  const [activityPage, setActivityPage] = useState(1);
  const [rangeFrom, setRangeFrom] = useState(DEFAULT_RANGE.from);
  const [rangeTo, setRangeTo] = useState(DEFAULT_RANGE.to);
  const [editContact, setEditContact] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState(null);
  const [fieldMetadata, setFieldMetadata] = useState([]);
  const [contactFields, setContactFields] = useState([]);
  const [customEdits, setCustomEdits] = useState({});
  const [customSaving, setCustomSaving] = useState(false);
  const [customMessage, setCustomMessage] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState("");
  const [dncLoading, setDncLoading] = useState(false);
  const [dncError, setDncError] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [scoringLoaded, setScoringLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [communicationLoaded, setCommunicationLoaded] = useState(false);
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
      setActivityLoaded(true);
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
      setActivityLoaded(true);
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

  const loadPointGroupScores = useCallback(async () => {
    setGroupScoresLoading(true);
    setGroupScoresError("");
    try {
      const first = await listNewsletterPointGroups({ page: 1, page_size: 100 });
      const allGroups = Array.isArray(first?.results) ? [...first.results] : [];
      const pages = Math.max(1, Number(first?.num_pages || 1));
      for (let nextPage = 2; nextPage <= pages; nextPage += 1) {
        const next = await listNewsletterPointGroups({ page: nextPage, page_size: 100 });
        if (Array.isArray(next?.results)) allGroups.push(...next.results);
      }

      const scores = await listNewsletterAdminContactPointGroups(mauticContactId);
      setPointGroups(allGroups);
      setGroupScores(Array.isArray(scores?.results) ? scores.results : []);
      setScoringLoaded(true);
      setSelectedPointGroupId((current) => {
        if (current && allGroups.some((group) => String(group.id) === String(current))) {
          return current;
        }
        return allGroups[0]?.id ? String(allGroups[0].id) : "";
      });
    } catch (err) {
      setPointGroups([]);
      setGroupScores([]);
      setGroupScoresError(
        getErrorMessage(err, "Failed to load this contact's Mautic Point Group scores.")
      );
    } finally {
      setGroupScoresLoading(false);
    }
  }, [mauticContactId]);

  const loadContactCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError("");
    try {
      const companiesData = await listNewsletterAdminContactCompanies(mauticContactId);
      setCompanies(Array.isArray(companiesData?.results) ? companiesData.results : []);
    } catch (err) {
      setCompaniesError(getErrorMessage(err, "Failed to load contact companies."));
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  }, [mauticContactId]);

  const loadContactMetadata = useCallback(async () => {
    setCustomMessage(null);
    try {
      const [fieldsData, definitions] = await Promise.all([
        listNewsletterAdminContactFieldMetadata(),
        listNewsletterFields("contact", { published_only: true }),
      ]);
      setFieldMetadata(Array.isArray(fieldsData?.results) ? fieldsData.results : []);
      setContactFields(Array.isArray(definitions?.results) ? definitions.results : []);
      setCustomEdits({});
      setProfileLoaded(true);
    } catch (err) {
      setCustomMessage({
        severity: "error",
        text: getErrorMessage(err, "Failed to load contact custom fields."),
      });
      setFieldMetadata([]);
      setContactFields([]);
    }
  }, []);

  const loadContactNotes = useCallback(async () => {
    setNotesLoading(true);
    setNoteError("");
    try {
      const notesData = await listNewsletterAdminContactNotes(mauticContactId, { page: 1, page_size: 25 });
      setNotes(Array.isArray(notesData?.results) ? notesData.results : []);
      setCommunicationLoaded(true);
    } catch (err) {
      setNoteError(getErrorMessage(err, "Failed to load contact notes or metadata."));
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [mauticContactId]);

  // Company membership lives only in Mautic; ECP stores no relationship record.
  const handleRemoveCompany = useCallback(
    async (company) => {
      setCompanyBusy(true);
      setCompaniesError("");
      try {
        await removeNewsletterCompanyContact(company.id, mauticContactId);
        await loadContactCompanies();
      } catch (err) {
        setCompaniesError(getErrorMessage(err, "Mautic rejected the company change."));
      } finally {
        setCompanyBusy(false);
      }
    },
    [mauticContactId, loadContactCompanies]
  );

  const handleAddCompany = useCallback(
    async (company) => {
      setCompanyBusy(true);
      setCompaniesError("");
      try {
        await addNewsletterCompanyContact(company.id, mauticContactId);
        setCompanyDialogOpen(false);
        await loadContactCompanies();
      } catch (err) {
        setCompaniesError(getErrorMessage(err, "Mautic rejected the company change."));
      } finally {
        setCompanyBusy(false);
      }
    },
    [mauticContactId, loadContactCompanies]
  );

  useEffect(() => {
    setActivityLoaded(false);
    setScoringLoaded(false);
    setProfileLoaded(false);
    setCommunicationLoaded(false);
    setActivity(null);
    setEngagement(null);
    setGroupScores([]);
    setPointGroups([]);
    setFieldMetadata([]);
    setContactFields([]);
    setNotes([]);
    setCustomEdits({});
    setActivityPage(1);
    loadContact();
    loadStages();
    loadContactCompanies();
  }, [mauticContactId]);

  useEffect(() => {
    if (contactDetailTab === "activity" && !activityLoaded) {
      loadActivity({ page: 1 });
      loadEngagement(DEFAULT_RANGE);
      return;
    }

    if (contactDetailTab === "scoring" && !scoringLoaded) {
      loadPointGroupScores();
      return;
    }

    if (contactDetailTab === "profile" && !profileLoaded) {
      loadContactMetadata();
      return;
    }

    if (contactDetailTab === "communication" && !communicationLoaded) {
      loadContactNotes();
    }
  }, [
    contactDetailTab,
    activityLoaded,
    scoringLoaded,
    profileLoaded,
    communicationLoaded,
    loadActivity,
    loadEngagement,
    loadPointGroupScores,
    loadContactMetadata,
    loadContactNotes,
  ]);

  useEffect(() => {
    setSelectedStageId(contact?.current_stage?.id ? String(contact.current_stage.id) : "");
    setEditContact({
      firstname: contact?.contact_info?.first_name || "",
      lastname: contact?.contact_info?.last_name || "",
      email: contact?.contact_info?.email || contact?.email || "",
      phone: contact?.contact_info?.phone || "",
      mobile: contact?.contact_info?.mobile || "",
      company: contact?.contact_info?.company || "",
      city: contact?.contact_info?.city || "",
      state: contact?.contact_info?.state || "",
      zipcode: contact?.contact_info?.zipcode || "",
      country: contact?.contact_info?.country || "",
    });
  }, [contact]);

  // Core identity fields already have dedicated inputs in the edit form above, so the
  // Custom Fields panel covers everything else Mautic publishes.
  const customContactFields = useMemo(
    () => contactFields.filter((field) => field.group !== "core"),
    [contactFields]
  );

  const subscribedSegments = useMemo(
    () => (contact?.subscription_lists || []).filter((item) => item.is_subscribed),
    [contact]
  );
  const history = Array.isArray(activity?.results) ? activity.results : [];
  const historyPages = Math.max(1, Number(activity?.num_pages || 1));
  const pointGroupScoreMap = useMemo(
    () =>
      new Map(
        groupScores.map((item) => [
          String(item.group_id),
          Number(item.score || 0),
        ])
      ),
    [groupScores]
  );

  const refreshAll = () => {
    loadContact();
    if (contactDetailTab === "overview") {
      loadStages();
      loadContactCompanies();
    }
    if (contactDetailTab === "activity") {
      loadActivity({ page: activityPage });
      loadEngagement({ from: rangeFrom, to: rangeTo });
    }
    if (contactDetailTab === "scoring") {
      loadPointGroupScores();
    }
    if (contactDetailTab === "profile") {
      loadContactMetadata();
    }
    if (contactDetailTab === "communication") {
      loadContactNotes();
    }
  };

  const saveContact = async () => {
    setEditLoading(true);
    setEditMessage(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(editContact).filter(([, value]) => String(value || "").trim())
      );
      const updated = await updateNewsletterAdminContact(mauticContactId, payload);
      setContact(updated);
      setEditMessage({ severity: "success", text: "Contact updated in Mautic." });
    } catch (err) {
      setEditMessage({ severity: "error", text: getErrorMessage(err, "Failed to update contact.") });
    } finally {
      setEditLoading(false);
    }
  };

  // Sends only the custom fields the admin actually changed, so unrelated Mautic
  // values are never rewritten by a save.
  const saveCustomFields = async () => {
    setCustomSaving(true);
    setCustomMessage(null);
    try {
      const updated = await updateNewsletterAdminContact(mauticContactId, {
        custom_fields: customEdits,
      });
      setContact(updated);
      setCustomEdits({});
      setCustomMessage({ severity: "success", text: "Custom fields updated in Mautic." });
    } catch (err) {
      setCustomMessage({
        severity: "error",
        text: getErrorMessage(err, "Failed to update custom fields."),
      });
    } finally {
      setCustomSaving(false);
    }
  };

  const addTag = async () => {
    if (!tagInput.trim()) return;
    setTagLoading(true);
    setTagError("");
    try {
      setContact(await addNewsletterAdminContactTag(mauticContactId, tagInput.trim()));
      setTagInput("");
    } catch (err) {
      setTagError(getErrorMessage(err, "Failed to add tag."));
    } finally {
      setTagLoading(false);
    }
  };

  const removeTag = async (tag) => {
    setTagLoading(true);
    setTagError("");
    try {
      setContact(await removeNewsletterAdminContactTag(mauticContactId, tag));
    } catch (err) {
      setTagError(getErrorMessage(err, "Failed to remove tag."));
    } finally {
      setTagLoading(false);
    }
  };

  const createNote = async () => {
    if (!noteText.trim()) return;
    setNotesLoading(true);
    setNoteError("");
    try {
      await createNewsletterAdminContactNote(mauticContactId, { text: noteText.trim() });
      setNoteText("");
      await loadContactNotes();
    } catch (err) {
      setNoteError(getErrorMessage(err, "Failed to add note."));
    } finally {
      setNotesLoading(false);
    }
  };

  const addDnc = async () => {
    setDncLoading(true);
    setDncError("");
    try {
      setContact(await addNewsletterAdminContactDnc(mauticContactId, { channel: "email", reason: 3 }));
    } catch (err) {
      setDncError(getErrorMessage(err, "Failed to add communication restriction."));
    } finally {
      setDncLoading(false);
    }
  };

  const removeDnc = async (channel) => {
    setDncLoading(true);
    setDncError("");
    try {
      setContact(await removeNewsletterAdminContactDnc(mauticContactId, channel));
    } catch (err) {
      setDncError(getErrorMessage(err, "Failed to remove communication restriction."));
    } finally {
      setDncLoading(false);
    }
  };

  const refreshAfterStageChange = async () => {
    await loadContact();
    if (activityLoaded) {
      await Promise.all([
        loadActivity({ page: 1 }),
        loadEngagement({ from: rangeFrom, to: rangeTo }),
      ]);
      setActivityPage(1);
    }
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

  const adjustPoints = async (operation) => {
    if (pointActionLoading) return;
    const amountText = String(pointAmount || "").trim();
    if (!/^\d+$/.test(amountText) || Number(amountText) <= 0) {
      setPointSuccess("");
      setPointError("Enter a positive whole-number point amount.");
      return;
    }
    setPointActionLoading(true);
    setPointError("");
    setPointSuccess("");
    try {
      const result = await adjustNewsletterAdminContactPoints(mauticContactId, {
        operation,
        amount: Number(amountText),
        ...(pointReason.trim() ? { reason: pointReason.trim() } : {}),
      });
      setPointSuccess(
        `${operation === "add" ? "Added" : "Subtracted"} ${result?.amount ?? Number(amountText)} points. Current score: ${result?.points ?? "updated"}.`
      );
      setPointReason("");
      await loadContact();
      if (activityLoaded) {
        await Promise.all([
          loadActivity({ page: 1 }),
          loadEngagement({ from: rangeFrom, to: rangeTo }),
        ]);
        setActivityPage(1);
      }
    } catch (err) {
      setPointError(getErrorMessage(err, "Failed to adjust this contact's points."));
    } finally {
      setPointActionLoading(false);
    }
  };

  const adjustPointGroupScore = async (operation) => {
    if (groupPointActionLoading) return;
    if (!selectedPointGroupId) {
      setGroupPointSuccess("");
      setGroupScoresError("Select a Point Group first.");
      return;
    }

    const amountText = String(groupPointAmount || "").trim();
    if (!/^\d+$/.test(amountText) || Number(amountText) <= 0) {
      setGroupPointSuccess("");
      setGroupScoresError("Enter a positive whole-number Point Group amount.");
      return;
    }

    setGroupPointActionLoading(true);
    setGroupScoresError("");
    setGroupPointSuccess("");
    try {
      const result = await adjustNewsletterAdminContactPointGroup(
        mauticContactId,
        selectedPointGroupId,
        {
          operation,
          amount: Number(amountText),
          ...(groupPointReason.trim() ? { reason: groupPointReason.trim() } : {}),
        }
      );
      setGroupPointSuccess(
        `${operation === "add" ? "Added" : "Subtracted"} ${result?.amount ?? Number(amountText)} points in ${result?.group_name || `Point Group #${selectedPointGroupId}`}. Score: ${result?.score ?? "updated"}.`
      );
      setGroupPointReason("");
      await loadPointGroupScores();
      if (activityLoaded) {
        await Promise.all([
          loadActivity({ page: 1 }),
          loadEngagement({ from: rangeFrom, to: rangeTo }),
        ]);
        setActivityPage(1);
      }
    } catch (err) {
      setGroupScoresError(
        getErrorMessage(err, "Failed to adjust this contact's Point Group score.")
      );
    } finally {
      setGroupPointActionLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
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

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={contactDetailTab}
            onChange={(_, value) => setContactDetailTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Activity" value="activity" />
            <Tab label="Scoring" value="scoring" />
            <Tab label="Profile" value="profile" />
            <Tab label="Communication" value="communication" />
          </Tabs>
        </Box>
      </Paper>

      <Grid container spacing={2.5}>
        {contactDetailTab === "activity" && (
        <Grid item xs={12}>
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
        )}

        {contactDetailTab !== "activity" && (
        <Grid item xs={12}>
          <Stack spacing={2.5}>
            {loading ? (
              <><Skeleton variant="rectangular" height={150} /><Skeleton variant="rectangular" height={260} /></>
            ) : contact ? (
              <>
                {contactDetailTab === "scoring" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF", textAlign: "center" }}>
                  <Typography variant="h3" sx={{ fontWeight: 850, color: "#1B2A4A" }}>{Number(contact.points || 0)}</Typography>
                  <Typography color="text.secondary">points</Typography>
                  <Stack spacing={0.75} sx={{ mt: 2, textAlign: "left" }}>
                    <Typography variant="body2"><strong>Mautic:</strong> #{contact.mautic_contact_id}</Typography>
                    <Typography variant="body2"><strong>ECP:</strong> {contact.mapped_in_ecp ? `User #${contact.ecp_user_id}` : "Not mapped"}</Typography>
                    <Typography variant="body2"><strong>Last active:</strong> {formatDateTime(contact.last_active_at || contact.date_modified)}</Typography>
                    <Typography variant="body2"><strong>Last sync:</strong> {formatDateTime(contact.last_synced_at)}</Typography>
                  </Stack>
                  <Stack spacing={1.25} sx={{ mt: 2.25, textAlign: "left" }}>
                    {pointError && <Alert severity="error">{pointError}</Alert>}
                    {pointSuccess && <Alert severity="success">{pointSuccess}</Alert>}
                    <TextField
                      label="Point amount"
                      type="number"
                      size="small"
                      value={pointAmount}
                      onChange={(event) => setPointAmount(event.target.value)}
                      inputProps={{ min: 1, step: 1 }}
                      disabled={pointActionLoading}
                      fullWidth
                    />
                    <TextField
                      label="Reason (optional)"
                      size="small"
                      value={pointReason}
                      onChange={(event) => setPointReason(event.target.value)}
                      inputProps={{ maxLength: 240 }}
                      helperText="Saved in native Mautic point activity."
                      disabled={pointActionLoading}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => adjustPoints("add")}
                        disabled={pointActionLoading}
                        sx={{ textTransform: "none", flex: 1 }}
                      >
                        {pointActionLoading ? <CircularProgress size={18} color="inherit" /> : "Add"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => adjustPoints("subtract")}
                        disabled={pointActionLoading}
                        sx={{ textTransform: "none", flex: 1 }}
                      >
                        Subtract
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
                )}

                {contactDetailTab === "scoring" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Stack spacing={1.75}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StarsRoundedIcon fontSize="small" sx={{ color: "#0f766e" }} />
                        <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Point Group Scores</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Separate provider-backed Mautic scores for each Point Group.
                      </Typography>
                    </Box>

                    {groupScoresError && <Alert severity="error">{groupScoresError}</Alert>}
                    {groupPointSuccess && <Alert severity="success">{groupPointSuccess}</Alert>}

                    {groupScoresLoading ? (
                      <Stack spacing={1}>
                        <Skeleton height={38} />
                        <Skeleton height={38} />
                        <Skeleton height={48} />
                      </Stack>
                    ) : pointGroups.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No Mautic Point Groups are configured yet.
                      </Typography>
                    ) : (
                      <>
                        <Stack
                          spacing={1}
                          sx={{ maxHeight: 220, overflowY: "auto", pr: 0.5 }}
                        >
                          {pointGroups.map((group) => {
                            const score = pointGroupScoreMap.get(String(group.id)) ?? 0;
                            return (
                              <Stack
                                key={group.id}
                                direction="row"
                                spacing={1}
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ py: 0.75, borderBottom: "1px solid #EEF2F6" }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 750, color: "#1B2A4A" }}>
                                    {group.name || `Point Group #${group.id}`}
                                  </Typography>
                                  {group.description && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: "block",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {group.description}
                                    </Typography>
                                  )}
                                </Box>
                                <Chip
                                  size="small"
                                  label={`${score} pts`}
                                  variant="outlined"
                                  color={score > 0 ? "success" : score < 0 ? "warning" : "default"}
                                  sx={{ fontWeight: 800, flexShrink: 0 }}
                                />
                              </Stack>
                            );
                          })}
                        </Stack>

                        <FormControl fullWidth size="small">
                          <InputLabel id="contact-point-group-select-label">Adjust Point Group</InputLabel>
                          <Select
                            labelId="contact-point-group-select-label"
                            label="Adjust Point Group"
                            value={selectedPointGroupId}
                            onChange={(event) => {
                              setSelectedPointGroupId(String(event.target.value));
                              setGroupScoresError("");
                              setGroupPointSuccess("");
                            }}
                            disabled={groupPointActionLoading}
                          >
                            {pointGroups.map((group) => (
                              <MenuItem key={group.id} value={String(group.id)}>
                                {group.name || `Point Group #${group.id}`} · {pointGroupScoreMap.get(String(group.id)) ?? 0} pts
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <TextField
                          label="Group point amount"
                          type="number"
                          size="small"
                          value={groupPointAmount}
                          onChange={(event) => setGroupPointAmount(event.target.value)}
                          inputProps={{ min: 1, step: 1 }}
                          disabled={groupPointActionLoading}
                          fullWidth
                        />

                        <TextField
                          label="Reason (optional)"
                          size="small"
                          value={groupPointReason}
                          onChange={(event) => setGroupPointReason(event.target.value)}
                          inputProps={{ maxLength: 240 }}
                          helperText="Recorded in native Mautic Point Group activity."
                          disabled={groupPointActionLoading}
                          fullWidth
                        />

                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => adjustPointGroupScore("add")}
                            disabled={groupPointActionLoading || !selectedPointGroupId}
                            sx={{ textTransform: "none", flex: 1 }}
                          >
                            {groupPointActionLoading ? <CircularProgress size={18} color="inherit" /> : "Add"}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => adjustPointGroupScore("subtract")}
                            disabled={groupPointActionLoading || !selectedPointGroupId}
                            sx={{ textTransform: "none", flex: 1 }}
                          >
                            Subtract
                          </Button>
                        </Stack>
                      </>
                    )}
                  </Stack>
                </Paper>
                )}

                {contactDetailTab === "overview" && (
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
                )}

                {contactDetailTab === "profile" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 2 }}>Contact</Typography>
                  {editMessage && <Alert severity={editMessage.severity} sx={{ mb: 2 }}>{editMessage.text}</Alert>}
                  <Stack spacing={1}>
                    {[
                      ["firstname", "First name"],
                      ["lastname", "Last name"],
                      ["email", "Email"],
                      ["phone", "Phone"],
                      ["mobile", "Mobile"],
                      ["company", "Company"],
                      ["city", "City"],
                      ["state", "State"],
                      ["zipcode", "Zipcode"],
                      ["country", "Country"],
                    ].map(([field, label]) => (
                      <TextField
                        key={field}
                        label={label}
                        size="small"
                        value={editContact[field] || ""}
                        onChange={(event) => setEditContact((state) => ({ ...state, [field]: event.target.value }))}
                        disabled={editLoading}
                        fullWidth
                      />
                    ))}
                    <Button variant="contained" onClick={saveContact} disabled={editLoading} sx={{ textTransform: "none" }}>
                      {editLoading ? <CircularProgress size={18} color="inherit" /> : "Save Contact"}
                    </Button>
                  </Stack>
                </Paper>
                )}

                {contactDetailTab === "communication" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1.5 }}>Tags</Typography>
                  {tagError && <Alert severity="error" sx={{ mb: 1.5 }}>{tagError}</Alert>}
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {(contact.tags || []).length ? contact.tags.map((tag) => (
                      <Chip
                        key={tag.tag}
                        label={tag.tag}
                        onDelete={() => removeTag(tag.tag)}
                        disabled={tagLoading}
                        variant="outlined"
                      />
                    )) : <Typography variant="body2" color="text.secondary">No tags.</Typography>}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="Add tag" value={tagInput} onChange={(event) => setTagInput(event.target.value)} fullWidth disabled={tagLoading} />
                    <Button variant="outlined" onClick={addTag} disabled={tagLoading || !tagInput.trim()}>Add</Button>
                  </Stack>
                </Paper>
                )}

                {contactDetailTab === "communication" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1.5 }}>Notes</Typography>
                  {noteError && <Alert severity="error" sx={{ mb: 1.5 }}>{noteError}</Alert>}
                  <Stack spacing={1.25} sx={{ mb: 2 }}>
                    {notesLoading ? <Skeleton height={80} /> : notes.length ? notes.map((note) => (
                      <Box key={note.id} sx={{ borderBottom: "1px solid #EEF2F6", pb: 1 }}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{note.text || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[note.type, note.createdByUser, formatDateTime(note.dateAdded)].filter(Boolean).join(" · ")}
                        </Typography>
                      </Box>
                    )) : <Typography variant="body2" color="text.secondary">No notes.</Typography>}
                  </Stack>
                  <TextField
                    label="Add note"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                    disabled={notesLoading}
                  />
                  <Button variant="outlined" onClick={createNote} disabled={notesLoading || !noteText.trim()} sx={{ mt: 1, textTransform: "none" }}>
                    Add Note
                  </Button>
                </Paper>
                )}

                {contactDetailTab === "communication" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1.5 }}>Communication Restrictions</Typography>
                  {dncError && <Alert severity="error" sx={{ mb: 1.5 }}>{dncError}</Alert>}
                  <Stack spacing={1.25}>
                    {(contact.communication_restrictions || []).length ? contact.communication_restrictions.map((rule) => (
                      <Stack key={rule.channel} direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 750 }}>{rule.channel}</Typography>
                          <Typography variant="caption" color="text.secondary">{rule.comments || "Native Mautic DNC"}</Typography>
                        </Box>
                        <Button size="small" color="warning" onClick={() => removeDnc(rule.channel)} disabled={dncLoading}>Remove</Button>
                      </Stack>
                    )) : <Typography variant="body2" color="text.secondary">No native Mautic DNC restrictions.</Typography>}
                    <Button variant="outlined" color="warning" onClick={addDnc} disabled={dncLoading} sx={{ textTransform: "none" }}>
                      Add Email DNC
                    </Button>
                  </Stack>
                </Paper>
                )}

                {contactDetailTab === "profile" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 1.5 }}>Custom Fields</Typography>
                  {customMessage ? (
                    <Alert severity={customMessage.severity} sx={{ mb: 1.5 }}>{customMessage.text}</Alert>
                  ) : null}
                  <MauticDynamicFields
                    fields={customContactFields}
                    values={{ ...(contact.custom_fields || {}), ...customEdits }}
                    onChange={(alias, value) =>
                      setCustomEdits((current) => {
                        const next = { ...current, [alias]: value };
                        const stored = contact.custom_fields?.[alias] ?? "";
                        if (String(stored) === String(value)) delete next[alias];
                        return next;
                      })
                    }
                    disabled={customSaving}
                    emptyMessage="No custom contact fields are published in Mautic. Add one in Settings → Custom Fields."
                  />
                  {customContactFields.length ? (
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ mt: 2 }}>
                      {Object.keys(customEdits).length ? (
                        <Typography variant="body2" color="text.secondary">
                          {`${Object.keys(customEdits).length} changed`}
                        </Typography>
                      ) : null}
                      <Button
                        onClick={() => setCustomEdits({})}
                        disabled={!Object.keys(customEdits).length || customSaving}
                        sx={{ textTransform: "none" }}
                      >
                        Discard
                      </Button>
                      <Button
                        variant="contained"
                        onClick={saveCustomFields}
                        disabled={!Object.keys(customEdits).length || customSaving}
                        startIcon={customSaving ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
                      >
                        Save to Mautic
                      </Button>
                    </Stack>
                  ) : null}
                </Paper>
                )}

                {contactDetailTab === "overview" && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Companies</Typography>
                    <Button
                      size="small"
                      startIcon={<AddRoundedIcon />}
                      onClick={() => setCompanyDialogOpen(true)}
                      disabled={companyBusy}
                      sx={{ textTransform: "none" }}
                    >
                      Add
                    </Button>
                  </Stack>
                  {companiesError && <Alert severity="error" sx={{ mb: 1.5 }}>{companiesError}</Alert>}
                  <Stack spacing={1}>
                    {companiesLoading ? <Skeleton height={64} /> : companies.length ? companies.map((company) => (
                      <Stack
                        key={company.id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                        sx={{ borderBottom: "1px solid #EEF2F6", pb: 1 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 750, color: "#0f766e", cursor: "pointer" }}
                            onClick={() => navigate(`/admin/newsletter/companies/${company.id}`)}
                            noWrap
                          >
                            {company.name || `Company #${company.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[company.email, company.city, company.country, company.is_primary ? "Primary" : ""].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        <Tooltip title="Remove from company">
                          <span>
                            <IconButton
                              size="small"
                              disabled={companyBusy}
                              onClick={() => handleRemoveCompany(company)}
                            >
                              <LinkOffRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    )) : <Typography variant="body2" color="text.secondary">No associated companies returned by Mautic.</Typography>}
                  </Stack>
                </Paper>
                )}

                {contactDetailTab === "overview" && (
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
                )}
              </>
            ) : null}
          </Stack>
        </Grid>
        )}
      </Grid>

      <AddCompanyDialog
        open={companyDialogOpen}
        busy={companyBusy}
        onClose={() => setCompanyDialogOpen(false)}
        onSelect={handleAddCompany}
      />
    </Stack>
  );
}
