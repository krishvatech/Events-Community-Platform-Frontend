// src/pages/AdminNameRequestsPage.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
  Stack,
  Alert,
  Avatar,
  Skeleton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { getAdminNameRequests, decideNameRequest } from "../utils/api";

// Helper to color-code statuses
const getStatusColor = (status) => {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "error";
    case "pending": return "warning";
    default: return "default";
  }
};

const getDiditColor = (status) => {
  switch (status) {
    case "approved": return "success";
    case "declined": return "error";
    case "review": return "warning";
    case "pending": return "info";
    default: return "default";
  }
};

export default function AdminNameRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState({ open: false, request: null, type: null });
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // By default fetch all, or filter by status='pending' if you prefer
      const data = await getAdminNameRequests({ ordering: "-created_at" });
      // API usually returns { count: ..., results: [...] } or just [...]
      const list = Array.isArray(data) ? data : data.results || [];
      setRequests(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenAction = (req, type) => {
    setActionDialog({ open: true, request: req, type }); // type = 'approved' or 'rejected'
    setAdminNote("");
    setError("");
  };

  const handleCloseAction = () => {
    setActionDialog({ open: false, request: null, type: null });
  };

  const submitDecision = async () => {
    if (!actionDialog.request || !actionDialog.type) return;

    setProcessing(true);
    setError("");
    try {
      await decideNameRequest(actionDialog.request.id, actionDialog.type, adminNote);

      // Refresh list locally
      setRequests((prev) =>
        prev.map((r) =>
          r.id === actionDialog.request.id
            ? { ...r, status: actionDialog.type, admin_note: adminNote }
            : r
        )
      );
      handleCloseAction();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit decision");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header (match Admin Events style) */}
      <Box
        className="mb-4"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: "#0ea5a4" }}>
          {("A")[0].toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" className="font-extrabold">
            Name Change Requests
          </Typography>
          <Typography className="text-slate-500">
            Review and manage legal name change requests submitted by members.
          </Typography>
        </Box>

        <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Button
            fullWidth
            startIcon={<RefreshIcon />}
            onClick={fetchRequests}
            variant="outlined"
            size="small"
            className="rounded-xl"
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Current Name</TableCell>
                <TableCell>Requested Name</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Didit Verification</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // 🔄 Skeleton rows while loading
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {/* User */}
                    <TableCell>
                      <Skeleton variant="text" width={160} />
                      <Skeleton variant="text" width={120} />
                    </TableCell>

                    {/* Current name */}
                    <TableCell>
                      <Skeleton variant="text" width={180} />
                    </TableCell>

                    {/* Requested name */}
                    <TableCell>
                      <Skeleton variant="text" width={200} />
                    </TableCell>

                    {/* Reason */}
                    <TableCell>
                      <Skeleton variant="text" width="90%" />
                    </TableCell>

                    {/* Didit status */}
                    <TableCell>
                      <Skeleton variant="rounded" width={120} height={24} />
                    </TableCell>

                    {/* Admin status */}
                    <TableCell>
                      <Skeleton variant="rounded" width={100} height={24} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <Skeleton variant="rounded" width={120} height={32} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  {/* Empty state */}
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 4, color: "text.secondary" }}
                      >
                        No requests found.
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Real data rows */}
                  {requests.map((req) => (
                    <TableRow key={req.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {req.username || `User #${req.user}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {req.email}
                        </Typography>
                      </TableCell>

                      {/* Old Name */}
                      <TableCell sx={{ color: "text.secondary" }}>
                        {req.old_first_name} {req.old_middle_name} {req.old_last_name}
                      </TableCell>

                      {/* New Name */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <ArrowForwardRoundedIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight="bold">
                            {req.new_first_name} {req.new_middle_name} {req.new_last_name}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Reason */}
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap title={req.reason}>
                          {req.reason}
                        </Typography>
                      </TableCell>

                      {/* Didit Status */}
                      <TableCell>
                        <Chip
                          label={(req.didit_status || "not_started")
                            .replace("_", " ")
                            .toUpperCase()}
                          size="small"
                          variant="outlined"
                          color={getDiditColor(req.didit_status)}
                        />
                      </TableCell>

                      {/* Admin Status */}
                      <TableCell>
                        <Chip
                          label={req.status.toUpperCase()}
                          size="small"
                          color={getStatusColor(req.status)}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        {req.status === "pending" ? (
                          <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <Tooltip title="Approve">
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleOpenAction(req, "approved")}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleOpenAction(req, "rejected")}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {req.decided_at
                              ? new Date(req.decided_at).toLocaleDateString()
                              : "Decided"}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Decision Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseAction} fullWidth maxWidth="xs">
        <DialogTitle>
          {actionDialog.type === "approved" ? "Approve Request" : "Reject Request"}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="body2" paragraph>
            You are about to <strong>{actionDialog.type}</strong> this name change request.
          </Typography>

          {actionDialog.type === "approved" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This will update the user's profile with the new legal name and lock it.
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Admin Note (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Reason for decision..."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAction} disabled={processing}>Cancel</Button>
          <Button
            onClick={submitDecision}
            variant="contained"
            color={actionDialog.type === "approved" ? "success" : "error"}
            disabled={processing}
          >
            {processing ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}