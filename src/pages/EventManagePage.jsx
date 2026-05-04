// src/pages/EventManagePage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import RegisteredActions from "../components/RegisteredActions";
import InviteUsersDialog from "../components/InviteUsersDialog";
import InviteEmailsDialog from "../components/InviteEmailsDialog";

import {
  Avatar,
  Box,
  Button,
  Chip,
  Checkbox,
  Slider,
  Container,
  Divider,
  Grid,
  CircularProgress,
  LinearProgress,
  Paper,
  Snackbar,
  Alert,
  AlertTitle,
  Stack,
  Typography,
  Tabs,
  Tab,
  Drawer,
  TextField,
  InputAdornment,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel,
  FormGroup,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import EditEventForm from "../components/EditEventForm.jsx";
import EventPreApprovalManager from "../components/admin/EventPreApprovalManager.jsx";
import EventQnAManager from "../components/admin/EventQnAManager.jsx";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import AddIcon from "@mui/icons-material/Add";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PeopleTwoToneIcon from "@mui/icons-material/PeopleTwoTone";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { getJoinButtonText, isPostEventLoungeOpen, isPreEventLoungeOpen, getResolvedJoinLabel } from "../utils/gracePeriodUtils";
import { useSecondTick } from "../utils/useGracePeriodTimer";
import { resolveRecordingUrl } from "../utils/recordingUrl";

import { isOwnerUser, isStaffUser } from "../utils/adminRole.js"; // MOD: added isStaffUser

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

// ---- API helpers ----
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;
const API_ORIGIN = API_ROOT.replace(/\/api$/, "");

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";

const toAbs = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};

const isVerifiedStatus = (raw) => {
  const v = String(raw || "").toLowerCase();
  return v === "approved" || v === "verified";
};

// ---- Status helpers ----
// ---- Status helpers ----
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const computeStatus = (ev) => {
  if (!ev) return "upcoming";
  const now = Date.now();
  const s = ev.start_time ? dayjs(ev.start_time).valueOf() : 0;
  const e = ev.end_time ? dayjs(ev.end_time).valueOf() : 0;

  if (ev.status === "cancelled") return "cancelled";
  if (ev.status === "ended") return "past";
  if (ev.is_live && ev.status !== "ended") return "live";
  if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
};

const statusChip = (status) => {
  switch (status) {
    case "live":
      return { label: "Live", color: "error", bg: "rgba(248,113,113,0.12)" };
    case "upcoming":
      return { label: "Upcoming", color: "success", bg: "rgba(34,197,94,0.08)" };
    case "past":
      return { label: "Past", color: "default", bg: "rgba(148,163,184,0.16)" };
    case "deregistered":
      return { label: "Deregistered", color: "default", bg: "rgba(100,116,139,0.16)" };
    case "cancelled":
      return { label: "Cancelled", color: "default", bg: "rgba(100,116,139,0.16)" };
    default:
      return { label: "—", color: "default", bg: "rgba(148,163,184,0.16)" };
  }
};

const fmtDateRange = (start, end) => {
  if (!start && !end) return "Not scheduled";
  try {
    const s = dayjs(start);
    const e = dayjs(end);
    if (s.isValid() && e.isValid() && s.isSame(e, 'day')) {
      return `${s.format("MMM D, YYYY")} • ${s.format("h:mm A")} – ${e.format("h:mm A")}`;
    }
    if (s.isValid() && e.isValid()) {
      return `${s.format("MMM D, YYYY h:mm A")} → ${e.format("MMM D, YYYY h:mm A")}`;
    }
    if (s.isValid()) return s.format("MMM D, YYYY h:mm A");
    if (e.isValid()) return `Ends: ${e.format("MMM D, YYYY h:mm A")}`;
    return "Invalid date";
  } catch {
    return `${start || ""} – ${end || ""}`;
  }
};


// Allow join X minutes before the event start (used for staff view)
const canJoinEarly = (ev, minutes = 15) => {
  if (!ev?.start_time) return false;

  const startMs = new Date(ev.start_time).getTime();
  if (!Number.isFinite(startMs)) return false;

  const now = Date.now();
  const diff = startMs - now;           // ms until start
  const windowMs = minutes * 60 * 1000; // e.g. 15 minutes

  // true only if event hasn't started yet, but is within the early-join window
  return diff > 0 && diff <= windowMs;
};

// ---- Tabs / pagination ----
const EVENT_TAB_LABELS = ["Overview", "Product Management", "Edit", "Applications", "Registered Members", "Guest Audit", "Session", "Resources", "Q&A", "Speed Networking", "Breakout Rooms Tables", "Social Lounge", "Lounge Settings"];
const STAFF_EVENT_TAB_LABELS = ["Overview", "Resources"];

// Helper to get dynamic tab labels based on event registration type
const getTabLabels = (event, isOwner) => {
  if (!isOwner) return STAFF_EVENT_TAB_LABELS;
  let labels = [...EVENT_TAB_LABELS];
  // Remove Applications tab if it's not an 'apply' type event
  if (event?.registration_type !== 'apply') {
    labels = labels.filter(label => label !== "Applications");
  }
  // Only show Product Management tab for paid events (is_free === false strictly)
  if (event?.is_free !== false) {
    labels = labels.filter(label => label !== "Product Management");
  }
  return labels;
};
const MEMBERS_PER_PAGE = 10;
const RESOURCES_PER_PAGE = 5;



