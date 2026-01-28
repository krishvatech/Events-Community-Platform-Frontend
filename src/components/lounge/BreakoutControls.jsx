import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, Box, Divider,
    FormControl, InputLabel, Select, MenuItem,
    Alert, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import TimerIcon from '@mui/icons-material/Timer';
import CampaignIcon from '@mui/icons-material/Campaign';
import StopIcon from '@mui/icons-material/Stop';

export default function BreakoutControls({
    open,
    onClose,
    onAction,
    onlineCount = 0,
    debugMessage = ""
}) {
    const [perRoom, setPerRoom] = useState(4);
    const [duration, setDuration] = useState(10);
    const [message, setMessage] = useState("");

    const handleRandomAssign = () => {
        onAction({ action: 'random_assign', per_room: perRoom });
        onClose();
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
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                {/* Random Assign Section */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" gutterBottom>
                        AUTOMATED SETUP
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

                    {onlineCount > 0 && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1, ml: 1 }}>
                            This will use <strong>{Math.ceil(onlineCount / perRoom)}</strong> table(s).
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
                        <TextField
                            label="People per room"
                            type="number"
                            size="small"
                            value={perRoom || ''}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPerRoom(isNaN(val) ? 0 : val);
                            }}
                            InputProps={{ inputProps: { min: 1, max: 30 } }}
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
                            sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
                        >
                            Random Assign
                        </Button>
                    </Box>
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
                            InputProps={{ inputProps: { min: 1, max: 120 } }}
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
                        sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
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
