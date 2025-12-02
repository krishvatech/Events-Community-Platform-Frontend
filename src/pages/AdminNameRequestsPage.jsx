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
  Avatar,
  Chip,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

// Helpers
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access") || "";
}

export default function AdminNameRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Action Dialog State
  const [selectedReq, setSelectedReq] = useState(null); // The request object
  const [actionType, setActionType] = useState(""); // "approved" or "rejected"
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch only pending requests by default
      const res = await fetch(`${API_BASE}/auth/admin/name-requests/?status=pending`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openDialog = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setAdminNote("");
  };

  const handleDecide = async () => {
    if (!selectedReq) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin/name-requests/${selectedReq.id}/decide/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: actionType, admin_note: adminNote }),
      });

      if (res.ok) {
        // Remove from list immediately
        setRequests((prev) => prev.filter((r) => r.id !== selectedReq.id));
        setSelectedReq(null);
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      alert("Error connecting to server");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
        Name Change Requests
      </Typography>

      {loading ? (
        <LinearProgress />
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }} variant="outlined">
          <Typography color="text.secondary">No pending requests.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Current Name</TableCell>
                <TableCell>Requested Name</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Chip label={`ID: ${row.user}`} size="small" />
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {row.old_first_name} {row.old_middle_name} {row.old_last_name}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {row.new_first_name} {row.new_middle_name} {row.new_last_name}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={row.reason}>
                      {row.reason}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(row.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => openDialog(row, "rejected")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="small"
                        color="success"
                        variant="contained"
                        disableElevation
                        onClick={() => openDialog(row, "approved")}
                        startIcon={<CheckRoundedIcon />}
                      >
                        Approve
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedReq} onClose={() => setSelectedReq(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {actionType === "approved" ? "Approve Request?" : "Reject Request?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {actionType === "approved"
              ? `This will update the user's name to "${selectedReq?.new_first_name} ${selectedReq?.new_last_name}".`
              : "The user's name will remain unchanged."}
          </Typography>
          <TextField
            label="Admin Note (Optional)"
            fullWidth
            multiline
            rows={2}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReq(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionType === "approved" ? "success" : "error"}
            onClick={handleDecide}
            disabled={processing}
          >
            {processing ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}