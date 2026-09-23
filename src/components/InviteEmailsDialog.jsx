import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";

// Define API constants (reusing existing patterns)
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

// ---- IMAA Institute design tokens (presentation only) ----
const NAVY = "#1B2A4A";
const TEAL = "#0A9396";
const TEAL_DARK = "#087F82";
const BG = "#F6F8FB";
const BORDER = "#E3E8EF";
const MUTED = "#64748B";

export default function InviteEmailsDialog({ open, onClose, mode = "event", targetIdOrSlug }) {
    const [emailsText, setEmailsText] = useState("");
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (open) {
            setEmailsText("");
            setErrorText("");
        }
    }, [open]);

    const handleSendInvites = async () => {
        if (!emailsText.trim()) {
            setErrorText("Please enter at least one email address.");
            return;
        }

        // Basic email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Parse emails
        const rawEmails = emailsText.split(/[\s,]+/).filter(Boolean);
        const invalidEmails = rawEmails.filter(email => !emailRegex.test(email));

        if (invalidEmails.length > 0) {
            setErrorText(`Invalid email format detected: ${invalidEmails.join(", ")}`);
            return;
        }

        // Limit to 20 emails
        if (rawEmails.length > 20) {
            setErrorText("Limit: 20 emails per request.");
            return;
        }

        setErrorText("");
        setLoading(true);
        try {
            const token = getStoredAccessToken();
            const endpoint = mode === "event" ? `events/${targetIdOrSlug}/invite-emails/` : `groups/${targetIdOrSlug}/invite-emails/`;

            const payload = {
                emails_text: emailsText,
            };

            const res = await fetch(`${API_ROOT}/${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (res.ok) {
                if (json.sent > 0) {
                    toast.success(`Successfully sent ${json.sent} invitation(s)!`);
                } else if (json.failed && json.failed.length > 0) {
                    toast.error(`Failed to send invitations to ${json.failed.length} address(es).`);
                } else {
                    toast.info("No valid emails found to invite.");
                }
                onClose();
                setEmailsText("");
            } else if (res.status === 429) {
                toast.error(json.detail || "Daily invite limit reached. Please try again tomorrow.");
            } else {
                toast.error(json.detail || "Failed to send invitations.");
            }
        } catch (error) {
            console.error("Invite error", error);
            toast.error("An error occurred while sending invitations.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 3, border: `1px solid ${BORDER}` } }}
        >
            <DialogTitle
                sx={{ fontWeight: 800, fontSize: 19, color: NAVY, borderBottom: `1px solid ${BORDER}`, py: 2 }}
            >
                Invite by Email
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, mt: 1 }}>
                    <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
                        Enter email addresses separated by commas, spaces, or newlines.
                        We'll send them a secure link to join directly.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={10}
                        placeholder="e.g. alice@example.com, bob@example.com"
                        value={emailsText}
                        onChange={(e) => {
                            setEmailsText(e.target.value);
                            if (errorText) setErrorText("");
                        }}
                        disabled={loading}
                        error={!!errorText}
                        helperText={errorText}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                bgcolor: "#fff",
                                "& fieldset": { borderColor: BORDER },
                                "&:hover fieldset": { borderColor: "#CBD5E1" },
                                "&.Mui-focused fieldset": { borderColor: TEAL, borderWidth: 2 },
                            },
                        }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: MUTED }}>
                        Limit: 20 emails per request, 100 per day.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions
                sx={{ px: 3, py: 2.25, borderTop: `1px solid ${BORDER}`, bgcolor: BG, gap: 1 }}
            >
                <Button
                    onClick={onClose}
                    disabled={loading}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, color: MUTED,
                          "&:hover": { bgcolor: "rgba(27,42,74,0.05)", color: NAVY } }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSendInvites}
                    variant="contained"
                    disabled={loading || !emailsText.trim()}
                    sx={{
                        minWidth: 120,
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        bgcolor: TEAL,
                        color: "#fff",
                        boxShadow: "none",
                        "&:hover": { bgcolor: TEAL_DARK, boxShadow: "none" },
                        "&.Mui-disabled": { bgcolor: "#CBD5E1", color: "#fff" },
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Send Invites"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
