import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  compileNewsletterEmailMjml,
  getNewsletterCampaignVersion,
  updateNewsletterCampaignVersion,
} from "../services/newsletterService";
import EmailPreviewFrame from "../components/marketing/EmailPreviewFrame.jsx";
import MarketingEmailContentEditor, { MODE_VISUAL, initialEmailEditorMode } from "../components/marketing/MarketingEmailContentEditor.jsx";
import { UnsavedChangesDialog, useUnsavedChangesGuard } from "../components/marketing/UnsavedChangesGuard.jsx";
import { normalizeMauticTokens } from "../components/marketing/marketingEmailTokens";
import { validateLanguage } from "./newsletterTemplateFamily.jsx";
import { CARD_BORDER, NAVY, getErrorMessage, useTemplateMetadata } from "./newsletterTemplateShared.jsx";

const fieldGrid = { display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } };

const toForm = (version) => ({
  name: version?.name || "",
  subject: version?.subject || "",
  preheaderText: version?.preheaderText || "",
  plainText: version?.plainText || "",
  customHtml: version?.customHtml || "",
  language: version?.language || "",
});

/**
 * Editor for one A/B variant or translation of a Broadcast. Same content
 * editor as the Broadcast; sender and audience are the Broadcast's own.
 * Read-only once the Broadcast is no longer a draft.
 */
