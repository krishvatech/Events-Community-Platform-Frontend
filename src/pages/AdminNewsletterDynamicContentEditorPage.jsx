import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import MarketingRichTextEditor from "../components/marketing/MarketingRichTextEditor.jsx";
import MauticCategoryPicker from "../components/marketing/MauticCategoryPicker.jsx";
import PublishWindowFields from "../components/marketing/PublishWindowFields.jsx";
import { UnsavedChangesDialog, useUnsavedChangesGuard } from "../components/marketing/UnsavedChangesGuard.jsx";
import {
  createNewsletterDynamicContent,
  getNewsletterDynamicContent,
  getNewsletterDynamicContentRuleMetadata,
  updateNewsletterDynamicContent,
} from "../services/newsletterService";
import MauticSegmentFilterEditor from "./MauticSegmentFilterEditor";
import { buildFilterMetadataIndex } from "./mauticSegmentFilters";
import {
  CARD_BORDER,
  CONTENT_MAX_LENGTH,
  ContentPreviewFrame,
  DYNAMIC_CONTENT_PATH,
  MODE_OPTIONS,
  NAME_MAX_LENGTH,
  NAVY,
  blankDynamicContent,
  draftToPayload,
  dynamicContentPath,
  dynamicContentToDraft,
  getErrorMessage,
  isValidDynamicContentId,
  slotFromName,
  validateDynamicContentDraft,
} from "./newsletterDynamicContentShared.jsx";

// Markup TipTap's starter kit drops (images, layout, inline styles).
const RICH_TEXT_LOSES = /<(img|table|div|span|iframe|video|font|section|figure|button)\b|\sstyle=/i;

function Section({ title, help, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
      {help && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{help}</Typography>}
      <Stack spacing={2} sx={{ mt: help ? 0 : 2 }}>{children}</Stack>
    </Paper>
  );
}

