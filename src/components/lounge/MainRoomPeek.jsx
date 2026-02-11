import React, { useEffect, useState, useRef } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';

function getParticipantUserKey(participant) {
    if (!participant) return "";

    const raw = participant?._raw || participant || {};
    const directId =
        raw.customParticipantId ??
        raw.customParticipant_id ??
        raw.clientSpecificId ??
        raw.client_specific_id ??
        raw.userId ??
        raw.user_id ??
        raw.uid ??
        raw.id ??
        participant.id;

    let meta =
        raw.customParticipantData ||
        raw.customParticipant ||
        raw.customParticipantDetails ||
        raw.metadata ||
        raw.meta ||
        raw.user ||
        raw.profile ||
        raw.profileData ||
        raw.userData ||
        null;

    if (typeof meta === "string") {
        try {
            meta = JSON.parse(meta);
        } catch {
            meta = null;
        }
    }

    const metaId =
        meta?.user_id ??
        meta?.userId ??
        meta?.id ??
        meta?.uid ??
        meta?.pk ??
        null;

    const id = directId || metaId;
    if (id) return `id:${String(id)}`;

    const name = raw.name || participant.name || "";
    return name ? `name:${String(name).toLowerCase()}` : "";
}

export default function MainRoomPeek({
    mainDyteMeeting,
    isInBreakout,
    pinnedParticipantId,
    loungeParticipantKeys,
    onClose,
    onHeaderPointerDown,
    isDragging = false,
}) {
    const [primaryParticipant, setPrimaryParticipant] = useState(null);
    const [isFolded, setIsFolded] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!mainDyteMeeting?.participants) return;

        const updatePrimaryParticipant = () => {
            const allParticipants = mainDyteMeeting.participants.joined.toArray();

            const loungeKeySet = new Set(loungeParticipantKeys || []);

            // ✅ PRIORITY 1: Use pinned participant if available and in main room
            if (pinnedParticipantId) {
                console.log('[MainRoomPeek] Looking for pinned participant:', pinnedParticipantId);
                const pinnedParticipant = allParticipants.find(p => p.id === pinnedParticipantId);
                const pinnedKey = pinnedParticipant ? getParticipantUserKey(pinnedParticipant) : "";
                if (pinnedParticipant && (!pinnedKey || !loungeKeySet.has(pinnedKey))) {
                    console.log('[MainRoomPeek] Found pinned participant:', pinnedParticipant.name);
                    setPrimaryParticipant(pinnedParticipant);
                    return;
                } else {
                    console.log('[MainRoomPeek] Pinned participant not in main room, falling back to next priority');
                }
            }

            // ✅ PRIORITY 2: Find first participant NOT in lounge (main area participants only)
            if (loungeKeySet.size > 0) {
                console.log('[MainRoomPeek] Filtering out lounge participants:', loungeParticipantKeys);
                const mainAreaParticipant = allParticipants.find(p => {
                    const key = getParticipantUserKey(p);
                    return !key || !loungeKeySet.has(key);
                });
                if (mainAreaParticipant) {
                    console.log('[MainRoomPeek] Found main area participant:', mainAreaParticipant.name);
                    setPrimaryParticipant(mainAreaParticipant);
                    return;
                }
            }

            // ✅ PRIORITY 3: Try to find the active speaker
            const activeSpeaker = mainDyteMeeting.participants.activeSpeaker;
            if (activeSpeaker) {
                const activeKey = getParticipantUserKey(activeSpeaker);
                if (activeKey && loungeKeySet.has(activeKey)) {
                    console.log('[MainRoomPeek] Active speaker is in lounge, ignoring for main room peek');
                } else {
                    console.log('[MainRoomPeek] Using active speaker:', activeSpeaker.name);
                    setPrimaryParticipant(activeSpeaker);
                    return;
                }
            }

            // ✅ PRIORITY 4: Find the host/admin (only if not in lounge)
            const host = allParticipants.find(p =>
                !loungeKeySet.has(getParticipantUserKey(p)) &&
                (p.presetName?.toLowerCase().includes('host') ||
                    p.presetName?.toLowerCase().includes('admin') ||
                    p.presetName?.toLowerCase().includes('webinar_presenter') ||
                    p.presetName?.toLowerCase().includes('publisher'))
            );

            if (host) {
                console.log('[MainRoomPeek] Using host:', host.name);
                setPrimaryParticipant(host);
                return;
            }

            // ✅ PRIORITY 5: Fallback to first participant with video enabled (not in lounge)
            const videoParticipant = allParticipants.find(p =>
                !loungeKeySet.has(getParticipantUserKey(p)) && p.videoEnabled
            );
            if (videoParticipant) {
                console.log('[MainRoomPeek] Using video participant:', videoParticipant.name);
                setPrimaryParticipant(videoParticipant);
                return;
            }

            // ✅ PRIORITY 6: Last resort: any main area participant
            const anyParticipant = allParticipants.find(p => !loungeKeySet.has(getParticipantUserKey(p)));
            if (anyParticipant) {
                console.log('[MainRoomPeek] Using any main area participant:', anyParticipant.name);
                setPrimaryParticipant(anyParticipant);
                return;
            }

            // If only lounge participants, show them as fallback
            console.log('[MainRoomPeek] No main room participants available, showing empty state');
            setPrimaryParticipant(null);
        };

        updatePrimaryParticipant();

        // Listen for participant changes
        const handleParticipantJoined = () => updatePrimaryParticipant();
        const handleParticipantLeft = () => updatePrimaryParticipant();
        const handleActiveSpeakerChanged = () => updatePrimaryParticipant();
        const handleVideoUpdate = () => updatePrimaryParticipant();

        mainDyteMeeting.participants.joined.on('participantJoined', handleParticipantJoined);
        mainDyteMeeting.participants.joined.on('participantLeft', handleParticipantLeft);
        mainDyteMeeting.participants.on('activeSpeakerChanged', handleActiveSpeakerChanged);
        mainDyteMeeting.participants.joined.on('videoUpdate', handleVideoUpdate);

        return () => {
            mainDyteMeeting.participants.joined.removeListener('participantJoined', handleParticipantJoined);
            mainDyteMeeting.participants.joined.removeListener('participantLeft', handleParticipantLeft);
            mainDyteMeeting.participants.removeListener('activeSpeakerChanged', handleActiveSpeakerChanged);
            mainDyteMeeting.participants.joined.removeListener('videoUpdate', handleVideoUpdate);
        };
    }, [mainDyteMeeting, pinnedParticipantId, loungeParticipantKeys]);

    // Attach video track or screen share to video element
    useEffect(() => {
        if (!primaryParticipant || !videoRef.current) return;

        const attachVideo = async () => {
            try {
                console.log('[MainRoomPeek] Participant state:', {
                    name: primaryParticipant.name,
                    videoEnabled: primaryParticipant.videoEnabled,
                    screenShareEnabled: primaryParticipant.screenShareEnabled,
                    hasVideoTrack: !!primaryParticipant.videoTrack,
                    hasScreenShareTracks: !!primaryParticipant.screenShareTracks,
                    screenShareTracksKeys: primaryParticipant.screenShareTracks ? Object.keys(primaryParticipant.screenShareTracks) : [],
                });

                let stream = null;

                // Priority: Screen share > Video track
                // Try different ways to access screen share
                if (primaryParticipant.screenShareEnabled) {
                    // Method 1: screenShareTracks.video
                    if (primaryParticipant.screenShareTracks?.video) {
                        stream = new MediaStream([primaryParticipant.screenShareTracks.video]);
                        console.log('[MainRoomPeek] Using screenShareTracks.video');
                    }
                    // Method 2: screenShareTrack (singular)
                    else if (primaryParticipant.screenShareTrack) {
                        stream = new MediaStream([primaryParticipant.screenShareTrack]);
                        console.log('[MainRoomPeek] Using screenShareTrack');
                    }
                    // Method 3: Check if videoTrack is actually the screen share
                    else if (primaryParticipant.videoTrack) {
                        stream = new MediaStream([primaryParticipant.videoTrack]);
                        console.log('[MainRoomPeek] Using videoTrack (might be screen share)');
                    }
                }

                // Fallback to camera if no screen share
                if (!stream && primaryParticipant.videoTrack && primaryParticipant.videoEnabled) {
                    stream = new MediaStream([primaryParticipant.videoTrack]);
                    console.log('[MainRoomPeek] Using camera video');
                }

                if (stream) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.log('[MainRoomPeek] Play error:', e));
                } else {
                    videoRef.current.srcObject = null;
                    console.log('[MainRoomPeek] No video stream available');
                }
            } catch (e) {
                console.error('[MainRoomPeek] Error attaching video:', e);
            }
        };

        attachVideo();

        // Listen for video and screen share updates
        const handleVideoUpdate = () => {
            console.log('[MainRoomPeek] Video update event');
            attachVideo();
        };
        const handleScreenShareUpdate = () => {
            console.log('[MainRoomPeek] Screen share update event');
            attachVideo();
        };

        primaryParticipant.on?.('videoUpdate', handleVideoUpdate);
        primaryParticipant.on?.('screenShareUpdate', handleScreenShareUpdate);

        return () => {
            primaryParticipant.removeListener?.('videoUpdate', handleVideoUpdate);
            primaryParticipant.removeListener?.('screenShareUpdate', handleScreenShareUpdate);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [primaryParticipant]);

    // Only show when in breakout room and main meeting is available
    if (!isInBreakout || !mainDyteMeeting) return null;

    return (
        <Box sx={{
            width: isFolded ? { xs: 184, sm: 220 } : { xs: 224, sm: 280 },
            height: isFolded ? 42 : { xs: 148, sm: 180 },
            bgcolor: '#1a1a1a',
            borderRadius: 2.5,
            border: '2px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 180ms ease, height 180ms ease',
        }}>
            <Box
                sx={{
                    px: 1,
                    minHeight: 40,
                    bgcolor: 'rgba(0,0,0,0.65)',
                    borderBottom: isFolded ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.5,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                }}
                onMouseDown={onHeaderPointerDown}
                onTouchStart={onHeaderPointerDown}
            >
                <Typography
                    sx={{
                        color: '#e5e7eb',
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        pr: 0.5
                    }}
                >
                    {primaryParticipant ? `Main Room: ${primaryParticipant.name || 'Live'}` : 'Main Room View'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title={isFolded ? 'Unfold' : 'Fold'}>
                        <IconButton
                            size="small"
                            onClick={() => setIsFolded((prev) => !prev)}
                            aria-label={isFolded ? 'Unfold secondary screen' : 'Fold secondary screen'}
                            sx={{ color: '#d1d5db' }}
                        >
                            {isFolded ? <UnfoldMoreRoundedIcon fontSize="small" /> : <UnfoldLessRoundedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Close">
                        <IconButton
                            size="small"
                            onClick={onClose}
                            aria-label="Close secondary screen"
                            sx={{ color: '#d1d5db' }}
                        >
                            <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {!isFolded && (
                <>
                    <Box sx={{ flex: 1, position: 'relative', bgcolor: '#000', overflow: 'hidden' }}>
                        {primaryParticipant ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: (primaryParticipant.screenShareEnabled || primaryParticipant.videoEnabled) ? 'block' : 'none'
                                    }}
                                />
                                {!primaryParticipant.screenShareEnabled && !primaryParticipant.videoEnabled && (
                                    <Box sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#1a1a1a'
                                    }}>
                                        <Box sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            bgcolor: '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 20,
                                            fontWeight: 600,
                                            color: '#fff',
                                            mb: 1
                                        }}>
                                            {primaryParticipant.name?.[0]?.toUpperCase() || 'U'}
                                        </Box>
                                        <Typography sx={{ color: '#9ca3af', fontSize: 11 }}>
                                            {primaryParticipant.name || 'User'}
                                        </Typography>
                                        <Typography sx={{ color: '#6b7280', fontSize: 9, mt: 0.5 }}>
                                            Camera off
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        ) : (
                            <Box sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                                    No active participants on stage
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                        <Typography sx={{ color: '#22c55e', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                            {primaryParticipant ? `LIVE: ${primaryParticipant.name || 'Main Stage'}` : 'MAIN STAGE'}
                        </Typography>
                    </Box>
                </>
            )}

            {isFolded && (
                <Box sx={{ px: 1, pb: 0.75 }}>
                    <Typography sx={{ color: '#22c55e', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                        LIVE PREVIEW
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