export default function AdminNewsletterBroadcastVersionEditorPage() {
  const { campaignId, emailId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const metadata = useTemplateMetadata();
  const tokens = normalizeMauticTokens(metadata.tokens);

  const [version, setVersion] = useState(null);
  const [form, setForm] = useState(toForm(null));
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState(MODE_VISUAL);
  const [loadKey, setLoadKey] = useState(0);
  const [load, setLoad] = useState({ loading: true, error: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState({ open: false, loading: false, html: "", error: "" });
  const [flash, setFlash] = useState(location.state?.flash || "");
  const contentRef = useRef(null);
  const broadcastPath = `/admin/newsletter/${encodeURIComponent(campaignId)}`;
  const editable = Boolean(version?.editable);
  const guard = useUnsavedChangesGuard(dirty && !saving, {
    isDirtyNow: () => !saving && Boolean(contentRef.current?.hasUnsavedDesignChanges?.()),
  });

  useEffect(() => {
    let active = true;
    setLoad({ loading: true, error: "" });
    getNewsletterCampaignVersion(campaignId, emailId)
      .then((data) => {
        if (!active) return;
        setVersion(data);
        setForm(toForm(data));
        setMode(initialEmailEditorMode({ isNew: false, visualDesign: data?.visualDesign }));
        setLoadKey((key) => key + 1);
        setDirty(false);
        setLoad({ loading: false, error: "" });
      })
      .catch((err) => active && setLoad({ loading: false, error: getErrorMessage(err, "This version could not be loaded.") }));
    return () => {
      active = false;
    };
  }, [campaignId, emailId]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setDirty(true);
  };

  const save = async () => {
    if (saving) return;
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!form.subject.trim()) nextErrors.subject = "Subject is required.";
    if (version?.role === "translation") {
      const problem = validateLanguage(form.language);
      if (problem) nextErrors.language = problem;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSaveError("Complete the required fields before saving.");
      return;
    }
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
      const payload = { name: form.name.trim(), subject: form.subject.trim(), preheaderText: form.preheaderText, plainText: form.plainText };
      if (version?.role === "translation") payload.language = form.language.trim();
      if (visual) {
        payload.design = visual.design;
        payload.mjml = visual.mjml;
      } else {
        payload.customHtml = form.customHtml;
      }
      const fingerprint = version?.visualDesign?.htmlFingerprint;
      if (fingerprint) payload.baseFingerprint = fingerprint;
      const saved = await updateNewsletterCampaignVersion(campaignId, emailId, payload);
      setVersion(saved);
      setForm(toForm(saved));
      setDirty(false);
      guard.allowNavigation();
      navigate(broadcastPath, { state: { flash: `"${saved.name}" saved.` } });
    } catch (err) {
      setSaveError(getErrorMessage(err, "This version could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async () => {
    setPreview({ open: true, loading: true, html: "", error: "" });
    if (mode !== MODE_VISUAL) {
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

  const kind = version?.role === "translation" ? `Translation (${version.language})` : "A/B variant";

  if (load.loading || load.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs>
          <Link component={RouterLink} to={broadcastPath} underline="hover" color="inherit">Broadcast</Link>
          <Typography color="text.primary">Version</Typography>
        </Breadcrumbs>
        {load.loading ? (
          <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 2 }} />
        ) : (
          <Alert severity="error" action={<Button color="inherit" size="small" component={RouterLink} to={broadcastPath}>Back to Broadcast</Button>}>
            {load.error}
          </Alert>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter/broadcasts" underline="hover" color="inherit">Email Broadcasts</Link>
          <Link component={RouterLink} to={broadcastPath} underline="hover" color="inherit">{version.broadcast?.name || "Broadcast"}</Link>
          <Typography color="text.primary">{kind}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
              {`${kind} — ${version.name}`}
            </Typography>
            <Typography color="text.secondary">
              {version.role === "translation"
                ? "Sent instead of the main version to contacts whose preferred locale matches. Sender and audience are the broadcast's."
                : "Sent to its share of the broadcast's audience. Sender and audience are the broadcast's."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(broadcastPath)} disabled={saving} sx={{ textTransform: "none" }}>Back</Button>
            <Button startIcon={<PreviewRoundedIcon />} onClick={openPreview} disabled={saving} sx={{ textTransform: "none" }}>Preview</Button>
            {editable && (
              <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: "none" }}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}>
                Save Version
              </Button>
            )}
          </Stack>
        </Stack>
      </Stack>

      {!editable && <Alert severity="info">The broadcast is no longer a draft, so this version is read-only.</Alert>}
      {saveError && <Alert severity="error" onClose={() => setSaveError("")}>{saveError}</Alert>}

      <Paper variant="outlined" component="section" aria-label="Version Details" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Box sx={fieldGrid}>
          <TextField label="Name" value={form.name} onChange={(e) => setField("name", e.target.value)} error={Boolean(errors.name)}
            helperText={errors.name || "Shown in IMAA Connect and Mautic."} disabled={!editable || saving} inputProps={{ maxLength: 190 }} />
          <TextField label="Subject" value={form.subject} onChange={(e) => setField("subject", e.target.value)} error={Boolean(errors.subject)}
            helperText={errors.subject || " "} disabled={!editable || saving} inputProps={{ maxLength: 190 }} />
          <TextField label="Preheader / Preview Text" value={form.preheaderText} onChange={(e) => setField("preheaderText", e.target.value)}
            helperText="Shown after the subject in most inboxes." disabled={!editable || saving} />
          {version.role === "translation" && (
            <TextField label="Language" value={form.language} onChange={(e) => setField("language", e.target.value)} error={Boolean(errors.language)}
              helperText={errors.language || "Locale code, e.g. fr, de or pt_BR."} disabled={!editable || saving} />
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" component="section" aria-label="Email Content" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Email Content</Typography>
        <MarketingEmailContentEditor
          ref={contentRef}
          itemKey={`broadcast-version:${emailId}:${loadKey}`}
          isNew={false}
          visualDesign={version.visualDesign}
          mode={mode}
          onModeChange={setMode}
          tokens={tokens}
          tokensReady={metadata.loaded}
          height={760}
          readOnly={!editable}
          onDesignChange={(_, meta) => {
            if (!meta?.initial) setDirty(true);
          }}
          onHtmlFromDesign={(html) => setField("customHtml", html)}
          htmlEditor={
            <TextField label="HTML Content" value={form.customHtml} onChange={(e) => setField("customHtml", e.target.value)} multiline minRows={22}
              fullWidth disabled={!editable || saving} InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }} />
          }
        />
        <TextField label="Plain Text Fallback" value={form.plainText} onChange={(e) => setField("plainText", e.target.value)} multiline minRows={5}
          fullWidth disabled={!editable || saving} sx={{ mt: 2 }} />
      </Paper>

      {preview.open && (
        <Paper variant="outlined" component="section" aria-label="Email Preview" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>Preview</Typography>
            <Button onClick={() => setPreview((current) => ({ ...current, open: false }))} sx={{ textTransform: "none" }}>Hide Preview</Button>
          </Stack>
          {preview.error && <Alert severity="error">{preview.error}</Alert>}
          {preview.loading ? <Skeleton variant="rectangular" height={480} /> : !preview.error && <EmailPreviewFrame title="Broadcast version preview" html={preview.html} height={640} />}
        </Paper>
      )}

      <UnsavedChangesDialog guard={guard} />
      <Snackbar open={Boolean(flash)} autoHideDuration={5000} onClose={() => setFlash("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setFlash("")}>{flash}</Alert>
      </Snackbar>
    </Stack>
  );
}
