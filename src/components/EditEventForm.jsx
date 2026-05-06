import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Box,
    Button,
    Chip,
    Paper,
    TextField,
    Typography,
    Stack,
    Snackbar,
    Alert,
    CircularProgress,
    MenuItem,
    FormControlLabel,
    Switch,
    Checkbox,
    IconButton,
    InputAdornment,
    Tooltip,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
} from "@mui/material";
import Grid from "@mui/material/Grid"; // v5
import Autocomplete from "@mui/material/Autocomplete";
import { LocalizationProvider, TimePicker, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Icons
import InsertPhotoRoundedIcon from '@mui/icons-material/InsertPhotoRounded';
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

// Components
import ParticipantForm from "./ParticipantForm";
import ParticipantList from "./ParticipantList";
import SessionDialog from "./SessionDialog";
import SessionList from "./SessionList";

// Utils
import {
    getToken,
    toAbs,
    getBrowserTimezone,
    TIMEZONE_OPTIONS,
    computeEndFromStart,
    toUTCISO,
    isValidHHmm,
    API_ROOT,
    COUNTRY_OPTIONS,
    getSelectedCountry,
    slugifyLocal,
    sanitizeSlugInput
} from "../utils/eventUtils";
import {
    validateNonMultidayEvent,
    validateMultidayEvent,
} from "../utils/dateTimeValidator";

dayjs.extend(utc);
dayjs.extend(timezone);

const categories = ["Workshop", "Strategy", "Legal", "Leadership", "Networking", "Q&A", "Live"];
const formats = [
    { value: "virtual", label: "Virtual" },
    { value: "in_person", label: "In person" },
    { value: "hybrid", label: "Hybrid" },
];

const tokenHeader = () => {
    const t =
        localStorage.getItem("access_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("access") ||
        localStorage.getItem("jwt");
    return t ? { Authorization: `Bearer ${t}` } : {};
};

// City Autocomplete Component - fetches from backend DB
function CityAutocompleteOpenMeteo({ label = "City", value, onSelect, error, helperText }) {
    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    React.useEffect(() => {
        const q = (inputValue || "").trim();
        if (q.length < 2) {
            setOptions(value ? [value] : []);
            return;
        }

        let active = true;
        const controller = new AbortController();

        const run = async () => {
            setLoading(true);
            try {
                const url = `${API_ROOT}/auth/cities/search/?q=${encodeURIComponent(q)}&limit=10`;
                const r = await fetch(url, {
                    signal: controller.signal,
                    headers: tokenHeader(),
                });
                if (!r.ok) return;

                const data = await r.json();
                const results = (data?.results || [])
                    .map((x) => ({
                        geoname_id: x.geoname_id, // unique identifier
                        name: x.name || "",
                        admin1: x.is_other ? "Other / Not listed" : "",
                        country: x.country_name || "",
                        country_code: x.country_code || "",
                        latitude: x.lat,
                        longitude: x.lng,
                        label: x.label,
                        timezone: x.timezone || "",
                    }))
                    .filter((x) => x.name && x.country);

                if (active) setOptions(results);
            } catch (e) {
                if (e?.name !== "AbortError") console.error("City search failed", e);
            } finally {
                if (active) setLoading(false);
            }
        };

        const t = setTimeout(run, 350);
        return () => {
            active = false;
            controller.abort();
            clearTimeout(t);
        };
    }, [inputValue, value]);

    return (
        <Autocomplete
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={options}
            loading={loading}
            value={value || null}
            inputValue={inputValue}
            onInputChange={(_, v) => setInputValue(v)}
            isOptionEqualToValue={(o, v) =>
                (o?.geoname_id && v?.geoname_id && o.geoname_id === v.geoname_id) ||
                (o?.name === v?.name &&
                    o?.country === v?.country &&
                    o?.admin1 === v?.admin1)
            }
            getOptionLabel={(o) => o?.name || ""}
            onChange={(_, newValue) => {
                onSelect?.(newValue || null);
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    fullWidth
                    placeholder="Type city name..."
                    error={error}
                    helperText={helperText}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress size={18} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
            renderOption={(props, option) => (
                <li {...props} key={option.geoname_id || `${option.name}-${option.country}`}>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {option.country}
                        </Typography>
                    </Box>
                </li>
            )}
        />
    );
}

// Helper to parse "City, Country" string into city object for in_person/hybrid
function parseLocationString(locationString, format) {
    if (format === "virtual" || !locationString) return null;

    const parts = (locationString || "").trim().split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return {
            name: parts[0],
            country: parts[parts.length - 1],
            admin1: "",
            country_code: "",
            latitude: null,
            longitude: null,
            timezone: "",
        };
    } else if (parts.length === 1) {
        return {
            name: parts[0],
            country: "",
            admin1: "",
            country_code: "",
            latitude: null,
            longitude: null,
            timezone: "",
        };
    }
    return null;
}

export default function EditEventForm({ event, onUpdated, onCancel }) {
    const token = getToken();

    // --- local state from existing event ---
    const initialTimezone = event?.timezone || getBrowserTimezone();
    const initialStart = event?.start_time
        ? dayjs(event.start_time).tz(initialTimezone)
        : dayjs();
    const initialEnd = event?.end_time
        ? dayjs(event.end_time).tz(initialTimezone)
        : initialStart.add(2, "hour");

    const [title, setTitle] = useState(event?.title || "");
    const [slug, setSlug] = useState(event?.slug || "");
    const [description, setDescription] = useState(event?.description || "");
    const eventFormat = event?.format || "virtual";
    const [location, setLocation] = useState(() => {
        // For in_person/hybrid: parse location string to city object
        if (["in_person", "hybrid"].includes(eventFormat)) {
            return parseLocationString(event?.location, eventFormat);
        }
        // For virtual: keep as string (country name)
        return event?.location || "";
    });
    const [locationCity, setLocationCity] = useState(() => {
        if (["in_person", "hybrid"].includes(eventFormat) && event?.location_city) {
            return { name: event.location_city, country: event.location_country };
        }
        return null;
    });
    const [locationCountry, setLocationCountry] = useState(event?.location_country || "");
    const [venueName, setVenueName] = useState(event?.venue_name || "");
    const [venueAddress, setVenueAddress] = useState(event?.venue_address || "");
    const [category, setCategory] = useState(event?.category || "Workshop");
    const [format, setFormat] = useState(eventFormat);
    const [price, setPrice] = useState(
        typeof event?.price === "number" ? event.price : Number(event?.price || 0)
    );
    const [isFree, setIsFree] = useState(event?.is_free || false);
    const [priceLabel, setPriceLabel] = useState(event?.price_label || "");
    const [registrationType, setRegistrationType] = useState(event?.registration_type || "open");
    const [cpdCpeMinutes, setCpdCpeMinutes] = useState(
        event?.cpd_cpe_minutes === null || typeof event?.cpd_cpe_minutes === "undefined"
            ? ""
            : String(event.cpd_cpe_minutes)
    );
    const [cpdCpeMinutesPerCredit, setCpdCpeMinutesPerCredit] = useState(
        event?.cpd_cpe_minutes_per_credit ? String(event.cpd_cpe_minutes_per_credit) : "60"
    );
    const [showCpdCpe, setShowCpdCpe] = useState(
        event?.show_cpd_cpe !== undefined ? event.show_cpd_cpe : false
    );
    const [maxParticipants, setMaxParticipants] = useState(event?.max_participants || "");
    const [loungeTableCapacity, setLoungeTableCapacity] = useState(event?.lounge_table_capacity || 4);
    const [qnaAiPublicSuggestionsEnabled, setQnaAiPublicSuggestionsEnabled] = useState(
        Boolean(event?.qna_ai_public_suggestions_enabled)
    );
    const [preEventQnaEnabled, setPreEventQnaEnabled] = useState(
        Boolean(event?.pre_event_qna_enabled)
    );


    const [isMultiDay, setIsMultiDay] = useState(() => Boolean(event?.is_multi_day));
    const [startDate, setStartDate] = useState(initialStart.format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(initialEnd.format("YYYY-MM-DD"));
    const [startTime, setStartTime] = useState(initialStart.format("HH:mm"));
    const [endTime, setEndTime] = useState(initialEnd.format("HH:mm"));
    // Store single-day times to restore when toggling back
    const [singleDayStartTime, setSingleDayStartTime] = useState(initialStart.format("HH:mm"));
    const [singleDayEndTime, setSingleDayEndTime] = useState(initialEnd.format("HH:mm"));

    const [timezone, setTimezone] = useState(initialTimezone);
    const timezoneOptions = useMemo(() => {
        return timezone && !TIMEZONE_OPTIONS.includes(timezone)
            ? [timezone, ...TIMEZONE_OPTIONS]
            : TIMEZONE_OPTIONS;
    }, [timezone]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

    // Participants
    const [participants, setParticipants] = useState([]);
    const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
    const [editingParticipantIndex, setEditingParticipantIndex] = useState(null);

    // Sessions (for multi-day events)
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState("");

    // Hours calculation session types (platform_admin only)
    const [hoursCalculationSessionTypes, setHoursCalculationSessionTypes] = useState(() => {
        const defaultTypes = ["main", "breakout", "workshop"];
        return event?.hours_calculation_session_types || defaultTypes;
    });

    // Total hours override (host can override calculated hours)
    const [hasTotalHoursOverride, setHasTotalHoursOverride] = useState(
        event?.has_total_hours_override || false
    );
    const [totalHoursOverrideMinutes, setTotalHoursOverrideMinutes] = useState(
        event?.total_hours_override_minutes || ""
    );

    // Current user info for platform_admin check
    const [currentUser, setCurrentUser] = useState(null);
    const [userLoading, setUserLoading] = useState(true);

    // image handling - Update Logo / Picture (original branding image)
    const [logoImageFile, setLogoImageFile] = useState(null);
    const [localLogoImagePreview, setLocalLogoImagePreview] = useState("");
    const logoImage = event?.preview_image ? toAbs(event.preview_image) : "";

    // image handling - Cover Image (displayed when host disconnected or event not live)
    const [coverImageFile, setCoverImageFile] = useState(null);
    const [localCoverImagePreview, setLocalCoverImagePreview] = useState("");
    const coverImage = event?.cover_image ? toAbs(event.cover_image) : "";

    // image handling - Waiting Room Image (replaces clock in waiting room if uploaded)
    const [waitingRoomImageFile, setWaitingRoomImageFile] = useState(null);
    const [localWaitingRoomImagePreview, setLocalWaitingRoomImagePreview] = useState("");
    const waitingRoomImage = event?.waiting_room_image ? toAbs(event.waiting_room_image) : "";
    const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(Boolean(event?.waiting_room_enabled));
    const [waitingRoomLoungeAllowed, setWaitingRoomLoungeAllowed] = useState(
        event?.lounge_enabled_waiting_room !== undefined ? Boolean(event.lounge_enabled_waiting_room) : true
    );
    const [waitingRoomNetworkingAllowed, setWaitingRoomNetworkingAllowed] = useState(
        event?.networking_tables_enabled_waiting_room !== undefined ? Boolean(event.networking_tables_enabled_waiting_room) : true
    );
    const [waitingRoomAutoAdmitSeconds, setWaitingRoomAutoAdmitSeconds] = useState(
        event?.auto_admit_seconds ? String(event.auto_admit_seconds) : ""
    );
    const [waitingRoomGracePeriodMinutes, setWaitingRoomGracePeriodMinutes] = useState(
        event?.waiting_room_grace_period_minutes ? String(event.waiting_room_grace_period_minutes) : "0"
    );

    // Session Dialog State
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const [editingSessionIndex, setEditingSessionIndex] = useState(null);
    const [sessionSubmitting, setSessionSubmitting] = useState(false);
    const [savedSchedule, setSavedSchedule] = useState(() => ({
        startISO: event?.start_time ? dayjs(event.start_time).toISOString() : null,
        endISO: event?.end_time ? dayjs(event.end_time).toISOString() : null,
        timezone: event?.timezone || getBrowserTimezone(),
        isMultiDay: Boolean(event?.is_multi_day),
    }));

    useEffect(() => {
        if (!event?.id) return;
        setSavedSchedule({
            startISO: event?.start_time ? dayjs(event.start_time).toISOString() : null,
            endISO: event?.end_time ? dayjs(event.end_time).toISOString() : null,
            timezone: event?.timezone || getBrowserTimezone(),
            isMultiDay: Boolean(event?.is_multi_day),
        });
    }, [event?.end_time, event?.id, event?.is_multi_day, event?.start_time, event?.timezone]);

    // Fetch current user to check if platform_admin
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await fetch(`${API_ROOT}/users/me/`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data);
                }
            } catch (err) {
                console.error("Failed to fetch current user:", err);
            } finally {
                setUserLoading(false);
            }
        };
        fetchUser();
    }, [token]);

    const isScheduleDirty = useMemo(() => {
        if (!event?.id) return false;
        const currentStartISO = toUTCISO(startDate, startTime, timezone);
        const currentEndISO = toUTCISO(isMultiDay ? endDate : startDate, endTime, timezone);
        return (
            savedSchedule.timezone !== timezone ||
            savedSchedule.isMultiDay !== Boolean(isMultiDay) ||
            savedSchedule.startISO !== currentStartISO ||
            savedSchedule.endISO !== currentEndISO
        );
    }, [endDate, endTime, event?.id, isMultiDay, savedSchedule, startDate, startTime, timezone]);

    // Confirmation dialog for multi-day to single-day conversion
    const [showSingleDayConversionDialog, setShowSingleDayConversionDialog] = useState(false);

    const [replayAvailable, setReplayAvailable] = React.useState(false);
    const [replayDuration, setReplayDuration] = React.useState("");
    const [autoPublish, setAutoPublish] = React.useState(true); // ✅ Default true, sync from event in useEffect

    // ----- Seed Questions -----
    const [seedQuestions, setSeedQuestions] = useState([]);
    const [seedLoading, setSeedLoading] = useState(false);
    const [newSeedContent, setNewSeedContent] = useState("");
    const [newSeedAttribution, setNewSeedAttribution] = useState("");
    const [newSeedNote, setNewSeedNote] = useState("");
    const [addingSeed, setAddingSeed] = useState(false);
    const [editingSeedId, setEditingSeedId] = useState(null);
    const [editSeedContent, setEditSeedContent] = useState("");
    const [editSeedAttribution, setEditSeedAttribution] = useState("");
    const [editSeedNote, setEditSeedNote] = useState("");

    // Memoize dayjs objects to prevent DatePicker from snapping back while navigating calendar
    const startDateValue = useMemo(() => startDate ? dayjs(startDate) : null, [startDate]);
    const endDateValue = useMemo(() => endDate ? dayjs(endDate) : null, [endDate]);

    const normalizeParticipantsFromEvent = useCallback((eventPayload) => {
        const normalizedParticipants = [];
        const pushParticipant = (p = {}) => {
            const participantTypeRaw =
                p.participant_type ||
                p.participantType ||
                (p.user_id || p.userId || p.user ? "staff" : "guest");
            const participantTypeNormalized = String(participantTypeRaw || "guest").toLowerCase();

            let participantType = "guest";
            if (participantTypeNormalized === "virtual" || p.virtual_speaker_id || p.virtualSpeakerId) {
                participantType = "virtual";
            } else if (participantTypeNormalized === "guest") {
                participantType = "guest";
            } else {
                const isNonStaffUser = p?.is_staff === false || p?.user?.is_staff === false;
                participantType = isNonStaffUser ? "user" : "staff";
            }

            const firstName = p.first_name || p.firstName || p.user?.first_name || "";
            const lastName = p.last_name || p.lastName || p.user?.last_name || "";
            const fullName = p.name || p.guestName || `${firstName} ${lastName}`.trim();
            const role = String(p.role || "speaker").toLowerCase();

            const normalized = {
                id: p.id,
                participantType,
                role,
                userId: p.user_id || p.userId || p.user?.id || null,
                firstName,
                lastName,
                email: p.email || p.user?.email || "",
                guestName: fullName,
                guestEmail: p.email || p.guestEmail || "",
                bio: p.bio || p.bio_text || "",
                imageUrl: p.profile_image_url || p.imageUrl || p.user?.profile?.image || "",
                displayOrder: Number(p.display_order ?? p.displayOrder ?? 0),
            };

            // Add virtual speaker specific fields
            if (participantType === "virtual") {
                normalized.virtualSpeakerId = p.virtual_speaker_id || p.virtualSpeakerId || null;
                // If we have a full virtual_speaker object, extract data
                if (p.virtual_speaker) {
                    normalized.name = p.virtual_speaker.name || fullName;
                    normalized.imageUrl = p.virtual_speaker.profile_image_url || normalized.imageUrl;
                } else {
                    normalized.name = fullName;
                }
            }

            normalizedParticipants.push(normalized);
        };

        if (Array.isArray(eventPayload?.participants)) {
            eventPayload.participants.forEach(pushParticipant);
        }
        if (Array.isArray(eventPayload?.event_participants)) {
            eventPayload.event_participants.forEach(pushParticipant);
        }
        if (eventPayload?.event_participants && typeof eventPayload.event_participants === "object") {
            ["speakers", "moderators", "hosts"].forEach((roleGroup) => {
                const roleParticipants = eventPayload.event_participants[roleGroup] || [];
                roleParticipants.forEach(pushParticipant);
            });
        }
        if (Array.isArray(eventPayload?.speakers)) eventPayload.speakers.forEach(pushParticipant);
        if (Array.isArray(eventPayload?.hosts)) eventPayload.hosts.forEach(pushParticipant);
        if (Array.isArray(eventPayload?.moderators)) eventPayload.moderators.forEach(pushParticipant);

        normalizedParticipants.sort((a, b) => a.displayOrder - b.displayOrder);
        return normalizedParticipants;
    }, []);

    const normalizeSession = useCallback((session = {}) => {
        const startISO = session.startTime || session.start_time || null;
        const endISO = session.endTime || session.end_time || null;
        const dateFromStart = startISO ? dayjs(startISO).format("YYYY-MM-DD") : null;
        return {
            id: session.id,
            title: session.title || "",
            description: session.description || "",
            sessionType: session.sessionType || session.session_type || "main",
            startTime: startISO,
            endTime: endISO,
            sessionDate: session.sessionDate || session.session_date || dateFromStart,
            displayOrder: Number(session.displayOrder ?? session.display_order ?? 0),
            session_image: session.session_image || null,
            imageFile: session.imageFile || null, // Preserve image file when pending
            _pending: Boolean(session._pending),
            _localId: session._localId || session.localId || null,
        };
    }, []);

    const withSequentialSessionOrder = useCallback((items) => {
        return items.map((session, index) => ({
            ...session,
            displayOrder: index,
        }));
    }, []);

    useEffect(() => {
        // hydrate on open in case `event` changed
        const tz = event?.timezone || getBrowserTimezone();
        const eventFormat = (event?.format || "virtual").toLowerCase();
        setTitle(event?.title || "");
        setSlug(event?.slug || "");
        setDescription(event?.description || "");
        // Parse location based on format
        if (["in_person", "hybrid"].includes(eventFormat)) {
            setLocation(parseLocationString(event?.location, eventFormat));
        } else {
            setLocation(event?.location || "");
        }
        setCategory(event?.category || "Workshop");
        setFormat(eventFormat);
        setPrice(typeof event?.price === "number" ? event.price : Number(event?.price || 0));
        setIsFree(event?.is_free || false);
        setMaxParticipants(event?.max_participants || "");
        setCpdCpeMinutes(
            event?.cpd_cpe_minutes === null || typeof event?.cpd_cpe_minutes === "undefined"
                ? ""
                : String(event.cpd_cpe_minutes)
        );
        setCpdCpeMinutesPerCredit(
            event?.cpd_cpe_minutes_per_credit ? String(event.cpd_cpe_minutes_per_credit) : "60"
        );
        setShowCpdCpe(event?.show_cpd_cpe !== undefined ? event.show_cpd_cpe : false);
        setLoungeTableCapacity(event?.lounge_table_capacity || 4);
        setQnaAiPublicSuggestionsEnabled(Boolean(event?.qna_ai_public_suggestions_enabled));
        setPreEventQnaEnabled(Boolean(event?.pre_event_qna_enabled));

        const start = event?.start_time ? dayjs(event.start_time).tz(tz) : dayjs();
        const end = event?.end_time ? dayjs(event.end_time).tz(tz) : start.add(2, "hour");
        setTimezone(tz);
        setIsMultiDay(Boolean(event?.is_multi_day));
        setStartDate(start.format("YYYY-MM-DD"));
        setEndDate(end.format("YYYY-MM-DD"));
        setStartTime(start.format("HH:mm"));
        setEndTime(end.format("HH:mm"));

        setLogoImageFile(null);
        setLocalLogoImagePreview("");
        setCoverImageFile(null);
        setLocalCoverImagePreview("");
        setWaitingRoomImageFile(null);
        setLocalWaitingRoomImagePreview("");

        setWaitingRoomGracePeriodMinutes(String(event?.waiting_room_grace_period_minutes || "0"));
        // Init replay options
        setReplayAvailable(!!event?.replay_available);
        setReplayDuration(event?.replay_availability_duration || "");
        console.log("🔍 EditEventForm - replay_publishing_mode from event:", event?.replay_publishing_mode);
        setAutoPublish(event?.replay_publishing_mode === "auto_publish" ? true : false);

        setParticipants(normalizeParticipantsFromEvent(event));

        setErrors({});
    }, [event, normalizeParticipantsFromEvent]);

    useEffect(() => {
        if (!event?.id) return;

        let cancelled = false;
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const loadParticipantsFromDetail = async () => {
            try {
                const res = await fetch(`${API_ROOT}/events/${event.id}/`, { headers });
                if (!res.ok) return;
                const detail = await res.json();
                if (cancelled) return;
                const normalized = normalizeParticipantsFromEvent(detail);
                if (normalized.length > 0) {
                    setParticipants(normalized);
                }
            } catch (err) {
                // keep current participants state from initial event payload
            }
        };

        loadParticipantsFromDetail();
        return () => {
            cancelled = true;
        };
    }, [event?.id, token, normalizeParticipantsFromEvent]);

    // Fetch sessions for multi-day events
    useEffect(() => {
        if (!event?.id || !isMultiDay) return;

        let cancelled = false;
        const headers = {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const loadSessions = async () => {
            setSessionsLoading(true);
            setSessionsError("");
            try {
                const res = await fetch(`${API_ROOT}/events/${event.id}/sessions/`, { headers });
                const json = await res.json().catch(() => []);
                if (!res.ok) {
                    setSessionsError(json?.detail || "Failed to load sessions");
                    return;
                }
                if (cancelled) return;

                let data = [];
                if (Array.isArray(json)) {
                    data = json;
                } else if (json && Array.isArray(json.results)) {
                    data = json.results;
                }
                const normalized = data.map(normalizeSession).sort((a, b) => {
                    const aOrder = Number(a.displayOrder ?? Number.MAX_SAFE_INTEGER);
                    const bOrder = Number(b.displayOrder ?? Number.MAX_SAFE_INTEGER);
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    const aTime = a.startTime ? dayjs(a.startTime).valueOf() : Number.MAX_SAFE_INTEGER;
                    const bTime = b.startTime ? dayjs(b.startTime).valueOf() : Number.MAX_SAFE_INTEGER;
                    return aTime - bTime;
                });
                setSessions(withSequentialSessionOrder(normalized));
            } catch (err) {
                console.error("Error loading sessions:", err);
                setSessionsError(err?.message || "Unable to load sessions");
            } finally {
                setSessionsLoading(false);
            }
        };

        loadSessions();
        return () => {
            cancelled = true;
        };
    }, [event?.id, token, isMultiDay, normalizeSession, withSequentialSessionOrder]);

    // ----- Seed Questions CRUD -----
    const seedHeaders = useCallback(() => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }), [token]);

    const loadSeedQuestions = useCallback(async () => {
        if (!event?.id) return;
        setSeedLoading(true);
        try {
            const res = await fetch(
                `${API_ROOT}/interactions/questions/?event_id=${event.id}&is_seed=1`,
                { headers: seedHeaders() }
            );
            if (!res.ok) return;
            const data = await res.json();
            setSeedQuestions(Array.isArray(data) ? data : []);
        } catch (e) {
            // silently fail; seed section just stays empty
        } finally {
            setSeedLoading(false);
        }
    }, [event?.id, seedHeaders]);

    useEffect(() => {
        loadSeedQuestions();
    }, [loadSeedQuestions]);

    const addSeedQuestion = useCallback(async () => {
        const content = newSeedContent.trim();
        if (!content || !event?.id) return;
        setAddingSeed(true);
        try {
            const res = await fetch(`${API_ROOT}/interactions/questions/seed/`, {
                method: "POST",
                headers: seedHeaders(),
                body: JSON.stringify({
                    event: event.id,
                    content,
                    attribution_label: newSeedAttribution.trim(),
                    speaker_note: newSeedNote.trim(),
                }),
            });
            if (!res.ok) throw new Error("Failed to create seed question");
            const created = await res.json();
            setSeedQuestions((prev) => [...prev, created]);
            setNewSeedContent("");
            setNewSeedAttribution("");
            setNewSeedNote("");
        } catch (e) {
            setToast({ open: true, type: "error", msg: e.message || "Failed to add seed question" });
        } finally {
            setAddingSeed(false);
        }
    }, [event?.id, newSeedContent, newSeedAttribution, newSeedNote, seedHeaders]);

    const saveSeedEdit = useCallback(async (id) => {
        try {
            const res = await fetch(`${API_ROOT}/interactions/questions/${id}/seed/`, {
                method: "PATCH",
                headers: seedHeaders(),
                body: JSON.stringify({
                    content: editSeedContent.trim(),
                    attribution_label: editSeedAttribution.trim(),
                    speaker_note: editSeedNote.trim(),
                }),
            });
            if (!res.ok) throw new Error("Failed to update seed question");
            const updated = await res.json();
            setSeedQuestions((prev) =>
                prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
            );
            setEditingSeedId(null);
        } catch (e) {
            setToast({ open: true, type: "error", msg: e.message || "Failed to update seed question" });
        }
    }, [editSeedContent, editSeedAttribution, editSeedNote, seedHeaders]);

    const deleteSeedQuestion = useCallback(async (id) => {
        try {
            const res = await fetch(`${API_ROOT}/interactions/questions/${id}/`, {
                method: "DELETE",
                headers: seedHeaders(),
            });
            if (!res.ok) throw new Error("Failed to delete seed question");
            setSeedQuestions((prev) => prev.filter((q) => q.id !== id));
        } catch (e) {
            setToast({ open: true, type: "error", msg: e.message || "Failed to delete seed question" });
        }
    }, [seedHeaders]);

    const persistSessionOrder = useCallback(async (orderedSessions) => {
        if (!event?.id) return true;

        const persistedSessions = orderedSessions.filter((session) => session?.id && !session?._pending);
        if (persistedSessions.length === 0) return true;

        setSessionSubmitting(true);
        setSessionsError("");
        try {
            for (const session of persistedSessions) {
                const res = await fetch(`${API_ROOT}/events/${event.id}/sessions/${session.id}/`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        display_order: Number(session.displayOrder ?? 0),
                    }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg =
                        json?.detail ||
                        Object.entries(json)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                            .join(" | ") ||
                        `HTTP ${res.status}`;
                    throw new Error(msg);
                }
            }
            return true;
        } catch (err) {
            setSessionsError(err?.message || "Unable to save session order");
            setToast({ open: true, type: "error", msg: err?.message || "Unable to save session order" });
            return false;
        } finally {
            setSessionSubmitting(false);
        }
    }, [event?.id, token]);

    const updateSessionOrder = useCallback(async (nextSessions, successMessage) => {
        const orderedSessions = withSequentialSessionOrder(nextSessions);
        const previousSessions = sessions;
        setSessions(orderedSessions);

        if (isScheduleDirty || orderedSessions.some((session) => session?._pending || !session?.id)) {
            setToast({
                open: true,
                type: "info",
                msg: "Session order will be saved when you click Save.",
            });
            return;
        }

        const saved = await persistSessionOrder(orderedSessions);
        if (!saved) {
            setSessions(previousSessions);
            return;
        }

        setToast({ open: true, type: "success", msg: successMessage });
    }, [isScheduleDirty, persistSessionOrder, sessions, withSequentialSessionOrder]);

    const moveSession = useCallback(async (fromIndex, toIndex) => {
        if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= sessions.length ||
            toIndex >= sessions.length ||
            fromIndex === toIndex
        ) {
            return;
        }
        const next = [...sessions];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        await updateSessionOrder(next, "Session order updated");
    }, [sessions, updateSessionOrder]);

    const sortSessionsByStartTime = useCallback(async () => {
        if (sessions.length < 2) return;
        const sorted = [...sessions].sort((a, b) => {
            const aTime = a?.startTime ? dayjs(a.startTime).valueOf() : Number.MAX_SAFE_INTEGER;
            const bTime = b?.startTime ? dayjs(b.startTime).valueOf() : Number.MAX_SAFE_INTEGER;
            if (aTime !== bTime) return aTime - bTime;
            return Number(a?.displayOrder ?? 0) - Number(b?.displayOrder ?? 0);
        });
        await updateSessionOrder(sorted, "Sessions sorted by start time");
    }, [sessions, updateSessionOrder]);

    const upsertSession = async (sessionData) => {
        if (!event?.id) return;
        setSessionSubmitting(true);
        setSessionsError("");
        try {
            const isEditing = editingSessionIndex !== null;
            const editingSession = isEditing ? sessions[editingSessionIndex] : null;
            const displayOrder = isEditing
                ? Number(editingSession?.displayOrder ?? editingSessionIndex ?? 0)
                : sessions.length;

            if (isScheduleDirty) {
                const localId =
                    sessionData._localId ||
                    editingSession?._localId ||
                    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const pendingSession = normalizeSession({
                    ...sessionData,
                    id: editingSession?.id,
                    displayOrder,
                    _pending: true,
                    _localId: localId,
                });
                setSessions((prev) => {
                    if (isEditing) {
                        return withSequentialSessionOrder(
                            prev.map((item, idx) => (idx === editingSessionIndex ? pendingSession : item))
                        );
                    }
                    return withSequentialSessionOrder([...prev, pendingSession]);
                });
                setToast({
                    open: true,
                    type: "info",
                    msg: "Session will be saved when you click Save.",
                });
                return;
            }

            // Prepare payload - use FormData if image present, otherwise JSON
            const hasImage = sessionData.imageFile && sessionData.imageFile instanceof File;
            let requestBody;
            let headers = token ? { Authorization: `Bearer ${token}` } : {};

            if (hasImage) {
                const formData = new FormData();
                formData.append("title", sessionData.title);
                formData.append("description", sessionData.description || "");
                formData.append("session_type", sessionData.sessionType || "main");
                formData.append("start_time", sessionData.startTime);
                formData.append("end_time", sessionData.endTime);
                formData.append("session_date", dayjs(sessionData.startTime).format("YYYY-MM-DD"));
                formData.append("display_order", displayOrder);
                formData.append("has_duration_override", String(sessionData.has_duration_override || false));
                if (sessionData.duration_minutes_override) {
                    formData.append("duration_minutes_override", String(sessionData.duration_minutes_override));
                }
                formData.append("session_image", sessionData.imageFile);
                requestBody = formData;
                // Don't set Content-Type header; browser will set it with boundary
            } else {
                const payload = {
                    title: sessionData.title,
                    description: sessionData.description || "",
                    session_type: sessionData.sessionType || "main",
                    start_time: sessionData.startTime,
                    end_time: sessionData.endTime,
                    session_date: dayjs(sessionData.startTime).format("YYYY-MM-DD"),
                    display_order: displayOrder,
                    has_duration_override: sessionData.has_duration_override || false,
                };
                if (sessionData.duration_minutes_override) {
                    payload.duration_minutes_override = sessionData.duration_minutes_override;
                }
                requestBody = JSON.stringify(payload);
                headers = { "Content-Type": "application/json", ...headers };
            }

            const url = isEditing
                ? `${API_ROOT}/events/${event.id}/sessions/${editingSession?.id}/`
                : `${API_ROOT}/events/${event.id}/sessions/`;
            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers,
                body: requestBody,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg =
                    json?.detail ||
                    Object.entries(json)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join(" | ") ||
                    `HTTP ${res.status}`;
                throw new Error(msg);
            }

            const savedSession = normalizeSession(json);
            setSessions((prev) => {
                if (isEditing) {
                    return withSequentialSessionOrder(
                        prev.map((item, idx) => (idx === editingSessionIndex ? savedSession : item))
                    );
                }
                return withSequentialSessionOrder([...prev, savedSession]);
            });

            // Persist breaks if any
            if (sessionData.breaks && sessionData.breaks.length > 0) {
                await persistSessionBreaks(savedSession.id, sessionData.breaks);
            }

            setToast({ open: true, type: "success", msg: isEditing ? "Session updated" : "Session added" });
        } catch (err) {
            setSessionsError(err?.message || "Unable to save session");
            setToast({ open: true, type: "error", msg: err?.message || "Unable to save session" });
            throw err;
        } finally {
            setSessionSubmitting(false);
        }
    };

    const persistSessionBreaks = async (sessionId, breaksData) => {
        if (!event?.id || !sessionId || !breaksData || breaksData.length === 0) return;

        try {
            const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };

            for (const brk of breaksData) {
                if (brk.id) {
                    // Update existing break
                    await fetch(`${API_ROOT}/events/${event.id}/sessions/${sessionId}/breaks/${brk.id}/`, {
                        method: "PATCH",
                        headers,
                        body: JSON.stringify({
                            label: brk.label || "",
                            break_type: brk.break_type || "other",
                            duration_minutes: brk.duration_minutes,
                        }),
                    });
                } else {
                    // Create new break
                    await fetch(`${API_ROOT}/events/${event.id}/sessions/${sessionId}/breaks/`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            label: brk.label || "",
                            break_type: brk.break_type || "other",
                            duration_minutes: brk.duration_minutes,
                        }),
                    });
                }
            }
        } catch (err) {
            console.error("Error persisting breaks:", err);
        }
    };

    const flushPendingSessions = async () => {
        if (!event?.id) return true;
        const pending = sessions.filter((s) => s._pending);
        if (pending.length === 0) return true;

        setSessionSubmitting(true);
        setSessionsError("");
        try {
            for (const pendingSession of pending) {
                const isEditing = Boolean(pendingSession.id);

                // Prepare payload - use FormData if image present, otherwise JSON
                const hasImage = pendingSession.imageFile && pendingSession.imageFile instanceof File;
                let requestBody;
                let headers = token ? { Authorization: `Bearer ${token}` } : {};

                if (hasImage) {
                    const formData = new FormData();
                    formData.append("title", pendingSession.title);
                    formData.append("description", pendingSession.description || "");
                    formData.append("session_type", pendingSession.sessionType || "main");
                    formData.append("start_time", pendingSession.startTime);
                    formData.append("end_time", pendingSession.endTime);
                    formData.append("session_date", pendingSession.startTime
                        ? dayjs(pendingSession.startTime).format("YYYY-MM-DD")
                        : null);
                    formData.append("display_order", Number(pendingSession.displayOrder ?? 0));
                    formData.append("session_image", pendingSession.imageFile);
                    requestBody = formData;
                    // Don't set Content-Type header; browser will set it with boundary
                } else {
                    const payload = {
                        title: pendingSession.title,
                        description: pendingSession.description || "",
                        session_type: pendingSession.sessionType || "main",
                        start_time: pendingSession.startTime,
                        end_time: pendingSession.endTime,
                        session_date: pendingSession.startTime
                            ? dayjs(pendingSession.startTime).format("YYYY-MM-DD")
                            : null,
                        display_order: Number(pendingSession.displayOrder ?? 0),
                    };
                    requestBody = JSON.stringify(payload);
                    headers = { "Content-Type": "application/json", ...headers };
                }

                const url = isEditing
                    ? `${API_ROOT}/events/${event.id}/sessions/${pendingSession.id}/`
                    : `${API_ROOT}/events/${event.id}/sessions/`;
                const method = isEditing ? "PATCH" : "POST";

                const res = await fetch(url, {
                    method,
                    headers,
                    body: requestBody,
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg =
                        json?.detail ||
                        Object.entries(json)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                            .join(" | ") ||
                        `HTTP ${res.status}`;
                    throw new Error(msg);
                }

                const savedSession = normalizeSession(json);
                setSessions((prev) =>
                    withSequentialSessionOrder(
                        prev.map((item) => {
                            if (pendingSession.id && item.id === pendingSession.id) return savedSession;
                            if (!pendingSession.id && pendingSession._localId && item._localId === pendingSession._localId) {
                                return savedSession;
                            }
                            return item;
                        })
                    )
                );
            }
            return true;
        } catch (err) {
            setSessionsError(err?.message || "Unable to save sessions");
            setToast({ open: true, type: "error", msg: err?.message || "Unable to save sessions" });
            return false;
        } finally {
            setSessionSubmitting(false);
        }
    };

    const deleteSession = async (sessionId, index) => {
        if (!event?.id || !sessionId) return;
        setSessionSubmitting(true);
        setSessionsError("");
        try {
            const res = await fetch(`${API_ROOT}/events/${event.id}/sessions/${sessionId}/`, {
                method: "DELETE",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                const msg =
                    json?.detail ||
                    Object.entries(json)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join(" | ") ||
                    `HTTP ${res.status}`;
                throw new Error(msg);
            }

            setSessions((prev) => withSequentialSessionOrder(prev.filter((_, idx) => idx !== index)));
            setToast({ open: true, type: "success", msg: "Session deleted" });
        } catch (err) {
            setSessionsError(err?.message || "Unable to delete session");
            setToast({ open: true, type: "error", msg: err?.message || "Unable to delete session" });
        } finally {
            setSessionSubmitting(false);
        }
    };


    const combineToISO = (d, t) => toUTCISO(d, t, timezone);

    // Returns a safe Dayjs value for the TimePicker, or null when the time string is invalid.
    const pickerValue = (t) => (isValidHHmm(t) ? dayjs(`1970-01-01T${t}:00`) : null);

    const validate = () => {
        const e = {};
        if (!title.trim()) e.title = "Required";
        if (!slug.trim()) e.slug = "Required";
        // For in-person/hybrid, check locationCity; for virtual, check location
        if (format === "virtual" && !location) {
            e.location = "Required";
        } else if (["in_person", "hybrid"].includes(format) && !locationCity) {
            e.location = "Required";
        }
        if (!description.trim()) e.description = "Description is required";
        const priceValue = Number(price);
        if (!isFree) {
            // Price is now optional — only validate format if a value is provided
            if (price !== "" && price !== null && typeof price !== "undefined") {
                if (!Number.isFinite(priceValue)) {
                    e.price = "Price must be a valid number";
                } else if (priceValue < 0) {
                    e.price = "Price cannot be negative";
                }
            }
        }
        if (cpdCpeMinutes !== "") {
            const minutesValue = Number(cpdCpeMinutes);
            if (!Number.isInteger(minutesValue) || minutesValue <= 0) {
                e.cpdCpeMinutes = "Total eligible minutes must be a positive whole number";
            }
        }

        if (cpdCpeMinutesPerCredit !== "") {
            const perCreditValue = Number(cpdCpeMinutesPerCredit);
            if (!Number.isInteger(perCreditValue) || perCreditValue <= 0) {
                e.cpdCpeMinutesPerCredit = "Minutes per credit must be a positive whole number";
            }
        }

        // Validate time fields before comparing — never call dayjs.tz on invalid strings
        if (!isValidHHmm(startTime)) {
            e.startTime = "Invalid start time format.";
        }
        if (!isValidHHmm(endTime)) {
            e.endTime = "Invalid end time format.";
        }

        // Timezone-aware validation for event times
        if (!e.startTime && !e.endTime && startDate && startTime && endDate && endTime) {
            if (isMultiDay) {
                // Multiday event: start_date >= today, end_date >= start_date
                const validation = validateMultidayEvent(
                    startDate,
                    startTime,
                    endDate,
                    endTime,
                    timezone,
                    event
                );
                if (!validation.valid) {
                    Object.assign(e, validation.errors);
                }
            } else {
                // Non-multiday event: start_date today or future, today requires +30min buffer
                const validation = validateNonMultidayEvent(
                    startDate,
                    startTime,
                    startDate, // for non-multiday, end date is same as start date
                    endTime,
                    timezone,
                    event
                );
                if (!validation.valid) {
                    Object.assign(e, validation.errors);
                }
            }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onPickLogoImage = (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setToast({ open: true, type: "error", msg: "Logo image size must be less than 5MB" });
            return;
        }
        setLogoImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setLocalLogoImagePreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const onPickCoverImage = (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setToast({ open: true, type: "error", msg: "Cover image size must be less than 5MB" });
            return;
        }
        setCoverImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setLocalCoverImagePreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const onPickWaitingRoomImage = (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setToast({ open: true, type: "error", msg: "Waiting room image size must be less than 5MB" });
            return;
        }
        setWaitingRoomImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setLocalWaitingRoomImagePreview(String(e.target?.result || ""));
        reader.readAsDataURL(file);
    };

    const submit = async () => {
        if (!event?.id) return;
        if (!validate()) return;
        setSubmitting(true);

        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("slug", slug.trim());
        fd.append("description", description);

        // Build location string and send separate fields
        if (format === "virtual") {
            // Virtual: send country as location string
            fd.append("location", (location || "").trim());
            fd.append("location_city", "");
            fd.append("location_country", (location || "").trim());
        } else {
            // In-person/hybrid: send city, country separately and build location string
            const cityName = (locationCity?.name || "").trim();
            const countryName = (locationCountry || "").trim();
            const locationStr = [cityName, countryName].filter(Boolean).join(", ");

            fd.append("location", locationStr);
            fd.append("location_city", cityName);
            fd.append("location_country", countryName);
            fd.append("venue_name", (venueName || "").trim());
            fd.append("venue_address", (venueAddress || "").trim());
        }

        fd.append("category", category);
        fd.append("format", format);
        // Paid events: price/label/max_participants managed via Product Management tab
        if (isFree) {
            fd.append("price", "0");
            fd.append("price_label", priceLabel.trim());
        } else {
            fd.append("price", "");         // null in DB — managed in Product Management
            fd.append("price_label", "");
        }
        fd.append("is_free", String(isFree));
        fd.append("registration_type", registrationType);
        if (cpdCpeMinutes === "") {
            fd.append("cpd_cpe_minutes", "");
        } else {
            fd.append("cpd_cpe_minutes", String(Number(cpdCpeMinutes)));
        }
        if (cpdCpeMinutesPerCredit === "") {
            fd.append("cpd_cpe_minutes_per_credit", "60");
        } else {
            fd.append("cpd_cpe_minutes_per_credit", String(Number(cpdCpeMinutesPerCredit)));
        }
        fd.append("show_cpd_cpe", String(showCpdCpe));
        // Paid events: max_participants managed in Product Management tab
        if (!isFree) {
            fd.append("max_participants", ""); // null in DB — managed in Product Management
        } else if (maxParticipants) {
            fd.append("max_participants", String(maxParticipants));
        } else {
            fd.append("max_participants", "");
        }
        fd.append("lounge_table_capacity", String(loungeTableCapacity || 4));
        fd.append("qna_ai_public_suggestions_enabled", String(qnaAiPublicSuggestionsEnabled));
        fd.append("pre_event_qna_enabled", String(preEventQnaEnabled));
        fd.append("timezone", timezone);
        fd.append("is_multi_day", String(isMultiDay));
        fd.append("start_time", combineToISO(startDate, startTime));
        fd.append("end_time", combineToISO(isMultiDay ? endDate : startDate, endTime));

        // Send replay publishing mode regardless of replay_available status
        const publishMode = autoPublish ? "auto_publish" : "manual_review";
        console.log("🔍 EditEventForm - Updating event with replay_publishing_mode:", publishMode, "autoPublish:", autoPublish);
        fd.append("replay_publishing_mode", publishMode);

        // Send replay update - explicitly send 'true'/'false' and duration (or empty string/null)
        if (replayAvailable) {
            fd.append("replay_available", "true");
            fd.append("replay_availability_duration", replayDuration.trim());
        } else {
            fd.append("replay_available", "false");
            fd.append("replay_availability_duration", "");
        }

        if (logoImageFile) fd.append("preview_image", logoImageFile, logoImageFile.name);
        if (coverImageFile) fd.append("cover_image", coverImageFile, coverImageFile.name);
        if (waitingRoomImageFile) fd.append("waiting_room_image", waitingRoomImageFile, waitingRoomImageFile.name);
        fd.append("waiting_room_enabled", String(waitingRoomEnabled));
        fd.append("lounge_enabled_waiting_room", String(waitingRoomLoungeAllowed));
        fd.append("networking_tables_enabled_waiting_room", String(waitingRoomNetworkingAllowed));
        if (waitingRoomAutoAdmitSeconds) {
            fd.append("auto_admit_seconds", String(waitingRoomAutoAdmitSeconds));
        }
        fd.append("waiting_room_grace_period_minutes", String(waitingRoomGracePeriodMinutes || "0"));

        // Send hours calculation session types (platform_admin only, will be validated on backend)
        fd.append("hours_calculation_session_types", JSON.stringify(hoursCalculationSessionTypes));

        // Send total hours override
        fd.append("has_total_hours_override", String(hasTotalHoursOverride));
        if (hasTotalHoursOverride && totalHoursOverrideMinutes) {
            fd.append("total_hours_override_minutes", String(totalHoursOverrideMinutes));
        }

        // Always send participants so backend can replace existing list (including clearing with []).
        const participantsData = participants.map((p, idx) => {
            const data = {
                type: p.participantType === "user" ? "staff" : p.participantType,
                role: p.role,
                display_order: idx,
                client_index: idx,
            };

            if (p.participantType === "guest") {
                data.name = p.guestName;
                data.email = p.guestEmail;
                data.bio = p.bio || "";
            } else if (p.participantType === "virtual") {
                data.virtual_speaker_id = p.virtualSpeakerId;
                data.bio = p.bio || "";
            } else {
                // staff or user
                data.user_id = p.userId;
                data.bio = p.bio || "";
            }

            return data;
        });

        // Backend expects JSON string for nested array
        fd.append("participants", JSON.stringify(participantsData));

        participants.forEach((p, idx) => {
            if (p?.imageFile) {
                fd.append(`participant_image_${idx}`, p.imageFile, p.imageFile.name || `participant_${idx}.jpg`);
            }
        });

        try {
            const res = await fetch(`${API_ROOT}/events/${event.id}/`, {
                method: "PATCH",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    // let browser set multipart boundary
                },
                body: fd,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.error("Request error response:", json); // Log full error to console
                const msg =
                    json?.detail ||
                    Object.entries(json)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join(" | ") ||
                    `HTTP ${res.status}`;
                throw new Error(msg);
            }
            onUpdated?.(json);
            setSavedSchedule({
                startISO: json?.start_time ? dayjs(json.start_time).toISOString() : toUTCISO(startDate, startTime, timezone),
                endISO: json?.end_time ? dayjs(json.end_time).toISOString() : toUTCISO(isMultiDay ? endDate : startDate, endTime, timezone),
                timezone: json?.timezone || timezone,
                isMultiDay: Boolean(json?.is_multi_day ?? isMultiDay),
            });

            const pendingCount = sessions.filter((s) => s._pending).length;
            const sessionsSaved = await flushPendingSessions();
            if (pendingCount > 0 && sessionsSaved) {
                setToast({ open: true, type: "success", msg: "Event updated and sessions saved" });
            } else if (pendingCount > 0 && !sessionsSaved) {
                setToast({ open: true, type: "error", msg: "Event updated but some sessions failed to save." });
            } else {
                setToast({ open: true, type: "success", msg: "Event updated" });
            }
            // onCancel?.(); // Don't close by default, let parent decide
        } catch (e) {
            setToast({ open: true, type: "error", msg: String(e?.message || e) });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ p: 2 }}>
                <Typography variant="h5" className="font-extrabold mb-4">Edit Event</Typography>

                <Typography variant="body2" className="text-slate-500 mb-4">
                    Update the fields and click Save.
                </Typography>

                <Box className="flex items-start mb-4">
                    <TextField
                        label="Name of the Event *"
                        value={title}
                        onChange={(e) => {
                            const v = e.target.value;
                            setTitle(v);
                            if (!slug || slug === slugifyLocal(title)) setSlug(slugifyLocal(v));
                        }}
                        fullWidth
                        error={!!errors.title}
                        helperText={errors.title}
                        className="mb-3"
                    />
                </Box>

                <TextField
                    label="Description *"
                    multiline minRows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth className="mb-3"
                    error={!!errors.description} helperText={errors.description}
                />

                <TextField
                    label="Slug *"
                    placeholder="enter-event-slug"
                    value={slug}
                    onChange={(e) => {
                        setSlug(sanitizeSlugInput(e.target.value));
                        setErrors((prev) => ({ ...prev, slug: "" }));
                    }}
                    fullWidth
                    className="mb-3"
                    error={!!errors.slug}
                    helperText={errors.slug || "Lowercase letters, numbers, underscores, special chars (@$&) allowed. No forward slashes."}
                />

                <TextField
                    label="Format"
                    select
                    value={format}
                    onChange={(e) => {
                        const next = e.target.value;
                        setFormat(next);
                        if (next === "virtual") {
                            setLocation("");
                            setLocationCity(null);
                            setLocationCountry("");
                            setVenueName("");
                            setVenueAddress("");
                            setErrors((prev) => ({ ...prev, location: "" }));
                        } else {
                            setLocation(null);
                            setErrors((prev) => ({ ...prev, location: "" }));
                        }
                    }}
                    fullWidth
                    className="mb-3"
                >
                    {formats.map((f) => (
                        <MenuItem key={f.value} value={f.value}>
                            {f.label}
                        </MenuItem>
                    ))}
                </TextField>

                {/* Replay Options - Only for Virtual/Hybrid (EDIT MODE) */}
                {(format === "virtual" || format === "hybrid") && (
                    <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
                        <Typography variant="h6" className="font-semibold mb-3">Replay Options</Typography>
                        <Stack direction="column" spacing={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={replayAvailable}
                                        onChange={(e) => setReplayAvailable(e.target.checked)}
                                    />
                                }
                                label="Replay will be available"
                                sx={{ m: 0 }}
                            />

                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={autoPublish}
                                            onChange={(e) => setAutoPublish(e.target.checked)}
                                        />
                                    }
                                    label="Auto Publish"
                                    sx={{
                                        m: 0,
                                        justifyContent: "flex-start",
                                        gap: 1.5,
                                        "& .MuiFormControlLabel-label": { marginLeft: 0 },
                                    }}
                                />
                                <Chip
                                    label={autoPublish ? "Auto Publish: ON" : "Auto Publish: OFF"}
                                    color={autoPublish ? "success" : "default"}
                                    variant={autoPublish ? "filled" : "outlined"}
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        minWidth: 150
                                    }}
                                />
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                                {autoPublish
                                    ? "✓ Recording will be automatically published to participants when ready"
                                    : "Recording will remain private until you manually publish it"}
                            </Typography>

                            {replayAvailable && (
                                <TextField
                                    select
                                    label="Available for"
                                    value={replayDuration}
                                    onChange={(e) => setReplayDuration(e.target.value)}
                                    size="small"
                                    sx={{ minWidth: 200 }}
                                >
                                    {[
                                        "7 Days",
                                        "14 Days",
                                        "30 Days",
                                        "60 Days",
                                        "90 Days",
                                        "6 Months",
                                        "1 Year",
                                        "Unlimited"
                                    ].map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </Stack>
                    </Paper>
                )}

                <Grid container spacing={3} columns={{ xs: 12, md: 12 }}>
                    {/* Left */}
                    <Grid item xs={12} md={12}>
                        {format === "virtual" ? (
                            <Autocomplete
                                size="small"
                                fullWidth
                                className="mb-3"
                                options={COUNTRY_OPTIONS}
                                autoHighlight
                                value={getSelectedCountry({ location })}
                                getOptionLabel={(opt) => opt?.label ?? ""}
                                isOptionEqualToValue={(o, v) => o.code === v.code}
                                onChange={(_, newVal) => {
                                    setLocation(newVal ? newVal.label : "");
                                    setErrors((prev) => ({ ...prev, location: "" }));
                                }}
                                ListboxProps={{
                                    style: {
                                        maxHeight: 36 * 7,
                                        overflowY: "auto",
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                    },
                                }}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.code}>
                                        <span style={{ marginRight: 8 }}>{option.emoji}</span>
                                        {option.label}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Country"
                                        placeholder="Select country"
                                        fullWidth
                                        error={!!errors.location}
                                        helperText={errors.location}
                                        inputProps={{
                                            ...params.inputProps,
                                            autoComplete: "new-password",
                                        }}
                                    />
                                )}
                            />
                        ) : (
                            <>
                                <CityAutocompleteOpenMeteo
                                    label="Location *"
                                    value={locationCity}
                                    onSelect={(city) => {
                                        setLocationCity(city);
                                        if (city?.country) {
                                            setLocationCountry(city.country);
                                        }
                                        setErrors((prev) => ({ ...prev, location: "" }));
                                    }}
                                    error={!!errors.location}
                                    helperText={errors.location}
                                />

                                {/* Country field - can be manually edited */}
                                <Box sx={{ mt: 2 }}>
                                    <Autocomplete
                                        size="small"
                                        fullWidth
                                        options={COUNTRY_OPTIONS}
                                        autoHighlight
                                        value={COUNTRY_OPTIONS.find((opt) => opt.label === locationCountry) || null}
                                        getOptionLabel={(opt) => opt?.label ?? ""}
                                        isOptionEqualToValue={(o, v) => o.code === v.code}
                                        onChange={(_, newVal) => {
                                            setLocationCountry(newVal ? newVal.label : "");
                                        }}
                                        ListboxProps={{
                                            style: {
                                                maxHeight: 36 * 7,
                                                overflowY: "auto",
                                                paddingTop: 0,
                                                paddingBottom: 0,
                                            },
                                        }}
                                        renderOption={(props, option) => (
                                            <li {...props} key={option.code}>
                                                <span style={{ marginRight: 8 }}>{option.emoji}</span>
                                                {option.label}
                                            </li>
                                        )}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Country"
                                                placeholder="Select country"
                                                fullWidth
                                                inputProps={{
                                                    ...params.inputProps,
                                                    autoComplete: "new-password",
                                                }}
                                            />
                                        )}
                                    />
                                </Box>

                                {/* Venue Name - Optional */}
                                <Box sx={{ mt: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Venue Name (Optional)"
                                        placeholder="e.g., Marriott Hotel, Tech Hub Office"
                                        value={venueName}
                                        onChange={(e) => setVenueName(e.target.value)}
                                        helperText="Hotel name, office building, or venue name"
                                    />
                                </Box>

                                {/* Venue Address - Optional and private */}
                                <Box sx={{ mt: 2 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Exact Address (Optional)"
                                        placeholder="e.g., 123 Main St, Suite 100"
                                        value={venueAddress}
                                        onChange={(e) => setVenueAddress(e.target.value)}
                                        multiline
                                        rows={2}
                                        helperText="🔒 Only visible to registered/accepted members"
                                    />
                                </Box>
                            </>
                        )}

                        <TextField
                            label="Category" select fullWidth
                            value={category} onChange={(e) => setCategory(e.target.value)}
                            sx={{ mt: 1 }}
                        >
                            {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>

                        <Box sx={{ mt: 3, mb: 3 }}>
                            <FormControlLabel
                                control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
                                label="Free Event (all users can register)"
                                sx={{ mb: 2 }}
                            />

                            {/* Paid Event: show helper message instead of price fields */}
                            {!isFree ? (
                                <Box sx={{
                                    p: 2.5,
                                    border: "1px solid #e3f2fd",
                                    borderRadius: 2,
                                    bgcolor: "#f0f7ff",
                                    mt: 2,
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 1.5,
                                }}>
                                    <Box sx={{ fontSize: 20, mt: 0.1 }}>💳</Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1565c0", mb: 0.5 }}>
                                            💳 Paid Event
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#1565c0" }}>
                                            Price, price label, and max participants are managed in the
                                            <strong> Product Management tab</strong>.
                                            The event must be <strong>published manually</strong> after price is configured.
                                        </Typography>
                                    </Box>
                                </Box>
                            ) : (
                                /* Free events: allow max participants */
                                <TextField
                                    label="Max Participants" type="number" fullWidth
                                    value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)}
                                    inputProps={{ min: 1, step: 1 }}
                                    helperText="Leave empty for unlimited"
                                    sx={{ mt: 2 }}
                                />
                            )}
                        </Box>

                        <TextField
                            label="Max Participants per Table (Social Lounge)" type="number" fullWidth
                            value={loungeTableCapacity} onChange={(e) => setLoungeTableCapacity(e.target.value)}
                            inputProps={{ min: 1, step: 1 }}
                            helperText="Default is 4"
                            sx={{ mt: 0.5, mb: 2 }}
                        />

                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                Registration Type
                            </Typography>
                            <TextField
                                select
                                fullWidth
                                value={registrationType}
                                onChange={(e) => setRegistrationType(e.target.value)}
                                helperText="Open: Users register instantly. Apply: Users submit applications for host approval."
                            >
                                <MenuItem value="open">Open Registration</MenuItem>
                                <MenuItem value="apply">Application Required (Users apply, host approves)</MenuItem>
                            </TextField>
                        </Box>

                        <Box sx={{ mt: 3, mb: 2, p: 2.5, border: "1px solid #e0e0e0", borderRadius: 2, bgcolor: "#fafafa" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                CPD/CPE Credits
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                                Credits are calculated as total eligible minutes divided by minutes per credit.
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Total eligible minutes"
                                        type="number"
                                        fullWidth
                                        value={cpdCpeMinutes}
                                        onChange={(e) => {
                                            setCpdCpeMinutes(e.target.value);
                                            setErrors((prev) => ({ ...prev, cpdCpeMinutes: "" }));
                                        }}
                                        inputProps={{ min: 1, step: 1 }}
                                        error={!!errors.cpdCpeMinutes}
                                        helperText={errors.cpdCpeMinutes || "Leave empty to hide CPD/CPE credits publicly"}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Minutes per credit"
                                        type="number"
                                        fullWidth
                                        value={cpdCpeMinutesPerCredit}
                                        onChange={(e) => {
                                            setCpdCpeMinutesPerCredit(e.target.value);
                                            setErrors((prev) => ({ ...prev, cpdCpeMinutesPerCredit: "" }));
                                        }}
                                        inputProps={{ min: 1, step: 1 }}
                                        error={!!errors.cpdCpeMinutesPerCredit}
                                        helperText={errors.cpdCpeMinutesPerCredit || "Default is 60"}
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                            {cpdCpeMinutes !== "" && Number(cpdCpeMinutes) > 0 && Number(cpdCpeMinutesPerCredit || 60) > 0 && (
                                <Typography variant="body2" sx={{ mt: 2, fontWeight: 600, color: "text.primary" }}>
                                    CPD/CPE Credits Preview: {(Number(cpdCpeMinutes) / Number(cpdCpeMinutesPerCredit || 60)).toFixed(2).replace(/\.?0+$/, "")} (calculated at {Number(cpdCpeMinutesPerCredit || 60)} minutes per credit)
                                </Typography>
                            )}
                            <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={showCpdCpe}
                                            onChange={(e) => setShowCpdCpe(e.target.checked)}
                                        />
                                    }
                                    label="Show CPD/CPE credits on event details and cards"
                                />
                            </Box>
                        </Box>

                    </Grid>

                    {/* Images Row - Three Equal Columns */}
                    <Box sx={{ mt: 3, width: '100%' }}>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                gap: 2,
                            }}
                        >
                            {/* Update Logo / Picture */}
                            <Box>
                                <Typography variant="subtitle1" className="font-semibold">Logo / Picture</Typography>
                                <Typography variant="caption" className="text-slate-500 block mb-2">
                                    Recommended 200x200px - Max 5 MB
                                </Typography>

                                <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                                    sx={{ height: 150, position: "relative", overflow: "hidden" }}>
                                    {localLogoImagePreview ? (
                                        <img src={localLogoImagePreview} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : logoImage ? (
                                        <img src={logoImage} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Stack alignItems="center" spacing={1}>
                                            <ImageRoundedIcon />
                                            <Typography variant="body2" className="text-slate-600">Logo / Picture</Typography>
                                        </Stack>
                                    )}
                                    <input id="edit-ev-logo-image-file" type="file" accept="image/*" style={{ display: "none" }}
                                        onChange={(e) => onPickLogoImage(e.target.files?.[0])} />
                                </Box>

                                <label htmlFor="edit-ev-logo-image-file">
                                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />} sx={{ mt: 1 }}>
                                        Upload Logo
                                    </Button>
                                </label>
                            </Box>

                            {/* Cover Image */}
                            <Box>
                                <Typography variant="subtitle1" className="font-semibold">Cover Image</Typography>
                                <Typography variant="caption" className="text-slate-500 block mb-2">
                                    Recommended 1280x720px - Max 5 MB
                                </Typography>

                                <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                                    sx={{ height: 150, position: "relative", overflow: "hidden" }}>
                                    {localCoverImagePreview ? (
                                        <img src={localCoverImagePreview} alt="cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : coverImage ? (
                                        <img src={coverImage} alt="cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Stack alignItems="center" spacing={1}>
                                            <ImageRoundedIcon />
                                            <Typography variant="body2" className="text-slate-600">Cover Image</Typography>
                                        </Stack>
                                    )}
                                    <input id="edit-ev-cover-image-file" type="file" accept="image/*" style={{ display: "none" }}
                                        onChange={(e) => onPickCoverImage(e.target.files?.[0])} />
                                </Box>

                                <label htmlFor="edit-ev-cover-image-file">
                                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />} sx={{ mt: 1 }}>
                                        Upload Cover
                                    </Button>
                                </label>
                            </Box>

                            {/* Waiting Room Image */}
                            <Box>
                                <Typography variant="subtitle1" className="font-semibold">Waiting Room</Typography>
                                <Typography variant="caption" className="text-slate-500 block mb-2">
                                    Recommended 1280x720px - Max 5 MB
                                </Typography>

                                <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                                    sx={{ height: 150, position: "relative", overflow: "hidden" }}>
                                    {localWaitingRoomImagePreview ? (
                                        <img src={localWaitingRoomImagePreview} alt="waiting room preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : waitingRoomImage ? (
                                        <img src={waitingRoomImage} alt="waiting room preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Stack alignItems="center" spacing={1}>
                                            <ImageRoundedIcon />
                                            <Typography variant="body2" className="text-slate-600">Waiting Room</Typography>
                                        </Stack>
                                    )}
                                    <input id="edit-ev-waiting-room-image-file" type="file" accept="image/*" style={{ display: "none" }}
                                        onChange={(e) => onPickWaitingRoomImage(e.target.files?.[0])} />
                                </Box>

                                <label htmlFor="edit-ev-waiting-room-image-file">
                                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />} sx={{ mt: 1 }}>
                                        Upload Waiting Room
                                    </Button>
                                </label>

                            </Box>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            mt: 2,
                            width: "100%",
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                            gap: 1.5,
                            alignItems: "center",
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={waitingRoomEnabled}
                                    onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
                                />
                            }
                            label="Enable Waiting Room"
                            sx={{
                                m: 0,
                                width: "100%",
                                justifyContent: "flex-start",
                                gap: 1.5,
                                "& .MuiFormControlLabel-label": { marginLeft: 0 },
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={waitingRoomLoungeAllowed}
                                    onChange={(e) => setWaitingRoomLoungeAllowed(e.target.checked)}
                                    disabled={!waitingRoomEnabled}
                                />
                            }
                            label="Allow Social Lounge while waiting"
                            sx={{
                                m: 0,
                                width: "100%",
                                justifyContent: "flex-start",
                                gap: 1.5,
                                "& .MuiFormControlLabel-label": { marginLeft: 0 },
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={waitingRoomNetworkingAllowed}
                                    onChange={(e) => setWaitingRoomNetworkingAllowed(e.target.checked)}
                                    disabled={!waitingRoomEnabled}
                                />
                            }
                            label="Allow Networking Tables while waiting"
                            sx={{
                                m: 0,
                                width: "100%",
                                justifyContent: "flex-start",
                                gap: 1.5,
                                "& .MuiFormControlLabel-label": { marginLeft: 0 },
                            }}
                        />
                        <TextField
                            label="Auto-admit after (seconds)"
                            size="small"
                            type="number"
                            value={waitingRoomAutoAdmitSeconds}
                            onChange={(e) => setWaitingRoomAutoAdmitSeconds(e.target.value)}
                            disabled={!waitingRoomEnabled}
                            fullWidth
                        />
                    </Box>

                    <TextField
                        label="Grace Period (minutes)"
                        type="number"
                        inputProps={{ min: "0", max: "1440", step: "1" }}
                        value={waitingRoomGracePeriodMinutes}
                        onChange={(e) => setWaitingRoomGracePeriodMinutes(e.target.value)}
                        disabled={!waitingRoomEnabled}
                        fullWidth
                        size="small"
                        sx={{ mt: 3 }}
                        helperText="Minutes after event start during which participants can join directly without waiting room approval"
                        InputProps={{
                            endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                        }}
                    />
                    {/* Dates */}
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={<Switch checked={isMultiDay} disabled={sessionsLoading} onChange={(e) => {
                                const v = e.target.checked;
                                if (!v && sessions.length > 0) {
                                    // Cannot convert to single-day when sessions exist — show dialog
                                    setShowSingleDayConversionDialog(true);
                                    return; // Don't change toggle
                                }
                                setIsMultiDay(v);
                                if (v) {
                                    // If switching to Multi-Day: Set Start Time to 00:00 and End Time to 23:59
                                    setSingleDayStartTime(startTime);
                                    setSingleDayEndTime(endTime);
                                    setStartTime("00:00");
                                    setEndTime("23:59");
                                    console.log("🕐 Multi-Day toggle ON (Edit): Set times to 00:00 - 23:59");
                                } else {
                                    // If switching to Single Day, restore original single-day times and force end date to equal start date
                                    setStartTime(singleDayStartTime);
                                    setEndTime(singleDayEndTime);
                                    setEndDate(startDate);
                                }
                            }} />}
                            label="Multi-day event?"
                        />
                    </Grid>

                    <Grid item xs={12} md={isMultiDay ? 6 : 12}>
                        <DatePicker
                            label={isMultiDay ? "Start Date" : "Date"}
                            value={startDateValue}
                            onChange={(newValue) => {
                                const v = newValue ? newValue.format("YYYY-MM-DD") : "";
                                setStartDate(v);
                                if (!isMultiDay) {
                                    setEndDate(v);
                                } else {
                                    if (endDate && v && endDate < v) {
                                        setEndDate(v);
                                        setEndTime("23:59");
                                        console.log("🕐 Auto-set End Date/Time to match Start Date for multi-day event (Edit)");
                                    }
                                    // Multi-day: auto-set start time to 00:00
                                    setStartTime("00:00");
                                    console.log("🕐 Auto-set Start Time to 00:00 for multi-day event (Edit)");
                                }
                            }}
                            format="DD/MM/YYYY"
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.startDate,
                                    helperText: errors.startDate,
                                    placeholder: "DD/MM/YYYY"
                                }
                            }}
                        />
                    </Grid>
                    {isMultiDay && (
                        <Grid item xs={12} md={6}>
                            <DatePicker
                                label="End Date"
                                value={endDateValue}
                                onChange={(newValue) => {
                                    const v = newValue ? newValue.format("YYYY-MM-DD") : "";
                                    setEndDate(v);
                                    // Auto-set end time to 23:59 for multi-day events
                                    if (isMultiDay) {
                                        setEndTime("23:59");
                                        console.log("🕐 Auto-set End Time to 23:59 for multi-day event (Edit)");
                                    }
                                }}
                                format="DD/MM/YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!errors.endDate,
                                        helperText: errors.endDate,
                                        placeholder: "DD/MM/YYYY"
                                    }
                                }}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Grid container spacing={3}>
                            {!isMultiDay && (
                                <>
                                    <Grid item xs={12} md={4}>
                                        <TimePicker
                                            label="Start time *" ampm minutesStep={1}
                                            disabled={isMultiDay}
                                            value={pickerValue(startTime)}
                                            onChange={(val) => {
                                                if (!val) return; // picker cleared — keep last valid time
                                                if (!val.isValid()) {
                                                    // Intermediate / incomplete input — show hint but don't crash
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        startTime: "Invalid time (use 1–12 in AM/PM).",
                                                    }));
                                                    return;
                                                }
                                                const newStart = val.second(0).format("HH:mm");
                                                setErrors((prev) => ({ ...prev, startTime: "" }));
                                                setStartTime(newStart);
                                                const next = computeEndFromStart(startDate, newStart, 1);
                                                const newEndDate = isMultiDay ? next.endDate : startDate;
                                                setEndDate(newEndDate);
                                                setEndTime(next.endTime);

                                                const checkStartDt = dayjs(`${startDate}T${newStart}:00`);
                                                const checkEndDt = dayjs(`${newEndDate}T${next.endTime}:00`);
                                                if (checkStartDt.isValid() && checkEndDt.isValid() && !checkEndDt.isAfter(checkStartDt)) {
                                                    setErrors((prev) => ({ ...prev, endTime: "End must be after start" }));
                                                } else {
                                                    setErrors((prev) => ({ ...prev, endTime: "" }));
                                                }
                                            }}
                                            slotProps={{ textField: { fullWidth: true, error: !!errors.startTime, helperText: errors.startTime } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TimePicker
                                            label="End time *" ampm minutesStep={1}
                                            disabled={isMultiDay}
                                            value={pickerValue(endTime)}
                                            onChange={(val) => {
                                                if (!val) return; // picker cleared — keep last valid time
                                                if (!val.isValid()) {
                                                    setErrors((prev) => ({
                                                        ...prev,
                                                        endTime: "Invalid time (use 1–12 in AM/PM).",
                                                    }));
                                                    return;
                                                }
                                                const newEnd = val.second(0).format("HH:mm");

                                                const startDt = dayjs(`${startDate}T${startTime}:00`);
                                                const usedEndDate = isMultiDay ? endDate : startDate;
                                                const endDt = dayjs(`${usedEndDate}T${newEnd}:00`);
                                                if (startDt.isValid() && endDt.isValid() && !endDt.isAfter(startDt)) {
                                                    setErrors((prev) => ({ ...prev, endTime: "End must be after start" }));
                                                } else {
                                                    setErrors((prev) => ({ ...prev, endTime: "" }));
                                                }

                                                setEndTime(newEnd);
                                            }}
                                            slotProps={{ textField: { fullWidth: true, error: !!errors.endTime, helperText: errors.endTime } }}
                                        />
                                    </Grid>
                                </>
                            )}

                            <Grid item xs={12} md={isMultiDay ? 12 : 4}>
                                <Stack spacing={1}>
                                    <Autocomplete
                                        fullWidth
                                        options={timezoneOptions}
                                        value={timezone}
                                        onChange={(_, newVal) => setTimezone(newVal || getBrowserTimezone())}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Event Timezone"
                                                helperText="Times are saved in this timezone."
                                            />
                                        )}
                                    />
                                    {isMultiDay && (
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                backgroundColor: "#f3f4f6",
                                                borderRadius: 1,
                                                border: "1px solid #e5e7eb"
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280" }}>
                                                User Time: {getBrowserTimezone()}
                                            </Typography>
                                            <Typography variant="caption" sx={{ display: "block", color: "#9ca3af", mt: 0.5 }}>
                                                Sessions will also display in your local timezone
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* ===== Sessions (Multi-day Events) ===== */}
                    {isMultiDay && (
                        <Box sx={{ width: "100%", flexBasis: "100%" }}>
                            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
                                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <CalendarMonthRoundedIcon color="action" />
                                        <Typography variant="h6" className="font-semibold">
                                            Sessions
                                        </Typography>
                                    </Stack>
                                    <Button
                                        size="small"
                                        startIcon={<AddRoundedIcon />}
                                        onClick={() => {
                                            setEditingSessionIndex(null);
                                            setSessionDialogOpen(true);
                                        }}
                                        disabled={sessionSubmitting}
                                        sx={{ backgroundColor: "#10b8a6", color: "white", "&:hover": { backgroundColor: "#0ea5a4" } }}
                                    >
                                        Add Session
                                    </Button>
                                </Stack>

                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    Break your multi-day event into individual sessions
                                </Typography>

                                {sessionsLoading ? (
                                    <Box sx={{ py: 2, textAlign: "center" }}>
                                        <CircularProgress size={20} />
                                    </Box>
                                ) : sessionsError ? (
                                    <Typography variant="body2" color="error" mb={2}>
                                        {sessionsError}
                                    </Typography>
                                ) : sessions.length > 0 ? (
                                    <Box mb={2}>
                                        <SessionList
                                            sessions={sessions}
                                            timezone={timezone}
                                            onMoveUp={(idx) => moveSession(idx, idx - 1)}
                                            onMoveDown={(idx) => moveSession(idx, idx + 1)}
                                            onSortByStartTime={sortSessionsByStartTime}
                                            disableReordering={sessionSubmitting}
                                            onEdit={(session, idx) => {
                                                setEditingSessionIndex(idx);
                                                setSessionDialogOpen(true);
                                            }}
                                            onDelete={(session, idx) => {
                                                deleteSession(session?.id, idx);
                                            }}
                                        />
                                    </Box>
                                ) : null}
                            </Paper>
                        </Box>
                    )}

                    {/* ===== Hours Calculation Settings (Platform Admin Only) ===== */}
                    {isMultiDay && currentUser?.is_superuser && (
                        <Box sx={{ width: "100%", flexBasis: "100%" }}>
                            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
                                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                    <Typography variant="h6" className="font-semibold">
                                        ⏱️ Hours Calculation
                                    </Typography>
                                    <Chip label="Admin Only" size="small" variant="outlined" color="info" />
                                </Stack>

                                <Typography variant="body2" color="text.secondary" mb={3}>
                                    Select which session types should count toward the total hours displayed on the event card.
                                </Typography>

                                <Stack direction="column" spacing={1}>
                                    {["main", "breakout", "workshop", "networking"].map((sessionType) => (
                                        <FormControlLabel
                                            key={sessionType}
                                            control={
                                                <Switch
                                                    checked={hoursCalculationSessionTypes.includes(sessionType)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setHoursCalculationSessionTypes(prev => [...prev, sessionType]);
                                                        } else {
                                                            setHoursCalculationSessionTypes(prev => prev.filter(t => t !== sessionType));
                                                        }
                                                    }}
                                                />
                                            }
                                            label={
                                                <span>
                                                    {sessionType === "main" && "📌 Main Sessions"}
                                                    {sessionType === "breakout" && "🔀 Breakout Sessions"}
                                                    {sessionType === "workshop" && "🛠️ Workshops"}
                                                    {sessionType === "networking" && "🤝 Networking Sessions"}
                                                </span>
                                            }
                                            sx={{ m: 0 }}
                                        />
                                    ))}
                                </Stack>

                                {hoursCalculationSessionTypes.length === 0 && (
                                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 2 }}>
                                        ⚠️ Select at least one session type for hours calculation
                                    </Typography>
                                )}

                                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #e5e7eb" }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={hasTotalHoursOverride}
                                                onChange={(e) => setHasTotalHoursOverride(e.target.checked)}
                                            />
                                        }
                                        label="Manually override total hours"
                                        sx={{ mb: 2 }}
                                    />
                                    {hasTotalHoursOverride && (
                                        <TextField
                                            fullWidth
                                            label="Total hours (minutes)"
                                            type="number"
                                            value={totalHoursOverrideMinutes}
                                            onChange={(e) => setTotalHoursOverrideMinutes(e.target.value)}
                                            inputProps={{ min: 0 }}
                                            helperText={
                                                totalHoursOverrideMinutes
                                                    ? `= ${(parseInt(totalHoursOverrideMinutes) / 60).toFixed(1)}h displayed`
                                                    : ""
                                            }
                                            sx={{ mb: 2 }}
                                        />
                                    )}
                                    <Typography variant="caption" color="text.secondary">
                                        {event?.calculated_hours_display ? (
                                            <>
                                                Calculated: <strong>{event.calculated_hours_display}</strong>
                                                {hasTotalHoursOverride && totalHoursOverrideMinutes ? (
                                                    <> → Override: <strong>{(parseInt(totalHoursOverrideMinutes) / 60).toFixed(1)}h</strong></>
                                                ) : (
                                                    ""
                                                )}
                                            </>
                                        ) : (
                                            "Add sessions to calculate total hours"
                                        )}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Box>
                    )}

                    {/* ===== Speakers & Hosts ===== */}
                    <Box sx={{ width: "100%", flexBasis: "100%" }}>
                        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <RecordVoiceOverRoundedIcon color="action" />
                                <Typography variant="h6" className="font-semibold">
                                    Speakers & Hosts
                                </Typography>
                            </Stack>

                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Add speakers, moderators, or hosts for this event
                            </Typography>

                            {participants.length > 0 && (
                                <Box mb={2}>
                                    <ParticipantList
                                        participants={participants}
                                        onEdit={(p, idx) => {
                                            setEditingParticipantIndex(idx);
                                            setParticipantDialogOpen(true);
                                        }}
                                        onRemove={(p, idx) => {
                                            setParticipants(prev => prev.filter((_, i) => i !== idx));
                                            setToast({ open: true, type: "success", msg: "Participant removed" });
                                        }}
                                        onReorder={(reorderedParticipants) => {
                                            setParticipants(reorderedParticipants);
                                        }}
                                    />
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={<AddRoundedIcon />}
                                onClick={() => {
                                    setEditingParticipantIndex(null);
                                    setParticipantDialogOpen(true);
                                }}
                                fullWidth
                            >
                                Add Participant
                            </Button>
                        </Paper>
                    </Box>
                </Grid>


                {/* ── Seed Questions Section ─────────────────────────────── */}
                {event?.id && (
                    <Box sx={{ mt: 4 }}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <QuizOutlinedIcon color="action" />
                                <Typography variant="h6" className="font-semibold">
                                    Seed Questions (Q&amp;A)
                                </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Pre-arrange questions that appear in the Q&amp;A feed when the event goes live.
                                Use an attribution label like <strong>Event Team</strong> or <strong>Dr. Smith</strong> instead of your name.
                                Speaker notes are private — only you see them.
                            </Typography>

                            <Box sx={{ mb: 2, p: 1, bgcolor: "rgba(156,123,255,0.08)", borderRadius: 1, border: "1px dashed rgba(156,123,255,0.3)" }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={qnaAiPublicSuggestionsEnabled}
                                            onChange={(e) => setQnaAiPublicSuggestionsEnabled(e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: "#9c7bff" },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#9c7bff" }
                                            }}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#9c7bff" }}>
                                                Enable AI Question Adoption
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Allow participants to adopt AI-generated questions.
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Box>

                            <Box sx={{ mb: 2, p: 1, bgcolor: "rgba(16,184,166,0.06)", borderRadius: 1, border: "1px dashed rgba(16,184,166,0.3)" }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={preEventQnaEnabled}
                                            onChange={(e) => setPreEventQnaEnabled(e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": { color: "#10b8a6" },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#10b8a6" }
                                            }}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#10b8a6" }}>
                                                Enable Pre-Event Q&A
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Allow registered attendees to submit questions before the event starts.
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ m: 0, width: "100%", justifyContent: "flex-start", gap: 1.5, "& .MuiFormControlLabel-label": { marginLeft: 0 } }}
                                />
                            </Box>

                            {/* Existing seed questions list */}
                            {seedLoading ? (
                                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                    <CircularProgress size={22} />
                                </Box>
                            ) : seedQuestions.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: "italic" }}>
                                    No seed questions yet.
                                </Typography>
                            ) : (
                                <Stack spacing={1.5} mb={2}>
                                    {seedQuestions.map((q) => (
                                        <Paper key={q.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "rgba(16,184,166,0.04)", borderColor: "rgba(16,184,166,0.25)" }}>
                                            {editingSeedId === q.id ? (
                                                <Stack spacing={1}>
                                                    <TextField
                                                        label="Question"
                                                        fullWidth size="small" multiline minRows={2}
                                                        value={editSeedContent}
                                                        onChange={(e) => setEditSeedContent(e.target.value)}
                                                    />
                                                    <TextField
                                                        label="Attribution label"
                                                        fullWidth size="small"
                                                        placeholder="e.g. Event Team, Dr. Smith, Host"
                                                        value={editSeedAttribution}
                                                        onChange={(e) => setEditSeedAttribution(e.target.value)}
                                                    />
                                                    <TextField
                                                        label="Speaker note (private)"
                                                        fullWidth size="small" multiline minRows={1}
                                                        placeholder="Reminder visible only to you"
                                                        value={editSeedNote}
                                                        onChange={(e) => setEditSeedNote(e.target.value)}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <Tooltip title="Only visible to you (the host)">
                                                                        <LockOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                                                                    </Tooltip>
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        <Button size="small" onClick={() => setEditingSeedId(null)}>Cancel</Button>
                                                        <Button
                                                            size="small" variant="contained"
                                                            startIcon={<SaveRoundedIcon />}
                                                            onClick={() => saveSeedEdit(q.id)}
                                                            sx={{ bgcolor: "#10b8a6", "&:hover": { bgcolor: "#0ea5a4" } }}
                                                        >
                                                            Save
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                            ) : (
                                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" mb={0.5}>
                                                            <Chip
                                                                label={q.attribution_label || "Event Team"}
                                                                size="small"
                                                                sx={{ fontSize: 11, height: 20, bgcolor: "rgba(16,184,166,0.12)", color: "#10b8a6", border: "1px solid rgba(16,184,166,0.3)" }}
                                                            />
                                                            <Chip label="SEED" size="small" sx={{ fontSize: 10, height: 18, fontWeight: 700, bgcolor: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }} />
                                                        </Stack>
                                                        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                                                            {q.content}
                                                        </Typography>
                                                        {q.speaker_note && (
                                                            <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                                                                <LockOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                                                    {q.speaker_note}
                                                                </Typography>
                                                            </Stack>
                                                        )}
                                                    </Box>
                                                    <Stack direction="row" spacing={0}>
                                                        <Tooltip title="Edit">
                                                            <IconButton size="small" onClick={() => {
                                                                setEditingSeedId(q.id);
                                                                setEditSeedContent(q.content);
                                                                setEditSeedAttribution(q.attribution_label || "");
                                                                setEditSeedNote(q.speaker_note || "");
                                                            }}>
                                                                <EditRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton size="small" color="error" onClick={() => deleteSeedQuestion(q.id)}>
                                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            )}
                                        </Paper>
                                    ))}
                                </Stack>
                            )}

                            {/* Add new seed question form */}
                            <Stack spacing={1.5}>
                                <TextField
                                    label="Question text"
                                    fullWidth size="small" multiline minRows={2}
                                    placeholder="e.g. What's the biggest challenge AI faces in diagnostics today?"
                                    value={newSeedContent}
                                    onChange={(e) => setNewSeedContent(e.target.value)}
                                />
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <TextField
                                        label="Attribution label"
                                        size="small" fullWidth
                                        placeholder="e.g. Event Team, Host, Dr. Smith"
                                        value={newSeedAttribution}
                                        onChange={(e) => setNewSeedAttribution(e.target.value)}
                                        helperText="Shown instead of your name"
                                    />
                                    <TextField
                                        label="Speaker note (private)"
                                        size="small" fullWidth
                                        placeholder="Private reminder, not visible to attendees"
                                        value={newSeedNote}
                                        onChange={(e) => setNewSeedNote(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Tooltip title="Only visible to you (the host)">
                                                        <LockOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                                                    </Tooltip>
                                                </InputAdornment>
                                            ),
                                        }}
                                        helperText="Only you can see this"
                                    />
                                </Stack>
                                <Box>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={addingSeed ? <CircularProgress size={14} /> : <AddRoundedIcon />}
                                        disabled={addingSeed || !newSeedContent.trim()}
                                        onClick={addSeedQuestion}
                                        sx={{ borderColor: "#10b8a6", color: "#10b8a6", "&:hover": { borderColor: "#0ea5a4", bgcolor: "rgba(16,184,166,0.06)" } }}
                                    >
                                        Add Seed Question
                                    </Button>
                                </Box>
                            </Stack>
                        </Paper>
                    </Box>
                )}

                <Box className="mt-6 flex justify-end gap-2">
                    {onCancel && <Button onClick={onCancel} className="rounded-xl" sx={{ textTransform: "none" }}>Cancel</Button>}
                    <Button
                        onClick={submit}
                        disabled={submitting}
                        variant="contained"
                        className="rounded-xl"
                        sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                    >
                        Save Changes
                    </Button>
                </Box>

                {/* Participant Form Dialog */}
                <ParticipantForm
                    open={participantDialogOpen}
                    onClose={() => {
                        setParticipantDialogOpen(false);
                        setEditingParticipantIndex(null);
                    }}
                    onSubmit={(participantData) => {
                        if (editingParticipantIndex !== null) {
                            // Edit existing
                            setParticipants(prev => prev.map((p, i) =>
                                i === editingParticipantIndex ? { ...p, ...participantData } : p
                            ));
                            setToast({ open: true, type: "success", msg: "Participant updated" });
                        } else {
                            // Add new
                            setParticipants(prev => [...prev, participantData]);
                            setToast({ open: true, type: "success", msg: "Participant added" });
                        }
                        setParticipantDialogOpen(false);
                        setEditingParticipantIndex(null);
                    }}
                    initialData={
                        editingParticipantIndex !== null
                            ? participants[editingParticipantIndex]
                            : null
                    }
                    existingParticipants={participants}
                />

                {/* Session Dialog */}
                <SessionDialog
                    open={sessionDialogOpen}
                    onClose={() => {
                        setSessionDialogOpen(false);
                        setEditingSessionIndex(null);
                    }}
                    onSubmit={async (sessionData) => {
                        await upsertSession(sessionData);
                        setSessionDialogOpen(false);
                        setEditingSessionIndex(null);
                    }}
                    initialData={
                        editingSessionIndex !== null
                            ? sessions[editingSessionIndex]
                            : null
                    }
                    eventStartTime={toUTCISO(startDate, startTime, timezone)}
                    eventEndTime={toUTCISO(endDate, endTime, timezone)}
                    timezone={timezone}
                    eventStartDate={startDate}
                    eventEndDate={endDate}
                    isMultiDay={isMultiDay}
                />

                {/* Multi-day to Single-day Conversion Confirmation Dialog */}
                <Dialog open={showSingleDayConversionDialog} onClose={() => setShowSingleDayConversionDialog(false)}>
                    <DialogTitle>Cannot Convert to Single-Day</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            To convert this event into a single-day event, you must first delete all existing sessions.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowSingleDayConversionDialog(false)} variant="contained">
                            OK
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={toast.open}
                    autoHideDuration={2800}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                >
                    <Alert
                        severity={toast.type === "error" ? "error" : "success"}
                        variant="filled"
                        onClose={() => setToast((t) => ({ ...t, open: false }))}
                    >
                        {toast.msg}
                    </Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
}
