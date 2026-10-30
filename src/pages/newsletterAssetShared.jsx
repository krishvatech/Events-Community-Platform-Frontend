// Shared pieces of the Marketing Hub Assets pages (list, editor, details).
// Assets live in Mautic. Uploads and remote links are sent to the bridge as
// the admin's own Mautic user, which stores the file itself and checks it.

import React, { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { deleteNewsletterAsset } from "../services/newsletterService";
import { getErrorMessage } from "./newsletterTemplateShared.jsx";

export { CARD_BORDER, NAVY, PAGE_SIZE, formatDateTime, getErrorMessage } from "./newsletterTemplateShared.jsx";

export const ASSETS_PATH = "/admin/newsletter/assets";
export const ASSET_NEW_PATH = `${ASSETS_PATH}/new`;
export const assetPath = (id) => `${ASSETS_PATH}/${encodeURIComponent(id)}`;
export const assetEditPath = (id) => `${assetPath(id)}/edit`;

export const isValidAssetId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

export const TITLE_MAX_LENGTH = 191;
export const DESCRIPTION_MAX_LENGTH = 5000;

export function formatBytes(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
  return `${(size / 1024 ** power).toLocaleString(undefined, { maximumFractionDigits: power ? 1 : 0 })} ${units[power]}`;
}

export const fileExtension = (name) => {
  const clean = String(name || "").split(/[\\/]/).pop();
  return clean.includes(".") ? clean.split(".").pop().toLowerCase() : "";
};

/** A title from a file name: "annual-report_2026.pdf" -> "annual report 2026". */
export const titleFromFileName = (name) =>
  String(name || "").split(/[\\/]/).pop().replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

export const blankAsset = {
  title: "",
  description: "",
  language: "en",
  category: "",
  isPublished: false,
  publishUp: "",
  publishDown: "",
  disallow: false,
};

// "2026-11-01T09:00:00+00:00" -> "2026-11-01T09:00" for <input type="datetime-local"> (UTC).
const toLocalInput = (value) => (value ? String(value).slice(0, 16) : "");

export const assetToDraft = (asset) => ({
  title: asset?.title || "",
  description: asset?.description || "",
  language: asset?.language || "en",
  category: asset?.category?.id ? String(asset.category.id) : "",
  isPublished: Boolean(asset?.isPublished),
  publishUp: toLocalInput(asset?.publishUp),
  publishDown: toLocalInput(asset?.publishDown),
  disallow: Boolean(asset?.disallow),
});

/** The first problem with the form, or "". `source` is "upload" or "remote". */
export function validateAssetDraft(draft, { source, file, remoteUrl, creating, config }) {
  if (!draft.title.trim()) return "Give the asset a title.";
  if (draft.title.trim().length > TITLE_MAX_LENGTH) return `The title can be at most ${TITLE_MAX_LENGTH} characters.`;
  if (draft.description.length > DESCRIPTION_MAX_LENGTH) return `The description can be at most ${DESCRIPTION_MAX_LENGTH} characters.`;
  if (draft.publishUp && draft.publishDown && draft.publishDown <= draft.publishUp) return "The unpublish date must be after the publish date.";
  if (source === "upload" && file) {
    const allowed = (config?.allowedExtensions || []).map((item) => String(item).toLowerCase());
    if (!allowed.includes(fileExtension(file.name))) return `Files of this type cannot be uploaded. Allowed: ${allowed.join(", ")}.`;
    const maxMb = Number(config?.maxSizeMb || 6);
    if (file.size > maxMb * 1024 * 1024) return `The file is larger than Mautic's limit of ${maxMb} MB.`;
    if (!file.size) return "The file is empty.";
  }
  if (source === "remote" && remoteUrl.trim() && !/^https:\/\/[^\s/]+\/?\S*$/i.test(remoteUrl.trim())) {
    return "Remote files must use an https:// link.";
  }
  if (creating && source === "upload" && !file) return "Choose a file to upload.";
  if (creating && source === "remote" && !remoteUrl.trim()) return "Enter the https:// link to the file.";
  return "";
}

/** FormData for create/update: the details plus a new file or link, if any. */
export function assetFormData(draft, { file, remoteUrl } = {}) {
  const form = new FormData();
  form.append("title", draft.title.trim());
  form.append("description", draft.description.trim());
  form.append("language", draft.language.trim() || "en");
  form.append("category", draft.category || "");
  form.append("isPublished", draft.isPublished ? "1" : "0");
  form.append("publishUp", draft.publishUp ? draft.publishUp.replace("T", " ") : "");
  form.append("publishDown", draft.publishDown ? draft.publishDown.replace("T", " ") : "");
  form.append("disallow", draft.disallow ? "1" : "0");
  if (file) form.append("file", file, file.name);
  if (remoteUrl) form.append("remoteUrl", remoteUrl.trim());
  return form;
}

export function AssetStatusChip({ published, size = "small" }) {
  return (
    <Chip
      size={size}
      label={published ? "Published" : "Unpublished"}
      color={published ? "success" : "default"}
      variant={published ? "filled" : "outlined"}
    />
  );
}

export function AssetDeleteDialog({ asset, open, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = asset?.title || `Asset #${asset?.id}`;

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteNewsletterAsset(asset.id);
      onDeleted?.(asset, `"${name}" was deleted.`);
    } catch (err) {
      setError(getErrorMessage(err, "The asset could not be deleted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Delete asset?</DialogTitle>
      <DialogContent>
        <Typography>{`Delete "${name}" and its file from Mautic?`}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Links to it in emails and landing pages stop working.
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button onClick={remove} color="error" variant="contained" disabled={busy} sx={{ textTransform: "none" }}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
