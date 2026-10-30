// Marketing calendar: Broadcast sends, campaign steps waiting to run, publish
// dates of landing pages, forms and assets, and scheduled report emails, in
// one month or agenda view. Read-only; every item opens its own page. Shown in
// the viewer's own time zone (the API works in UTC).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate } from "react-router-dom";

import { getNewsletterCalendar } from "../services/newsletterService";
import { CARD_BORDER, NAVY, getErrorMessage } from "./newsletterTemplateShared.jsx";

// Fixed categorical order (validated reference palette); a text label always
// accompanies the colour.
export const GROUPS = [
  { id: "broadcast", label: "Broadcasts", color: "#2a78d6" },
  { id: "campaign", label: "Campaign steps", color: "#eb6834" },
  { id: "publish", label: "Publish dates", color: "#1baf7a" },
  { id: "report", label: "Report emails", color: "#6250d6" },
];

const KIND = {
  broadcast_scheduled: { group: "broadcast", label: "Broadcast scheduled" },
  broadcast_sending: { group: "broadcast", label: "Broadcast sending" },
  broadcast_sent: { group: "broadcast", label: "Broadcast sent" },
  broadcast_failed: { group: "broadcast", label: "Broadcast failed" },
  campaign_step: { group: "campaign", label: "Campaign step" },
  page_publish: { group: "publish", label: "Landing page publishes" },
  page_unpublish: { group: "publish", label: "Landing page unpublishes" },
  form_publish: { group: "publish", label: "Form publishes" },
  form_unpublish: { group: "publish", label: "Form unpublishes" },
  asset_publish: { group: "publish", label: "Asset publishes" },
  asset_unpublish: { group: "publish", label: "Asset unpublishes" },
  report_email: { group: "report", label: "Report email" },
};

export function itemLink(item) {
  const id = encodeURIComponent(item.resourceId ?? "");
  if (item.kind.startsWith("broadcast_")) return `/admin/newsletter/${id}`;
  if (item.kind === "campaign_step") return `/admin/newsletter/builder/${id}`;
  if (item.kind.startsWith("page_")) return `/admin/newsletter/pages/${id}`;
  if (item.kind.startsWith("form_")) return `/admin/newsletter/forms/${id}`;
  if (item.kind.startsWith("asset_")) return `/admin/newsletter/assets/${id}`;
  if (item.kind === "report_email") return `/admin/newsletter/reports/${id}`;
  return "";
}

export function itemDetail(item) {
  const kind = KIND[item.kind]?.label || item.kind;
  if (item.kind === "campaign_step") {
    const contacts = Number(item.count || 0);
    return `${kind} · ${item.subtitle} · ${contacts.toLocaleString()} contact${contacts === 1 ? "" : "s"}`;
  }
  if (item.kind === "report_email") return `${kind} · ${item.subtitle} to ${item.count} recipient${item.count === 1 ? "" : "s"}`;
  if (item.kind.startsWith("broadcast_") && item.lists?.length) return `${kind} · ${item.lists.join(", ")}`;
  return kind;
}

// Dates ----------------------------------------------------------------------------

