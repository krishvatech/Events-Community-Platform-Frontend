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
  Grid,
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
import { Link as RouterLink, useNavigate, useSearchParams } from "#navigation";
import AdminEmptyState from "../../components/admin/AdminEmptyState.jsx";
import AdminStatusChip from "../../components/admin/AdminStatusChip.jsx";
import BlogCard from "../../components/blogs/BlogCard.jsx";
import BlogTaxonomyManager from "../../components/blogs/BlogTaxonomyManager.jsx";
import WordPressImportPanel from "../../components/blogs/WordPressImportPanel.jsx";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import blogApi from "../../services/blogApi";
import { BLOG_CARD_PAGE_SIZE, totalPagesFor } from "../../services/blogService";
import {
  NEW_BLOG_PATH,
  blogDetailPath,
  editBlogPath,
  previewBlogPath,
} from "../../config/blogNavigation";
import { getBlogStatusMeta } from "../../utils/blogContent";
import { blogPrimaryButtonSx } from "../../components/blogs/blogTheme";
import { colors, focus, radii, shadows, semanticColors } from "../../styles/designTokens";

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
    <AdminStatusChip
      status={status}
      label={meta.label}
      color={meta.color}
      variant={status === "published" ? "filled" : "outlined"}
      data-testid="blog-status"
    />
  );
}

// WordPress source statuses shown as secondary metadata (publish needs no badge).
const WP_SOURCE_LABELS = { draft: "WordPress draft", pending: "WordPress pending", future: "WordPress scheduled", private: "WordPress private" };

function AdminBadges({ blog }) {
  const source = WP_SOURCE_LABELS[blog.wp_status];
  return (
    <>
      <BlogStatusChip status={blog.status} />
      {blog.wp_membership_restricted && (
        <Chip label="WP members-only" size="small" variant="outlined" color="warning" data-testid="blog-members-only" />
      )}
      {source && <Chip label={source} size="small" variant="outlined" data-testid="blog-wp-source" />}
    </>
  );
}

function AdminActions({ blog, busy, onConfirm }) {
  const isPublished = blog.status === "published";
  const actionSx = {
    minWidth: 40,
    minHeight: 40,
    borderRadius: `${radii.field}px`,
    "&:focus-visible": { outline: `${focus.width}px solid ${focus.color}`, outlineOffset: focus.offset },
  };
  return (
    <>
      {isPublished ? (
        <Tooltip title="View published blog">
          <IconButton size="small" component={RouterLink} to={blogDetailPath(blog.slug)} aria-label={`View ${blog.title}`} sx={actionSx}>
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Preview draft">
          <IconButton size="small" component={RouterLink} to={previewBlogPath(blog.id)} aria-label={`Preview ${blog.title}`} sx={actionSx}>
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Edit">
        <IconButton size="small" component={RouterLink} to={editBlogPath(blog.id)} aria-label={`Edit ${blog.title}`} sx={actionSx}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {isPublished ? (
        <Tooltip title="Unpublish">
          <span>
            <IconButton size="small" disabled={busy} onClick={() => onConfirm({ action: "unpublish", blog })} aria-label={`Unpublish ${blog.title}`} sx={actionSx}>
              <UnpublishedRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Tooltip title="Publish">
          <span>
            <IconButton size="small" color="success" disabled={busy} onClick={() => onConfirm({ action: "publish", blog })} aria-label={`Publish ${blog.title}`} sx={actionSx}>
              <PublishRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </>
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
        if (cancelled) return;
        // The page no longer exists (e.g. the last item left a filtered view).
        if (err.status === 404 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
          return;
        }
        setError({ status: err.status, message: err.message });
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
  const totalPages = totalPagesFor(data?.count, BLOG_CARD_PAGE_SIZE);
  const filtered = Boolean(status || debouncedSearch);

  if (error?.status === 403) {
    return <Alert severity="error">You do not have permission to manage blogs.</Alert>;
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <WordPressImportPanel onFinished={() => setReloadKey((k) => k + 1)} />
      <Paper
        component="section"
        aria-label="Blog filters and actions"
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(240px, 1fr) 180px auto" },
          gap: 1.5,
          alignItems: "center",
          borderColor: semanticColors.border,
          borderRadius: `${radii.card}px`,
          bgcolor: semanticColors.surface,
          boxShadow: shadows.sm,
        }}
      >
        <TextField
          size="small"
          label="Search blogs"
          placeholder="Search blogs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputProps={{ "aria-label": "Search blogs" }}
          InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "var(--imaa-dm-text-hint, #9e9e9e)" }} /> }}
          fullWidth
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${radii.field}px` } }}
        />
        <FormControl size="small" sx={{ minWidth: 0, "& .MuiOutlinedInput-root": { borderRadius: `${radii.field}px` } }}>
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
          sx={{ width: { xs: "100%", sm: "auto" }, minHeight: 40, ...blogPrimaryButtonSx, borderRadius: `${radii.field}px` }}
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
        <AdminEmptyState
          title={filtered ? "No blogs match these filters." : "No blogs yet. Create the first one."}
          titleComponent="h2"
          icon={<AddRoundedIcon />}
          action={!filtered ? (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate(NEW_BLOG_PATH)} sx={{ ...blogPrimaryButtonSx, borderRadius: `${radii.field}px` }}>
              Create Blog
            </Button>
          ) : null}
          sx={{ boxShadow: shadows.sm }}
        />
      ) : (
        <Grid container spacing={{ xs: 2, md: 2.5 }} data-testid="admin-blog-grid" aria-label="Blogs" sx={{ minWidth: 0 }}>
          {blogs.map((blog) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={blog.id}>
              <BlogCard
                post={blog}
                variant="admin"
                href={blog.status === "published" ? blogDetailPath(blog.slug) : previewBlogPath(blog.id)}
                badges={<AdminBadges blog={blog} />}
                actions={<AdminActions blog={blog} busy={pendingId === blog.id} onConfirm={setConfirm} />}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {!error && totalPages > 1 && (
        <Stack sx={{ mt: 3, alignItems: "center", overflowX: "auto", pb: 0.5 }}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} color="primary" disabled={loading} sx={{ minWidth: "max-content" }} />
        </Stack>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth aria-labelledby="blog-action-dialog-title" PaperProps={{ sx: { m: 1.5, borderRadius: `${radii.popup}px` } }}>
        <DialogTitle id="blog-action-dialog-title" sx={{ color: semanticColors.text, fontWeight: 750 }}>{confirm?.action === "publish" ? "Publish blog?" : "Unpublish blog?"}</DialogTitle>
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
    <Box className="ecp-admin-blogs" sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto", width: "100%", minWidth: 0 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 2, color: semanticColors.text }}>
        My Blogs
      </Typography>

      <Tabs
        value={tab}
        onChange={(_e, value) => setSearchParams(value === "blogs" ? {} : { tab: value })}
        aria-label="Blog management sections"
        sx={{ mb: 2, borderBottom: 1, borderColor: semanticColors.border, minHeight: 44 }}
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
