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
  duplicateNewsletterFocusItem,
  getNewsletterFocusInsights,
  getNewsletterFocusItem,
  previewNewsletterFocusItem,
  updateNewsletterFocusItem,
} from "../services/newsletterService";
import {
  CARD_BORDER,
  CopyField,
  FOCUS_PATH,
  FREQUENCY_OPTIONS,
  FocusDeleteDialog,
  FocusPreviewFrame,
  FocusStatusChip,
  FocusUsageList,
  NAVY,
  PLACEMENT_OPTIONS,
  WHEN_OPTIONS,
  focusEditPath,
  focusPath,
  focusToDraft,
  formatDateTime,
  getErrorMessage,
  isValidFocusId,
  previewPayload,
  styleLabel,
  typeLabel,
} from "./newsletterFocusShared.jsx";

function Section({ title, help, children, action }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
        {action}
      </Stack>
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

const label = (options, value) => options.find(([key]) => key === value)?.[1] || value || "—";

function Detail({ name, children }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "160px minmax(0, 1fr)" }, gap: { xs: 0, sm: 2 }, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{name}</Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{children || "—"}</Typography>
    </Box>
  );
}

/** Last N days as small bars (views), with clicks and submissions in the label. */
function DailyBars({ daily }) {
  const max = Math.max(1, ...daily.map((day) => day.views + day.clicks + day.submissions));
  return (
    <Box role="img" aria-label="Activity per day" sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 80 }}>
      {daily.map((day) => {
        const total = day.views + day.clicks + day.submissions;
        return (
          <Tooltip key={day.date} title={`${day.date}: ${day.views} views, ${day.clicks} clicks, ${day.submissions} submissions`}>
            <Box sx={{ flex: 1, minWidth: 0, height: `${Math.max(2, (total / max) * 100)}%`, bgcolor: total ? NAVY : "#DDE3EA", borderRadius: "2px 2px 0 0" }} />
          </Tooltip>
        );
      })}
    </Box>
  );
}

