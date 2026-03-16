import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Button,
    Container,
    Typography,
    Paper,
    Divider,
    Grid,
    Chip,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tab,
    Tabs,
    CircularProgress,
    IconButton,
    Pagination,
    Skeleton,
    LinearProgress,
    Tooltip,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VerifiedIcon from "@mui/icons-material/Verified";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { resolveRecordingUrl } from "../utils/recordingUrl";

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000")
    .toString()
    .replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;

const getTokenHeader = () => {
    const t =
        localStorage.getItem("access_token") ||
        localStorage.getItem("access") ||
        localStorage.getItem("jwt");
    return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmtDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const isVerifiedStatus = (raw) => {
    const v = String(raw || "").toLowerCase();
    return v === "approved" || v === "verified";
};

export default function AdminRecordingDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [error, setError] = useState("");
    const [filterTab, setFilterTab] = useState(0); // 0=All, 1=Joined Live, 2=Watched Replay, 3=Did Not Attend

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PER_PAGE = 5;

    // --- Upload Replay State ---
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // --- Notification Preview State ---
    const [notifPreview, setNotifPreview] = useState(null);
    const [notifLoading, setNotifLoading] = useState(false);
    const [sendingNotifs, setSendingNotifs] = useState(false);
    const [notifSent, setNotifSent] = useState(false);

    // --- Attendance Category Filter State (for Replay Notifications section) ---
    const [notificationAttendanceFilter, setNotificationAttendanceFilter] = useState("all"); // all, noshow, partial, full
    const [allRegistrations, setAllRegistrations] = useState([]); // Store ALL registrations for attendance filtering

    // Fetch all registrations when in attendance filter mode
    useEffect(() => {
        let alive = true;

        // Only fetch all registrations when attendance filter is active
        if (notificationAttendanceFilter !== "all" && event?.replay_available) {
            const loadAllRegistrations = async () => {
                setListLoading(true);
                try {
                    const url = new URL(`${API}/events/${id}/registrations/`);
                    url.searchParams.set("limit", 1000); // Fetch all registrations

                    const res = await fetch(url.toString(), {
                        headers: getTokenHeader(),
                    });

                    if (res.ok) {
                        const json = await res.json();
                        const regData = json.results || (Array.isArray(json) ? json : []);
                        if (alive) {
                            setAllRegistrations(regData);
                        }
                    }
                } catch (err) {
                    console.warn("Could not load all registrations:", err);
                } finally {
                    if (alive) setListLoading(false);
                }
            };
            loadAllRegistrations();
        }

        return () => {
            alive = false;
        };
    }, [notificationAttendanceFilter, event?.replay_available, id]);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                // Only show full page skeleton if we don't have event data yet
                if (!event) setLoading(true);
                else setListLoading(true);

                // 1. Get Event Details (only if not loaded, or separate this logic)
                // For simplicity, we keep updating it to ensure freshness, but we won't block UI if already present
                let evData = event;
                if (!event) {
                    const resEv = await fetch(`${API}/events/${id}/`, {
                        headers: getTokenHeader(),
                    });
                    if (!resEv.ok) throw new Error("Failed to load event details");
                    evData = await resEv.json();
                }

                // 2. Get Registrations with pagination & filter
                const offset = (page - 1) * PER_PAGE;
                const url = new URL(`${API}/events/${id}/registrations/`);
                url.searchParams.set("limit", PER_PAGE);
                url.searchParams.set("offset", offset);

                // Apply filterTab status filter for the main list (ONLY if not using attendance filter)
                if (notificationAttendanceFilter === "all") {
                    if (filterTab === 1) url.searchParams.set("status", "joined_live");
                    if (filterTab === 2) url.searchParams.set("status", "watched_replay");
                    if (filterTab === 3) url.searchParams.set("status", "did_not_attend");
                }

                const resReg = await fetch(url.toString(), {
                    headers: getTokenHeader(),
                });

                let regData = [];
                let totalCount = 0;

                if (resReg.ok) {
                    const json = await resReg.json();
                    if (json.results) {
                        regData = json.results;
                        totalCount = json.count;
                    } else {
                        // fallback if not paginated structure
                        regData = Array.isArray(json) ? json : [];
                        totalCount = regData.length;
                    }
                } else {
                    console.warn("Could not load registrations or permission denied");
                }

                if (alive) {
                    setEvent(evData);
                    setRegistrations(regData);
                    setTotalPages(Math.ceil(totalCount / PER_PAGE));
                }
            } catch (err) {
                if (alive) setError(err.message);
            } finally {
                if (alive) {
                    setLoading(false);
                    setListLoading(false);
                }
            }
        };
        load();
        return () => {
            alive = false;
        };
    }, [id, page, filterTab, notificationAttendanceFilter]);

    // Load notification preview when replay becomes available
    useEffect(() => {
        if (event?.replay_available) {
            loadNotifPreview();
        }
    }, [event?.replay_available]);

    // Reset page to 1 when filter changes
    const handleTabChange = (e, newValue) => {
        setFilterTab(newValue);
        setPage(1);
    };

    // Handle attendance filter selection (completely independent from main tabs)
    const handleAttendanceFilterChange = (category) => {
        setNotificationAttendanceFilter(notificationAttendanceFilter === category ? "all" : category);
    };

    const handleExport = async () => {
        try {
            const res = await fetch(`${API}/events/${id}/export-registrations/`, {
                headers: getTokenHeader(),
            });
            if (!res.ok) throw new Error("Failed to export CSV");

            // Try to get filename from header
            let filename = `Event_${id}_details.csv`;
            const disposition = res.headers.get('Content-Disposition');
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            } else {
                // Fallback: use event title if available
                if (event?.title) {
                    filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}_details.csv`;
                }
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert(e.message);
        }
    };

    const handleDownloadVideo = async () => {
        const recordingUrl = event?.recording_url;
        if (!recordingUrl) return;

        try {
            const res = await fetch(`${API}/events/download-recording/`, {
                method: "POST",
                headers: { ...getTokenHeader(), "Content-Type": "application/json" },
                body: JSON.stringify({ recording_url: recordingUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to get download URL");
            window.open(data.download_url, "_blank");
        } catch (err) {
            console.error("Download failed:", err);
            alert(`Failed to download recording: ${err.message}`);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
        if (!allowed.includes(file.type)) {
            setUploadError("Unsupported file type. Please upload an MP4, WebM, MOV, or AVI file.");
            return;
        }
        setUploadFile(file);
        setUploadError("");
        setUploadSuccess(false);
    };

    const handleUploadReplay = async () => {
        if (!uploadFile) return;
        setUploading(true);
        setUploadProgress(0);
        setUploadError("");

        try {
            // Step 1: Get presigned PUT URL from backend
            const urlRes = await fetch(`${API}/events/${id}/generate-replay-upload-url/`, {
                method: "POST",
                headers: { ...getTokenHeader(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: uploadFile.name,
                    content_type: uploadFile.type,
                }),
            });
            const urlData = await urlRes.json();
            if (!urlRes.ok) throw new Error(urlData?.error || "Failed to get upload URL");

            const { upload_url, s3_key, content_type } = urlData;

            // Step 2: Upload directly to S3 via XMLHttpRequest (for progress tracking)
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", upload_url, true);
                xhr.setRequestHeader("Content-Type", content_type);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error(`S3 upload failed: HTTP ${xhr.status}`));
                };
                xhr.onerror = () => reject(new Error("Network error during S3 upload"));
                xhr.send(uploadFile);
            });

            // Step 3: Confirm upload with backend (no auto-notify — let host choose)
            const confirmRes = await fetch(`${API}/events/${id}/confirm-replay-upload/`, {
                method: "POST",
                headers: { ...getTokenHeader(), "Content-Type": "application/json" },
                body: JSON.stringify({ s3_key, send_notifications: false }),
            });
            const confirmData = await confirmRes.json();
            if (!confirmRes.ok) throw new Error(confirmData?.error || "Failed to confirm upload");

            setUploadSuccess(true);
            setUploadProgress(100);
            // Refresh event data to show new recording
            setEvent((prev) => ({
                ...prev,
                recording_url: s3_key,
                replay_available: true,
            }));

            // Load notification preview
            await loadNotifPreview();
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const loadNotifPreview = async () => {
        setNotifLoading(true);
        try {
            const res = await fetch(`${API}/events/${id}/send-replay-notifications/`, {
                headers: getTokenHeader(),
            });
            if (res.ok) {
                const data = await res.json();
                setNotifPreview(data);
            }
        } catch (err) {
            console.warn("Could not load notification preview:", err);
        } finally {
            setNotifLoading(false);
        }
    };

    const handleSendNotifications = async (force = false) => {
        setSendingNotifs(true);
        try {
            const res = await fetch(`${API}/events/${id}/send-replay-notifications/`, {
                method: "POST",
                headers: { ...getTokenHeader(), "Content-Type": "application/json" },
                body: JSON.stringify({ force }),
            });
            const data = await res.json();
            if (!res.ok && res.status !== 409)
                throw new Error(data?.error || "Failed to send notifications");
            setNotifSent(true);
            setNotifPreview(data);
        } catch (err) {
            alert(`Failed to send notifications: ${err.message}`);
        } finally {
            setSendingNotifs(false);
        }
    };

    // Helper function to determine attendance category
    // Note: The backend now calculates this in the serializer, but we also support client-side calculation
    const getAttendanceCategory = (registration) => {
        // If the backend already calculated it, use that
        if (registration.attendance_category) {
            return registration.attendance_category;
        }

        // Fallback client-side calculation
        if (!registration.joined_live) {
            return "noshow"; // No Attendees
        }

        // Without duration info, mark as partial
        return "partial"; // Partial Attendee
    };

    // Filter registrations for Replay Notification section
    // This is completely independent from the main participant list
    const replayNotificationFilteredList = useMemo(() => {
        if (notificationAttendanceFilter === "all") {
            return [];
        }

        // Use allRegistrations when attendance filter is active
        const sourceList = allRegistrations.length > 0 ? allRegistrations : [];

        return sourceList.filter((reg) => {
            const category = getAttendanceCategory(reg);
            return category === notificationAttendanceFilter;
        });
    }, [allRegistrations, notificationAttendanceFilter]);


    const stats = useMemo(() => {
        return {
            total: registrations.length,
            joinedLive: registrations.filter((r) => r.joined_live).length,
            watchedReplay: registrations.filter((r) => r.watched_replay).length,
            didNotAttend: registrations.filter((r) => !r.joined_live && !r.watched_replay).length,
        };
    }, [registrations]);

    const hasRec = !!event?.recording_url;
    const recordingSrc = hasRec
        ? resolveRecordingUrl(event.recording_url)
        : null;

    const handleBack = () => {
        if (location.state?.from === "admin") {
            // Came from Admin Events page
            navigate("/admin/events");
        } else {
            // Default behavior
            navigate("/admin/recordings?scope=host");
        }
    };

    return (
        <Container maxWidth="xl" className="py-8">
            {/* Header */}
            <Box className="flex items-center gap-4 mb-6">
                <IconButton onClick={handleBack}>
                    <ArrowBackRoundedIcon />
                </IconButton>
                <Box>

                    <Typography variant="h5" className="font-bold">
                        {event?.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" className="flex items-center gap-1">
                        <CalendarMonthIcon fontSize="inherit" />
                        {fmtDate(event?.start_time)}
                    </Typography>
                </Box>
                <Box className="ml-auto">
                    <Button
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        onClick={handleExport}
                    >
                        Export CSV
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Left Col: Video & Info */}
                <Grid item xs={12} md={7} lg={8}>
                    <Paper className="rounded-2xl overflow-hidden border border-slate-200 mb-6" elevation={0}>
                        {hasRec ? (
                            <Box sx={{ aspectRatio: "16/9", bgcolor: "black", position: "relative" }}>
                                <video
                                    src={recordingSrc}
                                    controls
                                    style={{ width: "100%", height: "100%" }}
                                />
                            </Box>
                        ) : (
                            <Box className="p-10 text-center bg-slate-100">
                                <Typography color="text.secondary">No recording available</Typography>
                            </Box>
                        )}
                        {hasRec && (
                            <Box className="p-3 flex justify-end bg-slate-50 border-t border-slate-200">
                                <Button startIcon={<DownloadRoundedIcon />} onClick={handleDownloadVideo}>Download Video</Button>
                            </Box>
                        )}
                    </Paper>

                    {/* --- Upload Replay Section --- */}
                    <Paper elevation={0} className="border border-slate-200 rounded-2xl p-5 mb-6">
                        <Typography variant="subtitle1" className="font-semibold mb-3">
                            Upload Edited Replay
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="mb-3">
                            Upload an edited version of the recording (MP4, WebM, MOV).
                            Large files upload directly to storage without passing through the server.
                        </Typography>

                        <Box className="flex items-center gap-3 mb-3">
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUploadRoundedIcon />}
                                disabled={uploading}
                            >
                                {uploadFile ? uploadFile.name : "Choose Video File"}
                                <input
                                    type="file"
                                    hidden
                                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                                    onChange={handleFileSelect}
                                />
                            </Button>
                            {uploadFile && !uploading && !uploadSuccess && (
                                <Button
                                    variant="contained"
                                    onClick={handleUploadReplay}
                                >
                                    Upload Replay
                                </Button>
                            )}
                        </Box>

                        {uploading && (
                            <Box className="mb-2">
                                <LinearProgress variant="determinate" value={uploadProgress} />
                                <Typography variant="caption" color="text.secondary">
                                    Uploading... {uploadProgress}%
                                </Typography>
                            </Box>
                        )}

                        {uploadError && (
                            <Typography color="error" variant="body2">{uploadError}</Typography>
                        )}

                        {uploadSuccess && (
                            <Typography color="success.main" variant="body2">
                                Replay uploaded successfully. The recording has been updated.
                            </Typography>
                        )}
                    </Paper>

                    {/* --- Message: Upload replay before notifications --- */}
                    {event?.replay_available && !notifPreview?.visible_to_participants && (
                        <Paper elevation={0} className="border border-blue-200 bg-blue-50 rounded-2xl p-4 mb-6">
                            <Box className="flex items-center gap-2">
                                <CloudUploadRoundedIcon color="primary" />
                                <Typography variant="body2" color="primary">
                                    Upload your edited replay above to make it visible to participants and send notifications.
                                </Typography>
                            </Box>
                        </Paper>
                    )}

                    {/* --- Notification Preview & Send --- */}
                    {event?.replay_available && notifPreview?.visible_to_participants && (
                        <Paper elevation={0} className="border border-slate-200 rounded-2xl p-5 mb-6">
                            <Box className="flex items-center justify-between mb-3">
                                <Typography variant="subtitle1" className="font-semibold">
                                    Replay Notifications
                                </Typography>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={loadNotifPreview}
                                    disabled={notifLoading}
                                >
                                    Refresh Preview
                                </Button>
                            </Box>

                            {notifLoading && <CircularProgress size={24} />}

                            {notifPreview && !notifLoading && (
                                <>
                                    <Box className="mb-4">
                                        <Typography variant="body2" color="text.secondary" className="mb-2">
                                            Filter participants by attendance type:
                                        </Typography>
                                        <Box className="flex gap-2 mb-3 flex-wrap">
                                            <Tooltip title="Registered but never joined the webinar">
                                                <Chip
                                                    label={`${notifPreview.noshow_count} No Attendees`}
                                                    color="error"
                                                    variant={notificationAttendanceFilter === "noshow" ? "filled" : "outlined"}
                                                    size="small"
                                                    onClick={() => handleAttendanceFilterChange("noshow")}
                                                    sx={{ cursor: "pointer" }}
                                                />
                                            </Tooltip>
                                            <Tooltip title="Joined but left before the event ended or attended less than 80%">
                                                <Chip
                                                    label={`${notifPreview.partial_count} Partial Attendees`}
                                                    color="warning"
                                                    variant={notificationAttendanceFilter === "partial" ? "filled" : "outlined"}
                                                    size="small"
                                                    onClick={() => handleAttendanceFilterChange("partial")}
                                                    sx={{ cursor: "pointer" }}
                                                />
                                            </Tooltip>
                                            <Tooltip title="Joined and stayed for 80% or more of the event">
                                                <Chip
                                                    label={`${notifPreview.full_count} Full Attendees`}
                                                    color="success"
                                                    variant={notificationAttendanceFilter === "full" ? "filled" : "outlined"}
                                                    size="small"
                                                    onClick={() => handleAttendanceFilterChange("full")}
                                                    sx={{ cursor: "pointer" }}
                                                />
                                            </Tooltip>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {notificationAttendanceFilter === "all"
                                                ? `${notifPreview.total_to_notify} participants will receive an email + in-app notification.`
                                                : `Showing ${notificationAttendanceFilter === "noshow" ? "no attendees" : notificationAttendanceFilter === "partial" ? "partial attendees" : "full attendees"}`
                                            }
                                        </Typography>
                                        {notifPreview.already_sent && (
                                            <Typography variant="body2" color="warning.main" className="mt-2">
                                                ⚠️ Notifications were already sent on {new Date(notifPreview.sent_at).toLocaleString()}.
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Filtered Participant List for Replay Notifications */}
                                    {notificationAttendanceFilter !== "all" && (
                                        <Paper elevation={0} className="border border-blue-100 bg-blue-50 rounded-xl p-3 mb-4">
                                            <Typography variant="subtitle2" className="font-semibold mb-3 text-blue-900">
                                                📋 {notificationAttendanceFilter === "noshow" ? "No Attendees" : notificationAttendanceFilter === "partial" ? "Partial Attendees" : "Full Attendees"} ({replayNotificationFilteredList.length})
                                            </Typography>
                                            <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                                                {replayNotificationFilteredList.length === 0 ? (
                                                    <Typography variant="caption" color="text.secondary">
                                                        No participants in this category.
                                                    </Typography>
                                                ) : (
                                                    <Box className="space-y-2">
                                                        {replayNotificationFilteredList.map((reg) => (
                                                            <Box
                                                                key={reg.id}
                                                                className="flex items-center justify-between p-2 bg-white rounded border border-blue-100 hover:border-blue-300"
                                                            >
                                                                <Box className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <Avatar src={reg.user_avatar_url} sx={{ width: 28, height: 28 }}>
                                                                        {(reg.user_name?.[0] || "U").toUpperCase()}
                                                                    </Avatar>
                                                                    <Box className="min-w-0">
                                                                        <Typography variant="subtitle2" className="leading-tight truncate text-sm">
                                                                            {reg.user_name}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary" className="truncate">
                                                                            {reg.user_email}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                                <Chip
                                                                    label={
                                                                        reg.attendance_category === "noshow"
                                                                            ? "No Attendee"
                                                                            : reg.attendance_category === "partial"
                                                                                ? "Partial"
                                                                                : "Full"
                                                                    }
                                                                    size="small"
                                                                    color={
                                                                        reg.attendance_category === "noshow"
                                                                            ? "error"
                                                                            : reg.attendance_category === "partial"
                                                                                ? "warning"
                                                                                : "success"
                                                                    }
                                                                    variant="outlined"
                                                                    sx={{ height: 20, fontSize: "0.65rem", flexShrink: 0 }}
                                                                />
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Paper>
                                    )}

                                    <Box className="flex gap-2">
                                        <Button
                                            variant="contained"
                                            startIcon={<NotificationsRoundedIcon />}
                                            onClick={() => handleSendNotifications(false)}
                                            disabled={
                                                sendingNotifs ||
                                                notifSent ||
                                                (notifPreview?.already_sent && !notifSent)
                                            }
                                        >
                                            {sendingNotifs ? "Sending..." : notifSent ? "Sent!" : "Send Notifications"}
                                        </Button>
                                    </Box>
                                </>
                            )}

                            {!notifPreview && !notifLoading && (
                                <Button variant="text" onClick={loadNotifPreview} startIcon={<NotificationsRoundedIcon />}>
                                    Load Notification Preview
                                </Button>
                            )}
                        </Paper>
                    )}

                    <Box className="flex gap-4 mb-6">
                        {/* Stats Cards */}
                        <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
                            <Typography variant="h4" color="primary" className="font-bold">{stats.total}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Registrations</Typography>
                        </Paper>
                        <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
                            <Typography variant="h4" className="font-bold text-green-600">{stats.joinedLive}</Typography>
                            <Typography variant="body2" color="text.secondary">Joined Live</Typography>
                        </Paper>
                        <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
                            <Typography variant="h4" className="font-bold text-blue-600">{stats.watchedReplay}</Typography>
                            <Typography variant="body2" color="text.secondary">Watched Replay</Typography>
                        </Paper>
                        <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
                            <Typography variant="h4" className="font-bold text-slate-500">{stats.didNotAttend}</Typography>
                            <Typography variant="body2" color="text.secondary">Did Not Attend</Typography>
                        </Paper>
                    </Box>
                </Grid>

                {/* Right Col: List */}
                <Grid item xs={12} md={5} lg={4}>
                    <Paper elevation={0} className="border border-slate-200 rounded-2xl h-full flex flex-col overflow-hidden" sx={{ maxHeight: "80vh" }}>
                        <Box className="border-b border-slate-200">
                            <Tabs
                                value={filterTab}
                                onChange={handleTabChange}
                                variant="fullWidth"
                                textColor="primary"
                                indicatorColor="primary"
                            >
                                <Tab label="All" />
                                <Tab label="Joined Live" />
                                <Tab label="Watched Replay" />
                                <Tab label="Did Not Attend" />
                            </Tabs>
                        </Box>

                        <Box className="flex-1 overflow-auto p-0" sx={{ opacity: listLoading ? 0.6 : 1, transition: "opacity 0.2s" }}>
                            {registrations.length === 0 && !listLoading ? (
                                <Box className="p-6 text-center text-slate-500">
                                    No users found in this category.
                                </Box>
                            ) : (
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>User</TableCell>
                                            <TableCell align="right">Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {registrations.map((reg) => (
                                            <TableRow key={reg.id} hover>
                                                <TableCell>
                                                    <Box className="flex items-center gap-2">
                                                        <Avatar src={reg.user_avatar_url} sx={{ width: 32, height: 32 }}>
                                                            {(reg.user_name?.[0] || "U").toUpperCase()}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2" className="leading-tight">
                                                                {reg.user_name}
                                                                {isVerifiedStatus(
                                                                    reg.user_kyc_status ||
                                                                    reg.user?.kyc_status ||
                                                                    reg.profile?.kyc_status ||
                                                                    reg.kyc_status ||
                                                                    ""
                                                                ) && (
                                                                        <VerifiedIcon
                                                                            sx={{ fontSize: 16, color: "#22d3ee", ml: 0.5, verticalAlign: "middle" }}
                                                                        />
                                                                    )}
                                                            </Typography>
                                                            <Typography variant="caption" className="text-slate-500">
                                                                {reg.user_email}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box className="flex flex-col gap-1 items-end">
                                                        {/* Standard status chips */}
                                                        {reg.joined_live && (
                                                            <Chip
                                                                icon={<CheckCircleIcon style={{ fontSize: 14 }} />}
                                                                label="Live"
                                                                size="small"
                                                                color="success"
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: "0.65rem" }}
                                                            />
                                                        )}
                                                        {reg.watched_replay && (
                                                            <Chip
                                                                icon={<PlayCircleOutlineRoundedIcon style={{ fontSize: 14 }} />}
                                                                label="Replay"
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: "0.65rem" }}
                                                            />
                                                        )}
                                                        {!reg.joined_live && !reg.watched_replay && !event?.replay_available && (
                                                            <Chip label="Registered Only" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Box>
                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <Box className="p-3 border-t border-slate-200 flex justify-center">
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, v) => setPage(v)}
                                    color="primary"
                                    size="small"
                                    shape="rounded"
                                />
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
