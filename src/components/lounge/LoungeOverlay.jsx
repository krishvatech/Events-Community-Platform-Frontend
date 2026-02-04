import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography, CircularProgress, Backdrop, Button, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoungeGrid from './LoungeGrid';
import MainRoomPeek from './MainRoomPeek';

const API_RAW = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");
function getToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

const LoungeOverlay = ({ open, onClose, eventId, currentUserId, isAdmin, onEnterBreakout, dyteMeeting, onParticipantClick, onJoinMain }) => {
    const [tables, setTables] = useState([]);
    const [breakoutTables, setBreakoutTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting', 'open', 'closed'
    const [loungeOpenStatus, setLoungeOpenStatus] = useState(null);
    const [myInternalId, setMyInternalId] = useState(null);
    const [myUsername, setMyUsername] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createName, setCreateName] = useState("Networking Table");
    const [createSaving, setCreateSaving] = useState(false);
    const [createSeats, setCreateSeats] = useState(4);
    const [createIconFile, setCreateIconFile] = useState(null);
    const [createIconPreview, setCreateIconPreview] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [editName, setEditName] = useState("");
    const [editSeats, setEditSeats] = useState(4);
    const [editSaving, setEditSaving] = useState(false);
    const [editIconFile, setEditIconFile] = useState(null);
    const [editIconPreview, setEditIconPreview] = useState("");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        const token = getToken();
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                const decoded = JSON.parse(jsonPayload);
                const uname = decoded['cognito:username'] || decoded['username'];
                console.log("[Lounge] Current Username from JWT:", uname);
                setMyUsername(uname);
            } catch (e) {
                console.warn("[Lounge] Token parse error", e);
            }
        }
    }, []);

    const resolveMediaUrl = useCallback((url) => {
        if (!url) return "";
        if (/^https?:\/\//i.test(url)) return url;
        if (url.startsWith("/")) {
            const base = API_RAW.replace(/\/api\/?$/, "");
            return `${base}${url}`;
        }
        return url;
    }, []);

    const normalizeTables = useCallback(
        (list) => (Array.isArray(list) ? list : []).map((t) => {
            const participants = t?.participants || {};
            const normalizedParticipants = Object.fromEntries(
                Object.entries(participants).map(([seat, p]) => {
                    if (!p) return [seat, p];
                    const avatar =
                        p.avatar_url ||
                        p.user_image_url ||
                        p.user_image ||
                        p.avatar ||
                        "";
                    return [
                        seat,
                        {
                            ...p,
                            avatar_url: resolveMediaUrl(avatar),
                        },
                    ];
                })
            );
            return {
                ...t,
                icon_url: resolveMediaUrl(t?.icon_url),
                participants: normalizedParticipants,
            };
        }),
        [resolveMediaUrl]
    );

    const fetchLoungeState = useCallback(async () => {
        if (!eventId) return;
        try {
            const url = `${API_RAW}/events/${eventId}/lounge-state/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[Lounge] Fetched state:", data.tables);
                const loungeOnly = (data.tables || []).filter(t => t.category === 'LOUNGE' || !t.category);
                const breakoutOnly = (data.tables || []).filter(t => t.category === 'BREAKOUT');
                setTables(normalizeTables(loungeOnly));
                setBreakoutTables(normalizeTables(breakoutOnly));
                if (data.lounge_open_status) {
                    setLoungeOpenStatus(data.lounge_open_status);
                }
                setLoading(false);
            }
        } catch (err) {
            console.error("[Lounge] Fetch error:", err);
        }
    }, [eventId, normalizeTables]);

    useEffect(() => {
        if (open) {
            fetchLoungeState();
            const interval = setInterval(fetchLoungeState, 10000); // 10s auto-sync
            return () => clearInterval(interval);
        }
    }, [open, fetchLoungeState]);

    useEffect(() => {
        if (!createIconFile) {
            setCreateIconPreview("");
            return;
        }
        const previewUrl = URL.createObjectURL(createIconFile);
        setCreateIconPreview(previewUrl);
        return () => URL.revokeObjectURL(previewUrl);
    }, [createIconFile]);

    useEffect(() => {
        if (!editIconFile) {
            setEditIconPreview("");
            return;
        }
        const previewUrl = URL.createObjectURL(editIconFile);
        setEditIconPreview(previewUrl);
        return () => URL.revokeObjectURL(previewUrl);
    }, [editIconFile]);

    useEffect(() => {
        if (!open || !eventId) return;

        // Avoid multiple connections if already open for this event
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && socketRef.current._eventId === eventId) {
            return;
        }

        setWsStatus('connecting');
        const token = getToken();
        const qs = token ? `?token=${encodeURIComponent(token)}` : "";

        const API_RAW = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
        const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");
        // Remove potential double slashes
        const wsUrl = `${WS_ROOT}/ws/events/${eventId}/${qs}`.replace(/([^:]\/)\/+/g, "$1");

        console.log("[Lounge] Connecting to WebSoket:", wsUrl);
        const ws = new WebSocket(wsUrl);
        ws._eventId = eventId;

        ws.onopen = () => {
            console.log("[Lounge] WebSocket connected successfully");
            setWsStatus('open');
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                console.log("[Lounge] Incoming Message:", msg.type, msg);
                if (msg.type === "welcome" || msg.type === "lounge_state") {
                    if (msg.type === "welcome") {
                        const internalId = msg.your_user_id || msg.your_id || msg.user_id;
                        console.log("[Lounge] Detected myInternalId from welcome:", internalId, "Keys in msg:", Object.keys(msg));
                        if (internalId) setMyInternalId(internalId);
                    }
                    const newState = msg.lounge_state || msg.state || [];
                    console.log("[Lounge] Updating Tables:", newState);
                    const loungeOnly = newState.filter(t => t.category === 'LOUNGE' || !t.category);
                    const breakoutOnly = newState.filter(t => t.category === 'BREAKOUT');
                    setTables(normalizeTables(loungeOnly));
                    setBreakoutTables(normalizeTables(breakoutOnly));
                    if (msg.lounge_open_status) {
                        setLoungeOpenStatus(msg.lounge_open_status);
                    }
                    setLoading(false);
                } else if (msg.type === "breakout_end") {
                    // Host has ended all breakouts - refresh lounge state
                    console.log("[Lounge] Received breakout_end - refreshing table state");
                    setBreakoutTables([]); // Clear all breakout tables
                    // Trigger a fresh fetch to ensure consistency
                    fetchLoungeState();
                } else if (msg.type === "error") {
                    console.error("[Lounge] Backend Error:", msg.message);
                }
            } catch (err) {
                console.warn("[Lounge] Failed to parse message:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("[Lounge] WebSocket Error:", err);
            setWsStatus('closed');
        };

        ws.onclose = (e) => {
            console.log("[Lounge] WebSocket closed:", e.code, e.reason);
            setWsStatus('closed');
            socketRef.current = null;
        };

        socketRef.current = ws;

        return () => {
            // Actually, we might want to keep it open while the dialog is open
            // but maybe close when 'open' prop turns false.
            if (!open && ws.readyState <= WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [open, eventId]);

    const handleJoinTable = (tableId, seatIndex) => {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("[Lounge] Sending join_table:", { tableId, seatIndex });
            ws.send(JSON.stringify({
                action: "join_table",
                table_id: tableId,
                seat_index: seatIndex
            }));
        }
    };

    const handleLeaveTable = async (dyteMeeting) => {
        console.log("[Lounge] Starting leave table process...");

        // 1. (Removed explicit leaveRoom to avoid exiting the main meeting too)
        // The token switch in LiveMeetingPage will automatically handle the room switch.


        // 2. Send WebSocket message to update backend state
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("[Lounge] Sending leave_table to backend");
            ws.send(JSON.stringify({
                action: "leave_table"
            }));
        }

        // 3. Signal to parent component to return to main meeting
        if (onEnterBreakout) {
            console.log("[Lounge] Signaling return to main meeting");
            onEnterBreakout(null, null, null); // Signal return to main
        }
    };

    const handleEnterBreakout = async (tableId) => {
        try {
            const url = `${API_RAW}/events/${eventId}/lounge-join-table/`.replace(/([^:]\/)\/+/g, "$1");
            let res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ table_id: tableId })
            });

            // Fallback for old URL if new one 404s (handle server reload lag)
            if (res.status === 404) {
                console.log("[Lounge] New URL 404ed, trying legacy URL...");
                const fallbackUrl = `${API_RAW}/events/${eventId}/lounge/join-table/`.replace(/([^:]\/)\/+/g, "$1");
                res = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ table_id: tableId })
                });
            }

            if (res.ok) {
                const data = await res.json();
                console.log("[Lounge] Breakout join successful, token received:", data.token ? "YES" : "NO");
                if (data.token && onEnterBreakout) {
                    const table = tables.find((t) => String(t.id) === String(tableId));
                    const tableName = table?.name || `Room ${tableId}`;
                    const logoUrl = table?.icon_url || ""; // ✅ Get table logo URL
                    console.log("[Lounge] Joining breakout meeting with token");
                    onEnterBreakout(data.token, tableId, tableName, logoUrl); // ✅ Pass logo URL
                    onClose(); // Auto-close overlay after joining
                }
            } else if (res.status === 403) {
                // ✅ NEW: Lounge is closed or not available
                const data = await res.json().catch(() => ({}));
                const reason = data.reason || "The lounge is currently closed";
                console.warn("[Lounge] ❌ 403 Forbidden - Lounge not available:", reason);
                console.warn("[Lounge] This usually means the lounge status changed or the waiting room is still active");
                alert(`Unable to join table:\n${reason}\n\nPlease refresh the page if the lounge should be open.`);
                // Refresh the lounge state to get latest status
                window.location.reload();
            } else {
                console.error("[Lounge] Breakout fetch failed (Even with fallback):", res.status);
                alert("Failed to join table. Please try again.");
            }
        } catch (err) {
            console.error("[Lounge] Failed to join breakout video", err);
            alert("Error joining table");
        }
    };

    const clampSeats = (value) => Math.max(2, Math.min(30, value || 0));

    const handleCreateTable = async () => {
        const name = (createName || "").trim();
        if (!name || !eventId || createSaving) return;
        setCreateSaving(true);
        try {
            const url = `${API_RAW}/events/${eventId}/create-lounge-table/`.replace(/([^:]\/)\/+/g, "$1");
            let res;
            if (createIconFile) {
                const formData = new FormData();
                formData.append("name", name);
                formData.append("category", "LOUNGE");
                formData.append("max_seats", clampSeats(createSeats));
                formData.append("icon", createIconFile);
                res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: formData,
                });
            } else {
                res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ name, category: "LOUNGE", max_seats: clampSeats(createSeats) })
                });
            }
            if (res.ok) {
                // Broadcast will update the UI via WebSocket
                setCreateOpen(false);
                setCreateIconFile(null);
                setCreateSeats(4);
            }
        } catch (err) {
            console.error("Failed to create table", err);
        } finally {
            setCreateSaving(false);
        }
    };

    const handleUpdateTableIcon = async (tableId, iconFile) => {
        if (!eventId || !tableId || !iconFile) return;
        try {
            const url = `${API_RAW}/events/${eventId}/lounge-table-icon/`.replace(/([^:]\/)\/+/g, "$1");
            const formData = new FormData();
            formData.append("table_id", tableId);
            formData.append("icon", iconFile);
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: formData,
            });
            if (!res.ok) {
                console.error("[Lounge] Failed to update table icon:", res.status);
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (data?.icon_url) {
                const normalized = resolveMediaUrl(data.icon_url);
                setTables((prev) => prev.map((t) => (
                    String(t.id) === String(tableId) ? { ...t, icon_url: normalized } : t
                )));
            }
        } catch (err) {
            console.error("[Lounge] Failed to update table icon", err);
        }
    };

    const handleOpenEditTable = (table) => {
        if (!table) return;
        setEditTarget(table);
        setEditName(table?.name || "");
        setEditSeats(clampSeats(table?.max_seats || 4));
        setEditIconFile(null);
        setEditIconPreview(table?.icon_url || "");
        setEditOpen(true);
    };

    const handleUpdateTable = async () => {
        if (!eventId || !editTarget || editSaving) return;
        const name = (editName || "").trim();
        if (!name) return;
        setEditSaving(true);
        try {
            const url = `${API_RAW}/events/${eventId}/lounge-table-update/`.replace(/([^:]\/)\/+/g, "$1");
            let res;
            if (editIconFile) {
                const formData = new FormData();
                formData.append("table_id", String(editTarget.id));
                formData.append("name", name);
                formData.append("max_seats", String(clampSeats(editSeats)));
                formData.append("icon", editIconFile);
                res = await fetch(url, {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: formData,
                });
            } else {
                res = await fetch(url, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        table_id: editTarget.id,
                        name,
                        max_seats: clampSeats(editSeats),
                    }),
                });
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                console.error("[Lounge] Failed to update table:", res.status);
                return;
            }
            setTables((prev) => prev.map((t) => (
                String(t.id) === String(editTarget.id)
                    ? {
                        ...t,
                        name: data.name || name,
                        max_seats: data.max_seats || clampSeats(editSeats),
                        icon_url: resolveMediaUrl(data.icon_url || t.icon_url),
                    }
                    : t
            )));
            setEditOpen(false);
        } catch (err) {
            console.error("[Lounge] Failed to update table", err);
        } finally {
            setEditSaving(false);
        }
    };

    const handleOpenDeleteTable = (table) => {
        if (!table) return;
        setDeleteTarget(table);
        setDeleteOpen(true);
    };

    const handleDeleteTable = async () => {
        if (!eventId || !deleteTarget || deleteSaving) return;
        setDeleteSaving(true);
        try {
            const url = `${API_RAW}/events/${eventId}/lounge-table-delete/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ table_id: deleteTarget.id }),
            });
            if (!res.ok) {
                console.error("[Lounge] Failed to delete table:", res.status);
                return;
            }
            setTables((prev) => prev.filter((t) => String(t.id) !== String(deleteTarget.id)));
            setDeleteOpen(false);
            setDeleteTarget(null);
        } catch (err) {
            console.error("[Lounge] Failed to delete table", err);
        } finally {
            setDeleteSaving(false);
        }
    };

    // if (!open) return null; // REMOVED: Preserve state even when closed

    return (
        <>
            <Dialog
                fullScreen
                open={open}
                onClose={onClose}
                sx={{ zIndex: 1200 }}
                PaperProps={{
                    sx: {
                        bgcolor: '#05070D',
                        backgroundImage: 'radial-gradient(900px 420px at 50% 0%, rgba(90,120,255,0.18), transparent 55%)',
                    }
                }}
            >
                <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ ml: 2 }}>
                            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                                Social Lounge & Networking
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Box sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: wsStatus === 'open' ? '#22c55e' : (wsStatus === 'closed' ? '#ef4444' : '#f59e0b')
                                }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {wsStatus === 'open' ? 'Live Refresh Active' : (wsStatus === 'closed' ? 'Connection Failed' : 'Connecting...')}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {loungeOpenStatus?.status === 'CLOSED' && onJoinMain && (
                        <Box sx={{ px: 3, pb: 1.5 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={onJoinMain}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: 2,
                                    bgcolor: '#10b8a6',
                                    '&:hover': { bgcolor: '#0ea5a4' },
                                }}
                            >
                                Join Live Meeting
                            </Button>
                        </Box>
                    )}

                    {loading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{
                            flex: 1,
                            overflowY: 'auto',
                            // Custom scrollbar styling
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(90,120,255,0.3)',
                                borderRadius: '10px',
                                '&:hover': {
                                    background: 'rgba(90,120,255,0.5)',
                                },
                            },
                            // Firefox scrollbar styling
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(90,120,255,0.3) rgba(255,255,255,0.05)',
                        }}>
                            {loungeOpenStatus && (
                                <Box sx={{
                                    mx: 3, mt: 2, mb: 1, p: 2,
                                    bgcolor: loungeOpenStatus.status === 'OPEN' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                    border: `1px solid ${loungeOpenStatus.status === 'OPEN' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}>
                                    <Box sx={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        bgcolor: loungeOpenStatus.status === 'OPEN' ? '#22c55e' : '#ef4444',
                                        boxShadow: loungeOpenStatus.status === 'OPEN' ? '0 0 10px rgba(34,197,94,0.5)' : 'none'
                                    }} />
                                    <Box>
                                        <Typography sx={{ color: 'white', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                                            Lounge is {loungeOpenStatus.status}
                                        </Typography>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, mt: 0.3 }}>
                                            {loungeOpenStatus.reason}
                                            {loungeOpenStatus.next_change && ` • Changes at ${new Date(loungeOpenStatus.next_change).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            <LoungeGrid
                                tables={tables}
                                title="Social Lounge"
                                description="Meet and greet while we prepare to go live. Take a seat to join a conversation."
                                onJoin={(tableId, seatIndex) => {
                                    if (loungeOpenStatus?.status === 'CLOSED' && !isAdmin) {
                                        alert("The lounge is currently closed.");
                                        return;
                                    }
                                    handleJoinTable(tableId, seatIndex);
                                    handleEnterBreakout(tableId);
                                }}
                                onLeave={() => handleLeaveTable(dyteMeeting)}
                                currentUserId={myInternalId || currentUserId}
                                myUsername={myUsername}
                                isAdmin={isAdmin}
                                onCreateTable={() => setCreateOpen(true)}
                                onUpdateIcon={handleUpdateTableIcon}
                                onEditTable={handleOpenEditTable}
                                onDeleteTable={handleOpenDeleteTable}
                                onParticipantClick={onParticipantClick}
                                loungeOpenStatus={loungeOpenStatus}
                            />

                            {breakoutTables.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Box sx={{ px: 4, py: 2, bgcolor: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography sx={{ color: '#5a78ff', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Active Breakout Rooms
                                        </Typography>
                                    </Box>
                                    <LoungeGrid
                                        tables={breakoutTables}
                                        showCreateButton={false}
                                        onJoin={(tableId, seatIndex) => {
                                            handleJoinTable(tableId, seatIndex);
                                            handleEnterBreakout(tableId);
                                        }}
                                        onLeave={() => handleLeaveTable(dyteMeeting)}
                                        currentUserId={myInternalId || currentUserId}
                                        myUsername={myUsername}
                                        isAdmin={isAdmin}
                                        onUpdateIcon={handleUpdateTableIcon}
                                        onEditTable={handleOpenEditTable}
                                        onDeleteTable={handleOpenDeleteTable}
                                        onParticipantClick={onParticipantClick}
                                        loungeOpenStatus={loungeOpenStatus}
                                    />
                                </Box>
                            )}
                            <Box sx={{ px: 4, pb: 2 }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                    Debug Info: My ID (JWT): {currentUserId} | My ID (Backend): {myInternalId || 'Waiting...'} | Username: {myUsername || '...'}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <MainRoomPeek dyteMeeting={dyteMeeting} />
                </Box>
            </Dialog>

            <Dialog
                open={createOpen}
                onClose={() => {
                    setCreateOpen(false);
                    setCreateIconFile(null);
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "#0b101a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 3,
                        color: "#fff",
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    Create a Room
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Room name"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateTable();
                            }
                        }}
                        variant="outlined"
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                        sx={{
                            mt: 1,
                            "& .MuiOutlinedInput-root": {
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,0.04)",
                                borderRadius: 2,
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255,255,255,0.2)",
                            },
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Seats"
                        type="number"
                        inputProps={{ min: 2, max: 30 }}
                        value={createSeats}
                        onChange={(e) => setCreateSeats(clampSeats(Number(e.target.value)))}
                        variant="outlined"
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                        sx={{
                            mt: 2,
                            "& .MuiOutlinedInput-root": {
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,0.04)",
                                borderRadius: 2,
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255,255,255,0.2)",
                            },
                        }}
                    />
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                            Table logo (optional)
                        </Typography>
                        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Button
                                variant="outlined"
                                component="label"
                                sx={{
                                    textTransform: "none",
                                    borderColor: "rgba(255,255,255,0.2)",
                                    color: "#fff",
                                }}
                            >
                                {createIconFile ? "Replace logo" : "Upload logo"}
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setCreateIconFile(e.target.files?.[0] || null)}
                                />
                            </Button>
                            {createIconPreview && (
                                <Box
                                    component="img"
                                    src={createIconPreview}
                                    alt="Table logo preview"
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        objectFit: "contain",
                                        borderRadius: 1.5,
                                        bgcolor: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                    }}
                                />
                            )}
                            {createIconFile && (
                                <Button
                                    size="small"
                                    onClick={() => setCreateIconFile(null)}
                                    sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                                >
                                    Remove
                                </Button>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setCreateOpen(false);
                            setCreateIconFile(null);
                            setCreateSeats(4);
                        }}
                        sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateTable}
                        disabled={!createName.trim() || createSaving}
                        sx={{
                            textTransform: "none",
                            bgcolor: "#14b8b1",
                            "&:hover": { bgcolor: "#0e8e88" },
                        }}
                    >
                        {createSaving ? "Creating..." : "Create"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    setEditIconFile(null);
                    setEditTarget(null);
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "#0b101a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 3,
                        color: "#fff",
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    Edit Table
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Table name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        variant="outlined"
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                        sx={{
                            mt: 1,
                            "& .MuiOutlinedInput-root": {
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,0.04)",
                                borderRadius: 2,
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255,255,255,0.2)",
                            },
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Seats"
                        type="number"
                        inputProps={{ min: 2, max: 30 }}
                        value={editSeats}
                        onChange={(e) => setEditSeats(clampSeats(Number(e.target.value)))}
                        variant="outlined"
                        InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                        sx={{
                            mt: 2,
                            "& .MuiOutlinedInput-root": {
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,0.04)",
                                borderRadius: 2,
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255,255,255,0.2)",
                            },
                        }}
                    />
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                            Table logo (optional)
                        </Typography>
                        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Button
                                variant="outlined"
                                component="label"
                                sx={{
                                    textTransform: "none",
                                    borderColor: "rgba(255,255,255,0.2)",
                                    color: "#fff",
                                }}
                            >
                                {editIconFile ? "Replace logo" : "Upload logo"}
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => setEditIconFile(e.target.files?.[0] || null)}
                                />
                            </Button>
                            {(editIconPreview || editTarget?.icon_url) && (
                                <Box
                                    component="img"
                                    src={editIconPreview || editTarget?.icon_url}
                                    alt="Table logo preview"
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        objectFit: "contain",
                                        borderRadius: 1.5,
                                        bgcolor: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                    }}
                                />
                            )}
                            {editIconFile && (
                                <Button
                                    size="small"
                                    onClick={() => setEditIconFile(null)}
                                    sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                                >
                                    Remove
                                </Button>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setEditOpen(false);
                            setEditIconFile(null);
                            setEditTarget(null);
                        }}
                        sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdateTable}
                        disabled={!editName.trim() || editSaving}
                        sx={{
                            textTransform: "none",
                            bgcolor: "#14b8b1",
                            "&:hover": { bgcolor: "#0e8e88" },
                        }}
                    >
                        {editSaving ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteOpen}
                onClose={() => {
                    setDeleteOpen(false);
                    setDeleteTarget(null);
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "#0b101a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 3,
                        color: "#fff",
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    Delete Table?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: "rgba(255,255,255,0.7)" }}>
                        This will remove the table "{deleteTarget?.name || "Table"}".
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setDeleteOpen(false);
                            setDeleteTarget(null);
                        }}
                        sx={{ textTransform: "none", color: "rgba(255,255,255,0.7)" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteTable}
                        disabled={deleteSaving}
                        sx={{ textTransform: "none" }}
                    >
                        {deleteSaving ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default LoungeOverlay;
