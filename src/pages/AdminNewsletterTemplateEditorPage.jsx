import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import {
  compileNewsletterEmailMjml,
  createNewsletterTemplate,
  getNewsletterTemplate,
  updateNewsletterTemplate,
} from "../services/newsletterService";
import EmailPreviewFrame from "../components/marketing/EmailPreviewFrame.jsx";
import MarketingEmailContentEditor, {
  MODE_HTML,
  MODE_VISUAL,
  initialEmailEditorMode,
} from "../components/marketing/MarketingEmailContentEditor.jsx";
import { UnsavedChangesDialog, useUnsavedChangesGuard } from "../components/marketing/UnsavedChangesGuard.jsx";
import { normalizeMauticTokens } from "../components/marketing/marketingEmailTokens";
import {
  CARD_BORDER,
  NAVY,
  TEMPLATES_PATH,
  blankTemplate,
  describeLoadError,
  emailPattern,
  getErrorMessage,
  isValidTemplateId,
  templateDetailsPath,
  templateEditPath,
  templateToForm,
  tokenGroups,
  useTemplateMetadata,
} from "./newsletterTemplateShared.jsx";

const fieldGrid = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
};

/**
 * Full-page Template editor for /templates/new and /templates/:id/edit.
 *
 * Both routes render this component at the same position, so when a create
 * whose visual design could not be stored becomes an edit of the now-existing
 * Template (URL /templates/new -> /templates/:id/edit), the page and the
 * admin's unsaved design stay mounted.
 */
export default function AdminNewsletterTemplateEditorPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const metadata = useTemplateMetadata();
  const tokens = normalizeMauticTokens(metadata.tokens);

  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState(blankTemplate);
  const [formErrors, setFormErrors] = useState({});
  const [editorMode, setEditorMode] = useState(MODE_VISUAL);
  // Bumped whenever a Template is loaded from the server: the content editor
  // restarts from that load, never on a partial-save id change.
  const [loadKey, setLoadKey] = useState(0);
  const [load, setLoad] = useState({ loading: Boolean(templateId), error: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState({ open: false, loading: false, html: "", error: "" });
  const contentRef = useRef(null);
  const htmlRef = useRef(null);
  const saveInFlight = useRef(false);
  const previewRef = useRef(null);

  const isNew = !template?.id;
  const guard = useUnsavedChangesGuard(dirty && !saving, {
    isDirtyNow: () => !saving && Boolean(contentRef.current?.hasUnsavedDesignChanges?.()),
  });

  useEffect(() => {
    // Already holding this Template (a partial create turned into an edit).
    if (templateId && template?.id && String(template.id) === String(templateId)) return undefined;
    if (!templateId) {
      setTemplate(null);
      setForm(blankTemplate);
      setEditorMode(MODE_VISUAL);
      setLoad({ loading: false, error: null });
      setLoadKey((key) => key + 1);
      setDirty(false);
      return undefined;
    }
    if (!isValidTemplateId(templateId)) {
      setLoad({ loading: false, error: { title: "Invalid Template ID.", detail: "Template links use a numeric Mautic email ID.", retry: false } });
      return undefined;
    }
    let active = true;
    setLoad({ loading: true, error: null });
    getNewsletterTemplate(templateId)
      .then((data) => {
        if (!active) return;
        setTemplate(data);
        setForm(templateToForm(data));
        setEditorMode(initialEmailEditorMode({ isNew: false, visualDesign: data?.visualDesign }));
        setLoad({ loading: false, error: null });
        setLoadKey((key) => key + 1);
        setDirty(false);
      })
      .catch((err) => active && setLoad({ loading: false, error: describeLoadError(err) }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
    setDirty(true);
  };

  const insertToken = (token) => {
    const element = htmlRef.current;
    const value = form.customHtml || "";
    const start = Number.isInteger(element?.selectionStart) ? element.selectionStart : value.length;
    const end = Number.isInteger(element?.selectionEnd) ? element.selectionEnd : value.length;
    setField("customHtml", `${value.slice(0, start)}${token}${value.slice(end)}`);
    window.requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    if (saving || saveInFlight.current) return;
    const nextErrors = {};
    const name = form.name.trim();
    const subject = form.subject.trim();
    const fromAddress = form.fromAddress.trim();
    if (!name) nextErrors.name = "Template name is required.";
    if (!subject) nextErrors.subject = "Subject is required.";
    if (fromAddress && !emailPattern.test(fromAddress)) nextErrors.fromAddress = "Enter a valid sender email.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSaveError("Complete the required Template fields before saving.");
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setSaveError("");
    try {
      let visual = null;
      try {
        visual = await contentRef.current?.collect();
      } catch (err) {
        setSaveError(err?.message || "The visual design could not be read.");
        return;
      }
      const payload = {
        name,
        subject,
        preheaderText: form.preheaderText,
        fromName: form.fromName.trim(),
        fromAddress,
        plainText: form.plainText,
        isPublished: Boolean(form.isPublished),
        category: form.category,
        template: form.template,
      };
      if (visual) {
        // The server compiles the HTML from this MJML; never send both.
        payload.design = visual.design;
        payload.mjml = visual.mjml;
      } else {
        payload.customHtml = form.customHtml;
      }
      // Refuse to overwrite a Template that changed since it was opened.
      const fingerprint = template?.visualDesign?.htmlFingerprint;
      if (!isNew && fingerprint) payload.baseFingerprint = fingerprint;

      try {
        const saved = isNew
          ? await createNewsletterTemplate(payload)
          : await updateNewsletterTemplate(template.id, payload);
        setDirty(false);
        guard.allowNavigation();
        navigate(templateDetailsPath(saved.id), {
          replace: true,
          state: { flash: isNew ? "Template created." : "Template updated." },
        });
      } catch (err) {
        const data = err?.response?.data;
        setSaveError(getErrorMessage(err, "We could not save this Template."));
        // Mautic has the Template but not its visual design: keep the admin's
        // work on screen and make the next save an edit of that Template.
        if (data?.code === "design_not_saved" && data?.template?.id) {
          setTemplate(data.template);
          if (isNew) {
            guard.allowNavigation();
            navigate(templateEditPath(data.template.id), { replace: true });
          }
        }
      }
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const openPreview = async () => {
    setPreview({ open: true, loading: true, html: "", error: "" });
    window.requestAnimationFrame(() => previewRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
    if (editorMode !== MODE_VISUAL) {
      setPreview({ open: true, loading: false, html: form.customHtml, error: "" });
      return;
    }
    try {
      const visual = await contentRef.current?.collect();
      const { html } = await compileNewsletterEmailMjml(visual.mjml);
      setPreview({ open: true, loading: false, html, error: "" });
    } catch (err) {
      setPreview({ open: true, loading: false, html: "", error: getErrorMessage(err, "The visual design could not be previewed.") });
    }
  };

  const name = template?.name || "Template";
  const backPath = isNew ? TEMPLATES_PATH : templateDetailsPath(template.id);
  const groupedTokens = tokenGroups(metadata.tokens);

  if (load.loading || load.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs>
          <Link component={RouterLink} to={TEMPLATES_PATH} underline="hover" color="inherit">Templates</Link>
          <Typography color="text.primary">Edit</Typography>
        </Breadcrumbs>
        {load.loading ? (
          <Stack spacing={2}>
            <Skeleton height={56} />
            <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {load.error.retry && (
                  <Button color="inherit" size="small" onClick={() => navigate(0)}>Retry</Button>
                )}
                <Button color="inherit" size="small" component={RouterLink} to={TEMPLATES_PATH}>Back to Templates</Button>
              </Stack>
            }
          >
            <strong>{load.error.title}</strong> {load.error.detail}
          </Alert>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={TEMPLATES_PATH} underline="hover" color="inherit">Templates</Link>
          {!isNew && (
            <Link component={RouterLink} to={templateDetailsPath(template.id)} underline="hover" color="inherit">{name}</Link>
          )}
          <Typography color="text.primary">{isNew ? "Create" : "Edit"}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
              {isNew ? "Create Template" : `Edit Template — ${name}`}
            </Typography>
            <Typography color="text.secondary">
              {isNew
                ? "Design a reusable email. It is stored as a native Mautic Template."
                : "Changes are saved to the Mautic Template; its visual design is kept in IMAA Connect."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(backPath)} disabled={saving} sx={{ textTransform: "none" }}>
              Back
            </Button>
            <Button startIcon={<PreviewRoundedIcon />} onClick={openPreview} disabled={saving} sx={{ textTransform: "none" }}>
              Preview
            </Button>
            {!isNew && (
              <Button
                startIcon={<SendRoundedIcon />}
                onClick={() => navigate(`${templateDetailsPath(template.id)}?testSend=1`)}
                disabled={saving}
                sx={{ textTransform: "none" }}
              >
                Test Send
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {isNew ? "Create Template" : "Save Changes"}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {saveError && <Alert severity="error" onClose={() => setSaveError("")}>{saveError}</Alert>}

      <Paper variant="outlined" component="section" aria-label="Template Details" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Template Details</Typography>
        <Box sx={fieldGrid}>
          <TextField
            label="Template Name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            error={Boolean(formErrors.name)}
            helperText={formErrors.name || "Internal name shown in IMAA Connect and Mautic."}
            required
            disabled={saving}
            inputProps={{ maxLength: 190 }}
          />
          <TextField
            label="Subject"
            value={form.subject}
            onChange={(event) => setField("subject", event.target.value)}
            error={Boolean(formErrors.subject)}
            helperText={formErrors.subject || " "}
            required
            disabled={saving}
            inputProps={{ maxLength: 190 }}
          />
          <TextField
            label="Preheader / Preview Text"
            value={form.preheaderText}
            onChange={(event) => setField("preheaderText", event.target.value)}
            helperText="Shown after the subject in most inboxes."
            disabled={saving}
          />
          <TextField label="Sender Name" value={form.fromName} onChange={(event) => setField("fromName", event.target.value)} helperText=" " disabled={saving} />
          <TextField
            label="Sender Email"
            type="email"
            value={form.fromAddress}
            onChange={(event) => setField("fromAddress", event.target.value)}
            error={Boolean(formErrors.fromAddress)}
            helperText={formErrors.fromAddress || " "}
            disabled={saving}
          />
          <TextField
            select
            label="Email Category"
            value={form.category}
            onChange={(event) => setField("category", event.target.value)}
            helperText="Native Mautic email category."
            disabled={saving}
          >
            <MenuItem value="">Uncategorized</MenuItem>
            {metadata.categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.title || category.alias || `Category #${category.id}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Theme"
            value={form.template}
            onChange={(event) => setField("template", event.target.value)}
            helperText="Native Mautic email theme metadata."
            disabled={saving}
          >
            <MenuItem value="">No theme / custom HTML</MenuItem>
            {metadata.themes.map((theme) => (
              <MenuItem key={theme.key} value={theme.key}>{theme.name || theme.key}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={form.isPublished} onChange={(event) => setField("isPublished", event.target.checked)} disabled={saving} />}
            label={form.isPublished ? "Published" : "Draft / Unpublished"}
            sx={{ alignSelf: "center" }}
          />
        </Box>
      </Paper>

      <Paper variant="outlined" component="section" aria-label="Email Content" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Email Content</Typography>
        <MarketingEmailContentEditor
          ref={contentRef}
          itemKey={`template-load:${loadKey}`}
          isNew={isNew}
          visualDesign={template?.visualDesign}
          mode={editorMode}
          onModeChange={setEditorMode}
          tokens={tokens}
          tokensReady={metadata.loaded}
          height={760}
          onDesignChange={(_, meta) => {
            if (!meta?.initial) setDirty(true);
          }}
          onHtmlFromDesign={(html) => setField("customHtml", html)}
          htmlEditor={
            <Stack spacing={2}>
              <TextField
                label="HTML Content"
                value={form.customHtml}
                onChange={(event) => setField("customHtml", event.target.value)}
                multiline
                minRows={22}
                fullWidth
                disabled={saving}
                helperText="Reusable HTML stored in the native Mautic email Template."
                inputRef={htmlRef}
                InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }}
              />
              {Object.keys(groupedTokens).length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, borderColor: CARD_BORDER }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>Mautic Tokens</Typography>
                  <Stack spacing={1}>
                    {Object.entries(groupedTokens).map(([group, groupTokens]) => (
                      <Box key={group}>
                        <Typography variant="caption" color="text.secondary">{group}</Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {groupTokens.slice(0, 16).map((token) => (
                            <Button key={token.token} size="small" variant="outlined" onClick={() => insertToken(token.token)} sx={{ textTransform: "none", my: 0.25 }}>
                              {token.label}
                            </Button>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          }
        />
        <TextField
          label="Plain Text Fallback"
          value={form.plainText}
          onChange={(event) => setField("plainText", event.target.value)}
          multiline
          minRows={6}
          fullWidth
          disabled={saving}
          sx={{ mt: 2 }}
        />
      </Paper>

      {preview.open && (
        <Paper ref={previewRef} variant="outlined" component="section" aria-label="Email Preview" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>Preview</Typography>
              <Typography variant="body2" color="text.secondary">
                {editorMode === MODE_VISUAL ? "Compiled from the current design (not yet saved)." : "The current HTML (not yet saved)."}
              </Typography>
            </Box>
            <Button onClick={() => setPreview((current) => ({ ...current, open: false }))} sx={{ textTransform: "none" }}>Hide Preview</Button>
          </Stack>
          {preview.error && <Alert severity="error">{preview.error}</Alert>}
          {preview.loading ? (
            <Skeleton variant="rectangular" height={560} sx={{ borderRadius: 2 }} />
          ) : (
            !preview.error && <EmailPreviewFrame title="Template editor preview" html={preview.html} height={640} />
          )}
        </Paper>
      )}

      <UnsavedChangesDialog guard={guard} />
    </Stack>
  );
}
