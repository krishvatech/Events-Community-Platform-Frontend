import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Stack,
  Box,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import { formatSessionTimeRange } from "../utils/timezoneUtils";

const SESSION_TYPE_COLORS = {
  main: "#10b8a6",
  breakout: "#6366f1",
  workshop: "#f97316",
  networking: "#ec4899",
};

const SESSION_TYPE_LABELS = {
  main: "Main Session",
  breakout: "Breakout",
  workshop: "Workshop",
  networking: "Networking",
};

function SessionList({
  sessions,
  onEdit,
  onDelete,
  timezone,
  onMoveUp,
  onMoveDown,
  onSortByStartTime,
  disableReordering = false,
}) {
  if (!sessions || sessions.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 3,
          backgroundColor: "#f9fafb",
          borderRadius: 2,
          border: "1px dashed #d1d5db",
        }}
      >
        <p className="text-slate-500">No sessions added yet. Click "Add Session" to create one.</p>
      </Box>
    );
  }

  const formatSessionDisplay = (startTime, endTime) => {
    const formatted = formatSessionTimeRange(startTime, endTime, timezone);
    return {
      primary: formatted.primary,
      secondary: formatted.secondary,
    };
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Group sessions by date for day headers
  const sessionsByDate = {};
  const dateOrder = [];
  sessions.forEach((session) => {
    let dateKey = session.session_date;
    if (!dateKey && session.start_time) {
      try {
        const d = new Date(session.start_time);
        if (!isNaN(d.getTime())) {
          dateKey = d.toISOString().split("T")[0];
        }
      } catch (e) {
        // invalid date, skip
      }
    }
    if (!dateKey) return; // Skip sessions without valid dates

    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = [];
      dateOrder.push(dateKey);
    }
    sessionsByDate[dateKey].push({ ...session, _dateKey: dateKey });
  });
  dateOrder.sort();

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb" }}>
      {(onSortByStartTime || onMoveUp || onMoveDown) && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#fafafa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" sx={{ color: "#475569" }}>
            Reorder sessions manually, or sort them by start time.
          </Typography>
          {onSortByStartTime && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ScheduleIcon fontSize="small" />}
              onClick={onSortByStartTime}
              disabled={disableReordering || sessions.length < 2}
              sx={{ textTransform: "none" }}
            >
              Sort by Start Time
            </Button>
          )}
        </Box>
      )}
      <Table size="small">
        <TableHead sx={{ backgroundColor: "#f3f4f6" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
            <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Image</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              <Box>
                <Typography variant="subtitle2">Start</Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>Event • User</Typography>
              </Box>
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              <Box>
                <Typography variant="subtitle2">End</Typography>
                <Typography variant="caption" sx={{ color: "#6b7280" }}>Event • User</Typography>
              </Box>
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dateOrder.map((dateKey, dateIdx) => {
            const dateSessions = sessionsByDate[dateKey];
            const dayLabel = `Day ${dateIdx + 1}`;
            const dateDisplay = new Date(dateKey).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <React.Fragment key={dateKey}>
                {/* Day Header Row */}
                <TableRow sx={{ backgroundColor: "#f0f9ff", "&:hover": { backgroundColor: "#f0f9ff" } }}>
                  <TableCell colSpan={7} sx={{ py: 1.5, fontWeight: 600, color: "#0284c7" }}>
                    {dayLabel} — {dateDisplay}
                  </TableCell>
                </TableRow>

                {/* Session Rows */}
                {dateSessions.map((session, sessionIdx) => {
                  const originalIdx = sessions.findIndex((s) => s.id === session.id);

                  return (
                    <TableRow key={sessionIdx} hover>
                      <TableCell>
                        <Box>
                          <p className="font-medium text-sm">{session.title}</p>
                          {session.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{session.description}</p>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            width: 50,
                            height: 80,
                            backgroundColor: "#f3f4f6",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {session.session_image ? (
                            <img
                              src={session.session_image}
                              alt={session.title}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          {!session.session_image && (
                            <ImageRoundedIcon sx={{ fontSize: 24, color: "#9ca3af" }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={SESSION_TYPE_LABELS[session.sessionType] || session.sessionType}
                          size="small"
                          sx={{
                            backgroundColor: SESSION_TYPE_COLORS[session.sessionType] || "#6b7280",
                            color: "white",
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatDuration(session.effective_duration_minutes)}
                        </Typography>
                        {session.session_breaks && session.session_breaks.length > 0 && (
                          <Typography variant="caption" sx={{ color: "#6b7280" }}>
                            {session.session_breaks.map((b) => b.label || b.break_type).join(", ")} ({session.session_breaks.reduce((sum, b) => sum + b.duration_minutes, 0)}m break)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        {(() => {
                          const formatted = formatSessionDisplay(session.startTime, session.endTime);
                          return (
                            <Stack spacing={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatted.primary}
                              </Typography>
                              {formatted.secondary && (
                                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                                  {formatted.secondary.label}
                                </Typography>
                              )}
                            </Stack>
                          );
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        {(() => {
                          const formatted = formatSessionDisplay(session.startTime, session.endTime);
                          return (
                            <Stack spacing={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatted.primary}
                              </Typography>
                              {formatted.secondary && (
                                <Typography variant="caption" sx={{ color: "#6b7280" }}>
                                  {formatted.secondary.label}
                                </Typography>
                              )}
                            </Stack>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {(onMoveUp || onMoveDown) && (
                            <>
                              <Tooltip title="Move up">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => onMoveUp?.(originalIdx)}
                                    disabled={disableReordering || originalIdx === 0}
                                    sx={{ color: "#64748b" }}
                                  >
                                    <ArrowUpwardIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Move down">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => onMoveDown?.(originalIdx)}
                                    disabled={disableReordering || originalIdx === sessions.length - 1}
                                    sx={{ color: "#64748b" }}
                                  >
                                    <ArrowDownwardIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Edit session">
                            <IconButton
                              size="small"
                              onClick={() => onEdit(session, originalIdx)}
                              sx={{ color: "#10b8a6" }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete session">
                            <IconButton
                              size="small"
                              onClick={() => onDelete(session, originalIdx)}
                              sx={{ color: "#ef4444" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default SessionList;
