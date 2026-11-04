import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import MauticCategoryPicker from "../components/marketing/MauticCategoryPicker.jsx";
import PublishWindowFields from "../components/marketing/PublishWindowFields.jsx";
import { UnsavedChangesDialog, useUnsavedChangesGuard } from "../components/marketing/UnsavedChangesGuard.jsx";
import {
  createNewsletterFocusItem,
  getNewsletterFocusItem,
  listNewsletterForms,
  previewNewsletterFocusItem,
  updateNewsletterFocusItem,
} from "../services/newsletterService";
import {
  CARD_BORDER,
  COLOR_FIELDS,
  CSS_MAX_LENGTH,
  FOCUS_PATH,
  FONT_OPTIONS,
  FREQUENCY_OPTIONS,
  FocusPreviewFrame,
  NAME_MAX_LENGTH,
  NAVY,
  PLACEMENT_OPTIONS,
  STYLE_OPTIONS,
  TEXT_MAX_LENGTH,
  TYPE_OPTIONS,
  WHEN_OPTIONS,
  blankFocus,
  defaultTextColor,
  draftToPayload,
  focusPath,
  focusToDraft,
  getErrorMessage,
  isLightColor,
  isValidFocusId,
  previewPayload,
  validateFocusDraft,
} from "./newsletterFocusShared.jsx";

function Section({ title, help, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
      {help && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{help}</Typography>}
      <Stack spacing={2} sx={{ mt: help ? 0 : 2 }}>{children}</Stack>
    </Paper>
  );
}

