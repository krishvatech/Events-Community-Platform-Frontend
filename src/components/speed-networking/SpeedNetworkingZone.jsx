import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import SpeedNetworkingMatch from './SpeedNetworkingMatch';
import SpeedNetworkingTransition from './SpeedNetworkingTransition';
import SpeedNetworkingLobby from './SpeedNetworkingLobby';
import SpeedNetworkingControls from './SpeedNetworkingControls';
import SpeedNetworkingHostPanel from './SpeedNetworkingHostPanel';
import InterestSelector from './InterestSelector';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Add cache-busting query parameter for URLs that need fresh data
function addCacheBust(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
}

// OPTIMIZATION: Fetch with timeout to prevent hanging requests for 100+ users
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function isInBufferWindow(match, activeSession) {
    if (!match || !activeSession) return false;
    const matchStart = new Date(match.created_at).getTime();
    if (!Number.isFinite(matchStart)) return false;

    const totalMatchMs = (activeSession.duration_minutes * 60 + (match.extended_by_seconds || 0)) * 1000;
    const bufferMs = (activeSession.buffer_seconds || 0) * 1000;
    const matchEndAt = matchStart + totalMatchMs;
    const now = Date.now();

    return now >= matchEndAt && now < (matchEndAt + bufferMs);
}

function isDocumentHidden() {
    if (typeof document === 'undefined') return false;
    return document.visibilityState === 'hidden';
}

function matchIncludesUser(match, userId) {
    if (!match || userId == null) return true;
    const me = String(userId);
    const p1 = match?.participant_1?.id != null ? String(match.participant_1.id) : null;
    const p2 = match?.participant_2?.id != null ? String(match.participant_2.id) : null;
    return p1 === me || p2 === me;
}

