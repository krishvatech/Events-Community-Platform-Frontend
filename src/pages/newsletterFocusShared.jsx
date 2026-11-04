// Shared pieces of the Marketing Hub Focus Items pages (list, editor, details).
// Focus Items are Mautic's website pop-ups and bars. Saves go to the bridge as
// the admin's own Mautic user, which refuses raw HTML, script and non-http(s)
// links, because a Focus Item runs on public websites.

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DesktopWindowsRoundedIcon from "@mui/icons-material/DesktopWindowsRounded";
import SmartphoneRoundedIcon from "@mui/icons-material/SmartphoneRounded";
import { Link as RouterLink } from "react-router-dom";

import { deleteNewsletterFocusItem } from "../services/newsletterService";
import { findActiveContent } from "../components/marketing/landingPageDocument";
import { fromLocalInput, toLocalInput } from "../components/marketing/PublishWindowFields.jsx";
import { getErrorMessage } from "./newsletterTemplateShared.jsx";

export { CARD_BORDER, NAVY, PAGE_SIZE, formatDateTime, getErrorMessage } from "./newsletterTemplateShared.jsx";

export const FOCUS_PATH = "/admin/newsletter/focus-items";
export const FOCUS_NEW_PATH = `${FOCUS_PATH}/new`;
export const focusPath = (id) => `${FOCUS_PATH}/${encodeURIComponent(id)}`;
export const focusEditPath = (id) => `${focusPath(id)}/edit`;
export const isValidFocusId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

export const NAME_MAX_LENGTH = 191;
export const TEXT_MAX_LENGTH = 255;
export const CSS_MAX_LENGTH = 20000;

export const TYPE_OPTIONS = [
  { value: "link", label: "Highlight a link", help: "A message with a button that opens a page." },
  { value: "notice", label: "Show a notice", help: "A message only, without a button." },
  { value: "form", label: "Collect data", help: "Shows one of your published Mautic Forms." },
];
export const STYLE_OPTIONS = [
  { value: "bar", label: "Bar", help: "A slim bar across the top or bottom of the page." },
  { value: "modal", label: "Pop-up", help: "A box over the page." },
  { value: "notification", label: "Corner", help: "A small box in a corner." },
  { value: "page", label: "Full page", help: "Covers the whole page." },
];
export const PLACEMENT_OPTIONS = {
  bar: [["top", "Top"], ["bottom", "Bottom"]],
  modal: [["top", "Top"], ["middle", "Middle"], ["bottom", "Bottom"]],
  notification: [["top_left", "Top left"], ["top_right", "Top right"], ["bottom_left", "Bottom left"], ["bottom_right", "Bottom right"]],
  page: [],
};
export const WHEN_OPTIONS = [
  ["immediately", "As soon as the page opens"],
  ["scroll_slight", "After scrolling a little"],
  ["scroll_middle", "After scrolling halfway"],
  ["scroll_bottom", "At the bottom of the page"],
  ["leave", "When the visitor is about to leave"],
];
export const FREQUENCY_OPTIONS = [
  ["everypage", "On every page"],
  ["once", "Only once"],
  ["q2min", "At most every 2 minutes"],
  ["q15min", "At most every 15 minutes"],
  ["hourly", "At most once an hour"],
  ["daily", "At most once a day"],
];
export const FONT_OPTIONS = [
  ["Arial", "Arial, Helvetica, sans-serif"],
  ["Arial Black", "'Arial Black', Gadget, sans-serif"],
  ["Arial Narrow", "'Arial Narrow', sans-serif"],
  ["Century Gothic", "Century Gothic, sans-serif"],
  ["Copperplate Gothic Light", "Copperplate / Copperplate Gothic Light, sans-serif"],
  ["Courier New", "'Courier New', Courier, monospace"],
  ["Georgia", "Georgia, Serif"],
  ["Impact", "Impact, Charcoal, sans-serif"],
  ["Lucida Console", "'Lucida Console', Monaco, monospace"],
  ["Lucida Sans Unicode", "'Lucida Sans Unicode', 'Lucida Grande', sans-serif"],
  ["Palatino", "'Palatino Linotype', 'Book Antiqua', Palatino, serif"],
  ["Tahoma", "Tahoma, Geneva, sans-serif"],
  ["Times New Roman", "'Times New Roman', Times, serif"],
  ["Trebuchet MS", "'Trebuchet MS', Helvetica, sans-serif"],
  ["Verdana", "Verdana, Geneva, sans-serif"],
];
export const COLOR_FIELDS = [
  ["primary", "Background colour"],
  ["text", "Text colour"],
  ["button", "Button colour"],
  ["button_text", "Button text colour"],
];

