import React, { useState } from 'react';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SpeedNetworkingControls({
    eventId,
    session,
    onSessionCreated,
    onSessionUpdated
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const [sessionName, setSessionName] = useState('Speed Networking');
    const [duration, setDuration] = useState(3);
    const [loading, setLoading] = useState(false);

    const handleCreateSession = async () => {
        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: sessionName,
                    duration_minutes: duration,
                    status: 'PENDING'
                })
            });

            if (!res.ok) throw new Error('Failed to create session');

            setCreateOpen(false);
            if (onSessionCreated) onSessionCreated();
            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error creating session:', err);
            alert('Failed to create session');
            setLoading(false);
        }
    };

    const handleStartSession = async () => {
        if (!session) return;

        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/start/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: authHeader()
            });

            if (!res.ok) throw new Error('Failed to start session');

            if (onSessionUpdated) onSessionUpdated();
            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error starting session:', err);
            alert('Failed to start session');
            setLoading(false);
        }
    };

    const handleStopSession = async () => {
        if (!session) return;

        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/stop/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: authHeader()
            });

            if (!res.ok) throw new Error('Failed to stop session');

            if (onSessionUpdated) onSessionUpdated();
            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error stopping session:', err);
            alert('Failed to stop session');
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{
                        bgcolor: '#5a78ff',
                        '&:hover': { bgcolor: '#4a68ef' }
                    }}
                >
                    Create Speed Networking Session
                </Button>

                <Dialog
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            bgcolor: '#0b101a',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 3
                        }
                    }}
                >
                    <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
                        Create Speed Networking Session
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="Session Name"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    bgcolor: 'rgba(255,255,255,0.04)'
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255,255,255,0.7)'
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Duration (minutes)"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            inputProps={{ min: 2, max: 10 }}
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    bgcolor: 'rgba(255,255,255,0.04)'
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255,255,255,0.7)'
                                }
                            }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button
                            onClick={() => setCreateOpen(false)}
                            sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateSession}
                            disabled={loading}
                            sx={{
                                bgcolor: '#5a78ff',
                                '&:hover': { bgcolor: '#4a68ef' }
                            }}
                        >
                            Create
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                Admin Controls:
            </Typography>

            {session.status === 'PENDING' && (
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleStartSession}
                    disabled={loading}
                    sx={{
                        bgcolor: '#22c55e',
                        '&:hover': { bgcolor: '#16a34a' }
                    }}
                >
                    Start Session
                </Button>
            )}

            {session.status === 'ACTIVE' && (
                <>
                    <Typography sx={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
                        ● Session Active
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<StopIcon />}
                        onClick={handleStopSession}
                        disabled={loading}
                        sx={{
                            bgcolor: '#ef4444',
                            '&:hover': { bgcolor: '#dc2626' }
                        }}
                    >
                        Stop Session
                    </Button>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                        {session.active_matches_count} active matches
                    </Typography>
                </>
            )}

            {session.status === 'ENDED' && (
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                    Session Ended
                </Typography>
            )}
        </Box>
    );
}
