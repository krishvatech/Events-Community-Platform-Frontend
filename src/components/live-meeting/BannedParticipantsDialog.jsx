import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Typography,
    IconButton,
    CircularProgress,
    Stack,
    Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";

function getToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

function authHeader() {
    const tok = getToken();
    return tok ? { Authorization: `Bearer ${tok}` } : {};
}

export default function BannedParticipantsDialog({ open, onClose, eventId }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);

    const fetchBanned = async () => {
        setLoading(true);
        setError(null);
        try {
            const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
            const res = await fetch(`${API_BASE}/events/${eventId}/banned-users/`, {
                headers: { Accept: "application/json", ...authHeader() }
            });
            if (!res.ok) throw new Error("Failed to fetch banned users");
            const data = await res.json();
            setUsers(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && eventId) {
            fetchBanned();
        }
    }, [open, eventId]);

    const handleUnban = async (userId) => {
        if (!confirm("Unban this user? They will be allowed to rejoin."));
        setActionBusy(true);
        try {
            const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
            const res = await fetch(`${API_BASE}/events/${eventId}/unban/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify({ user_id: userId })
            });
            if (!res.ok) throw new Error("Failed to unban user");

            // Refresh list
            setUsers(prev => prev.filter(u => u.user_id !== userId));
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setActionBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Banned Participants
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Stack alignItems="center" py={4}>
                        <CircularProgress />
                    </Stack>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : users.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>
                        No banned participants.
                    </Typography>
                ) : (
                    <List>
                        {users.map(u => (
                            <ListItem
                                key={u.user_id}
                                secondaryAction={
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                        onClick={() => handleUnban(u.user_id)}
                                        disabled={actionBusy}
                                    >
                                        Unban
                                    </Button>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar src={u.avatar} alt={u.username}>
                                        {(u.full_name?.[0] || "U")}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={u.full_name || u.username}
                                    secondary={`@${u.username}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
