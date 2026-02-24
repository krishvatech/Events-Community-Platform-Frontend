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
    Tab,
    Slider,
    Switch,
    FormControlLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    LinearProgress,
    Card,
    CardContent,
    Alert,
    Autocomplete,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stepper,
    Step,
    StepLabel,
    Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
import InterestTagManager from './InterestTagManager';
import InterestCriteriaConfig from './InterestCriteriaConfig';
import CollapsibleMatchingCriteria from './CollapsibleMatchingCriteria';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function addCacheBust(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
}

// OPTIMIZATION: Fetch with timeout for host panel
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

export default function SpeedNetworkingHostPanel({
    eventId,
    session,
    lastMessage,
    onMemberInfo
}) {
    const [queueEntries, setQueueEntries] = useState([]);
    const [pastMatches, setPastMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [removing, setRemoving] = useState(null);
    const [selectedTab, setSelectedTab] = useState('waiting');
    const [criteriaConfig, setCriteriaConfig] = useState(null);
    const [savingCriteria, setSavingCriteria] = useState(false);
    const [matchPreview, setMatchPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [testUserAId, setTestUserAId] = useState(null);
    const [testUserBId, setTestUserBId] = useState(null);
    const [testMatchResult, setTestMatchResult] = useState(null);
    const [testingMatch, setTestingMatch] = useState(false);

    // Setup Wizard states
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [tempCriteriaConfig, setTempCriteriaConfig] = useState(null);

    const mergePastMatches = (incoming, previous = []) => {
        const map = new Map();
        [...previous, ...incoming].forEach((match) => {
            if (!match) return;
            const key = match.id ?? match.match_id;
            if (key === null || key === undefined) return;
            map.set(String(key), match);
        });
        return Array.from(map.values()).sort((a, b) => {
            const aTime = a?.ended_at ? new Date(a.ended_at).getTime() : 0;
            const bTime = b?.ended_at ? new Date(b.ended_at).getTime() : 0;
            return bTime - aTime;
        });
    };

    const fetchQueue = async () => {
        if (!session?.id) {
            console.log('[HostPanel] fetchQueue: session.id not available');
            return;
        }
        try {
            setLoading(true);
            let queueUrl = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/queue/`.replace(/([^:]\/)\/+/g, "$1");
            let sessionUrl = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/`.replace(/([^:]\/)\/+/g, "$1");
            queueUrl = addCacheBust(queueUrl);
            sessionUrl = addCacheBust(sessionUrl);

            console.log('[HostPanel] Fetching queue and session data at', new Date().toISOString());

            // Fetch both queue entries and full session data (which includes all matches)
            const [queueRes, sessionRes] = await Promise.all([
                fetch(queueUrl, { headers: authHeader(), cache: 'no-store' }),
                fetch(sessionUrl, { headers: authHeader(), cache: 'no-store' })
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
                    setPastMatches(prev => mergePastMatches(past, prev));
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

        const shouldRefresh =
            messageType === 'speed_networking_queue_update' ||
            messageType === 'speed_networking.queue_update' ||
            messageType === 'speed_networking_match_finalized' ||
            messageType === 'speed_networking.match_finalized' ||
            messageType === 'speed_networking_match_ended' ||
            messageType === 'speed_networking.match_ended';

        if (messageType === 'speed_networking_match_finalized' || messageType === 'speed_networking.match_finalized') {
            const finalized = lastMessage?.data?.match;
            if (finalized) {
                setPastMatches(prev => mergePastMatches([finalized], prev));
            }
        }

        if (shouldRefresh) {
            console.log('[HostPanel] Queue update message matched! Fetching queue...');
            // OPTIMIZATION: Single fetch with delay instead of double fetch
            // Remove the double 100ms and 800ms delay pattern that was causing excessive API calls
            setTimeout(() => {
                console.log('[HostPanel] Calling fetchQueue() after 300ms delay');
                fetchQueue();
            }, 300);
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

    const fetchCriteriaConfig = async () => {
        if (!session?.id) return;
        try {
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, { headers: authHeader() });
            if (res.ok) {
                const sessionData = await res.json();
                setCriteriaConfig(sessionData.criteria_config);
                console.log('[HostPanel] Fetched criteria config:', sessionData.criteria_config);
            }
        } catch (err) {
            console.error('[HostPanel] Error fetching criteria config:', err);
        }
    };

    const fetchMatchPreview = async () => {
        if (!session?.id) return;
        try {
            setLoadingPreview(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/match_preview/`.replace(/([^:]\/)\/+/g, "$1");
            console.log('[HostPanel] Fetching match preview from:', url);
            const res = await fetch(url, { headers: authHeader() });
            if (res.ok) {
                const data = await res.json();
                setMatchPreview(data);
                console.log('[HostPanel] Match preview received:', data);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('[HostPanel] API error:', res.status, errorData);
                setMatchPreview(null); // Don't show card if API fails
            }
        } catch (err) {
            console.error('[HostPanel] Error fetching match preview:', err);
            setMatchPreview(null); // Don't show card on error
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleSaveCriteria = async () => {
        if (!session?.id || !criteriaConfig) return;
        try {
            setSavingCriteria(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/update_criteria/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteria_config: criteriaConfig })
            });
            if (res.ok) {
                console.log('[HostPanel] Criteria saved successfully');
                // Refresh preview after saving
                await fetchMatchPreview();
            } else {
                const errorData = await res.json();
                console.error('[HostPanel] Failed to save criteria:', errorData);
                alert('Failed to save criteria: ' + (errorData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('[HostPanel] Error saving criteria:', err);
            alert('Error saving criteria: ' + err.message);
        } finally {
            setSavingCriteria(false);
        }
    };

    const handleNormalizeWeights = () => {
        if (!criteriaConfig) return;
        const enabledCriteria = Object.entries(criteriaConfig)
            .filter(([_, config]) => config.enabled)
            .map(([key, _]) => key);

        if (enabledCriteria.length === 0) return;

        const totalWeight = enabledCriteria.reduce((sum, key) => sum + (criteriaConfig[key].weight || 0), 0);
        if (totalWeight === 0) return;

        const normalized = { ...criteriaConfig };
        enabledCriteria.forEach(key => {
            normalized[key] = {
                ...normalized[key],
                weight: parseFloat((normalized[key].weight / totalWeight).toFixed(2))
            };
        });
        setCriteriaConfig(normalized);
    };

    const handleTestMatchScore = async () => {
        if (!session?.id || !testUserAId || !testUserBId) return;
        try {
            setTestingMatch(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/test_match_score/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_a_id: testUserAId,
                    user_b_id: testUserBId
                })
            });
            if (res.ok) {
                const data = await res.json();
                setTestMatchResult(data);
                console.log('[HostPanel] Test match score result:', data);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('[HostPanel] Failed to test match score:', errorData);
                alert('Failed to test match score: ' + (errorData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('[HostPanel] Error testing match score:', err);
            alert('Error testing match score: ' + err.message);
        } finally {
            setTestingMatch(false);
        }
    };

    // Setup Wizard Handlers
    const openWizard = () => {
        setTempCriteriaConfig(criteriaConfig ? { ...criteriaConfig } : {});
        setWizardStep(0);
        setWizardOpen(true);
    };

    const closeWizard = () => {
        setWizardOpen(false);
        setWizardStep(0);
        setTempCriteriaConfig(null);
    };

    const handleWizardNext = () => {
        if (wizardStep < 2) {
            setWizardStep(wizardStep + 1);
        }
    };

    const handleWizardBack = () => {
        if (wizardStep > 0) {
            setWizardStep(wizardStep - 1);
        }
    };

    const handleWizardFinish = async () => {
        // Save the temp criteria config
        if (tempCriteriaConfig) {
            setCriteriaConfig(tempCriteriaConfig);
            // Save to backend
            try {
                setSavingCriteria(true);
                const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/update_criteria/`.replace(/([^:]\/)\/+/g, "$1");
                const res = await fetch(url, {
                    method: 'PATCH',
                    headers: { ...authHeader(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ criteria_config: tempCriteriaConfig })
                });
                if (res.ok) {
                    console.log('[HostPanel] Wizard criteria saved successfully');
                    await fetchMatchPreview();
                } else {
                    const errorData = await res.json();
                    console.error('[HostPanel] Failed to save wizard criteria:', errorData);
                }
            } catch (err) {
                console.error('[HostPanel] Error saving wizard criteria:', err);
            } finally {
                setSavingCriteria(false);
            }
        }
        closeWizard();
    };

    // Load criteria config when tab changes to settings
    useEffect(() => {
        if (selectedTab === 'settings') {
            if (!criteriaConfig) {
                fetchCriteriaConfig();
            }
            // OPTIMIZATION: Only fetch preview when tab changes, not on every queueEntries change
            // This prevents waterfall of API calls
            fetchMatchPreview();
        }
    }, [selectedTab]);  // FIXED: Removed queueEntries from dependency array

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
                        <Tab label="Test Match" value="test" />
                        <Tab label="Settings" value="settings" />
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
                                                    <Box
                                                        onClick={() => onMemberInfo && onMemberInfo(entry.user)}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1.5,
                                                            flex: 1,
                                                            cursor: onMemberInfo ? 'pointer' : 'default',
                                                            transition: 'opacity 0.2s',
                                                            '&:hover': onMemberInfo ? { opacity: 0.85 } : {},
                                                            padding: 0.5,
                                                            marginLeft: -0.5,
                                                            borderRadius: 0.5
                                                        }}
                                                    >
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
                                                    {/* Config Version Indicator */}
                                                    {match.config_version !== undefined && session?.config_version !== undefined && (
                                                        <Box sx={{ mb: 1 }}>
                                                            <Chip
                                                                label={
                                                                    match.config_version === session.config_version
                                                                        ? 'Current Config'
                                                                        : `Old Config (v${match.config_version})`
                                                                }
                                                                color={match.config_version === session.config_version ? 'success' : 'warning'}
                                                                size="small"
                                                                sx={{
                                                                    height: 24,
                                                                    fontSize: 11
                                                                }}
                                                            />
                                                        </Box>
                                                    )}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 1
                                                    }}>
                                                        {/* Participant 1 */}
                                                        <Box
                                                            onClick={() => onMemberInfo && onMemberInfo(match.participant_1)}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                flex: 1,
                                                                minWidth: 0,
                                                                cursor: onMemberInfo ? 'pointer' : 'default',
                                                                transition: 'opacity 0.2s',
                                                                '&:hover': onMemberInfo ? { opacity: 0.85 } : {},
                                                                padding: 0.5,
                                                                marginLeft: -0.5,
                                                                borderRadius: 0.5
                                                            }}
                                                        >
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
                                                        <Box
                                                            onClick={() => onMemberInfo && onMemberInfo(match.participant_2)}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                flex: 1,
                                                                minWidth: 0,
                                                                cursor: onMemberInfo ? 'pointer' : 'default',
                                                                transition: 'opacity 0.2s',
                                                                '&:hover': onMemberInfo ? { opacity: 0.85 } : {},
                                                                padding: 0.5,
                                                                marginRight: -0.5,
                                                                borderRadius: 0.5
                                                            }}
                                                        >
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

                                                    {/* Match Quality Display */}
                                                    {match.match_probability !== undefined && (
                                                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography sx={{
                                                                color: 'rgba(255,255,255,0.7)',
                                                                fontSize: 11
                                                            }}>
                                                                Quality:
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={match.match_probability || 0}
                                                                sx={{
                                                                    flex: 1,
                                                                    height: 4,
                                                                    borderRadius: 2,
                                                                    bgcolor: 'rgba(255,255,255,0.1)',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        bgcolor: match.match_probability > 75 ? '#22c55e' : match.match_probability > 50 ? '#f59e0b' : '#ef4444',
                                                                        borderRadius: 2
                                                                    }
                                                                }}
                                                            />
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                minWidth: 30,
                                                                textAlign: 'right'
                                                            }}>
                                                                {(match.match_probability || 0).toFixed(0)}%
                                                            </Typography>
                                                        </Box>
                                                    )}
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
                                                        <Box
                                                            onClick={() => onMemberInfo && onMemberInfo(match.participant_1)}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                flex: 1,
                                                                minWidth: 0,
                                                                cursor: onMemberInfo ? 'pointer' : 'default',
                                                                transition: 'opacity 0.2s',
                                                                '&:hover': onMemberInfo ? { opacity: 0.85 } : {},
                                                                padding: 0.5,
                                                                marginLeft: -0.5,
                                                                borderRadius: 0.5
                                                            }}
                                                        >
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
                                                        <Box
                                                            onClick={() => onMemberInfo && onMemberInfo(match.participant_2)}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                flex: 1,
                                                                minWidth: 0,
                                                                cursor: onMemberInfo ? 'pointer' : 'default',
                                                                transition: 'opacity 0.2s',
                                                                '&:hover': onMemberInfo ? { opacity: 0.85 } : {},
                                                                padding: 0.5,
                                                                marginRight: -0.5,
                                                                borderRadius: 0.5
                                                            }}
                                                        >
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

                            {/* Test Match Tab */}
                            {selectedTab === 'test' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Alert severity="info" sx={{ bgcolor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' }}>
                                        <Typography sx={{ fontSize: 13, color: '#fff' }}>
                                            Select two users from the waiting queue to preview their match score with current criteria settings.
                                        </Typography>
                                    </Alert>

                                    {/* User Selection */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Autocomplete
                                            options={queueEntries.filter(e => !e.current_match).map(e => ({
                                                id: e.user.id,
                                                label: `${e.user.first_name || e.user.username}`,
                                                user: e.user
                                            }))}
                                            getOptionLabel={(option) => option.label}
                                            value={testUserAId ? { id: testUserAId, label: queueEntries.find(e => e.user.id === testUserAId)?.user?.first_name || 'User A' } : null}
                                            onChange={(e, value) => setTestUserAId(value?.id || null)}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Select User A"
                                                    size="small"
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            color: '#fff',
                                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                                                        },
                                                        '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)' },
                                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                                                    }}
                                                />
                                            )}
                                        />

                                        <Autocomplete
                                            options={queueEntries.filter(e => !e.current_match && e.user.id !== testUserAId).map(e => ({
                                                id: e.user.id,
                                                label: `${e.user.first_name || e.user.username}`,
                                                user: e.user
                                            }))}
                                            getOptionLabel={(option) => option.label}
                                            value={testUserBId ? { id: testUserBId, label: queueEntries.find(e => e.user.id === testUserBId)?.user?.first_name || 'User B' } : null}
                                            onChange={(e, value) => setTestUserBId(value?.id || null)}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Select User B"
                                                    size="small"
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            color: '#fff',
                                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                                                        },
                                                        '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)' },
                                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                                                    }}
                                                />
                                            )}
                                        />

                                        <Button
                                            variant="contained"
                                            onClick={handleTestMatchScore}
                                            disabled={!testUserAId || !testUserBId || testingMatch}
                                            sx={{
                                                bgcolor: '#5a78ff',
                                                color: '#fff',
                                                '&:hover': { bgcolor: '#4a68ef' }
                                            }}
                                        >
                                            {testingMatch ? <CircularProgress size={20} sx={{ mr: 1 }} /> : ''}
                                            {testingMatch ? 'Testing...' : 'Test Match Score'}
                                        </Button>
                                    </Box>

                                    {/* Test Result */}
                                    {testMatchResult && (
                                        <Card sx={{
                                            bgcolor: 'rgba(90,120,255,0.1)',
                                            borderRadius: 2,
                                            border: '1px solid rgba(90,120,255,0.3)'
                                        }}>
                                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    pb: 1,
                                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    <Typography sx={{
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        fontSize: 14
                                                    }}>
                                                        Match Score Results
                                                    </Typography>
                                                    <Chip
                                                        label={`v${testMatchResult.config_version || 1}`}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: 10,
                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                            color: 'rgba(255,255,255,0.7)'
                                                        }}
                                                    />
                                                </Box>

                                                {/* User Pair */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 2
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                                        <Avatar sx={{ width: 32, height: 32 }}>
                                                            {testMatchResult.user_a?.name?.charAt(0) || 'A'}
                                                        </Avatar>
                                                        <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                                                            {testMatchResult.user_a?.name}
                                                        </Typography>
                                                    </Box>
                                                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>↔</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
                                                        <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                                                            {testMatchResult.user_b?.name}
                                                        </Typography>
                                                        <Avatar sx={{ width: 32, height: 32 }}>
                                                            {testMatchResult.user_b?.name?.charAt(0) || 'B'}
                                                        </Avatar>
                                                    </Box>
                                                </Box>

                                                {/* Score and Probability */}
                                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                    <Box sx={{
                                                        p: 1,
                                                        bgcolor: 'rgba(255,255,255,0.05)',
                                                        borderRadius: 1,
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        textAlign: 'center'
                                                    }}>
                                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                                                            Score
                                                        </Typography>
                                                        <Typography sx={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
                                                            {(testMatchResult.score || 0).toFixed(1)}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{
                                                        p: 1,
                                                        bgcolor: 'rgba(255,255,255,0.05)',
                                                        borderRadius: 1,
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        textAlign: 'center'
                                                    }}>
                                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                                                            Probability
                                                        </Typography>
                                                        <Typography sx={{
                                                            color: (testMatchResult.probability || 0) > 75 ? '#22c55e' : (testMatchResult.probability || 0) > 50 ? '#f59e0b' : '#ef4444',
                                                            fontSize: 16,
                                                            fontWeight: 700
                                                        }}>
                                                            {(testMatchResult.probability || 0).toFixed(1)}%
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                {/* Score Breakdown */}
                                                {testMatchResult.breakdown && (
                                                    <Box sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                                        gap: 1
                                                    }}>
                                                        {Object.entries(testMatchResult.breakdown).map(([criterion, score]) => (
                                                            <Box key={criterion} sx={{
                                                                p: 1,
                                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                                borderRadius: 1,
                                                                border: '1px solid rgba(255,255,255,0.1)'
                                                            }}>
                                                                <Typography sx={{
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    fontSize: 10,
                                                                    textTransform: 'capitalize'
                                                                }}>
                                                                    {criterion}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                                                                    <LinearProgress
                                                                        variant="determinate"
                                                                        value={score || 0}
                                                                        sx={{
                                                                            flex: 1,
                                                                            height: 4,
                                                                            borderRadius: 2,
                                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                                            mr: 1,
                                                                            '& .MuiLinearProgress-bar': {
                                                                                bgcolor: score > 75 ? '#22c55e' : score > 50 ? '#f59e0b' : '#ef4444',
                                                                                borderRadius: 2
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Typography sx={{
                                                                        color: '#fff',
                                                                        fontSize: 11,
                                                                        fontWeight: 600,
                                                                        minWidth: 25,
                                                                        textAlign: 'right'
                                                                    }}>
                                                                        {(score || 0).toFixed(0)}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}

                                                {!testMatchResult.is_valid && (
                                                    <Alert severity="warning" sx={{
                                                        bgcolor: 'rgba(245,158,11,0.1)',
                                                        borderColor: 'rgba(245,158,11,0.3)',
                                                        mt: 1
                                                    }}>
                                                        <Typography sx={{ fontSize: 12, color: '#fff' }}>
                                                            ⚠ Match may not meet all criteria requirements
                                                        </Typography>
                                                    </Alert>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </Box>
                            )}

                            {/* Settings Tab */}
                            {selectedTab === 'settings' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {/* Interest Tags Manager */}
                                    <InterestTagManager
                                        eventId={eventId}
                                        sessionId={session?.id}
                                        session={session}
                                    />

                                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                                    {/* Collapsible Matching Criteria Component */}
                                    {criteriaConfig && (
                                        <CollapsibleMatchingCriteria
                                            config={criteriaConfig}
                                            onUpdate={(newConfig) => {
                                                setCriteriaConfig(newConfig);
                                                handleSaveCriteria(newConfig);
                                            }}
                                            onOpenInterestManager={() => {
                                                // You can add a ref to InterestTagManager or trigger it via a state
                                                // For now, this will be a callback placeholder
                                                console.log('Open Interest Manager');
                                            }}
                                        />
                                    )}

                                    {/* Additional Factors Section */}
                                    {criteriaConfig && (
                                        <Box sx={{
                                            mt: 3,
                                            pt: 2,
                                            borderTop: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <Typography sx={{
                                                color: '#fff',
                                                fontWeight: 600,
                                                fontSize: 13,
                                                mb: 2,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5
                                            }}>
                                                Advanced Settings
                                            </Typography>

                                            <Alert severity="info" sx={{
                                                bgcolor: 'rgba(59,130,246,0.1)',
                                                borderColor: 'rgba(59,130,246,0.3)',
                                                mb: 2
                                            }}>
                                                <Typography sx={{ fontSize: 12, color: '#fff' }}>
                                                    💡 Fine-tune advanced matching parameters to optimize match quality
                                                </Typography>
                                            </Alert>

                                            {/* Serendipity/Luck Factor */}
                                            <Card sx={{
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                borderRadius: 2,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                mb: 1.5
                                            }}>
                                                <CardContent>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        mb: 2
                                                    }}>
                                                        <Typography sx={{
                                                            color: '#fff',
                                                            fontWeight: 600,
                                                            fontSize: 14
                                                        }}>
                                                            Serendipity Factor
                                                        </Typography>
                                                        <Tooltip title="Add randomness to encourage surprising connections">
                                                            <Typography sx={{
                                                                color: 'rgba(255,255,255,0.5)',
                                                                fontSize: 11
                                                            }}>
                                                                ?
                                                            </Typography>
                                                        </Tooltip>
                                                    </Box>
                                                    <Box>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            mb: 1
                                                        }}>
                                                            <Typography sx={{
                                                                color: 'rgba(255,255,255,0.7)',
                                                                fontSize: 12
                                                            }}>
                                                                Random Element Weight
                                                            </Typography>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                fontWeight: 500
                                                            }}>
                                                                {Math.round((criteriaConfig?.random_factor || 0) * 100)}%
                                                            </Typography>
                                                        </Box>
                                                        <Slider
                                                            value={(criteriaConfig?.random_factor || 0) * 100}
                                                            onChange={(e, newValue) => {
                                                                const newConfig = { ...criteriaConfig };
                                                                newConfig.random_factor = newValue / 100;
                                                                setCriteriaConfig(newConfig);
                                                            }}
                                                            min={0}
                                                            max={30}
                                                            step={1}
                                                            sx={{
                                                                color: '#f59e0b',
                                                                '& .MuiSlider-track': { bgcolor: '#f59e0b' }
                                                            }}
                                                        />
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.5)',
                                                            fontSize: 11,
                                                            mt: 1
                                                        }}>
                                                            Recommended: 5-15% for organic matching
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>

                                            {/* Matching Recency Preference */}
                                            <Card sx={{
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                borderRadius: 2,
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <CardContent>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={criteriaConfig?.prefer_new_users !== false}
                                                                onChange={(e) => {
                                                                    const newConfig = { ...criteriaConfig };
                                                                    newConfig.prefer_new_users = e.target.checked;
                                                                    setCriteriaConfig(newConfig);
                                                                }}
                                                                size="small"
                                                            />
                                                        }
                                                        label={
                                                            <Box>
                                                                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                                                    Prioritize New Users
                                                                </Typography>
                                                                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                                                                    Match users who recently joined first
                                                                </Typography>
                                                            </Box>
                                                        }
                                                        sx={{ color: 'rgba(255,255,255,0.7)', width: '100%' }}
                                                    />
                                                </CardContent>
                                            </Card>

                                            {/* Normalize and Save Buttons */}
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    variant="outlined"
                                                    onClick={handleNormalizeWeights}
                                                    sx={{
                                                        color: '#5a78ff',
                                                        borderColor: '#5a78ff',
                                                        flex: 1,
                                                        '&:hover': { bgcolor: 'rgba(90,120,255,0.1)' }
                                                    }}
                                                >
                                                    Normalize Weights
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    onClick={handleSaveCriteria}
                                                    disabled={savingCriteria}
                                                    sx={{
                                                        bgcolor: '#22c55e',
                                                        color: '#000',
                                                        flex: 1,
                                                        '&:hover': { bgcolor: '#16a34a' }
                                                    }}
                                                >
                                                    {savingCriteria ? <CircularProgress size={20} /> : 'Save'}
                                                </Button>
                                            </Box>

                                            {/* Match Preview Card */}
                                            {(matchPreview || loadingPreview) && (
                                                <Card sx={{
                                                    bgcolor: 'rgba(90,120,255,0.1)',
                                                    borderRadius: 2,
                                                    border: '1px solid rgba(90,120,255,0.3)'
                                                }}>
                                                    <CardContent>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            mb: 2
                                                        }}>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontWeight: 600,
                                                                fontSize: 14
                                                            }}>
                                                                Match Preview
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={fetchMatchPreview}
                                                                disabled={loadingPreview}
                                                            >
                                                                {loadingPreview ? (
                                                                    <CircularProgress size={20} />
                                                                ) : (
                                                                    <RefreshIcon sx={{ color: '#5a78ff', fontSize: 18 }} />
                                                                )}
                                                            </IconButton>
                                                        </Box>

                                                        {loadingPreview ? (
                                                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                                                <CircularProgress size={24} />
                                                                <Typography sx={{
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    fontSize: 12,
                                                                    mt: 1
                                                                }}>
                                                                    Calculating preview...
                                                                </Typography>
                                                            </Box>
                                                        ) : matchPreview?.total_waiting < 2 ? (
                                                            <Typography sx={{
                                                                color: 'rgba(255,255,255,0.7)',
                                                                fontSize: 13,
                                                                textAlign: 'center',
                                                                py: 2
                                                            }}>
                                                                Need at least 2 users in queue to preview matches
                                                            </Typography>
                                                        ) : (
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                            {/* Waiting Users */}
                                                            <Box>
                                                                <Typography sx={{
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    fontSize: 12,
                                                                    mb: 0.5
                                                                }}>
                                                                    Waiting Users: <span style={{ color: '#fff', fontWeight: 600 }}>{matchPreview.total_waiting}</span>
                                                                </Typography>
                                                            </Box>

                                                            {/* Potential Pairs */}
                                                            <Box>
                                                                <Typography sx={{
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    fontSize: 12,
                                                                    mb: 0.5
                                                                }}>
                                                                    Potential Pairs: <span style={{ color: '#fff', fontWeight: 600 }}>{matchPreview.potential_pairs}</span>
                                                                </Typography>
                                                            </Box>

                                                            {/* Match Rate with Progress Bar */}
                                                            <Box>
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    mb: 0.5
                                                                }}>
                                                                    <Typography sx={{
                                                                        color: 'rgba(255,255,255,0.7)',
                                                                        fontSize: 12
                                                                    }}>
                                                                        Matchable Pairs
                                                                    </Typography>
                                                                    <Typography sx={{
                                                                        color: '#22c55e',
                                                                        fontSize: 12,
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {matchPreview.matchable_pairs}/{matchPreview.potential_pairs} ({matchPreview.match_rate}%)
                                                                    </Typography>
                                                                </Box>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={matchPreview.match_rate}
                                                                    sx={{
                                                                        bgcolor: 'rgba(255,255,255,0.1)',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: matchPreview.match_rate > 75 ? '#22c55e' : matchPreview.match_rate > 50 ? '#f59e0b' : '#ef4444'
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>

                                                            {/* Avg Score with Progress Bar */}
                                                            <Box>
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    mb: 0.5
                                                                }}>
                                                                    <Typography sx={{
                                                                        color: 'rgba(255,255,255,0.7)',
                                                                        fontSize: 12
                                                                    }}>
                                                                        Avg Match Quality
                                                                    </Typography>
                                                                    <Typography sx={{
                                                                        color: '#fff',
                                                                        fontSize: 12,
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {matchPreview.avg_score}%
                                                                    </Typography>
                                                                </Box>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={matchPreview.avg_score}
                                                                    sx={{
                                                                        bgcolor: 'rgba(255,255,255,0.1)',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: '#5a78ff'
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>

                                                            {/* Score Distribution */}
                                                            <Box>
                                                                <Typography sx={{
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    fontSize: 12,
                                                                    mb: 1
                                                                }}>
                                                                    Score Distribution
                                                                </Typography>
                                                                <Box sx={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                                                    gap: 0.5
                                                                }}>
                                                                    {[
                                                                        { label: '0-25', value: matchPreview.score_distribution['0-25'] },
                                                                        { label: '26-50', value: matchPreview.score_distribution['26-50'] },
                                                                        { label: '51-75', value: matchPreview.score_distribution['51-75'] },
                                                                        { label: '76-100', value: matchPreview.score_distribution['76-100'] }
                                                                    ].map(({ label, value }) => (
                                                                        <Box key={label} sx={{
                                                                            textAlign: 'center',
                                                                            p: 1,
                                                                            bgcolor: 'rgba(255,255,255,0.05)',
                                                                            borderRadius: 1,
                                                                            border: '1px solid rgba(255,255,255,0.1)'
                                                                        }}>
                                                                            <Typography sx={{
                                                                                color: 'rgba(255,255,255,0.7)',
                                                                                fontSize: 10
                                                                            }}>
                                                                                {label}
                                                                            </Typography>
                                                                            <Typography sx={{
                                                                                color: '#fff',
                                                                                fontWeight: 600,
                                                                                fontSize: 13
                                                                            }}>
                                                                                {value}
                                                                            </Typography>
                                                                        </Box>
                                                                    ))}
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Setup Wizard Dialog */}
            <Dialog
                open={wizardOpen}
                onClose={closeWizard}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#1f2937',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
                    Setup Wizard
                </DialogTitle>

                <DialogContent sx={{ color: '#fff', pt: 2 }}>
                    {/* Stepper */}
                    <Stepper activeStep={wizardStep} sx={{ mb: 3, '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.7)' }, '& .MuiStepLabel-label.Mui-active': { color: '#fff' } }}>
                        <Step>
                            <StepLabel>Interest Tags</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Matching Criteria</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Review & Finish</StepLabel>
                        </Step>
                    </Stepper>

                    {/* Step 1: Interest Tags Management */}
                    {wizardStep === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, mb: 1 }}>
                                Create and manage interest tags for this session. These tags help participants indicate their goals and interests.
                            </Typography>
                            <InterestTagManager
                                eventId={eventId}
                                sessionId={session?.id}
                                session={session}
                            />
                        </Box>
                    )}

                    {/* Step 2: Matching Criteria Configuration */}
                    {wizardStep === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, mb: 1 }}>
                                Configure matching criteria. Enable/disable criteria and adjust weights to fine-tune the matching algorithm.
                            </Typography>

                            {tempCriteriaConfig && (
                                <>
                                    {/* Skill Matching */}
                                    {tempCriteriaConfig.skill && (
                                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                                                        🎯 Skill Matching
                                                    </Typography>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={tempCriteriaConfig.skill?.enabled || false}
                                                                onChange={(e) => {
                                                                    const newConfig = { ...tempCriteriaConfig };
                                                                    newConfig.skill = { ...newConfig.skill, enabled: e.target.checked };
                                                                    setTempCriteriaConfig(newConfig);
                                                                }}
                                                            />
                                                        }
                                                        label={tempCriteriaConfig.skill?.enabled ? "Enabled" : "Disabled"}
                                                        sx={{ color: 'white', m: 0 }}
                                                    />
                                                </Box>
                                                {tempCriteriaConfig.skill?.enabled && (
                                                    <Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                                                                Weight
                                                            </Typography>
                                                            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                                                {(tempCriteriaConfig.skill?.weight * 100).toFixed(0)}%
                                                            </Typography>
                                                        </Box>
                                                        <Slider
                                                            value={(tempCriteriaConfig.skill?.weight || 0) * 100}
                                                            onChange={(e, newValue) => {
                                                                const newConfig = { ...tempCriteriaConfig };
                                                                newConfig.skill = { ...newConfig.skill, weight: newValue / 100 };
                                                                setTempCriteriaConfig(newConfig);
                                                            }}
                                                            min={0}
                                                            max={100}
                                                            step={5}
                                                            sx={{ color: '#5a78ff' }}
                                                        />
                                                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, mt: 1 }}>
                                                            Matches users with similar skill levels
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Experience Matching */}
                                    {tempCriteriaConfig.experience && (
                                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                                                        💼 Experience Matching
                                                    </Typography>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={tempCriteriaConfig.experience?.enabled || false}
                                                                onChange={(e) => {
                                                                    const newConfig = { ...tempCriteriaConfig };
                                                                    newConfig.experience = { ...newConfig.experience, enabled: e.target.checked };
                                                                    setTempCriteriaConfig(newConfig);
                                                                }}
                                                            />
                                                        }
                                                        label={tempCriteriaConfig.experience?.enabled ? "Enabled" : "Disabled"}
                                                        sx={{ color: 'white', m: 0 }}
                                                    />
                                                </Box>
                                                {tempCriteriaConfig.experience?.enabled && (
                                                    <Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                                                                Weight
                                                            </Typography>
                                                            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                                                {(tempCriteriaConfig.experience?.weight * 100).toFixed(0)}%
                                                            </Typography>
                                                        </Box>
                                                        <Slider
                                                            value={(tempCriteriaConfig.experience?.weight || 0) * 100}
                                                            onChange={(e, newValue) => {
                                                                const newConfig = { ...tempCriteriaConfig };
                                                                newConfig.experience = { ...newConfig.experience, weight: newValue / 100 };
                                                                setTempCriteriaConfig(newConfig);
                                                            }}
                                                            min={0}
                                                            max={100}
                                                            step={5}
                                                            sx={{ color: '#5a78ff' }}
                                                        />
                                                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, mt: 1 }}>
                                                            Matches users with compatible experience levels
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Location Matching */}
                                    {tempCriteriaConfig.location && (
                                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                                                        📍 Location Matching
                                                    </Typography>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={tempCriteriaConfig.location?.enabled || false}
                                                                onChange={(e) => {
                                                                    const newConfig = { ...tempCriteriaConfig };
                                                                    newConfig.location = { ...newConfig.location, enabled: e.target.checked };
                                                                    setTempCriteriaConfig(newConfig);
                                                                }}
                                                            />
                                                        }
                                                        label={tempCriteriaConfig.location?.enabled ? "Enabled" : "Disabled"}
                                                        sx={{ color: 'white', m: 0 }}
                                                    />
                                                </Box>
                                                {tempCriteriaConfig.location?.enabled && (
                                                    <Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                                                                Weight
                                                            </Typography>
                                                            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                                                {(tempCriteriaConfig.location?.weight * 100).toFixed(0)}%
                                                            </Typography>
                                                        </Box>
                                                        <Slider
                                                            value={(tempCriteriaConfig.location?.weight || 0) * 100}
                                                            onChange={(e, newValue) => {
                                                                const newConfig = { ...tempCriteriaConfig };
                                                                newConfig.location = { ...newConfig.location, weight: newValue / 100 };
                                                                setTempCriteriaConfig(newConfig);
                                                            }}
                                                            min={0}
                                                            max={100}
                                                            step={5}
                                                            sx={{ color: '#5a78ff' }}
                                                        />
                                                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, mt: 1 }}>
                                                            Matches users in the same geographic area
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Education Matching */}
                                    {tempCriteriaConfig.education && (
                                        <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                                                        🎓 Education Matching
                                                    </Typography>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={tempCriteriaConfig.education?.enabled || false}
                                                                onChange={(e) => {
                                                                    const newConfig = { ...tempCriteriaConfig };
                                                                    newConfig.education = { ...newConfig.education, enabled: e.target.checked };
                                                                    setTempCriteriaConfig(newConfig);
                                                                }}
                                                            />
                                                        }
                                                        label={tempCriteriaConfig.education?.enabled ? "Enabled" : "Disabled"}
                                                        sx={{ color: 'white', m: 0 }}
                                                    />
                                                </Box>
                                                {tempCriteriaConfig.education?.enabled && (
                                                    <Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                                                                Weight
                                                            </Typography>
                                                            <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                                                {(tempCriteriaConfig.education?.weight * 100).toFixed(0)}%
                                                            </Typography>
                                                        </Box>
                                                        <Slider
                                                            value={(tempCriteriaConfig.education?.weight || 0) * 100}
                                                            onChange={(e, newValue) => {
                                                                const newConfig = { ...tempCriteriaConfig };
                                                                newConfig.education = { ...newConfig.education, weight: newValue / 100 };
                                                                setTempCriteriaConfig(newConfig);
                                                            }}
                                                            min={0}
                                                            max={100}
                                                            step={5}
                                                            sx={{ color: '#5a78ff' }}
                                                        />
                                                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, mt: 1 }}>
                                                            Matches users with similar education levels
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Interest-Based Matching */}
                                    {tempCriteriaConfig.interests && (
                                        <InterestCriteriaConfig
                                            config={tempCriteriaConfig}
                                            onUpdate={(newConfig) => setTempCriteriaConfig(newConfig)}
                                        />
                                    )}
                                </>
                            )}
                        </Box>
                    )}

                    {/* Step 3: Review & Finish */}
                    {wizardStep === 2 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Alert severity="info" sx={{
                                bgcolor: 'rgba(59,130,246,0.1)',
                                borderColor: 'rgba(59,130,246,0.3)'
                            }}>
                                <Typography sx={{ fontSize: 14, color: '#fff' }}>
                                    Review your configuration and click Finish to save.
                                </Typography>
                            </Alert>

                            {/* Summary */}
                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <CardContent>
                                    <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                                        Configuration Summary
                                    </Typography>

                                    {/* Interest Tags Summary */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, mb: 1 }}>
                                            Interest Tags
                                        </Typography>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                                            Manage tags to help participants indicate their goals and interests.
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

                                    {/* Enabled Criteria */}
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, mb: 1 }}>
                                        Enabled Matching Criteria
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {tempCriteriaConfig && Object.entries(tempCriteriaConfig).map(([key, config]) => {
                                            if (key === 'interests') return null;
                                            if (!config?.enabled) return null;
                                            return (
                                                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'rgba(90,120,255,0.1)', borderRadius: 0.5 }}>
                                                    <Typography sx={{ color: '#fff', fontSize: 12, textTransform: 'capitalize' }}>
                                                        {key.replace(/_/g, ' ')}
                                                    </Typography>
                                                    <Typography sx={{ color: '#5a78ff', fontWeight: 600, fontSize: 12 }}>
                                                        {(config.weight * 100).toFixed(0)}%
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                        {tempCriteriaConfig?.interests?.enabled && (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'rgba(90,120,255,0.1)', borderRadius: 0.5 }}>
                                                <Typography sx={{ color: '#fff', fontSize: 12 }}>
                                                    Interest-Based
                                                </Typography>
                                                <Typography sx={{ color: '#5a78ff', fontWeight: 600, fontSize: 12 }}>
                                                    Enabled
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {wizardStep > 0 && (
                        <Button
                            onClick={handleWizardBack}
                            sx={{ color: '#fff', textTransform: 'none' }}
                        >
                            Back
                        </Button>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Button
                        onClick={closeWizard}
                        sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    {wizardStep < 2 ? (
                        <Button
                            onClick={handleWizardNext}
                            variant="contained"
                            sx={{
                                bgcolor: '#5a78ff',
                                color: '#fff',
                                textTransform: 'none',
                                '&:hover': { bgcolor: '#4a68ee' }
                            }}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            onClick={handleWizardFinish}
                            variant="contained"
                            disabled={savingCriteria}
                            sx={{
                                bgcolor: '#22c55e',
                                color: '#fff',
                                textTransform: 'none',
                                '&:hover': { bgcolor: '#16a34a' }
                            }}
                        >
                            {savingCriteria ? 'Saving...' : 'Finish'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
