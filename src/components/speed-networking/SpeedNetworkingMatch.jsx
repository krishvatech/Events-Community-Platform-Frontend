import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, LinearProgress, Collapse, Chip, Avatar, Divider, IconButton } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import { useDyteClient, DyteProvider } from '@dytesdk/react-web-core';
import { DyteMeeting } from '@dytesdk/react-ui-kit';

// Style to ensure Dyte UI controls don't overflow and Chat is always visible
const dyteStyles = `
    .dyte-meeting-ui {
        width: 100% !important;
        height: 100% !important;
    }
    /* Ensure control bar buttons don't wrap or overflow */
    .dyte-controlbar,
    [class*="controlbar"] {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        padding: 8px !important;
        background: rgba(0,0,0,0.8) !important;
    }
    /* Ensure all control bar buttons are visible */
    .dyte-controlbar button,
    [class*="controlbar"] button,
    [class*="control-item"] {
        min-width: auto !important;
        flex-shrink: 0 !important;
    }
    /* Ensure sidebar/chat doesn't get hidden */
    [class*="sidebar"],
    [class*="chat"] {
        visibility: visible !important;
        opacity: 1 !important;
    }
`;

export default function SpeedNetworkingMatch({
    match,
    session,
    onNextMatch,
    onLeave,
    loading,
    currentUserId,
    onMemberInfo
}) {
    const [meeting, initMeeting] = useDyteClient();
    const [timeRemaining, setTimeRemaining] = useState(session.duration_minutes * 60);
    const [videoError, setVideoError] = useState(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const autoAdvanceTriggeredRef = useRef(false);

    // Inject Dyte UI styles to ensure Chat and controls are always visible
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = dyteStyles;
        styleElement.id = 'dyte-visibility-styles';
        document.head.appendChild(styleElement);

        return () => {
            const existingStyle = document.getElementById('dyte-visibility-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    // Initialize Dyte Meeting for this match
    useEffect(() => {
        if (match?.dyte_token) {
            console.log("[SpeedNetworkingMatch] Initializing Dyte meeting with token for match:", match.id);
            initMeeting({
                authToken: match.dyte_token,
                defaults: {
                    audio: false,
                    video: false,
                },
            });
            setVideoError(null);
        } else {
            console.error("Missing Dyte Token for match:", match);
            setVideoError("Video connection unavailable (Server Error)");
        }
    }, [match, initMeeting]);

    // Log participants when meeting changes
    useEffect(() => {
        if (meeting) {
            console.log("[SpeedNetworkingMatch] Meeting joined. Participants:", {
                total: meeting.participants?.count || 0,
                remote: meeting.participants?.remoteParticipants?.length || 0,
                self: meeting.self?.id
            });

            // Listen for participant events
            const handleParticipantJoined = (event) => {
                console.log("[SpeedNetworkingMatch] Participant joined:", event);
            };

            const handleParticipantLeft = (event) => {
                console.log("[SpeedNetworkingMatch] Participant left:", event);
            };

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

    // Timer countdown
    useEffect(() => {
        autoAdvanceTriggeredRef.current = false;
        setTimeRemaining(session.duration_minutes * 60);

        const rawStart = match?.started_at || match?.created_at;
        const parsedStart = rawStart ? new Date(rawStart).getTime() : NaN;
        const startTime = Number.isFinite(parsedStart) ? parsedStart : Date.now();
        const duration = session.duration_minutes * 60 * 1000;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));

            setTimeRemaining(remaining);

            if (remaining === 0 && !autoAdvanceTriggeredRef.current) {
                autoAdvanceTriggeredRef.current = true;
                // Auto-advance to next match
                onNextMatch();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [match, session, onNextMatch]);

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

    const progress = (timeRemaining / (session.duration_minutes * 60)) * 100;

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
            </Box>

            {/* Main Content: Dyte + Partner Profile Sidebar */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* Left: Dyte Meeting */}
                <Box sx={{
                    flex: 1,
                    position: 'relative',
                    minWidth: 0,
                    '& .dyte-meeting': {
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
                                You can still chat or use audio if available.
                                <br />
                                Please check backend logs/keys if testing.
                            </Typography>
                        </Box>
                    ) : meeting ? (
                        <DyteProvider value={meeting}>
                            <DyteMeeting mode="fill" meeting={meeting} showSetupScreen={false} />
                        </DyteProvider>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.3)' }}>Loading Video...</Typography>
                        </Box>
                    )}
                </Box>

                {/* Right: Partner Profile Sidebar */}
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
                        showBreakdown={showBreakdown}
                        setShowBreakdown={setShowBreakdown}
                    />
                </Box>
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
        </Box>
    );
}

// Partner Profile Sidebar Component
function PartnerProfileSidebar({ partner, match, onMemberInfo, showBreakdown, setShowBreakdown }) {
    return (
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Header label */}
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Talking With
            </Typography>

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
                    {partner?.username && (
                        <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                            @{partner.username}
                        </Typography>
                    )}
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

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

            {/* View Profile button */}
            {onMemberInfo && (
                <>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
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
                </>
            )}
        </Box>
    );
}
