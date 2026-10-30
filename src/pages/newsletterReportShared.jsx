// Shared pieces of the Marketing Hub Reports pages (list, builder, viewer).
// Reports live in Mautic. ECP builds them from the columns, filters and graphs
// Mautic publishes for each data source, and saves them as the admin's own
// Mautic user, where Mautic's report form checks them again.

import React, { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { deleteNewsletterReport } from "../services/newsletterService";
import { getErrorMessage } from "./newsletterTemplateShared.jsx";

export { CARD_BORDER, NAVY, formatDateTime, getErrorMessage } from "./newsletterTemplateShared.jsx";

export const REPORTS_PATH = "/admin/newsletter/reports";
export const REPORT_NEW_PATH = `${REPORTS_PATH}/new`;
export const reportPath = (id) => `${REPORTS_PATH}/${encodeURIComponent(id)}`;
export const reportEditPath = (id) => `${reportPath(id)}/edit`;

/** Mautic report IDs are positive integers; anything else never reaches the API. */
export const isValidReportId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

export const NAME_MAX_LENGTH = 191;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const MAX_FILTERS = 50;
export const MAX_RECIPIENTS = 20;

export const AGGREGATE_FUNCTIONS = ["COUNT", "AVG", "SUM", "MIN", "MAX"];
export const SCHEDULE_UNITS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];
export const SCHEDULE_DAYS = [
  { value: "MO", label: "Monday" },
  { value: "TU", label: "Tuesday" },
  { value: "WE", label: "Wednesday" },
  { value: "TH", label: "Thursday" },
  { value: "FR", label: "Friday" },
  { value: "SA", label: "Saturday" },
  { value: "SU", label: "Sunday" },
  { value: "WEEK_DAYS", label: "Weekday (Mon–Fri)" },
];
export const MONTH_FREQUENCIES = [
  { value: "1", label: "First" },
  { value: "-1", label: "Last" },
];
// Conditions with no value, and the ones that take a list of values.
export const NO_VALUE_CONDITIONS = ["empty", "notEmpty"];
export const LIST_CONDITIONS = ["in", "notIn"];

export function scheduleSummary(report) {
  if (!report?.isScheduled) return "Not scheduled";
  const unit = SCHEDULE_UNITS.find((option) => option.value === report.scheduleUnit)?.label || "Scheduled";
  const day = SCHEDULE_DAYS.find((option) => option.value === report.scheduleDay)?.label;
  if (report.scheduleUnit === "WEEKLY" && day) return `Weekly on ${day}`;
  if (report.scheduleUnit === "MONTHLY" && day) {
    const which = MONTH_FREQUENCIES.find((option) => option.value === String(report.scheduleMonthFrequency))?.label || "";
    return `Monthly, ${which.toLowerCase()} ${day}`.replace(/\s+/g, " ");
  }
  return unit;
}

export const blankReport = {
  name: "",
  description: "",
  source: "",
  isPublished: true,
  system: false,
  columns: [],
  filters: [],
  tableOrder: [],
  graphs: [],
  groupBy: [],
  aggregators: [],
  settings: { showGraphsAboveTable: false, showDynamicFilters: false, hideDateRangeFilter: false },
  isScheduled: false,
  toAddress: "",
  scheduleUnit: "DAILY",
  scheduleDay: "MO",
  scheduleMonthFrequency: "1",
};

const truthy = (value) => value === true || value === 1 || value === "1";

