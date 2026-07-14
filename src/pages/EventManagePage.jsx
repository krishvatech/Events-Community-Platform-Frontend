// src/pages/EventManagePage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import RegisteredActions from "../components/RegisteredActions";
import InviteUsersDialog from "../components/InviteUsersDialog";
import InviteEmailsDialog from "../components/InviteEmailsDialog";
import QRCodeDisplay from "../components/QRCodeDisplay.jsx";
import ParticipantsAttendanceTable from "../components/ParticipantsAttendanceTable.jsx";

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
import EventEmailTemplatesManager from "../components/admin/EventEmailTemplatesManager.jsx";
import EventConfirmationEmailManager from "../components/admin/EventConfirmationEmailManager.jsx";
import ParticipantInformationManager from "../components/admin/ParticipantInformationManager.jsx";
import PromotionalProfilesManager from "../components/admin/PromotionalProfilesManager.jsx";
import ApplicationTracksManager from "../components/ApplicationTracksManager.jsx";
import EventManageApplications from "./EventManageApplications.jsx";
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
import ForwardToInboxRoundedIcon from "@mui/icons-material/ForwardToInboxRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import PeopleTwoToneIcon from "@mui/icons-material/PeopleTwoTone";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
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

  if (ev.status === "archived") return "archived";
  if (ev.status === "cancelled") return "cancelled";
  if (ev.status === "ended") return "past";
  if (ev.is_live && ev.status !== "ended") return "live";
  if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
};

