import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Typography,
  Paper,
  Collapse,
  IconButton,
  Stack,
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

  // ✅ NEW: Clear all announcements (when user admitted/rejected/leaves)
  const clearAllAnnouncements = () => {
    setAnnouncements([]);
  };

  return {
    addAnnouncement,
    removeAnnouncement,
    clearAllAnnouncements, // ✅ NEW: Clear when user admitted/rejected/leaves
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
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      display: "block",
                      mb: 0.5,
                    }}
                  >
                    {announcement.sender_name || "Host"} •{" "}
                    {new Date(announcement.timestamp).toLocaleTimeString()}
                  </Typography>
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
