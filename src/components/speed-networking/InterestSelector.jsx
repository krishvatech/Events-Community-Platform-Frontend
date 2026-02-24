import React, { useState, useEffect } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Chip,
    Typography,
    CircularProgress,
    Alert,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Divider
} from '@mui/material';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InterestSelector({
    eventId,
    sessionId,
    open,
    onClose,
    onSelectInterests,
    selectedInterestIds = []
}) {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set(selectedInterestIds));
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !sessionId) return;
        fetchTags();
    }, [open, sessionId]);

    const fetchTags = async () => {
        try {
            setLoading(true);
            setError(null);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${sessionId}/interest-tags/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, { headers: authHeader() });

            if (res.ok) {
                const data = await res.json();
                setTags(Array.isArray(data) ? data : data.results || []);
            } else {
                throw new Error('Failed to fetch interest tags');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching interest tags:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTag = (tagId) => {
        const newSelected = new Set(selected);
        if (newSelected.has(tagId)) {
            newSelected.delete(tagId);
        } else {
            newSelected.add(tagId);
        }
        setSelected(newSelected);
    };

    const handleContinue = () => {
        onSelectInterests(Array.from(selected));
        onClose();
    };

    const getCategoryColor = (category) => {
        const colors = {
            'investment': '#5a78ff',
            'recruitment': '#10b981',
            'mentorship': '#f59e0b',
            'partnership': '#8b5cf6',
            'collaboration': '#06b6d4'
        };
        return colors[category] || '#6b7280';
    };

    const getSideLabel = (side) => {
        const labels = {
            'seek': '🔍 Seeking',
            'offer': '💼 Offering',
            'both': '↔️ Both'
        };
        return labels[side] || side;
    };

    // Group tags by category
    const groupedTags = tags.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = [];
        acc[tag.category].push(tag);
        return acc;
    }, {});

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#0b101a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 3
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700, color: '#fff', bgcolor: '#0b101a' }}>
                ✨ Select Your Interests
            </DialogTitle>
            <DialogContent sx={{
                pt: 2,
                bgcolor: '#0b101a',
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
                {error && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', '& .MuiAlert-icon': { color: '#ef4444' } }}>{error}</Alert>}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress sx={{ color: '#5a78ff' }} />
                    </Box>
                ) : tags.length === 0 ? (
                    <Typography sx={{ color: '#fff' }}>
                        No interest tags available for this session.
                    </Typography>
                ) : (
                    <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                            Select one or more interests to help us match you with compatible participants.
                        </Typography>

                        {Object.entries(groupedTags).map(([category, categoryTags]) => (
                            <Box key={category} sx={{ mb: 3 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 1.5,
                                        color: getCategoryColor(category),
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {category}
                                </Typography>

                                <FormGroup sx={{ ml: 1 }}>
                                    {categoryTags.map(tag => (
                                        <FormControlLabel
                                            key={tag.id}
                                            control={
                                                <Checkbox
                                                    checked={selected.has(tag.id)}
                                                    onChange={() => handleToggleTag(tag.id)}
                                                    sx={{
                                                        color: getCategoryColor(category),
                                                        '&.Mui-checked': {
                                                            color: getCategoryColor(category)
                                                        }
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ color: '#fff' }}>
                                                        {tag.label}
                                                    </Typography>
                                                    <Chip
                                                        label={getSideLabel(tag.side)}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: `${getCategoryColor(category)}20`,
                                                            color: getCategoryColor(category),
                                                            fontSize: 11,
                                                            height: 22
                                                        }}
                                                    />
                                                </Box>
                                            }
                                        />
                                    ))}
                                </FormGroup>

                                {categoryTags !== Object.values(groupedTags)[Object.keys(groupedTags).length - 1] && (
                                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
                                )}
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#0b101a', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleContinue}
                    variant="contained"
                    disabled={loading || selected.size === 0}
                    sx={{
                        bgcolor: '#5a78ff',
                        color: '#fff',
                        '&:hover': {
                            bgcolor: '#4a68ef'
                        },
                        '&:disabled': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.4)'
                        }
                    }}
                >
                    Join Queue {selected.size > 0 && `(${selected.size})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
