// Shared pieces of the Marketing Hub Dynamic Content pages (list, editor, details).
// Dynamic Content is a page block that changes per visitor: shown by rules
// (contact fields) in a named slot, or chosen by a campaign. Saves go to the
// bridge as the admin's own Mautic user; the content may not run script.

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { deleteNewsletterDynamicContent } from "../services/newsletterService";
import { findActiveContent } from "../components/marketing/landingPageDocument";
import { fromLocalInput, toLocalInput } from "../components/marketing/PublishWindowFields.jsx";
import { hydrateFilterRows, toFilterPayload, validateFilterRows } from "./mauticSegmentFilters";
import { getErrorMessage } from "./newsletterTemplateShared.jsx";

export { CARD_BORDER, NAVY, PAGE_SIZE, formatDateTime, getErrorMessage } from "./newsletterTemplateShared.jsx";
export { CopyField, FocusStatusChip as PublishStatusChip } from "./newsletterFocusShared.jsx";

export const DYNAMIC_CONTENT_PATH = "/admin/newsletter/dynamic-content";
export const DYNAMIC_CONTENT_NEW_PATH = `${DYNAMIC_CONTENT_PATH}/new`;
export const dynamicContentPath = (id) => `${DYNAMIC_CONTENT_PATH}/${encodeURIComponent(id)}`;
export const dynamicContentEditPath = (id) => `${dynamicContentPath(id)}/edit`;
export const isValidDynamicContentId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

export const NAME_MAX_LENGTH = 191;
export const CONTENT_MAX_LENGTH = 200000;
export const SLOT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

export const MODE_OPTIONS = [
  { value: "rules", label: "Shown by rules", help: "Fills a named slot for visitors whose contact details match your rules." },
  { value: "campaign", label: "Chosen by a campaign", help: "A campaign's Request / Push dynamic content steps decide who sees it." },
];
export const modeLabel = (item) => (item?.isCampaignBased ? "Chosen by a campaign" : "Shown by rules");

/** A slot name from a title: "Home page banner!" -> "home-page-banner". */
export const slotFromName = (name) =>
  String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

export const blankDynamicContent = () => ({
  name: "",
  description: "",
  isCampaignBased: false,
  slotName: "",
  filters: [],
  type: "html",
  content: "",
  contentMode: "rich",
  category: null,
  categoryInfo: null,
  isPublished: false,
  publishUp: "",
  publishDown: "",
  language: "en",
  utmTags: { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "" },
});

export const dynamicContentToDraft = (item) => ({
  name: item?.name || "",
  description: item?.description || "",
  isCampaignBased: Boolean(item?.isCampaignBased),
  slotName: item?.slotName || "",
  filters: hydrateFilterRows(item?.filters),
  type: item?.type === "text" ? "text" : "html",
  content: item?.content || "",
  // Saved HTML opens as HTML, so nothing the rich-text editor cannot keep is lost.
  contentMode: item?.content ? "html" : "rich",
  category: item?.category?.id || null,
  categoryInfo: item?.category || null,
  isPublished: Boolean(item?.isPublished),
  publishUp: toLocalInput(item?.publishUp),
  publishDown: toLocalInput(item?.publishDown),
  language: item?.language || "en",
  utmTags: { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", ...(item?.utmTags || {}) },
});

/** The API body: every field is sent; a campaign item has no slot and no rules. */
export const draftToPayload = (draft) => ({
  name: draft.name.trim(),
  description: draft.description.trim(),
  isCampaignBased: Boolean(draft.isCampaignBased),
  slotName: draft.isCampaignBased ? "" : draft.slotName.trim(),
  filters: draft.isCampaignBased ? [] : toFilterPayload(draft.filters),
  type: draft.type,
  content: draft.content,
  category: draft.category || null,
  isPublished: Boolean(draft.isPublished),
  publishUp: fromLocalInput(draft.publishUp),
  publishDown: fromLocalInput(draft.publishDown),
  language: draft.language.trim() || "en",
  utmTags: Object.fromEntries(Object.entries(draft.utmTags).map(([key, value]) => [key, String(value || "").trim()])),
});

/** Per-field problems ({} when the draft can be saved). `metadataIndex` checks rules when it has loaded. */
export function validateDynamicContentDraft(draft, metadataIndex) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the Dynamic Content item a name.";
  else if (name.length > NAME_MAX_LENGTH) errors.name = `The name can be at most ${NAME_MAX_LENGTH} characters.`;
  if (!draft.isCampaignBased) {
    const slot = draft.slotName.trim();
    if (!slot) errors.slotName = "Give the slot a name: it is how a page asks for this content.";
    else if (!SLOT_PATTERN.test(slot)) errors.slotName = 'Letters, numbers, "-" and "_" only, such as homepage-banner.';
    if (!draft.filters.length) errors.filters = "Add at least one rule.";
    else if (metadataIndex) {
      const issues = validateFilterRows(draft.filters, metadataIndex);
      if (issues.length) errors.filters = issues.map((issue) => issue.message.replace(/^Filter /, "Rule ")).join(" ");
    }
  }
  if (draft.content.length > CONTENT_MAX_LENGTH) errors.content = "The content is too long.";
  else if (draft.content.includes("{dwc=")) errors.content = "The content cannot contain another {dwc=…} token.";
  else {
    const active = findActiveContent(draft.content);
    if (active.length) errors.content = `The content is shown on public pages, so it cannot contain ${active.join("; ")}.`;
  }
  if (draft.publishUp && draft.publishDown && new Date(draft.publishDown) <= new Date(draft.publishUp)) {
    errors.publishDown = "The unpublish date must be after the publish date.";
  }
  return errors;
}

