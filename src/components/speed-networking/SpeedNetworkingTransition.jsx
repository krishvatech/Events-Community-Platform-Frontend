import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Box, Button, Typography } from '@mui/material';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

function authHeader() {
    const token = localStorage.getItem('access') || localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SpeedNetworkingTransition({
    match,
    session,
    currentUserId,
    onTransitionEnd
}) {
    const partner = useMemo(() => {
        if (!match) return null;
        return String(match?.participant_1?.id) === String(currentUserId)
            ? match?.participant_2
            : match?.participant_1;
    }, [match, currentUserId]);

    const [timeLeft, setTimeLeft] = useState(null);
    const [connectStatus, setConnectStatus] = useState('idle');
    const bufferSeconds = session?.buffer_seconds || 0;
    const progress = bufferSeconds > 0 && typeof timeLeft === 'number'
        ? Math.max(0, Math.min(100, (timeLeft / bufferSeconds) * 100))
        : 0;

    useEffect(() => {
        if (!match || !session) return;

        const totalMatchMs = (session.duration_minutes * 60 + (match.extended_by_seconds || 0)) * 1000;
        const bufferMs = (session.buffer_seconds || 0) * 1000;
        const matchStart = new Date(match.created_at).getTime();
        const transitionEndsAt = matchStart + totalMatchMs + bufferMs;

        let intervalId = null;

        const tick = () => {
            const remaining = Math.max(0, Math.ceil((transitionEndsAt - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining === 0) {
                if (intervalId) clearInterval(intervalId);
                onTransitionEnd?.();
            }
        };

        tick();
        intervalId = setInterval(tick, 500);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [match, session, onTransitionEnd]);

    useEffect(() => {
        const checkRelationship = async () => {
            if (!partner?.id) return;
            try {
                const res = await fetch(`${API_ROOT}/friends/status/?user_id=${partner.id}`, {
                    headers: authHeader()
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data?.status === 'friends') {
                    setConnectStatus('connected');
                } else if (data?.status === 'outgoing_pending' || data?.status === 'incoming_pending') {
                    setConnectStatus('sent');
                }
            } catch {
                // Keep optimistic default if status check fails.
            }
        };
        checkRelationship();
    }, [partner?.id]);

    const handleConnect = async () => {
        if (!partner?.id || connectStatus === 'loading' || connectStatus === 'sent' || connectStatus === 'connected') {
            return;
        }

        setConnectStatus('loading');

        try {
            const res = await fetch(`${API_ROOT}/friend-requests/`, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_user: partner.id })
            });

            if (res.ok || res.status === 201) {
                setConnectStatus('sent');
                return;
            }

            if (res.status === 400) {
                const data = await res.json().catch(() => ({}));
                const raw = JSON.stringify(data).toLowerCase();
                if (raw.includes('already friends')) {
                    setConnectStatus('connected');
                    return;
                }
                if (raw.includes('already') || raw.includes('exists') || raw.includes('pending')) {
                    setConnectStatus('sent');
                    return;
                }
            }

            setConnectStatus('error');
        } catch {
            setConnectStatus('error');
        }
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, sm: 4 },
                textAlign: 'center',
                background: `
                    radial-gradient(1200px 500px at 10% 10%, rgba(34,197,94,0.16), transparent 60%),
                    radial-gradient(900px 420px at 90% 20%, rgba(56,189,248,0.14), transparent 60%),
                    linear-gradient(180deg, #040918 0%, #020617 100%)
                `
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 460,
                    p: { xs: 2.5, sm: 3.5 },
                    borderRadius: 4,
                    border: '1px solid rgba(148,163,184,0.25)',
                    bgcolor: 'rgba(8,15,35,0.7)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.45)'
                }}
            >
                <Typography
                    sx={{
                        color: 'rgba(191,219,254,0.95)',
                        fontWeight: 800,
                        fontSize: { xs: 24, sm: 30 },
                        lineHeight: 1.1
                    }}
                >
                    Round Complete
                </Typography>

                <Typography sx={{ mt: 0.75, color: 'rgba(148,163,184,0.9)', fontSize: 14 }}>
                    Save this connection before the next round starts.
                </Typography>

                <Box
                    sx={{
                        mt: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid rgba(148,163,184,0.2)',
                        bgcolor: 'rgba(2,6,23,0.55)'
                    }}
                >
                    <Box
                        sx={{
                            width: 88,
                            height: 88,
                            borderRadius: '50%',
                            p: '3px',
                            background: `conic-gradient(#22c55e ${progress * 3.6}deg, rgba(148,163,184,0.2) 0deg)`,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0
                        }}
                    >
                        <Avatar src={partner?.avatar_url || ''} sx={{ width: 82, height: 82, border: '2px solid rgba(255,255,255,0.85)' }} />
                    </Box>

                    <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>
                            {partner?.full_name || partner?.username || 'Participant'}
                        </Typography>
                        {(partner?.job_title || partner?.company) && (
                            <Typography sx={{ mt: 0.5, color: 'rgba(148,163,184,0.95)', fontSize: 14 }}>
                                {partner?.job_title || ''}{partner?.job_title && partner?.company ? ' at ' : ''}{partner?.company || ''}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {connectStatus === 'connected' ? (
                    <Box
                        sx={{
                            mt: 2.5,
                            px: 2.2,
                            py: 1,
                            borderRadius: 999,
                            border: '1px solid rgba(52,211,153,0.45)',
                            bgcolor: 'rgba(16,185,129,0.14)',
                            color: '#6ee7b7',
                            fontWeight: 700,
                            fontSize: 14
                        }}
                    >
                        You are already friends
                    </Box>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleConnect}
                        disabled={connectStatus === 'loading' || connectStatus === 'sent'}
                        sx={{
                            mt: 2.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 999,
                            px: 3.5,
                            py: 1.2,
                            bgcolor: connectStatus === 'sent' ? 'rgba(20,184,166,0.4)' : '#14b8a6',
                            color: connectStatus === 'sent' ? 'rgba(236,253,245,0.95)' : '#022c22',
                            '&:hover': { bgcolor: connectStatus === 'sent' ? 'rgba(20,184,166,0.4)' : '#0d9488' }
                        }}
                    >
                        {connectStatus === 'sent'
                            ? 'Request Sent'
                            : connectStatus === 'loading'
                                ? 'Sending...'
                                : 'Connect'}
                    </Button>
                )}

                {connectStatus === 'error' && (
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#f87171' }}>
                        Could not send request. Try again.
                    </Typography>
                )}

                {(session?.buffer_seconds || 0) > 0 && (
                    <Typography sx={{ mt: 2, color: 'rgba(191,219,254,0.9)', fontWeight: 600, fontSize: 15 }}>
                        Next match in <Box component="span" sx={{ color: '#34d399' }}>{timeLeft ?? '...'}</Box>s
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
