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
import { renderToMjml } from "@templatical/renderer";

import TemplaticalEmailEditor from "../../components/admin/TemplaticalEmailEditor";
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
      refreshSelectedInList(reset);
      loadInlinePreview(reset);
      showSnack("Template reset to file default.");
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#243047" }}>
            Email Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Edit default email notifications used across the platform.
          </Typography>
        </Box>
        <Tooltip title="Reload templates">
          <span>
            <IconButton onClick={loadTemplates} disabled={loading}>
              <RefreshRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 1,
          p: 1.5,
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 0.8fr) 190px minmax(320px, 1.4fr) auto" },
            gap: 1.25,
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            placeholder="Search templates"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small">
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item === "all" ? "All categories" : item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" disabled={loading || filteredTemplates.length === 0}>
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
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {template.label}
                      </Typography>
                      <Chip size="small" label={sourceLabel(template)} color={sourceColor(template)} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap>
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
            sx={{ justifySelf: { xs: "start", md: "end" }, fontWeight: 700 }}
          />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 1, p: { xs: 2, md: 2.5 }, minWidth: 0 }}>
          {detailLoading || !selected ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 420 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack gap={2}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                <Box>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {selected.label}
                    </Typography>
                    <Chip label={sourceLabel(selected)} color={sourceColor(selected)} size="small" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Template source: {selected.source === "file_default" ? "File default" : "Global DB"}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
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
                </Stack>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 220px" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Subject"
                  value={draft.subject}
                  onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
                  fullWidth
                />
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Active
                  </Typography>
                  <Switch
                    checked={draft.is_active}
                    onChange={(event) => setDraft((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
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

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
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
                  gridTemplateColumns: { xs: "1fr", xl: "minmax(420px, 0.9fr) minmax(560px, 1.1fr)" },
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "#ffffff",
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
                      borderColor: "divider",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
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
                      height: 700,
                      border: 0,
                      bgcolor: "#f4f7fb",
                      display: "block",
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "#ffffff",
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Visual editor
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Edit the starter layout visually. The email view shows the currently saved/rendered template.
                    </Typography>
                  </Box>
                  <TemplaticalEmailEditor
                    key={selected.template_key}
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
                />

                <TextField
                  label="Internal notes"
                  value={draft.notes}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  fullWidth
                  multiline
                  minRows={4}
                />
              </Box>
            </Stack>
          )}
      </Paper>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Email Preview</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {preview?.rendered_subject}
          </Typography>
          <Box
            component="iframe"
            title="Email preview"
            srcDoc={preview?.rendered_html || "<p>No HTML preview available.</p>"}
            sx={{
              width: "100%",
              minHeight: 560,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "white",
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={testOpen} onClose={() => setTestOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Test email"
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSendTest} disabled={!testEmail || saving}>
            Send
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Template</DialogTitle>
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
