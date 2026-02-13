import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Chip,
    IconButton,
    Collapse,
    Divider,
    Tooltip,
    CircularProgress,
    Button,
    Tabs,
    Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SpeedNetworkingHostPanel({
    eventId,
    session,
    lastMessage
}) {
    const [queueEntries, setQueueEntries] = useState([]);
    const [pastMatches, setPastMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [removing, setRemoving] = useState(null);
    const [selectedTab, setSelectedTab] = useState('waiting');

    const fetchQueue = async () => {
        if (!session?.id) {
            console.log('[HostPanel] fetchQueue: session.id not available');
            return;
        }
        try {
            setLoading(true);
            const queueUrl = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/queue/`.replace(/([^:]\/)\/+/g, "$1");
            const sessionUrl = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/`.replace(/([^:]\/)\/+/g, "$1");

            console.log('[HostPanel] Fetching queue and session data at', new Date().toISOString());

            // Fetch both queue entries and full session data (which includes all matches)
            const [queueRes, sessionRes] = await Promise.all([
                fetch(queueUrl, { headers: authHeader() }),
                fetch(sessionUrl, { headers: authHeader() })
            ]);

            if (queueRes.ok) {
                const queueData = await queueRes.json();
                console.log('[HostPanel] Queue fetch successful! Got', queueData.length, 'entries at', new Date().toISOString());
                setQueueEntries(queueData);
            } else {
                console.error('[HostPanel] Queue fetch failed with status:', queueRes.status);
            }

            // Extract past matches from the full session data
            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                console.log('[HostPanel] Session fetch successful! Got matches:', sessionData.matches);

                if (sessionData.matches && Array.isArray(sessionData.matches)) {
                    const past = sessionData.matches.filter(m => m.status === 'COMPLETED' || m.status === 'SKIPPED');
                    console.log('[HostPanel] Extracted', past.length, 'past matches');
                    setPastMatches(past);
                }
            } else {
                console.error('[HostPanel] Session fetch failed with status:', sessionRes.status);
            }
        } catch (err) {
            console.error('[HostPanel] Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchQueue();
    }, [session?.id, eventId]);

    // Refetch when queue updates via WebSocket
    useEffect(() => {
        if (!lastMessage) {
            console.log('[HostPanel] lastMessage is null, skipping');
            return;
        }
        const messageType = lastMessage.type;
        console.log('[HostPanel] Received WebSocket message:', {
            type: messageType,
            data: lastMessage.data,
            timestamp: new Date().toISOString()
        });

        if (messageType === 'speed_networking_queue_update' || messageType === 'speed_networking.queue_update') {
            console.log('[HostPanel] Queue update message matched! Scheduling fetchQueue...');
            // Add small delay to ensure database transaction has committed
            setTimeout(() => {
                console.log('[HostPanel] Calling fetchQueue() after 100ms delay');
                fetchQueue();
            }, 100);
        } else {
            console.log('[HostPanel] Message type does not match. Expected "speed_networking_queue_update", got:', messageType);
        }
    }, [lastMessage]);

    const handleRemoveUser = async (userId) => {
        if (!session?.id) return;
        try {
            setRemoving(userId);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/remove-from-queue/${userId}/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: authHeader()
            });
            if (res.ok) {
                // Refresh the queue list
                await fetchQueue();
            } else {
                console.error('[HostPanel] Failed to remove user:', res.status);
            }
        } catch (err) {
            console.error('[HostPanel] Error removing user:', err);
        } finally {
            setRemoving(null);
        }
    };

    // Calculate stats
    const waitingCount = queueEntries.filter(e => !e.current_match).length;
    const matchedCount = queueEntries.filter(e => e.current_match).length;

    // Get matched pairs (only ACTIVE matches, not SKIPPED or COMPLETED)
    const matchedPairs = [];
    const seenMatches = new Set();
    queueEntries.forEach(entry => {
        console.log('[HostPanel] Queue entry:', {
            userId: entry.user?.id,
            userName: entry.user?.first_name || entry.user?.username,
            hasMatch: !!entry.current_match,
            matchStatus: entry.current_match?.status,
            matchId: entry.current_match?.id
        });

        if (entry.current_match && entry.current_match.status === 'ACTIVE' && !seenMatches.has(entry.current_match.id)) {
            seenMatches.add(entry.current_match.id);
            matchedPairs.push(entry.current_match);
        }
    });

    console.log('[HostPanel] Calculated stats:', {
        totalEntries: queueEntries.length,
        waitingCount,
        matchedCount,
        matchedPairsCount: matchedPairs.length,
        pastMatchesCount: pastMatches.length
    });

    return (
        <Box sx={{
            p: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            bgcolor: 'rgba(34,197,94,0.05)',
            maxHeight: expanded ? '600px' : 'auto',
            overflow: expanded ? 'auto' : 'hidden',
            transition: 'max-height 0.3s ease-in-out'
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: expanded ? 2 : 0
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon sx={{ color: '#22c55e' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                        Queue Management
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            {/* Tabs and Content */}
            {expanded && (
                <>
                    {/* Tab Navigation */}
                    <Tabs
                        value={selectedTab}
                        onChange={(e, newValue) => setSelectedTab(newValue)}
                        sx={{
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            mb: 2,
                            '& .MuiTab-root': {
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: 13,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                minHeight: 40,
                                '&.Mui-selected': {
                                    color: '#fff'
                                }
                            },
                            '& .MuiTabs-indicator': {
                                bgcolor: '#5a78ff'
                            }
                        }}
                    >
                        <Tab label={`Waiting (${waitingCount})`} value="waiting" />
                        <Tab label={`Active Matches (${matchedPairs.length})`} value="active" />
                        <Tab label={`Past Matches (${pastMatches.length})`} value="past" />
                    </Tabs>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <>
                            {/* Waiting Tab */}
                            {selectedTab === 'waiting' && (
                                <>
                                    {waitingCount > 0 ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {queueEntries.filter(e => !e.current_match).map((entry) => (
                                                <Box
                                                    key={entry.id}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        p: 1.5,
                                                        bgcolor: 'rgba(255,255,255,0.04)',
                                                        borderRadius: 1,
                                                        border: '1px solid rgba(255,255,255,0.08)'
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                                        <Avatar
                                                            src={entry.user?.avatar_url}
                                                            alt={entry.user?.first_name}
                                                            sx={{ width: 32, height: 32 }}
                                                        >
                                                            {entry.user?.first_name?.charAt(0) || 'U'}
                                                        </Avatar>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 13,
                                                                fontWeight: 500,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {entry.user?.first_name || entry.user?.username}
                                                            </Typography>
                                                            <Typography sx={{
                                                                color: 'rgba(255,255,255,0.5)',
                                                                fontSize: 11
                                                            }}>
                                                                {new Date(entry.joined_at).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Tooltip title="Remove from queue">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleRemoveUser(entry.user.id)}
                                                            disabled={removing === entry.user.id}
                                                            sx={{
                                                                color: 'rgba(255,255,255,0.5)',
                                                                '&:hover': { color: '#ef4444' },
                                                                ml: 1
                                                            }}
                                                        >
                                                            {removing === entry.user.id ? (
                                                                <CircularProgress size={18} />
                                                            ) : (
                                                                <DeleteIcon fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography sx={{
                                            color: 'rgba(255,255,255,0.4)',
                                            fontSize: 13,
                                            textAlign: 'center',
                                            py: 2
                                        }}>
                                            No one waiting
                                        </Typography>
                                    )}
                                </>
                            )}

                            {/* Active Matches Tab */}
                            {selectedTab === 'active' && (
                                <>
                                    {matchedPairs.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {matchedPairs.map((match) => (
                                                <Box
                                                    key={match.id}
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor: 'rgba(34,197,94,0.1)',
                                                        borderRadius: 1,
                                                        border: '1px solid rgba(34,197,94,0.3)'
                                                    }}
                                                >
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 1
                                                    }}>
                                                        {/* Participant 1 */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                            <Avatar
                                                                alt={match.participant_1?.first_name}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {match.participant_1?.first_name?.charAt(0) || 'P'}
                                                            </Avatar>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {match.participant_1?.first_name || match.participant_1?.username}
                                                            </Typography>
                                                        </Box>

                                                        {/* Separator */}
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.4)',
                                                            fontSize: 12,
                                                            px: 1,
                                                            flexShrink: 0
                                                        }}>
                                                            ↔
                                                        </Typography>

                                                        {/* Participant 2 */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                textAlign: 'right'
                                                            }}>
                                                                {match.participant_2?.first_name || match.participant_2?.username}
                                                            </Typography>
                                                            <Avatar
                                                                alt={match.participant_2?.first_name}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {match.participant_2?.first_name?.charAt(0) || 'P'}
                                                            </Avatar>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography sx={{
                                            color: 'rgba(255,255,255,0.4)',
                                            fontSize: 13,
                                            textAlign: 'center',
                                            py: 2
                                        }}>
                                            No active matches
                                        </Typography>
                                    )}
                                </>
                            )}

                            {/* Past Matches Tab */}
                            {selectedTab === 'past' && (
                                <>
                                    {pastMatches.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {pastMatches.map((match) => (
                                                <Box
                                                    key={match.id}
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor: 'rgba(107,114,128,0.1)',
                                                        borderRadius: 1,
                                                        border: '1px solid rgba(107,114,128,0.3)'
                                                    }}
                                                >
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 1,
                                                        mb: 1
                                                    }}>
                                                        {/* Participant 1 */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                            <Avatar
                                                                alt={match.participant_1?.first_name}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {match.participant_1?.first_name?.charAt(0) || 'P'}
                                                            </Avatar>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {match.participant_1?.first_name || match.participant_1?.username}
                                                            </Typography>
                                                        </Box>

                                                        {/* Separator */}
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.4)',
                                                            fontSize: 12,
                                                            px: 1,
                                                            flexShrink: 0
                                                        }}>
                                                            ↔
                                                        </Typography>

                                                        {/* Participant 2 */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                textAlign: 'right'
                                                            }}>
                                                                {match.participant_2?.first_name || match.participant_2?.username}
                                                            </Typography>
                                                            <Avatar
                                                                alt={match.participant_2?.first_name}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {match.participant_2?.first_name?.charAt(0) || 'P'}
                                                            </Avatar>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.5)',
                                                            fontSize: 11
                                                        }}>
                                                            {match.status === 'COMPLETED' ? '✓ Completed' : '⊘ Skipped'}
                                                        </Typography>
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.4)',
                                                            fontSize: 10
                                                        }}>
                                                            {new Date(match.ended_at).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography sx={{
                                            color: 'rgba(255,255,255,0.4)',
                                            fontSize: 13,
                                            textAlign: 'center',
                                            py: 2
                                        }}>
                                            No past matches
                                        </Typography>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </Box>
    );
}
