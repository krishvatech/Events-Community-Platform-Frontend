// src/pages/AdminNameRequestsPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  Chip,
  Avatar,
  Container,
  Skeleton
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

// Helpers
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access") || "";
}

const TEAL = "#14b8b1";

// --- Skeleton Component (Table Row) ---
function NameRequestSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Stack spacing={0.5}>
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton variant="text" width={140} height={16} />
        </Stack>
      </TableCell>
      <TableCell><Skeleton variant="text" width={120} /></TableCell>
      <TableCell><Skeleton variant="text" width={120} /></TableCell>
      <TableCell><Skeleton variant="text" width={150} /></TableCell>
      <TableCell><Skeleton variant="text" width={80} /></TableCell>
      <TableCell><Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 4 }} /></TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Skeleton variant="rounded" width={60} height={30} />
          <Skeleton variant="rounded" width={80} height={30} />
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default function AdminNameRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [userInitial, setUserInitial] = useState("A");

  // Filter States
  const [tabValue, setTabValue] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  const visibleItems = useMemo(() => {
    return requests.slice(0, visibleCount);
  }, [requests, visibleCount]);

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
      } catch (e) { }
    };
    fetchMe();
  }, []);

  // 2. Fetch Requests
  const fetchRequests = async () => {
    setInitialLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (tabValue !== "all") params.append("status", tabValue);
      if (searchText) params.append("search", searchText);
      
      if (sortOrder === "newest") {
        params.append("ordering", "-created_at");
      } else {
        params.append("ordering", "created_at");
      }

      // Fetch a larger batch for infinite scroll list feel
      params.append("page_size", 100);

      const res = await fetch(`${API_BASE}/auth/admin/name-requests/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.results || (Array.isArray(data) ? data : []);
        setRequests(list);
        setVisibleCount(15); // Reset scroll position on new fetch
      } else {
        setRequests([]); 
      }
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [tabValue, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchRequests();
    }, 500); 
    return () => clearTimeout(timer);
  }, [searchText]);

  // --- Intersection Observer ---
  useEffect(() => {
    if (isLoadingMore || visibleCount >= requests.length || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          // Fake delay for smooth UX
          setTimeout(() => {
            setVisibleCount((prev) => prev + 10);
            setIsLoadingMore(false);
          }, 500);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isLoadingMore, visibleCount, requests.length]);


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
        // Optimistic update locally
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status } : r));
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
      {initialLoading ? (
        // 1. SKELETON LOADING STATE
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
                <NameRequestSkeleton />
                <NameRequestSkeleton />
                <NameRequestSkeleton />
                <NameRequestSkeleton />
                <NameRequestSkeleton />
              </TableBody>
           </Table>
        </TableContainer>

      ) : requests.length === 0 ? (
        // 2. EMPTY STATE
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-8 text-center">
          <Typography color="text.secondary" fontWeight={500}>No requests found.</Typography>
        </Paper>
      ) : (
        // 3. TABLE DATA + INFINITE SCROLL
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
              {visibleItems.map((row) => (
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

              {/* 4. INFINITE SCROLL TRIGGER (Inside Tbody) */}
              {requests.length > visibleCount && (
                <TableRow ref={observerTarget}>
                  <TableCell colSpan={7} sx={{ border: 0, p: 2 }}>
                    {isLoadingMore && (
                        <Stack alignItems="center">
                           <Skeleton variant="text" width="40%" height={30} />
                        </Stack>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}