function ModeCards({ value, onChange, disabled }) {
  return (
    <ToggleButtonGroup exclusive value={value} onChange={(_, next) => next && onChange(next)} aria-label="How it is shown" disabled={disabled}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1,
        "& .MuiToggleButtonGroup-grouped": { border: `1px solid ${CARD_BORDER} !important`, borderRadius: "8px !important", m: 0 } }}>
      {MODE_OPTIONS.map((option) => (
        <ToggleButton key={option.value} value={option.value} aria-label={option.label}
          sx={{ textTransform: "none", display: "block", textAlign: "left", p: 1.5, "&.Mui-selected": { borderColor: `${NAVY} !important`, bgcolor: "#EEF1F7" } }}>
          <Typography sx={{ fontWeight: 800, color: NAVY }}>{option.label}</Typography>
          <Typography variant="body2" color="text.secondary">{option.help}</Typography>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default function AdminNewsletterDynamicContentEditorPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const editing = itemId !== undefined;
  const [item, setItem] = useState(null);
  const [draft, setDraft] = useState(blankDynamicContent);
  const [baseline, setBaseline] = useState(() => JSON.stringify(blankDynamicContent()));
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [metadata, setMetadata] = useState({ loading: true, value: null, error: "" });
  // A new item suggests its slot from the name until the slot is typed.
  const [slotTouched, setSlotTouched] = useState(editing);

  useEffect(() => {
    if (!editing) return undefined;
    if (!isValidDynamicContentId(itemId)) {
      setLoadError("This Dynamic Content link is not valid.");
      setLoading(false);
      return undefined;
    }
    let active = true;
    getNewsletterDynamicContent(itemId)
      .then((data) => {
        if (!active) return;
        const next = dynamicContentToDraft(data);
        setItem(data);
        setDraft(next);
        setBaseline(JSON.stringify(next));
      })
      .catch((err) => active && setLoadError(getErrorMessage(err, "We could not load this Dynamic Content item from Mautic.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [editing, itemId]);

  useEffect(() => {
    let active = true;
    getNewsletterDynamicContentRuleMetadata()
      .then((data) => active && setMetadata({ loading: false, value: data, error: "" }))
      .catch((err) => active && setMetadata({ loading: false, value: null, error: getErrorMessage(err, "Rule fields could not be loaded from Mautic.") }));
    return () => {
      active = false;
    };
  }, []);

  const metadataIndex = useMemo(() => (metadata.value ? buildFilterMetadataIndex(metadata.value) : null), [metadata.value]);
  const payload = useMemo(() => draftToPayload(draft), [draft]);
  const dirty = JSON.stringify(draft) !== baseline;
  const guard = useUnsavedChangesGuard(dirty && !saving);

  const set = (key, value) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slotTouched && !current.isCampaignBased) next.slotName = slotFromName(value);
      return next;
    });
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const save = async () => {
    if (savingRef.current) return;
    const errors = validateDynamicContentDraft(draft, metadataIndex);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      setSaveError("Fix the highlighted fields first.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const saved = editing ? await updateNewsletterDynamicContent(itemId, payload) : await createNewsletterDynamicContent(payload);
      guard.allowNavigation();
      navigate(dynamicContentPath(saved.id), {
        state: { flash: editing ? "Dynamic Content saved." : "Dynamic Content created. It starts unpublished until you publish it." },
      });
    } catch (err) {
      const field = err?.response?.data?.field;
      const message = getErrorMessage(err, "The Dynamic Content item could not be saved.");
      if (field) setFieldErrors((current) => ({ ...current, [field]: message }));
      setSaveError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const backTo = editing && isValidDynamicContentId(itemId) ? dynamicContentPath(itemId) : DYNAMIC_CONTENT_PATH;
  if (loading) return <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}><CircularProgress aria-label="Loading Dynamic Content" /></Box>;
  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to={DYNAMIC_CONTENT_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
          Back to Dynamic Content
        </Button>
      </Stack>
    );
  }

  const rulesMode = !draft.isCampaignBased;
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={backTo} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>
            {editing ? "Back to Dynamic Content item" : "Back to Dynamic Content"}
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
            {editing ? `Edit ${item?.name || "Dynamic Content"}` : "New Dynamic Content"}
          </Typography>
          <Typography color="text.secondary">Saved in Mautic as your own Mautic user.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />} onClick={save}
            disabled={saving} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : editing ? "Save" : "Create Dynamic Content"}
          </Button>
        </Stack>
      </Stack>
      {saveError && <Alert severity="error" onClose={() => setSaveError("")}>{saveError}</Alert>}
      {(item?.isVariant || item?.isTranslation) && (
        <Alert severity="info">This item is an A/B variant or a translation of another item in Mautic. Its content and rules can be edited here; its A/B settings stay in Mautic.</Alert>
      )}

      {/* The rule rows need the full width, so the preview moves beside the form only on very wide screens. */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", xl: "minmax(0, 3fr) minmax(0, 2fr)" }, gap: 3, alignItems: "start" }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Section title="Basics">
            <TextField label="Name" value={draft.name} onChange={(event) => set("name", event.target.value)} required disabled={saving}
              inputProps={{ maxLength: NAME_MAX_LENGTH }} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name || "Only admins see the name."} />
            <TextField label="Description" value={draft.description} onChange={(event) => set("description", event.target.value)} disabled={saving}
              multiline minRows={2} helperText="Optional notes for your team." />
            <MauticCategoryPicker bundle="dynamicContent" value={draft.category} current={draft.categoryInfo} disabled={saving}
              onChange={(value) => set("category", value)} helperText={fieldErrors.category || "Optional."} />
            <FormControlLabel control={<Switch checked={draft.isPublished} onChange={(event) => set("isPublished", event.target.checked)} disabled={saving} />}
              label={draft.isPublished ? "Published: pages can show it" : "Unpublished: shown nowhere yet"} />
            <PublishWindowFields start={draft.publishUp} end={draft.publishDown} disabled={saving} errors={fieldErrors}
              onChange={({ start, end }) => setDraft((current) => ({ ...current, publishUp: start, publishDown: end }))} />
          </Section>

          <Section title="How it is shown">
            <ModeCards value={rulesMode ? "rules" : "campaign"} disabled={saving}
              onChange={(mode) => setDraft((current) => ({ ...current, isCampaignBased: mode === "campaign" }))} />
            {rulesMode ? (
              <>
                <TextField label="Slot name" value={draft.slotName} disabled={saving} required
                  onChange={(event) => { setSlotTouched(true); set("slotName", event.target.value.replace(/\s+/g, "-")); }}
                  error={Boolean(fieldErrors.slotName)}
                  helperText={fieldErrors.slotName || "The place on the page this fills, such as homepage-banner. Items with the same slot share it: the first whose rules match is shown."} />
                <Box>
                  <MauticSegmentFilterEditor rows={draft.filters} metadataIndex={metadataIndex} loading={metadata.loading} error={metadata.error}
                    disabled={saving} onChange={(rows) => set("filters", rows)} title="Rules" noun="rule"
                    help="Show it to visitors whose contact details match. Join rules with and / or." />
                  {fieldErrors.filters && <Alert severity="error" sx={{ mt: 1 }}>{fieldErrors.filters}</Alert>}
                  <Typography variant="caption" color="text.secondary">
                    Rules use contact fields. Visitors Mautic does not know yet, and those matching no rule, see the slot's default content.
                  </Typography>
                </Box>
              </>
            ) : (
              <Alert severity="info">
                Use this item in an automation campaign: as the default content of a "Request dynamic content" decision, or in a "Push dynamic content" step after it. The campaign step names the slot.
              </Alert>
            )}
          </Section>

          <Section title="Content">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <ToggleButtonGroup exclusive size="small" value={draft.type} onChange={(_, value) => value && set("type", value)} aria-label="Content type" disabled={saving}>
                <ToggleButton value="html" sx={{ textTransform: "none" }}>HTML</ToggleButton>
                <ToggleButton value="text" sx={{ textTransform: "none" }}>Plain text</ToggleButton>
              </ToggleButtonGroup>
              {draft.type === "html" && (
                <ToggleButtonGroup exclusive size="small" value={draft.contentMode} onChange={(_, value) => value && set("contentMode", value)}
                  aria-label="Content editor" disabled={saving}>
                  <ToggleButton value="rich" sx={{ textTransform: "none" }}>Rich text</ToggleButton>
                  <ToggleButton value="html" sx={{ textTransform: "none" }}>HTML code</ToggleButton>
                </ToggleButtonGroup>
              )}
            </Stack>
            {draft.type === "html" && draft.contentMode === "rich" && RICH_TEXT_LOSES.test(draft.content) && (
              <Alert severity="warning">
                This content has images or layout the rich-text editor cannot keep: typing here removes them. Use HTML code to keep them.
              </Alert>
            )}
            {draft.type === "html" && draft.contentMode === "rich" ? (
              <MarketingRichTextEditor label="Dynamic Content text" value={draft.content} onChange={(value) => set("content", value)} disabled={saving}
                error={fieldErrors.content} helperText="Headings, bold, italic, lists and links. Switch to HTML code for images or layout." />
            ) : (
              <TextField label={draft.type === "html" ? "HTML" : "Text"} value={draft.content} onChange={(event) => set("content", event.target.value)}
                disabled={saving} multiline minRows={8} inputProps={{ maxLength: CONTENT_MAX_LENGTH, style: draft.type === "html" ? { fontFamily: "monospace", fontSize: 13 } : undefined }}
                error={Boolean(fieldErrors.content)}
                helperText={fieldErrors.content || (draft.type === "html" ? "Images, links and layout are fine; script is not." : "Shown exactly as typed.")} />
            )}
            <Typography variant="caption" color="text.secondary">Contact tokens such as {"{contactfield=firstname}"} are filled in for known visitors.</Typography>
          </Section>

          <Section title="Advanced" help="Optional. UTM tags are added to the links in the content.">
            <TextField label="Language" size="small" value={draft.language} disabled={saving} onChange={(event) => set("language", event.target.value)}
              error={Boolean(fieldErrors.language)} helperText={fieldErrors.language || "A language code such as en or fr_FR."} sx={{ maxWidth: 240 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {[["utmSource", "UTM source"], ["utmMedium", "UTM medium"], ["utmCampaign", "UTM campaign"], ["utmContent", "UTM content"]].map(([key, label]) => (
                <TextField key={key} label={label} size="small" value={draft.utmTags[key]} disabled={saving}
                  onChange={(event) => set("utmTags", { ...draft.utmTags, [key]: event.target.value })} />
              ))}
            </Box>
          </Section>
        </Stack>

        <Box sx={{ position: { xl: "sticky" }, top: { xl: 16 }, minWidth: 0 }}>
          <Section title="Preview">
            <ContentPreviewFrame content={draft.content} type={draft.type} />
            <Typography variant="caption" color="text.secondary">The content as it fills its slot, over a sample page.</Typography>
          </Section>
        </Box>
      </Box>
      <UnsavedChangesDialog guard={guard} />
    </Stack>
  );
}
