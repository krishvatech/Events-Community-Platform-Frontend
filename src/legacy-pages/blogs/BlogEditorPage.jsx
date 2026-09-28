import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import BlogContentEditor from "../../components/blogs/BlogContentEditor.jsx";
import { BlogArticleView } from "./BlogDetailPage.jsx";
import { BlogStatusChip } from "./MyBlogsPage.jsx";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import blogApi from "../../services/blogApi";
import { listAllPages } from "../../services/blogService";
import { MY_BLOGS_PATH, blogDetailPath, editBlogPath } from "../../config/blogNavigation";
import {
  blogToForm,
  emptyBlogForm,
  isBlogFormDirty,
  saveBlog,
  saveThenPublish,
  validateBlogForm,
  validateImageFile,
} from "../../utils/blogEditor";
import { formatBlogDate } from "../../utils/blogContent";
import { blogPrimaryButtonSx } from "../../components/blogs/blogTheme";

const actionSx = { textTransform: "none", fontWeight: 700, borderRadius: "10px" };

const FIELD_ORDER = [
  "title", "slug", "excerpt", "content_html", "featured_image", "author_id",
  "category_ids", "tag_ids", "seo_title", "seo_description", "canonical_url",
];

function AuthorPicker({ value, onChange, disabled, error }) {
  const [input, setInput] = useState("");
  const query = useDebouncedValue(input, 350);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2) {
      setOptions([]);
      return undefined;
    }
    setLoading(true);
    blogApi
      .searchBlogAuthors(query)
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <Autocomplete
      value={value}
      onChange={(_e, next) => onChange(next ? { id: next.id, full_name: next.full_name } : null)}
      inputValue={input}
      onInputChange={(_e, next) => setInput(next)}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(option) => option?.full_name || ""}
      noOptionsText={query.trim().length < 2 ? "Type at least 2 characters" : "No users found"}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.full_name}</Typography>
            {option.email && <Typography variant="caption" color="text.secondary">{option.email}</Typography>}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Author"
          error={Boolean(error)}
          helperText={error || "Optional. Search ECP members by name or email."}
        />
      )}
    />
  );
}

function TermPicker({ label, options, selectedIds, onChange, disabled, error, manageTab }) {
  const selected = options.filter((o) => selectedIds.includes(o.id));
  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      disabled={disabled}
      onChange={(_e, next) => onChange(next.map((o) => o.id))}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterSelectedOptions
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={Boolean(error)}
          helperText={
            error || (
              <>
                Optional.{" "}
                <Link component={RouterLink} to={`${MY_BLOGS_PATH}?tab=${manageTab}`} target="_blank" rel="noopener">
                  Manage {label.toLowerCase()}
                </Link>
              </>
            )
          }
        />
      )}
    />
  );
}

