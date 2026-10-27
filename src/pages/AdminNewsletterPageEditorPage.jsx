import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  InputAdornment,
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
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import EmailPreviewFrame from "../components/marketing/EmailPreviewFrame.jsx";
import LandingPageContentEditor, { MODE_VISUAL, initialPageEditorMode } from "../components/marketing/LandingPageContentEditor.jsx";
import { UnsavedChangesDialog, useUnsavedChangesGuard } from "../components/marketing/UnsavedChangesGuard.jsx";
import {
  createNewsletterPage,
  getNewsletterPage,
  listNewsletterPageCategories,
  updateNewsletterPage,
} from "../services/newsletterService";
import {
  ALIAS_MAX_LENGTH,
  CARD_BORDER,
  META_DESCRIPTION_MAX_LENGTH,
  NAVY,
  PAGES_PATH,
  REDIRECT_TYPES,
  REDIRECT_URL_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  blankPage,
  describePageLoadError,
  draftToPayload,
  getErrorMessage,
  isValidPageId,
  pageDetailsPath,
  pageToDraft,
  slugifyAlias,
  validatePageDraft,
} from "./newsletterPageShared.jsx";

const FIELD_KEYS = ["title", "alias", "customHtml", "metaDescription", "noIndex", "language", "category", "redirectType", "redirectUrl"];

/** Server-side field errors (`errors`), limited to fields this page shows. */
const serverFieldErrors = (data) => {
  const errors = data?.errors && typeof data.errors === "object" ? data.errors : {};
  return Object.fromEntries(Object.entries(errors).filter(([key]) => FIELD_KEYS.includes(key)));
};