export default function SpeedNetworkingZone({
    eventId,
    isAdmin,
    onClose,
    dyteMeeting,
    onEnterMatch,
    lastMessage,
    onMemberInfo,
    autoJoinOnOpen = false
}) {
    const [session, setSession] = useState(null);
    const [currentMatch, setCurrentMatch] = useState(null);
    const [transitionMatch, setTransitionMatch] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [inQueue, setInQueue] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showInterestSelector, setShowInterestSelector] = useState(false);
    const [hasInterestTags, setHasInterestTags] = useState(null);
    const myMatchPollInFlightRef = useRef(false);
    const myMatchAbortRef = useRef(null);
    const sessionPollInFlightRef = useRef(false);
    const matchStatusPollInFlightRef = useRef(false);
    const autoJoinAttemptedRef = useRef(false);

    // Helper to normalize speed networking user shape to member info shape
    const buildMemberObj = (user) => {
        if (!user) return null;
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
                     || user.username || 'User';
        return {
            id: user.id,
            name,
            picture: user.avatar_url || '',
            role: 'Audience',
            job_title: user.job_title || '',
            company: user.company || '',
            location: user.location || '',
            username: user.username,
            _raw: {
                customParticipantId: user.id,
                isKycVerified: user.is_kyc_verified || false,
            }
        };
    };

    // Callback to open member info for speed networking users
    const handleMemberInfo = useCallback((user) => {
        if (!onMemberInfo || !user) return;
        const memberObj = buildMemberObj(user);
        if (memberObj) {
            onMemberInfo(memberObj);
        }
    }, [onMemberInfo]);

    // Fetch current user (to get integer id)
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const url = `${API_ROOT}/users/me/`.replace(/([^:]\/)\/+/g, "$1");
                const res = await fetch(url, { headers: authHeader(false) }); // User info doesn't need no-cache
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
            let url = `${API_ROOT}/events/${eventId}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");
            url = addCacheBust(url); // Add cache-bust parameter for fresh data
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

    // Normalize message type: convert dots to underscores (Channels convention)
    const normalizeMessageType = (type) => {
        return type?.replace(/\./g, '_') || '';
    };

    // Handle WebSocket messages
    useEffect(() => {
        if (!lastMessage) return;

        const normalizedType = normalizeMessageType(lastMessage.type);
        const messageData = lastMessage.data || {};
        const messageSessionId = messageData?.session_id ?? messageData?.session?.id ?? lastMessage?.session_id;
        const isDifferentSession = session?.id && messageSessionId && String(messageSessionId) !== String(session.id);
        if (isDifferentSession) {
            return;
        }

        console.log("[SpeedNetworking] WebSocket message received:", {
            original: lastMessage.type,
            normalized: normalizedType,
            timestamp: new Date().toISOString()
        });

        // Match found
        if (normalizedType === 'speed_networking_match_found') {
            console.log("[SpeedNetworking] ✅ Match found!");
            const wsMatch = lastMessage.match || messageData.match || messageData;
            if (!matchIncludesUser(wsMatch, currentUser?.id)) {
                console.log("[SpeedNetworking] Ignoring match_found for different user", {
                    wsMatchId: wsMatch?.id,
                    currentUserId: currentUser?.id
                });
                return;
            }
            setCurrentMatch(wsMatch);
            setTransitionMatch(null);
            setInQueue(false);
            setLoading(false);
            if (onEnterMatch) {
                onEnterMatch(wsMatch);
            }

            // WS payload can be partial/stale; fetch authoritative current match (token + participants)
            if (session?.id) {
                (async () => {
                    try {
                        let url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/my-match/`.replace(/([^:]\/)\/+/g, "$1");
                        url = addCacheBust(url);
                        const res = await fetch(url, { headers: authHeader() });
                        if (!res.ok) return;
                        const freshMatch = await res.json();
                        if (!freshMatch?.id || !matchIncludesUser(freshMatch, currentUser?.id)) return;

                        setCurrentMatch(freshMatch);
                        setTransitionMatch(null);
                        setInQueue(false);
                    } catch (err) {
                        console.debug("[SpeedNetworking] Failed to refresh match after WS match_found:", err);
                    }
                })();
            }
        }
        // Match ended - CRITICAL: Update UI immediately AND refresh session
        else if (normalizedType === 'speed_networking_match_ended') {
            const endedMatchId = messageData?.match_id ?? messageData?.id ?? lastMessage?.match?.id;
            if (currentMatch?.id && endedMatchId && String(endedMatchId) !== String(currentMatch.id)) {
                console.log("[SpeedNetworking] Ignoring match_ended for stale/non-current match", {
                    endedMatchId,
                    currentMatchId: currentMatch.id
                });
                return;
            }
            console.log("[SpeedNetworking] ✅ Match ended! Updating UI...");
            const shouldShowBuffer =
                currentMatch &&
                (session?.buffer_seconds || 0) > 0 &&
                isInBufferWindow(currentMatch, session);

            if (shouldShowBuffer) {
                setTransitionMatch(currentMatch);
                setInQueue(false);
            } else {
                setCurrentMatch(null);
                setTransitionMatch(null);
                setInQueue(true);
            }

            // Refresh session after short delay to ensure backend has processed
            setTimeout(() => {
                console.log("[SpeedNetworking] Refreshing session after match end...");
                fetchActiveSession();
            }, 100);
        }
        // Session ended
        else if (normalizedType === 'speed_networking_session_ended') {
            console.log("[SpeedNetworking] Session ended");
            setSession(prev => prev ? { ...prev, status: 'ENDED' } : prev);
            setCurrentMatch(null);
            setTransitionMatch(null);
            setInQueue(false);
        }
        // Session started
        else if (normalizedType === 'speed_networking_session_started') {
            console.log("[SpeedNetworking] Session started");
            // Will be picked up by polling mechanism
        }
        // Queue update
        else if (normalizedType === 'speed_networking_queue_update') {
            console.log("[SpeedNetworking] Queue update:", {
                queue_count: messageData.queue_count,
                active_matches_count: messageData.active_matches_count
            });
            const d = messageData;
            setSession(prev => prev ? {
                ...prev,
                queue_count: d.queue_count ?? prev.queue_count,
                active_matches_count: d.active_matches_count ?? prev.active_matches_count
            } : prev);
        }
        // Host increased round duration
        else if (normalizedType === 'speed_networking_duration_updated') {
            const { new_duration_minutes } = messageData || {};
            console.log("[SpeedNetworking] Duration updated to:", new_duration_minutes);
            if (new_duration_minutes) {
                setSession(prev => prev ? { ...prev, duration_minutes: new_duration_minutes } : prev);
            }
        }
        // One participant requested extension
        else if (normalizedType === 'speed_networking_extension_requested') {
            const { match_id, extension_requested_p1, extension_requested_p2 } = messageData || {};
            console.log("[SpeedNetworking] 🔔 Extension requested on match:", match_id, {
                p1_requested: extension_requested_p1,
                p2_requested: extension_requested_p2,
                current_match_id: currentMatch?.id
            });
            setCurrentMatch(prev => {
                if (prev && String(prev.id) === String(match_id)) {
                    console.log("[SpeedNetworking] ✅ Updating match with extension request state");
                    return { ...prev, extension_requested_p1, extension_requested_p2 };
                } else {
                    console.log("[SpeedNetworking] ❌ Match ID mismatch - not updating");
                    return prev;
                }
            });
        }
        // Both confirmed — extension is live
        else if (normalizedType === 'speed_networking_extension_applied') {
            const { match_id, extended_by_seconds, extension_applied } = messageData || {};
            console.log("[SpeedNetworking] 🎉 Extension applied on match:", match_id, {
                extended_by_seconds,
                current_match_id: currentMatch?.id
            });
            setCurrentMatch(prev => {
                if (prev && String(prev.id) === String(match_id)) {
                    console.log("[SpeedNetworking] ✅ Updating match with extension applied state");
                    return { ...prev, extended_by_seconds, extension_applied,
                        extension_requested_p1: true, extension_requested_p2: true };
                } else {
                    console.log("[SpeedNetworking] ❌ Match ID mismatch - not updating");
                    return prev;
                }
            });
        }
    }, [lastMessage, onEnterMatch, fetchActiveSession, currentMatch, session, currentUser?.id, eventId]);

    // Monitor match status changes (fallback: detect when match ended server-side)
    useEffect(() => {
        if (!currentMatch || !session?.id) return;

        const checkMatchStatus = async () => {
            if (matchStatusPollInFlightRef.current || isDocumentHidden()) return;
            matchStatusPollInFlightRef.current = true;
            try {
                // Check if match is still ACTIVE
                let url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/my-match/`.replace(/([^:]\/)\/+/g, "$1");
                url = addCacheBust(url); // Add cache-bust for fresh status
                const res = await fetch(url, {
                    headers: authHeader()
                });

                if (res.status === 404 || res.status === 400) {
                    // Match ended or user no longer in queue
                    console.log("[SpeedNetworking] Match ended (detected via polling)");
                    setCurrentMatch(null);
                    setTransitionMatch(null);
                    setInQueue(true);
                    return;
                }

                if (!res.ok) return;

                const data = await res.json();

                // If we got a different match, our current match must have ended
                if (data.id && data.id !== currentMatch.id) {
                    console.log("[SpeedNetworking] New match assigned, old match ended");
                    if (isInBufferWindow(data, session) && (session.buffer_seconds || 0) > 0) {
                        setTransitionMatch(data);
                        setCurrentMatch(data);
                        setInQueue(false);
                    } else {
                        setCurrentMatch(data);
                        setTransitionMatch(null);
                    }
                }
            } catch (err) {
                console.debug('[SpeedNetworking] Error checking match status:', err);
            } finally {
                matchStatusPollInFlightRef.current = false;
            }
        };

        // OPTIMIZATION: Increased from 2s to 10s to handle 100+ concurrent users
        // WebSocket notifications handle real-time updates; polling is just fallback
        const interval = setInterval(checkMatchStatus, 10000);  // 10 seconds instead of 2
        return () => clearInterval(interval);
    }, [currentMatch, session, eventId]);

    // When session ends, immediately clear queue and match states
    useEffect(() => {
        if (session && session.status === 'ENDED') {
            setCurrentMatch(null);
            setTransitionMatch(null);
            setInQueue(false);
        }
    }, [session?.status]);

    const fetchMyMatch = useCallback(async () => {
        if (!session?.id) return { matched: false, error: false };
        if (myMatchPollInFlightRef.current) return { matched: false, error: false };

        myMatchPollInFlightRef.current = true;
        const controller = new AbortController();
        myMatchAbortRef.current = controller;
        try {
            let url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/my-match/`.replace(/([^:]\/)\/+/g, "$1");
            url = addCacheBust(url);
            const res = await fetch(url, {
                headers: authHeader(),
                signal: controller.signal
            });

            if (res.status === 404 || res.status === 400) return { matched: false, error: false };
            if (!res.ok) return { matched: false, error: true };

            const data = await res.json();
            if (!data?.id) return { matched: false, error: false };

            if (isInBufferWindow(data, session) && (session.buffer_seconds || 0) > 0) {
                setTransitionMatch(data);
                setCurrentMatch(data);
                setInQueue(false);
            } else {
                setCurrentMatch(data);
                setTransitionMatch(null);
                setInQueue(false);
                if (onEnterMatch) {
                    onEnterMatch(data);
                }
            }
            return { matched: true, error: false };
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('[SpeedNetworking] Error fetching my match:', err);
            }
            return { matched: false, error: err?.name !== 'AbortError' };
        } finally {
            myMatchPollInFlightRef.current = false;
            if (myMatchAbortRef.current === controller) {
                myMatchAbortRef.current = null;
            }
        }
    }, [eventId, onEnterMatch, session]);

    // Join queue with interests
    const handleJoinQueueWithInterests = useCallback(async (interestIds) => {
        if (!session) return;

        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/join/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ interest_ids: interestIds })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to join queue');
            }

            if (data.status === 'matched') {
                if (isInBufferWindow(data.match, session) && (session.buffer_seconds || 0) > 0) {
                    setTransitionMatch(data.match);
                    setCurrentMatch(data.match);
                    setInQueue(false);
                } else {
                    setCurrentMatch(data.match);
                    setTransitionMatch(null);
                    setInQueue(false);
                    // Join Dyte room for this match
                    if (onEnterMatch) {
                        onEnterMatch(data.match);
                    }
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
    }, [eventId, session, onEnterMatch]);

    // Check if interest tags are available
    const checkInterestTags = useCallback(async () => {
        if (!session?.id) return false;
        try {
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/interest-tags/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, { headers: authHeader() });
            if (res.ok) {
                const data = await res.json();
                const tags = Array.isArray(data) ? data : data.results || [];
                return tags.length > 0;
            }
            return false;
        } catch (err) {
            console.error('Error checking interest tags:', err);
            return false;
        }
    }, [eventId, session?.id]);

    // Show interest selector before joining queue (or join directly if no tags)
    const handleJoinQueue = useCallback(async () => {
        if (!session) return;

        // Check if interest tags exist
        if (hasInterestTags === null) {
            const tagsExist = await checkInterestTags();
            setHasInterestTags(tagsExist);
            if (!tagsExist) {
                // No tags, join directly with empty interests
                handleJoinQueueWithInterests([]);
                return;
            }
        } else if (!hasInterestTags) {
            // Already checked and no tags exist, join directly
            handleJoinQueueWithInterests([]);
            return;
        }

        // Tags exist, show selector
        setShowInterestSelector(true);
    }, [session, hasInterestTags, checkInterestTags, handleJoinQueueWithInterests]);

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
            setTransitionMatch(null);
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
        setTransitionMatch(null);
        setInQueue(true);
        setLoading(true);

        try {
            let url = `${API_ROOT}/events/${eventId}/speed-networking/matches/${matchId}/next/`.replace(/([^:]\/)\/+/g, "$1");
            url = addCacheBust(url); // Add cache-bust for fresh result
            const res = await fetch(url, {
                method: 'POST',
                headers: authHeader()
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to get next match');
            }

            // CRITICAL: Refresh session immediately after match end
            // This ensures the match moves from "Active" to "Past" sections
            setTimeout(() => {
                console.log("[SpeedNetworking] Match ended, refreshing session...");
                fetchActiveSession();
            }, 500);

            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error getting next match:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [currentMatch, eventId, fetchActiveSession]);

    const handleMatchTimerExpired = useCallback(() => {
        setTransitionMatch(currentMatch);
    }, [currentMatch]);

    const handleTransitionEnd = useCallback(() => {
        setTransitionMatch(null);
        handleNextMatch();
    }, [handleNextMatch]);

    // Poll for current match when in queue (only if waiting)
    // Uses recursive setTimeout (not setInterval) to avoid overlap request storms.
    useEffect(() => {
        if (!inQueue || !session?.id) return;

        let timeoutId;
        let cancelled = false;
        let backoffMs = 0;
        const minPollMs = 3500;
        const maxPollMs = 20000;

        const scheduleNext = (delayMs) => {
            if (cancelled) return;
            timeoutId = window.setTimeout(tick, delayMs);
        };

        const tick = async () => {
            if (cancelled) return;

            if (isDocumentHidden()) {
                scheduleNext(maxPollMs);
                return;
            }

            const result = await fetchMyMatch();
            if (cancelled || result.matched) return;

            if (result.error) {
                backoffMs = Math.min(maxPollMs, backoffMs > 0 ? backoffMs * 2 : minPollMs);
                scheduleNext(backoffMs);
                return;
            }

            backoffMs = 0;
            scheduleNext(minPollMs);
        };

        // Fast first check, then adaptive polling.
        scheduleNext(250);

        return () => {
            cancelled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
            if (myMatchAbortRef.current) {
                myMatchAbortRef.current.abort();
            }
        };
    }, [inQueue, session, eventId, onEnterMatch]);

    useEffect(() => {
        if (!session?.id || session.status !== 'ACTIVE') return;
        if (inQueue || currentMatch || transitionMatch) return;
        fetchMyMatch();
    }, [session, inQueue, currentMatch, transitionMatch, fetchMyMatch]);

    useEffect(() => {
        if (!autoJoinOnOpen || !session || session.status !== 'ACTIVE') return;
        if (autoJoinAttemptedRef.current) return;
        if (inQueue || currentMatch || transitionMatch) return;

        autoJoinAttemptedRef.current = true;
        handleJoinQueue();
    }, [autoJoinOnOpen, session, inQueue, currentMatch, transitionMatch, handleJoinQueue]);

    // Initial fetch
    useEffect(() => {
        fetchActiveSession();
    }, [fetchActiveSession]);

    // Poll session status periodically (fallback for WebSocket).
    // Guard against overlap and pause polling when tab is hidden.
    useEffect(() => {
        if (!session?.id) return;

        const pollInterval = setInterval(async () => {
            if (sessionPollInFlightRef.current || isDocumentHidden()) return;
            sessionPollInFlightRef.current = true;
            try {
                let url = `${API_ROOT}/events/${eventId}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");
                url = addCacheBust(url); // Add cache-bust for fresh data
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
                        setTransitionMatch(null);
                        setInQueue(false);
                    } else if (activeSession && activeSession.status !== session.status) {
                        // Same session but status changed
                        console.log("[SpeedNetworking] Session status changed to:", activeSession.status);
                        setSession(activeSession);

                        // If session ended, clear match and queue
                        if (activeSession.status === 'ENDED') {
                            setCurrentMatch(null);
                            setTransitionMatch(null);
                            setInQueue(false);
                        }
                    } else if (!activeSession && session) {
                        // Current session was not found (might have been deleted) - treat as ended
                        console.log("[SpeedNetworking] Current session no longer exists");
                        setSession(prev => prev ? { ...prev, status: 'ENDED' } : prev);
                        setCurrentMatch(null);
                        setTransitionMatch(null);
                        setInQueue(false);
                    }
                }
            } catch (err) {
                console.error('[SpeedNetworking] Error polling session status:', err);
            } finally {
                sessionPollInFlightRef.current = false;
            }
        }, 20000); // OPTIMIZATION: Increased from 5s to 20s for 100+ user scalability

        return () => clearInterval(pollInterval);
    }, [session?.id, eventId]);

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
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {transitionMatch ? (
                    <SpeedNetworkingTransition
                        match={transitionMatch}
                        session={session}
                        currentUserId={currentUser?.id}
                        onTransitionEnd={handleTransitionEnd}
                    />
                ) : currentMatch ? (
                    <SpeedNetworkingMatch
                        key={currentMatch.id}
                        match={currentMatch}
                        session={session}
                        onNextMatch={handleNextMatch}
                        onMatchTimerExpired={handleMatchTimerExpired}
                        onLeave={handleLeaveQueue}
                        loading={loading}
                        currentUserId={currentUser?.id}
                        onMemberInfo={handleMemberInfo}
                        eventId={eventId}
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
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    bgcolor: 'rgba(90,120,255,0.05)'
                }}>
                    <Box sx={{ p: 2 }}>
                        <SpeedNetworkingControls
                            eventId={eventId}
                            session={session}
                            onSessionUpdated={fetchActiveSession}
                        />
                    </Box>
                    {session.status === 'ACTIVE' && (
                        <SpeedNetworkingHostPanel
                            eventId={eventId}
                            session={session}
                            lastMessage={lastMessage}
                            onMemberInfo={handleMemberInfo}
                        />
                    )}
                </Box>
            )}

            {/* Interest Selector Dialog */}
            <InterestSelector
                eventId={eventId}
                sessionId={session?.id}
                open={showInterestSelector}
                onClose={() => setShowInterestSelector(false)}
                onSelectInterests={handleJoinQueueWithInterests}
            />
        </Box>
    );
}
