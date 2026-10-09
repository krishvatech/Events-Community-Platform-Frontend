// Pure helpers for the Marketing Hub CSV contact import wizard.

export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
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

/** Destination aliases chosen by more than one column. */
export const duplicateTargets = (mapping) => {
  const seen = new Set();
  const duplicates = new Set();
  Object.values(mapping || {}).forEach((alias) => {
    if (!alias) return;
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
