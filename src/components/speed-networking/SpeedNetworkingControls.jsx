import React, { useState } from 'react';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Checkbox, Slider, Collapse, Select, MenuItem, FormControlLabel, Chip, Grid } from '@mui/material';
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
        skill: { enabled: false, threshold: 50 },
        experience: { enabled: false, threshold: 50 },
        location: { enabled: false, threshold: 50 },
        education: { enabled: false, threshold: 50 },
        interests: { enabled: false, match_mode: 'complementary' }
    });
    const [loading, setLoading] = useState(false);
    const [showExtendDialog, setShowExtendDialog] = useState(false);
    const [extensionMinutes, setExtensionMinutes] = useState('3');
    const [extendError, setExtendError] = useState('');
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [pendingTags, setPendingTags] = useState([]);
    const [newTag, setNewTag] = useState({ label: '', category: '', side: 'both' });

    const handleExtendDuration = async () => {
        const val = parseInt(extensionMinutes, 10);
        if (!val || val <= 0) {
            setExtendError('Must be at least 1 minute');
            return;
        }
        const newTotal = session.duration_minutes + val;
        if (newTotal > 60) {
            setExtendError(`Cannot exceed 60 min total. Max you can add: ${60 - session.duration_minutes} min`);
            return;
        }
        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${session.id}/extend-duration/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ extension_minutes: val }),
            });
            if (!res.ok) {
                const data = await res.json();
                setExtendError(data.error || 'Failed to update duration');
                return;
            }
            setShowExtendDialog(false);
            setExtensionMinutes('3');
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

            const resData = await res.json();
            setCreateOpen(false);

            // Create pending tags for this session
            if (criteriaConfig.interests?.enabled && pendingTags.length > 0 && resData.id) {
                for (const tag of pendingTags) {
                    try {
                        const tagUrl = `${API_ROOT}/events/${eventId}/speed-networking/${resData.id}/interest-tags/`.replace(/([^:]\/)\/+/g, "$1");
                        await fetch(tagUrl, {
                            method: 'POST',
                            headers: { ...authHeader(), 'Content-Type': 'application/json' },
                            body: JSON.stringify(tag)
                        });
                    } catch (tagErr) {
                        console.error('Error creating tag:', tagErr);
                    }
                }
            }

            setPendingTags([]);
            if (onSessionCreated) onSessionCreated();
            setLoading(false);
        } catch (err) {
            console.error('[SpeedNetworking] Error creating session:', err);
            alert('Failed to create session');
            setLoading(false);
        }
    };

    const handleAddTag = () => {
        if (newTag.label && newTag.category) {
            setPendingTags([...pendingTags, { ...newTag }]);
            setNewTag({ label: '', category: '', side: 'both' });
            setShowTagDialog(false);
        }
    };

    const handleRemoveTag = (index) => {
        setPendingTags(pendingTags.filter((_, i) => i !== index));
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
                    <DialogContent sx={{
                        '&::-webkit-scrollbar': {
                            width: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                            bgcolor: 'rgba(255,255,255,0.04)',
                            borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                            bgcolor: '#5a78ff',
                            borderRadius: '4px',
                            '&:hover': {
                                bgcolor: '#4a68ef'
                            }
                        }
                    }}>
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
                        <Typography sx={{ color: '#fff', mt: 3, mb: 2, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Matching Criteria
                        </Typography>

                        {/* Skill */}
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                            <FormControlLabel
                                control={<Checkbox checked={criteriaConfig.skill?.enabled || false} onChange={(e) => setCriteriaConfig({ ...criteriaConfig, skill: { ...criteriaConfig.skill, enabled: e.target.checked } })} sx={{ color: '#5a78ff' }} />}
                                label={<Typography sx={{ color: '#fff', fontWeight: 500 }}>Skill</Typography>}
                            />
                            <Collapse in={criteriaConfig.skill?.enabled}>
                                <Box sx={{ mt: 1, ml: 4 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>Threshold: {criteriaConfig.skill?.threshold || 50}%</Typography>
                                    <Slider value={criteriaConfig.skill?.threshold || 50} onChange={(e, val) => setCriteriaConfig({ ...criteriaConfig, skill: { ...criteriaConfig.skill, threshold: val } })} min={0} max={100} step={5} sx={{ color: '#5a78ff' }} />
                                </Box>
                            </Collapse>
                        </Box>

                        {/* Location */}
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                            <FormControlLabel control={<Checkbox checked={criteriaConfig.location?.enabled || false} onChange={(e) => setCriteriaConfig({ ...criteriaConfig, location: { ...criteriaConfig.location, enabled: e.target.checked } })} sx={{ color: '#5a78ff' }} />} label={<Typography sx={{ color: '#fff', fontWeight: 500 }}>Location</Typography>} />
                            <Collapse in={criteriaConfig.location?.enabled}>
                                <Box sx={{ mt: 1, ml: 4 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>Threshold: {criteriaConfig.location?.threshold || 50}%</Typography>
                                    <Slider value={criteriaConfig.location?.threshold || 50} onChange={(e, val) => setCriteriaConfig({ ...criteriaConfig, location: { ...criteriaConfig.location, threshold: val } })} min={0} max={100} step={5} sx={{ color: '#5a78ff' }} />
                                </Box>
                            </Collapse>
                        </Box>

                        {/* Experience */}
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                            <FormControlLabel control={<Checkbox checked={criteriaConfig.experience?.enabled || false} onChange={(e) => setCriteriaConfig({ ...criteriaConfig, experience: { ...criteriaConfig.experience, enabled: e.target.checked } })} sx={{ color: '#5a78ff' }} />} label={<Typography sx={{ color: '#fff', fontWeight: 500 }}>Experience</Typography>} />
                            <Collapse in={criteriaConfig.experience?.enabled}>
                                <Box sx={{ mt: 1, ml: 4 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>Threshold: {criteriaConfig.experience?.threshold || 50}%</Typography>
                                    <Slider value={criteriaConfig.experience?.threshold || 50} onChange={(e, val) => setCriteriaConfig({ ...criteriaConfig, experience: { ...criteriaConfig.experience, threshold: val } })} min={0} max={100} step={5} sx={{ color: '#5a78ff' }} />
                                </Box>
                            </Collapse>
                        </Box>

                        {/* Education */}
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                            <FormControlLabel control={<Checkbox checked={criteriaConfig.education?.enabled || false} onChange={(e) => setCriteriaConfig({ ...criteriaConfig, education: { ...criteriaConfig.education, enabled: e.target.checked } })} sx={{ color: '#5a78ff' }} />} label={<Typography sx={{ color: '#fff', fontWeight: 500 }}>Education</Typography>} />
                            <Collapse in={criteriaConfig.education?.enabled}>
                                <Box sx={{ mt: 1, ml: 4 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>Threshold: {criteriaConfig.education?.threshold || 50}%</Typography>
                                    <Slider value={criteriaConfig.education?.threshold || 50} onChange={(e, val) => setCriteriaConfig({ ...criteriaConfig, education: { ...criteriaConfig.education, threshold: val } })} min={0} max={100} step={5} sx={{ color: '#5a78ff' }} />
                                </Box>
                            </Collapse>
                        </Box>

                        {/* Interest */}
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
                            <FormControlLabel control={<Checkbox checked={criteriaConfig.interests?.enabled || false} onChange={(e) => setCriteriaConfig({ ...criteriaConfig, interests: { ...criteriaConfig.interests, enabled: e.target.checked } })} sx={{ color: '#5a78ff' }} />} label={<Typography sx={{ color: '#fff', fontWeight: 500 }}>✨ Interest-Based Matching</Typography>} />
                            <Collapse in={criteriaConfig.interests?.enabled}>
                                <Box sx={{ mt: 1, ml: 4 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, mb: 1 }}>Match Mode</Typography>
                                    <Select value={criteriaConfig.interests?.match_mode || 'complementary'} onChange={(e) => setCriteriaConfig({ ...criteriaConfig, interests: { ...criteriaConfig.interests, match_mode: e.target.value } })} sx={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', fontSize: 12, width: '100%', mb: 2 }} size="small">
                                        <MenuItem value="complementary">🔄 Complementary (seek ↔ offer)</MenuItem>
                                        <MenuItem value="similar">🤝 Similar (same interests)</MenuItem>
                                        <MenuItem value="both">↔️ Both (complementary then similar)</MenuItem>
                                    </Select>

                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => setShowTagDialog(true)}
                                        sx={{ color: '#5a78ff', borderColor: '#5a78ff', mb: 1.5 }}
                                    >
                                        Add Tags
                                    </Button>

                                    {pendingTags.length > 0 && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, mb: 1 }}>Tags ({pendingTags.length}):</Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {pendingTags.map((tag, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={`${tag.label} (${tag.side})`}
                                                        size="small"
                                                        onDelete={() => handleRemoveTag(idx)}
                                                        sx={{ bgcolor: '#5a78ff30', color: '#5a78ff', fontSize: 11 }}
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Collapse>
                        </Box>
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

                {/* Add Interest Tags Dialog */}
                <Dialog open={showTagDialog} onClose={() => setShowTagDialog(false)} maxWidth="xs" fullWidth
                    PaperProps={{
                        sx: {
                            bgcolor: '#0b101a',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 2
                        }
                    }}
                >
                    <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
                        Add Interest Tag
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="Tag Label"
                            placeholder="e.g., Looking for investors"
                            value={newTag.label}
                            onChange={(e) => setNewTag({ ...newTag, label: e.target.value })}
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)' },
                                '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 },
                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#fff' }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Category"
                            placeholder="e.g., investment, recruitment"
                            value={newTag.category}
                            onChange={(e) => setNewTag({ ...newTag, category: e.target.value })}
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.04)' },
                                '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 },
                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#fff' }
                            }}
                        />
                        <Select
                            fullWidth
                            label="Side"
                            value={newTag.side}
                            onChange={(e) => setNewTag({ ...newTag, side: e.target.value })}
                            sx={{
                                mt: 2,
                                color: '#fff',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                fontSize: 14,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                '& .MuiSvgIcon-root': { color: '#fff' },
                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
                            }}
                            size="small"
                        >
                            <MenuItem value="seek">🔍 Seeking</MenuItem>
                            <MenuItem value="offer">💼 Offering</MenuItem>
                            <MenuItem value="both">↔️ Both</MenuItem>
                        </Select>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setShowTagDialog(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddTag}
                            variant="contained"
                            disabled={!newTag.label || !newTag.category}
                            sx={{
                                bgcolor: '#5a78ff',
                                color: '#fff',
                                '&:hover': { bgcolor: '#4a68ef' },
                                '&:disabled': {
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.4)'
                                }
                            }}
                        >
                            Add
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
                        onClick={() => { setExtensionMinutes('3'); setShowExtendDialog(true); setExtendError(''); }}
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
                <DialogTitle>Add Time to Round</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Currently set to {session?.duration_minutes} min. Enter minutes to add.
                    </Typography>
                    <TextField
                        label="Minutes to add"
                        type="number"
                        value={extensionMinutes}
                        onChange={e => { setExtensionMinutes(e.target.value); setExtendError(''); }}
                        inputProps={{ min: 1, max: 60 - session?.duration_minutes }}
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
