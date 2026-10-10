// Pure helpers for the Marketing Hub CSV contact import wizard.

// Fallbacks until the server's limits load (fields endpoint `limits`).
export const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MAX_ROWS = 50000;
export const SKIP_TARGET = "";
export const ACTIVE_IMPORT_STORAGE_KEY = "ecp.contactImport.activeImportId";

export const STATE_LABELS = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  failed: "Failed",
  stopped: "Stopped",
  unknown: "Unknown",
};

export const STATE_COLORS = {
  queued: "default",
  processing: "info",
  completed: "success",
  completed_with_errors: "warning",
  failed: "error",
  stopped: "warning",
  unknown: "default",
};

export const isTerminalState = (state) =>
  ["completed", "completed_with_errors", "failed", "stopped"].includes(state);

export const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatCount = (value) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "Unknown"
    : Number(value).toLocaleString();

/** Quick client-side checks; the server parses and validates authoritatively. */
export const checkCsvFile = (file, maxBytes = DEFAULT_MAX_BYTES) => {
  if (!file) return "Choose a CSV file to upload.";
  if (!/\.csv$/i.test(file.name || "")) return "Only .csv files can be imported.";
  if (!file.size) return "The file is empty.";
  if (file.size > maxBytes) return `The file is larger than the ${formatBytes(maxBytes)} limit.`;
  return "";
};

/** Destination aliases chosen by more than one column (fallback columns excluded). */
export const duplicateTargets = (mapping, fallbackColumns = []) => {
  const seen = new Set();
  const duplicates = new Set();
  const fallbacks = new Set(fallbackColumns);
  Object.entries(mapping || {}).forEach(([header, alias]) => {
    if (!alias || fallbacks.has(header)) return;
    if (seen.has(alias)) duplicates.add(alias);
    seen.add(alias);
  });
  return duplicates;
};

/** Mapping payload with every header present ("" = skip), in file order. */
export const mappingPayload = (headers, mapping) =>
  Object.fromEntries((headers || []).map((header) => [header, mapping?.[header] || SKIP_TARGET]));

/** Identity of what was validated; any change invalidates the confirmation. */
export const validationKey = (file, headers, mapping, options) =>
  JSON.stringify({
    file: file ? [file.name, file.size, file.lastModified] : null,
    mapping: mappingPayload(headers, mapping),
    options,
  });

/** Bounded polling: 3s, growing to at most 15s. */
export const nextPollDelay = (attempt) => Math.min(3000 * 1.5 ** Math.max(0, attempt), 15000);

export const readStoredImportId = () => {
  try {
    const value = window.sessionStorage.getItem(ACTIVE_IMPORT_STORAGE_KEY);
    return value && /^\d+$/.test(value) ? Number(value) : null;
  } catch {
    return null;
  }
};

export const storeImportId = (importId) => {
  try {
    if (importId) window.sessionStorage.setItem(ACTIVE_IMPORT_STORAGE_KEY, String(importId));
    else window.sessionStorage.removeItem(ACTIVE_IMPORT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); resuming is a convenience only.
  }
};

export const importErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return fallback;
  return data.detail || fallback;
};

export const TAG_SEPARATORS = ["|", ",", ";"];
export const SEPARATOR_NAMES = { "|": "Pipe", ",": "Comma", ";": "Semicolon" };
// Fields that never take a fallback column (the backend refuses them too).
export const FALLBACK_BLOCKED_TARGETS = ["email", "tags"];

/** Same rules as the backend: split, trim, drop empties, case-insensitive dedupe. */
export const splitTags = (value, separator) => {
  const seen = new Set();
  const tags = [];
  String(value || "")
    .split(separator)
    .map((tag) => tag.trim())
    .forEach((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return;
      seen.add(tag.toLowerCase());
      tags.push(tag);
    });
  return tags;
};

/** The one separator the values use, or null when none or several appear. */
export const detectTagSeparator = (values) => {
  const used = TAG_SEPARATORS.filter((separator) =>
    (values || []).some((value) => String(value || "").includes(separator))
  );
  return used.length === 1 ? used[0] : null;
};

/** Values that contain a separator other than the selected one. */
export const tagSeparatorConflicts = (values, selected) =>
  (values || []).filter((value) =>
    TAG_SEPARATORS.some((separator) => separator !== selected && String(value || "").includes(separator))
  ).length;

/**
 * Fallback flags that still have a primary: another, non-fallback column mapped
 * to the same field. Others are dropped, so the column becomes an ordinary
 * mapping again (or a visible duplicate) instead of a hidden stale flag.
 */
export const pruneFallbacks = (headers, mapping, fallbacks) => {
  const flagged = new Set(fallbacks || []);
  const primaries = (headers || []).filter((header) => mapping?.[header] && !flagged.has(header));
  return (fallbacks || []).filter((header) => {
    const alias = mapping?.[header];
    return (
      alias &&
      !FALLBACK_BLOCKED_TARGETS.includes(alias) &&
      primaries.some((other) => other !== header && mapping[other] === alias)
    );
  });
};

export const MAX_TAG_LENGTH = 191;

/** Why the backend would reject this Tags value, or "" (mirrors its rules). */
export const tagProblem = (value, separator) => {
  const text = String(value || "");
  if (separator !== "|" && text.includes("|")) return "contains '|' but a different separator is selected";
  const tags = text.split(separator).map((tag) => tag.trim()).filter(Boolean);
  if (tags.some((tag) => tag.startsWith("-"))) return "a tag starts with '-'";
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) return `a tag is longer than ${MAX_TAG_LENGTH} characters`;
  return "";
};

/** Values the backend would accept but import as one tag containing another separator. */
export const tagSeparatorConflictsAccepted = (values, selected) =>
  (values || []).filter((value) => !tagProblem(value, selected)).filter((value) =>
    TAG_SEPARATORS.some((separator) => separator !== selected && String(value || "").includes(separator))
  ).length;

/** How many values contain each separator character. */
export const countTagSeparators = (values) =>
  Object.fromEntries(
    TAG_SEPARATORS.map((separator) => [
      separator,
      (values || []).filter((value) => String(value || "").includes(separator)).length,
    ])
  );

/**
 * The separator to start with for a Tags column, from per-separator counts:
 * one kind in use -> that one; none -> Pipe (every value is a single tag either
 * way); several -> "" (unresolved: the administrator must choose).
 */
export const initialTagSeparator = (counts) => {
  const used = TAG_SEPARATORS.filter((separator) => Number(counts?.[separator]) > 0);
  if (used.length > 1) return "";
  return used[0] || "|";
};
