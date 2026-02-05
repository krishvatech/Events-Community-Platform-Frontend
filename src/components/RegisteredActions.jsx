import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { toast } from "react-toastify";
import { API_BASE, authConfig } from "../utils/api";

// Helper to compute event status
function computeEventStatus(ev) {
    const now = Date.now();
    const s = ev.start_time ? new Date(ev.start_time).getTime() : 0;
    const e = ev.end_time ? new Date(ev.end_time).getTime() : 0;

    // If meeting is manually ended, always treat as past
    if (ev.status === "ended") return "past";

    if (ev.is_live && ev.status !== "ended") return "live";
    if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
    if (s && now < s) return "upcoming";
    if (e && now > e) return "past";
    return "upcoming";
}

export default function RegisteredActions({ ev, reg, onUnregistered, onCancelRequested, hideChip = false }) {

    const [open, setOpen] = useState(false);
    const [actionType, setActionType] = useState(null); // 'unregister' | 'cancel_request'
    const [loading, setLoading] = useState(false);

    const authHeaders = () => authConfig().headers;

    // Check if event has started or ended
    const eventStatus = computeEventStatus(ev);
    const hasEventStartedOrEnded = eventStatus === "live" || eventStatus === "past";

    // Don't show cancel/unregister buttons if event has started or ended
    if (hasEventStartedOrEnded) {
        return null;
    }

    const handleOpen = (type) => {
        setActionType(type);
        setOpen(true);
    };

    const handleClose = () => {
        if (loading) return;
        setOpen(false);
        setActionType(null);
    };

    const handleConfirm = async () => {
        if (!actionType) return;
        setLoading(true);

        try {
            if (actionType === 'unregister') {
                if (!reg?.id) throw new Error("Registration ID missing");

                const res = await fetch(`${API_BASE}/event-registrations/${reg.id}/`, {
                    method: "DELETE",
                    headers: authHeaders(),
                });
                if (!res.ok) throw new Error(await res.text());

                toast.info("You have unregistered from the event.");
                if (onUnregistered) onUnregistered(ev.id);

            } else if (actionType === 'cancel_request') {
                if (!reg?.id) throw new Error("Registration ID missing");

                const res = await fetch(`${API_BASE}/event-registrations/${reg.id}/cancel_request/`, {
                    method: "POST",
                    headers: authHeaders(),
                });
                if (!res.ok) throw new Error(await res.text());

                toast.success("Cancellation request submitted.");
                if (onCancelRequested) {
                    onCancelRequested(ev.id, { ...reg, status: 'cancellation_requested', cancellation_requested: true });
                }
            }
            handleClose();
        } catch (err) {
            toast.error("Failed to process request: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const isCancelRequested = reg?.status === 'cancellation_requested' || reg?.cancellation_requested;

    return (
        <>
            {ev.is_free ? (
                <div className="flex gap-2">
                    {!hideChip && (
                        <Button
                            variant="outlined"
                            size="large"
                            disabled
                            className="normal-case rounded-full px-5 text-emerald-600 border-emerald-200 bg-emerald-50"
                        >
                            Registered
                        </Button>
                    )}
                    <Button
                        variant="text"
                        size="large"
                        color="error"
                        onClick={() => handleOpen('unregister')}
                        disabled={loading}
                        className="normal-case rounded-full px-4 hover:bg-red-50"
                    >
                        Cancel Registration
                    </Button>
                </div>
            ) : (
                <div className="flex gap-2">
                    {isCancelRequested ? (
                        <Button
                            variant="contained"
                            size="large"
                            disabled
                            className="normal-case rounded-full px-5 bg-amber-200 text-amber-900"
                        >
                            Cancellation Pending
                        </Button>
                    ) : (
                        <>
                            {!hideChip && (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    disabled
                                    className="normal-case rounded-full px-5 text-emerald-600 border-emerald-200 bg-emerald-50"
                                >
                                    Registered
                                </Button>
                            )}
                            <Button
                                variant="text"
                                size="medium"
                                color="warning"
                                onClick={() => handleOpen('cancel_request')}
                                disabled={loading}
                                className="normal-case rounded-full px-3 text-xs text-amber-700 hover:bg-amber-50"
                                title="Request Cancellation / Refund"
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={open}
                onClose={handleClose}
                PaperProps={{
                    style: { borderRadius: 16, padding: 8 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {actionType === 'unregister' ? "Unregister from Event?" : "Request Cancellation?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {actionType === 'unregister'
                            ? "Are you sure you want to unregister from this event? You can register again later if spots are available."
                            : "This is a paid event. Submitting a cancellation request will undergo admin review for refunds. Are you sure you want to proceed?"
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClose} disabled={loading} color="inherit" className="rounded-full">
                        Keep It
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        variant="contained"
                        color={actionType === 'unregister' ? "error" : "warning"}
                        className="rounded-full normal-case px-4"
                        autoFocus
                    >
                        {loading ? "Processing..." : (actionType === 'unregister' ? "Yes, Unregister" : "Submit Request")}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
