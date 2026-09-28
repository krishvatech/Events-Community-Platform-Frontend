import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import UnpublishedRoundedIcon from "@mui/icons-material/UnpublishedRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import BlogTaxonomyManager from "../../components/blogs/BlogTaxonomyManager.jsx";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import blogApi from "../../services/blogApi";
import { totalPagesFor } from "../../services/blogService";
import {
  NEW_BLOG_PATH,
  blogDetailPath,
  editBlogPath,
  previewBlogPath,
} from "../../config/blogNavigation";
import { formatBlogDate, getBlogAuthorName, getBlogStatusMeta } from "../../utils/blogContent";
import { blogPrimaryButtonSx } from "../../components/blogs/blogTheme";

const TABS = ["blogs", "categories", "tags"];

// Stable references so the taxonomy manager does not refetch on every render.
const categoryApi = {
  list: (params) => blogApi.listBlogCategories(params),
  create: (payload) => blogApi.createBlogCategory(payload),
  update: (id, payload) => blogApi.updateBlogCategory(id, payload),
};
const tagApi = {
  list: (params) => blogApi.listBlogTags(params),
  create: (payload) => blogApi.createBlogTag(payload),
  update: (id, payload) => blogApi.updateBlogTag(id, payload),
};

export function BlogStatusChip({ status }) {
  const meta = getBlogStatusMeta(status);
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size="small"
      variant={status === "published" ? "filled" : "outlined"}
      data-testid="blog-status"
    />
  );
}

function BlogsTab({ onNotify }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, message }
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { action, blog }

  useEffect(() => setPage(1), [status, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    blogApi
      .listAdminBlogs({ page, status, search: debouncedSearch })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError({ status: err.status, message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, debouncedSearch, reloadKey]);

  const runAction = useCallback(async () => {
    if (!confirm || pendingId) return;
    const { action, blog } = confirm;
    setConfirm(null);
    setPendingId(blog.id);
    try {
      if (action === "publish") {
        await blogApi.publishBlog(blog.id);
        onNotify(`“${blog.title}” is now published.`, "success");
      } else {
        await blogApi.unpublishBlog(blog.id);
        onNotify(`“${blog.title}” was unpublished and moved to drafts.`, "success");
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      const detail = Object.values(err.fieldErrors || {})[0];
      onNotify(detail || err.message, "error");
    } finally {
      setPendingId(null);
    }
  }, [confirm, onNotify, pendingId]);

  const blogs = data?.results || [];
  const totalPages = totalPagesFor(data?.count);
  const filtered = Boolean(status || debouncedSearch);

  if (error?.status === 403) {
    return <Alert severity="error">You do not have permission to manage blogs.</Alert>;
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search blogs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ "aria-label": "Search blogs" }}
          InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "grey.500" }} /> }}
          sx={{ minWidth: { xs: "100%", sm: 240 } }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="blog-status-filter-label">Status</InputLabel>
          <Select
            labelId="blog-status-filter-label"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => navigate(NEW_BLOG_PATH)}
          sx={{ ml: { sm: "auto" }, ...blogPrimaryButtonSx }}
        >
          Create Blog
        </Button>
      </Paper>

      <Box sx={{ minHeight: 4, mb: 1 }}>{loading && data && <LinearProgress aria-label="Loading blogs" />}</Box>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          }
        >
          {error.message}
        </Alert>
      ) : loading && !data ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress aria-label="Loading blogs" />
        </Box>
      ) : blogs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ mb: filtered ? 0 : 2 }}>
            {filtered ? "No blogs match these filters." : "No blogs yet. Create the first one."}
          </Typography>
          {!filtered && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate(NEW_BLOG_PATH)} sx={blogPrimaryButtonSx}>
              Create Blog
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: "auto" }}>
          <Table size="small" aria-label="Blogs">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" } }}>Author</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }}>Published</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", lg: "table-cell" } }}>Updated</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", lg: "table-cell" } }}>Categories</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blogs.map((blog) => {
                const isPublished = blog.status === "published";
                const busy = pendingId === blog.id;
                return (
                  <TableRow key={blog.id} hover data-testid="admin-blog-row">
                    <TableCell sx={{ maxWidth: 360, overflowWrap: "anywhere", fontWeight: 600 }}>{blog.title}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {getBlogAuthorName(blog) || "—"}
                    </TableCell>
                    <TableCell>
                      <BlogStatusChip status={blog.status} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap" }}>
                      {formatBlogDate(blog.published_at) || "—"}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, whiteSpace: "nowrap" }}>
                      {formatBlogDate(blog.updated_at) || "—"}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                      {(blog.categories || []).map((c) => c.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {isPublished ? (
                        <Tooltip title="View published blog">
                          <IconButton
                            size="small"
                            component={RouterLink}
                            to={blogDetailPath(blog.slug)}
                            aria-label={`View ${blog.title}`}
                          >
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Preview draft">
                          <IconButton
                            size="small"
                            component={RouterLink}
                            to={previewBlogPath(blog.id)}
                            aria-label={`Preview ${blog.title}`}
                          >
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          component={RouterLink}
                          to={editBlogPath(blog.id)}
                          aria-label={`Edit ${blog.title}`}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isPublished ? (
                        <Tooltip title="Unpublish">
                          <span>
                            <IconButton
                              size="small"
                              disabled={busy}
                              onClick={() => setConfirm({ action: "unpublish", blog })}
                              aria-label={`Unpublish ${blog.title}`}
                            >
                              <UnpublishedRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Publish">
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={busy}
                              onClick={() => setConfirm({ action: "publish", blog })}
                              aria-label={`Publish ${blog.title}`}
                            >
                              <PublishRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!error && totalPages > 1 && (
        <Stack sx={{ mt: 3, alignItems: "center" }}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} color="primary" disabled={loading} />
        </Stack>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm?.action === "publish" ? "Publish blog?" : "Unpublish blog?"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm?.action === "publish"
              ? `“${confirm?.blog.title}” will become visible to every member in Explore Blogs.`
              : `“${confirm?.blog.title}” will be removed from Explore Blogs and moved back to drafts. Its original publication date is kept.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={confirm?.action === "publish" ? "success" : "warning"}
            onClick={runAction}
          >
            {confirm?.action === "publish" ? "Publish" : "Unpublish"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function MyBlogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "blogs";
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

  const notify = useCallback((msg, type = "success") => setToast({ open: true, type, msg }), []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
        My Blogs
      </Typography>

      <Tabs
        value={tab}
        onChange={(_e, value) => setSearchParams(value === "blogs" ? {} : { tab: value })}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab label="Blogs" value="blogs" sx={{ textTransform: "none", fontWeight: 700 }} />
        <Tab label="Categories" value="categories" sx={{ textTransform: "none", fontWeight: 700 }} />
        <Tab label="Tags" value="tags" sx={{ textTransform: "none", fontWeight: 700 }} />
      </Tabs>

      {tab === "blogs" && <BlogsTab onNotify={notify} />}
      {tab === "categories" && (
        <BlogTaxonomyManager api={categoryApi} singular="Category" plural="Categories" onNotify={notify} />
      )}
      {tab === "tags" && <BlogTaxonomyManager api={tagApi} singular="Tag" plural="Tags" onNotify={notify} />}

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.type === "error" ? "error" : "success"}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
