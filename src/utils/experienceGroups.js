// Groups profile experiences by organization (LinkedIn-style) so several
// positions held at the same company render under one company header.

const EMPLOYMENT_TYPE_LABELS = {
  full_time: "Full-time",
  part_time: "Part-time",
  self_employed: "Self-employment",
  freelance: "Freelance",
};

export const orgNameOf = (x) => String(x?.community_name || x?.org || "").trim();

// Case/whitespace-insensitive key so "IMAA " and "imaa" group together.
export const orgKeyOf = (x) => orgNameOf(x).replace(/\s+/g, " ").toLowerCase();

const isCurrent = (x) => !!(x?.currently_work_here ?? x?.current);
const startOf = (x) => x?.start_date || x?.start || "";
const endOf = (x) => x?.end_date || x?.end || "";

// "2004-08-15" -> absolute month index (year * 12 + month0); null when unparseable.
const toMonthIndex = (d) => {
  if (!d) return null;
  const [y, m] = String(d).split("-");
  const year = parseInt(y, 10);
  const month = m ? parseInt(m, 10) : 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 12 + (Math.max(1, Math.min(12, month)) - 1);
};

const todayMonthIndex = (today) => today.getFullYear() * 12 + today.getMonth();

// Inclusive [start, end] month range for one position, or null when it has no start.
const monthRangeOf = (x, today) => {
  const start = toMonthIndex(startOf(x));
  if (start == null) return null;
  const end = isCurrent(x) ? todayMonthIndex(today) : toMonthIndex(endOf(x));
  if (end == null || end < start) return null;
  return [start, end];
};

// Months are counted inclusively, matching LinkedIn: Aug 2004 - Sep 2026 = 22 yrs 2 mos.
export const formatMonths = (months) => {
  if (!Number.isFinite(months) || months <= 0) return "";
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  const parts = [];
  if (yrs) parts.push(`${yrs} ${yrs === 1 ? "yr" : "yrs"}`);
  if (mos) parts.push(`${mos} ${mos === 1 ? "mo" : "mos"}`);
  return parts.join(" ");
};

export const positionDuration = (x, today = new Date()) => {
  const range = monthRangeOf(x, today);
  return range ? formatMonths(range[1] - range[0] + 1) : "";
};

// Total time at the organization: union of the position ranges, so overlapping
// concurrent roles are not double-counted and gaps between roles are excluded.
export const tenureDuration = (positions, today = new Date()) => {
  const ranges = positions
    .map((x) => monthRangeOf(x, today))
    .filter(Boolean)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur = null;
  for (const [s, e] of ranges) {
    if (cur && s <= cur[1] + 1) {
      cur[1] = Math.max(cur[1], e);
    } else {
      if (cur) total += cur[1] - cur[0] + 1;
      cur = [s, e];
    }
  }
  if (cur) total += cur[1] - cur[0] + 1;
  return formatMonths(total);
};

export const employmentTypeLabel = (value) =>
  EMPLOYMENT_TYPE_LABELS[value] || "";

// Order inside a company, matching LinkedIn: current roles first, oldest start
// first (the longest-held role leads, e.g. Founder & CEO 2004 before Director
// 2018/2020); then past roles, most recently ended first. Ties keep API order.
const MAX_MONTH = Number.MAX_SAFE_INTEGER;
const compareWithinGroup = (a, b) => {
  const ca = isCurrent(a);
  const cb = isCurrent(b);
  if (ca !== cb) return ca ? -1 : 1;
  if (ca) return (toMonthIndex(startOf(a)) ?? MAX_MONTH) - (toMonthIndex(startOf(b)) ?? MAX_MONTH);
  const byEnd = (toMonthIndex(endOf(b)) ?? -1) - (toMonthIndex(endOf(a)) ?? -1);
  if (byEnd) return byEnd;
  return (toMonthIndex(startOf(b)) ?? -1) - (toMonthIndex(startOf(a)) ?? -1);
};

// Each group sits where its first position appears in the incoming (API-sorted)
// list; positions inside a group use compareWithinGroup. Entries without an org
// are never merged.
export function groupExperiences(list) {
  const groups = [];
  const byKey = new Map();
  (Array.isArray(list) ? list : []).forEach((x, i) => {
    const key = orgKeyOf(x);
    if (key && byKey.has(key)) {
      byKey.get(key).positions.push(x);
      return;
    }
    const group = { key: key || `__solo_${x?.id ?? i}`, orgName: orgNameOf(x), positions: [x] };
    if (key) byKey.set(key, group);
    groups.push(group);
  });
  return groups.map((g) => {
    const types = new Set(g.positions.map((p) => p?.employment_type).filter(Boolean));
    return {
      ...g,
      positions: [...g.positions].sort(compareWithinGroup),
      employmentType: types.size === 1 ? employmentTypeLabel([...types][0]) : "",
    };
  });
}
