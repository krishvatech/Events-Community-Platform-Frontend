import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Typography,
  Paper,
  Collapse,
  IconButton,
  Stack,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import { useTheme } from "@mui/material/styles";

/**
 * ✅ NEW: WaitingRoomAnnouncements Component
 *
 * Displays host announcements to participants in the waiting room.
 * Messages are delivered in real-time via WebSocket.
 *
 * Announcements persist until:
 * - User is admitted to the meeting
 * - User is rejected from the meeting
 * - User voluntarily leaves waiting room
 * - Meeting ends
 *
 * Props:
 *  - onAnnouncement: Callback when announcement is received
 *  - maxMessages: Max number of announcements to display (default: 10)
 */
export default function WaitingRoomAnnouncements({
  onAnnouncement,
  maxMessages = 10,
}) {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState([]);

  const addAnnouncement = (announcement) => {
    const id = `announcement-${Date.now()}-${Math.random()}`;
    const newAnnouncement = {
      id,
      ...announcement,
      announcement_id: announcement.announcement_id || null,  // ✅ Server ID
      is_edited: false,  // ✅ Track if announcement has been edited
      addedAt: new Date(),
    };

    setAnnouncements((prev) => {
      const updated = [newAnnouncement, ...prev].slice(0, maxMessages);
      return updated;
    });

    if (onAnnouncement) {
      onAnnouncement(newAnnouncement);
    }

    // ✅ CHANGED: Announcements now persist (no auto-dismiss)
    // They are cleared when user is admitted, rejected, or leaves waiting room
  };

  const removeAnnouncement = (id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  // ✅ NEW: Update announcement (called from socket event when host edits)
  const updateAnnouncement = (announcement_id, newMessage, updatedAt) => {
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.announcement_id === announcement_id
          ? { ...a, message: newMessage, is_edited: true, updated_at: updatedAt }
          : a
      )
    );
  };

  // ✅ NEW: Delete announcement (called from socket event when host deletes)
  const deleteAnnouncement = (announcement_id) => {
    setAnnouncements((prev) =>
      prev.filter((a) => a.announcement_id !== announcement_id)
    );
  };

  // ✅ NEW: Clear all announcements (when user admitted/rejected/leaves)
  const clearAllAnnouncements = () => {
    setAnnouncements([]);
  };

  return {
    addAnnouncement,
    removeAnnouncement,
    updateAnnouncement,  // ✅ NEW: Called from socket event
    deleteAnnouncement,  // ✅ NEW: Called from socket event
    clearAllAnnouncements,
    AnnouncementsUI: (
      <Box sx={{ width: "100%", mb: 2 }}>
        <Stack spacing={1}>
          {announcements.map((announcement) => (
            <Collapse key={announcement.id} in={true}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  bgcolor: theme.palette.info.lighter || "#e3f2fd",
                  borderLeft: `4px solid ${theme.palette.info.main}`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                <AnnouncementIcon
                  sx={{
                    color: theme.palette.info.main,
                    mt: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {announcement.sender_name || "Host"} •{" "}
                      {new Date(announcement.timestamp).toLocaleTimeString()}
                    </Typography>
                    {announcement.is_edited && (
                      <Chip
                        label="Edited"
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          height: 18,
                          bgcolor: "rgba(255,255,255,0.15)",
                          color: theme.palette.text.secondary,
                        }}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.primary,
                      wordBreak: "break-word",
                    }}
                  >
                    {announcement.message}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => removeAnnouncement(announcement.id)}
                  sx={{ mt: -0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Paper>
            </Collapse>
          ))}
        </Stack>
      </Box>
    ),
  };
}
