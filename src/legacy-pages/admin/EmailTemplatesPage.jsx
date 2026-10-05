import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import { renderToMjml } from "@templatical/renderer";

import AdminEmptyState from "../../components/admin/AdminEmptyState";
import TemplaticalEmailEditor from "../../components/admin/TemplaticalEmailEditor";
import { colors, focus, radii, shadows, semanticColors } from "../../styles/designTokens";
import {
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  resetEmailTemplate,
  saveEmailTemplate,
  sendTestEmail,
} from "../../services/emailTemplateService";

const extractError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Something went wrong.";
  if (typeof data === "string") {
    if (data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html")) {
      const titleMatch = data.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim();
      return title || "The backend returned an HTML error page. Check the server logs.";
    }
    return data;
  }
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join(" ");
};

const sourceLabel = (template) => {
  if (!template) return "";
  if (!template.is_active || template.status === "inactive") return "Inactive";
  if (template.source === "file_default") return "File default";
  if (template.source === "db") return "Customized";
  return template.source || "Global DB";
};

const sourceColor = (template) => {
  if (!template?.is_active || template?.status === "inactive") return "default";
  if (template?.source === "file_default") return "info";
  return "success";
};

const hasPlaceholder = (content, placeholder) => {
  const serialized = typeof content === "string" ? content : JSON.stringify(content || {});
  return serialized.includes(placeholder);
};

const getHtmlOnlyBody = (content) => {
  const blocks = Array.isArray(content?.blocks) ? content.blocks : [];
  if (!blocks.length) return "";
  if (!blocks.every((block) => block?.type === "html")) return "";
  return blocks.map((block) => block.content || "").join("\n");
};

const addRenderedBodyToPayload = async ({ payload, content, editorRef }) => {
  const htmlOnlyBody = getHtmlOnlyBody(content);
  if (htmlOnlyBody) {
    payload.html_body = htmlOnlyBody;
    return;
  }

  try {
    payload.mjml_body = await renderToMjml(content, { allowHtmlBlocks: true });
  } catch {
    payload.mjml_body = await editorRef.current?.toMjml();
  }
};

