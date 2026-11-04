import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import UnpublishedRoundedIcon from "@mui/icons-material/UnpublishedRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  duplicateNewsletterDynamicContent,
  getNewsletterDynamicContent,
  getNewsletterDynamicContentInsights,
  updateNewsletterDynamicContent,
} from "../services/newsletterService";
import {
  CARD_BORDER,
  ContentPreviewFrame,
  CopyField,
  DYNAMIC_CONTENT_PATH,
  DynamicContentDeleteDialog,
  DynamicContentUsageList,
  NAVY,
  PublishStatusChip,
  dynamicContentEditPath,
  dynamicContentPath,
  formatDateTime,
  getErrorMessage,
  isValidDynamicContentId,
  modeLabel,
} from "./newsletterDynamicContentShared.jsx";

const OPERATOR_TEXT = {
  "=": "is", "!=": "is not", gt: "is more than", gte: "is at least", lt: "is less than", lte: "is at most",
  empty: "is empty", "!empty": "is not empty", like: "is like", "!like": "is not like", in: "is one of", "!in": "is none of",
  regexp: "matches", "!regexp": "does not match", startsWith: "starts with", endsWith: "ends with", contains: "contains",
};

const ruleText = (rule, index) => {
  const value = Array.isArray(rule.filter) ? rule.filter.join(", ") : rule.filter;
  const text = `${rule.field} ${OPERATOR_TEXT[rule.operator] || rule.operator}${value !== null && value !== undefined && value !== "" ? ` "${value}"` : ""}`;
  return index === 0 ? text : `${rule.glue === "or" ? "or" : "and"} ${text}`;
};

function Section({ title, help, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }}>
      <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
      {help && <Typography variant="body2" color="text.secondary">{help}</Typography>}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Paper>
  );
}

function Stat({ label, value, note }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 850, color: NAVY, fontSize: 28 }} aria-label={label}>{Number(value || 0).toLocaleString()}</Typography>
      {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
    </Paper>
  );
}

function Detail({ name, children }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "160px minmax(0, 1fr)" }, gap: { xs: 0, sm: 2 }, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{name}</Typography>
      <Typography component="div" variant="body2" sx={{ wordBreak: "break-word" }}>{children || "—"}</Typography>
    </Box>
  );
}

function DailyBars({ daily }) {
  const max = Math.max(1, ...daily.map((day) => day.shown));
  return (
    <Box role="img" aria-label="Times shown per day" sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 80 }}>
      {daily.map((day) => (
        <Tooltip key={day.date} title={`${day.date}: shown ${day.shown} times`}>
          <Box sx={{ flex: 1, minWidth: 0, height: `${Math.max(2, (day.shown / max) * 100)}%`, bgcolor: day.shown ? NAVY : "#DDE3EA", borderRadius: "2px 2px 0 0" }} />
        </Tooltip>
      ))}
    </Box>
  );
}

export default function AdminNewsletterDynamicContentDetailsPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsError, setInsightsError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState("");
  const valid = isValidDynamicContentId(itemId);

  const load = useCallback(async () => {
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      setItem(await getNewsletterDynamicContent(itemId));
    } catch (err) {
      setError(getErrorMessage(err, "We could not load this Dynamic Content item from Mautic."));
    } finally {
      setLoading(false);
    }
    try {
      setInsights(await getNewsletterDynamicContentInsights(itemId, { days: 30 }));
      setInsightsError("");
    } catch (err) {
      setInsightsError(getErrorMessage(err, "Stats could not be loaded."));
    }
  }, [itemId, valid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack(flash);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const run = async (kind, work) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setActionError("");
    try {
      await work();
    } catch (err) {
      setActionError(getErrorMessage(err, "That did not work. Try again."));
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  };

  const togglePublished = () => run("publish", async () => {
    const saved = await updateNewsletterDynamicContent(item.id, { isPublished: !item.isPublished });
    setItem(saved);
    setSnack(saved.isPublished ? "Published." : "Unpublished: pages no longer show it.");
  });

  const duplicate = () => run("duplicate", async () => {
    const copy = await duplicateNewsletterDynamicContent(item.id);
    navigate(dynamicContentPath(copy.id), { state: { flash: `Copied as "${copy.name}" (unpublished).` } });
  });

  if (!valid) return <Alert severity="error">This Dynamic Content link is not valid.</Alert>;
  if (loading && !item) return <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}><CircularProgress aria-label="Loading Dynamic Content" /></Box>;
  if (error && !item) {
    return (
      <Stack spacing={2}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>
        <Button component={RouterLink} to={DYNAMIC_CONTENT_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
          Back to Dynamic Content
        </Button>
      </Stack>
    );
  }

  const totals = insights?.totals;
  const place = item.place || {};
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={DYNAMIC_CONTENT_PATH} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>
            Back to Dynamic Content
          </Button>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{item.name}</Typography>
            <PublishStatusChip focus={item} />
          </Stack>
          <Typography color="text.secondary">{item.isCampaignBased ? modeLabel(item) : `${modeLabel(item)} · slot ${item.slotName}`}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<EditRoundedIcon />} component={RouterLink} to={dynamicContentEditPath(item.id)} sx={{ textTransform: "none" }}>Edit</Button>
          <Button variant="outlined" startIcon={item.isPublished ? <UnpublishedRoundedIcon /> : <PublishRoundedIcon />} onClick={togglePublished}
            disabled={Boolean(busy)} sx={{ textTransform: "none" }}>
            {busy === "publish" ? "Saving…" : item.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={duplicate} disabled={Boolean(busy)} sx={{ textTransform: "none" }}>
            {busy === "duplicate" ? "Copying…" : "Duplicate"}
          </Button>
          <Button variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setDeleting(true)} disabled={Boolean(busy)} sx={{ textTransform: "none" }}>
            Delete
          </Button>
        </Stack>
      </Stack>
      {actionError && <Alert severity="error" onClose={() => setActionError("")}>{actionError}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <Stat label="Times shown" value={totals?.shown} note={insightsError || "Each time a page showed it to a visitor"} />
        <Stat label="Contacts reached" value={totals?.contacts} note="Different visitors who saw it" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Section title="Put it on a page">
            <Stack spacing={2}>
              {!item.isLive && (
                <Alert severity="info">
                  {item.isPublished ? "It is outside its publish window, so pages show the default content." : "Publish it first: pages show the default content until then."}
                </Alert>
              )}
              {item.isCampaignBased ? (
                <Alert severity="info" icon={false}>
                  A campaign decides who sees this. Add it to an automation campaign as the default of a "Request dynamic content" decision or in a "Push dynamic content" step after it; the page needs that step's slot.
                </Alert>
              ) : (
                <>
                  <CopyField label="Slot for landing pages and websites" value={place.slot || ""} multiline
                    helperText='Or use "Insert Dynamic Content" in the landing page builder. Change the default text to what visitors who match no rule should see.' />
                  <CopyField label="Landing page token" value={place.token || ""}
                    helperText="A shorter alternative for landing pages: replaced by the content, or by nothing for visitors who match no rule." />
                </>
              )}
              {place.tracking ? (
                <CopyField label="Website tracking code" value={place.tracking} multiline
                  helperText="Websites (not Mautic landing pages) also need Mautic's tracking code once, before </body>, to fill slots." />
              ) : (
                <Alert severity="warning">Mautic's public address is not available, so the website tracking code cannot be shown.</Alert>
              )}
            </Stack>
          </Section>
          <Section title="Activity (last 30 days)">
            {insights ? <DailyBars daily={insights.daily || []} /> : <Typography color="text.secondary">{insightsError || "Loading…"}</Typography>}
          </Section>
          <Section title="Used in" help="Campaign steps that use it cannot lose it: it cannot be deleted while they do.">
            {insights ? <DynamicContentUsageList usage={insights.usage} /> : <Typography color="text.secondary">{insightsError || "Loading…"}</Typography>}
          </Section>
          <Section title="Settings">
            <Detail name="Shown">{modeLabel(item)}</Detail>
            {!item.isCampaignBased && <Detail name="Slot">{item.slotName}</Detail>}
            {!item.isCampaignBased && (
              <Detail name="Rules">{(item.filters || []).length ? (item.filters || []).map((rule, index) => <div key={index}>{ruleText(rule, index)}</div>) : ""}</Detail>
            )}
            <Detail name="Content type">{item.type === "text" ? "Plain text" : "HTML"}</Detail>
            <Detail name="Category">{item.category?.title}</Detail>
            <Detail name="Publish window">
              {item.publishUp || item.publishDown ? `${item.publishUp ? formatDateTime(item.publishUp) : "Now"} → ${item.publishDown ? formatDateTime(item.publishDown) : "No end"}` : "Always"}
            </Detail>
            <Detail name="Created">{`${formatDateTime(item.dateAdded)}${item.createdByUser ? ` by ${item.createdByUser}` : ""}`}</Detail>
            <Detail name="Last updated">{item.dateModified ? `${formatDateTime(item.dateModified)}${item.modifiedByUser ? ` by ${item.modifiedByUser}` : ""}` : ""}</Detail>
          </Section>
        </Stack>
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 }, minWidth: 0 }}>
          <Section title="Content">
            <ContentPreviewFrame content={item.content} type={item.type} />
          </Section>
        </Box>
      </Box>

      <DynamicContentDeleteDialog item={item} open={deleting} onClose={() => setDeleting(false)}
        onDeleted={(_, message) => { setDeleting(false); navigate(DYNAMIC_CONTENT_PATH, { state: { flash: message } }); }} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