const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The content inside a sample page, for a sandboxed frame (no script). */
export const contentPreviewDocument = (content, type) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body{margin:0;background:#F3F5F8;font-family:Arial,Helvetica,sans-serif;color:#1B2A4A}
.page{max-width:760px;margin:0 auto;padding:24px}
i{display:block;height:12px;border-radius:6px;background:#DDE3EA;margin:0 0 12px}
.slot{border:1px dashed #8A97A8;background:#fff;border-radius:8px;padding:16px;margin:20px 0}
.slot-label{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8A97A8;margin-bottom:8px}
</style></head><body><div class="page"><i style="width:40%;height:18px"></i><i></i><i style="width:85%"></i>
<div class="slot"><div class="slot-label">Dynamic Content</div>${type === "text" ? `<div style="white-space:pre-wrap">${escapeHtml(content)}</div>` : content || "<p style='color:#8A97A8'>No content yet.</p>"}</div>
<i style="width:70%"></i><i style="width:55%"></i></div></body></html>`;

export function ContentPreviewFrame({ content, type, height = 380 }) {
  return (
    <Paper variant="outlined" sx={{ height, overflow: "hidden", borderRadius: 2, bgcolor: "#EEF1F4" }}>
      <iframe title="Dynamic Content preview" sandbox="" srcDoc={contentPreviewDocument(content, type)}
        style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
    </Paper>
  );
}

/** Campaign steps that use the item, and landing pages that show its slot. */
export function DynamicContentUsageList({ usage }) {
  const campaigns = usage?.campaigns || [];
  const pages = usage?.pages || [];
  if (!campaigns.length && !pages.length) return <Typography color="text.secondary">Not used by any campaign or landing page.</Typography>;
  const roleText = (roles) => (roles || []).map((role) => (role === "default" ? '"Request dynamic content" default' : '"Push dynamic content"')).join(" and ");
  return (
    <List dense disablePadding aria-label="Used in">
      {campaigns.map((campaign) => (
        <ListItem key={`c${campaign.id}`} disableGutters>
          <ListItemText
            primary={<Link component={RouterLink} to={`/admin/newsletter/builder/${campaign.id}`}>{campaign.name || `Campaign #${campaign.id}`}</Link>}
            secondary={`Campaign ${roleText(campaign.roles)} step${campaign.published ? "" : " · unpublished"}`}
          />
        </ListItem>
      ))}
      {pages.map((page) => (
        <ListItem key={`p${page.id}`} disableGutters>
          <ListItemText
            primary={<Link component={RouterLink} to={`/admin/newsletter/pages/${page.id}`}>{page.title || `Landing page #${page.id}`}</Link>}
            secondary={`Landing page with this slot${page.published ? "" : " · unpublished"}`}
          />
        </ListItem>
      ))}
    </List>
  );
}

export function DynamicContentDeleteDialog({ item, open, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState(null);
  const name = item?.name || `Dynamic Content #${item?.id}`;

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
      await deleteNewsletterDynamicContent(item.id);
      setUsage(null);
      onDeleted?.(item, `"${name}" was deleted.`);
    } catch (err) {
      setUsage(err?.response?.status === 409 ? err.response.data?.usage || null : null);
      setError(getErrorMessage(err, "The Dynamic Content item could not be deleted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Dynamic Content?</DialogTitle>
      <DialogContent>
        <Typography>{`Delete "${name}" from Mautic? This cannot be undone.`}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Pages that show its slot fall back to their default content.</Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {usage && <Box sx={{ mt: 1 }}><DynamicContentUsageList usage={usage} /></Box>}
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
