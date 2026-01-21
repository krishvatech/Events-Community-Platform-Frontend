import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Dialog, IconButton, Typography, CircularProgress, Backdrop, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoungeGrid from './LoungeGrid';

const API_RAW = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");
function getToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

const LoungeOverlay = ({ open, onClose, eventId, currentUserId, isAdmin, onEnterBreakout, dyteMeeting }) => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting', 'open', 'closed'
    const [myInternalId, setMyInternalId] = useState(null);
    const [myUsername, setMyUsername] = useState(null);
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
                setTables(data.tables || []);
                setLoading(false);
            }
        } catch (err) {
            console.error("[Lounge] Fetch error:", err);
        }
    }, [eventId]);

    useEffect(() => {
        if (open) {
            fetchLoungeState();
            const interval = setInterval(fetchLoungeState, 10000); // 10s auto-sync
            return () => clearInterval(interval);
        }
    }, [open, fetchLoungeState]);

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
                    setTables(newState);
                    setLoading(false);
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
                    console.log("[Lounge] Joining breakout meeting with token");
                    onEnterBreakout(data.token, tableId, tableName);
                    onClose(); // Auto-close overlay after joining
                }
            } else {
                console.error("[Lounge] Breakout fetch failed (Even with fallback):", res.status);
            }
        } catch (err) {
            console.error("[Lounge] Failed to join breakout video", err);
        }
    };

    const handleCreateTable = async () => {
        // This could call the REST API created earlier
        const name = prompt("Enter table name:", "Networking Table");
        if (!name) return;

        try {
            const url = `${API_RAW}/events/${eventId}/create-lounge-table/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ name, max_seats: 4 })
            });
            if (res.ok) {
                // Broadcast will update the UI via WebSocket
            }
        } catch (err) {
            console.error("Failed to create table", err);
        }
    };

    // if (!open) return null; // REMOVED: Preserve state even when closed

    return (
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                        <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: wsStatus === 'open' ? '#22c55e' : (wsStatus === 'closed' ? '#ef4444' : '#f59e0b')
                        }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {wsStatus === 'open' ? 'Live Refresh Active' : (wsStatus === 'closed' ? 'Connection Failed (Check Console)' : 'Connecting to Server...')}
                        </Typography>
                        <Button
                            size="small"
                            onClick={fetchLoungeState}
                            sx={{ ml: 2, color: '#5a78ff', textTransform: 'none', fontSize: '0.7rem' }}
                        >
                            Sync Now
                        </Button>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {loading ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <LoungeGrid
                            tables={tables}
                            onJoin={(tableId, seatIndex) => {
                                handleJoinTable(tableId, seatIndex);
                                handleEnterBreakout(tableId);
                            }}
                            onLeave={() => handleLeaveTable(dyteMeeting)}
                            currentUserId={myInternalId || currentUserId}
                            myUsername={myUsername}
                            isAdmin={isAdmin}
                            onCreateTable={handleCreateTable}
                        />
                        <Box sx={{ px: 4, pb: 2 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                Debug Info: My ID (JWT): {currentUserId} | My ID (Backend): {myInternalId || 'Waiting...'} | Username: {myUsername || '...'}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
};

export default LoungeOverlay;
