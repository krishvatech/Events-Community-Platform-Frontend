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
    Alert,
    Chip,
    Card,
    Snackbar,
    Skeleton,
    Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import UndoIcon from "@mui/icons-material/Undo";

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
    const [unbanningId, setUnbanningId] = useState(null);
    const [confirmUnbanId, setConfirmUnbanId] = useState(null);
    const [successSnackbar, setSuccessSnackbar] = useState(false);
    const [successName, setSuccessName] = useState("");

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

    const handleUnban = async (userId, userName) => {
        setActionBusy(true);
        setUnbanningId(userId);
        try {
            const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
            const res = await fetch(`${API_BASE}/events/${eventId}/unban/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify({ user_id: userId })
            });
            if (!res.ok) throw new Error("Failed to unban user");

            // Show success notification
            setSuccessName(userName);
            setSuccessSnackbar(true);

            // Refresh list with animation delay
            setTimeout(() => {
                setUsers(prev => prev.filter(u => u.user_id !== userId));
                setConfirmUnbanId(null);
            }, 600);
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setActionBusy(false);
            setUnbanningId(null);
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: "12px",
                            backgroundImage: "none",
                            bgcolor: "#1e1e2e",
                            color: "#e0e0e0",
                        }
                    }
                }}
            >
                {/* Header */}
                <DialogTitle sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    pb: 2,
                    borderBottom: "1px solid",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <LockIcon sx={{ color: "error.main", fontSize: 28 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, m: 0 }}>
                            Banned Participants
                        </Typography>
                    </Stack>
                    <IconButton onClick={onClose} size="small" sx={{
                        color: "text.secondary",
                        "&:hover": { color: "text.primary" }
                    }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                {/* Content */}
                <DialogContent sx={{ py: 3, px: 0 }}>
                    {loading ? (
                        <Stack spacing={2} sx={{ px: 3 }}>
                            {[1, 2, 3].map(i => (
                                <Card key={i} elevation={0} sx={{
                                    bgcolor: "rgba(255, 255, 255, 0.05)",
                                    p: 2,
                                    borderRadius: "8px"
                                }}>
                                    <Stack direction="row" spacing={2}>
                                        <Skeleton variant="circular" width={44} height={44} />
                                        <Stack flex={1} spacing={1}>
                                            <Skeleton variant="text" width="60%" />
                                            <Skeleton variant="text" width="40%" />
                                        </Stack>
                                    </Stack>
                                </Card>
                            ))}
                        </Stack>
                    ) : error ? (
                        <Alert severity="error" sx={{ mx: 3 }}>{error}</Alert>
                    ) : users.length === 0 ? (
                        <Stack
                            alignItems="center"
                            justifyContent="center"
                            py={6}
                            sx={{ color: "text.secondary" }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 56, mb: 2, color: "success.main" }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                No banned participants
                            </Typography>
                            <Typography variant="body2">
                                All participants are welcome
                            </Typography>
                        </Stack>
                    ) : (
                        <List sx={{ px: 0 }}>
                            {users.map((u, idx) => (
                                <Stack key={u.user_id}>
                                    <ListItem
                                        sx={{
                                            px: 3,
                                            py: 2,
                                            transition: "all 0.3s ease",
                                            opacity: unbanningId === u.user_id ? 0.5 : 1,
                                            transform: unbanningId === u.user_id ? "translateX(10px)" : "translateX(0)",
                                            "&:hover": {
                                                bgcolor: "rgba(255, 255, 255, 0.05)",
                                                borderRadius: "8px",
                                            }
                                        }}
                                        secondaryAction={
                                            <Button
                                                variant={confirmUnbanId === u.user_id ? "contained" : "outlined"}
                                                color={confirmUnbanId === u.user_id ? "error" : "primary"}
                                                size="small"
                                                startIcon={confirmUnbanId === u.user_id ? <UndoIcon /> : undefined}
                                                onClick={() => {
                                                    if (confirmUnbanId === u.user_id) {
                                                        handleUnban(u.user_id, u.full_name || u.username);
                                                    } else {
                                                        setConfirmUnbanId(u.user_id);
                                                    }
                                                }}
                                                disabled={actionBusy}
                                                sx={{
                                                    transition: "all 0.3s ease",
                                                    fontWeight: 600,
                                                    minWidth: "90px",
                                                }}
                                            >
                                                {unbanningId === u.user_id ? (
                                                    <CircularProgress size={20} />
                                                ) : confirmUnbanId === u.user_id ? (
                                                    "Confirm"
                                                ) : (
                                                    "Unban"
                                                )}
                                            </Button>
                                        }
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                src={u.avatar}
                                                alt={u.username}
                                                sx={{
                                                    border: "2px solid",
                                                    borderColor: "error.light",
                                                    width: 44,
                                                    height: 44,
                                                }}
                                            >
                                                {(u.full_name?.[0] || "U").toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    {u.full_name || u.username}
                                                </Typography>
                                            }
                                            secondary={
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                        @{u.username}
                                                    </Typography>
                                                    <Chip
                                                        label="Banned"
                                                        size="small"
                                                        icon={<LockIcon />}
                                                        color="error"
                                                        variant="outlined"
                                                        sx={{ height: 20 }}
                                                    />
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                    {idx < users.length - 1 && <Divider sx={{ my: 1 }} />}
                                </Stack>
                            ))}
                        </List>
                    )}
                </DialogContent>

                {/* Footer */}
                <DialogActions sx={{
                    py: 2,
                    px: 3,
                    borderTop: "1px solid",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                }}>
                    <Button
                        onClick={onClose}
                        sx={{ fontWeight: 600 }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Notification */}
            <Snackbar
                open={successSnackbar}
                autoHideDuration={4000}
                onClose={() => setSuccessSnackbar(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                <Alert
                    onClose={() => setSuccessSnackbar(false)}
                    severity="success"
                    variant="filled"
                    icon={<CheckCircleIcon fontSize="inherit" />}
                    sx={{
                        width: "100%",
                        fontWeight: 600,
                        borderRadius: "8px",
                    }}
                >
                    {successName} has been unbanned successfully
                </Alert>
            </Snackbar>
        </>
    );
}
