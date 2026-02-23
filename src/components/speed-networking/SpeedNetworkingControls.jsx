import React, { useState } from 'react';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Typography, FormControlLabel, Checkbox, Slider, Paper } from '@mui/material';
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
    const [bufferSeconds, setBufferSeconds] = useState(15);
    const [criteriaConfig, setCriteriaConfig] = useState({
        skill: { enabled: true, weight: 35 },
        experience: { enabled: true, weight: 30 },
        location: { enabled: true, weight: 20 },
        education: { enabled: true, weight: 15 }
    });
    const [loading, setLoading] = useState(false);
    const [showExtendDialog, setShowExtendDialog] = useState(false);
    const [newDuration, setNewDuration] = useState('');
    const [extendError, setExtendError] = useState('');

    const handleExtendDuration = async () => {
        const val = parseInt(newDuration, 10);
        if (!val || val <= session.duration_minutes) {
            setExtendError(`Must be greater than current duration (${session.duration_minutes} min)`);
            return;
        }
        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/extend-duration/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration_minutes: val }),
            });
            if (!res.ok) {
                const data = await res.json();
                setExtendError(data.error || 'Failed to update duration');
                return;
            }
            setShowExtendDialog(false);
            setNewDuration('');
            setExtendError('');
            if (onSessionUpdated) {
                onSessionUpdated();
            }
        } catch (err) {
            setExtendError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async () => {
        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");

            // Build criteria config with proper structure
            const builtCriteriaConfig = {
                skill: criteriaConfig.skill.enabled ? {
                    enabled: true,
                    required: true,
                    weight: criteriaConfig.skill.weight / 100,
                    threshold: 40,
                    match_mode: 'similar'
                } : { enabled: false },
                experience: criteriaConfig.experience.enabled ? {
                    enabled: true,
                    required: true,
                    weight: criteriaConfig.experience.weight / 100,
                    threshold: 50,
                    match_type: 'peer'
                } : { enabled: false },
                location: criteriaConfig.location.enabled ? {
                    enabled: true,
                    required: true,
                    weight: criteriaConfig.location.weight / 100,
                    threshold: 30,
                    match_strategy: 'radius'
                } : { enabled: false },
                education: criteriaConfig.education.enabled ? {
                    enabled: true,
                    required: true,
                    weight: criteriaConfig.education.weight / 100,
                    threshold: 40,
                    match_type: 'same_level'
                } : { enabled: false }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: sessionName,
                    duration_minutes: duration,
                    buffer_seconds: bufferSeconds,
                    matching_strategy: 'both',
                    criteria_config: builtCriteriaConfig,
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
                            slotProps={{ input: { min: 2, max: 10 } }}
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
                            label="Transition time (seconds)"
                            value={bufferSeconds}
                            onChange={(e) => setBufferSeconds(Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0))}
                            slotProps={{ input: { min: 0, max: 60 } }}
                            helperText="Seconds between rounds to review the last person (0 to skip)"
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    bgcolor: 'rgba(255,255,255,0.04)'
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255,255,255,0.7)'
                                },
                                '& .MuiFormHelperText-root': {
                                    color: 'rgba(255,255,255,0.5)'
                                }
                            }}
                        />

                        {/* Matching Criteria Configuration */}
                        <Typography sx={{ color: '#fff', mt: 3, mb: 2, fontWeight: 600 }}>
                            Matching Criteria
                        </Typography>
                        <Paper sx={{ bgcolor: 'rgba(255,255,255,0.04)', p: 2, borderRadius: 2 }}>
                            {/* Skill */}
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography sx={{ color: '#fff' }}>🔧 Skill Matching</Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={criteriaConfig.skill.enabled}
                                                onChange={(e) =>
                                                    setCriteriaConfig({
                                                        ...criteriaConfig,
                                                        skill: { ...criteriaConfig.skill, enabled: e.target.checked }
                                                    })
                                                }
                                                sx={{ color: '#5a78ff' }}
                                            />
                                        }
                                        label=""
                                    />
                                </Box>
                                {criteriaConfig.skill.enabled && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>
                                            Weight: {criteriaConfig.skill.weight}%
                                        </Typography>
                                        <Slider
                                            value={criteriaConfig.skill.weight}
                                            onChange={(e, newValue) =>
                                                setCriteriaConfig({
                                                    ...criteriaConfig,
                                                    skill: { ...criteriaConfig.skill, weight: newValue }
                                                })
                                            }
                                            min={0}
                                            max={100}
                                            step={5}
                                            sx={{ color: '#5a78ff' }}
                                        />
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, mt: 1 }}>
                                            Matches complementary skills (Jaccard similarity)
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Experience */}
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography sx={{ color: '#fff' }}>📈 Experience Matching</Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={criteriaConfig.experience.enabled}
                                                onChange={(e) =>
                                                    setCriteriaConfig({
                                                        ...criteriaConfig,
                                                        experience: { ...criteriaConfig.experience, enabled: e.target.checked }
                                                    })
                                                }
                                                sx={{ color: '#5a78ff' }}
                                            />
                                        }
                                        label=""
                                    />
                                </Box>
                                {criteriaConfig.experience.enabled && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>
                                            Weight: {criteriaConfig.experience.weight}%
                                        </Typography>
                                        <Slider
                                            value={criteriaConfig.experience.weight}
                                            onChange={(e, newValue) =>
                                                setCriteriaConfig({
                                                    ...criteriaConfig,
                                                    experience: { ...criteriaConfig.experience, weight: newValue }
                                                })
                                            }
                                            min={0}
                                            max={100}
                                            step={5}
                                            sx={{ color: '#5a78ff' }}
                                        />
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, mt: 1 }}>
                                            Analyzes gap between experience levels for mentorship
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Location */}
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography sx={{ color: '#fff' }}>📍 Location Matching</Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={criteriaConfig.location.enabled}
                                                onChange={(e) =>
                                                    setCriteriaConfig({
                                                        ...criteriaConfig,
                                                        location: { ...criteriaConfig.location, enabled: e.target.checked }
                                                    })
                                                }
                                                sx={{ color: '#5a78ff' }}
                                            />
                                        }
                                        label=""
                                    />
                                </Box>
                                {criteriaConfig.location.enabled && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>
                                            Weight: {criteriaConfig.location.weight}%
                                        </Typography>
                                        <Slider
                                            value={criteriaConfig.location.weight}
                                            onChange={(e, newValue) =>
                                                setCriteriaConfig({
                                                    ...criteriaConfig,
                                                    location: { ...criteriaConfig.location, weight: newValue }
                                                })
                                            }
                                            min={0}
                                            max={100}
                                            step={5}
                                            sx={{ color: '#5a78ff' }}
                                        />
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, mt: 1 }}>
                                            Uses Haversine distance for proximity matching
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Education */}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography sx={{ color: '#fff' }}>🎓 Education Matching</Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={criteriaConfig.education.enabled}
                                                onChange={(e) =>
                                                    setCriteriaConfig({
                                                        ...criteriaConfig,
                                                        education: { ...criteriaConfig.education, enabled: e.target.checked }
                                                    })
                                                }
                                                sx={{ color: '#5a78ff' }}
                                            />
                                        }
                                        label=""
                                    />
                                </Box>
                                {criteriaConfig.education.enabled && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>
                                            Weight: {criteriaConfig.education.weight}%
                                        </Typography>
                                        <Slider
                                            value={criteriaConfig.education.weight}
                                            onChange={(e, newValue) =>
                                                setCriteriaConfig({
                                                    ...criteriaConfig,
                                                    education: { ...criteriaConfig.education, weight: newValue }
                                                })
                                            }
                                            min={0}
                                            max={100}
                                            step={5}
                                            sx={{ color: '#5a78ff' }}
                                        />
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, mt: 1 }}>
                                            Matches complementary education backgrounds and fields
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
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
                        startIcon={<AddIcon />}
                        onClick={() => { setNewDuration(String(session.duration_minutes + 1)); setShowExtendDialog(true); setExtendError(''); }}
                        disabled={loading}
                        sx={{
                            bgcolor: '#3b82f6',
                            '&:hover': { bgcolor: '#2563eb' }
                        }}
                    >
                        Extend Time
                    </Button>
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

            {/* Extend Duration Dialog */}
            <Dialog open={showExtendDialog} onClose={() => setShowExtendDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Increase Round Duration</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Current: {session?.duration_minutes} min. You can only increase the duration.
                    </Typography>
                    <TextField
                        label="New duration (minutes)"
                        type="number"
                        value={newDuration}
                        onChange={e => { setNewDuration(e.target.value); setExtendError(''); }}
                        inputProps={{ min: (session?.duration_minutes || 1) + 1, max: 60 }}
                        fullWidth
                        size="small"
                        error={!!extendError}
                        helperText={extendError}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowExtendDialog(false)}>Cancel</Button>
                    <Button onClick={handleExtendDuration} variant="contained">Apply</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
