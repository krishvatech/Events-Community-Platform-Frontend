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
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
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

import TemplaticalEmailEditor from "./TemplaticalEmailEditor";
import {
  getEventEmailTemplate,
  listEventEmailTemplates,
  previewEventEmailTemplate,
  resetEventEmailTemplate,
  saveEventEmailTemplate,
  sendTestEventEmailTemplate,
} from "../../services/eventEmailTemplateService";

const TEMPLATE_LABEL_OVERRIDES = {
  user_registration_acknowledgement: "Successful Registration Email",
  guest_registration_acknowledgement: "Guest Registration Email",
  event_starting_soon: "Event Reminder Email",
  event_cancelled: "Event Cancellation Email",
  application_acknowledgement: "Application Received Email",
  application_approved: "Application Approved Email",
  application_declined: "Application Declined Email",
  post_event_qna_answer: "Q&A Answered Email",
  event_confirmation: "Event Confirmation Email",
  event_join_confirmation: "Event Join Confirmation Email",
  event_invite: "Event Invitation Email",
  replay_no_show: "Replay Email: No Show",
  replay_partial: "Replay Email: Partial Attendance",
  replay_expiring_soon: "Replay Email: Expiring Soon",
  networking_meeting_request: "Networking Email: Meeting Request",
  networking_meeting_accepted: "Networking Email: Meeting Accepted",
  networking_meeting_declined: "Networking Email: Meeting Declined",
  networking_meeting_suggested: "Networking Email: Suggested Time",
  networking_meeting_cancelled: "Networking Email: Meeting Cancelled",
  networking_meeting_reminder: "Networking Email: Meeting Reminder",
};

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

const displayLabel = (template) => TEMPLATE_LABEL_OVERRIDES[template?.template_key] || template?.label || template?.template_key || "";

const sourceLabel = (template) => {
  if (!template) return "";
  if (!template.is_active || template.status === "inactive") return "Inactive";
  if (template.source === "event_specific") return "Custom for this event";
  if (template.source === "global_default") return "Using global template";
  if (template.source === "file_default") return "File default";
  return template.source || "Using global template";
};