export default function EventManagePage() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialEvent = location.state?.event || null;

  const [event, setEvent] = useState(initialEvent);
  const [eventLoading, setEventLoading] = useState(!initialEvent);
  const [eventError, setEventError] = useState("");

  // Get auth token
  const token = getToken();

  // New: Current Viewer State for Timezone
  const [currentUser, setCurrentUser] = useState(null);

  // Force re-render every second to keep join button text current
  useSecondTick();

  useEffect(() => {
    // 1. Try to get from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("user"));
      if (stored) {
        setCurrentUser(stored);
        // If we have a stored user, we can also try to refresh it in background
        // to ensure we have the latest profile.timezone
      }
    } catch { }

    // 2. Fetch fresh "me" to get latest profile settings (timezone)
    const fetchMe = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_ROOT}/users/me/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setCurrentUser(json);
          // Optional: update localStorage so other pages see it too
          localStorage.setItem("user", JSON.stringify(json));
        }
      } catch (err) {
        console.warn("Failed to refresh current user for timezone", err);
      }
    };
    fetchMe();
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // 'deregister' | 'approve' | 'reject'
  const [selectedReg, setSelectedReg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState("");
  const [guestAuditRows, setGuestAuditRows] = useState([]);
  const [guestAuditLoading, setGuestAuditLoading] = useState(false);
  const [guestAuditError, setGuestAuditError] = useState("");
  const [guestAuditSearch, setGuestAuditSearch] = useState("");
  const [guestAuditSort, setGuestAuditSort] = useState("latest");

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionEditOpen, setSessionEditOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDeleteDialogOpen, setSessionDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  // Hosting/Joining State
  const [hostingId, setHostingId] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [errOpen, setErrOpen] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Add Session state
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    title: "",
    description: "",
    session_date: "",
    start_time: "",
    end_time: "",
    session_type: "main",
  });
  const [addSessionLoading, setAddSessionLoading] = useState(false);

  const [tab, setTab] = useState(0);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState("newest");
  const [memberPage, setMemberPage] = useState(1);

  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const [resourceSort, setResourceSort] = useState("newest");
  const [resourcePage, setResourcePage] = useState(1);

  const [loungeTables, setLoungeTables] = useState([]);
  const [loungeLoading, setLoungeLoading] = useState(false);
  const [loungeError, setLoungeError] = useState("");
  const [loungeCreateOpen, setLoungeCreateOpen] = useState(false);
  const [loungeCreateCategory, setLoungeCreateCategory] = useState("LOUNGE"); // 'LOUNGE' | 'BREAKOUT'
  const [loungeCreateName, setLoungeCreateName] = useState("Networking Table");
  const [loungeCreateSeats, setLoungeCreateSeats] = useState("4");
  const [loungeCreateSaving, setLoungeCreateSaving] = useState(false);
  const [loungeCreateIcon, setLoungeCreateIcon] = useState(null);
  const [loungeCreatePreview, setLoungeCreatePreview] = useState("");
  const [loungeEditOpen, setLoungeEditOpen] = useState(false);
  const [loungeEditTarget, setLoungeEditTarget] = useState(null);
  const [loungeEditName, setLoungeEditName] = useState("");
  const [loungeEditSeats, setLoungeEditSeats] = useState("4");
  const [loungeEditSaving, setLoungeEditSaving] = useState(false);
  const [loungeEditIcon, setLoungeEditIcon] = useState(null);
  const [loungeEditPreview, setLoungeEditPreview] = useState("");
  const [loungeDeleteOpen, setLoungeDeleteOpen] = useState(false);
  const [loungeDeleteTarget, setLoungeDeleteTarget] = useState(null);
  const [loungeDeleteSaving, setLoungeDeleteSaving] = useState(false);

  // Speed Networking State
  const [speedNetworkingSessions, setSpeedNetworkingSessions] = useState([]);
  const [speedNetworkingLoading, setSpeedNetworkingLoading] = useState(false);
  const [speedNetworkingError, setSpeedNetworkingError] = useState("");
  const [speedNetworkingCreateOpen, setSpeedNetworkingCreateOpen] = useState(false);
  const [speedNetworkingEditOpen, setSpeedNetworkingEditOpen] = useState(false);
  const [speedNetworkingEditTarget, setSpeedNetworkingEditTarget] = useState(null);
  const [speedNetworkingDeleteOpen, setSpeedNetworkingDeleteOpen] = useState(false);
  const [speedNetworkingDeleteTarget, setSpeedNetworkingDeleteTarget] = useState(null);
  const [speedNetworkingActionLoading, setSpeedNetworkingActionLoading] = useState(false);

  // Add Participant Dialog State
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [addParticipantEmail, setAddParticipantEmail] = useState("");
  const [addParticipantLoading, setAddParticipantLoading] = useState(false);
  const [inviteUsersOpen, setInviteUsersOpen] = useState(false);
  const [inviteEmailsOpen, setInviteEmailsOpen] = useState(false);
  const [regsRefresh, setRegsRefresh] = useState(0);

  // User Search State
  const [userOptions, setUserOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Connection Request State
  const [connectionRequestLoading, setConnectionRequestLoading] = useState({});
  const [connectionRequestError, setConnectionRequestError] = useState("");
  const [friendStatusByUser, setFriendStatusByUser] = useState({});

  // Lounge Settings State
  const [loungeSettingsSaving, setLoungeSettingsSaving] = useState(false);
  const [loungeSettings, setLoungeSettings] = useState({
    lounge_enabled_before: false,
    lounge_before_buffer: 30,
    lounge_enabled_during: true,
    lounge_enabled_breaks: false,
    lounge_enabled_speed_networking: false,
    lounge_enabled_after: false,
    lounge_after_buffer: 30,
  });

  // Participant Visibility Settings State
  const [visibilitySettingsSaving, setVisibilitySettingsSaving] = useState(false);
  const [participantVisibility, setParticipantVisibility] = useState({
    show_participants_before_event: true,
    show_participants_after_event: false,
    show_registered_participant_count: true,
    show_public_hosts: true,
    show_public_speakers: true,
    show_public_moderators: false,
    show_speed_networking_match_history: true,
  });

  // Speed Networking Form State
  const [speedNetworkingFormName, setSpeedNetworkingFormName] = useState("");
  const [speedNetworkingFormDuration, setSpeedNetworkingFormDuration] = useState("5");
  const [speedNetworkingFormBuffer, setSpeedNetworkingFormBuffer] = useState("15");
  const [speedNetworkingFormStrategy, setSpeedNetworkingFormStrategy] = useState("both");

  // Matching Criteria Configuration State
  const [criteriaConfig, setCriteriaConfig] = useState({
    skill: { enabled: false, threshold: 50 },
    location: { enabled: false, threshold: 50 },
    experience: { enabled: false, threshold: 50 },
    education: { enabled: false, threshold: 50 },
    interest_based: {
      enabled: false,
      match_mode: "complementary",
      tags: []
    }
  });
  const [interestTagInput, setInterestTagInput] = useState("");
  const [showAddTagDialog, setShowAddTagDialog] = useState(false);
  const [tagLabel, setTagLabel] = useState("");
  const [tagCategory, setTagCategory] = useState("");
  const [tagType, setTagType] = useState("both");

  const isOwner = (event?.created_by_id === currentUser?.id) || isOwnerUser();
  const isStaff = isStaffUser();
  const canManageLounge = isOwner; // Only owner can manage lounge now

  // Q&A Export State
  const [qnaExportLoading, setQnaExportLoading] = useState({ csv: false, pdf: false });
  const [qnaExportError, setQnaExportError] = useState("");

  // Post-Event Q&A Answer State
  const [postEventQnaQuestions, setPostEventQnaQuestions] = useState([]);
  const [postEventAnsweredQuestions, setPostEventAnsweredQuestions] = useState([]);
  const [postEventQnaLoading, setPostEventQnaLoading] = useState(false);
  const [postEventQnaError, setPostEventQnaError] = useState("");
  const [answerModalOpen, setAnswerModalOpen] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [notifyAuthor, setNotifyAuthor] = useState(true);
  const [notifyInterested, setNotifyInterested] = useState(true);
  const [notifyAll, setNotifyAll] = useState(false);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  // Seconds remaining in the post-event lounge (null when lounge is inactive)
  const [loungeTimeRemaining, setLoungeTimeRemaining] = useState(null);

  // Cancel Event State
  const [cancelEventOpen, setCancelEventOpen] = useState(false);
  const [cancelEventLoading, setCancelEventLoading] = useState(false);
  const [cancellationMessage, setCancellationMessage] = useState("");
  const [recommendedEventId, setRecommendedEventId] = useState("");
  const [notifyParticipants, setNotifyParticipants] = useState(true);
  const [hostedEvents, setHostedEvents] = useState([]);

  // Hide Event State (platform_admin only, for cancelled events)
  const [hideEventOpen, setHideEventOpen] = useState(false);
  const [hideEventLoading, setHideEventLoading] = useState(false);

  // Delete Event State (platform_admin only, for cancelled events)
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [deleteEventLoading, setDeleteEventLoading] = useState(false);

  // Saleor Product Management State
  const [saleorProduct, setSaleorProduct] = useState(null);
  const [saleorLoading, setSaleorLoading] = useState(false);
  const [saleorError, setSaleorError] = useState("");
  const [saleorSaving, setSaleorSaving] = useState(false);
  const [saleorChannels, setSaleorChannels] = useState([]);
  const [saleorWarehouses, setSaleorWarehouses] = useState([]);
  const [saleorPriceChanges, setSaleorPriceChanges] = useState({}); // { channelId: price }
  const [saleorStockChanges, setSaleorStockChanges] = useState({}); // { warehouseId: quantity }
  const [saleorName, setSaleorName] = useState("");
  const [saleorDescription, setSaleorDescription] = useState("");

  // Discount Management State
  const [saleorDiscounts, setSaleorDiscounts] = useState([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [deletingDiscountId, setDeletingDiscountId] = useState(null);
  const [syncingDiscountId, setSyncingDiscountId] = useState(null);
  const [productDirty, setProductDirty] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    name: "",
    description: "",
    channel_id: "",
    reward_value_type: "PERCENTAGE",
    reward_value: "",
    start_date: "",
    end_date: "",
    badge_label: "early_bird"
  });

  const extractTextFromSaleorDescription = useCallback((desc) => {
    if (!desc) return "";
    try {
      const data = typeof desc === "string" ? JSON.parse(desc) : desc;
      return (data.blocks || [])
        .filter(b => b.type === "paragraph")
        .map(b => b.data?.text || "")
        .join("\n");
    } catch (e) {
      console.warn("Failed to parse Saleor description", e);
      return typeof desc === "string" ? desc : "";
    }
  }, []);

  // Fetch hosted events for recommendation dropdown
  useEffect(() => {
    if (!cancelEventOpen || !isOwner) return;
    const fetchHosted = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_ROOT}/events/hosted/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json.results || []);
          // filter out current event
          setHostedEvents(list.filter(e => e.id !== parseInt(eventId)));
        }
      } catch (err) {
        console.error("Failed to fetch hosted events", err);
      }
    };
    fetchHosted();
  }, [cancelEventOpen, isOwner, eventId]);

  const tabLabels = getTabLabels(event, isOwner);
  const guestAuditTabIndex = tabLabels.indexOf("Guest Audit");
  const speedNetworkingTabIndex = tabLabels.indexOf("Speed Networking");
  const productManagementTabIndex = tabLabels.indexOf("Product Management");

  const fetchSaleorProduct = useCallback(async () => {
    if (!eventId || !isOwner) return;
    setSaleorLoading(true);
    setSaleorError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/saleor-product/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const data = json.data || {};
      setSaleorProduct(data.product || null);
      setSaleorChannels(data.channels || []);
      setSaleorWarehouses(data.warehouses?.edges?.map(e => e.node) || []);
      
      // Initialize changes
      const prices = {};
      const stocks = {};
      
      const variant = data.product?.variants?.[0];
      if (variant) {
        variant.channelListings?.forEach(cl => {
          prices[cl.channel.id] = cl.price?.amount || 0;
        });
        variant.stocks?.forEach(s => {
          stocks[s.warehouse.id] = s.quantity || 0;
        });
      }
      setSaleorPriceChanges(prices);
      setSaleorStockChanges(stocks);
      setSaleorName(data.product?.name || "");
      setSaleorDescription(extractTextFromSaleorDescription(data.product?.description));
    } catch (err) {
      console.error("Failed to fetch Saleor product:", err);
      setSaleorError(err.message || "Failed to load Saleor product details");
    } finally {
      setSaleorLoading(false);
    }
  }, [eventId, isOwner]);

  const fetchSaleorDiscounts = useCallback(async () => {
    if (!eventId || !isOwner) return;
    setDiscountLoading(true);
    setDiscountError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/saleor-discounts/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const discounts = json.discounts || [];
      setSaleorDiscounts(discounts);

      // Auto-sync all discounts from Saleor in background (don't block UI)
      if (discounts.length > 0) {
        discounts.forEach((discount) => {
          fetch(`${API_ROOT}/events/${eventId}/saleor-discounts/${discount.id}/sync/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }).catch((err) => {
            // Silently fail - sync is non-critical
            console.debug(`Auto-sync failed for discount ${discount.id}:`, err);
          });
        });
      }
    } catch (err) {
      console.error("Failed to fetch Saleor discounts:", err);
      setDiscountError(err.message || "Failed to load discounts");
    } finally {
      setDiscountLoading(false);
    }
  }, [eventId, isOwner]);

  useEffect(() => {
    if (productManagementTabIndex !== -1 && tab === productManagementTabIndex) {
      fetchSaleorProduct();
      fetchSaleorDiscounts();
    }
  }, [tab, productManagementTabIndex, fetchSaleorProduct, fetchSaleorDiscounts]);

  const openCreateDiscount = () => {
    setEditingDiscount(null);
    setDiscountForm({
      name: "",
      description: "",
      channel_id: "",
      reward_value_type: "PERCENTAGE",
      reward_value: "",
      start_date: "",
      end_date: "",
      badge_label: "early_bird"
    });
    setDiscountDialogOpen(true);
  };

  const extractTextFromDescription = (desc) => {
    if (!desc) return "";

    // Handle object
    if (typeof desc === "object" && !Array.isArray(desc)) {
      if (desc.blocks && Array.isArray(desc.blocks)) {
        return desc.blocks.map((b) => b.data?.text || "").join("\n").trim();
      }
      return "";
    }

    // Handle string
    if (typeof desc === "string") {
      // Try JSON parse first
      try {
        const parsed = JSON.parse(desc);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          return parsed.blocks.map((b) => b.data?.text || "").join("\n").trim();
        }
      } catch (e) {
        // Not valid JSON
      }

      // Try to extract from Python dict string format {'blocks': [...]}
      try {
        const blockMatch = desc.match(/'blocks':\s*\[(.*?)\]/);
        if (blockMatch) {
          // Extract text values between 'text': '...'
          const textMatches = desc.matchAll(/'text':\s*'([^']*)'/g);
          const texts = Array.from(textMatches).map((m) => m[1]);
          return texts.join("\n").trim();
        }
      } catch (e) {
        // Fallback
      }

      // Return as-is if no extraction worked
      return desc;
    }

    return "";
  };

  const openEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setDiscountForm({
      name: discount.name,
      description: extractTextFromDescription(discount.description),
      channel_id: discount.channel_id,
      reward_value_type: discount.reward_value_type,
      reward_value: String(discount.reward_value),
      start_date: discount.start_date || "",
      end_date: discount.end_date || "",
      badge_label: discount.badge_label
    });
    setDiscountDialogOpen(true);
  };

  const closeDiscountDialog = () => {
    setDiscountDialogOpen(false);
    setEditingDiscount(null);
    setDiscountForm({
      name: "",
      description: "",
      channel_id: "",
      reward_value_type: "PERCENTAGE",
      reward_value: "",
      start_date: "",
      end_date: "",
      badge_label: "early_bird"
    });
  };

  const saveDiscount = async () => {
    if (!eventId || discountSaving) return;
    setDiscountSaving(true);
    try {
      const token = getToken();
      const method = editingDiscount ? "PATCH" : "POST";
      const url = editingDiscount
        ? `${API_ROOT}/events/${eventId}/saleor-discounts/${editingDiscount.id}/`
        : `${API_ROOT}/events/${eventId}/saleor-discounts/`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(discountForm),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        let errorMsg = body.error || body.detail;

        // Handle validation errors (nested errors object)
        if (body.errors && typeof body.errors === 'object') {
          const errorLines = [];
          for (const [field, messages] of Object.entries(body.errors)) {
            if (Array.isArray(messages)) {
              errorLines.push(`${field}: ${messages.join(', ')}`);
            } else {
              errorLines.push(`${field}: ${messages}`);
            }
          }
          errorMsg = errorLines.join('\n');
        }

        throw new Error(errorMsg || `HTTP ${res.status}`);
      }

      await fetchSaleorDiscounts();
      toast.success(editingDiscount ? "Discount updated successfully" : "Discount created successfully");
      closeDiscountDialog();
    } catch (err) {
      console.error("Failed to save discount:", err);
      toast.error(err.message || "Failed to save discount");
    } finally {
      setDiscountSaving(false);
    }
  };

  const deleteDiscount = async (discount) => {
    if (!eventId) return;
    setDeletingDiscountId(discount.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/saleor-discounts/${discount.id}/`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `HTTP ${res.status}`);
      }

      await fetchSaleorDiscounts();
      toast.success("Discount deleted successfully");
    } catch (err) {
      console.error("Failed to delete discount:", err);
      toast.error(err.message || "Failed to delete discount");
    } finally {
      setDeletingDiscountId(null);
    }
  };

  const syncDiscount = async (discount) => {
    if (!eventId) return;
    setSyncingDiscountId(discount.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/saleor-discounts/${discount.id}/sync/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `HTTP ${res.status}`);
      }

      await fetchSaleorDiscounts();
      toast.success("Discount synced with Saleor");
    } catch (err) {
      console.error("Failed to sync discount:", err);
      toast.error(err.message || "Failed to sync discount");
    } finally {
      setSyncingDiscountId(null);
    }
  };

  const isDiscountDisabled = !saleorProduct || productDirty || saleorSaving;

  const handleCancelEvent = async () => {
    if (!eventId || cancelEventLoading) return;
    setCancelEventLoading(true);
    try {
      const token = getToken();
      const payload = {
        cancellation_message: cancellationMessage,
        notify_participants: notifyParticipants,
      };
      if (recommendedEventId) {
        payload.recommended_event_id = recommendedEventId;
      }

      const res = await fetch(`${API_ROOT}/events/${eventId}/cancel/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to cancel event");

      toast.success("Event cancelled successfully!");
      setCancelEventOpen(false);
      refreshEvent(); // refresh to show cancelled status
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelEventLoading(false);
    }
  };

  const handleHideEvent = async () => {
    if (!eventId || hideEventLoading) return;
    setHideEventLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_hidden: !event.is_hidden }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to update event visibility");
      toast.success(event.is_hidden ? "Event is now visible on the platform." : "Event hidden from platform.");
      setHideEventOpen(false);
      refreshEvent();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setHideEventLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId || deleteEventLoading) return;
    setDeleteEventLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.detail || `HTTP ${res.status}`);
      }
      toast.success("Event deleted permanently.");
      navigate(-1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteEventLoading(false);
    }
  };

  const [myReg, setMyReg] = useState(null); // New state for my registration
  const resources = event?.resources || [];

  // ---- load event ----
  useEffect(() => {
    if (!eventId) return;

    if (initialEvent && String(initialEvent.id) === String(eventId)) {
      setEvent(initialEvent);
    }

    const controller = new AbortController();

    const load = async () => {
      setEventLoading(true);
      setEventError("");
      try {
        const token = getToken();
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const url = `${API_ROOT}/events/${eventId}/`;
        console.log("🔄 Fetching event from:", url);
        const res = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        console.log("📡 Event API response status:", res.status);

        // Try to get response text first to see what we're getting
        const text = await res.text();
        console.log("📝 Response text:", text.substring(0, 200)); // First 200 chars

        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          console.error("❌ Failed to parse JSON:", e.message);
          json = null;
        }

        console.log("📦 Event API response data:", json);

        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }
        if (!json) {
          throw new Error(`Empty or invalid response from API. Got: "${text.substring(0, 100)}"`);
        }
        setEvent(json);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("❌ Event fetch failed:", {
          eventId,
          error: e?.message,
          status: e?.status,
          url: `${API_ROOT}/events/${eventId}/`
        });
        setEventError(e?.message || "Unable to load event");
      } finally {
        setEventLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [eventId, initialEvent]);

  // Sync lounge settings from event
  useEffect(() => {
    if (event) {
      setLoungeSettings({
        lounge_enabled_before: event.lounge_enabled_before ?? false,
        lounge_before_buffer: event.lounge_before_buffer ?? 30,
        lounge_enabled_during: event.lounge_enabled_during ?? true,
        lounge_enabled_breaks: event.lounge_enabled_breaks ?? false,
        lounge_enabled_speed_networking: event.lounge_enabled_speed_networking ?? false,
        lounge_enabled_after: event.lounge_enabled_after ?? false,
        lounge_after_buffer: event.lounge_after_buffer ?? 30,
      });
      const visibilityUpdated = localStorage.getItem(`event_visibility_updated_${event.id}`);

      setParticipantVisibility({
        show_participants_before_event: visibilityUpdated ? (event.show_participants_before_event ?? true) : true,
        show_participants_after_event: event.show_participants_after_event ?? false,
        show_registered_participant_count: event.show_registered_participant_count ?? true,
        show_public_hosts: event.show_public_hosts ?? true,
        show_public_speakers: event.show_public_speakers ?? true,
        show_public_moderators: event.show_public_moderators ?? false,
        show_speed_networking_match_history: visibilityUpdated ? (event.show_speed_networking_match_history ?? true) : true,
      });
    }
  }, [event]);

  // ---- load registrations (owner only) ----
  useEffect(() => {
    if (!eventId || !isOwner) return;

    const token = getToken();
    if (!token) return;

    const controller = new AbortController();

    const loadRegs = async () => {
      setRegistrationsLoading(true);
      setRegistrationsError("");
      try {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(
          `${API_ROOT}/events/${eventId}/registrations/?limit=50`,
          { headers, signal: controller.signal }
        );
        const json = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }

        let data = [];
        if (Array.isArray(json)) {
          data = json;
        } else if (json && Array.isArray(json.results)) {
          data = json.results;
        }

        setRegistrations(data);
      } catch (e) {
        if (e.name === "AbortError") return;
        setRegistrationsError(e?.message || "Unable to load members");
      } finally {
        setRegistrationsLoading(false);
      }
    };

    loadRegs();
    loadRegs();
    return () => controller.abort();
  }, [eventId, isOwner, regsRefresh]);

  useEffect(() => {
    if (!eventId || !isOwner || guestAuditTabIndex === -1 || tab !== guestAuditTabIndex) return;

    const token = getToken();
    if (!token) return;

    const controller = new AbortController();

    const loadGuestAudit = async () => {
      setGuestAuditLoading(true);
      setGuestAuditError("");
      try {
        const res = await fetch(`${API_ROOT}/events/${eventId}/guest-audit/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }
        setGuestAuditRows(Array.isArray(json?.guests) ? json.guests : []);
      } catch (e) {
        if (e.name === "AbortError") return;
        setGuestAuditError(e?.message || "Unable to load guest audit");
      } finally {
        setGuestAuditLoading(false);
      }
    };

    loadGuestAudit();
    return () => controller.abort();
  }, [eventId, isOwner, tab, guestAuditTabIndex]);

  // ---- load sessions (owner only, for multi-day events) ----
  useEffect(() => {
    if (!eventId || !isOwner) return;

    // Only fetch sessions if explicitly a multi-day event
    if (event && !event.is_multi_day) return;

    const token = getToken();
    const controller = new AbortController();

    const loadSessions = async () => {
      setSessionsLoading(true);
      setSessionsError("");
      try {
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        console.log("🔄 Fetching sessions for event:", eventId, "is_multi_day:", event?.is_multi_day);

        const res = await fetch(
          `${API_ROOT}/events/${eventId}/sessions/`,
          { headers, signal: controller.signal }
        );
        const json = await res.json().catch(() => []);

        console.log("📊 Sessions API response:", json, "status:", res.status);

        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }

        let data = [];
        if (Array.isArray(json)) {
          data = json;
        } else if (json && Array.isArray(json.results)) {
          data = json.results;
        }

        console.log("✅ Sessions loaded:", data.length, "sessions");
        setSessions(data);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("❌ Failed to load sessions:", e);
        setSessionsError(e?.message || "Unable to load sessions");
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
    return () => controller.abort();
  }, [eventId, isOwner, event]);

  // ---- load MY registration (for staff/attendee view) ----
  useEffect(() => {
    if (!eventId || isOwner) return;

    const token = getToken();
    if (!token) return;

    const loadMyReg = async () => {
      try {
        // 1. Get my user ID
        let userId = null;
        try {
          const u = JSON.parse(localStorage.getItem("user"));
          userId = u?.id;
        } catch { }

        if (!userId) {
          const meRes = await fetch(`${API_ROOT}/users/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            userId = me.id;
          }
        }
        if (!userId) return;

        // 2. Fetch registration for this event & user
        // Using filter ?event=X&user=Y
        const res = await fetch(
          `${API_ROOT}/event-registrations/?event=${eventId}&user=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.results || [];
        if (list.length > 0) {
          setMyReg(list[0]);
        }
      } catch (err) {
        console.error("Failed to load my registration", err);
      }
    };
    loadMyReg();
  }, [eventId, isOwner]);

  useEffect(() => {
    if (!loungeCreateIcon) {
      setLoungeCreatePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(loungeCreateIcon);
    setLoungeCreatePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [loungeCreateIcon]);

  useEffect(() => {
    if (!loungeEditIcon) {
      setLoungeEditPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(loungeEditIcon);
    setLoungeEditPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [loungeEditIcon]);

  // Fetch speed networking sessions when tab 4 is selected
  useEffect(() => {
    if (speedNetworkingTabIndex === -1 || tab !== speedNetworkingTabIndex || !eventId || !isOwner) return;

    const fetchSpeedNetworkingSessions = async () => {
      setSpeedNetworkingLoading(true);
      setSpeedNetworkingError("");
      try {
        const token = getToken();
        const res = await fetch(
          `${API_ROOT}/events/${eventId}/speed-networking/`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const sessions = Array.isArray(json) ? json : json.results || [];
        setSpeedNetworkingSessions(sessions);
      } catch (err) {
        console.error("Failed to fetch speed networking sessions:", err);
        setSpeedNetworkingError(
          err.message || "Failed to load speed networking sessions"
        );
      } finally {
        setSpeedNetworkingLoading(false);
      }
    };

    fetchSpeedNetworkingSessions();
  }, [tab, eventId, isOwner, speedNetworkingTabIndex]);

  // Initialize form when editing
  useEffect(() => {
    if (speedNetworkingEditTarget) {
      setSpeedNetworkingFormName(speedNetworkingEditTarget.name || "");
      setSpeedNetworkingFormDuration(String(speedNetworkingEditTarget.duration_minutes || 5));
      setSpeedNetworkingFormBuffer(String(speedNetworkingEditTarget.buffer_seconds || 15));
      setSpeedNetworkingFormStrategy(speedNetworkingEditTarget.matching_strategy || "both");

      if (speedNetworkingEditTarget.criteria_config) {
        setCriteriaConfig(speedNetworkingEditTarget.criteria_config);
      } else {
        setCriteriaConfig({
          skill: { enabled: false, threshold: 50 },
          location: { enabled: false, threshold: 50 },
          experience: { enabled: false, threshold: 50 },
          education: { enabled: false, threshold: 50 },
          interest_based: { enabled: false, match_mode: "complementary", tags: [] }
        });
      }
    }
  }, [speedNetworkingEditTarget]);

  const clampSeats = useCallback((value) => Math.max(2, Math.min(30, value || 0)), []);
  const normalizeSeatsInput = useCallback((value) => clampSeats(Number.parseInt(String(value || ""), 10)), [clampSeats]);

  const normalizeLoungeTables = useCallback(
    (tables) =>
      (Array.isArray(tables) ? tables : []).map((t) => ({
        ...t,
        icon_url: toAbs(t?.icon_url),
      })),
    []
  );

  const fetchLoungeTables = useCallback(async () => {
    if (!eventId || !canManageLounge) return;
    setLoungeLoading(true);
    setLoungeError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/lounge-state/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setLoungeTables(normalizeLoungeTables(json?.tables || []));
    } catch (e) {
      setLoungeError(e?.message || "Unable to load lounge tables");
    } finally {
      setLoungeLoading(false);
    }
  }, [eventId, canManageLounge, normalizeLoungeTables]);

  useEffect(() => {
    fetchLoungeTables();
  }, [fetchLoungeTables]);

  const handleCreateLoungeTable = async () => {
    const name = (loungeCreateName || "").trim();
    if (!name || !eventId || loungeCreateSaving) return;
    setLoungeCreateSaving(true);
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${eventId}/create-lounge-table/`;
      let res;
      const seatsValue = normalizeSeatsInput(loungeCreateSeats);
      if (loungeCreateIcon) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", loungeCreateCategory);
        formData.append("max_seats", String(seatsValue));
        formData.append("icon", loungeCreateIcon);
        res = await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name, category: loungeCreateCategory, max_seats: seatsValue }),
        });
      }
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.detail || `HTTP ${res.status}`);
      }
      setLoungeCreateOpen(false);
      setLoungeCreateName("Networking Table");
      setLoungeCreateSeats("4");
      setLoungeCreateIcon(null);
      fetchLoungeTables();
    } catch (e) {
      setLoungeError(e?.message || "Failed to create lounge table");
    } finally {
      setLoungeCreateSaving(false);
    }
  };

  const handleOpenEditLoungeTable = (table) => {
    setLoungeEditTarget(table);
    setLoungeEditName(table?.name || "");
    setLoungeEditSeats(String(clampSeats(table?.max_seats || 4)));
    setLoungeEditIcon(null);
    setLoungeEditPreview(table?.icon_url || "");
    setLoungeEditOpen(true);
  };

  const handleUpdateLoungeTable = async () => {
    if (!eventId || !loungeEditTarget || loungeEditSaving) return;
    const name = (loungeEditName || "").trim();
    if (!name) return;
    setLoungeEditSaving(true);
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${eventId}/lounge-table-update/`;
      let res;
      const seatsValue = normalizeSeatsInput(loungeEditSeats);
      if (loungeEditIcon) {
        const formData = new FormData();
        formData.append("table_id", String(loungeEditTarget.id));
        formData.append("name", name);
        formData.append("max_seats", String(seatsValue));
        formData.append("icon", loungeEditIcon);
        res = await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            table_id: loungeEditTarget.id,
            name,
            max_seats: seatsValue,
          }),
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setLoungeTables((prev) =>
        prev.map((t) =>
          String(t.id) === String(loungeEditTarget.id)
            ? {
              ...t,
              name: json.name || name,
              max_seats: json.max_seats || seatsValue,
              icon_url: toAbs(json.icon_url || t.icon_url),
            }
            : t
        )
      );
      setLoungeEditOpen(false);
    } catch (e) {
      setLoungeError(e?.message || "Failed to update lounge table");
    } finally {
      setLoungeEditSaving(false);
    }
  };

  const handleOpenDeleteLoungeTable = (table) => {
    setLoungeDeleteTarget(table);
    setLoungeDeleteOpen(true);
  };

  const handleDeleteLoungeTable = async () => {
    if (!eventId || !loungeDeleteTarget || loungeDeleteSaving) return;
    setLoungeDeleteSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/lounge-table-delete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ table_id: loungeDeleteTarget.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setLoungeTables((prev) =>
        prev.filter((t) => String(t.id) !== String(loungeDeleteTarget.id))
      );
      setLoungeDeleteOpen(false);
      setLoungeDeleteTarget(null);
    } catch (e) {
      setLoungeError(e?.message || "Failed to delete lounge table");
    } finally {
      setLoungeDeleteSaving(false);
    }
  };

  // Speed Networking Handlers
  const handleCreateOrUpdateSpeedNetworking = async (formData) => {
    if (!eventId) return;
    setSpeedNetworkingActionLoading(true);
    try {
      const token = getToken();
      const method = speedNetworkingEditTarget ? "PATCH" : "POST";
      const url = speedNetworkingEditTarget
        ? `${API_ROOT}/events/${eventId}/speed-networking/${speedNetworkingEditTarget.id}/`
        : `${API_ROOT}/events/${eventId}/speed-networking/`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      // Update local state
      if (speedNetworkingEditTarget) {
        setSpeedNetworkingSessions((prev) =>
          prev.map((s) =>
            s.id === speedNetworkingEditTarget.id ? { ...s, ...json } : s
          )
        );
      } else {
        setSpeedNetworkingSessions((prev) => [...prev, json]);
      }

      setSpeedNetworkingCreateOpen(false);
      setSpeedNetworkingEditOpen(false);
      setSpeedNetworkingEditTarget(null);
      setSpeedNetworkingFormName("");
      setSpeedNetworkingFormDuration("5");
      setSpeedNetworkingFormBuffer("15");
      setSpeedNetworkingFormStrategy("both");
      toast.success(
        speedNetworkingEditTarget
          ? "Session updated successfully"
          : "Session created successfully"
      );
    } catch (err) {
      toast.error(err?.message || "Failed to save session");
      console.error("Speed networking error:", err);
    } finally {
      setSpeedNetworkingActionLoading(false);
    }
  };

  const handleDeleteSpeedNetworking = async () => {
    if (!eventId || !speedNetworkingDeleteTarget) return;
    setSpeedNetworkingActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_ROOT}/events/${eventId}/speed-networking/${speedNetworkingDeleteTarget.id}/`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      setSpeedNetworkingSessions((prev) =>
        prev.filter((s) => s.id !== speedNetworkingDeleteTarget.id)
      );

      setSpeedNetworkingDeleteOpen(false);
      setSpeedNetworkingDeleteTarget(null);
      toast.success("Session deleted successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to delete session");
      console.error("Delete speed networking error:", err);
    } finally {
      setSpeedNetworkingActionLoading(false);
    }
  };

  // MOD: Handle Member Actions with Dialog
  const openDialog = (action, reg) => {
    setDialogAction(action);
    setSelectedReg(reg);
    setDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!dialogAction || !selectedReg) return;
    setActionLoading(true);
    const token = getToken();

    try {
      let url = "";
      let method = "POST";

      if (dialogAction === "deregister") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/deregister/`;
      } else if (dialogAction === "reinstate") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/reinstate/`;
      } else if (dialogAction === "approve") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/approve_cancellation/`;
      } else if (dialogAction === "reject") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/reject_cancellation/`;
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Action failed");

      // Update local state
      if (dialogAction === "deregister") {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === selectedReg.id ? { ...r, status: "deregistered" } : r
          )
        );
      } else if (dialogAction === "reinstate") {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === selectedReg.id ? { ...r, status: "registered" } : r
          )
        );
      } else if (dialogAction === "approve") {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === selectedReg.id ? { ...r, status: "cancelled" } : r
          )
        );
      } else if (dialogAction === "reject") {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === selectedReg.id ? { ...r, status: "registered" } : r
          )
        );
      }
      setDialogOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Debounced User Search
  useEffect(() => {
    if (!addParticipantOpen) return;

    const timer = setTimeout(async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setUserOptions([]);
        return;
      }
      setSearchLoading(true);
      try {
        const token = getToken();
        // Use 'search' param as supported by SearchFilter
        const res = await fetch(`${API_ROOT}/users/?search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          // json might be paginated { count: ..., results: ... } or array depending on config
          // DRF DefaultPagination returns { results: [...] }
          const results = Array.isArray(json) ? json : (json.results || []);
          setUserOptions(results);
        }
      } catch (err) {
        console.error("User search failed", err);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, addParticipantOpen]);

  const handleAddParticipant = async () => {
    if (!eventId) return;

    // Validate: Need either a selected user OR a typed email
    const emailToUse = selectedUser ? selectedUser.email : addParticipantEmail;
    const userIdToUse = selectedUser ? selectedUser.id : null;

    if (!emailToUse && !userIdToUse) {
      toast.error("Please select a user or enter an email.");
      return;
    }

    setAddParticipantLoading(true);
    try {
      const token = getToken();
      const payload = {};
      if (userIdToUse) payload.user_id = userIdToUse;
      if (emailToUse) payload.email = emailToUse;

      const res = await fetch(`${API_ROOT}/events/${eventId}/add-participant/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to add participant");

      toast.success("Participant added successfully");
      setAddParticipantOpen(false);
      setAddParticipantEmail("");
      setSelectedUser(null);
      setSearchQuery("");
      setUserOptions([]);
      setRegsRefresh(prev => prev + 1);
      refreshEvent();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAddParticipantLoading(false);
    }
  };

  // Fetch friend status for a user
  const fetchFriendStatus = async (userId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/friends/status/?user_id=${userId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return "none";

      const status = (data?.status || "").toLowerCase();
      if (status === "incoming_pending") return "pending_incoming";
      if (status === "outgoing_pending") return "pending_outgoing";
      if (["friends", "friend", "accepted"].includes(status)) return "friends";
      return "none";
    } catch (err) {
      console.error("Failed to fetch friend status:", err);
      return "none";
    }
  };

  // Handle Connection Request (Add as Contact)
  const handleRequestConnection = async (userId) => {
    if (!userId) {
      toast.error("User ID not available");
      return;
    }

    setConnectionRequestLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/friend-requests/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(userId) }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 200 && res.status !== 201) {
        let msg = json?.detail || json?.non_field_errors?.[0];
        if (!msg && typeof json === "object") {
          const firstKey = Object.keys(json)[0];
          if (firstKey && Array.isArray(json[firstKey])) msg = json[firstKey][0];
        }
        throw new Error(msg || `HTTP ${res.status}`);
      }

      // Update friend status to pending_outgoing
      setFriendStatusByUser(prev => ({ ...prev, [userId]: "pending_outgoing" }));
      toast.success("Contact request sent!");
    } catch (err) {
      toast.error(err.message || "Failed to send contact request");
    } finally {
      setConnectionRequestLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ---- Host / Join Handlers ----
  const onHost = async () => {
    if (!event?.id) return;
    setHostingId(event.id);
    try {
      const livePath = `/live/${event.slug || event.id}?id=${event.id}&role=publisher`;
      navigate(livePath);
    } catch (e) {
      setErrMsg(e?.message || "Unable to start live meeting.");
      setErrOpen(true);
    } finally {
      setHostingId(null);
    }
  };

  const handleJoinLive = async () => {
    if (!event?.id) return;
    setJoiningId(event.id);
    try {
      const isPreEventLounge = isPreEventLoungeOpen(event);
      const isPostEventLounge = isPostEventLoungeOpen(event);
      // Use publisher role if this user is a host (actual owner or assigned via EventParticipant)
      const joinRole = (isOwner || myReg?.is_host) ? "publisher" : "audience";
      const livePath = `/live/${event.slug || event.id}?id=${event.id}&role=${joinRole}`;
      navigate(livePath, {
        state: {
          event,
          openLounge: isPreEventLounge || isPostEventLounge,
          preEventLounge: isPreEventLounge,
        }
      });
    } catch (e) {
      setErrMsg(e?.message || "Unable to join live.");
      setErrOpen(true);
    } finally {
      setJoiningId(null);
    }
  };

  // ---- Refresh event after editing ----
  const refreshEvent = async () => {
    if (!eventId) return;
    try {
      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, { headers });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        setEvent(json);
      }
    } catch (e) {
      console.error("Failed to refresh event:", e);
    }
  };

  // ---- derived values ----
  const status = useMemo(() => computeStatus(event || {}), [event]);

  // Logic for Join Button (Staff / Admin view context)
  const isPostEventLounge = isPostEventLoungeOpen(event);
  const isPast = (status === "past" || event?.status === "ended") && !isPostEventLounge;
  const isLive = status === "live" && event?.status !== "ended";
  const isWithinEarlyJoinWindow = canJoinEarly(event, 15);
  const isPreEventLounge = isPreEventLoungeOpen(event);
  const isHost = isOwner || Boolean(myReg?.is_host);
  const canShowActiveJoin = (isHost || isLive || isWithinEarlyJoinWindow || isPreEventLounge || isPostEventLounge) && status !== "cancelled" && event?.status !== "ended";

  const joinLabel = getResolvedJoinLabel(event, isLive, false, myReg, isOwner);
  const statusMeta = statusChip(status);
  const avatarLetter = (event?.title?.[0] || "E").toUpperCase();

  // Maintain a live second-by-second countdown while the post-event lounge is active.
  // The setInterval forces a React re-render each second, which also re-evaluates
  // isPostEventLounge and isPast — so Q&A appears automatically when the lounge closes.
  useEffect(() => {
    if (!isPostEventLounge) {
      setLoungeTimeRemaining(null);
      return;
    }
    const computeRemaining = () => {
      if (!event?.live_ended_at || !event?.lounge_after_buffer) return 0;
      const closing =
        new Date(event.live_ended_at).getTime() +
        Number(event.lounge_after_buffer) * 60 * 1000;
      return Math.max(0, Math.floor((closing - Date.now()) / 1000));
    };
    setLoungeTimeRemaining(computeRemaining());
    const timerId = setInterval(() => setLoungeTimeRemaining(computeRemaining()), 1000);
    return () => clearInterval(timerId);
  }, [isPostEventLounge, event?.live_ended_at, event?.lounge_after_buffer]);

  const formatLoungeTimeRemaining = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return "closing soon";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
  };

  // ---- members filtering / paging ----
  useEffect(() => {
    setMemberPage(1);
  }, [memberSearch, memberSort]);

  const filteredMembers = useMemo(() => {
    let rows = registrations.slice();

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      rows = rows.filter((r) => {
        const name = (r.user_name || "").toLowerCase();
        const email = (r.user_email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    if (memberSort === "newest") {
      rows.sort((a, b) => {
        const da = a.registered_at ? new Date(a.registered_at).getTime() : 0;
        const db = b.registered_at ? new Date(b.registered_at).getTime() : 0;
        return db - da;
      });
    } else if (memberSort === "oldest") {
      rows.sort((a, b) => {
        const da = a.registered_at ? new Date(a.registered_at).getTime() : 0;
        const db = b.registered_at ? new Date(b.registered_at).getTime() : 0;
        return da - db;
      });
    }

    return rows;
  }, [registrations, memberSearch, memberSort]);

  const totalMembers = filteredMembers.length;
  const memberPageCount = Math.max(
    1,
    Math.ceil(totalMembers / MEMBERS_PER_PAGE || 1)
  );
  const memberStart = totalMembers === 0 ? 0 : (memberPage - 1) * MEMBERS_PER_PAGE + 1;
  const memberEnd = Math.min(
    memberPage * MEMBERS_PER_PAGE,
    totalMembers
  );
  const pagedMembers = filteredMembers.slice(
    (memberPage - 1) * MEMBERS_PER_PAGE,
    memberPage * MEMBERS_PER_PAGE
  );

  // Load friend statuses for visible members
  useEffect(() => {
    if (!isOwner || !pagedMembers.length) return;

    const loadStatuses = async () => {
      const statuses = {};
      for (const member of pagedMembers) {
        if (member.user_id && !friendStatusByUser[member.user_id]) {
          statuses[member.user_id] = await fetchFriendStatus(member.user_id);
        }
      }
      if (Object.keys(statuses).length > 0) {
        setFriendStatusByUser(prev => ({ ...prev, ...statuses }));
      }
    };

    loadStatuses();
  }, [pagedMembers, isOwner, friendStatusByUser]);

  const filteredGuestAuditRows = useMemo(() => {
    let rows = guestAuditRows.slice();

    if (guestAuditSearch.trim()) {
      const q = guestAuditSearch.trim().toLowerCase();
      rows = rows.filter((row) => {
        const haystack = [
          row.name,
          row.guest_email,
          row.registered_email,
          row.company,
          row.job_title,
          row.changed_fields?.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    rows.sort((a, b) => {
      const aLatest = a.changes?.[0]?.changed_at || a.converted_at || a.joined_live_at || a.created_at || "";
      const bLatest = b.changes?.[0]?.changed_at || b.converted_at || b.joined_live_at || b.created_at || "";
      const aTime = aLatest ? new Date(aLatest).getTime() : 0;
      const bTime = bLatest ? new Date(bLatest).getTime() : 0;

      if (guestAuditSort === "oldest") return aTime - bTime;
      if (guestAuditSort === "most_changes") return (b.change_count || 0) - (a.change_count || 0);
      return bTime - aTime;
    });

    return rows;
  }, [guestAuditRows, guestAuditSearch, guestAuditSort]);

  // ---- resources filtering / paging ----
  useEffect(() => {
    setResourcePage(1);
  }, [resourceSearch, resourceType, resourceSort]);

  const filteredResources = useMemo(() => {
    let rows = resources.slice();

    if (resourceSearch.trim()) {
      const q = resourceSearch.toLowerCase();
      rows = rows.filter((r) => {
        const title = (r.title || "").toLowerCase();
        const link = (r.link_url || "").toLowerCase();
        const video = (r.video_url || "").toLowerCase();
        const file = (r.file || "").toLowerCase();
        return title.includes(q) || link.includes(q) || video.includes(q) || file.includes(q);
      });
    }

    if (resourceType !== "all") {
      rows = rows.filter((r) => r.type === resourceType);
    }

    if (resourceSort === "newest") {
      rows.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else if (resourceSort === "oldest") {
      rows.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      });
    }

    return rows;
  }, [resources, resourceSearch, resourceType, resourceSort]);

  const totalResources = filteredResources.length;
  const resourcePageCount = Math.max(
    1,
    Math.ceil(totalResources / RESOURCES_PER_PAGE || 1)
  );
  const resourceStart =
    totalResources === 0 ? 0 : (resourcePage - 1) * RESOURCES_PER_PAGE + 1;
  const resourceEnd = Math.min(
    resourcePage * RESOURCES_PER_PAGE,
    totalResources
  );
  const pagedResources = filteredResources.slice(
    (resourcePage - 1) * RESOURCES_PER_PAGE,
    resourcePage * RESOURCES_PER_PAGE
  );

  // ---- tab content components ----
  const renderOverview = () => {
    if (!event) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            {/* Cover image */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                "@supports not (aspect-ratio: 1 / 1)": { height: 240 },
                bgcolor: "grey.200",
                overflow: "hidden",
              }}
            >
              {(event.cover_image || event.preview_image) && (
                <Box
                  component="img"
                  src={toAbs(event.cover_image || event.preview_image)}
                  alt={event.title}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scale(1.01)",
                  }}
                />
              )}
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {/* top row: status + price */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1.5}
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={statusMeta.label}
                    sx={{
                      fontWeight: 600,
                      bgcolor: statusMeta.bg,
                      color:
                        statusMeta.color === "error"
                          ? "error.main"
                          : statusMeta.color === "success"
                            ? "success.main"
                            : "text.secondary",
                    }}
                  />
                  {event.category && (
                    <Chip
                      size="small"
                      label={event.category}
                      sx={{
                        bgcolor: "rgba(59,130,246,0.1)",
                        color: "primary.main",
                      }}
                    />
                  )}
                  {event.format && (
                    <Chip
                      size="small"
                      label={event.format}
                      sx={{
                        bgcolor: "rgba(245,158,11,0.12)",
                        color: "warning.main",
                      }}
                    />
                  )}
                </Stack>

                {(event.price_label || (event.price !== null && event.price !== undefined)) && (
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {event.price_label
                      ? event.price_label
                      : Number(event.price) > 0
                        ? `$${Number(event.price).toFixed(2)}`
                        : "Free"}
                  </Typography>
                )}
              </Stack>

              {/* title + slug */}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.25,
                  mb: 0.5,
                  fontSize: { xs: 20, sm: 22 },
                }}
              >
                {event.title}
              </Typography>
              {event.slug && (
                <Typography
                  variant="body2"
                  sx={{ color: "text.disabled", mb: 1.5 }}
                >
                  slug: {event.slug}
                </Typography>
              )}

              {/* Share Link */}
              {event.slug && (
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: "rgba(59, 130, 246, 0.05)",
                    border: "1px solid",
                    borderColor: "primary.light",
                    borderRadius: 2,
                    p: 2,
                    mb: 2.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontWeight: 600,
                      color: "text.secondary",
                      mb: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Landing Page URL
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      size="small"
                      value={
                        event.slug === 'prof-damodaran-on-investing-in-the-age-of-ai'
                          ? `${window.location.origin}/landing/${event.slug}`
                          : event.slug === 'the-oxford-m-a-symposium-2026'
                            ? `${window.location.origin}/public/the-oxford-m-a-symposium-2026/`
                            : `${window.location.origin}/events/${event.slug}`
                      }
                      InputProps={{
                        readOnly: true,
                        startAdornment: (
                          <InputAdornment position="start">
                            <LinkRoundedIcon sx={{ fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "background.paper",
                        },
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const landingUrl =
                          event.slug === 'prof-damodaran-on-investing-in-the-age-of-ai'
                            ? `${window.location.origin}/landing/${event.slug}`
                            : event.slug === 'the-oxford-m-a-symposium-2026'
                              ? `${window.location.origin}/public/the-oxford-m-a-symposium-2026/`
                              : `${window.location.origin}/events/${event.slug}`;
                        navigator.clipboard.writeText(landingUrl);
                        toast.success("Link copied to clipboard!");
                      }}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      Copy
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* date / time / location */}
              <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <CalendarMonthRoundedIcon
                    fontSize="small"
                    sx={{ color: "text.disabled" }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {fmtDateRange(event.start_time, event.end_time)}
                  </Typography>
                </Stack>
                {event.location && (
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <PlaceRoundedIcon
                      fontSize="small"
                      sx={{ color: "text.disabled" }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {event.location}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Host / Join Button (Overview) */}
              <Box sx={{ mb: 2 }}>
                {isOwner ? (
                  <Stack spacing={1.5}>
                    <Tooltip title={event?.is_hidden && !isOwner ? "Please unhide the event to host it" : ""} disableInteractive={false}>
                      <Button
                        onClick={onHost}
                        startIcon={<LiveTvRoundedIcon />}
                        variant="contained"
                        fullWidth
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          bgcolor: isPast ? "#CBD5E1" : "#10b8a6",
                          py: 1,
                          fontSize: 15,
                          fontWeight: 600,
                          "&:hover": { bgcolor: isPast ? "#CBD5E1" : "#0ea5a4" },
                          ...(status === "cancelled" && {
                            "&.Mui-disabled": {
                              bgcolor: "#fef2f2",
                              color: "#b91c1c"
                            }
                          })
                        }}
                        disabled={!!hostingId || isPast || status === "cancelled" || (event?.is_hidden && !isOwner)}
                      >
                        {hostingId ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={20} color="inherit" />
                            <span>Starting...</span>
                          </Stack>
                        ) : (
                          isPast ? "Event Ended" : status === "cancelled" ? "Cancelled" : "Host Event"
                        )}
                      </Button>
                    </Tooltip>
                    {status !== "cancelled" && status !== "past" && event.status !== "ended" && event.status !== "cancelled" && (
                      <Button
                        onClick={() => setCancelEventOpen(true)}
                        variant="outlined"
                        color="error"
                        fullWidth
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Cancel Event
                      </Button>
                    )}
                    {/* Platform Admin: Hide / Delete any event */}
                    {isOwner && (
                      <>
                        <Button
                          onClick={() => setHideEventOpen(true)}
                          variant="outlined"
                          fullWidth
                          startIcon={event.is_hidden ? <VisibilityRoundedIcon /> : <VisibilityOffRoundedIcon />}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontSize: 15,
                            fontWeight: 600,
                            borderColor: event.is_hidden ? "success.main" : "text.disabled",
                            color: event.is_hidden ? "success.main" : "text.secondary",
                            "&:hover": { borderColor: event.is_hidden ? "success.dark" : "text.secondary", bgcolor: "action.hover" },
                          }}
                        >
                          {event.is_hidden ? "Unhide from Platform" : "Hide from Platform"}
                        </Button>
                        <Button
                          onClick={() => setDeleteEventOpen(true)}
                          variant="outlined"
                          color="error"
                          fullWidth
                          startIcon={<DeleteOutlineRoundedIcon />}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontSize: 15,
                            fontWeight: 600,
                          }}
                        >
                          Delete Event Permanently
                        </Button>
                      </>
                    )}
                  </Stack>
                ) : (
                  canShowActiveJoin && (
                    <Button
                      onClick={handleJoinLive}
                      variant="contained"
                      fullWidth
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        bgcolor: "#10b8a6",
                        py: 1,
                        fontSize: 15,
                        fontWeight: 600,
                        "&:hover": { bgcolor: "#0ea5a4" },
                      }}
                      disabled={!!joiningId}
                    >
                      {joiningId ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={20} color="inherit" />
                          <span>Joining...</span>
                        </Stack>
                      ) : (
                        joinLabel
                      )}
                    </Button>
                  )
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* description */}
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: "text.primary", mb: 0.75 }}
              >
                Description
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  whiteSpace: "pre-wrap",  // ✅ keep \n and \n\n exactly as typed
                  wordBreak: "break-word", // ✅ long URLs / words won’t overflow
                }}
              >
                {event.description || "No description provided."}
              </Typography>

              {/* Replay Info Badge - similar to EventDetailsPage */}
              {event.replay_available && (
                <Box sx={{ mt: 2, mb: 1, p: 2, bgcolor: "rgba(99, 102, 241, 0.08)", borderRadius: 2, border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "indigo.main" }}>
                    Replay will be available
                  </Typography>
                  {event.replay_availability_duration && (
                    <Typography variant="caption" sx={{ color: "indigo.dark", display: "block", mt: 0.5 }}>
                      Accessible for: {event.replay_availability_duration}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Self-Management Actions (Leave / Cancel Request) */}
              {myReg && status !== "cancelled" && (
                <Box sx={{ mt: 3, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Your Registration
                  </Typography>
                  <RegisteredActions
                    ev={event}
                    reg={myReg}
                    onUnregistered={() => {
                      setMyReg(null);
                      // toast is handled in RegisteredActions, but we can add extra if needed
                    }}
                    onCancelRequested={(eid, updated) => setMyReg(updated)}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* status + attending */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LiveTvRoundedIcon
                    fontSize="small"
                    sx={{
                      color: event.is_live ? "error.main" : "text.disabled",
                    }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Status:{" "}
                    <strong>
                      {event.is_live ? "Live" : event.status || "—"}
                    </strong>
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <AccessTimeRoundedIcon
                    fontSize="small"
                    sx={{ color: "text.disabled" }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Registered Members:{" "}
                    <strong>
                      {Math.max(1, event.attending_count != null ? event.attending_count : 0)}
                    </strong>
                  </Typography>
                </Stack>
              </Stack>

              {event.recording_url && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    component="a"
                    href={resolveRecordingUrl(event.recording_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<MovieRoundedIcon />}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    Open recording
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Participant Visibility Settings (Owner only) */}
        {isOwner && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 2, sm: 3 },
                bgcolor: "background.paper",
              }}
            >
              <Box mb={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Participant List Visibility
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Control when regular participants can see the list of registered members.
                </Typography>
              </Box>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_participants_before_event}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_participants_before_event: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show participants before event starts</Typography>
                      <Typography variant="caption" color="text.secondary">Default: On</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_participants_after_event}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_participants_after_event: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show participants after event ends</Typography>
                      <Typography variant="caption" color="text.secondary">Default: Off</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_registered_participant_count}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_registered_participant_count: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show number of registered participants</Typography>
                      <Typography variant="caption" color="text.secondary">Default: On</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_public_hosts}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_public_hosts: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show hosts publicly</Typography>
                      <Typography variant="caption" color="text.secondary">Turn off when host accounts are only providing technical support.</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_public_speakers}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_public_speakers: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show speakers publicly</Typography>
                      <Typography variant="caption" color="text.secondary">Public-facing experts should usually remain visible.</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_public_moderators}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_public_moderators: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show moderators publicly</Typography>
                      <Typography variant="caption" color="text.secondary">Off by default unless moderators are also public-facing presenters.</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_speed_networking_match_history}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_speed_networking_match_history: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Allow participants to view their networking match list after the event</Typography>
                      <Typography variant="caption" color="text.secondary">Default: On</Typography>
                    </Box>
                  }
                />
                <Box>
                  <Button
                    variant="contained"
                    onClick={() => handleSaveVisibilitySettings(participantVisibility)}
                    disabled={visibilitySettingsSaving}
                    size="small"
                    sx={{
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      borderRadius: 2,
                      px: 3,
                      bgcolor: "#10b8a6",
                      "&:hover": { bgcolor: "#0ea5a4" },
                      "&.Mui-disabled": { bgcolor: "grey.300", color: "grey.500" },
                    }}
                  >
                    {visibilitySettingsSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        )}

        {/* Q&A Export (host / staff only) — shown below Participant Visibility */}
        {(isHost || isOwner || isStaff) && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 2, sm: 3 },
                bgcolor: "background.paper",
              }}
            >
              <Box mb={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Q&amp;A Export
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Download all Q&amp;A questions for this event including moderation status, answers, and upvotes.
                </Typography>
              </Box>

              {!isPast ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  Q&amp;A export is available after the event ends.
                </Typography>
              ) : (
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={qnaExportLoading.csv}
                    onClick={() => handleQnaExport("csv")}
                    startIcon={
                      qnaExportLoading.csv
                        ? <CircularProgress size={14} color="inherit" />
                        : <AttachFileRoundedIcon />
                    }
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    {qnaExportLoading.csv ? "Exporting…" : "Download Q&A CSV"}
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    disabled={qnaExportLoading.pdf}
                    onClick={() => handleQnaExport("pdf")}
                    startIcon={
                      qnaExportLoading.pdf
                        ? <CircularProgress size={14} color="inherit" />
                        : <VideoLibraryRoundedIcon />
                    }
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    {qnaExportLoading.pdf ? "Exporting…" : "Download Q&A PDF"}
                  </Button>
                </Stack>
              )}

              {qnaExportError && (
                <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                  {qnaExportError}
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Cancellation Details (Visible to Owner/Staff if cancelled) */}
        {status === "cancelled" && (isOwner || isStaff) && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "#fecaca",
                p: { xs: 2, sm: 3 },
                bgcolor: "#fef2f2",
              }}
            >
              <Box mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#991b1b", display: 'flex', alignItems: 'center', gap: 1 }}>
                  Event Cancelled
                </Typography>
                {event.cancelled_at && (
                  <Typography variant="body2" sx={{ color: "#b91c1c", mt: 0.5, fontWeight: 500 }}>
                    Cancelled on: {new Date(event.cancelled_at).toLocaleDateString()} at {new Date(event.cancelled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                )}
              </Box>

              <Box sx={{ bgcolor: "rgba(255,255,255,0.6)", p: 2, borderRadius: 2, border: "1px solid #fee2e2" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#7f1d1d", mb: 0.5 }}>
                  Cancellation Reason / Message
                </Typography>
                <Typography variant="body2" sx={{ color: "#991b1b", whiteSpace: "pre-wrap" }}>
                  {event.cancellation_message || "No reason provided."}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid >
    );
  };

  /*
   * Reusable render method for both "Breakout Rooms" (category="BREAKOUT")
   * and "Social Lounge" (category="LOUNGE").
   */
  const renderLoungeTables = (targetCategory, title, description) => {
    if (!canManageLounge) return null;

    // 1) Filter tables by this category
    //    (If any table has NO category or non-matching, hide it from this view)
    const tables = loungeTables.filter((t) => {
      const cat = (t.category || "LOUNGE").toUpperCase();
      return cat === targetCategory;
    });

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {description}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={fetchLoungeTables}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Sync
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setLoungeCreateCategory(targetCategory);
                setLoungeCreateOpen(true);
              }}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Create {targetCategory === 'BREAKOUT' ? 'Room' : 'Table'}
            </Button>
          </Stack>
        </Stack>

        <TableContainer
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Logo</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loungeLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                      No {targetCategory === 'BREAKOUT' ? 'rooms' : 'tables'} found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Avatar
                        src={t.icon_url || ""}
                        variant="rounded"
                        sx={{ width: 32, height: 32, bgcolor: "grey.100" }}
                      >
                        {(t.name || "T")[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.name || `Table ${t.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {t.max_seats || 4}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditLoungeTable(t)}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteLoungeTable(t)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const handleSaveLoungeSettings = async () => {
    if (!eventId || loungeSettingsSaving) return;
    setLoungeSettingsSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(loungeSettings),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setEvent((prev) => ({ ...prev, ...loungeSettings }));
      toast.success("Lounge settings saved successfully!");
    } catch (e) {
      toast.error(e?.message || "Failed to save lounge settings");
    } finally {
      setLoungeSettingsSaving(false);
    }
  };

  const handleSaveVisibilitySettings = async (newSettings) => {
    if (!eventId || visibilitySettingsSaving) return;
    setVisibilitySettingsSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newSettings),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setEvent((prev) => ({ ...prev, ...newSettings }));
      setParticipantVisibility(prev => ({ ...prev, ...newSettings }));
      localStorage.setItem(`event_visibility_updated_${eventId}`, String(Date.now()));
      toast.success("Visibility settings updated");
    } catch (e) {
      toast.error(e?.message || "Failed to save visibility settings");
    } finally {
      setVisibilitySettingsSaving(false);
    }
  };

  const renderLoungeSettings = () => {
    if (!isOwner) return null;

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Social Lounge Availability
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Control when participants can access the Social Lounge for networking.
            </Typography>
          </Box>

          <Divider />

          {/* Before Event */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_before}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_before: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open Before Event
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking before the event starts
                  </Typography>
                </Box>
              }
            />
            {loungeSettings.lounge_enabled_before && (
              <TextField
                type="number"
                label="Minutes before start"
                value={loungeSettings.lounge_before_buffer}
                onChange={(e) =>
                  setLoungeSettings((prev) => ({
                    ...prev,
                    lounge_before_buffer: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                size="small"
                sx={{ mt: 1, ml: 5, width: 200 }}
                InputProps={{ inputProps: { min: 0 } }}
              />
            )}
          </Box>

          {/* During Event */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_during}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_during: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open During Event
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking while the event is live
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* During Breaks */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_breaks}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_breaks: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open During Breaks
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking when the event is on break
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* After Event */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_after}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_after: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open After Event
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking after the event ends
                  </Typography>
                </Box>
              }
            />
            {loungeSettings.lounge_enabled_after && (
              <TextField
                type="number"
                label="Minutes after end"
                value={loungeSettings.lounge_after_buffer}
                onChange={(e) =>
                  setLoungeSettings((prev) => ({
                    ...prev,
                    lounge_after_buffer: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                size="small"
                sx={{ mt: 1, ml: 5, width: 200 }}
                InputProps={{ inputProps: { min: 0 } }}
              />
            )}
          </Box>

          {/* Available After Leaving Speed Networking */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_speed_networking}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_speed_networking: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Available After Leaving Speed Networking
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow participants to go to Social Lounge when they leave Speed Networking
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSaveLoungeSettings}
              disabled={loungeSettingsSaving}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {loungeSettingsSaving ? "Saving..." : "Save Settings"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  // Applications Management Tab (for events with apply registration type)
  const [applications, setApplications] = React.useState([]);
  const [appLoading, setAppLoading] = React.useState(false);
  const [appFilter, setAppFilter] = React.useState('all');
  const [appSearch, setAppSearch] = React.useState('');
  const [declineDialogOpen, setDeclineDialogOpen] = React.useState(false);
  const [selectedApp, setSelectedApp] = React.useState(null);
  const [declineMessage, setDeclineMessage] = React.useState('');
  const [appPreapprovedFilter, setAppPreapprovedFilter] = React.useState("all");
  const [appSourceFilter, setAppSourceFilter] = React.useState("all");
  const [appCommentsFilter, setAppCommentsFilter] = React.useState("all");

  React.useEffect(() => {
    if (event?.registration_type !== 'apply' || !event?.id) return;
    const fetchApps = async () => {
      setAppLoading(true);
      try {
        const query = new URLSearchParams();
        if (appFilter !== "all") query.set("status", appFilter);
        if (appSearch) query.set("search", appSearch);
        if (appPreapprovedFilter !== "all") query.set("preapproved", appPreapprovedFilter);
        if (appSourceFilter !== "all") query.set("preapproval_source", appSourceFilter);
        if (appCommentsFilter !== "all") query.set("has_comments", appCommentsFilter);
        const url = `${API_ROOT}/events/${event.id}/applications/?${query.toString()}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setApplications(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setAppLoading(false);
      }
    };
    fetchApps();
  }, [event?.id, event?.registration_type, appFilter, appSearch, appPreapprovedFilter, appSourceFilter, appCommentsFilter, token]);

  const handleApproveApp = async (appId) => {
    try {
      const res = await fetch(`${API_ROOT}/events/${event.id}/applications/${appId}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({})
      });
      if (res.ok) {
        toast.success('Application approved');
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'approved' } : a));
        setRegsRefresh(prev => prev + 1);
      }
    } catch (err) {
      toast.error('Failed to approve application');
    }
  };

  const handleDeclineApp = async () => {
    try {
      const res = await fetch(`${API_ROOT}/events/${event.id}/applications/${selectedApp.id}/decline/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejection_message: declineMessage })
      });
      if (res.ok) {
        toast.success('Application declined');
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'declined' } : a));
        setDeclineDialogOpen(false);
        setSelectedApp(null);
        setDeclineMessage('');
      }
    } catch (err) {
      toast.error('Failed to decline application');
    }
  };

  const renderApplications = () => {
    if (!isOwner || event?.registration_type !== 'apply') {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Applications</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Only available for events with application-based registration.</Typography>
        </Paper>
      );
    }

    const filteredApps = applications.filter(app =>
      appFilter === 'all' || app.status === appFilter
    );

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              APPLICATIONS ({filteredApps.length})
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Review and manage event applications.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              placeholder="Search by name or email..."
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Select value={appFilter} onChange={(e) => setAppFilter(e.target.value)} size="small" sx={{ minWidth: 150 }}>
              <MenuItem value="all">All Applications</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="declined">Declined</MenuItem>
            </Select>
            <Select value={appPreapprovedFilter} onChange={(e) => setAppPreapprovedFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
              <MenuItem value="all">Preapproved: All</MenuItem>
              <MenuItem value="true">Preapproved</MenuItem>
              <MenuItem value="false">Not Preapproved</MenuItem>
            </Select>
            <Select value={appSourceFilter} onChange={(e) => setAppSourceFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
              <MenuItem value="all">Source: All</MenuItem>
              <MenuItem value="code">Code</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="none">None</MenuItem>
            </Select>
            <Select value={appCommentsFilter} onChange={(e) => setAppCommentsFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
              <MenuItem value="all">Comments: All</MenuItem>
              <MenuItem value="true">Has Comments</MenuItem>
              <MenuItem value="false">No Comments</MenuItem>
            </Select>
          </Stack>

          {appLoading ? (
            <CircularProgress />
          ) : filteredApps.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>No applications found.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 650, '& thead th': { fontWeight: 600, backgroundColor: '#f5f5f5' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Job Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Pre-Approval</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Marker</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Comments</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Applied At</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApps.map(app => (
                    <TableRow key={app.id} sx={{ '&:hover': { backgroundColor: '#fafafa' } }}>
                      <TableCell>{app.applicant_name}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>{app.job_title}</TableCell>
                      <TableCell>{app.company_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          size="small"
                          color={app.status === 'approved' ? 'success' : app.status === 'declined' ? 'error' : 'warning'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {app.is_preapproved ? (
                          <Chip size="small" color="info" label={`Yes (${app.preapproval_source || "unknown"})`} />
                        ) : (
                          <Chip size="small" variant="outlined" label="No" />
                        )}
                      </TableCell>
                      <TableCell>{app.attendee_marker_value ? "Yes" : "No"}</TableCell>
                      <TableCell sx={{ maxWidth: 220, whiteSpace: "normal" }}>{app.comments || "-"}</TableCell>
                      <TableCell>{new Date(app.applied_at).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {app.status === 'pending' && (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              size="small"
                              variant="contained"
                              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
                              onClick={() => handleApproveApp(app.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#da190b' } }}
                              onClick={() => { setSelectedApp(app); setDeclineDialogOpen(true); }}
                            >
                              Decline
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
        <Box sx={{ mt: 3 }}>
          <EventPreApprovalManager event={event} token={token} onEventUpdated={(updated) => setEvent(updated)} />
        </Box>

        <Dialog open={declineDialogOpen} onClose={() => setDeclineDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Decline Application</DialogTitle>
          <DialogContent>
            {selectedApp && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Declining application from <strong>{selectedApp.applicant_name}</strong> ({selectedApp.email})
              </Typography>
            )}
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Rejection Message (Optional)"
              value={declineMessage}
              onChange={(e) => setDeclineMessage(e.target.value)}
              placeholder="Tell the applicant why their application was declined (this message will be sent to them)..."
              sx={{ mt: 1 }}
              variant="outlined"
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              If no message is provided, a default rejection message will be sent.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              onClick={() => {
                setDeclineDialogOpen(false);
                setDeclineMessage('');
                setSelectedApp(null);
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#da190b' } }}
              onClick={() => {
                handleDeclineApp();
                setDeclineMessage('');
              }}
            >
              Send & Decline
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  };

  const renderMembers = () => {
    if (!isOwner) {
      return (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 2, sm: 3 },
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Members
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Only the event owner can view the list of members who purchased
            this event.
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
          spacing={1.5}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 0.25 }}
            >
              REGISTERED MEMBERS
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              People who have purchased this event.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={registrations.length}
              sx={{ bgcolor: "grey.100", color: "text.secondary" }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddParticipantOpen(true)}
              sx={{ textTransform: "none", borderColor: "divider", color: "text.primary" }}
            >
              Add Member
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => setInviteUsersOpen(true)}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              Invite
            </Button>
            <Button
              variant="contained"
              size="small"
              color="secondary"
              startIcon={<EmailRoundedIcon />}
              onClick={() => setInviteEmailsOpen(true)}
              sx={{ textTransform: "none", borderRadius: 999, ml: 1 }}
            >
              Invite by Email
            </Button>
          </Stack>
        </Stack>

        {/* search + sort */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search members..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={memberSort}
              onChange={(e) => setMemberSort(e.target.value)}
              displayEmpty
              renderValue={
                memberSort !== ""
                  ? undefined
                  : () => "Sort"
              }
              IconComponent={ArrowDropDownRoundedIcon}
            >
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {registrationsLoading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <>
            <TableContainer
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: "grey.50",
                      "& th": { fontSize: 13, color: "text.secondary" },
                    }}
                  >
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      Registered at
                    </TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", py: 2 }}
                        >
                          No members found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedMembers.map((r) => {
                      const name = r.user_name || r.user_email || "Unnamed";
                      const email = r.user_email || "";

                      // TIMEZONE LOGIC:
                      // 1. Viewer's profile timezone (Host/Admin)
                      // 2. Viewer's browser timezone (fallback)
                      const viewerTz = currentUser?.profile?.timezone || dayjs.tz.guess();

                      const purchased = r.registered_at
                        ? dayjs.utc(r.registered_at).tz(viewerTz).format("M/D/YYYY, h:mm:ss A z")
                        : "";
                      const regKyc =
                        r.user_kyc_status ||
                        r.user?.kyc_status ||
                        r.profile?.kyc_status ||
                        r.kyc_status ||
                        "";
                      const isVerified = isVerifiedStatus(regKyc);
                      const avatarSrc = toAbs(
                        r.user_avatar_url ||
                        r.user_image_url ||
                        r.user_avatar ||
                        r.user_image
                      );

                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar
                                src={avatarSrc || undefined}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: "primary.light",
                                  fontSize: 13,
                                  cursor: r.user_id ? "pointer" : "default",
                                }}
                                onClick={() => {
                                  if (r.user_id) {
                                    window.open(`/community/rich-profile/${r.user_id}`, '_blank');
                                  }
                                }}
                              >
                                {(name[0] || "U").toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    cursor: r.user_id ? "pointer" : "default",
                                    color: "text.primary",
                                  }}
                                  onClick={() => {
                                    if (r.user_id) {
                                      window.open(`/community/rich-profile/${r.user_id}`, '_blank');
                                    }
                                  }}
                                >
                                  {name}
                                  {isVerified && (
                                    <VerifiedIcon
                                      sx={{ fontSize: 16, color: "#22d3ee", ml: 0.5, verticalAlign: "middle" }}
                                    />
                                  )}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                cursor: r.user_id ? "pointer" : "default",
                                color: "text.primary",
                              }}
                              onClick={() => {
                                if (r.user_id) {
                                  window.open(`/community/rich-profile/${r.user_id}`, '_blank');
                                }
                              }}
                            >
                              {email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.status === 'deregistered' ? 'Deregistered' : (r.status || 'registered')}
                              color={
                                r.status === 'cancellation_requested' ? 'warning' :
                                  (r.status === 'cancelled' || r.status === 'deregistered' ? 'default' : 'success')
                              }
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Typography variant="body2">{purchased}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap">
                              {r.user_id && currentUser?.id !== r.user_id && !['friends', 'pending_outgoing'].includes((friendStatusByUser?.[r.user_id] || '').toLowerCase()) && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={connectionRequestLoading[r.user_id]}
                                  onClick={() => handleRequestConnection(r.user_id)}
                                  sx={{ textTransform: "none" }}
                                >
                                  {connectionRequestLoading[r.user_id] ? "Sending..." : "Connect"}
                                </Button>
                              )}

                              {['registered', 'cancellation_requested'].includes(r.status) ? (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => openDialog("deregister", r)}
                                >
                                  Deregister
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  color="primary"
                                  onClick={() => openDialog("reinstate", r)}
                                >
                                  Reinstate
                                </Button>
                              )}

                              {!(Number(event?.price) === 0 || event?.is_free) && (
                                <>
                                  {r.status === "cancellation_requested" && (
                                    <>
                                      <Button
                                        size="small"
                                        color="success"
                                        variant="contained"
                                        onClick={() => openDialog("approve", r)}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        onClick={() => openDialog("reject", r)}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* footer: showing + pagination */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Showing {memberStart}-{memberEnd} of {totalMembers} members
              </Typography>
              <Pagination
                size="small"
                page={memberPage}
                count={memberPageCount}
                onChange={(_, value) => setMemberPage(value)}
              />
            </Stack>
          </>
        )}
      </Paper>
    );
  };

  const renderGuestAudit = () => {
    const viewerTz = currentUser?.profile?.timezone || dayjs.tz.guess();
    const fmtAuditDate = (value) =>
      value ? dayjs.utc(value).tz(viewerTz).format("M/D/YYYY, h:mm:ss A z") : "—";

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
              GUEST AUDIT
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Track which guests joined this event and what profile details they changed.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${filteredGuestAuditRows.length} guests`}
            sx={{ bgcolor: "grey.100", color: "text.secondary" }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search guest, guest email, registered email, company..."
            value={guestAuditSearch}
            onChange={(e) => setGuestAuditSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={guestAuditSort}
              onChange={(e) => setGuestAuditSort(e.target.value)}
              IconComponent={ArrowDropDownRoundedIcon}
            >
              <MenuItem value="latest">Latest activity</MenuItem>
              <MenuItem value="oldest">Oldest activity</MenuItem>
              <MenuItem value="most_changes">Most changes</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {guestAuditLoading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : guestAuditError ? (
          <Alert severity="error">{guestAuditError}</Alert>
        ) : filteredGuestAuditRows.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
            No guest audit records found for this event.
          </Typography>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50", "& th": { fontSize: 13, color: "text.secondary" } }}>
                  <TableCell>Guest</TableCell>
                  <TableCell>Guest Email</TableCell>
                  <TableCell>Registered Account</TableCell>
                  <TableCell>Company / Role</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Converted</TableCell>
                  <TableCell>Changes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGuestAuditRows.map((row) => (
                  <TableRow key={row.guest_id} hover>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.name || "Guest"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Guest ID: {row.guest_id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography variant="body2">{row.guest_email || "—"}</Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: "wrap" }}>
                        {row.email_verified && <Chip size="small" label="OTP Verified" color="success" variant="outlined" />}
                        {row.joined_live && <Chip size="small" label="Joined Live" color="primary" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ minWidth: 190 }}>
                      {row.converted_user ? (
                        <>
                          <Typography variant="body2">{row.converted_user.name || row.registered_email}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {row.registered_email || "—"}
                          </Typography>
                          {row.email_changed_on_signup && (
                            <Chip size="small" label="Email changed on signup" color="warning" variant="outlined" sx={{ mt: 0.75 }} />
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          Not converted
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography variant="body2">{row.company || "—"}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {row.job_title || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 155 }}>
                      <Typography variant="body2">{fmtAuditDate(row.joined_live_at || row.created_at)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 155 }}>
                      <Typography variant="body2">{fmtAuditDate(row.converted_at)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 300 }}>
                      {row.changes?.length ? (
                        <Stack spacing={0.75}>
                          {row.changes.map((change) => (
                            <Box key={change.id} sx={{ p: 1, borderRadius: 1.5, bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
                              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                <Chip size="small" label={change.field_label} variant="outlined" />
                                <Chip size="small" label={change.source_label} variant="outlined" />
                              </Stack>
                              <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                                {change.old_value || "—"} → {change.new_value || "—"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                                {fmtAuditDate(change.changed_at)}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          No profile changes recorded.
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    );
  };

  // ---- Session management handlers ----
  const openSessionEdit = (session) => {
    setSelectedSession(session);
    setSessionEditOpen(true);
  };

  const closeSessionEdit = () => {
    setSessionEditOpen(false);
    setSelectedSession(null);
  };

  const handleSessionUpdate = async (updatedSession) => {
    // Validate required fields
    if (!updatedSession.title?.trim()) {
      toast.error("Session title is required");
      return;
    }

    if (!updatedSession.start_time || !updatedSession.end_time) {
      toast.error("Start and end times are required");
      return;
    }

    // Validate end time > start time
    const startTime = new Date(updatedSession.start_time);
    const endTime = new Date(updatedSession.end_time);
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setSessionActionLoading(true);
    try {
      const res = await fetch(
        `${API_ROOT}/events/${eventId}/sessions/${selectedSession.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedSession),
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      // Update sessions list with the updated session
      setSessions(sessions.map(s => s.id === selectedSession.id ? json : s));
      toast.success("Session updated successfully");
      closeSessionEdit();
    } catch (e) {
      toast.error(e?.message || "Failed to update session");
    } finally {
      setSessionActionLoading(false);
    }
  };

  const openDeleteSessionDialog = (session) => {
    setSessionToDelete(session);
    setSessionDeleteDialogOpen(true);
  };

  const closeDeleteSessionDialog = () => {
    setSessionDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const handleSessionDelete = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setSessionActionLoading(true);
    try {
      const res = await fetch(
        `${API_ROOT}/events/${eventId}/sessions/${sessionToDelete.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      // Remove session from list
      setSessions(sessions.filter(s => s.id !== sessionToDelete.id));
      toast.success("Session deleted successfully");
      closeDeleteSessionDialog();
    } catch (e) {
      toast.error(e?.message || "Failed to delete session");
    } finally {
      setSessionActionLoading(false);
    }
  };

  // ---- Helper function to validate session times ----
  const isSessionTimeInvalid = () => {
    if (!newSessionData.start_time || !newSessionData.end_time) {
      return false; // Not filled yet, don't show error
    }
    const startTime = new Date(newSessionData.start_time);
    const endTime = new Date(newSessionData.end_time);
    return endTime <= startTime;
  };

  // ---- Helper function to get validation error message ----
  const getSessionTimeErrorMessage = () => {
    if (!newSessionData.start_time || !newSessionData.end_time) {
      return "";
    }
    if (isSessionTimeInvalid()) {
      return "End time must be after start time";
    }
    return "";
  };

  // ---- Add Session handler ----
  const handleAddSession = async () => {
    if (!newSessionData.title.trim()) {
      toast.error("Session title is required");
      return;
    }

    if (!newSessionData.session_date || !newSessionData.start_time || !newSessionData.end_time) {
      toast.error("Session date and times are required");
      return;
    }

    // Validate end time > start time
    if (isSessionTimeInvalid()) {
      toast.error("End time must be after start time");
      return;
    }

    // Validate session_date matches start_time date
    const startTimeDate = dayjs(newSessionData.start_time).format("YYYY-MM-DD");
    if (newSessionData.session_date !== startTimeDate) {
      toast.error("Session date must match the start time date");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setAddSessionLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/events/${eventId}/sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSessionData),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = json?.detail || json?.title?.[0] || `HTTP ${res.status}`;
        throw new Error(errorMsg);
      }

      // Add new session to list
      setSessions([...sessions, json]);
      toast.success("Session created successfully");

      // Reset form and close dialog
      setNewSessionData({
        title: "",
        description: "",
        session_date: "",
        start_time: "",
        end_time: "",
        session_type: "main",
      });
      setAddSessionOpen(false);
    } catch (e) {
      toast.error(e?.message || "Failed to create session");
    } finally {
      setAddSessionLoading(false);
    }
  };

  const renderSessions = () => {
    // Only show for multi-day events and owners
    if (!event?.is_multi_day) {
      return (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 2, sm: 3 },
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Sessions
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Sessions are only available for multi-day events.
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
          spacing={1.5}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 0.25 }}
            >
              SESSIONS
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              All sessions scheduled for this multi-day event.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={sessions.length}
              sx={{ bgcolor: "grey.100", color: "text.secondary" }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddSessionOpen(true)}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Add Session
            </Button>
          </Stack>
        </Stack>

        {sessionsLoading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& th": { fontSize: 13, color: "text.secondary" },
                  }}
                >
                  <TableCell>Date</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Status
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary", py: 2 }}
                      >
                        No sessions found. Create a session to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions
                    .sort(
                      (a, b) =>
                        new Date(a.start_time) - new Date(b.start_time)
                    )
                    .map((session) => {
                      const sessionDate = session.session_date
                        ? dayjs(session.session_date).format("MMM D, YYYY")
                        : "—";
                      const timeRange = session.start_time && session.end_time
                        ? `${dayjs(session.start_time).format("h:mm A")} – ${dayjs(
                          session.end_time
                        ).format("h:mm A")}`
                        : "—";
                      const statusColor =
                        session.is_live ? "error" : "default";
                      const statusLabel = session.is_live ? "Live" : "Scheduled";

                      return (
                        <TableRow key={session.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {sessionDate}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {session.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {timeRange}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Chip
                              size="small"
                              label={
                                session.session_type
                                  ? session.session_type
                                    .split("_")
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(" ")
                                  : "Main"
                              }
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Chip
                              size="small"
                              label={statusLabel}
                              color={statusColor}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openSessionEdit(session)}
                                disabled={sessionActionLoading}
                                title="Edit session"
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openDeleteSessionDialog(session)}
                                disabled={sessionActionLoading}
                                title="Delete session"
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {sessionsError && (
          <Typography
            variant="body2"
            sx={{ color: "error.main", mt: 2 }}
          >
            {sessionsError}
          </Typography>
        )}
      </Paper>
    );
  };

  const renderResources = () => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        p: { xs: 2, sm: 3 },
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
            Resources
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Links, files and videos attached to this event.
          </Typography>
        </Box>
        <Chip
          size="small"
          label={resources.length}
          sx={{ bgcolor: "grey.100", color: "text.secondary" }}
        />
      </Stack>

      {/* search + filters */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search resources…"
          value={resourceSearch}
          onChange={(e) => setResourceSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack
          direction="row"
          spacing={1}
          sx={{ width: { xs: "100%", md: "auto" } }}
        >
          <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
            <Select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              displayEmpty
              IconComponent={ArrowDropDownRoundedIcon}
              renderValue={
                resourceType !== ""
                  ? undefined
                  : () => "All types"
              }
            >
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="video">Video</MenuItem>
              <MenuItem value="link">Link</MenuItem>
              <MenuItem value="file">File</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
            <Select
              value={resourceSort}
              onChange={(e) => setResourceSort(e.target.value)}
              displayEmpty
              IconComponent={ArrowDropDownRoundedIcon}
              renderValue={
                resourceSort !== ""
                  ? undefined
                  : () => "Newest first"
              }
            >
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <TableContainer
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "grey.50",
                "& th": { fontSize: 13, color: "text.secondary" },
              }}
            >
              <TableCell>Title</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Type
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Event
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", py: 2 }}
                  >
                    No resources found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pagedResources.map((r) => {
                const href = r.file
                  ? toAbs(r.file)
                  : r.link_url || r.video_url || null;

                const typeLabel =
                  r.type === "file"
                    ? "File"
                    : r.type === "link"
                      ? "Link"
                      : r.type === "video"
                        ? "Video"
                        : r.type || "Resource";

                const icon =
                  r.type === "file" ? (
                    <AttachFileRoundedIcon fontSize="small" />
                  ) : r.type === "video" ? (
                    <VideoLibraryRoundedIcon fontSize="small" />
                  ) : (
                    <LinkRoundedIcon fontSize="small" />
                  );

                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {icon}
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500 }}
                        >
                          {r.title ||
                            r.link_url ||
                            r.video_url ||
                            r.file ||
                            "Untitled resource"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Chip size="small" label={typeLabel} sx={{ bgcolor: "grey.100", fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2">
                        {event?.title || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {href ? (
                        <IconButton
                          size="small"
                          component="a"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.disabled" }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* footer: showing + pagination */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mt: 2 }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Showing {resourceStart}-{resourceEnd} of {totalResources} resources
        </Typography>
        <Pagination
          size="small"
          page={resourcePage}
          count={resourcePageCount}
          onChange={(_, value) => setResourcePage(value)}
        />
      </Stack>
    </Paper >
  );

  const renderPostEventQna = () => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        p: { xs: 2, sm: 3 },
        bgcolor: "background.paper",
      }}
    >
      <Box mb={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Post-Event Q&amp;A — Answer Unanswered Questions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Write and publish answers to questions submitted during the event. Recipients will be notified.
        </Typography>
      </Box>

      {!isPast ? (
        isPostEventLounge ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Social Lounge In Progress</AlertTitle>
            Post-Event Q&amp;A will become available once the Social Lounge ends.
            {loungeTimeRemaining !== null && (
              <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                <strong>Time remaining:</strong> {formatLoungeTimeRemaining(loungeTimeRemaining)}
              </Box>
            )}
            <Box component="span" sx={{ display: "block", mt: 0.5, color: "text.secondary", fontSize: "0.75rem" }}>
              This section will update automatically — no refresh needed.
            </Box>
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
            Post-event Q&amp;A is available after the event ends.
          </Typography>
        )
      ) : (
        <>
          {postEventQnaLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          ) : postEventQnaQuestions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              No unanswered questions. All questions have been answered!
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {postEventQnaQuestions.map((q) => (
                <Box key={q.id} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fff" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Chip
                      label="Pending"
                      size="small"
                      sx={{ bgcolor: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", fontWeight: 600 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Upvotes: {q.upvote_count || 0}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{q.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {q.is_anonymous ? "Anonymous" : (q.user_display || "Unknown")}
                  </Typography>
                  <Box sx={{ mt: 1.25 }}>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{
                        bgcolor: "#22c55e",
                        color: "white",
                        textTransform: "none",
                        "&:hover": { bgcolor: "#16a34a" }
                      }}
                      onClick={() => handleOpenAnswerModal(q)}
                    >
                      Answer
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          {/* Already answered post-event questions */}
          {postEventAnsweredQuestions.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: "text.secondary" }}>
                Already Answered ({postEventAnsweredQuestions.length})
              </Typography>
              <Stack spacing={1.5}>
                {postEventAnsweredQuestions.map(q => (
                  <Box key={q.id} sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label="Answered"
                          sx={{ bgcolor: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          label={q.answered_phase === "live" ? "Live Answer" : "Post-Event Answer"}
                          sx={{
                            bgcolor: q.answered_phase === "live" ? "#ecfeff" : "#eff6ff",
                            color: q.answered_phase === "live" ? "#0e7490" : "#1d4ed8",
                            border: q.answered_phase === "live" ? "1px solid #67e8f9" : "1px solid #bfdbfe",
                            fontWeight: 600
                          }}
                        />
                      </Stack>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenEditAnswerModal(q)}
                        sx={{ textTransform: "none" }}
                      >
                        Edit Answer
                      </Button>
                    </Stack>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                      {q.content}
                    </Typography>
                    <Box sx={{ p: 1.5, bgcolor: '#dcfce7', borderRadius: 1, mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d', display: 'block', mb: 0.5 }}>
                        {q.answered_phase === "live" ? "Live Answer:" : "Post-Event Answer:"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#166534', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {q.answer_text}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {postEventQnaError && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
              {postEventQnaError}
            </Typography>
          )}
        </>
      )}
    </Paper>
  );

  const renderSpeedNetworking = () => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        p: { xs: 2, sm: 3 },
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
            Speed Networking Sessions
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Create and manage speed networking rounds during your event.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setSpeedNetworkingCreateOpen(true)}
          sx={{
            textTransform: "none",
            backgroundColor: "#10b8a6",
            "&:hover": { backgroundColor: "#0ea5a4" },
          }}
        >
          Create Session
        </Button>
      </Stack>

      {speedNetworkingLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={40} />
        </Box>
      ) : speedNetworkingError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {speedNetworkingError}
        </Alert>
      ) : speedNetworkingSessions.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
          }}
        >
          <PeopleTwoToneIcon
            sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
          />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No speed networking sessions yet. Click "Create Session" to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: "grey.50",
                  "& th": { fontSize: 13, color: "text.secondary" },
                }}
              >
                <TableCell>Session Name</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  Duration (min)
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  Status
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {speedNetworkingSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {session.name || "Unnamed Session"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {session.duration_minutes || 5} min
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    <Chip
                      label={session.status || "pending"}
                      size="small"
                      variant="outlined"
                      sx={{
                        textTransform: "capitalize",
                        borderColor:
                          session.status === "active"
                            ? "success.main"
                            : "default",
                        color:
                          session.status === "active"
                            ? "success.main"
                            : "text.secondary",
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSpeedNetworkingEditTarget(session);
                        setSpeedNetworkingEditOpen(true);
                      }}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSpeedNetworkingDeleteTarget(session);
                        setSpeedNetworkingDeleteOpen(true);
                      }}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Session Dialog */}
      <Dialog
        open={speedNetworkingCreateOpen || speedNetworkingEditOpen}
        onClose={() => {
          setSpeedNetworkingCreateOpen(false);
          setSpeedNetworkingEditOpen(false);
          setSpeedNetworkingEditTarget(null);
          setSpeedNetworkingFormName("");
          setSpeedNetworkingFormDuration("5");
          setSpeedNetworkingFormBuffer("15");
          setSpeedNetworkingFormStrategy("both");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {speedNetworkingEditTarget ? "Edit Session" : "Create Speed Networking Session"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            Configure a speed networking round. Participants will be automatically
            matched and have timed conversations with different matches each round.
          </Typography>

          {/* Session Name */}
          <TextField
            fullWidth
            label="Session Name"
            placeholder="e.g., Round 1, Investor Speed Dating"
            value={speedNetworkingFormName || speedNetworkingEditTarget?.name || ""}
            onChange={(e) => setSpeedNetworkingFormName(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
            helperText="Give your session a memorable name"
          />

          {/* Duration */}
          <TextField
            fullWidth
            label="Duration (minutes)"
            type="number"
            inputProps={{ min: "1", max: "30" }}
            value={speedNetworkingFormDuration || speedNetworkingEditTarget?.duration_minutes || 5}
            onChange={(e) => setSpeedNetworkingFormDuration(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
            helperText="Duration of each match (1-30 minutes)"
          />

          {/* Buffer Seconds */}
          <TextField
            fullWidth
            label="Transition Buffer (seconds)"
            type="number"
            inputProps={{ min: "0", max: "60" }}
            value={speedNetworkingFormBuffer || speedNetworkingEditTarget?.buffer_seconds || 15}
            onChange={(e) => setSpeedNetworkingFormBuffer(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
            helperText="Time to show transition screen between rounds (0 to disable)"
          />

          {/* Matching Criteria Configuration */}
          <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, textTransform: "uppercase" }}>
              Matching Criteria
            </Typography>

            {/* Skill */}
            <Box sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={criteriaConfig.skill.enabled}
                    onChange={(e) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        skill: { ...prev.skill, enabled: e.target.checked }
                      }))
                    }
                  />
                }
                label="Skill"
              />
              {criteriaConfig.skill.enabled && (
                <Box sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Threshold: {criteriaConfig.skill.threshold}%
                  </Typography>
                  <Slider
                    value={criteriaConfig.skill.threshold}
                    onChange={(e, val) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        skill: { ...prev.skill, threshold: val }
                      }))
                    }
                    min={0}
                    max={100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>

            {/* Location */}
            <Box sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={criteriaConfig.location.enabled}
                    onChange={(e) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        location: { ...prev.location, enabled: e.target.checked }
                      }))
                    }
                  />
                }
                label="Location"
              />
              {criteriaConfig.location.enabled && (
                <Box sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Threshold: {criteriaConfig.location.threshold}%
                  </Typography>
                  <Slider
                    value={criteriaConfig.location.threshold}
                    onChange={(e, val) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        location: { ...prev.location, threshold: val }
                      }))
                    }
                    min={0}
                    max={100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>

            {/* Experience */}
            <Box sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={criteriaConfig.experience.enabled}
                    onChange={(e) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        experience: { ...prev.experience, enabled: e.target.checked }
                      }))
                    }
                  />
                }
                label="Experience"
              />
              {criteriaConfig.experience.enabled && (
                <Box sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Threshold: {criteriaConfig.experience.threshold}%
                  </Typography>
                  <Slider
                    value={criteriaConfig.experience.threshold}
                    onChange={(e, val) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        experience: { ...prev.experience, threshold: val }
                      }))
                    }
                    min={0}
                    max={100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>

            {/* Education */}
            <Box sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={criteriaConfig.education.enabled}
                    onChange={(e) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        education: { ...prev.education, enabled: e.target.checked }
                      }))
                    }
                  />
                }
                label="Education"
              />
              {criteriaConfig.education.enabled && (
                <Box sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Threshold: {criteriaConfig.education.threshold}%
                  </Typography>
                  <Slider
                    value={criteriaConfig.education.threshold}
                    onChange={(e, val) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        education: { ...prev.education, threshold: val }
                      }))
                    }
                    min={0}
                    max={100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </Box>

            {/* Interest-Based Matching */}
            <Box sx={{ mb: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={criteriaConfig.interest_based.enabled}
                    onChange={(e) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        interest_based: { ...prev.interest_based, enabled: e.target.checked }
                      }))
                    }
                  />
                }
                label="Interest-Based Matching"
              />
              {criteriaConfig.interest_based.enabled && (
                <Box sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block", fontWeight: 500 }}>
                    Match Mode
                  </Typography>
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Box
                      onClick={() =>
                        setCriteriaConfig((prev) => ({
                          ...prev,
                          interest_based: { ...prev.interest_based, match_mode: "complementary" }
                        }))
                      }
                      sx={{
                        p: 1.2,
                        border: "2px solid",
                        borderColor:
                          criteriaConfig.interest_based.match_mode === "complementary"
                            ? "#10b8a6"
                            : "divider",
                        borderRadius: 1,
                        cursor: "pointer",
                        backgroundColor:
                          criteriaConfig.interest_based.match_mode === "complementary"
                            ? "rgba(16, 184, 166, 0.05)"
                            : "transparent",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "#10b8a6",
                          backgroundColor: "rgba(16, 184, 166, 0.05)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {criteriaConfig.interest_based.match_mode === "complementary" ? (
                          <Box sx={{ fontSize: 16 }}>👥</Box>
                        ) : (
                          <Box sx={{ fontSize: 16, opacity: 0.5 }}>👥</Box>
                        )}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: "block" }}>
                            Complementary (seek ↔ offer)
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px" }}>
                            Match opposites
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      onClick={() =>
                        setCriteriaConfig((prev) => ({
                          ...prev,
                          interest_based: { ...prev.interest_based, match_mode: "similar" }
                        }))
                      }
                      sx={{
                        p: 1.2,
                        border: "2px solid",
                        borderColor:
                          criteriaConfig.interest_based.match_mode === "similar"
                            ? "#10b8a6"
                            : "divider",
                        borderRadius: 1,
                        cursor: "pointer",
                        backgroundColor:
                          criteriaConfig.interest_based.match_mode === "similar"
                            ? "rgba(16, 184, 166, 0.05)"
                            : "transparent",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "#10b8a6",
                          backgroundColor: "rgba(16, 184, 166, 0.05)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {criteriaConfig.interest_based.match_mode === "similar" ? (
                          <Box sx={{ fontSize: 16 }}>😊</Box>
                        ) : (
                          <Box sx={{ fontSize: 16, opacity: 0.5 }}>😊</Box>
                        )}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: "block" }}>
                            Similar (same interests)
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px" }}>
                            Match like-minded
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      onClick={() =>
                        setCriteriaConfig((prev) => ({
                          ...prev,
                          interest_based: { ...prev.interest_based, match_mode: "both" }
                        }))
                      }
                      sx={{
                        p: 1.2,
                        border: "2px solid",
                        borderColor:
                          criteriaConfig.interest_based.match_mode === "both"
                            ? "#10b8a6"
                            : "divider",
                        borderRadius: 1,
                        cursor: "pointer",
                        backgroundColor:
                          criteriaConfig.interest_based.match_mode === "both"
                            ? "rgba(16, 184, 166, 0.05)"
                            : "transparent",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "#10b8a6",
                          backgroundColor: "rgba(16, 184, 166, 0.05)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {criteriaConfig.interest_based.match_mode === "both" ? (
                          <Box sx={{ fontSize: 16 }}>⭐</Box>
                        ) : (
                          <Box sx={{ fontSize: 16, opacity: 0.5 }}>⭐</Box>
                        )}
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: "block" }}>
                            Both (complementary then similar)
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "11px" }}>
                            Best of both worlds
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddTagDialog(true)}
                    sx={{ mt: 1, color: "primary.main" }}
                  >
                    Add Tags
                  </Button>
                  {criteriaConfig.interest_based.tags.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                        {criteriaConfig.interest_based.tags.map((tag, idx) => (
                          <Chip
                            key={idx}
                            label={tag.label}
                            size="small"
                            onDelete={() =>
                              setCriteriaConfig((prev) => ({
                                ...prev,
                                interest_based: {
                                  ...prev.interest_based,
                                  tags: prev.interest_based.tags.filter((_, i) => i !== idx)
                                }
                              }))
                            }
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSpeedNetworkingCreateOpen(false);
              setSpeedNetworkingEditOpen(false);
              setSpeedNetworkingEditTarget(null);
              setSpeedNetworkingFormName("");
              setSpeedNetworkingFormDuration("5");
              setSpeedNetworkingFormBuffer("15");
              setSpeedNetworkingFormStrategy("both");
              setCriteriaConfig({
                skill: { enabled: false, threshold: 50 },
                location: { enabled: false, threshold: 50 },
                experience: { enabled: false, threshold: 50 },
                education: { enabled: false, threshold: 50 },
                interest_based: { enabled: false, match_mode: "complementary", tags: [] }
              });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={speedNetworkingActionLoading}
            onClick={() => {
              const formData = {
                name: speedNetworkingFormName || speedNetworkingEditTarget?.name || "",
                duration_minutes: parseInt(speedNetworkingFormDuration) || 5,
                buffer_seconds: parseInt(speedNetworkingFormBuffer) || 15,
                matching_strategy: speedNetworkingFormStrategy || "both",
                criteria_config: criteriaConfig,
              };
              handleCreateOrUpdateSpeedNetworking(formData);
              setSpeedNetworkingFormName("");
              setSpeedNetworkingFormDuration("5");
              setSpeedNetworkingFormBuffer("15");
              setSpeedNetworkingFormStrategy("both");
              setCriteriaConfig({
                skill: { enabled: false, threshold: 50 },
                location: { enabled: false, threshold: 50 },
                experience: { enabled: false, threshold: 50 },
                education: { enabled: false, threshold: 50 },
                interest_based: { enabled: false, match_mode: "complementary", tags: [] }
              });
            }}
            sx={{
              backgroundColor: "#10b8a6",
              "&:hover": { backgroundColor: "#0ea5a4" },
            }}
          >
            {speedNetworkingActionLoading ? (
              <CircularProgress size={20} />
            ) : speedNetworkingEditTarget ? (
              "Update Session"
            ) : (
              "Create Session"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={speedNetworkingDeleteOpen}
        onClose={() => {
          setSpeedNetworkingDeleteOpen(false);
          setSpeedNetworkingDeleteTarget(null);
        }}
      >
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{speedNetworkingDeleteTarget?.name || 'this session'}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSpeedNetworkingDeleteOpen(false);
              setSpeedNetworkingDeleteTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={speedNetworkingActionLoading}
            onClick={handleDeleteSpeedNetworking}
          >
            {speedNetworkingActionLoading ? (
              <CircularProgress size={20} />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Interest Tag Dialog */}
      <Dialog
        open={showAddTagDialog}
        onClose={() => {
          setShowAddTagDialog(false);
          setTagLabel("");
          setTagCategory("both");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Interest Tag</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Tag Label"
            placeholder="e.g., Python, Marketing, Startups"
            value={tagLabel}
            onChange={(e) => setTagLabel(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />
          <TextField
            fullWidth
            label="Category"
            placeholder="e.g., investment, recruitment"
            value={tagCategory}
            onChange={(e) => setTagCategory(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />
          <FormControl fullWidth size="small">
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Type
            </Typography>
            <Select
              value={tagType}
              onChange={(e) => setTagType(e.target.value)}
            >
              <MenuItem value="seeking">🔍 Seeking</MenuItem>
              <MenuItem value="offering">🏪 Offering</MenuItem>
              <MenuItem value="both">👥 Both</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddTagDialog(false);
              setTagLabel("");
              setTagCategory("");
              setTagType("both");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (tagLabel.trim()) {
                setCriteriaConfig((prev) => ({
                  ...prev,
                  interest_based: {
                    ...prev.interest_based,
                    tags: [
                      ...prev.interest_based.tags,
                      { label: tagLabel.trim(), category: tagCategory, type: tagType }
                    ]
                  }
                }));
                setShowAddTagDialog(false);
                setTagLabel("");
                setTagCategory("");
                setTagType("both");
              }
            }}
            sx={{
              backgroundColor: "#10b8a6",
              "&:hover": { backgroundColor: "#0ea5a4" },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );

  const handleSaveSaleorProduct = async () => {
    if (!eventId || saleorSaving) return;
    setSaleorSaving(true);
    try {
      const token = getToken();
      const payload = {
        name: saleorName,
        description: saleorDescription,
        channel_listings: Object.entries(saleorPriceChanges).map(([id, price]) => ({
          channel_id: id,
          price: parseFloat(price) || 0
        })),
        stocks: Object.entries(saleorStockChanges).map(([id, quantity]) => ({
          warehouse_id: id,
          quantity: parseInt(quantity) || 0
        }))
      };

      const res = await fetch(`${API_ROOT}/events/${eventId}/saleor-product/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update Saleor product");

      toast.success("Saleor product updated successfully!");
      setProductDirty(false);
      fetchSaleorProduct();
      fetchSaleorDiscounts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaleorSaving(false);
    }
  };

  const renderProductManagement = () => {
    if (saleorLoading && !saleorProduct) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">Fetching Saleor product data...</Typography>
        </Box>
      );
    }

    if (saleorError && !saleorProduct) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <WarningRoundedIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>Unable to Load Product Data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{saleorError}</Typography>
          <Button variant="contained" onClick={fetchSaleorProduct} startIcon={<RefreshRoundedIcon />}>Retry</Button>
        </Paper>
      );
    }

    if (!saleorProduct) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <InfoRoundedIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>No Product Linked</Typography>
          <Typography variant="body2" color="text.secondary">This event does not have a linked Saleor product.</Typography>
        </Paper>
      );
    }

    return (
      <Box sx={{ pb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Product Management</Typography>
            <Typography variant="body2" color="text.secondary">Sync pricing and inventory with Saleor</Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={fetchSaleorProduct}
              disabled={saleorLoading || saleorSaving}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={saleorSaving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              onClick={handleSaveSaleorProduct}
              disabled={saleorLoading || saleorSaving}
              sx={{ px: 4 }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>

        <Stack spacing={5}>
          {/* Section 1: Basic Details */}
          <Box>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
              <InfoRoundedIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Basic Details</Typography>
            </Box>
            <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ maxWidth: 800 }}>
                <TextField
                  label="Product Name"
                  value={saleorName}
                  onChange={(e) => {
                    setSaleorName(e.target.value);
                    setProductDirty(true);
                  }}
                  size="small"
                  sx={{ mb: 3, width: 300, display: 'block' }}
                />

                <TextField
                  multiline
                  rows={3}
                  label="Description"
                  value={saleorDescription}
                  onChange={(e) => {
                    setSaleorDescription(e.target.value);
                    setProductDirty(true);
                  }}
                  placeholder="Enter product description..."
                  sx={{ mb: 4, width: 400, display: 'block' }}
                />

                <Box sx={{ 
                  p: 1.5, 
                  bgcolor: 'grey.50', 
                  borderRadius: 3, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 3 
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>SKU</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{saleorProduct.variants?.[0]?.sku || 'N/A'}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{saleorProduct.productType?.name}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Chip
                    label="Synced"
                    color="success"
                    size="small"
                    icon={<CheckCircleRoundedIcon />}
                    sx={{ borderRadius: 1.5, fontWeight: 700, px: 1 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Section 2: Channel Settings */}
          <Box>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
              <StorefrontRoundedIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Channel Settings & Pricing</Typography>
            </Box>
            <Paper sx={{ p: 0, borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Channel Name</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Slug</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Currency</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }} align="right">Listing Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {saleorChannels.map((channel) => {
                      const isDisabled = channel.slug !== 'default-channel';
                      return (
                      <TableRow key={channel.id} hover sx={{ opacity: isDisabled ? 0.5 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{channel.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 1 }}>
                            {channel.slug}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>{channel.currencyCode}</TableCell>
                        <TableCell align="right" sx={{ py: 2 }}>
                          <TextField
                            size="small"
                            type="number"
                            disabled={isDisabled}
                            value={saleorPriceChanges[channel.id] ?? 0}
                            onChange={(e) => {
                              setSaleorPriceChanges({
                                ...saleorPriceChanges,
                                [channel.id]: e.target.value
                              });
                              setProductDirty(true);
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">{channel.currencyCode === 'USD' ? '$' : channel.currencyCode}</InputAdornment>,
                            }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {saleorChannels.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">No active channels found in Saleor.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          {/* Section 3: Inventory */}
          <Box>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
              <Inventory2RoundedIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Inventory (Warehouses)</Typography>
            </Box>
            <Paper sx={{ p: 0, borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Warehouse Name</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Slug</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }} align="right">Available Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {saleorWarehouses.map((warehouse) => (
                      <TableRow key={warehouse.id} hover>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{warehouse.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 1 }}>
                            {warehouse.slug}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={saleorStockChanges[warehouse.id] ?? 0}
                            onChange={(e) => {
                              setSaleorStockChanges({
                                ...saleorStockChanges,
                                [warehouse.id]: e.target.value
                              });
                              setProductDirty(true);
                            }}
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {saleorWarehouses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">No warehouses available in Saleor.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          {/* Section 4: Discount Management */}
          <Box sx={{ opacity: isDiscountDisabled ? 0.55 : 1, pointerEvents: isDiscountDisabled ? 'none' : 'auto' }}>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
              <AttachMoneyRoundedIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Discount Management</Typography>
            </Box>

            {isDiscountDisabled && (
              <Alert severity={saleorProduct ? "warning" : "info"} sx={{ mb: 2 }}>
                {!saleorProduct
                  ? "Save/sync the Saleor product before creating discounts."
                  : "Save product changes before creating discounts."}
              </Alert>
            )}

            <Paper sx={{ p: 0, borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {/* Add Discount Button */}
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Active Discounts</Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateDiscount}
                  disabled={isDiscountDisabled}
                  sx={{ backgroundColor: '#10b8a6' }}
                >
                  Add Discount
                </Button>
              </Box>

              {/* Discounts Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Badge</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Channel</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Reward</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }}>Dates</TableCell>
                      <TableCell sx={{ py: 2, fontWeight: 700 }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {saleorDiscounts.map((discount) => (
                      <TableRow key={discount.id} hover>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{discount.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={discount.badge_label === 'early_bird' ? 'Early Bird' : 'Bundle Price'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2">{discount.channel_name}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {discount.reward_value_type === 'PERCENTAGE'
                              ? `${discount.reward_value}%`
                              : `${discount.currency || 'USD'} ${discount.reward_value}`}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            {discount.start_date && discount.end_date
                              ? `${discount.start_date} to ${discount.end_date}`
                              : discount.start_date
                              ? `From ${discount.start_date}`
                              : 'Ongoing'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <IconButton
                            size="small"
                            onClick={() => openEditDiscount(discount)}
                            disabled={isDiscountDisabled}
                            title="Edit discount"
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => syncDiscount(discount)}
                            disabled={isDiscountDisabled || syncingDiscountId === discount.id}
                            title="Sync with Saleor"
                          >
                            {syncingDiscountId === discount.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <RefreshRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deleteDiscount(discount)}
                            disabled={isDiscountDisabled || deletingDiscountId === discount.id}
                            title="Delete discount"
                          >
                            {deletingDiscountId === discount.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {saleorDiscounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">No discounts yet. Create one to get started.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Stack>
        <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider', pt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={saleorSaving ? <CircularProgress size={20} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSaveSaleorProduct}
            disabled={saleorLoading || saleorSaving}
            sx={{ px: 6, py: 1.5, borderRadius: 2, fontWeight: 700 }}
          >
            Save All Changes
          </Button>
        </Box>

        {/* Discount Dialog */}
        <Dialog open={discountDialogOpen} onClose={closeDiscountDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingDiscount ? 'Edit Discount' : 'Create Discount'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Discount Type"
              value="Catalogue"
              disabled
              size="small"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Name"
              value={discountForm.name}
              onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={discountForm.description}
              onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
              size="small"
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="channel-label" size="small">Channel</InputLabel>
              <Select
                labelId="channel-label"
                label="Channel"
                value={discountForm.channel_id}
                onChange={(e) => setDiscountForm({ ...discountForm, channel_id: e.target.value })}
                size="small"
              >
                {saleorChannels.map((channel) => (
                  <MenuItem key={channel.id} value={channel.id}>
                    {channel.name} ({channel.currencyCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="discount-type-label" size="small">Discount Type</InputLabel>
              <Select
                labelId="discount-type-label"
                label="Discount Type"
                value={discountForm.reward_value_type}
                onChange={(e) => setDiscountForm({ ...discountForm, reward_value_type: e.target.value })}
                size="small"
              >
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                <MenuItem value="FIXED">Currency / Fixed amount</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Reward Value"
              type="number"
              value={discountForm.reward_value}
              onChange={(e) => setDiscountForm({ ...discountForm, reward_value: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {discountForm.reward_value_type === 'PERCENTAGE' ? '%' : (saleorChannels.find(c => c.id === discountForm.channel_id)?.currencyCode || 'USD')}
                  </InputAdornment>
                ),
              }}
              required
            />

            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={discountForm.start_date}
              onChange={(e) => setDiscountForm({ ...discountForm, start_date: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={discountForm.end_date}
              onChange={(e) => setDiscountForm({ ...discountForm, end_date: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Condition"
              value={saleorProduct ? `Product is ${saleorProduct.name}` : "No product selected"}
              disabled
              size="small"
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <Select
                label="Badge Label"
                value={discountForm.badge_label}
                onChange={(e) => setDiscountForm({ ...discountForm, badge_label: e.target.value })}
                size="small"
              >
                <MenuItem value="early_bird">Early Bird</MenuItem>
                <MenuItem value="bundle_price">Bundle Price</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDiscountDialog} disabled={discountSaving}>Cancel</Button>
            <Button
              onClick={saveDiscount}
              variant="contained"
              disabled={discountSaving || !discountForm.name || !discountForm.channel_id || !discountForm.reward_value}
              sx={{ backgroundColor: '#10b8a6' }}
            >
              {discountSaving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              {editingDiscount ? 'Update Discount' : 'Save Discount'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const renderEdit = () => {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden", // containment
        }}
      >
        <EditEventForm
          event={event}
          onUpdated={(updated) => {
            setEvent(updated);
            toast.success("Event updated successfully");
            // optional: switch back to overview or stay
          }}
          onCancel={() => setTab(0)} // Go back to Overview
        />
      </Paper>
    );
  };

  // ── Q&A export download ──────────────────────────────────────────────────
  const handleQnaExport = async (fmt) => {
    if (!event) return;
    setQnaExportLoading((prev) => ({ ...prev, [fmt]: true }));
    setQnaExportError("");
    try {
      const token = getToken();
      const url = `${API_ROOT}/interactions/questions/export/?event_id=${event.id}&export_format=${fmt}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = nameMatch ? nameMatch[1] : `qna_export.${fmt}`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      setQnaExportError(err.message || "Export failed. Please try again.");
    } finally {
      setQnaExportLoading((prev) => ({ ...prev, [fmt]: false }));
    }
  };

  const loadPostEventQna = useCallback(async ({ silent = false } = {}) => {
    if (!isPast || !event) return;
    if (!silent) setPostEventQnaLoading(true);
    setPostEventQnaError("");
    try {
      const token = getToken();
      const res = await fetch(
        `${API_ROOT}/interactions/questions/unanswered/?event_id=${event.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`Failed to load unanswered questions (${res.status})`);
      }
      const data = await res.json();
      const withUpvotes = data.map((q) => ({
        ...q,
        upvote_count: (q.upvoters?.length || 0) + (q.guest_upvotes?.length || 0),
      }));
      setPostEventQnaQuestions(withUpvotes);

      const resAll = await fetch(
        `${API_ROOT}/interactions/questions/?event_id=${event.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resAll.ok) {
        const allQuestions = await resAll.json();
        const answeredWithText = (Array.isArray(allQuestions) ? allQuestions : [])
          .filter((q) => q.is_answered && (q.answer_text || "").trim().length > 0)
          .sort((a, b) => {
            const at = a.answered_at ? new Date(a.answered_at).getTime() : 0;
            const bt = b.answered_at ? new Date(b.answered_at).getTime() : 0;
            return bt - at;
          });
        setPostEventAnsweredQuestions(answeredWithText);
      }
    } catch (err) {
      setPostEventQnaError(err.message || "Failed to load questions");
    } finally {
      if (!silent) setPostEventQnaLoading(false);
    }
  }, [isPast, event]);

  useEffect(() => {
    if (!isPast || !event) return;
    loadPostEventQna();
    const pollId = window.setInterval(() => {
      loadPostEventQna({ silent: true });
    }, 15000);
    return () => window.clearInterval(pollId);
  }, [isPast, event?.id, loadPostEventQna]);

  const handleOpenAnswerModal = (question) => {
    setAnsweringQuestion(question);
    setAnswerText("");
    setIsEditingAnswer(false);
    setNotifyAuthor(true);
    setNotifyInterested(true);
    setNotifyAll(false);
    setAnswerModalOpen(true);
  };

  const handleOpenEditAnswerModal = (question) => {
    setAnsweringQuestion(question);
    setAnswerText(question.answer_text || "");
    setIsEditingAnswer(true);
    setNotifyAuthor(true);
    setNotifyInterested(true);
    setNotifyAll(false);
    setAnswerModalOpen(true);
  };

  const handleCloseAnswerModal = () => {
    setAnswerModalOpen(false);
    setAnsweringQuestion(null);
    setAnswerText("");
    setIsEditingAnswer(false);
    setAnswerSubmitting(false);
  };

  const handlePublishAnswer = async () => {
    if (!answeringQuestion || !answerText.trim() || !event) return;
    setAnswerSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_ROOT}/interactions/questions/${answeringQuestion.id}/post_event_answer/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer_text: answerText.trim(),
            notify_author: notifyAuthor,
            notify_interested_participants: notifyInterested,
            notify_all_participants: notifyAll,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed to publish answer (${res.status})`);
      }
      const savedQuestion = await res.json();
      setPostEventQnaQuestions((prev) =>
        prev.filter((q) => q.id !== answeringQuestion.id)
      );
      setPostEventAnsweredQuestions((prev) => {
        const remaining = prev.filter((q) => q.id !== savedQuestion.id);
        return [savedQuestion, ...remaining];
      });
      handleCloseAnswerModal();
      toast.success(isEditingAnswer ? "Answer updated successfully!" : "Answer published and participants notified!");
    } catch (err) {
      toast.error(err.message || "Failed to publish answer");
    } finally {
      setAnswerSubmitting(false);
    }
  };

  // ---- render ----
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2.5, md: 3 },
          px: { xs: 1.5, sm: 3, lg: 4 },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                fontWeight: 700,
              }}
            >
              {avatarLetter}
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, lineHeight: 1.2 }}
              >
                {event?.title || "Event Details"}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 0.5 }}
              >
                Review purchases and resources for this event.
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
          >
            {isOwner && (
              <Button
                variant="outlined"
                startIcon={<EditNoteRoundedIcon fontSize="small" />}
                onClick={() => setTab(tabLabels.indexOf("Edit") !== -1 ? tabLabels.indexOf("Edit") : 0)}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  px: 2.5,
                }}
              >
                Edit
              </Button>
            )}

            {isOwner ? (
              // Host Button for Owner
              (status === "cancelled" ? (<Button
                disabled
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  px: 2.5,
                  backgroundColor: "#fef2f2 !important",
                  color: "#b91c1c !important",
                  borderColor: "#fecaca !important",
                }}
              >Cancelled
              </Button>) : (<Tooltip title={event?.is_hidden && !isOwner ? "Please unhide the event to host it" : ""} disableInteractive={false}>
                <Button
                  onClick={onHost}
                  startIcon={<LiveTvRoundedIcon />}
                  variant="contained"
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    px: 2.5,
                    bgcolor: isPast ? "#CBD5E1" : "#10b8a6",
                    "&:hover": { bgcolor: isPast ? "#CBD5E1" : "#0ea5a4" },
                  }}
                  disabled={!!hostingId || isPast || (event?.is_hidden && !isOwner)}
                >
                  {hostingId ? <CircularProgress size={18} color="inherit" /> : (isPast ? "Ended" : "Host")}
                </Button>
              </Tooltip>))
            ) : (
              // Join Button for Staff/Member
              (canShowActiveJoin && (<Button
                onClick={handleJoinLive}
                variant="contained"
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  px: 2.5,
                  bgcolor: "#10b8a6",
                  "&:hover": { bgcolor: "#0ea5a4" },
                }}
                disabled={!!joiningId}
              >
                {joiningId ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} color="inherit" />
                    <span>Joining...</span>
                  </Stack>
                ) : (
                  joinLabel
                )}
              </Button>))
            )}

            <Button
              variant="contained"
              startIcon={<ArrowBackIosNewRoundedIcon fontSize="small" />}
              onClick={() => navigate(-1)}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                px: 2.5,
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              Back to events
            </Button>
          </Stack>
        </Box>

        {/* Loading / not found */}
        {eventLoading && (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <Box sx={{ width: 260, mx: "auto" }}>
              <LinearProgress />
              <Typography
                variant="body2"
                sx={{ mt: 2, color: "text.secondary" }}
              >
                Loading event details…
              </Typography>
            </Box>
          </Box>
        )}

        {!eventLoading && !event && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Event not found
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                This event may have been deleted or you don’t have access.
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Tabs + content */}
        {!eventLoading && event && (
          <>
            {/* desktop / tablet tabs */}
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                mb: 2,
                display: { xs: "none", sm: "block" },
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, value) => setTab(value)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabLabels.map((label, idx) => (
                  <Tab
                    key={label}
                    label={label.toUpperCase()}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 14,
                      mr: 2,
                    }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* mobile tab selector */}
            <Box
              sx={{
                display: { xs: "flex", sm: "none" },
                mb: 2,
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setMobileTabsOpen(true)}
                endIcon={<ArrowDropDownRoundedIcon />}
                sx={{
                  justifyContent: "space-between",
                  textTransform: "none",
                  borderRadius: 999,
                }}
              >
                {tabLabels[tab]}
              </Button>
            </Box>

            {/* Tabs content – full width aligned with header */}
            <Box sx={{ mb: 4 }}>
              {isOwner ? (
                <>
                  {tab === tabLabels.indexOf("Overview") && renderOverview()}
                  {event?.registration_type === 'apply' ? (
                    <>
                      {tab === tabLabels.indexOf("Applications") && renderApplications()}
                      {tab === tabLabels.indexOf("Registered Members") && renderMembers()}
                      {tab === tabLabels.indexOf("Guest Audit") && renderGuestAudit()}
                      {tab === tabLabels.indexOf("Session") && renderSessions()}
                      {tab === tabLabels.indexOf("Resources") && renderResources()}
                      {tab === tabLabels.indexOf("Q&A") && <EventQnAManager event={event} onEventUpdated={setEvent} />}
                      {tab === tabLabels.indexOf("Speed Networking") && renderSpeedNetworking()}
                      {tab === tabLabels.indexOf("Breakout Rooms Tables") && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                      {tab === tabLabels.indexOf("Social Lounge") && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                      {tab === tabLabels.indexOf("Lounge Settings") && renderLoungeSettings()}
                      {tabLabels.indexOf("Product Management") !== -1 && tab === tabLabels.indexOf("Product Management") && renderProductManagement()}
                      {tab === tabLabels.indexOf("Edit") && renderEdit()}
                    </>
                  ) : (
                    <>
                      {tab === tabLabels.indexOf("Registered Members") && renderMembers()}
                      {tab === tabLabels.indexOf("Guest Audit") && renderGuestAudit()}
                      {tab === tabLabels.indexOf("Session") && renderSessions()}
                      {tab === tabLabels.indexOf("Resources") && renderResources()}
                      {tab === tabLabels.indexOf("Q&A") && <EventQnAManager event={event} onEventUpdated={setEvent} />}
                      {tab === tabLabels.indexOf("Speed Networking") && renderSpeedNetworking()}
                      {tab === tabLabels.indexOf("Breakout Rooms Tables") && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                      {tab === tabLabels.indexOf("Social Lounge") && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                      {tab === tabLabels.indexOf("Lounge Settings") && renderLoungeSettings()}
                      {tabLabels.indexOf("Product Management") !== -1 && tab === tabLabels.indexOf("Product Management") && renderProductManagement()}
                      {tab === tabLabels.indexOf("Edit") && renderEdit()}
                    </>
                  )}
                </>
              ) : (
                <>
                  {tab === 0 && renderOverview()}
                  {tab === 1 && renderResources()}
                </>
              )}
            </Box>

            {/* mobile tabs drawer */}
            <Drawer
              anchor="right"
              open={mobileTabsOpen}
              onClose={() => setMobileTabsOpen(false)}
            >
              <Box sx={{ p: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: "text.secondary" }}
                >
                  Sections
                </Typography>
                {tabLabels.map((label, idx) => (
                  <Button
                    key={label}
                    fullWidth
                    onClick={() => {
                      setTab(idx);
                      setMobileTabsOpen(false);
                    }}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: tab === idx ? "grey.100" : "transparent",
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            </Drawer>
          </>
        )}



        {/* global error snackbar for event load */}
        <Snackbar
          open={!!eventError}
          autoHideDuration={4000}
          onClose={() => setEventError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setEventError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {eventError}
          </Alert>
        </Snackbar>

        {/* registrations error – small snackbar */}
        <Snackbar
          open={!!registrationsError}
          autoHideDuration={4000}
          onClose={() => setRegistrationsError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setRegistrationsError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {registrationsError}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!loungeError}
          autoHideDuration={4000}
          onClose={() => setLoungeError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setLoungeError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {loungeError}
          </Alert>
        </Snackbar>

        <Dialog
          open={loungeCreateOpen}
          onClose={() => {
            setLoungeCreateOpen(false);
            setLoungeCreateIcon(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {loungeCreateCategory === 'BREAKOUT' ? 'Create Breakout Room' : 'Create Lounge Table'}
          </DialogTitle>
          <br />
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label={loungeCreateCategory === 'BREAKOUT' ? 'Room name' : 'Table name'}
                value={loungeCreateName}
                onChange={(e) => setLoungeCreateName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Seats"
                type="number"
                inputProps={{ min: 2, max: 30 }}
                value={loungeCreateSeats}
                onChange={(e) => setLoungeCreateSeats(e.target.value)}
                onBlur={(e) => setLoungeCreateSeats(String(normalizeSeatsInput(e.target.value)))}
                helperText="Allowed range: 2 to 30 seats"
                fullWidth
              />
              {loungeCreateCategory !== 'BREAKOUT' && (
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Table logo (optional)
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
                      {loungeCreateIcon ? "Replace logo" : "Upload logo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => setLoungeCreateIcon(e.target.files?.[0] || null)}
                      />
                    </Button>
                    {loungeCreatePreview && (
                      <Avatar
                        src={loungeCreatePreview}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: "grey.100" }}
                      />
                    )}
                    {loungeCreateIcon && (
                      <Button
                        size="small"
                        onClick={() => setLoungeCreateIcon(null)}
                        sx={{ textTransform: "none" }}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeCreateOpen(false);
                setLoungeCreateIcon(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateLoungeTable}
              disabled={!loungeCreateName.trim() || loungeCreateSaving}
              sx={{ textTransform: "none" }}
            >
              {loungeCreateSaving ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={loungeEditOpen}
          onClose={() => {
            setLoungeEditOpen(false);
            setLoungeEditIcon(null);
            setLoungeEditTarget(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {(loungeEditTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'Edit Breakout Room' : 'Edit Lounge Table'}
          </DialogTitle>
          <br />
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label={(loungeEditTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'Room name' : 'Table name'}
                value={loungeEditName}
                onChange={(e) => setLoungeEditName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Seats"
                type="number"
                inputProps={{ min: 2, max: 30 }}
                value={loungeEditSeats}
                onChange={(e) => setLoungeEditSeats(e.target.value)}
                onBlur={(e) => setLoungeEditSeats(String(normalizeSeatsInput(e.target.value)))}
                helperText="Allowed range: 2 to 30 seats"
                fullWidth
              />
              {(loungeEditTarget?.category || 'LOUNGE') !== 'BREAKOUT' && (
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Table logo (optional)
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
                      {loungeEditIcon ? "Replace logo" : "Upload logo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => setLoungeEditIcon(e.target.files?.[0] || null)}
                      />
                    </Button>
                    {(loungeEditPreview || loungeEditTarget?.icon_url) && (
                      <Avatar
                        src={loungeEditPreview || loungeEditTarget?.icon_url || ""}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: "grey.100" }}
                      />
                    )}
                    {loungeEditIcon && (
                      <Button
                        size="small"
                        onClick={() => setLoungeEditIcon(null)}
                        sx={{ textTransform: "none" }}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeEditOpen(false);
                setLoungeEditIcon(null);
                setLoungeEditTarget(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleUpdateLoungeTable}
              disabled={!loungeEditName.trim() || loungeEditSaving}
              sx={{ textTransform: "none" }}
            >
              {loungeEditSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={loungeDeleteOpen}
          onClose={() => {
            setLoungeDeleteOpen(false);
            setLoungeDeleteTarget(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {(loungeDeleteTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'Delete Breakout Room?' : 'Delete Lounge Table?'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will remove the {(loungeDeleteTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'room' : 'table'} "{loungeDeleteTarget?.name || "Table"}" and clear its seats.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeDeleteOpen(false);
                setLoungeDeleteTarget(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteLoungeTable}
              disabled={loungeDeleteSaving}
              sx={{ textTransform: "none" }}
            >
              {loungeDeleteSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          PaperProps={{ style: { borderRadius: 16, padding: 8 } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {dialogAction === "deregister" && "Deregister User?"}
            {dialogAction === "approve" && "Approve Cancellation?"}
            {dialogAction === "reject" && "Reject Request?"}
            {dialogAction === "reinstate" && "Reinstate User?"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {dialogAction === "deregister" && "Are you sure you want to remove this user from the event?"}
              {dialogAction === "approve" && "This will approve the cancellation and refund process. Proceed?"}
              {dialogAction === "reject" && "This will reject the cancellation request. The user will remain registered."}
              {dialogAction === "reinstate" && "Are you sure you want to reinstate this user? They will be added back to the event."}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={actionLoading}
              color="inherit"
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={actionLoading}
              variant="contained"
              color={dialogAction === "approve" || dialogAction === "reinstate" ? "success" : "error"}
              className="rounded-full normal-case px-4"
              autoFocus
            >
              {actionLoading ? "Processing..." : (dialogAction === "reinstate" ? "Reinstate" : "Confirm")}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={addParticipantOpen}
          onClose={() => setAddParticipantOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Add Participant</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Search for an existing user or enter an email address.
            </DialogContentText>
            <Autocomplete
              id="user-search-autocomplete"
              freeSolo
              options={userOptions}
              loading={searchLoading}
              getOptionLabel={(option) => {
                // Handle both object (selected user) and string (free input)
                if (typeof option === "string") return option;
                return `${option.first_name || ""} ${option.last_name || ""} (${option.email})`;
              }}
              filterOptions={(x) => x} // Disable client-side filtering since we do server-side
              inputValue={searchQuery}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                // If user clears input, clear selection too
                if (!newInputValue) setSelectedUser(null);
              }}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  // User typed free text and hit enter
                  setAddParticipantEmail(newValue);
                  setSelectedUser(null);
                } else {
                  // User selected an object
                  setSelectedUser(newValue);
                  // If they selected an object, we can opt to clear manual email or keep it sync
                  setAddParticipantEmail(newValue?.email || "");
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="User Search or Email"
                  variant="outlined"
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key} {...optionProps}>
                    <Grid container alignItems="center">
                      <Grid item sx={{ display: 'flex', width: 44 }}>
                        <Avatar
                          src={option.profile?.user_image_url || option.profile?.avatar || ""}
                          alt={option.username}
                          sx={{ width: 30, height: 30 }}
                        />
                      </Grid>
                      <Grid item sx={{ width: 'calc(100% - 44px)', wordWrap: 'break-word' }}>
                        <Box component="span" sx={{ fontWeight: 'bold' }}>
                          {option.first_name} {option.last_name}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {option.email}
                        </Typography>
                      </Grid>
                    </Grid>
                  </li>
                );
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddParticipantOpen(false)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddParticipant}
              variant="contained"
              disabled={addParticipantLoading}
              sx={{ textTransform: "none" }}
            >
              {addParticipantLoading ? "Adding..." : "Add"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Session Dialog */}
        <Dialog
          open={addSessionOpen}
          onClose={() => {
            setAddSessionOpen(false);
            setNewSessionData({
              title: "",
              description: "",
              session_date: "",
              start_time: "",
              end_time: "",
              session_type: "main",
            });
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Create New Session</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Session Title *"
                value={newSessionData.title}
                onChange={(e) =>
                  setNewSessionData({ ...newSessionData, title: e.target.value })
                }
                size="small"
                placeholder="e.g., Opening Keynote, Workshop, Networking"
              />
              <TextField
                fullWidth
                label="Description"
                value={newSessionData.description}
                onChange={(e) =>
                  setNewSessionData({ ...newSessionData, description: e.target.value })
                }
                multiline
                rows={3}
                size="small"
              />
              <FormControl size="small" fullWidth>
                <Select
                  value={newSessionData.session_type}
                  onChange={(e) =>
                    setNewSessionData({ ...newSessionData, session_type: e.target.value })
                  }
                  label="Type"
                >
                  <MenuItem value="main">Main Session</MenuItem>
                  <MenuItem value="breakout">Breakout Session</MenuItem>
                  <MenuItem value="workshop">Workshop</MenuItem>
                  <MenuItem value="networking">Networking</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Session Date *"
                type="date"
                value={newSessionData.session_date}
                onChange={(e) =>
                  setNewSessionData({ ...newSessionData, session_date: e.target.value })
                }
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText="Auto-synced with start time date"
                inputProps={{
                  min: event?.start_time ? dayjs(event.start_time).format("YYYY-MM-DD") : "",
                  max: event?.end_time ? dayjs(event.end_time).format("YYYY-MM-DD") : "",
                }}
              />
              <TextField
                fullWidth
                label="Start Time *"
                type="datetime-local"
                value={newSessionData.start_time ? dayjs(newSessionData.start_time).format("YYYY-MM-DDTHH:mm") : ""}
                onChange={(e) => {
                  // Convert local datetime string to ISO UTC datetime
                  const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                  const utcDateTime = localDateTime.utc().toISOString();
                  const dateStr = localDateTime.format("YYYY-MM-DD");
                  // Auto-sync session_date with start_time date (local date)
                  setNewSessionData({
                    ...newSessionData,
                    start_time: utcDateTime,
                    session_date: dateStr
                  });
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText="Must be within event date range"
              />
              <TextField
                fullWidth
                label="End Time *"
                type="datetime-local"
                value={newSessionData.end_time ? dayjs(newSessionData.end_time).format("YYYY-MM-DDTHH:mm") : ""}
                onChange={(e) => {
                  // Convert local datetime string to ISO UTC datetime
                  const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                  const utcDateTime = localDateTime.utc().toISOString();
                  setNewSessionData({ ...newSessionData, end_time: utcDateTime });
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
                error={isSessionTimeInvalid()}
                helperText={getSessionTimeErrorMessage() || "Must be after start time"}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setAddSessionOpen(false);
                setNewSessionData({
                  title: "",
                  description: "",
                  session_date: "",
                  start_time: "",
                  end_time: "",
                  session_type: "main",
                });
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSession}
              variant="contained"
              disabled={
                addSessionLoading ||
                !newSessionData.title.trim() ||
                !newSessionData.session_date ||
                !newSessionData.start_time ||
                !newSessionData.end_time ||
                isSessionTimeInvalid()
              }
              sx={{ textTransform: "none" }}
            >
              {addSessionLoading ? "Creating..." : "Create Session"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Session Edit Dialog */}
        <Dialog
          open={sessionEditOpen}
          onClose={closeSessionEdit}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Edit Session</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedSession && (
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Title"
                  value={selectedSession.title}
                  onChange={(e) =>
                    setSelectedSession({ ...selectedSession, title: e.target.value })
                  }
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={selectedSession.description}
                  onChange={(e) =>
                    setSelectedSession({ ...selectedSession, description: e.target.value })
                  }
                  multiline
                  rows={3}
                  size="small"
                />
                <FormControl size="small" fullWidth>
                  <Select
                    value={selectedSession.session_type || "main"}
                    onChange={(e) =>
                      setSelectedSession({ ...selectedSession, session_type: e.target.value })
                    }
                    label="Type"
                  >
                    <MenuItem value="main">Main Session</MenuItem>
                    <MenuItem value="breakout">Breakout Session</MenuItem>
                    <MenuItem value="workshop">Workshop</MenuItem>
                    <MenuItem value="networking">Networking</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Session Date"
                  type="date"
                  value={selectedSession.session_date || ""}
                  onChange={(e) =>
                    setSelectedSession({ ...selectedSession, session_date: e.target.value })
                  }
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={selectedSession.start_time ? dayjs(selectedSession.start_time).format("YYYY-MM-DDTHH:mm") : ""}
                  onChange={(e) => {
                    // Convert local datetime string to ISO UTC datetime
                    const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                    const utcDateTime = localDateTime.utc().toISOString();
                    const dateStr = localDateTime.format("YYYY-MM-DD");
                    // Auto-sync session_date with start_time date (local date)
                    setSelectedSession({
                      ...selectedSession,
                      start_time: utcDateTime,
                      session_date: dateStr
                    });
                  }}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  helperText="Must be within event date range"
                />
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={selectedSession.end_time ? dayjs(selectedSession.end_time).format("YYYY-MM-DDTHH:mm") : ""}
                  onChange={(e) => {
                    // Convert local datetime string to ISO UTC datetime
                    const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                    const utcDateTime = localDateTime.utc().toISOString();
                    setSelectedSession({ ...selectedSession, end_time: utcDateTime });
                  }}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={selectedSession.end_time && selectedSession.start_time && new Date(selectedSession.end_time) <= new Date(selectedSession.start_time)}
                  helperText={selectedSession.end_time && selectedSession.start_time && new Date(selectedSession.end_time) <= new Date(selectedSession.start_time) ? "End time must be after start time" : "Must be after start time"}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeSessionEdit} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSessionUpdate(selectedSession)}
              variant="contained"
              disabled={sessionActionLoading}
              sx={{ textTransform: "none" }}
            >
              {sessionActionLoading ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Session Delete Confirmation Dialog */}
        <Dialog
          open={sessionDeleteDialogOpen}
          onClose={closeDeleteSessionDialog}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Session</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the session "<strong>{sessionToDelete?.title}</strong>"?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDeleteSessionDialog} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={handleSessionDelete}
              variant="contained"
              color="error"
              disabled={sessionActionLoading}
              sx={{ textTransform: "none" }}
            >
              {sessionActionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        {eventId && (
          <>
            <InviteUsersDialog
              open={inviteUsersOpen}
              onClose={() => setInviteUsersOpen(false)}
              eventId={eventId}
              eventTitle={event?.title || ""}
            />
            <InviteEmailsDialog
              open={inviteEmailsOpen}
              onClose={() => setInviteEmailsOpen(false)}
              mode="event"
              targetIdOrSlug={eventId}
            />
          </>
        )}

        {/* Cancel Event Dialog */}
        <Dialog
          open={cancelEventOpen}
          onClose={() => !cancelEventLoading && setCancelEventOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Cancel Event</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Are you sure you want to cancel this event? This action will set the event status to "cancelled" and notify all registered participants.
            </Typography>

            <TextField
              fullWidth
              label="Cancellation Message (Optional)"
              placeholder="Explain why the event is cancelled..."
              multiline
              rows={3}
              value={cancellationMessage}
              onChange={(e) => setCancellationMessage(e.target.value)}
              sx={{ mb: 3 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              fullWidth
              label="Recommend another event (Optional)"
              value={recommendedEventId}
              onChange={(e) => setRecommendedEventId(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 3 }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {hostedEvents.map((ev) => (
                <MenuItem key={ev.id} value={ev.id}>
                  {ev.title} ({dayjs(ev.start_time).format('MMM D')})
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={notifyParticipants}
                  onChange={(e) => setNotifyParticipants(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Send cancellation email to participants
                </Typography>
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setCancelEventOpen(false)}
              disabled={cancelEventLoading}
              sx={{ textTransform: "none", color: "text.secondary", fontWeight: 600 }}
            >
              Keep Event
            </Button>
            <Button
              onClick={handleCancelEvent}
              disabled={cancelEventLoading}
              variant="contained"
              color="error"
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
            >
              {cancelEventLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Cancelling...</span>
                </Stack>
              ) : (
                "Yes, Cancel Event"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Hide Event Dialog (platform_admin only) */}
        <Dialog
          open={hideEventOpen}
          onClose={() => !hideEventLoading && setHideEventOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {event?.is_hidden ? "Unhide Event" : "Hide Event from Platform"}
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary">
              {event?.is_hidden
                ? "This will make the event visible again on the platform. All users will be able to find and view it."
                : "This will hide the event from the platform. Regular users and participants will no longer be able to find or view this event. You can unhide it at any time."}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setHideEventOpen(false)}
              disabled={hideEventLoading}
              sx={{ textTransform: "none", color: "text.secondary", fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleHideEvent}
              disabled={hideEventLoading}
              variant="contained"
              color={event?.is_hidden ? "success" : "inherit"}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600, ...(!event?.is_hidden && { bgcolor: "grey.700", "&:hover": { bgcolor: "grey.800" } }) }}
            >
              {hideEventLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>{event?.is_hidden ? "Unhiding..." : "Hiding..."}</span>
                </Stack>
              ) : (
                event?.is_hidden ? "Yes, Unhide Event" : "Yes, Hide Event"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Event Dialog (platform_admin only) */}
        <Dialog
          open={deleteEventOpen}
          onClose={() => !deleteEventLoading && setDeleteEventOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "error.main" }}>Delete Event Permanently</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              <strong>This action is permanent and cannot be undone.</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deleting this event will permanently remove all associated data, including registrations, sessions, resources, lounge tables, speed networking sessions, and all other related records. This cannot be reversed.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setDeleteEventOpen(false)}
              disabled={deleteEventLoading}
              sx={{ textTransform: "none", color: "text.secondary", fontWeight: 600 }}
            >
              Keep Event
            </Button>
            <Button
              onClick={handleDeleteEvent}
              disabled={deleteEventLoading}
              variant="contained"
              color="error"
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
            >
              {deleteEventLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Deleting...</span>
                </Stack>
              ) : (
                "Yes, Delete Permanently"
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Post-Event Q&A Answer Modal */}
        <Dialog open={answerModalOpen} onClose={handleCloseAnswerModal} maxWidth="sm" fullWidth>
          <DialogTitle>{isEditingAnswer ? "Edit Answer" : "Answer Question"}</DialogTitle>
          <DialogContent>
            {answeringQuestion && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, p: 1.5, bgcolor: "#f9fafb", borderRadius: 1 }}>
                  <strong>Q:</strong> {answeringQuestion.content}
                </Typography>

                <TextField
                  autoFocus
                  multiline
                  rows={4}
                  fullWidth
                  label="Your Answer"
                  placeholder="Type your answer here..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifyAuthor}
                        onChange={(e) => setNotifyAuthor(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Notify question author</Typography>
                        <Typography variant="caption" color="text.secondary">Default: On</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifyInterested}
                        onChange={(e) => setNotifyInterested(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Notify interested participants (upvoters)</Typography>
                        <Typography variant="caption" color="text.secondary">Default: On</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifyAll}
                        onChange={(e) => setNotifyAll(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Notify all event participants</Typography>
                        <Typography variant="caption" color="text.secondary">Default: Off</Typography>
                      </Box>
                    }
                  />
                </FormGroup>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAnswerModal} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handlePublishAnswer}
              variant="contained"
              disabled={answerSubmitting || !answerText.trim()}
              sx={{ bgcolor: "#22c55e", color: "white" }}
            >
              {answerSubmitting ? (isEditingAnswer ? "Updating..." : "Publishing...") : (isEditingAnswer ? "Update Answer" : "Publish Answer")}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box >
  );
}
