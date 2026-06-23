import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, LinearProgress, Collapse, Chip, Avatar, Divider, IconButton, TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import BlurOnRoundedIcon from '@mui/icons-material/BlurOnRounded';
import WallpaperRoundedIcon from '@mui/icons-material/WallpaperRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { useRealtimeKitClient, RealtimeKitProvider } from '@cloudflare/realtimekit-react';
import { RtkMeeting, defaultConfig } from '@cloudflare/realtimekit-react-ui';
import InterestDisplay from './InterestDisplay';
import {
    VIRTUAL_BG_FEATURE_ENABLED,
    VIRTUAL_BG_PRESETS,
    applyBackgroundSelection,
    initializeVirtualBackgroundMiddleware,
    loadStoredBackgroundSelection,
    readFileAsDataUrl,
    saveBackgroundSelection,
    validateBackgroundUpload
} from '../../utils/rtkBackground.js';

// Style to ensure RTK UI controls don't overflow
const rtkStyles = `
    .rtk-meeting-ui {
        width: 100% !important;
        height: 100% !important;
    }
    /* Ensure control bar buttons don't wrap or overflow */
    .rtk-controlbar,
    [class*="controlbar"] {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        padding: 8px !important;
        background: rgba(0,0,0,0.8) !important;
    }
    /* Ensure all control bar buttons are visible */
    .rtk-controlbar button,
    [class*="controlbar"] button,
    [class*="control-item"] {
        min-width: auto !important;
        flex-shrink: 0 !important;
    }
    /* Hide non-essential features in speed networking */
    rtk-chat-toggle,
    rtk-participants-toggle,
    rtk-polls-toggle,
    rtk-plugins-toggle {
        display: none !important;
    }
`;

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const SPEED_NETWORKING_DM_PAGE_SIZE = Number(import.meta.env.VITE_SPEED_NETWORKING_DM_PAGE_SIZE || 30);
const SPEED_NETWORKING_DM_ACTIVE_POLL_MS = Number(import.meta.env.VITE_SPEED_NETWORKING_DM_ACTIVE_POLL_MS || 30000);
const SPEED_NETWORKING_DM_WS_FALLBACK_MS = Number(import.meta.env.VITE_SPEED_NETWORKING_DM_WS_FALLBACK_MS || 120000);
const HIDDEN_SPEED_NETWORKING_CONTROLS = new Set([
    'rtk-chat-toggle',
    'rtk-polls-toggle',
    'rtk-participants-toggle',
    'rtk-plugins-toggle'
]);

function stripHiddenControls(items = []) {
    return items.filter((item) => {
        const name = Array.isArray(item) ? item[0] : item;
        return !HIDDEN_SPEED_NETWORKING_CONTROLS.has(name);
    });
}

function getToken() {
    return localStorage.getItem("guest_token")
        || localStorage.getItem("access")
        || localStorage.getItem("access_token")
        || "";
}

function authHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function toWsUrl(pathOrUrl) {
    const token = getToken();
    const root = API_ROOT.replace(/^http/i, "ws").replace(/\/api\/?$/, "");

    let url;
    try {
        const parsed = new URL(pathOrUrl);
        parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
        url = parsed.toString();
    } catch {
        const rel = String(pathOrUrl).replace(/^\/+/, "");
        url = `${root}/${rel}`.replace(/([^:]\/)\/+/g, "$1");
    }

    if (!token) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}token=${encodeURIComponent(token)}`;
}

function mergeMessagesById(existing = [], incoming = []) {
    const map = new Map();
    for (const msg of existing) {
        if (msg?.id != null) map.set(String(msg.id), msg);
    }
    for (const msg of incoming) {
        if (msg?.id != null) map.set(String(msg.id), msg);
    }
    return Array.from(map.values()).sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
}


function collectionToArray(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    if (typeof collection.toArray === 'function') return collection.toArray();
    if (Array.isArray(collection.participants)) return collection.participants;
    if (typeof collection.values === 'function') return Array.from(collection.values());
    return [];
}

function getRemoteParticipants(meeting) {
    if (!meeting?.participants) return [];
    const selfId = meeting?.self?.id != null ? String(meeting.self.id) : null;
    const sources = [
        meeting.participants.remoteParticipants,
        meeting.participants.joined,
        meeting.participants.joinedParticipants,
        meeting.participants.active,
    ];

    const seen = new Map();
    for (const source of sources) {
        for (const participant of collectionToArray(source)) {
            const id = participant?.id != null ? String(participant.id) : null;
            if (!id || (selfId && id === selfId)) continue;
            seen.set(id, participant);
        }
    }

    return Array.from(seen.values());
}

function normalizeMessageCursorResponse(payload) {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
            ? payload.results
            : [];

    return {
        rows,
        hasMore: Boolean(payload?.has_more),
        oldestId: payload?.oldest_id ?? rows[0]?.id ?? null,
        newestId: payload?.newest_id ?? rows[rows.length - 1]?.id ?? null,
    };
}

export default function SpeedNetworkingMatch({
    match,
    session,
    onNextMatch,
    onMatchTimerExpired,
    onLeave,
    loading,
    currentUserId,
    onMemberInfo,
    eventId
}) {
    const [meeting, initMeeting] = useRealtimeKitClient();
    const [timeRemaining, setTimeRemaining] = useState(session.duration_minutes * 60);
    const [videoError, setVideoError] = useState(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);
    const [showPartnerSidebar, setShowPartnerSidebar] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatConversationId, setChatConversationId] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [chatHasOlder, setChatHasOlder] = useState(false);
    const [chatLoadingOlder, setChatLoadingOlder] = useState(false);
    const [chatError, setChatError] = useState('');
    const [showVirtualBgDialog, setShowVirtualBgDialog] = useState(false);
    const [virtualBgSelection, setVirtualBgSelection] = useState(() => loadStoredBackgroundSelection());
    const [virtualBgError, setVirtualBgError] = useState('');
    const [virtualBgSupported, setVirtualBgSupported] = useState(true);
    const chatListRef = useRef(null);
    const chatBottomRef = useRef(null);
    const chatWsRef = useRef(null);
    const chatWsConnectedRef = useRef(false);
    const chatFetchInFlightRef = useRef(false);
    const chatOlderInFlightRef = useRef(false);
    const chatMessagesRef = useRef([]);
    const chatFallbackLastFetchRef = useRef(0);
    const autoAdvanceTriggeredRef = useRef(false);
    const matchStartMsRef = useRef(Date.now());
    const speedNetworkingUiConfigRef = useRef(null);
    const virtualBgReadyRef = useRef(false);
    const virtualBgMeetingRef = useRef(null);
    const virtualBgUploadInputRef = useRef(null);

    useEffect(() => {
        chatMessagesRef.current = chatMessages;
    }, [chatMessages]);

    if (!speedNetworkingUiConfigRef.current) {
        // Start from RTK defaults and only remove the 4 requested controls.
        const uiConfig = JSON.parse(JSON.stringify(defaultConfig));
        if (uiConfig?.root) {
            uiConfig.root['div#controlbar-right'] = stripHiddenControls(uiConfig.root['div#controlbar-right']);
            uiConfig.root['rtk-more-toggle.activeMoreMenu.sm'] = stripHiddenControls(uiConfig.root['rtk-more-toggle.activeMoreMenu.sm']);
            uiConfig.root['rtk-more-toggle.activeMoreMenu.md'] = stripHiddenControls(uiConfig.root['rtk-more-toggle.activeMoreMenu.md']);
        }
        speedNetworkingUiConfigRef.current = uiConfig;
    }

    // Inject RTK UI layout styles
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = rtkStyles;
        styleElement.id = 'rtk-visibility-styles';
        document.head.appendChild(styleElement);

        return () => {
            const existingStyle = document.getElementById('rtk-visibility-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    // Initialize RTK Meeting for this match.
    // Important: do not re-init on every match object update (e.g. extension flags),
    // otherwise RTK briefly disconnects and shows "You left the meeting."
    useEffect(() => {
        if (match?.rtk_token) {
            console.log("[SpeedNetworkingMatch] Initializing RTK meeting with token for match:", match.id);
            initMeeting({
                authToken: match.rtk_token,
                defaults: {
                    audio: false,
                    video: false,
                },
            });
            setVideoError(null);
        } else {
            console.error("Missing RTK Token for match:", match);
            const errorMessage = match?.rtk_error
                ? `Video connection failed: ${match.rtk_error}`
                : "Video connection unavailable (Server Error)";
            setVideoError(errorMessage);
        }
    }, [match?.id, match?.rtk_token, initMeeting]);

    // Log participants when meeting changes and listen for real-time join/leave
    useEffect(() => {
        if (meeting) {
            console.log("[SpeedNetworkingMatch] Meeting joined. Participants:", {
                total: meeting.participants?.count || 0,
                remote: meeting.participants?.remoteParticipants?.length || 0,
                self: meeting.self?.id
            });

            const syncRemotePresence = () => {
                const remoteParticipants = getRemoteParticipants(meeting);
                setHasRemoteParticipant(remoteParticipants.length > 0);
                console.log("[SpeedNetworkingMatch] Remote participant sync:", {
                    remoteCount: remoteParticipants.length,
                    remoteIds: remoteParticipants.map((p) => p?.id),
                    self: meeting.self?.id,
                });
            };

            // Listen for participant events
            const handleParticipantJoined = (event) => {
                console.log("[SpeedNetworkingMatch] Participant joined:", event);
                syncRemotePresence();
            };

            const handleParticipantLeft = (event) => {
                console.log("[SpeedNetworkingMatch] Participant left:", event);
                syncRemotePresence();
            };

            syncRemotePresence();

            if (meeting.participants) {
                meeting.participants.on?.('participantJoined', handleParticipantJoined);
                meeting.participants.on?.('participantLeft', handleParticipantLeft);
            }

            return () => {
                if (meeting.participants) {
                    meeting.participants.off?.('participantJoined', handleParticipantJoined);
                    meeting.participants.off?.('participantLeft', handleParticipantLeft);
                }
            };
        }
    }, [meeting]);

    useEffect(() => {
        if (!VIRTUAL_BG_FEATURE_ENABLED || !meeting?.self) return;
        let cancelled = false;

        const bootstrapVirtualBackground = async () => {
            const meetingChanged = virtualBgMeetingRef.current !== meeting;
            if (meetingChanged) {
                virtualBgMeetingRef.current = meeting;
                virtualBgReadyRef.current = false;
            }

            if (virtualBgReadyRef.current) return;

            const initResult = await initializeVirtualBackgroundMiddleware(meeting);
            if (cancelled) return;

            if (!initResult.supported) {
                setVirtualBgSupported(false);
                setVirtualBgError("Virtual background isn't supported on this browser/device.");
                return;
            }

            if (!initResult.ok) {
                console.warn("[SpeedNetworkingMatch] virtual background middleware-init-failed:", initResult.error);
                setVirtualBgSupported(true);
                setVirtualBgError("Virtual background setup failed. Camera will continue normally.");
                return;
            }

            virtualBgReadyRef.current = true;
            setVirtualBgSupported(true);
            setVirtualBgError('');

            const applyResult = await applyBackgroundSelection(meeting, virtualBgSelection);
            if (cancelled) return;
            if (!applyResult.ok) {
                console.warn("[SpeedNetworkingMatch] virtual background middleware-apply-failed:", applyResult.error);
                setVirtualBgError("Unable to apply virtual background right now.");
            }
        };

        bootstrapVirtualBackground();

        return () => {
            cancelled = true;
        };
    }, [meeting, virtualBgSelection]);

    const applyAndPersistVirtualBackground = async (nextSelection) => {
        const savedSelection = saveBackgroundSelection(nextSelection);
        setVirtualBgSelection(savedSelection);
        setVirtualBgError('');

        if (!VIRTUAL_BG_FEATURE_ENABLED || !meeting?.self || !virtualBgReadyRef.current) {
            return;
        }

        const result = await applyBackgroundSelection(meeting, savedSelection);
        if (!result.ok) {
            console.warn("[SpeedNetworkingMatch] virtual background middleware-apply-failed:", result.error);
            if (!result.supported) {
                setVirtualBgSupported(false);
                setVirtualBgError("Virtual background isn't supported on this browser/device.");
            } else {
                setVirtualBgError("Unable to apply virtual background right now.");
            }
            return;
        }

        setVirtualBgSupported(true);
        setVirtualBgError('');
    };

    const handleVirtualBgUpload = async (event) => {
        const file = event?.target?.files?.[0];
        if (event?.target) {
            event.target.value = '';
        }

        const validation = validateBackgroundUpload(file);
        if (!validation.ok) {
            console.warn("[SpeedNetworkingMatch] virtual background upload-invalid:", validation.error);
            setVirtualBgError(validation.error);
            return;
        }

        try {
            const imageUrl = await readFileAsDataUrl(file);
            await applyAndPersistVirtualBackground({
                mode: 'image',
                source: 'upload',
                imageUrl
            });
        } catch (error) {
            console.warn("[SpeedNetworkingMatch] virtual background upload-invalid:", error);
            setVirtualBgError(error?.message || 'Failed to process uploaded image.');
        }
    };

    // Track whether partner has actually joined the RTK room.
    // RTK SDK versions expose participants in slightly different collections;
    // read all known shapes so the "waiting for partner" banner does not get stuck
    // when the remote participant is actually present.
    useEffect(() => {
        if (!meeting) {
            setHasRemoteParticipant(false);
            return;
        }

        const syncRemotePresence = () => {
            const remoteExists = getRemoteParticipants(meeting).length > 0;
            setHasRemoteParticipant(remoteExists);
        };

        syncRemotePresence();
        const intervalId = setInterval(syncRemotePresence, 1000);

        return () => clearInterval(intervalId);
    }, [meeting, match?.id]);

    // Timer countdown
    useEffect(() => {
        autoAdvanceTriggeredRef.current = false;
        const totalSeconds = (session?.duration_minutes || 0) * 60 + (match?.extended_by_seconds || 0);

        const rawStart = match?.started_at || match?.created_at;
        const parsedStart = rawStart ? new Date(rawStart).getTime() : NaN;
        if (Number.isFinite(parsedStart)) {
            matchStartMsRef.current = parsedStart;
        } else {
            matchStartMsRef.current = Date.now();
        }
        const durationMs = totalSeconds * 1000;

        const tick = () => {
            const now = Date.now();
            const elapsed = now - matchStartMsRef.current;
            const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
            setTimeRemaining(remaining);

            if (remaining === 0 && !autoAdvanceTriggeredRef.current) {
                autoAdvanceTriggeredRef.current = true;
                if ((session?.buffer_seconds || 0) > 0) {
                    onMatchTimerExpired?.();
                } else {
                    onNextMatch();
                }
            }
        };

        // Run immediately so UI updates instantly instead of waiting for first interval tick.
        tick();

        const interval = setInterval(() => {
            tick();
        }, 1000);

        return () => clearInterval(interval);
    }, [
        match?.id,
        match?.started_at,
        match?.created_at,
        match?.extended_by_seconds,
        session?.duration_minutes,
        session?.buffer_seconds,
        onNextMatch,
        onMatchTimerExpired
    ]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (meeting) {
                meeting.leave();
            }
        };
    }, [meeting]);

    // Improved partner logic: normalize id types to avoid string/number mismatches.
    const currentId = currentUserId != null ? String(currentUserId) : null;
    const participant1Id = match?.participant_1?.id != null ? String(match.participant_1.id) : null;
    const participant2Id = match?.participant_2?.id != null ? String(match.participant_2.id) : null;
    const isParticipant1 = currentId && participant1Id && currentId === participant1Id;
    const isParticipant2 = currentId && participant2Id && currentId === participant2Id;
    const partner = isParticipant1
        ? match.participant_2
        : isParticipant2
            ? match.participant_1
            : (match.participant_2 || match.participant_1);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isChatNearBottom = useCallback(() => {
        const el = chatListRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }, []);

    const scrollChatToBottom = useCallback((behavior = 'smooth') => {
        requestAnimationFrame(() => {
            chatBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
        });
    }, []);

    const fetchChatMessages = useCallback(async (
        conversationId,
        { beforeId = null, afterId = null, replace = false, scrollToLatest = false, limit = null } = {}
    ) => {
        if (!conversationId || chatFetchInFlightRef.current) return [];

        chatFetchInFlightRef.current = true;
        const listEl = chatListRef.current;
        const previousScrollHeight = beforeId && listEl ? listEl.scrollHeight : 0;
        const previousScrollTop = beforeId && listEl ? listEl.scrollTop : 0;

        try {
            const params = new URLSearchParams({
                cursor: '1',
                limit: String(limit ?? SPEED_NETWORKING_DM_PAGE_SIZE),
            });
            if (beforeId) params.set('before_id', String(beforeId));
            if (afterId) params.set('after_id', String(afterId));

            const url = `${API_ROOT}/messaging/conversations/${conversationId}/messages/?${params.toString()}`;
            const res = await fetch(url, { headers: { ...authHeader(), Accept: 'application/json' } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.detail || 'Failed to load chat messages.');
            }

            const { rows, hasMore } = normalizeMessageCursorResponse(data);

            if (beforeId) {
                if (rows.length) {
                    setChatMessages((prev) => mergeMessagesById(rows, prev));
                    requestAnimationFrame(() => {
                        const currentEl = chatListRef.current;
                        if (currentEl) {
                            currentEl.scrollTop = currentEl.scrollHeight - previousScrollHeight + previousScrollTop;
                        }
                    });
                }
                setChatHasOlder(hasMore);
                return rows;
            }

            if (afterId) {
                if (rows.length) {
                    const nearBottom = isChatNearBottom();
                    setChatMessages((prev) => mergeMessagesById(prev, rows));
                    if (nearBottom) scrollChatToBottom();
                }
                return rows;
            }

            setChatMessages((prev) => replace ? rows : mergeMessagesById(prev, rows));
            setChatHasOlder(hasMore);
            if (scrollToLatest) scrollChatToBottom('auto');
            return rows;
        } catch (error) {
            setChatError(error?.message || 'Failed to load chat messages.');
            return [];
        } finally {
            chatFetchInFlightRef.current = false;
        }
    }, [isChatNearBottom, scrollChatToBottom]);

    const loadOlderSpeedNetworkingMessages = useCallback(async () => {
        if (!chatConversationId || !chatHasOlder || chatLoadingOlder || chatOlderInFlightRef.current) return;
        const oldestId = chatMessages[0]?.id;
        if (!oldestId) return;

        chatOlderInFlightRef.current = true;
        setChatLoadingOlder(true);
        try {
            await fetchChatMessages(chatConversationId, { beforeId: oldestId });
        } finally {
            chatOlderInFlightRef.current = false;
            setChatLoadingOlder(false);
        }
    }, [chatConversationId, chatHasOlder, chatLoadingOlder, chatMessages, fetchChatMessages]);

    const handleSpeedNetworkingChatScroll = useCallback(() => {
        const el = chatListRef.current;
        if (!el) return;
        if (el.scrollTop <= 80) {
            loadOlderSpeedNetworkingMessages();
        }
    }, [loadOlderSpeedNetworkingMessages]);

    const openSpeedNetworkingChat = async () => {
        if (!partner?.id) return;
        setChatOpen(true);
        setChatLoading(true);
        setChatError('');
        setChatConversationId(null);
        setChatMessages([]);
        setChatHasOlder(false);
        try {
            const res = await fetch(`${API_ROOT}/messaging/conversations/ensure-direct/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({
                    recipient_id: partner.id,
                    // Required for live-event non-friend DM permission.
                    event_id: eventId || null,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.id) {
                setChatError(data?.detail || 'Unable to open private chat.');
                return;
            }
            setChatConversationId(data.id);
            await fetchChatMessages(data.id, { replace: true, scrollToLatest: true, limit: 10 });
        } finally {
            setChatLoading(false);
        }
    };

    const sendSpeedNetworkingMessage = async () => {
        const text = chatInput.trim();
        if (!text || !chatConversationId || chatSending) return;
        setChatSending(true);
        setChatError('');
        try {
            const res = await fetch(`${API_ROOT}/messaging/conversations/${chatConversationId}/messages/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ body: text, event_id: eventId || undefined }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.detail || 'Failed to send message.');
            }
            setChatMessages((prev) => mergeMessagesById(prev, [data]));
            setChatInput('');
            scrollChatToBottom();
        } catch (error) {
            setChatError(error?.message || 'Failed to send message.');
        } finally {
            setChatSending(false);
        }
    };

    // Same low-load model as public chat: WebSocket first, HTTP only as fallback.
    useEffect(() => {
        if (!chatOpen || !chatConversationId) return;

        let alive = true;
        chatWsConnectedRef.current = false;

        try {
            const wsUrl = toWsUrl(`/ws/messaging/conversations/${chatConversationId}/`);
            const ws = new WebSocket(wsUrl);
            chatWsRef.current = ws;

            ws.onopen = () => {
                if (!alive) return;
                chatWsConnectedRef.current = true;
            };

            ws.onmessage = (event) => {
                if (!alive) return;
                try {
                    const data = JSON.parse(event.data);
                    if (!data?.message) return;
                    if (['message.created', 'message.edited', 'message.deleted'].includes(data.type)) {
                        const nearBottom = isChatNearBottom();
                        setChatMessages((prev) => mergeMessagesById(prev, [data.message]));
                        if (nearBottom || String(data.message?.sender_id || '') === String(currentUserId || '')) {
                            scrollChatToBottom();
                        }
                    }
                } catch (error) {
                    console.warn('[SpeedNetworkingChat WS] parse error', error);
                }
            };

            ws.onerror = () => {
                chatWsConnectedRef.current = false;
            };

            ws.onclose = () => {
                if (chatWsRef.current === ws) chatWsRef.current = null;
                chatWsConnectedRef.current = false;
            };
        } catch {
            chatWsRef.current = null;
            chatWsConnectedRef.current = false;
        }

        const poll = setInterval(() => {
            const now = Date.now();
            const minDelay = chatWsConnectedRef.current
                ? SPEED_NETWORKING_DM_WS_FALLBACK_MS
                : SPEED_NETWORKING_DM_ACTIVE_POLL_MS;
            if (now - chatFallbackLastFetchRef.current < minDelay) return;
            chatFallbackLastFetchRef.current = now;

            const currentMessages = chatMessagesRef.current || [];
            const latestId = currentMessages[currentMessages.length - 1]?.id;
            fetchChatMessages(chatConversationId, latestId ? { afterId: latestId } : {});
        }, SPEED_NETWORKING_DM_ACTIVE_POLL_MS);

        return () => {
            alive = false;
            clearInterval(poll);
            chatWsConnectedRef.current = false;
            if (chatWsRef.current) {
                chatWsRef.current.close();
                chatWsRef.current = null;
            }
        };
    }, [chatOpen, chatConversationId, currentUserId, fetchChatMessages, isChatNearBottom, scrollChatToBottom]);

    useEffect(() => {
        if (!chatOpen) return;
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatOpen]);

    // Extension state
    const EXTENSION_WINDOW_SECONDS = 60;
    const isP1 = String(match?.participant_1?.id) === String(currentUserId);
    const myExtensionRequested = isP1 ? match?.extension_requested_p1 : match?.extension_requested_p2;
    const partnerExtensionRequested = isP1 ? match?.extension_requested_p2 : match?.extension_requested_p1;
    const extensionApplied = !!match?.extension_applied;
    const showExtensionBanner = timeRemaining <= EXTENSION_WINDOW_SECONDS && !extensionApplied;

    const [extensionLoading, setExtensionLoading] = useState(false);
    const [extensionError, setExtensionError] = useState(null);

    const handleRequestExtension = async () => {
        // Prevent double-click and multiple requests
        if (extensionLoading || myExtensionRequested || extensionApplied) {
            return;
        }

        setExtensionLoading(true);
        setExtensionError(null);

        try {
            const url = `${API_ROOT}/events/${eventId}/speed-networking/matches/${match.id}/request-extension/`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const error = await res.json();
                setExtensionError(error.error || 'Failed to request extension');
                console.error('[Extension] API error:', res.status, error);
                setExtensionLoading(false);
            }
            // On success, wait for WebSocket confirmation (extension_requested event will update UI)
        } catch (err) {
            setExtensionError('Network error - please try again');
            console.error('[Extension] Request failed:', err);
            setExtensionLoading(false);
        }
    };

    // Calculate progress with total duration
    const totalDuration = session.duration_minutes * 60 + (match?.extended_by_seconds || 0);
    const progress = (timeRemaining / totalDuration) * 100;

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#070a14',
            position: 'relative'
        }}>
            {/* Top AppBar */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'rgba(5,7,12,0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                zIndex: 10
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, gap: 1 }}>
                    <IconButton size="small" onClick={onLeave} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: 14 }}>
                        Speed Networking  ·  {session.name || 'Session'}
                    </Typography>
                    <Typography sx={{ color: timeRemaining < 30 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(timeRemaining)}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 3,
                        bgcolor: 'rgba(255,255,255,0.08)',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: timeRemaining < 30 ? '#ef4444' : '#22c55e'
                        }
                    }}
                />

                {/* Extension Banner */}
                {showExtensionBanner && !extensionApplied && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 1.5, px: 2, py: 0.75,
                        bgcolor: 'rgba(234,179,8,0.12)',
                        borderBottom: '1px solid rgba(234,179,8,0.25)'
                    }}>
                        {!myExtensionRequested && !partnerExtensionRequested && (
                            <>
                                <Typography sx={{ color: '#fbbf24', fontSize: 13 }}>
                                    Round ending soon
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={extensionLoading}
                                    onClick={handleRequestExtension}
                                    sx={{ color: '#fbbf24', borderColor: '#fbbf24', textTransform: 'none', py: 0.25, px: 1.5, fontSize: 12 }}
                                >
                                    +{session.duration_minutes} min
                                </Button>
                            </>
                        )}
                        {myExtensionRequested && !partnerExtensionRequested && (
                            <Typography sx={{ color: '#fbbf24', fontSize: 13 }}>
                                Waiting for partner to confirm extension…
                            </Typography>
                        )}
                        {!myExtensionRequested && partnerExtensionRequested && (
                            <>
                                <Typography sx={{ color: '#fbbf24', fontSize: 13 }}>
                                    Partner wants to extend!
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    disabled={extensionLoading}
                                    onClick={handleRequestExtension}
                                    sx={{ bgcolor: '#fbbf24', color: '#000', textTransform: 'none', py: 0.25, px: 1.5, fontSize: 12, '&:hover': { bgcolor: '#f59e0b' } }}
                                >
                                    Confirm +{session.duration_minutes} min
                                </Button>
                            </>
                        )}
                    </Box>
                )}
                {extensionApplied && (
                    <Box sx={{
                        textAlign: 'center', py: 0.5,
                        bgcolor: 'rgba(34,197,94,0.12)',
                        borderBottom: '1px solid rgba(34,197,94,0.2)'
                    }}>
                        <Typography sx={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                            Time extended by {session.duration_minutes} min
                        </Typography>
                    </Box>
                )}
                {extensionError && (
                    <Box sx={{
                        textAlign: 'center', py: 0.5,
                        bgcolor: 'rgba(239,68,68,0.12)',
                        borderBottom: '1px solid rgba(239,68,68,0.2)'
                    }}>
                        <Typography sx={{ color: '#ef4444', fontSize: 12 }}>
                            {extensionError}
                        </Typography>
                    </Box>
                )}
            </Box>
            {/* Main Content: RTK + Partner Profile Sidebar */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
                {/* Left: RTK Meeting */}
                <Box sx={{
                    flex: 1,
                    position: 'relative',
                    minWidth: 0,
                    '& .rtk-meeting': {
                        width: '100%',
                        height: '100%'
                    },
                    '& [class*="controlbar"]': {
                        flexWrap: 'nowrap',
                        overflowX: 'visible !important'
                    },
                    '& [class*="control-item"]': {
                        minWidth: 'auto',
                        whiteSpace: 'nowrap'
                    }
                }}>
                    {videoError ? (
                        <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'rgba(239,68,68,0.1)', borderRadius: 2, border: '1px solid #ef4444', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                            <Typography variant="h6" color="error" gutterBottom>
                                {videoError}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                You can still use audio if available.
                                <br />
                                Please check backend logs/keys if testing.
                            </Typography>
                        </Box>
                    ) : meeting ? (
                        <>
                            <RealtimeKitProvider value={meeting}>
                                <RtkMeeting
                                    mode="fill"
                                    meeting={meeting}
                                    showSetupScreen={false}
                                    config={speedNetworkingUiConfigRef.current}
                                />
                            </RealtimeKitProvider>
                            {VIRTUAL_BG_FEATURE_ENABLED && (
                                <IconButton
                                    onClick={() => setShowVirtualBgDialog(true)}
                                    sx={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        zIndex: 12,
                                        color: '#fff',
                                        bgcolor: 'rgba(0,0,0,0.55)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' }
                                    }}
                                    size="small"
                                    aria-label="Virtual background settings"
                                >
                                    <SettingsIcon fontSize="small" />
                                </IconButton>
                            )}
                            {!hasRemoteParticipant && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        px: 2,
                                        py: 1,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(0,0,0,0.55)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        zIndex: 11
                                    }}
                                >
                                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center' }}>
                                        Waiting for {[partner?.first_name, partner?.last_name].filter(Boolean).join(' ') || partner?.username || 'partner'} to join this match...
                                    </Typography>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.3)' }}>Loading Video...</Typography>
                        </Box>
                    )}
                </Box>

                {/* Right: Partner Profile Sidebar */}
                {showPartnerSidebar ? (
                    <Box sx={{
                        width: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'rgba(255,255,255,0.03)',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'auto'
                    }}>
                        <PartnerProfileSidebar
                            partner={partner}
                            match={match}
                            onMemberInfo={onMemberInfo}
                            onOpenChat={openSpeedNetworkingChat}
                            onClosePanel={() => setShowPartnerSidebar(false)}
                            showBreakdown={showBreakdown}
                            setShowBreakdown={setShowBreakdown}
                        />
                    </Box>
                ) : (
                    <Box sx={{ width: 52, borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: 1 }}>
                        <IconButton size="small" onClick={() => setShowPartnerSidebar(true)} sx={{ color: 'rgba(255,255,255,0.75)' }}>
                            <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />
                        </IconButton>
                    </Box>
                )}

                {/* Right-most: Chat Panel (overlay so video/profile area does not shrink) */}
                {chatOpen && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: { xs: '100%', sm: 360, md: 400 },
                            maxWidth: '100%',
                            bgcolor: '#0b101a',
                            color: '#fff',
                            borderLeft: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: '-18px 0 40px rgba(0,0,0,0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 30
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
                                    {[partner?.first_name, partner?.last_name].filter(Boolean).join(' ') || partner?.username || 'Partner'}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Private Chat</Typography>
                            </Box>
                            <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>

                        <Box
                            ref={chatListRef}
                            onScroll={handleSpeedNetworkingChatScroll}
                            sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, py: 1.5 }}
                        >
                            {chatLoadingOlder && (
                                <Box sx={{ mb: 1.5, textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                        Loading older messages…
                                    </Typography>
                                </Box>
                            )}
                            {chatError && (
                                <Typography color="error" sx={{ mb: 1, fontSize: 12 }}>
                                    {chatError}
                                </Typography>
                            )}
                            {chatLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress size={22} />
                                </Box>
                            ) : chatMessages.length === 0 ? (
                                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                                    No messages yet.
                                </Typography>
                            ) : (
                                chatMessages.map((m) => {
                                    const mine = !!m?.mine;
                                    return (
                                        <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1 }}>
                                            <Box sx={{
                                                maxWidth: '82%',
                                                px: 1.2,
                                                py: 0.8,
                                                borderRadius: 2,
                                                bgcolor: mine ? 'rgba(20,184,177,0.22)' : 'rgba(255,255,255,0.08)',
                                                color: '#fff'
                                            }}>
                                                <Typography sx={{ fontSize: 13 }}>{m.body}</Typography>
                                            </Box>
                                        </Box>
                                    );
                                })
                            )}
                            <Box ref={chatBottomRef} />
                        </Box>

                        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendSpeedNetworkingMessage();
                                    }
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <IconButton size="small" onClick={sendSpeedNetworkingMessage} disabled={chatSending || !chatInput.trim()}>
                                            {chatSending ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                                        </IconButton>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        bgcolor: 'rgba(255,255,255,0.04)'
                                    }
                                }}
                            />
                        </Box>
                    </Box>
                )}
            </Box>
            {/* Bottom Controls */}
            <Box sx={{
                p: 2,
                bgcolor: 'rgba(5,7,12,0.92)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                zIndex: 10
            }}>
                <Button
                    variant="contained"
                    startIcon={<SkipNextIcon />}
                    disabled={loading}
                    onClick={onNextMatch}
                    sx={{
                        bgcolor: '#5a78ff',
                        '&:hover': { bgcolor: '#4a68ef' },
                        px: 3
                    }}
                >
                    {loading ? 'Finding...' : 'Next Match'}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<ExitToAppIcon />}
                    disabled={loading}
                    onClick={onLeave}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                        '&:hover': {
                            borderColor: '#ef4444',
                            bgcolor: 'rgba(239,68,68,0.1)'
                        }
                    }}
                >
                    Leave Session
                </Button>
            </Box>
            {VIRTUAL_BG_FEATURE_ENABLED && (
                <Dialog
                    open={showVirtualBgDialog}
                    onClose={() => setShowVirtualBgDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            bgcolor: '#0b1220',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.16)',
                            borderRadius: 2
                        }
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                        <WallpaperRoundedIcon fontSize="small" />
                        Virtual Background
                        {!virtualBgSupported && (
                            <Chip label="Unsupported" size="small" sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(239,68,68,0.2)', color: '#fecaca' }} />
                        )}
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                            <Button
                                size="small"
                                variant={virtualBgSelection.mode === 'none' ? 'contained' : 'outlined'}
                                onClick={() => applyAndPersistVirtualBackground({ mode: 'none' })}
                                sx={{ textTransform: 'none' }}
                            >
                                None
                            </Button>
                            <Button
                                size="small"
                                startIcon={<BlurOnRoundedIcon />}
                                variant={virtualBgSelection.mode === 'blur' && virtualBgSelection.blurLevel === 'low' ? 'contained' : 'outlined'}
                                onClick={() => applyAndPersistVirtualBackground({ mode: 'blur', blurLevel: 'low' })}
                                sx={{ textTransform: 'none' }}
                            >
                                Blur (Low)
                            </Button>
                            <Button
                                size="small"
                                startIcon={<BlurOnRoundedIcon />}
                                variant={virtualBgSelection.mode === 'blur' && virtualBgSelection.blurLevel === 'high' ? 'contained' : 'outlined'}
                                onClick={() => applyAndPersistVirtualBackground({ mode: 'blur', blurLevel: 'high' })}
                                sx={{ textTransform: 'none' }}
                            >
                                Blur (High)
                            </Button>
                            <Button
                                size="small"
                                startIcon={<UploadFileRoundedIcon />}
                                variant={virtualBgSelection.mode === 'image' && virtualBgSelection.source === 'upload' ? 'contained' : 'outlined'}
                                onClick={() => virtualBgUploadInputRef.current?.click()}
                                sx={{ textTransform: 'none' }}
                            >
                                Upload
                            </Button>
                            <input
                                ref={virtualBgUploadInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleVirtualBgUpload}
                                style={{ display: 'none' }}
                            />
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                            {VIRTUAL_BG_PRESETS.map((preset) => {
                                const isActive = virtualBgSelection.mode === 'image' && virtualBgSelection.imageUrl === preset.imageUrl;
                                return (
                                    <Button
                                        key={preset.id}
                                        size="small"
                                        variant={isActive ? 'contained' : 'outlined'}
                                        onClick={() => applyAndPersistVirtualBackground({ mode: 'image', source: 'preset', imageUrl: preset.imageUrl })}
                                        sx={{ textTransform: 'none', minWidth: 88 }}
                                    >
                                        {preset.label}
                                    </Button>
                                );
                            })}
                        </Stack>
                        {(virtualBgError || !virtualBgSupported) && (
                            <Typography sx={{ fontSize: 12, color: '#fca5a5' }}>
                                {virtualBgError || "Virtual background isn't supported on this browser/device."}
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setShowVirtualBgDialog(false)} sx={{ color: '#fff', textTransform: 'none' }}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

// Partner Profile Sidebar Component
function PartnerProfileSidebar({ partner, match, onMemberInfo, onOpenChat, onClosePanel, showBreakdown, setShowBreakdown }) {
    return (
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Header label */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Talking With
                </Typography>
                <IconButton size="small" onClick={onClosePanel} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Avatar + Name (clickable) */}
            <Box
                onClick={() => onMemberInfo && onMemberInfo(partner)}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    cursor: onMemberInfo ? 'pointer' : 'default',
                    transition: 'opacity 0.2s',
                    '&:hover': onMemberInfo ? { opacity: 0.85 } : {}
                }}
            >
                <Avatar
                    src={partner?.avatar_url || ''}
                    sx={{
                        width: 72,
                        height: 72,
                        fontSize: 28,
                        bgcolor: 'rgba(90,120,255,0.3)',
                        border: '2px solid rgba(90,120,255,0.4)'
                    }}
                >
                    {(partner?.first_name || partner?.username || 'P').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>
                        {[partner?.first_name, partner?.last_name].filter(Boolean).join(' ') || partner?.username || 'Partner'}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* Partner's Interests */}
            {partner?.interests && partner.interests.length > 0 && (
                <InterestDisplay interests={partner.interests} title="Their Interests" />
            )}

            {/* Match Probability */}
            {match?.match_probability != null && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Match Probability</Typography>
                        <Typography sx={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>
                            {match.match_probability.toFixed(0)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={match.match_probability}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.08)',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: match.match_probability >= 70 ? '#22c55e' : match.match_probability >= 40 ? '#f59e0b' : '#ef4444',
                                borderRadius: 3
                            }
                        }}
                    />
                </Box>
            )}

            {/* Match Score Breakdown (collapsible) */}
            {match?.match_breakdown && (
                <Box>
                    <Button
                        size="small"
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        endIcon={showBreakdown ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 11,
                            textTransform: 'none',
                            p: 0,
                            '&:hover': { color: '#fff' }
                        }}
                    >
                        Match Score Details
                    </Button>
                    <Collapse in={showBreakdown}>
                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {Object.entries(match.match_breakdown).map(([criterion, score]) => (
                                <Box key={criterion}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>
                                            {criterion}
                                        </Typography>
                                        <Typography sx={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>
                                            {score.toFixed(0)}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={score}
                                        sx={{
                                            height: 3,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.08)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: score > 75 ? '#22c55e' : score > 50 ? '#f59e0b' : '#ef4444',
                                                borderRadius: 2
                                            }
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}

            {/* Profile and Chat actions */}
            {(onMemberInfo || onOpenChat) && (
                <>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                    {onMemberInfo && (
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => onMemberInfo(partner)}
                            sx={{
                                borderColor: 'rgba(90,120,255,0.5)',
                                color: '#5a78ff',
                                textTransform: 'none',
                                borderRadius: 2,
                                '&:hover': {
                                    borderColor: '#5a78ff',
                                    bgcolor: 'rgba(90,120,255,0.08)'
                                }
                            }}
                        >
                            View Profile
                        </Button>
                    )}
                    {onOpenChat && (
                        <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<ChatBubbleOutlineIcon />}
                            onClick={onOpenChat}
                            sx={{
                                mt: 1,
                                borderColor: 'rgba(34,197,94,0.5)',
                                color: '#22c55e',
                                textTransform: 'none',
                                borderRadius: 2,
                                '&:hover': {
                                    borderColor: '#22c55e',
                                    bgcolor: 'rgba(34,197,94,0.08)'
                                }
                            }}
                        >
                            Chat
                        </Button>
                    )}
                </>
            )}
        </Box>
    );
}