function SectionCard({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY, mb: 2 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function AdminNewsletterPageEditorPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(blankPage);
  const [fieldErrors, setFieldErrors] = useState({});
  const [load, setLoad] = useState({ loading: Boolean(pageId), error: null });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [dirty, setDirty] = useState(false);
  // On a new page the URL follows the title until the admin types one.
  const [aliasTouched, setAliasTouched] = useState(false);
  const [mode, setMode] = useState(MODE_VISUAL);
  const [builderDirty, setBuilderDirty] = useState(false);
  const saveInFlight = useRef(false);
  const contentRef = useRef(null);

  const isNew = !pageId;
  // The builder reports edits slightly after they happen, so it is asked directly too.
  const guard = useUnsavedChangesGuard((dirty || builderDirty) && !saving, {
    isDirtyNow: () => !saveInFlight.current && Boolean(contentRef.current?.hasUnsavedBuilderChanges()),
  });

  useEffect(() => {
    setFieldErrors({});
    setSaveError(null);
    setAliasTouched(false);
    setBuilderDirty(false);
    if (!pageId) {
      setOriginal(null);
      setDraft(blankPage);
      setMode(initialPageEditorMode({ isNew: true, html: blankPage.customHtml }));
      setLoad({ loading: false, error: null });
      setDirty(false);
      return undefined;
    }
    if (!isValidPageId(pageId)) {
      setLoad({ loading: false, error: { title: "Invalid landing page link.", detail: "Landing page links use a numeric Mautic page ID.", retry: false } });
      return undefined;
    }
    let active = true;
    setLoad({ loading: true, error: null });
    getNewsletterPage(pageId)
      .then((data) => {
        if (!active) return;
        if (!data.editable) {
          setLoad({ loading: false, error: { title: "This page is managed in Mautic.", detail: "Preference-center pages cannot be edited here.", retry: false } });
          return;
        }
        setOriginal(data);
        setDraft(pageToDraft(data));
        setMode(initialPageEditorMode({ isNew: false, html: data.customHtml }));
        setLoad({ loading: false, error: null });
        setDirty(false);
      })
      .catch((err) => active && setLoad({ loading: false, error: describePageLoadError(err) }));
    return () => {
      active = false;
    };
  }, [pageId]);

  // Categories are optional: the page saves without them.
  useEffect(() => {
    let active = true;
    listNewsletterPageCategories()
      .then((data) => active && setCategories(Array.isArray(data?.results) ? data.results : []))
      .catch(() => active && setCategories([]));
    return () => {
      active = false;
    };
  }, []);

  const setField = (field, value) => {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && isNew && !aliasTouched) next.alias = slugifyAlias(value);
      if (field === "redirectType" && !value) next.redirectUrl = "";
      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: "", ...(field === "title" ? { alias: "" } : {}) }));
    if (field === "alias") setAliasTouched(true);
    setDirty(true);
  };

  const handleSave = async () => {
    if (saving || saveInFlight.current) return;
    // In Visual Builder the page HTML comes from the builder, only when it changed.
    let current = draft;
    try {
      const built = contentRef.current?.collect();
      if (typeof built === "string") current = { ...draft, customHtml: built };
    } catch (err) {
      setSaveError({ message: err?.message || "The visual builder is not ready yet." });
      return;
    }
    const errors = validatePageDraft(current, { isNew });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSaveError({ message: "Fix the highlighted settings before saving." });
      return;
    }
    const payload = draftToPayload(current, original);
    if (!isNew && Object.keys(payload).length === 0) {
      setDirty(false);
      setBuilderDirty(false);
      guard.allowNavigation();
      navigate(pageDetailsPath(original.id), { replace: true, state: { flash: "No changes to save." } });
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = isNew ? await createNewsletterPage(payload) : await updateNewsletterPage(original.id, payload);
      setDirty(false);
      setBuilderDirty(false);
      guard.allowNavigation();
      const base = isNew ? "Landing page created in Mautic (unpublished)." : "Landing page saved.";
      const flash = saved?.aliasAdjusted ? `${base} That URL was taken, so Mautic used /${saved.alias}.` : base;
      navigate(pageDetailsPath(saved.id), { replace: true, state: { flash } });
    } catch (err) {
      const data = err?.response?.data;
      setFieldErrors((current) => ({ ...current, ...serverFieldErrors(data) }));
      setSaveError({
        message: getErrorMessage(err, "We could not save this landing page."),
        candidates: Array.isArray(data?.candidates) ? data.candidates : [],
      });
      // Mautic's verified state after an unclear edit: reflect it, keep the draft.
      if (!isNew && data?.page?.id) setOriginal(data.page);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const backPath = isNew ? PAGES_PATH : pageDetailsPath(original?.id || pageId);
  const title = original?.title || "Landing page";

  if (load.loading || load.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs>
          <Link component={RouterLink} to={PAGES_PATH} underline="hover" color="inherit">Landing Pages</Link>
          <Typography color="text.primary">Edit</Typography>
        </Breadcrumbs>
        {load.loading ? (
          <Stack spacing={2}>
            <Skeleton height={56} />
            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {load.error.retry && <Button color="inherit" size="small" onClick={() => navigate(0)}>Retry</Button>}
                <Button color="inherit" size="small" component={RouterLink} to={PAGES_PATH}>Back to Landing Pages</Button>
              </Stack>
            }
          >
            <strong>{load.error.title}</strong> {load.error.detail}
          </Alert>
        )}
      </Stack>
    );
  }

  const htmlLocked = Boolean(original?.htmlLocked);
  const htmlEditor = (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <TextField
          label="Page HTML"
          value={draft.customHtml}
          onChange={(event) => setField("customHtml", event.target.value)}
          fullWidth
          multiline
          minRows={22}
          maxRows={40}
          error={Boolean(fieldErrors.customHtml)}
          helperText={fieldErrors.customHtml || "A full HTML document. {form=ID} embeds a published Mautic Form when the page is viewed. Contact tokens such as {contactfield=…} are not filled in on landing pages."}
          slotProps={{
            htmlInput: { spellCheck: false, readOnly: htmlLocked, style: { fontFamily: "monospace", fontSize: 13 } },
          }}
        />
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Live preview (scripts off)</Typography>
        <EmailPreviewFrame html={draft.customHtml} title="Landing page preview" height={560} emptyHtml="<p>No content yet.</p>" />
      </Grid>
    </Grid>
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={PAGES_PATH} underline="hover" color="inherit">Landing Pages</Link>
          {!isNew && (
            <Link component={RouterLink} to={pageDetailsPath(original.id)} underline="hover" color="inherit" sx={{ wordBreak: "break-word" }}>{title}</Link>
          )}
          <Typography color="text.primary">{isNew ? "Create" : "Edit"}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
              {isNew ? "Create Landing Page" : `Edit Landing Page — ${title}`}
            </Typography>
            <Typography color="text.secondary">
              {isNew
                ? "Creates a native Mautic landing page. It starts unpublished; publish it from its details page."
                : "Changes save to Mautic together. Publication is changed from the details page."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(backPath)} disabled={saving} sx={{ textTransform: "none" }}>
              Back
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {isNew ? "Create Page" : "Save Page"}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError.message}
          {saveError.candidates?.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {saveError.candidates.map((candidate) => (
                <li key={candidate.id}>
                  <Link component={RouterLink} to={pageDetailsPath(candidate.id)}>Page #{candidate.id}: {candidate.title}</Link>{" "}
                  ({candidate.isPublished ? "published" : "unpublished"})
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <Stack spacing={3}>
          <SectionCard title="Page Settings">
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Page title"
                  value={draft.title}
                  onChange={(event) => setField("title", event.target.value)}
                  required
                  fullWidth
                  error={Boolean(fieldErrors.title)}
                  helperText={fieldErrors.title || "Shown in the browser tab and to admins."}
                  slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Page URL"
                  value={draft.alias}
                  onChange={(event) => setField("alias", event.target.value.toLowerCase())}
                  required={!isNew}
                  fullWidth
                  error={Boolean(fieldErrors.alias)}
                  helperText={fieldErrors.alias || (isNew ? "Lowercase letters, numbers and hyphens. Leave empty to let Mautic choose." : "Changing it breaks links to the old address.")}
                  slotProps={{
                    htmlInput: { maxLength: ALIAS_MAX_LENGTH },
                    input: { startAdornment: <InputAdornment position="start">/</InputAdornment> },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Meta description"
                  value={draft.metaDescription}
                  onChange={(event) => setField("metaDescription", event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(fieldErrors.metaDescription)}
                  helperText={fieldErrors.metaDescription || "Optional summary search engines and link previews may show."}
                  slotProps={{ htmlInput: { maxLength: META_DESCRIPTION_MAX_LENGTH } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Language"
                  value={draft.language}
                  onChange={(event) => setField("language", event.target.value.trim())}
                  fullWidth
                  error={Boolean(fieldErrors.language)}
                  helperText={fieldErrors.language || "Locale code, e.g. en or en_US."}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  label="Category"
                  value={categories.some((c) => c.id === draft.category) ? draft.category : ""}
                  onChange={(event) => setField("category", event.target.value)}
                  fullWidth
                  error={Boolean(fieldErrors.category)}
                  helperText={fieldErrors.category || "Optional."}
                >
                  <MenuItem value="">No category</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>{category.title}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={<Switch checked={draft.noIndex} onChange={(event) => setField("noIndex", event.target.checked)} />}
                  label="Hide from search engines (noindex)"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="When unpublished"
                  value={draft.redirectType}
                  onChange={(event) => setField("redirectType", event.target.value)}
                  fullWidth
                  error={Boolean(fieldErrors.redirectType)}
                  helperText={fieldErrors.redirectType || "Without a redirect, visitors to an unpublished page see Mautic's access-denied (403) page."}
                >
                  {REDIRECT_TYPES.map((option) => (
                    <MenuItem key={option.value || "none"} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {draft.redirectType && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Redirect URL"
                    value={draft.redirectUrl}
                    onChange={(event) => setField("redirectUrl", event.target.value)}
                    required
                    fullWidth
                    type="url"
                    placeholder="https://www.example.com/new-page"
                    error={Boolean(fieldErrors.redirectUrl)}
                    helperText={fieldErrors.redirectUrl || "A full http:// or https:// address."}
                    slotProps={{ htmlInput: { maxLength: REDIRECT_URL_MAX_LENGTH } }}
                  />
                </Grid>
              )}
            </Grid>
          </SectionCard>

          <SectionCard title="Page Content">
            {htmlLocked && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This page's HTML runs code ({original.activeContent.join("; ")}). Only superusers can change it, so it is read-only here.
              </Alert>
            )}
            <LandingPageContentEditor
              ref={contentRef}
              pageKey={pageId || "new"}
              html={draft.customHtml}
              mode={mode}
              onModeChange={setMode}
              readOnly={htmlLocked}
              onBuilderDirtyChange={setBuilderDirty}
              onHtmlFromBuilder={(html) => {
                setDraft((current) => ({ ...current, customHtml: html }));
                setFieldErrors((current) => ({ ...current, customHtml: "" }));
                setDirty(true);
              }}
              htmlEditor={htmlEditor}
            />
          </SectionCard>
        </Stack>
      </Box>

      <UnsavedChangesDialog guard={guard} />
    </Stack>
  );
}
