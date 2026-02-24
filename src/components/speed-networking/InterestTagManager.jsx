import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    CircularProgress,
    IconButton,
    Typography,
    Alert,
    Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function authHeader() {
    const token = localStorage.getItem("access") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InterestTagManager({ eventId, sessionId, session }) {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [newTag, setNewTag] = useState({
        label: '',
        category: '',
        side: 'both'
    });
    const [deleting, setDeleting] = useState(null);
    const [error, setError] = useState(null);

    const fetchTags = async () => {
        if (!sessionId) return;
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

    useEffect(() => {
        fetchTags();
    }, [sessionId]);

    const handleAddTag = async () => {
        if (!newTag.label || !newTag.category) {
            setError('Label and category are required');
            return;
        }

        try {
            setError(null);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${sessionId}/interest-tags/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTag)
            });

            if (res.ok) {
                const data = await res.json();
                setTags([...tags, data]);
                setNewTag({ label: '', category: '', side: 'both' });
                setOpenDialog(false);
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to create tag');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteTag = async (tagId) => {
        try {
            setDeleting(tagId);
            setError(null);
            const url = `${API_ROOT}/events/${eventId}/speed-networking/${sessionId}/interest-tags/${tagId}/`.replace(/([^:]\/)\/+/g, "$1");
            const res = await fetch(url, {
                method: 'DELETE',
                headers: authHeader()
            });

            if (res.ok || res.status === 204) {
                setTags(tags.filter(t => t.id !== tagId));
            } else {
                throw new Error('Failed to delete tag');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
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

    if (loading) return <CircularProgress size={24} />;

    return (
        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                    ✨ Interest Tags
                </Typography>
                <Box>
                    <IconButton size="small" onClick={fetchTags} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={() => setOpenDialog(true)}
                        variant="contained"
                        sx={{ ml: 1 }}
                    >
                        Add Tag
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {tags.length === 0 ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    No interest tags yet. Create some to help users match based on their goals.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {tags.map(tag => (
                        <Chip
                            key={tag.id}
                            label={`${tag.label} ${getSideLabel(tag.side)}`}
                            onDelete={() => handleDeleteTag(tag.id)}
                            sx={{
                                bgcolor: `${getCategoryColor(tag.category)}20`,
                                color: getCategoryColor(tag.category),
                                borderColor: getCategoryColor(tag.category),
                                border: '1px solid',
                                fontSize: 12,
                                fontWeight: 600,
                                '& .MuiChip-deleteIcon': {
                                    opacity: deleting === tag.id ? 0.5 : 1,
                                    cursor: deleting === tag.id ? 'not-allowed' : 'pointer'
                                }
                            }}
                            disabled={deleting === tag.id}
                            deleteIcon={deleting === tag.id ? <CircularProgress size={16} /> : undefined}
                        />
                    ))}
                </Box>
            )}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Interest Tag</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2}>
                        <TextField
                            label="Label"
                            placeholder="e.g., Looking for investors"
                            value={newTag.label}
                            onChange={(e) => setNewTag({ ...newTag, label: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Category"
                            placeholder="e.g., investment"
                            value={newTag.category}
                            onChange={(e) => setNewTag({ ...newTag, category: e.target.value })}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Side</InputLabel>
                            <Select
                                value={newTag.side}
                                label="Side"
                                onChange={(e) => setNewTag({ ...newTag, side: e.target.value })}
                            >
                                <MenuItem value="seek">🔍 Seeking</MenuItem>
                                <MenuItem value="offer">💼 Offering</MenuItem>
                                <MenuItem value="both">↔️ Both / Open</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddTag} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
