import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useDyteClient, DyteProvider } from '@dytesdk/react-web-core';
import { DyteMeeting } from '@dytesdk/react-ui-kit';

export default function SpeedNetworkingMatch({
    match,
    session,
    onNextMatch,
    onLeave,
    loading,
    currentUserId
}) {
    const [meeting, initMeeting] = useDyteClient();
    const [timeRemaining, setTimeRemaining] = useState(session.duration_minutes * 60);
    const [videoError, setVideoError] = useState(null);
    const autoAdvanceTriggeredRef = useRef(false);

    // Initialize Dyte Meeting for this match
    useEffect(() => {
        if (match?.dyte_token) {
            console.log("[SpeedNetworkingMatch] Initializing Dyte meeting with token for match:", match.id);
            initMeeting({
                authToken: match.dyte_token,
                defaults: {
                    audio: true,
                    video: true,
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
            bgcolor: '#000',
            position: 'relative'
        }}>
            {/* Timer Bar */}
            <Box sx={{
                bgcolor: '#1a1a1a',
                p: 2,
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                        Talking with: <span style={{ color: '#5a78ff' }}>{partner?.first_name || partner?.username || 'Partner'}</span>
                    </Typography>
                    <Typography sx={{
                        color: timeRemaining < 30 ? '#ef4444' : '#22c55e',
                        fontWeight: 700,
                        fontSize: 18
                    }}>
                        {formatTime(timeRemaining)}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: timeRemaining < 30 ? '#ef4444' : '#22c55e',
                            borderRadius: 3
                        }
                    }}
                />
            </Box>

            {/* Dyte Meeting Area */}
            <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {videoError ? (
                    <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'rgba(239,68,68,0.1)', borderRadius: 2, border: '1px solid #ef4444' }}>
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
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)' }}>Loading Video...</Typography>
                )}
            </Box>

            {/* Bottom Controls */}
            <Box sx={{
                p: 2,
                bgcolor: '#1a1a1a',
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                zIndex: 10,
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>

                <Button
                    variant="contained"
                    startIcon={<SkipNextIcon />}
                    disabled={loading}
                    onClick={() => {
                        onNextMatch();
                    }}
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
                    onClick={() => {
                        onLeave();
                    }}
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
