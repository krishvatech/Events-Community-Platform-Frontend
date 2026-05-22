import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Avatar,
  Typography,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";

const isVerifiedStatus = (raw) => {
  const v = String(raw || "").toLowerCase();
  return v === "approved" || v === "verified";
};

export default function ParticipantsAttendanceTable({
  eventId,
  event,
  token,
  apiRoot,
}) {
  const [filterTab, setFilterTab] = useState(0); // 0=All, 1=Joined, 2=Replay, 3=NoShow
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  const tabFilterMap = {
    0: null, // All
    1: "joined_live",
    2: "watched_replay",
    3: "did_not_attend",
  };

  const computeStats = useMemo(() => {
    const stats = {
      total: 0,
      joinedLive: 0,
      watchedReplay: 0,
      didNotAttend: 0,
    };

    registrations.forEach((reg) => {
      stats.total += 1;
      if (reg.joined_live) {
        stats.joinedLive += 1;
      } else if (reg.watched_replay) {
        stats.watchedReplay += 1;
      } else {
        stats.didNotAttend += 1;
      }
    });

    return stats;
  }, [registrations]);

  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!token || !eventId) return;

      setLoading(true);
      setError("");

      try {
        const statusFilter = tabFilterMap[filterTab];
        let url = `${apiRoot}/event-registrations/?event=${eventId}&page=${page}`;
        if (statusFilter) {
          url += `&attendance_status=${statusFilter}`;
        }

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch registrations: ${res.status}`);
        }

        const data = await res.json();
        const results = data.results || data;
        setRegistrations(Array.isArray(results) ? results : []);

        // Calculate total pages from count and page size
        const pageSize = 20; // Default PAGE_SIZE from Django settings
        const totalCount = data.count || results.length;
        const calculatedTotalPages = Math.ceil(totalCount / pageSize) || 1;
        setTotalPages(calculatedTotalPages);
      } catch (err) {
        console.error("Error fetching registrations:", err);
        setError(err.message || "Failed to load participants");
        setRegistrations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [eventId, token, apiRoot, filterTab, page]);

  const handleTabChange = (event, newValue) => {
    setFilterTab(newValue);
    setPage(1);
  };

  const handleExportAttendance = async () => {
    if (!token || !eventId) {
      toast.error("Missing authentication or event information");
      return;
    }

    setExportLoading(true);
    try {
      const url = `${apiRoot}/events/${eventId}/export-registrations/`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename\s*=\s*"?([^";\n]+)"?/);
      const filename = nameMatch
        ? nameMatch[1].trim()
        : `participants_attendance_${eventId}.csv`;

      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objUrl);

      toast.success("Participants data exported successfully");
    } catch (err) {
      console.error("Error exporting participants:", err);
      toast.error(err.message || "Failed to export participants data");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Paper elevation={0} className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header with stats */}
      <Box className="p-6 bg-slate-50 border-b border-slate-200">
        <Box className="flex items-center justify-between mb-4">
          <Typography variant="h6" className="font-semibold">
            Participant Attendance
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={exportLoading}
            onClick={handleExportAttendance}
            startIcon={<FileDownloadRoundedIcon />}
            sx={{ textTransform: "none" }}
          >
            {exportLoading ? "Exporting…" : "Export CSV"}
          </Button>
        </Box>

        {/* Stats Cards */}
        <Box className="flex gap-4">
          <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
            <Typography variant="h4" className="font-bold text-slate-700">
              {computeStats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
          </Paper>
          <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
            <Typography variant="h4" className="font-bold text-green-600">
              {computeStats.joinedLive}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Joined Live
            </Typography>
          </Paper>
          <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
            <Typography variant="h4" className="font-bold text-blue-600">
              {computeStats.watchedReplay}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Watched Replay
            </Typography>
          </Paper>
          <Paper elevation={0} className="border border-slate-200 rounded-xl p-4 flex-1 text-center">
            <Typography variant="h4" className="font-bold text-slate-500">
              {computeStats.didNotAttend}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Did Not Attend
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Tabs and List */}
      <Box className="border-b border-slate-200">
        <Tabs
          value={filterTab}
          onChange={handleTabChange}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="All" />
          <Tab label="Joined Live" />
          <Tab label="Watched Replay" />
          <Tab label="Did Not Attend" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box className="flex-1 overflow-auto" sx={{ minHeight: "300px" }}>
        {loading ? (
          <Box className="flex justify-center items-center p-8">
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Alert severity="error" className="m-4">
            {error}
          </Alert>
        ) : registrations.length === 0 ? (
          <Box className="p-6 text-center text-slate-500">
            <Typography variant="body2">No participants found in this category.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id} hover>
                    <TableCell>
                      <Box className="flex items-center gap-2">
                        <Avatar
                          src={reg.user_avatar_url}
                          sx={{ width: 32, height: 32 }}
                        >
                          {(reg.user_name?.[0] || "U").toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" className="leading-tight">
                            {reg.user_name}
                            {isVerifiedStatus(
                              reg.user_kyc_status ||
                                reg.user?.kyc_status ||
                                reg.profile?.kyc_status ||
                                reg.kyc_status ||
                                ""
                            ) && (
                              <VerifiedIcon
                                sx={{
                                  fontSize: 14,
                                  color: "#22d3ee",
                                  ml: 0.5,
                                  verticalAlign: "middle",
                                }}
                              />
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" className="text-slate-600">
                        {reg.user_email}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box className="flex flex-col gap-1 items-end">
                        {reg.joined_live && (
                          <Chip
                            icon={<CheckCircleIcon style={{ fontSize: 14 }} />}
                            label="Live"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                        {reg.watched_replay && (
                          <Chip
                            icon={<PlayCircleOutlineRoundedIcon style={{ fontSize: 14 }} />}
                            label="Replay"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                        {!reg.joined_live && !reg.watched_replay && (
                          <Chip
                            label="Did Not Attend"
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && !loading && registrations.length > 0 && (
        <Box className="p-3 border-t border-slate-200 flex justify-center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            size="small"
            shape="rounded"
          />
        </Box>
      )}
    </Paper>
  );
}