export const reportToDraft = (report) => ({
  ...blankReport,
  name: report?.name || "",
  description: report?.description || "",
  source: report?.source || "",
  isPublished: report?.isPublished !== false,
  system: Boolean(report?.system),
  columns: Array.isArray(report?.columns) ? report.columns.map(String) : [],
  filters: (Array.isArray(report?.filters) ? report.filters : []).map((filter) => ({
    column: String(filter?.column || ""),
    glue: filter?.glue === "or" ? "or" : "and",
    condition: String(filter?.condition || ""),
    value: Array.isArray(filter?.value) ? filter.value.map(String) : String(filter?.value ?? ""),
    dynamic: truthy(filter?.dynamic),
  })),
  tableOrder: (Array.isArray(report?.tableOrder) ? report.tableOrder : []).map((order) => ({
    column: String(order?.column || ""),
    direction: String(order?.direction || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC",
  })),
  graphs: Array.isArray(report?.graphs) ? report.graphs.map(String) : [],
  groupBy: Array.isArray(report?.groupBy) ? report.groupBy.map(String) : [],
  aggregators: (Array.isArray(report?.aggregators) ? report.aggregators : []).map((item) => ({
    function: String(item?.function || "COUNT").toUpperCase(),
    column: String(item?.column || ""),
  })),
  settings: {
    showGraphsAboveTable: truthy(report?.settings?.showGraphsAboveTable),
    showDynamicFilters: truthy(report?.settings?.showDynamicFilters),
    hideDateRangeFilter: truthy(report?.settings?.hideDateRangeFilter),
  },
  isScheduled: Boolean(report?.isScheduled),
  toAddress: report?.toAddress || "",
  scheduleUnit: report?.scheduleUnit || "DAILY",
  scheduleDay: report?.scheduleDay || "MO",
  scheduleMonthFrequency: report?.scheduleMonthFrequency ? String(report.scheduleMonthFrequency) : "1",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const splitRecipients = (value) =>
  [...new Set(String(value || "").split(/[,;\s]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];

/** The first problem with a draft, mirroring the backend checks, or "". */
export function validateReportDraft(draft) {
  if (!draft.name.trim()) return "Give the report a name.";
  if (draft.name.trim().length > NAME_MAX_LENGTH) return `The name can be at most ${NAME_MAX_LENGTH} characters.`;
  if (draft.description.length > DESCRIPTION_MAX_LENGTH) return `The description can be at most ${DESCRIPTION_MAX_LENGTH} characters.`;
  if (!draft.source) return "Choose a data source.";
  if (!draft.columns.length && !draft.graphs.length) return "Choose at least one column or graph.";
  for (const [index, filter] of draft.filters.entries()) {
    if (!filter.column || !filter.condition) return `Filter ${index + 1}: choose a field and a condition.`;
    if (LIST_CONDITIONS.includes(filter.condition) && !(Array.isArray(filter.value) && filter.value.length)) {
      return `Filter ${index + 1}: choose at least one value.`;
    }
  }
  if (draft.aggregators.some((item) => !item.column)) return "Choose a column for each calculation.";
  if (draft.aggregators.length && !draft.groupBy.length) return "Calculations need at least one group-by column.";
  // Mirrors the backend: a grouped query cannot also show ungrouped columns.
  if (draft.groupBy.length && draft.columns.some((column) => !draft.groupBy.includes(column))) {
    return "With a group-by, every column must be grouped. Add the other columns to Group by, or remove them from Columns.";
  }
  if (draft.tableOrder.some((item) => !item.column)) return "Choose a column for each sort.";
  if (draft.groupBy.length && draft.tableOrder.some((item) => !draft.groupBy.includes(item.column))) {
    return "With a group-by, sort only by grouped columns.";
  }
  if (draft.isScheduled) {
    const recipients = splitRecipients(draft.toAddress);
    if (!recipients.length) return "Add at least one email address to send the report to.";
    if (recipients.length > MAX_RECIPIENTS) return `Send to at most ${MAX_RECIPIENTS} addresses.`;
    const invalid = recipients.find((email) => !emailPattern.test(email));
    if (invalid) return `${invalid} is not a valid email address.`;
  }
  return "";
}

/** The save payload: the whole definition, exactly what the backend validates. */
export function draftToPayload(draft, { includeSource = true } = {}) {
  const payload = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    isPublished: draft.isPublished,
    system: draft.system,
    columns: draft.columns,
    filters: draft.filters.map((filter) => ({
      column: filter.column,
      glue: filter.glue,
      condition: filter.condition,
      value: NO_VALUE_CONDITIONS.includes(filter.condition) ? "" : filter.value,
      dynamic: LIST_CONDITIONS.includes(filter.condition) || NO_VALUE_CONDITIONS.includes(filter.condition) ? false : filter.dynamic,
    })),
    tableOrder: draft.tableOrder,
    graphs: draft.graphs,
    groupBy: draft.groupBy,
    aggregators: draft.groupBy.length ? draft.aggregators : [],
    settings: draft.settings,
    isScheduled: draft.isScheduled,
    toAddress: draft.isScheduled ? splitRecipients(draft.toAddress).join(",") : "",
    scheduleUnit: draft.scheduleUnit,
    scheduleDay: draft.scheduleUnit === "DAILY" ? null : draft.scheduleDay,
    scheduleMonthFrequency: draft.scheduleUnit === "MONTHLY" ? draft.scheduleMonthFrequency : null,
  };
  if (includeSource) payload.source = draft.source;
  return payload;
}

// Dates ---------------------------------------------------------------------------

const pad = (value) => String(value).padStart(2, "0");
export const isoDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export function defaultRange(now = new Date()) {
  const to = new Date(now.getTime());
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { dateFrom: isoDate(from), dateTo: isoDate(to) };
}

export const RANGE_PRESETS = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 12 months", days: 365 },
];

export function presetRange(days, now = new Date()) {
  return { dateFrom: isoDate(new Date(now.getTime() - days * 24 * 60 * 60 * 1000)), dateTo: isoDate(now) };
}

// Delete --------------------------------------------------------------------------

export function ReportDeleteDialog({ report, open, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = report?.name || `Report #${report?.id}`;

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteNewsletterReport(report.id);
      onDeleted?.(report, `"${name}" was deleted.`);
    } catch (err) {
      setError(getErrorMessage(err, "The report could not be deleted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Delete report?</DialogTitle>
      <DialogContent>
        <Typography>{`Delete "${name}" from Mautic?`}</Typography>
        {report?.isScheduled && (
          <Typography color="text.secondary" sx={{ mt: 1 }}>Its scheduled emails stop as well.</Typography>
        )}
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