const pad = (value) => String(value).padStart(2, "0");
/** Local calendar day key, e.g. "2026-11-03". */
export const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const utcKey = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** The 6-week grid (Monday first) that shows the month of `anchor`. */
export function monthGrid(anchor) {
  const first = startOfMonth(anchor);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

/** UTC dates to ask for so every local day in [first, last] is covered. */
export function fetchWindow(first, last) {
  const from = new Date(first.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(addDays(last, 1).getTime() + 24 * 60 * 60 * 1000);
  return { from: utcKey(from), to: utcKey(to) };
}

const timeLabel = (value) => new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const monthTitle = (date) => date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayTitle = (date) => date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_IN_CELL = 3;

function ItemButton({ item, onOpen, dense }) {
  const group = GROUPS.find((entry) => entry.id === KIND[item.kind]?.group);
  return (
    <Tooltip title={`${timeLabel(item.at)} · ${itemDetail(item)}`}>
      <ButtonBase
        onClick={() => onOpen(item)}
        aria-label={`${timeLabel(item.at)} ${item.title}, ${itemDetail(item)}`}
        sx={{
          width: "100%", justifyContent: "flex-start", textAlign: "left", borderRadius: 1, px: 0.75, py: dense ? 0.25 : 0.75, gap: 0.75,
          "&:hover": { bgcolor: "#F2F5F7" },
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: group?.color, flexShrink: 0 }} />
        <Typography variant={dense ? "caption" : "body2"} noWrap={dense} sx={{ minWidth: 0, color: "text.primary" }}>
          {dense ? `${timeLabel(item.at)} ${item.title}` : item.title}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
}

export default function AdminNewsletterCalendarPage() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  // Phones open on the agenda: a seven-column month is too narrow to read there.
  // MUI's "sm" breakpoint, written out so the page does not need a theme.
  const phone = useMediaQuery("(max-width:599.95px)", { noSsr: true });
  const [view, setView] = useState(phone ? "agenda" : "month");
  const [shown, setShown] = useState(() => GROUPS.map((group) => group.id));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDay, setOpenDay] = useState(null);

  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "local time", []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getNewsletterCalendar(fetchWindow(grid[0], grid[grid.length - 1])));
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, "The calendar could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [grid]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const item of data?.items || []) {
      if (!shown.includes(KIND[item.kind]?.group)) continue;
      const key = dayKey(new Date(item.at));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [data, shown]);

  const open = (item) => {
    const link = itemLink(item);
    if (link) navigate(link);
  };
  const todayKey = dayKey(new Date());
  const monthDays = grid.filter((day) => day.getMonth() === anchor.getMonth());
  const agendaDays = monthDays.filter((day) => byDay.has(dayKey(day)));

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Calendar</Typography>
          <Typography color="text.secondary">
            {`Broadcast sends, campaign steps waiting to run, publish dates and report emails. Times in ${timeZone}.`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, value) => value && setView(value)} aria-label="Calendar view">
            <ToggleButton value="month" sx={{ textTransform: "none" }}>Month</ToggleButton>
            <ToggleButton value="agenda" sx={{ textTransform: "none" }}>Agenda</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh"><span><IconButton aria-label="Refresh" onClick={load} disabled={loading}><RefreshRoundedIcon /></IconButton></span></Tooltip>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton aria-label="Previous month" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}><ChevronLeftRoundedIcon /></IconButton>
            <Typography component="h2" sx={{ fontWeight: 850, color: NAVY, minWidth: 150, textAlign: "center" }} aria-live="polite">{monthTitle(anchor)}</Typography>
            <IconButton aria-label="Next month" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}><ChevronRightRoundedIcon /></IconButton>
            <Button size="small" onClick={() => setAnchor(startOfMonth(new Date()))} sx={{ textTransform: "none" }}>Today</Button>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap role="group" aria-label="Show">
            {GROUPS.map((group) => {
              const on = shown.includes(group.id);
              return (
                <Chip
                  key={group.id}
                  label={group.label}
                  variant={on ? "filled" : "outlined"}
                  aria-pressed={on}
                  onClick={() => setShown((current) => (on ? current.filter((id) => id !== group.id) : [...current, group.id]))}
                  icon={<Box component="span" sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: group.color, ml: "8px !important" }} />}
                  sx={{ bgcolor: on ? "#EEF2F5" : undefined }}
                />
              );
            })}
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>}
      {data?.warning && <Alert severity="warning">{data.warning}</Alert>}
      {data?.truncated && <Alert severity="info">There are more items than the calendar can show for this month; some campaign steps or publish dates are left out.</Alert>}

      {view === "month" ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflowX: "auto" }}>
          <Box role="grid" aria-label={`Calendar for ${monthTitle(anchor)}`} sx={{ minWidth: 700 }}>
            <Box role="row" sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid", borderColor: CARD_BORDER }}>
              {WEEKDAYS.map((day) => (
                <Box key={day} role="columnheader" sx={{ p: 1, fontWeight: 800, color: NAVY, fontSize: 13 }}>{day}</Box>
              ))}
            </Box>
            {Array.from({ length: 6 }, (_, week) => (
              <Box key={week} role="row" sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {grid.slice(week * 7, week * 7 + 7).map((day) => {
                  const key = dayKey(day);
                  const items = byDay.get(key) || [];
                  const outside = day.getMonth() !== anchor.getMonth();
                  return (
                    <Box key={key} role="gridcell" aria-label={`${dayTitle(day)}, ${items.length} item${items.length === 1 ? "" : "s"}`}
                      sx={{ minHeight: 112, p: 0.75, borderRight: "1px solid", borderBottom: "1px solid", borderColor: CARD_BORDER, bgcolor: outside ? "#FAFBFC" : "background.paper", minWidth: 0 }}>
                      <Typography variant="caption" sx={{
                        fontWeight: key === todayKey ? 900 : 600, color: outside ? "text.disabled" : key === todayKey ? "primary.main" : "text.secondary",
                      }}>
                        {day.getDate()}
                      </Typography>
                      {loading ? <Skeleton height={18} /> : (
                        <Stack spacing={0.25}>
                          {items.slice(0, MAX_IN_CELL).map((item) => <ItemButton key={item.id} item={item} onOpen={open} dense />)}
                          {items.length > MAX_IN_CELL && (
                            <Button size="small" onClick={() => setOpenDay(day)} sx={{ textTransform: "none", justifyContent: "flex-start", py: 0, minHeight: 0 }}>
                              {`+${items.length - MAX_IN_CELL} more`}
                            </Button>
                          )}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, p: { xs: 1.5, md: 2 } }}>
          {loading ? <Skeleton height={120} /> : agendaDays.length === 0 ? (
            <Typography color="text.secondary">{`Nothing dated in ${monthTitle(anchor)} for the types shown.`}</Typography>
          ) : (
            <Stack spacing={2} component="ol" sx={{ listStyle: "none", p: 0, m: 0 }} aria-label={`Agenda for ${monthTitle(anchor)}`}>
              {agendaDays.map((day) => (
                <Box component="li" key={dayKey(day)}>
                  <Typography component="h3" sx={{ fontWeight: 800, color: dayKey(day) === todayKey ? "primary.main" : NAVY, mb: 0.5 }}>{dayTitle(day)}</Typography>
                  <Stack spacing={0.5}>
                    {byDay.get(dayKey(day)).map((item) => {
                      const group = GROUPS.find((entry) => entry.id === KIND[item.kind]?.group);
                      return (
                        <ButtonBase key={item.id} onClick={() => open(item)}
                          sx={{ justifyContent: "flex-start", textAlign: "left", borderRadius: 1.5, p: 1, gap: 1.5, border: "1px solid", borderColor: CARD_BORDER, "&:hover": { bgcolor: "#F7F9FA" } }}>
                          <Typography variant="body2" sx={{ width: 56, flexShrink: 0, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{timeLabel(item.at)}</Typography>
                          <Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 2, bgcolor: group?.color, flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{item.title}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{itemDetail(item)}</Typography>
                          </Box>
                        </ButtonBase>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      <Dialog open={Boolean(openDay)} onClose={() => setOpenDay(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{openDay ? dayTitle(openDay) : ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={0.5}>
            {(openDay ? byDay.get(dayKey(openDay)) || [] : []).map((item) => (
              <Box key={item.id}>
                <ItemButton item={item} onOpen={(entry) => { setOpenDay(null); open(entry); }} />
                <Typography variant="caption" color="text.secondary" sx={{ pl: 3, display: "block" }}>{`${timeLabel(item.at)} · ${itemDetail(item)}`}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenDay(null)} sx={{ textTransform: "none" }}>Close</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