export default function AdminNewsletterFocusDetailsPage() {
  const { focusId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [focus, setFocus] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsError, setInsightsError] = useState("");
  const [preview, setPreview] = useState({ document: "", loading: false, error: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState("");
  const valid = isValidFocusId(focusId);

  const load = useCallback(async () => {
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const data = await getNewsletterFocusItem(focusId);
      setFocus(data);
      setPreview({ document: "", loading: true, error: "" });
      previewNewsletterFocusItem(previewPayload(focusToDraft(data)))
        .then((result) => setPreview({ document: result?.document || "", loading: false, error: "" }))
        .catch((err) => setPreview({ document: "", loading: false, error: getErrorMessage(err, "The preview could not be loaded.") }));
    } catch (err) {
      setError(getErrorMessage(err, "We could not load this Focus Item from Mautic."));
    } finally {
      setLoading(false);
    }
    try {
      setInsights(await getNewsletterFocusInsights(focusId, { days: 30 }));
      setInsightsError("");
    } catch (err) {
      setInsightsError(getErrorMessage(err, "Stats could not be loaded."));
    }
  }, [focusId, valid]);

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
    const saved = await updateNewsletterFocusItem(focus.id, { isPublished: !focus.isPublished });
    setFocus(saved);
    setSnack(saved.isPublished ? "Published." : "Unpublished: it is shown nowhere now.");
  });

  const duplicate = () => run("duplicate", async () => {
    const copy = await duplicateNewsletterFocusItem(focus.id);
    navigate(focusPath(copy.id), { state: { flash: `Copied as "${copy.name}" (unpublished).` } });
  });

  if (!valid) return <Alert severity="error">This Focus Item link is not valid.</Alert>;
  if (loading && !focus) return <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}><CircularProgress aria-label="Loading Focus Item" /></Box>;
  if (error && !focus) {
    return (
      <Stack spacing={2}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>
        <Button component={RouterLink} to={FOCUS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Back to Focus Items</Button>
      </Stack>
    );
  }

  const props = focus.properties || {};
  const placement = PLACEMENT_OPTIONS[focus.style]?.find(([key]) => key === props[focus.style]?.placement)?.[1];
  const totals = insights?.totals;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={FOCUS_PATH} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>Back to Focus Items</Button>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{focus.name}</Typography>
            <FocusStatusChip focus={focus} />
          </Stack>
          <Typography color="text.secondary">{`${styleLabel(focus.style)} · ${typeLabel(focus.type)}`}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<EditRoundedIcon />} component={RouterLink} to={focusEditPath(focus.id)} sx={{ textTransform: "none" }}>Edit</Button>
          <Button variant="outlined" startIcon={focus.isPublished ? <UnpublishedRoundedIcon /> : <PublishRoundedIcon />} onClick={togglePublished}
            disabled={Boolean(busy)} sx={{ textTransform: "none" }}>
            {busy === "publish" ? "Saving…" : focus.isPublished ? "Unpublish" : "Publish"}
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

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
        <Stat label="Views" value={totals?.views} note={totals ? `${Number(totals.uniqueViews || 0).toLocaleString()} unique visitors` : insightsError || " "} />
        <Stat label="Clicks" value={totals?.clicks} note="Button link clicks" />
        <Stat label="Submissions" value={totals?.submissions} note="Form submissions from it" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Section title="Add it to a page">
            <Stack spacing={2}>
              {!focus.isLive && (
                <Alert severity="info">
                  {focus.isPublished ? "It is outside its publish window, so pages show nothing yet." : "Publish it first: unpublished Focus Items are shown nowhere."}
                </Alert>
              )}
              <CopyField label="Landing page token" value={focus.embed?.token || ""}
                helperText='Or use "Insert Focus Item" in the landing page editor. Mautic replaces the token on the live page.' />
              {focus.embed?.script ? (
                <CopyField label="Website embed code" value={focus.embed.script} multiline
                  helperText="Paste before </body> on any website, such as WordPress. Views and clicks are tracked by Mautic." />
              ) : (
                <Alert severity="warning">Mautic's public address is not available, so the website embed code cannot be shown.</Alert>
              )}
            </Stack>
          </Section>
          <Section title="Activity (last 30 days)">
            {insights ? <DailyBars daily={insights.daily || []} /> : <Typography color="text.secondary">{insightsError || "Loading…"}</Typography>}
          </Section>
          <Section title="Used in" help="Campaign steps and landing pages that show it. It cannot be deleted while it is used.">
            {insights ? <FocusUsageList usage={insights.usage} /> : <Typography color="text.secondary">{insightsError || "Loading…"}</Typography>}
          </Section>
          <Section title="Settings">
            <Detail name="Does">{typeLabel(focus.type)}{focus.type === "form" && focus.form ? `: ${focus.form.name || `Form #${focus.form.id}`}` : ""}</Detail>
            <Detail name="Style">{`${styleLabel(focus.style)}${placement ? ` · ${placement}` : ""}`}</Detail>
            <Detail name="Shows">{label(WHEN_OPTIONS, props.when)}{props.timeout ? `, after ${props.timeout} s` : ""}</Detail>
            <Detail name="How often">{label(FREQUENCY_OPTIONS, props.frequency)}</Detail>
            {focus.type === "link" && <Detail name="Button">{props.content?.link_text ? `${props.content.link_text} → ${props.content.link_url}` : ""}</Detail>}
            <Detail name="Category">{focus.category?.title}</Detail>
            <Detail name="Publish window">
              {focus.publishUp || focus.publishDown ? `${focus.publishUp ? formatDateTime(focus.publishUp) : "Now"} → ${focus.publishDown ? formatDateTime(focus.publishDown) : "No end"}` : "Always"}
            </Detail>
            <Detail name="Website">{focus.website}</Detail>
            <Detail name="Created">{`${formatDateTime(focus.dateAdded)}${focus.createdByUser ? ` by ${focus.createdByUser}` : ""}`}</Detail>
            <Detail name="Last updated">{focus.dateModified ? `${formatDateTime(focus.dateModified)}${focus.modifiedByUser ? ` by ${focus.modifiedByUser}` : ""}` : ""}</Detail>
          </Section>
        </Stack>
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 }, minWidth: 0 }}>
          <Section title="Preview">
            <FocusPreviewFrame document={preview.document} loading={preview.loading} error={preview.error} />
          </Section>
        </Box>
      </Box>

      <FocusDeleteDialog focus={focus} open={deleting} onClose={() => setDeleting(false)}
        onDeleted={(_, message) => { setDeleting(false); navigate(FOCUS_PATH, { state: { flash: message } }); }} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
