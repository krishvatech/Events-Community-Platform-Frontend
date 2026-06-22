import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

const DEFAULT_CRITERIA_NUMBERS = {
    skill: { weight: 0.35, threshold: 40 },
    experience: { weight: 0.30, threshold: 50 },
    location: { weight: 0.20, threshold: 30 },
    education: { weight: 0.15, threshold: 40 },
    interests: { weight: 0, threshold: 50 },
};

function isReactEvent(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        (typeof value.preventDefault === 'function' ||
            Object.prototype.hasOwnProperty.call(value, 'nativeEvent')) &&
        Object.prototype.hasOwnProperty.call(value, 'target')
    );
}

function normalizeCriteriaConfig(config = {}) {
    const next = { ...config };

    Object.entries(DEFAULT_CRITERIA_NUMBERS).forEach(([key, defaults]) => {
        if (!next[key]) return;

        const rawWeight = Number(next[key].weight);
        const rawThreshold = Number(next[key].threshold);

        next[key] = {
            ...next[key],
            enabled: Boolean(next[key].enabled),
            weight: Number.isFinite(rawWeight) ? rawWeight : defaults.weight,
            threshold: Number.isFinite(rawThreshold) ? rawThreshold : defaults.threshold,
        };
    });

    if (next.random_factor !== undefined) {
        const rawRandomFactor = Number(next.random_factor);
        next.random_factor = Number.isFinite(rawRandomFactor) ? rawRandomFactor : 0.1;
    }

    if (next.prefer_new_users !== undefined) {
        next.prefer_new_users = Boolean(next.prefer_new_users);
    }

    return next;
}

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function addCacheBust(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
}

function getDisplayName(user, fallback = 'Participant') {
    if (!user) return fallback;

    const fullName =
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

    return fullName || user.username || user.email || fallback;
}