/** Text colour that reads on the style's box: a bar uses its background colour, the others are white boxes (as in Mautic's editor). */
export const defaultTextColor = (style) => (style === "bar" ? "ffffff" : "1b2a4a");

/** Mautic's own light/dark test (FocusModel::isLightColor). */
export const isLightColor = (hex) => {
  const value = String(hex || "").replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return false;
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 >= 200;
};

export const typeLabel = (value) => TYPE_OPTIONS.find((option) => option.value === value)?.label || value || "";
export const styleLabel = (value) => STYLE_OPTIONS.find((option) => option.value === value)?.label || value || "";

export const defaultProperties = () => ({
  bar: { allow_hide: true, push_page: true, sticky: true, size: "large", placement: "top" },
  modal: { placement: "middle" },
  notification: { placement: "bottom_right" },
  page: {},
  animate: true,
  link_activation: true,
  colors: { primary: "1b2a4a", text: "ffffff", button: "fdb933", button_text: "1b2a4a" },
  content: { headline: "", tagline: "", link_text: "", link_url: "", link_new_window: true, font: FONT_OPTIONS[0][1], css: "" },
  when: "immediately",
  timeout: "",
  frequency: "everypage",
  stop_after_conversion: true,
  stop_after_close: false,
});

export const blankFocus = () => ({
  name: "",
  description: "",
  type: "link",
  style: "bar",
  htmlMode: "basic",
  editor: "",
  website: "",
  form: "",
  category: null,
  categoryInfo: null,
  isPublished: false,
  publishUp: "",
  publishDown: "",
  utmTags: { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "" },
  properties: defaultProperties(),
});

const mergeProperties = (stored) => {
  const base = defaultProperties();
  const value = stored && typeof stored === "object" ? stored : {};
  return {
    ...base,
    ...Object.fromEntries(Object.entries(value).filter(([key]) => key in base && typeof base[key] !== "object")),
    bar: { ...base.bar, ...(value.bar || {}) },
    modal: { ...base.modal, ...(value.modal || {}) },
    notification: { ...base.notification, ...(value.notification || {}) },
    page: {},
    colors: { ...base.colors, ...(value.colors || {}) },
    content: { ...base.content, ...(value.content || {}) },
  };
};

export const focusToDraft = (focus) => ({
  name: focus?.name || "",
  description: focus?.description || "",
  type: focus?.type || "link",
  style: focus?.style || "bar",
  htmlMode: focus?.htmlMode === "editor" ? "editor" : "basic",
  editor: focus?.editor || "",
  website: focus?.website || "",
  form: focus?.form?.id ? String(focus.form.id) : "",
  category: focus?.category?.id || null,
  categoryInfo: focus?.category || null,
  isPublished: Boolean(focus?.isPublished),
  publishUp: toLocalInput(focus?.publishUp),
  publishDown: toLocalInput(focus?.publishDown),
  utmTags: { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", ...(focus?.utmTags || {}) },
  properties: mergeProperties(focus?.properties),
});

/** The API body for a draft. Every field is sent; the server changes only what differs. */
export const draftToPayload = (draft) => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  type: draft.type,
  style: draft.style,
  htmlMode: draft.htmlMode,
  editor: draft.editor || "",
  website: draft.website.trim(),
  form: draft.type === "form" && draft.form ? Number(draft.form) : null,
  category: draft.category || null,
  isPublished: Boolean(draft.isPublished),
  publishUp: fromLocalInput(draft.publishUp),
  publishDown: fromLocalInput(draft.publishDown),
  utmTags: Object.fromEntries(Object.entries(draft.utmTags).map(([key, value]) => [key, String(value || "").trim()])),
  properties: {
    ...draft.properties,
    content: {
      ...draft.properties.content,
      headline: draft.properties.content.headline.trim(),
      tagline: draft.properties.content.tagline.trim(),
      link_text: draft.properties.content.link_text.trim(),
      link_url: draft.properties.content.link_url.trim(),
    },
    timeout: String(draft.properties.timeout ?? "").trim(),
  },
});

