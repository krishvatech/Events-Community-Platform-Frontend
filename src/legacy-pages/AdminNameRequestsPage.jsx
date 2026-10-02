// src/pages/AdminNameRequestsPage.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  IconButton,
  Tooltip,
  Stack,
  Alert,
  Avatar,
  Skeleton,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  TablePagination,
  InputAdornment,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VerifiedIcon from "@mui/icons-material/Verified";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import HistoryIcon from '@mui/icons-material/History';
import {
  getAdminNameRequests,
  decideNameRequest,
  getAdminKYCVerifications,
  overrideKYCStatus,
  resetKYCProcess,
  manualApproveKYC,
  getVerificationRequests,
  decideVerificationRequest,
  getVerificationHistory // New API
} from "../utils/api";
import AdminTableShell from "../components/admin/AdminTableShell.jsx";
import AdminStatusChip from "../components/admin/AdminStatusChip.jsx";

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

// Returns the best display name for a user_details object.
// Priority: first+last name → full_name → username → "User"
const getUserDisplayName = (u) => {
  const name = `${u?.first_name || ""} ${u?.last_name || ""}`.trim();
  return name || u?.full_name || u?.username || "User";
};

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      id={`identity-tabpanel-${index}`}
      aria-labelledby={`identity-tab-${index}`}
      hidden={value !== index}
    >
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
  const [kycDetailsDialog, setKycDetailsDialog] = useState({ open: false, verification: null });

  // Manual Approval State
  const [manualApproveDialog, setManualApproveDialog] = useState({ open: false, user: null });
  const [manualProof, setManualProof] = useState(null);
  const [manualReason, setManualReason] = useState("");
  const [manualProcessing, setManualProcessing] = useState(false);
  const [manualError, setManualError] = useState("");

  // Pagination State - Name Requests
  const [requestsPage, setRequestsPage] = useState(0);
  const [requestsRowsPerPage, setRequestsRowsPerPage] = useState(8);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsSearch, setRequestsSearch] = useState("");

  // Pagination State - KYC
  const [kycPage, setKycPage] = useState(0);
  const [kycRowsPerPage, setKycRowsPerPage] = useState(8);
  const [kycTotal, setKycTotal] = useState(0);
  const [kycSearch, setKycSearch] = useState("");

  // Renewal Requests State
  const [renewalRequests, setRenewalRequests] = useState([]);
  const [loadingRenewals, setLoadingRenewals] = useState(true);
  const [renewalPage, setRenewalPage] = useState(0);
  const [renewalRowsPerPage, setRenewalRowsPerPage] = useState(8);
  const [renewalTotal, setRenewalTotal] = useState(0);
  const [renewalSearch, setRenewalSearch] = useState(""); // Renewal Actions
  const [renewalActionDialog, setRenewalActionDialog] = useState({ open: false, request: null, type: null });
  const [renewalNote, setRenewalNote] = useState("");
  const [renewalProcessing, setRenewalProcessing] = useState(false);

  // History Dialog
  const [historyDialog, setHistoryDialog] = useState({ open: false, userId: null, history: [], loading: false });

  const fetchHistory = async (userId) => {
    setHistoryDialog({ open: true, userId, history: [], loading: true });
    try {
      const data = await getVerificationHistory(userId);
      setHistoryDialog(prev => ({ ...prev, history: data, loading: false }));
    } catch (err) {
      console.error("Failed to fetch history", err);
      setHistoryDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const openKycDetails = (v) => setKycDetailsDialog({ open: true, verification: v });
  const closeKycDetails = () => setKycDetailsDialog({ open: false, verification: null });

  const openDetails = (req) => setDetailsDialog({ open: true, request: req });
  const closeDetails = () => setDetailsDialog({ open: false, request: null });

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const params = {
        ordering: "-created_at",
        page: requestsPage + 1, // API is 1-based
        page_size: requestsRowsPerPage
      };

      if (requestsSearch) {
        params.search = requestsSearch;
      }

      const data = await getAdminNameRequests(params);

      const list = data.results || (Array.isArray(data) ? data : []);
      const count = data.count || list.length;

      setRequests(list);
      setRequestsTotal(count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchKycVerifications = async () => {
    setLoadingKyc(true);
    try {
      const params = {
        ordering: "-kyc_didit_last_webhook_at",
        page: kycPage + 1,
        page_size: kycRowsPerPage
      };

      if (kycSearch) {
        params.search = kycSearch;
      }

      // Apply filter if not "all"
      if (kycStatusFilter !== "all") {
        params.kyc_status = kycStatusFilter;
      }
      const data = await getAdminKYCVerifications(params);

      const list = data.results || (Array.isArray(data) ? data : []);
      const count = data.count || list.length;

      setKycVerifications(list);
      setKycTotal(count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKyc(false);
    }
  };

  const fetchRenewalRequests = async () => {
    setLoadingRenewals(true);
    try {
      const params = {
        ordering: "-created_at",
        page: renewalPage + 1,
        page_size: renewalRowsPerPage,
      };
      if (renewalSearch) params.search = renewalSearch;

      const data = await getVerificationRequests(params);
      const list = data.results || (Array.isArray(data) ? data : []);
      setRenewalRequests(list);
      setRenewalTotal(data.count || list.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRenewals(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [requestsPage, requestsRowsPerPage, requestsSearch]);

  useEffect(() => {
    fetchKycVerifications();
  }, [kycStatusFilter, kycPage, kycRowsPerPage, kycSearch]);

  useEffect(() => {
    fetchRenewalRequests();
  }, [renewalPage, renewalRowsPerPage, renewalSearch]);

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

  const handleOpenManualApprove = (user) => {
    setManualApproveDialog({ open: true, user });
    setManualProof(null);
    setManualReason("");
    setManualError("");
  };

  const handleCloseManualApprove = () => {
    setManualApproveDialog({ open: false, user: null });
  };

  const submitManualApprove = async () => {
    if (!manualApproveDialog.user || !manualProof || !manualReason) {
      setManualError("Please provide both proof and a reason.");
      return;
    }

    setManualProcessing(true);
    setManualError("");
    try {
      const formData = new FormData();
      formData.append("proof", manualProof);
      formData.append("reason", manualReason);

      await manualApproveKYC(manualApproveDialog.user.user_id, formData);

      setKycVerifications((prev) =>
        prev.map((v) =>
          v.user_id === manualApproveDialog.user.user_id
            ? { ...v, kyc_status: "approved", admin_note: manualReason }
            : v
        )
      );
      handleCloseManualApprove();
    } catch (err) {
      setManualError(err.response?.data?.detail || "Failed to approve.");
    } finally {
      setManualProcessing(false);
    }
  };

  const submitRenewalDecision = async () => {
    if (!renewalActionDialog.request || !renewalActionDialog.type) return;
    setRenewalProcessing(true);
    try {
      await decideVerificationRequest(renewalActionDialog.request.id, renewalActionDialog.type, renewalNote);
      setRenewalRequests(prev => prev.map(r => r.id === renewalActionDialog.request.id ? { ...r, status: renewalActionDialog.type, admin_note: renewalNote } : r));
      setRenewalActionDialog({ open: false, request: null, type: null });
    } catch (e) {
      console.error(e);
      // maybe show error toast
    } finally {
      setRenewalProcessing(false);
    }
  };

  const handleRefresh = () => {
    if (tabValue === 0) {
      fetchRequests();
    } else if (tabValue === 1) {
      fetchKycVerifications();
    } else if (tabValue === 2) {
      fetchRenewalRequests();
    }
  };

  return (
    <Box sx={{ p: { xs: 0, sm: 1, md: 2 }, width: "100%", minWidth: 0, overflowX: "hidden" }}>
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
        <Avatar sx={{ bgcolor: "var(--imaa-teal)" }}>
          {("I")[0].toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" variant="h5" className="font-extrabold" sx={{ fontFamily: "var(--imaa-font-serif)", color: "var(--imaa-ink)" }}>
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
            sx={{ textTransform: "none", minHeight: 40, borderRadius: "var(--imaa-radius-field)" }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Identity verification sections"
        >
          <Tab id="identity-tab-0" aria-controls="identity-tabpanel-0" label="Name Change Requests" />
          <Tab id="identity-tab-1" aria-controls="identity-tabpanel-1" label="KYC Verifications" />
          <Tab id="identity-tab-2" aria-controls="identity-tabpanel-2" label="Renewal Requests" />
        </Tabs>
      </Box>

      {/* Tab 1: Name Change Requests */}
      <TabPanel value={tabValue} index={0}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search requests..."
            label="Search requests"
            variant="outlined"
            value={requestsSearch}
            onChange={(e) => setRequestsSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 250 } }}
          />
        </Stack>

        <AdminTableShell
          minWidth={900}
          pagination={(
            <TablePagination
              component="div"
              count={requestsTotal}
              page={requestsPage}
              onPageChange={(e, newPage) => setRequestsPage(newPage)}
              rowsPerPage={requestsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setRequestsRowsPerPage(parseInt(e.target.value, 10));
                setRequestsPage(0);
              }}
              rowsPerPageOptions={[8, 16, 24, 40]}
              sx={{ overflowX: "auto" }}
            />
          )}
        >
            <Table sx={{ minWidth: 800 }} aria-label="Name change requests" aria-busy={loadingRequests || undefined}>
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
                            <Avatar alt={`${req.first_name || ""} ${req.last_name || ""}`.trim() || req.username || "User"} sx={{ width: 40, height: 40 }}>
                              {(req.first_name || req.username || "U")[0].toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {`${req.first_name || ""} ${req.last_name || ""}`.trim() || req.username || `User #${req.user}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
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
                            <AdminStatusChip
                              status={req.didit_status || "not_started"}
                              label={(req.didit_status || "not_started").replace("_", " ").toUpperCase()}
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
                          <AdminStatusChip
                            status={req.status}
                            label={req.status.toUpperCase()}
                            color={getStatusColor(req.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {req.status === "pending" ? (
                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                              <Tooltip title="Approve">
                                <IconButton color="success" size="small" aria-label={`Approve name change for ${req.email || req.username || `user ${req.user}`}`} onClick={() => handleOpenAction(req, "approved")} sx={{ minWidth: 40, minHeight: 40 }}>
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton color="error" size="small" aria-label={`Reject name change for ${req.email || req.username || `user ${req.user}`}`} onClick={() => handleOpenAction(req, "rejected")} sx={{ minWidth: 40, minHeight: 40 }}>
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View details">
                                <IconButton size="small" aria-label={`View name change details for ${req.email || req.username || `user ${req.user}`}`} onClick={() => openDetails(req)} sx={{ minWidth: 40, minHeight: 40 }}>
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
        </AdminTableShell>
      </TabPanel>

      {/* Tab 2: KYC Verifications */}
      <TabPanel value={tabValue} index={1}>
        {/* Filters & Search */}
        <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
            {/* Filter Chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label="All"
                onClick={() => setKycStatusFilter("all")}
                aria-pressed={kycStatusFilter === "all"}
                color={kycStatusFilter === "all" ? "primary" : "default"}
                variant={kycStatusFilter === "all" ? "filled" : "outlined"}
              />
              <Chip
                label="Not Started"
                onClick={() => setKycStatusFilter("not_started")}
                aria-pressed={kycStatusFilter === "not_started"}
                color={kycStatusFilter === "not_started" ? "default" : "default"}
                variant={kycStatusFilter === "not_started" ? "filled" : "outlined"}
              />
              <Chip
                label="Pending"
                onClick={() => setKycStatusFilter("pending")}
                aria-pressed={kycStatusFilter === "pending"}
                color={kycStatusFilter === "pending" ? "info" : "default"}
                variant={kycStatusFilter === "pending" ? "filled" : "outlined"}
              />
              <Chip
                label="Review"
                onClick={() => setKycStatusFilter("review")}
                aria-pressed={kycStatusFilter === "review"}
                color={kycStatusFilter === "review" ? "warning" : "default"}
                variant={kycStatusFilter === "review" ? "filled" : "outlined"}
              />
              <Chip
                label="Approved"
                onClick={() => setKycStatusFilter("approved")}
                aria-pressed={kycStatusFilter === "approved"}
                color={kycStatusFilter === "approved" ? "success" : "default"}
                variant={kycStatusFilter === "approved" ? "filled" : "outlined"}
              />
              <Chip
                label="Declined"
                onClick={() => setKycStatusFilter("declined")}
                aria-pressed={kycStatusFilter === "declined"}
                color={kycStatusFilter === "declined" ? "error" : "default"}
                variant={kycStatusFilter === "declined" ? "filled" : "outlined"}
              />
            </Stack>

            {/* Search Box */}
            <TextField
              size="small"
              placeholder="Search users..."
              label="Search users"
              variant="outlined"
              value={kycSearch}
              onChange={(e) => setKycSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: "100%", md: 250 } }}
            />
          </Stack>
        </Box>

        <AdminTableShell
          minWidth={860}
          pagination={(
            <TablePagination
              component="div"
              count={kycTotal}
              page={kycPage}
              onPageChange={(e, newPage) => setKycPage(newPage)}
              rowsPerPage={kycRowsPerPage}
              onRowsPerPageChange={(e) => {
                setKycRowsPerPage(parseInt(e.target.value, 10));
                setKycPage(0);
              }}
              rowsPerPageOptions={[8, 16, 24, 40]}
              sx={{ overflowX: "auto" }}
            />
          )}
        >
            <Table sx={{ minWidth: 800 }} aria-label="KYC verifications" aria-busy={loadingKyc || undefined}>
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
                          <Box
                            onClick={() => openKycDetails(verification)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openKycDetails(verification);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`View KYC details for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              cursor: "pointer",
                              "&:hover": { opacity: 0.8 },
                              "&:focus-visible": { outline: "var(--imaa-focus-width) solid var(--imaa-focus-color)", outlineOffset: "var(--imaa-focus-offset)" },
                            }}
                          >
                            <Avatar
                              src={verification.user_image_url}
                              alt={`${verification.first_name || ""} ${verification.last_name || ""}`.trim() || verification.username || "User"}
                              sx={{ width: 40, height: 40 }}
                            >
                              {(verification.first_name || verification.username || "U")[0].toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
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
                          <AdminStatusChip
                            status={verification.kyc_status || "not_started"}
                            label={(verification.kyc_status || "not_started").replace("_", " ").toUpperCase()}
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
                              <Tooltip title="Manual Approve">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  aria-label={`Manually approve KYC for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                  onClick={() => handleOpenManualApprove(verification)}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <CloudUploadIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Approve">
                                <IconButton
                                  color="success"
                                  size="small"
                                  aria-label={`Approve KYC for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                  onClick={() => handleOpenKycAction(verification, "approved")}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Decline">
                                <IconButton
                                  color="error"
                                  size="small"
                                  aria-label={`Decline KYC for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                  onClick={() => handleOpenKycAction(verification, "declined")}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reset Process">
                                <IconButton
                                  color="warning"
                                  size="small"
                                  aria-label={`Reset KYC for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                  onClick={() => handleOpenKycAction(verification, "reset")}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <RestartAltIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  aria-label={`View KYC details for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                  onClick={() => openKycDetails(verification)}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : (
                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                              {verification.kyc_status !== "approved" && (
                                <Tooltip title="Manual Approve">
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    aria-label={`Manually approve KYC for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                    onClick={() => handleOpenManualApprove(verification)}
                                    sx={{ minWidth: 40, minHeight: 40 }}
                                  >
                                    <CloudUploadIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
                                {verification.legal_name_verified_at
                                  ? new Date(verification.legal_name_verified_at).toLocaleDateString()
                                  : "—"}
                              </Typography>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  aria-label={`View KYC details for ${verification.email || verification.username || `user ${verification.user_id}`}`}
                                  onClick={() => openKycDetails(verification)}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
        </AdminTableShell>
      </TabPanel>

      {/* Tab 3: Renewal Requests */}
      <TabPanel value={tabValue} index={2}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search renewals..."
            label="Search renewals"
            variant="outlined"
            value={renewalSearch}
            onChange={(e) => setRenewalSearch(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
            sx={{ width: { xs: "100%", sm: 250 } }}
          />
        </Stack>
        <AdminTableShell
          minWidth={720}
          pagination={(
            <TablePagination
              component="div"
              count={renewalTotal}
              page={renewalPage}
              onPageChange={(e, p) => setRenewalPage(p)}
              rowsPerPage={renewalRowsPerPage}
              onRowsPerPageChange={(e) => { setRenewalRowsPerPage(parseInt(e.target.value, 10)); setRenewalPage(0); }}
              rowsPerPageOptions={[8, 16, 24]}
              sx={{ overflowX: "auto" }}
            />
          )}
        >
            <Table aria-label="Verification renewal requests" aria-busy={loadingRenewals || undefined}>
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingRenewals ? (
                  <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
                ) : (
                  <>
                    {renewalRequests.length === 0 && <TableRow><TableCell colSpan={5} align="center">No requests found.</TableCell></TableRow>}
                    {renewalRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar src={req.user_details?.avatar_url || req.user_details?.avatar || ""} alt={getUserDisplayName(req.user_details)}>
                              {getUserDisplayName(req.user_details)[0]?.toUpperCase() || "U"}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {getUserDisplayName(req.user_details)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                                {req.user_details?.username ? `@${req.user_details.username}` : req.user_details?.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="body2" noWrap title={req.reason}>{req.reason}</Typography>
                        </TableCell>
                        <TableCell>
                          <AdminStatusChip status={req.status} label={req.status.toUpperCase()} color={getStatusColor(req.status)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(req.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <IconButton size="small" aria-label={`View verification history for ${getUserDisplayName(req.user_details)}`} onClick={() => fetchHistory(req.user)} sx={{ minWidth: 40, minHeight: 40 }}>
                              <HistoryIcon />
                            </IconButton>
                            {req.status === 'pending' && (
                              <>
                                <IconButton color="success" size="small" aria-label={`Approve renewal for ${getUserDisplayName(req.user_details)}`} onClick={() => { setRenewalNote(""); setRenewalActionDialog({ open: true, request: req, type: "approved" }); }} sx={{ minWidth: 40, minHeight: 40 }}>
                                  <CheckCircleIcon />
                                </IconButton>
                                <IconButton color="error" size="small" aria-label={`Reject renewal for ${getUserDisplayName(req.user_details)}`} onClick={() => { setRenewalNote(""); setRenewalActionDialog({ open: true, request: req, type: "rejected" }); }} sx={{ minWidth: 40, minHeight: 40 }}>
                                  <CancelIcon />
                                </IconButton>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
        </AdminTableShell>
      </TabPanel>

      {/* Name Change Decision Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseAction} fullWidth maxWidth="xs" aria-labelledby="name-request-action-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="name-request-action-title">
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
      <Dialog open={kycActionDialog.open} onClose={handleCloseKycAction} fullWidth maxWidth="xs" aria-labelledby="kyc-action-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="kyc-action-title">
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
      <Dialog open={detailsDialog.open} onClose={closeDetails} fullWidth maxWidth="sm" aria-labelledby="name-review-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="name-review-title">Name Change Review</DialogTitle>
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
                <AdminStatusChip
                  status={detailsDialog.request.didit_status || "not_started"}
                  label={`DIDIT: ${(detailsDialog.request.didit_status || "not_started").toUpperCase()}`}
                  variant="outlined"
                  color={getDiditColor(detailsDialog.request.didit_status)}
                />
                <AdminStatusChip
                  status={detailsDialog.request.status}
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

      {/* KYC Details Dialog */}
      <Dialog open={kycDetailsDialog.open} onClose={closeKycDetails} fullWidth maxWidth="md" aria-labelledby="kyc-details-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="kyc-details-title">KYC Verification Details</DialogTitle>
        <DialogContent dividers>
          {kycDetailsDialog.verification && (
            <Stack spacing={3}>
              {/* Header Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}>
                <Avatar
                  src={kycDetailsDialog.verification.user_image_url}
                  alt={kycDetailsDialog.verification.full_name || kycDetailsDialog.verification.username || "User"}
                  sx={{ width: 64, height: 64 }}
                >
                  {(kycDetailsDialog.verification.first_name || "U")[0].toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6">
                    {kycDetailsDialog.verification.full_name || kycDetailsDialog.verification.username}
                  </Typography>
                  <AdminStatusChip
                    status={kycDetailsDialog.verification.kyc_status}
                    label={(kycDetailsDialog.verification.kyc_status || "").replace("_", " ").toUpperCase()}
                    color={getKYCStatusColor(kycDetailsDialog.verification.kyc_status)}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Manual Approval Details */}
              {kycDetailsDialog.verification.kyc_manual_approved_at && (
                <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main', bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon fontSize="small" /> Manual Verification Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Approved By</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {kycDetailsDialog.verification.kyc_manual_approved_by_full_name}
                        (@{kycDetailsDialog.verification.kyc_manual_approved_by_username})
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Date</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(kycDetailsDialog.verification.kyc_manual_approved_at).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Reason</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {kycDetailsDialog.verification.kyc_manual_reason}
                      </Typography>
                    </Grid>
                    {kycDetailsDialog.verification.kyc_manual_proof && (
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          size="small"
                          href={kycDetailsDialog.verification.kyc_manual_proof}
                          target="_blank"
                          startIcon={<VisibilityIcon />}
                        >
                          View Proof Document
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Status Checks */}
              {(() => {
                const payload = kycDetailsDialog.verification.kyc_didit_raw_payload || {};
                const decision = payload.decision || {};
                const liveness = decision.liveness || {};
                const idVerification = decision.id_verification || {};
                const faceMatch = decision.face_match || {};

                // Helper for score color
                const getScoreColor = (score) => {
                  if (!score) return 'text.secondary';
                  if (score >= 80) return 'success.main';
                  if (score >= 50) return 'warning.main';
                  return 'error.main';
                };

                return (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>Verification Checks</Typography>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={{ xs: 2, sm: 4 }}
                      divider={<Divider flexItem sx={{ display: { xs: "none", sm: "block" } }} />}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">Liveness</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: liveness.status === 'Approved' ? 'success.main' : 'error.main' }}>
                          {liveness.status || 'N/A'}
                        </Typography>
                        {liveness.score !== undefined && (
                          <Typography variant="caption" sx={{ color: getScoreColor(liveness.score) }}>
                            Score: {liveness.score.toFixed(1)}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Face Match</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: faceMatch.status === 'Approved' ? 'success.main' : 'error.main' }}>
                          {faceMatch.status || 'N/A'}
                        </Typography>
                        {faceMatch.score !== undefined && (
                          <Typography variant="caption" sx={{ color: getScoreColor(faceMatch.score) }}>
                            Score: {faceMatch.score.toFixed(1)}%
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">ID Document</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: idVerification.status === 'Approved' ? 'success.main' : 'error.main' }}>
                          {idVerification.status || 'N/A'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                );
              })()}

              {/* Document Details (Extracted) */}
              {(() => {
                const payload = kycDetailsDialog.verification.kyc_didit_raw_payload || {};
                const idv = payload.decision?.id_verification || {};

                // Defined fields to display
                const fields = [
                  { label: "Full Name", value: idv.full_name },
                  { label: "Date of Birth", value: idv.date_of_birth },
                  { label: "Age", value: idv.age },
                  { label: "Gender", value: idv.gender },
                  { label: "Nationality", value: idv.nationality },
                  { label: "Place of Birth", value: idv.place_of_birth },
                  { label: "Document Type", value: idv.document_type },
                  { label: "Document Number", value: idv.document_number },
                  { label: "Issue Date", value: idv.date_of_issue },
                  { label: "Expiration Date", value: idv.expiration_date },
                  { label: "Issuing State", value: idv.issuing_state_name || idv.issuing_state },
                ];

                return (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>Document Details</Typography>
                    <Grid container spacing={2}>
                      {fields.map((f, i) => (
                        <Grid item xs={6} sm={4} key={i}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {f.label}
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {f.value || "—"}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                );
              })()}


            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeKycDetails}>Close</Button>
        </DialogActions>
      </Dialog >

      {/* Manual Approve Dialog */}
      <Dialog open={manualApproveDialog.open} onClose={handleCloseManualApprove} fullWidth maxWidth="xs" aria-labelledby="manual-approval-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="manual-approval-title">Manual Identification Approval</DialogTitle>
        <DialogContent dividers>
          {manualError && <Alert severity="error" sx={{ mb: 2 }}>{manualError}</Alert>}

          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload proof of identity and provide a reason for manual approval.
            This will fully verify the user.
          </Typography>

          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ mb: 2, height: 56, borderStyle: 'dashed' }}
            startIcon={<CloudUploadIcon />}
          >
            {manualProof ? manualProof.name : "Upload Proof Document"}
            <input
              type="file"
              hidden
              onChange={(e) => setManualProof(e.target.files[0])}
            />
          </Button>

          <TextField
            label="Reason / Admin Note"
            fullWidth
            multiline
            rows={3}
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            placeholder="e.g. Verified via video call..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManualApprove} disabled={manualProcessing}>Cancel</Button>
          <Button
            onClick={submitManualApprove}
            variant="contained"
            color="primary"
            disabled={manualProcessing || !manualProof || !manualReason}
          >
            {manualProcessing ? "Approving..." : "Approve User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renewal Decision Dialog */}
      <Dialog open={renewalActionDialog.open} onClose={() => setRenewalActionDialog({ ...renewalActionDialog, open: false })} fullWidth maxWidth="xs" aria-labelledby="renewal-action-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="renewal-action-title">{renewalActionDialog.type === "approved" ? "Approve Renewal" : "Reject Renewal"}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            {renewalActionDialog.type === "approved"
              ? "Approving this request will RESET the user's current verified status and allow them to re-verify."
              : "Rejecting this request will keep the user's current status."}
          </Typography>
          <TextField
            label="Admin Note"
            fullWidth multiline rows={3}
            value={renewalNote}
            onChange={(e) => setRenewalNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewalActionDialog({ ...renewalActionDialog, open: false })}>Cancel</Button>
          <Button variant="contained" color={renewalActionDialog.type === "approved" ? "success" : "error"} onClick={submitRenewalDecision} disabled={renewalProcessing}>
            {renewalProcessing ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verification History Dialog */}
      <Dialog open={historyDialog.open} onClose={() => setHistoryDialog({ ...historyDialog, open: false })} fullWidth maxWidth="sm" aria-labelledby="verification-history-title" PaperProps={{ sx: { borderRadius: "var(--imaa-radius-card)", m: { xs: 2 } } }}>
        <DialogTitle id="verification-history-title">Verification History</DialogTitle>
        <DialogContent dividers>
          {historyDialog.loading ? (
            <Box role="status" aria-label="Loading verification history" sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
          ) : historyDialog.history.length === 0 ? (
            <Typography align="center" color="text.secondary">No history found.</Typography>
          ) : (
            <Stack spacing={2}>
              {historyDialog.history.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1} mb={1}>
                    <AdminStatusChip status={item.kyc_status} label={item.kyc_status.toUpperCase()} color={getStatusColor(item.kyc_status)} />
                    <Typography variant="caption" color="text.secondary">
                      Archived: {new Date(item.archived_at).toLocaleDateString()}
                    </Typography>
                  </Stack>
                  {item.kyc_manual_reason && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Note:</strong> {item.kyc_manual_reason}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    Archived By: {item.archived_by_details?.username || "System"}
                  </Typography>
                  {item.kyc_didit_raw_payload && Object.keys(item.kyc_didit_raw_payload).length > 0 && (
                    <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => openKycDetails({ ...item, verification: item, kyc_didit_raw_payload: item.kyc_didit_raw_payload })}>
                      View Details
                    </Button>
                  )}
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog({ ...historyDialog, open: false })}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box >
  );
}
