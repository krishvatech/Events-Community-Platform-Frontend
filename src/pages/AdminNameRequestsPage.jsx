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
  Button,
  Stack,
  LinearProgress,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  Pagination,
  Chip,
  IconButton,
  Avatar,
  Container // ✅ Added Container
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

// Helpers
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access") || "";
}

const TEAL = "#14b8b1";

export default function AdminNameRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [userInitial, setUserInitial] = useState("A");

  // Filter States
  const [tabValue, setTabValue] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Fetch Current User
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me/`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          const name = data.first_name || data.username || "Admin";
          setUserInitial(name.charAt(0).toUpperCase());
        }
      } catch (e) {
        // Silent fail
      }
    };
    fetchMe();
  }, []);

  // 2. Fetch Requests
  const fetchRequests = async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (tabValue !== "all") params.append("status", tabValue);
      if (searchText) params.append("search", searchText);
      
      if (sortOrder === "newest") {
        params.append("ordering", "-created_at");
      } else {
        params.append("ordering", "created_at");
      }

      params.append("page", currentPage);

      // Make sure this URL matches your urls.py registry
      const res = await fetch(`${API_BASE}/auth/admin/name-requests/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results) {
            setRequests(data.results);
            const count = data.count || 0;
            const pageSize = 10; 
            setTotalPages(Math.ceil(count / pageSize) || 1);
        } else if (Array.isArray(data)) {
            setRequests(data);
            setTotalPages(1);
        }
      } else {
        // Fallback for empty/error state
        setRequests([]); 
      }
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchRequests(1);
  }, [tabValue, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(1); 
        fetchRequests(1);
    }, 500); 
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleDecide = async (id, status) => {
    if (processingId) return;
    setProcessingId(id);

    try {
      const res = await fetch(`${API_BASE}/auth/admin/name-requests/${id}/decide/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: status }),
      });

      if (res.ok) {
        fetchRequests(page); 
      } else {
        const json = await res.json();
        alert(json.detail || "Failed to update status");
      }
    } catch (e) {
      alert("Error connecting to server");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
        case 'approved': return <Chip label="Approved" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />;
        case 'rejected': return <Chip label="Rejected" size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 }} />;
        default: return <Chip label="Pending" size="small" sx={{ bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 700 }} />;
    }
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      className="pt-6 pb-6 sm:pt-1 sm:pb-8"
    >

      <Box
        className="mb-4"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: TEAL }}>{userInitial}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" className="font-extrabold">
            Identity Verification Requests
          </Typography>
          <Typography className="text-slate-500">
            Manage legal name change requests from users.
          </Typography>
        </Box>
      </Box>

      {/* TABS */}
      <Paper elevation={0} className="rounded-2xl border border-slate-200 mb-4">
        <Tabs 
            value={tabValue} 
            onChange={(e, v) => setTabValue(v)} 
            variant="scrollable"
            scrollButtons="auto"
            sx={{
                px: 1,
                "& .MuiTab-root": { textTransform: "none", minHeight: 46 },
                "& .Mui-selected": { color: TEAL + " !important", fontWeight: 700 },
                "& .MuiTabs-indicator": { backgroundColor: TEAL }
            }}
        >
          <Tab label="All" value="all" />
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Rejected" value="rejected" />
        </Tabs>
      </Paper>

      {/* SEARCH & FILTER */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="center" justifyContent="space-between">
        <TextField
            size="small"
            placeholder="Search requests..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: { xs: '100%', sm: 360 } }}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                ),
            }}
        />
        
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">Sort by:</Typography>
            <FormControl size="small">
                <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    sx={{ bgcolor: 'white', borderRadius: 2, minWidth: 140, height: 40 }}
                >
                    <MenuItem value="newest">Newest first</MenuItem>
                    <MenuItem value="oldest">Oldest first</MenuItem>
                </Select>
            </FormControl>
        </Stack>
      </Stack>

      {/* TABLE CONTENT */}
      {loading ? (
        <LinearProgress sx={{ color: TEAL }} />
      ) : requests.length === 0 ? (
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-8 text-center">
          <Typography color="text.secondary" fontWeight={500}>No requests found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} className="rounded-2xl border border-slate-200">
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>User Details</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Current Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Requested Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#475569', py: 2 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((row) => (
                <TableRow key={row.id} hover sx={{ '& td': { py: 2 } }}>
                  <TableCell>
                    <Stack>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">{row.username || "User"}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.email}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {row.old_first_name} {row.old_middle_name} {row.old_last_name}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {row.new_first_name} {row.new_middle_name} {row.new_last_name}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={row.reason} color="text.secondary">
                      {row.reason}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {new Date(row.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(row.status)}
                  </TableCell>
                  <TableCell align="right">
                    {row.status === 'pending' ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={processingId === row.id}
                            onClick={() => handleDecide(row.id, "rejected")}
                            sx={{ minWidth: 30, px: 1, borderColor: '#fecaca', color: '#dc2626', '&:hover': { bgcolor: '#fef2f2' } }}
                        >
                             REJECT
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            disabled={processingId === row.id}
                            onClick={() => handleDecide(row.id, "approved")}
                            startIcon={<CheckRoundedIcon />}
                            sx={{ 
                                bgcolor: '#16a34a', 
                                '&:hover': { bgcolor: '#15803d' },
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2
                            }}
                        >
                            APPROVE
                        </Button>
                        </Stack>
                    ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: '1px solid #e2e8f0' }}>
            <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(_, v) => { setPage(v); fetchRequests(v); }}
                color="primary" 
                shape="rounded"
                sx={{ '& .Mui-selected': { bgcolor: TEAL + ' !important', color: 'white' } }}
            />
          </Box>
        </TableContainer>
      )}
    </Container>
  );
}