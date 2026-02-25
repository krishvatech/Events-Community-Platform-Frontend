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
    IconButton,
    InputAdornment,
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
    slugifyLocal
} from "../utils/eventUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const categories = ["Workshop", "Strategy", "Legal", "Leadership", "Networking", "Q&A", "Live"];
const formats = [
    { value: "virtual", label: "Virtual" },
    { value: "in_person", label: "In person" },
    { value: "hybrid", label: "Hybrid" },
];

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
    const [location, setLocation] = useState(event?.location || "");
    const [category, setCategory] = useState(event?.category || "Workshop");
    const [format, setFormat] = useState(event?.format || "virtual");
    const [price, setPrice] = useState(
        typeof event?.price === "number" ? event.price : Number(event?.price || 0)
    );
    const [isFree, setIsFree] = useState(event?.is_free || false);
    const [maxParticipants, setMaxParticipants] = useState(event?.max_participants || "");
    const [loungeTableCapacity, setLoungeTableCapacity] = useState(event?.lounge_table_capacity || 4);


    const [isMultiDay, setIsMultiDay] = useState(() => {
        if (!initialStart || !initialEnd) return false;
        return initialStart.format("YYYY-MM-DD") !== initialEnd.format("YYYY-MM-DD");
    });
    const [startDate, setStartDate] = useState(initialStart.format("YYYY-MM-DD"));
    const [endDate, setEndDate] = useState(initialEnd.format("YYYY-MM-DD"));
    const [startTime, setStartTime] = useState(initialStart.format("HH:mm"));
    const [endTime, setEndTime] = useState(initialEnd.format("HH:mm"));
    // Store single-day times to restore when toggling back
    const [singleDayStartTime] = useState(initialStart.format("HH:mm"));
    const [singleDayEndTime] = useState(initialEnd.format("HH:mm"));

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

    const [replayAvailable, setReplayAvailable] = React.useState(false);
    const [replayDuration, setReplayDuration] = React.useState("");

    const normalizeParticipantsFromEvent = useCallback((eventPayload) => {
        const normalizedParticipants = [];
        const pushParticipant = (p = {}) => {
            const participantTypeRaw =
                p.participant_type ||
                p.participantType ||
                (p.user_id || p.userId || p.user ? "staff" : "guest");
            const participantType = String(participantTypeRaw || "guest").toLowerCase() === "staff" ? "staff" : "guest";
            const firstName = p.first_name || p.firstName || p.user?.first_name || "";
            const lastName = p.last_name || p.lastName || p.user?.last_name || "";
            const fullName = p.name || p.guestName || `${firstName} ${lastName}`.trim();
            const role = String(p.role || "speaker").toLowerCase();

            normalizedParticipants.push({
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
            });
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
        };
    }, []);

    useEffect(() => {
        // hydrate on open in case `event` changed
        const tz = event?.timezone || getBrowserTimezone();
        setTitle(event?.title || "");
        setSlug(event?.slug || "");
        setDescription(event?.description || "");
        setLocation(event?.location || "");
        setCategory(event?.category || "Workshop");
        setFormat((event?.format || "virtual").toLowerCase());
        setPrice(typeof event?.price === "number" ? event.price : Number(event?.price || 0));
        setIsFree(event?.is_free || false);
        setMaxParticipants(event?.max_participants || "");
        setLoungeTableCapacity(event?.lounge_table_capacity || 4);


        const start = event?.start_time ? dayjs(event.start_time).tz(tz) : dayjs();
        const end = event?.end_time ? dayjs(event.end_time).tz(tz) : start.add(2, "hour");
        setTimezone(tz);
        setIsMultiDay(start.format("YYYY-MM-DD") !== end.format("YYYY-MM-DD"));
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
                setSessions(data.map(normalizeSession));
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
    }, [event?.id, token, isMultiDay, normalizeSession]);

    const upsertSession = async (sessionData) => {
        if (!event?.id) return;
        setSessionSubmitting(true);
        setSessionsError("");
        try {
            const isEditing = editingSessionIndex !== null;
            const editingSession = isEditing ? sessions[editingSessionIndex] : null;
            const payload = {
                title: sessionData.title,
                description: sessionData.description || "",
                session_type: sessionData.sessionType || "main",
                start_time: sessionData.startTime,
                end_time: sessionData.endTime,
                session_date: dayjs(sessionData.startTime).format("YYYY-MM-DD"),
                display_order: isEditing
                    ? Number(editingSession?.displayOrder ?? editingSessionIndex ?? 0)
                    : sessions.length,
            };

            const url = isEditing
                ? `${API_ROOT}/events/${event.id}/sessions/${editingSession?.id}/`
                : `${API_ROOT}/events/${event.id}/sessions/`;
            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
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
                    return prev.map((item, idx) => (idx === editingSessionIndex ? savedSession : item));
                }
                return [...prev, savedSession];
            });
            setToast({ open: true, type: "success", msg: isEditing ? "Session updated" : "Session added" });
        } catch (err) {
            setSessionsError(err?.message || "Unable to save session");
            setToast({ open: true, type: "error", msg: err?.message || "Unable to save session" });
            throw err;
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

            setSessions((prev) => prev.filter((_, idx) => idx !== index));
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
        if (["in_person", "hybrid"].includes(format) && !location.trim()) e.location = "Required";
        if (!description.trim()) e.description = "Description is required";
        const priceValue = Number(price);
        if (!isFree) {
            if (price === "" || price === null || typeof price === "undefined") {
                e.price = "Price is required (or mark as free)";
            } else if (!Number.isFinite(priceValue)) {
                e.price = "Price must be a valid number";
            } else if (priceValue < 1) {
                e.price = "Price must be >= 1";
            }
        }

        // Validate time fields before comparing — never call dayjs.tz on invalid strings
        if (!isValidHHmm(startTime)) {
            e.startTime = "Invalid start time (use 1–12 in AM/PM).";
        }
        if (!isValidHHmm(endTime)) {
            e.endTime = "Invalid end time (use 1–12 in AM/PM).";
        }

        if (!e.startTime && !e.endTime && startDate && endDate) {
            // Both times are valid — safe to use toUTCISO for comparison
            const sISO = toUTCISO(startDate, startTime, timezone);
            const edISO = toUTCISO(isMultiDay ? endDate : startDate, endTime, timezone);
            if (sISO && edISO && !dayjs(edISO).isAfter(dayjs(sISO))) {
                e.endTime = "End must be after start";
                e.endDate = "End must be after start";
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
        fd.append("location", location.trim());
        fd.append("category", category);
        fd.append("format", format);
        fd.append("price", String(isFree ? 0 : (price ?? 0)));
        fd.append("is_free", String(isFree));
        if (maxParticipants) {
            fd.append("max_participants", String(maxParticipants));
        } else {
            fd.append("max_participants", "");
        }
        fd.append("lounge_table_capacity", String(loungeTableCapacity || 4));
        fd.append("timezone", timezone);
        fd.append("start_time", combineToISO(startDate, startTime));
        fd.append("end_time", combineToISO(isMultiDay ? endDate : startDate, endTime));

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

        // Add participants if any
        if (participants.length > 0) {
            const participantsData = participants.map((p, idx) => ({
                type: p.participantType,
                user_id: p.participantType === "staff" ? p.userId : undefined,
                role: p.role,
                name: p.participantType === "guest" ? p.guestName : undefined,
                email: p.participantType === "guest" ? p.guestEmail : undefined,
                bio: p.bio || "",
                display_order: idx,
                client_index: idx,
            }));

            // Backend expects JSON string for nested array
            fd.append("participants", JSON.stringify(participantsData));

            participants.forEach((p, idx) => {
                if (p?.imageFile) {
                    fd.append(`participant_image_${idx}`, p.imageFile, p.imageFile.name || `participant_${idx}.jpg`);
                }
            });

        }

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
            setToast({ open: true, type: "success", msg: "Event updated" });
            // onCancel?.(); // Don't close by default, let parent decide
        } catch (e) {
            setToast({ open: true, type: "error", msg: String(e?.message || e) });
        } finally {
            setSubmitting(false);
        }
    };

    return (
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
                    setSlug(slugifyLocal(e.target.value));
                    setErrors((prev) => ({ ...prev, slug: "" }));
                }}
                fullWidth
                className="mb-3"
                error={!!errors.slug}
                helperText={errors.slug || "Use lowercase letters, numbers, and hyphens."}
            />

            <TextField
                label="Format"
                select
                value={format}
                onChange={(e) => {
                    const next = e.target.value;
                    setFormat(next);
                    if (next === "virtual") {
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
                    <Stack direction="row" spacing={3} alignItems="center">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={replayAvailable}
                                    onChange={(e) => setReplayAvailable(e.target.checked)}
                                />
                            }
                            label="Replay will be available"
                        />
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
                        <TextField
                            label="Location *"
                            value={location}
                            onChange={(e) => {
                                setLocation(e.target.value);
                                setErrors((prev) => ({ ...prev, location: "" }));
                            }}
                            fullWidth
                            className="mb-3"
                            error={!!errors.location}
                            helperText={errors.location || "City & country, or full address"}
                        />
                    )}

                    <TextField
                        label="Category" select fullWidth
                        value={category} onChange={(e) => setCategory(e.target.value)}
                        sx={{ mt: 1 }}
                    >
                        {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>

                    <Box sx={{ mt: 3, mb: 1 }}>
                        <FormControlLabel
                            control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
                            label="Free Event (all users can register)"
                        />
                    </Box>

                    <TextField
                        label="Price ($)" type="number" fullWidth
                        value={price} onChange={(e) => setPrice(e.target.value)}
                        inputProps={{ min: 0, step: "0.01" }}
                        error={!!errors.price} helperText={errors.price}
                        disabled={isFree}
                        sx={{ mt: 0.5, mb: 2 }}
                    />

                    <TextField
                        label="Max Participants" type="number" fullWidth
                        value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        helperText="Leave empty for unlimited"
                        sx={{ mt: 0.5, mb: 2 }}
                    />

                    <TextField
                        label="Max Participants per Table (Social Lounge)" type="number" fullWidth
                        value={loungeTableCapacity} onChange={(e) => setLoungeTableCapacity(e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        helperText="Default is 4"
                        sx={{ mt: 0.5, mb: 2 }}
                    />

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
                        control={<Switch checked={isMultiDay} onChange={(e) => {
                            const v = e.target.checked;
                            setIsMultiDay(v);
                            if (v) {
                                // If switching to Multi-Day, set Start Time to 10 minutes ahead of current time in selected timezone
                                // and End Time to 12:00 AM
                                try {
                                    const currentTimeInTz = dayjs().tz(timezone || 'UTC');
                                    const startTimeInTz = currentTimeInTz.add(10, 'minutes').second(0).millisecond(0);
                                    const startTimeStr = startTimeInTz.format("HH:mm");
                                    setStartTime(startTimeStr);
                                    setEndTime("00:00");
                                    console.log("🕐 Multi-Day toggle ON (Edit): Set Start Time to current time + 10 minutes", {
                                        timezone,
                                        currentTime: currentTimeInTz.format("YYYY-MM-DD HH:mm:ss"),
                                        startTime: startTimeStr,
                                        startTimeFullISO: startTimeInTz.format("YYYY-MM-DD HH:mm:ss"),
                                    });
                                } catch (error) {
                                    console.error("❌ Error calculating start time (Edit):", error);
                                    // Fallback to current local time if timezone calculation fails
                                    const currentTime = dayjs().add(10, 'minutes').second(0).millisecond(0);
                                    setStartTime(currentTime.format("HH:mm"));
                                    setEndTime("00:00");
                                }
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
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label={isMultiDay ? "Start Date" : "Date"}
                            value={startDate ? dayjs(startDate) : null}
                            onChange={(newValue) => {
                                const v = newValue ? newValue.format("YYYY-MM-DD") : "";
                                setStartDate(v);
                                if (!isMultiDay) setEndDate(v);
                            }}
                            format="DD/MM/YYYY"
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.startDate,
                                    helperText: errors.startDate
                                }
                            }}
                        />
                    </LocalizationProvider>
                </Grid>
                {isMultiDay && (
                    <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="End Date"
                                value={endDate ? dayjs(endDate) : null}
                                onChange={(newValue) => setEndDate(newValue ? newValue.format("YYYY-MM-DD") : "")}
                                format="DD/MM/YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: !!errors.endDate,
                                        helperText: errors.endDate
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>
                )}

                <Grid item xs={12}>
                    <Grid container spacing={3}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                        </LocalizationProvider>

                        <Grid item xs={12} md={isMultiDay ? 12 : 4}>
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
                            i === editingParticipantIndex ? participantData : p
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
            />


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
    );
}
