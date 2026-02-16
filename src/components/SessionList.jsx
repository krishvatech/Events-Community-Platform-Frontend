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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";

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

function SessionList({ sessions, onEdit, onDelete }) {
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

  const formatDateTime = (isoString) => {
    const date = dayjs(isoString);
    return date.isValid() ? date.format("MMM DD, YYYY • HH:mm") : "—";
  };

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb" }}>
      <Table size="small">
        <TableHead sx={{ backgroundColor: "#f3f4f6" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Start</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>End</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions.map((session, idx) => (
            <TableRow key={idx} hover>
              <TableCell>
                <Box>
                  <p className="font-medium text-sm">{session.title}</p>
                  {session.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{session.description}</p>
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
                {formatDateTime(session.startTime)}
              </TableCell>
              <TableCell sx={{ fontSize: "0.875rem" }}>
                {formatDateTime(session.endTime)}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="Edit session">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(session, idx)}
                      sx={{ color: "#10b8a6" }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete session">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(session, idx)}
                      sx={{ color: "#ef4444" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default SessionList;
