import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, Box, Divider,
    FormControl, InputLabel, Select, MenuItem,
    Alert, IconButton, Checkbox, FormGroup, FormControlLabel,
    ToggleButton, ToggleButtonGroup
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import PersonIcon from '@mui/icons-material/Person';
import TimerIcon from '@mui/icons-material/Timer';
import CampaignIcon from '@mui/icons-material/Campaign';
import StopIcon from '@mui/icons-material/Stop';

export default function BreakoutControls({
    open,
    onClose,
    onAction,
    onlineCount = 0,
    onlineUsers = [],
    loungeTables = [],
    debugMessage = ""
}) {
    const [assignmentMode, setAssignmentMode] = useState('random'); // 'random' or 'manual'
    const [perRoom, setPerRoom] = useState(4);
    const [duration, setDuration] = useState(10);
    const [message, setMessage] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState(new Set());
    const [selectedRoom, setSelectedRoom] = useState("");
    const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
    const [autoAssignStrategy, setAutoAssignStrategy] = useState('least');

    const handleRandomAssign = () => {
        onAction({ action: 'random_assign', per_room: perRoom });
        onClose();
    };

    const handleManualAssign = () => {
        if (selectedParticipants.size === 0) {
            alert("Please select at least one participant");
            return;
        }
        if (!selectedRoom) {
            alert("Please select a room");
            return;
        }
        onAction({
            action: 'manual_assign',
            user_ids: Array.from(selectedParticipants),
            table_id: selectedRoom
        });
        setSelectedParticipants(new Set());
        setSelectedRoom("");
        onClose();
    };

    const handleParticipantToggle = (userId) => {
        const newSelected = new Set(selectedParticipants);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedParticipants(newSelected);
    };

    const handleStartTimer = () => {
        onAction({ action: 'start_timer', duration: duration * 60 });
    };

    const handleSendBroadcast = () => {
        if (!message.trim()) return;
        onAction({ action: 'broadcast_announcement', message: message });
        setMessage("");
    };

    const handleEndAll = () => {
        onAction({ action: 'end_all_breakouts' });
        onClose();
    };

    const handleAutoAssignToggle = (e) => {
        const enabled = e.target.checked;
        setAutoAssignEnabled(enabled);
        onAction({ action: 'auto_assign_late_joiners', enabled, strategy: autoAssignStrategy });
    };

    const handleAutoAssignStrategyChange = (e) => {
        const strategy = e.target.value;
        setAutoAssignStrategy(strategy);
        if (autoAssignEnabled) {
            onAction({ action: 'auto_assign_late_joiners', enabled: autoAssignEnabled, strategy });
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, bgcolor: '#1a1a1a', color: 'white' }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" component="span" fontWeight={700}>Breakout Room Controls</Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{
                borderColor: 'rgba(255,255,255,0.1)',
                '&::-webkit-scrollbar': {
                    width: '10px'
                },
                '&::-webkit-scrollbar-track': {
                    bgcolor: 'rgba(255,255,255,0.02)',
                    borderRadius: '5px'
                },
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(76, 175, 80, 0.5)',
                    borderRadius: '5px',
                    border: '2px solid rgba(26, 26, 26, 0.8)',
                    '&:hover': {
                        bgcolor: 'rgba(76, 175, 80, 0.8)'
                    }
                }
            }}>
                {/* Assignment Mode Toggle */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" gutterBottom>
                        PARTICIPANT ASSIGNMENT
                    </Typography>

                    {onlineCount === 0 ? (
                        <Alert severity="warning" sx={{ mb: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                            No online attendees detected. Wait for them to join!
                        </Alert>
                    ) : (
                        <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                            {onlineCount} attendee{onlineCount > 1 ? 's' : ''} online and ready.
                        </Alert>
                    )}

                    {debugMessage && (
                        <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(3, 169, 244, 0.1)', color: '#03a9f4', border: '1px solid rgba(3, 169, 244, 0.2)' }}>
                            {debugMessage}
                        </Alert>
                    )}

                    {/* Auto-Assign Settings */}
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="rgba(255,255,255,0.7)" fontWeight={600} gutterBottom sx={{ mb: 1.5 }}>
                            AUTO-ASSIGN LATE JOINERS
                        </Typography>

                        {/* Checkbox with inline label */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: autoAssignEnabled ? 2 : 0 }}>
                            <Checkbox
                                checked={autoAssignEnabled}
                                onChange={handleAutoAssignToggle}
                                sx={{
                                    color: 'rgba(255,255,255,0.6)',
                                    '&.Mui-checked': { color: '#4caf50' },
                                    p: 0
                                }}
                            />
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                                Enable automatic assignment for late joiners
                            </Typography>
                        </Box>

                        {/* Strategy Dropdown - Only show when enabled */}
                        {autoAssignEnabled && (
                            <Box sx={{ ml: 4 }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1 }}>
                                    Strategy
                                </Typography>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={autoAssignStrategy}
                                        onChange={handleAutoAssignStrategyChange}
                                        sx={{
                                            color: 'white',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                                            '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' }
                                        }}
                                    >
                                        <MenuItem value="least">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <span>✓</span> Least participants (recommended)
                                            </Box>
                                        </MenuItem>
                                        <MenuItem value="round_robin">Round-robin distribution</MenuItem>
                                        <MenuItem value="sequential">Sequential room mapping</MenuItem>
                                    </Select>
                                </FormControl>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5 }}>
                                    Automatically assigns new joiners based on selected strategy
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Mode Selection */}
                    <ToggleButtonGroup
                        value={assignmentMode}
                        exclusive
                        onChange={(e, newMode) => {
                            if (newMode) setAssignmentMode(newMode);
                        }}
                        fullWidth
                        sx={{
                            mb: 2,
                            '& .MuiToggleButton-root': {
                                color: 'rgba(255,255,255,0.7)',
                                borderColor: 'rgba(255,255,255,0.2)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                            },
                            '& .MuiToggleButton-root.Mui-selected': {
                                color: 'white',
                                bgcolor: 'rgba(76, 175, 80, 0.3)',
                                borderColor: 'rgba(76, 175, 80, 0.5)'
                            }
                        }}
                    >
                        <ToggleButton value="random" sx={{ textTransform: 'none', fontWeight: 600 }}>
                            <ShuffleIcon sx={{ mr: 1 }} />
                            Random Assign
                        </ToggleButton>
                        <ToggleButton value="manual" sx={{ textTransform: 'none', fontWeight: 600 }}>
                            <PersonIcon sx={{ mr: 1 }} />
                            Manual Assign
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Random Assignment Mode */}
                    {assignmentMode === 'random' && (
                        <Box>
                            {onlineCount > 0 && (
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1, ml: 1 }}>
                                    This will use <strong>{Math.ceil(onlineCount / perRoom)}</strong> table(s).
                                </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <TextField
                                    label="People per room"
                                    type="number"
                                    size="small"
                                    value={perRoom || ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setPerRoom(isNaN(val) ? 0 : val);
                                    }}
                                    inputProps={{ min: 1, max: 30 }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': { color: 'white' },
                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<ShuffleIcon />}
                                    onClick={handleRandomAssign}
                                    sx={{
                                        flex: 1,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        color: 'white',
                                        '&:disabled': { color: 'rgba(255,255,255,0.5)' }
                                    }}
                                    disabled={onlineCount === 0}
                                >
                                    Assign Randomly
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* Manual Assignment Mode */}
                    {assignmentMode === 'manual' && (
                        <Box>
                            {/* Room Selection */}
                            {(() => {
                                const breakoutRooms = loungeTables.filter(
                                    t => t.category === 'BREAKOUT' || t.category === 'Breakout Room'
                                );
                                const hasBreakoutRooms = breakoutRooms.length > 0;

                                return (
                                    <>
                                        {!hasBreakoutRooms && (
                                            <Alert severity="warning" sx={{ mb: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                                                No breakout rooms configured. Create rooms in the Breakout Rooms Tables section first.
                                            </Alert>
                                        )}
                                        <FormControl fullWidth sx={{ mb: 2 }}>
                                            <InputLabel
                                                sx={{
                                                    color: 'rgba(255,255,255,0.7)',
                                                    '&.Mui-focused': { color: 'rgba(255,255,255,0.9)' }
                                                }}
                                            >
                                                Select Room
                                            </InputLabel>
                                            <Select
                                                value={selectedRoom}
                                                onChange={(e) => setSelectedRoom(e.target.value)}
                                                label="Select Room"
                                                disabled={!hasBreakoutRooms}
                                                sx={{
                                                    color: 'white',
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.7)' }
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            bgcolor: '#2a2a2a',
                                                            '& .MuiMenuItem-root': {
                                                                color: 'white',
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                                                '&.Mui-selected': { bgcolor: 'rgba(76, 175, 80, 0.3)' },
                                                                '&.Mui-selected:hover': { bgcolor: 'rgba(76, 175, 80, 0.5)' }
                                                            }
                                                        }
                                                    }
                                                }}
                                            >
                                                {breakoutRooms.map((table) => (
                                                    <MenuItem key={table.id} value={table.id}>
                                                        {table.name} (Seats: {table.max_seats})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </>
                                );
                            })()}


                            {/* Participant Selection */}
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                                Select participants ({selectedParticipants.size} selected):
                            </Typography>
                            <Box sx={{
                                maxHeight: 200,
                                overflowY: 'auto',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 1,
                                p: 1,
                                mb: 2,
                                bgcolor: 'rgba(0,0,0,0.2)',
                                '&::-webkit-scrollbar': {
                                    width: '8px'
                                },
                                '&::-webkit-scrollbar-track': {
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    borderRadius: '4px'
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: 'rgba(76, 175, 80, 0.6)',
                                    borderRadius: '4px',
                                    '&:hover': {
                                        bgcolor: 'rgba(76, 175, 80, 0.8)'
                                    }
                                }
                            }}>
                                <FormGroup>
                                    {onlineUsers.map((user) => (
                                        <FormControlLabel
                                            key={user.user_id}
                                            control={
                                                <Checkbox
                                                    checked={selectedParticipants.has(user.user_id)}
                                                    onChange={() => handleParticipantToggle(user.user_id)}
                                                    sx={{
                                                        color: 'rgba(255,255,255,0.5)',
                                                        '&.Mui-checked': { color: '#4caf50' }
                                                    }}
                                                />
                                            }
                                            label={user.full_name || user.username}
                                            sx={{ color: 'white' }}
                                        />
                                    ))}
                                </FormGroup>
                            </Box>

                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={<PersonIcon />}
                                onClick={handleManualAssign}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    color: 'white',
                                    '&:disabled': { color: 'rgba(255,255,255,0.5)' }
                                }}
                                disabled={selectedParticipants.size === 0 || !selectedRoom}
                            >
                                Assign Selected ({selectedParticipants.size})
                            </Button>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                {/* Global Timer Section */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" gutterBottom>
                        SESSION TIMER
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
                        <TextField
                            label="Minutes"
                            type="number"
                            size="small"
                            value={duration || ''}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setDuration(isNaN(val) ? 0 : val);
                            }}
                            inputProps={{ min: 1, max: 120 }}
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white' },
                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                            }}
                        />
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<TimerIcon />}
                            onClick={handleStartTimer}
                            sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
                        >
                            Start Timer
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                {/* Broadcast Section */}
                <Box>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" gutterBottom>
                        BROADCAST MESSAGE
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Type message to all rooms..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        sx={{
                            mt: 1,
                            '& .MuiOutlinedInput-root': { color: 'white' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                        }}
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        startIcon={<CampaignIcon />}
                        onClick={handleSendBroadcast}
                        disabled={!message.trim()}
                        sx={{
                            mt: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            color: 'white',
                            '&:disabled': { color: 'rgba(255,255,255,0.5)' }
                        }}
                    >
                        Send to All Rooms
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)' }}>
                <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    startIcon={<StopIcon />}
                    onClick={handleEndAll}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    End All Breakouts
                </Button>
            </DialogActions>
        </Dialog>
    );
}
