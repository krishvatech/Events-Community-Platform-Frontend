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
  Stack,
  Alert,
  Avatar,
  Skeleton,
  Tabs,
  Tab,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VerifiedIcon from "@mui/icons-material/Verified";

import {
  getAdminNameRequests,
  decideNameRequest,
  getAdminKYCVerifications,
  overrideKYCStatus,
  resetKYCProcess,
} from "../utils/api";

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

const getKYCStatusColor = (status) => {
  switch (status) {
    case "approved": return "success";
    case "declined": return "error";
    case "review": return "warning";
    case "pending": return "info";
    case "not_started": return "default";
    default: return "default";
  }
};

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminNameRequestsPage() {
  const [tabValue, setTabValue] = useState(0);

  // Name Change Requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionDialog, setActionDialog] = useState({ open: false, request: null, type: null });
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [detailsDialog, setDetailsDialog] = useState({ open: false, request: null });

  // KYC Verifications state
  const [kycVerifications, setKycVerifications] = useState([]);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [kycActionDialog, setKycActionDialog] = useState({ open: false, user: null, action: null });
  const [kycAdminNote, setKycAdminNote] = useState("");
  const [kycProcessing, setKycProcessing] = useState(false);
  const [kycError, setKycError] = useState("");
  const [kycStatusFilter, setKycStatusFilter] = useState("all"); // New filter state

  const openDetails = (req) => setDetailsDialog({ open: true, request: req });
  const closeDetails = () => setDetailsDialog({ open: false, request: null });

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await getAdminNameRequests({ ordering: "-created_at" });
      const list = Array.isArray(data) ? data : data.results || [];
      setRequests(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchKycVerifications = async () => {
    setLoadingKyc(true);
    try {
      const params = { ordering: "-kyc_didit_last_webhook_at" };
      // Apply filter if not "all"
      if (kycStatusFilter !== "all") {
        params.kyc_status = kycStatusFilter;
      }
      const data = await getAdminKYCVerifications(params);
      const list = Array.isArray(data) ? data : data.results || [];
      setKycVerifications(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKyc(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    fetchKycVerifications();
  }, [kycStatusFilter]); // Refetch when filter changes

  const handleOpenAction = (req, type) => {
    setActionDialog({ open: true, request: req, type });
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

  const handleOpenKycAction = (user, action) => {
    setKycActionDialog({ open: true, user, action });
    setKycAdminNote("");
    setKycError("");
  };

  const handleCloseKycAction = () => {
    setKycActionDialog({ open: false, user: null, action: null });
  };

  const submitKycAction = async () => {
    if (!kycActionDialog.user || !kycActionDialog.action) return;

    setKycProcessing(true);
    setKycError("");
    try {
      const userId = kycActionDialog.user.user_id;

      if (kycActionDialog.action === "reset") {
        await resetKYCProcess(userId, kycAdminNote);
        setKycVerifications((prev) =>
          prev.map((v) =>
            v.user_id === userId
              ? { ...v, kyc_status: "not_started", kyc_decline_reason: null }
              : v
          )
        );
      } else {
        // Override status
        await overrideKYCStatus(userId, kycActionDialog.action, kycAdminNote);
        setKycVerifications((prev) =>
          prev.map((v) =>
            v.user_id === userId
              ? { ...v, kyc_status: kycActionDialog.action, admin_note: kycAdminNote }
              : v
          )
        );
      }
      handleCloseKycAction();
    } catch (err) {
      setKycError(err.response?.data?.detail || "Failed to perform action");
    } finally {
      setKycProcessing(false);
    }
  };

  const handleRefresh = () => {
    if (tabValue === 0) {
      fetchRequests();
    } else {
      fetchKycVerifications();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
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
          {("I")[0].toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" className="font-extrabold">
            Identity Verification
          </Typography>
          <Typography className="text-slate-500">
            Review and manage identity verification requests and KYC statuses.
          </Typography>
        </Box>

        <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Button
            fullWidth
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            variant="outlined"
            size="small"
            className="rounded-xl"
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Name Change Requests" />
          <Tab label="KYC Verifications" />
        </Tabs>
      </Box>

      {/* Tab 1: Name Change Requests */}
      <TabPanel value={tabValue} index={0}>
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
                {loadingRequests ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton variant="text" width={160} /><Skeleton variant="text" width={120} /></TableCell>
                      <TableCell><Skeleton variant="text" width={180} /></TableCell>
                      <TableCell><Skeleton variant="text" width={200} /></TableCell>
                      <TableCell><Skeleton variant="text" width="90%" /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={120} height={24} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={100} height={24} /></TableCell>
                      <TableCell align="right"><Skeleton variant="rounded" width={120} height={32} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No requests found.
                        </TableCell>
                      </TableRow>
                    )}
                    {requests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ width: 40, height: 40 }}>
                              {(req.first_name || req.username || "U")[0].toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {`${req.first_name || ""} ${req.last_name || ""}`.trim() || req.username || `User #${req.user}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {req.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>
                          {req.old_first_name} {req.old_middle_name} {req.old_last_name}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ArrowForwardRoundedIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                              {req.new_first_name} {req.new_middle_name} {req.new_last_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" noWrap title={req.reason}>
                            {req.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.6}>
                            <Chip
                              label={(req.didit_status || "not_started").replace("_", " ").toUpperCase()}
                              size="small"
                              variant="outlined"
                              color={getDiditColor(req.didit_status)}
                            />
                            <Typography variant="caption" color="text.secondary" noWrap
                              title={req.doc_full_name || `${req.doc_first_name || ""} ${req.doc_last_name || ""}`.trim()}
                            >
                              Doc: {req.doc_full_name
                                ? req.doc_full_name
                                : `${req.doc_first_name || ""} ${req.doc_last_name || ""}`.trim() || "—"}
                            </Typography>
                            {req.didit_status === "approved" ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={req.name_match_passed ? "NAME MATCH: PASS" : "NAME MATCH: FAIL"}
                                color={req.name_match_passed ? "success" : "error"}
                              />
                            ) : (
                              <Chip size="small" variant="outlined" label="NAME MATCH: N/A" color="default" />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={req.status.toUpperCase()}
                            size="small"
                            color={getStatusColor(req.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {req.status === "pending" ? (
                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                              <Tooltip title="Approve">
                                <IconButton color="success" size="small" onClick={() => handleOpenAction(req, "approved")}>
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton color="error" size="small" onClick={() => handleOpenAction(req, "rejected")}>
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View details">
                                <IconButton size="small" onClick={() => openDetails(req)}>
                                  <InfoIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {req.decided_at ? new Date(req.decided_at).toLocaleDateString() : "Decided"}
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
      </TabPanel>

      {/* Tab 2: KYC Verifications */}
      <TabPanel value={tabValue} index={1}>
        {/* Filter Chips */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="All"
              onClick={() => setKycStatusFilter("all")}
              color={kycStatusFilter === "all" ? "primary" : "default"}
              variant={kycStatusFilter === "all" ? "filled" : "outlined"}
            />
            <Chip
              label="Not Started"
              onClick={() => setKycStatusFilter("not_started")}
              color={kycStatusFilter === "not_started" ? "default" : "default"}
              variant={kycStatusFilter === "not_started" ? "filled" : "outlined"}
            />
            <Chip
              label="Pending"
              onClick={() => setKycStatusFilter("pending")}
              color={kycStatusFilter === "pending" ? "info" : "default"}
              variant={kycStatusFilter === "pending" ? "filled" : "outlined"}
            />
            <Chip
              label="Review"
              onClick={() => setKycStatusFilter("review")}
              color={kycStatusFilter === "review" ? "warning" : "default"}
              variant={kycStatusFilter === "review" ? "filled" : "outlined"}
            />
            <Chip
              label="Approved"
              onClick={() => setKycStatusFilter("approved")}
              color={kycStatusFilter === "approved" ? "success" : "default"}
              variant={kycStatusFilter === "approved" ? "filled" : "outlined"}
            />
            <Chip
              label="Declined"
              onClick={() => setKycStatusFilter("declined")}
              color={kycStatusFilter === "declined" ? "error" : "default"}
              variant={kycStatusFilter === "declined" ? "filled" : "outlined"}
            />
          </Stack>
        </Box>

        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <TableContainer>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>KYC Status</TableCell>
                  <TableCell>Decline Reason</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingKyc ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton variant="text" width={160} /><Skeleton variant="text" width={120} /></TableCell>
                      <TableCell><Skeleton variant="text" width={180} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={120} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={150} /></TableCell>
                      <TableCell><Skeleton variant="text" width={100} /></TableCell>
                      <TableCell align="right"><Skeleton variant="rounded" width={120} height={32} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {kycVerifications.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No KYC verifications found.
                        </TableCell>
                      </TableRow>
                    )}
                    {kycVerifications.map((verification) => (
                      <TableRow key={verification.user_id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar
                              src={verification.user_image_url}
                              sx={{ width: 40, height: 40 }}
                            >
                              {(verification.first_name || verification.username || "U")[0].toUpperCase()}
                            </Avatar>
                            <Box>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="body2" fontWeight={500}>
                                  {`${verification.first_name || ""} ${verification.last_name || ""}`.trim() || verification.username || `User #${verification.user_id}`}
                                </Typography>
                                {verification.kyc_status === "approved" && (
                                  <Tooltip title="Identity Verified">
                                    <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />
                                  </Tooltip>
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {verification.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {verification.full_name || `${verification.first_name} ${verification.last_name}`.trim()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(verification.kyc_status || "not_started").replace("_", " ").toUpperCase()}
                            size="small"
                            color={getKYCStatusColor(verification.kyc_status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {verification.kyc_decline_reason ? verification.kyc_decline_reason.replace("_", " ") : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {verification.kyc_didit_last_webhook_at
                              ? new Date(verification.kyc_didit_last_webhook_at).toLocaleDateString()
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {["pending", "review", "declined"].includes(verification.kyc_status) ? (
                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                              <Tooltip title="Approve">
                                <IconButton
                                  color="success"
                                  size="small"
                                  onClick={() => handleOpenKycAction(verification, "approved")}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Decline">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleOpenKycAction(verification, "declined")}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reset Process">
                                <IconButton
                                  color="warning"
                                  size="small"
                                  onClick={() => handleOpenKycAction(verification, "reset")}
                                >
                                  <RestartAltIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {verification.legal_name_verified_at
                                ? new Date(verification.legal_name_verified_at).toLocaleDateString()
                                : "—"}
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
      </TabPanel>

      {/* Name Change Decision Dialog */}
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

      {/* KYC Action Dialog */}
      <Dialog open={kycActionDialog.open} onClose={handleCloseKycAction} fullWidth maxWidth="xs">
        <DialogTitle>
          {kycActionDialog.action === "reset"
            ? "Reset KYC Process"
            : kycActionDialog.action === "approved"
              ? "Approve KYC"
              : "Decline KYC"}
        </DialogTitle>
        <DialogContent dividers>
          {kycError && <Alert severity="error" sx={{ mb: 2 }}>{kycError}</Alert>}
          <Typography variant="body2" paragraph>
            {kycActionDialog.action === "reset"
              ? "This will reset the KYC process for this user. They will be able to start a new verification."
              : `You are about to ${kycActionDialog.action === "approved" ? "approve" : "decline"} this user's KYC verification.`}
          </Typography>
          {kycActionDialog.action === "approved" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This will lock the user's legal name and mark them as verified.
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
            placeholder="Reason for action..."
            value={kycAdminNote}
            onChange={(e) => setKycAdminNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseKycAction} disabled={kycProcessing}>Cancel</Button>
          <Button
            onClick={submitKycAction}
            variant="contained"
            color={
              kycActionDialog.action === "reset"
                ? "warning"
                : kycActionDialog.action === "approved"
                  ? "success"
                  : "error"
            }
            disabled={kycProcessing}
          >
            {kycProcessing ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog (Name Change) */}
      <Dialog open={detailsDialog.open} onClose={closeDetails} fullWidth maxWidth="sm">
        <DialogTitle>Name Change Review</DialogTitle>
        <DialogContent dividers>
          {detailsDialog.request && (
            <Stack spacing={2}>
              <Alert severity="info">
                Compare requested name with Didit document-extracted name.
              </Alert>
              <Box>
                <Typography variant="subtitle2">Current Name (Old)</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailsDialog.request.old_first_name} {detailsDialog.request.old_middle_name} {detailsDialog.request.old_last_name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Requested Name</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {detailsDialog.request.new_first_name} {detailsDialog.request.new_middle_name} {detailsDialog.request.new_last_name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Didit Doc Name (Extracted)</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailsDialog.request.doc_full_name
                    ? detailsDialog.request.doc_full_name
                    : `${detailsDialog.request.doc_first_name || ""} ${detailsDialog.request.doc_last_name || ""}`.trim() || "—"}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`DIDIT: ${(detailsDialog.request.didit_status || "not_started").toUpperCase()}`}
                  variant="outlined"
                  color={getDiditColor(detailsDialog.request.didit_status)}
                />
                <Chip
                  size="small"
                  label={`REQUEST: ${detailsDialog.request.status?.toUpperCase()}`}
                  color={getStatusColor(detailsDialog.request.status)}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    detailsDialog.request.didit_status === "approved"
                      ? (detailsDialog.request.name_match_passed ? "NAME MATCH: PASS" : "NAME MATCH: FAIL")
                      : "NAME MATCH: N/A"
                  }
                  color={
                    detailsDialog.request.didit_status === "approved"
                      ? (detailsDialog.request.name_match_passed ? "success" : "error")
                      : "default"
                  }
                />
                {detailsDialog.request.auto_approved && (
                  <Chip size="small" color="success" label="AUTO-APPROVED" />
                )}
              </Stack>
              <Box>
                <Typography variant="subtitle2">Match Debug (for admin)</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50", overflow: "auto" }}>
                  <pre style={{ margin: 0, fontSize: 12 }}>
                    {JSON.stringify(detailsDialog.request.name_match_debug || {}, null, 2)}
                  </pre>
                </Paper>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}