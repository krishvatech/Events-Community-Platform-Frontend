import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';

export default function MainRoomPeek({ mainDyteMeeting, isInBreakout }) {
    const [primaryParticipant, setPrimaryParticipant] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        if (!mainDyteMeeting?.participants) return;

        const updatePrimaryParticipant = () => {
            // Try to find the active speaker first
            const activeSpeaker = mainDyteMeeting.participants.activeSpeaker;
            if (activeSpeaker) {
                setPrimaryParticipant(activeSpeaker);
                return;
            }

            // Otherwise, find the host/admin
            const host = mainDyteMeeting.participants.joined.toArray().find(p =>
                p.presetName?.toLowerCase().includes('host') ||
                p.presetName?.toLowerCase().includes('admin') ||
                p.presetName?.toLowerCase().includes('webinar_presenter') ||
                p.presetName?.toLowerCase().includes('publisher')
            );

            if (host) {
                setPrimaryParticipant(host);
                return;
            }

            // Fallback to first participant with video enabled
            const videoParticipant = mainDyteMeeting.participants.joined.toArray().find(p => p.videoEnabled);
            if (videoParticipant) {
                setPrimaryParticipant(videoParticipant);
                return;
            }

            // Last resort: any participant
            const anyParticipant = mainDyteMeeting.participants.joined.toArray()[0];
            setPrimaryParticipant(anyParticipant || null);
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
    }, [mainDyteMeeting]);

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
            width: '100%',
            height: '100%',
            bgcolor: '#1a1a1a',
            borderRadius: 3,
            border: '2px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column'
        }}>
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
        </Box>
    );
}