const sourceColor = (template) => {
  if (!template?.is_active || template?.status === "inactive") return "default";
  if (template?.source === "event_specific") return "success";
  if (template?.source === "global_default") return "info";
  if (template?.source === "file_default") return "warning";
  return "default";
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

export default function EventEmailTemplatesManager({ event, eventId: eventIdProp }) {
  const eventId = eventIdProp || event?.id;
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
  const [editorRevision, setEditorRevision] = useState(0);

  const showSnack = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const refreshSelectedInList = (template) => {
    setTemplates((items) =>
      items.map((item) => (item.template_key === template.template_key ? { ...item, ...template } : item))
    );
  };

  const loadInlinePreview = async (template, expectedKey = template?.template_key) => {
    if (!eventId || !template?.template_key) return;
    setInlinePreviewLoading(true);
    try {
      const data = await previewEventEmailTemplate(eventId, template.template_key, {
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

  const loadTemplates = async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      const data = await listEventEmailTemplates(eventId);
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
    if (!eventId || !key) return;
    selectedKeyRef.current = key;
    setDetailLoading(true);
    setError("");
    setSelected(null);
    setInlinePreview(null);
    setEditorContent(null);
    try {
      const data = await getEventEmailTemplate(eventId, key);
      if (selectedKeyRef.current !== key) return;
      setSelected(data);
      setDraft({
        subject: data.subject || "",
        text_body: data.text_body || "",
        notes: data.notes || "",
        is_active: data.is_active !== false,
      });
      setEditorContent(data.editor_json || null);
      setEditorRevision((revision) => revision + 1);
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

  useEffect(() => {
    loadTemplates();
  }, [eventId]);

  useEffect(() => {
    loadTemplate(selectedKey);
  }, [eventId, selectedKey]);

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(templates.map((template) => template.category).filter(Boolean))).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((template) => {
      const categoryMatch = category === "all" || template.category === category;
      const text = `${displayLabel(template)} ${template.template_key} ${template.category} ${template.subject}`.toLowerCase();
      return categoryMatch && (!needle || text.includes(needle));
    });
  }, [templates, query, category]);

  const missingRequired = useMemo(() => {
    if (!selected) return [];
    const content = editorContent || selected.editor_json || selected.html_body || "";
    return (selected.required_placeholders || []).filter((tag) => !hasPlaceholder(content, tag));
  }, [selected, editorContent]);

  const buildDraftPayload = async () => {
    const payload = {
      subject: draft.subject,
      text_body: draft.text_body,
      is_active: draft.is_active,
      notes: draft.notes,
    };
    const content = editorRef.current?.getContent() || editorContent || selected?.editor_json;
    if (content) {
      await addRenderedBodyToPayload({ payload, content, editorRef });
      payload.editor_json = content;
    }
    return { payload, content };
  };

  const handleSave = async () => {
    if (!eventId || !selected) return;
    setSaving(true);
    setError("");
    try {
      const { payload, content } = await buildDraftPayload();
      const saved = await saveEventEmailTemplate(eventId, selected.template_key, payload);
      setSelected(saved);
      setDraft({
        subject: saved.subject || "",
        text_body: saved.text_body || "",
        notes: saved.notes || "",
        is_active: saved.is_active !== false,
      });
      setEditorContent(saved.editor_json || content || null);
      refreshSelectedInList(saved);
      setEditorRevision((revision) => revision + 1);
      loadInlinePreview(saved, saved.template_key);
      showSnack("Event email template saved.");
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!eventId || !selected) return;
    setSaving(true);
    try {
      const { payload } = await buildDraftPayload();
      const data = await previewEventEmailTemplate(eventId, selected.template_key, payload);
      setPreview(data);
      setPreviewOpen(true);
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshInlinePreview = async () => {
    if (!eventId || !selected) return;
    setInlinePreviewLoading(true);
    try {
      const { payload } = await buildDraftPayload();
      const data = await previewEventEmailTemplate(eventId, selected.template_key, payload);
      setInlinePreview(data);
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setInlinePreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!eventId || !selected) return;
    setSaving(true);
    try {
      await sendTestEventEmailTemplate(eventId, selected.template_key, testEmail);
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
    if (!eventId || !selected) return;
    setSaving(true);
    try {
      const reset = await resetEventEmailTemplate(eventId, selected.template_key);
      const next = reset?.template_key ? reset : await getEventEmailTemplate(eventId, selected.template_key);
      setResetOpen(false);
      setSelected(next);
      setDraft({
        subject: next.subject || "",
        text_body: next.text_body || "",
        notes: next.notes || "",
        is_active: next.is_active !== false,
      });
      setEditorContent(next.editor_json || null);
      refreshSelectedInList(next);
      setEditorRevision((revision) => revision + 1);
      loadInlinePreview(next, next.template_key);
      showSnack("Event override reset. The event is using the global template.");
    } catch (err) {
      showSnack(extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!eventId) {
    return <Alert severity="warning">Event email templates are not available until the event is loaded.</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#172b4d" }}>
            Email Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Customize email notifications for this event. If no custom template exists, the platform global template is used.
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

      <Paper variant="outlined" sx={{ borderRadius: 1, p: 1.5, bgcolor: "#ffffff" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(220px, 0.9fr) 190px minmax(360px, 1.7fr) auto" },
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
                return template ? `${displayLabel(template)} · ${template.category}` : "Select a template";
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
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {displayLabel(template)}
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
            sx={{ justifySelf: { xs: "start", lg: "end" }, fontWeight: 800 }}
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
            <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" gap={2}>
              <Box>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {displayLabel(selected)}
                  </Typography>
                  <Chip label={sourceLabel(selected)} color={sourceColor(selected)} size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Template source: {sourceLabel(selected)}
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
                  Reset to Global
                </Button>
                <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />} onClick={handleSave} disabled={saving}>
                  Save
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 220px" },
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
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Active
                </Typography>
                <Switch
                  checked={draft.is_active}
                  onChange={(event) => setDraft((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Available variables
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {(selected.merge_tags || []).map((tag) => (
                  <Chip key={tag.tag || tag.value || tag.label} label={tag.label} variant="outlined" size="small" />
                ))}
              </Stack>
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
                  Edit the starter layout visually. The rendered preview is shown below.
                </Typography>
              </Box>
              <TemplaticalEmailEditor
                key={`${selected.template_key}-${editorRevision}`}
                ref={editorRef}
                template={selected}
                editorContext={{
                  template_key: selected?.template_key,
                  is_multi_day: event?.is_multi_day,
                }}
                onReady={(content) => setEditorContent(content)}
                onContentChange={(content) => setEditorContent(content)}
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
                  onClick={handleRefreshInlinePreview}
                  disabled={inlinePreviewLoading}
                  sx={{ flexShrink: 0 }}
                >
                  Refresh
                </Button>
              </Stack>
              <Box
                component="iframe"
                title="Event email preview"
                srcDoc={inlinePreview?.rendered_html || selected.html_body || "<p>Email preview is not available.</p>"}
                sx={{
                  width: "100%",
                  height: 720,
                  border: 0,
                  bgcolor: "#f4f7fb",
                  display: "block",
                }}
              />
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
                minRows={5}
                helperText="Used by email clients that cannot display the visual HTML template."
              />

              <TextField
                label="Internal notes"
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                fullWidth
                multiline
                minRows={5}
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
            title="Event email dialog preview"
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
        <DialogTitle>Reset to Global</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove the custom event override for {displayLabel(selected)}? This event will use the platform global template again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={handleReset} disabled={saving}>
            Reset to Global
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