function FeaturedImageField({ currentUrl, form, setForm, disabled, error, onError }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!form.imageFile) {
      setPreviewUrl("");
      return undefined;
    }
    if (typeof URL === "undefined" || !URL.createObjectURL) return undefined;
    const url = URL.createObjectURL(form.imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  const shownUrl = previewUrl || (!form.clearImage ? currentUrl : "");

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      onError(problem);
      return;
    }
    onError("");
    setForm((f) => ({ ...f, imageFile: file, clearImage: false }));
  };

  return (
    <Box>
      <Typography component="p" sx={{ fontWeight: 700, mb: 1 }}>Featured image</Typography>
      {shownUrl ? (
        <Box
          component="img"
          src={shownUrl}
          alt="Featured image preview"
          sx={{ width: "100%", maxWidth: 480, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider", display: "block" }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">No featured image.</Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
        <Button variant="outlined" size="small" onClick={() => inputRef.current?.click()} disabled={disabled} sx={{ textTransform: "none" }}>
          {shownUrl ? "Replace image" : "Choose image"}
        </Button>
        {shownUrl && (
          <Button
            size="small"
            color="error"
            disabled={disabled}
            sx={{ textTransform: "none" }}
            onClick={() => setForm((f) => ({ ...f, imageFile: null, clearImage: Boolean(currentUrl) }))}
          >
            Remove image
          </Button>
        )}
        {form.clearImage && currentUrl && (
          <Button size="small" disabled={disabled} onClick={() => setForm((f) => ({ ...f, clearImage: false }))} sx={{ textTransform: "none" }}>
            Undo remove
          </Button>
        )}
      </Stack>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
        aria-label="Featured image file"
        data-testid="featured-image-input"
      />
      <Typography variant="caption" color={error ? "error" : "text.secondary"} sx={{ display: "block", mt: 0.5 }}>
        {error || "JPG, PNG, GIF or WebP, up to 10 MB."}
      </Typography>
    </Box>
  );
}

export default function BlogEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [blog, setBlog] = useState(null);
  const [form, setForm] = useState(emptyBlogForm);
  const [baseline, setBaseline] = useState(emptyBlogForm);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loadState, setLoadState] = useState(isEdit ? "loading" : "ready"); // loading | ready | notfound | forbidden | error
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(""); // "" | save | publish | unpublish
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [toast, setToast] = useState(() => location.state?.toast || null);

  // The toast handed over after "Save Draft" is one-shot: drop it from history.
  useEffect(() => {
    if (location.state?.toast) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const showPreview = searchParams.get("preview") === "1";
  const setPreview = (open) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("preview", "1");
    else next.delete("preview");
    setSearchParams(next, { replace: true });
  };

  const applyBlog = useCallback((data) => {
    const next = blogToForm(data);
    setBlog(data);
    setForm(next);
    setBaseline(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listAllPages((params) => blogApi.listBlogCategories(params))
      .then((rows) => !cancelled && setCategories(rows))
      .catch(() => {});
    listAllPages((params) => blogApi.listBlogTags(params))
      .then((rows) => !cancelled && setTags(rows))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    setLoadState("loading");
    blogApi
      .getAdminBlog(id)
      .then((data) => {
        if (cancelled) return;
        applyBlog(data);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404) setLoadState("notfound");
        else if (err.status === 403) setLoadState("forbidden");
        else {
          setLoadError(err.message);
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, applyBlog]);

  const dirty = isBlogFormDirty(form, baseline);
  const isPublished = blog?.status === "published";
  const disabled = Boolean(busy);

  const setField = (name) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((f) => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((errs) => ({ ...errs, [name]: "" }));
  };

  const showApiError = (err) => {
    const errors = err.fieldErrors || {};
    setFieldErrors(errors);
    const known = FIELD_ORDER.some((field) => errors[field]);
    setFormError(known ? "Please fix the highlighted fields." : err.message);
  };

  /** Validates and saves. Resolves to the saved blog, or null on failure. */
  const performSave = async () => {
    const errors = validateBlogForm(form, { isEdit });
    if (fieldErrors.featured_image) errors.featured_image = fieldErrors.featured_image;
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError("Please fix the highlighted fields.");
      return null;
    }
    setFieldErrors({});
    setFormError("");
    try {
      const saved = await saveBlog({ service: blogApi, id: isEdit ? id : null, form });
      return saved;
    } catch (err) {
      if (err.savedBlog && !isEdit) {
        navigate(editBlogPath(err.savedBlog.id), {
          replace: true,
          state: { toast: { type: "error", msg: `Draft saved, but the image could not be uploaded: ${err.message}` } },
        });
        return null;
      }
      if (err.savedBlog) applyBlog(err.savedBlog);
      showApiError(err);
      return null;
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy("save");
    const saved = await performSave();
    setBusy("");
    if (!saved) return;
    if (!isEdit) {
      navigate(editBlogPath(saved.id), { replace: true, state: { toast: { type: "success", msg: "Draft saved." } } });
      return;
    }
    applyBlog(saved);
    setToast({ type: "success", msg: "Changes saved." });
  };

  const handlePublish = async () => {
    if (busy || !isEdit) return;
    setBusy("publish");
    try {
      const published = await saveThenPublish({
        save: async () => {
          if (!dirty) return blog;
          const saved = await performSave();
          if (saved) applyBlog(saved);
          return saved;
        },
        publish: (blogId) => blogApi.publishBlog(blogId),
      });
      applyBlog(published);
      setToast({ type: "success", msg: "Blog published. It is now visible in Explore Blogs." });
    } catch (err) {
      if (err.fieldErrors) showApiError(err);
      // A failed save has already reported its own errors.
    } finally {
      setBusy("");
    }
  };

  const handleUnpublish = async () => {
    setConfirmUnpublish(false);
    if (busy || !isEdit) return;
    setBusy("unpublish");
    try {
      const updated = await blogApi.unpublishBlog(id);
      // Keep any unsaved edits; refresh only the server-owned state.
      setBlog(updated);
      setToast({ type: "success", msg: "Blog unpublished and moved to drafts." });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setBusy("");
    }
  };

  const previewPost = useMemo(
    () => ({
      ...(blog || {}),
      title: form.title || "Untitled blog",
      excerpt: form.excerpt,
      content_html: form.content_html,
      author: form.author,
      featured_image: form.imageFile ? "" : form.clearImage ? "" : blog?.featured_image,
      categories: categories.filter((c) => form.category_ids.includes(c.id)),
      tags: tags.filter((t) => form.tag_ids.includes(t.id)),
    }),
    [blog, form, categories, tags]
  );

  if (loadState === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Loading blog" />
      </Box>
    );
  }

  if (loadState !== "ready") {
    const message =
      loadState === "notfound"
        ? "This blog could not be found."
        : loadState === "forbidden"
        ? "You do not have permission to manage blogs."
        : loadError || "Unable to load this blog.";
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
        <Alert severity="error" sx={{ mb: 2 }}>{message}</Alert>
        <Button component={RouterLink} to={MY_BLOGS_PATH} startIcon={<ArrowBackRoundedIcon />}>
          Back to My Blogs
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Button component={RouterLink} to={MY_BLOGS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ textTransform: "none", mb: 1, px: 0 }}>
        My Blogs
      </Button>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {isEdit ? "Edit Blog" : "Create Blog"}
          </Typography>
          {isEdit && blog && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} useFlexGap flexWrap="wrap">
              <BlogStatusChip status={blog.status} />
              {blog.published_at && (
                <Typography variant="body2" color="text.secondary">
                  {isPublished ? "Published" : "First published"} {formatBlogDate(blog.published_at)}
                </Typography>
              )}
              {dirty && <Typography variant="body2" color="warning.main">Unsaved changes</Typography>}
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {isEdit && (
            <Button variant="outlined" onClick={() => setPreview(true)} disabled={disabled} sx={actionSx}>
              Preview
            </Button>
          )}
          {isEdit && isPublished && (
            <Button variant="outlined" component={RouterLink} to={blogDetailPath(blog.slug)} disabled={disabled} sx={actionSx}>
              View Published
            </Button>
          )}
          <Button variant="contained" onClick={handleSave} disabled={disabled} sx={blogPrimaryButtonSx}>
            {busy === "save" ? "Saving…" : isEdit ? "Save Changes" : "Save Draft"}
          </Button>
          {isEdit && !isPublished && (
            <Button variant="contained" color="success" onClick={handlePublish} disabled={disabled} sx={actionSx}>
              {busy === "publish" ? "Publishing…" : dirty ? "Save & Publish" : "Publish"}
            </Button>
          )}
          {isEdit && isPublished && (
            <Button variant="outlined" color="warning" onClick={() => setConfirmUnpublish(true)} disabled={disabled} sx={actionSx}>
              {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
            </Button>
          )}
        </Stack>
      </Stack>

      {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Stack spacing={3}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <TextField
                label="Title"
                required
                fullWidth
                value={form.title}
                onChange={setField("title")}
                error={Boolean(fieldErrors.title)}
                helperText={fieldErrors.title}
                disabled={disabled}
                inputProps={{ maxLength: 255 }}
              />
              <TextField
                label="Slug"
                fullWidth
                value={form.slug}
                onChange={setField("slug")}
                error={Boolean(fieldErrors.slug)}
                helperText={
                  fieldErrors.slug ||
                  (isEdit
                    ? "Changing the slug changes the article URL."
                    : "Optional. Leave blank to generate it from the title when you save.")
                }
                disabled={disabled}
                inputProps={{ maxLength: 255 }}
              />
              <TextField
                label="Excerpt"
                fullWidth
                multiline
                minRows={2}
                value={form.excerpt}
                onChange={setField("excerpt")}
                error={Boolean(fieldErrors.excerpt)}
                helperText={fieldErrors.excerpt || "Optional. Shown on blog cards."}
                disabled={disabled}
              />
              <BlogContentEditor
                value={form.content_html}
                onChange={setField("content_html")}
                disabled={disabled}
                error={fieldErrors.content_html}
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <FeaturedImageField
                currentUrl={blog?.featured_image || ""}
                form={form}
                setForm={setForm}
                disabled={disabled}
                error={fieldErrors.featured_image}
                onError={(msg) => setFieldErrors((errs) => ({ ...errs, featured_image: msg }))}
              />
              <AuthorPicker
                value={form.author}
                onChange={setField("author")}
                disabled={disabled}
                error={fieldErrors.author_id}
              />
              {!form.author && blog?.legacy_author_name && (
                <Typography variant="body2" color="text.secondary">
                  Historical author shown to readers: <strong>{blog.legacy_author_name}</strong>
                </Typography>
              )}
              <TermPicker
                label="Categories"
                options={categories}
                selectedIds={form.category_ids}
                onChange={setField("category_ids")}
                disabled={disabled}
                error={fieldErrors.category_ids}
                manageTab="categories"
              />
              <TermPicker
                label="Tags"
                options={tags}
                selectedIds={form.tag_ids}
                onChange={setField("tag_ids")}
                disabled={disabled}
                error={fieldErrors.tag_ids}
                manageTab="tags"
              />
            </Stack>
          </Paper>

          <Accordion
            disableGutters
            defaultExpanded={Boolean(form.seo_title || form.seo_description || form.canonical_url)}
          >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography sx={{ fontWeight: 700 }}>SEO (optional)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2.5}>
                <TextField
                  label="SEO title"
                  fullWidth
                  value={form.seo_title}
                  onChange={setField("seo_title")}
                  error={Boolean(fieldErrors.seo_title)}
                  helperText={fieldErrors.seo_title || "Defaults to the title."}
                  disabled={disabled}
                  inputProps={{ maxLength: 255 }}
                />
                <TextField
                  label="SEO description"
                  fullWidth
                  multiline
                  minRows={2}
                  value={form.seo_description}
                  onChange={setField("seo_description")}
                  error={Boolean(fieldErrors.seo_description)}
                  helperText={fieldErrors.seo_description || "Defaults to the excerpt."}
                  disabled={disabled}
                />
                <TextField
                  label="Canonical URL"
                  fullWidth
                  value={form.canonical_url}
                  onChange={setField("canonical_url")}
                  error={Boolean(fieldErrors.canonical_url)}
                  helperText={fieldErrors.canonical_url || "Optional. Only used when it points to this site."}
                  disabled={disabled}
                  inputProps={{ maxLength: 500 }}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </Box>

      <Dialog open={showPreview && isEdit} onClose={() => setPreview(false)} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>
          Preview{!isPublished && " — draft, not visible to members"}
        </DialogTitle>
        <DialogContent dividers>
          <BlogArticleView post={previewPost} backTo={null} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(false)}>Close preview</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmUnpublish} onClose={() => setConfirmUnpublish(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Unpublish blog?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It will be removed from Explore Blogs and moved back to drafts. Its original publication date is kept.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUnpublish(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleUnpublish}>
            Unpublish
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.type === "error" ? "error" : "success"} variant="filled" onClose={() => setToast(null)}>
            {toast.msg}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </Box>
  );
}