const PREVIEW_KEYS = ["type", "style", "htmlMode", "editor", "website", "form", "properties"];

/** What the preview renders: the look and content, not the name, dates or category. */
export const previewPayload = (draft) => {
  const payload = draftToPayload(draft);
  return Object.fromEntries(PREVIEW_KEYS.map((key) => [key, payload[key]]));
};

const HTTP_URL = /^https?:\/\/[^\s/?#]+[^\s]*$/i;
const HEX = /^#?[0-9a-fA-F]{6}$/;

/** Per-field problems ({} when the draft can be saved). */
export function validateFocusDraft(draft) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the Focus Item a name.";
  else if (name.length > NAME_MAX_LENGTH) errors.name = `The name can be at most ${NAME_MAX_LENGTH} characters.`;
  if (draft.type === "form" && !draft.form) errors.form = "Choose the published Form to show.";
  if (draft.website.trim() && !HTTP_URL.test(draft.website.trim())) errors.website = "Start the address with http:// or https://.";
  const { content, colors } = draft.properties;
  for (const key of ["headline", "tagline", "link_text"]) {
    if (content[key].trim().length > TEXT_MAX_LENGTH) errors[key] = `At most ${TEXT_MAX_LENGTH} characters.`;
  }
  if (draft.type === "link" && draft.htmlMode === "basic") {
    if (!content.link_url.trim()) errors.link_url = "Enter the page the button opens.";
    if (!content.link_text.trim()) errors.link_text = "Enter the button text.";
  }
  if (content.link_url.trim() && !HTTP_URL.test(content.link_url.trim())) errors.link_url = "Start the link with http:// or https://.";
  for (const [key] of COLOR_FIELDS) {
    if (!HEX.test(String(colors[key] || ""))) errors[`colors.${key}`] = "Use a 6-digit colour such as 1B2A4A.";
  }
  if (content.css.length > CSS_MAX_LENGTH || content.css.includes("<")) errors.css = `At most ${CSS_MAX_LENGTH.toLocaleString()} characters, and no "<".`;
  const timeout = String(draft.properties.timeout ?? "").trim();
  if (timeout && (!/^\d+$/.test(timeout) || Number(timeout) > 3600)) errors.timeout = "Whole seconds, up to 3600.";
  if (draft.htmlMode === "editor") {
    const active = findActiveContent(draft.editor);
    if (active.length) errors.editor = `The content cannot contain ${active.join("; ")}.`;
  }
  if (draft.publishUp && draft.publishDown && new Date(draft.publishDown) <= new Date(draft.publishUp)) {
    errors.publishDown = "The unpublish date must be after the publish date.";
  }
  return errors;
}

export function FocusStatusChip({ focus, size = "small" }) {
  if (!focus?.isPublished) return <Chip size={size} label="Unpublished" variant="outlined" />;
  if (focus.isLive === false) return <Chip size={size} label="Scheduled" color="warning" variant="outlined" />;
  return <Chip size={size} label="Published" color="success" />;
}

export const statLine = (stats) => {
  if (!stats) return "—";
  return `${Number(stats.views || 0).toLocaleString()} views · ${Number(stats.clicks || 0).toLocaleString()} clicks · ${Number(stats.submissions || 0).toLocaleString()} submissions`;
};

