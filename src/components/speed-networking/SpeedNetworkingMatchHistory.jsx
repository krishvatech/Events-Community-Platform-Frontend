import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Card,
    CircularProgress,
    Chip,
    Button,
    Grid,
    Paper,
    Tabs,
    Tab,
    Stack,
    Tooltip,
    IconButton
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { useNavigate } from 'react-router-dom';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const WS_ROOT = API_ROOT.replace(/^http/, "ws").replace(/\/api\/?$/, "");

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function getToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

// Add cache-busting query parameter for URLs that need fresh data
function addCacheBust(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
}

export default function SpeedNetworkingMatchHistory({ eventId, sessionId }) {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionName, setSessionName] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');

    // State to track friend request status for each match partner
    const [friendStatusMap, setFriendStatusMap] = useState({}); // { [userId]: 'none' | 'pending_outgoing' | 'friends' }

    const mergeMatches = (incoming, previous = []) => {
        const map = new Map();
        [...previous, ...incoming].forEach((match) => {
            if (!match || match.match_id === null || match.match_id === undefined) return;
            map.set(String(match.match_id), match);
        });
        return Array.from(map.values()).sort((a, b) => {
            const aTime = a?.ended_at ? new Date(a.ended_at).getTime() : 0;
            const bTime = b?.ended_at ? new Date(b.ended_at).getTime() : 0;
            return bTime - aTime;
        });
    };

    // Poll for past matches every 5 seconds to detect completed matches
    useEffect(() => {
        if (!sessionId || !eventId) return;

        // Initial fetch
        fetchUserMatches();

        // Poll every 5 seconds when session is active
        const interval = setInterval(() => {
            console.log("[MatchHistory] Polling for updated past matches...");
            fetchUserMatches();
        }, 5000);

        return () => clearInterval(interval);
    }, [eventId, sessionId]);

    useEffect(() => {
        if (!sessionId || !eventId) return;

        let ws = null;
        let reconnectTimer = null;
        let closedByCleanup = false;

        const connect = () => {
            const token = getToken();
            const qs = token ? `?token=${encodeURIComponent(token)}` : "";
            const wsUrl = `${WS_ROOT}/ws/events/${eventId}/${qs}`.replace(/([^:]\/)\/+/g, "$1");
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                fetchUserMatches();
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const normalizedType = (msg?.type || "").replace(/\./g, "_");
                    const data = msg?.data || {};

                    if (normalizedType === 'speed_networking_match_finalized') {
                        if (Number(data.session_id) !== Number(sessionId)) return;
                        if (!data.match) return;
                        setMatches(prev => mergeMatches([data.match], prev));
                    } else if (normalizedType === 'speed_networking_match_ended') {
                        // Fallback consistency: pull latest persisted match list.
                        fetchUserMatches();
                    }
                } catch (err) {
                    console.error('[MatchHistory] Failed to process WS message:', err);
                }
            };

            ws.onclose = () => {
                if (closedByCleanup) return;
                reconnectTimer = setTimeout(connect, 1500);
            };
        };

        connect();

        return () => {
            closedByCleanup = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws && ws.readyState <= WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [eventId, sessionId]);

    const fetchUserMatches = async () => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let url = `${API_ROOT}/events/${eventId}/speed-networking/${sessionId}/user-matches/`.replace(/([^:]\/)\/+/g, "$1");
            url = addCacheBust(url); // Add cache-bust for fresh match data
            const res = await fetch(url, { headers: authHeader() });

            if (!res.ok) {
                throw new Error('Failed to fetch matches');
            }

            const data = await res.json();
            setMatches(prev => mergeMatches(data.matches || [], prev));
            setSessionName(data.session_name || '');

            // Optimistically checking friend status if available in data, otherwise defaults to 'none'
            // Using a simple effect to load status could be better but let's init map first
            // Note: The backend response might need to include friend status for this to be perfect on load.
            // For now, we assume 'none' and let the user click connect.
        } catch (err) {
            console.error('[MatchHistory] Error fetching matches:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Logic to send friend request
    const handleConnect = async (partnerId) => {
        if (!partnerId) return;

        // Optimistic update
        setFriendStatusMap(prev => ({ ...prev, [partnerId]: 'pending_outgoing' }));

        try {
            const res = await fetch(`${API_ROOT}/friend-requests/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader(),
                },
                body: JSON.stringify({ to_user: Number(partnerId) }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // Revert optimistic update if failed
                if (data.detail && data.detail.includes("already sent")) {
                    setFriendStatusMap(prev => ({ ...prev, [partnerId]: 'pending_outgoing' }));
                } else if (data.detail && data.detail.includes("already friends")) {
                    setFriendStatusMap(prev => ({ ...prev, [partnerId]: 'friends' }));
                } else {
                    setFriendStatusMap(prev => ({ ...prev, [partnerId]: 'none' }));
                    // alert(data.detail || "Failed to send request");
                }
            } else {
                // Success
                const status = (data.status || 'pending_outgoing').toLowerCase();
                setFriendStatusMap(prev => ({ ...prev, [partnerId]: status }));
            }
        } catch (err) {
            console.error("Failed to connect:", err);
            setFriendStatusMap(prev => ({ ...prev, [partnerId]: 'none' }));
        }
    };

    // Helper to open profile
    const handleOpenProfile = (user) => {
        if (user?.id) {
            navigate(`/community/rich-profile/${user.id}`, { state: { user } });
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const getMatchScorePercent = (rawScore) => {
        const score = Number(rawScore);
        if (!Number.isFinite(score)) return null;
        return Math.max(0, Math.min(100, score));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ py: 2, px: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fee2e2' }}>
                <Typography sx={{ color: '#ef4444' }}>
                    Error: {error}
                </Typography>
            </Box>
        );
    }

    if (matches.length === 0) {
        return (
            <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 4, px: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    No matches yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Join the speed networking session to start connecting!
                </Typography>
            </Box>
        );
    }

    // Filter matches based on selected tab
    const filteredMatches = selectedTab === 'all'
        ? matches
        : matches.filter(m => m.status === selectedTab.toUpperCase());

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, color: 'text.primary' }}>
                    Your Matches
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {sessionName} • {matches.length} {matches.length === 1 ? 'connection' : 'connections'}
                </Typography>
            </Box>

            {/* Tabs */}
            <Tabs
                value={selectedTab}
                onChange={(e, newValue) => setSelectedTab(newValue)}
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    mb: 4,
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        minHeight: 48,
                    },
                }}
            >
                <Tab label={`All (${matches.length})`} value="all" />
                <Tab label={`Completed (${matches.filter(m => m.status === 'COMPLETED').length})`} value="completed" />
                <Tab label={`Skipped (${matches.filter(m => m.status === 'SKIPPED').length})`} value="skipped" />
            </Tabs>

            {/* Matches Grid */}
            <Grid container spacing={3}>
                {filteredMatches.map((match) => {
                    const partnerId = match.partner?.id;
                    const requestStatus = friendStatusMap[partnerId] || 'none';
                    const isPending = requestStatus === 'pending_outgoing' || requestStatus === 'requested';
                    const isFriend = requestStatus === 'friends' || requestStatus === 'accepted';

                    return (
                        <Grid item xs={12} sm={6} md={4} key={match.match_id}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        borderColor: '#cbd5e1',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                    }
                                }}
                            >
                                <Box sx={{ p: 2.5, flex: 1 }}>
                                    {/* Partner Info */}
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        mb: 2.5,
                                        cursor: 'pointer'
                                    }} onClick={() => handleOpenProfile(match.partner)}>
                                        <Avatar
                                            src={match.partner.avatar_url}
                                            alt={match.partner.first_name}
                                            sx={{ width: 56, height: 56, bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 700 }}
                                        >
                                            {(match.partner.first_name || 'U').charAt(0)}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle1" sx={{
                                                fontWeight: 700,
                                                lineHeight: 1.2,
                                                mb: 0.5,
                                                color: 'text.primary',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5
                                            }} noWrap>
                                                {match.partner.first_name || match.partner.username} {match.partner.last_name}
                                                {(match.partner.kyc_status === 'APPROVED' || match.partner.kyc_status === 'VERIFIED') && (
                                                    <Tooltip title="Verified Member">
                                                        <VerifiedIcon sx={{ fontSize: 16, color: '#22d3ee' }} />
                                                    </Tooltip>
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Match Details */}
                                    <Box sx={{
                                        py: 2,
                                        borderTop: '1px solid #f1f5f9',
                                        borderBottom: '1px solid #f1f5f9',
                                        mb: 2.5
                                    }}>
                                        <Stack spacing={1.5}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                                    DURATION
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                                    {formatDuration(match.duration_seconds)}
                                                </Typography>
                                            </Box>

                                            {match.match_score !== null && match.match_score !== undefined && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                                        MATCH SCORE
                                                    </Typography>
                                                    {(() => {
                                                        const scorePercent = getMatchScorePercent(match.match_score);
                                                        if (scorePercent === null) return null;
                                                        return (
                                                            <Typography variant="body2" fontWeight={700} sx={{
                                                                color: scorePercent >= 70 ? '#16a34a' : scorePercent >= 50 ? '#d97706' : '#dc2626',
                                                            }}>
                                                                {scorePercent.toFixed(0)}%
                                                            </Typography>
                                                        );
                                                    })()}
                                                </Box>
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Status Badge */}
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        {match.status === 'COMPLETED' ? (
                                            <Chip
                                                icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
                                                label="Completed"
                                                size="small"
                                                sx={{
                                                    bgcolor: '#f0fdf4',
                                                    color: '#16a34a',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    height: 24,
                                                    '& .MuiChip-icon': { color: '#16a34a' }
                                                }}
                                            />
                                        ) : (
                                            <Chip
                                                icon={<BlockIcon style={{ fontSize: 16 }} />}
                                                label="Skipped"
                                                size="small"
                                                sx={{
                                                    bgcolor: '#fef2f2',
                                                    color: '#dc2626',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    height: 24,
                                                    '& .MuiChip-icon': { color: '#dc2626' }
                                                }}
                                            />
                                        )}
                                    </Box>

                                    {/* Action Button */}
                                    {isFriend ? (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            disabled
                                            startIcon={<CheckCircleRoundedIcon />}
                                            sx={{ borderRadius: 2, textTransform: 'none' }}
                                        >
                                            Connected
                                        </Button>
                                    ) : isPending ? (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            disabled
                                            startIcon={<CheckCircleRoundedIcon />}
                                            sx={{ borderRadius: 2, textTransform: 'none' }}
                                        >
                                            Request Sent
                                        </Button>
                                    ) : (
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            startIcon={<PersonAddAlt1RoundedIcon />}
                                            onClick={() => handleConnect(partnerId)}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                borderColor: '#e2e8f0',
                                                color: 'text.primary',
                                                '&:hover': {
                                                    borderColor: '#cbd5e1',
                                                    bgcolor: '#f8fafc'
                                                }
                                            }}
                                        >
                                            Connect
                                        </Button>
                                    )}
                                </Box>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Empty State Message */}
            {filteredMatches.length === 0 && matches.length > 0 && (
                <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 4, px: 3, border: '1px dashed #e2e8f0', mt: 2 }}>
                    <Typography color="text.secondary">
                        No matches found in this category
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
