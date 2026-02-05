import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import AnnouncementIcon from "@mui/icons-material/Announcement";

/**
 * ✅ NEW: WaitingRoomControls Component
 *
 * Host-only dialog for sending announcements to waiting room participants.
 *
 * Props:
 *  - eventId: Event ID
 *  - waitingCount: Number of participants in waiting room
 *  - onAnnounce: Callback after successful announcement
 *  - onError: Callback on error
 */
export default function WaitingRoomControls({
  eventId,
  waitingCount = 0,
  onAnnounce,
  onError,
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpenDialog = () => {
    setOpen(true);
    setMessage("");
    setErrorMsg("");
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setMessage("");
    setErrorMsg("");
  };

  const handleSendAnnouncement = useCallback(async () => {
    if (!message.trim()) {
      setErrorMsg("Message cannot be empty");
      return;
    }

    if (message.length > 1000) {
      setErrorMsg("Message is too long (maximum 1000 characters)");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`/api/events/${eventId}/waiting-room/announce/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send announcement");
      }

      const result = await response.json();
      console.log(`[WaitingRoom] Announcement sent to ${result.recipients} participants`);

      // Clear and close
      setMessage("");
      handleCloseDialog();

      // Callback
      if (onAnnounce) {
        onAnnounce(result);
      }
    } catch (error) {
      console.error("[WaitingRoom] Error sending announcement:", error);
      setErrorMsg(error.message || "Failed to send announcement");
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, message, onAnnounce, onError]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSendAnnouncement();
    }
  };

  return (
    <>
      {/* Button to open dialog */}
      <Button
        variant="outlined"
        startIcon={<AnnouncementIcon />}
        onClick={handleOpenDialog}
        disabled={waitingCount === 0}
        fullWidth
        size="small"
        sx={{ mb: 1 }}
      >
        Send Announcement ({waitingCount})
      </Button>

      {/* Dialog */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Send Announcement to Waiting Room</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 2 }}>
            Send a message to all {waitingCount} participant(s) waiting for admission
          </Typography>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
              {errorMsg}
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Type your announcement here (e.g., 'We're running 5 minutes late, thanks for your patience!')"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            maxRows={6}
            helperText={`${message.length} / 1000 characters`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSendAnnouncement}
            variant="contained"
            disabled={loading || !message.trim() || waitingCount === 0}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? "Sending..." : "Send"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