export default function EmailTemplatesPage() {
  const editorRef = useRef(null);
  const selectedKeyRef = useRef("");
  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({
    subject: "",
    text_body: "",
    notes: "",
    is_active: true,
  });
  const [editorContent, setEditorContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [preview, setPreview] = useState(null);
  const [inlinePreview, setInlinePreview] = useState(null);
  const [inlinePreviewLoading, setInlinePreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [error, setError] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);

  const showSnack = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listEmailTemplates();
      setTemplates(data);
      const nextKey = selectedKey || data?.[0]?.template_key || "";
      setSelectedKey(nextKey);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (key) => {
    if (!key) return;
    selectedKeyRef.current = key;
    setDetailLoading(true);
    setError("");
    setSelected(null);
    setInlinePreview(null);
    setEditorContent(null);
    setEditorDirty(false);
    try {
      const data = await getEmailTemplate(key);
      if (selectedKeyRef.current !== key) return;
      setSelected(data);
      setDraft({
        subject: data.subject || "",
        text_body: data.text_body || "",
        notes: data.notes || "",
        is_active: data.is_active !== false,
      });
      setEditorContent(data.editor_json || null);
      setEditorDirty(false);
      setEditorRevision((revision) => revision + 1);
      setInlinePreview(null);
      loadInlinePreview(data, key);
    } catch (err) {
      if (selectedKeyRef.current !== key) return;
      setError(extractError(err));
    } finally {
      if (selectedKeyRef.current === key) {
        setDetailLoading(false);
      }
    }
  };

  const loadInlinePreview = async (template, expectedKey = template?.template_key) => {
    if (!template?.template_key) return;
    setInlinePreviewLoading(true);
    try {
      const data = await previewEmailTemplate(template.template_key, {
        subject: template.subject,
        text_body: template.text_body,
      });
      if (selectedKeyRef.current !== expectedKey) return;
      setInlinePreview(data);
    } catch {
      if (selectedKeyRef.current !== expectedKey) return;
      setInlinePreview({
        rendered_subject: template.subject,
        rendered_html: template.html_body || "<p>Email preview is not available.</p>",
      });
    } finally {
      if (selectedKeyRef.current === expectedKey) {
        setInlinePreviewLoading(false);
      }
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    loadTemplate(selectedKey);
  }, [selectedKey]);

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(templates.map((t) => t.category).filter(Boolean))).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((template) => {
      const categoryMatch = category === "all" || template.category === category;
      const text = `${template.label} ${template.template_key} ${template.category}`.toLowerCase();
      return categoryMatch && (!needle || text.includes(needle));
    });
  }, [templates, query, category]);

  const missingRequired = useMemo(() => {
    if (!selected) return [];
    const content = editorContent || selected.editor_json || selected.html_body || "";
    return (selected.required_placeholders || []).filter((tag) => !hasPlaceholder(content, tag));
  }, [selected, editorContent]);

  const refreshSelectedInList = (template) => {
    setTemplates((items) =>
      items.map((item) => (item.template_key === template.template_key ? { ...item, ...template } : item))
    );
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        subject: draft.subject,
        text_body: draft.text_body,
        is_active: draft.is_active,
        notes: draft.notes,
      };

      const content = editorRef.current?.getContent() || editorContent || selected.editor_json;
      if (editorDirty && content) {
        await addRenderedBodyToPayload({ payload, content, editorRef });
        payload.editor_json = content;
      }

      const saved = await saveEmailTemplate(selected.template_key, payload);

      setSelected(saved);
      setEditorContent(saved.editor_json || content);
      setEditorDirty(false);
      refreshSelectedInList(saved);
      loadInlinePreview(saved);
      showSnack("Template saved.");
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = {
        subject: draft.subject,
        text_body: draft.text_body,
      };

      if (editorDirty) {
        const content = editorRef.current?.getContent() || editorContent || selected.editor_json;
        if (content) {
          await addRenderedBodyToPayload({ payload, content, editorRef });
        }
      }

      const data = await previewEmailTemplate(selected.template_key, payload);
      setPreview(data);
      setPreviewOpen(true);
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await sendTestEmail(selected.template_key, testEmail);
      setTestOpen(false);
      setTestEmail("");
      showSnack("Test email sent.");
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const reset = await resetEmailTemplate(selected.template_key);
      setResetOpen(false);
      setSelected(reset);
      setDraft({
        subject: reset.subject || "",
        text_body: reset.text_body || "",
        notes: reset.notes || "",
        is_active: reset.is_active !== false,
      });
      setEditorContent(reset.editor_json || null);
      setEditorDirty(false);
      setEditorRevision((revision) => revision + 1);
      refreshSelectedInList(reset);
      loadInlinePreview(reset, reset.template_key);
      showSnack("Template reset to file default.");
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: `${radii.field}px` },
  };

  const surfaceSx = {
    borderColor: semanticColors.border,
    borderRadius: `${radii.card}px`,
    bgcolor: semanticColors.surface,
    boxShadow: shadows.sm,
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 2.5 }, width: "100%", minWidth: 0, pb: 2 }}>
      <Stack
        component="header"
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 750, color: semanticColors.text }}>
            Email Templates
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680 }}>
            Edit default email notifications used across the platform.
          </Typography>
        </Box>
        <Tooltip title="Reload templates">
          <span>
            <IconButton
              aria-label="Reload email templates"
              onClick={loadTemplates}
              disabled={loading}
              sx={{
                alignSelf: "flex-start",
                minWidth: 44,
                minHeight: 44,
                border: `1px solid ${semanticColors.border}`,
                borderRadius: `${radii.field}px`,
                color: semanticColors.text,
                bgcolor: semanticColors.surface,
                "&:focus-visible": { outline: `${focus.width}px solid ${focus.color}`, outlineOffset: focus.offset },
              }}
            >
              <RefreshRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: `${radii.field}px` }}>{error}</Alert>}

      <Paper
        component="section"
        aria-label="Find an email template"
        variant="outlined"
        sx={{
          ...surfaceSx,
          p: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) 190px", lg: "minmax(220px, 0.8fr) 190px minmax(320px, 1.4fr) auto" },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            label="Search templates"
            placeholder="Search templates"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            fullWidth
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={fieldSx}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item === "all" ? "All categories" : item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            size="small"
            disabled={loading || filteredTemplates.length === 0}
            sx={{ ...fieldSx, gridColumn: { sm: "1 / -1", lg: "auto" } }}
          >
            <InputLabel>Email template</InputLabel>
            <Select
              label="Email template"
              value={filteredTemplates.some((template) => template.template_key === selectedKey) ? selectedKey : ""}
              onChange={(event) => setSelectedKey(event.target.value)}
              renderValue={(value) => {
                const template = templates.find((item) => item.template_key === value);
                return template ? `${template.label} · ${template.category}` : "Select a template";
              }}
            >
              {filteredTemplates.length === 0 && (
                <MenuItem value="" disabled>
                  No templates match your filters
                </MenuItem>
              )}
              {filteredTemplates.map((template) => (
                <MenuItem key={template.template_key} value={template.template_key}>
                  <Box sx={{ minWidth: 0, width: "100%" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                        {template.label}
                      </Typography>
                      <Chip size="small" label={sourceLabel(template)} color={sourceColor(template)} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                      {template.category} · {template.subject}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            label={selected ? sourceLabel(selected) : "Select template"}
            color={selected ? sourceColor(selected) : "default"}
            sx={{ justifySelf: { xs: "start", lg: "end" }, fontWeight: 700, maxWidth: "100%" }}
          />
        </Box>
      </Paper>

      {!loading && templates.length > 0 && filteredTemplates.length === 0 && (
        <AdminEmptyState
          compact
          title="No templates match your filters"
          description="Try a different search term or category."
          icon={<SearchRoundedIcon />}
          sx={{ boxShadow: shadows.sm }}
        />
      )}

      <Paper
        component="section"
        aria-label="Email template editor"
        aria-busy={loading || detailLoading || undefined}
        variant="outlined"
        sx={{ ...surfaceSx, p: { xs: 1.5, sm: 2, md: 2.5 }, minWidth: 0, overflow: "hidden" }}
      >
          {loading || detailLoading ? (
            <Box role="status" aria-label="Loading email template" sx={{ display: "grid", placeItems: "center", minHeight: 420 }}>
              <Stack alignItems="center" gap={1.5}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">Loading template…</Typography>
              </Stack>
            </Box>
          ) : !selected ? (
            <AdminEmptyState
              compact
              title={templates.length === 0 ? "No email templates available" : "Select an email template"}
              description={templates.length === 0 ? "Templates will appear here when they become available." : "Choose a template above to edit its content and settings."}
              icon={<MarkEmailReadRoundedIcon />}
              sx={{ border: 0, boxShadow: "none" }}
            />
          ) : (
            <Stack gap={{ xs: 2, md: 2.5 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography component="h2" variant="h5" sx={{ fontWeight: 750, color: semanticColors.text, overflowWrap: "anywhere" }}>
                      {selected.label}
                    </Typography>
                    <Chip label={sourceLabel(selected)} color={sourceColor(selected)} size="small" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Template source: {selected.source === "file_default" ? "File default" : "Global DB"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, auto)" },
                    gap: 1,
                    alignSelf: { md: "flex-start" },
                    "& .MuiButton-root": { minHeight: 40, whiteSpace: "nowrap" },
                  }}
                >
                  <Button variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={handlePreview} disabled={saving}>
                    Preview
                  </Button>
                  <Button variant="outlined" startIcon={<SendRoundedIcon />} onClick={() => setTestOpen(true)} disabled={saving}>
                    Send Test Email
                  </Button>
                  <Button color="warning" variant="outlined" startIcon={<RestartAltRoundedIcon />} onClick={() => setResetOpen(true)} disabled={saving}>
                    Reset to Default
                  </Button>
                  <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} onClick={handleSave} disabled={saving}>
                    Save
                  </Button>
                </Box>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 220px" },
                  gap: 2,
                  p: { xs: 1.5, sm: 2 },
                  border: `1px solid ${semanticColors.border}`,
                  borderRadius: `${radii.card}px`,
                  bgcolor: semanticColors.page,
                }}
              >
                <TextField
                  label="Subject"
                  value={draft.subject}
                  onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
                  fullWidth
                  sx={fieldSx}
                />
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 56, px: { md: 1 } }}>
                  <Typography component="label" htmlFor="email-template-active" variant="body2" sx={{ fontWeight: 700, color: semanticColors.text }}>
                    Active
                  </Typography>
                  <Switch
                    id="email-template-active"
                    inputProps={{ "aria-label": "Template active" }}
                    checked={draft.is_active}
                    onChange={(event) => setDraft((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                </Stack>
              </Box>

              <Box component="section" aria-labelledby="required-variables-heading">
                <Typography id="required-variables-heading" variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: semanticColors.text }}>
                  Required variables
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {(selected.required_placeholders || []).map((tag) => {
                    const match = (selected.merge_tags || []).find((item) => item.tag === tag || item.value === tag);
                    return <Chip key={tag} label={match?.label || tag} color={missingRequired.includes(tag) ? "warning" : "default"} />;
                  })}
                </Stack>
              </Box>

              {missingRequired.length > 0 && (
                <Alert severity="warning">
                  This draft may be missing required variables. Add the highlighted variables before saving.
                </Alert>
              )}

              <Box component="section" aria-labelledby="available-variables-heading">
                <Typography id="available-variables-heading" variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: semanticColors.text }}>
                  Available variables
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {(selected.merge_tags || []).map((tag) => (
                    <Chip key={tag.tag || tag.value || tag.label} label={tag.label} variant="outlined" size="small" />
                  ))}
                </Stack>
              </Box>

              {selected.source === "file_default" && !selected.editor_json && (
                <Alert severity="info">
                  This template is currently using the platform file default. The visual editor opens a clean editable starter layout; save to create the global customized version.
                </Alert>
              )}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <Box
                  component="section"
                  aria-labelledby="visual-editor-heading"
                  sx={{
                    border: "1px solid",
                    borderColor: semanticColors.border,
                    borderRadius: `${radii.card}px`,
                    overflow: "hidden",
                    bgcolor: semanticColors.surface,
                    minWidth: 0,
                    width: "100%",
                    maxWidth: "100%",
                    boxShadow: shadows.sm,
                  }}
                >
                  <Box
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderBottom: "1px solid",
                      borderColor: semanticColors.border,
                      bgcolor: semanticColors.surfaceCool,
                    }}
                  >
                    <Typography id="visual-editor-heading" variant="subtitle2" sx={{ fontWeight: 800, color: semanticColors.text }}>
                      Visual editor
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Edit the email visually. The rendered preview is shown below.
                    </Typography>
                  </Box>
                  <Box
                    role="region"
                    aria-label="Visual email editor controls"
                    sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto" }}
                  >
                    <TemplaticalEmailEditor
                      key={`${selected.template_key}-${editorRevision}`}
                      ref={editorRef}
                      template={selected}
                      onReady={(content) => {
                        setEditorContent(content);
                        setEditorDirty(false);
                      }}
                      onContentChange={(content, meta) => {
                        setEditorContent(content);
                        if (!meta?.initial) setEditorDirty(true);
                      }}
                    />
                  </Box>
                </Box>

                <Box
                  component="section"
                  aria-labelledby="email-view-heading"
                  sx={{
                    border: "1px solid",
                    borderColor: semanticColors.border,
                    borderRadius: `${radii.card}px`,
                    overflow: "hidden",
                    bgcolor: semanticColors.surface,
                    minWidth: 0,
                    boxShadow: shadows.sm,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1}
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderBottom: "1px solid",
                      borderColor: semanticColors.border,
                      bgcolor: semanticColors.surfaceCool,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography id="email-view-heading" variant="subtitle2" sx={{ fontWeight: 800, color: semanticColors.text }}>
                        Email view
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Rendered sample preview of what recipients will see.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={inlinePreviewLoading ? <CircularProgress size={14} /> : <RefreshRoundedIcon />}
                      onClick={() => loadInlinePreview(selected)}
                      disabled={inlinePreviewLoading}
                      sx={{ flexShrink: 0 }}
                    >
                      Refresh
                    </Button>
                  </Stack>
                  <Box
                    component="iframe"
                    title="Inline email preview"
                    srcDoc={inlinePreview?.rendered_html || selected.html_body || "<p>Email preview is not available.</p>"}
                    sx={{
                      width: "100%",
                      height: { xs: 520, sm: 620, md: 700 },
                      border: 0,
                      bgcolor: "var(--imaa-dm-surface-alt, #f4f7fb)",
                      display: "block",
                    }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.2fr) minmax(280px, 0.8fr)" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Plain-text fallback"
                  value={draft.text_body}
                  onChange={(event) => setDraft((prev) => ({ ...prev, text_body: event.target.value }))}
                  fullWidth
                  multiline
                  minRows={4}
                  helperText="Used by email clients that cannot display the visual HTML template."
                  sx={fieldSx}
                />

                <TextField
                  label="Internal notes"
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  fullWidth
                  multiline
                  minRows={4}
                  sx={fieldSx}
                />
              </Box>
            </Stack>
          )}
      </Paper>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="email-preview-title"
        PaperProps={{ sx: { width: { xs: "calc(100% - 24px)", sm: "calc(100% - 64px)" }, maxHeight: "calc(100dvh - 32px)", borderRadius: `${radii.popup}px` } }}
      >
        <DialogTitle id="email-preview-title" sx={{ color: semanticColors.text, fontWeight: 750 }}>Email Preview</DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {preview?.rendered_subject}
          </Typography>
          <Box
            component="iframe"
            title="Email preview"
            srcDoc={preview?.rendered_html || "<p>No HTML preview available.</p>"}
            sx={{
              width: "100%",
              height: { xs: "calc(100dvh - 190px)", sm: 560 },
              minHeight: { xs: 360, sm: 560 },
              border: "1px solid",
              borderColor: semanticColors.border,
              borderRadius: `${radii.field}px`,
              bgcolor: "var(--imaa-dm-surface, white)",
              display: "block",
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={testOpen} onClose={() => setTestOpen(false)} maxWidth="xs" fullWidth aria-labelledby="send-test-email-title" PaperProps={{ sx: { m: 1.5, borderRadius: `${radii.popup}px` } }}>
        <DialogTitle id="send-test-email-title" sx={{ color: semanticColors.text, fontWeight: 750 }}>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Test email"
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            fullWidth
            inputProps={{ "aria-label": "Test email address" }}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSendTest} disabled={!testEmail || saving}>
            Send
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="sm" fullWidth aria-labelledby="reset-template-title" PaperProps={{ sx: { m: 1.5, borderRadius: `${radii.popup}px` } }}>
        <DialogTitle id="reset-template-title" sx={{ color: semanticColors.text, fontWeight: 750 }}>Reset Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Reset {selected?.label} to the file default and clear the visual editor JSON?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={handleReset} disabled={saving}>
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
