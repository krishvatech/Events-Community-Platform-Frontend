import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import {
  createNewsletterTemplate,
  deleteNewsletterTemplate,
  duplicateNewsletterTemplate,
  getNewsletterTemplate,
  getNewsletterTemplateUsage,
  listNewsletterTemplateCategories,
  listNewsletterTemplateThemes,
  listNewsletterTemplateTokens,
  listNewsletterTemplates,
  previewNewsletterTemplate,
  updateNewsletterTemplate,
} from "../services/newsletterService";

const PAGE_SIZE = 25;

const starterHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family: Arial, sans-serif; color: #1B2A4A; background: #ffffff;">
  <tr>
    <td style="padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.25;">Newsletter headline</h1>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Write your reusable newsletter content here.</p>
    </td>
  </tr>
</table>`;

const starterPlainText = `Newsletter headline

Write your reusable newsletter content here.`;

const blankTemplate = {
  name: "",
  subject: "",
  preheaderText: "",
  fromName: "IMAA Connect",
  fromAddress: "eventncommunity@gmail.com",
  plainText: starterPlainText,
  customHtml: starterHtml,
  isPublished: false,
  category: "",
  template: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const templateToForm = (template) => ({
  name: template?.name || "",
  subject: template?.subject || "",
  preheaderText: template?.preheaderText || "",
  fromName: template?.fromName || "",
  fromAddress: template?.fromAddress || "",
  plainText: template?.plainText || "",
  customHtml: template?.customHtml || "",
  isPublished: Boolean(template?.isPublished),
  category: template?.category?.id || "",
  template: template?.template || "",
});

const tokenGroups = (tokens) =>
  (Array.isArray(tokens) ? tokens : []).reduce((groups, token) => {
    const group = token.group || "Tokens";
    return {
      ...groups,
      [group]: [...(groups[group] || []), token],
    };
  }, {});

function TemplateEditorDialog({
  open,
  mode,
  template,
  loading,
  saving,
  error,
  metadata,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(blankTemplate);
  const [formErrors, setFormErrors] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const htmlRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" ? templateToForm(template) : blankTemplate);
    setFormErrors({});
    setPreviewOpen(false);
  }, [open, mode, template]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSave = () => {
    const nextErrors = {};
    const name = form.name.trim();
    const subject = form.subject.trim();
    const fromAddress = form.fromAddress.trim();

    if (!name) nextErrors.name = "Template name is required.";
    if (!subject) nextErrors.subject = "Subject is required.";
    if (fromAddress && !emailPattern.test(fromAddress)) {
      nextErrors.fromAddress = "Enter a valid sender email.";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave({
      name,
      subject,
      preheaderText: form.preheaderText,
      fromName: form.fromName.trim(),
      fromAddress,
      plainText: form.plainText,
      customHtml: form.customHtml,
      isPublished: Boolean(form.isPublished),
      category: form.category,
      template: form.template,
    });
  };

  const insertToken = (token, field = "customHtml") => {
    if (!token) return;
    const ref = field === "plainText" ? textRef : htmlRef;
    const element = ref.current;
    const value = form[field] || "";
    const start = Number.isInteger(element?.selectionStart)
      ? element.selectionStart
      : value.length;
    const end = Number.isInteger(element?.selectionEnd)
      ? element.selectionEnd
      : value.length;
    setField(field, `${value.slice(0, start)}${token}${value.slice(end)}`);
    window.requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const groupedTokens = tokenGroups(metadata.tokens);

  return (
    <>
      <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {mode === "edit" ? "Edit Newsletter Template" : "Create Newsletter Template"}
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Stack spacing={1.5}>
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton variant="rectangular" height={260} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Template Name"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    error={Boolean(formErrors.name)}
                    helperText={formErrors.name || "Internal name shown in ECP and Mautic."}
                    fullWidth
                    required
                    disabled={saving}
                    inputProps={{ maxLength: 190 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Subject"
                    value={form.subject}
                    onChange={(event) => setField("subject", event.target.value)}
                    error={Boolean(formErrors.subject)}
                    helperText={formErrors.subject}
                    fullWidth
                    required
                    disabled={saving}
                    inputProps={{ maxLength: 190 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Preheader / Preview Text"
                    value={form.preheaderText}
                    onChange={(event) => setField("preheaderText", event.target.value)}
                    fullWidth
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Sender Name"
                    value={form.fromName}
                    onChange={(event) => setField("fromName", event.target.value)}
                    fullWidth
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Sender Email"
                    type="email"
                    value={form.fromAddress}
                    onChange={(event) => setField("fromAddress", event.target.value)}
                    error={Boolean(formErrors.fromAddress)}
                    helperText={formErrors.fromAddress}
                    fullWidth
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="HTML Content"
                    value={form.customHtml}
                    onChange={(event) => setField("customHtml", event.target.value)}
                    multiline
                    minRows={12}
                    fullWidth
                    disabled={saving}
                    helperText="Reusable HTML stored in the native Mautic email Template."
                    inputRef={htmlRef}
                  />
                </Grid>
                {Object.keys(groupedTokens).length > 0 && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderColor: "#E7ECEF" }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                        Mautic Tokens
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(groupedTokens).map(([group, tokens]) => (
                          <Box key={group}>
                            <Typography variant="caption" color="text.secondary">
                              {group}
                            </Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {tokens.slice(0, 16).map((token) => (
                                <Button
                                  key={token.token}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => insertToken(token.token)}
                                  sx={{ textTransform: "none", my: 0.25 }}
                                >
                                  {token.label}
                                </Button>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    label="Plain Text Fallback"
                    value={form.plainText}
                    onChange={(event) => setField("plainText", event.target.value)}
                    multiline
                    minRows={6}
                    fullWidth
                    disabled={saving}
                    inputRef={textRef}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Email Category"
                    value={form.category}
                    onChange={(event) => setField("category", event.target.value)}
                    fullWidth
                    disabled={saving}
                    helperText="Native Mautic email category."
                  >
                    <MenuItem value="">Uncategorized</MenuItem>
                    {metadata.categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.title || category.alias || `Category #${category.id}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Theme"
                    value={form.template}
                    onChange={(event) => setField("template", event.target.value)}
                    fullWidth
                    disabled={saving}
                    helperText="Native Mautic email theme metadata."
                  >
                    <MenuItem value="">No theme / custom HTML</MenuItem>
                    {metadata.themes.map((theme) => (
                      <MenuItem key={theme.key} value={theme.key}>
                        {theme.name || theme.key}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isPublished}
                      onChange={(event) => setField("isPublished", event.target.checked)}
                      disabled={saving}
                    />
                  }
                  label={form.isPublished ? "Published" : "Draft / Unpublished"}
                />
                <Button
                  startIcon={<PreviewRoundedIcon />}
                  onClick={() => setPreviewOpen(true)}
                  disabled={saving}
                  sx={{ textTransform: "none" }}
                >
                  Preview HTML
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : mode === "edit" ? "Save Changes" : "Create Template"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Template Preview</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">From</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {form.fromName || "-"} {form.fromAddress ? `<${form.fromAddress}>` : ""}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Subject</Typography>
              <Typography sx={{ fontWeight: 700 }}>{form.subject || "-"}</Typography>
              {form.preheaderText && (
                <Typography color="text.secondary">{form.preheaderText}</Typography>
              )}
            </Box>
            <Paper
              variant="outlined"
              sx={{ height: 420, overflow: "hidden", borderRadius: 2 }}
            >
              <iframe
                title="Newsletter Template HTML preview"
                sandbox=""
                srcDoc={form.customHtml || "<p>No HTML content available.</p>"}
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  background: "white",
                }}
              />
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function TemplatePreviewDialog({ open, loading, template, error, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Newsletter Template Preview</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack spacing={1.5}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton variant="rectangular" height={360} />
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {template?.name || "Newsletter Template"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={template?.isPublished ? "Published" : "Draft"}
                  color={template?.isPublished ? "success" : "default"}
                  variant={template?.isPublished ? "filled" : "outlined"}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">From</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {template?.fromName || "-"} {template?.fromAddress ? `<${template.fromAddress}>` : ""}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Subject</Typography>
              <Typography sx={{ fontWeight: 700 }}>{template?.subject || "-"}</Typography>
              {template?.preheaderText && (
                <Typography color="text.secondary">{template.preheaderText}</Typography>
              )}
            </Box>
            <Paper
              variant="outlined"
              sx={{ height: 420, overflow: "hidden", borderRadius: 2 }}
            >
              <iframe
                title="Saved Newsletter Template preview"
                sandbox=""
                srcDoc={template?.customHtml || "<p>No HTML content available.</p>"}
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                  background: "white",
                }}
              />
            </Paper>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterTemplatesPanel() {
  const [data, setData] = useState({
    count: 0,
    page: 1,
    page_size: PAGE_SIZE,
    num_pages: 0,
    results: [],
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState({
    open: false,
    mode: "create",
    template: null,
    loading: false,
    saving: false,
    error: "",
  });
  const [preview, setPreview] = useState({
    open: false,
    loading: false,
    template: null,
    error: "",
  });
  const [deleteState, setDeleteState] = useState({
    open: false,
    template: null,
    loading: false,
    usage: null,
    error: "",
  });
  const [metadata, setMetadata] = useState({
    tokens: [],
    categories: [],
    themes: [],
  });
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const loadTemplates = useCallback(
    async ({ nextPage = page, nextSearch = search } = {}) => {
      setLoading(true);
      setError("");
      try {
        const response = await listNewsletterTemplates({
          page: nextPage,
          page_size: PAGE_SIZE,
          ...(nextSearch ? { search: nextSearch } : {}),
        });
        const normalized = {
          count: Number(response?.count || 0),
          page: Number(response?.page || nextPage),
          page_size: Number(response?.page_size || PAGE_SIZE),
          num_pages: Number(response?.num_pages || 0),
          results: Array.isArray(response?.results) ? response.results : [],
        };
        setData(normalized);
        setPage(normalized.page || 1);
      } catch (err) {
        setData({
          count: 0,
          page: nextPage,
          page_size: PAGE_SIZE,
          num_pages: 0,
          results: [],
        });
        setError(getErrorMessage(err, "We could not load Mautic Newsletter Templates."));
      } finally {
        setLoading(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    loadTemplates({ nextPage: page, nextSearch: search });
  }, [page, search]);

  useEffect(() => {
    let cancelled = false;
    async function loadMetadata() {
      try {
        const [tokenData, categoryData, themeData] = await Promise.all([
          listNewsletterTemplateTokens(),
          listNewsletterTemplateCategories(),
          listNewsletterTemplateThemes(),
        ]);
        if (cancelled) return;
        setMetadata({
          tokens: Array.isArray(tokenData?.results) ? tokenData.results : [],
          categories: Array.isArray(categoryData?.results) ? categoryData.results : [],
          themes: Array.isArray(themeData?.results) ? themeData.results : [],
        });
      } catch (err) {
        if (!cancelled) setMetadata({ tokens: [], categories: [], themes: [] });
      }
    }
    loadMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (page !== 1) setPage(1);
    setSearch(nextSearch);
    if (page === 1 && nextSearch === search) {
      loadTemplates({ nextPage: 1, nextSearch });
    }
  };

  const openCreate = () => {
    setEditor({
      open: true,
      mode: "create",
      template: null,
      loading: false,
      saving: false,
      error: "",
    });
  };

  const openEdit = async (templateId) => {
    setEditor({
      open: true,
      mode: "edit",
      template: null,
      loading: true,
      saving: false,
      error: "",
    });
    try {
      const response = await previewNewsletterTemplate(templateId);
      const template = response?.template || response;
      setEditor({
        open: true,
        mode: "edit",
        template,
        loading: false,
        saving: false,
        error: "",
      });
    } catch (err) {
      setEditor((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(err, "We could not load this Template."),
      }));
    }
  };

  const duplicateTemplate = async (template) => {
    if (!template?.id) return;
    try {
      await duplicateNewsletterTemplate(template.id);
      setSnack({
        open: true,
        severity: "success",
        message: "Template duplicated as a draft.",
      });
      await loadTemplates({ nextPage: page, nextSearch: search });
    } catch (err) {
      setSnack({
        open: true,
        severity: "error",
        message: getErrorMessage(err, "We could not duplicate this Template."),
      });
    }
  };

  const openDelete = async (template) => {
    setDeleteState({
      open: true,
      template,
      loading: true,
      usage: null,
      error: "",
    });
    try {
      const usage = await getNewsletterTemplateUsage(template.id);
      setDeleteState({
        open: true,
        template,
        loading: false,
        usage,
        error: "",
      });
    } catch (err) {
      setDeleteState({
        open: true,
        template,
        loading: false,
        usage: null,
        error: getErrorMessage(err, "Template usage could not be checked."),
      });
    }
  };

  const saveTemplate = async (payload) => {
    setEditor((current) => ({ ...current, saving: true, error: "" }));
    try {
      await (
        editor.mode === "edit"
          ? updateNewsletterTemplate(editor.template.id, payload)
          : createNewsletterTemplate(payload)
      );

      setEditor({
        open: false,
        mode: "create",
        template: null,
        loading: false,
        saving: false,
        error: "",
      });
      setSnack({
        open: true,
        severity: "success",
        message: editor.mode === "edit" ? "Template updated." : "Template created.",
      });
      await loadTemplates({ nextPage: page, nextSearch: search });
    } catch (err) {
      setEditor((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(err, "We could not save this Template."),
      }));
    }
  };

  const openPreview = async (templateId) => {
    setPreview({
      open: true,
      loading: true,
      template: null,
      error: "",
    });
    try {
      const template = await getNewsletterTemplate(templateId);
      setPreview({
        open: true,
        loading: false,
        template,
        error: "",
      });
    } catch (err) {
      setPreview({
        open: true,
        loading: false,
        template: null,
        error: getErrorMessage(err, "Template preview is unavailable."),
      });
    }
  };

  const confirmDelete = async () => {
    const templateId = deleteState.template?.id;
    if (!templateId || deleteState.loading) return;

    setDeleteState((current) => ({ ...current, loading: true, error: "" }));
    try {
      await deleteNewsletterTemplate(templateId);
      setDeleteState({
        open: false,
        template: null,
        loading: false,
        usage: null,
        error: "",
      });
      setSnack({
        open: true,
        severity: "success",
        message: "Template deleted from Mautic.",
      });

      const nextPage =
        data.results.length === 1 && page > 1 ? Math.max(1, page - 1) : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadTemplates({ nextPage, nextSearch: search });
      }
    } catch (err) {
      setDeleteState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(err, "We could not delete this Template."),
      }));
    }
  };

  const rows = Array.isArray(data.results) ? data.results : [];
  const totalPages = Math.max(1, Number(data.num_pages || 1));

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
            Newsletter Templates
          </Typography>
          <Typography color="text.secondary">
            Create and manage reusable Mautic email Templates without leaving ECP.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh from Mautic">
            <span>
              <IconButton
                onClick={() => loadTemplates({ nextPage: page, nextSearch: search })}
                disabled={loading}
              >
                <RefreshRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreate}
            sx={{ textTransform: "none" }}
          >
            Create Template
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth. Only reusable Mautic emails with
        <strong> emailType=template</strong> are shown here; newsletter campaign delivery
        emails are excluded.
      </Alert>

      <Paper
        component="form"
        onSubmit={submitSearch}
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, borderColor: "#E7ECEF" }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Search Templates"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Name or subject"
            fullWidth
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<SearchRoundedIcon />}
            disabled={loading}
            sx={{ textTransform: "none", minWidth: 112 }}
          >
            Search
          </Button>
          {search && (
            <Button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              disabled={loading}
              sx={{ textTransform: "none" }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" action={
          <Button
            color="inherit"
            size="small"
            onClick={() => loadTemplates({ nextPage: page, nextSearch: search })}
          >
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : rows.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 3, borderRadius: 2, borderColor: "#E7ECEF" }}
        >
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography sx={{ fontWeight: 850, color: "#1B2A4A" }}>
              {search ? "No Templates match this search." : "No Newsletter Templates yet."}
            </Typography>
            <Typography color="text.secondary">
              {search
                ? "Try another search or clear the current filter."
                : "Create the first reusable email Template. It will be stored directly in Mautic."}
            </Typography>
            {!search && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={openCreate}
                sx={{ textTransform: "none" }}
              >
                Create Template
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {rows.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  borderColor: "#E7ECEF",
                  minHeight: 245,
                  height: "100%",
                }}
              >
                <Stack spacing={2} height="100%">
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                    alignItems="flex-start"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 850,
                          color: "#1B2A4A",
                          wordBreak: "break-word",
                        }}
                      >
                        {template.name || `Template #${template.id}`}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, wordBreak: "break-word" }}
                      >
                        {template.subject || "No subject"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={template.isPublished ? "Published" : "Draft"}
                      color={template.isPublished ? "success" : "default"}
                      variant={template.isPublished ? "filled" : "outlined"}
                      sx={{ fontWeight: 800, flexShrink: 0 }}
                    />
                  </Stack>

                  {template.preheaderText && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {template.preheaderText}
                    </Typography>
                  )}

                  <Box sx={{ mt: "auto" }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Type: {template.emailType || "template"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Category: {template.category?.title || "Uncategorized"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Theme: {template.template || "Custom HTML"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Sender: {template.fromName || "-"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Updated: {formatDateTime(template.dateModified || template.dateAdded)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Preview">
                      <IconButton onClick={() => openPreview(template.id)}>
                        <PreviewRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEdit(template.id)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate">
                      <IconButton onClick={() => duplicateTemplate(template)}>
                        <ContentCopyRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test send requires a verified Mautic test-send bridge">
                      <span>
                        <IconButton disabled>
                          <EmailRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => openDelete(template)}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && data.count > 0 && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            {data.count} Template{data.count === 1 ? "" : "s"} · Page {page} of {totalPages}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              sx={{ textTransform: "none" }}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              sx={{ textTransform: "none" }}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      <TemplateEditorDialog
        open={editor.open}
        mode={editor.mode}
        template={editor.template}
        loading={editor.loading}
        saving={editor.saving}
        error={editor.error}
        metadata={metadata}
        onClose={() =>
          setEditor({
            open: false,
            mode: "create",
            template: null,
            loading: false,
            saving: false,
            error: "",
          })
        }
        onSave={saveTemplate}
      />

      <TemplatePreviewDialog
        open={preview.open}
        loading={preview.loading}
        template={preview.template}
        error={preview.error}
        onClose={() =>
          setPreview({
            open: false,
            loading: false,
            template: null,
            error: "",
          })
        }
      />

      <Dialog
        open={deleteState.open}
        onClose={deleteState.loading ? undefined : () =>
          setDeleteState({
            open: false,
            template: null,
            loading: false,
            usage: null,
            error: "",
          })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Newsletter Template?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {deleteState.error && <Alert severity="error">{deleteState.error}</Alert>}
            {deleteState.loading ? (
              <Skeleton height={54} />
            ) : deleteState.usage?.available === false ? (
              <Alert severity="warning" variant="outlined">
                Mautic REST does not expose template dependency usage here. Delete
                will be attempted through Mautic, and provider validation remains the guard.
              </Alert>
            ) : null}
            <Typography>
              Delete <strong>{deleteState.template?.name || "this Template"}</strong> from
              native Mautic?
            </Typography>
            <Alert severity="warning" variant="outlined">
              This permanently deletes the provider Template. Campaign history is separate,
              but do not delete a Template that another Mautic automation still relies on.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteState({
                open: false,
                template: null,
                loading: false,
                usage: null,
                error: "",
              })
            }
            disabled={deleteState.loading}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteState.loading}
          >
            {deleteState.loading ? <CircularProgress size={20} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
