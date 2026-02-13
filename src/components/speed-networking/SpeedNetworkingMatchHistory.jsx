import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Card,
    CircularProgress,
    Chip,
    Button,
    Grid,
    Paper
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SpeedNetworkingMatchHistory({ eventId, sessionId }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionName, setSessionName] = useState('');

    useEffect(() => {
        fetchUserMatches();
    }, [eventId, sessionId]);

    const fetchUserMatches = async () => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${sessionId}/user-matches/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, { headers: authHeader() });

            if (!res.ok) {
                throw new Error('Failed to fetch matches');
            }

            const data = await res.json();
            setMatches(data.matches || []);
            setSessionName(data.session_name || '');
        } catch (err) {
            console.error('[MatchHistory] Error fetching matches:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ py: 2, px: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 2 }}>
                <Typography sx={{ color: '#ef4444' }}>
                    Error: {error}
                </Typography>
            </Box>
        );
    }

    if (matches.length === 0) {
        return (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    No matches yet. Join the speed networking session to start connecting!
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                    Your Matches
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                    {sessionName} • {matches.length} {matches.length === 1 ? 'connection' : 'connections'}
                </Typography>
            </Box>

            {/* Matches Grid */}
            <Grid container spacing={2}>
                {matches.map((match) => (
                    <Grid item xs={12} sm={6} md={4} key={match.match_id}>
                        <Card sx={{
                            bgcolor: '#0b101a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                borderColor: 'rgba(90,120,255,0.5)',
                                transform: 'translateY(-2px)',
                            }
                        }}>
                            <Box sx={{ p: 2 }}>
                                {/* Partner Info */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    mb: 2
                                }}>
                                    <Avatar
                                        src={match.partner.avatar_url}
                                        alt={match.partner.first_name}
                                        sx={{ width: 56, height: 56 }}
                                    >
                                        {(match.partner.first_name || 'U').charAt(0)}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{
                                            color: '#fff',
                                            fontWeight: 600,
                                            fontSize: 15,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {match.partner.first_name || match.partner.username}
                                        </Typography>
                                        <Typography sx={{
                                            color: 'rgba(255,255,255,0.5)',
                                            fontSize: 12
                                        }}>
                                            @{match.partner.username}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Match Details */}
                                <Box sx={{ mb: 2, py: 2, borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 1
                                    }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                            Duration
                                        </Typography>
                                        <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: 13 }}>
                                            {formatDuration(match.duration_seconds)}
                                        </Typography>
                                    </Box>

                                    {match.match_score && (
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                                Match Score
                                            </Typography>
                                            <Typography sx={{
                                                color: match.match_score >= 7 ? '#22c55e' : match.match_score >= 5 ? '#f59e0b' : '#ef4444',
                                                fontWeight: 600,
                                                fontSize: 13
                                            }}>
                                                {(match.match_score / 10 * 100).toFixed(0)}%
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* Status Badge */}
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    {match.status === 'COMPLETED' ? (
                                        <Chip
                                            icon={<CheckCircleIcon />}
                                            label="Completed"
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(34, 197, 94, 0.2)',
                                                color: '#22c55e',
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}
                                        />
                                    ) : (
                                        <Chip
                                            icon={<BlockIcon />}
                                            label="Skipped"
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}
                                        />
                                    )}
                                </Box>

                                {/* Action Button */}
                                <Button
                                    fullWidth
                                    startIcon={<PersonAddIcon />}
                                    sx={{
                                        color: '#5a78ff',
                                        borderColor: '#5a78ff',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        py: 1,
                                        '&:hover': {
                                            bgcolor: 'rgba(90, 120, 255, 0.1)',
                                            borderColor: '#7a94ff'
                                        }
                                    }}
                                    variant="outlined"
                                >
                                    Connect
                                </Button>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Stats Footer */}
            <Paper sx={{
                mt: 3,
                p: 2,
                bgcolor: 'rgba(90, 120, 255, 0.05)',
                borderRadius: 2,
                border: '1px solid rgba(90, 120, 255, 0.2)'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <Box>
                        <Typography sx={{ color: '#5a78ff', fontWeight: 700, fontSize: 20 }}>
                            {matches.length}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 0.5 }}>
                            Total Matches
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{
                            color: '#22c55e',
                            fontWeight: 700,
                            fontSize: 20
                        }}>
                            {matches.filter(m => m.status === 'COMPLETED').length}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 0.5 }}>
                            Completed
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{
                            color: '#f59e0b',
                            fontWeight: 700,
                            fontSize: 20
                        }}>
                            {matches.filter(m => m.status === 'SKIPPED').length}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, mt: 0.5 }}>
                            Skipped
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
