import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';

export default function SpeedNetworkingLobby({ session, onLeave }) {
    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            bgcolor: '#0a0f1a'
        }}>
            {/* Animated waiting indicator */}
            <Box sx={{ position: 'relative', mb: 4 }}>
                <CircularProgress
                    size={80}
                    thickness={2}
                    sx={{
                        color: '#5a78ff',
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.5 }
                        }
                    }}
                />
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}>
                    <PeopleIcon sx={{ fontSize: 40, color: '#5a78ff' }} />
                </Box>
            </Box>

            <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
                Finding your match...
            </Typography>

            <Typography sx={{
                color: 'rgba(255,255,255,0.6)',
                mb: 1,
                textAlign: 'center',
                maxWidth: 400
            }}>
                We're pairing you with another participant for a {session.duration_minutes}-minute conversation.
            </Typography>

            <Typography sx={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14,
                mb: 4
            }}>
                {session.queue_count} {session.queue_count === 1 ? 'person' : 'people'} in queue
            </Typography>

            <Button
                variant="outlined"
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
                Leave Queue
            </Button>

            {/* Tips */}
            <Box sx={{
                mt: 6,
                p: 3,
                bgcolor: 'rgba(90,120,255,0.1)',
                borderRadius: 2,
                border: '1px solid rgba(90,120,255,0.2)',
                maxWidth: 500
            }}>
                <Typography sx={{ color: '#5a78ff', fontWeight: 700, mb: 1.5, fontSize: 14 }}>
                    💡 Quick Tips
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    <li>Introduce yourself briefly</li>
                    <li>Ask about their interests or work</li>
                    <li>Exchange contact info if you connect</li>
                    <li>Click "Next Match" when ready to move on</li>
                </Box>
            </Box>
        </Box>
    );
}