const hasActiveArchiveMarker = (ev) => {
  if (!ev) return false;
  if (String(ev.status || "").toLowerCase() === "archived") return true;
  if (!ev.archived_at) return false;
  if (!ev.restored_at) return true;
  return new Date(ev.archived_at).getTime() > new Date(ev.restored_at).getTime();
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
    case "archived":
      return { label: "Deleted", color: "default", bg: "rgba(71,85,105,0.16)" };
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
const EVENT_TAB_LABELS = ["Overview", "Product Management", "Orders", "Edit", "Applications", "Application Tracks", "Registered Members", "Participants", "Participant Information", "Promotional Profiles", "Companion", "Guest Audit", "Session", "Resources", "Q&A", "Speed Networking", "Breakout Rooms Tables", "Social Lounge", "Lounge Settings", "Email Notifications"];

const STAFF_EVENT_TAB_LABELS = ["Overview", "Resources"];

// Helper to get dynamic tab labels based on event registration type
const getTabLabels = (event, isOwner) => {
  if (!isOwner) return STAFF_EVENT_TAB_LABELS;
  let labels = [...EVENT_TAB_LABELS];
  // Remove Applications and Application Tracks tabs if it's not an 'apply' type event
  if (event?.registration_type !== 'apply') {
    labels = labels.filter(label => label !== "Applications" && label !== "Application Tracks");
  }
  // Only show payment/product tabs for paid events (is_free === false strictly)
  if (event?.is_free !== false) {
    labels = labels.filter(label => label !== "Product Management" && label !== "Orders");
  }
  // Hide Companion tab for virtual-only events
  const eventFormat = event?.event_format || event?.format;
  if (eventFormat === 'virtual') {
    labels = labels.filter(label => label !== "Companion");
  }
  // Hide Participants tab for upcoming or live events (only show for past events)
  const eventStatus = computeStatus(event);
  if (eventStatus !== 'past') {
    labels = labels.filter(label => label !== "Participants");
  }
  return labels;
};
const MEMBERS_PER_PAGE = 10;
const RESOURCES_PER_PAGE = 5;

const PREDEFINED_ROLES = [
  { name: "Speaker", color: "#7c3aed" },
  { name: "VIP", color: "#b45309" },
  { name: "Sponsor", color: "#0369a1" },
  { name: "Host", color: "#15803d" },
  { name: "Moderator", color: "#dc2626" },
  { name: "Chair", color: "#0891b2" },
];


export default function EventManagePage() {
  const { slug } = useParams();
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
  const [totalMembersCount, setTotalMembersCount] = useState(0);
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
  const [loungeDeleteReason, setLoungeDeleteReason] = useState("");
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

  // ---- Companion Tab State ----
  const [companionLabels, setCompanionLabels] = useState([]);
  const [companionLabelsLoading, setCompanionLabelsLoading] = useState(false);
  const [companionLabelsError, setCompanionLabelsError] = useState("");
  const [companionNewName, setCompanionNewName] = useState("");
  const [companionNewColor, setCompanionNewColor] = useState("#6366f1");
  const [companionLabelSaving, setCompanionLabelSaving] = useState(false);
  const [companionLabelError, setCompanionLabelError] = useState("");
  const [companionDeleteTarget, setCompanionDeleteTarget] = useState(null);
  const [companionDeleteOpen, setCompanionDeleteOpen] = useState(false);
  const [companionDeleteLoading, setCompanionDeleteLoading] = useState(false);
  const [companionEditTarget, setCompanionEditTarget] = useState(null);
  const [companionEditName, setCompanionEditName] = useState("");
  const [companionEditColor, setCompanionEditColor] = useState("#6366f1");
  const [companionEditSaving, setCompanionEditSaving] = useState(false);
  const [companionEditOpen, setCompanionEditOpen] = useState(false);
  const [companionAssignTarget, setCompanionAssignTarget] = useState(null);
  const [companionAssignOpen, setCompanionAssignOpen] = useState(false);
  const [companionAssignSelected, setCompanionAssignSelected] = useState([]);
  const [companionAssignSaving, setCompanionAssignSaving] = useState(false);
  const [companionBulkSelected, setCompanionBulkSelected] = useState([]);
  const [companionBulkAssignOpen, setCompanionBulkAssignOpen] = useState(false);
  const [companionBulkLabels, setCompanionBulkLabels] = useState([]);
  const [companionBulkSaving, setCompanionBulkSaving] = useState(false);
  const [companionBulkMode, setCompanionBulkMode] = useState("add");
  const [companionRegs, setCompanionRegs] = useState([]);
  const [companionRegsLoading, setCompanionRegsLoading] = useState(false);
  const [companionRegsError, setCompanionRegsError] = useState("");
  const [companionSearch, setCompanionSearch] = useState("");
  const [companionRegsRefresh, setCompanionRegsRefresh] = useState(0);

  // ---- 1:1 Networking Scheduling State ----
  const [networkingSettings, setNetworkingSettings] = useState(null);
  const [networkingSettingsLoading, setNetworkingSettingsLoading] = useState(false);
  const [networkingSettingsSaving, setNetworkingSettingsSaving] = useState(false);
  const [networkingSettingsError, setNetworkingSettingsError] = useState("");
  const [networkingTablesLoading, setNetworkingTablesLoading] = useState(false);
  const [networkingTables, setNetworkingTables] = useState([]);
  const [networkingTablesError, setNetworkingTablesError] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableLocation, setNewTableLocation] = useState("");
  const [newTableSaving, setNewTableSaving] = useState(false);
  const [networkingTableEditTarget, setNetworkingTableEditTarget] = useState(null);
  const [networkingTableEditOpen, setNetworkingTableEditOpen] = useState(false);
  const [networkingTableEditName, setNetworkingTableEditName] = useState("");
  const [networkingTableEditLocation, setNetworkingTableEditLocation] = useState("");
  const [networkingTableEditSaving, setNetworkingTableEditSaving] = useState(false);
  const [networkingTableDeleteTarget, setNetworkingTableDeleteTarget] = useState(null);
  const [networkingTableDeleteOpen, setNetworkingTableDeleteOpen] = useState(false);
  const [networkingTableDeleteLoading, setNetworkingTableDeleteLoading] = useState(false);
  const [networkingTableDeleteCheckingId, setNetworkingTableDeleteCheckingId] = useState(null);
  const [networkingTableDeleteReason, setNetworkingTableDeleteReason] = useState("");
  const [networkingDurations, setNetworkingDurations] = useState([5, 10, 15]);
  const [customDurationInput, setCustomDurationInput] = useState("");
  const [customDurationError, setCustomDurationError] = useState("");
  const [networkingAllowedWindows, setNetworkingAllowedWindows] = useState([]);
  const [networkingEnabled, setNetworkingEnabled] = useState(false);
  const [networkingReminderMinutes, setNetworkingReminderMinutes] = useState(15);
  const [networkingSuccessMessage, setNetworkingSuccessMessage] = useState("");
  const [networkingWindowErrors, setNetworkingWindowErrors] = useState([]);

  // Resend Mail to All State
  const [resendMailOpen, setResendMailOpen] = useState(false);
  const [resendMailLoading, setResendMailLoading] = useState(false);
  const [resendMailResult, setResendMailResult] = useState(null);
  const [resendMailResultOpen, setResendMailResultOpen] = useState(false);

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
    show_guest_participant_count: false,
    show_public_hosts: false,
    show_public_speakers: false,
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
    interests: {
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
  const lifecycleSource = event?.wordpress_event_id
    ? "wordpress"
    : (event?.locked_platform_slugs?.[0] || "imaa_connect");
  const isLocalLifecycle = lifecycleSource === "imaa_connect";
  const lifecycleManagementNote = event?.wordpress_event_id
    ? "This event is owned by WordPress. Change cancellation/archive state in WordPress so sync remains authoritative."
    : (!isLocalLifecycle
      ? `This event is owned by ${lifecycleSource}. Change its lifecycle on the source platform.`
      : "");
  const canManageLounge = isOwner; // Only owner can manage lounge now

  // Q&A Export State
  const [qnaExportLoading, setQnaExportLoading] = useState({ csv: false, pdf: false });
  const [qnaExportError, setQnaExportError] = useState("");

  // Members Export State
  const [membersExportLoading, setMembersExportLoading] = useState(false);
  const [membersExportError, setMembersExportError] = useState("");

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

  // Archive / restore lifecycle state. This preserves registrations, orders,
  // recordings, WordPress/MANDA mappings, canonical IDs, and Saleor IDs.
  const [archiveEventOpen, setArchiveEventOpen] = useState(false);
  const [archiveEventLoading, setArchiveEventLoading] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

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
  const [saleorPriceLabel, setSaleorPriceLabel] = useState(event?.price_label || "");
  const [targetChannelSlug, setTargetChannelSlug] = useState("default-channel");

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
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
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

  // Paid event order review state
  const [eventOrders, setEventOrders] = useState([]);
  const [eventOrdersLoading, setEventOrdersLoading] = useState(false);
  const [eventOrdersError, setEventOrdersError] = useState("");
  const [eventOrdersTotal, setEventOrdersTotal] = useState(0);
  const [eventOrdersPage, setEventOrdersPage] = useState(1);
  const [eventOrdersLimit] = useState(20);
  const [markPaidLoadingId, setMarkPaidLoadingId] = useState(null);
  const [markPaidDialogOrder, setMarkPaidDialogOrder] = useState(null);
  const [markPaidReference, setMarkPaidReference] = useState("");

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
          setHostedEvents(list.filter(e => e.id !== event?.id));
        }
      } catch (err) {
        console.error("Failed to fetch hosted events", err);
      }
    };
    fetchHosted();
  }, [cancelEventOpen, isOwner, event?.id]);

  const tabLabels = getTabLabels(event, isOwner);
  const guestAuditTabIndex = tabLabels.indexOf("Guest Audit");
  const speedNetworkingTabIndex = tabLabels.indexOf("Speed Networking");
  const productManagementTabIndex = tabLabels.indexOf("Product Management");
  const ordersTabIndex = tabLabels.indexOf("Orders");

  useEffect(() => {
    const requestedTab = location.state?.initialTab;
    if (!requestedTab) return;
    const idx = tabLabels.indexOf(requestedTab);
    if (idx !== -1 && tab !== idx) {
      setTab(idx);
    }
  }, [location.state?.initialTab, tabLabels, tab]);

  const fetchSaleorProduct = useCallback(async () => {
    if (!event?.id || !isOwner) return;
    setSaleorLoading(true);
    setSaleorError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event.id}/saleor-product/`, {
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
      setTargetChannelSlug(json.target_channel_slug || "default-channel");
      setSaleorPriceLabel(json.event_price_label || "");
    } catch (err) {
      console.error("Failed to fetch Saleor product:", err);
      setSaleorError(err.message || "Failed to load Saleor product details");
    } finally {
      setSaleorLoading(false);
    }
  }, [event?.id, isOwner]);

  const fetchSaleorDiscounts = useCallback(async () => {
    if (!event?.id || !isOwner) return;
    setDiscountLoading(true);
    setDiscountError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event.id}/saleor-discounts/`, {
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
    } catch (err) {
      console.error("Failed to fetch Saleor discounts:", err);
      setDiscountError(err.message || "Failed to load discounts");
    } finally {
      setDiscountLoading(false);
    }
  }, [event?.id, isOwner]);

  useEffect(() => {
    if (productManagementTabIndex !== -1 && tab === productManagementTabIndex) {
      fetchSaleorProduct();
      fetchSaleorDiscounts();
    }
  }, [tab, productManagementTabIndex, fetchSaleorProduct, fetchSaleorDiscounts]);

  const fetchEventOrders = useCallback(async (page = 1) => {
    if (!event?.id || !isOwner || event?.is_free !== false) return;

    const numericPage = Number(page);
    const safePage = Number.isFinite(numericPage) && numericPage > 0
      ? Math.floor(numericPage)
      : 1;

    setEventOrdersLoading(true);
    setEventOrdersError("");
    try {
      const token = getToken();
      const offset = (safePage - 1) * eventOrdersLimit;
      const url = new URL(`${API_ROOT}/events/${event?.id}/orders/`, window.location.origin);
      url.searchParams.set("limit", String(eventOrdersLimit));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      setEventOrders(Array.isArray(body.orders) ? body.orders : []);
      setEventOrdersTotal(Number(body.count || 0));
      setEventOrdersPage(safePage);
    } catch (err) {
      console.error("Failed to fetch event orders:", err);
      setEventOrdersError(err.message || "Failed to load event orders");
    } finally {
      setEventOrdersLoading(false);
    }
  }, [event?.id, isOwner, event?.is_free, eventOrdersLimit]);

  const getSuggestedPaymentReference = useCallback((order) => {
    const existing = String(order?.payment_reference || "").trim();
    if (existing) return existing;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const orderPart = String(order?.id || "0").padStart(3, "0");
    return `TXN-${yyyy}${mm}${dd}-${orderPart}`;
  }, []);

  const openMarkPaidDialog = useCallback((order) => {
    if (!order?.id || markPaidLoadingId) return;
    setMarkPaidReference(getSuggestedPaymentReference(order));
    setMarkPaidDialogOrder(order);
  }, [getSuggestedPaymentReference, markPaidLoadingId]);

  const closeMarkPaidDialog = useCallback(() => {
    if (markPaidLoadingId) return;
    setMarkPaidDialogOrder(null);
    setMarkPaidReference("");
  }, [markPaidLoadingId]);

  const handleMarkEventOrderPaid = useCallback(async () => {
    const order = markPaidDialogOrder;
    if (!order?.id || markPaidLoadingId) return;

    setMarkPaidLoadingId(order.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/orders/${order.id}/mark-paid/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          payment_reference: markPaidReference.trim(),
          payment_source: "manual",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.detail || body.error || `HTTP ${res.status}`);
      }
      const itemCount = Array.isArray(body.items) ? body.items.length : 0;
      toast.success(`Order #${order.id} marked as paid${itemCount > 1 ? ` (${itemCount} event items confirmed)` : ""}.`);
      setEventOrders((prev) => prev.map((row) => (row.id === order.id ? body : row)));
      setRegsRefresh((value) => value + 1);
      setMarkPaidDialogOrder(null);
      setMarkPaidReference("");
    } catch (err) {
      toast.error(err.message || "Failed to mark order paid");
    } finally {
      setMarkPaidLoadingId(null);
    }
  }, [markPaidDialogOrder, markPaidReference, markPaidLoadingId]);



  const downloadEventOrderInvoice = useCallback(async (invoice) => {
    if (!invoice?.id) return;
    try {
      const token = getToken();
      const downloadUrl = invoice.download_url
        ? (invoice.download_url.startsWith("http") ? invoice.download_url : `${API_ORIGIN}${invoice.download_url}`)
        : `${API_ROOT}/invoices/${invoice.id}/download_pdf/`;
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Invoice PDF is not ready yet.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.number || `invoice-${invoice.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Could not download invoice.");
    }
  }, []);

  const generateEventOrderInvoicePdf = useCallback(async (order) => {
    const invoice = order?.invoice;
    if (!invoice?.id) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/invoices/${invoice.id}/generate_pdf/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || body.error || "Could not generate invoice PDF.");
      setEventOrders((prev) => prev.map((row) => (
        row.id === order.id ? { ...row, invoice: { ...row.invoice, ...body } } : row
      )));
      toast.success("Invoice PDF generated.");
      if (body?.pdf_ready) {
        await downloadEventOrderInvoice({ ...invoice, ...body });
      }
    } catch (err) {
      toast.error(err.message || "Could not generate invoice PDF.");
    }
  }, [downloadEventOrderInvoice]);

  useEffect(() => {
    if (ordersTabIndex !== -1 && tab === ordersTabIndex) {
      fetchEventOrders();
    }
  }, [tab, ordersTabIndex, fetchEventOrders]);

  const openCreateDiscount = () => {
    setEditingDiscount(null);
    const defaultChannel = saleorChannels.find(c => c.slug === "default-channel");
    const eventStartDate = event?.start_time ? dayjs(event.start_time).subtract(15, "days").format("YYYY-MM-DD") : "";
    const eventEndDate = event?.end_time ? dayjs(event.end_time).format("YYYY-MM-DD") : "";
    setDiscountForm({
      name: "",
      description: "",
      channel_id: defaultChannel?.id || "",
      reward_value_type: "PERCENTAGE",
      reward_value: "",
      start_date: eventStartDate,
      end_date: eventEndDate,
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
    if (!event?.id || discountSaving) return;
    setDiscountSaving(true);
    try {
      const token = getToken();
      const method = editingDiscount ? "PATCH" : "POST";
      const url = editingDiscount
        ? `${API_ROOT}/events/${event?.id}/saleor-discounts/${editingDiscount.id}/`
        : `${API_ROOT}/events/${event?.id}/saleor-discounts/`;

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
    if (!event?.id) return;
    setDeletingDiscountId(discount.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/saleor-discounts/${discount.id}/`, {
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
    if (!event?.id) return;
    setSyncingDiscountId(discount.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/saleor-discounts/${discount.id}/sync/`, {
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
    if (!event?.id || cancelEventLoading) return;
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

      const res = await fetch(`${API_ROOT}/events/${event?.id}/cancel/`, {
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
    if (!event?.id || hideEventLoading) return;
    setHideEventLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/`, {
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

  const handleArchiveEvent = async () => {
    if (!event?.id || archiveEventLoading) return;
    setArchiveEventLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/soft-delete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deletion_reason: archiveReason.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
      toast.success(
        `${event?.title || "Event"} was removed from the platform. It remains stored in the database with all related history.`,
        { autoClose: 8000 }
      );
      setArchiveEventOpen(false);
      setArchiveReason("");
      navigate("/admin/events", { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setArchiveEventLoading(false);
    }
  };

  const [myReg, setMyReg] = useState(null); // New state for my registration
  const resources = event?.resources || [];

  // ---- load event ----
  useEffect(() => {
    if (!slug) return;

    if (initialEvent && String(initialEvent.slug) === String(slug)) {
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

        const url = `${API_ROOT}/events/${encodeURIComponent(slug)}/`;
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
          slug,
          error: e?.message,
          status: e?.status,
          url: `${API_ROOT}/events/${encodeURIComponent(slug)}/`
        });
        setEventError(e?.message || "Unable to load event");
      } finally {
        setEventLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [slug, initialEvent]);

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
      // ✅ CRITICAL FIX: Always use backend values as source of truth, never override with localStorage
      // The defaults are applied at event creation time in the backend, so backend values are always correct
      setParticipantVisibility({
        show_participants_before_event: event.show_participants_before_event ?? true,
        show_participants_after_event: event.show_participants_after_event ?? false,
        show_registered_participant_count: event.show_registered_participant_count ?? true,
        show_guest_participant_count: event.show_guest_participant_count ?? false,
        show_public_hosts: event.show_public_hosts ?? true,
        show_public_speakers: event.show_public_speakers ?? true,
        show_public_moderators: event.show_public_moderators ?? false,
        show_speed_networking_match_history: event.show_speed_networking_match_history ?? true,
      });
    }
  }, [event]);

  // ---- load registrations once per event/refresh (owner only) ----
  useEffect(() => {
    if (!event?.id || !isOwner) return;

    const token = getToken();
    if (!token) return;

    const controller = new AbortController();

    const loadRegistrations = async () => {
      setRegistrationsLoading(true);
      setRegistrationsError("");
      try {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Fetch the owner member list only when the event changes or after an explicit refresh.
        // Do not refetch this endpoint on local table pagination clicks.
        const res = await fetch(
          `${API_ROOT}/events/${event?.id}/registrations/?limit=200`,
          { headers, signal: controller.signal }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }

        let data = [];
        let count = 0;

        if (Array.isArray(json)) {
          data = json;
          count = json.length;
        } else if (json?.results && Array.isArray(json.results)) {
          data = json.results;
          count = json.count || data.length;
        }

        setRegistrations(data);
        setTotalMembersCount(count);
      } catch (e) {
        if (e.name === "AbortError") return;
        setRegistrationsError(e?.message || "Unable to load members");
      } finally {
        setRegistrationsLoading(false);
      }
    };

    loadRegistrations();
    return () => controller.abort();
  }, [event?.id, isOwner, regsRefresh]);

  // ---- Companion Tab: load badge labels ----
  const companionTabIndex = tabLabels.indexOf("Companion");
  useEffect(() => {
    if (!event?.id || !isOwner || companionTabIndex === -1 || tab !== companionTabIndex) return;
    const controller = new AbortController();
    setCompanionLabelsLoading(true);
    setCompanionLabelsError("");
    (async () => {
      try {
        const res = await fetch(
          `${API_ROOT}/event-badge-labels/?event_id=${event?.id}`,
          { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
        const data = Array.isArray(json) ? json : (json.results || []);
        setCompanionLabels(data);
      } catch (e) {
        if (e.name === "AbortError") return;
        setCompanionLabelsError(e.message || "Failed to load labels");
      } finally {
        setCompanionLabelsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [event?.id, isOwner, tab, companionTabIndex, companionRegsRefresh]);

  // ---- Companion Tab: load registrations with badge_labels ----
  useEffect(() => {
    if (!event?.id || !isOwner || companionTabIndex === -1 || tab !== companionTabIndex) return;
    const controller = new AbortController();
    setCompanionRegsLoading(true);
    setCompanionRegsError("");
    (async () => {
      try {
        const res = await fetch(
          `${API_ROOT}/events/${event?.id}/registrations/?limit=100`,
          { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
        const data = Array.isArray(json) ? json : (json.results || []);
        setCompanionRegs(data);
      } catch (e) {
        if (e.name === "AbortError") return;
        setCompanionRegsError(e.message || "Failed to load participants");
      } finally {
        setCompanionRegsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [event?.id, isOwner, tab, companionTabIndex, companionRegsRefresh]);

  // ---- Load 1:1 Networking Settings and Tables ----
  useEffect(() => {
    if (!event?.id || !isOwner || companionTabIndex === -1 || tab !== companionTabIndex) return;
    const controller = new AbortController();
    const loadNetworking = async () => {
      setNetworkingSettingsLoading(true);
      setNetworkingTablesLoading(true);
      try {
        const token = getToken();
        const settingsRes = await fetch(`${API_ROOT}/events/${event?.id}/networking-settings/`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setNetworkingSettings(settings);
          setNetworkingEnabled(settings.enabled || false);
          setNetworkingDurations(settings.duration_options_minutes || [5, 10, 15]);

          // Normalize allowed windows with default values if empty
          const getTodayDateValue = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          };

          const normalizedWindows = (settings.allowed_windows || []).map(window => ({
            date: window.date || getTodayDateValue(),
            start: window.start || "09:00",
            end: window.end || "17:00"
          }));
          setNetworkingAllowedWindows(normalizedWindows);

          setNetworkingReminderMinutes(settings.reminder_minutes_before || 15);
        }

        const tablesRes = await fetch(`${API_ROOT}/events/${event?.id}/networking-tables/`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (tablesRes.ok) {
          const tables = await tablesRes.json();
          setNetworkingTables(Array.isArray(tables) ? tables : (tables.results || []));
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setNetworkingSettingsError(e.message || "Failed to load networking settings");
        }
      } finally {
        setNetworkingSettingsLoading(false);
        setNetworkingTablesLoading(false);
      }
    };
    loadNetworking();
    return () => controller.abort();
  }, [event?.id, isOwner, tab, companionTabIndex]);

  useEffect(() => {
    if (!event?.id || !isOwner || guestAuditTabIndex === -1 || tab !== guestAuditTabIndex) return;

    const token = getToken();
    if (!token) return;

    const controller = new AbortController();

    const loadGuestAudit = async () => {
      setGuestAuditLoading(true);
      setGuestAuditError("");
      try {
        const res = await fetch(`${API_ROOT}/events/${event?.id}/guest-audit/`, {
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
  }, [event?.id, isOwner, tab, guestAuditTabIndex]);

  // ---- load sessions (owner only, for multi-day events) ----
  useEffect(() => {
    if (!event?.id || !isOwner) return;

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

        console.log("🔄 Fetching sessions for event:", event?.id, "is_multi_day:", event?.is_multi_day);

        const res = await fetch(
          `${API_ROOT}/events/${event?.id}/sessions/`,
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
  }, [event?.id, isOwner, event]);

  // ---- load MY registration (for staff/attendee view) ----
  useEffect(() => {
    if (!event?.id || isOwner) return;

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
          `${API_ROOT}/event-registrations/?event=${event?.id}&user=${userId}`,
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
  }, [event?.id, isOwner]);

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
    if (speedNetworkingTabIndex === -1 || tab !== speedNetworkingTabIndex || !event?.id || !isOwner) return;

    const fetchSpeedNetworkingSessions = async () => {
      setSpeedNetworkingLoading(true);
      setSpeedNetworkingError("");
      try {
        const token = getToken();
        const res = await fetch(
          `${API_ROOT}/events/${event?.id}/speed-networking/`,
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
  }, [tab, event?.id, isOwner, speedNetworkingTabIndex]);

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
          interests: { enabled: false, match_mode: "complementary", tags: [] }
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
    if (!event?.id || !canManageLounge) return;
    setLoungeLoading(true);
    setLoungeError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/lounge-state/`, {
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
  }, [event?.id, canManageLounge, normalizeLoungeTables]);

  useEffect(() => {
    fetchLoungeTables();
  }, [fetchLoungeTables]);

  const handleCreateLoungeTable = async () => {
    const name = (loungeCreateName || "").trim();
    if (!name || !event?.id || loungeCreateSaving) return;
    setLoungeCreateSaving(true);
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${event?.id}/create-lounge-table/`;
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
    if (!event?.id || !loungeEditTarget || loungeEditSaving) return;
    const name = (loungeEditName || "").trim();
    if (!name) return;
    setLoungeEditSaving(true);
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${event?.id}/lounge-table-update/`;
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
    setLoungeDeleteReason("");
    setLoungeDeleteOpen(true);
  };

  const handleDeleteLoungeTable = async () => {
    if (!event?.id || !loungeDeleteTarget || loungeDeleteSaving) return;
    setLoungeDeleteSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/lounge-table-delete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          table_id: loungeDeleteTarget.id,
          reason: loungeDeleteReason.trim(),
        }),
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
      setLoungeDeleteReason("");
      toast.success(
        json?.detail ||
          "The table was removed from the platform and remains stored in the database."
      );
    } catch (e) {
      setLoungeError(e?.message || "Failed to delete lounge table");
    } finally {
      setLoungeDeleteSaving(false);
    }
  };

  // Speed Networking Handlers
  const handleCreateOrUpdateSpeedNetworking = async (formData) => {
    if (!event?.id) return;
    setSpeedNetworkingActionLoading(true);
    try {
      const token = getToken();
      const method = speedNetworkingEditTarget ? "PATCH" : "POST";
      const url = speedNetworkingEditTarget
        ? `${API_ROOT}/events/${event?.id}/speed-networking/${speedNetworkingEditTarget.id}/`
        : `${API_ROOT}/events/${event?.id}/speed-networking/`;

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
    if (!event?.id || !speedNetworkingDeleteTarget) return;
    setSpeedNetworkingActionLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_ROOT}/events/${event?.id}/speed-networking/${speedNetworkingDeleteTarget.id}/`,
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
      toast.success(
        "The session was removed from the schedule and remains stored in the database with its participants, attendance, bookmarks, recording and history."
      );
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
    if (!event?.id) return;

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

      const res = await fetch(`${API_ROOT}/events/${event?.id}/add-participant/`, {
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

  const handleResendMailToAll = async () => {
    setResendMailLoading(true);
    setResendMailOpen(false);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/resend-registration-emails/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || "Failed to send emails");
      setResendMailResult(json);
      setResendMailResultOpen(true);
    } catch (err) {
      toast.error(err.message || "Failed to send emails");
    } finally {
      setResendMailLoading(false);
    }
  };

  const normalizeFriendStatus = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "incoming_pending") return "pending_incoming";
    if (value === "outgoing_pending") return "pending_outgoing";
    if (["friends", "friend", "accepted"].includes(value)) return "friends";
    if (value === "self") return "self";
    return "none";
  };

  // Fetch friend status for visible users in one request instead of one API per member.
  const fetchFriendStatusesBulk = async (userIds) => {
    const ids = Array.from(new Set((userIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)));

    if (!ids.length) return {};

    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/friends/status-bulk/?user_ids=${ids.join(",")}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return {};

      const rawResults = data?.results || {};
      return ids.reduce((acc, id) => {
        acc[id] = normalizeFriendStatus(rawResults[String(id)]?.status || rawResults[id]?.status);
        return acc;
      }, {});
    } catch (err) {
      console.error("Failed to fetch bulk friend status:", err);
      return {};
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

    if (hasActiveArchiveMarker(event)) {
      toast.error("Deleted events cannot be hosted.");
      return;
    }
    if (event?.status === "cancelled") {
      toast.error("Cancelled events cannot be hosted.");
      return;
    }

    // If external streaming enabled, redirect to external platform instead of RTK
    if (event?.use_external_streaming && event?.external_streaming_url) {
      // Use host link if available (for organizer), otherwise use participant link
      const redirectUrl = event?.external_streaming_host_link
        ? event.external_streaming_host_link
        : event.external_streaming_url;
      window.open(redirectUrl, '_blank');
      return;
    }

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

    // If external streaming enabled, redirect to external platform instead of RTK
    if (event?.use_external_streaming && event?.external_streaming_url) {
      // Use host link if available and user is owner, otherwise use participant link
      const redirectUrl = isOwner && event?.external_streaming_host_link
        ? event.external_streaming_host_link
        : event.external_streaming_url;
      window.open(redirectUrl, '_blank');
      return;
    }

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
    if (!event?.id) return;
    try {
      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_ROOT}/events/${event?.id}/`, { headers });
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
  const isArchivedLifecycle = hasActiveArchiveMarker(event) || status === "archived";
  const isLiveLifecycleBlocked = isArchivedLifecycle || event?.status === "cancelled" || status === "cancelled";
  const canArchiveLocally = Boolean(
    isLocalLifecycle
    && !isArchivedLifecycle
    && !event?.is_live
    && event?.status !== "live"
    && status !== "live"
    && (
      event?.status === "draft"
      || event?.status === "published"
      || event?.status === "ended"
      || event?.status === "cancelled"
      || status === "past"
    )
  );

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

    // Sort by registered_at based on memberSort selection
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

  const MEMBERS_PER_PAGE = 10;
  const totalMembers = totalMembersCount;
  const memberPageCount = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE || 1)
  );
  const memberStart = filteredMembers.length === 0 ? 0 : (memberPage - 1) * MEMBERS_PER_PAGE + 1;
  const memberEnd = Math.min(memberStart + MEMBERS_PER_PAGE - 1, filteredMembers.length);
  // Slice filtered members to show only current page (10 per page)
  const pagedMembers = filteredMembers.slice((memberPage - 1) * MEMBERS_PER_PAGE, memberPage * MEMBERS_PER_PAGE);

  // Load friend statuses for visible members using the bulk endpoint.
  useEffect(() => {
    if (!isOwner || !pagedMembers.length) return;

    const missingUserIds = pagedMembers
      .map((member) => member.user_id)
      .filter((userId) => userId && !friendStatusByUser[userId]);

    if (!missingUserIds.length) return;

    let cancelled = false;
    const loadStatuses = async () => {
      const statuses = await fetchFriendStatusesBulk(missingUserIds);
      if (cancelled || Object.keys(statuses).length === 0) return;
      setFriendStatusByUser(prev => ({ ...prev, ...statuses }));
    };

    loadStatuses();
    return () => { cancelled = true; };
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

              {/* Application Required Warning */}
              {event.registration_type === 'apply' && event.status === 'draft' && (
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: '#e3f2fd',
                    border: '2px solid #1976d2',
                    borderRadius: 2,
                    p: 2,
                    mb: 2.5,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <InfoRoundedIcon sx={{ color: '#1565c0', mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1565c0', mb: 0.5 }}>
                        Application Tracks Required
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#1565c0', mb: 1 }}>
                        This event requires at least one valid application track before publishing. Go to the "Application Tracks" tab to create one.
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#0d47a1', fontStyle: 'italic' }}>
                        Each track needs: label, submission mode(s), pricing tier(s), and role mapping(s).
                      </Typography>
                    </Box>
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
                    <Tooltip
                      title={
                        isArchivedLifecycle
                          ? "Deleted events cannot be hosted."
                          : (event?.status === "cancelled" || status === "cancelled")
                            ? "Cancelled events cannot be hosted."
                            : (event?.is_hidden && !isOwner)
                              ? "Please unhide the event to host it"
                              : ""
                      }
                      disableInteractive={false}
                    >
                      <Button
                        onClick={onHost}
                        startIcon={<LiveTvRoundedIcon />}
                        variant="contained"
                        fullWidth
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          bgcolor: (isPast || isLiveLifecycleBlocked) ? "#CBD5E1" : "#10b8a6",
                          py: 1,
                          fontSize: 15,
                          fontWeight: 600,
                          "&:hover": { bgcolor: (isPast || isLiveLifecycleBlocked) ? "#CBD5E1" : "#0ea5a4" },
                          ...(status === "cancelled" && {
                            "&.Mui-disabled": {
                              bgcolor: "#fef2f2",
                              color: "#b91c1c"
                            }
                          })
                        }}
                        disabled={!!hostingId || isPast || isLiveLifecycleBlocked || (event?.is_hidden && !isOwner)}
                      >
                        {hostingId ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={20} color="inherit" />
                            <span>Starting...</span>
                          </Stack>
                        ) : (
                          isArchivedLifecycle
                            ? "Deleted"
                            : isPast
                              ? "Event Ended"
                              : (status === "cancelled" || event?.status === "cancelled")
                                ? "Cancelled"
                                : "Host Event"
                        )}
                      </Button>
                    </Tooltip>

                    {/* Mark as Live Button - For External Streaming Events */}
                    {event?.use_external_streaming && !isArchivedLifecycle && status !== "live" && status !== "past" && status !== "cancelled" && (
                      <Button
                        onClick={async () => {
                          try {
                            const token = getToken();
                            const headers = {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            };
                            const res = await fetch(`${API_ROOT}/events/${event.id}/`, {
                              method: 'PATCH',
                              headers,
                              body: JSON.stringify({
                                status: 'live',
                                is_live: true
                              })
                            });
                            if (res.ok) {
                              setErrMsg("Event marked as LIVE! ✅");
                              setErrOpen(true);
                              // Refresh event data
                              await refreshEvent();
                            } else {
                              setErrMsg("Failed to mark event as live");
                              setErrOpen(true);
                            }
                          } catch (e) {
                            setErrMsg(e?.message || "Error marking event as live");
                            setErrOpen(true);
                          }
                        }}
                        variant="contained"
                        fullWidth
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          bgcolor: "#10b8a6",
                          fontSize: 15,
                          fontWeight: 600,
                          "&:hover": { bgcolor: "#0ea5a4" },
                        }}
                      >
                        Mark as LIVE 🔴
                      </Button>
                    )}

                    {(isOwner || isStaff) && canArchiveLocally && (
                      <Button
                        onClick={() => setArchiveEventOpen(true)}
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
                        Delete Event
                      </Button>
                    )}

                    {isLocalLifecycle && status !== "cancelled" && status !== "past" && status !== "archived" && event.status !== "ended" && event.status !== "cancelled" && (
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
                        Cancel Event & Notify Participants
                      </Button>
                    )}

                    {!isLocalLifecycle && lifecycleManagementNote && (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        {lifecycleManagementNote}
                      </Alert>
                    )}

                    {/* Local visibility is still manageable independently of source content. */}
                    {isOwner && status !== "archived" && (
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
                    <strong>
                      {`${Math.max(
                        0,
                        Number(
                          event.total_registered ??
                          (
                            Number(event.public_registered_count ?? event.registrations_count ?? event.attending_count ?? 0) +
                            Number(event.public_guest_count ?? 0)
                          )
                        )
                      )} registered`}
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
    if (!event?.id || loungeSettingsSaving) return;
    setLoungeSettingsSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/`, {
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
    if (!event?.id || visibilitySettingsSaving) return;
    setVisibilitySettingsSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/`, {
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
  const [selectedAppIds, setSelectedAppIds] = React.useState(new Set());
  const [bulkApprovalDialogOpen, setBulkApprovalDialogOpen] = React.useState(false);
  const [bulkApprovalLoading, setBulkApprovalLoading] = React.useState(false);

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

  const handleToggleAppCheckbox = (appId) => {
    const newSelected = new Set(selectedAppIds);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedAppIds(newSelected);
  };

  const handleSelectAllPending = () => {
    const pendingApps = applications.filter(app => app.status === 'pending');
    if (selectedAppIds.size === pendingApps.length) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(pendingApps.map(app => app.id)));
    }
  };

  const handleBulkApproveSelected = async () => {
    if (selectedAppIds.size === 0) {
      toast.error('Please select at least one application');
      return;
    }
    setBulkApprovalDialogOpen(true);
  };

  const handleBulkApproveAllPending = () => {
    const pendingApps = applications.filter(app => app.status === 'pending');
    if (pendingApps.length === 0) {
      toast.error('No pending applications to approve');
      return;
    }
    setBulkApprovalDialogOpen(true);
  };

  const confirmBulkApproval = async (approveAll = false) => {
    setBulkApprovalLoading(true);
    try {
      const endpoint = `${API_ROOT}/events/${event.id}/applications/bulk-approve/`;
      const body = approveAll
        ? { approve_all_pending: true }
        : { application_ids: Array.from(selectedAppIds) };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        const approvedCount = data.approved_count || 0;
        toast.success(`${approvedCount} application(s) approved successfully`);

        // Refresh applications list
        setApplications(prev => prev.map(app => {
          const shouldApprove = approveAll
            ? app.status === 'pending'
            : selectedAppIds.has(app.id) && app.status === 'pending';
          return shouldApprove ? { ...app, status: 'approved' } : app;
        }));

        setSelectedAppIds(new Set());
        setBulkApprovalDialogOpen(false);
        setRegsRefresh(prev => prev + 1);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Failed to approve applications');
      }
    } catch (err) {
      console.error('Bulk approval error:', err);
      toast.error('Failed to approve applications');
    } finally {
      setBulkApprovalLoading(false);
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

          {selectedAppIds.size > 0 && (
            <Box sx={{ p: 2, backgroundColor: '#f0f0f0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {selectedAppIds.size} application(s) selected
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
                  onClick={handleBulkApproveSelected}
                  disabled={bulkApprovalLoading}
                >
                  Approve Selected
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedAppIds(new Set())}
                  disabled={bulkApprovalLoading}
                >
                  Clear Selection
                </Button>
              </Stack>
            </Box>
          )}

          {(appFilter === 'all' || appFilter === 'pending') && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                sx={{ bgcolor: '#2196F3', '&:hover': { bgcolor: '#1976D2' } }}
                onClick={handleBulkApproveAllPending}
                disabled={bulkApprovalLoading || !applications.some(app => app.status === 'pending')}
                size="small"
              >
                Approve All Pending
              </Button>
            </Box>
          )}

          {appLoading ? (
            <CircularProgress />
          ) : filteredApps.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>No applications found.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 650, '& thead th': { fontWeight: 600, backgroundColor: '#f5f5f5' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 50 }}>
                      <Checkbox
                        checked={selectedAppIds.size > 0 && selectedAppIds.size === applications.filter(app => app.status === 'pending').length}
                        indeterminate={selectedAppIds.size > 0 && selectedAppIds.size < applications.filter(app => app.status === 'pending').length}
                        onChange={handleSelectAllPending}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Job Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Pre-Approval</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{event?.attendee_marker_label || 'Marker'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Comments</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Applied At</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApps.map(app => (
                    <TableRow key={app.id} sx={{ '&:hover': { backgroundColor: '#fafafa' } }}>
                      <TableCell sx={{ width: 50 }}>
                        {app.status === 'pending' && (
                          <Checkbox
                            checked={selectedAppIds.has(app.id)}
                            onChange={() => handleToggleAppCheckbox(app.id)}
                          />
                        )}
                      </TableCell>
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

        <Dialog open={bulkApprovalDialogOpen} onClose={() => setBulkApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
            Confirm Bulk Approval
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Are you sure you want to approve {selectedAppIds.size > 0 ? selectedAppIds.size : 'all pending'} application(s)?
              They will receive approval emails immediately.
            </DialogContentText>
            {bulkApprovalLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Processing approvals...</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              onClick={() => setBulkApprovalDialogOpen(false)}
              variant="outlined"
              disabled={bulkApprovalLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
              onClick={() => confirmBulkApproval(selectedAppIds.size === 0)}
              disabled={bulkApprovalLoading}
            >
              {bulkApprovalLoading ? 'Approving...' : 'Confirm Approval'}
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
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
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
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}
          >
            <Chip
              size="small"
              label={totalMembersCount}
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
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              Invite by Email
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={resendMailLoading ? <CircularProgress size={14} /> : <ForwardToInboxRoundedIcon />}
              onClick={() => setResendMailOpen(true)}
              disabled={resendMailLoading || registrations.length === 0}
              sx={{ textTransform: "none", borderRadius: 999, borderColor: "warning.main", color: "warning.dark" }}
            >
              {resendMailLoading ? "Sending..." : "Resend Mail to All"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={membersExportLoading ? <CircularProgress size={14} /> : <FileDownloadRoundedIcon />}
              onClick={handleMembersExport}
              disabled={membersExportLoading || registrations.length === 0}
              sx={{ textTransform: "none", borderRadius: 999, borderColor: "success.main", color: "success.dark" }}
            >
              {membersExportLoading ? "Exporting..." : "Export CSV"}
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
                overflowX: "auto",
                overflowY: "hidden",
                width: "100%",
                maxWidth: "100%",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 820,
                  "& th": {
                    whiteSpace: "nowrap",
                  },
                  "& td": {
                    whiteSpace: "nowrap",
                    verticalAlign: "middle",
                  },
                }}
              >
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
                      <TableCell colSpan={5} align="center">
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

                              {event?.is_free === false && (
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

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
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
          <FormControl size="small" sx={{ width: { xs: "100%", md: 180 } }}>
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
              overflowX: "auto",
              overflowY: "hidden",
              width: "100%",
              maxWidth: "100%",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Table size="small" sx={{ minWidth: 1150 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50", "& th": { fontSize: 13, color: "text.secondary", whiteSpace: "nowrap", verticalAlign: "top" } }}>
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
                  <TableRow key={row.guest_id} hover sx={{ "& td": { whiteSpace: "nowrap", verticalAlign: "top" } }}>
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
        `${API_ROOT}/events/${event?.id}/sessions/${selectedSession.id}/`,
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
        `${API_ROOT}/events/${event?.id}/sessions/${sessionToDelete.id}/`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: "Removed from the event programme." }),
        }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      // Remove the soft-deleted session from the visible schedule.
      setSessions(sessions.filter(s => s.id !== sessionToDelete.id));
      toast.success(
        "The session was removed from the schedule and remains stored in the database with its participants, attendance, bookmarks, recording and history."
      );
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
      const res = await fetch(`${API_ROOT}/events/${event?.id}/sessions/`, {
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

  const renderParticipants = () => (
    <ParticipantsAttendanceTable
      eventId={event?.id}
      event={event}
      token={token}
      apiRoot={API_ROOT}
    />
  );

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
                    checked={criteriaConfig.interests.enabled}
                    onChange={(e) =>
                      setCriteriaConfig((prev) => ({
                        ...prev,
                        interests: { ...prev.interests, enabled: e.target.checked }
                      }))
                    }
                  />
                }
                label="Interest-Based Matching"
              />
              {criteriaConfig.interests.enabled && (
                <Box sx={{ ml: 4, mt: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block", fontWeight: 500 }}>
                    Match Mode
                  </Typography>
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Box
                      onClick={() =>
                        setCriteriaConfig((prev) => ({
                          ...prev,
                          interests: { ...prev.interests, match_mode: "complementary" }
                        }))
                      }
                      sx={{
                        p: 1.2,
                        border: "2px solid",
                        borderColor:
                          criteriaConfig.interests.match_mode === "complementary"
                            ? "#10b8a6"
                            : "divider",
                        borderRadius: 1,
                        cursor: "pointer",
                        backgroundColor:
                          criteriaConfig.interests.match_mode === "complementary"
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
                        {criteriaConfig.interests.match_mode === "complementary" ? (
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
                          interests: { ...prev.interests, match_mode: "similar" }
                        }))
                      }
                      sx={{
                        p: 1.2,
                        border: "2px solid",
                        borderColor:
                          criteriaConfig.interests.match_mode === "similar"
                            ? "#10b8a6"
                            : "divider",
                        borderRadius: 1,
                        cursor: "pointer",
                        backgroundColor:
                          criteriaConfig.interests.match_mode === "similar"
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
                        {criteriaConfig.interests.match_mode === "similar" ? (
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
                          interests: { ...prev.interests, match_mode: "both" }
                        }))
                      }
                      sx={{
                        p: 1.2,
                        border: "2px solid",
                        borderColor:
                          criteriaConfig.interests.match_mode === "both"
                            ? "#10b8a6"
                            : "divider",
                        borderRadius: 1,
                        cursor: "pointer",
                        backgroundColor:
                          criteriaConfig.interests.match_mode === "both"
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
                        {criteriaConfig.interests.match_mode === "both" ? (
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
                  {criteriaConfig.interests.tags.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                        {criteriaConfig.interests.tags.map((tag, idx) => (
                          <Chip
                            key={idx}
                            label={tag.label}
                            size="small"
                            onDelete={() =>
                              setCriteriaConfig((prev) => ({
                                ...prev,
                                interests: {
                                  ...prev.interests,
                                  tags: prev.interests.tags.filter((_, i) => i !== idx)
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
                interests: { enabled: false, match_mode: "complementary", tags: [] }
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
                interests: { enabled: false, match_mode: "complementary", tags: [] }
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
                  interests: {
                    ...prev.interests,
                    tags: [
                      ...prev.interests.tags,
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
    if (!event?.id || saleorSaving) return;
    setSaleorSaving(true);
    try {
      const token = getToken();
      const payload = {
        name: saleorName,
        description: saleorDescription,
        price_label: saleorPriceLabel.trim(),
        channel_listings: Object.entries(saleorPriceChanges).map(([id, price]) => ({
          channel_id: id,
          price: parseFloat(price) || 0
        })),
        stocks: Object.entries(saleorStockChanges).map(([id, quantity]) => ({
          warehouse_id: id,
          quantity: parseInt(quantity) || 0
        }))
      };

      const res = await fetch(`${API_ROOT}/events/${event?.id}/saleor-product/`, {
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

  const handleSyncSaleorProduct = async () => {
    if (!event?.id) return;
    setSaleorLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/sync-saleor-product/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      toast.success("Saleor product synced!");
      fetchSaleorProduct();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaleorLoading(false);
    }
  };

  const handleSavePriceLabel = async () => {
    if (!event?.id) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ price_label: saleorPriceLabel.trim() })
      });
      if (!res.ok) throw new Error("Failed to save price label");
      toast.success("Price label saved!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePublishEvent = async () => {
    if (!event?.id || publishing) return;
    setPublishing(true);
    setPublishError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/publish/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to publish event');
      toast.success("Event published successfully!");
      if (json.event) setEvent(json.event);
      fetchSaleorProduct();
    } catch (err) {
      setPublishError(err.message);
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublishEvent = async () => {
    if (!event?.id || publishing) return;
    setPublishing(true);
    setPublishError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${event?.id}/unpublish/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to unpublish event');
      toast.success("Event unpublished. You can now make changes.");
      if (json.event) setEvent(json.event);
      fetchSaleorProduct();
    } catch (err) {
      setPublishError(err.message);
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const renderEventOrders = () => {
    const money = (value, currency = event?.currency || "USD") => {
      const amount = Number(value || 0);
      return `${String(currency || "USD").toUpperCase()} ${amount.toFixed(2)}`;
    };

    const formatDate = (value) => {
      if (!value) return "—";
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed.format("MMM D, YYYY") : "—";
    };

    const invoiceStatus = (invoice) => {
      const state = String(invoice?.state || "").toLowerCase();
      if (!invoice) return { label: "Not created", color: "default", variant: "outlined" };
      if (state === "paid") return { label: "Paid", color: "success", variant: "filled" };
      if (state === "overdue") return { label: "Overdue", color: "error", variant: "filled" };
      if (state === "partially_paid") return { label: "Partially paid", color: "warning", variant: "filled" };
      return { label: state ? state.replace(/_/g, " ").toUpperCase() : "Issued", color: "info", variant: "outlined" };
    };

    const totals = eventOrders.reduce((acc, order) => {
      const amount = Number(order.total || 0);
      if (order.status === "paid") acc.paid += amount;
      else acc.pending += amount;
      acc.count += 1;
      return acc;
    }, { count: 0, paid: 0, pending: 0 });

    const getDistinctEventIds = (items = []) => {
      const ids = new Set();
      items.forEach((item) => {
        const id = item?.event?.id;
        if (id !== undefined && id !== null) ids.add(String(id));
      });
      return ids;
    };

    const getCurrentEventQuantity = (items = []) => items
      .filter((item) => String(item?.event?.id || "") === String(event?.id || ""))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (event?.is_free !== false) {
      return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Orders</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            Orders are only available for paid events.
          </Typography>
        </Paper>
      );
    }

    return (
      <Stack spacing={2.5}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#071d49" }}>Orders & Invoices</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 720 }}>
                Track manual-payment orders, verify bank/manual payments, and download the final invoice PDF for each customer.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => fetchEventOrders(eventOrdersPage)}
              disabled={eventOrdersLoading}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              Refresh
            </Button>
          </Stack>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(15, 118, 110, 0.08)", border: "1px solid rgba(15, 118, 110, 0.16)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>Total orders</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{totals.count}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.16)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>Paid amount</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{money(totals.paid, event?.currency || "USD")}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(245, 158, 11, 0.10)", border: "1px solid rgba(245, 158, 11, 0.20)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>Pending amount</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{money(totals.pending, event?.currency || "USD")}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {eventOrdersError && (
          <Alert severity="error">{eventOrdersError}</Alert>
        )}

        {eventOrdersLoading ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <LinearProgress />
          </Paper>
        ) : eventOrders.length === 0 ? (
          <Alert severity="info">No paid orders found for this event yet.</Alert>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(7, 29, 73, 0.04)" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Saleor</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Payment</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Invoice</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventOrders.map((order) => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const qty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
                  const currentEventQty = getCurrentEventQuantity(items);
                  const distinctEventCount = getDistinctEventIds(items).size;
                  const isMultiEventOrder = distinctEventCount > 1;
                  const isPaid = order.status === "paid";
                  const inv = order.invoice || null;
                  const invStatus = invoiceStatus(inv);
                  return (
                    <TableRow key={order.id} hover sx={{ '& td': { py: 1.5 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>#{order.id}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {currentEventQty || 0} item{Number(currentEventQty || 0) === 1 ? "" : "s"} for this event
                        </Typography>
                        {isMultiEventOrder && (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={`Full order: ${distinctEventCount} events`}
                            sx={{ mt: 0.6, height: 22 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {order.user_display_name || order.user_email || "Customer"}
                        </Typography>
                        {order.user_email && (
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{order.user_email}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {order.saleor_order_number ? `#${order.saleor_order_number}` : "—"}
                        </Typography>
                        {order.saleor_order_id && (
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", maxWidth: 150 }} noWrap>
                            {order.saleor_order_id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{money(order.total, order.currency)}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{String(order.currency || "USD").toUpperCase()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.6} alignItems="flex-start">
                          <Chip
                            size="small"
                            label={(order.status || "pending").toUpperCase()}
                            color={isPaid ? "success" : order.status === "canceled" ? "default" : "warning"}
                            variant={isPaid ? "filled" : "outlined"}
                          />
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Ref: {order.payment_reference || "not added"}
                          </Typography>
                          {order.paid_at && (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Paid: {formatDate(order.paid_at)}</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75} alignItems="flex-start">
                          {inv ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>{inv.number}</Typography>
                              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Chip size="small" label={invStatus.label} color={invStatus.color} variant={invStatus.variant} />
                                {inv.pdf_ready ? (
                                  <Chip size="small" label="PDF ready" color="success" variant="outlined" />
                                ) : (
                                  <Chip size="small" label="PDF pending" variant="outlined" />
                                )}
                              </Stack>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Issued {formatDate(inv.issue_date)} • Due {formatDate(inv.due_date)}
                              </Typography>
                            </>
                          ) : (
                            <Chip size="small" label={isPaid ? "Generating invoice" : "Invoice after checkout"} variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap" useFlexGap>
                          {inv?.pdf_ready ? (
                            <Tooltip title="Download invoice PDF">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<FileDownloadRoundedIcon />}
                                onClick={() => downloadEventOrderInvoice(inv)}
                                sx={{ textTransform: "none", borderRadius: 999 }}
                              >
                                Invoice
                              </Button>
                            </Tooltip>
                          ) : inv ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => generateEventOrderInvoicePdf(order)}
                              sx={{ textTransform: "none", borderRadius: 999 }}
                            >
                              Generate PDF
                            </Button>
                          ) : null}

                          {!isPaid ? (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircleRoundedIcon fontSize="small" />}
                              onClick={() => openMarkPaidDialog(order)}
                              disabled={markPaidLoadingId === order.id}
                              sx={{
                                textTransform: "none",
                                borderRadius: 999,
                                px: 1.5,
                                py: 0.65,
                                minWidth: 138,
                                fontWeight: 800,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                borderColor: "#18b8b0",
                                color: "#0f766e",
                                bgcolor: "rgba(24, 184, 176, 0.06)",
                                boxShadow: "none",
                                "&:hover": {
                                  borderColor: "#0f766e",
                                  bgcolor: "rgba(24, 184, 176, 0.12)",
                                  boxShadow: "none",
                                },
                              }}
                            >
                              {markPaidLoadingId === order.id ? "Saving..." : "Confirm payment"}
                            </Button>
                          ) : (
                            <Chip size="small" color="success" label="Paid" />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {eventOrdersTotal > eventOrdersLimit && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={Math.ceil(eventOrdersTotal / eventOrdersLimit)}
                page={eventOrdersPage}
                onChange={(_, page) => fetchEventOrders(page)}
                color="primary"
              />
            </Box>
          )}
          </>
        )}

        <Dialog
          open={Boolean(markPaidDialogOrder)}
          onClose={closeMarkPaidDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 900 }}>Confirm full order payment</DialogTitle>
          <DialogContent dividers>
            {markPaidDialogOrder && (() => {
              const items = Array.isArray(markPaidDialogOrder.items) ? markPaidDialogOrder.items : [];
              const distinctEventCount = getDistinctEventIds(items).size;
              const isMultiEventOrder = distinctEventCount > 1;
              const suggestedReference = getSuggestedPaymentReference(markPaidDialogOrder);
              return (
                <Stack spacing={2}>
                  {isMultiEventOrder ? (
                    <Alert severity="warning" icon={<WarningRoundedIcon />}>
                      This customer order contains <b>{distinctEventCount} different events</b>. Marking it paid will confirm all registrations in this order and create one paid invoice for the full amount.
                    </Alert>
                  ) : (
                    <Alert severity="info" icon={<InfoRoundedIcon />}>
                      Payment confirmation is order-level. This will mark the whole order as paid.
                    </Alert>
                  )}

                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(7, 29, 73, 0.04)", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                      Order reference details
                    </Typography>
                    <Grid container spacing={1.25}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Local order</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>#{markPaidDialogOrder.id}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Saleor order</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {markPaidDialogOrder.saleor_order_number ? `#${markPaidDialogOrder.saleor_order_number}` : "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {markPaidDialogOrder.payment_reference ? "Saved payment reference" : "Suggested payment reference"}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: "primary.main" }}>
                          {suggestedReference}
                        </Typography>
                      </Grid>
                      {markPaidDialogOrder.saleor_order_id && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Saleor order ID</Typography>
                          <Tooltip title={markPaidDialogOrder.saleor_order_id}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                              {markPaidDialogOrder.saleor_order_id}
                            </Typography>
                          </Tooltip>
                        </Grid>
                      )}
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Order #{markPaidDialogOrder.id} items</Typography>
                    <Table size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(7, 29, 73, 0.04)" }}>
                          <TableCell sx={{ fontWeight: 800 }}>Event</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>Qty</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item) => {
                          const isCurrentEvent = String(item?.event?.id || "") === String(event?.id || "");
                          return (
                            <TableRow key={item.id || item?.event?.id}>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{item?.event?.title || "Event"}</Typography>
                                  {isCurrentEvent && <Chip size="small" color="info" variant="outlined" label="Current event" />}
                                </Stack>
                              </TableCell>
                              <TableCell align="center">{item.quantity || 0}</TableCell>
                              <TableCell align="right">{money(item.line_total, markPaidDialogOrder.currency)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(15, 118, 110, 0.08)", border: "1px solid rgba(15, 118, 110, 0.16)" }}>
                    {parseFloat(markPaidDialogOrder.discount_amount || 0) > 0 && (
                      <>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>Subtotal</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(markPaidDialogOrder.subtotal, markPaidDialogOrder.currency)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, pb: 1.5, borderBottom: "1px solid rgba(15, 118, 110, 0.16)" }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>Discount applied</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>-{money(markPaidDialogOrder.discount_amount, markPaidDialogOrder.currency)}</Typography>
                        </Stack>
                      </>
                    )}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>Full order total</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>{money(markPaidDialogOrder.total, markPaidDialogOrder.currency)}</Typography>
                    </Stack>
                  </Box>

                  <TextField
                    label="Payment reference / bank transaction ID"
                    value={markPaidReference}
                    onChange={(e) => setMarkPaidReference(e.target.value)}
                    fullWidth
                    autoFocus
                    helperText="This reference will be saved on the order and invoice payment event. You can keep the suggested reference or replace it with the real bank transaction ID."
                  />
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeMarkPaidDialog} disabled={Boolean(markPaidLoadingId)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleMarkEventOrderPaid}
              disabled={!markPaidDialogOrder || Boolean(markPaidLoadingId)}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              {markPaidLoadingId ? "Marking paid..." : "Confirm full order paid"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This event does not have a linked Saleor product.
          </Typography>
          {/* Public price display override shown even without a product */}
          <Box sx={{ mb: 3, maxWidth: 400, mx: 'auto', textAlign: 'left' }}>
            <TextField
              label="Public price display text"
              fullWidth
              value={saleorPriceLabel}
              onChange={(e) => setSaleorPriceLabel(e.target.value)}
              helperText='Optional fallback shown before Saleor price is configured. Once a valid Saleor price exists, public pages show the Saleor checkout price to avoid mismatched pricing.'
              inputProps={{ maxLength: 100 }}
            />
            <Button sx={{ mt: 2 }} variant="outlined" onClick={handleSavePriceLabel}>
              Save label
            </Button>
          </Box>
          <Button variant="contained" onClick={handleSyncSaleorProduct} startIcon={<RefreshRoundedIcon />} disabled={saleorLoading}>
            Create / Re-sync Saleor Product
          </Button>
        </Paper>
      );
    }

    // Derived checks for publish section
    // targetChannelSlug is loaded from API response
    const defaultChannel = saleorChannels.find(c => c.slug === targetChannelSlug);
    const defaultChannelPrice = defaultChannel ? parseFloat(saleorPriceChanges[defaultChannel.id] ?? 0) : 0;
    const hasValidPrice = defaultChannelPrice > 0;
    const hasValidStock = Object.values(saleorStockChanges).some(q => parseInt(q || 0) > 0);
    const canPublish = event?.status === 'draft' && !productDirty && hasValidPrice && hasValidStock && !!saleorProduct;

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

                <TextField
                  label="Public price display text"
                  value={saleorPriceLabel}
                  onChange={(e) => { setSaleorPriceLabel(e.target.value); setProductDirty(true); }}
                  helperText='Optional fallback shown before Saleor price is configured. Once a valid Saleor price exists, public pages show the Saleor checkout price to avoid mismatched pricing.'
                  sx={{ mb: 4, width: 400, display: 'block' }}
                  inputProps={{ maxLength: 100 }}
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
                      const isDisabled = channel.slug !== targetChannelSlug;
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
                          {discount.last_sync_error && (
                            <Typography variant="caption" color="error" display="block">
                              {discount.last_sync_error}
                            </Typography>
                          )}
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

          {/* Section 5: Publish Event */}
          <Box>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
              <PublishRoundedIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Publish Event</Typography>
            </Box>
            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Status:</Typography>
                <Chip
                  label={event?.status === 'published' ? 'Published' : 'Draft'}
                  color={event?.status === 'published' ? 'success' : 'warning'}
                  size="small"
                  sx={{ fontWeight: 700, borderRadius: 1.5 }}
                />
              </Box>

              {/* Checklist */}
              <Stack spacing={1} sx={{ mb: 3 }}>
                {[
                  { label: 'Product linked to event', ok: !!saleorProduct },
                  { label: `Price configured (${targetChannelSlug})`, ok: hasValidPrice },
                  { label: 'Warehouse stock configured', ok: hasValidStock },
                  { label: 'Product changes saved', ok: !productDirty },
                  { label: 'Discounts (optional)', ok: true, optional: true },
                ].map(({ label, ok, optional }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {ok
                      ? <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                      : optional
                        ? <InfoRoundedIcon sx={{ color: 'info.main', fontSize: '1rem' }} />
                        : <WarningRoundedIcon sx={{ color: 'warning.main', fontSize: '1rem' }} />}
                    <Typography variant="body2" color={ok || optional ? 'text.primary' : 'warning.main'}>
                      {label}{optional ? ' — optional' : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              {productDirty && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Save product changes before publishing.
                </Alert>
              )}
              {publishError && (
                <Alert severity="error" sx={{ mb: 2 }}>{publishError}</Alert>
              )}
              {event?.status === 'published' ? (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>This event is live and accepting registrations.</Alert>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={publishing ? <CircularProgress size={18} color="inherit" /> : <PublishRoundedIcon />}
                      onClick={handleUnpublishEvent}
                      disabled={publishing}
                      sx={{ fontWeight: 700 }}
                    >
                      {publishing ? 'Unpublishing...' : 'Unpublish Event'}
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      Unpublish to make changes to pricing or inventory.
                    </Typography>
                  </Stack>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={publishing ? <CircularProgress size={18} color="inherit" /> : <PublishRoundedIcon />}
                  onClick={handlePublishEvent}
                  disabled={!canPublish || publishing}
                  sx={{ fontWeight: 700 }}
                >
                  {publishing ? 'Publishing...' : 'Publish Event'}
                </Button>
              )}
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

  const renderCompanion = () => {
    if (!isOwner) {
      return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Companion</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Only the event owner can access Companion features.</Typography>
        </Paper>
      );
    }

    const createLabel = async (name, color) => {
      setCompanionLabelSaving(true);
      setCompanionLabelError("");
      try {
        const res = await fetch(`${API_ROOT}/event-badge-labels/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ event_id: event?.id, name, color }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.name?.[0] || json?.detail || `HTTP ${res.status}`);
        setCompanionLabels(prev => [...prev, json]);
        setCompanionNewName("");
        setCompanionNewColor("#6366f1");
        toast.success(`Label "${name}" created`);
      } catch (e) {
        setCompanionLabelError(e.message || "Failed to create label");
      } finally {
        setCompanionLabelSaving(false);
      }
    };

    const deleteLabel = async (labelId) => {
      setCompanionDeleteLoading(true);
      try {
        const res = await fetch(`${API_ROOT}/event-badge-labels/${labelId}/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
        setCompanionLabels(prev => prev.filter(l => l.id !== labelId));
        setCompanionRegs(prev => prev.map(r => ({
          ...r,
          badge_labels: (r.badge_labels || []).filter(bl => bl.id !== labelId),
        })));
        toast.success(
          json?.detail ||
            "The badge label was removed from active use but remains stored with participant history."
        );
      } catch (e) {
        toast.error(e.message || "Failed to remove badge label");
      } finally {
        setCompanionDeleteLoading(false);
        setCompanionDeleteOpen(false);
        setCompanionDeleteTarget(null);
      }
    };

    const saveEditLabel = async () => {
      if (!companionEditTarget) return;
      setCompanionEditSaving(true);
      try {
        const res = await fetch(`${API_ROOT}/event-badge-labels/${companionEditTarget.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ name: companionEditName, color: companionEditColor }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.name?.[0] || json?.detail || `HTTP ${res.status}`);
        setCompanionLabels(prev => prev.map(l => l.id === json.id ? json : l));
        setCompanionEditOpen(false);
        setCompanionEditTarget(null);
        toast.success("Label updated");
      } catch (e) {
        toast.error(e.message || "Failed to update label");
      } finally {
        setCompanionEditSaving(false);
      }
    };

    const assignLabels = async (regId, labelIds) => {
      setCompanionAssignSaving(true);
      try {
        const res = await fetch(`${API_ROOT}/event-registrations/${regId}/assign-labels/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ label_ids: labelIds }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
        const newLabels = companionLabels.filter(l => labelIds.includes(l.id));
        setCompanionRegs(prev => prev.map(r =>
          r.id === regId ? { ...r, badge_labels: newLabels } : r
        ));
        setCompanionAssignOpen(false);
        setCompanionAssignTarget(null);
        toast.success("Labels assigned");
      } catch (e) {
        toast.error(e.message || "Failed to assign labels");
      } finally {
        setCompanionAssignSaving(false);
      }
    };

    const bulkAssignLabels = async () => {
      setCompanionBulkSaving(true);
      try {
        const res = await fetch(`${API_ROOT}/event-registrations/bulk-assign-labels/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            registration_ids: companionBulkSelected,
            label_ids: companionBulkLabels,
            mode: companionBulkMode,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
        setCompanionRegsRefresh(p => p + 1);
        setCompanionBulkSelected([]);
        setCompanionBulkAssignOpen(false);
        setCompanionBulkLabels([]);
        toast.success(`Labels updated for ${json.updated} participant(s)`);
      } catch (e) {
        toast.error(e.message || "Failed to bulk assign");
      } finally {
        setCompanionBulkSaving(false);
      }
    };

    const filteredCompanionRegs = companionRegs.filter(r => {
      const q = companionSearch.toLowerCase();
      return !q || (r.user_name || "").toLowerCase().includes(q) || (r.user_email || "").toLowerCase().includes(q);
    });

    const allBulkSelected = filteredCompanionRegs.length > 0 && filteredCompanionRegs.every(r => companionBulkSelected.includes(r.id));

    const saveNetworkingSettings = async () => {
      setNetworkingSettingsSaving(true);
      setNetworkingSettingsError("");
      setNetworkingSuccessMessage("");
      try {
        const token = getToken();
        const res = await fetch(`${API_ROOT}/events/${event?.id}/networking-settings/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            enabled: networkingEnabled,
            duration_options_minutes: networkingDurations,
            allowed_windows: networkingAllowedWindows,
            reminder_minutes_before: networkingReminderMinutes,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || json?.enabled?.[0] || `HTTP ${res.status}`);
        setNetworkingSettings(json);
        setNetworkingSuccessMessage("Networking settings saved successfully");
        setTimeout(() => setNetworkingSuccessMessage(""), 5000);
        toast.success("Networking settings saved");
      } catch (e) {
        setNetworkingSettingsError(e.message || "Failed to save settings");
        toast.error(e.message || "Failed to save settings");
      } finally {
        setNetworkingSettingsSaving(false);
      }
    };

    const addNetworkingTable = async () => {
      if (!newTableName.trim()) {
        toast.error("Table name is required");
        return;
      }

      setNewTableSaving(true);
      setNetworkingTablesError("");
      try {
        const token = getToken();
        const res = await fetch(`${API_ROOT}/events/${event?.id}/networking-tables/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: newTableName.trim(),
            location_note: newTableLocation.trim(),
            is_active: true,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          let errorMsg = json?.detail || `HTTP ${res.status}`;
          if (json?.name) errorMsg = json.name[0] || "Invalid table name";
          if (json?.location_note) errorMsg = json.location_note[0] || "Invalid location/note";
          if (json?.table_number) errorMsg = json.table_number[0] || "Invalid table number";
          if (json?.non_field_errors) errorMsg = json.non_field_errors[0] || "Validation error";
          throw new Error(errorMsg);
        }

        const tablesRes = await fetch(`${API_ROOT}/events/${event?.id}/networking-tables/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (tablesRes.ok) {
          const tables = await tablesRes.json();
          setNetworkingTables(Array.isArray(tables) ? tables : (tables.results || []));
        } else {
          setNetworkingTables(prev => [...prev, json]);
        }

        setNewTableName("");
        setNewTableLocation("");
        toast.success("Table added successfully");
      } catch (e) {
        setNetworkingTablesError(e.message || "Failed to add table");
        toast.error(e.message || "Failed to add table");
      } finally {
        setNewTableSaving(false);
      }
    };

    const updateNetworkingTable = async () => {
      if (!networkingTableEditTarget) return;
      setNetworkingTableEditSaving(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_ROOT}/events/${event?.id}/networking-tables/${networkingTableEditTarget.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: networkingTableEditName.trim(),
            location_note: networkingTableEditLocation.trim(),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || json?.name?.[0] || `HTTP ${res.status}`);
        setNetworkingTables(prev => prev.map(t => t.id === json.id ? json : t));
        setNetworkingTableEditOpen(false);
        setNetworkingTableEditTarget(null);
        toast.success("Table updated");
      } catch (e) {
        toast.error(e.message || "Failed to update table");
      } finally {
        setNetworkingTableEditSaving(false);
      }
    };

    const formatNetworkingTableAvailableAfter = (value) => {
      if (!value) return "";
      const viewerTz = currentUser?.profile?.timezone || dayjs.tz.guess();
      return dayjs(value).tz(viewerTz).format("MMM D, YYYY [at] h:mm A z");
    };

    const openNetworkingTableDeleteDialog = async (table) => {
      if (!table?.id || networkingTableDeleteCheckingId) return;
      setNetworkingTableDeleteCheckingId(table.id);
      try {
        const token = getToken();
        const res = await fetch(
          `${API_ROOT}/events/${event?.id}/networking-tables/${table.id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

        setNetworkingTables(prev => prev.map(item => item.id === json.id ? json : item));
        setNetworkingTableDeleteTarget(json);
        setNetworkingTableDeleteReason("");
        setNetworkingTableDeleteOpen(true);
      } catch (e) {
        toast.error(e.message || "Failed to check whether the networking table is free");
      } finally {
        setNetworkingTableDeleteCheckingId(null);
      }
    };

    const deleteNetworkingTable = async () => {
      if (!networkingTableDeleteTarget) return;
      setNetworkingTableDeleteLoading(true);
      try {
        const token = getToken();
        const res = await fetch(`${API_ROOT}/events/${event?.id}/networking-tables/${networkingTableDeleteTarget.id}/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: networkingTableDeleteReason.trim() }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 409 && json?.code === "networking_table_in_use") {
            const refreshedTarget = { ...networkingTableDeleteTarget, ...json };
            setNetworkingTableDeleteTarget(refreshedTarget);
            setNetworkingTables(prev => prev.map(table =>
              table.id === networkingTableDeleteTarget.id ? refreshedTarget : table
            ));
            toast.warning(json.detail);
            return;
          }
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }
        setNetworkingTables(prev => prev.filter(t => t.id !== networkingTableDeleteTarget.id));
        setNetworkingTableDeleteOpen(false);
        setNetworkingTableDeleteTarget(null);
        setNetworkingTableDeleteReason("");
        toast.success(
          json?.detail ||
            "The networking table was removed from active use but remains stored with its meeting history."
        );
      } catch (e) {
        toast.error(e.message || "Failed to remove networking table");
      } finally {
        setNetworkingTableDeleteLoading(false);
      }
    };

    const toggleDuration = (duration) => {
      setNetworkingDurations(prev =>
        prev.includes(duration) ? prev.filter(d => d !== duration) : [...prev, duration].sort((a, b) => a - b)
      );
    };

    const addCustomDuration = () => {
      setCustomDurationError("");
      const input = customDurationInput.trim();

      // Validate empty input
      if (!input) {
        setCustomDurationError("Please enter duration.");
        return;
      }

      // Validate number
      const duration = parseInt(input, 10);
      if (isNaN(duration) || duration !== parseFloat(input)) {
        setCustomDurationError("Please enter a valid duration in minutes.");
        return;
      }

      // Validate range
      if (duration < 1 || duration > 180) {
        setCustomDurationError("Duration must be between 1 and 180 minutes.");
        return;
      }

      // Check for duplicates
      if (networkingDurations.includes(duration)) {
        setCustomDurationError("This duration already exists.");
        return;
      }

      // Add duration
      setNetworkingDurations(prev => [...prev, duration].sort((a, b) => a - b));
      setCustomDurationInput("");
      setCustomDurationError("");
    };

    const removeDuration = (duration) => {
      // Only allow removing durations over 30 minutes (custom ones)
      if (duration > 30 || ![5, 10, 15, 20, 30].includes(duration)) {
        setNetworkingDurations(prev => prev.filter(d => d !== duration));
      }
    };

    const getTodayDateValue = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const getEventStartDateValue = () => {
      if (!event?.start_time) return getTodayDateValue();
      return dayjs(event.start_time).format("YYYY-MM-DD");
    };

    const getEventStartDateTime = () => {
      if (!event?.start_time) return null;
      return dayjs(event.start_time);
    };

    const getEventEndDateTime = () => {
      if (!event?.end_time) return null;
      return dayjs(event.end_time);
    };

    const validateNetworkingWindows = (windows) => {
      const errors = [];
      const eventStart = getEventStartDateTime();
      const eventEnd = getEventEndDateTime();

      if (!eventStart || !eventEnd || !eventStart.isValid() || !eventEnd.isValid()) {
        return errors;
      }

      for (let i = 0; i < windows.length; i++) {
        const window = windows[i];
        if (!window.date || !window.start || !window.end) continue;

        try {
          const windowDate = dayjs(window.date, "YYYY-MM-DD");
          if (!windowDate.isValid()) continue;

          // Parse time as HH:mm and create full datetime for that day
          const [startHour, startMin] = window.start.split(':').map(Number);
          const [endHour, endMin] = window.end.split(':').map(Number);

          const windowStartTime = windowDate.hour(startHour).minute(startMin).second(0);
          const windowEndTime = windowDate.hour(endHour).minute(endMin).second(0);

          // Check if date is within event bounds
          if (windowDate.isBefore(eventStart, 'day') || windowDate.isAfter(eventEnd, 'day')) {
            const eventDisplay = eventStart.format('MMM DD, YYYY, h:mm A') + " – " + eventEnd.format('h:mm A');
            errors[i] = `Window ${i + 1} must be within event time: ${eventDisplay}.`;
            continue;
          }

          // Check if window start/end times are within event bounds
          if (windowStartTime.isBefore(eventStart) || windowEndTime.isAfter(eventEnd)) {
            const eventDisplay = eventStart.format('MMM DD, YYYY, h:mm A') + " – " + eventEnd.format('h:mm A');
            errors[i] = `Window ${i + 1} must be within event time: ${eventDisplay}.`;
            continue;
          }

          // Check if end > start
          if (windowEndTime.isSameOrBefore(windowStartTime)) {
            errors[i] = `Window ${i + 1} end time must be after start time.`;
          }
        } catch (e) {
          // Silently skip on parse error
          continue;
        }
      }

      return errors;
    };

    const addNetworkingWindow = () => {
      const eventStartDate = getEventStartDateValue();
      const eventStart = getEventStartDateTime();
      const defaultStart = eventStart ? eventStart.format("HH:mm") : "09:00";
      const defaultEnd = eventStart ? eventStart.add(1, 'hour').format("HH:mm") : "10:00";

      const newWindow = { date: eventStartDate, start: defaultStart, end: defaultEnd };
      const updatedWindows = [...networkingAllowedWindows, newWindow];
      setNetworkingAllowedWindows(updatedWindows);

      // Validate immediately
      const errors = validateNetworkingWindows(updatedWindows);
      setNetworkingWindowErrors(errors);
    };

    const removeNetworkingWindow = (index) => {
      setNetworkingAllowedWindows(prev => prev.filter((_, i) => i !== index));
      setNetworkingWindowErrors(prev => prev.filter((_, i) => i !== index));
    };

    const updateNetworkingWindow = (index, field, value) => {
      setNetworkingAllowedWindows(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };

        // Validate immediately
        const errors = validateNetworkingWindows(updated);
        setNetworkingWindowErrors(errors);

        return updated;
      });
    };

    return (
      <Stack spacing={3}>
        {/* ---- 1:1 Meeting Scheduling Section ---- */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>1:1 Meeting Scheduling</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>Configure 1:1 networking meeting options for attendees.</Typography>

          {networkingSettingsError && <Alert severity="error" sx={{ mb: 2 }}>{networkingSettingsError}</Alert>}
          {networkingSuccessMessage && <Alert severity="success" sx={{ mb: 2 }}>{networkingSuccessMessage}</Alert>}

          {networkingSettingsLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={24} /></Box>
          ) : (
            <Stack spacing={3}>
              {/* Enable/Disable Toggle */}
              <FormControlLabel
                control={<Switch checked={networkingEnabled} onChange={e => setNetworkingEnabled(e.target.checked)} />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Enable 1:1 Meeting Scheduling</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Allow attendees to request 1:1 networking meetings</Typography>
                  </Box>
                }
              />

              {networkingEnabled && (
                <Stack spacing={3}>
                  {/* Duration Options */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Available Meeting Durations</Typography>
                    <Stack spacing={1.5}>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {[5, 10, 15, 20, 30].map(duration => (
                          <Chip
                            key={duration}
                            label={`${duration} min`}
                            onClick={() => toggleDuration(duration)}
                            variant={networkingDurations.includes(duration) ? "filled" : "outlined"}
                            color={networkingDurations.includes(duration) ? "primary" : "default"}
                            icon={networkingDurations.includes(duration) ? <CheckCircleRoundedIcon /> : undefined}
                            sx={{ fontWeight: 600 }}
                          />
                        ))}
                        {/* Custom durations */}
                        {networkingDurations.filter(d => ![5, 10, 15, 20, 30].includes(d)).map(duration => (
                          <Chip
                            key={`custom-${duration}`}
                            label={`${duration} min`}
                            variant="filled"
                            color="primary"
                            onDelete={() => removeDuration(duration)}
                            icon={<CheckCircleRoundedIcon />}
                            sx={{ fontWeight: 600 }}
                          />
                        ))}
                      </Stack>

                      {/* Custom Duration Input */}
                      <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
                        <TextField
                          size="small"
                          label="Custom duration"
                          type="number"
                          value={customDurationInput}
                          onChange={e => {
                            setCustomDurationInput(e.target.value);
                            if (customDurationError) setCustomDurationError("");
                          }}
                          onKeyPress={e => e.key === "Enter" && addCustomDuration()}
                          placeholder="e.g., 25"
                          error={!!customDurationError}
                          helperText={customDurationError}
                          inputProps={{ min: 1, max: 180 }}
                          sx={{ minWidth: 150 }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={addCustomDuration}
                          sx={{ textTransform: "none", whiteSpace: "nowrap", borderRadius: 999 }}
                        >
                          + Add
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Allowed Networking Windows */}
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Allowed Networking Windows</Typography>
                      <Button size="small" startIcon={<AddIcon />} onClick={addNetworkingWindow} sx={{ textTransform: "none" }}>Add Window</Button>
                    </Box>
                    <Stack spacing={2}>
                      {networkingAllowedWindows.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>No windows added yet. Add one to enable networking.</Typography>
                      ) : (
                        networkingAllowedWindows.map((window, idx) => (
                          <Box key={idx}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ p: 2, bgcolor: networkingWindowErrors[idx] ? "error.50" : "grey.50", borderRadius: 1, alignItems: { xs: "stretch", sm: "center" } }}>
                              <TextField
                                size="small"
                                label="Date"
                                type="date"
                                value={window.date || ""}
                                onChange={e => updateNetworkingWindow(idx, "date", e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: getEventStartDateValue(), max: getEventEndDateTime()?.format("YYYY-MM-DD") }}
                                error={!!networkingWindowErrors[idx]}
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                size="small"
                                label="Start Time"
                                type="time"
                                value={window.start || ""}
                                onChange={e => updateNetworkingWindow(idx, "start", e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                error={!!networkingWindowErrors[idx]}
                                sx={{ flex: 1 }}
                              />
                              <TextField
                                size="small"
                                label="End Time"
                                type="time"
                                value={window.end || ""}
                                onChange={e => updateNetworkingWindow(idx, "end", e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                error={!!networkingWindowErrors[idx]}
                                sx={{ flex: 1 }}
                              />
                              <IconButton size="small" onClick={() => removeNetworkingWindow(idx)} color="error"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                            </Stack>
                            {networkingWindowErrors[idx] && (
                              <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5, ml: 2 }}>
                                {networkingWindowErrors[idx]}
                              </Typography>
                            )}
                          </Box>
                        ))
                      )}
                    </Stack>
                  </Box>

                  {/* Reminder Minutes */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Meeting Reminder (minutes before)</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={networkingReminderMinutes}
                      onChange={e => setNetworkingReminderMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      inputProps={{ min: 0, max: 1440 }}
                      sx={{ maxWidth: 150 }}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={networkingSettingsSaving ? <CircularProgress size={16} /> : <SaveRoundedIcon />}
                    disabled={networkingSettingsSaving || networkingWindowErrors.some(e => e)}
                    onClick={saveNetworkingSettings}
                    sx={{ textTransform: "none", alignSelf: "flex-start", borderRadius: 999 }}
                  >
                    {networkingSettingsSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </Paper>

        {/* ---- Event Companion Access Section ---- */}
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Event Companion Access</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>Generate QR code and share direct link for attendees to access the Event Companion.</Typography>

          {event?.id && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>Direct Access URL</Typography>
                <QRCodeDisplay
                  url={`${window.location.origin}/events/${event?.slug}/companion`}
                  eventSlug={event?.slug || 'event'}
                  size={250}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                Share the QR code or direct link with attendees. They can scan or click to access the Event Companion.
              </Typography>
            </Stack>
          )}
        </Paper>

        {/* ---- Networking Tables Section ---- */}
        {networkingEnabled && (
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Networking Tables</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>Create and manage networking tables for assigning meeting attendees.</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Table name"
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                placeholder="e.g., VIP Table, Main Hall"
                sx={{ flex: 1 }}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                size="small"
                label="Location/Note"
                value={newTableLocation}
                onChange={e => setNewTableLocation(e.target.value)}
                placeholder="e.g., Rooftop Level"
                sx={{ flex: 1 }}
                inputProps={{ maxLength: 200 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={newTableSaving ? <CircularProgress size={14} /> : <AddIcon />}
                disabled={!newTableName.trim() || newTableSaving}
                onClick={addNetworkingTable}
                sx={{ textTransform: "none", borderRadius: 999, whiteSpace: "nowrap" }}
              >
                {newTableSaving ? "Adding..." : "Add Table"}
              </Button>
            </Stack>

            {networkingTablesError && <Alert severity="error" sx={{ mb: 2 }}>{networkingTablesError}</Alert>}

            {networkingTablesLoading ? (
              <Box sx={{ py: 3, textAlign: "center" }}><CircularProgress size={22} /></Box>
            ) : networkingTables.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>No tables yet. Create one above.</Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {networkingTables.map(table => (
                  <Paper
                    key={table.id}
                    elevation={0}
                    sx={{
                      bgcolor: table.is_active ? "primary.50" : "grey.100",
                      border: `1px solid ${table.is_active ? "primary.200" : "divider"}`,
                      p: 2,
                      borderRadius: 2,
                      flex: { xs: "1 1 calc(50% - 8px)", sm: "0 1 auto" },
                      minWidth: 200,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{table.name}</Typography>
                        {table.location_note && <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>{table.location_note}</Typography>}
                        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            label={table.is_active ? "Active" : "Inactive"}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                            color={table.is_active ? "success" : "default"}
                          />
                          {table.is_in_use && (
                            <Chip
                              size="small"
                              label="In use"
                              color="warning"
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                        </Stack>
                      </Box>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setNetworkingTableEditTarget(table);
                              setNetworkingTableEditName(table.name);
                              setNetworkingTableEditLocation(table.location_note || "");
                              setNetworkingTableEditOpen(true);
                            }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={table.is_in_use ? "Table is in use — click for details" : "Delete table"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openNetworkingTableDeleteDialog(table)}
                              color="error"
                              disabled={networkingTableDeleteCheckingId === table.id}
                            >
                              {networkingTableDeleteCheckingId === table.id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        )}

        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Badge Labels</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>Create and manage custom badge labels for this event's participants.</Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
            <TextField size="small" label="Label name" value={companionNewName} onChange={e => setCompanionNewName(e.target.value)} sx={{ flex: 1 }} inputProps={{ maxLength: 100 }} onKeyDown={e => { if (e.key === "Enter" && companionNewName.trim()) createLabel(companionNewName.trim(), companionNewColor); }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>Color:</Typography>
              <Box component="input" type="color" value={companionNewColor} onChange={e => setCompanionNewColor(e.target.value)} style={{ width: 40, height: 36, border: "1px solid #e0e0e0", borderRadius: 6, cursor: "pointer", padding: 2 }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{companionNewColor}</Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={companionLabelSaving ? <CircularProgress size={14} /> : <AddIcon />} disabled={!companionNewName.trim() || companionLabelSaving} onClick={() => createLabel(companionNewName.trim(), companionNewColor)} sx={{ textTransform: "none", borderRadius: 999, whiteSpace: "nowrap" }}>
              {companionLabelSaving ? "Creating..." : "Create Label"}
            </Button>
          </Stack>

          {companionLabelError && <Alert severity="error" sx={{ mb: 2 }}>{companionLabelError}</Alert>}

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, fontWeight: 500 }}>Quick-add predefined roles:</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {PREDEFINED_ROLES.map(role => {
                const alreadyExists = companionLabels.some(l => l.name.toLowerCase() === role.name.toLowerCase());
                return (
                  <Chip key={role.name} label={role.name} size="small" disabled={alreadyExists || companionLabelSaving} onClick={() => !alreadyExists && createLabel(role.name, role.color)} sx={{ bgcolor: alreadyExists ? "grey.100" : role.color + "22", color: alreadyExists ? "text.disabled" : role.color, border: `1px solid ${alreadyExists ? "#e0e0e0" : role.color + "66"}`, fontWeight: 600, cursor: alreadyExists ? "default" : "pointer", "&:hover": { bgcolor: alreadyExists ? "grey.100" : role.color + "33" } }} />
                );
              })}
            </Stack>
          </Box>

          {companionLabelsLoading ? (
            <CircularProgress size={20} />
          ) : companionLabelsError ? (
            <Alert severity="error">{companionLabelsError}</Alert>
          ) : companionLabels.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>No labels yet. Create one above.</Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {companionLabels.map(label => (
                <Box key={label.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: label.color + "22", border: `1px solid ${label.color + "66"}`, borderRadius: 999, px: 1.5, py: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: label.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: label.color }}>{label.name}</Typography>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => { setCompanionEditTarget(label); setCompanionEditName(label.name); setCompanionEditColor(label.color); setCompanionEditOpen(true); }} sx={{ p: 0.25, ml: 0.5 }}>
                      <EditRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => { setCompanionDeleteTarget(label); setCompanionDeleteOpen(true); }} sx={{ p: 0.25 }}>
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>Assign Labels to Participants</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>Select participants and assign badge labels individually or in bulk.</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {companionBulkSelected.length > 0 && <Button variant="contained" size="small" onClick={() => setCompanionBulkAssignOpen(true)} sx={{ textTransform: "none", borderRadius: 999 }}>Bulk Assign ({companionBulkSelected.length})</Button>}
              <IconButton size="small" onClick={() => setCompanionRegsRefresh(p => p + 1)}><RefreshRoundedIcon fontSize="small" /></IconButton>
            </Stack>
          </Stack>

          <TextField size="small" fullWidth placeholder="Search participants by name or email..." value={companionSearch} onChange={e => setCompanionSearch(e.target.value)} sx={{ mb: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} />

          {companionRegsLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={22} /></Box>
          ) : companionRegsError ? (
            <Alert severity="error">{companionRegsError}</Alert>
          ) : (
            <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50", "& th": { fontSize: 13, color: "text.secondary" } }}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={allBulkSelected} indeterminate={companionBulkSelected.length > 0 && !allBulkSelected} onChange={e => {
                        if (e.target.checked) setCompanionBulkSelected(filteredCompanionRegs.map(r => r.id));
                        else setCompanionBulkSelected([]);
                      }} />
                    </TableCell>
                    <TableCell>Participant</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Badge Labels</TableCell>
                    <TableCell align="right">Assign</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCompanionRegs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>No participants found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompanionRegs.map(reg => (
                      <TableRow key={reg.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={companionBulkSelected.includes(reg.id)} onChange={e => {
                            if (e.target.checked) setCompanionBulkSelected(prev => [...prev, reg.id]);
                            else setCompanionBulkSelected(prev => prev.filter(id => id !== reg.id));
                          }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{reg.user_name || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>{reg.user_email || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {(reg.badge_labels || []).length === 0
                              ? <Typography variant="caption" sx={{ color: "text.disabled" }}>None</Typography>
                              : (reg.badge_labels || []).map(bl => (
                                <Chip key={bl.id} label={bl.name} size="small" sx={{ bgcolor: bl.color + "22", color: bl.color, border: `1px solid ${bl.color + "66"}`, fontWeight: 600, height: 20, fontSize: 11 }} />
                              ))
                            }
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" sx={{ textTransform: "none", borderRadius: 999, borderColor: "divider", color: "text.primary" }} onClick={() => {
                            setCompanionAssignTarget(reg);
                            setCompanionAssignSelected((reg.badge_labels || []).map(bl => bl.id));
                            setCompanionAssignOpen(true);
                          }}>
                            Edit Labels
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Dialog open={companionEditOpen} onClose={() => setCompanionEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Edit Badge Label</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField size="small" label="Label name" value={companionEditName} onChange={e => setCompanionEditName(e.target.value)} inputProps={{ maxLength: 100 }} />
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2">Color:</Typography>
                <Box component="input" type="color" value={companionEditColor} onChange={e => setCompanionEditColor(e.target.value)} style={{ width: 40, height: 36, border: "1px solid #e0e0e0", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>{companionEditColor}</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanionEditOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" disabled={!companionEditName.trim() || companionEditSaving} onClick={saveEditLabel} sx={{ textTransform: "none" }}>
              {companionEditSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={companionDeleteOpen} onClose={() => setCompanionDeleteOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete Badge Label?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              The label <strong>{companionDeleteTarget?.name}</strong> will disappear from active
              badge management and can no longer be assigned to participants. This is a soft
              delete: the label and all existing participant assignments remain stored in the
              database for badge and attendance history.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanionDeleteOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="error" disabled={companionDeleteLoading} onClick={() => companionDeleteTarget && deleteLabel(companionDeleteTarget.id)} sx={{ textTransform: "none" }}>
              {companionDeleteLoading ? "Deleting..." : "Delete Badge Label"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={companionAssignOpen} onClose={() => setCompanionAssignOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Labels — {companionAssignTarget?.user_name || companionAssignTarget?.user_email || "Participant"}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, mt: 1 }}>Select labels to assign. This will replace any currently assigned labels.</Typography>
            {companionLabels.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>No labels created yet. Create labels in the section above first.</Typography>
            ) : (
              <Stack spacing={0.5}>
                {companionLabels.map(label => {
                  const selected = companionAssignSelected.includes(label.id);
                  return (
                    <Box
                      key={label.id}
                      onClick={() => {
                        setCompanionAssignSelected(prev =>
                          selected ? prev.filter(id => id !== label.id) : [...prev, label.id]
                        );
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: '10px 12px',
                        borderRadius: 1,
                        border: `1.5px solid ${label.color}30`,
                        backgroundColor: selected ? label.color + '08' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: label.color + '12',
                          borderColor: label.color + '60',
                        },
                      }}
                    >
                      <Checkbox
                        checked={selected}
                        onChange={() => {
                          setCompanionAssignSelected(prev =>
                            selected ? prev.filter(id => id !== label.id) : [...prev, label.id]
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        sx={{
                          color: label.color,
                          '&.Mui-checked': {
                            color: label.color,
                          },
                        }}
                      />
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: label.color,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {label.name}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanionAssignOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" disabled={companionAssignSaving} onClick={() => companionAssignTarget && assignLabels(companionAssignTarget.id, companionAssignSelected)} sx={{ textTransform: "none" }}>
              {companionAssignSaving ? "Saving..." : "Save Labels"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={companionBulkAssignOpen} onClose={() => setCompanionBulkAssignOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Bulk Assign Labels ({companionBulkSelected.length} participants)</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select value={companionBulkMode} onChange={e => setCompanionBulkMode(e.target.value)} label="Mode">
                  <MenuItem value="add">Add labels (keep existing)</MenuItem>
                  <MenuItem value="set">Replace labels (remove existing)</MenuItem>
                  <MenuItem value="remove">Remove selected labels only</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>Select labels:</Typography>
              <Stack spacing={0.5}>
                {companionLabels.map(label => {
                  const selected = companionBulkLabels.includes(label.id);
                  return (
                    <Box
                      key={label.id}
                      onClick={() => {
                        setCompanionBulkLabels(prev =>
                          selected ? prev.filter(id => id !== label.id) : [...prev, label.id]
                        );
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: '10px 12px',
                        borderRadius: 1,
                        border: `1.5px solid ${label.color}30`,
                        backgroundColor: selected ? label.color + '08' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: label.color + '12',
                          borderColor: label.color + '60',
                        },
                      }}
                    >
                      <Checkbox
                        checked={selected}
                        onChange={() => {
                          setCompanionBulkLabels(prev =>
                            selected ? prev.filter(id => id !== label.id) : [...prev, label.id]
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        sx={{
                          color: label.color,
                          '&.Mui-checked': {
                            color: label.color,
                          },
                        }}
                      />
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: label.color,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {label.name}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCompanionBulkAssignOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" disabled={companionBulkLabels.length === 0 || companionBulkSaving} onClick={bulkAssignLabels} sx={{ textTransform: "none" }}>
              {companionBulkSaving ? "Applying..." : "Apply to All Selected"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ---- Networking Table Edit Dialog ---- */}
        <Dialog open={networkingTableEditOpen} onClose={() => setNetworkingTableEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Edit Networking Table</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                size="small"
                label="Table name"
                value={networkingTableEditName}
                onChange={e => setNetworkingTableEditName(e.target.value)}
                fullWidth
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                size="small"
                label="Location/Note"
                value={networkingTableEditLocation}
                onChange={e => setNetworkingTableEditLocation(e.target.value)}
                fullWidth
                inputProps={{ maxLength: 200 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNetworkingTableEditOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!networkingTableEditName.trim() || networkingTableEditSaving}
              onClick={updateNetworkingTable}
              sx={{ textTransform: "none" }}
            >
              {networkingTableEditSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ---- Networking Table Delete Dialog ---- */}
        <Dialog
          open={networkingTableDeleteOpen}
          onClose={() => {
            if (networkingTableDeleteLoading) return;
            setNetworkingTableDeleteOpen(false);
            setNetworkingTableDeleteTarget(null);
            setNetworkingTableDeleteReason("");
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            {networkingTableDeleteTarget?.is_in_use
              ? "Networking Table Already in Use"
              : "Delete Networking Table?"}
          </DialogTitle>
          <DialogContent>
            {networkingTableDeleteTarget?.is_in_use ? (
              <Alert severity="warning" sx={{ mt: 0.5 }}>
                <AlertTitle>Already in use</AlertTitle>
                <strong>{networkingTableDeleteTarget?.name}</strong> is assigned to {" "}
                {networkingTableDeleteTarget?.active_meeting_count || 1} accepted meeting
                {(networkingTableDeleteTarget?.active_meeting_count || 1) === 1 ? "" : "s"} and cannot be deleted now.
                {networkingTableDeleteTarget?.available_after && (
                  <>
                    {" "}The last assigned meeting is scheduled to end on {" "}
                    <strong>{formatNetworkingTableAvailableAfter(networkingTableDeleteTarget.available_after)}</strong>.
                  </>
                )}
                <Box sx={{ mt: 1 }}>
                  Cancel or move the assigned meeting, or wait until it finishes. When the table is free, open this action again and delete it.
                </Box>
              </Alert>
            ) : (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  <strong>{networkingTableDeleteTarget?.name}</strong> is currently free and can be removed from active networking-table management.
                  This is a soft delete: the table remains stored in the database, and completed or cancelled meeting history keeps its table reference.
                </DialogContentText>
                <TextField
                  fullWidth
                  size="small"
                  label="Reason (optional)"
                  value={networkingTableDeleteReason}
                  onChange={(event) => setNetworkingTableDeleteReason(event.target.value)}
                  inputProps={{ maxLength: 500 }}
                  multiline
                  minRows={2}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setNetworkingTableDeleteOpen(false);
                setNetworkingTableDeleteTarget(null);
                setNetworkingTableDeleteReason("");
              }}
              disabled={networkingTableDeleteLoading}
              sx={{ textTransform: "none" }}
            >
              {networkingTableDeleteTarget?.is_in_use ? "Close" : "Cancel"}
            </Button>
            {!networkingTableDeleteTarget?.is_in_use && (
              <Button
                variant="contained"
                color="error"
                disabled={networkingTableDeleteLoading}
                onClick={deleteNetworkingTable}
                sx={{ textTransform: "none" }}
              >
                {networkingTableDeleteLoading ? "Removing..." : "Delete Table"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Stack>
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

  const handleMembersExport = async () => {
    if (!event) return;
    setMembersExportLoading(true);
    setMembersExportError("");
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${event.id}/export-members-csv/`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename\s*=\s*"?([^";\n]+)"?/);
      const filename = nameMatch ? nameMatch[1].trim() : `Registered_Participants_Details.csv`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      toast.success("Members exported successfully!");
    } catch (err) {
      setMembersExportError(err.message || "Export failed. Please try again.");
      toast.error(err.message || "Export failed. Please try again.");
    } finally {
      setMembersExportLoading(false);
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
        `${API_ROOT}/interactions/questions/?event_id=${event.id}&cursor=1&limit=200&sort=newest`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resAll.ok) {
        const allQuestions = await resAll.json();
        const allQuestionRows = Array.isArray(allQuestions)
          ? allQuestions
          : (Array.isArray(allQuestions?.results) ? allQuestions.results : []);
        const answeredWithText = allQuestionRows
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
                      {tab === tabLabels.indexOf("Applications") && <EventManageApplications eventId={event?.id} />}
                      {tab === tabLabels.indexOf("Application Tracks") && (
                        <ApplicationTracksManager
                          eventId={event?.id}
                          token={getToken()}
                          event={event}
                          onEventUpdated={setEvent}
                        />
                      )}
                      {tab === tabLabels.indexOf("Registered Members") && renderMembers()}
                      {tab === tabLabels.indexOf("Participants") && renderParticipants()}
                      {tab === tabLabels.indexOf("Participant Information") && <ParticipantInformationManager eventId={event?.id} />}
                      {tab === tabLabels.indexOf("Promotional Profiles") && <PromotionalProfilesManager eventId={event?.id} />}
                      {tab === tabLabels.indexOf("Guest Audit") && renderGuestAudit()}
                      {tab === tabLabels.indexOf("Session") && renderSessions()}
                      {tab === tabLabels.indexOf("Resources") && renderResources()}
                      {tab === tabLabels.indexOf("Q&A") && <EventQnAManager event={event} onEventUpdated={setEvent} />}
                      {tab === tabLabels.indexOf("Speed Networking") && renderSpeedNetworking()}
                      {tab === tabLabels.indexOf("Breakout Rooms Tables") && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                      {tab === tabLabels.indexOf("Social Lounge") && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                      {tab === tabLabels.indexOf("Lounge Settings") && renderLoungeSettings()}
                      {tab === tabLabels.indexOf("Email Notifications") && <EventEmailTemplatesManager event={event} />}
                      {tab === tabLabels.indexOf("Companion") && renderCompanion()}
                      {tabLabels.indexOf("Product Management") !== -1 && tab === tabLabels.indexOf("Product Management") && renderProductManagement()}
                      {ordersTabIndex !== -1 && tab === ordersTabIndex && renderEventOrders()}
                      {tab === tabLabels.indexOf("Edit") && renderEdit()}
                    </>
                  ) : (
                    <>
                      {tab === tabLabels.indexOf("Registered Members") && renderMembers()}
                      {tab === tabLabels.indexOf("Participants") && renderParticipants()}
                      {tab === tabLabels.indexOf("Participant Information") && <ParticipantInformationManager eventId={event?.id} />}
                      {tab === tabLabels.indexOf("Promotional Profiles") && <PromotionalProfilesManager eventId={event?.id} />}
                      {tab === tabLabels.indexOf("Guest Audit") && renderGuestAudit()}
                      {tab === tabLabels.indexOf("Session") && renderSessions()}
                      {tab === tabLabels.indexOf("Resources") && renderResources()}
                      {tab === tabLabels.indexOf("Q&A") && <EventQnAManager event={event} onEventUpdated={setEvent} />}
                      {tab === tabLabels.indexOf("Speed Networking") && renderSpeedNetworking()}
                      {tab === tabLabels.indexOf("Breakout Rooms Tables") && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                      {tab === tabLabels.indexOf("Social Lounge") && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                      {tab === tabLabels.indexOf("Lounge Settings") && renderLoungeSettings()}
                      {tab === tabLabels.indexOf("Email Notifications") && <EventEmailTemplatesManager event={event} />}
                      {tab === tabLabels.indexOf("Companion") && renderCompanion()}
                      {tabLabels.indexOf("Product Management") !== -1 && tab === tabLabels.indexOf("Product Management") && renderProductManagement()}
                      {ordersTabIndex !== -1 && tab === ordersTabIndex && renderEventOrders()}
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
            setLoungeDeleteReason("");
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
            <DialogContentText sx={{ mb: 2 }}>
              This is a soft delete. The {(loungeDeleteTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'room' : 'table'} "{loungeDeleteTarget?.name || "Table"}" will disappear from the event, but its configuration, icon, event link, and meeting identifier will remain stored in the database. Current seats will be cleared.
            </DialogContentText>
            <TextField
              fullWidth
              label="Reason (optional)"
              value={loungeDeleteReason}
              onChange={(event) => setLoungeDeleteReason(event.target.value)}
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeDeleteOpen(false);
                setLoungeDeleteTarget(null);
                setLoungeDeleteReason("");
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
              getOptionDisabled={(option) => {
                return registrations.some(
                  reg => reg.user_email?.toLowerCase() === option.email?.toLowerCase()
                );
              }}
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
                const isAlreadyRegistered = registrations.some(
                  reg => reg.user_email?.toLowerCase() === option.email?.toLowerCase()
                );
                return (
                  <li key={key} {...optionProps} style={{ opacity: isAlreadyRegistered ? 0.6 : 1 }}>
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
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Session?</DialogTitle>
          <DialogContent>
            <DialogContentText component="div">
              <Typography component="p" sx={{ mb: 1.5 }}>
                This removes <strong>{sessionToDelete?.title || "this session"}</strong> from the event schedule.
              </Typography>
              <Typography component="p" variant="body2" color="text.secondary">
                This is a soft delete. The session remains stored in the database with its speakers, participants, attendance, bookmarks, meeting identifiers, recording and break history. It will no longer be visible or joinable in the event schedule.
              </Typography>
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
              {sessionActionLoading ? "Deleting..." : "Delete Session"}
            </Button>
          </DialogActions>
        </Dialog>

        {event?.id && (
          <>
            <InviteUsersDialog
              open={inviteUsersOpen}
              onClose={() => setInviteUsersOpen(false)}
              eventId={event?.id}
              eventTitle={event?.title || ""}
              eventSlug={event?.slug || ""}
            />
            <InviteEmailsDialog
              open={inviteEmailsOpen}
              onClose={() => setInviteEmailsOpen(false)}
              mode="event"
              targetIdOrSlug={event?.slug}
            />

            {/* Resend Mail to All — Confirmation Dialog */}
            <Dialog
              open={resendMailOpen}
              onClose={() => !resendMailLoading && setResendMailOpen(false)}
              PaperProps={{ style: { borderRadius: 16, padding: 8 } }}
            >
              <DialogTitle sx={{ fontWeight: 700 }}>Resend Registration Email?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  This will resend the registration confirmation email to all{" "}
                  <strong>{registrations.filter(r => r.status === "registered" && r.attendee_status === "confirmed").length}</strong>{" "}
                  confirmed registered members. Are you sure?
                </DialogContentText>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setResendMailOpen(false)} disabled={resendMailLoading} color="inherit">
                  Cancel
                </Button>
                <Button
                  onClick={handleResendMailToAll}
                  disabled={resendMailLoading}
                  variant="contained"
                  color="warning"
                  autoFocus
                >
                  {resendMailLoading ? "Sending..." : "Yes, Resend All"}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Resend Mail to All — Result Dialog */}
            <Dialog
              open={resendMailResultOpen}
              onClose={() => setResendMailResultOpen(false)}
              PaperProps={{ style: { borderRadius: 16, padding: 8 } }}
            >
              <DialogTitle sx={{ fontWeight: 700 }}>Email Resend Complete</DialogTitle>
              <DialogContent>
                <DialogContentText component="div">
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Total targeted:</strong> {resendMailResult?.total_count ?? 0}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "success.main" }}>
                      <strong>Successfully sent:</strong> {resendMailResult?.success_count ?? 0}
                    </Typography>
                    {(resendMailResult?.failed_count ?? 0) > 0 && (
                      <Typography variant="body2" sx={{ color: "error.main" }}>
                        <strong>Failed:</strong> {resendMailResult?.failed_count} (missing or invalid email addresses)
                      </Typography>
                    )}
                  </Stack>
                </DialogContentText>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setResendMailResultOpen(false)} variant="contained">
                  Done
                </Button>
              </DialogActions>
            </Dialog>
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

        {/* Soft Delete Event Dialog */}
        <Dialog
          open={archiveEventOpen}
          onClose={() => !archiveEventLoading && setArchiveEventOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Delete Event</DialogTitle>
          <DialogContent dividers>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>{event?.title || "This event"}</strong> will be removed from the platform and will no longer
              appear in All, Upcoming, Live, Past, Cancelled, or Hidden event lists.
            </Alert>
            <Alert severity="info" sx={{ mb: 2 }}>
              This is a soft delete, not a permanent database deletion. The event record, registrations,
              applications, participants, attendance, orders, invoices, recordings, WordPress/MANDA mappings,
              canonical IDs, and Saleor IDs will remain stored. No cancellation email will be sent.
            </Alert>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Deletion reason (optional)"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Why is this event being removed from the platform?"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setArchiveEventOpen(false)}
              disabled={archiveEventLoading}
              sx={{ textTransform: "none" }}
            >
              Keep Event
            </Button>
            <Button
              onClick={handleArchiveEvent}
              disabled={archiveEventLoading}
              variant="contained"
              color="error"
              startIcon={archiveEventLoading ? <CircularProgress size={18} color="inherit" /> : <DeleteOutlineRoundedIcon />}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
            >
              {archiveEventLoading ? "Deleting..." : "Delete Event"}
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