function getUserInitial(user, fallback = 'P') {
    return getDisplayName(user, fallback).charAt(0).toUpperCase();
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
    const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [removing, setRemoving] = useState(null);
    const [selectedTab, setSelectedTab] = useState('waiting');
    const [criteriaConfig, setCriteriaConfig] = useState(null);
    const [savingCriteria, setSavingCriteria] = useState(false);
    const [criteriaDirty, setCriteriaDirty] = useState(false);
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
    const fetchInFlightRef = useRef(false);
    const fetchQueuedRef = useRef(false);
    const refreshTimerRef = useRef(null);
    const hasLoadedOnceRef = useRef(false);
    const selectedTabRef = useRef(selectedTab);

    useEffect(() => {
        selectedTabRef.current = selectedTab;
    }, [selectedTab]);

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

    const fetchQueue = useCallback(async () => {
        if (!session?.id) {
            return;
        }
        if (fetchInFlightRef.current) {
            fetchQueuedRef.current = true;
            return;
        }

        const isInitialLoad = !hasLoadedOnceRef.current;
        const shouldFetchPastMatches = isInitialLoad || selectedTabRef.current === 'past';

        fetchInFlightRef.current = true;
        try {
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setBackgroundRefreshing(true);
            }

            let queueUrl = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/queue/`.replace(/([^:]\/)\/+/g, "$1");
            let sessionUrl = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/`.replace(/([^:]\/)\/+/g, "$1");
            queueUrl = addCacheBust(queueUrl);
            sessionUrl = addCacheBust(sessionUrl);

            const queuePromise = fetch(queueUrl, { headers: authHeader(), cache: 'no-store' });
            const sessionPromise = shouldFetchPastMatches
                ? fetch(sessionUrl, { headers: authHeader(), cache: 'no-store' })
                : Promise.resolve(null);

            const [queueRes, sessionRes] = await Promise.all([queuePromise, sessionPromise]);

            if (queueRes.ok) {
                const queueData = await queueRes.json();
                setQueueEntries(queueData);
            } else {
                console.error('[HostPanel] Queue fetch failed with status:', queueRes.status);
            }

            if (shouldFetchPastMatches && sessionRes?.ok) {
                const sessionData = await sessionRes.json();
                if (sessionData.matches && Array.isArray(sessionData.matches)) {
                    const past = sessionData.matches.filter(
                        m => m.status === 'COMPLETED' || m.status === 'SKIPPED'
                    );
                    setPastMatches(prev => mergePastMatches(past, prev));
                }
            } else if (shouldFetchPastMatches && sessionRes && !sessionRes.ok) {
                console.error('[HostPanel] Session fetch failed with status:', sessionRes.status);
            }
        } catch (err) {
            console.error('[HostPanel] Error fetching data:', err);
        } finally {
            fetchInFlightRef.current = false;
            hasLoadedOnceRef.current = true;
            setLoading(false);
            setBackgroundRefreshing(false);
            if (fetchQueuedRef.current) {
                fetchQueuedRef.current = false;
                fetchQueue();
            }
        }
    }, [eventId, session?.id]);

    // Initial fetch
    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Refetch when queue updates via WebSocket. Debounce bursts so one
    // match operation creates at most one silent background fetch on host UI.
    useEffect(() => {
        if (!lastMessage) return;

        const messageType = lastMessage.type;
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
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
            refreshTimerRef.current = setTimeout(() => {
                fetchQueue();
            }, 300);
        }
    }, [lastMessage, fetchQueue]);

    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

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
                setCriteriaDirty(false);
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
            const res = await fetch(url, { headers: authHeader() });
            if (res.ok) {
                const data = await res.json();
                setMatchPreview(data);
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

    const handleSaveCriteria = async (overrideConfig = null) => {
        // MUI Button passes the click event as the first argument when this handler
        // is used as onClick={handleSaveCriteria}. Do not treat that event as
        // criteria config, because it contains DOM/React Fiber circular references
        // and JSON.stringify will fail with "Converting circular structure to JSON".
        if (isReactEvent(overrideConfig)) {
            overrideConfig.preventDefault?.();
            overrideConfig.stopPropagation?.();
            overrideConfig = null;
        }

        const sourceConfig = overrideConfig || criteriaConfig;
        if (!session?.id || !sourceConfig) return false;

        const normalizedConfig = normalizeCriteriaConfig(sourceConfig);

        try {
            setSavingCriteria(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/update_criteria/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteria_config: normalizedConfig })
            });
            if (res.ok) {
                setCriteriaConfig(normalizedConfig);
                setCriteriaDirty(false);
                await fetchMatchPreview();
                return true;
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('[HostPanel] Failed to save criteria:', errorData);
                alert('Failed to save criteria: ' + (errorData.error || 'Unknown error'));
                return false;
            }
        } catch (err) {
            console.error('[HostPanel] Error saving criteria:', err);
            alert('Error saving criteria: ' + err.message);
            return false;
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
        setCriteriaDirty(true);
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
                    body: JSON.stringify({ criteria_config: normalizeCriteriaConfig(tempCriteriaConfig) })
                });
                if (res.ok) {
                    setCriteriaDirty(false);
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

    // Past matches are loaded lazily. Only fetch the full session payload when
    // the host opens the Past Matches tab, not on every queue refresh.
    useEffect(() => {
        if (selectedTab === 'past' && hasLoadedOnceRef.current) {
            fetchQueue();
        }
    }, [selectedTab, fetchQueue]);

    // Calculate stats
    const waitingEntries = useMemo(
        () => queueEntries.filter(e => !e.current_match),
        [queueEntries]
    );
    const waitingCount = waitingEntries.length;

    // Get matched pairs (only ACTIVE matches, not SKIPPED or COMPLETED)
    const matchedPairs = useMemo(() => {
        const pairs = [];
        const seenMatches = new Set();

        queueEntries.forEach(entry => {
            const match = entry.current_match;
            if (match && match.status === 'ACTIVE' && !seenMatches.has(match.id)) {
                seenMatches.add(match.id);
                pairs.push(match);
            }
        });

        return pairs;
    }, [queueEntries]);

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
                    {backgroundRefreshing && !loading && (
                        <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.55)' }} />
                    )}
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
                                            {waitingEntries.map((entry) => (
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
                                                            alt={getDisplayName(entry.user, 'User')}
                                                            sx={{ width: 32, height: 32 }}
                                                        >
                                                            {getUserInitial(entry.user, 'U')}
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
                                                                {getDisplayName(entry.user, 'User')}
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
                                                                alt={getDisplayName(match.participant_1)}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {getUserInitial(match.participant_1)}
                                                            </Avatar>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {getDisplayName(match.participant_1)}
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
                                                                {getDisplayName(match.participant_2)}
                                                            </Typography>
                                                            <Avatar
                                                                alt={getDisplayName(match.participant_2)}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {getUserInitial(match.participant_2)}
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
                                                                alt={getDisplayName(match.participant_1)}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {getUserInitial(match.participant_1)}
                                                            </Avatar>
                                                            <Typography sx={{
                                                                color: '#fff',
                                                                fontSize: 12,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {getDisplayName(match.participant_1)}
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
                                                                {getDisplayName(match.participant_2)}
                                                            </Typography>
                                                            <Avatar
                                                                alt={getDisplayName(match.participant_2)}
                                                                sx={{ width: 28, height: 28 }}
                                                            >
                                                                {getUserInitial(match.participant_2)}
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
                                                label: getDisplayName(e.user, 'User'),
                                                user: e.user
                                            }))}
                                            getOptionLabel={(option) => option.label}
                                            value={testUserAId ? { id: testUserAId, label: getDisplayName(queueEntries.find(e => e.user.id === testUserAId)?.user, 'User A') } : null}
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
                                            value={testUserBId ? { id: testUserBId, label: getDisplayName(queueEntries.find(e => e.user.id === testUserBId)?.user, 'User B') } : null}
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
                                    <Alert severity={criteriaDirty ? 'warning' : 'info'} sx={{
                                        bgcolor: criteriaDirty ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                                        borderColor: criteriaDirty ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'
                                    }}>
                                        <Typography sx={{ fontSize: 12, color: '#fff' }}>
                                            {criteriaDirty
                                                ? 'Unsaved changes. Click Save when ready. Active matches stay connected; saved settings apply to future matches.'
                                                : 'Settings are live-safe. Current active matches stay connected; future matches use the latest saved settings.'}
                                        </Typography>
                                    </Alert>

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
                                                setCriteriaDirty(true);
                                            }}
                                            onOpenInterestManager={() => {
                                                // You can add a ref to InterestTagManager or trigger it via a state
                                                // For now, this will be a callback placeholder
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
                                                                setCriteriaDirty(true);
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
                                                                    setCriteriaDirty(true);
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
                                                    onClick={() => handleSaveCriteria()}
                                                    disabled={savingCriteria}
                                                    sx={{
                                                        bgcolor: '#22c55e',
                                                        color: '#000',
                                                        flex: 1,
                                                        '&:hover': { bgcolor: '#16a34a' }
                                                    }}
                                                >
                                                    {savingCriteria ? <CircularProgress size={20} /> : (criteriaDirty ? 'Save Changes' : 'Save')}
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