/** Mautic's rendering in a sandboxed frame (no script), at desktop or phone width. */
export function FocusPreviewFrame({ document, loading = false, error = "", height = 520 }) {
  const [viewport, setViewport] = useState("desktop");
  return (
    <Stack spacing={1}>
      <ToggleButtonGroup size="small" exclusive value={viewport} onChange={(_, value) => value && setViewport(value)} aria-label="Preview width">
        <ToggleButton value="desktop" aria-label="Desktop preview" sx={{ textTransform: "none", gap: 0.5 }}>
          <DesktopWindowsRoundedIcon fontSize="small" /> Desktop
        </ToggleButton>
        <ToggleButton value="mobile" aria-label="Phone preview" sx={{ textTransform: "none", gap: 0.5 }}>
          <SmartphoneRoundedIcon fontSize="small" /> Phone
        </ToggleButton>
      </ToggleButtonGroup>
      {error && <Alert severity="warning">{error}</Alert>}
      <Paper variant="outlined" sx={{ height, overflow: "hidden", borderRadius: 2, bgcolor: "#EEF1F4", position: "relative" }}>
        <Box sx={{ width: viewport === "mobile" ? 375 : "100%", maxWidth: "100%", height: "100%", mx: "auto", bgcolor: "#fff", opacity: loading ? 0.6 : 1 }}>
          <iframe title="Focus Item preview" sandbox="" srcDoc={document || "<p style='font-family:Arial;color:#667'>Preview appears here.</p>"}
            data-viewport={viewport} style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
        </Box>
      </Paper>
      <Typography variant="caption" color="text.secondary">
        Rendered by Mautic from the settings above, over a sample page. Animations and timing run on the live website only.
      </Typography>
    </Stack>
  );
}

/** A read-only code box with a Copy button. */
export function CopyField({ label, value, helperText, multiline = false }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <TextField
      label={label}
      value={value}
      helperText={copied ? "Copied." : helperText}
      fullWidth
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      InputProps={{
        readOnly: true,
        sx: { fontFamily: "monospace", fontSize: 13 },
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title="Copy">
              <IconButton aria-label={`Copy ${label}`} onClick={copy} edge="end"><ContentCopyRoundedIcon fontSize="small" /></IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}

/** Campaign steps and landing pages that show this Focus Item. */
export function FocusUsageList({ usage }) {
  const campaigns = usage?.campaigns || [];
  const pages = usage?.pages || [];
  if (!campaigns.length && !pages.length) return <Typography color="text.secondary">Not used by any campaign or landing page.</Typography>;
  return (
    <List dense disablePadding aria-label="Used in">
      {campaigns.map((campaign) => (
        <ListItem key={`c${campaign.id}`} disableGutters>
          <ListItemText
            primary={<Link component={RouterLink} to={`/admin/newsletter/builder/${campaign.id}`}>{campaign.name || `Campaign #${campaign.id}`}</Link>}
            secondary={`Campaign "Show focus item" step${campaign.published ? "" : " · unpublished"}`}
          />
        </ListItem>
      ))}
      {pages.map((page) => (
        <ListItem key={`p${page.id}`} disableGutters>
          <ListItemText
            primary={<Link component={RouterLink} to={`/admin/newsletter/pages/${page.id}`}>{page.title || `Landing page #${page.id}`}</Link>}
            secondary={`Landing page${page.published ? "" : " · unpublished"}`}
          />
        </ListItem>
      ))}
    </List>
  );
}

export function FocusDeleteDialog({ focus, open, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState(null);
  const name = focus?.name || `Focus Item #${focus?.id}`;

  const close = () => {
    if (busy) return;
    setError("");
    setUsage(null);
    onClose();
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteNewsletterFocusItem(focus.id);
      setUsage(null);
      onDeleted?.(focus, `"${name}" was deleted.`);
    } catch (err) {
      setUsage(err?.response?.status === 409 ? err.response.data?.usage || null : null);
      setError(getErrorMessage(err, "The Focus Item could not be deleted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Focus Item?</DialogTitle>
      <DialogContent>
        <Typography>{`Delete "${name}" from Mautic? This cannot be undone.`}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Websites that load its embed code stop showing it.</Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {usage && <Box sx={{ mt: 1 }}><FocusUsageList usage={usage} /></Box>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button onClick={remove} color="error" variant="contained" disabled={busy || Boolean(usage)} sx={{ textTransform: "none" }}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
