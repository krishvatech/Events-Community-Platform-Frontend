import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import SpeedNetworkingMatch from './SpeedNetworkingMatch';
import SpeedNetworkingLobby from './SpeedNetworkingLobby';
import SpeedNetworkingControls from './SpeedNetworkingControls';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SpeedNetworkingZone({
    eventId,
    isAdmin,
    onClose,
    dyteMeeting,
    onEnterMatch,
    lastMessage
}) {
    const [session, setSession] = useState(null);
    const [currentMatch, setCurrentMatch] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [inQueue, setInQueue] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch current user (to get integer id)
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const url = `${API_ROOT}/users/me/`.replace(/([^:]\/)\/+/g, "$1");
                const res = await fetch(url, { headers: authHeader() });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data);
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
            }
        };
        fetchUser();
    }, []);

    // Fetch active session
    const fetchActiveSession = useCallback(async () => {
        setError(null); // Clear previous errors on retry
        try {
            const url = `${API_ROOT}/events/${eventId}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                headers: authHeader()
            });

            if (!res.ok) throw new Error('Failed to fetch session');

            const data = await res.json();
            // Find active or pending session
            const activeSession = data.results?.find(s => ['ACTIVE', 'PENDING'].includes(s.status)) || null;
            setSession(activeSession);
            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error fetching session:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [eventId]);

    // Handle WebSocket messages
    useEffect(() => {
        if (!lastMessage) return;

        console.log("[SpeedNetworking] Processing message:", lastMessage.type);

        const messageType = lastMessage.type;
        const messageData = lastMessage.data || {};

        if (messageType === 'speed_networking.match_found' || messageType === 'speed_networking_match_found') {
            console.log("[SpeedNetworking] Match found via WebSocket!");
            const wsMatch = lastMessage.match || messageData.match || messageData;
            setCurrentMatch(wsMatch);
            setInQueue(false);
            if (onEnterMatch) {
                onEnterMatch(wsMatch);
            }
        } else if (messageType === 'speed_networking.match_ended' || messageType === 'speed_networking_match_ended') {
            console.log("[SpeedNetworking] Match ended via WebSocket. Return to queue.");
            setCurrentMatch(null);
            setInQueue(true);
            // Optionally trigger a session refresh to be safe
            fetchActiveSession();
        } else if (messageType === 'speed_networking.session_ended' || messageType === 'speed_networking_session_ended') {
            setSession(prev => prev ? { ...prev, status: 'ENDED' } : prev);
            setCurrentMatch(null);
            setInQueue(false);
        } else if (messageType === 'speed_networking.session_started' || messageType === 'speed_networking_session_started') {
            fetchActiveSession();
        }
    }, [lastMessage, onEnterMatch, fetchActiveSession]);

    // When session ends, immediately clear queue and match states
    useEffect(() => {
        if (session && session.status === 'ENDED') {
            setCurrentMatch(null);
            setInQueue(false);
        }
    }, [session?.status]);

    // Join queue
    const handleJoinQueue = async () => {
        if (!session) return;

        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/join/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to join queue');
            }

            if (data.status === 'matched') {
                setCurrentMatch(data.match);
                setInQueue(false);
                // Join Dyte room for this match
                if (onEnterMatch) {
                    onEnterMatch(data.match);
                }
            } else {
                setInQueue(true);
            }
            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error joining queue:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Leave queue
    const handleLeaveQueue = async () => {
        if (!session) return;

        try {
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/leave/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: authHeader()
            });

            if (!res.ok) throw new Error('Failed to leave queue');

            setInQueue(false);
            setCurrentMatch(null);
        } catch (err) {
            console.error('[SpeedNetworking] Error leaving queue:', err);
            setError(err.message);
        }
    };

    // Next match
    const handleNextMatch = useCallback(async () => {
        if (!currentMatch) return;
        setError(null);

        // Capture current match ID before clearing state
        const matchId = currentMatch.id;

        // CRITICAL: Immediately show "Finding your match..." to both users
        // This ensures immediate UI feedback when timer expires or user clicks "Next Match"
        // The backend API call happens in the background
        setCurrentMatch(null);
        setInQueue(true);
        setLoading(true);

        try {
            const url = `${API_ROOT}/events/${eventId}/speed-networking/matches/${matchId}/next/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: authHeader()
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to get next match');
            }

            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error getting next match:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [currentMatch, eventId]);

    // Poll for current match when in queue (only if waiting)
    // WebSocket will notify of matches, but polling is fallback for reliability
    useEffect(() => {
        if (!inQueue || !session) return;

        const pollInterval = setInterval(async () => {
            try {
                const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/my-match/`.replace(/([^:]\/)\/+/g, "$1");
                const res = await fetch(url, {
                    headers: authHeader()
                });

                if (res.status === 404) {
                    setInQueue(false);
                    return;
                }
                if (!res.ok) return;

                const data = await res.json();

                if (data.id) {
                    // Match found!
                    setCurrentMatch(data);
                    setInQueue(false);
                    if (onEnterMatch) {
                        onEnterMatch(data);
                    }
                }
            } catch (err) {
                console.error('[SpeedNetworking] Error polling match:', err);
            }
        }, 5000); // Poll every 5 seconds (reduced frequency - WebSocket handles real-time)

        return () => clearInterval(pollInterval);
    }, [inQueue, session, eventId, onEnterMatch]);

    // Initial fetch
    useEffect(() => {
        fetchActiveSession();
    }, [fetchActiveSession]);

    // Poll session status periodically (fallback for WebSocket)
    // Only check when session might have changed (not in active match)
    useEffect(() => {
        if (!session) return;

        const pollInterval = setInterval(async () => {
            try {
                const url = `${API_ROOT}/events/${eventId}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");
                const res = await fetch(url, { headers: authHeader() });

                if (res.ok) {
                    const data = await res.json();
                    // First look for ACTIVE/PENDING sessions
                    let activeSession = data.results?.find(s => ['ACTIVE', 'PENDING'].includes(s.status)) || null;

                    // If no ACTIVE/PENDING session but we have a session, check if current session ended
                    if (!activeSession && session) {
                        activeSession = data.results?.find(s => s.id === session.id) || null;
                    }

                    // If session status changed, update it
                    if (activeSession && activeSession.id !== session.id) {
                        // Different session found (new session created)
                        console.log("[SpeedNetworking] New session detected, updating:", activeSession.id);
                        setSession(activeSession);
                        setCurrentMatch(null);
                        setInQueue(false);
                    } else if (activeSession && activeSession.status !== session.status) {
                        // Same session but status changed
                        console.log("[SpeedNetworking] Session status changed to:", activeSession.status);
                        setSession(activeSession);

                        // If session ended, clear match and queue
                        if (activeSession.status === 'ENDED') {
                            setCurrentMatch(null);
                            setInQueue(false);
                        }
                    } else if (!activeSession && session) {
                        // Current session was not found (might have been deleted) - treat as ended
                        console.log("[SpeedNetworking] Current session no longer exists");
                        setSession(prev => prev ? { ...prev, status: 'ENDED' } : prev);
                        setCurrentMatch(null);
                        setInQueue(false);
                    }
                }
            } catch (err) {
                console.error('[SpeedNetworking] Error polling session status:', err);
            }
        }, 5000); // Poll every 5 seconds (reduced frequency - WebSocket handles real-time updates)

        return () => clearInterval(pollInterval);
    }, [session, eventId]);

    if (loading && !session) {
        return (
            <Box sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#0a0f1a'
            }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#0a0f1a',
                p: 4
            }}>
                <Typography sx={{ color: '#ef4444', mb: 2 }}>
                    Error: {error}
                </Typography>
                <Button
                    variant="contained"
                    onClick={fetchActiveSession}
                    sx={{ bgcolor: '#5a78ff' }}
                >
                    Retry
                </Button>
            </Box>
        );
    }

    if (!session || session.status === 'ENDED') {
        return (
            <Box sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#0a0f1a',
                p: 4
            }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, textAlign: 'center' }}>
                    No active speed networking session
                </Typography>
                {isAdmin && (
                    <SpeedNetworkingControls
                        eventId={eventId}
                        onSessionCreated={fetchActiveSession}
                    />
                )}
                <Button
                    variant="outlined"
                    onClick={onClose}
                    sx={{
                        mt: 2,
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: '#fff'
                    }}
                >
                    Close
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#0a0f1a'
        }}>
            {/* Header */}
            <Box sx={{
                p: 2,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                        {session.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {session.duration_minutes} min per match • {session.queue_count} in queue
                    </Typography>
                </Box>
                <Button
                    onClick={onClose}
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    Close
                </Button>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {currentMatch ? (
                    <SpeedNetworkingMatch
                        key={currentMatch.id}
                        match={currentMatch}
                        session={session}
                        onNextMatch={handleNextMatch}
                        onLeave={handleLeaveQueue}
                        loading={loading}
                        currentUserId={currentUser?.id}
                    />
                ) : inQueue ? (
                    <SpeedNetworkingLobby
                        session={session}
                        onLeave={handleLeaveQueue}
                    />
                ) : (
                    <Box sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 4
                    }}>
                        <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
                            Ready to Network?
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, textAlign: 'center', maxWidth: 400 }}>
                            Join the speed networking session to meet other participants one-on-one for {session.duration_minutes}-minute conversations.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleJoinQueue}
                            disabled={loading || session.status !== 'ACTIVE'}
                            sx={{
                                bgcolor: '#22c55e',
                                '&:hover': { bgcolor: '#16a34a' },
                                px: 6,
                                py: 1.5,
                                fontSize: 16,
                                fontWeight: 700,
                                borderRadius: 3,
                                '&.Mui-disabled': {
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.3)'
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} /> :
                                session.status === 'PENDING' ? 'Waiting for host to start...' :
                                    'Join Speed Networking'}
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Admin Controls */}
            {isAdmin && (
                <Box sx={{
                    p: 2,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    bgcolor: 'rgba(90,120,255,0.05)'
                }}>
                    <SpeedNetworkingControls
                        eventId={eventId}
                        session={session}
                        onSessionUpdated={fetchActiveSession}
                    />
                </Box>
            )}
        </Box>
    );
}