function ChoiceCards({ label, options, value, onChange, disabled }) {
  return (
    <ToggleButtonGroup exclusive value={value} onChange={(_, next) => next && onChange(next)} aria-label={label} disabled={disabled}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: `repeat(${Math.min(options.length, 4)}, 1fr)` }, gap: 1,
        "& .MuiToggleButtonGroup-grouped": { border: `1px solid ${CARD_BORDER} !important`, borderRadius: "8px !important", m: 0 } }}>
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value} aria-label={option.label}
          sx={{ textTransform: "none", display: "block", textAlign: "left", p: 1.5, "&.Mui-selected": { borderColor: `${NAVY} !important`, bgcolor: "#EEF1F7" } }}>
          <Typography sx={{ fontWeight: 800, color: NAVY }}>{option.label}</Typography>
          <Typography variant="body2" color="text.secondary">{option.help}</Typography>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function ColorField({ label, value, onChange, error, disabled }) {
  const hex = String(value || "").replace(/^#/, "");
  return (
    <TextField label={label} value={hex} onChange={(event) => onChange(event.target.value.replace(/^#/, "").slice(0, 6))} disabled={disabled}
      error={Boolean(error)} helperText={error || " "} size="small"
      InputProps={{
        startAdornment: (
          <Box component="input" type="color" aria-label={`${label} picker`} value={/^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : "#000000"}
            onChange={(event) => onChange(event.target.value.replace(/^#/, ""))} disabled={disabled}
            sx={{ width: 28, height: 28, p: 0, mr: 1, border: 0, bgcolor: "transparent", cursor: "pointer", flexShrink: 0 }} />
        ),
      }} />
  );
}

/** Rich text for the "Editor" content mode: formatting only, never script. */
function FocusContentEditor({ value, onChange, disabled, error }) {
  const emitted = useRef(value || "");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, link: { openOnClick: false, protocols: ["http", "https"] } })],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? "" : current.getHTML();
      emitted.current = html;
      onChange(html);
    },
  });
  useEffect(() => {
    if (editor && (value || "") !== emitted.current) {
      emitted.current = value || "";
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);
  const addLink = () => {
    const url = window.prompt("Link address (https://…)", editor?.getAttributes("link")?.href || "https://");
    if (url === null || !editor) return;
    if (!url.trim()) editor.chain().focus().unsetLink().run();
    else if (/^https?:\/\//i.test(url.trim())) editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const tool = (label, icon, onClick, active) => (
    <Tooltip title={label}>
      <span><IconButton size="small" aria-label={label} aria-pressed={Boolean(active)} onClick={onClick} disabled={disabled || !editor}
        color={active ? "primary" : "default"}>{icon}</IconButton></span>
    </Tooltip>
  );
  return (
    <Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: error ? "error.main" : CARD_BORDER }}>
        <Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderBottom: `1px solid ${CARD_BORDER}` }}>
          {tool("Bold", <FormatBoldRoundedIcon fontSize="small" />, () => editor.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
          {tool("Italic", <FormatItalicRoundedIcon fontSize="small" />, () => editor.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
          {tool("Bulleted list", <FormatListBulletedRoundedIcon fontSize="small" />, () => editor.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"))}
          {tool("Link", <LinkRoundedIcon fontSize="small" />, addLink, editor?.isActive("link"))}
        </Stack>
        <Box sx={{ p: 1.5, minHeight: 140, "& .ProseMirror": { outline: "none", minHeight: 120 } }} aria-label="Focus Item content">
          <EditorContent editor={editor} />
        </Box>
      </Paper>
      <Typography variant="caption" color={error ? "error" : "text.secondary"}>
        {error || "Formatted text and links. The colours and font below still apply."}
      </Typography>
    </Box>
  );
}

export default function AdminNewsletterFocusEditorPage() {
  const { focusId } = useParams();
  const navigate = useNavigate();
  const editing = focusId !== undefined;
  const [focus, setFocus] = useState(null);
  const [draft, setDraft] = useState(blankFocus);
  const [baseline, setBaseline] = useState(() => JSON.stringify(blankFocus()));
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [forms, setForms] = useState({ loading: true, rows: [], error: "" });
  const [preview, setPreview] = useState({ document: "", loading: false, error: "" });
  const previewSeq = useRef(0);

  useEffect(() => {
    if (!editing) return undefined;
    if (!isValidFocusId(focusId)) {
      setLoadError("This Focus Item link is not valid.");
      setLoading(false);
      return undefined;
    }
    let active = true;
    getNewsletterFocusItem(focusId)
      .then((data) => {
        if (!active) return;
        const next = focusToDraft(data);
        setFocus(data);
        setDraft(next);
        setBaseline(JSON.stringify(next));
      })
      .catch((err) => active && setLoadError(getErrorMessage(err, "We could not load this Focus Item from Mautic.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [editing, focusId]);

  useEffect(() => {
    let active = true;
    listNewsletterForms({ status: "published", page_size: 100, sort: "name" })
      .then((data) => active && setForms({ loading: false, rows: Array.isArray(data?.results) ? data.results : [], error: "" }))
      .catch(() => active && setForms({ loading: false, rows: [], error: "Published Forms could not be loaded." }));
    return () => {
      active = false;
    };
  }, []);

  const payload = useMemo(() => draftToPayload(draft), [draft]);
  const previewKey = JSON.stringify(previewPayload(draft));

  // Mautic renders the preview; ask again shortly after the last change.
  useEffect(() => {
    if (loading || loadError) return undefined;
    const seq = ++previewSeq.current;
    const timer = setTimeout(() => {
      setPreview((current) => ({ ...current, loading: true }));
      previewNewsletterFocusItem(JSON.parse(previewKey))
        .then((data) => seq === previewSeq.current && setPreview({ document: data?.document || "", loading: false, error: "" }))
        .catch((err) => seq === previewSeq.current
          && setPreview((current) => ({ ...current, loading: false, error: getErrorMessage(err, "The preview could not be loaded.") })));
    }, 450);
    return () => clearTimeout(timer);
  }, [previewKey, loading, loadError]);

  const dirty = JSON.stringify(draft) !== baseline;
  const guard = useUnsavedChangesGuard(dirty && !saving);

  const set = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };
  const setProp = (path, value) => {
    setDraft((current) => {
      const properties = { ...current.properties };
      if (path.length === 1) properties[path[0]] = value;
      else properties[path[0]] = { ...properties[path[0]], [path[1]]: value };
      return { ...current, properties };
    });
    const key = path[0] === "colors" ? `colors.${path[1]}` : path[path.length - 1];
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  // A text colour still on the old style's default follows the new style.
  const changeStyle = (style) => {
    setDraft((current) => {
      const { colors } = current.properties;
      const keep = colors.text.toLowerCase() !== defaultTextColor(current.style);
      return { ...current, style, properties: { ...current.properties, colors: { ...colors, text: keep ? colors.text : defaultTextColor(style) } } };
    });
  };

  const save = async () => {
    if (savingRef.current) return;
    const errors = validateFocusDraft(draft);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      setSaveError("Fix the highlighted fields first.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const saved = editing ? await updateNewsletterFocusItem(focusId, payload) : await createNewsletterFocusItem(payload);
      guard.allowNavigation();
      navigate(focusPath(saved.id), { state: { flash: editing ? "Focus Item saved." : "Focus Item created. It starts unpublished until you publish it." } });
    } catch (err) {
      const field = err?.response?.data?.field;
      const message = getErrorMessage(err, "The Focus Item could not be saved.");
      if (field) setFieldErrors((current) => ({ ...current, [field]: message }));
      setSaveError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const backTo = editing && isValidFocusId(focusId) ? focusPath(focusId) : FOCUS_PATH;
  // Raw HTML (built in Mautic) cannot be saved here; saving would turn it into a builder item.
  const rawHtml = focus?.htmlMode === "html";
  if (loading) return <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}><CircularProgress aria-label="Loading Focus Item" /></Box>;
  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to={FOCUS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Back to Focus Items</Button>
      </Stack>
    );
  }

  const { properties } = draft;
  const content = properties.content;
  const placements = PLACEMENT_OPTIONS[draft.style] || [];
  const styleProps = properties[draft.style] || {};
  const formOptions = forms.rows;
  const currentForm = focus?.form;
  const formMissing = draft.form && !forms.loading && !formOptions.some((form) => String(form.id) === String(draft.form));

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={backTo} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>
            {editing ? "Back to Focus Item" : "Back to Focus Items"}
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
            {editing ? `Edit ${focus?.name || "Focus Item"}` : "New Focus Item"}
          </Typography>
          <Typography color="text.secondary">Saved in Mautic as your own Mautic user. The preview updates as you type.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />} onClick={save}
            disabled={saving || rawHtml} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : editing ? "Save" : "Create Focus Item"}
          </Button>
        </Stack>
      </Stack>
      {saveError && <Alert severity="error" onClose={() => setSaveError("")}>{saveError}</Alert>}
      {rawHtml && (
        <Alert severity="info">
          This Focus Item was built in Mautic's raw HTML mode. Because Focus Items run on public websites, raw HTML can't be edited here: edit it in
          Mautic, or create a new Focus Item with the builder. You can still publish, unpublish or delete it from its details page.
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Section title="Basics">
            <TextField label="Name" value={draft.name} onChange={(event) => set("name", event.target.value)} required disabled={saving}
              inputProps={{ maxLength: NAME_MAX_LENGTH }} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name || "Only admins see the name."} />
            <TextField label="Description" value={draft.description} onChange={(event) => set("description", event.target.value)} disabled={saving}
              multiline minRows={2} helperText="Optional notes for your team." />
            <MauticCategoryPicker bundle="plugin:focus" value={draft.category} current={draft.categoryInfo} disabled={saving}
              onChange={(value) => set("category", value)} helperText={fieldErrors.category || "Optional."} />
            <FormControlLabel control={<Switch checked={draft.isPublished} onChange={(event) => set("isPublished", event.target.checked)} disabled={saving} />}
              label={draft.isPublished ? "Published: shown on pages that include it" : "Unpublished: shown nowhere yet"} />
            <PublishWindowFields start={draft.publishUp} end={draft.publishDown} disabled={saving} errors={fieldErrors}
              onChange={({ start, end }) => setDraft((current) => ({ ...current, publishUp: start, publishDown: end }))} />
          </Section>

          <Section title="What it does">
            <ChoiceCards label="What it does" options={TYPE_OPTIONS} value={draft.type} onChange={(value) => set("type", value)} disabled={saving} />
            {draft.type === "form" && (
              <TextField select label="Form to show" value={formMissing ? "" : draft.form} onChange={(event) => set("form", event.target.value)}
                disabled={saving || forms.loading} required error={Boolean(fieldErrors.form || forms.error || formMissing)}
                helperText={fieldErrors.form || forms.error || (formMissing ? `${currentForm?.name || "The saved Form"} is no longer published. Choose another.` : "Published Mautic Forms only. Submissions go to Mautic as usual.")}
                SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                <MenuItem value="" disabled>Choose a Form</MenuItem>
                {formOptions.map((form) => <MenuItem key={form.id} value={String(form.id)}>{form.name || `Form #${form.id}`}</MenuItem>)}
              </TextField>
            )}
          </Section>

          <Section title="Look and position">
            <ChoiceCards label="Style" options={STYLE_OPTIONS} value={draft.style} onChange={changeStyle} disabled={saving} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {placements.length > 0 && (
                <TextField select label="Position" value={styleProps.placement || placements[0][0]} disabled={saving} fullWidth
                  onChange={(event) => setProp([draft.style, "placement"], event.target.value)}>
                  {placements.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </TextField>
              )}
              {draft.style === "bar" && (
                <TextField select label="Bar size" value={properties.bar.size} disabled={saving} fullWidth onChange={(event) => setProp(["bar", "size"], event.target.value)}>
                  <MenuItem value="large">Large</MenuItem>
                  <MenuItem value="regular">Regular</MenuItem>
                </TextField>
              )}
            </Stack>
            {draft.style === "bar" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                <FormControlLabel control={<Switch checked={Boolean(properties.bar.allow_hide)} onChange={(event) => setProp(["bar", "allow_hide"], event.target.checked)} disabled={saving} />} label="Visitors can hide it" />
                <FormControlLabel control={<Switch checked={Boolean(properties.bar.push_page)} onChange={(event) => setProp(["bar", "push_page"], event.target.checked)} disabled={saving} />} label="Push the page down" />
                <FormControlLabel control={<Switch checked={Boolean(properties.bar.sticky)} onChange={(event) => setProp(["bar", "sticky"], event.target.checked)} disabled={saving} />} label="Stay on screen when scrolling" />
              </Stack>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2 }}>
              {COLOR_FIELDS.map(([key, label]) => (
                <ColorField key={key} label={label} value={properties.colors[key]} disabled={saving} error={fieldErrors[`colors.${key}`]}
                  onChange={(value) => setProp(["colors", key], value)} />
              ))}
            </Box>
            {draft.style !== "bar" && draft.htmlMode === "basic" && isLightColor(properties.colors.text) && (
              <Alert severity="warning">This style shows a white box, so very light text will be hard to read. Choose a darker text colour.</Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select label="Font" value={content.font} disabled={saving} fullWidth onChange={(event) => setProp(["content", "font"], event.target.value)}>
                {FONT_OPTIONS.map(([label, value]) => <MenuItem key={value} value={value} sx={{ fontFamily: value }}>{label}</MenuItem>)}
              </TextField>
              <FormControlLabel sx={{ minWidth: 180 }} control={<Switch checked={Boolean(properties.animate)} onChange={(event) => setProp(["animate"], event.target.checked)} disabled={saving} />} label="Animate in" />
            </Stack>
          </Section>

          <Section title="Content">
            <ToggleButtonGroup exclusive size="small" value={draft.htmlMode} onChange={(_, value) => value && set("htmlMode", value)} aria-label="Content mode" disabled={saving}>
              <ToggleButton value="basic" sx={{ textTransform: "none" }}>Builder</ToggleButton>
              <ToggleButton value="editor" sx={{ textTransform: "none" }}>Rich text</ToggleButton>
            </ToggleButtonGroup>
            {draft.htmlMode === "basic" ? (
              <>
                <TextField label="Headline" value={content.headline} onChange={(event) => setProp(["content", "headline"], event.target.value)} disabled={saving}
                  inputProps={{ maxLength: TEXT_MAX_LENGTH }} error={Boolean(fieldErrors.headline)} helperText={fieldErrors.headline || " "} />
                <TextField label="Text" value={content.tagline} onChange={(event) => setProp(["content", "tagline"], event.target.value)} disabled={saving}
                  inputProps={{ maxLength: TEXT_MAX_LENGTH }} error={Boolean(fieldErrors.tagline)} helperText={fieldErrors.tagline || "Optional second line."} />
              </>
            ) : (
              <FocusContentEditor value={draft.editor} onChange={(value) => set("editor", value)} disabled={saving} error={fieldErrors.editor} />
            )}
            {draft.type === "link" && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Button text" value={content.link_text} onChange={(event) => setProp(["content", "link_text"], event.target.value)} disabled={saving}
                  required={draft.htmlMode === "basic"} inputProps={{ maxLength: TEXT_MAX_LENGTH }} error={Boolean(fieldErrors.link_text)} helperText={fieldErrors.link_text || " "} fullWidth />
                <TextField label="Button link" value={content.link_url} onChange={(event) => setProp(["content", "link_url"], event.target.value)} disabled={saving}
                  required={draft.htmlMode === "basic"} placeholder="https://" error={Boolean(fieldErrors.link_url)} helperText={fieldErrors.link_url || "Clicks are tracked."} fullWidth />
              </Stack>
            )}
            {draft.type === "link" && (
              <FormControlLabel control={<Switch checked={Boolean(content.link_new_window)} onChange={(event) => setProp(["content", "link_new_window"], event.target.checked)} disabled={saving} />} label="Open the link in a new tab" />
            )}
          </Section>

          <Section title="When it shows">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select label="Show it" value={properties.when} disabled={saving} fullWidth onChange={(event) => setProp(["when"], event.target.value)}>
                {WHEN_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
              <TextField label="Delay (seconds)" value={properties.timeout} disabled={saving} onChange={(event) => setProp(["timeout"], event.target.value.replace(/\D/g, "").slice(0, 4))}
                error={Boolean(fieldErrors.timeout)} helperText={fieldErrors.timeout || "Optional wait after the trigger."} sx={{ minWidth: { sm: 180 } }} />
            </Stack>
            <TextField select label="How often" value={properties.frequency} disabled={saving} onChange={(event) => setProp(["frequency"], event.target.value)}>
              {FREQUENCY_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Switch checked={Boolean(properties.stop_after_conversion)} onChange={(event) => setProp(["stop_after_conversion"], event.target.checked)} disabled={saving} />}
              label={draft.type === "form" ? "Stop after the visitor submits the Form" : "Stop after the visitor clicks"} />
            <FormControlLabel control={<Switch checked={Boolean(properties.stop_after_close)} onChange={(event) => setProp(["stop_after_close"], event.target.checked)} disabled={saving} />}
              label="Stop after the visitor closes it" />
          </Section>

          <Section title="Advanced" help="Optional. Leave these empty unless you need them.">
            <TextField label="Website" value={draft.website} onChange={(event) => set("website", event.target.value)} disabled={saving} placeholder="https://"
              error={Boolean(fieldErrors.website)} helperText={fieldErrors.website || "The site it is meant for, for your team's reference."} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {[["utmSource", "UTM source"], ["utmMedium", "UTM medium"], ["utmCampaign", "UTM campaign"], ["utmContent", "UTM content"]].map(([key, label]) => (
                <TextField key={key} label={label} size="small" value={draft.utmTags[key]} disabled={saving}
                  onChange={(event) => set("utmTags", { ...draft.utmTags, [key]: event.target.value })} />
              ))}
            </Box>
            <TextField label="Custom CSS" value={content.css} onChange={(event) => setProp(["content", "css"], event.target.value)} disabled={saving}
              multiline minRows={3} inputProps={{ maxLength: CSS_MAX_LENGTH, style: { fontFamily: "monospace", fontSize: 13 } }}
              error={Boolean(fieldErrors.css)} helperText={fieldErrors.css || "Styles only; applied inside the Focus Item."} />
          </Section>
        </Stack>

        <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 }, minWidth: 0 }}>
          <Section title="Preview">
            <FocusPreviewFrame document={preview.document} loading={preview.loading} error={preview.error} />
          </Section>
        </Box>
      </Box>
      <UnsavedChangesDialog guard={guard} />
    </Stack>
  );
}
