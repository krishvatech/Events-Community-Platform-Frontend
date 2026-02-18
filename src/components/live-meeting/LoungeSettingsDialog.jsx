import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Switch,
    FormControlLabel,
    TextField,
    Divider,
    Alert,
    IconButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// Helper to get token (adjust path as needed or pass as prop if preferred, but direct import is easier given existing patterns)
const getToken = () => {
    return (
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        ""
    );
};
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");


export default function LoungeSettingsDialog({ open, onClose, event, onSaved }) {
    const [settings, setSettings] = useState({
        lounge_enabled_before: false,
        lounge_before_buffer: 30,
        lounge_enabled_during: true,
        lounge_enabled_breaks: false,
        lounge_enabled_after: false,
        lounge_after_buffer: 30,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Load initial settings from event
    useEffect(() => {
        if (event) {
            setSettings({
                lounge_enabled_before: event.lounge_enabled_before ?? false,
                lounge_before_buffer: event.lounge_before_buffer ?? 30,
                lounge_enabled_during: event.lounge_enabled_during ?? true,
                lounge_enabled_breaks: event.lounge_enabled_breaks ?? false,
                lounge_enabled_after: event.lounge_enabled_after ?? false,
                lounge_after_buffer: event.lounge_after_buffer ?? 30,
            });
        }
    }, [event, open]); // Reload when opening to ensure fresh state

    const handleChange = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = async () => {
        if (!event?.id) return;
        setSaving(true);
        setError(null);

        try {
            const token = getToken();
            const res = await fetch(`${API_ROOT}/events/${event.id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(settings),
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.detail || `HTTP ${res.status}`);
            }

            // Notify parent immediately with saved settings so it can update its state
            // This fixes the bug where reopening the dialog shows stale (OFF) values
            if (onSaved) {
                onSaved(settings);
            }

            // Success
            onClose();
        } catch (e) {
            console.error("Failed to save lounge settings:", e);
            setError(e.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={!saving ? onClose : undefined}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: "#1e293b",
                    color: "#fff",
                    backgroundImage: "none",
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.1)",
                }
            }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Social Lounge Settings
                </Typography>
                <IconButton onClick={onClose} disabled={saving} size="small" sx={{ color: "rgba(255,255,255,0.5)" }}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pb: 3 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2, bgcolor: "rgba(239, 68, 68, 0.1)", color: "#fca5a5" }}>
                        {error}
                    </Alert>
                )}

                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mb: 3 }}>
                    Control regular Social Lounge availability. Breakout rooms are managed separately.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                    {/* Before Event */}
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.lounge_enabled_before}
                                    onChange={(e) => handleChange("lounge_enabled_before", e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ fontWeight: 500 }}>Open Before Event</Typography>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                        Allow networking before the event starts
                                    </Typography>
                                </Box>
                            }
                        />
                        {settings.lounge_enabled_before && (
                            <TextField
                                type="number"
                                label="Buffer (minutes)"
                                value={settings.lounge_before_buffer}
                                onChange={(e) => handleChange("lounge_before_buffer", Math.max(0, parseInt(e.target.value) || 0))}
                                size="small"
                                variant="outlined"
                                sx={{
                                    ml: 4, mt: 1, width: 140,
                                    "& .MuiOutlinedInput-root": { color: "#fff" },
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" }
                                }}
                            />
                        )}
                    </Box>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                    {/* During Event */}
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.lounge_enabled_during}
                                    onChange={(e) => handleChange("lounge_enabled_during", e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ fontWeight: 500 }}>Open During Event</Typography>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                        Allow networking while the event is live
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                    {/* During Breaks - Note: Requires explicit break mode handling in future */}
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.lounge_enabled_breaks}
                                    onChange={(e) => handleChange("lounge_enabled_breaks", e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ fontWeight: 500 }}>Open During Breaks</Typography>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                        Allow networking during intermissions
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                    {/* After Event */}
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.lounge_enabled_after}
                                    onChange={(e) => handleChange("lounge_enabled_after", e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography sx={{ fontWeight: 500 }}>Open After Event</Typography>
                                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                        Allow networking after the event ends
                                    </Typography>
                                </Box>
                            }
                        />
                        {settings.lounge_enabled_after && (
                            <TextField
                                type="number"
                                label="Buffer (minutes)"
                                value={settings.lounge_after_buffer}
                                onChange={(e) => handleChange("lounge_after_buffer", Math.max(0, parseInt(e.target.value) || 0))}
                                size="small"
                                variant="outlined"
                                sx={{
                                    ml: 4, mt: 1, width: 140,
                                    "& .MuiOutlinedInput-root": { color: "#fff" },
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" },
                                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" }
                                }}
                            />
                        )}
                    </Box>

                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={saving} sx={{ color: "rgba(255,255,255,0.6)" }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                    sx={{
                        bgcolor: "#fff", color: "#000",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.9)" }
                    }}
                >
                    {saving ? "Saving..." : "Save Settings"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
