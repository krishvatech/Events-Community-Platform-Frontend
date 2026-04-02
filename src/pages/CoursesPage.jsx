// src/pages/CoursesPage.jsx
// IMAA LMS course integration page.
// Shows the user's enrolled courses (synced via Edwiser Bridge) and a full course catalogue.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Stack,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const PAGE_SIZE = 9;

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// Decode HTML entities and strip tags (Moodle returns HTML-encoded text)
function stripHtml(html) {
  if (!html) return "";
  const txt = html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
  return txt.trim();
}

// Decode HTML entities in plain text fields (course names, category names)
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ── Course card shared between tabs ──────────────────────────────────────────

function CourseCard({ course, enrollment = null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();

  const progress = enrollment?.progress ?? null;
  const completed = enrollment?.completed ?? false;
  const imageUrl = !imgFailed && (enrollment?.image_url || course?.image_url) || null;
  const name = decodeEntities(enrollment?.full_name || course?.full_name || "");
  const category = decodeEntities(enrollment?.category_name || course?.category_name || null);
  const courseUrl = enrollment?.course_url || course?.course_url || "#";
  // For enrolled courses, navigate to in-platform player; for catalogue, open in LMS
  const playerPath = enrollment?.course_id ? `/account/courses/${enrollment.course_id}` : null;

  return (
    <Card
      elevation={0}
      className="flex flex-col rounded-2xl border border-slate-200 overflow-hidden"
      sx={{
        borderRadius: 2,
        height: "100%",
        transition: "box-shadow 0.2s, border-color 0.2s",
        "&:hover": { boxShadow: 2, borderColor: "primary.light" },
      }}
    >
      {/* Image: 16:9 aspect ratio with consistent sizing */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          "@supports not (aspect-ratio: 1 / 1)": { height: 180 },
          bgcolor: "#E5E7EB",
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#E5E7EB",
            }}
          >
            <SchoolRoundedIcon sx={{ fontSize: 52, color: "#9CA3AF" }} />
          </Box>
        )}
      </Box>

      {/* Content area */}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
        {/* Category + Status row */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          {category && (
            <Chip
              label={category}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, height: 24 }}
            />
          )}
          {progress !== null && completed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "success.main" }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight={600}>
                Done
              </Typography>
            </Box>
          )}
        </Box>

        {/* Course name: 2-line clamp */}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "#111827",
            fontSize: { xs: 15, sm: 16 },
            minHeight: "3em",
          }}
        >
          {name}
        </Typography>

        {/* Progress bar (enrolled courses only) */}
        {progress !== null && !completed && (
          <Box sx={{ mt: 0.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                Progress
              </Typography>
              <Typography variant="caption" fontWeight={600} color="primary.main" sx={{ fontSize: 12 }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              color="primary"
              sx={{ height: 5, borderRadius: 10 }}
            />
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Launch button */}
        {playerPath ? (
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate(playerPath)}
            sx={{
              textTransform: "none",
              borderRadius: 1.5,
              fontSize: 13,
              fontWeight: 600,
            }}
            fullWidth
          >
            {completed ? "Review" : "Continue"}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            endIcon={<OpenInNewRoundedIcon fontSize="small" />}
            href={courseUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textTransform: "none",
              borderRadius: 1.5,
              fontSize: 13,
              fontWeight: 600,
            }}
            fullWidth
          >
            Open in LMS
          </Button>
        )}
      </Box>
    </Card>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function CourseCardSkeleton() {
  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      <Skeleton variant="rectangular" height={160} />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Skeleton width="40%" height={24} />
        <Skeleton width="90%" height={20} />
        <Skeleton width="70%" height={20} />
        <Skeleton width="100%" height={36} sx={{ mt: 2, borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
}

// ── My Courses tab ────────────────────────────────────────────────────────────

function MyCoursesTab() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [page, setPage] = useState(1);

  const fetchEnrollments = useCallback(async () => {
    try {
      const data = await apiFetch("/courses/my-courses/");
      setEnrollments(Array.isArray(data) ? data : (data?.results ?? []));
      setError(null);
    } catch (e) {
      setError("Could not load your courses. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch("/courses/my-courses/refresh/", { method: "POST" });
      setSnack("Syncing your courses from Moodle… refresh in a moment.");
      // Re-fetch after short delay to pick up newly synced data
      setTimeout(() => fetchEnrollments(), 3000);
    } catch {
      setRefreshing(false);
      setSnack("Sync failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          autoRows: "1fr",
          gap: 2,
        }}
      >
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <Box key={i}>
            <CourseCardSkeleton />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {enrollments.length === 0 ? "No courses found" : `${enrollments.length} course${enrollments.length !== 1 ? "s" : ""} enrolled`}
        </Typography>
        <Tooltip title="Sync from IMAA LMS">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={refreshing ? <CircularProgress size={14} /> : <RefreshRoundedIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {refreshing ? "Syncing…" : "Refresh"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {enrollments.length === 0 && !error ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <SchoolRoundedIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No courses enrolled yet
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Your IMAA courses will appear here once enrolled.
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              autoRows: "1fr",
              gap: 2,
            }}
          >
            {enrollments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((enrollment) => (
              <Box key={enrollment.id}>
                <CourseCard enrollment={enrollment} />
              </Box>
            ))}
          </Box>
          {Math.ceil(enrollments.length / PAGE_SIZE) > 1 && (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={Math.ceil(enrollments.length / PAGE_SIZE)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert>
      </Snackbar>
    </>
  );
}

// ── Course Catalogue tab ──────────────────────────────────────────────────────

function CourseCatalogueTab() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      apiFetch("/courses/"),
      apiFetch("/courses/categories/"),
    ])
      .then(([coursesData, catsData]) => {
        setCourses(Array.isArray(coursesData) ? coursesData : (coursesData?.results ?? []));
        setCategories(Array.isArray(catsData) ? catsData : []);
        setPage(1); // Reset to first page on initial load
      })
      .catch(() => setError("Could not load course catalogue."))
      .finally(() => setLoading(false));
  }, []);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory]);

  const filtered = courses.filter((c) => {
    const matchSearch = !search || c.full_name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || String(c.category) === String(selectedCategory);
    return matchSearch && matchCat;
  });

  // Only show top-level categories (parent_moodle_id = 0 or null) for the filter
  const topCategories = categories.filter((c) => !c.parent_moodle_id || c.parent_moodle_id === 0);

  if (loading) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          autoRows: "1fr",
          gap: 2,
        }}
      >
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <Box key={i}>
            <CourseCardSkeleton />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <>
      {/* Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
        />
        <Select
          size="small"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          displayEmpty
          startAdornment={<FilterListRoundedIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Categories</MenuItem>
          {topCategories.map((cat) => (
            <MenuItem key={cat.moodle_id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {filtered.length} course{filtered.length !== 1 ? "s" : ""}
        {search || selectedCategory ? " matching filters" : " available"}
      </Typography>

      {filtered.length === 0 && !error ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <SchoolRoundedIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No courses found</Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              autoRows: "1fr",
              gap: 2,
            }}
          >
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((course) => (
              <Box key={course.id}>
                <CourseCard course={course} />
              </Box>
            ))}
          </Box>
          {Math.ceil(filtered.length / PAGE_SIZE) > 1 && (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={Math.ceil(filtered.length / PAGE_SIZE)}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          My Courses & Trainings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your IMAA courses synced via Edwiser Bridge. Click "Continue" to open a course in the platform.
        </Typography>
      </Box>

      <Divider sx={{ mb: 0 }} />

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="My Courses" sx={{ textTransform: "none", fontWeight: 600 }} />
        <Tab label="Course Catalogue" sx={{ textTransform: "none", fontWeight: 600 }} />
      </Tabs>

      {tab === 0 && <MyCoursesTab />}
      {tab === 1 && <CourseCatalogueTab />}
    </Container>
  );
}
